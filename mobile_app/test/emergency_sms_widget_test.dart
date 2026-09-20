import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:terraguard_mobile/widgets/safety_emergency_sheet.dart';

void main() {
  testWidgets('SafetyEmergencySheet displays Emergency Broadcast SMS widget correctly', (WidgetTester tester) async {
    tester.view.physicalSize = const Size(800, 1600);
    tester.view.devicePixelRatio = 1.0;
    addTearDown(tester.view.resetPhysicalSize);

    await tester.pumpWidget(
      const MaterialApp(
        home: Scaffold(
          body: SingleChildScrollView(
            child: SafetyEmergencySheet(),
          ),
        ),
      ),
    );
    await tester.pumpAndSettle();

    // Verify key titles and SMS section presence
    expect(find.text('SAFETY & EMERGENCY RESPONSE'), findsOneWidget);
    expect(find.text('DISASTER SMS BROADCAST'), findsOneWidget);
    expect(find.text('DISPATCH EMERGENCY SMS ALERT'), findsOneWidget);
    expect(find.text('Open SMS app → 1078'), findsOneWidget);

    // Tap dispatch button to ensure dialog confirmation is required
    final dispatchButton = find.text('DISPATCH EMERGENCY SMS ALERT');
    await tester.ensureVisible(dispatchButton);
    await tester.tap(dispatchButton, warnIfMissed: false);
    await tester.pumpAndSettle();

    // Verify confirmation dialog opens with location context
    expect(find.text('CONFIRM EMERGENCY SMS DISPATCH'), findsOneWidget);
    expect(find.text('DISPATCH SMS'), findsOneWidget);
    expect(find.text('CANCEL'), findsOneWidget);

    // Cancel confirmation
    await tester.tap(find.text('CANCEL'));
    await tester.pumpAndSettle();
    expect(find.text('CONFIRM EMERGENCY SMS DISPATCH'), findsNothing);
  });
}
