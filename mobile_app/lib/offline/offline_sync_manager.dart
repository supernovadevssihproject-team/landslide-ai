import 'dart:async';
import 'dart:convert';
import 'dart:io';

import 'package:connectivity_plus/connectivity_plus.dart';
import 'package:uuid/uuid.dart';

import 'offline_hazard_report.dart';
import 'offline_report_store.dart';

abstract class TerraGuardSyncApi {
  Future<String?> uploadReport(OfflineHazardReport report);
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
        );
        await store.update(uploading);
        try {
          final responseBody = await api.uploadReport(uploading);
          await store.update(_applyBackendResult(
            uploading.copyWith(
              status: ReportSyncStatus.processing,
              backendResponse: responseBody,
            ),
            responseBody,
          ));
        } catch (error) {
          final lostConnectivity = _isConnectivityError(error) || !(await _isOnline());
          await store.update(uploading.copyWith(
            status: lostConnectivity ? ReportSyncStatus.pendingSync : ReportSyncStatus.syncFailed,
            lifecycleStatus: lostConnectivity ? 'PENDING_SYNC' : 'SYNC_FAILED',
            retryCount: uploading.retryCount + 1,
            lastError: error.toString(),
          ));
          if (lostConnectivity) break;
        }
      }
    } finally {
      _running = false;
    }
  }

  Future<void> retryFailed() async {
    for (final report in await store.all()) {
      if (report.status == ReportSyncStatus.syncFailed) {
        await store.update(report.copyWith(status: ReportSyncStatus.pendingSync, lifecycleStatus: 'PENDING_SYNC'));
      }
    }
    await syncPending();
  }

  OfflineHazardReport _applyBackendResult(OfflineHazardReport report, String? body) {
    if (body == null || body.isEmpty) {
      return report.copyWith(status: ReportSyncStatus.synced, lifecycleStatus: 'UPLOADED');
    }
    try {
      final decoded = jsonDecode(body);
      if (decoded is! Map) return report.copyWith(status: ReportSyncStatus.synced, lifecycleStatus: 'UPLOADED');
      final response = Map<String, dynamic>.from(decoded);
      final lifecycle = (response['status'] as String? ?? response['verification_status'] as String?)?.toUpperCase();
      final classificationPayload = response['classification_result'];
      Map<String, dynamic>? classification;
      if (classificationPayload is String) {
        final parsed = jsonDecode(classificationPayload);
        if (parsed is Map) classification = Map<String, dynamic>.from(parsed);
      } else if (classificationPayload is Map) {
        classification = Map<String, dynamic>.from(classificationPayload);
      }
      final classificationName = response['classification'] as String? ?? classification?['predicted_class'] as String?;
      final confidence = (response['confidence'] as num?)?.toDouble() ?? (classification?['confidence'] as num?)?.toDouble();
      final severity = response['severity'] as String? ?? classification?['severity'] as String?;
      final modelVersion = response['classifier_model_version'] as String? ?? classification?['model_version'] as String?;
      final processedAt = DateTime.tryParse(classification?['processed_at']?.toString() ?? '');
      final analyzed = lifecycle == 'CONFIRMED' || lifecycle == 'REJECTED' || lifecycle == 'NEEDS_REVIEW';
      return report.copyWith(
        status: analyzed ? ReportSyncStatus.analyzed : ReportSyncStatus.synced,
        lifecycleStatus: lifecycle ?? 'PENDING_VERIFICATION',
        classificationResult: classificationName ?? report.classificationResult,
        predictedClass: classification?['predicted_class'] as String? ?? classificationName,
        classificationConfidence: confidence,
        classificationSeverity: severity,
        classifierModelVersion: modelVersion,
        classifiedAt: processedAt,
        confidence: confidence,
        alertStatus: response['alert_status'] as String?,
        smsStatus: response['sms_status'] as String?,
      );
    } catch (_) {
      return report.copyWith(status: ReportSyncStatus.synced, lifecycleStatus: 'UPLOADED');
    }
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
      lifecycleStatus: 'PENDING_SYNC',
    ));
    unawaited(syncPending());
    return id;
  }
}
