# TerraGuard mobile app

This Flutter companion app is migrated into the LandslideGuard repository.

## Backend integration

The app submits reports to the existing FastAPI contract:

`POST /api/reports/submit`

The adapter sends JSON fields accepted by `backend/routers/reports.py`: `location`, `subDivision`, `state`, `description`, and `coordinates`.

## Run

```bash
cd mobile_app
flutter pub get
flutter run --dart-define=TERRAGUARD_API_BASE_URL=http://10.0.2.2:8001
```

Use `http://localhost:8001` for an iOS simulator or desktop/web development. Android emulators reach the host machine through `10.0.2.2`.

The mobile app uses the same FastAPI application as the web app, running as a separate local Uvicorn instance on port `8001`. The web instance runs on port `8000`; these are separate processes, not separate backend implementations.

Reports are persisted in SQLite before upload and retried after connectivity changes.
