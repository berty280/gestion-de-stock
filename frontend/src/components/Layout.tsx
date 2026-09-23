import { useEffect, useState } from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';
import { api } from '../lib/api';
import { roleAtLeast, roleLabel } from '../lib/roles';
import type { AlertCount, Role } from '../lib/types';
import { cx } from './ui';

interface NavItem {
  to: string;
  label: string;
  min: Role;
  badge?: boolean;
}

const navItems: NavItem[] = [
  { to: '/', label: 'Tableau de bord', min: 'OPERATOR' },
  { to: '/vente', label: 'Vente', min: 'OPERATOR' },
  { to: '/reception', label: 'Réception', min: 'ADMIN' },
  { to: '/reappro', label: 'Réappro', min: 'ADMIN' },
  { to: '/produits', label: 'Produits', min: 'ADMIN' },
  { to: '/clients', label: 'Clients', min: 'OPERATOR' },
  { to: '/alertes', label: 'Alertes', min: 'ADMIN', badge: true },
  { to: '/rapports', label: 'Rapports', min: 'ADMIN' },
  { to: '/utilisateurs', label: 'Utilisateurs', min: 'SUPERVISOR' },
];

export function Layout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [alertCount, setAlertCount] = useState(0);

  const isAdmin = roleAtLeast(user?.role, 'ADMIN');

  useEffect(() => {
    if (!isAdmin) return;
    let active = true;
    const load = () =>
      api<AlertCount>('/alerts/count')
        .then((c) => active && setAlertCount(c.total))
        .catch(() => {});
    load();
    const id = setInterval(load, 30000); // refresh badge periodically
    return () => {
      active = false;
      clearInterval(id);
    };
  }, [isAdmin]);

  const items = navItems.filter((i) => roleAtLeast(user?.role, i.min));

  function handleLogout() {
    logout();
    navigate('/login');
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="sticky top-0 z-30 border-b border-teal-800 bg-teal-700 text-white">
        <div className="mx-auto flex max-w-5xl items-center justify-between gap-3 px-4 py-3">
          <div className="flex items-center gap-2">
            <span className="text-lg font-semibold">Comptoir</span>
          </div>
          <div className="flex items-center gap-3 text-sm">
            <span className="hidden sm:inline text-teal-100">
              {user?.name} · {user ? roleLabel[user.role] : ''}
            </span>
            <button
              onClick={handleLogout}
              className="rounded-lg bg-teal-800 px-3 py-1.5 text-sm hover:bg-teal-900"
            >
              Déconnexion
            </button>
          </div>
        </div>
        <nav className="mx-auto max-w-5xl overflow-x-auto px-2 pb-1">
          <div className="flex gap-1">
            {items.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.to === '/'}
                className={({ isActive }) =>
                  cx(
                    'relative whitespace-nowrap rounded-t-lg px-3 py-2 text-sm font-medium transition',
                    isActive ? 'bg-slate-50 text-teal-800' : 'text-teal-50 hover:bg-teal-600',
                  )
                }
              >
                {item.label}
                {item.badge && alertCount > 0 && (
                  <span className="ml-1.5 inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-rose-500 px-1 text-xs text-white">
                    {alertCount}
                  </span>
                )}
              </NavLink>
            ))}
          </div>
        </nav>
      </header>

      <main className="mx-auto max-w-5xl px-4 py-5">
        <Outlet />
      </main>
    </div>
  );
}
