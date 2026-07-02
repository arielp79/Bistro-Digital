import { useEffect, useState } from 'react';
import type { Ingredient } from '@bistro/shared-types';
import { apiFetch } from '../lib/api';

export function StockPage() {
  const [items, setItems] = useState<Ingredient[]>([]);
  const [error, setError] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({
    name: '',
    unit: 'kg' as Ingredient['unit'],
    currentStock: 0,
    minimumStock: 0,
    costPerUnit: 0,
    supplier: '',
  });

  const load = () => {
    apiFetch<Ingredient[]>('/api/v1/stock/ingredients')
      .then(setItems)
      .catch((e) => setError(e.message));
  };

  useEffect(() => {
    load();
    const interval = setInterval(load, 20000);
    return () => clearInterval(interval);
  }, []);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await apiFetch('/api/v1/stock/ingredients', {
        method: 'POST',
        body: JSON.stringify(form),
      });
      setShowForm(false);
      setForm({ name: '', unit: 'kg', currentStock: 0, minimumStock: 0, costPerUnit: 0, supplier: '' });
      load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error');
    }
  };

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Stock</h1>
        <button
          onClick={() => setShowForm(!showForm)}
          className="px-4 py-2 bg-primary text-white text-sm rounded-lg"
        >
          + Ingrediente
        </button>
      </div>

      {error && <p className="text-red-600 text-sm mb-4">{error}</p>}

      {showForm && (
        <form onSubmit={handleCreate} className="bg-surface rounded-xl border border-primary/10 p-5 mb-6 grid grid-cols-2 gap-3">
          <input
            placeholder="Nombre"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            className="px-3 py-2 border rounded-lg text-sm col-span-2"
            required
          />
          <select
            value={form.unit}
            onChange={(e) => setForm({ ...form, unit: e.target.value as Ingredient['unit'] })}
            className="px-3 py-2 border rounded-lg text-sm"
          >
            {['g', 'ml', 'unit', 'kg', 'l'].map((u) => (
              <option key={u} value={u}>{u}</option>
            ))}
          </select>
          <input
            type="number"
            placeholder="Stock actual"
            value={form.currentStock}
            onChange={(e) => setForm({ ...form, currentStock: +e.target.value })}
            className="px-3 py-2 border rounded-lg text-sm"
          />
          <input
            type="number"
            placeholder="Stock mínimo"
            value={form.minimumStock}
            onChange={(e) => setForm({ ...form, minimumStock: +e.target.value })}
            className="px-3 py-2 border rounded-lg text-sm"
          />
          <input
            placeholder="Proveedor"
            value={form.supplier}
            onChange={(e) => setForm({ ...form, supplier: e.target.value })}
            className="px-3 py-2 border rounded-lg text-sm"
          />
          <button type="submit" className="col-span-2 py-2 bg-accent text-primary font-medium rounded-lg text-sm">
            Guardar
          </button>
        </form>
      )}

      <div className="bg-surface rounded-xl border border-primary/10 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-primary/5 text-left">
            <tr>
              <th className="px-4 py-3">Ingrediente</th>
              <th className="px-4 py-3">Stock</th>
              <th className="px-4 py-3">Mínimo</th>
              <th className="px-4 py-3">Proveedor</th>
              <th className="px-4 py-3">Estado</th>
            </tr>
          </thead>
          <tbody>
            {items.map((item) => (
              <tr key={item.id} className="border-t border-primary/5">
                <td className="px-4 py-3 font-medium">{item.name}</td>
                <td className="px-4 py-3">
                  {item.currentStock} {item.unit}
                </td>
                <td className="px-4 py-3 text-primary/50">
                  {item.minimumStock} {item.unit}
                </td>
                <td className="px-4 py-3 text-primary/50">{item.supplier || '—'}</td>
                <td className="px-4 py-3">
                  {item.isLowStock ? (
                    <span className="text-xs px-2 py-0.5 rounded-full bg-red-100 text-red-700">
                      Bajo mínimo
                    </span>
                  ) : (
                    <span className="text-xs px-2 py-0.5 rounded-full bg-green-100 text-green-700">
                      OK
                    </span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {items.length === 0 && (
          <p className="text-center text-primary/40 py-8">Sin ingredientes registrados</p>
        )}
      </div>
    </div>
  );
}
