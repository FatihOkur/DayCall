import { View, Text, Pressable, StyleSheet, ScrollView } from "react-native";
import { QAStepLayout } from "./QAStepLayout";
import { onboardingCopy } from "../copy";
import { useOnboardingStore } from "../onboardingStore";
import { useTheme } from "../../../theme";

const TRAIT_KEYS = [
    "traitCalm",
    "traitAnxious",
    "traitCreative",
    "traitReflective",
    "traitEnergetic",
    "traitIntroverted",
    "traitEmpathetic",
    "traitCurious",
    "traitStressed",
    "traitOptimistic",
] as const;

const TRAIT_LABELS: Record<(typeof TRAIT_KEYS)[number], string> = {
    traitCalm: onboardingCopy.traitCalm,
    traitAnxious: onboardingCopy.traitAnxious,
    traitCreative: onboardingCopy.traitCreative,
    traitReflective: onboardingCopy.traitReflective,
    traitEnergetic: onboardingCopy.traitEnergetic,
    traitIntroverted: onboardingCopy.traitIntroverted,
    traitEmpathetic: onboardingCopy.traitEmpathetic,
    traitCurious: onboardingCopy.traitCurious,
    traitStressed: onboardingCopy.traitStressed,
    traitOptimistic: onboardingCopy.traitOptimistic,
};

export function EmotionalTraitsStep() {
    const { theme } = useTheme();
    const emotionalTraits = useOnboardingStore((s) => s.answers.emotionalTraits);
    const setAnswer = useOnboardingStore((s) => s.setAnswer);

    const toggle = (key: string) => {
        const set = new Set(emotionalTraits);
        if (set.has(key)) set.delete(key);
        else set.add(key);
        setAnswer("emotionalTraits", Array.from(set));
    };

    return (
        <QAStepLayout question={onboardingCopy.emotionalTraitsQuestion}>
            <ScrollView style={styles.scroll} showsVerticalScrollIndicator={false}>
                <View style={styles.options}>
                    {TRAIT_KEYS.map((key) => {
                        const label = TRAIT_LABELS[key];
                        const selected = emotionalTraits.includes(key);
                        return (
                            <Pressable
                                key={key}
                                onPress={() => toggle(key)}
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
                                        {
                                            color: selected
                                                ? theme.accent
                                                : theme.textPrimary,
                                        },
                                    ]}
                                >
                                    {label}
                                </Text>
                            </Pressable>
                        );
                    })}
                </View>
            </ScrollView>
        </QAStepLayout>
    );
}

const styles = StyleSheet.create({
    scroll: {
        flex: 1,
    },
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
