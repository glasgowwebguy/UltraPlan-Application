import React from 'react';
import {
  TrendingUp,
  Utensils,
  Dumbbell,
  Target,
  Heart,
  AlertCircle,
  Info,
  AlertTriangle,
} from 'lucide-react';
import type { PerformanceInsight } from '../../shared/types';

interface InsightCardProps {
  insight: PerformanceInsight;
}

const InsightCard: React.FC<InsightCardProps> = ({ insight }) => {
  const getIcon = () => {
    switch (insight.type) {
      case 'pacing':
        return <TrendingUp className="w-5 h-5" />;
      case 'nutrition':
        return <Utensils className="w-5 h-5" />;
      case 'training':
        return <Dumbbell className="w-5 h-5" />;
      case 'strategy':
        return <Target className="w-5 h-5" />;
      case 'recovery':
        return <Heart className="w-5 h-5" />;
      default:
        return <Info className="w-5 h-5" />;
    }
  };

  const getPriorityIcon = () => {
    if (insight.priority === 'high') {
      return <AlertCircle className="w-4 h-4 text-red-400" />;
    } else if (insight.priority === 'medium') {
      return <AlertTriangle className="w-4 h-4 text-yellow-400" />;
    }
    return <Info className="w-4 h-4 text-blue-400" />;
  };

  const getBorderColor = () => {
    if (insight.priority === 'high') return 'border-red-500/30';
    if (insight.priority === 'medium') return 'border-yellow-500/30';
    return 'border-blue-500/30';
  };

  const getBackgroundColor = () => {
    if (insight.priority === 'high') return 'bg-red-900/10';
    if (insight.priority === 'medium') return 'bg-yellow-900/10';
    return 'bg-blue-900/10';
  };

  return (
    <div
      className={`${getBackgroundColor()} border ${getBorderColor()} rounded-lg p-4 transition-all hover:shadow-md`}
    >
      <div className="flex items-start space-x-3">
        <div className="flex-shrink-0 p-2 bg-gray-200 dark:bg-gray-800/50 rounded-lg text-gray-700 dark:text-gray-300">
          {getIcon()}
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center space-x-2 mb-1">
            {getPriorityIcon()}
            <h4 className="text-sm font-semibold text-gray-900 dark:text-white">{insight.message}</h4>
          </div>

          <p className="text-sm text-gray-700 dark:text-gray-300 mb-2">{insight.recommendation}</p>

          {insight.details && (
            <p className="text-xs text-gray-600 dark:text-gray-400 italic">{insight.details}</p>
          )}
        </div>
      </div>
    </div>
  );
};

export default InsightCard;
