/**
 * Theme context -- system / dark / light with AsyncStorage persistence.
 */

import React, { createContext, useContext, useState, useEffect, useCallback } from "react";
import { useColorScheme } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { darkTheme, lightTheme, type Theme } from "./colors";

export type ThemeMode = "system" | "dark" | "light";

const STORAGE_KEY = "themeMode";

interface ThemeContextValue {
    theme: Theme;
    isDark: boolean;
    themeMode: ThemeMode;
    setThemeMode: (mode: ThemeMode) => void;
}

const ThemeContext = createContext<ThemeContextValue>({
    theme: darkTheme,
    isDark: true,
    themeMode: "system",
    setThemeMode: () => {},
});

export function ThemeProvider({ children }: { children: React.ReactNode }) {
    const systemScheme = useColorScheme();
    // Default to dark mode for now, this should be changed to system in the next build.
    const [themeMode, setThemeModeState] = useState<ThemeMode>("dark");
    const [hydrated, setHydrated] = useState(false);

    useEffect(() => {
        AsyncStorage.getItem(STORAGE_KEY).then((saved) => {
            if (saved === "dark" || saved === "light" || saved === "system") {
                setThemeModeState(saved);
            }
            setHydrated(true);
        });
    }, []);

    const setThemeMode = useCallback((mode: ThemeMode) => {
        setThemeModeState(mode);
        AsyncStorage.setItem(STORAGE_KEY, mode);
    }, []);

    const resolvedDark =
        themeMode === "system" ? systemScheme === "dark" : themeMode === "dark";

    const theme = resolvedDark ? darkTheme : lightTheme;

    if (!hydrated) return null;

    return (
        <ThemeContext.Provider
            value={{ theme, isDark: resolvedDark, themeMode, setThemeMode }}
        >
            {children}
        </ThemeContext.Provider>
    );
}

export function useTheme() {
    return useContext(ThemeContext);
}
