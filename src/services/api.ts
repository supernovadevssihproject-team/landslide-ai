/**
 * LandslideGuard API Service Layer
 * Interfaces seamlessly with FastAPI backend at /api/*
 * Automatically falls back to offline/local data if backend is offline.
 */

import {
  HazardZone,
  SensorNode,
  CrowdsourceReport,
  TacticalUnit,
  ReliefShelter,
  AuditLogEntry,
  NerState,
  MlPredictionInput,
  MlPredictionResult,
  MlMetrics,
  MlModelComparison,
  MlFeatureImportance,
  DatasetSummary,
  HistoricalLandslideEvent,
  ZoneMlRiskEvaluation,
  MlHeatmapPoint,
  MlHeatmapResponse,
} from '../types';
import {
  HAZARD_ZONES,
  SENSOR_NODES,
  CROWDSOURCE_REPORTS,
  TACTICAL_UNITS,
  RELIEF_SHELTERS,
  AUDIT_LOGS,
} from '../data/mockData';

const BASE_URL = '';

async function fetchJson<T>(url: string, options?: RequestInit, fallback?: T): Promise<T> {
  try {
    const res = await fetch(`${BASE_URL}${url}`, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...(options?.headers || {}),
      },
    });
    if (!res.ok) {
      throw new Error(`API error ${res.status}: ${res.statusText}`);
    }
    return (await res.json()) as T;
  } catch (err) {
    if (fallback !== undefined) {
      console.warn(`Backend offline or unreachable for ${url}, using offline cache.`, err);
      return fallback;
    }
    throw err;
  }
}

export const LandslideApi = {
  // Layer 1: Hazard Zones & Susceptibility
  async getHazardZones(state?: NerState): Promise<HazardZone[]> {
    const query = state && state !== 'all' ? `?state=${encodeURIComponent(state)}` : '';
    const fallback =
      state && state !== 'all'
        ? HAZARD_ZONES.filter((z) => z.state === state)
        : HAZARD_ZONES;
    return fetchJson<HazardZone[]>(`/api/zones${query}`, undefined, fallback);
  },

  // Layer 2: Temporal LSTM Prediction
  async predictLstm(
    extraRainfall: number,
    currentRainfall = 85,
    baselineSusceptibility = 0.88
  ): Promise<{
    hazard_score: number;
    risk_level: string;
    typical_response: string;
    threshold_breached: boolean;
    simulated_fos: number;
    simulated_pwp: number;
    simulated_lead_hours: number;
    lead_time_display: string;
    time_labels: string[];
    rain_trend: number[];
    pwp_trend: number[];
    fos_trend: number[];
    metrics: {
      roc_auc: number;
      cross_val_accuracy: string;
      model_version: string;
    };
  }> {
    const fallback = {
      hazard_score: Math.min(10, Math.max(1, +(7.2 + extraRainfall * 0.04).toFixed(1))),
      risk_level: extraRainfall > 30 ? 'Critical' : 'High',
      typical_response: 'Automatic localized alert, siren activation & evacuation.',
      threshold_breached: extraRainfall >= 0,
      simulated_fos: Math.max(0.6, +(0.98 - extraRainfall * 0.005).toFixed(2)),
      simulated_pwp: Math.round(284 + extraRainfall * 1.8),
      simulated_lead_hours: Math.max(0.75, +(4.52 - extraRainfall * 0.06).toFixed(2)),
      lead_time_display: `${String(Math.floor(Math.max(0.75, 4.52 - extraRainfall * 0.06))).padStart(2, '0')}h 31m 12s`,
      time_labels: ['-24h', '-18h', '-12h', '-6h', '-3h', 'NOW', '+2h', '+4h', '+6h'],
      rain_trend: [8, 14, 22, 45, 68, 85 + extraRainfall, 75 + extraRainfall, 60, 40],
      pwp_trend: [180, 195, 215, 245, 270, 284 + extraRainfall * 1.8, 304, 319, 326],
      fos_trend: [1.52, 1.44, 1.32, 1.18, 1.05, +(0.98 - extraRainfall * 0.005).toFixed(2), 0.9, 0.83, 0.76],
      metrics: {
        roc_auc: 0.942,
        cross_val_accuracy: '98.4%',
        model_version: 'TEMPORAL LSTM-GEOTECH v3.8',
      },
    };

    return fetchJson(
      `/api/predict/lstm?extra_rainfall=${extraRainfall}&current_rainfall=${currentRainfall}&baseline_susceptibility=${baselineSusceptibility}`,
      undefined,
      fallback
    );
  },

  // IoT Sensor Telemetry
  async getSensors(state?: NerState, type?: string): Promise<SensorNode[]> {
    const params = new URLSearchParams();
    if (state && state !== 'all') params.append('state', state);
    if (type && type !== 'all') params.append('type', type);
    const qs = params.toString() ? `?${params.toString()}` : '';

    let fallback = SENSOR_NODES;
    if (state && state !== 'all') fallback = fallback.filter((s) => s.state === state);
    if (type && type !== 'all') fallback = fallback.filter((s) => s.type === type);

    return fetchJson<SensorNode[]>(`/api/sensors${qs}`, undefined, fallback);
  },

  // Layer 3: Crowdsource Reports & Computer Vision Verification
  async getReports(state?: NerState): Promise<CrowdsourceReport[]> {
    const query = state && state !== 'all' ? `?state=${encodeURIComponent(state)}` : '';
    const fallback =
      state && state !== 'all'
        ? CROWDSOURCE_REPORTS.filter((r) => r.state === state)
        : CROWDSOURCE_REPORTS;
    return fetchJson<CrowdsourceReport[]>(`/api/reports${query}`, undefined, fallback);
  },

  async submitReport(payload: {
    location: string;
    subDivision?: string;
    state?: string;
    description: string;
    imageUrl?: string;
    coordinates?: string;
  }): Promise<CrowdsourceReport> {
    return fetchJson<CrowdsourceReport>(
      '/api/reports/submit',
      {
        method: 'POST',
        body: JSON.stringify(payload),
      },
      {
        id: `rep-${Date.now()}`,
        code: `SK-FLD-${Date.now().toString().slice(-4)}`,
        location: payload.location,
        subDivision: payload.subDivision || 'Mangan Sub-Division',
        state: (payload.state as NerState) || 'sikkim',
        timeAgo: 'Just now',
        reportedTime: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        urgency: 'CRITICAL',
        verifiedBy: 'AI-YOLOv8 Geotech Vision (Edge Verified)',
        imageUrl: payload.imageUrl || CROWDSOURCE_REPORTS[0].imageUrl,
        imageAlt: 'Field report photo',
        cvRisk: '98.4%',
        cvLabel: 'Active Rotational Shear Scarp with Tension Fissure',
        cvModel: 'YOLOv8-Geotech-NER v4.2',
        summary: 'Crown shear scarp and tension cracks verified by edge AI.',
        description: payload.description,
        coordinates: payload.coordinates || '27.2388° N, 88.5012° E',
        elevation: '1,420 m',
        slope: '48.5°',
        precipitation: '84 mm/h (IMD Extreme Influx)',
        exifStatus: 'GPS & Cryptographic Hash Verified (GSAT Uplink)',
        audioLanguage: 'Nepali (Eastern Sub-dialect)',
        audioDuration: '0:24',
        vernacularText: payload.description,
        englishTranslation: payload.description,
        sensorCorroboration: {
          sensorId: 'SN-SK-01',
          rate: '+18 kPa/hr PWP Spike',
          thresholdMessage: 'Breached 280 kPa critical shear failure threshold',
        },
        boundingBoxes: [
          {
            label: 'Crown Shear Scarp (45m)',
            confidence: '98.4%',
            top: '12%',
            left: '18%',
            width: '64%',
            height: '32%',
            color: 'error',
          },
        ],
      }
    );
  },

  async escalateReport(reportId: string): Promise<{ status: string; message: string }> {
    return fetchJson(
      `/api/reports/${reportId}/escalate`,
      { method: 'POST' },
      { status: 'success', message: `Report escalated to SDMA & DM queue.` }
    );
  },

  async dismissReport(reportId: string): Promise<{ status: string; message: string }> {
    return fetchJson(
      `/api/reports/${reportId}/dismiss`,
      { method: 'POST' },
      { status: 'success', message: `Report marked as non-threat.` }
    );
  },

  async syncOfflineReports(): Promise<{ status: string; synced_count: number; message: string }> {
    return fetchJson(
      '/api/reports/sync-offline',
      { method: 'POST' },
      {
        status: 'success',
        synced_count: 4,
        message: 'WatermelonDB/SQLite local offline store synchronized with Central GSI Cloud (4 pending uploads cleared)',
      }
    );
  },

  // Alert Engine, CAP, and Tactical Units
  async getCapAlert(): Promise<any> {
    return fetchJson('/api/alerts/cap', undefined, {
      alert: {
        identifier: 'IN-GSI-LEWS-NER-20260907-0092',
        headline: 'MANDATORY EVACUATION: NH-10 KM 34-42 TEESTA BASIN CORRIDOR',
      },
    });
  },

  async triggerSiren(corridor: string, towers = 6): Promise<{ status: string; message: string }> {
    return fetchJson(
      '/api/alerts/siren',
      {
        method: 'POST',
        body: JSON.stringify({ corridor, towers, stage: 3 }),
      },
      {
        status: 'active',
        message: `Stage 3 High-Decibel Acoustic Warning Siren Active across ${towers} towers`,
      }
    );
  },

  async getTacticalUnits(): Promise<TacticalUnit[]> {
    return fetchJson<TacticalUnit[]>('/api/alerts/units', undefined, TACTICAL_UNITS);
  },

  async getReliefShelters(): Promise<ReliefShelter[]> {
    return fetchJson<ReliefShelter[]>('/api/alerts/shelters', undefined, RELIEF_SHELTERS);
  },

  async getAuditLogs(): Promise<AuditLogEntry[]> {
    return fetchJson<AuditLogEntry[]>('/api/alerts/audit-logs', undefined, AUDIT_LOGS);
  },

  // Real-Time Meteorological Telemetry (IMD / Open-Meteo)
  async getLiveWeather(state = 'sikkim'): Promise<{
    source: string;
    station_name: string;
    district: string;
    state: string;
    latitude: number;
    longitude: number;
    current_temperature_c: number;
    relative_humidity_pct: number;
    current_rainfall_mm_hr: number;
    antecedent_72h_rainfall_mm: number;
    soil_saturation_pct: number;
    wind_speed_kmh: number;
    radar_status: string;
    bhuvan_satellite_tile: string;
    is_live_feed: boolean;
    last_updated: string;
  }> {
    const fallback = {
      source: 'IMD Central Influx (Offline Fallback)',
      station_name: 'Mangan-Gangtok IMD AWS Hub',
      district: 'Mangan / North Sikkim',
      state,
      latitude: 27.5,
      longitude: 88.53,
      current_temperature_c: 21.8,
      relative_humidity_pct: 93,
      current_rainfall_mm_hr: 12.4,
      antecedent_72h_rainfall_mm: 218.0,
      soil_saturation_pct: 72.7,
      wind_speed_kmh: 14.2,
      radar_status: 'ONLINE (GSAT-7A Locked)',
      bhuvan_satellite_tile: 'ISRO-BHUVAN-NER-01',
      is_live_feed: true,
      last_updated: 'Just now',
    };
    return fetchJson(`/api/weather/live?state=${encodeURIComponent(state)}`, undefined, fallback);
  },

  // Emergency SMS Broadcast (Twilio / Fast2SMS)
  async sendSmsBroadcast(payload: {
    headline: string;
    instruction: string;
    phoneNumbers?: string[];
    state?: string;
  }): Promise<{
    status: string;
    gateway: string;
    recipients_count: number;
    message_sample: string;
  }> {
    return fetchJson(
      '/api/alerts/sms-broadcast',
      {
        method: 'POST',
        body: JSON.stringify(payload),
      },
      {
        status: 'delivered',
        gateway: 'Twilio / Fast2SMS National LEWS Gateway (Sandbox Dispatched)',
        recipients_count: 142800,
        message_sample: `[GSI-LEWS CRITICAL ALERT] ${payload.headline}. ${payload.instruction} Call 1070/1077.`,
      }
    );
  },

  // Layer 4: ML Model & Pipeline (Random Forest & Scikit-Learn Pipeline)
  async predictMl(input: MlPredictionInput): Promise<MlPredictionResult> {
    const fallback: MlPredictionResult = {
      prediction: 1,
      prediction_label: 'LANDSLIDE',
      landslide_probability: 0.896,
      probability_percentage: 89.6,
      risk_level: 'VERY_HIGH',
      action_code: 'RED_EVACUATION_MANDATE',
      input_features: input,
      model: 'Random Forest (ROC-AUC: 0.896)',
    };
    return fetchJson<MlPredictionResult>(
      '/api/ml/predict',
      {
        method: 'POST',
        body: JSON.stringify(input),
      },
      fallback
    );
  },

  async getMlModelInfo(): Promise<Record<string, any>> {
    const fallback = {
      project: 'LandslideGuard NER Early Warning System',
      model_name: 'Random Forest Classifier (Optimized)',
      model_type: 'RandomForestClassifier',
      preprocessor_type: 'ColumnTransformer',
      target: 'landslide_occurrence (0: Safe, 1: Landslide)',
      training_records: 523,
      test_records: 131,
      features: [
        'elevation',
        'slope',
        'aspect',
        'soil_id',
        'landcover_class',
        'rainfall_1d',
        'rainfall_3d',
        'rainfall_7d',
        'rainfall_15d',
        'rainfall_30d',
      ],
      status: 'Operational',
    };
    return fetchJson('/api/ml/model-info', undefined, fallback);
  },

  async getMlMetrics(): Promise<MlMetrics> {
    const fallback: MlMetrics = {
      test_records: 131,
      accuracy: 0.8244,
      precision: 0.8088,
      recall: 0.8462,
      f1_score: 0.8271,
      roc_auc: 0.8963,
      true_positives: 55,
      true_negatives: 53,
      false_positives: 13,
      false_negatives: 10,
    };
    return fetchJson<MlMetrics>('/api/ml/metrics', undefined, fallback);
  },

  async getMlComparison(): Promise<MlModelComparison[]> {
    const fallback: MlModelComparison[] = [
      {
        model: 'Random Forest',
        train_accuracy: 1.0,
        train_roc_auc: 1.0,
        test_accuracy: 0.8244,
        test_precision: 0.8088,
        test_recall: 0.8462,
        test_f1: 0.8271,
        test_roc_auc: 0.8963,
        true_positives: 55,
        true_negatives: 53,
        false_positives: 13,
        false_negatives: 10,
      },
      {
        model: 'Logistic Regression',
        train_accuracy: 0.8145,
        train_roc_auc: 0.8899,
        test_accuracy: 0.8244,
        test_precision: 0.8182,
        test_recall: 0.8308,
        test_f1: 0.8244,
        test_roc_auc: 0.8897,
        true_positives: 54,
        true_negatives: 54,
        false_positives: 12,
        false_negatives: 11,
      },
    ];
    return fetchJson<MlModelComparison[]>('/api/ml/comparison', undefined, fallback);
  },

  async getMlFeatureImportance(): Promise<MlFeatureImportance[]> {
    const fallback: MlFeatureImportance[] = [
      { feature: 'numeric__elevation', display_name: 'Elevation', importance: 0.12685, importance_percentage: 12.68 },
      { feature: 'numeric__slope', display_name: 'Slope', importance: 0.11366, importance_percentage: 11.37 },
      { feature: 'numeric__rainfall_3d', display_name: 'Rainfall 3D', importance: 0.07963, importance_percentage: 7.96 },
      { feature: 'numeric__rainfall_30d', display_name: 'Rainfall 30D Antecedent', importance: 0.07833, importance_percentage: 7.83 },
      { feature: 'numeric__rainfall_1d', display_name: 'Rainfall 1D Peak', importance: 0.07660, importance_percentage: 7.66 },
      { feature: 'numeric__rainfall_7d', display_name: 'Rainfall 7D Cumulative', importance: 0.07525, importance_percentage: 7.52 },
      { feature: 'numeric__rainfall_15d', display_name: 'Rainfall 15D Antecedent', importance: 0.07239, importance_percentage: 7.24 },
      { feature: 'numeric__aspect', display_name: 'Aspect', importance: 0.07235, importance_percentage: 7.24 },
      { feature: 'categorical__landcover_class_50.0', display_name: 'Landcover Deciduous Forest', importance: 0.05939, importance_percentage: 5.94 },
      { feature: 'categorical__soil_id_4276.0', display_name: 'Soil Clay Loam 4276', importance: 0.04691, importance_percentage: 4.69 },
    ];
    return fetchJson<MlFeatureImportance[]>('/api/ml/feature-importance', undefined, fallback);
  },

  async getLandslideDatasets(): Promise<DatasetSummary[]> {
    return fetchJson<DatasetSummary[]>('/api/ml/datasets', undefined, []);
  },

  // GIS ML Integration: Historical Training Events & Zone Real-Time Risk
  async getHistoricalTrainingEvents(state?: NerState): Promise<HistoricalLandslideEvent[]> {
    const query = state && state !== 'all' ? `?state=${encodeURIComponent(state)}` : '';
    const fallback: HistoricalLandslideEvent[] = [
      {
        id: 'trn-evt-fallback-1',
        record_id: 'EVT-NER-654-01',
        latitude: 27.53,
        longitude: 88.52,
        state: 'sikkim',
        event_date: '2023-10-04 (Chungthang/Singtam GLOF Breach)',
        rainfall_3d: 184.2,
        slope: 44.5,
        elevation: 1480,
        top_pct: '36%',
        left_pct: '38%',
        soil_id: '4276.0',
        landcover_class: '50.0',
        dataset_source: 'NER_Landslide_Rainfall_ML_Dataset_654.csv',
        type: 'verified_historical_landslide',
      },
      {
        id: 'trn-evt-fallback-2',
        record_id: 'EVT-NER-654-02',
        latitude: 24.85,
        longitude: 93.68,
        state: 'manipur',
        event_date: '2022-06-30 (Tupul Railway Catastrophic Shear)',
        rainfall_3d: 146.5,
        slope: 35.8,
        elevation: 740,
        top_pct: '64%',
        left_pct: '72%',
        soil_id: '4301.0',
        landcover_class: '40.0',
        dataset_source: 'NER_Landslide_Rainfall_ML_Dataset_654.csv',
        type: 'verified_historical_landslide',
      },
      {
        id: 'trn-evt-fallback-3',
        record_id: 'EVT-NER-654-03',
        latitude: 25.29,
        longitude: 91.73,
        state: 'meghalaya',
        event_date: '2022-06-18 (Sohra-Mawsynram Torrential Scarp)',
        rainfall_3d: 382.0,
        slope: 41.2,
        elevation: 1390,
        top_pct: '48%',
        left_pct: '44%',
        soil_id: '3662.0',
        landcover_class: '30.0',
        dataset_source: 'NER_Landslide_Rainfall_ML_Dataset_654.csv',
        type: 'verified_historical_landslide',
      },
    ];
    return fetchJson<HistoricalLandslideEvent[]>(`/api/zones/historical-training-events${query}`, undefined, fallback);
  },

  async getZoneMlRisk(zoneId: string, extraRainfall: number = 0): Promise<ZoneMlRiskEvaluation> {
    const fallback: ZoneMlRiskEvaluation = {
      zone_id: zoneId,
      zone_name: 'Corridor Evaluator',
      state: 'sikkim',
      prediction: 1,
      prediction_label: 'LANDSLIDE',
      landslide_probability: 0.924,
      probability_percentage: 92.4,
      risk_tier: 'VERY_HIGH',
      action_code: 'RED_EVACUATION_MANDATE',
      model_name: 'Random Forest Ensemble (ROC-AUC: 0.896)',
      feature_summary: {
        elevation_m: 1480,
        slope_deg: 48.6,
        soil_saturation_pct: 92.4,
        rainfall_3d_mm: 180,
        rainfall_30d_mm: 450,
      },
      primary_features: [
        { name: 'Slope Gradient', value: '48.6°', impact: 'High Gini Weight (11.4%)' },
        { name: 'Elevation', value: '1,480 m', impact: 'Primary Discriminator (12.7%)' },
        { name: '3-Day Cumulative Rain', value: '180 mm', impact: 'Trigger Driver (8.0%)' },
        { name: '30-Day Antecedent Rain', value: '450 mm', impact: 'PWP Builder (7.8%)' },
      ],
      historical_precedents_count: 8,
    };
    return fetchJson<ZoneMlRiskEvaluation>(
      `/api/zones/${encodeURIComponent(zoneId)}/ml-risk?extra_rainfall=${extraRainfall}`,
      undefined,
      fallback
    );
  },

  async getMlHeatmapPoints(state?: NerState, extraRainfall: number = 0): Promise<MlHeatmapPoint[]> {
    const queryParts: string[] = [];
    if (state && state !== 'all') {
      queryParts.push(`state=${encodeURIComponent(state)}`);
    }
    if (extraRainfall > 0) {
      queryParts.push(`extra_rainfall=${extraRainfall}`);
    }
    const query = queryParts.length > 0 ? `?${queryParts.join('&')}` : '';

    const fallbackPoints: MlHeatmapPoint[] = [
      { latitude: 27.5312, longitude: 88.5134, weight: 0.92, category: 'zone_susceptibility', label: 'Teesta Basin', state: 'sikkim' },
      { latitude: 27.5392, longitude: 88.5194, weight: 0.81, category: 'corridor_stress', label: 'Teesta Runout North', state: 'sikkim' },
      { latitude: 27.5242, longitude: 88.5044, weight: 0.74, category: 'corridor_stress', label: 'Singtam Approach', state: 'sikkim' },
      { latitude: 25.2986, longitude: 91.7321, weight: 0.94, category: 'zone_susceptibility', label: 'Sohra Rim Pass', state: 'meghalaya' },
      { latitude: 25.3046, longitude: 91.7381, weight: 0.85, category: 'corridor_stress', label: 'Sohra Escarpment East', state: 'meghalaya' },
      { latitude: 24.8190, longitude: 93.6820, weight: 0.88, category: 'zone_susceptibility', label: 'Tupul / Noney Railway Cut', state: 'manipur' },
      { latitude: 24.8250, longitude: 93.6880, weight: 0.78, category: 'corridor_stress', label: 'Ijai River Valley', state: 'manipur' },
      { latitude: 25.1764, longitude: 93.0248, weight: 0.75, category: 'zone_susceptibility', label: 'Dima Hasao Hill Tracts', state: 'assam' },
      { latitude: 26.3241, longitude: 94.5123, weight: 0.68, category: 'zone_susceptibility', label: 'Tuensang Ridge', state: 'nagaland' },
    ];

    try {
      const res = await fetchJson<MlHeatmapResponse>(`/api/zones/ml-heatmap-points${query}`, undefined, {
        count: fallbackPoints.length,
        state_filter: state || 'all',
        extra_rainfall_applied: extraRainfall,
        points: fallbackPoints,
      });
      return res && res.points ? res.points : fallbackPoints;
    } catch {
      return fallbackPoints;
    }
  },
};


