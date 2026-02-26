import "../global.css";

import { useEffect } from "react";
import { ActivityIndicator, View } from "react-native";
import { Stack, useRouter, useSegments } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useFonts } from "expo-font";
import {
    Nunito_700Bold,
    Nunito_800ExtraBold,
} from "@expo-google-fonts/nunito";
import { useAppStore } from "../store/useAppStore";
import { useOnboardingStore } from "../features/onboarding/onboardingStore";
import { useThemeColors } from "../theme";

/**
 * Root layout — wraps the entire app.
 * Onboarding gating: redirect to /onboarding if not yet completed.
 * Auth gating: redirect to /login if not authenticated, or to /(tabs) if logged in.
 */
export default function RootLayout() {
    const colors = useThemeColors();
    const [fontsLoaded] = useFonts({
        Nunito_700Bold,
        Nunito_800ExtraBold,
    });
    const user = useAppStore((s) => s.user);
    const isLoading = useAppStore((s) => s.isLoading);
    const restoreSession = useAppStore((s) => s.restoreSession);
    const hasCompletedOnboarding = useOnboardingStore((s) => s.hasCompletedOnboarding);
    const isOnboardingHydrated = useOnboardingStore((s) => s.isHydrated);
    const hydrateOnboardingDone = useOnboardingStore((s) => s.hydrateOnboardingDone);
    const router = useRouter();
    const segments = useSegments();

    // Restore session and hydrate onboarding flag on app launch
    useEffect(() => {
        restoreSession();
    }, []);

    useEffect(() => {
        hydrateOnboardingDone();
    }, []);

    // Onboarding and auth gating — redirect based on state
    useEffect(() => {
        if (!isOnboardingHydrated || isLoading) return;

        const inOnboarding = segments[0] === "onboarding";
        const inAuthScreen = segments[0] === "login";

        if (!hasCompletedOnboarding && !inOnboarding) {
            router.replace("/onboarding");
            return;
        }

        if (!hasCompletedOnboarding) return;

        if (!user && !inAuthScreen) {
            router.replace("/login");
        } else if (user && inAuthScreen) {
            router.replace("/(tabs)");
        }
    }, [user, isLoading, hasCompletedOnboarding, isOnboardingHydrated, segments]);

    // Show loading until fonts, auth, and onboarding state are hydrated
    if (!fontsLoaded || !isOnboardingHydrated || isLoading) {
        return (
            <View
                style={[
                    {
                        flex: 1,
                        justifyContent: "center",
                        alignItems: "center",
                    },
                    { backgroundColor: colors.bg },
                ]}
            >
                <StatusBar style="light" />
                <ActivityIndicator size="large" color={colors.accentPrimary} />
            </View>
        );
    }

    return (
        <>
            <StatusBar style="light" />
            <Stack
                screenOptions={{
                    headerShown: false,
                    contentStyle: { backgroundColor: colors.bg },
                }}
            />
        </>
    );
}
