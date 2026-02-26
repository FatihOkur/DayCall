import { NarrativeStepLayout } from "./NarrativeStepLayout";
import { onboardingCopy } from "../copy";

export function JourneyStep() {
    return (
        <NarrativeStepLayout message={onboardingCopy.journeyBubble} />
    );
}
