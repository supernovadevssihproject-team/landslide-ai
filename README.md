# MDoNER Landslide Early Warning & Risk Command System (LEWS NER)

[![Government of India](https://img.shields.io/badge/Government%20of%20India-MDoNER%20%7C%20GSI-00363e?style=flat-square)](https://mdoner.gov.in/)
[![Disaster Management Act 2005](https://img.shields.io/badge/Statutory%20Framework-DMA%202005%20Sec%2030-93000a?style=flat-square)](https://ndma.gov.in/)
[![Protocol](https://img.shields.io/badge/Alerting%20Standard-CAP--CMSP%20v1.2-44d8f1?style=flat-square)](#)
[![Telemetry](https://img.shields.io/badge/Satellite%20Mesh-GSAT--7A%20Active-008040?style=flat-square)](#)

A mission-critical, institutional Landslide Early Warning & Risk Command System designed specifically for the North Eastern Region (NER) of India, covering **Sikkim, Arunachal Pradesh, Assam, Meghalaya, Manipur, Mizoram, Nagaland, and Tripura**.

Developed under the collaborative operational aegis of the **Ministry of Development of North Eastern Region (MDoNER)**, **Geological Survey of India (GSI)**, and **State Disaster Management Authorities (SDMAs)**, LEWS NER synthesizes high-resolution satellite remote sensing, in-situ subsurface geotechnical telemetry, LSTM neural deformation forecasting, and crowdsourced computer vision verification into an actionable tactical dispatch command suite.

---

## 🏔️ Core Operational Modules

### 1. Spatial GIS Command & Subsurface IoT Mesh
* **Topographic Vector Mesh**: Dynamic 2D planar and 3D oblique isometric perspectives of critical Himalayan arterial corridors (e.g., NH-10 Teesta River Basin, Km 38.4 Dikchu-Mangan).
* **Contour Isolines & Radar Precipitation**: Real-time Doppler precipitation reflectivity layers (dBZ) with isoline gradient overlays and live rainfall flux counters.
* **Subsurface Sensor Streams**: Live sensor telemetry covering:
  * In-Place Inclinometers (IPI) tracking shear plane displacement ($\Delta mm/hr$).
  * Vibrating-Wire Piezometers monitoring pore water pressure ($kPa$).
  * Time-Domain Reflectometry (TDR) coaxial cable shear detection.
* **Geotechnical Hazard Inspector**: Drawer detailing geological stratum, joint set orientations, drone reconnaissance deployment dispatch, and one-click GeoJSON hazard dataset export.

### 2. Temporal LSTM Neural Predictor
* **Deformation Inference Model**: Deep LSTM neural network computing probability of slope failure and continuous **Factor of Safety (FoS)** dynamics ($FoS \le 1.05$ Critical Failure Threshold).
* **Dynamic Lead-Time Countdown**: Real-time calculating window until predicted slope failure initiation based on subsurface strain rates.
* **Cloudburst Influx Sandbox**: Interactive simulation slider allowing duty officers to model extreme rainfall spikes (up to $160\text{ mm/hr}$) and inspect instant Factor of Safety degradation and pore pressure surges.
* **Dual-Axis Hydrological Telemetry Charts**: Infiltration vs. Pore Water Pressure with threshold alerts and in-situ borehole camera monitors.

### 3. Crowdsource CV & Vernacular Verification
* **YOLOv8 Geotechnical Computer Vision**: Automated detection and classification of tension fissures, scarp crests, mud debris slurry, and highway structural damage with confidence metrics.
* **EXIF GPS Tamper-Lock Verification**: Ensures citizen and patrol uploads cannot be spoofed, cross-referencing nearby IoT borehole sensors within a $1.2\text{ km}$ spatial radius.
* **Bhashini Multi-Lingual Voice AI**: Integrated audio player featuring dynamic SVG waveform rendering and automated vernacular neural transcription (Nepali, Hindi, Assamese, Khasi, Mizo) to English.
* **Triage & Escalation Workflow**: Fast-track triage queue allowing Duty Officers to authenticate observations and elevate reports directly into Common Alerting Protocol (CAP) broadcasts.

### 4. Emergency Broadcast & Evacuation Dispatch (CAP-CMSP)
* **Targeted Cell Broadcast (CMSP)**: Sub-second geo-fenced alert transmission reaching cellular handsets across targeted base transceiver stations (BTS) without network congestion.
* **7 Regional Languages (Bhashini Engine)**: Out-of-the-box pre-composed and editable emergency warnings in **English, Nepali, Hindi, Assamese, Bengali, Khasi, and Mizo** with GSM 160-character segment validation.
* **Safe Evacuation Corridor Management (Route E-3)**: Elevation gradient profiles ($1,480\text{m} \rightarrow 350\text{m}$ Singtam Valley), estimated transit times, and active SDRF checkpost monitors.
* **Designated Relief Shelters & Tactical Mobilization**: Live capacity and ration tracking for emergency shelters, alongside real-time status of NDRF 2nd Bn, SDRF Quick Response, and Border Roads Organisation (BRO) heavy equipment.
* **Cryptographic SDMA Dispatch Audit**: Tamper-evident ledger logging all operational commands under Section 30 of the Disaster Management Act 2005.

### 5. Acoustic Web Audio Emergency Siren
* Custom synthesizer leveraging the browser's native **Web Audio API** (`OscillatorNode`, `GainNode`) creating a dual-frequency European/Civil Defence wailing siren for rapid acoustic alerting in control rooms.

---

## 🛠️ Technology Stack

| Layer | Technology |
|---|---|
| **Frontend Framework** | React 19 (TypeScript, Hooks, Functional Architecture) |
| **Styling & Theming** | Tailwind CSS v4 (Institutional Tactical Dark Scheme `#051424`) |
| **Icons & Vectors** | Lucide React |
| **Animation Engine** | Motion (`motion/react`) |
| **Audio Engine** | Web Audio API (Multi-oscillator dual-tone wailing siren) |
| **GIS & Visualizations** | Custom SVG Vector Cartography, Isometric Slope Projections, Dual-axis charts |
| **Build & Dev Tooling** | Vite 6, TypeScript 5.8 |

---

## 🚀 Quick Start & Local Setup

### Prerequisites
* **Node.js**: Version 18.x or 20.x+
* **npm**: Version 9.x or later

### Installation

1. **Clone or navigate to the project directory:**
   ```bash
   git clone <repository-url>
   cd lews-ner-command
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Start the development server:**
   ```bash
   npm run dev
   ```
   The application will boot at `http://localhost:3000` (or `0.0.0.0:3000`).

4. **Verify TypeScript compilation & linting:**
   ```bash
   npm run lint
   ```

5. **Build for production:**
   ```bash
   npm run build
   ```
   Static production assets will be generated in `dist/`.

---

## 🗺️ Project Structure

```text
├── index.html                   # HTML entry point with official metadata & Google Fonts
├── metadata.json                # AI Studio application metadata & platform permissions
├── package.json                 # Project dependencies and script declarations
├── vite.config.ts               # Vite configuration with Tailwind CSS plugin
├── src/
│   ├── App.tsx                  # Root layout, state management, modal handling & footer
│   ├── main.tsx                 # React DOM mount point
│   ├── index.css                # Global styles with Tailwind CSS imports & animations
│   ├── types.ts                 # TypeScript interfaces for GIS, Sensors, LSTM, Reports & CAP
│   ├── components/
│   │   ├── Header.tsx           # Institutional header, state selector, IST clock & siren toggle
│   │   ├── Navigation.tsx       # Primary 4-module command bar with live badge counts
│   │   ├── SpatialGisCommand.tsx# Topographic GIS mesh, 2D/3D mode, sensors, & hazard drawer
│   │   ├── TemporalLstmPredictor.tsx # LSTM deformation model, cloudburst sandbox & charts
│   │   ├── CrowdsourceCvVerification.tsx # YOLOv8 analysis, Bhashini audio & triage queue
│   │   ├── BroadcastAndDispatch.tsx # CAP 7-language broadcast, Route E-3, shelters & audit
│   │   └── FieldReportModal.tsx # Citizen report submission modal with EXIF & voice note
│   ├── data/
│   │   └── mockData.ts          # Operational datasets: sensors, hazard zones, shelters, units
│   └── utils/
│       └── audioSiren.ts        # Web Audio API emergency warning siren player
```

---

## 📜 Statutory Standards & Regulatory Compliance

* **Disaster Management Act 2005 (Sec 30)**: Mandates District Disaster Management Authorities (DDMAs) to maintain real-time monitoring and early warning systems.
* **GSI National Landslide Susceptibility Mapping (NLSM)**: Cartographic hazard scoring conforms to Geological Survey of India macro-scale zoning standards.
* **ITU-T X.1303 / OASIS CAP v1.2**: Standardized data structure for digital multi-hazard emergency alerts.
* **Bhashini National Public Digital Platform**: Multilingual speech-to-text and translation pipeline for vernacular crisis communications.

---

## 📞 Emergency Control Room Helplines

* **National Disaster Management Emergency Helpline**: `1070`
* **State Disaster Management Authority (SDMA) Emergency Helpline**: `1077`
* **Border Roads Organisation (Project Swastik, Sikkim)**: `03592-202244`
* **MDoNER Disaster Coordination Cell**: `mdoner-disaster-response@gov.in`
