/**
 * GPX segmentation utilities
 * Splits GPX track into segments based on checkpoint locations
 */

import type { Segment } from '../../shared/types';
import { getSegmentColor } from './mapColors';

export interface TrackPoint {
  lat: number;
  lng: number;
}

export interface RouteSegment {
  points: TrackPoint[];
  color: string;
  segmentIndex: number;
  checkpointName?: string;
}

/**
 * Calculate distance between two points using Haversine formula
 * Returns distance in meters
 */
function calculateDistance(point1: TrackPoint, point2: TrackPoint): number {
  const R = 6371e3; // Earth's radius in meters
  const φ1 = (point1.lat * Math.PI) / 180;
  const φ2 = (point2.lat * Math.PI) / 180;
  const Δφ = ((point2.lat - point1.lat) * Math.PI) / 180;
  const Δλ = ((point2.lng - point1.lng) * Math.PI) / 180;

  const a =
    Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
    Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c;
}

/**
 * Find the closest track point to a given checkpoint
 */
function findClosestTrackPoint(
  checkpoint: { latitude: number; longitude: number },
  trackPoints: TrackPoint[],
  searchStartIndex: number = 0
): number {
  let minDistance = Infinity;
  let closestIndex = searchStartIndex;

  for (let i = searchStartIndex; i < trackPoints.length; i++) {
    const distance = calculateDistance(
      { lat: checkpoint.latitude, lng: checkpoint.longitude },
      trackPoints[i]
    );

    if (distance < minDistance) {
      minDistance = distance;
      closestIndex = i;
    }

    // Optimization: if we've found a very close point and start moving away, stop searching
    if (minDistance < 50 && distance > minDistance * 2) {
      break;
    }
  }

  return closestIndex;
}

/**
 * Split track points into segments based on checkpoint locations
 */
export function splitTrackByCheckpoints(
  trackPoints: TrackPoint[],
  segments: Segment[]
): RouteSegment[] {
  if (trackPoints.length === 0) {
    return [];
  }

  // Filter segments that have coordinates
  const checkpoints = segments
    .filter((s) => s.latitude && s.longitude)
    .sort((a, b) => a.segment_order - b.segment_order);

  // If no checkpoints, return single segment
  if (checkpoints.length === 0) {
    return [
      {
        points: trackPoints,
        color: getSegmentColor(0),
        segmentIndex: 0,
      },
    ];
  }

  const routeSegments: RouteSegment[] = [];
  let currentStartIndex = 0;

  // Find checkpoint positions in track
  const checkpointIndices = checkpoints.map((checkpoint, idx) => ({
    index: findClosestTrackPoint(
      { latitude: checkpoint.latitude!, longitude: checkpoint.longitude! },
      trackPoints,
      currentStartIndex
    ),
    checkpoint,
    segmentOrder: idx,
  }));

  // Sort by track index to ensure correct order
  checkpointIndices.sort((a, b) => a.index - b.index);

  // Create segments between checkpoints
  for (let i = 0; i < checkpointIndices.length; i++) {
    const endIndex = checkpointIndices[i].index;

    if (endIndex > currentStartIndex) {
      const segmentPoints = trackPoints.slice(currentStartIndex, endIndex + 1);

      routeSegments.push({
        points: segmentPoints,
        color: getSegmentColor(i),
        segmentIndex: i,
        checkpointName: checkpointIndices[i].checkpoint.checkpoint_name,
      });
    }

    currentStartIndex = endIndex;
  }

  // Add final segment from last checkpoint to end
  if (currentStartIndex < trackPoints.length - 1) {
    const finalSegment = trackPoints.slice(currentStartIndex);
    routeSegments.push({
      points: finalSegment,
      color: getSegmentColor(routeSegments.length),
      segmentIndex: routeSegments.length,
    });
  }

  return routeSegments;
}

/**
 * Calculate bearing between two points
 * Returns bearing in degrees (0-360)
 */
export function calculateBearing(point1: TrackPoint, point2: TrackPoint): number {
  const φ1 = (point1.lat * Math.PI) / 180;
  const φ2 = (point2.lat * Math.PI) / 180;
  const Δλ = ((point2.lng - point1.lng) * Math.PI) / 180;

  const y = Math.sin(Δλ) * Math.cos(φ2);
  const x = Math.cos(φ1) * Math.sin(φ2) - Math.sin(φ1) * Math.cos(φ2) * Math.cos(Δλ);
  const θ = Math.atan2(y, x);

  return ((θ * 180) / Math.PI + 360) % 360;
}

/**
 * Sample track points at regular distance intervals
 * Useful for flyover animation
 */
export function sampleTrackPoints(
  trackPoints: TrackPoint[],
  intervalMeters: number = 100
): TrackPoint[] {
  if (trackPoints.length < 2) {
    return trackPoints;
  }

  const sampledPoints: TrackPoint[] = [trackPoints[0]];
  let distanceAccumulator = 0;

  for (let i = 1; i < trackPoints.length; i++) {
    const distance = calculateDistance(trackPoints[i - 1], trackPoints[i]);
    distanceAccumulator += distance;

    if (distanceAccumulator >= intervalMeters) {
      sampledPoints.push(trackPoints[i]);
      distanceAccumulator = 0;
    }
  }

  // Always include the last point
  if (sampledPoints[sampledPoints.length - 1] !== trackPoints[trackPoints.length - 1]) {
    sampledPoints.push(trackPoints[trackPoints.length - 1]);
  }

  return sampledPoints;
}
