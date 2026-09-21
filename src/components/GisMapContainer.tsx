import React, { useEffect, useRef, useState, useMemo } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import {
  HazardZone,
  SensorNode,
  HistoricalLandslideEvent,
  MlHeatmapPoint,
  ZoneMlRiskEvaluation,
  EarthquakeEvent,
  HistoricalEarthquakeEvent,
} from '../types';
import {
  Crosshair,
  Maximize2,
  Minimize2,
  Sliders,
  Flame,
  Globe,
  Mountain,
  Satellite,
  RotateCw,
  Sparkles,
} from 'lucide-react';
import { ThreeDMapView } from './ThreeDMapView';
import { FocusCoordinates } from '../context/MapContext';
import { HillsRegion } from '../data/hillsData';
import { LiveRiskLayer } from './map/LiveRiskLayer';
import { AdministrativeBoundaryLayer } from './map/AdministrativeBoundaryLayer';

export type GoogleEarthBasemap = 'satellite' | 'hybrid' | 'terrain' | '3d_earth';

interface GisMapContainerProps {
  selectedZone: HazardZone;
  onSelectZone: (zone: HazardZone) => void;
  zones: HazardZone[];
  sensors: SensorNode[];
  trainingEvents: HistoricalLandslideEvent[];
  selectedEvent: HistoricalLandslideEvent | null;
  onSelectEvent: (event: HistoricalLandslideEvent | null) => void;
  zoneMlRisk: ZoneMlRiskEvaluation | null;
  heatmapPoints: MlHeatmapPoint[];
  earthquakes: EarthquakeEvent[];
  historicalEarthquakes: HistoricalEarthquakeEvent[];
  earthquakeStatus: string;
  stressRainfall: number;
  activeLayers: {
    susceptibility: boolean;
    demContours: boolean;
    imdRadar: boolean;
    soilSaturation: boolean;
    sensorNodes: boolean;
    mlInference: boolean;
    trainingEvents: boolean;
    mlHeatmap: boolean;
    earthquakeEvents: boolean;
    historicalEarthquakeEvents: boolean;
    liveEarthquakes?: boolean;
    historicalLandslides?: boolean;
    seismicActivity?: boolean;
    liveRiskZones?: boolean;
    administrativeBoundaries?: boolean;
    rainfall?: boolean;
    citizenReports?: boolean;
  };
  onToggleLayer: (layerKey: string) => void;
  onShowToast: (msg: string) => void;
  is3DMode: boolean;
  onToggle3D: () => void;
  selectedHillRegion?: HillsRegion | null;
  focusCoordinates?: FocusCoordinates | null;
}

// Coordinate parser for "27.5312° N, 88.5134° E"
function parseZoneCoordinates(coordStr: string): [number, number] {
  try {
    const cleaned = coordStr.replace(/[°NSEW]/g, '').trim();
    const parts = cleaned.split(',');
    if (parts.length === 2) {
      const lat = parseFloat(parts[0].trim());
      const lon = parseFloat(parts[1].trim());
      if (!isNaN(lat) && !isNaN(lon)) return [lat, lon];
    }
  } catch { }
  return [27.5312, 88.5134];
}

function formatLastUpdated(value?: string | null): string {
  if (!value) return 'not available';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' });
}

export const GisMapContainer: React.FC<GisMapContainerProps> = ({
  selectedZone,
  onSelectZone,
  zones,
  sensors,
  trainingEvents,
  selectedEvent,
  onSelectEvent,
  zoneMlRisk,
  heatmapPoints,
  earthquakes,
  historicalEarthquakes,
  earthquakeStatus,
  stressRainfall,
  activeLayers,
  onToggleLayer,
  onShowToast,
  is3DMode,
  onToggle3D,
  selectedHillRegion = null,
  focusCoordinates,
}) => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const canvasOverlayRef = useRef<HTMLCanvasElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const [mapInstance, setMapInstance] = useState<L.Map | null>(null);
  const tileLayerRef = useRef<L.TileLayer | null>(null);
  const markersLayerGroupRef = useRef<L.LayerGroup | null>(null);
  const trainingEventsLayerGroupRef = useRef<L.LayerGroup | null>(null);
  const sensorsLayerGroupRef = useRef<L.LayerGroup | null>(null);
  const earthquakesLayerGroupRef = useRef<L.LayerGroup | null>(null);
  const historicalEarthquakesLayerGroupRef = useRef<L.LayerGroup | null>(null);
  const rainfallLayerGroupRef = useRef<L.LayerGroup | null>(null);
  const reportClusterLayerGroupRef = useRef<L.LayerGroup | null>(null);
  const selectedHillMarkerLayerRef = useRef<L.LayerGroup | null>(null);
  const shelterMarkerLayerRef = useRef<L.LayerGroup | null>(null);

  const [basemap, setBasemap] = useState<GoogleEarthBasemap>('hybrid');
  const [heatmapRadius, setHeatmapRadius] = useState<number>(32);
  const [heatmapOpacity, setHeatmapOpacity] = useState<number>(0.75);
  const [showSettingsPanel, setShowSettingsPanel] = useState<boolean>(false);
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);
  const [currentZoom, setCurrentZoom] = useState<number>(9);
  const [riskPolygons, setRiskPolygons] = useState<any>({ type: 'FeatureCollection', features: [] });
  const [boundaries, setBoundaries] = useState<any>({ type: 'FeatureCollection', features: [] });
  const [rainfallFeed, setRainfallFeed] = useState<{
    latitude: number;
    longitude: number;
    station_name: string;
    district: string;
    state: string;
    current_rainfall_mm_hr: number;
    antecedent_72h_rainfall_mm: number;
    last_updated: string;
  } | null>(null);
  const [reportClusters, setReportClusters] = useState<Array<{
    id: string;
    latitude: number;
    longitude: number;
    count: number;
    severity: string;
    location: string;
    classification: string;
  }>>([]);
  const [rainfallStatus, setRainfallStatus] = useState<{ loading: boolean; error: string | null; lastUpdated: string | null }>({
    loading: false,
    error: null,
    lastUpdated: null,
  });
  const [reportStatus, setReportStatus] = useState<{ loading: boolean; error: string | null; lastUpdated: string | null }>({
    loading: false,
    error: null,
    lastUpdated: null,
  });
  const [earthquakeLayerStatus, setEarthquakeLayerStatus] = useState<{ loading: boolean; error: string | null; lastUpdated: string | null }>({
    loading: false,
    error: null,
    lastUpdated: null,
  });
  const [liveEarthquakeStatus, setLiveEarthquakeStatus] = useState<string>(earthquakeStatus);

  useEffect(() => {
    setLiveEarthquakeStatus(earthquakeStatus);
  }, [earthquakeStatus]);

  useEffect(() => {
    let ignore = false;
    const controller = new AbortController();

    const loadMapLayers = async () => {
      try {
        const [riskResp, boundaryResp] = await Promise.all([
          fetch(`${(import.meta.env.VITE_API_BASE_URL || '').trim().replace(/\/+$/, '')}/api/map/risk-polygons?state=${encodeURIComponent(selectedZone.state.toLowerCase())}`, { signal: controller.signal }),
          fetch(`${(import.meta.env.VITE_API_BASE_URL || '').trim().replace(/\/+$/, '')}/api/map/boundaries?level=state`, { signal: controller.signal }),
        ]);

        if (ignore) return;

        if (riskResp.ok) {
          const riskJson = await riskResp.json();
          setRiskPolygons(riskJson || { type: 'FeatureCollection', features: [] });
        }
        if (boundaryResp.ok) {
          const boundaryJson = await boundaryResp.json();
          setBoundaries(boundaryJson || { type: 'FeatureCollection', features: [] });
        }
      } catch (error: any) {
        if (error?.name !== 'AbortError') {
          console.warn('Map live layer unavailable:', error);
        }
      }
    };

    loadMapLayers();
    return () => {
      ignore = true;
      controller.abort();
    };
  }, [selectedZone.state]);

  // Google Earth tile URLs (high-speed Google tile servers)
  const tileConfigs = useMemo(() => ({
    satellite: {
      url: 'https://mt{s}.google.com/vt/lyrs=s&x={x}&y={y}&z={z}',
      subdomains: ['0', '1', '2', '3'],
      attribution: '&copy; Google Earth Imagery',
      maxZoom: 20,
    },
    hybrid: {
      url: 'https://mt{s}.google.com/vt/lyrs=y&x={x}&y={y}&z={z}',
      subdomains: ['0', '1', '2', '3'],
      attribution: '&copy; Google Earth Hybrid (Imagery + Roads)',
      maxZoom: 20,
    },
    terrain: {
      url: 'https://mt{s}.google.com/vt/lyrs=p&x={x}&y={y}&z={z}',
      subdomains: ['0', '1', '2', '3'],
      attribution: '&copy; Google Earth Terrain & Contours',
      maxZoom: 20,
    },
  }), []);

  // Parse active zone coordinates
  const activeZoneCoords = useMemo(
    () => parseZoneCoordinates(selectedZone.coords),
    [selectedZone.coords]
  );

  // Initialize Leaflet Map
  useEffect(() => {
    if (!mapContainerRef.current || mapRef.current) return;

    const initialCoords = (focusCoordinates && Number.isFinite(focusCoordinates.latitude) && Number.isFinite(focusCoordinates.longitude))
      ? [focusCoordinates.latitude, focusCoordinates.longitude] as [number, number]
      : (selectedHillRegion?.coordinatesVerified && selectedHillRegion.latitude !== undefined && selectedHillRegion.longitude !== undefined)
        ? [selectedHillRegion.latitude, selectedHillRegion.longitude] as [number, number]
        : activeZoneCoords;
    const initialZoom = focusCoordinates?.zoom ?? 9;

    const map = L.map(mapContainerRef.current, {
      center: initialCoords,
      zoom: initialZoom,
      zoomControl: false,
      attributionControl: false,
      fadeAnimation: true,
      zoomAnimation: true,
    });

    // Google Earth Tile Layer
    const tileConfig = tileConfigs[basemap === '3d_earth' ? 'hybrid' : basemap];
    const tileLayer = L.tileLayer(tileConfig.url, {
      subdomains: tileConfig.subdomains,
      maxZoom: tileConfig.maxZoom,
      attribution: tileConfig.attribution,
    }).addTo(map);

    tileLayerRef.current = tileLayer;
    markersLayerGroupRef.current = L.layerGroup().addTo(map);
    trainingEventsLayerGroupRef.current = L.layerGroup().addTo(map);
    sensorsLayerGroupRef.current = L.layerGroup().addTo(map);
    earthquakesLayerGroupRef.current = L.layerGroup().addTo(map);
    historicalEarthquakesLayerGroupRef.current = L.layerGroup().addTo(map);
    rainfallLayerGroupRef.current = L.layerGroup().addTo(map);
    reportClusterLayerGroupRef.current = L.layerGroup().addTo(map);
    selectedHillMarkerLayerRef.current = L.layerGroup().addTo(map);
    shelterMarkerLayerRef.current = L.layerGroup().addTo(map);
    mapRef.current = map;
    setMapInstance(map);

    // Track zoom
    map.on('zoomend', () => {
      setCurrentZoom(map.getZoom());
    });

    return () => {
      map.remove();
      mapRef.current = null;
      setMapInstance(null);
    };
  }, []);

  // Switch Google Earth Tile Layer
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    if (basemap === '3d_earth') return;

    if (tileLayerRef.current) {
      map.removeLayer(tileLayerRef.current);
    }

    const config = tileConfigs[basemap];
    const newLayer = L.tileLayer(config.url, {
      subdomains: config.subdomains,
      maxZoom: config.maxZoom,
      attribution: config.attribution,
    }).addTo(map);

    tileLayerRef.current = newLayer;
  }, [basemap, tileConfigs]);

  // Fly to selected zone when selection changes
  useEffect(() => {
    const map = mapRef.current;
    if (!map || focusCoordinates) return;

    map.flyTo(activeZoneCoords, Math.max(map.getZoom(), 11), {
      duration: 1.2,
      easeLinearity: 0.25,
    });
  }, [activeZoneCoords, focusCoordinates]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !focusCoordinates) return;

    if (
      !Number.isFinite(focusCoordinates.latitude) ||
      !Number.isFinite(focusCoordinates.longitude)
    ) {
      return;
    }

    map.flyTo(
      [focusCoordinates.latitude, focusCoordinates.longitude],
      focusCoordinates.zoom ?? 10,
      {
        duration: 1.2,
        easeLinearity: 0.25,
      }
    );
  }, [
    focusCoordinates?.latitude,
    focusCoordinates?.longitude,
    focusCoordinates?.zoom,
  ]);

  useEffect(() => {
    const group = selectedHillMarkerLayerRef.current;
    if (!group) return;

    group.clearLayers();

    if (
      !selectedHillRegion ||
      !selectedHillRegion.coordinatesVerified ||
      selectedHillRegion.latitude === undefined ||
      selectedHillRegion.longitude === undefined ||
      !Number.isFinite(selectedHillRegion.latitude) ||
      !Number.isFinite(selectedHillRegion.longitude)
    ) {
      return;
    }

    const iconHtml = `
    <div class="relative flex flex-col items-center">
      <span class="absolute top-0 inline-flex h-10 w-10 rounded-full bg-cyan-400/30 animate-ping"></span>

      <div class="relative flex h-9 w-9 items-center justify-center rounded-full border-2 border-cyan-300 bg-slate-950 text-cyan-300 shadow-xl ring-2 ring-cyan-400/30">
        <span class="text-lg leading-none">🏔️</span>
      </div>

      <div class="mt-1 rounded border border-cyan-400 bg-slate-950/95 px-2 py-1 text-[10px] font-mono font-bold text-cyan-300 whitespace-nowrap shadow-lg">
        SELECTED HILL
      </div>
    </div>
  `;

    const icon = L.divIcon({
      className: 'selected-hill-marker',
      html: iconHtml,
      iconSize: [44, 58],
      iconAnchor: [22, 42],
    });

    const marker = L.marker(
      [selectedHillRegion.latitude, selectedHillRegion.longitude],
      {
        icon,
        zIndexOffset: 2000,
      }
    );

    marker.bindPopup(`
    <div class="p-2 font-sans text-xs bg-slate-950 text-slate-100 rounded-lg">
      <div class="font-bold text-cyan-300 text-sm">
        ${selectedHillRegion.name}
      </div>

      <div class="mt-1 text-slate-300">
        ${selectedHillRegion.state}
      </div>

      <div class="mt-2 font-mono text-[10px] text-slate-400">
        ${selectedHillRegion.latitude.toFixed(4)},
        ${selectedHillRegion.longitude.toFixed(4)}
      </div>

      <div class="mt-1 text-[10px] text-emerald-300">
        Verified representative coordinates
      </div>
    </div>
  `);

    marker.addTo(group);
  }, [
    selectedHillRegion?.id,
    selectedHillRegion?.name,
    selectedHillRegion?.state,
    selectedHillRegion?.latitude,
    selectedHillRegion?.longitude,
    selectedHillRegion?.coordinatesVerified,
  ]);

  useEffect(() => {
    const group = shelterMarkerLayerRef.current;
    if (!group) return;

    group.clearLayers();

    if (!focusCoordinates || !focusCoordinates.label) {
      return;
    }

    const isShelterFocus =
      focusCoordinates.coordinateType === 'exact' ||
      focusCoordinates.coordinateType === 'approximate';

    if (!isShelterFocus) {
      return;
    }

    const iconHtml = `
      <div class="relative flex flex-col items-center">
        <span class="absolute top-0 inline-flex h-10 w-10 rounded-full ${focusCoordinates.coordinateType === 'exact' ? 'bg-emerald-500/25' : 'bg-amber-500/25'} animate-ping"></span>
        <div class="relative flex h-9 w-9 items-center justify-center rounded-full border-2 ${focusCoordinates.coordinateType === 'exact' ? 'border-emerald-300 bg-slate-950 text-emerald-300 ring-2 ring-emerald-400/30' : 'border-amber-300 bg-slate-950 text-amber-300 ring-2 ring-amber-400/30'} shadow-xl">
          <span class="text-lg leading-none">🛡️</span>
        </div>
        <div class="mt-1 rounded border ${focusCoordinates.coordinateType === 'exact' ? 'border-emerald-400 bg-slate-950/95 text-emerald-300' : 'border-amber-400 bg-slate-950/95 text-amber-300'} px-2 py-1 text-[10px] font-mono font-bold whitespace-nowrap shadow-lg">
          ${focusCoordinates.coordinateType === 'exact' ? 'EXACT SHELTER' : 'APPROX SHELTER'}
        </div>
      </div>
    `;

    const icon = L.divIcon({
      className: 'shelter-focus-marker',
      html: iconHtml,
      iconSize: [46, 58],
      iconAnchor: [23, 42],
    });

    const marker = L.marker(
      [focusCoordinates.latitude, focusCoordinates.longitude],
      {
        icon,
        zIndexOffset: 2200,
      }
    );

    marker.bindPopup(`
      <div class="p-2 font-sans text-xs bg-slate-950 text-slate-100 rounded-lg max-w-xs">
        <div class="font-bold ${focusCoordinates.coordinateType === 'exact' ? 'text-emerald-300' : 'text-amber-300'} text-sm">
          ${focusCoordinates.label}
        </div>
        <div class="mt-1 text-slate-300">
          ${focusCoordinates.description || (focusCoordinates.coordinateType === 'exact' ? 'Designated Relief Shelter' : 'Relief Shelter (Approximate Location)')}
        </div>
        <div class="mt-2 font-mono text-[10px] text-slate-400">
          ${focusCoordinates.latitude.toFixed(5)}, ${focusCoordinates.longitude.toFixed(5)}
        </div>
      </div>
    `);

    marker.addTo(group);
  }, [focusCoordinates?.latitude, focusCoordinates?.longitude, focusCoordinates?.shelterId, focusCoordinates?.label, focusCoordinates?.description, focusCoordinates?.coordinateType]);

  // Render Hazard Zone Pins
  useEffect(() => {
    const map = mapRef.current;
    const group = markersLayerGroupRef.current;
    if (!map || !group) return;

    group.clearLayers();

    zones.forEach((zone) => {
      const coords = parseZoneCoordinates(zone.coords);
      const isSelected = zone.id === selectedZone.id;
      const rfProb = isSelected && zoneMlRisk ? `${zoneMlRisk.probability_percentage.toFixed(0)}%` : '88%';

      // Custom DivIcon with radar pulse and RF badge
      const iconHtml = `
        <div class="relative cursor-pointer group flex flex-col items-center">
          ${activeLayers.mlInference
          ? `<div class="absolute -top-6 px-1.5 py-0.5 rounded text-[9px] font-mono font-bold bg-emerald-950/95 text-emerald-300 border border-emerald-400 shadow whitespace-nowrap">
                  RF ${rfProb}
                </div>`
          : ''
        }
          <div class="relative flex items-center justify-center">
            <span class="animate-ping absolute inline-flex h-8 w-8 rounded-full ${zone.isCritical ? 'bg-red-400' : 'bg-amber-400'
        } opacity-70"></span>
            <div class="relative w-8 h-8 rounded-full flex items-center justify-center border-2 shadow-xl transition-transform transform group-hover:scale-125 ${isSelected
          ? 'bg-white text-slate-950 border-cyan-400 scale-110 ring-4 ring-cyan-400/40'
          : zone.isCritical
            ? 'bg-[#93000a] text-white border-red-300'
            : 'bg-[#7d4800] text-white border-amber-300'
        }">
              <svg xmlns="http://www.w3.org/2000/svg" class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                <path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/>
                <line x1="12" y1="9" x2="12" y2="13"/>
                <line x1="12" y1="17" x2="12.01" y2="17"/>
              </svg>
            </div>
          </div>
          <div class="mt-1 px-1.5 py-0.5 rounded text-[10px] font-mono font-bold tracking-tight shadow-md border ${isSelected
          ? 'bg-[#122131] text-cyan-300 border-cyan-400'
          : 'bg-[#051424]/90 text-white border-slate-700'
        } whitespace-nowrap">
            ${zone.name.split('(')[0].trim()}
          </div>
        </div>
      `;

      const customIcon = L.divIcon({
        className: 'custom-gis-zone-pin',
        html: iconHtml,
        iconSize: [36, 48],
        iconAnchor: [18, 32],
      });

      const marker = L.marker(coords, { icon: customIcon });
      marker.on('click', () => {
        onSelectZone(zone);
        onShowToast(`Target locked: ${zone.name}`);
      });

      marker.bindPopup(`
        <div class="p-2 font-sans text-xs bg-slate-900 text-slate-100 rounded-lg max-w-xs">
          <div class="font-bold text-cyan-300 text-sm border-b border-slate-700 pb-1">${zone.name}</div>
          <div class="mt-1 text-slate-300 font-mono text-[11px]">${zone.corridor}</div>
          <div class="mt-2 grid grid-cols-2 gap-1 text-[10px] font-mono">
            <div><span class="text-slate-400">Slope:</span> <b class="text-white">${zone.slopeGradient}</b></div>
            <div><span class="text-slate-400">Saturation:</span> <b class="text-amber-300">${zone.soilPoreSaturation}</b></div>
            <div><span class="text-slate-400">Displacement:</span> <b class="text-red-300">${zone.displacementRate}</b></div>
            <div><span class="text-slate-400">RF Conf:</span> <b class="text-emerald-300">${zone.rfConfidence}</b></div>
          </div>
        </div>
      `, { className: 'custom-gis-popup' });

      marker.addTo(group);
    });
  }, [zones, selectedZone.id, zoneMlRisk, activeLayers.mlInference]);

  // Render Historical Ground Truth Events
  useEffect(() => {
    const map = mapRef.current;
    const group = trainingEventsLayerGroupRef.current;
    if (!map || !group) return;

    group.clearLayers();

    if (!activeLayers.trainingEvents) return;

    trainingEvents.forEach((evt) => {
      const isSelected = selectedEvent?.id === evt.id;
      const dotHtml = `
        <div class="group relative cursor-pointer flex items-center justify-center">
          <div class="w-3 h-3 rounded-full ${isSelected ? 'bg-cyan-300 ring-4 ring-cyan-400' : 'bg-amber-400 border border-black shadow'
        } flex items-center justify-center transition-transform group-hover:scale-150">
            <div class="w-1.5 h-1.5 rounded-full ${isSelected ? 'bg-cyan-900' : 'bg-red-600'}"></div>
          </div>
        </div>
      `;

      const dotIcon = L.divIcon({
        className: 'historical-event-pin',
        html: dotHtml,
        iconSize: [14, 14],
        iconAnchor: [7, 7],
      });

      const marker = L.marker([evt.latitude, evt.longitude], { icon: dotIcon });
      marker.on('click', () => {
        onSelectEvent(evt);
        onShowToast(`Historical Landslide ${evt.record_id} (${evt.event_date}) - 3D Rain: ${evt.rainfall_3d}mm`);
      });

      marker.bindTooltip(`
        <div class="p-1 font-mono text-[10px] bg-slate-950 text-slate-200 border border-amber-500/80 rounded">
          <b class="text-amber-300 block">Training Ground Truth</b>
          <div>${evt.event_date}</div>
          <div class="text-cyan-300">Rain 3D: ${evt.rainfall_3d}mm | Slope: ${evt.slope}°</div>
        </div>
      `, { direction: 'top', offset: [0, -6] });

      marker.addTo(group);
    });
  }, [trainingEvents, selectedEvent, activeLayers.trainingEvents]);

  // Render Subsurface Sensor Nodes
  useEffect(() => {
    const map = mapRef.current;
    const group = sensorsLayerGroupRef.current;
    if (!map || !group) return;

    group.clearLayers();

    if (!activeLayers.sensorNodes) return;

    sensors.forEach((sensor) => {
      const coords = parseZoneCoordinates(sensor.coordinates);
      const isCrit = sensor.status === 'critical';

      const sensorHtml = `
        <div class="cursor-pointer group flex flex-col items-center">
          <div class="w-4 h-4 rounded-full ${isCrit ? 'bg-red-500 animate-bounce' : 'bg-cyan-500'
        } border-2 border-white shadow-lg flex items-center justify-center">
            <div class="w-1.5 h-1.5 rounded-full bg-white"></div>
          </div>
          <span class="text-[8px] font-mono font-bold px-1 bg-black/80 text-cyan-300 rounded mt-0.5">
            ${sensor.id}
          </span>
        </div>
      `;

      const sensorIcon = L.divIcon({
        className: 'sensor-node-pin',
        html: sensorHtml,
        iconSize: [24, 28],
        iconAnchor: [12, 14],
      });

      const marker = L.marker(coords, { icon: sensorIcon });
      marker.bindTooltip(`
        <div class="p-1 font-mono text-[10px] bg-slate-950 text-cyan-200">
          <b>${sensor.name}</b>: ${sensor.currentValue} (${sensor.statusLabel})
        </div>
      `);
      marker.addTo(group);
    });
  }, [sensors, activeLayers.sensorNodes]);

  useEffect(() => {
    let active = true;
    if (!activeLayers.rainfall) {
      setRainfallFeed(null);
      return;
    }

    const coords = parseZoneCoordinates(selectedZone.coords);
    const state = selectedZone.state || 'sikkim';
    const fetchRainfall = async () => {
      try {
        const params = new URLSearchParams({ state: String(state).toLowerCase() });
        if (Number.isFinite(coords[0]) && Number.isFinite(coords[1])) {
          params.set('latitude', String(coords[0]));
          params.set('longitude', String(coords[1]));
        }
        const resp = await fetch(`${(import.meta.env.VITE_API_BASE_URL || '').trim().replace(/\/+$/, '')}/api/weather/live?${params.toString()}`);
        if (!resp.ok) return;
        const data = await resp.json();
        if (!active) return;
        setRainfallFeed({
          latitude: Number(data.latitude ?? coords[0]),
          longitude: Number(data.longitude ?? coords[1]),
          station_name: data.station_name || 'IMD AWS Hub',
          district: data.district || 'Rainfall station',
          state: String(data.state || state).toLowerCase(),
          current_rainfall_mm_hr: Number(data.current_rainfall_mm_hr ?? 0),
          antecedent_72h_rainfall_mm: Number(data.antecedent_72h_rainfall_mm ?? 0),
          last_updated: data.last_updated || 'live',
        });
      } catch (error) {
        console.warn('Rainfall layer unavailable:', error);
      }
    };

    fetchRainfall();
    return () => { active = false; };
  }, [selectedZone.coords, selectedZone.state, activeLayers.rainfall]);

  useEffect(() => {
    let active = true;
    if (!activeLayers.citizenReports) {
      setReportClusters([]);
      setReportStatus((prev) => ({ ...prev, loading: false, error: null }));
      return;
    }

    const loadReports = async () => {
      setReportStatus((prev) => ({ ...prev, loading: true, error: null }));

      try {
        const state = selectedZone.state === 'all' ? undefined : selectedZone.state;
        const resp = await fetch(`${(import.meta.env.VITE_API_BASE_URL || '').trim().replace(/\/+$/, '')}/api/map/reports${state ? `?state=${encodeURIComponent(state)}` : ''}`);
        if (!resp.ok) {
          throw new Error(`Citizen reports status ${resp.status}`);
        }
        const payload = await resp.json();
        if (!active) return;
        const grouped = new Map<string, { id: string; latitude: number; longitude: number; count: number; severity: string; location: string; classification: string }>();

        (payload.features || []).forEach((feature: any) => {
          const props = feature.properties || {};
          const lon = Number(feature.geometry?.coordinates?.[0]);
          const lat = Number(feature.geometry?.coordinates?.[1]);
          if (!Number.isFinite(lat) || !Number.isFinite(lon)) return;
          const key = `${lat.toFixed(3)}:${lon.toFixed(3)}`;
          const existing = grouped.get(key);
          const urgency = String(props.severity || 'ROUTINE').toUpperCase();
          const classification = String(props.classification || 'pending');
          if (existing) {
            existing.count += 1;
            if (['CRITICAL', 'URGENT'].includes(urgency) || ['CRITICAL', 'URGENT'].includes(existing.severity)) {
              existing.severity = urgency === 'CRITICAL' || existing.severity === 'CRITICAL' ? 'CRITICAL' : 'URGENT';
            }
            if (classification && classification !== existing.classification) {
              existing.classification = classification;
            }
          } else {
            grouped.set(key, {
              id: key,
              latitude: lat,
              longitude: lon,
              count: 1,
              severity: urgency,
              location: props.location || 'Citizen report',
              classification,
            });
          }
        });

        const nextClusters = Array.from(grouped.values());
        setReportClusters(nextClusters);
        setReportStatus({
          loading: false,
          error: null,
          lastUpdated: new Date().toISOString(),
        });
      } catch (error) {
        if (!active) return;
        console.warn('Citizen report clusters unavailable:', error);
        setReportClusters([]);
        setReportStatus({
          loading: false,
          error: 'Citizen report feed unavailable',
          lastUpdated: null,
        });
      }
    };

    loadReports();
    const intervalId = window.setInterval(loadReports, 45000);
    return () => {
      active = false;
      window.clearInterval(intervalId);
    };
  }, [selectedZone.state, activeLayers.citizenReports]);

  useEffect(() => {
    const map = mapRef.current;
    const group = rainfallLayerGroupRef.current;
    if (!map || !group) return;

    group.clearLayers();
    if (!activeLayers.rainfall || !rainfallFeed) return;

    const radius = Math.min(32, Math.max(16, rainfallFeed.current_rainfall_mm_hr * 0.9 + 12));
    const marker = L.circleMarker([rainfallFeed.latitude, rainfallFeed.longitude], {
      radius,
      color: '#38bdf8',
      weight: 2,
      fillColor: '#0ea5e9',
      fillOpacity: 0.55,
    });
    marker.bindTooltip(`
      <div class="p-1.5 font-mono text-[10px] bg-slate-950 text-cyan-100 rounded border border-cyan-500/80">
        <b class="text-cyan-300 block">${rainfallFeed.station_name}</b>
        <div>${rainfallFeed.district}</div>
        <div>Rain: ${rainfallFeed.current_rainfall_mm_hr.toFixed(1)} mm/hr</div>
        <div>72h: ${rainfallFeed.antecedent_72h_rainfall_mm.toFixed(1)} mm</div>
        <div class="text-slate-400">${rainfallFeed.last_updated}</div>
      </div>
    `, { direction: 'top', sticky: true });
    marker.addTo(group);
  }, [rainfallFeed, activeLayers.rainfall]);

  useEffect(() => {
    const map = mapRef.current;
    const group = reportClusterLayerGroupRef.current;
    if (!map || !group) return;

    group.clearLayers();
    if (!activeLayers.citizenReports || reportClusters.length === 0) return;

    reportClusters.forEach((cluster) => {
      const severityColor = cluster.severity === 'CRITICAL' ? '#ef4444' : cluster.severity === 'URGENT' ? '#f59e0b' : '#22c55e';
      const radius = Math.min(32, 10 + cluster.count * 4);
      const marker = L.circleMarker([cluster.latitude, cluster.longitude], {
        radius,
        color: severityColor,
        weight: 2,
        fillColor: severityColor,
        fillOpacity: 0.7,
      });
      marker.bindTooltip(`
        <div class="p-1.5 font-mono text-[10px] bg-slate-950 text-slate-100 rounded border border-slate-600">
          <b class="text-cyan-300 block">${cluster.location}</b>
          <div>${cluster.count} report${cluster.count > 1 ? 's' : ''} clustered</div>
          <div>Severity: ${cluster.severity}</div>
          <div>AI visual classification: ${cluster.classification || 'landslide'}</div>
        </div>
      `, { direction: 'top', sticky: true });
      marker.addTo(group);
    });
  }, [reportClusters, activeLayers.citizenReports]);

  // Render validated official NCS earthquake events.
  useEffect(() => {
    const map = mapRef.current;
    const group = earthquakesLayerGroupRef.current;
    if (!map || !group) return;

    group.clearLayers();
    if (!activeLayers.earthquakeEvents) return;

    earthquakes.forEach((event) => {
      const size = Math.max(12, Math.min(28, 8 + event.magnitude * 3));
      const icon = L.divIcon({
        className: 'earthquake-event-pin',
        html: `<div style="width:${size}px;height:${size}px" class="rounded-full border-2 border-orange-200 bg-orange-500/80 shadow-[0_0_14px_rgba(249,115,22,0.8)] flex items-center justify-center text-[8px] font-black text-white">${event.magnitude.toFixed(1)}</div>`,
        iconSize: [size, size],
        iconAnchor: [size / 2, size / 2],
      });
      const marker = L.marker([event.latitude, event.longitude], { icon });
      marker.bindTooltip(`
        <div class="p-1.5 font-mono text-[10px] bg-slate-950 text-slate-100 border border-orange-400/80 rounded">
          <b class="text-orange-300 block">NCS Earthquake M${event.magnitude.toFixed(1)}</b>
          <div>${event.location}</div>
          <div>${event.depth_km.toFixed(0)} km deep • ${event.status}</div>
          <div>${new Date(event.event_time).toLocaleString()}</div>
          <div class="text-slate-400">${liveEarthquakeStatus}</div>
        </div>
      `, { direction: 'top', offset: [0, -size / 2] });
      marker.addTo(group);
    });
  }, [earthquakes, liveEarthquakeStatus, activeLayers.earthquakeEvents]);

  useEffect(() => {
    let active = true;
    if (!activeLayers.earthquakeEvents) {
      setEarthquakeLayerStatus((prev) => ({ ...prev, loading: false, error: null }));
      return;
    }

    const fetchEarthquakes = async () => {
      setEarthquakeLayerStatus((prev) => ({ ...prev, loading: true, error: null }));

      try {
        const match = selectedZone.coords.match(/(-?\d+(?:\.\d+)?)[^,]*,\s*(-?\d+(?:\.\d+)?)/);
        const latitude = match ? Number(match[1]) : undefined;
        const longitude = match ? Number(match[2]) : undefined;
        const response = await fetch(`${(import.meta.env.VITE_API_BASE_URL || '').trim().replace(/\/+$/, '')}/api/earthquakes?latitude=${latitude ?? ''}&longitude=${longitude ?? ''}&radius_km=500&limit=25`);
        if (!response.ok) {
          throw new Error(`Earthquake feed status ${response.status}`);
        }
        const payload = await response.json();
        if (!active) return;
        const events = Array.isArray(payload?.events) ? payload.events : [];
        setEarthquakeLayerStatus({
          loading: false,
          error: payload?.earthquake_data_available === false ? 'Earthquake feed unavailable' : null,
          lastUpdated: payload?.last_updated || new Date().toISOString(),
        });
        setLiveEarthquakeStatus(payload?.earthquake_data_available ? `${events.length} NCS events in range` : 'NCS feed temporarily unavailable');
      } catch (error) {
        if (!active) return;
        console.warn('Earthquake layer unavailable:', error);
        setLiveEarthquakeStatus('NCS feed temporarily unavailable');
        setEarthquakeLayerStatus({
          loading: false,
          error: 'Earthquake feed unavailable',
          lastUpdated: null,
        });
      }
    };

    fetchEarthquakes();
    const intervalId = window.setInterval(fetchEarthquakes, 60000);
    return () => {
      active = false;
      window.clearInterval(intervalId);
    };
  }, [activeLayers.earthquakeEvents, selectedZone.coords]);

  // Render validated historical earthquake events
  useEffect(() => {
    const map = mapRef.current;
    const group = historicalEarthquakesLayerGroupRef.current;
    if (!map || !group) return;

    group.clearLayers();
    if (!activeLayers.historicalEarthquakeEvents) return;

    historicalEarthquakes.forEach((event) => {
      const size = Math.max(10, Math.min(24, 6 + event.magnitude * 2.5));
      const icon = L.divIcon({
        className: 'historical-earthquake-event-pin',
        html: `<div style="width:${size}px;height:${size}px" class="rounded-full border border-purple-300 bg-purple-600/70 shadow-[0_0_10px_rgba(147,51,234,0.6)] flex items-center justify-center text-[7px] font-bold text-white">${event.magnitude.toFixed(1)}</div>`,
        iconSize: [size, size],
        iconAnchor: [size / 2, size / 2],
      });
      const marker = L.marker([event.latitude, event.longitude], { icon });
      marker.bindTooltip(`
        <div class="p-1.5 font-mono text-[10px] bg-slate-950 text-slate-100 border border-purple-400/80 rounded">
          <b class="text-purple-300 block">Historical Earthquake M${event.magnitude.toFixed(1)}</b>
          <div>${event.location}</div>
          <div>${event.depth_km.toFixed(0)} km deep</div>
          <div>${new Date(event.event_time).toLocaleString()}</div>
          <div class="text-slate-400">Source: ${event.source}</div>
        </div>
      `, { direction: 'top', offset: [0, -size / 2] });
      marker.addTo(group);
    });
  }, [historicalEarthquakes, activeLayers.historicalEarthquakeEvents]);

  // Custom HTML5 Canvas ML Heatmap Layer Renderer
  useEffect(() => {
    const map = mapRef.current;
    const canvas = canvasOverlayRef.current;
    if (!map || !canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    if (!activeLayers.mlHeatmap || heatmapPoints.length === 0) {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      return;
    }

    let renderTimeout: ReturnType<typeof setTimeout> | null = null;
    let renderFrame = 0;
    const offCanvas = document.createElement('canvas');
    const offCtx = offCanvas.getContext('2d');

    const renderHeatmap = () => {
      if (!offCtx) return;
      const size = map.getSize();
      if (canvas.width !== size.x || canvas.height !== size.y) {
        canvas.width = size.x;
        canvas.height = size.y;
      }

      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // Render the expensive density pass at half resolution, then upscale it.
      const renderScale = 0.5;
      const renderWidth = Math.max(1, Math.ceil(size.x * renderScale));
      const renderHeight = Math.max(1, Math.ceil(size.y * renderScale));
      if (offCanvas.width !== renderWidth || offCanvas.height !== renderHeight) {
        offCanvas.width = renderWidth;
        offCanvas.height = renderHeight;
      }

      // Draw radial gradients for each ML point
      heatmapPoints.forEach((pt) => {
        const screenPoint = map.latLngToContainerPoint([pt.latitude, pt.longitude]);
        if (
          screenPoint.x < -100 ||
          screenPoint.x > size.x + 100 ||
          screenPoint.y < -100 ||
          screenPoint.y > size.y + 100
        ) {
          return;
        }

        screenPoint.x *= renderScale;
        screenPoint.y *= renderScale;

        // Stress boost applied to weight
        const adjustedWeight = Math.min(1.0, pt.weight * (1 + (stressRainfall / 120) * 0.25));
        const radius = heatmapRadius * (0.8 + adjustedWeight * 0.6) * renderScale;

        const radial = offCtx.createRadialGradient(
          screenPoint.x,
          screenPoint.y,
          0,
          screenPoint.x,
          screenPoint.y,
          radius
        );

        radial.addColorStop(0, `rgba(0, 0, 0, ${adjustedWeight * heatmapOpacity})`);
        radial.addColorStop(0.5, `rgba(0, 0, 0, ${adjustedWeight * 0.5 * heatmapOpacity})`);
        radial.addColorStop(1, 'rgba(0, 0, 0, 0)');

        offCtx.fillStyle = radial;
        offCtx.beginPath();
        offCtx.arc(screenPoint.x, screenPoint.y, radius, 0, Math.PI * 2);
        offCtx.fill();
      });

      // Colorize the alpha accumulation using the Institutional ML Risk Palette
      const imgData = offCtx.getImageData(0, 0, renderWidth, renderHeight);
      const data = imgData.data;

      // Palette lookup
      for (let i = 0; i < data.length; i += 4) {
        const alpha = data[i + 3];
        if (alpha > 0) {
          const norm = alpha / 255;
          let r = 0, g = 0, b = 0;

          if (norm < 0.25) {
            // Low Susceptibility: Cyan (#00bcd4)
            const t = norm / 0.25;
            r = Math.floor(0 * (1 - t) + 16 * t);
            g = Math.floor(188 * (1 - t) + 185 * t);
            b = Math.floor(212 * (1 - t) + 129 * t);
          } else if (norm < 0.55) {
            // Moderate: Emerald to Amber (#10b981 to #f59e0b)
            const t = (norm - 0.25) / 0.3;
            r = Math.floor(16 * (1 - t) + 245 * t);
            g = Math.floor(185 * (1 - t) + 158 * t);
            b = Math.floor(129 * (1 - t) + 11 * t);
          } else if (norm < 0.8) {
            // High: Amber to Hazard Orange (#f59e0b to #f97316)
            const t = (norm - 0.55) / 0.25;
            r = Math.floor(245 * (1 - t) + 249 * t);
            g = Math.floor(158 * (1 - t) + 115 * t);
            b = Math.floor(11 * (1 - t) + 22 * t);
          } else {
            // Critical Failure: Hazard Orange to Deep Crimson (#f97316 to #dc2626)
            const t = (norm - 0.8) / 0.2;
            r = Math.floor(249 * (1 - t) + 220 * t);
            g = Math.floor(115 * (1 - t) + 38 * t);
            b = Math.floor(22 * (1 - t) + 38 * t);
          }

          data[i] = r;
          data[i + 1] = g;
          data[i + 2] = b;
          data[i + 3] = Math.floor(alpha * 0.9);
        }
      }

      offCtx.putImageData(imgData, 0, 0);
      ctx.drawImage(offCanvas, 0, 0, size.x, size.y);
    };

    const scheduleHeatmapRender = () => {
      if (renderTimeout !== null) return;

      renderTimeout = setTimeout(() => {
        renderTimeout = null;
        renderFrame = requestAnimationFrame(renderHeatmap);
      }, 60);
    };

    renderHeatmap();

    map.on('move', scheduleHeatmapRender);
    map.on('moveend', scheduleHeatmapRender);
    map.on('zoom', scheduleHeatmapRender);
    map.on('zoomend', scheduleHeatmapRender);
    map.on('resize', scheduleHeatmapRender);

    return () => {
      if (renderTimeout !== null) clearTimeout(renderTimeout);
      cancelAnimationFrame(renderFrame);
      map.off('move', scheduleHeatmapRender);
      map.off('moveend', scheduleHeatmapRender);
      map.off('zoom', scheduleHeatmapRender);
      map.off('zoomend', scheduleHeatmapRender);
      map.off('resize', scheduleHeatmapRender);
    };
  }, [heatmapPoints, activeLayers.mlHeatmap, heatmapRadius, heatmapOpacity, stressRainfall]);

  const selectedAreaInfo = useMemo(() => {
    const feature = riskPolygons?.features?.find((item: any) => {
      const props = item?.properties || {};
      return props.name === selectedZone.name || props.state === selectedZone.state;
    }) || riskPolygons?.features?.[0];
    const props = feature?.properties || {};
    const reportCount = reportClusters.reduce((sum, cluster) => sum + cluster.count, 0);
    const strongestEarthquake = earthquakes[0];

    return {
      state: String(selectedZone.state || props.state || 'unknown'),
      district: String(props.district || selectedZone.corridor || 'district context'),
      riskLevel: String(props.risk_level || selectedZone.riskStatus || 'LOW'),
      riskScore: Number(props.risk_score ?? 0),
      rainfall: rainfallFeed ? `${rainfallFeed.current_rainfall_mm_hr.toFixed(1)} mm/hr` : 'not available',
      reportCount,
      earthquakeContext: strongestEarthquake ? `${strongestEarthquake.magnitude.toFixed(1)}M ${strongestEarthquake.location}` : 'not available',
      lastUpdated: rainfallStatus.lastUpdated || reportStatus.lastUpdated || earthquakeLayerStatus.lastUpdated || 'not available',
    };
  }, [riskPolygons, selectedZone, reportClusters, earthquakes, rainfallFeed, rainfallStatus.lastUpdated, reportStatus.lastUpdated, earthquakeLayerStatus.lastUpdated]);

  return (
    <div
      className={`relative w-full rounded-xl overflow-hidden border border-[#1c2b3c] shadow-2xl transition-all ${isFullscreen ? 'fixed inset-0 z-50 rounded-none' : 'h-[440px] sm:h-[500px]'
        }`}
    >
      {/* Main Leaflet GIS Map Container */}
      <div ref={mapContainerRef} className="w-full h-full z-0" />

      <LiveRiskLayer map={mapInstance} visible={activeLayers.liveRiskZones ?? true} data={riskPolygons} />
      <AdministrativeBoundaryLayer map={mapInstance} visible={activeLayers.administrativeBoundaries ?? true} data={boundaries} />

      {/* Transparent Canvas Overlay for ML Pattern Heatmap */}
      <canvas
        ref={canvasOverlayRef}
        className="absolute inset-0 pointer-events-none z-10"
        style={{ width: '100%', height: '100%' }}
      />

      {is3DMode && (
        <ThreeDMapView
          selectedZone={selectedZone}
          zones={zones}
          sensors={sensors}
          selectedHillRegion={selectedHillRegion}
          onClose={onToggle3D}
        />
      )}

      {/* Top Left: Basemap Switcher Selector (Google Earth Satellite, Hybrid, Terrain, 3D) */}
      <div className="absolute top-3 left-3 z-20 flex flex-wrap items-center gap-1 bg-[#051424]/90 backdrop-blur-md p-1.5 rounded-lg border border-[#1c2b3c] shadow-xl">
        <button
          onClick={() => setBasemap('satellite')}
          className={`flex items-center gap-1 px-2.5 py-1 rounded text-xs font-mono font-medium transition-all cursor-pointer ${basemap === 'satellite'
              ? 'bg-cyan-500 text-[#00363e] font-bold shadow'
              : 'text-slate-300 hover:bg-[#122131] hover:text-white'
            }`}
          title="Google Earth Satellite High-Resolution Imagery"
        >
          <Satellite className="w-3.5 h-3.5" />
          <span>Satellite</span>
        </button>

        <button
          onClick={() => setBasemap('hybrid')}
          className={`flex items-center gap-1 px-2.5 py-1 rounded text-xs font-mono font-medium transition-all cursor-pointer ${basemap === 'hybrid'
              ? 'bg-cyan-500 text-[#00363e] font-bold shadow'
              : 'text-slate-300 hover:bg-[#122131] hover:text-white'
            }`}
          title="Google Earth Hybrid (Satellite + Road Vectors & Labels)"
        >
          <Globe className="w-3.5 h-3.5" />
          <span>Hybrid</span>
        </button>

        <button
          onClick={() => setBasemap('terrain')}
          className={`flex items-center gap-1 px-2.5 py-1 rounded text-xs font-mono font-medium transition-all cursor-pointer ${basemap === 'terrain'
              ? 'bg-cyan-500 text-[#00363e] font-bold shadow'
              : 'text-slate-300 hover:bg-[#122131] hover:text-white'
            }`}
          title="Google Earth Topography & Elevation Contours"
        >
          <Mountain className="w-3.5 h-3.5" />
          <span>Terrain</span>
        </button>

        <button
          onClick={onToggle3D}
          className={`flex items-center gap-1 px-2.5 py-1 rounded text-xs font-mono font-bold transition-all cursor-pointer ${basemap === '3d_earth'
              ? 'bg-amber-400 text-slate-950 shadow ring-2 ring-amber-300'
              : 'text-amber-300 hover:bg-amber-950/40'
            }`}
          title="Google Earth Photorealistic 3D Web View"
        >
          <Sparkles className="w-3.5 h-3.5 text-amber-300" />
          <span>Google Earth 3D</span>
        </button>
      </div>

      {/* Top Right: Layer Toggles & Heatmap Settings */}
      <div className="absolute top-3 right-3 z-20 flex items-center gap-1.5">
        {/* ML Heatmap Quick Toggle */}
        <button
          onClick={() => onToggleLayer('mlHeatmap')}
          className={`px-2.5 py-1.5 rounded-lg text-xs font-mono font-bold flex items-center gap-1.5 shadow-xl border transition-all cursor-pointer ${activeLayers.mlHeatmap
              ? 'bg-gradient-to-r from-amber-500 to-red-600 text-white border-amber-300 shadow-red-950'
              : 'bg-[#051424]/90 text-slate-400 border-[#1c2b3c] hover:text-white'
            }`}
          title="Toggle Machine Learning Susceptibility Heatmap"
        >
          <Flame className={`w-4 h-4 ${activeLayers.mlHeatmap ? 'animate-pulse text-amber-200' : ''}`} />
          <span>ML HEATMAP</span>
          <span className="text-[10px] opacity-80 font-normal">
            ({heatmapPoints.length} PTS)
          </span>
        </button>

        {/* Heatmap Settings Slider Toggle */}
        <button
          onClick={() => setShowSettingsPanel(!showSettingsPanel)}
          className={`p-1.5 rounded-lg border text-xs shadow-xl transition-all cursor-pointer ${showSettingsPanel
              ? 'bg-cyan-500 text-slate-950 border-cyan-400'
              : 'bg-[#051424]/90 text-slate-300 border-[#1c2b3c] hover:text-white'
            }`}
          title="Heatmap Settings (Radius & Opacity)"
        >
          <Sliders className="w-4 h-4" />
        </button>

        {/* Zoom In/Out & Reset */}
        <div className="flex items-center bg-[#051424]/90 border border-[#1c2b3c] rounded-lg overflow-hidden shadow-xl">
          <button
            onClick={() => mapRef.current?.zoomIn()}
            className="px-2 py-1 text-slate-300 hover:text-white hover:bg-[#122131] font-mono text-sm font-bold cursor-pointer"
            title="Zoom In"
          >
            +
          </button>
          <span className="px-1 text-[10px] font-mono text-slate-400 border-x border-[#1c2b3c]">
            {currentZoom}x
          </span>
          <button
            onClick={() => mapRef.current?.zoomOut()}
            className="px-2 py-1 text-slate-300 hover:text-white hover:bg-[#122131] font-mono text-sm font-bold cursor-pointer"
            title="Zoom Out"
          >
            −
          </button>
        </div>

        {/* Fullscreen Toggle */}
        <button
          onClick={() => setIsFullscreen(!isFullscreen)}
          className="p-1.5 bg-[#051424]/90 border border-[#1c2b3c] text-slate-300 hover:text-white rounded-lg shadow-xl cursor-pointer"
          title={isFullscreen ? 'Exit Fullscreen' : 'Fullscreen Map'}
        >
          {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
        </button>
      </div>

      {/* Heatmap Settings Popover Panel */}
      {showSettingsPanel && (
        <div className="absolute top-14 right-3 z-30 bg-[#051424]/95 backdrop-blur-md border border-cyan-500/40 rounded-lg p-3 text-xs text-white shadow-2xl w-64">
          <div className="flex items-center justify-between pb-2 border-b border-[#1c2b3c]">
            <span className="font-mono font-bold text-cyan-300 flex items-center gap-1.5">
              <Flame className="w-3.5 h-3.5 text-amber-400" />
              Heatmap Configuration
            </span>
            <button
              onClick={() => setShowSettingsPanel(false)}
              className="text-slate-400 hover:text-white font-mono text-xs cursor-pointer"
            >
              ✕
            </button>
          </div>

          <div className="mt-3 space-y-3 font-mono text-[11px]">
            <div>
              <div className="flex justify-between text-slate-300">
                <span>Radius:</span>
                <span className="text-cyan-300 font-bold">{heatmapRadius}px</span>
              </div>
              <input
                type="range"
                min="16"
                max="56"
                step="2"
                value={heatmapRadius}
                onChange={(e) => setHeatmapRadius(Number(e.target.value))}
                className="w-full mt-1 accent-cyan-400 h-1.5 bg-slate-800 rounded cursor-pointer"
              />
            </div>

            <div>
              <div className="flex justify-between text-slate-300">
                <span>Opacity:</span>
                <span className="text-amber-300 font-bold">{Math.round(heatmapOpacity * 100)}%</span>
              </div>
              <input
                type="range"
                min="0.2"
                max="1.0"
                step="0.05"
                value={heatmapOpacity}
                onChange={(e) => setHeatmapOpacity(Number(e.target.value))}
                className="w-full mt-1 accent-amber-400 h-1.5 bg-slate-800 rounded cursor-pointer"
              />
            </div>

            {/* Precipitation Stress Indicator */}
            <div className="pt-2 border-t border-[#1c2b3c] text-[10px]">
              <span className="text-slate-400 block">Rainfall Stress Coupling:</span>
              <span className="text-amber-300 font-bold">+{stressRainfall}mm active</span>
            </div>
          </div>
        </div>
      )}

      <div className="absolute bottom-3 left-1/2 transform -translate-x-1/2 z-20 bg-[#051424]/90 backdrop-blur-md border border-[#1c2b3c] rounded-lg px-3 py-2 text-[10px] font-mono shadow-xl flex flex-col gap-2">
        <div className="flex items-center gap-2 text-slate-300">
          <span className="font-bold uppercase text-slate-400">Legend</span>
          <span className="inline-flex items-center gap-1"><span className="h-2.5 w-2.5 rounded-full bg-red-500" /> risk</span>
          <span className="inline-flex items-center gap-1"><span className="h-2.5 w-2.5 rounded-full bg-cyan-400" /> admin</span>
          <span className="inline-flex items-center gap-1"><span className="h-2.5 w-2.5 rounded-full bg-sky-400" /> rain</span>
          <span className="inline-flex items-center gap-1"><span className="h-2.5 w-2.5 rounded-full bg-orange-400" /> quake</span>
          <span className="inline-flex items-center gap-1"><span className="h-2.5 w-2.5 rounded-full bg-emerald-400" /> reports</span>
        </div>
        {(activeLayers.mlHeatmap || activeLayers.liveRiskZones !== false) && (
          <div className="flex items-center gap-2 text-[9px] text-slate-300">
            <span className="text-slate-400 font-bold uppercase">ML Risk Gradient:</span>
            <span className="text-cyan-300 font-bold">Low</span>
            <div className="w-20 h-2 rounded bg-gradient-to-r from-cyan-400 via-emerald-400 via-amber-400 to-red-600 shadow-inner" />
            <span className="text-red-400 font-bold">Critical</span>
          </div>
        )}
        <div className="flex flex-wrap items-center gap-2 text-[9px] text-slate-300">
          {activeLayers.rainfall && (
            <span className={rainfallStatus.error ? 'text-red-300' : rainfallStatus.loading ? 'text-amber-300' : 'text-cyan-300'}>
              Rain: {rainfallStatus.loading ? 'refreshing...' : rainfallStatus.error ? 'error' : formatLastUpdated(rainfallStatus.lastUpdated)}
            </span>
          )}
          {activeLayers.earthquakeEvents && (
            <span className={earthquakeLayerStatus.error ? 'text-red-300' : earthquakeLayerStatus.loading ? 'text-amber-300' : 'text-orange-300'}>
              Quake: {earthquakeLayerStatus.loading ? 'refreshing...' : earthquakeLayerStatus.error ? 'error' : formatLastUpdated(earthquakeLayerStatus.lastUpdated)}
            </span>
          )}
          {activeLayers.citizenReports && (
            <span className={reportStatus.error ? 'text-red-300' : reportStatus.loading ? 'text-amber-300' : 'text-emerald-300'}>
              Reports: {reportStatus.loading ? 'refreshing...' : reportStatus.error ? 'error' : formatLastUpdated(reportStatus.lastUpdated)}
            </span>
          )}
        </div>
      </div>

      {/* Bottom Left: GIS Selected Area HUD */}
      <div className="absolute bottom-3 left-3 z-20 bg-[#051424]/90 backdrop-blur-md border border-[#1c2b3c] rounded px-2.5 py-2 text-[10px] font-mono text-slate-300 shadow-lg max-w-[260px] pointer-events-none">
        <div className="flex items-center gap-1 text-cyan-300 uppercase tracking-wide font-bold">
          <Crosshair className="w-3 h-3" />
          <span>Selected Area</span>
        </div>
        <div className="mt-1 text-slate-100 font-semibold">{selectedAreaInfo.state} • {selectedAreaInfo.district}</div>
        <div className="mt-1 flex flex-wrap gap-x-2 gap-y-1">
          <span>Risk: <span className="text-amber-300">{selectedAreaInfo.riskLevel}</span></span>
          <span>Score: <span className="text-amber-300">{Number.isFinite(selectedAreaInfo.riskScore) ? selectedAreaInfo.riskScore.toFixed(1) : '0.0'}</span></span>
          <span>Rain: <span className="text-sky-300">{selectedAreaInfo.rainfall}</span></span>
          <span>Reports: <span className="text-emerald-300">{selectedAreaInfo.reportCount}</span></span>
          <span>Earthquakes: <span className="text-orange-300">{selectedAreaInfo.earthquakeContext}</span></span>
          <span>Updated: <span className="text-cyan-300">{selectedAreaInfo.lastUpdated}</span></span>
        </div>
      </div>

      {/* Bottom Left: GPS Target Lock HUD Overlay */}
      <div className="absolute bottom-3 left-[290px] z-20 bg-[#051424]/90 backdrop-blur-md border border-[#1c2b3c] rounded px-2.5 py-1 text-[10px] font-mono text-slate-300 flex items-center gap-3 pointer-events-none shadow-lg">
        <span className="flex items-center gap-1">
          <Crosshair className="w-3 h-3 text-cyan-400" />
          <span>TARGET: {selectedZone.coords}</span>
        </span>
        <span className="text-slate-600">|</span>
        <span>ELEV: {selectedZone.elevation}</span>
        <span className="text-slate-600">|</span>
        <span className="text-amber-300">SLOPE: {selectedZone.slopeGradient}</span>
      </div>

      {/* Bottom Right: Reset View & Recenter Button */}
      <button
        onClick={() => {
          mapRef.current?.flyTo(activeZoneCoords, 11);
          onShowToast(`Centered on ${selectedZone.name}`);
        }}
        className="absolute bottom-3 right-3 z-20 bg-[#051424]/90 hover:bg-[#122131] border border-[#1c2b3c] text-cyan-300 rounded px-2 py-1 text-[10px] font-mono flex items-center gap-1 shadow-lg transition-all cursor-pointer"
        title="Recenter on Active Zone"
      >
        <RotateCw className="w-3 h-3" />
        <span>RECENTER</span>
      </button>
    </div>
  );
};
