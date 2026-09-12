import React, { useState, useEffect, useMemo } from 'react';
import {
  HazardZone,
  SensorNode,
  NerState,
  HistoricalLandslideEvent,
  ZoneMlRiskEvaluation,
  MlHeatmapPoint,
  EarthquakeEvent,
  HistoricalEarthquakeEvent,
} from '../types';
import { HAZARD_ZONES, SENSOR_NODES, ASSET_URLS } from '../data/mockData';
import { LandslideApi } from '../services/api';
import { GisMapContainer } from './GisMapContainer';
import { HillsRegion, HILLS_AND_MOUNTAIN_REGIONS } from '../data/hillsData';
import { useMapContext } from '../context/MapContext';
import {
  HistoricalReplayTimeline,
  HistoricalReplayRange,
} from './HistoricalReplayTimeline';
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
  Mountain,
  Cpu,
  Sparkles,
  Flame,
  Search,
  Droplets,
  CheckSquare,
  Square,
  Navigation,
  ArrowRight,
  Loader2,
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
  selectedHillRegion?: HillsRegion | null;
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
  selectedHillRegion: propSelectedHillRegion = null,
}) => {
  const {
    selectedRegion: contextRegion,
    setSelectedRegion: setContextRegion,
    focusCoordinates: contextFocusCoordinates,
    setFocusCoordinates: setContextFocusCoordinates,
    mapMode,
    setMapMode,
    selectedYear,
    setSelectedYear,
    searchQuery,
    setSearchQuery,
    enabledLayers: contextEnabledLayers,
    setEnabledLayers: setContextEnabledLayers,
  } = useMapContext();

  const effectiveHillRegion = propSelectedHillRegion || contextRegion;

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

  const activeLayers = contextEnabledLayers;
  const setActiveLayers = (updater: any) => {
    if (typeof updater === 'function') {
      setContextEnabledLayers(updater(contextEnabledLayers));
    } else {
      setContextEnabledLayers(updater);
    }
  };

  const [showCurrentMlOverlay, setShowCurrentMlOverlay] = useState<boolean>(false);
  const [is3DMode, setIs3DMode] = useState(false);
  const [mapZoom, setMapZoom] = useState(1);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [isDispatching, setIsDispatching] = useState(false);
  const [localFocusCoords, setLocalFocusCoords] = useState<{ latitude: number; longitude: number; zoom?: number } | undefined>(undefined);


  const [zones, setZones] = useState<HazardZone[]>(HAZARD_ZONES);
  const [sensors, setSensors] = useState<SensorNode[]>(SENSOR_NODES);
  const [trainingEvents, setTrainingEvents] = useState<HistoricalLandslideEvent[]>([]);
  const [yearCounts, setYearCounts] = useState<{ year: number; count: number }[]>([]);
  const [historicalTimelineRange, setHistoricalTimelineRange] =
    useState<HistoricalReplayRange | null>(null);
  const [selectedEvent, setSelectedEvent] = useState<HistoricalLandslideEvent | null>(null);
  const [zoneMlRisk, setZoneMlRisk] = useState<ZoneMlRiskEvaluation | null>(null);
  const [stressRainfall, setStressRainfall] = useState<number>(0);
  const [heatmapPoints, setHeatmapPoints] = useState<MlHeatmapPoint[]>([]);
  const [earthquakes, setEarthquakes] = useState<EarthquakeEvent[]>([]);
  const [earthquakeStatus, setEarthquakeStatus] = useState('Loading NCS feed...');
  const [historicalEarthquakes, setHistoricalEarthquakes] = useState<HistoricalEarthquakeEvent[]>([]);

  useEffect(() => {
    let active = true;
    const controller = new AbortController();
    LandslideApi.getHazardZones(selectedState, controller.signal).then((data) => {
      if (data && data.length > 0) {
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
    LandslideApi.getHistoricalTrainingEventsTimeline().then((timeline) => {
      if (active && timeline) {
        setYearCounts(timeline);
      }
    });
    return () => {
      active = false;
      controller.abort();
    };
  }, [selectedState]);

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

  useEffect(() => {
    let active = true;
    let latitude: number | undefined;
    let longitude: number | undefined;

    if (effectiveHillRegion?.coordinatesVerified && effectiveHillRegion.latitude !== undefined && effectiveHillRegion.longitude !== undefined) {
      latitude = effectiveHillRegion.latitude;
      longitude = effectiveHillRegion.longitude;
    } else if (contextFocusCoordinates && Number.isFinite(contextFocusCoordinates.latitude) && Number.isFinite(contextFocusCoordinates.longitude)) {
      latitude = contextFocusCoordinates.latitude;
      longitude = contextFocusCoordinates.longitude;
    } else {
      const match = selectedZone.coords.match(/(-?\d+(?:\.\d+)?)[^,]*,\s*(-?\d+(?:\.\d+)?)/);
      latitude = match ? Number(match[1]) : undefined;
      longitude = match ? Number(match[2]) : undefined;
    }

    LandslideApi.getEarthquakes(latitude, longitude).then((response) => {
      if (!active) return;
      setEarthquakes(response.events);
      setEarthquakeStatus(response.earthquake_data_available
        ? `${response.events.length} NCS events in range`
        : 'NCS feed temporarily unavailable');
    });

    return () => {
      active = false;
    };
  }, [
    effectiveHillRegion?.id,
    effectiveHillRegion?.latitude,
    effectiveHillRegion?.longitude,
    contextFocusCoordinates?.latitude,
    contextFocusCoordinates?.longitude,
    selectedZone.coords,
  ]);

  // Fetch historical earthquakes based on selected year
  useEffect(() => {
    let active = true;
    let latitude: number | undefined;
    let longitude: number | undefined;

    if (effectiveHillRegion?.coordinatesVerified && effectiveHillRegion.latitude !== undefined && effectiveHillRegion.longitude !== undefined) {
      latitude = effectiveHillRegion.latitude;
      longitude = effectiveHillRegion.longitude;
    } else if (contextFocusCoordinates && Number.isFinite(contextFocusCoordinates.latitude) && Number.isFinite(contextFocusCoordinates.longitude)) {
      latitude = contextFocusCoordinates.latitude;
      longitude = contextFocusCoordinates.longitude;
    } else {
      const match = selectedZone.coords.match(/(-?\d+(?:\.\d+)?)[^,]*,\s*(-?\d+(?:\.\d+)?)/);
      latitude = match ? Number(match[1]) : undefined;
      longitude = match ? Number(match[2]) : undefined;
    }

    LandslideApi.getHistoricalEarthquakes(selectedYear, latitude, longitude).then((res) => {
      if (active) {
        setHistoricalEarthquakes(res);
      }
    });
    return () => { active = false; };
  }, [
    selectedYear,
    effectiveHillRegion?.id,
    effectiveHillRegion?.latitude,
    effectiveHillRegion?.longitude,
    contextFocusCoordinates?.latitude,
    contextFocusCoordinates?.longitude,
    selectedZone.coords,
  ]);

  // Filter hazard zones according to state, search query, and risk level toggles
  const normalizedSearchQuery = searchQuery.trim().toLowerCase();
  const filteredZones = useMemo(
    () =>
      zones.filter((z) => {
        if (selectedState !== 'all' && z.state !== selectedState) return false;
        if (!riskFilters.high && z.riskStatus.includes('CRITICAL')) return false;
        if (!riskFilters.moderate && z.riskStatus.includes('ADVISORY')) return false;
        if (!riskFilters.low && z.riskStatus.includes('NOMINAL')) return false;
        if (
          normalizedSearchQuery !== '' &&
          !z.name.toLowerCase().includes(normalizedSearchQuery) &&
          !z.corridor.toLowerCase().includes(normalizedSearchQuery) &&
          !z.state.toLowerCase().includes(normalizedSearchQuery)
        ) {
          return false;
        }
        return true;
      }),
    [zones, selectedState, riskFilters, normalizedSearchQuery]
  );

  // Filter sensors
  const filteredSensors = useMemo(
    () => (selectedState === 'all' ? sensors : sensors.filter((s) => s.state === selectedState)),
    [sensors, selectedState]
  );

  // Derived Visible Data Pipelines
  const visibleTrainingEvents = useMemo(() => {
    if (mapMode !== 'HISTORICAL' || !activeLayers.trainingEvents) return [];
    return trainingEvents.filter((event) => {
      const yearMatch = event.event_date.match(/^(\d{4})/);
      if (!yearMatch) return false;
      const year = Number(yearMatch[1]);
      return year === selectedYear;
    });
  }, [trainingEvents, mapMode, selectedYear, activeLayers.trainingEvents]);

  const visibleHistoricalEarthquakes = useMemo(() => {
    if (mapMode !== 'HISTORICAL' || !activeLayers.historicalEarthquakeEvents) return [];
    return historicalEarthquakes.filter((event) => {
      const year = new Date(event.event_time).getFullYear();
      return year === selectedYear;
    });
  }, [historicalEarthquakes, mapMode, selectedYear, activeLayers.historicalEarthquakeEvents]);

  const visibleHeatmapPoints = useMemo(() => {
    if (mapMode === 'HISTORICAL') {
      // In HISTORICAL mode, Extra Trees ML risk is separate and only shown when explicitly enabled
      return showCurrentMlOverlay && activeLayers.mlHeatmap ? heatmapPoints : [];
    }
    return activeLayers.mlHeatmap ? heatmapPoints : [];
  }, [heatmapPoints, mapMode, showCurrentMlOverlay, activeLayers.mlHeatmap]);

  const visibleEarthquakes = useMemo(() => {
    if (mapMode !== 'LIVE' || !activeLayers.earthquakeEvents) return [];
    return earthquakes;
  }, [earthquakes, mapMode, activeLayers.earthquakeEvents]);

  // Unified Search Derived State
  const unifiedSearchResults = useMemo(() => {
    const q = normalizedSearchQuery;
    if (!q) return { zones: filteredZones, regions: [], events: [], earthquakes: [] };

    const matchingRegions = HILLS_AND_MOUNTAIN_REGIONS.filter(
      (r) =>
        r.name.toLowerCase().includes(q) ||
        r.state.toLowerCase().includes(q) ||
        (r.category && r.category.toLowerCase().includes(q))
    );

    const matchingEvents = trainingEvents.filter(
      (e) =>
        e.state.toLowerCase().includes(q) ||
        e.event_date.toLowerCase().includes(q) ||
        (e.dataset_source && e.dataset_source.toLowerCase().includes(q)) ||
        (e.type && e.type.toLowerCase().includes(q)) ||
        (e.record_id && e.record_id.toLowerCase().includes(q))
    );

    const matchingEarthquakes = historicalEarthquakes.filter(
      (e) =>
        e.location.toLowerCase().includes(q) ||
        e.source.toLowerCase().includes(q) ||
        e.event_time.toLowerCase().includes(q)
    );

    return {
      zones: filteredZones,
      regions: matchingRegions,
      events: matchingEvents,
      earthquakes: matchingEarthquakes,
    };
  }, [normalizedSearchQuery, filteredZones, trainingEvents, historicalEarthquakes]);


  const timelineMinYear = yearCounts[0]?.year ?? 2009;
  const timelineMaxYear = yearCounts[yearCounts.length - 1]?.year ?? 2022;

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  const handleDroneDispatch = () => {
    showToast(`Drone Reconnaissance Flight Quad-402 dispatched to coordinates ${selectedZone.coords}. Realtime optical telemetry stream initializing.`);
  };

  const handleStage3Evacuation = () => {
    setIsDispatching(true);
    showToast(`Evacuation protocol staged for ${selectedZone.name}. Opening dispatch coordination.`);
    window.setTimeout(() => onNavigateToDispatch(selectedZone.id), 650);
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

      {/* Command header */}
      <section className={`relative overflow-hidden rounded-2xl border p-5 sm:p-6 ${isDark
        ? 'border-cyan-400/20 bg-[radial-gradient(circle_at_85%_20%,rgba(34,211,238,0.16),transparent_32%),linear-gradient(120deg,#0d1c2d_0%,#0a1728_58%,#102b36_100%)]'
        : 'border-cyan-200 bg-[radial-gradient(circle_at_85%_20%,rgba(6,182,212,0.12),transparent_32%),linear-gradient(120deg,#ffffff_0%,#f0fdfa_100%)] shadow-sm'
        }`}>
        <div className="absolute -right-12 -top-16 h-44 w-44 rounded-full border border-cyan-300/15" />
        <div className="absolute right-5 top-5 h-2 w-2 rounded-full bg-cyan-300 shadow-[0_0_18px_5px_rgba(103,232,249,0.35)]" />
        <div className="relative flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <div className="mb-2 flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.2em] text-cyan-400">
              <span className="h-1.5 w-1.5 rounded-full bg-cyan-300 animate-pulse" />
              Live geospatial command
            </div>
            <h1 className="max-w-2xl text-2xl font-black tracking-tight text-white sm:text-3xl">
              Terrain intelligence, at a glance.
            </h1>
            <p className={`mt-2 max-w-xl text-sm leading-6 ${isDark ? 'text-slate-300' : 'text-slate-600'}`}>
              Monitor slope movement, rainfall pressure, and field telemetry across {selectedState === 'all' ? 'the national network' : selectedState}.
            </p>
          </div>
          <div className="flex shrink-0 items-center gap-2 text-[11px] font-mono">
            <span className={`rounded-full border px-3 py-1.5 ${isDark ? 'border-emerald-400/25 bg-emerald-400/10 text-emerald-300' : 'border-emerald-200 bg-emerald-50 text-emerald-700'}`}>
              <span className="mr-1.5 inline-block h-1.5 w-1.5 rounded-full bg-emerald-400" />
              SYSTEM NOMINAL
            </span>
            <span className={`rounded-full border px-3 py-1.5 ${isDark ? 'border-white/10 bg-white/5 text-slate-300' : 'border-slate-200 bg-white text-slate-600'}`}>
              SYNC 12s AGO
            </span>
          </div>
        </div>
      </section>

      {effectiveHillRegion && (
        <section className={`rounded-xl border px-4 py-3 ${isDark ? 'border-cyan-400/25 bg-cyan-500/10' : 'border-cyan-200 bg-cyan-50'}`}>
          <div className="text-[10px] font-mono font-bold uppercase tracking-[0.18em] text-cyan-400">
            Selected Region
          </div>
          <div className="mt-1 flex flex-wrap items-baseline gap-x-2 gap-y-1">
            <span className="text-base font-black">{effectiveHillRegion.name}</span>
            <span className={`text-sm ${isDark ? 'text-slate-300' : 'text-slate-600'}`}>
              {effectiveHillRegion.state}
            </span>
          </div>
          <p className={`mt-1 text-xs ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
            {effectiveHillRegion.coordinatesVerified
              ? 'Verified representative coordinates loaded. The existing GIS map is focusing this region while preserving all active layers.'
              : 'GIS focus is currently unavailable because verified geographic coordinates or boundaries have not been added for this region. Existing map layers and current viewport are preserved.'}
          </p>
        </section>
      )}

      {/* KPI Telemetry Strip */}
      <div className="grid grid-cols-2 gap-2.5 sm:gap-3 md:grid-cols-4">
        <div className={`border rounded-xl p-3 sm:p-3.5 relative overflow-hidden ${isDark ? 'bg-[#0d1c2d] border-[#1c2b3c]' : 'bg-white border-slate-200 shadow-sm'
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

        <div className={`border rounded-xl p-3 sm:p-3.5 relative overflow-hidden ${isDark ? 'bg-[#0d1c2d] border-[#1c2b3c]' : 'bg-white border-slate-200 shadow-sm'
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

        <div className={`border rounded-xl p-3 sm:p-3.5 relative overflow-hidden ${isDark ? 'bg-[#0d1c2d] border-[#1c2b3c]' : 'bg-white border-slate-200 shadow-sm'
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

        <div className={`border rounded-xl p-3 sm:p-3.5 relative overflow-hidden ${isDark ? 'bg-[#0d1c2d] border-[#1c2b3c]' : 'bg-white border-slate-200 shadow-sm'
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
            className={`p-5 rounded-2xl border ${isDark ? 'bg-[#0d1c2d] border-[#1c2b3c]' : 'bg-white border-slate-200 shadow-sm'
              }`}
          >
            {/* Search Location Input */}
            <div className="relative mb-5">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Search hill, mountain, zone, corridor, earthquake..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className={`w-full pl-9 pr-8 py-2 rounded-xl text-xs sm:text-sm border outline-none font-medium transition-all ${isDark
                  ? 'bg-slate-800/80 text-white border-slate-700 focus:border-emerald-500'
                  : 'bg-slate-50 text-slate-900 border-slate-300 focus:border-emerald-600'
                  }`}
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200 text-xs p-1"
                >
                  ✕
                </button>
              )}
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
                    Past Events ({visibleTrainingEvents.length})
                  </span>
                </label>
              </div>
            </div>

            {/* Section 2: Map Modes & Layers */}
            <div className="pt-4 border-t border-slate-200 dark:border-slate-800 mb-5">

              {/* Map Mode Toggle */}
              <div className="flex items-center gap-2 mb-4 bg-slate-900/30 p-1.5 rounded-lg border border-slate-700/50">
                <button
                  type="button"
                  onClick={() => setMapMode('LIVE')}
                  className={`flex-1 py-1.5 text-xs font-bold rounded-md transition-all ${mapMode === 'LIVE'
                    ? 'bg-cyan-500 text-slate-950 shadow-sm'
                    : 'text-slate-400 hover:text-white'
                    }`}
                >
                  LIVE RISK
                </button>
                <button
                  type="button"
                  onClick={() => setMapMode('HISTORICAL')}
                  className={`flex-1 py-1.5 text-xs font-bold rounded-md transition-all ${mapMode === 'HISTORICAL'
                    ? 'bg-purple-500 text-white shadow-sm'
                    : 'text-slate-400 hover:text-white'
                    }`}
                >
                  HISTORICAL DATA
                </button>
              </div>

              {mapMode === 'HISTORICAL' && (
                <div className="mb-4">
                  <label className="text-[10px] font-bold uppercase text-slate-400 block mb-1">Select Year</label>
                  <select
                    value={selectedYear}
                    onChange={(e) => setSelectedYear(Number(e.target.value))}
                    className="w-full bg-slate-800/80 text-white border border-slate-700 rounded-md py-1.5 text-xs px-2 outline-none"
                  >
                    {[2024, 2023, 2022, 2021, 2020].map(y => (
                      <option key={y} value={y}>{y}</option>
                    ))}
                  </select>
                </div>
              )}

              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3">
                {mapMode === 'LIVE' ? 'Live Layers' : 'Historical Layers'}
              </h3>
              <div className="space-y-2.5">
                {mapMode === 'LIVE' && (
                  <>
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
                        checked={activeLayers.mlHeatmap}
                        onChange={() =>
                          setActiveLayers((p) => ({ ...p, mlHeatmap: !p.mlHeatmap }))
                        }
                        className="w-4 h-4 rounded text-red-500 focus:ring-red-400 cursor-pointer accent-red-500"
                      />
                      <Flame className="w-3.5 h-3.5 text-red-500" />
                      <span>ML Pattern Heatmap ({visibleHeatmapPoints.length})</span>
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

                    <label className="flex items-center gap-2.5 cursor-pointer text-xs font-medium group">
                      <input
                        type="checkbox"
                        checked={activeLayers.earthquakeEvents}
                        onChange={() =>
                          setActiveLayers((p) => ({ ...p, earthquakeEvents: !p.earthquakeEvents }))
                        }
                        className="w-4 h-4 rounded text-orange-500 focus:ring-orange-400 cursor-pointer accent-orange-500"
                      />
                      <span className="w-3.5 h-3.5 rounded-full border-2 border-orange-400 bg-orange-500/30" />
                      <span>Live NCS Earthquakes ({visibleEarthquakes.length})</span>
                    </label>
                  </>
                )}

                {mapMode === 'HISTORICAL' && (
                  <>
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
                      <span>Historical Landslides ({visibleTrainingEvents.length})</span>
                    </label>

                    <label className="flex items-center gap-2.5 cursor-pointer text-xs font-medium group">
                      <input
                        type="checkbox"
                        checked={activeLayers.historicalEarthquakeEvents}
                        onChange={() =>
                          setActiveLayers((p: any) => ({ ...p, historicalEarthquakeEvents: !p.historicalEarthquakeEvents }))
                        }
                        className="w-4 h-4 rounded text-purple-500 focus:ring-purple-400 cursor-pointer accent-purple-500"
                      />
                      <span className="w-3.5 h-3.5 rounded-full border border-purple-400 bg-purple-500/30" />
                      <span>Historical Earthquakes ({visibleHistoricalEarthquakes.length})</span>
                    </label>

                    {/* Historical Earthquake Empty State */}
                    {activeLayers.historicalEarthquakeEvents && visibleHistoricalEarthquakes.length === 0 && (
                      <div className="text-[11px] leading-relaxed text-purple-200/90 bg-purple-950/40 border border-purple-800/50 rounded-lg p-2.5 mt-1 font-sans">
                        No verified historical earthquake records are available for the selected year and region.
                      </div>
                    )}

                    {/* Separate Historical Data from Current ML Risk Overlay */}
                    <div className="pt-2.5 mt-2.5 border-t border-slate-700/50">
                      <label className="flex items-center gap-2.5 cursor-pointer text-xs font-medium group">
                        <input
                          type="checkbox"
                          checked={showCurrentMlOverlay}
                          onChange={(e) => setShowCurrentMlOverlay(e.target.checked)}
                          className="w-4 h-4 rounded text-red-500 focus:ring-red-400 cursor-pointer accent-red-500"
                        />
                        <Flame className="w-3.5 h-3.5 text-red-500" />
                        <span className="font-semibold text-red-400">Overlay Current ML Risk (Extra Trees)</span>
                      </label>
                      <p className="text-[10px] text-slate-400 mt-1 pl-6 leading-tight">
                        Current ML inference model, not historical data.
                      </p>
                    </div>
                  </>
                )}
              </div>
            </div>

            {/* Section 3: Selected Zone Quick Info Card (Screen 3 Mockup) */}
            <div
              className={`p-4 rounded-xl border transition-all ${selectedZone.riskStatus.includes('CRITICAL')
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
                  className={`text-[10px] font-extrabold px-2 py-0.5 rounded-full ${selectedZone.riskStatus.includes('CRITICAL')
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

            {/* Search Results & Quick Switcher List */}
            <div className="mt-4 pt-3 border-t border-slate-200 dark:border-slate-800">
              <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block mb-2">
                {searchQuery ? 'Search Results:' : 'Available Corridors:'}
              </span>
              <div className="max-h-52 overflow-y-auto space-y-3 pr-1">
                {/* Zones */}
                {(unifiedSearchResults.zones.length > 0 || !searchQuery) && (
                  <div className="space-y-1.5">
                    {searchQuery && <div className="text-[10px] text-slate-500 font-bold uppercase pl-1">Risk Zones</div>}
                    {unifiedSearchResults.zones.map((z) => (
                      <button
                        key={z.id}
                        onClick={() => handleSelectZone(z)}
                        className={`w-full text-left p-2 rounded-lg text-xs transition-all flex items-center justify-between ${selectedZone.id === z.id
                          ? 'bg-emerald-600 text-white font-semibold shadow-sm'
                          : isDark
                            ? 'hover:bg-slate-800/80 text-slate-300'
                            : 'hover:bg-slate-100 text-slate-700'
                          }`}
                      >
                        <span className="truncate max-w-[160px]">{z.name}</span>
                        <span
                          className={`text-[9px] px-1.5 py-0.5 rounded ${z.riskStatus.includes('CRITICAL')
                            ? 'bg-red-500/20 text-red-400'
                            : 'bg-amber-500/20 text-amber-400'
                            }`}
                        >
                          {z.riskStatus.includes('CRITICAL') ? 'HIGH' : 'MED'}
                        </span>
                      </button>
                    ))}
                  </div>
                )}

                {/* Hill & Mountain Regions */}
                {searchQuery && unifiedSearchResults.regions.length > 0 && (
                  <div className="space-y-1.5">
                    <div className="text-[10px] text-cyan-400 font-bold uppercase pl-1 flex items-center gap-1">
                      <Mountain className="w-3 h-3" />
                      <span>Hills &amp; Mountain Regions</span>
                    </div>
                    {unifiedSearchResults.regions.map((r) => (
                      <button
                        key={r.id}
                        onClick={() => {
                          setContextRegion(r);
                          if (r.coordinatesVerified && r.latitude !== undefined && r.longitude !== undefined) {
                            setLocalFocusCoords({ latitude: r.latitude, longitude: r.longitude, zoom: 10 });
                            setContextFocusCoordinates({ latitude: r.latitude, longitude: r.longitude, zoom: 10 });
                            showToast(`Focused on ${r.name} (${r.state})`);
                          } else {
                            showToast(`Selected ${r.name} (${r.state}) - coordinates unverified`);
                          }
                        }}
                        className={`w-full text-left p-2 rounded-lg text-xs transition-all flex items-center justify-between ${effectiveHillRegion?.id === r.id
                          ? 'bg-cyan-900/40 text-cyan-200 border border-cyan-500/50 shadow-sm'
                          : isDark
                            ? 'hover:bg-slate-800/80 text-slate-300'
                            : 'hover:bg-slate-100 text-slate-700'
                          }`}
                      >
                        <span className="truncate max-w-[160px] font-medium">{r.name}</span>
                        <span className="text-[9px] px-1.5 py-0.5 rounded bg-cyan-500/20 text-cyan-300">
                          {r.state}
                        </span>
                      </button>
                    ))}
                  </div>
                )}

                {/* Historical Events */}
                {searchQuery && unifiedSearchResults.events.length > 0 && (
                  <div className="space-y-1.5">
                    <div className="text-[10px] text-slate-500 font-bold uppercase pl-1">Historical Landslides</div>
                    {unifiedSearchResults.events.map((e) => (
                      <button
                        key={e.id}
                        onClick={() => {
                          setLocalFocusCoords({ latitude: e.latitude, longitude: e.longitude, zoom: 12 });
                          setContextFocusCoordinates({ latitude: e.latitude, longitude: e.longitude, zoom: 12 });
                          setMapMode('HISTORICAL');
                          setSelectedYear(Number(e.event_date.substring(0, 4)));
                        }}
                        className={`w-full text-left p-2 rounded-lg text-xs transition-all flex items-center justify-between ${isDark ? 'hover:bg-slate-800/80 text-slate-300' : 'hover:bg-slate-100 text-slate-700'
                          }`}
                      >
                        <span className="truncate max-w-[160px]">{e.state} - {e.event_date}</span>
                        <MapPin className="w-3 h-3 text-purple-400" />
                      </button>
                    ))}
                  </div>
                )}

                {/* Earthquakes */}
                {searchQuery && unifiedSearchResults.earthquakes.length > 0 && (
                  <div className="space-y-1.5">
                    <div className="text-[10px] text-slate-500 font-bold uppercase pl-1">Historical Earthquakes</div>
                    {unifiedSearchResults.earthquakes.map((eq) => (
                      <button
                        key={eq.id}
                        onClick={() => {
                          setLocalFocusCoords({ latitude: eq.latitude, longitude: eq.longitude, zoom: 10 });
                          setContextFocusCoordinates({ latitude: eq.latitude, longitude: eq.longitude, zoom: 10 });
                          setMapMode('HISTORICAL');
                          setSelectedYear(new Date(eq.event_time).getFullYear());
                        }}
                        className={`w-full text-left p-2 rounded-lg text-xs transition-all flex items-center justify-between ${isDark ? 'hover:bg-slate-800/80 text-slate-300' : 'hover:bg-slate-100 text-slate-700'
                          }`}
                      >
                        <span className="truncate max-w-[160px]">M{eq.magnitude.toFixed(1)} - {eq.location}</span>
                        <span className="w-2 h-2 rounded-full border border-purple-400 bg-purple-500/30" />
                      </button>
                    ))}
                  </div>
                )}

                {searchQuery &&
                  unifiedSearchResults.zones.length === 0 &&
                  unifiedSearchResults.regions.length === 0 &&
                  unifiedSearchResults.events.length === 0 &&
                  unifiedSearchResults.earthquakes.length === 0 && (
                    <div className="text-center py-4 text-xs text-slate-500">
                      No results found for "{searchQuery}"
                    </div>
                  )}
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Google Earth GIS Map Canvas + Telemetry & Inspector (8 cols) */}
        <div className="lg:col-span-8 space-y-4">
          <div
            className={`border rounded-2xl overflow-hidden relative shadow-lg ${isDark ? 'bg-[#0d1c2d] border-[#1c2b3c]' : 'bg-white border-slate-200'
              }`}
          >
            {/* Map Header Toolbar */}
            <div
              className={`px-4 py-3 border-b flex items-center justify-between gap-2 ${isDark ? 'bg-[#122131]/90 border-[#1c2b3c]' : 'bg-slate-50 border-slate-200'
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
                  className={`text-[11px] font-mono px-2.5 py-1 rounded-lg border transition-all ${is3DMode
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
                  className={`p-1.5 rounded-lg border ${isDark
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
              heatmapPoints={visibleHeatmapPoints}
              earthquakes={visibleEarthquakes}
              historicalEarthquakes={visibleHistoricalEarthquakes}
              earthquakeStatus={earthquakeStatus}
              stressRainfall={stressRainfall}
              activeLayers={activeLayers}
              onToggleLayer={(key) =>
                setActiveLayers((prev: any) => ({ ...prev, [key]: !prev[key] }))
              }
              onShowToast={showToast}
              is3DMode={is3DMode}
              onToggle3D={() => setIs3DMode((previous) => !previous)}
              selectedHillRegion={effectiveHillRegion}
              focusCoordinates={
                contextFocusCoordinates ||
                localFocusCoords ||
                (effectiveHillRegion?.coordinatesVerified &&
                  effectiveHillRegion.latitude !== undefined &&
                  effectiveHillRegion.longitude !== undefined
                  ? {
                    latitude: effectiveHillRegion.latitude,
                    longitude: effectiveHillRegion.longitude,
                    zoom: 10,
                  }
                  : undefined)
              }
            />

            {/* Bottom Status bar under map */}
            <div
              className={`px-4 py-2.5 border-t flex flex-wrap items-center justify-between text-xs gap-2 ${isDark ? 'bg-[#0d1c2d] border-[#1c2b3c] text-slate-400' : 'bg-slate-50 border-slate-200 text-slate-600'
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
            className={`p-5 rounded-2xl border ${isDark ? 'bg-[#0d1c2d] border-[#1c2b3c]' : 'bg-white border-slate-200 shadow-sm'
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
                    (Total: {(zoneMlRisk ? zoneMlRisk.feature_summary.rainfall_3d_mm + stressRainfall : 120 + stressRainfall).toFixed(1)} mm)
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
                  className={`px-3 py-2 rounded-xl text-xs font-semibold border transition-all flex items-center gap-1.5 ${isDark
                    ? 'bg-slate-800 hover:bg-slate-700 text-cyan-400 border-slate-700'
                    : 'bg-slate-100 hover:bg-slate-200 text-slate-800 border-slate-200'
                    }`}
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>Dispatch Drone Recon</span>
                </button>

                <button
                  onClick={handleExportGeoJson}
                  className={`px-3 py-2 rounded-xl text-xs font-semibold border transition-all flex items-center gap-1.5 ${isDark
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
                  onClick={handleStage3Evacuation}
                  disabled={isDispatching}
                  className="group relative isolate flex min-w-[185px] items-center justify-center gap-1.5 overflow-hidden rounded-xl bg-red-600 px-4 py-2 text-xs font-bold text-white shadow-md shadow-red-600/20 transition-all hover:-translate-y-0.5 hover:bg-red-500 hover:shadow-lg hover:shadow-red-600/30 active:translate-y-0 disabled:cursor-wait disabled:opacity-80"
                >
                  <span className={`absolute inset-y-0 left-0 -z-10 bg-red-500/80 transition-all duration-500 ${isDispatching ? 'w-full' : 'w-0 group-hover:w-full'}`} />
                  {isDispatching ? <Loader2 className="h-4 w-4 animate-spin" /> : <ShieldAlert className="h-4 w-4 transition-transform group-hover:rotate-[-8deg]" />}
                  <span>{isDispatching ? 'Opening Dispatch...' : 'Stage 3 Evacuation'}</span>
                  {!isDispatching && <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
