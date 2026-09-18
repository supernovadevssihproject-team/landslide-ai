import React, { useEffect, useMemo, useState } from 'react';
import {
  Activity,
  ChevronDown,
  CloudRain,
  Droplets,
  ExternalLink,
  Loader2,
  Mountain,
  Search,
  ShieldCheck,
  Thermometer,
  TriangleAlert,
  Wind,
} from 'lucide-react';
import {
  HILLS_AND_MOUNTAIN_REGIONS,
  HillsRegion,
  calculateHaversineDistanceKm,
} from '../data/hillsData';
import { LandslideApi, LiveWeather } from '../services/api';
import { EarthquakeResponse, LocationRiskEvaluation } from '../types';
import { useMapContext } from '../context/MapContext';
import { evaluateEventMetrics } from '../utils/seismicMetrics';
import { fetchLocationRisk } from '../services/locationRiskService';
import { MlRiskScoreCard } from './MlRiskScoreCard';
import { useI18n } from '../i18n/index.tsx';

interface HillsMountainRegionsProps {
  theme?: 'dark' | 'light';
  selectedRegion?: HillsRegion | null;
  onSelectRegion?: (region: HillsRegion) => void;
  onNavigateToMap?: (region: HillsRegion) => void;
}

const WEATHER_STATE_BY_REGION: Record<string, string> = {
  'Arunachal Pradesh': 'arunachal',
  Assam: 'assam',
  Meghalaya: 'meghalaya',
  Nagaland: 'nagaland',
  Manipur: 'manipur',
  Mizoram: 'mizoram',
  Tripura: 'tripura',
  Sikkim: 'sikkim',
};

const weatherDescription = (code: number | null, t: (key: string) => string) => {
  if (code === null || code === undefined) return t('hills.forecast.unavailable');
  if (code === 0) return t('hills.forecast.clearSky');
  if (code <= 3) return t('hills.forecast.partlyCloudy');
  if (code <= 48) return t('hills.forecast.foggy');
  if (code <= 67) return t('hills.forecast.rainExpected');
  if (code <= 77) return t('hills.forecast.snowOrIce');
  if (code <= 82) return t('hills.forecast.rainShowers');
  return t('hills.forecast.stormRisk');
};

export const HillsMountainRegions: React.FC<HillsMountainRegionsProps> = ({
  theme = 'dark',
  selectedRegion: propSelectedRegion = null,
  onSelectRegion,
  onNavigateToMap,
}) => {
  const { t } = useI18n();
  const isDark = theme === 'dark';
  const {
    selectedRegion: contextRegion,
    setSelectedRegion: setContextRegion,
    setFocusCoordinates,
  } = useMapContext();

  const selectedRegion = propSelectedRegion !== undefined && propSelectedRegion !== null
    ? propSelectedRegion
    : (contextRegion ?? null);

  const [searchQuery, setSearchQuery] = useState('');
  const [collapsedStates, setCollapsedStates] = useState<Record<string, boolean>>({});
  const [weather, setWeather] = useState<LiveWeather | null>(null);
  const [weatherLoading, setWeatherLoading] = useState(false);
  const [earthquakeData, setEarthquakeData] = useState<EarthquakeResponse | null>(null);
  const [earthquakeLoading, setEarthquakeLoading] = useState(false);
  const [riskEvaluation, setRiskEvaluation] = useState<LocationRiskEvaluation | null>(null);
  const [isEvaluatingRisk, setIsEvaluatingRisk] = useState(false);

  const normalizedSearch = searchQuery.trim().toLowerCase();
  const groupedRegions = useMemo(() => {
    const groups = new Map<string, HillsRegion[]>();
    HILLS_AND_MOUNTAIN_REGIONS.forEach((region) => {
      if (
        normalizedSearch &&
        !region.name.toLowerCase().includes(normalizedSearch) &&
        !region.state.toLowerCase().includes(normalizedSearch)
      ) {
        return;
      }
      const current = groups.get(region.state) ?? [];
      current.push(region);
      groups.set(region.state, current);
    });
    return Array.from(groups.entries());
  }, [normalizedSearch]);

  const toggleState = (state: string) => {
    setCollapsedStates((previous) => ({
      ...previous,
      [state]: !previous[state],
    }));
  };

  const panelClass = isDark
    ? 'border-[#263b50] bg-[#132131] text-slate-100'
    : 'border-slate-200 bg-white text-slate-900 shadow-sm';
  const mutedTextClass = isDark ? 'text-slate-400' : 'text-slate-600';

  const handleSelectRegion = (region: HillsRegion) => {
    setContextRegion(region);
    if (region.coordinatesVerified && region.latitude !== undefined && region.longitude !== undefined) {
      setFocusCoordinates({
        latitude: region.latitude,
        longitude: region.longitude,
        zoom: 10,
      });
    }
    onSelectRegion?.(region);
  };

  // Region-Specific Live Weather Fetch with Cancellation and Race-Condition Prevention
  useEffect(() => {
    let active = true;
    if (!selectedRegion) {
      setWeather(null);
      return () => {
        active = false;
      };
    }

    setWeatherLoading(true);
    const weatherState = WEATHER_STATE_BY_REGION[selectedRegion.state] ?? selectedRegion.state.toLowerCase();
    const lat = selectedRegion.coordinatesVerified ? selectedRegion.latitude : undefined;
    const lon = selectedRegion.coordinatesVerified ? selectedRegion.longitude : undefined;

    LandslideApi.getLiveWeather({
      latitude: lat,
      longitude: lon,
      state: weatherState,
      regionName: selectedRegion.name,
    })
      .then((data) => {
        if (active) setWeather(data);
      })
      .catch((err) => {
        console.warn(`Weather query failed for ${selectedRegion.name}:`, err);
        if (active) {
          setWeather({
            source: 'Meteorological Data Temporarily Unavailable',
            station_name: `${selectedRegion.name} Station`,
            district: selectedRegion.state,
            state: selectedRegion.state,
            latitude: lat ?? 0,
            longitude: lon ?? 0,
            current_temperature_c: 0,
            relative_humidity_pct: 0,
            current_rainfall_mm_hr: 0,
            antecedent_72h_rainfall_mm: 0,
            soil_saturation_pct: 0,
            wind_speed_kmh: 0,
            radar_status: 'OFFLINE',
            bhuvan_satellite_tile: '',
            is_live_feed: false,
            last_updated: 'Unavailable',
            forecast: [],
          });
        }
      })
      .finally(() => {
        if (active) setWeatherLoading(false);
      });

    return () => {
      active = false;
    };
  }, [
    selectedRegion?.id,
    selectedRegion?.latitude,
    selectedRegion?.longitude,
    selectedRegion?.state,
    selectedRegion?.coordinatesVerified,
  ]);

  useEffect(() => {
    let active = true;
    if (!selectedRegion) {
      setEarthquakeData(null);
      return () => {
        active = false;
      };
    }

    setEarthquakeLoading(true);
    const lat = selectedRegion.coordinatesVerified ? selectedRegion.latitude : undefined;
    const lon = selectedRegion.coordinatesVerified ? selectedRegion.longitude : undefined;

    LandslideApi.getEarthquakes(lat, lon)
      .then((response) => {
        if (active) setEarthquakeData(response);
      })
      .catch(() => {
        if (active) {
          setEarthquakeData({
            earthquake_data_available: false,
            source_status: 'temporarily_unavailable',
            source: 'National Center for Seismology',
            source_url: 'https://seismo.gov.in/',
            events: [],
            earthquake_trigger_score: 0,
            message: 'Live earthquake data is temporarily unavailable.',
          });
        }
      })
      .finally(() => {
        if (active) setEarthquakeLoading(false);
      });

    return () => {
      active = false;
    };
  }, [
    selectedRegion?.id,
    selectedRegion?.coordinatesVerified,
    selectedRegion?.latitude,
    selectedRegion?.longitude,
  ]);

  const latestEarthquake = useMemo(() => {
    return earthquakeData?.events && earthquakeData.events.length > 0
      ? earthquakeData.events[0]
      : null;
  }, [earthquakeData]);

  const latestDistanceKm = useMemo(() => {
    if (
      !selectedRegion?.coordinatesVerified ||
      selectedRegion.latitude === undefined ||
      selectedRegion.longitude === undefined ||
      !latestEarthquake ||
      !Number.isFinite(latestEarthquake.latitude) ||
      !Number.isFinite(latestEarthquake.longitude)
    ) {
      return null;
    }
    const dist = calculateHaversineDistanceKm(
      selectedRegion.latitude,
      selectedRegion.longitude,
      latestEarthquake.latitude,
      latestEarthquake.longitude
    );
    return Number.isFinite(dist) ? Math.round(dist) : null;
  }, [selectedRegion, latestEarthquake]);

  const latestSeismicMetrics = useMemo(() => {
    if (
      !selectedRegion?.coordinatesVerified ||
      selectedRegion.latitude === undefined ||
      selectedRegion.longitude === undefined ||
      !latestEarthquake ||
      !Number.isFinite(latestEarthquake.latitude) ||
      !Number.isFinite(latestEarthquake.longitude)
    ) {
      return null;
    }
    return evaluateEventMetrics(
      latestEarthquake,
      selectedRegion.latitude,
      selectedRegion.longitude
    );
  }, [selectedRegion, latestEarthquake]);

  const recentCounts = useMemo(() => {
    if (!earthquakeData?.events) return { last24h: 0, last7d: 0 };
    const now = Date.now();
    const h24 = 24 * 60 * 60 * 1000;
    const d7 = 7 * 24 * 60 * 60 * 1000;
    let last24h = 0;
    let last7d = 0;
    for (const ev of earthquakeData.events) {
      const t = new Date(ev.event_time).getTime();
      if (!Number.isNaN(t)) {
        const diff = now - t;
        if (diff >= 0 && diff <= h24) last24h++;
        if (diff >= 0 && diff <= d7) last7d++;
      }
    }
    return { last24h, last7d };
  }, [earthquakeData?.events]);

  const derivedTrigger = useMemo(() => {
    if (!earthquakeData) {
      return {
        level: 'LOW' as const,
        label: t('hills.triggerLow'),
        badgeClass: 'border-emerald-500/30 bg-emerald-500/10 text-emerald-300',
      };
    }
    const score = earthquakeData.earthquake_trigger_score ?? 0;
    if (
      score >= 0.5 ||
      (latestDistanceKm !== null &&
        latestDistanceKm <= 100 &&
        (latestEarthquake?.magnitude ?? 0) >= 4.5)
    ) {
      return {
        level: 'HIGH' as const,
        label: t('hills.triggerHigh'),
        badgeClass: 'border-red-500/40 bg-red-500/15 text-red-300 animate-pulse',
      };
    }
    if (
      score >= 0.25 ||
      (latestDistanceKm !== null &&
        latestDistanceKm <= 250 &&
        (latestEarthquake?.magnitude ?? 0) >= 3.8)
    ) {
      return {
        level: 'MODERATE' as const,
        label: t('hills.triggerModerate'),
        badgeClass: 'border-amber-500/40 bg-amber-500/15 text-amber-300',
      };
    }
    return {
      level: 'LOW' as const,
      label: t('hills.triggerLow'),
      badgeClass: 'border-emerald-500/30 bg-emerald-500/10 text-emerald-300',
    };
  }, [earthquakeData, latestDistanceKm, latestEarthquake, t]);

  // Fetch ML Location Risk Score safely
  useEffect(() => {
    let active = true;

    // Reset stale risk state when switching hills or clearing selection
    setRiskEvaluation(null);

    // Ensure it cannot execute with no selected hill or missing/unverified coordinates
    if (
      !selectedRegion ||
      selectedRegion.latitude === undefined ||
      selectedRegion.longitude === undefined ||
      !selectedRegion.coordinatesVerified ||
      !Number.isFinite(selectedRegion.latitude) ||
      !Number.isFinite(selectedRegion.longitude)
    ) {
      setIsEvaluatingRisk(false);
      return () => {
        active = false;
      };
    }

    setIsEvaluatingRisk(true);

    fetchLocationRisk({
      name: selectedRegion.name || 'Selected Hill Region',
      locationType: 'hill',
      latitude: selectedRegion.latitude,
      longitude: selectedRegion.longitude,
      state: selectedRegion.state || 'NER',
      slope: 35, // default slope for hill regions
      extraRainfall: 0.0, // Live meteorological precipitation is fetched automatically by location coordinates
    })
      .then((res) => {
        if (active) {
          setRiskEvaluation(res);
        }
      })
      .catch((err) => {
        console.warn('Failed to evaluate location risk:', err);
        if (active) {
          setRiskEvaluation(null);
        }
      })
      .finally(() => {
        if (active) {
          setIsEvaluatingRisk(false);
        }
      });

    return () => {
      active = false;
    };
  }, [
    selectedRegion?.id,
    selectedRegion?.latitude,
    selectedRegion?.longitude,
    selectedRegion?.coordinatesVerified,
    selectedRegion?.name,
    selectedRegion?.state,
    weather?.antecedent_72h_rainfall_mm,
    weather?.soil_saturation_pct,
    latestEarthquake?.magnitude,
    latestDistanceKm,
  ]);

  const formatEventTime = (isoTime: string) => {
    const d = new Date(isoTime);
    if (Number.isNaN(d.getTime())) return isoTime || t('hills.timeUnavailable');
    const diffHours = Math.round((Date.now() - d.getTime()) / (1000 * 3600));
    if (diffHours >= 0 && diffHours < 24) {
      return `${diffHours === 0 ? t('hills.justNow') : `${diffHours}${t('hills.hAgo')}`} (${d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })})`;
    }
    return d.toLocaleDateString([], {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <div className="mx-auto max-w-7xl px-3 pb-12 pt-4 sm:px-6">
      <section className={`overflow-hidden rounded-2xl border ${panelClass}`}>
        <div
          className={`border-b px-5 py-6 sm:px-7 ${
            isDark
              ? 'border-[#263b50] bg-[#101b29]'
              : 'border-slate-200 bg-slate-50'
          }`}
        >
          <div className="flex flex-col gap-5 md:flex-row md:items-end md:justify-between">
            <div>
              <div className="mb-2 flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.2em] text-cyan-400">
                <Mountain className="h-4 w-4" />
                {t('hills.terrainReference')}
              </div>
              <h1 className="text-2xl font-black tracking-tight sm:text-3xl">
                {t('hills.title')}
              </h1>
              <p className={`mt-2 max-w-2xl text-sm leading-6 ${mutedTextClass}`}>
                {t('hills.subtitle')}
              </p>
            </div>
            <div className="shrink-0 rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-3 py-2 text-[10px] font-mono text-emerald-300">
              {HILLS_AND_MOUNTAIN_REGIONS.length} {t('hills.referenceRegions')}
            </div>
          </div>
        </div>

        <div className="grid gap-5 p-4 sm:p-6 lg:grid-cols-[minmax(0,1fr)_300px]">
          <div>
            <div className="relative mb-5">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                type="search"
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.target.value)}
                placeholder={t('hills.searchPlaceholder')}
                aria-label={t('hills.searchAriaLabel')}
                className={`w-full rounded-xl border py-3 pl-10 pr-3 text-sm outline-none transition-all focus:border-cyan-400 ${
                  isDark
                    ? 'border-slate-700 bg-slate-900/70 text-white'
                    : 'border-slate-300 bg-slate-50 text-slate-900'
                }`}
              />
            </div>

            <div className="space-y-3">
              {groupedRegions.length === 0 && (
                <div className={`rounded-xl border border-dashed p-6 text-center text-sm ${mutedTextClass}`}>
                  {t('hills.noMatch')}
                </div>
              )}
              {groupedRegions.map(([state, regions]) => {
                const isCollapsed = collapsedStates[state];
                return (
                  <section
                    key={state}
                    className={`overflow-hidden rounded-xl border ${
                      isDark ? 'border-slate-700 bg-slate-900/40' : 'border-slate-200 bg-slate-50'
                    }`}
                  >
                    <button
                      type="button"
                      onClick={() => toggleState(state)}
                      aria-expanded={!isCollapsed}
                      className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left text-sm font-bold transition-colors hover:bg-cyan-500/10"
                    >
                      <span>{state}</span>
                      <span className="flex items-center gap-2 text-[10px] font-mono text-slate-400">
                        {regions.length} {t('hills.regionsCount')}
                        <ChevronDown className={`h-4 w-4 transition-transform ${isCollapsed ? '-rotate-90' : ''}`} />
                      </span>
                    </button>
                    {!isCollapsed && (
                      <div className={`grid gap-2 border-t p-3 sm:grid-cols-2 ${isDark ? 'border-slate-700' : 'border-slate-200'}`}>
                        {regions.map((region) => {
                          const selected = selectedRegion?.id === region.id;
                          return (
                            <button
                              type="button"
                              key={region.id}
                              onClick={() => handleSelectRegion(region)}
                              className={`rounded-lg border px-3 py-3 text-left transition-all ${
                                selected
                                  ? 'border-cyan-400 bg-cyan-500/15 text-cyan-100 shadow-md shadow-cyan-950/30'
                                  : isDark
                                  ? 'border-slate-800 bg-slate-950/30 text-slate-300 hover:border-cyan-500/50 hover:text-white'
                                  : 'border-slate-200 bg-white text-slate-700 hover:border-cyan-400 hover:text-slate-900'
                              }`}
                            >
                              <div className="flex items-start justify-between gap-3">
                                <span className="text-sm font-semibold">{region.name}</span>
                                {selected && <ShieldCheck className="h-4 w-4 shrink-0 text-cyan-300" />}
                              </div>
                              <span className={`mt-1 block text-[10px] font-mono uppercase tracking-wider ${mutedTextClass}`}>
                                {t(`hills.category.${region.category}`, region.category)}
                              </span>
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </section>
                );
              })}
            </div>
          </div>

          <aside className={`h-fit rounded-xl border p-5 ${isDark ? 'border-cyan-400/20 bg-[#0d1c2d]' : 'border-cyan-200 bg-cyan-50/50'}`}>
            <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-cyan-400">
              <Mountain className="h-4 w-4" />
              {t('hills.regionSelection')}
            </div>
            {selectedRegion ? (
              <div className="mt-5">
                <h2 className="text-xl font-black">{selectedRegion.name}</h2>
                <p className={`mt-1 text-sm ${mutedTextClass}`}>{selectedRegion.state}</p>
                <div className={`mt-4 rounded-lg border p-3 text-xs leading-5 ${
                  selectedRegion.coordinatesVerified
                    ? 'border-emerald-400/25 bg-emerald-400/10 text-emerald-200'
                    : 'border-amber-400/25 bg-amber-400/10 text-amber-200'
                }`}>
                  <div>
                    {selectedRegion.coordinatesVerified
                      ? t('hills.verifiedCoords')
                      : t('hills.unverifiedCoords')}
                  </div>
                  {selectedRegion.source?.name && (
                    <div className="mt-1.5 flex flex-wrap items-center gap-1 text-[10px] font-mono opacity-85">
                      <span className="text-slate-400">{t('hills.source')}</span>
                      {selectedRegion.source.url ? (
                        <a
                          href={selectedRegion.source.url}
                          target="_blank"
                          rel="noreferrer"
                          onClick={(e) => e.stopPropagation()}
                          className="inline-flex items-center gap-1 text-cyan-300 underline hover:text-cyan-200"
                        >
                          <span>{selectedRegion.source.name}</span>
                          <ExternalLink className="h-2.5 w-2.5" />
                        </a>
                      ) : (
                        <span>{selectedRegion.source.name}</span>
                      )}
                    </div>
                  )}
                </div>
                {onNavigateToMap && (
                  <button
                    type="button"
                    onClick={() => onNavigateToMap(selectedRegion)}
                    className="mt-4 w-full rounded-lg border border-emerald-400/40 bg-emerald-500/15 px-3 py-2.5 text-sm font-bold text-emerald-200 transition-colors hover:bg-emerald-500/25 focus:outline-none focus:ring-2 focus:ring-emerald-400/60"
                  >
                    {t('hills.viewRiskMap')}
                  </button>
                )}

                <div className={`mt-5 border-t pt-5 ${isDark ? 'border-slate-700' : 'border-slate-200'}`}>
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-cyan-400">
                      <CloudRain className="h-4 w-4" />
                      {t('hills.liveWeatherCoverage')}
                    </div>
                    {weatherLoading && <Loader2 className="h-4 w-4 animate-spin text-cyan-300" />}
                  </div>

                  {weather && (
                    <>
                      <div className={`mt-3 text-[10px] font-mono ${mutedTextClass}`}>
                        {weather.station_name} • {weather.district}
                      </div>
                      <div className={`mt-1 text-[10px] font-mono ${mutedTextClass}`}>
                        {t('hills.station')} {weather.latitude.toFixed(2)}° N, {weather.longitude.toFixed(2)}° E • {weather.is_live_feed ? t('hills.live') : t('hills.cached')}
                      </div>

                      <div className="mt-4 grid grid-cols-2 gap-2 text-xs">
                        <div className={`rounded-lg border p-2 ${isDark ? 'border-slate-700 bg-slate-950/30' : 'border-slate-200 bg-white'}`}>
                          <Thermometer className="h-3.5 w-3.5 text-orange-400" />
                          <div className="mt-1 font-bold">{weather.current_temperature_c.toFixed(1)}°C</div>
                          <div className={mutedTextClass}>{t('hills.current')}</div>
                        </div>
                        <div className={`rounded-lg border p-2 ${isDark ? 'border-slate-700 bg-slate-950/30' : 'border-slate-200 bg-white'}`}>
                          <Droplets className="h-3.5 w-3.5 text-cyan-400" />
                          <div className="mt-1 font-bold">{weather.relative_humidity_pct.toFixed(0)}%</div>
                          <div className={mutedTextClass}>{t('hills.humidity')}</div>
                        </div>
                        <div className={`rounded-lg border p-2 ${isDark ? 'border-slate-700 bg-slate-950/30' : 'border-slate-200 bg-white'}`}>
                          <CloudRain className="h-3.5 w-3.5 text-blue-400" />
                          <div className="mt-1 font-bold">{weather.current_rainfall_mm_hr.toFixed(1)} mm/h</div>
                          <div className={mutedTextClass}>{t('hills.rainNow')}</div>
                        </div>
                        <div className={`rounded-lg border p-2 ${isDark ? 'border-slate-700 bg-slate-950/30' : 'border-slate-200 bg-white'}`}>
                          <Wind className="h-3.5 w-3.5 text-emerald-400" />
                          <div className="mt-1 font-bold">{weather.wind_speed_kmh.toFixed(1)} km/h</div>
                          <div className={mutedTextClass}>{t('hills.wind')}</div>
                        </div>
                      </div>

                      {weather.forecast && weather.forecast.length > 0 && (
                        <div className="mt-4">
                          <div className={`text-[10px] font-mono uppercase tracking-wider ${mutedTextClass}`}>
                            {t('hills.forecast3Day')}
                          </div>
                          <div className="mt-2 space-y-2">
                            {weather.forecast.map((day) => (
                              <div
                                key={day.date}
                                className={`flex items-center justify-between gap-2 rounded-lg border px-2.5 py-2 text-[11px] ${isDark ? 'border-slate-700 bg-slate-950/30' : 'border-slate-200 bg-white'}`}
                              >
                                <div>
                                  <div className="font-bold">{day.date}</div>
                                  <div className={mutedTextClass}>{weatherDescription(day.weather_code, t)}</div>
                                </div>
                                <div className="text-right font-mono">
                                  <div>{day.temperature_max_c ?? '--'}° / {day.temperature_min_c ?? '--'}°C</div>
                                  <div className="text-cyan-300">{day.precipitation_mm ?? '--'} mm {t('hills.rain')}</div>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </>
                  )}
                </div>

                {/* Seismic Activity Section */}
                <div className={`mt-5 border-t pt-5 ${isDark ? 'border-slate-700' : 'border-slate-200'}`}>
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-orange-400">
                      <Activity className="h-4 w-4" />
                      {t('hills.seismicActivity')}
                    </div>
                    {earthquakeLoading ? (
                      <Loader2 className="h-4 w-4 animate-spin text-orange-300" />
                    ) : (
                      <span
                        className={`text-[9px] font-mono px-1.5 py-0.5 rounded border ${
                          earthquakeData?.source_status === 'available'
                            ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-300'
                            : 'border-amber-500/30 bg-amber-500/10 text-amber-300'
                        }`}
                      >
                        {earthquakeData?.source_status === 'available' ? t('hills.online') : t('hills.cached')}
                      </span>
                    )}
                  </div>

                  {earthquakeData?.earthquake_data_available === false && !earthquakeLoading ? (
                    <div
                      className={`mt-3 rounded-lg border border-amber-500/20 bg-amber-500/10 p-3 text-xs leading-5 ${
                        isDark ? 'text-amber-200' : 'text-amber-800'
                      }`}
                    >
                      <div className="flex items-start gap-2">
                        <TriangleAlert className="h-4 w-4 shrink-0 text-amber-400 mt-0.5" />
                        <span>
                          {t('hills.seismicUnavailable')}
                        </span>
                      </div>
                    </div>
                  ) : (
                    <>
                      {/* Derived Trigger Level Badge */}
                      <div className="mt-3 flex items-center justify-between rounded-lg border p-2.5 bg-slate-950/20 border-slate-700/60">
                        <div>
                          <div className={`text-[10px] font-mono uppercase tracking-wider ${mutedTextClass}`}>
                            {t('hills.derivedSeismicTrigger')}
                          </div>
                          <div className="mt-0.5 text-[11px] font-medium text-slate-300">
                            {t('hills.groundMotionAdvisory')}
                          </div>
                        </div>
                        <span
                          className={`rounded-md border px-2.5 py-1 text-xs font-black font-mono tracking-wider ${derivedTrigger.badgeClass}`}
                        >
                          {derivedTrigger.label}
                        </span>
                      </div>

                      {/* Latest Earthquake Card */}
                      {latestEarthquake ? (
                        <div
                          className={`mt-3 rounded-lg border p-3 ${
                            isDark ? 'border-slate-700 bg-slate-950/30' : 'border-slate-200 bg-white'
                          }`}
                        >
                          <div className="flex items-start justify-between gap-2">
                            <div>
                              <div className={`text-[10px] font-mono uppercase tracking-wider ${mutedTextClass}`}>
                                {t('hills.latestNcsEvent')}
                              </div>
                              <div className="mt-1 text-xs font-bold text-slate-200 truncate max-w-[180px]">
                                {latestEarthquake.location}
                              </div>
                            </div>
                            <div className="flex h-9 w-9 items-center justify-center rounded-full border border-orange-400/50 bg-orange-500/15 text-sm font-black font-mono text-orange-300">
                              {latestEarthquake.magnitude.toFixed(1)}
                            </div>
                          </div>

                          <div className="mt-2.5 grid grid-cols-2 gap-2 text-[11px] font-mono">
                            <div
                              className={`rounded border p-1.5 ${
                                isDark ? 'border-slate-800 bg-slate-900/50' : 'border-slate-100 bg-slate-50'
                              }`}
                            >
                              <span className={mutedTextClass}>{t('hills.depth')} </span>
                              <span className="font-bold text-slate-200">
                                {latestEarthquake.depth_km.toFixed(0)} km
                              </span>
                            </div>
                            <div
                              className={`rounded border p-1.5 ${
                                isDark ? 'border-slate-800 bg-slate-900/50' : 'border-slate-100 bg-slate-50'
                              }`}
                            >
                              <span className={mutedTextClass}>{t('hills.recency')} </span>
                              <span className="font-bold text-slate-200">
                                {formatEventTime(latestEarthquake.event_time)}
                              </span>
                            </div>
                          </div>

                          {/* Region-Specific Distance, PGA, and MMI */}
                          <div className="mt-2.5 border-t border-slate-800/80 pt-2 space-y-1.5 text-[11px]">
                            <div className="flex items-center justify-between">
                              <span className={mutedTextClass}>{t('hills.epicentralDistance')} </span>
                              {latestDistanceKm !== null ? (
                                <span className="font-mono font-bold text-cyan-300">
                                  {latestDistanceKm} km {t('hills.from')} {selectedRegion.name}
                                </span>
                              ) : (
                                <span className="font-mono text-amber-300/90 italic">
                                  {t('hills.distanceUnavailable')}
                                </span>
                              )}
                            </div>
                            {latestSeismicMetrics && (
                              <div className="grid grid-cols-2 gap-2 font-mono">
                                <div
                                  className={`rounded border p-1.5 ${
                                    isDark ? 'border-slate-800 bg-slate-900/50' : 'border-slate-100 bg-slate-50'
                                  }`}
                                >
                                  <span className={mutedTextClass}>{t('hills.estPga')} </span>
                                  <span
                                    className={`font-bold ${
                                      latestSeismicMetrics.estimatedPgaG >= 0.05 ? 'text-amber-400' : 'text-slate-200'
                                    }`}
                                  >
                                    {latestSeismicMetrics.estimatedPgaPercent}% g
                                  </span>
                                </div>
                                <div
                                  className={`rounded border p-1.5 ${
                                    isDark ? 'border-slate-800 bg-slate-900/50' : 'border-slate-100 bg-slate-50'
                                  }`}
                                >
                                  <span className={mutedTextClass}>{t('hills.intensity')} </span>
                                  <span
                                    className={`font-bold ${
                                      latestSeismicMetrics.estimatedMmi.intensity >= 5 ? 'text-rose-400' : 'text-slate-200'
                                    }`}
                                  >
                                    MMI {latestSeismicMetrics.estimatedMmi.roman}
                                  </span>
                                </div>
                              </div>
                            )}
                          </div>
                        </div>
                      ) : (
                        <div
                          className={`mt-3 rounded-lg border border-dashed p-3 text-center text-xs ${mutedTextClass}`}
                        >
                          {t('hills.noEarthquakes')}
                        </div>
                      )}

                      {/* Recent Activity Counts (24h / 7d) */}
                      <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
                        <div
                          className={`rounded-lg border p-2.5 ${
                            isDark ? 'border-slate-700 bg-slate-950/30' : 'border-slate-200 bg-white'
                          }`}
                        >
                          <div className={`text-[10px] font-mono ${mutedTextClass}`}>{t('hills.last24Hours')}</div>
                          <div className="mt-1 text-lg font-black font-mono text-orange-400">
                            {recentCounts.last24h}{' '}
                            <span className="text-[10px] font-normal text-slate-400">{t('hills.events')}</span>
                          </div>
                        </div>
                        <div
                          className={`rounded-lg border p-2.5 ${
                            isDark ? 'border-slate-700 bg-slate-950/30' : 'border-slate-200 bg-white'
                          }`}
                        >
                          <div className={`text-[10px] font-mono ${mutedTextClass}`}>{t('hills.last7Days')}</div>
                          <div className="mt-1 text-lg font-black font-mono text-cyan-400">
                            {recentCounts.last7d}{' '}
                            <span className="text-[10px] font-normal text-slate-400">{t('hills.events')}</span>
                          </div>
                        </div>
                      </div>

                      {/* Educational Non-Alarmist Disclaimer */}
                      <p className={`mt-3 text-[10px] leading-4 ${mutedTextClass}`}>
                        {t('hills.seismicDisclaimer')}
                      </p>
                    </>
                  )}
                </div>

                {/* ML Risk Evaluation Scorecard */}
                <div className="mt-5">
                  <MlRiskScoreCard
                    evaluation={riskEvaluation}
                    isLoading={isEvaluatingRisk}
                    theme={theme}
                  />
                </div>
              </div>
            ) : (
              <p className={`mt-5 text-sm leading-6 ${mutedTextClass}`}>
                {t('hills.selectRegionPrompt')}
              </p>
            )}
          </aside>
        </div>
      </section>
    </div>
  );
};

export default HillsMountainRegions;
