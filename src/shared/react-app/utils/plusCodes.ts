/**
 * Generate a Google Plus Code (Open Location Code) from coordinates
 * Based on the official Google Open Location Code reference implementation
 * Reference: https://github.com/google/open-location-code
 */

// Plus Codes character set (excludes similar looking characters)
const CODE_ALPHABET = '23456789CFGHJMPQRVWX';
const SEPARATOR = '+';

// Grid parameters
const ENCODING_BASE = 20;
const LATITUDE_MAX = 90;
const LONGITUDE_MAX = 180;
const PAIR_CODE_LENGTH = 10;
const PAIR_FIRST_PLACE_VALUE = ENCODING_BASE; // Initial grid size: 20 degrees

/**
 * Clip latitude to the valid range
 */
function clipLatitude(latitude: number): number {
  return Math.min(90, Math.max(-90, latitude));
}

/**
 * Normalize longitude to be in the range -180 to 180
 */
function normalizeLongitude(longitude: number): number {
  while (longitude < -180) {
    longitude += 360;
  }
  while (longitude >= 180) {
    longitude -= 360;
  }
  return longitude;
}

/**
 * Encode latitude and longitude into a Plus Code
 * @param latitude - Latitude in degrees (-90 to 90)
 * @param longitude - Longitude in degrees (-180 to 180)
 * @param codeLength - Length of code to generate (default 10 for ~14m precision)
 * @returns Plus Code string (e.g., "9C3W9QCJ+2V")
 */
export function coordinatesToPlusCode(
  latitude: number,
  longitude: number,
  codeLength: number = 10
): string {
  // Validate and normalize inputs
  latitude = clipLatitude(latitude);
  longitude = normalizeLongitude(longitude);

  // Adjust latitude for special case at the north pole
  if (latitude === 90) {
    latitude -= 0.000125; // Small adjustment for precision
  }

  // Normalize coordinates to positive values
  // Latitude: -90 to 90 → 0 to 180
  // Longitude: -180 to 180 → 0 to 360
  let lat = latitude + LATITUDE_MAX;
  let lng = longitude + LONGITUDE_MAX;

  let code = '';

  // Start with the largest grid size (20 degrees)
  let latPlaceValue = PAIR_FIRST_PLACE_VALUE;
  let lngPlaceValue = PAIR_FIRST_PLACE_VALUE;

  // Generate pairs of digits (latitude, longitude)
  for (let i = 0; i < Math.min(codeLength, PAIR_CODE_LENGTH) / 2; i++) {
    // Get the digit for this position
    const latDigit = Math.floor(lat / latPlaceValue);
    const lngDigit = Math.floor(lng / lngPlaceValue);

    // Encode latitude first, then longitude (this is the correct order for Plus Codes)
    code += CODE_ALPHABET[latDigit] + CODE_ALPHABET[lngDigit];

    // Subtract the encoded portion
    lat -= latDigit * latPlaceValue;
    lng -= lngDigit * lngPlaceValue;

    // Move to the next finer grid (divide by 20)
    latPlaceValue /= ENCODING_BASE;
    lngPlaceValue /= ENCODING_BASE;

    // Add separator after the 4th pair (8 characters)
    if (i === 3) {
      code += SEPARATOR;
    }
  }

  // Ensure we have exactly the requested code length + separator
  while (code.length < codeLength + 1) {
    code += '0';
  }

  return code.substring(0, codeLength + 1); // +1 for separator
}

export function getCoordinatesFromGPX(
  gpxContent: string,
  targetDistanceMiles: number
): { latitude: number; longitude: number } | null {
  try {
    console.log(`[Plus Code] Extracting coordinates for distance: ${targetDistanceMiles} miles`);
    const parser = new DOMParser();
    const xmlDoc = parser.parseFromString(gpxContent, 'text/xml');
    const trkpts = xmlDoc.getElementsByTagName('trkpt');

    if (trkpts.length === 0) {
      console.log('[Plus Code] No track points found in GPX');
      return null;
    }

    console.log(`[Plus Code] Found ${trkpts.length} track points`);

    let cumulativeDistance = 0;
    let previousLat: number | null = null;
    let previousLon: number | null = null;

    for (let i = 0; i < trkpts.length; i++) {
      const trkpt = trkpts[i];
      const lat = parseFloat(trkpt.getAttribute('lat') || '0');
      const lon = parseFloat(trkpt.getAttribute('lon') || '0');

      if (i > 0 && previousLat !== null && previousLon !== null) {
        const dist = calculateDistance(previousLat, previousLon, lat, lon);
        cumulativeDistance += dist;
      }

      // If we've reached or passed the target distance, return these coordinates
      if (cumulativeDistance >= targetDistanceMiles) {
        console.log(`[Plus Code] Found coordinates at ${cumulativeDistance.toFixed(2)} miles: ${lat}, ${lon}`);
        return { latitude: lat, longitude: lon };
      }

      previousLat = lat;
      previousLon = lon;
    }

    // If target distance is beyond GPX data, return last point
    if (trkpts.length > 0) {
      const lastTrkpt = trkpts[trkpts.length - 1];
      const lastLat = parseFloat(lastTrkpt.getAttribute('lat') || '0');
      const lastLon = parseFloat(lastTrkpt.getAttribute('lon') || '0');
      console.log(`[Plus Code] Target distance ${targetDistanceMiles} beyond GPX data (${cumulativeDistance.toFixed(2)} miles), returning last point: ${lastLat}, ${lastLon}`);
      return {
        latitude: lastLat,
        longitude: lastLon,
      };
    }

    return null;
  } catch (error) {
    console.error('Error extracting coordinates from GPX:', error);
    return null;
  }
}

function calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 3959; // Earth radius in miles
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}
