import 'dart:convert';

import 'package:http/http.dart' as http;

import 'offline_hazard_report.dart';
import 'offline_sync_manager.dart';

/// JSON adapter for LandslideGuard's POST /api/reports/submit contract.
class TerraGuardHttpSyncApi implements TerraGuardSyncApi {
  final Uri reportsEndpoint;
  final Future<String?> Function()? accessToken;
  final http.Client client;

  TerraGuardHttpSyncApi({
    required this.reportsEndpoint,
    this.accessToken,
    http.Client? client,
  }) : client = client ?? http.Client();

  @override
  Future<void> uploadReport(OfflineHazardReport report) async {
    final headers = <String, String>{
      'Accept': 'application/json',
      'Content-Type': 'application/json',
    };
    final token = accessToken == null ? null : await accessToken!();
    if (token != null && token.isNotEmpty) {
      headers['Authorization'] = 'Bearer $token';
    }

    final response = await client.post(
      reportsEndpoint,
      headers: headers,
      body: jsonEncode({
        'location': '${report.latitude}, ${report.longitude}',
        'subDivision': 'Mobile Field Report',
        'state': 'sikkim',
        'description': [
          '[${report.hazardType.name}]',
          if (report.description?.isNotEmpty == true) report.description,
          'report_id=${report.reportId}',
          'captured_at=${report.capturedAt.toUtc().toIso8601String()}',
          'device_id=${report.deviceId}',
          'coordinates=${report.latitude},${report.longitude}',
        ].join(' '),
        'coordinates': '${report.latitude}° N, ${report.longitude}° E',
      }),
    );

    if (response.statusCode < 200 || response.statusCode >= 300) {
      throw StateError('Report upload failed (${response.statusCode}): ${response.body}');
    }
  }
}
