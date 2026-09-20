# TerraGuard Mobile Reporting Workflow

## Objective

Implement the end-to-end citizen reporting flow for TerraGuard:

Photo -> backend intake -> database persist -> AI/CV verification -> confirmation -> nearby user selection -> demo SMS alert

The SMS layer remains in demo mode because production DLT/provider credentials are not available.

## Refined workflow

### 1. Citizen photo submission

The user opens Report Landslide, captures or selects a photo, captures current GPS coordinates, optionally adds a short description, and submits.

Request payload:

```json
{
  "image": "<multipart image>",
  "latitude": 26.1445,
  "longitude": 91.7362,
  "description": "Fresh landslide near road"
}
```

Required mobile UX behavior:
- show upload progress
- disable duplicate submission while request is in flight
- validate camera/location permissions
- store local draft before sync
- retry queued uploads when connectivity returns

### 2. Backend storage

The FastAPI backend receives the report and:

1. Generates a unique report_id
2. Saves the original image in the report upload directory
3. Persists metadata in the database
4. Stores:
   - report_id
   - device_id / user identifier if available
   - image path reference
   - latitude
   - longitude
   - description
   - created_at
   - processing status

Initial state:

```text
PENDING_VERIFICATION
```

Original image retention is required for auditability.

### 3. AI/CV verification

The backend passes the image and metadata into the verification pipeline.

Expected result:

```json
{
  "classification": "landslide",
  "confidence": 0.91,
  "verified": true
}
```

Verification outcomes must be mapped to:
- CONFIRMED
- REJECTED
- NEEDS_REVIEW

Important rule: a low-confidence result must not auto-confirm a report.

The current repo already includes a prototype/simulated CV verifier in `backend/ml/cv_verifier.py`; it should be treated as a prototype until a real model is integrated.

### 4. Confirmation decision

If verification succeeds:

```text
PENDING_VERIFICATION -> CONFIRMED
```

Persist:
- classification
- confidence
- verification timestamp
- verifier/model name
- verification status

If verification fails:

```text
PENDING_VERIFICATION -> REJECTED
```

Rejected reports must not trigger public alerts.

### 5. Nearby user selection

For confirmed reports:

1. Read confirmed event coordinates
2. Query nearby registered users/devices with location information
3. Compute distance using the configured alert radius
4. Select users within that radius
5. Generate an alert with:
   - event location
   - alert type / severity
   - timestamp
   - safety instruction
   - emergency contact information if applicable

Example:

```text
Confirmed landslide detected near your location.
Avoid the affected road and move to a safe area.
Call 1077 for emergency assistance.
```

Radius must be configurable and not hard-coded in the mobile UI.

### 6. Demo-mode SMS dispatch

The confirmed alert flows into the existing SMS service:

```text
Alert Engine
  -> SMS Service
  -> SMS_DEMO_MODE = true
  -> No external SMS transmission
```

The service should return a truthful response like:

```json
{
  "status": "demo",
  "gateway": "SMSHorizon DEMO",
  "message": "Demo dispatch only. No real SMS was sent.",
  "recipients_count": 0
}
```

The UI must clearly display:

> Alert generated successfully. SMS dispatch is currently in Demo Mode. No real SMS was sent.

### 7. Final state flow

```text
PHOTO SUBMITTED
  -> DATABASE STORED
  -> AI/CV VERIFICATION
  -> CONFIRMED / REJECTED / NEEDS_REVIEW
       -> CONFIRMED -> NEARBY USERS SELECTED -> ALERT GENERATED -> SMS DEMO MODE -> AUDIT STORED
       -> REJECTED -> END
```

## Implementation checklist

### Mobile app (Flutter)
- [ ] Add Report Landslide screen with camera/gallery picker
- [ ] Request and validate camera/location permissions
- [ ] Capture latitude and longitude from GPS
- [ ] Allow optional description input
- [ ] Prevent duplicate submissions while a request is processing
- [ ] Show progress and success/error states
- [ ] Store reports locally as queued drafts before upload
- [ ] Retry queued reports after connectivity returns
- [ ] Display final confirmation banner for demo SMS mode
- [ ] Avoid claiming SMS was delivered

### Backend (FastAPI)
- [ ] Accept multipart image uploads with location metadata
- [ ] Generate unique report_id
- [ ] Save original image to disk and retain it for audit
- [ ] Persist report metadata and initial status
- [ ] Normalize CV verification result
- [ ] Apply confirmation logic based on confidence and verification result
- [ ] Reject reports without alert generation if not confirmed
- [ ] Select nearby recipients by radius
- [ ] Return structured response with status and next actions

### Database
- [ ] Add report table fields for report_id, device_id, image_url, latitude, longitude, description, created_at, verification_status, classification, confidence, alert_status, sms_status
- [ ] Add audit log table for status transitions
- [ ] Add user/device location table for proximity selection

### AI/CV verification
- [ ] Define classification schema with confidence + verified flag
- [ ] Support prototype fallback behavior when no real model exists
- [ ] Enforce threshold logic for CONFIRMED / NEEDS_REVIEW / REJECTED
- [ ] Store model name and verification timestamp

### Alert generation
- [ ] Add radius configuration to backend or config file
- [ ] Compute proximity to nearby devices/users
- [ ] Generate alert payload and instruction text
- [ ] Ensure rejected reports never generate alert payloads

### SMS service
- [ ] Keep SMS_DEMO_MODE enabled by default
- [ ] Return demo response object instead of pretending delivery occurred
- [ ] Ensure no real SMS is sent in demo mode
- [ ] Expose clear UI messaging for demo mode

### Observability
- [ ] Add visible status/error state for each step
- [ ] Log lifecycle transitions for each report
- [ ] Keep original image and verification outputs for audit

## Acceptance criteria
- Photo can be captured/uploaded from Flutter
- Report and image metadata reach the FastAPI backend
- Report is persisted in the database
- AI/CV verification result is stored
- Only confirmed reports trigger the alert workflow
- Nearby recipients are determined from location data
- SMS dispatch reaches the existing SMS service
- Demo mode never sends real SMS
- Each stage has a visible status/error state
- The workflow can be demonstrated without a DLT account or paid SMS provider

## Repository alignment

This workflow aligns with the current structure in the repo:
- Mobile app: `mobile_app/lib/offline/terraguard_http_sync_api.dart`
- Backend API: `backend/routers/reports.py`
- Database model: `backend/database/models.py`
- Storage: `backend/services/storage.py`
- Verification prototype: `backend/ml/cv_verifier.py`
- SMS demo behavior: `backend/services/sms_service.py`

The current implementation already covers much of the plumbing, but the missing operational pieces are the strict state model, explicit confirmation thresholds, nearby-user selection logic, and a formal API contract.

## Next recommended implementation order

1. Finalize the report state enum: `PENDING_VERIFICATION`, `CONFIRMED`, `REJECTED`, `NEEDS_REVIEW`, `ALERT_GENERATED`, `SMS_DEMO_MODE`
2. Add the backend verification service contract and normalization layer
3. Add the radius-based nearby-user logic and storage of selected recipients
4. Add the SMS demo response contract and UI message
5. Wire the Flutter app to show exact lifecycle states instead of a generic success message

