import 'dart:async';
import 'dart:convert';
import 'dart:io';

import 'package:connectivity_plus/connectivity_plus.dart';
import 'package:uuid/uuid.dart';

import 'offline_hazard_report.dart';
import 'offline_report_store.dart';
import 'terraguard_database_models.dart';

abstract class TerraGuardSyncApi {
  Future<String?> uploadReport(OfflineHazardReport report);
  Future<Map<String, dynamic>> classifyReport(OfflineHazardReport report);
}

class OfflineSyncManager {
  final OfflineReportStore store;
  final TerraGuardSyncApi api;
  StreamSubscription<List<ConnectivityResult>>? _connectivitySubscription;
  bool _running = false;

  OfflineSyncManager({required this.store, required this.api});

  Future<void> start() async {
    await syncPending();
    _connectivitySubscription = Connectivity().onConnectivityChanged.listen((_) => syncPending());
  }

  Future<void> stop() async => _connectivitySubscription?.cancel();

  Future<bool> _isOnline() async {
    final results = await Connectivity().checkConnectivity();
    return results.any((result) => result != ConnectivityResult.none);
  }

  Future<void> syncPending() async {
    if (_running || !await _isOnline()) return;
    _running = true;
    try {
      for (final report in await store.pending()) {
        if (report.status == ReportSyncStatus.syncFailed && report.retryCount >= 3) continue;

        final uploading = report.copyWith(
          status: ReportSyncStatus.uploading,
          lifecycleStatus: 'UPLOADING',
          lastError: null,
          classificationStatus: ClassificationStatus.classificationPending,
        );
        await store.update(uploading);

        try {
          final responseBody = await api.uploadReport(uploading);
          final uploaded = _applyBackendResult(
            uploading.copyWith(
              status: ReportSyncStatus.processing,
              backendResponse: responseBody,
              classificationStatus: ClassificationStatus.classificationPending,
            ),
            responseBody,
          );
          await store.update(uploaded);
          await _classifyIfEligible(uploaded);
        } catch (error) {
          final lostConnectivity = _isConnectivityError(error) || !(await _isOnline());
          await store.update(uploading.copyWith(
            status: lostConnectivity ? ReportSyncStatus.pendingSync : ReportSyncStatus.syncFailed,
            lifecycleStatus: lostConnectivity ? 'PENDING_SYNC' : 'SYNC_FAILED',
            retryCount: uploading.retryCount + 1,
            lastError: error.toString(),
            classificationStatus: ClassificationStatus.classificationPending,
          ));
          if (lostConnectivity) break;
        }
      }
    } finally {
      _running = false;
    }
  }

  Future<void> _classifyIfEligible(OfflineHazardReport report) async {
    if (report.status != ReportSyncStatus.synced && report.status != ReportSyncStatus.analyzed) {
      return;
    }
    if (report.classificationStatus == ClassificationStatus.classified) return;
    if (!await _isOnline()) {
      await store.update(report.copyWith(
        classificationStatus: ClassificationStatus.classificationPending,
        lifecycleStatus: 'PENDING_AI_CLASSIFICATION',
      ));
      return;
    }

    try {
      final payload = await api.classifyReport(report);
      final validated = _applyClassificationResult(report, payload);
      await store.update(validated);
    } on StateError {
      await store.update(report.copyWith(
        status: ReportSyncStatus.synced,
        classificationStatus: ClassificationStatus.classificationUnavailable,
        lifecycleStatus: 'AI_UNAVAILABLE',
      ));
    } on FormatException {
      await store.update(report.copyWith(
        status: ReportSyncStatus.synced,
        classificationStatus: ClassificationStatus.classificationFailed,
        lifecycleStatus: 'AI_FAILED',
      ));
    } catch (_) {
      await store.update(report.copyWith(
        status: ReportSyncStatus.synced,
        classificationStatus: ClassificationStatus.classificationFailed,
        lifecycleStatus: 'AI_FAILED',
      ));
    }
  }

  Future<void> retryFailed() async {
    for (final report in await store.all()) {
      if (report.status == ReportSyncStatus.syncFailed) {
        await store.update(report.copyWith(status: ReportSyncStatus.pendingSync, lifecycleStatus: 'PENDING_SYNC'));
      }
      if (report.classificationStatus == ClassificationStatus.classificationFailed ||
          report.classificationStatus == ClassificationStatus.classificationUnavailable) {
        await store.update(report.copyWith(
          classificationStatus: ClassificationStatus.classificationPending,
          lifecycleStatus: 'PENDING_AI_CLASSIFICATION',
        ));
      }
    }
    await syncPending();
  }

  OfflineHazardReport _applyBackendResult(OfflineHazardReport report, String? body) {
    if (body == null || body.isEmpty) {
      return report.copyWith(
        status: ReportSyncStatus.synced,
        lifecycleStatus: 'UPLOADED',
        classificationStatus: ClassificationStatus.classificationPending,
      );
    }
    try {
      final decoded = jsonDecode(body);
      if (decoded is! Map) return report.copyWith(status: ReportSyncStatus.synced, lifecycleStatus: 'UPLOADED', classificationStatus: ClassificationStatus.classificationPending);
      final response = Map<String, dynamic>.from(decoded);
      final lifecycle = (response['status'] as String? ?? response['verification_status'] as String?)?.toUpperCase();
      final analyzed = lifecycle == 'CONFIRMED' || lifecycle == 'REJECTED' || lifecycle == 'NEEDS_REVIEW';
      return report.copyWith(
        status: analyzed ? ReportSyncStatus.analyzed : ReportSyncStatus.synced,
        lifecycleStatus: lifecycle ?? 'UPLOADED',
        classificationStatus: ClassificationStatus.classificationPending,
      );
    } catch (_) {
      return report.copyWith(status: ReportSyncStatus.synced, lifecycleStatus: 'UPLOADED', classificationStatus: ClassificationStatus.classificationPending);
    }
  }

  OfflineHazardReport _applyClassificationResult(OfflineHazardReport report, Map<String, dynamic> payload) {
    final reportId = payload['report_id']?.toString();
    final predictedClass = payload['predicted_class']?.toString();
    final confidence = payload['confidence'];
    final severity = payload['severity']?.toString();
    final modelVersion = payload['model_version']?.toString();
    final processedAt = payload['processed_at']?.toString();
    final validClassification = const ['landslide', 'roadBlockage', 'flood', 'rainfall', 'other']
        .contains(predictedClass);
    if (reportId == null || predictedClass == null || confidence is! num || severity == null || modelVersion == null || processedAt == null || !validClassification) {
      throw const FormatException('Invalid classification payload');
    }
    final result = FieldClassificationResult(
      reportId: reportId,
      predictedClass: predictedClass,
      confidence: confidence.toDouble(),
      severity: severity,
      modelVersion: modelVersion,
      processedAt: processedAt,
    );
    return report.copyWith(
      status: ReportSyncStatus.synced,
      classificationStatus: ClassificationStatus.classified,
      classificationResult: result.encode(),
      classificationResultData: result,
      predictedClass: result.predictedClass,
      classificationConfidence: result.confidence,
      classificationSeverity: result.severity,
      classifierModelVersion: result.modelVersion,
      classifiedAt: DateTime.tryParse(result.processedAt),
      lifecycleStatus: 'AI_CLASSIFIED',
    );
  }

  bool _isConnectivityError(Object error) {
    final text = error.toString().toLowerCase();
    return error is SocketException ||
        text.contains('offline') ||
        text.contains('network') ||
        text.contains('timed out') ||
        text.contains('connection refused') ||
        text.contains('host is unreachable');
  }

  Future<String> enqueue({
    required HazardType hazardType,
    required double latitude,
    required double longitude,
    required String deviceId,
    String? description,
    String? imagePath,
    String? state,
    String? zoneId,
  }) async {
    final id = const Uuid().v4();
    await store.save(OfflineHazardReport(
      reportId: id,
      hazardType: hazardType,
      latitude: latitude,
      longitude: longitude,
      capturedAt: DateTime.now().toUtc(),
      deviceId: deviceId,
      description: description,
      imagePath: imagePath,
      state: state,
      zoneId: zoneId,
      status: ReportSyncStatus.pendingSync,
      classificationStatus: ClassificationStatus.classificationPending,
      lifecycleStatus: 'PENDING_SYNC',
    ));
    unawaited(syncPending());
    return id;
  }
}
