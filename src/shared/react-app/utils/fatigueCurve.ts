/**
 * Fatigue Curve Utilities
 *
 * Generates data for visualizing expected pace degradation over race distance.
 * Based on the fatigue factor calculated from FIT file analysis.
 */

export interface FatigueCurvePoint {
  distance: number; // miles
  fatigueMultiplier: number; // 1.0 = fresh, 1.1 = 10% degraded
  expectedPace: number; // min/mile at this point
  percentDegradation: number; // 0%, 5%, 10%, etc.
}

/**
 * Generate fatigue curve data points for visualization
 *
 * @param basePace - Starting pace in min/mile
 * @param totalDistance - Total race distance in miles
 * @param fatigueFactor - Percent degradation per 10 miles (default 2-3%)
 * @param dataPoints - Number of points to generate (default: 1 per mile)
 */
export function generateFatigueCurve(
  basePace: number,
  totalDistance: number,
  fatigueFactor: number,
  dataPoints?: number
): FatigueCurvePoint[] {
  const numPoints = dataPoints ?? Math.ceil(totalDistance);
  const interval = totalDistance / numPoints;
  const curve: FatigueCurvePoint[] = [];

  for (let i = 0; i <= numPoints; i++) {
    const distance = i * interval;

    // Calculate fatigue multiplier at this distance
    // Formula: 1 + (distance / 10) * (fatigueFactor / 100)
    const fatigueMultiplier = 1 + (distance / 10) * (fatigueFactor / 100);

    // Calculate expected pace at this point
    const expectedPace = basePace * fatigueMultiplier;

    // Calculate percent degradation
    const percentDegradation = (fatigueMultiplier - 1) * 100;

    curve.push({
      distance,
      fatigueMultiplier,
      expectedPace,
      percentDegradation,
    });
  }

  return curve;
}

/**
 * Calculate expected pace at a specific distance
 */
export function getExpectedPaceAtDistance(
  basePace: number,
  distance: number,
  fatigueFactor: number
): number {
  const fatigueMultiplier = 1 + (distance / 10) * (fatigueFactor / 100);
  return basePace * fatigueMultiplier;
}

/**
 * Estimate total time including fatigue
 * Integrates pace over distance accounting for degradation
 */
export function calculateTotalTimeWithFatigue(
  basePace: number,
  totalDistance: number,
  fatigueFactor: number
): number {
  // Use numerical integration (trapezoidal rule) for accuracy
  const steps = 100;
  const stepSize = totalDistance / steps;
  let totalTime = 0;

  for (let i = 0; i < steps; i++) {
    const distance1 = i * stepSize;
    const distance2 = (i + 1) * stepSize;

    const pace1 = getExpectedPaceAtDistance(basePace, distance1, fatigueFactor);
    const pace2 = getExpectedPaceAtDistance(basePace, distance2, fatigueFactor);

    // Average pace for this segment
    const avgPace = (pace1 + pace2) / 2;

    // Time for this segment (pace * distance)
    totalTime += avgPace * stepSize;
  }

  return totalTime; // minutes
}

/**
 * Calculate actual fade rate from historical data
 * Compares first half pace to second half pace
 */
export function calculateActualFadeRate(
  paces: number[], // Array of paces in min/mile
  distances: number[] // Corresponding distances
): number {
  if (paces.length < 2 || distances.length !== paces.length) {
    return 0;
  }

  // Find midpoint
  const totalDistance = distances[distances.length - 1];
  const midDistance = totalDistance / 2;

  // Split into first and second half
  const firstHalfPaces: number[] = [];
  const secondHalfPaces: number[] = [];

  for (let i = 0; i < distances.length; i++) {
    if (distances[i] < midDistance) {
      firstHalfPaces.push(paces[i]);
    } else {
      secondHalfPaces.push(paces[i]);
    }
  }

  if (firstHalfPaces.length === 0 || secondHalfPaces.length === 0) {
    return 0;
  }

  // Calculate average paces
  const avgFirstHalf = firstHalfPaces.reduce((a, b) => a + b, 0) / firstHalfPaces.length;
  const avgSecondHalf = secondHalfPaces.reduce((a, b) => a + b, 0) / secondHalfPaces.length;

  // Calculate fade rate as percentage per 10 miles
  const fadePercent = ((avgSecondHalf - avgFirstHalf) / avgFirstHalf) * 100;
  const fadeRatePer10Miles = (fadePercent / totalDistance) * 10;

  return fadeRatePer10Miles;
}

/**
 * Compare expected vs actual fatigue
 */
export function compareFatigue(
  expectedFatigueFactor: number,
  actualFadeRate: number
): {
  difference: number; // percentage points
  performance: 'better' | 'similar' | 'worse';
  message: string;
} {
  const difference = actualFadeRate - expectedFatigueFactor;

  let performance: 'better' | 'similar' | 'worse';
  let message: string;

  if (difference < -1) {
    performance = 'better';
    message = `Excellent fatigue management! ${Math.abs(difference).toFixed(1)}% less fade than expected`;
  } else if (difference > 1) {
    performance = 'worse';
    message = `Higher fade than expected. ${difference.toFixed(1)}% more degradation`;
  } else {
    performance = 'similar';
    message = 'Fatigue matched expectations';
  }

  return { difference, performance, message };
}

/**
 * Get fatigue level description
 */
export function getFatigueDescription(percentDegradation: number): string {
  if (percentDegradation < 5) return 'Fresh';
  if (percentDegradation < 10) return 'Mild fatigue';
  if (percentDegradation < 15) return 'Moderate fatigue';
  if (percentDegradation < 20) return 'Significant fatigue';
  return 'Severe fatigue';
}

/**
 * Get fatigue color for visualization
 */
export function getFatigueColor(percentDegradation: number): string {
  if (percentDegradation < 5) return '#22c55e'; // green
  if (percentDegradation < 10) return '#84cc16'; // lime
  if (percentDegradation < 15) return '#eab308'; // yellow
  if (percentDegradation < 20) return '#f97316'; // orange
  return '#ef4444'; // red
}
