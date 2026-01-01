/**
 * Unit conversion utilities for distance and pace
 *
 * Internal storage is always in miles and min/mile
 * Conversions happen at display time only
 */

const MILES_TO_KM = 1.60934;
const KM_TO_MILES = 1 / 1.60934;

// ==================== Distance Conversions ====================

/**
 * Convert miles to kilometers
 */
export const milesToKm = (miles: number): number => {
  return miles * MILES_TO_KM;
};

/**
 * Convert kilometers to miles
 */
export const kmToMiles = (km: number): number => {
  return km * KM_TO_MILES;
};

// ==================== Pace Conversions ====================

/**
 * Convert pace from min/mile to min/km
 * Note: min/km will be a smaller number (faster) than min/mile
 */
export const paceMinPerMileToPaceMinPerKm = (minPerMile: number): number => {
  return minPerMile * KM_TO_MILES;
};

/**
 * Convert pace from min/km to min/mile
 */
export const paceMinPerKmToPaceMinPerMile = (minPerKm: number): number => {
  return minPerKm * MILES_TO_KM;
};

// ==================== Formatting Functions ====================

/**
 * Format distance with appropriate unit
 * @param miles - Distance in miles (internal storage format)
 * @param useMiles - Whether to display in miles (true) or kilometers (false)
 * @param decimals - Number of decimal places (default: 1)
 * @returns Formatted string like "10.0 mi" or "16.1 km"
 */
export const formatDistance = (
  miles: number,
  useMiles: boolean,
  decimals: number = 1
): string => {
  const value = useMiles ? miles : milesToKm(miles);
  const unit = useMiles ? 'mi' : 'km';
  return `${value.toFixed(decimals)} ${unit}`;
};

/**
 * Format pace with appropriate unit
 * @param minPerMile - Pace in minutes per mile (internal storage format)
 * @param useMiles - Whether to display in min/mile (true) or min/km (false)
 * @returns Formatted string like "9:30/mi" or "5:54/km"
 */
export const formatPace = (minPerMile: number, useMiles: boolean): string => {
  // Handle invalid values (NaN, Infinity, or negative)
  if (!isFinite(minPerMile) || minPerMile < 0) {
    return '--:--' + (useMiles ? '/mi' : '/km');
  }

  const pace = useMiles ? minPerMile : paceMinPerMileToPaceMinPerKm(minPerMile);
  const unit = useMiles ? '/mi' : '/km';
  const minutes = Math.floor(pace);
  const seconds = Math.round((pace - minutes) * 60);
  return `${minutes}:${seconds.toString().padStart(2, '0')}${unit}`;
};

/**
 * Get just the numeric distance value without unit
 * @param miles - Distance in miles (internal storage format)
 * @param useMiles - Whether to return miles (true) or kilometers (false)
 * @returns Numeric value in the requested unit
 */
export const getDistanceValue = (miles: number, useMiles: boolean): number => {
  return useMiles ? miles : milesToKm(miles);
};

/**
 * Get just the numeric pace value without unit
 * @param minPerMile - Pace in minutes per mile (internal storage format)
 * @param useMiles - Whether to return min/mile (true) or min/km (false)
 * @returns Numeric value in the requested unit
 */
export const getPaceValue = (minPerMile: number, useMiles: boolean): number => {
  return useMiles ? minPerMile : paceMinPerMileToPaceMinPerKm(minPerMile);
};

/**
 * Get the unit label for distance
 * @param useMiles - Whether to return miles label (true) or kilometers label (false)
 * @returns "mi" or "km"
 */
export const getDistanceUnit = (useMiles: boolean): string => {
  return useMiles ? 'mi' : 'km';
};

/**
 * Get the unit label for pace
 * @param useMiles - Whether to return min/mile label (true) or min/km label (false)
 * @returns "/mi" or "/km"
 */
export const getPaceUnit = (useMiles: boolean): string => {
  return useMiles ? '/mi' : '/km';
};

/**
 * Get the full unit name for distance
 * @param useMiles - Whether to return "miles" or "kilometers"
 * @returns "miles" or "kilometers"
 */
export const getDistanceUnitName = (useMiles: boolean): string => {
  return useMiles ? 'miles' : 'kilometers';
};

/**
 * Convert user input distance to internal miles format
 * @param value - The distance value entered by user
 * @param useMiles - Whether the user entered miles (true) or kilometers (false)
 * @returns Distance in miles for internal storage
 */
export const inputToMiles = (value: number, useMiles: boolean): number => {
  return useMiles ? value : kmToMiles(value);
};

/**
 * Convert user input pace to internal min/mile format
 * @param value - The pace value entered by user (in minutes)
 * @param useMiles - Whether the user entered min/mile (true) or min/km (false)
 * @returns Pace in min/mile for internal storage
 */
export const inputPaceToMinPerMile = (value: number, useMiles: boolean): number => {
  return useMiles ? value : paceMinPerKmToPaceMinPerMile(value);
};

/**
 * Get appropriate placeholder for distance input
 * @param useMiles - Whether to show miles or kilometers placeholder
 * @returns Example distance value as string
 */
export const getDistancePlaceholder = (useMiles: boolean): string => {
  return useMiles ? '10.0' : '16.1';
};

/**
 * Get appropriate placeholder for pace input
 * @param useMiles - Whether to show min/mile or min/km placeholder
 * @returns Example pace value as string
 */
export const getPacePlaceholder = (useMiles: boolean): string => {
  return useMiles ? '9:30' : '5:54';
};

// ==================== Elevation Conversions ====================

const FEET_TO_METERS = 0.3048;
const METERS_TO_FEET = 1 / 0.3048;

/**
 * Convert feet to meters
 */
export const feetToMeters = (feet: number): number => {
  return feet * FEET_TO_METERS;
};

/**
 * Convert meters to feet
 */
export const metersToFeet = (meters: number): number => {
  return meters * METERS_TO_FEET;
};

/**
 * Format elevation with appropriate unit
 * @param feet - Elevation in feet (internal storage format)
 * @param useMiles - Whether to display in feet (true) or meters (false)
 * @returns Formatted string like "1000 ft" or "305 m"
 */
export const formatElevation = (
  feet: number,
  useMiles: boolean
): string => {
  const value = useMiles ? feet : feetToMeters(feet);
  const unit = useMiles ? 'ft' : 'm';
  return `${Math.round(value)} ${unit}`;
};

/**
 * Get the unit label for elevation
 * @param useMiles - Whether to return feet label (true) or meters label (false)
 * @returns "ft" or "m"
 */
export const getElevationUnit = (useMiles: boolean): string => {
  return useMiles ? 'ft' : 'm';
};

/**
 * Get just the numeric elevation value without unit
 * @param feet - Elevation in feet (internal storage format)
 * @param useMiles - Whether to return feet (true) or meters (false)
 * @returns Numeric value in the requested unit
 */
export const getElevationValue = (feet: number, useMiles: boolean): number => {
  return useMiles ? feet : feetToMeters(feet);
};
