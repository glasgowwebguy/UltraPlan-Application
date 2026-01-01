/**
 * GPX Pruning Utility
 * Reduces large GPX files to a manageable size while preserving route accuracy
 *
 * Key behaviors:
 * - Samples points at ~20m intervals (configurable)
 * - Always preserves first and last points
 * - Preserves significant elevation changes (>5m)
 * - Preserves direction changes (>15 degrees)
 * - Strips all extensions (HR, power, cadence, temp)
 * - Outputs clean GPX 1.0 format
 */

interface TrackPoint {
  lat: number;
  lon: number;
  ele: number;
}

interface PruneOptions {
  /** Minimum distance between points in meters (default: 20) */
  minDistanceMeters?: number;
  /** Maximum points to keep (default: 10000) */
  maxPoints?: number;
  /** Minimum elevation change to force keep a point in meters (default: 5) */
  elevationThreshold?: number;
  /** Minimum bearing change to force keep a point in degrees (default: 15) */
  bearingThreshold?: number;
}

const DEFAULT_OPTIONS: Required<PruneOptions> = {
  minDistanceMeters: 20,
  maxPoints: 10000,
  elevationThreshold: 5,
  bearingThreshold: 15,
};

/**
 * Calculate distance between two points using Haversine formula
 */
function calculateDistanceMeters(p1: TrackPoint, p2: TrackPoint): number {
  const R = 6371000; // Earth radius in meters
  const φ1 = (p1.lat * Math.PI) / 180;
  const φ2 = (p2.lat * Math.PI) / 180;
  const Δφ = ((p2.lat - p1.lat) * Math.PI) / 180;
  const Δλ = ((p2.lon - p1.lon) * Math.PI) / 180;

  const a =
    Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
    Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c;
}

/**
 * Calculate bearing between two points in degrees (0-360)
 */
function calculateBearing(p1: TrackPoint, p2: TrackPoint): number {
  const φ1 = (p1.lat * Math.PI) / 180;
  const φ2 = (p2.lat * Math.PI) / 180;
  const Δλ = ((p2.lon - p1.lon) * Math.PI) / 180;

  const y = Math.sin(Δλ) * Math.cos(φ2);
  const x = Math.cos(φ1) * Math.sin(φ2) - Math.sin(φ1) * Math.cos(φ2) * Math.cos(Δλ);
  const θ = Math.atan2(y, x);

  return ((θ * 180) / Math.PI + 360) % 360;
}

/**
 * Calculate bearing difference (handles wrap-around at 360)
 */
function bearingDifference(b1: number, b2: number): number {
  let diff = Math.abs(b1 - b2);
  if (diff > 180) {
    diff = 360 - diff;
  }
  return diff;
}

/**
 * Parse GPX content and extract track points
 * Handles various GPX formats including:
 * - Standard GPX 1.0/1.1
 * - Namespaced elements (gpx:trkpt)
 * - Missing or invalid elevation data
 * - Multiple track segments
 */
function parseGPXToPoints(gpxContent: string): TrackPoint[] {
  const parser = new DOMParser();
  const xmlDoc = parser.parseFromString(gpxContent, 'text/xml');

  // Check for parsing errors
  const parseError = xmlDoc.querySelector('parsererror');
  if (parseError) {
    console.error('[GPX Parser] XML parse error:', parseError.textContent);
    throw new Error('Invalid GPX file format');
  }

  // Try standard trkpt first, then namespaced versions
  let trkpts = xmlDoc.getElementsByTagName('trkpt');

  // If no trkpt found, try with namespace prefix
  if (trkpts.length === 0) {
    trkpts = xmlDoc.getElementsByTagNameNS('*', 'trkpt');
    console.log('[GPX Parser] Using namespace query, found:', trkpts.length);
  }

  // Also try route points (rtept) if no track points
  if (trkpts.length === 0) {
    trkpts = xmlDoc.getElementsByTagName('rtept');
    console.log('[GPX Parser] No trkpt found, trying rtept:', trkpts.length);
  }

  const points: TrackPoint[] = [];

  // For interpolating missing elevation data
  let lastValidElevation = 0;
  const elevationGaps: number[] = [];

  for (let i = 0; i < trkpts.length; i++) {
    const trkpt = trkpts[i];
    const lat = parseFloat(trkpt.getAttribute('lat') || '0');
    const lon = parseFloat(trkpt.getAttribute('lon') || '0');

    // Robust elevation parsing
    let ele = 0;
    let hasValidElevation = false;

    // Try multiple methods to find elevation
    const eleNode = trkpt.getElementsByTagName('ele')[0] ||
                    trkpt.getElementsByTagNameNS('*', 'ele')[0];

    if (eleNode && eleNode.textContent) {
      const trimmed = eleNode.textContent.trim();
      if (trimmed && trimmed.toLowerCase() !== 'nan' && trimmed !== '') {
        const parsed = parseFloat(trimmed);
        if (!isNaN(parsed) && isFinite(parsed)) {
          // Sanity check: elevation should be between -500m and 9000m
          if (parsed >= -500 && parsed <= 9000) {
            ele = parsed;
            lastValidElevation = ele;
            hasValidElevation = true;
          } else {
            console.warn('[GPX Parser] Elevation out of range at point', i, ':', parsed);
          }
        }
      }
    }

    // Track gaps for later interpolation
    if (!hasValidElevation) {
      elevationGaps.push(i);
      ele = lastValidElevation; // Use last valid as fallback
    }

    // Only add point if lat/lon are valid
    if (!isNaN(lat) && !isNaN(lon) && lat !== 0 && lon !== 0) {
      points.push({ lat, lon, ele });
    }
  }

  // Log statistics
  if (elevationGaps.length > 0) {
    console.log('[GPX Parser] Points missing elevation:', elevationGaps.length, 'of', trkpts.length);
  }

  return points;
}

/**
 * Extract track/route name from GPX
 */
function extractGPXName(gpxContent: string): string {
  const parser = new DOMParser();
  const xmlDoc = parser.parseFromString(gpxContent, 'text/xml');

  // Try <trk><name> first
  const trkName = xmlDoc.querySelector('trk > name');
  if (trkName?.textContent) {
    return trkName.textContent;
  }

  // Try <metadata><name>
  const metaName = xmlDoc.querySelector('metadata > name');
  if (metaName?.textContent) {
    return metaName.textContent;
  }

  // Try top-level <name>
  const topName = xmlDoc.querySelector('gpx > name');
  if (topName?.textContent) {
    return topName.textContent;
  }

  return 'Unnamed Route';
}

/**
 * Prune track points using distance-based sampling with smart preservation
 */
function prunePoints(points: TrackPoint[], options: Required<PruneOptions>): TrackPoint[] {
  if (points.length <= 2) {
    return points;
  }

  const pruned: TrackPoint[] = [points[0]]; // Always keep first point
  let lastKeptPoint = points[0];
  let lastBearing: number | null = null;

  for (let i = 1; i < points.length - 1; i++) {
    const currentPoint = points[i];

    const distanceFromLast = calculateDistanceMeters(lastKeptPoint, currentPoint);
    const elevationChange = Math.abs(currentPoint.ele - lastKeptPoint.ele);

    // Calculate bearing change if we have a previous bearing
    let bearingChange = 0;
    if (lastBearing !== null) {
      const currentBearing = calculateBearing(lastKeptPoint, currentPoint);
      bearingChange = bearingDifference(lastBearing, currentBearing);
    }

    // Decide whether to keep this point
    const shouldKeep =
      // Distance threshold met
      distanceFromLast >= options.minDistanceMeters ||
      // Significant elevation change
      elevationChange >= options.elevationThreshold ||
      // Significant direction change
      bearingChange >= options.bearingThreshold;

    if (shouldKeep) {
      pruned.push(currentPoint);
      lastBearing = calculateBearing(lastKeptPoint, currentPoint);
      lastKeptPoint = currentPoint;
    }
  }

  // Always keep last point
  pruned.push(points[points.length - 1]);

  // If still too many points, apply secondary sampling
  if (pruned.length > options.maxPoints) {
    const step = Math.ceil(pruned.length / options.maxPoints);
    const resampled: TrackPoint[] = [pruned[0]];

    for (let i = step; i < pruned.length - 1; i += step) {
      resampled.push(pruned[i]);
    }

    resampled.push(pruned[pruned.length - 1]);
    return resampled;
  }

  return pruned;
}

/**
 * Generate clean GPX 1.0 XML from pruned points
 * Ensures no NaN values in output
 */
function generatePrunedGPX(points: TrackPoint[], routeName: string): string {
  const header = `<?xml version="1.0" encoding="UTF-8"?>
<gpx version="1.0" creator="UltraPlan GPX Pruner"
 xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
 xmlns="http://www.topografix.com/GPX/1/0" xsi:schemaLocation="http://www.topografix.com/GPX/1/0 http://www.topografix.com/GPX/1/0/gpx.xsd">
  <name>${escapeXml(routeName)}</name>
  <trk>
    <name>${escapeXml(routeName)}</name>
    <trkseg>
`;

  const trackPoints = points
    .map((p) => {
      // Sanitize all values to prevent NaN/Infinity in output
      const lat = (isNaN(p.lat) || !isFinite(p.lat)) ? 0 : p.lat;
      const lon = (isNaN(p.lon) || !isFinite(p.lon)) ? 0 : p.lon;
      const ele = (isNaN(p.ele) || !isFinite(p.ele)) ? 0 : p.ele;
      return `      <trkpt lat="${lat.toFixed(7)}" lon="${lon.toFixed(7)}"><ele>${ele.toFixed(1)}</ele></trkpt>`;
    })
    .join('\n');

  const footer = `
    </trkseg>
  </trk>
</gpx>`;

  return header + trackPoints + footer;
}

/**
 * Escape special XML characters
 */
function escapeXml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

/**
 * Main pruning function - takes raw GPX content and returns pruned GPX content
 */
export function pruneGPX(gpxContent: string, options?: PruneOptions): string {
  const opts = { ...DEFAULT_OPTIONS, ...options };

  console.log('[GPX Pruner] Starting pruning...');

  // Parse original GPX
  const originalPoints = parseGPXToPoints(gpxContent);
  console.log('[GPX Pruner] Original points:', originalPoints.length);

  // If already small enough, return original
  if (originalPoints.length <= opts.maxPoints) {
    console.log('[GPX Pruner] File already small enough, no pruning needed');
    return gpxContent;
  }

  // Extract route name
  const routeName = extractGPXName(gpxContent);
  console.log('[GPX Pruner] Route name:', routeName);

  // Prune points
  const prunedPoints = prunePoints(originalPoints, opts);
  console.log('[GPX Pruner] Pruned points:', prunedPoints.length);
  console.log('[GPX Pruner] Reduction:', ((1 - prunedPoints.length / originalPoints.length) * 100).toFixed(1) + '%');

  // Generate clean GPX
  const prunedGPX = generatePrunedGPX(prunedPoints, routeName);
  console.log('[GPX Pruner] Output size:', (prunedGPX.length / 1024).toFixed(1) + 'KB');

  return prunedGPX;
}

/**
 * Normalize GPX file to clean GPX 1.0 format
 * ALWAYS processes the file, unlike pruneGPX which skips small files
 *
 * This is essential because:
 * - Some GPX files have missing/invalid elevation data
 * - Some have namespace prefixes (gpx:trkpt)
 * - Some have extensions that confuse parsers
 * - Some have encoding issues
 *
 * By always normalizing, we ensure consistent, parseable output
 */
export function normalizeGPX(gpxContent: string, options?: PruneOptions): string {
  const opts = { ...DEFAULT_OPTIONS, ...options };

  console.log('[GPX Normalizer] Starting normalization...');

  // Parse original GPX
  const originalPoints = parseGPXToPoints(gpxContent);
  console.log('[GPX Normalizer] Original points:', originalPoints.length);

  // Check for parsing failure
  if (originalPoints.length === 0) {
    console.error('[GPX Normalizer] Failed to parse any points from GPX file');
    // Return original content if we can't parse it - let downstream handle the error
    return gpxContent;
  }

  // Validate elevation data
  const pointsWithValidElevation = originalPoints.filter(p =>
    typeof p.ele === 'number' && !isNaN(p.ele) && isFinite(p.ele) && p.ele !== 0
  ).length;

  const elevationCoverage = (pointsWithValidElevation / originalPoints.length * 100).toFixed(1);
  console.log('[GPX Normalizer] Points with valid elevation:', pointsWithValidElevation, `(${elevationCoverage}%)`);

  if (pointsWithValidElevation < originalPoints.length * 0.5) {
    console.warn('[GPX Normalizer] WARNING: Less than 50% of points have valid elevation data');
  }

  // Extract route name
  const routeName = extractGPXName(gpxContent);
  console.log('[GPX Normalizer] Route name:', routeName);

  // Determine if we need to prune (still apply pruning logic if file is large)
  let pointsToOutput = originalPoints;
  if (originalPoints.length > opts.maxPoints) {
    pointsToOutput = prunePoints(originalPoints, opts);
    console.log('[GPX Normalizer] Pruned to:', pointsToOutput.length, 'points');
  }

  // Generate clean, normalized GPX output
  const normalizedGPX = generatePrunedGPX(pointsToOutput, routeName);

  console.log('[GPX Normalizer] Output size:', (normalizedGPX.length / 1024).toFixed(1) + 'KB');
  console.log('[GPX Normalizer] Normalization complete');

  return normalizedGPX;
}

/**
 * Check if a GPX file needs pruning
 */
export function needsPruning(gpxContent: string, maxPoints: number = 10000): boolean {
  const points = parseGPXToPoints(gpxContent);
  return points.length > maxPoints;
}

/**
 * Get GPX statistics for display
 */
export function getGPXStats(gpxContent: string): {
  pointCount: number;
  estimatedDistance: number;
  hasExtensions: boolean;
} {
  const points = parseGPXToPoints(gpxContent);

  let totalDistance = 0;
  for (let i = 1; i < points.length; i++) {
    totalDistance += calculateDistanceMeters(points[i - 1], points[i]);
  }

  // Check for extensions
  const hasExtensions = gpxContent.includes('<extensions>');

  return {
    pointCount: points.length,
    estimatedDistance: totalDistance / 1609.34, // Convert to miles
    hasExtensions,
  };
}
