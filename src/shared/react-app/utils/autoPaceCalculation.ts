/**
 * Auto-Pace Calculation Algorithm
 *
 * Derives realistic segment paces based on historical FIT file data.
 * Takes into account:
 * - Elevation gain/loss effects on pace
 * - Historical heart rate zones at different gradients
 * - Fatigue modeling based on distance completed
 * - Terrain-adjusted pace predictions
 */

import type {
  ParsedFITData,
  FITRecord,
  Segment,
  HRZones,
  PowerZones,
  HRZoneSuggestion,
  PowerZoneSuggestion,
  AthleteSettings
} from '@/shared/types';
import { calculateSegmentElevation } from './elevationCalculations';

// ============================================
// TYPES
// ============================================

export interface AutoPaceConfig {
  baselineFlat: number;           // min/mile on flat terrain from FIT data
  elevationGainFactor: number;    // seconds added per 100ft gain per mile
  elevationLossFactor: number;    // seconds added per 100ft loss per mile (negative impact)
  fatigueFactor: number;          // % pace degradation per 10 miles
  heartRateThreshold: number;     // HR above which pace degrades faster
  hrZones?: HRZones;              // Calculated HR zones from FIT data
  powerZones?: PowerZones;        // Calculated power zones from FIT data (if available)
  hasPowerData?: boolean;         // Whether FIT file contains power data
}

export interface ElevationDetails {
  gainFeet: number;
  lossFeet: number;
  distanceMiles: number;
  avgGradientPercent: number;
  climbType: 'Very Steep' | 'Steep' | 'Moderate-Steep' | 'Moderate' | 'Gradual' | 'Flat/Rolling';
  paceAdjustmentSeconds: number;
}

export interface DerivedPaceResult {
  paceMinPerMile: number;
  confidence: 'high' | 'medium' | 'low';
  factors: {
    basePace: number;
    elevationAdjustment: number;
    fatigueAdjustment: number;
    totalAdjustment: number;
  };
  reasoning: string;
  suggestedHRZone?: HRZoneSuggestion;      // NEW: HR zone suggestion
  suggestedPowerZone?: PowerZoneSuggestion; // NEW: Power zone suggestion
  elevationDetails?: ElevationDetails;     // NEW: Detailed elevation analysis
}

export interface SegmentTerrainData {
  distanceMiles: number;
  cumulativeDistanceMiles: number;
  elevationGainFeet: number;
  elevationLossFeet: number;
  averageGradientPercent: number;
}

interface FlatSegment {
  records: FITRecord[];
  avgPace: number;
  avgHR?: number;
  gradient: number;
}

interface GradientSegment {
  records: FITRecord[];
  avgPace: number;
  avgGradient: number;
  gainPerMile: number;
}

// ============================================
// CORE ANALYSIS FUNCTIONS
// ============================================

/**
 * Analyze FIT file to extract running characteristics
 * Optionally uses personal GAP profile factors if provided
 */
export function analyzeFITForPacing(
  fitData: ParsedFITData,
  athleteSettings?: AthleteSettings,
  gapProfile?: { uphillFactor: number; downhillFactor: number }
): AutoPaceConfig {
  const records = fitData.records;

  if (!records || records.length === 0) {
    // Return conservative defaults if no data
    return {
      baselineFlat: 12.0, // 12 min/mile default
      elevationGainFactor: gapProfile?.uphillFactor ?? 40, // Use personal factor if available
      elevationLossFactor: gapProfile?.downhillFactor ?? 10,
      fatigueFactor: 2.0, // 2% pace degradation per 10 miles
      heartRateThreshold: 165,
      hasPowerData: false,
    };
  }

  // 1. Find baseline flat pace
  const flatSegments = findFlatSegments(records);
  const baselineFlat = calculateMedianPace(flatSegments);

  // 2. Calculate elevation factors
  // USE PERSONAL GAP PROFILE FACTORS IF PROVIDED
  let elevationGainFactor: number;
  let elevationLossFactor: number;

  if (gapProfile) {
    // Use personalized factors from GAP profile
    elevationGainFactor = gapProfile.uphillFactor;
    elevationLossFactor = gapProfile.downhillFactor;
    console.log('[AutoPace] Using personal GAP profile factors:', {
      uphill: elevationGainFactor,
      downhill: elevationLossFactor
    });
  } else {
    // Calculate from FIT data
    const uphillSegments = findUphillSegments(records);
    const downhillSegments = findDownhillSegments(records);
    elevationGainFactor = calculateElevationFactor(baselineFlat, uphillSegments);
    elevationLossFactor = calculateDescentFactor(baselineFlat, downhillSegments);
  }

  // 3. Calculate fatigue factor
  const fatigueFactor = calculateFatigueFactor(records);

  // 4. Determine HR threshold
  const heartRateThreshold = calculateHRThreshold(records);

  // 5. Calculate HR zones (NEW)
  const hrZones = calculateHRZones(fitData, athleteSettings);

  // 6. Check for power data and calculate power zones (NEW)
  const hasPowerDataFlag = hasPowerData(fitData);
  const powerZones = hasPowerDataFlag ? calculatePowerZones(fitData, athleteSettings) : undefined;

  return {
    baselineFlat,
    elevationGainFactor,
    elevationLossFactor,
    fatigueFactor,
    heartRateThreshold,
    hrZones: hrZones || undefined,
    powerZones: powerZones || undefined,
    hasPowerData: hasPowerDataFlag,
  };
}

/**
 * Find segments where gradient is relatively flat (-2% to +2%)
 * Groups records into ~0.25 mile segments
 */
function findFlatSegments(records: FITRecord[]): FlatSegment[] {
  const segments: FlatSegment[] = [];
  const segmentSize = 0.25; // miles

  if (records.length < 10) return segments;

  for (let i = 0; i < records.length - 10; i++) {
    const startRecord = records[i];
    const endIndex = records.findIndex(
      (r, idx) => idx > i && r.distance >= startRecord.distance + segmentSize
    );

    if (endIndex === -1 || endIndex - i < 5) continue;

    const endRecord = records[endIndex];
    const segmentRecords = records.slice(i, endIndex + 1);

    // Calculate elevation change
    const elevationChange = endRecord.elevation - startRecord.elevation;
    const distance = endRecord.distance - startRecord.distance;
    const gradient = (elevationChange / (distance * 1609.34)) * 100; // % grade

    // Only include relatively flat segments
    if (Math.abs(gradient) <= 2.0) {
      const avgPace = calculateAveragePace(segmentRecords);
      const avgHR = calculateAverageHR(segmentRecords);

      // Only include if we have valid pace and it's reasonable (5-20 min/mile)
      if (avgPace > 0 && avgPace >= 5 && avgPace <= 20) {
        segments.push({
          records: segmentRecords,
          avgPace,
          avgHR,
          gradient,
        });
      }
    }
  }

  return segments;
}

/**
 * Find uphill segments (gradient > 3%)
 */
function findUphillSegments(records: FITRecord[]): GradientSegment[] {
  const segments: GradientSegment[] = [];
  const segmentSize = 0.25; // miles

  if (records.length < 10) return segments;

  for (let i = 0; i < records.length - 10; i++) {
    const startRecord = records[i];
    const endIndex = records.findIndex(
      (r, idx) => idx > i && r.distance >= startRecord.distance + segmentSize
    );

    if (endIndex === -1 || endIndex - i < 5) continue;

    const endRecord = records[endIndex];
    const segmentRecords = records.slice(i, endIndex + 1);

    const elevationChange = endRecord.elevation - startRecord.elevation;
    const distance = endRecord.distance - startRecord.distance;
    const gradient = (elevationChange / (distance * 1609.34)) * 100;

    // Only uphill segments with significant gradient
    if (gradient > 3.0 && elevationChange > 0) {
      const avgPace = calculateAveragePace(segmentRecords);
      const gainFeet = elevationChange * 3.28084;
      const gainPerMile = gainFeet / distance;

      if (avgPace > 0 && avgPace >= 5 && avgPace <= 25) {
        segments.push({
          records: segmentRecords,
          avgPace,
          avgGradient: gradient,
          gainPerMile,
        });
      }
    }
  }

  return segments;
}

/**
 * Find downhill segments (gradient < -3%)
 */
function findDownhillSegments(records: FITRecord[]): GradientSegment[] {
  const segments: GradientSegment[] = [];
  const segmentSize = 0.25; // miles

  if (records.length < 10) return segments;

  for (let i = 0; i < records.length - 10; i++) {
    const startRecord = records[i];
    const endIndex = records.findIndex(
      (r, idx) => idx > i && r.distance >= startRecord.distance + segmentSize
    );

    if (endIndex === -1 || endIndex - i < 5) continue;

    const endRecord = records[endIndex];
    const segmentRecords = records.slice(i, endIndex + 1);

    const elevationChange = endRecord.elevation - startRecord.elevation;
    const distance = endRecord.distance - startRecord.distance;
    const gradient = (elevationChange / (distance * 1609.34)) * 100;

    // Only downhill segments
    if (gradient < -3.0) {
      const avgPace = calculateAveragePace(segmentRecords);
      const lossFeet = Math.abs(elevationChange * 3.28084);
      const lossPerMile = lossFeet / distance;

      if (avgPace > 0 && avgPace >= 5 && avgPace <= 25) {
        segments.push({
          records: segmentRecords,
          avgPace,
          avgGradient: gradient,
          gainPerMile: -lossPerMile, // Negative for descent
        });
      }
    }
  }

  return segments;
}

/**
 * Calculate median pace from segments (more robust than average)
 */
function calculateMedianPace(segments: FlatSegment[]): number {
  if (segments.length === 0) return 12.0; // Default fallback

  // Filter out invalid paces
  const validPaces = segments
    .map(s => s.avgPace)
    .filter(pace => !isNaN(pace) && isFinite(pace) && pace > 0 && pace < 30);

  if (validPaces.length === 0) return 12.0; // Default fallback

  // Sort paces
  const paces = validPaces.sort((a, b) => a - b);

  // Return median
  const mid = Math.floor(paces.length / 2);
  if (paces.length % 2 === 0) {
    return (paces[mid - 1] + paces[mid]) / 2;
  }
  return paces[mid];
}

/**
 * Calculate seconds added per 100ft of elevation gain per mile
 * Uses linear regression of pace vs elevation gain
 */
function calculateElevationFactor(
  baselinePace: number,
  uphillSegments: GradientSegment[]
): number {
  if (uphillSegments.length < 3) {
    // Not enough data, use conservative estimate
    return 40; // 40 seconds per 100ft gain per mile
  }

  // Calculate average slowdown per 100ft gain
  let totalSlowdown = 0;
  let count = 0;

  for (const segment of uphillSegments) {
    const slowdown = segment.avgPace - baselinePace; // How much slower than flat
    const gainPer100ft = segment.gainPerMile / 100;

    if (gainPer100ft > 0) {
      const slowdownPerGain = slowdown / gainPer100ft;
      // Convert to seconds
      totalSlowdown += slowdownPerGain * 60;
      count++;
    }
  }

  if (count === 0) return 40;

  const avgFactor = totalSlowdown / count;

  // Clamp to reasonable range (20-80 seconds per 100ft)
  return Math.max(20, Math.min(80, avgFactor));
}

/**
 * Calculate descent factor
 * Descents can slow you down on steep terrain
 */
function calculateDescentFactor(
  baselinePace: number,
  downhillSegments: GradientSegment[]
): number {
  if (downhillSegments.length < 2) {
    return 10; // 10 seconds per 100ft loss per mile (small penalty)
  }

  // Most descents are faster, but steep descents can slow you down
  let totalSlowdown = 0;
  let count = 0;

  for (const segment of downhillSegments) {
    // Only consider steep descents (where runners typically slow down)
    if (segment.avgGradient < -10) {
      const paceChange = segment.avgPace - baselinePace;
      if (paceChange > 0) { // If slower than flat
        const lossPer100ft = Math.abs(segment.gainPerMile) / 100;
        const slowdownPerLoss = paceChange / lossPer100ft;
        totalSlowdown += slowdownPerLoss * 60;
        count++;
      }
    }
  }

  if (count === 0) return 5; // Minimal penalty

  const avgFactor = totalSlowdown / count;

  // Clamp to reasonable range (0-30 seconds per 100ft)
  return Math.max(0, Math.min(30, avgFactor));
}

/**
 * Calculate fatigue factor (% pace degradation per 10 miles)
 * Analyzes pace degradation over the course of the run
 */
function calculateFatigueFactor(records: FITRecord[]): number {
  if (records.length < 50) return 2.0; // Default 2% per 10 miles

  // Split into 10-mile chunks
  const chunkSize = 10; // miles
  const chunks: FITRecord[][] = [];

  let currentChunk: FITRecord[] = [];
  let chunkStartDist = 0;

  for (const record of records) {
    if (record.distance >= chunkStartDist + chunkSize) {
      if (currentChunk.length > 5) {
        chunks.push(currentChunk);
      }
      currentChunk = [];
      chunkStartDist = record.distance;
    }
    currentChunk.push(record);
  }

  if (currentChunk.length > 5) {
    chunks.push(currentChunk);
  }

  if (chunks.length < 2) return 2.0;

  // Calculate average pace for each chunk
  const chunkPaces = chunks.map(chunk => calculateAveragePace(chunk));

  // Calculate % degradation from first to last chunk
  const firstPace = chunkPaces[0];
  const lastPace = chunkPaces[chunkPaces.length - 1];

  const percentChange = ((lastPace - firstPace) / firstPace) * 100;
  const chunksCount = chunks.length - 1;
  const degradationPer10Miles = percentChange / chunksCount;

  // Clamp to reasonable range (0-8% per 10 miles)
  return Math.max(0, Math.min(8, degradationPer10Miles));
}

/**
 * Calculate HR threshold from FIT data
 * This is the HR above which pace significantly degrades
 */
function calculateHRThreshold(records: FITRecord[]): number {
  const recordsWithHR = records.filter(r => r.heartRate && r.heartRate > 0);

  if (recordsWithHR.length < 50) {
    return 165; // Default threshold
  }

  // Calculate average HR
  const avgHR = recordsWithHR.reduce((sum, r) => sum + (r.heartRate || 0), 0) / recordsWithHR.length;

  // Threshold is typically ~10 bpm above average sustained HR
  return Math.round(avgHR + 10);
}

// ============================================
// HR ZONE CALCULATIONS
// ============================================

/**
 * Calculate HR zones from FIT data using HR Reserve method (Karvonen formula)
 * This is the gold standard for HR zone training
 */
export function calculateHRZones(
  fitData: ParsedFITData,
  athleteSettings?: AthleteSettings
): HRZones | null {
  const recordsWithHR = fitData.records.filter(r => r.heartRate && r.heartRate > 0);

  if (recordsWithHR.length < 50) {
    console.log('[HR Zones] Insufficient HR data to calculate zones');
    return null; // Need sufficient data
  }

  // Use athlete settings if provided, otherwise detect from FIT data
  const maxHR = athleteSettings?.maxHR || Math.max(...recordsWithHR.map(r => r.heartRate!));
  const restingHR = athleteSettings?.restingHR || Math.min(...recordsWithHR.map(r => r.heartRate!));

  console.log('[HR Zones] Max HR:', maxHR, 'Resting HR:', restingHR);

  // Calculate HR Reserve
  const hrReserve = maxHR - restingHR;

  if (hrReserve <= 0) {
    console.warn('[HR Zones] Invalid HR reserve, using fallback zones');
    return null;
  }

  // Calculate zones using Karvonen formula (HRR method)
  // Target HR = ((max HR − resting HR) × %Intensity) + resting HR
  return {
    zone1: {
      min: Math.round(restingHR),
      max: Math.round(restingHR + hrReserve * 0.6)
    },
    zone2: {
      min: Math.round(restingHR + hrReserve * 0.6),
      max: Math.round(restingHR + hrReserve * 0.7)
    },
    zone3: {
      min: Math.round(restingHR + hrReserve * 0.7),
      max: Math.round(restingHR + hrReserve * 0.8)
    },
    zone4: {
      min: Math.round(restingHR + hrReserve * 0.8),
      max: Math.round(restingHR + hrReserve * 0.9)
    },
    zone5: {
      min: Math.round(restingHR + hrReserve * 0.9),
      max: Math.round(maxHR)
    }
  };
}

/**
 * Suggest HR zone for a segment based on gradient and fatigue
 */
export function suggestHRZoneForSegment(
  gradient: number,
  cumulativeDistance: number,
  hrZones: HRZones | null
): HRZoneSuggestion | undefined {
  if (!hrZones) return undefined;

  // Determine zone based on gradient and cumulative distance (fatigue)
  let zoneName: 'Zone 1' | 'Zone 2' | 'Zone 3' | 'Zone 4' | 'Zone 5';
  let reasoning: string;
  let targetZone: { min: number; max: number };

  // Fatigue factor: increase zone slightly as distance increases
  const fatigueBoost = Math.min(5, Math.floor(cumulativeDistance / 20)); // +5 bpm per 20 miles

  if (gradient < -5) {
    // Steep downhill: recovery (Zone 1-2)
    zoneName = 'Zone 1';
    targetZone = hrZones.zone1;
    reasoning = 'Downhill recovery - keep HR low';
  } else if (gradient < -2) {
    // Moderate downhill: easy aerobic (Zone 2)
    zoneName = 'Zone 2';
    targetZone = hrZones.zone2;
    reasoning = 'Gentle downhill - easy aerobic effort';
  } else if (gradient < 2) {
    // Flat: aerobic zone (Zone 2-3)
    zoneName = 'Zone 2';
    targetZone = hrZones.zone2;
    reasoning = 'Flat terrain - steady aerobic pace';
  } else if (gradient < 5) {
    // Moderate uphill: tempo zone (Zone 3)
    zoneName = 'Zone 3';
    targetZone = hrZones.zone3;
    reasoning = 'Moderate climb - tempo effort';
  } else if (gradient < 10) {
    // Steep uphill: threshold zone (Zone 3-4)
    zoneName = 'Zone 4';
    targetZone = hrZones.zone4;
    reasoning = 'Steep climb - threshold effort, hiking OK';
  } else {
    // Very steep: threshold to max (Zone 4-5)
    zoneName = 'Zone 4';
    targetZone = hrZones.zone4;
    reasoning = 'Very steep climb - power hike recommended';
  }

  return {
    minBPM: targetZone.min + fatigueBoost,
    maxBPM: targetZone.max + fatigueBoost,
    zoneName,
    reasoning
  };
}

// ============================================
// POWER ZONE CALCULATIONS
// ============================================

/**
 * Check if FIT file contains usable power data
 */
export function hasPowerData(fitData: ParsedFITData): boolean {
  const recordsWithPower = fitData.records.filter(r => r.power !== undefined && r.power > 0);
  return recordsWithPower.length > 100; // Need significant power data
}

/**
 * Calculate power zones from FIT data
 * Estimates FTP from race power if known FTP not provided
 */
export function calculatePowerZones(
  fitData: ParsedFITData,
  athleteSettings?: AthleteSettings
): PowerZones | null {
  const recordsWithPower = fitData.records.filter(r => r.power && r.power > 0);

  if (recordsWithPower.length < 100) {
    console.log('[Power Zones] Insufficient power data to calculate zones');
    return null; // Not enough data
  }

  // Use athlete's known FTP if provided
  let estimatedFTP: number;

  if (athleteSettings?.ftp) {
    estimatedFTP = athleteSettings.ftp;
    console.log('[Power Zones] Using athlete-provided FTP:', estimatedFTP);
  } else {
    // Estimate FTP from race data
    // For ultra races, average power is typically 60-70% of FTP
    // Use normalized power for better estimate
    const avgPower = recordsWithPower.reduce((sum, r) => sum + r.power!, 0) / recordsWithPower.length;
    estimatedFTP = Math.round(avgPower * 1.45); // Assume race was ~69% FTP
    console.log('[Power Zones] Estimated FTP from race data:', estimatedFTP, 'watts (avg power:', avgPower.toFixed(1), ')');
  }

  if (estimatedFTP <= 0 || isNaN(estimatedFTP)) {
    console.warn('[Power Zones] Invalid FTP, cannot calculate zones');
    return null;
  }

  return {
    easy: {
      min: 0,
      max: Math.round(estimatedFTP * 0.55),
      percentFTP: '0-55%'
    },
    moderate: {
      min: Math.round(estimatedFTP * 0.56),
      max: Math.round(estimatedFTP * 0.75),
      percentFTP: '56-75%'
    },
    tempo: {
      min: Math.round(estimatedFTP * 0.76),
      max: Math.round(estimatedFTP * 0.90),
      percentFTP: '76-90%'
    },
    threshold: {
      min: Math.round(estimatedFTP * 0.91),
      max: Math.round(estimatedFTP * 1.05),
      percentFTP: '91-105%'
    },
    vo2max: {
      min: Math.round(estimatedFTP * 1.06),
      max: Math.round(estimatedFTP * 1.20),
      percentFTP: '106-120%'
    }
  };
}

/**
 * Suggest power zone for a segment based on gradient and fatigue
 */
export function suggestPowerZoneForSegment(
  gradient: number,
  cumulativeDistance: number,
  powerZones: PowerZones | null
): PowerZoneSuggestion | undefined {
  if (!powerZones) return undefined;

  // Determine zone based on gradient
  let zoneName: 'Easy' | 'Moderate' | 'Tempo' | 'Threshold' | 'VO2max';
  let reasoning: string;
  let targetZone: { min: number; max: number; percentFTP: string };

  // Fatigue factor: reduce power target as distance increases
  const fatigueReduction = Math.min(0.15, cumulativeDistance / 200); // Up to 15% reduction over very long distances

  if (gradient < -5) {
    // Steep downhill: easy recovery
    zoneName = 'Easy';
    targetZone = powerZones.easy;
    reasoning = 'Downhill - easy recovery watts';
  } else if (gradient < -2) {
    // Moderate downhill: easy to moderate
    zoneName = 'Easy';
    targetZone = powerZones.easy;
    reasoning = 'Gentle downhill - maintain easy watts';
  } else if (gradient < 2) {
    // Flat: moderate pace
    zoneName = 'Moderate';
    targetZone = powerZones.moderate;
    reasoning = 'Flat terrain - steady moderate power';
  } else if (gradient < 5) {
    // Moderate uphill: tempo
    zoneName = 'Tempo';
    targetZone = powerZones.tempo;
    reasoning = 'Moderate climb - tempo power';
  } else if (gradient < 10) {
    // Steep uphill: tempo to threshold
    zoneName = 'Tempo';
    targetZone = powerZones.tempo;
    reasoning = 'Steep climb - sustained tempo, hiking OK';
  } else {
    // Very steep: tempo (power hiking)
    zoneName = 'Tempo';
    targetZone = powerZones.tempo;
    reasoning = 'Very steep - power hike at tempo';
  }

  // Apply fatigue reduction
  const min = Math.round(targetZone.min * (1 - fatigueReduction));
  const max = Math.round(targetZone.max * (1 - fatigueReduction));
  const percentMin = Math.round(parseFloat(targetZone.percentFTP.split('-')[0]) * (1 - fatigueReduction));
  const percentMax = Math.round(parseFloat(targetZone.percentFTP.split('-')[1].replace('%', '')) * (1 - fatigueReduction));

  return {
    minWatts: min,
    maxWatts: max,
    zoneName,
    percentageOfFTP: { min: percentMin, max: percentMax },
    reasoning
  };
}

/**
 * Calculate average pace for a set of records (min/mile)
 */
function calculateAveragePace(records: FITRecord[]): number {
  const validRecords = records.filter(r => r.pace && r.pace > 0 && r.pace < 30);

  if (validRecords.length === 0) {
    // Try to calculate from distance and time
    if (records.length >= 2) {
      const first = records[0];
      const last = records[records.length - 1];
      const distance = last.distance - first.distance;
      const timeSeconds = (last.timestamp.getTime() - first.timestamp.getTime()) / 1000;
      const timeMinutes = timeSeconds / 60;

      if (distance > 0 && isFinite(distance) && isFinite(timeMinutes)) {
        const pace = timeMinutes / distance;
        if (!isNaN(pace) && isFinite(pace) && pace > 0 && pace < 30) {
          return pace;
        }
      }
    }
    return 0;
  }

  const totalPace = validRecords.reduce((sum, r) => sum + (r.pace || 0), 0);
  const avgPace = totalPace / validRecords.length;

  // Guard against NaN
  if (isNaN(avgPace) || !isFinite(avgPace)) {
    return 0;
  }

  return avgPace;
}

/**
 * Calculate average heart rate for a set of records
 */
function calculateAverageHR(records: FITRecord[]): number | undefined {
  const validRecords = records.filter(r => r.heartRate && r.heartRate > 0);

  if (validRecords.length === 0) return undefined;

  const totalHR = validRecords.reduce((sum, r) => sum + (r.heartRate || 0), 0);
  return Math.round(totalHR / validRecords.length);
}

/**
 * Classify climb difficulty based on average gradient
 */
function classifyClimb(gradient: number, gainFeet: number): 'Very Steep' | 'Steep' | 'Moderate-Steep' | 'Moderate' | 'Gradual' | 'Flat/Rolling' {
  const absGradient = Math.abs(gradient);

  if (gainFeet < 50) return 'Flat/Rolling'; // Less than 50ft gain is basically flat
  if (absGradient >= 15) return 'Very Steep';
  if (absGradient >= 10) return 'Steep';
  if (absGradient >= 6) return 'Moderate-Steep';
  if (absGradient >= 3) return 'Moderate';
  if (absGradient >= 1) return 'Gradual';
  return 'Flat/Rolling';
}

// ============================================
// SEGMENT PACE DERIVATION
// ============================================

/**
 * Get terrain data for a specific segment
 */
export function getSegmentTerrainData(
  segment: Segment,
  _segmentIndex: number,
  gpxContent: string | null
): SegmentTerrainData {
  const distanceMiles = segment.segment_distance_miles;
  const cumulativeDistanceMiles = segment.cumulative_distance_miles;

  // Calculate elevation if GPX available
  let elevationGainFeet = 0;
  let elevationLossFeet = 0;
  let averageGradientPercent = 0;

  if (gpxContent) {
    const startDist = cumulativeDistanceMiles - distanceMiles;
    const endDist = cumulativeDistanceMiles;
    const elevStats = calculateSegmentElevation(gpxContent, startDist, endDist);

    if (elevStats) {
      elevationGainFeet = elevStats.gain * 3.28084; // meters to feet
      elevationLossFeet = elevStats.loss * 3.28084;

      // Calculate average gradient
      if (distanceMiles > 0) {
        const distanceMeters = distanceMiles * 1609.34;
        averageGradientPercent = (elevStats.gain / distanceMeters) * 100;
      }
    }
  }

  return {
    distanceMiles,
    cumulativeDistanceMiles,
    elevationGainFeet,
    elevationLossFeet,
    averageGradientPercent,
  };
}

/**
 * Get actual pace from FIT file at a specific distance range
 * Returns the average pace from the historical race at the same point
 */
function getActualPaceFromFITAtDistance(
  startMile: number,
  endMile: number,
  fitData: ParsedFITData
): number | null {
  const records = fitData.records;
  if (!records || records.length === 0) return null;

  // Find records within this distance range
  const matchingRecords = records.filter(
    r => r.distance >= startMile && r.distance <= endMile
  );

  if (matchingRecords.length < 5) return null; // Need at least 5 records for reliable data

  // Calculate average pace from these records
  const avgPace = calculateAveragePace(matchingRecords);

  if (avgPace === 0 || isNaN(avgPace) || !isFinite(avgPace)) {
    return null;
  }

  return avgPace;
}

/**
 * Find FIT file segments with similar gradient to the target segment
 */
function findSimilarGradientSegments(
  targetGradient: number,
  fitData: ParsedFITData
): FITRecord[] {
  const records = fitData.records;
  if (!records || records.length < 20) return [];

  const matchingRecords: FITRecord[] = [];
  const segmentSize = 0.25; // miles
  const gradientTolerance = 2.0; // % grade

  for (let i = 0; i < records.length - 10; i++) {
    const startRecord = records[i];
    const endIndex = records.findIndex(
      (r, idx) => idx > i && r.distance >= startRecord.distance + segmentSize
    );

    if (endIndex === -1 || endIndex - i < 5) continue;

    const endRecord = records[endIndex];
    const elevationChange = endRecord.elevation - startRecord.elevation;
    const distance = endRecord.distance - startRecord.distance;
    const gradient = (elevationChange / (distance * 1609.34)) * 100;

    // Check if gradient is similar
    if (Math.abs(gradient - targetGradient) <= gradientTolerance) {
      // Add all records in this segment
      matchingRecords.push(...records.slice(i, endIndex + 1));
    }
  }

  return matchingRecords;
}

/**
 * Derive pace for a specific segment
 */
export function deriveSegmentPace(
  segment: Segment,
  segmentIndex: number,
  config: AutoPaceConfig,
  gpxContent: string | null,
  fitData?: ParsedFITData
): DerivedPaceResult {
  const terrainData = getSegmentTerrainData(segment, segmentIndex, gpxContent);

  // Validate config baseline
  if (isNaN(config.baselineFlat) || !isFinite(config.baselineFlat) || config.baselineFlat <= 0) {
    console.warn('[deriveSegmentPace] Invalid baseline pace, using default');
    config.baselineFlat = 12.0;
  }

  // Try to get historical split data first (if FIT data is available)
  let historicalSplitPace: number | null = null;
  let similarGradientPace: number | null = null;

  if (fitData && fitData.records && fitData.records.length > 0) {
    // 1. Try to find pace at similar cumulative distance
    const startMile = terrainData.cumulativeDistanceMiles - terrainData.distanceMiles;
    const endMile = terrainData.cumulativeDistanceMiles;
    historicalSplitPace = getActualPaceFromFITAtDistance(startMile, endMile, fitData);

    // 2. If no direct match, try to find segments with similar gradient
    if (!historicalSplitPace && terrainData.averageGradientPercent !== 0) {
      const similarRecords = findSimilarGradientSegments(terrainData.averageGradientPercent, fitData);
      if (similarRecords.length >= 10) {
        similarGradientPace = calculateAveragePace(similarRecords);
      }
    }
  }

  // Start with baseline flat pace
  let adjustedPace = config.baselineFlat;
  const reasoning: string[] = [];

  // 1. Elevation adjustment
  let elevationAdjustment = 0;

  if (terrainData.distanceMiles > 0) {
    // Gain adjustment
    const gainAdjustmentSeconds = (terrainData.elevationGainFeet / 100) *
      (config.elevationGainFactor / terrainData.distanceMiles);

    // Loss adjustment (for steep descents)
    const lossAdjustmentSeconds = (terrainData.elevationLossFeet / 100) *
      (config.elevationLossFactor / terrainData.distanceMiles);

    elevationAdjustment = (gainAdjustmentSeconds + lossAdjustmentSeconds) / 60; // Convert to minutes

    // Guard against NaN
    if (isNaN(elevationAdjustment) || !isFinite(elevationAdjustment)) {
      console.warn('[deriveSegmentPace] Invalid elevation adjustment, resetting to 0');
      elevationAdjustment = 0;
    }
  }

  adjustedPace += elevationAdjustment;

  if (elevationAdjustment > 0.5) {
    const gainFeet = Math.round(terrainData.elevationGainFeet);
    const adjustSec = Math.round(elevationAdjustment * 60);
    reasoning.push(`+${adjustSec}s for ${gainFeet}ft climb`);
  } else if (elevationAdjustment > 0.1) {
    reasoning.push(`+${Math.round(elevationAdjustment * 60)}s for elevation`);
  }

  // 2. Terrain factor adjustment
  const terrainFactor = segment.terrain_factor ?? 1.0;
  let terrainAdjustment = 0;

  if (terrainFactor !== 1.0) {
    terrainAdjustment = adjustedPace * (terrainFactor - 1);
    adjustedPace *= terrainFactor;

    const terrainImpact = Math.round((terrainFactor - 1) * 100);
    if (terrainFactor > 1.0) {
      reasoning.push(`+${Math.round(terrainAdjustment * 60)}s terrain (${terrainImpact}% slower)`);
    } else {
      reasoning.push(`${Math.round(terrainAdjustment * 60)}s terrain (${Math.abs(terrainImpact)}% faster)`);
    }
  }

  // 3. Fatigue adjustment
  const milesCompleted = terrainData.cumulativeDistanceMiles - terrainData.distanceMiles;
  const fatigueMultiplier = 1 + (milesCompleted / 10) * (config.fatigueFactor / 100);
  const fatigueAdjustment = config.baselineFlat * (fatigueMultiplier - 1);

  // Guard against NaN
  if (isNaN(fatigueAdjustment) || !isFinite(fatigueAdjustment)) {
    console.warn('[deriveSegmentPace] Invalid fatigue adjustment, resetting to 0');
  } else {
    adjustedPace += fatigueAdjustment;
  }

  if (fatigueAdjustment > 0.25) {
    reasoning.push(`+${Math.round(fatigueAdjustment * 60)}s fatigue at ${Math.round(milesCompleted)}mi`);
  } else if (fatigueAdjustment > 0.08) {
    reasoning.push(`+${Math.round(fatigueAdjustment * 60)}s fatigue`);
  }

  // 4. Blend with historical data if available
  let finalPace = adjustedPace;

  if (historicalSplitPace && historicalSplitPace > 0) {
    // Weight towards historical data (70% historical, 30% calculated)
    finalPace = (historicalSplitPace * 0.7) + (adjustedPace * 0.3);
    const startMile = Math.round(terrainData.cumulativeDistanceMiles - terrainData.distanceMiles);
    const endMile = Math.round(terrainData.cumulativeDistanceMiles);
    reasoning.unshift(`Based on ${formatPaceMinPerMile(historicalSplitPace)} pace at miles ${startMile}-${endMile} in your FIT file`);
  } else if (similarGradientPace && similarGradientPace > 0) {
    // Weight towards similar gradient data (60% historical, 40% calculated)
    finalPace = (similarGradientPace * 0.6) + (adjustedPace * 0.4);
    reasoning.unshift(`Based on ${formatPaceMinPerMile(similarGradientPace)} pace on similar terrain in your FIT file`);
  }

  // Final validation of adjusted pace
  if (isNaN(finalPace) || !isFinite(finalPace) || finalPace <= 0) {
    console.error('[deriveSegmentPace] Final pace is invalid, using baseline');
    finalPace = config.baselineFlat;
  }

  // 5. Determine confidence (boost if we used historical data)
  let confidence = determineConfidence(terrainData, gpxContent !== null, historicalSplitPace !== null || similarGradientPace !== null);

  // 6. Calculate HR zone suggestion (NEW)
  const suggestedHRZone = suggestHRZoneForSegment(
    terrainData.averageGradientPercent,
    terrainData.cumulativeDistanceMiles,
    config.hrZones || null
  );

  // 7. Calculate power zone suggestion (NEW)
  const suggestedPowerZone = suggestPowerZoneForSegment(
    terrainData.averageGradientPercent,
    terrainData.cumulativeDistanceMiles,
    config.powerZones || null
  );

  // 8. Calculate elevation details (NEW)
  let elevationDetails: ElevationDetails | undefined;
  if (terrainData.elevationGainFeet > 0 || terrainData.elevationLossFeet > 0) {
    const climbType = classifyClimb(terrainData.averageGradientPercent, terrainData.elevationGainFeet);
    elevationDetails = {
      gainFeet: Math.round(terrainData.elevationGainFeet),
      lossFeet: Math.round(terrainData.elevationLossFeet),
      distanceMiles: parseFloat(terrainData.distanceMiles.toFixed(1)),
      avgGradientPercent: parseFloat(terrainData.averageGradientPercent.toFixed(1)),
      climbType,
      paceAdjustmentSeconds: Math.round(elevationAdjustment * 60)
    };
  }

  return {
    paceMinPerMile: finalPace,
    confidence,
    factors: {
      basePace: config.baselineFlat,
      elevationAdjustment,
      fatigueAdjustment: isNaN(fatigueAdjustment) ? 0 : fatigueAdjustment,
      totalAdjustment: elevationAdjustment + terrainAdjustment + (isNaN(fatigueAdjustment) ? 0 : fatigueAdjustment),
    },
    reasoning: reasoning.length > 0 ? reasoning.join(', ') : 'Standard terrain',
    suggestedHRZone,       // NEW
    suggestedPowerZone,    // NEW
    elevationDetails,      // NEW
  };
}

/**
 * Determine confidence level based on data quality and terrain similarity
 */
function determineConfidence(
  terrainData: SegmentTerrainData,
  hasGPX: boolean,
  hasHistoricalMatch: boolean
): 'high' | 'medium' | 'low' {
  let confidenceScore = 0;

  // Factor 1: Historical pace match (40 points) - highest weight
  if (hasHistoricalMatch) {
    confidenceScore += 40;
  }

  // Factor 2: GPX data available (25 points)
  if (hasGPX) {
    confidenceScore += 25;
  }

  // Factor 3: Gradient similarity (20 points)
  // If gradient is moderate (similar to typical trail running), high confidence
  const gradient = terrainData.averageGradientPercent;
  if (Math.abs(gradient) <= 5) {
    confidenceScore += 20; // Moderate terrain = high confidence
  } else if (Math.abs(gradient) <= 10) {
    confidenceScore += 12; // Steep but manageable
  } else {
    confidenceScore += 5; // Very steep = lower confidence
  }

  // Factor 4: Distance reasonable (15 points)
  if (terrainData.distanceMiles >= 0.5 && terrainData.distanceMiles <= 15) {
    confidenceScore += 15; // Normal segment distance
  } else if (terrainData.distanceMiles < 0.5) {
    confidenceScore += 8; // Very short segment
  } else {
    confidenceScore += 10; // Very long segment
  }

  // Determine confidence level
  if (confidenceScore >= 75) return 'high';
  if (confidenceScore >= 50) return 'medium';
  return 'low';
}

/**
 * Apply auto-pacing to all segments at once
 */
export async function applyAutoPacingToRace(
  segments: Segment[],
  fitData: ParsedFITData,
  gpxContent: string | null
): Promise<Map<number, DerivedPaceResult>> {
  const config = analyzeFITForPacing(fitData);
  const results = new Map<number, DerivedPaceResult>();

  for (let i = 0; i < segments.length; i++) {
    const segment = segments[i];
    if (segment.id !== undefined) {
      const result = deriveSegmentPace(segment, i, config, gpxContent, fitData);
      results.set(segment.id, result);
    }
  }

  return results;
}

/**
 * Format pace for display (e.g., "12:34")
 */
export function formatPaceMinPerMile(paceMinPerMile: number): string {
  const minutes = Math.floor(paceMinPerMile);
  const seconds = Math.round((paceMinPerMile - minutes) * 60);
  return `${minutes}:${seconds.toString().padStart(2, '0')}`;
}

/**
 * Generate multiple pace options for user selection
 * Creates three tiers: aggressive (-4%), balanced (0%), conservative (+4%)
 */
export function generatePaceOptions(
  derivedPace: number,
  confidence: 'high' | 'medium' | 'low',
  _reasoning: string,
  suggestedHRZone?: HRZoneSuggestion,        // NEW: HR zone from deriveSegmentPace
  suggestedPowerZone?: PowerZoneSuggestion    // NEW: Power zone from deriveSegmentPace
): Array<{
  tier: 'aggressive' | 'balanced' | 'conservative';
  paceMinPerMile: number;
  confidence: 'high' | 'medium' | 'low';
  adjustmentPercent: number;
  description: string;
  bestFor: string;
  suggestedHRZone?: HRZoneSuggestion;      // NEW
  suggestedPowerZone?: PowerZoneSuggestion; // NEW
}> {
  const AGGRESSIVE_ADJUSTMENT = -0.04; // 4% faster
  const CONSERVATIVE_ADJUSTMENT = 0.04; // 4% slower

  // Confidence adjustment logic
  const getAdjustedConfidence = (
    originalConfidence: 'high' | 'medium' | 'low',
    tier: 'aggressive' | 'balanced' | 'conservative'
  ): 'high' | 'medium' | 'low' => {
    if (tier === 'aggressive') {
      // Aggressive lowers confidence by one level
      return originalConfidence === 'high' ? 'medium' : 'low';
    }
    if (tier === 'conservative') {
      // Conservative boosts confidence by one level
      return originalConfidence === 'low' ? 'medium' : 'high';
    }
    return originalConfidence;
  };

  // Adjust HR zones for different pace tiers
  const adjustHRZoneForTier = (
    zone: HRZoneSuggestion | undefined,
    tier: 'aggressive' | 'balanced' | 'conservative'
  ): HRZoneSuggestion | undefined => {
    if (!zone) return undefined;

    // Aggressive pace = higher HR (~3-5 bpm increase)
    // Conservative pace = lower HR (~3-5 bpm decrease)
    const hrAdjustment = tier === 'aggressive' ? 4 : tier === 'conservative' ? -4 : 0;

    return {
      minBPM: Math.max(50, zone.minBPM + hrAdjustment), // Never go below 50 bpm
      maxBPM: Math.min(220, zone.maxBPM + hrAdjustment), // Cap at 220 bpm
      zoneName: zone.zoneName,
      reasoning: tier === 'balanced' ? zone.reasoning :
        tier === 'aggressive' ? `${zone.reasoning} (pushed effort)` :
          `${zone.reasoning} (conservative effort)`
    };
  };

  // Adjust power zones for different pace tiers
  const adjustPowerZoneForTier = (
    zone: PowerZoneSuggestion | undefined,
    tier: 'aggressive' | 'balanced' | 'conservative'
  ): PowerZoneSuggestion | undefined => {
    if (!zone) return undefined;

    // Aggressive pace = ~5% more power
    // Conservative pace = ~5% less power
    const powerMultiplier = tier === 'aggressive' ? 1.05 : tier === 'conservative' ? 0.95 : 1.0;

    return {
      minWatts: Math.round(zone.minWatts * powerMultiplier),
      maxWatts: Math.round(zone.maxWatts * powerMultiplier),
      zoneName: zone.zoneName,
      percentageOfFTP: {
        min: Math.round(zone.percentageOfFTP.min * powerMultiplier),
        max: Math.round(zone.percentageOfFTP.max * powerMultiplier)
      },
      reasoning: tier === 'balanced' ? zone.reasoning :
        tier === 'aggressive' ? `${zone.reasoning} (pushed watts)` :
          `${zone.reasoning} (conservative watts)`
    };
  };

  return [
    {
      tier: 'aggressive',
      paceMinPerMile: derivedPace * (1 + AGGRESSIVE_ADJUSTMENT),
      confidence: getAdjustedConfidence(confidence, 'aggressive'),
      adjustmentPercent: AGGRESSIVE_ADJUSTMENT * 100,
      description: 'Push 4% faster than your FIT performance',
      bestFor: 'Optimal conditions, strong training block',
      suggestedHRZone: adjustHRZoneForTier(suggestedHRZone, 'aggressive'),
      suggestedPowerZone: adjustPowerZoneForTier(suggestedPowerZone, 'aggressive'),
    },
    {
      tier: 'balanced',
      paceMinPerMile: derivedPace,
      confidence: confidence,
      adjustmentPercent: 0,
      description: 'Match your proven FIT performance',
      bestFor: 'Similar conditions to your reference race',
      suggestedHRZone: adjustHRZoneForTier(suggestedHRZone, 'balanced'),
      suggestedPowerZone: adjustPowerZoneForTier(suggestedPowerZone, 'balanced'),
    },
    {
      tier: 'conservative',
      paceMinPerMile: derivedPace * (1 + CONSERVATIVE_ADJUSTMENT),
      confidence: getAdjustedConfidence(confidence, 'conservative'),
      adjustmentPercent: CONSERVATIVE_ADJUSTMENT * 100,
      description: '4% slower buffer for safety margin',
      bestFor: 'Tough weather, unknown terrain, first attempt',
      suggestedHRZone: adjustHRZoneForTier(suggestedHRZone, 'conservative'),
      suggestedPowerZone: adjustPowerZoneForTier(suggestedPowerZone, 'conservative'),
    },
  ];
}

