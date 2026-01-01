/**
 * EnergyBalancePanel Component
 *
 * Displays energy balance and bonk risk analysis for a race plan.
 * Shows glycogen depletion, calories burned/consumed, and recommendations.
 */

import { useState, useMemo } from 'react';
import {
  Activity,
  ChevronDown,
  ChevronUp,
  Info,
  Flame,
  Battery,
  AlertTriangle,
  Clock
} from 'lucide-react';
import type { Segment, AthleteMetricsForEnergy, EnergyBalanceCalculation } from '../../shared/types';
import {
  calculateSegmentEnergyBalance,
  getGlycogenColor,
  getGlycogenBarColor,
  getBonkRiskColor,
  getBonkRiskLabel,
  formatTimeToBonk,
  getRiskTooltip
} from '../utils/energyBalance';

interface EnergyBalancePanelProps {
  segments: Segment[];
  athleteMetrics: AthleteMetricsForEnergy;
  segmentTimes: number[]; // Time in minutes for each segment
  segmentElevationGains?: number[]; // Elevation gain in feet per segment
  segmentElevationLosses?: number[]; // Elevation loss in feet per segment
}

interface SegmentBalanceRow {
  segment: Segment;
  balance: EnergyBalanceCalculation;
  cumulativeBurned: number;
  cumulativeConsumed: number;
}

export default function EnergyBalancePanel({
  segments,
  athleteMetrics,
  segmentTimes,
  segmentElevationGains = [],
  segmentElevationLosses = []
}: EnergyBalancePanelProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [showDetails, setShowDetails] = useState(true);

  // Create a serialized key of nutrition items to detect changes
  // This ensures useMemo recalculates when ANY segment's nutrition items change
  const nutritionKey = useMemo(() => {
    return segments.map(seg => seg.segment_nutrition_items || '').join('|');
  }, [segments]);

  // Calculate energy balance for all segments
  const { segmentBalances, totals, finalBalance, allSegmentWarnings, allGeneralTips } = useMemo(() => {
    let cumulativeBurned = 0;
    let cumulativeConsumed = 0;
    let cumulativeDistance = 0;
    let cumulativeTimeHours = 0;
    const allSegmentWarnings: string[] = [];
    const allGeneralTips: string[] = [];

    const balances: SegmentBalanceRow[] = segments.map((segment, index) => {
      const segmentTimeMinutes = segmentTimes[index] || 0;
      const elevationGain = segmentElevationGains[index] || 0;
      const elevationLoss = segmentElevationLosses[index] || 0;

      const balance = calculateSegmentEnergyBalance(
        segment,
        segmentTimeMinutes,
        elevationGain,
        elevationLoss,
        cumulativeBurned,
        cumulativeConsumed,
        cumulativeDistance,
        cumulativeTimeHours,
        athleteMetrics
      );

      const row: SegmentBalanceRow = {
        segment,
        balance,
        cumulativeBurned: cumulativeBurned + balance.segmentCaloriesBurned,
        cumulativeConsumed: cumulativeConsumed + balance.segmentCaloriesConsumed
      };

      // Collect segment-specific warnings (with checkpoint name)
      balance.segmentWarnings.forEach(warning => {
        if (!allSegmentWarnings.includes(warning)) {
          allSegmentWarnings.push(warning);
        }
      });

      // Collect general tips (avoid duplicates)
      balance.generalTips.forEach(tip => {
        if (!allGeneralTips.includes(tip)) {
          allGeneralTips.push(tip);
        }
      });

      cumulativeBurned += balance.segmentCaloriesBurned;
      cumulativeConsumed += balance.segmentCaloriesConsumed;
      cumulativeDistance += segment.segment_distance_miles;
      cumulativeTimeHours += segmentTimeMinutes / 60;

      return row;
    });

    return {
      segmentBalances: balances,
      totals: {
        burned: cumulativeBurned,
        consumed: cumulativeConsumed,
        deficit: cumulativeConsumed - cumulativeBurned
      },
      finalBalance: balances.length > 0 ? balances[balances.length - 1].balance : null,
      allSegmentWarnings,
      allGeneralTips
    };
  }, [segments, athleteMetrics, segmentTimes, segmentElevationGains, segmentElevationLosses, nutritionKey]);

  // Don't render if no athlete metrics
  if (!athleteMetrics.bodyWeightKg || athleteMetrics.bodyWeightKg <= 0) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700">
        <div className="flex items-center gap-2 text-gray-500 dark:text-gray-400">
          <Activity className="w-5 h-5" />
          <span className="text-sm">
            Add body weight in Auto-Pace settings to see energy balance analysis
          </span>
        </div>
      </div>
    );
  }

  // Don't render if no segments
  if (segments.length === 0 || !finalBalance) {
    return null;
  }

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
      {/* Header */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full px-4 py-3 flex items-center justify-between hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
      >
        <div className="flex items-center gap-3">
          <Activity className="w-5 h-5 text-purple-500" />
          <div className="text-left">
            <h3 className="font-semibold text-gray-900 dark:text-gray-100">
              Energy Balance
            </h3>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              Glycogen: {finalBalance.estimatedGlycogenPercent}% | Risk: {getBonkRiskLabel(finalBalance.bonkRisk)}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {/* Quick glycogen indicator */}
          <div className={`text-sm font-medium ${getGlycogenColor(finalBalance.estimatedGlycogenPercent)}`}>
            <Battery className="w-4 h-4 inline mr-1" />
            {finalBalance.estimatedGlycogenPercent}%
          </div>

          {isExpanded ? (
            <ChevronUp className="w-5 h-5 text-gray-400" />
          ) : (
            <ChevronDown className="w-5 h-5 text-gray-400" />
          )}
        </div>
      </button>

      {/* Expanded Content */}
      {isExpanded && (
        <div className="px-4 pb-4 space-y-4 border-t border-gray-200 dark:border-gray-700">
          {/* Glycogen Gauge */}
          <div className="pt-4">
            <div className="flex items-center justify-between text-sm mb-2">
              <div className="flex items-center gap-1">
                <span className="font-medium text-gray-700 dark:text-gray-300">Glycogen Stores</span>
                <div className="group relative">
                  <Info className="w-4 h-4 text-gray-400 cursor-help" />
                  <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-64 p-2 bg-gray-900 text-white text-xs rounded shadow-lg opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity z-10">
                    Glycogen is stored carbohydrate that powers high-intensity running.
                    A trained athlete stores ~500g (2000 kcal). Running depletes glycogen,
                    while eating carbs replenishes it.
                  </div>
                </div>
              </div>
              <span className={`font-bold ${getGlycogenColor(finalBalance.estimatedGlycogenPercent)}`}>
                {finalBalance.estimatedGlycogenPercent}% ({finalBalance.estimatedGlycogenRemaining}g)
              </span>
            </div>

            <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-4 overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-500 ${getGlycogenBarColor(finalBalance.estimatedGlycogenPercent)}`}
                style={{ width: `${Math.min(100, finalBalance.estimatedGlycogenPercent)}%` }}
              />
            </div>

            {/* Glycogen scale labels */}
            <div className="flex justify-between text-xs text-gray-500 mt-1">
              <span>Empty</span>
              <span className="text-red-500">Critical</span>
              <span className="text-yellow-500">Low</span>
              <span className="text-green-500">Full</span>
            </div>
          </div>

          {/* Time to Bonk Warning */}
          {finalBalance.timeToBonk !== null && (
            <div className="flex items-center gap-2 p-3 bg-red-50 dark:bg-red-900/20 rounded-lg border border-red-200 dark:border-red-800">
              <Clock className="w-5 h-5 text-red-500" />
              <div>
                <div className="text-sm font-medium text-red-700 dark:text-red-300">
                  Estimated Time to Bonk: {formatTimeToBonk(finalBalance.timeToBonk)}
                </div>
                <div className="text-xs text-red-600 dark:text-red-400">
                  Increase carb intake to prevent glycogen depletion
                </div>
              </div>
            </div>
          )}

          {/* Summary Stats */}
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-orange-50 dark:bg-orange-900/20 p-3 rounded-lg">
              <div className="flex items-center gap-1 text-xs text-gray-600 dark:text-gray-400 mb-1">
                <Flame className="w-3 h-3" />
                Calories Burned
              </div>
              <div className="text-lg font-bold text-orange-600 dark:text-orange-400">
                {Math.round(totals.burned).toLocaleString()} kcal
              </div>
            </div>

            <div className="bg-green-50 dark:bg-green-900/20 p-3 rounded-lg">
              <div className="flex items-center gap-1 text-xs text-gray-600 dark:text-gray-400 mb-1">
                <Activity className="w-3 h-3" />
                Calories Consumed
              </div>
              <div className="text-lg font-bold text-green-600 dark:text-green-400">
                {Math.round(totals.consumed).toLocaleString()} kcal
              </div>
            </div>
          </div>

          {/* Deficit/Surplus */}
          <div className={`p-3 rounded-lg ${totals.deficit < 0 ? 'bg-yellow-50 dark:bg-yellow-900/20' : 'bg-green-50 dark:bg-green-900/20'}`}>
            <div className="text-sm">
              <span className="text-gray-600 dark:text-gray-400">Net Balance: </span>
              <span className={`font-bold ${totals.deficit < 0 ? 'text-yellow-600 dark:text-yellow-400' : 'text-green-600 dark:text-green-400'}`}>
                {totals.deficit >= 0 ? '+' : ''}{Math.round(totals.deficit).toLocaleString()} kcal
              </span>
            </div>
            <div className="text-xs text-gray-500 dark:text-gray-400 mt-2 space-y-1">
              {totals.deficit < 0 ? (
                <>
                  <p>
                    <strong className="text-gray-700 dark:text-gray-300">This deficit is normal and expected.</strong> During ultra-endurance events,
                    your body efficiently burns stored fat alongside glycogen to meet energy demands.
                  </p>
                  <p>
                    The gut can only absorb ~200-350 kcal/hour during exercise, so replacing 100% of burned
                    calories isn't possible or necessary. Focus on consuming enough carbs to keep glycogen
                    stores above critical levels (shown above) rather than matching total calories burned.
                  </p>
                </>
              ) : (
                <p>
                  <strong className="text-gray-700 dark:text-gray-300">Good calorie balance.</strong> You're
                  maintaining energy stores well. This helps preserve glycogen for when you need it most.
                </p>
              )}
            </div>
          </div>

          {/* Segment-Specific Warnings (Orange/Warning style) */}
          {allSegmentWarnings.length > 0 && (
            <div className="space-y-2">
              <div className="text-sm font-medium text-gray-700 dark:text-gray-300 flex items-center gap-1">
                <AlertTriangle className="w-4 h-4 text-orange-500" />
                Segment Warnings
              </div>
              {allSegmentWarnings.map((warning: string, idx: number) => (
                <div
                  key={idx}
                  className="text-xs bg-orange-50 dark:bg-orange-900/20 p-2 rounded border border-orange-200 dark:border-orange-800 text-orange-800 dark:text-orange-200"
                >
                  {warning}
                </div>
              ))}
            </div>
          )}

          {/* General Tips (Blue/Info style) */}
          {allGeneralTips.length > 0 && (
            <div className="space-y-2">
              <div className="text-sm font-medium text-gray-700 dark:text-gray-300 flex items-center gap-1">
                <Info className="w-4 h-4 text-blue-500" />
                General Tips
              </div>
              {allGeneralTips.map((tip: string, idx: number) => (
                <div
                  key={idx}
                  className="text-xs bg-blue-50 dark:bg-blue-900/20 p-2 rounded border border-blue-200 dark:border-blue-800 text-blue-800 dark:text-blue-200"
                >
                  {tip}
                </div>
              ))}
            </div>
          )}

          {/* Detailed Breakdown Toggle */}
          <button
            onClick={() => setShowDetails(!showDetails)}
            className="text-sm text-purple-600 dark:text-purple-400 hover:underline flex items-center gap-1"
          >
            {showDetails ? 'Hide' : 'Show'} Segment Breakdown
            {showDetails ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>

          {/* Detailed Table */}
          {showDetails && (
            <div className="max-h-64 overflow-y-auto border border-gray-200 dark:border-gray-700 rounded-lg">
              <table className="w-full text-xs">
                <thead className="bg-gray-50 dark:bg-gray-700 sticky top-0">
                  <tr>
                    <th className="text-left py-2 px-3 font-medium text-gray-600 dark:text-gray-300">Checkpoint</th>
                    <th className="text-right py-2 px-3 font-medium text-blue-600">Time</th>
                    <th className="text-right py-2 px-3 font-medium text-orange-600">Burned</th>
                    <th className="text-right py-2 px-3 font-medium text-green-600">Consumed</th>
                    <th className="text-right py-2 px-3 font-medium text-gray-600 dark:text-gray-300">Glycogen</th>
                    <th className="text-center py-2 px-3 font-medium text-gray-600 dark:text-gray-300">Risk</th>
                    <th className="text-right py-2 px-3 font-medium text-red-600">Deficit</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                  {segmentBalances.map((row, idx) => {
                    const timeMinutes = segmentTimes[idx] || 0;
                    const hours = Math.floor(timeMinutes / 60);
                    const mins = Math.round(timeMinutes % 60);
                    const timeDisplay = hours > 0 ? `${hours}:${mins.toString().padStart(2, '0')}` : `${mins}m`;

                    return (
                    <tr key={idx} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                      <td className="py-2 px-3 text-gray-700 dark:text-gray-300 truncate max-w-[120px]">
                        {row.segment.checkpoint_name}
                      </td>
                      <td className="text-right py-2 px-3 text-blue-600 dark:text-blue-400">
                        {timeDisplay}
                      </td>
                      <td className="text-right py-2 px-3 text-orange-600 dark:text-orange-400">
                        {row.balance.segmentCaloriesBurned}
                      </td>
                      <td className="text-right py-2 px-3 text-green-600 dark:text-green-400">
                        {row.balance.segmentCaloriesConsumed}
                      </td>
                      <td className={`text-right py-2 px-3 font-medium ${getGlycogenColor(row.balance.estimatedGlycogenPercent)}`}>
                        {row.balance.estimatedGlycogenPercent}%
                      </td>
                      <td className={`text-center py-2 px-3 ${getBonkRiskColor(row.balance.bonkRisk)}`}>
                        <div className="group relative inline-block cursor-help">
                          {getBonkRiskLabel(row.balance.bonkRisk)}
                          <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-48 p-2 bg-gray-900 text-white text-xs rounded shadow-lg opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity z-10 text-left">
                            {getRiskTooltip(
                              row.balance.bonkRisk,
                              row.balance.segmentCaloriesBurned,
                              row.balance.segmentCaloriesConsumed,
                              row.balance.estimatedGlycogenPercent
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="text-right py-2 px-3 font-medium text-red-500 dark:text-red-400">
                        {row.balance.bonkRisk !== 'none' && (
                          `-${row.balance.segmentCaloriesBurned - row.balance.segmentCaloriesConsumed}`
                        )}
                      </td>
                    </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          {/* Info Note */}
          <div className="text-xs text-gray-500 dark:text-gray-400 flex items-start gap-2 pt-2 border-t border-gray-200 dark:border-gray-700">
            <Info className="w-4 h-4 flex-shrink-0 mt-0.5" />
            <span>
              Energy calculations are estimates based on distance, elevation, pace, and body weight.
              Actual burn varies with terrain, temperature, and individual metabolism.
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
