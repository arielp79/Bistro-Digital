import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../core/theme.dart';
import '../providers/app_providers.dart';

class LoginScreen extends ConsumerStatefulWidget {
  const LoginScreen({super.key});

  @override
  ConsumerState<LoginScreen> createState() => _LoginScreenState();
}

class _LoginScreenState extends ConsumerState<LoginScreen> {
  final _emailCtrl = TextEditingController();
  final _passCtrl = TextEditingController();
  final _tenantCtrl = TextEditingController();
  final _apiCtrl = TextEditingController();
  String? _error;

  @override
  void initState() {
    super.initState();
    final config = ref.read(appConfigProvider);
    _tenantCtrl.text = config.tenantSlug;
    _apiCtrl.text = config.apiBaseUrl;
    ref.read(appConfigStoreProvider.future).then((store) {
      if (mounted && store.lastEmail.isNotEmpty) {
        _emailCtrl.text = store.lastEmail;
      }
    });
  }

  @override
  void dispose() {
    _emailCtrl.dispose();
    _passCtrl.dispose();
    _tenantCtrl.dispose();
    _apiCtrl.dispose();
    super.dispose();
  }

  Future<void> _submit() async {
    setState(() => _error = null);
    try {
      await ref.read(appConfigProvider.notifier).setTenantSlug(_tenantCtrl.text);
      await ref.read(appConfigProvider.notifier).setApiBaseUrl(_apiCtrl.text);
      await ref.read(appConfigStoreProvider.future).then((s) => s.setLastEmail(_emailCtrl.text));

      await ref.read(authProvider.notifier).login(
            _emailCtrl.text.trim(),
            _passCtrl.text,
          );
    } catch (e) {
      setState(() => _error = e.toString().replaceFirst('Exception: ', ''));
    }
  }

  @override
  Widget build(BuildContext context) {
    final loading = ref.watch(authProvider).loading;
    final config = ref.watch(appConfigProvider);

    return Scaffold(
      body: SafeArea(
        child: Padding(
          padding: const EdgeInsets.all(24),
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              const Text('🍽️', style: TextStyle(fontSize: 48)),
              const SizedBox(height: 12),
              Text(
                'Mozo',
                style: Theme.of(context).textTheme.headlineMedium?.copyWith(
                      fontWeight: FontWeight.bold,
                      color: AppTheme.primary,
                    ),
              ),
              Text(config.tenantSlug, style: const TextStyle(color: Colors.grey)),
              const SizedBox(height: 32),
              TextField(
                controller: _tenantCtrl,
                textInputAction: TextInputAction.next,
                decoration: const InputDecoration(
                  labelText: 'Tenant (slug del restaurante)',
                  border: OutlineInputBorder(),
                ),
              ),
              const SizedBox(height: 12),
              TextField(
                controller: _apiCtrl,
                textInputAction: TextInputAction.next,
                decoration: const InputDecoration(
                  labelText: 'API Base URL (ej. http://192.168.0.10:3000)',
                  border: OutlineInputBorder(),
                ),
              ),
              const SizedBox(height: 12),
              TextField(
                controller: _emailCtrl,
                keyboardType: TextInputType.emailAddress,
                decoration: const InputDecoration(
                  labelText: 'Email',
                  border: OutlineInputBorder(),
                ),
              ),
              const SizedBox(height: 12),
              TextField(
                controller: _passCtrl,
                obscureText: true,
                decoration: const InputDecoration(
                  labelText: 'Contraseña',
                  border: OutlineInputBorder(),
                ),
              ),
              if (_error != null) ...[
                const SizedBox(height: 12),
                Text(_error!, style: const TextStyle(color: Colors.red)),
              ],
              const SizedBox(height: 24),
              SizedBox(
                width: double.infinity,
                child: FilledButton(
                  onPressed: loading ? null : _submit,
                  child: Text(loading ? 'Ingresando...' : 'Ingresar'),
                ),
              ),
              const SizedBox(height: 16),
              Text(
                'API: ${config.apiBaseUrl}',
                style: const TextStyle(fontSize: 11, color: Colors.grey),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
