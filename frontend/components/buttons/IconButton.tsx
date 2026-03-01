/**
 * Icon button -- circular, compact. Mic toggle, candle, back arrow.
 */

import React from "react";
import { Pressable, StyleSheet } from "react-native";
import { Shadow } from "react-native-shadow-2";
import Animated, {
    useAnimatedStyle,
    useSharedValue,
    withSpring,
} from "react-native-reanimated";
import { useTheme, springs } from "../../theme";

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

interface Props {
    icon: React.ReactNode;
    onPress: () => void;
    active?: boolean;
    size?: number;
}

export function IconButton({ icon, onPress, active = false, size = 48 }: Props) {
    const { theme } = useTheme();
    const pressed = useSharedValue(false);

    const animatedStyle = useAnimatedStyle(() => ({
        transform: [
            { scale: withSpring(pressed.value ? 0.88 : 1, springs.bouncy) },
        ],
    }));

    return (
        <Shadow
            distance={active ? 8 : 3}
            startColor={active ? theme.accentGlow : "rgba(0,0,0,0.18)"}
            style={{ borderRadius: 999 }}
        >
            <AnimatedPressable
                onPressIn={() => { pressed.value = true; }}
                onPressOut={() => { pressed.value = false; }}
                onPress={onPress}
                style={[
                    animatedStyle,
                    styles.base,
                    {
                        width: size,
                        height: size,
                        borderRadius: size / 2,
                        backgroundColor: active ? theme.accent : theme.bgRaised,
                        borderColor: active ? "transparent" : theme.borderSubtle,
                    },
                ]}
            >
                {icon}
            </AnimatedPressable>
        </Shadow>
    );
}

const styles = StyleSheet.create({
    base: {
        borderWidth: 1.5,
        alignItems: "center",
        justifyContent: "center",
    },
});
