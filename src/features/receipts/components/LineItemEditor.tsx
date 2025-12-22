import React, { useState } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    TextInput,
    Modal,
    ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { ReceiptItem } from '../receiptService';

interface LineItemEditorProps {
    visible: boolean;
    item: ReceiptItem | null;
    onClose: () => void;
    onSave: (updatedItem: ReceiptItem) => void;
}

const COMMON_RGS_CODES = [
    { code: 'WBedOveOve', label: 'Overige bedrijfskosten' },
    { code: 'WBedHoreca', label: 'Horecakosten' },
    { code: 'WBedHuiKantoor', label: 'Huisvesting / Kantoor' },
    { code: 'WBedReis', label: 'Reiskosten' },
    { code: 'WBedRepr', label: 'Representatiekosten' },
    { code: 'WBedAuto', label: 'Autokosten' },
];

const LineItemEditor: React.FC<LineItemEditorProps> = ({ visible, item, onClose, onSave }) => {
    const [description, setDescription] = useState(item?.description || '');
    const [rgsCode, setRgsCode] = useState(item?.rgs_code || '');
    const [category, setCategory] = useState(item?.category || '');
    const [totalPrice, setTotalPrice] = useState(item?.total_price?.toString() || '');

    React.useEffect(() => {
        if (item) {
            setDescription(item.description);
            setRgsCode(item.rgs_code || '');
            setCategory(item.category || '');
            setTotalPrice(item.total_price.toString());
        }
    }, [item]);

    if (!item) return null;

    const handleSave = () => {
        onSave({
            ...item,
            description,
            rgs_code: rgsCode,
            category,
            total_price: parseFloat(totalPrice) || 0,
        });
    };

    return (
        <Modal
            visible={visible}
            animationType="slide"
            transparent={true}
            onRequestClose={onClose}
        >
            <View style={styles.modalOverlay}>
                <View style={styles.modalContent}>
                    <LinearGradient colors={['#1E293B', '#0F172A']} style={styles.gradientBg} />

                    <View style={styles.header}>
                        <Text style={styles.headerTitle}>Product aanpassen</Text>
                        <TouchableOpacity onPress={onClose} style={styles.closeButton}>
                            <Ionicons name="close" size={24} color="#94A3B8" />
                        </TouchableOpacity>
                    </View>

                    <ScrollView contentContainerStyle={styles.scrollContent}>
                        <View style={styles.inputGroup}>
                            <Text style={styles.label}>Omschrijving</Text>
                            <TextInput
                                style={styles.input}
                                value={description}
                                onChangeText={setDescription}
                                placeholder="Gescande tekst"
                                placeholderTextColor="#64748B"
                            />
                        </View>

                        <View style={styles.inputGroup}>
                            <Text style={styles.label}>Bedrag (€)</Text>
                            <TextInput
                                style={styles.input}
                                value={totalPrice}
                                onChangeText={setTotalPrice}
                                keyboardType="numeric"
                                placeholder="0.00"
                                placeholderTextColor="#64748B"
                            />
                        </View>

                        <View style={styles.inputGroup}>
                            <Text style={styles.label}>Categorie</Text>
                            <TextInput
                                style={styles.input}
                                value={category}
                                onChangeText={setCategory}
                                placeholder="Bijv. Eten & Drinken"
                                placeholderTextColor="#64748B"
                            />
                        </View>

                        <View style={styles.inputGroup}>
                            <Text style={styles.label}>RGS Boekhoudcode</Text>
                            <TextInput
                                style={styles.input}
                                value={rgsCode}
                                onChangeText={setRgsCode}
                                placeholder="Selecteer of typ code..."
                                placeholderTextColor="#64748B"
                            />
                        </View>

                        <Text style={styles.suggestTitle}>Suggesties</Text>
                        <View style={styles.suggestContainer}>
                            {COMMON_RGS_CODES.map((item) => (
                                <TouchableOpacity
                                    key={item.code}
                                    style={[
                                        styles.suggestChip,
                                        rgsCode === item.code && styles.suggestChipActive
                                    ]}
                                    onPress={() => setRgsCode(item.code)}
                                >
                                    <Text style={[
                                        styles.suggestText,
                                        rgsCode === item.code && styles.suggestTextActive
                                    ]}>{item.label}</Text>
                                </TouchableOpacity>
                            ))}
                        </View>

                        <TouchableOpacity style={styles.saveButton} onPress={handleSave}>
                            <LinearGradient colors={['#22D3EE', '#6366F1']} style={styles.saveGradient}>
                                <Text style={styles.saveButtonText}>Toepassen</Text>
                            </LinearGradient>
                        </TouchableOpacity>
                    </ScrollView>
                </View>
            </View>
        </Modal>
    );
};

const styles = StyleSheet.create({
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.7)',
        justifyContent: 'flex-end',
    },
    modalContent: {
        height: '80%',
        borderTopLeftRadius: 32,
        borderTopRightRadius: 32,
        overflow: 'hidden',
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.1)',
    },
    gradientBg: {
        ...StyleSheet.absoluteFillObject,
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: 24,
        borderBottomWidth: 1,
        borderBottomColor: 'rgba(255, 255, 255, 0.05)',
    },
    headerTitle: {
        color: 'white',
        fontSize: 18,
        fontWeight: 'bold',
    },
    closeButton: {
        padding: 4,
    },
    scrollContent: {
        padding: 24,
    },
    inputGroup: {
        marginBottom: 20,
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
    suggestTitle: {
        color: 'white',
        fontSize: 14,
        fontWeight: 'bold',
        marginBottom: 12,
    },
    suggestContainer: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 8,
        marginBottom: 32,
    },
    suggestChip: {
        paddingHorizontal: 12,
        paddingVertical: 8,
        borderRadius: 12,
        backgroundColor: 'rgba(30, 41, 59, 0.5)',
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.1)',
    },
    suggestChipActive: {
        backgroundColor: 'rgba(34, 211, 238, 0.2)',
        borderColor: '#22D3EE',
    },
    suggestText: {
        color: '#94A3B8',
        fontSize: 12,
    },
    suggestTextActive: {
        color: '#22D3EE',
        fontWeight: 'bold',
    },
    saveButton: {
        height: 56,
        borderRadius: 16,
        overflow: 'hidden',
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
});

export default LineItemEditor;
