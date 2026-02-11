import { View, Text, Dimensions } from "react-native";
import { LineChart } from "react-native-chart-kit";

interface MoodChartProps {
    data?: number[];
}

/**
 * Mood chart component showing weekly mood trends.
 * Uses Claude palette colors for visualization.
 */
export default function MoodChart({ data = [7, 6.5, 8, 7.5, 8.5, 7, 8] }: MoodChartProps) {
    const screenWidth = Dimensions.get("window").width - 32; // Account for padding

    const chartConfig = {
        backgroundColor: "#F5F2EB",
        backgroundGradientFrom: "#F5F2EB",
        backgroundGradientTo: "#F5F2EB",
        decimalPlaces: 1,
        color: (opacity = 1) => `rgba(218, 119, 86, ${opacity})`, // claude-accent
        labelColor: (opacity = 1) => `rgba(45, 41, 38, ${opacity})`, // claude-text
        style: {
            borderRadius: 16,
        },
        propsForDots: {
            r: "6",
            strokeWidth: "2",
            stroke: "#DA7756", // claude-accent
        },
    };

    const chartData = {
        labels: ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"],
        datasets: [
            {
                data: data,
                color: (opacity = 1) => `rgba(218, 119, 86, ${opacity})`, // claude-accent
                strokeWidth: 3,
            },
        ],
    };

    return (
        <View className="bg-claude-paper rounded-xl p-5 border border-claude-border">
            <Text className="text-lg font-serif text-claude-text mb-4">
                Weekly Mood Trend
            </Text>

            <LineChart
                data={chartData}
                width={screenWidth - 40}
                height={220}
                chartConfig={chartConfig}
                bezier
                style={{
                    borderRadius: 12,
                }}
                withInnerLines={false}
                withOuterLines={true}
                withVerticalLines={false}
                withHorizontalLines={true}
                fromZero={false}
                segments={4}
            />

            <View className="flex-row justify-between mt-4">
                <View className="items-center">
                    <Text className="text-2xl mb-1">📈</Text>
                    <Text className="text-sm text-claude-muted">Trending Up</Text>
                </View>
                <View className="items-center">
                    <Text className="text-2xl mb-1">
                        {(data.reduce((a, b) => a + b, 0) / data.length).toFixed(1)}
                    </Text>
                    <Text className="text-sm text-claude-muted">Avg Mood</Text>
                </View>
                <View className="items-center">
                    <Text className="text-2xl mb-1">{Math.max(...data)}</Text>
                    <Text className="text-sm text-claude-muted">Peak</Text>
                </View>
            </View>
        </View>
    );
}
