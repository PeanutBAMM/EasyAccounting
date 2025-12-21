import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
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
                {receipts.map((receipt) => (
                    <ReceiptTile
                        key={receipt.id}
                        receipt={receipt}
                        onPress={onReceiptPress}
                    />
                ))}
            </View>

            {receipts.length > 0 && (
                <TouchableOpacity
                    style={styles.showMoreButton}
                    onPress={onShowMorePress}
                    activeOpacity={0.7}
                >
                    <Text style={styles.showMoreText}>Toon meer bonnetjes &gt;</Text>
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
    showMoreButton: {
        marginTop: 4,
        paddingVertical: 12,
        alignItems: 'center',
        backgroundColor: 'rgba(34, 211, 238, 0.08)',
        borderRadius: 12,
        borderWidth: 1,
        borderColor: 'rgba(34, 211, 238, 0.15)',
    },
    showMoreText: {
        color: '#22D3EE',
        fontWeight: '600',
        fontSize: 14,
    },
});
