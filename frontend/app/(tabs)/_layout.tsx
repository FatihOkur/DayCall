import { Tabs } from "expo-router";
import { Text } from "react-native";
import { useTheme } from "../../theme";

/**
 * Tab navigation layout -- themed tab bar.
 */
export default function TabLayout() {
    const { theme } = useTheme();

    return (
        <Tabs
            screenOptions={{
                headerStyle: {
                    backgroundColor: theme.bgSurface,
                },
                headerTintColor: theme.textPrimary,
                headerTitleStyle: {
                    fontWeight: "600",
                    fontSize: 18,
                },
                headerShadowVisible: false,
                tabBarStyle: {
                    backgroundColor: theme.bgBase,
                    borderTopColor: theme.borderSubtle,
                    borderTopWidth: 1,
                    paddingTop: 4,
                    height: 85,
                },
                tabBarActiveTintColor: theme.accent,
                tabBarInactiveTintColor: theme.textMuted,
                tabBarLabelStyle: {
                    fontSize: 12,
                    fontWeight: "500",
                },
            }}
        >
            <Tabs.Screen
                name="index"
                options={{
                    title: "Journal",
                    tabBarIcon: () => (
                        <Text style={{ fontSize: 22 }}>📔</Text>
                    ),
                }}
            />
            <Tabs.Screen
                name="settings"
                options={{
                    title: "Settings",
                    tabBarIcon: () => (
                        <Text style={{ fontSize: 22 }}>⚙️</Text>
                    ),
                }}
            />
        </Tabs>
    );
}
