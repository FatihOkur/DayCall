/**
 * Ember Design System -- color tokens.
 * Single source of truth. Never hardcode a hex value elsewhere.
 */

const ember = {
    accent: "#FF5C00",
    accentHover: "#FF6B00",
    accentPress: "#FF3800",
    accentShadow: "#9E2000",
    accentGlow: "rgba(255, 92, 0, 0.28)",
};

export const darkTheme = {
    // -- BACKGROUNDS --
    bgBase: "#1C0800",
    bgSurface: "#2D0F00",
    bgRaised: "#3D1500",

    // -- ACCENT --
    ...ember,

    // -- TEXT --
    textPrimary: "#FFCF80",
    textSecondary: "#CC8050",
    textMuted: "#7A4030",

    // -- BORDERS --
    borderSubtle: "rgba(255, 90, 0, 0.2)",
    borderMedium: "rgba(255, 90, 0, 0.35)",

    // -- SEMANTIC --
    error: "#DC2626",
    errorBg: "rgba(220, 38, 38, 0.12)",
    errorBorder: "rgba(220, 38, 38, 0.3)",
    success: "#2D6A4F",
    successBg: "rgba(45, 106, 79, 0.15)",

    // -- INPUTS / CONTROLS --
    inputBg: "#3D1500",
    switchTrackOff: "rgba(255, 90, 0, 0.25)",
    buttonPrimaryText: "#FFFFFF",

    // -- CANDLE FEATURE --
    candleFlameTop: "#FF9500",
    candleFlameBottom: "#FF2000",
    candleBody: "#8B4513",
    candleBodyDark: "#5C2E00",

    // -- VOICE RING --
    voiceRingCore: "#FF7040",
    voiceRingGlow: "rgba(255, 112, 64, 0.3)",

    // -- PATH NODES --
    nodeDefault: "#3D1500",
    nodeBorder: "rgba(255, 90, 0, 0.45)",
    nodeActive: "#FF5C00",
    nodeConnector: "rgba(255, 70, 0, 0.25)",

    // -- SPEECH BUBBLE --
    speechBubbleBg: "#2D0F00",
};

export type Theme = typeof darkTheme;

export const lightTheme: Theme = {
    // -- BACKGROUNDS --
    bgBase: "#FFF3EA",
    bgSurface: "#FFE5CC",
    bgRaised: "#FFD4B0",

    // -- ACCENT --
    ...ember,
    accent: "#C84A10",
    accentHover: "#D45A18",
    accentPress: "#A83A08",
    accentShadow: "#8B2000",
    accentGlow: "rgba(200, 74, 16, 0.25)",

    // -- TEXT --
    textPrimary: "#6B2010",
    textSecondary: "#A05030",
    textMuted: "#C4906A",

    // -- BORDERS --
    borderSubtle: "rgba(200, 74, 16, 0.15)",
    borderMedium: "rgba(200, 74, 16, 0.28)",

    // -- SEMANTIC --
    error: "#DC2626",
    errorBg: "#FEF2F2",
    errorBorder: "#FECACA",
    success: "#2D6A4F",
    successBg: "#D8F3DC",

    // -- INPUTS / CONTROLS --
    inputBg: "#FFD4B0",
    switchTrackOff: "#F0C090",
    buttonPrimaryText: "#FFFFFF",

    // -- CANDLE FEATURE --
    candleFlameTop: "#FFB700",
    candleFlameBottom: "#FF6A00",
    candleBody: "#D2691E",
    candleBodyDark: "#A0522D",

    // -- VOICE RING --
    voiceRingCore: "#C84A10",
    voiceRingGlow: "rgba(200, 74, 16, 0.25)",

    // -- PATH NODES --
    nodeDefault: "#FFDEC8",
    nodeBorder: "#C84A10",
    nodeActive: "#C84A10",
    nodeConnector: "rgba(180, 60, 10, 0.2)",

    // -- SPEECH BUBBLE --
    speechBubbleBg: "#FFE5CC",
};