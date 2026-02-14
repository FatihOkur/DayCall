/**
 * DayCall — Global State Store (Zustand)
 *
 * Central state management for auth, journal entries, and voice session status.
 * Each slice is defined separately for clarity; they share a single store.
 */

import { create } from "zustand";

// ============================================================================
// TYPES
// ============================================================================

export interface User {
    id: string;
    email: string;
    displayName: string | null;
    notificationHour: number;
    notificationMinute: number;
    timezone: string;
}

export interface JournalEntry {
    id: string;
    transcript: string | null;
    summary: string | null;
    moodScore: number | null;
    moodLabel: string | null;
    durationSeconds: number | null;
    audioFilePath: string | null;
    createdAt: string;
}

export type VoiceSessionStatus = "idle" | "connecting" | "active" | "processing";

// ============================================================================
// STORE
// ============================================================================

interface AppState {
    // Auth
    user: User | null;
    token: string | null;
    setAuth: (user: User, token: string) => void;
    clearAuth: () => void;

    // Journal
    entries: JournalEntry[];
    setEntries: (entries: JournalEntry[]) => void;
    addEntry: (entry: JournalEntry) => void;

    // Voice Session
    voiceStatus: VoiceSessionStatus;
    setVoiceStatus: (status: VoiceSessionStatus) => void;
}

export const useAppStore = create<AppState>((set) => ({
    // Auth
    user: null,
    token: null,
    setAuth: (user, token) => set({ user, token }),
    clearAuth: () => set({ user: null, token: null }),

    // Journal
    entries: [],
    setEntries: (entries) => set({ entries }),
    addEntry: (entry) =>
        set((state) => ({ entries: [entry, ...state.entries] })),

    // Voice Session
    voiceStatus: "idle",
    setVoiceStatus: (voiceStatus) => set({ voiceStatus }),
}));
