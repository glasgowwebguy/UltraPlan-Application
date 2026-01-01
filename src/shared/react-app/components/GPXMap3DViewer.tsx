/**
 * GPX Map 3D Viewer Component
 * Displays GPX track with MapLibre (3D terrain and flyover)
 */

import { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import Map, { Source, Layer, Marker } from 'react-map-gl/maplibre';
import type { MapRef, ViewState } from 'react-map-gl/maplibre';
import 'maplibre-gl/dist/maplibre-gl.css';
import type { Segment } from '../../shared/types';
import type { TrackPoint, RouteSegment } from '../utils/gpxSegmentation';
import { splitTrackByCheckpoints, calculateBearing, sampleTrackPoints } from '../utils/gpxSegmentation';
import FlyoverControls, { type PlaybackSpeed } from './FlyoverControls';
import type { MapLayerType } from './MapLayerSelector';

interface GPXMap3DViewerProps {
  trackPoints: TrackPoint[];
  segments: Segment[];
  isFlyoverMode: boolean;
  mapLayer: MapLayerType;
}

export default function GPXMap3DViewer({ trackPoints, segments, isFlyoverMode, mapLayer }: GPXMap3DViewerProps) {
  const mapRef = useRef<MapRef>(null);
  const animationFrameRef = useRef<number | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [speed, setSpeed] = useState<PlaybackSpeed>(1);
  const [currentPointIndex, setCurrentPointIndex] = useState(0);
  const [mapLoaded, setMapLoaded] = useState(false);

  // Initial view state
  const initialLng = trackPoints[0]?.lng || 0;
  const initialLat = trackPoints[0]?.lat || 0;

  const [viewState, setViewState] = useState<Partial<ViewState>>({
    longitude: initialLng,
    latitude: initialLat,
    zoom: 13,
    pitch: isFlyoverMode ? 65 : 60,
    bearing: 0,
  });

  // Split track into colored segments
  const routeSegments = useMemo<RouteSegment[]>(
    () => splitTrackByCheckpoints(trackPoints, segments),
    [trackPoints, segments]
  );

  // Sample track points for flyover (every ~100m)
  const flyoverPoints = useMemo(
    () => sampleTrackPoints(trackPoints, 150), // Increased from 100 to 150 for smoother bearing changes
    [trackPoints]
  );

  // Filter segments with coordinates
  const segmentsWithCoordinates = useMemo(() =>
    segments.filter(s => s.latitude && s.longitude),
    [segments]
  );

  // Convert route segments to GeoJSON
  const segmentGeoJSONs = useMemo(() => {
    return routeSegments.map(segment => ({
      type: 'Feature' as const,
      properties: {
        color: segment.color,
        segmentIndex: segment.segmentIndex,
      },
      geometry: {
        type: 'LineString' as const,
        coordinates: segment.points.map(p => [p.lng, p.lat]),
      },
    }));
  }, [routeSegments]);

  // Set up terrain after map is loaded
  useEffect(() => {
    if (mapLoaded && mapRef.current) {
      const map = mapRef.current.getMap();

      // Wait for the terrain source to be added before enabling terrain
      const checkTerrainSource = () => {
        const source = map.getSource('terrainSource');
        if (source) {
          // Set terrain only after source is available
          map.setTerrain({ source: 'terrainSource', exaggeration: 2.5 });
        } else {
          // Check again in a bit
          setTimeout(checkTerrainSource, 100);
        }
      };

      checkTerrainSource();
    }
  }, [mapLoaded]);

  // Fit bounds on initial load
  useEffect(() => {
    if (mapLoaded && mapRef.current && trackPoints.length > 0) {
      // Calculate bounds
      const lngs = trackPoints.map(p => p.lng);
      const lats = trackPoints.map(p => p.lat);
      const bounds: [[number, number], [number, number]] = [
        [Math.min(...lngs), Math.min(...lats)],
        [Math.max(...lngs), Math.max(...lats)],
      ];

      mapRef.current.fitBounds(bounds, { padding: 50, duration: 1000 });
    }
  }, [mapLoaded, trackPoints]);

  // Flyover animation with smoother transitions
  const animateFlyover = useCallback(() => {
    if (!isPlaying || currentPointIndex >= flyoverPoints.length - 1) {
      setIsPlaying(false);
      return;
    }

    const currentPoint = flyoverPoints[currentPointIndex];
    const nextPoint = flyoverPoints[Math.min(currentPointIndex + 1, flyoverPoints.length - 1)];
    // Look ahead for smoother bearing
    const lookAheadPoint = flyoverPoints[Math.min(currentPointIndex + 2, flyoverPoints.length - 1)];

    if (!currentPoint || !nextPoint) {
      setIsPlaying(false);
      return;
    }

    // Calculate bearing using look-ahead point for smoother transitions
    const bearing = calculateBearing(currentPoint, lookAheadPoint || nextPoint);

    // Smooth animation duration based on speed
    const baseDuration = 1200; // Longer duration for smoother motion
    const duration = baseDuration / speed;

    // Animate camera to next position with easing
    mapRef.current?.easeTo({
      center: [currentPoint.lng, currentPoint.lat],
      bearing,
      pitch: 65,
      zoom: 14.5, // Slightly lower zoom for better overview
      duration,
      easing: (t) => {
        // Cubic ease-in-out for ultra-smooth motion
        return t < 0.5
          ? 4 * t * t * t
          : 1 - Math.pow(-2 * t + 2, 3) / 2;
      },
    });

    // Schedule next frame
    const timeout = setTimeout(() => {
      setCurrentPointIndex(prev => prev + 1);
    }, duration * 0.85); // Overlap animations for seamless blend

    animationFrameRef.current = timeout as unknown as number;
  }, [isPlaying, currentPointIndex, flyoverPoints, speed]);

  // Run animation
  useEffect(() => {
    if (isFlyoverMode && isPlaying) {
      animateFlyover();
    }

    return () => {
      if (animationFrameRef.current) {
        clearTimeout(animationFrameRef.current);
      }
    };
  }, [isFlyoverMode, isPlaying, animateFlyover]);

  // Auto-start flyover when entering flyover mode
  useEffect(() => {
    if (isFlyoverMode && !isPlaying && currentPointIndex === 0) {
      setIsPlaying(true);
    }
  }, [isFlyoverMode]);

  const handlePlayPause = () => {
    setIsPlaying(!isPlaying);
  };

  const handleRestart = () => {
    setCurrentPointIndex(0);
    setIsPlaying(true);
  };

  const handleSpeedChange = (newSpeed: PlaybackSpeed) => {
    setSpeed(newSpeed);
  };

  if (trackPoints.length === 0) {
    return null;
  }

  // Create dynamic map style based on layer type
  const mapStyle = useMemo(() => {
    const baseStyle = {
      version: 8 as const,
      sources: {} as Record<string, any>,
      layers: [] as any[],
    };

    if (mapLayer === 'street') {
      baseStyle.sources.osm = {
        type: 'raster' as const,
        tiles: ['https://tile.openstreetmap.org/{z}/{x}/{y}.png'],
        tileSize: 256,
        attribution: '&copy; OpenStreetMap Contributors',
      };
      baseStyle.layers.push({
        id: 'osm',
        type: 'raster' as const,
        source: 'osm',
        minzoom: 0,
        maxzoom: 19,
      });
    } else if (mapLayer === 'satellite') {
      baseStyle.sources.satellite = {
        type: 'raster' as const,
        tiles: ['https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}'],
        tileSize: 256,
        attribution: '&copy; Esri',
      };
      baseStyle.layers.push({
        id: 'satellite',
        type: 'raster' as const,
        source: 'satellite',
        minzoom: 0,
        maxzoom: 19,
      });
    } else if (mapLayer === 'hybrid') {
      // Satellite base
      baseStyle.sources.satellite = {
        type: 'raster' as const,
        tiles: ['https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}'],
        tileSize: 256,
        attribution: '&copy; Esri',
      };
      // Labels overlay
      baseStyle.sources.labels = {
        type: 'raster' as const,
        tiles: ['https://a.basemaps.cartocdn.com/light_only_labels/{z}/{x}/{y}.png'],
        tileSize: 256,
      };
      baseStyle.layers.push(
        {
          id: 'satellite',
          type: 'raster' as const,
          source: 'satellite',
          minzoom: 0,
          maxzoom: 19,
        },
        {
          id: 'labels',
          type: 'raster' as const,
          source: 'labels',
          minzoom: 0,
          maxzoom: 19,
        }
      );
    }

    return baseStyle;
  }, [mapLayer]);

  return (
    <div className="relative h-[600px] rounded-lg overflow-hidden border-2 border-gray-600">
      <Map
        key={mapLayer}
        ref={mapRef}
        {...viewState}
        onMove={(evt) => setViewState(evt.viewState)}
        onLoad={() => setMapLoaded(true)}
        mapStyle={mapStyle}
        style={{ width: '100%', height: '100%' }}
      >
        {/* Terrain Source - Must be added as a child component */}
        <Source
          id="terrainSource"
          type="raster-dem"
          tiles={['https://s3.amazonaws.com/elevation-tiles-prod/terrarium/{z}/{x}/{y}.png']}
          tileSize={256}
          encoding="terrarium"
        />

        {/* Multi-color Route Segments */}
        {segmentGeoJSONs.map((geojson, idx) => (
          <Source
            key={`segment-${idx}`}
            id={`route-segment-${idx}`}
            type="geojson"
            data={geojson}
          >
            <Layer
              id={`route-layer-${idx}`}
              type="line"
              paint={{
                'line-color': geojson.properties.color,
                'line-width': 4,
                'line-opacity': 0.8,
              }}
            />
          </Source>
        ))}

        {/* Checkpoint Markers */}
        {segmentsWithCoordinates.map((segment) => (
          <Marker
            key={segment.id}
            longitude={segment.longitude!}
            latitude={segment.latitude!}
            anchor="bottom"
          >
            <div className="relative group">
              {/* Checkpoint Pin */}
              <svg width="32" height="32" viewBox="0 0 32 32">
                <circle cx="16" cy="16" r="12" fill="#10b981" stroke="white" strokeWidth="3" />
                <circle cx="16" cy="16" r="5" fill="white" />
              </svg>

              {/* Popup on Hover */}
              <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 hidden group-hover:block bg-white text-gray-900 rounded-lg shadow-xl p-3 whitespace-nowrap z-10">
                <p className="font-bold mb-1">{segment.checkpoint_name}</p>
                <p className="text-sm text-gray-600">
                  Distance: {segment.cumulative_distance_miles.toFixed(1)} mi
                </p>
                {segment.terrain_description && (
                  <p className="text-xs text-gray-600 mt-1">
                    {segment.terrain_description}
                  </p>
                )}
              </div>
            </div>
          </Marker>
        ))}
      </Map>

      {/* Flyover Controls */}
      {isFlyoverMode && (
        <FlyoverControls
          isPlaying={isPlaying}
          speed={speed}
          onPlayPause={handlePlayPause}
          onRestart={handleRestart}
          onSpeedChange={handleSpeedChange}
          disabled={!mapLoaded}
        />
      )}
    </div>
  );
}
