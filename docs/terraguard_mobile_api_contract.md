# TerraGuard Mobile Report API Contract

## Base URL

- Local backend: `http://localhost:8001`
- Android emulator: `http://10.0.2.2:8001`
- Production/dev host: `http://<backend-host>:8000`

## Common response envelope

All responses should follow a simple structured format:

```json
{
  "status": "success",
  "message": "string",
  "data": {}
}
```

Where appropriate, `status` may be `success`, `error`, `pending`, or `demo`.

## 1. Submit citizen report

### Endpoint

`POST /api/reports/submit`

### Content-Type

`multipart/form-data`

### Request fields

| Field | Type | Required | Description |
|---|---:|---:|---|
| image | file | yes | Original image captured or selected by the user |
| latitude | number | yes | GPS latitude |
| longitude | number | yes | GPS longitude |
| description | string | no | Short explanatory note |
| device_id | string | no | Device identifier if known |
| report_id | string | no | Server-generated if omitted |

### Example request

```bash
curl -X POST http://localhost:8001/api/reports/submit \
  -F "image=@/path/to/landslide_photo.jpg" \
  -F "latitude=26.1445" \
  -F "longitude=91.7362" \
  -F "description=Fresh landslide near road" \
  -F "device_id=device-42"
```

### Success response

```json
{
  "status": "success",
  "message": "Report submitted successfully",
  "data": {
    "report_id": "rep-9f2c8d3a",
    "status": "PENDING_VERIFICATION",
    "image_url": "/api/reports/rep-9f2c8d3a/image/landslide_photo.jpg",
    "verification_status": "pending",
    "alert_status": "not_triggered",
    "sms_status": "not_started",
    "created_at": "2026-09-20T10:42:11Z"
  }
}
```

### Error response

```json
{
  "status": "error",
  "message": "Image upload failed or GPS coordinates missing",
  "errors": [
    "latitude is required",
    "longitude is required",
    "image file is missing"
  ]
}
```

## 2. Get report details

### Endpoint

`GET /api/reports/{report_id}`

### Response

```json
{
  "status": "success",
  "message": "Report retrieved successfully",
  "data": {
    "report_id": "rep-9f2c8d3a",
    "device_id": "device-42",
    "latitude": 26.1445,
    "longitude": 91.7362,
    "description": "Fresh landslide near road",
    "status": "PENDING_VERIFICATION",
    "image_url": "/api/reports/rep-9f2c8d3a/image/landslide_photo.jpg",
    "verification": {
      "classification": "landslide",
      "confidence": 0.91,
      "verified": true,
      "model": "prototype_cv_verifier",
      "verified_at": "2026-09-20T10:42:11Z"
    },
    "alert": {
      "triggered": false,
      "radius_km": 5,
      "selected_recipients_count": 0
    },
    "sms": {
      "status": "demo",
      "gateway": "SMSHorizon DEMO",
      "message": "Demo dispatch only. No real SMS was sent.",
      "recipients_count": 0
    }
  }
}
```

## 3. Internal verification call

### Endpoint

`POST /api/reports/{report_id}/verify`

### Purpose

Internal backend call or worker invocation to record AI/CV verdict.

### Request body

```json
{
  "classification": "landslide",
  "confidence": 0.91,
  "verified": true,
  "model": "prototype_cv_verifier"
}
```

### Response

```json
{
  "status": "success",
  "message": "Verification result recorded",
  "data": {
    "report_id": "rep-9f2c8d3a",
    "updated_status": "CONFIRMED"
  }
}
```

## 4. Nearby alert selection

### Endpoint

`POST /api/reports/{report_id}/alert`

### Request body

```json
{
  "radius_km": 5
}
```

### Response

```json
{
  "status": "success",
  "message": "Nearby users selected and alert generated",
  "data": {
    "report_id": "rep-9f2c8d3a",
    "status": "ALERT_GENERATED",
    "selected_recipients_count": 12,
    "sms_status": "demo"
  }
}
```

## 5. Demo SMS dispatch

### Endpoint

`POST /api/sms/demo-dispatch`

### Request body

```json
{
  "headline": "Confirmed landslide detected near your location",
  "instruction": "Avoid the affected road and move to a safe area.",
  "recipients": ["+919876543210"]
}
```

### Response

```json
{
  "status": "demo",
  "gateway": "SMSHorizon DEMO",
  "message": "Demo dispatch only. No real SMS was sent.",
  "recipients_count": 0
}
```

## 6. Enumerations

### Report lifecycle statuses

```text
PENDING_VERIFICATION
CONFIRMED
REJECTED
NEEDS_REVIEW
ALERT_GENERATED
AUDIT_COMPLETE
```

### Verification result values

```text
landslide
not_landslide
uncertain
```

### SMS service statuses

```text
demo
sent
provider_not_configured
provider_unavailable
dispatch_failed
```

## Business rules

- A report with `REJECTED` status never triggers alerts.
- A report with `NEEDS_REVIEW` status never triggers alerts.
- Only `CONFIRMED` reports trigger nearby-user selection and alert generation.
- Demo SMS must never be reported as delivered.
- Low-confidence classifications are not automatically confirmed.
- Original images must be retained for audit.

## Implementation notes

This contract matches the repo’s current architecture:
- Flutter mobile staging via `mobile_app/lib/offline/terraguard_http_sync_api.dart`
- FastAPI intake in `backend/routers/reports.py`
- Prototype verification in `backend/ml/cv_verifier.py`
- Demo SMS behavior in `backend/services/sms_service.py`

The main operational gap is not the upload plumbing; it is enforcing a strict state machine and a normalized API contract for verification, alerting, and SMS demo behavior.

