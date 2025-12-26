import React, { memo } from 'react';
import { Image, StyleSheet, Dimensions, ImageStyle, StyleProp } from 'react-native';

const { width: DeviceWidth } = Dimensions.get('window');

interface BrandLogoProps {
    /**
     * Optional style to override or add to the default logo styles
     */
    style?: StyleProp<ImageStyle>;
    /**
     * Optional width override. Defaults to (DeviceWidth - 48) * 1.2
     */
    width?: number;
    /**
     * Optional height override. Defaults to 100
     */
    height?: number;
}

/**
 * Standardized Brand Logo component with optimized scaling.
 * 
 * Default dimensions are balanced to compensate for asset internal padding,
 * achieving a visually full-width appearance on mobile devices.
 */
const BrandLogo: React.FC<BrandLogoProps> = ({ style, width, height }) => {
    const defaultWidth = (DeviceWidth - 48) * 1.2;
    const defaultHeight = 100;

    return (
        <Image
            source={require('../../assets/brand/full_logo.png')}
            style={[
                styles.logo,
                {
                    width: width || defaultWidth,
                    height: height || defaultHeight,
                },
                style
            ]}
            resizeMode="contain"
        />
    );
};

const styles = StyleSheet.create({
    logo: {
        alignSelf: 'center',
    },
});

export default memo(BrandLogo);
