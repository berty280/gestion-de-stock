import { useEffect, useState } from 'react';
import { api, ApiError } from '../lib/api';
import { useAuth } from '../auth/AuthContext';
import { roleAtLeast } from '../lib/roles';
import type { Alert } from '../lib/types';
import { useToast } from '../components/Toast';
import { Badge, Button, Card, PageTitle, Spinner } from '../components/ui';

export function AlertsPage() {
  const toast = useToast();
  const { user } = useAuth();
  const canResolve = roleAtLeast(user?.role, 'SUPERVISOR');

  const [status, setStatus] = useState<'OUVERTE' | 'RESOLUE'>('OUVERTE');
  const [rows, setRows] = useState<Alert[]>([]);
  const [loading, setLoading] = useState(true);

  function load() {
    setLoading(true);
    api<Alert[]>(`/alerts?status=${status}`)
      .then(setRows)
      .catch((e) => toast.error(e instanceof ApiError ? e.message : 'Erreur'))
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status]);

  async function resolve(a: Alert) {
    try {
      await api(`/alerts/${a.id}/resolve`, { method: 'POST' });
      toast.success('Alerte résolue.');
      load();
    } catch (e) {
      toast.error(e instanceof ApiError ? e.message : 'Impossible');
    }
  }

  return (
    <div className="space-y-4">
      <PageTitle title="Alertes" subtitle="Seuils de vitrine et de réserve" />

      <div className="flex gap-2">
        {(['OUVERTE', 'RESOLUE'] as const).map((s) => (
          <button
            key={s}
            onClick={() => setStatus(s)}
            className={`rounded-lg px-3 py-1.5 text-sm ${
              status === s ? 'bg-teal-600 text-white' : 'bg-white text-slate-600 border border-slate-300'
            }`}
          >
            {s === 'OUVERTE' ? 'Ouvertes' : 'Résolues'}
          </button>
        ))}
      </div>

      {loading ? (
        <Spinner label="Chargement…" />
      ) : rows.length === 0 ? (
        <Card>
          <p className="text-sm text-slate-500">
            {status === 'OUVERTE' ? 'Aucune alerte ouverte. 🎉' : 'Aucune alerte résolue.'}
          </p>
        </Card>
      ) : (
        <Card className="p-0">
          <ul className="divide-y divide-slate-100">
            {rows.map((a) => (
              <li key={a.id} className="flex items-center gap-3 px-4 py-3">
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-slate-800">{a.product_name}</span>
                    {a.type === 'STOCK_LOW' ? (
                      <Badge tone="rose">Réserve basse</Badge>
                    ) : (
                      <Badge tone="amber">Vitrine basse</Badge>
                    )}
                    {a.type === 'STOCK_LOW' && (
                      <Badge tone={a.email_sent ? 'emerald' : 'slate'}>
                        {a.email_sent ? 'Email envoyé' : 'Email non envoyé'}
                      </Badge>
                    )}
                  </div>
                  <div className="text-xs text-slate-500">
                    Vitrine {a.vitrine ?? 0} (mini {a.mini_vitrine}) · Réserve {a.stock ?? 0} (mini{' '}
                    {a.mini_stock}) · {new Date(a.created_at).toLocaleString('fr-FR')}
                  </div>
                </div>
                {a.status === 'OUVERTE' && canResolve && (
                  <Button variant="secondary" onClick={() => resolve(a)}>
                    Résoudre
                  </Button>
                )}
              </li>
            ))}
          </ul>
        </Card>
      )}
    </div>
  );
}
