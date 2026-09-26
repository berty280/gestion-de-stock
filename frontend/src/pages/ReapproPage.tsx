import { useState } from 'react';
import { api, ApiError } from '../lib/api';
import type { LookupResult, Product } from '../lib/types';
import { useToast } from '../components/Toast';
import { BarcodeScanner } from '../components/BarcodeScanner';
import { Button, Card, Field, PageTitle } from '../components/ui';
import { ProductPicker } from '../components/ProductPicker';

export function ReapproPage() {
  const toast = useToast();
  const [product, setProduct] = useState<Product | null>(null);
  const [quantity, setQuantity] = useState(1);
  const [busy, setBusy] = useState(false);

  async function refresh(id: number) {
    try {
      const p = await api<Product>(`/products/${id}`);
      setProduct(p);
    } catch {
      /* ignore */
    }
  }

  async function onScan(gtin: string) {
    try {
      const res = await api<LookupResult>(`/products/lookup/${encodeURIComponent(gtin)}`);
      if (res.source === 'local') {
        setProduct(res.product);
        setQuantity(1);
      } else {
        toast.error(`Produit inconnu (${gtin}). Faites d'abord une réception.`);
      }
    } catch (e) {
      toast.error(e instanceof ApiError ? e.message : 'Erreur de recherche');
    }
  }

  async function submit() {
    if (!product) return;
    if (quantity <= 0 || quantity > product.stock) {
      toast.error(`Quantité invalide (réserve disponible : ${product.stock}).`);
      return;
    }
    setBusy(true);
    try {
      await api('/operations/reappro', {
        method: 'POST',
        body: { product_id: product.id, quantity, scan_uid: crypto.randomUUID() },
      });
      toast.success(`Réappro : ${quantity} déplacé(s) vers la vitrine.`);
      await refresh(product.id);
      setQuantity(1);
    } catch (e) {
      toast.error(e instanceof ApiError ? e.message : 'Réappro impossible');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-5">
      <PageTitle title="Réappro" subtitle="Déplacer du stock vers la vitrine (Stock −N, Vitrine +N)" />

      <div className="grid gap-5 lg:grid-cols-2">
        <div className="space-y-4">
          <Card>
            <h2 className="mb-3 font-semibold text-slate-800">Scanner</h2>
            <BarcodeScanner onDetected={onScan} disabled={busy} />
          </Card>
          <Card>
            <h2 className="mb-3 font-semibold text-slate-800">Ou rechercher</h2>
            <ProductPicker
              onPick={(p) => {
                setProduct(p);
                setQuantity(1);
              }}
            />
          </Card>
        </div>

        <Card>
          {!product ? (
            <p className="text-sm text-slate-500">Sélectionnez un produit à réapprovisionner.</p>
          ) : (
            <div className="space-y-3">
              <h2 className="font-semibold text-slate-800">{product.name}</h2>
              <p className="text-sm text-slate-500">{product.brand}</p>
              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-lg bg-slate-50 p-3 text-center">
                  <div className="text-2xl font-bold text-slate-800">{product.vitrine}</div>
                  <div className="text-xs text-slate-500">Vitrine (mini {product.mini_vitrine})</div>
                </div>
                <div className="rounded-lg bg-slate-50 p-3 text-center">
                  <div className="text-2xl font-bold text-slate-800">{product.stock}</div>
                  <div className="text-xs text-slate-500">Réserve (mini {product.mini_stock})</div>
                </div>
              </div>
              <Field
                label="Quantité à déplacer vers la vitrine"
                type="number"
                min={1}
                max={product.stock}
                value={quantity}
                onChange={(e) => setQuantity(Number(e.target.value))}
              />
              <Button onClick={submit} disabled={busy || product.stock === 0} className="w-full">
                {busy ? 'Traitement…' : 'Valider le réappro'}
              </Button>
              {product.stock === 0 && (
                <p className="text-sm text-amber-600">
                  Réserve vide — une réception (recommande fournisseur) est nécessaire.
                </p>
              )}
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}
