let AudioRoute: any = null;

try {
    const { requireNativeModule } = require("expo-modules-core");
    AudioRoute = requireNativeModule("AudioRoute");
} catch {
    // Native module not available — dev build hasn't been rebuilt yet.
    // forceToSpeaker() will be a no-op until the next native build.
    console.warn(
        "[AudioRoute] Native module not found. Audio will route to earpiece " +
        "on iOS until you rebuild the dev client with the new native module."
    );
}

/**
 * Force iOS audio output to the main loudspeaker.
 *
 * Sets AVAudioSession to .playAndRecord + .voiceChat mode with
 * .defaultToSpeaker option. This routes playback through the bottom
 * speaker instead of the earpiece, while keeping the mic active
 * and enabling hardware echo cancellation.
 *
 * No-op if the native module isn't compiled in yet.
 */
export async function forceToSpeaker(): Promise<void> {
    if (!AudioRoute) return;
    return AudioRoute.forceToSpeaker();
}
