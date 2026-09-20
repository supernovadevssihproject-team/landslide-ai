import 'dart:convert';

enum ReportSyncStatus { draft, pendingSync, uploading, synced, processing, analyzed, syncFailed }
enum HazardType { landslide, rockfall, roadBlockage, slopeFailure, flood, other }

class OfflineHazardReport {
  final String reportId;
  final HazardType hazardType;
  final String? description;
  final String? imagePath;
  final double latitude;
  final double longitude;
  final DateTime capturedAt;
  final String deviceId;
  final ReportSyncStatus status;
  final int retryCount;
  final String? lastError;
  final String? backendResponse;
  final String? classificationResult;
  final String? lifecycleStatus;
  final double? confidence;
  final String? alertStatus;
  final String? smsStatus;

  const OfflineHazardReport({
    required this.reportId,
    required this.hazardType,
    required this.latitude,
    required this.longitude,
    required this.capturedAt,
    required this.deviceId,
    this.description,
    this.imagePath,
    this.status = ReportSyncStatus.pendingSync,
    this.retryCount = 0,
    this.lastError,
    this.backendResponse,
    this.classificationResult,
    this.lifecycleStatus,
    this.confidence,
    this.alertStatus,
    this.smsStatus,
  });

  OfflineHazardReport copyWith({
    ReportSyncStatus? status,
    int? retryCount,
    String? lastError,
    String? backendResponse,
    String? classificationResult,
    String? lifecycleStatus,
    double? confidence,
    String? alertStatus,
    String? smsStatus,
  }) => OfflineHazardReport(
        reportId: reportId,
        hazardType: hazardType,
        description: description,
        imagePath: imagePath,
        latitude: latitude,
        longitude: longitude,
        capturedAt: capturedAt,
        deviceId: deviceId,
        status: status ?? this.status,
        retryCount: retryCount ?? this.retryCount,
        lastError: lastError,
        backendResponse: backendResponse ?? this.backendResponse,
        classificationResult: classificationResult ?? this.classificationResult,
        lifecycleStatus: lifecycleStatus ?? this.lifecycleStatus,
        confidence: confidence ?? this.confidence,
        alertStatus: alertStatus ?? this.alertStatus,
        smsStatus: smsStatus ?? this.smsStatus,
      );

  Map<String, Object?> toMap() => {
        'report_id': reportId,
        'hazard_type': hazardType.name,
        'description': description,
        'image_path': imagePath,
        'latitude': latitude,
        'longitude': longitude,
        'captured_at': capturedAt.toUtc().toIso8601String(),
        'device_id': deviceId,
        'status': status.name,
        'retry_count': retryCount,
        'last_error': lastError,
        'backend_response': backendResponse,
        'classification_result': classificationResult,
        'lifecycle_status': lifecycleStatus,
        'confidence': confidence,
        'alert_status': alertStatus,
        'sms_status': smsStatus,
      };

  factory OfflineHazardReport.fromMap(Map<String, Object?> map) => OfflineHazardReport(
        reportId: map['report_id']! as String,
        hazardType: HazardType.values.byName(map['hazard_type']! as String),
        description: map['description'] as String?,
        imagePath: map['image_path'] as String?,
        latitude: (map['latitude'] as num).toDouble(),
        longitude: (map['longitude'] as num).toDouble(),
        capturedAt: DateTime.parse(map['captured_at']! as String),
        deviceId: map['device_id']! as String,
        status: ReportSyncStatus.values.byName(map['status']! as String),
        retryCount: (map['retry_count'] as num?)?.toInt() ?? 0,
        lastError: map['last_error'] as String?,
        backendResponse: map['backend_response'] as String?,
        classificationResult: map['classification_result'] as String?,
        lifecycleStatus: map['lifecycle_status'] as String?,
        confidence: (map['confidence'] as num?)?.toDouble(),
        alertStatus: map['alert_status'] as String?,
        smsStatus: map['sms_status'] as String?,
      );

  String toJson() => jsonEncode(toMap());
}
