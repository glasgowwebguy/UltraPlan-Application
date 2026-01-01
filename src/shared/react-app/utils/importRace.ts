import type { Race, Segment, ElevationLabel } from '@/shared/types';
import { localStorageService } from '@/react-app/services/localStorage';

interface ImportedRaceData {
  race: Race;
  segments: Segment[];
  elevationLabels: ElevationLabel[];
  gpxFileContent?: string;
  exportedAt: string;
}

export function importFromJSON(file: File): Promise<ImportedRaceData> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = (event) => {
      try {
        const jsonContent = event.target?.result as string;
        const data = JSON.parse(jsonContent) as ImportedRaceData;

        // Validate the structure
        if (!data.race || !Array.isArray(data.segments) || !Array.isArray(data.elevationLabels)) {
          throw new Error('Invalid JSON file format. Missing required fields.');
        }

        // Validate required race fields
        if (!data.race.name || !data.race.distance_miles) {
          throw new Error('Invalid race data. Missing required fields.');
        }

        resolve(data);
      } catch (error) {
        reject(new Error(`Failed to parse JSON file: ${error instanceof Error ? error.message : 'Unknown error'}`));
      }
    };

    reader.onerror = () => {
      reject(new Error('Failed to read the file'));
    };

    reader.readAsText(file);
  });
}

export async function createRaceFromImport(data: ImportedRaceData, userId?: string): Promise<Race> {
  try {
    // Create the race using local storage
    const createdRace = localStorageService.createRace({
      name: data.race.name,
      distance_miles: data.race.distance_miles,
      emergency_contact_name: data.race.emergency_contact_name,
      emergency_contact_phone: data.race.emergency_contact_phone,
      start_date_time: data.race.start_date_time,
      timezone: data.race.timezone,
      mandatory_kit: data.race.mandatory_kit,
      logo_url: data.race.logo_url,
      userId: userId,
    });

    // If there's GPX data, save it
    if (data.gpxFileContent && createdRace.id) {
      try {
        // Create a File object from the GPX content
        const gpxBlob = new Blob([data.gpxFileContent], { type: 'application/gpx+xml' });
        const gpxFile = new File([gpxBlob], 'imported.gpx', { type: 'application/gpx+xml' });
        await localStorageService.setGPXFile(createdRace.id, gpxFile);
      } catch (error) {
        console.error('Failed to import GPX file:', error);
      }
    }

    // Create segments
    for (const segment of data.segments) {
      try {
        localStorageService.createSegment({
          race_id: createdRace.id!,
          checkpoint_name: segment.checkpoint_name,
          segment_distance_miles: segment.segment_distance_miles,
          terrain_description: segment.terrain_description || undefined,
          nutrition_plan: segment.nutrition_plan || undefined,
          carb_goal_per_hour: segment.carb_goal_per_hour ?? undefined,
          sodium_goal_per_hour: segment.sodium_goal_per_hour ?? undefined,
          water_goal_per_hour: segment.water_goal_per_hour ?? undefined,
          segment_nutrition_items: segment.segment_nutrition_items || undefined,
          notes: segment.notes || undefined,
          map_reference: segment.map_reference || undefined,
          segment_order: segment.segment_order,
          custom_pace_min_per_mile: segment.custom_pace_min_per_mile ?? undefined,
          cutoff_time: segment.cutoff_time || undefined,
          checkpoint_time_minutes: segment.checkpoint_time_minutes ?? undefined,
          support_crew_present: segment.support_crew_present ?? undefined,
          support_crew_names: segment.support_crew_names || undefined,
          support_crew_members: segment.support_crew_members || undefined,
          plusCode: segment.plusCode || undefined,
          latitude: segment.latitude ?? undefined,
          longitude: segment.longitude ?? undefined,
        });
      } catch (error) {
        console.error('Failed to create segment:', segment.checkpoint_name, error);
      }
    }

    // Create elevation labels
    for (const label of data.elevationLabels) {
      try {
        localStorageService.createElevationLabel({
          race_id: createdRace.id!,
          distance_miles: label.distance_miles,
          label: label.label,
        });
      } catch (error) {
        console.error('Failed to create elevation label:', label.label, error);
      }
    }

    return createdRace;
  } catch (error) {
    throw new Error(`Failed to create race: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}
