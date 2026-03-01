/**
 * Onboarding -- single route, step index + registry.
 * On completion: set onboarding done, then replace to login or tabs.
 */

import { useState, useEffect } from "react";
import {
    View,
    Text,
    Pressable,
    StyleSheet,
    Keyboard,
    TouchableWithoutFeedback,
    useWindowDimensions,
    Platform,
} from "react-native";
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
import { useTheme } from "../theme";
import { PrimaryButton } from "../components/buttons/PrimaryButton";
import { ScreenBackground } from "../components/ScreenBackground";

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
    const { theme } = useTheme();
    const { height: windowHeight } = useWindowDimensions();
    const router = useRouter();
    const [stepIndex, setStepIndex] = useState(0);
    const [keyboardVisible, setKeyboardVisible] = useState(false);
    const answers = useOnboardingStore((s) => s.answers);
    const setOnboardingComplete = useOnboardingStore((s) => s.setOnboardingComplete);
    const user = useAppStore((s) => s.user);

    const stepId = ONBOARDING_STEP_IDS[stepIndex];
    const isNameStep = stepId === "name";
    const isLastStep = stepIndex === ONBOARDING_STEP_IDS.length - 1;
    const canAdvance = canAdvanceStep(stepId, answers);
    const StepComponent = STEP_REGISTRY[stepId];
    const nextLabel = STEP_NEXT_LABEL[stepId];

    useEffect(() => {
        const showSub = Keyboard.addListener(
            Platform.OS === "ios" ? "keyboardWillShow" : "keyboardDidShow",
            () => setKeyboardVisible(true)
        );
        const hideSub = Keyboard.addListener(
            Platform.OS === "ios" ? "keyboardWillHide" : "keyboardDidHide",
            () => setKeyboardVisible(false)
        );
        return () => {
            showSub.remove();
            hideSub.remove();
        };
    }, []);

    const liftFooterForKeyboard = isNameStep && keyboardVisible;
    const footerStyle = liftFooterForKeyboard
        ? [
            styles.footer,
            {
                position: "absolute" as const,
                top: windowHeight * 0.55,
                left: 16,
                right: 16,
            },
        ]
        : styles.footer;

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

    return (
        <ScreenBackground>
            <SafeAreaView style={styles.safe}>
                {/* Header: back arrow + progress bar */}
                <View style={styles.header}>
                    {stepIndex > 0 ? (
                        <Pressable
                            onPress={handleBack}
                            hitSlop={12}
                            style={styles.backButton}
                        >
                            <Text style={[styles.backArrow, { color: theme.textPrimary }]}>
                                {"\u2190"}
                            </Text>
                        </Pressable>
                    ) : (
                        <View style={styles.backPlaceholder} />
                    )}

                    <View style={[styles.progressWrap, { backgroundColor: theme.borderSubtle }]}>
                        <View
                            style={[
                                styles.progressBar,
                                {
                                    width: `${((stepIndex + 1) / ONBOARDING_STEP_IDS.length) * 100}%`,
                                    backgroundColor: theme.accent,
                                },
                            ]}
                        />
                    </View>

                    <View style={styles.backPlaceholder} />
                </View>

                {/* Step content — tap blank area to dismiss keyboard */}
                <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
                    <View style={styles.content}>
                        {StepComponent && <StepComponent />}
                    </View>
                </TouchableWithoutFeedback>

                {/* Bottom button — lifts to 60% when keyboard open on name step */}
                <View style={footerStyle}>
                    <PrimaryButton
                        label={nextLabel}
                        onPress={handleNext}
                        disabled={!canAdvance}
                    />
                </View>
            </SafeAreaView>
        </ScreenBackground>
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
        paddingBottom: 8,
    },
});
