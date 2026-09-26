# CLAUDE.md — Contexte projet pour Claude & développeurs

> Ce fichier est lu automatiquement par Claude Code. Il résume l'architecture, les
> commandes et les conventions du projet **Comptoir**. Voir aussi
> [`docs/SPEC.md`](docs/SPEC.md) (spécification), [`docs/GUIDE_TEST.md`](docs/GUIDE_TEST.md)
> (installation/test) et [`docs/PASSATION.md`](docs/PASSATION.md) (reprise du projet).

## Vue d'ensemble
**Comptoir** : logiciel de gestion de stock + traçabilité pour une boutique
cosmétiques / hygiène / parapharmacie (contexte camerounais). MVP complet et
fonctionnel (les 7 étapes du plan §9 du spec sont implémentées).

## Stack
- **Monorepo npm workspaces** : `backend/` + `frontend/`.
- **Backend** : Node + Fastify + TypeScript, SQLite via `better-sqlite3` (v12).
  Auth JWT (`@fastify/jwt`), validation `zod`, email `nodemailer`, sert aussi la
  PWA compilée via `@fastify/static` (mode mono-port).
- **Frontend** : React 18 + Vite 6 + TypeScript + Tailwind v4, PWA
  (`vite-plugin-pwa`), routage `react-router-dom` v7, scan `BarcodeDetector` natif
  avec repli `@zxing/browser`.
- **Node ≥ 20** requis (testé sur Node 24).

## Commandes (à la racine)
```bash
npm install            # installe les 2 workspaces
npm run dev:backend    # API dev (tsx watch) sur :3000
npm run dev:frontend   # PWA dev (Vite) sur :5173, proxy /api -> :3000
npm run build          # build backend (tsc) + frontend (vite)
npm run typecheck      # typecheck des 2 workspaces
npm run serve          # build + démarre le mono-port sur :3000 (prod locale)
npm start              # démarre le backend compilé (sert API + PWA) sur :3000
npm run db:migrate     # applique les migrations SQL
npm run db:seed        # seed idempotent (3 comptes de rôles + produits démo)
npm run db:reset       # DROP + migrate + seed (dev uniquement — efface les données)
```

## Architecture backend (`backend/src/`)
- `config.ts` : configuration via `.env` (port, DB, JWT, SMTP, `FRONTEND_DIST`).
- `server.ts` : build Fastify ; **toutes les routes API sont sous le préfixe `/api`** ;
  sert `frontend/dist` avec fallback SPA quand le dossier existe (mono-port).
- `index.ts` : point d'entrée ; applique les migrations au boot puis écoute.
- `db/` : `connection.ts` (SQLite WAL + FK), `migrate.ts` (runner de migrations
  suivies dans `_migrations`), `migrations/*.sql`, `seed.ts`, `reset.ts`.
- `auth/` : `plugin.ts` (JWT + décorateurs `authenticate` / `requireRole`),
  `routes.ts` (`/auth/login`, `/auth/me`).
- `services/` : `stock.ts` (**cœur métier** : `recordMovement`, alertes, rebuild),
  `alerts.ts` (envoi email des alertes ouvertes), `email.ts`, `gtin.ts`
  (Open Beauty Facts).
- `routes/` : `products`, `customers`, `operations` (réception/réappro/ajustement),
  `sales`, `alerts`, `users`, `reports`.
- `lib/` : `errors.ts` (helpers HTTP), `roles.ts` (hiérarchie des rôles), `validate.ts`
  (parse zod → 400).

## Modèle de données (voir spec §3)
Tables : `users`, `products`, `customers`, `sales`, `movements`, `stock_levels`,
`alerts` (+ `_migrations`).
- **`movements` = source de vérité (append-only)** ; `stock_levels` = cache dérivé,
  reconstructible via `rebuildStockLevels()`.
- **Idempotence des scans** : `movements.scan_uid` UNIQUE (rejouer un uid = no-op).
- **Alertes** : index unique partiel → pas de doublon d'alerte OUVERTE par (produit, type).
  VITRINE_LOW (in-app) ; STOCK_LOW (in-app + email). Auto-résolution au réappro.
- Valeurs d'énum conservées du spec (français) : `RECEPTION|REAPPRO|VENTE|AJUSTEMENT`,
  `VITRINE|STOCK`, `VITRINE_LOW|STOCK_LOW`, `OUVERTE|RESOLUE`,
  rôles `OPERATOR|ADMIN|SUPERVISOR`.

## Rôles & permissions (spec §5)
Hiérarchie `OPERATOR < ADMIN < SUPERVISOR` (`lib/roles.ts`).
- Clients CRUD + Vente : tous.
- Réception / Réappro / Catalogue+seuils : Admin+.
- Ajustements, Utilisateurs, Rapports : Supervisor (rapports gardés Admin+ côté API).
Gardé côté API (`requireRole`) **et** côté UI (`components/Guards.tsx`).

## Frontend (`frontend/src/`)
- `lib/api.ts` : client `fetch` (préfixe `/api`, Bearer token, gestion 401).
- `auth/AuthContext.tsx` : session JWT (token en `localStorage`).
- `components/` : `Layout`, `Guards`, `BarcodeScanner`, `ProductPicker`,
  `ReceiptView`, `Modal`, `Toast`, `ui` (primitives).
- `pages/` : `Login`, `Dashboard`, `Vente`, `Reception`, `Reappro`, `Produits`,
  `Clients`, `Alertes`, `Rapports`, `Utilisateurs`.

## Comptes de démonstration (seed)
Mot de passe = `SEED_DEFAULT_PASSWORD` (défaut `comptoir123`) :
`admin@comptoir.local`, `operator@comptoir.local`, `supervisor@comptoir.local`.
⚠️ À changer en production.

## Déploiement boutique (Windows)
Lanceurs à double-clic à la racine (voir README) : `Comptoir - Installer (1 fois)`,
`Comptoir - Demarrer` (serveur en fenêtre minimisée + ouvre le navigateur),
`Comptoir - Arreter`, `Comptoir - Mettre a jour`, `Comptoir - Activer/Desactiver
demarrage auto`. En prod locale, **un seul port** : `http://localhost:3000`
(interface + API).

## Conventions & garde-fous
- Écrire du TS strict ; `npm run typecheck` **et** `npm run build` doivent passer.
- Garder `npm audit` propre (0 vulnérabilité) — mettre à jour les deps sensibles.
- Ne jamais committer : `node_modules/`, `dist/`, `backend/data/` (base SQLite), `.env`
  (déjà dans `.gitignore`). La base de prod ne doit pas être écrasée par un déploiement.
- Toute nouvelle table/colonne = **nouvelle migration** `NNN_*.sql` (ne pas éditer une
  migration déjà appliquée).
- Les valeurs d'énum et libellés métier restent en français (cohérence avec le spec).

## Pistes d'amélioration (hors MVP)
Prix/montants sur les reçus, sauvegarde auto de la base, HTTPS + accès mobile
(scan caméra en conditions réelles), gestion lots/péremption (le modèle le permet,
cf. note pharma §7), export des rapports (CSV/PDF), multi-boutiques, logo/branding.
