/**
 * DayCall — Global State Store (Zustand)
 *
 * Central state management for auth, journal entries, and voice session status.
 * Auth actions integrate with the API and Expo SecureStore for persistence.
 */

import { create } from "zustand";
import * as SecureStore from "expo-secure-store";
import { Platform } from "react-native";
import { authApi } from "../services/api";

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
// SECURE STORE HELPERS (web fallback to localStorage)
// ============================================================================

const TOKEN_KEY = "daycall_token";

async function saveToken(token: string) {
    if (Platform.OS === "web") {
        localStorage.setItem(TOKEN_KEY, token);
    } else {
        await SecureStore.setItemAsync(TOKEN_KEY, token);
    }
}

async function getToken(): Promise<string | null> {
    if (Platform.OS === "web") {
        return localStorage.getItem(TOKEN_KEY);
    }
    return SecureStore.getItemAsync(TOKEN_KEY);
}

async function deleteToken() {
    if (Platform.OS === "web") {
        localStorage.removeItem(TOKEN_KEY);
    } else {
        await SecureStore.deleteItemAsync(TOKEN_KEY);
    }
}

// ============================================================================
// STORE
// ============================================================================

interface AppState {
    // Auth
    user: User | null;
    token: string | null;
    isLoading: boolean;
    setAuth: (user: User, token: string) => void;
    clearAuth: () => void;

    // Auth actions (API + SecureStore)
    login: (email: string, password: string) => Promise<void>;
    register: (email: string, password: string) => Promise<void>;
    logout: () => Promise<void>;
    restoreSession: () => Promise<void>;

    // Journal
    entries: JournalEntry[];
    setEntries: (entries: JournalEntry[]) => void;
    addEntry: (entry: JournalEntry) => void;

    // Voice Session
    voiceStatus: VoiceSessionStatus;
    setVoiceStatus: (status: VoiceSessionStatus) => void;
}

/** Map backend snake_case user response to camelCase store User */
function mapUser(data: any): User {
    return {
        id: data.id,
        email: data.email,
        displayName: data.display_name,
        notificationHour: data.notification_hour,
        notificationMinute: data.notification_minute,
        timezone: data.timezone,
    };
}

export const useAppStore = create<AppState>((set, get) => ({
    // Auth
    user: null,
    token: null,
    isLoading: true, // starts true — loading until restoreSession completes

    setAuth: (user, token) => set({ user, token }),
    clearAuth: () => set({ user: null, token: null }),

    login: async (email, password) => {
        const { access_token } = await authApi.login(email, password);
        await saveToken(access_token);
        set({ token: access_token });

        const userData = await authApi.getMe(access_token);
        set({ user: mapUser(userData) });
    },

    register: async (email, password) => {
        const { access_token } = await authApi.register(email, password);
        await saveToken(access_token);
        set({ token: access_token });

        const userData = await authApi.getMe(access_token);
        set({ user: mapUser(userData) });
    },

    logout: async () => {
        await deleteToken();
        set({ user: null, token: null });
    },

    restoreSession: async () => {
        try {
            const token = await getToken();
            if (!token) {
                set({ isLoading: false });
                return;
            }
            set({ token });
            const userData = await authApi.getMe(token);
            set({ user: mapUser(userData), isLoading: false });
        } catch {
            // Token expired or invalid — clear everything
            await deleteToken();
            set({ user: null, token: null, isLoading: false });
        }
    },

    // Journal
    entries: [],
    setEntries: (entries) => set({ entries }),
    addEntry: (entry) =>
        set((state) => ({ entries: [entry, ...state.entries] })),

    // Voice Session
    voiceStatus: "idle",
    setVoiceStatus: (voiceStatus) => set({ voiceStatus }),
}));
