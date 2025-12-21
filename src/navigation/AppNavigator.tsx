import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useAuthStore, AuthState } from '../features/auth/authStore';
import LoginScreen from '../features/auth/LoginScreen';
import HomeScreen from '../features/dashboard/HomeScreen';
import ReceiptListScreen from '../features/receipts/ReceiptListScreen';
import CameraScreen from '../features/receipts/CameraScreen';
import ReceiptDetailScreen from '../features/receipts/ReceiptDetailScreen';
import { View, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { TouchableOpacity, StyleSheet, Platform } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

const Tab = createBottomTabNavigator();
const Stack = createNativeStackNavigator();

const CustomTabBarButton = ({ children, onPress }: any) => (
    <TouchableOpacity
        style={styles.customButtonContainer}
        onPress={onPress}
        activeOpacity={0.8}
    >
        <LinearGradient
            colors={['#22D3EE', '#6366F1']}
            style={styles.customButtonGradient}
        >
            {children}
        </LinearGradient>
    </TouchableOpacity>
);

function HomeStack() {
    return (
        <Stack.Navigator screenOptions={{ headerShown: false }}>
            <Stack.Screen name="HomeScreen" component={HomeScreen} />
            <Stack.Screen name="ReceiptList" component={ReceiptListScreen} />
            <Stack.Screen name="ReceiptDetail" component={ReceiptDetailScreen} />
            <Stack.Screen name="Camera" component={CameraScreen} options={{ presentation: 'fullScreenModal' }} />
        </Stack.Navigator>
    );
}

function MainTabNavigator() {
    return (
        <Tab.Navigator
            screenOptions={({ route }) => ({
                headerShown: false,
                tabBarStyle: {
                    backgroundColor: '#0F172A',
                    borderTopWidth: 0,
                    height: Platform.OS === 'ios' ? 88 : 64,
                    paddingBottom: Platform.OS === 'ios' ? 28 : 8,
                    elevation: 0,
                    shadowOpacity: 0,
                },
                tabBarActiveTintColor: '#22D3EE',
                tabBarInactiveTintColor: '#64748B',
                tabBarShowLabel: false,
            })}
        >
            <Tab.Screen
                name="HomeStack"
                component={HomeStack}
                options={{
                    tabBarIcon: ({ focused, color }) => (
                        <Ionicons name={focused ? "home" : "home-outline"} size={26} color={color} />
                    )
                }}
            />

            <Tab.Screen
                name="CameraTab"
                component={CameraScreen}
                options={{
                    tabBarButton: (props) => (
                        <CustomTabBarButton {...props}>
                            <Ionicons name="camera" size={32} color="#0F172A" />
                        </CustomTabBarButton>
                    )
                }}
            />

            <Tab.Screen
                name="Profile"
                component={View}
                options={{
                    tabBarIcon: ({ focused, color }) => (
                        <Ionicons name={focused ? "person" : "person-outline"} size={26} color={color} />
                    )
                }}
            />
        </Tab.Navigator>
    );
}

const styles = StyleSheet.create({
    customButtonContainer: {
        top: -24,
        justifyContent: 'center',
        alignItems: 'center',
        shadowColor: '#22D3EE',
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.5,
        shadowRadius: 12,
        elevation: 10,
    },
    customButtonGradient: {
        width: 68,
        height: 68,
        borderRadius: 34,
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 3,
        borderColor: 'rgba(255, 255, 255, 0.2)',
    },
});

export default function AppNavigator() {
    const session = useAuthStore((state: AuthState) => state.session);
    const isLoading = useAuthStore((state: AuthState) => state.isLoading);

    if (isLoading) {
        return (
            <View style={{ flex: 1, backgroundColor: '#0F172A', justifyContent: 'center', alignItems: 'center' }}>
                <ActivityIndicator size="large" color="#22D3EE" />
            </View>
        )
    }

    return (
        <NavigationContainer>
            {session ? <MainTabNavigator /> : <LoginScreen />}
        </NavigationContainer>
    );
}
