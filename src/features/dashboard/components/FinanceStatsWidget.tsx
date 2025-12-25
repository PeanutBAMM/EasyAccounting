import React from 'react';
import { View, Text, StyleSheet, Dimensions } from 'react-native';
import Svg, { Circle, G } from 'react-native-svg';
import { formatCurrency } from '../../../utils/formatters';
import { LinearGradient } from 'expo-linear-gradient';

import { Ionicons } from '@expo/vector-icons';

interface FinanceStatsWidgetProps {
    totalInclBTW: number;
    totalExclBTW: number;
    btw21Total: number;
    btw9Total: number;
    btw0Total: number;
}

const { width } = Dimensions.get('window');
const CHART_SIZE = width * 0.45;
const STROKE_WIDTH = 12; // Slimmer stroke for a more premium look
const RADIUS = (CHART_SIZE - STROKE_WIDTH) / 2;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

export default function FinanceStatsWidget({ totalInclBTW, totalExclBTW, btw21Total, btw9Total, btw0Total }: FinanceStatsWidgetProps) {
    const hasData = totalInclBTW > 0;

    // Calculate segments based on proportions
    const totalItemsValue = (btw21Total / 0.21) + (btw9Total / 0.09) + btw0Total || 1;

    const p21 = hasData ? ((btw21Total / 0.21) / totalItemsValue) : 0;
    const p9 = hasData ? ((btw9Total / 0.09) / totalItemsValue) : 0;
    const p0 = hasData ? (btw0Total / totalItemsValue) : 0;

    const strokeDash21 = CIRCUMFERENCE * p21;
    const strokeDash9 = CIRCUMFERENCE * p9;
    const strokeDash0 = CIRCUMFERENCE * p0;

    return (
        <LinearGradient
            colors={['rgba(30, 41, 59, 0.4)', 'rgba(15, 23, 42, 0.6)']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.container}
        >
            <View style={styles.headerRow}>
                <Ionicons name="stats-chart" size={18} color="#22D3EE" style={{ marginRight: 8 }} />
                <Text style={styles.title}>Financieel Overzicht</Text>
            </View>

            <View style={styles.chartArea}>
                <View style={styles.chartContainer}>
                    <Svg width={CHART_SIZE} height={CHART_SIZE} viewBox={`0 0 ${CHART_SIZE} ${CHART_SIZE}`}>
                        <G rotation="-90" origin={`${CHART_SIZE / 2}, ${CHART_SIZE / 2}`}>
                            {/* Background track */}
                            <Circle
                                cx={CHART_SIZE / 2}
                                cy={CHART_SIZE / 2}
                                r={RADIUS}
                                stroke="rgba(255, 255, 255, 0.05)"
                                strokeWidth={STROKE_WIDTH}
                                fill="transparent"
                            />
                            {hasData ? (
                                <>
                                    {/* BTW 21% - Blue */}
                                    <Circle
                                        cx={CHART_SIZE / 2}
                                        cy={CHART_SIZE / 2}
                                        r={RADIUS}
                                        stroke="#3B82F6"
                                        strokeWidth={STROKE_WIDTH}
                                        fill="transparent"
                                        strokeDasharray={[strokeDash21, CIRCUMFERENCE]}
                                        strokeLinecap="round"
                                    />
                                    {/* BTW 9% - Purple */}
                                    <Circle
                                        cx={CHART_SIZE / 2}
                                        cy={CHART_SIZE / 2}
                                        r={RADIUS}
                                        stroke="#A855F7"
                                        strokeWidth={STROKE_WIDTH}
                                        fill="transparent"
                                        strokeDasharray={[strokeDash9, CIRCUMFERENCE]}
                                        strokeDashoffset={-strokeDash21}
                                        strokeLinecap="round"
                                    />
                                    {/* Ex. BTW - White/Light Gray */}
                                    <Circle
                                        cx={CHART_SIZE / 2}
                                        cy={CHART_SIZE / 2}
                                        r={RADIUS}
                                        stroke="#F8FAFC"
                                        strokeWidth={STROKE_WIDTH}
                                        fill="transparent"
                                        strokeDasharray={[strokeDash0, CIRCUMFERENCE]}
                                        strokeDashoffset={-(strokeDash21 + strokeDash9)}
                                        strokeLinecap="round"
                                    />
                                </>
                            ) : null}
                        </G>
                    </Svg>
                    <View style={styles.chartCenter}>
                        <Text style={styles.centerAmount}>{formatCurrency(totalInclBTW)}</Text>
                        <Text style={styles.centerLabel}>Totaal</Text>
                    </View>
                </View>

                {/* Vertical Legend with Icons */}
                <View style={styles.legendContainer}>
                    <View style={styles.legendItem}>
                        <LinearGradient
                            colors={['#3B82F6', '#1D4ED8']}
                            style={styles.vatIconMockup}
                            start={{ x: 0, y: 0 }}
                            end={{ x: 1, y: 1 }}
                        >
                            <Text style={styles.vatNumberMockup}>21</Text>
                            <Text style={styles.vatSymbolMockup}>%</Text>
                        </LinearGradient>
                        <View>
                            <Text style={styles.legendValue}>{formatCurrency(btw21Total)}</Text>
                            <Text style={styles.legendLabel}>BTW 21%</Text>
                        </View>
                    </View>
                    <View style={styles.legendItem}>
                        <LinearGradient
                            colors={['#A855F7', '#7E22CE']}
                            style={styles.vatIconMockup}
                            start={{ x: 0, y: 0 }}
                            end={{ x: 1, y: 1 }}
                        >
                            <Text style={styles.vatNumberMockup}>9</Text>
                            <Text style={styles.vatSymbolMockup}>%</Text>
                        </LinearGradient>
                        <View>
                            <Text style={styles.legendValue}>{formatCurrency(btw9Total)}</Text>
                            <Text style={styles.legendLabel}>BTW 9%</Text>
                        </View>
                    </View>
                    <View style={styles.legendItem}>
                        <LinearGradient
                            colors={['#F8FAFC', '#CBD5E1']}
                            style={styles.vatIconMockup}
                            start={{ x: 0, y: 0 }}
                            end={{ x: 1, y: 1 }}
                        >
                            <Text style={[styles.vatNumberMockup, { color: '#0F172A' }]}>0</Text>
                            <Text style={[styles.vatSymbolMockup, { color: '#0F172A' }]}>%</Text>
                        </LinearGradient>
                        <View>
                            <Text style={styles.legendValue}>{formatCurrency(btw0Total)}</Text>
                            <Text style={styles.legendLabel}>Ex. BTW</Text>
                        </View>
                    </View>
                </View>
            </View>

            {!hasData && (
                <View style={styles.emptyStateOverlay}>
                    <Text style={styles.emptyStateText}>Nog geen gegevens voor deze maand</Text>
                </View>
            )}

            <View style={styles.statsGrid}>
                <View style={[styles.statBox, { borderRightWidth: 1, borderRightColor: 'rgba(255, 255, 255, 0.05)' }]}>
                    <Text style={styles.statLabel}>Subtotaal (Excl.)</Text>
                    <Text style={styles.statValueCompact}>{formatCurrency(totalExclBTW)}</Text>
                </View>
                <View style={styles.statBox}>
                    <Text style={styles.statLabel}>Totaal BTW</Text>
                    <Text style={[styles.statValueCompact, { color: '#22D3EE' }]}>{formatCurrency(totalInclBTW - totalExclBTW)}</Text>
                </View>
            </View>
        </LinearGradient>
    );
}

const styles = StyleSheet.create({
    container: {
        borderRadius: 24,
        padding: 20,
        marginHorizontal: 20,
        marginBottom: 20,
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.08)',
    },
    headerRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 20,
        justifyContent: 'center',
    },
    title: {
        fontSize: 16,
        fontWeight: '800',
        color: '#FFFFFF',
        letterSpacing: 0.5,
    },
    chartArea: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: 20,
    },
    chartContainer: {
        width: CHART_SIZE,
        height: CHART_SIZE,
        justifyContent: 'center',
        alignItems: 'center',
        position: 'relative',
    },
    chartCenter: {
        position: 'absolute',
        justifyContent: 'center',
        alignItems: 'center',
    },
    centerAmount: {
        fontSize: 18,
        fontWeight: '900',
        color: '#FFFFFF',
    },
    centerLabel: {
        fontSize: 10,
        color: '#94A3B8',
        textTransform: 'uppercase',
        fontWeight: '700',
        marginTop: 2,
    },
    legendContainer: {
        flex: 1,
        marginLeft: 20,
        gap: 12,
    },
    legendItem: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    legendIcon: {
        marginRight: 10,
    },
    vatIconMockup: {
        width: 32,
        height: 24,
        borderRadius: 6,
        justifyContent: 'center',
        alignItems: 'center',
        flexDirection: 'row',
        paddingHorizontal: 2,
        marginRight: 10,
    },
    vatNumberMockup: {
        fontSize: 11,
        fontWeight: '900',
        color: 'white',
        marginRight: 1,
    },
    vatSymbolMockup: {
        fontSize: 10,
        fontWeight: '800',
        color: 'white',
        opacity: 0.9,
    },
    legendValue: {
        fontSize: 14,
        fontWeight: '700',
        color: '#F8FAFC',
    },
    legendLabel: {
        fontSize: 10,
        color: '#64748B',
        textTransform: 'uppercase',
        fontWeight: '700',
    },
    statsGrid: {
        flexDirection: 'row',
        borderTopWidth: 1,
        borderTopColor: 'rgba(255, 255, 255, 0.05)',
        paddingTop: 16,
    },
    statBox: {
        flex: 1,
        alignItems: 'center',
    },
    statLabel: {
        fontSize: 10,
        color: '#94A3B8',
        marginBottom: 4,
        textTransform: 'uppercase',
        fontWeight: '600',
    },
    statValueCompact: {
        fontSize: 15,
        fontWeight: '800',
        color: '#FFFFFF',
    },
    emptyStateOverlay: {
        paddingVertical: 10,
        alignItems: 'center',
    },
    emptyStateText: {
        fontSize: 12,
        color: '#64748B',
        fontStyle: 'italic',
    },
});
