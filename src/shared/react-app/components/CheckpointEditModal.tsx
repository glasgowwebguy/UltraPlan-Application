import { useState, useEffect, useMemo } from "react";
import {
  X,
  User,
  Phone,
  Plus,
  Edit2,
  Save,
  Info,
  ChevronDown,
  ChevronUp,
  AlertTriangle,
  Zap,
  Sparkles,
} from "lucide-react";
import type { Segment, SupportCrewMember, NutritionItem } from "@/shared/types";
import {
  NUTRITION_DATABASE,
  type NutritionProduct,
  type NutritionCategory,
} from "../utils/nutritionDatabase";
import QuickAddProducts from './QuickAddProducts';
import SmartNutritionModal from './SmartNutritionModal';
import TerrainFactorSlider from './TerrainFactorSlider';
import { localStorageService } from '../services/localStorage';
import { useUnit } from "../contexts/UnitContext";
import {
  getDistanceUnitName,
  getDistancePlaceholder,
  getPaceUnit,
} from "../utils/unitConversions";
import { generatePaceOptions } from "../utils/autoPaceCalculation";
import {
  CARB_THRESHOLDS,
  getCarbStatusColor,
  getCarbProgressColor,
  getCarbStatusMessage,
  shouldShowCarbWarning,
  isCarbDanger,
  getCarbWarningMessage,
  getCarbProgressWidth,
} from "../utils/nutritionThresholds";

interface CheckpointEditModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: {
    checkpoint_name: string;
    segment_distance_miles: number;
    terrain_description?: string;
    terrain_factor?: number;
    nutrition_plan?: string;
    carb_goal_per_hour?: number;
    sodium_goal_per_hour?: number;
    water_goal_per_hour?: number;
    segment_nutrition_items?: string;
    notes?: string;
    map_reference?: string;
    custom_pace_min_per_mile?: number;
    cutoff_time?: string;
    checkpoint_time_minutes?: number;
    support_crew_present?: boolean;
    support_crew_names?: string;
    support_crew_members?: string;
    use_auto_pace?: boolean;
  }) => Promise<void>;
  segment: Segment;
}

export default function CheckpointEditModal({
  isOpen,
  onClose,
  onSave,
  segment,
}: CheckpointEditModalProps) {
  const { useMiles, toggleUnit } = useUnit();
  const [checkpointName, setCheckpointName] = useState("");
  const [distanceMiles, setDistanceMiles] = useState("");
  const [terrainType, setTerrainType] = useState("");
  const [customTerrain, setCustomTerrain] = useState("");
  const [terrainFactor, setTerrainFactor] = useState<number>(1.0);

  // Nutrition state
  const [carbGoalPerHour, setCarbGoalPerHour] = useState<number>(60);
  const [sodiumGoalPerHour, setSodiumGoalPerHour] = useState<number>(300);
  const [waterGoalPerHour, setWaterGoalPerHour] = useState<number>(500);
  const [selectedItems, setSelectedItems] = useState<NutritionItem[]>([]);
  const [showAddCustom, setShowAddCustom] = useState(false);
  const [showGuidelines, setShowGuidelines] = useState(false);
  const [showSmartSuggest, setShowSmartSuggest] = useState(false);

  // Custom product form state
  const [customName, setCustomName] = useState("");
  const [customCarbs, setCustomCarbs] = useState("");
  const [customSodium, setCustomSodium] = useState("");
  const [customWater, setCustomWater] = useState("");
  const [customServing, setCustomServing] = useState("");
  const [customQty, setCustomQty] = useState(1);

  // Nutrition notes (keep for backward compatibility)
  const [nutritionNotes, setNutritionNotes] = useState("");
  const [supportCrewMeal, setSupportCrewMeal] = useState("");

  const [notes, setNotes] = useState("");
  const [mapReference, setMapReference] = useState("");
  const [customPaceMin, setCustomPaceMin] = useState("");
  const [customPaceSec, setCustomPaceSec] = useState("");
  const [cutoffTime, setCutoffTime] = useState("");

  // Parse checkpoint time into hours, minutes, seconds
  const [checkpointTimeHrs, setCheckpointTimeHrs] = useState("0");
  const [checkpointTimeMin, setCheckpointTimeMin] = useState("5");
  const [checkpointTimeSec, setCheckpointTimeSec] = useState("0");
  const [submitting, setSubmitting] = useState(false);

  const [supportCrewPresent, setSupportCrewPresent] = useState(false);
  const [supportCrewNames, setSupportCrewNames] = useState("");

  // Support crew members state
  const [crewMembers, setCrewMembers] = useState<SupportCrewMember[]>([]);
  const [newCrewName, setNewCrewName] = useState("");
  const [newCrewPhone, setNewCrewPhone] = useState("");

  const [forceRefresh, setForceRefresh] = useState(0);

  // Auto-pace state
  const [useAutoPace, setUseAutoPace] = useState(false);

  // Selected pace tier state (aggressive, balanced, conservative)
  const [selectedPaceTier, setSelectedPaceTier] = useState<'aggressive' | 'balanced' | 'conservative'>('balanced');

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
      servingSize: p.servingSize,
      category: categoryMap[p.category || 'Other'] || 'Gels',
    }));

    // Deduplicate: User products take precedence over database products
    const userProductNames = new Set(userProducts.map(p => p.name.toLowerCase()));
    const filteredDatabase = NUTRITION_DATABASE.filter(
      p => !userProductNames.has(p.name.toLowerCase())
    );

    return [...userProductsAsNutritionProducts, ...filteredDatabase];
  }, [forceRefresh]);

  // Get recently used product names
  const recentlyUsedProductNames = useMemo(() => {
    return localStorageService.getRecentlyUsedProducts().map(p => p.productName);
  }, [forceRefresh]);

  // Generate pace options for the segment
  const paceOptions = useMemo(() => {
    if (!segment.auto_derived_pace || !segment.auto_pace_confidence) return null;
    return generatePaceOptions(
      segment.auto_derived_pace,
      segment.auto_pace_confidence,
      segment.auto_pace_reasoning || ''
    );
  }, [segment.auto_derived_pace, segment.auto_pace_confidence, segment.auto_pace_reasoning]);

  // Auto-populate pace fields when auto-pace is enabled and tier is selected
  useEffect(() => {
    if (useAutoPace && paceOptions) {
      const selectedOption = paceOptions.find(opt => opt.tier === selectedPaceTier);
      if (selectedOption && !isNaN(selectedOption.paceMinPerMile) && isFinite(selectedOption.paceMinPerMile)) {
        const minutes = Math.floor(selectedOption.paceMinPerMile);
        const seconds = Math.round((selectedOption.paceMinPerMile - minutes) * 60);
        setCustomPaceMin(minutes.toString());
        setCustomPaceSec(seconds.toString());
      }
    }
  }, [useAutoPace, paceOptions, selectedPaceTier]);

  // Initialize state from segment props
  useEffect(() => {
    if (isOpen && segment) {
      setCheckpointName(segment.checkpoint_name || "");
      setDistanceMiles(segment.segment_distance_miles?.toString() || "");

      // Terrain handling
      const predefinedTypes = [
        "Road/Pavement",
        "Rolling Hills, Tree Roots and Rocks",
        "Trail/Single track",
        "Field Paths/Woodlands",
        "Rough & Rocky",
        "Rocky/Slippery",
        "Undulating Paths",
        "Open Moorland",
        "Forest Tracks",
        "Rocky & Rough Upland Path",
        "Exposed Tree Roots",
        "Undulating Hills/Short, Steep Climbs",
        "Caution: Technical Terrain Ahead!",
        "Rugged & Rocky Ground",
        "Muddy/Techical",
        "Rocky/Technical",
        "Muddy/Boggy",
        "Sandy",
        "Gravel",
        "Steep climb/ascent",
        "Steep descent",
        "Rolling hills",
        "Flat",
        "Snow/Ice",
        "River crossing",
        "Scree/Loose rock",
      ];

      const terrain = segment.terrain_description || "";
      if (predefinedTypes.includes(terrain)) {
        setTerrainType(terrain);
        setCustomTerrain("");
      } else {
        setTerrainType(terrain ? "Custom" : "");
        setCustomTerrain(terrain);
      }

      // Set terrain factor
      setTerrainFactor(segment.terrain_factor ?? 1.0);

      // Nutrition
      setCarbGoalPerHour(segment.carb_goal_per_hour || 60);
      setSodiumGoalPerHour(segment.sodium_goal_per_hour || 300);
      setWaterGoalPerHour(segment.water_goal_per_hour || 500);

      if (segment.segment_nutrition_items) {
        try {
          const items = JSON.parse(segment.segment_nutrition_items);
          setSelectedItems(items);
        } catch {
          setSelectedItems([]);
        }
      } else {
        setSelectedItems([]);
      }

      if (segment.nutrition_plan) {
        try {
          const parsed = JSON.parse(segment.nutrition_plan);
          setNutritionNotes(parsed.notes || "");
          setSupportCrewMeal(parsed.supportCrewMeal || "");
        } catch {
          setNutritionNotes("");
          setSupportCrewMeal("");
        }
      }

      setNotes(segment.notes || "");
      setMapReference(segment.map_reference || "");

      // Custom pace
      if (segment.custom_pace_min_per_mile) {
        const pace = segment.custom_pace_min_per_mile;
        setCustomPaceMin(Math.floor(pace).toString());
        setCustomPaceSec(Math.round((pace - Math.floor(pace)) * 60).toString());
      } else {
        setCustomPaceMin("");
        setCustomPaceSec("");
      }

      setCutoffTime(segment.cutoff_time || "");

      // Checkpoint time
      if (segment.checkpoint_time_minutes) {
        setCheckpointTimeHrs(
          Math.floor(segment.checkpoint_time_minutes / 60).toString()
        );
        setCheckpointTimeMin(
          Math.floor(segment.checkpoint_time_minutes % 60).toString()
        );
        setCheckpointTimeSec(
          Math.round(
            ((segment.checkpoint_time_minutes % 60) -
              Math.floor(segment.checkpoint_time_minutes % 60)) *
            60
          ).toString()
        );
      } else {
        setCheckpointTimeHrs("0");
        setCheckpointTimeMin("5");
        setCheckpointTimeSec("0");
      }

      // Support crew
      setSupportCrewPresent(segment.support_crew_present || false);
      setSupportCrewNames(segment.support_crew_names || "");

      if (segment.support_crew_members) {
        try {
          setCrewMembers(JSON.parse(segment.support_crew_members));
        } catch {
          setCrewMembers([]);
        }
      } else {
        setCrewMembers([]);
      }

      // Auto-pace
      setUseAutoPace(segment.use_auto_pace || false);
    }
  }, [isOpen, segment]);

  // Calculate segment time in hours
  const segmentDistance = parseFloat(distanceMiles) || 0;
  const predictedSegmentTime = segment?.predicted_segment_time_minutes || null;

  const segmentTimeHours = useMemo(() => {
    if (!segmentDistance || segmentDistance === 0) return 0;

    // If custom pace is set, use it
    if (customPaceMin || customPaceSec) {
      const totalPaceMinutes =
        parseFloat(customPaceMin || "0") +
        parseFloat(customPaceSec || "0") / 60;
      return (segmentDistance * totalPaceMinutes) / 60;
    }

    // Otherwise use predicted segment time
    if (predictedSegmentTime) {
      return predictedSegmentTime / 60;
    }

    return 0;
  }, [segmentDistance, customPaceMin, customPaceSec, predictedSegmentTime]);

  // Calculate totals from selected items
  const totalCarbs = useMemo(() => {
    return Math.round(selectedItems.reduce(
      (sum, item) => sum + item.carbsPerServing * item.quantity,
      0
    ) * 10) / 10;
  }, [selectedItems]);

  const totalSodium = useMemo(() => {
    return Math.round(selectedItems.reduce(
      (sum, item) => sum + (item.sodiumPerServing || 0) * item.quantity,
      0
    ));
  }, [selectedItems]);

  const totalWater = useMemo(() => {
    return Math.round(selectedItems.reduce(
      (sum, item) => sum + (item.waterPerServing || 0) * item.quantity,
      0
    ));
  }, [selectedItems]);

  // Calculate per hour rates
  const carbsPerHour = useMemo(() => {
    return segmentTimeHours > 0 ? totalCarbs / segmentTimeHours : 0;
  }, [totalCarbs, segmentTimeHours]);

  const sodiumPerHour = useMemo(() => {
    return segmentTimeHours > 0 ? totalSodium / segmentTimeHours : 0;
  }, [totalSodium, segmentTimeHours]);

  const waterPerHour = useMemo(() => {
    return segmentTimeHours > 0 ? totalWater / segmentTimeHours : 0;
  }, [totalWater, segmentTimeHours]);

  // Calculate carb percentage for use in status functions
  const carbPercentage = useMemo(() => {
    return carbGoalPerHour > 0 ? (carbsPerHour / carbGoalPerHour) * 100 : 0;
  }, [carbsPerHour, carbGoalPerHour]);

  // Use shared utility functions
  const carbStatusColor = getCarbStatusColor(carbPercentage, segmentTimeHours > 0);
  const carbProgressColorClass = getCarbProgressColor(carbPercentage, segmentTimeHours > 0);
  const carbStatusMsg = getCarbStatusMessage(carbPercentage, segmentTimeHours > 0);
  const showCarbWarning = shouldShowCarbWarning(carbPercentage);
  const carbWarningMsg = getCarbWarningMessage(carbPercentage);
  const carbProgressWidth = getCarbProgressWidth(carbPercentage);

  // Sodium status functions (optimal is 80-120%)
  const getSodiumStatusColor = () => {
    if (segmentTimeHours === 0) return "text-gray-400";
    const percentage = (sodiumPerHour / sodiumGoalPerHour) * 100;
    if (percentage < 60 || percentage > 140) return "text-red-400";
    if (percentage < 80 || percentage > 120) return "text-yellow-400";
    return "text-blue-400";
  };

  const getSodiumProgressColor = () => {
    if (segmentTimeHours === 0) return "bg-gray-500";
    const percentage = (sodiumPerHour / sodiumGoalPerHour) * 100;
    if (percentage < 60 || percentage > 140) return "bg-red-500";
    if (percentage < 80 || percentage > 120) return "bg-yellow-500";
    return "bg-blue-500";
  };

  const getSodiumStatusMessage = () => {
    if (segmentTimeHours === 0) return "";
    const percentage = (sodiumPerHour / sodiumGoalPerHour) * 100;
    if (percentage < 60)
      return "Low sodium - Risk of muscle cramps & hyponatremia";
    if (percentage < 80) return "Below optimal sodium intake";
    if (percentage <= 120) return "Optimal sodium intake";
    if (percentage <= 140) return "High sodium - Monitor for thirst";
    return "Excessive sodium - Risk of GI distress";
  };

  // Water status functions (optimal is 80-120%)
  const getWaterStatusColor = () => {
    if (segmentTimeHours === 0) return "text-gray-400";
    const percentage = (waterPerHour / waterGoalPerHour) * 100;
    if (percentage < 60 || percentage > 140) return "text-red-400";
    if (percentage < 80 || percentage > 120) return "text-yellow-400";
    return "text-cyan-400";
  };

  const getWaterProgressColor = () => {
    if (segmentTimeHours === 0) return "bg-gray-500";
    const percentage = (waterPerHour / waterGoalPerHour) * 100;
    if (percentage < 60 || percentage > 140) return "bg-red-500";
    if (percentage < 80 || percentage > 120) return "bg-yellow-500";
    return "bg-cyan-500";
  };

  const getWaterStatusMessage = () => {
    if (segmentTimeHours === 0) return "";
    const percentage = (waterPerHour / waterGoalPerHour) * 100;
    if (percentage < 60) return "Low hydration - Risk of dehydration";
    if (percentage < 80) return "Below optimal hydration";
    if (percentage <= 120) return "Optimal hydration";
    if (percentage <= 140) return "High fluid intake - Monitor sodium balance";
    return "Excessive hydration - Risk of hyponatremia";
  };

  // Add preset product
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
      servingSize: product.servingSize,
      isCustom: false,
      isEditingCarbs: false,
      isEditingSodium: false,
      isEditingWater: false,
    };
    setSelectedItems([...selectedItems, newItem]);

    // Force refresh to update recently used list
    setForceRefresh(prev => prev + 1);
  };

  // Add custom product
  const addCustomProduct = () => {
    if (!customName.trim()) return;

    const newItem: NutritionItem = {
      id: Date.now().toString(),
      productName: customName.trim(),
      quantity: customQty,
      carbsPerServing: parseFloat(customCarbs) || 0,
      sodiumPerServing: parseFloat(customSodium) || 0,
      waterPerServing: parseFloat(customWater) || 0,
      servingSize: customServing.trim() || "serving",
      isCustom: true,
      isEditingCarbs: false,
      isEditingSodium: false,
      isEditingWater: false,
    };

    setSelectedItems([...selectedItems, newItem]);

    // Reset form
    setCustomName("");
    setCustomCarbs("");
    setCustomSodium("");
    setCustomWater("");
    setCustomServing("");
    setCustomQty(1);
    setShowAddCustom(false);
  };

  // Update quantity
  const updateQuantity = (id: string, delta: number) => {
    setSelectedItems((items) =>
      items
        .map((item) =>
          item.id === id
            ? { ...item, quantity: Math.max(0, item.quantity + delta) }
            : item
        )
        .filter((item) => item.quantity > 0)
    );
  };

  // Toggle carb editing
  const toggleEditCarbs = (id: string) => {
    setSelectedItems((items) =>
      items.map((item) =>
        item.id === id
          ? { ...item, isEditingCarbs: !item.isEditingCarbs }
          : item
      )
    );
  };

  // Update carbs per serving
  const updateCarbs = (id: string, newCarbs: number) => {
    setSelectedItems((items) =>
      items.map((item) =>
        item.id === id
          ? { ...item, carbsPerServing: newCarbs, isEditingCarbs: false }
          : item
      )
    );
  };

  // Toggle sodium editing
  const toggleEditSodium = (id: string) => {
    setSelectedItems((items) =>
      items.map((item) =>
        item.id === id
          ? { ...item, isEditingSodium: !item.isEditingSodium }
          : item
      )
    );
  };

  // Update sodium per serving
  const updateSodium = (id: string, newSodium: number) => {
    setSelectedItems((items) =>
      items.map((item) =>
        item.id === id
          ? { ...item, sodiumPerServing: newSodium, isEditingSodium: false }
          : item
      )
    );
  };

  // Toggle water editing
  const toggleEditWater = (id: string) => {
    setSelectedItems((items) =>
      items.map((item) =>
        item.id === id
          ? { ...item, isEditingWater: !item.isEditingWater }
          : item
      )
    );
  };

  // Update water per serving
  const updateWater = (id: string, newWater: number) => {
    setSelectedItems((items) =>
      items.map((item) =>
        item.id === id
          ? { ...item, waterPerServing: newWater, isEditingWater: false }
          : item
      )
    );
  };

  // Remove item
  const removeItem = (id: string) => {
    setSelectedItems((items) => items.filter((item) => item.id !== id));
  };

  const addCrewMember = () => {
    if (newCrewName.trim() && newCrewPhone.trim()) {
      setCrewMembers((prev) => [
        ...prev,
        { name: newCrewName.trim(), phone: newCrewPhone.trim() },
      ]);
      setNewCrewName("");
      setNewCrewPhone("");
    }
  };

  const removeCrewMember = (index: number) => {
    setCrewMembers((prev) => prev.filter((_, i) => i !== index));
  };

  // Validation helpers
  const handleNumberInput = (
    value: string,
    setter: (val: string) => void,
    allowDecimal: boolean = false
  ) => {
    // Remove any non-numeric characters except decimal point if allowed
    const cleaned = allowDecimal
      ? value.replace(/[^\d.]/g, "").replace(/(\..*)\./g, "$1") // Allow only one decimal point
      : value.replace(/\D/g, ""); // Only digits

    // Prevent negative numbers
    if (cleaned === "" || parseFloat(cleaned) >= 0) {
      setter(cleaned);
    }
  };

  /**
   * Handle applying smart nutrition suggestions
   * Adds suggested items to the existing selection (doesn't replace)
   */
  const handleApplySmartSuggestion = (suggestedItems: NutritionItem[]) => {
    const newItems = [...selectedItems];

    for (const item of suggestedItems) {
      // Check if product already exists
      const existingIndex = newItems.findIndex(
        existing => existing.productName === item.productName
      );

      if (existingIndex >= 0) {
        // Update quantity of existing item
        newItems[existingIndex] = {
          ...newItems[existingIndex],
          quantity: newItems[existingIndex].quantity + item.quantity,
        };
      } else {
        // Add new item
        newItems.push(item);
      }

      // Track usage for recently used
      localStorageService.trackProductUsage(item.productName);
    }

    setSelectedItems(newItems);
    setForceRefresh(prev => prev + 1);
  };

  const handleSave = async () => {
    if (!checkpointName || !distanceMiles) return;

    setSubmitting(true);
    try {
      const customPace = customPaceMin
        ? parseInt(customPaceMin) + parseInt(customPaceSec || "0") / 60
        : undefined;

      // Calculate checkpoint time - convert hours, minutes, and seconds to total minutes
      const checkpointTime =
        parseInt(checkpointTimeHrs || "0") * 60 +
        parseInt(checkpointTimeMin || "0") +
        parseInt(checkpointTimeSec || "0") / 60;

      const terrainDescription =
        terrainType === "Custom" ? customTerrain : terrainType;

      // Prepare nutrition data (backward compatible)
      const hasLegacyData = nutritionNotes || supportCrewMeal;
      const legacyNutritionPlan = hasLegacyData
        ? JSON.stringify({
          products: selectedItems.map((item) => item.productName),
          notes: nutritionNotes,
          supportCrewMeal: supportCrewMeal,
        })
        : undefined;

      // Build support crew members JSON
      const crewMembersData =
        crewMembers.length > 0 ? JSON.stringify(crewMembers) : undefined;

      const submitData = {
        checkpoint_name: checkpointName,
        segment_distance_miles: parseFloat(distanceMiles),
        terrain_description: terrainDescription || undefined,
        terrain_factor: terrainFactor !== 1.0 ? terrainFactor : undefined,
        nutrition_plan: legacyNutritionPlan,
        carb_goal_per_hour: carbGoalPerHour,
        sodium_goal_per_hour: sodiumGoalPerHour,
        water_goal_per_hour: waterGoalPerHour,
        segment_nutrition_items: JSON.stringify(selectedItems),
        notes: notes || undefined,
        map_reference: mapReference || undefined,
        ...(customPace !== undefined && {
          custom_pace_min_per_mile: customPace,
        }),
        cutoff_time: cutoffTime || undefined,
        checkpoint_time_minutes: checkpointTime,
        support_crew_present: supportCrewPresent,
        support_crew_names: supportCrewNames || undefined,
        support_crew_members: crewMembersData,
        use_auto_pace: useAutoPace,
      };

      await onSave(submitData);
      onClose();
    } catch (error) {
      console.error("Failed to save checkpoint:", error);
    } finally {
      setSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="bg-white dark:bg-[#2d3548] rounded-xl shadow-2xl border border-gray-200 dark:border-gray-700 w-full max-w-4xl max-h-[90vh] overflow-y-auto m-4">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-gray-200 dark:border-gray-700 sticky top-0 bg-white dark:bg-[#2d3548] z-10">
          <h3 className="text-xl font-bold text-gray-900 dark:text-white">
            Add Checkpoint
          </h3>
          <div className="flex items-center gap-3">
            {/* Distance Unit Toggle */}
            <div className="flex items-center gap-1 bg-gray-100 dark:bg-[#3a4458] rounded-lg p-1">
              <button
                type="button"
                onClick={() => {
                  if (!useMiles) toggleUnit();
                }}
                className={`px-3 py-1.5 rounded transition-all text-sm font-medium ${useMiles
                  ? 'bg-gradient-to-r from-blue-600 to-purple-600 text-white'
                  : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
                  }`}
              >
                Miles
              </button>
              <button
                type="button"
                onClick={() => {
                  if (useMiles) toggleUnit();
                }}
                className={`px-3 py-1.5 rounded transition-all text-sm font-medium ${!useMiles
                  ? 'bg-gradient-to-r from-blue-600 to-purple-600 text-white'
                  : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
                  }`}
              >
                Km
              </button>
            </div>
            <button
              onClick={onClose}
              className="p-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-[#333c52] rounded-lg transition-all"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-5 space-y-5">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                Checkpoint Name
              </label>
              <input
                type="text"
                value={checkpointName}
                onChange={(e) => setCheckpointName(e.target.value)}
                placeholder="e.g., Beech Tree"
                className="w-full px-4 py-2.5 bg-gray-50 dark:bg-[#3a4458] border border-gray-300 dark:border-gray-600 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                Segment Distance ({getDistanceUnitName(useMiles)})
              </label>
              <input
                type="text"
                inputMode="decimal"
                value={distanceMiles}
                onChange={(e) =>
                  handleNumberInput(e.target.value, setDistanceMiles, true)
                }
                placeholder={getDistancePlaceholder(useMiles)}
                className="w-full px-4 py-2.5 bg-gray-50 dark:bg-[#3a4458] border border-gray-300 dark:border-gray-600 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                required
              />
            </div>
          </div>

          {/* Auto-Pace Toggle */}
          {segment.auto_derived_pace && (
            <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-4">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <Zap className="w-5 h-5 text-blue-400" />
                  <span className="text-sm font-semibold text-gray-700 dark:text-gray-300">
                    Pace Mode
                  </span>
                </div>
                <div className="flex items-center gap-3 bg-gray-100 dark:bg-[#3a4458] rounded-lg p-1">
                  <button
                    type="button"
                    onClick={() => setUseAutoPace(false)}
                    className={`px-3 py-1.5 rounded transition-all text-sm font-medium ${!useAutoPace
                      ? 'bg-gradient-to-r from-blue-600 to-purple-600 text-white'
                      : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
                      }`}
                  >
                    Manual
                  </button>
                  <button
                    type="button"
                    onClick={() => setUseAutoPace(true)}
                    className={`px-3 py-1.5 rounded transition-all text-sm font-medium ${useAutoPace
                      ? 'bg-gradient-to-r from-blue-600 to-purple-600 text-white'
                      : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
                      }`}
                  >
                    Auto-Derived
                  </button>
                </div>
              </div>

              {useAutoPace && paceOptions && (
                <div className="mt-3 space-y-3">
                  {/* Reasoning header */}
                  {segment.auto_pace_reasoning && (
                    <p className="text-xs text-gray-400 italic px-1">📊 {segment.auto_pace_reasoning}</p>
                  )}

                  {/* Three-tier pace selection cards */}
                  <div className="grid grid-cols-1 gap-2">
                    {paceOptions.map((option) => {
                      const isSelected = selectedPaceTier === option.tier;
                      const tierConfig = {
                        aggressive: {
                          icon: '🔥',
                          label: 'AGGRESSIVE',
                          borderColor: 'border-orange-500',
                          bgColor: 'bg-orange-500/20',
                          textColor: 'text-orange-400',
                          selectedBg: 'bg-orange-500/30',
                        },
                        balanced: {
                          icon: '⚡',
                          label: 'BALANCED',
                          borderColor: 'border-green-500',
                          bgColor: 'bg-green-500/20',
                          textColor: 'text-green-400',
                          selectedBg: 'bg-green-500/30',
                        },
                        conservative: {
                          icon: '🛡️',
                          label: 'CONSERVATIVE',
                          borderColor: 'border-blue-500',
                          bgColor: 'bg-blue-500/20',
                          textColor: 'text-blue-400',
                          selectedBg: 'bg-blue-500/30',
                        },
                      };
                      const config = tierConfig[option.tier];

                      const paceMin = Math.floor(option.paceMinPerMile);
                      const paceSec = Math.round((option.paceMinPerMile - paceMin) * 60);
                      const paceStr = `${paceMin}:${String(paceSec).padStart(2, '0')}`;

                      return (
                        <button
                          key={option.tier}
                          type="button"
                          onClick={() => setSelectedPaceTier(option.tier)}
                          className={`w-full p-3 rounded-lg border-2 transition-all text-left ${isSelected
                            ? `${config.borderColor} ${config.selectedBg} coloursplash:border-splash-azure coloursplash:bg-splash-azure coloursplash:text-white`
                            : 'border-gray-600 hover:border-gray-500 bg-gray-800/30 coloursplash:bg-white coloursplash:border-splash-border coloursplash:hover:border-splash-azure/50'
                            }`}
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <span className="text-lg">{config.icon}</span>
                              <span className={`text-sm font-bold ${config.textColor} ${isSelected ? 'coloursplash:text-white' : 'coloursplash:text-splash-text-primary'}`}>
                                {config.label}
                              </span>
                              {isSelected && (
                                <span className="text-green-400 coloursplash:text-white text-xs">✓ Selected</span>
                              )}
                            </div>
                            <div className="flex items-center gap-3">
                              <span className={`text-lg font-bold text-white ${isSelected ? 'coloursplash:text-white' : 'coloursplash:text-splash-text-primary'}`}>
                                {paceStr} <span className={`text-sm font-medium text-gray-400 ${isSelected ? 'coloursplash:text-white/80' : 'coloursplash:text-splash-text-secondary'}`}>{getPaceUnit(useMiles)}</span>
                              </span>
                              <span className={`text-xs font-medium px-2 py-0.5 rounded ${option.confidence === 'high' ? 'bg-green-500/30 text-green-400 coloursplash:bg-splash-green coloursplash:text-white' :
                                option.confidence === 'medium' ? 'bg-yellow-500/30 text-yellow-400 coloursplash:bg-yellow-500 coloursplash:text-white' :
                                  'bg-orange-500/30 text-orange-400 coloursplash:bg-splash-orange coloursplash:text-white'
                                }`}>
                                {option.confidence.toUpperCase()}
                              </span>
                            </div>
                          </div>
                          <div className={`mt-1.5 text-xs text-gray-400 ${isSelected ? 'coloursplash:text-white/90' : 'coloursplash:text-splash-text-secondary'}`}>
                            {option.description}
                          </div>
                          <div className={`mt-0.5 text-xs text-gray-500 ${isSelected ? 'coloursplash:text-white/75' : 'coloursplash:text-splash-text-secondary'}`}>
                            Best for: {option.bestFor}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          )}

          <div>
            <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
              {useAutoPace ? 'Expected Pace (Auto-Derived)' : 'Expected Pace For This Segment'}
            </label>

            <div className="flex gap-3 max-w-md">
              <div className="flex-1">
                <input
                  type="text"
                  inputMode="numeric"
                  value={customPaceMin}
                  onChange={(e) =>
                    handleNumberInput(e.target.value, setCustomPaceMin, false)
                  }
                  placeholder="9"
                  className="w-full px-4 py-2.5 bg-gray-50 dark:bg-[#3a4458] border border-gray-300 dark:border-gray-600 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                />
                <div className="text-xs text-gray-600 dark:text-gray-400 mt-1 text-center">
                  minutes
                </div>
              </div>
              <div className="flex items-center text-2xl font-bold text-gray-400 dark:text-gray-500 pt-2">
                :
              </div>
              <div className="flex-1">
                <input
                  type="text"
                  inputMode="numeric"
                  value={customPaceSec}
                  onChange={(e) =>
                    handleNumberInput(e.target.value, setCustomPaceSec, false)
                  }
                  placeholder="30"
                  className="w-full px-4 py-2.5 bg-gray-50 dark:bg-[#3a4458] border border-gray-300 dark:border-gray-600 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                />
                <div className="text-xs text-gray-600 dark:text-gray-400 mt-1 text-center">
                  seconds
                </div>
              </div>
              <div className="flex items-center text-gray-600 dark:text-gray-400 pt-2">
                <span className="text-sm">{getPaceUnit(useMiles)}</span>
              </div>
            </div>
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
              Cut Off Time
            </label>
            <input
              type="time"
              value={cutoffTime}
              onChange={(e) => setCutoffTime(e.target.value)}
              className="w-full max-w-md px-4 py-2.5 bg-gray-50 dark:bg-[#3a4458] border border-gray-300 dark:border-gray-600 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
              Est. Time at Checkpoint
            </label>

            <div className="flex gap-3 max-w-md">
              <div className="flex-1">
                <input
                  type="text"
                  inputMode="numeric"
                  value={checkpointTimeHrs}
                  onChange={(e) =>
                    handleNumberInput(
                      e.target.value,
                      setCheckpointTimeHrs,
                      false
                    )
                  }
                  placeholder="0"
                  className="w-full px-4 py-2.5 bg-gray-50 dark:bg-[#3a4458] border border-gray-300 dark:border-gray-600 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                />
                <div className="text-xs text-gray-600 dark:text-gray-400 mt-1 text-center">
                  hours
                </div>
              </div>
              <div className="flex items-center text-2xl font-bold text-gray-400 dark:text-gray-500 pt-2">
                :
              </div>
              <div className="flex-1">
                <input
                  type="text"
                  inputMode="numeric"
                  value={checkpointTimeMin}
                  onChange={(e) =>
                    handleNumberInput(
                      e.target.value,
                      setCheckpointTimeMin,
                      false
                    )
                  }
                  placeholder="5"
                  className="w-full px-4 py-2.5 bg-gray-50 dark:bg-[#3a4458] border border-gray-300 dark:border-gray-600 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                />
                <div className="text-xs text-gray-600 dark:text-gray-400 mt-1 text-center">
                  minutes
                </div>
              </div>
              <div className="flex items-center text-2xl font-bold text-gray-400 dark:text-gray-500 pt-2">
                :
              </div>
              <div className="flex-1">
                <input
                  type="text"
                  inputMode="numeric"
                  value={checkpointTimeSec}
                  onChange={(e) =>
                    handleNumberInput(
                      e.target.value,
                      setCheckpointTimeSec,
                      false
                    )
                  }
                  placeholder="0"
                  className="w-full px-4 py-2.5 bg-gray-50 dark:bg-[#3a4458] border border-gray-300 dark:border-gray-600 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                />
                <div className="text-xs text-gray-600 dark:text-gray-400 mt-1 text-center">
                  seconds
                </div>
              </div>
            </div>
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
              Terrain Type
            </label>
            <select
              value={terrainType}
              onChange={(e) => setTerrainType(e.target.value)}
              className="w-full px-4 py-2.5 bg-gray-50 dark:bg-[#3a4458] border border-gray-300 dark:border-gray-600 text-gray-900 dark:text-white rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
            >
              <option value="">Select terrain type</option>
              <option value="Road/Pavement">Road/Pavement</option>
              <option value="Trail/Single track">Trail/Single track</option>
              <option value="Field Paths/Woodlands">
                Field Paths/Woodlands
              </option>
              <option value="Rough & Rocky">Rough & Rocky</option>
              <option value="Rocky/Slippery">Rocky/Slippery</option>
              <option value="Undulating Paths">Undulating Paths</option>
              <option value="Open Moorland">Open Moorland</option>
              <option value="Forest Tracks">Forest Tracks</option>
              <option value="Rocky & Rough Upland Path">
                Rocky & Rough Upland Path
              </option>
              <option value="Exposed Tree Roots">Exposed Tree Roots</option>
              <option value="Undulating Hills/Short, Steep Climbs">
                Undulating Hills/Short, Steep Climbs
              </option>
              <option value="Caution: Technical Terrain Ahead!">
                Caution: Technical Terrain Ahead!
              </option>
              <option value="Rugged & Rocky Ground">
                Rugged & Rocky Ground
              </option>
              <option value="Rocky/Technical">Rocky/Technical</option>
              <option value="Muddy/Boggy">Muddy/Boggy</option>
              <option value="Sandy">Sandy</option>
              <option value="Gravel">Gravel</option>
              <option value="Steep climb/ascent">Steep climb/ascent</option>
              <option value="Steep descent">Steep descent</option>
              <option value="Rolling hills">Rolling hills</option>
              <option value="Flat">Flat</option>
              <option value="Snow/Ice">Snow/Ice</option>
              <option value="River crossing">River crossing</option>
              <option value="Scree/Loose rock">Scree/Loose rock</option>
              <option value="Custom">Custom (describe below)</option>
            </select>

            {terrainType === "Custom" && (
              <div className="mt-3">
                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                  Custom Terrain Description
                </label>
                <textarea
                  value={customTerrain}
                  onChange={(e) => setCustomTerrain(e.target.value)}
                  placeholder="e.g., Gentle rolling, good paths"
                  rows={2}
                  className="w-full px-4 py-2.5 bg-gray-50 dark:bg-[#3a4458] border border-gray-300 dark:border-gray-600 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all resize-none"
                />
              </div>
            )}

            {/* Terrain Factor Slider */}
            <div className="mt-4">
              <TerrainFactorSlider
                value={terrainFactor}
                onChange={setTerrainFactor}
                terrainDescription={terrainType === "Custom" ? customTerrain : terrainType}
              />
            </div>
          </div>

          {/* Nutrition Plan */}
          <div className="space-y-4 border-t border-gray-200 dark:border-gray-700 pt-4">
            <h4 className="text-lg font-semibold text-gray-900 dark:text-white">
              Nutrition Plan
            </h4>

            {/* Goals Section - 3 columns like NutritionEditModal */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Carb Goal */}
              <div>
                <label className="block text-sm font-semibold text-green-600 dark:text-green-400 mb-2">
                  Carb Goal (g/hour)
                </label>
                <input
                  type="number"
                  value={carbGoalPerHour}
                  onChange={(e) =>
                    setCarbGoalPerHour(parseInt(e.target.value) || 60)
                  }
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
                  onChange={(e) =>
                    setSodiumGoalPerHour(parseInt(e.target.value) || 300)
                  }
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
                  onChange={(e) =>
                    setWaterGoalPerHour(parseInt(e.target.value) || 500)
                  }
                  min="0"
                  max="1500"
                  className="w-full px-4 py-2 bg-white dark:bg-[#3a4458] border border-gray-300 dark:border-gray-600 text-gray-900 dark:text-white rounded-lg focus:ring-2 focus:ring-cyan-500 focus:border-transparent transition-all"
                />
                <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">
                  Target: 400-800ml/hr typical
                </p>
              </div>
            </div>

            {/* Smart Fill Button - only show when segment has calculated time */}
            {segmentTimeHours > 0 && (
              <div className="mt-4">
                <button
                  type="button"
                  onClick={() => setShowSmartSuggest(true)}
                  className="flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700 text-white rounded-lg transition-all shadow-md hover:shadow-lg group"
                >
                  <Sparkles className="w-4 h-4 group-hover:animate-pulse" />
                  <span className="font-semibold">Smart Fill</span>
                  <span className="text-amber-100 text-sm">
                    ({Math.round(carbGoalPerHour * segmentTimeHours)}g carbs needed)
                  </span>
                </button>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1.5">
                  Auto-suggest optimal nutrition based on your targets
                </p>
              </div>
            )}

            {/* Segment Summary with Three Progress Bars */}
            {segmentTimeHours > 0 && (
              <div className="bg-gray-50 dark:bg-[#3a4458] rounded-lg p-4 border border-gray-200 dark:border-gray-700">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <div className="text-xs text-gray-600 dark:text-gray-400 mb-1">
                      Segment Time
                    </div>
                    <div className="text-lg font-bold text-gray-900 dark:text-white">
                      {Math.floor(segmentTimeHours)}h{" "}
                      {Math.round((segmentTimeHours % 1) * 60)}m
                    </div>
                  </div>
                  <div className="grid grid-cols-3 gap-4 text-center">
                    <div>
                      <div className="text-xs text-gray-600 dark:text-gray-400 mb-1">
                        Target Carbs
                      </div>
                      <div className="text-lg font-bold text-green-600 dark:text-green-400">
                        {Math.round(carbGoalPerHour * segmentTimeHours)}g
                      </div>
                    </div>
                    <div>
                      <div className="text-xs text-gray-600 dark:text-gray-400 mb-1">
                        Target Sodium
                      </div>
                      <div className="text-lg font-bold text-blue-600 dark:text-blue-400">
                        {Math.round(sodiumGoalPerHour * segmentTimeHours)}mg
                      </div>
                    </div>
                    <div>
                      <div className="text-xs text-gray-600 dark:text-gray-400 mb-1">
                        Target Water
                      </div>
                      <div className="text-lg font-bold text-cyan-600 dark:text-cyan-400">
                        {Math.round(waterGoalPerHour * segmentTimeHours)}ml
                      </div>
                    </div>
                  </div>
                </div>

                {/* Carbs Progress Bar */}
                <div className="mb-4">
                  <div className="flex justify-between text-xs mb-1">
                    <span className="text-green-600 dark:text-green-400 font-medium">
                      Carbs
                    </span>
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
                    <span className="text-blue-600 dark:text-blue-400 font-medium">
                      Sodium
                    </span>
                    <span className={`font-bold ${getSodiumStatusColor()}`}>
                      {Math.round(sodiumPerHour)}mg/hr of {sodiumGoalPerHour}
                      mg/hr
                    </span>
                  </div>
                  <div className="w-full bg-gray-300 dark:bg-gray-700 rounded-full h-3 overflow-hidden">
                    <div
                      className={`h-full transition-all duration-300 ${getSodiumProgressColor()}`}
                      style={{
                        width: `${Math.min(
                          (sodiumPerHour / sodiumGoalPerHour) * 100,
                          100
                        )}%`,
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
                    <span className="text-cyan-600 dark:text-cyan-400 font-medium">
                      Water
                    </span>
                    <span className={`font-bold ${getWaterStatusColor()}`}>
                      {Math.round(waterPerHour)}ml/hr of {waterGoalPerHour}ml/hr
                    </span>
                  </div>
                  <div className="w-full bg-gray-300 dark:bg-gray-700 rounded-full h-3 overflow-hidden">
                    <div
                      className={`h-full transition-all duration-300 ${getWaterProgressColor()}`}
                      style={{
                        width: `${Math.min(
                          (waterPerHour / waterGoalPerHour) * 100,
                          100
                        )}%`,
                      }}
                    />
                  </div>
                  <div className={`text-xs mt-1 ${getWaterStatusColor()}`}>
                    {getWaterStatusMessage()}
                  </div>
                </div>
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
                {showGuidelines ? (
                  <ChevronUp className="w-4 h-4" />
                ) : (
                  <ChevronDown className="w-4 h-4" />
                )}
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
                        <h5 className="text-xs font-medium text-red-600 dark:text-red-400">
                          Hyponatremia Risk
                        </h5>
                        <ul className="text-xs text-gray-600 dark:text-gray-300 space-y-0.5">
                          <li>Excessive water without sodium</li>
                          <li>Symptoms: nausea, headache, confusion</li>
                          <li>Prevention: balance water with sodium</li>
                        </ul>
                      </div>
                      <div>
                        <h5 className="text-xs font-medium text-orange-600 dark:text-orange-400">
                          Dehydration Risk
                        </h5>
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
                <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">
                  Selected Products
                </h4>
                <div className="space-y-3">
                  {selectedItems.map((item) => (
                    <div
                      key={item.id}
                      className="bg-gray-50 dark:bg-[#3a4458] rounded-lg p-4 border border-gray-200 dark:border-gray-600"
                    >
                      {/* Header with Product Name and Remove Button */}
                      <div className="flex items-center justify-between mb-3">
                        <div>
                          <div className="text-gray-900 dark:text-white font-semibold text-base">
                            {item.productName}
                          </div>
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
                        <span className="text-sm text-gray-600 dark:text-gray-400 font-medium">
                          Quantity:
                        </span>
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
                          <div className="text-xs text-green-600 dark:text-green-400 font-medium mb-1">
                            Carbs
                          </div>
                          <div className="flex items-center gap-1">
                            {item.isEditingCarbs ? (
                              <>
                                <input
                                  type="number"
                                  step="1"
                                  defaultValue={item.carbsPerServing}
                                  onBlur={(e) =>
                                    updateCarbs(
                                      item.id,
                                      parseFloat(e.target.value) || 0
                                    )
                                  }
                                  onKeyDown={(e) => {
                                    if (e.key === "Enter") {
                                      updateCarbs(
                                        item.id,
                                        parseFloat(
                                          (e.target as HTMLInputElement).value
                                        ) || 0
                                      );
                                    }
                                  }}
                                  className="w-14 px-2 py-1 bg-white dark:bg-[#2d3548] border border-green-500 text-gray-900 dark:text-white rounded text-sm"
                                  autoFocus
                                />
                                <span className="text-xs text-green-600 dark:text-green-400">
                                  g
                                </span>
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
                            x{item.quantity} ={" "}
                            {item.carbsPerServing * item.quantity}g
                          </div>
                        </div>

                        {/* Sodium */}
                        <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-2 border border-blue-200 dark:border-blue-800">
                          <div className="text-xs text-blue-600 dark:text-blue-400 font-medium mb-1">
                            Sodium
                          </div>
                          <div className="flex items-center gap-1">
                            {item.isEditingSodium ? (
                              <>
                                <input
                                  type="number"
                                  step="1"
                                  defaultValue={item.sodiumPerServing}
                                  onBlur={(e) =>
                                    updateSodium(
                                      item.id,
                                      parseFloat(e.target.value) || 0
                                    )
                                  }
                                  onKeyDown={(e) => {
                                    if (e.key === "Enter") {
                                      updateSodium(
                                        item.id,
                                        parseFloat(
                                          (e.target as HTMLInputElement).value
                                        ) || 0
                                      );
                                    }
                                  }}
                                  className="w-14 px-2 py-1 bg-white dark:bg-[#2d3548] border border-blue-500 text-gray-900 dark:text-white rounded text-sm"
                                  autoFocus
                                />
                                <span className="text-xs text-blue-600 dark:text-blue-400">
                                  mg
                                </span>
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
                            x{item.quantity} ={" "}
                            {item.sodiumPerServing * item.quantity}mg
                          </div>
                        </div>

                        {/* Water */}
                        <div className="bg-cyan-50 dark:bg-cyan-900/20 rounded-lg p-2 border border-cyan-200 dark:border-cyan-800">
                          <div className="text-xs text-cyan-600 dark:text-cyan-400 font-medium mb-1">
                            Water
                          </div>
                          <div className="flex items-center gap-1">
                            {item.isEditingWater ? (
                              <>
                                <input
                                  type="number"
                                  step="1"
                                  defaultValue={item.waterPerServing}
                                  onBlur={(e) =>
                                    updateWater(
                                      item.id,
                                      parseFloat(e.target.value) || 0
                                    )
                                  }
                                  onKeyDown={(e) => {
                                    if (e.key === "Enter") {
                                      updateWater(
                                        item.id,
                                        parseFloat(
                                          (e.target as HTMLInputElement).value
                                        ) || 0
                                      );
                                    }
                                  }}
                                  className="w-14 px-2 py-1 bg-white dark:bg-[#2d3548] border border-cyan-500 text-gray-900 dark:text-white rounded text-sm"
                                  autoFocus
                                />
                                <span className="text-xs text-cyan-600 dark:text-cyan-400">
                                  ml
                                </span>
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
                            x{item.quantity} ={" "}
                            {item.waterPerServing * item.quantity}ml
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
                  <h4 className="text-sm font-semibold text-orange-500 dark:text-orange-400 mb-3">
                    Add Custom Product
                  </h4>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mb-3">
                    <div className="col-span-2 md:col-span-1">
                      <label className="block text-xs text-gray-600 dark:text-gray-400 mb-1">
                        Product Name
                      </label>
                      <input
                        type="text"
                        value={customName}
                        onChange={(e) => setCustomName(e.target.value)}
                        placeholder="e.g., Energy bar"
                        className="w-full px-3 py-2 bg-white dark:bg-[#2d3548] border border-gray-300 dark:border-gray-600 text-gray-900 dark:text-white rounded text-sm focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-green-600 dark:text-green-400 mb-1">
                        Carbs (g)
                      </label>
                      <input
                        type="number"
                        value={customCarbs}
                        onChange={(e) => setCustomCarbs(e.target.value)}
                        placeholder="40"
                        className="w-full px-3 py-2 bg-white dark:bg-[#2d3548] border border-gray-300 dark:border-gray-600 text-gray-900 dark:text-white rounded text-sm focus:ring-2 focus:ring-green-500 focus:border-transparent"
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-blue-600 dark:text-blue-400 mb-1">
                        Sodium (mg)
                      </label>
                      <input
                        type="number"
                        value={customSodium}
                        onChange={(e) => setCustomSodium(e.target.value)}
                        placeholder="200"
                        className="w-full px-3 py-2 bg-white dark:bg-[#2d3548] border border-gray-300 dark:border-gray-600 text-gray-900 dark:text-white rounded text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-cyan-600 dark:text-cyan-400 mb-1">
                        Water (ml)
                      </label>
                      <input
                        type="number"
                        value={customWater}
                        onChange={(e) => setCustomWater(e.target.value)}
                        placeholder="0"
                        className="w-full px-3 py-2 bg-white dark:bg-[#2d3548] border border-gray-300 dark:border-gray-600 text-gray-900 dark:text-white rounded text-sm focus:ring-2 focus:ring-cyan-500 focus:border-transparent"
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-gray-600 dark:text-gray-400 mb-1">
                        Serving Size
                      </label>
                      <input
                        type="text"
                        value={customServing}
                        onChange={(e) => setCustomServing(e.target.value)}
                        placeholder="bar, scoop"
                        className="w-full px-3 py-2 bg-white dark:bg-[#2d3548] border border-gray-300 dark:border-gray-600 text-gray-900 dark:text-white rounded text-sm focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-gray-600 dark:text-gray-400 mb-1">
                        Quantity
                      </label>
                      <input
                        type="number"
                        value={customQty}
                        onChange={(e) =>
                          setCustomQty(parseInt(e.target.value) || 1)
                        }
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
              showManageButton={false}
              maxHeight="max-h-64"
              columns={3}
            />

            <div>
              <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                Additional Notes
              </label>
              <textarea
                value={nutritionNotes}
                onChange={(e) => setNutritionNotes(e.target.value)}
                placeholder="Additional nutrition notes"
                rows={2}
                className="w-full px-4 py-2.5 bg-gray-50 dark:bg-[#3a4458] border border-gray-300 dark:border-gray-600 text-gray-900 dark:text-white rounded-lg resize-none"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                Support Crew Meal Request
              </label>
              <input
                type="text"
                value={supportCrewMeal}
                onChange={(e) => setSupportCrewMeal(e.target.value)}
                placeholder="e.g., Hot soup"
                className="w-full px-4 py-2.5 bg-gray-50 dark:bg-[#3a4458] border border-gray-300 dark:border-gray-600 text-gray-900 dark:text-white rounded-lg"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
              Notes
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="General notes"
              rows={2}
              className="w-full px-4 py-2.5 bg-gray-50 dark:bg-[#3a4458] border border-gray-300 dark:border-gray-600 text-gray-900 dark:text-white rounded-lg resize-none"
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
              Map Reference
            </label>
            <input
              type="text"
              value={mapReference}
              onChange={(e) => setMapReference(e.target.value)}
              placeholder="what3words or grid ref"
              className="w-full px-4 py-2.5 bg-gray-50 dark:bg-[#3a4458] border border-gray-300 dark:border-gray-600 text-gray-900 dark:text-white rounded-lg"
            />
          </div>

          {/* Support Crew */}
          <div className="space-y-4 border-t border-gray-200 dark:border-gray-700 pt-4">
            <div className="flex items-center justify-between">
              <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300">
                Support Crew
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={supportCrewPresent}
                  onChange={(e) => setSupportCrewPresent(e.target.checked)}
                  className="w-4 h-4 text-purple-600 bg-gray-100 dark:bg-[#3a4458] border-gray-300 dark:border-gray-600 rounded"
                />
                <span className="text-sm text-gray-600 dark:text-gray-400">
                  Support crew present
                </span>
              </label>
            </div>

            {supportCrewPresent && (
              <div className="space-y-4">
                <div className="bg-gray-100 dark:bg-[#3a4458] rounded-lg p-4 border border-gray-200 dark:border-gray-600">
                  <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">
                    Add Crew Member
                  </label>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="flex items-center gap-2">
                      <User className="w-4 h-4 text-gray-600 dark:text-gray-400" />
                      <input
                        type="text"
                        value={newCrewName}
                        onChange={(e) => setNewCrewName(e.target.value)}
                        placeholder="Name"
                        className="flex-1 px-3 py-2 bg-white dark:bg-[#2d3548] border border-gray-300 dark:border-gray-600 text-gray-900 dark:text-white rounded-lg text-sm"
                      />
                    </div>
                    <div className="flex items-center gap-2">
                      <Phone className="w-4 h-4 text-gray-600 dark:text-gray-400" />
                      <input
                        type="tel"
                        value={newCrewPhone}
                        onChange={(e) => setNewCrewPhone(e.target.value)}
                        placeholder="Phone"
                        className="flex-1 px-3 py-2 bg-white dark:bg-[#2d3548] border border-gray-300 dark:border-gray-600 text-gray-900 dark:text-white rounded-lg text-sm"
                      />
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={addCrewMember}
                    disabled={!newCrewName.trim() || !newCrewPhone.trim()}
                    className="mt-3 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50 text-sm"
                  >
                    <Plus className="w-4 h-4 inline-block mr-1" />
                    Add Member
                  </button>
                </div>

                {crewMembers.length > 0 && (
                  <div className="space-y-2">
                    {crewMembers.map((member, index) => (
                      <div
                        key={index}
                        className="flex items-center justify-between px-4 py-3 bg-purple-500/10 border border-purple-500/30 rounded-lg"
                      >
                        <div className="flex items-center gap-4">
                          <span className="text-gray-900 dark:text-white font-medium">
                            {member.name}
                          </span>
                          <span className="text-gray-700 dark:text-gray-300">
                            {member.phone}
                          </span>
                        </div>
                        <button
                          type="button"
                          onClick={() => removeCrewMember(index)}
                          className="p-1.5 text-purple-400 hover:text-purple-300 rounded-lg"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 p-5 border-t border-gray-200 dark:border-gray-700 sticky bottom-0 bg-white dark:bg-[#2d3548]">
          <button
            onClick={onClose}
            disabled={submitting}
            className="px-6 py-2.5 bg-gray-200 dark:bg-gray-600 text-gray-900 dark:text-white font-semibold rounded-lg hover:bg-gray-300 dark:hover:bg-gray-500 transition-all"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={submitting || !checkpointName || !distanceMiles}
            className="px-6 py-2.5 bg-gradient-to-r from-green-500 to-emerald-600 text-white font-semibold rounded-lg hover:from-green-600 hover:to-emerald-700 disabled:opacity-50 transition-all shadow-lg"
          >
            {submitting ? "Saving..." : "Save Changes"}
          </button>
        </div>
      </div>

      {/* Smart Nutrition Suggestions Modal */}
      <SmartNutritionModal
        isOpen={showSmartSuggest}
        onClose={() => setShowSmartSuggest(false)}
        onApply={handleApplySmartSuggestion}
        availableProducts={allProducts}
        recentlyUsedNames={recentlyUsedProductNames}
        segmentTimeMinutes={segmentTimeHours * 60}
        carbGoalPerHour={carbGoalPerHour}
        sodiumGoalPerHour={sodiumGoalPerHour}
        waterGoalPerHour={waterGoalPerHour}
        existingItems={selectedItems}
      />
    </div>
  );
}
