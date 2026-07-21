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
