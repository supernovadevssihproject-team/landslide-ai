import 'dart:convert';

import 'package:connectivity_plus/connectivity_plus.dart';
import 'package:http/http.dart' as http;

import 'config/app_config.dart';
import 'offline/offline_report_store.dart';

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

enum RiskDataSource { live, cached, unavailable }

class RiskEvaluation {
  final String locationName;
  final String state;
  final double latitude;
  final double longitude;
  final int? riskScore;
  final double? baseProbability;
  final double? probabilityPercentage;
  final String? riskLevel;
  final RiskDataSource dataSource;
  final Map<String, dynamic> rainfall;
  final Map<String, dynamic> seismic;

  factory RiskEvaluation.unavailable(OperationalZone zone) => RiskEvaluation(
        locationName: zone.name,
        state: zone.state,
        latitude: zone.latitude,
        longitude: zone.longitude,
        riskScore: null,
        baseProbability: null,
        probabilityPercentage: null,
        riskLevel: 'UNAVAILABLE',
        dataSource: RiskDataSource.unavailable,
        rainfall: const {},
        seismic: const {},
      );

  const RiskEvaluation({
    required this.locationName,
    required this.state,
    required this.latitude,
    required this.longitude,
    required this.riskScore,
    required this.baseProbability,
    required this.probabilityPercentage,
    required this.riskLevel,
    required this.dataSource,
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
      dataSource: RiskDataSource.live,
      rainfall: _asMap(inputs['rainfall']),
      seismic: _asMap(inputs['seismic']),
    );
  }

  String get dataSourceLabel {
    switch (dataSource) {
      case RiskDataSource.live:
        return 'LIVE';
      case RiskDataSource.cached:
        return 'CACHED';
      case RiskDataSource.unavailable:
        return 'UNAVAILABLE';
    }
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
  final Future<List<ConnectivityResult>> Function()? connectivityChecker;
  final OfflineReportStore store;

  OperationalRiskApi({
    required this.baseUri,
    http.Client? client,
    this.connectivityChecker,
    OfflineReportStore? store,
  })  : client = client ?? http.Client(),
        store = store ?? OfflineReportStore();

  Uri _apiUri(String endpoint, {Map<String, String>? queryParameters}) =>
      AppConfig.buildApiUri(baseUri.toString(), endpoint, queryParameters: queryParameters);

  Future<List<OperationalZone>> getZones(String state) async {
    if (await _isOffline()) {
      return _offlineZones(state);
    }

    final uri = _apiUri('zones', queryParameters: {'state': state});
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
    final cachedRisk = await _cachedRisk(zone);
    if (await _isOffline()) {
      return cachedRisk ?? RiskEvaluation.unavailable(zone);
    }

    final uri = _apiUri('ml/location-risk');
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
        if (cachedRisk != null) return cachedRisk;
        throw OperationalRiskApiException('Risk API failed (${response.statusCode}).');
      }
      final decoded = jsonDecode(response.body);
      if (decoded is! Map) {
        if (cachedRisk != null) return cachedRisk;
        throw const OperationalRiskApiException('The risk response was invalid.');
      }
      final risk = RiskEvaluation.fromJson(Map<String, dynamic>.from(decoded));
      await store.saveRiskCache(_riskCacheKey(zone), response.body);
      return risk;
    } on OperationalRiskApiException {
      if (cachedRisk != null) return cachedRisk;
      rethrow;
    } catch (_) {
      if (cachedRisk != null) return cachedRisk;
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

  Future<bool> isOffline() async {
    final checker = connectivityChecker ?? Connectivity().checkConnectivity;
    final statuses = await checker();
    return statuses.every((status) => status == ConnectivityResult.none);
  }

  Future<bool> _isOffline() => isOffline();

  Future<RiskEvaluation?> _cachedRisk(OperationalZone zone) async {
    final payload = await store.riskCache(_riskCacheKey(zone));
    if (payload == null || payload.trim().isEmpty) return null;
    try {
      final decoded = jsonDecode(payload);
      if (decoded is! Map) return null;
      final risk = RiskEvaluation.fromJson(Map<String, dynamic>.from(decoded));
      return RiskEvaluation(
        locationName: risk.locationName,
        state: risk.state,
        latitude: risk.latitude,
        longitude: risk.longitude,
        riskScore: risk.riskScore,
        baseProbability: risk.baseProbability,
        probabilityPercentage: risk.probabilityPercentage,
        riskLevel: risk.riskLevel,
        dataSource: RiskDataSource.cached,
        rainfall: risk.rainfall,
        seismic: risk.seismic,
      );
    } catch (_) {
      return null;
    }
  }

  String _riskCacheKey(OperationalZone zone) => '${zone.state}:${zone.id}';

  List<OperationalZone> _offlineZones(String state) {
    final normalized = state.trim().toLowerCase();
    final base = <Map<String, dynamic>>[
      {
        'id': 'offline-utt-1',
        'name': 'Rishikesh Corridor',
        'state': 'uttarakhand',
        'coords': '30.0869° N, 78.2676° E',
        'elevation': 350,
        'slopeGradient': 34.0,
      },
      {
        'id': 'offline-utt-2',
        'name': 'Nainital Ridge',
        'state': 'uttarakhand',
        'coords': '29.3806° N, 79.4535° E',
        'elevation': 1938,
        'slopeGradient': 42.0,
      },
      {
        'id': 'offline-utt-3',
        'name': 'Chamoli Valley',
        'state': 'uttarakhand',
        'coords': '30.4144° N, 79.3227° E',
        'elevation': 1200,
        'slopeGradient': 38.0,
      },
    ];

    final selected = normalized.contains('sikkim')
        ? <Map<String, dynamic>>[
            {
              'id': 'offline-sik-1',
              'name': 'Gangtok Hills',
              'state': 'sikkim',
              'coords': '27.3389° N, 88.6065° E',
              'elevation': 1700,
              'slopeGradient': 40.0,
            },
            {
              'id': 'offline-sik-2',
              'name': 'Namchi Ridge',
              'state': 'sikkim',
              'coords': '27.1641° N, 88.3573° E',
              'elevation': 1500,
              'slopeGradient': 37.5,
            },
          ]
        : base;

    return selected.map((item) => OperationalZone.fromJson(item)).toList();
  }

}
