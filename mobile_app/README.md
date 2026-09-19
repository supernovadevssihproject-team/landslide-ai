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
flutter run --dart-define=TERRAGUARD_API_BASE_URL=http://10.0.2.2:8000
```

Use `http://localhost:8000` for an iOS simulator or desktop/web development. Android emulators reach the host machine through `10.0.2.2`.

Reports are persisted in SQLite before upload and retried after connectivity changes.
