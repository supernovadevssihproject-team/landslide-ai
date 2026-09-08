import React, { useState, useEffect } from 'react';
import { SENSOR_NODES, ASSET_URLS } from '../data/mockData';
import { LandslideApi } from '../services/api';
import {
  Activity,
  AlertOctagon,
  TrendingDown,
  Sliders,
  Clock,
  Radio,
  Zap,
  CheckCircle2,
  AlertTriangle,
  Info,
  ChevronRight,
  ShieldAlert,
  Droplets,
} from 'lucide-react';

interface TemporalLstmPredictorProps {
  onArmEvacuation: () => void;
}

export const TemporalLstmPredictor: React.FC<TemporalLstmPredictorProps> = ({
  onArmEvacuation,
}) => {
  // Sandbox rainfall slider (+0 to +60 mm/h added influx)
  const [extraRainfall, setExtraRainfall] = useState<number>(0);
  const [selectedSensorFilter, setSelectedSensorFilter] = useState<string>('all');

  // Dynamic calculations based on sandbox slider
  const [prediction, setPrediction] = useState<any>(null);

  useEffect(() => {
    let active = true;
    LandslideApi.predictLstm(extraRainfall).then((data) => {
      if (active) setPrediction(data);
    });
    return () => {
      active = false;
    };
  }, [extraRainfall]);

  const baseFoS = 0.98;
  const simulatedFoS = prediction?.simulated_fos ?? Math.max(0.68, +(baseFoS - extraRainfall * 0.005).toFixed(2));
  const basePwp = 284;
  const simulatedPwp = prediction?.simulated_pwp ?? Math.round(basePwp + extraRainfall * 1.8);
  const baseLeadHours = 4.52; // 4h 31m
  const simulatedLeadHours = prediction?.simulated_lead_hours ?? Math.max(0.75, +(baseLeadHours - extraRainfall * 0.06).toFixed(2));

  const hours = Math.floor(simulatedLeadHours);
  const minutes = Math.round((simulatedLeadHours - hours) * 60);
  const leadTimeDisplay = prediction?.lead_time_display ?? `${String(hours).padStart(2, '0')}h ${String(minutes).padStart(2, '0')}m 12s`;

  // Time labels for past 24h + 6h future prediction
  const timeLabels = prediction?.time_labels ?? ['-24h', '-18h', '-12h', '-6h', '-3h', 'NOW', '+2h', '+4h', '+6h'];

  // Trend for Chart 1: Rainfall & PWP
  const baseRainTrend = prediction?.rain_trend ?? [8, 14, 22, 45, 68, 85 + extraRainfall, 75 + extraRainfall, 60, 40];
  const pwpTrend = prediction?.pwp_trend ?? [180, 195, 215, 245, 270, simulatedPwp, simulatedPwp + 20, simulatedPwp + 35, simulatedPwp + 42];

  // FoS trend for Chart 2
  const fosTrend = prediction?.fos_trend ?? [1.52, 1.44, 1.32, 1.18, 1.05, simulatedFoS, Math.max(0.65, simulatedFoS - 0.08), Math.max(0.6, simulatedFoS - 0.15), Math.max(0.55, simulatedFoS - 0.22)];

  const filteredSensors =
    selectedSensorFilter === 'all'
      ? SENSOR_NODES
      : SENSOR_NODES.filter((s) => s.type === selectedSensorFilter);

  return (
    <div className="space-y-4 pb-12">
      {/* Executive Predictive AI Status Banner */}
      <div className="bg-[#0d1c2d] border border-[#93000a]/70 rounded-xl p-4 sm:p-5 relative overflow-hidden shadow-2xl">
        <div className="absolute top-0 right-0 w-80 h-80 bg-red-600/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div className="space-y-1.5">
            <div className="flex flex-wrap items-center gap-2">
              <span className="bg-[#93000a] text-white text-[11px] font-mono font-bold px-2 py-0.5 rounded flex items-center gap-1.5 animate-pulse">
                <AlertOctagon className="w-3.5 h-3.5" />
                CRITICAL THRESHOLD BREACHED
              </span>
              <span className="text-[11px] font-mono text-[#44d8f1] bg-[#00363e] px-2 py-0.5 rounded border border-[#00bcd4]/30">
                TEMPORAL LSTM-GEOTECH v3.8
              </span>
              <span className="text-[11px] font-mono text-[#bfc8cd]">
                ROC-AUC: <strong className="text-white">0.942</strong> | CROSS-VAL: <strong className="text-[#90cfec]">98.4%</strong>
              </span>
            </div>

            <h2 className="text-lg sm:text-xl font-bold text-white tracking-wide">
              Teesta Basin Artery (NH-10 Km 38.4) • Slope Shear Plane Failure
            </h2>
            <p className="text-xs sm:text-sm text-[#bfc8cd] max-w-3xl">
              Recurrent Long Short-Term Memory network has detected non-linear tertiary creep deformation.
              Pore water pressure exceeds critical shear threshold (FoS &lt; 1.0). Immediate mass movement anticipated.
            </p>
          </div>

          {/* Countdown timer card */}
          <div className="flex items-center gap-4 bg-[#051424]/90 border border-[#93000a] px-4 py-3 rounded-xl flex-shrink-0">
            <div className="flex flex-col items-center">
              <span className="text-[10px] font-mono uppercase tracking-wider text-[#ffdad6]">
                ESTIMATED LEAD TIME TO FAILURE
              </span>
              <span className="text-2xl sm:text-3xl font-bold font-mono text-[#ffb4ab] tracking-wider">
                {leadTimeDisplay}
              </span>
              <div className="flex items-center gap-1 text-[10px] text-[#ffb870] font-mono mt-0.5">
                <Clock className="w-3 h-3" />
                <span>Trigger window: 15:45 – 16:30 IST</span>
              </div>
            </div>

            <button
              onClick={onArmEvacuation}
              className="px-3.5 py-2.5 bg-[#93000a] hover:bg-[#b00020] text-white font-bold text-xs rounded-lg shadow-lg shadow-red-950/60 transition-all flex flex-col items-center justify-center gap-1 cursor-pointer"
            >
              <ShieldAlert className="w-4 h-4" />
              <span>ARM CAP SMS</span>
            </button>
          </div>
        </div>
      </div>

      {/* Cloudburst Influx Sandbox Simulation Slider */}
      <div className="bg-[#0d1c2d] border border-[#1c2b3c] rounded-xl p-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Sliders className="w-4 h-4 text-[#44d8f1]" />
            <div>
              <h3 className="text-xs sm:text-sm font-bold text-white uppercase tracking-wider">
                Cloudburst Influx Sandbox (Neural Stress-Test)
              </h3>
              <p className="text-[11px] text-[#8a9297]">
                Simulate additional torrential rainfall intensity to observe real-time FoS degradation and accelerated failure horizons.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3 bg-[#122131] px-3 py-1.5 rounded-lg border border-[#273647]">
            <span className="text-xs font-mono text-[#bfc8cd]">Simulated Influx:</span>
            <span className="text-sm font-bold font-mono text-[#44d8f1]">
              +{extraRainfall} mm/h
            </span>
          </div>
        </div>

        <div className="mt-3 flex items-center gap-4">
          <span className="text-xs font-mono text-[#8a9297]">0 mm/h (Base)</span>
          <input
            type="range"
            min={0}
            max={60}
            step={5}
            value={extraRainfall}
            onChange={(e) => setExtraRainfall(Number(e.target.value))}
            className="w-full h-2 bg-[#051424] rounded-lg appearance-none cursor-pointer accent-[#44d8f1]"
          />
          <span className="text-xs font-mono text-[#ffb4ab] font-bold">+60 mm/h (Extreme)</span>
        </div>

        {/* Live Simulation Outcomes */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 mt-3 pt-3 border-t border-[#1c2b3c]">
          <div className="bg-[#122131] p-2.5 rounded-lg">
            <span className="text-[10px] font-mono text-[#8a9297] block">Simulated FoS</span>
            <span className="text-base font-bold font-mono text-[#ffb4ab]">{simulatedFoS}</span>
            <span className="text-[9px] text-[#ffdad6] block">Unstable (&lt; 1.0)</span>
          </div>
          <div className="bg-[#122131] p-2.5 rounded-lg">
            <span className="text-[10px] font-mono text-[#8a9297] block">Simulated PWP</span>
            <span className="text-base font-bold font-mono text-[#ffb870]">{simulatedPwp} kPa</span>
            <span className="text-[9px] text-[#ffbc7a] block">+{simulatedPwp - basePwp} kPa Surge</span>
          </div>
          <div className="bg-[#122131] p-2.5 rounded-lg">
            <span className="text-[10px] font-mono text-[#8a9297] block">Evacuation Window</span>
            <span className="text-base font-bold font-mono text-[#90cfec]">{hours}h {minutes}m</span>
            <span className="text-[9px] text-[#93d3ef] block">Tightened lead time</span>
          </div>
          <div className="bg-[#122131] p-2.5 rounded-lg">
            <span className="text-[10px] font-mono text-[#8a9297] block">Escalation Protocol</span>
            <span className="text-xs font-bold font-mono text-white block truncate">
              {simulatedFoS < 0.8 ? 'LEVEL 3 MANDATORY' : 'STAGE 2 EVACUATION'}
            </span>
            <span className="text-[9px] text-[#ffb4ab] block">NH-10 Traffic Cessation</span>
          </div>
        </div>
      </div>

      {/* Dual Geotechnical Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Chart 1: Rainfall Infiltration vs Pore Water Pressure */}
        <div className="bg-[#0d1c2d] border border-[#1c2b3c] rounded-xl p-4 shadow-lg">
          <div className="flex items-center justify-between mb-2">
            <div>
              <h3 className="text-xs sm:text-sm font-bold text-white">
                Rainfall Influx vs Pore Water Pressure (PWP)
              </h3>
              <p className="text-[11px] text-[#8a9297] font-mono">
                Borehole PZW-SK-09 (18.5m BGL) • Doppler Telemetry
              </p>
            </div>
            <span className="text-[10px] font-mono text-[#44d8f1] bg-[#00363e] px-2 py-0.5 rounded border border-[#00bcd4]/30">
              DUAL AXIS
            </span>
          </div>

          {/* Chart SVG Canvas */}
          <div className="h-56 w-full relative">
            <svg className="w-full h-full" viewBox="0 0 500 200" preserveAspectRatio="none">
              <defs>
                <linearGradient id="pwpGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#ffb4ab" stopOpacity="0.4" />
                  <stop offset="100%" stopColor="#ffb4ab" stopOpacity="0.0" />
                </linearGradient>
                <linearGradient id="rainGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#44d8f1" stopOpacity="0.3" />
                  <stop offset="100%" stopColor="#44d8f1" stopOpacity="0.0" />
                </linearGradient>
              </defs>

              {/* Grid Lines */}
              <line x1="40" y1="20" x2="480" y2="20" stroke="#1c2b3c" strokeWidth="1" strokeDasharray="3 3" />
              <line x1="40" y1="70" x2="480" y2="70" stroke="#1c2b3c" strokeWidth="1" strokeDasharray="3 3" />
              <line x1="40" y1="120" x2="480" y2="120" stroke="#1c2b3c" strokeWidth="1" strokeDasharray="3 3" />
              <line x1="40" y1="170" x2="480" y2="170" stroke="#273647" strokeWidth="1" />

              {/* Critical PWP Threshold line (240 kPa = y:60) */}
              <line x1="40" y1="65" x2="480" y2="65" stroke="#ffb4ab" strokeWidth="1.2" strokeDasharray="4 2" />
              <text x="50" y="60" fill="#ffb4ab" fontSize="9" fontFamily="monospace">
                CRITICAL PWP THRESHOLD (240 kPa)
              </text>

              {/* "NOW" vertical divider */}
              <line x1="315" y1="20" x2="315" y2="170" stroke="#44d8f1" strokeWidth="1.5" strokeDasharray="2 2" />
              <text x="320" y="32" fill="#44d8f1" fontSize="9" fontFamily="monospace" fontWeight="bold">
                NOW (PREDICTION →)
              </text>

              {/* PWP Area & Line (kPa) */}
              {/* Map pwpTrend: min 150 (y:170), max 350 (y:20) */}
              {(() => {
                const points = pwpTrend.map((val, idx) => {
                  const x = 50 + idx * 53;
                  const y = 170 - ((val - 150) / 200) * 140;
                  return `${x},${y}`;
                });
                const dArea = `M 50,170 L ${points.join(' L ')} L 474,170 Z`;
                const dLine = `M ${points.join(' L ')}`;
                return (
                  <>
                    <path d={dArea} fill="url(#pwpGradient)" />
                    <path d={dLine} fill="none" stroke="#ffb4ab" strokeWidth="2.5" />
                    {points.map((pt, i) => {
                      const [cx, cy] = pt.split(',');
                      return (
                        <circle
                          key={i}
                          cx={cx}
                          cy={cy}
                          r={i === 5 ? '5' : '3'}
                          fill={i === 5 ? '#ffb4ab' : '#93000a'}
                          stroke="#ffdad6"
                          strokeWidth="1.5"
                        />
                      );
                    })}
                  </>
                );
              })()}

              {/* Rainfall Infiltration Bars (mm/h) */}
              {baseRainTrend.map((val, idx) => {
                const x = 45 + idx * 53;
                const h = (val / 150) * 80;
                const y = 170 - h;
                return (
                  <rect
                    key={idx}
                    x={x}
                    y={y}
                    width="10"
                    height={h}
                    fill="#00bcd4"
                    opacity="0.6"
                    rx="1"
                  />
                );
              })}

              {/* X axis labels */}
              {timeLabels.map((lbl, idx) => {
                const x = 45 + idx * 53;
                return (
                  <text key={idx} x={x} y="188" fill="#8a9297" fontSize="9" fontFamily="monospace">
                    {lbl}
                  </text>
                );
              })}
            </svg>
          </div>

          <div className="flex items-center justify-between text-[11px] font-mono mt-2 pt-2 border-t border-[#1c2b3c] text-[#bfc8cd]">
            <div className="flex items-center gap-3">
              <span className="flex items-center gap-1 text-[#ffb4ab]">
                <span className="w-2.5 h-1 bg-[#ffb4ab] inline-block" /> Pore Pressure (kPa)
              </span>
              <span className="flex items-center gap-1 text-[#44d8f1]">
                <span className="w-2 h-2 bg-[#00bcd4] inline-block" /> Rain Rate (mm/h)
              </span>
            </div>
            <span className="text-white font-bold">Current: {simulatedPwp} kPa</span>
          </div>
        </div>

        {/* Chart 2: Factor of Safety (FoS) Dynamic Stability Curve */}
        <div className="bg-[#0d1c2d] border border-[#1c2b3c] rounded-xl p-4 shadow-lg">
          <div className="flex items-center justify-between mb-2">
            <div>
              <h3 className="text-xs sm:text-sm font-bold text-white">
                Geotechnical Factor of Safety (FoS Curve)
              </h3>
              <p className="text-[11px] text-[#8a9297] font-mono">
                Infinite Slope Shear Resistance Ratio • Bishop Simplified
              </p>
            </div>
            <span className="text-[10px] font-mono text-[#ffb4ab] bg-[#93000a]/50 px-2 py-0.5 rounded border border-[#ffb4ab]/30">
              FoS = {simulatedFoS} (BREACH)
            </span>
          </div>

          {/* Chart SVG Canvas */}
          <div className="h-56 w-full relative">
            <svg className="w-full h-full" viewBox="0 0 500 200" preserveAspectRatio="none">
              {/* Zones: Stable (>1.3), Advisory (1.0-1.3), Failure (<1.0) */}
              {/* FoS scale: 0.4 (y:170) to 1.8 (y:20) */}
              <rect x="40" y="20" width="440" height="40" fill="#00bcd4" opacity="0.08" />
              <rect x="40" y="60" width="440" height="40" fill="#ffb870" opacity="0.08" />
              <rect x="40" y="100" width="440" height="70" fill="#93000a" opacity="0.18" />

              {/* Baseline reference lines */}
              <line x1="40" y1="60" x2="480" y2="60" stroke="#00bcd4" strokeWidth="1" strokeDasharray="3 3" />
              <text x="45" y="55" fill="#44d8f1" fontSize="9" fontFamily="monospace">
                STABLE THRESHOLD (FoS &gt; 1.3)
              </text>

              <line x1="40" y1="100" x2="480" y2="100" stroke="#ffb4ab" strokeWidth="1.5" />
              <text x="45" y="95" fill="#ffb4ab" fontSize="9" fontFamily="monospace" fontWeight="bold">
                FAILURE LIMIT (FoS = 1.0) — SLIP DEFORMATION
              </text>

              {/* Vertical NOW line */}
              <line x1="315" y1="20" x2="315" y2="170" stroke="#44d8f1" strokeWidth="1.5" strokeDasharray="2 2" />

              {/* FoS Curve Line */}
              {(() => {
                const points = fosTrend.map((val, idx) => {
                  const x = 50 + idx * 53;
                  // map val: 0.4 -> 170, 1.8 -> 20
                  const y = 170 - ((val - 0.4) / 1.4) * 150;
                  return `${x},${y}`;
                });
                const dLine = `M ${points.join(' L ')}`;
                return (
                  <>
                    <path d={dLine} fill="none" stroke="#ffb870" strokeWidth="3" />
                    {points.map((pt, i) => {
                      const [cx, cy] = pt.split(',');
                      const isBreached = fosTrend[i] < 1.0;
                      return (
                        <circle
                          key={i}
                          cx={cx}
                          cy={cy}
                          r={i === 5 ? '6' : '3.5'}
                          fill={isBreached ? '#ffb4ab' : '#ffb870'}
                          stroke={i === 5 ? '#ffffff' : '#051424'}
                          strokeWidth="2"
                        />
                      );
                    })}
                  </>
                );
              })()}

              {/* X axis labels */}
              {timeLabels.map((lbl, idx) => {
                const x = 45 + idx * 53;
                return (
                  <text key={idx} x={x} y="188" fill="#8a9297" fontSize="9" fontFamily="monospace">
                    {lbl}
                  </text>
                );
              })}
            </svg>
          </div>

          <div className="flex items-center justify-between text-[11px] font-mono mt-2 pt-2 border-t border-[#1c2b3c] text-[#bfc8cd]">
            <div className="flex items-center gap-3">
              <span className="text-[#ffb4ab] font-bold">● Active Breach (FoS &lt; 1.0)</span>
              <span className="text-[#8a9297]">Slope Velocity: 14.2 mm/h</span>
            </div>
            <span className="text-[#ffb4ab] bg-[#93000a]/30 px-2 py-0.5 rounded font-bold">
              NON-LINEAR TERTIARY CREEP
            </span>
          </div>
        </div>
      </div>

      {/* Ground Context Images Strip */}
      <div className="bg-[#0d1c2d] border border-[#1c2b3c] rounded-xl p-4">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Radio className="w-4 h-4 text-[#44d8f1]" />
            <h3 className="text-xs sm:text-sm font-bold text-white uppercase tracking-wider">
              Field Telemetry Node Ground Context (In-Situ Optical Feeds)
            </h3>
          </div>
          <span className="text-[10px] font-mono text-[#8a9297]">
            3 ACTIVE BOREHOLE & RADAR NODES
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {/* Node 1 */}
          <div className="bg-[#122131] border border-[#1c2b3c] rounded-lg overflow-hidden group">
            <div className="h-36 relative overflow-hidden">
              <img
                src={ASSET_URLS.boreholeAlpha}
                alt="Borehole Array Site Alpha"
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
              />
              <div className="absolute top-2 left-2 bg-[#051424]/85 text-[#44d8f1] border border-[#00bcd4]/30 px-2 py-0.5 rounded text-[10px] font-mono">
                SITE ALPHA • MANGAN
              </div>
              <div className="absolute bottom-2 right-2 bg-[#93000a] text-white px-1.5 py-0.5 rounded text-[9px] font-mono font-bold">
                PZW-SK-09
              </div>
            </div>
            <div className="p-2.5 text-xs">
              <div className="font-semibold text-white">Borehole Array Site Alpha</div>
              <p className="text-[11px] text-[#bfc8cd] mt-0.5">
                Multi-level vibrating wire piezometers installed at 12m, 18.5m &amp; 24m depth along slip surface.
              </p>
            </div>
          </div>

          {/* Node 2 */}
          <div className="bg-[#122131] border border-[#1c2b3c] rounded-lg overflow-hidden group">
            <div className="h-36 relative overflow-hidden">
              <img
                src={ASSET_URLS.acousticChamphai}
                alt="Acoustic Ring Champhai"
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
              />
              <div className="absolute top-2 left-2 bg-[#051424]/85 text-[#44d8f1] border border-[#00bcd4]/30 px-2 py-0.5 rounded text-[10px] font-mono">
                SHEAR SENSORS • GPH-ML-12
              </div>
              <div className="absolute bottom-2 right-2 bg-[#7d4800] text-[#ffbc7a] px-1.5 py-0.5 rounded text-[9px] font-mono font-bold">
                188 µm/s
              </div>
            </div>
            <div className="p-2.5 text-xs">
              <div className="font-semibold text-white">Acoustic Geophone Ring</div>
              <p className="text-[11px] text-[#bfc8cd] mt-0.5">
                Triaxial high-frequency microseismic geophones monitoring rock micro-cracking and shear fracturing.
              </p>
            </div>
          </div>

          {/* Node 3 */}
          <div className="bg-[#122131] border border-[#1c2b3c] rounded-lg overflow-hidden group">
            <div className="h-36 relative overflow-hidden">
              <img
                src={ASSET_URLS.awsRadarNode}
                alt="AWS Doppler Radar Node"
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
              />
              <div className="absolute top-2 left-2 bg-[#051424]/85 text-[#44d8f1] border border-[#00bcd4]/30 px-2 py-0.5 rounded text-[10px] font-mono">
                AWS METEOROLOGICAL MAST
              </div>
              <div className="absolute bottom-2 right-2 bg-[#00363e] text-[#44d8f1] px-1.5 py-0.5 rounded text-[9px] font-mono font-bold">
                AWS-AS-03
              </div>
            </div>
            <div className="p-2.5 text-xs">
              <div className="font-semibold text-white">AWS Doppler Influx Node</div>
              <p className="text-[11px] text-[#bfc8cd] mt-0.5">
                Tipping bucket rain gauge with integrated S-band Doppler radar precipitation telemetry receiver.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* In-Situ IoT Subsurface Sensor Array Table */}
      <div className="bg-[#0d1c2d] border border-[#1c2b3c] rounded-xl p-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-3">
          <div className="flex items-center gap-2">
            <Activity className="w-4 h-4 text-[#44d8f1]" />
            <h3 className="text-xs sm:text-sm font-bold text-white uppercase tracking-wider">
              In-Situ Subsurface Telemetry Grid (Realtime Telemetry Stream)
            </h3>
          </div>

          {/* Filter Pills */}
          <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar text-xs">
            <button
              onClick={() => setSelectedSensorFilter('all')}
              className={`px-2 py-1 rounded text-[11px] font-mono border ${
                selectedSensorFilter === 'all'
                  ? 'bg-[#1c2b3c] text-white border-[#44d8f1]'
                  : 'text-[#8a9297] border-[#273647]'
              }`}
            >
              ALL ({SENSOR_NODES.length})
            </button>
            <button
              onClick={() => setSelectedSensorFilter('piezometer')}
              className={`px-2 py-1 rounded text-[11px] font-mono border ${
                selectedSensorFilter === 'piezometer'
                  ? 'bg-[#1c2b3c] text-white border-[#44d8f1]'
                  : 'text-[#8a9297] border-[#273647]'
              }`}
            >
              PIEZOMETERS
            </button>
            <button
              onClick={() => setSelectedSensorFilter('inclinometer')}
              className={`px-2 py-1 rounded text-[11px] font-mono border ${
                selectedSensorFilter === 'inclinometer'
                  ? 'bg-[#1c2b3c] text-white border-[#44d8f1]'
                  : 'text-[#8a9297] border-[#273647]'
              }`}
            >
              INCLINOMETERS
            </button>
            <button
              onClick={() => setSelectedSensorFilter('acoustic')}
              className={`px-2 py-1 rounded text-[11px] font-mono border ${
                selectedSensorFilter === 'acoustic'
                  ? 'bg-[#1c2b3c] text-white border-[#44d8f1]'
                  : 'text-[#8a9297] border-[#273647]'
              }`}
            >
              ACOUSTIC
            </button>
          </div>
        </div>

        {/* Table layout on desktop, cards on mobile */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-[#1c2b3c] text-[#8a9297] font-mono text-[10px] uppercase">
                <th className="py-2.5 px-3">Node Code</th>
                <th className="py-2.5 px-3">Location &amp; Depth</th>
                <th className="py-2.5 px-3">Live Telemetry</th>
                <th className="py-2.5 px-3">Threshold Limit</th>
                <th className="py-2.5 px-3">Status</th>
                <th className="py-2.5 px-3">Uplink</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#1c2b3c] font-sans">
              {filteredSensors.map((sensor) => (
                <tr key={sensor.id} className="hover:bg-[#122131]/60 transition-colors">
                  <td className="py-2.5 px-3 font-mono font-bold text-white whitespace-nowrap">
                    {sensor.id}
                  </td>
                  <td className="py-2.5 px-3">
                    <div className="font-semibold text-[#d4e4fa] truncate max-w-xs">
                      {sensor.location}
                    </div>
                    <div className="text-[10px] text-[#8a9297] font-mono">
                      {sensor.depth || sensor.coordinates}
                    </div>
                  </td>
                  <td className="py-2.5 px-3 font-mono font-bold text-white whitespace-nowrap">
                    <span
                      className={
                        sensor.status === 'critical'
                          ? 'text-[#ffb4ab]'
                          : sensor.status === 'torrential'
                          ? 'text-[#ffb870]'
                          : 'text-[#44d8f1]'
                      }
                    >
                      {sensor.currentValue}
                    </span>
                    <span className="text-[10px] text-[#8a9297] font-normal block font-sans">
                      {sensor.currentValueSub}
                    </span>
                  </td>
                  <td className="py-2.5 px-3 font-mono text-[#bfc8cd] whitespace-nowrap">
                    {sensor.warningThreshold}
                  </td>
                  <td className="py-2.5 px-3 whitespace-nowrap">
                    <span
                      className={`inline-block px-2 py-0.5 rounded text-[10px] font-mono font-bold ${
                        sensor.status === 'critical'
                          ? 'bg-[#93000a] text-[#ffdad6]'
                          : sensor.status === 'torrential'
                          ? 'bg-[#7d4800] text-[#ffbc7a]'
                          : 'bg-[#00363e] text-[#44d8f1]'
                      }`}
                    >
                      {sensor.statusLabel}
                    </span>
                  </td>
                  <td className="py-2.5 px-3 font-mono text-[11px] text-[#8a9297] whitespace-nowrap">
                    {sensor.uplink} ({sensor.lastSync})
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
