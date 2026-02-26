/**
 * WebRTC Acoustic Echo Cancellation (AEC) Service
 *
 * Creates a loopback RTCPeerConnection to activate WebRTC's built-in AEC.
 * When active, the microphone's audio stream has echo cancellation applied
 * at the system level, preventing the loudspeaker's output from feeding back
 * into the mic and causing the AI to hear itself.
 *
 * Flow:  getUserMedia(AEC constraints) → addTrack → createOffer → loopback answer
 *        ↳ WebRTC pipeline now processes all mic audio through its AEC engine
 *
 * NOTE: react-native-webrtc is loaded dynamically so the app does not crash
 * in environments where the native module is not available (e.g. Expo Go).
 */

// No top-level import of react-native-webrtc — it triggers NativeEventEmitter
// and crashes when the native module is missing. We load it inside initAec().

let initialized = false;
let localStream: any = null;
let peerConnection: any = null;

/**
 * Initialize WebRTC AEC: get mic with echo-cancellation constraints
 * and create a loopback PeerConnection to activate the AEC pipeline.
 */
export async function initAec(): Promise<boolean> {
    if (initialized) return true;

    let RTCPeerConnectionClass: any;
    let mediaDevices: any;

    try {
        const webrtc = await import("react-native-webrtc");
        RTCPeerConnectionClass = webrtc.RTCPeerConnection;
        mediaDevices = webrtc.mediaDevices;
    } catch (e) {
        console.warn("[AEC] WebRTC not available (e.g. Expo Go):", e);
        return false;
    }

    try {
        console.log("[AEC] Initializing WebRTC echo cancellation...");

        const stream = await mediaDevices.getUserMedia({
            audio: {
                echoCancellation: true,
                noiseSuppression: true,
                autoGainControl: true,
                googEchoCancellation: true,
                googAutoGainControl: true,
                googNoiseSuppression: true,
                googHighpassFilter: true,
            } as any,
            video: false,
        } as any);

        localStream = stream;

        // Create loopback PeerConnection to activate AEC pipeline
        peerConnection = new RTCPeerConnectionClass({
            // @ts-ignore
            sdpSemantics: "unified-plan",
            iceServers: [{ urls: "stun:stun.l.google.com:19302" }],
        });

        // Add mic tracks to connection
        (stream as any).getTracks().forEach((track: any) => {
            peerConnection!.addTrack(track, stream as any);
        });

        // Create and set offer
        const offer = await peerConnection.createOffer({});
        await peerConnection.setLocalDescription(offer);

        // Wait briefly for ICE gathering
        await new Promise<void>((resolve) => {
            if (peerConnection!.iceGatheringState === "complete") {
                resolve();
            } else {
                const check = () => {
                    if (peerConnection!.iceGatheringState === "complete") {
                        resolve();
                    }
                };
                (peerConnection as any).addEventListener(
                    "icegatheringstatechange",
                    check
                );
                setTimeout(resolve, 1000);
            }
        });

        // Create loopback answer (set setup:passive for valid SDP)
        const desc = peerConnection.localDescription;
        if (desc) {
            const answerSdp = desc.sdp
                .split("\r\n")
                .map((line: string) =>
                    line.includes("a=setup:") ? "a=setup:passive" : line
                )
                .join("\r\n");

            try {
                await peerConnection.setRemoteDescription({
                    type: "answer",
                    sdp: answerSdp,
                } as any);
            } catch {
                // Fallback: strip setup lines entirely
                const stripped = desc.sdp
                    .split("\r\n")
                    .filter((l: string) => !l.includes("a=setup:"))
                    .join("\r\n");
                await peerConnection.setRemoteDescription({
                    type: "answer",
                    sdp: stripped,
                } as any);
            }
        }

        initialized = true;
        console.log("[AEC] WebRTC echo cancellation active");
        return true;
    } catch (err) {
        console.warn("[AEC] Failed to initialize:", err);
        return false;
    }
}

/**
 * Stop AEC and release all WebRTC resources.
 */
export async function stopAec(): Promise<void> {
    try {
        if (peerConnection) {
            peerConnection.close();
            peerConnection = null;
        }
        if (localStream) {
            (localStream as any).getTracks().forEach((t: any) => t.stop());
            localStream = null;
        }
        initialized = false;
        console.log("[AEC] Stopped and released resources");
    } catch (err) {
        console.warn("[AEC] Error stopping:", err);
    }
}
