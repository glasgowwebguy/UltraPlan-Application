/**
 * ETA (Expected Time of Arrival) calculation utilities
 * For calculating checkpoint arrival times based on race start time and segment durations
 */

import type { Segment, SegmentETA } from '@/shared/types';

/**
 * Calculate the ETA for a specific checkpoint/segment
 * @param raceStartTime ISO 8601 datetime string of race start
 * @param segments Array of all segments in order
 * @param checkpointIndex Index of the checkpoint to calculate ETA for
 * @returns SegmentETA object or null if no start time
 */
export function calculateSegmentETA(
  raceStartTime: string | null | undefined,
  segments: Segment[],
  checkpointIndex: number
): SegmentETA | null {
  if (!raceStartTime || !segments[checkpointIndex]) {
    return null;
  }

  try {
    const startDate = new Date(raceStartTime);

    // Calculate cumulative time to this checkpoint
    // Including both segment time AND time spent at checkpoint
    let cumulativeMinutes = 0;
    for (let i = 0; i <= checkpointIndex; i++) {
      const segmentTime = segments[i].predicted_segment_time_minutes || 0;
      const checkpointTime = segments[i].checkpoint_time_minutes || 0;
      cumulativeMinutes += segmentTime + checkpointTime;
    }

    // Calculate ETA by adding cumulative minutes to start time
    const eta = new Date(startDate.getTime() + cumulativeMinutes * 60 * 1000);

    // Get this segment's duration
    const segmentTimeMinutes = segments[checkpointIndex].predicted_segment_time_minutes || 0;

    // Format the ETA
    const formattedTime = formatTime(eta);
    const formatted24h = format24Hour(eta);
    const dayOfWeek = getDayOfWeek(eta);
    const fullDate = formatFullDate(eta);

    // Check if we cross midnight from start to this checkpoint
    const crossesMidnight = startDate.getDate() !== eta.getDate();

    // Determine if it's daylight or night
    const { isDaylight, isNight } = getDaylightStatus(eta);

    return {
      eta,
      formattedTime,
      formatted24h,
      dayOfWeek,
      fullDate,
      cumulativeTimeMinutes: cumulativeMinutes,
      segmentTimeMinutes,
      isDaylight,
      isNight,
      crossesMidnight,
    };
  } catch (error) {
    console.error('Error calculating ETA:', error);
    return null;
  }
}

/**
 * Format time as 12-hour format (e.g., "2:30 PM")
 * Rounds to the nearest minute
 */
export function formatTime(date: Date): string {
  // Round to nearest minute (30 seconds or more rounds up)
  const rounded = new Date(date);
  if (rounded.getSeconds() >= 30) {
    rounded.setMinutes(rounded.getMinutes() + 1);
  }
  rounded.setSeconds(0);
  rounded.setMilliseconds(0);

  return rounded.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });
}

/**
 * Format time as 24-hour format (e.g., "14:30")
 * Rounds to the nearest minute
 */
export function format24Hour(date: Date): string {
  // Round to nearest minute (30 seconds or more rounds up)
  const rounded = new Date(date);
  if (rounded.getSeconds() >= 30) {
    rounded.setMinutes(rounded.getMinutes() + 1);
  }
  rounded.setSeconds(0);
  rounded.setMilliseconds(0);

  return rounded.toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });
}

/**
 * Get day of week (e.g., "Saturday")
 */
export function getDayOfWeek(date: Date): string {
  return date.toLocaleDateString('en-US', { weekday: 'long' });
}

/**
 * Format full date and time (e.g., "Jun 15, 2:30 PM")
 * Rounds to the nearest minute
 */
export function formatFullDate(date: Date): string {
  // Round to nearest minute (30 seconds or more rounds up)
  const rounded = new Date(date);
  if (rounded.getSeconds() >= 30) {
    rounded.setMinutes(rounded.getMinutes() + 1);
  }
  rounded.setSeconds(0);
  rounded.setMilliseconds(0);

  return rounded.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });
}

/**
 * Format duration in minutes to readable format (e.g., "7h 30m")
 */
export function formatDuration(minutes: number): string {
  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;
  const mins = Math.floor(remainingMinutes);
  const secs = Math.round((remainingMinutes - mins) * 60);

  if (hours === 0) {
    if (secs > 0) {
      return `${mins}m ${secs}s`;
    }
    return `${mins}m`;
  }

  if (secs > 0) {
    return `${hours}h ${mins}m ${secs}s`;
  }
  return `${hours}h ${mins}m`;
}

/**
 * Determine if a given time is during daylight or night
 * Uses simplified calculation based on standard 6 AM - 8 PM daylight hours
 * In a future version, this could use SunCalc library with actual coordinates
 */
export function getDaylightStatus(
  dateTime: Date
): { isDaylight: boolean; isNight: boolean } {
  // Simplified daylight calculation
  // In future: Use SunCalc.getTimes(dateTime, latitude, longitude) for accurate sunrise/sunset
  const hour = dateTime.getHours();

  // Assume daylight hours are 6 AM to 8 PM if no coordinates
  // This is a rough approximation - actual sunrise/sunset varies by location and season
  const isDaylight = hour >= 6 && hour < 20;
  const isNight = !isDaylight;

  return { isDaylight, isNight };
}

/**
 * Get the user's current timezone
 */
export function getUserTimezone(): string {
  return Intl.DateTimeFormat().resolvedOptions().timeZone;
}

/**
 * Format race start date/time for display
 * @param startDateTime ISO 8601 datetime string
 * @param timezone IANA timezone string
 * @returns Formatted string like "Saturday, June 15 at 7:00 AM EDT"
 */
export function formatRaceStartTime(
  startDateTime: string | null | undefined,
  timezone?: string | null
): string {
  if (!startDateTime) {
    return 'Not set';
  }

  try {
    const date = new Date(startDateTime);
    const options: Intl.DateTimeFormatOptions = {
      weekday: 'long',
      month: 'long',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
      timeZoneName: 'short',
    };

    if (timezone) {
      options.timeZone = timezone;
    }

    return date.toLocaleString('en-US', options);
  } catch (error) {
    console.error('Error formatting race start time:', error);
    return 'Invalid date';
  }
}

/**
 * Calculate the finish time for the race
 */
export function calculateFinishTime(
  raceStartTime: string | null | undefined,
  segments: Segment[]
): SegmentETA | null {
  if (!raceStartTime || segments.length === 0) {
    return null;
  }

  // Calculate ETA for the last segment (finish)
  return calculateSegmentETA(
    raceStartTime,
    segments,
    segments.length - 1
  );
}
