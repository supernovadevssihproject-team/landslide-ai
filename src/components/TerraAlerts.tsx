import React, { useState } from 'react';
import { HazardZone, OperationalModule } from '../types';
import {
  Bell,
  AlertTriangle,
  ShieldAlert,
  ShieldCheck,
  Filter,
  Search,
  MapPin,
  ExternalLink,
  Layers,
  ArrowRight,
  Radio,
  Clock,
  CloudRain,
  Droplets,
  TrendingUp,
  Volume2,
  VolumeX,
} from 'lucide-react';

interface TerraAlertsProps {
  zones: HazardZone[];
  selectedZone: HazardZone;
  onSelectZone: (zone: HazardZone) => void;
  onNavigate: (module: OperationalModule) => void;
  theme: 'dark' | 'light';
  sirenActive?: boolean;
  onToggleSiren?: () => void;
}

export const TerraAlerts: React.FC<TerraAlertsProps> = ({
  zones,
  selectedZone,
  onSelectZone,
  onNavigate,
  theme,
  sirenActive,
  onToggleSiren,
}) => {
  const [severityFilter, setSeverityFilter] = useState<'all' | 'high' | 'moderate' | 'low'>('all');
  const [selectedRegion, setSelectedRegion] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');

  const isDark = theme === 'dark';

  // Extract regions
  const regions = ['all', ...Array.from(new Set(zones.map((z) => z.state)))];

  // Filtered zones acting as active alerts
  const filteredZones = zones.filter((z) => {
    // Severity filter
    if (severityFilter === 'high' && !z.riskStatus.includes('CRITICAL')) return false;
    if (severityFilter === 'moderate' && !z.riskStatus.includes('ADVISORY')) return false;
    if (severityFilter === 'low' && !z.riskStatus.includes('NOMINAL')) return false;

    // Region filter
    if (selectedRegion !== 'all' && z.state.toLowerCase() !== selectedRegion.toLowerCase()) {
      return false;
    }

    // Search query
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

  const highCount = zones.filter((z) => z.riskStatus.includes('CRITICAL')).length;
  const medCount = zones.filter((z) => z.riskStatus.includes('ADVISORY')).length;
  const lowCount = zones.filter((z) => z.riskStatus.includes('NOMINAL')).length;

  return (
    <div
      className={`min-h-screen py-8 px-4 sm:px-6 lg:px-8 transition-colors duration-200 ${
        isDark ? 'bg-[#090e17] text-slate-100' : 'bg-[#f4f7fa] text-slate-900'
      }`}
    >
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Page Header */}
        <div
          className={`p-6 rounded-2xl border transition-all ${
            isDark
              ? 'bg-gradient-to-r from-slate-900 via-slate-850 to-slate-900 border-slate-800'
              : 'bg-white border-slate-200 shadow-sm'
          }`}
        >
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
            <div className="flex items-center gap-3">
              <span className="p-3 rounded-2xl bg-red-500/10 border border-red-500/20 text-red-500">
                <Bell className="w-7 h-7 animate-pulse" />
              </span>
              <div>
                <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Active Hazard Alerts</h1>
                <p className={`text-xs sm:text-sm mt-0.5 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                  Real-time early warning bulletins triggered by predictive telemetry & machine learning
                </p>
              </div>
            </div>

            {/* Siren toggle & emergency hotline shortcut */}
            <div className="flex items-center gap-3">
              {onToggleSiren && (
                <button
                  onClick={onToggleSiren}
                  className={`flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-bold border transition-all ${
                    sirenActive
                      ? 'bg-red-600 text-white border-red-500 animate-pulse'
                      : isDark
                      ? 'bg-slate-800 hover:bg-slate-700 text-slate-300 border-slate-700'
                      : 'bg-white hover:bg-slate-100 text-slate-700 border-slate-300 shadow-sm'
                  }`}
                >
                  {sirenActive ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
                  <span>{sirenActive ? 'Silence Acoustic Siren' : 'Test Warning Siren'}</span>
                </button>
              )}

              <button
                onClick={() => onNavigate('emergency-sos')}
                className="flex items-center gap-2 px-4 py-2 rounded-xl bg-red-600 hover:bg-red-700 text-white text-xs font-bold transition-all shadow-md shadow-red-600/20"
              >
                <span>Emergency SOS</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* Quick Metrics Strip */}
          <div className="mt-6 pt-5 border-t border-slate-200 dark:border-slate-800 grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div
              className={`p-3 rounded-xl border ${
                isDark ? 'bg-slate-800/40 border-slate-700/60' : 'bg-slate-50 border-slate-200'
              }`}
            >
              <div className="text-[11px] text-slate-400 uppercase font-semibold">Total Monitored</div>
              <div className="text-xl font-bold mt-1">{zones.length} Zones</div>
            </div>

            <div
              onClick={() => setSeverityFilter('high')}
              className={`p-3 rounded-xl border cursor-pointer transition-all ${
                severityFilter === 'high'
                  ? 'border-red-500 bg-red-500/10'
                  : isDark
                  ? 'bg-slate-800/40 border-slate-700/60 hover:border-red-500/50'
                  : 'bg-slate-50 border-slate-200 hover:border-red-400'
              }`}
            >
              <div className="text-[11px] text-red-500 uppercase font-bold flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-red-500 animate-ping" />
                <span>High Warnings</span>
              </div>
              <div className="text-xl font-bold text-red-500 mt-1">{highCount} Zones</div>
            </div>

            <div
              onClick={() => setSeverityFilter('moderate')}
              className={`p-3 rounded-xl border cursor-pointer transition-all ${
                severityFilter === 'moderate'
                  ? 'border-amber-500 bg-amber-500/10'
                  : isDark
                  ? 'bg-slate-800/40 border-slate-700/60 hover:border-amber-500/50'
                  : 'bg-slate-50 border-slate-200 hover:border-amber-400'
              }`}
            >
              <div className="text-[11px] text-amber-500 uppercase font-bold flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-amber-500" />
                <span>Medium Advisories</span>
              </div>
              <div className="text-xl font-bold text-amber-500 mt-1">{medCount} Zones</div>
            </div>

            <div
              onClick={() => setSeverityFilter('low')}
              className={`p-3 rounded-xl border cursor-pointer transition-all ${
                severityFilter === 'low'
                  ? 'border-emerald-500 bg-emerald-500/10'
                  : isDark
                  ? 'bg-slate-800/40 border-slate-700/60 hover:border-emerald-500/50'
                  : 'bg-slate-50 border-slate-200 hover:border-emerald-400'
              }`}
            >
              <div className="text-[11px] text-emerald-500 uppercase font-bold flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-500" />
                <span>Nominal / Low</span>
              </div>
              <div className="text-xl font-bold text-emerald-500 mt-1">{lowCount} Zones</div>
            </div>
          </div>
        </div>

        {/* Filter Controls (Screen 5 Layout) */}
        <div
          className={`p-4 rounded-2xl border flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 ${
            isDark ? 'bg-slate-900/90 border-slate-800' : 'bg-white border-slate-200 shadow-sm'
          }`}
        >
          {/* Severity Pills */}
          <div className="flex flex-wrap items-center gap-2">
            <span className={`text-xs font-semibold uppercase tracking-wider ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
              Filter Severity:
            </span>
            <button
              onClick={() => setSeverityFilter('all')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all border ${
                severityFilter === 'all'
                  ? 'bg-emerald-600 text-white border-emerald-600 shadow-sm'
                  : isDark
                  ? 'bg-slate-800 text-slate-300 border-slate-700 hover:border-slate-600'
                  : 'bg-slate-100 text-slate-700 border-slate-200 hover:bg-slate-200'
              }`}
            >
              All Severity ({zones.length})
            </button>
            <button
              onClick={() => setSeverityFilter('high')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all border ${
                severityFilter === 'high'
                  ? 'bg-red-600 text-white border-red-600 shadow-sm'
                  : isDark
                  ? 'bg-slate-800 text-red-400 border-slate-700 hover:border-red-500/50'
                  : 'bg-red-50 text-red-700 border-red-200 hover:bg-red-100'
              }`}
            >
              High ({highCount})
            </button>
            <button
              onClick={() => setSeverityFilter('moderate')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all border ${
                severityFilter === 'moderate'
                  ? 'bg-amber-600 text-white border-amber-600 shadow-sm'
                  : isDark
                  ? 'bg-slate-800 text-amber-400 border-slate-700 hover:border-amber-500/50'
                  : 'bg-amber-50 text-amber-700 border-amber-200 hover:bg-amber-100'
              }`}
            >
              Moderate ({medCount})
            </button>
            <button
              onClick={() => setSeverityFilter('low')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all border ${
                severityFilter === 'low'
                  ? 'bg-emerald-600 text-white border-emerald-600 shadow-sm'
                  : isDark
                  ? 'bg-slate-800 text-emerald-400 border-slate-700 hover:border-emerald-500/50'
                  : 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100'
              }`}
            >
              Low ({lowCount})
            </button>
          </div>

          {/* Region Dropdown & Search Input */}
          <div className="flex flex-wrap items-center gap-3">
            <select
              value={selectedRegion}
              onChange={(e) => setSelectedRegion(e.target.value)}
              className={`px-3 py-1.5 rounded-xl border text-xs font-semibold outline-none cursor-pointer capitalize ${
                isDark
                  ? 'bg-slate-800 text-slate-100 border-slate-700 focus:border-emerald-500'
                  : 'bg-white text-slate-800 border-slate-300 focus:border-emerald-600'
              }`}
            >
              {regions.map((reg) => (
                <option key={reg} value={reg}>
                  {reg === 'all' ? 'All Regions' : reg.charAt(0).toUpperCase() + reg.slice(1)}
                </option>
              ))}
            </select>

            <div className="relative">
              <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Search alert by corridor or sector..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className={`pl-8 pr-3 py-1.5 rounded-xl text-xs border outline-none w-48 sm:w-60 ${
                  isDark
                    ? 'bg-slate-800 text-slate-100 border-slate-700 focus:border-emerald-500'
                    : 'bg-white text-slate-800 border-slate-300 focus:border-emerald-600'
                }`}
              />
            </div>
          </div>
        </div>

        {/* Alerts List */}
        <div className="space-y-4">
          {filteredZones.length === 0 ? (
            <div
              className={`p-12 text-center rounded-2xl border ${
                isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'
              }`}
            >
              <ShieldCheck className="w-12 h-12 mx-auto text-emerald-500 mb-3" />
              <h3 className="text-lg font-bold">No Alerts Found</h3>
              <p className="text-xs text-slate-400 mt-1">
                No active landslide advisories match your selected severity and region criteria.
              </p>
            </div>
          ) : (
            filteredZones.map((zone) => {
              const isCrit = zone.riskStatus.includes('CRITICAL');
              const isAdv = zone.riskStatus.includes('ADVISORY');

              return (
                <div
                  key={zone.id}
                  className={`p-6 rounded-2xl border transition-all ${
                    isCrit
                      ? isDark
                        ? 'bg-slate-900/90 border-red-500/40 hover:border-red-500'
                        : 'bg-white border-red-200 hover:border-red-400 shadow-sm'
                      : isAdv
                      ? isDark
                        ? 'bg-slate-900/90 border-amber-500/40 hover:border-amber-500'
                        : 'bg-white border-amber-200 hover:border-amber-400 shadow-sm'
                      : isDark
                      ? 'bg-slate-900/80 border-slate-800 hover:border-slate-700'
                      : 'bg-white border-slate-200 hover:border-slate-300 shadow-sm'
                  }`}
                >
                  <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4">
                    {/* Left details */}
                    <div className="space-y-2">
                      <div className="flex flex-wrap items-center gap-2.5">
                        <span
                          className={`p-1.5 rounded-lg ${
                            isCrit
                              ? 'bg-red-500/20 text-red-500'
                              : isAdv
                              ? 'bg-amber-500/20 text-amber-500'
                              : 'bg-emerald-500/20 text-emerald-500'
                          }`}
                        >
                          {isCrit ? (
                            <ShieldAlert className="w-5 h-5" />
                          ) : isAdv ? (
                            <AlertTriangle className="w-5 h-5" />
                          ) : (
                            <ShieldCheck className="w-5 h-5" />
                          )}
                        </span>

                        <h3 className="text-lg font-bold">
                          {zone.name} - {isCrit ? 'Red Flash Warning' : isAdv ? 'Orange Corridor Watch' : 'Green Advisory'}
                        </h3>

                        <span
                          className={`text-[10px] font-extrabold uppercase px-2.5 py-0.5 rounded-full ${
                            isCrit
                              ? 'bg-red-500/20 text-red-500 border border-red-500/40'
                              : isAdv
                              ? 'bg-amber-500/20 text-amber-500 border border-amber-500/40'
                              : 'bg-emerald-500/20 text-emerald-500 border border-emerald-500/40'
                          }`}
                        >
                          {zone.riskStatus}
                        </span>

                        <span
                          className={`text-xs capitalize px-2 py-0.5 rounded ${
                            isDark ? 'bg-slate-800 text-slate-300' : 'bg-slate-100 text-slate-600'
                          }`}
                        >
                          {zone.state}
                        </span>
                      </div>

                      <p className={`text-xs ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                        Corridor: <span className="font-semibold text-emerald-500">{zone.corridor}</span> • Highway Segment: {zone.highwaySegment} • Bridges Exposed: {zone.bridgesExposed}
                      </p>

                      <p className="text-xs sm:text-sm font-medium pt-1">
                        {isCrit
                          ? 'Heavy rainfall triggering active debris mobilization. Ground shear failure imminent along highway pass. Evacuation procedures initialized.'
                          : isAdv
                          ? 'Elevated pore water saturation and continuous rainfall increase slip probability. Heavy vehicle traffic regulated.'
                          : 'Telemetry operating within safe baseline tolerances. Routine continuous GIS radar tracking active.'}
                      </p>
                    </div>

                    {/* Right side telemetry tags */}
                    <div className="flex flex-wrap lg:flex-col lg:items-end gap-2 shrink-0">
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-slate-400">Rainfall:</span>
                        <span className="text-xs font-bold font-mono text-blue-500">120 mm / 24h</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-slate-400">Soil Saturation:</span>
                        <span className="text-xs font-bold font-mono text-cyan-500">{zone.soilPoreSaturation}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-slate-400">Slope Gradient:</span>
                        <span className="text-xs font-bold font-mono text-amber-500">{zone.slopeGradient}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-slate-400">Evac Lead Time:</span>
                        <span className="text-xs font-bold font-mono text-red-500">{zone.lstmEvac}</span>
                      </div>
                    </div>
                  </div>

                  {/* Actions strip */}
                  <div className="mt-5 pt-4 border-t border-slate-200 dark:border-slate-800 flex flex-wrap items-center justify-between gap-3">
                    <div className="flex items-center gap-4 text-xs text-slate-400">
                      <span className="flex items-center gap-1.5">
                        <Clock className="w-3.5 h-3.5" />
                        <span>Issued 10m ago • Valid for 12 hours</span>
                      </span>
                      <span>Population Exposed: {zone.populationRunout}</span>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => {
                          onSelectZone(zone);
                          onNavigate('risk-details');
                        }}
                        className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all ${
                          isDark
                            ? 'bg-slate-800 hover:bg-slate-700 text-slate-200 border-slate-700'
                            : 'bg-slate-100 hover:bg-slate-200 text-slate-800 border-slate-200'
                        }`}
                      >
                        Risk Details
                      </button>

                      <button
                        onClick={() => {
                          onSelectZone(zone);
                          onNavigate('risk-map');
                        }}
                        className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 text-white transition-all flex items-center gap-1.5 shadow-sm"
                      >
                        <Layers className="w-3.5 h-3.5" />
                        <span>View on Map</span>
                      </button>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Live Warning Zones Summary Strip */}
        <div
          className={`p-6 rounded-2xl border ${
            isDark ? 'bg-slate-900/90 border-slate-800' : 'bg-white border-slate-200 shadow-sm'
          }`}
        >
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Radio className="w-4 h-4 text-red-500 animate-pulse" />
              <h3 className="text-sm font-bold uppercase tracking-wider">
                Current Live Telemetry at High & Medium Warning Zones
              </h3>
            </div>
            <span className="text-xs text-slate-400 font-mono">Sensors: InSAR + PWP Gauges</span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className={`border-b ${isDark ? 'border-slate-800 text-slate-400' : 'border-slate-200 text-slate-500'}`}>
                  <th className="pb-2 font-semibold">Zone & Corridor</th>
                  <th className="pb-2 font-semibold">State</th>
                  <th className="pb-2 font-semibold">Severity</th>
                  <th className="pb-2 font-semibold">Pore Saturation</th>
                  <th className="pb-2 font-semibold">Displacement</th>
                  <th className="pb-2 font-semibold">Slope</th>
                  <th className="pb-2 font-semibold">Pore Pressure</th>
                  <th className="pb-2 font-semibold">Evac Window</th>
                  <th className="pb-2 font-semibold text-right">Inspect</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                {zones
                  .filter((z) => !z.riskStatus.includes('NOMINAL'))
                  .map((z) => (
                    <tr
                      key={z.id}
                      className={`hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors ${
                        selectedZone.id === z.id ? 'bg-emerald-500/10' : ''
                      }`}
                    >
                      <td className="py-2.5 font-bold">
                        <div>{z.name}</div>
                        <div className="text-[10px] text-slate-400 font-normal">{z.corridor}</div>
                      </td>
                      <td className="py-2.5 capitalize">{z.state}</td>
                      <td className="py-2.5">
                        <span
                          className={`text-[9px] font-bold px-1.5 py-0.5 rounded ${
                            z.riskStatus.includes('CRITICAL')
                              ? 'bg-red-500/20 text-red-500'
                              : 'bg-amber-500/20 text-amber-500'
                          }`}
                        >
                          {z.riskStatus.includes('CRITICAL') ? 'HIGH' : 'MED'}
                        </span>
                      </td>
                      <td className="py-2.5 font-mono text-cyan-400">{z.soilPoreSaturation}</td>
                      <td className="py-2.5 font-mono text-amber-400">{z.displacementRate}</td>
                      <td className="py-2.5 font-mono">{z.slopeGradient}</td>
                      <td className="py-2.5 font-mono text-slate-300">{z.pwpPressure}</td>
                      <td className="py-2.5 font-mono text-red-400 font-bold">{z.lstmEvac}</td>
                      <td className="py-2.5 text-right">
                        <button
                          onClick={() => {
                            onSelectZone(z);
                            onNavigate('risk-details');
                          }}
                          className="text-xs text-emerald-500 hover:text-emerald-400 font-semibold"
                        >
                          Analyze &rarr;
                        </button>
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};
