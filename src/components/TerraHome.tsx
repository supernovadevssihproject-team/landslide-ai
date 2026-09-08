import React, { useState } from 'react';
import { OperationalModule, HazardZone } from '../types';
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
  Zap,
} from 'lucide-react';

interface TerraHomeProps {
  onCheckLocationRisk: (zone: HazardZone) => void;
  onNavigate: (module: OperationalModule) => void;
  zones: HazardZone[];
  theme: 'dark' | 'light';
}

export const TerraHome: React.FC<TerraHomeProps> = ({
  onCheckLocationRisk,
  onNavigate,
  zones,
  theme,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [showSuggestions, setShowSuggestions] = useState(false);

  const matchingZones = zones.filter(
    (z) =>
      z.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      z.subDivision.toLowerCase().includes(searchQuery.toLowerCase()) ||
      z.corridor.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (matchingZones.length > 0) {
      onCheckLocationRisk(matchingZones[0]);
    } else if (zones.length > 0) {
      onCheckLocationRisk(zones[0]);
    }
  };

  const highAndMedZones = zones.filter(
    (z) => z.riskStatus === 'CRITICAL RED' || z.riskStatus === 'ADVISORY ORANGE'
  );

  return (
    <div className="space-y-8 pb-16 font-sans">
      {/* Hero Section */}
      <div className="relative rounded-3xl overflow-hidden border border-emerald-500/20 shadow-2xl">
        {/* Background Mountain Photo with Overlay */}
        <div
          className="absolute inset-0 bg-cover bg-center"
          style={{
            backgroundImage: `url('https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?auto=format&fit=crop&w=2000&q=80')`,
          }}
        />
        <div
          className={`absolute inset-0 ${
            theme === 'light'
              ? 'bg-gradient-to-r from-slate-900/90 via-slate-900/80 to-slate-900/60'
              : 'bg-gradient-to-r from-[#030d18]/95 via-[#051424]/90 to-[#051424]/75'
          }`}
        />

        {/* Content Container */}
        <div className="relative z-10 max-w-4xl px-6 sm:px-12 py-16 sm:py-24 text-white">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/20 border border-emerald-400/40 text-emerald-300 text-xs font-mono font-bold uppercase tracking-wider mb-4">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            SAFER PLACES. STRONGER TOMORROWS.
          </div>

          <h1 className="text-4xl sm:text-6xl font-black tracking-tight leading-tight">
            Early Warnings <br />
            <span className="text-emerald-400">Save Lives</span>
          </h1>

          <p className="mt-4 text-base sm:text-lg text-slate-200 max-w-2xl leading-relaxed">
            AI-powered disaster monitoring and emergency support for safer mountain communities.
            Fusing satellite earth observation, in-situ subsurface telemetry, and neural risk models.
          </p>

          {/* Search Bar */}
          <form onSubmit={handleSearchSubmit} className="mt-8 relative max-w-xl">
            <div className="flex items-center bg-white/10 backdrop-blur-md border border-white/20 rounded-2xl p-1.5 shadow-2xl focus-within:border-emerald-400 transition-all">
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
                placeholder="Enter location (e.g. Uttarkashi, Teesta Basin, Sohra, Tupul...)"
                className="w-full bg-transparent text-white placeholder-slate-300 text-sm sm:text-base font-medium focus:outline-none px-2 py-2"
              />
              <button
                type="submit"
                className="bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold px-5 sm:px-6 py-2.5 sm:py-3 rounded-xl text-xs sm:text-sm tracking-wide transition-all shadow-lg shadow-emerald-950/40 cursor-pointer flex-shrink-0"
              >
                Check Risk
              </button>
            </div>

            {/* Suggestions Dropdown */}
            {showSuggestions && searchQuery.trim().length > 0 && (
              <div className="absolute top-full left-0 right-0 mt-2 bg-slate-900/95 backdrop-blur-md border border-slate-700 rounded-xl overflow-hidden shadow-2xl z-30">
                {matchingZones.length > 0 ? (
                  matchingZones.map((zone) => (
                    <div
                      key={zone.id}
                      onClick={() => {
                        onCheckLocationRisk(zone);
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
                    No exact match found. Click "Check Risk" to inspect standard monitoring sectors.
                  </div>
                )}
              </div>
            )}
          </form>

          {/* Quick Location Pills */}
          <div className="mt-4 flex flex-wrap items-center gap-2 text-xs text-slate-300">
            <span className="font-mono text-slate-400">Popular Corridors:</span>
            {zones.slice(0, 4).map((z) => (
              <button
                key={z.id}
                type="button"
                onClick={() => onCheckLocationRisk(z)}
                className="px-2.5 py-1 rounded-lg bg-white/10 hover:bg-white/20 text-white font-mono text-[11px] transition-all cursor-pointer"
              >
                {z.name.split('(')[0].trim()}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* 4 Feature Cards (Screen 1 Mockup) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Real-time Monitoring */}
        <div
          onClick={() => onNavigate('dashboard')}
          className={`p-6 rounded-2xl border transition-all cursor-pointer group hover:-translate-y-1 shadow-lg ${
            theme === 'light'
              ? 'bg-white hover:bg-slate-50 border-slate-200 text-slate-900 shadow-slate-200/50'
              : 'bg-[#0d1c2d] hover:bg-[#122131] border-[#1c2b3c] text-white shadow-black/40'
          }`}
        >
          <div className="w-12 h-12 rounded-xl bg-emerald-500/10 text-emerald-500 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
            <Activity className="w-6 h-6" />
          </div>
          <h3 className="text-base font-bold tracking-tight">Real-time Monitoring</h3>
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
            Live environmental sensor data, 148 IoT borehole telemetry feeds, and IMD radar rainfall tracking.
          </p>
          <div className="mt-4 flex items-center gap-1 text-xs font-semibold text-emerald-500">
            <span>Explore live data</span>
            <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
          </div>
        </div>

        {/* Card 2: AI Risk Prediction */}
        <div
          onClick={() => onNavigate('risk-details')}
          className={`p-6 rounded-2xl border transition-all cursor-pointer group hover:-translate-y-1 shadow-lg ${
            theme === 'light'
              ? 'bg-white hover:bg-slate-50 border-slate-200 text-slate-900 shadow-slate-200/50'
              : 'bg-[#0d1c2d] hover:bg-[#122131] border-[#1c2b3c] text-white shadow-black/40'
          }`}
        >
          <div className="w-12 h-12 rounded-xl bg-cyan-500/10 text-cyan-500 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
            <Cpu className="w-6 h-6" />
          </div>
          <h3 className="text-base font-bold tracking-tight">AI Risk Prediction</h3>
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
            Random Forest &amp; Temporal LSTM neural networks trained on 654 verified ground truth landslide events.
          </p>
          <div className="mt-4 flex items-center gap-1 text-xs font-semibold text-cyan-500">
            <span>Analyze risk factors</span>
            <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
          </div>
        </div>

        {/* Card 3: Instant Alerts */}
        <div
          onClick={() => onNavigate('alerts')}
          className={`p-6 rounded-2xl border transition-all cursor-pointer group hover:-translate-y-1 shadow-lg ${
            theme === 'light'
              ? 'bg-white hover:bg-slate-50 border-slate-200 text-slate-900 shadow-slate-200/50'
              : 'bg-[#0d1c2d] hover:bg-[#122131] border-[#1c2b3c] text-white shadow-black/40'
          }`}
        >
          <div className="w-12 h-12 rounded-xl bg-amber-500/10 text-amber-500 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
            <BellRing className="w-6 h-6" />
          </div>
          <h3 className="text-base font-bold tracking-tight">Instant Alerts</h3>
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
            Stay informed with Common Alerting Protocol (CAP-CMSP) geo-fenced cell broadcasts in 7 local languages.
          </p>
          <div className="mt-4 flex items-center gap-1 text-xs font-semibold text-amber-500">
            <span>Check active warnings</span>
            <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
          </div>
        </div>

        {/* Card 4: Emergency Support */}
        <div
          onClick={() => onNavigate('emergency-sos')}
          className={`p-6 rounded-2xl border transition-all cursor-pointer group hover:-translate-y-1 shadow-lg ${
            theme === 'light'
              ? 'bg-white hover:bg-slate-50 border-slate-200 text-slate-900 shadow-slate-200/50'
              : 'bg-[#0d1c2d] hover:bg-[#122131] border-[#1c2b3c] text-white shadow-black/40'
          }`}
        >
          <div className="w-12 h-12 rounded-xl bg-red-500/10 text-red-500 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
            <Shield className="w-6 h-6" />
          </div>
          <h3 className="text-base font-bold tracking-tight">Emergency Support</h3>
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
            One-touch SOS dispatch, offline mesh location sharing, and direct verified helpline directory.
          </p>
          <div className="mt-4 flex items-center gap-1 text-xs font-semibold text-red-500">
            <span>Access emergency tools</span>
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
                  {highAndMedZones.length} ZONES AT RISK
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
};
