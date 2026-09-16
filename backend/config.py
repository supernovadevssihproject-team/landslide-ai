import os
from pathlib import Path
from dotenv import load_dotenv

load_dotenv()

BASE_DIR = Path(__file__).resolve().parent
DATABASE_FILE = BASE_DIR / "database" / "landslide_guard.db"
DATABASE_URL = os.getenv("DATABASE_URL", f"sqlite:///{DATABASE_FILE}")
UPLOAD_DIR = BASE_DIR / "uploads"
UPLOAD_DIR.mkdir(parents=True, exist_ok=True)

# Risk Thresholds
CRITICAL_HAZARD_THRESHOLD = 8.0
HIGH_HAZARD_THRESHOLD = 6.0
MODERATE_HAZARD_THRESHOLD = 4.0
FOS_FAILURE_THRESHOLD = 1.0

# CORS Origins
DEFAULT_ALLOWED_ORIGINS = [
    "http://localhost:3000",
    "http://127.0.0.1:3000",
    "http://localhost:5173",
    "http://127.0.0.1:5173",
]
_configured_origins = os.getenv("BACKEND_CORS_ORIGINS", "").strip()
ALLOWED_ORIGINS = (
    [origin.strip() for origin in _configured_origins.split(",") if origin.strip()]
    if _configured_origins
    else DEFAULT_ALLOWED_ORIGINS
)

# Gemini Chatbot Integration
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY", "")

