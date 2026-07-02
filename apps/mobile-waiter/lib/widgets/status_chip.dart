import 'package:flutter/material.dart';

class StatusChip extends StatelessWidget {
  const StatusChip({super.key, required this.status, this.compact = false});

  final String status;
  final bool compact;

  static const _labels = {
    'available': 'Disponible',
    'occupied': 'Ocupada',
    'reserved': 'Reservada',
    'cleaning': 'Limpieza',
    'pending': 'Pendiente',
    'confirmed': 'Confirmado',
    'preparing': 'Preparando',
    'ready': 'Listo',
    'delivered': 'Entregado',
    'paid': 'Pagado',
    'cancelled': 'Cancelado',
  };

  static const _colors = {
    'available': Colors.green,
    'occupied': Colors.orange,
    'reserved': Colors.blue,
    'cleaning': Colors.grey,
    'pending': Colors.amber,
    'confirmed': Colors.blue,
    'preparing': Colors.deepOrange,
    'ready': Colors.green,
    'delivered': Colors.teal,
    'paid': Colors.purple,
    'cancelled': Colors.red,
  };

  @override
  Widget build(BuildContext context) {
    final color = _colors[status] ?? Colors.grey;
    final label = _labels[status] ?? status;

    return Container(
      padding: EdgeInsets.symmetric(
        horizontal: compact ? 8 : 10,
        vertical: compact ? 2 : 4,
      ),
      decoration: BoxDecoration(
        color: color.withValues(alpha: 0.15),
        borderRadius: BorderRadius.circular(20),
      ),
      child: Text(
        label,
        style: TextStyle(
          color: Color.lerp(color, Colors.black, 0.3),
          fontSize: compact ? 11 : 12,
          fontWeight: FontWeight.w600,
        ),
      ),
    );
  }
}
