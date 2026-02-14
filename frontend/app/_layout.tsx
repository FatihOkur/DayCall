import "../global.css";

import { useEffect } from "react";
import { ActivityIndicator, View } from "react-native";
import { Stack, useRouter, useSegments } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useAppStore } from "../store/useAppStore";

/**
 * Root layout — wraps the entire app.
 * Handles auth gating: redirects to /login if not authenticated,
 * or to /(tabs) if already logged in.
 */
export default function RootLayout() {
    const user = useAppStore((s) => s.user);
    const isLoading = useAppStore((s) => s.isLoading);
    const restoreSession = useAppStore((s) => s.restoreSession);
    const router = useRouter();
    const segments = useSegments();

    // Restore session on app launch
    useEffect(() => {
        restoreSession();
    }, []);

    // Auth gating — redirect based on auth state
    useEffect(() => {
        if (isLoading) return;

        const inAuthScreen = segments[0] === "login";

        if (!user && !inAuthScreen) {
            router.replace("/login");
        } else if (user && inAuthScreen) {
            router.replace("/(tabs)");
        }
    }, [user, isLoading, segments]);

    // Show loading screen while restoring session
    if (isLoading) {
        return (
            <View
                style={{
                    flex: 1,
                    justifyContent: "center",
                    alignItems: "center",
                    backgroundColor: "#F5F2EB",
                }}
            >
                <StatusBar style="dark" />
                <ActivityIndicator size="large" color="#DA7756" />
            </View>
        );
    }

    return (
        <>
            <StatusBar style="dark" />
            <Stack
                screenOptions={{
                    headerShown: false,
                    contentStyle: { backgroundColor: "#F5F2EB" },
                }}
            />
        </>
    );
}
