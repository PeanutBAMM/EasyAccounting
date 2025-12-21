import React, { useEffect } from 'react';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import AppNavigator from './src/navigation/AppNavigator';
import * as Linking from 'expo-linking';
import { supabase } from './src/lib/supabase';
import { useAuthStore, AuthState } from './src/features/auth/authStore';

export default function App() {
  const setSession = useAuthStore((state: AuthState) => state.setSession);

  useEffect(() => {
    // 1. Listen for auth changes (State listener)
    // This handles session persistence and updates from Supabase
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      console.log('🔔 Auth State Changed:', _event, session ? `User: ${session.user.email}` : 'No session');
      setSession(session);
    });

    // 2. Deep Link Listener (Logging only - NO code exchange here!)
    // The actual code exchange happens in authStore.signInWithGoogle()
    // This listener is only for debugging and edge cases where the app
    // is opened via URL while auth flow is in progress
    const handleDeepLink = (event: { url: string }) => {
      console.log('🛸 Deep link received:', event.url);
      // We intentionally do NOT exchange code here to prevent race conditions
      // The authStore.signInWithGoogle() handles the complete flow
      // The onAuthStateChange listener above will pick up any session changes
    };

    const deepLinkSubscription = Linking.addEventListener('url', handleDeepLink);

    // 3. Set initial session from storage
    supabase.auth.getSession().then(({ data: { session } }) => {
      console.log('📱 Initial session check:', session ? `User: ${session.user.email}` : 'No session');
      setSession(session);
    });

    // Cleanup subscriptions
    return () => {
      subscription.unsubscribe();
      deepLinkSubscription.remove();
    };
  }, [setSession]);

  return (
    <SafeAreaProvider>
      <AppNavigator />
      <StatusBar style="light" />
    </SafeAreaProvider>
  );
}
