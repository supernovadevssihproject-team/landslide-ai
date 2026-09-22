import 'package:flutter/services.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:sqflite_common_ffi/sqflite_ffi.dart';
import 'package:terraguard_mobile/offline/offline_hazard_report.dart';
import 'package:terraguard_mobile/offline/offline_report_store.dart';
import 'package:terraguard_mobile/offline/offline_sync_manager.dart';
import 'package:terraguard_mobile/offline/terraguard_database_models.dart';

class MockSyncApi implements TerraGuardSyncApi {
  bool shouldFailUpload = false;
  bool shouldFailClassify = false;

  @override
  Future<String?> uploadReport(OfflineHazardReport report) async {
    if (shouldFailUpload) {
      throw Exception('Network upload error');
    }
    return '{"status": "UPLOADED"}';
  }

  @override
  Future<Map<String, dynamic>> classifyReport(OfflineHazardReport report) async {
    if (shouldFailClassify) {
      throw Exception('Classification service unavailable');
    }
    return {
      'report_id': report.reportId,
      'predicted_class': 'landslide',
      'confidence': 0.88,
      'severity': 'HIGH',
      'model_version': 'v2',
      'processed_at': DateTime.now().toUtc().toIso8601String(),
    };
  }
}

void main() {
  setUpAll(() {
    TestWidgetsFlutterBinding.ensureInitialized();
    TestDefaultBinaryMessengerBinding.instance.defaultBinaryMessenger.setMockMethodCallHandler(
      const MethodChannel('dev.fluttercommunity.plus/connectivity'),
      (methodCall) async => ['wifi'],
    );
    sqfliteFfiInit();
    databaseFactory = databaseFactoryFfi;
  });

  group('Hazard Type Preservation Tests', () {
    test('TEST 1 — User selects rainfall, AI predicts landslide', () async {
      final store = OfflineReportStore(dbPath: inMemoryDatabasePath);
      final report = OfflineHazardReport(
        reportId: 'r-rainfall-ai-landslide',
        hazardType: HazardType.rainfall,
        latitude: 27.3,
        longitude: 88.6,
        capturedAt: DateTime.now().toUtc(),
        deviceId: 'device-test-1',
      );
      await store.save(report);

      final initialReport = (await store.all()).firstWhere((r) => r.reportId == 'r-rainfall-ai-landslide');
      expect(initialReport.hazardType, HazardType.rainfall);

      // Apply AI classification payload
      final resultData = FieldClassificationResult(
        reportId: 'r-rainfall-ai-landslide',
        predictedClass: 'landslide',
        confidence: 0.88,
        severity: 'HIGH',
        modelVersion: 'v2',
        processedAt: DateTime.now().toUtc().toIso8601String(),
      );
      final updatedReport = initialReport.copyWith(
        status: ReportSyncStatus.synced,
        classificationStatus: ClassificationStatus.classified,
        classificationResult: resultData.encode(),
        classificationResultData: resultData,
        predictedClass: 'landslide',
        classificationConfidence: 0.88,
      );
      await store.save(updatedReport);

      final reloaded = (await store.all()).firstWhere((r) => r.reportId == 'r-rainfall-ai-landslide');
      expect(reloaded.hazardType, HazardType.rainfall);
      expect(reloaded.predictedClass, 'landslide');
    });

    test('TEST 2 — User selects landslide, AI predicts landslide', () async {
      final store = OfflineReportStore(dbPath: inMemoryDatabasePath);
      final report = OfflineHazardReport(
        reportId: 'r-landslide',
        hazardType: HazardType.landslide,
        latitude: 27.3,
        longitude: 88.6,
        capturedAt: DateTime.now().toUtc(),
        deviceId: 'dev-2',
        predictedClass: 'landslide',
      );
      await store.save(report);

      final reloaded = (await store.all()).firstWhere((r) => r.reportId == 'r-landslide');
      expect(reloaded.hazardType, HazardType.landslide);
      expect(reloaded.predictedClass, 'landslide');
    });

    test('TEST 3 — User selects flood, AI predicts landslide', () async {
      final store = OfflineReportStore(dbPath: inMemoryDatabasePath);
      final report = OfflineHazardReport(
        reportId: 'r-flood',
        hazardType: HazardType.flood,
        latitude: 27.3,
        longitude: 88.6,
        capturedAt: DateTime.now().toUtc(),
        deviceId: 'dev-3',
        predictedClass: 'landslide',
      );
      await store.save(report);

      final reloaded = (await store.all()).firstWhere((r) => r.reportId == 'r-flood');
      expect(reloaded.hazardType, HazardType.flood);
      expect(reloaded.predictedClass, 'landslide');
    });

    test('TEST 4 — User selects roadBlockage, AI predicts landslide', () async {
      final store = OfflineReportStore(dbPath: inMemoryDatabasePath);
      final report = OfflineHazardReport(
        reportId: 'r-roadblockage',
        hazardType: HazardType.roadBlockage,
        latitude: 27.3,
        longitude: 88.6,
        capturedAt: DateTime.now().toUtc(),
        deviceId: 'dev-4',
        predictedClass: 'landslide',
      );
      await store.save(report);

      final reloaded = (await store.all()).firstWhere((r) => r.reportId == 'r-roadblockage');
      expect(reloaded.hazardType, HazardType.roadBlockage);
      expect(reloaded.predictedClass, 'landslide');
    });

    test('TEST 5 — Offline persistence preserves selected hazardType', () async {
      final store = OfflineReportStore(dbPath: inMemoryDatabasePath);
      final report = OfflineHazardReport(
        reportId: 'r-persist',
        hazardType: HazardType.rainfall,
        latitude: 27.3,
        longitude: 88.6,
        capturedAt: DateTime.now().toUtc(),
        deviceId: 'dev-5',
      );
      await store.save(report);

      final rows = await store.all();
      final loaded = rows.firstWhere((r) => r.reportId == 'r-persist');
      expect(loaded.hazardType, HazardType.rainfall);
    });

    test('TEST 6 — Classification failure preserves hazardType', () async {
      final store = OfflineReportStore(dbPath: inMemoryDatabasePath);
      final report = OfflineHazardReport(
        reportId: 'r-fail',
        hazardType: HazardType.rainfall,
        latitude: 27.3,
        longitude: 88.6,
        capturedAt: DateTime.now().toUtc(),
        deviceId: 'dev-6',
        classificationStatus: ClassificationStatus.classificationFailed,
      );
      await store.save(report);

      final reloaded = (await store.all()).firstWhere((r) => r.reportId == 'r-fail');
      expect(reloaded.hazardType, HazardType.rainfall);
      expect(reloaded.classificationStatus, ClassificationStatus.classificationFailed);
    });

    test('TEST 7 — Sync retry preserves hazardType', () async {
      final store = OfflineReportStore(dbPath: inMemoryDatabasePath);
      final report = OfflineHazardReport(
        reportId: 'r-retry',
        hazardType: HazardType.rainfall,
        latitude: 27.3,
        longitude: 88.6,
        capturedAt: DateTime.now().toUtc(),
        deviceId: 'dev-7',
        status: ReportSyncStatus.syncFailed,
        retryCount: 1,
      );
      await store.save(report);

      final reloadedBefore = (await store.all()).firstWhere((r) => r.reportId == 'r-retry');
      expect(reloadedBefore.hazardType, HazardType.rainfall);

      // Simulate retry update
      final retried = reloadedBefore.copyWith(
        status: ReportSyncStatus.pendingSync,
        retryCount: 2,
      );
      await store.update(retried);

      final reloadedAfter = (await store.all()).firstWhere((r) => r.reportId == 'r-retry');
      expect(reloadedAfter.hazardType, HazardType.rainfall);
    });
  });
}
