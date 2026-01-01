/**
 * Caffeine Recommendations Utility
 * Calculate safe and effective caffeine intake for ultra endurance events
 *
 * Research basis:
 * - FDA: Max 400mg/day for healthy adults
 * - Sports science: 3-6 mg/kg body weight is optimal for endurance performance
 * - Ultra-specific: Lower doses (1-3 mg/kg) work well due to extended duration
 */

import type { CaffeineRecommendation } from '../../shared/types';

/**
 * Caffeine status categories
 */
export type CaffeineStatus = 'none' | 'low' | 'optimal' | 'high' | 'excessive';

export interface CaffeineStatusResult {
  status: CaffeineStatus;
  message: string;
  color: string; // Tailwind color class
}

/**
 * Get caffeine recommendation based on body weight and race duration
 *
 * @param bodyWeightKg - Athlete body weight in kg
 * @param raceDurationHours - Estimated race duration in hours
 * @returns CaffeineRecommendation with dosing strategy
 */
export function getCaffeineRecommendation(
  bodyWeightKg: number,
  raceDurationHours: number
): CaffeineRecommendation {
  // Research: 3-6mg/kg is optimal for endurance
  // For ultras, we use a conservative 4mg/kg total
  const recommendedTotal = bodyWeightKg * 4;

  // Max single dose of 200mg, split into reasonable doses
  const recommendedPerDose = Math.min(200, recommendedTotal / 3);
  const dosesRecommended = Math.ceil(recommendedTotal / recommendedPerDose);

  // Timing recommendations based on race duration
  const timing: string[] = [];

  if (raceDurationHours <= 4) {
    timing.push('Pre-race: 30-60 min before start');
    timing.push('Mid-race: Optional small dose around halfway');
  } else if (raceDurationHours <= 8) {
    timing.push('Pre-race: 30-60 min before start');
    timing.push('Early-race: Around 25% of race distance');
    timing.push('Mid-race: Around 50% of race distance');
  } else if (raceDurationHours <= 16) {
    timing.push('Pre-race: 30-60 min before start (optional)');
    timing.push('Early-race: Around 20-30% of race distance');
    timing.push('Mid-race: Around 50% when fatigue hits');
    timing.push('Late-race: Around 70% for final push');
  } else {
    // 100+ milers
    timing.push('Save caffeine for when you really need it');
    timing.push('First dose: When nighttime arrives or fatigue sets in');
    timing.push('Second dose: Early morning hours if running through night');
    timing.push('Final dose: Last 20-30 miles for finish push');
  }

  // Generate warnings
  const warnings: string[] = [];

  if (recommendedTotal > 600) {
    warnings.push('High total dose - test this strategy in training first');
  }

  if (raceDurationHours > 24) {
    warnings.push('For 100+ miles: Consider caffeine-free periods to maintain effectiveness');
  }

  warnings.push('Avoid caffeine in last 20% of race if running into night (may affect post-race sleep)');
  warnings.push('Individual tolerance varies - test your caffeine strategy in training');

  return {
    recommendedTotal: Math.round(recommendedTotal),
    recommendedPerDose: Math.round(recommendedPerDose),
    dosesRecommended,
    timing,
    warnings
  };
}

/**
 * Get caffeine status based on current intake vs recommendations
 */
export function getCaffeineStatus(
  totalCaffeineMg: number,
  bodyWeightKg: number,
  _raceDurationHours: number
): CaffeineStatusResult {
  // If no body weight, use general thresholds
  const effectiveWeight = bodyWeightKg > 0 ? bodyWeightKg : 70;

  const mgPerKg = totalCaffeineMg / effectiveWeight;
  // perHour can be used for hourly rate assessment
  // const perHour = raceDurationHours > 0 ? totalCaffeineMg / raceDurationHours : totalCaffeineMg;

  if (totalCaffeineMg === 0) {
    return {
      status: 'none',
      message: 'No caffeine planned',
      color: 'text-gray-500'
    };
  }

  // Check per-kg thresholds
  if (mgPerKg > 9) {
    return {
      status: 'excessive',
      message: `Very high caffeine (${mgPerKg.toFixed(1)} mg/kg) - may cause jitters, GI issues, or anxiety`,
      color: 'text-red-600'
    };
  }

  if (mgPerKg > 6) {
    return {
      status: 'high',
      message: `High caffeine (${mgPerKg.toFixed(1)} mg/kg) - monitor for side effects`,
      color: 'text-orange-600'
    };
  }

  if (mgPerKg >= 3 && mgPerKg <= 6) {
    return {
      status: 'optimal',
      message: `Optimal caffeine range (${mgPerKg.toFixed(1)} mg/kg) for performance`,
      color: 'text-green-600'
    };
  }

  if (mgPerKg >= 1) {
    return {
      status: 'low',
      message: `Low-moderate caffeine (${mgPerKg.toFixed(1)} mg/kg) - may not provide full benefit`,
      color: 'text-blue-600'
    };
  }

  return {
    status: 'low',
    message: `Minimal caffeine (${mgPerKg.toFixed(1)} mg/kg)`,
    color: 'text-gray-600'
  };
}

/**
 * Get status color for progress bar
 */
export function getCaffeineProgressColor(
  totalCaffeineMg: number,
  bodyWeightKg: number
): string {
  const effectiveWeight = bodyWeightKg > 0 ? bodyWeightKg : 70;
  const mgPerKg = totalCaffeineMg / effectiveWeight;

  if (mgPerKg === 0) return 'bg-gray-300';
  if (mgPerKg > 9) return 'bg-red-500';
  if (mgPerKg > 6) return 'bg-orange-500';
  if (mgPerKg >= 3) return 'bg-green-500';
  return 'bg-blue-400';
}

/**
 * Calculate recommended caffeine timing for a specific segment
 * Returns whether caffeine should be consumed in this segment
 */
export function shouldConsumeCaffeineInSegment(
  _segmentIndex: number,
  _totalSegments: number,
  cumulativeDistanceMiles: number,
  totalDistanceMiles: number,
  _cumulativeTimeHours: number,
  isNighttime: boolean,
  currentCaffeineMg: number,
  bodyWeightKg: number
): { recommended: boolean; reason: string } {
  const percentComplete = (cumulativeDistanceMiles / totalDistanceMiles) * 100;
  const maxCaffeine = bodyWeightKg > 0 ? bodyWeightKg * 6 : 400;

  // Don't recommend if already at max
  if (currentCaffeineMg >= maxCaffeine) {
    return {
      recommended: false,
      reason: 'Already at maximum recommended caffeine intake'
    };
  }

  // Recommend during nighttime running
  if (isNighttime && currentCaffeineMg < maxCaffeine * 0.75) {
    return {
      recommended: true,
      reason: 'Night running - caffeine helps maintain alertness'
    };
  }

  // Recommend at strategic points
  if (percentComplete >= 45 && percentComplete <= 55 && currentCaffeineMg < maxCaffeine * 0.5) {
    return {
      recommended: true,
      reason: 'Mid-race boost - good time for caffeine'
    };
  }

  if (percentComplete >= 70 && percentComplete <= 80 && currentCaffeineMg < maxCaffeine * 0.75) {
    return {
      recommended: true,
      reason: 'Late-race push - caffeine can help with finish'
    };
  }

  // Avoid in final 10% (sleep considerations)
  if (percentComplete >= 90) {
    return {
      recommended: false,
      reason: 'Close to finish - avoid caffeine for post-race recovery'
    };
  }

  return {
    recommended: false,
    reason: 'No specific caffeine recommendation for this segment'
  };
}

/**
 * Get caffeine half-life information
 * Caffeine half-life is ~5-6 hours in most adults
 */
export function getCaffeineHalfLifeNote(lastDoseHoursAgo: number): string {
  if (lastDoseHoursAgo < 1) {
    return 'Caffeine just consumed - peak effect in 30-60 minutes';
  }
  if (lastDoseHoursAgo < 3) {
    return 'Caffeine at peak effectiveness';
  }
  if (lastDoseHoursAgo < 5) {
    return 'Caffeine still effective - about half metabolized';
  }
  if (lastDoseHoursAgo < 8) {
    return 'Caffeine wearing off - consider redosing if needed';
  }
  return 'Previous caffeine mostly metabolized';
}
