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
      return 'http://10.0.2.2:8000';
    }
    return 'http://localhost:8000';
  }
}
