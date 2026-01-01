import { Trash2, ChevronRight, Calendar, Clock } from 'lucide-react';
import type { Race } from '@/shared/types';
import { useUnit } from '../contexts/UnitContext';
import { formatDistance } from '../utils/unitConversions';

interface RaceCardProps {
  race: Race;
  onDelete: (id: number) => void;
  onClick: (id: number) => void;
}

export default function RaceCard({ race, onDelete, onClick }: RaceCardProps) {
  const { useMiles } = useUnit();
  const calculateDaysUntilEvent = () => {
    if (!race.start_date_time) return null;

    try {
      // Get current date in browser's local timezone at midnight
      const now = new Date();
      const todayMidnight = new Date(
        now.getFullYear(),
        now.getMonth(),
        now.getDate(),
        0, 0, 0, 0
      );

      // Parse event date and set to midnight local time
      const eventDate = new Date(race.start_date_time);
      const eventMidnight = new Date(
        eventDate.getFullYear(),
        eventDate.getMonth(),
        eventDate.getDate(),
        0, 0, 0, 0
      );

      // Calculate difference in days
      const diffMs = eventMidnight.getTime() - todayMidnight.getTime();
      const diffDays = Math.round(diffMs / (1000 * 60 * 60 * 24));

      return diffDays;
    } catch (error) {
      console.error('Error calculating days until event:', error);
      return null;
    }
  };

  const formatEventDateTime = () => {
    if (!race.start_date_time) return null;
    const eventDate = new Date(race.start_date_time);
    return {
      date: eventDate.toLocaleDateString('en-US', {
        weekday: 'short',
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      }),
      time: eventDate.toLocaleTimeString('en-US', {
        hour: 'numeric',
        minute: '2-digit',
        hour12: true,
      }),
    };
  };

  const daysUntil = calculateDaysUntilEvent();
  const eventDateTime = formatEventDateTime();

  return (
    <div
      className="group relative bg-white dark:bg-[#2d3548] coloursplash:bg-white rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 coloursplash:border-splash-border coloursplash:border-t-4 coloursplash:border-t-splash-azure hover:shadow-lg hover:border-gray-300 dark:hover:border-gray-600 coloursplash:hover:border-splash-azure transition-all duration-200 overflow-hidden cursor-pointer"
      onClick={() => onClick(race.id!)}
    >
      <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500 coloursplash:from-splash-azure coloursplash:via-splash-green coloursplash:to-splash-orange"></div>

      <div className="p-6">
        <div className="flex justify-between items-start mb-4">
          <div className="flex-1">
            <div className="flex items-center gap-3 mb-2">
              <h3 className="text-xl font-bold text-gray-900 dark:text-white coloursplash:text-splash-text-primary group-hover:text-blue-600 dark:group-hover:text-blue-400 coloursplash:hover:text-splash-azure transition-colors">
                {race.name}
              </h3>
              {race.logo_url && (
                <div className="h-16 w-16 bg-white rounded-md p-1.5 flex items-center justify-center">
                  <img
                    src={race.logo_url}
                    alt={`${race.name} logo`}
                    className="h-full w-full object-contain"
                    onError={(e) => {
                      // Hide parent div if image fails to load
                      const parent = e.currentTarget.parentElement;
                      if (parent) parent.style.display = 'none';
                    }}
                  />
                </div>
              )}
            </div>
            <div className="flex flex-wrap gap-3 text-sm text-gray-600 dark:text-gray-400 coloursplash:text-splash-text-muted">
              <div className="flex items-center gap-1.5">
                <span className="font-semibold">{formatDistance(race.distance_miles, useMiles)}</span>
              </div>
            </div>
          </div>

          <button
            onClick={(e) => {
              e.stopPropagation();
              onDelete(race.id!);
            }}
            className="p-2 text-gray-400 dark:text-gray-500 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-all"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>

        {eventDateTime && (
          <div className="bg-gradient-to-r from-blue-500/10 to-purple-500/10 coloursplash:bg-splash-azure-light rounded-lg p-3 mb-4 border border-blue-500/20 coloursplash:border-splash-border">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2 flex-1">
                <Calendar className="w-4 h-4 text-blue-400 coloursplash:text-splash-azure" />
                <div>
                  <div className="text-sm font-semibold text-gray-900 dark:text-white coloursplash:text-splash-text-primary">
                    {eventDateTime.date}
                  </div>
                  <div className="text-xs text-gray-600 dark:text-gray-400 coloursplash:text-splash-text-muted flex items-center gap-1 mt-0.5">
                    <Clock className="w-3 h-3" />
                    {eventDateTime.time}
                    {race.timezone && (
                      <span className="text-gray-500 dark:text-gray-500 coloursplash:text-splash-text-muted"> ({race.timezone})</span>
                    )}
                  </div>
                </div>
              </div>
              {daysUntil !== null && (
                <div className="text-right">
                  <div className="text-2xl font-bold text-gray-900 dark:text-white coloursplash:text-splash-text-primary">
                    {daysUntil > 0 ? daysUntil : 0}
                  </div>
                  <div className="text-xs text-gray-600 dark:text-gray-400 coloursplash:text-splash-text-muted">
                    {daysUntil > 1 ? 'days' : daysUntil === 1 ? 'day' : 'days'}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        <div className="mb-4">
          <div className="bg-gray-100 dark:bg-[#3a4458] coloursplash:bg-splash-bg-subtle rounded-lg p-3 border border-gray-200 dark:border-gray-700 coloursplash:border-splash-border">
            <div className="text-xs text-purple-600 dark:text-purple-400 coloursplash:text-splash-azure font-medium mb-1">Distance</div>
            <div className="text-lg font-bold text-gray-900 dark:text-white coloursplash:text-splash-text-primary">
              {formatDistance(race.distance_miles, useMiles)}
            </div>
          </div>
        </div>

        <div className="flex items-center justify-between text-sm text-gray-500 dark:text-gray-500 coloursplash:text-splash-text-muted pt-3 border-t border-gray-200 dark:border-gray-700 coloursplash:border-splash-border">
          <span>
            {new Date(race.created_at!).toLocaleDateString('en-US', {
              month: 'short',
              day: 'numeric',
              year: 'numeric',
            })}
          </span>
          <div className="flex items-center gap-1 text-blue-600 dark:text-blue-400 coloursplash:text-splash-azure font-medium group-hover:gap-2 transition-all">
            <span>Open Plan</span>
            <ChevronRight className="w-4 h-4" />
          </div>
        </div>
      </div>
    </div>
  );
}
