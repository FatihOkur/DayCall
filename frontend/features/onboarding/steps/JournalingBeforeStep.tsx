import { View, Text, Pressable, StyleSheet } from "react-native";
import { QAStepLayout } from "./QAStepLayout";
import { onboardingCopy } from "../copy";
import { useOnboardingStore } from "../onboardingStore";
import { useTheme } from "../../../theme";

const OPTIONS = [
    { key: "never", label: onboardingCopy.journalingNever },
    { key: "fewTimes", label: onboardingCopy.journalingFewTimes },
    { key: "sometimes", label: onboardingCopy.journalingSometimes },
    { key: "regularly", label: onboardingCopy.journalingRegularly },
    { key: "daily", label: onboardingCopy.journalingDaily },
] as const;

const ENCOURAGEMENT: Record<(typeof OPTIONS)[number]["key"], string> = {
    never: onboardingCopy.journalingEncouragementNever,
    fewTimes: onboardingCopy.journalingEncouragementFewTimes,
    sometimes: onboardingCopy.journalingEncouragementSometimes,
    regularly: onboardingCopy.journalingEncouragementRegularly,
    daily: onboardingCopy.journalingEncouragementDaily,
};

export function JournalingBeforeStep() {
    const { theme } = useTheme();
    const value = useOnboardingStore((s) => s.answers.journalingBefore);
    const setAnswer = useOnboardingStore((s) => s.setAnswer);

    const subtitle = value ? ENCOURAGEMENT[value] : undefined;

    return (
        <QAStepLayout
            question={onboardingCopy.journalingBeforeQuestion}
            subtitle={subtitle}
        >
            <View style={styles.options}>
                {OPTIONS.map(({ key, label }) => {
                    const selected = value === key;
                    return (
                        <Pressable
                            key={key}
                            onPress={() => setAnswer("journalingBefore", key)}
                            style={[
                                styles.option,
                                {
                                    backgroundColor: selected ? theme.bgSurface : theme.inputBg,
                                    borderColor: selected ? theme.accent : theme.borderMedium,
                                },
                            ]}
                        >
                            <Text
                                style={[
                                    styles.optionText,
                                    { color: selected ? theme.accent : theme.textPrimary },
                                ]}
                            >
                                {label}
                            </Text>
                        </Pressable>
                    );
                })}
            </View>
        </QAStepLayout>
    );
}

const styles = StyleSheet.create({
    options: {
        gap: 10,
    },
    option: {
        borderWidth: 2,
        borderRadius: 12,
        paddingHorizontal: 16,
        paddingVertical: 14,
    },
    optionText: {
        fontSize: 16,
        fontWeight: "500",
    },
});
