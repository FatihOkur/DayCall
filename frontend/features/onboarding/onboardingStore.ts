/**
 * Onboarding — Zustand store for completion flag and answers.
 * Completion flag is persisted in AsyncStorage and hydrated on app load.
 */

import { create } from "zustand";
import AsyncStorage from "@react-native-async-storage/async-storage";

const ONBOARDING_DONE_KEY = "daycall_onboarding_done";

// ============================================================================
// TYPES
// ============================================================================

export interface OnboardingAnswers {
    name: string;
    birthDate: string | null; // ISO date string YYYY-MM-DD
    gender: string | null;
    journalingBefore: string | null;
    emotionalTraits: string[];
    whereHeard: string | null;
    callTimeHour: number | null; // 0–23, start of 1h window
}

// ============================================================================
// PERSISTENCE
// ============================================================================

export async function getOnboardingDoneFromStorage(): Promise<boolean> {
    try {
        const value = await AsyncStorage.getItem(ONBOARDING_DONE_KEY);
        return value === "true";
    } catch {
        return false;
    }
}

export async function setOnboardingDoneInStorage(done: boolean): Promise<void> {
    try {
        if (done) {
            await AsyncStorage.setItem(ONBOARDING_DONE_KEY, "true");
        } else {
            await AsyncStorage.removeItem(ONBOARDING_DONE_KEY);
        }
    } catch {
        // Non-critical; onboarding state may not persist across restarts
    }
}

// ============================================================================
// STORE
// ============================================================================

interface OnboardingState {
    hasCompletedOnboarding: boolean;
    isHydrated: boolean;
    answers: OnboardingAnswers;
    setOnboardingComplete: () => Promise<void>;
    hydrateOnboardingDone: () => Promise<void>;
    setAnswer: <K extends keyof OnboardingAnswers>(
        key: K,
        value: OnboardingAnswers[K]
    ) => void;
    resetAnswers: () => void;
}

const initialAnswers: OnboardingAnswers = {
    name: "",
    birthDate: null,
    gender: null,
    journalingBefore: null,
    emotionalTraits: [],
    whereHeard: null,
    callTimeHour: null,
};

export const useOnboardingStore = create<OnboardingState>((set, get) => ({
    hasCompletedOnboarding: false,
    isHydrated: false,
    answers: { ...initialAnswers },

    setOnboardingComplete: async () => {
        await setOnboardingDoneInStorage(true);
        set({ hasCompletedOnboarding: true });
    },

    hydrateOnboardingDone: async () => {
        const done = await getOnboardingDoneFromStorage();
        set({ hasCompletedOnboarding: done, isHydrated: true });
    },

    setAnswer: (key, value) => {
        set((state) => ({
            answers: { ...state.answers, [key]: value },
        }));
    },

    resetAnswers: () => set({ answers: { ...initialAnswers } }),
}));
