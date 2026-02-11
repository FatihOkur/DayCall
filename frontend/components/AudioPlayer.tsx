import { View, Text, TouchableOpacity } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useState } from "react";
import { Audio } from "expo-av";

interface AudioPlayerProps {
    audioUrl: string;
}

/**
 * Custom audio player component with playback controls.
 * Uses Claude palette for consistent styling.
 */
export default function AudioPlayer({ audioUrl }: AudioPlayerProps) {
    const [isPlaying, setIsPlaying] = useState(false);
    const [position, setPosition] = useState(0);
    const [duration, setDuration] = useState(0);
    const [sound, setSound] = useState<Audio.Sound | null>(null);

    const formatTime = (milliseconds: number) => {
        const totalSeconds = Math.floor(milliseconds / 1000);
        const minutes = Math.floor(totalSeconds / 60);
        const seconds = totalSeconds % 60;
        return `${minutes}:${seconds.toString().padStart(2, '0')}`;
    };

    const handlePlayPause = async () => {
        try {
            if (!sound) {
                // Load and play audio
                const { sound: newSound } = await Audio.Sound.createAsync(
                    { uri: audioUrl },
                    { shouldPlay: true },
                    onPlaybackStatusUpdate
                );
                setSound(newSound);
                setIsPlaying(true);
            } else {
                if (isPlaying) {
                    await sound.pauseAsync();
                    setIsPlaying(false);
                } else {
                    await sound.playAsync();
                    setIsPlaying(true);
                }
            }
        } catch (error) {
            console.error("Error playing audio:", error);
        }
    };

    const onPlaybackStatusUpdate = (status: any) => {
        if (status.isLoaded) {
            setPosition(status.positionMillis);
            setDuration(status.durationMillis || 0);
            setIsPlaying(status.isPlaying);

            if (status.didJustFinish) {
                setIsPlaying(false);
                setPosition(0);
            }
        }
    };

    const progressPercentage = duration > 0 ? (position / duration) * 100 : 0;

    return (
        <View className="bg-claude-paper rounded-xl p-5 border border-claude-border">
            <View className="flex-row items-center mb-4">
                <Ionicons name="mic-outline" size={20} color="#66605B" />
                <Text className="text-base font-serif text-claude-text ml-2">
                    Voice Recording
                </Text>
            </View>

            {/* Waveform Visualization (Simplified) */}
            <View className="h-16 bg-claude-surface rounded-lg mb-4 flex-row items-center justify-center px-2">
                {[...Array(30)].map((_, i) => {
                    const height = Math.random() * 40 + 10;
                    const isActive = (i / 30) * 100 < progressPercentage;
                    return (
                        <View
                            key={i}
                            className="flex-1 mx-0.5 rounded-full"
                            style={{
                                height: height,
                                backgroundColor: isActive ? '#DA7756' : '#DEDBD2',
                            }}
                        />
                    );
                })}
            </View>

            {/* Progress Bar */}
            <View className="h-1 bg-claude-surface rounded-full mb-3">
                <View
                    className="h-full bg-claude-accent rounded-full"
                    style={{ width: `${progressPercentage}%` }}
                />
            </View>

            {/* Time Display */}
            <View className="flex-row justify-between mb-4">
                <Text className="text-sm text-claude-muted">
                    {formatTime(position)}
                </Text>
                <Text className="text-sm text-claude-muted">
                    {formatTime(duration)}
                </Text>
            </View>

            {/* Playback Controls */}
            <View className="flex-row justify-center items-center">
                <TouchableOpacity
                    className="bg-claude-accent rounded-full w-14 h-14 items-center justify-center active:bg-claude-accentHover"
                    onPress={handlePlayPause}
                >
                    <Ionicons
                        name={isPlaying ? "pause" : "play"}
                        size={28}
                        color="white"
                    />
                </TouchableOpacity>
            </View>
        </View>
    );
}
