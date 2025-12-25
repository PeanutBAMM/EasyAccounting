import React from 'react';
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    TouchableOpacity,
    Image
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useAuthStore } from '../auth/authStore';
import ProfileTile from './components/ProfileTile';
import { useNavigation } from '@react-navigation/native';
import AppBackground from '../../components/AppBackground';

export default function ProfileScreen() {
    const user = useAuthStore(state => state.user);
    const signOut = useAuthStore(state => state.signOut);
    const navigation = useNavigation<any>();

    return (
        <AppBackground>
            <SafeAreaView style={styles.safeArea}>
                <View style={styles.header}>
                    <TouchableOpacity
                        onPress={() => navigation.goBack()}
                        style={styles.backButton}
                    >
                        <Ionicons name="arrow-back" size={24} color="#F8FAFC" />
                    </TouchableOpacity>
                    <Text style={styles.headerTitle}>Instellingen</Text>
                    <View style={{ width: 44 }} />
                </View>

                <ScrollView
                    contentContainerStyle={styles.scrollContent}
                    showsVerticalScrollIndicator={false}
                >
                    {/* User Profile Info Section */}
                    <View style={styles.profileSection}>
                        <View style={styles.avatarWrapper}>
                            <LinearGradient
                                colors={['#22D3EE', '#6366F1']}
                                style={styles.avatarGradient}
                            >
                                {user?.user_metadata?.avatar_url ? (
                                    <Image
                                        source={{ uri: user.user_metadata.avatar_url }}
                                        style={styles.avatarImage}
                                    />
                                ) : (
                                    <View style={styles.avatarPlaceholder}>
                                        <Text style={styles.avatarText}>
                                            {(user?.user_metadata?.full_name || user?.email || 'U').charAt(0).toUpperCase()}
                                        </Text>
                                    </View>
                                )}
                            </LinearGradient>
                            <View style={styles.proBadge}>
                                <Text style={styles.proBadgeText}>PRO</Text>
                            </View>
                        </View>
                        <Text style={styles.userName}>
                            {user?.user_metadata?.full_name || 'Gebruiker'}
                        </Text>
                        <Text style={styles.userEmail}>{user?.email}</Text>
                    </View>

                    {/* Tiles Section */}
                    <View style={styles.tilesContainer}>
                        <ProfileTile
                            title="Mijn Profiel"
                            subtitle="Persoonlijke & bedrijfsgegevens"
                            icon="person-outline"
                            iconColor="#38BDF8"
                            onPress={() => console.log('Profile edit')}
                        />

                        <ProfileTile
                            title="Abonnement"
                            subtitle="Beheer je Pro plan"
                            icon="star-outline"
                            iconColor="#F59E0B"
                            onPress={() => console.log('Subscription edit')}
                        />

                        <ProfileTile
                            title="Boekhoud Koppeling"
                            subtitle="Koppel met Exact, Moneybird, etc."
                            icon="sync-outline"
                            iconColor="#22D3EE"
                            onPress={() => navigation.navigate('AccountingIntegration' as any)}
                            rightElement={
                                <View style={styles.connectBadge}>
                                    <Text style={styles.connectBadgeText}>Beheer</Text>
                                </View>
                            }
                        />
                    </View>

                    {/* Logout Button */}
                    <TouchableOpacity
                        style={styles.logoutButton}
                        onPress={() => signOut()}
                    >
                        <Ionicons name="log-out-outline" size={20} color="#EF4444" style={{ marginRight: 8 }} />
                        <Text style={styles.logoutText}>Uitloggen</Text>
                    </TouchableOpacity>

                </ScrollView>
            </SafeAreaView>
        </AppBackground>
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
        paddingBottom: 40,
    },
    profileSection: {
        alignItems: 'center',
        marginTop: 20,
        marginBottom: 32,
    },
    avatarWrapper: {
        position: 'relative',
        marginBottom: 16,
    },
    avatarGradient: {
        width: 100,
        height: 100,
        borderRadius: 50,
        padding: 4,
    },
    avatarImage: {
        width: '100%',
        height: '100%',
        borderRadius: 46,
    },
    avatarPlaceholder: {
        flex: 1,
        backgroundColor: '#1E293B',
        borderRadius: 46,
        justifyContent: 'center',
        alignItems: 'center',
    },
    avatarText: {
        fontSize: 36,
        fontWeight: '800',
        color: '#F8FAFC',
    },
    proBadge: {
        position: 'absolute',
        bottom: 0,
        right: 0,
        backgroundColor: '#F59E0B',
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 12,
        borderWidth: 2,
        borderColor: '#0F172A',
    },
    proBadgeText: {
        fontSize: 10,
        fontWeight: '900',
        color: '#000',
    },
    userName: {
        fontSize: 24,
        fontWeight: '800',
        color: '#F8FAFC',
        marginBottom: 4,
    },
    userEmail: {
        fontSize: 14,
        color: '#94A3B8',
    },
    tilesContainer: {
        marginBottom: 40,
    },
    connectBadge: {
        backgroundColor: 'rgba(34, 211, 238, 0.1)',
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 10,
        borderWidth: 1,
        borderColor: 'rgba(34, 211, 238, 0.3)',
    },
    connectBadgeText: {
        color: '#22D3EE',
        fontSize: 12,
        fontWeight: '700',
    },
    logoutButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 16,
        borderRadius: 16,
        borderWidth: 1,
        borderColor: 'rgba(239, 68, 68, 0.2)',
        backgroundColor: 'rgba(239, 68, 68, 0.05)',
    },
    logoutText: {
        color: '#EF4444',
        fontSize: 16,
        fontWeight: '700',
    },
});
