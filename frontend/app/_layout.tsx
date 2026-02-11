import "../global.css";
import { Stack } from "expo-router";
import { View } from "react-native";

/**
 * Root layout component for the application.
 * Applies the Claude bg color globally and sets up navigation.
 */
export default function RootLayout() {
    return (
        <View className="flex-1 bg-claude-bg">
            <Stack
                screenOptions={{
                    headerStyle: {
                        backgroundColor: '#F5F2EB', // claude-bg
                    },
                    headerTintColor: '#2D2926', // claude-text
                    headerTitleStyle: {
                        fontFamily: 'serif',
                    },
                }}
            >
                <Stack.Screen name="(auth)" options={{ headerShown: false }} />
                <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
                <Stack.Screen
                    name="entry/[id]"
                    options={{
                        title: "Journal Entry",
                        presentation: "card"
                    }}
                />
            </Stack>
        </View>
    );
}
