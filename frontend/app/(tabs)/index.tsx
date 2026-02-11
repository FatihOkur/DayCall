import { View, Text, ScrollView, TouchableOpacity, RefreshControl } from "react-native";
import { useRouter } from "expo-router";
import { useState } from "react";
import { Ionicons } from "@expo/vector-icons";

/**
 * Mock journal entry data
 * TODO: Replace with actual API calls
 */
const mockEntries = [
    {
        id: 1,
        date: "2026-02-04",
        summary: "Had a productive day working on the new project. Feeling accomplished and energized.",
        mood_score: 8.5,
        created_at: "2026-02-04T20:30:00Z"
    },
    {
        id: 2,
        date: "2026-02-03",
        summary: "Quiet day of reflection. Spent time reading and thinking about future goals.",
        mood_score: 7.0,
        created_at: "2026-02-03T21:00:00Z"
    },
    {
        id: 3,
        date: "2026-02-02",
        summary: "Challenging day at work but learned a lot. Grateful for supportive colleagues.",
        mood_score: 6.5,
        created_at: "2026-02-02T19:45:00Z"
    },
];

/**
 * Timeline screen showing journal entries in card layout.
 * Uses Claude palette for warm, paper-like aesthetic.
 */
export default function TimelineScreen() {
    const router = useRouter();
    const [refreshing, setRefreshing] = useState(false);

    const onRefresh = async () => {
        setRefreshing(true);
        // TODO: Fetch latest entries from API
        setTimeout(() => setRefreshing(false), 1000);
    };

    const getMoodEmoji = (score: number) => {
        if (score >= 8) return "😊";
        if (score >= 6) return "🙂";
        if (score >= 4) return "😐";
        return "😔";
    };

    return (
        <View className="flex-1 bg-claude-bg">
            <ScrollView
                className="flex-1"
                contentContainerClassName="p-4"
                refreshControl={
                    <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
                }
            >
                {/* Header */}
                <View className="mb-6">
                    <Text className="text-3xl font-serif text-claude-text mb-1">
                        Your Journey
                    </Text>
                    <Text className="text-base text-claude-muted">
                        {mockEntries.length} entries recorded
                    </Text>
                </View>

                {/* Entry Cards */}
                {mockEntries.map((entry) => (
                    <TouchableOpacity
                        key={entry.id}
                        className="bg-claude-paper rounded-xl p-5 mb-4 border border-claude-border active:opacity-80"
                        onPress={() => router.push(`/entry/${entry.id}`)}
                    >
                        {/* Date and Mood */}
                        <View className="flex-row justify-between items-center mb-3">
                            <Text className="text-sm text-claude-muted">
                                {new Date(entry.created_at).toLocaleDateString('en-US', {
                                    weekday: 'long',
                                    month: 'long',
                                    day: 'numeric'
                                })}
                            </Text>
                            <View className="flex-row items-center">
                                <Text className="text-2xl mr-2">{getMoodEmoji(entry.mood_score)}</Text>
                                <Text className="text-sm text-claude-muted">{entry.mood_score}/10</Text>
                            </View>
                        </View>

                        {/* Summary */}
                        <Text className="text-base text-claude-text leading-6" numberOfLines={3}>
                            {entry.summary}
                        </Text>

                        {/* Read More */}
                        <View className="flex-row items-center mt-3">
                            <Text className="text-sm text-claude-accent font-semibold mr-1">
                                Read full entry
                            </Text>
                            <Ionicons name="arrow-forward" size={14} color="#DA7756" />
                        </View>
                    </TouchableOpacity>
                ))}

                {/* Empty State */}
                {mockEntries.length === 0 && (
                    <View className="items-center justify-center py-16">
                        <Ionicons name="book-outline" size={64} color="#99948D" />
                        <Text className="text-lg text-claude-muted mt-4 text-center">
                            No entries yet
                        </Text>
                        <Text className="text-sm text-claude-subtle mt-2 text-center px-8">
                            Your AI will call you at your scheduled time to create your first entry
                        </Text>
                    </View>
                )}
            </ScrollView>
        </View>
    );
}
