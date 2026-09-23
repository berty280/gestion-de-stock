# Comptoir — Spécification (v0.1)

> **Codename provisoire « Comptoir »** (à renommer). Logiciel simplifié de gestion de
> stock + traçabilité pour une boutique **cosmétiques / hygiène / parapharmacie**,
> contexte camerounais. Cibles **PC + Android**, connexion réseau **fiable**.

## 1. Objectif
Suivre chaque produit de la réception à la vente, garantir un minimum en rayon et en
réserve, déclencher les recommandes, et rattacher chaque vente à un client
(nom + téléphone, valeur « Inconnu » tolérée).

## 2. Périmètre MVP
- Catalogue produits + reconnaissance par code-barres.
- 2 emplacements : **Vitrine** (rayon), **Stock** (réserve).
- 3 opérations scannées : **Réception**, **Réappro**, **Vente**.
- Clients (CRUD) + rattachement aux ventes.
- Seuils minimum + alertes (in-app + **email** pour la recommande fournisseur).
- 3 rôles : **Operator**, **Admin**, **Supervisor**.
- Rapports simples : stock courant, mouvements, ventes du jour.

**Hors MVP** (plus tard) : multi-boutiques, commandes fournisseurs automatisées,
comptabilité/facturation fiscale, offline-first, gestion lots/péremption
(voir §7 note pharma).

## 3. Modèle de données
- **users** (id, nom, email, mot_de_passe_hash, rôle, actif)
- **products** (id, gtin, nom, marque, catégorie, image_url, unité, `mini_vitrine`=1,
  `mini_stock`, source [api|manuel], created_at)
- **movements** — *append-only, source de vérité* : (id, product_id, type
  [RECEPTION|REAPPRO|VENTE|AJUSTEMENT], quantité, de, vers, user_id, sale_id?,
  `scan_uid`, created_at)
- **stock_levels** (product_id, emplacement [VITRINE|STOCK], quantité) — *cache*
  dérivé de `movements`, reconstructible à tout moment
- **customers** (id, nom, téléphone, inconnu:bool, created_at)
- **sales** (id, customer_id, user_id, created_at) ; les lignes = `movements` de type
  VENTE liés par `sale_id`
- **alerts** (id, product_id, type [VITRINE_LOW|STOCK_LOW], statut [OUVERTE|RÉSOLUE],
  email_envoyé:bool, created_at, resolved_at)

## 4. Flux de scan (3 modes distincts)
L'utilisateur choisit **d'abord le mode** → jamais d'ambiguïté sur l'effet du scan.
1. **Réception** (Admin+) : scan → si GTIN inconnu, fiche créée via API/manuel →
   saisir qté → **Stock +N**.
2. **Réappro** (Admin+) : scan → **Stock −N, Vitrine +N** → si Stock < `mini_stock` :
   alerte **STOCK_LOW + email**.
3. **Vente** (Operator+) : scans successifs = panier → **Vitrine −N** par ligne →
   validation : **nom + téléphone** client (ou bouton « Client inconnu ») → crée
   `sale` + `movements` → si Vitrine < `mini_vitrine` : alerte **VITRINE_LOW** (in-app).

**Idempotence** : chaque scan porte un `scan_uid` ; rejouer le même uid ne recrée pas
le mouvement (pas de double comptage).

## 5. Rôles & permissions
| Action | Operator | Admin | Supervisor |
|---|:--:|:--:|:--:|
| Clients (CRUD) | ✅ | ✅ | ✅ |
| Vente (scan vitrine + facture) | ✅ | ✅ | ✅ |
| Réception (scan → stock) | — | ✅ | ✅ |
| Réappro (stock → vitrine) | — | ✅ | ✅ |
| Catalogue produits + seuils | — | ✅ | ✅ |
| Ajustements / corrections stock | — | — | ✅ |
| Utilisateurs, config, rapports globaux | — | — | ✅ |

## 6. Seuils & alertes
- `mini_vitrine` défaut **1**, configurable par produit ; `mini_stock` = point de recommande.
- **VITRINE_LOW** → notif in-app à l'Admin (« réapprovisionner le rayon depuis le stock »).
- **STOCK_LOW** → notif in-app **+ email** (recommande fournisseur).
- Rayon vide **et** stock vide → escalade directe en **STOCK_LOW email**.
- Pas de doublon d'alerte ouverte ; l'alerte se **résout automatiquement** quand la
  quantité repasse ≥ minimum.

## 7. Reconnaissance produit (API)
- Codes **EAN-13 / GTIN**. Source primaire : **Open Beauty Facts** (gratuit, ouvert,
  sans clé, orienté cosmétique/hygiène). Fallback généraliste (UPCitemdb /
  Barcode Lookup) + **saisie manuelle toujours possible**.
- **Cache local** : tout GTIN résolu est enregistré dans `products` → 2ᵉ scan
  instantané, gratuit, sans dépendance réseau ; la boutique se constitue son propre
  catalogue au fil de l'eau.
- **Note pharma** : certains médicaments EU portent un **GS1 DataMatrix 2D**
  (GTIN + lot + péremption + n° série), pas un EAN-13. Le scanner (ZXing) lit les deux ;
  on extrait le GTIN. La gestion lot/péremption est hors MVP mais le modèle la permettra.

## 8. Stack & architecture
- **Frontend** : PWA — React + Vite + TypeScript + Tailwind ; scan via `BarcodeDetector`
  natif (Android Chrome) avec fallback `@zxing/browser` ; installable (manifest +
  service worker basique).
- **Backend** : Node + Fastify + TypeScript ; **SQLite** (better-sqlite3) pour le MVP
  (1 boutique) — migration Postgres triviale plus tard.
- **Auth** : email + mot de passe (bcrypt), session/JWT ; rôles en base.
- **Email** : SMTP via nodemailer (compte à fournir).
- **Hébergement** : petit VPS ou machine de la boutique ; **HTTPS requis** (l'accès
  caméra du navigateur exige un contexte sécurisé — HTTPS ou localhost).

## 9. Étapes de build (incrémental)
1. Scaffold repo (front + back), schéma DB + migrations, seed users/rôles.
2. Auth + rôles + garde des routes.
3. Catalogue produits + résolution GTIN (API + cache + manuel).
4. Écran de scan 3 modes → mouvements + stock_levels.
5. Vente (panier + client + facture).
6. Seuils, alertes in-app, email de recommande.
7. Rapports (stock courant, mouvements, ventes du jour) + install PWA.
