import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
    View,
    Text,
    StyleSheet,
    Animated,
    TouchableOpacity,
    Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useNavigation } from '@react-navigation/native';
import { supabase } from '../lib/supabase';
import { useAuthStore } from '../features/auth/authStore';

type NotificationStatus = 'processing' | 'completed';

export default function BackgroundNotification() {
    const navigation = useNavigation();
    const user = useAuthStore((state) => state.user);
    const [visible, setVisible] = useState(false);
    const [status, setStatus] = useState<NotificationStatus>('processing');
    const [lastReceiptId, setLastReceiptId] = useState<string | null>(null);

    const translateY = useRef(new Animated.Value(-100)).current;

    const showNotification = useCallback(() => {
        setVisible(true);
        Animated.spring(translateY, {
            toValue: 0,
            useNativeDriver: true,
            tension: 50,
            friction: 8,
        }).start();
    }, [translateY]);

    const hideNotification = useCallback(() => {
        Animated.timing(translateY, {
            toValue: -120,
            duration: 300,
            useNativeDriver: true,
        }).start(() => setVisible(false));
    }, [translateY]);

    useEffect(() => {
        if (!user) return;

        // Subscribe to receipt changes for this user
        const channel = supabase
            .channel(`user-receipts-${user.id}`)
            .on(
                'postgres_changes',
                {
                    event: 'INSERT',
                    schema: 'public',
                    table: 'receipts',
                    filter: `user_id=eq.${user.id}`,
                },
                (payload) => {
                    console.log('✨ New receipt detected in background:', payload.new.id);
                    setLastReceiptId(payload.new.id);
                    setStatus('processing');
                    showNotification();
                }
            )
            .on(
                'postgres_changes',
                {
                    event: 'UPDATE',
                    schema: 'public',
                    table: 'receipts',
                    filter: `user_id=eq.${user.id}`,
                },
                (payload) => {
                    if (payload.new.status === 'review_required' && payload.old.status === 'processing') {
                        console.log('✅ Receipt processing completed:', payload.new.id);
                        setLastReceiptId(payload.new.id);
                        setStatus('completed');
                        showNotification();

                        // Auto-hide after 6 seconds if completed
                        setTimeout(hideNotification, 6000);
                    }
                }
            )
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [user, showNotification, hideNotification]);

    const handleOpenReceipt = () => {
        if (lastReceiptId) {
            hideNotification();
            // @ts-ignore - Navigation state and params for ReceiptDetail
            navigation.navigate('ReceiptDetail', { receiptId: lastReceiptId });
        }
    };

    if (!visible) return null;

    return (
        <Animated.View style={[styles.container, { transform: [{ translateY }] }]}>
            <LinearGradient
                colors={status === 'processing' ? ['#1E293B', '#0F172A'] : ['#22D3EE', '#6366F1']}
                style={styles.toast}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
            >
                <View style={styles.content}>
                    <View style={styles.iconContainer}>
                        {status === 'processing' ? (
                            <Ionicons name="cloud-upload-outline" size={24} color="#22D3EE" />
                        ) : (
                            <Ionicons name="checkmark-circle" size={24} color="white" />
                        )}
                    </View>
                    <View style={styles.textContainer}>
                        <Text style={[styles.title, status === 'completed' && { color: 'white' }]}>
                            {status === 'processing' ? 'Digitale bon wordt aangemaakt' : 'Digitale bon is klaar!'}
                        </Text>
                        <Text style={[styles.subtitle, status === 'completed' && { color: 'rgba(255,255,255,0.8)' }]}>
                            {status === 'processing' ? 'We analyseren de gegevens...' : 'Je kunt de bon nu bekijken.'}
                        </Text>
                    </View>
                    {status === 'completed' ? (
                        <TouchableOpacity style={styles.openButton} onPress={handleOpenReceipt}>
                            <Text style={styles.openButtonText}>OPEN</Text>
                        </TouchableOpacity>
                    ) : (
                        <TouchableOpacity style={styles.closeButton} onPress={hideNotification}>
                            <Ionicons name="close" size={20} color="#64748B" />
                        </TouchableOpacity>
                    )}
                </View>
            </LinearGradient>
        </Animated.View>
    );
}

const styles = StyleSheet.create({
    container: {
        position: 'absolute',
        top: Platform.OS === 'ios' ? 50 : 30,
        left: 16,
        right: 16,
        zIndex: 9999,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.3,
        shadowRadius: 20,
        elevation: 10,
    },
    toast: {
        borderRadius: 20,
        padding: 16,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.1)',
    },
    content: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    iconContainer: {
        marginRight: 12,
    },
    textContainer: {
        flex: 1,
    },
    title: {
        color: 'white',
        fontSize: 15,
        fontWeight: 'bold',
    },
    subtitle: {
        color: '#94A3B8',
        fontSize: 13,
        marginTop: 2,
    },
    openButton: {
        backgroundColor: 'white',
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 12,
        marginLeft: 8,
    },
    openButtonText: {
        color: '#0F172A',
        fontSize: 12,
        fontWeight: 'bold',
    },
    closeButton: {
        padding: 4,
    },
});
