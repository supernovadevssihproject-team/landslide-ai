-- ==========================================================
-- LandslideGuard (SIH 26001): PostgreSQL / PostGIS Schema
-- ==========================================================

-- Enable PostGIS extension if available
CREATE EXTENSION IF NOT EXISTS postgis;

-- 1. Hazard Zones (Susceptibility & Terrain)
CREATE TABLE IF NOT EXISTS hazard_zones (
    id VARCHAR(64) PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    subDivision VARCHAR(255) NOT NULL,
    corridor VARCHAR(255) NOT NULL,
    state VARCHAR(64) NOT NULL,
    slopeGradient VARCHAR(64) NOT NULL,
    soilPoreSaturation VARCHAR(64) NOT NULL,
    displacementRate VARCHAR(64) NOT NULL,
    pwpPressure VARCHAR(64) NOT NULL,
    riskStatus VARCHAR(64) NOT NULL,
    rfConfidence VARCHAR(64) NOT NULL,
    lstmEvac VARCHAR(64) NOT NULL,
    highwaySegment VARCHAR(255) NOT NULL,
    bridgesExposed VARCHAR(255) NOT NULL,
    populationRunout VARCHAR(255) NOT NULL,
    coords VARCHAR(128) NOT NULL,
    elevation VARCHAR(64) NOT NULL,
    top VARCHAR(32) NOT NULL,
    left VARCHAR(32) NOT NULL,
    isCritical BOOLEAN DEFAULT FALSE,
    hazardScore DOUBLE PRECISION DEFAULT 5.0
);

-- 2. Sensor Nodes (IoT Piezometers, Inclinometers, Acoustic, AWS)
CREATE TABLE IF NOT EXISTS sensor_nodes (
    id VARCHAR(64) PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    type VARCHAR(64) NOT NULL,
    typeLabel VARCHAR(128) NOT NULL,
    location VARCHAR(255) NOT NULL,
    state VARCHAR(64) NOT NULL,
    coordinates VARCHAR(128) NOT NULL,
    battery VARCHAR(32) NOT NULL,
    uplink VARCHAR(64) NOT NULL,
    lastSync VARCHAR(64) NOT NULL,
    currentValue VARCHAR(64) NOT NULL,
    currentValueSub VARCHAR(64),
    warningThreshold VARCHAR(64) NOT NULL,
    thresholdPercentage DOUBLE PRECISION NOT NULL,
    status VARCHAR(64) NOT NULL,
    statusLabel VARCHAR(128) NOT NULL,
    sparkline JSONB,
    depth VARCHAR(64)
);

-- 3. Crowdsource Citizen & Field Reports
CREATE TABLE IF NOT EXISTS crowdsource_reports (
    id VARCHAR(64) PRIMARY KEY,
    code VARCHAR(64) UNIQUE NOT NULL,
    location VARCHAR(255) NOT NULL,
    subDivision VARCHAR(255) NOT NULL,
    state VARCHAR(64) NOT NULL,
    timeAgo VARCHAR(64) DEFAULT 'Just now',
    reportedTime VARCHAR(128) NOT NULL,
    urgency VARCHAR(32) NOT NULL,
    verifiedBy VARCHAR(255) DEFAULT 'AI-YOLOv8 Geotech Vision',
    imageUrl TEXT NOT NULL,
    imageAlt VARCHAR(255),
    cvRisk VARCHAR(64) NOT NULL,
    cvLabel VARCHAR(128) NOT NULL,
    cvModel VARCHAR(128) DEFAULT 'YOLOv8-Geotech-NER v4.2',
    summary TEXT NOT NULL,
    description TEXT NOT NULL,
    coordinates VARCHAR(128) NOT NULL,
    elevation VARCHAR(64) DEFAULT '1,420 m',
    slope VARCHAR(64) DEFAULT '48.5°',
    precipitation VARCHAR(128) DEFAULT '84 mm/h',
    exifStatus VARCHAR(128) DEFAULT 'GPS Verified',
    audioLanguage VARCHAR(128) DEFAULT 'Nepali',
    audioDuration VARCHAR(32) DEFAULT '0:24',
    vernacularText TEXT,
    englishTranslation TEXT,
    sensorCorroboration JSONB,
    boundingBoxes JSONB,
    status VARCHAR(32) DEFAULT 'active'
);

-- 4. Tactical Disaster Response Units
CREATE TABLE IF NOT EXISTS tactical_units (
    id VARCHAR(64) PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    status VARCHAR(64) NOT NULL,
    statusLabel VARCHAR(128) NOT NULL,
    eta VARCHAR(64),
    personnel INTEGER DEFAULT 0,
    description TEXT NOT NULL,
    destination VARCHAR(255) NOT NULL,
    satcomStatus VARCHAR(64) NOT NULL,
    equipment JSONB NOT NULL,
    progressPercent INTEGER DEFAULT 0,
    type VARCHAR(32) NOT NULL
);

-- 5. Relief Shelters
CREATE TABLE IF NOT EXISTS relief_shelters (
    id VARCHAR(64) PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    location VARCHAR(255) NOT NULL,
    state VARCHAR(64) NOT NULL,
    capacityCurrent INTEGER DEFAULT 0,
    capacityMax INTEGER DEFAULT 500,
    occupancyPercent INTEGER DEFAULT 0,
    status VARCHAR(64) NOT NULL,
    rationsDays VARCHAR(128) DEFAULT '14 Days Dry Stock',
    gensetStatus VARCHAR(64) DEFAULT 'Online',
    waterSupply VARCHAR(128) DEFAULT 'Active',
    medicalActive BOOLEAN DEFAULT TRUE
);

-- 6. CAP Alerts
CREATE TABLE IF NOT EXISTS cap_alerts (
    id VARCHAR(64) PRIMARY KEY,
    identifier VARCHAR(128) UNIQUE NOT NULL,
    sender VARCHAR(255) NOT NULL,
    sent TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    status VARCHAR(32) DEFAULT 'Actual',
    msgType VARCHAR(32) DEFAULT 'Alert',
    scope VARCHAR(32) DEFAULT 'Public',
    category VARCHAR(64) DEFAULT 'Geo',
    event VARCHAR(128) DEFAULT 'Landslide Hazard Warning',
    urgency VARCHAR(32) DEFAULT 'Immediate',
    severity VARCHAR(32) DEFAULT 'Extreme',
    certainty VARCHAR(32) DEFAULT 'Observed',
    headline TEXT NOT NULL,
    description TEXT NOT NULL,
    instruction TEXT NOT NULL,
    areaDesc TEXT NOT NULL,
    circle VARCHAR(128),
    rawXml TEXT
);
