import { useState } from 'react';

export function CopyField({ label, value, hint }: { label: string; value: string; hint?: string }) {
  const [copied, setCopied] = useState(false);

  const copy = async () => {
    await navigator.clipboard.writeText(value);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div>
      <label className="text-sm text-primary/50">{label}</label>
      <div className="mt-1 flex gap-2">
        <input
          readOnly
          value={value}
          className="flex-1 px-4 py-2.5 rounded-xl border border-primary/10 text-sm bg-primary/5 font-mono text-xs"
        />
        <button
          type="button"
          onClick={() => void copy()}
          className="px-3 py-2 rounded-xl border border-primary/10 text-sm hover:bg-primary/5 shrink-0"
        >
          {copied ? 'Copiado' : 'Copiar'}
        </button>
      </div>
      {hint && <p className="text-xs text-primary/40 mt-1">{hint}</p>}
    </div>
  );
}
