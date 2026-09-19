import 'dart:io';
import 'package:flutter/material.dart';

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
          borderRadius: BorderRadius.circular(8),
          child: Image.file(file, width: 56, height: 56, fit: BoxFit.cover),
        );
      }
    }
    return Container(
      width: 56,
      height: 56,
      decoration: BoxDecoration(
        color: Colors.blueGrey.shade800,
        borderRadius: BorderRadius.circular(8),
      ),
      child: const Icon(Icons.terrain, color: Colors.white70),
    );
  }

  @override
  Widget build(BuildContext context) => Scaffold(
        appBar: AppBar(
          title: const Text('My Reports'),
        ),
        body: FutureBuilder<List<OfflineHazardReport>>(
          future: store.all(),
          builder: (context, snapshot) {
            if (!snapshot.hasData) return const Center(child: CircularProgressIndicator());
            final reports = snapshot.data!;
            if (reports.isEmpty) {
              return Center(
                child: Column(
                  mainAxisAlignment: MainAxisAlignment.center,
                  children: [
                    Icon(Icons.inventory_2_outlined, size: 64, color: Colors.blueGrey.shade400),
                    const SizedBox(height: 16),
                    Text('No field reports recorded yet.', style: TextStyle(color: Colors.blueGrey.shade200, fontSize: 16)),
                  ],
                ),
              );
            }
            return ListView.separated(
              padding: const EdgeInsets.all(16),
              itemCount: reports.length,
              separatorBuilder: (_, __) => const SizedBox(height: 12),
              itemBuilder: (_, index) {
                final report = reports[index];
                final isSynced = report.status == ReportSyncStatus.synced;
                return Card(
                  child: Padding(
                    padding: const EdgeInsets.all(12),
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
                                      style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 16),
                                    ),
                                  ),
                                  Chip(
                                    labelPadding: const EdgeInsets.symmetric(horizontal: 6, vertical: 0),
                                    visualDensity: VisualDensity.compact,
                                    backgroundColor: isSynced ? Colors.green.shade900.withValues(alpha: 0.5) : Colors.orange.shade900.withValues(alpha: 0.5),
                                    label: Text(
                                      isSynced ? 'Synced' : 'Local / Pending',
                                      style: TextStyle(fontSize: 11, color: isSynced ? Colors.green.shade200 : Colors.orange.shade200),
                                    ),
                                  ),
                                ],
                              ),
                              if (report.description?.isNotEmpty == true) ...[
                                const SizedBox(height: 4),
                                Text(
                                  report.description!,
                                  maxLines: 2,
                                  overflow: TextOverflow.ellipsis,
                                  style: TextStyle(color: Colors.grey.shade300, fontSize: 13),
                                ),
                              ],
                              const SizedBox(height: 8),
                              Row(
                                children: [
                                  Icon(Icons.location_on, size: 14, color: Theme.of(context).colorScheme.primary),
                                  const SizedBox(width: 4),
                                  Text(
                                    '${report.latitude.toStringAsFixed(4)}°, ${report.longitude.toStringAsFixed(4)}°',
                                    style: TextStyle(color: Colors.blueGrey.shade200, fontSize: 12),
                                  ),
                                  const Spacer(),
                                  Text(
                                    'Classification: ${isSynced ? "AI Verified" : "Pending"}',
                                    style: TextStyle(color: isSynced ? Colors.green.shade300 : Colors.amber.shade300, fontSize: 11, fontWeight: FontWeight.w500),
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
