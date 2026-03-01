/**
 * Gradient screen background -- bgBase -> bgSurface -> bgRaised diagonal.
 */

import { StyleSheet } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { useTheme } from "../theme";

interface Props {
    children: React.ReactNode;
}

export function ScreenBackground({ children }: Props) {
    const { theme } = useTheme();

    return (
        <LinearGradient
            colors={[theme.bgBase, theme.bgBase, theme.bgSurface, theme.bgRaised]}
            locations={[0, 0.4, 0.75, 1]}
            start={{ x: 0, y: 0 }}
            end={{ x: 0.6, y: 1 }}
            style={StyleSheet.absoluteFill}
        >
            {children}
        </LinearGradient>
    );
}
