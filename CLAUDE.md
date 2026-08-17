# Prodiconseil — Catalogue B2B

Site statique de catalogue papier/carton B2B. Déployé sur GitHub Pages.

## Stack
- **Frontend** : HTML/CSS/JS vanilla (aucun framework)
- **Backend** : Supabase (PostgREST + RLS) — lecture seule côté client
- **Déploiement** : GitHub Pages → `https://prodi-paper.github.io/` (migration 2026-06-04 depuis `ethanelb.github.io` ; ancien repo conservé en lecture, workflow d'import désactivé là-bas pour éviter le double-write Supabase). CNAME = `paper.prodi.com` (domaine custom GitHub Pages, sert CE repo depuis ~07/2026 — l'ancienne note « autre site Bitrix24 » est caduque). robots.txt + sitemap + canonicals pointent tous sur https://paper.prodi.com/.
- **Repo** : `https://github.com/prodi-paper/prodi-paper.github.io` (`origin`). Ancien `ethanelb/ethanelb.github.io` accessible via remote local `ethanelb-old`.

## Fichiers principaux
| Fichier | Rôle |
|---|---|
| `index.html` | Catalogue produits (page principale) |
| `catalogue.js` | Logique JS du catalogue (~3760 lignes) |
| `catalogue.css` | Styles du catalogue |
| `vitrine.html/js/css` | Page d'accueil commerciale |
| `analytics.js` | Traqueur maison (→ table `site_events`, inclus vitrine + catalogue, expose `window.prodiTrack`) |
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
- `products` — stock papier (colonnes : `id, quality, color, gsm, width, longueur, weight, price, ref, details, image_url, zone, noyau, format, usine, emplacement, reserve_client, reserve_piece, created_at`). **Réservations Sage** (depuis 2026-07-05) : `reserve_client` (code client) + `reserve_piece` (bon de préparation BPxxxxx) importés depuis CODE_CLI/CODE_PIECE du fichier — le QTRES du fichier est toujours 0, la réservation vit dans ces colonnes. ~1 350 réfs réservées. Badge « RÉSERVÉ » sur les cartes et fiches du catalogue + pastille cadenas (`.fpill-resa`, à côté des filtres photo) = n'afficher que les réservés (filtre serveur `reserve_client=not.is.null`).
- `proforma_requests` — demandes de devis (créée 2026-05-01) : `id, created_at, product_id, nom, societe, email, telephone, message, quantite_souhaitee, statut`
- `site_events` — **analytics maison** (créée 2026-07-05) : `visitor_id/session_id`
  (ids aléatoires localStorage/sessionStorage), `page` (vitrine|catalogue),
  `event` (pageview, recherche, fiche_vue, panier_ajout, panier_partage,
  devis_envoye, contact_envoye, cta_catalogue, duree), `props`, `referrer`
  (hostname externe), `utm`, `lang`, `mobile`, `interne`. Alimentée par
  `analytics.js` (inclus dans les 2 pages, expose `window.prodiTrack`).
  Équipe : visiter `/?team` une fois par appareil → `interne=true` à vie
  (localhost aussi). Robots filtrés (webdriver/UA). RLS : anon INSERT borné,
  authenticated SELECT (lisible par l'assistant IA de l'app arrivages).
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
- **Catalogue 100 % rouge Prodi depuis le 27/07/2026** (commit 6dc5b8ca) : plus
  aucun bleu Apple — `#0071e3`→`#FE0000`, hover `#0077ed`→`#cc0000`,
  `rgba(0,113,227,x)`→`rgba(254,0,0,x)`, fonds pâles `#e8f1fd`/`#eaf3ff`→`#ffecec`
  (Liste/Offre, + row2, sc-add, PRODIX, popup Quantité, menu Offre). Ne pas
  réintroduire de bleu dans catalogue.css/js.
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

## Périmètre & filtres catalogue (refonte 16/07/2026)
- **Périmètre VERROUILLÉ dans `sbQ()`** (catalogue.js ligne ~16) : toutes les requêtes
  `products?` reçoivent `emplacement=eq.OUR WAREHOUSE` + exclusion `Photo_DU%` (sideruns)
  et `Photo_FAB%` (fabrication) en plus de `source=neq.inventaire`. Les blocs filtres
  Stocklots/Fabrication/Siderun et Notre dépôt/Hors dépôt ont été SUPPRIMÉS (UI + state).
  La RPC `sum_weight_filtered` (tonnage) porte le MÊME périmètre (supabase_sum_weight_perimetre.sql).
- **Détails canoniques** : `DETAIL_TAGS` (~80 catégories, regex client `re/excl` +
  patterns serveur `pats/notPats` en ilike) remplace les ~1 300 valeurs brutes du champ
  details. Vocabulaire aligné sur le wizard BRS de prodi_arrivages (lib/prodi/listes.ts).
  CIE arrondi à la valeur canonique la plus proche (`CIE_CANON`, « CIE 161 » → CIE 160).
  Sentinelles `DETAILS_NONE` (champ vide) et `DETAILS_AUTRES` (aucun motif) en fin de liste.
- **Familles de formats** : `FORMAT_FAMILLES` (15 ancres ±20 mm `FORMAT_TOL`, sens
  ignoré via min×max) + `FORMAT_AUTRES`. Menu msd-format (caché si Bobine seule).
- **Tout en MM** : laize/longueur/Ø — filtres (saisie directe mm, plus de ×10),
  affichages cartes/fiche/liste/comparateur/PDF/vitrine. `mmToCm` ne convertit PLUS
  (identité arrondie, nom historique).
- **Header** : recherche texte remplacée par la plage Réf article (Min seul = réf
  EXACTE ; `#search-input` reste caché — le scanner QR écrit dedans). Compteur
  produits/tonnage déplacé dans le header. « Ma Liste » avant le Scanner (icône seule),
  € = clone du bouton scanner. Album photo (ex-Importer des références) : import
  Excel cellule par ligne (FS:'\n') + repêchage des tokens 6 chiffres (fix CSV virgule),
  fermeture auto + ouverture de la liste après import.

## Ajouts 17/07/2026
- **Menus à familles partout** : Grammages (±5 g, `GRAMMAGE_FAMILLES`), Laizes
  (±10 mm, bobines seules), Diamètre Ø (±25 mm, ex-champ Longueur), Poids
  (tranches fixes), Réf usine (options dynamiques du cache + recherche). Même
  mécanique msd que Détails/Formats : facettes croisées client + clauses serveur.
  Les anciens inputs Min/Max restent CACHÉS dans le DOM (lecteurs JS optionnels).
- **PRODIX** (pastille flottante noire, remplace le WhatsApp) : modal → POST
  `https://prodi-arrivages.vercel.app/api/prodix-offre` (route publique de
  l'app arrivages : Haiku traduit la demande en critères, sélection serveur
  déterministe, rate limit 15/h/IP) → réfs déversées dans Ma Liste via le flux
  d'import. ⚠️ le domaine est dans la CSP `connect-src`.
- **Ma Liste NON persistante** : remise à zéro à chaque chargement (le lien
  partagé `?s=` la remplit après). Bouton header = « Liste » (plus de camion).
- **Excel offre** : replaqué sur le modèle USINE 83 (couleurs exactes extraites
  du PDF : rouge FF0000, jaune FFFF00, vert A9D08E prix, bleu B4C6E7 en-têtes),
  bloc société complet à gauche, logo droite, date centrée ligne 10, photos
  ratio naturel bornées colonne L, colonnes N°/QUALITÉ (code — nom)/DÉTAILS/
  COULEUR/GSM/LAIZE/Ø/MANDRIN/PN/USINE/P-T « €/t », TOTAL kg jaune, conditions
  de vente. Tri du catalogue en toutes lettres (« Arrivage : plus récents »).
- **Prix** : la base est en €/KG → tout affichage €/T multiplie ×1000 ; ~400
  produits sans prix Sage = cellules vides normales.

## Suite 17/07/2026 (matin)
- **Filtres spécifiques MASQUÉS au départ** : Formats/Laizes/Ø/Mandrins n'apparaissent
  qu'après choix de Bobine, Format ou d'un Type de papier (`updateFilterVisibility`,
  hook sur `toggleMsdOption('msd-type')` + reset). Ordre du panneau : Type, Détails,
  Grammages, Couleurs, Formats, Laizes, Mandrins, Ø, Poids, Réf usine.
- **Menu Détails GROUPÉ** par familles du wizard BRS (`DETAIL_GROUPES` : Blancheur/
  Teintes, Fibres, Finitions, Dos, Codes carton, Qualités papier, Matières + Divers),
  titres `.msd-group-hdr`, recherche qui masque les groupes vides. CIE arrondi de
  10 en 10 (`CIE_CANON` 100→170, plus de 145/165).
- **Pager haut** : pilule segmentée compacte (capsule blanche, cases 24 px, page
  active pastille noire).
- **PRODIX v2 conversationnel** : PANNEAU LATÉRAL droit façon ChatGPT (460 px,
  translateX, accueil centré + 5 suggestions conversationnelles cliquables),
  historique `_pxHist` multi-tours envoyé en `{messages}`, bulles user/assistant ;
  l'offre remplit Ma Liste EN FOND (`_pxRemplir`, remplace la sélection PRODIX
  précédente) sans fermer le chat + boutons bulle « Voir la liste / Copier le lien
  client (shared_carts) / Excel ». Backend (app arrivages) : snapshot stock live
  agrégé (cache 10 min, pages parallèles), questions d'affinage, critères
  anciennete/varier/prix_max_t, ventilation par qualité, traqueur `prodix_tour`
  dans site_events (visitor_id requis par la policy).
- **Excel offre** : section FORMATS à la même largeur que BOBINES (dernière
  colonne P/T fusionnée J:K par ligne, fond vert/zébrure copié sur la fusion).
- **Ma Liste** non persistante (rappel) ; prix sans valeur Sage = cellules vides.

## Suite 17/07/2026 (midi)
- **`_estFormat(p)`** : bobine = SEULEMENT `format==='Bobine'` ; NULL (97 réfs)/
  Palette/Feuille = format (Dimensions, jamais LAIZE/Ø). Remplace tous les tests
  `/palette|feuille/i` (fiche, cartes, vue liste, PDF, tri).
- **Logo PRODIX** (`img/prodix.png`, panda-robot 480 px) : dans le fab flottant
  (rond 60 px fond blanc liseré noir, plus de texte) et à l'accueil du panneau
  (150 px).
- **Panneau PRODIX épuré** : bandeau titre supprimé (juste la croix ✕ à gauche),
  accueil « Bonjour ! Comment puis-je vous aider ? » sans sous-titre, les
  5 suggestions déplacées EN BAS collées à la zone de saisie sous un libellé
  « Par exemple : » (`#prodix-sug`, retiré au 1er message comme `#prodix-empty`).
- **Questions à CHOIX cliquables façon Claude** : l'API renvoie
  `{"type":"question","texte","choix":["80 g","90 g","Peu importe"]}` (2-4 options
  courtes tirées du stock, nettoyées ≤60 car., max 5) ; le panneau les rend en
  lignes numérotées cliquables sous la bulle (`.px-choix`), clic = envoie la
  réponse, écriture libre toujours possible, anciens choix grisés à chaque envoi.
- **Fab PRODIX 69 px** (+15 %).
- **Tiroir Ma Liste : UN SEUL bouton d'export** — « Liste » avec icône Excel
  verte (#21a366) → `exportListExcelTest` ; le bouton PDF (`printSelection`)
  retiré du footer (la fonction existe toujours).
- **Header : icône bloc-notes** (clipboard à lignes) à gauche du texte « Liste ».

## VUE CLIENT (lien partagé ?s=) — refonte 18/07/2026
La page ouverte par un lien `?s=CODE` est une VUE CLIENT dédiée (`body.shared-view`,
`_sharedViewUI`) totalement distincte du catalogue :
- **Épurée** : pas de panneau filtres (masqué + `.body-wrap` 1 colonne), pas de
  scanner/€/tri/pager, champ Réf article seul (filtre local, Min = réf exacte),
  fond BLANC, footer réduit (logo centré + copyright, sans B2B).
- **Header** : compteur « 12 bobines • 6 formats • 12.2 T » (`_rbarSharedCounts`),
  bouton « Télécharger liste » = export Excel DIRECT (logo Excel SVG 30 px à
  droite, sans badge) — câblé dans loadSharedQuote sur #cart-btn.
- **Cartes** (vue unique, tableau retiré) : 4/rangée, corps structuré comme
  l'ÉTIQUETTE imprimée (renderSharedCards : titre pleine largeur puis grille
  FIXE universelle — GRAMMAGE|LAIZE|DIAMÈTRE|MANDRIN (bobine) ou
  GRAMMAGE|DIMENSIONS×3 (format), COULEUR½|POIDS½, DÉTAIL pleine ligne
  wrap 2 lignes) ; unités en <small> ; badge «× N» si groupé (assemblé DÉBRANCHÉ
  pour l'instant — une ligne à réactiver dans loadSharedQuote).
- **Fiche produit** = la carte en GRAND (verticale 840 px, photo entière sur
  fond noir + copie floutée .det-blur, cadre étiquette identique, Zone/Type/
  Code douanier en ligne grise, sans Retirer, croix fixée à l'écran, grandes
  flèches extérieures conservées).
- **Onglets segmentés** Tous les produits / Bobines / Formats (`_buildSharedTabs`,
  seulement si les 2 types existent).
- **Intro animée** (`_ctnSplash`) : semi-remorque Prodiconseil recule (logo réel
  ?v=2), porte s'ouvre, cartes GLISSENT hors du container (z1 sous le camion)
  sur les fourches d'UN chariot qui navette, puis montent se ranger ×1,32
  au-dessus du container. Vraies photos/valeurs via `_ctnFill` (data-card).
  Min 6 s, clic pour passer, filet 8 s, désactivée si prefers-reduced-motion.
- **Popup récap** après l'intro (`_sharedRecap`, gabarit modale Apple) : chapeau
  « Votre sélection », grands chiffres bobines/formats/tonnes(/€ si p=1),
  synthèse ASSEMBLÉE par qualité (unités + plage grammages + tonnage), bouton
  « Voir la liste » → cascade d'entrée des cartes (`card-in`, délais 70 ms).
- **Spinner de chargement** global (`_loadingProducts`) : plus de « Aucun
  résultat » pendant le fetch (catalogue aussi).
- **Thème APPLE = DÉFAUT vue client** (validé 18/07) ; `&etiquette=1` = ancien
  cadre noir. Autres essais par URL : `&apple=1` (fond #f5f5f7,
  cartes blanches sans bordure, filets par technique fond+gap 1px #c9c9ce,
  titres Bebas épaissis text-stroke, badges verre dépoli blur+saturate, footer
  clair, popup/onglets Apple) · `&amazon=1` (header navy, CTA jaune, hairlines)
  · `&zara=1` (éditorial blanc, infos en ligne, poids en pavé rouge) ·
  `&bebas=1` (titres Bebas seuls). Le lien NU garde le style étiquette noire.
  Les liens « Copier le lien » (?s= nus) ouvrent donc le thème Apple.
- Traqueurs ajoutés : whatsapp_click/tel_click/email_click (panneau info retiré
  mais code conservé `_buildSharedInfo`), shared_tab.
- logo.png rendu TRANSPARENT (original : img/logo_fond_blanc.png), servi en ?v=2.

## REFONTE TOPBAR + HERO PRODIX (18/07/2026 soir, poussée 18/07)

**C'EST LE CATALOGUE PAR DÉFAUT depuis le 18/07 soir** (desktop/tablette
≥769px ; le mobile garde son parcours tiroir). L'ancienne vue panneau gauche
est du code dormant. Contenu du mode (body.topbar-view) :
- **Barre de filtres horizontale** centrée : Type de papier · Grammages ·
  Couleurs · (menus bobine/format selon le STOCK réel du type choisi, format
  NULL ignoré comme bruit) · Détails · Filtres avancés. Deux gabarits de
  largeur (96/134 px), libellés FIXES (la sélection vit dans les tags),
  liseré noir `.has-sel`. « Formats » renommé **Dimensions**.
- **Filtres avancés** = accordéon (`_paintAdv`) : Photo, Réservation, Poids,
  Mandrin, Réf usine (avec recherche). Bobine/Format pills retirées.
- **Détails à 2 niveaux** : 3 familles fusionnées (Teintes & finitions,
  Matières & fibres, Codes & qualités) + « Autres / Sans détails » fusionnés
  en une case double.
- **2e ligne** = tags supprimables en ordre d'ACTIVATION (`_chipSeen`),
  + bleu (popup TONNAGE : 10 t / container 26,5 / Tout · ≈ dispo, sélection
  serveur via `_lastQueryP`) ancré à gauche, tri ⇅ à droite (ancres absolues).
- **Scroll infini** (`_loadMore`, sentinelle) — plus de pagination. Zone
  filtres STICKY (⚠️ `overflow-x:clip` sur html/body — `hidden` TUE le sticky).
- **Header capsule flottante** : Réf article/Max centrés absolus, Liste bleu
  #0071e3 ; compteur articles masqué ; « Album photo » supprimé (remplacé par
  le + fichier de PRODIX).
- **Cartes catalogue = cartes étiquette** de la vue client (+ rond bleu au
  survol dans la ligne DÉTAIL, groupés = tout le lot d'un coup), badges photo
  retirés, × N et RÉSERVÉ translucides, badge **PROMO −30 %** (products.promo).
- **Fiche = celle de la vue client** (sélecteurs étendus body.apple-view,
  ligne bas ZONE · USINE · CODE DOUANIER, + rond, pas de bouton Ajouter).
- **LANDING = HERO PRODIX** (Base44×Apple) : panda pastille translucide
  (img/prodix.png flood-fill transparent, original prodix_fond_blanc.png),
  pilule à placeholder machine-à-écrire (6 phrases complètes), 2 rails de
  vraies cartes en fond, grille+footer masqués en vitrine, **conversation
  DANS le hero** (panneau 1080px, ids prodix-chat/prodix-input réutilisés par
  le moteur _pxSend, fab panda supprimé, toasts coupés, page verrouillée
  `body.phero-lock` — seul le fil scrolle, bouton ← Revenir = _pxRetour),
  + fichier (BL/Excel → réfs → liste, `_pxFichier`), résumé d'offre dans la
  bulle, **historique 5 offres** localStorage `prodix_hist` (chips nommées
  « Offre kraft brun · 12,4 t », reprise via `_pxReprendre`), choix
  multi-cochables si `multi:true` + case ✏️ écriture libre inline.
- **PROMO** : réfs < 900000 = promo permanente (règle dans
  scripts/import_stock_ci.py : prix −30 %, jamais résa, colonne
  products.promo) — voir mémoire « Import stock automatique ».
- **PRODIX API** (repo prodi_arrivages) : critères tier A/B/C, avec_photo,
  usines, promo, inclure_reserves, liste en cours (reprise), boucle
  auto-apprenante (prodix_gaps/hints, distillation nocturne). Traqueurs front
  prodix_* partout.

## PERF + RESPONSIVE + TRANCHES (19/07/2026, poussé)

- **Réseau landing ~25 Mo → 235 Ko en visite courante** : zéro pré-vérif
  photos, facettes (7 200 lignes) en CACHE JOURNALIER localStorage
  `prodi_facets:<jour-de-stock>` (jour de stock bascule à 8h30 Paris,
  pages parallèles, colonnes réduites), featured 200 lignes/colonnes utiles,
  EmailJS lazy (`_ejsReady`), fonts sans Space Grotesk + DM Sans 700 réel,
  preconnect gstatic/weserv.
- **`imgThumb(u,w)`** (après safeUrl) : TOUTES les photos passent par
  images.weserv.nl (cartes 560, tiroir 160, rails hero 420, intro client 360)
  avec chaîne de repli vignette→originale→placeholder. La FICHE garde
  l'originale. CSP img-src inclut images.weserv.nl.
- **JS mort coupé** (récupérable via git) : printSelection+askText+
  _proformaDesignation (PDF proforma), chaîne openImportRefs, comparateur,
  ~780 lignes. CSS : thèmes amazon/zara supprimés. HTML : slow-overlay,
  stats-bar, cmp-bar.
- **Laizes/Ø EN TRANCHES** façon Poids (LAIZE_TRANCHES/DIAM_TRANCHES,
  _laizePgT/_diamPgT gte/lt) — plus de familles fines ; « Autres » = valeur
  null. Les deux vivent dans FILTRES AVANCÉS avec Mandrin/Poids/Photo/Résa/
  Usine.
- **Compteurs croisés** : la signature de cache des facettes inclut TOUTES
  les sélections de menus (champ `ms:` de _detailsFiltersSig) — un grammage
  coché invalide les compteurs de Couleurs, etc.
- **RESPONSIVE topbar/hero partout** : mobile = header capsule GRID
  [logo|Liste bleu]+[Réf/Max], barre filtres + tags défilantes au doigt,
  hero/conversation plein écran, cartes 2 col ; tablette 3 col. L'ancien
  parcours tiroir mobile est désactivé en topbar.
- ⚠️ LEÇONS : sed sans correspondance = no-op SILENCIEUX (toujours vérifier
  le fichier après bump de version) ; le vieux headless Chrome plafonne la
  fenêtre à ~500 px (captures « mobile » tronquées) → utiliser CDP
  Emulation.setDeviceMetricsOverride (scripts /tmp/cdp_shot.mjs,
  /tmp/cdp_net.mjs pour profiler le réseau).
- Pastille panda retirée de l'accueil (le hero = saisie + rails).

## FIXES MOBILE + PERF INTRO CONTAINER (19/07/2026 nuit, poussé 8cbbc2ca, v605)

- **Menus filtres invisibles sur iPhone** : `position:sticky` crée TOUJOURS un
  contexte d'empilement (contrairement à `relative`) → les `.msd-panel`
  `position:fixed;z-index:2000` se peignaient DERRIÈRE le fond opaque du hero.
  La barre `.filters-panel` héritait du sticky de la vieille règle sidebar
  mobile (ligne ~815) car **tout le bloc de restyle topbar/apple est dans
  `@media(min-width:769px)`** — toute règle critique (position, largeur des
  panneaux…) doit être DUPLIQUÉE dans le bloc mobile `@media(max-width:768px)`
  (~1894). Fix : `position:static !important` + panneaux `min-width:240px` en
  mobile + re-clamp du bord droit de l'accordéon Filtres avancés à chaque
  dépliage (_paintAdv — le clamp de toggleMsd ne tourne qu'à l'ouverture).
- **Rails hero** : le `-webkit-mask-image` dégradé sur `.phero-tapis` forçait
  la re-rasterisation de toute la zone animée à chaque frame iOS → remplacé
  par bandeaux `::before/::after` en dégradé vers #f5f5f7 (identique à l'œil).
  Mobile : 6 cartes/rail (au lieu de 12), vignettes 240px, cartes 196px.
- **`@media(pointer:coarse)`** : backdrop-filter des badges de cartes coupé
  (2-3 zones de flou live par carte = scroll qui rame sur iOS).
- **Intro container fluide** (revue workflow 19 agents) :
  - Le rendu des 40-60 cartes se faisait PENDANT la chorégraphie → différé via
    `window._ctnRender` (armé dans loadSharedQuote si #ctn-splash présent,
    déclenché dans out()/clic/filet 8s de _ctnSplash, derrière le fondu).
    Les départs `animation-delay` se déclenchent sur le main thread : saturé
    = départs en retard = saccades perçues.
  - `.ctn-scene` : `zoom` au lieu de `transform:scale` (raster à la taille
    cible ; scale rasterisait 1360×960 plein puis réduisait — ~9× trop de
    pixels sur iPhone DPR3). ⚠️ translateX est en coordonnées zoomées :
    -50px/zoom (−45/−63/−88/−125 selon palier).
  - Roues : aplat + moyeu `::before` (le radial-gradient à arrêt net était
    re-rasterisé) ; roues chariot : 1 animation −3240° au lieu de 9 itérations
    (même vitesse visuelle — « 1 itération de 4,95s à −360° » proposé par un
    agent aurait ralenti 9×, méfiance sur les fixes d'agents non relus).
- Libellés « Autres laizes »/« Autres Ø » dans l'accordéon (le sentinel
  `__diam_autres__` s'affichait brut).

## PERF FILTRAGE + OUTILLAGE (20/07/2026, poussé)

- **Recalcul des filtres 3,3–3,7× plus rapide** (mesuré : desktop 21→6,5ms,
  téléphone 3× 54→15ms). Deux changements COMPLÉMENTAIRES :
  1. **Comptage des facettes en O(lignes)** (`_countFacet`, remplace la boucle
     `values.forEach(v=>for r of baseRows:_optMatchesValue)` en O(lignes×options)).
     1→1 (mandrin/usine/format/grammage/laize/Ø/poids) = `counts[deriv(r)]++` ;
     couleur 1→N via `_COLOR_REV` (inverse de `_COLOR_DB`, disjoint) ; `type`
     garde la logique AUTRES + COULEUR_SPLIT. **Comptage : 73ms → 1,4ms.**
  2. **Snapshot des lectures DOM du prédicat** (`_fafState`/`_fafBump` dans
     `_matchesActiveFilters`) : les ~14 getElementById + 1 querySelectorAll par
     ligne étaient refaits ×7200×10 passes = 72 000 lectures DOM. Capturés 1×/passe
     (epoch bumpé dans `_refreshAllFacets` + `updateFilterVisibility`).
  ⚠️ LEÇON : les DEUX sont nécessaires. Le snapshot seul semblait « inutile »
  (0 gain mesuré) car le comptage O(n×options) le masquait ; une fois le comptage
  en O(n), retirer le snapshot faisait 222ms (10× pire). **Mesurer, pas théoriser.**
- **Justesse vérifiée** : `scripts/dump_facets.mjs` dumpe les 705 compteurs, diff
  avant/après = identique. Tout changement du comptage DOIT repasser ce diff.
- **Anti-CLS** : `catalogue/index.html` applique `apple-view`/`topbar-view` sur
  `<body>` via script inline AVANT le 1er paint (sinon le header se peint en
  layout ancien puis saute quand catalogue.js ajoute les classes). NB le CLS
  restait dur à mesurer en headless (flaky selon le cache polices) — vérifier en
  vrai via le HUD.
- **Autres fixes perf** (workflow) : scroll infini en append (non-groupé, repli
  render(all) si formats mêlés), `select=*`→colonnes explicites (`SEL_UI`), skip
  requêtes redondantes count=exact+RPC en mode groupé, `_renderCatalogueCard`
  extrait hors boucle, `width/height` sur images cartes partagées + rails hero,
  `transition:all`→propriétés explicites, blur des badges coupé en desktop.
- **OUTILLAGE PERF réutilisable** (activation `?perf=1`, inerte sinon) :
  - `perf-hud.js` — overlay live (FPS, long tasks, TBT, INP, LCP, CLS, DOM) +
    boutons « test filtres » (chronomètre `_refreshAllFacets`) / « test scroll ».
    Marche sur ordi ET téléphone. Inclus dans catalogue/index.html (defer).
  - `scripts/perf_trace.mjs [url] [1|2|3]` — avant/après headless (1=desktop,
    2=tél récent, 3=tél entrée de gamme), via CDP maison (Chrome + WebSocket).
  - `scripts/dump_facets.mjs` — dump compteurs pour la non-régression.
  - Pattern CDP maison réutilisé de /tmp/cdp_*.mjs (spawn Chrome headless +
    remote-debugging-port + WebSocket, aucune dépendance npm).

## SESSION 20-21/07/2026 (v637, poussé) — intro client, prix, partage, popup Quantité

- **INTRO LISTE CLIENT (?s=) refaite** : choré ~6,6s → ~3,9s (gate min 3200ms,
  filet 4500ms ; low-perf `hardwareConcurrency<=4` ou reduced-motion → `.ctn-lite`
  900ms, chariot+cartes volantes masqués). Cartes intro = UNIQUEMENT des articles
  dont la photo CHARGE (préchargement + tri des 404, fallback kraft SOUS l'image,
  pose synchrone si cache). render() AVANT le fondu (2 rAF), cascade `card-in`
  armée dans la même frame que le rendu (sinon grille visible puis re-cachée).
  Relais slide→drop EXACT à 99,9% (fondu binaire anti-clignotement machines
  lentes) + drop 40ms avant (même position à 2px près = invisible). Popup récap
  `_sharedRecap` SUPPRIMÉ du flux (fonction conservée, plus appelée). Cartes vue
  client sans pastilles réf/usine (pbig-ref/pbig-usine retirés de renderSharedCards).
  Container = repeating-linear-gradient d'ORIGINE (la version « optimisée »
  double-position cassait Safari = container transparent).
- **PRIX (audit 20/07)** : formules ×1000 justes partout (cartes/fiche/liste/
  Excel P/T/totaux). EXCLUSIONS périmètre sbQ : série `Photo_BU*` (pièces
  atelier/SAV clients, prix unitaires, noms de clients) + réfs 931597 (grilles)
  et 898404/05/06 (élastique masque) aux prix Sage faux — à réintégrer quand
  corrigés dans Sage. Prix max restant : calque SLUX 2 800 €/T. Cache facettes
  `prodi_facets:v2:`.
- **RAILS HERO** : cartes répétées jusqu'à couvrir l'écran (une copie ≥ viewport
  sinon trou balayant), 2 `.phero-set` (gap+padding intégrés → -50% tombe pile),
  animation RELANCÉE après remplissage (Safari fige les % au lancement sur piste
  vide = rail immobile). Pilule PRODIX hero : +10% (770px, texte 19), nuage
  radial `::before` inset -140/-220 (PAS de z-index sur la box sinon le pseudo
  -1 passe AU-DESSUS de son fond), contour noir 2px #111, fond #fff.
- **HEADER liste** : vide = aucun bouton ; sélection → icône PARTAGER + badge,
  clic = OUVRE le lien client direct (openClientLink, plus de tiroir) + POUBELLE
  à côté (2 temps « Sûr ? » 2,6s). Tiroir : bouton noir = « Partager » (ouvre le
  lien client), Excel reste via PRODIX/vue client. Vue partagée : cart-btn
  réutilisé « Télécharger liste » — updateCartBadge NE le touche PAS (_sharedMode).
- **POPUP QUANTITÉ unifié** (`_qtyModal` — + bleu sélection ET + des lots ×N via
  `_grpRound`) : tonnage dispo centré 44px arrondi à la tonne, curseur article
  par article au poids EXACT (sélection ≤2000 arts via SEL_UI, sinon repli
  _tonnagePick 0,5t) PRÉRÉGLÉ AU MAX, valeur centrée arrondie, ▲ Container sur
  la piste avec AIMANT positionnel (clic piste = position en ARTICLES pas en
  tonnage → ±5% de piste autour du ▲ ou ±1t → cale sur 26,5t exact), Valider sec,
  segment FAB/STOCK SOUS Valider. **FAB/STOCK = deux POOLS séparés** (dispo
  propre) : STOCK = promo OU réf < 981600 (≈ >1 an, avant juil. 2025), FAB =
  le reste ; lots gardés ENSEMBLE (groupProducts par pool, FAB récents d'abord,
  STOCK anciens d'abord) ; Valider ajoute EXACTEMENT les k articles prévisualisés.
  Répartition stock total : FAB ~93% arts/96% t.
- **MENUS FILTRES** : tri par volume À L'OUVERTURE (recomptage 1,4ms) + FIGÉ
  pendant l'ouverture (_facetPending, flush à la fermeture aux 4 points de
  close) ; premier remplissage (aucun compteur, ex. nav privée) appliqué même
  ouvert ; ordre de CONSTRUCTION du menu Type = `_TYPE_ORDRE_USUEL` (volumes
  réels) → trié dès la 1re frame sans données.
- **date_arrivee** : colonne products (DATECREA du DOV, dd 21/07) — mapping dans
  les 2 scripts d'import + ALL_KEYS. Frise réf↔date : 950000≈07/2023,
  965424≈07/2024, 981600≈07/2025, 987629≈01/2026. Effective au 1er import
  après push. (Frontière STOCK à basculer sur la date réelle un jour.)
- **Outils** : scripts/anim_trace.mjs (FPS/timing/screenshots de l'intro,
  lien test ?s=perftst02). Leçon : clic sur la PISTE d'un input range = saut à
  la position proportionnelle (pas à la valeur du repère visuel).

## SESSION 21/07/2026 après-midi (v656, poussé) — bloc PRODIX, prix, UI

- **PRODIX bloc de questions** (API prodi_arrivages déployée en parallèle, commits
  061b7a5→81c34d9) : 1-3 questions de sujets différents EN UNE bulle (colonnes
  côte à côte `flex-wrap`, titres courts ≤45c, codes Sage dans les choix,
  UN SEUL « Valider (n/3) », réponses combinées « X · Y · Z »). Question POOL
  = interrupteur [FAB|STOCK] préréglé FAB (2 choix, pas de mix) — GARANTIE au
  1er bloc (prompt + injection serveur si le modèle l'omet, regex historique).
  Question TONNAGE `cle:"tonnes"+max_t` = CURSEUR préréglé au max avec aimant
  ▲ Container (comme le popup Quantité). Rétro-compat : la réponse « questions »
  embarque la 1re question à l'ancien format. Placeholder machine-à-écrire
  COUPÉ en conversation (« Répondez à PRODIX… »). Bulles offre/fichier : un
  seul CTA « Partager » (icône header) → ouvre le lien client ; Excel retiré
  (reste dans la vue client). Pool serveur : STOCK = promo OU réf<981600.
- **PRIX (fixes de l'audit, avec import relancé)** : PUNET prioritaire avec
  REPLI AR_PRIXVEN (rempli ~100 % ; couverture 85→99 %, +~1 190 prix, médiane
  du repli 750 €/T = saine) ; garde-fou familles R*/S* à >3 €/kg → prix NULL
  + log « prix aberrant ignoré » (prix unitaires Sage dans un champ €/kg) ;
  PRODIX prix_max_t exclut les articles SANS prix (null passait tous les
  plafonds). Sanity par famille validée (ROFF 615, kraft brun 660, SBOA 565,
  journal 460 €/T…). ⚠️ à trancher un jour : PUNET (lot) vs AR_PRIXVEN
  (article) divergent >20 % sur 56 % des lignes. RLUX 459/RADH 420 = bas mais
  plausibles (déstockage).
- **UI matin** : + bleu row2 TOUJOURS bleu (état all-in noir trash/croix
  neutralisé — le clic ouvre le popup de toute façon) ; sc-add des cartes :
  + → − (fond blanc contour/tiret BLEUS) quand l'article est en liste ;
  header cart-wrap en flex (les 2 boutons s'empilaient), badge ancré sur
  PARTAGER ; poubelle « Sûr ? » 2 temps à côté ; DÉTAIL des cartes nettoyé
  (préfixe désignation BOB./PAL. retiré + séquences de mots dupliquées, même
  non adjacentes — getProductDetailText, O(n²) sur ~15 mots) ; menu Type =
  « CODE — Famille » (aller-retour : libellés nus essayés puis revert, garder
  ce format) ; menus DIMENSIONS et COULEURS contextuels : sélection 100 % R*
  → Dimensions dans Filtres avancés (_dimsInAdv) ; Couleurs dans la barre
  SEULEMENT pour Offset/Dossier Couleur/SCOL (_coulInAdv) — sections
  format/couleur ajoutées à _paintAdv + _advToggle.
- **Leçon replace_all** : remplacer `_sharedRecap()` partout a aussi frappé la
  DÉFINITION `function _sharedRecap(){` → syntaxe cassée (vu au node --check).

## Retouches 21/07 soir (v658, poussé)
- Filtres avancés : Photo et Réservation déplacés SOUS Diamètre (ordre :
  Poids, Mandrin, Laizes, Ø, Photo, Réservation, Réf usine).
- Bloc questions PRODIX : rangée en GRID `repeat(auto-fit,minmax(240px,1fr))`
  pleine largeur — n questions = n colonnes égales (curseur tonnage compris),
  repli en pile sur étroit. (Avant : flex-wrap, le tonnage retombait dessous.)

## Fichier joint PRODIX (21/07 soir, v660, poussé)
- `_pxRemplir` : requêtes par PAQUETS de 150 SANS plafond global (garde-fou
  2000) — le `limit=200` tronquait un fichier client de 330 réfs (vécu ZINIAS).
  Codes DU*/FAB* préfixés correctement.
- `_extractTextFromFile` xlsx : `cellStyles:true` + `sheet_to_csv({skipHidden})`
  → PRODIX ne lit QUE les lignes VISIBLES dans Excel (le fichier ZINIAS
  traînait 307 lignes masquées d'un vieux tableau = 328 réfs fantômes ;
  visible réel = 55 articles/21,5 t). Les fichiers filtrés = ce qu'on voit.

## Bouton OFFRE — offres préfaites par bande de grammage (v664, DÉPLOYÉ 26/07)
Bouton **« Offre »** dans le header (à côté de « Liste », `#offre-wrap`/`#offre-btn`,
masqué en `body.shared-view`) → **menu déroulant à 2 NIVEAUX** (`.offre-menu`) avec
un **segment FAB / STOCK** en haut (`.offre-seg`/`.offre-seg-btn`, `_offreSetPool`) :
- **Pools** (mêmes que le popup Quantité) : **STOCK** = `promo` OU réf < 981600
  (vieux stock > 1 an) ; **FAB** = le reste (arrivages récents). Défaut FAB, bascule
  auto STOCK si FAB vide, onglet grisé si pool vide. `_offresCalc={FAB:[…],STOCK:[…]}`.
- **Niveau 1** = familles (`OFFRE_PRESETS`) : Offset, Papier luxe, Carton couché,
  Offset couleur, Kraft brun, Kraft, Autocopiant, Couché 1-2 faces, Bouffant, Adhésif
  (`_isCouleurPseudo`→'RCOL'). Affiché « Famille · N offres › ».
- **Niveau 2** (`_offreOuvrir`) = par **qualité×forme** : un sous-en-tête
  `.offre-grp` (« ROFF · Bobine », bobines d'abord) suivi de **jusqu'à 3 lignes
  bande** (`.offre-offer`) chip `.offre-band` + gamme `.offre-gamme`.

**Règles métier impératives** (demande Ethan) :
1. L'offre s'ouvre **directement prête à envoyer au client** (`openClientLink`, PAS un filtre + popup).
2. **On ne mélange JAMAIS les qualités** ni **Bobine/Format** (clé `(qualité|forme)` via `_estFormat`).
3. **Le but = MONTRER LE STOCK** d'une qualité → **plus de plafond container** :
   l'offre = TOUT le stock de la bande (borné juste à `MAX_REFS=350` pour tenir dans
   `?s=`/`cart_ids` ≤ 5000 chars ; `capRefs` round-robin par lot = garde la variété).
4. **3 bandes de grammage** par qualité×forme (`bandsOf`) : **COURANT** = les
   grammages les plus utilisés = **60 % central du stock** (bornes = percentiles
   20/80 **pondérés par le poids**) ; **BAS** = grammages légers ; **HAUT** = lourds.
   Bandes vides ignorées (gamme étroite → moins d'offres) ; ordre Courant→Bas→Haut.
5. **Réservés récents exclus** : `isReserved` (`reserve_client` renseigné) **ET réf ≥
   950000** → retiré de `units` avant tout ; réservés < 950000 restent proposables.
6. **Gamme TECHNIQUE affichée** (`_gamme`, calculée sur TOUT le stock de la bande,
   tout en **mm**) : grammages `min–max g` + **laizes** (bobine, `largeur`, Ø ignoré)
   OU **formats** (feuille, `min×max mm`, liste si ≤2 sinon « N formats »). Plus de poids.
7. **Vue client assemblée** : `openClientLink` (`?s=`) → `loadSharedQuote` regroupe en
   cartes `×N` via `groupProducts` (`{_grpCount,_grpTotalWeight,_grpRefs,…}`),
   `_filterSharedLocal` teste toutes les `_grpRefs`.

**Implémentation** (catalogue.js) : `_offresData()` = `_loadAllProducts()` (cache
facettes du jour) → `rowToUi` → filtre réservés → `buildPool(FAB)`/`buildPool(STOCK)`
→ par famille, `bandsOf(qualité×forme)` + `capRefs` + `_gamme`. `_offreEnvoyer(i,j)`
**REMPLACE** le cart, traqueur `offre_preset` (pool/band), toast, `openClientLink()`.
CSS `.offre-seg*`/`.offre-grp`/`.offre-offer`/`.offre-band(.band-courant)`/`.offre-gamme`
après l'album-photo apple-view (dupliqué `@media(max-width:768px)`).
**Réglages** : curseur 60 % = percentiles `0.2`/`0.8` dans `bandsOf` ; plafond
`MAX_REFS=350` ; frontière réservés `950000`.

## VITRINE — tuiles qualités + bandeau (session 22→27/07/2026, poussé 27/07)

Section « Nos qualités » de la page d'accueil (`vitrine.js` bloc TILES ~l.274,
`vitrine.css` fin de fichier, versions cache-busting `vitrine.css?v=167` /
`vitrine.js?v=102` dans index.html).

- **6 tuiles plein cadre** (ordre : Offset, Carton couché, Couché, Kraft,
  Papier créations, Autocopiant — Couché/Kraft échangés 22/07) : recto = TITRE
  SEUL (sous-titres supprimés 27/07 ; les textes `sub` restent dans TILES,
  plus rendus) + « En savoir + » qui **RETOURNE la tuile** (`qtileFlip`,
  `.qtile-flip` perspective + `.qtile-front`/`.qtile-backface` rotateY ±180°,
  pointer-events par face). Verso = **paragraphe rédigé par famille** (`verso`,
  écrit à partir des vrais `details` du catalogue via ~/bin/prodi-sql, périmètre
  catalogue exact) + « Voir le stock → » (`openStock`) + « Retour ». Traqueurs
  `qualite_plus` (flip) / `qualite_stock` (verso→catalogue).
- **Bandeau « autres qualités »** (`#qcards`, 6 cartes) : boucle INFINIE — 3
  copies des cartes, scrollLeft initialisé à une largeur de jeu, listener
  recentre dans la copie centrale (x<0.5w ou ≥1.5w) → jamais de vide. Points
  de pagination façon apple.com (`#qcards-dots`) : pilule active 58px dont le
  `::after` noir se remplit en 4 s (`@keyframes qdotfill`, durée = `PERIOD`
  JS à garder SYNCHRO) puis auto-avance ; pause au pointerdown/onglet caché/
  hors écran (IntersectionObserver .3) ; `prefers-reduced-motion` = point plein
  statique. Clic carte = `openStock` ; bouton « En savoir + » de la carte =
  **formulaire de contact prérempli** (`qcardForm` → `showPage('contact')` +
  `#f-msg` « Bonjour, je souhaite en savoir plus sur vos produits X. » si vide,
  traqueur `qualite_form`).
- ⚠️ **PIÈGE CSS reveal** : `[data-reveal].visible{transform:none}` (spécificité
  0-2-0) écrase TOUT transform posé par classe (0-1-0) sur le même élément une
  fois révélé → le débord pleine largeur `.qcards-wrap` est centré par
  `margin-left:calc(50% - min(100vw - 24px,1720px)/2)`, JAMAIS par
  translateX(-50%). Symptôme si on régresse : moitié gauche du bandeau vide.
- ⚠️ **PIÈGE Edit/old_string** : un old_string non indenté peut matcher en
  SOUS-CHAÎNE d'une ligne indentée → `qtileFlip` s'était retrouvé DANS l'IIFE
  (inatteignable des onclick inline). Les fonctions appelées par onclick doivent
  rester au niveau global, après le `})();`.
- Outils de test CDP maison dans /tmp : cdp_tiles.mjs (capture tuiles),
  cdp_dots.mjs (auto-avance), cdp_flip.mjs (flips), cdp_form.mjs (carte→form).

## VITRINE — refonte « mode Apple » (27/07/2026 après-midi, poussée)

Session de retouches à la demande d'Ethan, direction = répliquer apple.com :
- **Header** : `position:absolute` (posé sur le hero, ne suit PLUS le scroll).
- **Tuiles qualités** : « Couché » → « Papier couché » ; verso = LISTE à filets
  (`.qtile-list`, une caractéristique par ligne, voile renforcé `.qtile.flipped::after`)
  au lieu du paragraphe ; bouton verso = **« Demander un devis → »** rouge →
  formulaire contact prérempli (`qtileDevis`, traqueur `qualite_devis`) ; recto
  « En savoir + » en pastille BLANCHE (`.qtile-btn-white`). Fond du bloc
  `.showcase-sec` = BLANC. Bandeau qcards : bords CARRÉS (plus de radius) +
  7e carte `MORE` (photo papier crème 1719529216596, SANS titre, bouton
  « Voir tout le stock → » → openStock).
- **Bloc international** (`#international`, .geo-sec) : globe SVG SUPPRIMÉ du DOM
  (initGlobe dormant), remplacé façon bloc Apple TV = titre noir DM Sans 800
  au-dessus (`.geo-h`) + **image presse internationale** `img/presse_internationale.jpg?v=4`
  (générée IA : 10 unes de journaux avec panda, source Desktop, rognée 50px haut/
  20px bas, 1536×954) en carte `.geo-card` bords CARRÉS à 85 % de largeur
  (`min(85vw - 20px,1462px)`, centrée par MARGE — piège data-reveal). Sous-titre,
  compteur +50 pays, bandeau drapeaux (marquee) : SUPPRIMÉS.
- **Stats strips SUPPRIMÉS** (« +25 qualités », « +10 000 tonnes ») ; pastille
  « DEPUIS 1991 » (À propos) supprimée ; footer réduit au logo + copyright
  (colonnes Prodiconseil/Contact/Documents supprimées).
- **Section dépôt → cartes « Get to know iPhone »** (`#depot`, .pcards) : titre
  gauche « Prodiconseil, en un coup d'œil », carrousel horizontal pleine largeur
  (padding gauche aligné sur la marge de contenu `max(var(--pad),calc(50vw - 620px + 48px))`),
  cartes noires **372×680** (dimensions Apple), radius 28, eyebrow 17/titre 26
  blancs, image en bas (62 %), bouton `+` blanc → contact (logistique, dépôt) ou
  openStock (stock) ; 4e carte = **vidéo dépôt** plein cadre (id `depot-vid`
  conservé pour l'IntersectionObserver). Anciennes versions (depot-features,
  bento .dbento) : HTML retiré, CSS dormant.
- Images Unsplash ajoutées : grue+conteneur 1700777685830 (logistique), bobine
  géante 1727159166219 (stock), allée racks 1777026321659 (dépôt).

## VITRINE — grosse session 29/07/2026 (poussée)

- **Sous-pages SEO réelles** : `/produits/` (tuiles+bandeau, JS partagé), `/histoire/`
  (copie habt-sec), `/contact/` (formulaire complet) — générées depuis index.html,
  chargent les MÊMES vitrine.css/js (les IIFE guardent sur l'existence des éléments).
  `<body class="souspage">` (nav mobile visible, pas de burger sur ces pages),
  H1+baseline géo Maghreb/Afrique, OG/Twitter, BreadcrumbList+CollectionPage/AboutPage/
  ContactPage, canonical, sitemap 4 URLs, 404.html brandée. showPage() redirige vers les
  vraies URLs quand le moteur de pages est absent (sous-page) ou la section retirée.
  Nav accueil : href réels + onclick SPA (Google suit le href, l'utilisateur a le smooth).
- **Accueil réorganisé** : hero → qualités → « Prodiconseil, c'est ça. » (pcards) →
  témoignages → bandeau rappel → international → contact. Les DEUX blocs « Notre
  histoire » (Bebas + doublon nouvelle DA .habt2-*) RETIRÉS de l'accueil (le lien
  Histoire → /histoire/). Menu : Produits · Histoire · [Contact →] rouge (plus de
  « Voir le stock » au header ; le hero garde « Voir le stock »).
- **Cartes pcards** : vidéo dépôt EN PREMIER (« Dépôt / 14 000 m² à Amiens », bouton
  CONTACT →), Logistique/Stock avec En savoir + → FLIP (verso texte rédigé sur photo
  voilée, clic partout recto/verso, taille de carte INCHANGÉE au flip), Leadership
  (photo Dov+Véro, « + 30 ans d'expertise », Voir l'équipe → popup organigramme).
  Images plein cadre (gradient .pcards .pcard::after), radius 48px, titres une ligne.
- **Popup ÉQUIPE** (#equipe-modal) : direction (Dov gérant, Véronique directrice
  commerciale) puis 2 rangées miroir (Julien resp. commercial, Lala resp. informatique,
  Ethan chef innovation, David compta / José chef dépôt, Zouhir logistique, Driss Maroc,
  Soumia Algérie), rôles en petites capitales AU-DESSUS des cartes, hairline + barre
  verticale centrale, bouton unique « Contactez-nous ».
- **Témoignages** (.temoin-*) : bandeau une ligne, MÊME mécanique que qcards (3 copies,
  boucle infinie, avance page/5,5 s, SANS tirets), 8 avis fictifs à remplacer (FR :
  Maroc/Algérie/Sénégal/CI/Cameroun ; EN : Pologne/Argentine/Canada), rôle — pays.
  Cartes blanches, trait rouge signature ::before.
- **Bloc international** : image presse .webp recto, flip d'ENTRÉE (gintro retiré à
  l'apparition = on voit le verso une fois), « Voir plus » coin haut-gauche, clic
  partout retourne (recto ET verso), verso texte en continents.
- **Contact** : 100vh centré, Nom+Téléphone+Message seuls (labels DANS les champs),
  bouton « On vous rappelle », machine à écrire dans Message (vraies demandes papier),
  confirmation « Bien reçu. » = coche SVG animée (.ok-box, plus d'emoji).
- **SÉLECTEUR D'INDICATIF** (ccInit, CC_PAYS ~54 pays) : bouton drapeau+code DANS la
  même case que le tel (.tel-wrap focus-within), panneau recherche (normalisation
  accents), dataset.cc préfixe les numéros nus au submit (f-tel/l-tel/r-tel).
- **Bandeau rappel** (.rappel-band, au-dessus international) : Nom+Tél+« On vous
  rappelle » une ligne → proforma_requests (message « Demande de rappel (bandeau) »).
- **POPUP LEAD** (#lead-modal) : 5 s après avoir DÉPASSÉ le hero (accueil) ou 5 s sur
  /produits/, 1×/session (sessionStorage lead_popup), ?popup=1 = forçage test. Panneau
  SPLIT (photo dépôt sombre + contenu, overflow VISIBLE pour le panneau pays, zoom 1.1),
  honeypot l-hp. Envoi → proforma_requests (« Demande de rappel (popup) »).
- **PERF** (mesurée CDP 4 Mbit/s) : 3,35 Mo→1,74 Mo, load 8,4 s→4,4 s. Grosses images
  → .webp (cwebp -q75 ; les .jpg source SUPPRIMÉS du repo), Unsplash q=65 (kraft w=900
  q=60), preload poster hero. Le piège .qtile* : les boutons génériques .qtile-btn-out /
  .qtile-btn (plus BAS dans le fichier) écrasent les customisations — préfixer
  (.pcard-back .pcard-back-btn, .geo-front .geo-plus).
- **Confirmé** : pas de puces « profil » dans les formulaires (retirées sur demande).
  Pages d'essai essai_*.html = locales, jamais commitées.

## Session 31/07/2026 (poussée)

- **CATALOGUE — Grammages en DOUBLE CURSEUR** (`_buildGrammageSlider`, appelé après
  les 2 buildMsdOptions grammage) : remplace la liste à cases dans le panneau
  (desktop `sb-msd-grammage` + mobile `msd-grammage-mob`). Échelle LINÉAIRE de 5 en 5,
  bornes 15–850 g. Pilote les champs cachés f-gmin/f-gmax (requête serveur, prédicat
  client, compteurs croisés et chip « Gram. : X → Y » inchangés) ; la croix de la chip
  appelle `_gslSyncAll()`. CSS `.gsl*`/`.msd-slider-panel`.
- **CATALOGUE — fix Safari iOS panneaux filtres** : en mobile la `.sidebar-col` passe
  `position:relative;z-index:99` (au-dessus du hero PRODIX z2-5, sous le header z100)
  — sinon les .msd-panel (fixed z2000) se peignaient DERRIÈRE le voile du hero sur
  iPhone (Chrome non affecté, ne pas « vérifier » qu'en headless). Plan B si récidive :
  reparenter les panneaux vers body à l'ouverture.
- **VITRINE mobile** : boutons hero centrés même largeur ; tuiles retournées = le
  VERSO (repassé dans le flux) donne la hauteur (boutons plus coupés) ; photo presse
  pleine largeur bord à bord ; .tel-wrap 100% dans le bandeau ; contact SANS le
  100vh en ≤880px (grand vide sinon). Placeholder « Votre nom ou société » partout.
  Popup équipe : Ethan ↔ David échangés.
- **DÉTAILS produits — analyse « sans détails »** (fichier DOV du 30/07) : l'import
  concatène DÉJÀ AR_Langue1+DETAIL+FIBRE+BACK+FINITION+QUALITE+TEINTE → la case
  « Autres/Sans détails » (~904 au catalogue) = articles nus PARTOUT dans Sage, par
  lots entiers. L'inférence « groupe fournisseur+famille+grammage+couleur unanime »
  ne récupérerait que ~51 articles (dont 36 SECURITE) — NON implémentée (accord
  Ethan en attente ; vraie piste = saisie Sage ou OCR étiquettes façon arrivages).
- Marges (DOV, PRIXACH vs PUNET, hors transport) : container 25 T moyen ≈ 10,9 %
  de marge brute (~2 240 €) ; RLUX ressort NÉGATIF (−0,5 %).

## Session 31/07→02/08/2026 (v683, poussée 02/08)

- **ESSAI `?bas=1`** (flag URL, catalogue normal intouché) : landing = TUILES
  qualités façon vitrine (6 tuiles Offset/Kraft/Papier couché/Carton couché/
  Papier créations/Autocopiant + bandeau déroulant 7 cartes boucle infinie,
  points apple.com) ; clic = coche les codes famille dans msd-type et dévoile
  la grille ; pilule PRODIX ancrée en BARRE BASSE fixe (#px-dock, sans fond ni
  contour, clics traversants hors pilule). `_tuilesDismiss` aussi déclenché par
  tout filtre posé à la main.
- **Cartes étiquette : 2 cases par rangée = filets ALIGNÉS** — bobine =
  Grammage+Laize (Ø/mandrin restent sur la FICHE, gabarit complet conservé),
  format = Grammage+Dimensions (2+2, fiche alignée pareil). **Filet fantôme
  sous DÉTAIL corrigé** : `.sc-grid{flex:1;grid-template-rows:auto auto auto
  1fr}` (+`.has-prix`) — la rangée DÉTAIL absorbe la hauteur en plus quand une
  voisine est plus haute (.phero-card exclue, 3 rangées).
- **Curseur grammage** : drag au POINTEUR sur la piste (⚠️ Safari ignore
  pointer-events sur le pseudo-élément thumb — ne jamais revenir aux 2 ranges
  cliquables superposés), poignée la plus proche du doigt, touch-action:none.
  **Bornes ADAPTATIVES** au stock filtré (`_gslAdapt` dans _refreshAllFacets,
  percentiles 0,5/99,5 contre les gsm aberrants Sage jusqu'à 5000) ; la plage
  gn/gx est EXCLUE du prédicat quand excludeKey='msd-grammage' (gate
  dump_facets repassé : 0 diff). Design épuré façon iOS (ligne fine, poignées
  blanches ombrées). Bouton reset supprimé.
- **Détails : LISTE PLATE** (plus de sous-familles) triée par volume, SEUIL
  `DETAILS_MIN_N=20` — en dessous le tag disparaît et « Autres / Sans
  détails » le récupère (cocher Autres sélectionne AUSSI les petits tags via
  `window._detRareTags` ; chip compressée « Autres / Sans détails »). CIE en
  DOUBLE CURSEUR en tête du menu (mêmes tags msd-details, chip « CIE 130 →
  170 », resynchro via updateMsdBtn).
- **Couleurs** caché aussi À L'ARRIVÉE (`_coulInAdv=!some(_isCoul)`) — ne
  revient dans la barre que pour Offset/Dossier Couleur/SCOL.
- UI : bouton envoi PRODIX NOIR, « Offre » contour gris fin + texte noir
  (comme les champs Réf), titre tuile Papier couché en blanc.
- **02/08 INCIDENT SUPABASE** : projet restreint (402 partout) pour quota
  storage dépassé — voir mémoire « Supabase credentials » (ménage photos
  1 840→605 Mo via SQL mgmt + `set storage.allow_delete_query='true'`).
- **04/08 (v689) : TUILES = LANDING PAR DÉFAUT du catalogue** (le drapeau
  `?bas=1` n'est plus nécessaire ; l'ancien hero plein écran = `?hero=1`).
  Segment BOBINE|FORMAT AU-DESSUS du titre dans chaque tuile. Vue client
  `?s=` inchangée (vérifié).
- **04/08 (v687)** : tuiles `?bas=1` = segment BOBINE|FORMAT **dans chaque
  tuile** à la place de « Voir le stock » (Bobine préchoisi ; le segment ne
  fait que BASCULER l'état, c'est le clic tuile qui entre) → sélectionne
  SEULEMENT les codes R* (Bobine) ou S* (Format) de la famille — pas de
  pilule format, chip unique « Type : ROFF ». Bandeau sans forme imposée
  (Ramette = formats seuls). Bloc questions PRODIX : n colonnes FORCÉES sur
  desktop (l'auto-fit retombait en pile), pile seulement ≤640px. Chip format
  dédupliquée (« Bobine, Bobine » = pilules desktop+mobile ×2). PRODIX =
  clé API dédiée côté app arrivages (PRODIX_API_KEY, voir repo arrivages).

## Session 04/08/2026 (v698, poussée)

- **Tuiles landing** : bloc segment+titre remonté de 10px (`.px-tuile-in`
  padding-top `clamp(16px, 6vh − 10px, 48px)`).
- **Menu OFFRE refondu** : 2 segments empilés en tête (FAB|STOCK puis
  BOBINE|FORMAT, `_offrePool`/`_offreForme`, grisé si vide + bascule auto),
  puis **liste plate = UNE offre par QUALITÉ** (plus de bandes de grammage ni
  de niveau 2 ; « Couché 1-2 faces » scindé en 1 face / 2 faces dans
  OFFRE_PRESETS). Ligne = « Famille CODE » + **tonnage seul à droite** (pas de
  gamme, pas de ≈). Forme = lettre du code (R*/S*) **ET** `_estFormat` par
  article (un R* au format NULL est écarté — sinon il s'affichait en carte
  Dimensions au milieu des bobines de la vue client). Clic = openClientLink
  direct. CSS bandes/niveau 2/offre-hdr/offre-chev/offre-back supprimés.
- **`groupKey` + USINE** : un lot (cartes ×N vue client, mode Groupé, pools
  Quantité) ne mélange plus deux usines.
- **Excel export = 2 FEUILLES** (`_buildSheet(ws,secBob,secFmt,opts)` factorise
  le gabarit USINE 83) : « Offre » détaillée inchangée (une ligne par article,
  réf en N°) + « **Assemblé** » = une ligne par LOT — clé qualité/couleur/
  détails/GSM/forme/USINE/prix, **laize HORS clé pour les bobines** (comme le
  poids : affichée en plage min–max, idem Ø ; les formats gardent leurs
  dimensions exactes), PN = poids total, mandrins joints « / », **SANS colonne
  N°** (opts.noRef : colonnes décalées/élargies, merges recalés via
  NCOL/LAST/PREL).
- **Photos de la bande** : ancrage **tl+br** (chaque photo occupe exactement
  son créneau → plus de chevauchement, le tl+ext dérivait) + ⚠️ **hauteurs de
  lignes posées AVANT addImage** — ExcelJS convertit les ancres fractionnaires
  avec la hauteur connue au moment de l'appel (défaut 15 pt → photos écrasées).
- **Fond gris** autour du document sur les 2 feuilles (colonnes à droite +
  ~120 lignes sous les conditions, doc blanc).
- **PRIX IMPORT = max(PUNET, AR_PRIXVEN)** (les 2 scripts, synchro) : audit du
  DOV 04/08 — PUNET = PRIXACH ±1 % sur 52 % des lignes et SOUS l'achat sur
  20 % (SLUX 85 %, RLUX 94 %) = valorisation de stock, pas un prix de vente.
  Garde-fou >3 €/kg par CANDIDAT (une valeur folle n'efface plus l'autre).
  Impact médianes €/t : SLUX 618→760, RLUX 460→680, ROFF 615→730, RCAR
  580→1120. Vérif croisée : le prix « DÉPART USINE » du mail STOCK DÉTAILLÉ
  (83 PJ, 64 % du stock seulement) = ce max à ±5 % sur 91 % des réfs communes
  → pas besoin de changer de source. Effectif au 1er import après push.
- Outils de test : /tmp/cdp_offre*.mjs (menu Offre headless), export xlsx
  intercepté via Browser.setDownloadBehavior + openpyxl.
- **Soirée (v701/css 696, poussée)** : segment des TUILES au même dessin que
  celui du menu Offre (piste #f0f0f2, pilule active BLANCHE, outline:none —
  l'anneau bleu était le focus navigateur) ; **« STOCK » affiché « LOTS »**
  partout (menu Offre, popup Quantité, interrupteur pool PRODIX — clés
  internes et réponse API restent 'STOCK') ; **liste VIDÉE après envoi d'une
  offre** (await openClientLink puis cart.length=0 — sinon badge 350 +
  poubelle au retour ; le Partager du header garde la liste) ; ligne
  « Cliquer = ouvrir la liste client » retirée (CSS offre-hint purgé).
  Règle FAB/LOTS revérifiée aux dates réelles : SLUX 0 mal classé,
  RLUX 2/501 borderline (juil. 2025) — frontière réf figée, bascule
  date_arrivee à faire un jour.

## HARMONISATION DESIGN (05/08, revue validée Ethan)

- **Tokens PARTAGÉS identiques** en tête de catalogue.css ET vitrine.css :
  ombres `--sh-sm/md/lg` (3 niveaux au lieu de ~15 variantes), gris
  `--g1 #515154 / --g2 #6e6e73 / --g3 #86868b`, `--hairline #e0e0e5`.
  Les ombres intentionnelles (vidéo hero .7, témoignages .05) sont conservées.
- **Rayons : 3 valeurs** — 999 (pilules), 20 (surfaces flottantes : capsule,
  menus, modales, tuiles), 10 (contrôles/cartes). menus 16→20, modale 22→20,
  tuiles 22→20, msd-btn 12→10.
- **Crans de texte contrôles** : 11/13/14.5/19 (chips 12.5→13).
- **Segment BOBINE|FORMAT** : un seul dessin tokenisé (tuiles = menu Offre).
- **GABARIT/ZOOM (05/08)** : `--gab` unique (min(1720,100vw−32)) + capsule
  header `--gab-head` (~80 %, ancres % pas vw) ; ≥1760px de viewport le
  catalogue ZOOME globalement (index.html inline, borné largeur ET hauteur,
  plafond 1.6, var `--fitz`) — vitrine idem (vitrine.js, seuil 1440, design
  BASE 1240 conservé). ⚠️ sous zoom : rects = px visuels mais style.left d'un
  fixed est re-multiplié → TOUJOURS diviser par `_zf()` (helper catalogue.js) ;
  l'intro container ANNULE le zoom (`#ctn-splash{zoom:calc(1/var(--fitz))}`).
  5 cartes/rangée ≥2100px. Fiche produit : photo compressible min(48vh,600px),
  étiquette toujours entière.
- **Menu USINE (ex-Fabrication)** : qualité → usines repliées (« Usine 99 ·
  6 offres ») → offres (g · laize · Ø · prix départ), clic = Excel de l'usine
  (variantes pré-générées, lignes des autres usines masquées par chirurgie
  XML — openpyxl PERD les images en resauvant). Manifest = fichiers + usines +
  offres extraites (en-têtes Sage avec \n : normaliser les espaces !).
  Fichiers VIDES (0 réf) exclus du menu. Pilule PRODIX cachée hors landing.

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

## VITRINE — pages pays SEO (07/08/2026, poussé)

Objectif : capter les requêtes « fournisseur / grossiste / import papier + pays »
sur les 3 marchés cibles (Maghreb + Afrique de l'Ouest).
- **3 pages pays réelles** (`/maroc/`, `/algerie/`, `/senegal/`, `<body class="souspage">`,
  mêmes vitrine.css/js que les autres sous-pages) — contenu 100 % UNIQUE par pays
  (ports/villes réels, papiers demandés localement, logistique + incoterms EXW/FOB/CIF,
  douane : EUR.1 Maroc / domiciliation Algérie / hub Dakar). PAS des doorway pages.
- **Schema par page** : BreadcrumbList + Service (areaServed=Country) + **FAQPage**
  (5 Q/R visibles en `<details>` natifs + JSON-LD → résultats enrichis). Styles `gp-*`
  en `<style>` scoped dans chaque page (pas dans vitrine.css).
- **Visibilité (anti-undercover)** : footer site-wide = **5e colonne « Zones desservies »**
  (`.ft2-grid` passé à 5 cols dans vitrine.css, `vitrine.css?v=290→291` sur les 5 pages) ;
  accueil = ligne `.geo-zones` de liens contextuels sous la section #international.
- **sitemap.xml** : 4→7 URLs (pays priority 0.9), lastmod 2026-08-07.
- robots.txt inchangé (pays autorisés ; seul `/catalogue/` reste Disallow).
- Reste à faire hors code : Google Search Console (soumettre le sitemap, suivre les
  positions) — aucune balise google-site-verification posée à ce jour.

## Vue client — retrait OUVERT À TOUS (07/08/2026, poussé)

`window._sharedEdit` (catalogue.js ~6240) = **`true` en dur** désormais : le bouton
`−` de retrait s'affiche pour TOUT LE MONDE sur les liens `?s=` (plus seulement les
appareils flag `prodi_team`/localhost — choix Ethan). Conséquence assumée : le client
peut aussi retirer un produit, et `_sharedRemove` met à jour le MÊME lien (PATCH
`shared_carts.cart_ids`, RLS anon UPDATE). catalogue.js?v=730→731.
NB donnée : le compteur bobine/format s'appuie sur `_estFormat` (format==='Bobine'
strict) → 5 réfs bobine `R*` avec `format` Palette(3)/NULL(2) dans Sage se comptent
en « format » (à corriger à la source Sage).

## SESSION 08/08/2026 (v800+, poussée 35874f2c) — rail, fiche, landing, porte MDP

- **RAIL FILTRES desktop refondu** : les sections avancées (Poids, Couleurs,
  Dimensions, Mandrin, Laizes, Ø, Photo, Réservation, Réf usine) s'affichent
  DIRECTEMENT (accordéon `#tb-adv` forcé `display:block`, bouton « Filtres
  avancés » = titre de section non cliquable), en **lignes plates** `.msd-group-row`
  (filet `border-top`, chevron ›). Clic sur une ligne → **popup FLOTTANT** `.adv-pop`
  (absolue dans `#tb-adv`, `.msd{position:relative}`), positionné sous la ligne via
  `_row.offsetTop`, **bascule vers le HAUT** si pas la place en bas (calcul viewport
  ÷ `_zf()`), search `position:sticky`, ferme au clic dehors (les clics dedans sont
  `stopPropagation`). Le tout dans `_paintAdv`.
- **Homogénéité boutons rail** : Type/Détails/Couleurs(`#sb-msd-couleur`)/Dimensions
  (`#sb-msd-format`) = même ligne plate (`.msd-btn` sans bordure + `::after` chevron
  ›). Grammages `order:7` (juste au-dessus de tb-adv `order:9`, après Détails
  `order:5`) ; Dimensions `order:6` (après Détails quand elle remonte dans la barre).
- **Rail STICKY** (`.body-wrap>.sidebar-col{position:sticky;top:52px}` — l'ancien
  `top:72px` créait 21px de gap sous le header). ⚠️ NE PAS mettre `overflow` sur le
  rail (rognerait `.adv-pop`).
- **Segment BOBINE|FORMAT** : piste `#ececed`, actif = **pilule blanche surélevée**
  (`box-shadow:0 2px 9px`, pas foncé — Ethan a refusé le pavé noir), défaut = labels
  gris `--g2` + séparateur central.
- **FICHE MODAL calquée sur la CARTE** (`_etqFiche`) : DÉTAIL en sous-titre sous le
  titre (sans label, même typo/taille), specs, puis **USINE | PRIX + bouton** en bas
  (jamais de prix/+ en vue client), bandeaux uniformes **50px** (Zone/Code douanier
  25px, `.dspecs margin-bottom:6px`), largeur `-20%` (840→672px), flèches à 8px du
  modal, croix `absolute` au coin du modal.
- **LANDING PAR DÉFAUT = GRILLE triée « Arrivage : plus récents »** (`ref_desc`) :
  `window._SAISIE_BASSE=/[?&]tuiles=1/` (tuiles seulement sur `?tuiles=1`), `init()`
  pose `sort-sel=ref_desc` + `_sortTouched=true` + `_featuredMode=false` + affiche
  la grille/masque le hero (le toggle vit dans `filterProducts`, pas dans le
  `_doFilter` d'init). `?hero=1` garde l'ancien hero.
- **PORTE MOT DE PASSE** (`catalogue/index.html` haut de `<body>`) : overlay `#cat-gate`
  + script inline. Demandé à la 1re visite d'un appareil, **mémorisé** localStorage
  `prodi_cat_ok`. Liens client `?s=`/`?share=` EXEMPTÉS (classe `html.cat-unlocked`
  posée en synchrone → pas de flash). **Mot de passe = constante `PWD` (actuel
  `PRODI2026`, à changer)**. ⚠️ Porte côté navigateur (dissuasive) — la clé Supabase
  anon est publique, pas une vraie sécu (vraie protection = edge/Cloudflare Access).
- **BARRE OUTILS** (`#desk-toolbar`, `margin-top:-8px` compacté) : **compteur tonnage**
  `#tb-tons` de la sélection filtrée à côté du + (maj avec `rbar-tons`, `_totalWeightKg`),
  **chips filtres centrés** (`#filter-chips` `justify-content:center`, pilules NEUTRES
  blanches = style `#topbar-row2 .fchip`), boutons +/tri = cercle blanc + icône foncée
  (inversés), taillés ~35-37px.
- **CARTES** : détail tronqué `…` (`.sc-det-only` `flex-direction:row`+ellipsis —
  la règle générale `.sc-cell{flex-direction:column}` cassait l'ellipsis) ;
  `.sc-grid` en `minmax(0,1fr)` (anti-débordement) ; valeurs anti-clip
  (`flex-shrink:0` sur `.sc-val`+`.sc-cap` — le flex comprimait « Argent » sous la
  hauteur du glyphe) ; gap grille **16→8px** (cartes +6px) ; + poussé à droite
  (`margin-left:auto`) ; **photos moins zoomées** : cadre `.pcard-img` **279→230**
  (ratio ~1.3 proche des photos paysage → rognage 27%→14%) + `_fitCardImg(img)`
  (onload) bascule en `contain` fond blanc si photo trop atypique (`fit<0.6`).
- **HEADER** : Offre REMIS dans le header (JS ne le déplace plus dans le rail),
  boutons `.hright .btn-head` réduits à ~38px/texte 14.5px (= champs Réf article),
  champs Réf article/Max `left:288→303px` (30px+ du logo).

## Code d'accès UNIFIÉ (10/08/2026, poussé)

- **Un seul code : `PRODI2026`** pour les DEUX portes — vitrine (`STOCK_CODE='prodi2026'`
  dans vitrine.js:11, comparaison en minuscules donc insensible à la casse) et
  catalogue (`PWD='PRODI2026'` dans catalogue/index.html:129, sensible à la casse).
  ⚠️ Si on change le code un jour : changer LES DEUX constantes.
- **Plus de double saisie** : la porte vitrine pose aussi `localStorage prodi_cat_ok`
  au succès → la porte catalogue (lue en synchrone dans le <head>) ne s'affiche plus
  après passage par la vitrine. vitrine.js?v=150 sur les 7 pages.

## Vue client : header logo seul + popup Excel (10/08/2026, poussé)

- **Header vue client (?s=) réduit au logo Prodi** (logo-full forcé, panda mobile
  masqué) + **bouton icône Excel seule** à droite = `#cart-btn` texte masqué
  (`.btn-panier-txt` display:none), toujours câblé sur `exportListExcelTest`.
  Masqués : `.rbar-count`, `.header-search-group`, `#album-wrap`, `#fab-wrap`,
  `#offre-wrap`, `#cart-clear-btn`, icônes mobiles (règles GLOBALES hors media
  queries, bloc « Header vue client ÉPURÉ » catalogue.css ~1204).
- **Popup Excel à l'ouverture** (`_excelPopup`, catalogue.js avant `_sharedRecap`) :
  après l'intro container (700ms) ou direct (400ms sans splash), gabarit
  `recap-card` — icône Excel + « Votre liste est prête » + bouton « Télécharger
  le Excel » (ferme après download), ✕/clic dehors pour passer. Traqueur
  `shared_excel_popup`. catalogue.css v731, catalogue.js v733.

## Plaquette flipbook /plaquette/ (13/08/2026)

Page autonome `plaquette/index.html` (+ `plaquette/img/`, 36 images ~4 Mo) :
plaquette commerciale 20 pages effet tourne-page (lib StPageFlip CDN),
inspirée du catalogue Pack N Pap mais rebrandée charte site (rouge #FE0000,
Bebas + DM Sans, épuré Apple). Couverture crème + texture papier
(feDiffuseLighting) + logo sortant d'une bande déchirée (clip-path), pages
intérieures blanches, grilles hairline, photos = tuiles Unsplash du site +
presse_internationale. Livre fermé recentré (translateX ±25% sur cover/dos).
Source de travail : ~/Code/prodi_plaquette (copie synchronisée à la main).
Reste à faire : vraies adresses/tél au dos, bouton Télécharger PDF.

## Menu OFFRE dynamique (13/08/2026, poussé)

`_offresData`/`buildPool` (catalogue.js ~2810) : plus de liste figée
`OFFRE_PRESETS` — le menu construit UNE offre par qualité **réellement en
stock** (codes distincts de `poolUnits`, libellés `QUALITE_LABELS`, forme =
lettre du code R*/S* + garde `_estFormat` inchangée). Seuil `OFFRE_MIN_TONS=5` :
sous 5 t la qualité n'apparaît pas (queues de stock RTIS/SENV/SPLA…).
Motif : ~670 t étaient invisibles (RLINER 125 t, RFLEX, RNEW, RLWC, SCUT,
RSIL, SSBS…). Toute nouvelle qualité entrant en stock apparaît seule.
Test : /tmp/cdp_offre_dyn.mjs (dump `_offresData()` headless). v734.

## Header catalogue ÉPURÉ — menu Outils (13/08/2026)

`catalogue/index.html` (bloc <style>+<script> inline après </header>) : Album
photo / Usine / Offre / Réf article-Max sont REPARENTÉS au chargement dans un
panneau déroulant unique ouvert par un bouton ICÔNE rond (lignes+chevron,
`#outils-btn`) à droite du header — il ne reste que le logo (+ Partager quand
une liste existe). Lignes plates avec filets, ids/handlers d'origine intacts
(toggleOffreMenu etc. marchent dans le panneau). TOUTES largeurs (mobile
compris) sauf vue client ?s=/share= (early return). Pièges réglés à coups de
!important ciblés : margin-left 32px de .header-search-group (css:832),
min-width intrinsèque des input number, pilules du bloc media mobile sur
#fab-btn/#offre-btn.

## Fix listes déroulantes filtres MOBILE (16/08/2026, poussé 6b9298d1)

Les `.msd-panel` (position:fixed, z 2000) du tiroir filtres téléphone
s'affichaient sous la page, invisibles : `#filter-drawer.open` gardait
`transform:translateY(0)`, et tout transform ≠ none fait du tiroir le
**containing block** des fixed à l'intérieur (coordonnées viewport de
toggleMsd appliquées relatives au tiroir + rognage par `.fd-body`
overflow-y:auto). Fix : `.open{transform:none}` (catalogue.css:801) — la
transition none⇄translateY(100%) s'anime toujours (none = identité).
Desktop jamais touché (msd dans la sidebar, pas d'ancêtre transformé).
catalogue.css?v=731→732. ⚠️ Ne jamais remettre un transform « au repos »
sur un conteneur de .msd-panel.

## Tag Google Ads (16/08/2026)

Balise gtag AW-18393110999 (compte Google Ads Prodi 574-605-3998, balise
GT-MKPCGLK9) posée en tête de `<head>` des 48 pages HTML. Les CSP (46
pages) autorisent googletagmanager.com + googleads.g.doubleclick.net +
googleadservices.com (script), googleads.g.doubleclick.net, google.com/
google.fr (img), stats.g.doubleclick.net + googleadservices.com +
ad.doubleclick.net (connect). ⚠️ 17/08 (commit 28fd9348) : la CSP initiale
BLOQUAIT googleadservices.com/ad.doubleclick.net (connect) et
googleads.g.doubleclick.net (script) → AUCUNE conversion ne remontait dans
Ads (diagnostic balise « Urgent » dans Gestionnaire de données) alors que
les événements partaient bien (site_events les traçait). Si on retouche la
CSP un jour, repasser par Outils → Gestionnaire de données → balise Prodi →
Qualité de la balise pour vérifier qu'aucune ressource n'est bloquée.

## Anti-bot formulaires vitrine (17/08/2026)

Réponse aux faux leads de la campagne Ads du 16/08 (humains pressés sur trafic
display + bots potentiels) :
- **`_leadValide(form,nom,tel)`** (vitrine.js) : ≥3 lettres Unicode au nom
  (l'arabe passe), tél 8-15 chiffres, rejet si un même chiffre fait >70 % du
  numéro (« 7788888 ») — erreur affichée en rouge `.lead-err` au-dessus du
  bouton (plus de rejet silencieux). Branchée sur submitContact/submitLead/
  submitRappel.
- **Indicatif par défaut `_ccDef`** = locale du navigateur (fr-DZ → +213,
  ar-MA → +212…), repli +33 — les numéros Maghreb ne ressortent plus en faux
  « +33 06… ».
- **Cloudflare Turnstile** version légère : widget `prodi-paper-forms`
  (sitekey `0x4AAAAAAESDAT4K4lA2WBBC`, publique par design ; domaines
  paper.prodi.com + localhost ; mode managed, appearance interaction-only =
  invisible sauf défi). vitrine.js injecte le script seulement si `TS_KEY`
  renseignée ET un formulaire présent ; `_tsOk(fid)` (async) ATTEND le jeton
  jusqu'à 6 s (« Vérification anti-robot… ») avant de refuser — un client qui
  soumet 1 s après le chargement patiente ~2 s puis part (testé), il n'est
  plus rejeté. ⚠️ PAS de vérif serveur : le jeton n'est contrôlé que côté
  navigateur — un POST direct sur Supabase passe encore. Le blindage complet
  = Edge Function Supabase qui vérifie le jeton (secret du widget HORS repo,
  voir mémoire privée) avant insert, à faire si le spam persiste.
- CSP des 46 pages : `script-src` + `frame-src https://challenges.cloudflare.com`.
- **Message obligatoire ≥15 caractères sur TOUS les formulaires** (17/08) :
  champs `l-msg` (popup, aussi sur /produits/) et `r-msg` (bandeau) ajoutés
  (`required minlength="15"` natif + garde `_leadValide` 4e arg) ; `f-msg`
  l'avait déjà. Les messages en base sont préfixés par l'origine : « Demande
  de rappel (popup) — … », « (bandeau) — … », « Demande WhatsApp — … ».
- **PORTE STOCK = POPUP LEAD, CAPTURE SEULE** (17/08) : `openStock()`
  (« Voir le stock », tuiles, nav) ouvre le popup lead au lieu de la porte à
  code — envoi = « Bien reçu, on vous rappelle », **PAS de redirection ni
  d'accès au catalogue** (correction Ethan : seul le code PRODI2026 fait
  entrer, via #stock-gate des autres pages ou la porte PWD du catalogue).
  Message en base « Demande stock — … », traqueurs `stock_gate_vue` +
  `contact_envoye {via:'stock'}`. Déjà envoyé cette session → le popup rouvre
  sur le « Bien reçu ». Pages SANS #lead-modal (pays, contact…) : repli
  ancienne porte à code #stock-gate, sinon navigation directe.
- **Nav « Catalogue »** (17/08) : 1er lien du hd-nav des 45 pages + menu
  mobile accueil (`id="nav-catalogue"`) → **`openCatalogue()` = porte à CODE
  historique** (#stock-gate : Code d'accès/Confirmer/« Pas encore client ? »)
  pour les clients qui ont PRODI2026 ; pages sans #stock-gate → /catalogue/
  direct (porte PWD). NE PAS confondre avec openStock (= porte LEAD des
  boutons « Voir le stock »/tuiles) — séparation voulue par Ethan.
- **Popup auto retardé 5 s → 20 s** (17/08, accueil après-hero et /produits/).
- **PORTAIL WHATSAPP** (17/08) : tout clic sur un lien wa.me ouvre le popup
  lead (listener délégué capture, `_waUrl` mémorise le lien, traqueur
  `wa_gate_vue`) ; la redirection WhatsApp part 1,1 s APRÈS l'envoi réussi.
  `sessionStorage lead_done` (posé par les 3 formulaires au succès) = accès
  WhatsApp DIRECT le reste de la session ; fermer le popup sans envoyer
  annule (`leadClose` remet `_waUrl=null`). Motif : 43 cliqueurs WP le 16/08,
  8 réellement engagés — taps réflexes transformés en vrais leads qualifiés.

## Page /merci/ (17/08/2026)

Page de remerciement autonome (HTML standalone, styles inline, DM Sans,
coche verte animée, logo, « Retour à l'accueil ») : TOUS les envois de
formulaires y redirigent ~1,2 s après le « Bien reçu » inline — popup
(modes stock/auto), bandeau, contact — SAUF le portail WhatsApp qui part
vers la conversation. `noindex,nofollow`, PAS dans le sitemap, gtag + CSP
standard + analytics.js (pageview). **But : conversion Google Ads par
visite de page** (à créer dans Ads : action « page vue /merci/ » — le
tracking le plus fiable, indépendant des événements JS).

## Page /confidentialite/ (16/08/2026)

Politique de confidentialité RGPD-lite (gabarit souspage, styles scoped
.leg-*) créée comme prérequis du FORMULAIRE DE LEAD Google Ads (URL de
politique obligatoire). Lien « Confidentialité » ajouté au ft2-bottom de
44 pages + sitemap (priority 0.3). Contenu : formulaires site + lead forms
Google, analytics maison, balise Google Ads, droits RGPD → contact@prodi.com.

## 17/08/2026 — formats resserrés + partage sobre (3637bdff, v735)

- `FORMAT_TOL` 50 → 20 mm (catalogue.js) : à ±50, la famille « 520 × 720 » avalait
  du 480×765 et du 555×750. Ne pas ré-élargir sans regarder les regroupements réels.
- `catalogue/index.html` : og:image + twitter:card SUPPRIMÉS volontairement — les
  liens clients `?s=` partagés sur WhatsApp affichaient une grosse carte logo,
  Ethan veut un aperçu texte seul. La vitrine garde ses cartes complètes.
- Bouton email vue client (`?s=`) : contact@prodi.com → ethan@prodi.com.

## Outil interne /invitation/ (17/08/2026)

Générateur d'invitations professionnelles (lettres visa clients) — page
autonome `invitation/` (index.html + template.docx + assets/ + vendor/),
source de travail `~/Code/prodi_invitation` (copie synchronisée à la main,
comme la plaquette). Formulaire une page (civilité/prénom/nom/société/
passeport + dates avec calendrier maison — le popup natif était minuscule),
boutons Word (docxtemplater+pizzip sur template.docx = modèle NDIAYE avec
placeholders, logo+tampon intacts) et PDF (jsPDF vectoriel, géométrie calquée
sur le Word). Historique localStorage `invitations_histo` (30 entrées, clic =
recharge). Signataire figé « Véronique ELBILIA / Directrice Commercial »
(orthographe voulue), 3 conteneurs/mois en dur. **Porte à code = copie de
celle du catalogue, MÊME clé `prodi_cat_ok`** (déverrouillé une fois =
partout) — PWD `PRODI2026`, désormais 3 constantes à changer ensemble
(vitrine.js, catalogue/index.html, invitation/index.html). `noindex` +
Disallow robots.txt (outil interne, hors sitemap).
