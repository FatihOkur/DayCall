/**
 * Mascot placeholder — dummy figure for onboarding.
 * Swap for Rive when the mascot file is ready; keep the same props.
 */

import { View, Text, StyleSheet } from "react-native";
import { useThemeColors } from "../../theme";

export type MascotVariant = "hero" | "compact";

interface MascotProps {
    variant: MascotVariant;
}

export function Mascot({ variant }: MascotProps) {
    const colors = useThemeColors();
    const isHero = variant === "hero";

    return (
        <View
            style={[
                styles.base,
                isHero ? styles.hero : styles.compact,
                { backgroundColor: colors.surface, borderColor: colors.border },
            ]}
        >
            <Text style={[isHero ? styles.faceHero : styles.faceCompact, { color: colors.textPrimary }]}>
                {isHero ? "Fio" : "F"}
            </Text>
            {isHero && (
                <Text style={[styles.label, { color: colors.textMuted }]}>Fio</Text>
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    base: {
        borderRadius: 9999,
        borderWidth: 2,
        justifyContent: "center",
        alignItems: "center",
    },
    hero: {
        width: 120,
        height: 120,
    },
    compact: {
        width: 48,
        height: 48,
    },
    faceHero: {
        fontSize: 56,
    },
    faceCompact: {
        fontSize: 28,
    },
    label: {
        position: "absolute",
        bottom: -20,
        fontSize: 12,
        fontWeight: "600",
    },
});
