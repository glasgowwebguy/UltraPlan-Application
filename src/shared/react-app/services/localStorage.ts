import type { Race, Segment, ElevationLabel, ParsedFITData, FITRecord, UserNutritionProduct, NutritionProductsExport, RecentlyUsedProduct, AutoPaceSettings } from '@/shared/types';
import FitParser from 'fit-file-parser';
import { normalizeGPX, getGPXStats } from '../utils/gpxPruner';

const STORAGE_KEYS = {
  RACES: 'ultra_planner_races',
  SEGMENTS: 'ultra_planner_segments',
  ELEVATION_LABELS: 'ultra_planner_elevation_labels',
  NEXT_ID: 'ultra_planner_next_id',
  USER_NUTRITION_PRODUCTS: 'ultra_planner_user_nutrition_products',
  RECENTLY_USED_PRODUCTS: 'ultra_planner_recently_used_products',
  AUTO_PACE_SETTINGS: 'ultra_planner_auto_pace_settings', // Prefix for auto-pace settings
  GAP_PROFILE: 'ultra_planner_gap_profile', // GAP Profile storage
};

// Utility functions
const milesToKm = (miles: number) => miles * 1.60934;

class LocalStorageService {
  constructor() {
    this.migrateWhat3WordsToPlusCodes();
    this.migrateRaceTimingFields();
    this.migrateRaceUserIdField();
    this.migrateCheckpointTimeField();
    this.migrateFITComparisonField();
    this.migrateFITAutoPaceField();
    this.migrateAutoPaceFields();
  }

  private getNextId(): number {
    const currentId = parseInt(localStorage.getItem(STORAGE_KEYS.NEXT_ID) || '1');
    localStorage.setItem(STORAGE_KEYS.NEXT_ID, (currentId + 1).toString());
    return currentId;
  }

  private getCurrentTimestamp(): string {
    return new Date().toISOString();
  }

  // Migration function to convert what3words to plusCode
  private migrateWhat3WordsToPlusCodes(): void {
    const segments = this.getSegments();
    let updated = false;

    segments.forEach(segment => {
      // @ts-ignore - migrating old data
      if ('what3words' in segment) {
        // @ts-ignore - migrating old data
        delete segment.what3words;
        // @ts-ignore - adding new field
        segment.plusCode = null;
        updated = true;
      }
    });

    if (updated) {
      localStorage.setItem(STORAGE_KEYS.SEGMENTS, JSON.stringify(segments));
      console.log('[Migration] Migrated what3words to plusCode fields');
    }
  }

  // Migration function to add timing fields to existing races
  private migrateRaceTimingFields(): void {
    const races = this.getRaces();
    let updated = false;

    races.forEach(race => {
      if (!('start_date_time' in race)) {
        // @ts-ignore - adding new field
        race.start_date_time = null;
        updated = true;
      }
      if (!('timezone' in race)) {
        // @ts-ignore - adding new field
        race.timezone = null;
        updated = true;
      }
    });

    if (updated) {
      localStorage.setItem(STORAGE_KEYS.RACES, JSON.stringify(races));
      console.log('[Migration] Added timing fields to existing races');
    }
  }

  // Migration function to add userId field to existing races
  private migrateRaceUserIdField(): void {
    const races = this.getRaces();
    let updated = false;

    races.forEach(race => {
      if (!('userId' in race)) {
        // @ts-ignore - adding new field
        race.userId = undefined;
        updated = true;
      }
    });

    if (updated) {
      localStorage.setItem(STORAGE_KEYS.RACES, JSON.stringify(races));
      console.log('[Migration] Added userId field to existing races');
    }
  }

  // Migration function to add checkpoint_time_minutes field to existing segments
  private migrateCheckpointTimeField(): void {
    const segments = this.getSegments();
    let updated = false;

    segments.forEach(segment => {
      if (!('checkpoint_time_minutes' in segment)) {
        // @ts-ignore - adding new field
        segment.checkpoint_time_minutes = null;
        updated = true;
      }
    });

    if (updated) {
      localStorage.setItem(STORAGE_KEYS.SEGMENTS, JSON.stringify(segments));
      console.log('[Migration] Added checkpoint_time_minutes field to existing segments');
    }
  }

  // Migration function to add fit_comparison_file_key field to existing races
  private migrateFITComparisonField(): void {
    const races = this.getRaces();
    let updated = false;

    races.forEach(race => {
      if (!('fit_comparison_file_key' in race)) {
        // @ts-ignore - adding new field
        race.fit_comparison_file_key = null;
        updated = true;
      }
    });

    if (updated) {
      localStorage.setItem(STORAGE_KEYS.RACES, JSON.stringify(races));
      console.log('[Migration] Added fit_comparison_file_key field to existing races');
    }
  }

  // Migration function to add fit_autopace_file_key field to existing races
  private migrateFITAutoPaceField(): void {
    const races = this.getRaces();
    let updated = false;

    races.forEach(race => {
      if (!('fit_autopace_file_key' in race)) {
        // @ts-ignore - adding new field
        race.fit_autopace_file_key = null;
        updated = true;
      }
    });

    if (updated) {
      localStorage.setItem(STORAGE_KEYS.RACES, JSON.stringify(races));
      console.log('[Migration] Added fit_autopace_file_key field to existing races');
    }
  }

  // Migration function to add auto-pace fields to existing segments
  private migrateAutoPaceFields(): void {
    const segments = this.getSegments();
    let updated = false;

    segments.forEach(segment => {
      if (!('auto_derived_pace' in segment)) {
        // @ts-ignore - adding new field
        segment.auto_derived_pace = null;
        updated = true;
      }
      if (!('use_auto_pace' in segment)) {
        // @ts-ignore - adding new field
        segment.use_auto_pace = null;
        updated = true;
      }
      if (!('auto_pace_confidence' in segment)) {
        // @ts-ignore - adding new field
        segment.auto_pace_confidence = null;
        updated = true;
      }
      if (!('auto_pace_reasoning' in segment)) {
        // @ts-ignore - adding new field
        segment.auto_pace_reasoning = null;
        updated = true;
      }
    });

    if (updated) {
      localStorage.setItem(STORAGE_KEYS.SEGMENTS, JSON.stringify(segments));
      console.log('[Migration] Added auto-pace fields to existing segments');
    }
  }

  // Race operations
  getRaces(): Race[] {
    const races = localStorage.getItem(STORAGE_KEYS.RACES);
    return races ? JSON.parse(races) : [];
  }

  getRace(id: number): Race | null {
    const races = this.getRaces();
    return races.find(race => race.id === id) || null;
  }

  createRace(data: {
    name: string;
    distance_miles: number;
    start_date_time?: string | null;
    timezone?: string | null;
    emergency_contact_name?: string | null;
    emergency_contact_phone?: string | null;
    mandatory_kit?: string | null;
    logo_url?: string | null;
    userId?: string;
  }): Race {
    const races = this.getRaces();
    const newRace: Race = {
      id: this.getNextId(),
      userId: data.userId,
      name: data.name,
      distance_miles: data.distance_miles,
      distance_km: milesToKm(data.distance_miles),
      gpx_file_key: null,
      emergency_contact_name: data.emergency_contact_name || null,
      emergency_contact_phone: data.emergency_contact_phone || null,
      start_date_time: data.start_date_time || null,
      timezone: data.timezone || null,
      mandatory_kit: data.mandatory_kit || null,
      logo_url: data.logo_url || null,
      created_at: this.getCurrentTimestamp(),
      updated_at: this.getCurrentTimestamp(),
    };

    races.unshift(newRace);
    localStorage.setItem(STORAGE_KEYS.RACES, JSON.stringify(races));

    return newRace;
  }

  updateRace(id: number, data: {
    name?: string;
    distance_miles?: number;
    emergency_contact_name?: string;
    emergency_contact_phone?: string;
    start_date_time?: string | null;
    timezone?: string | null;
    mandatory_kit?: string | null;
    logo_url?: string | null;
    fit_comparison_file_key?: string | null;
    fit_autopace_file_key?: string | null;
    userId?: string;
  }): Race | null {
    const races = this.getRaces();
    const raceIndex = races.findIndex(race => race.id === id);

    if (raceIndex === -1) return null;

    const oldRace = races[raceIndex];

    const updatedRace = {
      ...oldRace,
      ...(data.name !== undefined && { name: data.name }),
      ...(data.distance_miles !== undefined && {
        distance_miles: data.distance_miles,
        distance_km: milesToKm(data.distance_miles)
      }),
      ...(data.emergency_contact_name !== undefined && { emergency_contact_name: data.emergency_contact_name || null }),
      ...(data.emergency_contact_phone !== undefined && { emergency_contact_phone: data.emergency_contact_phone || null }),
      ...(data.start_date_time !== undefined && { start_date_time: data.start_date_time || null }),
      ...(data.timezone !== undefined && { timezone: data.timezone || null }),
      ...(data.mandatory_kit !== undefined && { mandatory_kit: data.mandatory_kit || null }),
      ...(data.logo_url !== undefined && { logo_url: data.logo_url || null }),
      ...(data.fit_comparison_file_key !== undefined && { fit_comparison_file_key: data.fit_comparison_file_key || null }),
      ...(data.fit_autopace_file_key !== undefined && { fit_autopace_file_key: data.fit_autopace_file_key || null }),
      ...(data.userId !== undefined && { userId: data.userId }),
      updated_at: this.getCurrentTimestamp(),
    };

    races[raceIndex] = updatedRace;
    localStorage.setItem(STORAGE_KEYS.RACES, JSON.stringify(races));

    return updatedRace;
  }

  deleteRace(id: number): boolean {
    const races = this.getRaces();
    const race = races.find(r => r.id === id);
    const filteredRaces = races.filter(race => race.id !== id);

    if (filteredRaces.length === races.length) return false;

    // Delete associated GPX file if it exists
    if (race?.gpx_file_key) {
      console.log('[LocalStorage] Deleting GPX file:', race.gpx_file_key);
      localStorage.removeItem(race.gpx_file_key);
    }

    // Delete associated FIT comparison file if it exists
    if (race?.fit_comparison_file_key) {
      console.log('[LocalStorage] Deleting FIT comparison file:', race.fit_comparison_file_key);
      localStorage.removeItem(race.fit_comparison_file_key);
    }

    // Delete associated FIT autopace file if it exists
    if (race?.fit_autopace_file_key) {
      console.log('[LocalStorage] Deleting FIT autopace file:', race.fit_autopace_file_key);
      localStorage.removeItem(race.fit_autopace_file_key);
    }

    // Delete auto-pace settings for this race
    this.deleteAutoPaceSettings(id);

    localStorage.setItem(STORAGE_KEYS.RACES, JSON.stringify(filteredRaces));

    // Also delete related segments and elevation labels
    this.deleteSegmentsByRaceId(id);
    this.deleteElevationLabelsByRaceId(id);

    return true;
  }

  // Segment operations
  getSegments(): Segment[] {
    const segments = localStorage.getItem(STORAGE_KEYS.SEGMENTS);
    return segments ? JSON.parse(segments) : [];
  }

  getSegmentsByRaceId(raceId: number): Segment[] {
    const segments = this.getSegments();
    return segments
      .filter(segment => segment.race_id === raceId)
      .sort((a, b) => a.segment_order - b.segment_order);
  }

  createSegment(data: {
    race_id: number;
    checkpoint_name: string;
    segment_distance_miles: number;
    terrain_description?: string;
    nutrition_plan?: string;
    carb_goal_per_hour?: number | null;
    sodium_goal_per_hour?: number | null;
    water_goal_per_hour?: number | null;
    segment_nutrition_items?: string;
    notes?: string;
    map_reference?: string;
    segment_order: number;
    custom_pace_min_per_mile?: number | null;
    cutoff_time?: string;
    checkpoint_time_minutes?: number | null;
    support_crew_present?: boolean;
    support_crew_names?: string;
    support_crew_members?: string;
    plusCode?: string;
    latitude?: number;
    longitude?: number;
  }): Segment {
    console.log('[localStorage.createSegment] Received data:', data);
    console.log('[localStorage.createSegment] carb_goal_per_hour:', data.carb_goal_per_hour);
    console.log('[localStorage.createSegment] segment_nutrition_items:', data.segment_nutrition_items);
    const segments = this.getSegments();

    // Calculate cumulative distance
    const previousSegments = segments
      .filter(s => s.race_id === data.race_id && s.segment_order < data.segment_order)
      .sort((a, b) => b.segment_order - a.segment_order);

    const cumulative_distance_miles = previousSegments.length > 0
      ? previousSegments[0].cumulative_distance_miles + data.segment_distance_miles
      : data.segment_distance_miles;

    const cumulative_distance_km = milesToKm(cumulative_distance_miles);

    // Calculate predicted time using custom pace if provided
    // If use_auto_pace is enabled, use auto_derived_pace instead of custom_pace_min_per_mile
    let predicted_segment_time_minutes: number | null = null;
    if (data.custom_pace_min_per_mile !== undefined && data.custom_pace_min_per_mile !== null) {
      predicted_segment_time_minutes = data.custom_pace_min_per_mile * data.segment_distance_miles;
    }

    const newSegment: Segment = {
      id: this.getNextId(),
      race_id: data.race_id,
      checkpoint_name: data.checkpoint_name,
      segment_distance_miles: data.segment_distance_miles,
      segment_distance_km: milesToKm(data.segment_distance_miles),
      cumulative_distance_miles,
      cumulative_distance_km,
      terrain_description: data.terrain_description || null,
      nutrition_plan: data.nutrition_plan || null,
      carb_goal_per_hour: data.carb_goal_per_hour !== undefined ? data.carb_goal_per_hour : null,
      sodium_goal_per_hour: data.sodium_goal_per_hour !== undefined ? data.sodium_goal_per_hour : null,
      water_goal_per_hour: data.water_goal_per_hour !== undefined ? data.water_goal_per_hour : null,
      segment_nutrition_items: data.segment_nutrition_items || null,
      notes: data.notes || null,
      map_reference: data.map_reference || null,
      segment_order: data.segment_order,
      predicted_segment_time_minutes,
      custom_pace_min_per_mile: data.custom_pace_min_per_mile !== undefined ? data.custom_pace_min_per_mile : null,
      cutoff_time: data.cutoff_time || null,
      checkpoint_time_minutes: data.checkpoint_time_minutes !== undefined ? data.checkpoint_time_minutes : null,
      support_crew_present: data.support_crew_present || null,
      support_crew_names: data.support_crew_names || null,
      support_crew_members: data.support_crew_members || null,
      plusCode: data.plusCode || null,
      latitude: data.latitude || null,
      longitude: data.longitude || null,
      created_at: this.getCurrentTimestamp(),
      updated_at: this.getCurrentTimestamp(),
    };

    segments.push(newSegment);
    localStorage.setItem(STORAGE_KEYS.SEGMENTS, JSON.stringify(segments));
    return newSegment;
  }

  updateSegment(id: number, updates: {
    checkpoint_name?: string;
    segment_distance_miles?: number;
    terrain_description?: string;
    nutrition_plan?: string;
    carb_goal_per_hour?: number | null;
    sodium_goal_per_hour?: number | null;
    water_goal_per_hour?: number | null;
    segment_nutrition_items?: string;
    notes?: string;
    map_reference?: string;
    custom_pace_min_per_mile?: number | null;
    cutoff_time?: string;
    checkpoint_time_minutes?: number | null;
    support_crew_present?: boolean;
    support_crew_names?: string;
    support_crew_members?: string;
    plusCode?: string | null;
    latitude?: number | null;
    longitude?: number | null;
    auto_derived_pace?: number | null;
    use_auto_pace?: boolean | null;
    auto_pace_confidence?: 'high' | 'medium' | 'low' | null;
    auto_pace_reasoning?: string | null;
  }): Segment | null {
    const segments = this.getSegments();
    const segmentIndex = segments.findIndex(segment => segment.id === id);

    if (segmentIndex === -1) return null;

    const segment = segments[segmentIndex];
    const updatedSegment = { ...segment, ...updates, updated_at: this.getCurrentTimestamp() };

    // Recalculate distance fields if segment_distance_miles changed
    if (updates.segment_distance_miles !== undefined) {
      updatedSegment.segment_distance_km = milesToKm(updates.segment_distance_miles);

      // Recalculate cumulative distance
      const previousSegments = segments
        .filter(s => s.race_id === segment.race_id && s.segment_order < segment.segment_order)
        .sort((a, b) => b.segment_order - a.segment_order);

      updatedSegment.cumulative_distance_miles = previousSegments.length > 0
        ? previousSegments[0].cumulative_distance_miles + updates.segment_distance_miles
        : updates.segment_distance_miles;

      updatedSegment.cumulative_distance_km = milesToKm(updatedSegment.cumulative_distance_miles);

      // Also recalculate predicted time when distance changes
      // Use auto-pace if enabled, otherwise use custom pace
      if (updatedSegment.use_auto_pace && updatedSegment.auto_derived_pace) {
        updatedSegment.predicted_segment_time_minutes = updatedSegment.auto_derived_pace * updatedSegment.segment_distance_miles;
      } else if (updatedSegment.custom_pace_min_per_mile) {
        updatedSegment.predicted_segment_time_minutes = updatedSegment.custom_pace_min_per_mile * updatedSegment.segment_distance_miles;
      } else {
        updatedSegment.predicted_segment_time_minutes = null;
      }

      // Update this segment in the array first
      segments[segmentIndex] = updatedSegment;

      // Now recalculate cumulative distances for all subsequent segments
      const subsequentSegments = segments
        .map((s, index) => ({ segment: s, index }))
        .filter(({ segment: s }) => s.race_id === segment.race_id && s.segment_order > segment.segment_order)
        .sort((a, b) => a.segment.segment_order - b.segment.segment_order);

      subsequentSegments.forEach(({ segment: subSegment, index: subIndex }) => {
        const prevSegments = segments
          .filter(s => s.race_id === segment.race_id && s.segment_order < subSegment.segment_order)
          .sort((a, b) => b.segment_order - a.segment_order);

        const newCumulativeMiles = prevSegments.length > 0
          ? prevSegments[0].cumulative_distance_miles + subSegment.segment_distance_miles
          : subSegment.segment_distance_miles;

        segments[subIndex] = {
          ...subSegment,
          cumulative_distance_miles: newCumulativeMiles,
          cumulative_distance_km: milesToKm(newCumulativeMiles),
          updated_at: this.getCurrentTimestamp(),
        };
      });
    } else {
      // If distance didn't change, just update the segment normally
      segments[segmentIndex] = updatedSegment;
    }

    // Recalculate predicted time if pace-related fields changed
    if (updates.custom_pace_min_per_mile !== undefined || updates.use_auto_pace !== undefined || updates.auto_derived_pace !== undefined) {
      const seg = segments[segmentIndex];
      // Use auto-pace if enabled, otherwise use custom pace
      if (seg.use_auto_pace && seg.auto_derived_pace) {
        seg.predicted_segment_time_minutes = seg.auto_derived_pace * seg.segment_distance_miles;
      } else if (seg.custom_pace_min_per_mile) {
        seg.predicted_segment_time_minutes = seg.custom_pace_min_per_mile * seg.segment_distance_miles;
      } else {
        seg.predicted_segment_time_minutes = null;
      }
    }

    localStorage.setItem(STORAGE_KEYS.SEGMENTS, JSON.stringify(segments));
    return segments[segmentIndex];
  }

  deleteSegment(id: number): boolean {
    const segments = this.getSegments();
    const filteredSegments = segments.filter(segment => segment.id !== id);

    if (filteredSegments.length === segments.length) return false;

    localStorage.setItem(STORAGE_KEYS.SEGMENTS, JSON.stringify(filteredSegments));
    return true;
  }

  deleteSegmentsByRaceId(raceId: number): void {
    const segments = this.getSegments();
    const filteredSegments = segments.filter(segment => segment.race_id !== raceId);
    localStorage.setItem(STORAGE_KEYS.SEGMENTS, JSON.stringify(filteredSegments));
  }

  // Elevation label operations
  getElevationLabels(): ElevationLabel[] {
    const labels = localStorage.getItem(STORAGE_KEYS.ELEVATION_LABELS);
    return labels ? JSON.parse(labels) : [];
  }

  getElevationLabelsByRaceId(raceId: number): ElevationLabel[] {
    const labels = this.getElevationLabels();
    return labels
      .filter(label => label.race_id === raceId)
      .sort((a, b) => a.distance_miles - b.distance_miles);
  }

  createElevationLabel(data: {
    race_id: number;
    distance_miles: number;
    label: string;
  }): ElevationLabel {
    const labels = this.getElevationLabels();
    const newLabel: ElevationLabel = {
      id: this.getNextId(),
      race_id: data.race_id,
      distance_miles: data.distance_miles,
      label: data.label,
      created_at: this.getCurrentTimestamp(),
      updated_at: this.getCurrentTimestamp(),
    };

    labels.push(newLabel);
    localStorage.setItem(STORAGE_KEYS.ELEVATION_LABELS, JSON.stringify(labels));
    return newLabel;
  }

  updateElevationLabel(id: number, label: string): ElevationLabel | null {
    const labels = this.getElevationLabels();
    const labelIndex = labels.findIndex(l => l.id === id);

    if (labelIndex === -1) return null;

    const updatedLabel = {
      ...labels[labelIndex],
      label,
      updated_at: this.getCurrentTimestamp(),
    };

    labels[labelIndex] = updatedLabel;
    localStorage.setItem(STORAGE_KEYS.ELEVATION_LABELS, JSON.stringify(labels));
    return updatedLabel;
  }

  deleteElevationLabel(id: number): boolean {
    const labels = this.getElevationLabels();
    const filteredLabels = labels.filter(label => label.id !== id);

    if (filteredLabels.length === labels.length) return false;

    localStorage.setItem(STORAGE_KEYS.ELEVATION_LABELS, JSON.stringify(filteredLabels));
    return true;
  }

  deleteElevationLabelsByRaceId(raceId: number): void {
    const labels = this.getElevationLabels();
    const filteredLabels = labels.filter(label => label.race_id !== raceId);
    localStorage.setItem(STORAGE_KEYS.ELEVATION_LABELS, JSON.stringify(filteredLabels));
  }

  // GPX file operations (simplified for local storage)
  setGPXFile(raceId: number, file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      console.log('[LocalStorage] Starting GPX upload for race:', raceId, 'File:', file.name);

      const reader = new FileReader();
      reader.onload = () => {
        try {
          const fileKey = `gpx_${raceId}`;
          let content = reader.result as string;

          console.log('[LocalStorage] File read complete. Original size:', (content.length / 1024).toFixed(1) + 'KB');

          // ALWAYS normalize GPX files to ensure consistent, parseable format
          // This fixes issues with:
          // - Missing/invalid elevation data
          // - Namespace prefixes (gpx:trkpt)
          // - Extensions that confuse parsers
          // - Encoding issues
          const stats = getGPXStats(content);
          console.log('[LocalStorage] Normalizing GPX. Points:', stats.pointCount, 'Distance:', stats.estimatedDistance.toFixed(2), 'miles');

          content = normalizeGPX(content);
          console.log('[LocalStorage] GPX normalized. Size:', (content.length / 1024).toFixed(1) + 'KB');

          const fileData = {
            name: file.name,
            content: content,
            type: file.type || 'application/gpx+xml',
          };

          console.log('[LocalStorage] File ready for storage. Final size:', (content.length / 1024).toFixed(1) + 'KB');

          // Clean up old GPX file for this race if it exists
          const races = this.getRaces();
          const race = races.find(r => r.id === raceId);
          if (race?.gpx_file_key) {
            console.log('[LocalStorage] Removing old GPX file:', race.gpx_file_key);
            localStorage.removeItem(race.gpx_file_key);
          }

          // Clean up orphaned GPX files (files not referenced by any race)
          this.cleanupOrphanedGPXFiles();

          // Try to save the new file
          try {
            localStorage.setItem(fileKey, JSON.stringify(fileData));
            console.log('[LocalStorage] GPX file saved to localStorage with key:', fileKey);
          } catch (quotaError) {
            // If quota exceeded, try one more cleanup and retry
            if (quotaError instanceof DOMException && quotaError.name === 'QuotaExceededError') {
              console.log('[LocalStorage] Quota exceeded, attempting aggressive cleanup...');

              // Remove all GPX files except the one we're trying to save
              for (let i = 0; i < localStorage.length; i++) {
                const key = localStorage.key(i);
                if (key && key.startsWith('gpx_') && key !== fileKey) {
                  console.log('[LocalStorage] Removing GPX file to free space:', key);
                  localStorage.removeItem(key);
                }
              }

              // Try one more time
              localStorage.setItem(fileKey, JSON.stringify(fileData));
              console.log('[LocalStorage] GPX file saved after cleanup');
            } else {
              throw quotaError;
            }
          }

          // Update race with GPX file key
          const raceIndex = races.findIndex(race => race.id === raceId);
          if (raceIndex !== -1) {
            races[raceIndex].gpx_file_key = fileKey;
            races[raceIndex].updated_at = this.getCurrentTimestamp();
            localStorage.setItem(STORAGE_KEYS.RACES, JSON.stringify(races));
            console.log('[LocalStorage] Race updated with GPX file key');
          } else {
            console.error('[LocalStorage] Race not found with id:', raceId);
          }

          resolve(fileKey);
        } catch (error) {
          console.error('[LocalStorage] Error saving GPX file:', error);
          if (error instanceof DOMException && error.name === 'QuotaExceededError') {
            reject(new Error('GPX file is too large even after optimization. Please use a smaller GPX file.'));
          } else {
            reject(error);
          }
        }
      };
      reader.onerror = () => {
        console.error('[LocalStorage] FileReader error:', reader.error);
        reject(reader.error);
      };
      reader.readAsText(file);
    });
  }

  // Helper to clean up GPX files that are no longer referenced
  private cleanupOrphanedGPXFiles(): void {
    const races = this.getRaces();
    const validGPXKeys = new Set(races.map(r => r.gpx_file_key).filter(Boolean));

    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith('gpx_') && !validGPXKeys.has(key)) {
        console.log('[LocalStorage] Removing orphaned GPX file:', key);
        localStorage.removeItem(key);
      }
    }
  }

  getGPXFile(fileKey: string): { name: string; content: string; type: string } | null {
    const fileData = localStorage.getItem(fileKey);
    return fileData ? JSON.parse(fileData) : null;
  }

  // FIT file operations
  private async parseFITFile(file: File): Promise<ParsedFITData> {
    // NOTE: DO NOT use speedUnit/lengthUnit - the library doesn't properly convert
    // We'll handle all conversions manually to ensure correctness
    const fitParser = new FitParser({
      force: true,
      temperatureUnit: 'celsius',
      pressureUnit: 'bar',
      elapsedRecordField: true,
      mode: 'both'
    });

    const arrayBuffer = await file.arrayBuffer();
    // Convert ArrayBuffer to Uint8Array for browser compatibility
    const uint8Array = new Uint8Array(arrayBuffer);

    return new Promise((resolve, reject) => {
      fitParser.parse(uint8Array, (error: Error | null, data: any) => {
        if (error) {
          console.error('[FIT Parser] Error parsing FIT file:', error);
          reject(new Error('Unable to parse FIT file. Please ensure this is a valid FIT export.'));
          return;
        }

        try {
          // The parsed data comes from the callback's data parameter, not fitParser object
          console.log('[FIT Parser] Callback data keys:', data ? Object.keys(data) : 'null');
          console.log('[FIT Parser] data.records length:', data?.records?.length || 0);
          console.log('[FIT Parser] data.sessions:', data?.sessions?.length || 0);
          console.log('[FIT Parser] data.laps:', data?.laps?.length || 0);

          // Extract device information from file_id
          const fileId = data?.file_id || {};
          const deviceInfos = data?.device_infos || [];
          console.log('[FIT Parser] file_id:', fileId);
          console.log('[FIT Parser] device_infos:', deviceInfos);

          // Extract device details - try all possible field name variants
          const deviceManufacturer = fileId.manufacturer || deviceInfos[0]?.manufacturer || undefined;
          const deviceProduct = fileId.product || deviceInfos[0]?.product || undefined;

          // Try multiple field names for product ID (different FIT file versions use different names)
          const deviceProductId =
            fileId.garmin_product ||
            deviceInfos[0]?.garmin_product ||
            fileId.product ||
            deviceInfos[0]?.product ||
            fileId.product_id ||
            deviceInfos[0]?.product_id ||
            undefined;

          const deviceModel = fileId.product_name || deviceInfos[0]?.product_name || deviceInfos[0]?.device_type || undefined;
          const firmwareVersion = deviceInfos[0]?.software_version || fileId.software_version || undefined;
          const recordingInterval = deviceInfos[0]?.sampling_rate || 1;

          console.log('[FIT Parser] Device info extracted:', {
            manufacturer: deviceManufacturer,
            product: deviceProduct,
            productId: deviceProductId,
            model: deviceModel,
            firmware: firmwareVersion,
            recordingInterval
          });

          // Enhanced logging to help debug device detection
          console.log('[FIT Parser] file_id available fields:', Object.keys(fileId));
          console.log('[FIT Parser] device_infos[0] available fields:', deviceInfos[0] ? Object.keys(deviceInfos[0]) : 'none');

          // Extract relevant data from parsed FIT file
          const rawRecords = data?.records || [];
          console.log('[FIT Parser] Raw records count:', rawRecords.length);
          if (rawRecords.length > 0) {
            console.log('[FIT Parser] First raw record:', rawRecords[0]);
            console.log('[FIT Parser] First raw record keys:', Object.keys(rawRecords[0]));
            console.log('[FIT Parser] First 3 raw records FULL DATA:', rawRecords.slice(0, 3));
          }

          // Sample records to reduce data size for localStorage
          // Keep every Nth record to reduce from 40k+ to ~2000 records
          const sampleRate = Math.max(1, Math.floor(rawRecords.length / 2000));
          console.log('[FIT Parser] Sampling rate:', sampleRate, '(keeping 1 in', sampleRate, 'records)');

          const records: FITRecord[] = rawRecords
            .filter((_: any, index: number) => index % sampleRate === 0)
            .map((record: any, index: number) => {
              // Debug first record to see ALL available field names
              if (index === 0) {
                console.log(`[FIT] First record ALL FIELDS:`, record);
                console.log(`[FIT] First record ALL KEYS:`, Object.keys(record));
              }

              // FIT files use different field names - try all possibilities
              // Elevation: enhanced_altitude, altitude, enhanced_elevation, elevation
              let elevation =
                record.enhanced_altitude ||
                record.altitude ||
                record.enhanced_elevation ||
                record.elevation ||
                0;

              // Debug first 10 records to see actual field names and values
              if (index < 10) {
                console.log(`[FIT] Record ${index} elevation fields:`, {
                  enhanced_altitude: record.enhanced_altitude,
                  altitude: record.altitude,
                  enhanced_elevation: record.enhanced_elevation,
                  elevation: record.elevation,
                  selected: elevation,
                  'record.alt': record.alt,
                  'record.altitude_m': record.altitude_m,
                  'ALL_KEYS': Object.keys(record).filter(k => k.toLowerCase().includes('alt') || k.toLowerCase().includes('elev'))
                });
              }

              // Speed: enhanced_speed or speed (in m/s, needs conversion to mph)
              const speedMps = record.enhanced_speed || record.speed;
              let speedMph: number | undefined;
              let pace: number | undefined;

              if (speedMps !== undefined && speedMps > 0) {
                speedMph = speedMps * 2.23694; // m/s to mph
                pace = 60 / speedMph; // min/mile
              }

              // Distance: in meters, convert to miles
              const distanceMiles = record.distance
                ? record.distance * 0.000621371
                : 0;

              return {
                timestamp: new Date(record.timestamp),
                distance: distanceMiles,
                elevation: elevation, // Already in meters
                heartRate: record.heart_rate || undefined,
                speed: speedMph || undefined,
                pace: pace,
                lat: record.position_lat || undefined,
                lon: record.position_long || undefined
              };
            });

          console.log('[FIT Parser] Sampled records count:', records.length, '(from', rawRecords.length, ')');

          // Debug: Log elevation data range
          const elevations = records.map(r => r.elevation).filter(e => e > 0);
          if (elevations.length > 0) {
            console.log('[FIT] Elevation range:', {
              min: Math.min(...elevations),
              max: Math.max(...elevations),
              avg: elevations.reduce((a, b) => a + b, 0) / elevations.length
            });
          } else {
            console.warn('[FIT] WARNING: No elevation data found in records!');
          }

          const parsedData: ParsedFITData = {
            fileName: file.name,
            raceName: data?.sessions?.[0]?.sport || undefined,
            raceDate: data?.sessions?.[0]?.start_time ? new Date(data.sessions[0].start_time).toISOString() : undefined,
            totalDistance: records[records.length - 1]?.distance || 0,
            totalTime: records.length > 0
              ? (records[records.length - 1].timestamp.getTime() - records[0].timestamp.getTime()) / 1000
              : 0,
            deviceManufacturer,
            deviceProduct,
            deviceProductId,
            deviceModel,
            firmwareVersion,
            recordingInterval,
            records
          };

          console.log('[FIT Parser] Successfully parsed FIT file:', {
            fileName: parsedData.fileName,
            totalDistance: parsedData.totalDistance.toFixed(2) + ' miles',
            totalTime: (parsedData.totalTime / 3600).toFixed(2) + ' hours',
            recordCount: parsedData.records.length
          });

          // Debug: Log sample records to see what data is available
          if (parsedData.records.length > 0) {
            console.log('[FIT Parser] Sample record (first):', parsedData.records[0]);
            console.log('[FIT Parser] Sample record (middle):', parsedData.records[Math.floor(parsedData.records.length / 2)]);
            console.log('[FIT Parser] Sample elevations:', records.slice(0, 10).map(r => r.elevation));
          }

          resolve(parsedData);
        } catch (parseError) {
          console.error('[FIT Parser] Error processing parsed data:', parseError);
          reject(new Error('Failed to process FIT file data.'));
        }
      });
    });
  }

  setFITFile(raceId: number, file: File): Promise<string> {
    return new Promise(async (resolve, reject) => {
      try {
        console.log('[LocalStorage] Starting FIT upload for race:', raceId, 'File:', file.name);

        // Parse the FIT file
        const parsedData = await this.parseFITFile(file);

        // Validate that we have usable data
        if (!parsedData.records || parsedData.records.length === 0) {
          throw new Error('This FIT file does not contain usable heart rate or pace data.');
        }

        const hasHR = parsedData.records.some(r => r.heartRate !== undefined);
        const hasPace = parsedData.records.some(r => r.speed !== undefined);

        console.log('[FIT Validation] Records count:', parsedData.records.length);
        console.log('[FIT Validation] Has HR data:', hasHR);
        console.log('[FIT Validation] Has Pace/Speed data:', hasPace);
        console.log('[FIT Validation] Sample heartRate values:', parsedData.records.slice(0, 5).map(r => r.heartRate));
        console.log('[FIT Validation] Sample speed values:', parsedData.records.slice(0, 5).map(r => r.speed));

        if (!hasHR && !hasPace) {
          throw new Error('This FIT file does not contain usable heart rate or pace data.');
        }

        if (!hasHR) {
          console.warn('[FIT] No heart rate data found in FIT file');
        }

        if (!hasPace) {
          console.warn('[FIT] No speed/pace data found in FIT file');
        }

        const fileKey = `fit_${raceId}`;
        const fileData = {
          name: file.name,
          parsedData: parsedData,
        };

        // Clean up old FIT file for this race if it exists
        const races = this.getRaces();
        const race = races.find(r => r.id === raceId);
        if (race?.fit_comparison_file_key) {
          console.log('[LocalStorage] Removing old FIT file:', race.fit_comparison_file_key);
          localStorage.removeItem(race.fit_comparison_file_key);
        }

        // Clean up orphaned FIT files
        this.cleanupOrphanedFITFiles();

        // Try to save the new file
        try {
          localStorage.setItem(fileKey, JSON.stringify(fileData));
          console.log('[LocalStorage] FIT file saved to localStorage with key:', fileKey);
        } catch (quotaError) {
          // If quota exceeded, try cleanup and retry
          if (quotaError instanceof DOMException && quotaError.name === 'QuotaExceededError') {
            console.log('[LocalStorage] Quota exceeded, attempting cleanup...');

            // Remove all FIT files except the one we're trying to save
            for (let i = 0; i < localStorage.length; i++) {
              const key = localStorage.key(i);
              if (key && key.startsWith('fit_') && key !== fileKey) {
                console.log('[LocalStorage] Removing FIT file to free space:', key);
                localStorage.removeItem(key);
              }
            }

            // Try one more time
            localStorage.setItem(fileKey, JSON.stringify(fileData));
            console.log('[LocalStorage] FIT file saved after cleanup');
          } else {
            throw quotaError;
          }
        }

        resolve(fileKey);
      } catch (error) {
        console.error('[LocalStorage] Error saving FIT file:', error);
        if (error instanceof DOMException && error.name === 'QuotaExceededError') {
          reject(new Error('FIT file is too large. Browser storage limit exceeded. Try deleting old race plans.'));
        } else if (error instanceof Error) {
          reject(error);
        } else {
          reject(new Error('Failed to save FIT file.'));
        }
      }
    });
  }

  getFITFile(fileKey: string): ParsedFITData | null {
    const fileData = localStorage.getItem(fileKey);
    if (!fileData) return null;

    try {
      const parsed = JSON.parse(fileData);
      // Convert timestamp strings back to Date objects
      if (parsed.parsedData?.records) {
        parsed.parsedData.records = parsed.parsedData.records.map((record: any) => ({
          ...record,
          timestamp: new Date(record.timestamp)
        }));
      }
      return parsed.parsedData;
    } catch (error) {
      console.error('[LocalStorage] Error parsing FIT file data:', error);
      return null;
    }
  }

  deleteFITFile(fileKey: string): void {
    console.log('[LocalStorage] Deleting FIT file:', fileKey);
    localStorage.removeItem(fileKey);
  }

  // Helper to clean up FIT files that are no longer referenced
  private cleanupOrphanedFITFiles(): void {
    const races = this.getRaces();
    // Include BOTH comparison and autopace FIT file keys
    const validFITKeys = new Set([
      ...races.map(r => r.fit_comparison_file_key).filter(Boolean),
      ...races.map(r => r.fit_autopace_file_key).filter(Boolean)
    ]);

    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith('fit_') && !validFITKeys.has(key)) {
        console.log('[LocalStorage] Removing orphaned FIT file:', key);
        localStorage.removeItem(key);
      }
    }
  }

  // ============================================
  // USER NUTRITION PRODUCTS OPERATIONS
  // ============================================

  /**
   * Get user's saved custom nutrition products
   */
  getUserNutritionProducts(): UserNutritionProduct[] {
    const stored = localStorage.getItem(STORAGE_KEYS.USER_NUTRITION_PRODUCTS);
    if (!stored) return [];
    try {
      return JSON.parse(stored);
    } catch {
      return [];
    }
  }

  /**
   * Save a custom nutrition product to user's library
   */
  saveUserNutritionProduct(product: UserNutritionProduct): void {
    const products = this.getUserNutritionProducts();
    const existingIndex = products.findIndex(p => p.id === product.id);

    if (existingIndex >= 0) {
      products[existingIndex] = { ...product, updatedAt: new Date().toISOString() };
    } else {
      products.push(product);
    }

    localStorage.setItem(STORAGE_KEYS.USER_NUTRITION_PRODUCTS, JSON.stringify(products));
  }

  /**
   * Delete a custom nutrition product
   */
  deleteUserNutritionProduct(productId: string): void {
    const products = this.getUserNutritionProducts();
    const filtered = products.filter(p => p.id !== productId);
    localStorage.setItem(STORAGE_KEYS.USER_NUTRITION_PRODUCTS, JSON.stringify(filtered));
  }

  /**
   * Import nutrition products (merges with existing, avoids duplicates by name)
   */
  importNutritionProducts(products: UserNutritionProduct[], overwrite: boolean = false): {
    imported: number;
    skipped: number;
    updated: number;
  } {
    const existing = this.getUserNutritionProducts();
    let imported = 0;
    let skipped = 0;
    let updated = 0;

    for (const product of products) {
      const existingProduct = existing.find(
        p => p.name.toLowerCase() === product.name.toLowerCase()
      );

      if (existingProduct) {
        if (overwrite) {
          Object.assign(existingProduct, product, {
            id: existingProduct.id,
            updatedAt: new Date().toISOString()
          });
          updated++;
        } else {
          skipped++;
        }
      } else {
        existing.push({
          ...product,
          id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        });
        imported++;
      }
    }

    localStorage.setItem(STORAGE_KEYS.USER_NUTRITION_PRODUCTS, JSON.stringify(existing));
    return { imported, skipped, updated };
  }

  /**
   * Export user's nutrition products to JSON
   */
  exportNutritionProducts(): NutritionProductsExport {
    const products = this.getUserNutritionProducts();
    const categories = [...new Set(products.map(p => p.category).filter(Boolean))];

    return {
      version: '1.0.0',
      exportedAt: new Date().toISOString(),
      products,
      metadata: {
        totalProducts: products.length,
        categories: categories as string[],
      },
    };
  }

  // ============================================
  // RECENTLY USED PRODUCTS OPERATIONS
  // ============================================

  /**
   * Track product usage when added to a segment
   */
  trackProductUsage(productName: string): void {
    const recentlyUsed = this.getRecentlyUsedProducts();
    const existingIndex = recentlyUsed.findIndex(p => p.productName === productName);

    if (existingIndex >= 0) {
      // Update existing product
      recentlyUsed[existingIndex] = {
        productName,
        usageCount: recentlyUsed[existingIndex].usageCount + 1,
        lastUsedAt: new Date().toISOString(),
      };
    } else {
      // Add new product
      recentlyUsed.push({
        productName,
        usageCount: 1,
        lastUsedAt: new Date().toISOString(),
      });
    }

    // Sort by most recently used and limit to 10
    const sorted = recentlyUsed
      .sort((a, b) => new Date(b.lastUsedAt).getTime() - new Date(a.lastUsedAt).getTime())
      .slice(0, 10);

    localStorage.setItem(STORAGE_KEYS.RECENTLY_USED_PRODUCTS, JSON.stringify(sorted));
  }

  /**
   * Get recently used products (sorted by most recent)
   */
  getRecentlyUsedProducts(): RecentlyUsedProduct[] {
    const stored = localStorage.getItem(STORAGE_KEYS.RECENTLY_USED_PRODUCTS);
    if (!stored) return [];
    try {
      const products = JSON.parse(stored);
      // Return sorted by most recent
      return products.sort((a: RecentlyUsedProduct, b: RecentlyUsedProduct) =>
        new Date(b.lastUsedAt).getTime() - new Date(a.lastUsedAt).getTime()
      );
    } catch {
      return [];
    }
  }

  /**
   * Clear recently used products
   */
  clearRecentlyUsedProducts(): void {
    localStorage.removeItem(STORAGE_KEYS.RECENTLY_USED_PRODUCTS);
  }

  // ============================================
  // AUTO-PACE SETTINGS OPERATIONS
  // ============================================

  /**
   * Get auto-pace settings for a race
   */
  getAutoPaceSettings(raceId: number): AutoPaceSettings | null {
    const key = `${STORAGE_KEYS.AUTO_PACE_SETTINGS}_${raceId}`;
    const stored = localStorage.getItem(key);
    if (!stored) return null;
    try {
      return JSON.parse(stored);
    } catch {
      return null;
    }
  }

  /**
   * Save auto-pace settings for a race
   */
  saveAutoPaceSettings(raceId: number, settings: AutoPaceSettings): void {
    const key = `${STORAGE_KEYS.AUTO_PACE_SETTINGS}_${raceId}`;
    localStorage.setItem(key, JSON.stringify(settings));
    console.log('[LocalStorage] Auto-pace settings saved for race:', raceId);
  }

  /**
   * Delete auto-pace settings for a race
   */
  deleteAutoPaceSettings(raceId: number): void {
    const key = `${STORAGE_KEYS.AUTO_PACE_SETTINGS}_${raceId}`;
    localStorage.removeItem(key);
    console.log('[LocalStorage] Auto-pace settings deleted for race:', raceId);
  }

  /**
   * Set auto-pace FIT file for a race (separate from comparison FIT)
   */
  setAutoPaceFITFile(raceId: number, file: File): Promise<string> {
    return new Promise(async (resolve, reject) => {
      try {
        console.log('[LocalStorage] Starting auto-pace FIT upload for race:', raceId, 'File:', file.name);

        // Parse the FIT file
        const parsedData = await this.parseFITFile(file);

        // Validate that we have usable pace data
        if (!parsedData.records || parsedData.records.length === 0) {
          throw new Error('This FIT file does not contain usable pace data.');
        }

        const hasPace = parsedData.records.some(r => r.speed !== undefined);

        if (!hasPace) {
          throw new Error('This FIT file does not contain usable pace data for auto-pace derivation.');
        }

        const fileKey = `fit_autopace_${raceId}`;
        const fileData = {
          name: file.name,
          parsedData: parsedData,
        };

        // Clean up old auto-pace FIT file for this race if it exists
        const races = this.getRaces();
        const race = races.find(r => r.id === raceId);
        if (race?.fit_autopace_file_key) {
          console.log('[LocalStorage] Removing old auto-pace FIT file:', race.fit_autopace_file_key);
          localStorage.removeItem(race.fit_autopace_file_key);
        }

        // Try to save the new file
        try {
          localStorage.setItem(fileKey, JSON.stringify(fileData));
          console.log('[LocalStorage] Auto-pace FIT file saved to localStorage with key:', fileKey);
        } catch (quotaError) {
          // If quota exceeded, try cleanup and retry
          if (quotaError instanceof DOMException && quotaError.name === 'QuotaExceededError') {
            console.log('[LocalStorage] Quota exceeded, attempting cleanup...');

            // Remove all auto-pace FIT files except the one we're trying to save
            for (let i = 0; i < localStorage.length; i++) {
              const key = localStorage.key(i);
              if (key && key.startsWith('fit_autopace_') && key !== fileKey) {
                console.log('[LocalStorage] Removing auto-pace FIT file to free space:', key);
                localStorage.removeItem(key);
              }
            }

            // Try one more time
            localStorage.setItem(fileKey, JSON.stringify(fileData));
            console.log('[LocalStorage] Auto-pace FIT file saved after cleanup');
          } else {
            throw quotaError;
          }
        }

        // Update race with auto-pace FIT file key
        this.updateRace(raceId, { fit_autopace_file_key: fileKey });

        resolve(fileKey);
      } catch (error) {
        console.error('[LocalStorage] Error saving auto-pace FIT file:', error);
        if (error instanceof DOMException && error.name === 'QuotaExceededError') {
          reject(new Error('FIT file is too large. Browser storage limit exceeded. Try deleting old race plans.'));
        } else if (error instanceof Error) {
          reject(error);
        } else {
          reject(new Error('Failed to save auto-pace FIT file.'));
        }
      }
    });
  }

  /**
   * Get auto-pace FIT file data
   */
  getAutoPaceFITFile(fileKey: string): ParsedFITData | null {
    return this.getFITFile(fileKey); // Uses same parsing logic as comparison FIT
  }

  /**
   * Delete auto-pace FIT file
   */
  deleteAutoPaceFITFile(fileKey: string): void {
    this.deleteFITFile(fileKey);
  }

  // ============================================
  // GAP PROFILE OPERATIONS
  // ============================================

  /**
   * Save GAP profile to localStorage
   * Note: GAPProfile type is imported from gapProfileAnalyzer to avoid circular deps
   */
  saveGAPProfile(profile: {
    userId?: string;
    createdFromFIT: string;
    createdAt: string;
    uphillFactor: number;
    downhillFactor: number;
    climbingStrength: 'strong' | 'average' | 'weak';
    descendingStrength: 'strong' | 'average' | 'weak';
    gradientPaceData: Array<{
      gradient: number;
      avgPace: number;
      sampleSize: number;
    }>;
    dataQuality: 'high' | 'medium' | 'low';
    totalDataPoints: number;
    distanceCovered: number;
  }): void {
    try {
      localStorage.setItem(STORAGE_KEYS.GAP_PROFILE, JSON.stringify(profile));
      console.log('[LocalStorage] GAP profile saved');
    } catch (error) {
      console.error('[LocalStorage] Error saving GAP profile:', error);
      throw new Error('Unable to save GAP profile to localStorage');
    }
  }

  /**
   * Get GAP profile from localStorage
   */
  getGAPProfile(): {
    userId?: string;
    createdFromFIT: string;
    createdAt: string;
    uphillFactor: number;
    downhillFactor: number;
    climbingStrength: 'strong' | 'average' | 'weak';
    descendingStrength: 'strong' | 'average' | 'weak';
    gradientPaceData: Array<{
      gradient: number;
      avgPace: number;
      sampleSize: number;
    }>;
    dataQuality: 'high' | 'medium' | 'low';
    totalDataPoints: number;
    distanceCovered: number;
  } | null {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.GAP_PROFILE);
      if (!data) return null;
      return JSON.parse(data);
    } catch (error) {
      console.error('[LocalStorage] Error reading GAP profile:', error);
      return null;
    }
  }

  /**
   * Delete GAP profile from localStorage
   */
  deleteGAPProfile(): void {
    localStorage.removeItem(STORAGE_KEYS.GAP_PROFILE);
    console.log('[LocalStorage] GAP profile deleted');
  }
}

export const localStorageService = new LocalStorageService();
