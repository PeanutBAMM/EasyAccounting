import React, { useRef, useState, useEffect } from 'react';
import { Asset } from 'expo-asset';
import {
    View,
    Text,
    StyleSheet,
    Dimensions,
    TouchableOpacity,
    Image,
    SafeAreaView,
} from 'react-native';
import Animated, {
    useAnimatedStyle,
    useSharedValue,
    withTiming,
    interpolate,
    useAnimatedScrollHandler,
    SharedValue,
} from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import { useAuthStore } from '../auth/authStore';
import { useNavigation } from '@react-navigation/native';
import AppBackground from '../../components/AppBackground';
import BrandLogo from '../../components/BrandLogo';

const { width, height } = Dimensions.get('window');

const ONBOARDING_DATA = [
    {
        id: '1',
        title: 'Eenvoudig Scannen',
        description: 'Maak een foto van je bonnetje of factuur en wij regelen de rest.',
        image: require('../../../assets/onboarding/onboarding_scan_v2.png'),
        spotlight: '#22D3EE',
    },
    {
        id: '2',
        title: 'Slimme Herkenning',
        description: 'Onze AI wijst automatisch de juiste BTW tarieven en boekhoudcodes toe.',
        image: require('../../../assets/onboarding/onboarding_ai_v2.png'),
        spotlight: '#A855F7',
    },
    {
        id: '3',
        title: 'Direct Doorsturen',
        description: 'Koppel je favoriete boekhoudpakket en verstuur je bonnen met één druk op de knop.',
        image: require('../../../assets/onboarding/onboarding_sync_v2.png'),
        spotlight: '#6366F1',
    },
    {
        id: '4',
        title: 'Cloud Storage',
        description: 'Je bonnen worden veilig opgeslagen in de cloud.',
        image: require('../../../assets/onboarding/onboarding_secure_v2.png'),
        spotlight: '#3B82F6',
    },
];

const OnboardingItem = ({ item, scrollX, index }: { item: any, scrollX: SharedValue<number>, index: number }) => {
    const animatedImageStyle = useAnimatedStyle(() => {
        const opacity = interpolate(
            scrollX.value,
            [(index - 0.5) * width, index * width, (index + 0.5) * width],
            [0, 1, 0]
        );
        const scale = interpolate(
            scrollX.value,
            [(index - 1) * width, index * width, (index + 1) * width],
            [0.9, 1, 0.9]
        );
        return {
            opacity,
            transform: [{ scale }],
        };
    });

    const animatedTextStyle = useAnimatedStyle(() => {
        const opacity = interpolate(
            scrollX.value,
            [(index - 0.5) * width, index * width, (index + 0.5) * width],
            [0, 1, 0]
        );
        const translateY = interpolate(
            scrollX.value,
            [(index - 0.5) * width, index * width, (index + 0.5) * width],
            [20, 0, -20]
        );
        return {
            opacity,
            transform: [{ translateY }],
        };
    });

    return (
        <View style={styles.itemContainer}>
            <Animated.View style={[styles.textWrapper, animatedTextStyle]}>
                <Text style={styles.title}>{item.title}</Text>
                <Text style={styles.description}>{item.description}</Text>
            </Animated.View>

            <Animated.View style={[styles.imageWrapper, animatedImageStyle]}>
                {/* Spotlight Background Effect */}
                <View style={styles.spotlightWrapper}>
                    <LinearGradient
                        colors={[`${item.spotlight}33`, 'transparent']}
                        style={styles.spotlight}
                    />
                </View>
                <Image source={item.image} style={styles.image} resizeMode="contain" />
            </Animated.View>
        </View>
    );
};

const PaginationDot = ({ index, scrollX }: { index: number, scrollX: SharedValue<number> }) => {
    const animatedDotStyle = useAnimatedStyle(() => {
        const w = interpolate(
            scrollX.value,
            [(index - 1) * width, index * width, (index + 1) * width],
            [8, 24, 8],
            'clamp'
        );
        const opacity = interpolate(
            scrollX.value,
            [(index - 1) * width, index * width, (index + 1) * width],
            [0.3, 1, 0.3],
            'clamp'
        );
        return { width: w, opacity };
    });

    return <Animated.View style={[styles.dot, animatedDotStyle]} />;
};

export default function OnboardingScreen() {
    const scrollX = useSharedValue(0);
    const flatListRef = useRef<any>(null);
    const [currentIndex, setCurrentIndex] = useState(0);
    const [assetsLoaded, setAssetsLoaded] = useState(false);
    const completeOnboarding = useAuthStore((state) => state.completeOnboarding);

    const buttonScale = useSharedValue(1);
    const buttonOpacity = useSharedValue(1);

    const onScroll = useAnimatedScrollHandler((event) => {
        scrollX.value = event.contentOffset.x;
    });

    const animatedButtonStyle = useAnimatedStyle(() => ({
        transform: [{ scale: buttonScale.value }],
        opacity: buttonOpacity.value,
    }));

    const onPressIn = () => {
        buttonScale.value = withTiming(0.88, { duration: 100 });
        buttonOpacity.value = withTiming(0.8, { duration: 100 });
    };

    const onPressOut = () => {
        buttonScale.value = withTiming(1, { duration: 100 });
        buttonOpacity.value = withTiming(1, { duration: 100 });
    };

    useEffect(() => {
        const preloadAssets = async () => {
            try {
                const imageAssets = ONBOARDING_DATA.map(item =>
                    Asset.fromModule(item.image).downloadAsync()
                );
                const logoAsset = Asset.fromModule(require('../../../assets/brand/full_logo.png')).downloadAsync();

                await Promise.all([...imageAssets, logoAsset]);
                setAssetsLoaded(true);
            } catch (error) {
                console.warn('Error preloading assets:', error);
                setAssetsLoaded(true); // Proceed anyway to avoid being stuck
            }
        };
        preloadAssets();
    }, []);

    const handleNext = () => {
        if (currentIndex < ONBOARDING_DATA.length - 1) {
            flatListRef.current?.scrollToIndex({ index: currentIndex + 1 });
            setCurrentIndex(currentIndex + 1);
        } else {
            completeOnboarding();
        }
    };

    const onViewableItemsChanged = useRef(({ viewableItems }: any) => {
        if (viewableItems.length > 0) {
            setCurrentIndex(viewableItems[0].index);
        }
    }).current;

    const animatedText1Style = useAnimatedStyle(() => ({
        opacity: interpolate(
            scrollX.value,
            [(ONBOARDING_DATA.length - 2) * width, (ONBOARDING_DATA.length - 1) * width],
            [1, 0],
            'clamp'
        ),
        transform: [{
            translateY: interpolate(
                scrollX.value,
                [(ONBOARDING_DATA.length - 2) * width, (ONBOARDING_DATA.length - 1) * width],
                [0, -10],
                'clamp'
            )
        }]
    }));

    const animatedText2Style = useAnimatedStyle(() => ({
        opacity: interpolate(
            scrollX.value,
            [(ONBOARDING_DATA.length - 2) * width, (ONBOARDING_DATA.length - 1) * width],
            [0, 1],
            'clamp'
        ),
        transform: [{
            translateY: interpolate(
                scrollX.value,
                [(ONBOARDING_DATA.length - 2) * width, (ONBOARDING_DATA.length - 1) * width],
                [10, 0],
                'clamp'
            )
        }]
    }));

    if (!assetsLoaded) return null;

    return (
        <AppBackground>
            <SafeAreaView style={styles.container}>
                <Animated.FlatList
                    ref={flatListRef}
                    data={ONBOARDING_DATA}
                    horizontal
                    pagingEnabled
                    showsHorizontalScrollIndicator={false}
                    onScroll={onScroll}
                    scrollEventThrottle={16}
                    keyExtractor={(item) => item.id}
                    onViewableItemsChanged={onViewableItemsChanged}
                    viewabilityConfig={{ viewAreaCoveragePercentThreshold: 50 }}
                    style={styles.flatList}
                    renderItem={({ item, index }) => (
                        <OnboardingItem item={item} index={index} scrollX={scrollX} />
                    )}
                />

                <View style={styles.footer}>
                    {/* Top group: dots and button */}
                    <View style={styles.footerTop}>
                        <View style={styles.pagination}>
                            {ONBOARDING_DATA.map((_, index) => (
                                <PaginationDot key={index} index={index} scrollX={scrollX} />
                            ))}
                        </View>

                        <TouchableOpacity
                            onPress={handleNext}
                            onPressIn={onPressIn}
                            onPressOut={onPressOut}
                            activeOpacity={1}
                            style={styles.nextButtonContainer}
                        >
                            <Animated.View style={[styles.nextButton, animatedButtonStyle]}>
                                <LinearGradient
                                    colors={['#22D3EE', '#4F46E5', '#6366F1', '#A855F7']}
                                    style={StyleSheet.absoluteFill}
                                    start={{ x: 0, y: 0 }}
                                    end={{ x: 1, y: 0 }}
                                    locations={[0, 0.3, 0.6, 1]}
                                />
                                <View style={styles.textContainer}>
                                    <Animated.Text style={[styles.nextText, animatedText1Style]}>
                                        Volgende
                                    </Animated.Text>
                                    <Animated.Text style={[styles.nextText, styles.absoluteText, animatedText2Style]}>
                                        Aan de slag
                                    </Animated.Text>
                                </View>
                            </Animated.View>
                        </TouchableOpacity>
                    </View>

                    {/* Bottom: logo centered in remaining space */}
                    <View style={styles.logoBottom}>
                        <BrandLogo width={width * 0.9} style={styles.liftedLogo} />
                    </View>
                </View>
            </SafeAreaView>
        </AppBackground>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    flatList: {
        flexGrow: 0, // Prevent FlatList from expanding beyond its content
        height: height * 0.65, // Fixed height for title, description, and image
    },
    safeArea: {
        flex: 1,
    },
    itemContainer: {
        width,
        alignItems: 'center',
        paddingHorizontal: 24,
        paddingTop: 60,
    },
    textWrapper: {
        alignItems: 'center',
        height: 120,
        marginBottom: 10,
    },
    title: {
        color: '#FFF',
        fontSize: 32,
        fontWeight: '900',
        textAlign: 'center',
        marginBottom: 16,
        letterSpacing: -0.5,
    },
    description: {
        color: '#94A3B8',
        fontSize: 15,
        textAlign: 'center',
        lineHeight: 22,
        paddingHorizontal: 20,
        fontWeight: '500',
    },
    imageWrapper: {
        width: width,
        height: height * 0.42,
        justifyContent: 'center',
        alignItems: 'center',
        position: 'relative',
    },
    spotlightWrapper: {
        position: 'absolute',
        width: width * 0.8,
        height: width * 0.8,
        justifyContent: 'center',
        alignItems: 'center',
        zIndex: -1,
    },
    spotlight: {
        width: '100%',
        height: '100%',
        borderRadius: width * 0.4,
    },
    image: {
        width: '100%',
        height: '100%',
    },
    footer: {
        flex: 1,
        width: '100%',
        alignItems: 'center',
        justifyContent: 'flex-start',
        backgroundColor: '#0B111D', // Deep midnight blue for the footer zone
        borderTopLeftRadius: 32,
        borderTopRightRadius: 32,
        // Abstract depth effect
        shadowColor: '#000',
        shadowOffset: { width: 0, height: -10 },
        shadowOpacity: 0.3,
        shadowRadius: 20,
        elevation: 20,
    },
    footerTop: {
        alignItems: 'center',
        paddingTop: 10,
    },
    pagination: {
        flexDirection: 'row',
        justifyContent: 'center',
        marginBottom: 25, // Gap between dots and button
    },
    dot: {
        height: 8,
        borderRadius: 4,
        backgroundColor: '#22D3EE',
        marginHorizontal: 4,
    },
    nextButtonContainer: {
        width: width * 0.75,
        // No margin needed, space-between handles distribution
    },
    nextButton: {
        width: '100%',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 14,
        borderRadius: 24,
        shadowColor: '#22D3EE',
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.4,
        shadowRadius: 12,
        elevation: 8,
        overflow: 'hidden', // Required for absoluteFill gradient with borderRadius
    },
    nextText: {
        color: '#FFF',
        fontSize: 18,
        fontWeight: 'bold',
        textAlign: 'center',
    },
    textContainer: {
        height: 24,
        justifyContent: 'center',
        alignItems: 'center',
    },
    absoluteText: {
        position: 'absolute',
    },
    logoBottom: {
        flex: 1, // Fill remaining space between button and bottom
        width: '100%',
        alignItems: 'center',
        justifyContent: 'center', // Center logo in this flex:1 container
    },
    liftedLogo: {
        marginTop: -30, // Move logo up
    },
});
