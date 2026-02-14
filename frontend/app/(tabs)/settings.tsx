import { View, Text, Switch, Pressable } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useState } from "react";
import { useAppStore } from "../../store/useAppStore";

/**
 * Settings screen — notification preferences, account info, and logout.
 */
export default function SettingsScreen() {
    const [notificationsEnabled, setNotificationsEnabled] = useState(true);
    const user = useAppStore((s) => s.user);
    const logout = useAppStore((s) => s.logout);

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
                            {user
                                ? `${user.notificationHour}:${String(user.notificationMinute).padStart(2, "0")} ${user.notificationHour >= 12 ? "PM" : "AM"}`
                                : "8:00 PM"}
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
                    {user ? (
                        <>
                            <View style={{ marginBottom: 16 }}>
                                <Text
                                    style={{
                                        fontSize: 13,
                                        color: "#A69B8D",
                                        marginBottom: 2,
                                    }}
                                >
                                    Email
                                </Text>
                                <Text
                                    style={{
                                        fontSize: 16,
                                        color: "#2D2926",
                                        fontWeight: "500",
                                    }}
                                >
                                    {user.email}
                                </Text>
                            </View>

                            {user.displayName ? (
                                <View
                                    style={{
                                        borderTopWidth: 1,
                                        borderTopColor: "#E5DFD5",
                                        paddingTop: 16,
                                        marginBottom: 16,
                                    }}
                                >
                                    <Text
                                        style={{
                                            fontSize: 13,
                                            color: "#A69B8D",
                                            marginBottom: 2,
                                        }}
                                    >
                                        Display Name
                                    </Text>
                                    <Text
                                        style={{
                                            fontSize: 16,
                                            color: "#2D2926",
                                            fontWeight: "500",
                                        }}
                                    >
                                        {user.displayName}
                                    </Text>
                                </View>
                            ) : null}

                            <View
                                style={{
                                    borderTopWidth: 1,
                                    borderTopColor: "#E5DFD5",
                                    paddingTop: 16,
                                }}
                            >
                                <Pressable
                                    onPress={logout}
                                    style={({ pressed }) => ({
                                        backgroundColor: pressed ? "#FEF2F2" : "transparent",
                                        borderRadius: 8,
                                        padding: 12,
                                        alignItems: "center",
                                    })}
                                >
                                    <Text
                                        style={{
                                            color: "#DC2626",
                                            fontSize: 16,
                                            fontWeight: "500",
                                        }}
                                    >
                                        Sign Out
                                    </Text>
                                </Pressable>
                            </View>
                        </>
                    ) : (
                        <Text
                            style={{
                                fontSize: 15,
                                color: "#A69B8D",
                                textAlign: "center",
                            }}
                        >
                            Not logged in
                        </Text>
                    )}
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
