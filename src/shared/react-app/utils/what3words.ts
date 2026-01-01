/**
 * Generate a what3words-style address from coordinates
 * Note: This is a simple hash-based generator, not the official what3words API
 * For production use, integrate with the official what3words API
 */

const wordList = [
  'table', 'chair', 'house', 'garden', 'river', 'mountain', 'forest', 'ocean',
  'cloud', 'stone', 'apple', 'orange', 'lemon', 'grape', 'cherry', 'peach',
  'tiger', 'lion', 'eagle', 'dolphin', 'whale', 'shark', 'rabbit', 'deer',
  'piano', 'guitar', 'violin', 'drums', 'flute', 'trumpet', 'saxophone', 'harp',
  'book', 'pen', 'paper', 'desk', 'lamp', 'phone', 'computer', 'screen',
  'bread', 'butter', 'cheese', 'milk', 'coffee', 'tea', 'water', 'juice',
  'red', 'blue', 'green', 'yellow', 'purple', 'orange', 'pink', 'brown',
  'happy', 'calm', 'bright', 'warm', 'cool', 'soft', 'hard', 'smooth',
  'north', 'south', 'east', 'west', 'center', 'edge', 'corner', 'middle',
  'spring', 'summer', 'autumn', 'winter', 'morning', 'evening', 'night', 'day',
  'silver', 'gold', 'bronze', 'copper', 'iron', 'steel', 'diamond', 'ruby',
  'swift', 'gentle', 'strong', 'brave', 'wise', 'kind', 'bold', 'quiet',
  'circle', 'square', 'triangle', 'star', 'moon', 'sun', 'planet', 'comet',
  'stream', 'lake', 'pond', 'creek', 'bay', 'shore', 'beach', 'cliff',
  'valley', 'hill', 'peak', 'ridge', 'slope', 'trail', 'path', 'road',
  'maple', 'oak', 'pine', 'birch', 'willow', 'elm', 'ash', 'cedar',
];

function simpleHash(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32bit integer
  }
  return Math.abs(hash);
}

export function coordinatesToWhat3Words(latitude: number, longitude: number): string {
  // Round coordinates to create consistent 3x3 meter squares
  const lat = Math.floor(latitude * 10000) / 10000;
  const lon = Math.floor(longitude * 10000) / 10000;

  // Generate three words from coordinates
  const seed1 = simpleHash(`${lat}`);
  const seed2 = simpleHash(`${lon}`);
  const seed3 = simpleHash(`${lat}${lon}`);

  const word1 = wordList[seed1 % wordList.length];
  const word2 = wordList[seed2 % wordList.length];
  const word3 = wordList[seed3 % wordList.length];

  return `${word1}.${word2}.${word3}`;
}

export function getCoordinatesFromGPX(
  gpxContent: string,
  targetDistanceMiles: number
): { latitude: number; longitude: number } | null {
  try {
    const parser = new DOMParser();
    const xmlDoc = parser.parseFromString(gpxContent, 'text/xml');
    const trkpts = xmlDoc.getElementsByTagName('trkpt');

    if (trkpts.length === 0) {
      return null;
    }

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
        return { latitude: lat, longitude: lon };
      }

      previousLat = lat;
      previousLon = lon;
    }

    // If target distance is beyond GPX data, return last point
    if (trkpts.length > 0) {
      const lastTrkpt = trkpts[trkpts.length - 1];
      return {
        latitude: parseFloat(lastTrkpt.getAttribute('lat') || '0'),
        longitude: parseFloat(lastTrkpt.getAttribute('lon') || '0'),
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
