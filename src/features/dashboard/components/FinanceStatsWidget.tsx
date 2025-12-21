import React from 'react';
import { View, Text, StyleSheet, Dimensions } from 'react-native';
import Svg, { Circle, G } from 'react-native-svg';
import { formatCurrency } from '../../../utils/formatters';
import { LinearGradient } from 'expo-linear-gradient';

interface FinanceStatsWidgetProps {
    totalInclBTW: number;
    totalExclBTW: number;
    btw21Total: number;
    btw9Total: number;
    btw0Total: number;
}

const { width } = Dimensions.get('window');
const CHART_SIZE = width * 0.45;
const STROKE_WIDTH = 20;
const RADIUS = (CHART_SIZE - STROKE_WIDTH) / 2;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

export default function FinanceStatsWidget({ totalInclBTW, totalExclBTW, btw21Total, btw9Total, btw0Total }: FinanceStatsWidgetProps) {
    // Calculate segments based on proportions
    const totalItemsValue = (btw21Total / 0.21) + (btw9Total / 0.09) + btw0Total || 1;

    const p21 = ((btw21Total / 0.21) / totalItemsValue);
    const p9 = ((btw9Total / 0.09) / totalItemsValue);
    const p0 = (btw0Total / totalItemsValue);

    const strokeDash21 = CIRCUMFERENCE * p21;
    const strokeDash9 = CIRCUMFERENCE * p9;
    const strokeDash0 = CIRCUMFERENCE * p0;

    return (
        <LinearGradient
            colors={['rgba(30, 41, 59, 0.6)', 'rgba(15, 23, 42, 0.8)']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.container}
        >
            <Text style={styles.title}>Maandoverzicht</Text>

            <View style={styles.chartArea}>
                {/* Horizontal Legend - Top */}
                <View style={styles.legendRow}>
                    <View style={styles.legendItem}>
                        <View style={[styles.legendDot, { backgroundColor: '#6366F1' }]} />
                        <Text style={styles.legendText}>BTW 9%</Text>
                    </View>
                    <View style={styles.legendItem}>
                        <View style={[styles.legendDot, { backgroundColor: '#22D3EE' }]} />
                        <Text style={styles.legendText}>BTW 21%</Text>
                    </View>
                </View>

                <View style={styles.chartContainer}>
                    <Svg width={CHART_SIZE} height={CHART_SIZE} viewBox={`0 0 ${CHART_SIZE} ${CHART_SIZE} `}>
                        <G rotation="-90" origin={`${CHART_SIZE / 2}, ${CHART_SIZE / 2} `}>
                            {/* BTW 21% - Cyan */}
                            <Circle
                                cx={CHART_SIZE / 2}
                                cy={CHART_SIZE / 2}
                                r={RADIUS}
                                stroke="#22D3EE"
                                strokeWidth={STROKE_WIDTH}
                                fill="transparent"
                                strokeDasharray={[strokeDash21, CIRCUMFERENCE]}
                            />
                            {/* BTW 9% - Indigo */}
                            <Circle
                                cx={CHART_SIZE / 2}
                                cy={CHART_SIZE / 2}
                                r={RADIUS}
                                stroke="#6366F1"
                                strokeWidth={STROKE_WIDTH}
                                fill="transparent"
                                strokeDasharray={[strokeDash9, CIRCUMFERENCE]}
                                strokeDashoffset={-strokeDash21}
                            />
                            {/* BTW-vrij - Red */}
                            <Circle
                                cx={CHART_SIZE / 2}
                                cy={CHART_SIZE / 2}
                                r={RADIUS}
                                stroke="#EF4444"
                                strokeWidth={STROKE_WIDTH}
                                fill="transparent"
                                strokeDasharray={[strokeDash0, CIRCUMFERENCE]}
                                strokeDashoffset={-(strokeDash21 + strokeDash9)}
                            />
                        </G>
                    </Svg>
                    <View style={styles.chartCenter}>
                        <Text style={styles.centerMonth}>Oktober</Text>
                        <Text style={styles.centerAmount}>{formatCurrency(totalInclBTW)}</Text>
                    </View>
                </View>

                {/* Legend - Bottom */}
                <View style={styles.legendRow}>
                    <View style={styles.legendItem}>
                        <View style={[styles.legendDot, { backgroundColor: '#EF4444' }]} />
                        <Text style={[styles.legendText, { color: '#EF4444' }]}>BTW-vrij</Text>
                    </View>
                </View>
            </View>

            <View style={styles.statsGrid}>
                <View style={styles.statBox}>
                    <Text style={styles.statLabel}>Totaal incl. BTW</Text>
                    <Text style={styles.statValue}>{formatCurrency(totalInclBTW)}</Text>
                </View>
                <View style={styles.statBox}>
                    <Text style={styles.statLabel}>Totaal excl. BTW</Text>
                    <Text style={styles.statValue}>{formatCurrency(totalExclBTW)}</Text>
                </View>
            </View>
        </LinearGradient>
    );
}

const styles = StyleSheet.create({
    container: {
        borderRadius: 24,
        padding: 24,
        marginHorizontal: 24,
        marginBottom: 20,
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.08)',
    },
    title: {
        fontSize: 20,
        fontWeight: 'bold',
        color: '#FFFFFF',
        marginBottom: 20,
        textAlign: 'center',
    },
    chartArea: {
        alignItems: 'center',
        marginBottom: 20,
    },
    legendRow: {
        flexDirection: 'row',
        justifyContent: 'center',
        gap: 24,
        marginBottom: 16,
    },
    legendItem: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    legendDot: {
        width: 8,
        height: 8,
        borderRadius: 4,
        marginRight: 8,
    },
    legendText: {
        fontSize: 10,
        fontWeight: '700',
        color: '#94A3B8',
        textTransform: 'uppercase',
    },
    chartContainer: {
        width: CHART_SIZE,
        height: CHART_SIZE,
        justifyContent: 'center',
        alignItems: 'center',
        position: 'relative',
        marginBottom: 16,
    },
    chartCenter: {
        position: 'absolute',
        justifyContent: 'center',
        alignItems: 'center',
    },
    centerMonth: {
        fontSize: 12,
        color: '#94A3B8',
        marginBottom: 2,
    },
    centerAmount: {
        fontSize: 20,
        fontWeight: 'bold',
        color: '#FFFFFF',
    },
    statsGrid: {
        flexDirection: 'row',
        borderTopWidth: 1,
        borderTopColor: 'rgba(255, 255, 255, 0.05)',
        paddingTop: 20,
        width: '100%',
    },
    statBox: {
        flex: 1,
        alignItems: 'center',
    },
    statLabel: {
        fontSize: 11,
        color: '#94A3B8',
        marginBottom: 4,
    },
    statValue: {
        fontSize: 16,
        fontWeight: 'bold',
        color: '#FFFFFF',
    },
});
