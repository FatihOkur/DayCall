/**
 * Mascot — displays Fio as a gif (idle.gif).
 * Asset: frontend/assets/gifs/idle.gif
 */

import { View, Image, StyleSheet } from "react-native";

export type MascotVariant = "hero" | "compact";

interface MascotProps {
    variant: MascotVariant;
}

const idleGif = require("../../assets/gifs/idle.gif");

export function Mascot({ variant }: MascotProps) {
    const isHero = variant === "hero";

    return (
        <View style={[styles.base, isHero ? styles.hero : styles.compact]}>
            <Image
                source={idleGif}
                style={isHero ? styles.imageHero : styles.imageCompact}
                resizeMode="contain"
            />
        </View>
    );
}

const styles = StyleSheet.create({
    base: {
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
    imageHero: {
        width: 120,
        height: 120,
    },
    imageCompact: {
        width: 48,
        height: 48,
    },
});
