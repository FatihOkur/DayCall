import { View, Text, Pressable, StyleSheet } from "react-native";
import { QAStepLayout } from "./QAStepLayout";
import { onboardingCopy } from "../copy";
import { useOnboardingStore } from "../onboardingStore";
import { useThemeColors } from "../../../theme";

const OPTIONS = [
    { key: "never", label: onboardingCopy.journalingNever },
    { key: "fewTimes", label: onboardingCopy.journalingFewTimes },
    { key: "sometimes", label: onboardingCopy.journalingSometimes },
    { key: "regularly", label: onboardingCopy.journalingRegularly },
    { key: "daily", label: onboardingCopy.journalingDaily },
] as const;

export function JournalingBeforeStep() {
    const colors = useThemeColors();
    const value = useOnboardingStore((s) => s.answers.journalingBefore);
    const setAnswer = useOnboardingStore((s) => s.setAnswer);

    return (
        <QAStepLayout question={onboardingCopy.journalingBeforeQuestion}>
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
                                    backgroundColor: selected ? colors.surface : colors.inputBg,
                                    borderColor: selected ? colors.accentPrimary : colors.border,
                                },
                            ]}
                        >
                            <Text
                                style={[
                                    styles.optionText,
                                    { color: selected ? colors.accentPrimary : colors.textPrimary },
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
