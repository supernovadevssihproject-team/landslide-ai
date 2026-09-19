import 'package:flutter/material.dart';

import 'offline/field_report_capture_service.dart';
import 'offline/offline_hazard_report_page.dart';
import 'offline/offline_reports_page.dart';
import 'offline/terraguard_http_sync_api.dart';
import 'offline/terraguard_offline_services.dart';

void main() async {
  WidgetsFlutterBinding.ensureInitialized();
  const baseUrl = String.fromEnvironment(
    'TERRAGUARD_API_BASE_URL',
    defaultValue: 'http://localhost:8000',
  );
  final services = TerraGuardOfflineServices(
    api: TerraGuardHttpSyncApi(
      reportsEndpoint: Uri.parse('$baseUrl/api/reports/submit'),
    ),
  );
  await services.start();
  runApp(TerraGuardApp(offlineServices: services));
}

class TerraGuardApp extends StatelessWidget {
  final TerraGuardOfflineServices offlineServices;
  const TerraGuardApp({super.key, required this.offlineServices});

  @override
  Widget build(BuildContext context) => MaterialApp(
        title: 'TerraGuard Field Reports',
        debugShowCheckedModeBanner: false,
        theme: ThemeData.dark().copyWith(
          scaffoldBackgroundColor: const Color(0xFF0B0F19),
          colorScheme: const ColorScheme.dark(
            primary: Color(0xFF06B6D4),
            secondary: Color(0xFF10B981),
            surface: Color(0xFF111827),
            error: Color(0xFFEF4444),
          ),
        ),
        home: TerraGuardMainScreen(offlineServices: offlineServices),
      );
}

class TerraGuardMainScreen extends StatefulWidget {
  final TerraGuardOfflineServices offlineServices;
  const TerraGuardMainScreen({super.key, required this.offlineServices});

  @override
  State<TerraGuardMainScreen> createState() => _TerraGuardMainScreenState();
}

class _TerraGuardMainScreenState extends State<TerraGuardMainScreen> {
  int _currentIndex = 0;

  @override
  Widget build(BuildContext context) {
    final capture = FieldReportCaptureService(syncManager: widget.offlineServices.sync);
    final pages = <Widget>[
      const _HomePage(),
      OfflineHazardReportPage(captureService: capture, onSaved: () => setState(() {})),
      OfflineReportsPage(store: widget.offlineServices.store),
    ];
    return Scaffold(
      appBar: AppBar(
        title: const Text('TerraGuard'),
        actions: [
          FutureBuilder<int>(
            future: widget.offlineServices.pendingCount(),
            builder: (_, snapshot) => Padding(
              padding: const EdgeInsets.only(right: 12),
              child: Chip(label: Text('${snapshot.data ?? 0} pending')),
            ),
          ),
        ],
      ),
      body: pages[_currentIndex],
      bottomNavigationBar: BottomNavigationBar(
        currentIndex: _currentIndex,
        onTap: (index) => setState(() => _currentIndex = index),
        items: const [
          BottomNavigationBarItem(icon: Icon(Icons.shield_outlined), label: 'Home'),
          BottomNavigationBarItem(icon: Icon(Icons.add_alert), label: 'Report'),
          BottomNavigationBarItem(icon: Icon(Icons.list_alt), label: 'My Reports'),
        ],
      ),
    );
  }
}

class _HomePage extends StatelessWidget {
  const _HomePage();

  @override
  Widget build(BuildContext context) => const Center(
        child: Padding(
          padding: EdgeInsets.all(24),
          child: Text(
            'Capture a hazard photo with GPS coordinates.\n\nReports are saved locally first and synchronized with LandslideGuard when connectivity returns.',
            textAlign: TextAlign.center,
            style: TextStyle(fontSize: 18),
          ),
        ),
      );
}
