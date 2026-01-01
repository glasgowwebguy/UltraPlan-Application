/**
 * Map Legend Component
 * Displays a legend overlay showing route segments with colors and distances
 */

import { useState } from 'react';
import { ChevronDown, ChevronUp } from 'lucide-react';
import type { Segment } from '../../shared/types';
import type { RouteSegment } from '../utils/gpxSegmentation';

interface MapLegendProps {
  segments: Segment[];
  routeSegments: RouteSegment[];
}

export default function MapLegend({ segments, routeSegments }: MapLegendProps) {
  const [isExpanded, setIsExpanded] = useState(true);
  // Match route segments with segment data to get distances
  const legendItems = routeSegments.map((routeSegment, index) => {
    // Find the corresponding segment by checkpoint name or use index
    const segmentData = segments.find(
      s => s.checkpoint_name === routeSegment.checkpointName
    );

    return {
      color: routeSegment.color,
      checkpointName: routeSegment.checkpointName || `Segment ${index + 1}`,
      distanceMiles: segmentData?.segment_distance_miles || 0,
      distanceKm: segmentData?.segment_distance_km || 0,
      index: index,
    };
  });

  if (legendItems.length === 0) {
    return null;
  }

  return (
    <div className="absolute top-4 right-4 z-[1000] bg-white/95 dark:bg-[#2d3548]/95 border border-gray-200 dark:border-gray-600 rounded-lg shadow-xl max-w-xs backdrop-blur-sm">
      {/* Header with toggle button */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full flex items-center justify-between gap-2 p-4 text-left hover:bg-gray-50/50 dark:hover:bg-gray-700/30 transition-colors rounded-t-lg"
        aria-label={isExpanded ? "Collapse route segments legend" : "Expand route segments legend"}
      >
        <h3 className="text-gray-900 dark:text-white font-bold text-sm">
          Route Segments
        </h3>
        {isExpanded ? (
          <ChevronUp className="w-5 h-5 text-gray-700 dark:text-gray-300 flex-shrink-0" />
        ) : (
          <ChevronDown className="w-5 h-5 text-gray-700 dark:text-gray-300 flex-shrink-0" />
        )}
      </button>

      {/* Collapsible content */}
      {isExpanded && (
        <div className="px-4 pb-4 pt-2 border-t border-gray-200 dark:border-gray-600">
          <div className="space-y-2 max-h-[500px] overflow-y-auto">
            {legendItems.map((item) => (
              <div
                key={item.index}
                className="flex items-start gap-3 text-xs"
              >
                {/* Color indicator */}
                <div
                  className="w-4 h-4 rounded-sm flex-shrink-0 mt-0.5 border border-white/20"
                  style={{ backgroundColor: item.color }}
                />

                {/* Segment info */}
                <div className="flex-1 min-w-0">
                  <div className="text-gray-900 dark:text-white font-medium truncate">
                    {item.checkpointName}
                  </div>
                  <div className="text-gray-700 dark:text-gray-300 mt-0.5">
                    {item.distanceMiles.toFixed(1)} miles ({item.distanceKm.toFixed(1)} km)
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
