import 'package:flutter_test/flutter_test.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:mobile_waiter/app.dart';

void main() {
  testWidgets('App loads login', (tester) async {
    await tester.pumpWidget(const ProviderScope(child: MozoApp()));
    await tester.pumpAndSettle();
    expect(find.text('Mozo'), findsOneWidget);
  });
}
