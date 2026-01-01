/**
 * GAP Profile Chart Component
 *
 * Visualizes personal GAP curve vs standard Minetti curve using Recharts.
 * Shows gradient (-20% to +20%) on X-axis and pace comparison on Y-axis.
 * 
 * IMPROVED VERSION: Better readability with colored zones and clearer labels.
 */

import React, { useMemo } from 'react';
import {
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    Legend,
    ResponsiveContainer,
    ComposedChart,
    ReferenceLine,
    Line,
    ReferenceArea,
} from 'recharts';
import type { GAPProfile } from '../utils/gapProfileAnalyzer';
import { getAthleteType } from '../utils/gapProfileAnalyzer';

interface GAPProfileChartProps {
    profile: GAPProfile;
    showStandardComparison?: boolean;
}

/**
 * Calculate standard Minetti pace multiplier for a given gradient
 * Based on the Minetti (2002) energy cost model
 */
function getMinettiMultiplier(gradientPercent: number): number {
    const g = gradientPercent / 100;

    if (gradientPercent >= 0) {
        // Uphill: Cost increases
        return 1 + (3.5 * g) + (5 * Math.pow(g, 2));
    } else {
        const absGradient = Math.abs(gradientPercent);
        if (absGradient <= 10) {
            // Gentle downhill: More efficient
            return Math.max(0.7, 1 - (0.5 * Math.abs(g)) + (0.15 * Math.pow(g, 2)));
        } else {
            // Steep downhill: Braking cost
            return Math.min(1.2, 0.7 + (0.1 * Math.pow(Math.abs(g) - 0.10, 2)));
        }
    }
}

/**
 * Convert multiplier to human-readable time difference
 */
function getTimeDiffDescription(multiplier: number, baselineMinPerMile: number = 10): string {
    const timeAtGradient = multiplier * baselineMinPerMile;
    const diff = timeAtGradient - baselineMinPerMile;

    if (Math.abs(diff) < 0.1) return 'Same as flat';

    const sign = diff > 0 ? '+' : '';
    const minutes = Math.floor(Math.abs(diff));
    const seconds = Math.round((Math.abs(diff) - minutes) * 60);

    if (minutes > 0) {
        return `${sign}${diff > 0 ? '' : '-'}${minutes}:${seconds.toString().padStart(2, '0')} per mile`;
    }
    return `${sign}${seconds}s per mile`;
}

const GAPProfileChart: React.FC<GAPProfileChartProps> = ({
    profile,
    showStandardComparison = true,
}) => {
    const athleteType = getAthleteType(profile);

    // Get baseline pace from profile
    const flatData = profile.gradientPaceData.find((d) => d.gradient === 0);
    const basePace = flatData?.avgPace || 10;

    // Generate chart data from profile gradient data
    const chartData = useMemo(() => {
        // Create data points for gradient range -20% to +20%
        const gradients = Array.from({ length: 21 }, (_, i) => i * 2 - 20);

        return gradients.map((gradient) => {
            // Get personal data for this gradient
            const personalData = profile.gradientPaceData.find(
                (d) => Math.abs(d.gradient - gradient) < 1
            );

            // Calculate pace multiplier (pace at gradient / pace at flat)
            const personalMultiplier = personalData
                ? personalData.avgPace / basePace
                : null;

            // Calculate standard Minetti multiplier
            const standardMultiplier = getMinettiMultiplier(gradient);

            // Determine if personal is better (lower) or worse (higher) than standard
            const isBetter = personalMultiplier !== null && personalMultiplier < standardMultiplier;

            return {
                gradient,
                personal: personalMultiplier,
                standard: standardMultiplier,
                sampleSize: personalData?.sampleSize || 0,
                difference: personalMultiplier ? personalMultiplier - standardMultiplier : null,
                isBetter,
            };
        });
    }, [profile, basePace]);

    // Custom tooltip with human-readable descriptions
    const CustomTooltip = ({ active, payload, label }: any) => {
        if (active && payload && payload.length) {
            const data = payload[0]?.payload;
            const gradientLabel = label === 0 ? 'Flat terrain' :
                label > 0 ? `${label}% uphill` : `${Math.abs(label)}% downhill`;

            return (
                <div className="bg-gray-900 border border-gray-700 rounded-lg p-3 shadow-lg max-w-xs">
                    <p className="text-white font-medium mb-2 border-b border-gray-700 pb-1">
                        {gradientLabel}
                    </p>

                    {data?.personal && (
                        <div className="mb-2">
                            <p className="text-sm font-medium text-purple-400">Your pace:</p>
                            <p className="text-lg text-white">
                                {getTimeDiffDescription(data.personal, basePace)}
                            </p>
                            <p className="text-xs text-gray-400">
                                {(data.personal * basePace).toFixed(1)} min/mi (vs {basePace.toFixed(1)} flat)
                            </p>
                        </div>
                    )}

                    {showStandardComparison && data?.standard && (
                        <div className="border-t border-gray-700 pt-2 mt-2">
                            <p className="text-xs text-gray-400">Average runner:</p>
                            <p className="text-sm text-gray-300">
                                {getTimeDiffDescription(data.standard, basePace)}
                            </p>
                        </div>
                    )}

                    {data?.personal && data?.standard && (
                        <div className={`mt-2 px-2 py-1 rounded text-xs font-medium ${data.isBetter
                            ? 'bg-green-500/20 text-green-400'
                            : 'bg-red-500/20 text-red-400'
                            }`}>
                            {data.isBetter
                                ? `✓ You're ${Math.abs((data.difference || 0) * basePace * 60).toFixed(0)}s faster than average`
                                : `${Math.abs((data.difference || 0) * basePace * 60).toFixed(0)}s slower than average`
                            }
                        </div>
                    )}

                    {data?.sampleSize > 0 && (
                        <p className="text-xs text-gray-500 mt-2">
                            Based on {data.sampleSize} samples
                        </p>
                    )}
                </div>
            );
        }
        return null;
    };

    // Calculate Y-axis domain based on data
    const yMin = 0.6;
    const yMax = Math.max(
        2.0,
        ...chartData.map(d => d.personal || 0),
        ...chartData.map(d => d.standard || 0)
    ) + 0.1;

    return (
        <div className="w-full">
            {/* Chart Title */}
            <div className="mb-3 text-center">
                <h4 className="text-sm font-medium text-gray-300 dark:text-gray-300">
                    How Your Pace Changes on Hills
                </h4>
                <p className="text-xs text-gray-500">
                    Your flat pace: <span className="text-white font-medium">{basePace.toFixed(1)} min/mi</span>
                </p>
            </div>

            <ResponsiveContainer width="100%" height={300}>
                <ComposedChart
                    data={chartData}
                    margin={{ top: 10, right: 20, left: 10, bottom: 30 }}
                >
                    {/* Background zones for context */}
                    <ReferenceArea y1={yMin} y2={1} fill="#22c55e" fillOpacity={0.05} />
                    <ReferenceArea y1={1} y2={1.3} fill="#eab308" fillOpacity={0.05} />
                    <ReferenceArea y1={1.3} y2={yMax} fill="#ef4444" fillOpacity={0.05} />

                    <CartesianGrid strokeDasharray="3 3" stroke="#374151" opacity={0.3} />

                    <XAxis
                        dataKey="gradient"
                        stroke="#9ca3af"
                        tickFormatter={(value) => value === 0 ? 'Flat' : `${value > 0 ? '+' : ''}${value}%`}
                        tick={{ fontSize: 11 }}
                    />

                    {/* Left side labels for terrain type */}
                    <text x="5%" y="95%" fill="#9ca3af" fontSize="10" textAnchor="start">
                        ← Downhill
                    </text>
                    <text x="95%" y="95%" fill="#9ca3af" fontSize="10" textAnchor="end">
                        Uphill →
                    </text>

                    <YAxis
                        stroke="#9ca3af"
                        domain={[yMin, yMax]}
                        tickFormatter={(value) => {
                            if (value === 1) return 'Flat pace';
                            const diffMin = (value - 1) * basePace;
                            if (diffMin >= 0) return `+${diffMin.toFixed(1)}`;
                            return diffMin.toFixed(1);
                        }}
                        tick={{ fontSize: 10 }}
                        label={{
                            value: 'Time difference (min/mi)',
                            angle: -90,
                            position: 'insideLeft',
                            fill: '#9ca3af',
                            fontSize: 11,
                            dx: -10,
                        }}
                        width={70}
                    />

                    <Tooltip content={<CustomTooltip />} />

                    <Legend
                        wrapperStyle={{ paddingTop: '15px' }}
                        formatter={(value: string) => {
                            if (value === 'standard') return (
                                <span className="text-gray-400 text-sm inline-flex items-center gap-1">
                                    Average Runner
                                    <span className="group relative">
                                        <svg className="w-3.5 h-3.5 text-gray-500 cursor-help" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <circle cx="12" cy="12" r="10" strokeWidth="2" />
                                            <path strokeLinecap="round" d="M12 16v-4M12 8h.01" strokeWidth="2" />
                                        </svg>
                                        <span className="absolute z-50 bottom-full left-1/2 -translate-x-1/2 mb-2 px-3 py-2 bg-gray-900 text-white text-xs rounded-lg shadow-lg opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none w-64">
                                            <span className="font-semibold block mb-1">Minetti (2002) Research</span>
                                            Based on A.E. Minetti's biomechanical study of the energy cost of walking/running on gradients. This is the widely-accepted scientific model for how gradient affects pace for the average runner.
                                            <span className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-gray-900"></span>
                                        </span>
                                    </span>
                                </span>
                            );
                            return (
                                <span className="text-purple-400 text-sm font-medium">You</span>
                            );
                        }}
                    />

                    {/* Reference line at flat pace (100%) */}
                    <ReferenceLine
                        y={1}
                        stroke="#22c55e"
                        strokeWidth={2}
                        strokeDasharray="5 5"
                        label={{
                            value: '← Your flat pace',
                            position: 'insideBottomRight',
                            fill: '#22c55e',
                            fontSize: 10,
                        }}
                    />

                    {/* Standard Minetti curve (dashed) */}
                    {showStandardComparison && (
                        <Line
                            type="monotone"
                            dataKey="standard"
                            stroke="#6b7280"
                            strokeWidth={2}
                            strokeDasharray="5 5"
                            dot={false}
                            name="standard"
                            connectNulls
                        />
                    )}

                    {/* Personal profile curve */}
                    <Line
                        type="monotone"
                        dataKey="personal"
                        stroke="#a855f7"
                        strokeWidth={3}
                        dot={{ fill: '#a855f7', r: 4, strokeWidth: 2, stroke: '#1f2937' }}
                        activeDot={{ r: 6, fill: '#a855f7', stroke: '#fff', strokeWidth: 2 }}
                        name="personal"
                        connectNulls
                    />
                </ComposedChart>
            </ResponsiveContainer>

            {/* Improved Legend Explanation */}
            <div className="mt-3 grid grid-cols-3 gap-2 text-center text-xs">
                <div className="bg-green-500/10 rounded-lg p-2 border border-green-500/20">
                    <div className="text-green-400 font-medium">Below line</div>
                    <div className="text-gray-400">Faster than flat</div>
                </div>
                <div className="bg-gray-500/10 rounded-lg p-2 border border-gray-500/20">
                    <div className="text-gray-300 font-medium">At the line</div>
                    <div className="text-gray-400">Same as flat</div>
                </div>
                <div className="bg-red-500/10 rounded-lg p-2 border border-red-500/20">
                    <div className="text-red-400 font-medium">Above line</div>
                    <div className="text-gray-400">Slower than flat</div>
                </div>
            </div>

            {/* Key Insights */}
            <div className="mt-3 bg-gray-800/50 rounded-lg p-3 border border-gray-700">
                <p className="text-xs text-gray-300">
                    <span className="font-medium text-purple-400">Your line</span> vs{' '}
                    <span className="text-gray-400">dashed line</span> shows how you compare to the average runner.{' '}
                    {athleteType === 'climber' && 'You handle climbs better than most! 🏔️'}
                    {athleteType === 'descender' && 'You excel at running downhill! ⬇️'}
                    {athleteType === 'all-rounder' && 'You handle all terrain well! 🌟'}
                    {athleteType === 'flat-specialist' && 'Hills challenge you - targeted training can help! 💪'}
                </p>
            </div>
        </div>
    );
};

export default GAPProfileChart;
