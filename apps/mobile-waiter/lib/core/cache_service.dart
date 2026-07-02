import 'dart:convert';
import 'package:shared_preferences/shared_preferences.dart';
import 'models.dart';

class CacheService {
  CacheService(this._prefs);

  final SharedPreferences _prefs;

  static const _tablesKey = 'cache_tables';
  static const _ordersKey = 'cache_orders';

  Future<void> saveTables(List<RestaurantTable> tables) async {
    final json = tables.map((t) => {
          'id': t.id,
          'number': t.number,
          'label': t.label,
          'zone': t.zone,
          'status': t.status,
          'capacity': t.capacity,
          'currentOrderId': t.currentOrderId,
        }).toList();
    await _prefs.setString(_tablesKey, jsonEncode(json));
  }

  List<RestaurantTable>? loadTables() {
    final raw = _prefs.getString(_tablesKey);
    if (raw == null) return null;
    final list = jsonDecode(raw) as List<dynamic>;
    return list
        .map((e) => RestaurantTable.fromJson(e as Map<String, dynamic>))
        .toList();
  }

  Future<void> saveOrders(List<Order> orders) async {
    final json = orders
        .map((o) => {
              'id': o.id,
              'orderNumber': o.orderNumber,
              'type': o.type,
              'source': o.source,
              'status': o.status,
              'tableId': o.tableId,
              'tableLabel': o.tableLabel,
              'items': o.items
                  .map((i) => {
                        'name': i.name,
                        'quantity': i.quantity,
                        'notes': i.notes,
                        'status': i.status,
                        'selectedModifiers':
                            i.modifiers.map((m) => {'optionName': m}).toList(),
                      })
                  .toList(),
              'total': o.total,
              'createdAt': o.createdAt,
            })
        .toList();
    await _prefs.setString(_ordersKey, jsonEncode(json));
  }

  List<Order>? loadOrders() {
    final raw = _prefs.getString(_ordersKey);
    if (raw == null) return null;
    final list = jsonDecode(raw) as List<dynamic>;
    return list.map((e) => Order.fromJson(e as Map<String, dynamic>)).toList();
  }
}
