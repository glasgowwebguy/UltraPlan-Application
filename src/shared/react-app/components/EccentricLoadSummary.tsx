/**
 * Eccentric Load Summary Component
 * 
 * Displays race-level eccentric load analysis in the Race Time Summary panel.
 * Calculates elevation data from GPX content for each segment.
 */

import React, { useState, useMemo } from 'react';
import { TrendingDown, Dumbbell, ChevronDown, ChevronUp, Info } from 'lucide-react';
import { calculateRaceEccentricSummary } from '../utils/eccentricLoadCalculator';
import { calculateSegmentElevation } from '../utils/elevationCalculations';
import type { Segment } from '@/shared/types';

interface EccentricLoadSummaryProps {
    segments: Segment[];
    gpxContent: string | null;
    className?: string;
}

const EccentricLoadSummary: React.FC<EccentricLoadSummaryProps> = ({
    segments,
    gpxContent,
    className = ''
}) => {
    const [expanded, setExpanded] = useState(false);
    const [showTooltip, setShowTooltip] = useState(false);

    // Calculate segment elevation data from GPX
    const segmentData = useMemo(() => {
        if (!gpxContent || segments.length === 0) return [];

        return segments.map((segment, index) => {
            // Calculate start and end distances for this segment
            const startDistance = index === 0 ? 0 : segments[index - 1].cumulative_distance_miles;
            const endDistance = segment.cumulative_distance_miles;

            // Get elevation stats from GPX
            const elevationStats = calculateSegmentElevation(gpxContent, startDistance, endDistance);

            // Convert meters to feet for elevation loss
            const elevationLossFeet = elevationStats ? elevationStats.loss * 3.28084 : 0;
            const distanceMiles = segment.segment_distance_miles;

            // Calculate gradient: negative for descent
            const gradient = distanceMiles > 0 && elevationStats
                ? (elevationLossFeet / (distanceMiles * 5280)) * -100
                : 0;

            return {
                gradient,
                distanceMiles,
                elevationLossFeet
            };
        });
    }, [gpxContent, segments]);

    const summary = useMemo(() =>
        calculateRaceEccentricSummary(segmentData),
        [segmentData]
    );

    // Don't show if no GPX or minimal descent
    if (!gpxContent || summary.totalElevationLoss < 500) return null;

    return (
        <div className={`rounded-xl border ${summary.loadLevel.bgColor} p-4 ${className}`}>
            <div
                className="flex items-center justify-between cursor-pointer"
                onClick={() => setExpanded(!expanded)}
            >
                <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-white/50 dark:bg-black/20">
                        <TrendingDown className="w-5 h-5 text-gray-700 dark:text-gray-300" />
                    </div>
                    <div>
                        <div className="flex items-center gap-2">
                            <h3 className="font-semibold text-gray-900 dark:text-gray-100">
                                Eccentric Load Analysis
                            </h3>
                            <div className="relative">
                                <button
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        setShowTooltip(!showTooltip);
                                    }}
                                    className="p-0.5 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
                                    aria-label="View descent categories"
                                >
                                    <Info className="w-4 h-4 text-gray-500 dark:text-gray-400" />
                                </button>
                                {showTooltip && (
                                    <div className="absolute left-0 top-full mt-2 w-72 p-3 bg-gray-900 dark:bg-gray-700 text-white text-xs rounded-lg shadow-xl z-20">
                                        <div className="font-medium mb-2">Descent Categories</div>
                                        <table className="w-full">
                                            <tbody>
                                                <tr className="border-b border-gray-700">
                                                    <td className="py-1">🟢 Easy</td>
                                                    <td className="py-1 text-gray-300">0-6%</td>
                                                    <td className="py-1 text-gray-400">Let gravity assist</td>
                                                </tr>
                                                <tr className="border-b border-gray-700">
                                                    <td className="py-1">🟡 Moderate</td>
                                                    <td className="py-1 text-gray-300">6-10%</td>
                                                    <td className="py-1 text-gray-400">Controlled speed</td>
                                                </tr>
                                                <tr className="border-b border-gray-700">
                                                    <td className="py-1">🟠 Technical</td>
                                                    <td className="py-1 text-gray-300">10-15%</td>
                                                    <td className="py-1 text-gray-400">Short strides</td>
                                                </tr>
                                                <tr>
                                                    <td className="py-1">🔴 Extreme</td>
                                                    <td className="py-1 text-gray-300">&gt;15%</td>
                                                    <td className="py-1 text-gray-400">Walk / use poles</td>
                                                </tr>
                                            </tbody>
                                        </table>
                                        <div className="absolute top-0 left-4 transform -translate-y-1/2 rotate-45 w-2 h-2 bg-gray-900 dark:bg-gray-700"></div>
                                    </div>
                                )}
                            </div>
                        </div>
                        <div className="flex items-center gap-2 mt-0.5">
                            <span className="text-lg">{summary.loadLevel.icon}</span>
                            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                                {summary.loadLevel.level.toUpperCase()} LOAD
                            </span>
                        </div>
                    </div>
                </div>
                <div className="flex items-center gap-3">
                    <div className="text-right">
                        <div className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                            {Math.round(summary.totalElevationLoss).toLocaleString()}ft
                        </div>
                        <div className="text-sm text-gray-600 dark:text-gray-400">
                            total descent
                        </div>
                    </div>
                    {expanded ? (
                        <ChevronUp className="w-5 h-5 text-gray-500" />
                    ) : (
                        <ChevronDown className="w-5 h-5 text-gray-500" />
                    )}
                </div>
            </div>

            {expanded && (
                <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
                    <p className="text-sm text-gray-700 dark:text-gray-300 mb-3">
                        {summary.loadLevel.message}
                    </p>

                    <div className="grid grid-cols-2 gap-3 mb-4">
                        <div className="bg-white/50 dark:bg-black/20 rounded-lg p-3">
                            <div className="text-xl font-bold text-gray-900 dark:text-gray-100">
                                {summary.steepDescentSegments}
                            </div>
                            <div className="text-xs text-gray-600 dark:text-gray-400">
                                Steep Segments (&gt;10%)
                            </div>
                        </div>
                        <div className="bg-white/50 dark:bg-black/20 rounded-lg p-3">
                            <div className="text-xl font-bold text-gray-900 dark:text-gray-100">
                                {summary.extremeDescentSegments}
                            </div>
                            <div className="text-xs text-gray-600 dark:text-gray-400">
                                Extreme Segments (&gt;15%)
                            </div>
                        </div>
                    </div>

                    {summary.recommendations.length > 0 && (
                        <div className="space-y-2">
                            <div className="flex items-center gap-2 text-sm font-medium text-gray-700 dark:text-gray-300">
                                <Dumbbell className="w-4 h-4" />
                                Training Recommendations
                            </div>
                            <ul className="text-sm text-gray-600 dark:text-gray-400 space-y-1 ml-6">
                                {summary.recommendations.map((rec, idx) => (
                                    <li key={idx}>• {rec}</li>
                                ))}
                            </ul>
                            <p className="text-sm italic text-gray-500 dark:text-gray-500 mt-2">
                                {summary.loadLevel.trainingAdvice}
                            </p>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

export default EccentricLoadSummary;
