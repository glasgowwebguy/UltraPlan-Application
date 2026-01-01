import { useTheme } from '../contexts/ThemeContext';
import { Sun, Moon } from 'lucide-react';

export function ThemeSelector() {
  const { theme, setTheme } = useTheme();

  const themes = [
    { id: 'dark' as const, label: 'Dark', icon: Moon, description: 'Easy on the eyes' },
    { id: 'coloursplash' as const, label: 'Light', icon: Sun, description: 'Bold & vibrant' },
  ];

  return (
    <div className="space-y-3">
      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 coloursplash:text-splash-text-secondary">
        Theme
      </label>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {themes.map(({ id, label, icon: Icon, description }) => (
          <button
            key={id}
            onClick={() => setTheme(id)}
            className={`
              relative p-4 rounded-lg border-2 transition-all text-left
              ${theme === id
                ? 'border-blue-500 dark:border-blue-400 coloursplash:border-splash-azure bg-blue-50 dark:bg-blue-500/10 coloursplash:bg-splash-azure-light'
                : 'border-gray-200 dark:border-gray-700 coloursplash:border-splash-border hover:border-gray-300 dark:hover:border-gray-600 coloursplash:hover:border-splash-border-hover'
              }
              bg-white dark:bg-[#2d3548] coloursplash:bg-white
            `}
          >
            <Icon className={`w-5 h-5 mb-2 ${
              theme === id
                ? 'text-blue-500 dark:text-blue-400 coloursplash:text-splash-azure'
                : 'text-gray-500 dark:text-gray-400 coloursplash:text-splash-text-muted'
            }`} />
            <div className="font-medium text-gray-900 dark:text-white coloursplash:text-splash-text-primary">
              {label}
            </div>
            <div className="text-xs text-gray-500 dark:text-gray-400 coloursplash:text-splash-text-muted mt-1">
              {description}
            </div>
            {theme === id && (
              <div className="absolute top-2 right-2 w-2 h-2 rounded-full bg-blue-500 dark:bg-blue-400 coloursplash:bg-splash-azure" />
            )}
          </button>
        ))}
      </div>
    </div>
  );
}
