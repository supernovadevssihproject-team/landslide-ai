import React from 'react';
import {
  ShieldAlert,
  ShieldCheck,
  AlertTriangle,
  Flame,
  Activity,
  CloudRain,
  Radio,
  RotateCw,
  Loader2,
  Info,
  MapPin,
  Cpu,
} from 'lucide-react';
import { LocationRiskEvaluation } from '../types';

interface MlRiskScoreCardProps {
  evaluation: LocationRiskEvaluation | null;
  loading?: boolean;
  isLoading?: boolean;
  error?: string | null;
  onRefresh?: () => void;
  compact?: boolean;
  theme?: 'dark' | 'light';
  titlePrefix?: string;
  className?: string;
}

export const MlRiskScoreCard: React.FC<MlRiskScoreCardProps> = ({
  evaluation,
  loading: propLoading,
  isLoading: propIsLoading,
  error = null,
  onRefresh,
  compact = false,
  theme = 'dark',
  titlePrefix = 'ML LANDSLIDE RISK',
  className = '',
}) => {
  const loading = propLoading ?? propIsLoading ?? false;
  const isDark = theme === 'dark';

  const formatTime = (isoString?: string) => {
    if (!isoString) return 'Just now';
    try {
      const date = new Date(isoString);
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    } catch {
      return 'Just now';
    }
  };

  const getRiskStyles = (level?: string) => {
    switch (level) {
      case 'VERY_HIGH':
      case 'CRITICAL RED':
        return {
          badge: 'bg-red-500/20 text-red-400 border-red-500/40',
          dial: 'text-red-500 border-red-500/50 bg-red-950/20',
          bar: 'bg-gradient-to-r from-orange-500 to-red-600',
          pulse: 'bg-red-500',
          label: 'VERY HIGH',
          icon: ShieldAlert,
        };
      case 'HIGH':
      case 'ADVISORY ORANGE':
        return {
          badge: 'bg-orange-500/20 text-orange-400 border-orange-500/40',
          dial: 'text-orange-400 border-orange-500/50 bg-orange-950/20',
          bar: 'bg-gradient-to-r from-amber-400 to-orange-500',
          pulse: 'bg-orange-400',
          label: 'HIGH',
          icon: AlertTriangle,
        };
      case 'MODERATE':
        return {
          badge: 'bg-amber-500/20 text-amber-300 border-amber-500/40',
          dial: 'text-amber-300 border-amber-500/50 bg-amber-950/20',
          bar: 'bg-gradient-to-r from-emerald-400 to-amber-400',
          pulse: 'bg-amber-400',
          label: 'MODERATE',
          icon: Activity,
        };
      case 'LOW':
      case 'NOMINAL GREEN':
      default:
        return {
          badge: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40',
          dial: 'text-emerald-400 border-emerald-500/50 bg-emerald-950/20',
          bar: 'bg-gradient-to-r from-teal-400 to-emerald-500',
          pulse: 'bg-emerald-400',
          label: 'LOW',
          icon: ShieldCheck,
        };
    }
  };

  if (loading && !evaluation) {
    return (
      <div
        className={`rounded-2xl border p-5 ${
          isDark ? 'bg-[#0b1522] border-[#1c2c3e] text-slate-200' : 'bg-white border-slate-200 text-slate-800'
        } shadow-lg ${className}`}
      >
        <div className="flex items-center justify-between gap-3 border-b border-slate-700/40 pb-3">
          <div className="flex items-center gap-2">
            <Cpu className="w-5 h-5 text-cyan-400 animate-pulse" />
            <span className="text-xs font-mono font-bold tracking-wider uppercase text-cyan-400">
              {titlePrefix}
            </span>
          </div>
          <span className="flex items-center gap-1.5 text-[11px] font-mono text-slate-400">
            <Loader2 className="w-3.5 h-3.5 animate-spin text-cyan-400" />
            Evaluating neural risk pipeline...
          </span>
        </div>
        <div className="py-8 flex flex-col items-center justify-center gap-3">
          <div className="relative w-20 h-20 rounded-full border-4 border-slate-700 border-t-cyan-400 animate-spin flex items-center justify-center">
            <Activity className="w-6 h-6 text-cyan-400 animate-pulse" />
          </div>
          <p className="text-xs font-mono text-slate-400">
            Fusing live weather, antecedent rainfall, and NCS seismic ground motion...
          </p>
        </div>
      </div>
    );
  }

  if (error && !evaluation) {
    return (
      <div
        className={`rounded-2xl border p-5 ${
          isDark ? 'bg-[#150e11] border-red-900/50 text-slate-200' : 'bg-red-50 border-red-200 text-slate-800'
        } shadow-lg ${className}`}
      >
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-red-400" />
            <span className="text-xs font-mono font-bold tracking-wider uppercase text-red-400">
              {titlePrefix} — Evaluation Interrupted
            </span>
          </div>
          {onRefresh && (
            <button
              onClick={onRefresh}
              className="px-2.5 py-1 rounded bg-red-500/20 hover:bg-red-500/30 text-red-300 text-xs font-mono flex items-center gap-1 border border-red-500/40 cursor-pointer transition-all"
            >
              <RotateCw className="w-3 h-3" />
              <span>Retry</span>
            </button>
          )}
        </div>
        <p className="mt-3 text-xs text-red-300/90 font-mono leading-relaxed">
          {error}
        </p>
      </div>
    );
  }

  if (!evaluation) {
    return (
      <div
        className={`rounded-2xl border border-dashed p-5 text-center ${
          isDark ? 'bg-slate-900/40 border-slate-800 text-slate-400' : 'bg-slate-50 border-slate-300 text-slate-600'
        } ${className}`}
      >
        <Info className="w-5 h-5 mx-auto text-slate-400 mb-1" />
        <p className="text-xs font-mono">Select a location to evaluate ML landslide risk.</p>
      </div>
    );
  }

  const styles = getRiskStyles(evaluation.risk_level);
  const RiskIcon = styles.icon;
  const scoreOutOf100 = evaluation.final_risk_score ?? 0;
  const probabilityPct = evaluation.probability_percentage ?? 0;
  const baseMlPct = +((evaluation.base_ml_probability ?? 0) * 100).toFixed(1);
  const seismicAdjPct = +((evaluation.seismic_adjustment ?? 0) * 100).toFixed(1);

  const locName = evaluation.location?.name ?? 'Selected Region';
  const locType = evaluation.location?.type ?? 'region';
  const locLat = evaluation.location?.latitude != null ? evaluation.location.latitude.toFixed(4) : '0.0000';
  const locLon = evaluation.location?.longitude != null ? evaluation.location.longitude.toFixed(4) : '0.0000';
  const elevM = evaluation.inputs?.elevation_m ?? 0;
  const slopeDeg = evaluation.inputs?.slope_deg ?? 0;
  const rain3d = evaluation.inputs?.rainfall?.rainfall_3d_mm ?? 0;
  const isSeismicLive = Boolean(evaluation.inputs?.seismic?.is_live);
  const triggerScore = evaluation.inputs?.seismic?.seismic_trigger_score ?? 0;
  const eventsInRange = evaluation.inputs?.seismic?.events_in_range_500km ?? 0;

  console.log(`[RISK DEBUG] Scorecard render for "${locName}": final_risk_score = ${scoreOutOf100}`);

  return (
    <div
      className={`w-full max-w-full min-w-0 box-border rounded-2xl border transition-all duration-300 shadow-xl overflow-hidden ${
        isDark
          ? 'bg-[#091523]/95 border-[#1c3046] text-slate-100'
          : 'bg-white border-slate-200 text-slate-900'
      } ${className}`}
    >
      {/* Top Banner: Location & Status */}
      <div
        className={`px-4 py-3 border-b flex flex-wrap items-center justify-between gap-2 ${
          isDark ? 'bg-[#0e1d2f]/90 border-[#1c3046]' : 'bg-slate-50 border-slate-200'
        }`}
      >
        <div className="flex min-w-0 max-w-full items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-emerald-500/10 text-emerald-400 flex items-center justify-center flex-shrink-0 border border-emerald-500/20">
            <Cpu className="w-4 h-4" />
          </div>
          <div className="min-w-0">
            <div className="flex min-w-0 max-w-full flex-wrap items-center gap-2">
              <span className="min-w-0 max-w-full break-words text-[10px] font-mono font-bold tracking-wider uppercase text-cyan-400">
                {titlePrefix}
              </span>
              <span
                className={`text-[9px] font-mono font-semibold px-1.5 py-0.5 rounded border uppercase ${
                  locType === 'hill'
                    ? 'bg-purple-500/15 text-purple-300 border-purple-500/30'
                    : 'bg-cyan-500/15 text-cyan-300 border-cyan-500/30'
                }`}
              >
                {locType === 'hill' ? 'Hills & Mountains' : 'Region Corridor'}
              </span>
            </div>
            <h4 className="min-w-0 max-w-full break-words text-sm sm:text-base font-black text-white">
              {locName}
            </h4>
          </div>
        </div>

        <div className="flex max-w-full flex-wrap items-center justify-end gap-2">
          <div
            className={`flex items-center gap-1.5 px-2 py-0.5 rounded font-mono text-[10px] border ${
              isSeismicLive
                ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
                : 'bg-slate-800/80 border-slate-700 text-slate-400'
            }`}
            title="Telemetry feed sync status"
          >
            <Radio className="w-3 h-3 animate-pulse text-emerald-400" />
            <span>NCS + IMD LIVE</span>
          </div>

          {onRefresh && (
            <button
              onClick={onRefresh}
              disabled={loading}
              title="Refresh live prediction"
              className={`p-1.5 rounded-lg border text-xs transition-all cursor-pointer ${
                isDark
                  ? 'bg-slate-800/60 hover:bg-slate-700 text-slate-300 border-slate-700'
                  : 'bg-slate-100 hover:bg-slate-200 text-slate-700 border-slate-200'
              } disabled:opacity-50`}
            >
              <RotateCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-cyan-400' : ''}`} />
            </button>
          )}
        </div>
      </div>

      {/* Main KPI Dashboard */}
      <div className="min-w-0 p-4 sm:p-5">
        <div className="grid min-w-0 grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <div className={`rounded-xl border p-3 ${isDark ? 'bg-slate-900/50 border-slate-800' : 'bg-slate-50 border-slate-200'}`}>
            <span className="text-[9px] font-mono font-bold uppercase leading-tight tracking-wider text-slate-400">Risk Score</span>
              <div className="mt-2 flex items-baseline gap-1">
                <span className="text-[19px] font-black font-mono leading-none text-white">{scoreOutOf100}</span>
                <span className="text-[9px] font-mono leading-tight text-slate-400">/ 100</span>
            </div>
            <div className="mt-2 h-1.5 w-full rounded-full bg-slate-800 p-0.5">
              <div className={`h-full rounded-full ${styles.bar}`} style={{ width: `${Math.max(4, Math.min(100, scoreOutOf100))}%` }} />
            </div>
          </div>

          <div className={`rounded-xl border p-3 ${isDark ? 'bg-slate-900/50 border-slate-800' : 'bg-slate-50 border-slate-200'}`}>
            <span className="text-[9px] font-mono font-bold uppercase leading-tight tracking-wider text-slate-400">Risk Level</span>
            <div className="mt-2 flex items-center gap-1.5">
              <RiskIcon className="h-4 w-4 shrink-0 text-red-400" />
                <span className="break-words text-[13px] font-black uppercase leading-tight text-white">{styles.label}</span>
            </div>
          </div>

          <div className={`rounded-xl border p-3 ${isDark ? 'bg-slate-900/50 border-slate-800' : 'bg-slate-50 border-slate-200'}`}>
            <span className="text-[9px] font-mono font-bold uppercase leading-tight tracking-wider text-slate-400">Landslide Probability</span>
              <div className="mt-2 text-[17px] font-black font-mono leading-none text-white">{probabilityPct}%</div>
          </div>

          <div className={`rounded-xl border p-3 ${isDark ? 'bg-slate-900/50 border-slate-800' : 'bg-slate-50 border-slate-200'}`}>
            <div className="flex items-center justify-between gap-2">
              <span className="text-[9px] font-mono font-bold uppercase leading-tight tracking-wider text-slate-400">Base ML Model</span>
                <Cpu className="h-3.5 w-3.5 shrink-0 text-cyan-400" />
            </div>
            <div className="mt-2 text-[16px] font-black font-mono leading-none text-cyan-300">{baseMlPct}%</div>
          </div>

          <div className={`rounded-xl border p-3 ${isDark ? 'bg-slate-900/50 border-slate-800' : 'bg-slate-50 border-slate-200'}`}>
            <div className="flex items-center justify-between gap-2">
              <span className="text-[9px] font-mono font-bold uppercase leading-tight tracking-wider text-slate-400">Seismic Adjustment</span>
                <Flame className="h-3.5 w-3.5 shrink-0 text-orange-400" />
            </div>
            <div className={`mt-2 text-[16px] font-black font-mono leading-none ${seismicAdjPct > 0 ? 'text-orange-400' : 'text-slate-400'}`}>
              +{seismicAdjPct}%
            </div>
          </div>

          <div className={`rounded-xl border p-3 ${isDark ? 'bg-slate-900/50 border-slate-800' : 'bg-slate-50 border-slate-200'}`}>
            <div className="flex items-center justify-between gap-2">
              <span className="text-[9px] font-mono font-bold uppercase leading-tight tracking-wider text-slate-400">Key Triggers</span>
                <CloudRain className="h-3.5 w-3.5 shrink-0 text-cyan-400" />
            </div>
            <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-[10px] leading-tight text-slate-300">
                <span>3d Rain: <strong>{rain3d} mm</strong></span>
              <span>Slope: <strong>{slopeDeg}°</strong></span>
            </div>
          </div>
        </div>

        <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 border-t border-slate-800/60 pt-3 text-[9px] leading-tight font-mono text-slate-400">
          <MapPin className="h-3 w-3 shrink-0 text-cyan-400" />
          <span>{locLat}° N, {locLon}° E</span>
          <span>•</span>
           <span>Elev: {elevM} m</span>
        </div>

        <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 border-t border-slate-800/60 pt-3 text-[9px] leading-tight font-mono text-slate-400">
          <span className="font-bold uppercase tracking-wider text-slate-500">Action</span>
          <strong className="break-words text-slate-200">{evaluation.action_code}</strong>
          <span className="text-slate-600">•</span>
          <span className="text-[8px]">Updated: {formatTime(evaluation.updated_at)}</span>
        </div>
      </div>
    </div>
  );
};

export default MlRiskScoreCard;
