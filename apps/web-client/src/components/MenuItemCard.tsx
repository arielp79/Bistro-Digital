import type { MenuItemPublic } from '@bistro/shared-types';
import { formatCurrency } from '../utils/format';

interface MenuItemCardProps {
  item: MenuItemPublic;
  currency: string;
  onAdd?: (item: MenuItemPublic) => void;
  addLabel: string;
}

export function MenuItemCard({ item, currency, onAdd, addLabel }: MenuItemCardProps) {
  return (
    <article className="bg-surface rounded-2xl border border-primary/10 p-4 flex gap-4 shadow-sm">
      <div className="w-20 h-20 shrink-0 bg-accent/20 rounded-xl flex items-center justify-center text-2xl">
        {item.imageUrl ? (
          <img src={item.imageUrl} alt={item.name} className="w-full h-full object-cover rounded-xl" />
        ) : (
          <span>🍽️</span>
        )}
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-2">
          <h3 className="font-semibold text-primary leading-tight">{item.name}</h3>
          <span className="font-semibold text-primary whitespace-nowrap">
            {formatCurrency(item.basePrice, currency)}
          </span>
        </div>

        {item.description && (
          <p className="text-sm text-primary/60 mt-1 line-clamp-2">{item.description}</p>
        )}

        <div className="flex flex-wrap items-center gap-2 mt-2">
          {item.tags.map((tag) => (
            <span
              key={tag}
              className="text-xs px-2 py-0.5 rounded-full bg-primary/5 text-primary/70"
            >
              {tag}
            </span>
          ))}
          <span className="text-xs text-primary/40">
            ~{item.preparationTimeMinutes} min
          </span>
        </div>

        {onAdd && (
          <button
            onClick={() => onAdd(item)}
            className="mt-3 w-full py-2 text-sm font-medium bg-primary text-white rounded-lg hover:opacity-90 transition"
          >
            {addLabel}
          </button>
        )}
      </div>
    </article>
  );
}
