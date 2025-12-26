import React, { useState, useCallback, useEffect } from 'react';
import {
    View,
    StyleSheet,
    ScrollView,
    RefreshControl,
    ActivityIndicator,
    StatusBar
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { useNavigation, NavigationProp } from '@react-navigation/native';
import { useAuthStore } from '../auth/authStore';
import { supabase } from '../../lib/supabase';
import AppBackground from '../../components/AppBackground';

import ProfileHeader from './components/ProfileHeader';
import MonthlyScansWidget from './components/MonthlyScansWidget';
import FinanceStatsWidget from './components/FinanceStatsWidget';
import RecentReceiptsGrid from './components/RecentReceiptsGrid';

import {
    getDashboardStats,
    getRecentReceiptsForDashboard,
    MonthlyFinanceStats,
    RecentReceiptSummary
} from './dashboardService';

type DashboardStackParamList = {
    HomeScreen: undefined;
    ReceiptList: undefined;
    Camera: undefined;
    Profile: undefined;
};

export default function HomeScreen() {
    const navigation = useNavigation<NavigationProp<DashboardStackParamList>>();
    const user = useAuthStore(state => state.user);

    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);

    const [stats, setStats] = useState<MonthlyFinanceStats | null>(null);
    const [recentReceipts, setRecentReceipts] = useState<RecentReceiptSummary[]>([]);

    const fetchData = useCallback(async () => {
        if (!user) return;

        try {
            const [dashboardStats, receipts] = await Promise.all([
                getDashboardStats(user.id),
                getRecentReceiptsForDashboard(user.id)
            ]);

            setStats(dashboardStats);
            setRecentReceipts(receipts);
        } catch (error) {
            console.error('❌ Error fetching dashboard data:', error);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, [user]);

    useEffect(() => {
        fetchData();

        // Subscribe to real-time updates for receipts
        const subscription = supabase
            .channel('dashboard-updates')
            .on(
                'postgres_changes',
                {
                    event: '*',
                    schema: 'public',
                    table: 'receipts',
                    filter: `user_id=eq.${user?.id}`
                },
                (payload: any) => {
                    console.log('🔄 Receipt change detected, refreshing dashboard...', payload.eventType);
                    fetchData();
                }
            )
            .subscribe();

        return () => {
            supabase.removeChannel(subscription);
        };
    }, [fetchData, user?.id]);

    const onRefresh = useCallback(() => {
        setRefreshing(true);
        fetchData();
    }, [fetchData]);

    if (loading && !stats) {
        return (
            <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color="#22D3EE" />
            </View>
        );
    }

    return (
        <AppBackground>
            <StatusBar barStyle="light-content" />
            <SafeAreaView style={styles.safeArea}>
                <ProfileHeader
                    userName={user?.user_metadata?.full_name?.split(' ')[0] || user?.email?.split('@')[0] || 'Ricardo'}
                    avatarUrl={user?.user_metadata?.avatar_url}
                    isPro={stats?.scanLimit === 50}
                    onProfilePress={() => navigation.navigate('Profile' as any)}
                />

                <View style={styles.contentWrapper}>
                    <ScrollView
                        contentContainerStyle={styles.scrollContent}
                        showsVerticalScrollIndicator={false}
                        refreshControl={
                            <RefreshControl
                                refreshing={refreshing}
                                onRefresh={onRefresh}
                                tintColor="#22D3EE"
                            />
                        }
                    >
                        {stats && (
                            <>
                                <MonthlyScansWidget
                                    scanCount={stats.scanCount}
                                    scanLimit={stats.scanLimit}
                                />

                                <FinanceStatsWidget
                                    totalInclBTW={stats.totalInclBTW}
                                    totalExclBTW={stats.totalExclBTW}
                                    btw21Total={stats.btw21Total}
                                    btw9Total={stats.btw9Total}
                                    btw0Total={stats.btw0Total}
                                />
                            </>
                        )}

                        <RecentReceiptsGrid
                            receipts={recentReceipts}
                            onReceiptPress={(id) => navigation.navigate('ReceiptDetail' as any, { receiptId: id })}
                            onShowMorePress={() => navigation.navigate('ReceiptList')}
                        />

                        {/* Spacer at bottom for Tab Bar visibility */}
                        <View style={{ height: 20 }} />
                    </ScrollView>
                </View>
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
        // backgroundColor: '#0F172A', // REMOVED: Covered the AppBackground grid
    },
    loadingContainer: {
        flex: 1,
        backgroundColor: '#0F172A',
        justifyContent: 'center',
        alignItems: 'center',
    },
    contentWrapper: {
        flex: 1,
        marginTop: -10, // Pull up to reduce header gap
    },
    scrollContent: {
        paddingTop: 0, // Reduced padding
    },
});
