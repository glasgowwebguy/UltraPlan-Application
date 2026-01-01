import { useState, useEffect } from 'react';
import { Map, ChevronDown, ChevronUp, Loader2 } from 'lucide-react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { localStorageService } from '../services/localStorage';
import type { Segment } from '../../shared/types';
import type { TrackPoint } from '../utils/gpxSegmentation';
import ViewModeSelector, { type ViewMode } from './ViewModeSelector';
import MapLayerSelector, { type MapLayerType } from './MapLayerSelector';
import GPXMap2DView from './GPXMap2DView';
import GPXMap3DViewer from './GPXMap3DViewer';

// Fix Leaflet default icon issue with Vite
import markerIcon2x from 'leaflet/dist/images/marker-icon-2x.png';
import markerIcon from 'leaflet/dist/images/marker-icon.png';
import markerShadow from 'leaflet/dist/images/marker-shadow.png';

delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: markerIcon2x,
  iconUrl: markerIcon,
  shadowUrl: markerShadow,
});

interface GPXMapViewerProps {
  segments: Segment[];
  gpxFileKey?: string | null;
}

export default function GPXMapViewer({ segments, gpxFileKey }: GPXMapViewerProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [viewMode, setViewMode] = useState<ViewMode>('2d');
  const [mapLayer, setMapLayer] = useState<MapLayerType>('street');
  const [trackPoints, setTrackPoints] = useState<TrackPoint[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasGPX, setHasGPX] = useState(false);

  // Load GPX data
  const loadGPXData = async () => {
    try {
      setLoading(true);
      setError(null);

      if (!gpxFileKey) {
        setHasGPX(false);
        setTrackPoints([]);
        return;
      }

      // Get GPX file from localStorage
      const gpxFile = localStorageService.getGPXFile(gpxFileKey);

      if (!gpxFile) {
        setHasGPX(false);
        setTrackPoints([]);
        return;
      }

      setHasGPX(true);

      // Parse GPX file
      const parser = new DOMParser();
      const xmlDoc = parser.parseFromString(gpxFile.content, 'text/xml');

      // Check for parsing errors
      const parseError = xmlDoc.querySelector('parsererror');
      if (parseError) {
        throw new Error('Invalid GPX file format');
      }

      const trkpts = xmlDoc.getElementsByTagName('trkpt');

      if (trkpts.length === 0) {
        throw new Error('No track points found in GPX file');
      }

      // Extract lat/lng coordinates
      let points: TrackPoint[] = [];
      for (let i = 0; i < trkpts.length; i++) {
        const trkpt = trkpts[i];
        const lat = parseFloat(trkpt.getAttribute('lat') || '0');
        const lng = parseFloat(trkpt.getAttribute('lon') || '0');
        points.push({ lat, lng });
      }

      // Sample large GPX files for performance
      const MAX_POINTS = 5000;
      if (points.length > MAX_POINTS) {
        const step = Math.ceil(points.length / MAX_POINTS);
        points = points.filter((_, i) => i % step === 0);
        console.log(`[GPX Map] Sampled ${points.length} points from ${trkpts.length} total points`);
      }

      console.log('[GPX Map] Loaded track points:', points.length);
      setTrackPoints(points);
    } catch (err) {
      console.error('[GPX Map] Failed to load GPX:', err);
      setError(err instanceof Error ? err.message : 'Failed to load GPX file');
      setHasGPX(false);
    } finally {
      setLoading(false);
    }
  };

  // Load GPX data when expanded or when gpxFileKey changes
  useEffect(() => {
    if (isExpanded && gpxFileKey) {
      loadGPXData();
    }
  }, [isExpanded, gpxFileKey]);

  return (
    <div className="bg-white dark:bg-[#2d3548] coloursplash:bg-white rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 coloursplash:border-splash-border p-6 mb-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-lg font-bold text-gray-900 dark:text-white coloursplash:text-splash-text-primary flex items-center gap-2">
          <Map className="w-5 h-5" />
          Explore GPX Map
        </h3>
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="p-2 text-gray-600 dark:text-gray-400 coloursplash:text-splash-text-secondary hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-[#333c52] coloursplash:hover:bg-splash-azure-light rounded-lg transition-all"
          aria-label={isExpanded ? 'Hide map' : 'Show map'}
          aria-expanded={isExpanded}
          disabled={!gpxFileKey}
        >
          {isExpanded ? (
            <ChevronUp className="w-5 h-5" />
          ) : (
            <ChevronDown className="w-5 h-5" />
          )}
        </button>
      </div>

      {/* Collapsed State Tip */}
      {!isExpanded && gpxFileKey && (
        <p className="text-xs text-gray-600 dark:text-gray-400 coloursplash:text-splash-text-muted mt-2">
          Click to view interactive route map with checkpoints
        </p>
      )}

      {!isExpanded && !gpxFileKey && (
        <p className="text-xs text-gray-600 dark:text-gray-400 coloursplash:text-splash-text-muted mt-2">
          Upload a GPX file to view the route map
        </p>
      )}

      {/* Expanded Map Content */}
      {isExpanded && (
        <div className="mt-4" role="region" aria-label="GPX route map">
          {loading && (
            <div className="flex items-center justify-center h-96 bg-gray-50 dark:bg-[#1e2639] coloursplash:bg-white rounded-lg border-2 border-gray-300 dark:border-gray-600 coloursplash:border-splash-border">
              <div className="text-center">
                <Loader2 className="w-8 h-8 text-blue-400 animate-spin mx-auto mb-2" />
                <p className="text-gray-700 dark:text-gray-300 coloursplash:text-splash-text-primary">Loading map...</p>
              </div>
            </div>
          )}

          {error && !loading && (
            <div className="flex items-center justify-center h-96 bg-gray-50 dark:bg-[#1e2639] coloursplash:bg-white rounded-lg border-2 border-gray-300 dark:border-gray-600 coloursplash:border-splash-border">
              <div className="text-center">
                <p className="text-red-600 dark:text-red-400 mb-4 font-semibold">Failed to load map</p>
                <p className="text-sm text-gray-600 dark:text-gray-500 coloursplash:text-splash-text-muted mb-4">{error}</p>
                <button
                  onClick={loadGPXData}
                  className="px-4 py-2 bg-blue-500 hover:bg-blue-600 coloursplash:bg-white coloursplash:text-splash-text-primary coloursplash:border coloursplash:border-splash-border coloursplash:hover:bg-splash-azure-light text-white rounded-lg transition-all"
                >
                  Retry
                </button>
              </div>
            </div>
          )}

          {!hasGPX && !loading && !error && (
            <div className="flex items-center justify-center h-96 bg-gray-50 dark:bg-[#1e2639] coloursplash:bg-white rounded-lg border-2 border-dashed border-gray-300 dark:border-gray-600 coloursplash:border-splash-border">
              <div className="text-center">
                <Map className="w-16 h-16 text-gray-400 dark:text-gray-500 coloursplash:text-splash-text-secondary mx-auto mb-4" />
                <p className="text-gray-700 dark:text-gray-300 coloursplash:text-splash-text-primary font-medium mb-2">No GPX file uploaded</p>
                <p className="text-sm text-gray-600 dark:text-gray-500 coloursplash:text-splash-text-muted">Upload a GPX file to view the route map</p>
              </div>
            </div>
          )}

          {hasGPX && trackPoints.length > 0 && !loading && !error && (
            <>
              {/* View Mode and Layer Selectors */}
              <div className="flex flex-wrap items-center justify-between gap-4 mb-4">
                <ViewModeSelector selectedMode={viewMode} onModeChange={setViewMode} />
                <MapLayerSelector selectedLayer={mapLayer} onLayerChange={setMapLayer} />
              </div>

              {/* Render appropriate map based on view mode */}
              {viewMode === '2d' && (
                <GPXMap2DView trackPoints={trackPoints} segments={segments} mapLayer={mapLayer} />
              )}

              {(viewMode === '3d' || viewMode === 'flyover') && (
                <GPXMap3DViewer
                  trackPoints={trackPoints}
                  segments={segments}
                  isFlyoverMode={viewMode === 'flyover'}
                  mapLayer={mapLayer}
                />
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}
