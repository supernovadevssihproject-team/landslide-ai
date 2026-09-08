import json
from backend.database.database import SessionLocal, engine, Base
from backend.database.models import (
    HazardZoneModel,
    SensorNodeModel,
    CrowdsourceReportModel,
    TacticalUnitModel,
    ReliefShelterModel,
    AuditLogModel,
)

INITIAL_HAZARD_ZONES = [
    {
        "id": "zone-sk-01",
        "name": "Teesta Basin (NH-10 Corridor)",
        "subDivision": "Mangan Sub-Division",
        "corridor": "Km 34.2 to 41.8",
        "state": "sikkim",
        "slopeGradient": "48.6°",
        "soilPoreSaturation": "92.4%",
        "displacementRate": "14.2 mm/hr",
        "pwpPressure": "284 kPa",
        "riskStatus": "CRITICAL RED",
        "rfConfidence": "98.4%",
        "lstmEvac": "03h 45m",
        "highwaySegment": "NH-10 (Km 34.2 – 41.8)",
        "bridgesExposed": "Teesta-V Bailey Br. (2.4 km downstream)",
        "populationRunout": "1,420 Residents (Lower Singtam)",
        "coords": "27.5312° N, 88.5134° E",
        "elevation": "1,480 m",
        "top": "36%",
        "left": "38%",
        "isCritical": True,
        "hazardScore": 9.2,
    },
    {
        "id": "zone-as-02",
        "name": "Dima Hasao Hill Tracts",
        "subDivision": "Haflong Sector",
        "corridor": "Lumding–Badarpur Railway Line",
        "state": "assam",
        "slopeGradient": "39.2°",
        "soilPoreSaturation": "78.1%",
        "displacementRate": "6.4 mm/hr",
        "pwpPressure": "196 kPa",
        "riskStatus": "ADVISORY ORANGE",
        "rfConfidence": "86.2%",
        "lstmEvac": "08h 15m",
        "highwaySegment": "NH-27 Mahur Bypass",
        "bridgesExposed": "Jatinga Viaduct #4",
        "populationRunout": "680 Residents",
        "coords": "25.1764° N, 93.0248° E",
        "elevation": "960 m",
        "top": "52%",
        "left": "62%",
        "isCritical": False,
        "hazardScore": 6.8,
    },
    {
        "id": "zone-ml-03",
        "name": "Sohra Rim Pass (Cherrapunji)",
        "subDivision": "East Khasi Hills",
        "corridor": "Shella–Sohra Highway",
        "state": "meghalaya",
        "slopeGradient": "54.1°",
        "soilPoreSaturation": "86.9%",
        "displacementRate": "9.8 mm/hr",
        "pwpPressure": "240 kPa",
        "riskStatus": "CRITICAL RED",
        "rfConfidence": "94.1%",
        "lstmEvac": "04h 50m",
        "highwaySegment": "SH-5 Sohra Link",
        "bridgesExposed": "Wahkaba Gorge Span",
        "populationRunout": "940 Residents",
        "coords": "25.2986° N, 91.7322° E",
        "elevation": "1,310 m",
        "top": "58%",
        "left": "44%",
        "isCritical": True,
        "hazardScore": 8.7,
    },
    {
        "id": "zone-mn-04",
        "name": "Tupul Railway Yard Sub-Catchment",
        "subDivision": "Noney District",
        "corridor": "Jiribam–Imphal Rail Alignment",
        "state": "manipur",
        "slopeGradient": "44.5°",
        "soilPoreSaturation": "88.2%",
        "displacementRate": "11.6 mm/hr",
        "pwpPressure": "262 kPa",
        "riskStatus": "CRITICAL RED",
        "rfConfidence": "96.7%",
        "lstmEvac": "04h 10m",
        "highwaySegment": "NH-37 Imphal–Silchar",
        "bridgesExposed": "Ijei River Pier #2",
        "populationRunout": "1,120 Residents & Camp",
        "coords": "24.8167° N, 93.6833° E",
        "elevation": "680 m",
        "top": "68%",
        "left": "74%",
        "isCritical": True,
        "hazardScore": 9.0,
    },
    {
        "id": "zone-ar-05",
        "name": "Bhalukpong–Bomdila Ghat Road",
        "subDivision": "West Kameng",
        "corridor": "Balipara–Charduar–Tawang Road",
        "state": "arunachal",
        "slopeGradient": "42.0°",
        "soilPoreSaturation": "62.4%",
        "displacementRate": "2.8 mm/hr",
        "pwpPressure": "135 kPa",
        "riskStatus": "NOMINAL GREEN",
        "rfConfidence": "91.0%",
        "lstmEvac": "24h+ Stable",
        "highwaySegment": "NH-13 Trans-Arunachal Hwy",
        "bridgesExposed": "Kameng River Suspension",
        "populationRunout": "320 Residents",
        "coords": "27.0125° N, 92.6458° E",
        "elevation": "1,890 m",
        "top": "24%",
        "left": "52%",
        "isCritical": False,
        "hazardScore": 2.8,
    },
]

INITIAL_SENSOR_NODES = [
    {
        "id": "SN-SK-01",
        "name": "Borehole Piezometer Array #1",
        "type": "piezometer",
        "typeLabel": "Vibrating Wire Piezometer",
        "location": "Mangan-Dikchu Ridge (Ch 36.4)",
        "state": "sikkim",
        "coordinates": "27.5312° N, 88.5134° E",
        "battery": "94%",
        "uplink": "GSAT-7A Mesh",
        "lastSync": "4 sec ago",
        "currentValue": "284 kPa",
        "currentValueSub": "+18 kPa/hr surge",
        "warningThreshold": "260 kPa",
        "thresholdPercentage": 109,
        "status": "critical",
        "statusLabel": "RUPTURE PRESSURE CRITICAL",
        "sparkline": [180, 195, 215, 230, 252, 268, 284],
        "depth": "14.2m Sub-surface",
    },
    {
        "id": "SN-SK-02",
        "name": "In-Place Inclinometer String #4",
        "type": "inclinometer",
        "typeLabel": "MEMS Inclinometer (Bi-Axial)",
        "location": "Singtam Cut-Slope Benchmark",
        "state": "sikkim",
        "coordinates": "27.2341° N, 88.4988° E",
        "battery": "88%",
        "uplink": "Optical Fibre SDMA",
        "lastSync": "12 sec ago",
        "currentValue": "14.2 mm/hr",
        "currentValueSub": "Shear Strain Rate",
        "warningThreshold": "8.0 mm/hr",
        "thresholdPercentage": 177,
        "status": "critical",
        "statusLabel": "ACCELERATING CREEP DETECTED",
        "sparkline": [2.1, 3.4, 4.8, 6.2, 8.9, 11.5, 14.2],
        "depth": "8.5m Slip Interface",
    },
    {
        "id": "SN-MZ-03",
        "name": "Acoustic Emission Waveguide #2",
        "type": "acoustic",
        "typeLabel": "Sub-surface Micro-seismic AE",
        "location": "Champhai Fault Shear Plane",
        "state": "mizoram",
        "coordinates": "23.4756° N, 93.3281° E",
        "battery": "76%",
        "uplink": "LoRaWAN Gateway MZ-04",
        "lastSync": "30 sec ago",
        "currentValue": "4,120 hits/min",
        "currentValueSub": "Ringdown Count",
        "warningThreshold": "2,500 hits/min",
        "thresholdPercentage": 164,
        "status": "critical",
        "statusLabel": "INTERNAL MICRO-FRACTURING SPIKE",
        "sparkline": [600, 850, 1200, 1800, 2400, 3200, 4120],
        "depth": "18.0m Bedrock Joint",
    },
    {
        "id": "SN-ML-04",
        "name": "Optical Tipping Bucket + AWS",
        "type": "aws",
        "typeLabel": "Automated Weather Station (IMD)",
        "location": "Cherrapunji Plateau Ridge AWS-1",
        "state": "meghalaya",
        "coordinates": "25.2986° N, 91.7322° E",
        "battery": "99%",
        "uplink": "IMD Doppler Sync",
        "lastSync": "1 min ago",
        "currentValue": "84 mm/hr",
        "currentValueSub": "Antecedent 72h: 312 mm",
        "warningThreshold": "50 mm/hr",
        "thresholdPercentage": 168,
        "status": "torrential",
        "statusLabel": "TORRENTIAL MONSOON BURST",
        "sparkline": [12, 24, 38, 55, 68, 76, 84],
        "depth": "Surface Met Mast (10m)",
    },
]

INITIAL_REPORTS = [
    {
        "id": "rep-sk-101",
        "code": "SK-FLD-2024-098",
        "location": "NH-10 Km 38.4 (Lower Singtam Slide)",
        "subDivision": "Mangan Sub-Division",
        "state": "sikkim",
        "timeAgo": "14 min ago",
        "reportedTime": "14:28 IST",
        "urgency": "CRITICAL",
        "verifiedBy": "AI-YOLOv8 Geotech Vision (Edge Verified)",
        "imageUrl": "https://lh3.googleusercontent.com/aida-public/AB6AXuCfgmZOUw0RJNRDeRn_ey0LAUAFSBdB0JYQGzipb_eWiyc-h1uSGualH0defPe8gbGXbegaDiukL0iel6AWkyGhqwL0BSjmQdsUol2ad9E0y8npvwgJykhtYJwOmGbJ3NOgIsm8kZitQiHwkRuDW1Dkq9c_HVHDUmAq9_UahiuhMl-e4ReMnP62Yc1QcBB0l7Jl10W0VogIPMNZAoUuMA4O38M_RyvqjrRcTeCXK5vXVdvEyXLEy06Xfg",
        "imageAlt": "Active rotational slope failure breaching NH-10 road surface with mud slurry runout",
        "cvRisk": "98.4%",
        "cvLabel": "Active Rotational Shear Scarp with Tension Fissure",
        "cvModel": "YOLOv8-Geotech-NER v4.2",
        "summary": "Crown shear scarp ~45m width detected. Tension fissures propagating across NH-10 carriageway. Active mud runout.",
        "description": "Massive toe blowout observed at retaining crib wall below NH-10 Km 38.4. Boulder fall actively blocking single carriageway lane. Road surface has subsided approximately 400mm.",
        "coordinates": "27.2388° N, 88.5012° E",
        "elevation": "1,420 m",
        "slope": "48.5°",
        "precipitation": "84 mm/h (IMD Extreme Influx)",
        "exifStatus": "GPS & Cryptographic Hash Verified (GSAT Uplink)",
        "audioLanguage": "Nepali (Eastern Sub-dialect)",
        "audioDuration": "0:24",
        "vernacularText": "बाटो मुनिबाट माटो बग्न थालेको छ। ठूला ढुङ्गाहरू तल खसिरहेका छन् र बाटो भाँसिएको छ। तुरून्तै मद्दत पठाउनुहोस्!",
        "englishTranslation": "Soil has started giving way from below the road. Huge boulders are actively tumbling down and the pavement has sunken. Send immediate assistance!",
        "sensorCorroboration": {
            "sensorId": "SN-SK-01",
            "rate": "+18 kPa/hr PWP Spike",
            "thresholdMessage": "Breached 280 kPa critical shear failure threshold",
        },
        "boundingBoxes": [
            {
                "label": "Crown Shear Scarp (45m)",
                "confidence": "98.4%",
                "top": "12%",
                "left": "18%",
                "width": "64%",
                "height": "32%",
                "color": "error",
            },
            {
                "label": "Roadway Carriageway Tension Crack",
                "confidence": "94.2%",
                "top": "54%",
                "left": "28%",
                "width": "50%",
                "height": "22%",
                "color": "tertiary",
            },
            {
                "label": "Toe Slurry Runout Toe Breach",
                "confidence": "91.0%",
                "top": "68%",
                "left": "45%",
                "width": "35%",
                "height": "24%",
                "color": "secondary",
            },
        ],
        "status": "active",
    },
]

INITIAL_TACTICAL_UNITS = [
    {
        "id": "tu-ndrf-01",
        "name": "12th Bn NDRF Task Force (Bravo Co.)",
        "status": "EN ROUTE",
        "statusLabel": "Transit on NH-10 (Km 28.2)",
        "eta": "24 min",
        "personnel": 45,
        "description": "Heavy urban search & rescue, hydraulic cutters, in-situ life detector radar, and drone reconnaissance squadron.",
        "destination": "Teesta Basin Lower Singtam Slide (Km 38.4)",
        "satcomStatus": "GSAT-7A BGAN Online",
        "equipment": ["Life Detectors x4", "Hydraulic Cutters x6", "Inflatable Rafts x2", "UAV Fleet x3"],
        "progressPercent": 65,
        "type": "ndrf",
    },
    {
        "id": "tu-bro-02",
        "name": "BRO Project Swastik Task Force",
        "status": "ACTIVE",
        "statusLabel": "Site Staging at Mile-32 Depot",
        "eta": "12 min",
        "personnel": 32,
        "description": "Border Roads Organisation earthmoving division deploying heavy excavators, rock breakers, and pre-fab Bailey bridging gear.",
        "destination": "NH-10 Km 38.4 Breach Site",
        "satcomStatus": "VHF High-Band Active",
        "equipment": ["Komatsu Excavators x2", "JCB Heavy Loader x3", "Bailey Span Parts 30m"],
        "progressPercent": 85,
        "type": "bro",
    },
]

INITIAL_RELIEF_SHELTERS = [
    {
        "id": "sh-01",
        "name": "Singtam Govt Senior Secondary School Camp",
        "location": "Singtam Upper Ridge Ground",
        "state": "sikkim",
        "capacityCurrent": 340,
        "capacityMax": 600,
        "occupancyPercent": 56,
        "status": "AVAILABLE",
        "rationsDays": "14 Days Dry Stock",
        "gensetStatus": "45 kVA Online",
        "waterSupply": "Potable Gravity Feed Active",
        "medicalActive": True,
    },
    {
        "id": "sh-02",
        "name": "Rangpo Community Disaster Relief Pavilion",
        "location": "Rangpo Stadium Complex",
        "state": "sikkim",
        "capacityCurrent": 720,
        "capacityMax": 800,
        "occupancyPercent": 90,
        "status": "CRITICAL",
        "rationsDays": "6 Days Stock",
        "gensetStatus": "Diesel Low (4 hrs)",
        "waterSupply": "Boil Water Advisory",
        "medicalActive": True,
    },
]

def seed_database():
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()
    try:
        # Seed Hazard Zones
        if db.query(HazardZoneModel).count() == 0:
            for item in INITIAL_HAZARD_ZONES:
                db.add(HazardZoneModel(**item))

        # Seed Sensors
        if db.query(SensorNodeModel).count() == 0:
            for item in INITIAL_SENSOR_NODES:
                db.add(SensorNodeModel(**item))

        # Seed Reports
        if db.query(CrowdsourceReportModel).count() == 0:
            for item in INITIAL_REPORTS:
                db.add(CrowdsourceReportModel(**item))

        # Seed Units
        if db.query(TacticalUnitModel).count() == 0:
            for item in INITIAL_TACTICAL_UNITS:
                db.add(TacticalUnitModel(**item))

        # Seed Shelters
        if db.query(ReliefShelterModel).count() == 0:
            for item in INITIAL_RELIEF_SHELTERS:
                db.add(ReliefShelterModel(**item))

        db.commit()
        print("Database seeded successfully.")
    except Exception as e:
        db.rollback()
        print(f"Error seeding database: {e}")
    finally:
        db.close()

if __name__ == "__main__":
    seed_database()
