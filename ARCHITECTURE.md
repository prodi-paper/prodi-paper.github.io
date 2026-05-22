# Architecture technique — Prodiconseil
*Document préparatoire au déploiement — destiné à la direction*

Date : 2026-05-01 (révisé après audit sécurité complet)
Domaine cible : `https://paper.prodi.com`
Repo : `https://github.com/ethanelb/ethanelb.github.io` (publique, GitHub Pages user-site)
Tip de branche `main` : `fbcfc5a1` (3 commits sécurité enchaînés ce jour)

---

## 1. Synthèse en une page (TL;DR)

Le site Prodiconseil est un **catalogue B2B en ligne** qui affiche en temps réel le stock papier/carton de l'entreprise (~5 800 références). Il sert deux objectifs :

1. **Vitrine commerciale** (`vitrine.html`) — page de présentation de l'entreprise, SEO, contact.
2. **Catalogue interactif** (`index.html`) — recherche, filtres, panier, demande de devis (proforma) par e-mail ou WhatsApp.

Sur le plan technique, c'est un **site statique** (HTML/CSS/JS sans framework) hébergé gratuitement sur **GitHub Pages**. Les données produits vivent dans une base **Supabase** (PostgreSQL managé). Chaque jour ouvré à 8h15, un robot **GitHub Actions** lit le mail de stock envoyé par `info@prodi.com`, parse les fichiers Excel attachés et met à jour la base. Aucune installation serveur, aucun coût d'hébergement.

**En une image :**

```
Mail quotidien (Excel)        Supabase (PostgreSQL + RLS)         Visiteur (navigateur)
   info@prodi.com   ───┐         ┌──────────────────────┐               ┌──────────┐
                       ▼         │ products  (5800)     │ ◀── lecture ──│ index.html
   GitHub Actions ───▶ parse ──▶ │ proforma_requests    │               │ vitrine  │
   (cron 8h15 lun-ven)      écrit│ shared_carts         │ ◀──── INSERT ─│          │
                                  └──────────────────────┘  (RLS bornée) └──────────┘
                                          ▲
                                          └── INSERT/UPDATE/DELETE seulement via
                                              role authenticated (admin Supabase)
```

---

## 2. Stack technique

| Couche | Technologie | Rôle | Coût |
|---|---|---|---|
| Hébergement web | **GitHub Pages** | Sert les fichiers HTML/CSS/JS statiques | Gratuit |
| Base de données | **Supabase** (PostgreSQL 17 + PostgREST) | `products`, `proforma_requests`, `shared_carts` | Plan gratuit |
| CI / Automatisation | **GitHub Actions** | Import quotidien du stock (workflow épinglé par SHA) | Gratuit (2 000 min/mois) |
| Email transactionnel | **EmailJS** | Envoi des proformas vers la boîte commerciale | Gratuit (200 envois/mois) |
| Boîte mail source | **Gmail (IMAP)** | Réception du stock quotidien | Existant |
| CDN scripts | jsdelivr, Google Fonts | Bibliothèques externes (avec **SRI sha384** sur les 4 scripts) | Gratuit |
| Repo source | GitHub `ethanelb/ethanelb.github.io` | Versioning du code | Gratuit |

**Particularité :** aucun serveur applicatif à maintenir. Tout le code dynamique tourne dans le navigateur, dans Supabase, ou dans GitHub Actions.

---

## 3. Composants détaillés

### 3.1 Frontend — ce que voit le visiteur

Trois pages publiques :

| Fichier | Rôle |
|---|---|
| `vitrine.html` (+ `vitrine.css`, `vitrine.js`) | Page d'accueil : présentation, carte mondiale des expéditions, formulaire de contact. SEO optimisé. |
| `index.html` (+ `catalogue.css`, `catalogue.js`) | **Cœur du site.** Catalogue avec recherche tolérante aux fautes, ~30 filtres, panier persistant, partage de sélection, modale détail produit, demande de proforma, génération PDF. |

Pour les modifs ponctuelles en base : **dashboard Supabase web** (Table Editor).

**Pas de framework** (vanilla JS). Avantages :
- chargement rapide (pas de bundle lourd) ;
- maintenance simple ;
- aucune dette de versions npm.

**Internationalisation** : FR/EN via dictionnaire `LT[lang]` dans `catalogue.js` (et `T[lang]` dans `vitrine.js`).

**Persistance navigateur** :
- `prodi_cart` (localStorage) — panier qui survit à la fermeture de l'onglet ;
- partage de sélection via URL `?s=CODE` (ou `?share=…`) — la sélection est stockée dans `shared_carts` puis rechargée par code court (4–16 chars).

### 3.2 Base de données Supabase

Projet : `bvcgpdoukhcatjibmvnb`
URL REST : `https://bvcgpdoukhcatjibmvnb.supabase.co/rest/v1/`
PostgreSQL : 17.6

**Trois tables principales** (toutes en RLS activée depuis 2026-05-01) :

| Table | Volumétrie | Accès clé anon (publique) | Accès role authenticated |
|---|---|---|---|
| `products` | ~5 800 lignes, renouvelées quotidiennement | **SELECT seul** (lecture publique) | INSERT / UPDATE / DELETE |
| `proforma_requests` | Demandes de devis (créée le 2026-05-01) | **INSERT seul** avec WITH CHECK longueurs (nom ≤ 100, message ≤ 2000, telephone ≤ 30, email ≤ 200, societe ≤ 200, statut ≤ 50, quantite_souhaitee ≤ 200) | SELECT + UPDATE |
| `shared_carts` | Sélections partagées | **INSERT** avec `cart_ids ~ '^[0-9]+(,[0-9]+)*$'` + length ≤ 5000 + code 4-16 chars ; **SELECT** uniquement si `expires_at > now()` | (idem RLS anon) |

**Expiration automatique** : `shared_carts.expires_at` à `now() + 90 days` par défaut. Job `pg_cron` quotidien à 3h UTC : `DELETE FROM shared_carts WHERE expires_at < now()`.

**Note historique** : avant le 2026-05-01, la table `proforma_requests` n'existait pas — toutes les demandes de devis envoyées via le formulaire de contact de `vitrine.html` étaient silencieusement perdues (le code a un `.catch(()=>{})` qui masque l'erreur ; les flux du catalogue avaient EmailJS comme backup, mais pas le formulaire vitrine).

**Sécurité base** : la clé anonyme exposée dans le navigateur ne peut faire que ce que les RLS autorisent. Le management token (équivalent admin) n'est utilisé QUE par le robot d'import (GitHub Secret `SUPABASE_MGMT_TOKEN`, jamais côté navigateur).

### 3.3 Robot d'import quotidien

**Fichiers** : `.github/workflows/import-stock.yml` + `scripts/import_stock_ci.py`

**Hardening workflow** (depuis `fbcfc5a1`) :
- `permissions: contents: read` (least privilege)
- `concurrency: import-stock cancel-in-progress: true` (anti-race sur DELETE+INSERT)
- `actions/checkout` et `actions/setup-python` épinglés par SHA40 (anti-tag-takeover)
- `pip install openpyxl==3.1.5` (version pinned, hygiène supply chain)

**Déroulement** (lun-ven, 8h15 heure Paris = 6h15 UTC) :

1. GitHub Actions démarre une machine Ubuntu temporaire.
2. Connexion IMAP à Gmail (`info@prodi.com`).
3. Récupération du dernier mail expéditeur configuré.
4. Extraction des `.xlsx` attachés.
5. Parsing avec `openpyxl` (références, qualité, couleur, grammage, laize, longueur, poids, prix, usine, emplacement + extraction des hyperliens photo `stock.prodi.net`).
6. **DELETE** complet de `products` (`WHERE id > 0`) + **INSERT** par batchs de 500.
7. Réapplication des zones via `scripts/correction_zone.xlsx`.
8. Machine détruite, fichiers temporaires perdus.

**Durée** : 1–2 minutes. **Mode `--dry`** disponible.

### 3.4 Demande de devis (proforma)

Quand un visiteur soumet le formulaire de proforma (depuis catalogue ou vitrine) :

1. Vérification du **honeypot** (champ caché `pf-hp` / `pfc-hp` / `f-hp`) — si rempli, fail-silently (faux écran de succès, pas d'écriture).
2. INSERT dans `proforma_requests` (Supabase) — bloqué côté RLS si dépasse les longueurs.
3. EmailJS → mail vers la boîte commerciale (notification immédiate).
4. WhatsApp pré-rempli (`wa.me/33649754915`) si choix utilisateur.

**EmailJS** : clés publiques par design dans `catalogue.js`. Restriction de domaine à activer côté dashboard EmailJS (*Faille #6, action user en attente*).

---

## 4. Flux de données — chemin complet d'un produit

```
┌────────────────────────────────────────────────────────────────────────┐
│  1. info@prodi.com envoie un mail Excel quotidien                      │
│     → Gmail boîte commerciale                                          │
└────────────────────────────────────────────────────────────────────────┘
                                  │
                                  ▼ (8h15 Paris, lun-ven)
┌────────────────────────────────────────────────────────────────────────┐
│  2. GitHub Actions exécute import_stock_ci.py                          │
│     IMAP fetch → openpyxl parse → REST DELETE+INSERT vers Supabase     │
└────────────────────────────────────────────────────────────────────────┘
                                  │
                                  ▼
┌────────────────────────────────────────────────────────────────────────┐
│  3. Supabase products → ~5 800 lignes fraîches                         │
│     + zones d'entrepôt réappliquées depuis correction_zone.xlsx        │
│     RLS : seul role authenticated peut écrire ; anon SELECT only       │
└────────────────────────────────────────────────────────────────────────┘
                                  │
                                  ▼ (à la demande)
┌────────────────────────────────────────────────────────────────────────┐
│  4. Visiteur ouvre paper.prodi.com → GitHub Pages sert index.html      │
│     catalogue.js fait fetch() vers Supabase REST (clé anonyme)         │
│     → affichage produits + filtres + panier                            │
│     CSP en meta (defense-in-depth) + SRI sur les scripts CDN           │
└────────────────────────────────────────────────────────────────────────┘
                                  │
                                  ▼ (visiteur intéressé)
┌────────────────────────────────────────────────────────────────────────┐
│  5. Demande proforma                                                   │
│     ├─ Honeypot check (rejette les bots)                               │
│     ├─ INSERT proforma_requests (Supabase, RLS WITH CHECK longueurs)   │
│     ├─ EmailJS → mail vers commerce@prodi.com                          │
│     └─ WhatsApp pré-rempli (rel="noopener noreferrer")                 │
└────────────────────────────────────────────────────────────────────────┘
```

---

## 5. Hébergement & déploiement

### 5.1 Mise en ligne du code

```
Développeur → git push origin main
                     │
                     ▼
             GitHub repo (ethanelb/ethanelb.github.io)
                     │
                     ▼
             GitHub Pages build automatique (~30 s)
                     │
                     ▼
          https://paper.prodi.com  (CNAME → ethanelb.github.io)
```

**Protection contre fuite de secrets** : GitHub a un secret-scanning actif sur le repo. Tout push contenant un token `sbp_…` / `ghp_…` reconnu sera rejeté automatiquement.

**Rollback** : `git revert <sha>` puis `git push` — retour à l'état précédent en 30 s.

### 5.2 Domaine `paper.prodi.com`

- CNAME DNS : `paper.prodi.com` → `ethanelb.github.io`
- Fichier `CNAME` à la racine du repo (à créer si absent) contenant `paper.prodi.com`

### 5.3 Secrets GitHub Actions

Repo `Settings → Secrets and variables → Actions` doit contenir :

| Secret | Usage | Rotation conseillée |
|---|---|---|
| `IMAP_USER` | Adresse Gmail réceptrice | À la demande |
| `IMAP_PASS` | Mot de passe d'application Gmail (révocable individuellement) | Tous les 6 mois |
| `SUPABASE_URL` | `https://bvcgpdoukhcatjibmvnb.supabase.co` | Stable |
| `SUPABASE_ANON_KEY` | Clé anon (publique, secret par hygiène) | Au besoin |
| `SUPABASE_MGMT_TOKEN` | Token de management Supabase (admin total — sensible) | Annuelle, ou immédiatement si exposé |

Les 5 secrets sont configurés et la CI a tourné avec succès le 2026-05-01 après les rotations.

---

## 6. Sécurité — état post-audit (2026-05-01)

Un audit complet a été mené ce jour, ayant identifié 10 failles initiales + 2 secrets bonus + 5 trous additionnels post-fix. Détail dans `SECURITY_FIXES.md`. État final :

### 6.1 Fixes appliqués (commits `46d4de41`, `fc8e62ef`, `fbcfc5a1`)

**Secrets** :
- Token Supabase mgmt rotaté + ancien révoqué
- App password Gmail rotaté + ancien révoqué
- Remote git sanitisé (PAT en clair retiré de l'URL embeded)
- Source files purgés de tout secret en clair (env vars exclusivement)

**RLS Supabase** (appliquées en live le 2026-05-01) :
- `products` : RLS ON, SELECT public, écriture role `authenticated` seulement
- `proforma_requests` : créée + RLS ON + INSERT borné en longueur
- `shared_carts` : RLS ON, INSERT borné (regex numeric cart_ids), SELECT non-expirés
- `pg_cron` : purge quotidienne des `shared_carts` expirés

**Frontend** :
- ~28 zones XSS échappées via helpers `esc()`, `safeUrl()`, `attrJs()`, `numId()` dans `catalogue.js` et `vitrine.js`
- 3 reflected XSS résiduelles fermées (correction note, empty state, filter chips, error.message)
- CSP meta + nosniff + referrer policy sur `index.html`, `vitrine.html`
- SRI sha384 sur 4 scripts CDN (emailjs, topojson, supabase-js, html2pdf) pinnés à versions exactes
- Honeypots sur 3 formulaires (proforma single, proforma cart, contact vitrine)
- `rel="noopener noreferrer"` sur 3 liens `target="_blank"` wa.me
- Helper `_pgEsc` sur tous les inputs free-form qui partent en query PostgREST

**CI** :
- `permissions: contents: read` (least privilege GITHUB_TOKEN)
- `concurrency: cancel-in-progress` (anti-race)
- `actions/checkout` et `actions/setup-python` pinnés par SHA40
- `pip install openpyxl==3.1.5` pinned

**Code mort** :
- `_showShareModal()` supprimée (interpolait `${url}` raw)
- `submitQuickDevis()` (vitrine.js) gardée mais sécurisée par honeypot (callable depuis la console)

### 6.2 Actions encore en attente

| Action | Priorité | Détail |
|---|---|---|
| **Activer EmailJS domain restriction** | 🟠 Haute | Dashboard EmailJS → service `service_k3060so` → « Restrict by domain » → `paper.prodi.com`. Empêche l'abus du service comme passerelle de spam. |
| **`git filter-repo`** pour purger l'historique | 🟠 Haute | Les anciens secrets restent dans `git log -p` (révoqués mais l'identifiant Gmail reste exposé). Procédure documentée dans SECURITY_FIXES.md. |
| **Migration vers Cloudflare/Netlify Pages** | 🟡 Moyen | GitHub Pages ne permet pas de configurer des HTTP headers custom (CSP en meta-equiv → `frame-ancestors` ignoré). Une couche Cloudflare devant permettrait : HSTS sur header, X-Frame-Options DENY, Strict CSP en header (effective contre clickjacking et iframe embedding). |
| **Migration `unsafe-inline` → addEventListener** | 🟢 Long terme | ~100 `onclick=` inline imposent `'unsafe-inline'` dans script-src CSP, neutralisant la défense XSS. Refacto vers délégation d'événements rendrait la CSP beaucoup plus efficace. |
| **Rate-limiting Supabase** | 🟢 Si spam | Si des bots commencent à spammer les endpoints publics malgré les honeypots, ajouter une Edge Function avec Cloudflare Turnstile en front. |

### 6.3 Mention RGPD

`proforma_requests` collecte : `nom`, `societe`, `email`, `telephone`, `message`, `quantite_souhaitee`, `product_id`. À ajouter (non bloquant pour le déploiement mais légalement attendu) :
- Mention de consentement dans le formulaire de proforma
- Politique de confidentialité accessible (lien footer)
- Durée de rétention dans `proforma_requests` (recommandé : 3 ans pour les leads commerciaux, après quoi purge auto via pg_cron)

### 6.4 Suivi automatisé

Un agent Claude Code remote est programmé pour le **2026-05-15** (`trig_01SU1aLgrkMExKw1R1Yx4rVy`). Il vérifiera :
- Que les RLS sont toujours en place
- Que les fichiers gitignored ne sont pas réapparus dans le repo
- Que la CI tourne tous les jours ouvrés depuis le push
- Que `securityheaders.com` donne ≥ B sur `paper.prodi.com`
- Que les XSS résiduels sont toujours fermés

Rapport posté en GitHub issue et/ou markdown sur une branche dédiée.

---

## 7. Coûts mensuels estimés

| Poste | Coût |
|---|---:|
| GitHub Pages (hébergement) | 0 € |
| GitHub Actions (~44 min/mois) | 0 € (sur 2 000 min inclus) |
| Supabase plan gratuit | 0 € |
| EmailJS plan gratuit (≤ 200 envois) | 0 € |
| Domaine `prodi.com` | (existant) |
| **Total mensuel** | **0 €** |

Seuils d'attention : EmailJS au-delà de 200 mails/mois → ~$11/mois. Supabase au-delà de 500 Mo (peu probable à ce volume) → ~$25/mois.

---

## 8. Risques opérationnels

| Scénario | Impact | Mitigation actuelle |
|---|---|---|
| Mail quotidien `info@prodi.com` n'arrive pas | Stock figé d'un jour | Site reste consultable avec données de la veille. Investigation manuelle. |
| Format du fichier Excel change | Import casse | Script gère 2 formats. Tout autre nécessite modif scripts/import_stock_ci.py. |
| Supabase tombe | Catalogue inaccessible | Aucun fallback. SLA Supabase. |
| GitHub Pages tombe | Site inaccessible | Aucun fallback. SLA GitHub. |
| Compte GitHub `ethanelb` perdu | Pas de mises à jour possibles | **À adresser** : transférer le repo vers une organisation `prodiconseil` avant la mise en production. |
| App password Gmail révoqué | Import quotidien casse | Régénérer + secret GitHub `IMAP_PASS`. |
| Token Supabase mgmt compromis | Risque écriture massive | Révoquer + en générer un nouveau + mettre à jour `SUPABASE_MGMT_TOKEN`. Procédure validée le 2026-05-01. |
| Spam massif sur formulaires | Pollution DB / quota EmailJS | Honeypot + RLS WITH CHECK longueur en place. Si ça déborde : Turnstile + Edge Function. |
| Bot tente d'écrire sur products via clé anon | Ne réussit pas | RLS bloque (testé via curl 2026-05-01 : POST products → 401). |

---

## 9. Maintenance & évolutions

### Ce qu'un dev peut faire en quelques heures
- Ajouter un filtre, modifier le design, ajouter une langue, ajouter une page.
- Ajouter une colonne à `products` (mettre à jour aussi le script d'import).
- Modifier les zones d'entrepôt (éditer `scripts/correction_zone.xlsx`).
- Lire les leads : `SELECT * FROM proforma_requests ORDER BY created_at DESC` dans le SQL Editor Supabase.

### Ce qui demande plus de travail
- Auth utilisateurs (compte client, prix négociés par client).
- Paiement en ligne (le site est un catalogue, pas un e-commerce → demande de devis).
- App mobile native (le site est responsive, suffisant à ce stade).
- Refacto inline `onclick=` → addEventListener (pour CSP stricte).

---

## 10. Checklist avant déploiement public

- [x] **RLS Supabase appliquées** sur les 3 tables (validé 2026-05-01).
- [x] **Secrets GitHub Actions** configurés et CI validée avec les nouveaux tokens.
- [ ] CNAME DNS `paper.prodi.com` → `ethanelb.github.io` + fichier `CNAME` racine du repo.
- [ ] Tester chemin complet en live : ouverture, filtre, panier, proforma, réception mail.
- [ ] Vérifier que **EmailJS** envoie vers la boîte commerciale.
- [x] **CSP, SRI, honeypots, XSS escapes** appliqués.
- [ ] **Restriction de domaine EmailJS** (dashboard) — Faille #6.
- [ ] **`git filter-repo`** pour purger l'historique des anciens secrets.
- [ ] Mention **RGPD / politique de confidentialité** (à rédiger et ajouter au footer).
- [ ] **Transférer le repo** vers organisation `prodiconseil` (pas un compte personnel).
- [ ] Documenter les tokens dans un coffre d'entreprise (1Password, Bitwarden).
- [ ] Définir un **propriétaire technique** côté entreprise (alertes GitHub Actions, rotations).

---

## Annexe A — Glossaire pour non-tech

- **Site statique** : ensemble de fichiers HTML/CSS/JS servis tels quels, sans serveur applicatif.
- **GitHub Pages** : hébergement gratuit de site statique depuis un dépôt Git.
- **GitHub Actions** : automatisation gratuite de GitHub (cron, déclenchement sur événement).
- **Supabase** : alternative open-source à Firebase. PostgreSQL accessible directement par le navigateur via API REST + RLS.
- **PostgREST** : couche qui transforme une base PostgreSQL en API REST (`GET /products?gsm=eq.80`).
- **RLS (Row-Level Security)** : règles PostgreSQL qui définissent qui peut lire/écrire quelle ligne. **Indispensable** quand la clé anon est exposée au navigateur.
- **Clé anonyme Supabase** : publique par design. Inoffensive si les RLS sont durcies.
- **CSP (Content Security Policy)** : en-tête (ou meta) qui restreint les sources de scripts/styles/images. Defense-in-depth contre XSS.
- **SRI (Subresource Integrity)** : hash sha384 sur un script CDN qui le vérifie à chaque chargement. Empêche l'injection si la CDN est compromise.
- **Honeypot** : champ caché dans un formulaire qui reste vide pour les humains et est rempli par les bots. Permet de détecter les soumissions automatisées.
- **`pg_cron`** : extension PostgreSQL qui programme des tâches SQL récurrentes.
- **EmailJS** : service tiers qui envoie un mail depuis un navigateur (sans serveur intermédiaire).
- **Stocklots** : surplus / lots de papier issus de papeteries européennes — cœur de métier de Prodiconseil.

---

## Annexe B — Inventaire des fichiers du projet

| Chemin | Rôle |
|---|---|
| `index.html` / `catalogue.css` / `catalogue.js` | Catalogue produit (cœur du site) |
| `vitrine.html` / `vitrine.css` / `vitrine.js` | Page d'accueil commerciale |
| `img/` | Logos, fonds, icônes, fallbacks photos produits |
| `assets/prodi2026.mp4` | Vidéo de présentation (vitrine) |
| `scripts/import_stock_ci.py` | Robot d'import quotidien (CI) |
| `scripts/import_stock_auto.py`, `import_stock.py`, `import_all.py` | Variantes d'import (manuel local) |
| `scripts/verify_photos.py` | Vérification ponctuelle des URLs photos |
| `scripts/correction_zone.xlsx` | Référentiel zones d'entrepôt (réappliqué à chaque import) |
| `scripts/codes_douaniers_papier_prodiconseil.xlsx` | Référentiel codes douaniers |
| `scripts/LEXIQUE.xls` | Lexique technique métier |
| `.github/workflows/import-stock.yml` | Configuration cron quotidien (épinglé par SHA, permissions least-priv) |
| `dead_photo_ids.json` | Cache des références sans photo (verify_photos.py) |
| `supabase_security_audit.sql` / `supabase_security_harden.sql` | Audit trail SQL (replayable) |
| `SECURITY_FIXES.md` | Rapport sécurité complet — actions appliquées + en attente |
| `sitemap.xml`, `robots.txt`, `.nojekyll` | SEO et configuration GitHub Pages |
| `CLAUDE.md` | Notes techniques pour assistance IA |

---

## Annexe C — Historique des commits sécurité du 2026-05-01

| Commit | Sujet | Lignes |
|---|---|---|
| `46d4de41` | Rotation secrets, RLS files, escape XSS, SRI on CDN, CSP headers, honeypots | +473/-240 |
| `fc8e62ef` | Fix 3 reflected XSS + SQL syntax bug + dead-code POST endpoint | +43/-18 |
| `fbcfc5a1` | Post-audit hardening — error.message esc, dead-code drop, noopener, query escape, CI pinning | +33/-35 |

Chacun est documenté dans son message de commit. `git log fc8e62ef..fbcfc5a1` pour le détail.

---

*Document préparé pour faciliter la décision de déploiement et le suivi long terme.
Dernière révision : 2026-05-01 14h CEST, après application des RLS live et audit complet.*
