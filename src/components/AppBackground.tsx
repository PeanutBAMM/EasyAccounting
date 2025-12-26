import React from 'react';
import { StyleSheet, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

const AppBackground = ({ children }: { children: React.ReactNode }) => {
    return (
        <View style={styles.container}>
            {/* Base Dark Gradient */}
            <LinearGradient
                colors={['#0F172A', '#020617']}
                style={StyleSheet.absoluteFill}
            />

            {/* Grid Overlay - Premium futuristic business feel */}
            <View style={styles.gridOverlay}>
                {[...Array(12)].map((_, i) => (
                    <View key={`v-${i}`} style={[styles.gridLine, { left: `${(i * 100) / 11}%`, width: 1, height: '100%' }]} />
                ))}
                {[...Array(24)].map((_, i) => (
                    <View key={`h-${i}`} style={[styles.gridLine, { top: `${(i * 100) / 23}%`, width: '100%', height: 1 }]} />
                ))}
            </View>

            {children}
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#0F172A',
    },
    gridOverlay: {
        ...StyleSheet.absoluteFillObject,
        opacity: 0.25,
    },
    gridLine: {
        position: 'absolute',
        backgroundColor: '#334155',
    }
});

export default React.memo(AppBackground);
