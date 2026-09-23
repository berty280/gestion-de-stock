import { useState } from 'react';
import { api, ApiError } from '../lib/api';
import type { LookupResult, Product } from '../lib/types';
import { useToast } from '../components/Toast';
import { BarcodeScanner } from '../components/BarcodeScanner';
import { Badge, Button, Card, Field, PageTitle } from '../components/ui';

interface Draft {
  gtin: string;
  name: string;
  brand: string;
  category: string;
  unit: string;
  mini_vitrine: number;
  mini_stock: number;
  existingId: number | null; // set when the product already exists
  existingProduct: Product | null;
}

const emptyDraft = (gtin = ''): Draft => ({
  gtin,
  name: '',
  brand: '',
  category: '',
  unit: 'pièce',
  mini_vitrine: 1,
  mini_stock: 0,
  existingId: null,
  existingProduct: null,
});

export function ReceptionPage() {
  const toast = useToast();
  const [draft, setDraft] = useState<Draft | null>(null);
  const [quantity, setQuantity] = useState(1);
  const [busy, setBusy] = useState(false);
  const [origin, setOrigin] = useState<'local' | 'api' | 'none' | 'manual' | null>(null);

  async function onScan(gtin: string) {
    setQuantityReset();
    try {
      const res = await api<LookupResult>(`/products/lookup/${encodeURIComponent(gtin)}`);
      if (res.source === 'local') {
        setOrigin('local');
        setDraft({
          ...emptyDraft(gtin),
          name: res.product.name,
          brand: res.product.brand ?? '',
          category: res.product.category ?? '',
          unit: res.product.unit ?? '',
          mini_vitrine: res.product.mini_vitrine,
          mini_stock: res.product.mini_stock,
          existingId: res.product.id,
          existingProduct: res.product,
        });
        toast.success(`Produit connu : ${res.product.name}`);
      } else if (res.source === 'api') {
        setOrigin('api');
        setDraft({
          ...emptyDraft(gtin),
          name: res.suggestion.name,
          brand: res.suggestion.brand,
          category: res.suggestion.category,
        });
        toast.success('Fiche pré-remplie via Open Beauty Facts.');
      } else {
        setOrigin('none');
        setDraft(emptyDraft(gtin));
        toast.push('Produit inconnu : saisie manuelle.', 'info');
      }
    } catch (e) {
      toast.error(e instanceof ApiError ? e.message : 'Erreur de recherche');
    }
  }

  function setQuantityReset() {
    setQuantity(1);
  }

  function startManual() {
    setOrigin('manual');
    setDraft(emptyDraft());
  }

  function update<K extends keyof Draft>(key: K, value: Draft[K]) {
    setDraft((d) => (d ? { ...d, [key]: value } : d));
  }

  async function submit() {
    if (!draft) return;
    if (!draft.existingId && !draft.name.trim()) {
      toast.error('Le nom du produit est requis.');
      return;
    }
    if (quantity <= 0) {
      toast.error('Quantité invalide.');
      return;
    }
    setBusy(true);
    try {
      const body: Record<string, unknown> = {
        quantity,
        scan_uid: crypto.randomUUID(),
      };
      if (draft.existingId) {
        body.product_id = draft.existingId;
      } else {
        body.product = {
          gtin: draft.gtin.trim() || null,
          name: draft.name.trim(),
          brand: draft.brand.trim() || null,
          category: draft.category.trim() || null,
          unit: draft.unit.trim() || null,
          mini_vitrine: draft.mini_vitrine,
          mini_stock: draft.mini_stock,
          source: origin === 'api' ? 'api' : 'manuel',
        };
      }
      const res = await api<{ product: Product; movement: { quantity: number } }>(
        '/operations/reception',
        { method: 'POST', body },
      );
      toast.success(`Réception : +${res.movement.quantity} en stock pour « ${res.product.name} ».`);
      setDraft(null);
      setOrigin(null);
      setQuantity(1);
    } catch (e) {
      toast.error(e instanceof ApiError ? e.message : 'Réception impossible');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-5">
      <PageTitle title="Réception" subtitle="Entrée de marchandise en réserve (Stock +N)" />

      <div className="grid gap-5 lg:grid-cols-2">
        <Card>
          <h2 className="mb-3 font-semibold text-slate-800">Scanner le code-barres</h2>
          <BarcodeScanner onDetected={onScan} disabled={busy} />
          <div className="mt-3 border-t border-slate-100 pt-3">
            <Button variant="ghost" onClick={startManual} disabled={busy}>
              + Saisir un produit sans code-barres
            </Button>
          </div>
        </Card>

        <Card>
          {!draft ? (
            <p className="text-sm text-slate-500">
              Scannez un article ou ajoutez-le manuellement pour démarrer une réception.
            </p>
          ) : (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h2 className="font-semibold text-slate-800">
                  {draft.existingId ? 'Produit existant' : 'Nouveau produit'}
                </h2>
                {origin === 'local' && <Badge tone="emerald">Catalogue</Badge>}
                {origin === 'api' && <Badge tone="teal">Open Beauty Facts</Badge>}
                {(origin === 'none' || origin === 'manual') && <Badge tone="amber">Manuel</Badge>}
              </div>

              {draft.gtin && (
                <p className="text-xs text-slate-500">
                  GTIN : <span className="font-mono">{draft.gtin}</span>
                </p>
              )}

              <Field
                label="Nom"
                value={draft.name}
                onChange={(e) => update('name', e.target.value)}
                disabled={!!draft.existingId}
              />
              {!draft.existingId && (
                <>
                  <div className="grid grid-cols-2 gap-3">
                    <Field
                      label="Marque"
                      value={draft.brand}
                      onChange={(e) => update('brand', e.target.value)}
                    />
                    <Field
                      label="Catégorie"
                      value={draft.category}
                      onChange={(e) => update('category', e.target.value)}
                    />
                  </div>
                  <div className="grid grid-cols-3 gap-3">
                    <Field
                      label="Unité"
                      value={draft.unit}
                      onChange={(e) => update('unit', e.target.value)}
                    />
                    <Field
                      label="Mini vitrine"
                      type="number"
                      min={0}
                      value={draft.mini_vitrine}
                      onChange={(e) => update('mini_vitrine', Number(e.target.value))}
                    />
                    <Field
                      label="Mini stock"
                      type="number"
                      min={0}
                      value={draft.mini_stock}
                      onChange={(e) => update('mini_stock', Number(e.target.value))}
                    />
                  </div>
                </>
              )}

              {draft.existingProduct && (
                <p className="text-xs text-slate-500">
                  Stock actuel : vitrine {draft.existingProduct.vitrine} / réserve{' '}
                  {draft.existingProduct.stock}
                </p>
              )}

              <Field
                label="Quantité reçue"
                type="number"
                min={1}
                value={quantity}
                onChange={(e) => setQuantity(Number(e.target.value))}
              />

              <div className="flex gap-2 pt-1">
                <Button onClick={submit} disabled={busy} className="flex-1">
                  {busy ? 'Enregistrement…' : 'Valider la réception'}
                </Button>
                <Button variant="secondary" onClick={() => setDraft(null)} disabled={busy}>
                  Annuler
                </Button>
              </div>
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}
