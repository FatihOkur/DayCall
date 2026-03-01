/**
 * Birth date step.
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
import { useTheme } from "../../../theme";

function toISODate(d: Date): string {
    return d.toISOString().slice(0, 10);
}

function formatDisplayDate(isoDate: string): string {
    const d = new Date(isoDate + "T12:00:00");
    return d.toLocaleDateString(undefined, {
        day: "numeric",
        month: "long",
        year: "numeric",
    });
}

export function BirthDateStep() {
    const { theme, isDark } = useTheme();
    const birthDate = useOnboardingStore((s) => s.answers.birthDate);
    const setAnswer = useOnboardingStore((s) => s.setAnswer);
    const [modalVisible, setModalVisible] = useState(false);

    const currentDate = birthDate
        ? new Date(birthDate + "T12:00:00")
        : new Date(2000, 0, 1);

    const [tempDate, setTempDate] = useState(currentDate);

    const openAndroidPicker = () => {
        DateTimePickerAndroid.open({
            value: currentDate,
            mode: "date",
            display: "default",
            maximumDate: new Date(),
            onChange: (event: DateTimePickerEvent, selected?: Date) => {
                if (event.type === "dismissed") return;
                if (selected) setAnswer("birthDate", toISODate(selected));
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
        setAnswer("birthDate", toISODate(tempDate));
        setModalVisible(false);
    };

    const handleIOSCancel = () => {
        setModalVisible(false);
    };

    const onIOSChange = (_event: DateTimePickerEvent, selected?: Date) => {
        if (selected) setTempDate(selected);
    };

    return (
        <QAStepLayout question={onboardingCopy.birthDateQuestion}>
            <TouchableOpacity
                onPress={handlePress}
                activeOpacity={0.7}
                style={[
                    styles.trigger,
                    {
                        backgroundColor: theme.inputBg,
                        borderColor: theme.borderMedium,
                    },
                ]}
            >
                <Text
                    style={[
                        styles.triggerValue,
                        {
                            color: birthDate
                                ? theme.textPrimary
                                : theme.textMuted,
                        },
                    ]}
                >
                    {birthDate
                        ? formatDisplayDate(birthDate)
                        : onboardingCopy.birthDatePlaceholder}
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
                                { backgroundColor: theme.bgSurface },
                            ]}
                        >
                            <View style={styles.modalHeader}>
                                <TouchableOpacity onPress={handleIOSCancel}>
                                    <Text
                                        style={[
                                            styles.modalHeaderBtn,
                                            { color: theme.textMuted },
                                        ]}
                                    >
                                        Cancel
                                    </Text>
                                </TouchableOpacity>
                                <TouchableOpacity onPress={handleIOSDone}>
                                    <Text
                                        style={[
                                            styles.modalHeaderBtn,
                                            { color: theme.accent },
                                        ]}
                                    >
                                        Done
                                    </Text>
                                </TouchableOpacity>
                            </View>
                            <DateTimePicker
                                value={tempDate}
                                mode="date"
                                display="spinner"
                                maximumDate={new Date()}
                                onChange={onIOSChange}
                                themeVariant={isDark ? "dark" : "light"}
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
    trigger: {
        borderWidth: 1,
        borderRadius: 12,
        paddingHorizontal: 16,
        paddingVertical: 14,
        minHeight: 52,
        justifyContent: "center",
    },
    triggerValue: {
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
