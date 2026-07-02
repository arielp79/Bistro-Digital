import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../stores/auth.store';

export function LoginPage() {
  const navigate = useNavigate();
  const login = useAuthStore((s) => s.login);
  const savedSlug = useAuthStore((s) => s.tenantSlug);
  const [tenantSlug, setTenantSlug] = useState(savedSlug);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      await login(email, password, tenantSlug.trim().toLowerCase());
      navigate('/');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-6">
      <form
        onSubmit={handleSubmit}
        className="w-full max-w-sm bg-surface rounded-2xl border border-primary/10 p-8 shadow-sm space-y-5"
      >
        <div className="text-center">
          <span className="text-3xl">⚙️</span>
          <h1 className="text-xl font-bold mt-2">Panel Admin</h1>
          <p className="text-sm text-primary/50">Bistró Digital</p>
        </div>
        <div>
          <label className="text-sm text-primary/50">Identificador del restaurante</label>
          <input
            value={tenantSlug}
            onChange={(e) => setTenantSlug(e.target.value.toLowerCase())}
            className="w-full mt-1 px-4 py-2.5 rounded-xl border border-primary/10 text-sm font-mono"
            placeholder="mi-restaurante"
            required
          />
          <p className="text-xs text-primary/40 mt-1">El slug que elegiste al registrarte</p>
        </div>
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="w-full px-4 py-2.5 rounded-xl border border-primary/10 text-sm"
          placeholder="Email"
          required
        />
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="w-full px-4 py-2.5 rounded-xl border border-primary/10 text-sm"
          placeholder="Contraseña"
          required
        />
        {error && <p className="text-sm text-red-600 text-center">{error}</p>}
        <button
          type="submit"
          disabled={loading}
          className="w-full py-3 bg-primary text-white font-semibold rounded-xl disabled:opacity-50"
        >
          {loading ? 'Ingresando...' : 'Ingresar'}
        </button>
        <p className="text-center text-sm text-primary/50">
          ¿Nuevo restaurante?{' '}
          <Link to="/onboarding" className="text-primary underline underline-offset-2">
            Crear cuenta
          </Link>
        </p>
        <p className="text-center text-sm text-primary/50">
          ¿Operador SaaS?{' '}
          <Link to="/platform/login" className="text-primary underline underline-offset-2">
            Super-admin
          </Link>
        </p>
      </form>
    </div>
  );
}
