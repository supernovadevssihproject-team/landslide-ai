import React, { useEffect, useMemo, useState } from 'react';

import {
  Activity,
  BrainCircuit,
  CheckCircle2,
  Loader2,
  Map,
  Navigation,
  Play,
  RotateCcw,
  ShieldAlert,
  Volume2,
  VolumeX,
  XCircle,
} from 'lucide-react';

import {
  predictLandslideRisk,
  REAL_LANDCOVER_CLASSES,
  REAL_SOIL_OPTIONS,
} from '../services/predictionApi';

import type {
  PredictionRequest,
  PredictionResponse,
  RiskLevel,
} from '../types';

import { sirenPlayer } from '../utils/audioSiren';


/* ============================================================
   TYPES
============================================================ */

interface LandslideRiskSimulatorProps {
  theme?: 'dark' | 'light';
  onNavigateToMap?: () => void;
  onResultGenerated?: (result: PredictionResponse) => void;
}

interface ProbabilityRingProps {
  probability: number;
  riskLevel: RiskLevel;
}


/* ============================================================
   PROBABILITY RING
============================================================ */

const ProbabilityRing = ({
  probability,
  riskLevel,
}: ProbabilityRingProps) => {
  const size = 260;
  const strokeWidth = 18;

  const radius = (size - strokeWidth) / 2;

  const circumference = 2 * Math.PI * radius;

  /*
   * Ensure probability always remains
   * between 0 and 100.
   */
  const percentage = Math.min(Math.max(probability, 0), 100);


  /*
   * Probability Threshold Configuration
   *
   * 0%   - 24.99% = LOW       = GREEN
   * 25%  - 49.99% = MODERATE  = YELLOW
   * 50%  - 74.99% = HIGH      = ORANGE
   * 75%  - 100%   = VERY HIGH = RED
   */
  const getProbabilityConfig = (value: number) => {
    if (value < 25) {
      return {
        color: '#22c55e',
        glow: 'rgba(34, 197, 94, 0.55)',
        label: 'LOW',
      };
    }

    if (value < 50) {
      return {
        color: '#eab308',
        glow: 'rgba(234, 179, 8, 0.55)',
        label: 'MODERATE',
      };
    }

    if (value < 75) {
      return {
        color: '#f97316',
        glow: 'rgba(249, 115, 22, 0.55)',
        label: 'HIGH',
      };
    }

    return {
      color: '#ef4444',
      glow: 'rgba(239, 68, 68, 0.65)',
      label: 'VERY HIGH',
    };
  };


  /*
   * Ring color is automatically selected
   * based on probability.
   */
  const config = getProbabilityConfig(percentage);


  /*
   * SVG ring progress calculation.
   */
  const offset =
    circumference - (percentage / 100) * circumference;


  return (
    <div
      className="relative flex items-center justify-center"
      style={{
        width: size,
        height: size,
      }}
    >
      <svg
        width={size}
        height={size}
        viewBox={`0 0 ${size} ${size}`}
        style={{
          transform: 'rotate(-90deg)',
          overflow: 'visible',
        }}
      >
        {/* Background Ring */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="transparent"
          stroke="#263548"
          strokeWidth={strokeWidth}
        />


        {/* Animated Probability Ring */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="transparent"
          stroke={config.color}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          style={{
            transition:
              'stroke-dashoffset 1.5s ease-out, stroke 0.5s ease, filter 0.5s ease',
            filter: `drop-shadow(0 0 12px ${config.glow})`,
          }}
        />
      </svg>


      {/* Center Content */}
      <div
        className="absolute inset-0 flex flex-col items-center justify-center text-center"
      >
        {/* Probability */}
        <div
          className="text-slate-50 font-extrabold"
          style={{
            fontSize: '42px',
            lineHeight: 1,
            fontVariantNumeric: 'tabular-nums',
          }}
        >
          {percentage.toFixed(2)}%
        </div>


        {/* Label */}
        <div
          className="mt-2 text-slate-400"
          style={{
            fontSize: '11px',
            letterSpacing: '2px',
          }}
        >
          LANDSLIDE RISK
        </div>


        {/* Probability Risk Level */}
        <div
          className="mt-3 font-extrabold"
          style={{
            padding: '6px 14px',
            border: `1px solid ${config.color}`,
            borderRadius: '6px',
            color: config.color,
            fontSize: '14px',
            letterSpacing: '1px',
            boxShadow: `0 0 15px ${config.glow}`,
            transition:
              'color 0.5s ease, border-color 0.5s ease, box-shadow 0.5s ease',
          }}
        >
          {config.label}
        </div>


        {/* Backend ML Risk Level */}
        <div
          className="mt-2 text-slate-500"
          style={{
            fontSize: '9px',
            letterSpacing: '1px',
          }}
        >
          BACKEND ML: {riskLevel.replace('_', ' ')}
        </div>
      </div>
    </div>
  );
};


/* ============================================================
   RISK LEVEL CONFIG
============================================================ */

const getRiskConfig = (riskLevel: RiskLevel) => {
  switch (riskLevel) {
    case 'LOW':
      return {
        color: 'text-green-400',
        border: 'border-green-500/50',
        bg: 'bg-green-500/10',
        label: 'LOW',
        action: 'CONTINUE MONITORING',
      };

    case 'MODERATE':
      return {
        color: 'text-yellow-400',
        border: 'border-yellow-500/50',
        bg: 'bg-yellow-500/10',
        label: 'MODERATE',
        action: 'INCREASE MONITORING',
      };

    case 'HIGH':
      return {
        color: 'text-orange-400',
        border: 'border-orange-500/50',
        bg: 'bg-orange-500/10',
        label: 'HIGH',
        action: 'PREPARE RESPONSE',
      };

    case 'VERY_HIGH':
    default:
      return {
        color: 'text-red-400',
        border: 'border-red-500/60',
        bg: 'bg-red-500/10',
        label: 'VERY HIGH',
        action: 'RED EVACUATION MANDATE',
      };
  }
};


/* ============================================================
   MAIN COMPONENT
============================================================ */

export function LandslideRiskSimulator({
  theme = 'dark',
  onNavigateToMap,
  onResultGenerated,
}: LandslideRiskSimulatorProps) {

  /*
   * Initial simulation values.
   */
  const [formData, setFormData] = useState<PredictionRequest>({
    elevation: 1200,
    slope: 35,
    aspect: 180,

    soil_id:
      REAL_SOIL_OPTIONS.length > 0
        ? REAL_SOIL_OPTIONS[0].value
        : '3636.0',

    landcover_class:
      REAL_LANDCOVER_CLASSES.length > 0
        ? REAL_LANDCOVER_CLASSES[0].value
        : '10.0',

    rainfall_1d: 45,
    rainfall_3d: 120,
    rainfall_7d: 220,
    rainfall_15d: 320,
    rainfall_30d: 450,
  });


  /*
   * Prediction state.
   */
  const [predictionResult, setPredictionResult] =
    useState<PredictionResponse | null>(null);

  const [loading, setLoading] = useState(false);

  const [error, setError] =
    useState<string | null>(null);

  const [sirenActive, setSirenActive] =
    useState(false);


  /*
   * Theme helpers.
   */
  const isDark = theme === 'dark';

  const panelClass = isDark
    ? 'bg-[#132131] border-[#263b50] text-slate-100'
    : 'bg-white border-slate-200 text-slate-900';

  const inputClass = isDark
    ? 'bg-[#0c1723] border-[#2a3c50] text-slate-100'
    : 'bg-slate-50 border-slate-300 text-slate-900';


  /*
   * Subscribe to global siren state.
   */
  useEffect(() => {
    return sirenPlayer.subscribe(setSirenActive);
  }, []);


  /*
   * Probability normalization.
   *
   * Supports both:
   *
   * probability_percentage = 87.33
   *
   * OR
   *
   * landslide_probability = 0.8733
   */
  const probabilityPercentage = useMemo(() => {
    if (!predictionResult) {
      return 0;
    }

    if (
      typeof predictionResult.probability_percentage === 'number'
    ) {
      return predictionResult.probability_percentage;
    }

    return (
      predictionResult.landslide_probability * 100
    );
  }, [predictionResult]);


  /*
   * Risk configuration from backend.
   */
  const riskConfig = predictionResult
    ? getRiskConfig(predictionResult.risk_level)
    : null;


  /*
   * Handle numeric input changes.
   */
  const handleNumberChange = (
    field: keyof PredictionRequest,
    value: string
  ) => {

    setFormData((previous) => ({
      ...previous,

      [field]:
        field === 'soil_id' ||
        field === 'landcover_class'
          ? value
          : Number(value),
    }));

  };


  /*
   * Run prediction through FastAPI API service.
   *
   * API communication logic remains in:
   *
   * src/services/predictionApi.ts
   */
  const handlePredict = async () => {

    setLoading(true);

    setError(null);

    try {

      const result =
        await predictLandslideRisk(formData);

      setPredictionResult(result);


      /*
       * Notify parent App.tsx.
       */
      onResultGenerated?.(result);

    } catch (err) {

      const message =
        err instanceof Error
          ? err.message
          : 'Unable to generate landslide prediction.';

      setError(message);

    } finally {

      setLoading(false);

    }

  };


  /*
   * Reset simulation.
   */
  const handleReset = () => {

    setPredictionResult(null);

    setError(null);

    setFormData({
      elevation: 1200,
      slope: 35,
      aspect: 180,

      soil_id:
        REAL_SOIL_OPTIONS.length > 0
          ? REAL_SOIL_OPTIONS[0].value
          : '3636.0',

      landcover_class:
        REAL_LANDCOVER_CLASSES.length > 0
          ? REAL_LANDCOVER_CLASSES[0].value
          : '10.0',

      rainfall_1d: 45,
      rainfall_3d: 120,
      rainfall_7d: 220,
      rainfall_15d: 320,
      rainfall_30d: 450,
    });

  };


  /*
   * Toggle emergency siren.
   */
  const handleSirenToggle = () => {
    sirenPlayer.toggle();
  };


  return (
    <div
      className={`w-full rounded-2xl border shadow-2xl overflow-hidden ${panelClass}`}
    >

      {/* ======================================================
          HEADER
      ====================================================== */}

      <div
        className={`border-b px-5 sm:px-7 py-5 ${
          isDark
            ? 'border-[#263b50] bg-[#101b29]'
            : 'border-slate-200 bg-slate-50'
        }`}
      >

        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">

          <div className="flex items-center gap-3">

            <div
              className="w-11 h-11 rounded-xl flex items-center justify-center bg-emerald-500/10 border border-emerald-500/30"
            >
              <BrainCircuit className="w-6 h-6 text-emerald-400" />
            </div>


            <div>

              <div className="flex items-center gap-2">

                <Activity className="w-4 h-4 text-emerald-400" />

                <h1 className="font-bold text-lg sm:text-xl tracking-wide uppercase">
                  Landslide Risk Simulator
                </h1>

              </div>


              <p className="text-xs text-slate-400 mt-1">
                AI-Powered Real-Time Landslide Risk Prediction
              </p>

            </div>

          </div>


          <div
            className="text-[10px] sm:text-xs font-mono text-emerald-400 border border-emerald-500/30 bg-emerald-500/10 px-3 py-2 rounded-lg"
          >
            FASTAPI ML ENGINE ONLINE
          </div>

        </div>

      </div>


      {/* ======================================================
          CONTENT
      ====================================================== */}

      <div className="p-4 sm:p-6 lg:p-8">

        <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">


          {/* ==================================================
              LEFT: INPUT FORM
          ================================================== */}

          <div
            className={`rounded-2xl border p-5 sm:p-6 ${
              isDark
                ? 'bg-[#101b29] border-[#263b50]'
                : 'bg-slate-50 border-slate-200'
            }`}
          >

            <div className="flex items-center gap-2 mb-6">

              <Navigation className="w-5 h-5 text-cyan-400" />

              <div>

                <h2 className="font-bold tracking-wide">
                  TERRAIN PARAMETERS
                </h2>

                <p className="text-xs text-slate-400 mt-1">
                  Enter environmental and rainfall conditions
                </p>

              </div>

            </div>


            {/* ELEVATION */}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">

              <div>

                <label className="text-xs font-semibold text-slate-400 block mb-2">
                  Elevation (meters)
                </label>

                <input
                  type="number"
                  value={formData.elevation}
                  onChange={(event) =>
                    handleNumberChange(
                      'elevation',
                      event.target.value
                    )
                  }
                  className={`w-full border rounded-lg px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-emerald-500/50 ${inputClass}`}
                />

              </div>


              {/* SLOPE */}

              <div>

                <label className="text-xs font-semibold text-slate-400 block mb-2">
                  Slope (degrees)
                </label>

                <input
                  type="number"
                  value={formData.slope}
                  onChange={(event) =>
                    handleNumberChange(
                      'slope',
                      event.target.value
                    )
                  }
                  className={`w-full border rounded-lg px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-emerald-500/50 ${inputClass}`}
                />

              </div>


              {/* ASPECT */}

              <div>

                <label className="text-xs font-semibold text-slate-400 block mb-2">
                  Aspect (degrees)
                </label>

                <input
                  type="number"
                  value={formData.aspect}
                  onChange={(event) =>
                    handleNumberChange(
                      'aspect',
                      event.target.value
                    )
                  }
                  className={`w-full border rounded-lg px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-emerald-500/50 ${inputClass}`}
                />

              </div>


              {/* SOIL */}

              <div>

                <label className="text-xs font-semibold text-slate-400 block mb-2">
                  Soil ID
                </label>

                <select
                  value={formData.soil_id}
                  onChange={(event) =>
                    handleNumberChange(
                      'soil_id',
                      event.target.value
                    )
                  }
                  className={`w-full border rounded-lg px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-emerald-500/50 ${inputClass}`}
                >

                  {REAL_SOIL_OPTIONS.map((soil) => (
                    <option
                      key={soil.value}
                      value={soil.value}
                    >
                      {soil.name}
                    </option>
                  ))}

                </select>

              </div>


              {/* LANDCOVER */}

              <div className="sm:col-span-2">

                <label className="text-xs font-semibold text-slate-400 block mb-2">
                  Landcover Class
                </label>

                <select
                  value={formData.landcover_class}
                  onChange={(event) =>
                    handleNumberChange(
                      'landcover_class',
                      event.target.value
                    )
                  }
                  className={`w-full border rounded-lg px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-emerald-500/50 ${inputClass}`}
                >

                  {REAL_LANDCOVER_CLASSES.map(
                    (landcover) => (
                      <option
                        key={landcover.value}
                        value={landcover.value}
                      >
                        {landcover.name}
                      </option>
                    )
                  )}

                </select>

              </div>

            </div>


            {/* ==================================================
                RAINFALL
            ================================================== */}

            <div className="mt-7">

              <div className="flex items-center gap-2 mb-4">

                <Activity className="w-4 h-4 text-blue-400" />

                <h3 className="font-bold text-sm tracking-wide">
                  ACCUMULATED RAINFALL
                </h3>

              </div>


              <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">


                {/* 1 DAY */}

                <div>

                  <label className="text-[11px] text-slate-400 block mb-2">
                    1 Day (mm)
                  </label>

                  <input
                    type="number"
                    value={formData.rainfall_1d}
                    onChange={(event) =>
                      handleNumberChange(
                        'rainfall_1d',
                        event.target.value
                      )
                    }
                    className={`w-full border rounded-lg px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-blue-500/50 ${inputClass}`}
                  />

                </div>


                {/* 3 DAY */}

                <div>

                  <label className="text-[11px] text-slate-400 block mb-2">
                    3 Days (mm)
                  </label>

                  <input
                    type="number"
                    value={formData.rainfall_3d}
                    onChange={(event) =>
                      handleNumberChange(
                        'rainfall_3d',
                        event.target.value
                      )
                    }
                    className={`w-full border rounded-lg px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-blue-500/50 ${inputClass}`}
                  />

                </div>


                {/* 7 DAY */}

                <div>

                  <label className="text-[11px] text-slate-400 block mb-2">
                    7 Days (mm)
                  </label>

                  <input
                    type="number"
                    value={formData.rainfall_7d}
                    onChange={(event) =>
                      handleNumberChange(
                        'rainfall_7d',
                        event.target.value
                      )
                    }
                    className={`w-full border rounded-lg px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-blue-500/50 ${inputClass}`}
                  />

                </div>


                {/* 15 DAY */}

                <div>

                  <label className="text-[11px] text-slate-400 block mb-2">
                    15 Days (mm)
                  </label>

                  <input
                    type="number"
                    value={formData.rainfall_15d}
                    onChange={(event) =>
                      handleNumberChange(
                        'rainfall_15d',
                        event.target.value
                      )
                    }
                    className={`w-full border rounded-lg px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-blue-500/50 ${inputClass}`}
                  />

                </div>


                {/* 30 DAY */}

                <div>

                  <label className="text-[11px] text-slate-400 block mb-2">
                    30 Days (mm)
                  </label>

                  <input
                    type="number"
                    value={formData.rainfall_30d}
                    onChange={(event) =>
                      handleNumberChange(
                        'rainfall_30d',
                        event.target.value
                      )
                    }
                    className={`w-full border rounded-lg px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-blue-500/50 ${inputClass}`}
                  />

                </div>

              </div>

            </div>


            {/* ==================================================
                BUTTONS
            ================================================== */}

            <div className="flex flex-col sm:flex-row gap-3 mt-8">

              <button
                onClick={handlePredict}
                disabled={loading}
                className="flex-1 flex items-center justify-center gap-2 bg-emerald-500 hover:bg-emerald-400 disabled:opacity-60 disabled:cursor-not-allowed text-slate-950 font-black py-3 px-5 rounded-xl transition-all shadow-lg hover:shadow-emerald-500/20"
              >

                {loading ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />

                    ANALYZING TERRAIN...
                  </>
                ) : (
                  <>
                    <Play className="w-5 h-5" />

                    RUN AI SIMULATION
                  </>
                )}

              </button>


              <button
                onClick={handleReset}
                disabled={loading}
                className={`flex items-center justify-center gap-2 px-5 py-3 rounded-xl border font-bold transition-all ${
                  isDark
                    ? 'border-slate-700 hover:bg-slate-800 text-slate-300'
                    : 'border-slate-300 hover:bg-slate-100 text-slate-700'
                }`}
              >

                <RotateCcw className="w-4 h-4" />

                RESET

              </button>

            </div>


            {/* ==================================================
                ERROR
            ================================================== */}

            {error && (

              <div className="mt-5 border border-red-500/60 bg-red-500/10 rounded-xl p-4">

                <div className="flex items-start gap-3">

                  <XCircle className="w-5 h-5 text-red-400 mt-0.5 flex-shrink-0" />

                  <div>

                    <div className="font-bold text-red-400 text-sm">
                      API Prediction Error
                    </div>

                    <div className="font-mono text-xs text-red-200 mt-1">
                      {error}
                    </div>

                    <div className="text-xs text-slate-400 mt-2">
                      Verify the backend server is running on port 8000.
                    </div>

                  </div>

                </div>

              </div>

            )}

          </div>


          {/* ==================================================
              RIGHT: RESULT
          ================================================== */}

          <div
            className={`rounded-2xl border p-5 sm:p-6 ${
              isDark
                ? 'bg-[#101b29] border-[#263b50]'
                : 'bg-slate-50 border-slate-200'
            }`}
          >


            {/* RESULT HEADER */}

            <div className="flex items-center justify-between gap-3 border-b border-slate-700/50 pb-4 mb-5">

              <div className="flex items-center gap-2">

                <Activity className="w-5 h-5 text-emerald-400" />

                <h2 className="font-bold tracking-wide uppercase">
                  Simulation Prediction Result
                </h2>

              </div>


              <span className="font-mono text-[10px] text-slate-400">
                BACKEND ML MODEL
              </span>

            </div>


            {!predictionResult && (

              <div className="min-h-[500px] flex flex-col items-center justify-center text-center px-6">

                <div className="w-20 h-20 rounded-full border border-slate-700 bg-slate-800/50 flex items-center justify-center">

                  <BrainCircuit className="w-10 h-10 text-slate-500" />

                </div>


                <h3 className="font-bold text-lg mt-6">
                  Awaiting Simulation
                </h3>


                <p className="text-sm text-slate-400 mt-3 max-w-sm">

                  Configure terrain, soil, landcover and rainfall
                  parameters, then run the AI simulation.

                </p>

              </div>

            )}


            {predictionResult && riskConfig && (

              <div>


                {/* ==============================================
                    CLASSIFICATION OUTCOME
                ============================================== */}

                <div
                  className={`rounded-2xl border p-5 ${
                    predictionResult.prediction === 1
                      ? 'border-red-500/60 bg-red-500/10'
                      : 'border-green-500/60 bg-green-500/10'
                  }`}
                >

                  <div className="flex items-center justify-between gap-4">

                    <div className="flex items-center gap-4">

                      <div
                        className={`w-14 h-14 rounded-xl flex items-center justify-center border ${
                          predictionResult.prediction === 1
                            ? 'border-red-500/50 bg-red-500/10'
                            : 'border-green-500/50 bg-green-500/10'
                        }`}
                      >

                        {predictionResult.prediction === 1 ? (
                          <ShieldAlert className="w-7 h-7 text-red-400" />
                        ) : (
                          <CheckCircle2 className="w-7 h-7 text-green-400" />
                        )}

                      </div>


                      <div>

                        <div className="text-[10px] text-slate-400 tracking-[2px] font-mono">

                          CLASSIFICATION OUTCOME

                        </div>


                        <div
                          className={`text-2xl font-black tracking-wide mt-1 ${
                            predictionResult.prediction === 1
                              ? 'text-red-300'
                              : 'text-green-300'
                          }`}
                        >

                          {predictionResult.prediction_label.replace(
                            '_',
                            ' '
                          )}

                        </div>

                      </div>

                    </div>


                    <div className="text-right">

                      <div className="text-[10px] text-slate-400 font-mono">

                        BINARY TARGET

                      </div>


                      <div className="font-mono font-black text-2xl mt-1">

                        [{predictionResult.prediction}]

                      </div>

                    </div>

                  </div>

                </div>


                {/* ==============================================
                    PROBABILITY RING
                ============================================== */}

                <div
                  className={`mt-5 rounded-2xl border py-7 flex flex-col items-center justify-center ${
                    isDark
                      ? 'bg-[#0c1723] border-[#263b50]'
                      : 'bg-white border-slate-200'
                  }`}
                >

                  <ProbabilityRing
                    probability={probabilityPercentage}
                    riskLevel={predictionResult.risk_level}
                  />


                  {/* THRESHOLD LEGEND */}

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-5 px-4 w-full max-w-lg">

                    <div className="text-center">

                      <div className="w-full h-1 bg-green-500 rounded-full" />

                      <div className="text-[9px] text-slate-500 mt-1">
                        0–25%
                      </div>

                      <div className="text-[9px] text-green-400 font-bold">
                        LOW
                      </div>

                    </div>


                    <div className="text-center">

                      <div className="w-full h-1 bg-yellow-500 rounded-full" />

                      <div className="text-[9px] text-slate-500 mt-1">
                        25–50%
                      </div>

                      <div className="text-[9px] text-yellow-400 font-bold">
                        MODERATE
                      </div>

                    </div>


                    <div className="text-center">

                      <div className="w-full h-1 bg-orange-500 rounded-full" />

                      <div className="text-[9px] text-slate-500 mt-1">
                        50–75%
                      </div>

                      <div className="text-[9px] text-orange-400 font-bold">
                        HIGH
                      </div>

                    </div>


                    <div className="text-center">

                      <div className="w-full h-1 bg-red-500 rounded-full" />

                      <div className="text-[9px] text-slate-500 mt-1">
                        75–100%
                      </div>

                      <div className="text-[9px] text-red-400 font-bold">
                        VERY HIGH
                      </div>

                    </div>

                  </div>

                </div>


                {/* ==============================================
                    RISK LEVEL
                ============================================== */}

                <div
                  className={`mt-5 rounded-2xl border p-5 ${riskConfig.border} ${riskConfig.bg}`}
                >

                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">

                    <div className="flex items-center gap-3">

                      <div
                        className={`w-4 h-4 rounded-full ${
                          predictionResult.risk_level === 'LOW'
                            ? 'bg-green-500'
                            : predictionResult.risk_level === 'MODERATE'
                            ? 'bg-yellow-500'
                            : predictionResult.risk_level === 'HIGH'
                            ? 'bg-orange-500'
                            : 'bg-red-500 animate-pulse'
                        }`}
                      />


                      <div>

                        <div className="text-[10px] tracking-[2px] text-slate-400 font-mono">

                          ASSESSED RISK TIER

                        </div>


                        <div
                          className={`font-black text-xl mt-1 ${riskConfig.color}`}
                        >

                          {riskConfig.label}

                        </div>

                      </div>

                    </div>


                    <div
                      className={`text-[10px] sm:text-xs font-mono font-bold border rounded-md px-3 py-2 ${riskConfig.border} ${riskConfig.color}`}
                    >

                      {predictionResult.action_code ||
                        riskConfig.action}

                    </div>

                  </div>

                </div>


                {/* ==============================================
                    MODEL DETAILS
                ============================================== */}

                <div
                  className={`mt-5 rounded-xl border p-4 ${
                    isDark
                      ? 'bg-[#0c1723] border-[#263b50]'
                      : 'bg-white border-slate-200'
                  }`}
                >

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">

                    <div>

                      <div className="text-slate-500 font-mono text-[10px]">
                        MODEL
                      </div>

                      <div className="font-bold mt-1">
                        {predictionResult.model ||
                          'Random Forest'}
                      </div>

                    </div>


                    <div>

                      <div className="text-slate-500 font-mono text-[10px]">
                        API STATUS
                      </div>

                      <div className="font-bold text-emerald-400 mt-1">
                        LIVE RESPONSE RECEIVED
                      </div>

                    </div>

                  </div>

                </div>


                {/* ==============================================
                    SIREN
                ============================================== */}

                <div className="mt-5">

                  <button
                    onClick={handleSirenToggle}
                    className={`w-full flex items-center justify-center gap-3 py-3 px-5 rounded-xl border font-bold transition-all ${
                      sirenActive
                        ? 'bg-red-600 border-red-400 text-white animate-pulse'
                        : predictionResult.risk_level === 'VERY_HIGH'
                        ? 'bg-red-500/10 hover:bg-red-500/20 border-red-500/50 text-red-400'
                        : isDark
                        ? 'bg-slate-800 hover:bg-slate-700 border-slate-700 text-slate-300'
                        : 'bg-slate-100 hover:bg-slate-200 border-slate-300 text-slate-700'
                    }`}
                  >

                    {sirenActive ? (
                      <>
                        <VolumeX className="w-5 h-5" />

                        SILENCE EMERGENCY SIREN
                      </>
                    ) : (
                      <>
                        <Volume2 className="w-5 h-5" />

                        ACTIVATE EMERGENCY SIREN
                      </>
                    )}

                  </button>

                </div>


                {/* ==============================================
                    MAP BUTTON
                ============================================== */}

                {onNavigateToMap && (

                  <button
                    onClick={onNavigateToMap}
                    className="w-full mt-3 flex items-center justify-center gap-2 border border-cyan-500/40 bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-300 py-3 px-5 rounded-xl font-bold transition-all"
                  >

                    <Map className="w-5 h-5" />

                    VIEW SPATIAL RISK MAP

                  </button>

                )}

              </div>

            )}

          </div>

        </div>

      </div>

    </div>
  );
}


/*
 * Named export is used by App.tsx.
 */
export default LandslideRiskSimulator;