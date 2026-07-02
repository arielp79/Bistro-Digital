import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'app.dart';

Future<void> main() async {
  WidgetsFlutterBinding.ensureInitialized();
  try {
    await SharedPreferences.getInstance().timeout(const Duration(seconds: 5));
  } catch (_) {
    // En web a veces tarda; no bloquear el arranque.
  }
  runApp(const ProviderScope(child: MozoApp()));
}