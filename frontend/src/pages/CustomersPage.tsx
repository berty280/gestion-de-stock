import { useEffect, useState } from 'react';
import { api, ApiError } from '../lib/api';
import type { Customer } from '../lib/types';
import { useToast } from '../components/Toast';
import { Button, Card, Field, PageTitle, Spinner } from '../components/ui';
import { Modal } from '../components/Modal';

interface EditState {
  id: number | null;
  name: string;
  phone: string;
}

export function CustomersPage() {
  const toast = useToast();
  const [q, setQ] = useState('');
  const [rows, setRows] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [edit, setEdit] = useState<EditState | null>(null);
  const [busy, setBusy] = useState(false);

  function load() {
    setLoading(true);
    api<Customer[]>(`/customers${q.trim() ? `?q=${encodeURIComponent(q.trim())}` : ''}`)
      .then(setRows)
      .catch((e) => toast.error(e instanceof ApiError ? e.message : 'Erreur'))
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    const h = setTimeout(load, 250);
    return () => clearTimeout(h);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q]);

  async function save() {
    if (!edit || !edit.name.trim()) {
      toast.error('Nom requis.');
      return;
    }
    setBusy(true);
    try {
      const body = { name: edit.name.trim(), phone: edit.phone.trim() || null };
      if (edit.id) await api(`/customers/${edit.id}`, { method: 'PATCH', body });
      else await api('/customers', { method: 'POST', body });
      toast.success('Client enregistré.');
      setEdit(null);
      load();
    } catch (e) {
      toast.error(e instanceof ApiError ? e.message : 'Enregistrement impossible');
    } finally {
      setBusy(false);
    }
  }

  async function remove(c: Customer) {
    if (!confirm(`Supprimer le client « ${c.name} » ?`)) return;
    try {
      await api(`/customers/${c.id}`, { method: 'DELETE' });
      toast.success('Client supprimé.');
      load();
    } catch (e) {
      toast.error(e instanceof ApiError ? e.message : 'Suppression impossible');
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <PageTitle title="Clients" />
        <Button onClick={() => setEdit({ id: null, name: '', phone: '' })}>+ Nouveau</Button>
      </div>

      <Field placeholder="Rechercher (nom, téléphone)…" value={q} onChange={(e) => setQ(e.target.value)} />

      {loading ? (
        <Spinner label="Chargement…" />
      ) : (
        <Card className="p-0">
          <ul className="divide-y divide-slate-100">
            {rows.map((c) => (
              <li key={c.id} className="flex items-center gap-3 px-4 py-3">
                <div className="flex-1">
                  <div className="font-medium text-slate-800">{c.name}</div>
                  <div className="text-xs text-slate-500">{c.phone || 'Sans téléphone'}</div>
                </div>
                <button
                  onClick={() => setEdit({ id: c.id, name: c.name, phone: c.phone ?? '' })}
                  className="rounded bg-slate-100 px-2 py-1 text-xs hover:bg-slate-200"
                >
                  Éditer
                </button>
                <button
                  onClick={() => remove(c)}
                  className="rounded bg-rose-50 px-2 py-1 text-xs text-rose-600 hover:bg-rose-100"
                >
                  Supprimer
                </button>
              </li>
            ))}
            {rows.length === 0 && (
              <li className="px-4 py-6 text-center text-slate-400">Aucun client.</li>
            )}
          </ul>
        </Card>
      )}

      {edit && (
        <Modal title={edit.id ? 'Modifier le client' : 'Nouveau client'} onClose={() => setEdit(null)}>
          <div className="space-y-3">
            <Field label="Nom" value={edit.name} onChange={(e) => setEdit({ ...edit, name: e.target.value })} />
            <Field
              label="Téléphone"
              value={edit.phone}
              inputMode="tel"
              onChange={(e) => setEdit({ ...edit, phone: e.target.value })}
            />
            <div className="flex gap-2 pt-2">
              <Button onClick={save} disabled={busy} className="flex-1">
                {busy ? 'Enregistrement…' : 'Enregistrer'}
              </Button>
              <Button variant="secondary" onClick={() => setEdit(null)} disabled={busy}>
                Annuler
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
