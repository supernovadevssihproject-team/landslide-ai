import React, { useState, useEffect } from 'react';
import {
  CAP_LANGUAGES,
  ALERT_TEMPLATES,
  TACTICAL_UNITS,
  RELIEF_SHELTERS,
  AUDIT_LOGS,
  ASSET_URLS,
} from '../data/mockData';
import { AuditLogEntry, TacticalUnit, ReliefShelter } from '../types';
import { sirenPlayer } from '../utils/audioSiren';
import { LandslideApi } from '../services/api';
import {
  BellRing,
  Radio,
  Send,
  Languages,
  Users,
  ShieldAlert,
  Building2,
  Truck,
  CheckCircle2,
  AlertTriangle,
  MapPin,
  Clock,
  Compass,
  FileText,
  Volume2,
  VolumeX,
  Zap,
} from 'lucide-react';

interface BroadcastAndDispatchProps {
  onSirenTriggered?: () => void;
}

export const BroadcastAndDispatch: React.FC<BroadcastAndDispatchProps> = ({
  onSirenTriggered,
}) => {
  const [selectedLang, setSelectedLang] = useState<string>('en');
  const [messageText, setMessageText] = useState<string>(ALERT_TEMPLATES['en']);
  const [isArmed, setIsArmed] = useState<boolean>(true);
  const [auditList, setAuditList] = useState<AuditLogEntry[]>(AUDIT_LOGS);
  const [tacticalUnits, setTacticalUnits] = useState<TacticalUnit[]>(TACTICAL_UNITS);
  const [reliefShelters, setReliefShelters] = useState<ReliefShelter[]>(RELIEF_SHELTERS);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [isSirenActive, setIsSirenActive] = useState<boolean>(false);

  useEffect(() => {
    return sirenPlayer.subscribe(setIsSirenActive);
  }, []);

  useEffect(() => {
    let active = true;
    LandslideApi.getAuditLogs().then((logs) => {
      if (active && logs && logs.length > 0) setAuditList(logs);
    });
    LandslideApi.getTacticalUnits().then((units) => {
      if (active && units && units.length > 0) setTacticalUnits(units);
    });
    LandslideApi.getReliefShelters().then((shelters) => {
      if (active && shelters && shelters.length > 0) setReliefShelters(shelters);
    });
    return () => {
      active = false;
    };
  }, []);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3800);
  };

  const handleLanguageChange = (langId: string) => {
    setSelectedLang(langId);
    setMessageText(ALERT_TEMPLATES[langId] || ALERT_TEMPLATES['en']);
  };

  const handleExecuteDispatch = () => {
    const now = new Date();
    const timeStr = now.toLocaleTimeString('en-IN', {
      hour12: false,
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    }) + ' IST';

    const newLog: AuditLogEntry = {
      id: `log-${Date.now()}`,
      code: `CAP-NER-${Math.floor(1000 + Math.random() * 9000)}`,
      title: `CAP High-Priority Broadcast Dispatched (${CAP_LANGUAGES.find((l) => l.id === selectedLang)?.name})`,
      timestamp: timeStr,
      message: `Emergency evacuation notification flashed across 48 cellular BTS transmitters in Mangan & Dikchu. Content: "${messageText.slice(0, 75)}..."`,
      authority: 'Duty Disaster Operations Officer / SDMA Sikkim',
      type: 'broadcast',
      highlight: true,
    };

    setAuditList([newLog, ...auditList]);
    sirenPlayer.start();
    LandslideApi.triggerSiren('NH-10 Singtam-Rangpo Corridor', 6).catch(console.warn);
    showToast('SUCCESS: High-Priority CAP Emergency Alert pushed to 142,800 active cellular handsets in geofence!');
    if (onSirenTriggered) onSirenTriggered();
  };

  return (
    <div className="space-y-4 pb-12">
      {/* Toast Alert */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 bg-[#122131] text-[#90cfec] border border-[#44d8f1] px-4 py-3 rounded-lg shadow-2xl shadow-cyan-950/80 flex items-center gap-3 font-sans text-xs sm:text-sm animate-bounce">
          <Zap className="w-4 h-4 text-[#ffb870] flex-shrink-0" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Stage 3 Critical Escalation Banner */}
      <div className="bg-[#0d1c2d] border border-[#93000a] rounded-xl p-4 sm:p-5 relative overflow-hidden shadow-2xl">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div className="space-y-1.5">
            <div className="flex flex-wrap items-center gap-2">
              <span className="bg-[#93000a] text-white text-[11px] font-mono font-bold px-2 py-0.5 rounded flex items-center gap-1.5 animate-pulse">
                <ShieldAlert className="w-3.5 h-3.5" />
                COMMON ALERTING PROTOCOL (CAP-CMSP)
              </span>
              <span className="text-[11px] font-mono text-[#44d8f1] bg-[#00363e] px-2 py-0.5 rounded border border-[#00bcd4]/30">
                DISASTER MANAGEMENT ACT 2005 (SEC 30)
              </span>
            </div>

            <h2 className="text-lg sm:text-xl font-bold text-white tracking-wide">
              Emergency Broadcast &amp; Evacuation Corridor Management
            </h2>
            <p className="text-xs sm:text-sm text-[#bfc8cd] max-w-3xl">
              Targeted Cell Broadcast (CMSP) delivers geo-fenced audible emergency overrides to all active handsets regardless of network provider. Multi-lingual Bhashini templates ensure immediate comprehension.
            </p>
          </div>

          {/* Broadcast Arm Control Button */}
          <div className="flex items-center gap-3 flex-shrink-0">
            <button
              onClick={() => setIsArmed(!isArmed)}
              className={`px-3 py-2 rounded-lg text-xs font-mono font-bold border transition-all cursor-pointer ${
                isArmed
                  ? 'bg-[#93000a]/30 text-[#ffb4ab] border-[#ffb4ab]'
                  : 'bg-[#122131] text-[#8a9297] border-[#273647]'
              }`}
            >
              {isArmed ? 'TRANSMITTER: ARMED' : 'TRANSMITTER: STANDBY'}
            </button>

            <button
              onClick={handleExecuteDispatch}
              disabled={!isArmed}
              className={`px-4 py-2.5 rounded-lg text-xs sm:text-sm font-bold text-white flex items-center gap-2 shadow-lg transition-all cursor-pointer ${
                isArmed
                  ? 'bg-[#93000a] hover:bg-[#b00020] shadow-red-950/60 animate-pulse'
                  : 'bg-[#273647] opacity-50 cursor-not-allowed'
              }`}
            >
              <Send className="w-4 h-4" />
              <span>EXECUTE CAP BROADCAST</span>
            </button>

            {isSirenActive && (
              <button
                onClick={() => {
                  sirenPlayer.stop();
                  showToast('Emergency Acoustic Siren silenced.');
                }}
                className="px-3.5 py-2.5 rounded-lg text-xs sm:text-sm font-bold bg-amber-500 hover:bg-amber-400 text-slate-950 flex items-center gap-1.5 shadow-lg shadow-amber-950/60 animate-pulse transition-all cursor-pointer"
                title="Silence Active Acoustic Siren"
              >
                <VolumeX className="w-4 h-4" />
                <span>SILENCE SIREN</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Main Multi-Lingual Alert & Geofence Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        {/* Left Column: Multilingual Alert Composer (7 cols) */}
        <div className="lg:col-span-7 space-y-4">
          <div className="bg-[#0d1c2d] border border-[#1c2b3c] rounded-xl p-4 shadow-xl">
            <div className="flex items-center justify-between border-b border-[#1c2b3c] pb-3 mb-3">
              <div className="flex items-center gap-2">
                <Languages className="w-4 h-4 text-[#44d8f1]" />
                <h3 className="text-xs sm:text-sm font-bold text-white uppercase tracking-wider">
                  Multi-Lingual Alert Matrix (7 Regional Languages)
                </h3>
              </div>
              <span className="text-[10px] font-mono text-[#90cfec] bg-[#0d5c75]/40 px-2 py-0.5 rounded border border-[#0d5c75]">
                BHASHINI VERIFIED
              </span>
            </div>

            {/* Language Selection Tabs */}
            <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pb-2">
              {CAP_LANGUAGES.map((lang) => (
                <button
                  key={lang.id}
                  onClick={() => handleLanguageChange(lang.id)}
                  className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all border cursor-pointer ${
                    selectedLang === lang.id
                      ? 'bg-[#1c2b3c] text-white border-[#44d8f1]'
                      : 'bg-[#122131] text-[#8a9297] border-[#1c2b3c] hover:text-white'
                  }`}
                >
                  <span>{lang.name}</span>
                </button>
              ))}
            </div>

            {/* Editable Text Area for SMS broadcast */}
            <div className="mt-3 relative">
              <textarea
                value={messageText}
                onChange={(e) => setMessageText(e.target.value)}
                rows={4}
                className="w-full bg-[#051424] text-xs sm:text-sm text-[#d4e4fa] border border-[#273647] rounded-lg p-3 focus:outline-none focus:border-[#44d8f1] font-sans resize-none leading-relaxed"
                placeholder="Compose or inspect emergency warning payload..."
              />
              <div className="flex items-center justify-between text-[11px] font-mono text-[#8a9297] mt-1.5">
                <span>GSM Standard: 160 Chars/Segment</span>
                <span
                  className={
                    messageText.length > 160 ? 'text-[#ffb870]' : 'text-[#44d8f1]'
                  }
                >
                  Length: {messageText.length} characters ({Math.ceil(messageText.length / 160)} SMS)
                </span>
              </div>
            </div>

            {/* Quick Alert Presets */}
            <div className="mt-3 pt-3 border-t border-[#1c2b3c]">
              <span className="text-[10px] font-mono text-[#8a9297] block mb-2 uppercase">
                Quick Action Presets:
              </span>
              <div className="flex flex-wrap gap-2">
                <button
                  onClick={() =>
                    setMessageText(
                      'STAGE 3 EVACUATION ORDER: Mangan & Dikchu residents must vacate immediately via Route E-3 to Singtam Stadium. NH-10 closed. Dial 1077 for SDRF assistance.'
                    )
                  }
                  className="text-[11px] font-mono px-2 py-1 rounded bg-[#122131] hover:bg-[#1c2b3c] text-[#ffb4ab] border border-[#93000a] cursor-pointer"
                >
                  Mandatory Evacuation
                </button>
                <button
                  onClick={() =>
                    setMessageText(
                      'TRAFFIC WARNING: NH-10 Teesta Corridor completely shut due to mud debris at Km 38.4. All heavy goods vehicles divert via Kalimpong-Algarah. BRO clearing underway.'
                    )
                  }
                  className="text-[11px] font-mono px-2 py-1 rounded bg-[#122131] hover:bg-[#1c2b3c] text-[#ffb870] border border-[#7d4800] cursor-pointer"
                >
                  Highway NH-10 Closure
                </button>
                <button
                  onClick={() =>
                    setMessageText(
                      'ALL CLEAR NOTICE: Slope stabilization completed at Km 38.4. Route E-3 open for two-way civilian movement. Continue monitoring LEWS app.'
                    )
                  }
                  className="text-[11px] font-mono px-2 py-1 rounded bg-[#122131] hover:bg-[#1c2b3c] text-[#90cfec] border border-[#0d5c75] cursor-pointer"
                >
                  All Clear Advisory
                </button>
              </div>
            </div>
          </div>

          {/* Safe Evacuation Corridor Profile (Route E-3) */}
          <div className="bg-[#0d1c2d] border border-[#1c2b3c] rounded-xl p-4 shadow-xl">
            <div className="flex items-center justify-between border-b border-[#1c2b3c] pb-3 mb-3">
              <div className="flex items-center gap-2">
                <Compass className="w-4 h-4 text-[#44d8f1]" />
                <h3 className="text-xs sm:text-sm font-bold text-white uppercase tracking-wider">
                  Safe Evacuation Corridor: Route E-3 (Upper Singtam Ridge)
                </h3>
              </div>
              <span className="text-[10px] font-mono text-[#00363e] bg-[#44d8f1] px-2 py-0.5 rounded font-bold">
                100% CLEAR
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
              {/* Route Map preview image */}
              <div className="md:col-span-5 relative rounded-lg overflow-hidden border border-[#1c2b3c] h-40">
                <img
                  src={ASSET_URLS.evacuationMapRoute}
                  alt="Route E-3 Evacuation Corridor Map"
                  className="w-full h-full object-cover"
                />
                <div className="absolute top-2 left-2 bg-[#051424]/90 text-[10px] font-mono text-[#44d8f1] px-1.5 py-0.5 rounded border border-[#273647]">
                  ROUTE E-3 ARTERY
                </div>
                <div className="absolute bottom-2 right-2 bg-[#00363e] text-[#44d8f1] text-[9px] font-mono font-bold px-1.5 py-0.5 rounded">
                  ONE-WAY UPHILL FLOW
                </div>
              </div>

              {/* Elevation Profile SVG & Specs */}
              <div className="md:col-span-7 flex flex-col justify-between space-y-2">
                <div>
                  <div className="flex items-center justify-between text-xs text-[#8a9297] font-mono">
                    <span>Elevation Profile (1,480m → 350m Singtam Valley)</span>
                    <span className="text-[#44d8f1]">Total Dist: 18.4 km</span>
                  </div>

                  {/* Elevation Line Chart */}
                  <div className="h-20 w-full mt-1">
                    <svg className="w-full h-full" viewBox="0 0 300 80" preserveAspectRatio="none">
                      <path
                        d="M 10 20 Q 80 25 150 45 T 290 70"
                        fill="none"
                        stroke="#44d8f1"
                        strokeWidth="2.5"
                      />
                      <path
                        d="M 10 20 Q 80 25 150 45 T 290 70 L 290 80 L 10 80 Z"
                        fill="#00bcd4"
                        opacity="0.1"
                      />
                      <circle cx="10" cy="20" r="4" fill="#ffb4ab" />
                      <circle cx="290" cy="70" r="4" fill="#44d8f1" />
                      <text x="15" y="24" fill="#ffb4ab" fontSize="8" fontFamily="monospace">
                        Mangan (1,480m)
                      </text>
                      <text x="180" y="65" fill="#44d8f1" fontSize="8" fontFamily="monospace">
                        Singtam Stadium (350m)
                      </text>
                    </svg>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2 text-xs font-mono">
                  <div className="bg-[#122131] p-2 rounded">
                    <span className="text-[10px] text-[#8a9297] block">AVERAGE TRANSIT TIME</span>
                    <span className="text-white font-bold">32 mins (Civilian Bus)</span>
                  </div>
                  <div className="bg-[#122131] p-2 rounded">
                    <span className="text-[10px] text-[#8a9297] block">SDRF MARSHALS</span>
                    <span className="text-[#44d8f1] font-bold">6 Checkposts Active</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Geofence Stats, Relief Shelters, Tactical Units (5 cols) */}
        <div className="lg:col-span-5 space-y-4">
          {/* Target Geofence Cellular BTS Stats */}
          <div className="bg-[#0d1c2d] border border-[#1c2b3c] rounded-xl p-4 shadow-xl">
            <div className="flex items-center justify-between border-b border-[#1c2b3c] pb-2.5 mb-3">
              <span className="font-mono text-xs font-bold uppercase text-white flex items-center gap-1.5">
                <Radio className="w-3.5 h-3.5 text-[#44d8f1]" />
                Target Geofence Polygon (Mangan Sector)
              </span>
              <span className="text-[10px] font-mono text-[#ffb4ab] bg-[#93000a]/40 px-2 py-0.5 rounded">
                STAGE 3 DISPATCH
              </span>
            </div>

            <div className="grid grid-cols-2 gap-2.5 font-mono text-xs">
              <div className="bg-[#122131] p-2.5 rounded-lg border border-[#1c2b3c]">
                <span className="text-[10px] text-[#8a9297] block">REACHABLE SIMS</span>
                <span className="text-lg font-bold text-[#44d8f1]">142,800</span>
                <span className="text-[9px] text-[#bfc8cd] block">Airtel, Jio, BSNL CMSP</span>
              </div>

              <div className="bg-[#122131] p-2.5 rounded-lg border border-[#1c2b3c]">
                <span className="text-[10px] text-[#8a9297] block">CELL TOWERS</span>
                <span className="text-lg font-bold text-white">48 BTS</span>
                <span className="text-[9px] text-[#bfc8cd] block">25 km Radius Locked</span>
              </div>
            </div>
          </div>

          {/* Designated Relief Shelters */}
          <div className="bg-[#0d1c2d] border border-[#1c2b3c] rounded-xl p-4 shadow-xl">
            <div className="flex items-center justify-between border-b border-[#1c2b3c] pb-2.5 mb-3">
              <span className="font-mono text-xs font-bold uppercase text-white flex items-center gap-1.5">
                <Building2 className="w-3.5 h-3.5 text-[#90cfec]" />
                Designated Safe Relief Shelters
              </span>
              <span className="text-[10px] font-mono text-[#8a9297]">
                CAPACITY STATUS
              </span>
            </div>

            <div className="space-y-2.5">
              {RELIEF_SHELTERS.map((shelter) => (
                <div
                  key={shelter.id}
                  className="bg-[#122131] border border-[#1c2b3c] p-3 rounded-lg text-xs space-y-1.5"
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="font-semibold text-white">{shelter.name}</div>
                      <div className="text-[10px] text-[#8a9297]">{shelter.location}</div>
                    </div>
                    <span
                      className={`text-[9px] font-mono font-bold px-1.5 py-0.5 rounded ${
                        shelter.status === 'CRITICAL'
                          ? 'bg-[#93000a] text-[#ffdad6]'
                          : 'bg-[#00363e] text-[#44d8f1]'
                      }`}
                    >
                      {shelter.occupancyPercent}% FULL
                    </span>
                  </div>

                  {/* Capacity Bar */}
                  <div className="w-full h-1.5 bg-[#051424] rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full ${
                        shelter.occupancyPercent > 80 ? 'bg-[#ffb4ab]' : 'bg-[#44d8f1]'
                      }`}
                      style={{ width: `${shelter.occupancyPercent}%` }}
                    />
                  </div>

                  <div className="flex items-center justify-between text-[10px] font-mono text-[#bfc8cd] pt-1">
                    <span>
                      Occupancy: {shelter.capacityCurrent} / {shelter.capacityMax}
                    </span>
                    <span>Rations: {shelter.rationsDays}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Tactical Units & Resource Stockpile */}
          <div className="bg-[#0d1c2d] border border-[#1c2b3c] rounded-xl p-4 shadow-xl">
            <div className="flex items-center justify-between border-b border-[#1c2b3c] pb-2.5 mb-3">
              <span className="font-mono text-xs font-bold uppercase text-white flex items-center gap-1.5">
                <Truck className="w-3.5 h-3.5 text-[#ffb870]" />
                Tactical Units Mobilized
              </span>
              <span className="text-[10px] font-mono text-[#ffb870] bg-[#7d4800]/40 px-2 py-0.5 rounded">
                {TACTICAL_UNITS.length} TEAMS ACTIVE
              </span>
            </div>

            <div className="space-y-2.5">
              {TACTICAL_UNITS.map((unit) => (
                <div
                  key={unit.id}
                  className="bg-[#122131] border border-[#1c2b3c] p-3 rounded-lg text-xs space-y-1.5"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-white">{unit.name}</span>
                    <span className="text-[9px] font-mono font-bold bg-[#00363e] text-[#44d8f1] px-1.5 py-0.5 rounded">
                      {unit.statusLabel}
                    </span>
                  </div>
                  <p className="text-[11px] text-[#bfc8cd]">{unit.description}</p>
                  <div className="flex items-center justify-between text-[10px] font-mono text-[#8a9297] pt-1 border-t border-[#1c2b3c]">
                    <span>Personnel: {unit.personnel}</span>
                    <span className="text-[#90cfec]">{unit.satcomStatus}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Official SDMA Dispatch Audit Log */}
      <div className="bg-[#0d1c2d] border border-[#1c2b3c] rounded-xl p-4 shadow-xl">
        <div className="flex items-center justify-between border-b border-[#1c2b3c] pb-3 mb-3">
          <div className="flex items-center gap-2">
            <FileText className="w-4 h-4 text-[#44d8f1]" />
            <h3 className="text-xs sm:text-sm font-bold text-white uppercase tracking-wider">
              State Disaster Management Authority (SDMA) Dispatch Audit Stream
            </h3>
          </div>
          <span className="text-[10px] font-mono text-[#8a9297]">
            CRYPTOGRAPHIC LEDGER • SEC 30 DMA 2005
          </span>
        </div>

        <div className="space-y-2.5">
          {auditList.map((log) => (
            <div
              key={log.id}
              className={`p-3 rounded-lg border text-xs transition-all ${
                log.highlight
                  ? 'bg-[#122131] border-[#ffb4ab]/50 shadow-md'
                  : 'bg-[#122131]/60 border-[#1c2b3c]'
              }`}
            >
              <div className="flex flex-wrap items-center justify-between gap-1 mb-1 font-mono text-[11px]">
                <div className="flex items-center gap-2">
                  <span className="font-bold text-[#44d8f1]">{log.code}</span>
                  <span className="text-white font-semibold">{log.title}</span>
                </div>
                <span className="text-[#8a9297]">{log.timestamp}</span>
              </div>
              <p className="text-[#bfc8cd] text-xs leading-relaxed">{log.message}</p>
              <div className="mt-1.5 text-[10px] font-mono text-[#8a9297]">
                Authority: {log.authority}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
