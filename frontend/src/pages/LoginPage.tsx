import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';
import { ApiError } from '../lib/api';
import { Button, Card, Field } from '../components/ui';

export function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      await login(email, password);
      navigate('/');
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Connexion impossible');
    } finally {
      setBusy(false);
    }
  }

  function quickFill(role: 'operator' | 'admin' | 'supervisor') {
    setEmail(`${role}@comptoir.local`);
    setPassword('comptoir123');
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-100 px-4">
      <div className="w-full max-w-sm">
        <div className="mb-6 text-center">
          <h1 className="text-2xl font-bold text-teal-700">Comptoir</h1>
          <p className="text-sm text-slate-500">Gestion de stock &amp; traçabilité</p>
        </div>
        <Card>
          <form onSubmit={submit} className="space-y-4">
            <Field
              label="Email"
              type="email"
              autoComplete="username"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
            <Field
              label="Mot de passe"
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
            {error && <p className="text-sm text-rose-600">{error}</p>}
            <Button type="submit" disabled={busy} className="w-full">
              {busy ? 'Connexion…' : 'Se connecter'}
            </Button>
          </form>

          <div className="mt-4 border-t border-slate-100 pt-3">
            <p className="mb-2 text-xs text-slate-400">Comptes de démonstration :</p>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => quickFill('operator')}
                className="rounded-full bg-slate-100 px-3 py-1 text-xs text-slate-600 hover:bg-slate-200"
              >
                Opérateur
              </button>
              <button
                type="button"
                onClick={() => quickFill('admin')}
                className="rounded-full bg-slate-100 px-3 py-1 text-xs text-slate-600 hover:bg-slate-200"
              >
                Admin
              </button>
              <button
                type="button"
                onClick={() => quickFill('supervisor')}
                className="rounded-full bg-slate-100 px-3 py-1 text-xs text-slate-600 hover:bg-slate-200"
              >
                Superviseur
              </button>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}
