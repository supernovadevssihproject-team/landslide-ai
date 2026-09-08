import React from 'react';
import { OperationalModule } from '../types';
import {
  Shield,
  Cpu,
  Database,
  Layers,
  Activity,
  Radio,
  ExternalLink,
  CheckCircle2,
  BrainCircuit,
  BarChart3,
  Satellite,
  GitBranch,
} from 'lucide-react';

interface TerraAboutProps {
  onNavigate: (module: OperationalModule) => void;
  theme: 'dark' | 'light';
}

export const TerraAbout: React.FC<TerraAboutProps> = ({ onNavigate, theme }) => {
  const isDark = theme === 'dark';

  return (
    <div
      className={`min-h-screen py-8 px-4 sm:px-6 lg:px-8 transition-colors duration-200 ${
        isDark ? 'bg-[#090e17] text-slate-100' : 'bg-[#f4f7fa] text-slate-900'
      }`}
    >
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div
          className={`p-6 rounded-2xl border transition-all ${
            isDark
              ? 'bg-gradient-to-r from-slate-900 via-slate-850 to-slate-900 border-slate-800'
              : 'bg-white border-slate-200 shadow-sm'
          }`}
        >
          <div className="flex items-center gap-3">
            <span className="p-3 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-500">
              <Shield className="w-7 h-7" />
            </span>
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">About TerraGuard System</h1>
              <p className={`text-xs sm:text-sm mt-0.5 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                Next-Generation AI & GIS Landslide Early Warning System for Critical Himalayan Corridors
              </p>
            </div>
          </div>
        </div>

        {/* System Architecture Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div
            className={`p-6 rounded-2xl border ${
              isDark ? 'bg-slate-900/90 border-slate-800' : 'bg-white border-slate-200 shadow-sm'
            }`}
          >
            <div className="p-3 w-12 h-12 rounded-xl bg-blue-500/10 text-blue-500 flex items-center justify-center mb-4">
              <Satellite className="w-6 h-6" />
            </div>
            <h3 className="font-bold text-base mb-2">Multi-Source Earth Data</h3>
            <p className={`text-xs leading-relaxed ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
              Seamlessly integrates Sentinel-1 InSAR synthetic aperture radar, NASA SRTM 30m digital elevation models, IMD gridded rainfall telemetry, and real-time piezometric soil pore sensors.
            </p>
          </div>

          <div
            className={`p-6 rounded-2xl border ${
              isDark ? 'bg-slate-900/90 border-slate-800' : 'bg-white border-slate-200 shadow-sm'
            }`}
          >
            <div className="p-3 w-12 h-12 rounded-xl bg-purple-500/10 text-purple-500 flex items-center justify-center mb-4">
              <BrainCircuit className="w-6 h-6" />
            </div>
            <h3 className="font-bold text-base mb-2">Dual ML Architecture</h3>
            <p className={`text-xs leading-relaxed ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
              Trained on 19 historical landslide datasets. Features an ensemble Random Forest classifier (94.1% test precision) alongside a Bidirectional LSTM neural network forecasting 12-hour lead times.
            </p>
          </div>

          <div
            className={`p-6 rounded-2xl border ${
              isDark ? 'bg-slate-900/90 border-slate-800' : 'bg-white border-slate-200 shadow-sm'
            }`}
          >
            <div className="p-3 w-12 h-12 rounded-xl bg-emerald-500/10 text-emerald-500 flex items-center justify-center mb-4">
              <Radio className="w-6 h-6" />
            </div>
            <h3 className="font-bold text-base mb-2">CAP Dispatch & Siren Network</h3>
            <p className={`text-xs leading-relaxed ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
              Instantaneous Common Alerting Protocol (CAP) wireless emergency dispatch across cell broadcast, local LoRa relays, and physical acoustic sirens with quick silence overrides.
            </p>
          </div>
        </div>

        {/* Direct Deep-Dive Launchers for the Sub-Modules */}
        <div
          className={`p-6 rounded-2xl border ${
            isDark ? 'bg-slate-900/90 border-slate-800' : 'bg-white border-slate-200 shadow-sm'
          }`}
        >
          <h2 className="text-lg font-bold mb-4 flex items-center gap-2">
            <Cpu className="w-5 h-5 text-emerald-500" />
            <span>Advanced Research & Dispatch Tooling</span>
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <button
              onClick={() => onNavigate('risk-simulator')}
              className={`p-4 rounded-xl border text-left transition-all hover:scale-[1.02] cursor-pointer ${
                isDark
                  ? 'bg-emerald-950/20 border-emerald-500/50 hover:border-emerald-400'
                  : 'bg-emerald-50/50 border-emerald-300 hover:border-emerald-500'
              }`}
            >
              <Cpu className="w-5 h-5 text-emerald-400 mb-2" />
              <div className="font-bold text-sm text-emerald-400 flex items-center justify-between">
                <span>ML Risk Simulator</span>
                <span className="text-[10px] font-mono uppercase px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-300">Live API</span>
              </div>
              <div className="text-[11px] text-slate-400 mt-1">
                Run inference with real trained Random Forest on custom terrain, soil and cumulative rainfall.
              </div>
            </button>

            <button
              onClick={() => onNavigate('ml-models-pipeline')}
              className={`p-4 rounded-xl border text-left transition-all hover:scale-[1.02] cursor-pointer ${
                isDark
                  ? 'bg-slate-800/40 border-slate-700/60 hover:border-emerald-500'
                  : 'bg-slate-50 border-slate-200 hover:border-emerald-500'
              }`}
            >
              <BarChart3 className="w-5 h-5 text-purple-400 mb-2" />
              <div className="font-bold text-sm">ML Pipeline Sandbox</div>
              <div className="text-[11px] text-slate-400 mt-1">
                Inspect metrics, feature importance, confusion matrices, and ROC curves on 19 datasets.
              </div>
            </button>

            <button
              onClick={() => onNavigate('temporal-lstm-predictor')}
              className={`p-4 rounded-xl border text-left transition-all hover:scale-[1.02] cursor-pointer ${
                isDark
                  ? 'bg-slate-800/40 border-slate-700/60 hover:border-emerald-500'
                  : 'bg-slate-50 border-slate-200 hover:border-emerald-500'
              }`}
            >
              <Activity className="w-5 h-5 text-blue-400 mb-2" />
              <div className="font-bold text-sm">Temporal Ingestion</div>
              <div className="text-[11px] text-slate-400 mt-1">
                Live sensor ingestion simulation and 24-hour lead-time projection graphs.
              </div>
            </button>

            <button
              onClick={() => onNavigate('emergency-broadcast-and-dispatch')}
              className={`p-4 rounded-xl border text-left transition-all hover:scale-[1.02] cursor-pointer ${
                isDark
                  ? 'bg-slate-800/40 border-slate-700/60 hover:border-emerald-500'
                  : 'bg-slate-50 border-slate-200 hover:border-emerald-500'
              }`}
            >
              <Radio className="w-5 h-5 text-amber-400 mb-2" />
              <div className="font-bold text-sm">Tactical CAP Dispatch</div>
              <div className="text-[11px] text-slate-400 mt-1">
                Trigger CAP emergency broadcasts and dispatch relief convoys to shelters.
              </div>
            </button>

            <button
              onClick={() => onNavigate('crowdsource-cv-verification')}
              className={`p-4 rounded-xl border text-left transition-all hover:scale-[1.02] cursor-pointer ${
                isDark
                  ? 'bg-slate-800/40 border-slate-700/60 hover:border-emerald-500'
                  : 'bg-slate-50 border-slate-200 hover:border-emerald-500'
              }`}
            >
              <Database className="w-5 h-5 text-emerald-400 mb-2" />
              <div className="font-bold text-sm">Crowdsource CV Intake</div>
              <div className="text-[11px] text-slate-400 mt-1">
                Citizen photo submission with automated Computer Vision rockfall verification.
              </div>
            </button>
          </div>
        </div>

        {/* Compliance and Institutional Badges */}
        <div
          className={`p-6 rounded-2xl border text-xs text-slate-400 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 ${
            isDark ? 'bg-slate-900/80 border-slate-800' : 'bg-white border-slate-200'
          }`}
        >
          <div>
            <strong>TerraGuard v2.4 Enterprise</strong> • Geological Survey of India (GSI) & National Disaster Management Authority (NDMA) Compliant
          </div>
          <div>
            Built with React 18, Vite, Tailwind CSS, Leaflet GIS, FastAPI & Scikit-Learn
          </div>
        </div>
      </div>
    </div>
  );
};
