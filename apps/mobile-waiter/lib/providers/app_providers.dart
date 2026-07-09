import 'package:flutter/foundation.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:shared_preferences/shared_preferences.dart';
import '../core/api_client.dart';
import '../core/app_config_store.dart';
import '../core/cache_service.dart';
import '../core/models.dart';
import '../core/socket_service.dart';

final sharedPrefsProvider = FutureProvider<SharedPreferences>((ref) async {
  return SharedPreferences.getInstance();
});

final appConfigStoreProvider = FutureProvider<AppConfigStore>((ref) async {
  final prefs = await ref.watch(sharedPrefsProvider.future);
  return AppConfigStore(prefs);
});

class AppConfigState {
  final String tenantSlug;
  final String apiBaseUrl;

  const AppConfigState({required this.tenantSlug, required this.apiBaseUrl});

  AppConfigState copyWith({String? tenantSlug, String? apiBaseUrl}) => AppConfigState(
        tenantSlug: tenantSlug ?? this.tenantSlug,
        apiBaseUrl: apiBaseUrl ?? this.apiBaseUrl,
      );
}

class AppConfigNotifier extends StateNotifier<AppConfigState> {
  AppConfigNotifier(this._ref)
      : super(const AppConfigState(tenantSlug: 'bistro-digital', apiBaseUrl: 'http://localhost:3000')) {
    _load();
  }

  final Ref _ref;

  Future<void> _load() async {
    try {
      final store = await _ref.read(appConfigStoreProvider.future);
      state = AppConfigState(tenantSlug: store.tenantSlug, apiBaseUrl: store.apiBaseUrl);
    } catch (e) {
      debugPrint('[Config] No se pudo cargar config: $e');
    }
  }

  Future<void> setTenantSlug(String value) async {
    final store = await _ref.read(appConfigStoreProvider.future);
    await store.setTenantSlug(value);
    state = state.copyWith(tenantSlug: store.tenantSlug);
  }

  Future<void> setApiBaseUrl(String value) async {
    final store = await _ref.read(appConfigStoreProvider.future);
    await store.setApiBaseUrl(value);
    state = state.copyWith(apiBaseUrl: store.apiBaseUrl);
  }
}

final appConfigProvider = StateNotifierProvider<AppConfigNotifier, AppConfigState>((ref) {
  return AppConfigNotifier(ref);
});

final apiClientProvider = FutureProvider<ApiClient>((ref) async {
  final prefs = await ref.watch(sharedPrefsProvider.future);
  final config = ref.watch(appConfigProvider);
  final api = ApiClient(prefs, apiBaseUrl: config.apiBaseUrl, tenantSlug: config.tenantSlug);
  api.onTokensRefreshed = (access, refresh) {
    ref.read(authProvider.notifier).applyTokens(access);
  };
  api.onAuthFailure = () {
    ref.read(authProvider.notifier).logout();
  };
  return api;
});

final cacheServiceProvider = FutureProvider<CacheService>((ref) async {
  final prefs = await ref.watch(sharedPrefsProvider.future);
  return CacheService(prefs);
});

final socketServiceProvider = Provider<SocketService>((ref) => SocketService());

class AuthState {
  final AuthUser? user;
  final String? token;
  final bool loading;

  const AuthState({this.user, this.token, this.loading = false});

  bool get isAuthenticated => token != null && user != null;

  AuthState copyWith({AuthUser? user, String? token, bool? loading}) => AuthState(
        user: user ?? this.user,
        token: token ?? this.token,
        loading: loading ?? this.loading,
      );
}

class AuthNotifier extends StateNotifier<AuthState> {
  AuthNotifier(this._ref) : super(const AuthState(loading: false)) {
    _restoreSession();
  }

  final Ref _ref;

  Future<void> _restoreSession() async {
    try {
      final api = await _ref
          .read(apiClientProvider.future)
          .timeout(const Duration(seconds: 8));
      final user = api.getStoredUser();
      final token = api.accessToken;
      if (user != null && token != null) {
        state = AuthState(user: user, token: token, loading: false);
      }
    } catch (e) {
      debugPrint('[Auth] No se pudo restaurar sesión: $e');
    }
  }

  Future<void> login(String email, String password) async {
    state = state.copyWith(loading: true);
    try {
      final api = await _ref.read(apiClientProvider.future);
      final session = await api.login(email, password);
      state = AuthState(user: session.user, token: session.accessToken, loading: false);
    } catch (e) {
      state = state.copyWith(loading: false);
      rethrow;
    }
  }

  Future<void> logout() async {
    final api = await _ref.read(apiClientProvider.future);
    await api.logout();
    state = const AuthState(loading: false);
  }

  void applyTokens(String accessToken) {
    if (state.user == null) return;
    state = state.copyWith(token: accessToken);
  }
}

final authProvider = StateNotifierProvider<AuthNotifier, AuthState>((ref) {
  return AuthNotifier(ref);
});

class TablesState {
  final List<RestaurantTable> tables;
  final bool loading;
  final String? error;
  final bool offline;

  const TablesState({
    this.tables = const [],
    this.loading = false,
    this.error,
    this.offline = false,
  });

  TablesState copyWith({
    List<RestaurantTable>? tables,
    bool? loading,
    String? error,
    bool? offline,
  }) =>
      TablesState(
        tables: tables ?? this.tables,
        loading: loading ?? this.loading,
        error: error,
        offline: offline ?? this.offline,
      );
}

class TablesNotifier extends StateNotifier<TablesState> {
  TablesNotifier(this._ref) : super(const TablesState()) {
    load();
  }

  final Ref _ref;

  Future<ApiClient> get _api => _ref.read(apiClientProvider.future);
  Future<CacheService> get _cache => _ref.read(cacheServiceProvider.future);

  Future<void> load() async {
    state = state.copyWith(loading: true, error: null);
    try {
      final api = await _api;
      final tables = await api.fetchTables().timeout(const Duration(seconds: 12));
      final cache = await _cache;
      await cache.saveTables(tables);
      state = TablesState(tables: tables, offline: false);
    } catch (e) {
      final cache = await _cache;
      final cached = cache.loadTables();
      state = TablesState(
        tables: cached ?? [],
        error: cached == null ? e.toString() : null,
        offline: cached != null,
      );
    } finally {
      state = state.copyWith(loading: false);
    }
  }

  void upsertTable(RestaurantTable table) {
    final idx = state.tables.indexWhere((t) => t.id == table.id);
    if (idx == -1) {
      state = state.copyWith(tables: [...state.tables, table]);
    } else {
      final updated = [...state.tables];
      updated[idx] = table;
      state = state.copyWith(tables: updated);
    }
  }

  Future<void> updateStatus(String tableId, String status) async {
    final api = await _api;
    final table = await api.updateTableStatus(tableId, status);
    upsertTable(table);
    final cache = await _cache;
    await cache.saveTables(state.tables);
  }
}

final tablesProvider = StateNotifierProvider<TablesNotifier, TablesState>((ref) {
  return TablesNotifier(ref);
});

class OrdersState {
  final List<Order> orders;
  final bool loading;
  final String? error;
  final bool offline;

  const OrdersState({
    this.orders = const [],
    this.loading = false,
    this.error,
    this.offline = false,
  });

  OrdersState copyWith({
    List<Order>? orders,
    bool? loading,
    String? error,
    bool? offline,
  }) =>
      OrdersState(
        orders: orders ?? this.orders,
        loading: loading ?? this.loading,
        error: error,
        offline: offline ?? this.offline,
      );
}

class OrdersNotifier extends StateNotifier<OrdersState> {
  OrdersNotifier(this._ref) : super(const OrdersState()) {
    load();
  }

  final Ref _ref;

  Future<ApiClient> get _api => _ref.read(apiClientProvider.future);
  Future<CacheService> get _cache => _ref.read(cacheServiceProvider.future);

  Future<void> load() async {
    state = state.copyWith(loading: true, error: null);
    try {
      final api = await _api;
      final orders = await api.fetchOrders().timeout(const Duration(seconds: 12));
      final cache = await _cache;
      await cache.saveOrders(orders);
      state = OrdersState(orders: orders, offline: false);
    } catch (e) {
      final cache = await _cache;
      final cached = cache.loadOrders();
      state = OrdersState(
        orders: cached ?? [],
        error: cached == null ? e.toString() : null,
        offline: cached != null,
      );
    } finally {
      state = state.copyWith(loading: false);
    }
  }

  void upsertOrder(Order order) {
    if (order.status == 'paid' || order.status == 'cancelled' || order.status == 'delivered') {
      state = state.copyWith(
        orders: state.orders.where((o) => o.id != order.id).toList(),
      );
      return;
    }
    final idx = state.orders.indexWhere((o) => o.id == order.id);
    if (idx == -1) {
      state = state.copyWith(orders: [order, ...state.orders]);
    } else {
      final updated = [...state.orders];
      updated[idx] = order;
      state = state.copyWith(orders: updated);
    }
  }

  Future<void> closeOrder(String orderId) async {
    final api = await _api;
    final order = await api.closeOrder(orderId);
    upsertOrder(order);
    await _ref.read(tablesProvider.notifier).load();
  }
}

final ordersProvider = StateNotifierProvider<OrdersNotifier, OrdersState>((ref) {
  return OrdersNotifier(ref);
});

final socketConnectedProvider = StateProvider<bool>((ref) => false);
