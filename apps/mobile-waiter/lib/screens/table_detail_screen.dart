import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../core/models.dart';
import '../core/theme.dart';
import '../providers/app_providers.dart';
import 'order_detail_screen.dart';
import '../widgets/status_chip.dart';

class TableDetailScreen extends ConsumerWidget {
  const TableDetailScreen({super.key, required this.table});

  final RestaurantTable table;

  static const _statusOptions = [
    ('available', 'Disponible', Colors.green),
    ('occupied', 'Ocupada', Colors.orange),
    ('reserved', 'Reservada', Colors.blue),
    ('cleaning', 'Limpieza', Colors.grey),
  ];

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final current = ref.watch(tablesProvider).tables
            .where((t) => t.id == table.id)
            .firstOrNull ??
        table;

    return Scaffold(
      appBar: AppBar(title: Text(current.label)),
      body: Padding(
        padding: const EdgeInsets.all(20),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            StatusChip(status: current.status),
            const SizedBox(height: 16),
            Text('Zona: ${current.zone}', style: const TextStyle(color: Colors.grey)),
            Text('Capacidad: ${current.capacity} personas'),
            if (current.currentOrderId != null) ...[
              const SizedBox(height: 6),
              Text('Pedido activo: #${current.currentOrderId}'),
              const SizedBox(height: 10),
              FilledButton.tonalIcon(
                onPressed: () async {
                  try {
                    final api = await ref.read(apiClientProvider.future);
                    final order = await api.fetchOrder(current.currentOrderId!);
                    if (context.mounted) {
                      Navigator.push(
                        context,
                        MaterialPageRoute(builder: (_) => OrderDetailScreen(order: order)),
                      );
                    }
                  } catch (e) {
                    if (context.mounted) {
                      ScaffoldMessenger.of(context).showSnackBar(
                        SnackBar(content: Text(e.toString())),
                      );
                    }
                  }
                },
                icon: const Icon(Icons.receipt_long),
                label: const Text('Ver pedido'),
              ),
            ],
            const SizedBox(height: 24),
            Text(
              'Cambiar estado',
              style: Theme.of(context).textTheme.titleMedium?.copyWith(
                    fontWeight: FontWeight.bold,
                  ),
            ),
            const SizedBox(height: 12),
            ..._statusOptions.map((opt) {
              final selected = current.status == opt.$1;
              return Padding(
                padding: const EdgeInsets.only(bottom: 8),
                child: ListTile(
                  shape: RoundedRectangleBorder(
                    borderRadius: BorderRadius.circular(12),
                    side: BorderSide(
                      color: selected ? AppTheme.primary : Colors.grey.shade200,
                    ),
                  ),
                  leading: CircleAvatar(
                    backgroundColor: opt.$3.withValues(alpha: 0.2),
                    child: Icon(Icons.circle, color: opt.$3, size: 12),
                  ),
                  title: Text(opt.$2),
                  trailing: selected ? const Icon(Icons.check, color: AppTheme.primary) : null,
                  onTap: selected
                      ? null
                      : () async {
                          try {
                            await ref
                                .read(tablesProvider.notifier)
                                .updateStatus(current.id, opt.$1);
                            if (context.mounted) {
                              ScaffoldMessenger.of(context).showSnackBar(
                                SnackBar(content: Text('Mesa → ${opt.$2}')),
                              );
                            }
                          } catch (e) {
                            if (context.mounted) {
                              ScaffoldMessenger.of(context).showSnackBar(
                                SnackBar(content: Text(e.toString())),
                              );
                            }
                          }
                        },
                ),
              );
            }),
          ],
        ),
      ),
    );
  }
}
