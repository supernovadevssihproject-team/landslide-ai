import 'dart:convert';
import 'dart:io';

import 'package:http/http.dart' as http;

import 'offline_hazard_report.dart';
import 'offline_sync_manager.dart';

/// Uploads the existing report and, when an image exists, runs the separate
/// field-report classifier. It never calls or changes location-risk inference.
class TerraGuardHttpSyncApi implements TerraGuardSyncApi {
  final Uri reportsEndpoint;
  final Future<String?> Function()? accessToken;
  final http.Client client;

  TerraGuardHttpSyncApi({required this.reportsEndpoint, this.accessToken, http.Client? client}) : client = client ?? http.Client();

  @override
  Future<String?> uploadReport(OfflineHazardReport report) async {
    final token = accessToken == null ? null : await accessToken!();
    final hasImage = report.imagePath != null && report.imagePath!.isNotEmpty && File(report.imagePath!).existsSync();
    final location = '${report.latitude.toStringAsFixed(5)}, ${report.longitude.toStringAsFixed(5)}';
    final coordinates = '${report.latitude.toStringAsFixed(5)},${report.longitude.toStringAsFixed(5)}';
    final desc = ['[${report.hazardType.name.toUpperCase()}]', if (report.description?.isNotEmpty == true) report.description,
      'report_id=${report.reportId}', 'captured_at=${report.capturedAt.toUtc().toIso8601String()}'].join(' ');
    final response = hasImage
        ? await _submitMultipart(report, token, location, coordinates, desc)
        : await _submitJson(report, token, location, coordinates, desc);
    if (hasImage) {
      final classification = await _classify(report, token);
      final server = jsonDecode(response.body) is Map ? Map<String, dynamic>.from(jsonDecode(response.body) as Map) : <String, dynamic>{};
      server['classification'] = classification['predicted_class'];
      server['confidence'] = classification['confidence'];
      server['classification_result'] = jsonEncode(classification);
      server['classifier_model_version'] = classification['model_version'];
      return jsonEncode(server);
    }
    return response.body;
  }

  Future<http.Response> _submitMultipart(OfflineHazardReport report, String? token, String location, String coordinates, String desc) async {
    final request = http.MultipartRequest('POST', reportsEndpoint);
    _auth(request.headers, token);
    request.headers['Accept'] = 'application/json';
    request.fields.addAll({'location': location, 'subDivision': 'Mobile Field Report', 'state': report.state ?? 'sikkim',
      'description': desc, 'latitude': report.latitude.toString(), 'longitude': report.longitude.toString(), 'deviceId': report.deviceId,
      'coordinates': coordinates, if (report.zoneId != null) 'zone_id': report.zoneId!});
    request.files.add(await http.MultipartFile.fromPath('file', report.imagePath!));
    final response = await http.Response.fromStream(await request.send());
    _ensureSuccess(response, 'Multipart report upload');
    return response;
  }

  Future<http.Response> _submitJson(OfflineHazardReport report, String? token, String location, String coordinates, String desc) async {
    final headers = <String, String>{'Accept': 'application/json', 'Content-Type': 'application/json'};
    _auth(headers, token);
    final response = await client.post(reportsEndpoint, headers: headers, body: jsonEncode({'location': location, 'subDivision': 'Mobile Field Report',
      'state': report.state ?? 'sikkim', 'description': desc, 'latitude': report.latitude, 'longitude': report.longitude, 'deviceId': report.deviceId,
      'coordinates': coordinates, if (report.zoneId != null) 'zone_id': report.zoneId}));
    _ensureSuccess(response, 'Report upload');
    return response;
  }

  Future<Map<String, dynamic>> _classify(OfflineHazardReport report, String? token) async {
    final endpoint = reportsEndpoint.replace(path: reportsEndpoint.path.replaceFirst(RegExp(r'/submit/?$'), '/classify'));
    final request = http.MultipartRequest('POST', endpoint);
    _auth(request.headers, token);
    request.headers['Accept'] = 'application/json';
    request.fields.addAll({'report_id': report.reportId, 'hazard_type': report.hazardType.name, 'latitude': report.latitude.toString(),
      'longitude': report.longitude.toString(), 'state': report.state ?? 'sikkim', 'description': report.description ?? '',
      'timestamp': report.capturedAt.toUtc().toIso8601String(), if (report.zoneId != null) 'zone_id': report.zoneId!});
    request.files.add(await http.MultipartFile.fromPath('image', report.imagePath!));
    final response = await http.Response.fromStream(await request.send());
    _ensureSuccess(response, 'AI classification');
    final decoded = jsonDecode(response.body);
    if (decoded is! Map) throw const FormatException('Invalid classification response');
    return Map<String, dynamic>.from(decoded);
  }

  static void _auth(Map<String, String> headers, String? token) { if (token != null && token.isNotEmpty) headers['Authorization'] = 'Bearer $token'; }
  static void _ensureSuccess(http.Response response, String operation) { if (response.statusCode < 200 || response.statusCode >= 300) throw StateError('$operation failed (${response.statusCode}): ${response.body}'); }
}
