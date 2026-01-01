/**
 * Descent Warning Badge Component
 * 
 * Displays a visual indicator for segment descent severity.
 * Shows in segment list and segment form.
 */

import React from 'react';
import { AlertTriangle, TrendingDown, Mountain } from 'lucide-react';
import { getDescentStrategy } from '../utils/eccentricLoadCalculator';

interface DescentWarningBadgeProps {
    gradient: number; // percentage (negative for descent)
    elevationLoss?: number; // feet
    showAdvice?: boolean;
    compact?: boolean;
}

const DescentWarningBadge: React.FC<DescentWarningBadgeProps> = ({
    gradient,
    elevationLoss,
    showAdvice = false,
    compact = false
}) => {
    // Only show for significant descents
    if (gradient >= -2) return null;

    const strategy = getDescentStrategy(gradient);

    const icons = {
        easy: <TrendingDown className="w-4 h-4" />,
        moderate: <TrendingDown className="w-4 h-4" />,
        technical: <AlertTriangle className="w-4 h-4" />,
        extreme: <Mountain className="w-4 h-4" />
    };

    if (compact) {
        // Upgrade category based on total elevation loss (high loss = more eccentric stress regardless of gradient)
        let effectiveCategory = strategy.category;
        let effectiveIcon = strategy.icon;
        let wasUpgraded = false;

        if (elevationLoss) {
            if (elevationLoss > 2000 && effectiveCategory === 'easy') {
                effectiveCategory = 'moderate';
                effectiveIcon = '⚠️';
                wasUpgraded = true;
            } else if (elevationLoss > 3000 && effectiveCategory === 'moderate') {
                effectiveCategory = 'technical';
                effectiveIcon = '🔶';
                wasUpgraded = true;
            } else if (elevationLoss > 1500 && effectiveCategory === 'easy') {
                effectiveCategory = 'moderate';
                effectiveIcon = '⚠️';
                wasUpgraded = true;
            }
        }

        // Get alert-style colors based on category
        const alertColors = {
            easy: 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 border-green-300 dark:border-green-700',
            moderate: 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400 border-yellow-300 dark:border-yellow-700',
            technical: 'bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-400 border-orange-300 dark:border-orange-700',
            extreme: 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400 border-red-300 dark:border-red-700'
        };

        // Build tooltip explaining the classification
        const upgradeNote = wasUpgraded ? ` (upgraded from ${strategy.category} due to ${Math.round(elevationLoss!)}ft total loss)` : '';
        const tooltipText = `${strategy.advice}${upgradeNote}`;

        return (
            <div
                className={`inline-flex flex-col items-start px-2 py-1 rounded border text-xs font-medium ${alertColors[effectiveCategory]}`}
                title={tooltipText}
            >
                <div className="flex items-center gap-1">
                    <span className="opacity-60">Descent:</span>
                    {effectiveIcon}
                    <span className="font-semibold">{effectiveCategory.charAt(0).toUpperCase() + effectiveCategory.slice(1)}</span>
                </div>
                <div className="opacity-75 text-[10px]">
                    {elevationLoss && elevationLoss > 500
                        ? `↓ ${Math.round(elevationLoss).toLocaleString()}ft loss`
                        : `${Math.abs(gradient).toFixed(0)}% grade`
                    }
                </div>
            </div>
        );
    }

    return (
        <div className={`p-3 rounded-lg border ${strategy.bgColor} border-${strategy.color}-200 dark:border-${strategy.color}-800`}>
            <div className="flex items-start gap-2">
                <span className={strategy.textColor}>
                    {icons[strategy.category]}
                </span>
                <div className="flex-1">
                    <div className="flex items-center gap-2">
                        <span className={`font-medium ${strategy.textColor}`}>
                            {strategy.category.charAt(0).toUpperCase() + strategy.category.slice(1)} Descent
                        </span>
                        <span className="text-sm text-gray-500 dark:text-gray-400">
                            ({Math.abs(gradient).toFixed(1)}% grade)
                        </span>
                    </div>
                    {elevationLoss && elevationLoss > 0 && (
                        <div className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                            ↓ {elevationLoss.toFixed(0)}ft elevation loss
                        </div>
                    )}
                    {showAdvice && (
                        <p className="text-sm mt-2 text-gray-700 dark:text-gray-300">
                            💡 {strategy.advice}
                        </p>
                    )}
                </div>
            </div>
        </div>
    );
};

export default DescentWarningBadge;
