import { useState } from "react";
import { View, Text, TextInput, Pressable, ActivityIndicator, KeyboardAvoidingView, Platform } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";
import { useAppStore } from "../store/useAppStore";

/**
 * Login / Register screen.
 * Shown when the user is not authenticated.
 */
export default function LoginScreen() {
    const [isRegister, setIsRegister] = useState(false);
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [error, setError] = useState("");
    const [loading, setLoading] = useState(false);

    const login = useAppStore((s) => s.login);
    const register = useAppStore((s) => s.register);

    const handleSubmit = async () => {
        setError("");
        if (!email.trim() || !password.trim()) {
            setError("Please fill in all fields");
            return;
        }

        setLoading(true);
        try {
            if (isRegister) {
                await register(email.trim(), password);
            } else {
                await login(email.trim(), password);
            }
            router.replace("/(tabs)");
        } catch (e: any) {
            setError(e.message || "Something went wrong");
        } finally {
            setLoading(false);
        }
    };

    return (
        <SafeAreaView style={{ flex: 1, backgroundColor: "#F5F2EB" }}>
            <KeyboardAvoidingView
                style={{ flex: 1 }}
                behavior={Platform.OS === "ios" ? "padding" : "height"}
            >
                <View
                    style={{
                        flex: 1,
                        justifyContent: "center",
                        paddingHorizontal: 32,
                    }}
                >
                    {/* Header */}
                    <Text style={{ fontSize: 40, textAlign: "center", marginBottom: 8 }}>
                        🎙️
                    </Text>
                    <Text
                        style={{
                            fontFamily: "Georgia",
                            fontSize: 28,
                            fontWeight: "700",
                            color: "#2D2926",
                            textAlign: "center",
                            marginBottom: 4,
                        }}
                    >
                        DayCall
                    </Text>
                    <Text
                        style={{
                            fontSize: 15,
                            color: "#A69B8D",
                            textAlign: "center",
                            marginBottom: 40,
                        }}
                    >
                        Your AI Voice Journal
                    </Text>

                    {/* Error */}
                    {error ? (
                        <View
                            style={{
                                backgroundColor: "#FEF2F2",
                                borderRadius: 8,
                                padding: 12,
                                marginBottom: 16,
                                borderWidth: 1,
                                borderColor: "#FECACA",
                            }}
                        >
                            <Text style={{ color: "#DC2626", fontSize: 14, textAlign: "center" }}>
                                {error}
                            </Text>
                        </View>
                    ) : null}

                    {/* Email */}
                    <TextInput
                        placeholder="Email"
                        value={email}
                        onChangeText={setEmail}
                        autoCapitalize="none"
                        keyboardType="email-address"
                        placeholderTextColor="#A69B8D"
                        style={{
                            backgroundColor: "#FFFFFF",
                            borderWidth: 1,
                            borderColor: "#E5DFD5",
                            borderRadius: 12,
                            padding: 16,
                            fontSize: 16,
                            color: "#2D2926",
                            marginBottom: 12,
                        }}
                    />

                    {/* Password */}
                    <TextInput
                        placeholder="Password"
                        value={password}
                        onChangeText={setPassword}
                        secureTextEntry
                        placeholderTextColor="#A69B8D"
                        style={{
                            backgroundColor: "#FFFFFF",
                            borderWidth: 1,
                            borderColor: "#E5DFD5",
                            borderRadius: 12,
                            padding: 16,
                            fontSize: 16,
                            color: "#2D2926",
                            marginBottom: 24,
                        }}
                    />

                    {/* Submit Button */}
                    <Pressable
                        onPress={handleSubmit}
                        disabled={loading}
                        style={({ pressed }) => ({
                            backgroundColor: loading
                                ? "#E8956F"
                                : pressed
                                    ? "#C4603D"
                                    : "#DA7756",
                            borderRadius: 12,
                            padding: 16,
                            alignItems: "center",
                            marginBottom: 16,
                            shadowColor: "#DA7756",
                            shadowOffset: { width: 0, height: 2 },
                            shadowOpacity: 0.2,
                            shadowRadius: 4,
                            elevation: 3,
                        })}
                    >
                        {loading ? (
                            <ActivityIndicator color="#FFFFFF" />
                        ) : (
                            <Text
                                style={{
                                    color: "#FFFFFF",
                                    fontSize: 16,
                                    fontWeight: "600",
                                }}
                            >
                                {isRegister ? "Create Account" : "Sign In"}
                            </Text>
                        )}
                    </Pressable>

                    {/* Toggle */}
                    <Pressable onPress={() => { setIsRegister(!isRegister); setError(""); }}>
                        <Text
                            style={{
                                color: "#A69B8D",
                                fontSize: 14,
                                textAlign: "center",
                            }}
                        >
                            {isRegister
                                ? "Already have an account? "
                                : "Don't have an account? "}
                            <Text style={{ color: "#DA7756", fontWeight: "600" }}>
                                {isRegister ? "Sign In" : "Create Account"}
                            </Text>
                        </Text>
                    </Pressable>
                </View>
            </KeyboardAvoidingView>
        </SafeAreaView>
    );
}
