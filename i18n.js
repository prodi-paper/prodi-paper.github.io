/* ════════════════════════════════════════════════════════════════════════
   i18n PRODICONSEIL (05/10) — moteur de traduction FR → EN partagé par TOUT
   le site (catalogue + panier + wizards + contact + coquilles).

   Principe : un dictionnaire fr→en des chaînes d'INTERFACE. Au chargement (et
   à chaque contenu ajouté par JS via MutationObserver), on traduit les nœuds
   texte / placeholders / aria-labels / titles dont le texte exact (trimmé)
   figure dans le dictionnaire. Les DONNÉES produit (désignations Sage) ne
   sont PAS touchées — sauf les couleurs courantes.

   Le sélecteur de langue (header.js / inline) appelle setLang() → on stocke
   ali_lang et on recharge ; chaque page se rend alors en EN.
   ════════════════════════════════════════════════════════════════════════ */
(function(){
  if(window.ProdiI18N)return;
  var LANG='fr';
  try{LANG=localStorage.getItem('ali_lang')||'fr';}catch(e){}

  /* helper pour le code JS : TR('texte fr','english text') */
  window.TR=function(fr,en){return (LANG==='en'&&en!=null)?en:fr;};
  window.PRODI_LANG=LANG;

  /* Dictionnaire d'INTERFACE. Clé = texte FR exact (trimmé). */
  var DICT={
    // ── Titres d'onglet ──
    'Catalogue Prodiconseil':'Prodiconseil Catalogue',
    'Prodiconseil — Panier':'Prodiconseil — Cart',
    'Prodiconseil — Fabrication sur demande':'Prodiconseil — Custom manufacturing',
    "Prodiconseil — Demande d'échantillons":'Prodiconseil — Sample request',
    'Prodiconseil — Nous contacter':'Prodiconseil — Contact us',
    'Prodiconseil — Mon Prodiconseil':'Prodiconseil — My account',
    // ── Header / recherche / compte ──
    'Rechercher':'Search',
    'Que recherchez-vous ?':'What are you looking for?',
    'Port de destination :':'Destination port:',
    'Port de destination :':'Destination port:',
    'Se connecter':'Sign in',
    'Devenir client':'Become a client',
    'Bienvenue chez Prodiconseil !':'Welcome to Prodiconseil!',
    'Ou continuer avec :':'Or continue with:',
    'Continuer avec Google':'Continue with Google',
    'Mes commandes':'My orders',
    'Demande de devis':'Quote request',
    "Demande d'échantillons":'Sample request',
    'Demande d’échantillons':'Sample request',
    'Nous contacter':'Contact us',
    'Mon Prodiconseil':'My Prodiconseil',
    'Mon compte':'My account',
    'Devenir client Prodiconseil':'Become a Prodiconseil client',
    'Se déconnecter':'Sign out',
    'Choisir un port…':'Choose a port…',
    'CFR selon destination':'CFR by destination',
    'Sélectionnez le port de destination':'Select the destination port',
    'Sauvegarder':'Save',
    'Rechercher un port ou un pays…':'Search a port or country…',
    // ── Nav + burger ──
    'Toutes les catégories':'All categories',
    'Explorer le stock':'Explore the stock',
    'Fabrication sur demande':'Custom manufacturing',
    'Déstockage':'Clearance',
    'Panier':'Cart',
    'À propos de Prodiconseil':'About Prodiconseil',
    'Livraison & export':'Shipping & export',
    'Service achat':'Purchasing service',
    'Se connecter / Devenir client':'Sign in / Become a client',
    // ── Bandeau haut ──
    'Offres de la rentrée':'Back-to-school offers',
    'Recevez nos offres pour la rentrée !':'Get our back-to-school offers!',
    "S'inscrire":'Sign up','S’inscrire':'Sign up',
    'Octobre 2026':'October 2026',
    // ── Catalogue : rail filtres (terminologie papetière) ──
    'Filtres':'Filters',
    'Filtres avancés':'Advanced filters',
    'BOBINE':'REEL','FORMAT':'SHEETS','Bobine':'Reel','Format':'Sheets',
    'Format (feuilles)':'Sheets',
    'Type de papier':'Paper grade',
    'Détails':'Details',
    'Grammage':'Grammage','Grammages':'Grammages',   /* « grammage » = terme technique EN standard */
    'Couleurs':'Colours','Couleur':'Colour',
    'Dimensions':'Dimensions',
    'Mandrins':'Cores','Mandrin':'Core',
    'Laize':'Width','Diamètre':'Diameter','Poids':'Weight',
    'Réinitialiser':'Reset',
    'Rechercher…':'Search…',
    'Qualité':'Grade',
    // ── Familles / grades (libellés exacts, version accentuée) ──
    'Couché 1 face':'Coated one side (C1S)','Couché 2 faces':'Coated two sides (C2S)',
    'Adhésif':'Self-adhesive','Papier affiche':'Poster paper',
    'Carton couché':'Coated board','Carton non couché':'Uncoated board',
    'Bouffant':'Bulky','Autocopiant':'Carbonless','Offset couleur':'Coloured offset',
    'Papier cuisson':'Baking paper','Divers / Alu':'Misc / Alu',
    'Complexe / Polyéthylène':'Laminate / Polyethylene','Papier cadeau':'Gift wrap',
    'Kraft brun':'Brown kraft','Kraft gomme':'Gummed kraft','Kraft armé':'Reinforced kraft',
    'Liner / Testliner':'Liner / Testliner','Papier luxe':'Fine paper',
    'Papier journal':'Newsprint','Emballage':'Packaging','Plastique':'Plastic film',
    'Silicone / Glassine':'Silicone / Glassine','Thermique':'Thermal','Ouate / Tissue':'Tissue',
    'Ramette':'Cut-size','Divers':'Misc','Enveloppes':'Envelopes',
    'SBS / Carton blanc':'SBS / White board','Spécial':'Special','Encre':'Ink',
    'Machines':'Machinery','Autres':'Other','Autres qualités':'Other grades',
    // ── Catalogue : en-têtes tableau ──
    'Photo':'Photo','Référence':'Reference',
    'Laize (mm)':'Width (mm)','Diamètre (mm)':'Diameter (mm)',
    'Mandrin (mm)':'Core (mm)','Dimensions (mm)':'Dimensions (mm)',
    'Poids (kg)':'Weight (kg)','Poids total (t)':'Total weight (t)',
    'GSM (g/m²)':'GSM (g/m²)',
    'Prix':'Price','Usine':'Mill',
    // ── Catalogue : barre d'état + CTA ──
    'Télécharger':'Download',
    'Album photo':'Photo album',
    'Réserver':'Reserve',
    'Vider':'Clear',
    'Voir le prix':'See price',
    'Voir le stock ›':'See stock ›',
    'Vider la sélection':'Clear selection',
    'Tout déselectionner':'Deselect all',
    // ── Fiche produit ──
    'Poids net':'Net weight','Zone':'Zone','Code douanier':'HS code',
    'Condit.':'Packing','Dépôt':'Warehouse','Type':'Type','Longueur':'Length',
    // ── Totaux ──
    'TOTAL BOBINES':'TOTAL ROLLS','TOTAL FORMATS':'TOTAL SHEETS',
    // ── Couleurs courantes (données produit visibles) ──
    'Blanc':'White','Blanc nature':'Natural white','Blanc naturel':'Natural white',
    'Blanc casse':'Off-white','Blanc cassé':'Off-white','Ivoire':'Ivory',
    'Crème':'Cream','Creme':'Cream','Bleu':'Blue','Rouge':'Red','Vert':'Green',
    'Jaune':'Yellow','Rose':'Pink','Gris':'Grey','Noir':'Black','Brun':'Brown',
    'Marron':'Brown','Orange':'Orange','Saumon':'Salmon','Transparent':'Transparent',
    'Argent':'Silver','Or':'Gold','Beige':'Beige','Kraft':'Kraft',
    'Tres blanc':'Extra white','Très blanc':'Extra white',
    // ── Panier ──
    'Récapitulatif':'Summary','Bobines':'Rolls','Formats':'Sheets',
    'Tonnage':'Tonnage','Prix moyen (EXW)':'Average price (EXW)',
    'Marchandise (EXW)':'Goods (EXW)','Destination':'Destination',
    'Transport estimé':'Estimated freight','Total estimé (CFR)':'Estimated total (CFR)',
    '— Choisir un pays —':'— Choose a country —',
    'Votre panier est vide':'Your cart is empty',
    'Votre panier est vide.':'Your cart is empty.',
    'Accéder au panier':'Go to cart',
    'Retirer du panier':'Remove from cart',
    'Copier la référence':'Copy reference',
    '+25 qualités de papier & carton':'+25 paper & board grades',
    'Export international':'International export',
    'Documents export & fiches techniques':'Export documents & data sheets',
    'EXW = prix départ dépôt, hors transport. Transport estimatif':'EXW = ex-warehouse price, excl. freight. Estimated freight',
    'par tonne (container ~25 T) selon le port de destination. Montant confirmé sur la proforma.':'per tonne (~25 T container) by destination port. Final amount confirmed on the proforma.',
    'Réservation envoyée':'Reservation sent',
    // ── Wizards fabrication / échantillons ──
    'Fabrication sur demande':'Custom manufacturing',
    "Demande d'échantillons":'Sample request',
    'Réservé aux clients Prodiconseil':'Reserved for Prodiconseil clients',
    'Connectez-vous pour envoyer votre demande de fabrication.':'Sign in to send your manufacturing request.',
    'Connectez-vous pour recevoir vos échantillons.':'Sign in to receive your samples.',
    'Se connecter / créer un compte':'Sign in / create an account',
    'Vous cherchez des bobines ou des formats ?':'Looking for reels or sheets?',
    'Quelle qualité de papier ?':'Which paper grade?',
    'Quel grammage ?':'Which weight?',
    'Quelle laize ?':'Which width?','Quel format ?':'Which sheet size?',
    'Quel tonnage ?':'Which tonnage?',
    'Votre demande':'Your request',
    'Vos échantillons':'Your samples',
    'Quel échantillon voulez-vous recevoir ?':'Which sample would you like?',
    'Continuer':'Continue','Passer cette étape':'Skip this step',
    '+ Ajouter un autre produit':'+ Add another product',
    '+ Ajouter un autre échantillon':'+ Add another sample',
    'Envoyer la demande':'Send request',
    'Recevoir mes échantillons !':'Get my samples!',
    'Précisions (délai, couleur, usage…) — facultatif':'Details (lead time, colour, use…) — optional',
    'Précisions — facultatif':'Details — optional',
    'Adresse de livraison (rue, n°)':'Delivery address (street, no.)',
    'Code postal / ZIP':'Postal code / ZIP',
    'Autre…':'Other…',
    'Bien reçu !':'Received!',
    'Offset':'Offset','Kraft brun':'Brown kraft','Papier couché':'Coated paper',
    'Carton couché':'Coated board','Autocopiant':'Carbonless','Papier luxe':'Fine paper',
    'Papier journal':'Newsprint','Offset couleur':'Coloured offset','Bouffant':'Bulky',
    'Adhésif':'Self-adhesive','Ramette A4':'A4 ream','Liner':'Liner','Papier création':'Creative paper',
    // ── Contact ──
    'Contact & Accès':'Contact & Directions',
    'Joignez-nous directement :':'Reach us directly:',
    'Suivez-nous sur les réseaux':'Follow us',
    'Les accès':'Directions',
    'Bureaux — Ivry-sur-Seine':'Offices — Ivry-sur-Seine',
    "Dépôt — Saint-Ouen (près d'Amiens)":'Warehouse — Saint-Ouen (near Amiens)',
    'Itinéraire →':'Directions →',
    // ── Divers ──
    'Chargement…':'Loading…','Aucun résultat':'No results',
    'Génération…':'Generating…'
  };
  /* GLOSSAIRE papetier mot-à-mot — pour les DONNÉES produit (grades en
     capitales, détails Sage, couleurs). Clés NORMALISÉES (minuscule, sans
     accent) car Sage écrit souvent sans accent et en capitales. Les phrases
     (2-3 mots) sont essayées AVANT les mots simples. */
  var GLOSS={
    // dos / backs
    'dos creme':'cream back','dos blanc':'white back','dos kraft':'kraft back','dos gris':'grey back',
    // grades composés (données en capitales)
    'carton couche':'coated board','carton non couche':'uncoated board',
    'kraft brun':'brown kraft','kraft arme':'reinforced kraft','kraft gomme':'gummed kraft',
    'offset couleur':'coloured offset','papier journal':'newsprint','papier luxe':'fine paper',
    'papier cuisson':'baking paper','papier cadeau':'gift wrap','papier affiche':'poster paper',
    'couche 1 face':'coated one side','couche 2 faces':'coated two sides','couche 1 f':'1-side coated',
    '100% recycle':'100% recycled','100 % recycle':'100% recycled',
    'dos couche':'coated back','main 2.0':'bulk 2.0','tr grammage':'graduated grammage',
    // mots simples (ordre indifférent)
    'bobine':'reel','palette':'pallet','feuille':'sheet','feuilles':'sheets','rames':'reams','rame':'ream',
    'blanc':'white','blanche':'white','creme':'cream','ivoire':'ivory','naturel':'natural','nature':'natural',
    'bleu':'blue','rouge':'red','vert':'green','verte':'green','jaune':'yellow','rose':'pink','gris':'grey',
    'noir':'black','brun':'brown','marron':'brown','orange':'orange','saumon':'salmon','argent':'silver',
    'dore':'gold','beige':'beige','transparent':'transparent','teinte':'tinted','couleur':'colour',
    'recycle':'recycled','recyclee':'recycled','couche':'coated','couchee':'coated','mat':'matte','mate':'matte',
    'brillant':'gloss','brillante':'gloss','rugueux':'rough','rugueuse':'rough','lisse':'smooth',
    'qualite':'grade','grammage':'grammage','fabrication':'production','transition':'transition',
    'arme':'reinforced','armee':'reinforced','gomme':'gummed','gommee':'gummed','ingraissable':'greaseproof',
    'silicone':'silicone','glassine':'glassine','bulle':'kraft','paille':'straw','verge':'laid','calque':'tracing',
    'securite':'security','malleable':'malleable','latex':'latex','fenetre':'window','film':'film',
    'metallise':'metallized','metallisee':'metallized','autocopiant':'carbonless','bouffant':'bulky',
    'adhesif':'self-adhesive','adhesive':'self-adhesive','liner':'liner','testliner':'testliner',
    'enveloppes':'envelopes','enveloppe':'envelope','emballage':'packaging','plastique':'plastic',
    'thermique':'thermal','special':'special','speciale':'special','encre':'ink','divers':'misc',
    'pour':'for','et':'&','sur':'on','avec':'with','sans':'without','demande':'request','sacs':'bags',
    'impression':'printing','edition':'publishing','creation':'creative','travaux':'works','notice':'leaflet',
    'fibres':'fibres','visibles':'visible','dos':'back','face':'side','faces':'sides','grise':'grey',
    'complexe':'laminate','polyethylene':'polyethylene','barriere':'barrier','filet':'net',
    'rec':'recycled','bob':'reel','pal':'pallet','blancheur':'whiteness','teintes':'tints',
    'bristol':'bristol','affiche':'poster','cadeau':'gift','journal':'newsprint','cuisson':'baking',
    'ouate':'tissue','enveloppe':'envelope','sommet':'top','standard':'standard','superieur':'premium',
    'extra':'extra','super':'super','opaque':'opaque','satine':'satin','satinee':'satin','vergee':'laid'
  };
  var GKEYS=Object.keys(GLOSS).sort(function(a,b){return b.split(' ').length-a.split(' ').length||b.length-a.length;});
  function norm(s){return s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g,'');}
  function applyCase(src,en){
    if(src===src.toUpperCase()&&/[A-ZÀ-Ü]/.test(src))return en.toUpperCase();
    if(src[0]===src[0].toUpperCase())return en.charAt(0).toUpperCase()+en.slice(1);
    return en;
  }
  /* traduit une chaîne de DONNÉES mot-à-mot via GLOSS (phrases d'abord) */
  function glossTranslate(s){
    if(!s||!/[A-Za-zÀ-ÿ]/.test(s))return s;
    var out=s;
    GKEYS.forEach(function(k){
      var parts=k.split(' ');
      // regex : limites de mot, insensible casse/accent via classe
      var pat=parts.map(function(w){
        return w.split('').map(function(ch){
          var n=norm(ch);
          if(n==='a')return '[aàâä]';if(n==='e')return '[eéèêë]';if(n==='i')return '[iîï]';
          if(n==='o')return '[oôö]';if(n==='u')return '[uùûü]';if(n==='c')return '[cç]';
          return ch.replace(/[.*+?^${}()|[\]\\]/g,'\\$&');
        }).join('');
      }).join('[\\s]+');
      try{
        var re=new RegExp('(^|[^A-Za-zÀ-ÿ])('+pat+')(?![A-Za-zÀ-ÿ])','gi');
        out=out.replace(re,function(m,pre,word){return pre+applyCase(word,GLOSS[k]);});
      }catch(e){}
    });
    return out;
  }
  window.ProdiI18N={dict:DICT,gloss:GLOSS,lang:LANG};

  if(LANG!=='en'){ /* FR : rien à faire, sortie immédiate */ return; }

  /* ── EN : moteur de traduction ── */
  try{document.documentElement.setAttribute('lang','en');}catch(e){}

  function tr1(s){
    if(s==null)return s;
    var k=s.trim();
    if(!k)return s;
    // 1) UI chrome : correspondance EXACTE
    if(DICT[k]!=null)return s.replace(k,DICT[k]);
    // 2) pluriels dynamiques « n ligne(s) · X t »
    var m;
    if((m=k.match(/^(\d[\d\s]*)\s+lignes?(.*)$/)))return m[1]+' line'+((parseInt(m[1].replace(/\s/g,''),10)>1)?'s':'')+(m[2]||'');
    // 3) DONNÉES produit (grades, détails, couleurs) : glossaire mot-à-mot
    if(/[A-Za-zÀ-ÿ]/.test(k)){
      var g=glossTranslate(s);
      if(g!==s)return g;
    }
    return s;
  }
  function walk(root){
    if(!root)return;
    try{
      // nœuds texte
      var it=document.createTreeWalker(root,NodeFilter.SHOW_TEXT,null);
      var tnodes=[],n;
      while((n=it.nextNode())){if(n.nodeValue&&n.nodeValue.trim())tnodes.push(n);}
      tnodes.forEach(function(t){
        var p=t.parentNode; if(!p)return;
        var tag=p.nodeName; if(tag==='SCRIPT'||tag==='STYLE'||tag==='TEXTAREA')return;
        var nv=tr1(t.nodeValue);
        if(nv!==t.nodeValue)t.nodeValue=nv;
      });
      // attributs traduisibles
      var els=root.querySelectorAll?root.querySelectorAll('[placeholder],[title],[aria-label],[alt]'):[];
      Array.prototype.forEach.call(els,function(e){
        ['placeholder','title','aria-label','alt'].forEach(function(a){
          if(e.hasAttribute(a)){var v=e.getAttribute(a),nv=tr1(v);if(nv!==v)e.setAttribute(a,nv);}
        });
      });
      if(root.nodeType===1&&root.matches&&root.matches('[placeholder],[title],[aria-label],[alt]')){
        ['placeholder','title','aria-label','alt'].forEach(function(a){
          if(root.hasAttribute(a)){var v=root.getAttribute(a),nv=tr1(v);if(nv!==v)root.setAttribute(a,nv);}
        });
      }
    }catch(e){}
  }
  window.prodiTranslate=walk;

  function run(){
    // titre de l'onglet
    try{var tt=tr1(document.title);if(tt!==document.title)document.title=tt;}catch(e){}
    walk(document.body);
    // contenu ajouté dynamiquement (catalogue, panier, wizards, fiche…)
    try{
      var pend=false;
      var mo=new MutationObserver(function(muts){
        if(pend)return; pend=true;
        requestAnimationFrame(function(){
          pend=false;
          muts.forEach(function(mu){
            Array.prototype.forEach.call(mu.addedNodes,function(nd){
              if(nd.nodeType===1)walk(nd);
              else if(nd.nodeType===3){var nv=tr1(nd.nodeValue);if(nv!==nd.nodeValue)nd.nodeValue=nv;}
            });
          });
        });
      });
      mo.observe(document.body,{childList:true,subtree:true});
    }catch(e){}
  }
  if(document.body)run(); else document.addEventListener('DOMContentLoaded',run);
})();

/* setLang : appelé par le sélecteur de langue → stocke + recharge en EN/FR */
window.setLang=function(l){
  try{localStorage.setItem('ali_lang',l==='en'?'en':'fr');}catch(e){}
  location.reload();
};
