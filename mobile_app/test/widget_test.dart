import 'dart:convert';

import 'package:connectivity_plus/connectivity_plus.dart';
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:sqflite_common_ffi/sqflite_ffi.dart';
import 'package:terraguard_mobile/main.dart';
import 'package:terraguard_mobile/offline/offline_hazard_report.dart';
import 'package:terraguard_mobile/offline/terraguard_database_models.dart';
import 'package:terraguard_mobile/operational_risk_api.dart';
import 'package:terraguard_mobile/offline/terraguard_http_sync_api.dart';
import 'package:terraguard_mobile/offline/terraguard_offline_services.dart';

void main() {
  setUpAll(() {
    databaseFactory = databaseFactoryFfi;
  });

  testWidgets('TerraGuardApp smoke test', (WidgetTester tester) async {
    final services = TerraGuardOfflineServices(
      api: TerraGuardHttpSyncApi(reportsEndpoint: Uri.parse('http://localhost:8001/api/reports/submit')),
    );
    await tester.pumpWidget(MaterialApp(
      home: TerraGuardApp(
        offlineServices: services,
        riskApi: OperationalRiskApi(baseUri: Uri.parse('http://localhost:8001')),
      ),
    ));
    await tester.pump();
    expect(find.byType(TerraGuardApp), findsOneWidget);
  });

  test('offline mode returns cached data instead of calling the backend', () async {
    final api = OperationalRiskApi(
      baseUri: Uri.parse('http://localhost:8001'),
      connectivityChecker: () async => [ConnectivityResult.none],
    );

    final zones = await api.getZones('uttarakhand');
    expect(zones, isNotEmpty);

    await api.store.saveRiskCache('${zones.first.state}:${zones.first.id}', jsonEncode({
      'location': {'name': zones.first.name, 'state': zones.first.state, 'latitude': zones.first.latitude, 'longitude': zones.first.longitude},
      'inputs': {'rainfall': {'rainfall_1d_mm': 21.0, 'rainfall_3d_mm': 52.0, 'rainfall_7d_mm': 80.0}, 'seismic': {'events_in_range_500km': 0, 'nearest_event_distance_km': null, 'seismic_trigger_score': 0.0}},
      'final_risk_score': 38,
      'base_ml_probability': 0.38,
      'probability_percentage': 38.0,
      'risk_level': 'MODERATE',
    }));

    final risk = await api.getLocationRisk(zones.first);
    expect(risk.riskLevel, isNotNull);
    expect(risk.riskScore, isNotNull);
    expect(risk.dataSource, RiskDataSource.cached);
  });

  test('offline mode without cached data reports unavailable instead of fake risk', () async {
    final api = OperationalRiskApi(
      baseUri: Uri.parse('http://localhost:8001'),
      connectivityChecker: () async => [ConnectivityResult.none],
    );

    final zones = await api.getZones('sikkim');
    expect(zones, isNotEmpty);

    final risk = await api.getLocationRisk(zones.first);
    expect(risk.dataSource, RiskDataSource.unavailable);
    expect(risk.riskLevel, 'UNAVAILABLE');
    expect(risk.riskScore, isNull);
  });

  test('reports keep sync and AI states independent', () {
    final report = OfflineHazardReport(
      reportId: 'r-1',
      hazardType: HazardType.landslide,
      latitude: 27.1,
      longitude: 88.3,
      capturedAt: DateTime.utc(2026, 9, 20),
      deviceId: 'device-1',
      state: 'sikkim',
      zoneId: 'zone-1',
    );

    expect(report.syncStatus, ReportSyncStatus.pendingSync);
    expect(report.classificationStatus, ClassificationStatus.classificationPending);
  });

  test('AI classification response is validated before it is accepted', () {
    final result = FieldClassificationResult.fromJson({
      'report_id': 'r-1',
      'predicted_class': 'landslide',
      'confidence': 0.87,
      'severity': 'HIGH',
      'model_version': 'v2',
      'processed_at': '2026-09-20T12:00:00Z',
    });

    expect(result.predictedClass, 'landslide');
    expect(result.confidence, 0.87);
    expect(result.severity, 'HIGH');
    expect(result.modelVersion, 'v2');
  });
}
