import React, { useState, useEffect, useCallback } from 'react';
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    TouchableOpacity,
    Dimensions,
    Alert
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import * as WebBrowser from 'expo-web-browser';
import { useAuthStore } from '../auth/authStore';
import { supabase } from '../../lib/supabase';

const { width } = Dimensions.get('window');
const TILE_WIDTH = (width - 56) / 2;

interface IntegrationTileProps {
    name: string;
    icon: keyof typeof Ionicons.glyphMap;
    color: string;
    connected?: boolean;
    onPress: () => void;
    disabled?: boolean;
}

const IntegrationTile = ({ name, icon, color, connected, onPress, disabled }: IntegrationTileProps) => (
    <TouchableOpacity
        style={[styles.tile, disabled && styles.tileDisabled]}
        onPress={onPress}
        disabled={disabled}
        activeOpacity={0.7}
    >
        <View style={styles.glassTile}>
            <View style={[styles.iconContainer, { backgroundColor: `${color}20` }]}>
                <Ionicons name={icon} size={32} color={color} />
            </View>
            <Text style={styles.tileName}>{name}</Text>
            {connected ? (
                <View style={styles.statusBadgeConnected}>
                    <Ionicons name="checkmark-circle" size={14} color="#10B981" />
                    <Text style={styles.statusTextConnected}>Verbonden</Text>
                </View>
            ) : disabled ? (
                <View style={styles.statusBadgeComingSoon}>
                    <Text style={styles.statusTextComingSoon}>Binnenkort</Text>
                </View>
            ) : (
                <View style={styles.statusBadgeConnect}>
                    <Text style={styles.statusTextConnect}>Koppelen</Text>
                </View>
            )}
        </View>
    </TouchableOpacity>
);

export default function AccountingIntegrationScreen() {
    const navigation = useNavigation<any>();
    const user = useAuthStore(state => state.user);
    const [isConnected, setIsConnected] = useState(false);

    const checkConnection = useCallback(async () => {
        if (!user) return;
        try {
            const { data, error } = await supabase
                .from('integration_tokens')
                .select('id')
                .eq('user_id', user.id)
                .eq('provider', 'exact_online')
                .maybeSingle();

            if (error) {
                console.warn('⚠️ Error checking accounting connection:', error.message);
            }
            setIsConnected(!!data);
        } catch (err) {
            console.error('❌ Exception in checkConnection:', err);
            setIsConnected(false);
        }
    }, [user]);

    useEffect(() => {
        checkConnection();
    }, [checkConnection]);

    const handleExactConnect = async () => {
        if (!user) return;

        try {
            // Function URL for logic
            const projectUrl = "https://kxyjgzvjkkyyvjkyyvjk.supabase.co"; // Placeholder - needs user to provide or find from .env
            const authUrl = `${projectUrl}/functions/v1/exact-auth/login?state=${user.id}`;

            const result = await WebBrowser.openAuthSessionAsync(authUrl, "easyaccounting://auth/callback");

            if (result.type === 'success') {
                Alert.alert("Succes", "Je bent nu verbonden met Exact Online.");
                checkConnection();
            }
        } catch (error: any) {
            Alert.alert("Fout", "Er is iets misgegaan bij het koppelen.");
            console.error(error);
        }
    };

    return (
        <LinearGradient
            colors={['#0F172A', '#000000']}
            style={styles.container}
        >
            <SafeAreaView style={styles.safeArea}>
                <View style={styles.header}>
                    <TouchableOpacity
                        onPress={() => navigation.goBack()}
                        style={styles.backButton}
                    >
                        <Ionicons name="arrow-back" size={24} color="#F8FAFC" />
                    </TouchableOpacity>
                    <Text style={styles.headerTitle}>Boekhouding Koppelen</Text>
                    <View style={{ width: 44 }} />
                </View>

                <ScrollView
                    contentContainerStyle={styles.scrollContent}
                    showsVerticalScrollIndicator={false}
                >
                    <View style={styles.descriptionSection}>
                        <Text style={styles.descriptionTitle}>Kies een pakket</Text>
                        <Text style={styles.descriptionText}>
                            Koppel je boekhoudpakket om bonnetjes direct door te sturen naar je administratie.
                        </Text>
                    </View>

                    <View style={styles.grid}>
                        <IntegrationTile
                            name="Exact Online"
                            icon="flash"
                            color="#22D3EE"
                            connected={isConnected}
                            onPress={handleExactConnect}
                        />
                        <IntegrationTile
                            name="AFAS"
                            icon="business"
                            color="#6366F1"
                            disabled
                            onPress={() => { }}
                        />
                        <IntegrationTile
                            name="SnelStart"
                            icon="rocket"
                            color="#8B5CF6"
                            disabled
                            onPress={() => { }}
                        />
                        <IntegrationTile
                            name="Twinfield"
                            icon="layers"
                            color="#EC4899"
                            disabled
                            onPress={() => { }}
                        />
                    </View>

                    <View style={styles.infoCard}>
                        <Ionicons name="information-circle" size={24} color="#22D3EE" />
                        <Text style={styles.infoText}>
                            Staat jouw boekhoudpakket er niet bij? We voegen continu nieuwe koppelingen toe.
                        </Text>
                    </View>
                </ScrollView>
            </SafeAreaView>
        </LinearGradient>
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
        paddingHorizontal: 16,
        paddingVertical: 12,
    },
    backButton: {
        width: 44,
        height: 44,
        borderRadius: 22,
        backgroundColor: 'rgba(255, 255, 255, 0.05)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    headerTitle: {
        fontSize: 18,
        fontWeight: '700',
        color: '#F8FAFC',
    },
    scrollContent: {
        paddingHorizontal: 20,
        paddingBottom: 40,
    },
    descriptionSection: {
        marginVertical: 24,
    },
    descriptionTitle: {
        fontSize: 24,
        fontWeight: '900',
        color: '#FFF',
        marginBottom: 8,
    },
    descriptionText: {
        fontSize: 16,
        color: '#94A3B8',
        lineHeight: 24,
    },
    grid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        justifyContent: 'space-between',
        marginBottom: 24,
    },
    tile: {
        width: TILE_WIDTH,
        height: TILE_WIDTH * 1.2,
        marginBottom: 16,
        borderRadius: 24,
        overflow: 'hidden',
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.1)',
    },
    tileDisabled: {
        opacity: 0.6,
    },
    glassTile: {
        flex: 1,
        backgroundColor: 'rgba(30, 41, 59, 0.5)',
        padding: 16,
        alignItems: 'center',
        justifyContent: 'center',
    },
    iconContainer: {
        width: 64,
        height: 64,
        borderRadius: 20,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 12,
    },
    tileName: {
        fontSize: 16,
        fontWeight: '700',
        color: '#F8FAFC',
        marginBottom: 12,
    },
    statusBadgeConnect: {
        backgroundColor: 'rgba(34, 211, 238, 0.1)',
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: 'rgba(34, 211, 238, 0.2)',
    },
    statusTextConnect: {
        fontSize: 12,
        fontWeight: '700',
        color: '#22D3EE',
    },
    statusBadgeConnected: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'rgba(16, 185, 129, 0.1)',
        paddingHorizontal: 10,
        paddingVertical: 6,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: 'rgba(16, 185, 129, 0.2)',
    },
    statusTextConnected: {
        fontSize: 12,
        fontWeight: '700',
        color: '#10B981',
        marginLeft: 4,
    },
    statusBadgeComingSoon: {
        backgroundColor: 'rgba(148, 163, 184, 0.1)',
        paddingHorizontal: 10,
        paddingVertical: 6,
        borderRadius: 12,
    },
    statusTextComingSoon: {
        fontSize: 12,
        fontWeight: '700',
        color: '#94A3B8',
    },
    infoCard: {
        flexDirection: 'row',
        backgroundColor: 'rgba(30, 41, 59, 0.3)',
        padding: 16,
        borderRadius: 20,
        alignItems: 'center',
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.05)',
    },
    infoText: {
        flex: 1,
        marginLeft: 12,
        fontSize: 14,
        color: '#94A3B8',
        lineHeight: 20,
    },
});
