import 'package:flutter/material.dart';

import 'offline_hazard_report.dart';
import 'offline_report_store.dart';

class OfflineReportsPage extends StatelessWidget {
  final OfflineReportStore store;
  const OfflineReportsPage({super.key, required this.store});

  @override
  Widget build(BuildContext context) => Scaffold(
        appBar: AppBar(title: const Text('My Reports')),
        body: FutureBuilder<List<OfflineHazardReport>>(
          future: store.all(),
          builder: (context, snapshot) {
            if (!snapshot.hasData) return const Center(child: CircularProgressIndicator());
            final reports = snapshot.data!;
            if (reports.isEmpty) return const Center(child: Text('No field reports yet.'));
            return ListView.builder(
              itemCount: reports.length,
              itemBuilder: (_, index) {
                final report = reports[index];
                return ListTile(
                  leading: const Icon(Icons.terrain),
                  title: Text(report.hazardType.name),
                  subtitle: Text('${report.latitude.toStringAsFixed(5)}, ${report.longitude.toStringAsFixed(5)}\n${report.capturedAt.toLocal()}'),
                  isThreeLine: true,
                  trailing: Chip(label: Text(report.status.name)),
                );
              },
            );
          },
        ),
      );
}
