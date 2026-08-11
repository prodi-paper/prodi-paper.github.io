#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Génère les sous-pages SEO par qualité (derrière les tuiles). Contenu unique
par page, même gabarit que les pages pays (souspage). Idempotent : réécrit."""
import os, html

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
CSS_V = "309"; JS_V = "155"

STYLE = """.geopage{padding-top:64px;}
.geopage .sec-inner{padding-top:14px;padding-bottom:56px;}
.gp-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(258px,1fr));gap:18px;margin-top:6px;}
.gp-card{border:1px solid var(--border,#e8e8e4);border-radius:20px;padding:24px 26px;background:var(--white,#fff);box-shadow:var(--sh-sm,0 1px 2px rgba(0,0,0,.04));}
.gp-card h3{font-family:'DM Sans',sans-serif;font-size:18px;font-weight:700;color:var(--ink,#222);margin:0 0 10px;}
.gp-card p{font-size:14.5px;line-height:1.6;color:var(--g1,#515154);margin:0 0 8px;}
.gp-chips{display:flex;flex-wrap:wrap;gap:8px;margin-top:10px;}
.gp-chip{font-size:13px;font-weight:600;color:var(--ink,#222);background:var(--off,#f5f5f3);border:1px solid var(--border,#e8e8e4);border-radius:999px;padding:6px 13px;}
.gp-faq{max-width:820px;margin-top:4px;}
.gp-faq details{border-bottom:1px solid var(--hairline,#e0e0e5);}
.gp-faq summary{font-family:'DM Sans',sans-serif;font-size:16px;font-weight:600;color:var(--ink,#222);padding:18px 0;cursor:pointer;list-style:none;display:flex;justify-content:space-between;align-items:center;gap:16px;}
.gp-faq summary::-webkit-details-marker{display:none;}
.gp-faq summary::after{content:'+';font-size:22px;color:var(--g3,#86868b);font-weight:400;line-height:1;}
.gp-faq details[open] summary::after{content:'–';}
.gp-faq details p{font-size:14.5px;line-height:1.65;color:var(--g1,#515154);margin:-2px 0 18px;max-width:760px;}
.gp-cta{text-align:center;padding:52px 24px 8px;}
.gp-cta h2{font-family:'Bebas Neue',sans-serif;font-size:clamp(30px,5vw,46px);color:var(--ink,#222);margin:0 0 10px;letter-spacing:.5px;}
.gp-cta p{font-size:15px;color:var(--g2,#6e6e73);margin:0 auto 22px;max-width:520px;}
.gp-wa{display:inline-flex;align-items:center;gap:8px;background:#25D366;color:#fff;font-family:'DM Sans',sans-serif;font-weight:700;font-size:14.5px;text-decoration:none;padding:12px 22px;border-radius:999px;}
.gp-links{margin-top:34px;font-size:13.5px;color:var(--g2,#6e6e73);}
.gp-links a{color:var(--ink,#222);font-weight:600;text-decoration:none;}
.gp-links a:hover{text-decoration:underline;}"""

WA_SVG = ('<svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">'
 '<path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 0 1-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 0 1-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 0 1 2.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0 0 12.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 0 0 5.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 0 0-3.48-8.413z"/></svg>')
WA_SVG_BIG = WA_SVG.replace('width="18" height="18"', 'width="26" height="26"')

# slug -> contenu
PAGES = {
 "offset": {
  "t": "Papier offset", "code": "ROFF",
  "title": "Papier offset en bobines et formats — Fournisseur | Prodiconseil",
  "desc": "Fournisseur de papier offset : blanc d'impression du livre à la notice, blancheurs CIE 120 à 170, bobines et formats. Stock permanent, devis sous 24 h.",
  "sub": "Le blanc de référence de l'impression — livre, notice, labeur, édition — en bobines et en formats, disponible en stock.",
  "lead": "Le papier offset est le papier d'impression le plus courant : non couché, il reçoit parfaitement l'encre en offset comme en numérique. Prodiconseil tient en stock permanent une large gamme d'offset blanc, du papier bouffant léger de l'édition au bristol rigide, en bobines comme en formats.",
  "para": "Nos offsets couvrent toutes les blancheurs, du blanc courant aux blancs les plus lumineux (CIE 120 à 170), en finitions notice, satiné ou rugueux. Idéal pour le livre, la notice pharmaceutique, l'enveloppe, le labeur et l'édition — avec des volumes disponibles immédiatement, sans attendre une fabrication.",
  "cards": [
   ("Usages", "Le papier de l'imprimeur au quotidien.",
    ["Livre & édition","Notice pharmaceutique","Enveloppe","Labeur & administratif","Bloc & cahier"]),
   ("Grammages & blancheurs", "Du léger de l'édition au bristol.",
    ["Bouffant","60 à 300 g","Blancheur CIE 120–170","Notice / satiné / rugueux"]),
   ("Formats & conditionnement", "Bobines pour la rotative, formats pour la feuille.",
    ["Bobines toutes laizes","Formats standards","Palettes complètes","Découpe sur demande"]),
  ],
  "faq": [
   ("Quelle est la différence entre offset et couché ?","L'offset est un papier non couché : sa surface est mate et absorbante, idéale pour le texte, le livre et la notice. Le couché reçoit une couche minérale qui le rend lisse et brillant, pour les images et les magazines. On choisit l'offset pour la lisibilité et l'écriture, le couché pour le rendu photo."),
   ("Quels grammages de papier offset avez-vous en stock ?","Nous couvrons toute la gamme, du bouffant léger de l'édition (autour de 60–70 g) jusqu'aux forts grammages et bristols (jusqu'à 300 g), en passant par les grammages courants 80/90/100 g. Dites-nous votre grammage et votre laize, on vérifie la disponibilité immédiate."),
   ("Offset en bobine ou en format ?","Les deux. Nous proposons l'offset en bobines (pour les rotatives et la transformation) et en formats/palettes (pour l'impression feuille à feuille). La découpe à un format précis est possible sur demande."),
   ("Sous quel délai puis-je être livré ?","La plupart de nos offsets sont en stock : l'expédition part sous quelques jours dès l'offre validée. C'est notre principal avantage face à une commande usine qui demande souvent plusieurs semaines de fabrication."),
  ],
  "wa": "Bonjour, je souhaite une offre pour du papier offset.",
 },
 "kraft": {
  "t": "Papier kraft", "code": "RKRABRUN",
  "title": "Papier kraft brun en bobines et formats — Fournisseur | Prodiconseil",
  "desc": "Fournisseur de papier kraft : brun d'emballage, du 100 % recyclé à la pure pâte, finitions MG et MF, bobines et formats. Stock permanent, devis sous 24 h.",
  "sub": "Le naturel résistant de l'emballage, du sac et de l'enveloppe — en bobines et en formats, disponible en stock.",
  "lead": "Le papier kraft est le papier d'emballage par excellence : sa fibre longue lui donne une grande résistance à la déchirure et à l'éclatement. Prodiconseil tient en stock une gamme complète de krafts bruns, du 100 % recyclé économique à la pure pâte la plus solide.",
  "para": "Nos krafts existent en finition frictionnée (MG, une face lisse brillante) ou machine (MF), en bobines toutes laizes comme en formats. Ils servent au sac, à l'enveloppe, au calage, à la protection et à la transformation d'emballage. Le brun de l'emballage sous toutes ses formes, disponible immédiatement.",
  "cards": [
   ("Usages", "L'emballage résistant et naturel.",
    ["Sacs & pochettes","Enveloppes","Calage & protection","Emballage alimentaire","Transformation"]),
   ("Gammes & finitions", "Du recyclé économique à la pure pâte.",
    ["100 % recyclé","Pure pâte","Frictionné MG","Machine MF","Krafts spéciaux"]),
   ("Formats & conditionnement", "Bobines pour la transformation, formats pour la feuille.",
    ["Bobines toutes laizes","Formats standards","Palettes complètes","Grammages variés"]),
  ],
  "faq": [
   ("Quelle est la différence entre kraft MG et MF ?","Le kraft MG (frictionné, « Machine Glazed ») a une face lisse et brillante et une face plus rugueuse — parfait pour l'impression et le sac. Le kraft MF (« Machine Finished ») est régulier sur ses deux faces. Le choix dépend de votre usage : impression et présentation pour le MG, résistance et calage pour le MF."),
   ("Proposez-vous du kraft recyclé et du kraft pure pâte ?","Oui. Le kraft 100 % recyclé est économique et écologique, idéal pour le calage et l'emballage secondaire. Le kraft pure pâte (fibre vierge) offre la meilleure résistance et un brun plus régulier, pour le sac et l'emballage exigeant."),
   ("Le papier kraft est-il disponible en bobines ?","Oui, en bobines toutes laizes pour la transformation (sacs, enveloppes, complexage) comme en formats pour la découpe. Indiquez-nous votre laize et votre grammage."),
   ("Sous quel délai livrez-vous le kraft ?","Nos krafts courants sont en stock permanent : expédition sous quelques jours dès validation de l'offre, sans attendre de fabrication."),
  ],
  "wa": "Bonjour, je souhaite une offre pour du papier kraft.",
 },
 "papier-couche": {
  "t": "Papier couché", "code": "R2SC",
  "title": "Papier couché brillant, mat, demi-mat — Fournisseur | Prodiconseil",
  "desc": "Fournisseur de papier couché : brillant, demi-mat et mat pour magazines, catalogues et brochures. Une et deux faces, bobines et formats. Stock, devis 24 h.",
  "sub": "Le papier des magazines, catalogues et brochures — brillant, demi-mat ou mat, en bobines et en formats.",
  "lead": "Le papier couché reçoit une couche minérale (le couchage) qui lisse sa surface et lui donne un rendu net des images et des couleurs. Prodiconseil tient en stock du couché brillant, demi-mat et mat, une et deux faces, pour tous les travaux d'impression soignée.",
  "para": "Du magazine au catalogue, de la brochure au dépliant, le couché offre une excellente restitution photo. Nous proposons également des séries recyclées. Disponible en bobines pour la rotative et en formats pour l'impression feuille, avec des stocks immédiatement mobilisables.",
  "cards": [
   ("Usages", "L'impression soignée et l'image.",
    ["Magazines","Catalogues","Brochures","Dépliants & flyers","Couvertures"]),
   ("Finitions & grammages", "Du brillant au mat, en 1 ou 2 faces.",
    ["Brillant","Demi-mat","Mat","1 face / 2 faces","Séries recyclées"]),
   ("Formats & conditionnement", "Bobines pour la rotative, formats pour la feuille.",
    ["Bobines toutes laizes","Formats standards","Palettes complètes","Découpe sur demande"]),
  ],
  "faq": [
   ("Couché brillant, demi-mat ou mat : lequel choisir ?","Le brillant maximise l'éclat des couleurs et le contraste, parfait pour la photo et le packaging. Le mat offre un rendu élégant et une lecture confortable, sans reflets. Le demi-mat (satiné) est le compromis le plus polyvalent. On vous conseille selon votre projet."),
   ("Quelle différence entre couché une face et deux faces ?","Le couché deux faces est imprimable et lisse des deux côtés (magazine, catalogue). Le couché une face n'est traité que d'un côté — utilisé pour les étiquettes, les affiches collées ou l'emballage où le verso n'est pas visible."),
   ("Avez-vous du couché recyclé ?","Oui, nous tenons des séries de couché recyclé selon disponibilité. Indiquez-nous votre grammage et vos volumes."),
   ("Couché en bobine ou en format ?","Les deux : bobines pour l'impression rotative et la transformation, formats et palettes pour l'impression feuille à feuille. Découpe possible sur demande."),
  ],
  "wa": "Bonjour, je souhaite une offre pour du papier couché.",
 },
 "carton-couche": {
  "t": "Carton couché", "code": "RBOA",
  "title": "Carton couché GC1, GC2, GD, GT — Fournisseur | Prodiconseil",
  "desc": "Fournisseur de carton couché pour boîte pliante et packaging : GC1/GC2 dos blanc ou crème, GD2 dos gris, GT4/CKB dos kraft, face aluminium. Stock, devis 24 h.",
  "sub": "Le carton du packaging et de la belle boîte — GC, GD, GT et faces spéciales, en bobines et en formats.",
  "lead": "Le carton couché est le support de la boîte pliante et du packaging premium. Sa face couchée reçoit une impression nette ; son dos (blanc, crème, gris ou kraft) et son grammage se choisissent selon l'usage. Prodiconseil tient en stock les principales familles.",
  "para": "GC1 et GC2 (dos blanc ou crème) pour le packaging haut de gamme, GD2 (dos gris, à base de fibres recyclées) pour la boîte économique, GT4 et CKB (dos kraft) pour le naturel et l'alimentaire. Nous proposons aussi des faces aluminium pour l'emballage alimentaire. En bobines et en formats, disponibles immédiatement.",
  "cards": [
   ("Usages", "La boîte pliante et le packaging.",
    ["Boîte pliante","Packaging premium","Emballage alimentaire","PLV & cartonnage","Étuis"]),
   ("Familles de carton", "Le dos et la face selon l'usage.",
    ["GC1 / GC2 dos blanc/crème","GD2 dos gris","GT4 & CKB dos kraft","Face aluminium"]),
   ("Formats & conditionnement", "Bobines et formats, forts grammages.",
    ["Bobines toutes laizes","Formats standards","Palettes complètes","Grammages carton"]),
  ],
  "faq": [
   ("Que signifient GC, GD, GT pour un carton ?","Ce sont les familles normalisées de carton couché. GC = carton à base de fibres vierges (dos blanc GC1 ou crème GC2), pour le premium. GD = à base de fibres recyclées (dos gris), plus économique. GT = dos kraft, aspect naturel. Le chiffre précise la finition et le dos."),
   ("Quel carton pour l'emballage alimentaire ?","Selon le contact : les cartons à dos kraft (GT/CKB) et les faces aluminium conviennent à de nombreux emballages alimentaires. Nous vous orientons vers la référence adaptée à votre application et à vos exigences de contact."),
   ("Quels grammages de carton proposez-vous ?","Une large plage de grammages carton, du léger de l'étui au fort grammage de la boîte rigide. Indiquez-nous votre application et votre format, on vérifie le stock."),
   ("Carton en bobine ou en format ?","Les deux : bobines pour la transformation et la découpe, formats et palettes pour l'impression et la fabrication de boîtes."),
  ],
  "wa": "Bonjour, je souhaite une offre pour du carton couché.",
 },
 "papier-creations": {
  "t": "Papier créations", "code": "RLUX",
  "title": "Papiers de création : calque, vergé, martelé, sécurité | Prodiconseil",
  "desc": "Papiers de caractère : calque, vergé blanc ou ivoire, martelé, chromolux une face, papiers sécurité (fibres invisibles, filigranés). Bobines et formats, devis 24 h.",
  "sub": "Papiers de caractère — teintes, textures et finitions — pour l'édition de prestige, l'invitation et le document sécurisé.",
  "lead": "Au-delà des papiers courants, Prodiconseil propose une sélection de papiers de création : des supports texturés, teintés ou techniques qui donnent du caractère à un imprimé. Idéal pour l'édition de prestige, l'invitation, la carte de visite et le document officiel.",
  "para": "Calque translucide, vergé blanc ou ivoire à la texture nervurée, martelé au relief marqué, chromolux une face au brillant miroir, et papiers sécurité (fibres invisibles, filigranes) pour les documents à protéger. Des papiers de caractère disponibles en bobines comme en formats.",
  "cards": [
   ("Usages", "Le prestige et le document technique.",
    ["Édition de prestige","Invitation & faire-part","Carte de visite","Document sécurisé","Couverture"]),
   ("Gamme de créations", "Des textures et finitions marquées.",
    ["Calque","Vergé blanc / ivoire","Martelé","Chromolux 1 face","Papiers sécurité"]),
   ("Formats & conditionnement", "Bobines et formats selon la série.",
    ["Bobines","Formats standards","Teintes variées","Petites séries possibles"]),
  ],
  "faq": [
   ("Qu'est-ce qu'un papier vergé ?","Le vergé est un papier à la texture nervurée, marquée de fines lignes parallèles (les vergeures) issues de la fabrication. Élégant et traditionnel, il est prisé pour la papeterie de prestige, l'invitation et le courrier haut de gamme. Nous le proposons en blanc et en ivoire."),
   ("Qu'est-ce qu'un papier sécurité ?","C'est un papier intégrant des éléments anti-copie et anti-falsification : fibres invisibles visibles sous UV, filigranes, réactions chimiques. Il sert aux documents officiels, diplômes, chèques et titres à protéger. Nous en tenons selon disponibilité."),
   ("Le chromolux, qu'est-ce que c'est ?","Le chromolux est un papier couché une face à très haut brillant, effet miroir, sur une face lisse comme un vernis. Utilisé pour l'étiquette de luxe, la couverture et le cartonnage haut de gamme."),
   ("Proposez-vous des petites séries ?","Sur ces papiers de caractère, les volumes sont souvent plus réduits que sur les papiers courants. Indiquez-nous votre besoin exact : nous vérifions le stock et vous proposons la meilleure option."),
  ],
  "wa": "Bonjour, je souhaite une offre pour des papiers de création.",
 },
 "autocopiant": {
  "t": "Autocopiant", "code": "RCAR",
  "title": "Papier autocopiant CB CFB CF — liasses | Prodiconseil",
  "desc": "Fournisseur de papier autocopiant (sans carbone) : feuillets CB, CFB et CF, rames prêtes à assembler en liasses, séries impression digitale. Bobines et formats, devis 24 h.",
  "sub": "Le papier sans carbone des liasses et des carnets à souches — feuillets CB, CFB et CF, en bobines et en formats.",
  "lead": "Le papier autocopiant (ou papier NCR, « sans carbone ») transfère l'écriture d'un feuillet au suivant par simple pression, sans papier carbone. Prodiconseil tient en stock les trois feuillets qui composent une liasse, prêts à assembler.",
  "para": "CB (le feuillet du dessus, qui reçoit l'écriture), CFB (les feuillets intermédiaires) et CF (le dernier feuillet). Assemblés, ils forment le bon de commande, la facture, le bon de livraison ou le carnet à souches. Nous proposons aussi des séries adaptées à l'impression digitale, en rames comme en bobines.",
  "cards": [
   ("Usages", "La liasse commerciale et administrative.",
    ["Bon de commande","Facture & devis","Bon de livraison","Carnet à souches","Reçu"]),
   ("Les feuillets", "Trois positions dans la liasse.",
    ["CB — dessus","CFB — intermédiaire","CF — dessous","Séries digitales"]),
   ("Formats & conditionnement", "Rames prêtes à assembler, ou bobines.",
    ["Rames","Bobines","Teintes de feuillets","Grammages autocopiant"]),
  ],
  "faq": [
   ("Que veulent dire CB, CFB et CF ?","Ce sont les trois types de feuillets d'une liasse autocopiante. CB (Coated Back) = le feuillet du dessus, couché au dos. CFB (Coated Front & Back) = les feuillets intermédiaires, couchés recto-verso. CF (Coated Front) = le dernier feuillet, couché au recto. On les empile CB + (CFB…) + CF pour obtenir une liasse à 2, 3, 4 exemplaires ou plus."),
   ("L'autocopiant fonctionne-t-il sans papier carbone ?","Oui, c'est tout l'intérêt : la pression du stylo ou de l'imprimante suffit à reporter l'écriture d'un feuillet au suivant, grâce aux micro-capsules du couchage. Plus besoin de carbone intercalaire."),
   ("Peut-on imprimer l'autocopiant en digital ?","Oui, il existe des séries d'autocopiant conçues pour l'impression numérique/laser en plus de l'offset traditionnel. Précisez votre mode d'impression, nous orientons vers la bonne série."),
   ("Le vendez-vous en rames ou en bobines ?","Les deux : en rames de feuillets prêtes à assembler en liasses, et en bobines pour la transformation en continu. Indiquez-nous le nombre d'exemplaires par liasse et vos volumes."),
  ],
  "wa": "Bonjour, je souhaite une offre pour du papier autocopiant.",
 },
 "offset-couleur": {
  "t": "Offset couleur", "code": "COL",
  "title": "Papier offset couleur teinté dans la masse — Fournisseur | Prodiconseil",
  "desc": "Fournisseur de papier offset couleur teinté dans la masse : chemises, intercalaires, dépliants, administratif coloré. Teintes vives et pastel, bobines et formats. Devis 24 h.",
  "sub": "L'offset teinté dans la masse — la couleur jusqu'au cœur de la feuille — pour la chemise, l'intercalaire et le document qui se remarque.",
  "lead": "L'offset couleur est un papier teinté dans la masse : la couleur traverse toute l'épaisseur de la feuille, pas seulement sa surface. Prodiconseil tient en stock une gamme de teintes, du pastel doux aux couleurs vives, en bobines comme en formats.",
  "para": "On l'utilise pour les chemises et sous-chemises, les intercalaires, les dépliants, la PLV, le document administratif à code couleur et tout imprimé qui doit se distinguer. Les tranches restent colorées, un atout pour le classement et la signalétique.",
  "cards": [
   ("Usages", "Le papier qui met de la couleur.",
    ["Chemises & sous-chemises","Intercalaires","Dépliants & PLV","Administratif couleur","Signalétique"]),
   ("Teintes & grammages", "Du pastel aux couleurs franches.",
    ["Teintes pastel","Couleurs vives","Teinté dans la masse","80 à 160 g"]),
   ("Formats & conditionnement", "Bobines et formats selon la teinte.",
    ["Bobines","Formats standards","Palettes","Découpe sur demande"]),
  ],
  "faq": [
   ("Qu'est-ce qu'un papier teinté dans la masse ?","C'est un papier dont la pâte est colorée avant la fabrication : la teinte est présente dans toute l'épaisseur, y compris sur la tranche. À l'inverse d'un papier simplement imprimé en aplat, il ne montre pas de blanc à la coupe — idéal pour les chemises et les intercalaires."),
   ("Quelles teintes proposez-vous ?","Une palette de pastels et de couleurs vives selon disponibilité. Indiquez-nous la teinte recherchée (ou une référence), le grammage et vos volumes : nous vérifions le stock."),
   ("Offset couleur en bobine ou en format ?","Les deux, selon la teinte et le grammage. Formats et palettes pour l'impression feuille, bobines pour la transformation."),
   ("Sous quel délai livrez-vous ?","Les teintes courantes sont en stock : expédition sous quelques jours dès l'offre validée."),
  ],
  "wa": "Bonjour, je souhaite une offre pour du papier offset couleur.",
 },
 "bouffant": {
  "t": "Bouffant", "code": "BOU",
  "title": "Papier bouffant d'édition (fort volume, main élevée) | Prodiconseil",
  "desc": "Fournisseur de papier bouffant pour l'édition : léger mais épais, forte main, opacité élevée — roman, livre, poche. Bobines et formats. Stock permanent, devis 24 h.",
  "sub": "Le papier de l'édition — léger sur la balance, épais sous les doigts — pour le roman, le livre et le beau feuilletage.",
  "lead": "Le papier bouffant a une « main » élevée : il est épais et volumineux pour un faible grammage. Un livre gagne ainsi en épaisseur et en confort de lecture sans s'alourdir. Prodiconseil en tient pour l'édition, en bobines et en formats.",
  "para": "Opacité élevée, toucher agréable, teinte souvent ivoire reposante pour l'œil : le bouffant est le papier du roman, du livre de poche et de l'édition courante. Sa main permet un dos épais avec peu de pages et un poids d'expédition maîtrisé.",
  "cards": [
   ("Usages", "Le papier du livre et du roman.",
    ["Roman & littérature","Livre de poche","Édition courante","Beau livre","Cahier"]),
   ("Caractéristiques", "Épais, léger, opaque.",
    ["Forte main (volume)","Opacité élevée","Teinte ivoire","Grammages édition"]),
   ("Formats & conditionnement", "Bobines pour la rotative, formats pour la feuille.",
    ["Bobines","Formats standards","Palettes","Découpe sur demande"]),
  ],
  "faq": [
   ("Qu'est-ce que la « main » d'un papier ?","La main est le rapport entre l'épaisseur et le grammage : un papier à forte main est épais pour un poids donné. Un bouffant de 70 g peut être aussi épais qu'un offset de 90 g. C'est ce qui donne du volume à un livre sans l'alourdir."),
   ("Pourquoi choisir du bouffant pour un livre ?","Pour l'épaisseur du dos (un livre fin paraît plus consistant), le confort de lecture (opacité, teinte ivoire douce) et le poids d'expédition réduit. C'est le standard de l'édition littéraire."),
   ("Quels grammages de bouffant proposez-vous ?","Les grammages courants de l'édition, avec différentes mains (volumes). Précisez le volume souhaité (ex. 1,6 ou 2,0) et le grammage, on vous oriente."),
   ("Disponible en bobines ?","Oui, en bobines pour l'impression rotative et en formats pour la feuille."),
  ],
  "wa": "Bonjour, je souhaite une offre pour du papier bouffant.",
 },
 "papier-adhesif": {
  "t": "Adhésif", "code": "ADH",
  "title": "Papier adhésif pour étiquettes (permanent, repositionnable) | Prodiconseil",
  "desc": "Fournisseur de papier adhésif / auto-adhésif pour étiquettes : face couché ou vélin, adhésif permanent ou repositionnable, dorsal siliconé. Bobines et planches. Devis 24 h.",
  "sub": "Le papier auto-adhésif de l'étiquette — face papier, adhésif, dorsal siliconé — en bobines et en planches.",
  "lead": "Le papier adhésif (ou auto-adhésif) est un complexe en trois couches : une face papier imprimable, une couche d'adhésif et un dorsal siliconé qui se retire à la pose. Prodiconseil en propose pour l'étiquette et la signalétique.",
  "para": "La face peut être couchée (brillante ou mate) ou vélin ; l'adhésif permanent ou repositionnable selon l'usage. On l'utilise pour l'étiquette produit, le prix, la logistique, la signalétique et le packaging. Disponible en bobines pour l'étiqueteuse et en planches pour l'impression feuille.",
  "cards": [
   ("Usages", "L'étiquette et la signalétique.",
    ["Étiquette produit","Étiquette logistique","Signalétique","Packaging","Promotion"]),
   ("Faces & adhésifs", "La face et la colle selon l'usage.",
    ["Face couché brillant/mat","Face vélin","Adhésif permanent","Adhésif repositionnable"]),
   ("Formats & conditionnement", "Bobines pour l'étiqueteuse, planches pour la feuille.",
    ["Bobines","Planches / formats","Dorsal siliconé","Mandrins standards"]),
  ],
  "faq": [
   ("Adhésif permanent ou repositionnable : lequel choisir ?","Le permanent tient définitivement (étiquette produit, logistique). Le repositionnable se décolle proprement et se repose (promotion, note, étiquette temporaire). Le choix dépend de la durée de vie souhaitée de l'étiquette."),
   ("Quelle face pour mon étiquette ?","Couché brillant pour des couleurs éclatantes, couché mat pour un rendu élégant, vélin pour un aspect naturel et l'écriture. On vous oriente selon votre impression et votre visuel."),
   ("Adhésif en bobine ou en planche ?","En bobines pour les étiqueteuses automatiques, en planches/formats pour l'impression feuille à feuille. Précisez votre matériel."),
   ("Sous quel délai livrez-vous ?","Les séries courantes sont en stock : expédition sous quelques jours dès l'offre validée."),
  ],
  "wa": "Bonjour, je souhaite une offre pour du papier adhésif.",
 },
 "ramette": {
  "t": "Ramette", "code": "CUT",
  "title": "Papier ramette A4 A3 pour reprographie et bureautique | Prodiconseil",
  "desc": "Fournisseur de papier ramette : formats bureautiques A4, A3, SRA3 pour reprographie, laser et jet d'encre. Blancheur, palettes complètes. Stock, devis sous 24 h.",
  "sub": "Le papier de reprographie prêt à l'emploi — A4, A3, formats bureautiques — en ramettes et en palettes.",
  "lead": "La ramette, c'est le papier bureautique en formats standards, prêt pour le photocopieur, l'imprimante laser ou jet d'encre. Prodiconseil en propose en volumes, du carton de ramettes à la palette complète.",
  "para": "Formats A4, A3 et SRA3, blancheur soignée pour un rendu net, grammage 80 g courant (et autres sur demande). Idéal pour l'imprimeur, le reprographe, l'administration, l'école et l'entreprise. Livré en palettes complètes pour les gros consommateurs.",
  "cards": [
   ("Usages", "Le papier du bureau et de la reprographie.",
    ["Photocopie","Impression laser","Jet d'encre","Administration & école","Reprographie"]),
   ("Formats & grammages", "Les standards bureautiques.",
    ["A4","A3","SRA3","80 g (et +)"]),
   ("Conditionnement", "De la ramette à la palette.",
    ["Ramettes","Cartons","Palettes complètes","Blancheur soignée"]),
  ],
  "faq": [
   ("Quels formats de ramette proposez-vous ?","Les formats bureautiques standards A4 et A3, ainsi que le SRA3 pour l'impression numérique. D'autres formats sont possibles sur demande."),
   ("En quel grammage ?","Le 80 g est le standard de la reprographie ; nous proposons aussi d'autres grammages selon les besoins (papier plus épais pour les couvertures, plus fin pour l'économie)."),
   ("Vendez-vous à la palette ?","Oui, en palettes complètes pour les imprimeurs, reprographes et gros consommateurs, comme au carton de ramettes."),
   ("Sous quel délai livrez-vous ?","Le papier ramette courant est en stock : expédition rapide dès l'offre validée."),
  ],
  "wa": "Bonjour, je souhaite une offre pour du papier ramette.",
 },
 "liner-testliner": {
  "t": "Liner et testliner", "code": "LINER",
  "title": "Kraftliner et testliner pour carton ondulé — Fournisseur | Prodiconseil",
  "desc": "Fournisseur de liner et testliner pour carton ondulé : kraftliner fibre vierge et testliner recyclé, couvertures pour l'onduleur. Bobines toutes laizes. Stock, devis 24 h.",
  "sub": "Les papiers de couverture du carton ondulé — kraftliner et testliner — en bobines pour l'onduleur.",
  "lead": "Le liner est le papier de couverture (les faces extérieures) du carton ondulé. Prodiconseil fournit le kraftliner (fibre vierge, brun, très résistant) et le testliner (à base de fibres recyclées), en bobines pour l'onduleur.",
  "para": "Ces papiers, associés à la cannelure, composent la caisse américaine et la plaque de carton ondulé. Le kraftliner offre la meilleure résistance et un aspect brun homogène ; le testliner est l'alternative recyclée économique. Disponibles en bobines toutes laizes.",
  "cards": [
   ("Usages", "La couverture du carton ondulé.",
    ["Caisse américaine","Plaque ondulée","Emballage industriel","Calage rigide","Transformation"]),
   ("Kraftliner & testliner", "Fibre vierge ou recyclée.",
    ["Kraftliner (vierge)","Testliner (recyclé)","Brun homogène","Grammages 100–200 g"]),
   ("Formats & conditionnement", "En bobines pour l'onduleur.",
    ["Bobines toutes laizes","Mandrins standards","Fortes résistances","Volumes industriels"]),
  ],
  "faq": [
   ("Quelle différence entre kraftliner et testliner ?","Le kraftliner est fabriqué en fibres vierges (kraft) : il est le plus résistant et présente un beau brun régulier. Le testliner est fait de fibres recyclées : plus économique, il convient à de nombreux emballages standards. Le choix dépend de la résistance et du budget."),
   ("À quoi sert le liner ?","C'est la face plane extérieure du carton ondulé. Collé de part et d'autre de la cannelure, il donne au carton sa rigidité et sa surface imprimable. On parle de simple, double ou triple cannelure selon le nombre de couches."),
   ("Quels grammages proposez-vous ?","Les grammages courants du liner, généralement de 100 à 200 g selon la résistance recherchée. Indiquez-nous votre laize et votre grammage."),
   ("Disponible en bobines ?","Oui, exclusivement en bobines toutes laizes pour l'alimentation des onduleurs."),
  ],
  "wa": "Bonjour, je souhaite une offre pour du liner / testliner.",
 },
 "complexe-pe": {
  "t": "Complexe / PE", "code": "FLEX",
  "title": "Papier couché PE et complexé (barrière, alimentaire) | Prodiconseil",
  "desc": "Fournisseur de papier couché PE et complexé : barrière à l'humidité et à la graisse, thermosoudable, pour l'emballage alimentaire, sachets et gobelets. Bobines. Devis 24 h.",
  "sub": "Le papier enduit de polyéthylène (PE) — barrière et thermosoudable — pour l'emballage alimentaire et les sachets.",
  "lead": "Le papier couché PE (ou complexé) reçoit un film de polyéthylène qui lui apporte une barrière à l'humidité et à la graisse, ainsi que la thermosoudabilité. Prodiconseil en propose pour l'emballage alimentaire et la transformation souple.",
  "para": "On l'utilise pour le sachet alimentaire, le papier de gobelet, l'emballage barrière et le complexe souple. Le PE peut être sur une ou deux faces selon la protection recherchée. Disponible en bobines pour la transformation.",
  "cards": [
   ("Usages", "L'emballage barrière et alimentaire.",
    ["Sachet alimentaire","Papier gobelet","Emballage barrière","Complexe souple","Protection graisse"]),
   ("Caractéristiques", "La barrière et la soudure.",
    ["Enduction PE","1 ou 2 faces","Thermosoudable","Anti-humidité & graisse"]),
   ("Formats & conditionnement", "En bobines pour la transformation.",
    ["Bobines toutes laizes","Mandrins standards","Grammages variés","Volumes industriels"]),
  ],
  "faq": [
   ("Qu'apporte l'enduction PE au papier ?","Le film de polyéthylène rend le papier étanche à l'humidité et résistant à la graisse, et le rend thermosoudable (on peut le sceller à chaud). C'est ce qui permet d'en faire des sachets et des emballages alimentaires."),
   ("PE une face ou deux faces ?","Une face suffit pour une barrière côté produit et une face imprimable à l'extérieur. Deux faces apportent une protection intégrale. On choisit selon le contenu et le mode de fermeture."),
   ("Convient-il au contact alimentaire ?","De nombreux papiers PE sont conçus pour l'emballage alimentaire. Nous vous orientons vers la référence adaptée à votre application et à vos exigences."),
   ("Disponible en bobines ?","Oui, en bobines toutes laizes pour la transformation en sachets, gobelets et complexes."),
  ],
  "wa": "Bonjour, je souhaite une offre pour du papier couché PE / complexé.",
 },
}

ORDER = ["offset","kraft","papier-couche","carton-couche","papier-creations","autocopiant",
         "offset-couleur","bouffant","papier-adhesif","ramette","liner-testliner","complexe-pe"]

def chips(items):
    return "".join('\n            <span class="gp-chip">'+html.escape(x)+'</span>' for x in items)

def build(slug, c):
    url = "https://paper.prodi.com/"+slug+"/"
    t = c["t"]
    # cross-links vers les autres qualités
    others = [(s, PAGES[s]["t"]) for s in ORDER if s != slug]
    xlinks = " · ".join('<a href="/'+s+'/">'+html.escape(nm)+'</a>' for s, nm in others)
    # FAQ JSON-LD
    faq_json = ",\n    ".join(
        '{"@type": "Question", "name": '+_j(q)+', "acceptedAnswer": {"@type": "Answer", "text": '+_j(a)+'}}'
        for q, a in c["faq"])
    # FAQ HTML
    faq_html = "\n".join(
        '        <details>\n          <summary>'+html.escape(q)+'</summary>\n          <p>'+html.escape(a)+'</p>\n        </details>'
        for q, a in c["faq"])
    # cards HTML
    cards_html = ""
    for h3, p, ch in c["cards"]:
        cards_html += ('\n        <div class="gp-card">\n          <h3>'+html.escape(h3)+'</h3>\n          <p>'+html.escape(p)+'</p>\n          <div class="gp-chips">'+chips(ch)+'\n          </div>\n        </div>')
    wa_url = "https://wa.me/33649754915?text="+_u("Bonjour Ethan,\nJe voudrais recevoir une offre pour du papier / carton.\nMerci")
    return TEMPLATE.replace("@@TITLE@@", html.escape(c["title"])) \
        .replace("@@DESC@@", html.escape(c["desc"])) \
        .replace("@@URL@@", url) \
        .replace("@@OGTITLE@@", html.escape(t+" — Prodiconseil")) \
        .replace("@@BREAD@@", html.escape(t)) \
        .replace("@@H1@@", html.escape(t)) \
        .replace("@@SUB@@", html.escape(c["sub"])) \
        .replace("@@LEAD@@", html.escape(c["lead"])) \
        .replace("@@PARA@@", html.escape(c["para"])) \
        .replace("@@CARDS@@", cards_html) \
        .replace("@@FAQJSON@@", faq_json) \
        .replace("@@FAQHTML@@", faq_html) \
        .replace("@@XLINKS@@", xlinks) \
        .replace("@@WAURL@@", wa_url) \
        .replace("@@SECH@@", html.escape(t.upper()+" — GAMME ET USAGES")) \
        .replace("@@CSSV@@", CSS_V).replace("@@JSV@@", JS_V) \
        .replace("@@WASVG@@", WA_SVG).replace("@@WASVGBIG@@", WA_SVG_BIG) \
        .replace("@@STYLE@@", STYLE)

def _j(s):
    import json
    return json.dumps(s, ensure_ascii=False)

def _u(s):
    import urllib.parse
    return urllib.parse.quote(s)

TEMPLATE = '''<!DOCTYPE html>
<html lang="fr">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<meta http-equiv="Content-Security-Policy" content="default-src 'self'; script-src 'self' 'unsafe-inline' https://cdn.jsdelivr.net; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com; img-src 'self' data: blob: https://stock.prodi.net https://paper.prodi.com https://prodi-paper.github.io https://images.unsplash.com; connect-src 'self' https://bvcgpdoukhcatjibmvnb.supabase.co https://api.emailjs.com https://cdn.jsdelivr.net; frame-ancestors 'none'; base-uri 'self'; form-action 'self';">
<meta http-equiv="X-Content-Type-Options" content="nosniff">
<meta name="referrer" content="strict-origin-when-cross-origin">
<link rel="icon" type="image/png" href="/img/panda.png">
<title>@@TITLE@@</title>
<meta name="description" content="@@DESC@@">
<meta name="robots" content="index, follow">
<link rel="canonical" href="@@URL@@">
<meta property="og:type" content="website">
<meta property="og:site_name" content="Prodiconseil">
<meta property="og:locale" content="fr_FR">
<meta property="og:url" content="@@URL@@">
<meta property="og:title" content="@@OGTITLE@@">
<meta property="og:description" content="@@DESC@@">
<meta property="og:image" content="https://paper.prodi.com/img/og-card.jpg">
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:title" content="@@OGTITLE@@">
<meta name="twitter:description" content="@@DESC@@">
<meta name="twitter:image" content="https://paper.prodi.com/img/og-card.jpg">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Bebas+Neue&family=Oswald:wght@600;700&family=DM+Sans:wght@300;400;500;600;700;800&family=Space+Grotesk:wght@300;400;500;600;700&display=swap" rel="stylesheet">
<link rel="stylesheet" href="/vitrine.css?v=@@CSSV@@">
<script type="application/ld+json">
{
  "@context": "https://schema.org",
  "@type": "BreadcrumbList",
  "itemListElement": [
    {"@type": "ListItem", "position": 1, "name": "Accueil", "item": "https://paper.prodi.com/"},
    {"@type": "ListItem", "position": 2, "name": "Produits", "item": "https://paper.prodi.com/produits/"},
    {"@type": "ListItem", "position": 3, "name": "@@BREAD@@", "item": "@@URL@@"}
  ]
}
</script>
<script type="application/ld+json">
{
  "@context": "https://schema.org",
  "@type": "FAQPage",
  "mainEntity": [
    @@FAQJSON@@
  ]
}
</script>
</head>
<body class="souspage">

<header class="hd">
  <div class="hd-inner">
    <div class="hd-logo" onclick="location.href='/'"><img src="/img/logo.png" alt="Prodiconseil" width="196" height="32"></div>
    <nav class="hd-nav">
      <a href="/produits/">Produits</a>
      <a href="/histoire/">Histoire</a>
    </nav>
    <div class="hd-divider"></div>
    <a href="/contact/" class="btn-cat">Contact →</a>
  </div>
</header>

<style>
@@STYLE@@
</style>

<main class="geopage">
  <div class="page-head">
    <h1 class="page-h1">@@H1@@</h1>
    <p class="page-sub">@@SUB@@</p>
  </div>

  <section class="habt-sec">
    <div class="sec-inner">
      <h2 class="sec-h">@@SECH@@</h2>
      <p class="habt-lead">@@LEAD@@</p>
      <p class="habt-p">@@PARA@@</p>

      <div class="gp-grid">@@CARDS@@
      </div>
    </div>
  </section>

  <section class="habt-sec">
    <div class="sec-inner">
      <h2 class="sec-h">QUESTIONS FRÉQUENTES</h2>
      <div class="gp-faq">
@@FAQHTML@@
      </div>

      <p class="gp-links">Nos autres papiers : @@XLINKS@@ · <a href="/produits/">Tous nos produits</a></p>
    </div>
  </section>

  <section class="gp-cta">
    <h2>Un besoin sur cette qualité ?</h2>
    <p>Dites-nous votre grammage, votre laize ou votre format : on vous répond avec une offre et la disponibilité en stock.</p>
    <div class="gp-cta-btns">
      <a href="/contact/" class="btn-cat">Demander une offre →</a>
      <a class="gp-wa" href="@@WAURL@@" target="_blank" rel="noopener noreferrer">
        @@WASVG@@
        WhatsApp
      </a>
    </div>
  </section>
</main>

<footer>
  <div class="ft2-grid">
    <div class="ft2-brand">
      <a href="/"><img src="/img/logo.png" alt="Prodiconseil" width="170" height="28"></a>
      <p class="ft2-tag">Négociant international en papier &amp; carton depuis 1991.</p>
    </div>
    <div class="ft2-col">
      <div class="ft2-h">Nos papiers</div>
      <a href="/offset/">Papier offset</a>
      <a href="/papier-couche/">Papier couché</a>
      <a href="/kraft/">Papier kraft</a>
      <a href="/carton-couche/">Carton couché</a>
    </div>
    <div class="ft2-col ft2-col-zones">
      <div class="ft2-h">Zones desservies</div>
      <a href="/maroc/">Maghreb</a>
      <a href="/senegal/">Afrique de l'Ouest</a>
      <a href="/cameroun/">Afrique centrale</a>
      <a href="/kenya/">Afrique de l'Est</a>
      <a href="/pologne/">Europe de l'Est</a>
      <a href="/egypte/">Méditerranée &amp; Moyen-Orient</a>
    </div>
    <div class="ft2-col">
      <div class="ft2-h">Nous joindre</div>
      <a href="@@WAURL@@" target="_blank" rel="noopener noreferrer">WhatsApp</a>
      <a href="tel:+33609997407">+33 6 09 99 74 07</a>
      <a href="mailto:contact@prodi.com">contact@prodi.com</a>
    </div>
  </div>
  <div class="ft2-bottom">© 2026 Prodiconseil · Stock papier &amp; carton · Dépôt Amiens — 14 000 m²</div>
</footer>

<div id="stock-gate" class="stock-gate" style="display:none" role="dialog" aria-modal="true" aria-label="Accès au stock">
  <div class="stock-gate-overlay" onclick="closeStockGate()"></div>
  <div class="stock-gate-card">
    <button class="stock-gate-close" onclick="closeStockGate()" aria-label="Fermer">&times;</button>
    <div class="stock-gate-ico">
      <svg width="34" height="34" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><rect x="4" y="10.5" width="16" height="10.5" rx="2.6"/><path d="M8 10.5V7a4 4 0 0 1 8 0v3.5"/></svg>
    </div>
    <form onsubmit="submitStockGate(event)">
      <input type="text" id="stock-gate-code" placeholder="Code d'accès" autocomplete="off" spellcheck="false" autocapitalize="off">
      <div id="stock-gate-err" class="stock-gate-err"></div>
      <button type="submit" class="stock-gate-btn">Confirmer</button>
    </form>
    <button type="button" class="stock-gate-contact" onclick="window.prodiTrack?.('gate_contact');closeStockGate();location.href='/contact/'">Pas encore client ?</button>
  </div>
</div>

<script src="/analytics.js?v=1"></script>
<script src="/vitrine.js?v=@@JSV@@"></script>
<a href="@@WAURL@@" target="_blank" rel="noopener noreferrer" class="wa-sticky" title="WhatsApp" aria-label="Nous contacter sur WhatsApp">
  @@WASVGBIG@@
</a>

</body>
</html>
'''

for slug in ORDER:
    d = os.path.join(ROOT, slug)
    os.makedirs(d, exist_ok=True)
    with open(os.path.join(d, "index.html"), "w", encoding="utf-8") as f:
        f.write(build(slug, PAGES[slug]))
    print("écrit :", slug+"/index.html")
print("OK", len(ORDER), "pages qualité")
