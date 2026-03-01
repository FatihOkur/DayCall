/**
 * Primary button -- gradient fill, native glow shadow, bottom edge, spring press.
 * One per screen. The core CTA.
 */

import React from "react";
import { Pressable, Text, View, StyleSheet } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import Animated, {
    useAnimatedStyle,
    useSharedValue,
    withSpring,
} from "react-native-reanimated";
import { useTheme, springs } from "../../theme";

const AnimatedView = Animated.createAnimatedComponent(View);

interface Props {
    label: string;
    onPress: () => void;
    disabled?: boolean;
}

export function PrimaryButton({ label, onPress, disabled }: Props) {
    const { theme } = useTheme();
    const pressed = useSharedValue(false);

    const animatedStyle = useAnimatedStyle(() => ({
        transform: [
            { translateY: withSpring(pressed.value ? 4 : 0, springs.bouncy) },
            { scale: withSpring(pressed.value ? 0.97 : 1, springs.bouncy) },
        ],
    }));

    return (
        <View style={styles.wrapper}>
            <View
                style={[
                    styles.bottomEdge,
                    { backgroundColor: theme.accentShadow, zIndex: 0 },
                ]}
            />

            <View
                style={[
                    styles.shadowWrap,
                    {
                        shadowColor: theme.accentShadow,
                        backgroundColor: "transparent",
                    },
                ]}
            >
                <AnimatedView style={[animatedStyle, { zIndex: 1 }]}>
                    <Pressable
                        onPressIn={() => { pressed.value = true; }}
                        onPressOut={() => { pressed.value = false; }}
                        onPress={onPress}
                        disabled={disabled}
                    >
                        <LinearGradient
                            colors={[theme.accentHover, theme.accentPress]}
                            start={{ x: 0, y: 0 }}
                            end={{ x: 0, y: 1 }}
                            style={[
                                styles.gradient,
                                { opacity: disabled ? 0.5 : 1 },
                            ]}
                        >
                            <Text style={[styles.label, { color: theme.buttonPrimaryText }]}>
                                {label}
                            </Text>
                        </LinearGradient>
                    </Pressable>
                </AnimatedView>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    wrapper: {
        position: "relative",
    },
    bottomEdge: {
        position: "absolute",
        bottom: -4,
        left: 0,
        right: 0,
        height: "100%",
        borderRadius: 16,
    },
    shadowWrap: {
        borderRadius: 16,
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.45,
        shadowRadius: 12,
        elevation: 8,
    },
    gradient: {
        paddingVertical: 16,
        paddingHorizontal: 24,
        borderRadius: 16,
        alignItems: "center",
    },
    label: {
        fontSize: 15,
        fontFamily: "Nunito_700Bold",
        fontWeight: "700",
        letterSpacing: 1.2,
        textTransform: "uppercase",
    },
});
