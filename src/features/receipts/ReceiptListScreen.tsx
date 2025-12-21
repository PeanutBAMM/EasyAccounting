import React, { useCallback, useState } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    FlatList,
    RefreshControl,
    Platform,
    StatusBar,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useFocusEffect, NavigationProp } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient';
import { supabase } from '../../lib/supabase';
import { useAuthStore } from '../auth/authStore';
import { formatCurrency, toTitleCase } from '../../utils/formatters';

type RootStackParamList = {
    ReceiptDetail: { receiptId: string };
};

export default function ReceiptListScreen() {
    const navigation = useNavigation<NavigationProp<RootStackParamList>>();
    const user = useAuthStore(state => state.user);
    const [receipts, setReceipts] = useState<any[]>([]);
    const [refreshing, setRefreshing] = useState(false);
    const [loading, setLoading] = useState(true);

    const fetchReceipts = async () => {
        if (!user) return;
        try {
            const { data, error } = await supabase
                .from('receipts')
                .select('*')
                .eq('user_id', user.id)
                .order('transaction_date', { ascending: false });

            if (error) {
                console.error('Error fetching receipts:', error);
            } else if (data) {
                setReceipts(data);
            }
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    useFocusEffect(
        useCallback(() => {
            fetchReceipts();
        }, [user])
    );

    const onRefresh = useCallback(() => {
        setRefreshing(true);
        fetchReceipts();
    }, []);

    const formatDate = (dateString: string) => {
        if (!dateString) return 'Geen datum';
        return new Date(dateString).toLocaleDateString('nl-NL', {
            day: 'numeric', month: 'short'
        });
    };

    const renderItem = ({ item }: { item: any }) => (
        <TouchableOpacity
            style={styles.card}
            activeOpacity={0.8}
            onPress={() => navigation.navigate('ReceiptDetail', { receiptId: item.id })}
        >
            <View style={styles.cardLeft}>
                <View style={[styles.statusIndicator, {
                    backgroundColor: item.status === 'review_required' ? '#6366F1' :
                        item.status === 'processing' ? '#94A3B8' : '#22D3EE'
                }]} />
                <View>
                    <Text style={styles.merchantName} numberOfLines={1}>
                        {toTitleCase(item.merchant_name || 'Nieuw Bonnetje')}
                    </Text>
                    <Text style={styles.dateText}>{formatDate(item.transaction_date || item.created_at)}</Text>
                </View>
            </View>

            <View style={styles.cardRight}>
                <Text style={styles.amountText}>{formatCurrency(item.total_amount || 0)}</Text>
                <View style={styles.statusBadge}>
                    {item.is_synced ? (
                        <Ionicons name="cloud-done" size={14} color="#22D3EE" />
                    ) : (
                        <Text style={styles.statusText}>{item.status === 'processing' ? 'Verwerken...' : 'Concept'}</Text>
                    )}
                </View>
            </View>
        </TouchableOpacity>
    );

    return (
        <View style={styles.container}>
            <LinearGradient colors={['#0F172A', '#000000']} style={StyleSheet.absoluteFill} />
            <StatusBar barStyle="light-content" />

            <SafeAreaView style={styles.safeArea}>
                <View style={styles.header}>
                    <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
                        <Ionicons name="chevron-back" size={28} color="white" />
                    </TouchableOpacity>
                    <Text style={styles.title}>Mijn Bonnetjes</Text>
                    <View style={{ width: 28 }} />
                </View>

                <FlatList
                    data={receipts}
                    renderItem={renderItem}
                    keyExtractor={(item) => item.id}
                    contentContainerStyle={styles.listContent}
                    showsVerticalScrollIndicator={false}
                    refreshControl={
                        <RefreshControl
                            refreshing={refreshing}
                            onRefresh={onRefresh}
                            tintColor="#22D3EE"
                        />
                    }
                    ListEmptyComponent={
                        !loading ? (
                            <View style={styles.emptyState}>
                                <View style={styles.emptyIconContainer}>
                                    <Ionicons name="receipt-outline" size={48} color="#22D3EE" />
                                </View>
                                <Text style={styles.emptyText}>Nog geen bonnetjes</Text>
                                <Text style={styles.emptySubText}>Scan je eerste bon om te beginnen.</Text>
                            </View>
                        ) : null
                    }
                />
            </SafeAreaView>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    safeArea: {
        flex: 1,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 20,
        paddingTop: Platform.OS === 'ios' ? 0 : 16,
        paddingBottom: 20,
    },
    backButton: {
        padding: 4,
    },
    title: {
        fontSize: 20,
        fontWeight: 'bold',
        color: '#FFF',
    },
    listContent: {
        paddingHorizontal: 20,
        paddingBottom: 40,
        flexGrow: 1,
    },
    card: {
        backgroundColor: 'rgba(30, 41, 59, 0.4)',
        borderRadius: 20,
        padding: 16,
        marginBottom: 12,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.08)',
    },
    cardLeft: {
        flexDirection: 'row',
        alignItems: 'center',
        flex: 1,
    },
    statusIndicator: {
        width: 10,
        height: 10,
        borderRadius: 5,
        marginRight: 16,
    },
    cardRight: {
        alignItems: 'flex-end',
        marginLeft: 12,
    },
    merchantName: {
        fontSize: 15,
        fontWeight: '600',
        color: '#F8FAFC',
        marginBottom: 2,
    },
    dateText: {
        fontSize: 12,
        color: '#94A3B8',
    },
    amountText: {
        fontSize: 16,
        fontWeight: 'bold',
        color: '#22D3EE',
        textShadowColor: 'rgba(34, 211, 238, 0.4)',
        textShadowOffset: { width: 0, height: 0 },
        textShadowRadius: 8,
    },
    statusBadge: {
        marginTop: 4,
    },
    statusText: {
        fontSize: 10,
        color: '#64748B',
        textTransform: 'uppercase',
        fontWeight: '700',
        letterSpacing: 0.5,
    },
    emptyState: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        marginTop: 100,
    },
    emptyIconContainer: {
        width: 100,
        height: 100,
        borderRadius: 50,
        backgroundColor: 'rgba(34, 211, 238, 0.1)',
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 20,
    },
    emptyText: {
        color: '#F8FAFC',
        fontSize: 18,
        fontWeight: 'bold',
    },
    emptySubText: {
        color: '#94A3B8',
        fontSize: 14,
        marginTop: 8,
        textAlign: 'center',
        paddingHorizontal: 40,
    },
});
