# LandslideGuard

## AI-Based Early Warning & Landslide Risk Monitoring System

**SIH Problem Statement: 26001**

LandslideGuard is an AI-powered landslide risk monitoring and early warning platform designed for the **North Eastern Region of India**.

The system combines terrain characteristics, rainfall and weather conditions, soil and environmental information, and citizen field reports to generate a **dynamic, location-specific landslide risk score**.

> **Predict → Monitor → Visualize → Verify → Alert**

---

## 🎯 Problem Statement

Landslide risk in the North Eastern Region is highly localized and can change rapidly with weather conditions. Static risk assessments alone are not sufficient for continuously monitoring these changing conditions.

LandslideGuard aims to provide a proactive platform that:

- Predicts areas with high landslide susceptibility.
- Monitors changing rainfall and environmental conditions.
- Generates dynamic landslide hazard scores.
- Visualizes risk using interactive GIS maps.
- Accepts citizen and field reports.
- Uses AI to verify submitted photographs.
- Provides localized alerts to authorities and residents.

---

## 💡 Core Solution

LandslideGuard consists of three complementary AI layers.

### 1. Landslide Susceptibility

Generates a baseline susceptibility map using relatively stable geographic features.

**Inputs:**
- Slope
- Elevation
- Soil type
- Vegetation
- Historical landslide occurrences

**Proposed Models:**
- Random Forest
- XGBoost

---

### 2. Trigger / Risk Prediction

Combines baseline susceptibility with changing environmental conditions to generate a dynamic **Landslide Hazard Score from 1–10**.

**Inputs:**
- Current rainfall
- Forecasted rainfall
- Soil moisture where available
- Historical rainfall patterns
- Baseline susceptibility

**Proposed Model:**
- LSTM

---

### 3. AI Report Verification

Analyzes citizen-submitted photographs and information to determine whether a reported event is consistent with an actual landslide.

**Inputs:**
- Photograph
- GPS location
- Timestamp
- Description

**Proposed Models:**
- YOLOv8
- ResNet

---

## 🗺️ Landslide Risk Map

The primary interface for disaster-management authorities is an interactive **Landslide Risk Map**.

The map provides:

- Regional risk visualization
- District-level risk information
- Colour-coded hazard levels
- Current hazard score
- Recent rainfall
- Susceptibility rating
- Active field reports
- GIS-based risk heatmaps

Selecting a location or district provides detailed information about its current risk condition.

---

## ⚠️ Risk Classification

LandslideGuard uses a graded risk score instead of a simple landslide/no-landslide classification.

| Score | Risk Level | Typical Response |
|-------|------------|------------------|
| 1–3 | Low | Routine monitoring |
| 4–5 | Moderate | Increased observation |
| 6–7 | High | Field verification advised |
| 8–10 | Critical | Automatic localized alert |

When the risk score reaches the critical threshold, the alert engine can trigger localized notifications.

---

## 📱 Citizen & Field Reporting

Citizens and field officers can report suspected landslide events through the mobile application.

### Reporting Flow

```text
Open App
   ↓
Capture / Upload Photo
   ↓
Attach GPS Location
   ↓
Describe Situation
   ↓
Submit Report
   ↓
AI Verification
   ↓
Authority Dashboard
