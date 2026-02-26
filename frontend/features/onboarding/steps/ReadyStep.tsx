import { NarrativeStepLayout } from "./NarrativeStepLayout";
import { onboardingCopy } from "../copy";
import { ONBOARDING_QUESTION_COUNT } from "./config";

export function ReadyStep() {
    const message = onboardingCopy.readyBubble.replace(
        "X",
        String(ONBOARDING_QUESTION_COUNT)
    );
    return <NarrativeStepLayout message={message} />;
}
