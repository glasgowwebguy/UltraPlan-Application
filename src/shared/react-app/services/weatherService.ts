/**
 * Weather Service for Open-Meteo API Integration
 *
 * Fetches weather forecast data for race checkpoints using the free Open-Meteo API.
 * Supports historical data (2+ years back) and forecast data (16 days ahead).
 *
 * API Documentation: https://open-meteo.com/en/docs
 */

export interface WeatherData {
  condition: 'clear' | 'partly-cloudy' | 'cloudy' | 'rain' | 'thunderstorm' | 'snow' | 'fog' | 'windy' | 'rain-showers' | 'snow-showers';
  temperature: number; // Celsius
  windSpeed: number; // km/h
  precipitation: number; // mm
  cloudCover: number; // percentage
  icon: string; // Emoji
  weatherCode: number; // WMO code
}

export interface WeatherStatus {
  available: boolean;
  reason?: 'too-far-future' | 'no-coordinates' | 'api-error' | 'no-start-time' | 'too-far-past';
  data?: WeatherData;
  daysUntilRace?: number;
}

/**
 * Map WMO Weather interpretation codes to weather conditions and icons
 * Reference: https://open-meteo.com/en/docs
 */
export function mapWeatherCodeToCondition(weatherCode: number): { condition: WeatherData['condition'], icon: string } {
  // WMO Weather interpretation codes (WW)
  if (weatherCode === 0) return { condition: 'clear', icon: '☀️' }; // Clear sky
  if (weatherCode === 1) return { condition: 'partly-cloudy', icon: '🌤️' }; // Mainly clear
  if (weatherCode === 2) return { condition: 'partly-cloudy', icon: '⛅' }; // Partly cloudy
  if (weatherCode === 3) return { condition: 'cloudy', icon: '☁️' }; // Overcast
  if (weatherCode >= 45 && weatherCode <= 48) return { condition: 'fog', icon: '🌫️' }; // Fog
  if (weatherCode >= 51 && weatherCode <= 57) return { condition: 'rain', icon: '🌧️' }; // Drizzle
  if (weatherCode >= 61 && weatherCode <= 67) return { condition: 'rain', icon: '🌧️' }; // Rain
  if (weatherCode >= 71 && weatherCode <= 77) return { condition: 'snow', icon: '🌨️' }; // Snow fall
  if (weatherCode >= 80 && weatherCode <= 82) return { condition: 'rain-showers', icon: '🌧️' }; // Rain showers
  if (weatherCode >= 85 && weatherCode <= 86) return { condition: 'snow-showers', icon: '🌨️' }; // Snow showers
  if (weatherCode >= 95 && weatherCode <= 99) return { condition: 'thunderstorm', icon: '⛈️' }; // Thunderstorm

  // Default cloudy
  return { condition: 'cloudy', icon: '☁️' };
}

/**
 * Fetch weather data for a checkpoint at a specific date/time
 */
export async function fetchCheckpointWeather(
  latitude: number,
  longitude: number,
  etaDateTime: Date,
  raceStartDateTime: Date
): Promise<WeatherStatus> {
  const now = new Date();
  const daysUntilRace = Math.floor(
    (raceStartDateTime.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
  );

  // Check if weather data is available based on forecast window
  if (daysUntilRace > 16) {
    return {
      available: false,
      reason: 'too-far-future',
      daysUntilRace
    };
  }

  // Check if race is too far in the past (>2 years)
  if (daysUntilRace < -730) {
    return {
      available: false,
      reason: 'too-far-past',
      daysUntilRace
    };
  }

  try {
    // Format date for API (YYYY-MM-DD)
    const dateStr = etaDateTime.toISOString().split('T')[0];

    // Determine if we need historical or forecast API
    const apiType = daysUntilRace < 0 ? 'archive' : 'forecast';
    const baseUrl = apiType === 'archive'
      ? 'https://archive-api.open-meteo.com/v1/archive'
      : 'https://api.open-meteo.com/v1/forecast';

    // Build API URL
    const url = new URL(baseUrl);
    url.searchParams.append('latitude', latitude.toFixed(6));
    url.searchParams.append('longitude', longitude.toFixed(6));
    url.searchParams.append('hourly', 'temperature_2m,precipitation,weathercode,windspeed_10m,cloudcover');
    url.searchParams.append('timezone', 'auto');
    url.searchParams.append('start_date', dateStr);
    url.searchParams.append('end_date', dateStr);

    const response = await fetch(url.toString());

    if (!response.ok) {
      throw new Error(`Weather API error: ${response.status}`);
    }

    const data = await response.json();

    // Find the closest hour to the ETA
    const etaHour = etaDateTime.getHours();
    const hourlyData = data.hourly;

    if (!hourlyData || !hourlyData.time || hourlyData.time.length === 0) {
      throw new Error('No weather data available for this date');
    }

    // Find the index for the closest hour
    let closestIndex = 0;
    let minDiff = Infinity;

    for (let i = 0; i < hourlyData.time.length; i++) {
      const timeStr = hourlyData.time[i];
      const hour = parseInt(timeStr.split('T')[1].split(':')[0]);
      const diff = Math.abs(hour - etaHour);

      if (diff < minDiff) {
        minDiff = diff;
        closestIndex = i;
      }
    }

    // Extract weather data for the closest hour
    const temperature = hourlyData.temperature_2m[closestIndex];
    const precipitation = hourlyData.precipitation[closestIndex];
    const weatherCode = hourlyData.weathercode[closestIndex];
    const windSpeed = hourlyData.windspeed_10m[closestIndex];
    const cloudCover = hourlyData.cloudcover[closestIndex];

    // Map weather code to condition and icon
    const { condition, icon } = mapWeatherCodeToCondition(weatherCode);

    const weatherData: WeatherData = {
      condition,
      temperature,
      windSpeed,
      precipitation,
      cloudCover,
      icon,
      weatherCode
    };

    return {
      available: true,
      data: weatherData,
      daysUntilRace
    };
  } catch (error) {
    console.error('Error fetching weather data:', error);
    return {
      available: false,
      reason: 'api-error',
      daysUntilRace
    };
  }
}

/**
 * Get user-friendly message for unavailable weather
 */
export function getUnavailableMessage(weather: WeatherStatus | null): string {
  if (!weather) {
    return 'Weather data unavailable';
  }

  switch (weather.reason) {
    case 'too-far-future':
      return 'Weather forecast will be available a few days before race day';
    case 'too-far-past':
      return 'Historical weather data not available for this date';
    case 'no-coordinates':
      return 'Upload GPX file to enable weather forecast';
    case 'no-start-time':
      return 'Set race start time to view weather';
    case 'api-error':
      return 'Weather data temporarily unavailable';
    default:
      return 'Weather data unavailable';
  }
}

/**
 * Generate a cache key for weather data
 */
export function getWeatherCacheKey(lat: number, lng: number, date: Date): string {
  return `weather_${lat.toFixed(4)}_${lng.toFixed(4)}_${date.toISOString().split('T')[0]}_${date.getHours()}`;
}
