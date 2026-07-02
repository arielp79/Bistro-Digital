import { useEffect, useState } from 'react';
import type { TablePublic } from '@bistro/shared-types';
import { apiFetch } from '../lib/api';
import { buildTableQrUrl } from '../utils/admin';

const STATUS_LABELS: Record<string, string> = {
  available: 'Disponible',
  occupied: 'Ocupada',
  reserved: 'Reservada',
  cleaning: 'Limpieza',
};

export function TablesPage() {
  const [tables, setTables] = useState<TablePublic[]>([]);
  const [error, setError] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<TablePublic | null>(null);
  const [form, setForm] = useState({ number: 1, label: '', zone: 'Salón', capacity: 4 });
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const load = () => {
    apiFetch<TablePublic[]>('/api/v1/tables')
      .then(setTables)
      .catch((e) => setError(e.message));
  };

  useEffect(load, []);

  const openCreate = () => {
    setEditing(null);
    const nextNum = tables.length ? Math.max(...tables.map((t) => t.number)) + 1 : 1;
    setForm({ number: nextNum, label: `Mesa ${nextNum}`, zone: 'Salón', capacity: 4 });
    setShowForm(true);
  };

  const openEdit = (table: TablePublic) => {
    setEditing(table);
    setForm({
      number: table.number,
      label: table.label,
      zone: table.zone,
      capacity: table.capacity,
    });
    setShowForm(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editing) {
        await apiFetch(`/api/v1/tables/${editing.id}`, {
          method: 'PATCH',
          body: JSON.stringify(form),
        });
      } else {
        await apiFetch('/api/v1/tables', { method: 'POST', body: JSON.stringify(form) });
      }
      setShowForm(false);
      load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error');
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('¿Eliminar mesa?')) return;
    try {
      await apiFetch(`/api/v1/tables/${id}`, { method: 'DELETE' });
      load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error');
    }
  };

  const copyQr = async (table: TablePublic) => {
    const url = buildTableQrUrl(table.id);
    await navigator.clipboard.writeText(url);
    setCopiedId(table.id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Mesas</h1>
        <button onClick={openCreate} className="px-4 py-2 bg-primary text-white text-sm rounded-lg">
          + Mesa
        </button>
      </div>

      {error && <p className="text-red-600 text-sm mb-4">{error}</p>}

      {showForm && (
        <form
          onSubmit={handleSubmit}
          className="mb-6 bg-surface border border-primary/10 rounded-xl p-5 grid grid-cols-2 gap-3"
        >
          <input
            type="number"
            placeholder="Número"
            value={form.number}
            onChange={(e) => setForm({ ...form, number: +e.target.value })}
            className="px-3 py-2 border rounded-lg text-sm"
            required
          />
          <input
            placeholder="Etiqueta"
            value={form.label}
            onChange={(e) => setForm({ ...form, label: e.target.value })}
            className="px-3 py-2 border rounded-lg text-sm"
            required
          />
          <input
            placeholder="Zona"
            value={form.zone}
            onChange={(e) => setForm({ ...form, zone: e.target.value })}
            className="px-3 py-2 border rounded-lg text-sm"
          />
          <input
            type="number"
            placeholder="Capacidad"
            value={form.capacity}
            onChange={(e) => setForm({ ...form, capacity: +e.target.value })}
            className="px-3 py-2 border rounded-lg text-sm"
          />
          <button
            type="submit"
            className="col-span-2 py-2 bg-accent text-primary font-medium rounded-lg text-sm"
          >
            {editing ? 'Actualizar' : 'Crear mesa'}
          </button>
        </form>
      )}

      <div className="bg-surface rounded-xl border border-primary/10 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-primary/5 text-left">
            <tr>
              <th className="px-4 py-3">#</th>
              <th className="px-4 py-3">Etiqueta</th>
              <th className="px-4 py-3">Zona</th>
              <th className="px-4 py-3">Cap.</th>
              <th className="px-4 py-3">Estado</th>
              <th className="px-4 py-3">QR</th>
              <th className="px-4 py-3"></th>
            </tr>
          </thead>
          <tbody>
            {tables.map((table) => (
              <tr key={table.id} className="border-t border-primary/5">
                <td className="px-4 py-3">{table.number}</td>
                <td className="px-4 py-3 font-medium">{table.label}</td>
                <td className="px-4 py-3 text-primary/60">{table.zone}</td>
                <td className="px-4 py-3">{table.capacity}</td>
                <td className="px-4 py-3">{STATUS_LABELS[table.status] ?? table.status}</td>
                <td className="px-4 py-3">
                  <button
                    onClick={() => copyQr(table)}
                    className="text-xs text-accent hover:underline"
                  >
                    {copiedId === table.id ? '¡Copiado!' : 'Copiar link'}
                  </button>
                </td>
                <td className="px-4 py-3 text-right space-x-2">
                  <button
                    onClick={() => openEdit(table)}
                    className="text-xs text-primary/60 hover:underline"
                  >
                    Editar
                  </button>
                  <button
                    onClick={() => handleDelete(table.id)}
                    className="text-xs text-red-600 hover:underline"
                  >
                    Eliminar
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {tables.length === 0 && (
          <p className="text-center text-primary/40 py-8">Sin mesas registradas</p>
        )}
      </div>
    </div>
  );
}
