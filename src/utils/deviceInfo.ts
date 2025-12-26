import * as Crypto from 'expo-crypto';
import AsyncStorage from '@react-native-async-storage/async-storage';

const DEVICE_ID_KEY = 'easyaccounting_device_id';

/**
 * Gets or generates a unique, persistent device ID for compliance audit trails.
 */
export const getDeviceId = async (): Promise<string> => {
    try {
        let deviceId = await AsyncStorage.getItem(DEVICE_ID_KEY);

        if (!deviceId) {
            deviceId = Crypto.randomUUID();
            await AsyncStorage.setItem(DEVICE_ID_KEY, deviceId);
            console.log('📱 Generated new persistent Device ID:', deviceId);
        } else {
            console.log('📱 Retrieved existing Device ID:', deviceId);
        }

        return deviceId;
    } catch (error) {
        console.error('❌ Failed to get/generate Device ID:', error);
        // Fallback to a random one if storage fails, though this shouldn't happen
        return Crypto.randomUUID();
    }
};
