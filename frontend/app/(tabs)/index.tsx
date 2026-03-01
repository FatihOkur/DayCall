import { View, Text, Pressable, StyleSheet } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";
import { useTheme } from "../../theme";
import { ScreenBackground } from "../../components/ScreenBackground";

/**
 * Journal Timeline -- Main screen.
 */
export default function JournalScreen() {
    const { theme } = useTheme();

    return (
        <ScreenBackground>
            <SafeAreaView style={styles.safe} edges={["left", "right"]}>
                <View style={styles.main}>
                    <View style={styles.empty}>
                        <Text style={{ fontSize: 48, marginBottom: 16 }}>📔</Text>
                        <Text
                            style={[
                                styles.title,
                                { color: theme.textPrimary },
                            ]}
                        >
                            Your Journal
                        </Text>
                        <Text
                            style={[
                                styles.subtitle,
                                { color: theme.textSecondary },
                            ]}
                        >
                            Start your first voice session to create a journal entry.
                        </Text>
                    </View>

                    <Pressable
                        onPress={() => router.push("/voice")}
                        style={({ pressed }) => [
                            styles.fab,
                            {
                                backgroundColor: pressed ? theme.accentPress : theme.accent,
                                shadowColor: theme.accentGlow,
                            },
                        ]}
                    >
                        <Text style={{ fontSize: 28, color: theme.buttonPrimaryText }}>🎙️</Text>
                    </Pressable>
                </View>
            </SafeAreaView>
        </ScreenBackground>
    );
}

const styles = StyleSheet.create({
    safe: {
        flex: 1,
    },
    main: {
        flex: 1,
        paddingHorizontal: 20,
    },
    empty: {
        flex: 1,
        justifyContent: "center",
        alignItems: "center",
        paddingBottom: 80,
    },
    title: {
        fontSize: 22,
        fontWeight: "600",
        marginBottom: 8,
    },
    subtitle: {
        fontSize: 15,
        textAlign: "center",
        lineHeight: 22,
        paddingHorizontal: 40,
    },
    fab: {
        position: "absolute",
        bottom: 20,
        right: 20,
        width: 64,
        height: 64,
        borderRadius: 32,
        justifyContent: "center",
        alignItems: "center",
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
        elevation: 6,
    },
});
