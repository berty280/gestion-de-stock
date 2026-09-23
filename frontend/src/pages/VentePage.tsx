import { useState } from 'react';
import { api, ApiError } from '../lib/api';
import type { LookupResult, Product, Receipt } from '../lib/types';
import { useToast } from '../components/Toast';
import { BarcodeScanner } from '../components/BarcodeScanner';
import { Badge, Button, Card, Field, PageTitle } from '../components/ui';
import { ProductPicker } from '../components/ProductPicker';
import { ReceiptView } from '../components/ReceiptView';

interface CartLine {
  product: Product;
  quantity: number;
}

type CustomerMode = 'unknown' | 'new';

export function VentePage() {
  const toast = useToast();
  const [cart, setCart] = useState<CartLine[]>([]);
  const [mode, setMode] = useState<CustomerMode>('unknown');
  const [custName, setCustName] = useState('');
  const [custPhone, setCustPhone] = useState('');
  const [busy, setBusy] = useState(false);
  const [receipt, setReceipt] = useState<Receipt | null>(null);

  function addProduct(product: Product) {
    if (product.vitrine <= 0) {
      toast.error(`« ${product.name} » est en rupture en vitrine.`);
      return;
    }
    setCart((prev) => {
      const existing = prev.find((l) => l.product.id === product.id);
      if (existing) {
        if (existing.quantity >= product.vitrine) {
          toast.error(`Seulement ${product.vitrine} en vitrine pour « ${product.name} ».`);
          return prev;
        }
        return prev.map((l) =>
          l.product.id === product.id ? { ...l, quantity: l.quantity + 1 } : l,
        );
      }
      return [...prev, { product, quantity: 1 }];
    });
  }

  async function onScan(gtin: string) {
    try {
      const res = await api<LookupResult>(`/products/lookup/${encodeURIComponent(gtin)}`);
      if (res.source === 'local') {
        addProduct(res.product);
        toast.success(`Ajouté : ${res.product.name}`);
      } else {
        toast.error(`Produit inconnu (${gtin}). Une réception est nécessaire (Admin).`);
      }
    } catch (e) {
      toast.error(e instanceof ApiError ? e.message : 'Erreur de recherche');
    }
  }

  function setQty(productId: number, quantity: number) {
    setCart((prev) =>
      prev.flatMap((l) => {
        if (l.product.id !== productId) return [l];
        if (quantity <= 0) return [];
        const capped = Math.min(quantity, l.product.vitrine);
        return [{ ...l, quantity: capped }];
      }),
    );
  }

  const totalItems = cart.reduce((n, l) => n + l.quantity, 0);

  async function validate() {
    if (cart.length === 0) {
      toast.error('Le panier est vide.');
      return;
    }
    setBusy(true);
    try {
      const body: {
        unknown?: boolean;
        customer?: { name: string; phone: string | null };
        lines: Array<{ product_id: number; quantity: number; scan_uid: string }>;
      } = {
        lines: cart.map((l) => ({
          product_id: l.product.id,
          quantity: l.quantity,
          scan_uid: crypto.randomUUID(),
        })),
      };
      if (mode === 'new' && custName.trim()) {
        body.customer = { name: custName.trim(), phone: custPhone.trim() || null };
      } else {
        body.unknown = true;
      }
      const res = await api<Receipt>('/sales', { method: 'POST', body });
      setReceipt(res);
      setCart([]);
      setCustName('');
      setCustPhone('');
      setMode('unknown');
      toast.success(`Vente #${res.sale.id} enregistrée.`);
    } catch (e) {
      toast.error(e instanceof ApiError ? e.message : 'Vente impossible');
    } finally {
      setBusy(false);
    }
  }

  if (receipt) {
    return (
      <div className="space-y-4">
        <PageTitle title="Reçu de vente" />
        <ReceiptView receipt={receipt} />
        <div className="flex gap-2">
          <Button onClick={() => window.print()} variant="secondary">
            🖨️ Imprimer
          </Button>
          <Button onClick={() => setReceipt(null)}>Nouvelle vente</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <PageTitle title="Vente" subtitle="Scannez les articles du rayon (vitrine)" />

      <div className="grid gap-5 lg:grid-cols-2">
        <div className="space-y-4">
          <Card>
            <h2 className="mb-3 font-semibold text-slate-800">Scanner un article</h2>
            <BarcodeScanner onDetected={onScan} />
          </Card>
          <Card>
            <h2 className="mb-3 font-semibold text-slate-800">Ou rechercher un produit</h2>
            <ProductPicker onPick={addProduct} onlyInStock />
          </Card>
        </div>

        <div className="space-y-4">
          <Card>
            <h2 className="mb-3 font-semibold text-slate-800">
              Panier {totalItems > 0 && <Badge tone="teal">{totalItems}</Badge>}
            </h2>
            {cart.length === 0 ? (
              <p className="text-sm text-slate-500">Aucun article. Scannez ou recherchez un produit.</p>
            ) : (
              <ul className="divide-y divide-slate-100">
                {cart.map((l) => (
                  <li key={l.product.id} className="flex items-center gap-3 py-2">
                    <div className="flex-1">
                      <div className="text-sm font-medium text-slate-800">{l.product.name}</div>
                      <div className="text-xs text-slate-500">
                        {l.product.brand} · vitrine {l.product.vitrine}
                      </div>
                    </div>
                    <div className="flex items-center gap-1">
                      <button
                        className="h-7 w-7 rounded bg-slate-100 text-slate-700 hover:bg-slate-200"
                        onClick={() => setQty(l.product.id, l.quantity - 1)}
                      >
                        −
                      </button>
                      <span className="w-8 text-center text-sm">{l.quantity}</span>
                      <button
                        className="h-7 w-7 rounded bg-slate-100 text-slate-700 hover:bg-slate-200"
                        onClick={() => setQty(l.product.id, l.quantity + 1)}
                      >
                        +
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </Card>

          <Card>
            <h2 className="mb-3 font-semibold text-slate-800">Client</h2>
            <div className="mb-3 flex gap-2">
              <button
                onClick={() => setMode('unknown')}
                className={`flex-1 rounded-lg border px-3 py-2 text-sm ${
                  mode === 'unknown'
                    ? 'border-teal-500 bg-teal-50 text-teal-700'
                    : 'border-slate-300 text-slate-600'
                }`}
              >
                Client inconnu
              </button>
              <button
                onClick={() => setMode('new')}
                className={`flex-1 rounded-lg border px-3 py-2 text-sm ${
                  mode === 'new'
                    ? 'border-teal-500 bg-teal-50 text-teal-700'
                    : 'border-slate-300 text-slate-600'
                }`}
              >
                Nom + téléphone
              </button>
            </div>
            {mode === 'new' && (
              <div className="space-y-2">
                <Field
                  label="Nom du client"
                  value={custName}
                  onChange={(e) => setCustName(e.target.value)}
                  placeholder="Ex. Awa Ngono"
                />
                <Field
                  label="Téléphone"
                  value={custPhone}
                  onChange={(e) => setCustPhone(e.target.value)}
                  inputMode="tel"
                  placeholder="Ex. 6XX XX XX XX"
                />
              </div>
            )}
          </Card>

          <Button
            onClick={validate}
            disabled={busy || cart.length === 0 || (mode === 'new' && !custName.trim())}
            className="w-full py-3 text-base"
          >
            {busy ? 'Validation…' : `Valider la vente (${totalItems})`}
          </Button>
        </div>
      </div>
    </div>
  );
}
