/**
 * Terracotta Design System -- color tokens.
 * Single source of truth. Never hardcode a hex value elsewhere.
 */

const terracotta = {
    accent: "#C4622A",
    accentHover: "#D4742A",
    accentPress: "#A84E1E",
    accentShadow: "#6A2808",
    accentGlow: "rgba(196, 98, 42, 0.28)",
};

export const darkTheme = {
    // -- BACKGROUNDS --
    bgBase: "#160A06",
    bgSurface: "#241208",
    bgRaised: "#301808",

    // -- ACCENT --
    ...terracotta,

    // -- TEXT --
    textPrimary: "#F0C090",
    textSecondary: "#9A6040",
    textMuted: "#5A3020",

    // -- BORDERS --
    borderSubtle: "rgba(190, 80, 30, 0.18)",
    borderMedium: "rgba(190, 80, 30, 0.32)",

    // -- SEMANTIC --
    error: "#DC2626",
    errorBg: "rgba(220, 38, 38, 0.12)",
    errorBorder: "rgba(220, 38, 38, 0.3)",
    success: "#2D6A4F",
    successBg: "rgba(45, 106, 79, 0.15)",

    // -- INPUTS / CONTROLS --
    inputBg: "#301808",
    switchTrackOff: "rgba(190, 80, 30, 0.25)",
    buttonPrimaryText: "#FFFFFF",

    // -- CANDLE FEATURE --
    candleFlameTop: "#FFA040",
    candleFlameBottom: "#FF3500",
    candleBody: "#7A5030",
    candleBodyDark: "#402010",

    // -- VOICE RING --
    voiceRingCore: "#D07040",
    voiceRingGlow: "rgba(208, 112, 64, 0.3)",

    // -- PATH NODES --
    nodeDefault: "#301808",
    nodeBorder: "rgba(190, 80, 30, 0.45)",
    nodeActive: "#C4622A",
    nodeConnector: "rgba(180, 70, 20, 0.25)",

    // -- SPEECH BUBBLE --
    speechBubbleBg: "#241208",
};

export type Theme = typeof darkTheme;

export const lightTheme: Theme = {
    // -- BACKGROUNDS --
    bgBase: "#F5EAE0",
    bgSurface: "#EDD5C0",
    bgRaised: "#E4C4A8",

    // -- ACCENT --
    ...terracotta,
    accentShadow: "#7A3010",

    // -- TEXT --
    textPrimary: "#6B2D14",
    textSecondary: "#9A6040",
    textMuted: "#C4A080",

    // -- BORDERS --
    borderSubtle: "rgba(160, 70, 30, 0.15)",
    borderMedium: "rgba(160, 70, 30, 0.28)",

    // -- SEMANTIC --
    error: "#DC2626",
    errorBg: "#FEF2F2",
    errorBorder: "#FECACA",
    success: "#2D6A4F",
    successBg: "#D8F3DC",

    // -- INPUTS / CONTROLS --
    inputBg: "#E4C4A8",
    switchTrackOff: "#D5C0AA",
    buttonPrimaryText: "#FFFFFF",

    // -- CANDLE FEATURE --
    candleFlameTop: "#FFB040",
    candleFlameBottom: "#FF4000",
    candleBody: "#C87848",
    candleBodyDark: "#9A5028",

    // -- VOICE RING --
    voiceRingCore: "#B84820",
    voiceRingGlow: "rgba(184, 72, 32, 0.25)",

    // -- PATH NODES --
    nodeDefault: "#F0D0B8",
    nodeBorder: "#B84820",
    nodeActive: "#B84820",
    nodeConnector: "rgba(160, 60, 20, 0.2)",

    // -- SPEECH BUBBLE --
    speechBubbleBg: "#EDD5C0",
};
