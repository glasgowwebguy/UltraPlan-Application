/**
 * Energy Balance & Bonk Prevention Utility
 *
 * Models caloric expenditure and glycogen depletion to predict bonk risk.
 *
 * Research basis:
 * - Minetti et al. (2002): Energy cost of walking/running on various gradients
 * - Average trained athlete: ~500g glycogen storage (liver + muscle) = ~2000 kcal
 * - Fat oxidation increases with duration (metabolic shift)
 * - Running economy: ~0.9-1.1 kcal/kg/km depending on speed and terrain
 */

import type {
  NutritionItem,
  Segment,
  EnergyBalanceCalculation,
  AthleteMetricsForEnergy
} from '../../shared/types';

// ============================================
// CONSTANTS
// ============================================

/** Initial glycogen stores for a well-trained, carb-loaded athlete (grams) */
const INITIAL_GLYCOGEN_GRAMS = 500;

/** Calories per gram of carbohydrate */
const KCAL_PER_GRAM_CARB = 4;

/** Calories per gram of fat (available for advanced calculations) */
// const KCAL_PER_GRAM_FAT = 9;

/** Base calorie cost per km for a 70kg runner on flat terrain */
const BASE_KCAL_PER_KM_PER_70KG = 60;

/** Extra calorie cost per 100ft of elevation gain per 70kg */
const KCAL_PER_100FT_GAIN_PER_70KG = 10;

/** Calorie cost of descent (eccentric work) - ~40% of climbing cost */
const DESCENT_COST_FACTOR = 0.4;

// ============================================
// CALORIE CALCULATIONS
// ============================================

/**
 * Calculate calories burned for a segment
 *
 * Based on Minetti et al. and running economy research:
 * - Base: ~60 kcal/km for 70kg runner
 * - Climbing: ~10 kcal per 100ft gain per 70kg
 * - Descent: ~4 kcal per 100ft loss per 70kg (eccentric work)
 * - Intensity: faster pace is less efficient
 *
 * @param distanceMiles - Segment distance in miles
 * @param elevationGainFeet - Elevation gain in feet
 * @param elevationLossFeet - Elevation loss in feet
 * @param paceMinPerMile - Pace in minutes per mile
 * @param athleteMetrics - Athlete body and gear weight
 * @returns Estimated calories burned
 */
export function calculateCaloriesBurned(
  distanceMiles: number,
  elevationGainFeet: number,
  elevationLossFeet: number,
  paceMinPerMile: number,
  athleteMetrics: AthleteMetricsForEnergy
): number {
  const { bodyWeightKg, gearWeightKg = 0 } = athleteMetrics;
  const totalWeightKg = bodyWeightKg + gearWeightKg;

  // Convert miles to km
  const distanceKm = distanceMiles * 1.60934;

  // Base calories from running (flat terrain)
  // Scale by weight relative to 70kg reference
  const weightMultiplier = totalWeightKg / 70;
  const baseCalories = BASE_KCAL_PER_KM_PER_70KG * distanceKm * weightMultiplier;

  // Elevation gain cost
  const climbCalories = (elevationGainFeet / 100) * KCAL_PER_100FT_GAIN_PER_70KG * weightMultiplier;

  // Elevation loss cost (eccentric muscle work)
  const descentCalories = (elevationLossFeet / 100) * KCAL_PER_100FT_GAIN_PER_70KG * DESCENT_COST_FACTOR * weightMultiplier;

  // Pace intensity multiplier
  // Faster running is less efficient, very slow running/hiking is more efficient
  const speedKmh = 60 / (paceMinPerMile * 1.60934);
  let intensityMultiplier = 1.0;
  if (speedKmh > 12) {
    // Fast running: less efficient
    intensityMultiplier = 1.1;
  } else if (speedKmh > 10) {
    intensityMultiplier = 1.05;
  } else if (speedKmh < 6) {
    // Very slow/hiking: slightly more efficient
    intensityMultiplier = 0.95;
  }

  return (baseCalories + climbCalories + descentCalories) * intensityMultiplier;
}

/**
 * Calculate calories consumed from nutrition items
 * Carbohydrates provide 4 kcal per gram
 *
 * @param nutritionItems - Array of nutrition items
 * @returns Total calories from carbohydrates
 */
export function calculateCaloriesConsumed(nutritionItems: NutritionItem[]): number {
  return nutritionItems.reduce((total, item) => {
    return total + (item.carbsPerServing * item.quantity * KCAL_PER_GRAM_CARB);
  }, 0);
}

// ============================================
// GLYCOGEN MODELING
// ============================================

/**
 * Model glycogen depletion over the course of a race
 *
 * Key concepts:
 * - Average trained athlete: ~500g glycogen (2000 kcal)
 * - Fat oxidation rate increases with duration and lower intensity
 * - At ultra pace, roughly 50-70% of energy comes from fat after first 90 min
 * - Consumed carbs replenish glycogen (~80% efficiency due to absorption/storage)
 *
 * @param cumulativeCaloriesBurned - Total calories burned so far
 * @param cumulativeCaloriesConsumed - Total calories consumed from nutrition
 * @param cumulativeDistanceMiles - Total distance covered
 * @param cumulativeTimeHours - Total race time in hours
 * @returns Glycogen status
 */
export function calculateGlycogenStatus(
  cumulativeCaloriesBurned: number,
  cumulativeCaloriesConsumed: number,
  cumulativeDistanceMiles: number,
  cumulativeTimeHours: number
): { glycogenRemaining: number; percentRemaining: number } {
  const initialGlycogenKcal = INITIAL_GLYCOGEN_GRAMS * KCAL_PER_GRAM_CARB;

  // Fat oxidation rate increases with duration
  // Start at 30% fat, increase to 70% over 50+ miles
  const baselineFatRate = 0.30;
  const distanceFactor = Math.min(0.40, (cumulativeDistanceMiles / 100) * 0.40);
  const timeFactor = Math.min(0.10, (cumulativeTimeHours / 12) * 0.10);
  const fatOxidationRate = Math.min(0.70, baselineFatRate + distanceFactor + timeFactor);

  // Calories from glycogen = total burned * (1 - fat oxidation rate)
  const glycogenCaloriesBurned = cumulativeCaloriesBurned * (1 - fatOxidationRate);

  // Carbs consumed replenish glycogen (not 100% efficient, ~80%)
  const glycogenReplenishedKcal = cumulativeCaloriesConsumed * 0.80;

  // Calculate remaining glycogen
  const glycogenKcalRemaining = Math.max(0, initialGlycogenKcal - glycogenCaloriesBurned + glycogenReplenishedKcal);
  const glycogenGramsRemaining = glycogenKcalRemaining / KCAL_PER_GRAM_CARB;
  const percentRemaining = (glycogenGramsRemaining / INITIAL_GLYCOGEN_GRAMS) * 100;

  return {
    glycogenRemaining: glycogenGramsRemaining,
    percentRemaining: Math.min(100, Math.max(0, percentRemaining))
  };
}

/**
 * Determine bonk risk level based on glycogen percentage
 */
export function getBonkRiskLevel(glycogenPercent: number): EnergyBalanceCalculation['bonkRisk'] {
  if (glycogenPercent < 15) return 'critical';
  if (glycogenPercent < 25) return 'high';
  if (glycogenPercent < 40) return 'moderate';
  if (glycogenPercent < 60) return 'low';
  return 'none';
}

/**
 * Determine segment-level risk based on calorie deficit
 * A segment with 0 carbs consumed but high calories burned is risky
 * even if cumulative glycogen is still healthy
 */
export function getSegmentDeficitRisk(
  segmentCaloriesBurned: number,
  segmentCaloriesConsumed: number
): EnergyBalanceCalculation['bonkRisk'] {
  const deficit = segmentCaloriesConsumed - segmentCaloriesBurned;

  // If burning significant calories with zero intake, that's always risky
  if (segmentCaloriesConsumed === 0 && segmentCaloriesBurned > 400) {
    return 'high';
  }
  if (segmentCaloriesConsumed === 0 && segmentCaloriesBurned > 200) {
    return 'moderate';
  }

  // Large deficit (more than 500 kcal negative)
  if (deficit < -500) return 'high';
  // Moderate deficit (more than 400 kcal negative)  
  if (deficit < -400) return 'moderate';
  // Mild deficit (more than 300 kcal negative)
  if (deficit < -300) return 'low';

  return 'none';
}

/**
 * Combine glycogen-based risk with segment-deficit risk
 * Returns the higher of the two risks
 */
export function getCombinedRisk(
  glycogenRisk: EnergyBalanceCalculation['bonkRisk'],
  segmentDeficitRisk: EnergyBalanceCalculation['bonkRisk']
): EnergyBalanceCalculation['bonkRisk'] {
  const riskOrder: EnergyBalanceCalculation['bonkRisk'][] = ['none', 'low', 'moderate', 'high', 'critical'];
  const glycogenIndex = riskOrder.indexOf(glycogenRisk);
  const deficitIndex = riskOrder.indexOf(segmentDeficitRisk);
  return riskOrder[Math.max(glycogenIndex, deficitIndex)];
}

/**
 * Estimate time until glycogen depletion (bonk)
 *
 * @param glycogenGramsRemaining - Current glycogen in grams
 * @param currentBurnRateKcalPerHour - Current calorie burn rate
 * @param currentIntakeRateKcalPerHour - Current calorie intake rate
 * @param fatOxidationRate - Current fat oxidation rate (0-1)
 * @returns Estimated minutes until bonk, or null if fueling adequately
 */
export function estimateTimeToBonk(
  glycogenGramsRemaining: number,
  currentBurnRateKcalPerHour: number,
  currentIntakeRateKcalPerHour: number,
  fatOxidationRate: number = 0.5
): number | null {
  // Net glycogen burn rate
  const glycogenBurnRateKcalPerHour = currentBurnRateKcalPerHour * (1 - fatOxidationRate);
  const glycogenReplenishRateKcalPerHour = currentIntakeRateKcalPerHour * 0.80;
  const netBurnRateKcalPerHour = glycogenBurnRateKcalPerHour - glycogenReplenishRateKcalPerHour;

  // If intake exceeds glycogen burn, we're not depleting
  if (netBurnRateKcalPerHour <= 0) {
    return null;
  }

  const glycogenKcalRemaining = glycogenGramsRemaining * KCAL_PER_GRAM_CARB;
  const hoursUntilBonk = glycogenKcalRemaining / netBurnRateKcalPerHour;

  return hoursUntilBonk * 60; // Convert to minutes
}

/**
 * Recommendation result with segment-specific warnings and general tips
 */
export interface SegmentRecommendations {
  segmentWarnings: string[];  // Warnings specific to this segment (include checkpoint name)
  generalTips: string[];      // General advice not tied to a specific segment
}

/**
 * Generate recommendations based on energy balance status
 * Returns separate arrays for segment-specific warnings and general tips
 */
export function getEnergyBalanceRecommendations(
  bonkRisk: EnergyBalanceCalculation['bonkRisk'],
  segmentDeficit: number,
  _glycogenPercent: number,
  segmentName?: string,
  segmentCaloriesBurned?: number
): SegmentRecommendations {
  const segmentWarnings: string[] = [];
  const generalTips: string[] = [];

  // Skip recommendations for segments with no activity (like Start)
  if (segmentCaloriesBurned !== undefined && segmentCaloriesBurned === 0) {
    return { segmentWarnings, generalTips };
  }

  // General tips based on bonk risk (not segment-specific)
  switch (bonkRisk) {
    case 'critical':
      generalTips.push('CRITICAL: Glycogen nearly depleted - increase carb intake immediately');
      generalTips.push('Consider slowing pace to reduce energy expenditure');
      break;
    case 'high':
      // Don't add generic tips - segment-specific warnings are more useful
      break;
    case 'moderate':
      // Don't add generic tips for moderate risk
      break;
    case 'low':
      // Don't add tips for low risk
      break;
  }

  // Segment-specific warnings with checkpoint name - aligned with bonkRisk levels
  if (segmentName && bonkRisk !== 'none') {
    const deficitAmount = Math.abs(Math.round(segmentDeficit));
    switch (bonkRisk) {
      case 'critical':
        segmentWarnings.push(`Critical risk at ${segmentName} (${deficitAmount} kcal deficit) - immediate action needed`);
        break;
      case 'high':
        segmentWarnings.push(`High risk at ${segmentName} (${deficitAmount} kcal deficit) - increase carb intake significantly`);
        break;
      case 'moderate':
        segmentWarnings.push(`Moderate risk at ${segmentName} (${deficitAmount} kcal deficit) - increase nutrition intake`);
        break;
      case 'low':
        segmentWarnings.push(`Low risk at ${segmentName} (${deficitAmount} kcal deficit) - maintain nutrition intake`);
        break;
    }
  }

  return { segmentWarnings, generalTips };
}

/**
 * Get tooltip explanation for a segment's risk level
 */
export function getRiskTooltip(
  bonkRisk: EnergyBalanceCalculation['bonkRisk'],
  segmentCaloriesBurned: number,
  segmentCaloriesConsumed: number,
  glycogenPercent: number
): string {
  const deficit = segmentCaloriesConsumed - segmentCaloriesBurned;
  const messages: string[] = [];

  // Add glycogen-based message
  if (glycogenPercent < 15) {
    messages.push(`Glycogen critically low at ${glycogenPercent}%`);
  } else if (glycogenPercent < 25) {
    messages.push(`Glycogen depleting at ${glycogenPercent}%`);
  } else if (glycogenPercent < 40) {
    messages.push(`Glycogen getting low at ${glycogenPercent}%`);
  }

  // Add deficit-based message
  if (segmentCaloriesConsumed === 0 && segmentCaloriesBurned > 200) {
    messages.push(`No carbs consumed while burning ${segmentCaloriesBurned} kcal`);
  } else if (deficit < -400) {
    messages.push(`Large calorie deficit of ${Math.abs(Math.round(deficit))} kcal`);
  } else if (deficit < -300) {
    messages.push(`Calorie deficit of ${Math.abs(Math.round(deficit))} kcal`);
  }

  // If no risk messages, return a positive message
  if (messages.length === 0) {
    if (bonkRisk === 'none') {
      return 'Energy balance is healthy for this segment';
    }
  }

  return messages.join('. ') || 'Energy balance assessment';
}

// ============================================
// SEGMENT ENERGY BALANCE
// ============================================

/**
 * Calculate complete energy balance for a segment
 *
 * @param segment - The segment to analyze
 * @param segmentTimeMinutes - Time for this segment in minutes
 * @param elevationGainFeet - Elevation gain for this segment
 * @param elevationLossFeet - Elevation loss for this segment
 * @param cumulativeBurned - Cumulative calories burned before this segment
 * @param cumulativeConsumed - Cumulative calories consumed before this segment
 * @param cumulativeDistanceMiles - Cumulative distance before this segment
 * @param cumulativeTimeHours - Cumulative time before this segment
 * @param athleteMetrics - Athlete body metrics
 * @returns Complete energy balance calculation
 */
export function calculateSegmentEnergyBalance(
  segment: Segment,
  segmentTimeMinutes: number,
  elevationGainFeet: number,
  elevationLossFeet: number,
  cumulativeBurned: number,
  cumulativeConsumed: number,
  cumulativeDistanceMiles: number,
  cumulativeTimeHours: number,
  athleteMetrics: AthleteMetricsForEnergy
): EnergyBalanceCalculation {
  // Calculate pace
  const segmentTimeHours = segmentTimeMinutes / 60;
  const pace = segment.segment_distance_miles > 0
    ? segmentTimeMinutes / segment.segment_distance_miles
    : 15; // Default 15 min/mile if no distance

  // Calculate calories burned this segment
  const segmentCaloriesBurned = calculateCaloriesBurned(
    segment.segment_distance_miles,
    elevationGainFeet,
    elevationLossFeet,
    pace,
    athleteMetrics
  );

  // Parse nutrition items and calculate calories consumed
  let nutritionItems: NutritionItem[] = [];
  try {
    if (segment.segment_nutrition_items) {
      nutritionItems = JSON.parse(segment.segment_nutrition_items);
    }
  } catch {
    nutritionItems = [];
  }
  const segmentCaloriesConsumed = calculateCaloriesConsumed(nutritionItems);

  // Segment deficit
  const segmentDeficit = segmentCaloriesConsumed - segmentCaloriesBurned;

  // New cumulative values
  const newCumulativeBurned = cumulativeBurned + segmentCaloriesBurned;
  const newCumulativeConsumed = cumulativeConsumed + segmentCaloriesConsumed;
  const newCumulativeDistance = cumulativeDistanceMiles + segment.segment_distance_miles;
  const newCumulativeTime = cumulativeTimeHours + segmentTimeHours;

  // Calculate glycogen status
  const { glycogenRemaining, percentRemaining } = calculateGlycogenStatus(
    newCumulativeBurned,
    newCumulativeConsumed,
    newCumulativeDistance,
    newCumulativeTime
  );

  // Determine bonk risk - combine glycogen-based risk with segment deficit risk
  const glycogenRisk = getBonkRiskLevel(percentRemaining);
  const segmentDeficitRisk = getSegmentDeficitRisk(segmentCaloriesBurned, segmentCaloriesConsumed);
  const bonkRisk = getCombinedRisk(glycogenRisk, segmentDeficitRisk);

  // Estimate time to bonk
  const burnRatePerHour = segmentTimeHours > 0 ? segmentCaloriesBurned / segmentTimeHours : 0;
  const intakeRatePerHour = segmentTimeHours > 0 ? segmentCaloriesConsumed / segmentTimeHours : 0;
  const timeToBonk = percentRemaining < 50 ? estimateTimeToBonk(
    glycogenRemaining,
    burnRatePerHour,
    intakeRatePerHour,
    0.5 // Approximate fat oxidation rate mid-race
  ) : null;

  // Generate recommendations
  const { segmentWarnings, generalTips } = getEnergyBalanceRecommendations(
    bonkRisk,
    segmentDeficit,
    percentRemaining,
    segment.checkpoint_name,
    segmentCaloriesBurned
  );

  return {
    segmentCaloriesBurned: Math.round(segmentCaloriesBurned),
    segmentCaloriesConsumed: Math.round(segmentCaloriesConsumed),
    segmentDeficit: Math.round(segmentDeficit),
    cumulativeDeficit: Math.round(newCumulativeConsumed - newCumulativeBurned),
    estimatedGlycogenRemaining: Math.round(glycogenRemaining),
    estimatedGlycogenPercent: Math.round(percentRemaining),
    timeToBonk: timeToBonk !== null ? Math.round(timeToBonk) : null,
    bonkRisk,
    segmentWarnings,
    generalTips
  };
}

// ============================================
// UI HELPERS
// ============================================

/**
 * Get color class for glycogen percentage
 */
export function getGlycogenColor(percent: number): string {
  if (percent >= 70) return 'text-green-600 dark:text-green-400';
  if (percent >= 50) return 'text-green-500';
  if (percent >= 35) return 'text-yellow-500';
  if (percent >= 20) return 'text-orange-500';
  return 'text-red-500';
}

/**
 * Get background color class for glycogen bar
 */
export function getGlycogenBarColor(percent: number): string {
  if (percent >= 70) return 'bg-green-500';
  if (percent >= 50) return 'bg-green-400';
  if (percent >= 35) return 'bg-yellow-500';
  if (percent >= 20) return 'bg-orange-500';
  return 'bg-red-500';
}

/**
 * Get color class for bonk risk level
 */
export function getBonkRiskColor(risk: EnergyBalanceCalculation['bonkRisk']): string {
  switch (risk) {
    case 'none': return 'text-green-600 dark:text-green-400';
    case 'low': return 'text-green-500';
    case 'moderate': return 'text-yellow-500';
    case 'high': return 'text-orange-500';
    case 'critical': return 'text-red-500';
    default: return 'text-gray-500';
  }
}

/**
 * Get human-readable bonk risk label
 */
export function getBonkRiskLabel(risk: EnergyBalanceCalculation['bonkRisk']): string {
  switch (risk) {
    case 'none': return 'No Risk';
    case 'low': return 'Low Risk';
    case 'moderate': return 'Moderate';
    case 'high': return 'High Risk';
    case 'critical': return 'CRITICAL';
    default: return 'Unknown';
  }
}

/**
 * Format time to bonk for display
 */
export function formatTimeToBonk(minutes: number | null): string {
  if (minutes === null) return 'N/A';
  if (minutes < 60) return `${Math.round(minutes)} min`;
  const hours = Math.floor(minutes / 60);
  const mins = Math.round(minutes % 60);
  return `${hours}h ${mins}m`;
}
