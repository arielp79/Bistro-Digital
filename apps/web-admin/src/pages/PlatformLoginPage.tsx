import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { usePlatformAuthStore } from '../stores/platform-auth.store';

export function PlatformLoginPage() {
  const navigate = useNavigate();
  const login = usePlatformAuthStore((s) => s.login);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      await login(email, password);
      navigate('/platform');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-6 bg-slate-50">
      <form
        onSubmit={handleSubmit}
        className="w-full max-w-sm bg-white rounded-2xl border border-slate-200 p-8 shadow-sm space-y-5"
      >
        <div className="text-center">
          <span className="text-3xl">🏢</span>
          <h1 className="text-xl font-bold mt-2">Super-admin SaaS</h1>
          <p className="text-sm text-slate-500">Operador de la plataforma</p>
        </div>
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm"
          placeholder="Email"
          required
        />
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm"
          placeholder="Contraseña"
          required
        />
        {error && <p className="text-sm text-red-600 text-center">{error}</p>}
        <button
          type="submit"
          disabled={loading}
          className="w-full py-3 bg-slate-900 text-white font-semibold rounded-xl disabled:opacity-50"
        >
          {loading ? 'Ingresando...' : 'Ingresar'}
        </button>
        <p className="text-center text-sm text-slate-500">
          ¿Admin de restaurante?{' '}
          <Link to="/login" className="text-slate-900 underline underline-offset-2">
            Panel del restaurante
          </Link>
        </p>
      </form>
    </div>
  );
}
