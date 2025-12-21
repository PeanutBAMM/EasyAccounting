import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native';
import { useAuthStore, AuthState } from './authStore';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function LoginScreen() {
    const signInWithGoogle = useAuthStore((state: AuthState) => state.signInWithGoogle);
    const isLoading = useAuthStore((state: AuthState) => state.isLoading);
    const error = useAuthStore((state: AuthState) => state.error);
    const clearError = useAuthStore((state: AuthState) => state.clearError);

    const handleGoogleSignIn = async () => {
        // Clear any previous errors before attempting login
        clearError();
        await signInWithGoogle();
    };

    return (
        <SafeAreaView style={styles.container}>
            <View style={styles.content}>
                <View style={styles.logoContainer}>
                    {/* Placeholder for AnimatedAppLogo */}
                    <View style={styles.logoPlaceholder}>
                        <Text style={styles.logoText}>EA</Text>
                    </View>
                    <Text style={styles.title}>EasyAccounting</Text>
                    <Text style={styles.subtitle}>Scan, Verwerk, Klaar.</Text>
                </View>

                {/* Error Message Display */}
                {error && (
                    <View style={styles.errorContainer}>
                        <Text style={styles.errorText}>{error}</Text>
                        <TouchableOpacity onPress={clearError} style={styles.errorDismiss}>
                            <Text style={styles.errorDismissText}>✕</Text>
                        </TouchableOpacity>
                    </View>
                )}

                <TouchableOpacity
                    style={[styles.googleButton, isLoading && styles.googleButtonDisabled]}
                    onPress={handleGoogleSignIn}
                    disabled={isLoading}
                    activeOpacity={0.8}
                >
                    {isLoading ? (
                        <View style={styles.loadingContainer}>
                            <ActivityIndicator size="small" color="#0F172A" />
                            <Text style={[styles.googleButtonText, { marginLeft: 12 }]}>Bezig met inloggen...</Text>
                        </View>
                    ) : (
                        <View style={styles.buttonContent}>
                            <Text style={styles.googleIcon}>G</Text>
                            <Text style={styles.googleButtonText}>Doorgaan met Google</Text>
                        </View>
                    )}
                </TouchableOpacity>

                <Text style={styles.termsText}>
                    Door in te loggen ga je akkoord met onze{' '}
                    <Text style={styles.termsLink}>Voorwaarden</Text> en{' '}
                    <Text style={styles.termsLink}>Privacybeleid</Text>
                </Text>
            </View>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#0F172A', // Anthracite
    },
    content: {
        flex: 1,
        justifyContent: 'center',
        padding: 24,
    },
    logoContainer: {
        alignItems: 'center',
        marginBottom: 48,
    },
    logoPlaceholder: {
        width: 80,
        height: 80,
        borderRadius: 20,
        backgroundColor: '#22D3EE', // Neon Cyan
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 16,
        shadowColor: '#22D3EE',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
        elevation: 8,
    },
    logoText: {
        fontSize: 32,
        fontWeight: 'bold',
        color: '#000',
    },
    title: {
        fontSize: 32,
        fontWeight: 'bold',
        color: '#FFF',
        marginBottom: 8,
    },
    subtitle: {
        fontSize: 16,
        color: '#94A3B8', // Slate-400
    },
    errorContainer: {
        backgroundColor: 'rgba(239, 68, 68, 0.15)',
        borderColor: '#EF4444',
        borderWidth: 1,
        borderRadius: 12,
        padding: 16,
        marginBottom: 24,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
    },
    errorText: {
        color: '#FCA5A5',
        fontSize: 14,
        flex: 1,
        marginRight: 12,
    },
    errorDismiss: {
        padding: 4,
    },
    errorDismissText: {
        color: '#FCA5A5',
        fontSize: 18,
        fontWeight: 'bold',
    },
    googleButton: {
        backgroundColor: '#FFF',
        paddingVertical: 16,
        paddingHorizontal: 24,
        borderRadius: 12,
        alignItems: 'center',
        justifyContent: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 2,
        minHeight: 56,
    },
    googleButtonDisabled: {
        backgroundColor: '#E2E8F0',
    },
    buttonContent: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    loadingContainer: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    googleIcon: {
        fontSize: 20,
        fontWeight: 'bold',
        color: '#4285F4',
        marginRight: 12,
    },
    googleButtonText: {
        fontSize: 16,
        fontWeight: '600',
        color: '#0F172A',
    },
    termsText: {
        marginTop: 24,
        textAlign: 'center',
        fontSize: 12,
        color: '#64748B',
    },
    termsLink: {
        color: '#22D3EE',
        textDecorationLine: 'underline',
    },
});
