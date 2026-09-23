import { useEffect, useState } from 'react';
import { api } from '../lib/api';
import type { Product } from '../lib/types';
import { Field } from './ui';

interface Props {
  onPick: (product: Product) => void;
  onlyInStock?: boolean;
}

export function ProductPicker({ onPick, onlyInStock }: Props) {
  const [q, setQ] = useState('');
  const [results, setResults] = useState<Product[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let active = true;
    const handle = setTimeout(() => {
      setLoading(true);
      api<Product[]>(`/products${q.trim() ? `?q=${encodeURIComponent(q.trim())}` : ''}`)
        .then((rows) => {
          if (!active) return;
          setResults(onlyInStock ? rows.filter((r) => r.vitrine > 0) : rows);
        })
        .catch(() => active && setResults([]))
        .finally(() => active && setLoading(false));
    }, 250);
    return () => {
      active = false;
      clearTimeout(handle);
    };
  }, [q, onlyInStock]);

  return (
    <div className="space-y-2">
      <Field
        placeholder="Nom, marque ou code-barres…"
        value={q}
        onChange={(e) => setQ(e.target.value)}
      />
      <div className="max-h-64 overflow-y-auto rounded-lg border border-slate-100">
        {loading && <p className="p-3 text-sm text-slate-400">Recherche…</p>}
        {!loading && results.length === 0 && (
          <p className="p-3 text-sm text-slate-400">Aucun produit.</p>
        )}
        <ul className="divide-y divide-slate-100">
          {results.map((p) => (
            <li key={p.id} className="flex items-center gap-3 p-2 hover:bg-slate-50">
              <div className="flex-1">
                <div className="text-sm font-medium text-slate-800">{p.name}</div>
                <div className="text-xs text-slate-500">
                  {p.brand || '—'} · vitrine {p.vitrine} / stock {p.stock}
                </div>
              </div>
              <button
                type="button"
                onClick={() => onPick(p)}
                className="rounded-lg bg-teal-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-teal-700"
              >
                Ajouter
              </button>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
