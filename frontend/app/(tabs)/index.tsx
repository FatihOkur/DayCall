import { View, Text, Pressable } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";

/**
 * Journal Timeline — Main screen.
 * Shows a list of journal entries (placeholder for now).
 * The floating action button will trigger a new voice session.
 */
export default function JournalScreen() {
    return (
        <SafeAreaView
            style={{ flex: 1, backgroundColor: "#F5F2EB" }}
            edges={["left", "right"]}
        >
            <View style={{ flex: 1, paddingHorizontal: 20 }}>
                {/* Empty state */}
                <View
                    style={{
                        flex: 1,
                        justifyContent: "center",
                        alignItems: "center",
                        paddingBottom: 80,
                    }}
                >
                    <Text style={{ fontSize: 48, marginBottom: 16 }}>📔</Text>
                    <Text
                        style={{
                            fontFamily: "Georgia",
                            fontSize: 22,
                            color: "#2D2926",
                            fontWeight: "600",
                            marginBottom: 8,
                        }}
                    >
                        Your Journal
                    </Text>
                    <Text
                        style={{
                            fontSize: 15,
                            color: "#A69B8D",
                            textAlign: "center",
                            lineHeight: 22,
                            paddingHorizontal: 40,
                        }}
                    >
                        Start your first voice session to create a journal entry.
                    </Text>
                </View>

                {/* Floating Action Button — Start Voice Session */}
                <Pressable
                    onPress={() => {
                        router.push("/voice");
                    }}
                    style={({ pressed }) => ({
                        position: "absolute",
                        bottom: 20,
                        right: 20,
                        width: 64,
                        height: 64,
                        borderRadius: 32,
                        backgroundColor: pressed ? "#E8956F" : "#DA7756",
                        justifyContent: "center",
                        alignItems: "center",
                        shadowColor: "#DA7756",
                        shadowOffset: { width: 0, height: 4 },
                        shadowOpacity: 0.3,
                        shadowRadius: 8,
                        elevation: 6,
                    })}
                >
                    <Text style={{ fontSize: 28, color: "#FFFFFF" }}>🎙️</Text>
                </Pressable>
            </View>
        </SafeAreaView>
    );
}
