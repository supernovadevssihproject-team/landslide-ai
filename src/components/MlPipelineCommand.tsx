import React, { useState, useEffect } from 'react';
import {
  MlPredictionInput,
  MlPredictionResult,
  MlMetrics,
  MlModelComparison,
  MlFeatureImportance,
  DatasetSummary,
} from '../types';
import { LandslideApi } from '../services/api';
import {
  Cpu,
  Database,
  BarChart3,
  TrendingUp,
  Layers,
  AlertTriangle,
  CheckCircle2,
  Sliders,
  Sparkles,
  FileSpreadsheet,
  Search,
  ExternalLink,
  ShieldAlert,
  ArrowRight,
} from 'lucide-react';

interface ScenarioPreset {
  name: string;
  badge: string;
  badgeColor: string;
  input: MlPredictionInput;
}

const PRESETS: ScenarioPreset[] = [
  {
    name: 'Sohra Cloudburst (Extreme Monsoon)',
    badge: 'CRITICAL HAZARD',
    badgeColor: 'bg-red-950/80 text-red-300 border-red-500/50',
    input: {
      elevation: 1430,
      slope: 42,
      aspect: 195,
      soil_id: '4276.0',
      landcover_class: '50.0',
      rainfall_1d: 88,
      rainfall_3d: 195,
      rainfall_7d: 310,
      rainfall_15d: 460,
      rainfall_30d: 680,
    },
  },
  {
    name: 'Tupul Railway Corridor (Active Fissures)',
    badge: 'HIGH ALERT',
    badgeColor: 'bg-amber-950/80 text-amber-300 border-amber-500/50',
    input: {
      elevation: 720,
      slope: 34,
      aspect: 160,
      soil_id: '4301.0',
      landcover_class: '40.0',
      rainfall_1d: 55,
      rainfall_3d: 125,
      rainfall_7d: 190,
      rainfall_15d: 275,
      rainfall_30d: 390,
    },
  },
  {
    name: 'Gangtok Suburban Ridge (Moderate Rain)',
    badge: 'ADVISORY WATCH',
    badgeColor: 'bg-yellow-950/80 text-yellow-300 border-yellow-500/50',
    input: {
      elevation: 1650,
      slope: 24,
      aspect: 120,
      soil_id: '3662.0',
      landcover_class: '30.0',
      rainfall_1d: 22,
      rainfall_3d: 48,
      rainfall_7d: 82,
      rainfall_15d: 135,
      rainfall_30d: 210,
    },
  },
  {
    name: 'Guwahati Valley Plain (Dry Winter)',
    badge: 'NOMINAL SAFE',
    badgeColor: 'bg-emerald-950/80 text-emerald-300 border-emerald-500/50',
    input: {
      elevation: 55,
      slope: 6,
      aspect: 45,
      soil_id: '7001.0',
      landcover_class: '10.0',
      rainfall_1d: 2,
      rainfall_3d: 5,
      rainfall_7d: 8,
      rainfall_15d: 14,
      rainfall_30d: 22,
    },
  },
];

export const MlPipelineCommand: React.FC = () => {
  // Input State for Inference Sandbox
  const [formInput, setFormInput] = useState<MlPredictionInput>(PRESETS[0].input);
  const [prediction, setPrediction] = useState<MlPredictionResult | null>(null);
  const [isInferencing, setIsInferencing] = useState(false);
  const [activeTab, setActiveTab] = useState<'sandbox' | 'comparison' | 'features' | 'datasets' | 'figures'>('sandbox');

  // Async Data
  const [modelInfo, setModelInfo] = useState<Record<string, any>>({});
  const [metrics, setMetrics] = useState<MlMetrics | null>(null);
  const [comparison, setComparison] = useState<MlModelComparison[]>([]);
  const [features, setFeatures] = useState<MlFeatureImportance[]>([]);
  const [datasets, setDatasets] = useState<DatasetSummary[]>([]);
  const [datasetSearch, setDatasetSearch] = useState('');
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  // Load telemetry and metrics on mount
  useEffect(() => {
    let active = true;
    LandslideApi.getMlModelInfo().then((info) => active && setModelInfo(info));
    LandslideApi.getMlMetrics().then((m) => active && setMetrics(m));
    LandslideApi.getMlComparison().then((c) => active && setComparison(c));
    LandslideApi.getMlFeatureImportance().then((f) => active && setFeatures(f));
    LandslideApi.getLandslideDatasets().then((d) => active && setDatasets(d));

    // Run initial inference
    runInference(PRESETS[0].input);

    return () => {
      active = false;
    };
  }, []);

  const runInference = async (inputToUse: MlPredictionInput) => {
    // Constraint check
    if (
      inputToUse.rainfall_3d < inputToUse.rainfall_1d ||
      inputToUse.rainfall_7d < inputToUse.rainfall_3d ||
      inputToUse.rainfall_15d < inputToUse.rainfall_7d ||
      inputToUse.rainfall_30d < inputToUse.rainfall_15d
    ) {
      showToast('Rainfall windows must be cumulative: 1d <= 3d <= 7d <= 15d <= 30d');
      return;
    }

    setIsInferencing(true);
    try {
      const res = await LandslideApi.predictMl(inputToUse);
      setPrediction(res);
      showToast(`Inference Complete: ${res.prediction_label} (${res.probability_percentage}% Risk)`);
    } catch (err: any) {
      showToast(`Inference Error: ${err?.message || 'Failed to predict'}`);
    } finally {
      setIsInferencing(false);
    }
  };

  const handleApplyPreset = (preset: ScenarioPreset) => {
    setFormInput(preset.input);
    runInference(preset.input);
  };

  const filteredDatasets = datasets.filter(
    (d) =>
      d.name.toLowerCase().includes(datasetSearch.toLowerCase()) ||
      d.description.toLowerCase().includes(datasetSearch.toLowerCase())
  );

  return (
    <div className="space-y-4 sm:space-y-6 animate-fade-in pb-12">
      {/* Module Title Banner */}
      <div className="bg-[#0f1f31] border border-[#1e344d] rounded-xl p-4 sm:p-5 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 shadow-lg shadow-black/20">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2 py-0.5 rounded bg-emerald-950 text-emerald-400 border border-emerald-700/40 text-[11px] font-mono font-bold tracking-wider">
              SCIKIT-LEARN PIPELINE
            </span>
            <span className="px-2 py-0.5 rounded bg-cyan-950 text-cyan-400 border border-cyan-700/40 text-[11px] font-mono font-bold tracking-wider">
              RANDOM FOREST (ROC-AUC 0.896)
            </span>
            <span className="px-2 py-0.5 rounded bg-amber-950 text-amber-400 border border-amber-700/40 text-[11px] font-mono font-bold tracking-wider">
              19 NER DATASETS
            </span>
          </div>
          <h1 className="text-xl sm:text-2xl font-bold text-white mt-1.5 flex items-center gap-2">
            <Cpu className="w-6 h-6 text-[#53e8a6]" />
            Machine Learning Pipeline & Spatial Trigger Engine
          </h1>
          <p className="text-xs sm:text-sm text-[#8ca3ba] mt-0.5 max-w-3xl">
            Trained and calibrated on 19 North Eastern Region landslide inventories, GSI geological formations, and IMD antecedent precipitation windows (1d, 3d, 7d, 15d, 30d).
          </p>
        </div>

        {/* Primary Metric Badges */}
        <div className="flex items-center gap-2 sm:gap-3">
          <div className="bg-[#0b1726] border border-[#1d3550] px-3.5 py-2 rounded-lg text-center">
            <span className="text-[10px] text-[#8ca3ba] uppercase font-mono block">ROC-AUC</span>
            <span className="text-lg sm:text-xl font-mono font-bold text-[#53e8a6]">
              {metrics ? (metrics.roc_auc * 100).toFixed(1) + '%' : '89.6%'}
            </span>
          </div>
          <div className="bg-[#0b1726] border border-[#1d3550] px-3.5 py-2 rounded-lg text-center">
            <span className="text-[10px] text-[#8ca3ba] uppercase font-mono block">Accuracy</span>
            <span className="text-lg sm:text-xl font-mono font-bold text-[#44d8f1]">
              {metrics ? (metrics.accuracy * 100).toFixed(1) + '%' : '82.4%'}
            </span>
          </div>
          <div className="bg-[#0b1726] border border-[#1d3550] px-3.5 py-2 rounded-lg text-center">
            <span className="text-[10px] text-[#8ca3ba] uppercase font-mono block">F1-Score</span>
            <span className="text-lg sm:text-xl font-mono font-bold text-[#ffb870]">
              {metrics ? (metrics.f1_score * 100).toFixed(1) + '%' : '82.7%'}
            </span>
          </div>
        </div>
      </div>

      {/* Internal Navigation Sub-Tabs */}
      <div className="flex items-center gap-1 sm:gap-2 overflow-x-auto no-scrollbar border-b border-[#1c2b3c] pb-2">
        <button
          onClick={() => setActiveTab('sandbox')}
          className={`flex items-center gap-2 px-3.5 py-2 rounded-lg font-medium text-xs sm:text-sm cursor-pointer whitespace-nowrap transition-colors ${
            activeTab === 'sandbox'
              ? 'bg-[#1b344e] text-white border border-[#53e8a6]/40'
              : 'text-[#8ca3ba] hover:text-white hover:bg-[#122131]'
          }`}
        >
          <Sliders className="w-4 h-4 text-[#53e8a6]" />
          Interactive ML Inference Sandbox
        </button>

        <button
          onClick={() => setActiveTab('comparison')}
          className={`flex items-center gap-2 px-3.5 py-2 rounded-lg font-medium text-xs sm:text-sm cursor-pointer whitespace-nowrap transition-colors ${
            activeTab === 'comparison'
              ? 'bg-[#1b344e] text-white border border-[#44d8f1]/40'
              : 'text-[#8ca3ba] hover:text-white hover:bg-[#122131]'
          }`}
        >
          <BarChart3 className="w-4 h-4 text-[#44d8f1]" />
          Model Comparison (RF vs LogReg)
        </button>

        <button
          onClick={() => setActiveTab('features')}
          className={`flex items-center gap-2 px-3.5 py-2 rounded-lg font-medium text-xs sm:text-sm cursor-pointer whitespace-nowrap transition-colors ${
            activeTab === 'features'
              ? 'bg-[#1b344e] text-white border border-[#ffb870]/40'
              : 'text-[#8ca3ba] hover:text-white hover:bg-[#122131]'
          }`}
        >
          <TrendingUp className="w-4 h-4 text-[#ffb870]" />
          Feature Importance Breakdown
        </button>

        <button
          onClick={() => setActiveTab('datasets')}
          className={`flex items-center gap-2 px-3.5 py-2 rounded-lg font-medium text-xs sm:text-sm cursor-pointer whitespace-nowrap transition-colors ${
            activeTab === 'datasets'
              ? 'bg-[#1b344e] text-white border border-[#53e8a6]/40'
              : 'text-[#8ca3ba] hover:text-white hover:bg-[#122131]'
          }`}
        >
          <Database className="w-4 h-4 text-[#53e8a6]" />
          Landslide Datasets Repository ({datasets.length || 19})
        </button>

        <button
          onClick={() => setActiveTab('figures')}
          className={`flex items-center gap-2 px-3.5 py-2 rounded-lg font-medium text-xs sm:text-sm cursor-pointer whitespace-nowrap transition-colors ${
            activeTab === 'figures'
              ? 'bg-[#1b344e] text-white border border-[#ffb4ab]/40'
              : 'text-[#8ca3ba] hover:text-white hover:bg-[#122131]'
          }`}
        >
          <Layers className="w-4 h-4 text-[#ffb4ab]" />
          Confusion Matrix & ROC Curve
        </button>
      </div>

      {/* TAB 1: INTERACTIVE ML PREDICTION SANDBOX */}
      {activeTab === 'sandbox' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
          {/* Controls Column */}
          <div className="lg:col-span-7 space-y-4">
            {/* Presets Panel */}
            <div className="bg-[#0f1f31] border border-[#1e344d] rounded-xl p-4">
              <span className="text-xs font-mono uppercase text-[#8ca3ba] font-bold block mb-2.5">
                Benchmark Geotechnical Scenario Presets:
              </span>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {PRESETS.map((p) => (
                  <button
                    key={p.name}
                    onClick={() => handleApplyPreset(p)}
                    className="flex flex-col items-start p-2.5 rounded-lg bg-[#0b1726] border border-[#1e344d] hover:border-[#53e8a6]/60 transition-all text-left cursor-pointer group"
                  >
                    <div className="flex items-center justify-between w-full">
                      <span className="text-xs font-semibold text-white group-hover:text-[#53e8a6] transition-colors">
                        {p.name}
                      </span>
                      <span className={`text-[9px] font-mono px-1.5 py-0.5 rounded border ${p.badgeColor}`}>
                        {p.badge}
                      </span>
                    </div>
                    <span className="text-[11px] text-[#718b9e] font-mono mt-1">
                      Rain 1d: {p.input.rainfall_1d}mm • 30d: {p.input.rainfall_30d}mm • Slope: {p.input.slope}°
                    </span>
                  </button>
                ))}
              </div>
            </div>

            {/* Input Form */}
            <div className="bg-[#0f1f31] border border-[#1e344d] rounded-xl p-4 sm:p-5 space-y-4">
              <h3 className="text-sm font-semibold text-white flex items-center gap-2">
                <Sliders className="w-4 h-4 text-[#44d8f1]" />
                Terrain & Meteorological Parameters
              </h3>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="text-xs text-[#8ca3ba] font-mono block mb-1">
                    Elevation (m): <span className="text-white font-bold">{formInput.elevation}m</span>
                  </label>
                  <input
                    type="range"
                    min="50"
                    max="3500"
                    step="10"
                    value={formInput.elevation}
                    onChange={(e) => setFormInput({ ...formInput, elevation: +e.target.value })}
                    className="w-full accent-[#44d8f1] cursor-pointer"
                  />
                </div>

                <div>
                  <label className="text-xs text-[#8ca3ba] font-mono block mb-1">
                    Slope Gradient: <span className="text-white font-bold">{formInput.slope}°</span>
                  </label>
                  <input
                    type="range"
                    min="0"
                    max="75"
                    step="1"
                    value={formInput.slope}
                    onChange={(e) => setFormInput({ ...formInput, slope: +e.target.value })}
                    className="w-full accent-[#ffb870] cursor-pointer"
                  />
                </div>

                <div>
                  <label className="text-xs text-[#8ca3ba] font-mono block mb-1">
                    Aspect Angle: <span className="text-white font-bold">{formInput.aspect}°</span>
                  </label>
                  <input
                    type="range"
                    min="0"
                    max="360"
                    step="5"
                    value={formInput.aspect}
                    onChange={(e) => setFormInput({ ...formInput, aspect: +e.target.value })}
                    className="w-full accent-[#53e8a6] cursor-pointer"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                <div>
                  <label className="text-xs text-[#8ca3ba] font-mono block mb-1">Soil Classification ID</label>
                  <select
                    value={formInput.soil_id}
                    onChange={(e) => setFormInput({ ...formInput, soil_id: e.target.value })}
                    className="w-full bg-[#0b1726] border border-[#1e344d] rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-[#53e8a6]"
                  >
                    <option value="4276.0">ID 4276.0 - Himalayan Clayey Loam (High Plasticity)</option>
                    <option value="4301.0">ID 4301.0 - Weathered Siltstone (Low Cohesion)</option>
                    <option value="3662.0">ID 3662.0 - Gravelly Sand Loam</option>
                    <option value="7001.0">ID 7001.0 - Alluvial Bed Soil</option>
                    <option value="3651.0">ID 3651.0 - Quartzite Colluvium</option>
                  </select>
                </div>

                <div>
                  <label className="text-xs text-[#8ca3ba] font-mono block mb-1">Land-Cover Classification</label>
                  <select
                    value={formInput.landcover_class}
                    onChange={(e) => setFormInput({ ...formInput, landcover_class: e.target.value })}
                    className="w-full bg-[#0b1726] border border-[#1e344d] rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-[#53e8a6]"
                  >
                    <option value="50.0">Class 50.0 - Dense Broadleaf Forest</option>
                    <option value="40.0">Class 40.0 - Disturbed / Degraded Forest</option>
                    <option value="30.0">Class 30.0 - Shrubland & Scrub</option>
                    <option value="10.0">Class 10.0 - Agricultural Terraces</option>
                    <option value="60.0">Class 60.0 - Alpine Grasslands</option>
                  </select>
                </div>
              </div>

              {/* Rainfall Cumulative Sliders */}
              <div className="pt-2 border-t border-[#1e344d] space-y-3">
                <span className="text-xs font-mono uppercase text-[#8ca3ba] font-bold block">
                  Cumulative Antecedent Rainfall Windows (mm):
                </span>

                <div className="grid grid-cols-1 sm:grid-cols-5 gap-2.5">
                  <div>
                    <label className="text-[11px] text-[#8ca3ba] font-mono block mb-1">
                      1-Day: <span className="text-white font-bold">{formInput.rainfall_1d}mm</span>
                    </label>
                    <input
                      type="range"
                      min="0"
                      max="200"
                      value={formInput.rainfall_1d}
                      onChange={(e) => {
                        const val = +e.target.value;
                        setFormInput({
                          ...formInput,
                          rainfall_1d: val,
                          rainfall_3d: Math.max(formInput.rainfall_3d, val),
                          rainfall_7d: Math.max(formInput.rainfall_7d, val),
                          rainfall_15d: Math.max(formInput.rainfall_15d, val),
                          rainfall_30d: Math.max(formInput.rainfall_30d, val),
                        });
                      }}
                      className="w-full accent-cyan-400 cursor-pointer"
                    />
                  </div>

                  <div>
                    <label className="text-[11px] text-[#8ca3ba] font-mono block mb-1">
                      3-Day: <span className="text-white font-bold">{formInput.rainfall_3d}mm</span>
                    </label>
                    <input
                      type="range"
                      min="0"
                      max="350"
                      value={formInput.rainfall_3d}
                      onChange={(e) => {
                        const val = +e.target.value;
                        setFormInput({
                          ...formInput,
                          rainfall_3d: val,
                          rainfall_7d: Math.max(formInput.rainfall_7d, val),
                          rainfall_15d: Math.max(formInput.rainfall_15d, val),
                          rainfall_30d: Math.max(formInput.rainfall_30d, val),
                        });
                      }}
                      className="w-full accent-cyan-400 cursor-pointer"
                    />
                  </div>

                  <div>
                    <label className="text-[11px] text-[#8ca3ba] font-mono block mb-1">
                      7-Day: <span className="text-white font-bold">{formInput.rainfall_7d}mm</span>
                    </label>
                    <input
                      type="range"
                      min="0"
                      max="500"
                      value={formInput.rainfall_7d}
                      onChange={(e) => {
                        const val = +e.target.value;
                        setFormInput({
                          ...formInput,
                          rainfall_7d: val,
                          rainfall_15d: Math.max(formInput.rainfall_15d, val),
                          rainfall_30d: Math.max(formInput.rainfall_30d, val),
                        });
                      }}
                      className="w-full accent-cyan-400 cursor-pointer"
                    />
                  </div>

                  <div>
                    <label className="text-[11px] text-[#8ca3ba] font-mono block mb-1">
                      15-Day: <span className="text-white font-bold">{formInput.rainfall_15d}mm</span>
                    </label>
                    <input
                      type="range"
                      min="0"
                      max="750"
                      value={formInput.rainfall_15d}
                      onChange={(e) => {
                        const val = +e.target.value;
                        setFormInput({
                          ...formInput,
                          rainfall_15d: val,
                          rainfall_30d: Math.max(formInput.rainfall_30d, val),
                        });
                      }}
                      className="w-full accent-cyan-400 cursor-pointer"
                    />
                  </div>

                  <div>
                    <label className="text-[11px] text-[#8ca3ba] font-mono block mb-1">
                      30-Day: <span className="text-white font-bold">{formInput.rainfall_30d}mm</span>
                    </label>
                    <input
                      type="range"
                      min="0"
                      max="1200"
                      value={formInput.rainfall_30d}
                      onChange={(e) => setFormInput({ ...formInput, rainfall_30d: +e.target.value })}
                      className="w-full accent-cyan-400 cursor-pointer"
                    />
                  </div>
                </div>
              </div>

              <div className="pt-2">
                <button
                  onClick={() => runInference(formInput)}
                  disabled={isInferencing}
                  className="w-full bg-[#53e8a6] hover:bg-emerald-300 text-[#003822] font-bold py-2.5 px-4 rounded-lg flex items-center justify-center gap-2 transition-all cursor-pointer shadow-lg shadow-emerald-950/40 disabled:opacity-50"
                >
                  <Sparkles className="w-4 h-4" />
                  {isInferencing ? 'PROCESSING THROUGH PIPELINE...' : 'EXECUTE ML PIPELINE INFERENCE'}
                </button>
              </div>
            </div>
          </div>

          {/* Results Column */}
          <div className="lg:col-span-5 space-y-4">
            {prediction ? (
              <div
                className={`rounded-xl p-5 border shadow-xl transition-all ${
                  prediction.risk_level === 'VERY_HIGH'
                    ? 'bg-gradient-to-b from-red-950/60 to-[#0f1f31] border-red-500/60'
                    : prediction.risk_level === 'HIGH'
                    ? 'bg-gradient-to-b from-amber-950/60 to-[#0f1f31] border-amber-500/60'
                    : prediction.risk_level === 'MODERATE'
                    ? 'bg-gradient-to-b from-yellow-950/60 to-[#0f1f31] border-yellow-500/60'
                    : 'bg-gradient-to-b from-emerald-950/60 to-[#0f1f31] border-emerald-500/60'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-mono uppercase text-[#8ca3ba]">Model Prediction Output</span>
                  <span
                    className={`text-xs font-mono font-bold px-2 py-0.5 rounded border ${
                      prediction.risk_level === 'VERY_HIGH'
                        ? 'bg-red-950 text-red-400 border-red-500/50'
                        : prediction.risk_level === 'HIGH'
                        ? 'bg-amber-950 text-amber-400 border-amber-500/50'
                        : prediction.risk_level === 'MODERATE'
                        ? 'bg-yellow-950 text-yellow-400 border-yellow-500/50'
                        : 'bg-emerald-950 text-emerald-400 border-emerald-500/50'
                    }`}
                  >
                    RISK TIER: {prediction.risk_level}
                  </span>
                </div>

                <div className="mt-3 flex items-baseline gap-2">
                  <span
                    className={`text-3xl sm:text-4xl font-black font-mono tracking-wide ${
                      prediction.prediction === 1 ? 'text-red-400' : 'text-emerald-400'
                    }`}
                  >
                    {prediction.prediction_label}
                  </span>
                  <span className="text-sm font-mono text-[#8ca3ba]">
                    ({prediction.probability_percentage}% probability)
                  </span>
                </div>

                {/* Probability Gauge Bar */}
                <div className="mt-4">
                  <div className="flex justify-between text-[11px] font-mono text-[#8ca3ba] mb-1">
                    <span>Low Probability</span>
                    <span>Critical Threshold (75%)</span>
                  </div>
                  <div className="h-3.5 bg-[#0b1726] rounded-full overflow-hidden border border-[#1e344d] relative">
                    <div
                      className={`h-full transition-all duration-700 rounded-full ${
                        prediction.probability_percentage >= 75
                          ? 'bg-red-500'
                          : prediction.probability_percentage >= 50
                          ? 'bg-amber-500'
                          : prediction.probability_percentage >= 25
                          ? 'bg-yellow-500'
                          : 'bg-emerald-500'
                      }`}
                      style={{ width: `${Math.min(100, prediction.probability_percentage)}%` }}
                    />
                    <div className="absolute top-0 bottom-0 left-3/4 w-[2px] bg-red-400/80" />
                  </div>
                </div>

                {/* Recommended Response Protocol */}
                <div className="mt-4 bg-[#0b1726]/80 border border-[#1e344d] rounded-lg p-3 space-y-1.5">
                  <span className="text-[11px] font-mono text-[#8ca3ba] uppercase font-bold block">
                    Protocol Directive:
                  </span>
                  <div className="flex items-center gap-2">
                    <ShieldAlert
                      className={`w-5 h-5 ${
                        prediction.prediction === 1 ? 'text-red-400' : 'text-emerald-400'
                      }`}
                    />
                    <span className="text-xs font-mono font-bold text-white">
                      {prediction.action_code}
                    </span>
                  </div>
                  <p className="text-xs text-[#a0b3c6]">
                    {prediction.risk_level === 'VERY_HIGH'
                      ? 'Precipitation saturation exceeded geotechnical shear capacity. Immediate district-wide CAP broadcast and police barricading required.'
                      : prediction.risk_level === 'HIGH'
                      ? 'Slope tension fissure risk elevated. Automated field sensors switched to 1-minute telemetry and NDRF units put on standby.'
                      : prediction.risk_level === 'MODERATE'
                      ? 'Antecedent moisture building up. Routine automated monitoring of borehole piezometers.'
                      : 'Slope factor of safety nominal. No imminent landslide trigger detected.'}
                  </p>
                </div>

                {/* Transformed Feature Summary */}
                <div className="mt-4 pt-3 border-t border-[#1e344d]/80 text-[11px] font-mono text-[#8ca3ba] space-y-1">
                  <div className="flex justify-between">
                    <span>Model Artifact:</span>
                    <span className="text-white">{prediction.model}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Transformer:</span>
                    <span className="text-white">StandardScaler + OneHotEncoder</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Latency:</span>
                    <span className="text-[#53e8a6]">&lt; 15ms (C-Optimized Cython)</span>
                  </div>
                </div>
              </div>
            ) : null}

            {/* Quick Architecture Info */}
            <div className="bg-[#0f1f31] border border-[#1e344d] rounded-xl p-4 text-xs text-[#8ca3ba] space-y-2">
              <span className="font-mono uppercase font-bold text-white block">Pipeline Execution Flow</span>
              <div className="flex items-center justify-between text-[11px] font-mono bg-[#0b1726] p-2 rounded border border-[#1d3550]">
                <span>1. Raw JSON</span>
                <ArrowRight className="w-3 h-3 text-[#53e8a6]" />
                <span>2. ColumnTransformer</span>
                <ArrowRight className="w-3 h-3 text-[#53e8a6]" />
                <span>3. Random Forest</span>
                <ArrowRight className="w-3 h-3 text-[#53e8a6]" />
                <span className="text-white font-bold">4. CAP Alert</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: MODEL COMPARISON */}
      {activeTab === 'comparison' && (
        <div className="bg-[#0f1f31] border border-[#1e344d] rounded-xl p-4 sm:p-5 space-y-4">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
            <div>
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <BarChart3 className="w-5 h-5 text-[#44d8f1]" />
                Trained Models Performance Comparison
              </h3>
              <p className="text-xs text-[#8ca3ba]">
                Evaluated on 131 hold-out North Eastern Region test events with verified ground truth.
              </p>
            </div>
            <span className="text-xs font-mono px-2.5 py-1 rounded bg-[#0b1726] border border-[#1e344d] text-[#53e8a6]">
              Random Forest Selected as Best Model (ROC-AUC 0.896)
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs font-mono">
              <thead className="bg-[#0b1726] text-[#8ca3ba] border-b border-[#1e344d]">
                <tr>
                  <th className="p-3">Model</th>
                  <th className="p-3">Test ROC-AUC</th>
                  <th className="p-3">Test Accuracy</th>
                  <th className="p-3">Precision</th>
                  <th className="p-3">Recall</th>
                  <th className="p-3">F1-Score</th>
                  <th className="p-3">True Positives</th>
                  <th className="p-3">True Negatives</th>
                  <th className="p-3">False Positives</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#1e344d] text-white">
                {comparison.map((m, idx) => (
                  <tr
                    key={m.model}
                    className={idx === 0 ? 'bg-[#53e8a6]/10 font-bold' : 'hover:bg-[#122131]'}
                  >
                    <td className="p-3 flex items-center gap-2">
                      {idx === 0 && <CheckCircle2 className="w-4 h-4 text-[#53e8a6]" />}
                      {m.model}
                    </td>
                    <td className="p-3 text-[#53e8a6]">{(m.test_roc_auc * 100).toFixed(1)}%</td>
                    <td className="p-3 text-[#44d8f1]">{(m.test_accuracy * 100).toFixed(1)}%</td>
                    <td className="p-3">{(m.test_precision * 100).toFixed(1)}%</td>
                    <td className="p-3">{(m.test_recall * 100).toFixed(1)}%</td>
                    <td className="p-3 text-[#ffb870]">{(m.test_f1 * 100).toFixed(1)}%</td>
                    <td className="p-3 text-emerald-400">{m.true_positives}</td>
                    <td className="p-3 text-cyan-400">{m.true_negatives}</td>
                    <td className="p-3 text-red-400">{m.false_positives}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 3: FEATURE IMPORTANCE */}
      {activeTab === 'features' && (
        <div className="bg-[#0f1f31] border border-[#1e344d] rounded-xl p-4 sm:p-5 space-y-4">
          <div>
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-[#ffb870]" />
              Geotechnical & Meteorological Feature Importance
            </h3>
            <p className="text-xs text-[#8ca3ba]">
              Calculated via Mean Decrease in Impurity (Gini importance) across all decision trees in the ensemble.
            </p>
          </div>

          <div className="space-y-2.5">
            {features.map((f, i) => (
              <div key={f.feature} className="space-y-1">
                <div className="flex justify-between text-xs font-mono">
                  <span className="text-white flex items-center gap-2">
                    <span className="text-[#8ca3ba] text-[10px]">#{i + 1}</span>
                    {f.display_name}
                  </span>
                  <span className="text-[#53e8a6] font-bold">
                    {f.importance_percentage.toFixed(2)}% ({f.importance})
                  </span>
                </div>
                <div className="h-2.5 bg-[#0b1726] rounded-full overflow-hidden border border-[#1e344d]">
                  <div
                    className="h-full bg-gradient-to-r from-emerald-500 to-[#44d8f1] rounded-full"
                    style={{ width: `${Math.min(100, f.importance_percentage * 6)}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB 4: DATASETS REPOSITORY */}
      {activeTab === 'datasets' && (
        <div className="bg-[#0f1f31] border border-[#1e344d] rounded-xl p-4 sm:p-5 space-y-4">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
            <div>
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <Database className="w-5 h-5 text-[#53e8a6]" />
                Integrated Landslide Datasets Directory (data/landslides/)
              </h3>
              <p className="text-xs text-[#8ca3ba]">
                Official GSI & NASA documented occurrences, rainfall logs, background samples, and clean training matrices.
              </p>
            </div>

            <div className="relative w-full sm:w-64">
              <Search className="w-4 h-4 absolute left-3 top-2.5 text-[#8ca3ba]" />
              <input
                type="text"
                placeholder="Search datasets..."
                value={datasetSearch}
                onChange={(e) => setDatasetSearch(e.target.value)}
                className="w-full bg-[#0b1726] border border-[#1e344d] rounded-lg pl-9 pr-3 py-1.5 text-xs text-white focus:outline-none focus:border-[#53e8a6]"
              />
            </div>
          </div>

          <div className="overflow-x-auto max-h-[480px]">
            <table className="w-full text-left text-xs font-mono">
              <thead className="bg-[#0b1726] text-[#8ca3ba] border-b border-[#1e344d] sticky top-0">
                <tr>
                  <th className="p-3">Filename</th>
                  <th className="p-3">Records</th>
                  <th className="p-3">File Size</th>
                  <th className="p-3">Description</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#1e344d] text-white">
                {filteredDatasets.map((d) => (
                  <tr key={d.name} className="hover:bg-[#122131]">
                    <td className="p-3 flex items-center gap-2 font-semibold text-[#44d8f1]">
                      <FileSpreadsheet className="w-4 h-4 text-[#8ca3ba] flex-shrink-0" />
                      {d.name}
                    </td>
                    <td className="p-3 text-[#53e8a6]">
                      {d.record_count >= 0 ? d.record_count.toLocaleString() : 'N/A'}
                    </td>
                    <td className="p-3 text-[#ffb870]">{d.size}</td>
                    <td className="p-3 text-[#a0b3c6] text-[11px]">{d.description}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 5: FIGURES (ROC & CONFUSION MATRIX) */}
      {activeTab === 'figures' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          <div className="bg-[#0f1f31] border border-[#1e344d] rounded-xl p-4 sm:p-5 space-y-3">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <Layers className="w-4 h-4 text-[#ffb4ab]" />
              Confusion Matrix (Test Evaluation Set)
            </h3>
            <div className="bg-[#0b1726] rounded-lg p-2 border border-[#1e344d] flex items-center justify-center overflow-hidden">
              <img
                src="/ml-figures/confusion_matrix.png"
                alt="Confusion Matrix"
                className="max-h-80 w-auto object-contain rounded"
                onError={(e) => {
                  (e.target as HTMLElement).style.display = 'none';
                }}
              />
            </div>
            <p className="text-xs text-[#8ca3ba]">
              TP: 55 • TN: 53 • FP: 13 • FN: 10. Accuracy: 82.44% on 131 test samples.
            </p>
          </div>

          <div className="bg-[#0f1f31] border border-[#1e344d] rounded-xl p-4 sm:p-5 space-y-3">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-[#53e8a6]" />
              Receiver Operating Characteristic (ROC Curve)
            </h3>
            <div className="bg-[#0b1726] rounded-lg p-2 border border-[#1e344d] flex items-center justify-center overflow-hidden">
              <img
                src="/ml-figures/roc_curve.png"
                alt="ROC Curve"
                className="max-h-80 w-auto object-contain rounded"
                onError={(e) => {
                  (e.target as HTMLElement).style.display = 'none';
                }}
              />
            </div>
            <p className="text-xs text-[#8ca3ba]">
              Area Under Curve (ROC-AUC): 0.8963 demonstrating strong discrimination capability.
            </p>
          </div>
        </div>
      )}

      {/* Floating Action Toast */}
      {toastMessage && (
        <div className="fixed bottom-6 left-1/2 transform -translate-x-1/2 z-50 bg-[#122131] text-[#90cfec] border border-[#53e8a6] px-4 py-2.5 rounded-lg shadow-2xl flex items-center gap-2 text-xs font-mono animate-fade-in">
          <CheckCircle2 className="w-4 h-4 text-[#53e8a6]" />
          <span>{toastMessage}</span>
        </div>
      )}
    </div>
  );
};
