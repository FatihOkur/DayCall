/**
 * Layout for narrative onboarding screens: hero mascot + speech bubble.
 */

import { useEffect, useRef } from "react";
import { View, Text, StyleSheet, Animated } from "react-native";
import { Mascot } from "../Mascot";
import { useThemeColors } from "../../../theme";

interface NarrativeStepLayoutProps {
    message: string;
}

export function NarrativeStepLayout({ message }: NarrativeStepLayoutProps) {
    const colors = useThemeColors();
    const opacity = useRef(new Animated.Value(0)).current;

    useEffect(() => {
        Animated.timing(opacity, {
            toValue: 1,
            duration: 400,
            useNativeDriver: true,
        }).start();
    }, []);

    return (
        <View style={styles.container}>
            <Mascot variant="hero" />
            <Animated.View
                style={[
                    styles.bubble,
                    {
                        backgroundColor: colors.speechBubbleBg,
                        borderColor: colors.border,
                    },
                    { opacity },
                ]}
            >
                <Text style={[styles.bubbleText, { color: colors.textPrimary }]}>
                    {message}
                </Text>
            </Animated.View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        justifyContent: "center",
        alignItems: "center",
        paddingHorizontal: 24,
    },
    bubble: {
        marginTop: 24,
        paddingHorizontal: 20,
        paddingVertical: 16,
        borderRadius: 20,
        borderWidth: 1,
        maxWidth: "100%",
    },
    bubbleText: {
        fontSize: 17,
        lineHeight: 24,
        textAlign: "center",
    },
});
