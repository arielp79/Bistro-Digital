import { useEffect, useState } from 'react';
import type { MenuItemPublic, SelectedModifier } from '@bistro/shared-types';
import { validateModifiers } from '../utils/modifiers';
import { formatCurrency } from '../utils/format';

interface ModifierModalProps {
  item: MenuItemPublic;
  currency: string;
  onClose: () => void;
  onConfirm: (
    modifiers: SelectedModifier[],
    quantity: number,
    notes: string
  ) => void;
  labels: {
    title: string;
    required: string;
    optional: string;
    notes: string;
    notesPlaceholder: string;
    quantity: string;
    add: string;
    cancel: string;
    selectOption: string;
  };
}

export function ModifierModal({ item, currency, onClose, onConfirm, labels }: ModifierModalProps) {
  const [selections, setSelections] = useState<Record<string, string[]>>({});
  const [quantity, setQuantity] = useState(1);
  const [notes, setNotes] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = '';
    };
  }, []);

  const toggleOption = (groupId: string, optionId: string, maxSelections: number) => {
    setSelections((prev) => {
      const current = prev[groupId] ?? [];
      const exists = current.includes(optionId);

      if (maxSelections === 1) {
        return { ...prev, [groupId]: exists ? [] : [optionId] };
      }

      if (exists) {
        return { ...prev, [groupId]: current.filter((id) => id !== optionId) };
      }
      if (current.length >= maxSelections) return prev;
      return { ...prev, [groupId]: [...current, optionId] };
    });
    setError('');
  };

  const buildModifiers = (): SelectedModifier[] => {
    const result: SelectedModifier[] = [];
    for (const group of item.modifierGroups) {
      const selected = selections[group.groupId] ?? [];
      for (const optionId of selected) {
        const option = group.options.find((o) => o.optionId === optionId);
        if (option) {
          result.push({
            groupId: group.groupId,
            groupName: group.name,
            optionId: option.optionId,
            optionName: option.name,
            priceAdjustment: option.priceAdjustment,
          });
        }
      }
    }
    return result;
  };

  const unitPrice =
    item.basePrice + buildModifiers().reduce((s, m) => s + m.priceAdjustment, 0);

  const handleConfirm = () => {
    const flatSelections = Object.entries(selections).flatMap(([groupId, optionIds]) =>
      optionIds.map((optionId) => ({ groupId, optionId }))
    );

    if (!validateModifiers(item.modifierGroups, flatSelections)) {
      setError(labels.selectOption);
      return;
    }

    onConfirm(buildModifiers(), quantity, notes);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
      <div className="absolute inset-0 bg-primary/40" onClick={onClose} />
      <div className="relative w-full max-w-lg max-h-[90vh] overflow-y-auto bg-surface rounded-t-2xl sm:rounded-2xl shadow-xl">
        <div className="sticky top-0 bg-surface border-b border-primary/10 px-5 py-4">
          <h3 className="text-lg font-semibold">{item.name}</h3>
          <p className="text-sm text-primary/60">{formatCurrency(unitPrice, currency)}</p>
        </div>

        <div className="px-5 py-4 space-y-5">
          {item.modifierGroups.map((group) => (
            <div key={group.groupId}>
              <p className="text-sm font-medium mb-2">
                {group.name}{' '}
                <span className="text-primary/40 font-normal">
                  ({group.required ? labels.required : labels.optional})
                </span>
              </p>
              <div className="space-y-2">
                {group.options.map((option) => {
                  const selected = (selections[group.groupId] ?? []).includes(option.optionId);
                  return (
                    <button
                      key={option.optionId}
                      type="button"
                      onClick={() =>
                        toggleOption(group.groupId, option.optionId, group.maxSelections)
                      }
                      className={`w-full flex items-center justify-between px-4 py-3 rounded-xl border text-left transition ${
                        selected
                          ? 'border-accent bg-accent/10'
                          : 'border-primary/10 hover:border-primary/20'
                      }`}
                    >
                      <span className="text-sm">{option.name}</span>
                      {option.priceAdjustment > 0 && (
                        <span className="text-xs text-primary/50">
                          +{formatCurrency(option.priceAdjustment, currency)}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          ))}

          <div>
            <label className="text-sm font-medium">{labels.notes}</label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder={labels.notesPlaceholder}
              className="mt-1 w-full px-3 py-2 rounded-xl border border-primary/10 text-sm resize-none h-20 focus:outline-none focus:border-accent"
            />
          </div>

          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">{labels.quantity}</span>
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                className="w-8 h-8 rounded-full bg-primary/5 text-lg font-medium"
              >
                −
              </button>
              <span className="w-6 text-center font-medium">{quantity}</span>
              <button
                type="button"
                onClick={() => setQuantity((q) => q + 1)}
                className="w-8 h-8 rounded-full bg-primary/5 text-lg font-medium"
              >
                +
              </button>
            </div>
          </div>

          {error && <p className="text-sm text-red-600">{error}</p>}
        </div>

        <div className="sticky bottom-0 bg-surface border-t border-primary/10 px-5 py-4 flex gap-3">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 py-3 rounded-xl border border-primary/10 text-sm font-medium"
          >
            {labels.cancel}
          </button>
          <button
            type="button"
            onClick={handleConfirm}
            className="flex-1 py-3 rounded-xl bg-primary text-white text-sm font-medium"
          >
            {labels.add} · {formatCurrency(unitPrice * quantity, currency)}
          </button>
        </div>
      </div>
    </div>
  );
}
