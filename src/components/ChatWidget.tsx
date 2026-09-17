import React, { useState, useRef, useEffect } from 'react';
import { X, Minus, Send, Bot, User, Sparkles, MapPin, ArrowRight, Home, Mountain, Activity, Database, Droplets, Gauge, LocateFixed, Radio, Mic, Square, Volume2, VolumeX } from 'lucide-react';
import { LandslideApi } from '../services/api';
import { LocationRiskEvaluation, OperationalModule, HazardZone } from '../types';
import { HillsRegion, HILLS_AND_MOUNTAIN_REGIONS } from '../data/hillsData';
import { HAZARD_ZONES } from '../data/mockData';
import { fetchLocationRisk } from '../services/locationRiskService';
import { ChatbotLanguage, chatbotLanguageOptions, useChatbotLanguage, useI18n } from '../i18n/index.tsx';

const NER_STATES = ['Arunachal Pradesh', 'Assam', 'Manipur', 'Meghalaya', 'Mizoram', 'Nagaland', 'Sikkim', 'Tripura'] as const;
const normalizeState = (state: string) => state.toLowerCase().replace(/\s+pradesh$/, '');

type SpeechRecognitionLike = {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  start: () => void;
  stop: () => void;
  abort: () => void;
  onresult: ((event: { results: ArrayLike<ArrayLike<{ transcript: string }>>; resultIndex?: number; isFinal?: boolean }) => void) | null;
  onerror: ((event: { error: string }) => void) | null;
  onend: (() => void) | null;
};

type SpeechWindow = Window & {
  SpeechRecognition?: new () => SpeechRecognitionLike;
  webkitSpeechRecognition?: new () => SpeechRecognitionLike;
};

const VOICE_LANGUAGE_TAGS: Record<ChatbotLanguage, string> = {
  en: 'en-IN',
  hi: 'hi-IN',
  as: 'as-IN',
  bn: 'bn-IN',
  brx: 'brx-IN',
  ks: 'ks-IN',
  mni: 'mni-IN',
  lus: 'lus-IN',
  ne: 'ne-NP',
};

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
    `• **3-day rainfall:** ${value(evaluation.inputs?.rainfall?.rainfall_3d_mm, ' mm')}\n` +
    `• **Slope:** ${value(evaluation.inputs?.slope_deg, '°')}\n` +
    `• **Elevation:** ${value(evaluation.inputs?.elevation_m, ' m')}\n` +
    `• **Coordinates:** ${coordinatesText}\n` +
    `• **Seismic trigger score:** ${value(evaluation.inputs?.seismic?.seismic_trigger_score)}\n\n` +
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
  return tones[level] ?? (dark ? 'text-slate-300 bg-slate-500/10 border-slate-500/30' : 'text-slate-700 bg-slate-50 border-slate-200');
};

const RiskCard: React.FC<{ name: string; evaluation: LocationRiskEvaluation; isDark: boolean }> = ({ name, evaluation, isDark }) => {
  const metric = (value: number | null | undefined, suffix = '') =>
    value === null || value === undefined || Number.isNaN(value) ? 'Unavailable' : `${value}${suffix}`;

  const lat = evaluation.location?.latitude;
  const lon = evaluation.location?.longitude;
  const coordinates =
    lat === null || lat === undefined || lon === null || lon === undefined || Number.isNaN(lat) || Number.isNaN(lon)
      ? 'Unavailable'
      : `${lat}, ${lon}`;

  const rawScore = evaluation.final_risk_score;
  const score =
    rawScore === null || rawScore === undefined || Number.isNaN(rawScore)
      ? 0
      : Math.max(0, Math.min(100, rawScore));

  const baseMlPct =
    evaluation.base_ml_probability === null ||
    evaluation.base_ml_probability === undefined ||
    Number.isNaN(evaluation.base_ml_probability)
      ? null
      : evaluation.base_ml_probability * 100;

  return (
    <div className={`mt-2 overflow-hidden rounded-2xl border ${isDark ? 'bg-slate-950/70 border-slate-700' : 'bg-white border-slate-200 shadow-sm'}`}>
      <div className="bg-gradient-to-r from-emerald-500/15 via-cyan-500/10 to-transparent p-3.5">
        <div className={`text-[10px] font-semibold uppercase tracking-[0.18em] ${isDark ? 'text-emerald-300' : 'text-emerald-700'}`}>Location intelligence</div>
        <div className="mt-1 flex items-start justify-between gap-3">
          <div>
            <div className="text-base font-semibold">{name}</div>
            <div className={`mt-1 flex items-center gap-1.5 text-[10px] ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
              <LocateFixed className="h-3 w-3" />
              {evaluation.location?.state || 'North East India'}
            </div>
          </div>
          <div className={`rounded-lg border px-2 py-1 text-[10px] font-bold ${riskTone(evaluation.risk_level, isDark)}`}>
            {(evaluation.risk_level || 'UNKNOWN').replace('_', ' ')}
          </div>
        </div>
        <div className="mt-4 flex items-end justify-between">
          <div>
            <div className={`text-[10px] uppercase tracking-wider ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>Risk score</div>
            <div className="text-3xl font-bold tracking-tight">
              {metric(evaluation.final_risk_score)}
              <span className={`text-sm font-medium ${isDark ? 'text-slate-400' : 'text-slate-500'}`}> / 100</span>
            </div>
          </div>
          <Gauge className={`h-9 w-9 ${isDark ? 'text-emerald-400' : 'text-emerald-600'}`} />
        </div>
        <div
          className={`mt-3 h-2 overflow-hidden rounded-full ${isDark ? 'bg-slate-800' : 'bg-slate-200'}`}
          aria-label={`Risk score ${score} out of 100`}
        >
          <div
            className={`h-full rounded-full ${
              score >= 75 ? 'bg-red-500' : score >= 50 ? 'bg-orange-400' : score >= 25 ? 'bg-amber-400' : 'bg-emerald-500'
            }`}
            style={{ width: `${score}%` }}
          />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-2 p-3 sm:grid-cols-3">
        {[
          ['Base ML probability', metric(baseMlPct, '%'), Activity],
          ['Rainfall · 3 day', metric(evaluation.inputs?.rainfall?.rainfall_3d_mm, ' mm'), Droplets],
          ['Slope', metric(evaluation.inputs?.slope_deg, '°'), Mountain],
          ['Elevation', metric(evaluation.inputs?.elevation_m, ' m'), ArrowRight],
          ['Coordinates', coordinates, LocateFixed],
          ['Seismic trigger', metric(evaluation.inputs?.seismic?.seismic_trigger_score), Radio],
          ['Soil', evaluation.inputs?.soil_id || 'Unavailable', Database],
        ].map(([label, value, Icon]) => (
          <div
            key={label as string}
            className={`rounded-xl border p-2 ${isDark ? 'border-slate-800 bg-slate-900/70' : 'border-slate-200 bg-slate-50'}`}
          >
            <div className={`flex items-center gap-1 text-[9px] uppercase tracking-wide ${isDark ? 'text-slate-500' : 'text-slate-500'}`}>
              <Icon className="h-3 w-3" />
              {label as string}
            </div>
            <div className="mt-1 truncate text-[11px] font-semibold">{value as string}</div>
          </div>
        ))}
      </div>
      <div
        className={`flex items-center gap-1.5 border-t px-3 py-2 text-[10px] ${
          isDark ? 'border-slate-800 text-slate-500' : 'border-slate-200 text-slate-500'
        }`}
      >
        <Database className="h-3 w-3" /> TerraGuard live location-risk evaluation
      </div>
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

type ChatbotFlow =
  | 'LANGUAGE_SELECTION'
  | 'MAIN_MENU'
  | 'HILLS_STATE_SELECTION'
  | 'HILLS_LOCATION_SELECTION'
  | 'HILL_ACTIONS'
  | 'REGIONS_STATE_SELECTION'
  | 'REGIONS_LOCATION_SELECTION'
  | 'REGION_ACTIONS'
  | 'APPLICATION_SELECTION_PENDING'
  | 'APPLICATION_SELECTION_CONFIRMED'
  | 'DATA_LOADING'
  | 'ANALYSIS'
  | 'RESULTS'
  | 'WAITING_FOR_ACKNOWLEDGEMENT'
  | 'EXITED';

type ChatbotStatus = 'IDLE' | 'SELECTION_LOADING' | 'DATA_LOADING' | 'ANALYZING' | 'COMPLETE';

interface ChatWidgetProps {
  theme?: 'dark' | 'light';
  onNavigate?: (module: OperationalModule) => void;
  onSelectZone?: (zone: HazardZone) => void;
  onSelectRegion?: (region: HillsRegion) => void;
  applicationState?: string;
  applicationRegion?: HillsRegion | null;
  applicationZone?: HazardZone | null;
  onRequestStateChange?: (state: string) => void;
}

const CHATBOT_COPY: Record<
  ChatbotLanguage,
  {
    welcome: string;
    returningWelcome: string;
    error: string;
    hillsPrompt: string;
    regionsPrompt: string;
    regionPrompt: (state: string) => string;
    hillPrompt: (state: string) => string;
    unavailable: (name: string) => string;
    evaluationError: string;
  }
> = {
  en: {
    welcome: 'Hello! Welcome to TerraGuard AI. 🌿\n\nPlease choose your chatbot language.',
    returningWelcome: "Great! You're ready to explore TerraGuard. What would you like to explore?",
    error: '⚠️ Failed to connect to TerraGuard AI Assistant. Please check your network.',
    hillsPrompt: "Great! Let's explore the hills and mountain regions. Which state would you like to explore?",
    regionsPrompt: "Great! Let's explore regions and places. Which state would you like to explore?",
    regionPrompt: (state) => `${state} selected. Which region or place would you like to explore?`,
    hillPrompt: (state) => `${state} selected. Which hill or mountain region would you like to explore?`,
    unavailable: (name) =>
      `I don't have verified coordinates for ${name}, so a location-specific risk evaluation isn't available yet.`,
    evaluationError: 'Unable to evaluate this location through the TerraGuard location-risk service.',
  },
  hi: {
    welcome: 'नमस्ते! TerraGuard AI में आपका स्वागत है। 🌿\n\nकृपया अपनी चैटबॉट भाषा चुनें।',
    returningWelcome: 'आज मैं आपकी कैसे मदद कर सकता हूँ?',
    error: '⚠️ TerraGuard AI Assistant से कनेक्ट नहीं हो सका। कृपया अपना नेटवर्क जांचें।',
    hillsPrompt: 'वर्तमान जोखिम जांचने के लिए कोई पहाड़ी या पर्वत चुनें।',
    regionsPrompt: 'निगरानी किए गए क्षेत्रों और स्थानों को देखने के लिए राज्य चुनें।',
    regionPrompt: (state) => `${state} में निगरानी किया गया क्षेत्र या स्थान चुनें।`,
    hillPrompt: (state) => `${state} में कोई पहाड़ी या पर्वत चुनें।`,
    unavailable: (name) =>
      `${name} के सत्यापित निर्देशांक उपलब्ध नहीं हैं, इसलिए स्थान-विशिष्ट जोखिम मूल्यांकन अभी उपलब्ध नहीं है।`,
    evaluationError: 'TerraGuard स्थान-जोखिम सेवा से इस स्थान का मूल्यांकन नहीं हो सका।',
  },
  as: {
    welcome:
      'নমস্কাৰ! মই TerraGuard AI 👋\n\nউত্তৰ-পূব অঞ্চল আৰু হিমালয়ৰ ভূমিস্খলন বিপদ বুজিবলৈ মই সহায় কৰিব পাৰোঁ।\n\nআপুনি কি চাব বিচাৰে?',
    returningWelcome: 'TerraGuard AI-লৈ পুনৰ স্বাগতম 👋\n\nআপুনি কি চাব বিচাৰে?',
    error: '⚠️ TerraGuard AI Assistant-ৰ সৈতে সংযোগ নহ’ল। আপোনাৰ নেটৱৰ্ক পৰীক্ষা কৰক।',
    hillsPrompt: 'বৰ্তমান বিপদ চাবলৈ এখন পাহাৰ বা পৰ্বত বাছনি কৰক।',
    regionsPrompt: 'নিৰীক্ষণ কৰা অঞ্চল আৰু ঠাই চাবলৈ ৰাজ্য বাছনি কৰক।',
    regionPrompt: (state) => `${state}-ৰ এটা নিৰীক্ষণ কৰা অঞ্চল বা ঠাই বাছনি কৰক।`,
    hillPrompt: (state) => `${state}-ৰ এখন পাহাৰ বা পৰ্বত বাছনি কৰক।`,
    unavailable: (name) =>
      `${name}-ৰ সত্যাপিত স্থানাংক নাই, সেয়ে স্থান-নিৰ্দিষ্ট বিপদ মূল্যায়ন এতিয়া উপলব্ধ নহয়।`,
    evaluationError: 'TerraGuard স্থান-বিপদ সেৱাৰ জৰিয়তে এই ঠাইটো মূল্যায়ন কৰিব পৰা নগ’ল।',
  },
  bn: {
    welcome:
      'নমস্কার! আমি TerraGuard AI 👋\n\nউত্তর-পূর্ব অঞ্চল ও হিমালয় এলাকায় ভূমিধসের ঝুঁকি বুঝতে আমি সাহায্য করতে পারি।\n\nআপনি কী দেখতে চান?',
    returningWelcome: 'TerraGuard AI-তে আবার স্বাগতম 👋\n\nআপনি কী দেখতে চান?',
    error: '⚠️ TerraGuard AI Assistant-এর সঙ্গে সংযোগ করা যায়নি। আপনার নেটওয়ার্ক পরীক্ষা করুন।',
    hillsPrompt: 'বর্তমান ঝুঁকি দেখতে একটি পাহাড় বা পর্বত বেছে নিন।',
    regionsPrompt: 'পর্যবেক্ষিত অঞ্চল ও স্থান দেখতে একটি রাজ্য বেছে নিন।',
    regionPrompt: (state) => `${state}-এর একটি পর্যবেক্ষিত অঞ্চল বা স্থান বেছে নিন।`,
    hillPrompt: (state) => `${state}-এর একটি পাহাড় বা পর্বত বেছে নিন।`,
    unavailable: (name) =>
      `${name}-এর যাচাই করা স্থানাঙ্ক নেই, তাই স্থান-নির্দিষ্ট ঝুঁকি মূল্যায়ন এখন উপলব্ধ নয়।`,
    evaluationError: 'TerraGuard স্থানীয় ঝুঁকি পরিষেবার মাধ্যমে এই স্থানটি মূল্যায়ন করা যায়নি।',
  },
  brx: {
    welcome:
      'सुबुं! आं TerraGuard AI 👋\n\nआं उत्तर-पूर्व आरो हिमालयनि लैंडस्लाइड जोखोम नायनो मदद खालामनो हायो।\n\nनों मा नायनो लुबैयो?',
    returningWelcome: 'TerraGuard AI-आव फिन स्वागतम् 👋\n\nनों मा नायनो लुबैयो?',
    error: '⚠️ TerraGuard AI Assistant जों सोमोन्दो खालामनो हायाखै। नोंनि नेटवार्क नाय।',
    hillsPrompt: 'दानाय जोखोम नायनो डोंगर एबा पहार बासिख।',
    regionsPrompt: 'नायगिरि जायगा नायनो राज्य बासिख।',
    regionPrompt: (state) => `${state}-आव नायगिरि जायगा बासिख।`,
    hillPrompt: (state) => `${state}-आव डोंगर एबा पहार बासिख।`,
    unavailable: (name) => `${name}-नि जांच जायगा नङा, बेखायनो जायगानि जोखोम मूल्यांकन दंनाय नङा।`,
    evaluationError: 'TerraGuard जायगा-जोखोम सेवादों बे जायगाखौ मूल्यांकन खालामनो हायाखै।',
  },
  ks: {
    welcome:
      'Khublei! Nga dei TerraGuard AI 👋\n\nNga lah ban iarap ia phi ban sngewthuh ia ka jingma landslide ha North Eastern Region bad Himalayan areas.\n\nKaei kaba phi kwah ban peit?',
    returningWelcome: 'Pdiang biang sha TerraGuard AI 👋\n\nKaei kaba phi kwah ban peit?',
    error: '⚠️ Ym lah ban pyniasoh bad TerraGuard AI Assistant. Peit ia ka network jong phi.',
    hillsPrompt: 'Jied ia u lum ne u bynta lum ban peit ia ka jingma mynta.',
    regionsPrompt: 'Jied ia ka jylla ban peit ia ki jaka ba peitngor.',
    regionPrompt: (state) => `Jied ia ka jaka ba peitngor ha ${state}.`,
    hillPrompt: (state) => `Jied ia u lum ha ${state}.`,
    unavailable: (name) =>
      'Ym don ki coordinate ba la pynshisha na ka bynta ' + name + ', kumta ym pat lah ban ioh ia ka jingbishar jingma jong ka jaka.',
    evaluationError: 'Ym lah ban bishar ia kane ka jaka lyngba ka TerraGuard location-risk service.',
  },
  mni: {
    welcome:
      'Khurum! Ei TerraGuard AI 👋\n\nNorth Eastern Region amasung Himalayan area-singda landslide risk thajaduna ei mapung phangjari.\n\nNangna kari thajaba pammi?',
    returningWelcome: 'TerraGuard AI-da amuk humar swagat 👋\n\nNangna kari thajaba pammi?',
    error: '⚠️ TerraGuard AI Assistant-ga connect touba ngamde. Nanggi network yeng-u.',
    hillsPrompt: 'Houjik-gi risk yengnanaba hill nattraga mountain ama khan-u.',
    regionsPrompt: 'Monitored region amasung place yengnanaba state ama khan-u.',
    regionPrompt: (state) => `${state}-da monitored region nattraga place ama khan-u.`,
    hillPrompt: (state) => `${state}-da hill nattraga mountain ama khan-u.`,
    unavailable: (name) =>
      `${name}-gi verified coordinates phangde, maram aduna location-specific risk evaluation houjik available nattre.`,
    evaluationError: 'TerraGuard location-risk service-na madugi evaluation touba ngamde.',
  },
  lus: {
    welcome:
      'Chibai! TerraGuard AI ka ni e 👋\n\nNorth Eastern Region leh Himalaya hmunah landslide hlauhawm hrethiam turin ka pui thei.\n\nEng nge i en duh?',
    returningWelcome: 'TerraGuard AI-ah lo kir leh rawh 👋\n\nEng nge i en duh?',
    error: '⚠️ TerraGuard AI Assistant nen inbiakpawh theih lo. Network i en rawh.',
    hillsPrompt: 'Tunah risk en turin tlang emaw tlangpui emaw thlang rawh.',
    regionsPrompt: 'Region leh hmunte en turin state thlang rawh.',
    regionPrompt: (state) => `${state}-ah hmun thlanga en rawh.`,
    hillPrompt: (state) => `${state}-ah tlang emaw tlangpui emaw thlang rawh.`,
    unavailable: (name) =>
      `${name} tana coordinates dik tak a awm lo, chuvangin location-risk evaluation tunah a awm lo.`,
    evaluationError: 'TerraGuard location-risk service hmangin he hmun hi zirchiang theih a ni lo.',
  },
  ne: {
    welcome:
      'नमस्ते! म TerraGuard AI हुँ 👋\n\nम उत्तर-पूर्वी क्षेत्र र हिमाली भूभागमा पहिरोको जोखिम बुझ्न सहयोग गर्न सक्छु।\n\nतपाईं के हेर्न चाहनुहुन्छ?',
    returningWelcome: 'TerraGuard AI मा पुनः स्वागत छ 👋\n\nतपाईं के हेर्न चाहनुहुन्छ?',
    error: '⚠️ TerraGuard AI Assistant सँग जडान हुन सकेन। कृपया आफ्नो नेटवर्क जाँच गर्नुहोस्।',
    hillsPrompt: 'हालको जोखिम जाँच्न पहाड वा पर्वत छान्नुहोस्।',
    regionsPrompt: 'निगरानी गरिएका क्षेत्र र स्थान हेर्न राज्य छान्नुहोस्।',
    regionPrompt: (state) => `${state} मा निगरानी गरिएको क्षेत्र वा स्थान छान्नुहोस्।`,
    hillPrompt: (state) => `${state} मा पहाड वा पर्वत छान्नुहोस्।`,
    unavailable: (name) =>
      `${name} का प्रमाणित निर्देशाङ्क उपलब्ध छैनन्, त्यसैले स्थान-विशिष्ट जोखिम मूल्याङ्कन अहिले उपलब्ध छैन।`,
    evaluationError: 'TerraGuard स्थान-जोखिम सेवाबाट यस स्थानको मूल्याङ्कन गर्न सकिएन।',
  },
};

const CHATBOT_EXIT_COPY: Record<ChatbotLanguage, { farewell: string; chooseLanguage: string }> = {
  en: {
    farewell: 'Thank you for using TerraGuard AI. Have a safe day! 🌿',
    chooseLanguage: 'Choose your chatbot language',
  },
  hi: {
    farewell: 'TerraGuard AI का उपयोग करने के लिए धन्यवाद। आपका दिन सुरक्षित रहे! 🌿',
    chooseLanguage: 'अपनी चैटबॉट भाषा चुनें',
  },
  as: {
    farewell: 'TerraGuard AI ব্যৱহাৰ কৰাৰ বাবে ধন্যবাদ। আপোনাৰ দিনটো নিৰাপদ হওক! 🌿',
    chooseLanguage: 'আপোনাৰ চেটবট ভাষা বাছনি কৰক',
  },
  bn: {
    farewell: 'TerraGuard AI ব্যবহার করার জন্য ধন্যবাদ। আপনার দিনটি নিরাপদ হোক! 🌿',
    chooseLanguage: 'আপনার চ্যাটবট ভাষা বেছে নিন',
  },
  brx: {
    farewell: 'TerraGuard AI बाहायनो थांनायनि थाखाय साबायखर। नोंनि दिन रैखा जाथोन! 🌿',
    chooseLanguage: 'नोंनि चेटबट राव बासिख',
  },
  ks: {
    farewell: 'TerraGuard AI pyoh karith thaviv. Tohinuk din mehfooz aas! 🌿',
    chooseLanguage: 'Apnas chatbot zabaan intikhaab kariv',
  },
  mni: {
    farewell: 'TerraGuard AI shijinnabagi thagatchari. Nanggi numit yaiphaba oiganu! 🌿',
    chooseLanguage: 'Nanggi chatbot lonta khan-u',
  },
  lus: {
    farewell: 'TerraGuard AI i hmang avangin kan lawm e. Ni him tak nei rawh! 🌿',
    chooseLanguage: 'I chatbot tawng thlang rawh',
  },
  ne: {
    farewell: 'TerraGuard AI प्रयोग गर्नुभएकोमा धन्यवाद। तपाईंको दिन सुरक्षित रहोस्! 🌿',
    chooseLanguage: 'आफ्नो च्याटबोट भाषा छान्नुहोस्',
  },
};

export const ChatWidget: React.FC<ChatWidgetProps> = ({
  theme = 'dark',
  onNavigate,
  onSelectZone,
  onSelectRegion,
  applicationState,
  applicationRegion,
  applicationZone,
  onRequestStateChange,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const { language, t } = useI18n();
  const { language: chatbotLanguage, setLanguage: setChatbotLanguage } = useChatbotLanguage(language);
  const chatbotCopy = CHATBOT_COPY[chatbotLanguage];
  const chatbotExitCopy = CHATBOT_EXIT_COPY[chatbotLanguage];

  const initialWelcomeMessage: ChatMessage = {
    id: 'welcome-msg',
    role: 'assistant',
    content: chatbotCopy.welcome,
    source: 'terraguard-engine',
    timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
  };

  const [messages, setMessages] = useState<ChatMessage[]>([initialWelcomeMessage]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [chatbotSession, setChatbotSession] = useState<{
    flow: ChatbotFlow;
    exploration: 'HILLS' | 'REGIONS' | null;
    selectedState: string | null;
    selectedHill: HillsRegion | null;
    selectedRegion: HazardZone | null;
    pendingState: string | null;
    pendingHill: HillsRegion | null;
    pendingRegion: HazardZone | null;
    pendingFromVoice: boolean;
    awaitingAcknowledgement: boolean;
    status: ChatbotStatus;
  }>({
    flow: 'LANGUAGE_SELECTION',
    exploration: null,
    selectedState: null,
    selectedHill: null,
    selectedRegion: null,
    pendingState: null,
    pendingHill: null,
    pendingRegion: null,
    pendingFromVoice: false,
    awaitingAcknowledgement: false,
    status: 'IDLE',
  });

  const [regionZones, setRegionZones] = useState<HazardZone[]>(HAZARD_ZONES);
  const [regionZonesLoaded, setRegionZonesLoaded] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [voiceMode, setVoiceMode] = useState(() => {
    try {
      return localStorage.getItem('terraguard_voice_mode') === 'true';
    } catch {
      return false;
    }
  });
  const [isVoiceProcessing, setIsVoiceProcessing] = useState(false);
  const [speakingMessageId, setSpeakingMessageId] = useState<string | null>(null);
  const [voiceStatus, setVoiceStatus] = useState<string | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const lastGuidedTransitionRef = useRef<string | null>(null);
  const chatRequestControllerRef = useRef<AbortController | null>(null);
  const locationRiskControllerRef = useRef<AbortController | null>(null);
  const chatRequestIdRef = useRef(0);
  const guidedMessageSequenceRef = useRef(0);
  const lastVoiceTranscriptRef = useRef<string | null>(null);
  const pendingLanguageSpeechRef = useRef<{ id: string; content: string } | null>(null);
  const micStartAuthorizedRef = useRef(false);
  const recognitionRef = useRef<SpeechRecognitionLike | null>(null);
  const isListeningRef = useRef(false);

  const isDark = theme === 'dark';

  const stopListening = () => {
    micStartAuthorizedRef.current = false;
    recognitionRef.current?.abort();
    recognitionRef.current = null;
    isListeningRef.current = false;
    setIsListening(false);
  };

  const stopSpeaking = () => {
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }
    setSpeakingMessageId(null);
  };

  const cancelChatRequest = () => {
    chatRequestControllerRef.current?.abort();
    chatRequestControllerRef.current = null;
    chatRequestIdRef.current += 1;
    setIsLoading(false);
  };

  const cancelLocationRiskRequest = () => {
    locationRiskControllerRef.current?.abort();
    locationRiskControllerRef.current = null;
  };

  const startListening = () => {
    if (!micStartAuthorizedRef.current) return;
    micStartAuthorizedRef.current = false;
    stopSpeaking();
    const speechWindow = window as SpeechWindow;
    const Recognition = speechWindow.SpeechRecognition || speechWindow.webkitSpeechRecognition;
    if (!Recognition) {
      setVoiceStatus('Speech input is not supported in this browser.');
      return;
    }

    setVoiceMode(true);
    try {
      localStorage.setItem('terraguard_voice_mode', 'true');
    } catch {
      // ignore
    }

    stopListening();
    lastVoiceTranscriptRef.current = null;
    const recognition = new Recognition();
    recognition.lang = VOICE_LANGUAGE_TAGS[chatbotLanguage];
    recognition.continuous = false;
    recognition.interimResults = false;

    recognition.onresult = (event) => {
      if (event.isFinal === false || isVoiceProcessing) return;
      const result = event.results[event.resultIndex ?? 0];
      const transcript = result?.[0]?.transcript?.trim();
      if (transcript && transcript !== lastVoiceTranscriptRef.current) {
        lastVoiceTranscriptRef.current = transcript;
        stopListening();
        setInput(transcript);
        setVoiceStatus('Processing...');
        setIsVoiceProcessing(true);
        void handleSend(transcript, true);
      } else {
        setVoiceStatus(null);
      }
    };

    recognition.onerror = (event) => {
      setVoiceStatus(
        event.error === 'not-allowed'
          ? 'Microphone permission was denied.'
          : `Voice input error: ${event.error}.`
      );
      isListeningRef.current = false;
      setIsListening(false);
    };

    recognition.onend = () => {
      isListeningRef.current = false;
      setIsListening(false);
    };

    recognitionRef.current = recognition;
    isListeningRef.current = true;
    setIsListening(true);
    setVoiceStatus(null);

    try {
      recognition.start();
    } catch {
      isListeningRef.current = false;
      setIsListening(false);
      setVoiceStatus('Voice input could not start.');
    }
  };

  const speakMessage = (
    messageId: string,
    content: string,
    languageOverride: ChatbotLanguage = chatbotLanguage,
    onEnd?: () => void
  ) => {
    if (!('speechSynthesis' in window)) {
      setVoiceStatus('Text-to-speech is not supported in this browser.');
      onEnd?.();
      return;
    }
    if (speakingMessageId === messageId) {
      stopSpeaking();
      onEnd?.();
      return;
    }
    stopListening();
    const utterance = new SpeechSynthesisUtterance(content.replace(/[*#•]/g, ''));
    const requestedTag = VOICE_LANGUAGE_TAGS[languageOverride].toLowerCase();
    const voices = window.speechSynthesis.getVoices();
    const voice =
      voices.find((candidate) => candidate.lang.toLowerCase() === requestedTag) ||
      voices.find((candidate) => candidate.lang.toLowerCase().startsWith(requestedTag.slice(0, 2)));

    if (!voice) {
      setVoiceStatus(
        `No ${chatbotLanguageOptions.find((option) => option.id === languageOverride)?.label} speech voice is available on this device.`
      );
      onEnd?.();
      return;
    }

    utterance.voice = voice;
    utterance.lang = voice.lang;

    utterance.onstart = () => {
      setVoiceStatus('TerraBot speaking...');
      setSpeakingMessageId(messageId);
    };
    utterance.onend = () => {
      setSpeakingMessageId(null);
      setVoiceStatus(null);
      onEnd?.();
    };
    utterance.onerror = () => {
      setSpeakingMessageId(null);
      setVoiceStatus('Text-to-speech could not play.');
      onEnd?.();
    };

    window.speechSynthesis.cancel();
    window.speechSynthesis.speak(utterance);
  };

  useEffect(
    () => () => {
      cancelChatRequest();
      cancelLocationRiskRequest();
      stopListening();
      stopSpeaking();
    },
    []
  );

  const createFreshWelcomeMessage = (nextLanguage: ChatbotLanguage = chatbotLanguage): ChatMessage => ({
    id: `welcome-${Date.now()}`,
    role: 'assistant',
    content: CHATBOT_COPY[nextLanguage].welcome,
    source: 'terraguard-engine',
    timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
  });

  const resetFreshChatSession = (nextLanguage: ChatbotLanguage = chatbotLanguage) => {
    cancelChatRequest();
    cancelLocationRiskRequest();
    stopListening();
    stopSpeaking();
    setIsVoiceProcessing(false);
    setMessages([createFreshWelcomeMessage(nextLanguage)]);
    setInput('');
    setIsLoading(false);
    setChatbotSession({
      flow: 'LANGUAGE_SELECTION',
      exploration: null,
      selectedState: null,
      selectedHill: null,
      selectedRegion: null,
      pendingState: null,
      pendingHill: null,
      pendingRegion: null,
      pendingFromVoice: false,
      awaitingAcknowledgement: false,
      status: 'IDLE',
    });
  };

  const handleMinimize = () => {
    cancelChatRequest();
    stopListening();
    stopSpeaking();
    setIsOpen(false);
  };

  const handleExit = () => {
    cancelChatRequest();
    cancelLocationRiskRequest();
    stopListening();
    stopSpeaking();
    setIsVoiceProcessing(false);
    setIsOpen(false);
    resetFreshChatSession();
  };

  const handleVoiceModeChange = () => {
    const nextVoiceMode = !voiceMode;
    setVoiceMode(nextVoiceMode);
    try {
      localStorage.setItem('terraguard_voice_mode', String(nextVoiceMode));
    } catch {
      // ignore
    }
    if (!nextVoiceMode) {
      stopListening();
      stopSpeaking();
      setIsVoiceProcessing(false);
      setVoiceStatus(null);
    }
  };

  const handleMicButtonClick = () => {
    if (isListening) {
      stopListening();
      return;
    }
    micStartAuthorizedRef.current = true;
    startListening();
  };

  useEffect(() => {
    cancelChatRequest();
    cancelLocationRiskRequest();
    stopListening();
    stopSpeaking();
    setIsVoiceProcessing(false);
    setMessages((previous) => {
      if (previous.length === 0) return [createFreshWelcomeMessage(chatbotLanguage)];
      if (previous.length === 1 && previous[0].id === 'welcome-msg') {
        return [{ ...previous[0], content: chatbotCopy.welcome }];
      }
      return previous;
    });
    const pendingLanguageSpeech = pendingLanguageSpeechRef.current;
    if (pendingLanguageSpeech && voiceMode) {
      pendingLanguageSpeechRef.current = null;
      speakMessage(pendingLanguageSpeech.id, pendingLanguageSpeech.content, chatbotLanguage);
    }
  }, [chatbotLanguage, voiceMode]);

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
      setRegionZonesLoaded(false);
      LandslideApi.getHazardZones().then((zones) => {
        setRegionZones(zones);
        setRegionZonesLoaded(true);
      });
    }
  }, [isOpen]);

  const handleSend = async (textToSend?: string, fromVoice = false) => {
    const messageText = textToSend || input;
    if (!messageText.trim() || isLoading) return;

    const requestLanguage = chatbotLanguage;
    const requestId = chatRequestIdRef.current + 1;
    chatRequestIdRef.current = requestId;
    chatRequestControllerRef.current?.abort();
    const requestController = new AbortController();
    chatRequestControllerRef.current = requestController;

    const userMsg: ChatMessage = {
      id: `user-${Date.now()}`,
      role: 'user',
      content: messageText,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    setMessages((prev) => [...prev, userMsg]);
    if (!textToSend) setInput('');
    setIsLoading(true);

    if (handleLocalConversationCommand(messageText, fromVoice)) {
      requestController.abort();
      chatRequestControllerRef.current = null;
      setIsLoading(false);
      if (fromVoice) setIsVoiceProcessing(false);
      return;
    }

    if (fromVoice && chatbotSession.flow !== 'LANGUAGE_SELECTION' && chatbotSession.flow !== 'MAIN_MENU') {
      const guidedPrompt =
        chatbotSession.flow === 'HILLS_STATE_SELECTION' || chatbotSession.flow === 'REGIONS_STATE_SELECTION'
          ? 'Please choose one of the available states.'
          : chatbotSession.flow === 'HILLS_LOCATION_SELECTION'
          ? 'Please choose one of the available hills or mountain regions.'
          : chatbotSession.flow === 'REGIONS_LOCATION_SELECTION'
          ? 'Please choose one of the available regions or places.'
          : chatbotSession.flow === 'WAITING_FOR_ACKNOWLEDGEMENT'
          ? 'Please say OK or Continue when you are ready for the next options.'
          : chatbotSession.flow === 'HILL_ACTIONS'
          ? 'Please choose Risk Map, Risk Details, another hill, or Exit.'
          : chatbotSession.flow === 'REGION_ACTIONS'
          ? 'Please choose Risk Map, Risk Details, another place, or Exit.'
          : null;

      if (guidedPrompt) {
        requestController.abort();
        chatRequestControllerRef.current = null;
        setIsLoading(false);
        setIsVoiceProcessing(false);
        addGuidedAssistantMessage(guidedPrompt, true);
        return;
      }
    }

    try {
      const historyPayload = messages
        .filter((m) => m.id !== 'welcome-msg')
        .map((m) => ({ role: m.role, content: m.content }))
        .slice(-20);

      const response = await LandslideApi.sendChatMessage(
        messageText,
        historyPayload,
        requestLanguage,
        requestController.signal
      );

      if (
        requestController.signal.aborted ||
        requestId !== chatRequestIdRef.current ||
        requestLanguage !== chatbotLanguage
      ) {
        return;
      }

      const botMsg: ChatMessage = {
        id: `bot-${Date.now()}`,
        role: 'assistant',
        content: response.reply,
        source: response.source,
        action: response.action,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };

      setMessages((prev) => [...prev, botMsg]);
      if (response.action) {
        handleActionClick(response.action);
      }
      if ((fromVoice || voiceMode) && requestLanguage === chatbotLanguage) {
        speakMessage(botMsg.id, response.reply);
      }
    } catch (err) {
      if (requestController.signal.aborted || requestId !== chatRequestIdRef.current) return;
      setMessages((prev) => [
        ...prev,
        {
          id: `err-${Date.now()}`,
          role: 'assistant',
          content: chatbotCopy.error,
          source: 'error',
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        },
      ]);
    } finally {
      if (requestId === chatRequestIdRef.current) {
        chatRequestControllerRef.current = null;
        setIsLoading(false);
        if (fromVoice) setIsVoiceProcessing(false);
      }
    }
  };

  const resetConversation = () => {
    lastGuidedTransitionRef.current = null;
    setMessages([
      {
        ...initialWelcomeMessage,
        id: `welcome-${Date.now()}`,
        content: chatbotCopy.returningWelcome,
      },
    ]);
    setIsLoading(false);
    setChatbotSession((previous) => ({
      ...previous,
      flow: 'MAIN_MENU',
      exploration: null,
      selectedState: null,
      selectedHill: null,
      selectedRegion: null,
      pendingState: null,
      pendingHill: null,
      pendingRegion: null,
      pendingFromVoice: false,
      awaitingAcknowledgement: false,
      status: 'IDLE',
    }));
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

  const handleChooseAnother = () => {
    const isRegions = chatbotSession.exploration === 'REGIONS';
    setChatbotSession((previous) => ({
      ...previous,
      flow: isRegions ? 'REGIONS_STATE_SELECTION' : 'HILLS_STATE_SELECTION',
      exploration: isRegions ? 'REGIONS' : 'HILLS',
      selectedState: null,
      selectedHill: null,
      selectedRegion: null,
      pendingState: null,
      pendingHill: null,
      pendingRegion: null,
      pendingFromVoice: false,
      awaitingAcknowledgement: false,
      status: 'IDLE',
    }));
  };

  const handleDomainSelection = (domain: 'hills' | 'regions') => {
    const transitionKey = `domain:${domain}`;
    if (lastGuidedTransitionRef.current === transitionKey) return;
    lastGuidedTransitionRef.current = transitionKey;

    setMessages((previous) => [
      ...previous,
      {
        id: `domain-${Date.now()}`,
        role: 'user',
        content: domain === 'hills' ? 'Hills & Mountains' : 'Regions / Places',
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      },
    ]);

    setChatbotSession((previous) => ({
      ...previous,
      flow: domain === 'hills' ? 'HILLS_STATE_SELECTION' : 'REGIONS_STATE_SELECTION',
      exploration: domain === 'hills' ? 'HILLS' : 'REGIONS',
      selectedState: null,
      selectedHill: null,
      selectedRegion: null,
      pendingState: null,
      pendingHill: null,
      pendingRegion: null,
      pendingFromVoice: false,
      awaitingAcknowledgement: false,
      status: 'IDLE',
    }));

    setMessages((previous) => [
      ...previous,
      {
        id: `domain-followup-${Date.now()}`,
        role: 'assistant',
        content: domain === 'hills' ? chatbotCopy.hillsPrompt : chatbotCopy.regionsPrompt,
        source: 'terraguard-engine',
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      },
    ]);
  };

  const handleStateSelection = (state: string, addUserMessage = true, fromVoice = false) => {
    stopListening();
    const domain = chatbotSession.exploration === 'REGIONS' ? 'regions' : 'hills';
    const transitionKey = `${domain}:state:${normalizeState(state)}`;
    if (lastGuidedTransitionRef.current === transitionKey) return;
    lastGuidedTransitionRef.current = transitionKey;

    if (addUserMessage) {
      setMessages((previous) => [
        ...previous,
        {
          id: `state-${Date.now()}`,
          role: 'user',
          content: state,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        },
      ]);
    }

    onRequestStateChange?.(state);

    setChatbotSession((previous) => ({
      ...previous,
      flow: 'APPLICATION_SELECTION_PENDING',
      pendingState: state,
      selectedState: null,
      pendingHill: null,
      pendingRegion: null,
      pendingFromVoice: fromVoice,
      awaitingAcknowledgement: false,
      status: 'SELECTION_LOADING',
    }));

    setMessages((previous) => [
      ...previous,
      {
        id: `state-followup-${Date.now()}`,
        role: 'assistant',
        content: `${state} selected. I’m loading the available ${
          domain === 'regions' ? 'regions and places' : 'hills and mountain regions'
        } for this state.`,
        source: 'terraguard-engine',
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      },
    ]);
  };

  const startZoneAnalysis = (zone: HazardZone, fromVoice: boolean) => {
    const parsedCoords = (() => {
      const values = zone.coords?.match(/-?\d+(?:\.\d+)?/g);
      if (!values || values.length < 2) return null;
      const lat = Number.parseFloat(values[0]);
      const lon = Number.parseFloat(values[1]);
      return Number.isFinite(lat) && Number.isFinite(lon) ? { lat, lon } : null;
    })();

    setChatbotSession((previous) => ({
      ...previous,
      flow: 'DATA_LOADING',
      exploration: 'REGIONS',
      selectedState: zone.state,
      selectedRegion: zone,
      selectedHill: null,
      pendingRegion: null,
      awaitingAcknowledgement: false,
      status: 'DATA_LOADING',
    }));

    addGuidedAssistantMessage(
      `${zone.name} is now selected. I’m retrieving the available environmental and risk information.`,
      fromVoice
    );

    if (!parsedCoords) {
      setMessages((previous) => [
        ...previous,
        {
          id: `zone-error-${Date.now()}`,
          role: 'assistant',
          source: 'terraguard-data',
          content: chatbotCopy.unavailable(zone.name),
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        },
      ]);
      setChatbotSession((previous) => ({
        ...previous,
        flow: 'REGIONS_LOCATION_SELECTION',
        status: 'COMPLETE',
        awaitingAcknowledgement: false,
      }));
      return;
    }

    setIsLoading(true);
    setChatbotSession((previous) => ({ ...previous, flow: 'ANALYSIS', status: 'ANALYZING' }));
    addGuidedAssistantMessage(
      `Analyzing the available terrain, rainfall, soil, seismic and landslide-risk information for ${zone.name}...`,
      fromVoice
    );

    const locationController = new AbortController();
    locationRiskControllerRef.current = locationController;

    fetchLocationRisk(
      {
        name: zone.name,
        locationType: 'region',
        latitude: parsedCoords.lat,
        longitude: parsedCoords.lon,
        state: zone.state,
      },
      locationController.signal
    )
      .then((evaluation) => {
        const content = formatLocationRisk(zone.name, evaluation);
        const messageId = `zone-risk-${Date.now()}`;
        setMessages((previous) => [
          ...previous,
          {
            id: messageId,
            role: 'assistant',
            source: 'terraguard-location-risk',
            content,
            riskEvaluation: evaluation,
            locationName: zone.name,
            resultType: 'region',
            timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          },
        ]);
        setChatbotSession((previous) => ({
          ...previous,
          flow: 'WAITING_FOR_ACKNOWLEDGEMENT',
          exploration: 'REGIONS',
          selectedState: zone.state,
          selectedRegion: zone,
          awaitingAcknowledgement: true,
          status: 'COMPLETE',
        }));
        const ackMessage = `${zone.name} analysis is complete. I’ve prepared the available results below.\n\nThe analysis is complete. Say “OK” or “Continue” when you’re ready for the next options.`;
        guidedMessageSequenceRef.current += 1;
        const ackId = `guide-${Date.now()}-${guidedMessageSequenceRef.current}`;
        setMessages((previous) => [
          ...previous,
          {
            id: ackId,
            role: 'assistant',
            content: ackMessage,
            source: 'terraguard-guide',
            timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          },
        ]);
        if (fromVoice || voiceMode) {
          speakMessage(messageId, content, chatbotLanguage, () => {
            speakMessage(ackId, ackMessage);
          });
        }
      })
      .catch((error) => {
        if (error instanceof DOMException && error.name === 'AbortError') return;
        setMessages((previous) => [
          ...previous,
          {
            id: `zone-error-${Date.now()}`,
            role: 'assistant',
            source: 'error',
            content: chatbotCopy.evaluationError,
            timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          },
        ]);
      })
      .finally(() => {
        if (locationRiskControllerRef.current === locationController) {
          locationRiskControllerRef.current = null;
          setIsLoading(false);
        }
      });
  };

  const startHillAnalysis = (hill: HillsRegion, fromVoice: boolean) => {
    setChatbotSession((previous) => ({
      ...previous,
      flow: 'DATA_LOADING',
      exploration: 'HILLS',
      selectedState: hill.state,
      selectedHill: hill,
      selectedRegion: null,
      pendingHill: null,
      awaitingAcknowledgement: false,
      status: 'DATA_LOADING',
    }));

    addGuidedAssistantMessage(
      `${hill.name} is now selected. I’m retrieving the available environmental and risk information.`,
      fromVoice
    );

    setIsLoading(true);
    setChatbotSession((previous) => ({ ...previous, flow: 'ANALYSIS', status: 'ANALYZING' }));
    addGuidedAssistantMessage(
      `Analyzing the available terrain, rainfall, soil, seismic and landslide-risk information for ${hill.name}...`,
      fromVoice
    );

    const locationController = new AbortController();
    locationRiskControllerRef.current = locationController;

    fetchLocationRisk(
      {
        name: hill.name,
        locationType: 'hill',
        latitude: hill.latitude!,
        longitude: hill.longitude!,
        state: hill.state,
      },
      locationController.signal
    )
      .then((evaluation) => {
        const content = formatLocationRisk(hill.name, evaluation);
        const messageId = `hill-risk-${Date.now()}`;
        setMessages((previous) => [
          ...previous,
          {
            id: messageId,
            role: 'assistant',
            source: 'terraguard-location-risk',
            content,
            riskEvaluation: evaluation,
            locationName: hill.name,
            resultType: 'hill',
            timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          },
        ]);
        setChatbotSession((previous) => ({
          ...previous,
          flow: 'WAITING_FOR_ACKNOWLEDGEMENT',
          status: 'COMPLETE',
          exploration: 'HILLS',
          selectedState: hill.state,
          selectedHill: hill,
          awaitingAcknowledgement: true,
        }));
        const ackMessage = `${hill.name} analysis is complete. I’ve prepared the available results below.\n\nThe analysis is complete. Say “OK” or “Continue” when you’re ready for the next options.`;
        guidedMessageSequenceRef.current += 1;
        const ackId = `guide-${Date.now()}-${guidedMessageSequenceRef.current}`;
        setMessages((previous) => [
          ...previous,
          {
            id: ackId,
            role: 'assistant',
            content: ackMessage,
            source: 'terraguard-guide',
            timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          },
        ]);
        if (fromVoice || voiceMode) {
          speakMessage(messageId, content, chatbotLanguage, () => {
            speakMessage(ackId, ackMessage);
          });
        }
      })
      .catch((error) => {
        if (error instanceof DOMException && error.name === 'AbortError') return;
        addGuidedAssistantMessage(chatbotCopy.evaluationError, fromVoice);
      })
      .finally(() => {
        if (locationRiskControllerRef.current === locationController) {
          locationRiskControllerRef.current = null;
          setIsLoading(false);
        }
      });
  };

  const selectZone = (zone: HazardZone, addUserMessage = true, fromVoice = false) => {
    cancelLocationRiskRequest();
    lastGuidedTransitionRef.current = null;

    if (addUserMessage) {
      setMessages((previous) => [
        ...previous,
        {
          id: `zone-user-${Date.now()}`,
          role: 'user',
          content: `Show me ${zone.name}.`,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        },
      ]);
    }

    setChatbotSession((previous) => ({
      ...previous,
      flow: 'APPLICATION_SELECTION_PENDING',
      exploration: 'REGIONS',
      pendingRegion: zone,
      selectedRegion: null,
      pendingHill: null,
      pendingFromVoice: fromVoice,
      selectedState: zone.state,
      status: 'SELECTION_LOADING',
      awaitingAcknowledgement: false,
    }));

    addGuidedAssistantMessage(`I’m opening ${zone.name} in TerraGuard.`, fromVoice);
    onSelectZone?.(zone);
  };

  const selectHill = (hill: HillsRegion, addUserMessage = true, fromVoice = false) => {
    cancelLocationRiskRequest();
    lastGuidedTransitionRef.current = null;

    if (!hill.coordinatesVerified || hill.latitude === undefined || hill.longitude === undefined) {
      setMessages((previous) => [
        ...previous,
        {
          id: `hill-${Date.now()}`,
          role: 'assistant',
          source: 'terraguard-data',
          content: chatbotCopy.unavailable(hill.name),
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        },
      ]);
      return;
    }

    if (addUserMessage) {
      setMessages((previous) => [
        ...previous,
        {
          id: `hill-user-${Date.now()}`,
          role: 'user',
          content: `Show me ${hill.name}.`,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        },
      ]);
    }

    setChatbotSession((previous) => ({
      ...previous,
      flow: 'APPLICATION_SELECTION_PENDING',
      exploration: 'HILLS',
      selectedState: hill.state,
      selectedHill: null,
      selectedRegion: null,
      pendingHill: hill,
      pendingRegion: null,
      pendingFromVoice: fromVoice,
      awaitingAcknowledgement: false,
      status: 'SELECTION_LOADING',
    }));

    addGuidedAssistantMessage(`I’m opening ${hill.name} in TerraGuard.`, fromVoice);
    onSelectRegion?.(hill);
  };

  const addGuidedAssistantMessage = (content: string, fromVoice: boolean) => {
    guidedMessageSequenceRef.current += 1;
    const id = `guide-${Date.now()}-${guidedMessageSequenceRef.current}`;
    setMessages((previous) => [
      ...previous,
      {
        id,
        role: 'assistant',
        content,
        source: 'terraguard-guide',
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      },
    ]);
    if (fromVoice || voiceMode) speakMessage(id, content);
  };

  const handleChatbotLanguageSelection = (
    nextLanguage: ChatbotLanguage,
    addUserMessage = true,
    fromVoice = false
  ) => {
    setChatbotLanguage(nextLanguage);
    setChatbotSession((previous) => ({
      ...previous,
      flow: 'MAIN_MENU',
      exploration: null,
      selectedState: null,
      selectedHill: null,
      selectedRegion: null,
      pendingState: null,
      pendingHill: null,
      pendingRegion: null,
      pendingFromVoice: false,
      awaitingAcknowledgement: false,
      status: 'IDLE',
    }));

    const responseId = `language-followup-${Date.now()}-${guidedMessageSequenceRef.current + 1}`;
    setMessages((previous) => [
      ...previous,
      ...(addUserMessage
        ? [
            {
              id: `language-${Date.now()}`,
              role: 'user' as const,
              content: chatbotLanguageOptions.find((option) => option.id === nextLanguage)?.label || nextLanguage,
              timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            },
          ]
        : []),
      {
        id: responseId,
        role: 'assistant' as const,
        content: CHATBOT_COPY[nextLanguage].returningWelcome,
        source: 'terraguard-engine',
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      },
    ]);

    if (fromVoice) {
      pendingLanguageSpeechRef.current = {
        id: responseId,
        content: CHATBOT_COPY[nextLanguage].returningWelcome,
      };
    }
  };

  useEffect(() => {
    const pendingState = chatbotSession.pendingState;
    const stateConfirmed =
      pendingState &&
      applicationState &&
      normalizeState(applicationState) === normalizeState(pendingState);
    const dataReady = chatbotSession.exploration === 'HILLS' || regionZonesLoaded;

    if (!stateConfirmed || !dataReady || chatbotSession.flow !== 'APPLICATION_SELECTION_PENDING') return;

    const isRegions = chatbotSession.exploration === 'REGIONS';
    setChatbotSession((previous) => ({
      ...previous,
      flow: isRegions ? 'REGIONS_LOCATION_SELECTION' : 'HILLS_LOCATION_SELECTION',
      selectedState: pendingState,
      pendingState: null,
      pendingFromVoice: false,
      status: 'COMPLETE',
    }));

    addGuidedAssistantMessage(
      `Here are the available ${
        isRegions ? 'regions and places' : 'hills and mountain regions'
      } in ${pendingState}. Which one would you like to explore?`,
      chatbotSession.pendingFromVoice
    );
  }, [
    applicationState,
    chatbotSession.exploration,
    chatbotSession.flow,
    chatbotSession.pendingState,
    chatbotSession.pendingFromVoice,
    regionZonesLoaded,
  ]);

  useEffect(() => {
    const pendingHill = chatbotSession.pendingHill;
    if (
      pendingHill &&
      applicationRegion?.id === pendingHill.id &&
      chatbotSession.flow === 'APPLICATION_SELECTION_PENDING'
    ) {
      setChatbotSession((previous) => ({
        ...previous,
        flow: 'APPLICATION_SELECTION_CONFIRMED',
        selectedHill: pendingHill,
        pendingHill: null,
        status: 'COMPLETE',
      }));
      startHillAnalysis(pendingHill, chatbotSession.pendingFromVoice);
      return;
    }

    const pendingRegion = chatbotSession.pendingRegion;
    if (
      pendingRegion &&
      applicationZone?.id === pendingRegion.id &&
      chatbotSession.flow === 'APPLICATION_SELECTION_PENDING'
    ) {
      setChatbotSession((previous) => ({
        ...previous,
        flow: 'APPLICATION_SELECTION_CONFIRMED',
        selectedRegion: pendingRegion,
        pendingRegion: null,
        status: 'COMPLETE',
      }));
      startZoneAnalysis(pendingRegion, chatbotSession.pendingFromVoice);
    }
  }, [
    applicationRegion?.id,
    applicationZone?.id,
    chatbotSession.pendingHill?.id,
    chatbotSession.pendingRegion?.id,
    chatbotSession.flow,
  ]);

  const handleLocalConversationCommand = (messageText: string, fromVoice: boolean) => {
    const normalized = messageText.trim().toLowerCase();
    if (!normalized) return false;

    if (chatbotSession.flow === 'LANGUAGE_SELECTION') {
      const languageOption = chatbotLanguageOptions.find(
        (option) =>
          normalized === option.label.toLowerCase() || normalized.includes(option.label.toLowerCase())
      );
      if (languageOption) {
        handleChatbotLanguageSelection(languageOption.id, false, fromVoice);
        return true;
      }
      // Greetings before language selection → normal welcome, never inherit app location
      if (/\b(hello|hi|hey|नमस्ते|নমস্কাৰ|নমস্কার)\b/i.test(normalized)) {
        setChatbotSession((previous) => ({
          ...previous,
          flow: 'MAIN_MENU',
          exploration: null,
          selectedState: null,
          selectedHill: null,
          selectedRegion: null,
          pendingState: null,
          pendingHill: null,
          pendingRegion: null,
          pendingFromVoice: false,
          awaitingAcknowledgement: false,
          status: 'IDLE',
        }));
        addGuidedAssistantMessage(chatbotCopy.returningWelcome, fromVoice);
        return true;
      }
    }

    if (chatbotSession.flow === 'MAIN_MENU') {
      if (/\b(hello|hi|hey|नमस्ते|নমস্কাৰ|নমস্কার)\b/i.test(normalized)) {
        addGuidedAssistantMessage(chatbotCopy.returningWelcome, fromVoice);
        return true;
      }
    }

    if (
      chatbotSession.flow === 'WAITING_FOR_ACKNOWLEDGEMENT' &&
      /^(ok|okay|continue|next|what next|yes[, ]+continue|हाँ|हां|ठीक|जारी रखें|ঠিক আছে)$/i.test(normalized)
    ) {
      setChatbotSession((previous) => ({
        ...previous,
        flow: previous.exploration === 'REGIONS' ? 'REGION_ACTIONS' : 'HILL_ACTIONS',
        awaitingAcknowledgement: false,
        status: 'COMPLETE',
      }));
      addGuidedAssistantMessage('What would you like to do next?', fromVoice);
      return true;
    }

    if (chatbotSession.flow === 'HILL_ACTIONS' || chatbotSession.flow === 'REGION_ACTIONS') {
      if (
        /^(?:(?:open|show|view)\s+)?(?:risk map|map)$/i.test(normalized) ||
        /(?:open|show|view).*(risk map|map)/i.test(normalized)
      ) {
        handleActionClick({ type: 'NAVIGATE', module: 'risk-map' });
        addGuidedAssistantMessage('Opening Risk Map.', fromVoice);
        return true;
      }
      if (/(risk details|details|analytics)/i.test(normalized)) {
        handleActionClick({ type: 'NAVIGATE', module: 'risk-details' });
        addGuidedAssistantMessage('Opening Risk Details.', fromVoice);
        return true;
      }
      if (
        /(another|choose another|check another|other hill|other place|other region)/i.test(normalized) ||
        (/(another|choose another|check another)/i.test(normalized) && /(hill|place|region)/i.test(normalized))
      ) {
        handleChooseAnother();
        return true;
      }
      if (/\b(exit|close|quit)\b/i.test(normalized)) {
        handleExit();
        return true;
      }
    }

    // Weather / seismic / general risk questions stay on the grounded backend path
    // (unless the chatbot already has a selected location and the user is asking about its risk)
    if (/(weather|rain|rainfall|earthquake|seismic|risk|जोखिम|मौसम|बारिश|भूकंप|বতৰ|ভূমিকম্প)/i.test(normalized)) {
      if (chatbotSession.selectedHill && /(risk|जोखिम)/i.test(normalized)) {
        selectHill(chatbotSession.selectedHill, false, fromVoice);
        return true;
      }
      if (chatbotSession.selectedRegion && /(risk|जोखिम)/i.test(normalized)) {
        selectZone(chatbotSession.selectedRegion, false, fromVoice);
        return true;
      }
      return false;
    }

    const state = NER_STATES.find((candidate) => normalized.includes(normalizeState(candidate)));
    const requestedHill = /(hill|hills|mountain|पहाड़|पहाड़|पहाड़ी|পাহাড়|डोंगर)/i.test(normalized);
    const requestedRegion =
      /(regional|place|places|क्षेत्र|जगह|অঞ্চল|স্থান)/i.test(normalized) ||
      (!requestedHill && /region|regions/i.test(normalized));

    if (chatbotSession.flow === 'HILLS_STATE_SELECTION' && state) {
      handleStateSelection(state, false, fromVoice);
      return true;
    }
    if (chatbotSession.flow === 'REGIONS_STATE_SELECTION' && state) {
      handleStateSelection(state, false, fromVoice);
      return true;
    }

    if (chatbotSession.exploration === 'HILLS' || requestedHill) {
      const hill = HILLS_AND_MOUNTAIN_REGIONS.find((item) => normalized.includes(item.name.toLowerCase()));
      if (hill) {
        selectHill(hill, false, fromVoice);
        return true;
      }
    }
    if (chatbotSession.exploration === 'REGIONS' || requestedRegion) {
      const zone = regionZones.find((item) => normalized.includes(item.name.toLowerCase()));
      if (zone) {
        selectZone(zone, false, fromVoice);
        return true;
      }
    }

    if (
      (chatbotSession.flow === 'MAIN_MENU' || chatbotSession.flow === 'HILLS_STATE_SELECTION') &&
      requestedHill &&
      !requestedRegion
    ) {
      const transitionKey = 'domain:hills';
      if (lastGuidedTransitionRef.current === transitionKey && chatbotSession.exploration === 'HILLS') return true;
      lastGuidedTransitionRef.current = transitionKey;
      handleActionClick({ type: 'NAVIGATE', module: 'hills-regions' });
      setChatbotSession((previous) => ({ ...previous, flow: 'HILLS_STATE_SELECTION', exploration: 'HILLS' }));
      addGuidedAssistantMessage(chatbotCopy.hillsPrompt, fromVoice);
      return true;
    }

    if (
      (chatbotSession.flow === 'MAIN_MENU' || chatbotSession.flow === 'REGIONS_STATE_SELECTION') &&
      requestedRegion
    ) {
      const transitionKey = 'domain:regions';
      if (lastGuidedTransitionRef.current === transitionKey && chatbotSession.exploration === 'REGIONS') return true;
      lastGuidedTransitionRef.current = transitionKey;
      setChatbotSession((previous) => ({ ...previous, flow: 'REGIONS_STATE_SELECTION', exploration: 'REGIONS' }));
      addGuidedAssistantMessage(chatbotCopy.regionsPrompt, fromVoice);
      return true;
    }

    return false;
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
              isDark ? 'bg-slate-800/90 border-slate-700/80' : 'bg-emerald-700 text-white border-emerald-600'
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
                  {t('chatbot.title')}
                  <Sparkles className="w-3.5 h-3.5 text-amber-400 fill-amber-400" />
                </h3>
              </div>
            </div>
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={handleVoiceModeChange}
                aria-pressed={voiceMode}
                aria-label={voiceMode ? 'Turn voice mode off' : 'Turn voice mode on'}
                className={`rounded-lg border px-2 py-1 text-[10px] font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-emerald-500 ${
                  voiceMode
                    ? isDark
                      ? 'border-emerald-400 bg-emerald-500/20 text-emerald-200'
                      : 'border-emerald-500 bg-emerald-100 text-emerald-800'
                    : isDark
                    ? 'border-slate-600 bg-slate-800 text-slate-300 hover:border-emerald-500'
                    : 'border-slate-200 bg-white text-slate-700 hover:border-emerald-600'
                }`}
              >
                {voiceMode ? 'Voice Mode: ON' : 'Voice Mode: OFF'}
              </button>
              <button
                onClick={handleMinimize}
                aria-label={t('chatbot.minimize')}
                className={`rounded-lg p-1.5 transition-colors ${
                  isDark
                    ? 'text-slate-400 hover:bg-slate-700 hover:text-white'
                    : 'text-white/80 hover:bg-emerald-600 hover:text-white'
                }`}
              >
                <Minus className="h-4 w-4" />
              </button>
              <button
                onClick={handleExit}
                aria-label={t('chatbot.close')}
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

          {chatbotSession.flow === 'LANGUAGE_SELECTION' ? (
            <div
              className={`border-b p-3 text-center ${
                isDark ? 'bg-slate-950/60 border-slate-800' : 'bg-slate-50 border-slate-200'
              }`}
            >
              <div className="grid w-full grid-cols-2 gap-2 sm:grid-cols-3" role="group" aria-label={t('chatbot.selectLanguage')}>
                {chatbotLanguageOptions.map((option) => (
                  <button
                    key={option.id}
                    type="button"
                    onClick={() => handleChatbotLanguageSelection(option.id)}
                    aria-label={option.label}
                    className={`rounded-xl border px-3 py-2.5 text-xs font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-emerald-500 ${
                      option.id === chatbotLanguage
                        ? isDark
                          ? 'border-emerald-400 bg-emerald-500/20 text-emerald-200'
                          : 'border-emerald-500 bg-emerald-100 text-emerald-800'
                        : isDark
                        ? 'border-slate-700 bg-slate-900/70 text-slate-300 hover:border-emerald-500 hover:text-emerald-200'
                        : 'border-slate-200 bg-white text-slate-700 hover:border-emerald-500 hover:text-emerald-700'
                    }`}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
            </div>
          ) : chatbotSession.flow === 'MAIN_MENU' ? (
            <div
              className={`p-3 border-b text-xs ${
                isDark ? 'bg-slate-950/60 border-slate-800' : 'bg-slate-50 border-slate-200'
              }`}
            >
              <div
                className={`rounded-xl border p-3 ${
                  isDark ? 'border-emerald-500/20 bg-emerald-500/5' : 'border-emerald-200 bg-emerald-50/70'
                }`}
              >
                <div className={`text-sm font-semibold ${isDark ? 'text-slate-100' : 'text-slate-900'}`}>
                  {t('chatbot.welcomeIntro')}
                </div>
                <div className={`mt-1 text-[11px] leading-relaxed ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
                  {t('chatbot.welcomeDescription')}
                </div>
              </div>
              <div className="mt-3 grid grid-cols-2 gap-2">
                <button
                  onClick={() => handleDomainSelection('hills')}
                  className={`rounded-xl border px-3 py-3 text-left text-[12px] font-medium transition-colors hover:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500 ${
                    isDark
                      ? 'border-emerald-500/40 bg-emerald-500/5 text-emerald-300'
                      : 'border-emerald-300 bg-emerald-50 text-emerald-800'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <Mountain className="h-4 w-4" /> {t('chatbot.hillsButton')}
                  </div>
                </button>
                <button
                  onClick={() => handleDomainSelection('regions')}
                  className={`rounded-xl border px-3 py-3 text-left text-[12px] font-medium transition-colors hover:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500 ${
                    isDark
                      ? 'border-emerald-500/40 bg-emerald-500/5 text-emerald-300'
                      : 'border-emerald-300 bg-emerald-50 text-emerald-800'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <MapPin className="h-4 w-4" /> {t('chatbot.regionsButton')}
                  </div>
                </button>
              </div>
            </div>
          ) : (
            <div
              className={`flex items-center gap-1.5 px-3 py-2 border-b text-[11px] ${
                isDark ? 'bg-slate-950/60 border-slate-800' : 'bg-slate-50 border-slate-200'
              }`}
            >
              <button
                onClick={resetConversation}
                aria-label={t('chatbot.returnHome')}
                className="flex items-center gap-1 rounded-lg border border-slate-500/50 px-2 py-1 text-slate-400 transition-colors hover:border-emerald-500 hover:text-emerald-400 focus:outline-none focus:ring-2 focus:ring-emerald-500"
              >
                <Home className="h-3.5 w-3.5" /> {t('navigation.home')}
              </button>
              <span className="ml-1 font-semibold text-emerald-500/90">
                {chatbotSession.exploration === 'REGIONS' ? 'Regions & Places' : 'Hills & Mountains'}
              </span>
              {chatbotSession.selectedState && (
                <span className="ml-1 text-slate-400">• {chatbotSession.selectedState}</span>
              )}
            </div>
          )}

          {chatbotSession.flow !== 'LANGUAGE_SELECTION' &&
            chatbotSession.flow !== 'MAIN_MENU' &&
            (chatbotSession.flow === 'HILLS_STATE_SELECTION' ||
              chatbotSession.flow === 'REGIONS_STATE_SELECTION' ||
              chatbotSession.flow === 'HILLS_LOCATION_SELECTION' ||
              chatbotSession.flow === 'REGIONS_LOCATION_SELECTION') && (
              <div
                className={`px-3 py-2 border-b text-xs ${
                  isDark ? 'bg-slate-950/70 border-slate-800' : 'bg-slate-50 border-slate-200'
                }`}
              >
                {chatbotSession.flow === 'HILLS_STATE_SELECTION' ||
                chatbotSession.flow === 'REGIONS_STATE_SELECTION' ? (
                  <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                    {NER_STATES.map((state) => (
                      <button
                        key={state}
                        onClick={() => handleStateSelection(state)}
                        className={`rounded-xl border p-2.5 text-left text-[11px] font-medium transition-colors hover:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500 ${
                          isDark
                            ? 'border-slate-700 bg-slate-900/60 text-slate-300 hover:bg-emerald-950/40'
                            : 'border-slate-200 bg-white text-slate-700 hover:bg-emerald-50'
                        }`}
                      >
                        <span className="block text-[9px] uppercase tracking-wider text-emerald-500">
                          {t('chatbot.stateLabel')}
                        </span>
                        {state}
                      </button>
                    ))}
                  </div>
                ) : chatbotSession.exploration === 'REGIONS' ? (
                  <div className="grid max-h-32 grid-cols-1 gap-2 overflow-y-auto pr-1 sm:grid-cols-2">
                    {regionZones
                      .filter(
                        (zone) =>
                          normalizeState(zone.state) ===
                          normalizeState(chatbotSession.pendingState || chatbotSession.selectedState || '')
                      )
                      .map((zone) => (
                        <button
                          key={zone.id}
                          onClick={() => selectZone(zone)}
                          className={`rounded-xl border p-2.5 text-left transition-colors hover:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500 ${
                            isDark
                              ? 'border-slate-700 bg-slate-900/60 hover:bg-emerald-950/30'
                              : 'border-slate-200 bg-white hover:bg-emerald-50'
                          }`}
                        >
                          <span className="block text-[11px] font-semibold">{zone.name}</span>
                          <span className={`mt-1 block text-[9px] ${isDark ? 'text-slate-500' : 'text-slate-500'}`}>
                            {zone.riskStatus} · {zone.coords}
                          </span>
                        </button>
                      ))}
                  </div>
                ) : (
                  <div className="grid max-h-32 grid-cols-1 gap-2 overflow-y-auto pr-1 sm:grid-cols-2">
                    {HILLS_AND_MOUNTAIN_REGIONS.filter(
                      (hill) =>
                        normalizeState(hill.state) ===
                        normalizeState(chatbotSession.pendingState || chatbotSession.selectedState || '')
                    ).map((hill) => (
                      <button
                        key={hill.id}
                        onClick={() => selectHill(hill)}
                        className={`rounded-xl border p-2.5 text-left transition-colors hover:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500 ${
                          isDark
                            ? 'border-slate-700 bg-slate-900/60 hover:bg-emerald-950/30'
                            : 'border-slate-200 bg-white hover:bg-emerald-50'
                        }`}
                      >
                        <span className="block text-[11px] font-semibold">{hill.name}</span>
                        <span className={`mt-1 block text-[9px] ${isDark ? 'text-slate-500' : 'text-slate-500'}`}>
                          {hill.category} · {hill.coordinatesVerified ? 'Verified coordinates' : 'Coordinates unavailable'}
                        </span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}

          {/* Message History */}
          <div className="flex-1 p-4 overflow-y-auto space-y-3.5 text-xs leading-relaxed">
            {messages.map((msg) => (
              <div key={msg.id} className={`flex gap-2.5 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                {msg.role === 'assistant' && (
                  <div
                    className={`w-6 h-6 rounded-full flex items-center justify-center shrink-0 mt-0.5 ${
                      isDark
                        ? 'bg-emerald-900/60 text-emerald-400 border border-emerald-700/50'
                        : 'bg-emerald-100 text-emerald-700'
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

                    {msg.role === 'assistant' && msg.content && (
                      <button
                        type="button"
                        onClick={() => speakMessage(msg.id, msg.content)}
                        aria-label={speakingMessageId === msg.id ? 'Stop speaking' : 'Read assistant message aloud'}
                        className={`mt-2 inline-flex items-center gap-1 rounded-lg border px-2 py-1 text-[10px] transition-colors focus:outline-none focus:ring-2 focus:ring-emerald-500 ${
                          isDark
                            ? 'border-slate-600 text-slate-300 hover:border-emerald-500 hover:text-emerald-300'
                            : 'border-slate-300 text-slate-600 hover:border-emerald-600 hover:text-emerald-700'
                        }`}
                      >
                        {speakingMessageId === msg.id ? <VolumeX className="h-3 w-3" /> : <Volume2 className="h-3 w-3" />}
                        {speakingMessageId === msg.id ? 'Stop' : 'Listen'}
                      </button>
                    )}

                    {msg.source && msg.role === 'assistant' && (
                      <div className="mt-2 pt-1.5 border-t border-slate-700/40 flex items-center justify-between text-[10px] opacity-70">
                        <span>Source: {msg.source}</span>
                        <span>{msg.timestamp}</span>
                      </div>
                    )}
                  </div>

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

            {(chatbotSession.flow === 'HILL_ACTIONS' || chatbotSession.flow === 'REGION_ACTIONS') && (
              <div className="grid grid-cols-2 gap-2" aria-label="TerraBot actions">
                <button
                  onClick={() => onNavigate?.('risk-map')}
                  className={`rounded-xl border px-2.5 py-2 text-[10px] font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-emerald-500 ${
                    isDark
                      ? 'border-emerald-500/40 bg-emerald-500/5 text-emerald-300 hover:bg-emerald-500/10'
                      : 'border-emerald-300 bg-emerald-50 text-emerald-800 hover:bg-emerald-100'
                  }`}
                >
                  Open Risk Map
                </button>
                <button
                  onClick={() => onNavigate?.('risk-details')}
                  className={`rounded-xl border px-2.5 py-2 text-[10px] font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-emerald-500 ${
                    isDark
                      ? 'border-slate-700 bg-slate-800/80 text-slate-300 hover:border-slate-500'
                      : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-100'
                  }`}
                >
                  View Risk Details
                </button>
                <button
                  onClick={handleChooseAnother}
                  className={`rounded-xl border px-2.5 py-2 text-[10px] font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-emerald-500 ${
                    isDark
                      ? 'border-slate-700 bg-slate-800/80 text-slate-300 hover:border-slate-500'
                      : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-100'
                  }`}
                >
                  {chatbotSession.exploration === 'REGIONS' ? 'Check Another Place' : 'Check Another Hill'}
                </button>
                <button
                  onClick={handleExit}
                  className={`rounded-xl border px-2.5 py-2 text-[10px] font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-emerald-500 ${
                    isDark
                      ? 'border-red-500/40 bg-red-500/5 text-red-300 hover:bg-red-500/10'
                      : 'border-red-200 bg-red-50 text-red-700 hover:bg-red-100'
                  }`}
                >
                  Exit
                </button>
              </div>
            )}

            {isLoading && (
              <div className="flex gap-2.5 items-center text-slate-400 text-xs">
                <div className="w-6 h-6 rounded-full bg-emerald-900/60 text-emerald-400 flex items-center justify-center animate-pulse">
                  <Bot className="w-3.5 h-3.5" />
                </div>
                <div
                  className={`flex items-center gap-2 rounded-xl border px-3 py-2 ${
                    isDark ? 'border-slate-700 bg-slate-800/70 text-slate-400' : 'border-slate-200 bg-slate-50 text-slate-500'
                  }`}
                >
                  <span>
                    {chatbotSession.status === 'DATA_LOADING'
                      ? 'Retrieving available environmental and risk information'
                      : chatbotSession.status === 'ANALYZING'
                      ? 'Analyzing available risk information'
                      : 'TerraBot is processing your request'}
                  </span>
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
            <button
              type="button"
              onClick={handleMicButtonClick}
              disabled={isVoiceProcessing}
              aria-label={
                isListening
                  ? 'Stop listening'
                  : isVoiceProcessing
                  ? 'Processing voice command'
                  : 'Start voice input'
              }
              className={`shrink-0 rounded-xl border p-2.5 transition-all focus:outline-none focus:ring-2 focus:ring-emerald-500 ${
                isListening
                  ? 'border-red-500 bg-red-500/15 text-red-500 animate-pulse'
                  : isDark
                  ? 'border-slate-700 bg-slate-800 text-slate-300 hover:border-emerald-500 hover:text-emerald-300'
                  : 'border-slate-300 bg-white text-slate-600 hover:border-emerald-600 hover:text-emerald-700'
              } ${isVoiceProcessing ? 'cursor-not-allowed opacity-60' : ''}`}
            >
              {isListening ? <Square className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
            </button>
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder={t('chatbot.placeholder')}
              aria-label={t('chatbot.inputLabel')}
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
          {voiceStatus && (
            <div
              role="status"
              className={`px-3 pb-2 text-[10px] ${isDark ? 'bg-slate-900 text-slate-400' : 'bg-slate-50 text-slate-500'}`}
            >
              {voiceStatus}
            </div>
          )}
        </div>
      )}
    </div>
  );
};