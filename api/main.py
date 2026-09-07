from pathlib import Path
import warnings

import joblib
import numpy as np
import pandas as pd

from fastapi import FastAPI, HTTPException
from pydantic import BaseModel, Field

warnings.filterwarnings("ignore")


# ============================================================
# PATH CONFIGURATION
# ============================================================

BASE_DIR = Path(__file__).resolve().parent.parent

MODEL_PATH = BASE_DIR / "ml" / "outputs" / "best_model.pkl"

PREPROCESSOR_PATH = (
    BASE_DIR
    / "ml"
    / "outputs"
    / "preprocessing_pipeline.pkl"
)


# ============================================================
# API APPLICATION
# ============================================================

app = FastAPI(
    title="LandslideGuard Prediction API",
    description=(
        "API for predicting landslide occurrence using terrain, "
        "soil, land-cover, and rainfall features."
    ),
    version="1.0.0"
)


# ============================================================
# LOAD MODEL AND PREPROCESSING PIPELINE
# ============================================================

print("=" * 60)
print("LANDSLIDEGUARD PREDICTION API")
print("=" * 60)

model = None
preprocessor = None


try:
    model = joblib.load(MODEL_PATH)

    print("✓ Model loaded successfully")
    print(f"Model: {type(model).__name__}")

except Exception as e:

    print("✗ Failed to load model")

    raise RuntimeError(
        f"Could not load model from:\n{MODEL_PATH}\n\n"
        f"Error: {e}"
    )


try:
    preprocessor = joblib.load(PREPROCESSOR_PATH)

    print("✓ Preprocessing pipeline loaded successfully")

except Exception as e:

    print("✗ Failed to load preprocessing pipeline")

    raise RuntimeError(
        f"Could not load preprocessing pipeline from:\n"
        f"{PREPROCESSOR_PATH}\n\n"
        f"Error: {e}"
    )


# ============================================================
# INPUT DATA MODEL
# ============================================================

class LandslideInput(BaseModel):

    elevation: float = Field(
        ...,
        ge=0,
        description="Elevation in meters"
    )

    slope: float = Field(
        ...,
        ge=0,
        le=90,
        description="Slope in degrees"
    )

    aspect: float = Field(
        ...,
        ge=0,
        le=360,
        description="Aspect in degrees"
    )

    soil_id: str = Field(
        ...,
        description="Soil classification ID"
    )

    landcover_class: str = Field(
        ...,
        description="Land-cover classification ID"
    )

    rainfall_1d: float = Field(
        ...,
        ge=0,
        description="Rainfall accumulated over the last 1 day in mm"
    )

    rainfall_3d: float = Field(
        ...,
        ge=0,
        description="Rainfall accumulated over the last 3 days in mm"
    )

    rainfall_7d: float = Field(
        ...,
        ge=0,
        description="Rainfall accumulated over the last 7 days in mm"
    )

    rainfall_15d: float = Field(
        ...,
        ge=0,
        description="Rainfall accumulated over the last 15 days in mm"
    )

    rainfall_30d: float = Field(
        ...,
        ge=0,
        description="Rainfall accumulated over the last 30 days in mm"
    )


# ============================================================
# ROOT ENDPOINT
# ============================================================

@app.get("/")
def root():

    return {
        "message": "Welcome to LandslideGuard Prediction API",
        "status": "running",
        "model": type(model).__name__
    }


# ============================================================
# HEALTH CHECK ENDPOINT
# ============================================================

@app.get("/health")
def health_check():

    return {
        "status": "healthy",
        "model_loaded": model is not None,
        "preprocessing_pipeline_loaded": preprocessor is not None,
        "model_type": type(model).__name__
    }


# ============================================================
# PREDICTION ENDPOINT
# ============================================================

@app.post("/predict")
def predict(data: LandslideInput):

    try:

        # ====================================================
        # VALIDATE CUMULATIVE RAINFALL WINDOWS
        # ====================================================

        if data.rainfall_3d < data.rainfall_1d:
            raise HTTPException(
                status_code=422,
                detail=(
                    "Invalid rainfall values: "
                    "rainfall_3d must be greater than or equal "
                    "to rainfall_1d."
                )
            )

        if data.rainfall_7d < data.rainfall_3d:
            raise HTTPException(
                status_code=422,
                detail=(
                    "Invalid rainfall values: "
                    "rainfall_7d must be greater than or equal "
                    "to rainfall_3d."
                )
            )

        if data.rainfall_15d < data.rainfall_7d:
            raise HTTPException(
                status_code=422,
                detail=(
                    "Invalid rainfall values: "
                    "rainfall_15d must be greater than or equal "
                    "to rainfall_7d."
                )
            )

        if data.rainfall_30d < data.rainfall_15d:
            raise HTTPException(
                status_code=422,
                detail=(
                    "Invalid rainfall values: "
                    "rainfall_30d must be greater than or equal "
                    "to rainfall_15d."
                )
            )


        # ====================================================
        # CREATE INPUT DATAFRAME
        # ====================================================

        input_df = pd.DataFrame(
            [{
                "elevation": data.elevation,
                "slope": data.slope,
                "aspect": data.aspect,

                # IMPORTANT:
                # These are categorical features.
                # Convert explicitly to string to match
                # preprocessing during model training.
                "soil_id": str(data.soil_id),
                "landcover_class": str(data.landcover_class),

                "rainfall_1d": data.rainfall_1d,
                "rainfall_3d": data.rainfall_3d,
                "rainfall_7d": data.rainfall_7d,
                "rainfall_15d": data.rainfall_15d,
                "rainfall_30d": data.rainfall_30d
            }]
        )


        # ====================================================
        # APPLY PREPROCESSING
        # ====================================================

        processed_input = preprocessor.transform(
            input_df
        )


        # ====================================================
        # MODEL PREDICTION
        # ====================================================

        prediction = model.predict(
            processed_input
        )[0]


        # ====================================================
        # PREDICTION PROBABILITY
        # ====================================================

        if hasattr(model, "predict_proba"):

            probabilities = model.predict_proba(
                processed_input
            )[0]

            # Probability of landslide class (label = 1)
            if len(probabilities) >= 2:

                landslide_probability = float(
                    probabilities[1]
                )

            else:

                landslide_probability = float(
                    probabilities[0]
                )

        else:

            landslide_probability = float(
                prediction
            )


        # ====================================================
        # DETERMINE RISK LEVEL
        # ====================================================

        if landslide_probability >= 0.75:

            risk_level = "VERY_HIGH"

        elif landslide_probability >= 0.50:

            risk_level = "HIGH"

        elif landslide_probability >= 0.25:

            risk_level = "MODERATE"

        else:

            risk_level = "LOW"


        # ====================================================
        # PREDICTION LABEL
        # ====================================================

        prediction = int(prediction)

        if prediction == 1:

            prediction_label = "LANDSLIDE"

        else:

            prediction_label = "NO_LANDSLIDE"


        # ====================================================
        # RETURN RESPONSE
        # ====================================================

        return {

            "prediction": prediction,

            "prediction_label": prediction_label,

            "landslide_probability": round(
                landslide_probability,
                4
            ),

            "risk_level": risk_level,

            "input_features": {

                "elevation": data.elevation,

                "slope": data.slope,

                "aspect": data.aspect,

                "soil_id": data.soil_id,

                "landcover_class": data.landcover_class,

                "rainfall_1d": data.rainfall_1d,

                "rainfall_3d": data.rainfall_3d,

                "rainfall_7d": data.rainfall_7d,

                "rainfall_15d": data.rainfall_15d,

                "rainfall_30d": data.rainfall_30d
            }
        }


    except HTTPException:

        raise


    except Exception as e:

        raise HTTPException(
            status_code=500,
            detail=str(e)
        )


# ============================================================
# API INFORMATION ENDPOINT
# ============================================================

@app.get("/model-info")
def model_info():

    return {

        "project": "LandslideGuard",

        "model_type": type(model).__name__,

        "features": [

            "elevation",

            "slope",

            "aspect",

            "soil_id",

            "landcover_class",

            "rainfall_1d",

            "rainfall_3d",

            "rainfall_7d",

            "rainfall_15d",

            "rainfall_30d"
        ],

        "prediction_classes": {

            "0": "NO_LANDSLIDE",

            "1": "LANDSLIDE"
        }
    }