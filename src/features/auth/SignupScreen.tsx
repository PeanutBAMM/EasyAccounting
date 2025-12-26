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
    Dimensions,
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

const { width: DeviceWidth } = Dimensions.get('window');

export default function SignupScreen({ navigation }: { navigation: any }) {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [isPasswordVisible, setIsPasswordVisible] = useState(false);
    const [isConfirmVisible, setIsConfirmVisible] = useState(false);

    const { signUp, isLoading, error, clearError } = useAuthStore();

    useEffect(() => {
        return () => clearError();
    }, []);

    const handleSignup = async () => {
        if (!email || !password || !confirmPassword) return;
        if (password !== confirmPassword) {
            return;
        }
        await signUp(email, password);
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
                                Account Aanmaken
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
                                <Text style={styles.label}>Wachtwoord</Text>
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

                            <View style={styles.inputGroup}>
                                <Text style={styles.label}>Wachtwoord Bevestigen</Text>
                                <View style={styles.inputWrapper}>
                                    <Ionicons name="lock-closed-outline" size={20} color="#94A3B8" style={styles.inputIcon} />
                                    <TextInput
                                        style={styles.input}
                                        placeholder="••••••••"
                                        placeholderTextColor="#475569"
                                        value={confirmPassword}
                                        onChangeText={setConfirmPassword}
                                        secureTextEntry={!isConfirmVisible}
                                    />
                                    <TouchableOpacity
                                        style={styles.eyeIcon}
                                        onPress={() => setIsConfirmVisible(!isConfirmVisible)}
                                    >
                                        <Ionicons
                                            name={isConfirmVisible ? 'eye-off-outline' : 'eye-outline'}
                                            size={20}
                                            color="#94A3B8"
                                        />
                                    </TouchableOpacity>
                                </View>
                            </View>

                            <TouchableOpacity
                                style={styles.signupButtonContainer}
                                onPress={handleSignup}
                                disabled={isLoading}
                                activeOpacity={0.8}
                            >
                                <View style={styles.signupButton}>
                                    {isLoading ? (
                                        <ActivityIndicator color="#0F172A" />
                                    ) : (
                                        <Text style={styles.signupButtonText}>Account Aanmaken</Text>
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

                            <View style={styles.loginRow}>
                                <Text style={styles.loginText}>Heb je al een account? </Text>
                                <TouchableOpacity onPress={() => navigation.navigate('Login')}>
                                    <Text style={styles.loginLink}>Inloggen</Text>
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
        paddingTop: 10, // Reduced from 20
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
    signupButtonContainer: {
        marginTop: 12,
        marginBottom: 24,
    },
    signupButton: {
        height: 56,
        borderRadius: 12,
        backgroundColor: '#FFF',
        justifyContent: 'center',
        alignItems: 'center',
    },
    signupButtonText: {
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
    loginRow: {
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
    },
    loginText: {
        color: '#64748B',
        fontSize: 14,
    },
    loginLink: {
        color: '#22D3EE',
        fontSize: 14,
        fontWeight: '600',
    },
});
