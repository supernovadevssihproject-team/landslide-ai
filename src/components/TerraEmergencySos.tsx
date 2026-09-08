import React, { useState } from 'react';
import { HazardZone, OperationalModule } from '../types';
import { TERRA_HELPLINES } from '../data/mockData';
import {
  PhoneCall,
  AlertOctagon,
  Radio,
  MapPin,
  Share2,
  Copy,
  Check,
  ShieldAlert,
  Volume2,
  VolumeX,
  Send,
  Navigation,
  ExternalLink,
  Shield,
  Activity,
  HeartPulse,
  Flame,
  Building,
} from 'lucide-react';

interface TerraEmergencySosProps {
  selectedZone: HazardZone;
  onNavigate: (module: OperationalModule) => void;
  theme: 'dark' | 'light';
  sirenActive?: boolean;
  onToggleSiren?: () => void;
}

export const TerraEmergencySos: React.FC<TerraEmergencySosProps> = ({
  selectedZone,
  onNavigate,
  theme,
  sirenActive,
  onToggleSiren,
}) => {
  const [activeCategory, setActiveCategory] = useState<'all' | 'government' | 'local' | 'medical' | 'rescue'>('all');
  const [sosSent, setSosSent] = useState(false);
  const [copiedCoords, setCopiedCoords] = useState(false);
  const [copiedNumber, setCopiedNumber] = useState<string | null>(null);

  const isDark = theme === 'dark';

  const handleTriggerSos = () => {
    setSosSent(true);
    // Auto turn on siren if available and not already playing
    if (onToggleSiren && !sirenActive) {
      onToggleSiren();
    }
  };

  const handleCopyCoords = () => {
    navigator.clipboard.writeText(`${selectedZone.coords} (Zone: ${selectedZone.name}, Elevation: ${selectedZone.elevation})`);
    setCopiedCoords(true);
    setTimeout(() => setCopiedCoords(false), 2500);
  };

  const handleCopyNumber = (num: string) => {
    navigator.clipboard.writeText(num);
    setCopiedNumber(num);
    setTimeout(() => setCopiedNumber(null), 2500);
  };

  const filteredHelplines = activeCategory === 'all'
    ? TERRA_HELPLINES
    : TERRA_HELPLINES.filter((h) => h.category === activeCategory);

  const smsText = encodeURIComponent(
    `EMERGENCY: Landslide hazard reported at ${selectedZone.name}. Coordinates: ${selectedZone.coords}, Elevation: ${selectedZone.elevation}. Requesting emergency assistance.`
  );

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
              ? 'bg-gradient-to-r from-red-950/40 via-slate-900 to-slate-900 border-red-900/40'
              : 'bg-white border-slate-200 shadow-sm'
          }`}
        >
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
            <div className="flex items-center gap-3">
              <span className="p-3 rounded-2xl bg-red-600/20 text-red-500 border border-red-500/30">
                <AlertOctagon className="w-8 h-8 animate-pulse" />
              </span>
              <div>
                <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Emergency SOS Dispatch</h1>
                <p className={`text-xs sm:text-sm mt-0.5 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                  Direct satellite uplink, offline beacon broadcasting, and official emergency helpline contacts
                </p>
              </div>
            </div>

            {/* Siren Acoustic Control */}
            {onToggleSiren && (
              <div className="flex items-center gap-3">
                <button
                  onClick={onToggleSiren}
                  className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-xs border transition-all shadow-md ${
                    sirenActive
                      ? 'bg-red-600 hover:bg-red-700 text-white border-red-500 animate-pulse'
                      : isDark
                      ? 'bg-slate-800 hover:bg-slate-700 text-slate-300 border-slate-700'
                      : 'bg-white hover:bg-slate-100 text-slate-700 border-slate-300'
                  }`}
                >
                  {sirenActive ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
                  <span>{sirenActive ? 'Silence Acoustic Siren' : 'Sound Emergency Siren'}</span>
                </button>
              </div>
            )}
          </div>
        </div>

        {/* SOS Button & Offline Location Strip (Screen 6 Layout) */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Big Circular SOS Button Card (5 cols) */}
          <div
            className={`lg:col-span-5 p-8 rounded-2xl border flex flex-col items-center justify-center text-center relative overflow-hidden ${
              isDark ? 'bg-slate-900/90 border-slate-800' : 'bg-white border-slate-200 shadow-sm'
            }`}
          >
            {/* Pulsing visual backdrop */}
            {sosSent && (
              <div className="absolute inset-0 bg-red-600/10 pointer-events-none animate-pulse" />
            )}

            <div className="relative my-6 flex items-center justify-center">
              {/* Outer pulsing ring */}
              <div
                className={`absolute w-52 h-52 rounded-full border-2 border-red-500/30 ${
                  sosSent ? 'animate-ping' : ''
                }`}
              />
              <div className="absolute w-44 h-44 rounded-full border border-red-500/40" />

              {/* Main SOS Button */}
              <button
                onClick={handleTriggerSos}
                className="relative w-36 h-36 rounded-full bg-gradient-to-tr from-red-600 to-rose-500 hover:from-red-500 hover:to-rose-400 text-white font-black text-2xl tracking-widest shadow-2xl shadow-red-600/50 flex flex-col items-center justify-center transition-all transform active:scale-95 border-4 border-white/20"
              >
                <span>SOS</span>
                <span className="text-[10px] font-semibold tracking-wider mt-0.5 opacity-90">
                  {sosSent ? 'TRANSMITTING' : 'PRESS TO ALERT'}
                </span>
              </button>
            </div>

            {/* Status Feedback */}
            {sosSent ? (
              <div className="mt-4 p-4 rounded-xl bg-red-500/15 border border-red-500/30 text-red-500 text-xs text-center space-y-1">
                <div className="font-bold flex items-center justify-center gap-1.5 text-sm">
                  <Radio className="w-4 h-4 animate-spin" />
                  <span>EMERGENCY DISPATCH TRANSMITTED</span>
                </div>
                <p className="text-[11px] text-slate-300">
                  Coordinates sent via Satellite Telemetry & LoRa Emergency Mesh Relay to USDMA / NDRF Control.
                </p>
                <button
                  onClick={() => setSosSent(false)}
                  className="mt-2 text-[10px] underline font-medium hover:text-white"
                >
                  Reset SOS Beacon
                </button>
              </div>
            ) : (
              <p
                className={`text-xs max-w-xs mt-2 ${
                  isDark ? 'text-slate-400' : 'text-slate-500'
                }`}
              >
                Tap to broadcast immediate rescue coordinates to state emergency response authorities and sound the sirens.
              </p>
            )}
          </div>

          {/* Offline Location Sharing & Coordinates (7 cols) */}
          <div
            className={`lg:col-span-7 p-6 rounded-2xl border flex flex-col justify-between ${
              isDark ? 'bg-slate-900/90 border-slate-800' : 'bg-white border-slate-200 shadow-sm'
            }`}
          >
            <div>
              <div className="flex items-center justify-between border-b pb-4 mb-4 border-slate-200 dark:border-slate-800">
                <div className="flex items-center gap-2">
                  <MapPin className="w-5 h-5 text-emerald-500" />
                  <h2 className="text-lg font-bold">Offline Location Sharing</h2>
                </div>
                <span className="text-xs px-2.5 py-1 rounded-md bg-emerald-500/15 text-emerald-500 font-semibold">
                  Dual GNSS Active
                </span>
              </div>

              <div className="space-y-4">
                <div
                  className={`p-4 rounded-xl border ${
                    isDark ? 'bg-slate-800/40 border-slate-700/70' : 'bg-slate-50 border-slate-200'
                  }`}
                >
                  <div className="text-xs text-slate-400 font-medium">Selected Ground Station / Current Position:</div>
                  <div className="text-base sm:text-lg font-bold mt-1 text-emerald-500">
                    {selectedZone.name}
                  </div>
                  <div className="mt-2 grid grid-cols-2 sm:grid-cols-3 gap-2 text-xs font-mono">
                    <div>
                      <span className="text-slate-400">Coords:</span>{' '}
                      <span className="font-bold">{selectedZone.coords}</span>
                    </div>
                    <div>
                      <span className="text-slate-400">Elevation:</span>{' '}
                      <span className="font-bold">{selectedZone.elevation}</span>
                    </div>
                    <div>
                      <span className="text-slate-400">Precision:</span>{' '}
                      <span className="font-bold text-emerald-500">±3.5 meters</span>
                    </div>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-3">
                  <button
                    onClick={handleCopyCoords}
                    className={`flex items-center gap-2 px-4 py-2.5 rounded-xl border text-xs font-semibold transition-all ${
                      copiedCoords
                        ? 'bg-emerald-600 text-white border-emerald-600'
                        : isDark
                        ? 'bg-slate-800 hover:bg-slate-700 text-slate-200 border-slate-700'
                        : 'bg-white hover:bg-slate-100 text-slate-800 border-slate-300'
                    }`}
                  >
                    {copiedCoords ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                    <span>{copiedCoords ? 'Coordinates Copied!' : 'Copy GPS Coordinates'}</span>
                  </button>

                  <a
                    href={`sms:1078?body=${smsText}`}
                    className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold transition-all shadow-md shadow-blue-600/20"
                  >
                    <Send className="w-4 h-4" />
                    <span>Send SMS via Offline Carrier (1078)</span>
                  </a>

                  <button
                    onClick={() => onNavigate('risk-map')}
                    className={`flex items-center gap-2 px-3 py-2.5 rounded-xl border text-xs font-semibold transition-all ${
                      isDark
                        ? 'bg-slate-800 hover:bg-slate-700 text-slate-300 border-slate-700'
                        : 'bg-slate-100 hover:bg-slate-200 text-slate-700 border-slate-200'
                    }`}
                  >
                    <Navigation className="w-4 h-4" />
                    <span>Open Safe Routes Map</span>
                  </button>
                </div>
              </div>
            </div>

            <div
              className={`mt-6 p-3 rounded-xl border text-xs flex items-center gap-2.5 ${
                isDark ? 'bg-slate-800/30 border-slate-700/50 text-slate-400' : 'bg-slate-50 border-slate-200 text-slate-600'
              }`}
            >
              <Radio className="w-4 h-4 text-emerald-500 shrink-0" />
              <span>
                <strong>Offline Mesh Relay:</strong> If cell towers fail, TerraGuard automatically transmits beacon packets over 868MHz LoRa mesh repeaters to disaster authorities.
              </span>
            </div>
          </div>
        </div>

        {/* Categorized Helpline Directory (Screen 6 Layout) */}
        <div
          className={`p-6 rounded-2xl border ${
            isDark ? 'bg-slate-900/90 border-slate-800' : 'bg-white border-slate-200 shadow-sm'
          }`}
        >
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b pb-4 mb-6 border-slate-200 dark:border-slate-800">
            <div>
              <h3 className="text-lg font-bold">Official Emergency Helpline Contacts</h3>
              <p className={`text-xs ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                Verified 24x7 crisis desks across Government, Local District, Medical, and Search & Rescue
              </p>
            </div>

            {/* Category Filter Tabs */}
            <div
              className={`flex flex-wrap p-1 rounded-xl border text-xs font-medium ${
                isDark ? 'bg-slate-800/80 border-slate-700' : 'bg-slate-100 border-slate-200'
              }`}
            >
              {(
                [
                  { id: 'all', label: 'All Contacts' },
                  { id: 'government', label: 'Government' },
                  { id: 'local', label: 'Local District' },
                  { id: 'medical', label: 'Medical' },
                  { id: 'rescue', label: 'Rescue & Army' },
                ] as const
              ).map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveCategory(tab.id)}
                  className={`px-3 py-1.5 rounded-lg transition-all ${
                    activeCategory === tab.id
                      ? 'bg-red-600 text-white font-semibold shadow'
                      : isDark
                      ? 'text-slate-300 hover:text-white'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          </div>

          {/* Contacts Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredHelplines.map((helpline) => {
              const isCopied = copiedNumber === helpline.number;

              return (
                <div
                  key={helpline.id}
                  className={`p-5 rounded-xl border transition-all ${
                    isDark
                      ? 'bg-slate-800/40 border-slate-700/70 hover:border-slate-600'
                      : 'bg-slate-50 border-slate-200 hover:border-slate-300'
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <span
                        className={`text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full ${
                          helpline.category === 'government'
                            ? 'bg-blue-500/20 text-blue-400'
                            : helpline.category === 'medical'
                            ? 'bg-rose-500/20 text-rose-400'
                            : helpline.category === 'rescue'
                            ? 'bg-amber-500/20 text-amber-400'
                            : 'bg-emerald-500/20 text-emerald-400'
                        }`}
                      >
                        {helpline.category}
                      </span>
                      <h4 className="font-bold text-sm mt-2">{helpline.name}</h4>
                      <p className="text-xs text-slate-400 mt-0.5">{helpline.subtext}</p>
                    </div>

                    <span className="p-2 rounded-xl bg-red-500/10 text-red-500">
                      <PhoneCall className="w-4 h-4" />
                    </span>
                  </div>

                  <div className="mt-4 pt-3 border-t border-slate-200 dark:border-slate-700/60 flex items-center justify-between">
                    <div className="font-mono font-bold text-base text-red-500 tracking-wide">
                      {helpline.number}
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleCopyNumber(helpline.number)}
                        title="Copy number"
                        className={`p-2 rounded-lg border text-xs transition-all ${
                          isCopied
                            ? 'bg-emerald-600 text-white border-emerald-600'
                            : isDark
                            ? 'bg-slate-800 text-slate-300 border-slate-700 hover:bg-slate-700'
                            : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-100'
                        }`}
                      >
                        {isCopied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                      </button>

                      <a
                        href={`tel:${helpline.number.replace(/\s+/g, '')}`}
                        className="px-3 py-1.5 rounded-lg bg-red-600 hover:bg-red-700 text-white font-semibold text-xs transition-all flex items-center gap-1.5 shadow-sm"
                      >
                        <PhoneCall className="w-3 h-3" />
                        <span>Call</span>
                      </a>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};
