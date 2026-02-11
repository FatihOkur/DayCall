import { View, Text, ScrollView, TouchableOpacity, Platform } from "react-native";
import { useState } from "react";
import { Ionicons } from "@expo/vector-icons";
import DateTimePicker from '@react-native-community/datetimepicker';

/**
 * Settings screen for call scheduling and preferences.
 * Uses Claude palette for consistent warm aesthetic.
 */
export default function SettingsScreen() {
    const [callTime, setCallTime] = useState(new Date());
    const [showTimePicker, setShowTimePicker] = useState(false);
    const [selectedPersona, setSelectedPersona] = useState("Empathetic Friend");

    const personas = [
        { id: "empathetic", name: "Empathetic Friend", icon: "heart-outline" },
        { id: "stoic", name: "Stoic Coach", icon: "fitness-outline" },
        { id: "curious", name: "Curious Explorer", icon: "telescope-outline" },
    ];

    const handleTimeChange = (event: any, selectedDate?: Date) => {
        setShowTimePicker(Platform.OS === 'ios');
        if (selectedDate) {
            setCallTime(selectedDate);
            // TODO: Update backend with new time
        }
    };

    const handleTestCall = async () => {
        // TODO: Trigger test call via API
        console.log("Test call triggered");
    };

    return (
        <ScrollView className="flex-1 bg-claude-bg">
            <View className="p-4">
                {/* Header */}
                <View className="mb-6">
                    <Text className="text-3xl font-serif text-claude-text mb-1">
                        Settings
                    </Text>
                    <Text className="text-base text-claude-muted">
                        Customize your journaling experience
                    </Text>
                </View>

                {/* Call Schedule Section */}
                <View className="bg-claude-paper rounded-xl p-5 mb-4 border border-claude-border">
                    <Text className="text-lg font-serif text-claude-text mb-4">
                        Call Schedule
                    </Text>

                    <Text className="text-sm text-claude-muted mb-2">
                        Daily call time
                    </Text>

                    <TouchableOpacity
                        className="bg-claude-surface rounded-lg p-4 flex-row justify-between items-center mb-4"
                        onPress={() => setShowTimePicker(true)}
                    >
                        <Text className="text-base text-claude-text">
                            {callTime.toLocaleTimeString('en-US', {
                                hour: '2-digit',
                                minute: '2-digit'
                            })}
                        </Text>
                        <Ionicons name="time-outline" size={24} color="#66605B" />
                    </TouchableOpacity>

                    {showTimePicker && (
                        <DateTimePicker
                            value={callTime}
                            mode="time"
                            is24Hour={false}
                            onChange={handleTimeChange}
                        />
                    )}

                    <TouchableOpacity
                        className="bg-claude-accent rounded-lg py-3 active:bg-claude-accentHover"
                        onPress={handleTestCall}
                    >
                        <Text className="text-center text-white font-semibold">
                            Test Call Now
                        </Text>
                    </TouchableOpacity>
                </View>

                {/* Voice Persona Section */}
                <View className="bg-claude-paper rounded-xl p-5 mb-4 border border-claude-border">
                    <Text className="text-lg font-serif text-claude-text mb-4">
                        AI Voice Persona
                    </Text>

                    {personas.map((persona) => (
                        <TouchableOpacity
                            key={persona.id}
                            className={`rounded-lg p-4 mb-3 flex-row items-center ${selectedPersona === persona.name
                                    ? 'bg-claude-accent/10 border-2 border-claude-accent'
                                    : 'bg-claude-surface border border-claude-border'
                                }`}
                            onPress={() => setSelectedPersona(persona.name)}
                        >
                            <Ionicons
                                name={persona.icon as any}
                                size={24}
                                color={selectedPersona === persona.name ? '#DA7756' : '#66605B'}
                            />
                            <Text
                                className={`ml-3 text-base ${selectedPersona === persona.name
                                        ? 'text-claude-accent font-semibold'
                                        : 'text-claude-text'
                                    }`}
                            >
                                {persona.name}
                            </Text>
                        </TouchableOpacity>
                    ))}
                </View>

                {/* Account Section */}
                <View className="bg-claude-paper rounded-xl p-5 mb-4 border border-claude-border">
                    <Text className="text-lg font-serif text-claude-text mb-4">
                        Account
                    </Text>

                    <TouchableOpacity className="py-3 border-b border-claude-border">
                        <Text className="text-base text-claude-text">Phone Number</Text>
                        <Text className="text-sm text-claude-muted mt-1">+1 (555) 123-4567</Text>
                    </TouchableOpacity>

                    <TouchableOpacity className="py-3 border-b border-claude-border">
                        <Text className="text-base text-claude-text">Email</Text>
                        <Text className="text-sm text-claude-muted mt-1">user@example.com</Text>
                    </TouchableOpacity>

                    <TouchableOpacity className="py-3">
                        <Text className="text-base text-claude-error">Sign Out</Text>
                    </TouchableOpacity>
                </View>
            </View>
        </ScrollView>
    );
}
