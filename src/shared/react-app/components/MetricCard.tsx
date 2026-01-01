import React from 'react';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';

interface MetricCardProps {
  title: string;
  value: string | number;
  comparison?: string;
  comparisonLabel?: string;
  trend?: 'positive' | 'negative' | 'neutral';
  icon?: React.ReactNode;
}

const MetricCard: React.FC<MetricCardProps> = ({
  title,
  value,
  comparison,
  comparisonLabel,
  trend = 'neutral',
  icon,
}) => {
  const getTrendIcon = () => {
    if (trend === 'positive') {
      // Positive trend (slower than plan) should show down arrow but stay green
      return <TrendingDown className="w-4 h-4 text-green-700 dark:text-green-400" />;
    } else if (trend === 'negative') {
      // Negative trend (faster than plan) should show up arrow in red
      return <TrendingUp className="w-4 h-4 text-red-400" />;
    }
    return <Minus className="w-4 h-4 text-gray-400" />;
  };

  const getTrendColor = () => {
    if (trend === 'positive') return 'text-green-700 dark:text-green-400';
    if (trend === 'negative') return 'text-red-400';
    return 'text-gray-400';
  };

  return (
    <div className="bg-white dark:bg-[#2a3244] rounded-lg p-4 border border-gray-300 dark:border-gray-700/50">
      <div className="flex items-start justify-between mb-2">
        <div className="text-sm text-gray-600 dark:text-gray-400">{title}</div>
        {icon && <div className="text-gray-600 dark:text-gray-400">{icon}</div>}
      </div>

      <div className="text-2xl font-bold text-gray-900 dark:text-white mb-1">{value}</div>

      {comparison && (
        <div className="space-y-0.5">
          {comparisonLabel && (
            <div className="text-xs text-gray-500 dark:text-gray-500">{comparisonLabel}</div>
          )}
          <div className={`flex items-center space-x-1 text-sm ${getTrendColor()}`}>
            {getTrendIcon()}
            <span>{comparison}</span>
          </div>
        </div>
      )}
    </div>
  );
};

export default MetricCard;
