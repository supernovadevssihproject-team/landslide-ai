import 'dart:convert';
import 'dart:io';

import 'package:http/http.dart' as http;

import 'offline_hazard_report.dart';
import 'offline_sync_manager.dart';

/// Multipart/JSON adapter for POST /api/reports/submit.
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
  Future<String?> uploadReport(OfflineHazardReport report) async {
    final token = accessToken == null ? null : await accessToken!();
    final hasImage = report.imagePath != null &&
        report.imagePath!.isNotEmpty &&
        File(report.imagePath!).existsSync();
    final location = '${report.latitude.toStringAsFixed(5)}, ${report.longitude.toStringAsFixed(5)}';
    final coordinates = '${report.latitude.toStringAsFixed(5)},${report.longitude.toStringAsFixed(5)}';
    final desc = [
      '[${report.hazardType.name.toUpperCase()}]',
      if (report.description?.isNotEmpty == true) report.description,
      'report_id=${report.reportId}',
      'captured_at=${report.capturedAt.toUtc().toIso8601String()}',
    ].join(' ');

    if (hasImage) {
      final request = http.MultipartRequest('POST', reportsEndpoint);
      if (token != null && token.isNotEmpty) request.headers['Authorization'] = 'Bearer $token';
      request.headers['Accept'] = 'application/json';
      request.fields.addAll({
        'location': location,
        'subDivision': 'Mobile Field Report',
        'state': 'sikkim',
        'description': desc,
        'latitude': report.latitude.toString(),
        'longitude': report.longitude.toString(),
        'deviceId': report.deviceId,
        'coordinates': coordinates,
      });
      request.files.add(await http.MultipartFile.fromPath('file', report.imagePath!));
      final response = await http.Response.fromStream(await request.send());
      if (response.statusCode < 200 || response.statusCode >= 300) {
        throw StateError('Multipart report upload failed (${response.statusCode}): ${response.body}');
      }
      return response.body;
    }

    final headers = <String, String>{'Accept': 'application/json', 'Content-Type': 'application/json'};
    if (token != null && token.isNotEmpty) headers['Authorization'] = 'Bearer $token';
    final response = await client.post(
      reportsEndpoint,
      headers: headers,
      body: jsonEncode({
        'location': location,
        'subDivision': 'Mobile Field Report',
        'state': 'sikkim',
        'description': desc,
        'latitude': report.latitude,
        'longitude': report.longitude,
        'deviceId': report.deviceId,
        'coordinates': coordinates,
      }),
    );
    if (response.statusCode < 200 || response.statusCode >= 300) {
      throw StateError('Report upload failed (${response.statusCode}): ${response.body}');
    }
    return response.body;
  }
}
