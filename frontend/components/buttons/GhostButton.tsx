/**
 * Ghost button -- escape hatch / low-priority. No background, fades on press.
 */

import React from "react";
import { Pressable, Text, StyleSheet } from "react-native";
import Animated, {
    useAnimatedStyle,
    useSharedValue,
    withSpring,
} from "react-native-reanimated";
import { useTheme, springs } from "../../theme";

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

interface Props {
    label: string;
    onPress: () => void;
}

export function GhostButton({ label, onPress }: Props) {
    const { theme } = useTheme();
    const pressed = useSharedValue(false);

    const animatedStyle = useAnimatedStyle(() => ({
        opacity: withSpring(pressed.value ? 0.4 : 1, springs.gentle),
        transform: [
            { scale: withSpring(pressed.value ? 0.95 : 1, springs.gentle) },
        ],
    }));

    return (
        <AnimatedPressable
            onPressIn={() => { pressed.value = true; }}
            onPressOut={() => { pressed.value = false; }}
            onPress={onPress}
            style={[animatedStyle, styles.base]}
        >
            <Text style={[styles.label, { color: theme.textMuted }]}>
                {label}
            </Text>
        </AnimatedPressable>
    );
}

const styles = StyleSheet.create({
    base: {
        paddingVertical: 12,
        paddingHorizontal: 20,
        alignItems: "center",
    },
    label: {
        fontWeight: "600",
        fontSize: 14,
    },
});
