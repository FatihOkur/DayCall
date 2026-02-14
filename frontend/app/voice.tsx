import { useEffect, useRef, useState, useCallback } from "react";
import { View, Text, Pressable, Animated, Platform } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";
import { useAppStore } from "../store/useAppStore";
import { API_BASE_URL } from "../services/api";

/**
 * Voice Session — Full-screen voice conversation with the AI.
 *
 * Uses Web Audio API to capture raw PCM audio from the mic and stream
 * it over WebSocket to the backend (which proxies to Gemini Live API).
 * Receives PCM audio responses and plays them back.
 *
 * Audio format:
 *   Send:    16kHz, mono, 16-bit PCM (Int16)
 *   Receive: 24kHz, mono, 16-bit PCM (Int16)
 */

const WS_BASE_URL = API_BASE_URL.replace(/^http/, "ws");
const SEND_SAMPLE_RATE = 16000;
const RECEIVE_SAMPLE_RATE = 24000;

type SessionState = "connecting" | "active" | "ended" | "error";

export default function VoiceScreen() {
    const token = useAppStore((s) => s.token);
    const setVoiceStatus = useAppStore((s) => s.setVoiceStatus);

    const [sessionState, setSessionState] = useState<SessionState>("connecting");
    const [duration, setDuration] = useState(0);
    const [errorMsg, setErrorMsg] = useState("");

    const wsRef = useRef<WebSocket | null>(null);
    const audioCtxRef = useRef<AudioContext | null>(null);
    const playbackCtxRef = useRef<AudioContext | null>(null);
    const streamRef = useRef<MediaStream | null>(null);
    const processorRef = useRef<ScriptProcessorNode | null>(null);
    const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
    const nextPlayTimeRef = useRef<number>(0); // schedule audio chunks sequentially

    // Pulsing animation
    const pulseAnim = useRef(new Animated.Value(1)).current;

    useEffect(() => {
        if (sessionState === "active") {
            const pulse = Animated.loop(
                Animated.sequence([
                    Animated.timing(pulseAnim, {
                        toValue: 1.3,
                        duration: 800,
                        useNativeDriver: true,
                    }),
                    Animated.timing(pulseAnim, {
                        toValue: 1,
                        duration: 800,
                        useNativeDriver: true,
                    }),
                ])
            );
            pulse.start();
            return () => pulse.stop();
        }
    }, [sessionState]);

    // Duration timer
    useEffect(() => {
        if (sessionState === "active") {
            timerRef.current = setInterval(() => setDuration((d) => d + 1), 1000);
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

    /** Convert Float32 audio samples to Int16 PCM bytes */
    const float32ToInt16 = (float32Array: Float32Array): ArrayBuffer => {
        const int16 = new Int16Array(float32Array.length);
        for (let i = 0; i < float32Array.length; i++) {
            const s = Math.max(-1, Math.min(1, float32Array[i]));
            int16[i] = s < 0 ? s * 0x8000 : s * 0x7fff;
        }
        return int16.buffer;
    };

    /** Play received PCM Int16 audio at 24kHz — queued sequentially */
    const playAudioChunk = useCallback((pcmData: ArrayBuffer) => {
        try {
            if (!playbackCtxRef.current) {
                playbackCtxRef.current = new AudioContext({ sampleRate: RECEIVE_SAMPLE_RATE });
                nextPlayTimeRef.current = 0;
            }
            const ctx = playbackCtxRef.current;
            const int16 = new Int16Array(pcmData);
            const float32 = new Float32Array(int16.length);

            for (let i = 0; i < int16.length; i++) {
                float32[i] = int16[i] / 0x7fff;
            }

            const audioBuffer = ctx.createBuffer(1, float32.length, RECEIVE_SAMPLE_RATE);
            audioBuffer.getChannelData(0).set(float32);

            const source = ctx.createBufferSource();
            source.buffer = audioBuffer;
            source.connect(ctx.destination);

            // Schedule this chunk to play after the previous one ends
            const now = ctx.currentTime;
            const startTime = Math.max(now, nextPlayTimeRef.current);
            source.start(startTime);
            nextPlayTimeRef.current = startTime + audioBuffer.duration;
        } catch (e) {
            console.error("Playback error:", e);
        }
    }, []);

    // Start session
    const startSession = useCallback(async () => {
        try {
            setVoiceStatus("connecting");
            setSessionState("connecting");

            // 1. Get mic access
            const stream = await navigator.mediaDevices.getUserMedia({
                audio: {
                    sampleRate: SEND_SAMPLE_RATE,
                    channelCount: 1,
                    echoCancellation: true,
                    noiseSuppression: true,
                },
            });
            streamRef.current = stream;

            // 2. Set up AudioContext for recording
            const audioCtx = new AudioContext({ sampleRate: SEND_SAMPLE_RATE });
            audioCtxRef.current = audioCtx;

            const source = audioCtx.createMediaStreamSource(stream);
            // ScriptProcessorNode with 4096 buffer size, 1 input channel, 1 output channel
            const processor = audioCtx.createScriptProcessor(4096, 1, 1);
            processorRef.current = processor;

            // 3. Connect WebSocket
            const wsUrl = `${WS_BASE_URL}/ws/audio?token=${token}`;
            const ws = new WebSocket(wsUrl);
            wsRef.current = ws;
            ws.binaryType = "arraybuffer";

            ws.onopen = () => {
                console.log("WebSocket connected — starting audio stream");
                setSessionState("active");
                setVoiceStatus("active");

                // Wire up audio processing — send PCM chunks to WebSocket
                processor.onaudioprocess = (e) => {
                    if (ws.readyState === WebSocket.OPEN) {
                        const inputData = e.inputBuffer.getChannelData(0);
                        const pcmBytes = float32ToInt16(inputData);
                        ws.send(pcmBytes);
                    }
                };

                // Connect: mic → processor → destination (needed to keep processor alive)
                source.connect(processor);
                processor.connect(audioCtx.destination);
            };

            ws.onmessage = (event) => {
                if (event.data instanceof ArrayBuffer && event.data.byteLength > 0) {
                    playAudioChunk(event.data);
                }
            };

            ws.onerror = () => {
                setErrorMsg("Connection error — is the backend running?");
                setSessionState("error");
                setVoiceStatus("idle");
            };

            ws.onclose = (e) => {
                console.log("WebSocket closed:", e.code, e.reason);
                if (sessionState !== "ended") {
                    setSessionState("ended");
                    setVoiceStatus("idle");
                }
            };
        } catch (e: any) {
            console.error("Start session error:", e);
            setErrorMsg(e.message || "Failed to start — check mic permissions");
            setSessionState("error");
            setVoiceStatus("idle");
        }
    }, [token]);

    // End session
    const endSession = useCallback(async () => {
        setSessionState("ended");
        setVoiceStatus("idle");

        // Stop audio processing
        if (processorRef.current) {
            processorRef.current.disconnect();
            processorRef.current = null;
        }
        if (audioCtxRef.current) {
            audioCtxRef.current.close();
            audioCtxRef.current = null;
        }
        if (playbackCtxRef.current) {
            playbackCtxRef.current.close();
            playbackCtxRef.current = null;
        }

        // Stop mic stream
        if (streamRef.current) {
            streamRef.current.getTracks().forEach((t) => t.stop());
            streamRef.current = null;
        }

        // Close WebSocket
        if (wsRef.current) {
            wsRef.current.close();
            wsRef.current = null;
        }

        setTimeout(() => router.back(), 500);
    }, []);

    // Start on mount
    useEffect(() => {
        startSession();

        return () => {
            // Cleanup on unmount
            if (processorRef.current) processorRef.current.disconnect();
            if (audioCtxRef.current) audioCtxRef.current.close().catch(() => { });
            if (playbackCtxRef.current) playbackCtxRef.current.close().catch(() => { });
            if (streamRef.current)
                streamRef.current.getTracks().forEach((t) => t.stop());
            if (wsRef.current) wsRef.current.close();
            if (timerRef.current) clearInterval(timerRef.current);
        };
    }, []);

    return (
        <SafeAreaView style={{ flex: 1, backgroundColor: "#1A1714" }}>
            <View
                style={{
                    flex: 1,
                    justifyContent: "center",
                    alignItems: "center",
                    paddingHorizontal: 32,
                }}
            >
                {/* Status */}
                <Text
                    style={{
                        fontSize: 14,
                        color: "#A69B8D",
                        textTransform: "uppercase",
                        letterSpacing: 2,
                        marginBottom: 24,
                    }}
                >
                    {sessionState === "connecting"
                        ? "Connecting..."
                        : sessionState === "active"
                            ? "Listening"
                            : sessionState === "error"
                                ? "Error"
                                : "Session Ended"}
                </Text>

                {/* Pulsing mic circle */}
                <Animated.View
                    style={{
                        width: 140,
                        height: 140,
                        borderRadius: 70,
                        backgroundColor:
                            sessionState === "active"
                                ? "#DA7756"
                                : sessionState === "error"
                                    ? "#DC2626"
                                    : "#A69B8D",
                        justifyContent: "center",
                        alignItems: "center",
                        transform: [{ scale: sessionState === "active" ? pulseAnim : 1 }],
                        shadowColor: "#DA7756",
                        shadowOffset: { width: 0, height: 0 },
                        shadowOpacity: sessionState === "active" ? 0.5 : 0,
                        shadowRadius: 20,
                        elevation: 10,
                    }}
                >
                    <Text style={{ fontSize: 56 }}>
                        {sessionState === "error" ? "⚠️" : "🎙️"}
                    </Text>
                </Animated.View>

                {/* Duration */}
                {sessionState === "active" && (
                    <Text
                        style={{
                            fontSize: 32,
                            fontFamily: "Georgia",
                            color: "#F5F2EB",
                            marginTop: 32,
                            fontWeight: "300",
                        }}
                    >
                        {formatDuration(duration)}
                    </Text>
                )}

                {/* Error message */}
                {errorMsg ? (
                    <Text
                        style={{
                            fontSize: 15,
                            color: "#DC2626",
                            textAlign: "center",
                            marginTop: 24,
                            paddingHorizontal: 20,
                        }}
                    >
                        {errorMsg}
                    </Text>
                ) : null}

                {/* Hint */}
                {sessionState === "active" && (
                    <Text
                        style={{
                            fontSize: 15,
                            color: "#A69B8D",
                            textAlign: "center",
                            marginTop: 16,
                            lineHeight: 22,
                        }}
                    >
                        Speak naturally. The AI is listening.
                    </Text>
                )}
            </View>

            {/* Bottom button */}
            <View
                style={{
                    paddingHorizontal: 32,
                    paddingBottom: Platform.OS === "ios" ? 16 : 32,
                }}
            >
                <Pressable
                    onPress={sessionState === "error" ? () => router.back() : endSession}
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
                            color: sessionState === "error" ? "#A69B8D" : "#DC2626",
                            fontSize: 16,
                            fontWeight: "600",
                        }}
                    >
                        {sessionState === "error" ? "Go Back" : "End Session"}
                    </Text>
                </Pressable>
            </View>
        </SafeAreaView>
    );
}
