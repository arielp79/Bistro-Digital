class ApiResponse<T> {
  final T? data;
  final String? error;

  ApiResponse({this.data, this.error});

  factory ApiResponse.fromJson(
    Map<String, dynamic> json,
    T Function(dynamic) fromJsonT,
  ) {
    return ApiResponse(
      data: json['data'] != null ? fromJsonT(json['data']) : null,
      error: json['error'] as String?,
    );
  }
}

class AuthUser {
  final String id;
  final String email;
  final String name;
  final String role;
  final String tenantId;

  AuthUser({
    required this.id,
    required this.email,
    required this.name,
    required this.role,
    required this.tenantId,
  });

  factory AuthUser.fromJson(Map<String, dynamic> json) => AuthUser(
        id: json['id'] as String,
        email: json['email'] as String,
        name: json['name'] as String,
        role: json['role'] as String,
        tenantId: json['tenantId'] as String,
      );
}

class AuthSession {
  final AuthUser user;
  final String accessToken;

  AuthSession({required this.user, required this.accessToken});
}

class RestaurantTable {
  final String id;
  final int number;
  final String label;
  final String zone;
  final String status;
  final int capacity;
  final String? currentOrderId;

  RestaurantTable({
    required this.id,
    required this.number,
    required this.label,
    required this.zone,
    required this.status,
    required this.capacity,
    this.currentOrderId,
  });

  factory RestaurantTable.fromJson(Map<String, dynamic> json) => RestaurantTable(
        id: json['id'] as String,
        number: json['number'] as int,
        label: json['label'] as String,
        zone: json['zone'] as String,
        status: json['status'] as String,
        capacity: json['capacity'] as int,
        currentOrderId: json['currentOrderId'] as String?,
      );

  RestaurantTable copyWith({String? status, String? currentOrderId}) =>
      RestaurantTable(
        id: id,
        number: number,
        label: label,
        zone: zone,
        status: status ?? this.status,
        capacity: capacity,
        currentOrderId: currentOrderId ?? this.currentOrderId,
      );
}

class OrderItem {
  final String name;
  final int quantity;
  final String notes;
  final String status;
  final List<String> modifiers;

  OrderItem({
    required this.name,
    required this.quantity,
    required this.notes,
    required this.status,
    required this.modifiers,
  });

  factory OrderItem.fromJson(Map<String, dynamic> json) => OrderItem(
        name: json['name'] as String,
        quantity: json['quantity'] as int,
        notes: (json['notes'] as String?) ?? '',
        status: json['status'] as String,
        modifiers: (json['selectedModifiers'] as List<dynamic>?)
                ?.map((m) => m['optionName'] as String)
                .toList() ??
            [],
      );
}

class Order {
  final String id;
  final String orderNumber;
  final String type;
  final String source;
  final String status;
  final String? tableId;
  final String? tableLabel;
  final List<OrderItem> items;
  final double total;
  final String createdAt;

  Order({
    required this.id,
    required this.orderNumber,
    required this.type,
    required this.source,
    required this.status,
    this.tableId,
    this.tableLabel,
    required this.items,
    required this.total,
    required this.createdAt,
  });

  factory Order.fromJson(Map<String, dynamic> json) => Order(
        id: json['id'] as String,
        orderNumber: json['orderNumber'] as String,
        type: json['type'] as String,
        source: json['source'] as String,
        status: json['status'] as String,
        tableId: json['tableId'] as String?,
        tableLabel: json['tableLabel'] as String?,
        items: (json['items'] as List<dynamic>)
            .map((e) => OrderItem.fromJson(e as Map<String, dynamic>))
            .toList(),
        total: (json['total'] as num).toDouble(),
        createdAt: json['createdAt'] as String,
      );

  Order copyWith({String? status}) => Order(
        id: id,
        orderNumber: orderNumber,
        type: type,
        source: source,
        status: status ?? this.status,
        tableId: tableId,
        tableLabel: tableLabel,
        items: items,
        total: total,
        createdAt: createdAt,
      );
}
