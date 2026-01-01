import React, { useMemo } from 'react';
import { Clock, TrendingUp, Heart, Award, Mountain } from 'lucide-react';
import MetricCard from './MetricCard';
import InsightCard from './InsightCard';
import PacingChart from './PacingChart';
import { calculateRaceAnalytics } from '../utils/splitAnalysis';
import { useUnit } from '../contexts/UnitContext';
import { formatDistance, formatPace, getElevationValue } from '../utils/unitConversions';
import { localStorageService } from '../services/localStorage';
import { compareToStandardModel, type GAPProfile } from '../utils/gapProfileAnalyzer';
import type { Race, Segment, ParsedFITData, RaceAnalytics } from '../../shared/types';
import stravaPoweredBy from '@/react-app/img/api_logo_pwrdBy_strava_horiz_orange.svg';

interface RaceComparisonDashboardProps {
  plannedRace: Race;
  actualFitData: ParsedFITData;
  segments: Segment[];
}

const RaceComparisonDashboard: React.FC<RaceComparisonDashboardProps> = ({
  plannedRace,
  actualFitData,
  segments,
}) => {
  const { useMiles } = useUnit();

  // Calculate comprehensive analytics
  const analytics: RaceAnalytics | null = useMemo(
    () => calculateRaceAnalytics(plannedRace, actualFitData, segments),
    [plannedRace, actualFitData, segments]
  );

  // Load GAP profile from localStorage
  const gapProfile = useMemo(() =>
    localStorageService.getGAPProfile() as GAPProfile | null,
    []
  );

  // Calculate GAP insights based on profile and race data
  const gapInsights = useMemo(() => {
    if (!gapProfile || !analytics) return null;

    // Calculate total elevation from splits
    // Note: elevationGain and elevationLoss from splits are ALREADY in feet
    const totalGainFeet = analytics.splits.reduce((sum, s) => sum + s.elevationGain, 0);
    const totalLossFeet = analytics.splits.reduce((sum, s) => sum + s.elevationLoss, 0);

    // Calculate theoretical time difference based on personal factors
    // Compare personal factor to standard (40s/100ft uphill, 10s/100ft downhill)
    const standardUphillFactor = 40; // seconds per 100ft
    const standardDownhillFactor = 10; // seconds per 100ft

    // Time saved/lost due to climbing ability (in minutes)
    // If your factor < standard, you're faster (negative = saved time)
    // If your factor > standard, you're slower (positive = lost time)
    const climbingDiffSecPer100ft = gapProfile.uphillFactor - standardUphillFactor;
    const descendingDiffSecPer100ft = gapProfile.downhillFactor - standardDownhillFactor;

    // Calculate total time difference: (seconds per 100ft) * (total feet / 100) / 60 = minutes
    const climbingTimeDiffMinutes = (climbingDiffSecPer100ft * totalGainFeet / 100) / 60;
    const descendingTimeDiffMinutes = (descendingDiffSecPer100ft * totalLossFeet / 100) / 60;

    const comparison = compareToStandardModel(gapProfile);

    return {
      climbingTimeSaved: -climbingTimeDiffMinutes, // Negative = you're slower, so "saved" is inverted
      descendingTimeSaved: -descendingTimeDiffMinutes,
      totalGainFeet,
      totalLossFeet,
      comparison,
    };
  }, [gapProfile, analytics]);

  if (!analytics || analytics.splits.length === 0) {
    return (
      <div className="bg-gray-50 dark:bg-[#1e2639] rounded-xl p-6">
        <p className="text-gray-400 text-center">
          No analysis data available. Ensure FIT file has checkpoint data that matches your race
          plan.
        </p>
      </div>
    );
  }

  const formatTime = (seconds: number): string => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);

    if (hours > 0) {
      return `${hours}:${minutes.toString().padStart(2, '0')}:${secs
        .toString()
        .padStart(2, '0')}`;
    }
    return `${minutes}:${secs.toString().padStart(2, '0')}`;
  };

  const formatTimeDiff = (seconds: number): string => {
    const isNegative = seconds < 0;
    const absSeconds = Math.abs(seconds);
    const hours = Math.floor(absSeconds / 3600);
    const minutes = Math.floor((absSeconds % 3600) / 60);

    let result = '';
    if (hours > 0) {
      result = `${hours}h ${minutes}m`;
    } else {
      result = `${minutes}m`;
    }

    return `${isNegative ? '-' : '+'}${result}`;
  };

  // Format race date for display
  const formatRaceDate = (dateString?: string | null): string => {
    if (!dateString) return '';
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      });
    } catch {
      return '';
    }
  };

  // Extract race name from FIT filename by removing file extension and cleaning up
  const getFitDisplayName = (fileName: string): string => {
    // Remove file extension (.fit, .FIT)
    const nameWithoutExt = fileName.replace(/\.fit$/i, '');
    // Replace underscores and hyphens with spaces
    const cleanedName = nameWithoutExt.replace(/[_-]/g, ' ');
    // Remove "The_" prefix variations
    return cleanedName.replace(/^The\s+/i, '');
  };

  const fitDisplayName = getFitDisplayName(actualFitData.fileName);
  const activityDate = formatRaceDate(actualFitData.raceDate);
  const titleSuffix = activityDate ? ` (${activityDate})` : '';

  return (
    <div className="bg-gray-50 dark:bg-[#1e2639] rounded-xl p-6 space-y-6 shadow-md dark:shadow-none">
      {/* Overall Performance Summary */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold text-gray-900 dark:text-white">
            Previous Performance Overview for {fitDisplayName}{titleSuffix}
          </h2>
          {/* Strava Attribution - only show if data is from Strava */}
          {actualFitData.source === 'strava' && (
            <img
              src={stravaPoweredBy}
              alt="Powered by Strava"
              className="h-4 opacity-70"
            />
          )}
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <MetricCard
            title="Finish Time"
            value={formatTime(analytics.actualFinishTime)}
            comparison={formatTimeDiff(analytics.timeDifference)}
            comparisonLabel="vs Plan"
            trend={analytics.timeDifference > 0 ? 'positive' : 'negative'}
            icon={<Clock className="w-5 h-5" />}
          />
          <MetricCard
            title="Average Pace"
            value={formatPace(analytics.avgPace, useMiles)}
            comparison={`${analytics.paceVariance > 0 ? '+' : ''}${analytics.paceVariance.toFixed(
              1
            )}%`}
            comparisonLabel="vs Plan"
            trend={analytics.paceVariance > 0 ? 'positive' : 'negative'}
            icon={<TrendingUp className="w-5 h-5" />}
          />
          <MetricCard
            title="Avg Heart Rate"
            value={`${Math.round(analytics.avgHeartRate)} bpm`}
            comparison={`Zone ${analytics.avgHRZone}`}
            trend="neutral"
            icon={<Heart className="w-5 h-5" />}
          />
          <MetricCard
            title="Efficiency Score"
            value={`${analytics.efficiencyScore}/100`}
            comparison={`Grade: ${analytics.efficiencyGrade}`}
            trend={analytics.efficiencyScore > 80 ? 'positive' : 'neutral'}
            icon={<Award className="w-5 h-5" />}
          />
        </div>
      </div>

      {/* Split Analysis Table */}
      <div className="bg-white dark:bg-[#2a3244] rounded-lg p-4">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Checkpoint Split Analysis</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-gray-600 dark:text-gray-400 border-b border-gray-300 dark:border-gray-700">
                <th className="text-left py-2 px-2">Checkpoint</th>
                <th className="text-right py-2 px-2">Split Dist</th>
                <th className="text-right py-2 px-2">Plan Time</th>
                <th className="text-right py-2 px-2">Split Time</th>
                <th className="text-right py-2 px-2">Plan Pace</th>
                <th className="text-right py-2 px-2">Split Pace</th>
                <th className="text-right py-2 px-2">
                  <span className="cursor-help" title="Planned Grade Adjusted Pace - planned effort-adjusted pace">
                    Plan GAP
                  </span>
                </th>
                <th className="text-right py-2 px-2">
                  <span className="cursor-help" title="Actual Grade Adjusted Pace - actual flat-ground equivalent effort">
                    GAP
                  </span>
                </th>
                <th className="text-right py-2 px-2">vs Plan</th>
                <th className="text-right py-2 px-2">Avg HR</th>
                <th className="text-right py-2 px-2">Elev Δ</th>
              </tr>
            </thead>
            <tbody>
              {analytics.splits.map((split, index) => (
                <tr
                  key={index}
                  className="border-b border-gray-300/50 dark:border-gray-700/50 hover:bg-gray-100 dark:hover:bg-gray-700/20 transition-colors"
                >
                  <td className="py-2 px-2 text-gray-900 dark:text-white font-medium">{split.checkpointName}</td>
                  <td className="text-right text-gray-700 dark:text-gray-300 px-2">
                    {formatDistance(split.segmentDistance, useMiles)}
                  </td>
                  <td className="text-right text-gray-500 dark:text-gray-400 px-2">
                    {formatTime(split.plannedTime * 60)}
                  </td>
                  <td className="text-right text-gray-700 dark:text-gray-300 px-2">
                    {formatTime(split.actualTime * 60)}
                  </td>
                  <td className="text-right text-gray-500 dark:text-gray-400 px-2">
                    {formatPace(split.plannedPace, useMiles)}
                  </td>
                  <td className="text-right text-gray-700 dark:text-gray-300 px-2">
                    {formatPace(split.actualPace, useMiles)}
                  </td>
                  <td className="text-right text-gray-500 dark:text-gray-400 px-2 text-sm">
                    {split.plannedGAP ? formatPace(split.plannedGAP, useMiles) : '-'}
                  </td>
                  <td
                    className={`text-right px-2 text-sm ${split.avgGAP && split.gapVariance !== undefined
                      ? split.gapVariance < -5
                        ? 'text-green-600 dark:text-green-400'
                        : split.gapVariance > 5
                          ? 'text-blue-600 dark:text-blue-400'
                          : 'text-gray-600 dark:text-gray-400'
                      : 'text-gray-400 dark:text-gray-500'
                      }`}
                    title={
                      split.avgGAP && split.gapVariance !== undefined
                        ? split.gapVariance < -5
                          ? 'Working harder than pace suggests'
                          : split.gapVariance > 5
                            ? 'Working easier than pace suggests'
                            : 'Effort matches flat terrain'
                        : ''
                    }
                  >
                    {split.avgGAP ? formatPace(split.avgGAP, useMiles) : '-'}
                  </td>
                  <td
                    className={`text-right font-medium px-2 ${split.paceVariance > 0 ? 'text-green-700 dark:text-green-400' : 'text-red-400'
                      }`}
                  >
                    {split.paceVariance > 0 ? '+' : ''}
                    {split.paceVariance.toFixed(1)}%
                  </td>
                  <td className="text-right text-gray-700 dark:text-gray-300 px-2">
                    {Math.round(split.avgHeartRate)}
                  </td>
                  <td className="text-right text-gray-700 dark:text-gray-300 px-2 text-xs">
                    +{Math.round(getElevationValue(split.elevationGain, useMiles))}/-{Math.round(getElevationValue(split.elevationLoss, useMiles))} {useMiles ? 'ft' : 'm'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Performance Insights */}
      {analytics.insights.length > 0 && (
        <div className="bg-white dark:bg-[#2a3244] rounded-lg p-4">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Performance Insights</h3>
          <div className="space-y-3">
            {analytics.insights.map((insight, index) => (
              <InsightCard key={index} insight={insight} />
            ))}
          </div>
        </div>
      )}

      {/* GAP Profile Insights - only show if profile exists */}
      {gapProfile && gapInsights && (
        <div className="bg-white dark:bg-[#2a3244] rounded-lg p-4">
          <div className="flex items-center gap-2 mb-4">
            <Mountain className="w-5 h-5 text-purple-500" />
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Your Climbing/Descending Analysis</h3>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            {/* Climbing Analysis */}
            <div className="bg-gradient-to-br from-green-500/10 to-green-600/5 dark:from-green-500/20 dark:to-green-600/10 rounded-lg p-4 border border-green-500/20">
              <div className="flex items-center gap-2 mb-2">
                <TrendingUp className="w-4 h-4 text-green-500" />
                <span className="text-sm font-medium text-gray-900 dark:text-white">Climbing Impact</span>
              </div>
              <div className="text-2xl font-bold mb-1">
                <span className={gapInsights.climbingTimeSaved > 0 ? 'text-green-600 dark:text-green-400' : 'text-red-500'}>
                  {gapInsights.climbingTimeSaved > 0 ? '-' : '+'}
                  {Math.abs(gapInsights.climbingTimeSaved).toFixed(0)} min
                </span>
              </div>
              <p className="text-xs text-gray-600 dark:text-gray-400">
                {gapInsights.climbingTimeSaved > 0
                  ? `Your climbing strength saved about ${Math.abs(gapInsights.climbingTimeSaved).toFixed(0)} minutes on ${Math.round(gapInsights.totalGainFeet)} ft of climbing`
                  : `Climbing cost you about ${Math.abs(gapInsights.climbingTimeSaved).toFixed(0)} extra minutes`
                }
              </p>
            </div>

            {/* Descending Analysis */}
            <div className="bg-gradient-to-br from-blue-500/10 to-blue-600/5 dark:from-blue-500/20 dark:to-blue-600/10 rounded-lg p-4 border border-blue-500/20">
              <div className="flex items-center gap-2 mb-2">
                <TrendingUp className="w-4 h-4 text-blue-500 rotate-180" />
                <span className="text-sm font-medium text-gray-900 dark:text-white">Descending Impact</span>
              </div>
              <div className="text-2xl font-bold mb-1">
                <span className={gapInsights.descendingTimeSaved > 0 ? 'text-blue-600 dark:text-blue-400' : 'text-orange-500'}>
                  {gapInsights.descendingTimeSaved > 0 ? '-' : '+'}
                  {Math.abs(gapInsights.descendingTimeSaved).toFixed(0)} min
                </span>
              </div>
              <p className="text-xs text-gray-600 dark:text-gray-400">
                {gapInsights.descendingTimeSaved > 0
                  ? `Your descending ability saved about ${Math.abs(gapInsights.descendingTimeSaved).toFixed(0)} minutes on ${Math.round(gapInsights.totalLossFeet)} ft of descent`
                  : `Descents cost you about ${Math.abs(gapInsights.descendingTimeSaved).toFixed(0)} extra minutes`
                }
              </p>
            </div>
          </div>

          {/* Summary */}
          <div className="bg-gray-100 dark:bg-gray-800/50 rounded-lg p-3">
            <p className="text-sm text-gray-700 dark:text-gray-300">
              <span className="font-medium">Profile Summary:</span> {gapInsights.comparison.overallAssessment}
            </p>
          </div>
        </div>
      )}

      {/* Pacing Strategy Analysis */}
      <div className="bg-white dark:bg-[#2a3244] rounded-lg p-4">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Pacing Strategy</h3>
        <PacingChart splits={analytics.splits} />
        <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
          <div className="bg-gray-100 dark:bg-gray-800/50 rounded-lg p-3">
            <div className="text-gray-600 dark:text-gray-400 mb-1">Negative Split</div>
            <div className={`font-semibold ${analytics.negativeSplit ? 'text-green-700 dark:text-green-400' : 'text-yellow-400'}`}>
              {analytics.negativeSplit ? 'Yes ✓' : 'No'}
            </div>
          </div>
          <div className="bg-gray-100 dark:bg-gray-800/50 rounded-lg p-3">
            <div className="text-gray-600 dark:text-gray-400 mb-1">Pacing Consistency</div>
            <div className="font-semibold text-gray-900 dark:text-white">{analytics.pacingConsistency}</div>
          </div>
          <div className="bg-gray-100 dark:bg-gray-800/50 rounded-lg p-3">
            <div className="text-gray-600 dark:text-gray-400 mb-1">Fade Rate</div>
            <div className={`font-semibold ${analytics.fadeRate > 5 ? 'text-red-400' : 'text-green-700 dark:text-green-400'}`}>
              {analytics.fadeRate.toFixed(1)}% per hour
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default RaceComparisonDashboard;
