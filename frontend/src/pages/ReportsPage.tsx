import { useEffect, useState } from 'react';
import { api, ApiError } from '../lib/api';
import type { MovementRow, SalesReport, StockRow } from '../lib/types';
import { useToast } from '../components/Toast';
import { Badge, Card, Field, PageTitle, Select, Spinner } from '../components/ui';

type Tab = 'stock' | 'mouvements' | 'ventes';

const movementLabel: Record<string, string> = {
  RECEPTION: 'Réception',
  REAPPRO: 'Réappro',
  VENTE: 'Vente',
  AJUSTEMENT: 'Ajustement',
};

export function ReportsPage() {
  const [tab, setTab] = useState<Tab>('stock');
  return (
    <div className="space-y-4">
      <PageTitle title="Rapports" subtitle="Stock courant, mouvements et ventes" />
      <div className="flex gap-2">
        {(
          [
            ['stock', 'Stock courant'],
            ['mouvements', 'Mouvements'],
            ['ventes', 'Ventes du jour'],
          ] as const
        ).map(([key, label]) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            className={`rounded-lg px-3 py-1.5 text-sm ${
              tab === key ? 'bg-teal-600 text-white' : 'bg-white text-slate-600 border border-slate-300'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {tab === 'stock' && <StockReport />}
      {tab === 'mouvements' && <MovementsReport />}
      {tab === 'ventes' && <SalesReportView />}
    </div>
  );
}

function StockReport() {
  const toast = useToast();
  const [rows, setRows] = useState<StockRow[]>([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    api<StockRow[]>('/reports/stock')
      .then(setRows)
      .catch((e) => toast.error(e instanceof ApiError ? e.message : 'Erreur'))
      .finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  if (loading) return <Spinner label="Chargement…" />;
  return (
    <Card className="overflow-x-auto p-0">
      <table className="w-full text-sm">
        <thead className="bg-slate-50 text-left text-xs uppercase text-slate-400">
          <tr>
            <th className="px-3 py-2">Produit</th>
            <th className="px-3 py-2 text-right">Vitrine</th>
            <th className="px-3 py-2 text-right">Réserve</th>
            <th className="px-3 py-2">État</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {rows.map((r) => (
            <tr key={r.id}>
              <td className="px-3 py-2">
                <div className="font-medium text-slate-800">{r.name}</div>
                <div className="text-xs text-slate-400">{r.brand || '—'}</div>
              </td>
              <td className={`px-3 py-2 text-right ${r.vitrine_low ? 'font-semibold text-amber-600' : ''}`}>
                {r.vitrine}
              </td>
              <td className={`px-3 py-2 text-right ${r.stock_low ? 'font-semibold text-rose-600' : ''}`}>
                {r.stock}
              </td>
              <td className="px-3 py-2">
                {r.stock_low && <Badge tone="rose">Réserve basse</Badge>}{' '}
                {r.vitrine_low && <Badge tone="amber">Vitrine basse</Badge>}
                {!r.stock_low && !r.vitrine_low && <Badge tone="emerald">OK</Badge>}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </Card>
  );
}

function MovementsReport() {
  const toast = useToast();
  const [type, setType] = useState('');
  const [rows, setRows] = useState<MovementRow[]>([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    setLoading(true);
    api<MovementRow[]>(`/reports/movements${type ? `?type=${type}` : ''}`)
      .then(setRows)
      .catch((e) => toast.error(e instanceof ApiError ? e.message : 'Erreur'))
      .finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [type]);
  return (
    <div className="space-y-3">
      <div className="max-w-xs">
        <Select value={type} onChange={(e) => setType(e.target.value)}>
          <option value="">Tous les types</option>
          <option value="RECEPTION">Réception</option>
          <option value="REAPPRO">Réappro</option>
          <option value="VENTE">Vente</option>
          <option value="AJUSTEMENT">Ajustement</option>
        </Select>
      </div>
      {loading ? (
        <Spinner label="Chargement…" />
      ) : (
        <Card className="overflow-x-auto p-0">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-left text-xs uppercase text-slate-400">
              <tr>
                <th className="px-3 py-2">Date</th>
                <th className="px-3 py-2">Type</th>
                <th className="px-3 py-2">Produit</th>
                <th className="px-3 py-2 text-right">Qté</th>
                <th className="px-3 py-2">Flux</th>
                <th className="px-3 py-2">Par</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {rows.map((m) => (
                <tr key={m.id}>
                  <td className="px-3 py-2 text-xs text-slate-500">
                    {new Date(m.created_at).toLocaleString('fr-FR')}
                  </td>
                  <td className="px-3 py-2">{movementLabel[m.type] ?? m.type}</td>
                  <td className="px-3 py-2">{m.product_name}</td>
                  <td className="px-3 py-2 text-right">{m.quantity}</td>
                  <td className="px-3 py-2 text-xs text-slate-500">
                    {m.from_location ?? '—'} → {m.to_location ?? '—'}
                  </td>
                  <td className="px-3 py-2 text-xs text-slate-500">{m.user_name ?? '—'}</td>
                </tr>
              ))}
              {rows.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-3 py-6 text-center text-slate-400">
                    Aucun mouvement.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </Card>
      )}
    </div>
  );
}

function SalesReportView() {
  const toast = useToast();
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [data, setData] = useState<SalesReport | null>(null);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    setLoading(true);
    api<SalesReport>(`/reports/sales?date=${date}`)
      .then(setData)
      .catch((e) => toast.error(e instanceof ApiError ? e.message : 'Erreur'))
      .finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [date]);
  return (
    <div className="space-y-3">
      <div className="max-w-xs">
        <Field label="Date" type="date" value={date} onChange={(e) => setDate(e.target.value)} />
      </div>
      {loading ? (
        <Spinner label="Chargement…" />
      ) : (
        <>
          <div className="grid grid-cols-2 gap-3">
            <Card className="text-center">
              <div className="text-3xl font-bold text-teal-700">{data?.sales_count ?? 0}</div>
              <div className="text-sm text-slate-500">Ventes</div>
            </Card>
            <Card className="text-center">
              <div className="text-3xl font-bold text-teal-700">{data?.items_sold ?? 0}</div>
              <div className="text-sm text-slate-500">Articles vendus</div>
            </Card>
          </div>
          <Card className="overflow-x-auto p-0">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 text-left text-xs uppercase text-slate-400">
                <tr>
                  <th className="px-3 py-2">#</th>
                  <th className="px-3 py-2">Heure</th>
                  <th className="px-3 py-2">Client</th>
                  <th className="px-3 py-2">Vendeur</th>
                  <th className="px-3 py-2 text-right">Articles</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {data?.sales.map((s) => (
                  <tr key={s.id}>
                    <td className="px-3 py-2">{s.id}</td>
                    <td className="px-3 py-2 text-xs text-slate-500">
                      {new Date(s.created_at).toLocaleTimeString('fr-FR')}
                    </td>
                    <td className="px-3 py-2">{s.customer_name ?? 'Inconnu'}</td>
                    <td className="px-3 py-2 text-xs text-slate-500">{s.seller ?? '—'}</td>
                    <td className="px-3 py-2 text-right">{s.total_items}</td>
                  </tr>
                ))}
                {(!data || data.sales.length === 0) && (
                  <tr>
                    <td colSpan={5} className="px-3 py-6 text-center text-slate-400">
                      Aucune vente ce jour.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </Card>
        </>
      )}
    </div>
  );
}
