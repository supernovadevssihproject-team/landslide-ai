import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:terraguard_mobile/main.dart';
import 'package:terraguard_mobile/operational_risk_api.dart';
import 'package:terraguard_mobile/offline/terraguard_http_sync_api.dart';
import 'package:terraguard_mobile/offline/terraguard_offline_services.dart';

void main() {
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
}
