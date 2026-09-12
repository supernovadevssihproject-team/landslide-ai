/**
 * Seismic Geotechnical Metrics & Attenuation Analysis for Landslide Destabilization.
 * Implements Ground Motion Prediction Equations (GMPE), Peak Ground Acceleration (PGA),
 * Arias Intensity (Ia), and Modified Mercalli Intensity (MMI) calibrated for the
 * Himalayan and North Eastern Indian tectonic belt (Indo-Burma subduction & Main Boundary Thrust).
 */

import { EarthquakeEvent } from '../types';
import { calculateHaversineDistanceKm } from '../data/hillsData';

export interface GroundMotionMetrics {
  epicentralDistanceKm: number;
  hypocentralDistanceKm: number;
  estimatedPgaG: number;
  estimatedPgaPercent: number;
  estimatedMmi: {
    intensity: number;
    roman: string;
    label: string;
    shaking: string;
    color: string;
    description: string;
  };
  ariasIntensityMs: number;
  exceedsKeeferLandslideThreshold: boolean;
  eventAgeHours: number;
  timeDecayWeight: number;
  destabilizationIndex: number;
  triggerCategory: 'NEGLIGIBLE' | 'LOW' | 'MODERATE' | 'HIGH' | 'CRITICAL';
}

export interface SeismicRiskAssessment {
  compositeTriggerScore: number;
  triggerLevel: 'LOW' | 'MODERATE' | 'HIGH' | 'CRITICAL';
  maxPgaG: number;
  maxMmi: string;
  nearestEventDistanceKm: number | null;
  dominantEvent: EarthquakeEvent | null;
  dominantMetrics: GroundMotionMetrics | null;
  eventsEvaluated: number;
  criticalEventsCount: number;
}

/**
 * Calculates hypocentral distance incorporating focal depth:
 * R_hypo = sqrt(R_epi^2 + Depth^2)
 */
export function calculateHypocentralDistanceKm(epicentralDistanceKm: number, depthKm: number): number {
  const safeDepth = Math.max(0.5, Number.isFinite(depthKm) ? depthKm : 10.0);
  return Math.sqrt(epicentralDistanceKm ** 2 + safeDepth ** 2);
}

/**
 * Estimates Peak Ground Acceleration (PGA) in units of g using regional
 * ground motion attenuation relation calibrated for the Himalayan orogen:
 * log10(PGA) = -0.15 + 0.38*M - 1.15*log10(R_hypo + 7.5) - 1.4
 */
export function estimatePga(magnitude: number, hypocentralDistanceKm: number): number {
  const safeMag = Math.max(1.0, Math.min(9.5, magnitude));
  const safeR = Math.max(1.0, hypocentralDistanceKm);
  const logPga = -0.15 + 0.38 * safeMag - 1.15 * Math.log10(safeR + 7.5) - 1.4;
  const pgaG = Math.pow(10, logPga);
  return Math.max(0.0001, Math.min(1.8, pgaG));
}

/**
 * Converts Peak Ground Acceleration to estimated Modified Mercalli Intensity (MMI)
 * based on the USGS / Worden et al. instrumental shake intensity criteria.
 */
export function estimateMmi(pgaG: number): {
  intensity: number;
  roman: string;
  label: string;
  shaking: string;
  color: string;
  description: string;
} {
  const pgaPercentG = pgaG * 100;
  if (pgaPercentG < 0.17) {
    return {
      intensity: 1,
      roman: 'I',
      label: 'Imperceptible',
      shaking: 'Not felt',
      color: 'text-slate-400 border-slate-700 bg-slate-800/40',
      description: 'Not felt except by very few under exceptionally favorable conditions.',
    };
  }
  if (pgaPercentG < 1.4) {
    return {
      intensity: 2,
      roman: 'II - III',
      label: 'Weak / Light',
      shaking: 'Weak',
      color: 'text-cyan-400 border-cyan-800/50 bg-cyan-950/30',
      description: 'Felt noticeably indoors. Delicately suspended objects may swing.',
    };
  }
  if (pgaPercentG < 3.9) {
    return {
      intensity: 4,
      roman: 'IV',
      label: 'Moderate',
      shaking: 'Moderate',
      color: 'text-emerald-400 border-emerald-800/50 bg-emerald-950/30',
      description: 'Dishes, windows rattle. Minor soil settlement in unconsolidated scree.',
    };
  }
  if (pgaPercentG < 9.2) {
    return {
      intensity: 5,
      roman: 'V',
      label: 'Strong',
      shaking: 'Strong',
      color: 'text-amber-400 border-amber-800/50 bg-amber-950/30',
      description: 'Felt by all. Small rockfalls on steep cuts and talus slopes.',
    };
  }
  if (pgaPercentG < 18.0) {
    return {
      intensity: 6,
      roman: 'VI',
      label: 'Very Strong (Landslide Threshold)',
      shaking: 'Very Strong',
      color: 'text-orange-400 border-orange-800/50 bg-orange-950/30',
      description: 'Noticeable slope fissures. Moderate to large rotational landslides triggered.',
    };
  }
  return {
    intensity: 7,
    roman: 'VII+',
    label: 'Severe Ground Failure',
    shaking: 'Violent',
    color: 'text-red-400 border-red-800/50 bg-red-950/40 animate-pulse',
    description: 'Widespread landslides, rock avalanches, and severe slope destabilization.',
  };
}

/**
 * Estimates Arias Intensity (Ia) in m/s (Keefer 1984 / Wilson & Keefer 1985).
 * Ia >= 0.11 m/s is the widely recognized critical threshold for triggering landslides.
 */
export function estimateAriasIntensity(magnitude: number, hypocentralDistanceKm: number): {
  value: number;
  unit: string;
  exceedsKeeferThreshold: boolean;
} {
  const safeMag = Math.max(1.0, magnitude);
  const safeR = Math.max(1.0, hypocentralDistanceKm);
  const logIa = -4.1 + 0.85 * safeMag - 1.5 * Math.log10(safeR);
  const ia = Math.max(0.0001, Math.min(25.0, Math.pow(10, logIa)));
  return {
    value: Number(ia.toFixed(4)),
    unit: 'm/s',
    exceedsKeeferThreshold: ia >= 0.11,
  };
}

/**
 * Calculates comprehensive geotechnical ground motion metrics for a single earthquake
 * relative to target observation coordinates.
 */
export function evaluateEventMetrics(
  event: EarthquakeEvent,
  targetLat: number,
  targetLon: number
): GroundMotionMetrics {
  const epicentralDistanceKm = calculateHaversineDistanceKm(
    targetLat,
    targetLon,
    event.latitude,
    event.longitude
  );

  const hypocentralDistanceKm = calculateHypocentralDistanceKm(
    epicentralDistanceKm,
    event.depth_km
  );

  const estimatedPgaG = estimatePga(event.magnitude, hypocentralDistanceKm);
  const estimatedPgaPercent = estimatedPgaG * 100;
  const estimatedMmi = estimateMmi(estimatedPgaG);
  const arias = estimateAriasIntensity(event.magnitude, hypocentralDistanceKm);

  // Time decay calculation
  const eventTimestamp = new Date(event.event_time).getTime();
  const now = Date.now();
  const eventAgeHours = Number.isFinite(eventTimestamp)
    ? Math.max(0, (now - eventTimestamp) / (1000 * 3600))
    : 48.0;

  // Exponential decay with half-life of ~36 hours for pore pressure / slope relaxation
  const timeDecayWeight = Math.exp(-eventAgeHours / 36.0);

  // Destabilization index combines PGA, Arias intensity, proximity, and recency
  const pgaFactor = Math.min(1.0, estimatedPgaG / 0.12);
  const ariasFactor = arias.exceedsKeeferThreshold ? 1.0 : Math.min(1.0, arias.value / 0.11);
  const proximityFactor = Math.max(0.0, 1.0 - epicentralDistanceKm / 500.0);
  const rawDestabilization = (pgaFactor * 0.45 + ariasFactor * 0.35 + proximityFactor * 0.2) * timeDecayWeight;
  const destabilizationIndex = Number(Math.max(0.0, Math.min(1.0, rawDestabilization)).toFixed(3));

  let triggerCategory: 'NEGLIGIBLE' | 'LOW' | 'MODERATE' | 'HIGH' | 'CRITICAL' = 'NEGLIGIBLE';
  if (destabilizationIndex >= 0.65 || (estimatedPgaG >= 0.1 && epicentralDistanceKm <= 80)) {
    triggerCategory = 'CRITICAL';
  } else if (destabilizationIndex >= 0.4 || (estimatedPgaG >= 0.04 && epicentralDistanceKm <= 150)) {
    triggerCategory = 'HIGH';
  } else if (destabilizationIndex >= 0.2 || (estimatedPgaG >= 0.015 && epicentralDistanceKm <= 280)) {
    triggerCategory = 'MODERATE';
  } else if (destabilizationIndex >= 0.05) {
    triggerCategory = 'LOW';
  }

  return {
    epicentralDistanceKm: Math.round(epicentralDistanceKm),
    hypocentralDistanceKm: Math.round(hypocentralDistanceKm),
    estimatedPgaG: Number(estimatedPgaG.toFixed(4)),
    estimatedPgaPercent: Number(estimatedPgaPercent.toFixed(2)),
    estimatedMmi,
    ariasIntensityMs: arias.value,
    exceedsKeeferLandslideThreshold: arias.exceedsKeeferThreshold,
    eventAgeHours: Math.round(eventAgeHours),
    timeDecayWeight: Number(timeDecayWeight.toFixed(3)),
    destabilizationIndex,
    triggerCategory,
  };
}

/**
 * Evaluates the full earthquake catalogue against a monitoring focal point,
 * returning aggregated multi-hazard seismic risk metrics.
 */
export function calculateSeismicRiskAssessment(
  events: EarthquakeEvent[],
  targetLat?: number,
  targetLon?: number
): SeismicRiskAssessment {
  if (!events || events.length === 0 || targetLat === undefined || targetLon === undefined) {
    return {
      compositeTriggerScore: 0.0,
      triggerLevel: 'LOW',
      maxPgaG: 0.0,
      maxMmi: 'I',
      nearestEventDistanceKm: null,
      dominantEvent: null,
      dominantMetrics: null,
      eventsEvaluated: 0,
      criticalEventsCount: 0,
    };
  }

  let maxScore = 0.0;
  let maxPga = 0.0;
  let maxMmi = 'I';
  let nearestDist: number | null = null;
  let dominantEvent: EarthquakeEvent | null = null;
  let dominantMetrics: GroundMotionMetrics | null = null;
  let criticalCount = 0;

  for (const event of events) {
    if (!Number.isFinite(event.latitude) || !Number.isFinite(event.longitude)) continue;
    const metrics = evaluateEventMetrics(event, targetLat, targetLon);

    if (nearestDist === null || metrics.epicentralDistanceKm < nearestDist) {
      nearestDist = metrics.epicentralDistanceKm;
    }

    if (metrics.estimatedPgaG > maxPga) {
      maxPga = metrics.estimatedPgaG;
      maxMmi = metrics.estimatedMmi.roman;
    }

    if (metrics.triggerCategory === 'HIGH' || metrics.triggerCategory === 'CRITICAL') {
      criticalCount++;
    }

    if (metrics.destabilizationIndex > maxScore) {
      maxScore = metrics.destabilizationIndex;
      dominantEvent = event;
      dominantMetrics = metrics;
    }
  }

  let triggerLevel: 'LOW' | 'MODERATE' | 'HIGH' | 'CRITICAL' = 'LOW';
  if (maxScore >= 0.65 || maxPga >= 0.1) {
    triggerLevel = 'CRITICAL';
  } else if (maxScore >= 0.4 || maxPga >= 0.04) {
    triggerLevel = 'HIGH';
  } else if (maxScore >= 0.2 || maxPga >= 0.015) {
    triggerLevel = 'MODERATE';
  }

  return {
    compositeTriggerScore: Number(maxScore.toFixed(3)),
    triggerLevel,
    maxPgaG: Number(maxPga.toFixed(4)),
    maxMmi,
    nearestEventDistanceKm: nearestDist,
    dominantEvent,
    dominantMetrics,
    eventsEvaluated: events.length,
    criticalEventsCount: criticalCount,
  };
}
