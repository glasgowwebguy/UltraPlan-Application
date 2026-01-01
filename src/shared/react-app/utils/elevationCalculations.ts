export interface ElevationStats {
  gain: number; // meters
  loss: number; // meters
  maxElevation: number; // meters
  minElevation: number; // meters
  netElevation: number; // meters (gain - loss)
}

/**
 * Calculate distance between two coordinates (Haversine formula)
 */
function calculateDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 3959; // Earth radius in miles
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

/**
 * Calculate elevation gain/loss for a segment between two distances
 * @param gpxContent - GPX file XML content
 * @param startDistanceMiles - Starting cumulative distance
 * @param endDistanceMiles - Ending cumulative distance
 * @returns Elevation statistics or null if no GPX data
 */
export function calculateSegmentElevation(
  gpxContent: string,
  startDistanceMiles: number,
  endDistanceMiles: number
): ElevationStats | null {
  try {
    const parser = new DOMParser();
    const xmlDoc = parser.parseFromString(gpxContent, 'text/xml');
    const trkpts = xmlDoc.getElementsByTagName('trkpt');

    if (trkpts.length === 0) {
      return null;
    }

    // Build array of points with distance and elevation
    const points: Array<{ distance: number; elevation: number }> = [];
    let cumulativeDistance = 0;
    let previousLat: number | null = null;
    let previousLon: number | null = null;

    for (let i = 0; i < trkpts.length; i++) {
      const trkpt = trkpts[i];
      const lat = parseFloat(trkpt.getAttribute('lat') || '0');
      const lon = parseFloat(trkpt.getAttribute('lon') || '0');
      const eleNode = trkpt.getElementsByTagName('ele')[0];
      const elevation = eleNode ? parseFloat(eleNode.textContent || '0') : 0;

      // Calculate distance from previous point
      if (i > 0 && previousLat !== null && previousLon !== null) {
        const dist = calculateDistance(previousLat, previousLon, lat, lon);
        cumulativeDistance += dist;
      }

      points.push({ distance: cumulativeDistance, elevation });
      previousLat = lat;
      previousLon = lon;
    }

    // Filter points within segment range
    const segmentPoints = points.filter(
      p => p.distance >= startDistanceMiles && p.distance <= endDistanceMiles
    );

    if (segmentPoints.length < 2) {
      return null;
    }

    // Calculate elevation statistics
    let gain = 0;
    let loss = 0;
    let maxElevation = segmentPoints[0].elevation;
    let minElevation = segmentPoints[0].elevation;

    for (let i = 1; i < segmentPoints.length; i++) {
      const elevationChange = segmentPoints[i].elevation - segmentPoints[i - 1].elevation;

      if (elevationChange > 0) {
        gain += elevationChange;
      } else if (elevationChange < 0) {
        loss += Math.abs(elevationChange);
      }

      maxElevation = Math.max(maxElevation, segmentPoints[i].elevation);
      minElevation = Math.min(minElevation, segmentPoints[i].elevation);
    }

    return {
      gain: Math.round(gain),
      loss: Math.round(loss),
      maxElevation: Math.round(maxElevation),
      minElevation: Math.round(minElevation),
      netElevation: Math.round(gain - loss)
    };
  } catch (error) {
    console.error('Error calculating segment elevation:', error);
    return null;
  }
}

/**
 * Format elevation for display
 * @param meters - Elevation in meters
 * @param showFeet - Whether to show feet (if false, shows meters)
 */
export function formatElevation(meters: number, showFeet: boolean = true): string {
  if (showFeet) {
    const feet = Math.round(meters * 3.28084);
    return `${feet} ft`;
  }
  return `${Math.round(meters)} m`;
}

/**
 * Get elevation icon based on gain/loss ratio
 */
export function getElevationIcon(stats: ElevationStats): string {
  const netElevation = stats.netElevation;

  if (netElevation > 100) return '⛰️'; // Significant climb
  if (netElevation > 20) return '🔺'; // Moderate climb
  if (netElevation < -100) return '⬇️'; // Significant descent
  if (netElevation < -20) return '🔻'; // Moderate descent
  return '➡️'; // Relatively flat
}

/**
 * Calculate average gradient percentage
 * @param elevationGainMeters - Elevation gain in meters
 * @param distanceMiles - Distance in miles
 */
export function calculateGradient(elevationGainMeters: number, distanceMiles: number): number {
  if (distanceMiles === 0) return 0;
  const distanceMeters = distanceMiles * 1609.34;
  return (elevationGainMeters / distanceMeters) * 100;
}

/**
 * Get difficulty color based on elevation gain
 * @param gainFeet - Elevation gain in feet
 */
export function getDifficultyColor(gainFeet: number): string {
  if (gainFeet > 500) return 'text-red-400';
  if (gainFeet > 300) return 'text-orange-400';
  if (gainFeet > 100) return 'text-yellow-400';
  return 'text-green-400';
}
