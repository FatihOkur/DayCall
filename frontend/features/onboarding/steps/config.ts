/**
 * Onboarding step order and per-step metadata.
 * Change order by reordering ONBOARDING_STEP_IDS.
 */

export const ONBOARDING_STEP_IDS = [
    "welcome",
    "journey",
    "readyForQuestions",
    "name",
    "birthDate",
    "horoscope",
    "gender",
    "journalingBefore",
    "emotionalTraits",
    "whereHeard",
    "callTime",
    "committed",
] as const;

export type OnboardingStepId = (typeof ONBOARDING_STEP_IDS)[number];

export const STEP_NEXT_LABEL: Record<OnboardingStepId, string> = {
    welcome: "Continue",
    journey: "Continue",
    readyForQuestions: "I am ready",
    name: "Continue",
    birthDate: "Continue",
    horoscope: "Continue",
    gender: "Continue",
    journalingBefore: "Continue",
    emotionalTraits: "Continue",
    whereHeard: "Continue",
    callTime: "Continue",
    committed: "Get started",
};

export const ONBOARDING_QUESTION_COUNT = 9;
