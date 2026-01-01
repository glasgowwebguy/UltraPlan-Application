import { useEffect, useState, useMemo } from 'react';
import {
  ResponsiveContainer,
  ReferenceDot,
  Tooltip,
  XAxis,
  YAxis,
  CartesianGrid,
  Area,
  Line,
  ComposedChart,
  Legend
} from 'recharts';
import { Upload, Mountain, X, Plus, Eye, EyeOff, TrendingUp, Heart } from 'lucide-react';
import FatigueCurveControls from './FatigueCurveControls';
import { generateFatigueCurve, calculateTotalTimeWithFatigue } from '../utils/fatigueCurve';
import type { ElevationLabel, Segment, ParsedFITData } from '@/shared/types';
import { localStorageService } from '@/react-app/services/localStorage';
import { useUnit } from '@/react-app/contexts/UnitContext';
import { useTheme } from '../contexts/ThemeContext';
import { milesToKm, getDistanceUnit, getPaceUnit } from '@/react-app/utils/unitConversions';

interface ElevationChartProps {
  raceId: string;
  onUpload: (file: File) => Promise<void>;
  elevationLabels: ElevationLabel[];
  segments: Segment[];
  onRefresh: () => void;
  fitComparisonData?: ParsedFITData | null;
  onFITRemove?: () => Promise<void>;
  // Fatigue curve callbacks to sync with parent
  onFatigueSettingsChange?: (showFatigueCurve: boolean, fatigueRate: number) => void;
}

interface ElevationData {
  distance: number;
  elevation: number;
  lat: number;
  lng: number;
}

const chartColors = {
  dark: {
    primary: '#60a5fa',
    secondary: '#a78bfa',
    grid: '#374151',
    text: '#9ca3af',
  },
  light: {
    primary: '#3b82f6',
    secondary: '#8b5cf6',
    grid: '#e5e7eb',
    text: '#6b7280',
  },
  coloursplash: {
    primary: '#00AADD',      // splash-azure
    secondary: '#7CB342',    // splash-green
    tertiary: '#F7941D',     // splash-orange
    grid: '#e2e8f0',         // splash-border
    text: '#4a4a68',         // splash-text-secondary
    background: '#ffffff',
  },
};

export default function ElevationChart({
  raceId,
  onUpload,
  elevationLabels,
  segments,
  onRefresh,
  fitComparisonData,
  onFITRemove,
  onFatigueSettingsChange
}: ElevationChartProps) {
  const { useMiles } = useUnit();
  const { theme } = useTheme();
  const [elevationData, setElevationData] = useState<ElevationData[]>([]);
  const [comparisonElevationData, setComparisonElevationData] = useState<ElevationData[]>([]);
  const [loading, setLoading] = useState(false);
  const [hasGPX, setHasGPX] = useState(false);
  const [showLabelInput, setShowLabelInput] = useState(false);
  const [newLabelDistance, setNewLabelDistance] = useState(0);
  const [newLabelText, setNewLabelText] = useState('');
  const [showComparison, setShowComparison] = useState(false);
  const [isDragging, setIsDragging] = useState(false);

  // Chart overlay toggles
  const [showElevation, setShowElevation] = useState(true);
  const [showPlannedPace, setShowPlannedPace] = useState(false);
  const [showActualPace, setShowActualPace] = useState(false);
  const [showHeartRate, setShowHeartRate] = useState(false);

  // Fatigue curve state
  const [showFatigueCurve, setShowFatigueCurve] = useState(false);
  const [fatigueRate, setFatigueRate] = useState(3.0); // Default 3% per 10 miles

  // Get theme-aware colors
  const colors = chartColors[theme];

  const loadGPXData = async () => {
    try {
      console.log('[GPX] Loading GPX data for race:', raceId);

      // Get race to check for GPX file key
      const race = localStorageService.getRace(parseInt(raceId));
      console.log('[GPX] Race found:', race?.name, 'GPX key:', race?.gpx_file_key);

      if (!race || !race.gpx_file_key) {
        console.log('[GPX] No race or GPX file key found');
        setHasGPX(false);
        setElevationData([]);
        return;
      }

      // Get GPX file from local storage
      const gpxFile = localStorageService.getGPXFile(race.gpx_file_key);
      console.log('[GPX] GPX file retrieved:', gpxFile ? 'Yes' : 'No');

      if (!gpxFile) {
        console.log('[GPX] GPX file not found in localStorage');
        setHasGPX(false);
        setElevationData([]);
        return;
      }

      const gpxText = gpxFile.content;
      console.log('[GPX] GPX content length:', gpxText.length);
      setHasGPX(true);

      // Parse GPX using gpxparser
      let gpxParser;
      try {
        const module = await import('gpxparser');
        gpxParser = module.default || module;
      } catch (error) {
        console.error('[GPX] Error importing gpxparser:', error);
        throw error;
      }

      const gpx = new gpxParser();

      try {
        gpx.parse(gpxText);
        console.log('[GPX] GPX parsed successfully');
      } catch (parseError) {
        console.error('[GPX] Parse error:', parseError);
        console.log('[GPX] Trying alternative parsing...');

        // If the standard parse fails, try parsing the XML manually for track points
        const parser = new DOMParser();
        const xmlDoc = parser.parseFromString(gpxText, 'text/xml');
        const trkpts = xmlDoc.getElementsByTagName('trkpt');

        if (trkpts.length === 0) {
          throw new Error('No track points found in GPX file');
        }

        console.log('[GPX] Found track points via XML parsing:', trkpts.length);

        const data: ElevationData[] = [];
        let cumulativeDistance = 0;

        for (let i = 0; i < trkpts.length; i++) {
          const trkpt = trkpts[i];
          const lat = parseFloat(trkpt.getAttribute('lat') || '0');
          const lon = parseFloat(trkpt.getAttribute('lon') || '0');

          // Robust elevation parsing - handle empty, whitespace, or invalid values
          let elevation = 0;
          const eleNode = trkpt.getElementsByTagName('ele')[0];
          if (eleNode && eleNode.textContent) {
            const trimmed = eleNode.textContent.trim();
            if (trimmed && trimmed.toLowerCase() !== 'nan') {
              const parsed = parseFloat(trimmed);
              elevation = (isNaN(parsed) || !isFinite(parsed)) ? 0 : parsed;
            }
          }

          if (i > 0) {
            // Get previous lat/lon from the previous trkpt
            const prevTrkpt = trkpts[i - 1];
            const prevLat = parseFloat(prevTrkpt.getAttribute('lat') || '0');
            const prevLon = parseFloat(prevTrkpt.getAttribute('lon') || '0');
            const dist = calculateDistance(prevLat, prevLon, lat, lon);
            cumulativeDistance += dist;
          }

          data.push({
            distance: cumulativeDistance,
            elevation: elevation,
            lat: lat,
            lng: lon,
          });
        }

        console.log('[GPX] XML parsing complete. Data points:', data.length);
        console.log('[GPX] Total distance:', cumulativeDistance.toFixed(2), 'miles');
        console.log('[GPX] Sample elevation data with coordinates:', data.slice(0, 3).map(d => ({
          distance: d.distance.toFixed(2),
          elevation: d.elevation.toFixed(1),
          lat: d.lat.toFixed(6),
          lng: d.lng.toFixed(6)
        })));

        // Check for elevation variation
        const elevations = data.map(d => d.elevation);
        const minEle = Math.min(...elevations);
        const maxEle = Math.max(...elevations);
        const avgEle = elevations.reduce((a, b) => a + b, 0) / elevations.length;
        console.log('[GPX] Elevation stats:', {
          min: minEle.toFixed(1),
          max: maxEle.toFixed(1),
          avg: avgEle.toFixed(1),
          range: (maxEle - minEle).toFixed(1)
        });

        // DEBUG: Check for NaN values in elevation data
        const nanCount = data.filter(d => isNaN(d.elevation) || isNaN(d.distance) || !isFinite(d.elevation) || !isFinite(d.distance)).length;
        if (nanCount > 0) {
          console.error('[GPX] WARNING: Found', nanCount, 'points with NaN/Infinity values');
          data.filter(d => isNaN(d.elevation) || isNaN(d.distance) || !isFinite(d.elevation) || !isFinite(d.distance))
            .slice(0, 5)
            .forEach((d, i) => console.error('[GPX] Invalid point', i, ':', d));
        }

        // Verify coordinates are present
        const pointsWithValidCoords = data.filter(d => d.lat !== 0 && d.lng !== 0).length;
        console.log('[GPX] Points with valid coordinates:', pointsWithValidCoords, 'of', data.length);
        if (pointsWithValidCoords === 0) {
          console.error('[GPX] WARNING: No valid coordinates found in XML parsed GPX data!');
        }

        setElevationData(data);
        return;
      }

      console.log('[GPX] Parsed tracks:', gpx.tracks.length);

      if (gpx.tracks.length > 0 && gpx.tracks[0].points.length > 0) {
        const points = gpx.tracks[0].points;
        console.log('[GPX] Track points:', points.length);

        const data: ElevationData[] = [];
        let cumulativeDistance = 0;

        for (let i = 0; i < points.length; i++) {
          if (i > 0) {
            const prev = points[i - 1];
            const curr = points[i];
            const dist = calculateDistance(prev.lat, prev.lon, curr.lat, curr.lon);
            cumulativeDistance += dist;
          }

          // Robust elevation handling - ele could be undefined, null, NaN, or a number
          let elevation = 0;
          const rawEle = points[i].ele;
          if (typeof rawEle === 'number' && !isNaN(rawEle) && isFinite(rawEle)) {
            elevation = rawEle;
          } else if (typeof rawEle === 'string') {
            const parsed = parseFloat(rawEle);
            elevation = (isNaN(parsed) || !isFinite(parsed)) ? 0 : parsed;
          }

          // Ensure lat/lng are valid numbers
          const lat = typeof points[i].lat === 'number' && !isNaN(points[i].lat) ? points[i].lat : 0;
          const lng = typeof points[i].lon === 'number' && !isNaN(points[i].lon) ? points[i].lon : 0;

          data.push({
            distance: cumulativeDistance,
            elevation: elevation,
            lat: lat,
            lng: lng,  // Note: gpxparser uses 'lon', we convert to 'lng'
          });
        }

        console.log('[GPX] Parsed via gpxparser. Data points:', data.length);
        console.log('[GPX] Total distance:', cumulativeDistance.toFixed(2), 'miles');
        console.log('[GPX] Sample data with coordinates:', data.slice(0, 3).map(d => ({
          distance: d.distance.toFixed(2),
          elevation: d.elevation.toFixed(1),
          lat: d.lat?.toFixed(6),
          lng: d.lng?.toFixed(6)
        })));

        // Check for elevation variation
        const elevations = data.map(d => d.elevation);
        const minEle = Math.min(...elevations);
        const maxEle = Math.max(...elevations);
        const avgEle = elevations.reduce((a, b) => a + b, 0) / elevations.length;
        console.log('[GPX] Elevation stats:', {
          min: minEle.toFixed(1),
          max: maxEle.toFixed(1),
          avg: avgEle.toFixed(1),
          range: (maxEle - minEle).toFixed(1)
        });

        // DEBUG: Check for NaN values in elevation data
        const nanCount = data.filter(d => isNaN(d.elevation) || isNaN(d.distance) || !isFinite(d.elevation) || !isFinite(d.distance)).length;
        if (nanCount > 0) {
          console.error('[GPX] WARNING: Found', nanCount, 'points with NaN/Infinity values');
          data.filter(d => isNaN(d.elevation) || isNaN(d.distance) || !isFinite(d.elevation) || !isFinite(d.distance))
            .slice(0, 5)
            .forEach((d, i) => console.error('[GPX] Invalid point', i, ':', d));
        }

        // Verify coordinates are present
        const pointsWithCoords = data.filter(d => d.lat !== 0 && d.lng !== 0).length;
        console.log('[GPX] Points with valid coordinates:', pointsWithCoords, 'of', data.length);
        if (pointsWithCoords === 0) {
          console.error('[GPX] WARNING: No valid coordinates found in GPX data!');
        }

        setElevationData(data);
      } else {
        console.log('[GPX] No tracks or points found in GPX file');
        setElevationData([]);
      }
    } catch (error) {
      console.error('[GPX] Failed to load GPX:', error);
      setHasGPX(false);
      setElevationData([]);
    }
  };

  const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number) => {
    const R = 3959; // Earth radius in miles
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
      Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  };

  /**
   * Calculate geographic distance between two points using Haversine formula
   * Used for matching segments to elevation data points
   * Returns distance in miles
   */
  const calculateGeographicDistance = (lat1: number, lon1: number, lat2: number, lon2: number): number => {
    const R = 3959; // Earth radius in miles
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
      Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  };

  useEffect(() => {
    loadGPXData();
  }, [raceId, elevationLabels, segments]); // Reload when elevation labels or segments change

  // Notify parent when fatigue settings change
  useEffect(() => {
    if (onFatigueSettingsChange) {
      onFatigueSettingsChange(showFatigueCurve, fatigueRate);
    }
  }, [showFatigueCurve, fatigueRate, onFatigueSettingsChange]);

  // Process FIT comparison data when it changes
  useEffect(() => {
    if (!fitComparisonData || !fitComparisonData.records || fitComparisonData.records.length === 0) {
      setComparisonElevationData([]);
      return;
    }

    // Get the planned route distance
    const plannedDistance = elevationData.length > 0 ? elevationData[elevationData.length - 1].distance : 0;
    const fitDistance = fitComparisonData.totalDistance;

    console.log('[FIT] Planned distance:', plannedDistance.toFixed(2), 'miles');
    console.log('[FIT] FIT file distance:', fitDistance.toFixed(2), 'miles');

    // Check if distances are significantly different (more than 20% difference)
    const distanceDiffPercent = Math.abs(plannedDistance - fitDistance) / plannedDistance * 100;
    console.log('[FIT] Distance difference:', distanceDiffPercent.toFixed(1), '%');

    if (distanceDiffPercent > 20 && plannedDistance > 0) {
      console.warn('[FIT] Warning: FIT distance differs significantly from planned route');
      // Scale the FIT data to match the planned route distance
      const scaleFactor = plannedDistance / fitDistance;
      console.log('[FIT] Applying scale factor:', scaleFactor.toFixed(3));

      const fitElevationData: ElevationData[] = fitComparisonData.records.map(record => ({
        distance: record.distance * scaleFactor,
        elevation: record.elevation,
        lat: 0,  // FIT files don't have GPS coordinates
        lng: 0
      }));

      setComparisonElevationData(fitElevationData);
      console.log('[FIT] Scaled comparison elevation data:', fitElevationData.length, 'points');
    } else {
      // Use data as-is
      const fitElevationData: ElevationData[] = fitComparisonData.records.map(record => ({
        distance: record.distance,
        elevation: record.elevation,
        lat: 0,  // FIT files don't have GPS coordinates
        lng: 0
      }));

      setComparisonElevationData(fitElevationData);
      console.log('[FIT] Loaded comparison elevation data:', fitElevationData.length, 'points');
    }
  }, [fitComparisonData, elevationData]);

  // Calculate fatigue curve data if enabled
  const fatigueCurveData = useMemo(() => {
    if (!showFatigueCurve || segments.length === 0) return [];

    // Get base pace from first segment with custom pace
    const firstSegmentWithPace = segments.find(s => s.custom_pace_min_per_mile);
    if (!firstSegmentWithPace) return [];

    const basePace = firstSegmentWithPace.custom_pace_min_per_mile!;
    const totalDistance = elevationData.length > 0 ? elevationData[elevationData.length - 1].distance : 100;

    return generateFatigueCurve(basePace, totalDistance, fatigueRate);
  }, [showFatigueCurve, fatigueRate, segments, elevationData]);

  // Merge GPX and FIT data into single array for Recharts
  // Recharts requires all components to share the same data array
  const mergedChartData = useMemo(() => {
    if (!elevationData || elevationData.length === 0) {
      console.log('[ElevationChart] No elevation data available');
      return [];
    }

    console.log('[ElevationChart] Building merged chart data from', elevationData.length, 'elevation points');

    // Verify elevation data has coordinates
    const elevationWithCoords = elevationData.filter(p => p.lat && p.lng && p.lat !== 0 && p.lng !== 0);
    console.log('[ElevationChart] Elevation points with coordinates:', elevationWithCoords.length);

    // Calculate planned pace from segments
    const plannedPaceByDistance = new Map<number, number>();
    segments.forEach(segment => {
      const startDist = segment.cumulative_distance_miles - segment.segment_distance_miles;
      const endDist = segment.cumulative_distance_miles;
      const pace = segment.custom_pace_min_per_mile || 10; // default 10 min/mile

      // Fill in pace for this segment's distance range
      elevationData.forEach(point => {
        if (point.distance >= startDist && point.distance <= endDist) {
          plannedPaceByDistance.set(point.distance, pace);
        }
      });
    });

    // Find checkpoint markers to annotate in chart data
    const checkpointMarkers = new Map<number, string>();

    console.log('[ElevationChart] Building checkpoint markers from', segments.length, 'segments');

    // Check if we have valid coordinates in elevation data
    const elevationPointsWithCoords = elevationData.filter(p => p.lat && p.lng && p.lat !== 0 && p.lng !== 0);
    console.log('[ElevationChart] Elevation points with valid coords:', elevationPointsWithCoords.length, 'of', elevationData.length);

    segments.forEach((segment, idx) => {
      console.log(`[ElevationChart] Segment ${idx}:`, segment.checkpoint_name, {
        hasCoords: !!(segment.latitude && segment.longitude),
        lat: segment.latitude,
        lng: segment.longitude,
        cumulativeDistance: segment.cumulative_distance_miles
      });

      if (!segment.latitude || !segment.longitude) {
        // Fall back to distance-based matching if no GPS coordinates
        console.log(`[ElevationChart] Segment ${idx} has no GPS coords, using distance-based matching`);
        const targetDistance = segment.cumulative_distance_miles;
        let closestPoint = elevationData[0];
        let minDiff = Math.abs(elevationData[0]?.distance - targetDistance);

        for (const point of elevationData) {
          const diff = Math.abs(point.distance - targetDistance);
          if (diff < minDiff) {
            minDiff = diff;
            closestPoint = point;
          }
        }

        if (closestPoint) {
          console.log(`[ElevationChart] Distance match for ${segment.checkpoint_name}:`, {
            targetDist: targetDistance,
            matchedDist: closestPoint.distance,
            diff: minDiff
          });
          checkpointMarkers.set(closestPoint.distance, segment.checkpoint_name);
        }
        return;
      }

      let closestPoint: any = null;
      let minDistance = Infinity;

      for (const point of elevationData) {
        if (!point.lat || !point.lng || point.lat === 0 || point.lng === 0) continue;

        const geoDistance = calculateGeographicDistance(
          segment.latitude,
          segment.longitude,
          point.lat,
          point.lng
        );

        if (geoDistance < minDistance) {
          minDistance = geoDistance;
          closestPoint = point;
        }
      }

      if (closestPoint) {
        console.log(`[ElevationChart] GPS match for ${segment.checkpoint_name}:`, {
          geoDistance: (minDistance * 5280).toFixed(0) + ' feet',
          matchedDist: closestPoint.distance
        });
        checkpointMarkers.set(closestPoint.distance, segment.checkpoint_name);
      } else {
        console.warn(`[ElevationChart] No match found for ${segment.checkpoint_name}`);
      }
    });

    console.log('[ElevationChart] Total checkpoint markers created:', checkpointMarkers.size);

    // Build a sorted list of checkpoint distances for quick lookup
    const sortedCheckpoints = segments
      .map(seg => ({ distance: seg.cumulative_distance_miles, name: seg.checkpoint_name }))
      .sort((a, b) => a.distance - b.distance);

    // Build merged data, filtering out invalid elevation points but preserving coordinates
    const result = elevationData
      .filter(gpxPoint =>
        typeof gpxPoint.elevation === 'number' &&
        !isNaN(gpxPoint.elevation) &&
        isFinite(gpxPoint.elevation) &&
        typeof gpxPoint.distance === 'number' &&
        !isNaN(gpxPoint.distance) &&
        isFinite(gpxPoint.distance)
      )
      .map(gpxPoint => {
        // Find next checkpoint
        const nextCheckpoint = sortedCheckpoints.find(cp => cp.distance > gpxPoint.distance);
        const distanceToNextCheckpoint = nextCheckpoint ? nextCheckpoint.distance - gpxPoint.distance : null;

        // Calculate time to next checkpoint based on planned pace
        const currentPace = plannedPaceByDistance.get(gpxPoint.distance) || null;
        const timeToNextCheckpoint = (distanceToNextCheckpoint !== null && currentPace !== null)
          ? distanceToNextCheckpoint * currentPace
          : null;

        // Find fatigue curve pace if enabled
        let fatiguePace: number | null = null;
        if (showFatigueCurve && fatigueCurveData.length > 0) {
          const closestFatiguePoint = fatigueCurveData.reduce((prev, curr) =>
            Math.abs(curr.distance - gpxPoint.distance) < Math.abs(prev.distance - gpxPoint.distance) ? curr : prev
          );
          fatiguePace = closestFatiguePoint.expectedPace;
        }

        const dataPoint = {
          distance: gpxPoint.distance,
          plannedElevation: gpxPoint.elevation,
          previousElevation: null as number | null,
          plannedPace: currentPace,
          actualPace: null as number | null,
          heartRate: null as number | null,
          fatiguePace: fatiguePace,
          lat: gpxPoint.lat || 0,   // Ensure lat is always a number
          lng: gpxPoint.lng || 0,   // Ensure lng is always a number
          isCheckpoint: checkpointMarkers.has(gpxPoint.distance),
          checkpointName: checkpointMarkers.get(gpxPoint.distance) || null,
          nextCheckpointName: nextCheckpoint?.name || null,
          distanceToNextCheckpoint: distanceToNextCheckpoint,
          timeToNextCheckpoint: timeToNextCheckpoint,
        };

        // Add comparison elevation if available
        if (showComparison && comparisonElevationData && comparisonElevationData.length > 0) {
          let closestFitElevation: number | null = null;
          let minDistance = Infinity;

          comparisonElevationData.forEach(fitPoint => {
            const distDiff = Math.abs(fitPoint.distance - gpxPoint.distance);
            if (distDiff < minDistance && distDiff <= 0.1) {
              minDistance = distDiff;
              closestFitElevation = fitPoint.elevation;
            }
          });

          dataPoint.previousElevation = closestFitElevation;
        }

        // Add FIT pace and heart rate data
        if (fitComparisonData?.records) {
          let closestPace: number | null = null;
          let closestHR: number | null = null;
          let minDistance = Infinity;

          fitComparisonData.records.forEach(record => {
            const distDiff = Math.abs(record.distance - gpxPoint.distance);
            if (distDiff < minDistance && distDiff <= 0.1) {
              minDistance = distDiff;
              closestPace = record.pace || null;
              closestHR = record.heartRate || null;
            }
          });

          dataPoint.actualPace = closestPace;
          dataPoint.heartRate = closestHR;
        }

        return dataPoint;
      });

    console.log('[ElevationChart] Merged chart data created:', result.length, 'points');
    if (showFatigueCurve) {
      console.log('[ElevationChart] Fatigue curve data points:', fatigueCurveData.length);
    }

    // Log sample to verify coordinates
    if (result.length > 0) {
      const sample = result.slice(0, 3);
      console.log('[ElevationChart] Merged data sample:', sample.map(p => ({
        dist: p.distance?.toFixed(2),
        ele: p.plannedElevation?.toFixed(1),
        lat: p.lat,
        lng: p.lng
      })));
    }

    return result;
  }, [elevationData, comparisonElevationData, showComparison, fitComparisonData, segments, showFatigueCurve, fatigueCurveData]);

  // Compute checkpoint marker data for Scatter rendering
  const checkpointScatterData = useMemo(() => {
    console.log('[ElevationChart] Computing checkpoint scatter data...');
    console.log('[ElevationChart] mergedChartData length:', mergedChartData.length);
    console.log('[ElevationChart] segments length:', segments.length);

    if (mergedChartData.length === 0 || segments.length === 0) {
      console.log('[ElevationChart] No data for checkpoint markers');
      return [];
    }

    // Verify that mergedChartData has coordinates
    const samplePoints = mergedChartData.slice(0, 5);
    console.log('[ElevationChart] Sample merged data:', samplePoints.map(p => ({
      distance: p.distance?.toFixed(2),
      elevation: p.plannedElevation?.toFixed(1),
      lat: p.lat,
      lng: p.lng,
      hasCoords: !!(p.lat && p.lng && p.lat !== 0 && p.lng !== 0)
    })));

    const pointsWithCoords = mergedChartData.filter(p =>
      p.lat && p.lng && p.lat !== 0 && p.lng !== 0 &&
      !isNaN(p.lat) && !isNaN(p.lng)
    ).length;
    console.log('[ElevationChart] Points with valid coordinates:', pointsWithCoords, 'of', mergedChartData.length);

    const data: Array<{ distance: number; elevation: number; name: string; id: number }> = [];

    segments.forEach((segment, index) => {
      console.log(`[ElevationChart] Processing segment ${index + 1}:`, segment.checkpoint_name);
      console.log('[ElevationChart] Segment coordinates:', { lat: segment.latitude, lng: segment.longitude });
      console.log('[ElevationChart] Segment cumulative_distance_miles:', segment.cumulative_distance_miles);

      let closestPoint = mergedChartData[0];
      let matchMethod = 'none';

      // Try coordinate-based matching first (if segment has GPS coordinates AND chart data has coordinates)
      if (segment.latitude && segment.longitude && pointsWithCoords > 0) {
        let minDistance = Infinity;

        // Find the first valid point to initialize
        for (const point of mergedChartData) {
          if (point.lat && point.lng && point.lat !== 0 && point.lng !== 0) {
            minDistance = calculateGeographicDistance(
              segment.latitude,
              segment.longitude,
              point.lat,
              point.lng
            );
            closestPoint = point;
            break;
          }
        }

        for (const point of mergedChartData) {
          if (point.plannedElevation == null || isNaN(point.plannedElevation)) continue;
          if (!point.lat || !point.lng || point.lat === 0 || point.lng === 0) continue;

          const geoDistance = calculateGeographicDistance(
            segment.latitude,
            segment.longitude,
            point.lat,
            point.lng
          );

          if (geoDistance < minDistance) {
            minDistance = geoDistance;
            closestPoint = point;
          }
        }

        matchMethod = 'coordinates';
        console.log('[ElevationChart] Coordinate match result:', {
          name: segment.checkpoint_name,
          closestDistance: closestPoint.distance?.toFixed(2),
          closestElevation: closestPoint.plannedElevation?.toFixed(1),
          geoDistance: (minDistance * 5280).toFixed(0) + ' feet', // Convert miles to feet
        });
      }
      // Fall back to distance-based matching
      else {
        const checkpointDistance = segment.cumulative_distance_miles;

        if (typeof checkpointDistance !== 'number' || isNaN(checkpointDistance)) {
          console.warn('[ElevationChart] Invalid checkpoint distance:', segment.checkpoint_name, checkpointDistance);
          return;
        }

        let minDiff = Math.abs((mergedChartData[0]?.distance || 0) - checkpointDistance);

        for (const point of mergedChartData) {
          if (point.plannedElevation == null || isNaN(point.plannedElevation)) continue;
          const diff = Math.abs(point.distance - checkpointDistance);
          if (diff < minDiff) {
            minDiff = diff;
            closestPoint = point;
          }
        }

        matchMethod = 'distance';
        console.log('[ElevationChart] Distance match result:', {
          name: segment.checkpoint_name,
          targetDistance: checkpointDistance?.toFixed(2),
          closestDistance: closestPoint.distance?.toFixed(2),
          closestElevation: closestPoint.plannedElevation?.toFixed(1),
          distanceDiff: minDiff?.toFixed(4) + ' miles',
        });
      }

      if (closestPoint && closestPoint.plannedElevation != null && !isNaN(closestPoint.plannedElevation)) {
        console.log('[ElevationChart] ✅ Adding checkpoint marker:', segment.checkpoint_name, {
          x: closestPoint.distance,
          y: closestPoint.plannedElevation,
          method: matchMethod
        });
        data.push({
          distance: closestPoint.distance,
          elevation: closestPoint.plannedElevation,  // Elevation in meters - will be displayed by ReferenceDot
          name: segment.checkpoint_name,
          id: segment.id!
        });
      } else {
        console.warn('[ElevationChart] ❌ Could not find valid point for checkpoint:', segment.checkpoint_name);
      }
    });

    console.log('[ElevationChart] Total checkpoint markers created:', data.length);
    console.log('[ElevationChart] Checkpoint data for rendering:', data);

    // Log a sample of mergedChartData distances to compare
    if (mergedChartData.length > 0) {
      const sampleDistances = mergedChartData.slice(0, 10).map(p => p.distance.toFixed(4));
      console.log('[ElevationChart] Sample mergedChartData distances:', sampleDistances);
    }

    // Log detailed info about each checkpoint marker
    data.forEach((cp, idx) => {
      console.log(`[ElevationChart] Checkpoint ${idx}:`, {
        name: cp.name,
        distance: cp.distance?.toFixed(2),
        elevation: cp.elevation?.toFixed(1),
        id: cp.id
      });
    });

    return data;
  }, [mergedChartData, segments, useMiles]);

  // Compute elevation label data for ReferenceDot rendering
  const labelScatterData = useMemo(() => {
    if (mergedChartData.length === 0 || elevationLabels.length === 0) {
      return [];
    }

    const data: Array<{ distance: number; elevation: number; name: string; id: number }> = [];

    elevationLabels.forEach((label) => {
      const labelDistance = label.distance_miles;

      if (typeof labelDistance !== 'number' || isNaN(labelDistance)) {
        return;
      }

      let closestPoint = mergedChartData[0];
      let minDiff = Math.abs((mergedChartData[0]?.distance || 0) - labelDistance);

      for (const point of mergedChartData) {
        if (point.plannedElevation == null || isNaN(point.plannedElevation)) continue;
        const diff = Math.abs(point.distance - labelDistance);
        if (diff < minDiff) {
          minDiff = diff;
          closestPoint = point;
        }
      }

      if (closestPoint && closestPoint.plannedElevation != null) {
        data.push({
          distance: closestPoint.distance,
          elevation: closestPoint.plannedElevation,
          name: label.label,
          id: label.id!
        });
      }
    });

    return data;
  }, [mergedChartData, elevationLabels]);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setLoading(true);
    try {
      await onUpload(file);
      await loadGPXData();
    } catch (error) {
      console.error('Failed to upload GPX:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDrop = async (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    const files = e.dataTransfer.files;
    if (files.length === 0) return;

    const file = files[0];
    if (!file.name.endsWith('.gpx')) {
      console.error('Invalid file type. Please drop a GPX file.');
      return;
    }

    setLoading(true);
    try {
      await onUpload(file);
      await loadGPXData();
    } catch (error) {
      console.error('Failed to upload GPX:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleFITRemove = async () => {
    if (!onFITRemove) return;

    try {
      setShowComparison(false);
      await onFITRemove();
    } catch (error) {
      console.error('Failed to remove FIT file:', error);
    }
  };

  const handleChartClick = (e: any) => {
    if (e && e.activeLabel !== undefined) {
      setNewLabelDistance(e.activeLabel);
      setShowLabelInput(true);
    }
  };

  const handleAddLabel = async () => {
    if (!newLabelText.trim()) return;

    try {
      localStorageService.createElevationLabel({
        race_id: parseInt(raceId),
        distance_miles: newLabelDistance,
        label: newLabelText,
      });

      setNewLabelText('');
      setShowLabelInput(false);
      onRefresh();
    } catch (error) {
      console.error('Failed to add label:', error);
    }
  };

  const handleDeleteLabel = async (labelId: number) => {
    try {
      localStorageService.deleteElevationLabel(labelId);
      onRefresh();
    } catch (error) {
      console.error('Failed to delete label:', error);
    }
  };

  const stats = elevationData.length > 0 ? {
    maxElevation: Math.max(...elevationData.map(d => d.elevation)),
    minElevation: Math.min(...elevationData.map(d => d.elevation)),
    totalDistance: elevationData[elevationData.length - 1]?.distance || 0,
    totalElevationGain: elevationData.reduce((gain, point, index) => {
      if (index === 0) return 0;
      const elevationChange = point.elevation - elevationData[index - 1].elevation;
      return gain + (elevationChange > 0 ? elevationChange : 0);
    }, 0),
  } : null;



  return (
    <div className="bg-white dark:bg-[#2d3548] coloursplash:bg-white rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 coloursplash:border-splash-border p-6">
      <div className="flex justify-between items-center mb-6">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-gradient-to-br from-purple-500 to-pink-600 dark:from-blue-500 dark:to-purple-500 coloursplash:from-splash-green coloursplash:to-splash-green-hover rounded-lg">
            <Mountain className="w-5 h-5 text-white" />
          </div>
          <h3 className="text-lg font-bold text-gray-900 dark:text-white coloursplash:text-splash-text-primary">Elevation Profile</h3>
        </div>

        <div className="flex items-center gap-3">
          <label className="inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-purple-500 to-pink-600 hover:from-purple-600 hover:to-pink-700 dark:from-blue-500 dark:to-purple-600 dark:hover:from-blue-600 dark:hover:to-purple-700 coloursplash:from-splash-green coloursplash:to-splash-green-hover coloursplash:hover:from-splash-green-hover coloursplash:hover:to-splash-green text-white text-sm font-semibold rounded-lg transition-all cursor-pointer shadow-lg hover:shadow-xl">
            <Upload className="w-4 h-4" />
            {loading ? 'Uploading...' : hasGPX ? 'Update GPX' : 'Upload GPX'}
            <input
              type="file"
              accept=".gpx"
              onChange={handleFileUpload}
              disabled={loading}
              className="hidden"
            />
          </label>

          {/* FIT Comparison Toggle - Only show when there's comparison data */}
          {fitComparisonData && fitComparisonData.records && fitComparisonData.records.length > 0 && (
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-400 max-w-[150px] truncate">
                {fitComparisonData.fileName}
              </span>
              <button
                onClick={() => setShowComparison(!showComparison)}
                className={`p-2 rounded transition-colors ${showComparison
                  ? 'bg-blue-600 text-white'
                  : 'bg-slate-700 text-gray-400 hover:bg-slate-600'
                  }`}
                title={showComparison ? 'Hide comparison' : 'Show comparison'}
              >
                {showComparison ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
              </button>
              <button
                onClick={handleFITRemove}
                className="p-2 bg-slate-700 text-gray-400 hover:bg-red-600 hover:text-white rounded transition-colors"
                title="Remove comparison file"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>
      </div>

      {elevationData.length === 0 ? (
        <div
          className={`text-center py-16 border-2 border-dashed rounded-lg transition-colors ${isDragging
            ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20 coloursplash:bg-splash-azure-light coloursplash:border-splash-azure'
            : 'border-gray-300 dark:border-gray-700 coloursplash:border-splash-border bg-gray-50 dark:bg-[#1e2639] coloursplash:bg-white'
            }`}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
        >
          <Mountain className="w-16 h-16 text-gray-400 dark:text-gray-500 coloursplash:text-splash-text-secondary mx-auto mb-4" />
          <p className="text-gray-700 dark:text-gray-300 coloursplash:text-splash-text-primary font-medium mb-2">No elevation data yet</p>
          <p className="text-sm text-gray-600 dark:text-gray-500 coloursplash:text-splash-text-secondary mb-6">Upload a GPX file to visualize the elevation profile</p>
          <p className="text-base text-gray-500 dark:text-gray-400 coloursplash:text-splash-text-secondary font-medium">
            {isDragging ? 'Drop GPX file here' : 'Drag and drop GPX file'}
          </p>
        </div>
      ) : (
        <>
          {stats && (
            <div className="grid grid-cols-3 gap-4 mb-6">
              <div className="bg-gray-100 dark:bg-[#3a4458] coloursplash:bg-white rounded-lg p-4 border border-gray-200 dark:border-gray-700 coloursplash:border-splash-border">
                <div className="text-xs text-blue-600 dark:text-blue-400 coloursplash:text-splash-azure font-medium mb-1">Max Elevation</div>
                <div className="text-2xl font-bold text-gray-900 dark:text-white coloursplash:text-splash-text-primary">
                  {useMiles ? Math.round(stats.maxElevation * 3.28084) : Math.round(stats.maxElevation)}
                  <span className="text-sm font-normal text-gray-600 dark:text-gray-400 coloursplash:text-splash-text-secondary ml-1">{useMiles ? 'feet' : 'metres'}</span>
                </div>
              </div>
              <div className="bg-gray-100 dark:bg-[#3a4458] coloursplash:bg-white rounded-lg p-4 border border-gray-200 dark:border-gray-700 coloursplash:border-splash-border">
                <div className="text-xs text-green-600 dark:text-green-400 coloursplash:text-splash-green font-medium mb-1">Min Elevation</div>
                <div className="text-2xl font-bold text-gray-900 dark:text-white coloursplash:text-splash-text-primary">
                  {useMiles ? Math.round(stats.minElevation * 3.28084) : Math.round(stats.minElevation)}
                  <span className="text-sm font-normal text-gray-600 dark:text-gray-400 coloursplash:text-splash-text-secondary ml-1">{useMiles ? 'feet' : 'metres'}</span>
                </div>
              </div>
              <div className="bg-gray-100 dark:bg-[#3a4458] coloursplash:bg-white rounded-lg p-4 border border-gray-200 dark:border-gray-700 coloursplash:border-splash-border">
                <div className="text-xs text-purple-600 dark:text-purple-400 coloursplash:text-splash-orange font-medium mb-1">Total Elevation Gain</div>
                <div className="text-2xl font-bold text-gray-900 dark:text-white coloursplash:text-splash-text-primary">
                  {useMiles ? Math.round(stats.totalElevationGain * 3.28084) : Math.round(stats.totalElevationGain)}
                  <span className="text-sm font-normal text-gray-600 dark:text-gray-400 coloursplash:text-splash-text-secondary ml-1">{useMiles ? 'feet' : 'metres'}</span>
                </div>
              </div>
            </div>
          )}

          {/* Legend - Only show when comparison is active AND has valid data */}
          {showComparison && fitComparisonData && comparisonElevationData.length > 0 && (
            <div className="mb-4 flex items-center gap-4 text-sm text-gray-700 dark:text-gray-300 coloursplash:text-splash-text-primary bg-purple-500/10 coloursplash:bg-splash-azure/10 rounded-lg p-3 border border-purple-500/30 coloursplash:border-splash-azure/30">
              <div className="flex items-center gap-2">
                <div className="w-8 h-0.5 bg-blue-500 coloursplash:bg-splash-azure"></div>
                <span>Planned Route</span>
              </div>
              <div className="flex items-center gap-2">
                <svg width="32" height="2">
                  <line x1="0" y1="1" x2="32" y2="1" stroke="#ef4444" strokeWidth="2" strokeDasharray="5 5" />
                </svg>
                <span>Previous Race</span>
              </div>
            </div>
          )}

          <div className="mb-4 text-sm text-gray-700 dark:text-gray-300 coloursplash:text-splash-text-primary bg-blue-500/10 coloursplash:bg-splash-azure/10 rounded-lg p-3 border border-blue-500/30 coloursplash:border-splash-azure/30">
            <span className="font-semibold text-blue-400 coloursplash:text-splash-azure">💡 Tip:</span> Click anywhere on the elevation chart to add a label
          </div>

          {showLabelInput && (
            <div className="mb-4 bg-gradient-to-r from-red-500/10 to-pink-500/10 coloursplash:from-splash-orange/10 coloursplash:to-splash-orange/10 rounded-lg p-4 border border-red-500/30 coloursplash:border-splash-orange/30">
              <div className="flex items-center gap-3">
                <div className="flex-1">
                  <div className="text-sm font-semibold text-gray-700 dark:text-gray-300 coloursplash:text-splash-text-primary mb-2">
                    Add label at {(useMiles ? newLabelDistance : milesToKm(newLabelDistance)).toFixed(2)} {getDistanceUnit(useMiles)}
                  </div>
                  <input
                    type="text"
                    value={newLabelText}
                    onChange={(e) => setNewLabelText(e.target.value)}
                    placeholder="Enter label text..."
                    className="w-full px-3 py-2 bg-gray-50 dark:bg-[#3a4458] coloursplash:bg-white border border-gray-300 dark:border-gray-600 coloursplash:border-splash-border text-gray-900 dark:text-white coloursplash:text-splash-text-primary placeholder-gray-400 dark:placeholder-gray-500 coloursplash:placeholder-splash-text-secondary rounded-lg focus:ring-2 focus:ring-red-500 coloursplash:focus:ring-splash-orange focus:border-transparent"
                    onKeyDown={(e) => e.key === 'Enter' && handleAddLabel()}
                    autoFocus
                  />
                </div>
                <button
                  onClick={handleAddLabel}
                  className="px-4 py-2 bg-red-600 text-white font-semibold rounded-lg hover:bg-red-700 transition-all"
                >
                  <Plus className="w-5 h-5" />
                </button>
                <button
                  onClick={() => setShowLabelInput(false)}
                  className="px-3 py-2 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-[#3a4458] rounded-lg transition-all"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>
          )}

          {elevationLabels.length > 0 && (
            <div className="mb-4 flex flex-wrap gap-2">
              {elevationLabels.map((label) => (
                <div
                  key={label.id}
                  className="inline-flex items-center gap-2 px-3 py-1.5 bg-red-500/20 text-red-400 rounded-full text-sm font-medium border border-red-500/30"
                >
                  <span className="font-bold">
                    {(useMiles ? label.distance_miles : milesToKm(label.distance_miles)).toFixed(2)}{getDistanceUnit(useMiles)}:
                  </span>
                  <span>{label.label}</span>
                  <button
                    onClick={() => handleDeleteLabel(label.id!)}
                    className="text-red-400 hover:text-red-300 transition-colors"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* Chart Overlay Controls */}
          <div className="mb-4 flex flex-wrap items-center gap-3 bg-gray-100 dark:bg-[#3a4458] coloursplash:bg-white rounded-lg p-3 border border-gray-200 dark:border-gray-700 coloursplash:border-splash-border">
            <span className="text-sm font-semibold text-gray-700 dark:text-gray-300 coloursplash:text-splash-text-primary mr-2">Chart Overlays:</span>

            <button
              onClick={() => setShowElevation(!showElevation)}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${showElevation
                ? 'bg-blue-600 text-white'
                : 'bg-gray-700 text-gray-400 hover:bg-gray-600'
                }`}
            >
              <Mountain className="w-4 h-4" />
              Elevation
            </button>

            {fitComparisonData?.records && (
              <>
                <button
                  onClick={() => setShowPlannedPace(!showPlannedPace)}
                  className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${showPlannedPace
                    ? 'bg-green-600 text-white'
                    : 'bg-gray-700 text-gray-400 hover:bg-gray-600'
                    }`}
                >
                  <TrendingUp className="w-4 h-4" />
                  Planned Pace
                </button>

                <button
                  onClick={() => setShowActualPace(!showActualPace)}
                  className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${showActualPace
                    ? 'bg-cyan-600 text-white'
                    : 'bg-gray-700 text-gray-400 hover:bg-gray-600'
                    }`}
                >
                  <TrendingUp className="w-4 h-4" />
                  Actual Pace
                </button>

                <button
                  onClick={() => setShowHeartRate(!showHeartRate)}
                  className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${showHeartRate
                    ? 'bg-red-400 text-white'
                    : 'bg-gray-700 text-gray-400 hover:bg-gray-600'
                    }`}
                >
                  <Heart className="w-4 h-4" />
                  Heart Rate
                </button>
              </>
            )}
          </div>

          {/* Fatigue Curve Controls */}
          <div className="mb-4">
            <FatigueCurveControls
              fatigueFactor={fatigueRate}
              onChange={setFatigueRate}
              showOnChart={showFatigueCurve}
              onToggleShow={() => setShowFatigueCurve(!showFatigueCurve)}
            />
          </div>

          <div className="h-80 cursor-crosshair bg-gray-50 dark:bg-[#1e2639] coloursplash:bg-white rounded-lg p-4 print-chart">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart
                data={mergedChartData}
                onClick={handleChartClick}
                margin={{ top: 5, right: (showHeartRate && (showPlannedPace || showActualPace)) ? 90 : 20, left: 5, bottom: 5 }}
              >
                <defs>
                  <linearGradient id="elevationGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={colors.primary} stopOpacity={0.4} />
                    <stop offset="95%" stopColor={colors.primary} stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke={colors.grid} className="print-grid" />

                {/* X-Axis: Distance */}
                <XAxis
                  dataKey="distance"
                  label={{ value: `Distance (${useMiles ? 'miles' : 'kilometers'})`, position: 'insideBottom', offset: -5, fill: colors.text, className: 'print-text' }}
                  stroke={colors.text}
                  tick={{ fill: colors.text, className: 'print-text' }}
                  tickFormatter={(value) => (useMiles ? value : milesToKm(value)).toFixed(1)}
                  className="print-axis"
                />

                {/* Y-Axis 1 (Left): Elevation */}
                {showElevation && (
                  <YAxis
                    yAxisId="elevation"
                    label={{ value: `Elevation (${useMiles ? 'ft' : 'm'})`, angle: -90, position: 'insideLeft', fill: colors.primary, className: 'print-text' }}
                    stroke={colors.primary}
                    tick={{ fill: colors.primary, className: 'print-text' }}
                    tickFormatter={(value) => Math.round(useMiles ? value * 3.28084 : value).toString()}
                    className="print-axis"
                  />
                )}

                {/* Y-Axis 2 (Right): Pace */}
                {(showPlannedPace || showActualPace || showFatigueCurve) && (
                  <YAxis
                    yAxisId="pace"
                    orientation="right"
                    width={60}
                    label={{ value: `Pace (min${getPaceUnit(useMiles)})`, angle: 90, position: 'insideRight', fill: colors.secondary, className: 'print-text' }}
                    stroke={colors.secondary}
                    tick={{ fill: colors.secondary, className: 'print-text' }}
                    tickFormatter={(value) => `${Math.floor(value)}:${Math.round((value % 1) * 60).toString().padStart(2, '0')}`}
                    className="print-axis"
                    domain={['auto', 'auto']}
                  />
                )}

                {/* Y-Axis 3 (Right-2): Heart Rate */}
                {showHeartRate && (
                  <YAxis
                    yAxisId="heartRate"
                    orientation="right"
                    width={(showPlannedPace || showActualPace) ? 65 : 60}
                    axisLine={!(showPlannedPace || showActualPace)}
                    label={{ value: 'HR (bpm)', angle: 90, position: 'insideRight', fill: theme === 'coloursplash' ? '#F7941D' : '#f87171', className: 'print-text', dy: (showPlannedPace || showActualPace) ? 40 : 0 }}
                    stroke={theme === 'coloursplash' ? '#F7941D' : '#f87171'}
                    tick={{ fill: theme === 'coloursplash' ? '#F7941D' : '#f87171', className: 'print-text' }}
                    className="print-axis"
                    domain={[60, 200]}
                  />
                )}

                <Tooltip
                  contentStyle={{
                    backgroundColor: theme === 'coloursplash' ? '#ffffff' : '#2d3548',
                    border: theme === 'coloursplash' ? '1px solid #e2e8f0' : '1px solid #4b5563',
                    borderRadius: '0.5rem',
                    boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.3)',
                    color: theme === 'coloursplash' ? '#1e1e3f' : '#fff'
                  }}
                  content={(props: any) => {
                    if (!props.active || !props.payload || props.payload.length === 0) return null;

                    const data = props.payload[0].payload;
                    const distance = data.distance;

                    // Calculate gradient and difficulty
                    let gradient = 0;
                    let difficulty = 'Flat/Rolling';

                    if (mergedChartData.length > 1) {
                      // Find the current point and adjacent points for gradient calculation
                      const currentIndex = mergedChartData.findIndex(p => Math.abs(p.distance - distance) < 0.01);

                      if (currentIndex > 0 && currentIndex < mergedChartData.length - 1) {
                        const prevPoint = mergedChartData[currentIndex - 5 < 0 ? 0 : currentIndex - 5];
                        const nextPoint = mergedChartData[currentIndex + 5 >= mergedChartData.length ? mergedChartData.length - 1 : currentIndex + 5];

                        const elevChange = (nextPoint.plannedElevation || 0) - (prevPoint.plannedElevation || 0);
                        const distChange = (nextPoint.distance - prevPoint.distance) * 1609.34; // Convert miles to meters

                        if (distChange > 0) {
                          gradient = (elevChange / distChange) * 100; // Percentage grade

                          // Classify difficulty with user-friendly effort-based labels
                          const absGradient = Math.abs(gradient);
                          const elevGainFeet = Math.max(0, elevChange * 3.28084);

                          // Downhill classifications (negative gradient)
                          if (gradient < -10) difficulty = 'Hard Descent';
                          else if (gradient < -5) difficulty = 'Medium Descent';
                          else if (gradient < -1) difficulty = 'Easy Descent';
                          // Flat terrain
                          else if (elevGainFeet < 50 && absGradient < 1) difficulty = 'Easy Flat';
                          // Uphill classifications
                          else if (absGradient >= 15) difficulty = 'Very Hard Climb';
                          else if (absGradient >= 10) difficulty = 'Hard Climb';
                          else if (absGradient >= 6) difficulty = 'Medium Climb';
                          else if (absGradient >= 3) difficulty = 'Easy Climb';
                          else if (absGradient >= 1) difficulty = 'Easy Rolling';
                          else difficulty = 'Easy Flat';
                        }
                      }
                    }

                    return (
                      <div style={{
                        backgroundColor: theme === 'coloursplash' ? '#ffffff' : '#2d3548',
                        border: theme === 'coloursplash' ? '1px solid #e2e8f0' : '1px solid #4b5563',
                        borderRadius: '0.5rem',
                        boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.3)',
                        padding: '12px',
                        color: theme === 'coloursplash' ? '#1e1e3f' : '#fff'
                      }}>
                        <div style={{ marginBottom: '8px', fontWeight: 'bold', color: theme === 'coloursplash' ? '#4a4a68' : '#9ca3af' }}>
                          {(useMiles ? distance : milesToKm(distance)).toFixed(2)} {useMiles ? 'miles' : 'km'}
                        </div>

                        {/* Elevation */}
                        {data.plannedElevation != null && (
                          <div style={{ marginBottom: '4px' }}>
                            <span style={{ color: colors.primary }}>Elevation: </span>
                            {useMiles
                              ? `${Math.round(data.plannedElevation * 3.28084)} ft (${Math.round(data.plannedElevation)} m)`
                              : `${Math.round(data.plannedElevation)} m (${Math.round(data.plannedElevation * 3.28084)} ft)`
                            }
                          </div>
                        )}

                        {/* Gradient */}
                        {data.plannedElevation != null && (
                          <div style={{ marginBottom: '4px' }}>
                            <span style={{ color: colors.primary }}>Avg Gradient: </span>
                            {gradient.toFixed(1)}%
                          </div>
                        )}

                        {/* Difficulty */}
                        {data.plannedElevation != null && (
                          <div style={{ marginBottom: '4px' }}>
                            <span style={{ color: colors.primary }}>Difficulty: </span>
                            {difficulty}
                          </div>
                        )}

                        {/* Previous Race Elevation */}
                        {data.previousElevation != null && (
                          <div style={{ marginBottom: '4px' }}>
                            <span style={{ color: '#ef4444' }}>Previous Race: </span>
                            {useMiles
                              ? `${Math.round(data.previousElevation * 3.28084)} ft (${Math.round(data.previousElevation)} m)`
                              : `${Math.round(data.previousElevation)} m (${Math.round(data.previousElevation * 3.28084)} ft)`
                            }
                          </div>
                        )}

                        {/* Planned Pace */}
                        {data.plannedPace != null && (
                          <div style={{ marginBottom: '4px' }}>
                            <span style={{ color: colors.secondary }}>Planned Pace: </span>
                            {Math.floor(data.plannedPace)}:{Math.round((data.plannedPace % 1) * 60).toString().padStart(2, '0')}{getPaceUnit(useMiles)}
                          </div>
                        )}

                        {/* Actual Pace */}
                        {data.actualPace != null && (
                          <div style={{ marginBottom: '4px' }}>
                            <span style={{ color: theme === 'coloursplash' ? '#7CB342' : '#06b6d4' }}>Actual Pace: </span>
                            {Math.floor(data.actualPace)}:{Math.round((data.actualPace % 1) * 60).toString().padStart(2, '0')}{getPaceUnit(useMiles)}
                          </div>
                        )}

                        {/* Heart Rate */}
                        {data.heartRate != null && (
                          <div style={{ marginBottom: '4px' }}>
                            <span style={{ color: theme === 'coloursplash' ? '#F7941D' : '#f87171' }}>Heart Rate: </span>
                            {Math.round(data.heartRate)} bpm
                          </div>
                        )}

                        {/* Next Checkpoint */}
                        {data.nextCheckpointName && data.distanceToNextCheckpoint != null && (
                          <div style={{ marginTop: '8px', paddingTop: '8px', borderTop: '1px solid ' + (theme === 'coloursplash' ? '#e2e8f0' : '#4b5563') }}>
                            <div style={{ fontWeight: 'bold', marginBottom: '4px' }}>
                              Next: {data.nextCheckpointName}
                            </div>
                            <div style={{ fontSize: '0.875rem' }}>
                              Distance: {(useMiles ? data.distanceToNextCheckpoint : milesToKm(data.distanceToNextCheckpoint)).toFixed(2)} {useMiles ? 'mi' : 'km'}
                            </div>
                            {data.timeToNextCheckpoint != null && (
                              <div style={{ fontSize: '0.875rem' }}>
                                Est. Time: {Math.floor(data.timeToNextCheckpoint / 60)}h {Math.round(data.timeToNextCheckpoint % 60)}m
                              </div>
                            )}
                          </div>
                        )}

                        {/* Estimated Finish Time (Fatigue Adjusted) - Only show when fatigue curve is enabled */}
                        {showFatigueCurve && data.plannedPace != null && (() => {
                          // Calculate remaining distance to finish
                          const totalRaceDistance = mergedChartData[mergedChartData.length - 1]?.distance || 0;
                          const currentDistance = data.distance;
                          const remainingDistance = totalRaceDistance - currentDistance;

                          if (remainingDistance <= 0) return null;

                          // Get base pace from current segment
                          const basePace = data.plannedPace;

                          // Calculate fatigue-adjusted estimated finish time from current position
                          const fatigueAdjustedTime = calculateTotalTimeWithFatigue(
                            basePace,
                            remainingDistance,
                            fatigueRate
                          );

                          const hours = Math.floor(fatigueAdjustedTime / 60);
                          const minutes = Math.round(fatigueAdjustedTime % 60);

                          return (
                            <div style={{ marginTop: '8px', paddingTop: '8px', borderTop: '1px solid ' + (theme === 'coloursplash' ? '#e2e8f0' : '#4b5563') }}>
                              <div style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '4px',
                                marginBottom: '4px'
                              }}>
                                <span style={{ color: '#f97316', fontWeight: 'bold' }}>⏱️ Est. Finish (Fatigue Adjusted):</span>
                              </div>
                              <div style={{ fontWeight: 'bold', fontSize: '1rem' }}>
                                {hours}h {minutes}m
                              </div>
                              <div style={{ fontSize: '0.75rem', color: '#9ca3af', marginTop: '2px' }}>
                                Based on {fatigueRate}% fade per 10mi
                              </div>
                            </div>
                          );
                        })()}
                      </div>
                    );
                  }}
                />

                <Legend />

                {/* Planned Route Elevation - Blue Area with Gradient */}
                {showElevation && (
                  <Area
                    yAxisId="elevation"
                    type="monotone"
                    dataKey="plannedElevation"
                    stroke={colors.primary}
                    strokeWidth={2}
                    fill="url(#elevationGradient)"
                    className="print-area"
                    name="Planned Route"
                  />
                )}

                {/* Previous Race Elevation - Red Dashed Line */}
                {showElevation && showComparison && (
                  <Area
                    yAxisId="elevation"
                    type="monotone"
                    dataKey="previousElevation"
                    stroke="#ef4444"
                    strokeWidth={2}
                    strokeDasharray="5 5"
                    fill="none"
                    connectNulls={true}
                    name="Previous Race"
                  />
                )}

                {/* Planned Pace - Green Line */}
                {showPlannedPace && (
                  <Line
                    yAxisId="pace"
                    type="monotone"
                    dataKey="plannedPace"
                    stroke={colors.secondary}
                    strokeWidth={2}
                    dot={false}
                    connectNulls={true}
                    name="Planned Pace"
                  />
                )}

                {/* Actual Pace - Cyan Line */}
                {showActualPace && (
                  <Line
                    yAxisId="pace"
                    type="monotone"
                    dataKey="actualPace"
                    stroke={theme === 'coloursplash' ? '#7CB342' : '#06b6d4'}
                    strokeWidth={2}
                    dot={false}
                    connectNulls={true}
                    name="Actual Pace"
                  />
                )}

                {/* Heart Rate - Light Red Line */}
                {showHeartRate && (
                  <Line
                    yAxisId="heartRate"
                    type="monotone"
                    dataKey="heartRate"
                    stroke={theme === 'coloursplash' ? '#F7941D' : '#f87171'}
                    strokeWidth={1.5}
                    dot={false}
                    connectNulls={true}
                    name="Heart Rate"
                  />
                )}

                {/* Fatigue Curve - Orange Dashed Line */}
                {showFatigueCurve && (
                  <Line
                    yAxisId="pace"
                    type="monotone"
                    dataKey="fatiguePace"
                    stroke="#fb923c"
                    strokeWidth={2}
                    strokeDasharray="8 4"
                    dot={false}
                    connectNulls={true}
                    name="Fatigue Curve"
                  />
                )}

                {/* Elevation Labels (Red) - Pre-computed for reliable rendering */}
                {showElevation && labelScatterData.map((point) => (
                  <ReferenceDot
                    key={`label-${point.id}`}
                    yAxisId="elevation"
                    x={point.distance}
                    y={point.elevation}
                    r={6}
                    fill="#ef4444"
                    stroke="#ffffff"
                    strokeWidth={2}
                    ifOverflow="extendDomain"
                  />
                ))}

                {/* Checkpoint Markers (Green) - Rendered as dots on the main elevation line */}
                {showElevation && checkpointScatterData.length > 0 && (
                  <Line
                    yAxisId="elevation"
                    type="monotone"
                    dataKey="plannedElevation"
                    stroke="none"
                    strokeWidth={0}
                    dot={(props: any) => {
                      const { cx, cy, payload, index, width } = props;
                      if (!cx || !cy || !payload) return null;

                      // Only render dots at checkpoint positions
                      if (!payload.isCheckpoint) return null;

                      const markerColor = theme === 'coloursplash' ? '#7CB342' : '#10b981';

                      // Determine if label is near the right edge (rightmost 15% of chart)
                      const chartWidth = width || 800; // Fallback width
                      const isNearRightEdge = cx > chartWidth * 0.85;

                      // Adjust text anchor and x position based on position
                      const textAnchor = isNearRightEdge ? 'end' : 'middle';
                      const textX = isNearRightEdge ? cx - 12 : cx;

                      return (
                        <g key={`checkpoint-marker-${index}`}>
                          <circle
                            cx={cx}
                            cy={cy}
                            r={8}
                            fill={markerColor}
                            stroke="#ffffff"
                            strokeWidth={3}
                          />
                          <text
                            x={textX}
                            y={cy - 15}
                            textAnchor={textAnchor}
                            fill={markerColor}
                            fontSize="12"
                            fontWeight="bold"
                          >
                            {payload.checkpointName}
                          </text>
                        </g>
                      );
                    }}
                    isAnimationActive={false}
                    name="Elevation"
                  />
                )}
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        </>
      )}
    </div>
  );
}