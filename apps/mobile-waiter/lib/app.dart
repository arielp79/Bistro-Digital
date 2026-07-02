import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../core/theme.dart';
import '../providers/app_providers.dart';
import 'screens/login_screen.dart';
import 'screens/home_screen.dart';

class MozoApp extends ConsumerStatefulWidget {
  const MozoApp({super.key});

  @override
  ConsumerState<MozoApp> createState() => _MozoAppState();
}

class _MozoAppState extends ConsumerState<MozoApp> {
  ProviderSubscription<AuthState>? _authSub;

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) => _setupSocket());
  }

  void _setupSocket() {
    _authSub?.close();
    _authSub = ref.listenManual(
      authProvider,
      (prev, next) => _syncSocket(next),
      fireImmediately: true,
    );
  }

  void _syncSocket(AuthState auth) {
    if (auth.isAuthenticated && auth.token != null && auth.user != null) {
      _connectSocket(auth.token!, auth.user!.tenantId);
    } else {
      ref.read(socketServiceProvider).disconnect();
      ref.read(socketConnectedProvider.notifier).state = false;
    }
  }

  void _connectSocket(String token, String tenantId) {
    final socket = ref.read(socketServiceProvider);
    socket.connect(
      token: token,
      tenantId: tenantId,
      onConnected: () {
        ref.read(socketConnectedProvider.notifier).state = true;
      },
      onDisconnected: () {
        ref.read(socketConnectedProvider.notifier).state = false;
      },
      onEvent: (event, data) {
        if (event == 'order:new' || event == 'order:status_changed') {
          final order = socket.parseOrder(data);
          if (order != null) {
            ref.read(ordersProvider.notifier).upsertOrder(order);
          }
        } else if (event == 'table:status_changed') {
          final table = socket.parseTable(data);
          if (table != null) {
            ref.read(tablesProvider.notifier).upsertTable(table);
          }
        }
      },
    );
  }

  @override
  void dispose() {
    _authSub?.close();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final auth = ref.watch(authProvider);

    return MaterialApp(
      title: 'Mozo — Bistró Digital',
      theme: AppTheme.light,
      home: auth.isAuthenticated ? const HomeScreen() : const LoginScreen(),
    );
  }
}
