import 'dart:async';

import 'package:connectivity_plus/connectivity_plus.dart';
import 'package:uuid/uuid.dart';

import 'offline_hazard_report.dart';
import 'offline_report_store.dart';

abstract class TerraGuardSyncApi {
  Future<void> uploadReport(OfflineHazardReport report);
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
        final uploading = report.copyWith(status: ReportSyncStatus.uploading, lastError: null);
        await store.update(uploading);
        try {
          await api.uploadReport(uploading);
          await store.update(uploading.copyWith(status: ReportSyncStatus.synced));
        } catch (error) {
          await store.update(uploading.copyWith(
            status: ReportSyncStatus.syncFailed,
            retryCount: uploading.retryCount + 1,
            lastError: error.toString(),
          ));
        }
      }
    } finally {
      _running = false;
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
    ));
    unawaited(syncPending());
    return id;
  }
}
