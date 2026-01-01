/**
 * View Mode Selector Component
 * Allows users to switch between 2D, 3D, and Flyover map views
 */

import { Map, Mountain, Video } from 'lucide-react';

export type ViewMode = '2d' | '3d' | 'flyover';

interface ViewModeSelectorProps {
  selectedMode: ViewMode;
  onModeChange: (mode: ViewMode) => void;
}

export default function ViewModeSelector({ selectedMode, onModeChange }: ViewModeSelectorProps) {
  const modes: { value: ViewMode; label: string; icon: typeof Map }[] = [
    { value: '2d', label: '2D Map', icon: Map },
    { value: '3d', label: '3D View', icon: Mountain },
    { value: 'flyover', label: 'Flyover', icon: Video },
  ];

  return (
    <div className="flex gap-2 mb-4">
      {modes.map(({ value, label, icon: Icon }) => (
        <button
          key={value}
          onClick={() => onModeChange(value)}
          className={`
            flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-all
            ${
              selectedMode === value
                ? 'bg-blue-500 text-white shadow-lg'
                : 'bg-[#1e2639] text-gray-300 hover:bg-[#333c52] hover:text-white'
            }
          `}
          aria-label={label}
          aria-pressed={selectedMode === value}
        >
          <Icon className="w-4 h-4" />
          <span className="text-sm">{label}</span>
        </button>
      ))}
    </div>
  );
}
