import { Link } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';
import { useFetch } from '../lib/useFetch';
import { roleAtLeast } from '../lib/roles';
import type { Alert, SalesReport, StockRow } from '../lib/types';
import { Badge, Card, PageTitle, Spinner } from '../components/ui';

function Stat({ label, value, tone }: { label: string; value: string | number; tone?: string }) {
  return (
    <Card className="text-center">
      <div className={`text-3xl font-bold ${tone ?? 'text-slate-900'}`}>{value}</div>
      <div className="mt-1 text-sm text-slate-500">{label}</div>
    </Card>
  );
}

const quickLinks = [
  { to: '/vente', label: 'Nouvelle vente', min: 'OPERATOR' as const, emoji: '🛒' },
  { to: '/reception', label: 'Réception', min: 'ADMIN' as const, emoji: '📦' },
  { to: '/reappro', label: 'Réappro rayon', min: 'ADMIN' as const, emoji: '🔁' },
  { to: '/clients', label: 'Clients', min: 'OPERATOR' as const, emoji: '👥' },
  { to: '/produits', label: 'Produits', min: 'ADMIN' as const, emoji: '🏷️' },
  { to: '/rapports', label: 'Rapports', min: 'ADMIN' as const, emoji: '📊' },
];

export function DashboardPage() {
  const { user } = useAuth();
  const isAdmin = roleAtLeast(user?.role, 'ADMIN');

  const alerts = useFetch<Alert[]>(isAdmin ? '/alerts?status=OUVERTE' : null);
  const sales = useFetch<SalesReport>(isAdmin ? '/reports/sales' : null);
  const stock = useFetch<StockRow[]>(isAdmin ? '/reports/stock' : null);

  const lowStock = stock.data?.filter((r) => r.vitrine_low || r.stock_low).length ?? 0;

  return (
    <div className="space-y-6">
      <PageTitle title={`Bonjour, ${user?.name ?? ''}`} subtitle="Vue d'ensemble de la boutique" />

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        {quickLinks
          .filter((l) => roleAtLeast(user?.role, l.min))
          .map((l) => (
            <Link
              key={l.to}
              to={l.to}
              className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm transition hover:border-teal-400 hover:shadow"
            >
              <div className="text-2xl">{l.emoji}</div>
              <div className="mt-2 text-sm font-medium text-slate-700">{l.label}</div>
            </Link>
          ))}
      </div>

      {isAdmin && (
        <>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <Stat label="Ventes aujourd'hui" value={sales.data?.sales_count ?? '—'} tone="text-teal-700" />
            <Stat label="Articles vendus" value={sales.data?.items_sold ?? '—'} tone="text-teal-700" />
            <Stat label="Alertes ouvertes" value={alerts.data?.length ?? '—'} tone="text-rose-600" />
            <Stat label="Produits sous seuil" value={lowStock || '—'} tone="text-amber-600" />
          </div>

          <Card>
            <div className="mb-3 flex items-center justify-between">
              <h2 className="font-semibold text-slate-800">Alertes ouvertes</h2>
              <Link to="/alertes" className="text-sm text-teal-600 hover:underline">
                Voir tout
              </Link>
            </div>
            {alerts.loading && <Spinner label="Chargement…" />}
            {alerts.error && <p className="text-sm text-rose-600">{alerts.error}</p>}
            {alerts.data && alerts.data.length === 0 && (
              <p className="text-sm text-slate-500">Aucune alerte. Tout va bien 🎉</p>
            )}
            <ul className="divide-y divide-slate-100">
              {alerts.data?.slice(0, 6).map((a) => (
                <li key={a.id} className="flex items-center justify-between py-2">
                  <div>
                    <div className="text-sm font-medium text-slate-800">{a.product_name}</div>
                    <div className="text-xs text-slate-500">
                      Vitrine {a.vitrine ?? 0} · Stock {a.stock ?? 0}
                    </div>
                  </div>
                  {a.type === 'STOCK_LOW' ? (
                    <Badge tone="rose">Recommande fournisseur</Badge>
                  ) : (
                    <Badge tone="amber">Réapprovisionner le rayon</Badge>
                  )}
                </li>
              ))}
            </ul>
          </Card>
        </>
      )}

      {!isAdmin && (
        <Card>
          <p className="text-sm text-slate-600">
            Vous êtes connecté en tant qu'<strong>opérateur</strong>. Utilisez « Nouvelle vente »
            pour scanner les articles du rayon, et « Clients » pour gérer la clientèle.
          </p>
        </Card>
      )}
    </div>
  );
}
