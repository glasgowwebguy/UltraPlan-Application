// src/react-app/utils/nutritionThresholds.ts

/**
 * Carbohydrate intake thresholds as percentages of goal
 * Based on sports nutrition research for ultramarathon athletes
 */
export const CARB_THRESHOLDS = {
  /** Below 70% - significantly under target, risk of bonking */
  CRITICAL_LOW: 70,
  /** 70-90% - below target but acceptable */
  LOW: 90,
  /** 90-120% - optimal range */
  OPTIMAL_MIN: 90,
  OPTIMAL_MAX: 120,
  /** 120-130% - slightly high, monitor for discomfort */
  ELEVATED: 130,
  /** 130-150% - high risk of GI distress */
  WARNING: 150,
  /** Above 150% - very high risk of severe GI issues */
  DANGER: 150,
} as const;

/**
 * Get the status color class for carb percentage
 * @param percentage - Current carbs as percentage of goal (e.g., 95 means 95%)
 * @param hasSegmentTime - Whether segment has timing info
 * @returns Tailwind text color class
 */
export const getCarbStatusColor = (percentage: number, hasSegmentTime: boolean): string => {
  if (!hasSegmentTime) return 'text-gray-400';
  
  if (percentage < CARB_THRESHOLDS.CRITICAL_LOW) return 'text-red-400';
  if (percentage < CARB_THRESHOLDS.OPTIMAL_MIN) return 'text-yellow-400';
  if (percentage <= CARB_THRESHOLDS.OPTIMAL_MAX) return 'text-green-700 dark:text-green-400';
  if (percentage <= CARB_THRESHOLDS.ELEVATED) return 'text-yellow-400';
  if (percentage <= CARB_THRESHOLDS.WARNING) return 'text-orange-400';
  return 'text-red-400'; // Above DANGER threshold
};

/**
 * Get the progress bar color class for carb percentage
 * @param percentage - Current carbs as percentage of goal
 * @param hasSegmentTime - Whether segment has timing info
 * @returns Tailwind background color class
 */
export const getCarbProgressColor = (percentage: number, hasSegmentTime: boolean): string => {
  if (!hasSegmentTime) return 'bg-gray-500';
  
  if (percentage < CARB_THRESHOLDS.CRITICAL_LOW) return 'bg-red-500';
  if (percentage < CARB_THRESHOLDS.OPTIMAL_MIN) return 'bg-yellow-500';
  if (percentage <= CARB_THRESHOLDS.OPTIMAL_MAX) return 'bg-green-500';
  if (percentage <= CARB_THRESHOLDS.ELEVATED) return 'bg-yellow-500';
  if (percentage <= CARB_THRESHOLDS.WARNING) return 'bg-orange-500';
  return 'bg-red-500'; // Above DANGER threshold
};

/**
 * Get human-readable status message for carb percentage
 * @param percentage - Current carbs as percentage of goal
 * @param hasSegmentTime - Whether segment has timing info
 * @returns Status message string
 */
export const getCarbStatusMessage = (percentage: number, hasSegmentTime: boolean): string => {
  if (!hasSegmentTime) return '';
  
  if (percentage < CARB_THRESHOLDS.CRITICAL_LOW) {
    return 'Below target - add more nutrition';
  }
  if (percentage < CARB_THRESHOLDS.OPTIMAL_MIN) {
    return 'Close to target';
  }
  if (percentage <= CARB_THRESHOLDS.OPTIMAL_MAX) {
    return 'Meeting your carb goal ✓';
  }
  if (percentage <= CARB_THRESHOLDS.ELEVATED) {
    return 'Slightly above target - monitor GI comfort';
  }
  if (percentage <= CARB_THRESHOLDS.WARNING) {
    return '⚠️ High carb intake - Risk of GI distress';
  }
  return '🚨 Excessive carbs - High risk of stomach issues!';
};

/**
 * Check if carb percentage warrants a warning banner
 * @param percentage - Current carbs as percentage of goal
 * @returns Whether to show warning UI
 */
export const shouldShowCarbWarning = (percentage: number): boolean => {
  return percentage > CARB_THRESHOLDS.OPTIMAL_MAX;
};

/**
 * Check if carb percentage is in danger zone
 * @param percentage - Current carbs as percentage of goal
 * @returns Whether carbs are dangerously high
 */
export const isCarbDanger = (percentage: number): boolean => {
  return percentage > CARB_THRESHOLDS.WARNING;
};

/**
 * Get the warning message for over-consumption
 * @param percentage - Current carbs as percentage of goal
 * @returns Warning message or empty string
 */
export const getCarbWarningMessage = (percentage: number): string => {
  if (percentage > CARB_THRESHOLDS.WARNING) {
    return 'Excessive carbohydrate intake may cause severe GI distress. Consider reducing nutrition or extending segment time.';
  }
  if (percentage > CARB_THRESHOLDS.ELEVATED) {
    return 'Carb intake is above recommended levels. Monitor for stomach discomfort during the race.';
  }
  if (percentage > CARB_THRESHOLDS.OPTIMAL_MAX) {
    return 'Carb intake is slightly elevated. Watch for any GI discomfort.';
  }
  return '';
};

/**
 * Calculate the visual width for progress bar (caps at 150% for display)
 * @param percentage - Current carbs as percentage of goal
 * @returns Width percentage for progress bar (0-150)
 */
export const getCarbProgressWidth = (percentage: number): number => {
  return Math.min(percentage, 150);
};

// ============================================
// CAFFEINE THRESHOLDS
// ============================================

/**
 * Caffeine intake thresholds as mg per kg body weight
 * Based on sports science research:
 * - FDA max: 400mg/day for healthy adults
 * - Optimal performance: 3-6 mg/kg body weight
 * - Ultra-specific: 1-3 mg/kg for extended efforts
 */
export const CAFFEINE_THRESHOLDS = {
  /** Below 1 mg/kg - minimal/no effect expected */
  MINIMAL: 1,
  /** 1-3 mg/kg - low-moderate, may not provide full benefit */
  LOW: 3,
  /** 3-6 mg/kg - optimal range for performance */
  OPTIMAL_MIN: 3,
  OPTIMAL_MAX: 6,
  /** 6-9 mg/kg - high, monitor for side effects */
  HIGH: 9,
  /** Above 9 mg/kg - excessive, high risk of adverse effects */
  EXCESSIVE: 9,
} as const;

/**
 * Get caffeine status based on mg per kg body weight
 * @param mgPerKg - Caffeine intake in mg per kg body weight
 * @returns Status category
 */
export type CaffeineStatusLevel = 'none' | 'minimal' | 'low' | 'optimal' | 'high' | 'excessive';

export const getCaffeineStatusLevel = (mgPerKg: number): CaffeineStatusLevel => {
  if (mgPerKg === 0) return 'none';
  if (mgPerKg < CAFFEINE_THRESHOLDS.MINIMAL) return 'minimal';
  if (mgPerKg < CAFFEINE_THRESHOLDS.LOW) return 'low';
  if (mgPerKg <= CAFFEINE_THRESHOLDS.OPTIMAL_MAX) return 'optimal';
  if (mgPerKg <= CAFFEINE_THRESHOLDS.HIGH) return 'high';
  return 'excessive';
};

/**
 * Get the status color class for caffeine intake
 * @param mgPerKg - Caffeine in mg per kg body weight
 * @returns Tailwind text color class
 */
export const getCaffeineStatusColor = (mgPerKg: number): string => {
  const status = getCaffeineStatusLevel(mgPerKg);
  switch (status) {
    case 'none': return 'text-gray-400';
    case 'minimal': return 'text-gray-500';
    case 'low': return 'text-blue-500';
    case 'optimal': return 'text-green-600 dark:text-green-400';
    case 'high': return 'text-orange-500';
    case 'excessive': return 'text-red-500';
    default: return 'text-gray-400';
  }
};

/**
 * Get the progress bar color class for caffeine intake
 * @param mgPerKg - Caffeine in mg per kg body weight
 * @returns Tailwind background color class
 */
export const getCaffeineProgressColor = (mgPerKg: number): string => {
  const status = getCaffeineStatusLevel(mgPerKg);
  switch (status) {
    case 'none': return 'bg-gray-300';
    case 'minimal': return 'bg-gray-400';
    case 'low': return 'bg-blue-400';
    case 'optimal': return 'bg-green-500';
    case 'high': return 'bg-orange-500';
    case 'excessive': return 'bg-red-500';
    default: return 'bg-gray-300';
  }
};

/**
 * Get human-readable status message for caffeine intake
 * @param totalMg - Total caffeine in mg
 * @param bodyWeightKg - Body weight in kg (0 if unknown)
 * @returns Status message string
 */
export const getCaffeineStatusMessage = (totalMg: number, bodyWeightKg: number): string => {
  if (totalMg === 0) return 'No caffeine planned';

  if (bodyWeightKg <= 0) {
    // Can't calculate mg/kg, use absolute thresholds
    if (totalMg > 600) return '🚨 Very high caffeine - may cause adverse effects';
    if (totalMg > 400) return '⚠️ High caffeine intake';
    if (totalMg > 200) return 'Moderate caffeine intake';
    return 'Low caffeine intake';
  }

  const mgPerKg = totalMg / bodyWeightKg;
  const status = getCaffeineStatusLevel(mgPerKg);

  switch (status) {
    case 'minimal':
      return `Minimal caffeine (${mgPerKg.toFixed(1)} mg/kg)`;
    case 'low':
      return `Low-moderate caffeine (${mgPerKg.toFixed(1)} mg/kg)`;
    case 'optimal':
      return `Optimal caffeine range (${mgPerKg.toFixed(1)} mg/kg) ✓`;
    case 'high':
      return `⚠️ High caffeine (${mgPerKg.toFixed(1)} mg/kg) - monitor for jitters`;
    case 'excessive':
      return `🚨 Excessive caffeine (${mgPerKg.toFixed(1)} mg/kg) - risk of adverse effects`;
    default:
      return '';
  }
};

/**
 * Check if caffeine intake warrants a warning
 * @param mgPerKg - Caffeine in mg per kg body weight
 * @returns Whether to show warning UI
 */
export const shouldShowCaffeineWarning = (mgPerKg: number): boolean => {
  return mgPerKg > CAFFEINE_THRESHOLDS.OPTIMAL_MAX;
};

/**
 * Get the warning message for high caffeine intake
 * @param totalMg - Total caffeine in mg
 * @param bodyWeightKg - Body weight in kg
 * @returns Warning message or empty string
 */
export const getCaffeineWarningMessage = (totalMg: number, bodyWeightKg: number): string => {
  if (bodyWeightKg <= 0) {
    if (totalMg > 600) {
      return 'Very high caffeine intake may cause jitters, GI distress, anxiety, or heart palpitations.';
    }
    if (totalMg > 400) {
      return 'High caffeine intake - monitor for side effects like jitters or stomach issues.';
    }
    return '';
  }

  const mgPerKg = totalMg / bodyWeightKg;

  if (mgPerKg > CAFFEINE_THRESHOLDS.EXCESSIVE) {
    return 'Excessive caffeine intake may cause jitters, GI distress, anxiety, or heart palpitations. Consider reducing.';
  }
  if (mgPerKg > CAFFEINE_THRESHOLDS.OPTIMAL_MAX) {
    return 'Caffeine intake is above optimal range. Monitor for side effects during the race.';
  }
  return '';
};
