import 'dart:convert';

class CachedOperationalZone {
  final String id;
  final String state;
  final String name;
  final String? subdivision;
  final String? corridor;
  final double latitude;
  final double longitude;
  final double? elevation;
  final double? slope;
  final String? aspect;
  final String? riskLevel;
  final DateTime lastUpdated;

  const CachedOperationalZone({
    required this.id,
    required this.state,
    required this.name,
    this.subdivision,
    this.corridor,
    required this.latitude,
    required this.longitude,
    this.elevation,
    this.slope,
    this.aspect,
    this.riskLevel,
    required this.lastUpdated,
  });

  factory CachedOperationalZone.fromApi(Map<String, dynamic> json) {
    final coords = json['coords']?.toString() ?? '';
    final numbers = RegExp(r'-?\d+(?:\.\d+)?').allMatches(coords).map((m) => double.parse(m.group(0)!)).toList();
    final lat = (json['latitude'] as num?)?.toDouble() ?? (numbers.isNotEmpty ? numbers[0] : null);
    final lon = (json['longitude'] as num?)?.toDouble() ?? (numbers.length > 1 ? numbers[1] : null);
    if (json['id'] == null || json['state'] == null || json['name'] == null || lat == null || lon == null) {
      throw const FormatException('Zone response is missing required fields.');
    }
    return CachedOperationalZone(
      id: json['id'].toString(), state: json['state'].toString(), name: json['name'].toString(),
      subdivision: json['subdivision']?.toString() ?? json['subDivision']?.toString(),
      corridor: json['corridor']?.toString(), latitude: lat, longitude: lon,
      elevation: _num(json['elevation']), slope: _num(json['slope'] ?? json['slopeGradient']),
      aspect: json['aspect']?.toString(), riskLevel: json['risk_level']?.toString(), lastUpdated: DateTime.now().toUtc(),
    );
  }

  Map<String, Object?> toMap() => {'id': id, 'state': state, 'name': name, 'subdivision': subdivision, 'corridor': corridor,
    'latitude': latitude, 'longitude': longitude, 'elevation': elevation, 'slope': slope, 'aspect': aspect,
    'risk_level': riskLevel, 'last_updated': lastUpdated.toIso8601String()};

  factory CachedOperationalZone.fromMap(Map<String, Object?> m) => CachedOperationalZone(
    id: m['id']! as String, state: m['state']! as String, name: m['name']! as String,
    subdivision: m['subdivision'] as String?, corridor: m['corridor'] as String?, latitude: (m['latitude'] as num).toDouble(),
    longitude: (m['longitude'] as num).toDouble(), elevation: _num(m['elevation']), slope: _num(m['slope']), aspect: m['aspect'] as String?,
    riskLevel: m['risk_level'] as String?, lastUpdated: DateTime.parse(m['last_updated']! as String));

  static double? _num(Object? value) => value is num ? value.toDouble() : double.tryParse(value?.toString() ?? '');
}

class CachedRiskEvaluation {
  final String zoneId, state, riskLevel;
  final double latitude, longitude, riskScore;
  final double? baseProbability, finalProbability, seismicAdjustment;
  final Map<String, dynamic> rainfall, seismic;
  final DateTime evaluatedAt;

  const CachedRiskEvaluation({required this.zoneId, required this.state, required this.latitude, required this.longitude,
    required this.riskScore, required this.riskLevel, this.baseProbability, this.finalProbability, this.seismicAdjustment,
    this.rainfall = const {}, this.seismic = const {}, required this.evaluatedAt});

  Map<String, Object?> toMap() => {'zone_id': zoneId, 'state': state, 'latitude': latitude, 'longitude': longitude, 'risk_score': riskScore,
    'risk_level': riskLevel, 'base_probability': baseProbability, 'final_probability': finalProbability, 'seismic_adjustment': seismicAdjustment,
    'rainfall_1d': rainfall['rainfall_1d_mm'], 'rainfall_3d': rainfall['rainfall_3d_mm'], 'rainfall_7d': rainfall['rainfall_7d_mm'],
    'rainfall_15d': rainfall['rainfall_15d_mm'], 'rainfall_30d': rainfall['rainfall_30d_mm'], 'seismic_event_count': seismic['events_in_range_500km'],
    'nearest_seismic_distance': seismic['nearest_event_distance_km'], 'max_seismic_magnitude': seismic['max_magnitude'], 'evaluated_at': evaluatedAt.toIso8601String()};

  factory CachedRiskEvaluation.fromMap(Map<String, Object?> m) => CachedRiskEvaluation(
    zoneId: m['zone_id']! as String, state: m['state']! as String, latitude: (m['latitude'] as num).toDouble(), longitude: (m['longitude'] as num).toDouble(),
    riskScore: (m['risk_score'] as num).toDouble(), riskLevel: m['risk_level']! as String, baseProbability: _num(m['base_probability']),
    finalProbability: _num(m['final_probability']), seismicAdjustment: _num(m['seismic_adjustment']), evaluatedAt: DateTime.parse(m['evaluated_at']! as String));
  static double? _num(Object? v) => v is num ? v.toDouble() : double.tryParse(v?.toString() ?? '');
}

class FieldClassificationResult {
  final String reportId, predictedClass, severity, modelVersion, processedAt;
  final double confidence;
  const FieldClassificationResult({required this.reportId, required this.predictedClass, required this.confidence, required this.severity, required this.modelVersion, required this.processedAt});
  factory FieldClassificationResult.fromJson(Map<String, dynamic> json) => FieldClassificationResult(
    reportId: json['report_id'].toString(), predictedClass: json['predicted_class'].toString(), confidence: (json['confidence'] as num).toDouble(),
    severity: json['severity'].toString(), modelVersion: json['model_version'].toString(), processedAt: json['processed_at'].toString());
  Map<String, dynamic> toJson() => {'report_id': reportId, 'predicted_class': predictedClass, 'confidence': confidence, 'severity': severity, 'model_version': modelVersion, 'processed_at': processedAt};
  String encode() => jsonEncode(toJson());
}
