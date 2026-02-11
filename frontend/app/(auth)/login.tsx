import { useState } from "react";
import { View, Text, TextInput, TouchableOpacity, KeyboardAvoidingView, Platform } from "react-native";
import { useRouter } from "expo-router";

/**
 * Login screen with Claude palette styling.
 * Clean, minimalist design with warm colors.
 */
export default function LoginScreen() {
    const router = useRouter();
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");

    const handleLogin = async () => {
        // TODO: Implement actual login logic with backend API
        console.log("Login:", email, password);
        router.replace("/(tabs)");
    };

    return (
        <KeyboardAvoidingView
            behavior={Platform.OS === "ios" ? "padding" : "height"}
            className="flex-1 bg-claude-bg"
        >
            <View className="flex-1 justify-center px-8">
                {/* Header */}
                <View className="mb-12">
                    <Text className="text-4xl font-serif text-claude-text mb-2">
                        Welcome Back
                    </Text>
                    <Text className="text-base text-claude-muted">
                        Your AI journaling companion awaits
                    </Text>
                </View>

                {/* Email Input */}
                <View className="mb-4">
                    <Text className="text-sm text-claude-muted mb-2 font-sans">Email</Text>
                    <TextInput
                        className="bg-claude-paper border border-claude-border rounded-lg px-4 py-3 text-claude-text"
                        placeholder="you@example.com"
                        placeholderTextColor="#99948D"
                        value={email}
                        onChangeText={setEmail}
                        keyboardType="email-address"
                        autoCapitalize="none"
                    />
                </View>

                {/* Password Input */}
                <View className="mb-6">
                    <Text className="text-sm text-claude-muted mb-2 font-sans">Password</Text>
                    <TextInput
                        className="bg-claude-paper border border-claude-border rounded-lg px-4 py-3 text-claude-text"
                        placeholder="••••••••"
                        placeholderTextColor="#99948D"
                        value={password}
                        onChangeText={setPassword}
                        secureTextEntry
                    />
                </View>

                {/* Login Button */}
                <TouchableOpacity
                    className="bg-claude-accent rounded-lg py-4 mb-4 active:bg-claude-accentHover"
                    onPress={handleLogin}
                >
                    <Text className="text-center text-white font-semibold text-base">
                        Sign In
                    </Text>
                </TouchableOpacity>

                {/* Register Link */}
                <TouchableOpacity className="py-2">
                    <Text className="text-center text-claude-muted">
                        Don't have an account?{" "}
                        <Text className="text-claude-accent font-semibold">Sign Up</Text>
                    </Text>
                </TouchableOpacity>
            </View>
        </KeyboardAvoidingView>
    );
}
