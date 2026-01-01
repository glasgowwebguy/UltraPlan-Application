import { useState, useEffect } from 'react';
import { localStorageService } from '@/react-app/services/localStorage';
import type { Race } from '@/shared/types';

export function useRaces() {
  const [races, setRaces] = useState<Race[]>([]);
  const [loading, setLoading] = useState(true);

  const loadRaces = () => {
    try {
      const data = localStorageService.getRaces();
      setRaces(data);
    } catch (error) {
      console.error('Failed to load races:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadRaces();
  }, []);

  const createRace = async (data: {
    name: string;
    distance_miles: number;
    start_date_time?: string | null;
    timezone?: string | null;
    userId?: string;
  }) => {
    try {
      const race = localStorageService.createRace(data);
      setRaces([race, ...races]);
      return race;
    } catch (error) {
      console.error('Failed to create race:', error);
      throw error;
    }
  };

  const deleteRace = async (id: number) => {
    try {
      localStorageService.deleteRace(id);
      setRaces(races.filter(r => r.id !== id));
    } catch (error) {
      console.error('Failed to delete race:', error);
      throw error;
    }
  };

  return {
    races,
    loading,
    createRace,
    deleteRace,
    refreshRaces: loadRaces
  };
}
