# Guide de test — Comptoir

Guide pas-à-pas pour installer et tester **Comptoir** en local. Aucune connaissance
technique avancée requise : suivez les étapes dans l'ordre.

- Durée : ~10 minutes.
- Cibles : Windows, macOS ou Linux.

---

## 1. Prérequis

### 1.1 Installer Node.js (≥ 20)
Téléchargez la version **LTS** sur <https://nodejs.org> et installez-la.
Vérifiez ensuite dans un terminal :

```bash
node --version   # doit afficher v20.x ou plus
npm --version
```

### 1.2 Installer git
- Windows : <https://git-scm.com/download/win>
- macOS : `xcode-select --install` (ou <https://git-scm.com>)
- Linux : `sudo apt install git` (Debian/Ubuntu)

```bash
git --version
```

> **Où taper ces commandes ?**
> - Windows : ouvrez **PowerShell** (menu Démarrer → « PowerShell »).
> - macOS : ouvrez **Terminal** (Applications → Utilitaires).
> - Linux : votre terminal habituel.

---

## 2. Récupérer le code

Placez-vous dans un dossier de travail, puis :

```bash
git clone https://github.com/berty280/gestion-de-stock.git
cd gestion-de-stock
git checkout claude/intelligent-thompson-i01mpw
```

> La branche `claude/intelligent-thompson-i01mpw` contient l'application. Une fois
> la PR fusionnée, vous pourrez rester sur `main`.

---

## 3. Installer les dépendances

Depuis le dossier `gestion-de-stock` :

```bash
npm install
```

Cette commande installe le backend et le frontend (monorepo). La première fois,
elle compile `better-sqlite3` — cela peut prendre 1 à 2 minutes.

---

## 4. Configurer et initialiser la base de données

### 4.1 Créer le fichier de configuration
```bash
cp backend/.env.example backend/.env
```
Sous Windows PowerShell, si `cp` échoue :
```powershell
Copy-Item backend/.env.example backend/.env
```

Les valeurs par défaut suffisent pour tester. (L'email d'alerte reste désactivé
tant que vous ne remplissez pas les variables `SMTP_*` — voir §9.)

### 4.2 Créer la base + les données de démonstration
```bash
npm run db:reset
```
Cette commande :
- crée la base SQLite,
- applique les migrations (schéma),
- crée **3 comptes** (un par rôle),
- ajoute **5 produits de démonstration** avec du stock.

Vous devez voir s'afficher la liste des comptes créés.

---

## 5. Lancer l'application

Ouvrez **deux terminaux** dans le dossier `gestion-de-stock`.

**Terminal 1 — l'API (backend) :**
```bash
npm run dev:backend
```
→ API sur <http://localhost:3000> (laisser tourner).

**Terminal 2 — l'interface (frontend) :**
```bash
npm run dev:frontend
```
→ Interface sur <http://localhost:5173> (laisser tourner).

Ouvrez ensuite **<http://localhost:5173>** dans votre navigateur (Chrome recommandé).

> Sur la page d'accueil (tableau de bord Admin), l'état de l'API doit être « ok ».
> `localhost` est un contexte sécurisé : **la caméra fonctionne** sans HTTPS.

---

## 6. Se connecter

Sur l'écran de connexion, cliquez sur une puce de démonstration puis
**Se connecter**. Mot de passe commun : `comptoir123`.

| Rôle | Email | Accès |
|---|---|---|
| **Opérateur** | `operator@comptoir.local` | Vente, Clients |
| **Admin** | `admin@comptoir.local` | + Réception, Réappro, Produits, Alertes, Rapports |
| **Superviseur** | `supervisor@comptoir.local` | + Ajustements, Utilisateurs |

---

## 7. Parcours de test recommandé

Connectez-vous d'abord en **Admin**.

### 7.1 Réception (entrée en stock)
1. Menu **Réception**.
2. Cliquez **Scanner** (autorisez la caméra) **ou** utilisez « Saisie manuelle ».
3. Codes de démonstration déjà connus :
   `3600523351992`, `3574661648446`, `8001090382948`, `3014260228187`, `3600542525893`.
4. Testez un **code inconnu** (ex. `0123456789012`) :
   - avec Internet, la fiche se pré-remplit via Open Beauty Facts ;
   - sinon, saisissez le nom manuellement.
5. Indiquez une quantité → **Valider** → le stock augmente.

### 7.2 Réappro (réserve → vitrine)
1. Menu **Réappro**.
2. Scannez ou recherchez un produit.
3. Indiquez la quantité à mettre en rayon → **Valider**.
   (Stock −N, Vitrine +N.)

### 7.3 Vente (fonctionne aussi en Opérateur)
1. Menu **Vente**.
2. Recherchez « Savon » (ou scannez) → **Ajouter** au panier.
3. Choisissez **Client inconnu** ou **Nom + téléphone**.
4. **Valider la vente** → un **reçu** s'affiche (bouton **Imprimer**).

### 7.4 Alertes de seuil
1. Faites baisser un stock sous son seuil (ventes répétées, ou **Ajustement**
   négatif en Superviseur).
2. Menu **Alertes** : une alerte apparaît
   (**Vitrine basse** = in-app ; **Réserve basse** = in-app + email fournisseur),
   avec un **badge** rouge dans la barre de navigation.
3. Faites un **Réappro** : l'alerte se **résout automatiquement**.

### 7.5 Rapports (Admin)
Menu **Rapports** → onglets **Stock courant**, **Mouvements**, **Ventes du jour**.

### 7.6 Superviseur
- **Produits → Ajuster** : corrections de stock (delta positif/négatif).
- **Utilisateurs** : créer/modifier des comptes et rôles.

---

## 8. Réinitialiser les données

Pour repartir d'une base propre à tout moment :
```bash
npm run db:reset
```

---

## 9. (Optionnel) Activer l'email de recommande fournisseur

Dans `backend/.env`, renseignez un compte SMTP puis relancez le backend :
```
SMTP_HOST=smtp.exemple.com
SMTP_PORT=587
SMTP_USER=votre_utilisateur
SMTP_PASS=votre_mot_de_passe
SMTP_FROM="Comptoir <no-reply@exemple.com>"
ALERT_EMAIL_TO=fournisseur@exemple.com
```
Sans configuration SMTP, l'application fonctionne : l'envoi est simplement
journalisé dans le terminal du backend.

---

## 10. Dépannage

| Problème | Solution |
|---|---|
| `command not found: npm` | Node.js n'est pas installé (voir §1.1). |
| Le backend ne démarre pas / port occupé | Un autre programme utilise le port 3000. Fermez-le, ou changez `PORT` dans `backend/.env`. |
| L'interface affiche « Backend injoignable » | Vérifiez que le **Terminal 1** (backend) tourne bien. |
| La caméra ne s'ouvre pas | Autorisez la caméra dans le navigateur ; sinon utilisez la **saisie manuelle** (toujours disponible). Sur mobile/IP, un accès **HTTPS** est requis. |
| Erreur de compilation `better-sqlite3` | Relancez `npm install`. Sous Windows, installez « Desktop development with C++ » (Build Tools) si demandé. |
| Repartir de zéro | `npm run db:reset`. |

---

## 11. Construire pour la production (facultatif)

```bash
npm run build            # compile backend + frontend
npm run db:migrate       # applique les migrations sur la base de prod
npm run start --workspace backend   # démarre l'API compilée
```
Servez le contenu de `frontend/dist/` derrière un serveur web en **HTTPS**
(obligatoire pour l'accès caméra hors `localhost`).
