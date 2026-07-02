import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:intl/intl.dart';
import '../core/models.dart';
import '../core/theme.dart';
import '../providers/app_providers.dart';
import '../widgets/status_chip.dart';

class OrderDetailScreen extends ConsumerStatefulWidget {
  const OrderDetailScreen({super.key, required this.order});

  final Order order;

  @override
  ConsumerState<OrderDetailScreen> createState() => _OrderDetailScreenState();
}

class _OrderDetailScreenState extends ConsumerState<OrderDetailScreen> {
  bool _closing = false;

  Order get _order {
    return ref.watch(ordersProvider).orders
            .where((o) => o.id == widget.order.id)
            .firstOrNull ??
        widget.order;
  }

  Future<void> _closeOrder() async {
    final confirm = await showDialog<bool>(
      context: context,
      builder: (ctx) => AlertDialog(
        title: const Text('Cerrar mesa'),
        content: const Text('¿Confirmar cierre y cobro del pedido?'),
        actions: [
          TextButton(onPressed: () => Navigator.pop(ctx, false), child: const Text('Cancelar')),
          FilledButton(onPressed: () => Navigator.pop(ctx, true), child: const Text('Confirmar')),
        ],
      ),
    );
    if (confirm != true) return;

    setState(() => _closing = true);
    try {
      await ref.read(ordersProvider.notifier).closeOrder(_order.id);
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Pedido cerrado')),
        );
        Navigator.pop(context);
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text(e.toString())),
        );
      }
    } finally {
      if (mounted) setState(() => _closing = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final currency = NumberFormat.currency(locale: 'es_AR', symbol: '\$');

    return Scaffold(
      appBar: AppBar(title: Text('#${_order.orderNumber}')),
      body: ListView(
        padding: const EdgeInsets.all(20),
        children: [
          Row(
            children: [
              StatusChip(status: _order.status),
              const SizedBox(width: 8),
              Text(_order.tableLabel ?? 'Sin mesa', style: const TextStyle(color: Colors.grey)),
            ],
          ),
          const SizedBox(height: 20),
          ..._order.items.map(
            (item) => Card(
              margin: const EdgeInsets.only(bottom: 8),
              child: ListTile(
                title: Text('${item.quantity}× ${item.name}'),
                subtitle: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    if (item.modifiers.isNotEmpty)
                      Text(item.modifiers.join(', '), style: const TextStyle(fontSize: 12)),
                    if (item.notes.isNotEmpty)
                      Text('→ ${item.notes}', style: const TextStyle(fontStyle: FontStyle.italic)),
                  ],
                ),
                trailing: StatusChip(status: item.status, compact: true),
              ),
            ),
          ),
          const Divider(height: 32),
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              const Text('Total', style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold)),
              Text(
                currency.format(_order.total),
                style: const TextStyle(fontSize: 18, fontWeight: FontWeight.bold),
              ),
            ],
          ),
        ],
      ),
      bottomNavigationBar: SafeArea(
        child: Padding(
          padding: const EdgeInsets.all(16),
          child: FilledButton(
            onPressed: _closing || _order.status == 'paid' ? null : _closeOrder,
            style: FilledButton.styleFrom(
              backgroundColor: AppTheme.accent,
              foregroundColor: AppTheme.primary,
              minimumSize: const Size.fromHeight(48),
            ),
            child: Text(_closing ? 'Cerrando...' : 'Cerrar mesa / Cobrar'),
          ),
        ),
      ),
    );
  }
}
