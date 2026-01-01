import { useEffect, useState } from 'react';
import { localStorageService } from '@/react-app/services/localStorage';
import type { Race, Segment, ElevationLabel } from '@/shared/types';
import { getCoordinatesFromGPX, coordinatesToPlusCode } from '@/react-app/utils/plusCodes';

export function useRaceDetails(raceId: string) {
  const [race, setRace] = useState<Race | null>(null);
  const [segments, setSegments] = useState<Segment[]>([]);
  const [elevationLabels, setElevationLabels] = useState<ElevationLabel[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchRaceDetails = () => {
    try {
      const raceData = localStorageService.getRace(parseInt(raceId));
      const segmentData = localStorageService.getSegmentsByRaceId(parseInt(raceId));
      const elevationData = localStorageService.getElevationLabelsByRaceId(parseInt(raceId));

      setRace(raceData);
      setSegments(segmentData);
      setElevationLabels(elevationData);
    } catch (error) {
      console.error('Failed to fetch race details:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRaceDetails();
  }, [raceId]);

  const updateRace = async (updates: {
    name: string;
    distance_miles: number;
    emergency_contact_name?: string;
    emergency_contact_phone?: string;
    start_date_time?: string | null;
    timezone?: string | null;
    mandatory_kit?: string | null;
    logo_url?: string | null;
    fit_comparison_file_key?: string | null;
  }) => {
    try {
      const updated = localStorageService.updateRace(parseInt(raceId), updates);
      if (updated) {
        setRace(updated);
        fetchRaceDetails();
      }
    } catch (error) {
      console.error('Failed to update race:', error);
      throw error;
    }
  };

  const createSegment = async (data: {
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
    try {
      // Calculate cumulative distance for this checkpoint
      const cumulativeDistance = segments.reduce((sum, seg) => sum + seg.segment_distance_miles, 0) + data.segment_distance_miles;

      // Try to get Plus Code from GPX file
      let plusCode: string | undefined;
      let latitude: number | undefined;
      let longitude: number | undefined;

      const raceData = localStorageService.getRace(parseInt(raceId));
      if (raceData?.gpx_file_key) {
        const gpxFile = localStorageService.getGPXFile(raceData.gpx_file_key);
        if (gpxFile) {
          const coords = getCoordinatesFromGPX(gpxFile.content, cumulativeDistance);
          if (coords) {
            latitude = coords.latitude;
            longitude = coords.longitude;
            plusCode = coordinatesToPlusCode(coords.latitude, coords.longitude);
          }
        }
      }

      const segmentData = {
        race_id: parseInt(raceId),
        checkpoint_name: data.checkpoint_name,
        segment_distance_miles: data.segment_distance_miles,
        terrain_description: data.terrain_description,
        nutrition_plan: data.nutrition_plan,
        carb_goal_per_hour: data.carb_goal_per_hour,
        segment_nutrition_items: data.segment_nutrition_items,
        notes: data.notes,
        map_reference: data.map_reference,
        segment_order: segments.length,
        custom_pace_min_per_mile: data.custom_pace_min_per_mile,
        cutoff_time: data.cutoff_time,
        checkpoint_time_minutes: data.checkpoint_time_minutes,
        plusCode,
        latitude,
        longitude,
        support_crew_present: data.support_crew_present,
        support_crew_names: data.support_crew_names,
        support_crew_members: data.support_crew_members,
      };

      const newSegment = localStorageService.createSegment(segmentData);
      setSegments([...segments, newSegment]);
    } catch (error) {
      console.error('Failed to create segment:', error);
      throw error;
    }
  };

  const updateSegment = async (segmentId: number, updates: {
    checkpoint_name?: string;
    segment_distance_miles?: number;
    terrain_description?: string;
    custom_pace_min_per_mile?: number | null;
    notes?: string;
    nutrition_plan?: string;
    carb_goal_per_hour?: number | null;
    segment_nutrition_items?: string;
    map_reference?: string;
    cutoff_time?: string;
    checkpoint_time_minutes?: number;
    support_crew_present?: boolean;
    support_crew_names?: string;
    support_crew_members?: string;
  }) => {
    try {
      const updated = localStorageService.updateSegment(segmentId, updates);
      if (updated) {
        setSegments(segments.map(seg => seg.id === segmentId ? updated : seg));
      }
    } catch (error) {
      console.error('Failed to update segment:', error);
      throw error;
    }
  };

  const deleteSegment = async (segmentId: number) => {
    try {
      localStorageService.deleteSegment(segmentId);
      setSegments(segments.filter(seg => seg.id !== segmentId));
    } catch (error) {
      console.error('Failed to delete segment:', error);
      throw error;
    }
  };

  const uploadGPX = async (file: File) => {
    try {
      await localStorageService.setGPXFile(parseInt(raceId), file);
      await fetchRaceDetails(); // Refresh to show updated GPX file key
      // Regenerate Plus Codes for existing segments after GPX upload
      await regeneratePlusCodes();
    } catch (error) {
      console.error('Failed to upload GPX:', error);
      throw error;
    }
  };

  const createElevationLabel = async (data: { distance_miles: number; label: string }) => {
    try {
      const newLabel = localStorageService.createElevationLabel({
        race_id: parseInt(raceId),
        distance_miles: data.distance_miles,
        label: data.label,
      });
      setElevationLabels([...elevationLabels, newLabel]);
    } catch (error) {
      console.error('Failed to create elevation label:', error);
      throw error;
    }
  };

  const updateElevationLabel = async (labelId: number, label: string) => {
    try {
      const updated = localStorageService.updateElevationLabel(labelId, label);
      if (updated) {
        setElevationLabels(elevationLabels.map(l => l.id === labelId ? updated : l));
      }
    } catch (error) {
      console.error('Failed to update elevation label:', error);
      throw error;
    }
  };

  const deleteElevationLabel = async (labelId: number) => {
    try {
      localStorageService.deleteElevationLabel(labelId);
      setElevationLabels(elevationLabels.filter(l => l.id !== labelId));
    } catch (error) {
      console.error('Failed to delete elevation label:', error);
      throw error;
    }
  };

  const regeneratePlusCodes = async (force: boolean = false) => {
    try {
      const raceData = localStorageService.getRace(parseInt(raceId));
      if (!raceData?.gpx_file_key) {
        console.log('No GPX file available for Plus Code generation');
        return;
      }

      const gpxFile = localStorageService.getGPXFile(raceData.gpx_file_key);
      if (!gpxFile) {
        console.log('GPX file not found');
        return;
      }

      console.log('Regenerating Plus Codes for all segments...');
      console.log(`Total segments: ${segments.length}`);
      console.log(`Force regenerate: ${force}`);
      let updatedCount = 0;

      for (const segment of segments) {
        console.log(`Segment: ${segment.checkpoint_name}, Cumulative Distance: ${segment.cumulative_distance_miles} miles, Has Plus Code: ${!!segment.plusCode}`);

        // Skip if already has a Plus Code (unless force is true)
        if (segment.plusCode && !force) {
          console.log(`Skipping ${segment.checkpoint_name} - already has Plus Code: ${segment.plusCode}`);
          continue;
        }

        const coords = getCoordinatesFromGPX(gpxFile.content, segment.cumulative_distance_miles);
        if (coords) {
          const plusCode = coordinatesToPlusCode(coords.latitude, coords.longitude);
          console.log(`Generated Plus Code for ${segment.checkpoint_name}: ${plusCode} (${coords.latitude}, ${coords.longitude})`);
          const updated = localStorageService.updateSegment(segment.id!, {
            plusCode,
            latitude: coords.latitude,
            longitude: coords.longitude,
          });
          if (updated) {
            updatedCount++;
          }
        } else {
          console.log(`Failed to get coordinates for ${segment.checkpoint_name} at ${segment.cumulative_distance_miles} miles`);
        }
      }

      console.log(`Regenerated Plus Codes for ${updatedCount} segments`);
      fetchRaceDetails(); // Refresh to show updated Plus Codes
    } catch (error) {
      console.error('Failed to regenerate Plus Codes:', error);
      throw error;
    }
  };

  return {
    race,
    segments,
    elevationLabels,
    loading,
    updateRace,
    createSegment,
    updateSegment,
    deleteSegment,
    uploadGPX,
    createElevationLabel,
    updateElevationLabel,
    deleteElevationLabel,
    regeneratePlusCodes,
    refresh: fetchRaceDetails,
  };
}
