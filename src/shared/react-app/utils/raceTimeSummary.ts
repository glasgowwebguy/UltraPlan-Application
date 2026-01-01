/**
 * Race Time Summary Utilities
 *
 * Calculates comprehensive time breakdowns showing:
 * - Running time (actual moving time)
 * - Checkpoint time (aid station stops)
 * - Total race time (running + checkpoint)
 */

import type { Segment, Race } from '@/shared/types';

export interface CheckpointTimeBreakdown {
  segmentId: number;
  checkpointName: string;
  stopTimeMinutes: number;
  hasSupportCrew: boolean;
}

export interface RaceTimeSummary {
  totalRunningTimeMinutes: number;
  totalCheckpointTimeMinutes: number;
  totalRaceTimeMinutes: number;
  totalDistanceMiles: number;
  checkpointBreakdown: CheckpointTimeBreakdown[];
}

/**
 * Calculate comprehensive race time summary
 */
export function calculateRaceTimeSummary(
  segments: Segment[],
  _race: Race
): RaceTimeSummary {
  let totalRunningTimeMinutes = 0;
  let totalCheckpointTimeMinutes = 0;
  const checkpointBreakdown: CheckpointTimeBreakdown[] = [];

  for (const segment of segments) {
    // Add running time
    const runningTime = segment.predicted_segment_time_minutes ?? 0;
    totalRunningTimeMinutes += runningTime;

    // Add checkpoint time (aid station stop)
    const checkpointTime = segment.checkpoint_time_minutes ?? 0;
    totalCheckpointTimeMinutes += checkpointTime;

    if (checkpointTime > 0) {
      checkpointBreakdown.push({
        segmentId: segment.id ?? 0,
        checkpointName: segment.checkpoint_name,
        stopTimeMinutes: checkpointTime,
        hasSupportCrew: segment.support_crew_present ?? false,
      });
    }
  }

  const totalRaceTimeMinutes = totalRunningTimeMinutes + totalCheckpointTimeMinutes;

  // Calculate total distance from segments
  const totalDistanceMiles = segments.reduce(
    (sum, segment) => sum + (segment.segment_distance_miles ?? 0),
    0
  );

  return {
    totalRunningTimeMinutes,
    totalCheckpointTimeMinutes,
    totalRaceTimeMinutes,
    totalDistanceMiles,
    checkpointBreakdown,
  };
}

/**
 * Format time breakdown for display
 */
export function formatTimeSummary(summary: RaceTimeSummary): {
  runningTime: string;
  checkpointTime: string;
  totalTime: string;
} {
  return {
    runningTime: formatMinutesToTime(summary.totalRunningTimeMinutes),
    checkpointTime: formatMinutesToTime(summary.totalCheckpointTimeMinutes),
    totalTime: formatMinutesToTime(summary.totalRaceTimeMinutes),
  };
}

/**
 * Format minutes to HH:MM:SS
 */
function formatMinutesToTime(minutes: number): string {
  const hours = Math.floor(minutes / 60);
  const mins = Math.floor(minutes % 60);
  const secs = Math.floor((minutes % 1) * 60);

  if (hours > 0) {
    return `${hours}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

/**
 * Suggest checkpoint times based on segment characteristics
 */
export function suggestCheckpointTime(segment: Segment): number {
  // If already set, return existing value
  if (segment.checkpoint_time_minutes && segment.checkpoint_time_minutes > 0) {
    return segment.checkpoint_time_minutes;
  }

  let suggestedMinutes = 2; // Default: quick stop

  // Support crew present: longer stop for gear changes, etc.
  if (segment.support_crew_present) {
    suggestedMinutes = 7; // 5-10 min typical
  }

  // Has nutrition items: add time for eating/drinking
  if (segment.segment_nutrition_items) {
    try {
      const items = JSON.parse(segment.segment_nutrition_items);
      if (Array.isArray(items) && items.length > 3) {
        suggestedMinutes += 2; // More nutrition = more time
      }
    } catch {
      // Invalid JSON, ignore
    }
  }

  // Long segment: probably need more recovery time at checkpoint
  if (segment.segment_distance_miles > 15) {
    suggestedMinutes += 3;
  }

  // Cap at reasonable maximum
  return Math.min(suggestedMinutes, 15);
}

/**
 * Get checkpoint time presets for UI quick-select
 */
export function getCheckpointTimePresets(): Array<{
  label: string;
  minutes: number;
  description: string;
}> {
  return [
    {
      label: 'Quick Stop',
      minutes: 2,
      description: 'Grab and go',
    },
    {
      label: 'Regular',
      minutes: 5,
      description: 'Standard aid station',
    },
    {
      label: 'Extended',
      minutes: 10,
      description: 'Crew support, refuel',
    },
    {
      label: 'Major Stop',
      minutes: 15,
      description: 'Gear change, medical',
    },
  ];
}

/**
 * Calculate running time percentage (excluding stops)
 */
export function calculateRunningTimePercentage(summary: RaceTimeSummary): number {
  if (summary.totalRaceTimeMinutes === 0) return 100;
  return (summary.totalRunningTimeMinutes / summary.totalRaceTimeMinutes) * 100;
}

/**
 * Calculate average checkpoint time
 */
export function calculateAverageCheckpointTime(summary: RaceTimeSummary): number {
  if (summary.checkpointBreakdown.length === 0) return 0;
  return summary.totalCheckpointTimeMinutes / summary.checkpointBreakdown.length;
}

/**
 * Calculate average pace (min per mile) from running time and distance
 */
export function calculateAveragePace(summary: RaceTimeSummary): number {
  if (summary.totalDistanceMiles === 0) return 0;
  return summary.totalRunningTimeMinutes / summary.totalDistanceMiles;
}

/**
 * Format pace as MM:SS per mile
 */
export function formatPace(paceMinPerMile: number): string {
  if (paceMinPerMile === 0 || !isFinite(paceMinPerMile)) return '--:--';
  const minutes = Math.floor(paceMinPerMile);
  const seconds = Math.round((paceMinPerMile - minutes) * 60);
  return `${minutes}:${seconds.toString().padStart(2, '0')}`;
}
