/**
 * GI Distress Prediction Utility
 *
 * Predicts gastrointestinal distress risk based on multiple factors.
 *
 * Research basis:
 * - Most athletes tolerate 60-90g carbs/hour
 * - Heat reduces GI tolerance (blood flow diverts to skin for cooling)
 * - High intensity reduces GI tolerance (blood flow diverts to muscles)
 * - Cumulative carb load can overwhelm gut capacity
 * - Product variety can help prevent flavor fatigue
 * - Individual tolerance varies significantly
 */

import type { NutritionItem, GIDistressAssessment } from '../../shared/types';

// ============================================
// CONSTANTS
// ============================================

/** Standard carb tolerance in g/hr for trained athletes */
const STANDARD_CARB_TOLERANCE = 60;

/** Upper limit for carb tolerance with gut training */
const TRAINED_CARB_TOLERANCE = 90;

/** Maximum carb rate even with excellent gut training */
const MAX_CARB_TOLERANCE = 120;

/** Temperature in F where GI risk starts increasing */
const HEAT_THRESHOLD_F = 75;

/** Temperature in F for high heat risk */
const HIGH_HEAT_THRESHOLD_F = 85;

// ============================================
// RISK ASSESSMENT
// ============================================

export interface GIRiskFactors {
  carbsPerHour: number;
  cumulativeCarbLoad: number;
  temperatureF: number | null;
  paceIntensity: 'easy' | 'moderate' | 'hard' | 'race';
  productVariety: number; // number of unique products
  segmentTimeHours: number;
  hasKnownIntolerances?: boolean;
}

/**
 * Assess GI distress risk based on multiple factors
 *
 * Risk factors weighted:
 * - Carb concentration: 40 points max
 * - Cumulative load: 20 points max
 * - Temperature: 20 points max
 * - Intensity: 15 points max
 * - Product variety: 10 points max
 *
 * @param factors - GI risk factors to assess
 * @returns Complete GI distress assessment
 */
export function assessGIRisk(factors: GIRiskFactors): GIDistressAssessment {
  let riskScore = 0;
  const riskFactors: string[] = [];
  const recommendations: string[] = [];

  // Factor 1: Carb concentration (40 points max)
  if (factors.carbsPerHour > MAX_CARB_TOLERANCE) {
    riskScore += 40;
    riskFactors.push(`Very high carb rate: ${factors.carbsPerHour.toFixed(0)}g/hr (max tolerable ~90-120g/hr)`);
    recommendations.push('Reduce carb intake rate or spread over longer time');
  } else if (factors.carbsPerHour > TRAINED_CARB_TOLERANCE) {
    riskScore += 25;
    riskFactors.push(`High carb rate: ${factors.carbsPerHour.toFixed(0)}g/hr`);
    recommendations.push('Consider whether gut is trained for this intake rate');
  } else if (factors.carbsPerHour > STANDARD_CARB_TOLERANCE + 10) {
    riskScore += 10;
  }

  // Factor 2: Cumulative carb load (20 points max)
  if (factors.cumulativeCarbLoad > 600) {
    riskScore += 20;
    riskFactors.push(`High cumulative carbs: ${factors.cumulativeCarbLoad.toFixed(0)}g total`);
  } else if (factors.cumulativeCarbLoad > 400) {
    riskScore += 10;
  }

  // Factor 3: Temperature (20 points max)
  if (factors.temperatureF !== null) {
    if (factors.temperatureF > HIGH_HEAT_THRESHOLD_F) {
      riskScore += 20;
      riskFactors.push(`High temperature (${factors.temperatureF}°F) reduces GI tolerance`);
      recommendations.push('Hot conditions: reduce carb concentration by 10-20%');
    } else if (factors.temperatureF > HEAT_THRESHOLD_F) {
      const tempFactor = ((factors.temperatureF - HEAT_THRESHOLD_F) / 10) * 10;
      riskScore += Math.min(15, tempFactor);
      if (factors.temperatureF > 80) {
        riskFactors.push(`Warm temperature (${factors.temperatureF}°F)`);
      }
    }
  }

  // Factor 4: Pace intensity (15 points max)
  switch (factors.paceIntensity) {
    case 'race':
    case 'hard':
      riskScore += 15;
      riskFactors.push('High intensity reduces GI tolerance');
      recommendations.push('Slow down at aid stations to improve digestion');
      break;
    case 'moderate':
      riskScore += 5;
      break;
    case 'easy':
    default:
      // No additional risk
      break;
  }

  // Factor 5: Product variety (10 points max)
  if (factors.productVariety === 1 && factors.segmentTimeHours > 2) {
    riskScore += 10;
    riskFactors.push('Low variety - flavor fatigue risk');
    recommendations.push('Add variety: mix sweet/savory, liquid/solid');
  } else if (factors.productVariety < 2 && factors.segmentTimeHours > 3) {
    riskScore += 5;
  }

  // Factor 6: Known intolerances (bonus risk)
  if (factors.hasKnownIntolerances) {
    riskScore += 15;
    riskFactors.push('Contains products with known intolerance history');
    recommendations.push('Consider swapping problematic products');
  }

  // Determine risk level
  let riskLevel: GIDistressAssessment['riskLevel'];
  if (riskScore < 20) {
    riskLevel = 'low';
  } else if (riskScore < 40) {
    riskLevel = 'moderate';
  } else if (riskScore < 60) {
    riskLevel = 'high';
  } else {
    riskLevel = 'very-high';
  }

  // Add general recommendations for high risk
  if (riskScore > 50) {
    recommendations.push('Test this nutrition strategy in long training runs first');
  }

  // Calculate tolerance percentage (how close to max tolerable)
  const tolerancePercentage = Math.min(150, (factors.carbsPerHour / TRAINED_CARB_TOLERANCE) * 100);

  return {
    riskLevel,
    riskScore: Math.min(100, riskScore),
    riskFactors,
    recommendations,
    tolerancePercentage
  };
}

/**
 * Calculate GI risk factors from nutrition items and segment data
 */
export function calculateGIRiskFactors(
  nutritionItems: NutritionItem[],
  segmentTimeHours: number,
  cumulativeCarbs: number,
  temperatureF: number | null = null,
  paceIntensity: GIRiskFactors['paceIntensity'] = 'moderate',
  hasKnownIntolerances: boolean = false
): GIRiskFactors {
  const totalCarbs = nutritionItems.reduce(
    (sum, item) => sum + (item.carbsPerServing * item.quantity),
    0
  );

  const carbsPerHour = segmentTimeHours > 0 ? totalCarbs / segmentTimeHours : 0;
  const uniqueProducts = new Set(nutritionItems.map(item => item.productName)).size;

  return {
    carbsPerHour,
    cumulativeCarbLoad: cumulativeCarbs + totalCarbs,
    temperatureF,
    paceIntensity,
    productVariety: uniqueProducts,
    segmentTimeHours,
    hasKnownIntolerances
  };
}

// ============================================
// UI HELPERS
// ============================================

/**
 * Get color classes for GI risk level
 */
export function getGIRiskColors(riskLevel: GIDistressAssessment['riskLevel']): {
  bg: string;
  border: string;
  text: string;
  icon: string;
} {
  switch (riskLevel) {
    case 'low':
      return {
        bg: 'bg-green-50 dark:bg-green-900/20',
        border: 'border-green-200 dark:border-green-800',
        text: 'text-green-700 dark:text-green-300',
        icon: 'text-green-500'
      };
    case 'moderate':
      return {
        bg: 'bg-yellow-50 dark:bg-yellow-900/20',
        border: 'border-yellow-200 dark:border-yellow-800',
        text: 'text-yellow-700 dark:text-yellow-300',
        icon: 'text-yellow-500'
      };
    case 'high':
      return {
        bg: 'bg-orange-50 dark:bg-orange-900/20',
        border: 'border-orange-200 dark:border-orange-800',
        text: 'text-orange-700 dark:text-orange-300',
        icon: 'text-orange-500'
      };
    case 'very-high':
      return {
        bg: 'bg-red-50 dark:bg-red-900/20',
        border: 'border-red-200 dark:border-red-800',
        text: 'text-red-700 dark:text-red-300',
        icon: 'text-red-500'
      };
    default:
      return {
        bg: 'bg-gray-50 dark:bg-gray-900/20',
        border: 'border-gray-200 dark:border-gray-800',
        text: 'text-gray-700 dark:text-gray-300',
        icon: 'text-gray-500'
      };
  }
}

/**
 * Get progress bar color for carb tolerance
 */
export function getToleranceBarColor(percentage: number): string {
  if (percentage > 120) return 'bg-red-500';
  if (percentage > 100) return 'bg-orange-500';
  if (percentage > 80) return 'bg-yellow-500';
  return 'bg-green-500';
}

/**
 * Get human-readable risk level label
 */
export function getGIRiskLabel(riskLevel: GIDistressAssessment['riskLevel']): string {
  switch (riskLevel) {
    case 'low': return 'Low Risk';
    case 'moderate': return 'Moderate Risk';
    case 'high': return 'High Risk';
    case 'very-high': return 'Very High Risk';
    default: return 'Unknown';
  }
}

/**
 * Determine pace intensity from pace and context
 */
export function determinePaceIntensity(
  paceMinPerMile: number,
  _totalDistanceMiles: number,
  _cumulativeDistanceMiles: number
): GIRiskFactors['paceIntensity'] {
  // Faster paces indicate higher intensity
  if (paceMinPerMile < 8) return 'race';
  if (paceMinPerMile < 10) return 'hard';
  if (paceMinPerMile < 13) return 'moderate';
  return 'easy';
}

// ============================================
// GUT TRAINING PLAN
// ============================================

export interface GutTrainingWeek {
  week: number;
  carbRate: number; // g/hr target
  duration: string; // e.g., "2-3 hours"
  focus: string;
}

export interface GutTrainingPlan {
  currentWeek: number;
  targetCarbRate: number;
  weeklyProgression: GutTrainingWeek[];
  tips: string[];
}

/**
 * Generate a gut training plan for progressive carb tolerance building
 *
 * @param currentTolerance - Current comfortable carb rate (g/hr)
 * @param targetRate - Goal carb rate for race (g/hr)
 * @param weeksUntilRace - Weeks available for training
 * @returns Gut training plan
 */
export function generateGutTrainingPlan(
  currentTolerance: number,
  targetRate: number,
  weeksUntilRace: number
): GutTrainingPlan {
  const weeklyProgression: GutTrainingWeek[] = [];
  const increment = (targetRate - currentTolerance) / Math.max(1, weeksUntilRace - 1);

  for (let week = 0; week < weeksUntilRace; week++) {
    const weekNum = week + 1;
    const carbRate = Math.round(currentTolerance + (increment * week));

    let duration: string;
    let focus: string;

    if (week < 4) {
      duration = '2-3 hours';
      focus = 'Build base tolerance with easy runs';
    } else if (week < 8) {
      duration = '3-4 hours';
      focus = 'Increase duration, maintain carb rate';
    } else {
      duration = '4-6 hours';
      focus = 'Race simulation with full nutrition';
    }

    weeklyProgression.push({
      week: weekNum,
      carbRate,
      duration,
      focus
    });
  }

  const tips = [
    'Practice race nutrition on long runs',
    'Mix different carb sources (fructose + glucose absorbs better)',
    'Train your gut like you train your legs - progressive overload',
    'Start with liquids/gels, progress to real food later in training',
    'Stay consistent - gut adaptation takes 2-4 weeks',
    'Test products in training, not on race day'
  ];

  return {
    currentWeek: 1,
    targetCarbRate: targetRate,
    weeklyProgression,
    tips
  };
}
