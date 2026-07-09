import 'package:flutter/foundation.dart';

class AppConfigDefaults {
  static const defaultTenantSlug = 'bistro-digital';

  static String get defaultApiBaseUrl {
    const override = String.fromEnvironment('API_URL');
    if (override.isNotEmpty) return override;

    // 10.0.2.2 = localhost del host desde emulador Android (no aplica en web)
    if (!kIsWeb && defaultTargetPlatform == TargetPlatform.android) {
      return 'http://10.0.2.2:3000';
    }
    return 'http://localhost:3000';
  }
}
