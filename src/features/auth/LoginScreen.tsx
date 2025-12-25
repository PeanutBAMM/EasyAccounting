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
    ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { supabase } from '../../lib/supabase';
import { useAuthStore } from './authStore';
import AppBackground from '../../components/AppBackground';
import BrandLogo from '../../components/BrandLogo';
import GoogleIcon from '../../components/GoogleIcon';
import FooterSafeZone from '../../components/FooterSafeZone';
import { Dimensions } from 'react-native';

const { width: DeviceWidth } = Dimensions.get('window');

export default function LoginScreen({ navigation }: { navigation: any }) {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [isPasswordVisible, setIsPasswordVisible] = useState(false);

    const { signInWithEmail, isLoading, error, clearError } = useAuthStore();

    useEffect(() => {
        return () => clearError();
    }, []);

    const handleLogin = async () => {
        if (!email || !password) return;
        await signInWithEmail(email, password);
    };

    return (
        <AppBackground>
            <SafeAreaView style={styles.safeArea}>
                <KeyboardAvoidingView
                    behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                    style={styles.keyboardView}
                >
                    <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
                        <View style={styles.header}>
                            <BrandLogo />
                            <Text style={styles.subtitle}>
                                Eenvoudig en snel boekhouden, stuur met één druk op de knop je fysieke bonnen door als digitale bonnen naar je boekhoudpakket.
                            </Text>
                        </View>

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

                            <View style={styles.inputGroup}>
                                <View style={styles.labelRow}>
                                    <Text style={styles.label}>Wachtwoord</Text>
                                    <TouchableOpacity onPress={() => navigation.navigate('ForgotPassword')}>
                                        <Text style={styles.forgotLink}>Vergeten?</Text>
                                    </TouchableOpacity>
                                </View>
                                <View style={styles.inputWrapper}>
                                    <Ionicons name="lock-closed-outline" size={20} color="#94A3B8" style={styles.inputIcon} />
                                    <TextInput
                                        style={styles.input}
                                        placeholder="••••••••"
                                        placeholderTextColor="#475569"
                                        value={password}
                                        onChangeText={setPassword}
                                        secureTextEntry={!isPasswordVisible}
                                    />
                                    <TouchableOpacity
                                        style={styles.eyeIcon}
                                        onPress={() => setIsPasswordVisible(!isPasswordVisible)}
                                    >
                                        <Ionicons
                                            name={isPasswordVisible ? 'eye-off-outline' : 'eye-outline'}
                                            size={20}
                                            color="#94A3B8"
                                        />
                                    </TouchableOpacity>
                                </View>
                            </View>

                            <TouchableOpacity
                                style={styles.loginButtonContainer}
                                onPress={handleLogin}
                                disabled={isLoading}
                                activeOpacity={0.8}
                            >
                                <View style={styles.loginButton}>
                                    {isLoading ? (
                                        <ActivityIndicator color="#0F172A" />
                                    ) : (
                                        <Text style={styles.loginButtonText}>Inloggen</Text>
                                    )}
                                </View>
                            </TouchableOpacity>

                            <View style={styles.divider}>
                                <View style={styles.line} />
                                <Text style={styles.dividerText}>of log in met</Text>
                                <View style={styles.line} />
                            </View>

                            <TouchableOpacity
                                style={styles.googleButtonContainer}
                                onPress={() => useAuthStore.getState().signInWithGoogle()}
                                activeOpacity={0.8}
                            >
                                <LinearGradient
                                    colors={['#22D3EE', '#A855F7']}
                                    style={styles.googleButton}
                                    start={{ x: 0, y: 0 }}
                                    end={{ x: 1, y: 1 }}
                                >
                                    <View style={styles.whiteIconCircle}>
                                        <GoogleIcon size={18} />
                                    </View>
                                    <Text style={styles.googleButtonTextPrimary}>Inloggen met Google</Text>
                                </LinearGradient>
                            </TouchableOpacity>

                            <View style={styles.signupRow}>
                                <Text style={styles.signupText}>Nog geen account? </Text>
                                <TouchableOpacity onPress={() => navigation.navigate('Signup')}>
                                    <Text style={styles.signupLink}>Account aanmaken</Text>
                                </TouchableOpacity>
                            </View>
                        </View>
                    </ScrollView>
                </KeyboardAvoidingView>
            </SafeAreaView>
            <FooterSafeZone />
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
        paddingTop: 40, // Reduced from 60
        paddingBottom: 40,
    },
    header: {
        alignItems: 'center',
        marginBottom: 33, // Reduced from 48 to keep follow-up elements in place
    },
    subtitle: {
        fontSize: 13, // Smaller text
        color: '#CBD5E1', // More prominent contrast
        fontWeight: '500',
        textAlign: 'center',
        lineHeight: 18,
        paddingHorizontal: 20,
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
    labelRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 8,
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
    eyeIcon: {
        padding: 8,
    },
    forgotLink: {
        color: '#22D3EE',
        fontSize: 14,
        fontWeight: '600',
    },
    loginButtonContainer: {
        marginTop: 12,
        marginBottom: 24,
    },
    loginButton: {
        height: 56,
        borderRadius: 12,
        backgroundColor: '#FFF',
        justifyContent: 'center',
        alignItems: 'center',
    },
    loginButtonText: {
        color: '#0F172A',
        fontSize: 16,
        fontWeight: 'bold',
    },
    divider: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 24,
    },
    line: {
        flex: 1,
        height: 1,
        backgroundColor: '#334155',
    },
    dividerText: {
        color: '#64748B',
        paddingHorizontal: 16,
        fontSize: 14,
    },
    googleButtonContainer: {
        height: 56,
        borderRadius: 12,
        overflow: 'hidden',
        marginBottom: 24,
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.15)',
    },
    googleButton: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
    },
    googleButtonTextPrimary: {
        color: '#FFF',
        fontSize: 16,
        fontWeight: 'bold',
        marginLeft: 12,
    },
    whiteIconCircle: {
        width: 32,
        height: 32,
        borderRadius: 16,
        backgroundColor: '#FFF',
        justifyContent: 'center',
        alignItems: 'center',
    },
    signupRow: {
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
    },
    signupText: {
        color: '#64748B',
        fontSize: 14,
    },
    signupLink: {
        color: '#22D3EE',
        fontSize: 14,
        fontWeight: '600',
    },
});
