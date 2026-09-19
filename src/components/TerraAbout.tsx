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
import { useI18n } from '../i18n/index.tsx';

interface TerraAboutProps {
  onNavigate: (module: OperationalModule) => void;
  theme: 'dark' | 'light';
}

export const TerraAbout: React.FC<TerraAboutProps> = ({ onNavigate, theme }) => {
  const { t } = useI18n();
  const isDark = theme === 'dark';

  return (
    <div
      className={`min-h-screen py-8 px-4 sm:px-6 lg:px-8 transition-colors duration-200 ${
        isDark ? 'bg-[#090e17] text-slate-100' : 'bg-[#f4f7fa] text-slate-900'
      }`}
    >
      <div className="app-wide-container w-full space-y-6">
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
              <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">{t('about.title')}</h1>
              <p className={`text-xs sm:text-sm mt-0.5 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                {t('about.subtitle')}
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
            <h3 className="font-bold text-base mb-2">{t('about.multiSourceTitle')}</h3>
            <p className={`text-xs leading-relaxed ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
              {t('about.multiSourceDesc')}
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
            <h3 className="font-bold text-base mb-2">{t('about.dualMlTitle')}</h3>
            <p className={`text-xs leading-relaxed ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
              {t('about.dualMlDesc')}
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
            <h3 className="font-bold text-base mb-2">{t('about.capSirenTitle')}</h3>
            <p className={`text-xs leading-relaxed ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
              {t('about.capSirenDesc')}
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
            <span>{t('about.toolingTitle')}</span>
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
                <span>{t('about.riskSimTitle')}</span>
                <span className="text-[10px] font-mono uppercase px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-300">{t('about.liveApi')}</span>
              </div>
              <div className="text-[11px] text-slate-400 mt-1">
                {t('about.riskSimDesc')}
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
              <div className="font-bold text-sm">{t('about.pipelineSandboxTitle')}</div>
              <div className="text-[11px] text-slate-400 mt-1">
                {t('about.pipelineSandboxDesc')}
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
              <div className="font-bold text-sm">{t('about.temporalIngestionTitle')}</div>
              <div className="text-[11px] text-slate-400 mt-1">
                {t('about.temporalIngestionDesc')}
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
              <div className="font-bold text-sm">{t('about.tacticalCapTitle')}</div>
              <div className="text-[11px] text-slate-400 mt-1">
                {t('about.tacticalCapDesc')}
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
              <div className="font-bold text-sm">{t('about.crowdsourceCvTitle')}</div>
              <div className="text-[11px] text-slate-400 mt-1">
                {t('about.crowdsourceCvDesc')}
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
            {t('about.footerCompliant')}
          </div>
          <div>
            {t('about.footerBuiltWith')}
          </div>
        </div>
      </div>
    </div>
  );
};
