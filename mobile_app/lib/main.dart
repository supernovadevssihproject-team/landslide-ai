import 'package:flutter/material.dart';

import 'config/app_config.dart';
import 'operational_risk_api.dart';
import 'risk_map_page.dart';
import 'offline/field_report_capture_service.dart';
import 'offline/offline_hazard_report_page.dart';
import 'offline/offline_reports_page.dart';
import 'offline/terraguard_http_sync_api.dart';
import 'offline/terraguard_offline_services.dart';
import 'theme/app_theme.dart';
import 'widgets/command_header.dart';
import 'widgets/conditions_grid.dart';
import 'widgets/floating_nav_bar.dart';
import 'widgets/operational_area_card.dart';
import 'widgets/quick_actions.dart';
import 'widgets/risk_arc_gauge.dart';
import 'widgets/risk_map_entry_card.dart';

void main() async {
  WidgetsFlutterBinding.ensureInitialized();
  final baseUrl = AppConfig.apiBaseUrl;
  final services = TerraGuardOfflineServices(
    api: TerraGuardHttpSyncApi(
      reportsEndpoint: Uri.parse('$baseUrl/api/reports/submit'),
    ),
  );
  await services.start();
  runApp(TerraGuardApp(
    offlineServices: services,
    riskApi: OperationalRiskApi(baseUri: Uri.parse(baseUrl)),
  ));
}

class TerraGuardApp extends StatelessWidget {
  final TerraGuardOfflineServices offlineServices;
  final OperationalRiskApi riskApi;

  const TerraGuardApp({super.key, required this.offlineServices, required this.riskApi});

  @override
  Widget build(BuildContext context) => MaterialApp(
        title: 'TerraGuard Field Command',
        debugShowCheckedModeBanner: false,
        theme: TerraTheme.darkTheme,
        home: TerraGuardMainScreen(offlineServices: offlineServices, riskApi: riskApi),
      );
}

class TerraGuardMainScreen extends StatefulWidget {
  final TerraGuardOfflineServices offlineServices;
  final OperationalRiskApi riskApi;

  const TerraGuardMainScreen({super.key, required this.offlineServices, required this.riskApi});

  @override
  State<TerraGuardMainScreen> createState() => _TerraGuardMainScreenState();
}

class _TerraGuardMainScreenState extends State<TerraGuardMainScreen> {
  int _currentIndex = 0;

  void _showSosDialog(BuildContext context) {
    showModalBottomSheet(
      context: context,
      backgroundColor: TerraTheme.surface,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(24)),
      ),
      builder: (ctx) => Padding(
        padding: const EdgeInsets.all(24),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                Container(
                  padding: const EdgeInsets.all(10),
                  decoration: BoxDecoration(
                    color: TerraTheme.critical.withValues(alpha: 0.15),
                    shape: BoxShape.circle,
                  ),
                  child: const Icon(Icons.emergency, color: TerraTheme.critical, size: 28),
                ),
                const SizedBox(width: 14),
                const Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        'EMERGENCY DISPATCH',
                        style: TextStyle(
                          color: TerraTheme.critical,
                          fontSize: 12,
                          fontWeight: FontWeight.bold,
                          letterSpacing: 1.0,
                        ),
                      ),
                      SizedBox(height: 2),
                      Text(
                        'State Disaster Management Hotlines',
                        style: TextStyle(
                          color: TerraTheme.textPrimary,
                          fontSize: 16,
                          fontWeight: FontWeight.bold,
                        ),
                      ),
                    ],
                  ),
                ),
              ],
            ),
            const SizedBox(height: 20),
            Container(
              padding: const EdgeInsets.all(14),
              decoration: BoxDecoration(
                color: TerraTheme.background,
                borderRadius: BorderRadius.circular(16),
                border: Border.all(color: TerraTheme.border),
              ),
              child: const Row(
                mainAxisAlignment: MainAxisAlignment.spaceAround,
                children: [
                  Column(
                    children: [
                      Text('SDMA HOTLINE', style: TextStyle(color: TerraTheme.textMuted, fontSize: 10, fontWeight: FontWeight.bold)),
                      SizedBox(height: 4),
                      Text('1077', style: TextStyle(color: TerraTheme.textPrimary, fontSize: 20, fontWeight: FontWeight.bold)),
                    ],
                  ),
                  SizedBox(height: 30, child: VerticalDivider(color: TerraTheme.border)),
                  Column(
                    children: [
                      Text('NDMA HOTLINE', style: TextStyle(color: TerraTheme.textMuted, fontSize: 10, fontWeight: FontWeight.bold)),
                      SizedBox(height: 4),
                      Text('1078', style: TextStyle(color: TerraTheme.textPrimary, fontSize: 20, fontWeight: FontWeight.bold)),
                    ],
                  ),
                ],
              ),
            ),
            const SizedBox(height: 16),
            const Text(
              'One-touch CAP cell-broadcast SOS messaging & mesh location broadcast support are enabled on verified field devices.',
              style: TextStyle(color: TerraTheme.textSecondary, fontSize: 12, height: 1.4),
            ),
            const SizedBox(height: 20),
            SizedBox(
              width: double.infinity,
              child: ElevatedButton(
                onPressed: () => Navigator.pop(ctx),
                style: ElevatedButton.styleFrom(
                  backgroundColor: TerraTheme.border,
                  foregroundColor: TerraTheme.textPrimary,
                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
                  padding: const EdgeInsets.symmetric(vertical: 14),
                ),
                child: const Text('DISMISS'),
              ),
            ),
          ],
        ),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final capture = FieldReportCaptureService(syncManager: widget.offlineServices.sync);

    return StreamBuilder<int>(
      stream: Stream.periodic(const Duration(seconds: 2)).asyncMap((_) => widget.offlineServices.pendingCount()),
      builder: (context, pendingSnapshot) {
        final pendingCount = pendingSnapshot.data ?? 0;

        final pages = <Widget>[
          _HomePage(
            key: const ValueKey('home'),
            riskApi: widget.riskApi,
            pendingCount: pendingCount,
            onReportHazard: () => setState(() => _currentIndex = 1),
            onMyReportsPressed: () => setState(() => _currentIndex = 2),
            onSosPressed: () => _showSosDialog(context),
          ),
          OfflineHazardReportPage(
            captureService: capture,
            onSaved: () => setState(() => _currentIndex = 2),
          ),
          OfflineReportsPage(store: widget.offlineServices.store),
        ];

        return Scaffold(
          extendBody: true,
          body: IndexedStack(index: _currentIndex, children: pages),
          bottomNavigationBar: FloatingBottomNavBar(
            currentIndex: _currentIndex,
            onTap: (index) => setState(() => _currentIndex = index),
          ),
        );
      },
    );
  }
}

class _HomePage extends StatefulWidget {
  final OperationalRiskApi riskApi;
  final int pendingCount;
  final VoidCallback onReportHazard;
  final VoidCallback onMyReportsPressed;
  final VoidCallback onSosPressed;

  const _HomePage({
    super.key,
    required this.riskApi,
    required this.pendingCount,
    required this.onReportHazard,
    required this.onMyReportsPressed,
    required this.onSosPressed,
  });

  @override
  State<_HomePage> createState() => _HomePageState();
}

class _HomePageState extends State<_HomePage> {
  String _selectedState = operationalStates.first.key;
  List<OperationalZone> _zones = const [];
  OperationalZone? _selectedZone;
  RiskEvaluation? _risk;
  String? _error;
  bool _locationsLoading = false;
  bool _riskLoading = false;
  int _requestVersion = 0;

  @override
  void initState() {
    super.initState();
    _loadZones(_selectedState);
  }

  Future<void> _loadZones(String state) async {
    final requestVersion = ++_requestVersion;
    setState(() {
      _selectedState = state;
      _locationsLoading = true;
      _riskLoading = false;
      _zones = const [];
      _selectedZone = null;
      _risk = null;
      _error = null;
    });
    try {
      final zones = await widget.riskApi.getZones(state);
      if (!mounted || requestVersion != _requestVersion) return;
      setState(() {
        _zones = zones;
        _locationsLoading = false;
        _error = zones.isEmpty ? 'No operational locations are available for this region.' : null;
      });
      if (zones.isNotEmpty) _selectZone(zones.first);
    } on OperationalRiskApiException catch (error) {
      if (!mounted || requestVersion != _requestVersion) return;
      setState(() {
        _locationsLoading = false;
        _error = error.message;
      });
    } catch (_) {
      if (!mounted || requestVersion != _requestVersion) return;
      setState(() {
        _locationsLoading = false;
        _error = 'Failed to load locations for this region.';
      });
    }
  }

  Future<void> _selectZone(OperationalZone zone) async {
    final requestVersion = ++_requestVersion;
    setState(() {
      _selectedZone = zone;
      _risk = null;
      _riskLoading = true;
      _error = null;
    });
    try {
      final risk = await widget.riskApi.getLocationRisk(zone);
      if (!mounted || requestVersion != _requestVersion) return;
      setState(() {
        _risk = risk;
        _riskLoading = false;
      });
    } on OperationalRiskApiException catch (error) {
      if (!mounted || requestVersion != _requestVersion) return;
      setState(() {
        _riskLoading = false;
        _error = error.message;
      });
    } catch (_) {
      if (!mounted || requestVersion != _requestVersion) return;
      setState(() {
        _riskLoading = false;
        _error = 'Failed to load risk evaluation for this location.';
      });
    }
  }

  Future<void> _retry() => _loadZones(_selectedState);

  void _openRiskMap() {
    Navigator.push(
      context,
      MaterialPageRoute(
        builder: (_) => RiskMapPage(
          selectedZone: _selectedZone,
          risk: _risk,
          zones: _zones,
        ),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    return Column(
      children: [
        CommandHeader(
          pendingCount: widget.pendingCount,
          onSosPressed: widget.onSosPressed,
        ),
        Expanded(
          child: RefreshIndicator(
            onRefresh: _retry,
            color: TerraTheme.primary,
            backgroundColor: TerraTheme.surface,
            child: ListView(
              padding: const EdgeInsets.fromLTRB(16, 16, 16, 100),
              children: [
                // Operational Area Selector Card
                OperationalAreaCard(
                  selectedState: _selectedState,
                  selectedZone: _selectedZone,
                  zones: _zones,
                  states: operationalStates,
                  locationsLoading: _locationsLoading,
                  onStateChanged: _loadZones,
                  onZoneChanged: (zone) {
                    if (zone != null) _selectZone(zone);
                  },
                ),
                const SizedBox(height: 16),

                // Main Risk Arc Gauge Hero Card
                RiskArcGauge(
                  zone: _selectedZone,
                  risk: _risk,
                  loading: _riskLoading,
                  error: _error,
                  onRetry: _retry,
                ),
                const SizedBox(height: 16),

                // Conditions Tile Row
                ConditionsGrid(
                  rainfall: _risk?.rainfall ?? const {},
                  seismic: _risk?.seismic ?? const {},
                  loading: _riskLoading,
                ),
                const SizedBox(height: 16),

                // GIS Risk Map Banner
                RiskMapEntryCard(
                  zone: _selectedZone,
                  risk: _risk,
                  onTap: _openRiskMap,
                ),
                const SizedBox(height: 16),

                // Field Quick Actions Grid
                QuickActionsSection(
                  onOpenMap: _openRiskMap,
                  onOpenReport: widget.onReportHazard,
                  onOpenMyReports: widget.onMyReportsPressed,
                  onOpenSos: widget.onSosPressed,
                ),
              ],
            ),
          ),
        ),
      ],
    );
  }
}
