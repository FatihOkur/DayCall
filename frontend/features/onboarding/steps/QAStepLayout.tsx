/**
 * Layout for Q&A onboarding screens: compact mascot top-left + question.
 */

import { View, Text, StyleSheet } from "react-native";
import { Mascot } from "../Mascot";
import { useTheme } from "../../../theme";

interface QAStepLayoutProps {
    question: string;
    subtitle?: string;
    children: React.ReactNode;
}

export function QAStepLayout({ question, subtitle, children }: QAStepLayoutProps) {
    const { theme } = useTheme();

    return (
        <View style={styles.container}>
            <View style={styles.questionRow}>
                <Mascot variant="compact" />
                <View style={styles.questionWrap}>
                    <Text style={[styles.question, { color: theme.textPrimary }]}>
                        {question}
                    </Text>
                    {subtitle ? (
                        <Text
                            style={[
                                styles.subtitle,
                                { color: theme.textSecondary },
                            ]}
                        >
                            {subtitle}
                        </Text>
                    ) : null}
                </View>
            </View>
            <View style={styles.inputArea}>{children}</View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        paddingHorizontal: 24,
        paddingTop: 24,
    },
    questionRow: {
        flexDirection: "row",
        alignItems: "flex-start",
        gap: 12,
        marginBottom: 24,
    },
    questionWrap: {
        flex: 1,
    },
    question: {
        fontSize: 18,
        lineHeight: 26,
        fontWeight: "600",
    },
    subtitle: {
        fontSize: 14,
        lineHeight: 20,
        fontWeight: "400",
        fontStyle: "italic",
        marginTop: 6,
    },
    inputArea: {
        flex: 1,
    },
});
