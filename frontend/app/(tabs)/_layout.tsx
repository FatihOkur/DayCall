import { Tabs } from "expo-router";
import { Text } from "react-native";

/**
 * Tab navigation layout — Journal and Settings tabs.
 * Uses Claude Palette colors for the tab bar.
 */
export default function TabLayout() {
    return (
        <Tabs
            screenOptions={{
                headerStyle: {
                    backgroundColor: "#F5F2EB",
                },
                headerTintColor: "#2D2926",
                headerTitleStyle: {
                    fontFamily: "Georgia",
                    fontWeight: "600",
                    fontSize: 18,
                },
                headerShadowVisible: false,
                tabBarStyle: {
                    backgroundColor: "#FFFFFF",
                    borderTopColor: "#E5DFD5",
                    borderTopWidth: 1,
                    paddingTop: 4,
                    height: 85,
                },
                tabBarActiveTintColor: "#DA7756",
                tabBarInactiveTintColor: "#A69B8D",
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
                    tabBarIcon: ({ color }) => (
                        <Text style={{ fontSize: 22 }}>📔</Text>
                    ),
                }}
            />
            <Tabs.Screen
                name="settings"
                options={{
                    title: "Settings",
                    tabBarIcon: ({ color }) => (
                        <Text style={{ fontSize: 22 }}>⚙️</Text>
                    ),
                }}
            />
        </Tabs>
    );
}
