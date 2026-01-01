/**
 * Smart Nutrition Suggestion Algorithm v3
 *
 * GOAL: All suggestions must have GREEN progress bars (90-105% of target)
 *
 * Strategy:
 * 1. Calculate hard limits (90% min, 105% max) for each nutrient
 * 2. Select products that fit within these limits
 * 3. STOP adding products when any nutrient would exceed 105%
 * 4. Ensure variety with different products for each strategy
 */

import type { NutritionProduct } from './nutritionDatabase';

// ============================================================================
// TYPES
// ============================================================================

export interface NutritionTarget {
  carbsNeeded: number;
  sodiumNeeded: number;
  waterNeeded: number;
  segmentTimeHours: number;
}

export interface ProductSuggestion {
  product: NutritionProduct;
  quantity: number;
  contributes: {
    carbs: number;
    sodium: number;
    water: number;
  };
}

export interface NutritionPlan {
  id: string;
  name: string;
  description: string;
  strategy: 'balanced' | 'drink-focused' | 'gel-focused' | 'electrolyte-light';
  products: ProductSuggestion[];
  totals: {
    carbs: number;
    sodium: number;
    water: number;
  };
  coveragePercent: {
    carbs: number;
    sodium: number;
    water: number;
  };
  score: number;
}

export interface SmartSuggestionResult {
  target: NutritionTarget;
  plans: NutritionPlan[];
  warnings: string[];
  tips: string[];
}

// ============================================================================
// GREEN ZONE CONSTANTS - ALIGNED WITH SEGMENT THRESHOLDS
// ============================================================================

/**
 * GREEN ZONE: The acceptable range for suggestions
 * ALL metrics MUST achieve at least 90% coverage
 * - Carbs: 90-120% is green in segments
 * - Sodium: 90-120% is green in segments
 * - Water: 90-120% is green in segments
 */
const GREEN_ZONE = {
  min: 90,   // Minimum % of target (below this = yellow/red) - MUST achieve 90%+ on ALL metrics
  max: 120,  // Maximum % of target (above this = yellow/red)
};

// Stricter carb limits (carbs are more sensitive)
const CARB_ZONE = {
  min: 90,   // Carbs need to be closer to target
  max: 120,
};

/**
 * Calculate the actual gram/mg/ml limits for a target
 */
function calculateLimits(target: number): { min: number; max: number } {
  return {
    min: Math.floor(target * (GREEN_ZONE.min / 100)),
    max: Math.floor(target * (GREEN_ZONE.max / 100)),
  };
}

// ============================================================================
// STRATEGY CONFIGURATIONS
// ============================================================================

interface StrategyConfig {
  id: string;
  name: string;
  emoji: string;
  description: string;
  // Priority order for product categories
  categoryPriority: string[];
  // Products to prefer (partial name match)
  preferProducts: string[];
  // Products to avoid (partial name match)
  avoidProducts: string[];
  // HARD ENFORCEMENT FIELDS
  allowedCategories?: string[];       // If set, ONLY these categories allowed
  excludedCategories?: string[];      // Categories to NEVER include
  maxSodiumPerServing?: number;       // For Low Sodium strategy
  realFoodPriority: string[];         // Preferred real food for carb gaps
  mustIncludeCategory?: string;       // Must have at least one product from this category
}

const STRATEGIES: StrategyConfig[] = [
  {
    id: 'balanced',
    name: 'Balanced Mix',
    emoji: '⚖️',
    description: 'Optimal balance of gels, drinks, and electrolytes',
    categoryPriority: ['Gels', 'Drinks', 'Bars', 'Real Food', 'Electrolytes', 'Other'],
    preferProducts: ['Active Root', 'Maurten', 'Tailwind'],
    avoidProducts: [],
    // Balanced: No restrictions, mix of everything
    realFoodPriority: ['Banana', 'Bar', 'Jelly'],
    mustIncludeCategory: 'Gels', // Must include at least one gel
  },
  {
    id: 'drink-focused',
    name: 'Drink-Focused',
    emoji: '🥤',
    description: 'Prioritizes liquid nutrition for hydration + carbs',
    categoryPriority: ['Drinks', 'Real Food', 'Electrolytes', 'Other'],
    preferProducts: ['Tailwind', 'SIS Go Electrolyte', 'Precision Fuel'],
    avoidProducts: [],
    // HARD: NO GELS - Only drink mixes
    excludedCategories: ['Gels', 'Bars'],
    realFoodPriority: ['Jelly', 'Banana', 'Rice Pudding'],
    mustIncludeCategory: 'Drinks',
  },
  {
    id: 'gel-focused',
    name: 'Gel-Focused',
    emoji: '⚡',
    description: 'Compact energy from gels, add water separately',
    categoryPriority: ['Gels', 'Real Food', 'Electrolytes', 'Other'],
    preferProducts: ['Maurten', 'GU', 'SIS Go Isotonic', 'Active Root Energy Gel'],
    avoidProducts: ['Drink Mix', 'Sports Drink'],
    // HARD: NO DRINK MIXES - Only gels
    excludedCategories: ['Drinks'],
    realFoodPriority: ['Rice Pudding', 'Custard', 'Jelly', 'Banana'],
    mustIncludeCategory: 'Gels',
  },
  {
    id: 'electrolyte-light',
    name: 'Low Sodium',
    emoji: '❄️',
    description: 'For runners who need less sodium or cooler conditions',
    categoryPriority: ['Real Food', 'Gels', 'Bars', 'Other'],
    preferProducts: ['Maurten', 'Spring', 'Banana', 'Jelly', 'Rice Pudding'],
    avoidProducts: ['Precision', 'PH 1500', 'Salt', 'S!Caps', 'LMNT', 'Tailwind', 'Active Root'],
    // HARD: Only products with <=60mg sodium
    maxSodiumPerServing: 60,
    realFoodPriority: ['Jelly', 'Rice Pudding', 'Custard', 'Banana', 'Honey'],
  },
];

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

// ============================================================================
// PRODUCT FILTERING - EXCLUDE NON-ENERGY PRODUCTS
// ============================================================================

/**
 * Products to EXCLUDE from Smart Nutrition suggestions
 * These are recovery/supplement products, not race-day energy products
 */
const EXCLUDED_PRODUCT_KEYWORDS = [
  'protein',
  'whey',
  'casein',
  'recovery',
  'bcaa',
  'amino',
  'creatine',
  'collagen',
  'mass gainer',
  'weight gainer',
  'meal replacement',
];

/**
 * Check if a product should be excluded from Smart Nutrition suggestions
 */
function isExcludedProduct(product: NutritionProduct): boolean {
  const name = product.name.toLowerCase();

  for (const keyword of EXCLUDED_PRODUCT_KEYWORDS) {
    if (name.includes(keyword)) {
      console.log(`[Filter] Excluding "${product.name}" - contains "${keyword}"`);
      return true;
    }
  }

  return false;
}

/**
 * Filter products to only include race-appropriate energy products
 */
function filterEnergyProducts(products: NutritionProduct[]): NutritionProduct[] {
  return products.filter(p => !isExcludedProduct(p));
}

// ============================================================================
// STRATEGY-SPECIFIC PRODUCT FILTERING (HARD ENFORCEMENT)
// ============================================================================

/**
 * Determine if a product is actually a GEL based on name and category
 */
function isGelProduct(product: NutritionProduct): boolean {
  const name = product.name.toLowerCase();

  // If it's in Gels category and doesn't have "drink" or "mix" in name, it's a gel
  if (product.category === 'Gels') {
    // "Active Root Energy Gel Mix" is a drink mix, not a gel
    if (name.includes('drink') || name.includes('mix')) {
      return false;
    }
    return true;
  }

  // Check by name patterns
  const gelPatterns = ['gel', 'iso', 'shot', 'bloks', 'chews'];
  const notGelPatterns = ['drink', 'mix', 'hydration'];

  const matchesGel = gelPatterns.some(p => name.includes(p));
  const matchesNotGel = notGelPatterns.some(p => name.includes(p));

  return matchesGel && !matchesNotGel;
}

/**
 * Determine if a product is actually a DRINK based on name and category
 */
function isDrinkProduct(product: NutritionProduct): boolean {
  const name = product.name.toLowerCase();

  // If it's in Drinks category, it's a drink
  if (product.category === 'Drinks') {
    return true;
  }

  // Check by name patterns - drink mixes are drinks even if miscategorized
  const drinkPatterns = ['drink', 'fuel', 'hydration', 'tailwind', 'electrolyte mix'];
  const hasDrinkPattern = drinkPatterns.some(p => name.includes(p));

  // Products with "mix" in Gels category are actually drink mixes
  if (product.category === 'Gels' && name.includes('mix')) {
    return true;
  }

  return hasDrinkPattern;
}

/**
 * Get products that are allowed for a specific strategy
 * This enforces HARD category restrictions using both category AND name patterns
 */
function getStrategyProducts(
  products: NutritionProduct[],
  strategy: StrategyConfig
): NutritionProduct[] {
  const energyProducts = filterEnergyProducts(products);

  console.log(`[${strategy.id}] Filtering ${energyProducts.length} products by strategy rules...`);

  const filtered = energyProducts.filter(product => {
    const productName = product.name.toLowerCase();

    // 1. For DRINK-FOCUSED: Exclude ALL gels and gel-like products
    if (strategy.id === 'drink-focused') {
      if (isGelProduct(product)) {
        console.log(`[${strategy.id}] EXCLUDING ${product.name} - is a gel product`);
        return false;
      }
      // Only allow drinks, real food, and electrolytes
      if (!isDrinkProduct(product) &&
        product.category !== 'Real Food' &&
        product.category !== 'Electrolytes' &&
        product.category !== 'Other') {
        console.log(`[${strategy.id}] EXCLUDING ${product.name} - not a drink/real food/electrolyte`);
        return false;
      }
    }

    // 2. For GEL-FOCUSED: Exclude ALL drink mixes
    if (strategy.id === 'gel-focused') {
      if (isDrinkProduct(product) && product.category !== 'Electrolytes') {
        console.log(`[${strategy.id}] EXCLUDING ${product.name} - is a drink product`);
        return false;
      }
      // Must be a gel, real food, or electrolyte
      if (!isGelProduct(product) &&
        product.category !== 'Real Food' &&
        product.category !== 'Electrolytes' &&
        product.category !== 'Other' &&
        !isWaterProduct(product)) {
        console.log(`[${strategy.id}] EXCLUDING ${product.name} - not a gel/real food/electrolyte`);
        return false;
      }
    }

    // 3. Check sodium limit (for Low Sodium strategy)
    if (strategy.maxSodiumPerServing !== undefined) {
      if (product.defaultSodium > strategy.maxSodiumPerServing) {
        console.log(`[${strategy.id}] EXCLUDING ${product.name} - sodium ${product.defaultSodium}mg exceeds ${strategy.maxSodiumPerServing}mg limit`);
        return false;
      }
    }

    // 4. Check avoided products by name
    const isAvoided = strategy.avoidProducts.some(pattern =>
      productName.includes(pattern.toLowerCase())
    );
    if (isAvoided) {
      console.log(`[${strategy.id}] EXCLUDING ${product.name} - matches avoid pattern`);
      return false;
    }

    // 5. Check excluded categories (general)
    if (strategy.excludedCategories && strategy.excludedCategories.includes(product.category)) {
      console.log(`[${strategy.id}] EXCLUDING ${product.name} - category ${product.category} is excluded`);
      return false;
    }

    // 6. Allow water for all strategies
    if (isWaterProduct(product)) {
      return true;
    }

    return true;
  });

  console.log(`[${strategy.id}] Filtered to ${filtered.length} eligible products`);
  return filtered;
}

/**
 * Get real food products for filling carb gaps
 * Returns products with near-zero sodium that can add carbs without overshooting sodium
 */
function getRealFoodProducts(
  products: NutritionProduct[],
  strategy: StrategyConfig
): NutritionProduct[] {
  const realFoodCandidates = filterEnergyProducts(products).filter(p =>
    p.defaultSodium <= 15 &&        // Near-zero sodium (<=15mg)
    p.defaultCarbs >= 5 &&          // Has meaningful carbs
    (p.category === 'Real Food' || p.category === 'Bars' || p.category === 'Other')
  );

  // Sort by strategy's real food priority
  return realFoodCandidates.sort((a, b) => {
    const aIdx = strategy.realFoodPriority.findIndex(pattern =>
      a.name.toLowerCase().includes(pattern.toLowerCase())
    );
    const bIdx = strategy.realFoodPriority.findIndex(pattern =>
      b.name.toLowerCase().includes(pattern.toLowerCase())
    );

    // Products matching priority come first
    const aPriority = aIdx === -1 ? 99 : aIdx;
    const bPriority = bIdx === -1 ? 99 : bIdx;

    if (aPriority !== bPriority) {
      return aPriority - bPriority;
    }

    // Then by carb-to-sodium ratio (higher is better)
    const aRatio = a.defaultCarbs / Math.max(a.defaultSodium, 0.1);
    const bRatio = b.defaultCarbs / Math.max(b.defaultSodium, 0.1);
    return bRatio - aRatio;
  });
}

/**
 * Check if a product is plain water
 */
function isWaterProduct(product: NutritionProduct): boolean {
  return product.name.toLowerCase() === 'water';
}


export function calculateNutritionTargets(
  segmentTimeMinutes: number,
  carbGoalPerHour: number = 60,
  sodiumGoalPerHour: number = 300,
  waterGoalPerHour: number = 500
): NutritionTarget {
  const segmentTimeHours = segmentTimeMinutes / 60;
  return {
    carbsNeeded: Math.round(carbGoalPerHour * segmentTimeHours),
    sodiumNeeded: Math.round(sodiumGoalPerHour * segmentTimeHours),
    waterNeeded: Math.round(waterGoalPerHour * segmentTimeHours),
    segmentTimeHours,
  };
}

/**
 * Check if a product is a drink mix that needs water
 * More specific to avoid false positives (like protein powder)
 */
function isDrinkMixProduct(product: NutritionProduct): boolean {
  const name = product.name.toLowerCase();

  // First, exclude recovery/protein products - these are NOT drink mixes for racing
  if (isExcludedProduct(product)) {
    return false;
  }

  // Specific drink mix patterns (most reliable)
  const drinkMixPatterns = [
    'drink mix',
    'hydration mix',
    'fuel mix',
    'endurance fuel',
    'tailwind',
    'sis go electrolyte',
    'carb mix',
    'energy drink',
    'sports drink',
    'electrolyte drink',
  ];

  for (const pattern of drinkMixPatterns) {
    if (name.includes(pattern)) {
      return true;
    }
  }

  // For "Drinks" category with 0 water, only count as drink mix if:
  // 1. It has meaningful carbs (>=15g) - indicates it's an energy drink mix
  // 2. OR it has meaningful sodium (>=150mg) - indicates it's an electrolyte drink mix
  if (product.category === 'Drinks' && product.defaultWater === 0) {
    const hasEnergyCarbs = product.defaultCarbs >= 15;
    const hasElectrolytes = product.defaultSodium >= 150;

    // Must have energy purpose (carbs or electrolytes) to be a drink mix
    if (hasEnergyCarbs || hasElectrolytes) {
      return true;
    }
  }

  return false;
}

/**
 * Get the water contribution from a product
 * For drink mixes with 0ml listed, assume 500ml per serving when mixed
 */
function getEffectiveWater(product: NutritionProduct): number {
  // If product already has water content, use it
  if (product.defaultWater > 0) {
    return product.defaultWater;
  }

  // If it's a drink mix, assume 500ml water per serving
  if (isDrinkMixProduct(product)) {
    return 500;
  }

  return 0;
}

/**
 * Calculate coverage percentages
 */
function calculateCoverage(
  totals: { carbs: number; sodium: number; water: number },
  target: NutritionTarget
): { carbs: number; sodium: number; water: number } {
  return {
    carbs: target.carbsNeeded > 0 ? Math.round((totals.carbs / target.carbsNeeded) * 100) : 100,
    sodium: target.sodiumNeeded > 0 ? Math.round((totals.sodium / target.sodiumNeeded) * 100) : 100,
    water: target.waterNeeded > 0 ? Math.round((totals.water / target.waterNeeded) * 100) : 100,
  };
}

/**
 * Score a plan - higher score for better coverage
 * Uses aligned thresholds matching segment progress bars
 */
function scorePlan(coverage: { carbs: number; sodium: number; water: number }): number {
  let score = 100;

  // Carbs scoring (uses stricter 90-120% range)
  if (coverage.carbs < CARB_ZONE.min) {
    score -= Math.min(25, (CARB_ZONE.min - coverage.carbs) * 0.5);
  } else if (coverage.carbs > CARB_ZONE.max) {
    score -= Math.min(30, (coverage.carbs - CARB_ZONE.max) * 1.0);
  }

  // Sodium scoring (uses 80-120% range)
  if (coverage.sodium < GREEN_ZONE.min) {
    // Penalize more heavily for low sodium
    score -= Math.min(25, (GREEN_ZONE.min - coverage.sodium) * 0.4);
  } else if (coverage.sodium > GREEN_ZONE.max) {
    score -= Math.min(20, (coverage.sodium - GREEN_ZONE.max) * 0.5);
  }

  // Water scoring (uses 80-120% range)
  if (coverage.water < GREEN_ZONE.min) {
    score -= Math.min(15, (GREEN_ZONE.min - coverage.water) * 0.3);
  } else if (coverage.water > GREEN_ZONE.max) {
    score -= Math.min(10, (coverage.water - GREEN_ZONE.max) * 0.3);
  }

  return Math.max(0, Math.round(score));
}

/**
 * Generate a plan for a specific strategy using BRAND-CONSISTENT selection
 *
 * NEW Algorithm (per SMU-Update2.md):
 * 1. Phase 1: Add brand family products until sodium reaches ~90-100% of target
 * 2. Phase 2: Add REAL FOOD to fill remaining carb gap (low/zero sodium)
 * 3. Phase 3: Add water if hydration is under target
 * 4. Phase 4: Fine-tune to stay in GREEN zone
 * 
 * Limits:
 * - Max 3 products from brand family
 * - Max 2 of any single product
 * - Total max 4-5 products per suggestion
 */
function generatePlanForStrategy(
  products: NutritionProduct[],
  target: NutritionTarget,
  strategy: StrategyConfig,
  _recentlyUsedNames: string[] = []
): NutritionPlan {
  // Calculate hard limits for GREEN zone
  const limits = {
    carbs: calculateLimits(target.carbsNeeded),
    sodium: calculateLimits(target.sodiumNeeded),
    water: calculateLimits(target.waterNeeded),
  };

  console.log(`[${strategy.id}] === Starting CATEGORY-ENFORCED Plan Generation ===`);
  console.log(`[${strategy.id}] Targets: carbs=${target.carbsNeeded}g, sodium=${target.sodiumNeeded}mg, water=${target.waterNeeded}ml`);
  console.log(`[${strategy.id}] Excluded categories: ${strategy.excludedCategories?.join(', ') || 'none'}`);

  // Track what we've selected
  const selectedProducts: ProductSuggestion[] = [];
  const usedProductNames = new Set<string>();
  const currentTotals = { carbs: 0, sodium: 0, water: 0 };
  let primaryProductCount = 0;

  // Constants for product limits
  const MAX_BRAND_FAMILY_PRODUCTS = 3;
  const MAX_QUANTITY_PER_PRODUCT = 2;
  const MAX_TOTAL_PRODUCTS = 5;

  // Helper to check current coverage percentages
  const getCoverage = () => ({
    carbs: target.carbsNeeded > 0 ? (currentTotals.carbs / target.carbsNeeded) * 100 : 100,
    sodium: target.sodiumNeeded > 0 ? (currentTotals.sodium / target.sodiumNeeded) * 100 : 100,
    water: target.waterNeeded > 0 ? (currentTotals.water / target.waterNeeded) * 100 : 100,
  });

  // Helper to add a product
  const addProduct = (product: NutritionProduct, quantity: number, source: string): boolean => {
    if (quantity <= 0) return false;
    if (usedProductNames.has(product.name)) return false;
    if (selectedProducts.length >= MAX_TOTAL_PRODUCTS) return false;

    const effectiveWater = getEffectiveWater(product);
    const newCarbs = currentTotals.carbs + (product.defaultCarbs * quantity);
    const newSodium = currentTotals.sodium + (product.defaultSodium * quantity);
    const newWater = currentTotals.water + (effectiveWater * quantity);

    // Check limits - constrain to 110% max for all nutrients (green zone)
    if (newCarbs > limits.carbs.max * 1.05) {
      console.log(`[${strategy.id}] Rejected ${quantity}x ${product.name} - would exceed carbs limit (${Math.round(newCarbs)}g > ${Math.round(limits.carbs.max * 1.05)}g)`);
      return false;
    }
    if (newSodium > limits.sodium.max * 1.15) {
      console.log(`[${strategy.id}] Rejected ${quantity}x ${product.name} - would exceed sodium limit (${Math.round(newSodium)}mg > ${Math.round(limits.sodium.max * 1.15)}mg)`);
      return false;
    }
    // ADDED: Check water limit - don't overshoot water by more than 10%
    if (newWater > limits.water.max * 1.1) {
      console.log(`[${strategy.id}] Rejected ${quantity}x ${product.name} - would exceed water limit (${Math.round(newWater)}ml > ${Math.round(limits.water.max * 1.1)}ml)`);
      return false;
    }

    const contributes = {
      carbs: product.defaultCarbs * quantity,
      sodium: product.defaultSodium * quantity,
      water: effectiveWater * quantity,
    };

    selectedProducts.push({ product, quantity, contributes });
    currentTotals.carbs = newCarbs;
    currentTotals.sodium = newSodium;
    currentTotals.water = newWater;
    usedProductNames.add(product.name);

    console.log(`[${strategy.id}] ✓ [${source}] Added ${quantity}x ${product.name}: carbs=${currentTotals.carbs.toFixed(0)}g (${getCoverage().carbs.toFixed(0)}%), sodium=${currentTotals.sodium.toFixed(0)}mg (${getCoverage().sodium.toFixed(0)}%)`);
    return true;
  };

  // =========================================================================
  // PHASE 1: Add strategy-specific products (with category enforcement)
  // =========================================================================
  console.log(`[${strategy.id}] --- PHASE 1: Strategy-Specific Products ---`);

  const strategyProducts = getStrategyProducts(products, strategy);
  console.log(`[${strategy.id}] Found ${strategyProducts.length} eligible products for this strategy`);

  // Sort by category priority, then by carb density
  const sortedStrategyProducts = [...strategyProducts].sort((a, b) => {
    // Category priority
    const aIndex = strategy.categoryPriority.indexOf(a.category);
    const bIndex = strategy.categoryPriority.indexOf(b.category);
    const aPriority = aIndex === -1 ? 99 : aIndex;
    const bPriority = bIndex === -1 ? 99 : bIndex;
    if (aPriority !== bPriority) return aPriority - bPriority;

    // Then by carb content
    return b.defaultCarbs - a.defaultCarbs;
  });

  for (const product of sortedStrategyProducts) {
    // Enforce product limit
    if (selectedProducts.length >= MAX_BRAND_FAMILY_PRODUCTS) {
      console.log(`[${strategy.id}] Reached max ${MAX_BRAND_FAMILY_PRODUCTS} primary products`);
      break;
    }

    // Stop if we'd overshoot sodium (but still need carbs via real food)
    const coverage = getCoverage();
    if (coverage.sodium >= 95) {
      console.log(`[${strategy.id}] Sodium at ${coverage.sodium.toFixed(0)}% - switching to real food for carbs`);
      break;
    }

    // Skip if already used
    if (usedProductNames.has(product.name)) continue;

    // Skip water (we add it in phase 3)
    if (isWaterProduct(product)) continue;

    // Calculate optimal quantity
    let qty = 1;
    if (product.defaultCarbs > 0) {
      const carbsNeeded = limits.carbs.min - currentTotals.carbs;
      qty = Math.min(
        Math.ceil(carbsNeeded / product.defaultCarbs),
        MAX_QUANTITY_PER_PRODUCT
      );
    }

    // Don't overshoot sodium
    if (product.defaultSodium > 0 && target.sodiumNeeded > 0) {
      const sodiumHeadroom = limits.sodium.max - currentTotals.sodium;
      const maxForSodium = Math.floor(sodiumHeadroom / product.defaultSodium);
      qty = Math.min(qty, Math.max(1, maxForSodium));
    }

    // Don't overshoot water (ADDED)
    const effectiveWater = getEffectiveWater(product);
    if (effectiveWater > 0 && target.waterNeeded > 0) {
      const waterHeadroom = limits.water.max * 1.1 - currentTotals.water;
      const maxForWater = Math.floor(waterHeadroom / effectiveWater);
      qty = Math.min(qty, Math.max(1, maxForWater));
    }

    qty = Math.min(qty, MAX_QUANTITY_PER_PRODUCT);

    if (qty > 0 && addProduct(product, qty, 'BRAND')) {
      primaryProductCount++;
    }

    // Check if carbs are sufficient
    if (getCoverage().carbs >= GREEN_ZONE.min) {
      console.log(`[${strategy.id}] Carbs reached ${getCoverage().carbs.toFixed(0)}% from brand products`);
      break;
    }
  }

  // =========================================================================
  // PHASE 2: Fill carb gap with REAL FOOD (low/zero sodium)
  // =========================================================================
  const phase2Coverage = getCoverage();
  console.log(`[${strategy.id}] --- PHASE 2: Real Food for Carb Gaps (carbs: ${phase2Coverage.carbs.toFixed(0)}%) ---`);

  if (phase2Coverage.carbs < GREEN_ZONE.min && selectedProducts.length < MAX_TOTAL_PRODUCTS) {
    const realFood = getRealFoodProducts(products, strategy);
    console.log(`[${strategy.id}] Found ${realFood.length} real food products for carb gaps`);

    for (const food of realFood) {
      const coverage = getCoverage();
      if (coverage.carbs >= 100) {
        console.log(`[${strategy.id}] Carbs at 100% - done with real food`);
        break;
      }
      if (selectedProducts.length >= MAX_TOTAL_PRODUCTS) break;
      if (usedProductNames.has(food.name)) continue;

      // Calculate how many needed to fill carb gap
      const carbsNeeded = target.carbsNeeded - currentTotals.carbs;
      let qty = Math.ceil(carbsNeeded / food.defaultCarbs);
      qty = Math.min(qty, MAX_QUANTITY_PER_PRODUCT);

      if (qty > 0) {
        addProduct(food, qty, 'REAL FOOD');
      }
    }
  }

  // =========================================================================
  // PHASE 3: Add water for hydration if needed
  // =========================================================================
  const phase3Coverage = getCoverage();
  console.log(`[${strategy.id}] --- PHASE 3: Hydration (water: ${phase3Coverage.water.toFixed(0)}%) ---`);

  if (phase3Coverage.water < GREEN_ZONE.min && selectedProducts.length < MAX_TOTAL_PRODUCTS) {
    // Find water product
    const waterProduct = products.find(p =>
      p.name.toLowerCase() === 'water' && !usedProductNames.has(p.name)
    );

    if (waterProduct) {
      const waterPerServing = getEffectiveWater(waterProduct);
      const waterNeeded = limits.water.min - currentTotals.water;
      let qty = Math.ceil(waterNeeded / waterPerServing);
      qty = Math.min(qty, MAX_QUANTITY_PER_PRODUCT);

      if (qty > 0) {
        addProduct(waterProduct, qty, 'HYDRATION');
      }
    }
  }

  // =========================================================================
  // PHASE 4: Fine-tune if over limits
  // =========================================================================
  console.log(`[${strategy.id}] --- PHASE 4: Fine-tuning ---`);

  for (let i = selectedProducts.length - 1; i >= 0; i--) {
    const item = selectedProducts[i];
    const effectiveWater = getEffectiveWater(item.product);

    while (item.quantity > 1) {
      const coverage = getCoverage();

      // If everything is in acceptable range, we're done
      if (coverage.carbs <= GREEN_ZONE.max && coverage.sodium <= GREEN_ZONE.max) {
        break;
      }

      // If we're over the limit, reduce quantity
      if (coverage.carbs > GREEN_ZONE.max || coverage.sodium > GREEN_ZONE.max) {
        const newCarbs = currentTotals.carbs - item.product.defaultCarbs;
        const newCarbPercent = (newCarbs / target.carbsNeeded) * 100;

        // Only reduce if it doesn't drop carbs too far below minimum
        if (newCarbPercent >= GREEN_ZONE.min - 10) {
          item.quantity--;
          item.contributes.carbs -= item.product.defaultCarbs;
          item.contributes.sodium -= item.product.defaultSodium;
          item.contributes.water -= effectiveWater;
          currentTotals.carbs = newCarbs;
          currentTotals.sodium -= item.product.defaultSodium;
          currentTotals.water -= effectiveWater;

          console.log(`[${strategy.id}] Reduced ${item.product.name} to ${item.quantity}x`);
        } else {
          break;
        }
      } else {
        break;
      }
    }
  }

  // Remove items with quantity 0
  const finalProducts = selectedProducts.filter(p => p.quantity > 0);

  // Recalculate totals
  const totals = {
    carbs: finalProducts.reduce((sum, p) => sum + p.contributes.carbs, 0),
    sodium: finalProducts.reduce((sum, p) => sum + p.contributes.sodium, 0),
    water: finalProducts.reduce((sum, p) => sum + p.contributes.water, 0),
  };

  const coverage = calculateCoverage(totals, target);
  const score = scorePlan(coverage);

  console.log(`[${strategy.id}] === FINAL RESULT ===`);
  console.log(`[${strategy.id}] Products: ${finalProducts.length} (${primaryProductCount} primary, ${finalProducts.length - primaryProductCount} real food/water)`);
  console.log(`[${strategy.id}] Carbs: ${totals.carbs.toFixed(1)}g (${coverage.carbs}%)`);
  console.log(`[${strategy.id}] Sodium: ${totals.sodium.toFixed(0)}mg (${coverage.sodium}%)`);
  console.log(`[${strategy.id}] Water: ${totals.water.toFixed(0)}ml (${coverage.water}%)`);
  console.log(`[${strategy.id}] Score: ${score}`);

  return {
    id: `${strategy.id}-${Date.now()}`,
    name: `${strategy.emoji} ${strategy.name}`,
    description: strategy.description,
    strategy: strategy.id as any,
    products: finalProducts,
    totals,
    coveragePercent: coverage,
    score,
  };
}

// ============================================================================
// REFINEMENT FUNCTION: Keep improving until ALL metrics reach 90%+
// ============================================================================

/**
 * Refine a plan by adding products to fill gaps until ALL metrics reach 90%+
 * Returns an improved plan or the original if no improvement possible
 */
function refinePlanToGreenZone(
  plan: NutritionPlan,
  availableProducts: NutritionProduct[],
  target: NutritionTarget,
  strategy: StrategyConfig
): NutritionPlan {
  const limits = {
    carbs: calculateLimits(target.carbsNeeded),
    sodium: calculateLimits(target.sodiumNeeded),
    water: calculateLimits(target.waterNeeded),
  };

  // Copy the plan's products
  const selectedProducts: ProductSuggestion[] = plan.products.map(p => ({ ...p }));
  const usedProductNames = new Set(selectedProducts.map(p => p.product.name));
  const currentTotals = { ...plan.totals };

  // Helper to get current coverage
  const getCoverage = () => ({
    carbs: target.carbsNeeded > 0 ? (currentTotals.carbs / target.carbsNeeded) * 100 : 100,
    sodium: target.sodiumNeeded > 0 ? (currentTotals.sodium / target.sodiumNeeded) * 100 : 100,
    water: target.waterNeeded > 0 ? (currentTotals.water / target.waterNeeded) * 100 : 100,
  });

  // Helper to check if ALL nutrients are in GREEN zone
  const allInGreenZone = () => {
    const coverage = getCoverage();
    return coverage.carbs >= GREEN_ZONE.min &&
      coverage.sodium >= GREEN_ZONE.min &&
      coverage.water >= GREEN_ZONE.min;
  };

  // Helper to find the weakest metric
  const findWeakestMetric = (): 'carbs' | 'sodium' | 'water' | null => {
    const coverage = getCoverage();
    const gaps = [
      { metric: 'carbs' as const, gap: GREEN_ZONE.min - coverage.carbs },
      { metric: 'sodium' as const, gap: GREEN_ZONE.min - coverage.sodium },
      { metric: 'water' as const, gap: GREEN_ZONE.min - coverage.water },
    ].filter(g => g.gap > 0);

    if (gaps.length === 0) return null;
    gaps.sort((a, b) => b.gap - a.gap);
    return gaps[0].metric;
  };

  // Helper to add a product
  const addProduct = (product: NutritionProduct, quantity: number): boolean => {
    if (quantity <= 0) return false;

    const effectiveWater = getEffectiveWater(product);
    const newCarbs = currentTotals.carbs + (product.defaultCarbs * quantity);
    const newSodium = currentTotals.sodium + (product.defaultSodium * quantity);
    const newWater = currentTotals.water + (effectiveWater * quantity);

    // Check limits
    if (newCarbs > limits.carbs.max * 1.05) return false;
    if (newSodium > limits.sodium.max * 1.15) return false;
    if (newWater > limits.water.max * 1.1) return false;

    const contributes = {
      carbs: product.defaultCarbs * quantity,
      sodium: product.defaultSodium * quantity,
      water: effectiveWater * quantity,
    };

    // Check if product already exists, increase quantity instead
    const existingIdx = selectedProducts.findIndex(p => p.product.name === product.name);
    if (existingIdx >= 0) {
      const existing = selectedProducts[existingIdx];
      const newQty = existing.quantity + quantity;
      if (newQty > 4) return false; // Max 4 of any product

      existing.quantity = newQty;
      existing.contributes.carbs += contributes.carbs;
      existing.contributes.sodium += contributes.sodium;
      existing.contributes.water += contributes.water;
    } else {
      selectedProducts.push({ product, quantity, contributes });
      usedProductNames.add(product.name);
    }

    currentTotals.carbs = newCarbs;
    currentTotals.sodium = newSodium;
    currentTotals.water = newWater;
    return true;
  };

  // Iterate to fill gaps
  let attempts = 0;
  const maxAttempts = 10;

  console.log(`[${strategy.id}] Starting refinement - current score: ${plan.score}`);

  while (attempts < maxAttempts && !allInGreenZone() && selectedProducts.length < 8) {
    const weakestMetric = findWeakestMetric();
    if (!weakestMetric) break;

    console.log(`[${strategy.id}] Refinement attempt ${attempts + 1}: weakest metric is ${weakestMetric}`);

    let improved = false;

    // Find best product for the weakest metric
    let candidates: NutritionProduct[];

    if (weakestMetric === 'carbs') {
      candidates = availableProducts
        .filter(p => p.defaultCarbs > 0)
        .sort((a, b) => b.defaultCarbs - a.defaultCarbs);
    } else if (weakestMetric === 'sodium') {
      candidates = availableProducts
        .filter(p => p.defaultSodium >= 50)
        .sort((a, b) => {
          // Prefer high sodium with low carb impact
          const aRatio = a.defaultSodium / Math.max(a.defaultCarbs, 0.1);
          const bRatio = b.defaultSodium / Math.max(b.defaultCarbs, 0.1);
          const aBonus = a.defaultCarbs === 0 ? 1000 : 0;
          const bBonus = b.defaultCarbs === 0 ? 1000 : 0;
          return (bRatio + bBonus) - (aRatio + aBonus);
        });
    } else {
      candidates = availableProducts
        .filter(p => getEffectiveWater(p) > 0)
        .sort((a, b) => getEffectiveWater(b) - getEffectiveWater(a));
    }

    // Try each candidate - prefer products not yet used
    const unusedCandidates = candidates.filter(p => !usedProductNames.has(p.name));
    const usedCandidates = candidates.filter(p => usedProductNames.has(p.name));

    for (const product of [...unusedCandidates, ...usedCandidates]) {
      if (addProduct(product, 1)) {
        improved = true;
        console.log(`[${strategy.id}] Added 1x ${product.name} for ${weakestMetric}`);
        break;
      }
    }

    if (!improved) {
      console.log(`[${strategy.id}] Could not find product to improve ${weakestMetric}`);
      break;
    }

    attempts++;
  }

  // Calculate final coverage and score
  const coverage = calculateCoverage(currentTotals, target);
  const score = scorePlan(coverage);

  console.log(`[${strategy.id}] Refinement complete - new score: ${score} (was ${plan.score})`);

  // Return improved plan only if score is better
  if (score > plan.score) {
    return {
      ...plan,
      products: selectedProducts,
      totals: currentTotals,
      coveragePercent: coverage,
      score,
    };
  }

  return plan;
}

// ============================================================================
// ALTERNATIVE APPROACH: EXACT TARGET MATCHING
// ============================================================================

/**
 * Try to find an exact combination that hits all targets within GREEN zone
 * Uses a more exhaustive search
 */
function findOptimalCombination(
  products: NutritionProduct[],
  target: NutritionTarget,
  strategy: StrategyConfig,
  recentlyUsedNames: string[] = []
): NutritionPlan | null {
  const limits = {
    carbs: calculateLimits(target.carbsNeeded),
    sodium: calculateLimits(target.sodiumNeeded),
    water: calculateLimits(target.waterNeeded),
  };

  // Filter to products that could help
  const usableProducts = products.filter(p =>
    p.defaultCarbs > 0 || p.defaultSodium > 0 || p.defaultWater > 0
  );

  // Try different combinations
  let bestPlan: NutritionPlan | null = null;
  let bestScore = 0;

  // Simple greedy approach with multiple starting points
  for (let startIdx = 0; startIdx < Math.min(usableProducts.length, 5); startIdx++) {
    const plan = tryFromStartingProduct(
      usableProducts,
      target,
      limits,
      strategy,
      startIdx,
      recentlyUsedNames
    );

    if (plan && plan.score > bestScore) {
      bestScore = plan.score;
      bestPlan = plan;
    }
  }

  return bestPlan;
}

function tryFromStartingProduct(
  products: NutritionProduct[],
  target: NutritionTarget,
  limits: any,
  strategy: StrategyConfig,
  startIdx: number,
  _recentlyUsedNames: string[]
): NutritionPlan | null {
  const selectedProducts: ProductSuggestion[] = [];
  const usedProductNames = new Set<string>();
  const currentTotals = { carbs: 0, sodium: 0, water: 0 };

  // Helper to get current coverage
  const getCoverage = () => ({
    carbs: target.carbsNeeded > 0 ? (currentTotals.carbs / target.carbsNeeded) * 100 : 100,
    sodium: target.sodiumNeeded > 0 ? (currentTotals.sodium / target.sodiumNeeded) * 100 : 100,
    water: target.waterNeeded > 0 ? (currentTotals.water / target.waterNeeded) * 100 : 100,
  });

  // Helper to check if ALL nutrients are in GREEN zone
  const allInGreenZone = () => {
    const coverage = getCoverage();
    return coverage.carbs >= GREEN_ZONE.min &&
      coverage.sodium >= GREEN_ZONE.min &&
      coverage.water >= GREEN_ZONE.min;
  };

  // Helper to add a product
  const addProduct = (product: NutritionProduct, quantity: number): boolean => {
    if (quantity <= 0) return false;
    if (usedProductNames.has(product.name)) return false;

    const effectiveWater = getEffectiveWater(product);
    const newCarbs = currentTotals.carbs + (product.defaultCarbs * quantity);
    const newSodium = currentTotals.sodium + (product.defaultSodium * quantity);
    const newWater = currentTotals.water + (effectiveWater * quantity);

    // Check limits - constrain to ~110% max for all nutrients
    if (newCarbs > limits.carbs.max * 1.05) return false;
    if (newSodium > limits.sodium.max * 1.15) return false;
    if (newWater > limits.water.max * 1.1) return false;

    const contributes = {
      carbs: product.defaultCarbs * quantity,
      sodium: product.defaultSodium * quantity,
      water: effectiveWater * quantity,
    };

    selectedProducts.push({ product, quantity, contributes });
    currentTotals.carbs = newCarbs;
    currentTotals.sodium = newSodium;
    currentTotals.water = newWater;
    usedProductNames.add(product.name);
    return true;
  };

  // Reorder products to start with different product
  const reorderedProducts = [
    ...products.slice(startIdx),
    ...products.slice(0, startIdx)
  ];

  // PHASE 1: Build carb base
  for (const product of reorderedProducts) {
    if (selectedProducts.length >= 4) break; // Leave room for sodium/water products
    if (usedProductNames.has(product.name)) continue;

    // FIXED: Stop only when ALL nutrients are in GREEN zone
    if (allInGreenZone()) break;

    // Stop carb phase when carbs are sufficient
    const carbPercent = getCoverage().carbs;
    if (carbPercent >= GREEN_ZONE.min && carbPercent <= GREEN_ZONE.max) break;

    // Find optimal quantity - prefer 1-2 for variety
    for (let qty = 1; qty <= 2; qty++) {
      const newCarbs = currentTotals.carbs + (product.defaultCarbs * qty);
      const newSodium = currentTotals.sodium + (product.defaultSodium * qty);
      const newWater = currentTotals.water + (getEffectiveWater(product) * qty);

      if (newCarbs > limits.carbs.max) break;
      if (newSodium > limits.sodium.max) break;
      // ADDED: Check water limit to prevent overshooting
      if (newWater > limits.water.max * 1.1) break;

      const newCarbPercent = (newCarbs / target.carbsNeeded) * 100;

      if (newCarbPercent <= GREEN_ZONE.max) {
        const effectiveWater = getEffectiveWater(product);
        const contributes = {
          carbs: product.defaultCarbs * qty,
          sodium: product.defaultSodium * qty,
          water: effectiveWater * qty,
        };

        // Remove previous entry if exists
        const existingIdx = selectedProducts.findIndex(p => p.product.name === product.name);
        if (existingIdx >= 0) {
          currentTotals.carbs -= selectedProducts[existingIdx].contributes.carbs;
          currentTotals.sodium -= selectedProducts[existingIdx].contributes.sodium;
          currentTotals.water -= selectedProducts[existingIdx].contributes.water;
          selectedProducts.splice(existingIdx, 1);
        }

        selectedProducts.push({ product, quantity: qty, contributes });
        currentTotals.carbs += contributes.carbs;
        currentTotals.sodium += contributes.sodium;
        currentTotals.water += contributes.water;
        usedProductNames.add(product.name);
      }
    }
  }

  // PHASE 2: Fill sodium gap if needed
  const phase2Coverage = getCoverage();
  if (phase2Coverage.sodium < GREEN_ZONE.min && selectedProducts.length < 6) {
    // Find high-sodium products - prioritize pure electrolytes
    const sodiumProducts = products
      .filter(p => !usedProductNames.has(p.name))
      .filter(p => p.defaultSodium >= 50)
      .sort((a, b) => {
        const aRatio = a.defaultSodium / Math.max(a.defaultCarbs, 0.1);
        const bRatio = b.defaultSodium / Math.max(b.defaultCarbs, 0.1);
        const aBonus = a.defaultCarbs === 0 ? 1000 : 0;
        const bBonus = b.defaultCarbs === 0 ? 1000 : 0;
        return (bRatio + bBonus) - (aRatio + aBonus);
      });

    for (const product of sodiumProducts) {
      if (selectedProducts.length >= 6) break;
      if (getCoverage().sodium >= GREEN_ZONE.min) break;

      // Calculate quantity needed
      const sodiumNeeded = limits.sodium.min - currentTotals.sodium;
      let qty = Math.ceil(sodiumNeeded / product.defaultSodium);

      if (product.defaultCarbs === 0) {
        qty = Math.min(qty, 3);
      } else {
        const maxCarbQty = Math.floor((limits.carbs.max - currentTotals.carbs) / product.defaultCarbs);
        qty = Math.min(qty, Math.max(1, maxCarbQty), 2);
      }

      if (qty > 0) {
        addProduct(product, qty);
      }
    }
  }

  // PHASE 3: Fill water gap if needed
  const phase3Coverage = getCoverage();
  if (phase3Coverage.water < GREEN_ZONE.min && selectedProducts.length < 6) {
    const waterProducts = products
      .filter(p => !usedProductNames.has(p.name))
      .filter(p => getEffectiveWater(p) > 0)
      .sort((a, b) => {
        const aWater = getEffectiveWater(a);
        const bWater = getEffectiveWater(b);
        const aScore = aWater - (a.defaultCarbs * 10) - (a.defaultSodium * 0.5);
        const bScore = bWater - (b.defaultCarbs * 10) - (b.defaultSodium * 0.5);
        return bScore - aScore;
      });

    for (const product of waterProducts) {
      if (selectedProducts.length >= 6) break;
      if (getCoverage().water >= GREEN_ZONE.min) break;

      const waterPerServing = getEffectiveWater(product);
      const waterNeeded = limits.water.min - currentTotals.water;
      let qty = Math.ceil(waterNeeded / waterPerServing);

      const maxWaterQty = Math.floor((limits.water.max - currentTotals.water) / waterPerServing);
      qty = Math.min(qty, Math.max(1, maxWaterQty));

      if (product.defaultCarbs > 5) {
        const maxCarbQty = Math.floor((limits.carbs.max - currentTotals.carbs) / product.defaultCarbs);
        qty = Math.min(qty, Math.max(1, maxCarbQty));
      }
      if (product.defaultSodium > 100) {
        const maxSodiumQty = Math.floor((limits.sodium.max - currentTotals.sodium) / product.defaultSodium);
        qty = Math.min(qty, Math.max(1, maxSodiumQty));
      }

      qty = Math.min(qty, 2);

      if (qty > 0) {
        addProduct(product, qty);
      }
    }
  }

  if (selectedProducts.length === 0) return null;

  const totals = {
    carbs: selectedProducts.reduce((sum, p) => sum + p.contributes.carbs, 0),
    sodium: selectedProducts.reduce((sum, p) => sum + p.contributes.sodium, 0),
    water: selectedProducts.reduce((sum, p) => sum + p.contributes.water, 0),
  };

  const coverage = calculateCoverage(totals, target);

  return {
    id: `${strategy.id}-${Date.now()}-${startIdx}`,
    name: `${strategy.emoji} ${strategy.name}`,
    description: strategy.description,
    strategy: strategy.id as any,
    products: selectedProducts,
    totals,
    coveragePercent: coverage,
    score: scorePlan(coverage),
  };
}

// ============================================================================
// MAIN EXPORT FUNCTION
// ============================================================================

export function generateSmartSuggestions(
  availableProducts: NutritionProduct[],
  target: NutritionTarget,
  recentlyUsedNames: string[] = []
): SmartSuggestionResult {
  const warnings: string[] = [];
  const tips: string[] = [];

  // Validation
  if (target.segmentTimeHours <= 0) {
    warnings.push('Set a pace to calculate nutrition needs for this segment.');
    tips.push('Add segment distance and pace to get smart nutrition suggestions.');
    return { target, plans: [], warnings, tips };
  }

  if (availableProducts.length === 0) {
    warnings.push('No products available in your library.');
    tips.push('Go to Manage Products to add nutrition products.');
    return { target, plans: [], warnings, tips };
  }

  // Filter out recovery/protein products FIRST
  const energyProducts = filterEnergyProducts(availableProducts);

  console.log(`[Smart Nutrition] Filtered ${availableProducts.length} products down to ${energyProducts.length} energy products`);
  console.log(`[Smart Nutrition] Excluded: ${availableProducts.length - energyProducts.length} recovery/protein products`);

  // Generate tips
  if (target.segmentTimeHours > 2) {
    tips.push('Long segment: Consider adding variety to prevent flavor fatigue.');
  }
  if (target.carbsNeeded > 150) {
    tips.push('High carb requirement: Mix liquid and solid sources for better absorption.');
  }
  if (target.sodiumNeeded > 800) {
    tips.push('High sodium needs: Consider salt capsules or electrolyte tablets.');
  }

  // Filter usable products (must have carbs, sodium, or water value)
  const usableProducts = energyProducts.filter(p =>
    p.defaultCarbs > 0 || p.defaultSodium > 0 || p.defaultWater > 0
  );

  if (usableProducts.length === 0) {
    warnings.push('No usable energy products found. Add gels, drinks, bars, or electrolytes.');
    return { target, plans: [], warnings, tips };
  }

  console.log('=== SMART NUTRITION SUGGESTIONS ===');
  console.log('Target:', target);
  console.log('GREEN zone: 90-105%');
  console.log('Carbs limit:', calculateLimits(target.carbsNeeded));
  console.log('Sodium limit:', calculateLimits(target.sodiumNeeded));
  console.log('Available products:', usableProducts.length);

  // Generate plans for each strategy
  const plans: NutritionPlan[] = [];

  for (const strategy of STRATEGIES) {
    // CRITICAL: Filter products by strategy FIRST before any plan generation
    const strategyProducts = getStrategyProducts(usableProducts, strategy);

    console.log(`[${strategy.id}] Using ${strategyProducts.length} filtered products (from ${usableProducts.length} total)`);

    if (strategyProducts.length === 0) {
      console.warn(`[${strategy.id}] No products available after filtering - skipping`);
      continue;
    }

    // Try the optimal combination finder first WITH FILTERED PRODUCTS
    let plan = findOptimalCombination(strategyProducts, target, strategy, recentlyUsedNames);

    // Fall back to greedy approach if score < 90 (must achieve GREEN zone on all metrics)
    if (!plan || plan.score < 90) {
      const greedyPlan = generatePlanForStrategy(strategyProducts, target, strategy, recentlyUsedNames);
      // Use whichever plan has higher score
      if (!plan || (greedyPlan && greedyPlan.score > plan.score)) {
        plan = greedyPlan;
      }
    }

    // Apply refinement to improve plans that aren't at 90%+ on all metrics
    if (plan && plan.score < 100) {
      const refined = refinePlanToGreenZone(plan, strategyProducts, target, strategy);
      if (refined.score > plan.score) {
        plan = refined;
      }
    }

    if (plan && plan.products.length > 0) {
      plans.push(plan);
    }
  }

  // Sort by score (highest first)
  plans.sort((a, b) => b.score - a.score);

  // =========================================================================
  // DEDUPLICATION CHECK: Ensure strategies have different products
  // =========================================================================
  const getProductFingerprint = (plan: NutritionPlan): string => {
    return plan.products
      .map(p => `${p.product.name}:${p.quantity}`)
      .sort()
      .join('|');
  };

  const fingerprints = new Map<string, string>();
  const duplicateStrategies: string[] = [];

  for (const plan of plans) {
    const fp = getProductFingerprint(plan);
    const existingStrategy = fingerprints.get(fp);
    if (existingStrategy) {
      duplicateStrategies.push(`${plan.name} = ${existingStrategy}`);
      console.warn(`[DUPLICATE DETECTED] ${plan.name} has same products as ${existingStrategy}`);
    } else {
      fingerprints.set(fp, plan.name);
    }
  }

  if (duplicateStrategies.length > 0) {
    console.warn(`[Smart Nutrition] WARNING: ${duplicateStrategies.length} duplicate strategies detected!`);
    console.warn(`[Smart Nutrition] Duplicates: ${duplicateStrategies.join(', ')}`);
    // This indicates the filtering isn't working - add a tip for the user
    tips.push('Some strategies may suggest similar products. Check your Quick Add Products for more variety.');
  }

  // Log results
  console.log('Generated plans:');
  plans.forEach(p => {
    console.log(`  ${p.name}: score=${p.score}, products=${p.products.length}`);
    console.log(`    Carbs: ${p.coveragePercent.carbs}%, Sodium: ${p.coveragePercent.sodium}%, Water: ${p.coveragePercent.water}%`);
    console.log(`    Products: ${p.products.map(pr => pr.product.name).join(', ')}`);
  });

  // Warning if no plan achieved GREEN zone (90%+ on all metrics)
  const bestPlan = plans[0];
  if (bestPlan) {
    const carbsGreen = bestPlan.coveragePercent.carbs >= GREEN_ZONE.min;
    const sodiumGreen = bestPlan.coveragePercent.sodium >= GREEN_ZONE.min;
    const waterGreen = bestPlan.coveragePercent.water >= GREEN_ZONE.min;
    const allGreen = carbsGreen && sodiumGreen && waterGreen;

    if (!allGreen) {
      // Identify which metrics are under target
      const underTargetMetrics: string[] = [];
      if (!carbsGreen) underTargetMetrics.push(`Carbs (${bestPlan.coveragePercent.carbs}%)`);
      if (!sodiumGreen) underTargetMetrics.push(`Sodium (${bestPlan.coveragePercent.sodium}%)`);
      if (!waterGreen) underTargetMetrics.push(`Water (${bestPlan.coveragePercent.water}%)`);

      if (underTargetMetrics.length > 0) {
        warnings.push(`Could not achieve 90%+ on: ${underTargetMetrics.join(', ')}. Consider adding more products that provide these nutrients.`);
      } else {
        warnings.push('Could not find a perfect match. Consider adding more product variety to your library.');
      }
    }
  }

  return { target, plans, warnings, tips };
}

/**
 * Quick suggest: Returns the single best plan
 */
export function quickSuggest(
  availableProducts: NutritionProduct[],
  target: NutritionTarget,
  recentlyUsedNames: string[] = []
): NutritionPlan | null {
  const result = generateSmartSuggestions(availableProducts, target, recentlyUsedNames);
  return result.plans.length > 0 ? result.plans[0] : null;
}

/**
 * Convert plan to NutritionItem[] for saving
 */
export function planToNutritionItems(plan: NutritionPlan): Array<{
  id: string;
  productName: string;
  quantity: number;
  carbsPerServing: number;
  sodiumPerServing: number;
  waterPerServing: number;
  servingSize: string;
  isCustom: boolean;
  isEditingCarbs: boolean;
  isEditingSodium: boolean;
  isEditingWater: boolean;
}> {
  return plan.products.map((item, index) => ({
    id: `smart-${Date.now()}-${index}`,
    productName: item.product.name,
    quantity: item.quantity,
    carbsPerServing: item.product.defaultCarbs,
    sodiumPerServing: item.product.defaultSodium,
    waterPerServing: item.quantity > 0 ? item.contributes.water / item.quantity : item.product.defaultWater,  // Use effective water per serving
    servingSize: item.product.servingSize,
    isCustom: false,
    isEditingCarbs: false,
    isEditingSodium: false,
    isEditingWater: false,
  }));
}
