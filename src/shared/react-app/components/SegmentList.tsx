import { useState, useEffect, useMemo } from "react";
import {
  Trash2,
  MapPin,
  Edit2,
  Save,
  X,
  User,
  Phone,
  Clock,
  Sun,
  Moon,
  TrendingUp,
  TrendingDown,
  Activity,
  ChevronDown,
  ChevronUp,
  ArrowUpDown,
  AlertTriangle,
  Ruler,
} from "lucide-react";
import type { Segment, SupportCrewMember, NutritionItem, ParsedFITData, SegmentComparisonData } from "@/shared/types";
import { calculateSegmentETA } from "@/react-app/utils/etaCalculations";
import WeatherIcon from "@/react-app/components/WeatherIcon";
import NutritionEditModal from "@/react-app/components/NutritionEditModal";
import CheckpointEditModal from "@/react-app/components/CheckpointEditModal";
import { AutoPaceIndicator } from "@/react-app/components/AutoPaceIndicator";
import { useUnit } from "../contexts/UnitContext";
import { formatDistance, formatPace, getPaceUnit } from "../utils/unitConversions";
import { calculateSegmentElevation, formatElevation, getElevationIcon, type ElevationStats } from "../utils/elevationCalculations";
import { localStorageService } from "../services/localStorage";
import {
  CARB_THRESHOLDS,
  getCarbStatusColor,
  getCarbProgressColor,
  shouldShowCarbWarning,
  isCarbDanger,
  getCarbWarningMessage,
  getCarbProgressWidth,
} from "../utils/nutritionThresholds";
import DescentWarningBadge from './DescentWarningBadge';

interface SegmentListProps {
  segments: Segment[];
  onDelete: (id: number) => void;
  onUpdate: (
    id: number,
    data: {
      checkpoint_name?: string;
      segment_distance_miles?: number;
      terrain_description?: string;
      custom_pace_min_per_mile?: number | null;
      notes?: string;
      nutrition_plan?: string;
      carb_goal_per_hour?: number;
      sodium_goal_per_hour?: number;
      water_goal_per_hour?: number;
      segment_nutrition_items?: string;
      map_reference?: string;
      cutoff_time?: string;
      checkpoint_time_minutes?: number;
      support_crew_present?: boolean;
      support_crew_names?: string;
      support_crew_members?: string;
    }
  ) => Promise<void>;
  emergencyContactName?: string | null;
  emergencyContactPhone?: string | null;
  onEditEmergencyContact?: () => void;
  raceStartTime?: string | null;
  timezone?: string | null;
  fitComparisonData?: ParsedFITData | null;
}

export default function SegmentList({
  segments,
  onDelete,
  onUpdate,
  emergencyContactName,
  emergencyContactPhone,
  onEditEmergencyContact,
  raceStartTime,
  fitComparisonData,
}: SegmentListProps) {
  const { useMiles } = useUnit();
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editPaceMin, setEditPaceMin] = useState("");
  const [editPaceSec, setEditPaceSec] = useState("");
  const [editingNotesId, setEditingNotesId] = useState<number | null>(null);
  const [editNotes, setEditNotes] = useState("");
  const [editingNutritionSegment, setEditingNutritionSegment] = useState<Segment | null>(null);
  const [editingMapRefId, setEditingMapRefId] = useState<number | null>(null);
  const [editMapRef, setEditMapRef] = useState("");
  const [mapMenuOpen, setMapMenuOpen] = useState<number | null>(null);
  const [gpxContent, setGpxContent] = useState<string | null>(null);
  const [showComparisonMap, setShowComparisonMap] = useState<Record<number, boolean>>({});
  const [editingCheckpoint, setEditingCheckpoint] = useState<Segment | null>(null);
  const [reverseOrder, setReverseOrder] = useState<boolean>(() => {
    const saved = localStorage.getItem('checkpoint_display_order_reversed');
    return saved === 'true';
  });
  const [showInterSegmentDistances, setShowInterSegmentDistances] = useState<boolean>(() => {
    const saved = localStorage.getItem('show_inter_segment_distances');
    return saved === 'true';
  });

  // Load GPX file if available
  useEffect(() => {
    const loadGPX = async () => {
      if (segments.length > 0) {
        const raceId = segments[0].race_id;
        const race = localStorageService.getRace(raceId);

        if (race?.gpx_file_key) {
          const gpxFile = localStorageService.getGPXFile(race.gpx_file_key);
          if (gpxFile) {
            setGpxContent(gpxFile.content);
          }
        }
      }
    };

    loadGPX();
  }, [segments]);

  // Calculate elevation for all segments with memoization
  const segmentElevations = useMemo(() => {
    if (!gpxContent) return new Map<number, ElevationStats | null>();

    const elevations = new Map<number, ElevationStats | null>();

    segments.forEach((segment, index) => {
      if (index === 0) {
        // First segment: calculate from start to first checkpoint
        const stats = calculateSegmentElevation(
          gpxContent,
          0,
          segment.cumulative_distance_miles
        );
        elevations.set(segment.id!, stats);
      } else {
        const stats = calculateSegmentElevation(
          gpxContent,
          segments[index - 1].cumulative_distance_miles,
          segment.cumulative_distance_miles
        );
        elevations.set(segment.id!, stats);
      }
    });

    return elevations;
  }, [gpxContent, segments]);

  // Calculate FIT comparison data for each segment
  const segmentComparisons = useMemo(() => {
    if (!fitComparisonData || !fitComparisonData.records || fitComparisonData.records.length === 0) {
      return new Map<number, SegmentComparisonData>();
    }

    const comparisons = new Map<number, SegmentComparisonData>();

    segments.forEach((segment, index) => {
      // Calculate segment start and end distances
      const segmentStart = segments
        .slice(0, index)
        .reduce((sum, s) => sum + s.segment_distance_miles, 0);
      const segmentEnd = segmentStart + segment.segment_distance_miles;

      // Filter FIT records within segment distance range (±0.1 mile tolerance)
      const matchingRecords = fitComparisonData.records.filter(r =>
        r.distance >= segmentStart - 0.1 &&
        r.distance <= segmentEnd + 0.1
      );

      if (matchingRecords.length === 0) {
        comparisons.set(segment.id!, { segmentIndex: index, distanceMatch: false });
        return;
      }

      // Calculate average HR
      const recordsWithHR = matchingRecords.filter(r => r.heartRate !== undefined);
      const avgHR = recordsWithHR.length > 0
        ? recordsWithHR.reduce((sum, r) => sum + r.heartRate!, 0) / recordsWithHR.length
        : undefined;

      // Calculate average pace from speed data
      const recordsWithSpeed = matchingRecords.filter(r => r.speed !== undefined && r.speed > 0);
      let avgPace: number | undefined;
      if (recordsWithSpeed.length > 0) {
        // Convert speed (mph) to pace (min/mile)
        const avgSpeed = recordsWithSpeed.reduce((sum, r) => sum + r.speed!, 0) / recordsWithSpeed.length;
        avgPace = 60 / avgSpeed; // min/mile
      }

      // Calculate pace variance if we have planned pace
      let comparisonMetrics;
      if (segment.custom_pace_min_per_mile && avgPace) {
        const paceVariance = ((avgPace - segment.custom_pace_min_per_mile) / segment.custom_pace_min_per_mile) * 100;
        comparisonMetrics = { paceVariance };
      }

      comparisons.set(segment.id!, {
        segmentIndex: index,
        previousAvgHR: avgHR ? Math.round(avgHR) : undefined,
        previousAvgPace: avgPace,
        plannedPace: segment.custom_pace_min_per_mile || undefined,
        distanceMatch: true,
        comparisonMetrics
      });
    });

    return comparisons;
  }, [fitComparisonData, segments]);

  const formatTime = (minutes: number | null) => {
    if (!minutes) return "--:--";
    const hours = Math.floor(minutes / 60);
    const remainingMinutes = minutes % 60;
    const mins = Math.floor(remainingMinutes);
    const secs = Math.round((remainingMinutes - mins) * 60);

    if (hours > 0) {
      if (secs > 0) {
        return `${hours}:${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
      }
      return `${hours}:${mins.toString().padStart(2, "0")}`;
    }

    if (secs > 0) {
      return `${mins}:${secs.toString().padStart(2, "0")}`;
    }
    return `${mins}min`;
  };

  const startEdit = (segment: Segment) => {
    if (segment.custom_pace_min_per_mile) {
      const pace = segment.custom_pace_min_per_mile;
      const minutes = Math.floor(pace);
      const seconds = Math.round((pace - minutes) * 60);
      setEditPaceMin(minutes.toString());
      setEditPaceSec(seconds.toString());
    } else {
      setEditPaceMin("");
      setEditPaceSec("");
    }
    setEditingId(segment.id!);
  };

  const saveEdit = async (segmentId: number) => {
    const customPace =
      parseInt(editPaceMin) + parseInt(editPaceSec || "0") / 60;
    await onUpdate(segmentId, { custom_pace_min_per_mile: customPace });
    setEditingId(null);
  };

  const resetToDefault = async (segmentId: number) => {
    await onUpdate(segmentId, { custom_pace_min_per_mile: null });
    setEditingId(null);
  };

  const startEditNotes = (segment: Segment) => {
    setEditNotes(segment.notes || "");
    setEditingNotesId(segment.id!);
  };

  const saveNotes = async (segmentId: number) => {
    await onUpdate(segmentId, { notes: editNotes || undefined });
    setEditingNotesId(null);
  };

  const startEditNutrition = (segment: Segment) => {
    setEditingNutritionSegment(segment);
  };

  const saveNutrition = async (
    nutritionPlan: string,
    carbGoalPerHour: number,
    nutritionItems: string,
    sodiumGoalPerHour: number,
    waterGoalPerHour: number
  ) => {
    if (editingNutritionSegment) {
      await onUpdate(editingNutritionSegment.id!, {
        nutrition_plan: nutritionPlan,
        carb_goal_per_hour: carbGoalPerHour,
        sodium_goal_per_hour: sodiumGoalPerHour,
        water_goal_per_hour: waterGoalPerHour,
        segment_nutrition_items: nutritionItems,
      });
      setEditingNutritionSegment(null);
    }
  };

  const startEditMapRef = (segment: Segment) => {
    setEditMapRef(segment.map_reference || "");
    setEditingMapRefId(segment.id!);
  };

  const saveMapRef = async (segmentId: number) => {
    await onUpdate(segmentId, { map_reference: editMapRef || undefined });
    setEditingMapRefId(null);
  };

  const toggleOrder = () => {
    const newOrder = !reverseOrder;
    setReverseOrder(newOrder);
    localStorage.setItem('checkpoint_display_order_reversed', newOrder.toString());
  };

  const toggleInterSegmentDistances = () => {
    const newValue = !showInterSegmentDistances;
    setShowInterSegmentDistances(newValue);
    localStorage.setItem('show_inter_segment_distances', newValue.toString());
  };

  // Get segments in display order
  const displaySegments = useMemo(() => {
    return reverseOrder ? [...segments].reverse() : segments;
  }, [segments, reverseOrder]);

  const saveCheckpointEdit = async (data: {
    checkpoint_name: string;
    segment_distance_miles: number;
    terrain_description?: string;
    nutrition_plan?: string;
    carb_goal_per_hour?: number;
    segment_nutrition_items?: string;
    notes?: string;
    map_reference?: string;
    custom_pace_min_per_mile?: number;
    cutoff_time?: string;
    checkpoint_time_minutes?: number;
    support_crew_present?: boolean;
    support_crew_names?: string;
    support_crew_members?: string;
  }) => {
    if (editingCheckpoint) {
      await onUpdate(editingCheckpoint.id!, data);
      setEditingCheckpoint(null);
    }
  };

  return (
    <div className="space-y-3 sm:space-y-4">
      <div className="flex flex-col sm:flex-row sm:flex-wrap sm:items-center gap-2 sm:gap-4 mb-3 sm:mb-4">
        <h3 className="text-base sm:text-lg font-bold text-gray-900 dark:text-white">Checkpoints & Segments</h3>

        {/* Emergency Contact */}
        <button
          onClick={onEditEmergencyContact}
          className="flex flex-wrap items-center gap-2 px-3 sm:px-4 py-2 bg-white dark:bg-[#2d3548] border-2 border-red-500/40 rounded-lg hover:border-red-500/60 transition-all min-h-[44px] w-full sm:w-auto"
        >
          <span className="text-xs sm:text-sm text-red-400 font-semibold">
            Emergency:
          </span>
          {emergencyContactName && emergencyContactPhone ? (
            <div className="flex flex-wrap items-center gap-2 sm:gap-3">
              <div className="flex items-center gap-1.5">
                <User className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-red-400" />
                <span className="text-xs sm:text-sm text-gray-900 dark:text-white font-medium">
                  {emergencyContactName}
                </span>
              </div>
              <div className="flex items-center gap-1.5">
                <Phone className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-red-400" />
                <span className="text-xs sm:text-sm text-gray-900 dark:text-white">
                  {emergencyContactPhone}
                </span>
              </div>
            </div>
          ) : (
            <span className="text-xs sm:text-sm text-gray-600 dark:text-gray-400">Click to add</span>
          )}
          <Edit2 className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-red-400" />
        </button>

        {/* Reverse Order Toggle */}
        {segments.length > 0 && (
          <button
            onClick={toggleOrder}
            className="flex items-center gap-2 px-3 sm:px-4 py-2 bg-white dark:bg-[#2d3548] border-2 border-blue-500/40 rounded-lg hover:border-blue-500/60 transition-all min-h-[44px] w-full sm:w-auto"
            title={reverseOrder ? "Show Start → Finish" : "Show Finish → Start"}
          >
            <ArrowUpDown className="w-4 h-4 text-blue-400" />
            <span className="text-xs sm:text-sm text-blue-400 font-semibold">
              {reverseOrder ? "Finish → Start" : "Start → Finish"}
            </span>
          </button>
        )}

        {/* Inter-Segment Distances Toggle */}
        {segments.length > 1 && (
          <button
            onClick={toggleInterSegmentDistances}
            className={`flex items-center gap-2 px-3 sm:px-4 py-2 bg-white dark:bg-[#2d3548] border-2 rounded-lg transition-all min-h-[44px] w-full sm:w-auto ${showInterSegmentDistances
              ? 'border-purple-500/60 hover:border-purple-500/80'
              : 'border-gray-300 dark:border-gray-600 hover:border-purple-500/40'
              }`}
            title={showInterSegmentDistances ? "Hide segment distances" : "Show segment distances"}
            aria-label="Toggle inter-segment distance display"
          >
            <Ruler className={`w-4 h-4 ${showInterSegmentDistances ? 'text-purple-400' : 'text-gray-400'}`} />
            <span className={`text-xs sm:text-sm font-semibold ${showInterSegmentDistances ? 'text-purple-400 coloursplash:text-splash-azure' : 'text-gray-400'
              }`}>
              {showInterSegmentDistances ? "Segments On" : "Segments Off"}
            </span>
          </button>
        )}
      </div>

      {segments.length === 0 ? (
        <div className="text-center py-12 bg-white dark:bg-[#2d3548] coloursplash:bg-white rounded-lg border border-dashed border-gray-300 dark:border-gray-700 coloursplash:border-splash-border">
          <MapPin className="w-12 h-12 text-gray-500 mx-auto mb-3" />
          <p className="text-gray-700 dark:text-gray-300 coloursplash:text-splash-text-primary font-medium">No checkpoints added yet</p>
          <p className="text-sm text-gray-500 coloursplash:text-splash-text-muted mt-1">
            Add your first checkpoint to start planning
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {displaySegments.map((segment, displayIndex) => {
            // Get the original index in the segments array
            const originalIndex = reverseOrder
              ? segments.length - 1 - displayIndex
              : displayIndex;

            return (
              <>
                {/* Inter-Segment Distance Display - BEFORE segment card */}
                {showInterSegmentDistances && (
                  <div className="flex items-center justify-center my-3 sm:my-4">
                    <div className="px-4 py-2.5 sm:px-5 sm:py-3 bg-gray-800 dark:bg-[#3a4458] coloursplash:bg-white rounded-xl border-2 border-purple-500/30 dark:border-purple-500/40 coloursplash:border-splash-azure shadow-lg max-w-[140px]">
                      <div className="text-sm sm:text-lg font-bold text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-pink-500 coloursplash:from-[#00AADD] coloursplash:to-[#00AADD] coloursplash:text-splash-azure text-center">
                        {formatDistance(segment.segment_distance_miles, useMiles)}
                      </div>
                    </div>
                  </div>
                )}

                <div
                  key={segment.id}
                  className="bg-white dark:bg-[#2d3548] coloursplash:bg-white rounded-lg border-2 shadow-light-card dark:shadow-sm dark:border border-gray-300 dark:border-gray-700 coloursplash:border-splash-border p-3 sm:p-5 hover:shadow-light-card-xl dark:hover:shadow-md hover:border-gray-400 dark:hover:border-gray-600 coloursplash:hover:bg-splash-azure-light transition-all"
                >
                  <div className="flex gap-2 sm:gap-4">
                    <div className="flex flex-col items-center">
                      <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-gradient-to-br from-purple-500 to-pink-600 coloursplash:from-[#00AADD] coloursplash:to-[#00AADD] flex items-center justify-center text-white font-bold shadow-lg text-sm sm:text-base">
                        {originalIndex + 1}
                      </div>
                      {displayIndex < displaySegments.length - 1 && (
                        <div className="w-0.5 flex-1 bg-gradient-to-b from-purple-400 to-pink-500 coloursplash:from-[#00AADD] coloursplash:to-[#00AADD] my-2 hidden sm:block"></div>
                      )}
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-2 sm:gap-4 mb-2 sm:mb-3">
                        <div className="flex-1 min-w-0">
                          <div className="flex flex-wrap items-center gap-2 sm:gap-3 mb-1">
                            <h4 className="text-base sm:text-lg font-bold text-gray-900 dark:text-white coloursplash:text-splash-text-primary break-words">
                              {segment.checkpoint_name}
                            </h4>
                            <button
                              onClick={() => setEditingCheckpoint(segment)}
                              className="p-1.5 text-gray-400 dark:text-gray-500 coloursplash:text-splash-azure hover:text-blue-500 dark:hover:text-blue-400 coloursplash:hover:bg-splash-azure-light hover:bg-blue-500/10 rounded-lg transition-all"
                              title="Edit checkpoint details"
                            >
                              <Edit2 className="w-4 h-4" />
                            </button>
                            {segment.plusCode && (
                              <div className="relative">
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setMapMenuOpen(
                                      mapMenuOpen === segment.id
                                        ? null
                                        : segment.id!
                                    );
                                  }}
                                  className="group inline-flex items-center gap-1 px-2 py-1 bg-green-500/20 text-green-400 rounded text-xs font-mono hover:bg-green-500/30 transition-all relative"
                                  title="Click to view map options"
                                >
                                  📍 {segment.plusCode}
                                </button>

                                {mapMenuOpen === segment.id && (
                                  <>
                                    <div
                                      className="fixed inset-0 z-20"
                                      onClick={() => setMapMenuOpen(null)}
                                    ></div>
                                    <div className="absolute top-full left-0 mt-1 w-56 bg-white dark:bg-[#2d3548] rounded-lg shadow-xl border border-gray-200 dark:border-gray-700 py-2 z-30">
                                      <div className="px-3 py-2 border-b border-gray-200 dark:border-gray-700">
                                        <div className="text-xs text-gray-600 dark:text-gray-400 font-semibold">
                                          View on Map
                                        </div>
                                      </div>

                                      <a
                                        href={`https://plus.codes/${segment.plusCode}`}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="flex items-center gap-2 px-3 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-[#333c52] transition-colors"
                                        onClick={() => setMapMenuOpen(null)}
                                      >
                                        🗺️ Google Maps (Standard)
                                      </a>

                                      <a
                                        href={`https://www.google.com/maps/@?api=1&map_action=map&center=${segment.latitude},${segment.longitude}&zoom=17&basemap=satellite`}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="flex items-center gap-2 px-3 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-[#333c52] transition-colors"
                                        onClick={() => setMapMenuOpen(null)}
                                      >
                                        🛰️ Google Maps (Satellite)
                                      </a>

                                      <a
                                        href={`https://www.google.com/maps/@?api=1&map_action=map&center=${segment.latitude},${segment.longitude}&zoom=17&basemap=terrain`}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="flex items-center gap-2 px-3 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-[#333c52] transition-colors"
                                        onClick={() => setMapMenuOpen(null)}
                                      >
                                        ⛰️ Google Maps (Terrain)
                                      </a>

                                      <a
                                        href={`https://maps.apple.com/?ll=${segment.latitude},${segment.longitude}&z=17`}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="flex items-center gap-2 px-3 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-[#333c52] transition-colors"
                                        onClick={() => setMapMenuOpen(null)}
                                      >
                                        🍎 Apple Maps
                                      </a>

                                      <a
                                        href={`https://www.openstreetmap.org/?mlat=${segment.latitude}&mlon=${segment.longitude}&zoom=17`}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="flex items-center gap-2 px-3 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-[#333c52] transition-colors"
                                        onClick={() => setMapMenuOpen(null)}
                                      >
                                        🌍 OpenStreetMap
                                      </a>

                                      <div className="border-t border-gray-200 dark:border-gray-700 mt-1 pt-1">
                                        <button
                                          onClick={() => {
                                            navigator.clipboard.writeText(
                                              segment.plusCode!
                                            );
                                            setMapMenuOpen(null);
                                          }}
                                          className="w-full flex items-center gap-2 px-3 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-[#333c52] transition-colors text-left"
                                        >
                                          📋 Copy Plus Code
                                        </button>
                                      </div>
                                    </div>
                                  </>
                                )}
                              </div>
                            )}

                            {/* Map Reference */}
                            {(segment.map_reference ||
                              editingMapRefId === segment.id) && (
                                <div className="relative">
                                  {editingMapRefId === segment.id ? (
                                    <div className="inline-flex items-center gap-1">
                                      <input
                                        type="text"
                                        value={editMapRef}
                                        onChange={(e) =>
                                          setEditMapRef(e.target.value)
                                        }
                                        placeholder="///word.word.word or grid ref"
                                        className="px-2 py-1 bg-white dark:bg-[#3a4458] border border-gray-300 dark:border-gray-600 text-gray-900 dark:text-white text-xs rounded focus:ring-2 focus:ring-blue-500"
                                        onClick={(e) => e.stopPropagation()}
                                        onKeyDown={(e) => {
                                          e.stopPropagation();
                                          if (e.key === "Enter")
                                            saveMapRef(segment.id!);
                                          if (e.key === "Escape")
                                            setEditingMapRefId(null);
                                        }}
                                      />
                                      <button
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          saveMapRef(segment.id!);
                                        }}
                                        className="px-2 py-1 bg-blue-600 text-white text-xs rounded hover:bg-blue-700"
                                      >
                                        Save
                                      </button>
                                      <button
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          setEditingMapRefId(null);
                                        }}
                                        className="px-2 py-1 bg-gray-600 text-white text-xs rounded hover:bg-gray-700"
                                      >
                                        Cancel
                                      </button>
                                    </div>
                                  ) : (
                                    <button
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        startEditMapRef(segment);
                                      }}
                                      className="group inline-flex items-center gap-1 px-2 py-1 bg-blue-500/20 text-blue-400 rounded text-xs hover:bg-blue-500/30 transition-all"
                                      title="Click to edit map reference"
                                    >
                                      🗺️ {segment.map_reference}
                                    </button>
                                  )}
                                </div>
                              )}

                            {/* Add Map Reference button if none exists */}
                            {!segment.map_reference &&
                              editingMapRefId !== segment.id && (
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    startEditMapRef(segment);
                                  }}
                                  className="inline-flex items-center gap-1 px-2 py-1 bg-gray-600/20 text-gray-400 rounded text-xs hover:bg-gray-600/30 transition-all"
                                  title="Add map reference"
                                >
                                  + Map Ref
                                </button>
                              )}
                          </div>
                          <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-gray-600 dark:text-gray-400 coloursplash:text-splash-text-secondary">
                            <span className="font-semibold">
                              {formatDistance(segment.segment_distance_miles, useMiles)}
                            </span>
                            <span>
                              Cumulative:{" "}
                              {formatDistance(segment.cumulative_distance_miles, useMiles)}
                            </span>
                          </div>

                          {/* ETA Display */}
                          {raceStartTime &&
                            (() => {
                              const eta = calculateSegmentETA(
                                raceStartTime,
                                segments,
                                originalIndex
                              );

                              if (!eta) return null;

                              return (
                                <div className="mt-2 flex items-center gap-3 flex-wrap">
                                  <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-blue-500/20 border border-blue-500/40 rounded-lg">
                                    <Clock className="w-4 h-4 text-blue-400" />
                                    <div className="flex items-center gap-3">
                                      <div>
                                        <span className="text-xs text-gray-900 dark:text-blue-400 font-medium">
                                          ETA:{" "}
                                        </span>
                                        <span className="text-sm text-gray-900 dark:text-white font-bold">
                                          {eta.formattedTime}
                                        </span>
                                      </div>
                                      {eta.crossesMidnight && (
                                        <span className="text-xs text-yellow-400 font-medium">
                                          {eta.dayOfWeek}
                                        </span>
                                      )}
                                      <div className="flex items-center gap-1">
                                        <span className="text-xs text-gray-900 dark:text-gray-300 font-medium">
                                          {eta.isDaylight ? 'Daylight' : 'Night'}
                                        </span>
                                        {eta.isDaylight ? (
                                          <Sun
                                            className="w-4 h-4 text-yellow-400"
                                          />
                                        ) : (
                                          <Moon
                                            className="w-4 h-4 text-purple-400"
                                          />
                                        )}
                                      </div>

                                      {/* Weather Icon */}
                                      <div className="flex items-center gap-1">
                                        <span className="text-xs text-gray-900 dark:text-gray-300 font-medium">
                                          Weather
                                        </span>
                                        <WeatherIcon
                                          segment={segment}
                                          eta={eta.eta}
                                          raceStartTime={raceStartTime}
                                        />
                                      </div>
                                    </div>
                                  </div>

                                  {/* Cut-off Time Display */}
                                  {segment.cutoff_time && (
                                    <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg" style={{ backgroundColor: '#bf7f05' }}>
                                      <span className="text-sm font-bold text-white">
                                        Cut off time: {(() => {
                                          // Format time from 24h to 12h format
                                          const [hours, minutes] = segment.cutoff_time.split(':');
                                          const hour = parseInt(hours);
                                          const period = hour >= 12 ? 'pm' : 'am';
                                          const displayHour = hour === 0 ? 12 : hour > 12 ? hour - 12 : hour;
                                          return `${displayHour}:${minutes} ${period}`;
                                        })()}
                                      </span>
                                    </div>
                                  )}
                                </div>
                              );
                            })()}
                        </div>

                        <button
                          onClick={() => onDelete(segment.id!)}
                          className="p-2 text-gray-400 dark:text-gray-500 coloursplash:text-splash-coral hover:text-red-400 coloursplash:hover:bg-splash-coral-light hover:bg-red-500/10 rounded-lg transition-all flex-shrink-0"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>

                      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-3 mb-2 sm:mb-3">
                        <div className="bg-gray-50 dark:bg-[#3a4458] coloursplash:bg-splash-bg-subtle rounded-lg p-2 sm:p-3 border border-gray-200 dark:border-gray-700 coloursplash:border-splash-border">
                          <div className="text-xs text-blue-400 coloursplash:text-splash-text-secondary font-medium mb-1">
                            Segment Time
                          </div>
                          <div className="text-sm sm:text-lg font-bold text-gray-900 dark:text-white coloursplash:text-splash-text-primary">
                            {formatTime(
                              segment.predicted_segment_time_minutes ?? null
                            )}
                          </div>
                          {segment.checkpoint_time_minutes && (
                            <div className="text-xs sm:text-sm text-orange-400 coloursplash:text-splash-text-secondary mt-1">
                              + {formatTime(segment.checkpoint_time_minutes)} at CP
                            </div>
                          )}
                        </div>

                        <div
                          className={`rounded-lg p-2 sm:p-3 border ${segment.custom_pace_min_per_mile
                            ? "bg-gray-50 dark:bg-[#3a4458] coloursplash:bg-splash-bg-subtle border-orange-500/30 coloursplash:border-splash-border"
                            : "bg-gray-50 dark:bg-[#3a4458] coloursplash:bg-splash-bg-subtle border-gray-200 dark:border-gray-700 coloursplash:border-splash-border"
                            }`}
                        >
                          <div
                            className={`text-xs font-medium mb-1 flex items-center justify-between ${segment.custom_pace_min_per_mile
                              ? "text-orange-400 coloursplash:text-splash-text-secondary"
                              : "text-green-400 coloursplash:text-splash-text-secondary"
                              }`}
                          >
                            <span>Pace</span>
                            {editingId === segment.id ? (
                              <div className="flex gap-1">
                                <button
                                  onClick={() => saveEdit(segment.id!)}
                                  className="p-1 hover:bg-[#4a5568] coloursplash:text-splash-azure coloursplash:hover:bg-splash-azure-light rounded transition-all"
                                >
                                  <Save className="w-3 h-3" />
                                </button>
                                <button
                                  onClick={() => setEditingId(null)}
                                  className="p-1 hover:bg-[#4a5568] coloursplash:hover:bg-splash-azure-light rounded transition-all"
                                >
                                  <X className="w-3 h-3" />
                                </button>
                              </div>
                            ) : (
                              <button
                                onClick={() => startEdit(segment)}
                                className="p-1 hover:bg-[#4a5568] coloursplash:text-splash-azure coloursplash:hover:bg-splash-azure-light rounded transition-all"
                              >
                                <Edit2 className="w-3 h-3" />
                              </button>
                            )}
                          </div>
                          {editingId === segment.id ? (
                            <div className="flex items-center gap-1">
                              <input
                                type="number"
                                min="0"
                                value={editPaceMin}
                                onChange={(e) => setEditPaceMin(e.target.value)}
                                className="w-12 px-2 py-1 text-sm bg-white dark:bg-[#2d3548] border border-gray-300 dark:border-gray-600 text-gray-900 dark:text-white rounded focus:ring-1 focus:ring-orange-500"
                              />
                              <span className="text-xs text-gray-600 dark:text-gray-400">:</span>
                              <input
                                type="number"
                                min="0"
                                max="59"
                                value={editPaceSec}
                                onChange={(e) => setEditPaceSec(e.target.value)}
                                className="w-12 px-2 py-1 text-sm bg-white dark:bg-[#2d3548] border border-gray-300 dark:border-gray-600 text-gray-900 dark:text-white rounded focus:ring-1 focus:ring-orange-500"
                              />
                              <span className="text-xs text-gray-600 dark:text-gray-400">{getPaceUnit(useMiles)}</span>
                            </div>
                          ) : (
                            <div className="space-y-1">
                              <div
                                className={`text-lg font-bold ${segment.custom_pace_min_per_mile
                                  ? "text-gray-900 dark:text-white coloursplash:text-splash-text-primary"
                                  : "text-gray-500 coloursplash:text-splash-text-muted"
                                  }`}
                              >
                                {segment.custom_pace_min_per_mile
                                  ? formatPace(
                                    segment.custom_pace_min_per_mile * (segment.terrain_factor ?? 1.0),
                                    useMiles
                                  )
                                  : "No pace"}
                              </div>
                              {/* Show auto-pace indicator if enabled */}
                              {segment.use_auto_pace && segment.auto_derived_pace && segment.auto_pace_confidence && (
                                <AutoPaceIndicator
                                  isEnabled={true}
                                  confidence={segment.auto_pace_confidence}
                                  derivedPace={segment.auto_derived_pace}
                                  reasoning={segment.auto_pace_reasoning || ''}
                                  useMiles={useMiles}
                                />
                              )}
                            </div>
                          )}
                          {segment.custom_pace_min_per_mile &&
                            editingId !== segment.id && (
                              <button
                                onClick={() => resetToDefault(segment.id!)}
                                className="text-xs text-orange-400 hover:text-orange-300 mt-1 underline"
                              >
                                Reset to default
                              </button>
                            )}
                        </div>

                        {/* Elevation Gain/Loss Card */}
                        {(() => {
                          const elevationStats = segmentElevations.get(segment.id!);

                          if (elevationStats) {
                            return (
                              <div className="bg-gray-50 dark:bg-[#3a4458] coloursplash:bg-splash-bg-subtle rounded-lg p-3 border border-gray-200 dark:border-gray-700 coloursplash:border-splash-border">
                                <div className="flex items-center justify-between mb-1">
                                  <div className="text-xs text-cyan-400 coloursplash:text-splash-text-secondary font-medium">
                                    Elevation
                                  </div>
                                  <span className="text-sm">{getElevationIcon(elevationStats)}</span>
                                </div>
                                <div className="grid grid-cols-2 gap-2 mb-2">
                                  <div>
                                    <div className="flex items-center gap-1 text-xs text-gray-600 dark:text-gray-400 coloursplash:text-splash-text-secondary mb-0.5">
                                      <TrendingUp className="w-3 h-3 text-green-400" />
                                      <span>Gain</span>
                                    </div>
                                    <div className="text-sm font-bold text-gray-900 dark:text-white coloursplash:text-splash-text-primary">
                                      {formatElevation(elevationStats.gain, useMiles)}
                                    </div>
                                    <div className="text-xs text-gray-500 coloursplash:text-splash-text-muted">
                                      ({formatElevation(elevationStats.gain, !useMiles)})
                                    </div>
                                  </div>
                                  <div>
                                    <div className="flex items-center gap-1 text-xs text-gray-600 dark:text-gray-400 coloursplash:text-splash-text-secondary mb-0.5">
                                      <TrendingDown className="w-3 h-3 text-red-400" />
                                      <span>Loss</span>
                                    </div>
                                    <div className="text-sm font-bold text-gray-900 dark:text-white coloursplash:text-splash-text-primary">
                                      {formatElevation(elevationStats.loss, useMiles)}
                                    </div>
                                    <div className="text-xs text-gray-500 coloursplash:text-splash-text-muted">
                                      ({formatElevation(elevationStats.loss, !useMiles)})
                                    </div>
                                  </div>
                                </div>
                                {Math.abs(elevationStats.netElevation) > 10 && (
                                  <div className="text-xs border-t border-gray-200 dark:border-gray-700 coloursplash:border-splash-border pt-1.5">
                                    <span className="text-gray-600 dark:text-gray-400 coloursplash:text-splash-text-secondary">Net: </span>
                                    <span className={`font-bold ${elevationStats.netElevation > 0 ? 'text-green-400' : 'text-red-400'
                                      }`}>
                                      {elevationStats.netElevation > 0 ? '+' : ''}
                                      {formatElevation(Math.abs(elevationStats.netElevation), useMiles)}
                                    </span>
                                  </div>
                                )}
                                {/* Descent Warning Badge */}
                                {elevationStats.loss > 60 && segment.segment_distance_miles > 0 && (() => {
                                  // Convert meters to feet for consistent gradient calculation
                                  const elevationLossFeet = elevationStats.loss * 3.28084;
                                  const gradient = (elevationLossFeet / (segment.segment_distance_miles * 5280)) * -100;
                                  // Only show for gradients steeper than -2%
                                  if (gradient >= -2) return null;
                                  return (
                                    <div className="mt-2">
                                      <DescentWarningBadge
                                        gradient={gradient}
                                        elevationLoss={elevationLossFeet}
                                        compact={true}
                                      />
                                    </div>
                                  );
                                })()}
                              </div>
                            );
                          }

                          // No GPX file uploaded
                          return (
                            <div className="bg-gray-50 dark:bg-[#3a4458] coloursplash:bg-splash-bg-subtle rounded-lg p-3 border border-gray-200 dark:border-gray-700 coloursplash:border-splash-border">
                              <div className="text-xs text-cyan-400 coloursplash:text-splash-text-secondary font-medium mb-1">
                                Elevation
                              </div>
                              <div className="text-xs text-gray-500 coloursplash:text-splash-text-muted italic">
                                Upload GPX file to see elevation gain/loss
                              </div>
                            </div>
                          );
                        })()}

                        <div className="bg-gray-50 dark:bg-[#3a4458] coloursplash:bg-splash-bg-subtle rounded-lg p-3 border border-gray-200 dark:border-gray-700 coloursplash:border-splash-border">
                          <div className="text-xs text-purple-400 coloursplash:text-splash-text-secondary font-medium mb-1">
                            Terrain
                          </div>
                          <div className="text-sm text-gray-700 dark:text-gray-300 coloursplash:text-splash-text-primary line-clamp-2">
                            {segment.terrain_description || "No terrain info"}
                          </div>
                        </div>
                      </div>

                      <div className="space-y-3">
                        {/* Nutrition card - always show new format except for pure legacy segments */}
                        {(() => {
                          // Check if this is a pure legacy segment (has nutrition_plan but no segment_nutrition_items)
                          const isPureLegacy = segment.nutrition_plan && !segment.segment_nutrition_items;

                          if (!isPureLegacy) {
                            // NEW FORMAT or EMPTY - Always show new format card
                            try {
                              // Handle both string (correct) and array (from old bug) formats
                              const nutritionItems: NutritionItem[] = typeof segment.segment_nutrition_items === 'string'
                                ? JSON.parse(segment.segment_nutrition_items)
                                : Array.isArray(segment.segment_nutrition_items)
                                  ? segment.segment_nutrition_items
                                  : [];

                              const totalCarbs = Math.round(nutritionItems.reduce(
                                (sum, item) => sum + (item.carbsPerServing * item.quantity),
                                0
                              ) * 10) / 10;
                              const totalSodium = Math.round(nutritionItems.reduce(
                                (sum, item) => sum + ((item.sodiumPerServing || 0) * item.quantity),
                                0
                              ));
                              const totalWater = Math.round(nutritionItems.reduce(
                                (sum, item) => sum + ((item.waterPerServing || 0) * item.quantity),
                                0
                              ));

                              // Calculate rates per hour if we have segment time
                              const segmentTimeHours = segment.predicted_segment_time_minutes
                                ? segment.predicted_segment_time_minutes / 60
                                : 0;
                              const carbsPerHour = segmentTimeHours > 0 ? totalCarbs / segmentTimeHours : 0;
                              const sodiumPerHour = segmentTimeHours > 0 ? totalSodium / segmentTimeHours : 0;
                              const waterPerHour = segmentTimeHours > 0 ? totalWater / segmentTimeHours : 0;

                              const carbGoal = segment.carb_goal_per_hour || 60;
                              const sodiumGoal = segment.sodium_goal_per_hour || 300;
                              const waterGoal = segment.water_goal_per_hour || 500;

                              const carbProgressPercentage = carbGoal > 0 ? (carbsPerHour / carbGoal) * 100 : 0;
                              const sodiumProgressPercentage = sodiumGoal > 0 ? (sodiumPerHour / sodiumGoal) * 100 : 0;
                              const waterProgressPercentage = waterGoal > 0 ? (waterPerHour / waterGoal) * 100 : 0;

                              return (
                                <div className="bg-gray-50 dark:bg-[#3a4458] coloursplash:bg-splash-bg-subtle rounded-lg p-3 border border-green-500/30 coloursplash:border-splash-border">
                                  <div className="flex items-center justify-between mb-3">
                                    <div className="flex items-center gap-2">
                                      <div className="text-xs text-green-700 dark:text-green-400 coloursplash:text-splash-text-secondary font-medium">
                                        Nutrition
                                      </div>
                                      <button
                                        onClick={() => startEditNutrition(segment)}
                                        className="p-1 hover:bg-[#4a5568] coloursplash:text-splash-azure coloursplash:hover:bg-splash-azure-light rounded transition-all"
                                      >
                                        <Edit2 className="w-3 h-3 text-green-400" />
                                      </button>
                                    </div>
                                    {nutritionItems.length === 0 ? (
                                      <div className="text-sm text-gray-400 coloursplash:text-splash-text-muted italic">
                                        Click edit to add nutrition
                                      </div>
                                    ) : (
                                      <div className="flex items-center gap-4">
                                        <div className="text-center">
                                          <div className="text-sm font-bold text-green-600 dark:text-green-400">
                                            {totalCarbs}g
                                          </div>
                                          <div className="text-xs text-gray-400">Carbs</div>
                                        </div>
                                        <div className="text-center">
                                          <div className="text-sm font-bold text-blue-600 dark:text-blue-400">
                                            {totalSodium}mg
                                          </div>
                                          <div className="text-xs text-gray-400">Sodium</div>
                                        </div>
                                        <div className="text-center">
                                          <div className="text-sm font-bold text-cyan-600 dark:text-cyan-400">
                                            {totalWater}ml
                                          </div>
                                          <div className="text-xs text-gray-400">Water</div>
                                        </div>
                                      </div>
                                    )}
                                  </div>

                                  {/* Three compact progress bars */}
                                  {nutritionItems.length > 0 && segmentTimeHours > 0 && (
                                    <div className="mb-3 space-y-2">
                                      {/* Carbs Progress */}
                                      <div>
                                        <div className="flex items-center justify-between text-xs mb-0.5">
                                          <span className="text-green-600 dark:text-green-400 font-medium">Carbs</span>
                                          <span className={`font-semibold ${getCarbStatusColor(carbProgressPercentage, segmentTimeHours > 0)}`}>
                                            {Math.round(carbsPerHour)}g/hr ({Math.round(carbProgressPercentage)}%)
                                          </span>
                                        </div>
                                        <div className="w-full h-1.5 bg-gray-300 dark:bg-gray-700 rounded-full overflow-hidden relative">
                                          <div
                                            className={`h-full transition-all ${getCarbProgressColor(carbProgressPercentage, segmentTimeHours > 0)}`}
                                            style={{ width: `${Math.min(getCarbProgressWidth(carbProgressPercentage), 100)}%` }}
                                          />
                                          {/* Overflow indicator when > 100% */}
                                          {carbProgressPercentage > 100 && (
                                            <div
                                              className={`absolute top-0 h-full transition-all ${carbProgressPercentage > CARB_THRESHOLDS.WARNING ? 'bg-red-500' : 'bg-orange-500'
                                                }`}
                                              style={{
                                                left: '100%',
                                                width: `${Math.min(carbProgressPercentage - 100, 50)}%`,
                                                marginLeft: '-1px'
                                              }}
                                            />
                                          )}
                                        </div>
                                      </div>

                                      {/* Carb Over-Consumption Warning */}
                                      {shouldShowCarbWarning(carbProgressPercentage) && segmentTimeHours > 0 && (
                                        <div className={`flex items-center gap-1.5 text-xs ${isCarbDanger(carbProgressPercentage) ? 'text-red-400' : 'text-orange-400'
                                          }`}>
                                          <AlertTriangle className={`w-3 h-3 ${isCarbDanger(carbProgressPercentage) ? 'animate-pulse' : ''
                                            }`} />
                                          <span>{getCarbWarningMessage(carbProgressPercentage)}</span>
                                        </div>
                                      )}

                                      {/* Sodium Progress */}
                                      <div>
                                        <div className="flex items-center justify-between text-xs mb-0.5">
                                          <span className="text-blue-600 dark:text-blue-400 font-medium">Sodium</span>
                                          <span className={`font-semibold ${sodiumProgressPercentage >= 80 && sodiumProgressPercentage <= 120 ? 'text-blue-400' :
                                            sodiumProgressPercentage >= 60 && sodiumProgressPercentage <= 140 ? 'text-yellow-400' :
                                              'text-red-400'
                                            }`}>
                                            {Math.round(sodiumPerHour)}mg/hr ({Math.round(sodiumProgressPercentage)}%)
                                          </span>
                                        </div>
                                        <div className="w-full h-1.5 bg-gray-300 dark:bg-gray-700 rounded-full overflow-hidden">
                                          <div
                                            className={`h-full transition-all ${sodiumProgressPercentage >= 80 && sodiumProgressPercentage <= 120 ? 'bg-blue-500' :
                                              sodiumProgressPercentage >= 60 && sodiumProgressPercentage <= 140 ? 'bg-yellow-500' :
                                                'bg-red-500'
                                              }`}
                                            style={{ width: `${Math.min(sodiumProgressPercentage, 100)}%` }}
                                          />
                                        </div>
                                      </div>

                                      {/* Water Progress */}
                                      <div>
                                        <div className="flex items-center justify-between text-xs mb-0.5">
                                          <span className="text-cyan-600 dark:text-cyan-400 font-medium">Water</span>
                                          <span className={`font-semibold ${waterProgressPercentage >= 80 && waterProgressPercentage <= 120 ? 'text-cyan-400' :
                                            waterProgressPercentage >= 60 && waterProgressPercentage <= 140 ? 'text-yellow-400' :
                                              'text-red-400'
                                            }`}>
                                            {Math.round(waterPerHour)}ml/hr ({Math.round(waterProgressPercentage)}%)
                                          </span>
                                        </div>
                                        <div className="w-full h-1.5 bg-gray-300 dark:bg-gray-700 rounded-full overflow-hidden">
                                          <div
                                            className={`h-full transition-all ${waterProgressPercentage >= 80 && waterProgressPercentage <= 120 ? 'bg-cyan-500' :
                                              waterProgressPercentage >= 60 && waterProgressPercentage <= 140 ? 'bg-yellow-500' :
                                                'bg-red-500'
                                              }`}
                                            style={{ width: `${Math.min(waterProgressPercentage, 100)}%` }}
                                          />
                                        </div>
                                      </div>
                                    </div>
                                  )}

                                  {nutritionItems.length > 0 && (
                                    <div className="space-y-1.5">
                                      {nutritionItems.map((item, idx) => (
                                        <div key={idx} className="flex items-center justify-between px-2 py-1.5 bg-green-500/10 coloursplash:bg-splash-bg-subtle rounded">
                                          <div className="flex items-center gap-2">
                                            <span className="text-sm text-gray-900 dark:text-white coloursplash:text-splash-text-primary font-medium">
                                              {item.productName}
                                            </span>
                                            {item.quantity > 1 && (
                                              <span className="text-xs text-gray-400 coloursplash:text-splash-text-muted">
                                                × {item.quantity}
                                              </span>
                                            )}
                                          </div>
                                          <div className="flex items-center gap-2 text-xs font-medium">
                                            <span className="text-green-700 dark:text-green-300 coloursplash:text-splash-text-secondary">
                                              {item.carbsPerServing * item.quantity}g
                                            </span>
                                            <span className="text-blue-700 dark:text-blue-300 coloursplash:text-splash-text-secondary">
                                              {(item.sodiumPerServing || 0) * item.quantity}mg
                                            </span>
                                            {(item.waterPerServing || 0) > 0 && (
                                              <span className="text-cyan-700 dark:text-cyan-300 coloursplash:text-splash-text-secondary">
                                                {(item.waterPerServing || 0) * item.quantity}ml
                                              </span>
                                            )}
                                          </div>
                                        </div>
                                      ))}
                                    </div>
                                  )}

                                  {/* Show legacy notes if they exist */}
                                  {segment.nutrition_plan && (() => {
                                    try {
                                      const legacyData = JSON.parse(segment.nutrition_plan);
                                      if (legacyData.notes || legacyData.supportCrewMeal) {
                                        return (
                                          <div className="mt-3 pt-3 border-t border-gray-700">
                                            {legacyData.notes && (
                                              <div className="text-xs text-gray-400 mb-1">
                                                <span className="font-medium">Notes:</span> {legacyData.notes}
                                              </div>
                                            )}
                                            {legacyData.supportCrewMeal && (
                                              <div className="text-xs text-gray-400">
                                                <span className="font-medium">Support Crew Meal:</span> {legacyData.supportCrewMeal}
                                              </div>
                                            )}
                                          </div>
                                        );
                                      }
                                    } catch {
                                      return null;
                                    }
                                    return null;
                                  })()}
                                </div>
                              );
                            } catch (e) {
                              console.error('Error parsing segment_nutrition_items:', e);
                            }
                          }

                          // LEGACY FORMAT: Fall back to old nutrition_plan format
                          if (segment.nutrition_plan) {
                            try {
                              const nutritionData = JSON.parse(segment.nutrition_plan);

                              // Calculate target carbs and current carb intake if segment has timing info
                              const segmentTimeHours = segment.predicted_segment_time_minutes
                                ? segment.predicted_segment_time_minutes / 60
                                : 0;
                              const carbGoal = segment.carb_goal_per_hour || 60;
                              const targetCarbs = carbGoal * segmentTimeHours;

                              return (
                                <div className="bg-gray-50 dark:bg-[#3a4458] coloursplash:bg-splash-bg-subtle rounded-lg p-3 border border-green-500/30 coloursplash:border-splash-border">
                                  <div className="text-xs text-green-700 dark:text-green-400 coloursplash:text-splash-text-secondary font-medium mb-2 flex items-center justify-between">
                                    <span>Nutrition</span>
                                    <button
                                      onClick={() => startEditNutrition(segment)}
                                      className="p-1 hover:bg-[#4a5568] coloursplash:text-splash-azure coloursplash:hover:bg-splash-azure-light rounded transition-all"
                                    >
                                      <Edit2 className="w-3 h-3" />
                                    </button>
                                  </div>

                                  {/* Show Target Carbs and Carb Rate if we have timing info */}
                                  {segmentTimeHours > 0 && (
                                    <div className="mb-3 grid grid-cols-2 gap-3">
                                      <div className="text-right">
                                        <div className="text-lg font-bold text-white">
                                          {Math.round(targetCarbs)}g
                                        </div>
                                        <div className="text-xs text-gray-400">
                                          Target Carbs
                                        </div>
                                      </div>
                                      <div className="text-right">
                                        <div className="text-lg font-bold text-white">
                                          {carbGoal}g/hr
                                        </div>
                                        <div className="text-xs text-gray-400">
                                          Current Carb Intake
                                        </div>
                                      </div>
                                    </div>
                                  )}

                                  {nutritionData.products &&
                                    nutritionData.products.length > 0 && (
                                      <div className="mb-2">
                                        <div className="flex flex-wrap gap-1">
                                          {nutritionData.products.map(
                                            (product: string, idx: number) => (
                                              <span
                                                key={idx}
                                                className="inline-block px-2 py-0.5 bg-green-500/20 text-green-700 dark:text-green-300 text-xs rounded"
                                              >
                                                {product}
                                              </span>
                                            )
                                          )}
                                        </div>
                                      </div>
                                    )}
                                  {nutritionData.notes && (
                                    <div className="text-xs text-gray-400 mt-2">
                                      <span className="font-medium">Notes:</span>{" "}
                                      {nutritionData.notes}
                                    </div>
                                  )}
                                  {nutritionData.supportCrewMeal && (
                                    <div className="text-xs text-gray-400 mt-2">
                                      <span className="font-medium">
                                        Support Crew Meal:
                                      </span>{" "}
                                      {nutritionData.supportCrewMeal}
                                    </div>
                                  )}
                                </div>
                              );
                            } catch {
                              // Fallback for old plain text nutrition plans
                              return (
                                <div className="bg-gray-50 dark:bg-[#3a4458] coloursplash:bg-splash-bg-subtle rounded-lg p-3 border border-green-500/30 coloursplash:border-splash-border">
                                  <div className="text-xs text-green-700 dark:text-green-400 coloursplash:text-splash-text-secondary font-medium mb-1 flex items-center justify-between">
                                    <span>Nutrition</span>
                                    <button
                                      onClick={() => startEditNutrition(segment)}
                                      className="p-1 hover:bg-[#4a5568] coloursplash:text-splash-azure coloursplash:hover:bg-splash-azure-light rounded transition-all"
                                    >
                                      <Edit2 className="w-3 h-3" />
                                    </button>
                                  </div>
                                  <div className="text-sm text-gray-300 coloursplash:text-splash-text-primary">
                                    {segment.nutrition_plan}
                                  </div>
                                </div>
                              );
                            }
                          }

                          return null;
                        })()}

                        {(segment.notes || editingNotesId === segment.id) && (
                          <div className="bg-gray-50 dark:bg-[#3a4458] coloursplash:bg-splash-bg-subtle rounded-lg p-3 border border-yellow-500/30 coloursplash:border-splash-border">
                            <div className="text-xs text-yellow-400 coloursplash:text-splash-text-secondary font-medium mb-1 flex items-center justify-between">
                              <span>Notes</span>
                              {editingNotesId === segment.id ? (
                                <div className="flex gap-1">
                                  <button
                                    onClick={() => saveNotes(segment.id!)}
                                    className="p-1 hover:bg-[#4a5568] coloursplash:text-splash-azure coloursplash:hover:bg-splash-azure-light rounded transition-all"
                                  >
                                    <Save className="w-3 h-3" />
                                  </button>
                                  <button
                                    onClick={() => setEditingNotesId(null)}
                                    className="p-1 hover:bg-[#4a5568] coloursplash:hover:bg-splash-azure-light rounded transition-all"
                                  >
                                    <X className="w-3 h-3" />
                                  </button>
                                </div>
                              ) : (
                                <button
                                  onClick={() => startEditNotes(segment)}
                                  className="p-1 hover:bg-[#4a5568] coloursplash:text-splash-azure coloursplash:hover:bg-splash-azure-light rounded transition-all"
                                >
                                  <Edit2 className="w-3 h-3" />
                                </button>
                              )}
                            </div>
                            {editingNotesId === segment.id ? (
                              <textarea
                                value={editNotes}
                                onChange={(e) => setEditNotes(e.target.value)}
                                rows={2}
                                className="w-full px-2 py-1 text-sm bg-white dark:bg-[#2d3548] border border-gray-300 dark:border-gray-600 text-gray-900 dark:text-white rounded focus:ring-1 focus:ring-yellow-500 resize-none"
                                placeholder="Add notes..."
                              />
                            ) : (
                              <div className="text-sm text-gray-700 dark:text-gray-300 coloursplash:text-splash-text-primary">
                                {segment.notes}
                              </div>
                            )}
                          </div>
                        )}

                        {segment.support_crew_present &&
                          segment.support_crew_members &&
                          (() => {
                            try {
                              const crewMembers: SupportCrewMember[] = JSON.parse(
                                segment.support_crew_members
                              );
                              if (crewMembers.length === 0) return null;

                              return (
                                <div className="bg-gray-50 dark:bg-[#3a4458] coloursplash:bg-splash-bg-subtle rounded-lg p-3 border border-purple-500/30 coloursplash:border-splash-border">
                                  <div className="text-xs text-purple-400 coloursplash:text-splash-text-secondary font-medium mb-2">
                                    Support Crew ({crewMembers.length} member
                                    {crewMembers.length !== 1 ? "s" : ""})
                                  </div>
                                  <div className="space-y-2">
                                    {crewMembers.map((member, idx) => (
                                      <div
                                        key={idx}
                                        className="flex items-center gap-3 px-3 py-2 bg-purple-500/10 coloursplash:bg-splash-bg-subtle rounded-lg"
                                      >
                                        <div className="flex items-center gap-2 flex-1">
                                          <User className="w-3.5 h-3.5 text-purple-400" />
                                          <span className="text-sm text-gray-900 dark:text-white coloursplash:text-splash-text-primary font-medium">
                                            {member.name}
                                          </span>
                                        </div>
                                        <div className="flex items-center gap-2">
                                          <Phone className="w-3.5 h-3.5 text-purple-400" />
                                          <a
                                            href={`tel:${member.phone}`}
                                            className="text-sm text-purple-300 coloursplash:text-splash-text-secondary hover:text-purple-200 hover:underline"
                                          >
                                            {member.phone}
                                          </a>
                                        </div>
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              );
                            } catch {
                              return null;
                            }
                          })()}

                        {/* FIT Comparison Data - Only show when FIT data exists */}
                        {(() => {
                          const comparisonData = segmentComparisons.get(segment.id!);

                          // Only show if we have FIT data AND this segment has matches
                          if (!fitComparisonData ||
                            !comparisonData ||
                            !comparisonData.distanceMatch ||
                            (!comparisonData.previousAvgHR && !comparisonData.previousAvgPace)) {
                            return null;
                          }

                          const showComparison = showComparisonMap[segment.id!] || false;

                          return (
                            <div className="bg-gray-50 dark:bg-[#3a4458] coloursplash:bg-splash-bg-subtle rounded-lg p-3 border border-blue-500/30 coloursplash:border-splash-border">
                              <button
                                onClick={() => setShowComparisonMap(prev => ({
                                  ...prev,
                                  [segment.id!]: !prev[segment.id!]
                                }))}
                                className="flex items-center gap-2 text-blue-400 coloursplash:text-splash-text-secondary hover:text-blue-300 coloursplash:hover:text-splash-azure font-medium w-full transition-colors"
                              >
                                <Activity className="w-4 h-4" />
                                <span className="text-xs">Previous Race Data</span>
                                {showComparison ? <ChevronUp className="w-4 h-4 ml-auto" /> : <ChevronDown className="w-4 h-4 ml-auto" />}
                              </button>

                              {showComparison && (
                                <div className="mt-3 space-y-2">
                                  {/* Pace Comparison */}
                                  {comparisonData.previousAvgPace && (
                                    <div className="space-y-1">
                                      <div className="flex justify-between items-center">
                                        <span className="text-gray-600 dark:text-gray-400 coloursplash:text-splash-text-secondary text-xs">Previous Avg Pace:</span>
                                        <span className="font-medium text-gray-900 dark:text-gray-200 coloursplash:text-splash-text-primary text-sm">
                                          {formatPace(comparisonData.previousAvgPace, useMiles)}
                                        </span>
                                      </div>

                                      {comparisonData.plannedPace && (
                                        <>
                                          <div className="flex justify-between items-center">
                                            <span className="text-gray-600 dark:text-gray-400 coloursplash:text-splash-text-secondary text-xs">Planned Pace:</span>
                                            <span className="font-medium text-gray-900 dark:text-gray-200 coloursplash:text-splash-text-primary text-sm">
                                              {formatPace(comparisonData.plannedPace, useMiles)}
                                            </span>
                                          </div>

                                          {comparisonData.comparisonMetrics && (
                                            <div className="mt-2 p-2 bg-gray-100 dark:bg-slate-800/50 rounded border border-gray-300 dark:border-slate-600/30">
                                              <div className="flex items-center justify-between mb-1">
                                                <span className="text-xs text-gray-900 dark:text-gray-400">Previous vs Planned Pace:</span>
                                                <div className="flex items-center gap-2">
                                                  <span className={`text-sm font-semibold ${comparisonData.comparisonMetrics.paceVariance > 0
                                                    ? 'text-red-400'
                                                    : 'text-green-700 dark:text-green-400'
                                                    }`}>
                                                    {Math.abs(comparisonData.comparisonMetrics.paceVariance).toFixed(1)}%
                                                  </span>
                                                  {comparisonData.comparisonMetrics.paceVariance > 0 ? (
                                                    <span className="text-xs text-red-400">⬇ slower</span>
                                                  ) : (
                                                    <span className="text-xs text-green-700 dark:text-green-400">⬆ faster</span>
                                                  )}
                                                </div>
                                              </div>
                                              {/* Time difference */}
                                              <div className="text-xs text-gray-700 dark:text-gray-400">
                                                {(() => {
                                                  const timeDiff = Math.abs(
                                                    comparisonData.previousAvgPace! - comparisonData.plannedPace!
                                                  );
                                                  const minutes = Math.floor(timeDiff);
                                                  const seconds = Math.round((timeDiff - minutes) * 60);

                                                  return comparisonData.comparisonMetrics!.paceVariance > 0 ? (
                                                    <span className="text-red-600 dark:text-red-300">
                                                      Need to run {minutes}:{seconds.toString().padStart(2, '0')}/mi faster
                                                    </span>
                                                  ) : (
                                                    <span className="text-green-700 dark:text-green-300">
                                                      Ran {minutes}:{seconds.toString().padStart(2, '0')}/mi faster than plan
                                                    </span>
                                                  );
                                                })()}
                                              </div>
                                            </div>
                                          )}
                                        </>
                                      )}
                                    </div>
                                  )}

                                  {/* Divider if both pace and HR exist */}
                                  {comparisonData.previousAvgPace && comparisonData.previousAvgHR && (
                                    <div className="border-t border-gray-600/50 my-2" />
                                  )}

                                  {/* Heart Rate Display (reference only, no variance) */}
                                  {comparisonData.previousAvgHR && (
                                    <div className="space-y-1">
                                      <div className="flex justify-between items-center">
                                        <span className="text-gray-600 dark:text-gray-400 text-xs">Previous Avg HR:</span>
                                        <span className="font-medium text-gray-900 dark:text-gray-200 text-sm">
                                          {comparisonData.previousAvgHR} bpm
                                        </span>
                                      </div>
                                      <div className="text-xs text-gray-600 dark:text-gray-400 italic mt-1">
                                        Reference data from previous race
                                      </div>
                                    </div>
                                  )}

                                  {/* Info message if no planned pace to compare against */}
                                  {comparisonData.previousAvgPace && !comparisonData.plannedPace && (
                                    <div className="text-xs text-gray-600 dark:text-gray-400 italic mt-2 border-t border-gray-300 dark:border-gray-600/50 pt-2">
                                      Set a planned pace for this segment to see comparison
                                    </div>
                                  )}
                                </div>
                              )}
                            </div>
                          );
                        })()}
                      </div>
                    </div>
                  </div>
                </div>
              </>
            );
          })}
        </div>
      )}

      {/* Nutrition Edit Modal */}
      {editingNutritionSegment && (
        <NutritionEditModal
          isOpen={true}
          onClose={() => setEditingNutritionSegment(null)}
          onSave={saveNutrition}
          initialNutritionPlan={editingNutritionSegment.nutrition_plan || undefined}
          initialCarbGoalPerHour={editingNutritionSegment.carb_goal_per_hour || undefined}
          initialSodiumGoalPerHour={editingNutritionSegment.sodium_goal_per_hour || undefined}
          initialWaterGoalPerHour={editingNutritionSegment.water_goal_per_hour || undefined}
          initialNutritionItems={editingNutritionSegment.segment_nutrition_items || undefined}
          segmentTimeHours={
            editingNutritionSegment.predicted_segment_time_minutes
              ? editingNutritionSegment.predicted_segment_time_minutes / 60
              : 0
          }
        />
      )}

      {/* Checkpoint Edit Modal */}
      {editingCheckpoint && (
        <CheckpointEditModal
          isOpen={true}
          onClose={() => setEditingCheckpoint(null)}
          onSave={saveCheckpointEdit}
          segment={editingCheckpoint}
        />
      )}
    </div>
  );
}
