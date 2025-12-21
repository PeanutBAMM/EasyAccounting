import React from 'react';
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    TouchableOpacity,
    Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import * as WebBrowser from 'expo-web-browser';
import { useAuthStore } from '../auth/authStore';
import { supabase } from '../../lib/supabase';
import { Alert } from 'react-native';

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
    const [isRefreshing, setIsRefreshing] = React.useState(false);
    const [isConnected, setIsConnected] = React.useState(false);

    React.useEffect(() => {
        checkConnection();
    }, []);

    const checkConnection = async () => {
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
    };

    const handleExactConnect = async () => {
        if (!user) return;

        try {
            // Function URL for logic
            const functionUrl = `https://m8dakpm-peanutbamm-8081.exp.direct/functions/v1/exact-auth/login?state=${user.id}`;
            // Actually, we should use the direct function URL if possible, or a proxy.
            // For POC, we'll use the Supabase Project URL.
            const projectUrl = "https://kxyjgzvjkkyyvjkyyvjk.supabase.co"; // Placeholder - needs user to provide or find from .env
            const authUrl = `${projectUrl}/functions/v1/exact-auth/login?state=${user.id}`;

            const result = await WebBrowser.openAuthSessionAsync(authUrl, "easyaccounting://exact-success");

            if (result.type === 'success') {
                setIsRefreshing(true);
                // Wait a bit for DB to update
                setTimeout(async () => {
                    await checkConnection();
                    setIsRefreshing(false);
                    Alert.alert("Succes!", "Je bent nu verbonden met Exact Online.");
                }, 2000);
            }
        } catch (error) {
            Alert.alert("Fout", "Kon geen verbinding maken met Exact Online.");
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
                    <Text style={styles.headerTitle}>Boekhouding</Text>
                    <View style={{ width: 44 }} />
                </View>

                <ScrollView contentContainerStyle={styles.scrollContent}>
                    <Text style={styles.description}>
                        Koppel je favoriete boekhoudpakket om je digitale bonnen automatisch te synchroniseren.
                    </Text>

                    <View style={styles.grid}>
                        <IntegrationTile
                            name="Exact Online"
                            icon="business"
                            color="#22D3EE"
                            connected={isConnected}
                            onPress={handleExactConnect}
                        />
                        <IntegrationTile
                            name="Moneybird"
                            icon="leaf"
                            color="#10B981"
                            onPress={() => { }}
                            disabled
                        />
                        <IntegrationTile
                            name="SnelStart"
                            icon="flash"
                            color="#F59E0B"
                            onPress={() => { }}
                            disabled
                        />
                        <IntegrationTile
                            name="Yuki"
                            icon="cube"
                            color="#6366F1"
                            onPress={() => { }}
                            disabled
                        />
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
        paddingHorizontal: 20,
        paddingVertical: 16,
    },
    backButton: {
        width: 44,
        height: 44,
        borderRadius: 12,
        backgroundColor: 'rgba(255, 255, 255, 0.05)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    headerTitle: {
        fontSize: 20,
        fontWeight: '800',
        color: '#F8FAFC',
    },
    scrollContent: {
        paddingHorizontal: 20,
        paddingTop: 8,
    },
    description: {
        fontSize: 15,
        color: '#94A3B8',
        lineHeight: 22,
        marginBottom: 32,
    },
    grid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        justifyContent: 'space-between',
    },
    tile: {
        width: TILE_WIDTH,
        height: TILE_WIDTH * 1.1,
        marginBottom: 16,
        borderRadius: 24,
        overflow: 'hidden',
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.08)',
    },
    tileDisabled: {
        opacity: 0.6,
    },
    glassTile: {
        flex: 1,
        backgroundColor: 'rgba(30, 41, 59, 0.5)',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 16,
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
        fontSize: 15,
        fontWeight: '700',
        color: '#F8FAFC',
        marginBottom: 12,
    },
    statusBadgeConnect: {
        paddingHorizontal: 12,
        paddingVertical: 4,
        borderRadius: 10,
        backgroundColor: 'rgba(34, 211, 238, 0.1)',
        borderWidth: 1,
        borderColor: 'rgba(34, 211, 238, 0.2)',
    },
    statusTextConnect: {
        fontSize: 11,
        fontWeight: '700',
        color: '#22D3EE',
    },
    statusBadgeConnected: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 10,
        backgroundColor: 'rgba(16, 185, 129, 0.1)',
        borderWidth: 1,
        borderColor: 'rgba(16, 185, 129, 0.2)',
    },
    statusTextConnected: {
        fontSize: 11,
        fontWeight: '700',
        color: '#10B981',
        marginLeft: 4,
    },
    statusBadgeComingSoon: {
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 10,
        backgroundColor: 'rgba(148, 163, 184, 0.1)',
        borderWidth: 1,
        borderColor: 'rgba(148, 163, 184, 0.2)',
    },
    statusTextComingSoon: {
        fontSize: 11,
        fontWeight: '600',
        color: '#94A3B8',
    },
});
