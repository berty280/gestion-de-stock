# Passation — reprise et amélioration de Comptoir

Ce document s'adresse à la personne technique (informaticienne) qui va installer,
maintenir et améliorer **Comptoir**, éventuellement avec l'aide de Claude.

## 1. Le projet en bref
- Application de **gestion de stock + traçabilité** pour boutique cosmétiques /
  hygiène / parapharmacie. MVP complet et fonctionnel.
- Code source sur GitHub : **`berty280/gestion-de-stock`**.
- Contexte technique complet : voir [`CLAUDE.md`](../CLAUDE.md) (à la racine),
  spécification : [`docs/SPEC.md`](SPEC.md), installation/test :
  [`docs/GUIDE_TEST.md`](GUIDE_TEST.md).

## 2. Obtenir l'accès au code (à faire par le propriétaire du dépôt)
Pour que l'informaticienne puisse récupérer le code et publier ses améliorations,
l'ajouter comme **collaboratrice** du dépôt :
1. Sur GitHub : dépôt `gestion-de-stock` → **Settings** → **Collaborators** →
   **Add people** → saisir son nom d'utilisateur GitHub → l'inviter.
2. Elle accepte l'invitation reçue par email.

> Astuce : il est conseillé de **fusionner la Pull Request #1 dans `main`** d'abord,
> pour qu'elle parte d'une branche `main` à jour (bouton « Merge pull request »).

## 3. Installer l'environnement (sur le nouveau PC)
1. **Node.js ≥ 20** (LTS) : <https://nodejs.org>
2. **git** : <https://git-scm.com/download/win>
3. (Recommandé) **VS Code** : <https://code.visualstudio.com>

Vérifier dans un terminal : `node --version`, `npm --version`, `git --version`.

## 4. Récupérer et lancer le projet
```bash
git clone https://github.com/berty280/gestion-de-stock.git
cd gestion-de-stock
# si le travail n'est pas encore fusionné dans main :
# git checkout claude/intelligent-thompson-i01mpw
npm install
copy backend\.env.example backend\.env   # (cp sous macOS/Linux)
npm run db:reset        # crée la base + comptes/produits de démo
npm run dev:backend     # API sur http://localhost:3000
npm run dev:frontend    # PWA sur http://localhost:5173
```
Pour un usage « boutique » (un seul port, lanceurs Windows), voir
[`docs/GUIDE_TEST.md`](GUIDE_TEST.md) §5.

## 5. Développer avec Claude
Deux façons d'utiliser Claude sur ce projet :
- **Claude Code sur le web** (`claude.ai/code`) : connecter le compte GitHub, choisir
  le dépôt `gestion-de-stock` et démarrer une session — comme celle qui a créé ce
  projet. Claude lit automatiquement `CLAUDE.md` pour le contexte.
- **Claude Code en local (CLI)** : installer l'outil et l'ouvrir dans le dossier du
  projet (voir la doc Claude Code).

Bonnes pratiques de collaboration :
- Travailler sur une **branche** dédiée par fonctionnalité, puis ouvrir une **Pull
  Request** vers `main`.
- Avant de pousser : `npm run typecheck` **et** `npm run build` doivent passer,
  et `npm audit` rester propre.
- Respecter les **garde-fous** listés dans `CLAUDE.md` (migrations, données, énums FR).

## 6. Sauvegarde des données
Les données de la boutique sont dans **`backend/data/comptoir.db`** (fichier SQLite,
non versionné). Pour sauvegarder : **copier ce fichier** régulièrement (clé USB,
cloud). Pour restaurer : remettre le fichier au même endroit, serveur arrêté.

## 7. Idées d'améliorations (déjà notées dans CLAUDE.md)
Prix/montants sur les reçus, sauvegarde automatique, HTTPS + accès mobile (scan
caméra réel), gestion lots/péremption, export CSV/PDF des rapports, branding
(logo/nom de la boutique), multi-boutiques.

---
Pour toute reprise, commencer par lire `CLAUDE.md` puis `docs/SPEC.md`. Bon courage !
