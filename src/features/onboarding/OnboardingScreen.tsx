import React, { useRef, useState } from 'react';
import {
    View,
    Text,
    StyleSheet,
    Dimensions,
    TouchableOpacity,
    Image,
} from 'react-native';
import Animated, {
    useAnimatedStyle,
    useSharedValue,
    withRepeat,
    withSequence,
    withTiming,
    interpolate,
    Extrapolate,
    useAnimatedScrollHandler,
} from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import { useAuthStore } from '../auth/authStore';
import { Ionicons } from '@expo/vector-icons';

const { width } = Dimensions.get('window');

const ONBOARDING_DATA = [
    {
        id: '1',
        title: 'Eenvoudig Scannen',
        description: 'Maak een foto van je bonnetje en wij regelen de rest. Geen handmatige invoer meer nodig.',
        image: require('../../../assets/onboarding/onboarding_scan_asset_1766435658020.png'),
        accent: '#22D3EE',
    },
    {
        id: '2',
        title: 'Slimme Herkenning',
        description: 'Onze AI herkent direct bedragen, BTW-percentages en stelt de juiste boekhoudcode voor.',
        image: require('../../../assets/onboarding/onboarding_ai_asset_1766435672056.png'),
        accent: '#6366F1',
    },
    {
        id: '3',
        title: 'Direct Doorsturen',
        description: 'Koppel je favoriete boekhoudpakket zoals Exact Online en verstuur je bonnen met één klik.',
        image: require('../../../assets/onboarding/onboarding_sync_asset_1766435685734.png'),
        accent: '#8B5CF6',
    },
    {
        id: '4',
        title: 'Veilig & Altijd Synchroon',
        description: 'Je bonnen worden veilig opgeslagen in de cloud en zijn direct beschikbaar op al je apparaten.',
        image: require('../../../assets/onboarding/onboarding_secure_asset_1766435699757.png'),
        accent: '#22D3EE',
    },
];



const OnboardingItem = ({ item, scrollX, index }: { item: any, scrollX: any, index: number }) => {
    // Floating animation
    const translateY = useSharedValue(0);

    React.useEffect(() => {
        translateY.value = withRepeat(
            withSequence(
                withTiming(-15, { duration: 2000 }),
                withTiming(0, { duration: 2000 })
            ),
            -1,
            true
        );
    }, [translateY]);

    const animatedStyle = useAnimatedStyle(() => {
        const scale = interpolate(
            scrollX.value,
            [(index - 1) * width, index * width, (index + 1) * width],
            [0.8, 1, 0.8],
            Extrapolate.CLAMP
        );
        const opacity = interpolate(
            scrollX.value,
            [(index - 1) * width, index * width, (index + 1) * width],
            [0, 1, 0],
            Extrapolate.CLAMP
        );

        return {
            transform: [{ scale }, { translateY: translateY.value }],
            opacity,
        };
    });

    return (
        <View style={styles.itemContainer}>
            <Animated.View style={[styles.imageWrapper, animatedStyle]}>
                <Image source={item.image} style={styles.image} resizeMode="contain" />
                <View style={[styles.glow, { backgroundColor: item.accent }]} />
            </Animated.View>

            <View style={styles.textWrapper}>
                <Text style={styles.title}>{item.title}</Text>
                <Text style={styles.description}>{item.description}</Text>
            </View>
        </View>
    );
};

const PaginationDot = ({ index, scrollX }: { index: number, scrollX: any }) => {
    const animatedDotStyle = useAnimatedStyle(() => {
        const w = interpolate(
            scrollX.value,
            [(index - 1) * width, index * width, (index + 1) * width],
            [8, 24, 8],
            Extrapolate.CLAMP
        );
        const opacity = interpolate(
            scrollX.value,
            [(index - 1) * width, index * width, (index + 1) * width],
            [0.3, 1, 0.3],
            Extrapolate.CLAMP
        );
        return { width: w, opacity };
    });

    return <Animated.View style={[styles.dot, animatedDotStyle]} />;
};

export default function OnboardingScreen() {
    const scrollX = useSharedValue(0);
    const flatListRef = useRef<any>(null);
    const [currentIndex, setCurrentIndex] = useState(0);
    const completeOnboarding = useAuthStore((state) => state.completeOnboarding);

    const onScroll = useAnimatedScrollHandler((event) => {
        scrollX.value = event.contentOffset.x;
    });

    const handleNext = () => {
        if (currentIndex < ONBOARDING_DATA.length - 1) {
            flatListRef.current?.scrollToIndex({ index: currentIndex + 1 });
            setCurrentIndex(currentIndex + 1);
        } else {
            completeOnboarding();
        }
    };

    const handleSkip = () => {
        completeOnboarding();
    };

    const onViewableItemsChanged = useRef(({ viewableItems }: any) => {
        if (viewableItems.length > 0) {
            setCurrentIndex(viewableItems[0].index);
        }
    }).current;

    return (
        <View style={styles.container}>
            <LinearGradient
                colors={['#0F172A', '#000000']}
                style={StyleSheet.absoluteFill}
            />

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
                renderItem={({ item, index }) => (
                    <OnboardingItem item={item} index={index} scrollX={scrollX} />
                )}
            />

            {/* Pagination dots */}
            <View style={styles.pagination}>
                {ONBOARDING_DATA.map((_, index) => (
                    <PaginationDot key={index} index={index} scrollX={scrollX} />
                ))}
            </View>

            {/* Footer Buttons */}
            <View style={styles.footer}>
                <TouchableOpacity onPress={handleSkip} style={styles.skipButton}>
                    <Text style={styles.skipText}>Overslaan</Text>
                </TouchableOpacity>

                <TouchableOpacity onPress={handleNext} activeOpacity={0.8}>
                    <LinearGradient
                        colors={['#22D3EE', '#6366F1']}
                        style={styles.nextButton}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 0 }}
                    >
                        <Text style={styles.nextText}>
                            {currentIndex === ONBOARDING_DATA.length - 1 ? 'Aan de slag' : 'Volgende'}
                        </Text>
                        <Ionicons name="arrow-forward" size={20} color="#0F172A" style={styles.nextIcon} />
                    </LinearGradient>
                </TouchableOpacity>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#0F172A',
    },
    itemContainer: {
        width,
        alignItems: 'center',
        justifyContent: 'center',
        paddingHorizontal: 32,
    },
    imageWrapper: {
        width: width * 0.8,
        height: width * 0.8,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 40,
    },
    image: {
        width: '100%',
        height: '100%',
        zIndex: 2,
    },
    glow: {
        position: 'absolute',
        width: '60%',
        height: '60%',
        borderRadius: 100,
        opacity: 0.2,
        zIndex: 1,
    },
    textWrapper: {
        alignItems: 'center',
    },
    title: {
        color: '#FFF',
        fontSize: 28,
        fontWeight: '900',
        textAlign: 'center',
        marginBottom: 16,
    },
    description: {
        color: '#94A3B8',
        fontSize: 16,
        textAlign: 'center',
        lineHeight: 24,
    },
    pagination: {
        flexDirection: 'row',
        justifyContent: 'center',
        marginBottom: 40,
    },
    dot: {
        height: 8,
        borderRadius: 4,
        backgroundColor: '#22D3EE',
        marginHorizontal: 4,
    },
    footer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 32,
        paddingBottom: 50,
    },
    skipButton: {
        paddingVertical: 12,
    },
    skipText: {
        color: '#64748B',
        fontSize: 16,
        fontWeight: '600',
    },
    nextButton: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 24,
        paddingVertical: 14,
        borderRadius: 16,
    },
    nextText: {
        color: '#0F172A',
        fontSize: 16,
        fontWeight: 'bold',
    },
    nextIcon: {
        marginLeft: 8,
    },
});
