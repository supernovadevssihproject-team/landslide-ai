from fastapi import APIRouter, Query
from pydantic import BaseModel
from typing import Optional

from backend.ml.lstm_predictor import lstm_engine

router = APIRouter(prefix="/api/predict", tags=["Predictive AI & Temporal LSTM"])

class PredictLstmRequest(BaseModel):
    extra_rainfall: float = 0.0
    current_rainfall: float = 85.0
    baseline_susceptibility: float = 0.88
    antecedent_rainfall_72h: float = 312.0

@router.get("/lstm")
def get_lstm_prediction(
    extra_rainfall: float = Query(0.0, description="Additional rainfall influx (mm/h)"),
    current_rainfall: float = Query(85.0, description="Current recorded rainfall (mm/h)"),
    baseline_susceptibility: float = Query(0.88, description="Baseline zone susceptibility")
):
    """
    Get dynamic Factor of Safety (FoS), Pore Water Pressure (PWP),
    lead time window, and 1-10 graded hazard score for sandbox slider.
    """
    return lstm_engine.predict(
        extra_rainfall_mm=extra_rainfall,
        current_rainfall_mm=current_rainfall,
        baseline_susceptibility=baseline_susceptibility
    )

@router.post("/lstm")
def post_lstm_prediction(req: PredictLstmRequest):
    return lstm_engine.predict(
        extra_rainfall_mm=req.extra_rainfall,
        current_rainfall_mm=req.current_rainfall,
        baseline_susceptibility=req.baseline_susceptibility,
        antecedent_rainfall_72h=req.antecedent_rainfall_72h
    )
