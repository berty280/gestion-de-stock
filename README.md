# Comptoir — gestion de stock & traçabilité

Logiciel simplifié de gestion de stock et de traçabilité pour une boutique
**cosmétiques / hygiène / parapharmacie** (contexte camerounais). PWA installable
(PC + Android) avec scan de code-barres, adossée à une API Node/Fastify + SQLite.

> Spécification complète : [`docs/SPEC.md`](docs/SPEC.md).

## État d'avancement

Ce dépôt correspond à l'**étape 1** du plan de build (§9 du spec) :

- [x] **1. Scaffold** — monorepo front + back, schéma DB + migrations, seed users/rôles
- [ ] 2. Auth + rôles + garde des routes
- [ ] 3. Catalogue produits + résolution GTIN (API + cache + manuel)
- [ ] 4. Écran de scan 3 modes → mouvements + stock_levels
- [ ] 5. Vente (panier + client + facture)
- [ ] 6. Seuils, alertes in-app, email de recommande
- [ ] 7. Rapports + install PWA

## Architecture

Monorepo **npm workspaces** :

```
comptoir/
├── backend/     API Fastify + TypeScript, SQLite (better-sqlite3)
│   └── src/
│       ├── config.ts            configuration (.env)
│       ├── server.ts            construction du serveur Fastify
│       ├── index.ts             point d'entrée (migrate au boot + listen)
│       └── db/
│           ├── connection.ts    connexion SQLite partagée
│           ├── migrate.ts       exécuteur de migrations
│           ├── seed.ts          seed users/rôles (idempotent)
│           ├── reset.ts         reset dev (drop + migrate + seed)
│           └── migrations/*.sql schéma
├── frontend/    PWA React + Vite + TypeScript + Tailwind
└── docs/SPEC.md
```

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

## Développement

```bash
npm run dev:backend       # API sur http://localhost:3000
npm run dev:frontend      # PWA sur http://localhost:5173 (proxy /api → :3000)
```

La page d'accueil affiche l'état de l'API (`/api/health`). Le backend applique
automatiquement les migrations au démarrage.

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
