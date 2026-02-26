import { View, Text, StyleSheet } from "react-native";
import { QAStepLayout } from "./QAStepLayout";
import { onboardingCopy } from "../copy";
import { useOnboardingStore } from "../onboardingStore";
import { getZodiacSignFromDate } from "../utils/horoscope";
export function HoroscopeStep() {
    const name = useOnboardingStore((s) => s.answers.name);
    const birthDate = useOnboardingStore((s) => s.answers.birthDate);
    const horoscope = birthDate ? getZodiacSignFromDate(birthDate) : "";
    const message = onboardingCopy.horoscopeMessage
        .replace("{name}", name || "")
        .replace("{horoscope}", horoscope);

    return (
        <QAStepLayout question={message}>
            <View style={styles.placeholder} />
        </QAStepLayout>
    );
}

const styles = StyleSheet.create({
    placeholder: {
        flex: 1,
    },
});
