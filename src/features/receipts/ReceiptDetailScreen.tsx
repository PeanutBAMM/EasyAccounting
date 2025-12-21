import React, { useState, useEffect, useCallback, useRef } from 'react';
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
    Animated,
    PanResponder,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { supabase } from '../../lib/supabase';
import { DetailedReceipt, getReceiptDetail, updateReceipt, deleteReceipt, updateReceiptItems, ReceiptItem, renameReceiptImage } from './receiptService';
import { toTitleCase, formatCurrency, formatDate, parseDate } from '../../utils/formatters';
import LineItemEditor from './components/LineItemEditor';

const { width, height } = Dimensions.get('window');

type ReceiptDetailRouteProp = RouteProp<{ params: { receiptId: string } }, 'params'>;

const ReceiptDetailScreen: React.FC = () => {
    const navigation = useNavigation();
    const route = useRoute<ReceiptDetailRouteProp>();
    const insets = useSafeAreaInsets();
    const { receiptId } = route.params;

    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [receipt, setReceipt] = useState<DetailedReceipt | null>(null);
    const [showImageFull, setShowImageFull] = useState(false);
    const [editingItem, setEditingItem] = useState<ReceiptItem | null>(null);
    const [isEditorVisible, setIsEditorVisible] = useState(false);
    const [isExactConnected, setIsExactConnected] = useState(false);
    const [syncing, setSyncing] = useState(false);
    const [isEditingSummary, setIsEditingSummary] = useState(false);

    // Form states
    const [merchant, setMerchant] = useState('');
    const [total, setTotal] = useState('');
    const [date, setDate] = useState('');
    const [category, setCategory] = useState('');
    const [hasChanges, setHasChanges] = useState(false);
    const [imageUrl, setImageUrl] = useState<string | null>(null);

    // Zoom & Pan states
    const scale = useRef(new Animated.Value(1)).current;
    const pan = useRef(new Animated.ValueXY()).current;
    const lastScale = useRef(1);
    const initialDistance = useRef(0);
    const baseScale = useRef(1);

    const panResponder = useRef(
        PanResponder.create({
            onStartShouldSetPanResponder: () => true,
            onMoveShouldSetPanResponder: () => true,
            onPanResponderGrant: (evt) => {
                const touches = evt.nativeEvent.touches;
                if (touches && touches.length === 2) {
                    initialDistance.current = Math.sqrt(
                        Math.pow(touches[0].pageX - touches[1].pageX, 2) +
                        Math.pow(touches[0].pageY - touches[1].pageY, 2)
                    );
                    baseScale.current = lastScale.current;
                } else {
                    pan.setOffset({
                        // @ts-ignore
                        x: pan.x._value,
                        // @ts-ignore
                        y: pan.y._value
                    });
                    pan.setValue({ x: 0, y: 0 });
                }
            },
            onPanResponderMove: (evt, gestureState) => {
                if (evt.nativeEvent.touches.length === 2) {
                    // Pinch to zoom
                    const touches = evt.nativeEvent.touches;
                    const dist = Math.sqrt(
                        Math.pow(touches[0].pageX - touches[1].pageX, 2) +
                        Math.pow(touches[0].pageY - touches[1].pageY, 2)
                    );

                    if (initialDistance.current === 0) {
                        initialDistance.current = dist;
                        baseScale.current = lastScale.current;
                    }

                    const ratio = dist / initialDistance.current;
                    let newScale = baseScale.current * ratio;
                    newScale = Math.max(1, Math.min(newScale, 5));
                    scale.setValue(newScale);
                    lastScale.current = newScale;
                } else if (evt.nativeEvent.touches.length === 1 && lastScale.current > 1) {
                    // Pan with boundaries and speed damping
                    const s = lastScale.current;
                    const maxOffsetX = (Dimensions.get('window').width * (s - 1)) / 2;
                    const maxOffsetY = (Dimensions.get('window').height * 0.85 * (s - 1)) / 2;

                    // Apply damping: slower pan when more zoomed in
                    const dampedDx = gestureState.dx / s;
                    const dampedDy = gestureState.dy / s;

                    // Calculate potential positions
                    // @ts-ignore
                    const currentX = pan.x._offset + dampedDx;
                    // @ts-ignore
                    const currentY = pan.y._offset + dampedDy;

                    // Clamp to boundaries
                    // @ts-ignore
                    const clampedDx = Math.max(-maxOffsetX, Math.min(maxOffsetX, currentX)) - pan.x._offset;
                    // @ts-ignore
                    const clampedDy = Math.max(-maxOffsetY, Math.min(maxOffsetY, currentY)) - pan.y._offset;

                    pan.setValue({ x: clampedDx, y: clampedDy });
                }
            },
            onPanResponderRelease: () => {
                pan.flattenOffset();
                initialDistance.current = 0;
            },
            onPanResponderTerminate: () => {
                pan.flattenOffset();
                initialDistance.current = 0;
            }
        })
    ).current;

    const handleCloseImage = () => {
        setShowImageFull(false);
        scale.setValue(1);
        pan.setValue({ x: 0, y: 0 });
        pan.setOffset({ x: 0, y: 0 });
        lastScale.current = 1;
        initialDistance.current = 0;
    };

    const loadData = useCallback(async () => {
        setLoading(true);
        const data = await getReceiptDetail(receiptId);
        if (data) {
            setReceipt(data);
            setMerchant(data.merchant_name);
            setTotal(data.total_amount.toString());
            setDate(formatDate(data.transaction_date));
            setCategory(data.category || '');

            // Auto-fill bookkeeping codes if missing
            const updatedItems = await Promise.all(data.items.map(async (item) => {
                if (!item.rgs_code) {
                    // 1. Try case-insensitive historical match
                    const { data: mappings } = await supabase
                        .from('user_rgs_mappings')
                        .select('rgs_code')
                        .eq('user_id', data.user_id)
                        .ilike('product_description', item.description.trim());

                    if (mappings && mappings.length > 0) {
                        return { ...item, rgs_code: mappings[0].rgs_code };
                    }

                    // 2. Simple Keyword Fallback (if no history)
                    const desc = item.description.toLowerCase();
                    if (desc.includes('koffie') || desc.includes('lunch') || desc.includes('diner') || desc.includes('restaurant')) {
                        return { ...item, rgs_code: 'WBedHoreca' };
                    }
                    if (desc.includes('benzine') || desc.includes('diesel') || desc.includes('parkeren') || desc.includes('trein')) {
                        return { ...item, rgs_code: 'WBedReis' };
                    }
                    if (desc.includes('kantoor') || desc.includes('papier') || desc.includes('printer')) {
                        return { ...item, rgs_code: 'WBedHuiKantoor' };
                    }

                    // Fallback to "Overig" if description is generic
                    return { ...item, rgs_code: 'WBedOveOve' };
                }
                return item;
            }));

            if (JSON.stringify(updatedItems) !== JSON.stringify(data.items)) {
                setReceipt({ ...data, items: updatedItems });
                setHasChanges(true); // Flag that we auto-filled something
            }

            // Fetch signed URL for private bucket
            if (data.image_path) {
                const { data: signedData, error } = await supabase.storage
                    .from('receipts')
                    .createSignedUrl(data.image_path, 3600); // 1 hour expiry
                if (signedData) setImageUrl(signedData.signedUrl);
            }
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
        if (!isExactConnected) {
            navigation.navigate('AccountingIntegration' as never);
            return;
        }

        if (!receipt) return;
        setSyncing(true);
        try {
            // Ensure any pending changes are saved first if needed, 
            // but for now just sync the latest saved data
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
            // 1. Update main receipt fields
            const updatedReceiptData = {
                ...receipt,
                merchant_name: merchant,
                total_amount: parseFloat(total),
                transaction_date: parseDate(date),
                category: category,
            };

            await updateReceipt(receiptId, updatedReceiptData);

            // 2. Update items
            await updateReceiptItems(receipt.items);

            // 3. Rename image based on rules
            const newPath = await renameReceiptImage(updatedReceiptData);

            // 4. Update local state with new data and new path
            setReceipt({ ...updatedReceiptData, image_path: newPath });
            setHasChanges(false);

            // Refresh signed URL if path changed
            if (newPath !== receipt.image_path) {
                const { data: signedData } = await supabase.storage
                    .from('receipts')
                    .createSignedUrl(newPath, 3600);
                if (signedData) setImageUrl(signedData.signedUrl);
            }

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

        let updatedItems;
        const exists = receipt.items.some(item => (item.id && item.id === updatedItem.id));

        if (exists) {
            updatedItems = receipt.items.map(item =>
                item.id === updatedItem.id ? updatedItem : item
            );
        } else {
            // New item - assign temporary ID if none
            const newItem = {
                ...updatedItem,
                id: updatedItem.id || `temp-${Date.now()}`
            };
            updatedItems = [...receipt.items, newItem];
        }

        setReceipt({ ...receipt, items: updatedItems });
        setHasChanges(true);
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

    const getAllRGSCodes = () => {
        if (!receipt.items.length) return 'Geen code';
        const uniqueCodes = [...new Set(receipt.items.map(item => item.rgs_code).filter(Boolean))];
        return uniqueCodes.length > 0 ? uniqueCodes.join(', ') : 'Geen code';
    };

    // Correct inclusive VAT calculations
    const v21Total = receipt.items
        .filter(i => i.vat_code === '21%')
        .reduce((sum, i) => sum + (i.total_price * (21 / 121)), 0);
    const v9Total = receipt.items
        .filter(i => i.vat_code === '9%')
        .reduce((sum, i) => sum + (i.total_price * (9 / 109)), 0);
    const totalInclCalculated = receipt.items.reduce((sum, i) => sum + i.total_price, 0);
    const totalExcl = totalInclCalculated - v21Total - v9Total;
    const allRGSCodes = getAllRGSCodes();

    return (
        <View style={styles.container}>
            <LinearGradient colors={['#0F172A', '#000000']} style={StyleSheet.absoluteFill} />

            {/* Header */}
            <View style={styles.header}>
                <TouchableOpacity onPress={() => navigation.goBack()} style={styles.headerIcon}>
                    <Ionicons name="chevron-back" size={28} color="white" />
                </TouchableOpacity>

                <TouchableOpacity
                    style={[styles.integrationButton, !isExactConnected && styles.integrationButtonInactive]}
                    onPress={handlePushToExact}
                    disabled={syncing}
                >
                    {syncing ? (
                        <ActivityIndicator size="small" color="white" />
                    ) : (
                        <>
                            <Ionicons
                                name={isExactConnected ? "cloud-upload-outline" : "link-outline"}
                                size={18}
                                color="white"
                                style={{ marginRight: 6 }}
                            />
                            <Text style={styles.integrationButtonText}>
                                {isExactConnected ? 'Stuur naar Exact' : 'Koppel Boekhouding'}
                            </Text>
                        </>
                    )}
                </TouchableOpacity>

                <TouchableOpacity onPress={handleDelete} style={styles.headerIcon}>
                    <Ionicons name="trash-outline" size={24} color="#EF4444" />
                </TouchableOpacity>
            </View>

            <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
                {/* Image Preview - Top */}
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

                {/* Compact Summary Card */}
                <View style={styles.summaryCard}>
                    {/* Pencil Icon top right */}
                    <TouchableOpacity
                        style={styles.editCardPencil}
                        onPress={() => setIsEditingSummary(!isEditingSummary)}
                    >
                        <Ionicons name={isEditingSummary ? "checkmark-done" : "pencil"} size={20} color="white" />
                    </TouchableOpacity>

                    <View style={styles.summaryTopRow}>
                        <View style={{ flex: 1 }}>
                            {isEditingSummary ? (
                                <View style={styles.summaryEditForm}>
                                    <View style={styles.editFieldRow}>
                                        <Text style={styles.editLabel}>Ontvanger:</Text>
                                        <TextInput
                                            style={styles.editInput}
                                            value={merchant}
                                            onChangeText={(text) => { setMerchant(text); setHasChanges(true); }}
                                            placeholder="Naam"
                                            placeholderTextColor="#64748B"
                                        />
                                    </View>
                                    <View style={styles.editFieldRow}>
                                        <Text style={styles.editLabel}>Datum:</Text>
                                        <TextInput
                                            style={styles.editInput}
                                            value={date}
                                            onChangeText={(text) => { setDate(text); setHasChanges(true); }}
                                            placeholder="DD-MM-YYYY"
                                            placeholderTextColor="#64748B"
                                        />
                                    </View>
                                    <View style={styles.editFieldRow}>
                                        <Text style={styles.editLabel}>Bedrag:</Text>
                                        <TextInput
                                            style={styles.editInput}
                                            value={total}
                                            onChangeText={(text) => { setTotal(text); setHasChanges(true); }}
                                            keyboardType="numeric"
                                            placeholder="0.00"
                                            placeholderTextColor="#64748B"
                                        />
                                    </View>
                                    <Text style={styles.rgsBadgeText}>Boekhoudcode(s): <Text style={{ color: '#22D3EE' }}>{allRGSCodes}</Text></Text>
                                </View>
                            ) : (
                                <View>
                                    <View style={styles.summaryDisplayRow}>
                                        <Text style={styles.summaryLabelWhite}>
                                            Ontvanger: <Text style={styles.summaryValueWhite}>{merchant || 'Onbekend'}</Text>
                                        </Text>
                                        <Text style={styles.summaryLabelWhite}>
                                            Datum: <Text style={styles.summaryValueWhite}>{date}</Text>
                                        </Text>
                                    </View>
                                    <Text style={styles.rgsBadgeText}>Boekhoudcode(s): <Text style={{ color: '#22D3EE' }}>{allRGSCodes}</Text></Text>
                                </View>
                            )}
                        </View>
                    </View>

                    <View style={styles.divider} />

                    <View style={styles.summaryGrid}>
                        <View style={styles.summaryItem}>
                            <Text style={styles.summaryLabel}>Totaal Incl.</Text>
                            <Text style={styles.summaryValue}>{formatCurrency(totalInclCalculated)}</Text>
                        </View>
                        <View style={styles.summaryItem}>
                            <Text style={styles.summaryLabel}>BTW 21%</Text>
                            <Text style={styles.summaryValue}>{formatCurrency(v21Total)}</Text>
                        </View>
                        <View style={styles.summaryItem}>
                            <Text style={styles.summaryLabel}>BTW 9%</Text>
                            <Text style={styles.summaryValue}>{formatCurrency(v9Total)}</Text>
                        </View>
                        <View style={styles.summaryItem}>
                            <Text style={styles.summaryLabel}>Totaal Excl.</Text>
                            <Text style={styles.summaryValue}>{formatCurrency(totalExcl)}</Text>
                        </View>
                    </View>
                </View>

                {/* Specific Lines Section */}
                <View style={styles.listSection}>
                    <Text style={styles.sectionTitle}>Gescande regels</Text>
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
                                <Text style={styles.itemMeta}>
                                    {item.category || 'Geen categorie'} • <Text style={styles.rgsHighlight}>{item.rgs_code || 'Geen code'}</Text>
                                </Text>
                            </View>
                            <View style={styles.itemPriceCol}>
                                <Text style={styles.itemPrice}>{formatCurrency(item.total_price)}</Text>
                                <View style={styles.vatBadge}>
                                    {item.vat_code === '21%' ? (
                                        <LinearGradient
                                            colors={['#3B82F6', '#1D4ED8']}
                                            style={styles.vatIconSmall}
                                            start={{ x: 0, y: 0 }}
                                            end={{ x: 1, y: 1 }}
                                        >
                                            <Text style={styles.vatTextSmall}>21%</Text>
                                        </LinearGradient>
                                    ) : item.vat_code === '9%' ? (
                                        <LinearGradient
                                            colors={['#A855F7', '#7E22CE']}
                                            style={styles.vatIconSmall}
                                            start={{ x: 0, y: 0 }}
                                            end={{ x: 1, y: 1 }}
                                        >
                                            <Text style={styles.vatTextSmall}>9%</Text>
                                        </LinearGradient>
                                    ) : (
                                        <Text style={styles.itemVat}>{item.vat_code}</Text>
                                    )}
                                </View>
                            </View>
                        </TouchableOpacity>
                    ))}
                    {receipt.items.length === 0 && (
                        <Text style={styles.emptyText}>Geen items gevonden.</Text>
                    )}

                    <TouchableOpacity
                        style={styles.addItemButton}
                        onPress={() => {
                            setEditingItem({
                                receipt_id: receiptId,
                                description: '',
                                quantity: 1,
                                unit_price: 0,
                                total_price: 0,
                                vat_code: '21%',
                                user_id: receipt.user_id
                            } as any);
                            setIsEditorVisible(true);
                        }}
                    >
                        <Ionicons name="add-circle-outline" size={20} color="#22D3EE" />
                        <Text style={styles.addItemText}>Voeg item toe</Text>
                    </TouchableOpacity>
                </View>

                <View style={{ height: 160 }} />
            </ScrollView>

            {/* Floating Save Button */}
            {hasChanges && (
                <TouchableOpacity
                    style={styles.floatingSaveButton}
                    onPress={handleSave}
                    disabled={saving}
                >
                    <LinearGradient colors={['#22D3EE', '#6366F1']} style={styles.saveGradient}>
                        {saving ? (
                            <ActivityIndicator color="white" />
                        ) : (
                            <View style={styles.saveContent}>
                                <Ionicons name="checkmark-circle-outline" size={24} color="white" style={{ marginRight: 8 }} />
                                <Text style={styles.saveButtonText}>Wijzigingen opslaan</Text>
                            </View>
                        )}
                    </LinearGradient>
                </TouchableOpacity>
            )}

            <LineItemEditor
                visible={isEditorVisible}
                item={editingItem}
                onClose={() => setIsEditorVisible(false)}
                onSave={handleItemSave}
            />

            {/* Image Modal */}
            {showImageFull && (
                <View style={styles.fullImageModal}>
                    <TouchableOpacity
                        style={styles.closeModal}
                        onPress={handleCloseImage}
                    >
                        <Ionicons name="close" size={32} color="white" />
                    </TouchableOpacity>
                    {imageUrl && (
                        <View
                            style={styles.fullImageContainer}
                            {...panResponder.panHandlers}
                        >
                            <Animated.Image
                                source={{ uri: imageUrl }}
                                style={[
                                    styles.fullImage,
                                    {
                                        transform: [
                                            { scale: scale },
                                            { translateX: pan.x },
                                            { translateY: pan.y }
                                        ]
                                    }
                                ]}
                                resizeMode="contain"
                            />
                        </View>
                    )}
                </View>
            )}
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#0F172A',
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
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingTop: Platform.OS === 'ios' ? 50 : 30, // Reduced from 60/40
        paddingHorizontal: 16,
        paddingBottom: 12,
    },
    headerIcon: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: 'rgba(255, 255, 255, 0.1)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    integrationButton: {
        flex: 1,
        marginHorizontal: 12,
        height: 40,
        borderRadius: 20,
        backgroundColor: '#3B82F6',
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        shadowColor: '#3B82F6',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
        elevation: 5,
    },
    integrationButtonInactive: {
        backgroundColor: '#64748B',
        shadowColor: 'transparent',
    },
    integrationButtonText: {
        color: 'white',
        fontSize: 14,
        fontWeight: 'bold',
    },
    scrollContent: {
        paddingHorizontal: 16,
    },
    imageContainer: {
        width: '100%',
        height: 200,
        borderRadius: 24,
        overflow: 'hidden',
        backgroundColor: 'rgba(30, 41, 59, 0.5)',
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.1)',
        marginBottom: 16,
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
        backgroundColor: 'rgba(0, 0, 0, 0.6)',
        padding: 8,
        borderRadius: 12,
    },
    summaryCard: {
        backgroundColor: 'rgba(30, 41, 59, 0.4)',
        borderRadius: 24,
        padding: 20,
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.08)',
        marginBottom: 16,
    },
    summaryTopRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 16,
    },
    merchantInput: {
        fontSize: 20,
        fontWeight: 'bold',
        color: 'white',
        padding: 0,
    },
    rgsBadgeText: {
        fontSize: 12,
        color: '#64748B',
        marginTop: 6,
    },
    editCardPencil: {
        position: 'absolute',
        top: 16,
        right: 16,
        zIndex: 10,
        backgroundColor: 'rgba(255, 255, 255, 0.1)',
        padding: 8,
        borderRadius: 12,
    },
    summaryEditForm: {
        marginTop: 8,
    },
    editFieldRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 12,
    },
    editLabel: {
        color: '#94A3B8',
        fontSize: 14,
        width: 80,
    },
    editInput: {
        flex: 1,
        color: 'white',
        fontSize: 16,
        fontWeight: '600',
        backgroundColor: 'rgba(255, 255, 255, 0.05)',
        paddingHorizontal: 12,
        paddingVertical: 8,
        borderRadius: 8,
    },
    summaryDisplayRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        paddingRight: 30, // Space for pencil
    },
    summaryLabelWhite: {
        fontSize: 14,
        color: 'rgba(255, 255, 255, 0.7)',
    },
    summaryValueWhite: {
        color: 'white',
        fontWeight: 'bold',
    },
    dateInput: {
        color: '#64748B',
        fontSize: 14,
        padding: 0,
    },
    divider: {
        height: 1,
        backgroundColor: 'rgba(255, 255, 255, 0.05)',
        marginBottom: 16,
    },
    summaryGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        justifyContent: 'space-between',
    },
    summaryItem: {
        width: '48%',
        marginBottom: 16,
    },
    summaryLabel: {
        color: 'rgba(255, 255, 255, 0.6)',
        fontSize: 12,
        marginBottom: 4,
    },
    summaryValue: {
        color: 'white',
        fontSize: 16,
        fontWeight: 'bold',
    },
    listSection: {
        backgroundColor: 'rgba(30, 41, 59, 0.3)',
        borderRadius: 24,
        padding: 20,
        marginBottom: 16,
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.05)',
    },
    sectionTitle: {
        color: 'white',
        fontSize: 16,
        fontWeight: 'bold',
        marginBottom: 16,
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
        fontSize: 12,
        marginTop: 2,
    },
    rgsHighlight: {
        color: '#22D3EE',
        fontWeight: '500',
    },
    itemPriceCol: {
        alignItems: 'flex-end',
        marginLeft: 10,
    },
    itemPrice: {
        color: '#fff',
        fontSize: 14,
        fontWeight: 'bold',
    },
    vatBadge: {
        marginTop: 4,
    },
    vatIconSmall: {
        paddingHorizontal: 6,
        paddingVertical: 2,
        borderRadius: 6,
    },
    vatTextSmall: {
        color: 'white',
        fontSize: 10,
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
    floatingSaveButton: {
        position: 'absolute',
        bottom: Platform.OS === 'ios' ? 96 : 76, // Positioned strak boven de navigator
        left: 20,
        right: 20,
        height: 56,
        borderRadius: 28,
        overflow: 'hidden',
        shadowColor: '#22D3EE',
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.4,
        shadowRadius: 12,
        elevation: 10,
    },
    saveGradient: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    saveContent: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    saveButtonText: {
        color: 'white',
        fontSize: 16,
        fontWeight: 'bold',
    },
    backButton: {
        padding: 10,
        backgroundColor: 'rgba(255, 255, 255, 0.1)',
        borderRadius: 12,
    },
    backButtonText: {
        color: '#22D3EE',
        fontSize: 16,
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
    fullImageContainer: {
        width: '100%',
        height: '100%',
        justifyContent: 'center',
        alignItems: 'center',
        overflow: 'hidden',
    },
    fullImage: {
        width: '100%',
        height: '85%',
    },
    addItemButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 12,
        marginTop: 8,
        borderWidth: 1,
        borderStyle: 'dashed',
        borderColor: 'rgba(34, 211, 238, 0.4)',
        borderRadius: 12,
    },
    addItemText: {
        color: '#22D3EE',
        fontSize: 14,
        fontWeight: '600',
        marginLeft: 8,
    },
});

export default ReceiptDetailScreen;
