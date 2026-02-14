/**
 * DayCall — API Client
 *
 * Central API layer for communicating with the FastAPI backend.
 * All endpoints go through `apiRequest` which auto-injects the JWT token.
 */

import { useAppStore } from "../store/useAppStore";
import { Platform } from "react-native";

// Android emulator uses 10.0.2.2 to reach host, iOS sim / web use localhost
const getBaseUrl = () => {
    if (Platform.OS === "android") return "http://10.0.2.2:8000";
    return "http://localhost:8000";
};

export const API_BASE_URL = getBaseUrl();

// ============================================================================
// GENERIC REQUEST HELPER
// ============================================================================

interface ApiError {
    detail: string;
}

export async function apiRequest<T>(
    endpoint: string,
    options: RequestInit = {}
): Promise<T> {
    const token = useAppStore.getState().token;

    const headers: Record<string, string> = {
        "Content-Type": "application/json",
        ...((options.headers as Record<string, string>) || {}),
    };

    if (token) {
        headers["Authorization"] = `Bearer ${token}`;
    }

    const res = await fetch(`${API_BASE_URL}${endpoint}`, {
        ...options,
        headers,
    });

    if (!res.ok) {
        const body: ApiError = await res.json().catch(() => ({
            detail: `Request failed (${res.status})`,
        }));
        throw new Error(body.detail);
    }

    return res.json() as Promise<T>;
}

// ============================================================================
// AUTH API
// ============================================================================

interface TokenResponse {
    access_token: string;
    token_type: string;
}

interface UserResponse {
    id: string;
    email: string;
    display_name: string | null;
    notification_hour: number;
    notification_minute: number;
    timezone: string;
    created_at: string;
}

export const authApi = {
    register: (email: string, password: string, displayName?: string) =>
        apiRequest<TokenResponse>("/auth/register", {
            method: "POST",
            body: JSON.stringify({ email, password, display_name: displayName }),
        }),

    login: (email: string, password: string) =>
        apiRequest<TokenResponse>("/auth/login", {
            method: "POST",
            body: JSON.stringify({ email, password }),
        }),

    getMe: (token: string) =>
        apiRequest<UserResponse>("/auth/me", {
            headers: { Authorization: `Bearer ${token}` },
        }),
};
