import 'dart:io';
import 'package:flutter/material.dart';

import '../theme/app_theme.dart';
import 'offline_hazard_report.dart';
import 'offline_report_store.dart';

class OfflineReportsPage extends StatelessWidget {
  final OfflineReportStore store;
  const OfflineReportsPage({super.key, required this.store});

  Widget _buildImage(String? imagePath) {
    if (imagePath != null && imagePath.isNotEmpty) {
      final file = File(imagePath);
      if (file.existsSync()) {
        return ClipRRect(
          borderRadius: BorderRadius.circular(12),
          child: Image.file(file, width: 64, height: 64, fit: BoxFit.cover),
        );
      }
    }
    return Container(
      width: 64,
      height: 64,
      decoration: BoxDecoration(
        color: TerraTheme.background,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: TerraTheme.border),
      ),
      child: const Icon(Icons.terrain_outlined, color: TerraTheme.textMuted, size: 28),
    );
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: TerraTheme.background,
      appBar: AppBar(
        title: const Text('FIELD REPORTS LOG'),
      ),
      body: FutureBuilder<List<OfflineHazardReport>>(
        future: store.all(),
        builder: (context, snapshot) {
          if (!snapshot.hasData) {
            return const Center(
              child: CircularProgressIndicator(color: TerraTheme.primary),
            );
          }
          final reports = snapshot.data!;
          if (reports.isEmpty) {
            return Center(
              child: Padding(
                padding: const EdgeInsets.all(32),
                child: Column(
                  mainAxisAlignment: MainAxisAlignment.center,
                  children: [
                    Container(
                      padding: const EdgeInsets.all(20),
                      decoration: BoxDecoration(
                        color: TerraTheme.surface,
                        shape: BoxShape.circle,
                        border: Border.all(color: TerraTheme.border),
                      ),
                      child: const Icon(Icons.inventory_2_outlined, size: 48, color: TerraTheme.textMuted),
                    ),
                    const SizedBox(height: 16),
                    const Text(
                      'No Field Evidence Logged',
                      style: TextStyle(color: TerraTheme.textPrimary, fontSize: 18, fontWeight: FontWeight.bold),
                    ),
                    const SizedBox(height: 6),
                    const Text(
                      'Reports captured outdoors will be stored on device and synced when connected to backend.',
                      style: TextStyle(color: TerraTheme.textSecondary, fontSize: 13),
                      textAlign: TextAlign.center,
                    ),
                  ],
                ),
              ),
            );
          }
          return ListView.separated(
            padding: const EdgeInsets.fromLTRB(16, 16, 16, 100),
            itemCount: reports.length,
            separatorBuilder: (_, __) => const SizedBox(height: 12),
            itemBuilder: (_, index) {
              final report = reports[index];
              final isSynced = report.status == ReportSyncStatus.synced;
              final statusColor = isSynced ? TerraTheme.primary : TerraTheme.warning;

              return Container(
                decoration: BoxDecoration(
                  color: TerraTheme.surface,
                  borderRadius: BorderRadius.circular(20),
                  border: Border.all(color: statusColor.withValues(alpha: 0.3), width: 1),
                ),
                child: Padding(
                  padding: const EdgeInsets.all(14),
                  child: Row(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      _buildImage(report.imagePath),
                      const SizedBox(width: 14),
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Row(
                              children: [
                                Expanded(
                                  child: Text(
                                    report.hazardType.name.toUpperCase(),
                                    style: const TextStyle(
                                      color: TerraTheme.textPrimary,
                                      fontWeight: FontWeight.bold,
                                      fontSize: 15,
                                      letterSpacing: 0.3,
                                    ),
                                  ),
                                ),
                                Container(
                                  padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                                  decoration: BoxDecoration(
                                    color: statusColor.withValues(alpha: 0.15),
                                    borderRadius: BorderRadius.circular(8),
                                    border: Border.all(color: statusColor.withValues(alpha: 0.5)),
                                  ),
                                  child: Row(
                                    mainAxisSize: MainAxisSize.min,
                                    children: [
                                      Container(
                                        width: 5,
                                        height: 5,
                                        decoration: BoxDecoration(color: statusColor, shape: BoxShape.circle),
                                      ),
                                      const SizedBox(width: 5),
                                      Text(
                                        isSynced ? 'SYNCED' : 'PENDING',
                                        style: TextStyle(
                                          color: statusColor,
                                          fontSize: 10,
                                          fontWeight: FontWeight.bold,
                                        ),
                                      ),
                                    ],
                                  ),
                                ),
                              ],
                            ),
                            if (report.description?.isNotEmpty == true) ...[
                              const SizedBox(height: 6),
                              Text(
                                report.description!,
                                maxLines: 2,
                                overflow: TextOverflow.ellipsis,
                                style: const TextStyle(color: TerraTheme.textSecondary, fontSize: 13, height: 1.3),
                              ),
                            ],
                            const SizedBox(height: 10),
                            Row(
                              children: [
                                const Icon(Icons.location_on_outlined, size: 14, color: TerraTheme.secondary),
                                const SizedBox(width: 4),
                                Text(
                                  '${report.latitude.toStringAsFixed(4)}°, ${report.longitude.toStringAsFixed(4)}°',
                                  style: const TextStyle(color: TerraTheme.secondary, fontSize: 11, fontFamily: 'monospace'),
                                ),
                                const Spacer(),
                                Text(
                                  isSynced ? 'AI Verified' : 'Queued',
                                  style: TextStyle(
                                    color: isSynced ? TerraTheme.primary : TerraTheme.warning,
                                    fontSize: 11,
                                    fontWeight: FontWeight.w600,
                                  ),
                                ),
                              ],
                            ),
                          ],
                        ),
                      ),
                    ],
                  ),
                ),
              );
            },
          );
        },
      ),
    );
  }
}
