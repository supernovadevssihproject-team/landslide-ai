import React, { useEffect, useState, useMemo, useCallback } from 'react';
import { OperationalModule, HazardZone } from '../types';
import { useI18n } from '../i18n/index.tsx';
import {
  Search,
  Activity,
  Cpu,
  BellRing,
  Shield,
  ArrowRight,
  MapPin,
  AlertTriangle,
  ChevronRight,
} from 'lucide-react';



interface TerraHomeProps {
  onCheckLocationRisk: (zone: HazardZone) => void;
  onNavigate: (module: OperationalModule) => void;
  zones: HazardZone[];
  theme: 'dark' | 'light';
  selectedZone: HazardZone;
  language?: 'en' | 'hi';
}

export const TerraHome: React.FC<TerraHomeProps> = React.memo(({
  onCheckLocationRisk,
  onNavigate,
  zones,
  theme,
  selectedZone,
  language,
}) => {
  const { t } = useI18n();
  const [searchQuery, setSearchQuery] = useState(selectedZone.name);
  const [showSuggestions, setShowSuggestions] = useState(false);

  useEffect(() => {
    setSearchQuery(selectedZone.name);
  }, [selectedZone.id, selectedZone.name]);

  const matchingZones = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    if (!query) return [];
    return zones.filter(
      (z) =>
        z.name.toLowerCase().includes(query) ||
        z.subDivision.toLowerCase().includes(query) ||
        z.corridor.toLowerCase().includes(query)
    );
  }, [zones, searchQuery]);

  const handleSearchSubmit = useCallback((e: React.FormEvent) => {
    e.preventDefault();
    const queryTrimmed = searchQuery.trim();
    const selectedMatch = zones.find((zone) => zone.name === queryTrimmed) ?? matchingZones[0];
    if (selectedMatch) {
      onCheckLocationRisk(selectedMatch);
    } else if (zones.length > 0) {
      onCheckLocationRisk(zones[0]);
    }
    setShowSuggestions(false);
  }, [searchQuery, zones, matchingZones, onCheckLocationRisk]);

  const highAndMedZonesCount = useMemo(() => {
    return zones.filter(
      (z) => z.riskStatus === 'CRITICAL RED' || z.riskStatus === 'ADVISORY ORANGE'
    ).length;
  }, [zones]);

  const popularZones = useMemo(() => {
    return zones.slice(0, 4);
  }, [zones]);

  return (
    <div className="space-y-8 pb-16 font-sans">
      {/* Hero Section */}
      <div className="home-hero relative min-h-[560px] overflow-hidden rounded-3xl border border-emerald-500/20 shadow-2xl shadow-black/30 sm:min-h-[620px]">
        <div
          className={`absolute inset-0 pointer-events-none ${
            theme === 'light'
              ? 'bg-gradient-to-r from-slate-950/40 via-[#051424]/25 to-[#051424]/10'
              : 'bg-gradient-to-r from-[#030d18]/45 via-[#051424]/30 to-[#051424]/15'
          }`}
        />
        <div className="absolute inset-0 bg-gradient-to-t from-[#030d18]/85 via-transparent to-[#051424]/20 pointer-events-none" />

        {/* Content Container */}
        <div className="home-hero-content relative z-10 flex min-h-[560px] max-w-5xl flex-col justify-center px-5 py-12 text-white sm:min-h-[620px] sm:px-12 sm:py-20">
          <div className="mb-5 inline-flex w-fit items-center gap-2 rounded-full border border-emerald-400/40 bg-emerald-500/15 px-3 py-1 text-xs font-mono font-bold uppercase tracking-wider text-emerald-300 shadow-lg shadow-emerald-950/20">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span className="sr-only">{t('home.liveStatus')}</span>
            {t('home.liveMonitoring')}
          </div>

          <h1 className="home-hero-title max-w-3xl text-4xl font-black leading-[0.98] tracking-tight sm:text-6xl lg:text-7xl">
            {t('home.heroTitlePart1')} <br />
            <span className="text-emerald-400">{t('home.heroTitlePart2')}</span>
          </h1>

          <p className="home-hero-description mt-5 max-w-2xl text-base leading-relaxed text-slate-200 sm:text-lg">
            {t('home.heroDescription')}
          </p>

          {/* Search Bar */}
          <form onSubmit={handleSearchSubmit} className="home-risk-search relative mt-8 max-w-2xl">
            <div className="rounded-2xl border border-white/20 bg-[#051424]/55 p-2 shadow-2xl shadow-black/30 backdrop-blur-xl transition-all focus-within:border-emerald-400/80 focus-within:ring-2 focus-within:ring-emerald-400/20">
              <div className="flex items-center">
                <div className="pl-3 pr-2 text-emerald-400">
                  <Search className="w-5 h-5" />
                </div>
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => {
                    setSearchQuery(e.target.value);
                    setShowSuggestions(true);
                  }}
                  onFocus={() => setShowSuggestions(true)}
                  placeholder={t('home.searchPlaceholder')}
                  aria-label={t('home.searchLabel')}
                  className="w-full bg-transparent px-2 py-2 text-sm font-medium text-white placeholder-slate-300 focus:outline-none sm:text-base"
                />
                <button
                  type="submit"
                  className="home-risk-submit flex-shrink-0 cursor-pointer whitespace-nowrap rounded-xl bg-emerald-500 px-4 py-2.5 text-xs font-bold tracking-wide text-slate-950 shadow-lg shadow-emerald-950/40 transition-all hover:bg-emerald-400 focus:outline-none focus:ring-2 focus:ring-emerald-300 sm:px-6 sm:py-3 sm:text-sm"
                >
                  {t('home.checkRisk')}
                </button>
              </div>
            </div>

            {/* Suggestions Dropdown */}
            {showSuggestions && searchQuery.trim().length > 0 && (
              <div className="absolute top-full left-0 right-0 mt-2 bg-slate-900/95 backdrop-blur-md border border-slate-700 rounded-xl overflow-hidden shadow-2xl z-30">
                {matchingZones.length > 0 ? (
                  matchingZones.map((zone) => (
                    <div
                      key={zone.id}
                      onClick={() => {
                        setSearchQuery(zone.name);
                        setShowSuggestions(false);
                      }}
                      className="px-4 py-2.5 hover:bg-emerald-500/20 cursor-pointer flex items-center justify-between border-b border-slate-800 text-xs sm:text-sm"
                    >
                      <div className="flex items-center gap-2">
                        <MapPin className="w-4 h-4 text-emerald-400" />
                        <span className="font-semibold text-white">{zone.name}</span>
                        <span className="text-slate-400 text-xs">({zone.subDivision})</span>
                      </div>
                      <span
                        className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded ${
                          zone.riskStatus === 'CRITICAL RED'
                            ? 'bg-red-500/30 text-red-300'
                            : 'bg-amber-500/30 text-amber-300'
                        }`}
                      >
                        {zone.riskStatus}
                      </span>
                    </div>
                  ))
                ) : (
                  <div className="px-4 py-3 text-xs text-slate-400">
                    {t('home.noMatch')}
                  </div>
                )}
              </div>
            )}
          </form>

          {/* Quick Location Pills */}
          <div className="mt-4 flex flex-wrap items-center gap-2 text-xs text-slate-300">
            <span className="font-mono text-slate-400">{t('home.popularCorridors')}</span>
            {popularZones.map((z) => (
              <button
                key={z.id}
                type="button"
                onClick={() => {
                  setSearchQuery(z.name);
                  setShowSuggestions(false);
                }}
                className="px-2.5 py-1 rounded-lg bg-white/10 hover:bg-white/20 text-white font-mono text-[11px] transition-all cursor-pointer"
              >
                {z.name.split('(')[0].trim()}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* 4 Feature Cards (Screen 1 Mockup) */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {/* Card 1: Real-time Monitoring */}
        <div
          onClick={() => onNavigate('dashboard')}
          className={`group cursor-pointer rounded-2xl border p-6 shadow-lg transition-all duration-300 hover:-translate-y-1 hover:shadow-xl ${
            theme === 'light'
              ? 'border-slate-200/90 bg-white/90 text-slate-900 shadow-slate-200/60 backdrop-blur-sm hover:border-emerald-300 hover:bg-white'
              : 'border-[#1c2b3c] bg-[#0d1c2d]/90 text-white shadow-black/40 backdrop-blur-sm hover:border-emerald-500/40 hover:bg-[#122131]'
          }`}
        >
          <div className="w-12 h-12 rounded-xl bg-emerald-500/10 text-emerald-500 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
            <Activity className="w-6 h-6" />
          </div>
          <h3 className="text-base font-bold tracking-tight">{t('home.monitoringTitle')}</h3>
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
            {t('home.monitoringDescription')}
          </p>
          <div className="mt-4 flex items-center gap-1 text-xs font-semibold text-emerald-500">
            <span>{t('home.exploreLive')}</span>
            <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
          </div>
        </div>

        {/* Card 2: AI Risk Prediction */}
        <div
          onClick={() => onNavigate('risk-details')}
          className={`group cursor-pointer rounded-2xl border p-6 shadow-lg transition-all duration-300 hover:-translate-y-1 hover:shadow-xl ${
            theme === 'light'
              ? 'border-slate-200/90 bg-white/90 text-slate-900 shadow-slate-200/60 backdrop-blur-sm hover:border-cyan-300 hover:bg-white'
              : 'border-[#1c2b3c] bg-[#0d1c2d]/90 text-white shadow-black/40 backdrop-blur-sm hover:border-cyan-500/40 hover:bg-[#122131]'
          }`}
        >
          <div className="w-12 h-12 rounded-xl bg-cyan-500/10 text-cyan-500 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
            <Cpu className="w-6 h-6" />
          </div>
          <h3 className="text-base font-bold tracking-tight">{t('home.predictionTitle')}</h3>
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
            {t('home.predictionDescription')}
          </p>
          <div className="mt-4 flex items-center gap-1 text-xs font-semibold text-cyan-500">
            <span>{t('home.analyzeFactors')}</span>
            <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
          </div>
        </div>

        {/* Card 3: Instant Alerts */}
        <div
          onClick={() => onNavigate('alerts')}
          className={`group cursor-pointer rounded-2xl border p-6 shadow-lg transition-all duration-300 hover:-translate-y-1 hover:shadow-xl ${
            theme === 'light'
              ? 'border-slate-200/90 bg-white/90 text-slate-900 shadow-slate-200/60 backdrop-blur-sm hover:border-amber-300 hover:bg-white'
              : 'border-[#1c2b3c] bg-[#0d1c2d]/90 text-white shadow-black/40 backdrop-blur-sm hover:border-amber-500/40 hover:bg-[#122131]'
          }`}
        >
          <div className="w-12 h-12 rounded-xl bg-amber-500/10 text-amber-500 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
            <BellRing className="w-6 h-6" />
          </div>
          <h3 className="text-base font-bold tracking-tight">{t('home.alertsTitle')}</h3>
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
            {t('home.alertsDescription')}
          </p>
          <div className="mt-4 flex items-center gap-1 text-xs font-semibold text-amber-500">
            <span>{t('home.checkWarnings')}</span>
            <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
          </div>
        </div>

        {/* Card 4: Emergency Support */}
        <div
          onClick={() => onNavigate('emergency-sos')}
          className={`group cursor-pointer rounded-2xl border p-6 shadow-lg transition-all duration-300 hover:-translate-y-1 hover:shadow-xl ${
            theme === 'light'
              ? 'border-slate-200/90 bg-white/90 text-slate-900 shadow-slate-200/60 backdrop-blur-sm hover:border-red-300 hover:bg-white'
              : 'border-[#1c2b3c] bg-[#0d1c2d]/90 text-white shadow-black/40 backdrop-blur-sm hover:border-red-500/40 hover:bg-[#122131]'
          }`}
        >
          <div className="w-12 h-12 rounded-xl bg-red-500/10 text-red-500 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
            <Shield className="w-6 h-6" />
          </div>
          <h3 className="text-base font-bold tracking-tight">{t('home.supportTitle')}</h3>
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
            {t('home.supportDescription')}
          </p>
          <div className="mt-4 flex items-center gap-1 text-xs font-semibold text-red-500">
            <span>{t('home.accessTools')}</span>
            <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
          </div>
        </div>
      </div>

      {/* Active High & Medium Warning Banner */}
      <div
        className={`p-4 sm:p-5 rounded-2xl border transition-all shadow-md ${
          theme === 'light'
            ? 'bg-amber-50/70 border-amber-200 text-slate-900'
            : 'bg-[#122131] border-[#7d4800]/50 text-white'
        }`}
      >
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/20 text-amber-500 flex items-center justify-center flex-shrink-0">
              <AlertTriangle className="w-5 h-5 animate-bounce" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-bold text-sm">ACTIVE MONITORING NOTICE</span>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-red-500 text-white font-bold">
                  {highAndMedZonesCount} ZONES AT RISK
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Elevated precipitation detected in Teesta Basin (155mm) and Bhatwari Sub-Division. Factor of Safety &lt; 1.0.
              </p>
            </div>
          </div>

          <button
            onClick={() => onNavigate('alerts')}
            className="self-start sm:self-auto px-4 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold rounded-xl text-xs flex items-center gap-1.5 shadow transition-all cursor-pointer"
          >
            <span>View All Warnings</span>
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Social Proof Stats Banner (Screen 1 Mockup) */}
      <div
        className={`p-6 sm:p-8 rounded-2xl border ${
          theme === 'light'
            ? 'bg-white border-slate-200 text-slate-900 shadow-md'
            : 'bg-[#0d1c2d] border-[#1c2b3c] text-white shadow-xl'
        }`}
      >
        <div className="flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="max-w-xs text-center md:text-left">
            <h4 className="text-base sm:text-lg font-bold">Because every warning can save a life.</h4>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              Trusted by National and State Disaster Management Authorities across India.
            </p>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-6 sm:gap-10 w-full md:w-auto text-center">
            <div>
              <span className="text-2xl sm:text-3xl font-black font-mono text-emerald-500">1M+</span>
              <span className="block text-xs font-semibold text-slate-500 dark:text-slate-400 mt-1">
                People Protected
              </span>
            </div>

            <div>
              <span className="text-2xl sm:text-3xl font-black font-mono text-cyan-500">200+</span>
              <span className="block text-xs font-semibold text-slate-500 dark:text-slate-400 mt-1">
                Safer Regions
              </span>
            </div>

            <div>
              <span className="text-2xl sm:text-3xl font-black font-mono text-amber-500">10K+</span>
              <span className="block text-xs font-semibold text-slate-500 dark:text-slate-400 mt-1">
                Early Alerts
              </span>
            </div>

            <div>
              <span className="text-2xl sm:text-3xl font-black font-mono text-emerald-400">∞</span>
              <span className="block text-xs font-semibold text-slate-500 dark:text-slate-400 mt-1">
                Lives Saved
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
});

TerraHome.displayName = 'TerraHome';
