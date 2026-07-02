import 'package:flutter/material.dart';
import '../core/models.dart';
import '../core/theme.dart';
import 'status_chip.dart';

class OrderCard extends StatelessWidget {
  const OrderCard({super.key, required this.order, required this.onTap});

  final Order order;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    return Card(
      clipBehavior: Clip.antiAlias,
      child: InkWell(
        onTap: onTap,
        child: Padding(
          padding: const EdgeInsets.all(14),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                children: [
                  Text(
                    '#${order.orderNumber}',
                    style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 16),
                  ),
                  const Spacer(),
                  StatusChip(status: order.status, compact: true),
                ],
              ),
              const SizedBox(height: 4),
              Text(
                order.tableLabel ?? 'Delivery',
                style: const TextStyle(color: Colors.grey, fontSize: 13),
              ),
              const SizedBox(height: 8),
              ...order.items.take(3).map(
                    (item) => Text(
                      '${item.quantity}× ${item.name}',
                      style: const TextStyle(fontSize: 13),
                    ),
                  ),
              if (order.items.length > 3)
                Text('+${order.items.length - 3} más', style: const TextStyle(fontSize: 12, color: Colors.grey)),
              const SizedBox(height: 8),
              Text(
                '\$${order.total.toStringAsFixed(0)}',
                style: const TextStyle(fontWeight: FontWeight.w600, color: AppTheme.primary),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
