import { View, Text, Switch } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useState } from "react";

/**
 * Settings screen — notification preferences and account settings.
 * Placeholder for now; will be connected to the backend in Phase 2.
 */
export default function SettingsScreen() {
    const [notificationsEnabled, setNotificationsEnabled] = useState(true);

    return (
        <SafeAreaView
            style={{ flex: 1, backgroundColor: "#F5F2EB" }}
            edges={["left", "right"]}
        >
            <View style={{ flex: 1, paddingHorizontal: 20, paddingTop: 16 }}>
                {/* Notification Settings */}
                <Text
                    style={{
                        fontFamily: "Georgia",
                        fontSize: 14,
                        fontWeight: "600",
                        color: "#A69B8D",
                        textTransform: "uppercase",
                        letterSpacing: 1,
                        marginBottom: 12,
                    }}
                >
                    Notifications
                </Text>

                <View
                    style={{
                        backgroundColor: "#FFFFFF",
                        borderRadius: 12,
                        padding: 16,
                        borderWidth: 1,
                        borderColor: "#E5DFD5",
                    }}
                >
                    <View
                        style={{
                            flexDirection: "row",
                            justifyContent: "space-between",
                            alignItems: "center",
                            marginBottom: 16,
                        }}
                    >
                        <View>
                            <Text
                                style={{ fontSize: 16, color: "#2D2926", fontWeight: "500" }}
                            >
                                Daily Reminder
                            </Text>
                            <Text style={{ fontSize: 13, color: "#A69B8D", marginTop: 2 }}>
                                Get a nudge to journal each day
                            </Text>
                        </View>
                        <Switch
                            value={notificationsEnabled}
                            onValueChange={setNotificationsEnabled}
                            trackColor={{ false: "#E5DFD5", true: "#DA7756" }}
                            thumbColor="#FFFFFF"
                        />
                    </View>

                    <View
                        style={{
                            borderTopWidth: 1,
                            borderTopColor: "#E5DFD5",
                            paddingTop: 16,
                        }}
                    >
                        <Text
                            style={{ fontSize: 16, color: "#2D2926", fontWeight: "500" }}
                        >
                            Reminder Time
                        </Text>
                        <Text style={{ fontSize: 15, color: "#DA7756", marginTop: 4 }}>
                            8:00 PM
                        </Text>
                    </View>
                </View>

                {/* Account Section */}
                <Text
                    style={{
                        fontFamily: "Georgia",
                        fontSize: 14,
                        fontWeight: "600",
                        color: "#A69B8D",
                        textTransform: "uppercase",
                        letterSpacing: 1,
                        marginTop: 32,
                        marginBottom: 12,
                    }}
                >
                    Account
                </Text>

                <View
                    style={{
                        backgroundColor: "#FFFFFF",
                        borderRadius: 12,
                        padding: 16,
                        borderWidth: 1,
                        borderColor: "#E5DFD5",
                    }}
                >
                    <Text style={{ fontSize: 15, color: "#A69B8D", textAlign: "center" }}>
                        Login coming in Phase 2
                    </Text>
                </View>

                {/* Version */}
                <Text
                    style={{
                        fontSize: 13,
                        color: "#A69B8D",
                        textAlign: "center",
                        marginTop: 40,
                    }}
                >
                    DayCall v0.1.0
                </Text>
            </View>
        </SafeAreaView>
    );
}
