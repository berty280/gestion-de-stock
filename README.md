# Comptoir — gestion de stock & traçabilité

Logiciel simplifié de gestion de stock et de traçabilité pour une boutique
**cosmétiques / hygiène / parapharmacie** (contexte camerounais). PWA installable
(PC + Android) avec scan de code-barres, adossée à une API Node/Fastify + SQLite.

> Spécification complète : [`docs/SPEC.md`](docs/SPEC.md).
> Guide de test pas-à-pas : [`docs/GUIDE_TEST.md`](docs/GUIDE_TEST.md).

## État d'avancement

MVP complet — les 7 étapes du plan de build (§9 du spec) sont implémentées :

- [x] **1. Scaffold** — monorepo front + back, schéma DB + migrations, seed users/rôles
- [x] **2. Auth + rôles + garde des routes** — email/mot de passe (bcrypt), JWT, RBAC
- [x] **3. Catalogue produits + résolution GTIN** — Open Beauty Facts + cache local + saisie manuelle
- [x] **4. Écran de scan 3 modes** — Réception / Réappro / Vente → mouvements + stock_levels
- [x] **5. Vente** — panier + client (nommé ou inconnu) + reçu imprimable
- [x] **6. Seuils, alertes in-app, email de recommande** — VITRINE_LOW / STOCK_LOW, auto-résolution
- [x] **7. Rapports** (stock courant, mouvements, ventes du jour) + PWA installable

## Architecture

Monorepo **npm workspaces** :

```
comptoir/
├── backend/     API Fastify + TypeScript, SQLite (better-sqlite3)
│   └── src/
│       ├── config.ts            configuration (.env)
│       ├── server.ts            serveur Fastify + enregistrement des routes
│       ├── index.ts             point d'entrée (migrate au boot + listen)
│       ├── auth/                JWT + garde des rôles, /auth/login, /auth/me
│       ├── routes/              products, customers, operations, sales,
│       │                        alerts, users, reports
│       ├── services/            stock (mouvements + alertes), gtin, email
│       ├── lib/                 errors, roles, validate (zod)
│       └── db/                  connection, migrate, seed, reset, migrations
├── frontend/    PWA React + Vite + TypeScript + Tailwind
│   └── src/
│       ├── auth/                AuthContext (session JWT)
│       ├── components/          Layout, BarcodeScanner, ui, Modal, Toast…
│       ├── pages/               Login, Dashboard, Vente, Reception, Reappro,
│       │                        Produits, Clients, Alertes, Rapports, Users
│       └── lib/                 api client, types, hooks, roles
└── docs/SPEC.md
```

### Fonctionnalités

- **3 rôles** (Operator / Admin / Supervisor) avec permissions gardées côté API et UI.
- **3 modes de scan** : Réception (Stock +N, crée la fiche si GTIN inconnu),
  Réappro (Stock → Vitrine), Vente (panier → Vitrine −N).
- **Résolution GTIN** : cache local d'abord, puis Open Beauty Facts, sinon saisie
  manuelle. Le scanner lit EAN-13 et GS1 DataMatrix (extraction du GTIN).
- **Ventes** rattachées à un client (nom + téléphone, ou « Inconnu ») + reçu imprimable.
- **Seuils & alertes** : VITRINE_LOW (in-app) et STOCK_LOW (in-app + email fournisseur),
  sans doublon, avec **auto-résolution** au réapprovisionnement.
- **Ajustements** (Supervisor) et **rapports** (stock courant, mouvements, ventes du jour).
- **Idempotence** des scans via `scan_uid`.

### Principales routes API

| Méthode | Route | Rôle min |
|---|---|---|
| POST | `/auth/login`, GET `/auth/me` | public / auth |
| GET | `/products`, `/products/:id`, `/products/lookup/:gtin` | auth |
| POST/PATCH | `/products` | Admin |
| GET/POST/PATCH/DELETE | `/customers` | auth |
| POST | `/operations/reception`, `/operations/reappro` | Admin |
| POST | `/operations/adjustment` | Supervisor |
| POST | `/sales`, GET `/sales/:id` | auth |
| GET | `/alerts`, `/alerts/count`; POST `/alerts/:id/resolve` | Admin / Supervisor |
| GET/POST/PATCH | `/users` | Supervisor |
| GET | `/reports/stock`, `/reports/movements`, `/reports/sales` | Admin |

## Prérequis

- Node.js **≥ 20** (testé sur 22)
- npm ≥ 10

## Installation

```bash
npm install               # installe backend + frontend (workspaces)
cp backend/.env.example backend/.env
```

## Base de données

```bash
npm run db:migrate        # applique les migrations
npm run db:seed           # crée les comptes de démo (1 par rôle)
# ou, en dev, tout d'un coup :
npm run db:reset          # supprime la base, migre, seed
```

Comptes de démo créés par le seed (mot de passe = `SEED_DEFAULT_PASSWORD`,
`comptoir123` par défaut) :

| Rôle       | Email                        |
|------------|------------------------------|
| OPERATOR   | operator@comptoir.local      |
| ADMIN      | admin@comptoir.local         |
| SUPERVISOR | supervisor@comptoir.local    |

> ⚠️ Comptes et mots de passe de démonstration — à changer en production.

## Lancement simple (Windows, sans commande)

Pour un usage « boutique », des lanceurs sont fournis à la racine :

- **`Comptoir - Installer (1 fois).bat`** — installe, construit et initialise (une fois).
- **`Comptoir - Demarrer.bat`** — démarre le serveur **en arrière-plan** et ouvre le
  navigateur sur l'application. Idéal en raccourci sur le Bureau.
- **`Comptoir - Arreter.bat`** — arrête le serveur.
- **`Comptoir - Mettre a jour.bat`** — récupère la dernière version (git pull),
  réinstalle et reconstruit (les données existantes sont conservées).
- **`Comptoir - Activer demarrage auto.bat`** / **`Comptoir - Desactiver demarrage auto.bat`**
  — lance (ou non) le serveur automatiquement au démarrage de Windows (dossier
  Démarrage utilisateur ; sans droits admin).

En mode « lancé », **tout est servi sur un seul port** : <http://localhost:3000>
(interface **et** API). Voir [`docs/GUIDE_TEST.md`](docs/GUIDE_TEST.md).

## Développement

```bash
npm run dev:backend       # API sur http://localhost:3000
npm run dev:frontend      # PWA sur http://localhost:5173 (proxy /api → :3000)
```

En production / usage simple, le backend sert aussi la PWA compilée
(`frontend/dist`) : un seul port, l'API sous `/api`.

```bash
npm run serve             # build + démarrage sur http://localhost:3000 (interface + API)
```

Le backend applique automatiquement les migrations au démarrage.

> **HTTPS requis pour la caméra** : l'accès caméra du navigateur exige un contexte
> sécurisé (HTTPS ou `localhost`). En production, servir la PWA derrière HTTPS.

## Build

```bash
npm run build             # build backend (tsc) + frontend (vite)
npm run typecheck         # vérification de types sur les deux workspaces
```

## Notes techniques

- **SQLite** (`better-sqlite3`) en mode WAL, `foreign_keys=ON`. Source de vérité :
  la table `movements` (append-only) ; `stock_levels` est un cache reconstructible.
- **Idempotence des scans** : `movements.scan_uid` est `UNIQUE`.
- **Alertes** : un index unique partiel garantit « pas de doublon d'alerte ouverte »
  par (produit, type).
- Les valeurs d'énumération suivent le spec (français) : `RECEPTION`, `REAPPRO`,
  `VENTE`, `AJUSTEMENT`, `VITRINE`, `STOCK`, `VITRINE_LOW`, `STOCK_LOW`, etc.
- Les **icônes PWA** sont des SVG de placeholder (`frontend/public/`) — remplacer
  par des visuels définitifs (et des PNG 192/512 si besoin d'installabilité stricte).
