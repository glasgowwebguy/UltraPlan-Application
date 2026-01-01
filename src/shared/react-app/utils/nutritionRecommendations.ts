// Nutrition recommendations based on weather conditions and exercise intensity
// Reference: Precision Hydration, ACSM Guidelines, and sports nutrition research

export interface WeatherConditions {
  temperatureF: number;      // Temperature in Fahrenheit
  humidity: number;          // Humidity percentage (0-100)
  windSpeedMph: number;      // Wind speed in mph
  isDaylight: boolean;       // Whether it's daylight
}

export interface NutritionMultipliers {
  sodiumMultiplier: number;  // Multiplier for sodium goals (1.0 = no change)
  waterMultiplier: number;   // Multiplier for water goals (1.0 = no change)
  carbMultiplier: number;    // Multiplier for carb goals (1.0 = no change)
}

export interface NutritionRecommendation {
  multipliers: NutritionMultipliers;
  adjustedSodiumGoal: number;     // mg/hr
  adjustedWaterGoal: number;      // ml/hr
  adjustedCarbGoal: number;       // g/hr
  warnings: string[];             // Safety warnings
  tips: string[];                 // Practical tips
  riskLevel: 'low' | 'moderate' | 'high' | 'extreme';
}

// Default baseline goals
const DEFAULT_SODIUM_GOAL = 300;  // mg/hr
const DEFAULT_WATER_GOAL = 500;   // ml/hr
const DEFAULT_CARB_GOAL = 60;     // g/hr

/**
 * Calculate temperature-based adjustments
 * Based on research: heat increases sweat rate and electrolyte loss
 */
function getTemperatureMultipliers(tempF: number): NutritionMultipliers {
  if (tempF < 40) {
    // Cold weather: reduced fluid needs, similar sodium
    return { sodiumMultiplier: 0.7, waterMultiplier: 0.6, carbMultiplier: 1.1 };
  } else if (tempF < 55) {
    // Cool weather: slightly reduced needs
    return { sodiumMultiplier: 0.8, waterMultiplier: 0.8, carbMultiplier: 1.0 };
  } else if (tempF < 65) {
    // Mild weather: baseline
    return { sodiumMultiplier: 1.0, waterMultiplier: 1.0, carbMultiplier: 1.0 };
  } else if (tempF < 75) {
    // Warm weather: increased needs
    return { sodiumMultiplier: 1.2, waterMultiplier: 1.2, carbMultiplier: 1.0 };
  } else if (tempF < 85) {
    // Hot weather: significantly increased needs
    return { sodiumMultiplier: 1.5, waterMultiplier: 1.5, carbMultiplier: 0.95 };
  } else if (tempF < 95) {
    // Very hot: high risk conditions
    return { sodiumMultiplier: 1.8, waterMultiplier: 1.8, carbMultiplier: 0.9 };
  } else {
    // Extreme heat: dangerous conditions
    return { sodiumMultiplier: 2.0, waterMultiplier: 2.0, carbMultiplier: 0.85 };
  }
}

/**
 * Calculate humidity-based adjustments
 * High humidity reduces sweat evaporation, making cooling less efficient
 */
function getHumidityMultipliers(humidity: number): NutritionMultipliers {
  if (humidity < 30) {
    // Low humidity: dry conditions, may not notice sweating as much
    return { sodiumMultiplier: 1.0, waterMultiplier: 1.1, carbMultiplier: 1.0 };
  } else if (humidity < 50) {
    // Moderate humidity: baseline
    return { sodiumMultiplier: 1.0, waterMultiplier: 1.0, carbMultiplier: 1.0 };
  } else if (humidity < 70) {
    // High humidity: increased fluid needs
    return { sodiumMultiplier: 1.1, waterMultiplier: 1.15, carbMultiplier: 1.0 };
  } else if (humidity < 85) {
    // Very high humidity: significant increase
    return { sodiumMultiplier: 1.2, waterMultiplier: 1.3, carbMultiplier: 0.95 };
  } else {
    // Extreme humidity: dangerous for prolonged exercise
    return { sodiumMultiplier: 1.3, waterMultiplier: 1.4, carbMultiplier: 0.9 };
  }
}

/**
 * Wind can increase evaporative cooling but also dehydration in dry conditions
 */
function getWindMultipliers(windSpeedMph: number, humidity: number): NutritionMultipliers {
  if (windSpeedMph < 5) {
    return { sodiumMultiplier: 1.0, waterMultiplier: 1.0, carbMultiplier: 1.0 };
  } else if (windSpeedMph < 15) {
    // Moderate wind: slight increase in dry conditions
    const dryAdjustment = humidity < 40 ? 1.1 : 1.0;
    return { sodiumMultiplier: 1.0, waterMultiplier: dryAdjustment, carbMultiplier: 1.0 };
  } else {
    // Strong wind: increased dehydration risk in dry conditions
    const dryAdjustment = humidity < 40 ? 1.2 : 1.05;
    return { sodiumMultiplier: 1.05, waterMultiplier: dryAdjustment, carbMultiplier: 1.0 };
  }
}

/**
 * Calculate the "feels like" or heat index risk level
 */
function calculateRiskLevel(tempF: number, humidity: number): 'low' | 'moderate' | 'high' | 'extreme' {
  // Simple heat index approximation
  const heatIndex = tempF + (humidity * 0.1);

  if (heatIndex < 70) return 'low';
  if (heatIndex < 85) return 'moderate';
  if (heatIndex < 100) return 'high';
  return 'extreme';
}

/**
 * Generate safety warnings based on conditions and nutrition intake
 */
function generateWarnings(
  conditions: WeatherConditions,
  adjustedSodium: number,
  adjustedWater: number
): string[] {
  const warnings: string[] = [];

  // Temperature warnings
  if (conditions.temperatureF >= 85) {
    warnings.push('High heat conditions - reduce pace and monitor for heat illness symptoms');
  }
  if (conditions.temperatureF < 40) {
    warnings.push('Cold conditions - monitor for hypothermia, consider warm fluids');
  }

  // Humidity warnings
  if (conditions.humidity >= 80 && conditions.temperatureF >= 75) {
    warnings.push('High humidity + heat combo - extreme care needed, frequent breaks recommended');
  }

  // Hyponatremia warning (water without sodium)
  if (adjustedWater > 1000 && adjustedSodium < 400) {
    warnings.push('Risk of hyponatremia - high fluid intake requires adequate sodium');
  }

  // Dehydration warning
  if (conditions.temperatureF >= 80 && adjustedWater < 600) {
    warnings.push('Risk of dehydration - consider increasing fluid intake in hot conditions');
  }

  return warnings;
}

/**
 * Generate practical tips based on conditions
 */
function generateTips(conditions: WeatherConditions, riskLevel: string): string[] {
  const tips: string[] = [];

  if (conditions.temperatureF >= 75) {
    tips.push('Pre-cool with cold water or ice before starting');
    tips.push('Wet your hat/bandana at aid stations');
    tips.push('Take electrolytes before you feel thirsty');
  }

  if (conditions.temperatureF < 50) {
    tips.push('Consider warm fluids at aid stations');
    tips.push('Don\'t over-dress - sweating in cold can cause hypothermia');
  }

  if (conditions.humidity >= 70) {
    tips.push('Pace conservatively - cooling efficiency is reduced');
    tips.push('Monitor for signs of heat exhaustion');
  }

  if (riskLevel === 'high' || riskLevel === 'extreme') {
    tips.push('Consider reducing target pace by 10-15%');
    tips.push('Plan for longer stops at aid stations');
    tips.push('Know the signs of heat illness: confusion, nausea, dizziness');
  }

  // General tips
  if (tips.length === 0) {
    tips.push('Conditions are favorable - stick to your planned nutrition strategy');
    tips.push('Listen to your body and adjust as needed');
  }

  return tips;
}

/**
 * Main function to get weather-adjusted nutrition recommendations
 */
export function getWeatherAdjustedRecommendations(
  conditions: WeatherConditions,
  baseSodiumGoal: number = DEFAULT_SODIUM_GOAL,
  baseWaterGoal: number = DEFAULT_WATER_GOAL,
  baseCarbGoal: number = DEFAULT_CARB_GOAL
): NutritionRecommendation {
  // Get multipliers from each factor
  const tempMultipliers = getTemperatureMultipliers(conditions.temperatureF);
  const humidityMultipliers = getHumidityMultipliers(conditions.humidity);
  const windMultipliers = getWindMultipliers(conditions.windSpeedMph, conditions.humidity);

  // Combine multipliers (geometric mean to avoid extreme values)
  const combinedMultipliers: NutritionMultipliers = {
    sodiumMultiplier: Math.pow(
      tempMultipliers.sodiumMultiplier *
      humidityMultipliers.sodiumMultiplier *
      windMultipliers.sodiumMultiplier,
      1/3
    ) * 1.5, // Weight temperature more heavily
    waterMultiplier: Math.pow(
      tempMultipliers.waterMultiplier *
      humidityMultipliers.waterMultiplier *
      windMultipliers.waterMultiplier,
      1/3
    ) * 1.5, // Weight temperature more heavily
    carbMultiplier: Math.pow(
      tempMultipliers.carbMultiplier *
      humidityMultipliers.carbMultiplier *
      windMultipliers.carbMultiplier,
      1/3
    ),
  };

  // Normalize multipliers to be more realistic (cap at reasonable values)
  combinedMultipliers.sodiumMultiplier = Math.min(Math.max(combinedMultipliers.sodiumMultiplier, 0.6), 2.0);
  combinedMultipliers.waterMultiplier = Math.min(Math.max(combinedMultipliers.waterMultiplier, 0.6), 2.0);
  combinedMultipliers.carbMultiplier = Math.min(Math.max(combinedMultipliers.carbMultiplier, 0.8), 1.1);

  // Calculate adjusted goals
  const adjustedSodiumGoal = Math.round(baseSodiumGoal * combinedMultipliers.sodiumMultiplier);
  const adjustedWaterGoal = Math.round(baseWaterGoal * combinedMultipliers.waterMultiplier);
  const adjustedCarbGoal = Math.round(baseCarbGoal * combinedMultipliers.carbMultiplier);

  // Determine risk level
  const riskLevel = calculateRiskLevel(conditions.temperatureF, conditions.humidity);

  // Generate warnings and tips
  const warnings = generateWarnings(conditions, adjustedSodiumGoal, adjustedWaterGoal);
  const tips = generateTips(conditions, riskLevel);

  return {
    multipliers: combinedMultipliers,
    adjustedSodiumGoal,
    adjustedWaterGoal,
    adjustedCarbGoal,
    warnings,
    tips,
    riskLevel,
  };
}

/**
 * Get a simple text summary of the recommendation
 */
export function getRecommendationSummary(recommendation: NutritionRecommendation): string {
  const parts: string[] = [];

  parts.push(`Risk Level: ${recommendation.riskLevel.toUpperCase()}`);
  parts.push(`Adjusted Goals: Sodium ${recommendation.adjustedSodiumGoal}mg/hr, Water ${recommendation.adjustedWaterGoal}ml/hr, Carbs ${recommendation.adjustedCarbGoal}g/hr`);

  if (recommendation.warnings.length > 0) {
    parts.push(`Warnings: ${recommendation.warnings.join('; ')}`);
  }

  return parts.join(' | ');
}

/**
 * Intensity-based adjustment (for future use with heart rate zones or pace data)
 */
export function getIntensityMultiplier(
  intensityLevel: 'easy' | 'moderate' | 'hard' | 'race'
): NutritionMultipliers {
  switch (intensityLevel) {
    case 'easy':
      return { sodiumMultiplier: 0.8, waterMultiplier: 0.8, carbMultiplier: 0.7 };
    case 'moderate':
      return { sodiumMultiplier: 1.0, waterMultiplier: 1.0, carbMultiplier: 1.0 };
    case 'hard':
      return { sodiumMultiplier: 1.2, waterMultiplier: 1.2, carbMultiplier: 1.1 };
    case 'race':
      return { sodiumMultiplier: 1.3, waterMultiplier: 1.3, carbMultiplier: 1.2 };
    default:
      return { sodiumMultiplier: 1.0, waterMultiplier: 1.0, carbMultiplier: 1.0 };
  }
}
