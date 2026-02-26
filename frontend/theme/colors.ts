/**
 * Theme-aware color tokens
 */

export type ThemeColors = {
    bg: string;
    surface: string;
    textPrimary: string;
    textMuted: string;
    accentPrimary: string;
    accentHover: string;
    border: string;
    borderSubtle: string;
    inputBg: string;
    /** Onboarding / mascot speech bubble background */
    speechBubbleBg: string;
    buttonPrimaryBg: string;
    /** Darker shade for 3D bottom edge on primary buttons */
    buttonPrimaryBorder: string;
    buttonPrimaryText: string;
};

export const themeColorsLight: ThemeColors = {
    bg: "#FAF9F5",
    surface: "#FFFFFF",
    textPrimary: "#1F1E1D",
    textMuted: "#9A9690",
    accentPrimary: "#DA7756",
    accentHover: "#C4603D",
    border: "#E2DDD6",
    borderSubtle: "#EDEBE5",
    inputBg: "#FFFFFF",
    speechBubbleBg: "#FFFFFF",
    buttonPrimaryBg: "#DA7756",
    buttonPrimaryBorder: "#B85A3A",
    buttonPrimaryText: "#FFFFFF",
};

export const themeColorsDark: ThemeColors = {
    bg: "#1A1915",
    surface: "#2A2723",
    textPrimary: "#E8E4DC",
    textMuted: "#6B6760",
    accentPrimary: "#DA7756",
    accentHover: "#E8956F",
    border: "#36332D",
    borderSubtle: "#2E2B26",
    inputBg: "#2A2723",
    speechBubbleBg: "#2A2723",
    buttonPrimaryBg: "#DA7756",
    buttonPrimaryBorder: "#B85A3A",
    buttonPrimaryText: "#FFFFFF",
};
