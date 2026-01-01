/**
 * Caffeine Database
 * Common caffeinated products for ultra running with caffeine content data
 */

export interface CaffeineSource {
  name: string;
  caffeinePerServing: number; // mg
  servingSize: string;
  category: 'gel' | 'drink' | 'pill' | 'food';
}

/**
 * Database of common caffeinated products used in ultra running
 * Caffeine values are approximate and may vary by formulation
 */
export const CAFFEINE_DATABASE: CaffeineSource[] = [
  // Gels with caffeine
  { name: 'GU Roctane (Caffeine)', caffeinePerServing: 35, servingSize: '1 gel', category: 'gel' },
  { name: 'GU Energy Gel (Caffeine)', caffeinePerServing: 20, servingSize: '1 gel', category: 'gel' },
  { name: 'SIS Go + Caffeine', caffeinePerServing: 75, servingSize: '1 gel', category: 'gel' },
  { name: 'SIS Beta Fuel + Caffeine', caffeinePerServing: 200, servingSize: '1 gel', category: 'gel' },
  { name: 'Maurten CAF 100', caffeinePerServing: 100, servingSize: '1 gel', category: 'gel' },
  { name: 'Spring Energy Awesome Sauce', caffeinePerServing: 100, servingSize: '1 gel', category: 'gel' },
  { name: 'Clif Shot (Double Espresso)', caffeinePerServing: 100, servingSize: '1 gel', category: 'gel' },
  { name: 'Clif Shot (Mocha)', caffeinePerServing: 50, servingSize: '1 gel', category: 'gel' },
  { name: 'Hammer Espresso Gel', caffeinePerServing: 50, servingSize: '1 gel', category: 'gel' },
  { name: 'Precision Fuel Gel 30 Caffeine', caffeinePerServing: 100, servingSize: '1 gel', category: 'gel' },
  { name: 'Huma Plus Caffeine', caffeinePerServing: 25, servingSize: '1 gel', category: 'gel' },
  { name: 'Neversecond C30+ Caffeine', caffeinePerServing: 100, servingSize: '1 gel', category: 'gel' },

  // Drinks
  { name: 'Tailwind Caffeinated', caffeinePerServing: 35, servingSize: '1 scoop (100 cal)', category: 'drink' },
  { name: 'Nuun Energy', caffeinePerServing: 40, servingSize: '1 tablet', category: 'drink' },
  { name: 'Skratch Labs Superfuel + Caffeine', caffeinePerServing: 100, servingSize: '1 scoop', category: 'drink' },
  { name: 'Coke / Coca-Cola', caffeinePerServing: 34, servingSize: '330ml can', category: 'drink' },
  { name: 'Pepsi', caffeinePerServing: 38, servingSize: '330ml can', category: 'drink' },
  { name: 'Mountain Dew', caffeinePerServing: 54, servingSize: '330ml can', category: 'drink' },
  { name: 'Red Bull', caffeinePerServing: 80, servingSize: '250ml can', category: 'drink' },
  { name: 'Monster Energy', caffeinePerServing: 160, servingSize: '500ml can', category: 'drink' },
  { name: 'Coffee (brewed)', caffeinePerServing: 95, servingSize: '240ml cup', category: 'drink' },
  { name: 'Coffee (espresso)', caffeinePerServing: 63, servingSize: '1 shot (30ml)', category: 'drink' },
  { name: 'Coffee (strong/double)', caffeinePerServing: 150, servingSize: '240ml cup', category: 'drink' },
  { name: 'Instant Coffee', caffeinePerServing: 60, servingSize: '240ml cup', category: 'drink' },
  { name: 'Iced Tea (sweetened)', caffeinePerServing: 25, servingSize: '240ml', category: 'drink' },
  { name: 'Green Tea', caffeinePerServing: 30, servingSize: '240ml cup', category: 'drink' },

  // Caffeine Pills/Tablets
  { name: 'Caffeine Pill 50mg', caffeinePerServing: 50, servingSize: '1 tablet', category: 'pill' },
  { name: 'Caffeine Pill 100mg', caffeinePerServing: 100, servingSize: '1 tablet', category: 'pill' },
  { name: 'Caffeine Pill 200mg', caffeinePerServing: 200, servingSize: '1 tablet', category: 'pill' },
  { name: 'No-Doz', caffeinePerServing: 100, servingSize: '1 tablet', category: 'pill' },
  { name: 'Vivarin', caffeinePerServing: 200, servingSize: '1 tablet', category: 'pill' },

  // Foods with caffeine
  { name: 'Dark Chocolate (70%+)', caffeinePerServing: 25, servingSize: '1 oz (28g)', category: 'food' },
  { name: 'Milk Chocolate', caffeinePerServing: 6, servingSize: '1 oz (28g)', category: 'food' },
  { name: 'Chocolate Covered Coffee Beans', caffeinePerServing: 12, servingSize: '1 bean', category: 'food' },
  { name: 'Clif Bar (Coffee)', caffeinePerServing: 65, servingSize: '1 bar', category: 'food' },
];

/**
 * Get caffeine content for a product by name (fuzzy match)
 */
export function getCaffeineForProduct(productName: string): number | null {
  const normalizedName = productName.toLowerCase().trim();

  // Exact match first
  const exactMatch = CAFFEINE_DATABASE.find(
    p => p.name.toLowerCase() === normalizedName
  );
  if (exactMatch) return exactMatch.caffeinePerServing;

  // Partial match
  const partialMatch = CAFFEINE_DATABASE.find(
    p => normalizedName.includes(p.name.toLowerCase()) ||
         p.name.toLowerCase().includes(normalizedName)
  );
  if (partialMatch) return partialMatch.caffeinePerServing;

  return null;
}

/**
 * Get all caffeinated products by category
 */
export function getCaffeinatedProductsByCategory(category: CaffeineSource['category']): CaffeineSource[] {
  return CAFFEINE_DATABASE.filter(p => p.category === category);
}

/**
 * Check if a product name likely contains caffeine (for auto-detection)
 */
export function likelyContainsCaffeine(productName: string): boolean {
  const caffeineKeywords = [
    'caffeine', 'coffee', 'espresso', 'caf 100', 'caf100',
    'cola', 'coke', 'pepsi', 'mountain dew', 'red bull', 'monster',
    'energy', 'caffeinated', 'double shot', 'double espresso'
  ];

  const lowerName = productName.toLowerCase();
  return caffeineKeywords.some(keyword => lowerName.includes(keyword));
}
