import 'package:flutter/foundation.dart' show kIsWeb, defaultTargetPlatform, TargetPlatform;

class AppConfig {
  static const String webUrl = String.fromEnvironment(
    'TERRAGUARD_WEB_URL',
    defaultValue: 'http://localhost:3000',
  );

  static String get apiBaseUrl {
    const envUrl = String.fromEnvironment('TERRAGUARD_API_BASE_URL');
    if (envUrl.isNotEmpty) {
      return envUrl;
    }
    if (!kIsWeb && defaultTargetPlatform == TargetPlatform.android) {
      return 'http://10.0.2.2:8001';
    }
    return 'http://localhost:8001';
  }

  static Uri buildApiUri(String baseUrl, String endpoint, {Map<String, String>? queryParameters}) {
    final normalizedBase = baseUrl.trim().replaceAll(RegExp(r'/+$'), '');
    final normalizedEndpoint = endpoint.trim().replaceAll(RegExp(r'^/+'), '');
    final endpointWithoutApiPrefix = normalizedEndpoint.startsWith('api/')
        ? normalizedEndpoint.substring('api/'.length)
        : normalizedEndpoint == 'api'
            ? ''
            : normalizedEndpoint;

    final baseHasApiRoot = normalizedBase.toLowerCase().endsWith('/api');
    final pathRoot = baseHasApiRoot ? normalizedBase : '$normalizedBase/api';
    final path = endpointWithoutApiPrefix.isEmpty ? pathRoot : '$pathRoot/$endpointWithoutApiPrefix';

    return Uri.parse(path).replace(queryParameters: queryParameters);
  }

  static Uri apiUri(String endpoint, {Map<String, String>? queryParameters}) =>
      buildApiUri(apiBaseUrl, endpoint, queryParameters: queryParameters);
}
