/**
 * Terrain Factor Slider Component
 *
 * Allows users to set terrain difficulty multiplier (0.8x - 1.5x)
 * Affects pace predictions based on terrain technicality.
 */

import React from 'react';
import { Info } from 'lucide-react';

interface TerrainFactorSliderProps {
  value: number; // 0.8 to 1.5
  onChange: (value: number) => void;
  terrainDescription?: string; // Optional: auto-suggest based on description
  disabled?: boolean;
}

const TerrainFactorSlider: React.FC<TerrainFactorSliderProps> = ({
  value,
  onChange,
  terrainDescription,
  disabled = false,
}) => {
  // Preset terrain factors
  const presets = [
    { label: 'Road', value: 0.85, description: 'Fast, runnable surface' },
    { label: 'Trail', value: 1.0, description: 'Standard trail running' },
    { label: 'Technical', value: 1.2, description: 'Rocky, roots, obstacles' },
    { label: 'Extreme', value: 1.4, description: 'Scree, river crossings' },
  ];

  // Auto-suggest terrain factor based on description
  React.useEffect(() => {
    if (terrainDescription && value === 1.0) {
      const desc = terrainDescription.toLowerCase();
      if (desc.includes('road') || desc.includes('pavement')) {
        onChange(0.85);
      } else if (desc.includes('rocky') || desc.includes('technical')) {
        onChange(1.2);
      } else if (desc.includes('scree') || desc.includes('river') || desc.includes('snow')) {
        onChange(1.4);
      } else if (desc.includes('muddy') || desc.includes('boggy')) {
        onChange(1.25);
      }
    }
  }, [terrainDescription]); // eslint-disable-line react-hooks/exhaustive-deps

  // Get label for current value
  const getTerrainLabel = () => {
    if (value < 0.9) return 'Fast/Runnable';
    if (value < 1.05) return 'Standard Trail';
    if (value < 1.25) return 'Technical';
    return 'Very Technical';
  };

  // Get color for current value
  const getColor = () => {
    if (value < 0.9) return 'text-green-600 dark:text-green-400';
    if (value < 1.05) return 'text-blue-600 dark:text-blue-400';
    if (value < 1.25) return 'text-orange-600 dark:text-orange-400';
    return 'text-red-600 dark:text-red-400';
  };

  // Calculate impact
  const impactPercent = ((value - 1) * 100).toFixed(0);
  const impactText =
    value === 1.0
      ? 'No impact'
      : value > 1.0
        ? `${impactPercent}% slower`
        : `${Math.abs(parseFloat(impactPercent))}% faster`;

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
            Terrain Difficulty
          </label>
          <div className="group relative">
            <Info className="w-4 h-4 text-gray-400 cursor-help" />
            <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 hidden group-hover:block w-64 p-2 bg-gray-900 dark:bg-gray-700 text-white text-xs rounded shadow-lg z-10">
              Multiplier applied to pace based on terrain technicality.
              1.0 = standard trail, {'<'}1.0 = fast/runnable, {'>'}1.0 = technical/slow
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className={`text-sm font-semibold ${getColor()}`}>
            {value.toFixed(2)}x
          </span>
          <span className="text-xs text-gray-500 dark:text-gray-400">
            ({impactText})
          </span>
        </div>
      </div>

      {/* Slider */}
      <div className="relative">
        <input
          type="range"
          min="0.8"
          max="1.5"
          step="0.05"
          value={value}
          onChange={(e) => onChange(parseFloat(e.target.value))}
          disabled={disabled}
          className="w-full h-2 bg-gray-200 dark:bg-gray-700 rounded-lg appearance-none cursor-pointer accent-blue-600"
        />
        <div className="flex justify-between mt-1 text-xs text-gray-500 dark:text-gray-400">
          <span>0.8 (Fast)</span>
          <span>1.0</span>
          <span>1.5 (Slow)</span>
        </div>
      </div>

      {/* Current Label */}
      <div className={`text-sm font-medium ${getColor()} text-center`}>
        {getTerrainLabel()}
      </div>

      {/* Preset Buttons */}
      <div className="flex gap-2">
        {presets.map((preset) => (
          <button
            key={preset.label}
            type="button"
            onClick={() => onChange(preset.value)}
            disabled={disabled}
            className={`flex-1 px-3 py-2 text-xs font-medium rounded border transition-colors ${Math.abs(value - preset.value) < 0.01
                ? 'bg-blue-100 dark:bg-blue-900/30 border-blue-400 dark:border-blue-600 text-blue-700 dark:text-blue-400'
                : 'bg-gray-100 dark:bg-gray-800 border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'
              } ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
            title={preset.description}
          >
            {preset.label}
          </button>
        ))}
      </div>
    </div>
  );
};

export default TerrainFactorSlider;
