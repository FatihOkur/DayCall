/**
 * Call time step.
 * Android: imperative DateTimePickerAndroid.open() dialog.
 * iOS: Modal overlay with spinner picker + done button.
 */

import { useState } from "react";
import {
    View,
    Text,
    TouchableOpacity,
    Modal,
    Platform,
    StyleSheet,
} from "react-native";
import DateTimePicker, {
    DateTimePickerAndroid,
    type DateTimePickerEvent,
} from "@react-native-community/datetimepicker";
import { QAStepLayout } from "./QAStepLayout";
import { onboardingCopy } from "../copy";
import { useOnboardingStore } from "../onboardingStore";
import { useThemeColors } from "../../../theme";

function formatTimeWindow(hour: number): string {
    const start = String(hour).padStart(2, "0");
    const end = String((hour + 1) % 24).padStart(2, "0");
    return `${start}:00 - ${end}:00`;
}

export function CallTimeStep() {
    const colors = useThemeColors();
    const callTimeHour = useOnboardingStore((s) => s.answers.callTimeHour);
    const setAnswer = useOnboardingStore((s) => s.setAnswer);
    const [modalVisible, setModalVisible] = useState(false);

    const buildDate = (hour: number) => {
        const d = new Date();
        d.setHours(hour, 0, 0, 0);
        return d;
    };

    const currentDate = buildDate(callTimeHour ?? 9);
    const [tempDate, setTempDate] = useState(currentDate);

    const openAndroidPicker = () => {
        DateTimePickerAndroid.open({
            value: currentDate,
            mode: "time",
            display: "default",
            is24Hour: true,
            onChange: (event: DateTimePickerEvent, selected?: Date) => {
                if (event.type === "dismissed") return;
                if (selected) setAnswer("callTimeHour", selected.getHours());
            },
        });
    };

    const handlePress = () => {
        if (Platform.OS === "android") {
            openAndroidPicker();
            return;
        }
        setTempDate(currentDate);
        setModalVisible(true);
    };

    const handleIOSDone = () => {
        setAnswer("callTimeHour", tempDate.getHours());
        setModalVisible(false);
    };

    const handleIOSCancel = () => {
        setModalVisible(false);
    };

    const onIOSChange = (_event: DateTimePickerEvent, selected?: Date) => {
        if (selected) setTempDate(selected);
    };

    const displayText =
        callTimeHour != null
            ? formatTimeWindow(callTimeHour)
            : onboardingCopy.callTimePlaceholder;

    return (
        <QAStepLayout question={onboardingCopy.callTimeQuestion}>
            <Text style={[styles.subtitle, { color: colors.textMuted }]}>
                {onboardingCopy.callTimeSubtitle}
            </Text>

            <TouchableOpacity
                onPress={handlePress}
                activeOpacity={0.7}
                style={[
                    styles.trigger,
                    {
                        backgroundColor: colors.inputBg,
                        borderColor: colors.border,
                    },
                ]}
            >
                <Text
                    style={[
                        styles.triggerText,
                        {
                            color: callTimeHour != null
                                ? colors.textPrimary
                                : colors.textMuted,
                        },
                    ]}
                >
                    {displayText}
                </Text>
            </TouchableOpacity>

            {Platform.OS === "ios" && (
                <Modal
                    visible={modalVisible}
                    transparent
                    animationType="slide"
                    onRequestClose={handleIOSCancel}
                >
                    <View style={styles.modalOverlay}>
                        <View
                            style={[
                                styles.modalContent,
                                { backgroundColor: colors.surface },
                            ]}
                        >
                            <View style={styles.modalHeader}>
                                <TouchableOpacity onPress={handleIOSCancel}>
                                    <Text
                                        style={[
                                            styles.modalHeaderBtn,
                                            { color: colors.textMuted },
                                        ]}
                                    >
                                        Cancel
                                    </Text>
                                </TouchableOpacity>
                                <TouchableOpacity onPress={handleIOSDone}>
                                    <Text
                                        style={[
                                            styles.modalHeaderBtn,
                                            { color: colors.accentPrimary },
                                        ]}
                                    >
                                        Done
                                    </Text>
                                </TouchableOpacity>
                            </View>
                            <DateTimePicker
                                value={tempDate}
                                mode="time"
                                display="spinner"
                                is24Hour
                                onChange={onIOSChange}
                                themeVariant="dark"
                                style={styles.picker}
                            />
                        </View>
                    </View>
                </Modal>
            )}
        </QAStepLayout>
    );
}

const styles = StyleSheet.create({
    subtitle: {
        fontSize: 14,
        marginBottom: 12,
    },
    trigger: {
        borderWidth: 1,
        borderRadius: 12,
        paddingHorizontal: 16,
        paddingVertical: 14,
        minHeight: 52,
        justifyContent: "center",
    },
    triggerText: {
        fontSize: 16,
        fontWeight: "600",
    },
    modalOverlay: {
        flex: 1,
        justifyContent: "flex-end",
        backgroundColor: "rgba(0,0,0,0.5)",
    },
    modalContent: {
        borderTopLeftRadius: 16,
        borderTopRightRadius: 16,
        paddingBottom: 32,
    },
    modalHeader: {
        flexDirection: "row",
        justifyContent: "space-between",
        paddingHorizontal: 20,
        paddingVertical: 14,
    },
    modalHeaderBtn: {
        fontSize: 17,
        fontWeight: "600",
    },
    picker: {
        height: 216,
    },
});
