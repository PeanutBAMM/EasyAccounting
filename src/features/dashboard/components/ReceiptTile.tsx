import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { formatCurrency, toTitleCase } from '../../../utils/formatters';
import { RecentReceiptSummary } from '../dashboardService';

interface ReceiptTileProps {
    receipt: RecentReceiptSummary;
    onPress: (id: string) => void;
}

export default function ReceiptTile({ receipt, onPress }: ReceiptTileProps) {
    return (
        <TouchableOpacity
            style={styles.container}
            activeOpacity={0.8}
            onPress={() => onPress(receipt.id)}
        >
            <View style={styles.header}>
                <Text style={styles.merchantName} numberOfLines={1}>
                    {toTitleCase(receipt.merchant_name)}
                </Text>
                {receipt.is_synced && (
                    <Ionicons name="cloud-done" size={16} color="#22C55E" />
                )}
            </View>

            <View style={styles.amountContainer}>
                <Text style={styles.totalAmount}>{formatCurrency(receipt.total_amount)}</Text>
            </View>

            <View style={styles.vatContainer}>
                {receipt.btw21 > 0 && (
                    <View style={styles.vatItem}>
                        <View style={[styles.vatIcon, { backgroundColor: '#22D3EE' }]} />
                        <Text style={styles.vatAmount}>{formatCurrency(receipt.btw21)}</Text>
                    </View>
                )}
                {receipt.btw9 > 0 && (
                    <View style={styles.vatItem}>
                        <View style={[styles.vatIcon, { backgroundColor: '#6366F1' }]} />
                        <Text style={styles.vatAmount}>{formatCurrency(receipt.btw9)}</Text>
                    </View>
                )}
            </View>
        </TouchableOpacity>
    );
}

const styles = StyleSheet.create({
    container: {
        width: '48%',
        backgroundColor: 'rgba(30, 41, 59, 0.4)',
        borderRadius: 20,
        padding: 16,
        marginBottom: 16,
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.08)',
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 12,
    },
    merchantName: {
        fontSize: 13,
        color: '#F8FAFC',
        fontWeight: '500',
        flex: 1,
        marginRight: 4,
    },
    amountContainer: {
        marginBottom: 14,
    },
    totalAmount: {
        fontSize: 20,
        fontWeight: 'bold',
        color: '#22D3EE',
        textShadowColor: 'rgba(34, 211, 238, 0.6)',
        textShadowOffset: { width: 0, height: 0 },
        textShadowRadius: 12,
    },
    vatContainer: {
        gap: 4,
    },
    vatItem: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    vatIcon: {
        width: 8,
        height: 8,
        borderRadius: 4,
        marginRight: 6,
    },
    vatAmount: {
        fontSize: 10,
        color: '#94A3B8',
        fontWeight: '500',
    },
});
