import { useEffect, useState } from 'react';
import type { Ingredient, LocalizedText } from '@bistro/shared-types';
import { apiFetch } from '../lib/api';
import { formatCurrency } from '../utils/format';
import { toLocalizedText } from '../utils/admin';

interface CategoryRow {
  _id: string;
  name: LocalizedText;
  sortOrder: number;
  isActive: boolean;
}

interface MenuItemRow {
  _id: string;
  sku: string;
  name: LocalizedText;
  description: LocalizedText;
  basePrice: number;
  isAvailable: boolean;
  categoryId: string;
  ingredients?: Array<{ ingredientId: string; quantity: number; unit: 'g' | 'ml' | 'unit' }>;
}

type Tab = 'items' | 'categories';

const emptyItemForm = {
  sku: '',
  name: '',
  basePrice: 0,
  categoryId: '',
  description: '',
};

export function MenuPage() {
  const [tab, setTab] = useState<Tab>('items');
  const [categories, setCategories] = useState<CategoryRow[]>([]);
  const [items, setItems] = useState<MenuItemRow[]>([]);
  const [ingredients, setIngredients] = useState<Ingredient[]>([]);
  const [error, setError] = useState('');

  const [showCatForm, setShowCatForm] = useState(false);
  const [catName, setCatName] = useState('');
  const [catSort, setCatSort] = useState(0);

  const [showItemForm, setShowItemForm] = useState(false);
  const [editingItem, setEditingItem] = useState<MenuItemRow | null>(null);
  const [itemForm, setItemForm] = useState(emptyItemForm);
  const [recipeRows, setRecipeRows] = useState<
    Array<{ ingredientId: string; quantity: number; unit: 'g' | 'ml' | 'unit' }>
  >([]);

  const load = () => {
    Promise.all([
      apiFetch<CategoryRow[]>('/api/v1/menu/categories'),
      apiFetch<MenuItemRow[]>('/api/v1/menu/items'),
      apiFetch<Ingredient[]>('/api/v1/stock/ingredients'),
    ])
      .then(([cats, menuItems, ings]) => {
        setCategories(cats);
        setItems(menuItems);
        setIngredients(ings);
      })
      .catch((e) => setError(e.message));
  };

  useEffect(load, []);

  const handleCreateCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await apiFetch('/api/v1/menu/categories', {
        method: 'POST',
        body: JSON.stringify({ name: toLocalizedText(catName), sortOrder: catSort }),
      });
      setShowCatForm(false);
      setCatName('');
      setCatSort(0);
      load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error');
    }
  };

  const handleDeleteCategory = async (id: string) => {
    if (!confirm('¿Eliminar categoría?')) return;
    try {
      await apiFetch(`/api/v1/menu/categories/${id}`, { method: 'DELETE' });
      load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error');
    }
  };

  const openItemForm = (item?: MenuItemRow) => {
    if (item) {
      setEditingItem(item);
      setItemForm({
        sku: item.sku,
        name: item.name.es,
        basePrice: item.basePrice,
        categoryId: item.categoryId,
        description: item.description?.es ?? '',
      });
      setRecipeRows(item.ingredients ?? []);
    } else {
      setEditingItem(null);
      setItemForm({ ...emptyItemForm, categoryId: categories[0]?._id ?? '' });
      setRecipeRows([]);
    }
    setShowItemForm(true);
  };

  const handleSaveItem = async (e: React.FormEvent) => {
    e.preventDefault();
    const payload = {
      sku: itemForm.sku,
      name: toLocalizedText(itemForm.name),
      description: toLocalizedText(itemForm.description || itemForm.name),
      basePrice: itemForm.basePrice,
      categoryId: itemForm.categoryId,
      ingredients: recipeRows.filter((r) => r.ingredientId && r.quantity > 0),
    };

    try {
      if (editingItem) {
        await apiFetch(`/api/v1/menu/items/${editingItem._id}`, {
          method: 'PATCH',
          body: JSON.stringify(payload),
        });
      } else {
        await apiFetch('/api/v1/menu/items', {
          method: 'POST',
          body: JSON.stringify(payload),
        });
      }
      setShowItemForm(false);
      load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error');
    }
  };

  const handleDeleteItem = async (id: string) => {
    if (!confirm('¿Eliminar ítem del menú?')) return;
    try {
      await apiFetch(`/api/v1/menu/items/${id}`, { method: 'DELETE' });
      load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error');
    }
  };

  const toggleAvailability = async (item: MenuItemRow) => {
    try {
      await apiFetch(`/api/v1/menu/items/${item._id}`, {
        method: 'PATCH',
        body: JSON.stringify({ isAvailable: !item.isAvailable }),
      });
      load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error');
    }
  };

  const categoryName = (id: string) => categories.find((c) => c._id === id)?.name.es ?? '—';

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Menú</h1>
        <div className="flex gap-2">
          <button
            onClick={() => setTab('items')}
            className={`px-3 py-1.5 text-sm rounded-lg ${tab === 'items' ? 'bg-primary text-white' : 'bg-primary/10'}`}
          >
            Ítems
          </button>
          <button
            onClick={() => setTab('categories')}
            className={`px-3 py-1.5 text-sm rounded-lg ${tab === 'categories' ? 'bg-primary text-white' : 'bg-primary/10'}`}
          >
            Categorías
          </button>
        </div>
      </div>

      {error && <p className="text-red-600 text-sm mb-4">{error}</p>}

      {tab === 'categories' && (
        <>
          <button
            onClick={() => setShowCatForm(!showCatForm)}
            className="mb-4 px-4 py-2 bg-primary text-white text-sm rounded-lg"
          >
            + Categoría
          </button>
          {showCatForm && (
            <form onSubmit={handleCreateCategory} className="mb-6 flex gap-2 items-end">
              <input
                placeholder="Nombre"
                value={catName}
                onChange={(e) => setCatName(e.target.value)}
                className="px-3 py-2 border rounded-lg text-sm"
                required
              />
              <input
                type="number"
                placeholder="Orden"
                value={catSort}
                onChange={(e) => setCatSort(+e.target.value)}
                className="px-3 py-2 border rounded-lg text-sm w-24"
              />
              <button type="submit" className="px-4 py-2 bg-accent text-primary rounded-lg text-sm font-medium">
                Guardar
              </button>
            </form>
          )}
          <div className="bg-surface rounded-xl border border-primary/10 overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-primary/5 text-left">
                <tr>
                  <th className="px-4 py-3">Nombre</th>
                  <th className="px-4 py-3">Orden</th>
                  <th className="px-4 py-3"></th>
                </tr>
              </thead>
              <tbody>
                {categories.map((cat) => (
                  <tr key={cat._id} className="border-t border-primary/5">
                    <td className="px-4 py-3 font-medium">{cat.name.es}</td>
                    <td className="px-4 py-3">{cat.sortOrder}</td>
                    <td className="px-4 py-3 text-right">
                      <button
                        onClick={() => handleDeleteCategory(cat._id)}
                        className="text-xs text-red-600 hover:underline"
                      >
                        Eliminar
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}

      {tab === 'items' && (
        <>
          <button
            onClick={() => openItemForm()}
            className="mb-4 px-4 py-2 bg-primary text-white text-sm rounded-lg"
          >
            + Ítem
          </button>

          {showItemForm && (
            <form
              onSubmit={handleSaveItem}
              className="mb-6 bg-surface border border-primary/10 rounded-xl p-5 space-y-3"
            >
              <h3 className="font-semibold">{editingItem ? 'Editar ítem' : 'Nuevo ítem'}</h3>
              <div className="grid grid-cols-2 gap-3">
                <input
                  placeholder="SKU"
                  value={itemForm.sku}
                  onChange={(e) => setItemForm({ ...itemForm, sku: e.target.value })}
                  className="px-3 py-2 border rounded-lg text-sm"
                  required
                  disabled={!!editingItem}
                />
                <input
                  placeholder="Nombre"
                  value={itemForm.name}
                  onChange={(e) => setItemForm({ ...itemForm, name: e.target.value })}
                  className="px-3 py-2 border rounded-lg text-sm"
                  required
                />
                <input
                  type="number"
                  placeholder="Precio"
                  value={itemForm.basePrice}
                  onChange={(e) => setItemForm({ ...itemForm, basePrice: +e.target.value })}
                  className="px-3 py-2 border rounded-lg text-sm"
                  required
                />
                <select
                  value={itemForm.categoryId}
                  onChange={(e) => setItemForm({ ...itemForm, categoryId: e.target.value })}
                  className="px-3 py-2 border rounded-lg text-sm"
                  required
                >
                  {categories.map((c) => (
                    <option key={c._id} value={c._id}>
                      {c.name.es}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <p className="text-sm text-primary/50 mb-2">Receta (ingredientes)</p>
                {recipeRows.map((row, idx) => (
                  <div key={idx} className="flex gap-2 mb-2">
                    <select
                      value={row.ingredientId}
                      onChange={(e) => {
                        const next = [...recipeRows];
                        next[idx] = { ...next[idx]!, ingredientId: e.target.value };
                        setRecipeRows(next);
                      }}
                      className="flex-1 px-2 py-1 border rounded text-sm"
                    >
                      <option value="">Ingrediente</option>
                      {ingredients.map((ing) => (
                        <option key={ing.id} value={ing.id}>
                          {ing.name}
                        </option>
                      ))}
                    </select>
                    <input
                      type="number"
                      value={row.quantity}
                      onChange={(e) => {
                        const next = [...recipeRows];
                        next[idx] = { ...next[idx]!, quantity: +e.target.value };
                        setRecipeRows(next);
                      }}
                      className="w-20 px-2 py-1 border rounded text-sm"
                    />
                    <select
                      value={row.unit}
                      onChange={(e) => {
                        const next = [...recipeRows];
                        next[idx] = { ...next[idx]!, unit: e.target.value as 'g' | 'ml' | 'unit' };
                        setRecipeRows(next);
                      }}
                      className="w-20 px-2 py-1 border rounded text-sm"
                    >
                      <option value="g">g</option>
                      <option value="ml">ml</option>
                      <option value="unit">u</option>
                    </select>
                  </div>
                ))}
                <button
                  type="button"
                  onClick={() =>
                    setRecipeRows([...recipeRows, { ingredientId: '', quantity: 0, unit: 'g' }])
                  }
                  className="text-xs text-accent hover:underline"
                >
                  + Ingrediente
                </button>
              </div>

              <div className="flex gap-2">
                <button type="submit" className="px-4 py-2 bg-primary text-white rounded-lg text-sm">
                  Guardar
                </button>
                <button
                  type="button"
                  onClick={() => setShowItemForm(false)}
                  className="px-4 py-2 border rounded-lg text-sm"
                >
                  Cancelar
                </button>
              </div>
            </form>
          )}

          <div className="bg-surface rounded-xl border border-primary/10 overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-primary/5 text-left">
                <tr>
                  <th className="px-4 py-3">SKU</th>
                  <th className="px-4 py-3">Nombre</th>
                  <th className="px-4 py-3">Categoría</th>
                  <th className="px-4 py-3">Precio</th>
                  <th className="px-4 py-3">Receta</th>
                  <th className="px-4 py-3">Estado</th>
                  <th className="px-4 py-3"></th>
                </tr>
              </thead>
              <tbody>
                {items.map((item) => (
                  <tr key={item._id} className="border-t border-primary/5">
                    <td className="px-4 py-3 text-primary/50">{item.sku}</td>
                    <td className="px-4 py-3 font-medium">{item.name.es}</td>
                    <td className="px-4 py-3 text-primary/60">{categoryName(item.categoryId)}</td>
                    <td className="px-4 py-3">{formatCurrency(item.basePrice)}</td>
                    <td className="px-4 py-3 text-primary/50">
                      {item.ingredients?.length ?? 0} ing.
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`text-xs px-2 py-0.5 rounded-full ${
                          item.isAvailable
                            ? 'bg-green-100 text-green-700'
                            : 'bg-red-100 text-red-700'
                        }`}
                      >
                        {item.isAvailable ? 'Activo' : 'Inactivo'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right space-x-2">
                      <button
                        onClick={() => openItemForm(item)}
                        className="text-xs text-primary/60 hover:underline"
                      >
                        Editar
                      </button>
                      <button
                        onClick={() => toggleAvailability(item)}
                        className="text-xs text-primary/60 hover:underline"
                      >
                        {item.isAvailable ? 'Off' : 'On'}
                      </button>
                      <button
                        onClick={() => handleDeleteItem(item._id)}
                        className="text-xs text-red-600 hover:underline"
                      >
                        Eliminar
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}
