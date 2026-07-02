import 'package:flutter/material.dart';
import '../core/models.dart';
import '../core/theme.dart';
class TableGrid extends StatelessWidget {
  const TableGrid({super.key, required this.tables, required this.onTap});

  final List<RestaurantTable> tables;
  final void Function(RestaurantTable table) onTap;

  Color _statusColor(String status) => switch (status) {
        'available' => Colors.green,
        'occupied' => Colors.orange,
        'reserved' => Colors.blue,
        'cleaning' => Colors.grey,
        _ => Colors.grey,
      };

  @override
  Widget build(BuildContext context) {
    final zones = tables.map((t) => t.zone).toSet().toList()..sort();

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: zones.map((zone) {
        final zoneTables = tables.where((t) => t.zone == zone).toList();
        return Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Padding(
              padding: const EdgeInsets.only(bottom: 8, top: 8),
              child: Text(
                zone,
                style: const TextStyle(fontWeight: FontWeight.bold, color: Colors.grey),
              ),
            ),
            GridView.builder(
              shrinkWrap: true,
              physics: const NeverScrollableScrollPhysics(),
              gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
                crossAxisCount: 3,
                crossAxisSpacing: 10,
                mainAxisSpacing: 10,
                childAspectRatio: 1.1,
              ),
              itemCount: zoneTables.length,
              itemBuilder: (context, i) {
                final table = zoneTables[i];
                final color = _statusColor(table.status);
                return Material(
                  color: color.withValues(alpha: 0.12),
                  borderRadius: BorderRadius.circular(16),
                  child: InkWell(
                    borderRadius: BorderRadius.circular(16),
                    onTap: () => onTap(table),
                    child: Container(
                      decoration: BoxDecoration(
                        borderRadius: BorderRadius.circular(16),
                        border: Border.all(color: color.withValues(alpha: 0.4)),
                      ),
                      padding: const EdgeInsets.all(10),
                      child: Column(
                        mainAxisAlignment: MainAxisAlignment.center,
                        children: [
                          Icon(Icons.table_bar, color: color, size: 28),
                          const SizedBox(height: 4),
                          Text(
                            table.label,
                            style: TextStyle(
                              fontWeight: FontWeight.bold,
                              color: AppTheme.primary,
                              fontSize: 13,
                            ),
                            textAlign: TextAlign.center,
                          ),
                          Text(
                            '${table.capacity}p',
                            style: TextStyle(fontSize: 11, color: color),
                          ),
                        ],
                      ),
                    ),
                  ),
                );
              },
            ),
          ],
        );
      }).toList(),
    );
  }
}
