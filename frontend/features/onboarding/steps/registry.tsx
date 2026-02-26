/**
 * Step ID → component map for onboarding.
 * Reorder steps in config.ts; this registry stays unchanged.
 */

import type { ComponentType } from "react";
import type { OnboardingStepId } from "./config";
import { WelcomeStep } from "./WelcomeStep";
import { JourneyStep } from "./JourneyStep";
import { ReadyStep } from "./ReadyStep";
import { NameStep } from "./NameStep";
import { BirthDateStep } from "./BirthDateStep";
import { HoroscopeStep } from "./HoroscopeStep";
import { GenderStep } from "./GenderStep";
import { JournalingBeforeStep } from "./JournalingBeforeStep";
import { EmotionalTraitsStep } from "./EmotionalTraitsStep";
import { WhereHeardStep } from "./WhereHeardStep";
import { CallTimeStep } from "./CallTimeStep";
import { CommittedStep } from "./CommittedStep";

export const STEP_REGISTRY: Record<OnboardingStepId, ComponentType> = {
    welcome: WelcomeStep,
    journey: JourneyStep,
    readyForQuestions: ReadyStep,
    name: NameStep,
    birthDate: BirthDateStep,
    horoscope: HoroscopeStep,
    gender: GenderStep,
    journalingBefore: JournalingBeforeStep,
    emotionalTraits: EmotionalTraitsStep,
    whereHeard: WhereHeardStep,
    callTime: CallTimeStep,
    committed: CommittedStep,
};
