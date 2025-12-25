import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TextInput,
    TouchableOpacity,
    KeyboardAvoidingView,
    Platform,
    ScrollView,
    Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { supabase } from '../../lib/supabase';
import { useAuthStore } from './authStore';
import AppBackground from '../../components/AppBackground';
import BrandLogo from '../../components/BrandLogo';
import { ActivityIndicator } from 'react-native';

const { width: DeviceWidth } = Dimensions.get('window');

export default function ForgotPasswordScreen({ navigation }: { navigation: any }) {
    const [email, setEmail] = useState('');
    const [isSubmitted, setIsSubmitted] = useState(false);

    const { resetPassword, isLoading, error, clearError } = useAuthStore();

    useEffect(() => {
        return () => clearError();
    }, []);

    const handleReset = async () => {
        if (!email) return;
        await resetPassword(email);
        // Check success after the call
        if (!useAuthStore.getState().error) {
            setIsSubmitted(true);
        }
    };

    return (
        <AppBackground>
            <SafeAreaView style={styles.safeArea}>
                <KeyboardAvoidingView
                    behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                    style={styles.keyboardView}
                >
                    <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
                        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
                            <Ionicons name="arrow-back" size={24} color="#FFF" />
                        </TouchableOpacity>

                        <View style={styles.header}>
                            <BrandLogo />
                            <Text style={styles.subtitle}>
                                {isSubmitted
                                    ? 'Check je e-mail voor instructies om je wachtwoord te resetten.'
                                    : 'Wachtwoord Vergeten?'}
                            </Text>
                        </View>

                        {!isSubmitted ? (
                            <View style={styles.form}>
                                {error && (
                                    <View style={styles.errorContainer}>
                                        <Ionicons name="alert-circle" size={20} color="#EF4444" />
                                        <Text style={styles.errorText}>{error}</Text>
                                    </View>
                                )}

                                <View style={styles.inputGroup}>
                                    <Text style={styles.label}>E-mailadres</Text>
                                    <View style={styles.inputWrapper}>
                                        <Ionicons name="mail-outline" size={20} color="#94A3B8" style={styles.inputIcon} />
                                        <TextInput
                                            style={styles.input}
                                            placeholder="naam@bedrijf.nl"
                                            placeholderTextColor="#475569"
                                            value={email}
                                            onChangeText={setEmail}
                                            autoCapitalize="none"
                                            keyboardType="email-address"
                                        />
                                    </View>
                                </View>

                                <TouchableOpacity
                                    style={styles.resetButtonContainer}
                                    onPress={handleReset}
                                    disabled={isLoading}
                                    activeOpacity={0.8}
                                >
                                    <View style={styles.resetButton}>
                                        {isLoading ? (
                                            <ActivityIndicator color="#0F172A" />
                                        ) : (
                                            <Text style={styles.resetButtonText}>Reset Link Versturen</Text>
                                        )}
                                    </View>
                                </TouchableOpacity>
                            </View>
                        ) : (
                            <TouchableOpacity
                                style={styles.resetButtonContainer}
                                onPress={() => navigation.navigate('Login')}
                                activeOpacity={0.8}
                            >
                                <View style={styles.resetButton}>
                                    <Text style={styles.resetButtonText}>Terug naar Inloggen</Text>
                                </View>
                            </TouchableOpacity>
                        )}
                    </ScrollView>
                </KeyboardAvoidingView>
            </SafeAreaView>
        </AppBackground>
    );
}

const styles = StyleSheet.create({
    safeArea: {
        flex: 1,
    },
    keyboardView: {
        flex: 1,
    },
    scrollContent: {
        paddingHorizontal: 24,
        paddingTop: 40,
        paddingBottom: 40,
    },
    backButton: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: 'rgba(255, 255, 255, 0.05)',
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 32,
    },
    header: {
        alignItems: 'center',
        marginBottom: 33,
    },
    subtitle: {
        fontSize: 13,
        color: '#CBD5E1',
        fontWeight: '500',
        textAlign: 'center',
        lineHeight: 18,
        paddingHorizontal: 10,
    },
    form: {
        width: '100%',
    },
    errorContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'rgba(239, 68, 68, 0.1)',
        padding: 12,
        borderRadius: 12,
        marginBottom: 24,
        borderWidth: 1,
        borderColor: 'rgba(239, 68, 68, 0.2)',
    },
    errorText: {
        color: '#FCA5A5',
        fontSize: 14,
        marginLeft: 8,
        flex: 1,
    },
    inputGroup: {
        marginBottom: 20,
    },
    label: {
        color: '#94A3B8',
        fontSize: 14,
        fontWeight: '600',
        marginBottom: 8,
    },
    inputWrapper: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'rgba(30, 41, 59, 0.5)',
        borderRadius: 12,
        borderWidth: 1,
        borderColor: '#334155',
        height: 56,
        paddingHorizontal: 16,
    },
    inputIcon: {
        marginRight: 12,
    },
    input: {
        flex: 1,
        color: '#FFF',
        fontSize: 16,
    },
    resetButtonContainer: {
        marginTop: 12,
        marginBottom: 24,
    },
    resetButton: {
        height: 56,
        borderRadius: 12,
        backgroundColor: '#FFF',
        justifyContent: 'center',
        alignItems: 'center',
    },
    resetButtonText: {
        color: '#0F172A',
        fontSize: 16,
        fontWeight: 'bold',
    },
});
