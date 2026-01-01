/**
 * Import Service
 * Handles importing community plans to user's local storage
 */

import { localStorageService } from './localStorage';
import type { CommunityPlan } from '@/shared/types';

/**
 * Import a community plan to the user's local storage
 * Creates a new race with all segments and elevation labels
 */
export async function importCommunityPlan(
  plan: CommunityPlan,
  userId: string
): Promise<{ success: boolean; raceId?: number; error?: string }> {
  try {
    console.log('[ImportService] Starting import for plan:', plan.id);

    // Create the race
    const newRace = localStorageService.createRace({
      name: `${plan.raceName} (Imported)`,
      distance_miles: plan.distanceMiles,
      start_date_time: plan.startDateTime || null,
      timezone: plan.planData.race.timezone || null,
      emergency_contact_name: plan.planData.race.emergency_contact_name || null,
      emergency_contact_phone: plan.planData.race.emergency_contact_phone || null,
      mandatory_kit: plan.planData.race.mandatory_kit || null,
      userId: userId,
    });

    console.log('[ImportService] Created race:', newRace.id);

    if (!newRace.id) {
      throw new Error('Failed to create race - no ID returned');
    }

    const raceId = newRace.id;

    // Create all segments
    for (const segment of plan.planData.segments) {
      localStorageService.createSegment({
        race_id: raceId,
        checkpoint_name: segment.checkpoint_name,
        segment_distance_miles: segment.segment_distance_miles,
        terrain_description: segment.terrain_description || undefined,
        nutrition_plan: segment.nutrition_plan || undefined,
        carb_goal_per_hour: segment.carb_goal_per_hour ?? undefined,
        segment_nutrition_items: segment.segment_nutrition_items || undefined,
        notes: segment.notes || undefined,
        map_reference: segment.map_reference || undefined,
        segment_order: segment.segment_order,
        custom_pace_min_per_mile: segment.custom_pace_min_per_mile || undefined,
        cutoff_time: segment.cutoff_time || undefined,
        checkpoint_time_minutes: segment.checkpoint_time_minutes || undefined,
        support_crew_present: segment.support_crew_present || undefined,
        support_crew_names: segment.support_crew_names || undefined,
        support_crew_members: segment.support_crew_members || undefined,
        plusCode: segment.plusCode || undefined,
        latitude: segment.latitude !== null ? segment.latitude : undefined,
        longitude: segment.longitude !== null ? segment.longitude : undefined,
      });
    }

    console.log('[ImportService] Created', plan.planData.segments.length, 'segments');

    // Create all elevation labels
    for (const label of plan.planData.elevationLabels) {
      localStorageService.createElevationLabel({
        race_id: raceId,
        distance_miles: label.distance_miles,
        label: label.label,
      });
    }

    console.log('[ImportService] Created', plan.planData.elevationLabels.length, 'elevation labels');

    // Import GPX file if available
    if (plan.planData.gpxContent) {
      try {
        console.log('[ImportService] Restoring GPX file');

        // Create a Blob from the GPX content
        const gpxBlob = new Blob([plan.planData.gpxContent], { type: 'application/gpx+xml' });

        // Create a File object from the Blob
        const gpxFile = new File([gpxBlob], `${plan.raceName}.gpx`, { type: 'application/gpx+xml' });

        // Save to local storage - this will update the race with the GPX file key
        const gpxFileKey = await localStorageService.setGPXFile(raceId, gpxFile);

        console.log('[ImportService] GPX file restored successfully with key:', gpxFileKey);
      } catch (gpxError) {
        console.error('[ImportService] Failed to restore GPX file:', gpxError);
        // Continue without GPX - user can upload later if needed
      }
    } else {
      console.log('[ImportService] No GPX content to import');
    }

    return {
      success: true,
      raceId: raceId,
    };
  } catch (error) {
    console.error('[ImportService] Failed to import plan:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to import plan',
    };
  }
}
