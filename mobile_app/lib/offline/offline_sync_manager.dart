import 'dart:async';
import 'dart:convert';

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

  Future<void> syncPending() async {
    if (_running) return;
    _running = true;
    try {
      for (final report in await store.pending()) {
        final uploading = report.copyWith(
          status: ReportSyncStatus.uploading,
          lifecycleStatus: 'UPLOADING',
          lastError: null,
        );
        await store.update(uploading);
        try {
          final responseBody = await api.uploadReport(uploading);
          await store.update(_applyBackendResult(
            uploading.copyWith(status: ReportSyncStatus.processing, backendResponse: responseBody),
            responseBody,
          ));
        } catch (error) {
          await store.update(uploading.copyWith(
            status: ReportSyncStatus.syncFailed,
            lifecycleStatus: 'SYNC_FAILED',
            retryCount: uploading.retryCount + 1,
            lastError: error.toString(),
          ));
        }
      }
    } finally {
      _running = false;
    }
  }

  OfflineHazardReport _applyBackendResult(OfflineHazardReport report, String? body) {
    if (body == null || body.isEmpty) return report.copyWith(status: ReportSyncStatus.synced);
    try {
      final decoded = jsonDecode(body) as Map<String, dynamic>;
      final status = decoded['status'] as String? ?? decoded['verification_status'] as String?;
      final lifecycle = status?.toUpperCase();
      final classification = decoded['classification'] as String?;
      final confidence = (decoded['confidence'] as num?)?.toDouble();
      final alertStatus = decoded['alert_status'] as String?;
      final smsStatus = decoded['sms_status'] as String?;
      final analyzed = lifecycle == 'CONFIRMED' || lifecycle == 'REJECTED' || lifecycle == 'NEEDS_REVIEW';
      return report.copyWith(
        status: analyzed ? ReportSyncStatus.analyzed : ReportSyncStatus.synced,
        lifecycleStatus: lifecycle ?? 'PENDING_VERIFICATION',
        classificationResult: classification,
        confidence: confidence,
        alertStatus: alertStatus,
        smsStatus: smsStatus,
      );
    } catch (_) {
      return report.copyWith(status: ReportSyncStatus.synced, lifecycleStatus: 'UPLOADED');
    }
  }

  Future<String> enqueue({
    required HazardType hazardType,
    required double latitude,
    required double longitude,
    required String deviceId,
    String? description,
    String? imagePath,
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
      lifecycleStatus: 'PENDING_SYNC',
    ));
    unawaited(syncPending());
    return id;
  }
}
