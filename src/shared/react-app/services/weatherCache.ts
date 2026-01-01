/**
 * Weather Cache Service
 *
 * Caches weather data in localStorage to minimize API calls and improve performance.
 * Cache expires after 6 hours for near-term forecasts.
 */

import type { WeatherStatus } from './weatherService';

interface WeatherCacheEntry {
  data: WeatherStatus;
  fetchedAt: number;
  expiresAt: number;
}

interface WeatherCache {
  [key: string]: WeatherCacheEntry;
}

const CACHE_KEY = 'ultraplan_weather_cache';
const CACHE_DURATION = 6 * 60 * 60 * 1000; // 6 hours in milliseconds

/**
 * Load weather cache from localStorage
 */
function loadCache(): WeatherCache {
  try {
    const cached = localStorage.getItem(CACHE_KEY);
    if (!cached) return {};

    const cache: WeatherCache = JSON.parse(cached);

    // Clean up expired entries
    const now = Date.now();
    const cleanedCache: WeatherCache = {};

    for (const [key, entry] of Object.entries(cache)) {
      if (entry.expiresAt > now) {
        cleanedCache[key] = entry;
      }
    }

    return cleanedCache;
  } catch (error) {
    console.error('Error loading weather cache:', error);
    return {};
  }
}

/**
 * Save weather cache to localStorage
 */
function saveCache(cache: WeatherCache): void {
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify(cache));
  } catch (error) {
    console.error('Error saving weather cache:', error);
    // If quota exceeded, clear old cache and try again
    if (error instanceof DOMException && error.name === 'QuotaExceededError') {
      clearCache();
    }
  }
}

/**
 * Get weather data from cache
 */
export function getCachedWeather(cacheKey: string): WeatherStatus | null {
  const cache = loadCache();
  const entry = cache[cacheKey];

  if (!entry) return null;

  // Check if expired
  if (entry.expiresAt <= Date.now()) {
    return null;
  }

  return entry.data;
}

/**
 * Set weather data in cache
 */
export function setCachedWeather(cacheKey: string, data: WeatherStatus): void {
  const cache = loadCache();
  const now = Date.now();

  cache[cacheKey] = {
    data,
    fetchedAt: now,
    expiresAt: now + CACHE_DURATION
  };

  saveCache(cache);
}

/**
 * Clear all weather cache
 */
export function clearCache(): void {
  try {
    localStorage.removeItem(CACHE_KEY);
  } catch (error) {
    console.error('Error clearing weather cache:', error);
  }
}

/**
 * Clear expired cache entries
 */
export function cleanExpiredCache(): void {
  const cache = loadCache();
  saveCache(cache); // This will automatically clean expired entries
}
