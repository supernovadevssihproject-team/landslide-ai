import 'package:flutter/material.dart';
import 'package:flutter_map/flutter_map.dart';
import 'package:latlong2/latlong.dart';
import 'package:url_launcher/url_launcher.dart';

import 'config/app_config.dart';
import 'operational_risk_api.dart';

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

  Color _riskColor(String? level, BuildContext context) {
    switch (level?.toUpperCase()) {
      case 'VERY_HIGH':
      case 'CRITICAL':
        return const Color(0xFFEF4444);
      case 'HIGH':
        return const Color(0xFFF97316);
      case 'MODERATE':
      case 'MEDIUM':
        return const Color(0xFFEAB308);
      case 'LOW':
        return const Color(0xFF10B981);
      default:
        return Theme.of(context).colorScheme.primary;
    }
  }

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
    final primaryColor = _riskColor(risk?.riskLevel, context);

    return Scaffold(
      appBar: AppBar(
        title: const Text('Risk Map'),
      ),
      body: Column(
        children: [
          Padding(
            padding: const EdgeInsets.all(16.0),
            child: Card(
              color: Theme.of(context).colorScheme.surface,
              child: Padding(
                padding: const EdgeInsets.all(16.0),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Row(
                      children: [
                        Icon(Icons.location_on, color: primaryColor, size: 28),
                        const SizedBox(width: 10),
                        Expanded(
                          child: Text(
                            zone?.name ?? 'No Operational Location',
                            style: const TextStyle(fontSize: 18, fontWeight: FontWeight.bold),
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
                              risk!.riskLevel!,
                              style: TextStyle(
                                color: primaryColor,
                                fontWeight: FontWeight.bold,
                                fontSize: 12,
                              ),
                            ),
                          ),
                      ],
                    ),
                    const SizedBox(height: 10),
                    Row(
                      children: [
                        Expanded(
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Text('State / Region', style: TextStyle(color: Colors.blueGrey.shade200, fontSize: 12)),
                              Text(zone?.state.toUpperCase() ?? '-', style: const TextStyle(fontWeight: FontWeight.w600)),
                            ],
                          ),
                        ),
                        Expanded(
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Text('Coordinates', style: TextStyle(color: Colors.blueGrey.shade200, fontSize: 12)),
                              Text('${lat.toStringAsFixed(4)}°, ${lng.toStringAsFixed(4)}°', style: const TextStyle(fontWeight: FontWeight.w600)),
                            ],
                          ),
                        ),
                        Expanded(
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Text('Risk Score', style: TextStyle(color: Colors.blueGrey.shade200, fontSize: 12)),
                              Text(risk?.riskScore != null ? '${risk!.riskScore} / 100' : '-', style: const TextStyle(fontWeight: FontWeight.bold)),
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
          Expanded(
            child: ClipRRect(
              borderRadius: const BorderRadius.vertical(top: Radius.circular(16)),
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
                              child: Icon(
                                Icons.location_on_outlined,
                                color: Theme.of(context).colorScheme.primary.withValues(alpha: 0.7),
                                size: 30,
                              ),
                            ),
                          ),
                    ],
                  ),
                ],
              ),
            ),
          ),
          SafeArea(
            child: Padding(
              padding: const EdgeInsets.all(16.0),
              child: SizedBox(
                width: double.infinity,
                child: FilledButton.icon(
                  onPressed: () => _openFullWebMap(context),
                  icon: const Icon(Icons.open_in_browser),
                  label: const Text('Open Full Risk Map'),
                  style: FilledButton.styleFrom(
                    padding: const EdgeInsets.symmetric(vertical: 14),
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
