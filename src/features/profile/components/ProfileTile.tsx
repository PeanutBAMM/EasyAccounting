import React from 'react';
import { TouchableOpacity, View, Text, StyleSheet, ViewStyle } from 'react-native';
import { Ionicons } from '@expo/vector-icons';


interface ProfileTileProps {
    title: string;
    subtitle?: string;
    icon: keyof typeof Ionicons.glyphMap;
    iconColor: string;
    onPress: () => void;
    rightElement?: React.ReactNode;
    style?: ViewStyle;
}

export default function ProfileTile({
    title,
    subtitle,
    icon,
    iconColor,
    onPress,
    rightElement,
    style
}: ProfileTileProps) {
    return (
        <TouchableOpacity
            style={[styles.container, style]}
            onPress={onPress}
            activeOpacity={0.7}
        >
            <View style={styles.glassBackground}>
                <View style={styles.leftContent}>
                    <View style={[styles.iconContainer, { backgroundColor: `${iconColor}20` }]}>
                        <Ionicons name={icon} size={24} color={iconColor} />
                    </View>
                    <View style={styles.textContainer}>
                        <Text style={styles.title}>{title}</Text>
                        {subtitle && <Text style={styles.subtitle}>{subtitle}</Text>}
                    </View>
                </View>

                <View style={styles.rightContent}>
                    {rightElement || <Ionicons name="chevron-forward" size={20} color="#64748B" />}
                </View>
            </View>
        </TouchableOpacity>
    );
}

const styles = StyleSheet.create({
    container: {
        marginBottom: 16,
        borderRadius: 24,
        overflow: 'hidden',
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.08)',
    },
    glassBackground: {
        backgroundColor: 'rgba(30, 41, 59, 0.5)',
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: 16,
    },
    leftContent: {
        flexDirection: 'row',
        alignItems: 'center',
        flex: 1,
    },
    iconContainer: {
        width: 48,
        height: 48,
        borderRadius: 14,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 16,
    },
    textContainer: {
        flex: 1,
    },
    title: {
        fontSize: 16,
        fontWeight: '700',
        color: '#F8FAFC',
        marginBottom: 2,
    },
    subtitle: {
        fontSize: 13,
        color: '#94A3B8',
    },
    rightContent: {
        marginLeft: 8,
    },
});
