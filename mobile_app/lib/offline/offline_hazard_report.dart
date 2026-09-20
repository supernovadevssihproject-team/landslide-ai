import 'dart:convert';

enum ReportSyncStatus { draft, pendingSync, uploading, synced, processing, analyzed, syncFailed }
enum HazardType { landslide, rockfall, roadBlockage, slopeFailure, flood, other }

class OfflineHazardReport {
  final String reportId;
  final HazardType hazardType;
  final String? description, imagePath, state, zoneId, locationSource, lastError, backendResponse, classificationResult, lifecycleStatus, alertStatus, smsStatus;
  final double latitude, longitude;
  final DateTime capturedAt, createdAt, updatedAt;
  final String deviceId;
  final ReportSyncStatus status;
  final int retryCount;
  final double? confidence;

  const OfflineHazardReport({required this.reportId, required this.hazardType, required this.latitude, required this.longitude,
    required this.capturedAt, required this.deviceId, this.description, this.imagePath, this.state, this.zoneId,
    this.locationSource = 'GPS', this.status = ReportSyncStatus.pendingSync, this.retryCount = 0, this.lastError,
    this.backendResponse, this.classificationResult, this.lifecycleStatus, this.confidence, this.alertStatus, this.smsStatus,
    DateTime? createdAt, DateTime? updatedAt}) : createdAt = createdAt ?? capturedAt, updatedAt = updatedAt ?? capturedAt;

  OfflineHazardReport copyWith({ReportSyncStatus? status, int? retryCount, String? lastError, String? backendResponse,
    String? classificationResult, String? lifecycleStatus, double? confidence, String? alertStatus, String? smsStatus}) => OfflineHazardReport(
      reportId: reportId, hazardType: hazardType, latitude: latitude, longitude: longitude, capturedAt: capturedAt, deviceId: deviceId,
      description: description, imagePath: imagePath, state: state, zoneId: zoneId, locationSource: locationSource, status: status ?? this.status,
      retryCount: retryCount ?? this.retryCount, lastError: lastError, backendResponse: backendResponse ?? this.backendResponse,
      classificationResult: classificationResult ?? this.classificationResult, lifecycleStatus: lifecycleStatus ?? this.lifecycleStatus,
      confidence: confidence ?? this.confidence, alertStatus: alertStatus ?? this.alertStatus, smsStatus: smsStatus ?? this.smsStatus,
      createdAt: createdAt, updatedAt: DateTime.now().toUtc());

  Map<String, Object?> toMap() => {'report_id': reportId, 'hazard_type': hazardType.name, 'description': description, 'image_path': imagePath,
    'latitude': latitude, 'longitude': longitude, 'captured_at': capturedAt.toUtc().toIso8601String(), 'device_id': deviceId,
    'state': state, 'zone_id': zoneId, 'location_source': locationSource, 'status': status.name, 'retry_count': retryCount,
    'last_error': lastError, 'backend_response': backendResponse, 'classification_result': classificationResult, 'lifecycle_status': lifecycleStatus,
    'confidence': confidence, 'alert_status': alertStatus, 'sms_status': smsStatus, 'created_at': createdAt.toUtc().toIso8601String(),
    'updated_at': updatedAt.toUtc().toIso8601String()};

  factory OfflineHazardReport.fromMap(Map<String, Object?> m) => OfflineHazardReport(reportId: m['report_id']! as String,
    hazardType: HazardType.values.byName(m['hazard_type']! as String), latitude: (m['latitude'] as num).toDouble(), longitude: (m['longitude'] as num).toDouble(),
    capturedAt: DateTime.parse(m['captured_at']! as String), deviceId: m['device_id']! as String, description: m['description'] as String?, imagePath: m['image_path'] as String?,
    state: m['state'] as String?, zoneId: m['zone_id'] as String?, locationSource: m['location_source'] as String? ?? 'GPS',
    status: ReportSyncStatus.values.byName(m['status']! as String), retryCount: (m['retry_count'] as num?)?.toInt() ?? 0,
    lastError: m['last_error'] as String?, backendResponse: m['backend_response'] as String?, classificationResult: m['classification_result'] as String?,
    lifecycleStatus: m['lifecycle_status'] as String?, confidence: (m['confidence'] as num?)?.toDouble(), alertStatus: m['alert_status'] as String?, smsStatus: m['sms_status'] as String?,
    createdAt: DateTime.tryParse(m['created_at'] as String? ?? '') ?? DateTime.parse(m['captured_at']! as String),
    updatedAt: DateTime.tryParse(m['updated_at'] as String? ?? '') ?? DateTime.parse(m['captured_at']! as String));

  String toJson() => jsonEncode(toMap());
}
