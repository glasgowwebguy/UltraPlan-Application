/**
 * SmartNutritionModal Component
 *
 * Displays smart nutrition suggestions with multiple strategy options.
 * Allows users to preview and accept suggested product combinations.
 */

import { useState, useMemo, useEffect } from 'react';
import { X, Check, AlertTriangle, Info, ChevronDown, ChevronUp, Sparkles } from 'lucide-react';
import type { NutritionProduct } from '../utils/nutritionDatabase';
import type { NutritionItem } from '@/shared/types';
import {
  generateSmartSuggestions,
  calculateNutritionTargets,
  planToNutritionItems,
} from '../utils/nutritionSuggestion';

interface SmartNutritionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onApply: (items: NutritionItem[]) => void;
  availableProducts: NutritionProduct[];
  recentlyUsedNames?: string[];
  // Segment info for calculating targets
  segmentTimeMinutes: number;
  carbGoalPerHour: number;
  sodiumGoalPerHour: number;
  waterGoalPerHour: number;
  // Optional: existing items to show warning
  existingItems?: NutritionItem[];
}

export default function SmartNutritionModal({
  isOpen,
  onClose,
  onApply,
  availableProducts,
  recentlyUsedNames = [],
  segmentTimeMinutes,
  carbGoalPerHour,
  sodiumGoalPerHour,
  waterGoalPerHour,
  existingItems = [],
}: SmartNutritionModalProps) {
  const [selectedPlanId, setSelectedPlanId] = useState<string | null>(null);
  const [expandedPlanIds, setExpandedPlanIds] = useState<Set<string>>(new Set());

  // Calculate targets and suggestions
  const { target, plans, warnings, tips } = useMemo(() => {
    const target = calculateNutritionTargets(
      segmentTimeMinutes,
      carbGoalPerHour,
      sodiumGoalPerHour,
      waterGoalPerHour
    );

    return generateSmartSuggestions(availableProducts, target, recentlyUsedNames);
  }, [availableProducts, segmentTimeMinutes, carbGoalPerHour, sodiumGoalPerHour, waterGoalPerHour, recentlyUsedNames]);

  // Auto-select the best plan
  useEffect(() => {
    if (plans.length > 0 && !selectedPlanId) {
      setSelectedPlanId(plans[0].id);
    }
  }, [plans, selectedPlanId]);

  if (!isOpen) return null;

  const selectedPlan = plans.find(p => p.id === selectedPlanId);

  const handleApply = () => {
    if (!selectedPlan) return;

    const items = planToNutritionItems(selectedPlan);
    onApply(items);
    onClose();
  };

  const toggleExpanded = (planId: string) => {
    setExpandedPlanIds(prev => {
      const newSet = new Set(prev);
      if (newSet.has(planId)) {
        newSet.delete(planId);
      } else {
        newSet.add(planId);
      }
      return newSet;
    });
  };

  const getScoreColor = (score: number): string => {
    if (score >= 80) return 'text-green-500 dark:text-green-400';
    if (score >= 60) return 'text-yellow-500 dark:text-yellow-400';
    return 'text-red-500 dark:text-red-400';
  };

  const getCoverageColor = (percent: number, nutrient: 'carbs' | 'sodium' | 'water' = 'carbs'): string => {
    if (nutrient === 'carbs') {
      // Carbs thresholds (from nutritionThresholds.ts)
      if (percent < 70) return 'bg-red-500';
      if (percent < 90) return 'bg-yellow-500';
      if (percent <= 120) return 'bg-green-500';
      if (percent <= 130) return 'bg-yellow-500';
      return 'bg-red-500';
    }

    // Sodium and Water use same thresholds
    if (percent < 60) return 'bg-red-500';
    if (percent < 80) return 'bg-yellow-500';
    if (percent <= 120) return 'bg-green-500';  // 80-120% is GREEN
    if (percent <= 140) return 'bg-yellow-500';
    return 'bg-red-500';
  };

  const getStrategyEmoji = (strategy: string): string => {
    const emojis: Record<string, string> = {
      'drink-focused': '🥤',
      'gel-focused': '⚡',
      'balanced': '⚖️',
      'electrolyte-light': '❄️',
      'electrolyte-heavy': '🧂', // Legacy support
    };
    return emojis[strategy] || '📦';
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-[#2d3548] coloursplash:bg-splash-bg-primary rounded-xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="bg-gradient-to-r from-amber-500 to-orange-600 dark:from-amber-600 dark:to-orange-700 px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Sparkles className="w-6 h-6 text-white" />
            <div>
              <h2 className="text-xl font-bold text-white">Smart Nutrition Suggestions</h2>
              <p className="text-amber-100 text-sm">
                {target.segmentTimeHours.toFixed(1)}h segment • {Math.round(carbGoalPerHour)}g carbs/hr
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-white hover:bg-white/20 rounded-lg p-2 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Target Summary Card */}
          <div className="bg-gray-50 dark:bg-[#3a4458] coloursplash:bg-splash-bg-subtle rounded-lg p-4">
            <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 coloursplash:text-splash-text-secondary mb-3">
              Segment Targets
            </h3>
            <div className="grid grid-cols-3 gap-4">
              <div>
                <div className="text-2xl font-bold text-orange-600 dark:text-orange-400 coloursplash:text-splash-azure">
                  {target.carbsNeeded}g
                </div>
                <div className="text-xs text-gray-600 dark:text-gray-400 coloursplash:text-splash-text-muted">
                  Carbs ({carbGoalPerHour}g/hr)
                </div>
              </div>
              <div>
                <div className="text-2xl font-bold text-blue-600 dark:text-blue-400 coloursplash:text-splash-rose">
                  {target.sodiumNeeded}mg
                </div>
                <div className="text-xs text-gray-600 dark:text-gray-400 coloursplash:text-splash-text-muted">
                  Sodium ({sodiumGoalPerHour}mg/hr)
                </div>
              </div>
              <div>
                <div className="text-2xl font-bold text-cyan-600 dark:text-cyan-400 coloursplash:text-splash-gold">
                  {target.waterNeeded}ml
                </div>
                <div className="text-xs text-gray-600 dark:text-gray-400 coloursplash:text-splash-text-muted">
                  Water ({waterGoalPerHour}ml/hr)
                </div>
              </div>
            </div>
          </div>

          {/* Warnings */}
          {warnings.length > 0 && (
            <div className="bg-yellow-50 dark:bg-yellow-900/20 coloursplash:bg-splash-gold/10 border border-yellow-200 dark:border-yellow-800 coloursplash:border-splash-gold/30 rounded-lg p-4">
              <div className="flex items-start gap-3">
                <AlertTriangle className="w-5 h-5 text-yellow-600 dark:text-yellow-400 coloursplash:text-splash-gold flex-shrink-0 mt-0.5" />
                <div className="flex-1">
                  <h4 className="text-sm font-semibold text-yellow-800 dark:text-yellow-200 coloursplash:text-splash-gold mb-2">
                    Warnings
                  </h4>
                  <ul className="space-y-1">
                    {warnings.map((warning, idx) => (
                      <li key={idx} className="text-sm text-yellow-700 dark:text-yellow-300 coloursplash:text-splash-text-secondary">
                        {warning}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          )}

          {/* Tips */}
          {tips.length > 0 && (
            <div className="bg-blue-50 dark:bg-blue-900/20 coloursplash:bg-splash-azure/10 border border-blue-200 dark:border-blue-800 coloursplash:border-splash-azure/30 rounded-lg p-4">
              <div className="flex items-start gap-3">
                <Info className="w-5 h-5 text-blue-600 dark:text-blue-400 coloursplash:text-splash-azure flex-shrink-0 mt-0.5" />
                <div className="flex-1">
                  <h4 className="text-sm font-semibold text-blue-800 dark:text-blue-200 coloursplash:text-splash-azure mb-2">
                    Tips
                  </h4>
                  <ul className="space-y-1">
                    {tips.map((tip, idx) => (
                      <li key={idx} className="text-sm text-blue-700 dark:text-blue-300 coloursplash:text-splash-text-secondary">
                        {tip}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          )}

          {/* Strategy Cards */}
          <div>
            <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 coloursplash:text-splash-text-secondary mb-3">
              Select a Strategy
            </h3>
            <div className="space-y-3">
              {plans.map(plan => {
                const isSelected = plan.id === selectedPlanId;
                const isExpanded = expandedPlanIds.has(plan.id);

                return (
                  <div
                    key={plan.id}
                    className={`border-2 rounded-lg p-4 transition-all cursor-pointer ${
                      isSelected
                        ? 'border-orange-500 dark:border-orange-400 coloursplash:border-splash-azure bg-orange-50 dark:bg-orange-900/10 coloursplash:bg-splash-azure/5'
                        : 'border-gray-200 dark:border-gray-700 coloursplash:border-splash-bg-subtle bg-white dark:bg-[#3a4458] coloursplash:bg-splash-bg-subtle hover:border-orange-300 dark:hover:border-orange-600'
                    }`}
                    onClick={() => setSelectedPlanId(plan.id)}
                  >
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center gap-3">
                        <span className="text-2xl">{getStrategyEmoji(plan.strategy)}</span>
                        <div>
                          <div className="flex items-center gap-2">
                            <h4 className="font-semibold text-gray-900 dark:text-white coloursplash:text-splash-text-primary">
                              {plan.name}
                            </h4>
                            {isSelected && (
                              <span className="bg-orange-500 text-white text-xs px-2 py-0.5 rounded-full font-medium">
                                Selected
                              </span>
                            )}
                          </div>
                          <p className="text-sm text-gray-600 dark:text-gray-400 coloursplash:text-splash-text-muted">
                            {plan.description}
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className={`text-2xl font-bold ${getScoreColor(plan.score)}`}>
                          {plan.score}%
                        </div>
                        <div className="text-xs text-gray-500 dark:text-gray-400 coloursplash:text-splash-text-muted">
                          fit score
                        </div>
                      </div>
                    </div>

                    {/* Coverage Bars */}
                    <div className="space-y-2 mb-3">
                      <div>
                        <div className="flex justify-between text-xs mb-1">
                          <span className="text-gray-600 dark:text-gray-400 coloursplash:text-splash-text-muted">
                            Carbs: {plan.totals.carbs}g / {target.carbsNeeded}g
                          </span>
                          <span className="font-medium text-gray-700 dark:text-gray-300 coloursplash:text-splash-text-secondary">
                            {plan.coveragePercent.carbs}%
                          </span>
                        </div>
                        <div className="h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                          <div
                            className={`h-full ${getCoverageColor(plan.coveragePercent.carbs, 'carbs')} transition-all`}
                            style={{ width: `${Math.min(100, plan.coveragePercent.carbs)}%` }}
                          />
                        </div>
                      </div>
                      <div>
                        <div className="flex justify-between text-xs mb-1">
                          <span className="text-gray-600 dark:text-gray-400 coloursplash:text-splash-text-muted">
                            Sodium: {plan.totals.sodium}mg / {target.sodiumNeeded}mg
                          </span>
                          <span className="font-medium text-gray-700 dark:text-gray-300 coloursplash:text-splash-text-secondary">
                            {plan.coveragePercent.sodium}%
                          </span>
                        </div>
                        <div className="h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                          <div
                            className={`h-full ${getCoverageColor(plan.coveragePercent.sodium, 'sodium')} transition-all`}
                            style={{ width: `${Math.min(100, plan.coveragePercent.sodium)}%` }}
                          />
                        </div>
                      </div>
                      <div>
                        <div className="flex justify-between text-xs mb-1">
                          <span className="text-gray-600 dark:text-gray-400 coloursplash:text-splash-text-muted">
                            Water: {plan.totals.water}ml / {target.waterNeeded}ml
                          </span>
                          <span className="font-medium text-gray-700 dark:text-gray-300 coloursplash:text-splash-text-secondary">
                            {plan.coveragePercent.water}%
                          </span>
                        </div>
                        <div className="h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                          <div
                            className={`h-full ${getCoverageColor(plan.coveragePercent.water, 'water')} transition-all`}
                            style={{ width: `${Math.min(100, plan.coveragePercent.water)}%` }}
                          />
                        </div>
                      </div>
                    </div>

                    {/* Expandable Product List */}
                    <button
                      type="button"
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        toggleExpanded(plan.id);
                      }}
                      className="flex items-center gap-2 text-sm text-orange-600 dark:text-orange-400 coloursplash:text-splash-azure hover:underline"
                    >
                      {isExpanded ? (
                        <>
                          <ChevronUp className="w-4 h-4" />
                          Hide products
                        </>
                      ) : (
                        <>
                          <ChevronDown className="w-4 h-4" />
                          Show products ({plan.products.length})
                        </>
                      )}
                    </button>

                    {isExpanded && (
                      <div className="mt-3 pt-3 border-t border-gray-200 dark:border-gray-700 coloursplash:border-splash-bg-subtle space-y-2">
                        {plan.products.map((suggestion, idx) => (
                          <div
                            key={idx}
                            className="flex items-center justify-between text-sm bg-white dark:bg-[#2d3548] coloursplash:bg-splash-bg-primary rounded px-3 py-2"
                          >
                            <div className="flex-1">
                              <span className="font-medium text-gray-900 dark:text-white coloursplash:text-splash-text-primary">
                                {suggestion.quantity}x {suggestion.product.name}
                              </span>
                              <span className="text-gray-500 dark:text-gray-400 coloursplash:text-splash-text-muted ml-2">
                                ({suggestion.product.servingSize})
                              </span>
                            </div>
                            <div className="text-xs text-gray-600 dark:text-gray-400 coloursplash:text-splash-text-muted">
                              {suggestion.contributes.carbs}g • {suggestion.contributes.sodium}mg • {suggestion.contributes.water}ml
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Existing Items Warning */}
          {existingItems.length > 0 && (
            <div className="bg-purple-50 dark:bg-purple-900/20 coloursplash:bg-splash-rose/10 border border-purple-200 dark:border-purple-800 coloursplash:border-splash-rose/30 rounded-lg p-4">
              <div className="flex items-start gap-3">
                <Info className="w-5 h-5 text-purple-600 dark:text-purple-400 coloursplash:text-splash-rose flex-shrink-0 mt-0.5" />
                <div className="flex-1">
                  <h4 className="text-sm font-semibold text-purple-800 dark:text-purple-200 coloursplash:text-splash-rose mb-1">
                    Note: Adding to Existing Selection
                  </h4>
                  <p className="text-sm text-purple-700 dark:text-purple-300 coloursplash:text-splash-text-secondary">
                    You have {existingItems.length} product{existingItems.length !== 1 ? 's' : ''} already selected.
                    The suggested products will be added to your existing selection, not replace it.
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="border-t border-gray-200 dark:border-gray-700 coloursplash:border-splash-bg-subtle px-6 py-4 flex items-center justify-end gap-3">
          <button
            onClick={onClose}
            className="px-4 py-2 text-gray-700 dark:text-gray-300 coloursplash:text-splash-text-secondary hover:bg-gray-100 dark:hover:bg-[#3a4458] coloursplash:hover:bg-splash-bg-subtle rounded-lg transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleApply}
            disabled={!selectedPlan}
            className="px-6 py-2 bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700 text-white rounded-lg font-semibold transition-all shadow-md hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            <Check className="w-4 h-4" />
            Apply Selection
          </button>
        </div>
      </div>
    </div>
  );
}
