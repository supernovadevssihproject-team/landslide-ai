import React, { useState, useRef, useEffect } from 'react';
import { X, Minus, Send, Bot, User, Sparkles, MapPin, AlertTriangle, ArrowRight, Home, ChevronLeft, Mountain, ShieldAlert, Activity, Database, Droplets, Gauge, LocateFixed, Radio } from 'lucide-react';
import { LandslideApi } from '../services/api';
import { LocationRiskEvaluation, OperationalModule, HazardZone } from '../types';
import { HillsRegion, HILLS_AND_MOUNTAIN_REGIONS } from '../data/hillsData';
import { HAZARD_ZONES } from '../data/mockData';
import { fetchLocationRisk } from '../services/locationRiskService';

const NER_STATES = ['Arunachal Pradesh', 'Assam', 'Manipur', 'Meghalaya', 'Mizoram', 'Nagaland', 'Sikkim', 'Tripura'] as const;
const normalizeState = (state: string) => state.toLowerCase().replace(/\s+pradesh$/, '');

const formatLocationRisk = (name: string, evaluation: LocationRiskEvaluation) => {
  const value = (item: number | null | undefined, suffix = '') =>
    item === null || item === undefined || Number.isNaN(item) ? 'Unavailable' : `${item}${suffix}`;

  const baseProbability = evaluation.base_ml_probability;
  const baseProbabilityText =
    baseProbability === null || baseProbability === undefined || Number.isNaN(baseProbability)
      ? 'Unavailable'
      : `${baseProbability * 100}%`;

  const latitude = evaluation.location?.latitude;
  const longitude = evaluation.location?.longitude;
  const coordinatesText =
    latitude === null || latitude === undefined || longitude === null || longitude === undefined ||
    Number.isNaN(latitude) || Number.isNaN(longitude)
      ? 'Unavailable'
      : `${latitude}, ${longitude}`;

  return (
    `TerraGuard Risk Map analysis: **${name}**\n\n` +
    `• **Overall risk:** **${value(evaluation.final_risk_score, ' / 100')}** (${evaluation.risk_level || 'Unavailable'})\n` +
    `• **Base ML probability:** ${baseProbabilityText}\n` +
    `• **3-day rainfall:** ${value(evaluation.inputs.rainfall.rainfall_3d_mm, ' mm')}\n` +
    `• **Slope:** ${value(evaluation.inputs.slope_deg, '°')}\n` +
    `• **Elevation:** ${value(evaluation.inputs.elevation_m, ' m')}\n` +
    `• **Coordinates:** ${coordinatesText}\n` +
    `• **Seismic trigger score:** ${value(evaluation.inputs.seismic.seismic_trigger_score)}\n\n` +
    'TerraGuard is decision support, not an official warning or evacuation order. Follow SDMA/NDMA and local authority instructions.'
  );
};

const riskTone = (level: LocationRiskEvaluation['risk_level'], dark: boolean) => {
  const tones = {
    LOW: dark ? 'text-emerald-300 bg-emerald-500/10 border-emerald-500/30' : 'text-emerald-700 bg-emerald-50 border-emerald-200',
    MODERATE: dark ? 'text-amber-300 bg-amber-500/10 border-amber-500/30' : 'text-amber-700 bg-amber-50 border-amber-200',
    HIGH: dark ? 'text-orange-300 bg-orange-500/10 border-orange-500/30' : 'text-orange-700 bg-orange-50 border-orange-200',
    VERY_HIGH: dark ? 'text-red-300 bg-red-500/10 border-red-500/30' : 'text-red-700 bg-red-50 border-red-200',
  };
  return tones[level];
};

const RiskCard: React.FC<{ name: string; evaluation: LocationRiskEvaluation; isDark: boolean }> = ({ name, evaluation, isDark }) => {
  const metric = (value: number | null | undefined, suffix = '') =>
    value === null || value === undefined || Number.isNaN(value) ? 'Unavailable' : `${value}${suffix}`;
  const coordinates = evaluation.location.latitude === null || evaluation.location.longitude === null
    ? 'Unavailable'
    : `${evaluation.location.latitude}, ${evaluation.location.longitude}`;
  const score = Math.max(0, Math.min(100, evaluation.final_risk_score));

  return (
    <div className={`mt-2 overflow-hidden rounded-2xl border ${isDark ? 'bg-slate-950/70 border-slate-700' : 'bg-white border-slate-200 shadow-sm'}`}>
      <div className="bg-gradient-to-r from-emerald-500/15 via-cyan-500/10 to-transparent p-3.5">
        <div className={`text-[10px] font-semibold uppercase tracking-[0.18em] ${isDark ? 'text-emerald-300' : 'text-emerald-700'}`}>Location intelligence</div>
        <div className="mt-1 flex items-start justify-between gap-3">
          <div>
            <div className="text-base font-semibold">{name}</div>
            <div className={`mt-1 flex items-center gap-1.5 text-[10px] ${isDark ? 'text-slate-400' : 'text-slate-500'}`}><LocateFixed className="h-3 w-3" />{evaluation.location.state || 'North East India'}</div>
          </div>
          <div className={`rounded-lg border px-2 py-1 text-[10px] font-bold ${riskTone(evaluation.risk_level, isDark)}`}>{evaluation.risk_level.replace('_', ' ')}</div>
        </div>
        <div className="mt-4 flex items-end justify-between">
          <div>
            <div className={`text-[10px] uppercase tracking-wider ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>Risk score</div>
            <div className="text-3xl font-bold tracking-tight">{metric(evaluation.final_risk_score)}<span className={`text-sm font-medium ${isDark ? 'text-slate-400' : 'text-slate-500'}`}> / 100</span></div>
          </div>
          <Gauge className={`h-9 w-9 ${isDark ? 'text-emerald-400' : 'text-emerald-600'}`} />
        </div>
        <div className={`mt-3 h-2 overflow-hidden rounded-full ${isDark ? 'bg-slate-800' : 'bg-slate-200'}`} aria-label={`Risk score ${score} out of 100`}>
          <div className={`h-full rounded-full ${score >= 75 ? 'bg-red-500' : score >= 50 ? 'bg-orange-400' : score >= 25 ? 'bg-amber-400' : 'bg-emerald-500'}`} style={{ width: `${score}%` }} />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-2 p-3 sm:grid-cols-3">
        {[
          ['Base ML probability', metric(evaluation.base_ml_probability * 100, '%'), Activity],
          ['Rainfall · 3 day', metric(evaluation.inputs.rainfall.rainfall_3d_mm, ' mm'), Droplets],
          ['Slope', metric(evaluation.inputs.slope_deg, '°'), Mountain],
          ['Elevation', metric(evaluation.inputs.elevation_m, ' m'), ArrowRight],
          ['Coordinates', coordinates, LocateFixed],
          ['Seismic trigger', metric(evaluation.inputs.seismic.seismic_trigger_score), Radio],
          ['Soil', evaluation.inputs.soil_id || 'Unavailable', Database],
        ].map(([label, value, Icon]) => (
          <div key={label as string} className={`rounded-xl border p-2 ${isDark ? 'border-slate-800 bg-slate-900/70' : 'border-slate-200 bg-slate-50'}`}>
            <div className={`flex items-center gap-1 text-[9px] uppercase tracking-wide ${isDark ? 'text-slate-500' : 'text-slate-500'}`}><Icon className="h-3 w-3" />{label as string}</div>
            <div className="mt-1 truncate text-[11px] font-semibold">{value as string}</div>
          </div>
        ))}
      </div>
      <div className={`flex items-center gap-1.5 border-t px-3 py-2 text-[10px] ${isDark ? 'border-slate-800 text-slate-500' : 'border-slate-200 text-slate-500'}`}><Database className="h-3 w-3" /> TerraGuard live location-risk evaluation</div>
    </div>
  );
};

interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  source?: string;
  action?: {
    type: string;
    module?: OperationalModule;
    region_id?: string;
    zone_id?: string;
    coordinates?: { lat: number; lon: number };
  };
  riskEvaluation?: LocationRiskEvaluation;
  locationName?: string;
  resultType?: 'hill' | 'region';
  timestamp: string;
}

interface ChatWidgetProps {
  theme?: 'dark' | 'light';
  onNavigate?: (module: OperationalModule) => void;
  onSelectZone?: (zone: HazardZone) => void;
  onSelectRegion?: (region: HillsRegion) => void;
}

export const ChatWidget: React.FC<ChatWidgetProps> = ({
  theme = 'dark',
  onNavigate,
  onSelectZone,
  onSelectRegion,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const initialWelcomeMessage = {
    id: 'welcome-msg',
    role: 'assistant' as const,
    content: 'Hello! I\'m TerraGuard AI 👋\n\nI can help you explore landslide risk across the North Eastern Region and Himalayan areas.\n\nWhat would you like to explore?',
    source: 'terraguard-engine',
    timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
  };

  const [messages, setMessages] = useState<ChatMessage[]>([initialWelcomeMessage]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [guide, setGuide] = useState<'home' | 'regions' | 'hills'>('home');
  const [guideState, setGuideState] = useState<string | null>(null);
  const [regionZones, setRegionZones] = useState<HazardZone[]>(HAZARD_ZONES);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const isDark = theme === 'dark';

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    if (isOpen) {
      scrollToBottom();
    }
  }, [messages, isOpen]);

  useEffect(() => {
    if (isOpen) {
      LandslideApi.getHazardZones().then(setRegionZones);
    }
  }, [isOpen]);

  const handleSend = async (textToSend?: string) => {
    const messageText = textToSend || input;
    if (!messageText.trim() || isLoading) return;

    const userMsg: ChatMessage = {
      id: `user-${Date.now()}`,
      role: 'user',
      content: messageText,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    setMessages((prev) => [...prev, userMsg]);
    if (!textToSend) setInput('');
    setIsLoading(true);

    try {
      const historyPayload = messages
        .filter((m) => m.id !== 'welcome-msg')
        .map((m) => ({ role: m.role, content: m.content }));

      const response = await LandslideApi.sendChatMessage(messageText, historyPayload);

      const botMsg: ChatMessage = {
        id: `bot-${Date.now()}`,
        role: 'assistant',
        content: response.reply,
        source: response.source,
        action: response.action,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };

      setMessages((prev) => [...prev, botMsg]);
    } catch (err) {
      setMessages((prev) => [
        ...prev,
        {
          id: `err-${Date.now()}`,
          role: 'assistant',
          content: '⚠️ Failed to connect to TerraGuard AI Assistant. Please check your network.',
          source: 'error',
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const resetConversation = () => {
    setMessages([
      {
        ...initialWelcomeMessage,
        id: `welcome-${Date.now()}`,
        content: 'Welcome back to TerraGuard AI 👋\n\nWhat would you like to explore?',
      },
    ]);
    setGuide('home');
    setGuideState(null);
    setIsLoading(false);
  };

  const handleActionClick = (action: NonNullable<ChatMessage['action']>) => {
    if (action.type === 'NAVIGATE' && action.module && onNavigate) {
      onNavigate(action.module);
    } else if (action.type === 'SELECT_ZONE' && action.zone_id) {
      const zone = regionZones.find((candidate) => candidate.id === action.zone_id);
      if (zone) onSelectZone?.(zone);
      onNavigate?.('risk-map');
    } else if (action.type === 'SELECT_REGION') {
      if (action.zone_id) {
        const zone = regionZones.find((candidate) => candidate.id === action.zone_id);
        if (zone) onSelectZone?.(zone);
      }
      if (action.module && onNavigate) {
        onNavigate(action.module);
      } else if (onNavigate) {
        onNavigate('hills-regions');
      }
    }
  };

  const handleDomainSelection = (domain: 'hills' | 'regions') => {
    setMessages((previous) => [...previous, {
      id: `domain-${Date.now()}`,
      role: 'user',
      content: domain === 'hills' ? 'Hills & Mountains' : 'Regions / Places',
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    }]);
    setGuide(domain);
    setGuideState(null);
    setMessages((previous) => [...previous, {
      id: `domain-followup-${Date.now()}`,
      role: 'assistant',
      content: domain === 'hills'
        ? 'Choose a hill or mountain to check its current risk.'
        : 'Choose a state to explore monitored regions and places.',
      source: 'terraguard-engine',
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    }]);
  };

  const handleStateSelection = (state: string) => {
    setMessages((previous) => [...previous, {
      id: `state-${Date.now()}`,
      role: 'user',
      content: state,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    }]);
    setGuideState(state);
    setMessages((previous) => [...previous, {
      id: `state-followup-${Date.now()}`,
      role: 'assistant',
      content: guide === 'regions'
        ? `Choose a monitored region or place in ${state}.`
        : `Choose a hill or mountain in ${state}.`,
      source: 'terraguard-engine',
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    }]);
  };

  const selectZone = (zone: HazardZone) => {
    onSelectZone?.(zone);
    setGuide('regions');
    setGuideState(null);

    const parsedCoords = (() => {
      const match = zone.coords?.match(/-?\d+(?:\.\d+)?\s*,\s*-?\d+(?:\.\d+)?/);
      if (!match) return null;
      const [latText, lonText] = match[0].split(',');
      const lat = Number.parseFloat(latText.trim());
      const lon = Number.parseFloat(lonText.trim());
      return Number.isFinite(lat) && Number.isFinite(lon) ? { lat, lon } : null;
    })();

    setMessages((previous) => [...previous, {
      id: `zone-user-${Date.now()}`, role: 'user', content: `What is the landslide risk at ${zone.name}?`,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    }]);

    if (!parsedCoords) {
      setMessages((previous) => [...previous, {
        id: `zone-error-${Date.now()}`, role: 'assistant', source: 'terraguard-data',
        content: `I don't have verified coordinates for ${zone.name}, so a location-specific risk evaluation isn't available yet.`,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      }]);
      return;
    }

    setIsLoading(true);
    fetchLocationRisk({
      name: zone.name,
      locationType: 'region',
      latitude: parsedCoords.lat,
      longitude: parsedCoords.lon,
      state: zone.state,
    }).then((evaluation) => {
      setMessages((previous) => [...previous, {
        id: `zone-risk-${Date.now()}`, role: 'assistant', source: 'terraguard-location-risk',
        content: formatLocationRisk(zone.name, evaluation),
        riskEvaluation: evaluation,
        locationName: zone.name,
        resultType: 'region',
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      }]);
    }).catch(() => {
      setMessages((previous) => [...previous, {
        id: `zone-error-${Date.now()}`, role: 'assistant', source: 'error',
        content: 'Unable to evaluate this location through the TerraGuard location-risk service.',
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      }]);
    }).finally(() => setIsLoading(false));
  };

  const selectHill = (hill: HillsRegion) => {
    onSelectRegion?.(hill);
    setGuide('hills');
    setGuideState(null);
    if (!hill.coordinatesVerified || hill.latitude === undefined || hill.longitude === undefined) {
      setMessages((previous) => [...previous, {
        id: `hill-${Date.now()}`, role: 'assistant', source: 'terraguard-data',
        content: `${hill.name} is available in TerraGuard's hill reference data, but it has no verified representative coordinates for a location-risk evaluation.`,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      }]);
      return;
    }
    setMessages((previous) => [...previous, {
      id: `hill-user-${Date.now()}`, role: 'user', content: `Show me ${hill.name}.`,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    }]);
    setIsLoading(true);
    fetchLocationRisk({
      name: hill.name,
      locationType: 'hill',
      latitude: hill.latitude,
      longitude: hill.longitude,
      state: hill.state,
    }).then((evaluation) => {
      setMessages((previous) => [...previous, {
        id: `hill-risk-${Date.now()}`, role: 'assistant', source: 'terraguard-location-risk',
        content: formatLocationRisk(hill.name, evaluation),
        riskEvaluation: evaluation,
        locationName: hill.name,
        resultType: 'hill',
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      }]);
    }).catch(() => {
      setMessages((previous) => [...previous, {
        id: `hill-error-${Date.now()}`, role: 'assistant', source: 'error',
        content: 'Unable to evaluate this hill through the TerraGuard location-risk service.',
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      }]);
    }).finally(() => setIsLoading(false));
  };

  return (
    <div className="fixed bottom-4 right-4 z-50 font-sans sm:bottom-5 sm:right-5">
      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          className={`mb-20 flex items-center gap-2.5 px-4 py-3 rounded-full shadow-2xl border transition-all duration-300 hover:scale-105 sm:mb-24 ${
            isDark
              ? 'bg-emerald-600 hover:bg-emerald-500 text-white border-emerald-400/30 shadow-emerald-950/50'
              : 'bg-emerald-600 hover:bg-emerald-700 text-white border-emerald-500 shadow-emerald-200'
          }`}
        >
          <div className="relative">
            <Bot className="w-5 h-5" />
            <span className="absolute -top-1 -right-1 flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-300 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-200"></span>
            </span>
          </div>
          <span className="font-medium text-sm tracking-wide">TerraGuard AI Chat</span>
        </button>
      )}

      {isOpen && (
        <div
          className={`flex flex-col w-[calc(100vw-2rem)] max-w-[440px] h-[min(680px,calc(100vh-2rem))] rounded-2xl shadow-2xl border overflow-hidden backdrop-blur-xl transition-all duration-300 ${
            isDark
              ? 'bg-slate-900/95 border-slate-700/80 text-slate-100 shadow-black/80'
              : 'bg-white/95 border-slate-200 text-slate-900 shadow-2xl'
          }`}
        >
          {/* Header */}
          <div
            className={`flex items-center justify-between px-4 py-3.5 border-b ${
              isDark
                ? 'bg-slate-800/90 border-slate-700/80'
                : 'bg-emerald-700 text-white border-emerald-600'
            }`}
          >
            <div className="flex items-center gap-2.5">
              <div
                className={`p-2 rounded-xl ${
                  isDark ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' : 'bg-white/20 text-white'
                }`}
              >
                <Bot className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-semibold text-sm leading-snug flex items-center gap-1.5">
                  TerraGuard AI
                  <Sparkles className="w-3.5 h-3.5 text-amber-400 fill-amber-400" />
                </h3>
                <p className={`text-[11px] ${isDark ? 'text-slate-400' : 'text-emerald-100'}`}>
                  <span className="inline-flex items-center gap-1.5"><span className="h-1.5 w-1.5 rounded-full bg-emerald-300 shadow-[0_0_8px_currentColor]" />TerraGuard Intelligence · Live risk data</span>
                </p>
              </div>
            </div>
            <div className="flex items-center gap-1">
              <button
                onClick={() => setIsOpen(false)}
                aria-label="Minimize TerraGuard AI"
                className={`rounded-lg p-1.5 transition-colors ${
                  isDark
                    ? 'text-slate-400 hover:bg-slate-700 hover:text-white'
                    : 'text-white/80 hover:bg-emerald-600 hover:text-white'
                }`}
              >
                <Minus className="h-4 w-4" />
              </button>
              <button
                onClick={() => setIsOpen(false)}
                aria-label="Close TerraGuard AI"
                className={`rounded-lg p-1.5 transition-colors ${
                  isDark
                    ? 'text-slate-400 hover:bg-slate-700 hover:text-white'
                    : 'text-white/80 hover:bg-emerald-600 hover:text-white'
                }`}
              >
                <X className="h-5 w-5" />
              </button>
            </div>
          </div>

          {guide === 'home' ? (
            <div className={`p-3 border-b text-xs ${isDark ? 'bg-slate-950/60 border-slate-800' : 'bg-slate-50 border-slate-200'}`}>
              <div className={`rounded-xl border p-3 ${isDark ? 'border-emerald-500/20 bg-emerald-500/5' : 'border-emerald-200 bg-emerald-50/70'}`}>
                <div className={`text-sm font-semibold ${isDark ? 'text-slate-100' : 'text-slate-900'}`}>Hello! I&apos;m TerraGuard AI</div>
                <div className={`mt-1 text-[11px] leading-relaxed ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>I can help you explore landslide risk across the North Eastern Region and Himalayan areas.</div>
              </div>
              <div className="mt-3 grid grid-cols-2 gap-2">
                <button onClick={() => handleDomainSelection('hills')} className={`rounded-xl border px-3 py-3 text-left text-[12px] font-medium transition-colors hover:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500 ${isDark ? 'border-emerald-500/40 bg-emerald-500/5 text-emerald-300' : 'border-emerald-300 bg-emerald-50 text-emerald-800'}`}>
                  <div className="flex items-center gap-2"><Mountain className="h-4 w-4" /> Hills &amp; Mountains</div>
                </button>
                <button onClick={() => handleDomainSelection('regions')} className={`rounded-xl border px-3 py-3 text-left text-[12px] font-medium transition-colors hover:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500 ${isDark ? 'border-emerald-500/40 bg-emerald-500/5 text-emerald-300' : 'border-emerald-300 bg-emerald-50 text-emerald-800'}`}>
                  <div className="flex items-center gap-2"><MapPin className="h-4 w-4" /> Regions / Places</div>
                </button>
              </div>
            </div>
          ) : (
            <div className={`flex items-center gap-1.5 px-3 py-2 border-b text-[11px] ${isDark ? 'bg-slate-950/60 border-slate-800' : 'bg-slate-50 border-slate-200'}`}>
              <button onClick={resetConversation} aria-label="Return to chatbot home" className="flex items-center gap-1 rounded-lg border border-slate-500/50 px-2 py-1 text-slate-400 transition-colors hover:border-emerald-500 hover:text-emerald-400 focus:outline-none focus:ring-2 focus:ring-emerald-500"><Home className="h-3.5 w-3.5" /> Home</button>
              {guideState && <button onClick={() => setGuideState(null)} aria-label="Go back" className="flex items-center gap-1 rounded-lg border border-slate-500/50 px-2 py-1 text-slate-400 transition-colors hover:border-emerald-500 hover:text-emerald-400 focus:outline-none focus:ring-2 focus:ring-emerald-500"><ChevronLeft className="h-3.5 w-3.5" /> Back</button>}
              <span className="ml-1 font-semibold">{guide === 'regions' ? 'Choose your region' : 'Choose a hill / mountain'}</span>
            </div>
          )}

          {guide !== 'home' && (
            <div className={`px-3 py-2 border-b text-xs ${isDark ? 'bg-slate-950/70 border-slate-800' : 'bg-slate-50 border-slate-200'}`}>
              {!guideState ? (
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">{NER_STATES.map((state) => <button key={state} onClick={() => handleStateSelection(state)} className={`rounded-xl border p-2.5 text-left text-[11px] font-medium transition-colors hover:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500 ${isDark ? 'border-slate-700 bg-slate-900/60 text-slate-300 hover:bg-emerald-950/40' : 'border-slate-200 bg-white text-slate-700 hover:bg-emerald-50'}`}><span className="block text-[9px] uppercase tracking-wider text-emerald-500">State</span>{state}</button>)}</div>
              ) : guide === 'regions' ? (
                <div className="grid max-h-32 grid-cols-1 gap-2 overflow-y-auto pr-1 sm:grid-cols-2">{regionZones.filter((zone) => normalizeState(zone.state) === normalizeState(guideState)).map((zone) => <button key={zone.id} onClick={() => selectZone(zone)} className={`rounded-xl border p-2.5 text-left transition-colors hover:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500 ${isDark ? 'border-slate-700 bg-slate-900/60 hover:bg-emerald-950/30' : 'border-slate-200 bg-white hover:bg-emerald-50'}`}><span className="block text-[11px] font-semibold">{zone.name}</span><span className={`mt-1 block text-[9px] ${isDark ? 'text-slate-500' : 'text-slate-500'}`}>{zone.riskStatus} · {zone.coords}</span></button>)}</div>
              ) : (
                <div className="grid max-h-32 grid-cols-1 gap-2 overflow-y-auto pr-1 sm:grid-cols-2">{HILLS_AND_MOUNTAIN_REGIONS.filter((hill) => normalizeState(hill.state) === normalizeState(guideState)).map((hill) => <button key={hill.id} onClick={() => selectHill(hill)} className={`rounded-xl border p-2.5 text-left transition-colors hover:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500 ${isDark ? 'border-slate-700 bg-slate-900/60 hover:bg-emerald-950/30' : 'border-slate-200 bg-white hover:bg-emerald-50'}`}><span className="block text-[11px] font-semibold">{hill.name}</span><span className={`mt-1 block text-[9px] ${isDark ? 'text-slate-500' : 'text-slate-500'}`}>{hill.category} · {hill.coordinatesVerified ? 'Verified coordinates' : 'Coordinates unavailable'}</span></button>)}</div>
              )}
            </div>
          )}

          {/* Message History */}
          <div className="flex-1 p-4 overflow-y-auto space-y-3.5 text-xs leading-relaxed">
            {messages.map((msg) => (
              <div
                key={msg.id}
                className={`flex gap-2.5 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                {msg.role === 'assistant' && (
                  <div
                    className={`w-6 h-6 rounded-full flex items-center justify-center shrink-0 mt-0.5 ${
                      isDark ? 'bg-emerald-900/60 text-emerald-400 border border-emerald-700/50' : 'bg-emerald-100 text-emerald-700'
                    }`}
                  >
                    <Bot className="w-3.5 h-3.5" />
                  </div>
                )}

                <div className="max-w-[85%] space-y-2">
                  <div
                    className={`p-3 rounded-2xl ${
                      msg.role === 'user'
                        ? 'bg-emerald-600 text-white rounded-br-none shadow-md'
                        : isDark
                        ? 'bg-slate-800/90 text-slate-200 border border-slate-700/60 rounded-bl-none'
                        : 'bg-slate-100 text-slate-800 border border-slate-200 rounded-bl-none'
                    }`}
                  >
                    {msg.riskEvaluation && msg.locationName ? (
                      <RiskCard name={msg.locationName} evaluation={msg.riskEvaluation} isDark={isDark} />
                    ) : (
                      <div className="whitespace-pre-wrap font-sans">{msg.content}</div>
                    )}

                    {msg.source && msg.role === 'assistant' && (
                      <div className="mt-2 pt-1.5 border-t border-slate-700/40 flex items-center justify-between text-[10px] opacity-70">
                        <span>Source: {msg.source}</span>
                        <span>{msg.timestamp}</span>
                      </div>
                    )}
                    {msg.role === 'assistant' && msg.riskEvaluation && (
                      <div className="mt-2 grid grid-cols-2 gap-2">
                        <button onClick={() => onNavigate?.('risk-map')} className={`rounded-xl border px-2.5 py-2 text-[10px] font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-emerald-500 ${isDark ? 'border-emerald-500/40 bg-emerald-500/5 text-emerald-300 hover:bg-emerald-500/10' : 'border-emerald-300 bg-emerald-50 text-emerald-800 hover:bg-emerald-100'}`}>
                          Open Risk Map
                        </button>
                        <button onClick={() => onNavigate?.('risk-details')} className={`rounded-xl border px-2.5 py-2 text-[10px] font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-emerald-500 ${isDark ? 'border-slate-700 bg-slate-800/80 text-slate-300 hover:border-slate-500' : 'border-slate-200 bg-white text-slate-700 hover:border-slate-300'}`}>
                          View Risk Details
                        </button>
                        <button onClick={() => {
                          if (msg.resultType === 'region') {
                            setGuide('regions');
                            setGuideState(null);
                          } else {
                            setGuide('hills');
                            setGuideState(null);
                          }
                        }} className={`rounded-xl border px-2.5 py-2 text-[10px] font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-emerald-500 ${isDark ? 'border-slate-700 bg-slate-800/80 text-slate-300 hover:border-slate-500' : 'border-slate-200 bg-white text-slate-700 hover:border-slate-300'}`}>
                          {msg.resultType === 'region' ? 'Check Another Region' : 'Check Another Hill'}
                        </button>
                        <button onClick={resetConversation} className={`rounded-xl border px-2.5 py-2 text-[10px] font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-emerald-500 ${isDark ? 'border-red-500/40 bg-red-500/5 text-red-300 hover:bg-red-500/10' : 'border-red-200 bg-red-50 text-red-700 hover:bg-red-100'}`}>
                          Exit
                        </button>
                      </div>
                    )}
                  </div>

                  {/* Interactive Action Card */}
                  {msg.action && (
                    <button
                      onClick={() => handleActionClick(msg.action!)}
                      className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-left border text-xs transition-all hover:scale-[1.02] ${
                        isDark
                          ? 'bg-emerald-950/40 hover:bg-emerald-900/50 border-emerald-600/40 text-emerald-300'
                          : 'bg-emerald-50 hover:bg-emerald-100 border-emerald-300 text-emerald-800'
                      }`}
                    >
                      <span className="flex items-center gap-1.5 font-medium">
                        {msg.action.type === 'NAVIGATE' ? (
                          <ArrowRight className="w-3.5 h-3.5" />
                        ) : (
                          <MapPin className="w-3.5 h-3.5" />
                        )}
                        {msg.action.type === 'NAVIGATE'
                          ? `Navigate to ${msg.action.module?.toUpperCase()}`
                          : 'Explore Region Details'}
                      </span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>

                {msg.role === 'user' && (
                  <div className="w-6 h-6 rounded-full bg-slate-700 text-slate-300 flex items-center justify-center shrink-0 mt-0.5">
                    <User className="w-3.5 h-3.5" />
                  </div>
                )}
              </div>
            ))}

            {isLoading && (
              <div className="flex gap-2.5 items-center text-slate-400 text-xs">
                <div className="w-6 h-6 rounded-full bg-emerald-900/60 text-emerald-400 flex items-center justify-center animate-pulse">
                  <Bot className="w-3.5 h-3.5" />
                </div>
                <div className={`flex items-center gap-2 rounded-xl border px-3 py-2 ${isDark ? 'border-slate-700 bg-slate-800/70 text-slate-400' : 'border-slate-200 bg-slate-50 text-slate-500'}`}>
                  <span>TerraGuard is analyzing</span>
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-bounce"></span>
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-bounce [animation-delay:0.2s]"></span>
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-bounce [animation-delay:0.4s]"></span>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Input Form */}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSend();
            }}
            className={`p-3 border-t flex items-center gap-2 ${
              isDark ? 'bg-slate-900 border-slate-800' : 'bg-slate-50 border-slate-200'
            }`}
          >
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask TerraGuard Assistant..."
              aria-label="Ask TerraGuard AI"
              className={`flex-1 px-3.5 py-2.5 rounded-xl border text-xs outline-none transition-colors ${
                isDark
                  ? 'bg-slate-800/80 border-slate-700 text-slate-100 placeholder-slate-400 focus:border-emerald-500'
                  : 'bg-white border-slate-300 text-slate-900 placeholder-slate-400 focus:border-emerald-600'
              }`}
            />
            <button
              type="submit"
              disabled={!input.trim() || isLoading}
              aria-label="Send message"
              className={`p-2.5 rounded-xl border transition-all ${
                input.trim() && !isLoading
                  ? 'bg-emerald-600 hover:bg-emerald-500 text-white border-emerald-500 shadow-md'
                  : isDark
                  ? 'bg-slate-800 text-slate-500 border-slate-700 cursor-not-allowed'
                  : 'bg-slate-200 text-slate-400 border-slate-300 cursor-not-allowed'
              }`}
            >
              <Send className="w-4 h-4" />
            </button>
          </form>
        </div>
      )}
    </div>
  );
};
