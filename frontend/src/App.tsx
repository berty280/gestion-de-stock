import { useEffect, useState } from 'react';

interface Health {
  status: string;
  db: string;
  migrationsTable: boolean;
  time: string;
}

type ApiState =
  | { kind: 'loading' }
  | { kind: 'ok'; health: Health }
  | { kind: 'error'; message: string };

// The three scan modes and roles from the spec — shown here as a scaffold
// preview of what's coming in the next build steps.
const modules = [
  { key: 'reception', label: 'Réception', hint: 'Stock +N', role: 'Admin+' },
  { key: 'reappro', label: 'Réappro', hint: 'Stock → Vitrine', role: 'Admin+' },
  { key: 'vente', label: 'Vente', hint: 'Panier → Vitrine −N', role: 'Operator+' },
] as const;

export default function App() {
  const [api, setApi] = useState<ApiState>({ kind: 'loading' });

  useEffect(() => {
    const controller = new AbortController();
    fetch('/api/health', { signal: controller.signal })
      .then((r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return r.json() as Promise<Health>;
      })
      .then((health) => setApi({ kind: 'ok', health }))
      .catch((err: unknown) => {
        if (err instanceof DOMException && err.name === 'AbortError') return;
        setApi({ kind: 'error', message: err instanceof Error ? err.message : String(err) });
      });
    return () => controller.abort();
  }, []);

  return (
    <div className="min-h-full bg-slate-50 text-slate-900">
      <header className="bg-teal-700 text-white">
        <div className="mx-auto max-w-3xl px-4 py-5">
          <h1 className="text-xl font-semibold">Comptoir</h1>
          <p className="text-sm text-teal-100">
            Gestion de stock &amp; traçabilité — MVP (scaffold)
          </p>
        </div>
      </header>

      <main className="mx-auto max-w-3xl space-y-6 px-4 py-6">
        <section className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-500">
            État de l'API
          </h2>
          {api.kind === 'loading' && <p className="text-slate-500">Vérification…</p>}
          {api.kind === 'error' && (
            <p className="text-rose-600">
              Backend injoignable ({api.message}). Lancez{' '}
              <code className="rounded bg-slate-100 px-1">npm run dev:backend</code>.
            </p>
          )}
          {api.kind === 'ok' && (
            <ul className="space-y-1 text-sm">
              <li>
                <StatusDot ok={api.health.status === 'ok'} /> Statut : {api.health.status}
              </li>
              <li>
                <StatusDot ok={api.health.db === 'up'} /> Base de données : {api.health.db}
              </li>
              <li>
                <StatusDot ok={api.health.migrationsTable} /> Migrations :{' '}
                {api.health.migrationsTable ? 'appliquées' : 'manquantes'}
              </li>
            </ul>
          )}
        </section>

        <section>
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-500">
            Modes de scan (à venir)
          </h2>
          <div className="grid gap-3 sm:grid-cols-3">
            {modules.map((m) => (
              <div
                key={m.key}
                className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm"
              >
                <div className="text-base font-semibold">{m.label}</div>
                <div className="mt-1 text-sm text-slate-500">{m.hint}</div>
                <div className="mt-3 inline-block rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-600">
                  {m.role}
                </div>
              </div>
            ))}
          </div>
        </section>

        <p className="text-center text-xs text-slate-400">
          Étape 1 (scaffold) terminée. Prochaines étapes : auth &amp; rôles, catalogue, scan.
        </p>
      </main>
    </div>
  );
}

function StatusDot({ ok }: { ok: boolean }) {
  return (
    <span
      className={`mr-2 inline-block h-2.5 w-2.5 rounded-full align-middle ${
        ok ? 'bg-emerald-500' : 'bg-rose-500'
      }`}
      aria-hidden
    />
  );
}
