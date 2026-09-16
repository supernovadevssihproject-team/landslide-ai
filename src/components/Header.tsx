import React, { useState, useEffect } from 'react';
import { NerState } from '../types';
import { ASSET_URLS } from '../data/mockData';
import { sirenPlayer } from '../utils/audioSiren';
import { appLanguageOptions, useI18n } from '../i18n/index.tsx';
import { Volume2, VolumeX, ShieldAlert, Radio, Clock, PhoneCall, Sun, Moon, PlusCircle, Globe2 } from 'lucide-react';

interface HeaderProps {
  selectedState: NerState;
  onSelectState: (state: NerState) => void;
  onOpenQuickEvac?: () => void;
  onOpenReportHazard?: () => void;
  theme: 'dark' | 'light';
  onToggleTheme: () => void;
  language?: 'en' | 'hi';
  setLanguage?: React.Dispatch<React.SetStateAction<'en' | 'hi'>>;
}

export const Header: React.FC<HeaderProps> = ({
  selectedState,
  onSelectState,
  onOpenQuickEvac,
  onOpenReportHazard,
  theme,
  onToggleTheme,
  language,
  setLanguage,
}) => {
  const { t } = useI18n();
  const [isSirenActive, setIsSirenActive] = useState(false);
  const [timeString, setTimeString] = useState('');

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setTimeString(
        now.toLocaleTimeString('en-IN', {
          hour12: false,
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
          timeZone: 'Asia/Kolkata',
        }) + ' IST'
      );
    };
    updateTime();
    const timer = setInterval(updateTime, 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    return sirenPlayer.subscribe((playing) => setIsSirenActive(playing));
  }, []);

  const handleToggleSiren = () => {
    sirenPlayer.toggle();
  };

  const isDark = theme === 'dark';

  return (
    <header
      className={`sticky top-0 z-50 border-b backdrop-blur-md transition-colors duration-200 ${
        isDark
          ? 'bg-[#051424]/95 border-[#1c2b3c] text-white'
          : 'bg-white/95 border-slate-200 text-slate-900 shadow-sm'
      }`}
    >
      {/* Top Emergency Action Marquee */}
      <div className="flex items-center justify-between px-3 md:px-6 py-1 bg-red-600/15 border-b border-red-500/20 text-xs">
        <div className="flex items-center gap-2 text-red-500 font-mono tracking-wide truncate">
          <span className="flex h-2 w-2 relative flex-shrink-0">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-500 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500"></span>
          </span>
          <span className="font-bold uppercase tracking-wider text-[11px] text-white bg-red-600 px-1.5 py-0.5 rounded">
            {t('header.criticalStage')}
          </span>
          <span className="truncate hidden sm:inline">
            UTTARKASHI (NH-34 KM 42) & MANGAN (NH-10) • PORE SATURATION 92.4% • SHEAR TRIGGER REACHED
          </span>
          <span className="truncate sm:hidden">
            NH-34 & NH-10 • CRITICAL RUNOUT
          </span>
        </div>

        <div className="flex items-center gap-3 text-xs flex-shrink-0">
          <div className="hidden md:flex items-center gap-1.5 text-xs text-slate-400">
            <PhoneCall className="w-3.5 h-3.5 text-amber-500" />
            <span className="font-mono text-[11px]">
              SDMA: <strong className={isDark ? 'text-white' : 'text-slate-900'}>1077</strong> | NDMA: <strong className={isDark ? 'text-white' : 'text-slate-900'}>1078</strong>
            </span>
          </div>

          <button
            onClick={onOpenQuickEvac}
            className="text-[11px] font-bold text-white bg-red-600 hover:bg-red-700 px-2.5 py-0.5 rounded-lg transition-all flex items-center gap-1 shadow-sm"
          >
            <ShieldAlert className="w-3 h-3" />
            <span>{t('header.dispatchCap')}</span>
          </button>
        </div>
      </div>

      {/* Main Command Bar */}
      <div className="max-w-7xl mx-auto px-3 sm:px-6 py-2.5 flex items-center justify-between gap-2 sm:gap-4">
        {/* Emblem & Branding */}
        <div className="flex items-center gap-2.5 sm:gap-3.5">
          <img
            src={ASSET_URLS.emblem}
            alt="National Emblem of India"
            className="w-8 h-8 sm:w-10 sm:h-10 object-contain brightness-110 drop-shadow flex-shrink-0"
          />
          <div className="flex flex-col">
            <div className="flex items-center gap-2">
              <h1 className="text-base sm:text-lg font-black tracking-wide leading-tight flex items-center gap-1.5">
                <span className="text-emerald-500">TerraGuard</span>
                <span className="text-[11px] font-mono font-bold uppercase px-1.5 py-0.2 rounded bg-emerald-500/10 text-emerald-500 border border-emerald-500/30">
                  AI HQ
                </span>
              </h1>
            </div>
            <p className={`text-[10px] sm:text-[11px] font-medium leading-none tracking-normal ${
              isDark ? 'text-slate-400' : 'text-slate-500'
            }`}>
              {t('header.govtLabel')}
            </p>
          </div>
        </div>

        {/* Center / Right controls */}
        <div className="flex items-center gap-2 sm:gap-3">
          {/* State Filter Selector */}
          <div className="relative hidden lg:block">
            <select
              value={selectedState}
              onChange={(e) => onSelectState(e.target.value as NerState)}
              aria-label="Filter command sector by state"
              className={`text-xs font-semibold rounded-lg px-2.5 py-1.5 pr-7 appearance-none cursor-pointer border transition-all ${
                isDark
                  ? 'bg-slate-800 text-slate-100 border-slate-700 hover:border-emerald-500'
                  : 'bg-slate-100 text-slate-800 border-slate-300 hover:border-emerald-600'
              }`}
            >
              <option value="all">ALL REGIONS (NER & HIMALAYAS)</option>
              <option value="uttarakhand">UTTARAKHAND (UTTARKASHI / GANGOTRI)</option>
              <option value="sikkim">SIKKIM (TEESTA BASIN)</option>
              <option value="assam">ASSAM (DIMA HASAO)</option>
              <option value="meghalaya">MEGHALAYA (SOHRA RIM)</option>
              <option value="arunachal">ARUNACHAL PRADESH (KAMENG)</option>
              <option value="manipur">MANIPUR (TUPUL / NONEY)</option>
              <option value="mizoram">MIZORAM (AIZAWL HILLS)</option>
              <option value="nagaland">NAGALAND (KOHIMA ESCARPMENT)</option>
              <option value="tripura">TRIPURA (JAMPUI HILLS)</option>
            </select>
            <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-slate-400">
              <span className="text-[10px]">▼</span>
            </div>
          </div>

          {/* Telemetry Status badge */}
          <div className={`hidden sm:flex items-center gap-1.5 border px-2.5 py-1 rounded-lg text-xs font-mono ${
            isDark ? 'bg-slate-800/60 border-slate-700' : 'bg-slate-100 border-slate-200 text-slate-700'
          }`}>
            <Radio className="w-3.5 h-3.5 text-emerald-500 animate-pulse" />
            <span className="text-[11px]">GSAT-7A</span>
            <span className="text-[10px] text-emerald-500 bg-emerald-500/10 px-1 rounded font-bold">LOCKED</span>
          </div>

          {/* Live UTC+5:30 Clock */}
          <div className={`hidden md:flex items-center gap-1 text-xs font-mono border px-2.5 py-1 rounded-lg ${
            isDark ? 'bg-slate-800/60 border-slate-700 text-slate-300' : 'bg-slate-100 border-slate-200 text-slate-700'
          }`}>
            <Clock className="w-3.5 h-3.5 text-blue-500" />
            <span className="text-[11px]">{timeString || '11:46:20 IST'}</span>
          </div>

          <div className="relative">
            <label className="sr-only" htmlFor="terraguard-language-select">{t('header.languageSelector')}</label>
            <div className={`flex items-center gap-1.5 rounded-lg border px-2 py-1.5 ${isDark ? 'bg-slate-800 border-slate-700 text-slate-100' : 'bg-slate-100 border-slate-300 text-slate-800'}`}>
              <Globe2 className="h-3.5 w-3.5 text-emerald-500" />
              <select
                id="terraguard-language-select"
                value={language ?? 'en'}
                onChange={(e) => setLanguage?.(e.target.value as 'en' | 'hi')}
                aria-label={t('header.languageSelector')}
                className={`appearance-none bg-transparent pr-5 text-[11px] font-semibold outline-none ${isDark ? 'text-slate-100' : 'text-slate-800'}`}
              >
                {appLanguageOptions.map((option) => (
                  <option key={option.id} value={option.id} className={isDark ? 'bg-slate-900 text-slate-100' : 'bg-white text-slate-900'}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Theme Toggle Button (Dark / Light) */}
          <button
            onClick={onToggleTheme}
            aria-label={t('header.themeToggle')}
            title={theme === 'dark' ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
            className={`flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1.5 rounded-lg border transition-all cursor-pointer shadow-sm ${
              theme === 'light'
                ? 'bg-amber-100 hover:bg-amber-200 text-amber-900 border-amber-300'
                : 'bg-slate-800 hover:bg-slate-700 text-amber-400 border-slate-700'
            }`}
          >
            {theme === 'light' ? (
              <>
                <Sun className="w-3.5 h-3.5 text-amber-600 animate-spin-slow" />
                <span className="text-[11px] font-mono tracking-tight font-bold text-amber-900">{t('header.lightMode')}</span>
              </>
            ) : (
              <>
                <Moon className="w-3.5 h-3.5 text-cyan-400" />
                <span className="text-[11px] font-mono tracking-tight text-slate-200">{t('header.darkMode')}</span>
              </>
            )}
          </button>

          {/* Audio Siren Simulation Button */}
          <button
            onClick={handleToggleSiren}
            title={isSirenActive ? 'Stop Emergency Acoustic Siren' : 'Trigger Acoustic Siren Simulation'}
            className={`flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1.5 rounded-lg border transition-all ${
              isSirenActive
                ? 'bg-red-600 text-white border-red-500 animate-pulse shadow-lg shadow-red-900/50'
                : isDark
                ? 'bg-slate-800 hover:bg-slate-700 text-red-400 border-slate-700'
                : 'bg-red-50 hover:bg-red-100 text-red-700 border-red-200'
            }`}
          >
            {isSirenActive ? (
              <>
                <VolumeX className="w-3.5 h-3.5 text-white" />
                <span className="text-[11px] font-mono tracking-tight font-bold">{t('header.sirenOn')}</span>
              </>
            ) : (
              <>
                <Volume2 className="w-3.5 h-3.5" />
                <span className="text-[11px] font-mono tracking-tight hidden sm:inline">{t('header.testSiren')}</span>
              </>
            )}
          </button>

          <button
            onClick={onOpenReportHazard}
            aria-label="Report Hazard"
            title="Report Hazard"
            className={`flex shrink-0 items-center gap-1.5 text-xs font-semibold px-2.5 py-1.5 rounded-lg border transition-all ${
              isDark
                ? 'bg-emerald-500 hover:bg-emerald-400 text-slate-950 border-emerald-400'
                : 'bg-emerald-500 hover:bg-emerald-400 text-slate-950 border-emerald-400'
            }`}
          >
            <PlusCircle className="w-3.5 h-3.5" />
            <span className="hidden text-[11px] font-mono tracking-tight sm:inline">{t('header.reportHazard')}</span>
          </button>
        </div>
      </div>
    </header>
  );
};
