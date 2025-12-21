import 'react-native-url-polyfill/auto';
import { createClient } from '@supabase/supabase-js';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';

/**
 * Storage Adapter for Supabase Auth
 * 
 * Uses AsyncStorage for Expo Go / development (SecureStore has Android bugs)
 * In production builds, you can switch to SecureStore for better security.
 * 
 * Note: AsyncStorage is encrypted at rest on modern iOS/Android devices,
 * but for production apps with sensitive data, consider expo-secure-store
 * in a standalone build (not Expo Go).
 */
const ExpoStorageAdapter = {
    getItem: async (key: string): Promise<string | null> => {
        try {
            const value = await AsyncStorage.getItem(key);
            return value;
        } catch (error) {
            console.error('📦 Storage getItem error:', error);
            return null;
        }
    },
    setItem: async (key: string, value: string): Promise<void> => {
        try {
            await AsyncStorage.setItem(key, value);
        } catch (error) {
            console.error('📦 Storage setItem error:', error);
        }
    },
    removeItem: async (key: string): Promise<void> => {
        try {
            await AsyncStorage.removeItem(key);
        } catch (error) {
            console.error('📦 Storage removeItem error:', error);
        }
    },
};

// Supabase Configuration
const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_KEY!;

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
        storage: ExpoStorageAdapter,
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: Platform.OS === 'web',
    },
});
