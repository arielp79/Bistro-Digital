import 'package:dio/dio.dart';

import 'package:shared_preferences/shared_preferences.dart';

import 'config.dart';

import 'models.dart';



typedef TokenRefreshCallback = void Function(String accessToken, String refreshToken);

typedef AuthFailureCallback = void Function();



class ApiClient {

  ApiClient(this._prefs) {

    _dio = Dio(BaseOptions(

      baseUrl: AppConfig.apiBaseUrl,

      connectTimeout: const Duration(seconds: 10),

      receiveTimeout: const Duration(seconds: 15),

      headers: {'X-Tenant-ID': AppConfig.tenantSlug},

    ));

    _setupInterceptors();

  }



  final SharedPreferences _prefs;

  late final Dio _dio;



  static const _tokenKey = 'access_token';

  static const _refreshKey = 'refresh_token';

  static const _userKey = 'user_json';



  TokenRefreshCallback? onTokensRefreshed;

  AuthFailureCallback? onAuthFailure;



  bool _refreshing = false;



  String? get accessToken => _prefs.getString(_tokenKey);

  String? get refreshToken => _prefs.getString(_refreshKey);



  Future<void> _saveTokens(String access, String refresh) async {

    await _prefs.setString(_tokenKey, access);

    await _prefs.setString(_refreshKey, refresh);

    onTokensRefreshed?.call(access, refresh);

  }



  Future<bool> _tryRefresh() async {

    if (_refreshing) return false;

    _refreshing = true;

    try {

      final stored = refreshToken;

      if (stored == null || stored.isEmpty) return false;



      final res = await _dio.post(

        '/api/v1/auth/refresh',

        data: {'refreshToken': stored},

        options: Options(extra: {'skipAuth': true}),

      );

      final api = ApiResponse<Map<String, dynamic>>.fromJson(

        res.data as Map<String, dynamic>,

        (d) => d as Map<String, dynamic>,

      );

      if (api.error != null || api.data == null) return false;



      final newAccess = api.data!['accessToken'] as String;

      final newRefresh = api.data!['refreshToken'] as String? ?? stored;

      await _saveTokens(newAccess, newRefresh);

      return true;

    } catch (_) {

      return false;

    } finally {

      _refreshing = false;

    }

  }



  void _setupInterceptors() {

    _dio.interceptors.add(InterceptorsWrapper(

      onRequest: (options, handler) {

        if (options.extra['skipAuth'] != true) {

          final token = accessToken;

          if (token != null) {

            options.headers['Authorization'] = 'Bearer $token';

          }

        }

        handler.next(options);

      },

      onError: (error, handler) async {

        final status = error.response?.statusCode;

        final retried = error.requestOptions.extra['retried'] == true;

        final skipAuth = error.requestOptions.extra['skipAuth'] == true;



        if (status == 401 && !retried && !skipAuth) {

          final refreshed = await _tryRefresh();

          if (refreshed) {

            final opts = error.requestOptions;

            opts.extra['retried'] = true;

            opts.headers['Authorization'] = 'Bearer ${accessToken}';

            try {

              final response = await _dio.fetch(opts);

              return handler.resolve(response);

            } catch (e) {

              return handler.next(e is DioException ? e : error);

            }

          }

          await logout();

          onAuthFailure?.call();

        }

        handler.next(error);

      },

    ));

  }



  Future<AuthSession> login(String email, String password) async {

    final res = await _dio.post(

      '/api/v1/auth/login',

      data: {'email': email, 'password': password},

      options: Options(extra: {'skipAuth': true}),

    );

    final api = ApiResponse<Map<String, dynamic>>.fromJson(

      res.data as Map<String, dynamic>,

      (d) => d as Map<String, dynamic>,

    );

    if (api.error != null || api.data == null) {

      throw Exception(api.error ?? 'Error de autenticación');

    }



    final user = AuthUser.fromJson(api.data!['user'] as Map<String, dynamic>);

    final tokens = api.data!['tokens'] as Map<String, dynamic>;

    final token = tokens['accessToken'] as String;

    final refresh = tokens['refreshToken'] as String;



    await _saveTokens(token, refresh);

    await _prefs.setString(_userKey, '${user.id}|${user.name}|${user.tenantId}');



    return AuthSession(user: user, accessToken: token);

  }



  AuthUser? getStoredUser() {

    final raw = _prefs.getString(_userKey);

    if (raw == null || accessToken == null) return null;

    final parts = raw.split('|');

    if (parts.length < 3) return null;

    return AuthUser(

      id: parts[0],

      email: '',

      name: parts[1],

      role: 'waiter',

      tenantId: parts[2],

    );

  }



  Future<void> logout() async {

    await _prefs.remove(_tokenKey);

    await _prefs.remove(_refreshKey);

    await _prefs.remove(_userKey);

  }



  Future<List<RestaurantTable>> fetchTables() async {

    final res = await _dio.get('/api/v1/tables');

    final api = ApiResponse<List<dynamic>>.fromJson(

      res.data as Map<String, dynamic>,

      (d) => d as List<dynamic>,

    );

    if (api.error != null) throw Exception(api.error);

    return (api.data ?? [])

        .map((e) => RestaurantTable.fromJson(e as Map<String, dynamic>))

        .toList();

  }



  Future<RestaurantTable> updateTableStatus(String tableId, String status) async {

    final res = await _dio.patch(

      '/api/v1/tables/$tableId/status',

      data: {'status': status},

    );

    final api = ApiResponse<Map<String, dynamic>>.fromJson(

      res.data as Map<String, dynamic>,

      (d) => d as Map<String, dynamic>,

    );

    if (api.error != null || api.data == null) throw Exception(api.error);

    return RestaurantTable.fromJson(api.data!);

  }



  Future<List<Order>> fetchOrders({String statuses = 'pending,confirmed,preparing,ready'}) async {

    final res = await _dio.get(

      '/api/v1/orders',

      queryParameters: {'status': statuses},

    );

    final api = ApiResponse<List<dynamic>>.fromJson(

      res.data as Map<String, dynamic>,

      (d) => d as List<dynamic>,

    );

    if (api.error != null) throw Exception(api.error);

    return (api.data ?? [])

        .map((e) => Order.fromJson(e as Map<String, dynamic>))

        .toList();

  }



  Future<Order> closeOrder(String orderId) async {

    final res = await _dio.post('/api/v1/orders/$orderId/close');

    final api = ApiResponse<Map<String, dynamic>>.fromJson(

      res.data as Map<String, dynamic>,

      (d) => d as Map<String, dynamic>,

    );

    if (api.error != null || api.data == null) throw Exception(api.error);

    return Order.fromJson(api.data!);

  }

}


