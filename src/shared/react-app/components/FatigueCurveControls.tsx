/**
 * Fatigue Curve Controls Component
 *
 * Allows users to toggle fatigue curve display and adjust fatigue assumptions.
 */

import React from 'react';
import { TrendingDown, Info } from 'lucide-react';

interface FatigueCurveControlsProps {
  fatigueFactor: number; // Current factor (e.g., 2.5% per 10 miles)
  onChange: (factor: number) => void;
  showOnChart: boolean;
  onToggleShow: () => void;
}

const FatigueCurveControls: React.FC<FatigueCurveControlsProps> = ({
  fatigueFactor,
  onChange,
  showOnChart,
  onToggleShow,
}) => {
  // Preset fatigue factors
  const presets = [
    { label: 'Conservative', value: 1.5, description: 'Strong pacing discipline' },
    { label: 'Typical', value: 3.0, description: 'Average ultramarathon fade' },
    { label: 'Aggressive', value: 5.0, description: 'Expected significant fade' },
  ];

  // Calculate expected total fade for 100 miles
  const fadeAt100Miles = (fatigueFactor * 10).toFixed(1);

  return (
    <div className="bg-white dark:bg-[#2a3244] rounded-lg p-4 space-y-4 shadow-md dark:shadow-none">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <TrendingDown className="w-5 h-5 text-orange-600 dark:text-orange-400" />
          <h4 className="text-sm font-semibold text-gray-900 dark:text-white">
            Fatigue Curve
          </h4>
        </div>
        <div className="flex items-center gap-2">
          <label className="text-xs text-gray-600 dark:text-gray-400">Show on Chart</label>
          <button
            onClick={onToggleShow}
            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
              showOnChart
                ? 'bg-blue-600 dark:bg-blue-500'
                : 'bg-gray-300 dark:bg-gray-600'
            }`}
          >
            <span
              className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                showOnChart ? 'translate-x-6' : 'translate-x-1'
              }`}
            />
          </button>
        </div>
      </div>

      {showOnChart && (
        <>
          {/* Fatigue Factor Slider */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <label className="text-xs font-medium text-gray-700 dark:text-gray-300">
                  Fatigue Factor
                </label>
                <div className="group relative">
                  <Info className="w-3 h-3 text-gray-400 cursor-help" />
                  <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 hidden group-hover:block w-64 p-2 bg-gray-900 dark:bg-gray-700 text-white text-xs rounded shadow-lg z-10">
                    Expected pace degradation per 10 miles of running. Higher values = more fade.
                  </div>
                </div>
              </div>
              <div className="text-right">
                <div className="text-sm font-semibold text-orange-600 dark:text-orange-400">
                  {fatigueFactor.toFixed(1)}% / 10mi
                </div>
                <div className="text-xs text-gray-500 dark:text-gray-400">
                  {fadeAt100Miles}% @ 100mi
                </div>
              </div>
            </div>

            <input
              type="range"
              min="0"
              max="10"
              step="0.5"
              value={fatigueFactor}
              onChange={(e) => onChange(parseFloat(e.target.value))}
              className="w-full h-2 bg-gray-200 dark:bg-gray-700 rounded-lg appearance-none cursor-pointer accent-orange-600"
            />

            <div className="flex justify-between text-xs text-gray-500 dark:text-gray-400">
              <span>0% (No fade)</span>
              <span>10% (Severe)</span>
            </div>
          </div>

          {/* Preset Buttons */}
          <div className="flex gap-2">
            {presets.map((preset) => (
              <button
                key={preset.label}
                onClick={() => onChange(preset.value)}
                className={`flex-1 px-3 py-2 text-xs font-medium rounded border transition-colors ${
                  Math.abs(fatigueFactor - preset.value) < 0.1
                    ? 'bg-orange-100 dark:bg-orange-900/30 border-orange-400 dark:border-orange-600 text-orange-700 dark:text-orange-400'
                    : 'bg-gray-100 dark:bg-gray-800 border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'
                } cursor-pointer`}
                title={preset.description}
              >
                {preset.label}
              </button>
            ))}
          </div>

          {/* Info */}
          <div className="text-xs text-gray-500 dark:text-gray-400 bg-gray-50 dark:bg-gray-800/50 rounded p-2">
            The fatigue curve shows expected pace degradation over distance. This helps visualize
            the "fade" you should expect in your race plan.
          </div>
        </>
      )}
    </div>
  );
};

export default FatigueCurveControls;
