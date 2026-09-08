export type OperationalModule =
  | 'home'
  | 'dashboard'
  | 'risk-map'
  | 'risk-details'
  | 'alerts'
  | 'emergency-sos'
  | 'about'
  | 'spatial-gis-command'
  | 'temporal-lstm-predictor'
  | 'crowdsource-cv-verification'
  | 'emergency-broadcast-and-dispatch'
  | 'ml-models-pipeline'
  | 'risk-simulator';

export type NerState =
  | 'all'
  | 'sikkim'
  | 'assam'
  | 'meghalaya'
  | 'arunachal'
  | 'manipur'
  | 'nagaland'
  | 'mizoram'
  | 'tripura';

export interface HazardZone {
  id: string;
  name: string;
  subDivision: string;
  corridor: string;
  state: NerState;
  slopeGradient: string;
  soilPoreSaturation: string;
  displacementRate: string;
  pwpPressure: string;
  riskStatus: 'CRITICAL RED' | 'ADVISORY ORANGE' | 'NOMINAL GREEN';
  rfConfidence: string;
  lstmEvac: string;
  highwaySegment: string;
  bridgesExposed: string;
  populationRunout: string;
  coords: string;
  elevation: string;
  top: string;
  left: string;
  isCritical: boolean;
}

export interface SensorNode {
  id: string;
  name: string;
  type: 'piezometer' | 'inclinometer' | 'acoustic' | 'aws';
  typeLabel: string;
  location: string;
  state: NerState;
  coordinates: string;
  battery: string;
  uplink: string;
  lastSync: string;
  currentValue: string;
  currentValueSub?: string;
  warningThreshold: string;
  thresholdPercentage: number;
  status: 'critical' | 'advisory' | 'nominal' | 'torrential';
  statusLabel: string;
  sparkline?: number[];
  depth?: string;
}

export interface CrowdsourceReport {
  id: string;
  code: string;
  location: string;
  subDivision: string;
  state: NerState;
  timeAgo: string;
  reportedTime: string;
  urgency: 'CRITICAL' | 'URGENT' | 'AMBER' | 'ROUTINE';
  verifiedBy: string;
  imageUrl: string;
  imageAlt: string;
  cvRisk: string;
  cvLabel: string;
  cvModel: string;
  summary: string;
  description: string;
  coordinates: string;
  elevation: string;
  slope: string;
  precipitation: string;
  exifStatus: string;
  audioLanguage: string;
  audioDuration: string;
  vernacularText: string;
  englishTranslation: string;
  sensorCorroboration: {
    sensorId: string;
    rate: string;
    thresholdMessage: string;
  };
  boundingBoxes?: Array<{
    label: string;
    confidence: string;
    top: string;
    left: string;
    width: string;
    height: string;
    color: 'error' | 'tertiary' | 'secondary';
    extraInfo?: string;
  }>;
}

export interface TacticalUnit {
  id: string;
  name: string;
  status: 'EN ROUTE' | 'ON SCENE' | 'ACTIVE' | 'DEBRIS CLEARING';
  statusLabel: string;
  eta?: string;
  personnel: number;
  description: string;
  destination: string;
  satcomStatus: string;
  equipment: string[];
  progressPercent: number;
  type: 'ndrf' | 'sdrf' | 'bro';
}

export interface ReliefShelter {
  id: string;
  name: string;
  location: string;
  state: NerState;
  capacityCurrent: number;
  capacityMax: number;
  occupancyPercent: number;
  status: 'CRITICAL' | 'STABLE' | 'AVAILABLE';
  rationsDays: string;
  gensetStatus: string;
  waterSupply?: string;
  medicalActive?: boolean;
}

export interface AuditLogEntry {
  id: string;
  code: string;
  title: string;
  timestamp: string;
  message: string;
  authority: string;
  type: 'order' | 'broadcast' | 'corridor' | 'siren';
  highlight?: boolean;
}

export type RiskLevel = 'LOW' | 'MODERATE' | 'HIGH' | 'VERY_HIGH';

export interface PredictionRequest {
  elevation: number;
  slope: number;
  aspect: number;
  soil_id: string;
  landcover_class: string;
  rainfall_1d: number;
  rainfall_3d: number;
  rainfall_7d: number;
  rainfall_15d: number;
  rainfall_30d: number;
}

export interface PredictionResponse {
  prediction: 0 | 1;
  prediction_label: 'LANDSLIDE' | 'NO_LANDSLIDE';
  landslide_probability: number;
  probability_percentage?: number;
  risk_level: RiskLevel;
  action_code?: string;
  input_features: PredictionRequest;
  model?: string;
}

export interface MlPredictionInput {
  elevation: number;
  slope: number;
  aspect: number;
  soil_id: string;
  landcover_class: string;
  rainfall_1d: number;
  rainfall_3d: number;
  rainfall_7d: number;
  rainfall_15d: number;
  rainfall_30d: number;
}

export interface MlPredictionResult {
  prediction: number;
  prediction_label: 'LANDSLIDE' | 'NO_LANDSLIDE';
  landslide_probability: number;
  probability_percentage: number;
  risk_level: 'LOW' | 'MODERATE' | 'HIGH' | 'VERY_HIGH';
  action_code: string;
  input_features: Record<string, any>;
  model: string;
}

export interface MlMetrics {
  test_records: number;
  accuracy: number;
  precision: number;
  recall: number;
  f1_score: number;
  roc_auc: number;
  true_positives: number;
  true_negatives: number;
  false_positives: number;
  false_negatives: number;
}

export interface MlModelComparison {
  model: string;
  train_accuracy: number;
  train_roc_auc: number;
  test_accuracy: number;
  test_precision: number;
  test_recall: number;
  test_f1: number;
  test_roc_auc: number;
  true_positives: number;
  true_negatives: number;
  false_positives: number;
  false_negatives: number;
}

export interface MlFeatureImportance {
  feature: string;
  display_name: string;
  importance: number;
  importance_percentage: number;
}

export interface DatasetSummary {
  name: string;
  size: string;
  size_bytes: number;
  record_count: number;
  description: string;
}

export interface HistoricalLandslideEvent {
  id: string;
  record_id: string;
  latitude: number;
  longitude: number;
  state: NerState;
  event_date: string;
  rainfall_3d: number;
  slope: number;
  elevation: number;
  top_pct: string;
  left_pct: string;
  soil_id: string;
  landcover_class: string;
  dataset_source: string;
  type: string;
}

export interface ZoneMlRiskEvaluation {
  zone_id: string;
  zone_name: string;
  state: NerState;
  prediction: number;
  prediction_label: 'LANDSLIDE' | 'NO_LANDSLIDE';
  landslide_probability: number;
  probability_percentage: number;
  risk_tier: 'LOW' | 'MODERATE' | 'HIGH' | 'VERY_HIGH';
  action_code: string;
  model_name: string;
  feature_summary: {
    elevation_m: number;
    slope_deg: number;
    soil_saturation_pct: number;
    rainfall_3d_mm: number;
    rainfall_30d_mm: number;
  };
  primary_features: {
    name: string;
    value: string;
    impact: string;
  }[];
  historical_precedents_count: number;
}

export interface MlHeatmapPoint {
  latitude: number;
  longitude: number;
  weight: number;
  category: 'zone_susceptibility' | 'historical_ground_truth' | 'corridor_stress';
  label: string;
  state: NerState;
}

export interface MlHeatmapResponse {
  count: number;
  state_filter: string;
  extra_rainfall_applied: number;
  points: MlHeatmapPoint[];
}

export interface MonthlyMetricComparison {
  month: string;
  historicalAvg: number;
  current: number;
}

export interface HelplineEntry {
  id: string;
  name: string;
  category: 'government' | 'local' | 'medical' | 'rescue';
  number: string;
  state?: string;
  icon?: string;
}



