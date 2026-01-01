import React from 'react';
import type { OverlayConfig } from '../../shared/types';

interface ChartOverlayControlsProps {
  config: OverlayConfig;
  onConfigChange: (config: OverlayConfig) => void;
  availableMetrics: string[];
}

const ChartOverlayControls: React.FC<ChartOverlayControlsProps> = ({
  config,
  onConfigChange,
  availableMetrics,
}) => {
  const labels: Record<keyof OverlayConfig, string> = {
    showElevation: 'Elevation Profile',
    showPace: 'Pace',
    showHeartRate: 'Heart Rate',
    showPower: 'Power',
    showCadence: 'Cadence',
    showTemperature: 'Temperature',
    showGrade: 'Grade %',
    showSplits: 'Split Markers',
    showPaceZones: 'Pace Zones',
    showHeartRateZones: 'HR Zones',
  };

  const handleToggle = (key: keyof OverlayConfig) => {
    onConfigChange({
      ...config,
      [key]: !config[key],
    });
  };

  return (
    <div className="bg-[#2a3244] rounded-lg p-4 mb-4">
      <h3 className="text-sm font-semibold text-gray-300 mb-3">Chart Overlays</h3>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {(Object.entries(config) as [keyof OverlayConfig, boolean][]).map(([key, value]) => {
          const isAvailable = availableMetrics.includes(key);
          const label = labels[key];

          return (
            <label
              key={key}
              className={`flex items-center space-x-2 cursor-pointer ${
                !isAvailable ? 'opacity-50 cursor-not-allowed' : ''
              }`}
              title={!isAvailable ? 'Not available in this FIT file' : ''}
            >
              <input
                type="checkbox"
                checked={value}
                disabled={!isAvailable}
                onChange={() => handleToggle(key)}
                className="rounded border-gray-600 bg-[#1e2639] text-blue-500 focus:ring-blue-500 focus:ring-offset-0 disabled:opacity-50 disabled:cursor-not-allowed"
              />
              <span className="text-sm text-gray-300 select-none">{label}</span>
            </label>
          );
        })}
      </div>
    </div>
  );
};

export default ChartOverlayControls;
