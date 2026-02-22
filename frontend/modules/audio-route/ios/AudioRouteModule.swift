import ExpoModulesCore
import AVFoundation

public class AudioRouteModule: Module {
    public func definition() -> ModuleDefinition {
        Name("AudioRoute")

        /// Re-configure the shared AVAudioSession to route playback audio through
        /// the device's main loudspeaker instead of the earpiece, while keeping
        /// the microphone active for full-duplex recording.
        ///
        /// Category:  .playAndRecord  (mic + speaker simultaneously)
        /// Mode:      .voiceChat      (enables system echo-cancellation)
        /// Options:   .defaultToSpeaker  → bottom speaker instead of earpiece
        ///            .allowBluetooth    → Bluetooth headsets still work
        AsyncFunction("forceToSpeaker") {
            let session = AVAudioSession.sharedInstance()
            try session.setCategory(
                .playAndRecord,
                mode: .voiceChat,
                options: [.defaultToSpeaker, .allowBluetooth]
            )
            try session.overrideOutputAudioPort(.speaker)
            try session.setActive(true)
        }
    }
}
