import React from 'react';
import { StyleSheet, View, Dimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const { width } = Dimensions.get('window');

const FooterSafeZone = () => {
    const insets = useSafeAreaInsets();

    // We want the footer to at least have some height even if insets.bottom is 0
    // but the design shows it as a "safe zone" background.
    // If insets.bottom is 0, we might still want a small rounded bar or nothing.
    // Given the "literally only the safezone" instruction, we follow the insets.

    return (
        <View
            style={[
                styles.footer,
                {
                    height: Math.max(insets.bottom, 20), // Ensure some visibility if no inset
                    paddingBottom: insets.bottom
                }
            ]}
        />
    );
};

const styles = StyleSheet.create({
    footer: {
        width: '100%',
        backgroundColor: '#0B111D', // Deep midnight blue for the footer zone
        // Abstract depth effect
        shadowColor: '#000',
        shadowOffset: { width: 0, height: -10 },
        shadowOpacity: 0.3,
        shadowRadius: 20,
        elevation: 20,
        position: 'absolute',
        bottom: 0,
    },
});

export default React.memo(FooterSafeZone);
