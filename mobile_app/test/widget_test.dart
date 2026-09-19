// This is a basic Flutter widget test.
//
// To perform an interaction with a widget in your test, use the WidgetTester
// utility in the flutter_test package. For example, you can send tap and scroll
// gestures. You can also use WidgetTester to find child widgets in the widget
// tree, read text, and verify that the values of widget properties are correct.

import 'package:flutter_test/flutter_test.dart';
import 'package:terraguard_mobile/main.dart';
import 'package:terraguard_mobile/operational_risk_api.dart';
import 'package:terraguard_mobile/offline/terraguard_http_sync_api.dart';
import 'package:terraguard_mobile/offline/terraguard_offline_services.dart';

void main() {
  testWidgets('TerraGuardApp smoke test', (WidgetTester tester) async {
    final services = TerraGuardOfflineServices(
      api: TerraGuardHttpSyncApi(reportsEndpoint: Uri.parse('http://localhost:8000/api/reports/submit')),
    );
    await tester.pumpWidget(TerraGuardApp(
      offlineServices: services,
      riskApi: OperationalRiskApi(baseUri: Uri.parse('http://localhost:8000')),
    ));
    expect(find.text('TerraGuard'), findsOneWidget);
  });
}
