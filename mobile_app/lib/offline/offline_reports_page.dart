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
          borderRadius: BorderRadius.circular(14),
          child: Image.file(file, width: 68, height: 68, fit: BoxFit.cover),
        );
      }
    }
    return Container(
      width: 68,
      height: 68,
      decoration: BoxDecoration(
        color: TerraTheme.background,
        borderRadius: BorderRadius.circular(14),
        border: Border.all(color: TerraTheme.border),
      ),
      child: const Icon(Icons.terrain_outlined, color: TerraTheme.textMuted, size: 30),
    );
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: TerraTheme.background,
      appBar: AppBar(
        title: const Text('FIELD EVIDENCE LOG'),
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
                      padding: const EdgeInsets.all(22),
                      decoration: BoxDecoration(
                        color: TerraTheme.surface,
                        shape: BoxShape.circle,
                        border: Border.all(color: TerraTheme.border, width: 1.5),
                        boxShadow: [
                          BoxShadow(
                            color: Colors.black.withValues(alpha: 0.3),
                            blurRadius: 16,
                            offset: const Offset(0, 6),
                          ),
                        ],
                      ),
                      child: const Icon(Icons.inventory_2_outlined, size: 52, color: TerraTheme.textMuted),
                    ),
                    const SizedBox(height: 20),
                    const Text(
                      'No Field Reports Logged',
                      style: TextStyle(color: TerraTheme.textPrimary, fontSize: 18, fontWeight: FontWeight.bold),
                    ),
                    const SizedBox(height: 8),
                    const Text(
                      'Geo-tagged field evidence captured outdoors will be stored securely on device and synced when reconnected.',
                      style: TextStyle(color: TerraTheme.textSecondary, fontSize: 13, height: 1.4),
                      textAlign: TextAlign.center,
                    ),
                  ],
                ),
              ),
            );
          }

          final syncedCount = reports.where((r) => r.status == ReportSyncStatus.synced || r.status == ReportSyncStatus.analyzed).length;
          final pendingCount = reports.length - syncedCount;

          return ListView(
            padding: const EdgeInsets.fromLTRB(16, 16, 16, 100),
            children: [
              // Summary Banner Card
              Container(
                padding: const EdgeInsets.all(16),
                decoration: BoxDecoration(
                  color: TerraTheme.surface,
                  borderRadius: BorderRadius.circular(20),
                  border: Border.all(color: TerraTheme.border),
                ),
                child: Row(
                  mainAxisAlignment: MainAxisAlignment.spaceAround,
                  children: [
                    Column(
                      children: [
                        const Text('TOTAL LOGGED', style: TextStyle(color: TerraTheme.textMuted, fontSize: 10, fontWeight: FontWeight.bold)),
                        const SizedBox(height: 4),
                        Text('${reports.length}', style: const TextStyle(color: TerraTheme.textPrimary, fontSize: 20, fontWeight: FontWeight.bold)),
                      ],
                    ),
                    const SizedBox(height: 32, child: VerticalDivider(color: TerraTheme.border)),
                    Column(
                      children: [
                        const Text('SYNCED', style: TextStyle(color: TerraTheme.textMuted, fontSize: 10, fontWeight: FontWeight.bold)),
                        const SizedBox(height: 4),
                        Text('$syncedCount', style: const TextStyle(color: TerraTheme.primary, fontSize: 20, fontWeight: FontWeight.bold)),
                      ],
                    ),
                    const SizedBox(height: 32, child: VerticalDivider(color: TerraTheme.border)),
                    Column(
                      children: [
                        const Text('QUEUED / PENDING', style: TextStyle(color: TerraTheme.textMuted, fontSize: 10, fontWeight: FontWeight.bold)),
                        const SizedBox(height: 4),
                        Text('$pendingCount', style: const TextStyle(color: TerraTheme.warning, fontSize: 20, fontWeight: FontWeight.bold)),
                      ],
                    ),
                  ],
                ),
              ),
              const SizedBox(height: 16),

              // Report Cards List
              ...reports.map((report) {
                final isSynced = report.status == ReportSyncStatus.synced || report.status == ReportSyncStatus.analyzed;
                final statusColor = isSynced ? TerraTheme.primary : TerraTheme.warning;

                return Container(
                  margin: const EdgeInsets.only(bottom: 12),
                  decoration: BoxDecoration(
                    color: TerraTheme.surface,
                    borderRadius: BorderRadius.circular(20),
                    border: Border.all(color: statusColor.withValues(alpha: 0.3), width: 1.2),
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
                                          width: 6,
                                          height: 6,
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
                                    report.classificationResult != null
                                        ? 'AI: ${report.classificationResult}'
                                        : (isSynced ? 'AI Verified' : 'Queued'),
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
              }),
            ],
          );
        },
      ),
    );
  }
}
