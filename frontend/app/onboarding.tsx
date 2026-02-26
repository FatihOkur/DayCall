/**
 * Onboarding — single route, step index + registry.
 * On completion: set onboarding done, then replace to login or tabs.
 */

import { useState } from "react";
import { View, Text, Pressable, StyleSheet } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import {
    ONBOARDING_STEP_IDS,
    STEP_NEXT_LABEL,
    type OnboardingStepId,
} from "../features/onboarding/steps/config";
import { STEP_REGISTRY } from "../features/onboarding/steps/registry";
import { useOnboardingStore } from "../features/onboarding/onboardingStore";
import { useAppStore } from "../store/useAppStore";
import { useThemeColors } from "../theme";

function canAdvanceStep(stepId: OnboardingStepId, answers: ReturnType<typeof useOnboardingStore.getState>["answers"]): boolean {
    switch (stepId) {
        case "welcome":
        case "journey":
        case "readyForQuestions":
        case "horoscope":
        case "emotionalTraits":
        case "committed":
            return true;
        case "name":
            return answers.name.trim().length > 0;
        case "birthDate":
            return answers.birthDate != null;
        case "gender":
            return answers.gender != null;
        case "journalingBefore":
            return answers.journalingBefore != null;
        case "whereHeard":
            return answers.whereHeard != null;
        case "callTime":
            return answers.callTimeHour != null;
        default:
            return true;
    }
}

export default function OnboardingScreen() {
    const colors = useThemeColors();
    const router = useRouter();
    const [stepIndex, setStepIndex] = useState(0);
    const [buttonPressed, setButtonPressed] = useState(false);
    const answers = useOnboardingStore((s) => s.answers);
    const setOnboardingComplete = useOnboardingStore((s) => s.setOnboardingComplete);
    const user = useAppStore((s) => s.user);

    const stepId = ONBOARDING_STEP_IDS[stepIndex];
    const isLastStep = stepIndex === ONBOARDING_STEP_IDS.length - 1;
    const canAdvance = canAdvanceStep(stepId, answers);
    const StepComponent = STEP_REGISTRY[stepId];
    const nextLabel = STEP_NEXT_LABEL[stepId];

    const handleBack = () => {
        if (stepIndex > 0) setStepIndex((i) => i - 1);
    };

    const handleNext = async () => {
        if (!canAdvance && stepId !== "committed") return;
        if (isLastStep) {
            await setOnboardingComplete();
            router.replace(user ? "/(tabs)" : "/login");
            return;
        }
        setStepIndex((i) => i + 1);
    };

    const buttonBgColor = canAdvance
        ? (buttonPressed ? colors.accentHover : colors.accentPrimary)
        : colors.border;
    const buttonBorderWidth = canAdvance && !buttonPressed ? 4 : 2;

    return (
        <SafeAreaView style={[styles.safe, { backgroundColor: colors.bg }]}>
            {/* Header: back arrow + progress bar */}
            <View style={styles.header}>
                {stepIndex > 0 ? (
                    <Pressable
                        onPress={handleBack}
                        hitSlop={12}
                        style={styles.backButton}
                    >
                        <Text style={[styles.backArrow, { color: colors.textPrimary }]}>
                            {"\u2190"}
                        </Text>
                    </Pressable>
                ) : (
                    <View style={styles.backPlaceholder} />
                )}

                <View style={[styles.progressWrap, { backgroundColor: colors.borderSubtle }]}>
                    <View
                        style={[
                            styles.progressBar,
                            {
                                width: `${((stepIndex + 1) / ONBOARDING_STEP_IDS.length) * 100}%`,
                                backgroundColor: colors.accentPrimary,
                            },
                        ]}
                    />
                </View>

                <View style={styles.backPlaceholder} />
            </View>

            {/* Step content */}
            <View style={styles.content}>
                {StepComponent && <StepComponent />}
            </View>

            {/* Bottom button */}
            <View style={styles.footer}>
                <Pressable
                    onPress={handleNext}
                    onPressIn={() => setButtonPressed(true)}
                    onPressOut={() => setButtonPressed(false)}
                    disabled={!canAdvance}
                    style={styles.buttonOuter}
                >
                    <View
                        style={[
                            styles.button,
                            {
                                backgroundColor: buttonBgColor,
                                borderBottomColor: canAdvance ? colors.buttonPrimaryBorder : "transparent",
                                borderBottomWidth: canAdvance ? buttonBorderWidth : 0,
                                marginTop: buttonPressed && canAdvance ? 2 : 0,
                            },
                        ]}
                    >
                        <Text
                            style={[
                                styles.buttonText,
                                { color: canAdvance ? colors.buttonPrimaryText : colors.textMuted },
                            ]}
                        >
                            {nextLabel}
                        </Text>
                    </View>
                </Pressable>
            </View>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    safe: {
        flex: 1,
    },
    header: {
        flexDirection: "row",
        alignItems: "center",
        paddingHorizontal: 16,
        paddingVertical: 8,
        gap: 12,
    },
    backButton: {
        width: 32,
        height: 32,
        justifyContent: "center",
        alignItems: "center",
    },
    backArrow: {
        fontSize: 22,
    },
    backPlaceholder: {
        width: 32,
    },
    progressWrap: {
        flex: 1,
        height: 4,
        borderRadius: 2,
        overflow: "hidden",
    },
    progressBar: {
        height: "100%",
        borderRadius: 2,
    },
    content: {
        flex: 1,
    },
    footer: {
        paddingHorizontal: 16,
        paddingTop: 12,
    },
    buttonOuter: {
        width: "100%",
    },
    button: {
        borderRadius: 16,
        paddingVertical: 16,
        alignItems: "center",
        justifyContent: "center",
    },
    buttonText: {
        fontFamily: "Nunito_700Bold",
        fontSize: 15,
        fontWeight: "700",
        textTransform: "uppercase",
        letterSpacing: 1.5,
        textAlign: "center",
    },
});
