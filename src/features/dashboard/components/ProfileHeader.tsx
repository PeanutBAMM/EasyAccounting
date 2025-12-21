import React from 'react';
import { View, Text, StyleSheet, Image, TouchableOpacity } from 'react-native';
import { getGreeting } from '../../../utils/formatters';

interface ProfileHeaderProps {
    userName: string;
    avatarUrl?: string | null;
    isPro: boolean;
    onProfilePress: () => void;
}

export default function ProfileHeader({ userName, avatarUrl, isPro, onProfilePress }: ProfileHeaderProps) {
    return (
        <View style={styles.container}>
            <View style={styles.textContainer}>
                <Text style={styles.greeting}>{getGreeting()},</Text>
                <Text style={styles.userName}>{userName}</Text>
            </View>

            <TouchableOpacity onPress={onProfilePress} style={styles.profileButton} activeOpacity={0.8}>
                <View style={[styles.avatarContainer, isPro && styles.proBorder]}>
                    <Image
                        source={avatarUrl ? { uri: avatarUrl } : require('../../../../assets/adaptive-icon.png')}
                        style={styles.avatar}
                    />
                    {isPro && (
                        <View style={styles.proBadge}>
                            <Text style={styles.proBadgeText}>PRO</Text>
                        </View>
                    )}
                </View>
            </TouchableOpacity>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 24,
        paddingTop: 16,
        paddingBottom: 24,
    },
    textContainer: {
        flex: 1,
    },
    greeting: {
        fontSize: 14,
        color: '#94A3B8', // Slate-400
        fontWeight: '500',
    },
    userName: {
        fontSize: 24,
        fontWeight: 'bold',
        color: '#FFFFFF',
    },
    profileButton: {
        marginLeft: 16,
    },
    avatarContainer: {
        width: 50,
        height: 50,
        borderRadius: 25,
        backgroundColor: '#1E293B',
        padding: 2,
    },
    proBorder: {
        borderWidth: 2.5,
        borderColor: '#EAB308',
    },
    avatar: {
        width: '100%',
        height: '100%',
        borderRadius: 24,
    },
    proBadge: {
        position: 'absolute',
        bottom: -2,
        right: -2,
        backgroundColor: '#EAB308',
        borderRadius: 10,
        paddingHorizontal: 5,
        paddingVertical: 2,
        borderWidth: 2,
        borderColor: '#0F172A',
        shadowColor: '#EAB308',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.5,
        shadowRadius: 4,
    },
    proBadgeText: {
        fontSize: 9,
        fontWeight: '900',
        color: '#000000',
        letterSpacing: -0.5,
    },
});
