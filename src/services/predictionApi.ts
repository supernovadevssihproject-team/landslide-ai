/**
 * Prediction API Service
 *
 * Provides typed HTTP communication with the FastAPI backend prediction API.
 *
 * Uses VITE_API_BASE_URL if configured, or relative paths when the frontend
 * is served through a development proxy.
 */

import { PredictionRequest, PredictionResponse } from '../types';
import { VERIFIED_SOIL_MAP, getSoilLabel } from '../data/soilMapping';
import { VERIFIED_LANDCOVER_MAP, getLandcoverLabel } from '../data/landcoverMapping';

/**
 * Support VITE_API_BASE_URL without a trailing slash.
 */
const RAW_BASE_URL = (import.meta.env.VITE_API_BASE_URL || '').trim();

const BASE_URL = RAW_BASE_URL.replace(/\/+$/, '');
const PREDICTION_TIMEOUT_MS = 15000;

async function fetchWithTimeout(input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
  const controller = new AbortController();
  const timeoutId = window.setTimeout(() => controller.abort(), PREDICTION_TIMEOUT_MS);
  try {
    return await fetch(input, { ...init, signal: controller.signal });
  } finally {
    window.clearTimeout(timeoutId);
  }
}

/* ============================================================
   VERIFIED DATASET METADATA
============================================================ */

/**
 * Landcover option.
 *
 * Values verified from the training dataset and mapped to official ESA WorldCover classes.
 */
export interface LandcoverOption {
  value: string;
  code: string;
  name: string;
}

/**
 * VERIFIED LANDCOVER CLASSES
 */
export const REAL_LANDCOVER_CLASSES: LandcoverOption[] = Object.keys(VERIFIED_LANDCOVER_MAP).map((key) => ({
  value: key,
  code: key,
  name: VERIFIED_LANDCOVER_MAP[key].label,
}));

/**
 * Soil option.
 *
 * Values verified from the training dataset and mapped to official HWSD2 WRB4 soil classifications.
 */
export interface SoilOption {
  value: string;
  id: string;
  name: string;
}

/**
 * VERIFIED SOIL IDS
 */
export const REAL_SOIL_OPTIONS: SoilOption[] = Object.keys(VERIFIED_SOIL_MAP).map((key) => ({
  value: key,
  id: key,
  name: VERIFIED_SOIL_MAP[key].label,
}));

/* ============================================================
   PREDICTION API
============================================================ */

/**
 * Executes inference on the trained machine learning model
 * through the FastAPI POST /predict endpoint.
 *
 * Converts FastAPI validation errors into readable messages.
 */
export async function predictLandslideRisk(
  input: PredictionRequest
): Promise<PredictionResponse> {
  const url = `${BASE_URL}/predict`;

  const response = await fetchWithTimeout(url, {
    method: 'POST',

    headers: {
      'Content-Type': 'application/json',
    },

    body: JSON.stringify(input),
  });

  if (!response.ok) {
    let errorMessage = `Server error ${response.status}: ${response.statusText}`;

    try {
      const errorJson = await response.json();

      if (errorJson && errorJson.detail) {
        if (typeof errorJson.detail === 'string') {
          errorMessage = errorJson.detail;
        } else if (Array.isArray(errorJson.detail)) {
          errorMessage = errorJson.detail
            .map(
              (d: {
                msg?: string;
                loc?: (string | number)[];
              }) => {
                const field =
                  d.loc && d.loc.length > 0
                    ? `${d.loc[d.loc.length - 1]}: `
                    : '';

                return `${field}${d.msg || JSON.stringify(d)}`;
              }
            )
            .join('; ');
        }
      }
    } catch {
      // Response body is not JSON.
      // Keep the original HTTP status message.
    }

    throw new Error(errorMessage);
  }

  const data =
    (await response.json()) as PredictionResponse;

  return data;
}

/* ============================================================
   MODEL INFORMATION
============================================================ */

/**
 * Returns metadata about the currently active ML model
 * and preprocessing pipeline.
 */
export async function getModelInfo(): Promise<
  Record<string, unknown>
> {
  const url = `${BASE_URL}/model-info`;

  const response = await fetchWithTimeout(url);

  if (!response.ok) {
    throw new Error(
      `Failed to load model info: ${response.status} ${response.statusText}`
    );
  }

  return (await response.json()) as Record<
    string,
    unknown
  >;
}

/* ============================================================
   BACKEND HEALTH CHECK
============================================================ */

/**
 * Checks whether the FastAPI backend is operational.
 */
export async function getHealth(): Promise<{
  status: string;
  service?: string;
}> {
  const url = `${BASE_URL}/health`;

  const response = await fetchWithTimeout(url);

  if (!response.ok) {
    throw new Error(
      `Health check failed: ${response.status} ${response.statusText}`
    );
  }

  return (await response.json()) as {
    status: string;
    service?: string;
  };
}

/* ============================================================
   SERVICE EXPORT
============================================================ */

export const predictionApi = {
  predict: predictLandslideRisk,
  getModelInfo,
  getHealth,
  REAL_LANDCOVER_CLASSES,
  REAL_SOIL_OPTIONS,
};