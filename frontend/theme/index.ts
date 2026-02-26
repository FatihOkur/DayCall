/**
 * Theme module — semantic color tokens and theme-aware hook.
 * Import colors from here; do not hardcode hex values in components.
 */

import {
    themeColorsLight,
    themeColorsDark,
    type ThemeColors,
} from "./colors";

export { themeColorsLight, themeColorsDark };
export type { ThemeColors };

/**
 * Returns the current theme colors.
 * TODO: Currently forced to dark mode. Swap to useColorScheme() when user toggle is added.
 */
export function useThemeColors(): ThemeColors {
    return themeColorsDark;
}
