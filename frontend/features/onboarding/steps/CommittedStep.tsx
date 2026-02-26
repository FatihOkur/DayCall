import { View, Text, StyleSheet } from "react-native";
import { Mascot } from "../Mascot";
import { onboardingCopy } from "../copy";
import { useThemeColors } from "../../../theme";

export function CommittedStep() {
    const colors = useThemeColors();

    return (
        <View style={styles.container}>
            <Mascot variant="hero" />
            <Text style={[styles.title, { color: colors.textPrimary }]}>
                {onboardingCopy.committedTitle}
            </Text>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        justifyContent: "center",
        alignItems: "center",
        paddingHorizontal: 24,
    },
    title: {
        marginTop: 24,
        fontSize: 24,
        fontWeight: "700",
        textAlign: "center",
    },
});
