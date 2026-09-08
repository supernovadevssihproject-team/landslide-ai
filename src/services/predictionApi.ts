/**
 * Prediction API Service
 *
 * Provides typed HTTP communication with the FastAPI backend prediction API.
 *
 * Uses VITE_API_BASE_URL if configured, or relative paths when the frontend
 * is served through a development proxy.
 */

import { PredictionRequest, PredictionResponse } from '../types';

/**
 * Support VITE_API_BASE_URL without a trailing slash.
 */
const RAW_BASE_URL = (import.meta.env.VITE_API_BASE_URL || '').trim();

const BASE_URL = RAW_BASE_URL.replace(/\/+$/, '');

/* ============================================================
   VERIFIED DATASET METADATA
============================================================ */

/**
 * Landcover option.
 *
 * Only values verified from the training dataset are included.
 * No descriptive ESA landcover names are assigned here unless a
 * project source explicitly provides that mapping.
 */
export interface LandcoverOption {
  value: string;
  code: string;
  name: string;
}

/**
 * VERIFIED LANDCOVER CLASSES
 *
 * Extracted from:
 * NER_Landslide_Rainfall_ML_Dataset_654.csv
 *
 * Unique verified values:
 *
 * 10.0
 * 30.0
 * 40.0
 * 50.0
 * 60.0
 * 70.0
 * 80.0
 * 90.0
 * 100.0
 */
export const REAL_LANDCOVER_CLASSES: LandcoverOption[] = [
  {
    value: '10.0',
    code: '10.0',
    name: 'Landcover Class 10.0',
  },
  {
    value: '30.0',
    code: '30.0',
    name: 'Landcover Class 30.0',
  },
  {
    value: '40.0',
    code: '40.0',
    name: 'Landcover Class 40.0',
  },
  {
    value: '50.0',
    code: '50.0',
    name: 'Landcover Class 50.0',
  },
  {
    value: '60.0',
    code: '60.0',
    name: 'Landcover Class 60.0',
  },
  {
    value: '70.0',
    code: '70.0',
    name: 'Landcover Class 70.0',
  },
  {
    value: '80.0',
    code: '80.0',
    name: 'Landcover Class 80.0',
  },
  {
    value: '90.0',
    code: '90.0',
    name: 'Landcover Class 90.0',
  },
  {
    value: '100.0',
    code: '100.0',
    name: 'Landcover Class 100.0',
  },
];

/**
 * Soil option.
 *
 * Only verified soil ID values from the training dataset are included.
 * No inferred soil names, regional descriptions, or importance values
 * are assigned.
 */
export interface SoilOption {
  value: string;
  id: string;
  name: string;
}

/**
 * VERIFIED SOIL IDS
 *
 * Extracted directly from:
 * NER_Landslide_Rainfall_ML_Dataset_654.csv
 *
 * Unique verified values:
 *
 * 11000.0
 * 11004.0
 * 11103.0
 * 11423.0
 * 11705.0
 * 11711.0
 * 11719.0
 * 11724.0
 * 11727.0
 * 11730.0
 * 11750.0
 * 11752.0
 * 11765.0
 * 11775.0
 * 11790.0
 * 11814.0
 * 11839.0
 * 11864.0
 * 11879.0
 * 11909.0
 * 3636.0
 * 3637.0
 * 3646.0
 * 3647.0
 * 3648.0
 * 3649.0
 * 3650.0
 * 3651.0
 * 3662.0
 * 3665.0
 * 3682.0
 * 3683.0
 * 3689.0
 * 3701.0
 * 3703.0
 * 3705.0
 * 3707.0
 * 3708.0
 * 3709.0
 * 3717.0
 * 3750.0
 * 3814.0
 * 3821.0
 * 3849.0
 * 3850.0
 * 4255.0
 * 4276.0
 * 4282.0
 * 4301.0
 * 4331.0
 * 4351.0
 * 4362.0
 * 4412.0
 * 6690.0
 * 6997.0
 * 7001.0
 */
export const REAL_SOIL_OPTIONS: SoilOption[] = [
  {
    value: '11000.0',
    id: '11000.0',
    name: 'Soil ID 11000.0',
  },
  {
    value: '11004.0',
    id: '11004.0',
    name: 'Soil ID 11004.0',
  },
  {
    value: '11103.0',
    id: '11103.0',
    name: 'Soil ID 11103.0',
  },
  {
    value: '11423.0',
    id: '11423.0',
    name: 'Soil ID 11423.0',
  },
  {
    value: '11705.0',
    id: '11705.0',
    name: 'Soil ID 11705.0',
  },
  {
    value: '11711.0',
    id: '11711.0',
    name: 'Soil ID 11711.0',
  },
  {
    value: '11719.0',
    id: '11719.0',
    name: 'Soil ID 11719.0',
  },
  {
    value: '11724.0',
    id: '11724.0',
    name: 'Soil ID 11724.0',
  },
  {
    value: '11727.0',
    id: '11727.0',
    name: 'Soil ID 11727.0',
  },
  {
    value: '11730.0',
    id: '11730.0',
    name: 'Soil ID 11730.0',
  },
  {
    value: '11750.0',
    id: '11750.0',
    name: 'Soil ID 11750.0',
  },
  {
    value: '11752.0',
    id: '11752.0',
    name: 'Soil ID 11752.0',
  },
  {
    value: '11765.0',
    id: '11765.0',
    name: 'Soil ID 11765.0',
  },
  {
    value: '11775.0',
    id: '11775.0',
    name: 'Soil ID 11775.0',
  },
  {
    value: '11790.0',
    id: '11790.0',
    name: 'Soil ID 11790.0',
  },
  {
    value: '11814.0',
    id: '11814.0',
    name: 'Soil ID 11814.0',
  },
  {
    value: '11839.0',
    id: '11839.0',
    name: 'Soil ID 11839.0',
  },
  {
    value: '11864.0',
    id: '11864.0',
    name: 'Soil ID 11864.0',
  },
  {
    value: '11879.0',
    id: '11879.0',
    name: 'Soil ID 11879.0',
  },
  {
    value: '11909.0',
    id: '11909.0',
    name: 'Soil ID 11909.0',
  },
  {
    value: '3636.0',
    id: '3636.0',
    name: 'Soil ID 3636.0',
  },
  {
    value: '3637.0',
    id: '3637.0',
    name: 'Soil ID 3637.0',
  },
  {
    value: '3646.0',
    id: '3646.0',
    name: 'Soil ID 3646.0',
  },
  {
    value: '3647.0',
    id: '3647.0',
    name: 'Soil ID 3647.0',
  },
  {
    value: '3648.0',
    id: '3648.0',
    name: 'Soil ID 3648.0',
  },
  {
    value: '3649.0',
    id: '3649.0',
    name: 'Soil ID 3649.0',
  },
  {
    value: '3650.0',
    id: '3650.0',
    name: 'Soil ID 3650.0',
  },
  {
    value: '3651.0',
    id: '3651.0',
    name: 'Soil ID 3651.0',
  },
  {
    value: '3662.0',
    id: '3662.0',
    name: 'Soil ID 3662.0',
  },
  {
    value: '3665.0',
    id: '3665.0',
    name: 'Soil ID 3665.0',
  },
  {
    value: '3682.0',
    id: '3682.0',
    name: 'Soil ID 3682.0',
  },
  {
    value: '3683.0',
    id: '3683.0',
    name: 'Soil ID 3683.0',
  },
  {
    value: '3689.0',
    id: '3689.0',
    name: 'Soil ID 3689.0',
  },
  {
    value: '3701.0',
    id: '3701.0',
    name: 'Soil ID 3701.0',
  },
  {
    value: '3703.0',
    id: '3703.0',
    name: 'Soil ID 3703.0',
  },
  {
    value: '3705.0',
    id: '3705.0',
    name: 'Soil ID 3705.0',
  },
  {
    value: '3707.0',
    id: '3707.0',
    name: 'Soil ID 3707.0',
  },
  {
    value: '3708.0',
    id: '3708.0',
    name: 'Soil ID 3708.0',
  },
  {
    value: '3709.0',
    id: '3709.0',
    name: 'Soil ID 3709.0',
  },
  {
    value: '3717.0',
    id: '3717.0',
    name: 'Soil ID 3717.0',
  },
  {
    value: '3750.0',
    id: '3750.0',
    name: 'Soil ID 3750.0',
  },
  {
    value: '3814.0',
    id: '3814.0',
    name: 'Soil ID 3814.0',
  },
  {
    value: '3821.0',
    id: '3821.0',
    name: 'Soil ID 3821.0',
  },
  {
    value: '3849.0',
    id: '3849.0',
    name: 'Soil ID 3849.0',
  },
  {
    value: '3850.0',
    id: '3850.0',
    name: 'Soil ID 3850.0',
  },
  {
    value: '4255.0',
    id: '4255.0',
    name: 'Soil ID 4255.0',
  },
  {
    value: '4276.0',
    id: '4276.0',
    name: 'Soil ID 4276.0',
  },
  {
    value: '4282.0',
    id: '4282.0',
    name: 'Soil ID 4282.0',
  },
  {
    value: '4301.0',
    id: '4301.0',
    name: 'Soil ID 4301.0',
  },
  {
    value: '4331.0',
    id: '4331.0',
    name: 'Soil ID 4331.0',
  },
  {
    value: '4351.0',
    id: '4351.0',
    name: 'Soil ID 4351.0',
  },
  {
    value: '4362.0',
    id: '4362.0',
    name: 'Soil ID 4362.0',
  },
  {
    value: '4412.0',
    id: '4412.0',
    name: 'Soil ID 4412.0',
  },
  {
    value: '6690.0',
    id: '6690.0',
    name: 'Soil ID 6690.0',
  },
  {
    value: '6997.0',
    id: '6997.0',
    name: 'Soil ID 6997.0',
  },
  {
    value: '7001.0',
    id: '7001.0',
    name: 'Soil ID 7001.0',
  },
];

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

  const response = await fetch(url, {
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

  const response = await fetch(url);

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

  const response = await fetch(url);

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