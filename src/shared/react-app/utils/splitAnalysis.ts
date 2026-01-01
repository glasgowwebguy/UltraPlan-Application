import type { Segment, ParsedFITData, CheckpointSplitAnalysis } from '../../shared/types';
import { calculateSegmentGAP, calculateGAP } from './gradeAdjustedPace';

/**
 * Calculate elevation gain from a series of elevation points
 */
function calculateElevationGain(elevations: number[]): number {
  let gain = 0;
  for (let i = 1; i < elevations.length; i++) {
    const diff = elevations[i] - elevations[i - 1];
    if (diff > 0) {
      gain += diff;
    }
  }
  // Convert meters to feet
  return gain * 3.28084;
}

/**
 * Calculate elevation loss from a series of elevation points
 */
function calculateElevationLoss(elevations: number[]): number {
  let loss = 0;
  for (let i = 1; i < elevations.length; i++) {
    const diff = elevations[i] - elevations[i - 1];
    if (diff < 0) {
      loss += Math.abs(diff);
    }
  }
  // Convert meters to feet
  return loss * 3.28084;
}

/**
 * Determine effort level based on heart rate
 */
function determineEffortLevel(
  heartRate: number
): 'easy' | 'moderate' | 'hard' | 'maximal' {
  // Simple heuristic based on heart rate zones
  // Assumes max HR ~190 (adjust for individual)
  const hrPercent = (heartRate / 190) * 100;

  if (hrPercent < 70) return 'easy';
  if (hrPercent < 80) return 'moderate';
  if (hrPercent < 90) return 'hard';
  return 'maximal';
}

/**
 * Calculate comprehensive split analysis for each checkpoint
 */
export function calculateSplitAnalysis(
  segments: Segment[],
  fitData: ParsedFITData | null
): CheckpointSplitAnalysis[] {
  if (!fitData || !fitData.records || fitData.records.length === 0) {
    return [];
  }

  const splits = segments
    .map((segment, index): CheckpointSplitAnalysis | null => {
      const startDistance = index === 0 ? 0 : segments[index - 1].cumulative_distance_miles;
      const endDistance = segment.cumulative_distance_miles;
      const segmentDistance = segment.segment_distance_miles;

      // Skip segments with zero or near-zero distance to avoid division by zero
      if (segmentDistance < 0.01) {
        return null; // Skip zero-distance segments
      }

      // Find FIT records within this segment distance range
      const segmentRecords = fitData.records.filter(
        (record) => record.distance >= startDistance && record.distance <= endDistance
      );

      if (segmentRecords.length < 2) {
        return null; // No data for this segment
      }

      const startTime = segmentRecords[0].timestamp;
      const endTime = segmentRecords[segmentRecords.length - 1].timestamp;
      const actualTime = (endTime.getTime() - startTime.getTime()) / 1000 / 60; // minutes

      const actualPace = actualTime / segmentDistance;
      const plannedPace = segment.custom_pace_min_per_mile || 10; // default 10 min/mile

      // Calculate physiological metrics
      const heartRates = segmentRecords
        .map((r) => r.heartRate)
        .filter((hr): hr is number => hr !== undefined && hr > 0);

      const avgHeartRate =
        heartRates.length > 0 ? heartRates.reduce((a, b) => a + b, 0) / heartRates.length : 0;

      const maxHeartRate = heartRates.length > 0 ? Math.max(...heartRates) : 0;

      // Calculate elevation metrics for this segment
      const elevations = segmentRecords
        .map((r) => r.elevation)
        .filter((e): e is number => e !== undefined);

      const elevationGain = calculateElevationGain(elevations);
      const elevationLoss = calculateElevationLoss(elevations);
      const avgGrade =
        segmentDistance > 0
          ? ((elevationGain - elevationLoss) / (segmentDistance * 5280)) * 100
          : 0;

      // Calculate fatigue index based on pace degradation
      const expectedPaceWithFatigue = plannedPace * (1 + index * 0.02); // 2% degradation per segment
      const fatigueIndex =
        expectedPaceWithFatigue > 0
          ? ((actualPace - expectedPaceWithFatigue) / expectedPaceWithFatigue) * 100
          : 0;

      // Calculate cadence if available
      const cadences = segmentRecords
        .map((r) => (r as any).cadence)
        .filter((c): c is number => c !== undefined && c > 0);
      const avgCadence =
        cadences.length > 0 ? cadences.reduce((a, b) => a + b, 0) / cadences.length : undefined;

      // Calculate power if available
      const powers = segmentRecords
        .map((r) => (r as any).power)
        .filter((p): p is number => p !== undefined && p > 0);
      const avgPower =
        powers.length > 0 ? powers.reduce((a, b) => a + b, 0) / powers.length : undefined;

      // Calculate temperature if available
      const temperatures = segmentRecords
        .map((r) => (r as any).temperature)
        .filter((t): t is number => t !== undefined);
      const avgTemperature =
        temperatures.length > 0
          ? temperatures.reduce((a, b) => a + b, 0) / temperatures.length
          : undefined;

      // Calculate GAP (Grade Adjusted Pace) for this segment
      const gapAnalysis = calculateSegmentGAP(fitData.records, startDistance, endDistance);

      // Calculate Planned GAP (based on planned pace and average gradient)
      const plannedGAP = avgGrade !== 0 ? calculateGAP(plannedPace, avgGrade) : plannedPace;

      return {
        segmentIndex: index,
        checkpointName: segment.checkpoint_name,
        segmentDistance,
        cumulativeDistance: segment.cumulative_distance_miles,
        plannedTime: segmentDistance * plannedPace,
        actualTime,
        timeDifference: actualTime - segmentDistance * plannedPace,
        plannedPace,
        actualPace,
        paceVariance: plannedPace > 0 ? ((actualPace - plannedPace) / plannedPace) * 100 : 0,
        // GAP metrics
        avgGAP: gapAnalysis?.avgGAP,
        plannedGAP,
        gapVariance: gapAnalysis?.gapVariance,
        effortLevel: determineEffortLevel(avgHeartRate),
        fatigueIndex,
        avgHeartRate,
        maxHeartRate,
        avgCadence,
        avgPower,
        elevationGain,
        elevationLoss,
        avgGrade,
        temperature: avgTemperature,
      };
    });

  return splits.filter((split): split is CheckpointSplitAnalysis => split !== null);
}

/**
 * Calculate comprehensive race analytics
 */
export function calculateRaceAnalytics(
  _plannedRace: any,
  actualFitData: ParsedFITData,
  segments: Segment[]
): any {
  const splits = calculateSplitAnalysis(segments, actualFitData);

  if (splits.length === 0) {
    return null;
  }

  // Calculate overall metrics
  const actualFinishTime = actualFitData.totalTime;
  const totalPlannedTime = splits.reduce((sum, split) => sum + split.plannedTime, 0) * 60; // convert to seconds
  const timeDifference = actualFinishTime - totalPlannedTime;

  const avgPace =
    splits.length > 0 ? splits.reduce((sum, s) => sum + s.actualPace, 0) / splits.length : 0;

  const avgPlannedPace =
    splits.length > 0 ? splits.reduce((sum, s) => sum + s.plannedPace, 0) / splits.length : 0;

  const paceVariance = avgPlannedPace > 0 ? ((avgPace - avgPlannedPace) / avgPlannedPace) * 100 : 0;

  const avgHeartRate =
    splits.length > 0 ? splits.reduce((sum, s) => sum + s.avgHeartRate, 0) / splits.length : 0;

  // Calculate heart rate zone (simplified)
  const avgHRZone = Math.min(5, Math.max(1, Math.floor((avgHeartRate / 190) * 5) + 1));

  // Calculate efficiency score (0-100)
  // Based on how close to plan, pacing consistency, and HR management
  const paceScore = Math.max(0, 100 - Math.abs(paceVariance));
  const consistencyScore = calculatePacingConsistencyScore(splits);
  const efficiencyScore = Math.round((paceScore + consistencyScore) / 2);

  const efficiencyGrade =
    efficiencyScore >= 90 ? 'A' :
    efficiencyScore >= 80 ? 'B' :
    efficiencyScore >= 70 ? 'C' :
    efficiencyScore >= 60 ? 'D' : 'F';

  // Check for negative split
  const firstHalfPace =
    splits.slice(0, Math.floor(splits.length / 2)).reduce((sum, s) => sum + s.actualPace, 0) /
    Math.floor(splits.length / 2);
  const secondHalfPace =
    splits.slice(Math.floor(splits.length / 2)).reduce((sum, s) => sum + s.actualPace, 0) /
    Math.ceil(splits.length / 2);
  const negativeSplit = secondHalfPace < firstHalfPace;

  // Calculate pacing consistency
  const paceStdDev = calculateStandardDeviation(splits.map((s) => s.actualPace));
  const pacingConsistency =
    paceStdDev < 0.5 ? 'Excellent' :
    paceStdDev < 1.0 ? 'Good' :
    paceStdDev < 1.5 ? 'Fair' : 'Poor';

  // Calculate fade rate
  const fadeRate = calculateFadeRate(splits);

  // Generate insights
  const insights = generatePerformanceInsights(splits, {
    paceVariance,
    fadeRate,
    negativeSplit,
    avgHeartRate,
  });

  return {
    actualFinishTime,
    timeDifference,
    avgPace,
    paceVariance,
    avgHeartRate,
    avgHRZone,
    efficiencyScore,
    efficiencyGrade,
    negativeSplit,
    pacingConsistency,
    fadeRate,
    splits,
    insights,
  };
}

function calculatePacingConsistencyScore(splits: CheckpointSplitAnalysis[]): number {
  if (splits.length < 2) return 100;

  const paces = splits.map((s) => s.actualPace);
  const stdDev = calculateStandardDeviation(paces);
  const avgPace = paces.reduce((a, b) => a + b, 0) / paces.length;
  const coefficientOfVariation = (stdDev / avgPace) * 100;

  // Lower CV = higher consistency score
  return Math.max(0, 100 - coefficientOfVariation * 10);
}

function calculateStandardDeviation(values: number[]): number {
  const avg = values.reduce((a, b) => a + b, 0) / values.length;
  const squareDiffs = values.map((value) => Math.pow(value - avg, 2));
  const avgSquareDiff = squareDiffs.reduce((a, b) => a + b, 0) / squareDiffs.length;
  return Math.sqrt(avgSquareDiff);
}

function calculateFadeRate(splits: CheckpointSplitAnalysis[]): number {
  if (splits.length < 2) return 0;

  const firstPace = splits[0].actualPace;
  const lastPace = splits[splits.length - 1].actualPace;
  const totalTime = splits.reduce((sum, s) => sum + s.actualTime, 0) / 60; // hours

  if (totalTime === 0 || firstPace === 0 || !isFinite(firstPace) || !isFinite(lastPace)) return 0;

  return ((lastPace - firstPace) / firstPace) * 100 / totalTime;
}

function generatePerformanceInsights(
  splits: CheckpointSplitAnalysis[],
  metrics: {
    paceVariance: number;
    fadeRate: number;
    negativeSplit: boolean;
    avgHeartRate: number;
  }
): any[] {
  const insights: any[] = [];

  // Pacing insights
  if (metrics.fadeRate > 5) {
    insights.push({
      type: 'pacing',
      priority: 'high',
      message: 'Significant pace degradation detected',
      recommendation: 'Consider starting more conservatively to maintain energy',
      details: `Your pace dropped by ${metrics.fadeRate.toFixed(1)}% per hour`,
    });
  }

  if (!metrics.negativeSplit && splits.length > 4) {
    insights.push({
      type: 'strategy',
      priority: 'medium',
      message: 'Positive split pacing strategy',
      recommendation: 'Try maintaining consistent effort for better overall time',
      details: 'You started faster than you finished',
    });
  }

  // Nutrition insights
  const largePaceVariances = splits.filter((s) => Math.abs(s.paceVariance) > 20);
  if (largePaceVariances.length > splits.length * 0.3) {
    insights.push({
      type: 'nutrition',
      priority: 'medium',
      message: 'Inconsistent pacing suggests energy management issues',
      recommendation: 'Review nutrition strategy for more consistent energy',
      details: `${largePaceVariances.length} segments had >20% pace variance`,
    });
  }

  // Heart rate insights
  if (metrics.avgHeartRate > 165) {
    insights.push({
      type: 'training',
      priority: 'medium',
      message: 'High average heart rate for ultra distance',
      recommendation: 'Consider more aerobic base training',
      details: `Average HR: ${Math.round(metrics.avgHeartRate)} bpm`,
    });
  }

  // Recovery insights
  const highFatigueSegments = splits.filter((s) => s.fatigueIndex > 10);
  if (highFatigueSegments.length > 0) {
    insights.push({
      type: 'recovery',
      priority: 'low',
      message: 'Fatigue accumulated in later segments',
      recommendation: 'Focus on recovery strategies and checkpoint rest times',
      details: `${highFatigueSegments.length} segments showed elevated fatigue`,
    });
  }

  return insights;
}

/**
 * Determine available metrics from FIT data
 */
export function getAvailableMetrics(fitData: ParsedFITData | null): string[] {
  if (!fitData || !fitData.records || fitData.records.length === 0) {
    return ['showElevation'];
  }

  const metrics = ['showElevation', 'showSplits'];
  const firstRecord = fitData.records[0];

  if (firstRecord.heartRate !== undefined) {
    metrics.push('showHeartRate', 'showHeartRateZones');
  }

  if (firstRecord.pace !== undefined || firstRecord.speed !== undefined) {
    metrics.push('showPace', 'showPaceZones');
  }

  if ((firstRecord as any).power !== undefined) {
    metrics.push('showPower');
  }

  if ((firstRecord as any).cadence !== undefined) {
    metrics.push('showCadence');
  }

  if ((firstRecord as any).temperature !== undefined) {
    metrics.push('showTemperature');
  }

  return metrics;
}
