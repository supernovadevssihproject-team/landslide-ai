import 'dart:convert';

import 'package:http/http.dart' as http;

class OperationalState {
  final String key;
  final String label;

  const OperationalState({required this.key, required this.label});
}

const operationalStates = <OperationalState>[
  OperationalState(key: 'uttarakhand', label: 'Uttarakhand'),
  OperationalState(key: 'sikkim', label: 'Sikkim'),
  OperationalState(key: 'assam', label: 'Assam'),
  OperationalState(key: 'meghalaya', label: 'Meghalaya'),
  OperationalState(key: 'arunachal', label: 'Arunachal Pradesh'),
  OperationalState(key: 'manipur', label: 'Manipur'),
  OperationalState(key: 'nagaland', label: 'Nagaland'),
  OperationalState(key: 'mizoram', label: 'Mizoram'),
  OperationalState(key: 'tripura', label: 'Tripura'),
];

class OperationalZone {
  final String id;
  final String name;
  final String state;
  final double latitude;
  final double longitude;
  final double? elevation;
  final double? slope;
  final Map<String, dynamic> raw;

  const OperationalZone({
    required this.id,
    required this.name,
    required this.state,
    required this.latitude,
    required this.longitude,
    required this.elevation,
    required this.slope,
    required this.raw,
  });

  factory OperationalZone.fromJson(Map<String, dynamic> json) {
    final id = json['id']?.toString();
    final name = json['name']?.toString();
    final state = json['state']?.toString();
    if (id == null || name == null || state == null) {
      throw const FormatException('Operational location is missing id, name, or state.');
    }

    final coordinates = _parseCoordinates(json['coords']?.toString());
    if (coordinates == null) {
      throw FormatException('Operational location "$name" has invalid coordinates.');
    }

    return OperationalZone(
      id: id,
      name: name,
      state: state,
      latitude: coordinates.$1,
      longitude: coordinates.$2,
      elevation: _parseNumber(json['elevation']),
      slope: _parseNumber(json['slopeGradient']),
      raw: json,
    );
  }

  static (double, double)? _parseCoordinates(String? value) {
    if (value == null) return null;
    final matches = RegExp(r'(-?\d+(?:\.\d+)?)\s*°?\s*[NS]?[^0-9-]+(-?\d+(?:\.\d+)?)\s*°?\s*[EW]?', caseSensitive: false).firstMatch(value);
    if (matches == null) return null;
    var latitude = double.tryParse(matches.group(1)!);
    var longitude = double.tryParse(matches.group(2)!);
    if (latitude == null || longitude == null) return null;
    if (value.toUpperCase().contains('S')) latitude = -latitude;
    if (value.toUpperCase().contains('W')) longitude = -longitude;
    if (latitude.abs() > 90 || longitude.abs() > 180) return null;
    return (latitude, longitude);
  }

  static double? _parseNumber(Object? value) {
    if (value is num) return value.toDouble();
    if (value == null) return null;
    final match = RegExp(r'-?\d+(?:\.\d+)?').firstMatch(value.toString().replaceAll(',', ''));
    return match == null ? null : double.tryParse(match.group(0)!);
  }
}

class RiskEvaluation {
  final String locationName;
  final String state;
  final double latitude;
  final double longitude;
  final int? riskScore;
  final double? baseProbability;
  final double? probabilityPercentage;
  final String? riskLevel;
  final Map<String, dynamic> rainfall;
  final Map<String, dynamic> seismic;

  const RiskEvaluation({
    required this.locationName,
    required this.state,
    required this.latitude,
    required this.longitude,
    required this.riskScore,
    required this.baseProbability,
    required this.probabilityPercentage,
    required this.riskLevel,
    required this.rainfall,
    required this.seismic,
  });

  factory RiskEvaluation.fromJson(Map<String, dynamic> json) {
    final location = _asMap(json['location']);
    final inputs = _asMap(json['inputs']);
    return RiskEvaluation(
      locationName: location['name']?.toString() ?? 'Selected location',
      state: location['state']?.toString() ?? '',
      latitude: _number(location['latitude']) ?? 0,
      longitude: _number(location['longitude']) ?? 0,
      riskScore: _number(json['final_risk_score'])?.round(),
      baseProbability: _number(json['base_ml_probability']),
      probabilityPercentage: _number(json['probability_percentage']),
      riskLevel: json['risk_level']?.toString(),
      rainfall: _asMap(inputs['rainfall']),
      seismic: _asMap(inputs['seismic']),
    );
  }

  static Map<String, dynamic> _asMap(Object? value) => value is Map ? Map<String, dynamic>.from(value) : <String, dynamic>{};

  static double? _number(Object? value) => value is num ? value.toDouble() : double.tryParse(value?.toString() ?? '');
}

class OperationalRiskApiException implements Exception {
  final String message;

  const OperationalRiskApiException(this.message);

  @override
  String toString() => message;
}

class OperationalRiskApi {
  final Uri baseUri;
  final http.Client client;

  OperationalRiskApi({required this.baseUri, http.Client? client}) : client = client ?? http.Client();

  Future<List<OperationalZone>> getZones(String state) async {
    final uri = baseUri.replace(path: '${baseUri.path}/api/zones', queryParameters: {'state': state});
    final response = await _get(uri);
    final decoded = jsonDecode(response.body);
    if (decoded is! List) throw const OperationalRiskApiException('The location response was invalid.');
    try {
      return decoded.map((item) => OperationalZone.fromJson(Map<String, dynamic>.from(item as Map))).toList();
    } on FormatException catch (error) {
      throw OperationalRiskApiException(error.message);
    }
  }

  Future<RiskEvaluation> getLocationRisk(OperationalZone zone) async {
    final uri = baseUri.replace(path: '${baseUri.path}/api/ml/location-risk');
    try {
      final response = await client
          .post(
            uri,
            headers: const {'Accept': 'application/json', 'Content-Type': 'application/json'},
            body: jsonEncode({
              'name': zone.name,
              'location_type': 'region',
              'latitude': zone.latitude,
              'longitude': zone.longitude,
              'state': zone.state,
              if (zone.elevation != null) 'elevation': zone.elevation,
              if (zone.slope != null) 'slope': zone.slope,
              'extra_rainfall': 0.0,
            }),
          )
          .timeout(const Duration(seconds: 10));
      if (response.statusCode < 200 || response.statusCode >= 300) {
        throw OperationalRiskApiException('Risk API failed (${response.statusCode}).');
      }
      final decoded = jsonDecode(response.body);
      if (decoded is! Map) throw const OperationalRiskApiException('The risk response was invalid.');
      return RiskEvaluation.fromJson(Map<String, dynamic>.from(decoded));
    } on OperationalRiskApiException {
      rethrow;
    } catch (_) {
      throw const OperationalRiskApiException('Risk evaluation request timed out or network failed.');
    }
  }

  Future<http.Response> _get(Uri uri) async {
    try {
      final response = await client.get(uri, headers: const {'Accept': 'application/json'}).timeout(const Duration(seconds: 15));
      if (response.statusCode < 200 || response.statusCode >= 300) {
        throw OperationalRiskApiException('Location API failed (${response.statusCode}).');
      }
      return response;
    } on OperationalRiskApiException {
      rethrow;
    } catch (_) {
      throw const OperationalRiskApiException('Backend unavailable or request timed out.');
    }
  }
}
