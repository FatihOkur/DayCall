/**
 * Theme module — semantic color tokens and theme-aware hook.
 * Import colors from here; do not hardcode hex values in components.
 */

import { useColorScheme } from "react-native";
import {
    themeColorsLight,
    themeColorsDark,
    type ThemeColors,
} from "./colors";

export { themeColorsLight, themeColorsDark };
export type { ThemeColors };

/**
 * Returns the current theme colors based on system light/dark preference.
 * Use this in components so UI adapts to light and dark theme.
 */
export function useThemeColors(): ThemeColors {
    const colorScheme = useColorScheme();
    return colorScheme === "dark" ? themeColorsDark : themeColorsLight;
}
