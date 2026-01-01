/**
 * GPX Map 2D View Component
 * Displays GPX track with Leaflet (2D map) with multi-color segments
 */

import { useEffect, useMemo } from 'react';
import { MapContainer, TileLayer, Polyline, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import type { Segment } from '../../shared/types';
import type { TrackPoint, RouteSegment } from '../utils/gpxSegmentation';
import { splitTrackByCheckpoints } from '../utils/gpxSegmentation';
import MapLegend from './MapLegend';
import type { MapLayerType } from './MapLayerSelector';

// Tile layer configurations (all free, no API key required)
const TILE_LAYERS = {
  street: {
    url: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
  },
  satellite: {
    url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
    attribution: '&copy; <a href="https://www.esri.com/">Esri</a>',
  },
  hybrid: {
    url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
    labelsUrl: 'https://{s}.basemaps.cartocdn.com/light_only_labels/{z}/{x}/{y}{r}.png',
    attribution: '&copy; <a href="https://www.esri.com/">Esri</a> | <a href="https://carto.com/">Carto</a>',
  },
} as const;

// Custom green checkpoint marker icon
const checkpointIcon = new L.Icon({
  iconUrl: 'data:image/svg+xml;base64,' + btoa(`
    <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 32 32">
      <circle cx="16" cy="16" r="12" fill="#10b981" stroke="white" stroke-width="3"/>
      <circle cx="16" cy="16" r="5" fill="white"/>
    </svg>
  `),
  iconSize: [32, 32],
  iconAnchor: [16, 16],
  popupAnchor: [0, -16],
});

// Helper component to auto-fit map bounds
function MapBoundsSetter({
  trackPoints,
  segments
}: {
  trackPoints: TrackPoint[];
  segments: Segment[];
}) {
  const map = useMap();

  useEffect(() => {
    if (trackPoints.length > 0) {
      // Create bounds from track points
      const bounds = L.latLngBounds(trackPoints.map(p => [p.lat, p.lng]));

      // Add segment markers to bounds
      segments.forEach(segment => {
        if (segment.latitude && segment.longitude) {
          bounds.extend([segment.latitude, segment.longitude]);
        }
      });

      // Fit map to bounds with padding
      map.fitBounds(bounds, { padding: [50, 50] });
    }
  }, [trackPoints, segments, map]);

  return null;
}

interface GPXMap2DViewProps {
  trackPoints: TrackPoint[];
  segments: Segment[];
  mapLayer: MapLayerType;
}

export default function GPXMap2DView({ trackPoints, segments, mapLayer }: GPXMap2DViewProps) {
  // Memoize track points to prevent unnecessary re-renders
  const memoizedTrackPoints = useMemo(() => trackPoints, [trackPoints]);

  // Filter segments that have coordinates
  const segmentsWithCoordinates = useMemo(() =>
    segments.filter(s => s.latitude && s.longitude),
    [segments]
  );

  // Split track into colored segments
  const routeSegments = useMemo<RouteSegment[]>(
    () => splitTrackByCheckpoints(memoizedTrackPoints, segments),
    [memoizedTrackPoints, segments]
  );

  if (trackPoints.length === 0) {
    return null;
  }

  // Get current tile layer config
  const tileConfig = TILE_LAYERS[mapLayer];

  return (
    <div className="h-[600px] rounded-lg overflow-hidden border-2 border-gray-600 relative">
      <MapContainer
        center={[memoizedTrackPoints[0].lat, memoizedTrackPoints[0].lng]}
        zoom={13}
        className="h-full w-full"
        style={{ background: '#1e2639' }}
      >
        {/* Base Tile Layer */}
        <TileLayer
          key={mapLayer}
          url={tileConfig.url}
          attribution={tileConfig.attribution}
          subdomains={mapLayer === 'street' ? ['a', 'b', 'c'] : []}
        />

        {/* Labels overlay for hybrid mode */}
        {mapLayer === 'hybrid' && 'labelsUrl' in tileConfig && (
          <TileLayer
            url={tileConfig.labelsUrl}
            attribution=""
            pane="overlayPane"
          />
        )}

        {/* Multi-color Route Segments */}
        {routeSegments.map((segment, idx) => (
          <Polyline
            key={idx}
            positions={segment.points.map(p => [p.lat, p.lng])}
            pathOptions={{
              color: segment.color,
              weight: 4,
              opacity: 0.8
            }}
          />
        ))}

        {/* Checkpoint Markers */}
        {segmentsWithCoordinates.map((segment) => (
          <Marker
            key={segment.id}
            position={[segment.latitude!, segment.longitude!]}
            icon={checkpointIcon}
          >
            <Popup>
              <div className="text-sm">
                <p className="font-bold text-gray-900 mb-1">{segment.checkpoint_name}</p>
                <p className="text-gray-600">
                  Distance: {segment.cumulative_distance_miles.toFixed(1)} mi
                </p>
                {segment.terrain_description && (
                  <p className="text-gray-600 text-xs mt-1">
                    {segment.terrain_description}
                  </p>
                )}
              </div>
            </Popup>
          </Marker>
        ))}

        {/* Auto-fit bounds */}
        <MapBoundsSetter trackPoints={memoizedTrackPoints} segments={segmentsWithCoordinates} />
      </MapContainer>

      {/* Legend Overlay */}
      <MapLegend segments={segments} routeSegments={routeSegments} />
    </div>
  );
}
