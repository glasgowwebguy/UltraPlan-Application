/**
 * Race Time Summary Panel Component
 *
 * Displays comprehensive time breakdown showing:
 * - Running time (actual moving time)
 * - Aid station time (checkpoint stops)
 * - Total race time
 */

import React, { useState } from 'react';
import { Coffee, ChevronDown, ChevronUp, HelpCircle } from 'lucide-react';
import type { RaceTimeSummary } from '../utils/raceTimeSummary';
import { formatTimeSummary, calculateRunningTimePercentage, calculateAverageCheckpointTime, calculateAveragePace, formatPace } from '../utils/raceTimeSummary';
import { calculateTotalTimeWithFatigue } from '../utils/fatigueCurve';

interface RaceTimeSummaryPanelProps {
  summary: RaceTimeSummary;
  showBreakdown?: boolean;
  // Fatigue curve settings
  fatigueFactor?: number;  // e.g., 3.0 for 3% per 10 miles
  basePace?: number;       // Base pace in min/mile
  showFatigueCurve?: boolean;  // Whether fatigue curve is enabled
}

const RaceTimeSummaryPanel: React.FC<RaceTimeSummaryPanelProps> = ({
  summary,
  showBreakdown: initialShowBreakdown = false,
  fatigueFactor,
  basePace,
  showFatigueCurve = false,
}) => {
  const [showBreakdown, setShowBreakdown] = useState(initialShowBreakdown);
  const formatted = formatTimeSummary(summary);
  const runningPercentage = calculateRunningTimePercentage(summary);
  const avgCheckpointTime = calculateAverageCheckpointTime(summary);
  const avgPace = calculateAveragePace(summary);

  return (
    <div className="bg-white dark:bg-[#1e2639] rounded-lg p-4 shadow-md dark:shadow-none border border-gray-200 dark:border-gray-700/50">
      {/* Header with left accent bar */}
      <div className="flex items-center gap-2 mb-4 pb-2 border-b border-gray-200 dark:border-gray-700/50">
        <div className="w-1 h-6 bg-gradient-to-b from-blue-500 to-purple-500 rounded-full"></div>
        <h3 className="text-sm font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider">
          Race Time Summary
        </h3>
      </div>

      {/* Metric Cards Grid - matching CHECKPOINT-BASED ACTUAL METRICS style */}
      <div className={`grid grid-cols-1 ${showFatigueCurve && fatigueFactor && basePace && summary.totalDistanceMiles > 0 ? 'md:grid-cols-4' : 'md:grid-cols-3'} gap-4 mb-4`}>
        {/* Running Time Card */}
        <div className="bg-gray-50 dark:bg-[#2a3244] rounded-lg p-4 border border-gray-200 dark:border-gray-700/50">
          <div className="text-sm font-medium text-orange-500 dark:text-orange-400 mb-2">
            Running Time
          </div>
          <div className="text-2xl font-bold text-gray-900 dark:text-white">
            {formatted.runningTime}
          </div>
          {summary.totalDistanceMiles > 0 && avgPace > 0 && (
            <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              {summary.totalDistanceMiles.toFixed(1)} mi • avg {formatPace(avgPace)} /mi
            </div>
          )}
        </div>

        {/* Aid Station Time Card */}
        <div className="bg-gray-50 dark:bg-[#2a3244] rounded-lg p-4 border border-gray-200 dark:border-gray-700/50">
          <div className="text-sm font-medium text-orange-500 dark:text-orange-400 mb-2">
            Aid Station Time
          </div>
          <div className="flex items-baseline justify-between">
            <div className="text-2xl font-bold text-gray-900 dark:text-white">
              {formatted.checkpointTime}
            </div>
          </div>
          {summary.checkpointBreakdown.length > 0 && (
            <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              {summary.checkpointBreakdown.length} stops • avg {Math.round(avgCheckpointTime)} min
            </div>
          )}
        </div>

        {/* Total Race Time Card */}
        <div className="bg-gray-50 dark:bg-[#2a3244] rounded-lg p-4 border border-gray-200 dark:border-gray-700/50">
          <div className="text-sm font-medium text-orange-500 dark:text-orange-400 mb-2">
            Total Race Time
          </div>
          <div className="flex items-baseline justify-between">
            <div className="text-2xl font-bold text-gray-900 dark:text-white">
              {formatted.totalTime}
            </div>
            <div className="text-right">
              <div className="text-xs text-gray-500 dark:text-gray-400">Moving</div>
              <div className="text-sm font-semibold text-gray-700 dark:text-gray-300">
                {runningPercentage.toFixed(0)}%
              </div>
            </div>
          </div>
        </div>

        {/* Estimated Finish Time (Fatigue Adjusted) Card */}
        {showFatigueCurve && fatigueFactor && basePace && summary.totalDistanceMiles > 0 && (
          <div className="bg-gradient-to-br from-orange-500/10 to-red-500/10 dark:from-orange-500/20 dark:to-red-500/20 rounded-lg p-4 border border-orange-200 dark:border-orange-700/50 relative">
            {/* Title with Tooltip Icon */}
            <div className="flex items-center gap-1 text-sm font-medium text-orange-600 dark:text-orange-400 mb-2">
              Est. Finish (Fatigue)

              {/* Tooltip Icon */}
              <div className="group relative">
                <HelpCircle className="w-4 h-4 cursor-help text-orange-400 dark:text-orange-500" />

                {/* Tooltip Popup */}
                <div className="absolute z-50 bottom-full left-1/2 -translate-x-1/2 mb-2 px-3 py-2 bg-gray-900 text-white text-xs rounded-lg shadow-lg opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none w-64">
                  <div className="font-semibold mb-1">Fatigue-Adjusted Finish Time</div>
                  <p className="mb-2">
                    This estimate accounts for natural pace degradation over distance (the "fade").
                  </p>
                  <p className="mb-2">
                    <strong>Total Race Time</strong> assumes constant pace throughout.
                    <strong> Fatigue-Adjusted</strong> applies a {fatigueFactor}% pace increase per 10 miles.
                  </p>
                  <p className="text-orange-300">
                    Formula: pace degrades by {fatigueFactor}% for every 10 miles,
                    resulting in ~{(fatigueFactor * (summary.totalDistanceMiles / 10)).toFixed(0)}% total fade.
                  </p>

                  {/* Arrow */}
                  <div className="absolute top-full left-1/2 -translate-x-1/2 border-8 border-transparent border-t-gray-900"></div>
                </div>
              </div>
            </div>

            {/* Calculated Value */}
            <div className="text-2xl font-bold text-gray-900 dark:text-white">
              {(() => {
                const fatigueTimeMinutes = calculateTotalTimeWithFatigue(
                  basePace,
                  summary.totalDistanceMiles,
                  fatigueFactor
                );
                // Add checkpoint time
                const totalWithCheckpoints = fatigueTimeMinutes + summary.totalCheckpointTimeMinutes;
                const hours = Math.floor(totalWithCheckpoints / 60);
                const minutes = Math.round(totalWithCheckpoints % 60);
                return `${hours}h ${minutes}m`;
              })()}
            </div>

            {/* Difference from base total */}
            <div className="text-xs text-orange-500 dark:text-orange-400 mt-1">
              {(() => {
                const baseTimeMinutes = summary.totalRunningTimeMinutes + summary.totalCheckpointTimeMinutes;
                const fatigueTimeMinutes = calculateTotalTimeWithFatigue(
                  basePace,
                  summary.totalDistanceMiles,
                  fatigueFactor
                ) + summary.totalCheckpointTimeMinutes;
                const diff = fatigueTimeMinutes - baseTimeMinutes;
                const diffHours = Math.floor(diff / 60);
                const diffMins = Math.round(diff % 60);
                return `+${diffHours > 0 ? diffHours + 'h ' : ''}${diffMins}m vs constant pace`;
              })()}
            </div>
          </div>
        )}
      </div>

      {/* Checkpoint stop times Toggle */}
      {summary.checkpointBreakdown.length > 0 && (
        <>
          <button
            onClick={() => setShowBreakdown(!showBreakdown)}
            className="w-full flex items-center justify-between p-3 text-sm text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700/30 rounded-lg transition-colors border border-gray-200 dark:border-gray-700/50"
          >
            <span className="font-medium">Checkpoint stop times</span>
            {showBreakdown ? (
              <ChevronUp className="w-4 h-4" />
            ) : (
              <ChevronDown className="w-4 h-4" />
            )}
          </button>

          {showBreakdown && (
            <div className="space-y-2 mt-3">
              {summary.checkpointBreakdown.map((cp, index) => (
                <div
                  key={index}
                  className="flex items-center justify-between p-3 bg-gray-50 dark:bg-[#2a3244] rounded-lg text-sm border border-gray-200 dark:border-gray-700/50"
                >
                  <div className="flex items-center gap-2">
                    <Coffee className="w-4 h-4 text-orange-500 dark:text-orange-400" />
                    <span className="text-gray-700 dark:text-gray-300">
                      {cp.checkpointName}
                    </span>
                    {cp.hasSupportCrew && (
                      <span className="text-xs px-1.5 py-0.5 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 rounded">
                        Crew
                      </span>
                    )}
                  </div>
                  <span className="font-medium text-gray-900 dark:text-white">
                    {cp.stopTimeMinutes} min
                  </span>
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {/* Info Note */}
      {summary.totalCheckpointTimeMinutes === 0 && (
        <div className="text-xs text-gray-500 dark:text-gray-400 italic p-3 bg-gray-50 dark:bg-[#2a3244] rounded-lg border border-gray-200 dark:border-gray-700/50 mt-4">
          Tip: Add checkpoint stop times to get more accurate total race time predictions
        </div>
      )}
    </div>
  );
};

export default RaceTimeSummaryPanel;
