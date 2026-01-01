/**
 * AutoPaceIndicator Component
 *
 * Small badge showing auto-pace status in segment list
 * Displays confidence level and derived pace with tooltip showing reasoning
 */

import { Zap } from 'lucide-react';
import { formatPaceMinPerMile } from '../utils/autoPaceCalculation';

interface AutoPaceIndicatorProps {
  isEnabled: boolean;
  confidence: 'high' | 'medium' | 'low';
  derivedPace: number;
  reasoning: string;
  useMiles: boolean;
}

export function AutoPaceIndicator({
  isEnabled,
  confidence,
  derivedPace,
  reasoning,
  useMiles
}: AutoPaceIndicatorProps) {
  if (!isEnabled) return null;

  const confidenceColors = {
    high: 'text-green-400',
    medium: 'text-yellow-400',
    low: 'text-orange-400'
  };

  const confidenceDots = {
    high: '●●●●●',
    medium: '●●●○○',
    low: '●●○○○'
  };

  // Format pace based on unit preference
  const formattedPace = useMiles
    ? `${formatPaceMinPerMile(derivedPace)} min/mi`
    : `${formatPaceMinPerMile(derivedPace / 1.60934)} min/km`;

  return (
    <div className="group relative inline-block">
      <div className="flex items-center gap-1 text-xs">
        <Zap className="w-3 h-3 text-blue-400" />
        <span className={confidenceColors[confidence]}>
          Auto: {formattedPace}
        </span>
      </div>

      {/* Tooltip */}
      <div className="absolute left-0 bottom-full mb-2 hidden group-hover:block z-50 w-64">
        <div className="bg-gray-800 text-white text-xs rounded-lg p-3 shadow-xl border border-gray-700">
          <div className="flex items-center gap-2 mb-2">
            <Zap className="w-4 h-4 text-blue-400" />
            <span className="font-semibold">Auto-Derived Pace</span>
          </div>

          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="text-gray-400">Pace:</span>
              <span className="font-medium">{formattedPace}</span>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-gray-400">Confidence:</span>
              <span className={`font-medium ${confidenceColors[confidence]}`}>
                {confidenceDots[confidence]} {confidence}
              </span>
            </div>

            {reasoning && (
              <div className="pt-1.5 border-t border-gray-700 mt-1.5">
                <span className="text-gray-400 text-xs italic">{reasoning}</span>
              </div>
            )}
          </div>

          {/* Tooltip arrow */}
          <div className="absolute left-4 top-full w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-gray-800"></div>
        </div>
      </div>
    </div>
  );
}
