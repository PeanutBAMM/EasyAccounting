import { create } from 'zustand';
import { Session, User } from '@supabase/supabase-js';
import * as AuthSession from 'expo-auth-session';
import * as WebBrowser from 'expo-web-browser';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from '../../lib/supabase';

// CRITICAL: This MUST be called to dismiss any pending auth sessions
// Without this, WebBrowser.openAuthSessionAsync will hang
WebBrowser.maybeCompleteAuthSession();

export interface AuthState {
    user: User | null;
    session: Session | null;
    isLoading: boolean;
    error: string | null;
    hasSeenOnboarding: boolean;
    signInWithGoogle: () => Promise<void>;
    signOut: () => Promise<void>;
    setSession: (session: Session | null) => void;
    clearError: () => void;
    completeOnboarding: () => Promise<void>;
    resetOnboarding: () => Promise<void>;
    signInWithEmail: (email: string, password: string) => Promise<void>;
    signUp: (email: string, password: string) => Promise<void>;
    resetPassword: (email: string) => Promise<void>;
    handleAuthLink: (url: string) => Promise<void>;
}

export const useAuthStore = create<AuthState>((set, get) => ({
    user: null,
    session: null,
    isLoading: true,
    error: null,
    hasSeenOnboarding: false,

    setSession: (session) => {
        set({
            session,
            user: session ? session.user : null,
            isLoading: false,
            error: null,
        });
    },

    clearError: () => {
        set({ error: null });
    },

    signInWithGoogle: async () => {
        // Prevent multiple simultaneous login attempts
        if (get().isLoading && get().session === null) {
            console.log('⏳ Login already in progress, ignoring duplicate call');
            return;
        }

        set({ isLoading: true, error: null });

        try {
            console.log('🔄 Starting Google Sign-In...');

            // 1. Create a redirect URI for your app
            // IMPORTANT: Expo Go does NOT support custom URL schemes for OAuth!
            // For development, you MUST use a Development Build (npx expo prebuild)
            // In production builds: This uses the custom scheme (easyaccounting://)
            const redirectUrl = AuthSession.makeRedirectUri({
                scheme: 'easyaccounting',
                path: 'auth-callback',
            });

            console.log('🔗 Generated Redirect URL:', redirectUrl);
            console.log('⚠️ NOTE: If using Expo Go, OAuth will NOT work. Use a Development Build instead.');

            // 2. Start the OAuth flow (get the URL only)
            const { data, error } = await supabase.auth.signInWithOAuth({
                provider: 'google',
                options: {
                    redirectTo: redirectUrl,
                    skipBrowserRedirect: true,
                    queryParams: {
                        prompt: 'select_account',
                        access_type: 'offline',
                    }
                },
            });

            if (error) {
                throw new Error(error.message || 'Kon Google OAuth niet starten');
            }

            if (!data?.url) {
                throw new Error('Geen OAuth URL ontvangen van Supabase');
            }

            console.log('🌍 Opening Browser Session with URL:', data.url);

            // 3. Open the Browser
            const result = await WebBrowser.openAuthSessionAsync(
                data.url,
                redirectUrl
            );

            console.log('✅ Browser Session Result:', result);

            // 4. Handle different result types
            if (result.type === 'success' && result.url) {
                console.log('🎯 Success URL received in auth session:', result.url);
                await handleOAuthCallback(result.url, set);
            } else if (result.type === 'dismiss' || result.type === 'cancel') {
                console.log('⚠️ User dismissed the OAuth browser');
                set({ isLoading: false, error: null });
            } else {
                console.log('⚠️ Unexpected browser result type:', result.type);
                // Also log the URL if it exists in other result types
                if ('url' in result) console.log('🔗 Link in result:', (result as any).url);
                set({ isLoading: false });
            }

        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Inloggen mislukt. Probeer het opnieuw.';
            console.error('❌ Google Sign-In Error:', errorMessage);
            set({
                isLoading: false,
                error: errorMessage
            });
        }
    },

    signOut: async () => {
        set({ isLoading: true, error: null });
        try {
            const { error } = await supabase.auth.signOut();
            if (error) {
                throw new Error(error.message || 'Uitloggen mislukt');
            }
            set({ session: null, user: null, isLoading: false });
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Uitloggen mislukt';
            console.error('❌ Sign Out Error:', errorMessage);
            set({ isLoading: false, error: errorMessage });
        }
    },

    completeOnboarding: async () => {
        try {
            await AsyncStorage.setItem('hasSeenOnboarding', 'true');
            set({ hasSeenOnboarding: true });
        } catch (error) {
            console.error('❌ Error saving onboarding status:', error);
        }
    },

    resetOnboarding: async () => {
        try {
            await AsyncStorage.removeItem('hasSeenOnboarding');
            set({ hasSeenOnboarding: false });
        } catch (error) {
            console.error('❌ Error resetting onboarding status:', error);
        }
    },

    signInWithEmail: async (email: string, password: string) => {
        set({ isLoading: true, error: null });
        try {
            const { data, error } = await supabase.auth.signInWithPassword({
                email,
                password,
            });
            if (error) throw error;
            set({ session: data.session, user: data.session?.user ?? null, isLoading: false });
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Inloggen mislukt';
            set({ error: errorMessage, isLoading: false });
        }
    },

    signUp: async (email: string, password: string) => {
        set({ isLoading: true, error: null });
        try {
            const redirectUrl = AuthSession.makeRedirectUri({
                scheme: 'easyaccounting',
                path: 'auth-callback'
            });

            const { data, error } = await supabase.auth.signUp({
                email,
                password,
                options: {
                    emailRedirectTo: redirectUrl,
                }
            });

            if (error) throw error;

            // If email confirmation is enabled, session might be null
            if (!data.session && data.user) {
                set({
                    isLoading: false,
                    error: 'Bevestig je e-mailadres via de link in de mail om in te loggen.'
                });
            } else {
                set({ session: data.session, user: data.session?.user ?? null, isLoading: false });
            }
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Registratie mislukt';
            set({ error: errorMessage, isLoading: false });
        }
    },

    resetPassword: async (email: string) => {
        set({ isLoading: true, error: null });
        try {
            const redirectUrl = AuthSession.makeRedirectUri({
                scheme: 'easyaccounting',
                path: 'auth-callback'
            });

            const { error } = await supabase.auth.resetPasswordForEmail(email, {
                redirectTo: redirectUrl,
            });

            if (error) throw error;
            set({ isLoading: false });
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Reset link versturen mislukt';
            set({ error: errorMessage, isLoading: false });
        }
    },

    handleAuthLink: async (url: string) => {
        try {
            set({ isLoading: true });
            await handleOAuthCallback(url, set);
        } catch (error) {
            console.error('❌ Error handling auth link:', error);
            set({ isLoading: false, error: 'Kon de link niet verwerken.' });
        }
    },
}));

// Initialize onboarding status from storage
AsyncStorage.getItem('hasSeenOnboarding').then((value) => {
    if (value === 'true') {
        useAuthStore.setState({ hasSeenOnboarding: true });
    }
});

/**
 * Handles the OAuth callback URL and exchanges the code for a session.
 * This is the SINGLE place where code exchange happens to prevent race conditions.
 */
async function handleOAuthCallback(
    url: string,
    set: (state: Partial<AuthState>) => void
): Promise<void> {
    console.log('🔍 Processing OAuth callback URL:', url);

    if (!url) {
        console.error('❌ Received empty URL in handleOAuthCallback');
        throw new Error('Geen URL ontvangen voor authenticatie');
    }

    // Try PKCE flow first (code parameter)
    const codeMatch = url.match(/[?&]code=([^&]+)/);

    // Fallback: Try Implicit flow (access_token in hash)
    const accessTokenMatch = url.match(/access_token=([^&]+)/);
    const refreshTokenMatch = url.match(/refresh_token=([^&]+)/);

    if (codeMatch && codeMatch[1]) {
        // PKCE Flow - Exchange code for session
        const code = decodeURIComponent(codeMatch[1]);
        console.log('🎟️ PKCE Code found, exchanging for session...');

        const { data: sessionData, error: sessionError } = await supabase.auth.exchangeCodeForSession(code);

        if (sessionError) {
            console.error('❌ Session Exchange Error:', sessionError);
            throw new Error(sessionError.message || 'Kon sessie niet valideren');
        }

        if (sessionData.session) {
            console.log('✅ Session Established via Code! User:', sessionData.session.user.email);
            set({
                session: sessionData.session,
                user: sessionData.session.user,
                isLoading: false,
                error: null
            });
        } else {
            throw new Error('Geen sessie ontvangen na code exchange');
        }
    } else if (accessTokenMatch && accessTokenMatch[1] && refreshTokenMatch && refreshTokenMatch[1]) {
        // Implicit Flow - Set session directly with tokens
        console.log('🔑 Implicit Tokens found, setting session directly...');
        const access_token = decodeURIComponent(accessTokenMatch[1]);
        const refresh_token = decodeURIComponent(refreshTokenMatch[1]);

        const { data: sessionData, error: sessionError } = await supabase.auth.setSession({
            access_token,
            refresh_token,
        });

        if (sessionError) {
            console.error('❌ Session Setting Error:', sessionError);
            throw new Error(sessionError.message || 'Kon sessie niet instellen');
        }

        if (sessionData.session) {
            console.log('✅ Session Established via Tokens! User:', sessionData.session.user.email);
            set({
                session: sessionData.session,
                user: sessionData.session.user,
                isLoading: false,
                error: null
            });
        } else {
            throw new Error('Geen sessie ontvangen na token exchange');
        }
    } else {
        // Check for error in callback URL
        const errorMatch = url.match(/error=([^&]+)/);
        const errorDescMatch = url.match(/error_description=([^&]+)/);

        if (errorMatch) {
            const errorDesc = errorDescMatch
                ? decodeURIComponent(errorDescMatch[1].replace(/\+/g, ' '))
                : 'OAuth fout opgetreden';
            throw new Error(errorDesc);
        }

        console.log('⚠️ No code OR tokens found in URL:', url);
        throw new Error('Geen authenticatiecode ontvangen. Probeer het opnieuw.');
    }
}
