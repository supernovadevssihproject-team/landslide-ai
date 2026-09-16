import React, { useState } from 'react';
import { HazardZone, OperationalModule } from '../types';
import { MONTHLY_HISTORICAL_DATA, RELIEF_SHELTERS } from '../data/mockData';
import {
  ArrowLeft,
  AlertTriangle,
  CloudRain,
  Droplets,
  TrendingUp,
  Shield,
  Activity,
  MapPin,
  Compass,
  Navigation,
  CheckCircle2,
  ExternalLink,
  ChevronRight,
  Info,
  Layers,
  Thermometer,
  Calendar,
  Sparkles,
  ShieldAlert,
} from 'lucide-react';
import { useI18n } from '../i18n/index.tsx';

interface TerraRiskDetailsProps {
  selectedZone: HazardZone;
  onSelectZone: (zone: HazardZone) => void;
  zones: HazardZone[];
  onNavigate: (module: OperationalModule) => void;
  theme: 'dark' | 'light';
}

type MetricCategory = 'rainfall' | 'soil_moisture' | 'temperature' | 'events';

type MetricTabConfig = {
  id: MetricCategory;
  label: string;
  unit: string;
  icon: React.ReactNode;
  color: string;
};

export const TerraRiskDetails: React.FC<TerraRiskDetailsProps> = ({
  selectedZone,
  onSelectZone,
  zones,
  onNavigate,
  theme,
}) => {
  const { t } = useI18n();
  const [activeMetricTab, setActiveMetricTab] = useState<MetricCategory>('rainfall');
  const [hoveredMonth, setHoveredMonth] = useState<string | null>(null);

  const isDark = theme === 'dark';

  // Calculate risk percentage numeric value from zone
  const riskScoreNum = selectedZone.riskStatus.includes('CRITICAL')
    ? 85
    : selectedZone.riskStatus.includes('ADVISORY')
    ? 68
    : 35;

  const riskLabel = selectedZone.riskStatus.includes('CRITICAL')
    ? 'High Risk'
    : selectedZone.riskStatus.includes('ADVISORY')
    ? 'Moderate Risk'
    : 'Low Risk';

  const riskColor = selectedZone.riskStatus.includes('CRITICAL')
    ? '#ef4444'
    : selectedZone.riskStatus.includes('ADVISORY')
    ? '#f59e0b'
    : '#10b981';

  // SVG circular gauge properties
  const radius = 64;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (riskScoreNum / 100) * circumference;

  // Monthly dataset for the active tab
  const monthlyData = MONTHLY_HISTORICAL_DATA[activeMetricTab];

  // Find max value in dataset to scale bars nicely
  const maxVal = Math.max(
    ...monthlyData.map((d) => Math.max(d.historicalAvg, d.current)),
    10
  );

  const rainfallSeries = MONTHLY_HISTORICAL_DATA.rainfall;
  const landslideSeries = MONTHLY_HISTORICAL_DATA.events;
  const lineChartWidth = 760;
  const lineChartHeight = 250;
  const lineChartPadding = { top: 18, right: 42, bottom: 30, left: 42 };
  const lineChartInnerWidth = lineChartWidth - lineChartPadding.left - lineChartPadding.right;
  const lineChartInnerHeight = lineChartHeight - lineChartPadding.top - lineChartPadding.bottom;
  const rainfallMax = Math.max(...rainfallSeries.map((item) => item.current), 1);
  const landslideMax = Math.max(...landslideSeries.map((item) => item.current), 1);
  const linePoint = (index: number, value: number, max: number) => ({
    x: lineChartPadding.left + (index / (rainfallSeries.length - 1)) * lineChartInnerWidth,
    y: lineChartPadding.top + lineChartInnerHeight - (value / max) * lineChartInnerHeight,
  });
  const rainfallLinePoints = rainfallSeries
    .map((item, index) => {
      const point = linePoint(index, item.current, rainfallMax);
      return `${point.x},${point.y}`;
    })
    .join(' ');
  const landslideLinePoints = landslideSeries
    .map((item, index) => {
      const point = linePoint(index, item.current, landslideMax);
      return `${point.x},${point.y}`;
    })
    .join(' ');

  // Filter shelters for current state or fallback to top shelters
  const sheltersForZone = RELIEF_SHELTERS.filter(
    (s) => s.state.toLowerCase() === selectedZone.state.toLowerCase()
  );
  const displayShelters =
    sheltersForZone.length > 0 ? sheltersForZone : RELIEF_SHELTERS.slice(0, 3);

  // Tab metadata
  const metricTabConfigs: Record<MetricCategory, MetricTabConfig> = {
    rainfall: {
      id: 'rainfall',
      label: 'Rainfall',
      unit: 'mm',
      icon: <CloudRain className="w-4 h-4" />,
      color: '#3b82f6',
    },
    soil_moisture: {
      id: 'soil_moisture',
      label: 'Soil Moisture',
      unit: '%',
      icon: <Droplets className="w-4 h-4" />,
      color: '#06b6d4',
    },
    temperature: {
      id: 'temperature',
      label: 'Temperature',
      unit: '°C',
      icon: <Thermometer className="w-4 h-4" />,
      color: '#f97316',
    },
    events: {
      id: 'events',
      label: 'Landslide Events',
      unit: 'incidents',
      icon: <Activity className="w-4 h-4" />,
      color: '#ef4444',
    },
  };
  const tabConfigs = metricTabConfigs[activeMetricTab];

  return (
    <div
      className={`min-h-screen py-8 px-4 sm:px-6 lg:px-8 transition-colors duration-200 ${
        isDark ? 'bg-[#090e17] text-slate-100' : 'bg-[#f4f7fa] text-slate-900'
      }`}
    >
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Navigation Breadcrumb & Zone Selector */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <button
            onClick={() => onNavigate('risk-map')}
            className={`inline-flex items-center gap-2 text-sm font-semibold transition-all px-3 py-1.5 rounded-lg border ${
              isDark
                ? 'bg-slate-800/80 hover:bg-slate-800 text-slate-200 border-slate-700'
                : 'bg-white hover:bg-slate-100 text-slate-700 border-slate-200 shadow-sm'
            }`}
          >
            <ArrowLeft className="w-4 h-4 text-emerald-500" />
            <span>{t('riskDetails.backToMap')}</span>
          </button>

          {/* Quick Zone Picker Dropdown */}
          <div className="flex items-center gap-2">
            <span
              className={`text-xs font-medium uppercase tracking-wider ${
                isDark ? 'text-slate-400' : 'text-slate-500'
              }`}
            >
              {t('riskDetails.inspectingZone')}
            </span>
            <select
              value={selectedZone.id}
              onChange={(e) => {
                const z = zones.find((item) => item.id === e.target.value);
                if (z) onSelectZone(z);
              }}
              className={`text-xs sm:text-sm font-semibold rounded-lg px-3 py-1.5 border outline-none cursor-pointer ${
                isDark
                  ? 'bg-slate-800 text-slate-100 border-slate-700 focus:border-emerald-500'
                  : 'bg-white text-slate-800 border-slate-300 focus:border-emerald-600 shadow-sm'
              }`}
            >
              {zones.map((z) => (
                <option key={z.id} value={z.id}>
                  {z.name} ({z.riskStatus.includes('CRITICAL') ? 'HIGH' : z.riskStatus.includes('ADVISORY') ? 'MED' : 'LOW'})
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Header Title Section */}
        <div
          className={`p-6 rounded-2xl border transition-all ${
            isDark
              ? 'bg-gradient-to-r from-slate-900 via-slate-850 to-slate-900 border-slate-800'
              : 'bg-white border-slate-200 shadow-sm'
          }`}
        >
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
            <div>
              <div className="flex items-center gap-3">
                <span className="p-2 rounded-xl bg-red-500/10 border border-red-500/20 text-red-500">
                  <ShieldAlert className="w-6 h-6" />
                </span>
                <div>
                  <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">
                    {t('riskDetails.title')} - {selectedZone.name}
                  </h1>
                  <p
                    className={`text-xs sm:text-sm mt-0.5 ${
                      isDark ? 'text-slate-400' : 'text-slate-500'
                    }`}
                  >
                    Corridor: <span className="font-semibold text-emerald-500">{selectedZone.corridor}</span> • Coordinates: {selectedZone.coords} • Elevation: {selectedZone.elevation}
                  </p>
                </div>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <span
                className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-bold uppercase tracking-wider ${
                  selectedZone.riskStatus.includes('CRITICAL')
                    ? 'bg-red-500/15 text-red-500 border border-red-500/30'
                    : selectedZone.riskStatus.includes('ADVISORY')
                    ? 'bg-amber-500/15 text-amber-500 border border-amber-500/30'
                    : 'bg-emerald-500/15 text-emerald-500 border border-emerald-500/30'
                }`}
              >
                <span
                  className={`w-2 h-2 rounded-full ${
                    selectedZone.riskStatus.includes('CRITICAL')
                      ? 'bg-red-500 animate-ping'
                      : selectedZone.riskStatus.includes('ADVISORY')
                      ? 'bg-amber-500'
                      : 'bg-emerald-500'
                  }`}
                />
                {selectedZone.riskStatus}
              </span>
              <span
                className={`text-xs px-2.5 py-1 rounded-md ${
                  isDark ? 'bg-slate-800 text-slate-400' : 'bg-slate-100 text-slate-600'
                }`}
              >
                {t('riskDetails.telemetryUpdated')}
              </span>
            </div>
          </div>
        </div>

        {/* Main Grid: Screen 4 Core Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left Column: Radial Risk Score & "Why is the risk high?" (5 cols) */}
          <div
            className={`lg:col-span-5 p-6 rounded-2xl border flex flex-col justify-between ${
              isDark
                ? 'bg-slate-900/90 border-slate-800'
                : 'bg-white border-slate-200 shadow-sm'
            }`}
          >
            <div>
              <div className="flex items-center justify-between border-b pb-4 mb-5 border-slate-200 dark:border-slate-800">
                <div className="flex items-center gap-2">
                  <Activity className="w-5 h-5 text-red-500" />
                  <h2 className="text-lg font-bold">{t('riskDetails.assessment')}</h2>
                </div>
                <span className="text-xs text-slate-400 font-mono">{t('riskDetails.mlConfidence')} {selectedZone.rfConfidence}</span>
              </div>

              {/* Circular Gauge / Radial Meter */}
              <div className="flex flex-col items-center justify-center my-4">
                <div className="relative w-44 h-44 flex items-center justify-center">
                  <svg className="w-full h-full transform -rotate-90" viewBox="0 0 160 160">
                    {/* Background Track */}
                    <circle
                      cx="80"
                      cy="80"
                      r={radius}
                      stroke={isDark ? '#1e293b' : '#e2e8f0'}
                      strokeWidth="14"
                      fill="transparent"
                    />
                    {/* Active Progress Ring */}
                    <circle
                      cx="80"
                      cy="80"
                      r={radius}
                      stroke={riskColor}
                      strokeWidth="14"
                      strokeDasharray={circumference}
                      strokeDashoffset={strokeDashoffset}
                      strokeLinecap="round"
                      fill="transparent"
                      className="transition-all duration-1000 ease-out"
                    />
                  </svg>
                  <div className="absolute flex flex-col items-center justify-center text-center">
                    <span className="text-4xl font-black tracking-tight" style={{ color: riskColor }}>
                      {riskScoreNum}%
                    </span>
                    <span
                      className={`text-xs font-extrabold uppercase tracking-wider px-2 py-0.5 rounded-full mt-1 ${
                        selectedZone.riskStatus.includes('CRITICAL')
                          ? 'bg-red-500/20 text-red-500'
                          : selectedZone.riskStatus.includes('ADVISORY')
                          ? 'bg-amber-500/20 text-amber-500'
                          : 'bg-emerald-500/20 text-emerald-500'
                      }`}
                    >
                      {riskLabel}
                    </span>
                  </div>
                </div>
                <p
                  className={`text-xs mt-3 text-center max-w-xs ${
                    isDark ? 'text-slate-400' : 'text-slate-500'
                  }`}
                >
                  Aggregated multi-factor score derived from RF Classifier, InSAR kinematics, and catchment rainfall index.
                </p>
              </div>

              {/* "Why is the risk high?" Analysis List */}
              <div className="mt-6 pt-5 border-t border-slate-200 dark:border-slate-800">
                <h3 className="text-sm font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-3">
                  {t('riskDetails.whyRiskHigh')}
                </h3>
                <ul className="space-y-2.5 text-xs sm:text-sm">
                  <li className="flex items-start gap-2.5">
                    <span className="w-2 h-2 rounded-full bg-red-500 mt-1.5 shrink-0" />
                    <span>
                      <strong className="text-red-500">Intense 48h Precipitation:</strong> Cumulative rainfall at {selectedZone.name} reached critical trigger levels (120mm+ recorded).
                    </span>
                  </li>
                  <li className="flex items-start gap-2.5">
                    <span className="w-2 h-2 rounded-full bg-amber-500 mt-1.5 shrink-0" />
                    <span>
                      <strong className="text-amber-500">Steep Slope Gradient:</strong> Measured at {selectedZone.slopeGradient}, exceeding the angle of repose for loose regolith.
                    </span>
                  </li>
                  <li className="flex items-start gap-2.5">
                    <span className="w-2 h-2 rounded-full bg-amber-500 mt-1.5 shrink-0" />
                    <span>
                      <strong className="text-amber-500">Extreme Soil Saturation:</strong> Soil pore water pressure reached {selectedZone.pwpPressure} ({selectedZone.soilPoreSaturation} saturated), eliminating cohesive shear resistance.
                    </span>
                  </li>
                  <li className="flex items-start gap-2.5">
                    <span className="w-2 h-2 rounded-full bg-blue-500 mt-1.5 shrink-0" />
                    <span>
                      <strong className="text-blue-500">Active Geomorphic Creep:</strong> Sub-surface displacement rate is currently accelerating at {selectedZone.displacementRate}.
                    </span>
                  </li>
                </ul>
              </div>
            </div>

            {/* Quick action: Navigate to GIS */}
            <div className="mt-6 pt-4 border-t border-slate-200 dark:border-slate-800">
              <button
                onClick={() => onNavigate('risk-map')}
                className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-sm transition-all shadow-md shadow-emerald-600/20"
              >
                <Layers className="w-4 h-4" />
                <span>{t('riskDetails.satelliteHeatmap')}</span>
              </button>
            </div>
          </div>

          {/* Right Column: Comparative Historical Chart & Shelters (7 cols) */}
          <div className="lg:col-span-7 space-y-6">
            {/* Chart Card */}
            <div
              className={`p-6 rounded-2xl border ${
                isDark
                  ? 'bg-slate-900/90 border-slate-800'
                  : 'bg-white border-slate-200 shadow-sm'
              }`}
            >
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b pb-4 mb-4 border-slate-200 dark:border-slate-800">
                <div>
                  <h3 className="text-base sm:text-lg font-bold">Historical vs. Current Trends</h3>
                  <p className={`text-xs ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                    Comparing historical 10-year monthly baseline against 2026 recorded measurements
                  </p>
                </div>

                {/* Metric switcher tabs */}
                <div
                  className={`flex flex-wrap p-1 rounded-xl border text-xs font-medium ${
                    isDark ? 'bg-slate-800/80 border-slate-700' : 'bg-slate-100 border-slate-200'
                  }`}
                >
                  {(['rainfall', 'soil_moisture', 'temperature', 'events'] as MetricCategory[]).map(
                    (tab) => (
                      <button
                        key={tab}
                        onClick={() => setActiveMetricTab(tab)}
                        className={`px-3 py-1.5 rounded-lg transition-all capitalize ${
                          activeMetricTab === tab
                            ? 'bg-emerald-600 text-white shadow font-semibold'
                            : isDark
                            ? 'text-slate-300 hover:text-white'
                            : 'text-slate-600 hover:text-slate-900'
                        }`}
                      >
                        {tab.replace('_', ' ')}
                      </button>
                    )
                  )}
                </div>
              </div>

              {/* Chart Legend */}
              <div className="flex items-center justify-between mb-4 text-xs">
                <span className="font-semibold text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                  {tabConfigs.icon}
                  <span>
                    Metric: {tabConfigs.label} ({tabConfigs.unit})
                  </span>
                </span>
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-1.5">
                    <span className="w-3 h-3 rounded-sm bg-slate-400 dark:bg-slate-600 inline-block" />
                    <span className={isDark ? 'text-slate-300' : 'text-slate-600'}>Historical Avg</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span
                      className="w-3 h-3 rounded-sm inline-block"
                      style={{ backgroundColor: tabConfigs.color }}
                    />
                    <span className="font-semibold" style={{ color: tabConfigs.color }}>
                      2026 Current
                    </span>
                  </div>
                </div>
              </div>

              {/* Rainfall and landslide event relationship */}
              <div className={`mb-5 rounded-xl border p-3 sm:p-4 ${isDark ? 'border-slate-800 bg-slate-950/50' : 'border-slate-200 bg-slate-50/70'}`}>
                <div className="mb-3 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <h4 className="text-sm font-bold">Rainfall vs. Landslide Activity</h4>
                    <p className={`text-[11px] ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                      Monthly 2026 trend for the monitored corridor
                    </p>
                  </div>
                  <div className="flex items-center gap-3 text-[11px] font-medium">
                    <span className="flex items-center gap-1.5 text-blue-500"><span className="h-2 w-5 rounded-full bg-blue-500" />Rainfall (mm)</span>
                    <span className="flex items-center gap-1.5 text-red-500"><span className="h-2 w-5 rounded-full bg-red-500" />Landslides</span>
                  </div>
                </div>

                <div className="relative overflow-x-auto">
                  {hoveredMonth && (() => {
                    const rainfallPoint = rainfallSeries.find((item) => item.month === hoveredMonth);
                    const landslidePoint = landslideSeries.find((item) => item.month === hoveredMonth);
                    return rainfallPoint && landslidePoint ? (
                      <div className={`absolute left-1/2 top-0 z-10 -translate-x-1/2 rounded-lg border px-3 py-1.5 text-[11px] font-mono shadow-lg ${isDark ? 'border-slate-700 bg-slate-800 text-white' : 'border-slate-300 bg-white text-slate-800'}`}>
                        <strong className="text-emerald-500">{hoveredMonth}</strong>: {rainfallPoint.current} mm rain • {landslidePoint.current} landslides
                      </div>
                    ) : null;
                  })()}
                  <svg viewBox={`0 0 ${lineChartWidth} ${lineChartHeight}`} className="min-w-[560px] w-full" role="img" aria-label="Monthly rainfall and landslide activity line chart">
                    {[0, 0.5, 1].map((ratio) => {
                      const y = lineChartPadding.top + lineChartInnerHeight * ratio;
                      return <line key={ratio} x1={lineChartPadding.left} x2={lineChartWidth - lineChartPadding.right} y1={y} y2={y} stroke={isDark ? '#273647' : '#cbd5e1'} strokeDasharray="4 5" />;
                    })}
                    <text x="8" y={lineChartPadding.top + 4} fill="#3b82f6" fontSize="10">{rainfallMax} mm</text>
                    <text x="14" y={lineChartHeight - lineChartPadding.bottom} fill="#3b82f6" fontSize="10">0</text>
                    <text x={lineChartWidth - 34} y={lineChartPadding.top + 4} fill="#ef4444" fontSize="10" textAnchor="end">{landslideMax}</text>
                    <text x={lineChartWidth - 34} y={lineChartHeight - lineChartPadding.bottom} fill="#ef4444" fontSize="10" textAnchor="end">0</text>
                    <polyline points={rainfallLinePoints} fill="none" stroke="#3b82f6" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
                    <polyline points={landslideLinePoints} fill="none" stroke="#ef4444" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
                    {rainfallSeries.map((item, index) => {
                      const rainfallPoint = linePoint(index, item.current, rainfallMax);
                      const landslidePoint = linePoint(index, landslideSeries[index].current, landslideMax);
                      const isHovered = hoveredMonth === item.month;
                      return (
                        <g key={item.month} onMouseEnter={() => setHoveredMonth(item.month)} onMouseLeave={() => setHoveredMonth(null)} className="cursor-pointer">
                          <circle cx={rainfallPoint.x} cy={rainfallPoint.y} r={isHovered ? 5 : 3.5} fill="#3b82f6" stroke={isDark ? '#0f172a' : '#fff'} strokeWidth="2" />
                          <circle cx={landslidePoint.x} cy={landslidePoint.y} r={isHovered ? 5 : 3.5} fill="#ef4444" stroke={isDark ? '#0f172a' : '#fff'} strokeWidth="2" />
                          <text x={rainfallPoint.x} y={lineChartHeight - 9} fill={isHovered ? '#10b981' : isDark ? '#94a3b8' : '#64748b'} fontSize="10" textAnchor="middle" fontWeight={isHovered ? '700' : '400'}>{item.month}</text>
                        </g>
                      );
                    })}
                  </svg>
                </div>
              </div>

              {/* Bar Chart Visualization */}
              <div className="relative pt-6 pb-2">
                <div className="h-56 flex items-end justify-between gap-1 sm:gap-3">
                  {monthlyData.map((item) => {
                    const histHeight = Math.max((item.historicalAvg / maxVal) * 100, 4);
                    const currHeight = Math.max((item.current / maxVal) * 100, 4);
                    const isHovered = hoveredMonth === item.month;

                    return (
                      <div
                        key={item.month}
                        className="flex-1 flex flex-col items-center h-full justify-end group cursor-pointer"
                        onMouseEnter={() => setHoveredMonth(item.month)}
                        onMouseLeave={() => setHoveredMonth(null)}
                      >
                        {/* Tooltip on Hover */}
                        {isHovered && (
                          <div
                            className={`absolute -top-1 px-3 py-1.5 rounded-lg text-xs font-mono border shadow-lg z-20 pointer-events-none transition-all ${
                              isDark
                                ? 'bg-slate-800 text-white border-slate-700'
                                : 'bg-white text-slate-800 border-slate-300'
                            }`}
                          >
                            <span className="font-bold text-emerald-500">{item.month}:</span> Hist: {item.historicalAvg} {tabConfigs.unit} | 2026: {item.current} {tabConfigs.unit}
                          </div>
                        )}

                        {/* Dual Bars */}
                        <div className="w-full flex items-end justify-center gap-1 h-44">
                          {/* Historical Bar */}
                          <div
                            style={{ height: `${histHeight}%` }}
                            className={`w-1/2 rounded-t-sm transition-all duration-300 ${
                              isDark ? 'bg-slate-700 group-hover:bg-slate-600' : 'bg-slate-300 group-hover:bg-slate-400'
                            }`}
                            title={`Historical: ${item.historicalAvg} ${tabConfigs.unit}`}
                          />
                          {/* Current Bar */}
                          <div
                            style={{
                              height: `${currHeight}%`,
                              backgroundColor: tabConfigs.color,
                            }}
                            className="w-1/2 rounded-t-sm transition-all duration-300 shadow-sm opacity-90 group-hover:opacity-100"
                            title={`2026 Current: ${item.current} ${tabConfigs.unit}`}
                          />
                        </div>

                        {/* Month Label */}
                        <span
                          className={`mt-2 text-[11px] font-medium transition-colors ${
                            isHovered
                              ? 'text-emerald-500 font-bold'
                              : isDark
                              ? 'text-slate-400'
                              : 'text-slate-500'
                          }`}
                        >
                          {item.month}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Bottom Chart Insight Summary */}
              <div
                className={`mt-4 p-3 rounded-xl flex items-center justify-between text-xs ${
                  isDark ? 'bg-slate-800/60 text-slate-300' : 'bg-slate-50 text-slate-700'
                }`}
              >
                <div className="flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-amber-400" />
                  <span>
                    <strong>Insight:</strong> 2026 Monsoon peaks in July-August exceed 10-year historical baseline by{' '}
                    <strong className="text-red-500">+42.8%</strong>.
                  </span>
                </div>
                <span className="hidden sm:inline font-mono text-[11px] text-slate-400">
                  Data Source: IMD & GSI Telemetry
                </span>
              </div>
            </div>

            {/* Nearby Shelters & Safe Evacuation Routes */}
            <div
              className={`p-6 rounded-2xl border ${
                isDark
                  ? 'bg-slate-900/90 border-slate-800'
                  : 'bg-white border-slate-200 shadow-sm'
              }`}
            >
              <div className="flex items-center justify-between border-b pb-4 mb-4 border-slate-200 dark:border-slate-800">
                <div className="flex items-center gap-2">
                  <Shield className="w-5 h-5 text-emerald-500" />
                  <h3 className="text-base sm:text-lg font-bold">
                    Designated Relief Shelters & Safe Corridors
                  </h3>
                </div>
                <button
                  onClick={() => onNavigate('emergency-sos')}
                  className="text-xs text-red-500 hover:text-red-600 font-bold flex items-center gap-1"
                >
                  <span>Emergency Helplines</span>
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>

              <div className="space-y-3">
                {displayShelters.map((shelter) => (
                  <div
                    key={shelter.id}
                    className={`p-4 rounded-xl border transition-all ${
                      isDark
                        ? 'bg-slate-800/50 border-slate-700/70 hover:border-slate-600'
                        : 'bg-slate-50 border-slate-200 hover:border-slate-300'
                    }`}
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                      <div>
                        <div className="flex items-center gap-2">
                          <h4 className="font-bold text-sm">{shelter.name}</h4>
                          <span
                            className={`text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full ${
                              shelter.status === 'CRITICAL'
                                ? 'bg-red-500/20 text-red-500'
                                : 'bg-emerald-500/20 text-emerald-500'
                            }`}
                          >
                            {shelter.status}
                          </span>
                        </div>
                        <p
                          className={`text-xs mt-0.5 ${
                            isDark ? 'text-slate-400' : 'text-slate-500'
                          }`}
                        >
                          <MapPin className="w-3 h-3 inline mr-1 text-emerald-500" />
                          {shelter.location}
                        </p>
                      </div>

                      <div className="flex items-center gap-3">
                        <div className="text-right">
                          <div className="text-xs font-bold">
                            {shelter.capacityCurrent} / {shelter.capacityMax}
                          </div>
                          <div className="text-[10px] text-slate-400">Capacity ({shelter.occupancyPercent}%)</div>
                        </div>
                        <button
                          onClick={() => onNavigate('risk-map')}
                          className="px-3 py-1.5 rounded-lg bg-emerald-600/10 hover:bg-emerald-600 text-emerald-500 hover:text-white border border-emerald-500/30 text-xs font-semibold transition-all flex items-center gap-1"
                        >
                          <Navigation className="w-3 h-3" />
                          <span>View Route</span>
                        </button>
                      </div>
                    </div>

                    {/* Progress Bar & Supplies */}
                    <div className="mt-3">
                      <div
                        className={`w-full h-1.5 rounded-full overflow-hidden ${
                          isDark ? 'bg-slate-700' : 'bg-slate-200'
                        }`}
                      >
                        <div
                          className={`h-full rounded-full ${
                            shelter.occupancyPercent > 80 ? 'bg-red-500' : 'bg-emerald-500'
                          }`}
                          style={{ width: `${shelter.occupancyPercent}%` }}
                        />
                      </div>
                      <div className="flex flex-wrap items-center justify-between text-[11px] text-slate-400 mt-1.5">
                        <span>Rations: {shelter.rationsDays}</span>
                        <span>Power: {shelter.gensetStatus}</span>
                        <span>Medical: {shelter.medicalActive ? 'Active Team on Duty' : 'Standby'}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Live Warning Zones Marquee / Telemetry Strip */}
        <div
          className={`p-5 rounded-2xl border ${
            isDark
              ? 'bg-slate-900/90 border-slate-800'
              : 'bg-white border-slate-200 shadow-sm'
          }`}
        >
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-amber-500" />
              <span>Current High & Medium Warning Corridors</span>
            </h3>
            <span className="text-xs font-mono text-emerald-500">{t('riskDetails.liveSatellite')}</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {zones
              .filter((z) => !z.riskStatus.includes('NOMINAL'))
              .map((z) => (
                <div
                  key={z.id}
                  onClick={() => onSelectZone(z)}
                  className={`p-3 rounded-xl border cursor-pointer transition-all ${
                    selectedZone.id === z.id
                      ? 'border-emerald-500 bg-emerald-500/10'
                      : isDark
                      ? 'bg-slate-800/40 border-slate-700/60 hover:border-slate-600'
                      : 'bg-slate-50 border-slate-200 hover:border-slate-300'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-xs truncate max-w-[130px]">{z.name}</span>
                    <span
                      className={`text-[9px] font-bold px-1.5 py-0.5 rounded ${
                        z.riskStatus.includes('CRITICAL')
                          ? 'bg-red-500/20 text-red-500'
                          : 'bg-amber-500/20 text-amber-500'
                      }`}
                    >
                      {z.riskStatus.includes('CRITICAL') ? 'HIGH' : 'MED'}
                    </span>
                  </div>
                  <div className="mt-2 grid grid-cols-2 gap-1 text-[10px] text-slate-400">
                    <div>Pore Sat: <span className="text-slate-200 font-semibold">{z.soilPoreSaturation}</span></div>
                    <div>Disp: <span className="text-slate-200 font-semibold">{z.displacementRate}</span></div>
                    <div>Slope: <span className="text-slate-200 font-semibold">{z.slopeGradient}</span></div>
                    <div>Evac: <span className="text-emerald-400 font-semibold">{z.lstmEvac}</span></div>
                  </div>
                </div>
              ))}
          </div>
        </div>
      </div>
    </div>
  );
};
