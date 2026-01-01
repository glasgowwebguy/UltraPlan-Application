/**
 * Map Layer Selector Component
 * Allows users to switch between Street, Satellite, and Hybrid map views
 */

import { Layers, Map, Satellite } from 'lucide-react';

export type MapLayerType = 'street' | 'satellite' | 'hybrid';

interface MapLayerSelectorProps {
  selectedLayer: MapLayerType;
  onLayerChange: (layer: MapLayerType) => void;
}

export default function MapLayerSelector({ selectedLayer, onLayerChange }: MapLayerSelectorProps) {
  const layers: { value: MapLayerType; label: string; icon: typeof Map }[] = [
    { value: 'street', label: 'Street', icon: Map },
    { value: 'satellite', label: 'Satellite', icon: Satellite },
    { value: 'hybrid', label: 'Hybrid', icon: Layers },
  ];

  return (
    <div className="flex gap-2">
      {layers.map(({ value, label, icon: Icon }) => (
        <button
          key={value}
          onClick={() => onLayerChange(value)}
          className={`
            flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-all
            ${
              selectedLayer === value
                ? 'bg-emerald-500 text-white shadow-lg'
                : 'bg-[#1e2639] text-gray-300 hover:bg-[#333c52] hover:text-white'
            }
          `}
          aria-label={`${label} map view`}
          aria-pressed={selectedLayer === value}
        >
          <Icon className="w-4 h-4" />
          <span className="text-sm">{label}</span>
        </button>
      ))}
    </div>
  );
}
