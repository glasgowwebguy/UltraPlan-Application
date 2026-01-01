/**
 * Flyover Controls Component
 * Provides playback controls for the flyover animation
 */

import { Play, Pause, RotateCcw, Gauge } from 'lucide-react';

export type PlaybackSpeed = 1 | 2 | 4;

interface FlyoverControlsProps {
  isPlaying: boolean;
  speed: PlaybackSpeed;
  onPlayPause: () => void;
  onRestart: () => void;
  onSpeedChange: (speed: PlaybackSpeed) => void;
  disabled?: boolean;
}

export default function FlyoverControls({
  isPlaying,
  speed,
  onPlayPause,
  onRestart,
  onSpeedChange,
  disabled = false,
}: FlyoverControlsProps) {
  const speeds: PlaybackSpeed[] = [1, 2, 4];

  return (
    <div className="absolute bottom-6 left-1/2 transform -translate-x-1/2 z-10 bg-white dark:bg-[#2d3548] border border-gray-300 dark:border-gray-600 rounded-lg shadow-xl p-3 flex items-center gap-3">
      {/* Play/Pause Button */}
      <button
        onClick={onPlayPause}
        disabled={disabled}
        className="p-3 bg-blue-500 hover:bg-blue-600 disabled:bg-gray-600 disabled:cursor-not-allowed text-white rounded-lg transition-all shadow-lg"
        aria-label={isPlaying ? 'Pause flyover' : 'Play flyover'}
      >
        {isPlaying ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5" />}
      </button>

      {/* Restart Button */}
      <button
        onClick={onRestart}
        disabled={disabled}
        className="p-3 bg-gray-100 dark:bg-[#1e2639] hover:bg-gray-200 dark:hover:bg-[#333c52] disabled:bg-gray-300 dark:disabled:bg-gray-700 disabled:cursor-not-allowed text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white rounded-lg transition-all"
        aria-label="Restart flyover"
      >
        <RotateCcw className="w-5 h-5" />
      </button>

      {/* Speed Selector */}
      <div className="flex items-center gap-2 border-l border-gray-300 dark:border-gray-600 pl-3">
        <Gauge className="w-4 h-4 text-gray-600 dark:text-gray-400" />
        <div className="flex gap-1">
          {speeds.map((s) => (
            <button
              key={s}
              onClick={() => onSpeedChange(s)}
              disabled={disabled}
              className={`
                px-3 py-1.5 rounded text-sm font-medium transition-all
                ${
                  speed === s
                    ? 'bg-blue-500 text-white'
                    : 'bg-gray-100 dark:bg-[#1e2639] text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-[#333c52] hover:text-gray-900 dark:hover:text-white'
                }
                disabled:bg-gray-300 dark:disabled:bg-gray-700 disabled:cursor-not-allowed
              `}
              aria-label={`Speed ${s}x`}
              aria-pressed={speed === s}
            >
              {s}x
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
