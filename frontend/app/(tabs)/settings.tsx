import { View, Text, Switch, Pressable, StyleSheet } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useState } from "react";
import { useAppStore } from "../../store/useAppStore";
import { useTheme, type ThemeMode } from "../../theme";
import { ScreenBackground } from "../../components/ScreenBackground";

const THEME_OPTIONS: { mode: ThemeMode; label: string }[] = [
    { mode: "system", label: "System" },
    { mode: "light", label: "Light" },
    { mode: "dark", label: "Dark" },
];

/**
 * Settings screen -- theme, notifications, account, and logout.
 */
export default function SettingsScreen() {
    const { theme, themeMode, setThemeMode } = useTheme();
    const [notificationsEnabled, setNotificationsEnabled] = useState(true);
    const user = useAppStore((s) => s.user);
    const logout = useAppStore((s) => s.logout);

    return (
        <ScreenBackground>
            <SafeAreaView style={styles.safe} edges={["left", "right"]}>
                <View style={styles.main}>
                    {/* Theme Section */}
                    <Text style={[styles.sectionTitle, { color: theme.textSecondary }]}>
                        Theme
                    </Text>
                    <View
                        style={[
                            styles.card,
                            {
                                backgroundColor: theme.bgRaised,
                                borderColor: theme.borderSubtle,
                            },
                        ]}
                    >
                        <View style={styles.themeRow}>
                            {THEME_OPTIONS.map(({ mode, label }) => {
                                const active = themeMode === mode;
                                return (
                                    <Pressable
                                        key={mode}
                                        onPress={() => setThemeMode(mode)}
                                        style={[
                                            styles.themeOption,
                                            {
                                                backgroundColor: active ? theme.accent : theme.inputBg,
                                                borderColor: active ? theme.accent : theme.borderMedium,
                                            },
                                        ]}
                                    >
                                        <Text
                                            style={[
                                                styles.themeOptionLabel,
                                                {
                                                    color: active
                                                        ? theme.buttonPrimaryText
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
                    </View>

                    {/* Notification Settings */}
                    <Text style={[styles.sectionTitle, { color: theme.textSecondary }]}>
                        Notifications
                    </Text>
                    <View
                        style={[
                            styles.card,
                            {
                                backgroundColor: theme.bgRaised,
                                borderColor: theme.borderSubtle,
                            },
                        ]}
                    >
                        <View style={styles.row}>
                            <View>
                                <Text style={[styles.rowTitle, { color: theme.textPrimary }]}>
                                    Daily Reminder
                                </Text>
                                <Text style={[styles.rowSub, { color: theme.textSecondary }]}>
                                    Get a nudge to journal each day
                                </Text>
                            </View>
                            <Switch
                                value={notificationsEnabled}
                                onValueChange={setNotificationsEnabled}
                                trackColor={{
                                    false: theme.switchTrackOff,
                                    true: theme.accent,
                                }}
                                thumbColor={theme.buttonPrimaryText}
                            />
                        </View>

                        <View style={[styles.divider, { borderTopColor: theme.borderSubtle }]} />

                        <View>
                            <Text style={[styles.rowTitle, { color: theme.textPrimary }]}>
                                Reminder Time
                            </Text>
                            <Text style={[styles.rowAccent, { color: theme.accent }]}>
                                {user
                                    ? `${user.notificationHour}:${String(user.notificationMinute).padStart(2, "0")} ${user.notificationHour >= 12 ? "PM" : "AM"}`
                                    : "8:00 PM"}
                            </Text>
                        </View>
                    </View>

                    {/* Account Section */}
                    <Text style={[styles.sectionTitle, { color: theme.textSecondary }]}>
                        Account
                    </Text>
                    <View
                        style={[
                            styles.card,
                            {
                                backgroundColor: theme.bgRaised,
                                borderColor: theme.borderSubtle,
                            },
                        ]}
                    >
                        {user ? (
                            <>
                                <View style={{ marginBottom: 16 }}>
                                    <Text style={[styles.rowSub, { color: theme.textSecondary }]}>
                                        Email
                                    </Text>
                                    <Text style={[styles.rowTitle, { color: theme.textPrimary }]}>
                                        {user.email}
                                    </Text>
                                </View>

                                {user.displayName ? (
                                    <>
                                        <View style={[styles.divider, { borderTopColor: theme.borderSubtle }]} />
                                        <View style={{ marginBottom: 16 }}>
                                            <Text style={[styles.rowSub, { color: theme.textSecondary }]}>
                                                Display Name
                                            </Text>
                                            <Text style={[styles.rowTitle, { color: theme.textPrimary }]}>
                                                {user.displayName}
                                            </Text>
                                        </View>
                                    </>
                                ) : null}

                                <View style={[styles.divider, { borderTopColor: theme.borderSubtle }]} />

                                <Pressable
                                    onPress={logout}
                                    style={({ pressed }) => ({
                                        backgroundColor: pressed ? theme.errorBg : "transparent",
                                        borderRadius: 8,
                                        padding: 12,
                                        alignItems: "center",
                                    })}
                                >
                                    <Text style={{ color: theme.error, fontSize: 16, fontWeight: "500" }}>
                                        Sign Out
                                    </Text>
                                </Pressable>
                            </>
                        ) : (
                            <Text
                                style={{
                                    fontSize: 15,
                                    color: theme.textSecondary,
                                    textAlign: "center",
                                }}
                            >
                                Not logged in
                            </Text>
                        )}
                    </View>

                    <Text
                        style={{
                            fontSize: 13,
                            color: theme.textMuted,
                            textAlign: "center",
                            marginTop: 40,
                        }}
                    >
                        DayCall v0.1.0
                    </Text>
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
        paddingTop: 16,
    },
    sectionTitle: {
        fontSize: 14,
        fontWeight: "600",
        textTransform: "uppercase",
        letterSpacing: 1,
        marginBottom: 12,
    },
    card: {
        borderRadius: 12,
        padding: 16,
        borderWidth: 1,
        marginBottom: 24,
    },
    themeRow: {
        flexDirection: "row",
        gap: 8,
    },
    themeOption: {
        flex: 1,
        borderWidth: 2,
        borderRadius: 10,
        paddingVertical: 10,
        alignItems: "center",
    },
    themeOptionLabel: {
        fontSize: 14,
        fontWeight: "600",
    },
    row: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        marginBottom: 16,
    },
    rowTitle: {
        fontSize: 16,
        fontWeight: "500",
    },
    rowSub: {
        fontSize: 13,
        marginTop: 2,
    },
    rowAccent: {
        fontSize: 15,
        marginTop: 4,
    },
    divider: {
        borderTopWidth: 1,
        paddingTop: 16,
    },
});
