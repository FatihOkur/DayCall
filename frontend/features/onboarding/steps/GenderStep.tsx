import { View, Text, Pressable, StyleSheet } from "react-native";
import { QAStepLayout } from "./QAStepLayout";
import { onboardingCopy } from "../copy";
import { useOnboardingStore } from "../onboardingStore";
import { useThemeColors } from "../../../theme";

const OPTIONS = [
    { key: "male", label: onboardingCopy.genderMale },
    { key: "female", label: onboardingCopy.genderFemale },
    { key: "nonbinary", label: onboardingCopy.genderNonbinary },
    { key: "preferNot", label: onboardingCopy.genderPreferNot },
    { key: "other", label: onboardingCopy.genderOther },
] as const;

export function GenderStep() {
    const colors = useThemeColors();
    const gender = useOnboardingStore((s) => s.answers.gender);
    const setAnswer = useOnboardingStore((s) => s.setAnswer);

    return (
        <QAStepLayout question={onboardingCopy.genderQuestion}>
            <View style={styles.options}>
                {OPTIONS.map(({ key, label }) => {
                    const selected = gender === key;
                    return (
                        <Pressable
                            key={key}
                            onPress={() => setAnswer("gender", key)}
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
