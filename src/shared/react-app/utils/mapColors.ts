/**
 * Map color utilities for GPX route segments
 * Provides consistent color scheme across 2D and 3D map views
 */

export const SEGMENT_COLORS = [
  '#3b82f6', // Blue
  '#10b981', // Green
  '#f59e0b', // Amber
  '#ef4444', // Red
  '#8b5cf6', // Purple
  '#ec4899', // Pink
  '#06b6d4', // Cyan
  '#84cc16', // Lime
] as const;

export const SEGMENT_COLOR_NAMES = [
  'Blue',
  'Green',
  'Amber',
  'Red',
  'Purple',
  'Pink',
  'Cyan',
  'Lime',
] as const;

/**
 * Get color for a segment by index
 * Colors cycle through the palette for segments beyond 8
 */
export function getSegmentColor(segmentIndex: number): string {
  return SEGMENT_COLORS[segmentIndex % SEGMENT_COLORS.length];
}

/**
 * Get color name for a segment by index
 */
export function getSegmentColorName(segmentIndex: number): string {
  return SEGMENT_COLOR_NAMES[segmentIndex % SEGMENT_COLOR_NAMES.length];
}

/**
 * Get all segment colors as an array
 */
export function getAllSegmentColors(): readonly string[] {
  return SEGMENT_COLORS;
}
