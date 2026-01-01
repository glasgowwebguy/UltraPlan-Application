/**
 * GAP Profile Analyzer
 *
 * Builds a personalized Grade Adjusted Pace model from user's historical FIT data.
 * Identifies whether runner is a "climber" (faster uphill than average) or
 * "descender" (faster downhill) and adjusts predictions accordingly.
 */

import type { ParsedFITData, FITRecord } from '@/shared/types';
import { calculateGAP } from './gradeAdjustedPace';

export interface GAPProfile {
  userId?: string;
  createdFromFIT: string; // FIT file name
  createdAt: string;

  // Personalized factors
  uphillFactor: number; // Seconds slower per 100ft gain vs flat (lower = better climber)
  downhillFactor: number; // Seconds slower per 100ft loss vs flat (lower = better descender)

  // Comparison to average
  climbingStrength: 'strong' | 'average' | 'weak';
  descendingStrength: 'strong' | 'average' | 'weak';

  // Raw data for visualization
  gradientPaceData: {
    gradient: number; // -20 to +20
    avgPace: number; // min/mile at this gradient
    sampleSize: number; // number of data points
  }[];

  // Confidence
  dataQuality: 'high' | 'medium' | 'low';
  totalDataPoints: number;
  distanceCovered: number;
}

export interface GAPProfileComparison {
  standardPace: number;
  personalizedPace: number;
  difference: number; // seconds
  betterOrWorse: 'faster' | 'slower' | 'same';
}

/**
 * Analyze FIT file to build personalized GAP profile
 */
export function analyzeGAPProfile(fitData: ParsedFITData): GAPProfile {
  const records = fitData.records;

  // Group records by gradient buckets
  const gradientBuckets = groupRecordsByGradient(records);

  // Find flat baseline pace
  const flatPace = calculateFlatPace(gradientBuckets);

  // Calculate uphill and downhill factors
  const uphillFactor = calculateUphillFactor(gradientBuckets, flatPace);
  const downhillFactor = calculateDownhillFactor(gradientBuckets, flatPace);

  // Compare to standard model
  const climbingStrength = compareToStandard(uphillFactor, 40); // 40s per 100ft is average
  const descendingStrength = compareToStandard(downhillFactor, 10); // 10s per 100ft is average

  // Create gradient pace data for visualization
  const gradientPaceData = Object.keys(gradientBuckets).map(gradient => ({
    gradient: parseFloat(gradient),
    avgPace: gradientBuckets[parseFloat(gradient)].avgPace,
    sampleSize: gradientBuckets[parseFloat(gradient)].records.length,
  }));

  // Determine data quality
  const totalDataPoints = records.length;
  const distanceCovered = fitData.totalDistance;
  const dataQuality = determineDataQuality(totalDataPoints, distanceCovered);

  return {
    createdFromFIT: fitData.fileName,
    createdAt: new Date().toISOString(),
    uphillFactor,
    downhillFactor,
    climbingStrength,
    descendingStrength,
    gradientPaceData,
    dataQuality,
    totalDataPoints,
    distanceCovered,
  };
}

/**
 * Group records by gradient buckets (-20% to +20% in 2% increments)
 */
function groupRecordsByGradient(records: FITRecord[]): Record<number, {
  records: FITRecord[];
  avgPace: number;
  avgGradient: number;
}> {
  const buckets: Record<number, FITRecord[]> = {};

  // Initialize buckets
  for (let g = -20; g <= 20; g += 2) {
    buckets[g] = [];
  }

  // Group records by gradient
  for (let i = 1; i < records.length; i++) {
    const prevRecord = records[i - 1];
    const currRecord = records[i];

    // Calculate gradient
    const elevChange = currRecord.elevation - prevRecord.elevation;
    const distChange = currRecord.distance - prevRecord.distance;

    if (distChange > 0) {
      const gradient = (elevChange / (distChange * 1609.34)) * 100; // percentage

      // Find nearest bucket
      const bucketGradient = Math.round(gradient / 2) * 2;
      if (bucketGradient >= -20 && bucketGradient <= 20) {
        buckets[bucketGradient].push(currRecord);
      }
    }
  }

  // Calculate average pace for each bucket
  const result: Record<number, { records: FITRecord[]; avgPace: number; avgGradient: number }> = {};

  for (const [gradient, recs] of Object.entries(buckets)) {
    if (recs.length > 5) { // Need at least 5 data points
      const paces = recs.map(r => r.pace).filter((p): p is number => p !== undefined && p > 0);
      if (paces.length > 0) {
        const avgPace = paces.reduce((a, b) => a + b, 0) / paces.length;
        result[parseFloat(gradient)] = {
          records: recs,
          avgPace,
          avgGradient: parseFloat(gradient),
        };
      }
    }
  }

  return result;
}

/**
 * Calculate flat baseline pace
 */
function calculateFlatPace(buckets: Record<number, { avgPace: number }>): number {
  // Use -2%, 0%, +2% buckets for flat baseline
  const flatGradients = [-2, 0, 2];
  const flatPaces: number[] = [];

  for (const g of flatGradients) {
    if (buckets[g]) {
      flatPaces.push(buckets[g].avgPace);
    }
  }

  if (flatPaces.length === 0) return 10; // Default

  // Return median
  flatPaces.sort((a, b) => a - b);
  const mid = Math.floor(flatPaces.length / 2);
  return flatPaces.length % 2 === 0 ? (flatPaces[mid - 1] + flatPaces[mid]) / 2 : flatPaces[mid];
}

/**
 * Calculate personal uphill factor (seconds slower per 100ft of elevation gain)
 * 
 * Formula: For a given grade g%, running 1 mile gains (g/100 * 5280) feet
 * So: factor = (slowdown_min * 60) / (feet_gained / 100)
 */
function calculateUphillFactor(
  buckets: Record<number, { avgPace: number; avgGradient: number }>,
  flatPace: number
): number {
  const uphillGradients = [4, 6, 8, 10, 12]; // Uphill gradients
  const factors: number[] = [];

  for (const g of uphillGradients) {
    if (buckets[g]) {
      const slowdownMinPerMile = buckets[g].avgPace - flatPace; // How much slower (min/mile)

      // Calculate feet gained per mile at this grade
      // g% grade = g/100 rise per unit distance
      // Over 1 mile (5280 ft horizontal), rise = (g/100) * 5280 feet
      const feetGainedPerMile = (g / 100) * 5280;

      // Convert to seconds per 100ft
      // slowdown * 60 seconds / (feet / 100)
      const secondsPer100ft = (slowdownMinPerMile * 60) / (feetGainedPerMile / 100);

      // Sanity check: factor should be between 10-120 seconds per 100ft
      if (slowdownMinPerMile > 0 && secondsPer100ft > 0 && secondsPer100ft < 200) {
        factors.push(secondsPer100ft);
      }
    }
  }

  if (factors.length === 0) return 40; // Default

  // Return median factor
  factors.sort((a, b) => a - b);
  const mid = Math.floor(factors.length / 2);
  return factors.length % 2 === 0 ? (factors[mid - 1] + factors[mid]) / 2 : factors[mid];
}

/**
 * Calculate personal downhill factor (seconds slower per 100ft of elevation loss)
 * Positive = slower than flat on descents (cautious descender)
 * Negative = faster than flat on descents (fast descender)
 */
function calculateDownhillFactor(
  buckets: Record<number, { avgPace: number; avgGradient: number }>,
  flatPace: number
): number {
  const downhillGradients = [-4, -6, -8, -10, -12]; // Downhill gradients
  const factors: number[] = [];

  for (const g of downhillGradients) {
    if (buckets[g]) {
      // paceChange: negative = faster than flat, positive = slower than flat
      const paceChangeMinPerMile = buckets[g].avgPace - flatPace;

      // Calculate feet lost per mile at this grade
      const feetLostPerMile = (Math.abs(g) / 100) * 5280;

      // Convert to seconds per 100ft of descent
      // Positive factor = you're slower on descents
      // Negative factor = you're faster on descents  
      const secondsPer100ft = (paceChangeMinPerMile * 60) / (feetLostPerMile / 100);

      // Sanity check: factor should be between -60 and +60 seconds per 100ft
      if (Math.abs(secondsPer100ft) < 100) {
        factors.push(secondsPer100ft);
      }
    }
  }

  if (factors.length === 0) return 10; // Default (slightly slower on descents)

  // Return median factor
  factors.sort((a, b) => a - b);
  const mid = Math.floor(factors.length / 2);
  return factors.length % 2 === 0 ? (factors[mid - 1] + factors[mid]) / 2 : factors[mid];
}

/**
 * Compare factor to standard model
 */
function compareToStandard(
  personalFactor: number,
  standardFactor: number
): 'strong' | 'average' | 'weak' {
  const ratio = personalFactor / standardFactor;

  if (ratio < 0.85) return 'strong'; // 15% better than average
  if (ratio > 1.15) return 'weak'; // 15% worse than average
  return 'average';
}

/**
 * Determine data quality based on sample size and distance
 */
function determineDataQuality(
  dataPoints: number,
  distance: number
): 'high' | 'medium' | 'low' {
  if (dataPoints > 5000 && distance > 20) return 'high';
  if (dataPoints > 2000 && distance > 10) return 'medium';
  return 'low';
}

/**
 * Compare personal profile to standard Minetti model
 */
export function compareToStandardModel(profile: GAPProfile): {
  uphillComparison: string;
  downhillComparison: string;
  overallAssessment: string;
} {
  const uphillDiff = ((40 - profile.uphillFactor) / 40) * 100;
  const downhillDiff = ((10 - profile.downhillFactor) / 10) * 100;

  const uphillComparison =
    uphillDiff > 0
      ? `${Math.abs(uphillDiff).toFixed(0)}% faster than average on climbs`
      : `${Math.abs(uphillDiff).toFixed(0)}% slower than average on climbs`;

  const downhillComparison =
    downhillDiff > 0
      ? `${Math.abs(downhillDiff).toFixed(0)}% faster than average on descents`
      : `${Math.abs(downhillDiff).toFixed(0)}% slower than average on descents`;

  let overallAssessment = 'Balanced runner - handles all terrain types well';
  if (profile.climbingStrength === 'strong' && profile.descendingStrength === 'strong') {
    overallAssessment = 'Mountain goat! You excel on varied terrain';
  } else if (profile.climbingStrength === 'strong') {
    overallAssessment = 'Strong climber - seek out hilly courses to your advantage';
  } else if (profile.descendingStrength === 'strong') {
    overallAssessment = 'Strong descender - technical downhills are your strength';
  } else if (profile.climbingStrength === 'weak' && profile.descendingStrength === 'weak') {
    overallAssessment = 'Hills slow you down more than average - consider hill training to improve';
  } else if (profile.climbingStrength === 'weak') {
    overallAssessment = 'Climbing is a weakness - hill repeats could help';
  } else if (profile.descendingStrength === 'weak') {
    overallAssessment = 'Descending is cautious - practice technical downhills';
  }

  return {
    uphillComparison,
    downhillComparison,
    overallAssessment,
  };
}

/**
 * Apply personal GAP profile to predict segment pace
 */
export function predictWithPersonalGAP(
  profile: GAPProfile,
  basePace: number,
  gradientPercent: number
): GAPProfileComparison {
  // Calculate standard GAP
  const standardPace = calculateGAP(basePace, gradientPercent);

  // Calculate personalized GAP using personal factors
  // This is a simplified approach - in production you'd use the full gradient curve
  let personalizedPace = basePace;

  if (gradientPercent > 0) {
    // Uphill: apply personal uphill factor
    const adjustment = (gradientPercent / 100) * (profile.uphillFactor / 60);
    personalizedPace = basePace + adjustment;
  } else if (gradientPercent < 0) {
    // Downhill: apply personal downhill factor
    const adjustment = (Math.abs(gradientPercent) / 100) * (profile.downhillFactor / 60);
    personalizedPace = basePace + adjustment;
  }

  const difference = personalizedPace - standardPace;
  const betterOrWorse = difference < -0.05 ? 'faster' : difference > 0.05 ? 'slower' : 'same';

  return {
    standardPace,
    personalizedPace,
    difference: difference * 60, // Convert to seconds
    betterOrWorse,
  };
}

/**
 * Determine athlete type based on profile
 */
export function getAthleteType(profile: GAPProfile):
  | 'climber'
  | 'descender'
  | 'all-rounder'
  | 'flat-specialist' {
  if (profile.climbingStrength === 'strong' && profile.descendingStrength === 'strong') {
    return 'all-rounder';
  }
  if (profile.climbingStrength === 'strong') {
    return 'climber';
  }
  if (profile.descendingStrength === 'strong') {
    return 'descender';
  }
  return 'flat-specialist';
}
