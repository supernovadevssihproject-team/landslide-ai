import 'dart:convert';

import 'terraguard_database_models.dart';

enum ReportSyncStatus { draft, pendingSync, syncing, uploading, synced, processing, analyzed, syncFailed }
enum ClassificationStatus { notClassified, classificationPending, classified, classificationFailed, classificationUnavailable }
enum HazardType { landslide, rockfall, roadBlockage, slopeFailure, flood, other }

class OfflineHazardReport {
  final String reportId;
  final HazardType hazardType;
  final String? description;
  final String? imagePath;
  final double latitude;
  final double longitude;
  final DateTime capturedAt;
  final DateTime createdAt;
  final DateTime updatedAt;
  final String deviceId;
  final String? state;
  final String? zoneId;
  final String locationSource;
  final ReportSyncStatus status;
  final ClassificationStatus classificationStatus;
  final int retryCount;
  final String? lastError;
  final String? backendResponse;
  final String? classificationResult;
  final FieldClassificationResult? classificationResultData;
  final String? predictedClass;
  final double? classificationConfidence;
  final String? classificationSeverity;
  final String? classifierModelVersion;
  final DateTime? classifiedAt;
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
    this.state = 'sikkim',
    this.zoneId,
    this.locationSource = 'GPS',
    this.status = ReportSyncStatus.pendingSync,
    this.classificationStatus = ClassificationStatus.classificationPending,
    this.retryCount = 0,
    this.lastError,
    this.backendResponse,
    this.classificationResult,
    this.classificationResultData,
    this.predictedClass,
    this.classificationConfidence,
    this.classificationSeverity,
    this.classifierModelVersion,
    this.classifiedAt,
    this.lifecycleStatus,
    this.confidence,
    this.alertStatus,
    this.smsStatus,
    DateTime? createdAt,
    DateTime? updatedAt,
  })  : createdAt = createdAt ?? capturedAt,
        updatedAt = updatedAt ?? capturedAt;

  ReportSyncStatus get syncStatus => status;
  String? get syncStatusValue => status.name;

  OfflineHazardReport copyWith({
    ReportSyncStatus? status,
    ReportSyncStatus? syncStatus,
    ClassificationStatus? classificationStatus,
    int? retryCount,
    String? lastError,
    String? backendResponse,
    String? classificationResult,
    FieldClassificationResult? classificationResultData,
    String? predictedClass,
    double? classificationConfidence,
    String? classificationSeverity,
    String? classifierModelVersion,
    DateTime? classifiedAt,
    String? lifecycleStatus,
    double? confidence,
    String? alertStatus,
    String? smsStatus,
    String? state,
    String? zoneId,
    String? locationSource,
  }) => OfflineHazardReport(
        reportId: reportId,
        hazardType: hazardType,
        latitude: latitude,
        longitude: longitude,
        capturedAt: capturedAt,
        deviceId: deviceId,
        description: description,
        imagePath: imagePath,
        state: state ?? this.state,
        zoneId: zoneId ?? this.zoneId,
        locationSource: locationSource ?? this.locationSource,
        status: status ?? syncStatus ?? this.status,
        classificationStatus: classificationStatus ?? this.classificationStatus,
        retryCount: retryCount ?? this.retryCount,
        lastError: lastError ?? this.lastError,
        backendResponse: backendResponse ?? this.backendResponse,
        classificationResult: classificationResult ?? this.classificationResult,
        classificationResultData: classificationResultData ?? this.classificationResultData,
        predictedClass: predictedClass ?? this.predictedClass,
        classificationConfidence: classificationConfidence ?? this.classificationConfidence,
        classificationSeverity: classificationSeverity ?? this.classificationSeverity,
        classifierModelVersion: classifierModelVersion ?? this.classifierModelVersion,
        classifiedAt: classifiedAt ?? this.classifiedAt,
        lifecycleStatus: lifecycleStatus ?? this.lifecycleStatus,
        confidence: confidence ?? this.confidence,
        alertStatus: alertStatus ?? this.alertStatus,
        smsStatus: smsStatus ?? this.smsStatus,
        createdAt: createdAt,
        updatedAt: DateTime.now().toUtc(),
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
        'state': state,
        'zone_id': zoneId,
        'location_source': locationSource,
        'status': status.name,
        'classification_status': classificationStatus.name.toUpperCase(),
        'retry_count': retryCount,
        'last_error': lastError,
        'backend_response': backendResponse,
        'classification_result': classificationResult ?? classificationResultData?.encode(),
        'predicted_class': predictedClass ?? classificationResultData?.predictedClass,
        'classification_confidence': classificationConfidence ?? classificationResultData?.confidence,
        'classification_severity': classificationSeverity ?? classificationResultData?.severity,
        'classifier_model_version': classifierModelVersion ?? classificationResultData?.modelVersion,
        'classified_at': classifiedAt != null
            ? classifiedAt!.toUtc().toIso8601String()
            : (classificationResultData == null
                ? null
                : DateTime.tryParse(classificationResultData!.processedAt)?.toUtc().toIso8601String()),
        'lifecycle_status': lifecycleStatus,
        'confidence': confidence,
        'alert_status': alertStatus,
        'sms_status': smsStatus,
        'created_at': createdAt.toUtc().toIso8601String(),
        'updated_at': updatedAt.toUtc().toIso8601String(),
      };

  factory OfflineHazardReport.fromMap(Map<String, Object?> map) {
    final capturedAt = DateTime.parse(map['captured_at']! as String);
    final rawStatus = (map['status'] as String?) ?? (map['sync_status'] as String?);
    final rawClassificationStatus = (map['classification_status'] as String?) ?? 'CLASSIFICATION_PENDING';
    final classificationJson = map['classification_result'] as String?;
    final parsedClassification = classificationJson != null && classificationJson.isNotEmpty
        ? FieldClassificationResult.fromJson(jsonDecode(classificationJson) as Map<String, dynamic>)
        : null;
    return OfflineHazardReport(
      reportId: map['report_id']! as String,
      hazardType: HazardType.values.byName(map['hazard_type']! as String),
      description: map['description'] as String?,
      imagePath: map['image_path'] as String?,
      latitude: (map['latitude'] as num).toDouble(),
      longitude: (map['longitude'] as num).toDouble(),
      capturedAt: capturedAt,
      deviceId: map['device_id']! as String,
      state: map['state'] as String? ?? 'sikkim',
      zoneId: map['zone_id'] as String?,
      locationSource: map['location_source'] as String? ?? 'GPS',
      status: rawStatus == null ? ReportSyncStatus.pendingSync : ReportSyncStatus.values.byName(rawStatus.toLowerCase() == 'pending' ? 'pendingSync' : rawStatus),
      classificationStatus: _classificationStatusFromDb(rawClassificationStatus),
      retryCount: (map['retry_count'] as num?)?.toInt() ?? 0,
      lastError: map['last_error'] as String?,
      backendResponse: map['backend_response'] as String?,
      classificationResult: classificationJson,
      classificationResultData: parsedClassification,
      predictedClass: map['predicted_class'] as String? ?? parsedClassification?.predictedClass,
      classificationConfidence: (map['classification_confidence'] as num?)?.toDouble() ?? parsedClassification?.confidence,
      classificationSeverity: map['classification_severity'] as String? ?? parsedClassification?.severity,
      classifierModelVersion: map['classifier_model_version'] as String? ?? parsedClassification?.modelVersion,
      classifiedAt: DateTime.tryParse(map['classified_at'] as String? ?? '') ??
          (parsedClassification == null ? null : DateTime.tryParse(parsedClassification.processedAt)),
      lifecycleStatus: map['lifecycle_status'] as String?,
      confidence: (map['confidence'] as num?)?.toDouble(),
      alertStatus: map['alert_status'] as String?,
      smsStatus: map['sms_status'] as String?,
      createdAt: DateTime.tryParse(map['created_at'] as String? ?? '') ?? capturedAt,
      updatedAt: DateTime.tryParse(map['updated_at'] as String? ?? '') ?? capturedAt,
    );
  }

  static ClassificationStatus _classificationStatusFromDb(String? status) {
    switch ((status ?? 'CLASSIFICATION_PENDING').toUpperCase()) {
      case 'NOT_CLASSIFIED':
        return ClassificationStatus.notClassified;
      case 'CLASSIFICATION_PENDING':
        return ClassificationStatus.classificationPending;
      case 'CLASSIFIED':
        return ClassificationStatus.classified;
      case 'CLASSIFICATION_FAILED':
        return ClassificationStatus.classificationFailed;
      case 'CLASSIFICATION_UNAVAILABLE':
        return ClassificationStatus.classificationUnavailable;
      default:
        return ClassificationStatus.classificationPending;
    }
  }

  String toJson() => jsonEncode(toMap());
}
