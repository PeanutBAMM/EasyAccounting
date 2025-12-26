import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { RecentReceiptSummary } from '../dashboardService';
import ReceiptTile from './ReceiptTile';

interface RecentReceiptsGridProps {
    receipts: RecentReceiptSummary[];
    onReceiptPress: (id: string) => void;
    onShowMorePress: () => void;
}

export default function RecentReceiptsGrid({ receipts, onReceiptPress, onShowMorePress }: RecentReceiptsGridProps) {
    return (
        <View style={styles.container}>
            <Text style={styles.title}>Recente Bonnetjes</Text>

            <View style={styles.grid}>
                {receipts.length > 0 ? (
                    receipts.map((receipt) => (
                        <ReceiptTile
                            key={receipt.id}
                            receipt={receipt}
                            onPress={onReceiptPress}
                        />
                    ))
                ) : (
                    <View style={styles.emptyStateContainer}>
                        <Text style={styles.emptyStateText}>Nog geen bonnetjes om te tonen</Text>
                    </View>
                )}
            </View>

            {receipts.length > 0 && (
                <TouchableOpacity
                    style={styles.showMoreContainer}
                    onPress={onShowMorePress}
                    activeOpacity={0.8}
                >
                    <LinearGradient
                        colors={['rgba(34, 211, 238, 0.15)', 'rgba(99, 102, 241, 0.15)']}
                        style={styles.showMoreGradient}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 0 }}
                    >
                        <Text style={styles.showMoreText}>Toon meer bonnetjes</Text>
                        <Ionicons name="arrow-forward" size={16} color="#22D3EE" style={{ marginLeft: 8 }} />
                    </LinearGradient>
                </TouchableOpacity>
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        paddingHorizontal: 24,
        marginBottom: 24,
    },
    title: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#FFFFFF',
        marginBottom: 12,
    },
    grid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        justifyContent: 'space-between',
    },
    showMoreContainer: {
        marginTop: 8,
        borderRadius: 16,
        overflow: 'hidden',
    },
    showMoreGradient: {
        paddingVertical: 14,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 1,
        borderColor: 'rgba(34, 211, 238, 0.3)',
        borderRadius: 16,
    },
    showMoreText: {
        color: '#22D3EE',
        fontWeight: '800',
        fontSize: 14,
        textTransform: 'uppercase',
        letterSpacing: 1,
    },
    emptyStateContainer: {
        width: '100%',
        paddingVertical: 32,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: 'rgba(30, 41, 59, 0.3)',
        borderRadius: 16,
        borderWidth: 1,
        borderStyle: 'dashed',
        borderColor: 'rgba(255, 255, 255, 0.1)',
    },
    emptyStateText: {
        color: '#64748B',
        fontSize: 14,
        fontStyle: 'italic',
    },
});
