import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useAuthStore, AuthState } from '../features/auth/authStore';
import LoginScreen from '../features/auth/LoginScreen';
import SignupScreen from '../features/auth/SignupScreen';
import ForgotPasswordScreen from '../features/auth/ForgotPasswordScreen';
import OnboardingScreen from '../features/onboarding/OnboardingScreen';
import HomeScreen from '../features/dashboard/HomeScreen';
import ReceiptListScreen from '../features/receipts/ReceiptListScreen';
import CameraScreen from '../features/receipts/CameraScreen';
import ReceiptDetailScreen from '../features/receipts/ReceiptDetailScreen';
import ProfileScreen from '../features/profile/ProfileScreen';
import AccountingIntegrationScreen from '../features/profile/AccountingIntegrationScreen';
import { View, ActivityIndicator, TouchableOpacity, StyleSheet, Platform } from 'react-native';
import BackgroundNotification from '../components/BackgroundNotification';
import { Ionicons } from '@expo/vector-icons';
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

function AuthStack() {
    return (
        <Stack.Navigator screenOptions={{ headerShown: false, animation: 'slide_from_right' }}>
            <Stack.Screen name="Login" component={LoginScreen} />
            <Stack.Screen name="Signup" component={SignupScreen} />
            <Stack.Screen name="ForgotPassword" component={ForgotPasswordScreen} />
        </Stack.Navigator>
    );
}

function HomeStack() {
    return (
        <Stack.Navigator screenOptions={{ headerShown: false }}>
            <Stack.Screen name="HomeScreen" component={HomeScreen} />
            <Stack.Screen name="ReceiptList" component={ReceiptListScreen} />
            <Stack.Screen name="ReceiptDetail" component={ReceiptDetailScreen} />
            <Stack.Screen name="Camera" component={CameraScreen} options={{ presentation: 'fullScreenModal' }} />
            <Stack.Screen name="Profile" component={ProfileScreen} />
            <Stack.Screen name="AccountingIntegration" component={AccountingIntegrationScreen} />
        </Stack.Navigator>
    );
}

function ReceiptStack() {
    return (
        <Stack.Navigator screenOptions={{ headerShown: false }}>
            <Stack.Screen name="ReceiptList" component={ReceiptListScreen} />
            <Stack.Screen name="ReceiptDetail" component={ReceiptDetailScreen} />
        </Stack.Navigator>
    );
}

function MainTabNavigator() {
    return (
        <Tab.Navigator
            screenOptions={() => ({
                headerShown: false,
                tabBarStyle: {
                    backgroundColor: '#0F172A',
                    borderTopWidth: 0,
                    height: Platform.OS === 'ios' ? 90 : 75, // Slightly taller for better spacing
                    paddingBottom: Platform.OS === 'ios' ? 30 : 15, // More padding to avoid edge
                    elevation: 10,
                    shadowColor: '#000',
                    shadowOffset: { width: 0, height: -4 },
                    shadowOpacity: 0.1,
                    shadowRadius: 8,
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
                name="Receipts"
                component={ReceiptStack}
                options={{
                    tabBarIcon: ({ focused, color }) => (
                        <Ionicons name={focused ? "receipt" : "receipt-outline"} size={26} color={color} />
                    )
                }}
            />
        </Tab.Navigator>
    );
}

const styles = StyleSheet.create({
    customButtonContainer: {
        top: -24, // Lifted slightly more
        justifyContent: 'center',
        alignItems: 'center',
        shadowColor: '#22D3EE',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
        elevation: 8,
    },
    customButtonGradient: {
        width: 64,
        height: 64,
        borderRadius: 32,
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 2,
        borderColor: 'rgba(255, 255, 255, 0.3)',
    },
});

export default function AppNavigator() {
    const session = useAuthStore((state: AuthState) => state.session);
    const isLoading = useAuthStore((state: AuthState) => state.isLoading);
    const hasSeenOnboarding = useAuthStore((state: AuthState) => state.hasSeenOnboarding);

    if (isLoading) {
        return (
            <View style={{ flex: 1, backgroundColor: '#0F172A', justifyContent: 'center', alignItems: 'center' }}>
                <ActivityIndicator size="large" color="#22D3EE" />
            </View>
        )
    }

    return (
        <NavigationContainer>
            {!hasSeenOnboarding ? (
                <OnboardingScreen />
            ) : session ? (
                <MainTabNavigator />
            ) : (
                <AuthStack />
            )}
            <BackgroundNotification />
        </NavigationContainer>
    );
}
