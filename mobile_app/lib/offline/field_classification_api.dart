import 'dart:convert';
import 'dart:io';

import 'package:http/http.dart' as http;

import 'offline_hazard_report.dart';

class FieldClassificationApi {
  final Uri endpoint;
  final http.Client client;

  FieldClassificationApi({required this.endpoint, http.Client? client}) : client = client ?? http.Client();

  Future<Map<String, dynamic>> classify({required OfflineHazardReport report}) async {
    final imagePath = report.imagePath;
    if (imagePath == null || imagePath.isEmpty || !File(imagePath).existsSync()) {
      throw StateError('A local image is required for AI classification.');
    }
    final request = http.MultipartRequest('POST', endpoint);
    request.fields.addAll({
      'report_id': report.reportId,
      'hazard_type': report.hazardType.name,
      'latitude': report.latitude.toString(),
      'longitude': report.longitude.toString(),
      'description': report.description ?? '',
      'timestamp': report.capturedAt.toUtc().toIso8601String(),
    });
    request.files.add(await http.MultipartFile.fromPath('image', imagePath));
    final response = await http.Response.fromStream(await request.send());
    if (response.statusCode < 200 || response.statusCode >= 300) {
      throw StateError('Classification failed (${response.statusCode}): ${response.body}');
    }
    final decoded = jsonDecode(response.body);
    if (decoded is! Map) throw const FormatException('Invalid classification response.');
    return Map<String, dynamic>.from(decoded);
  }
}
