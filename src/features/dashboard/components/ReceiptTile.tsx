import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { formatCurrency, toTitleCase } from '../../../utils/formatters';
import { RecentReceiptSummary } from '../dashboardService';

interface ReceiptTileProps {
    receipt: RecentReceiptSummary;
    onPress: (id: string) => void;
}

export default function ReceiptTile({ receipt, onPress }: ReceiptTileProps) {
    const formatDateCompact = (dateString: string) => {
        if (!dateString) return '--/--/--';
        const d = new Date(dateString);
        const day = String(d.getDate()).padStart(2, '0');
        const month = String(d.getMonth() + 1).padStart(2, '0');
        const year = String(d.getFullYear()).slice(-2);
        return `${day}/${month}/${year}`;
    };

    return (
        <TouchableOpacity
            style={styles.container}
            activeOpacity={0.8}
            onPress={() => onPress(receipt.id)}
        >
            <View style={styles.header}>
                <View style={styles.merchantRow}>
                    <Text style={styles.merchantName} numberOfLines={1}>
                        {toTitleCase(receipt.merchant_name)}
                    </Text>
                    <Ionicons
                        name={receipt.is_synced ? "cloud-done" : "sync-outline"}
                        size={14}
                        color={receipt.is_synced ? "#3B82F6" : "#64748B"}
                        style={styles.syncIcon}
                    />
                </View>
                <Text style={styles.scanDate}>{formatDateCompact(receipt.transaction_date)}</Text>
            </View>

            <View style={styles.amountContainer}>
                <Text style={styles.totalAmount}>{formatCurrency(receipt.total_amount)}</Text>
            </View>

            <View style={styles.vatContainer}>
                {/* Always show 21% */}
                <View style={styles.vatItem}>
                    <LinearGradient
                        colors={['#3B82F6', '#1D4ED8']}
                        style={styles.vatIconMockup}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 1 }}
                    >
                        <Text style={styles.vatNumberMockup}>21</Text>
                        <Text style={styles.vatSymbolMockup}>%</Text>
                    </LinearGradient>
                    <Text style={[styles.vatAmount, { color: receipt.btw21 > 0 ? '#3B82F6' : '#475569' }]}>
                        {formatCurrency(receipt.btw21)}
                    </Text>
                </View>

                {/* Always show 9% */}
                <View style={styles.vatItem}>
                    <LinearGradient
                        colors={['#A855F7', '#7E22CE']}
                        style={styles.vatIconMockup}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 1 }}
                    >
                        <Text style={styles.vatNumberMockup}>9</Text>
                        <Text style={styles.vatSymbolMockup}>%</Text>
                    </LinearGradient>
                    <Text style={[styles.vatAmount, { color: receipt.btw9 > 0 ? '#A855F7' : '#475569' }]}>
                        {formatCurrency(receipt.btw9)}
                    </Text>
                </View>
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
        marginBottom: 12,
    },
    merchantRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
    },
    merchantName: {
        fontSize: 13,
        color: '#F8FAFC',
        fontWeight: '700',
        flex: 1,
        marginRight: 4,
    },
    scanDate: {
        fontSize: 10,
        color: '#64748B',
        marginTop: 2,
        fontWeight: '600',
    },
    syncIcon: {
        marginLeft: 4,
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
    vatIconMockup: {
        width: 22,
        height: 16,
        borderRadius: 4,
        justifyContent: 'center',
        alignItems: 'center',
        flexDirection: 'row',
        paddingHorizontal: 1,
        marginRight: 6,
    },
    vatNumberMockup: {
        fontSize: 8,
        fontWeight: '900',
        color: 'white',
        marginRight: 0.5,
    },
    vatSymbolMockup: {
        fontSize: 7,
        fontWeight: '800',
        color: 'white',
        opacity: 0.9,
    },
    vatAmount: {
        fontSize: 10,
        color: '#94A3B8',
        fontWeight: '500',
    },
});
