import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

interface MonthlyScansWidgetProps {
    scanCount: number;
    scanLimit: number;
}

export default function MonthlyScansWidget({ scanCount, scanLimit }: MonthlyScansWidgetProps) {
    const remaining = Math.max(0, scanLimit - scanCount);
    const progress = Math.min(1, scanCount / scanLimit);

    return (
        <LinearGradient
            colors={['rgba(30, 41, 59, 0.6)', 'rgba(15, 23, 42, 0.8)']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.container}
        >
            <Text style={styles.text}>Nog {remaining} maandelijkse digitale bonnen</Text>

            <View style={styles.progressBarContainer}>
                <LinearGradient
                    colors={['#22D3EE', '#6366F1']}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                    style={[styles.progressBar, { width: `${progress * 100}%` }]}
                />
            </View>
        </LinearGradient>
    );
}

const styles = StyleSheet.create({
    container: {
        borderRadius: 20,
        padding: 20,
        marginHorizontal: 24,
        marginBottom: 20,
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.05)',
    },
    text: {
        fontSize: 16,
        fontWeight: '600',
        color: '#FFFFFF',
        marginBottom: 16,
    },
    progressBarContainer: {
        height: 8,
        backgroundColor: 'rgba(255, 255, 255, 0.1)',
        borderRadius: 4,
        overflow: 'hidden',
        marginBottom: 8,
    },
    progressBar: {
        height: '100%',
        backgroundColor: '#22D3EE', // Neon Cyan
        borderRadius: 4,
    },
    percentageText: {
        fontSize: 12,
        color: '#64748B', // Slate-500
        textAlign: 'right',
    },
});
