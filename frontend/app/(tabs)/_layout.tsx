import { Tabs } from "expo-router";
import { Ionicons } from "@expo/vector-icons";

/**
 * Tab navigation layout for main app screens.
 */
export default function TabsLayout() {
    return (
        <Tabs
            screenOptions={{
                tabBarActiveTintColor: '#DA7756', // claude-accent
                tabBarInactiveTintColor: '#99948D', // claude-subtle
                tabBarStyle: {
                    backgroundColor: '#F5F2EB', // claude-bg
                    borderTopColor: '#DEDBD2', // claude-border
                },
                headerStyle: {
                    backgroundColor: '#F5F2EB', // claude-bg
                },
                headerTintColor: '#2D2926', // claude-text
                headerTitleStyle: {
                    fontFamily: 'serif',
                },
            }}
        >
            <Tabs.Screen
                name="index"
                options={{
                    title: "Journal",
                    tabBarIcon: ({ color, size }) => (
                        <Ionicons name="book-outline" size={size} color={color} />
                    ),
                }}
            />
            <Tabs.Screen
                name="settings"
                options={{
                    title: "Settings",
                    tabBarIcon: ({ color, size }) => (
                        <Ionicons name="settings-outline" size={size} color={color} />
                    ),
                }}
            />
        </Tabs>
    );
}
