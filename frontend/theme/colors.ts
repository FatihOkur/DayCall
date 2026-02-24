/**
 * Theme-aware color tokens
 */

export type ThemeColors = {
    bg: string;
    bgSecondary: string;
    sidebarBg: string;
    surface: string;
    textPrimary: string;
    textSecondary: string;
    textMuted: string;
    accentPrimary: string;
    accentHover: string;
    border: string;
    borderSubtle: string;
    inputBg: string;
    codeBg: string;
    userMessageBg: string;
    assistantMessageBg: string;
    buttonPrimaryBg: string;
    buttonPrimaryText: string;
    link: string;
    success: string;
    error: string;
    warning: string;
};

export const themeColorsLight: ThemeColors = {
    bg: "#FAF9F5",
    bgSecondary: "#F0EDE6",
    sidebarBg: "#EEEBE3",
    surface: "#FFFFFF",
    textPrimary: "#1F1E1D",
    textSecondary: "#6B6863",
    textMuted: "#9A9690",
    accentPrimary: "#C96442",
    accentHover: "#B5502F",
    border: "#E2DDD6",
    borderSubtle: "#EDEBE5",
    inputBg: "#FFFFFF",
    codeBg: "#F3F0EA",
    userMessageBg: "#EDE9E0",
    assistantMessageBg: "transparent",
    buttonPrimaryBg: "#C96442",
    buttonPrimaryText: "#FFFFFF",
    link: "#1C6BBB",
    success: "#3D8B5E",
    error: "#C0392B",
    warning: "#D4720E",
};

export const themeColorsDark: ThemeColors = {
    bg: "#1A1915",
    bgSecondary: "#22201C",
    sidebarBg: "#141311",
    surface: "#2A2723",
    textPrimary: "#E8E4DC",
    textSecondary: "#A09C94",
    textMuted: "#6B6760",
    accentPrimary: "#D97757",
    accentHover: "#E8865F",
    border: "#36332D",
    borderSubtle: "#2E2B26",
    inputBg: "#2A2723",
    codeBg: "#1E1C18",
    userMessageBg: "#2D2A24",
    assistantMessageBg: "transparent",
    buttonPrimaryBg: "#D97757",
    buttonPrimaryText: "#FFFFFF",
    link: "#6AABDE",
    success: "#57A87A",
    error: "#E05C52",
    warning: "#E09340",
};
