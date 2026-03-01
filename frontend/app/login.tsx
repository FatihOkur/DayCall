import { useState } from "react";
import { View, Text, TextInput, ActivityIndicator, KeyboardAvoidingView, Platform } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";
import { useAppStore } from "../store/useAppStore";
import { useTheme } from "../theme";
import { PrimaryButton } from "../components/buttons/PrimaryButton";
import { GhostButton } from "../components/buttons/GhostButton";
import { ScreenBackground } from "../components/ScreenBackground";

/**
 * Login / Register screen.
 */
export default function LoginScreen() {
    const { theme } = useTheme();
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
        <ScreenBackground>
            <SafeAreaView style={{ flex: 1 }}>
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
                        <Text
                            style={{
                                fontSize: 28,
                                fontWeight: "700",
                                color: theme.textPrimary,
                                textAlign: "center",
                                marginBottom: 4,
                            }}
                        >
                            DayCall
                        </Text>
                        <Text
                            style={{
                                fontSize: 15,
                                color: theme.textSecondary,
                                textAlign: "center",
                                marginBottom: 40,
                            }}
                        >
                            Your AI Voice Journal
                        </Text>

                        {error ? (
                            <View
                                style={{
                                    backgroundColor: theme.errorBg,
                                    borderRadius: 8,
                                    padding: 12,
                                    marginBottom: 16,
                                    borderWidth: 1,
                                    borderColor: theme.errorBorder,
                                }}
                            >
                                <Text style={{ color: theme.error, fontSize: 14, textAlign: "center" }}>
                                    {error}
                                </Text>
                            </View>
                        ) : null}

                        <TextInput
                            placeholder="Email"
                            value={email}
                            onChangeText={setEmail}
                            autoCapitalize="none"
                            keyboardType="email-address"
                            placeholderTextColor={theme.textMuted}
                            style={{
                                backgroundColor: theme.inputBg,
                                borderWidth: 1,
                                borderColor: theme.borderMedium,
                                borderRadius: 12,
                                padding: 16,
                                fontSize: 16,
                                color: theme.textPrimary,
                                marginBottom: 12,
                            }}
                        />

                        <TextInput
                            placeholder="Password"
                            value={password}
                            onChangeText={setPassword}
                            secureTextEntry
                            placeholderTextColor={theme.textMuted}
                            style={{
                                backgroundColor: theme.inputBg,
                                borderWidth: 1,
                                borderColor: theme.borderMedium,
                                borderRadius: 12,
                                padding: 16,
                                fontSize: 16,
                                color: theme.textPrimary,
                                marginBottom: 24,
                            }}
                        />

                        {loading ? (
                            <View style={{ padding: 16, alignItems: "center" }}>
                                <ActivityIndicator color={theme.accent} />
                            </View>
                        ) : (
                            <PrimaryButton
                                label={isRegister ? "Create Account" : "Sign In"}
                                onPress={handleSubmit}
                            />
                        )}

                        <View style={{ marginTop: 16 }}>
                            <GhostButton
                                label={
                                    isRegister
                                        ? "Already have an account? Sign In"
                                        : "Don't have an account? Create Account"
                                }
                                onPress={() => {
                                    setIsRegister(!isRegister);
                                    setError("");
                                }}
                            />
                        </View>
                    </View>
                </KeyboardAvoidingView>
            </SafeAreaView>
        </ScreenBackground>
    );
}
