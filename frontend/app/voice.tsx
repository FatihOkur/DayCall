import { useEffect, useRef, useState, useCallback } from "react";
import { View, Text, Pressable, Animated, Platform } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";
import { Audio } from "expo-av";
import LiveAudioStream from 'react-native-live-audio-stream';
import { useAppStore } from "../store/useAppStore";
import { API_BASE_URL } from "../services/api";

/**
 * Voice Session — Full-duplex real-time AI conversation.
 *
 * Audio architecture:
 *   Recording: LiveAudioStream (AVAudioEngine/AudioRecord) → 16kHz PCM → WebSocket → Gemini
 *   Playback:  Gemini PCM → WebSocket → in-memory WAV → expo-av Audio.Sound
 *
 * The mic runs CONTINUOUSLY for the entire session (full-duplex). We never call
 * LiveAudioStream.stop() during a session because on iOS, stop() calls
 * AudioQueueDispose(), which tears down the native queue — calling start() again
 * without init() then silently fails, which is why Gemini stopped receiving audio
 * and never produced a second response.
 *
 * Full-duplex also enables true barge-in: mic audio always flows to Gemini's
 * server-side VAD, which fires "interrupted" when it detects user speech during
 * an AI response. The client then stops playback and lets the user keep talking.
 *
 * iOS audio routing note:
 *   allowsRecordingIOS: true → AVAudioSession.Category.playAndRecord (set once,
 *   never changed). This routes output to the earpiece by default, which is ideal
 *   for a voice-call app — earpiece output is inaudible to the mic, so there is
 *   no acoustic echo without a separate echo-cancellation module.
 *   On Android, audioSource: 6 (VOICE_RECOGNITION) provides hardware AEC, NS,
 *   and AGC, allowing speaker output during full-duplex recording.
 */

const WS_BASE_URL = API_BASE_URL.replace(/^http/, "ws");

/**
 * Wrap raw PCM in a RIFF/WAV container and return a base64-encoded data URI.
 * Gemini Live outputs 24kHz mono 16-bit PCM; expo-av needs a WAV header to decode it.
 */
function pcmToDataUri(pcm: ArrayBuffer, sampleRate = 24000): string {
    const numChannels = 1;
    const bitsPerSample = 16;
    const byteRate = (sampleRate * numChannels * bitsPerSample) / 8;
    const blockAlign = (numChannels * bitsPerSample) / 8;
    const dataSize = pcm.byteLength;
    const wav = new ArrayBuffer(44 + dataSize);
    const v = new DataView(wav);
    v.setUint32(0, 0x52494646, false);  // "RIFF"
    v.setUint32(4, 36 + dataSize, true);
    v.setUint32(8, 0x57415645, false);  // "WAVE"
    v.setUint32(12, 0x666d7420, false); // "fmt "
    v.setUint32(16, 16, true);
    v.setUint16(20, 1, true);           // PCM
    v.setUint16(22, numChannels, true);
    v.setUint32(24, sampleRate, true);
    v.setUint32(28, byteRate, true);
    v.setUint16(32, blockAlign, true);
    v.setUint16(34, bitsPerSample, true);
    v.setUint32(36, 0x64617461, false); // "data"
    v.setUint32(40, dataSize, true);
    new Uint8Array(wav, 44).set(new Uint8Array(pcm));

    // Chunked base64 to avoid call-stack overflow on large buffers
    const u8 = new Uint8Array(wav);
    const CHUNK = 8192;
    let bin = "";
    for (let i = 0; i < u8.length; i += CHUNK) {
        bin += String.fromCharCode(...(u8.subarray(i, i + CHUNK) as unknown as number[]));
    }
    return `data:audio/wav;base64,${btoa(bin)}`;
}

const PCM_OPTIONS = {
    sampleRate: 16000,
    channels: 1,
    bitsPerSample: 16,
    audioSource: 6, // VOICE_RECOGNITION — enables HW echo cancellation on Android
    bufferSize: 4096, // ~128ms per chunk at 16kHz/16-bit
    wavFile: "",
};

type SessionState = "connecting" | "active" | "ended" | "error";

export default function VoiceScreen() {
    const token = useAppStore((s) => s.token);
    const setVoiceStatus = useAppStore((s) => s.setVoiceStatus);

    const [sessionState, setSessionState] = useState<SessionState>("connecting");
    const [isAiSpeaking, setIsAiSpeaking] = useState(false);
    const [duration, setDuration] = useState(0);
    const [errorMsg, setErrorMsg] = useState("");

    const wsRef = useRef<WebSocket | null>(null);
    const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

    // Accumulate PCM chunks from Gemini between early-play triggers and turn_end
    const pcmChunksRef = useRef<ArrayBuffer[]>([]);

    // Serial playback queue — segments appended via promise chaining
    const playQueueRef = useRef<Promise<void>>(Promise.resolve());
    // Number of segments currently in flight (queued or playing)
    const playQueueCountRef = useRef(0);
    // True while any AI audio segment is playing or queued
    const isPlayingRef = useRef(false);
    // Monotonic counter; increment to silently invalidate all queued plays
    const playSessionRef = useRef(0);
    // Sound object currently playing (null when idle)
    const currentSoundRef = useRef<Audio.Sound | null>(null);
    // Resolve fn for the wait-promise inside the active segment; call to abort early
    const resolveCurrentSoundRef = useRef<(() => void) | null>(null);
    // Subscription returned by LiveAudioStream.on — stored for cleanup
    const audioSubRef = useRef<{ remove: () => void } | null>(null);

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

    /**
     * Merge buffered PCM chunks into a single WAV and enqueue for sequential playback.
     *
     * The mic is NOT stopped here — it continues streaming to Gemini throughout,
     * which is what makes barge-in possible.
     *
     * Called in two scenarios:
     *   1. Early play: when ≥16 000 bytes (~333ms at 24kHz/16-bit) have arrived,
     *      so the user hears the AI start speaking with low latency.
     *   2. turn_end flush: any remaining bytes after the early cut are played as a
     *      second chained segment so nothing is dropped.
     */
    const flushAndPlay = useCallback((chunks: ArrayBuffer[]) => {
        if (chunks.length === 0) return;
        const totalBytes = chunks.reduce((s, c) => s + c.byteLength, 0);
        if (totalBytes < 100) return;

        const merged = new Uint8Array(totalBytes);
        let off = 0;
        for (const c of chunks) { merged.set(new Uint8Array(c), off); off += c.byteLength; }
        const uri = pcmToDataUri(merged.buffer, 24000);

        // Snapshot session ID so an interrupt can invalidate this segment later
        const mySession = playSessionRef.current;

        playQueueCountRef.current++;
        if (!isPlayingRef.current) {
            isPlayingRef.current = true;
            setIsAiSpeaking(true);
        }

        playQueueRef.current = playQueueRef.current
            .then(async () => {
                // Skip if an interrupt arrived while this segment was waiting
                if (playSessionRef.current !== mySession) return;

                let sound: Audio.Sound | null = null;
                try {
                    const { sound: s } = await Audio.Sound.createAsync(
                        { uri },
                        { shouldPlay: true, volume: 1.0 }
                    );
                    sound = s;
                    currentSoundRef.current = s;

                    // Wait for natural end OR early abort via resolveCurrentSoundRef
                    await new Promise<void>((resolve) => {
                        resolveCurrentSoundRef.current = resolve;
                        s.setOnPlaybackStatusUpdate((status) => {
                            if (status.isLoaded && status.didJustFinish) {
                                resolveCurrentSoundRef.current = null;
                                resolve();
                            }
                        });
                    });
                } finally {
                    currentSoundRef.current = null;
                    resolveCurrentSoundRef.current = null;
                    await sound?.unloadAsync().catch(() => { });
                }
            })
            .catch((e) => {
                console.warn("[DayCall] Playback error:", e);
            })
            .finally(() => {
                // If an interrupt fired, stopAllPlayback() already reset all state
                if (playSessionRef.current !== mySession) return;

                playQueueCountRef.current--;
                if (playQueueCountRef.current > 0) return; // more segments still queued

                // Last segment finished — mic never stopped, nothing to restart
                isPlayingRef.current = false;
                setIsAiSpeaking(false);
            });
    }, []);

    /**
     * Immediately stop all AI audio and clear the playback queue.
     * Called when Gemini sends "interrupted" (user spoke over AI) or on endSession.
     *
     * The microphone is never touched here — it is already running and will
     * continue delivering audio to Gemini so the user can keep talking.
     */
    const stopAllPlayback = useCallback(async () => {
        // Invalidate all queued and currently-playing segments
        playSessionRef.current++;
        playQueueRef.current = Promise.resolve();
        playQueueCountRef.current = 0;
        pcmChunksRef.current = [];

        // Abort the currently-playing segment's wait promise
        resolveCurrentSoundRef.current?.();
        resolveCurrentSoundRef.current = null;

        // Stop and unload the active sound
        const sound = currentSoundRef.current;
        currentSoundRef.current = null;
        if (sound) {
            await sound.stopAsync().catch(() => { });
            await sound.unloadAsync().catch(() => { });
        }

        isPlayingRef.current = false;
        setIsAiSpeaking(false);
        // Mic keeps running — no restart needed
    }, []);

    const startSession = useCallback(async () => {
        try {
            setVoiceStatus("connecting");
            setSessionState("connecting");

            const { status } = await Audio.requestPermissionsAsync();
            if (status !== "granted") throw new Error("Microphone permission denied");

            // Set audio mode once for the entire session and never change it.
            // On iOS this selects .playAndRecord → earpiece output (phone-call routing).
            // Earpiece output is inaudible to the mic, so no echo cancellation module
            // is needed on iOS. On Android, audioSource: 6 provides hardware AEC.
            await Audio.setAudioModeAsync({
                allowsRecordingIOS: true,
                playsInSilentModeIOS: true,
            });

            const wsUrl = `${WS_BASE_URL}/ws/audio?token=${token}`;
            const ws = new WebSocket(wsUrl);
            wsRef.current = ws;
            ws.binaryType = "arraybuffer";

            ws.onopen = () => {
                console.log("[DayCall] WebSocket connected — starting full-duplex audio");
                setSessionState("active");
                setVoiceStatus("active");

                LiveAudioStream.init(PCM_OPTIONS);

                // LiveAudioStream.on() removes all previous listeners before registering,
                // so only one handler is ever active. Store the subscription for cleanup.
                audioSubRef.current = LiveAudioStream.on('data', (data: string) => {
                    if (wsRef.current?.readyState !== WebSocket.OPEN) return;
                    try {
                        const binaryStr = atob(data);
                        const buf = new ArrayBuffer(binaryStr.length);
                        const view = new Uint8Array(buf);
                        for (let i = 0; i < binaryStr.length; i++) {
                            view[i] = binaryStr.charCodeAt(i);
                        }
                        wsRef.current.send(buf);
                    } catch (err) {
                        console.warn("[DayCall] Audio send error:", err);
                    }
                }) as unknown as { remove: () => void };

                LiveAudioStream.start();
            };

            ws.onmessage = (event) => {
                // Control message
                if (typeof event.data === "string") {
                    try {
                        const msg = JSON.parse(event.data);
                        if (msg.type === "turn_end") {
                            // Flush any remaining buffered audio from this turn
                            const chunks = pcmChunksRef.current;
                            pcmChunksRef.current = [];
                            flushAndPlay(chunks);
                        } else if (msg.type === "interrupted") {
                            // Gemini's VAD detected user speech mid-response.
                            // Stop AI audio immediately; mic is already running.
                            stopAllPlayback();
                        }
                    } catch { /* ignore malformed JSON */ }
                    return;
                }

                // Binary: PCM audio from Gemini
                if (event.data instanceof ArrayBuffer && event.data.byteLength > 0) {
                    pcmChunksRef.current.push(event.data);

                    // Early playback: start playing as soon as ~333ms of audio is ready
                    // (~16 000 bytes at 24kHz/16-bit/mono) rather than waiting for turn_end.
                    // Only trigger once per turn — isPlayingRef prevents re-triggering.
                    if (!isPlayingRef.current) {
                        const total = pcmChunksRef.current.reduce((s, c) => s + c.byteLength, 0);
                        if (total >= 16000) {
                            const earlyChunks = pcmChunksRef.current;
                            pcmChunksRef.current = [];
                            flushAndPlay(earlyChunks);
                        }
                    }
                }
            };

            ws.onerror = () => {
                setErrorMsg("Connection error — is the backend running?");
                setSessionState("error");
                setVoiceStatus("idle");
            };

            ws.onclose = () => {
                setSessionState((s) => s === "active" ? "ended" : s);
                setVoiceStatus("idle");
            };
        } catch (e: any) {
            console.error("[DayCall] Start error:", e);
            setErrorMsg(e.message || "Failed to start — check mic permissions");
            setSessionState("error");
            setVoiceStatus("idle");
        }
    }, [token, flushAndPlay, stopAllPlayback]);

    const endSession = useCallback(async () => {
        setSessionState("ended");
        setVoiceStatus("idle");
        if (timerRef.current) clearInterval(timerRef.current);

        await stopAllPlayback();

        // Stop the mic only when the session truly ends
        LiveAudioStream.stop();
        audioSubRef.current?.remove();
        audioSubRef.current = null;

        await Audio.setAudioModeAsync({ allowsRecordingIOS: false }).catch(() => { });

        if (wsRef.current) { wsRef.current.close(); wsRef.current = null; }
        setTimeout(() => router.back(), 400);
    }, [stopAllPlayback]);

    useEffect(() => {
        startSession();
        return () => {
            if (timerRef.current) clearInterval(timerRef.current);
            audioSubRef.current?.remove();
            audioSubRef.current = null;
            LiveAudioStream.stop();
            wsRef.current?.close();
        };
    }, []);

    const statusLabel = () => {
        if (sessionState === "connecting") return "Connecting...";
        if (sessionState === "error") return "Error";
        if (sessionState === "ended") return "Session Ended";
        return isAiSpeaking ? "AI Speaking" : "Listening";
    };

    return (
        <SafeAreaView style={{ flex: 1, backgroundColor: "#1A1714" }}>
            <View style={{ flex: 1, justifyContent: "center", alignItems: "center", paddingHorizontal: 32 }}>
                <Text style={{ fontSize: 14, color: "#A69B8D", textTransform: "uppercase", letterSpacing: 2, marginBottom: 24 }}>
                    {statusLabel()}
                </Text>

                <Animated.View style={{
                    width: 140, height: 140, borderRadius: 70,
                    backgroundColor: sessionState === "error" ? "#DC2626"
                        : isAiSpeaking ? "#7B9EA6"
                            : sessionState === "active" ? "#DA7756" : "#A69B8D",
                    justifyContent: "center", alignItems: "center",
                    transform: [{ scale: sessionState === "active" ? pulseAnim : 1 }],
                    shadowColor: isAiSpeaking ? "#7B9EA6" : "#DA7756",
                    shadowOffset: { width: 0, height: 0 },
                    shadowOpacity: sessionState === "active" ? 0.5 : 0,
                    shadowRadius: 20, elevation: 10,
                }}>
                    <Text style={{ fontSize: 56 }}>
                        {sessionState === "error" ? "⚠️" : isAiSpeaking ? "🔊" : "🎙️"}
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
                        {isAiSpeaking ? "The AI is responding..." : "Speak naturally. The AI is listening."}
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
