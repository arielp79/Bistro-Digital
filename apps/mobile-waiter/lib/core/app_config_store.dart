import 'package:shared_preferences/shared_preferences.dart';

import 'config.dart';

class AppConfigStore {
  AppConfigStore(this._prefs);

  final SharedPreferences _prefs;

  static const _tenantSlugKey = 'tenant_slug';
  static const _apiBaseUrlKey = 'api_base_url';
  static const _lastEmailKey = 'last_email';

  String get tenantSlug =>
      (_prefs.getString(_tenantSlugKey) ?? AppConfigDefaults.defaultTenantSlug).trim();

  String get apiBaseUrl =>
      (_prefs.getString(_apiBaseUrlKey) ?? AppConfigDefaults.defaultApiBaseUrl).trim();

  String get lastEmail => (_prefs.getString(_lastEmailKey) ?? '').trim();

  Future<void> setTenantSlug(String value) async {
    await _prefs.setString(_tenantSlugKey, value.trim().toLowerCase());
  }

  Future<void> setApiBaseUrl(String value) async {
    await _prefs.setString(_apiBaseUrlKey, value.trim());
  }

  Future<void> setLastEmail(String value) async {
    await _prefs.setString(_lastEmailKey, value.trim());
  }
}

