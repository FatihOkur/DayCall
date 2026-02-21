import { useEffect, useRef, useState, useCallback } from "react";
import { View, Text, Pressable, Animated, Platform } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";
import { Audio } from "expo-av";
import { useAudioPlayer, AudioModule } from "expo-audio";
import * as FileSystem from "expo-file-system/legacy";
import { useAppStore } from "../store/useAppStore";
import { API_BASE_URL } from "../services/api";

/**
 * Voice Session — Continuous auto-listening AI conversation.
 *
 * Records in Linear PCM (WAV) format so the backend can strip the 44-byte
 * RIFF header and forward raw PCM bytes to Gemini Live API (which only
 * accepts audio/pcm or audio/pcm;rate=xxxxx).
 *
 * Each chunk is a fresh Audio.Recording instance with a unique URI to
 * avoid the useAudioRecorder hook's URI-caching bug.
 */

const WS_BASE_URL = API_BASE_URL.replace(/^http/, "ws");
const CHUNK_MS = 2000; // 2 s segments — long enough for iOS to finalize WAV

/**
 * Wrap raw PCM bytes in a RIFF/WAVE container.
 * Gemini Live API sends PCM at 24kHz, mono, 16-bit little-endian.
 * expo-audio's useAudioPlayer can decode WAV but not raw PCM.
 */
function pcmToWav(pcm: ArrayBuffer, sampleRate = 24000): ArrayBuffer {
    const numChannels = 1;
    const bitsPerSample = 16;
    const byteRate = (sampleRate * numChannels * bitsPerSample) / 8;
    const blockAlign = (numChannels * bitsPerSample) / 8;
    const dataSize = pcm.byteLength;
    const wav = new ArrayBuffer(44 + dataSize);
    const v = new DataView(wav);
    // RIFF chunk
    v.setUint32(0, 0x52494646, false);  // "RIFF"
    v.setUint32(4, 36 + dataSize, true);
    v.setUint32(8, 0x57415645, false);  // "WAVE"
    // fmt sub-chunk
    v.setUint32(12, 0x666d7420, false); // "fmt "
    v.setUint32(16, 16, true);          // sub-chunk size
    v.setUint16(20, 1, true);           // PCM = 1
    v.setUint16(22, numChannels, true);
    v.setUint32(24, sampleRate, true);
    v.setUint32(28, byteRate, true);
    v.setUint16(32, blockAlign, true);
    v.setUint16(34, bitsPerSample, true);
    // data sub-chunk
    v.setUint32(36, 0x64617461, false); // "data"
    v.setUint32(40, dataSize, true);
    new Uint8Array(wav, 44).set(new Uint8Array(pcm));
    return wav;
}

/** Linear PCM preset — produces a standard RIFF/WAVE file the backend can parse. */
const PCM_OPTIONS: Audio.RecordingOptions = {
    isMeteringEnabled: false,
    ios: {
        extension: ".wav",
        outputFormat: "lpcm" as any, // IOSOutputFormat.LINEARPCM
        audioQuality: 127,           // IOSAudioQuality.MAX
        sampleRate: 16000,
        numberOfChannels: 1,
        bitRate: 256000,
        linearPCMBitDepth: 16,
        linearPCMIsBigEndian: false,
        linearPCMIsFloat: false,
    },
    android: {
        extension: ".wav",
        outputFormat: 2 as any,  // MPEG_4 fallback (Android PCM recording is unreliable)
        audioEncoder: 3 as any,  // AAC
        sampleRate: 16000,
        numberOfChannels: 1,
        bitRate: 128000,
    },
    web: { mimeType: "audio/webm", bitsPerSecond: 128000 },
};

type SessionState = "connecting" | "active" | "ended" | "error";

export default function VoiceScreen() {
    const token = useAppStore((s) => s.token);
    const setVoiceStatus = useAppStore((s) => s.setVoiceStatus);

    const [sessionState, setSessionState] = useState<SessionState>("connecting");
    const [duration, setDuration] = useState(0);
    const [errorMsg, setErrorMsg] = useState("");

    const wsRef = useRef<WebSocket | null>(null);
    const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
    const loopActiveRef = useRef(false);
    const currentRecordingRef = useRef<Audio.Recording | null>(null);
    // Buffer incoming PCM chunks; flush every STREAM_BATCH_BYTES or on turn_end
    const pcmChunksRef = useRef<ArrayBuffer[]>([]);
    const pcmBytesRef = useRef(0);
    // Playback queue: sequential Audio.Sound objects
    const playQueueRef = useRef<Promise<void>>(Promise.resolve());
    const isPlayingRef = useRef(false);

    // Pulsing animation
    const pulseAnim = useRef(new Animated.Value(1)).current;

    useEffect(() => {
        if (sessionState === "active") {
            const pulse = Animated.loop(
                Animated.sequence([
                    Animated.timing(pulseAnim, { toValue: 1.3, duration: 800, useNativeDriver: true }),
                    Animated.timing(pulseAnim, { toValue: 1, duration: 800, useNativeDriver: true }),
                ])
            );
            pulse.start();
            return () => pulse.stop();
        }
    }, [sessionState]);

    useEffect(() => {
        if (sessionState === "active") {
            timerRef.current = setInterval(() => setDuration((d) => d + 1), 1000);
        }
        return () => { if (timerRef.current) clearInterval(timerRef.current); };
    }, [sessionState]);

    const formatDuration = (secs: number) => {
        const m = Math.floor(secs / 60);
        const s = secs % 60;
        return `${m}:${s.toString().padStart(2, "0")}`;
    };

    // ─── Playback helpers ──────────────────────────────────────────────────────

    /** Concatenate buffered PCM chunks → WAV → play via Audio.Sound queue. */
    const flushAndPlay = async (chunks: ArrayBuffer[]) => {
        if (chunks.length === 0) return;
        const totalBytes = chunks.reduce((s, c) => s + c.byteLength, 0);
        if (totalBytes < 100) return;

        const merged = new Uint8Array(totalBytes);
        let off = 0;
        for (const c of chunks) { merged.set(new Uint8Array(c), off); off += c.byteLength; }

        const wavBuf = pcmToWav(merged.buffer, 24000);
        const wavU8 = new Uint8Array(wavBuf);
        let bin = "";
        wavU8.forEach((b) => (bin += String.fromCharCode(b)));
        const b64 = btoa(bin);
        const tmpPath = FileSystem.cacheDirectory + `ai_${Date.now()}.wav`;
        await FileSystem.writeAsStringAsync(tmpPath, b64, { encoding: "base64" });

        // Chain onto the playback queue so segments play sequentially
        playQueueRef.current = playQueueRef.current.then(async () => {
            // Switch to playback mode for full speaker volume on iOS
            if (!isPlayingRef.current) {
                isPlayingRef.current = true;
                try {
                    await Audio.setAudioModeAsync({
                        allowsRecordingIOS: false,
                        playsInSilentModeIOS: true,
                    });
                } catch { /* ignore */ }
            }
            let sound: Audio.Sound | null = null;
            try {
                const { sound: s } = await Audio.Sound.createAsync(
                    { uri: tmpPath },
                    { shouldPlay: true, volume: 1.0 }
                );
                sound = s;
                // Wait for playback to finish
                await new Promise<void>((resolve) => {
                    s.setOnPlaybackStatusUpdate((status) => {
                        if (status.isLoaded && status.didJustFinish) resolve();
                    });
                });
            } finally {
                await sound?.unloadAsync().catch(() => { });
                await FileSystem.deleteAsync(tmpPath, { idempotent: true }).catch(() => { });
            }
        });

        // After whole queue drains, switch back to recording mode
        playQueueRef.current.then(() => {
            isPlayingRef.current = false;
            Audio.setAudioModeAsync({ allowsRecordingIOS: true, playsInSilentModeIOS: true }).catch(() => { });
        });
    };

    /**
     * Core recording loop — runs sequentially, never overlaps.
     * Each iteration creates a fresh Recording instance with a unique URI.
     */
    const runRecordLoop = useCallback(async (ws: WebSocket) => {
        while (loopActiveRef.current) {
            let recording: Audio.Recording | null = null;
            try {
                // Create a NEW recording instance each iteration → new unique URI
                const result = await Audio.Recording.createAsync(PCM_OPTIONS);
                recording = result.recording;
                currentRecordingRef.current = recording;

                // Record for CHUNK_MS
                await new Promise<void>((res) => setTimeout(res, CHUNK_MS));

                if (!loopActiveRef.current) break;

                // Stop and get this recording's unique URI
                await recording.stopAndUnloadAsync();
                currentRecordingRef.current = null;
                const uri = recording.getURI();

                if (uri && ws.readyState === WebSocket.OPEN) {
                    // Read the file as base64 → ArrayBuffer → send
                    const base64 = await new Promise<string>((resolve, reject) => {
                        const xhr = new XMLHttpRequest();
                        xhr.responseType = "arraybuffer";
                        xhr.onload = () => {
                            const arr = new Uint8Array(xhr.response);
                            let binary = "";
                            arr.forEach((b) => (binary += String.fromCharCode(b)));
                            resolve(btoa(binary));
                        };
                        xhr.onerror = reject;
                        xhr.open("GET", uri);
                        xhr.send();
                    });

                    if (ws.readyState === WebSocket.OPEN) {
                        const binaryStr = atob(base64);
                        const buf = new ArrayBuffer(binaryStr.length);
                        const view = new Uint8Array(buf);
                        for (let i = 0; i < binaryStr.length; i++) view[i] = binaryStr.charCodeAt(i);
                        ws.send(buf);
                    }
                }
            } catch (e) {
                console.warn("Recording loop error (continuing):", e);
                // On iOS: try to clean up any stuck recording before next iteration
                try { await recording?.stopAndUnloadAsync(); } catch { /* ignore */ }
                currentRecordingRef.current = null;
                // Brief pause before retrying
                await new Promise<void>((res) => setTimeout(res, 500));
            }
        }
    }, []);

    const startSession = useCallback(async () => {
        try {
            setVoiceStatus("connecting");
            setSessionState("connecting");

            // Request mic permission
            const { status } = await Audio.requestPermissionsAsync();
            if (status !== "granted") throw new Error("Microphone permission denied");

            // Enable recording mode on iOS
            await Audio.setAudioModeAsync({
                allowsRecordingIOS: true,
                playsInSilentModeIOS: true,
            });

            // Connect WebSocket
            const wsUrl = `${WS_BASE_URL}/ws/audio?token=${token}`;
            const ws = new WebSocket(wsUrl);
            wsRef.current = ws;
            ws.binaryType = "arraybuffer";

            ws.onopen = () => {
                console.log("WebSocket connected — starting record loop");
                setSessionState("active");
                setVoiceStatus("active");
                loopActiveRef.current = true;
                runRecordLoop(ws); // fire-and-forget sequential loop
            };

            ws.onmessage = async (event) => {
                // ── Control message ────────────────────────────────────────
                if (typeof event.data === "string") {
                    try {
                        const msg = JSON.parse(event.data);
                        if (msg.type === "turn_end") {
                            // Flush remaining buffered PCM and play
                            const chunks = pcmChunksRef.current;
                            pcmChunksRef.current = [];
                            pcmBytesRef.current = 0;
                            flushAndPlay(chunks);
                        }
                    } catch { /* ignore */ }
                    return;
                }
                // ── Audio data — buffer, flush every ~1.5s for streaming ────
                if (event.data instanceof ArrayBuffer && event.data.byteLength > 0) {
                    pcmChunksRef.current.push(event.data);
                    pcmBytesRef.current += event.data.byteLength;
                    // 24kHz * 2 bytes * 1.5s = 72000 bytes per batch
                    if (pcmBytesRef.current >= 72000) {
                        const batch = pcmChunksRef.current;
                        pcmChunksRef.current = [];
                        pcmBytesRef.current = 0;
                        flushAndPlay(batch);
                    }
                }
            };

            ws.onerror = () => {
                setErrorMsg("Connection error — is the backend running?");
                setSessionState("error");
                setVoiceStatus("idle");
            };

            ws.onclose = (e) => {
                console.log("WebSocket closed:", e.code, e.reason);
                loopActiveRef.current = false;
                setSessionState("ended");
                setVoiceStatus("idle");
            };
        } catch (e: any) {
            console.error("Start error:", e);
            setErrorMsg(e.message || "Failed to start — check mic permissions");
            setSessionState("error");
            setVoiceStatus("idle");
        }
    }, [token, runRecordLoop, flushAndPlay]);

    const endSession = useCallback(async () => {
        loopActiveRef.current = false;
        setSessionState("ended");
        setVoiceStatus("idle");
        if (timerRef.current) clearInterval(timerRef.current);
        try { await currentRecordingRef.current?.stopAndUnloadAsync(); } catch { /* ignore */ }
        await Audio.setAudioModeAsync({ allowsRecordingIOS: false }).catch(() => { });
        if (wsRef.current) { wsRef.current.close(); wsRef.current = null; }
        setTimeout(() => router.back(), 400);
    }, []);

    useEffect(() => {
        startSession();
        return () => {
            loopActiveRef.current = false;
            if (timerRef.current) clearInterval(timerRef.current);
            currentRecordingRef.current?.stopAndUnloadAsync().catch(() => { });
            wsRef.current?.close();
        };
    }, []);

    return (
        <SafeAreaView style={{ flex: 1, backgroundColor: "#1A1714" }}>
            <View style={{ flex: 1, justifyContent: "center", alignItems: "center", paddingHorizontal: 32 }}>
                <Text style={{ fontSize: 14, color: "#A69B8D", textTransform: "uppercase", letterSpacing: 2, marginBottom: 24 }}>
                    {sessionState === "connecting" ? "Connecting..."
                        : sessionState === "active" ? "Listening"
                            : sessionState === "error" ? "Error"
                                : "Session Ended"}
                </Text>

                <Animated.View style={{
                    width: 140, height: 140, borderRadius: 70,
                    backgroundColor: sessionState === "active" ? "#DA7756"
                        : sessionState === "error" ? "#DC2626" : "#A69B8D",
                    justifyContent: "center", alignItems: "center",
                    transform: [{ scale: sessionState === "active" ? pulseAnim : 1 }],
                    shadowColor: "#DA7756", shadowOffset: { width: 0, height: 0 },
                    shadowOpacity: sessionState === "active" ? 0.5 : 0,
                    shadowRadius: 20, elevation: 10,
                }}>
                    <Text style={{ fontSize: 56 }}>
                        {sessionState === "error" ? "⚠️" : "🎙️"}
                    </Text>
                </Animated.View>

                {sessionState === "active" && (
                    <Text style={{ fontSize: 32, fontFamily: "Georgia", color: "#F5F2EB", marginTop: 32, fontWeight: "300" }}>
                        {formatDuration(duration)}
                    </Text>
                )}

                {errorMsg ? (
                    <Text style={{ fontSize: 15, color: "#DC2626", textAlign: "center", marginTop: 24, paddingHorizontal: 20 }}>
                        {errorMsg}
                    </Text>
                ) : null}

                {sessionState === "active" && (
                    <Text style={{ fontSize: 15, color: "#A69B8D", textAlign: "center", marginTop: 16, lineHeight: 22 }}>
                        Speak naturally. The AI is listening.
                    </Text>
                )}
            </View>

            <View style={{ paddingHorizontal: 32, paddingBottom: Platform.OS === "ios" ? 16 : 32 }}>
                <Pressable
                    onPress={sessionState === "error" ? () => router.back() : endSession}
                    style={({ pressed }) => ({
                        backgroundColor: pressed ? "#3D3631" : "#2D2926",
                        borderRadius: 16, padding: 18, alignItems: "center",
                        borderWidth: 1, borderColor: "#4A4340",
                    })}
                >
                    <Text style={{ color: sessionState === "error" ? "#A69B8D" : "#DC2626", fontSize: 16, fontWeight: "600" }}>
                        {sessionState === "error" ? "Go Back" : "End Session"}
                    </Text>
                </Pressable>
            </View>
        </SafeAreaView>
    );
}
