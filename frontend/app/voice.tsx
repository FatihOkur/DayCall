import { useEffect, useRef, useState, useCallback } from "react";
import {
    View,
    Text,
    Pressable,
    Animated,
    Platform,
    Modal,
    ScrollView,
    StyleSheet,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";
import { Audio } from "expo-av";
import LiveAudioStream from "react-native-live-audio-stream";
import { forceToSpeaker } from "../modules/audio-route";
import { useAppStore } from "../store/useAppStore";
import { API_BASE_URL } from "../services/api";

/**
 * Voice Session — Full-duplex real-time AI conversation.
 *
 * Audio architecture:
 *   Recording:  LiveAudioStream → 16kHz PCM → WebSocket → Backend → Gemini
 *   Playback:   Gemini PCM → Backend → WebSocket → WAV data URI → expo-av
 *   Transcript:  Gemini transcription → Backend JSON → chat bubbles
 *
 * Features:
 *   - Full-duplex: mic runs continuously, barge-in via server-side VAD
 *   - Mute: stops sending audio (mic stays on, connection stays open)
 *   - Transcript popup: real-time conversation bubbles
 *   - Speaker routing: forces iOS to main loudspeaker via native module
 */

const WS_BASE_URL = API_BASE_URL.replace(/^http/, "ws");

// ─── PCM → WAV helper ──────────────────────────────────────────────────────
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

    const u8 = new Uint8Array(wav);
    const CHUNK = 8192;
    let bin = "";
    for (let i = 0; i < u8.length; i += CHUNK) {
        bin += String.fromCharCode(
            ...(u8.subarray(i, i + CHUNK) as unknown as number[])
        );
    }
    return `data:audio/wav;base64,${btoa(bin)}`;
}

// ─── Constants ──────────────────────────────────────────────────────────────
const PCM_OPTIONS = {
    sampleRate: 16000,
    channels: 1,
    bitsPerSample: 16,
    audioSource: 6, // VOICE_RECOGNITION — HW AEC on Android
    bufferSize: 4096,
    wavFile: "",
};

const EARLY_PLAY_BYTES = 4800; // ~100ms at 24kHz/16-bit

type SessionState = "connecting" | "active" | "ended" | "error";

interface TranscriptMsg {
    role: "user" | "model";
    text: string;
    id: number;
}

// ─── Component ──────────────────────────────────────────────────────────────
export default function VoiceScreen() {
    const token = useAppStore((s) => s.token);
    const setVoiceStatus = useAppStore((s) => s.setVoiceStatus);

    const [sessionState, setSessionState] = useState<SessionState>("connecting");
    const [isAiSpeaking, setIsAiSpeaking] = useState(false);
    const [isMuted, setIsMuted] = useState(false);
    const [duration, setDuration] = useState(0);
    const [errorMsg, setErrorMsg] = useState("");
    const [showTranscript, setShowTranscript] = useState(false);
    const [transcript, setTranscript] = useState<TranscriptMsg[]>([]);

    const wsRef = useRef<WebSocket | null>(null);
    const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
    const isMutedRef = useRef(false);
    const transcriptIdRef = useRef(0);
    const scrollViewRef = useRef<ScrollView>(null);

    // Playback refs
    const pcmChunksRef = useRef<ArrayBuffer[]>([]);
    const playQueueRef = useRef<Promise<void>>(Promise.resolve());
    const playQueueCountRef = useRef(0);
    const isPlayingRef = useRef(false);
    const playSessionRef = useRef(0);
    const currentSoundRef = useRef<Audio.Sound | null>(null);
    const resolveCurrentSoundRef = useRef<(() => void) | null>(null);
    const audioSubRef = useRef<{ remove: () => void } | null>(null);

    const pulseAnim = useRef(new Animated.Value(1)).current;

    // ─── Pulse animation ────────────────────────────────────────────────
    useEffect(() => {
        if (sessionState === "active") {
            const pulse = Animated.loop(
                Animated.sequence([
                    Animated.timing(pulseAnim, {
                        toValue: 1.2,
                        duration: 1000,
                        useNativeDriver: true,
                    }),
                    Animated.timing(pulseAnim, {
                        toValue: 1,
                        duration: 1000,
                        useNativeDriver: true,
                    }),
                ])
            );
            pulse.start();
            return () => pulse.stop();
        }
    }, [sessionState]);

    // ─── Duration timer ─────────────────────────────────────────────────
    useEffect(() => {
        if (sessionState === "active") {
            timerRef.current = setInterval(
                () => setDuration((d) => d + 1),
                1000
            );
        }
        return () => {
            if (timerRef.current) clearInterval(timerRef.current);
        };
    }, [sessionState]);

    const formatDuration = (secs: number) => {
        const m = Math.floor(secs / 60);
        const s = secs % 60;
        return `${m}:${s.toString().padStart(2, "0")}`;
    };

    // ─── Transcript helper ──────────────────────────────────────────────
    const addTranscript = useCallback(
        (role: "user" | "model", text: string) => {
            setTranscript((prev) => {
                // Append to last message of same role, or create new
                const last = prev[prev.length - 1];
                if (last && last.role === role) {
                    return [
                        ...prev.slice(0, -1),
                        { ...last, text: last.text + text },
                    ];
                }
                return [
                    ...prev,
                    { role, text, id: transcriptIdRef.current++ },
                ];
            });
            // Auto-scroll
            setTimeout(
                () => scrollViewRef.current?.scrollToEnd({ animated: true }),
                100
            );
        },
        []
    );

    // ─── Flush and play ─────────────────────────────────────────────────
    const flushAndPlay = useCallback((chunks: ArrayBuffer[]) => {
        if (chunks.length === 0) return;
        const totalBytes = chunks.reduce((s, c) => s + c.byteLength, 0);
        if (totalBytes === 0) return;

        const merged = new Uint8Array(totalBytes);
        let off = 0;
        for (const c of chunks) {
            merged.set(new Uint8Array(c), off);
            off += c.byteLength;
        }
        const uri = pcmToDataUri(merged.buffer, 24000);
        const mySession = playSessionRef.current;

        playQueueCountRef.current++;
        if (!isPlayingRef.current) {
            isPlayingRef.current = true;
            setIsAiSpeaking(true);
        }

        playQueueRef.current = playQueueRef.current
            .then(async () => {
                if (playSessionRef.current !== mySession) return;

                let sound: Audio.Sound | null = null;
                try {
                    const { sound: s } = await Audio.Sound.createAsync(
                        { uri },
                        { shouldPlay: true, volume: 1.0 }
                    );
                    sound = s;
                    currentSoundRef.current = s;

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
                console.error("[DayCall] Playback error:", e?.message || e);
            })
            .finally(() => {
                if (playSessionRef.current !== mySession) return;
                playQueueCountRef.current--;
                if (playQueueCountRef.current > 0) return;
                isPlayingRef.current = false;
                setIsAiSpeaking(false);
            });
    }, []);

    // ─── Stop all playback (interrupt / end session) ────────────────────
    const stopAllPlayback = useCallback(async () => {
        playSessionRef.current++;
        playQueueRef.current = Promise.resolve();
        playQueueCountRef.current = 0;
        pcmChunksRef.current = [];

        resolveCurrentSoundRef.current?.();
        resolveCurrentSoundRef.current = null;

        const sound = currentSoundRef.current;
        currentSoundRef.current = null;
        if (sound) {
            await sound.stopAsync().catch(() => { });
            await sound.unloadAsync().catch(() => { });
        }

        isPlayingRef.current = false;
        setIsAiSpeaking(false);
    }, []);

    // ─── Start session ──────────────────────────────────────────────────
    const startSession = useCallback(async () => {
        try {
            setVoiceStatus("connecting");
            setSessionState("connecting");

            const { status } = await Audio.requestPermissionsAsync();
            if (status !== "granted")
                throw new Error("Microphone permission denied");

            await Audio.setAudioModeAsync({
                allowsRecordingIOS: true,
                playsInSilentModeIOS: true,
                playThroughEarpieceAndroid: false,
                shouldDuckAndroid: false,
            });

            const wsUrl = `${WS_BASE_URL}/ws/audio?token=${token}`;
            const ws = new WebSocket(wsUrl);
            wsRef.current = ws;
            ws.binaryType = "arraybuffer";

            ws.onopen = () => {
                console.log("[DayCall] WebSocket connected");
                setSessionState("active");
                setVoiceStatus("active");

                LiveAudioStream.init(PCM_OPTIONS);

                audioSubRef.current = LiveAudioStream.on(
                    "data",
                    (data: string) => {
                        if (wsRef.current?.readyState !== WebSocket.OPEN) return;
                        if (isMutedRef.current) return; // Muted — don't send
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
                    }
                ) as unknown as { remove: () => void };

                LiveAudioStream.start();

                // Force iOS audio to main loudspeaker
                if (Platform.OS === "ios") {
                    forceToSpeaker().catch((e: any) =>
                        console.warn("[DayCall] forceToSpeaker:", e)
                    );
                }
            };

            ws.onmessage = (event) => {
                // Control / transcript message
                if (typeof event.data === "string") {
                    try {
                        const msg = JSON.parse(event.data);
                        if (msg.type === "turn_start") {
                            pcmChunksRef.current = [];
                            stopAllPlayback();
                        } else if (msg.type === "turn_end") {
                            const chunks = pcmChunksRef.current;
                            pcmChunksRef.current = [];
                            flushAndPlay(chunks);
                        } else if (msg.type === "interrupted") {
                            stopAllPlayback();
                        } else if (msg.type === "transcript") {
                            addTranscript(msg.role, msg.text);
                        }
                    } catch {
                        /* ignore malformed JSON */
                    }
                    return;
                }

                // Binary: PCM audio from Gemini
                if (
                    event.data instanceof ArrayBuffer &&
                    event.data.byteLength > 0
                ) {
                    pcmChunksRef.current.push(event.data);

                    const accumulated = pcmChunksRef.current.reduce(
                        (s, c) => s + c.byteLength,
                        0
                    );
                    if (accumulated >= EARLY_PLAY_BYTES) {
                        const earlyChunks = pcmChunksRef.current;
                        pcmChunksRef.current = [];
                        flushAndPlay(earlyChunks);
                    }
                }
            };

            ws.onerror = () => {
                setErrorMsg("Connection error — is the backend running?");
                setSessionState("error");
                setVoiceStatus("idle");
            };

            ws.onclose = () => {
                setSessionState((s) => (s === "active" ? "ended" : s));
                setVoiceStatus("idle");
            };
        } catch (e: any) {
            console.error("[DayCall] Start error:", e);
            setErrorMsg(e.message || "Failed to start");
            setSessionState("error");
            setVoiceStatus("idle");
        }
    }, [token, flushAndPlay, stopAllPlayback, addTranscript]);

    // ─── End session ────────────────────────────────────────────────────
    const endSession = useCallback(async () => {
        setSessionState("ended");
        setVoiceStatus("idle");
        if (timerRef.current) clearInterval(timerRef.current);

        await stopAllPlayback();
        LiveAudioStream.stop();
        audioSubRef.current?.remove();
        audioSubRef.current = null;

        await Audio.setAudioModeAsync({ allowsRecordingIOS: false }).catch(
            () => { }
        );
        if (wsRef.current) {
            wsRef.current.close();
            wsRef.current = null;
        }
        setTimeout(() => router.back(), 400);
    }, [stopAllPlayback]);

    // ─── Toggle mute ────────────────────────────────────────────────────
    const toggleMute = useCallback(() => {
        setIsMuted((prev) => {
            const next = !prev;
            isMutedRef.current = next;
            return next;
        });
    }, []);

    // ─── Mount ──────────────────────────────────────────────────────────
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

    // ─── Helpers ────────────────────────────────────────────────────────
    const statusLabel = () => {
        if (sessionState === "connecting") return "Connecting...";
        if (sessionState === "error") return "Error";
        if (sessionState === "ended") return "Session Ended";
        if (isMuted) return "Muted";
        return isAiSpeaking ? "AI Speaking" : "Listening";
    };

    const orbColor =
        sessionState === "error"
            ? "#DC2626"
            : isMuted
                ? "#6B7280"
                : isAiSpeaking
                    ? "#7B9EA6"
                    : sessionState === "active"
                        ? "#DA7756"
                        : "#A69B8D";

    // ─── Render ─────────────────────────────────────────────────────────
    return (
        <SafeAreaView style={S.container}>
            {/* Main content */}
            <View style={S.content}>
                {/* Status */}
                <Text style={S.statusLabel}>{statusLabel()}</Text>

                {/* Glowing orb */}
                <Animated.View
                    style={[
                        S.orb,
                        {
                            backgroundColor: orbColor,
                            transform: [
                                {
                                    scale:
                                        sessionState === "active"
                                            ? pulseAnim
                                            : 1,
                                },
                            ],
                            shadowColor: orbColor,
                            shadowOpacity: sessionState === "active" ? 0.6 : 0,
                        },
                    ]}
                >
                    <Text style={S.orbIcon}>
                        {sessionState === "error"
                            ? "⚠️"
                            : isMuted
                                ? "🔇"
                                : isAiSpeaking
                                    ? "🔊"
                                    : "🎙️"}
                    </Text>
                </Animated.View>

                {/* Duration */}
                {sessionState === "active" && (
                    <Text style={S.duration}>{formatDuration(duration)}</Text>
                )}

                {/* Error */}
                {errorMsg ? <Text style={S.errorText}>{errorMsg}</Text> : null}

                {/* Subtitle */}
                {sessionState === "active" && (
                    <Text style={S.subtitle}>
                        {isMuted
                            ? "Microphone is muted"
                            : isAiSpeaking
                                ? "The AI is responding..."
                                : "Speak naturally. The AI is listening."}
                    </Text>
                )}
            </View>

            {/* Control buttons row */}
            {sessionState === "active" && (
                <View style={S.controlRow}>
                    {/* Mute */}
                    <Pressable
                        onPress={toggleMute}
                        style={({ pressed }) => [
                            S.controlBtn,
                            isMuted && S.controlBtnActive,
                            pressed && { opacity: 0.7 },
                        ]}
                    >
                        <Text style={S.controlIcon}>
                            {isMuted ? "🔇" : "🎤"}
                        </Text>
                        <Text
                            style={[
                                S.controlLabel,
                                isMuted && { color: "#DA7756" },
                            ]}
                        >
                            {isMuted ? "Unmute" : "Mute"}
                        </Text>
                    </Pressable>

                    {/* Transcript */}
                    <Pressable
                        onPress={() => setShowTranscript(true)}
                        style={({ pressed }) => [
                            S.controlBtn,
                            pressed && { opacity: 0.7 },
                        ]}
                    >
                        <Text style={S.controlIcon}>💬</Text>
                        <Text style={S.controlLabel}>Transcript</Text>
                    </Pressable>
                </View>
            )}

            {/* End / Go Back button */}
            <View
                style={{
                    paddingHorizontal: 32,
                    paddingBottom: Platform.OS === "ios" ? 16 : 32,
                }}
            >
                <Pressable
                    onPress={
                        sessionState === "error" ? () => router.back() : endSession
                    }
                    style={({ pressed }) => ({
                        backgroundColor: pressed ? "#3D3631" : "#2D2926",
                        borderRadius: 16,
                        padding: 18,
                        alignItems: "center",
                        borderWidth: 1,
                        borderColor: "#4A4340",
                    })}
                >
                    <Text
                        style={{
                            color:
                                sessionState === "error" ? "#A69B8D" : "#DC2626",
                            fontSize: 16,
                            fontWeight: "600",
                        }}
                    >
                        {sessionState === "error" ? "Go Back" : "End Session"}
                    </Text>
                </Pressable>
            </View>

            {/* ─── Transcript Modal ──────────────────────────────────────── */}
            <Modal
                visible={showTranscript}
                animationType="slide"
                transparent={true}
                onRequestClose={() => setShowTranscript(false)}
            >
                <View style={S.modalOverlay}>
                    <View style={S.modalContent}>
                        {/* Header */}
                        <View style={S.modalHeader}>
                            <Text style={S.modalTitle}>Transcript</Text>
                            <Pressable
                                onPress={() => setShowTranscript(false)}
                                hitSlop={12}
                            >
                                <Text style={S.modalClose}>✕</Text>
                            </Pressable>
                        </View>

                        {/* Messages */}
                        <ScrollView
                            ref={scrollViewRef}
                            style={S.modalScroll}
                            contentContainerStyle={{ paddingBottom: 16 }}
                        >
                            {transcript.length === 0 ? (
                                <Text style={S.emptyTranscript}>
                                    Transcript will appear here as you speak...
                                </Text>
                            ) : (
                                transcript.map((msg) => (
                                    <View
                                        key={msg.id}
                                        style={[
                                            S.bubble,
                                            msg.role === "user"
                                                ? S.bubbleUser
                                                : S.bubbleModel,
                                        ]}
                                    >
                                        <Text
                                            style={[
                                                S.bubbleText,
                                                msg.role === "user"
                                                    ? S.bubbleTextUser
                                                    : S.bubbleTextModel,
                                            ]}
                                        >
                                            {msg.text}
                                        </Text>
                                    </View>
                                ))
                            )}
                        </ScrollView>
                    </View>
                </View>
            </Modal>
        </SafeAreaView>
    );
}

// ─── Styles ─────────────────────────────────────────────────────────────────
const S = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: "#1A1714",
    },
    content: {
        flex: 1,
        justifyContent: "center",
        alignItems: "center",
        paddingHorizontal: 32,
    },
    statusLabel: {
        fontSize: 13,
        color: "#A69B8D",
        textTransform: "uppercase",
        letterSpacing: 3,
        marginBottom: 32,
        fontWeight: "600",
    },
    orb: {
        width: 150,
        height: 150,
        borderRadius: 75,
        justifyContent: "center",
        alignItems: "center",
        shadowOffset: { width: 0, height: 0 },
        shadowRadius: 30,
        elevation: 12,
    },
    orbIcon: {
        fontSize: 56,
    },
    duration: {
        fontSize: 36,
        fontFamily: "Georgia",
        color: "#F5F2EB",
        marginTop: 32,
        fontWeight: "300",
    },
    errorText: {
        fontSize: 15,
        color: "#DC2626",
        textAlign: "center",
        marginTop: 24,
        paddingHorizontal: 20,
    },
    subtitle: {
        fontSize: 15,
        color: "#A69B8D",
        textAlign: "center",
        marginTop: 16,
        lineHeight: 22,
    },
    // ── Control buttons ─────────────────────────────────────────────────
    controlRow: {
        flexDirection: "row",
        justifyContent: "center",
        gap: 24,
        paddingHorizontal: 32,
        paddingBottom: 20,
    },
    controlBtn: {
        alignItems: "center",
        justifyContent: "center",
        width: 80,
        height: 80,
        borderRadius: 20,
        backgroundColor: "#2D2926",
        borderWidth: 1,
        borderColor: "#4A4340",
    },
    controlBtnActive: {
        backgroundColor: "#3D2A22",
        borderColor: "#DA7756",
    },
    controlIcon: {
        fontSize: 28,
        marginBottom: 4,
    },
    controlLabel: {
        fontSize: 11,
        color: "#A69B8D",
        fontWeight: "600",
        textTransform: "uppercase",
        letterSpacing: 0.5,
    },
    // ── Transcript modal ────────────────────────────────────────────────
    modalOverlay: {
        flex: 1,
        backgroundColor: "rgba(0,0,0,0.6)",
        justifyContent: "flex-end",
    },
    modalContent: {
        backgroundColor: "#1A1714",
        borderTopLeftRadius: 24,
        borderTopRightRadius: 24,
        maxHeight: "75%",
        minHeight: "50%",
        borderWidth: 1,
        borderColor: "#2D2926",
    },
    modalHeader: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        paddingHorizontal: 24,
        paddingVertical: 16,
        borderBottomWidth: 1,
        borderBottomColor: "#2D2926",
    },
    modalTitle: {
        fontSize: 18,
        fontWeight: "700",
        color: "#F5F2EB",
        fontFamily: "Georgia",
    },
    modalClose: {
        fontSize: 20,
        color: "#A69B8D",
        fontWeight: "700",
    },
    modalScroll: {
        paddingHorizontal: 16,
        paddingTop: 12,
    },
    emptyTranscript: {
        color: "#6B6560",
        fontSize: 14,
        textAlign: "center",
        marginTop: 40,
        fontStyle: "italic",
    },
    // ── Chat bubbles ────────────────────────────────────────────────────
    bubble: {
        maxWidth: "80%",
        paddingHorizontal: 16,
        paddingVertical: 10,
        borderRadius: 18,
        marginVertical: 4,
    },
    bubbleUser: {
        alignSelf: "flex-end",
        backgroundColor: "#2D6A4F",
        borderBottomRightRadius: 6,
    },
    bubbleModel: {
        alignSelf: "flex-start",
        backgroundColor: "#2D2926",
        borderBottomLeftRadius: 6,
    },
    bubbleText: {
        fontSize: 15,
        lineHeight: 21,
    },
    bubbleTextUser: {
        color: "#D8F3DC",
    },
    bubbleTextModel: {
        color: "#E5DFD5",
    },
});
