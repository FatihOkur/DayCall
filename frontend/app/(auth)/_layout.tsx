import { Stack } from "expo-router";

/**
 * Auth layout for authentication screens.
 */
export default function AuthLayout() {
    return (
        <Stack
            screenOptions={{
                headerShown: false,
                contentStyle: {
                    backgroundColor: '#F5F2EB', // claude-bg
                }
            }}
        >
            <Stack.Screen name="login" />
        </Stack>
    );
}
