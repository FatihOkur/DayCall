import { View, Text, Pressable, StyleSheet } from "react-native";
import { QAStepLayout } from "./QAStepLayout";
import { onboardingCopy } from "../copy";
import { useOnboardingStore } from "../onboardingStore";
import { useTheme } from "../../../theme";

const OPTIONS = [
    { key: "social", label: onboardingCopy.whereHeardSocial },
    { key: "friend", label: onboardingCopy.whereHeardFriend },
    { key: "appStore", label: onboardingCopy.whereHeardAppStore },
    { key: "blog", label: onboardingCopy.whereHeardBlog },
    { key: "other", label: onboardingCopy.whereHeardOther },
] as const;

export function WhereHeardStep() {
    const { theme } = useTheme();
    const value = useOnboardingStore((s) => s.answers.whereHeard);
    const setAnswer = useOnboardingStore((s) => s.setAnswer);

    return (
        <QAStepLayout question={onboardingCopy.whereHeardQuestion}>
            <View style={styles.options}>
                {OPTIONS.map(({ key, label }) => {
                    const selected = value === key;
                    return (
                        <Pressable
                            key={key}
                            onPress={() => setAnswer("whereHeard", key)}
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
