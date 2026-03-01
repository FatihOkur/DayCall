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
import { ThemeProvider, useTheme } from "../theme";

function RootLayoutInner() {
    const { theme, isDark } = useTheme();
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

    useEffect(() => {
        restoreSession();
    }, []);

    useEffect(() => {
        hydrateOnboardingDone();
    }, []);

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

    if (!fontsLoaded || !isOnboardingHydrated || isLoading) {
        return (
            <View
                style={{
                    flex: 1,
                    justifyContent: "center",
                    alignItems: "center",
                    backgroundColor: theme.bgBase,
                }}
            >
                <StatusBar style={isDark ? "light" : "dark"} />
                <ActivityIndicator size="large" color={theme.accent} />
            </View>
        );
    }

    return (
        <>
            <StatusBar style={isDark ? "light" : "dark"} />
            <Stack
                screenOptions={{
                    headerShown: false,
                    contentStyle: { backgroundColor: theme.bgBase },
                }}
            />
        </>
    );
}

/**
 * Root layout -- wraps entire app in ThemeProvider.
 */
export default function RootLayout() {
    return (
        <ThemeProvider>
            <RootLayoutInner />
        </ThemeProvider>
    );
}
