import 'package:socket_io_client/socket_io_client.dart' as io;
import 'models.dart';

typedef SocketCallback = void Function(String event, dynamic data);

class SocketService {
  io.Socket? _socket;

  void connect({
    required String socketUrl,
    required String token,
    required String tenantId,
    required SocketCallback onEvent,
    void Function()? onConnected,
    void Function()? onDisconnected,
  }) {
    disconnect();

    _socket = io.io(
      socketUrl,
      io.OptionBuilder()
          .setTransports(['websocket', 'polling'])
          .enableAutoConnect()
          .setAuth({'token': token, 'tenantId': tenantId})
          .build(),
    );

    _socket!
      ..onConnect((_) => onConnected?.call())
      ..onDisconnect((_) => onDisconnected?.call())
      ..on('order:new', (data) => onEvent('order:new', data))
      ..on('order:status_changed', (data) => onEvent('order:status_changed', data))
      ..on('table:status_changed', (data) => onEvent('table:status_changed', data))
      ..connect();
  }

  void disconnect() {
    _socket?.dispose();
    _socket = null;
  }

  Order? parseOrder(dynamic data) {
    if (data is Map) {
      final map = Map<String, dynamic>.from(data);
      if (map.containsKey('order')) {
        return Order.fromJson(Map<String, dynamic>.from(map['order'] as Map));
      }
      return Order.fromJson(map);
    }
    return null;
  }

  RestaurantTable? parseTable(dynamic data) {
    if (data is Map) {
      return RestaurantTable.fromJson(Map<String, dynamic>.from(data));
    }
    return null;
  }
}
