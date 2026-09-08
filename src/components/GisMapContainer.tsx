import React, { useEffect, useRef, useState, useMemo } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import {
  HazardZone,
  SensorNode,
  HistoricalLandslideEvent,
  MlHeatmapPoint,
  ZoneMlRiskEvaluation,
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
  ExternalLink,
  RotateCw,
  Sparkles,
} from 'lucide-react';

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
  };
  onToggleLayer: (layerKey: string) => void;
  onShowToast: (msg: string) => void;
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
  } catch {}
  return [27.5312, 88.5134];
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
  stressRainfall,
  activeLayers,
  onToggleLayer,
  onShowToast,
}) => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const canvasOverlayRef = useRef<HTMLCanvasElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const tileLayerRef = useRef<L.TileLayer | null>(null);
  const markersLayerGroupRef = useRef<L.LayerGroup | null>(null);
  const trainingEventsLayerGroupRef = useRef<L.LayerGroup | null>(null);
  const sensorsLayerGroupRef = useRef<L.LayerGroup | null>(null);

  const [basemap, setBasemap] = useState<GoogleEarthBasemap>('hybrid');
  const [heatmapRadius, setHeatmapRadius] = useState<number>(32);
  const [heatmapOpacity, setHeatmapOpacity] = useState<number>(0.75);
  const [showSettingsPanel, setShowSettingsPanel] = useState<boolean>(false);
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);
  const [currentZoom, setCurrentZoom] = useState<number>(9);

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

    const initialCoords = activeZoneCoords;
    const map = L.map(mapContainerRef.current, {
      center: initialCoords,
      zoom: 9,
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
    mapRef.current = map;

    // Track zoom
    map.on('zoomend', () => {
      setCurrentZoom(map.getZoom());
    });

    return () => {
      map.remove();
      mapRef.current = null;
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
    if (!map) return;
    map.flyTo(activeZoneCoords, Math.max(map.getZoom(), 11), {
      duration: 1.2,
      easeLinearity: 0.25,
    });
  }, [activeZoneCoords]);

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
          ${
            activeLayers.mlInference
              ? `<div class="absolute -top-6 px-1.5 py-0.5 rounded text-[9px] font-mono font-bold bg-emerald-950/95 text-emerald-300 border border-emerald-400 shadow whitespace-nowrap">
                  RF ${rfProb}
                </div>`
              : ''
          }
          <div class="relative flex items-center justify-center">
            <span class="animate-ping absolute inline-flex h-8 w-8 rounded-full ${
              zone.isCritical ? 'bg-red-400' : 'bg-amber-400'
            } opacity-70"></span>
            <div class="relative w-8 h-8 rounded-full flex items-center justify-center border-2 shadow-xl transition-transform transform group-hover:scale-125 ${
              isSelected
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
          <div class="mt-1 px-1.5 py-0.5 rounded text-[10px] font-mono font-bold tracking-tight shadow-md border ${
            isSelected
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
  }, [zones, selectedZone, zoneMlRisk, activeLayers.mlInference]);

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
          <div class="w-3 h-3 rounded-full ${
            isSelected ? 'bg-cyan-300 ring-4 ring-cyan-400' : 'bg-amber-400 border border-black shadow'
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
          <div class="w-4 h-4 rounded-full ${
            isCrit ? 'bg-red-500 animate-bounce' : 'bg-cyan-500'
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

    const renderHeatmap = () => {
      const size = map.getSize();
      if (canvas.width !== size.x || canvas.height !== size.y) {
        canvas.width = size.x;
        canvas.height = size.y;
      }

      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // Create an offscreen alpha canvas to accumulate radial density
      const offCanvas = document.createElement('canvas');
      offCanvas.width = size.x;
      offCanvas.height = size.y;
      const offCtx = offCanvas.getContext('2d');
      if (!offCtx) return;

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

        // Stress boost applied to weight
        const adjustedWeight = Math.min(1.0, pt.weight * (1 + (stressRainfall / 120) * 0.25));
        const radius = heatmapRadius * (0.8 + adjustedWeight * 0.6);

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
      const imgData = offCtx.getImageData(0, 0, size.x, size.y);
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

      ctx.putImageData(imgData, 0, 0);
    };

    renderHeatmap();

    map.on('move', renderHeatmap);
    map.on('moveend', renderHeatmap);
    map.on('zoom', renderHeatmap);
    map.on('zoomend', renderHeatmap);
    map.on('resize', renderHeatmap);

    return () => {
      map.off('move', renderHeatmap);
      map.off('moveend', renderHeatmap);
      map.off('zoom', renderHeatmap);
      map.off('zoomend', renderHeatmap);
      map.off('resize', renderHeatmap);
    };
  }, [heatmapPoints, activeLayers.mlHeatmap, heatmapRadius, heatmapOpacity, stressRainfall]);

  // Google Earth 3D URL for the selected zone
  const googleEarth3dUrl = useMemo(() => {
    const lat = activeZoneCoords[0];
    const lon = activeZoneCoords[1];
    const alt = parseInt(selectedZone.elevation.replace(/\D/g, '') || '1480');
    // Centered at altitude, looking at 65° tilt with 3000m range
    return `https://earth.google.com/web/@${lat},${lon},${alt}a,3200d,35y,35h,65t,0r`;
  }, [activeZoneCoords, selectedZone.elevation]);

  return (
    <div
      className={`relative w-full rounded-xl overflow-hidden border border-[#1c2b3c] shadow-2xl transition-all ${
        isFullscreen ? 'fixed inset-0 z-50 rounded-none' : 'h-[440px] sm:h-[500px]'
      }`}
    >
      {/* 2D Leaflet Map or Google Earth 3D View */}
      {basemap === '3d_earth' ? (
        <div className="relative w-full h-full bg-[#051424] flex flex-col items-center justify-center">
          <iframe
            src={googleEarth3dUrl}
            title="Google Earth 3D Photorealistic View"
            className="w-full h-full border-none"
            allow="fullscreen; geolocation"
          />

          {/* 3D Mode HUD Controls */}
          <div className="absolute top-3 left-3 bg-[#051424]/90 border border-cyan-500/50 backdrop-blur-md rounded-lg p-3 text-xs shadow-2xl z-20 max-w-sm">
            <div className="flex items-center gap-2 pb-1.5 border-b border-[#1c2b3c]">
              <Globe className="w-4 h-4 text-cyan-400 animate-spin" />
              <span className="font-bold text-white font-mono uppercase tracking-wider">
                Google Earth 3D Photorealistic Mode
              </span>
            </div>
            <p className="text-[11px] text-slate-300 mt-1.5 font-sans">
              Inspecting 3D terrain topography, elevation contours, and cliff faces for{' '}
              <b className="text-cyan-300">{selectedZone.name}</b>.
            </p>
            <div className="mt-2 grid grid-cols-2 gap-2 text-[10px] font-mono text-slate-400">
              <div>GPS: <span className="text-white">{selectedZone.coords}</span></div>
              <div>Camera Tilt: <span className="text-amber-300">65° Oblique</span></div>
            </div>
            <div className="mt-2.5 flex items-center gap-2">
              <a
                href={googleEarth3dUrl}
                target="_blank"
                rel="noreferrer"
                className="flex-1 py-1 px-2 bg-cyan-600 hover:bg-cyan-500 text-white rounded text-[10px] font-mono flex items-center justify-center gap-1 font-bold shadow transition-all"
              >
                <span>Full WebGL Earth</span>
                <ExternalLink className="w-3 h-3" />
              </a>
              <button
                onClick={() => setBasemap('hybrid')}
                className="py-1 px-2 bg-[#122131] hover:bg-[#1c2b3c] text-cyan-300 border border-cyan-500/40 rounded text-[10px] font-mono transition-all cursor-pointer"
              >
                Exit 3D Mode
              </button>
            </div>
          </div>
        </div>
      ) : (
        <>
          {/* Main Leaflet GIS Map Container */}
          <div ref={mapContainerRef} className="w-full h-full z-0" />

          {/* Transparent Canvas Overlay for ML Pattern Heatmap */}
          <canvas
            ref={canvasOverlayRef}
            className="absolute inset-0 pointer-events-none z-10"
            style={{ width: '100%', height: '100%' }}
          />
        </>
      )}

      {/* Top Left: Basemap Switcher Selector (Google Earth Satellite, Hybrid, Terrain, 3D) */}
      <div className="absolute top-3 left-3 z-20 flex flex-wrap items-center gap-1 bg-[#051424]/90 backdrop-blur-md p-1.5 rounded-lg border border-[#1c2b3c] shadow-xl">
        <button
          onClick={() => setBasemap('satellite')}
          className={`flex items-center gap-1 px-2.5 py-1 rounded text-xs font-mono font-medium transition-all cursor-pointer ${
            basemap === 'satellite'
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
          className={`flex items-center gap-1 px-2.5 py-1 rounded text-xs font-mono font-medium transition-all cursor-pointer ${
            basemap === 'hybrid'
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
          className={`flex items-center gap-1 px-2.5 py-1 rounded text-xs font-mono font-medium transition-all cursor-pointer ${
            basemap === 'terrain'
              ? 'bg-cyan-500 text-[#00363e] font-bold shadow'
              : 'text-slate-300 hover:bg-[#122131] hover:text-white'
          }`}
          title="Google Earth Topography & Elevation Contours"
        >
          <Mountain className="w-3.5 h-3.5" />
          <span>Terrain</span>
        </button>

        <button
          onClick={() => setBasemap('3d_earth')}
          className={`flex items-center gap-1 px-2.5 py-1 rounded text-xs font-mono font-bold transition-all cursor-pointer ${
            basemap === '3d_earth'
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
          className={`px-2.5 py-1.5 rounded-lg text-xs font-mono font-bold flex items-center gap-1.5 shadow-xl border transition-all cursor-pointer ${
            activeLayers.mlHeatmap
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
          className={`p-1.5 rounded-lg border text-xs shadow-xl transition-all cursor-pointer ${
            showSettingsPanel
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

      {/* Bottom Center: Institutional ML Susceptibility Heatmap Legend */}
      {activeLayers.mlHeatmap && (
        <div className="absolute bottom-3 left-1/2 transform -translate-x-1/2 z-20 bg-[#051424]/90 backdrop-blur-md border border-[#1c2b3c] rounded-lg px-3 py-1.5 text-[10px] font-mono shadow-xl flex items-center gap-3">
          <span className="text-slate-400 font-bold uppercase">ML Risk Gradient:</span>
          <div className="flex items-center gap-1">
            <span className="text-cyan-300 font-bold">0.0 (Low)</span>
            <div className="w-28 h-2 rounded bg-gradient-to-r from-cyan-400 via-emerald-400 via-amber-400 to-red-600 shadow-inner" />
            <span className="text-red-400 font-bold">1.0 (Critical)</span>
          </div>
        </div>
      )}

      {/* Bottom Left: GPS Target Lock HUD Overlay */}
      <div className="absolute bottom-3 left-3 z-20 bg-[#051424]/90 backdrop-blur-md border border-[#1c2b3c] rounded px-2.5 py-1 text-[10px] font-mono text-slate-300 flex items-center gap-3 pointer-events-none shadow-lg">
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
