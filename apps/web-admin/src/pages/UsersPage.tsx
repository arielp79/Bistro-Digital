import { useEffect, useState } from 'react';
import type { UserPublic } from '@bistro/shared-types';
import { apiFetch } from '../lib/api';

const ROLE_LABELS: Record<string, string> = {
  admin: 'Admin',
  waiter: 'Mozo',
  kitchen: 'Cocina',
  cashier: 'Caja',
};

export function UsersPage() {
  const [users, setUsers] = useState<UserPublic[]>([]);
  const [error, setError] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState({
    name: '',
    email: '',
    password: '',
    role: 'waiter' as UserPublic['role'],
    phone: '',
    isActive: true,
  });

  const load = () => {
    apiFetch<UserPublic[]>('/api/v1/users')
      .then(setUsers)
      .catch((e) => setError(e.message));
  };

  useEffect(load, []);

  const resetForm = () => {
    setForm({ name: '', email: '', password: '', role: 'waiter', phone: '', isActive: true });
    setEditingId(null);
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await apiFetch('/api/v1/users', {
        method: 'POST',
        body: JSON.stringify({
          name: form.name,
          email: form.email,
          password: form.password,
          role: form.role,
          phone: form.phone,
        }),
      });
      setShowForm(false);
      resetForm();
      load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error');
    }
  };

  const startEdit = (user: UserPublic) => {
    setEditingId(user.id);
    setForm({
      name: user.name,
      email: user.email,
      password: '',
      role: user.role,
      phone: user.phone,
      isActive: user.isActive,
    });
    setShowForm(true);
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingId) return;
    try {
      const body: Record<string, unknown> = {
        name: form.name,
        role: form.role,
        phone: form.phone,
        isActive: form.isActive,
      };
      if (form.password) body.password = form.password;

      await apiFetch(`/api/v1/users/${editingId}`, {
        method: 'PATCH',
        body: JSON.stringify(body),
      });
      setShowForm(false);
      resetForm();
      load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error');
    }
  };

  return (
    <div className="p-4 sm:p-6">
      <div className="flex items-center justify-between mb-6 gap-3 flex-wrap">
        <h1 className="text-xl sm:text-2xl font-bold">Usuarios</h1>
        <button
          onClick={() => {
            resetForm();
            setShowForm(!showForm);
          }}
          className="px-4 py-2 bg-primary text-white text-sm rounded-lg shrink-0"
        >
          + Usuario
        </button>
      </div>

      {error && <p className="text-red-600 text-sm mb-4">{error}</p>}

      {showForm && (
        <form
          onSubmit={editingId ? handleUpdate : handleCreate}
          className="bg-surface rounded-xl border border-primary/10 p-4 sm:p-5 mb-6 grid grid-cols-1 sm:grid-cols-2 gap-3"
        >
          <input
            placeholder="Nombre"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            className="px-3 py-2 border rounded-lg text-sm"
            required
          />
          {!editingId && (
            <input
              type="email"
              placeholder="Email"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              className="px-3 py-2 border rounded-lg text-sm"
              required
            />
          )}
          <input
            type="password"
            placeholder={editingId ? 'Nueva contraseña (opcional)' : 'Contraseña'}
            value={form.password}
            onChange={(e) => setForm({ ...form, password: e.target.value })}
            className="px-3 py-2 border rounded-lg text-sm"
            required={!editingId}
          />
          <select
            value={form.role}
            onChange={(e) => setForm({ ...form, role: e.target.value as UserPublic['role'] })}
            className="px-3 py-2 border rounded-lg text-sm"
          >
            {Object.entries(ROLE_LABELS).map(([v, l]) => (
              <option key={v} value={v}>
                {l}
              </option>
            ))}
          </select>
          {editingId && (
            <label className="flex items-center gap-2 text-sm sm:col-span-2">
              <input
                type="checkbox"
                checked={form.isActive}
                onChange={(e) => setForm({ ...form, isActive: e.target.checked })}
              />
              Usuario activo
            </label>
          )}
          <button
            type="submit"
            className="sm:col-span-2 py-2 bg-accent text-primary font-medium rounded-lg text-sm"
          >
            {editingId ? 'Guardar cambios' : 'Crear usuario'}
          </button>
        </form>
      )}

      <div className="bg-surface rounded-xl border border-primary/10 overflow-x-auto">
        <table className="w-full text-sm min-w-[520px]">
          <thead className="bg-primary/5 text-left">
            <tr>
              <th className="px-4 py-3">Nombre</th>
              <th className="px-4 py-3">Email</th>
              <th className="px-4 py-3">Rol</th>
              <th className="px-4 py-3">Estado</th>
              <th className="px-4 py-3"></th>
            </tr>
          </thead>
          <tbody>
            {users.map((u) => (
              <tr key={u.id} className="border-t border-primary/5">
                <td className="px-4 py-3 font-medium">{u.name}</td>
                <td className="px-4 py-3 text-primary/60">{u.email}</td>
                <td className="px-4 py-3">{ROLE_LABELS[u.role] ?? u.role}</td>
                <td className="px-4 py-3">
                  <span
                    className={`text-xs px-2 py-0.5 rounded-full ${
                      u.isActive ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'
                    }`}
                  >
                    {u.isActive ? 'Activo' : 'Inactivo'}
                  </span>
                </td>
                <td className="px-4 py-3 text-right">
                  <button
                    onClick={() => startEdit(u)}
                    className="text-xs text-primary/60 hover:underline"
                  >
                    Editar
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
