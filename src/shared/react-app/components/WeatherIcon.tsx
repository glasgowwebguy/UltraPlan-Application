/**
 * WeatherIcon Component
 *
 * Displays weather forecast icon for a checkpoint based on ETA.
 * Shows weather conditions with hover tooltip for detailed information.
 * Displays "Not Available" badge when weather data cannot be fetched.
 */

import { useState, useEffect } from 'react';
import type { Segment } from '@/shared/types';
import {
  fetchCheckpointWeather,
  getUnavailableMessage,
  getWeatherCacheKey,
  type WeatherStatus
} from '@/react-app/services/weatherService';
import { getCachedWeather, setCachedWeather } from '@/react-app/services/weatherCache';

interface WeatherIconProps {
  segment: Segment;
  eta: Date;
  raceStartTime: string;
}

export default function WeatherIcon({ segment, eta, raceStartTime }: WeatherIconProps) {
  const [weather, setWeather] = useState<WeatherStatus | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadWeather() {
      // Check if segment has coordinates
      if (!segment.latitude || !segment.longitude) {
        setWeather({
          available: false,
          reason: 'no-coordinates'
        });
        setLoading(false);
        return;
      }

      // Check if race has start time
      if (!raceStartTime) {
        setWeather({
          available: false,
          reason: 'no-start-time'
        });
        setLoading(false);
        return;
      }

      try {
        const raceStart = new Date(raceStartTime);

        // Generate cache key
        const cacheKey = getWeatherCacheKey(
          segment.latitude,
          segment.longitude,
          eta
        );

        // Check cache first
        const cached = getCachedWeather(cacheKey);
        if (cached) {
          setWeather(cached);
          setLoading(false);
          return;
        }

        // Fetch from API
        const weatherData = await fetchCheckpointWeather(
          segment.latitude,
          segment.longitude,
          eta,
          raceStart
        );

        // Cache the result
        setCachedWeather(cacheKey, weatherData);

        setWeather(weatherData);
      } catch (error) {
        console.error('Error loading weather:', error);
        setWeather({
          available: false,
          reason: 'api-error'
        });
      } finally {
        setLoading(false);
      }
    }

    loadWeather();
  }, [segment.latitude, segment.longitude, eta, raceStartTime]);

  // Loading state
  if (loading) {
    return (
      <span className="text-xs text-gray-400 animate-pulse">
        ...
      </span>
    );
  }

  // Weather not available - show "Not Available" badge with tooltip
  if (!weather?.available) {
    return (
      <div className="relative group">
        <span
          className="text-xs px-1.5 py-0.5 bg-gray-600/30 text-gray-400 rounded border border-gray-600/50 cursor-help"
          title="Weather data not available"
        >
          ❓
        </span>
        {/* Tooltip */}
        <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 hidden group-hover:block w-48 p-2 bg-gray-900 text-white text-xs rounded shadow-lg z-10 pointer-events-none">
          <div className="text-center">{getUnavailableMessage(weather)}</div>
          <div className="absolute top-full left-1/2 -translate-x-1/2 -mt-1 w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-gray-900"></div>
        </div>
      </div>
    );
  }

  // Weather available - show icon with tooltip
  const { data } = weather;
  if (!data) return null;

  // Convert temperature to Fahrenheit for display
  const tempF = Math.round((data.temperature * 9/5) + 32);
  const windSpeedMph = Math.round(data.windSpeed * 0.621371);

  return (
    <div className="relative group flex items-center gap-1">
      <span
        className="text-lg cursor-help"
        title={`${data.condition} - ${tempF}°F`}
      >
        {data.icon}
      </span>
      <span className="text-xs text-gray-300 font-medium cursor-help" title={`${data.condition} - ${tempF}°F`}>
        {tempF}°F
      </span>
      {/* Tooltip with detailed weather info */}
      <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 hidden group-hover:block w-44 p-2 bg-gray-900 text-white text-xs rounded shadow-lg z-10 pointer-events-none">
        <div className="space-y-1">
          <div className="font-semibold capitalize text-center border-b border-gray-700 pb-1">
            {data.condition.replace('-', ' ')}
          </div>
          <div className="flex justify-between">
            <span className="text-gray-400">Temperature:</span>
            <span className="font-medium">{tempF}°F ({data.temperature.toFixed(1)}°C)</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-400">Wind:</span>
            <span className="font-medium">{windSpeedMph} mph ({data.windSpeed.toFixed(1)} km/h)</span>
          </div>
          {data.precipitation > 0 && (
            <div className="flex justify-between">
              <span className="text-gray-400">Precipitation:</span>
              <span className="font-medium">{data.precipitation.toFixed(1)} mm</span>
            </div>
          )}
          <div className="flex justify-between">
            <span className="text-gray-400">Cloud Cover:</span>
            <span className="font-medium">{data.cloudCover}%</span>
          </div>
        </div>
        {/* Tooltip arrow */}
        <div className="absolute top-full left-1/2 -translate-x-1/2 -mt-1 w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-gray-900"></div>
      </div>
    </div>
  );
}
