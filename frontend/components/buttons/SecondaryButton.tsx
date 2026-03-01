/**
 * Secondary button -- semi-transparent fill + border, scale+opacity spring.
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

export function SecondaryButton({ label, onPress }: Props) {
    const { theme } = useTheme();
    const pressed = useSharedValue(false);

    const animatedStyle = useAnimatedStyle(() => ({
        transform: [
            { scale: withSpring(pressed.value ? 0.97 : 1, springs.snappy) },
        ],
        opacity: withSpring(pressed.value ? 0.7 : 1, springs.snappy),
    }));

    return (
        <AnimatedPressable
            onPressIn={() => { pressed.value = true; }}
            onPressOut={() => { pressed.value = false; }}
            onPress={onPress}
            style={[
                animatedStyle,
                styles.base,
                {
                    backgroundColor: `${theme.accent}14`,
                    borderColor: theme.borderMedium,
                },
            ]}
        >
            <Text style={[styles.label, { color: theme.accent }]}>
                {label}
            </Text>
        </AnimatedPressable>
    );
}

const styles = StyleSheet.create({
    base: {
        borderWidth: 2,
        borderRadius: 16,
        paddingVertical: 12,
        paddingHorizontal: 22,
        alignItems: "center",
    },
    label: {
        fontWeight: "600",
        fontSize: 15,
    },
});
