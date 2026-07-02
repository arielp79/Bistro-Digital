import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../core/theme.dart';
import '../providers/app_providers.dart';
import '../widgets/order_card.dart';
import '../widgets/table_grid.dart';
import 'order_detail_screen.dart';
import 'table_detail_screen.dart';

class HomeScreen extends ConsumerStatefulWidget {
  const HomeScreen({super.key});

  @override
  ConsumerState<HomeScreen> createState() => _HomeScreenState();
}

class _HomeScreenState extends ConsumerState<HomeScreen> {
  int _tab = 0;

  @override
  Widget build(BuildContext context) {
    final auth = ref.watch(authProvider);
    final tables = ref.watch(tablesProvider);
    final orders = ref.watch(ordersProvider);
    final socketOn = ref.watch(socketConnectedProvider);

    return Scaffold(
      appBar: AppBar(
        title: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const Text('Mozo', style: TextStyle(fontWeight: FontWeight.bold)),
            Text(
              auth.user?.name ?? '',
              style: const TextStyle(fontSize: 12, color: Colors.grey),
            ),
          ],
        ),
        actions: [
          Icon(
            socketOn ? Icons.wifi : Icons.wifi_off,
            color: socketOn ? Colors.green : Colors.grey,
            size: 20,
          ),
          const SizedBox(width: 8),
          IconButton(
            icon: const Icon(Icons.logout),
            onPressed: () => ref.read(authProvider.notifier).logout(),
          ),
        ],
      ),
      body: IndexedStack(
        index: _tab,
        children: [
          _TablesTab(state: tables, onRefresh: () => ref.read(tablesProvider.notifier).load()),
          _OrdersTab(state: orders, onRefresh: () => ref.read(ordersProvider.notifier).load()),
        ],
      ),
      bottomNavigationBar: NavigationBar(
        selectedIndex: _tab,
        onDestinationSelected: (i) => setState(() => _tab = i),
        destinations: [
          NavigationDestination(
            icon: Badge(
              label: Text('${tables.tables.where((t) => t.status == 'occupied').length}'),
              isLabelVisible: tables.tables.any((t) => t.status == 'occupied'),
              child: const Icon(Icons.table_restaurant),
            ),
            label: 'Mesas',
          ),
          NavigationDestination(
            icon: Badge(
              label: Text('${orders.orders.length}'),
              isLabelVisible: orders.orders.isNotEmpty,
              child: const Icon(Icons.receipt_long),
            ),
            label: 'Pedidos',
          ),
        ],
      ),
    );
  }
}

class _TablesTab extends StatelessWidget {
  const _TablesTab({required this.state, required this.onRefresh});

  final TablesState state;
  final Future<void> Function() onRefresh;

  @override
  Widget build(BuildContext context) {
    return RefreshIndicator(
      onRefresh: onRefresh,
      child: CustomScrollView(
        physics: const AlwaysScrollableScrollPhysics(),
        slivers: [
          if (state.offline)
            const SliverToBoxAdapter(
              child: _OfflineBanner(),
            ),
          if (state.loading && state.tables.isEmpty)
            const SliverFillRemaining(
              child: Center(child: CircularProgressIndicator()),
            )
          else if (state.tables.isEmpty)
            SliverFillRemaining(
              child: Center(child: Text(state.error ?? 'Sin mesas')),
            )
          else
            SliverPadding(
              padding: const EdgeInsets.all(16),
              sliver: SliverToBoxAdapter(
                child: TableGrid(
                  tables: state.tables,
                  onTap: (table) => Navigator.push(
                    context,
                    MaterialPageRoute(
                      builder: (_) => TableDetailScreen(table: table),
                    ),
                  ),
                ),
              ),
            ),
        ],
      ),
    );
  }
}

class _OrdersTab extends StatelessWidget {
  const _OrdersTab({required this.state, required this.onRefresh});

  final OrdersState state;
  final Future<void> Function() onRefresh;

  @override
  Widget build(BuildContext context) {
    return RefreshIndicator(
      onRefresh: onRefresh,
      child: CustomScrollView(
        physics: const AlwaysScrollableScrollPhysics(),
        slivers: [
          if (state.offline) const SliverToBoxAdapter(child: _OfflineBanner()),
          if (state.loading && state.orders.isEmpty)
            const SliverFillRemaining(child: Center(child: CircularProgressIndicator()))
          else if (state.orders.isEmpty)
            SliverFillRemaining(
              child: Center(child: Text(state.error ?? 'Sin pedidos activos')),
            )
          else
            SliverList(
              delegate: SliverChildBuilderDelegate(
                (context, i) {
                  final order = state.orders[i];
                  return Padding(
                    padding: const EdgeInsets.fromLTRB(16, 0, 16, 12),
                    child: OrderCard(
                      order: order,
                      onTap: () => Navigator.push(
                        context,
                        MaterialPageRoute(
                          builder: (_) => OrderDetailScreen(order: order),
                        ),
                      ),
                    ),
                  );
                },
                childCount: state.orders.length,
              ),
            ),
        ],
      ),
    );
  }
}

class _OfflineBanner extends StatelessWidget {
  const _OfflineBanner();

  @override
  Widget build(BuildContext context) {
    return Container(
      width: double.infinity,
      padding: const EdgeInsets.symmetric(vertical: 8, horizontal: 16),
      color: AppTheme.accent.withValues(alpha: 0.3),
      child: const Text(
        'Modo offline — mostrando datos guardados',
        textAlign: TextAlign.center,
        style: TextStyle(fontSize: 12),
      ),
    );
  }
}
