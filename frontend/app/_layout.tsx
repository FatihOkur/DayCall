import "../global.css";

import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";

/**
 * Root layout — wraps the entire app.
 * Sets up NativeWind styles and the navigation stack.
 */
export default function RootLayout() {
    return (
        <>
            <StatusBar style="dark" />
            <Stack
                screenOptions={{
                    headerShown: false,
                    contentStyle: { backgroundColor: "#F5F2EB" },
                }}
            />
        </>
    );
}
