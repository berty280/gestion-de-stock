import { useEffect, useState } from 'react';
import { api, ApiError } from '../lib/api';
import { useAuth } from '../auth/AuthContext';
import { roleAtLeast } from '../lib/roles';
import type { Product } from '../lib/types';
import { useToast } from '../components/Toast';
import { Button, Card, Field, PageTitle, Select, Spinner } from '../components/ui';
import { Modal } from '../components/Modal';

interface EditState {
  id: number | null;
  gtin: string;
  name: string;
  brand: string;
  category: string;
  unit: string;
  mini_vitrine: number;
  mini_stock: number;
}

const blank: EditState = {
  id: null,
  gtin: '',
  name: '',
  brand: '',
  category: '',
  unit: 'pièce',
  mini_vitrine: 1,
  mini_stock: 0,
};

export function ProductsPage() {
  const toast = useToast();
  const { user } = useAuth();
  const isSupervisor = roleAtLeast(user?.role, 'SUPERVISOR');

  const [q, setQ] = useState('');
  const [rows, setRows] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [edit, setEdit] = useState<EditState | null>(null);
  const [adjust, setAdjust] = useState<Product | null>(null);
  const [busy, setBusy] = useState(false);

  function load() {
    setLoading(true);
    api<Product[]>(`/products${q.trim() ? `?q=${encodeURIComponent(q.trim())}` : ''}`)
      .then(setRows)
      .catch((e) => toast.error(e instanceof ApiError ? e.message : 'Erreur'))
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    const h = setTimeout(load, 250);
    return () => clearTimeout(h);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q]);

  async function saveEdit() {
    if (!edit) return;
    if (!edit.name.trim()) {
      toast.error('Nom requis.');
      return;
    }
    setBusy(true);
    const payload = {
      gtin: edit.gtin.trim() || null,
      name: edit.name.trim(),
      brand: edit.brand.trim() || null,
      category: edit.category.trim() || null,
      unit: edit.unit.trim() || null,
      mini_vitrine: edit.mini_vitrine,
      mini_stock: edit.mini_stock,
    };
    try {
      if (edit.id) {
        await api(`/products/${edit.id}`, { method: 'PATCH', body: payload });
        toast.success('Produit mis à jour.');
      } else {
        await api('/products', { method: 'POST', body: { ...payload, source: 'manuel' } });
        toast.success('Produit créé.');
      }
      setEdit(null);
      load();
    } catch (e) {
      toast.error(e instanceof ApiError ? e.message : 'Enregistrement impossible');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <PageTitle title="Produits" subtitle="Catalogue et seuils" />
        <Button onClick={() => setEdit({ ...blank })}>+ Nouveau</Button>
      </div>

      <Field placeholder="Rechercher…" value={q} onChange={(e) => setQ(e.target.value)} />

      {loading ? (
        <Spinner label="Chargement…" />
      ) : (
        <Card className="overflow-x-auto p-0">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-left text-xs uppercase text-slate-400">
              <tr>
                <th className="px-3 py-2">Produit</th>
                <th className="px-3 py-2 text-right">Vitrine</th>
                <th className="px-3 py-2 text-right">Réserve</th>
                <th className="px-3 py-2 text-right">Seuils</th>
                <th className="px-3 py-2"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {rows.map((p) => {
                const vitrineLow = p.vitrine < p.mini_vitrine;
                const stockLow = p.stock < p.mini_stock || (p.vitrine === 0 && p.stock === 0);
                return (
                  <tr key={p.id}>
                    <td className="px-3 py-2">
                      <div className="font-medium text-slate-800">{p.name}</div>
                      <div className="text-xs text-slate-400">
                        {p.brand || '—'} {p.gtin ? `· ${p.gtin}` : ''}
                      </div>
                    </td>
                    <td className="px-3 py-2 text-right">
                      <span className={vitrineLow ? 'font-semibold text-amber-600' : ''}>
                        {p.vitrine}
                      </span>
                    </td>
                    <td className="px-3 py-2 text-right">
                      <span className={stockLow ? 'font-semibold text-rose-600' : ''}>{p.stock}</span>
                    </td>
                    <td className="px-3 py-2 text-right text-xs text-slate-500">
                      {p.mini_vitrine} / {p.mini_stock}
                    </td>
                    <td className="px-3 py-2 text-right">
                      <div className="flex justify-end gap-1">
                        <button
                          onClick={() =>
                            setEdit({
                              id: p.id,
                              gtin: p.gtin ?? '',
                              name: p.name,
                              brand: p.brand ?? '',
                              category: p.category ?? '',
                              unit: p.unit ?? '',
                              mini_vitrine: p.mini_vitrine,
                              mini_stock: p.mini_stock,
                            })
                          }
                          className="rounded bg-slate-100 px-2 py-1 text-xs hover:bg-slate-200"
                        >
                          Éditer
                        </button>
                        {isSupervisor && (
                          <button
                            onClick={() => setAdjust(p)}
                            className="rounded bg-slate-100 px-2 py-1 text-xs hover:bg-slate-200"
                          >
                            Ajuster
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
              {rows.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-3 py-6 text-center text-slate-400">
                    Aucun produit.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </Card>
      )}

      {edit && (
        <Modal title={edit.id ? 'Modifier le produit' : 'Nouveau produit'} onClose={() => setEdit(null)}>
          <div className="space-y-3">
            <Field label="Nom" value={edit.name} onChange={(e) => setEdit({ ...edit, name: e.target.value })} />
            <Field label="GTIN" value={edit.gtin} onChange={(e) => setEdit({ ...edit, gtin: e.target.value })} />
            <div className="grid grid-cols-2 gap-3">
              <Field label="Marque" value={edit.brand} onChange={(e) => setEdit({ ...edit, brand: e.target.value })} />
              <Field label="Catégorie" value={edit.category} onChange={(e) => setEdit({ ...edit, category: e.target.value })} />
            </div>
            <div className="grid grid-cols-3 gap-3">
              <Field label="Unité" value={edit.unit} onChange={(e) => setEdit({ ...edit, unit: e.target.value })} />
              <Field
                label="Mini vitrine"
                type="number"
                min={0}
                value={edit.mini_vitrine}
                onChange={(e) => setEdit({ ...edit, mini_vitrine: Number(e.target.value) })}
              />
              <Field
                label="Mini stock"
                type="number"
                min={0}
                value={edit.mini_stock}
                onChange={(e) => setEdit({ ...edit, mini_stock: Number(e.target.value) })}
              />
            </div>
            <div className="flex gap-2 pt-2">
              <Button onClick={saveEdit} disabled={busy} className="flex-1">
                {busy ? 'Enregistrement…' : 'Enregistrer'}
              </Button>
              <Button variant="secondary" onClick={() => setEdit(null)} disabled={busy}>
                Annuler
              </Button>
            </div>
          </div>
        </Modal>
      )}

      {adjust && (
        <AdjustModal
          product={adjust}
          onClose={() => setAdjust(null)}
          onDone={() => {
            setAdjust(null);
            load();
          }}
        />
      )}
    </div>
  );
}

function AdjustModal({
  product,
  onClose,
  onDone,
}: {
  product: Product;
  onClose: () => void;
  onDone: () => void;
}) {
  const toast = useToast();
  const [location, setLocation] = useState<'VITRINE' | 'STOCK'>('VITRINE');
  const [delta, setDelta] = useState(0);
  const [busy, setBusy] = useState(false);

  async function submit() {
    if (delta === 0) {
      toast.error('Le delta ne peut pas être 0.');
      return;
    }
    setBusy(true);
    try {
      await api('/operations/adjustment', {
        method: 'POST',
        body: { product_id: product.id, location, delta },
      });
      toast.success('Ajustement enregistré.');
      onDone();
    } catch (e) {
      toast.error(e instanceof ApiError ? e.message : 'Ajustement impossible');
    } finally {
      setBusy(false);
    }
  }

  return (
    <Modal title={`Ajuster — ${product.name}`} onClose={onClose}>
      <div className="space-y-3">
        <p className="text-sm text-slate-500">
          Vitrine actuelle {product.vitrine} · Réserve {product.stock}. Un delta négatif retire, positif
          ajoute.
        </p>
        <Select label="Emplacement" value={location} onChange={(e) => setLocation(e.target.value as 'VITRINE' | 'STOCK')}>
          <option value="VITRINE">Vitrine</option>
          <option value="STOCK">Réserve (stock)</option>
        </Select>
        <Field
          label="Delta (ex. -2 ou 5)"
          type="number"
          value={delta}
          onChange={(e) => setDelta(Number(e.target.value))}
        />
        <div className="flex gap-2 pt-2">
          <Button onClick={submit} disabled={busy} className="flex-1">
            {busy ? 'Traitement…' : 'Appliquer'}
          </Button>
          <Button variant="secondary" onClick={onClose} disabled={busy}>
            Annuler
          </Button>
        </div>
      </div>
    </Modal>
  );
}
