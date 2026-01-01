/**
 * Geolocation Service
 * Fetches detailed location data from ipapi.co free API
 * Includes IP address, city, region, postal code, and country
 */

const GEO_CACHE_KEY = 'ultraplan_geo_data';
const GEO_API_URL = 'https://ipapi.co/json/';
const IP_ONLY_URL = 'https://ipapi.co/ip/';
const API_TIMEOUT = 5000; // 5 seconds

export interface GeoLocationData {
  ip: string;
  country: string;       // country_name from API
  countryCode: string;   // country_code from API
  region: string;        // region from API (full name)
  regionCode: string;    // region_code from API (e.g., "QC")
  city: string;
  postal: string;        // Postal/ZIP code
  latitude?: number;
  longitude?: number;
  timezone: string;
  org?: string;          // ISP/Organization
}

interface ApiResponse {
  ip: string;
  city: string;
  region: string;
  region_code: string;
  country_name: string;
  country_code: string;
  postal: string;
  latitude: number;
  longitude: number;
  timezone: string;
  org: string;
  error?: boolean;
  reason?: string;
}

/**
 * Fetch geolocation data from ipapi.co
 * Returns cached data if available, otherwise fetches fresh data
 * Returns null on failure (never throws)
 */
export async function fetchGeoLocation(): Promise<GeoLocationData | null> {
  try {
    // Check cache first
    const cached = sessionStorage.getItem(GEO_CACHE_KEY);
    if (cached) {
      try {
        return JSON.parse(cached);
      } catch {
        // Invalid cache, fetch fresh
      }
    }

    // Fetch with timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), API_TIMEOUT);

    const response = await fetch(GEO_API_URL, {
      signal: controller.signal,
    });
    clearTimeout(timeoutId);

    if (!response.ok) {
      console.warn('[GeoLocation] API returned non-OK status:', response.status);
      return null;
    }

    const data: ApiResponse = await response.json();

    // Check for API error response
    if (data.error) {
      console.warn('[GeoLocation] API error:', data.reason);
      return null;
    }

    // Map API response to our interface
    const geoData: GeoLocationData = {
      ip: data.ip,
      country: data.country_name,
      countryCode: data.country_code,
      region: data.region,
      regionCode: data.region_code,
      city: data.city,
      postal: data.postal,
      latitude: data.latitude,
      longitude: data.longitude,
      timezone: data.timezone,
      org: data.org,
    };

    // Cache the result
    sessionStorage.setItem(GEO_CACHE_KEY, JSON.stringify(geoData));
    console.log('[GeoLocation] Fetched and cached geo data:', geoData.city, geoData.region, geoData.country);

    return geoData;
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') {
      console.warn('[GeoLocation] Request timed out');
    } else {
      console.warn('[GeoLocation] Failed to fetch geo data:', error);
    }
    return null;
  }
}

/**
 * Fetch only the IP address (lightweight endpoint)
 * Used for login records where we want fresh IP, not cached
 * Returns undefined on failure (never throws)
 */
export async function fetchIPAddress(): Promise<string | undefined> {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), API_TIMEOUT);

    const response = await fetch(IP_ONLY_URL, {
      signal: controller.signal,
    });
    clearTimeout(timeoutId);

    if (!response.ok) {
      return undefined;
    }

    const ip = await response.text();
    return ip.trim();
  } catch {
    return undefined;
  }
}

/**
 * Clear cached geo data
 */
export function clearGeoCache(): void {
  sessionStorage.removeItem(GEO_CACHE_KEY);
}
