import React, { useState, useEffect, useCallback } from 'react';
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    TouchableOpacity,
    Image,
    TextInput,
    Alert,
    ActivityIndicator,
    Dimensions,
    Platform,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { supabase } from '../../lib/supabase';
import { DetailedReceipt, getReceiptDetail, updateReceipt, deleteReceipt, updateReceiptItems, ReceiptItem } from './receiptService';
import { toTitleCase } from '../../utils/formatters';
import LineItemEditor from './components/LineItemEditor';

const { width } = Dimensions.get('window');

type ReceiptDetailRouteProp = RouteProp<{ params: { receiptId: string } }, 'params'>;

const ReceiptDetailScreen: React.FC = () => {
    const navigation = useNavigation();
    const route = useRoute<ReceiptDetailRouteProp>();
    const { receiptId } = route.params;

    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [receipt, setReceipt] = useState<DetailedReceipt | null>(null);
    const [showImageFull, setShowImageFull] = useState(false);
    const [editingItem, setEditingItem] = useState<ReceiptItem | null>(null);
    const [isEditorVisible, setIsEditorVisible] = useState(false);
    const [isExactConnected, setIsExactConnected] = useState(false);
    const [syncing, setSyncing] = useState(false);

    // Form states
    const [merchant, setMerchant] = useState('');
    const [total, setTotal] = useState('');
    const [date, setDate] = useState('');
    const [category, setCategory] = useState('');

    const loadData = useCallback(async () => {
        setLoading(true);
        const data = await getReceiptDetail(receiptId);
        if (data) {
            setReceipt(data);
            setMerchant(data.merchant_name);
            setTotal(data.total_amount.toString());
            setDate(data.transaction_date);
            setCategory(data.category || '');
        }
        setLoading(false);
    }, [receiptId]);

    useEffect(() => {
        loadData();
        checkExactConnection();
    }, [loadData]);

    const checkExactConnection = async () => {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        const { data } = await supabase
            .from('integration_tokens')
            .select('id')
            .eq('user_id', user.id)
            .eq('provider', 'exact_online')
            .single();

        setIsExactConnected(!!data);
    };

    const handlePushToExact = async () => {
        if (!receipt) return;
        setSyncing(true);
        try {
            const { data, error } = await supabase.functions.invoke('exact-sync', {
                body: { receipt_id: receiptId }
            });

            if (error) throw error;
            if (data?.success) {
                Alert.alert('Succes', 'Bonnetje is verstuurd naar Exact Online!');
                setReceipt({ ...receipt, is_synced: true });
            } else {
                throw new Error(data?.error || 'Onbekende fout bij synchroniseren');
            }
        } catch (error) {
            console.error(error);
            Alert.alert('Fout', `Kon niet synchroniseren: ${(error as Error).message}`);
        } finally {
            setSyncing(false);
        }
    };

    const handleSave = async () => {
        if (!receipt) return;
        setSaving(true);
        try {
            // Update main receipt
            await updateReceipt(receiptId, {
                merchant_name: merchant,
                total_amount: parseFloat(total),
                transaction_date: date,
                category: category,
            });

            // Update all items (locally stored in receipt.items)
            await updateReceiptItems(receipt.items);

            Alert.alert('Succes', 'Gegevens zijn bijgewerkt!');
        } catch (error) {
            console.error(error);
            Alert.alert('Fout', 'Kon gegevens niet opslaan.');
        } finally {
            setSaving(false);
        }
    };

    const handleItemSave = (updatedItem: ReceiptItem) => {
        if (!receipt) return;

        // Update local state
        const updatedItems = receipt.items.map(item =>
            item.id === updatedItem.id ? updatedItem : item
        );

        setReceipt({ ...receipt, items: updatedItems });
        setIsEditorVisible(false);
        setEditingItem(null);
    };

    const handleDelete = () => {
        Alert.alert(
            'Verwijderen',
            'Weet je zeker dat je dit bonnetje wilt verwijderen?',
            [
                { text: 'Annuleren', style: 'cancel' },
                {
                    text: 'Verwijderen',
                    style: 'destructive',
                    onPress: async () => {
                        try {
                            if (receipt) {
                                await deleteReceipt(receiptId, receipt.image_path);
                                navigation.goBack();
                            }
                        } catch (error) {
                            Alert.alert('Fout', 'Kon bonnetje niet verwijderen.');
                        }
                    }
                }
            ]
        );
    };

    if (loading) {
        return (
            <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color="#22D3EE" />
            </View>
        );
    }

    if (!receipt) {
        return (
            <View style={styles.errorContainer}>
                <Text style={styles.errorText}>Bonnetje niet gevonden.</Text>
                <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
                    <Text style={styles.backButtonText}>Ga terug</Text>
                </TouchableOpacity>
            </View>
        );
    }

    const imageUrl = receipt.image_path
        ? supabase.storage.from('receipts').getPublicUrl(receipt.image_path).data.publicUrl
        : null;

    return (
        <View style={styles.container}>
            <LinearGradient colors={['#0F172A', '#000000']} style={StyleSheet.absoluteFill} />

            {/* Header */}
            <View style={styles.header}>
                <TouchableOpacity onPress={() => navigation.goBack()}>
                    <Ionicons name="chevron-back" size={28} color="white" />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Details</Text>
                <TouchableOpacity onPress={handleDelete}>
                    <Ionicons name="trash-outline" size={24} color="#EF4444" />
                </TouchableOpacity>
            </View>

            <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
                {/* Image Preview */}
                <TouchableOpacity
                    onPress={() => setShowImageFull(true)}
                    activeOpacity={0.9}
                    style={styles.imageContainer}
                >
                    {imageUrl ? (
                        <Image source={{ uri: imageUrl }} style={styles.receiptImage} resizeMode="cover" />
                    ) : (
                        <View style={styles.placeholderImage}>
                            <Ionicons name="image-outline" size={48} color="#64748B" />
                        </View>
                    )}
                    <View style={styles.zoomOverlay}>
                        <Ionicons name="expand-outline" size={20} color="white" />
                    </View>
                </TouchableOpacity>

                {/* Form Section */}
                <View style={styles.formCard}>
                    <Text style={styles.sectionTitle}>Algemene informatie</Text>

                    <View style={styles.inputGroup}>
                        <Text style={styles.label}>Winkel / Bedrijf</Text>
                        <TextInput
                            style={styles.input}
                            value={merchant}
                            onChangeText={setMerchant}
                            placeholder="Naam winkel"
                            placeholderTextColor="#64748B"
                        />
                    </View>

                    <View style={styles.inputGroup}>
                        <Text style={styles.label}>Totaalbedrag (€)</Text>
                        <TextInput
                            style={styles.input}
                            value={total}
                            onChangeText={setTotal}
                            keyboardType="numeric"
                            placeholder="0.00"
                            placeholderTextColor="#64748B"
                        />
                    </View>

                    <View style={styles.inputGroup}>
                        <Text style={styles.label}>Datum</Text>
                        <TextInput
                            style={styles.input}
                            value={date}
                            onChangeText={setDate}
                            placeholder="YYYY-MM-DD"
                            placeholderTextColor="#64748B"
                        />
                    </View>

                    <View style={styles.inputGroup}>
                        <Text style={styles.label}>Categorie</Text>
                        <TextInput
                            style={styles.input}
                            value={category}
                            onChangeText={setCategory}
                            placeholder="Bijv. Horeca"
                            placeholderTextColor="#64748B"
                        />
                    </View>
                </View>

                {/* VAT Items (Read-only for now, but visible) */}
                <View style={styles.formCard}>
                    <Text style={styles.sectionTitle}>Gescande items</Text>
                    {receipt.items.map((item, index) => (
                        <TouchableOpacity
                            key={item.id || index}
                            style={styles.itemRow}
                            onPress={() => {
                                setEditingItem(item);
                                setIsEditorVisible(true);
                            }}
                        >
                            <View style={styles.itemInfo}>
                                <Text style={styles.itemDescription} numberOfLines={1}>{item.description}</Text>
                                <Text style={styles.itemMeta}>{item.category || 'Geen categorie'} • RGS: {item.rgs_code || 'N/A'}</Text>
                            </View>
                            <View style={styles.itemPriceCol}>
                                <Text style={styles.itemPrice}>€{item.total_price.toFixed(2)}</Text>
                                <Text style={styles.itemVat}>{item.vat_code}</Text>
                            </View>
                        </TouchableOpacity>
                    ))}
                    {receipt.items.length === 0 && (
                        <Text style={styles.emptyText}>Geen items gevonden.</Text>
                    )}
                </View>

                {/* Status Card */}
                <View style={styles.statusCard}>
                    <View style={styles.statusRow}>
                        <Ionicons
                            name={receipt.is_synced ? "cloud-done" : "cloud-offline"}
                            size={24}
                            color={receipt.is_synced ? "#22D3EE" : "#64748B"}
                        />
                        <Text style={styles.statusText}>
                            {receipt.is_synced ? 'Gesynchroniseerd met Exact Online' : 'Nog niet gesynchroniseerd'}
                        </Text>
                    </View>
                </View>

                <TouchableOpacity
                    style={styles.saveButton}
                    onPress={handleSave}
                    disabled={saving}
                >
                    <LinearGradient colors={['#22D3EE', '#6366F1']} style={styles.saveGradient}>
                        {saving ? (
                            <ActivityIndicator color="white" />
                        ) : (
                            <Text style={styles.saveButtonText}>Wijzigingen opslaan</Text>
                        )}
                    </LinearGradient>
                </TouchableOpacity>

                {isExactConnected && !receipt.is_synced && (
                    <TouchableOpacity
                        style={[styles.syncButton, { marginTop: 12 }]}
                        onPress={handlePushToExact}
                        disabled={syncing}
                    >
                        <View style={styles.syncContent}>
                            {syncing ? (
                                <ActivityIndicator color="#22D3EE" />
                            ) : (
                                <>
                                    <Ionicons name="cloud-upload-outline" size={20} color="#22D3EE" style={{ marginRight: 8 }} />
                                    <Text style={styles.syncButtonText}>Stuur naar Exact Online</Text>
                                </>
                            )}
                        </View>
                    </TouchableOpacity>
                )}

                <View style={{ height: 40 }} />
            </ScrollView>

            <LineItemEditor
                visible={isEditorVisible}
                item={editingItem}
                onClose={() => setIsEditorVisible(false)}
                onSave={handleItemSave}
            />

            {/* Simple Image Modal (Simplified for now) */}
            {showImageFull && (
                <View style={styles.fullImageModal}>
                    <TouchableOpacity
                        style={styles.closeModal}
                        onPress={() => setShowImageFull(false)}
                    >
                        <Ionicons name="close" size={32} color="white" />
                    </TouchableOpacity>
                    {imageUrl && (
                        <Image
                            source={{ uri: imageUrl }}
                            style={styles.fullImage}
                            resizeMode="contain"
                        />
                    )}
                </View>
            )}
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    loadingContainer: {
        flex: 1,
        backgroundColor: '#0F172A',
        justifyContent: 'center',
        alignItems: 'center',
    },
    errorContainer: {
        flex: 1,
        backgroundColor: '#0F172A',
        justifyContent: 'center',
        alignItems: 'center',
        padding: 20,
    },
    errorText: {
        color: 'white',
        fontSize: 16,
        marginBottom: 20,
    },
    backButton: {
        padding: 10,
    },
    backButtonText: {
        color: '#22D3EE',
        fontSize: 16,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingTop: Platform.OS === 'ios' ? 60 : 40,
        paddingHorizontal: 20,
        paddingBottom: 20,
    },
    headerTitle: {
        color: 'white',
        fontSize: 18,
        fontWeight: 'bold',
    },
    scrollContent: {
        paddingHorizontal: 20,
    },
    imageContainer: {
        width: '100%',
        height: 250,
        borderRadius: 20,
        overflow: 'hidden',
        backgroundColor: 'rgba(30, 41, 59, 0.5)',
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.1)',
        marginBottom: 20,
    },
    receiptImage: {
        width: '100%',
        height: '100%',
    },
    placeholderImage: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    zoomOverlay: {
        position: 'absolute',
        bottom: 12,
        right: 12,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        padding: 8,
        borderRadius: 12,
    },
    formCard: {
        backgroundColor: 'rgba(30, 41, 59, 0.5)',
        borderRadius: 20,
        padding: 20,
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.05)',
        marginBottom: 20,
    },
    sectionTitle: {
        color: 'white',
        fontSize: 16,
        fontWeight: 'bold',
        marginBottom: 15,
    },
    inputGroup: {
        marginBottom: 15,
    },
    label: {
        color: '#94A3B8',
        fontSize: 12,
        marginBottom: 8,
        textTransform: 'uppercase',
        letterSpacing: 1,
    },
    input: {
        backgroundColor: 'rgba(15, 23, 42, 0.5)',
        borderRadius: 12,
        padding: 12,
        color: 'white',
        fontSize: 15,
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.1)',
    },
    itemRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingVertical: 12,
        borderBottomWidth: 1,
        borderBottomColor: 'rgba(255, 255, 255, 0.05)',
    },
    itemInfo: {
        flex: 1,
    },
    itemDescription: {
        color: 'white',
        fontSize: 14,
        fontWeight: '500',
    },
    itemMeta: {
        color: '#64748B',
        fontSize: 11,
        marginTop: 2,
    },
    itemPriceCol: {
        alignItems: 'flex-end',
        marginLeft: 10,
    },
    itemPrice: {
        color: '#22D3EE',
        fontSize: 14,
        fontWeight: 'bold',
    },
    itemVat: {
        color: '#64748B',
        fontSize: 10,
    },
    emptyText: {
        color: '#64748B',
        fontSize: 14,
        textAlign: 'center',
        marginVertical: 10,
    },
    statusCard: {
        backgroundColor: 'rgba(30, 41, 59, 0.3)',
        borderRadius: 16,
        padding: 15,
        marginBottom: 25,
    },
    statusRow: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    statusText: {
        color: '#94A3B8',
        fontSize: 13,
        marginLeft: 10,
    },
    saveButton: {
        width: '100%',
        height: 56,
        borderRadius: 16,
        overflow: 'hidden',
        shadowColor: '#22D3EE',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
        elevation: 5,
    },
    saveGradient: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    saveButtonText: {
        color: 'white',
        fontSize: 16,
        fontWeight: 'bold',
    },
    syncButton: {
        width: '100%',
        height: 56,
        borderRadius: 16,
        borderWidth: 1,
        borderColor: 'rgba(34, 211, 238, 0.4)',
        backgroundColor: 'rgba(34, 211, 238, 0.1)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    syncContent: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    syncButtonText: {
        color: '#22D3EE',
        fontSize: 16,
        fontWeight: 'bold',
    },
    fullImageModal: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: 'black',
        zIndex: 1000,
        justifyContent: 'center',
        alignItems: 'center',
    },
    closeModal: {
        position: 'absolute',
        top: 60,
        right: 20,
        zIndex: 1001,
    },
    fullImage: {
        width: '100%',
        height: '80%',
    }
});

export default ReceiptDetailScreen;
