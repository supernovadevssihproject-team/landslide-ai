"""
LandslideGuard: AI-Powered Landslide Early Warning & Risk Monitoring System
SIH Problem Statement: 26001 (MDoNER & GSI)
Main FastAPI Application Entrypoint
"""

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
import os
import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from backend.config import ALLOWED_ORIGINS, UPLOAD_DIR
from backend.database.database import engine, Base
from backend.database.seeds import seed_database
from backend.routers import susceptibility, predict, reports, sensors, alerts, weather, ml_model

# Initialize database schema & seed initial state
Base.metadata.create_all(bind=engine)
try:
    seed_database()
except Exception as e:
    print(f"Warning during seed: {e}")

app = FastAPI(
    title="LandslideGuard Backend API",
    description="AI-Based Early Warning & Landslide Risk Monitoring Platform for North Eastern Region (SIH 26001)",
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc"
)

# Enable CORS for React frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Serve uploaded report photos
if os.path.exists(UPLOAD_DIR):
    app.mount("/uploads", StaticFiles(directory=str(UPLOAD_DIR)), name="uploads")

# Serve ML evaluation figures (Confusion Matrix, ROC Curve)
ML_FIGURES_DIR = Path(__file__).resolve().parent.parent / "ml" / "outputs" / "figures"
if ML_FIGURES_DIR.exists():
    app.mount("/ml-figures", StaticFiles(directory=str(ML_FIGURES_DIR)), name="ml-figures")

# Mount API Routers
app.include_router(susceptibility.router)
app.include_router(predict.router)
app.include_router(reports.router)
app.include_router(sensors.router)
app.include_router(alerts.router)
app.include_router(weather.router)
app.include_router(ml_model.router)

# Also expose direct /predict and /model-info aliases for seamless compatibility with landslide-ai API
@app.post("/predict")
def predict_alias(data: ml_model.LandslidePredictionInput):
    return ml_model.predict_landslide(data)

@app.get("/model-info")
def model_info_alias():
    return ml_model.get_model_info()

@app.get("/")
def root():
    return {
        "service": "LandslideGuard AI Platform",
        "problem_statement": "SIH-26001",
        "status": "Operational",
        "version": "1.0.0",
        "docs": "/docs",
        "endpoints": {
            "zones": "/api/zones",
            "predict_lstm": "/api/predict/lstm",
            "predict_ml": "/api/ml/predict",
            "ml_metrics": "/api/ml/metrics",
            "ml_comparison": "/api/ml/comparison",
            "ml_datasets": "/api/ml/datasets",
            "crowdsource_reports": "/api/reports",
            "sensors": "/api/sensors",
            "alerts": "/api/alerts/cap"
        }
    }

@app.get("/health")
@app.get("/api/health")
def health_check():
    return {
        "status": "healthy",
        "service": "LandslideGuard Backend",
        "ai_models": {
            "susceptibility_engine": "online",
            "temporal_lstm": "online",
            "yolov8_geotech_vision": "online"
        }
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("backend.main:app", host="127.0.0.1", port=8000, reload=True)
