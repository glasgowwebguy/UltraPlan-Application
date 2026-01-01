/**
 * Grade Adjusted Pace (GAP) Calculations
 *
 * GAP represents the flat-ground equivalent effort of running on hills.
 * Based on the Minetti et al. (2002) research on energy cost at different gradients.
 *
 * Research basis:
 * - Minetti et al. (2002) - "Energy cost of walking and running at extreme uphill and downhill slopes"
 * - Maximum efficiency occurs at approximately -10% to -12% gradient
 * - Uphill running has higher energy cost per unit distance
 * - Steep downhill (beyond -10%) also increases energy cost due to braking forces
 */

import type { FITRecord } from '@/shared/types';

export interface FITRecordWithGAP extends FITRecord {
  gap?: number; // Grade Adjusted Pace in min/mile
  gradient?: number; // Grade percentage at this point
}

export interface SegmentGAPAnalysis {
  avgActualPace: number; // min/mile
  avgGAP: number; // min/mile
  avgGradient: number; // percentage
  gapVariance: number; // percentage difference
  effortLevel: 'easier' | 'similar' | 'harder'; // compared to actual pace
}

/**
 * Calculate Grade Adjusted Pace using the Minetti model
 *
 * @param actualPace - The actual pace in min/mile
 * @param gradientPercent - The grade as a percentage (positive = uphill, negative = downhill)
 * @returns The grade-adjusted pace in min/mile (flat equivalent effort)
 *
 * How to interpret GAP:
 * - Uphill: GAP is FASTER than actual (e.g., 10:00 actual → 8:30 GAP means you're working as hard as 8:30 flat pace)
 * - Downhill: GAP is SLOWER than actual (e.g., 7:00 actual → 8:00 GAP means effort is like 8:00 flat pace)
 * - Flat: GAP equals actual pace
 */
export function calculateGAP(actualPace: number, gradientPercent: number): number {
  // Guard against invalid inputs
  if (isNaN(actualPace) || !isFinite(actualPace) || actualPace <= 0) {
    return actualPace;
  }
  if (isNaN(gradientPercent) || !isFinite(gradientPercent)) {
    return actualPace;
  }

  // For flat or near-flat terrain, GAP equals actual pace
  if (Math.abs(gradientPercent) < 0.5) {
    return actualPace;
  }

  // Convert pace to speed (mph) for calculation
  const speedMPH = 60 / actualPace;

  // Calculate energy cost multiplier based on gradient
  // This uses the Minetti polynomial approximation
  const costMultiplier = calculateEnergyCostMultiplier(gradientPercent);

  // Apply cost multiplier to speed (slower pace = higher cost)
  const gapSpeed = speedMPH * costMultiplier;

  // Convert back to pace (min/mile)
  const gapPace = 60 / gapSpeed;

  // Sanity check: GAP should be reasonable (3-30 min/mile)
  if (isNaN(gapPace) || !isFinite(gapPace) || gapPace < 3 || gapPace > 30) {
    return actualPace;
  }

  return gapPace;
}

/**
 * Calculate energy cost multiplier based on gradient
 * Based on Minetti's research showing the relationship between grade and energy expenditure
 *
 * Key findings:
 * - Flat (0%): multiplier = 1.0 (baseline)
 * - Uphill: Cost increases significantly (multiplier > 1.0)
 * - Downhill to -10%: Cost decreases (multiplier < 1.0, most efficient)
 * - Steep downhill beyond -10%: Cost increases due to braking (multiplier increases again)
 */
function calculateEnergyCostMultiplier(gradientPercent: number): number {
  const g = gradientPercent / 100; // Convert to decimal (e.g., 5% → 0.05)

  // Minetti polynomial approximation for energy cost
  // This is a simplified model that captures the key characteristics

  if (gradientPercent >= 0) {
    // Uphill: Energy cost increases significantly
    // Formula approximation: cost ≈ 1 + 3.5*g + 5*g²
    const costIncrease = 1 + (3.5 * g) + (5 * Math.pow(g, 2));
    return costIncrease;
  } else {
    // Downhill: More complex relationship
    const absGradient = Math.abs(gradientPercent);

    if (absGradient <= 10) {
      // Gentle to moderate downhill: Energy cost decreases (more efficient)
      // Most efficient around -10%
      // Formula: cost ≈ 1 - 0.5*|g| + 0.15*g²
      const costDecrease = 1 - (0.5 * Math.abs(g)) + (0.15 * Math.pow(g, 2));
      return Math.max(0.7, costDecrease); // Never go below 0.7 (30% more efficient)
    } else {
      // Steep downhill: Energy cost increases again due to braking
      // Formula: cost ≈ 0.7 + 0.1*(|g| - 0.10)²
      const brakingCost = 0.7 + (0.1 * Math.pow(Math.abs(g) - 0.10, 2));
      return Math.min(1.2, brakingCost); // Cap at 1.2
    }
  }
}

/**
 * Calculate GAP for an array of FIT records
 * Returns array of records with GAP values added
 */
export function calculateGAPForRecords(records: FITRecord[]): FITRecordWithGAP[] {
  const recordsWithGAP: FITRecordWithGAP[] = [];

  for (let i = 0; i < records.length; i++) {
    const record = records[i];

    // Calculate gradient at this point
    let gradient = 0;
    if (i > 0 && i < records.length - 1) {
      // Use elevation change over a small window for smoother gradient
      const windowSize = Math.min(5, records.length - i - 1);
      const prevRecord = records[Math.max(0, i - windowSize)];
      const nextRecord = records[Math.min(records.length - 1, i + windowSize)];

      const elevationChange = nextRecord.elevation - prevRecord.elevation; // meters
      const distanceChange = nextRecord.distance - prevRecord.distance; // miles

      if (distanceChange > 0) {
        const distanceMeters = distanceChange * 1609.34;
        gradient = (elevationChange / distanceMeters) * 100; // percentage
      }
    }

    // Calculate GAP
    const actualPace = record.pace;
    let gap: number | undefined;

    if (actualPace && actualPace > 0) {
      gap = calculateGAP(actualPace, gradient);
    }

    recordsWithGAP.push({
      ...record,
      gap,
      gradient
    });
  }

  return recordsWithGAP;
}

/**
 * Calculate average GAP for a segment given FIT data
 */
export function calculateSegmentGAP(
  fitRecords: FITRecord[],
  startDistance: number,
  endDistance: number
): SegmentGAPAnalysis | null {
  // Filter records within this distance range
  const segmentRecords = fitRecords.filter(
    r => r.distance >= startDistance && r.distance <= endDistance
  );

  if (segmentRecords.length < 5) {
    return null; // Not enough data
  }

  // Calculate GAP for all records in segment
  const recordsWithGAP = calculateGAPForRecords(segmentRecords);

  // Calculate averages
  const validRecords = recordsWithGAP.filter(r => r.pace && r.pace > 0 && r.gap && r.gap > 0);

  if (validRecords.length === 0) {
    return null;
  }

  const avgActualPace = validRecords.reduce((sum, r) => sum + (r.pace || 0), 0) / validRecords.length;
  const avgGAP = validRecords.reduce((sum, r) => sum + (r.gap || 0), 0) / validRecords.length;
  const avgGradient = validRecords.reduce((sum, r) => sum + (r.gradient || 0), 0) / validRecords.length;

  // Calculate variance (percentage difference)
  const gapVariance = ((avgGAP - avgActualPace) / avgActualPace) * 100;

  // Determine effort level
  let effortLevel: 'easier' | 'similar' | 'harder';
  if (gapVariance < -5) {
    effortLevel = 'harder'; // GAP is faster than actual = working harder
  } else if (gapVariance > 5) {
    effortLevel = 'easier'; // GAP is slower than actual = working easier
  } else {
    effortLevel = 'similar';
  }

  return {
    avgActualPace,
    avgGAP,
    avgGradient,
    gapVariance,
    effortLevel
  };
}

/**
 * Format GAP for display (e.g., "8:30 GAP")
 */
export function formatGAP(gapMinPerMile: number, useMiles: boolean = true): string {
  const minutes = Math.floor(gapMinPerMile);
  const seconds = Math.round((gapMinPerMile - minutes) * 60);
  const paceStr = `${minutes}:${seconds.toString().padStart(2, '0')}`;

  if (useMiles) {
    return `${paceStr}/mi GAP`;
  } else {
    // Convert to min/km if needed
    const pacePerKm = gapMinPerMile / 1.60934;
    const minKm = Math.floor(pacePerKm);
    const secKm = Math.round((pacePerKm - minKm) * 60);
    return `${minKm}:${secKm.toString().padStart(2, '0')}/km GAP`;
  }
}

/**
 * Get effort indicator based on GAP variance
 * Returns a color and text description
 */
export function getGAPEffortIndicator(gapVariance: number): {
  color: string;
  text: string;
  description: string;
} {
  if (gapVariance < -10) {
    return {
      color: 'red',
      text: 'High Effort',
      description: 'Working significantly harder than pace suggests'
    };
  } else if (gapVariance < -5) {
    return {
      color: 'orange',
      text: 'Harder Effort',
      description: 'Working harder than flat equivalent'
    };
  } else if (gapVariance > 10) {
    return {
      color: 'blue',
      text: 'Recovery Effort',
      description: 'Easy recovery pace'
    };
  } else if (gapVariance > 5) {
    return {
      color: 'green',
      text: 'Easier Effort',
      description: 'Working easier than flat equivalent'
    };
  } else {
    return {
      color: 'gray',
      text: 'Similar Effort',
      description: 'Effort matches flat terrain'
    };
  }
}

/**
 * Calculate total "effort time" for a race using GAP
 * This represents the equivalent time if the entire race were run on flat ground
 */
export function calculateTotalGAPTime(fitRecords: FITRecord[]): number {
  const recordsWithGAP = calculateGAPForRecords(fitRecords);

  let totalEffortTime = 0; // seconds

  for (let i = 1; i < recordsWithGAP.length; i++) {
    const prevRecord = recordsWithGAP[i - 1];
    const currRecord = recordsWithGAP[i];

    const distanceCovered = currRecord.distance - prevRecord.distance; // miles
    const gap = currRecord.gap || currRecord.pace; // Use GAP if available, otherwise actual pace

    if (gap && gap > 0 && distanceCovered > 0) {
      totalEffortTime += distanceCovered * gap * 60; // Convert pace to seconds
    }
  }

  return totalEffortTime; // seconds
}
