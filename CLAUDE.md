# Prodiconseil — Catalogue B2B

Site statique de catalogue papier/carton B2B. Déployé sur GitHub Pages.

## Stack
- **Frontend** : HTML/CSS/JS vanilla (aucun framework)
- **Backend** : Supabase (PostgREST + RLS) — lecture seule côté client
- **Déploiement** : GitHub Pages → `https://prodi-paper.github.io/` (migration 2026-06-04 depuis `ethanelb.github.io` ; ancien repo conservé en lecture, workflow d'import désactivé là-bas pour éviter le double-write Supabase). Pas de CNAME custom — `paper.prodi.com` est un autre site Bitrix24, sans rapport avec ce repo.
- **Repo** : `https://github.com/prodi-paper/prodi-paper.github.io` (`origin`). Ancien `ethanelb/ethanelb.github.io` accessible via remote local `ethanelb-old`.

## Fichiers principaux
| Fichier | Rôle |
|---|---|
| `index.html` | Catalogue produits (page principale) |
| `catalogue.js` | Logique JS du catalogue (~3760 lignes) |
| `catalogue.css` | Styles du catalogue |
| `vitrine.html/js/css` | Page d'accueil commerciale |
| `img/` | Images statiques |
| `assets/prodi2026.mp4` | Vidéo vitrine |
| `scripts/` | Robot d'import quotidien + utilitaires (Python, exécutés par CI) |

## Supabase
- **Project ref** : `bvcgpdoukhcatjibmvnb`
- **URL** : `https://bvcgpdoukhcatjibmvnb.supabase.co`
- **Anon key** (publique par design — utilisée dans le navigateur) : `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJ2Y2dwZG91a2hjYXRqaWJtdm5iIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzIyNzg5MjgsImV4cCI6MjA4Nzg1NDkyOH0.Ip3ykSUS9sajTH04yXBerOG1haBKMD1kAvMQNjnGL1Q`
- **Service-role key** : ***GitHub Secret `SUPABASE_SERVICE_ROLE`*** (ajouté 2026-05-05). Bypasse RLS, utilisée par le script CI d'import pour DELETE/INSERT sur `products`. Ne jamais exposer côté client.
- **Management token** : ***voir GitHub Secret `SUPABASE_MGMT_TOKEN`***. Jamais coller en clair dans le repo (secret-scanning bloquerait le push).
- **SQL endpoint (mgmt API)** : `POST https://api.supabase.com/v1/projects/bvcgpdoukhcatjibmvnb/database/query`

### Tables principales
- `products` — stock papier (colonnes : `id, quality, color, gsm, width, longueur, weight, price, ref, details, image_url, zone, noyau, format, usine, emplacement, created_at`)
- `proforma_requests` — demandes de devis (créée 2026-05-01) : `id, created_at, product_id, nom, societe, email, telephone, message, quantite_souhaitee, statut`
- `shared_carts` — sélections partagées : `code` TEXT PK, `cart_ids` TEXT (numeric comma-sep), `created_at`, `expires_at` (default `now() + 90d`, purge cron 3h UTC)

### RLS appliquées (depuis 2026-05-01)
- `products` : RLS ON. `anon` SELECT uniquement. `authenticated` ALL. **Le robot d'import CI utilise la `service_role` key qui bypasse RLS** (cf `scripts/import_stock_ci.py`).
- `proforma_requests` : RLS ON. `anon` INSERT borné en longueur (nom ≤ 100, message ≤ 2000, telephone ≤ 30, email ≤ 200, societe ≤ 200, statut ≤ 50, quantite_souhaitee ≤ 200). `authenticated` SELECT + UPDATE.
- `shared_carts` : RLS ON. `anon` INSERT borné (code 4-16 chars, cart_ids ≤ 5000 chars + regex `^[A-Za-z0-9_]+(,[A-Za-z0-9_]+)*$`). SELECT public si non-expiré. **cart_ids stocke les `ref` produit (ex. `Photo_919465`)**, pas les `id` synthétiques — sinon liens cassés au prochain import quotidien (DELETE+INSERT régénère les IDs).

### GRANTs schema public (restaurés 2026-05-05)
Le harden initial avait sur-révoqué les permissions du `service_role` (`permission denied for schema public` même sur SELECT). Si ça se reproduit (nouveau harden, reset, etc.), ré-exécuter dans le SQL Editor :
```sql
GRANT USAGE ON SCHEMA public TO service_role;
GRANT ALL ON ALL TABLES IN SCHEMA public TO service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO service_role;
GRANT ALL ON ALL ROUTINES IN SCHEMA public TO service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON ROUTINES TO service_role;
```

## Design system
```css
--red: #FE0000
--ink: #222
--gray: #999
--gray2: #bbb
--white: #fff
--off: #f5f5f3
--border: #e8e8e4
```
- **Display** : Bebas Neue
- **Body** : DM Sans
- `PAGE = 40` produits par page (cf. `catalogue.js:20`)

## Conventions JS importantes
- `all[]` — tableau global des produits chargés (mapped via `rowToUi()`)
- `cart[]` — panier en localStorage (`prodi_cart`)
- `lang` — `'fr'` ou `'en'`, géré par `setLang()`
- `LT[lang]` — dictionnaire i18n (FR + EN)
- `sbQ(table, opts)` — wrapper fetch Supabase
- `fmt(kg)` — formate les KGS
- `_sharedMode` — true quand URL contient `?share=` ou `?s=`
- `renderDrawer()` — re-rend le panier latéral
- `filterProducts()` → `_doFilter()` → `_fetchAndRender()` — pipeline de filtrage/pagination

## Helpers sécurité (catalogue.js début, vitrine.js début)
**Toute interpolation de champ produit dans une chaîne assignée à `.innerHTML` DOIT passer par un de ces helpers** :

- `esc(s)` — échappe `&<>"'` pour HTML (texte ou attribut)
- `safeUrl(u)` — whitelist `^https?://`, retourne `''` sinon (anti-`javascript:`)
- `attrJs(s)` — produit un littéral JS-string safe pour HTML attribute. **À utiliser dans `onclick="fn(${attrJs(value)})"` SANS surcouche de quotes** (attrJs en ajoute déjà)
- `numId(v)` — coerce en entier (anti-injection JS dans `onclick="fn(${numId(p.id)})"`)
- `_pgEsc(s)` (catalogue.js, dans `_fetchAndRender`) — échappe `[%_(),]` pour PostgREST query params

Exemple correct :
```js
g.innerHTML=`<div onclick="openDetail(${numId(p.id)})">${esc(p.name)}</div>`;
```
Exemple INCORRECT (XSS) :
```js
g.innerHTML=`<div onclick="openDetail(${p.id})">${p.name}</div>`;  // ❌
```

## Règles métier
- **Prix masqués** côté public — tous les affichages `€` sont commentés (`// PRIX_MASQUÉ`)
- Les données price restent dans les objets JS, juste pas rendues
- Tri stable : toujours `,id.asc` comme clé secondaire
- `_viewMode` (`'grid'` | `'list'`) persiste entre les changements de page
- Honeypot fields : `pf-hp` (proforma single), `pfc-hp` (proforma cart), `f-hp` (vitrine contact). Tout submit handler doit checker `document.getElementById('xx-hp')?.value` AVANT envoi et fail-silently si rempli.

## Règles photos / images produit

### Priorité d'affichage (pour TOUS les produits)
1. **Photo réelle** (`image_url`) → toujours en premier, quel que soit le type de produit
2. **Fallback siderun** → `img/siderun-sur-demande.png` (bleu) si pas de photo ET produit siderun
3. **Fallback fabrication** → `img/fabrication-sur-demande.png` (jaune) si pas de photo ET produit FAB
4. **Fallback générique** → `img/no-photo.png` = `img/photos-sur-demande.png` (blanc) si pas de photo

### Détection FAB
Un produit est FAB si l'une de ces conditions est vraie :
- `ref` commence par `Photo_FAB`
- `details` commence par "fabrication" (mais PAS "calque fabrication" etc.)
- `emplacement` contient "FAB" ou "DIRECT USINE"
- `zone` ou `emplacement` = "FABRICATION SUR COMMANDE"

### Détection Siderun
Un produit est siderun si **les deux** conditions sont vraies :
- `emplacement` = "OUR WAREHOUSE"
- ET (ref contient "FAB" OU details contient "fabrication")

### onerror (image cassée)
- Si le lien `image_url` retourne 404, le `onerror` affiche le fallback approprié (siderun > fab > générique)
- Les photos FAB sur `stock.prodi.net` retournent toujours 404 (n'existent pas)

### Import (scripts/import_stock_ci.py + import_stock_auto.py, à garder SYNCHRO)
- **Source depuis le 2026-07-02 : mail « STOCK COMPLET AVEC LES RESERVATION »** (info@prodi.com, ~8h) — PJ unique `INV_toutarticle.xlsx` (export DOV complet, feuille DOV_export, ~9 300 lignes, TOUT l'ERP). L'ancien « STOCK DÉTAILLÉ AVEC ZONE » (83 PJ par qualité) ne part plus depuis le 2026-07-01 ; « STOCK DÉTAILLÉ » arrive encore mais est IGNORÉ. **Pas de repli** : mail introuvable = échec (alerte Resend), la base d'hier reste en place.
- **parse_dov()** : familles vendables + QTSTO>0 → `source='email'` (visibles catalogue) ; machines UMAC/UMAN, frais WFRA, fret WFRE, écarts ECART, qté nulle → `source='inventaire'` (invisibles catalogue — filtre `source=neq.inventaire` dans `sbQ()` de catalogue.js + vitrine.js — mais utilisés par l'app d'inventaire pour reconnaître les scans).
- **Garde-fou anti-wipe** : < 5 000 produits parsés = abandon sans toucher la base (update_supabase fait DELETE all + INSERT).
- Mapping DOV : REF→ref (préfixé `Photo_`), CODE_FAM→quality, FAM (BOB./PAL.)→format, DP_CODE→zone (allée, ex `6KD`), NOM_DEPOT→emplacement (`A-PRODI SAINT-OUEN`→`OUR WAREHOUSE`), LONG sinon **HDIAM→longueur** (diamètre bobine, piège historique 'diam'), MANDRIN→noyau, PNET→weight, PUNET→price, EMPLACEMENT (« USINE 421 »)→usine.
- **image_url synthétisées** : `https://stock.prodi.net/albums/photo/{ref}.jpg` pour les réfs numériques (le DOV n'a pas d'hyperliens ; les 404 tombent sur les fallbacks visuels existants).
- **STEP 4 ré-appariement** : après chaque import, RPC `rematch_inventaire_product_ids` (repo prodi_arrivages, migration 019) — les ids products sont régénérés chaque matin et la FK des lignes d'inventaire est ON DELETE SET NULL.
- **Alerte échec** : étape `if: failure()` du workflow → Resend (secret `RESEND_API_KEY`) → email à eelbilia@gmail.com (canal indépendant de Gmail).

## Déploiement
- Push sur `main` → GitHub Pages (automatique, ~30s)
- GitHub secret-scanning actif : tout push contenant `sbp_…`/`ghp_…` reconnu sera REJETÉ. Si rejet, retirer le secret et `git commit --amend` (avant push initial seulement) ou nouveau commit.
- Ne pas push à chaque modif — attendre validation utilisateur
- Commande : `git add <fichiers> && git commit -m "..." && git push`

## Sécurité côté front
- CSP en meta sur les 3 HTML (`'unsafe-inline'` toléré pour les `onclick=` inline existants — à refacto un jour)
- SRI sha384 sur les 4 scripts CDN (emailjs, topojson, supabase-js, html2pdf), versions pinnées
- `rel="noopener noreferrer"` sur les `target="_blank"` externes
- Voir `SECURITY_FIXES.md` et `ARCHITECTURE.md` pour le détail complet de l'audit (commits 46d4de41, fc8e62ef, fbcfc5a1)

## Pièges connus
- `??` et `||` ne peuvent pas être mixés sans parenthèses → `p.qty_kg??(p.poids_net||0)`
- `navigator.clipboard.write()` avec `text/html` perd le contexte user gesture après `await`
- `ClipboardItem` non supporté partout → préférer `navigator.clipboard.writeText()`
- Les items du panier en localStorage peuvent manquer `qualite`/`details` → enrichir depuis `all` dans `renderDrawer()`
- Pagination instable sans `,id.asc` comme tri secondaire
- Le `.catch(()=>{})` autour des `await sbQ('proforma_requests',…)` masque les erreurs RLS — utile pour ne pas casser l'UX, dangereux si la table change. À surveiller en log Supabase si retours bizarres.
- Si un test curl insère du garbage avec la clé anon mgmt token via le management API, **toujours nettoyer** : DELETE WHERE id = X. La clé anon ne peut plus écrire (RLS) mais les tests via mgmt token bypassent RLS.
- **Robot d'import CI silencieux après harden RLS** : si tu changes les policies sur `products`, vérifier que le script `scripts/import_stock_ci.py` utilise toujours la `service_role` key (variable env `SUPABASE_SERVICE_ROLE`). Avec la clé `anon`, les batches POST renvoient HTTP 403 + `code 42501` mais le script "réussit" (exit 0) et les insertions sont juste perdues silencieusement.
- **Mapping headers Excel** dans `scripts/import_stock_ci.py` et `scripts/import_stock_auto.py` : la branche `elif 'diam' in s` doit rester présente, sinon les diamètres bobines (col "Diamètre") sont droppés et la colonne `longueur` reste null à 99% (cf commit `f26d7e1e`). Garder les deux scripts synchronisés.
- **`ALL_KEYS` (haut des 2 scripts import) supprime les champs non listés** : la normalisation finale fait `del p[k] if k not in ALL_KEYS`. Ajouter une colonne au produit (ex `zone`) SANS l'ajouter à `ALL_KEYS` = elle disparaît silencieusement avant l'INSERT. (Bug vécu 2026-06-18 sur `zone`.)
- **Choix du mail d'import** : toujours par SUJET (cf section Import). Prendre le dernier mail de l'expéditeur prenait le mauvais (sans zone) et pouvait attraper un courrier sans rapport.
- **Secrets du repo** : `ethanelb` n'a PAS les droits (403/404 Settings). Utiliser `gh auth switch --user prodi-paper` puis `-R prodi-paper/prodi-paper.github.io`, et rebasculer sur `ethanelb` ensuite.
