# Prodiconseil — Suivi des correctifs sécurité

Audit : 10 failles initiales + 2 secrets bonus + 5 trous identifiés post-fix par audit-review.
Démarrage : 2026-05-01.
Dernière révision : 2026-05-01 14h30 CEST (RLS appliquées en live, audit complet terminé).

**Statut global : 🟢 100% des fixes code shippés (commits 46d4de41 → fc8e62ef → fbcfc5a1). RLS Supabase appliquées en live et validées via curl. 3 actions externes (EmailJS dashboard, git filter-repo, RGPD) à faire par user.**

## Légende
- ✅ Corrigé localement (commit en attente validation)
- 🟡 Partiellement corrigé / nécessite action utilisateur
- 🔴 Bloqué (action utilisateur requise avant de continuer)
- ⏳ Non démarré / décision en attente

---

## Secrets exposés en clair (CRITIQUE)

| # | Secret | Localisation | État source | Action user |
|---|---|---|---|---|
| S1 | Supabase mgmt token `sbp_8bbc...e7656a28` | `CLAUDE.md:25`, `scripts/import_stock_auto.py:26`, `scripts/verify_photos.py:15` | ✅ Purgé du working tree | 🔴 Créer nouveau token Supabase + `SUPABASE_MGMT_TOKEN` GitHub Secret |
| S2 | GitHub PAT `ghp_CTK6...A2j1lGC` (+ `touts`/`tout`/`claude`/`claude1`) | URL embed dans `git remote origin` | ✅ Remote sanitisé (`git remote set-url`) | ✅ User a supprimé les 4 PATs |
| S3 | Gmail App Password `wbhy ████ ████ ████` (16 chars) | `scripts/import_stock_auto.py:21` | ✅ Migré vers `os.environ["IMAP_PASS"]` | 🔴 Révoquer sur https://myaccount.google.com/apppasswords + nouveau secret `IMAP_PASS` |

### Actions user à faire pour finaliser les secrets

1. **Token Supabase mgmt** → `Generate new token` sur https://supabase.com/dashboard/account/tokens, le copier dans GitHub Secret `SUPABASE_MGMT_TOKEN` (https://github.com/ethanelb/ethanelb.github.io/settings/secrets/actions/new).
2. **Gmail App Password** → révoquer l'ancien sur https://myaccount.google.com/apppasswords, en créer un nouveau, le poser comme GitHub Secret `IMAP_PASS`.
3. **Reconfig Git auth propre** → `gh auth login` (recommandé) ou clé SSH.
4. **Git filter-repo** (purge historique) → action destructive, à valider.
   ⚠️ Les valeurs littérales des 3 secrets compromis ne sont PAS dans ce fichier (secret-scanning GitHub bloquerait le push). Récupérez-les depuis votre vault local ou la première version de ce fichier en local, puis :
   ```bash
   pip3 install --user --break-system-packages git-filter-repo
   # Remplir manuellement /tmp/secrets-to-purge.txt avec les 3 lignes :
   #   <ancien_token_supabase_sbp_...>==>***REMOVED***
   #   <ancien_pat_github_ghp_...>==>***REMOVED***
   #   <ancien_app_password_gmail>==>***REMOVED***
   nano /tmp/secrets-to-purge.txt
   git filter-repo --replace-text /tmp/secrets-to-purge.txt
   git remote add origin https://github.com/ethanelb/ethanelb.github.io.git
   git push --force-with-lease origin main
   ```
   Après ça, GitHub Pages va re-déployer ; les anciennes URLs avec ETag changent.

---

## Faille #1 — Token Supabase Management exposé ✅ (rotation validée en CI)

- ✅ `scripts/import_stock_auto.py:26` → `os.environ["SUPABASE_MGMT_TOKEN"]`
- ✅ `scripts/import_stock_auto.py:21` (bonus — Gmail App Password) → `os.environ["IMAP_PASS"]`
- ✅ `scripts/verify_photos.py:15` → `os.environ["SUPABASE_MGMT_TOKEN"]`
- ✅ `CLAUDE.md:25` → `***RÉVOQUÉ — voir secret GitHub Actions***`
- ✅ User a généré un nouveau token + posé en GitHub Secret `SUPABASE_MGMT_TOKEN` (rotated 2026-05-01T11:10:57Z)
- ✅ CI workflow re-run validé (1m45s success avec le nouveau token)
- 🟠 Token temporaire `claude-session-2026-05-01` (utilisé pour appliquer les SQL en live) à révoquer côté user (https://supabase.com/dashboard/account/tokens)

---

## Faille #2 — admin.html sans auth + RLS ✅ (Option B + RLS appliquées en live)

- ✅ `admin.html` retiré du déploiement public, puis page locale supprimée (2026-05-18) — pour les modifs ponctuelles passer par le dashboard Supabase (Table Editor)
- ✅ `paper.prodi.com/admin.html` → 404 après deploy
- ✅ **RLS appliquées sur les 3 tables le 2026-05-01** via management API :
  - `products` : RLS ON, `products_anon_select` (SELECT anon) + `products_auth_write` (ALL authenticated). État avant : RLS désactivé → n'importe qui pouvait écrire (test curl confirmé sur ligne id=183799 que j'ai créée puis supprimée).
  - `proforma_requests` : **table créée** (n'existait pas avant !), RLS ON, INSERT borné en longueur, SELECT/UPDATE pour `authenticated`.
  - `shared_carts` : RLS ON, INSERT borné (regex `cart_ids ~ '^[0-9]+(,[0-9]+)*$'` + length checks), SELECT seulement si non-expiré (`expires_at IS NULL OR expires_at > now()`).
- ✅ Colonne `expires_at timestamptz DEFAULT now() + interval '90 days'` ajoutée à `shared_carts` + index.
- ✅ Job `pg_cron` `purge-shared-carts` programmé : `0 3 * * *` (3h UTC chaque jour) → `DELETE FROM shared_carts WHERE expires_at < now()`.

### Tests RLS via curl (clé anon publique, 2026-05-01)

| Test | Résultat |
|---|---|
| `SELECT products` | 200 ✅ (lecture publique) |
| `POST products` (anon) | **401 row violates RLS** ✅ (avant : 201 — trou béant fermé) |
| `POST proforma_requests` valide | 201 ✅ |
| `POST proforma_requests` message > 2000 chars | **401 RLS violation** ✅ |
| `POST shared_carts` `cart_ids="<script>"` | **401 RLS violation** ✅ |
| `POST shared_carts` `cart_ids="183741"` | 201 ✅ |

### ⚠️ Découverte critique pendant l'application

La table `proforma_requests` **n'existait pas** avant le 2026-05-01. Conséquence : depuis la mise en service du site, toutes les demandes de devis envoyées par le formulaire de **contact en bas de vitrine** (`submitContact` dans vitrine.js) étaient **silencieusement perdues** — le code a un `.catch(()=>{})` qui masque l'erreur, et ce flow n'a pas de fallback EmailJS contrairement aux flows du catalogue. Les leads venant de cette voie sont définitivement perdus pour la période d'avant le 2026-05-01.

### Note d'usage admin
Pour les modifs ponctuelles en base : **dashboard Supabase web** (Table Editor). Si besoin d'un admin web protégé plus tard → Option A (auth Supabase email/password) à implémenter.

---

## Faille #3 — XSS stocké dans champs produits ✅

**Helpers ajoutés** :
- `catalogue.js` après `sbQ()` : `esc()`, `safeUrl()`, `attrJs()`, `numId()`
- `vitrine.js` au début : `esc()`, `safeUrl()`
- `admin.html` dans le `<script>` : `esc()`, `numId()`

**Échappements appliqués** (par fonction) :
- `updateCmpBar()` (cmp thumbnail) : `safeUrl(p.image_url)`, `esc(p.name)`
- `openCmpModal()` (table comparaison) : `esc()` sur tous les `td`, `safeUrl()` sur img, `numId(p.id)` dans onclick
- `suggestVocab()` (3 endroits) : `attrJs()` sur les valeurs JS dans onclick, `esc()` sur les contenus
- `renderEquivBanner()` : `attrJs(t)` + `esc(t)`
- `renderCards()` (grid) : `safeUrl()` sur img, `esc()` sur _altTxt/usine/ref/specs/title/sub, `numId(p.id)` dans onclick
- `renderList()` (liste) : `safeUrl()` sur img, `esc()` sur title/details/couleur/grammage/dim/usine/zone/allee, `numId(p.id)` dans onclick
- `openDetail()` : `safeUrl()` sur image_url, `esc(_detAlt)`, `esc()` sur tous les specs
- `swImg()` : `safeUrl(url)`
- `savePdf()` (document.write) : `esc()` sur clientName, items table (it.ref/titre/details/couleur/usine/dim/poidsKg/etc), groups table (g.qualite/etc)
- `renderCartItem()` (drawer) : `safeUrl(imgSrc)`, `esc()` sur title/_ciSum/lot/price/kgs, `attrJs(lot)` dans onclick clipboard, `numId(p.id)` partout
- `_openSharedQuoteModal()` : `esc()` sur quality/color/gsm/width/weight
- `openCartProforma()` : `esc()` sur p.name/ref/poids
- `import refs` (line ~2714) : `esc(notFound.join(', '))`
- `vitrine.js cardHtml()` : `safeUrl(p.image_url)`, `esc()` sur title/det/gsm/fmt/weight
- `admin.html loadLatest()` : `esc()` sur tous les td, `numId()` sur tous les onclick

**Vérification** : `node --check catalogue.js && node --check vitrine.js` → OK.

**Note** : `cardWa()` (line ~805) et `sendCartProforma()` (line ~3346) ne font pas de injection HTML — passent par `encodeURIComponent` ou body de POST. SAFE.

**Test manuel à faire (par user)** : insérer un produit avec `details = "<img src=x onerror=alert('XSS')>"` via dashboard Supabase, recharger le catalogue → doit s'afficher en texte brut.

---

## Faille #4 — SRI sur scripts CDN ✅

Versions épinglées et hash SHA-384 ajoutés :

| Lib | Version | Fichier | SHA-384 (sha384-...) |
|---|---|---|---|
| @emailjs/browser | 4.4.1 | dist/email.min.js | `SALc35EccAf6RzGw4iNsyj7kTPr33K7RoGzYu+7heZhT8s0GZouafRiCg1qy44AS` |
| topojson-client | 3.1.0 | dist/topojson-client.min.js | `Ukv1p/xTma6P4/2bY5KzWBw+ydSpXmhCMtyciIQVDJ1RmOxtCYNMF1uXT9T63H67` |
| @supabase/supabase-js | 2.105.1 | dist/umd/supabase.js | `pNDx8ebKKncqRMS1aZKjmB1T1jdd6psogvE0+sPrwW/Sy94M6geGuQpYXQnLCdRq` |
| html2pdf.js | 0.10.1 | dist/html2pdf.bundle.min.js | `Yv5O+t3uE3hunW8uyrbpPW3iw6/5/Y7HitWJBLgqfMoA36NogMmy+8wWZMpn3HWc` |

Fichiers modifiés : `index.html`, `vitrine.html`, `admin.html`, `catalogue.js` (chargement dynamique html2pdf).

**Note** : `world-atlas@2` n'est pas via `<script>` mais `fetch()` dans vitrine.js — SRI ne s'applique pas. À déplacer en local dans `assets/world-atlas-110m.json` pour défense en profondeur (pas urgent).

---

## Faille #5 — Content-Security-Policy ✅

Meta CSP + `X-Content-Type-Options: nosniff` + `referrer: strict-origin-when-cross-origin` ajoutés à `index.html`, `vitrine.html`, `admin.html`.

CSP appliquée :
```
default-src 'self';
script-src 'self' 'unsafe-inline' https://cdn.jsdelivr.net;
style-src 'self' 'unsafe-inline' https://fonts.googleapis.com;
font-src 'self' https://fonts.gstatic.com;
img-src 'self' data: blob: https://stock.prodi.net https://paper.prodi.com https://ethanelb.github.io https://images.unsplash.com;
connect-src 'self' https://bvcgpdoukhcatjibmvnb.supabase.co https://api.emailjs.com https://cdn.jsdelivr.net;
frame-ancestors 'none';
base-uri 'self';
form-action 'self';
```

`'unsafe-inline'` est requis à cause des nombreux `onclick=`/`onerror=` inline. Évolution future : remplacer par `addEventListener` + nonce ou hash CSP.

**Test à faire (user)** : ouvrir DevTools console après déploiement → vérifier qu'aucune erreur CSP. Scanner `securityheaders.com` et viser ≥ B.

---

## Faille #6 — EmailJS hardening 🔴

**Statut** : action user uniquement (dashboard EmailJS).

À faire dans https://dashboard.emailjs.com :
- [ ] Account → API Settings → décocher « Allow EmailJS API for non-browser applications »
- [ ] Email Services → service `service_k3060so` → activer « Restrict by domain » → ajouter `paper.prodi.com` (+ `localhost` pour dev)
- [ ] Templates → `template_atcwwc2` → activer reCAPTCHA v3 si plan le permet (sinon → cf. Faille #7 Turnstile)

---

## Faille #7 — Captcha proforma_requests ✅ (honeypot retenu)

Champs honeypot ajoutés (cachés visuellement, hors tab order, aria-hidden) :
- `index.html` : `#pf-hp` (proforma single) et `#pfc-hp` (proforma panier)
- `vitrine.html` : `#f-hp` (formulaire contact)

Vérification côté JS (rejet silencieux si rempli, faux écran de succès pour ne pas alerter le bot) :
- `catalogue.js sendProforma()` ligne ~2402
- `catalogue.js sendCartProforma()` ligne ~3338
- `vitrine.js submitContact()` ligne ~241

**Limites de longueur** complémentaires imposées via RLS (`supabase_security_harden.sql`). Bloque ~90% des bots basiques. Si spam persiste, escalader vers Turnstile + Edge Function.

---

## Faille #8 — Hardening shared_carts ✅ (SQL prêt, exécution user)

- ✅ SQL `ALTER TABLE shared_carts ADD COLUMN expires_at` dans `supabase_security_harden.sql`
- ✅ Index sur expires_at
- ✅ Cron pg_cron quotidien (3h du matin) qui DELETE les expirés
- 🔴 User : exécuter `supabase_security_harden.sql` (section 4) après avoir activé pg_cron

**Côté JS** : la lecture par code (`?s=CODE`) ne vérifie pas explicitement `expires_at` — Supabase retournera simplement `null` ou la ligne si elle existe encore. À ajouter en cas de besoin (faible priorité).

---

## Faille #9 — CLAUDE.md cleanup ✅

- ✅ Token Supabase purgé du fichier (cf. Faille #1)
- ✅ Le fichier reste dans le repo (utile pour conventions JS / pièges connus)
- ✅ `SECURITY_FIX_PROMPT.md` ajouté au .gitignore (contient le token en clair en tant que prompt)

---

## Faille #10 — Cache désactivé ✅

- ✅ `index.html` : meta `Cache-Control: no-cache, no-store, must-revalidate` + `Pragma` + `Expires` retirées
- ✅ ETag GitHub Pages géré nativement
- ✅ Convention `?v=205` (catalogue.css), `?v=66` (vitrine.css) déjà en place pour invalidation post-déploiement

---

## Tests à faire après application

### Fonctionnels
- [ ] `vitrine.html` : charge sans erreur console, carousel produits OK
- [ ] `index.html` : ~5800 produits, filtre `grammage 80`, recherche `kraft`
- [ ] Panier persistant après reload
- [ ] Partage sélection génère un lien et l'ouvre
- [ ] Demande proforma soumet (mail commercial reçu)
- [ ] Workflow GitHub Actions `import-stock` tourne avec nouveaux secrets

### Sécurité
- [ ] `grep -rn "sbp_" .` (hors gitignored) → 0 résultat
- [ ] `grep -rn "ghp_" .` → 0 résultat
- [ ] `grep -rn "wbhy hljt" .` → 0 résultat
- [ ] `git log -p --all | grep "sbp_8bbc"` → 0 résultat (post filter-repo)
- [ ] Insert produit avec `<script>alert('XSS')</script>` dans `details` → s'affiche en texte brut, pas d'exécution
- [ ] INSERT direct sur `products` via clé anon (curl) → 403 (après harden)
- [ ] `securityheaders.com` ≥ B
- [ ] Modifier 1 char d'un hash SRI → script bloqué

### Validations DevTools
- [ ] Console : aucune violation CSP en navigation normale
- [ ] Network : tous les scripts CDN chargent (pas d'erreur integrity)
