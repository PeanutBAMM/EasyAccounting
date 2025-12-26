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
const CHART_SIZE = width * 0.38; // Even smaller to ensure legend fits
const STROKE_WIDTH = 8; // Refined thickness
const RADIUS = (CHART_SIZE - STROKE_WIDTH) / 2;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;
const MIN_ARC = 0.05; // 5% minimal width (requested half of 10%)

export default function FinanceStatsWidget({ totalInclBTW, totalExclBTW, btw21Total, btw9Total, btw0Total }: FinanceStatsWidgetProps) {
    const hasData = totalInclBTW > 0;

    // Calculate segments based on proportions of the Total Incl. amount
    let p21 = hasData ? (btw21Total / totalInclBTW) : 0;
    let p9 = hasData ? (btw9Total / totalInclBTW) : 0;
    let pExcl = hasData ? (totalExclBTW / totalInclBTW) : 0;

    // Apply minimum arc boost for visibility to small non-zero segments
    if (p21 > 0 && p21 < MIN_ARC) p21 = MIN_ARC;
    if (p9 > 0 && p9 < MIN_ARC) p9 = MIN_ARC;

    // Recalculate Excl so the total is exactly 1.0 (Excl is usually the largest, so it absorbs the boost)
    pExcl = Math.max(0.1, 1.0 - p21 - p9);

    const strokeDash21 = CIRCUMFERENCE * p21;
    const strokeDash9 = CIRCUMFERENCE * p9;
    const strokeDashExcl = CIRCUMFERENCE * pExcl;

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
                                    {/* Subtotaal Excl. - White/Light Gray */}
                                    <Circle
                                        cx={CHART_SIZE / 2}
                                        cy={CHART_SIZE / 2}
                                        r={RADIUS}
                                        stroke="#F8FAFC"
                                        strokeWidth={STROKE_WIDTH}
                                        fill="transparent"
                                        strokeDasharray={[strokeDashExcl, CIRCUMFERENCE]}
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
                            <Ionicons name="receipt" size={12} color="#0F172A" />
                        </LinearGradient>
                        <View>
                            <Text style={styles.legendValue}>{formatCurrency(totalExclBTW)}</Text>
                            <Text style={styles.legendLabel}>Subtotaal (Excl.)</Text>
                        </View>
                    </View>
                </View>
            </View>

            {!hasData && (
                <View style={styles.emptyStateOverlay}>
                    <Text style={styles.emptyStateText}>Nog geen gegevens voor deze maand</Text>
                </View>
            )}
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
        marginLeft: 16, // Balanced spacing
        gap: 10,
    },
    legendItem: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    legendIcon: {
        marginRight: 8,
    },
    vatIconMockup: {
        width: 30,
        height: 20,
        borderRadius: 5,
        justifyContent: 'center',
        alignItems: 'center',
        flexDirection: 'row',
        paddingHorizontal: 2,
        marginRight: 10,
    },
    vatNumberMockup: {
        fontSize: 10,
        fontWeight: '900',
        color: 'white',
        marginRight: 1,
    },
    vatSymbolMockup: {
        fontSize: 9,
        fontWeight: '800',
        color: 'white',
        opacity: 0.9,
    },
    legendValue: {
        fontSize: 14,
        fontWeight: '800',
        color: '#F8FAFC',
        lineHeight: 16,
    },
    legendLabel: {
        fontSize: 8,
        color: '#94A3B8',
        textTransform: 'uppercase',
        fontWeight: '800',
        letterSpacing: 0.2,
        marginTop: 1,
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
