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
import InCallManager from "react-native-incall-manager";
import { initAec, stopAec } from "../services/WebRTCAecService";
import { useAppStore } from "../store/useAppStore";
import { API_BASE_URL } from "../services/api";
import { useTheme } from "../theme";
import { ScreenBackground } from "../components/ScreenBackground";

/**
 * Voice Session -- Full-duplex real-time AI conversation.
 *
 * Audio architecture:
 *   Recording:  LiveAudioStream -> 16kHz PCM -> WebSocket -> Backend -> Gemini
 *   Playback:   Gemini PCM -> Backend -> WebSocket -> WAV data URI -> expo-av
 *   Transcript:  Gemini transcription -> Backend JSON -> chat bubbles
 */

const WS_BASE_URL = API_BASE_URL.replace(/^http/, "ws");

function pcmToDataUri(pcm: ArrayBuffer, sampleRate = 24000): string {
    const numChannels = 1;
    const bitsPerSample = 16;
    const byteRate = (sampleRate * numChannels * bitsPerSample) / 8;
    const blockAlign = (numChannels * bitsPerSample) / 8;
    const dataSize = pcm.byteLength;

    const GAIN = 2.0;
    const src = new Int16Array(pcm);
    const boosted = new Int16Array(src.length);
    for (let i = 0; i < src.length; i++) {
        const v = src[i] * GAIN;
        boosted[i] = v > 32767 ? 32767 : v < -32768 ? -32768 : v;
    }
    const boostedBytes = new Uint8Array(boosted.buffer);

    const wav = new ArrayBuffer(44 + dataSize);
    const v = new DataView(wav);
    v.setUint32(0, 0x52494646, false);
    v.setUint32(4, 36 + dataSize, true);
    v.setUint32(8, 0x57415645, false);
    v.setUint32(12, 0x666d7420, false);
    v.setUint32(16, 16, true);
    v.setUint16(20, 1, true);
    v.setUint16(22, numChannels, true);
    v.setUint32(24, sampleRate, true);
    v.setUint32(28, byteRate, true);
    v.setUint16(32, blockAlign, true);
    v.setUint16(34, bitsPerSample, true);
    v.setUint32(36, 0x64617461, false);
    v.setUint32(40, dataSize, true);
    new Uint8Array(wav, 44).set(boostedBytes);

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

const PCM_OPTIONS = {
    sampleRate: 16000,
    channels: 1,
    bitsPerSample: 16,
    audioSource: 6,
    bufferSize: 4096,
    wavFile: "",
};

const EARLY_PLAY_BYTES = 48000;

type SessionState = "connecting" | "active" | "ended" | "error";

interface TranscriptMsg {
    role: "user" | "model";
    text: string;
    id: number;
}

export default function VoiceScreen() {
    const { theme } = useTheme();
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

    const pcmChunksRef = useRef<ArrayBuffer[]>([]);
    const playQueueRef = useRef<Promise<void>>(Promise.resolve());
    const playQueueCountRef = useRef(0);
    const isPlayingRef = useRef(false);
    const playSessionRef = useRef(0);
    const currentSoundRef = useRef<Audio.Sound | null>(null);
    const resolveCurrentSoundRef = useRef<(() => void) | null>(null);
    const audioSubRef = useRef<{ remove: () => void } | null>(null);

    const pulseAnim = useRef(new Animated.Value(1)).current;

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

    const addTranscript = useCallback(
        (role: "user" | "model", text: string) => {
            setTranscript((prev) => {
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
            setTimeout(
                () => scrollViewRef.current?.scrollToEnd({ animated: true }),
                100
            );
        },
        []
    );

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

            ws.onopen = async () => {
                console.log("[DayCall] WebSocket connected");
                setSessionState("active");
                setVoiceStatus("active");

                try {
                    InCallManager.start({ media: "audio", auto: true });
                    InCallManager.setForceSpeakerphoneOn(true);
                } catch (e: any) {
                    console.warn("[DayCall] InCallManager failed:", e);
                }

                try {
                    await initAec();
                } catch (e: any) {
                    console.warn("[DayCall] WebRTC AEC init failed:", e);
                }

                try { LiveAudioStream.stop(); } catch { }
                LiveAudioStream.init(PCM_OPTIONS);

                audioSubRef.current = LiveAudioStream.on(
                    "data",
                    (data: string) => {
                        if (wsRef.current?.readyState !== WebSocket.OPEN) return;
                        if (isMutedRef.current) return;
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
            };

            ws.onmessage = (event) => {
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
                    } catch { }
                    return;
                }

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
                setErrorMsg("Connection error -- is the backend running?");
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

    const endSession = useCallback(async () => {
        setSessionState("ended");
        setVoiceStatus("idle");
        if (timerRef.current) clearInterval(timerRef.current);

        await stopAllPlayback();
        try { InCallManager.stop(); } catch { }
        await stopAec();
        LiveAudioStream.stop();
        audioSubRef.current?.remove();
        audioSubRef.current = null;

        await Audio.setAudioModeAsync({ allowsRecordingIOS: false }).catch(() => { });
        if (wsRef.current) {
            wsRef.current.close();
            wsRef.current = null;
        }
        setTimeout(() => router.back(), 400);
    }, [stopAllPlayback]);

    const toggleMute = useCallback(() => {
        setIsMuted((prev) => {
            const next = !prev;
            isMutedRef.current = next;
            return next;
        });
    }, []);

    useEffect(() => {
        startSession();
        return () => {
            if (timerRef.current) clearInterval(timerRef.current);
            playSessionRef.current++;
            playQueueRef.current = Promise.resolve();
            playQueueCountRef.current = 0;
            pcmChunksRef.current = [];
            resolveCurrentSoundRef.current?.();
            const sound = currentSoundRef.current;
            currentSoundRef.current = null;
            sound?.stopAsync().catch(() => { });
            sound?.unloadAsync().catch(() => { });
            isPlayingRef.current = false;

            stopAec().catch(() => { });
            audioSubRef.current?.remove();
            audioSubRef.current = null;
            LiveAudioStream.stop();
            try { InCallManager.stop(); } catch { }
            Audio.setAudioModeAsync({ allowsRecordingIOS: false }).catch(() => { });

            if (wsRef.current) {
                wsRef.current.close();
                wsRef.current = null;
            }
        };
    }, []);

    const statusLabel = () => {
        if (sessionState === "connecting") return "Connecting...";
        if (sessionState === "error") return "Error";
        if (sessionState === "ended") return "Session Ended";
        if (isMuted) return "Muted";
        return isAiSpeaking ? "AI Speaking" : "Listening";
    };

    const orbColor =
        sessionState === "error"
            ? theme.error
            : isMuted
                ? theme.textMuted
                : isAiSpeaking
                    ? theme.voiceRingCore
                    : sessionState === "active"
                        ? theme.accent
                        : theme.textSecondary;

    return (
        <ScreenBackground>
            <SafeAreaView style={styles.container}>
                <View style={styles.content}>
                    <Text style={[styles.statusLabel, { color: theme.textSecondary }]}>
                        {statusLabel()}
                    </Text>

                    <Animated.View
                        style={[
                            styles.orb,
                            {
                                backgroundColor: orbColor,
                                transform: [
                                    {
                                        scale: sessionState === "active" ? pulseAnim : 1,
                                    },
                                ],
                                shadowColor: orbColor,
                                shadowOpacity: sessionState === "active" ? 0.6 : 0,
                            },
                        ]}
                    >
                        <Text style={styles.orbIcon}>
                            {sessionState === "error"
                                ? "⚠️"
                                : isMuted
                                    ? "🔇"
                                    : isAiSpeaking
                                        ? "🔊"
                                        : "🎙️"}
                        </Text>
                    </Animated.View>

                    {sessionState === "active" && (
                        <Text style={[styles.duration, { color: theme.textPrimary }]}>
                            {formatDuration(duration)}
                        </Text>
                    )}

                    {errorMsg ? (
                        <Text style={[styles.errorText, { color: theme.error }]}>
                            {errorMsg}
                        </Text>
                    ) : null}

                    {sessionState === "active" && (
                        <Text style={[styles.subtitle, { color: theme.textSecondary }]}>
                            {isMuted
                                ? "Microphone is muted"
                                : isAiSpeaking
                                    ? "The AI is responding..."
                                    : "Speak naturally. The AI is listening."}
                        </Text>
                    )}
                </View>

                {sessionState === "active" && (
                    <View style={styles.controlRow}>
                        <Pressable
                            onPress={toggleMute}
                            style={({ pressed }) => [
                                styles.controlBtn,
                                {
                                    backgroundColor: isMuted ? theme.bgRaised : theme.bgSurface,
                                    borderColor: isMuted ? theme.accent : theme.borderMedium,
                                },
                                pressed && { opacity: 0.7 },
                            ]}
                        >
                            <Text style={styles.controlIcon}>
                                {isMuted ? "🔇" : "🎤"}
                            </Text>
                            <Text
                                style={[
                                    styles.controlLabel,
                                    { color: isMuted ? theme.accent : theme.textSecondary },
                                ]}
                            >
                                {isMuted ? "Unmute" : "Mute"}
                            </Text>
                        </Pressable>

                        <Pressable
                            onPress={() => setShowTranscript(true)}
                            style={({ pressed }) => [
                                styles.controlBtn,
                                {
                                    backgroundColor: theme.bgSurface,
                                    borderColor: theme.borderMedium,
                                },
                                pressed && { opacity: 0.7 },
                            ]}
                        >
                            <Text style={styles.controlIcon}>💬</Text>
                            <Text style={[styles.controlLabel, { color: theme.textSecondary }]}>
                                Transcript
                            </Text>
                        </Pressable>
                    </View>
                )}

                <View style={styles.bottomBar}>
                    <Pressable
                        onPress={
                            sessionState === "error" ? () => router.back() : endSession
                        }
                        style={({ pressed }) => [
                            styles.endBtn,
                            {
                                backgroundColor: pressed ? theme.bgRaised : theme.bgSurface,
                                borderColor: theme.borderMedium,
                            },
                        ]}
                    >
                        <Text
                            style={{
                                color: sessionState === "error" ? theme.textSecondary : theme.error,
                                fontSize: 16,
                                fontWeight: "600",
                            }}
                        >
                            {sessionState === "error" ? "Go Back" : "End Session"}
                        </Text>
                    </Pressable>
                </View>

                {/* Transcript Modal */}
                <Modal
                    visible={showTranscript}
                    animationType="slide"
                    transparent={true}
                    onRequestClose={() => setShowTranscript(false)}
                >
                    <View style={styles.modalOverlay}>
                        <View
                            style={[
                                styles.modalContent,
                                {
                                    backgroundColor: theme.bgBase,
                                    borderColor: theme.borderSubtle,
                                },
                            ]}
                        >
                            <View
                                style={[
                                    styles.modalHeader,
                                    { borderBottomColor: theme.borderSubtle },
                                ]}
                            >
                                <Text style={[styles.modalTitle, { color: theme.textPrimary }]}>
                                    Transcript
                                </Text>
                                <Pressable
                                    onPress={() => setShowTranscript(false)}
                                    hitSlop={12}
                                >
                                    <Text style={[styles.modalClose, { color: theme.textSecondary }]}>
                                        ✕
                                    </Text>
                                </Pressable>
                            </View>

                            <ScrollView
                                ref={scrollViewRef}
                                style={styles.modalScroll}
                                contentContainerStyle={{ paddingBottom: 16 }}
                            >
                                {transcript.length === 0 ? (
                                    <Text style={[styles.emptyTranscript, { color: theme.textMuted }]}>
                                        Transcript will appear here as you speak...
                                    </Text>
                                ) : (
                                    transcript.map((msg) => (
                                        <View
                                            key={msg.id}
                                            style={[
                                                styles.bubble,
                                                msg.role === "user"
                                                    ? [styles.bubbleUser, { backgroundColor: theme.success }]
                                                    : [styles.bubbleModel, { backgroundColor: theme.bgSurface }],
                                            ]}
                                        >
                                            <Text
                                                style={[
                                                    styles.bubbleText,
                                                    {
                                                        color: msg.role === "user"
                                                            ? theme.buttonPrimaryText
                                                            : theme.textPrimary,
                                                    },
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
        </ScreenBackground>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    content: {
        flex: 1,
        justifyContent: "center",
        alignItems: "center",
        paddingHorizontal: 32,
    },
    statusLabel: {
        fontSize: 13,
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
        marginTop: 32,
        fontWeight: "300",
    },
    errorText: {
        fontSize: 15,
        textAlign: "center",
        marginTop: 24,
        paddingHorizontal: 20,
    },
    subtitle: {
        fontSize: 15,
        textAlign: "center",
        marginTop: 16,
        lineHeight: 22,
    },
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
        borderWidth: 1,
    },
    controlIcon: {
        fontSize: 28,
        marginBottom: 4,
    },
    controlLabel: {
        fontSize: 11,
        fontWeight: "600",
        textTransform: "uppercase",
        letterSpacing: 0.5,
    },
    bottomBar: {
        paddingHorizontal: 32,
        paddingBottom: Platform.OS === "ios" ? 16 : 32,
    },
    endBtn: {
        borderRadius: 16,
        padding: 18,
        alignItems: "center",
        borderWidth: 1,
    },
    modalOverlay: {
        flex: 1,
        backgroundColor: "rgba(0,0,0,0.6)",
        justifyContent: "flex-end",
    },
    modalContent: {
        borderTopLeftRadius: 24,
        borderTopRightRadius: 24,
        maxHeight: "75%",
        minHeight: "50%",
        borderWidth: 1,
    },
    modalHeader: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        paddingHorizontal: 24,
        paddingVertical: 16,
        borderBottomWidth: 1,
    },
    modalTitle: {
        fontSize: 18,
        fontWeight: "700",
    },
    modalClose: {
        fontSize: 20,
        fontWeight: "700",
    },
    modalScroll: {
        paddingHorizontal: 16,
        paddingTop: 12,
    },
    emptyTranscript: {
        fontSize: 14,
        textAlign: "center",
        marginTop: 40,
        fontStyle: "italic",
    },
    bubble: {
        maxWidth: "80%",
        paddingHorizontal: 16,
        paddingVertical: 10,
        borderRadius: 18,
        marginVertical: 4,
    },
    bubbleUser: {
        alignSelf: "flex-end",
        borderBottomRightRadius: 6,
    },
    bubbleModel: {
        alignSelf: "flex-start",
        borderBottomLeftRadius: 6,
    },
    bubbleText: {
        fontSize: 15,
        lineHeight: 21,
    },
});
