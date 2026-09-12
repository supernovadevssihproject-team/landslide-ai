import React, { useEffect, useMemo, useState } from 'react';
import {
  Activity,
  AlertTriangle,
  ArrowUpDown,
  Clock3,
  ExternalLink,
  Filter,
  Gauge,
  Layers,
  MapPin,
  Mountain,
  Radio,
  RefreshCw,
  Search,
  ShieldAlert,
  ShieldCheck,
  Sparkles,
  TrendingUp,
  TriangleAlert,
  Waves,
  Zap,
} from 'lucide-react';
import { EarthquakeEvent, EarthquakeResponse, HazardZone } from '../types';
import { LandslideApi } from '../services/api';
import { useMapContext } from '../context/MapContext';
import {
  calculateSeismicRiskAssessment,
  evaluateEventMetrics,
  GroundMotionMetrics,
} from '../utils/seismicMetrics';

interface EarthquakeMonitorProps {
  selectedZone: HazardZone;
  theme: 'dark' | 'light';
}

const parseCoordinates = (coordinates: string): [number, number] | undefined => {
  const match = coordinates.match(/(-?\d+(?:\.\d+)?)[^,]*,\s*(-?\d+(?:\.\d+)?)/);
  return match ? [Number(match[1]), Number(match[2])] : undefined;
};

const formatEventTime = (isoTime: string) => {
  const date = new Date(isoTime);
  if (Number.isNaN(date.getTime())) return 'Time unavailable';
  const diffHours = Math.round((Date.now() - date.getTime()) / (1000 * 3600));
  if (diffHours >= 0 && diffHours < 24) {
    return `${diffHours === 0 ? 'Just now' : `${diffHours}h ago`} (${date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })})`;
  }
  return date.toLocaleString([], {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
};

export const EarthquakeMonitor: React.FC<EarthquakeMonitorProps> = ({ selectedZone, theme }) => {
  const isDark = theme === 'dark';
  const { selectedRegion } = useMapContext();

  const [data, setData] = useState<EarthquakeResponse | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [selectedFocusType, setSelectedFocusType] = useState<'region' | 'zone'>('zone');

  // Interactive filters
  const [radiusFilter, setRadiusFilter] = useState<number>(500);
  const [minMagnitude, setMinMagnitude] = useState<number>(0);
  const [sortBy, setSortBy] = useState<'time' | 'magnitude' | 'distance'>('time');
  const [locationSearch, setLocationSearch] = useState('');
  const [expandedEventId, setExpandedEventId] = useState<string | null>(null);

  // Determine active monitoring focal point
  const zoneCoords = useMemo(() => parseCoordinates(selectedZone.coords), [selectedZone.coords]);
  const hasRegionCoords = Boolean(
    selectedRegion?.coordinatesVerified &&
    selectedRegion.latitude !== undefined &&
    selectedRegion.longitude !== undefined
  );

  // Default to region focus if available and verified
  useEffect(() => {
    if (hasRegionCoords) {
      setSelectedFocusType('region');
    } else {
      setSelectedFocusType('zone');
    }
  }, [hasRegionCoords, selectedRegion?.id]);

  const activeFocus = useMemo(() => {
    if (selectedFocusType === 'region' && hasRegionCoords && selectedRegion) {
      return {
        name: selectedRegion.name,
        subtitle: `${selectedRegion.state} • ${selectedRegion.category}`,
        latitude: selectedRegion.latitude!,
        longitude: selectedRegion.longitude!,
        isRegion: true,
      };
    }
    return {
      name: selectedZone.name,
      subtitle: `${selectedZone.corridor} • ${selectedZone.state.toUpperCase()}`,
      latitude: zoneCoords?.[0] ?? 27.53,
      longitude: zoneCoords?.[1] ?? 88.51,
      isRegion: false,
    };
  }, [selectedFocusType, hasRegionCoords, selectedRegion, selectedZone, zoneCoords]);

  const loadEarthquakes = async () => {
    setIsRefreshing(true);
    const response = await LandslideApi.getEarthquakes(activeFocus.latitude, activeFocus.longitude);
    setData(response);
    setIsRefreshing(false);
  };

  useEffect(() => {
    loadEarthquakes();
  }, [activeFocus.latitude, activeFocus.longitude]);

  const rawEvents = data?.events ?? [];

  // Calculate high-precision scientific geotechnical metrics for every event
  const eventsWithMetrics = useMemo(() => {
    return rawEvents.map((event) => {
      const metrics = evaluateEventMetrics(event, activeFocus.latitude, activeFocus.longitude);
      return {
        event,
        metrics,
      };
    });
  }, [rawEvents, activeFocus.latitude, activeFocus.longitude]);

  // Comprehensive aggregate seismic risk assessment
  const riskAssessment = useMemo(() => {
    return calculateSeismicRiskAssessment(rawEvents, activeFocus.latitude, activeFocus.longitude);
  }, [rawEvents, activeFocus.latitude, activeFocus.longitude]);

  // Apply interactive filtering and sorting
  const filteredEvents = useMemo(() => {
    return eventsWithMetrics
      .filter(({ event, metrics }) => {
        if (metrics.epicentralDistanceKm > radiusFilter) return false;
        if (event.magnitude < minMagnitude) return false;
        if (locationSearch.trim()) {
          const q = locationSearch.toLowerCase();
          if (!event.location.toLowerCase().includes(q)) return false;
        }
        return true;
      })
      .sort((a, b) => {
        if (sortBy === 'magnitude') {
          return b.event.magnitude - a.event.magnitude;
        }
        if (sortBy === 'distance') {
          return a.metrics.epicentralDistanceKm - b.metrics.epicentralDistanceKm;
        }
        return new Date(b.event.event_time).getTime() - new Date(a.event.event_time).getTime();
      });
  }, [eventsWithMetrics, radiusFilter, minMagnitude, sortBy, locationSearch]);

  const panelClass = isDark
    ? 'border-[#1c2b3c] bg-[#0d1c2d]/90 backdrop-blur-md'
    : 'border-slate-200 bg-white shadow-sm';
  const mutedClass = isDark ? 'text-slate-400' : 'text-slate-500';

  return (
    <div className={`mx-auto max-w-7xl space-y-5 px-3 pb-16 pt-5 sm:px-6 ${isDark ? 'text-slate-100' : 'text-slate-900'}`}>
      {/* Top Banner with Dynamic Focal Toggle */}
      <section className={`relative overflow-hidden rounded-2xl border p-5 sm:p-7 ${isDark ? 'border-orange-400/25 bg-[radial-gradient(circle_at_85%_10%,rgba(249,115,22,0.18),transparent_40%),linear-gradient(120deg,#0d1c2d,#131b26)] shadow-xl' : 'border-orange-200 bg-[radial-gradient(circle_at_85%_10%,rgba(249,115,22,0.12),transparent_40%),linear-gradient(120deg,#ffffff,#fff7ed)] shadow-sm'}`}>
        <div className="relative flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <div className="mb-2 flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.2em] text-orange-400">
              <span className="h-2 w-2 animate-pulse rounded-full bg-orange-400 shadow-[0_0_8px_rgba(251,146,60,0.8)]" />
              Official NCS Seismic Intelligence • Calibrated Attenuation
            </div>
            <h1 className="text-2xl font-black tracking-tight sm:text-3xl">Earthquake Monitor &amp; Ground Motion</h1>
            <p className={`mt-2 max-w-2xl text-xs sm:text-sm leading-relaxed ${mutedClass}`}>
              Calculates calibrated Peak Ground Acceleration (PGA), Arias Intensity ($I_a$), and Modified Mercalli Intensity (MMI) relative to your selected focal point.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* Focal Point Switcher */}
            {hasRegionCoords && selectedRegion && (
              <div className={`flex items-center rounded-lg border p-0.5 text-xs font-mono ${isDark ? 'border-slate-700 bg-slate-800/80' : 'border-slate-300 bg-slate-100'}`}>
                <button
                  type="button"
                  onClick={() => setSelectedFocusType('region')}
                  className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md transition-all ${selectedFocusType === 'region'
                    ? 'bg-cyan-500 text-slate-950 font-bold shadow'
                    : isDark ? 'text-slate-300 hover:text-white' : 'text-slate-600 hover:text-slate-900'
                    }`}
                >
                  <Mountain className="h-3 w-3" />
                  <span>{selectedRegion.name}</span>
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedFocusType('zone')}
                  className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md transition-all ${selectedFocusType === 'zone'
                    ? 'bg-orange-500 text-white font-bold shadow'
                    : isDark ? 'text-slate-300 hover:text-white' : 'text-slate-600 hover:text-slate-900'
                    }`}
                >
                  <MapPin className="h-3 w-3" />
                  <span>Zone: {selectedZone.name.split('(')[0].trim()}</span>
                </button>
              </div>
            )}

            <span className={`rounded-full border px-3 py-1 text-[11px] font-mono flex items-center gap-1.5 ${data?.source_status === 'available'
              ? 'border-emerald-400/30 bg-emerald-500/10 text-emerald-300'
              : 'border-amber-400/30 bg-amber-500/10 text-amber-300'
              }`}>
              <ShieldCheck className="h-3.5 w-3.5 text-emerald-400" />
              <span>{data?.source_status === 'available' ? 'NCS FEED LIVE' : 'NCS CACHED'}</span>
            </span>

            <button
              type="button"
              onClick={loadEarthquakes}
              disabled={isRefreshing}
              className={`flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-semibold transition-all hover:-translate-y-0.5 disabled:opacity-60 cursor-pointer ${isDark
                ? 'border-slate-700 bg-slate-800 text-slate-200 hover:border-orange-400'
                : 'border-slate-300 bg-white text-slate-700 hover:border-orange-400'
                }`}
            >
              <RefreshCw className={`h-3.5 w-3.5 ${isRefreshing ? 'animate-spin text-orange-400' : ''}`} />
              <span>Refresh</span>
            </button>
          </div>
        </div>
      </section>

      {/* Primary KPI Grid: High Precision Ground Motion & Hazard Metrics */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {/* Metric 1: Peak Ground Acceleration */}
        <div className={`rounded-xl border p-4 transition-all hover:border-cyan-500/40 ${panelClass}`}>
          <div className="flex items-center justify-between">
            <span className={`text-[10px] font-bold uppercase tracking-wider ${mutedClass}`}>Max Est. PGA</span>
            <Gauge className="h-4 w-4 text-cyan-400" />
          </div>
          <div className="mt-2 flex items-baseline gap-1.5">
            <span className="text-2xl font-black font-mono text-cyan-300">
              {riskAssessment.maxPgaG > 0 ? `${(riskAssessment.maxPgaG * 100).toFixed(2)}%` : '--'}
            </span>
            <span className="text-xs font-mono text-slate-400">g</span>
          </div>
          <div className="mt-1 text-[10px] font-mono text-slate-400">
            {riskAssessment.maxPgaG >= 0.1 ? 'CRITICAL SLOPE ACCELERATION' : riskAssessment.maxPgaG >= 0.04 ? 'Moderate Shear Stress' : 'Nominal Background Vibration'}
          </div>
        </div>

        {/* Metric 2: Estimated MMI */}
        <div className={`rounded-xl border p-4 transition-all hover:border-orange-500/40 ${panelClass}`}>
          <div className="flex items-center justify-between">
            <span className={`text-[10px] font-bold uppercase tracking-wider ${mutedClass}`}>Max Instrumental MMI</span>
            <Waves className="h-4 w-4 text-orange-400" />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-black font-mono text-orange-400">
              {riskAssessment.maxMmi}
            </span>
            <span className="text-xs font-semibold text-slate-300 truncate">
              {riskAssessment.dominantMetrics?.estimatedMmi.label ?? 'Imperceptible'}
            </span>
          </div>
          <div className="mt-1 text-[10px] font-mono text-slate-400 truncate">
            {riskAssessment.dominantEvent ? `${riskAssessment.dominantEvent.location}` : 'No recent high-impact events'}
          </div>
        </div>

        {/* Metric 3: Composite Trigger Score */}
        <div className={`rounded-xl border p-4 transition-all ${panelClass} ${riskAssessment.triggerLevel === 'CRITICAL' ? 'border-red-500/50 bg-red-950/20' : riskAssessment.triggerLevel === 'HIGH' ? 'border-orange-500/40' : ''}`}>
          <div className="flex items-center justify-between">
            <span className={`text-[10px] font-bold uppercase tracking-wider ${mutedClass}`}>Seismic Trigger Level</span>
            <ShieldAlert className={`h-4 w-4 ${riskAssessment.triggerLevel === 'CRITICAL' ? 'text-red-400 animate-pulse' : riskAssessment.triggerLevel === 'HIGH' ? 'text-orange-400' : 'text-emerald-400'}`} />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className={`text-2xl font-black font-mono ${riskAssessment.triggerLevel === 'CRITICAL' ? 'text-red-400' : riskAssessment.triggerLevel === 'HIGH' ? 'text-orange-400' : riskAssessment.triggerLevel === 'MODERATE' ? 'text-amber-400' : 'text-emerald-400'}`}>
              {riskAssessment.triggerLevel}
            </span>
            <span className="text-xs font-mono text-slate-400">
              ({Math.round(riskAssessment.compositeTriggerScore * 100)}%)
            </span>
          </div>
          <div className="mt-1 text-[10px] font-mono text-slate-400">
            {riskAssessment.criticalEventsCount > 0 ? `${riskAssessment.criticalEventsCount} destabilizing events` : 'Stable ground motion buffer'}
          </div>
        </div>

        {/* Metric 4: Focal Observation Center */}
        <div className={`rounded-xl border p-4 transition-all hover:border-emerald-500/40 ${panelClass}`}>
          <div className="flex items-center justify-between">
            <span className={`text-[10px] font-bold uppercase tracking-wider ${mutedClass}`}>Focal Proximity</span>
            <MapPin className="h-4 w-4 text-emerald-400" />
          </div>
          <div className="mt-2 flex items-baseline gap-1.5 truncate">
            <span className="text-2xl font-black font-mono text-emerald-300">
              {riskAssessment.nearestEventDistanceKm !== null ? `${riskAssessment.nearestEventDistanceKm}` : '--'}
            </span>
            <span className="text-xs font-mono text-slate-400">km nearest</span>
          </div>
          <div className="mt-1 text-[10px] font-mono text-slate-400 truncate">
            Center: {activeFocus.name}
          </div>
        </div>
      </div>

      {/* Interactive Control Filter Strip */}
      <div className={`p-4 rounded-xl border flex flex-wrap items-center justify-between gap-3 ${panelClass}`}>
        <div className="flex flex-wrap items-center gap-3">
          {/* Location Filter Input */}
          <div className="relative min-w-[200px]">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Filter location / epicenter..."
              value={locationSearch}
              onChange={(e) => setLocationSearch(e.target.value)}
              className={`w-full pl-8 pr-3 py-1.5 rounded-lg text-xs border outline-none font-mono ${isDark
                ? 'bg-slate-800/90 text-white border-slate-700 focus:border-orange-500'
                : 'bg-slate-50 text-slate-900 border-slate-300 focus:border-orange-500'
                }`}
            />
          </div>

          {/* Radius Selector */}
          <div className="flex items-center gap-1.5 text-xs font-mono">
            <span className={mutedClass}>Radius:</span>
            {[100, 250, 500].map((r) => (
              <button
                key={r}
                type="button"
                onClick={() => setRadiusFilter(r)}
                className={`px-2 py-1 rounded text-[11px] font-bold transition-all cursor-pointer ${radiusFilter === r
                  ? 'bg-orange-500 text-white shadow'
                  : isDark ? 'bg-slate-800 text-slate-300 hover:text-white' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                  }`}
              >
                {r}km
              </button>
            ))}
          </div>

          {/* Magnitude Filter */}
          <div className="flex items-center gap-1.5 text-xs font-mono">
            <span className={mutedClass}>Min M:</span>
            {[0, 3.0, 4.0, 5.0].map((m) => (
              <button
                key={m}
                type="button"
                onClick={() => setMinMagnitude(m)}
                className={`px-2 py-1 rounded text-[11px] font-bold transition-all cursor-pointer ${minMagnitude === m
                  ? 'bg-cyan-600 text-white shadow'
                  : isDark ? 'bg-slate-800 text-slate-300 hover:text-white' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                  }`}
              >
                {m === 0 ? 'All' : `M${m.toFixed(1)}+`}
              </button>
            ))}
          </div>
        </div>

        {/* Sort Selector */}
        <div className="flex items-center gap-1.5 text-xs font-mono">
          <ArrowUpDown className="w-3.5 h-3.5 text-slate-400" />
          <span className={mutedClass}>Sort:</span>
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as any)}
            className={`px-2.5 py-1 rounded-lg text-xs font-mono border outline-none cursor-pointer ${isDark
              ? 'bg-slate-800 text-white border-slate-700'
              : 'bg-slate-50 text-slate-900 border-slate-300'
              }`}
          >
            <option value="time">Most Recent</option>
            <option value="magnitude">Highest Magnitude</option>
            <option value="distance">Closest to Focus</option>
          </select>
        </div>
      </div>

      {/* Main Events Catalogue with Expanded Geotechnical Breakdown */}
      <section className={`rounded-2xl border overflow-hidden ${panelClass}`}>
        <div className="flex flex-col gap-3 border-b border-inherit p-5 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="flex items-center gap-2 text-base font-bold">
              <Radio className="h-4 w-4 text-orange-400 animate-pulse" />
              <span>Seismic Events Catalogue ({filteredEvents.length} in view)</span>
            </h2>
            <p className={`mt-1 text-xs ${mutedClass}`}>
              Calculated ground motion metrics relative to {activeFocus.name} ({activeFocus.latitude.toFixed(3)}° N, {activeFocus.longitude.toFixed(3)}° E)
            </p>
          </div>
          <a
            className="flex items-center gap-1.5 text-xs font-semibold text-orange-400 hover:text-orange-300 transition-colors"
            href={data?.source_url ?? 'https://seismo.gov.in/'}
            target="_blank"
            rel="noreferrer"
          >
            <span>Official NCS Portal</span>
            <ExternalLink className="h-3.5 w-3.5" />
          </a>
        </div>

        {data?.earthquake_data_available === false ? (
          <div className={`flex items-center gap-3 p-8 text-sm ${mutedClass}`}>
            <TriangleAlert className="h-5 w-5 text-amber-400 shrink-0" />
            <span>Live earthquake data is temporarily unavailable from the National Center for Seismology. Telemetry will automatically reconnect.</span>
          </div>
        ) : filteredEvents.length === 0 ? (
          <div className={`p-12 text-center text-sm ${mutedClass}`}>
            No seismic events match the current filter criteria within {radiusFilter} km of {activeFocus.name}.
          </div>
        ) : (
          <div className="divide-y divide-slate-200/10">
            {filteredEvents.map(({ event, metrics }) => {
              const isExpanded = expandedEventId === event.id;
              return (
                <div
                  key={event.id}
                  className={`p-4 transition-colors cursor-pointer ${isDark ? 'hover:bg-slate-800/40' : 'hover:bg-slate-50'} ${isExpanded ? (isDark ? 'bg-slate-800/30' : 'bg-slate-50/80') : ''}`}
                  onClick={() => setExpandedEventId(isExpanded ? null : event.id)}
                >
                  <div className="grid grid-cols-[auto_1fr] gap-4 sm:grid-cols-[68px_1fr_auto] sm:items-center">
                    {/* Magnitude Badge */}
                    <div className={`flex h-14 w-14 items-center justify-center rounded-2xl border-2 font-black font-mono text-lg shadow-md ${event.magnitude >= 5.0
                      ? 'border-red-500 bg-red-500/20 text-red-300 shadow-[0_0_15px_rgba(239,68,68,0.3)]'
                      : event.magnitude >= 4.0
                      ? 'border-orange-400 bg-orange-500/15 text-orange-300'
                      : 'border-cyan-500/50 bg-cyan-500/10 text-cyan-300'
                      }`}>
                      {event.magnitude.toFixed(1)}
                    </div>

                    {/* Epicenter Details */}
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-sm font-bold truncate max-w-md">{event.location}</span>
                        <span className={`text-[10px] font-mono px-2 py-0.5 rounded-full border ${metrics.estimatedMmi.color}`}>
                          MMI {metrics.estimatedMmi.roman} • {metrics.estimatedMmi.label}
                        </span>
                        {metrics.triggerCategory === 'HIGH' || metrics.triggerCategory === 'CRITICAL' ? (
                          <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-red-500/20 text-red-300 border border-red-500/30 font-bold uppercase animate-pulse">
                            {metrics.triggerCategory} RISK
                          </span>
                        ) : null}
                      </div>

                      <div className={`mt-1.5 flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] font-mono ${mutedClass}`}>
                        <span>Dist: <strong className="text-cyan-300 font-bold">{metrics.epicentralDistanceKm} km</strong></span>
                        <span>Hypocentral: {metrics.hypocentralDistanceKm} km</span>
                        <span>Depth: {event.depth_km.toFixed(0)} km</span>
                        <span>Est. PGA: <strong className="text-amber-300">{(metrics.estimatedPgaG * 100).toFixed(2)}%g</strong></span>
                        <span>Status: <strong className="capitalize text-slate-300">{event.status}</strong></span>
                      </div>
                    </div>

                    {/* Timestamp & Action */}
                    <div className="col-start-2 flex items-center justify-between sm:col-start-auto sm:flex-col sm:items-end gap-1 text-[11px] font-mono">
                      <span className={`flex items-center gap-1 ${mutedClass}`}>
                        <Clock3 className="h-3 w-3 text-orange-400" />
                        {formatEventTime(event.event_time)}
                      </span>
                      <span className="text-[10px] text-cyan-400 underline">
                        {isExpanded ? 'Hide Physics Metrics ▲' : 'Ground Motion Physics ▼'}
                      </span>
                    </div>
                  </div>

                  {/* Expandable Scientific Breakdown Card */}
                  {isExpanded && (
                    <div className={`mt-4 p-4 rounded-xl border text-xs font-mono space-y-3 ${isDark ? 'bg-[#06121f] border-cyan-900/60' : 'bg-slate-100 border-slate-200'}`}>
                      <div className="flex items-center justify-between border-b border-inherit pb-2">
                        <span className="font-bold text-cyan-400 flex items-center gap-1.5">
                          <Sparkles className="w-3.5 h-3.5" />
                          Geotechnical Attenuation &amp; Slope Destabilization Physics
                        </span>
                        <span className="text-[10px] text-slate-400">
                          Formula: GMPE (Himalayan Belt) • Keefer Criteria
                        </span>
                      </div>

                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-[11px]">
                        <div className={`p-2.5 rounded-lg border ${isDark ? 'border-slate-800 bg-slate-900/60' : 'border-slate-200 bg-white'}`}>
                          <span className="text-[10px] text-slate-400 block uppercase">Peak Ground Acceleration</span>
                          <span className="text-base font-bold text-cyan-300">{(metrics.estimatedPgaG * 100).toFixed(3)}% g</span>
                          <span className="text-[9px] text-slate-400 block mt-0.5">({(metrics.estimatedPgaG * 9.81).toFixed(2)} m/s²)</span>
                        </div>

                        <div className={`p-2.5 rounded-lg border ${isDark ? 'border-slate-800 bg-slate-900/60' : 'border-slate-200 bg-white'}`}>
                          <span className="text-[10px] text-slate-400 block uppercase">Arias Intensity ($I_a$)</span>
                          <span className="text-base font-bold text-amber-300">{metrics.ariasIntensityMs.toFixed(4)} m/s</span>
                          <span className={`text-[9px] block mt-0.5 font-bold ${metrics.exceedsKeeferLandslideThreshold ? 'text-red-400' : 'text-emerald-400'}`}>
                            {metrics.exceedsKeeferLandslideThreshold ? 'Exceeds 0.11 m/s Failure Limit' : 'Below 0.11 m/s Trigger Limit'}
                          </span>
                        </div>

                        <div className={`p-2.5 rounded-lg border ${isDark ? 'border-slate-800 bg-slate-900/60' : 'border-slate-200 bg-white'}`}>
                          <span className="text-[10px] text-slate-400 block uppercase">Shaking Intensity</span>
                          <span className="text-base font-bold text-orange-400">MMI {metrics.estimatedMmi.roman}</span>
                          <span className="text-[9px] text-slate-400 block mt-0.5">{metrics.estimatedMmi.label}</span>
                        </div>

                        <div className={`p-2.5 rounded-lg border ${isDark ? 'border-slate-800 bg-slate-900/60' : 'border-slate-200 bg-white'}`}>
                          <span className="text-[10px] text-slate-400 block uppercase">Destabilization Index</span>
                          <span className={`text-base font-bold ${metrics.destabilizationIndex >= 0.4 ? 'text-red-400' : metrics.destabilizationIndex >= 0.2 ? 'text-amber-400' : 'text-emerald-400'}`}>
                            {(metrics.destabilizationIndex * 100).toFixed(1)}%
                          </span>
                          <span className="text-[9px] text-slate-400 block mt-0.5">Decay weight: {metrics.timeDecayWeight} ({metrics.eventAgeHours}h old)</span>
                        </div>
                      </div>

                      <div className={`p-2.5 rounded-lg border text-[11px] leading-relaxed ${isDark ? 'border-slate-800 bg-slate-950/60 text-slate-300' : 'border-slate-200 bg-white text-slate-700'}`}>
                        <strong>Geotechnical Advisory:</strong> {metrics.estimatedMmi.description} Hypocentral path distance of {metrics.hypocentralDistanceKm} km dissipates high-frequency shear waves, but saturated slopes with pore pressure &gt; 180 kPa require heightened surveillance.
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
};
