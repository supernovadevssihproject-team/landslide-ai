from sqlalchemy import Column, String, Float, Integer, Boolean, DateTime, Text, JSON
from datetime import datetime
from backend.database.database import Base

class HazardZoneModel(Base):
    __tablename__ = "hazard_zones"

    id = Column(String, primary_key=True, index=True)
    name = Column(String, nullable=False)
    subDivision = Column(String, nullable=False)
    corridor = Column(String, nullable=False)
    state = Column(String, nullable=False, index=True)
    slopeGradient = Column(String, nullable=False)
    soilPoreSaturation = Column(String, nullable=False)
    displacementRate = Column(String, nullable=False)
    pwpPressure = Column(String, nullable=False)
    riskStatus = Column(String, nullable=False) # 'CRITICAL RED' | 'ADVISORY ORANGE' | 'NOMINAL GREEN'
    rfConfidence = Column(String, nullable=False)
    lstmEvac = Column(String, nullable=False)
    highwaySegment = Column(String, nullable=False)
    bridgesExposed = Column(String, nullable=False)
    populationRunout = Column(String, nullable=False)
    coords = Column(String, nullable=False)
    elevation = Column(String, nullable=False)
    top = Column(String, nullable=False)
    left = Column(String, nullable=False)
    isCritical = Column(Boolean, default=False)
    hazardScore = Column(Float, default=5.0)


class SensorNodeModel(Base):
    __tablename__ = "sensor_nodes"

    id = Column(String, primary_key=True, index=True)
    name = Column(String, nullable=False)
    type = Column(String, nullable=False) # 'piezometer' | 'inclinometer' | 'acoustic' | 'aws'
    typeLabel = Column(String, nullable=False)
    location = Column(String, nullable=False)
    state = Column(String, nullable=False, index=True)
    coordinates = Column(String, nullable=False)
    battery = Column(String, nullable=False)
    uplink = Column(String, nullable=False)
    lastSync = Column(String, nullable=False)
    currentValue = Column(String, nullable=False)
    currentValueSub = Column(String, nullable=True)
    warningThreshold = Column(String, nullable=False)
    thresholdPercentage = Column(Float, nullable=False)
    status = Column(String, nullable=False) # 'critical' | 'advisory' | 'nominal' | 'torrential'
    statusLabel = Column(String, nullable=False)
    sparkline = Column(JSON, nullable=True)
    depth = Column(String, nullable=True)


class CrowdsourceReportModel(Base):
    __tablename__ = "crowdsource_reports"

    id = Column(String, primary_key=True, index=True)
    code = Column(String, unique=True, index=True)
    location = Column(String, nullable=False)
    subDivision = Column(String, nullable=False)
    state = Column(String, nullable=False, index=True)
    timeAgo = Column(String, default="Just now")
    reportedTime = Column(String, nullable=False)
    urgency = Column(String, nullable=False) # 'CRITICAL' | 'URGENT' | 'AMBER' | 'ROUTINE'
    verifiedBy = Column(String, default="AI-YOLOv8 Geotech Vision (Edge Verified)")
    imageUrl = Column(String, nullable=False)
    imageAlt = Column(String, default="Field report photo")
    cvRisk = Column(String, nullable=False)
    cvLabel = Column(String, nullable=False)
    cvModel = Column(String, default="YOLOv8-Geotech-NER v4.2")
    summary = Column(Text, nullable=False)
    description = Column(Text, nullable=False)
    coordinates = Column(String, nullable=False)
    elevation = Column(String, default="1,420 m")
    slope = Column(String, default="48.5°")
    precipitation = Column(String, default="84 mm/h (IMD Extreme Influx)")
    exifStatus = Column(String, default="GPS Verified")
    audioLanguage = Column(String, default="Nepali (Eastern Sub-dialect)")
    audioDuration = Column(String, default="0:24")
    vernacularText = Column(Text, default="")
    englishTranslation = Column(Text, default="")
    sensorCorroboration = Column(JSON, nullable=True)
    boundingBoxes = Column(JSON, nullable=True)
    status = Column(String, default="active") # active | dismissed | escalated


class TacticalUnitModel(Base):
    __tablename__ = "tactical_units"

    id = Column(String, primary_key=True, index=True)
    name = Column(String, nullable=False)
    status = Column(String, nullable=False)
    statusLabel = Column(String, nullable=False)
    eta = Column(String, nullable=True)
    personnel = Column(Integer, default=0)
    description = Column(Text, nullable=False)
    destination = Column(String, nullable=False)
    satcomStatus = Column(String, nullable=False)
    equipment = Column(JSON, nullable=False)
    progressPercent = Column(Integer, default=0)
    type = Column(String, nullable=False) # 'ndrf' | 'sdrf' | 'bro'


class ReliefShelterModel(Base):
    __tablename__ = "relief_shelters"

    id = Column(String, primary_key=True, index=True)
    name = Column(String, nullable=False)
    location = Column(String, nullable=False)
    state = Column(String, nullable=False, index=True)
    capacityCurrent = Column(Integer, default=0)
    capacityMax = Column(Integer, default=500)
    occupancyPercent = Column(Integer, default=0)
    status = Column(String, nullable=False)
    rationsDays = Column(String, default="14 Days Dry Stock")
    gensetStatus = Column(String, default="Online")
    waterSupply = Column(String, default="Potable Gravity Feed Active")
    medicalActive = Column(Boolean, default=True)


class AuditLogModel(Base):
    __tablename__ = "audit_logs"

    id = Column(String, primary_key=True, index=True)
    code = Column(String, nullable=False)
    title = Column(String, nullable=False)
    timestamp = Column(String, nullable=False)
    message = Column(Text, nullable=False)
    authority = Column(String, nullable=False)
    type = Column(String, nullable=False) # 'order' | 'broadcast' | 'corridor' | 'siren'
    highlight = Column(Boolean, default=False)
    created_at = Column(DateTime, default=datetime.utcnow)


class CapAlertModel(Base):
    __tablename__ = "cap_alerts"

    id = Column(String, primary_key=True, index=True)
    identifier = Column(String, unique=True, index=True)
    sender = Column(String, default="lews.gsi.gov.in/ner-disaster-command")
    sent = Column(DateTime, default=datetime.utcnow)
    status = Column(String, default="Actual") # Actual | Exercise | System | Test
    msgType = Column(String, default="Alert") # Alert | Update | Cancel
    scope = Column(String, default="Public")
    category = Column(String, default="Geo")
    event = Column(String, default="Landslide Hazard Warning")
    urgency = Column(String, default="Immediate")
    severity = Column(String, default="Extreme")
    certainty = Column(String, default="Observed")
    headline = Column(String, nullable=False)
    description = Column(Text, nullable=False)
    instruction = Column(Text, nullable=False)
    areaDesc = Column(String, nullable=False)
    circle = Column(String, nullable=True)
    rawXml = Column(Text, nullable=True)
