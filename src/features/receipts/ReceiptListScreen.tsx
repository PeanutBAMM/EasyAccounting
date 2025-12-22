import React, { useCallback, useState } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    FlatList,
    RefreshControl,
    Modal,
    Pressable,
    ScrollView,
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
    Profile: undefined;
};

interface ReceiptWithItems {
    id: string;
    merchant_name: string;
    total_amount: number;
    transaction_date: string;
    created_at: string;
    status: string;
    is_synced: boolean;
    category: string;
    receipt_items: {
        total_price: number;
        vat_code: string;
        rgs_code: string;
    }[];
}

const MONTHS = [
    'Januari', 'Februari', 'Maart', 'April', 'Mei', 'Juni',
    'Juli', 'Augustus', 'September', 'Oktober', 'November', 'December'
];

type FilterType = 'month' | 'rgs' | 'price';

export default function ReceiptListScreen() {
    const navigation = useNavigation<NavigationProp<RootStackParamList>>();
    const user = useAuthStore(state => state.user);
    const [receipts, setReceipts] = useState<ReceiptWithItems[]>([]);
    const [refreshing, setRefreshing] = useState(false);
    const [loading, setLoading] = useState(true);

    // Filter States
    const [selectedMonth, setSelectedMonth] = useState<number>(new Date().getMonth());
    const [selectedYear] = useState<number>(new Date().getFullYear());
    const [filterCategory] = useState<string | null>(null);
    const [filterRGS, setFilterRGS] = useState<string | null>(null);
    const [filterPriceRange, setFilterPriceRange] = useState<string | null>(null);

    // Filter Sources

    const [availableRGS, setAvailableRGS] = useState<string[]>([]);

    // UI States
    const [activeModal, setActiveModal] = useState<FilterType | null>(null);

    const fetchReceipts = useCallback(async () => {
        if (!user) return;
        setLoading(true);

        try {
            // We filter by created_at (scan date)
            const startOfMonth = new Date(selectedYear, selectedMonth, 1).toISOString();
            const endOfMonth = new Date(selectedYear, selectedMonth + 1, 0, 23, 59, 59).toISOString();

            let query = supabase
                .from('receipts')
                .select(`
                    *,
                    receipt_items (
                        total_price,
                        vat_code,
                        rgs_code
                    )
                `)
                .eq('user_id', user.id)
                .gte('created_at', startOfMonth)
                .lte('created_at', endOfMonth)
                .order('created_at', { ascending: false });

            if (filterCategory) {
                query = query.eq('category', filterCategory);
            }

            // Price filtering (Double check logic)
            if (filterPriceRange) {
                if (filterPriceRange === '<10') query = query.lt('total_amount', 10);
                else if (filterPriceRange === '10-50') query = query.gte('total_amount', 10).lte('total_amount', 50);
                else if (filterPriceRange === '50-100') query = query.gte('total_amount', 50).lte('total_amount', 100);
                else if (filterPriceRange === '>100') query = query.gt('total_amount', 100);
            }

            const { data, error } = await query;

            if (error) {
                console.error('Error fetching receipts:', error);
            } else if (data) {
                let processedData = (data as any[]).map(r => ({
                    ...r,
                    receipt_items: r.receipt_items || []
                }));

                // Client-side filtering for RGS (nested)
                if (filterRGS && filterRGS !== 'Alle') {
                    processedData = processedData.filter(r =>
                        r.receipt_items?.some((item: any) => item.rgs_code === filterRGS)
                    );
                }

                setReceipts(processedData);


                const rgsCodes = Array.from(new Set(data.flatMap(r =>
                    r.receipt_items?.map((item: any) => item.rgs_code).filter(Boolean)
                )));
                setAvailableRGS(['Alle', ...(rgsCodes as string[])]);
            }
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, [user, selectedMonth, selectedYear, filterCategory, filterRGS, filterPriceRange]);

    useFocusEffect(
        useCallback(() => {
            fetchReceipts();
        }, [fetchReceipts])
    );

    const onRefresh = useCallback(() => {
        setRefreshing(true);
        fetchReceipts();
    }, [fetchReceipts]);

    const formatDateCompact = (dateString: string) => {
        if (!dateString) return '--/--/--';
        const d = new Date(dateString);
        const day = String(d.getDate()).padStart(2, '0');
        const month = String(d.getMonth() + 1).padStart(2, '0');
        const year = String(d.getFullYear()).slice(-2);
        return `${day}/${month}/${year}`;
    };

    const getVATData = (items: any[]) => {
        const vat21 = items?.filter(i => i.vat_code === '21%').reduce((sum, i) => sum + (Number(i.total_price) || 0) * 0.21, 0) || 0;
        const vat9 = items?.filter(i => i.vat_code === '9%').reduce((sum, i) => sum + (Number(i.total_price) || 0) * 0.09, 0) || 0;
        return { vat21, vat9 };
    };

    const renderDropdownModal = () => {
        if (!activeModal) return null;

        let options: { label: string; value: any }[] = [];
        let currentValue: any;
        let onSelect: (val: any) => void;
        let title = "";

        if (activeModal === 'month') {
            title = "Selecteer Maand";
            options = MONTHS.map((m, i) => ({ label: m, value: i }));
            currentValue = selectedMonth;
            onSelect = (val) => setSelectedMonth(val);
        } else if (activeModal === 'rgs') {
            title = "Boekhoudcode";
            options = availableRGS.map(r => ({ label: r, value: r }));
            currentValue = filterRGS || 'Alle';
            onSelect = (val) => setFilterRGS(val === 'Alle' ? null : val);
        } else if (activeModal === 'price') {
            title = "Prijs Filter";
            options = [
                { label: 'Alles', value: null },
                { label: '< €10', value: '<10' },
                { label: '€10 - €50', value: '10-50' },
                { label: '€50 - €100', value: '50-100' },
                { label: '> €100', value: '>100' },
            ];
            currentValue = filterPriceRange;
            onSelect = (val) => setFilterPriceRange(val);
        }

        return (
            <Modal transparent visible animationType="fade" onRequestClose={() => setActiveModal(null)}>
                <Pressable style={styles.modalOverlay} onPress={() => setActiveModal(null)}>
                    <View style={styles.modalContent}>
                        <Text style={styles.modalTitle}>{title}</Text>
                        <ScrollView style={styles.modalScroll}>
                            {options.map((opt) => (
                                <TouchableOpacity
                                    key={opt.label}
                                    style={[styles.modalItem, currentValue === opt.value && styles.modalItemActive]}
                                    onPress={() => {
                                        onSelect(opt.value);
                                        setActiveModal(null);
                                    }}
                                >
                                    <Text style={[styles.modalItemText, currentValue === opt.value && styles.modalItemTextActive]}>
                                        {opt.label}
                                    </Text>
                                    {currentValue === opt.value && (
                                        <Ionicons name="checkmark" size={20} color="#22D3EE" />
                                    )}
                                </TouchableOpacity>
                            ))}
                        </ScrollView>
                    </View>
                </Pressable>
            </Modal>
        );
    };

    const renderItem = ({ item }: { item: ReceiptWithItems }) => {
        const { vat21, vat9 } = getVATData(item.receipt_items);

        return (
            <TouchableOpacity
                style={styles.tableRow}
                activeOpacity={0.7}
                onPress={() => navigation.navigate('ReceiptDetail', { receiptId: item.id })}
            >
                <View style={styles.colInfo}>
                    <View style={styles.merchantRow}>
                        <Text style={styles.rowMerchant} numberOfLines={1}>
                            {toTitleCase(item.merchant_name || 'Nieuw')}
                        </Text>
                        <Ionicons
                            name={item.is_synced ? "cloud-done" : "cloud-upload-outline"}
                            size={14}
                            color={item.is_synced ? "#3B82F6" : "#64748B"}
                            style={styles.syncIcon}
                        />
                    </View>
                    <Text style={styles.rowDate}>{formatDateCompact(item.created_at)}</Text>
                </View>

                <View style={styles.colVATStack}>
                    {vat21 > 0 && (
                        <View style={styles.vatBadge}>
                            <LinearGradient
                                colors={['#3B82F6', '#1D4ED8']}
                                style={styles.vatIconMockup}
                                start={{ x: 0, y: 0 }}
                                end={{ x: 1, y: 1 }}
                            >
                                <Text style={styles.vatNumberMockup}>21</Text>
                                <Text style={styles.vatSymbolMockup}>%</Text>
                            </LinearGradient>
                            <Text style={[styles.vatAmount, { color: '#3B82F6' }]}>€{vat21.toFixed(2)}</Text>
                        </View>
                    )}
                    {vat9 > 0 && (
                        <View style={styles.vatBadge}>
                            <LinearGradient
                                colors={['#A855F7', '#7E22CE']}
                                style={styles.vatIconMockup}
                                start={{ x: 0, y: 0 }}
                                end={{ x: 1, y: 1 }}
                            >
                                <Text style={styles.vatNumberMockup}>9</Text>
                                <Text style={styles.vatSymbolMockup}>%</Text>
                            </LinearGradient>
                            <Text style={[styles.vatAmount, { color: '#A855F7' }]}>€{vat9.toFixed(2)}</Text>
                        </View>
                    )}
                </View>

                <View style={styles.colTotal}>
                    <Text style={styles.rowTotal}>{formatCurrency(item.total_amount || 0)}</Text>
                </View>
            </TouchableOpacity>
        );
    };

    return (
        <View style={styles.container}>
            <LinearGradient colors={['#0F172A', '#000000']} style={StyleSheet.absoluteFill} />
            <StatusBar barStyle="light-content" />

            <SafeAreaView style={styles.safeArea} edges={['top']}>
                <View style={styles.header}>
                    <Text style={styles.title}>Bonnetjes Overzicht</Text>
                </View>

                {/* Filters Section */}
                <View style={styles.filterBar}>
                    <TouchableOpacity style={styles.dropdownTrigger} onPress={() => setActiveModal('month')}>
                        <Text style={styles.dropdownLabel}>Maand</Text>
                        <View style={styles.dropdownValueRow}>
                            <Text style={styles.dropdownValue}>{MONTHS[selectedMonth]}</Text>
                            <Ionicons name="chevron-down" size={14} color="#22D3EE" />
                        </View>
                    </TouchableOpacity>

                    <TouchableOpacity style={styles.dropdownTrigger} onPress={() => setActiveModal('rgs')}>
                        <Text style={styles.dropdownLabel}>Boekhoudcode</Text>
                        <View style={styles.dropdownValueRow}>
                            <Text style={styles.dropdownValue} numberOfLines={1}>{filterRGS || 'Alle'}</Text>
                            <Ionicons name="filter" size={14} color="#22D3EE" />
                        </View>
                    </TouchableOpacity>

                    <TouchableOpacity style={styles.dropdownTrigger} onPress={() => setActiveModal('price')}>
                        <Text style={styles.dropdownLabel}>Prijs</Text>
                        <View style={styles.dropdownValueRow}>
                            <Text style={styles.dropdownValue}>{filterPriceRange ? (filterPriceRange === '<10' ? '<€10' : filterPriceRange === '>100' ? '>€100' : `€${filterPriceRange}`) : 'Alle'}</Text>
                            <Ionicons name="cash-outline" size={14} color="#22D3EE" />
                        </View>
                    </TouchableOpacity>
                </View>

                {/* List Header */}
                <View style={styles.tableHeader}>
                    <Text style={[styles.headerLabel, { flex: 2 }]}>Detail / Scan Datum</Text>
                    <Text style={[styles.headerLabel, { flex: 1.5, textAlign: 'center' }]}>BTW (21/9)</Text>
                    <Text style={[styles.headerLabel, { flex: 1, textAlign: 'right' }]}>Totaal</Text>
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
                                <Ionicons name="receipt-outline" size={48} color="rgba(34, 211, 238, 0.2)" />
                                <Text style={styles.emptyText}>Geen bonnetjes gevonden</Text>
                                <Text style={styles.emptySubText}>Scan een bon om deze hier te zien.</Text>
                            </View>
                        ) : null
                    }
                />
            </SafeAreaView>

            {renderDropdownModal()}
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
        paddingHorizontal: 20,
        paddingVertical: 16,
        alignItems: 'center',
    },
    title: {
        fontSize: 20,
        fontWeight: '900',
        color: '#FFF',
        letterSpacing: 0.5,
        textTransform: 'uppercase',
    },
    filterBar: {
        flexDirection: 'row',
        paddingHorizontal: 16,
        marginBottom: 16,
        gap: 8,
    },
    dropdownTrigger: {
        flex: 1,
        backgroundColor: 'rgba(255, 255, 255, 0.05)',
        borderRadius: 12,
        padding: 10,
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.1)',
    },
    dropdownLabel: {
        fontSize: 9,
        color: '#64748B',
        fontWeight: '800',
        textTransform: 'uppercase',
        marginBottom: 4,
    },
    dropdownValueRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
    },
    dropdownValue: {
        fontSize: 12,
        color: '#F8FAFC',
        fontWeight: '700',
        flex: 1,
        marginRight: 4,
    },
    tableHeader: {
        flexDirection: 'row',
        paddingHorizontal: 20,
        paddingVertical: 10,
        borderBottomWidth: 1,
        borderBottomColor: 'rgba(255, 255, 255, 0.05)',
        backgroundColor: 'rgba(15, 23, 42, 0.8)',
    },
    headerLabel: {
        fontSize: 9,
        color: '#94A3B8',
        fontWeight: '800',
        textTransform: 'uppercase',
        letterSpacing: 1,
    },
    listContent: {
        paddingBottom: 40,
        flexGrow: 1,
    },
    tableRow: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 20,
        paddingVertical: 12,
        borderBottomWidth: 1,
        borderBottomColor: 'rgba(255, 255, 255, 0.03)',
    },
    colInfo: {
        flex: 2,
    },
    merchantRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 4,
    },
    rowMerchant: {
        fontSize: 14,
        fontWeight: '700',
        color: '#F8FAFC',
        maxWidth: '85%',
    },
    syncIcon: {
        marginLeft: 6,
    },
    rowDate: {
        fontSize: 11,
        color: '#64748B',
        fontWeight: '600',
    },
    colVATStack: {
        flex: 1.5,
        justifyContent: 'center',
        gap: 4,
    },
    vatBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
    },
    vatIconMockup: {
        width: 30,
        height: 24,
        borderRadius: 6,
        justifyContent: 'center',
        alignItems: 'center',
        flexDirection: 'row',
        paddingHorizontal: 2,
    },
    vatNumberMockup: {
        fontSize: 11,
        fontWeight: '900',
        color: 'white',
        marginRight: 1,
    },
    vatSymbolMockup: {
        fontSize: 10,
        fontWeight: '800',
        color: 'white',
        opacity: 0.9,
    },
    vatAmount: {
        fontSize: 10,
        fontWeight: '700',
    },
    colTotal: {
        flex: 1,
        alignItems: 'flex-end',
    },
    rowTotal: {
        fontSize: 15,
        fontWeight: '900',
        color: '#22D3EE',
    },
    emptyState: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        marginTop: 100,
    },
    emptyText: {
        color: '#F8FAFC',
        fontSize: 16,
        fontWeight: '700',
        marginTop: 16,
    },
    emptySubText: {
        color: '#64748B',
        fontSize: 13,
        marginTop: 8,
        textAlign: 'center',
    },
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.7)',
        justifyContent: 'center',
        padding: 24,
    },
    modalContent: {
        backgroundColor: '#1E293B',
        borderRadius: 24,
        padding: 20,
        maxHeight: '70%',
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.1)',
    },
    modalTitle: {
        fontSize: 18,
        fontWeight: '900',
        color: '#FFF',
        marginBottom: 20,
        textAlign: 'center',
    },
    modalScroll: {
        gap: 4,
    },
    modalItem: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingVertical: 14,
        paddingHorizontal: 16,
        borderRadius: 12,
    },
    modalItemActive: {
        backgroundColor: 'rgba(34, 211, 238, 0.1)',
    },
    modalItemText: {
        color: '#94A3B8',
        fontSize: 15,
        fontWeight: '600',
    },
    modalItemTextActive: {
        color: '#FFF',
        fontWeight: '800',
    },
});
