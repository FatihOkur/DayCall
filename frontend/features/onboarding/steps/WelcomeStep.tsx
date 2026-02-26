import { NarrativeStepLayout } from "./NarrativeStepLayout";
import { onboardingCopy } from "../copy";

export function WelcomeStep() {
    return (
        <NarrativeStepLayout message={onboardingCopy.welcomeBubble} />
    );
}
