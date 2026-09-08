import React, { useState, useEffect } from 'react';
import {
  HazardZone,
  SensorNode,
  NerState,
  HistoricalLandslideEvent,
  ZoneMlRiskEvaluation,
  MlHeatmapPoint,
} from '../types';
import { HAZARD_ZONES, SENSOR_NODES, ASSET_URLS } from '../data/mockData';
import { LandslideApi } from '../services/api';
import { GisMapContainer } from './GisMapContainer';
import {
  Layers,
  Crosshair,
  AlertTriangle,
  Radio,
  Sliders,
  Maximize2,
  Minimize2,
  Compass,
  Zap,
  TrendingUp,
  CloudRain,
  ShieldAlert,
  Send,
  Download,
  Info,
  ChevronRight,
  MapPin,
  Cpu,
  Sparkles,
  Flame,
  Search,
  Droplets,
  CheckSquare,
  Square,
  Navigation,
  ArrowRight,
} from 'lucide-react';

interface SpatialGisCommandProps {
  selectedState: NerState;
  onNavigateToLstm: (zoneId: string) => void;
  onNavigateToDispatch: (zoneId: string) => void;
  onNavigateToMlPipeline?: () => void;
  onNavigateToDetails?: (zone: HazardZone) => void;
  theme?: 'dark' | 'light';
  selectedZone?: HazardZone;
  onSelectZone?: (zone: HazardZone) => void;
}

export const SpatialGisCommand: React.FC<SpatialGisCommandProps> = ({
  selectedState,
  onNavigateToLstm,
  onNavigateToDispatch,
  onNavigateToMlPipeline,
  onNavigateToDetails,
  theme = 'dark',
  selectedZone: propSelectedZone,
  onSelectZone: propOnSelectZone,
}) => {
  const [internalSelectedZone, setInternalSelectedZone] = useState<HazardZone>(HAZARD_ZONES[0]);
  const selectedZone = propSelectedZone || internalSelectedZone;

  const handleSelectZone = (z: HazardZone) => {
    if (propOnSelectZone) {
      propOnSelectZone(z);
    } else {
      setInternalSelectedZone(z);
    }
  };

  const isDark = theme === 'dark';

  // Screen 3 Filter Checkboxes State
  const [riskFilters, setRiskFilters] = useState({
    high: true,
    moderate: true,
    low: true,
    pastEvents: true,
  });

  const [activeLayers, setActiveLayers] = useState({
    susceptibility: true,
    demContours: true,
    imdRadar: true,
    soilSaturation: true,
    sensorNodes: true,
    mlInference: true,
    trainingEvents: true,
    mlHeatmap: true,
  });

  const [searchQuery, setSearchQuery] = useState('');
  const [is3DMode, setIs3DMode] = useState(false);
  const [mapZoom, setMapZoom] = useState(1);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const [zones, setZones] = useState<HazardZone[]>(HAZARD_ZONES);
  const [sensors, setSensors] = useState<SensorNode[]>(SENSOR_NODES);
  const [trainingEvents, setTrainingEvents] = useState<HistoricalLandslideEvent[]>([]);
  const [selectedEvent, setSelectedEvent] = useState<HistoricalLandslideEvent | null>(null);
  const [zoneMlRisk, setZoneMlRisk] = useState<ZoneMlRiskEvaluation | null>(null);
  const [stressRainfall, setStressRainfall] = useState<number>(0);
  const [heatmapPoints, setHeatmapPoints] = useState<MlHeatmapPoint[]>([]);

  useEffect(() => {
    let active = true;
    LandslideApi.getHazardZones(selectedState).then((data) => {
      if (active && data && data.length > 0) {
        setZones(data);
        if (!propSelectedZone) {
          setInternalSelectedZone(data[0]);
        }
      }
    });
    LandslideApi.getSensors(selectedState).then((data) => {
      if (active && data && data.length > 0) {
        setSensors(data);
      }
    });
    LandslideApi.getHistoricalTrainingEvents(selectedState).then((events) => {
      if (active && events) {
        setTrainingEvents(events);
      }
    });
    return () => {
      active = false;
    };
  }, [selectedState, propSelectedZone]);

  // Live ML evaluation for the selected zone
  useEffect(() => {
    let active = true;
    if (selectedZone?.id) {
      LandslideApi.getZoneMlRisk(selectedZone.id, stressRainfall).then((res) => {
        if (active && res) {
          setZoneMlRisk(res);
        }
      });
    }
    return () => {
      active = false;
    };
  }, [selectedZone?.id, stressRainfall]);

  // Live ML Heatmap points synthesized from model patterns
  useEffect(() => {
    let active = true;
    LandslideApi.getMlHeatmapPoints(selectedState, stressRainfall).then((pts) => {
      if (active && pts) {
        setHeatmapPoints(pts);
      }
    });
    return () => {
      active = false;
    };
  }, [selectedState, stressRainfall]);

  // Filter hazard zones according to state, search query, and risk level toggles
  const filteredZones = zones.filter((z) => {
    if (selectedState !== 'all' && z.state !== selectedState) return false;
    if (!riskFilters.high && z.riskStatus.includes('CRITICAL')) return false;
    if (!riskFilters.moderate && z.riskStatus.includes('ADVISORY')) return false;
    if (!riskFilters.low && z.riskStatus.includes('NOMINAL')) return false;
    if (
      searchQuery.trim() !== '' &&
      !z.name.toLowerCase().includes(searchQuery.toLowerCase()) &&
      !z.corridor.toLowerCase().includes(searchQuery.toLowerCase()) &&
      !z.state.toLowerCase().includes(searchQuery.toLowerCase())
    ) {
      return false;
    }
    return true;
  });

  // Filter sensors
  const filteredSensors =
    selectedState === 'all'
      ? sensors
      : sensors.filter((s) => s.state === selectedState);

  // Filter historical events based on pastEvents checkbox
  const visibleTrainingEvents = riskFilters.pastEvents ? trainingEvents : [];

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  const handleDroneDispatch = () => {
    showToast(`Drone Reconnaissance Flight Quad-402 dispatched to coordinates ${selectedZone.coords}. Realtime optical telemetry stream initializing.`);
  };

  const handleExportGeoJson = () => {
    const data = {
      type: 'FeatureCollection',
      name: selectedZone.name,
      properties: {
        riskStatus: selectedZone.riskStatus,
        displacementRate: selectedZone.displacementRate,
        soilPoreSaturation: selectedZone.soilPoreSaturation,
        coordinates: selectedZone.coords,
      },
      geometry: {
        type: 'Point',
        coordinates: [88.5134, 27.5312],
      },
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], {
      type: 'application/json',
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${selectedZone.id}-geotechnical-threat-vector.geojson`;
    a.click();
    showToast(`Exported GIS GeoJSON vector dataset for ${selectedZone.name}`);
  };

  const riskScoreNum = selectedZone.riskStatus.includes('CRITICAL')
    ? 78
    : selectedZone.riskStatus.includes('ADVISORY')
    ? 58
    : 24;

  return (
    <div className={`space-y-4 pb-12 transition-colors duration-200 ${isDark ? 'text-slate-100' : 'text-slate-800'}`}>
      {/* Toast Alert */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 bg-[#122131] text-[#90cfec] border border-[#44d8f1] px-4 py-3 rounded-xl shadow-xl shadow-cyan-950/80 flex items-center gap-3 font-sans text-xs sm:text-sm animate-bounce">
          <Zap className="w-4 h-4 text-[#ffb870] flex-shrink-0" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* KPI Telemetry Strip */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-2.5 sm:gap-3">
        <div className={`border rounded-xl p-3 sm:p-3.5 relative overflow-hidden ${
          isDark ? 'bg-[#0d1c2d] border-[#1c2b3c]' : 'bg-white border-slate-200 shadow-sm'
        }`}>
          <div className="flex items-center justify-between text-xs">
            <span className={`font-mono text-[11px] uppercase tracking-wider ${isDark ? 'text-[#8a9297]' : 'text-slate-500'}`}>
              Active Threat Matrix
            </span>
            <span className="w-2 h-2 rounded-full bg-red-500 animate-ping" />
          </div>
          <div className="mt-1 flex items-baseline gap-2">
            <span className="text-xl sm:text-2xl font-bold font-mono text-red-500">
              {zones.filter((z) => z.riskStatus.includes('CRITICAL')).length} RED ZONES
            </span>
            <span className="text-[11px] font-medium bg-red-500/20 text-red-500 px-1.5 py-0.5 rounded">
              High Runout
            </span>
          </div>
          <p className={`text-[11px] mt-1 truncate ${isDark ? 'text-[#bfc8cd]' : 'text-slate-600'}`}>
            Uttarkashi • Mangan • Sohra Rim • Dima Hasao
          </p>
        </div>

        <div className={`border rounded-xl p-3 sm:p-3.5 relative overflow-hidden ${
          isDark ? 'bg-[#0d1c2d] border-[#1c2b3c]' : 'bg-white border-slate-200 shadow-sm'
        }`}>
          <div className="flex items-center justify-between text-xs">
            <span className={`font-mono text-[11px] uppercase tracking-wider ${isDark ? 'text-[#8a9297]' : 'text-slate-500'}`}>
              24h Neural Trigger
            </span>
            <TrendingUp className="w-3.5 h-3.5 text-amber-500" />
          </div>
          <div className="mt-1 flex items-baseline gap-2">
            <span className="text-xl sm:text-2xl font-bold font-mono text-amber-500">89.4%</span>
            <span className="text-[11px] font-medium bg-amber-500/20 text-amber-500 px-1.5 py-0.5 rounded">
              +14.2% Surge
            </span>
          </div>
          <p className={`text-[11px] mt-1 truncate ${isDark ? 'text-[#bfc8cd]' : 'text-slate-600'}`}>
            Rainfall threshold breach in Uttarakhand & Sikkim
          </p>
        </div>

        <div className={`border rounded-xl p-3 sm:p-3.5 relative overflow-hidden ${
          isDark ? 'bg-[#0d1c2d] border-[#1c2b3c]' : 'bg-white border-slate-200 shadow-sm'
        }`}>
          <div className="flex items-center justify-between text-xs">
            <span className={`font-mono text-[11px] uppercase tracking-wider ${isDark ? 'text-[#8a9297]' : 'text-slate-500'}`}>
              In-Situ IoT Mesh
            </span>
            <Radio className="w-3.5 h-3.5 text-cyan-500" />
          </div>
          <div className="mt-1 flex items-baseline gap-2">
            <span className="text-xl sm:text-2xl font-bold font-mono text-cyan-500">148 Nodes</span>
            <span className="text-[11px] font-semibold bg-cyan-500/20 text-cyan-500 px-1.5 py-0.5 rounded">
              99.8% Online
            </span>
          </div>
          <p className={`text-[11px] mt-1 truncate ${isDark ? 'text-[#bfc8cd]' : 'text-slate-600'}`}>
            GSAT-7A / LoRa mesh sync active
          </p>
        </div>

        <div className={`border rounded-xl p-3 sm:p-3.5 relative overflow-hidden ${
          isDark ? 'bg-[#0d1c2d] border-[#1c2b3c]' : 'bg-white border-slate-200 shadow-sm'
        }`}>
          <div className="flex items-center justify-between text-xs">
            <span className={`font-mono text-[11px] uppercase tracking-wider ${isDark ? 'text-[#8a9297]' : 'text-slate-500'}`}>
              Doppler Radar Ingest
            </span>
            <CloudRain className="w-3.5 h-3.5 text-blue-500" />
          </div>
          <div className="mt-1 flex items-baseline gap-2">
            <span className="text-xl sm:text-2xl font-bold font-mono text-blue-500">142 mm/24h</span>
            <span className="text-[11px] font-semibold bg-blue-500/20 text-blue-500 px-1.5 py-0.5 rounded">
              Severe Cell
            </span>
          </div>
          <p className={`text-[11px] mt-1 truncate ${isDark ? 'text-[#bfc8cd]' : 'text-slate-600'}`}>
            Uttarkashi & Dehradun Doppler lock • cloudburst cell
          </p>
        </div>
      </div>

      {/* Main Grid: Screen 3 Layout (Left Sidebar + Google Earth Map + Inspector Drawer) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        {/* Left Sidebar (Screen 3 Layout: 3.5 cols on large screen) */}
        <div className="lg:col-span-4 space-y-4">
          <div
            className={`p-5 rounded-2xl border ${
              isDark ? 'bg-[#0d1c2d] border-[#1c2b3c]' : 'bg-white border-slate-200 shadow-sm'
            }`}
          >
            {/* Search Location Input */}
            <div className="relative mb-5">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Search location..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className={`w-full pl-9 pr-3 py-2 rounded-xl text-xs sm:text-sm border outline-none font-medium transition-all ${
                  isDark
                    ? 'bg-slate-800/80 text-white border-slate-700 focus:border-emerald-500'
                    : 'bg-slate-50 text-slate-900 border-slate-300 focus:border-emerald-600'
                }`}
              />
            </div>

            {/* Section 1: Risk Zones Checkboxes (Screen 3 Mockup) */}
            <div className="mb-5">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3">
                Risk Zones
              </h3>
              <div className="space-y-2.5">
                <label className="flex items-center gap-2.5 cursor-pointer text-xs font-semibold group">
                  <input
                    type="checkbox"
                    checked={riskFilters.high}
                    onChange={(e) =>
                      setRiskFilters((p) => ({ ...p, high: e.target.checked }))
                    }
                    className="w-4 h-4 rounded text-red-600 focus:ring-red-500 cursor-pointer accent-red-600"
                  />
                  <span className="w-3 h-3 rounded-sm bg-red-500 shrink-0" />
                  <span className={isDark ? 'group-hover:text-white' : 'group-hover:text-slate-900'}>
                    High Risk ({zones.filter((z) => z.riskStatus.includes('CRITICAL')).length})
                  </span>
                </label>

                <label className="flex items-center gap-2.5 cursor-pointer text-xs font-semibold group">
                  <input
                    type="checkbox"
                    checked={riskFilters.moderate}
                    onChange={(e) =>
                      setRiskFilters((p) => ({ ...p, moderate: e.target.checked }))
                    }
                    className="w-4 h-4 rounded text-amber-500 focus:ring-amber-400 cursor-pointer accent-amber-500"
                  />
                  <span className="w-3 h-3 rounded-sm bg-amber-500 shrink-0" />
                  <span className={isDark ? 'group-hover:text-white' : 'group-hover:text-slate-900'}>
                    Moderate Risk ({zones.filter((z) => z.riskStatus.includes('ADVISORY')).length})
                  </span>
                </label>

                <label className="flex items-center gap-2.5 cursor-pointer text-xs font-semibold group">
                  <input
                    type="checkbox"
                    checked={riskFilters.low}
                    onChange={(e) =>
                      setRiskFilters((p) => ({ ...p, low: e.target.checked }))
                    }
                    className="w-4 h-4 rounded text-emerald-500 focus:ring-emerald-400 cursor-pointer accent-emerald-500"
                  />
                  <span className="w-3 h-3 rounded-sm bg-emerald-500 shrink-0" />
                  <span className={isDark ? 'group-hover:text-white' : 'group-hover:text-slate-900'}>
                    Low Risk ({zones.filter((z) => z.riskStatus.includes('NOMINAL')).length})
                  </span>
                </label>

                <label className="flex items-center gap-2.5 cursor-pointer text-xs font-semibold group">
                  <input
                    type="checkbox"
                    checked={riskFilters.pastEvents}
                    onChange={(e) =>
                      setRiskFilters((p) => ({ ...p, pastEvents: e.target.checked }))
                    }
                    className="w-4 h-4 rounded text-purple-500 focus:ring-purple-400 cursor-pointer accent-purple-500"
                  />
                  <span className="w-3 h-3 rounded-sm bg-purple-500 shrink-0" />
                  <span className={isDark ? 'group-hover:text-white' : 'group-hover:text-slate-900'}>
                    Past Events ({trainingEvents.length})
                  </span>
                </label>
              </div>
            </div>

            {/* Section 2: Map Layers Checkboxes (Screen 3 Mockup) */}
            <div className="pt-4 border-t border-slate-200 dark:border-slate-800 mb-5">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3">
                Map Layers
              </h3>
              <div className="space-y-2.5">
                <label className="flex items-center gap-2.5 cursor-pointer text-xs font-medium group">
                  <input
                    type="checkbox"
                    checked={activeLayers.imdRadar}
                    onChange={() =>
                      setActiveLayers((p) => ({ ...p, imdRadar: !p.imdRadar }))
                    }
                    className="w-4 h-4 rounded text-blue-500 focus:ring-blue-400 cursor-pointer accent-blue-500"
                  />
                  <CloudRain className="w-3.5 h-3.5 text-blue-500" />
                  <span>Rainfall (IMD Radar)</span>
                </label>

                <label className="flex items-center gap-2.5 cursor-pointer text-xs font-medium group">
                  <input
                    type="checkbox"
                    checked={activeLayers.soilSaturation}
                    onChange={() =>
                      setActiveLayers((p) => ({ ...p, soilSaturation: !p.soilSaturation }))
                    }
                    className="w-4 h-4 rounded text-cyan-500 focus:ring-cyan-400 cursor-pointer accent-cyan-500"
                  />
                  <Droplets className="w-3.5 h-3.5 text-cyan-500" />
                  <span>Soil Moisture Saturation</span>
                </label>

                <label className="flex items-center gap-2.5 cursor-pointer text-xs font-medium group">
                  <input
                    type="checkbox"
                    checked={activeLayers.demContours}
                    onChange={() =>
                      setActiveLayers((p) => ({ ...p, demContours: !p.demContours }))
                    }
                    className="w-4 h-4 rounded text-amber-500 focus:ring-amber-400 cursor-pointer accent-amber-500"
                  />
                  <TrendingUp className="w-3.5 h-3.5 text-amber-500" />
                  <span>Slope (DEM Contours)</span>
                </label>

                <label className="flex items-center gap-2.5 cursor-pointer text-xs font-medium group">
                  <input
                    type="checkbox"
                    checked={activeLayers.trainingEvents}
                    onChange={() =>
                      setActiveLayers((p) => ({ ...p, trainingEvents: !p.trainingEvents }))
                    }
                    className="w-4 h-4 rounded text-purple-500 focus:ring-purple-400 cursor-pointer accent-purple-500"
                  />
                  <MapPin className="w-3.5 h-3.5 text-purple-500" />
                  <span>Historical Data (Events)</span>
                </label>

                <label className="flex items-center gap-2.5 cursor-pointer text-xs font-medium group">
                  <input
                    type="checkbox"
                    checked={activeLayers.mlHeatmap}
                    onChange={() =>
                      setActiveLayers((p) => ({ ...p, mlHeatmap: !p.mlHeatmap }))
                    }
                    className="w-4 h-4 rounded text-red-500 focus:ring-red-400 cursor-pointer accent-red-500"
                  />
                  <Flame className="w-3.5 h-3.5 text-red-500" />
                  <span>ML Pattern Heatmap ({heatmapPoints.length})</span>
                </label>

                <label className="flex items-center gap-2.5 cursor-pointer text-xs font-medium group">
                  <input
                    type="checkbox"
                    checked={activeLayers.sensorNodes}
                    onChange={() =>
                      setActiveLayers((p) => ({ ...p, sensorNodes: !p.sensorNodes }))
                    }
                    className="w-4 h-4 rounded text-emerald-500 focus:ring-emerald-400 cursor-pointer accent-emerald-500"
                  />
                  <Radio className="w-3.5 h-3.5 text-emerald-500" />
                  <span>IoT Sensor Nodes (148)</span>
                </label>
              </div>
            </div>

            {/* Section 3: Selected Zone Quick Info Card (Screen 3 Mockup) */}
            <div
              className={`p-4 rounded-xl border transition-all ${
                selectedZone.riskStatus.includes('CRITICAL')
                  ? isDark
                    ? 'bg-red-950/20 border-red-500/40'
                    : 'bg-red-50 border-red-200'
                  : isDark
                  ? 'bg-slate-800/40 border-slate-700'
                  : 'bg-slate-50 border-slate-200'
              }`}
            >
              <div className="flex items-start justify-between">
                <div>
                  <h4 className="font-bold text-sm">{selectedZone.name}</h4>
                  <p className="text-xs text-slate-400 mt-0.5">{selectedZone.corridor}</p>
                </div>
                <span
                  className={`text-[10px] font-extrabold px-2 py-0.5 rounded-full ${
                    selectedZone.riskStatus.includes('CRITICAL')
                      ? 'bg-red-500/20 text-red-500'
                      : 'bg-amber-500/20 text-amber-500'
                  }`}
                >
                  {selectedZone.riskStatus.includes('CRITICAL') ? 'High (78%)' : 'Moderate'}
                </span>
              </div>

              <div className="mt-3 grid grid-cols-2 gap-1.5 text-[11px] font-mono">
                <div>
                  Rainfall: <span className="text-blue-500 font-bold">120 mm</span>
                </div>
                <div>
                  Moisture: <span className="text-cyan-500 font-bold">{selectedZone.soilPoreSaturation}</span>
                </div>
                <div>
                  Slope: <span className="text-amber-500 font-bold">{selectedZone.slopeGradient}</span>
                </div>
                <div>
                  Evac: <span className="text-emerald-500 font-bold">{selectedZone.lstmEvac}</span>
                </div>
              </div>

              {onNavigateToDetails && (
                <button
                  onClick={() => onNavigateToDetails(selectedZone)}
                  className="mt-3 w-full py-2 px-3 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs transition-all flex items-center justify-center gap-1.5 shadow-sm"
                >
                  <span>Details & Safe Routes</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {/* Quick Zone Switcher List */}
            <div className="mt-4 pt-3 border-t border-slate-200 dark:border-slate-800">
              <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block mb-2">
                Available Corridors:
              </span>
              <div className="max-h-36 overflow-y-auto space-y-1.5 pr-1">
                {filteredZones.map((z) => (
                  <button
                    key={z.id}
                    onClick={() => handleSelectZone(z)}
                    className={`w-full text-left p-2 rounded-lg text-xs transition-all flex items-center justify-between ${
                      selectedZone.id === z.id
                        ? 'bg-emerald-600 text-white font-semibold shadow-sm'
                        : isDark
                        ? 'hover:bg-slate-800/80 text-slate-300'
                        : 'hover:bg-slate-100 text-slate-700'
                    }`}
                  >
                    <span className="truncate max-w-[160px]">{z.name}</span>
                    <span
                      className={`text-[9px] px-1.5 py-0.5 rounded ${
                        z.riskStatus.includes('CRITICAL')
                          ? 'bg-red-500/20 text-red-400'
                          : 'bg-amber-500/20 text-amber-400'
                      }`}
                    >
                      {z.riskStatus.includes('CRITICAL') ? 'HIGH' : 'MED'}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Google Earth GIS Map Canvas + Telemetry & Inspector (8 cols) */}
        <div className="lg:col-span-8 space-y-4">
          <div
            className={`border rounded-2xl overflow-hidden relative shadow-lg ${
              isDark ? 'bg-[#0d1c2d] border-[#1c2b3c]' : 'bg-white border-slate-200'
            }`}
          >
            {/* Map Header Toolbar */}
            <div
              className={`px-4 py-3 border-b flex items-center justify-between gap-2 ${
                isDark ? 'bg-[#122131]/90 border-[#1c2b3c]' : 'bg-slate-50 border-slate-200'
              }`}
            >
              <div className="flex items-center gap-2">
                <Compass className="w-4 h-4 text-cyan-500 animate-spin-slow" />
                <span className="text-xs sm:text-sm font-bold tracking-wide">
                  Topographic GIS Vector Mesh (Google Earth & Sentinel-1 InSAR)
                </span>
              </div>

              {/* Map Actions */}
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setIs3DMode(!is3DMode)}
                  className={`text-[11px] font-mono px-2.5 py-1 rounded-lg border transition-all ${
                    is3DMode
                      ? 'bg-cyan-600 text-white border-cyan-500'
                      : isDark
                      ? 'bg-[#051424] text-[#8a9297] border-[#273647] hover:text-white'
                      : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-100'
                  }`}
                >
                  {is3DMode ? '3D OBLIQUE' : '2D TOP-DOWN'}
                </button>
                <button
                  onClick={() => setMapZoom(mapZoom === 1 ? 1.25 : 1)}
                  aria-label="Toggle map zoom magnification"
                  className={`p-1.5 rounded-lg border ${
                    isDark
                      ? 'bg-[#051424] text-[#8a9297] hover:text-white border-[#273647]'
                      : 'bg-white text-slate-700 hover:bg-slate-100 border-slate-300'
                  }`}
                >
                  {mapZoom > 1 ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
                </button>
              </div>
            </div>

            {/* Interactive Google Earth & ML Pattern Heatmap GIS Canvas */}
            <GisMapContainer
              selectedZone={selectedZone}
              onSelectZone={handleSelectZone}
              zones={filteredZones}
              sensors={filteredSensors}
              trainingEvents={visibleTrainingEvents}
              selectedEvent={selectedEvent}
              onSelectEvent={(evt) => setSelectedEvent(evt)}
              zoneMlRisk={zoneMlRisk}
              heatmapPoints={heatmapPoints}
              stressRainfall={stressRainfall}
              activeLayers={activeLayers}
              onToggleLayer={(key) =>
                setActiveLayers((prev: any) => ({ ...prev, [key]: !prev[key] }))
              }
              onShowToast={showToast}
            />

            {/* Bottom Status bar under map */}
            <div
              className={`px-4 py-2.5 border-t flex flex-wrap items-center justify-between text-xs gap-2 ${
                isDark ? 'bg-[#0d1c2d] border-[#1c2b3c] text-slate-400' : 'bg-slate-50 border-slate-200 text-slate-600'
              }`}
            >
              <div className="flex items-center gap-3 text-[11px] font-mono">
                <span className="flex items-center gap-1.5 text-red-500 font-bold">
                  <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
                  HIGH RISK: {filteredZones.filter((z) => z.riskStatus.includes('CRITICAL')).length}
                </span>
                <span className="flex items-center gap-1.5 text-amber-500 font-bold">
                  <span className="w-2 h-2 rounded-full bg-amber-500" />
                  MODERATE: {filteredZones.filter((z) => z.riskStatus.includes('ADVISORY')).length}
                </span>
              </div>

              <div className="flex items-center gap-2">
                <span className="text-[11px] font-mono">
                  Click any zone marker to focus and view telemetry
                </span>
              </div>
            </div>
          </div>

          {/* Inspector Panel & Real-time ML Evaluation */}
          <div
            className={`p-5 rounded-2xl border ${
              isDark ? 'bg-[#0d1c2d] border-[#1c2b3c]' : 'bg-white border-slate-200 shadow-sm'
            }`}
          >
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 pb-3 border-b border-slate-200 dark:border-slate-800">
              <div>
                <h3 className="text-base font-bold flex items-center gap-2">
                  <Cpu className="w-4 h-4 text-emerald-500" />
                  <span>Geotechnical & ML Evaluation: {selectedZone.name}</span>
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Centroid: {selectedZone.coords} • Elevation: {selectedZone.elevation}
                </p>
              </div>

              <div className="flex items-center gap-2">
                <span className="text-xs px-2.5 py-1 rounded-md bg-emerald-500/15 text-emerald-500 font-mono font-bold">
                  RF Confidence: {selectedZone.rfConfidence}
                </span>
              </div>
            </div>

            {/* Precipitation Stress Slider */}
            <div className="mt-4 pt-2">
              <div className="flex items-center justify-between text-xs font-mono mb-1">
                <span className="flex items-center gap-1.5 text-slate-400">
                  <CloudRain className="w-4 h-4 text-cyan-500" />
                  Rainfall Stress Test Simulation:
                </span>
                <span className="text-amber-500 font-bold">
                  +{stressRainfall} mm{' '}
                  <span className="text-slate-400 font-normal">
                    (Total: {(zoneMlRisk ? zoneMlRisk.actual_rainfall_3d + stressRainfall : 120 + stressRainfall).toFixed(1)} mm)
                  </span>
                </span>
              </div>
              <input
                type="range"
                min="0"
                max="120"
                step="5"
                value={stressRainfall}
                onChange={(e) => setStressRainfall(Number(e.target.value))}
                className="w-full h-2 rounded-lg appearance-none cursor-pointer accent-emerald-500 bg-slate-200 dark:bg-slate-700"
              />
              <div className="flex justify-between text-[10px] font-mono text-slate-400 mt-1">
                <span>Baseline (+0mm)</span>
                <span>Severe Cloudburst (+120mm)</span>
              </div>
            </div>

            {/* Geotechnical metrics strip */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 mt-4">
              <div className={`p-2.5 rounded-xl border ${isDark ? 'bg-slate-800/40 border-slate-700/60' : 'bg-slate-50 border-slate-200'}`}>
                <span className="text-[10px] font-mono text-slate-400 block uppercase">Pore Saturation</span>
                <span className="text-sm sm:text-base font-bold font-mono text-red-500">{selectedZone.soilPoreSaturation}</span>
              </div>
              <div className={`p-2.5 rounded-xl border ${isDark ? 'bg-slate-800/40 border-slate-700/60' : 'bg-slate-50 border-slate-200'}`}>
                <span className="text-[10px] font-mono text-slate-400 block uppercase">Displacement Rate</span>
                <span className="text-sm sm:text-base font-bold font-mono text-amber-500">{selectedZone.displacementRate}</span>
              </div>
              <div className={`p-2.5 rounded-xl border ${isDark ? 'bg-slate-800/40 border-slate-700/60' : 'bg-slate-50 border-slate-200'}`}>
                <span className="text-[10px] font-mono text-slate-400 block uppercase">Slope Gradient</span>
                <span className="text-sm sm:text-base font-bold font-mono">{selectedZone.slopeGradient}</span>
              </div>
              <div className={`p-2.5 rounded-xl border ${isDark ? 'bg-slate-800/40 border-slate-700/60' : 'bg-slate-50 border-slate-200'}`}>
                <span className="text-[10px] font-mono text-slate-400 block uppercase">Evac Window</span>
                <span className="text-sm sm:text-base font-bold font-mono text-emerald-500">{selectedZone.lstmEvac}</span>
              </div>
            </div>

            {/* Action buttons */}
            <div className="mt-4 pt-3 border-t border-slate-200 dark:border-slate-800 flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <button
                  onClick={handleDroneDispatch}
                  className={`px-3 py-2 rounded-xl text-xs font-semibold border transition-all flex items-center gap-1.5 ${
                    isDark
                      ? 'bg-slate-800 hover:bg-slate-700 text-cyan-400 border-slate-700'
                      : 'bg-slate-100 hover:bg-slate-200 text-slate-800 border-slate-200'
                  }`}
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>Dispatch Drone Recon</span>
                </button>

                <button
                  onClick={handleExportGeoJson}
                  className={`px-3 py-2 rounded-xl text-xs font-semibold border transition-all flex items-center gap-1.5 ${
                    isDark
                      ? 'bg-slate-800 hover:bg-slate-700 text-slate-300 border-slate-700'
                      : 'bg-slate-100 hover:bg-slate-200 text-slate-700 border-slate-200'
                  }`}
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Export GeoJSON</span>
                </button>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => onNavigateToDispatch(selectedZone.id)}
                  className="px-4 py-2 rounded-xl bg-red-600 hover:bg-red-700 text-white font-bold text-xs transition-all shadow-md shadow-red-600/20 flex items-center gap-1.5"
                >
                  <ShieldAlert className="w-4 h-4" />
                  <span>Stage 3 Evacuation</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
