/**
 * Product Intolerance Logging Utility
 *
 * Tracks products that have caused GI issues to help users avoid
 * problematic nutrition choices in future races.
 *
 * Storage: localStorage (offline-capable, instant access)
 */

import type { ProductIntolerance } from '../../shared/types';

// ============================================
// STORAGE
// ============================================

const STORAGE_KEY = 'ultra_planner_product_intolerances';

/**
 * Get all logged product intolerances
 */
export function getProductIntolerances(): ProductIntolerance[] {
  try {
    const data = localStorage.getItem(STORAGE_KEY);
    return data ? JSON.parse(data) : [];
  } catch {
    console.warn('Failed to load product intolerances from localStorage');
    return [];
  }
}

/**
 * Save product intolerances to localStorage
 */
function saveProductIntolerances(intolerances: ProductIntolerance[]): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(intolerances));
  } catch (error) {
    console.error('Failed to save product intolerances:', error);
  }
}

/**
 * Log a new product intolerance
 */
export function logProductIntolerance(intolerance: Omit<ProductIntolerance, 'id' | 'timestamp'>): ProductIntolerance {
  const existing = getProductIntolerances();

  const newIntolerance: ProductIntolerance = {
    ...intolerance,
    id: crypto.randomUUID(),
    timestamp: new Date().toISOString()
  };

  existing.push(newIntolerance);
  saveProductIntolerances(existing);

  return newIntolerance;
}

/**
 * Update an existing intolerance log
 */
export function updateProductIntolerance(id: string, updates: Partial<ProductIntolerance>): boolean {
  const intolerances = getProductIntolerances();
  const index = intolerances.findIndex(i => i.id === id);

  if (index === -1) return false;

  intolerances[index] = { ...intolerances[index], ...updates };
  saveProductIntolerances(intolerances);

  return true;
}

/**
 * Delete an intolerance log
 */
export function deleteProductIntolerance(id: string): boolean {
  const intolerances = getProductIntolerances();
  const filtered = intolerances.filter(i => i.id !== id);

  if (filtered.length === intolerances.length) return false;

  saveProductIntolerances(filtered);
  return true;
}

/**
 * Clear all intolerance logs
 */
export function clearAllIntolerances(): void {
  localStorage.removeItem(STORAGE_KEY);
}

// ============================================
// QUERIES
// ============================================

/**
 * Get intolerances for a specific product
 */
export function getIntolerancesByProduct(productName: string): ProductIntolerance[] {
  return getProductIntolerances().filter(
    i => i.productName.toLowerCase() === productName.toLowerCase()
  );
}

/**
 * Check if a product has any logged intolerances
 */
export function hasKnownIntolerance(productName: string): boolean {
  return getIntolerancesByProduct(productName).length > 0;
}

/**
 * Get the most severe intolerance for a product
 */
export function getMostSevereIntolerance(productName: string): ProductIntolerance | null {
  const intolerances = getIntolerancesByProduct(productName);
  if (intolerances.length === 0) return null;

  return intolerances.reduce((most, current) =>
    current.severity > most.severity ? current : most
  );
}

/**
 * Get all products with logged intolerances
 */
export function getProblematicProducts(): string[] {
  const intolerances = getProductIntolerances();
  return [...new Set(intolerances.map(i => i.productName))];
}

/**
 * Get intolerances by issue type
 */
export function getIntolerancesByType(issueType: ProductIntolerance['issueType']): ProductIntolerance[] {
  return getProductIntolerances().filter(i => i.issueType === issueType);
}

/**
 * Get intolerances from a specific race
 */
export function getIntolerancesByRace(raceId: number): ProductIntolerance[] {
  return getProductIntolerances().filter(i => i.raceId === raceId);
}

// ============================================
// STATISTICS
// ============================================

export interface IntoleranceStats {
  totalLogs: number;
  uniqueProducts: number;
  byIssueType: Record<ProductIntolerance['issueType'], number>;
  bySeverity: Record<1 | 2 | 3, number>;
  mostProblematicProduct: string | null;
}

/**
 * Get statistics about logged intolerances
 */
export function getIntoleranceStats(): IntoleranceStats {
  const intolerances = getProductIntolerances();

  const byIssueType: Record<ProductIntolerance['issueType'], number> = {
    nausea: 0,
    cramping: 0,
    bloating: 0,
    other: 0
  };

  const bySeverity: Record<1 | 2 | 3, number> = {
    1: 0,
    2: 0,
    3: 0
  };

  const productCounts: Record<string, number> = {};

  for (const intolerance of intolerances) {
    byIssueType[intolerance.issueType]++;
    bySeverity[intolerance.severity]++;

    const product = intolerance.productName.toLowerCase();
    productCounts[product] = (productCounts[product] || 0) + 1;
  }

  // Find most problematic product
  let mostProblematicProduct: string | null = null;
  let maxCount = 0;
  for (const [product, count] of Object.entries(productCounts)) {
    if (count > maxCount) {
      maxCount = count;
      mostProblematicProduct = product;
    }
  }

  return {
    totalLogs: intolerances.length,
    uniqueProducts: Object.keys(productCounts).length,
    byIssueType,
    bySeverity,
    mostProblematicProduct
  };
}

// ============================================
// UI HELPERS
// ============================================

/**
 * Get severity label
 */
export function getSeverityLabel(severity: 1 | 2 | 3): string {
  switch (severity) {
    case 1: return 'Mild';
    case 2: return 'Moderate';
    case 3: return 'Severe';
    default: return 'Unknown';
  }
}

/**
 * Get severity color
 */
export function getSeverityColor(severity: 1 | 2 | 3): string {
  switch (severity) {
    case 1: return 'text-yellow-600 dark:text-yellow-400';
    case 2: return 'text-orange-600 dark:text-orange-400';
    case 3: return 'text-red-600 dark:text-red-400';
    default: return 'text-gray-600';
  }
}

/**
 * Get severity background color
 */
export function getSeverityBgColor(severity: 1 | 2 | 3): string {
  switch (severity) {
    case 1: return 'bg-yellow-100 dark:bg-yellow-900/30';
    case 2: return 'bg-orange-100 dark:bg-orange-900/30';
    case 3: return 'bg-red-100 dark:bg-red-900/30';
    default: return 'bg-gray-100';
  }
}

/**
 * Get issue type label
 */
export function getIssueTypeLabel(issueType: ProductIntolerance['issueType']): string {
  switch (issueType) {
    case 'nausea': return 'Nausea';
    case 'cramping': return 'Stomach Cramping';
    case 'bloating': return 'Bloating';
    case 'other': return 'Other Issue';
    default: return 'Unknown';
  }
}

/**
 * Get issue type emoji
 */
export function getIssueTypeEmoji(issueType: ProductIntolerance['issueType']): string {
  switch (issueType) {
    case 'nausea': return '🤢';
    case 'cramping': return '😣';
    case 'bloating': return '😮‍💨';
    case 'other': return '⚠️';
    default: return '❓';
  }
}

/**
 * Format intolerance for display
 */
export function formatIntoleranceDisplay(intolerance: ProductIntolerance): string {
  const emoji = getIssueTypeEmoji(intolerance.issueType);
  const severity = getSeverityLabel(intolerance.severity);
  const type = getIssueTypeLabel(intolerance.issueType);

  return `${emoji} ${type} (${severity}) at Mile ${intolerance.distanceMile}`;
}

/**
 * Get warning message for a product with known intolerance
 */
export function getIntoleranceWarning(productName: string): string | null {
  const intolerance = getMostSevereIntolerance(productName);
  if (!intolerance) return null;

  const type = getIssueTypeLabel(intolerance.issueType).toLowerCase();
  const severity = getSeverityLabel(intolerance.severity).toLowerCase();

  return `You logged ${severity} ${type} with this product at Mile ${intolerance.distanceMile}`;
}
