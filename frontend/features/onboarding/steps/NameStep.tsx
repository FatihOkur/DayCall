import { View, TextInput, StyleSheet } from "react-native";
import { QAStepLayout } from "./QAStepLayout";
import { onboardingCopy } from "../copy";
import { useOnboardingStore } from "../onboardingStore";
import { useTheme } from "../../../theme";

export function NameStep() {
    const { theme } = useTheme();
    const name = useOnboardingStore((s) => s.answers.name);
    const setAnswer = useOnboardingStore((s) => s.setAnswer);

    return (
        <QAStepLayout question={onboardingCopy.nameQuestion}>
            <TextInput
                value={name}
                onChangeText={(v) => setAnswer("name", v)}
                placeholder={onboardingCopy.namePlaceholder}
                placeholderTextColor={theme.textMuted}
                style={[
                    styles.input,
                    {
                        backgroundColor: theme.inputBg,
                        borderColor: theme.borderMedium,
                        color: theme.textPrimary,
                    },
                ]}
                autoCapitalize="words"
                autoCorrect={false}
            />
        </QAStepLayout>
    );
}

const styles = StyleSheet.create({
    input: {
        borderWidth: 1,
        borderRadius: 12,
        paddingHorizontal: 16,
        paddingVertical: 14,
        fontSize: 16,
    },
});
