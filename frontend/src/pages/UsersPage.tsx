import { useEffect, useState } from 'react';
import { api, ApiError } from '../lib/api';
import { roleLabel } from '../lib/roles';
import type { Role, User } from '../lib/types';
import { useToast } from '../components/Toast';
import { Badge, Button, Card, Field, PageTitle, Select, Spinner } from '../components/ui';
import { Modal } from '../components/Modal';

interface EditState {
  id: number | null;
  name: string;
  email: string;
  role: Role;
  active: boolean;
  password: string;
}

const blank: EditState = {
  id: null,
  name: '',
  email: '',
  role: 'OPERATOR',
  active: true,
  password: '',
};

export function UsersPage() {
  const toast = useToast();
  const [rows, setRows] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [edit, setEdit] = useState<EditState | null>(null);
  const [busy, setBusy] = useState(false);

  function load() {
    setLoading(true);
    api<User[]>('/users')
      .then(setRows)
      .catch((e) => toast.error(e instanceof ApiError ? e.message : 'Erreur'))
      .finally(() => setLoading(false));
  }

  useEffect(load, []);

  async function save() {
    if (!edit) return;
    if (!edit.name.trim() || (!edit.id && !edit.email.trim())) {
      toast.error('Nom et email requis.');
      return;
    }
    if (!edit.id && edit.password.length < 6) {
      toast.error('Mot de passe : 6 caractères minimum.');
      return;
    }
    setBusy(true);
    try {
      if (edit.id) {
        const body: Record<string, unknown> = {
          name: edit.name.trim(),
          role: edit.role,
          active: edit.active,
        };
        if (edit.password) body.password = edit.password;
        await api(`/users/${edit.id}`, { method: 'PATCH', body });
        toast.success('Utilisateur mis à jour.');
      } else {
        await api('/users', {
          method: 'POST',
          body: {
            name: edit.name.trim(),
            email: edit.email.trim(),
            role: edit.role,
            password: edit.password,
          },
        });
        toast.success('Utilisateur créé.');
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
        <PageTitle title="Utilisateurs" subtitle="Comptes et rôles" />
        <Button onClick={() => setEdit({ ...blank })}>+ Nouveau</Button>
      </div>

      {loading ? (
        <Spinner label="Chargement…" />
      ) : (
        <Card className="p-0">
          <ul className="divide-y divide-slate-100">
            {rows.map((u) => (
              <li key={u.id} className="flex items-center gap-3 px-4 py-3">
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-slate-800">{u.name}</span>
                    <Badge tone="teal">{roleLabel[u.role]}</Badge>
                    {u.active ? null : <Badge tone="slate">Inactif</Badge>}
                  </div>
                  <div className="text-xs text-slate-500">{u.email}</div>
                </div>
                <button
                  onClick={() =>
                    setEdit({
                      id: u.id,
                      name: u.name,
                      email: u.email,
                      role: u.role,
                      active: u.active === 1,
                      password: '',
                    })
                  }
                  className="rounded bg-slate-100 px-2 py-1 text-xs hover:bg-slate-200"
                >
                  Éditer
                </button>
              </li>
            ))}
          </ul>
        </Card>
      )}

      {edit && (
        <Modal title={edit.id ? 'Modifier l’utilisateur' : 'Nouvel utilisateur'} onClose={() => setEdit(null)}>
          <div className="space-y-3">
            <Field label="Nom" value={edit.name} onChange={(e) => setEdit({ ...edit, name: e.target.value })} />
            <Field
              label="Email"
              type="email"
              value={edit.email}
              disabled={!!edit.id}
              onChange={(e) => setEdit({ ...edit, email: e.target.value })}
            />
            <Select
              label="Rôle"
              value={edit.role}
              onChange={(e) => setEdit({ ...edit, role: e.target.value as Role })}
            >
              <option value="OPERATOR">Opérateur</option>
              <option value="ADMIN">Admin</option>
              <option value="SUPERVISOR">Superviseur</option>
            </Select>
            <Field
              label={edit.id ? 'Nouveau mot de passe (laisser vide pour garder)' : 'Mot de passe'}
              type="password"
              value={edit.password}
              onChange={(e) => setEdit({ ...edit, password: e.target.value })}
            />
            {edit.id && (
              <label className="flex items-center gap-2 text-sm text-slate-600">
                <input
                  type="checkbox"
                  checked={edit.active}
                  onChange={(e) => setEdit({ ...edit, active: e.target.checked })}
                />
                Compte actif
              </label>
            )}
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
