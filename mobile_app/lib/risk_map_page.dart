import 'package:flutter/material.dart';
import 'package:flutter_map/flutter_map.dart';
import 'package:latlong2/latlong.dart';
import 'package:url_launcher/url_launcher.dart';

import 'config/app_config.dart';
import 'operational_risk_api.dart';
import 'theme/app_theme.dart';

class RiskMapPage extends StatelessWidget {
  final OperationalZone? selectedZone;
  final RiskEvaluation? risk;
  final List<OperationalZone> zones;

  const RiskMapPage({
    super.key,
    required this.selectedZone,
    required this.risk,
    required this.zones,
  });

  Future<void> _openFullWebMap(BuildContext context) async {
    const webUrlStr = AppConfig.webUrl;
    final uri = Uri.parse(webUrlStr);
    try {
      final launched = await launchUrl(uri, mode: LaunchMode.externalApplication);
      if (!launched && context.mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Could not open TerraGuard Web Risk Map.')),
        );
      }
    } catch (_) {
      if (context.mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Unable to launch TerraGuard Web Risk Map.')),
        );
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    final zone = selectedZone;
    final lat = zone?.latitude ?? 27.5312;
    final lng = zone?.longitude ?? 88.5134;
    final center = LatLng(lat, lng);
    final primaryColor = TerraTheme.getSeverityColor(risk?.riskLevel);

    return Scaffold(
      backgroundColor: TerraTheme.background,
      appBar: AppBar(
        title: const Text('GIS SPATIAL TERRAIN MAP'),
      ),
      body: Column(
        children: [
          // Top Info Banner Card
          Padding(
            padding: const EdgeInsets.all(16.0),
            child: Container(
              decoration: BoxDecoration(
                color: TerraTheme.surface,
                borderRadius: BorderRadius.circular(20),
                border: Border.all(color: primaryColor.withValues(alpha: 0.4), width: 1.5),
              ),
              child: Padding(
                padding: const EdgeInsets.all(16.0),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Row(
                      children: [
                        Container(
                          padding: const EdgeInsets.all(8),
                          decoration: BoxDecoration(
                            color: primaryColor.withValues(alpha: 0.15),
                            borderRadius: BorderRadius.circular(10),
                          ),
                          child: Icon(Icons.location_on, color: primaryColor, size: 22),
                        ),
                        const SizedBox(width: 12),
                        Expanded(
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Text(
                                zone?.name ?? 'No Operational Location',
                                style: const TextStyle(
                                  color: TerraTheme.textPrimary,
                                  fontSize: 16,
                                  fontWeight: FontWeight.bold,
                                ),
                              ),
                              const SizedBox(height: 2),
                              Text(
                                '${zone?.state.toUpperCase() ?? "GLOBAL"} SECTOR',
                                style: const TextStyle(
                                  color: TerraTheme.textMuted,
                                  fontSize: 10,
                                  fontWeight: FontWeight.bold,
                                ),
                              ),
                            ],
                          ),
                        ),
                        if (risk?.riskLevel != null)
                          Container(
                            padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                            decoration: BoxDecoration(
                              color: primaryColor.withValues(alpha: 0.2),
                              borderRadius: BorderRadius.circular(12),
                              border: Border.all(color: primaryColor),
                            ),
                            child: Text(
                              risk!.riskLevel!.replaceAll('_', ' '),
                              style: TextStyle(
                                color: primaryColor,
                                fontWeight: FontWeight.bold,
                                fontSize: 11,
                              ),
                            ),
                          ),
                      ],
                    ),
                    const SizedBox(height: 14),
                    Row(
                      children: [
                        Expanded(
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              const Text('COORDINATES', style: TextStyle(color: TerraTheme.textMuted, fontSize: 10, fontWeight: FontWeight.bold)),
                              const SizedBox(height: 2),
                              Text('${lat.toStringAsFixed(4)}°, ${lng.toStringAsFixed(4)}°', style: const TextStyle(color: TerraTheme.secondary, fontSize: 12, fontFamily: 'monospace')),
                            ],
                          ),
                        ),
                        Expanded(
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              const Text('RISK SCORE', style: TextStyle(color: TerraTheme.textMuted, fontSize: 10, fontWeight: FontWeight.bold)),
                              const SizedBox(height: 2),
                              Text(
                                risk?.riskScore != null ? '${risk!.riskScore} / 100' : '-',
                                style: TextStyle(color: primaryColor, fontSize: 13, fontWeight: FontWeight.bold),
                              ),
                            ],
                          ),
                        ),
                      ],
                    ),
                  ],
                ),
              ),
            ),
          ),

          // Interactive Map View
          Expanded(
            child: Container(
              margin: const EdgeInsets.symmetric(horizontal: 16),
              clipBehavior: Clip.antiAlias,
              decoration: BoxDecoration(
                borderRadius: BorderRadius.circular(20),
                border: Border.all(color: TerraTheme.border, width: 1.5),
              ),
              child: FlutterMap(
                options: MapOptions(
                  initialCenter: center,
                  initialZoom: 12.0,
                  minZoom: 4.0,
                  maxZoom: 18.0,
                ),
                children: [
                  TileLayer(
                    urlTemplate: 'https://tile.openstreetmap.org/{z}/{x}/{y}.png',
                    userAgentPackageName: 'com.example.terraguard_mobile',
                  ),
                  MarkerLayer(
                    markers: [
                      if (zone != null)
                        Marker(
                          point: center,
                          width: 50,
                          height: 50,
                          child: Icon(
                            Icons.location_pin,
                            color: primaryColor,
                            size: 44,
                          ),
                        ),
                      ...zones
                          .where((z) => z.id != zone?.id)
                          .map(
                            (otherZone) => Marker(
                              point: LatLng(otherZone.latitude, otherZone.longitude),
                              width: 36,
                              height: 36,
                              child: const Icon(
                                Icons.location_on_outlined,
                                color: TerraTheme.primary,
                                size: 28,
                              ),
                            ),
                          ),
                    ],
                  ),
                ],
              ),
            ),
          ),

          // Open Full Web Map Launcher
          SafeArea(
            child: Padding(
              padding: const EdgeInsets.all(16.0),
              child: SizedBox(
                width: double.infinity,
                height: 50,
                child: ElevatedButton.icon(
                  onPressed: () => _openFullWebMap(context),
                  icon: const Icon(Icons.open_in_browser, size: 20),
                  label: const Text('OPEN FULL WEB RISK MAP', style: TextStyle(fontSize: 13, fontWeight: FontWeight.bold, letterSpacing: 0.5)),
                  style: ElevatedButton.styleFrom(
                    backgroundColor: TerraTheme.secondary,
                    foregroundColor: Colors.white,
                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
                    elevation: 0,
                  ),
                ),
              ),
            ),
          ),
        ],
      ),
    );
  }
}
