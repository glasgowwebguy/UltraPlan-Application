import { useState, useEffect, useMemo } from 'react';
import { X, Plus, Edit2, Save, Info, ChevronDown, ChevronUp, AlertTriangle, Coffee, Zap } from 'lucide-react';
import type { NutritionItem } from '@/shared/types';
import { NUTRITION_DATABASE, type NutritionProduct, type NutritionCategory } from '../utils/nutritionDatabase';
import {
  CARB_THRESHOLDS,
  getCarbStatusColor,
  getCarbProgressColor,
  getCarbStatusMessage,
  shouldShowCarbWarning,
  isCarbDanger,
  getCarbWarningMessage,
  getCarbProgressWidth,
  getCaffeineStatusMessage,
  getCaffeineProgressColor,
  shouldShowCaffeineWarning,
  getCaffeineWarningMessage,
} from '../utils/nutritionThresholds';
import {
  assessGIRisk,
  calculateGIRiskFactors,
  getGIRiskColors,
  getGIRiskLabel,
  getToleranceBarColor,
} from '../utils/giDistressPredictor';
// Product intolerance utilities available for future use:
// import { hasKnownIntolerance, getIntoleranceWarning } from '../utils/productIntoleranceLog';
import NutritionProductsManager from './NutritionProductsManager';
import QuickAddProducts from './QuickAddProducts';
import { localStorageService } from '../services/localStorage';

interface NutritionEditModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (
    nutritionPlan: string,
    carbGoalPerHour: number,
    nutritionItems: string,
    sodiumGoalPerHour: number,
    waterGoalPerHour: number
  ) => Promise<void>;
  initialNutritionPlan?: string;
  initialCarbGoalPerHour?: number;
  initialNutritionItems?: string;
  initialSodiumGoalPerHour?: number;
  initialWaterGoalPerHour?: number;
  segmentTimeHours?: number;
}

export default function NutritionEditModal({
  isOpen,
  onClose,
  onSave,
  initialNutritionPlan,
  initialCarbGoalPerHour,
  initialNutritionItems,
  initialSodiumGoalPerHour,
  initialWaterGoalPerHour,
  segmentTimeHours = 0,
}: NutritionEditModalProps) {
  // State for tracking
  const [carbGoalPerHour, setCarbGoalPerHour] = useState<number>(60);
  const [sodiumGoalPerHour, setSodiumGoalPerHour] = useState<number>(300);
  const [waterGoalPerHour, setWaterGoalPerHour] = useState<number>(500);
  const [selectedItems, setSelectedItems] = useState<NutritionItem[]>([]);
  const [showGuidelines, setShowGuidelines] = useState(false);
  const [showProductsManager, setShowProductsManager] = useState(false);
  const [forceRefresh, setForceRefresh] = useState(0);

  // Legacy nutrition state
  const [products, setProducts] = useState<string[]>([]);
  const [notes, setNotes] = useState('');
  const [supportCrewMeal, setSupportCrewMeal] = useState('');
  const [newProduct, setNewProduct] = useState('');

  // Custom product state
  const [showAddCustom, setShowAddCustom] = useState(false);
  const [customName, setCustomName] = useState('');
  const [customCarbs, setCustomCarbs] = useState('');
  const [customSodium, setCustomSodium] = useState('');
  const [customWater, setCustomWater] = useState('');
  const [customServing, setCustomServing] = useState('');
  const [customQty, setCustomQty] = useState(1);

  // Initialize state from props
  useEffect(() => {
    if (isOpen) {
      // Initialize goals
      setCarbGoalPerHour(initialCarbGoalPerHour || 60);
      setSodiumGoalPerHour(initialSodiumGoalPerHour || 300);
      setWaterGoalPerHour(initialWaterGoalPerHour || 500);

      // Try to load new format nutrition items first
      if (initialNutritionItems) {
        try {
          const items = JSON.parse(initialNutritionItems);
          // Migrate old items that don't have sodium/water fields
          const migratedItems = items.map((item: NutritionItem) => {
            if (item.sodiumPerServing === undefined || item.waterPerServing === undefined) {
              // Try to find the product in the database to get default values
              const dbProduct = NUTRITION_DATABASE.find(p => p.name === item.productName);
              return {
                ...item,
                sodiumPerServing: item.sodiumPerServing ?? dbProduct?.defaultSodium ?? 0,
                waterPerServing: item.waterPerServing ?? dbProduct?.defaultWater ?? 0,
                isEditingSodium: false,
                isEditingWater: false,
              };
            }
            return {
              ...item,
              isEditingSodium: item.isEditingSodium ?? false,
              isEditingWater: item.isEditingWater ?? false,
            };
          });
          setSelectedItems(migratedItems);
        } catch {
          setSelectedItems([]);
        }
      } else {
        setSelectedItems([]);
      }

      // Load legacy nutrition plan
      if (initialNutritionPlan) {
        try {
          const data = JSON.parse(initialNutritionPlan);
          setProducts(data.products || []);
          setNotes(data.notes || '');
          setSupportCrewMeal(data.supportCrewMeal || '');
        } catch {
          // If not JSON, treat as plain text notes
          setProducts([]);
          setNotes(initialNutritionPlan);
          setSupportCrewMeal('');
        }
      } else {
        setProducts([]);
        setNotes('');
        setSupportCrewMeal('');
      }
    }
  }, [isOpen, initialNutritionPlan, initialCarbGoalPerHour, initialNutritionItems, initialSodiumGoalPerHour, initialWaterGoalPerHour]);

  // Merge user's saved products with NUTRITION_DATABASE
  const allProducts = useMemo(() => {
    const userProducts = localStorageService.getUserNutritionProducts();

    // Map user product categories to NutritionProduct categories
    // Now using standardized categories - direct passthrough for new format
    // with backward compatibility for old lowercase formats
    const categoryMap: Record<string, NutritionCategory> = {
      // New standardized categories (direct passthrough)
      'Gels': 'Gels',
      'Drinks': 'Drinks',
      'Electrolytes': 'Electrolytes',
      'Bars': 'Bars',
      'Real Food': 'Real Food',
      'Other': 'Other',
      // Backward compatibility for old lowercase formats
      'gel': 'Gels',
      'drink': 'Drinks',
      'bar': 'Bars',
      'electrolyte': 'Electrolytes',
      'hydration': 'Drinks',
      'supplement': 'Other',
      'logistics': 'Other',
    };

    const userProductsAsNutritionProducts: NutritionProduct[] = userProducts.map(p => ({
      name: p.name,
      defaultCarbs: p.carbsPerServing,
      defaultSodium: p.sodiumPerServing,
      defaultWater: p.waterPerServing,
      defaultCaffeine: p.caffeinePerServing || 0,
      servingSize: p.servingSize,
      category: categoryMap[p.category || 'Other'] || 'Gels',
    }));

    // Deduplicate: User products take precedence over database products
    const userProductNames = new Set(userProducts.map(p => p.name.toLowerCase()));
    const filteredDatabase = NUTRITION_DATABASE.filter(
      p => !userProductNames.has(p.name.toLowerCase())
    );

    return [...userProductsAsNutritionProducts, ...filteredDatabase];
  }, [forceRefresh]); // Re-run when products are updated

  // Get recently used product names
  const recentlyUsedProductNames = useMemo(() => {
    return localStorageService.getRecentlyUsedProducts().map(p => p.productName);
  }, [forceRefresh]);

  // Calculations
  const totalCarbs = Math.round(selectedItems.reduce(
    (sum, item) => sum + (item.carbsPerServing * item.quantity),
    0
  ) * 10) / 10;
  const totalSodium = Math.round(selectedItems.reduce(
    (sum, item) => sum + ((item.sodiumPerServing || 0) * item.quantity),
    0
  ));
  const totalWater = Math.round(selectedItems.reduce(
    (sum, item) => sum + ((item.waterPerServing || 0) * item.quantity),
    0
  ));

  const carbsPerHour = segmentTimeHours > 0 ? totalCarbs / segmentTimeHours : 0;
  const sodiumPerHour = segmentTimeHours > 0 ? totalSodium / segmentTimeHours : 0;
  const waterPerHour = segmentTimeHours > 0 ? totalWater / segmentTimeHours : 0;

  // Calculate caffeine totals
  const totalCaffeine = Math.round(selectedItems.reduce(
    (sum, item) => sum + ((item.caffeinePerServing || 0) * item.quantity),
    0
  ));
  const caffeinePerHour = segmentTimeHours > 0 ? totalCaffeine / segmentTimeHours : 0;
  const hasCaffeine = totalCaffeine > 0;

  // GI Risk Assessment
  const giRiskFactors = useMemo(() => {
    return calculateGIRiskFactors(
      selectedItems,
      segmentTimeHours,
      0, // cumulative carbs (would need to pass from parent for full accuracy)
      null, // temperature (would need weather data)
      'moderate' // pace intensity
    );
  }, [selectedItems, segmentTimeHours]);

  const giRisk = useMemo(() => {
    return assessGIRisk(giRiskFactors);
  }, [giRiskFactors]);

  // Calculate carb percentage for use in status functions
  const carbPercentage = carbGoalPerHour > 0 ? (carbsPerHour / carbGoalPerHour) * 100 : 0;

  // Use shared utility functions
  const carbStatusColor = getCarbStatusColor(carbPercentage, segmentTimeHours > 0);
  const carbProgressColorClass = getCarbProgressColor(carbPercentage, segmentTimeHours > 0);
  const carbStatusMsg = getCarbStatusMessage(carbPercentage, segmentTimeHours > 0);
  const showCarbWarning = shouldShowCarbWarning(carbPercentage);
  const carbWarningMsg = getCarbWarningMessage(carbPercentage);
  const carbProgressWidth = getCarbProgressWidth(carbPercentage);

  // Sodium uses a range-based status (optimal is 80-120%)
  const getSodiumStatusColor = () => {
    if (segmentTimeHours === 0) return 'text-gray-400';
    const percentage = (sodiumPerHour / sodiumGoalPerHour) * 100;
    if (percentage < 60 || percentage > 140) return 'text-red-400';
    if (percentage < 80 || percentage > 120) return 'text-yellow-400';
    return 'text-blue-400';
  };

  const getSodiumProgressColor = () => {
    if (segmentTimeHours === 0) return 'bg-gray-500';
    const percentage = (sodiumPerHour / sodiumGoalPerHour) * 100;
    if (percentage < 60 || percentage > 140) return 'bg-red-500';
    if (percentage < 80 || percentage > 120) return 'bg-yellow-500';
    return 'bg-blue-500';
  };

  const getSodiumStatusMessage = () => {
    if (segmentTimeHours === 0) return '';
    const percentage = (sodiumPerHour / sodiumGoalPerHour) * 100;
    if (percentage < 60) return 'Low sodium - Risk of muscle cramps & hyponatremia';
    if (percentage < 80) return 'Below optimal sodium intake';
    if (percentage <= 120) return 'Optimal sodium intake';
    if (percentage <= 140) return 'High sodium - Monitor for thirst';
    return 'Excessive sodium - Risk of GI distress';
  };

  // Water uses a range-based status (optimal is 80-120%)
  const getWaterStatusColor = () => {
    if (segmentTimeHours === 0) return 'text-gray-400';
    const percentage = (waterPerHour / waterGoalPerHour) * 100;
    if (percentage < 60 || percentage > 140) return 'text-red-400';
    if (percentage < 80 || percentage > 120) return 'text-yellow-400';
    return 'text-cyan-400';
  };

  const getWaterProgressColor = () => {
    if (segmentTimeHours === 0) return 'bg-gray-500';
    const percentage = (waterPerHour / waterGoalPerHour) * 100;
    if (percentage < 60 || percentage > 140) return 'bg-red-500';
    if (percentage < 80 || percentage > 120) return 'bg-yellow-500';
    return 'bg-cyan-500';
  };

  const getWaterStatusMessage = () => {
    if (segmentTimeHours === 0) return '';
    const percentage = (waterPerHour / waterGoalPerHour) * 100;
    if (percentage < 60) return 'Low hydration - Risk of dehydration';
    if (percentage < 80) return 'Below optimal hydration';
    if (percentage <= 120) return 'Optimal hydration';
    if (percentage <= 140) return 'High fluid intake - Monitor sodium balance';
    return 'Excessive hydration - Risk of hyponatremia';
  };

  // Product management functions
  const addPresetProduct = (product: NutritionProduct) => {
    // Track usage in localStorage
    localStorageService.trackProductUsage(product.name);

    const newItem: NutritionItem = {
      id: Date.now().toString(),
      productName: product.name,
      quantity: 1,
      carbsPerServing: product.defaultCarbs,
      sodiumPerServing: product.defaultSodium,
      waterPerServing: product.defaultWater,
      caffeinePerServing: product.defaultCaffeine || 0,
      servingSize: product.servingSize,
      isCustom: false,
      isEditingCarbs: false,
      isEditingSodium: false,
      isEditingWater: false,
      isEditingCaffeine: false,
    };
    setSelectedItems([...selectedItems, newItem]);

    // Force refresh to update recently used list
    setForceRefresh(prev => prev + 1);
  };

  const addCustomProduct = () => {
    if (!customName.trim()) return;

    const newItem: NutritionItem = {
      id: Date.now().toString(),
      productName: customName.trim(),
      quantity: customQty,
      carbsPerServing: parseFloat(customCarbs) || 0,
      sodiumPerServing: parseFloat(customSodium) || 0,
      waterPerServing: parseFloat(customWater) || 0,
      servingSize: customServing.trim() || 'serving',
      isCustom: true,
      isEditingCarbs: false,
      isEditingSodium: false,
      isEditingWater: false,
    };

    setSelectedItems([...selectedItems, newItem]);
    setCustomName('');
    setCustomCarbs('');
    setCustomSodium('');
    setCustomWater('');
    setCustomServing('');
    setCustomQty(1);
    setShowAddCustom(false);
  };

  const updateQuantity = (id: string, delta: number) => {
    setSelectedItems(items =>
      items.map(item =>
        item.id === id
          ? { ...item, quantity: Math.max(0, item.quantity + delta) }
          : item
      ).filter(item => item.quantity > 0)
    );
  };

  const toggleEditCarbs = (id: string) => {
    setSelectedItems(items =>
      items.map(item =>
        item.id === id
          ? { ...item, isEditingCarbs: !item.isEditingCarbs }
          : item
      )
    );
  };

  const toggleEditSodium = (id: string) => {
    setSelectedItems(items =>
      items.map(item =>
        item.id === id
          ? { ...item, isEditingSodium: !item.isEditingSodium }
          : item
      )
    );
  };

  const toggleEditWater = (id: string) => {
    setSelectedItems(items =>
      items.map(item =>
        item.id === id
          ? { ...item, isEditingWater: !item.isEditingWater }
          : item
      )
    );
  };

  const updateCarbs = (id: string, newCarbs: number) => {
    setSelectedItems(items =>
      items.map(item =>
        item.id === id
          ? { ...item, carbsPerServing: newCarbs, isEditingCarbs: false }
          : item
      )
    );
  };

  const updateSodium = (id: string, newSodium: number) => {
    setSelectedItems(items =>
      items.map(item =>
        item.id === id
          ? { ...item, sodiumPerServing: newSodium, isEditingSodium: false }
          : item
      )
    );
  };

  const updateWater = (id: string, newWater: number) => {
    setSelectedItems(items =>
      items.map(item =>
        item.id === id
          ? { ...item, waterPerServing: newWater, isEditingWater: false }
          : item
      )
    );
  };

  const removeItem = (id: string) => {
    setSelectedItems(items => items.filter(item => item.id !== id));
  };

  // Legacy product management
  const addLegacyProduct = () => {
    if (newProduct.trim()) {
      setProducts([...products, newProduct.trim()]);
      setNewProduct('');
    }
  };

  const removeLegacyProduct = (index: number) => {
    setProducts(products.filter((_, i) => i !== index));
  };

  const handleSave = async () => {
    // Build legacy nutrition plan (for backward compatibility)
    const legacyPlan = JSON.stringify({
      products: selectedItems.length > 0
        ? selectedItems.map(item => item.productName)
        : products,
      notes,
      supportCrewMeal,
    });

    await onSave(legacyPlan, carbGoalPerHour, JSON.stringify(selectedItems), sodiumGoalPerHour, waterGoalPerHour);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="bg-white dark:bg-[#2d3548] rounded-xl shadow-2xl border border-gray-200 dark:border-gray-700 w-full max-w-4xl max-h-[90vh] overflow-y-auto m-4">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-gray-200 dark:border-gray-700 sticky top-0 bg-white dark:bg-[#2d3548] z-10">
          <h3 className="text-xl font-bold text-gray-900 dark:text-white">Edit Nutrition Plan</h3>
          <button
            onClick={onClose}
            className="p-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-[#333c52] rounded-lg transition-all"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-5 space-y-5">
          {/* Goals Section */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Carb Goal */}
            <div>
              <label className="block text-sm font-semibold text-green-600 dark:text-green-400 mb-2">
                Carb Goal (g/hour)
              </label>
              <input
                type="number"
                value={carbGoalPerHour}
                onChange={(e) => setCarbGoalPerHour(parseInt(e.target.value) || 60)}
                min="0"
                max="120"
                className="w-full px-4 py-2 bg-white dark:bg-[#3a4458] border border-gray-300 dark:border-gray-600 text-gray-900 dark:text-white rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all"
              />
              <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">
                Target: 60-90g/hr for ultras
              </p>
            </div>

            {/* Sodium Goal */}
            <div>
              <label className="block text-sm font-semibold text-blue-600 dark:text-blue-400 mb-2">
                Sodium Goal (mg/hour)
              </label>
              <input
                type="number"
                value={sodiumGoalPerHour}
                onChange={(e) => setSodiumGoalPerHour(parseInt(e.target.value) || 300)}
                min="0"
                max="1500"
                className="w-full px-4 py-2 bg-white dark:bg-[#3a4458] border border-gray-300 dark:border-gray-600 text-gray-900 dark:text-white rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
              />
              <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">
                Target: 300-700mg/hr typical
              </p>
            </div>

            {/* Water Goal */}
            <div>
              <label className="block text-sm font-semibold text-cyan-600 dark:text-cyan-400 mb-2">
                Water Goal (ml/hour)
              </label>
              <input
                type="number"
                value={waterGoalPerHour}
                onChange={(e) => setWaterGoalPerHour(parseInt(e.target.value) || 500)}
                min="0"
                max="1500"
                className="w-full px-4 py-2 bg-white dark:bg-[#3a4458] border border-gray-300 dark:border-gray-600 text-gray-900 dark:text-white rounded-lg focus:ring-2 focus:ring-cyan-500 focus:border-transparent transition-all"
              />
              <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">
                Target: 400-800ml/hr typical
              </p>
            </div>
          </div>

          {/* Segment Summary with Three Progress Bars */}
          {segmentTimeHours > 0 && (
            <div className="bg-gray-50 dark:bg-[#3a4458] rounded-lg p-4 border border-gray-200 dark:border-gray-700">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <div className="text-xs text-gray-600 dark:text-gray-400 mb-1">Segment Time</div>
                  <div className="text-lg font-bold text-gray-900 dark:text-white">
                    {Math.floor(segmentTimeHours)}h {Math.round((segmentTimeHours % 1) * 60)}m
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-4 text-center">
                  <div>
                    <div className="text-xs text-gray-600 dark:text-gray-400 mb-1">Target Carbs</div>
                    <div className="text-lg font-bold text-green-600 dark:text-green-400">
                      {Math.round(carbGoalPerHour * segmentTimeHours)}g
                    </div>
                  </div>
                  <div>
                    <div className="text-xs text-gray-600 dark:text-gray-400 mb-1">Target Sodium</div>
                    <div className="text-lg font-bold text-blue-600 dark:text-blue-400">
                      {Math.round(sodiumGoalPerHour * segmentTimeHours)}mg
                    </div>
                  </div>
                  <div>
                    <div className="text-xs text-gray-600 dark:text-gray-400 mb-1">Target Water</div>
                    <div className="text-lg font-bold text-cyan-600 dark:text-cyan-400">
                      {Math.round(waterGoalPerHour * segmentTimeHours)}ml
                    </div>
                  </div>
                </div>
              </div>

              {/* Carbs Progress Bar */}
              <div className="mb-4">
                <div className="flex justify-between text-xs mb-1">
                  <span className="text-green-600 dark:text-green-400 font-medium">Carbs</span>
                  <span className={`font-bold ${carbStatusColor}`}>
                    {Math.round(carbsPerHour)}g/hr of {carbGoalPerHour}g/hr ({Math.round(carbPercentage)}%)
                  </span>
                </div>
                <div className="w-full bg-gray-300 dark:bg-gray-700 rounded-full h-3 overflow-hidden relative">
                  {/* Main progress bar */}
                  <div
                    className={`h-full transition-all duration-300 ${carbProgressColorClass}`}
                    style={{
                      width: `${Math.min(carbProgressWidth, 100)}%`
                    }}
                  />
                  {/* Overflow indicator when > 100% */}
                  {carbPercentage > 100 && (
                    <div
                      className={`absolute top-0 h-full transition-all duration-300 ${carbPercentage > CARB_THRESHOLDS.WARNING ? 'bg-red-500' : 'bg-orange-500'
                        }`}
                      style={{
                        left: '100%',
                        width: `${Math.min(carbPercentage - 100, 50)}%`,
                        marginLeft: '-1px'
                      }}
                    />
                  )}
                </div>
                <div className={`text-xs mt-1 ${carbStatusColor}`}>
                  {carbStatusMsg}
                </div>
              </div>

              {/* Carb Over-Consumption Warning Banner */}
              {showCarbWarning && segmentTimeHours > 0 && (
                <div className={`mb-4 flex items-start gap-2 text-xs px-3 py-2 rounded-lg border ${isCarbDanger(carbPercentage)
                    ? 'text-red-400 bg-red-500/10 border-red-500/30'
                    : 'text-orange-400 bg-orange-500/10 border-orange-500/30'
                  }`}>
                  <AlertTriangle className={`w-4 h-4 flex-shrink-0 ${isCarbDanger(carbPercentage) ? 'animate-pulse' : ''
                    }`} />
                  <span>{carbWarningMsg}</span>
                </div>
              )}

              {/* Sodium Progress Bar */}
              <div className="mb-4">
                <div className="flex justify-between text-xs mb-1">
                  <span className="text-blue-600 dark:text-blue-400 font-medium">Sodium</span>
                  <span className={`font-bold ${getSodiumStatusColor()}`}>
                    {Math.round(sodiumPerHour)}mg/hr of {sodiumGoalPerHour}mg/hr
                  </span>
                </div>
                <div className="w-full bg-gray-300 dark:bg-gray-700 rounded-full h-3 overflow-hidden">
                  <div
                    className={`h-full transition-all duration-300 ${getSodiumProgressColor()}`}
                    style={{
                      width: `${Math.min((sodiumPerHour / sodiumGoalPerHour) * 100, 100)}%`
                    }}
                  />
                </div>
                <div className={`text-xs mt-1 ${getSodiumStatusColor()}`}>
                  {getSodiumStatusMessage()}
                </div>
              </div>

              {/* Water Progress Bar */}
              <div>
                <div className="flex justify-between text-xs mb-1">
                  <span className="text-cyan-600 dark:text-cyan-400 font-medium">Water</span>
                  <span className={`font-bold ${getWaterStatusColor()}`}>
                    {Math.round(waterPerHour)}ml/hr of {waterGoalPerHour}ml/hr
                  </span>
                </div>
                <div className="w-full bg-gray-300 dark:bg-gray-700 rounded-full h-3 overflow-hidden">
                  <div
                    className={`h-full transition-all duration-300 ${getWaterProgressColor()}`}
                    style={{
                      width: `${Math.min((waterPerHour / waterGoalPerHour) * 100, 100)}%`
                    }}
                  />
                </div>
                <div className={`text-xs mt-1 ${getWaterStatusColor()}`}>
                  {getWaterStatusMessage()}
                </div>
              </div>

              {/* Caffeine Tracking Section - Always visible */}
              <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-600">
                <div className="flex justify-between text-xs mb-1">
                  <span className={`font-medium flex items-center gap-1 ${hasCaffeine ? 'text-orange-600 dark:text-orange-400' : 'text-gray-500 dark:text-gray-400'}`}>
                    <Coffee className="w-3 h-3" />
                    Caffeine
                  </span>
                  <span className={`font-bold ${hasCaffeine ? 'text-orange-600 dark:text-orange-400' : 'text-gray-500 dark:text-gray-400'}`}>
                    {totalCaffeine}mg total {segmentTimeHours > 0 ? `(${Math.round(caffeinePerHour)}mg/hr)` : ''}
                  </span>
                </div>
                <div className="w-full bg-gray-300 dark:bg-gray-700 rounded-full h-3 overflow-hidden">
                  <div
                    className={`h-full transition-all duration-300 ${hasCaffeine ? getCaffeineProgressColor(totalCaffeine / 70) : 'bg-gray-400'}`}
                    style={{
                      width: hasCaffeine ? `${Math.min((totalCaffeine / 400) * 100, 100)}%` : '0%'
                    }}
                  />
                </div>
                <div className={`text-xs mt-1 ${hasCaffeine ? 'text-orange-600 dark:text-orange-400' : 'text-gray-500 dark:text-gray-400'}`}>
                  {hasCaffeine ? getCaffeineStatusMessage(totalCaffeine, 70) : 'No caffeine in selected products. Add caffeinated gels, colas, or energy drinks to track.'}
                </div>
                {hasCaffeine && shouldShowCaffeineWarning(totalCaffeine / 70) && (
                  <div className="mt-2 text-xs text-orange-500 bg-orange-50 dark:bg-orange-900/20 p-2 rounded">
                    {getCaffeineWarningMessage(totalCaffeine, 70)}
                  </div>
                )}
              </div>

              {/* GI Distress Risk Assessment - Always visible */}
              {segmentTimeHours > 0 && (
                <div className={`mt-4 p-3 rounded-lg border ${getGIRiskColors(giRisk.riskLevel).bg} ${getGIRiskColors(giRisk.riskLevel).border}`}>
                  <div className="flex items-start gap-2">
                    <Zap className={`w-4 h-4 flex-shrink-0 mt-0.5 ${getGIRiskColors(giRisk.riskLevel).icon}`} />
                    <div className="flex-1">
                      <div className={`font-semibold text-sm ${getGIRiskColors(giRisk.riskLevel).text}`}>
                        GI Distress Risk: {getGIRiskLabel(giRisk.riskLevel)}
                      </div>
                      {giRisk.riskFactors.length > 0 && (
                        <div className="text-xs mt-1 space-y-0.5">
                          {giRisk.riskFactors.map((factor, idx) => (
                            <div key={idx} className="text-gray-600 dark:text-gray-400">• {factor}</div>
                          ))}
                        </div>
                      )}
                      {giRisk.riskLevel === 'low' && (
                        <div className="text-xs mt-1 text-gray-500 dark:text-gray-400">
                          Your nutrition plan looks safe for this segment.
                        </div>
                      )}
                      {giRisk.recommendations.length > 0 && giRisk.riskLevel !== 'low' && (
                        <div className="mt-2 text-xs">
                          <span className="font-medium text-gray-700 dark:text-gray-300">Tips: </span>
                          {giRisk.recommendations.slice(0, 2).map((rec, idx) => (
                            <span key={idx} className="text-gray-600 dark:text-gray-400">
                              {rec}{idx < Math.min(giRisk.recommendations.length, 2) - 1 ? '; ' : ''}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* Carb Tolerance Meter - Always visible when segment has time */}
              {segmentTimeHours > 0 && (
                <div className="mt-3">
                  <div className="flex justify-between text-xs mb-1">
                    <span className="text-gray-600 dark:text-gray-400">Carb Tolerance</span>
                    <span className={giRisk.tolerancePercentage > 100 ? 'text-red-500' : giRisk.tolerancePercentage > 70 ? 'text-yellow-600 dark:text-yellow-400' : 'text-gray-600 dark:text-gray-400'}>
                      {Math.round(giRisk.tolerancePercentage)}% of typical max (90g/hr)
                    </span>
                  </div>
                  <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                    <div
                      className={`h-2 rounded-full transition-all ${getToleranceBarColor(giRisk.tolerancePercentage)}`}
                      style={{ width: `${Math.min(100, giRisk.tolerancePercentage)}%` }}
                    />
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Nutrition Guidelines Toggle */}
          <div>
            <button
              onClick={() => setShowGuidelines(!showGuidelines)}
              className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors"
            >
              <Info className="w-4 h-4" />
              <span>Nutrition Guidelines</span>
              {showGuidelines ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </button>

            {showGuidelines && (
              <div className="mt-3 grid grid-cols-1 md:grid-cols-3 gap-4 p-4 bg-gray-100 dark:bg-[#333c52] rounded-lg">
                <div className="space-y-2">
                  <h4 className="font-semibold text-green-600 dark:text-green-400 text-sm">
                    Carbohydrate Guidelines
                  </h4>
                  <ul className="text-xs text-gray-600 dark:text-gray-300 space-y-1">
                    <li>60-90g/hr for ultras</li>
                    <li>Start fueling early</li>
                    <li>Mix sources (glucose + fructose)</li>
                    <li>Train your gut in training</li>
                  </ul>
                </div>

                <div className="space-y-2">
                  <h4 className="font-semibold text-blue-600 dark:text-blue-400 text-sm">
                    Sodium Guidelines
                  </h4>
                  <ul className="text-xs text-gray-600 dark:text-gray-300 space-y-1">
                    <li>300-700mg/hr typical range</li>
                    <li>Heavy sweaters: 700-1000mg/hr</li>
                    <li>Cool weather: 200-400mg/hr</li>
                    <li>Hot weather: 500-1000mg/hr</li>
                    <li>Monitor for cramping</li>
                  </ul>
                </div>

                <div className="space-y-2">
                  <h4 className="font-semibold text-cyan-600 dark:text-cyan-400 text-sm">
                    Hydration Guidelines
                  </h4>
                  <ul className="text-xs text-gray-600 dark:text-gray-300 space-y-1">
                    <li>400-800ml/hr typical range</li>
                    <li>Cool: 300-500ml/hr</li>
                    <li>Hot: 600-1000ml/hr</li>
                    <li>Drink to thirst</li>
                    <li>Monitor urine color</li>
                  </ul>
                </div>

                <div className="md:col-span-3 mt-2 p-3 bg-red-100 dark:bg-red-900/20 border border-red-300 dark:border-red-500/50 rounded-lg">
                  <h4 className="font-semibold text-red-600 dark:text-red-400 text-sm mb-2">
                    Safety Warnings
                  </h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div>
                      <h5 className="text-xs font-medium text-red-600 dark:text-red-400">Hyponatremia Risk</h5>
                      <ul className="text-xs text-gray-600 dark:text-gray-300 space-y-0.5">
                        <li>Excessive water without sodium</li>
                        <li>Symptoms: nausea, headache, confusion</li>
                        <li>Prevention: balance water with sodium</li>
                      </ul>
                    </div>
                    <div>
                      <h5 className="text-xs font-medium text-orange-600 dark:text-orange-400">Dehydration Risk</h5>
                      <ul className="text-xs text-gray-600 dark:text-gray-300 space-y-0.5">
                        <li>Insufficient fluid intake</li>
                        <li>Symptoms: dizziness, dark urine</li>
                        <li>Prevention: drink regularly</li>
                      </ul>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Selected Items */}
          {selectedItems.length > 0 && (
            <div>
              <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">Selected Products</h4>
              <div className="space-y-3">
                {selectedItems.map((item) => (
                  <div
                    key={item.id}
                    className="bg-gray-50 dark:bg-[#3a4458] rounded-lg p-4 border border-gray-200 dark:border-gray-600"
                  >
                    {/* Header with Product Name and Remove Button */}
                    <div className="flex items-center justify-between mb-3">
                      <div>
                        <div className="text-gray-900 dark:text-white font-semibold text-base">{item.productName}</div>
                        <div className="text-xs text-gray-500 dark:text-gray-400">
                          per {item.servingSize}
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => removeItem(item.id)}
                        className="p-1.5 text-red-400 hover:text-red-300 hover:bg-red-500/10 rounded transition-colors"
                      >
                        <X className="w-5 h-5" />
                      </button>
                    </div>

                    {/* Quantity Controls - Separated with border */}
                    <div className="flex items-center gap-3 pb-3 mb-3 border-b border-gray-200 dark:border-gray-600">
                      <span className="text-sm text-gray-600 dark:text-gray-400 font-medium">Quantity:</span>
                      <button
                        type="button"
                        onClick={() => updateQuantity(item.id, -1)}
                        className="w-8 h-8 bg-gray-200 dark:bg-gray-600 text-gray-900 dark:text-white rounded-lg hover:bg-gray-300 dark:hover:bg-gray-500 transition-colors font-medium"
                      >
                        -
                      </button>
                      <span className="w-10 text-center text-gray-900 dark:text-white font-bold text-lg">
                        {item.quantity}
                      </span>
                      <button
                        type="button"
                        onClick={() => updateQuantity(item.id, 1)}
                        className="w-8 h-8 bg-orange-600 text-white rounded-lg hover:bg-orange-500 transition-colors font-medium"
                      >
                        +
                      </button>
                    </div>

                    {/* Nutrition Values Grid - Per Serving with Editable Values */}
                    <div className="grid grid-cols-3 gap-3 text-sm">
                      {/* Carbs */}
                      <div className="bg-green-50 dark:bg-green-900/20 rounded-lg p-2 border border-green-200 dark:border-green-800">
                        <div className="text-xs text-green-600 dark:text-green-400 font-medium mb-1">Carbs</div>
                        <div className="flex items-center gap-1">
                          {item.isEditingCarbs ? (
                            <>
                              <input
                                type="number"
                                step="1"
                                defaultValue={item.carbsPerServing}
                                onBlur={(e) => updateCarbs(item.id, parseFloat(e.target.value) || 0)}
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter') {
                                    updateCarbs(item.id, parseFloat((e.target as HTMLInputElement).value) || 0);
                                  }
                                }}
                                className="w-14 px-2 py-1 bg-white dark:bg-[#2d3548] border border-green-500 text-gray-900 dark:text-white rounded text-sm"
                                autoFocus
                              />
                              <span className="text-xs text-green-600 dark:text-green-400">g</span>
                              <button
                                type="button"
                                onClick={() => toggleEditCarbs(item.id)}
                                className="p-1 text-green-500 hover:text-green-400"
                              >
                                <Save className="w-3 h-3" />
                              </button>
                            </>
                          ) : (
                            <>
                              <span className="text-base text-green-700 dark:text-green-300 font-bold">
                                {item.carbsPerServing}g
                              </span>
                              <button
                                type="button"
                                onClick={() => toggleEditCarbs(item.id)}
                                className="p-1 text-green-400 hover:text-green-300"
                                title="Edit carbs"
                              >
                                <Edit2 className="w-3 h-3" />
                              </button>
                            </>
                          )}
                        </div>
                        <div className="text-xs text-green-600 dark:text-green-400 mt-1 font-bold">
                          x{item.quantity} = {(item.carbsPerServing * item.quantity)}g
                        </div>
                      </div>

                      {/* Sodium */}
                      <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-2 border border-blue-200 dark:border-blue-800">
                        <div className="text-xs text-blue-600 dark:text-blue-400 font-medium mb-1">Sodium</div>
                        <div className="flex items-center gap-1">
                          {item.isEditingSodium ? (
                            <>
                              <input
                                type="number"
                                step="1"
                                defaultValue={item.sodiumPerServing}
                                onBlur={(e) => updateSodium(item.id, parseFloat(e.target.value) || 0)}
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter') {
                                    updateSodium(item.id, parseFloat((e.target as HTMLInputElement).value) || 0);
                                  }
                                }}
                                className="w-14 px-2 py-1 bg-white dark:bg-[#2d3548] border border-blue-500 text-gray-900 dark:text-white rounded text-sm"
                                autoFocus
                              />
                              <span className="text-xs text-blue-600 dark:text-blue-400">mg</span>
                              <button
                                type="button"
                                onClick={() => toggleEditSodium(item.id)}
                                className="p-1 text-blue-500 hover:text-blue-400"
                              >
                                <Save className="w-3 h-3" />
                              </button>
                            </>
                          ) : (
                            <>
                              <span className="text-base text-blue-700 dark:text-blue-300 font-bold">
                                {item.sodiumPerServing}mg
                              </span>
                              <button
                                type="button"
                                onClick={() => toggleEditSodium(item.id)}
                                className="p-1 text-blue-400 hover:text-blue-300"
                                title="Edit sodium"
                              >
                                <Edit2 className="w-3 h-3" />
                              </button>
                            </>
                          )}
                        </div>
                        <div className="text-xs text-blue-600 dark:text-blue-400 mt-1 font-bold">
                          x{item.quantity} = {(item.sodiumPerServing * item.quantity)}mg
                        </div>
                      </div>

                      {/* Water */}
                      <div className="bg-cyan-50 dark:bg-cyan-900/20 rounded-lg p-2 border border-cyan-200 dark:border-cyan-800">
                        <div className="text-xs text-cyan-600 dark:text-cyan-400 font-medium mb-1">Water</div>
                        <div className="flex items-center gap-1">
                          {item.isEditingWater ? (
                            <>
                              <input
                                type="number"
                                step="1"
                                defaultValue={item.waterPerServing}
                                onBlur={(e) => updateWater(item.id, parseFloat(e.target.value) || 0)}
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter') {
                                    updateWater(item.id, parseFloat((e.target as HTMLInputElement).value) || 0);
                                  }
                                }}
                                className="w-14 px-2 py-1 bg-white dark:bg-[#2d3548] border border-cyan-500 text-gray-900 dark:text-white rounded text-sm"
                                autoFocus
                              />
                              <span className="text-xs text-cyan-600 dark:text-cyan-400">ml</span>
                              <button
                                type="button"
                                onClick={() => toggleEditWater(item.id)}
                                className="p-1 text-cyan-500 hover:text-cyan-400"
                              >
                                <Save className="w-3 h-3" />
                              </button>
                            </>
                          ) : (
                            <>
                              <span className="text-base text-cyan-700 dark:text-cyan-300 font-bold">
                                {item.waterPerServing}ml
                              </span>
                              <button
                                type="button"
                                onClick={() => toggleEditWater(item.id)}
                                className="p-1 text-cyan-400 hover:text-cyan-300"
                                title="Edit water"
                              >
                                <Edit2 className="w-3 h-3" />
                              </button>
                            </>
                          )}
                        </div>
                        <div className="text-xs text-cyan-600 dark:text-cyan-400 mt-1 font-bold">
                          x{item.quantity} = {(item.waterPerServing * item.quantity)}ml
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Add Custom Product */}
          <div>
            {!showAddCustom ? (
              <button
                type="button"
                onClick={() => setShowAddCustom(true)}
                className="w-full py-3 border-2 border-dashed border-gray-300 dark:border-gray-600 text-gray-600 dark:text-gray-400 rounded-lg hover:border-orange-500 hover:text-orange-500 dark:hover:text-orange-400 transition-all flex items-center justify-center gap-2"
              >
                <Plus className="w-5 h-5" />
                Add Custom Product
              </button>
            ) : (
              <div className="bg-gray-50 dark:bg-[#3a4458] rounded-lg p-4 border border-orange-500/30">
                <h4 className="text-sm font-semibold text-orange-500 dark:text-orange-400 mb-3">Add Custom Product</h4>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mb-3">
                  <div className="col-span-2 md:col-span-1">
                    <label className="block text-xs text-gray-600 dark:text-gray-400 mb-1">Product Name</label>
                    <input
                      type="text"
                      value={customName}
                      onChange={(e) => setCustomName(e.target.value)}
                      placeholder="e.g., Energy bar"
                      className="w-full px-3 py-2 bg-white dark:bg-[#2d3548] border border-gray-300 dark:border-gray-600 text-gray-900 dark:text-white rounded text-sm focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-green-600 dark:text-green-400 mb-1">Carbs (g)</label>
                    <input
                      type="number"
                      value={customCarbs}
                      onChange={(e) => setCustomCarbs(e.target.value)}
                      placeholder="40"
                      className="w-full px-3 py-2 bg-white dark:bg-[#2d3548] border border-gray-300 dark:border-gray-600 text-gray-900 dark:text-white rounded text-sm focus:ring-2 focus:ring-green-500 focus:border-transparent"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-blue-600 dark:text-blue-400 mb-1">Sodium (mg)</label>
                    <input
                      type="number"
                      value={customSodium}
                      onChange={(e) => setCustomSodium(e.target.value)}
                      placeholder="200"
                      className="w-full px-3 py-2 bg-white dark:bg-[#2d3548] border border-gray-300 dark:border-gray-600 text-gray-900 dark:text-white rounded text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-cyan-600 dark:text-cyan-400 mb-1">Water (ml)</label>
                    <input
                      type="number"
                      value={customWater}
                      onChange={(e) => setCustomWater(e.target.value)}
                      placeholder="0"
                      className="w-full px-3 py-2 bg-white dark:bg-[#2d3548] border border-gray-300 dark:border-gray-600 text-gray-900 dark:text-white rounded text-sm focus:ring-2 focus:ring-cyan-500 focus:border-transparent"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-600 dark:text-gray-400 mb-1">Serving Size</label>
                    <input
                      type="text"
                      value={customServing}
                      onChange={(e) => setCustomServing(e.target.value)}
                      placeholder="bar, scoop"
                      className="w-full px-3 py-2 bg-white dark:bg-[#2d3548] border border-gray-300 dark:border-gray-600 text-gray-900 dark:text-white rounded text-sm focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-600 dark:text-gray-400 mb-1">Quantity</label>
                    <input
                      type="number"
                      value={customQty}
                      onChange={(e) => setCustomQty(parseInt(e.target.value) || 1)}
                      min="1"
                      className="w-full px-3 py-2 bg-white dark:bg-[#2d3548] border border-gray-300 dark:border-gray-600 text-gray-900 dark:text-white rounded text-sm focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                    />
                  </div>
                </div>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={addCustomProduct}
                    disabled={!customName.trim()}
                    className="flex-1 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                  >
                    Add Product
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowAddCustom(false)}
                    className="px-4 py-2 bg-gray-200 dark:bg-gray-600 text-gray-900 dark:text-white rounded-lg hover:bg-gray-300 dark:hover:bg-gray-500 transition-all"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Quick Add Products Component */}
          <QuickAddProducts
            products={allProducts}
            recentlyUsedProductNames={recentlyUsedProductNames}
            onAddProduct={addPresetProduct}
            onManageProducts={() => setShowProductsManager(true)}
            showManageButton={true}
            maxHeight="max-h-64"
            columns={4}
          />

          {/* Legacy Products (for backward compatibility) */}
          {selectedItems.length === 0 && (
            <div>
              <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">Products (Legacy Format)</h4>
              <div className="space-y-2 mb-2">
                {products.map((product, index) => (
                  <div key={index} className="flex items-center justify-between px-3 py-2 bg-gray-50 dark:bg-[#3a4458] rounded-lg border border-gray-200 dark:border-transparent">
                    <span className="text-gray-900 dark:text-white">{product}</span>
                    <button
                      type="button"
                      onClick={() => removeLegacyProduct(index)}
                      className="p-1 text-red-400 hover:text-red-300"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={newProduct}
                  onChange={(e) => setNewProduct(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && addLegacyProduct()}
                  placeholder="Add product name..."
                  className="flex-1 px-4 py-2 bg-white dark:bg-[#3a4458] border border-gray-300 dark:border-gray-600 text-gray-900 dark:text-white rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                />
                <button
                  type="button"
                  onClick={addLegacyProduct}
                  className="px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-500 transition-all"
                >
                  <Plus className="w-5 h-5" />
                </button>
              </div>
            </div>
          )}

          {/* Notes */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
              Additional Notes
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="e.g., Real food preferences, allergies, timing notes"
              rows={3}
              className="w-full px-4 py-2.5 bg-white dark:bg-[#3a4458] border border-gray-300 dark:border-gray-600 text-gray-900 dark:text-white placeholder-gray-500 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-all resize-none"
            />
          </div>

          {/* Support Crew Meal */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
              Support Crew Meal Request
            </label>
            <input
              type="text"
              value={supportCrewMeal}
              onChange={(e) => setSupportCrewMeal(e.target.value)}
              placeholder="e.g., Hot soup, sandwich, pizza"
              className="w-full px-4 py-2.5 bg-white dark:bg-[#3a4458] border border-gray-300 dark:border-gray-600 text-gray-900 dark:text-white placeholder-gray-500 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-all"
            />
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 p-5 border-t border-gray-200 dark:border-gray-700 sticky bottom-0 bg-white dark:bg-[#2d3548]">
          <button
            onClick={onClose}
            className="px-6 py-2.5 bg-gray-200 dark:bg-gray-600 text-gray-900 dark:text-white font-semibold rounded-lg hover:bg-gray-300 dark:hover:bg-gray-500 transition-all"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            className="px-6 py-2.5 bg-gradient-to-r from-green-500 to-emerald-600 text-white font-semibold rounded-lg hover:from-green-600 hover:to-emerald-700 transition-all shadow-lg"
          >
            Save Changes
          </button>
        </div>
      </div>

      {/* Nutrition Products Manager Modal */}
      <NutritionProductsManager
        isOpen={showProductsManager}
        onClose={() => setShowProductsManager(false)}
        onProductsUpdated={() => setForceRefresh(prev => prev + 1)}
      />
    </div>
  );
}
