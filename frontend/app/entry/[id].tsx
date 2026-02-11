import { View, Text, ScrollView, TouchableOpacity } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import AudioPlayer from "../../components/AudioPlayer";
import Markdown from "react-native-markdown-display";

/**
 * Mock entry data
 * TODO: Fetch from API based on entry ID
 */
const mockEntry = {
    id: 1,
    date: "2026-02-04",
    created_at: "2026-02-04T20:30:00Z",
    mood_score: 8.5,
    audio_url: "https://example.com/audio.mp3",
    transcript_text: `
**User:** Today was really productive. I finally finished the project I've been working on for weeks.

**AI:** That's wonderful! How does it feel to complete something you've been dedicating so much time to?

**User:** It feels amazing, honestly. There were moments I doubted I could pull it off, but I pushed through.

**AI:** What do you think helped you push through those doubts?

**User:** I think it was remembering why I started. The project means a lot to me, and I kept that in mind.
  `,
    ai_summary_markdown: `
# Daily Reflection - February 4, 2026

## Summary
Today marked a significant achievement with the completion of a long-term project. The sense of accomplishment is palpable, tempered by the challenges overcome along the way.

## Key Themes
- **Persistence**: Despite moments of doubt, maintained focus on the end goal
- **Purpose-driven**: Reconnecting with the "why" provided motivation during difficult moments
- **Achievement**: Successfully completed a weeks-long project

## Mood Analysis
**Score: 8.5/10** - Highly positive emotional state characterized by:
- Sense of accomplishment
- Relief after sustained effort
- Energized and optimistic outlook

## Reflection Points
The ability to reconnect with core motivations during challenging times demonstrates strong self-awareness and emotional resilience. This is a valuable skill to cultivate for future endeavors.

## Tomorrow's Intention
Consider: What's the next meaningful project to channel this positive momentum into?
  `
};

/**
 * Journal entry detail screen.
 * Shows full transcript, AI summary, and audio playback.
 */
export default function EntryDetailScreen() {
    const { id } = useLocalSearchParams();
    const router = useRouter();

    const getMoodEmoji = (score: number) => {
        if (score >= 8) return "😊";
        if (score >= 6) return "🙂";
        if (score >= 4) return "😐";
        return "😔";
    };

    return (
        <View className="flex-1 bg-claude-bg">
            <ScrollView className="flex-1" contentContainerClassName="p-4">
                {/* Header */}
                <View className="mb-6">
                    <Text className="text-sm text-claude-muted mb-2">
                        {new Date(mockEntry.created_at).toLocaleDateString('en-US', {
                            weekday: 'long',
                            month: 'long',
                            day: 'numeric',
                            year: 'numeric'
                        })}
                    </Text>
                    <View className="flex-row items-center">
                        <Text className="text-3xl mr-2">{getMoodEmoji(mockEntry.mood_score)}</Text>
                        <Text className="text-2xl font-serif text-claude-text">
                            Mood: {mockEntry.mood_score}/10
                        </Text>
                    </View>
                </View>

                {/* Audio Player */}
                <View className="mb-6">
                    <AudioPlayer audioUrl={mockEntry.audio_url} />
                </View>

                {/* AI Summary */}
                <View className="bg-claude-paper rounded-xl p-5 mb-4 border border-claude-border">
                    <View className="flex-row items-center mb-4">
                        <Ionicons name="sparkles" size={20} color="#DA7756" />
                        <Text className="text-lg font-serif text-claude-text ml-2">
                            AI Summary
                        </Text>
                    </View>
                    <Markdown
                        style={{
                            body: { color: '#2D2926' },
                            heading1: { color: '#2D2926', fontFamily: 'serif', fontSize: 24, marginBottom: 12 },
                            heading2: { color: '#2D2926', fontFamily: 'serif', fontSize: 20, marginBottom: 10 },
                            paragraph: { color: '#2D2926', lineHeight: 24, marginBottom: 12 },
                            strong: { color: '#2D2926', fontWeight: 'bold' },
                            bullet_list: { color: '#2D2926' },
                        }}
                    >
                        {mockEntry.ai_summary_markdown}
                    </Markdown>
                </View>

                {/* Transcript */}
                <View className="bg-claude-paper rounded-xl p-5 mb-4 border border-claude-border">
                    <View className="flex-row items-center mb-4">
                        <Ionicons name="document-text-outline" size={20} color="#66605B" />
                        <Text className="text-lg font-serif text-claude-text ml-2">
                            Full Transcript
                        </Text>
                    </View>
                    <Text className="text-base text-claude-text leading-6">
                        {mockEntry.transcript_text}
                    </Text>
                </View>
            </ScrollView>
        </View>
    );
}
