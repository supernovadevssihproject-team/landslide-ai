import 'package:flutter/material.dart';

import 'config/app_config.dart';
import 'operational_risk_api.dart';
import 'risk_map_page.dart';
import 'offline/field_report_capture_service.dart';
import 'offline/offline_hazard_report_page.dart';
import 'offline/offline_reports_page.dart';
import 'offline/terraguard_http_sync_api.dart';
import 'offline/terraguard_offline_services.dart';

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

  @override
  Widget build(BuildContext context) {
    final capture = FieldReportCaptureService(syncManager: widget.offlineServices.sync);
    final pages = <Widget>[
      _HomePage(
        key: const ValueKey('home'),
        riskApi: widget.riskApi,
        onReportHazard: () => setState(() => _currentIndex = 1),
      ),
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
      body: IndexedStack(index: _currentIndex, children: pages),
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

class _HomePage extends StatefulWidget {
  final OperationalRiskApi riskApi;
  final VoidCallback onReportHazard;

  const _HomePage({super.key, required this.riskApi, required this.onReportHazard});

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

  @override
  Widget build(BuildContext context) => ListView(
        padding: const EdgeInsets.fromLTRB(16, 20, 16, 24),
        children: [
          const Text(
            'TerraGuard',
            style: TextStyle(fontSize: 28, fontWeight: FontWeight.w700),
          ),
          const SizedBox(height: 4),
          Text(
            'Field safety dashboard',
            style: TextStyle(color: Colors.blueGrey.shade200),
          ),
          const SizedBox(height: 20),
          const _DashboardSectionTitle(title: 'Current Location'),
          _OperationalLocationCard(
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
          const SizedBox(height: 20),
          const _DashboardSectionTitle(title: 'Current Risk'),
          _RiskCard(
            zone: _selectedZone,
            risk: _risk,
            loading: _riskLoading,
            error: _error,
            onRetry: _retry,
          ),
          const SizedBox(height: 20),
          const _DashboardSectionTitle(title: 'Conditions'),
          _ConditionsRow(
            rainfall: _risk?.rainfall ?? const {},
            seismic: _risk?.seismic ?? const {},
            loading: _riskLoading,
          ),
          const SizedBox(height: 24),
          OutlinedButton.icon(
            onPressed: () {
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
            },
            icon: const Icon(Icons.map_outlined),
            label: const Text('View Risk Map'),
          ),
          const SizedBox(height: 12),
          FilledButton.icon(
            onPressed: widget.onReportHazard,
            icon: const Icon(Icons.add_alert),
            label: const Text('Report Hazard'),
          ),
          const SizedBox(height: 12),
          OutlinedButton.icon(
            onPressed: null,
            icon: const Icon(Icons.sos_outlined),
            label: const Text('Emergency / SOS - Coming soon'),
          ),
        ],
      );
}

class _DashboardSectionTitle extends StatelessWidget {
  final String title;

  const _DashboardSectionTitle({required this.title});

  @override
  Widget build(BuildContext context) => Text(
        title,
        style: const TextStyle(fontSize: 18, fontWeight: FontWeight.w600),
      );
}

class _OperationalLocationCard extends StatelessWidget {
  final String selectedState;
  final OperationalZone? selectedZone;
  final List<OperationalZone> zones;
  final List<OperationalState> states;
  final bool locationsLoading;
  final ValueChanged<String> onStateChanged;
  final ValueChanged<OperationalZone?> onZoneChanged;

  const _OperationalLocationCard({
    required this.selectedState,
    required this.selectedZone,
    required this.zones,
    required this.states,
    required this.locationsLoading,
    required this.onStateChanged,
    required this.onZoneChanged,
  });

  @override
  Widget build(BuildContext context) => Card(
        child: Padding(
          padding: const EdgeInsets.all(16),
          child: Row(
            children: [
              Icon(
                Icons.location_on_outlined,
                color: Theme.of(context).colorScheme.primary,
                size: 30,
              ),
              const SizedBox(width: 14),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    DropdownButtonFormField<String>(
                      initialValue: selectedState,
                      decoration: const InputDecoration(
                        labelText: 'State / region',
                        border: InputBorder.none,
                        contentPadding: EdgeInsets.zero,
                      ),
                      items: states
                          .map((state) => DropdownMenuItem(value: state.key, child: Text(state.label)))
                          .toList(),
                      onChanged: locationsLoading ? null : (state) {
                        if (state != null) onStateChanged(state);
                      },
                    ),
                    if (locationsLoading)
                      const LinearProgressIndicator(minHeight: 3)
                    else if (zones.isEmpty)
                      const Padding(
                        padding: EdgeInsets.only(top: 4),
                        child: Text('No operational locations available.'),
                      )
                    else
                      DropdownButtonFormField<OperationalZone>(
                        initialValue: selectedZone,
                        decoration: const InputDecoration(
                          labelText: 'Operational location',
                          helperText: 'Loaded from TerraGuard backend',
                          border: InputBorder.none,
                          contentPadding: EdgeInsets.zero,
                        ),
                        items: zones
                            .map((zone) => DropdownMenuItem(value: zone, child: Text(zone.name)))
                            .toList(),
                        onChanged: onZoneChanged,
                      ),
                  ],
                ),
              ),
            ],
          ),
        ),
      );
}

class _RiskCard extends StatelessWidget {
  final OperationalZone? zone;
  final RiskEvaluation? risk;
  final bool loading;
  final String? error;
  final VoidCallback onRetry;

  const _RiskCard({
    required this.zone,
    required this.risk,
    required this.loading,
    required this.error,
    required this.onRetry,
  });

  @override
  Widget build(BuildContext context) => Card(
        color: Theme.of(context).colorScheme.surface,
        child: Padding(
          padding: const EdgeInsets.all(18),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                children: [
                  Icon(Icons.shield_outlined, color: Theme.of(context).colorScheme.primary, size: 30),
                  const SizedBox(width: 12),
                  Expanded(
                    child: Text(
                      zone?.name ?? 'Risk data unavailable',
                      style: const TextStyle(fontSize: 18, fontWeight: FontWeight.w600),
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 18),
              if (loading)
                const LinearProgressIndicator()
              else if (risk == null)
                Text(error ?? 'Select an operational location to load risk data.')
              else ...[
                Row(
                children: [
                  Expanded(child: _RiskValue(label: 'Risk score', value: '${risk!.riskScore ?? '-'}')),
                  Expanded(child: _RiskValue(label: 'Risk level', value: risk!.riskLevel ?? '-')),
                ],
                ),
                const SizedBox(height: 14),
                _RiskValue(
                  label: 'Probability',
                  value: risk!.probabilityPercentage == null ? '-' : '${risk!.probabilityPercentage}% (base ${risk!.baseProbability ?? '-'} )',
                ),
                const SizedBox(height: 10),
                Text(
                  'Coordinates: ${risk!.latitude.toStringAsFixed(5)}, ${risk!.longitude.toStringAsFixed(5)}',
                  style: TextStyle(color: Colors.blueGrey.shade200),
                ),
              ],
              if (error != null && !loading) ...[
                const SizedBox(height: 8),
                Align(
                  alignment: Alignment.centerLeft,
                  child: TextButton(onPressed: onRetry, child: const Text('Retry')),
                ),
              ],
            ],
          ),
        ),
      );
}

class _ConditionsRow extends StatelessWidget {
  final Map<String, dynamic> rainfall;
  final Map<String, dynamic> seismic;
  final bool loading;

  const _ConditionsRow({required this.rainfall, required this.seismic, required this.loading});

  String _value(Object? value, String suffix) => value == null ? 'Unavailable' : '$value$suffix';

  @override
  Widget build(BuildContext context) {
    final rainfallValue = loading ? 'Loading' : _value(rainfall['rainfall_1d_mm'], ' mm / 1d');
    final seismicValue = loading ? 'Loading' : _value(seismic['events_in_range_500km'], ' events');
    return Row(
      children: [
        Expanded(
          child: _MetricCard(
            icon: Icons.water_drop_outlined,
            title: 'Rainfall',
            value: rainfallValue,
          ),
        ),
        const SizedBox(width: 12),
        Expanded(
          child: _MetricCard(
            icon: Icons.public_outlined,
            title: 'Seismic',
            value: seismicValue,
          ),
        ),
      ],
    );
  }
}

class _RiskValue extends StatelessWidget {
  final String label;
  final String value;

  const _RiskValue({required this.label, required this.value});

  @override
  Widget build(BuildContext context) => Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(label, style: TextStyle(color: Colors.blueGrey.shade200)),
          const SizedBox(height: 4),
          Text(value, style: const TextStyle(fontWeight: FontWeight.w600)),
        ],
      );
}

class _MetricCard extends StatelessWidget {
  final IconData icon;
  final String title;
  final String value;

  const _MetricCard({required this.icon, required this.title, required this.value});

  @override
  Widget build(BuildContext context) => Card(
        child: Padding(
          padding: const EdgeInsets.all(14),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Icon(icon, color: Theme.of(context).colorScheme.primary),
              const SizedBox(height: 10),
              Text(title, style: TextStyle(color: Colors.blueGrey.shade200)),
              const SizedBox(height: 4),
              Text(value, style: const TextStyle(fontWeight: FontWeight.w600)),
            ],
          ),
        ),
      );
}
