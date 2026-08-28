
// ─── EMAILJS ───
const EJS_PUB = 'e3aqMGO-mZiAECrb5';
const EJS_SVC = 'service_k3060so';
const EJS_TPL = 'template_atcwwc2';
// EmailJS À LA DEMANDE (perf 18/07) : ~30 KB sortis du chemin critique.
let _ejsP=null;
function _ejsReady(){
  if(window.emailjs){try{if(!_ejsP){emailjs.init({publicKey:EJS_PUB});_ejsP=Promise.resolve();}}catch(_){}return _ejsP||Promise.resolve();}
  if(_ejsP)return _ejsP;
  _ejsP=new Promise((res,rej)=>{
    const s=document.createElement('script');
    s.src='https://cdn.jsdelivr.net/npm/@emailjs/browser@4.4.1/dist/email.min.js';
    s.integrity='sha384-SALc35EccAf6RzGw4iNsyj7kTPr33K7RoGzYu+7heZhT8s0GZouafRiCg1qy44AS';
    s.crossOrigin='anonymous';
    s.onload=()=>{try{emailjs.init({publicKey:EJS_PUB});}catch(_){}res();};
    s.onerror=rej;
    document.head.appendChild(s);
  });
  return _ejsP;
}

const SURL='https://bvcgpdoukhcatjibmvnb.supabase.co';
const SKEY='eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJ2Y2dwZG91a2hjYXRqaWJtdm5iIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzIyNzg5MjgsImV4cCI6MjA4Nzg1NDkyOH0.Ip3ykSUS9sajTH04yXBerOG1haBKMD1kAvMQNjnGL1Q';
const SB_H={'apikey':SKEY,'Authorization':'Bearer '+SKEY,'Content-Type':'application/json'};
async function sbQ(path,opts={}){
  // Le complément inventaire (source='inventaire', réinséré chaque matin par le
  // robot d'import pour l'app d'inventaire physique) ne doit JAMAIS apparaître
  // sur le catalogue public : machines, vieux stock, dépôts extérieurs.
  // Filtre appliqué ici — toutes les requêtes products passent par sbQ.
  if(path.startsWith('products?'))path+='&source=neq.inventaire'
    // Périmètre 15/07 : le catalogue ne montre QUE notre dépôt — plus de
    // Fabrication (Photo_FAB*), plus de sideruns/DU (Photo_DU*), plus de
    // hors dépôt. Verrou ici = toutes les requêtes products sont couvertes.
    +'&emplacement=eq.OUR%20WAREHOUSE'
    +'&or=(ref.not.ilike.Photo_DU%25,ref.is.null)'
    +'&or=(ref.not.ilike.Photo_FAB%25,ref.is.null)'
    // Photo_BU* = pièces machine de CLIENTS (lames, affûtage — noms de clients
    // dans le détail, prix Sage à l'unité aberrant en €/T). Jamais au catalogue.
    +'&or=(ref.not.ilike.Photo_BU%25,ref.is.null)'
    // Réfs au prix Sage faux (unitaire ou aberrant dans un champ €/kg) —
    // exclues en attendant correction dans Sage (audit prix 20/07) :
    // 931597 grilles de protection (731 600 €/T), 898404/05/06 élastique et
    // fil masque (13 783 €/T, « pas logique du tout » dixit Ethan).
    +'&or=(ref.not.in.(Photo_931597,Photo_898404,Photo_898405,Photo_898406),ref.is.null)';
  // Clients externes / accès sans prix : jamais de réservés (window._hideReserved).
  // Exclut les liens client curés ?s=/?share= (offre figée = on n'y touche pas).
  if(path.startsWith('products?')&&window._hideReserved&&!/[?&](s|share)=/.test(location.search))
    path+='&reserve_client=is.null';
  const r=await fetch(SURL+'/rest/v1/'+path,{method:opts.method||'GET',headers:{...SB_H,...(opts.headers||{})},body:opts.body!=null?JSON.stringify(opts.body):undefined,signal:opts.signal});
  const txt=await r.text();const d=txt?JSON.parse(txt):null;
  const cr=r.headers.get('Content-Range');
  const _rawCnt=cr&&cr.includes('/')?+cr.split('/')[1]:null;
  return{data:r.ok?d:null,error:r.ok?null:(d||{message:'HTTP '+r.status}),count:(_rawCnt!=null&&!isNaN(_rawCnt))?_rawCnt:null};
}

// ─── SECURITY HELPERS — XSS escape for product fields injected via innerHTML ───
// Facteur du zoom global « adaptation grands écrans » (index.html) : les
// rects sont en px VISUELS, mais un style.left posé sur un élément fixed DANS
// le body zoomé est re-multiplié par le zoom → diviser par _zf().
const _zf=()=>parseFloat(document.body.style.zoom)||1;
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
// safeUrl: whitelist http(s) and trusted hosts; returns empty string for anything else (data:, javascript:, etc.)
// Vignette CDN (perf 19/07) : les photos brutes font 0,1-3 Mo, les cartes
// les affichent en ~300px. weserv redimensionne ; onerror = original.
const safeUrl = u => {
  const s = String(u||'').trim();
  if (!/^https?:\/\//i.test(s)) return '';
  return esc(s);
};
function imgThumb(u,w){
  const s=safeUrl(u);
  if(!s)return '';
  return 'https://images.weserv.nl/?url='+encodeURIComponent(s.replace(/^https?:\/\//,''))+'&w='+(w||560)+'&q=72';
}
// (08/08 Ethan « dézoome ceux qui dépassent ») : les cartes remplissent le cadre
// en object-fit:cover ; une photo nettement PLUS PORTRAIT que le cadre s'y fait
// rogner fort (bobine verticale zoomée sur le milieu). On la bascule alors en
// photo ENTIÈRE (contain, fond blanc). Les autres gardent le remplissage.
function _fitCardImg(img){
  try{
    if(!img||img.classList.contains('pcard-nophoto'))return;
    const nw=img.naturalWidth,nh=img.naturalHeight;if(!nw||!nh)return;
    const box=img.parentElement;if(!box)return;
    const bw=box.clientWidth,bh=box.clientHeight;if(!bw||!bh)return;
    const ia=nw/nh,ba=bw/bh;
    // fit=1 → l'image épouse le cadre ; <1 → décalage (cover rogne d'autant).
    // Sous 0,72 (≈ >28% rogné, portrait OU paysage) on montre la photo ENTIÈRE.
    const fit=Math.min(ia,ba)/Math.max(ia,ba);
    if(fit < 0.6){img.style.objectFit='contain';box.style.background='#fff';}
    else{img.style.objectFit='';box.style.background='';}
  }catch(e){}
}

// attrJs: produces a valid HTML-attribute-safe JS string literal (use WITHOUT surrounding quotes in onclick)
const attrJs = s => esc(JSON.stringify(String(s ?? '')));
// numId: coerce id to integer for use in onclick handlers (prevents JS injection if id is non-numeric string)
const numId = v => Number.isFinite(+v) ? +v : 0;
const WA='33609997407';
let all=[],cur=null;
// 08/08 (Ethan « enlève les tuiles, je veux voir les derniers arrivages en
// premier ») : atterrissage PAR DÉFAUT = GRILLE triée « Arrivage : plus récents ».
// Tuiles qualités uniquement via ?tuiles=1 ; ancien hero plein écran via ?hero=1.
window._SAISIE_BASSE=/[?&]tuiles=1/.test(location.search);
const PAGE=40; let currentPage=1,_totalCount=0,_reqToken=0,_lastCorrections=[],_isFirstLoad=true,_featuredMode=false;
// ─── MODE REGROUPÉ ───
// Groupe les unités physiques par (qualité+couleur+détails+gsm+laize+format).
// Default ON (clarifie le catalogue : 5651 unités → ~3200 produits distincts).
let _groupedMode = (()=>{
  try{
    // Reset one-shot pour les users qui auraient cliqué sur l'ancien toggle mal-libellé
    if(!localStorage.getItem('prodi_grouped_v2')){
      localStorage.removeItem('prodi_grouped_mode');
      localStorage.setItem('prodi_grouped_v2','1');
    }
    const v=localStorage.getItem('prodi_grouped_mode');
    return v===null?true:v==='1';
  }catch(_){return true;}
})();
let _allUnitsCache=null;        // tous les rows correspondant aux filtres courants
let _allUnitsCacheKey=null;     // signature des filtres ayant produit le cache (évite re-fetch inutile)
let _groupsList=[];             // [{gid, units[], count, totalWeight, mandrins:Set, depots:Set, _proto, image_url, proto_id}]
let _groupedTotalCount=0;       // nb de groupes (utilisé pour la pagination en mode groupé)
let _groupedUnitCount=0;        // nb de produits individuels dans les groupes (pour l'affichage)
let _groupQty={};               // gid → qty sélectionnée dans la card (1 par défaut)
const groupKey = p => [
  p.qualite||'',
  p.couleur||'',
  (p.details||'').trim(),
  p.grammage??'',
  p.largeur??'',
  p.format||'',
  String(p.usine||'').replace(/^REF\s*/i,'') // même usine = même lot (04/08)
].join('|');
function groupProducts(rows){
  const map=new Map();
  rows.forEach(p=>{
    const k=groupKey(p);
    let g=map.get(k);
    if(!g){g={gid:k,units:[],count:0,totalWeight:0,mandrins:new Set(),depots:new Set(),usines:new Set(),_proto:null,image_url:'',proto_id:null};map.set(k,g);}
    g.units.push(p);
    g.count++;
    g.totalWeight+=(+p.poids_net||0);
    if(p.noyau)g.mandrins.add(String(p.noyau));
    if(p.emplacement)g.depots.add(p.emplacement);
    if(p.usine)g.usines.add(String(p.usine).replace(/^REF\s*/i,''));
  });
  for(const g of map.values()){
    g.units.sort((a,b)=>(b.image_url?1:0)-(a.image_url?1:0));
    g._proto=g.units[0];
    g.image_url=g._proto.image_url||'';
    g.proto_id=g._proto.id;
  }
  return Array.from(map.values());
}
function toggleGroupedMode(){
  _groupedMode=!_groupedMode;
  try{localStorage.setItem('prodi_grouped_mode',_groupedMode?'1':'0');}catch(_){ }
  _allUnitsCache=null;_allUnitsCacheKey=null;_groupsList=[];currentPage=1;
  _updateGroupedToggleBtn();
  if(typeof _doFilter==='function')_doFilter();
}
function _updateGroupedToggleBtn(){
  const btn=document.getElementById('grp-toggle');
  if(!btn)return;
  btn.classList.toggle('on',_groupedMode);
  const lbl=btn.querySelector('.grp-toggle-lbl');
  if(lbl)lbl.textContent=_groupedMode?'Groupé':'Détaillé';
}
// Prix TOUJOURS affiché au catalogue (interne), JAMAIS en vue client (?s=/?share=) — Ethan 08/08.
// Accès LEAD (23/08 Ethan) : formulaire « Accéder au stock » de la vitrine
// validé (prodi_stock_ok) SANS le code client (prodi_cat_ok) → catalogue
// complet mais SANS PRIX ni exports chiffrés (Excel, Stocklot, Fabrication —
// masqués via body.lead-view). Saisir PRODI2026 ensuite rend les prix.
let _leadMode=false;
try{_leadMode=localStorage.getItem('prodi_stock_ok')==='1'&&localStorage.getItem('prodi_cat_ok')!=='1';}catch(_){}
if(_leadMode){const _lv=()=>document.body.classList.add('lead-view');document.body?_lv():document.addEventListener('DOMContentLoaded',_lv);}
// Clients externes (code dédié type BROTHER → flag prodi_client) + accès SANS
// PRIX (lead) : catalogue LIMITÉ AU STOCK DISPONIBLE — les réservés
// (reserve_client, posé par Sage) sont masqués (filtre ajouté dans sbQ, sauf
// sur les liens curés ?s=). L'INTERNE (PRODI2026 → prodi_client effacé) voit tout.
window._hideReserved=false;
try{window._hideReserved=_leadMode||localStorage.getItem('prodi_client')==='1';}catch(_){}
if(window._hideReserved){const _hr=()=>document.body.classList.add('hide-reserved');document.body?_hr():document.addEventListener('DOMContentLoaded',_hr);}
// ── Toast MOBILE « Navigation PC recommandé » (26/08) : petit bandeau qui monte
// du bas ~4 s, 1×/session, DANS LE STOCK (catalogue). Vue client ?s= exclue.
// ?pchint=1 force l'affichage (test). ──
(function(){
  const _force=/[?&]pchint=1/.test(location.search);
  if(!_force){
    try{
      if(!window.matchMedia('(max-width:768px)').matches) return;
      if(/[?&](s|share)=/.test(location.search)) return;
      if(sessionStorage.getItem('pc_hint_seen')==='1') return;
      sessionStorage.setItem('pc_hint_seen','1');
    }catch(_){ return; }
  }
  const run=()=>{
    const t=document.createElement('div'); t.id='pc-hint';
    t.innerHTML='<svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="flex-shrink:0"><rect x="2" y="4" width="20" height="13" rx="2"/><path d="M8 21h8M12 17v4"/></svg><span>Navigation PC recommandé</span>';
    document.body.appendChild(t);
    setTimeout(()=>t.classList.add('show'),1200);
    setTimeout(()=>t.classList.remove('show'),5600);
    setTimeout(()=>t.remove(),6300);
  };
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',run);
  else run();
})();
let _priceMode=!(new URLSearchParams(location.search).get('s')||new URLSearchParams(location.search).get('share'))&&!_leadMode;
function togglePriceMode(on){
  if(_leadMode)on=false; // pas de prix en accès lead, même à la bascule
  _priceMode=on;
  try{localStorage.setItem('prodi_price_mode',on?'1':'0');}catch(_){}
  ['lang-fr','lang-fr-m'].forEach(id=>{const e=document.getElementById(id);if(e){e.classList.toggle('on',on);e.style.background=on?'var(--red)':'';e.style.borderColor=on?'var(--red)':'';e.style.color=on?'#fff':'';}});
  const g=document.getElementById('pgrid');
  if(g&&g._lastList)render(g._lastList);
  // Re-render detail modal only if it's actually open
  if(_detIdx>=0&&all[_detIdx]&&document.getElementById('detail-bg')?.classList.contains('show'))
    openDetail(all[_detIdx].id);
}

// ── DEVISE € / $ (26/08) : bascule d'affichage des prix. Le taux EUR→USD vient
// de la BCE via Frankfurter (gratuit, SANS clé, MAJ quotidienne ~16h CET),
// caché 1 jour en localStorage ; hors ligne on garde le dernier taux connu
// (et à défaut on reste en €). Ne change QUE l'affichage — la base reste en €.
let _usdRate=0, _currency='EUR';
try{ if(localStorage.getItem('prodi_ccy')==='USD')_currency='USD'; }catch(_){}
// jamais de $ en vue client (?s=) ni en accès lead : le bouton n'y est pas,
// on ne veut pas laisser un prix en $ figé sans moyen de revenir en €.
if(_leadMode||/[?&](s|share)=/.test(location.search))_currency='EUR';
// prixT = valeur en €/T → nombre formaté dans la devise courante.
function _ccyNum(prixT){
  if(prixT==null||prixT==='')return '';
  let v=(_currency==='USD'&&_usdRate>0)?prixT*_usdRate:prixT;
  v=Math.round(v/10)*10; // arrondi à la DIZAINE : prix « ronds » finissant par 0 (Ethan 26/08, € ET $)
  return v.toLocaleString('fr-FR');
}
function _ccyUnit(low){ const u=(_currency==='USD'&&_usdRate>0)?'$/T':'€/T'; return low?u.toLowerCase():u; }
function _ccySym(){ return (_currency==='USD'&&_usdRate>0)?'$':'€'; }
function _paintCcyBtn(){ document.querySelectorAll('.ccy-opt').forEach(b=>b.classList.toggle('active',b.dataset.c===_currency)); }
function _repaintPrices(){
  const g=document.getElementById('pgrid'); if(g&&g._lastList)render(g._lastList);
  if(typeof renderDrawer==='function')renderDrawer();
  if(_detIdx>=0&&all[_detIdx]&&document.getElementById('detail-bg')?.classList.contains('show'))openDetail(all[_detIdx].id);
}
function toggleCurrency(c){
  const next=c||(_currency==='USD'?'EUR':'USD');
  if(next==='USD'&&!(_usdRate>0)){ toast('Taux de change en cours de chargement…'); _loadUsdRate(); return; }
  _currency=next;
  try{localStorage.setItem('prodi_ccy',_currency);}catch(_){}
  _paintCcyBtn(); _repaintPrices();
  window.prodiTrack?.('devise',{ccy:_currency,taux:_usdRate});
}
async function _loadUsdRate(){
  try{
    const today=new Date().toISOString().slice(0,10);
    let cached=null; try{cached=JSON.parse(localStorage.getItem('prodi_usd')||'null');}catch(_){}
    if(cached&&+cached.r>0)_usdRate=+cached.r;                 // repli immédiat
    if(cached&&cached.d===today&&+cached.r>0)return;           // déjà à jour aujourd'hui
    const res=await fetch('https://api.frankfurter.dev/v1/latest?base=EUR&symbols=USD');
    const j=await res.json();
    const r=j&&j.rates&&+j.rates.USD;
    if(r>0){ _usdRate=r; try{localStorage.setItem('prodi_usd',JSON.stringify({d:today,r}));}catch(_){}
      if(_currency==='USD')_repaintPrices(); }
  }catch(_){/* garde le cache ou reste en € */}
}
_paintCcyBtn(); _loadUsdRate();
const ico=t=>({Kraft:'📦',FBB:'🗂️',SBS:'📋',Testliner:'🧱',Fluting:'〰️',Offset:'🧻',Thermique:'🏷️',Duplex:'📄',Triplex:'📑'}[t]||'📦');
const fmt=kg=>!kg?'—':kg>=1000?(kg/1000).toFixed(1)+' t':kg+' KGS';
// 16/07 : TOUT reste en mm (données Sage en mm) — l'helper garde son nom
// historique mais ne convertit plus.
const mmToCm=mm=>mm!=null?Math.round(+mm):null;
// Centralized rule for the "Couleur" paper type split (gsm threshold).
// Note the deliberate asymmetry, kept from the original design:
//   - `codes` (RCOL+SCOL) is used by TYPE_MAP (smart search) and rowToUi
//     (display label derivation from quality+gsm).
//   - The SIDEBAR filter (msd-type "Offset Couleur" / "Dossier Couleur")
//     matches only RCOL — see _countFacet / _matchesActiveFilters /
//     _fetchAndRender, which use the literal 'RCOL'.
const COULEUR_SPLIT={
  codes:['RCOL','SCOL'],
  threshold:150,
  offsetLabel:'Offset Couleur',
  dossierLabel:'Dossier Couleur',
};
const _isCouleurPseudo=v=>v===COULEUR_SPLIT.offsetLabel||v===COULEUR_SPLIT.dossierLabel;
// Maps user-visible type label → actual DB quality codes
const TYPE_MAP={
  'Adhésif':           ['RADH','SADH'],
  'Autocopiant':       ['RCAR','SCAR'],
  'Bouffant':          ['RBOU','SBOU'],
  'Carton couché':     ['RBOA','SBOA'],
  'Carton non couché': ['RBON','SBON'],
  'Complexe':          ['RFLEX'],
  'Couché 1 face':     ['R1SC','S1SC'],
  'Couché 2 faces':    ['R2SC','S2SC'],
  'Couleur':           COULEUR_SPLIT.codes,
  [COULEUR_SPLIT.offsetLabel]:  COULEUR_SPLIT.codes,
  [COULEUR_SPLIT.dossierLabel]: COULEUR_SPLIT.codes,
  'Cuisson':           ['RCUI'],
  'Divers':            ['RDIV','SDIV'],
  'Emballage':         ['RPAC','SPAC'],
  'Encre':             ['SINK'],
  'Enveloppes':        ['SENV'],
  'Journal':           ['RNEW','SNEW'],
  'Kraft':             ['RKRA','RKRABRUN','SKRA'],
  'Kraft armé':        ['RKRR'],
  'Kraft gomme':       ['RKRG'],
  'Liner':             ['RLINER'],
  'Luxe':              ['RLUX','SLUX'],
  'LWC':               ['RLWC','SLWC'],
  'Machines':          ['UMAC'],
  'Offset':            ['ROFF','SOFF'],
  'Ouate':             ['RTIS'],
  'Papier affiche':    ['RAFF','SAFF'],
  'Papier cadeau':     ['RKDO','SKDO'],
  'Plastique':         ['RPLA','SPLA'],
  'Ramette':           ['SCUT'],
  'SBS':               ['SSBS'],
  'Silicone-Glassine': ['RSIL'],
  'Spécial':           ['SSPE'],
  'Thermique':         ['RTHERM'],
};
// ===== SMART SEARCH ENGINE =====
function lev(a,b){
  if(!a.length)return b.length;
  if(!b.length)return a.length;
  let prev=Array.from({length:b.length+1},(_,j)=>j);
  for(let i=1;i<=a.length;i++){
    const cur=[i];
    for(let j=1;j<=b.length;j++)
      cur[j]=a[i-1]===b[j-1]?prev[j-1]:1+Math.min(prev[j-1],prev[j],cur[j-1]);
    prev=cur;
  }
  return prev[b.length];
}
const _norm=s=>s.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();

// ── Filter intent detection ───────────────────────────────────────────────
// When the user types a filter category name (e.g. "format", "couleur"),
// we detect it and guide them to the sidebar filter instead of text-searching.
const FILTER_INTENTS=[
  {keys:['format','formats','palette','palettes','feuille','feuilles'],label:'Format',
   highlight(){const el=document.querySelector('.fpill[data-format="Palette"]');if(el){if(!el.classList.contains('active'))el.click();el.scrollIntoView({behavior:'smooth',block:'center'});}}},
  {keys:['bobine','bobines'],label:'Format — Bobine',
   highlight(){const el=document.querySelector('.fpill[data-format="Bobine"]');if(el){if(!el.classList.contains('active'))el.click();el.scrollIntoView({behavior:'smooth',block:'center'});}}},
  {keys:['couleur','couleurs','color','colors','colour','teinte','teintes'],label:'Couleur',
   highlight(){const el=document.getElementById('msd-couleur');if(el){el.scrollIntoView({behavior:'smooth',block:'center'});toggleMsd('msd-couleur');}}},
  {keys:['grammage','grammages','poids'],label:'Grammage (g/m²)',
   highlight(){const el=document.getElementById('f-gmin');if(el){el.scrollIntoView({behavior:'smooth',block:'center'});el.focus();}}},
  {keys:['mandrin','mandrins','noyau','noyaux'],label:'Mandrin',
   highlight(){const el=document.getElementById('msd-mandrin');if(el){el.scrollIntoView({behavior:'smooth',block:'center'});toggleMsd('msd-mandrin');}}},
  {keys:['laize','laizes','largeur','largeurs'],label:'Laize (mm)',
   highlight(){const el=document.getElementById('f-lmin');if(el){el.scrollIntoView({behavior:'smooth',block:'center'});el.focus();}}},
  {keys:['longueur','longueurs'],label:'Longueur (mm)',
   highlight(){const el=document.getElementById('f-longmin');if(el){el.scrollIntoView({behavior:'smooth',block:'center'});el.focus();}}},
  {keys:['depot','depots','origine','origines'],label:'Dépôt / Origine',
   highlight(){const el=document.querySelector('.fpill-orig');if(el)el.closest('div')?.scrollIntoView({behavior:'smooth',block:'center'});}},
  {keys:['usine','usines'],label:'N° Usine',
   highlight(){const el=document.getElementById('f-usine');if(el){el.scrollIntoView({behavior:'smooth',block:'center'});el.focus();}}},
  {keys:['type','types'],label:'Type de papier',
   highlight(){const el=document.getElementById('msd-type');if(el){el.scrollIntoView({behavior:'smooth',block:'center'});toggleMsd('msd-type');}}},
];
function _matchFilterIntent(normTok){
  if(normTok.length<3)return null;
  for(const fi of FILTER_INTENTS){
    for(const key of fi.keys){
      if(normTok===key)return fi;
      if(normTok.length>=4&&key.startsWith(normTok))return fi;
      if(normTok.length>=5&&normTok.startsWith(key))return fi;
    }
  }
  return null;
}
function _applyFilterIntent(fi){
  const inp=document.getElementById('search-input');
  if(inp){inp.value='';hideSuggestions();}
  filterProducts();
  requestAnimationFrame(()=>setTimeout(()=>fi.highlight(),200));
}

// Simple French stemmer for search tolerance
function _stem(w){
  if(w.length<=4)return w;
  const sfx=[
    ['ations','at'],['ation','at'],
    ['ements',''],['ement',''],
    ['issants','iss'],['issant','iss'],
    ['tions','tion'],
    ['eurs','eur'],['euse','eux'],
    ['ées','e'],['ées',''],
    ['aux','al'],
    ['ées','ee'],
    ['iers','ier'],
    ['ices','ice'],
    ['ues','u'],
    ['es',''],['er',''],['s','']
  ];
  for(const [suf,rep] of sfx){
    if(w.length>suf.length+3&&w.endsWith(suf))return w.slice(0,-suf.length)+rep;
  }
  return w;
}

// ============ FUZZY SEARCH (client-side fallback) ============
// Colonnes réellement consommées par rowToUi (évite select=* — payload gonflé).
const SEL_UI='ref,quality,color,details,gsm,width,longueur,noyau,weight,price,usine,emplacement,zone,format,image_url,reserve_client,promo,id';
let _allProductsCache=null,_allProductsLoading=null;
// Jour de stock effectif : l'import remplace la base à ~8h15 Paris — avant
// 8h30 le stock est encore celui de la veille (clé de cache facettes).
const STOCK_DAY=(()=>{try{
  const p=new Date(new Date().toLocaleString('en-US',{timeZone:'Europe/Paris'}));
  if(p.getHours()<8||(p.getHours()===8&&p.getMinutes()<30))p.setDate(p.getDate()-1);
  return p.toISOString().slice(0,10);
}catch(_){return new Date().toISOString().slice(0,10);}})();
async function _loadAllProducts(){
  if(_allProductsCache)return _allProductsCache;
  if(_allProductsLoading)return _allProductsLoading;
  _allProductsLoading=(async()=>{
    // CACHE JOURNALIER (perf 19/07) : le stock ne change qu'à l'import du
    // matin — 3,4 Mo de JSON économisés à chaque visite suivante.
    // v2 : purge les caches bâtis avant l'exclusion Photo_BU* (20/07)
    const CK='prodi_facets:v3:'+STOCK_DAY; // v3 = prix max(PUNET,AR_PRIXVEN) du 04/08 (réimport manuel intrajour)
    try{
      const hit=localStorage.getItem(CK);
      if(hit){const rows=JSON.parse(hit);if(Array.isArray(rows)&&rows.length>100){_allProductsCache=rows;return rows;}}
    }catch(_){}
    const CHUNK=1000;
    // Colonnes = celles de rowToUi (le fuzzy-fallback réutilise ce cache) —
    // on ne laisse dehors que created_at/source/reserve_piece.
    const SEL='select=ref,quality,color,details,gsm,width,longueur,noyau,weight,price,usine,emplacement,zone,format,image_url,reserve_client,promo,id';
    // Pages en PARALLÈLE (l'un après l'autre prenait 8 allers-retours).
    const pages=await Promise.all(Array.from({length:10},(_,i)=>
      sbQ('products?'+SEL,{headers:{'Range-Unit':'items','Range':(i*CHUNK)+'-'+(i*CHUNK+CHUNK-1)}})
        .then(r=>r.data||[]).catch(()=>[])));
    let all=pages.flat();
    {
      // stocke pour les prochaines visites du jour (quota dépassé = tant pis)
      try{
        Object.keys(localStorage).filter(k=>k.startsWith('prodi_facets:')&&k!==CK).forEach(k=>localStorage.removeItem(k));
        localStorage.setItem(CK,JSON.stringify(all));
      }catch(_){}
      _allProductsCache=all;
      return all;
    }
    let offset=0;
    for(let i=0;i<20;i++){
      const to=offset+CHUNK-1;
      const r=await sbQ('products?'+SEL,{headers:{'Range-Unit':'items','Range':offset+'-'+to}});
      const rows=r.data||[];
      all=all.concat(rows);
      if(rows.length<CHUNK)break;
      offset+=CHUNK;
    }
    _allProductsCache=all.map(p=>{
      const hay=_norm([p.quality,p.color,p.details,p.ref,p.usine,p.emplacement,p.format,
        p.gsm?p.gsm+' gsm g/m2':'',p.width?p.width+' mm':'',p.longueur?p.longueur+' mm':''
      ].filter(Boolean).join(' ')).replace(/×/g,'x').replace(/g\/m2/g,' gsm ').replace(/\s+/g,' ').trim();
      return Object.assign({},p,{_hay:hay});
    });
    return _allProductsCache;
  })();
  return _allProductsLoading;
}
function _lev(a,b){
  const m=a.length,n=b.length;
  if(Math.abs(m-n)>2)return 99;
  if(!m)return n; if(!n)return m;
  const dp=new Array(n+1);
  for(let j=0;j<=n;j++)dp[j]=j;
  for(let i=1;i<=m;i++){
    let prev=dp[0]; dp[0]=i; let rowMin=dp[0];
    for(let j=1;j<=n;j++){
      const tmp=dp[j];
      dp[j]=a[i-1]===b[j-1]?prev:1+Math.min(prev,dp[j],dp[j-1]);
      prev=tmp; if(dp[j]<rowMin)rowMin=dp[j];
    }
    if(rowMin>2)return 99;
  }
  return dp[n];
}
function _scoreProduct(qRaw,qTerms,qNums,p){
  const hay=p._hay||'';
  const refN=_norm(p.ref||'');
  let score=0;
  if(refN===qRaw)return 10000;
  if(qRaw.length>=4&&refN.includes(qRaw))score+=500;
  if(qRaw.length>=3&&hay.includes(qRaw))score+=100;
  // Numeric dimension matching: query numbers against gsm/width/longueur
  if(qNums&&qNums.length){
    for(const n of qNums){
      if(p.gsm===n)score+=60;
      if(p.width===n)score+=60;
      if(p.longueur===n)score+=60;
    }
  }
  const words=hay.split(' ');
  for(const t of qTerms){
    if(t.length<2)continue;
    if(/^\d+$/.test(t))continue; // numeric terms handled above
    if(hay.includes(t)){score+=30;continue;}
    let matched=false,bestD=99;
    for(const w of words){
      if(w.length<3)continue;
      if(t.length>=3&&w.startsWith(t)){score+=20;matched=true;break;}
      if(Math.abs(w.length-t.length)<=2){
        const d=_lev(t,w);
        if(d<bestD)bestD=d;
        if(bestD===1)break;
      }
    }
    if(matched)continue;
    if(bestD===1&&t.length>=3)score+=15;
    else if(bestD===2&&t.length>=5)score+=10;
  }
  return score;
}
function _clientFilterMatch(p,f){
  if(f.gsm_min&&(p.gsm||0)<f.gsm_min)return false;
  if(f.gsm_max&&(p.gsm||0)>f.gsm_max)return false;
  if(f.width_min&&(p.width||0)<f.width_min)return false;
  if(f.width_max&&(p.width||0)>f.width_max)return false;
  if(f.longmin&&(p.longueur||0)<f.longmin)return false;
  if(f.longmax&&(p.longueur||0)>f.longmax)return false;
  if(f.wmin&&(p.weight||0)<f.wmin)return false;
  if(f.wmax&&(p.weight||0)>f.wmax)return false;
  if(f.quality_in&&f.quality_in.length&&!f.quality_in.includes(p.quality))return false;
  if(f.color_in&&f.color_in.length&&!f.color_in.includes(p.color))return false;
  if(f.format_in&&f.format_in.length&&!f.format_in.includes(p.format))return false;
  if(f.noyau_in&&f.noyau_in.length&&!f.noyau_in.includes(String(p.noyau||'')))return false;
  if(f.refCode&&!String(p.quality||'').toUpperCase().startsWith(f.refCode))return false;
  if(f.usineVal&&String(p.usine||'')!==f.usineVal)return false;
  if(f.zoneNum||f.zoneLet){const z=(p.zone||'').toUpperCase();if(f.zoneNum&&f.zoneLet){if(!z.startsWith(f.zoneNum+f.zoneLet))return false;}else if(f.zoneNum){if(!z.startsWith(f.zoneNum))return false;}else if(f.zoneLet){if(!z.includes(f.zoneLet))return false;}}
  return true;
}
async function _fuzzyFallback(query,filters){
  let qRaw=_norm(query).replace(/×/g,'x').replace(/g\/m2/g,' ').replace(/\s+/g,' ').trim();
  if(!qRaw)return [];
  // Split number+unit patterns: "90g"→"90 g", "880mm"→"880 mm"; split dimensions: "880x630"→"880 x 630"
  qRaw=qRaw.replace(/(\d)(x)(\d)/g,'$1 $2 $3').replace(/(\d)([a-z]+)/g,'$1 $2').replace(/\s+/g,' ').trim();
  const qTerms=qRaw.split(/\s+/).filter(t=>t.length>0);
  const qNums=qTerms.filter(t=>/^\d+$/.test(t)&&t.length>=2).map(Number);
  const products=await _loadAllProducts();
  const scored=[];
  for(const p of products){
    if(!_clientFilterMatch(p,filters))continue;
    const s=_scoreProduct(qRaw,qTerms,qNums,p);
    if(s>=10)scored.push([s,p]);
  }
  scored.sort((a,b)=>b[0]-a[0]);
  // Strip the _hay helper so fuzzy results have the exact same shape as server rows
  return scored.slice(0,100).map(x=>{const {_hay,...row}=x[1];return row;});
}
// ============ END FUZZY SEARCH ============

// Equivalence groups — for "Voir aussi" suggestions
const EQUIV_GROUPS=[
  ['Couché 2 faces','Couché 1 face','LWC','Luxe','SBS'],
  ['Couché 1 face','Couché 2 faces','LWC','Silicone-Glassine','Luxe'],
  ['LWC','Couché 2 faces','Couché 1 face','Offset','Luxe'],
  ['Luxe','Couché 2 faces','LWC','SBS','Couché 1 face'],
  ['Offset','Bouffant','Journal','Couché 2 faces','LWC'],
  ['Bouffant','Offset','Journal','Kraft','Emballage'],
  ['Kraft','Emballage','Liner','Bouffant','Kraft armé'],
  ['Kraft armé','Kraft','Complexe','Emballage','Liner'],
  ['Kraft gomme','Kraft','Adhésif','Emballage'],
  ['Emballage','Kraft','Liner','Bouffant','Papier cadeau'],
  ['Liner','Kraft','Emballage','Bouffant','Carton non couché'],
  ['SBS','Carton couché','Carton non couché','Couché 2 faces','Luxe'],
  ['Carton couché','SBS','Carton non couché','Couché 2 faces','Luxe'],
  ['Carton non couché','SBS','Carton couché','Liner','Bouffant'],
  ['Thermique','Autocopiant','Adhésif','Silicone-Glassine'],
  ['Autocopiant','Thermique','Adhésif','Silicone-Glassine'],
  ['Adhésif','Silicone-Glassine','Thermique','Autocopiant'],
  ['Silicone-Glassine','Adhésif','Thermique','Autocopiant','Complexe'],
  ['Ouate','Emballage','Papier cadeau','Kraft'],
  ['Journal','Offset','Bouffant','LWC'],
  ['Papier affiche','Offset','Couché 2 faces','LWC'],
  ['Papier cadeau','Kraft','Emballage','Ouate'],
  ['Complexe','Adhésif','Silicone-Glassine','Kraft armé'],
  ['Enveloppes','Offset','Couché 2 faces','Kraft'],
  ['Ramette','Offset','Couché 2 faces','Bouffant'],
];
function getEquivTypes(typeDisplay){
  const grp=EQUIV_GROUPS.find(g=>g.includes(typeDisplay));
  return grp?grp.filter(t=>t!==typeDisplay):[];
}

// Comprehensive alias map: normalized term → {kind, display, codes}
const ALIAS_MAP=(()=>{
  const m=new Map();
  const t=(alias,display)=>m.set(_norm(alias),{kind:'type',display,codes:TYPE_MAP[display]||[]});
  const c=(alias,display)=>m.set(_norm(alias),{kind:'color',display,codes:[]});
  const f=(alias,display)=>m.set(_norm(alias),{kind:'format',display,codes:[]});
  // ── Kraft ──
  t('kraft','Kraft'); t('brown paper','Kraft'); t('sack paper','Kraft');
  t('papier emballage','Kraft'); t('papier d emballage','Kraft'); t('wrapping','Kraft');
  t('natural kraft','Kraft'); t('papier brun','Kraft'); t('bags','Kraft');
  t('kraft arme','Kraft armé'); t('reinforced kraft','Kraft armé'); t('kraft renforce','Kraft armé');
  t('kraft gomme','Kraft gomme'); t('gummed kraft','Kraft gomme'); t('gummed tape','Kraft gomme');
  // ── Coated ──
  t('coated','Couché 2 faces'); t('couche','Couché 2 faces'); t('couchee','Couché 2 faces');
  t('coated paper','Couché 2 faces'); t('c2s','Couché 2 faces'); t('double couche','Couché 2 faces');
  t('2 faces','Couché 2 faces'); t('deux faces','Couché 2 faces'); t('brillant','Couché 2 faces');
  t('coated one side','Couché 1 face'); t('c1s','Couché 1 face'); t('1 face','Couché 1 face');
  t('une face','Couché 1 face'); t('couche 1 face','Couché 1 face'); t('one side','Couché 1 face');
  // ── LWC ──
  t('lwc','LWC'); t('light weight coated','LWC'); t('lightweight coated','LWC');
  t('magazine paper','LWC'); t('papier magazine','LWC'); t('sc paper','LWC');
  t('super calendered','LWC'); t('rotogravure','LWC');
  // ── Offset / uncoated woodfree ──
  t('woodfree','Offset'); t('wood free','Offset'); t('wf','Offset');
  t('uncoated','Offset'); t('non couche','Offset'); t('papier offset','Offset');
  t('ufwf','Offset'); t('offset paper','Offset'); t('printing paper','Offset');
  t('papier impression','Offset'); t('papier copie','Offset'); t('copy paper','Offset');
  // ── Bouffant ──
  t('bouffant','Bouffant'); t('bulky','Bouffant'); t('bible paper','Bouffant');
  t('bible','Bouffant'); t('papier bible','Bouffant'); t('high bulk','Bouffant');
  // ── SBS / Carton boards ──
  t('sbs','SBS'); t('solid bleached','SBS'); t('solid bleached board','SBS');
  t('gc1','SBS'); t('gc2','SBS'); t('carton blanc','SBS'); t('white board','SBS');
  t('fbb','Carton couché'); t('folding boxboard','Carton couché'); t('carton couche','Carton couché');
  t('carton plie','Carton couché'); t('folding carton','Carton couché'); t('wb','Carton couché');
  t('gd1','Carton non couché'); t('gd2','Carton non couché'); t('carton gris','Carton non couché');
  t('grey board','Carton non couché'); t('grayboard','Carton non couché'); t('chip board','Carton non couché');
  t('carton non couche','Carton non couché');
  // ── Liner / Testliner ──
  t('liner','Liner'); t('testliner','Liner'); t('test liner','Liner');
  t('kraftliner','Liner'); t('white top','Liner'); t('whitetop','Liner');
  t('top liner','Liner'); t('recycled liner','Liner'); t('occ liner','Liner');
  // ── Thermique ──
  t('thermal','Thermique'); t('thermo','Thermique'); t('thermal paper','Thermique');
  t('papier thermique','Thermique'); t('receipt paper','Thermique'); t('pos paper','Thermique');
  t('caisse','Thermique'); t('ticket','Thermique');
  // ── Ouate / Tissue ──
  t('tissue','Ouate'); t('tissue paper','Ouate'); t('hygienique','Ouate');
  t('mouchoir','Ouate'); t('essuie tout','Ouate'); t('serviette','Ouate');
  // ── Silicone / Glassine ──
  t('silicone','Silicone-Glassine'); t('glassine','Silicone-Glassine');
  t('release paper','Silicone-Glassine'); t('siliconise','Silicone-Glassine');
  t('antiadhesif','Silicone-Glassine'); t('release liner','Silicone-Glassine');
  // ── Autocopiant ──
  t('carbonless','Autocopiant'); t('ncr','Autocopiant'); t('no carbon','Autocopiant');
  t('no carbon required','Autocopiant'); t('papier autocopiant','Autocopiant');
  t('carbonless paper','Autocopiant'); t('sans carbone','Autocopiant');
  // ── Journal ──
  t('newsprint','Journal'); t('newspaper','Journal'); t('papier journal','Journal');
  t('news','Journal'); t('journal paper','Journal');
  // ── Adhésif ──
  t('adhesive','Adhésif'); t('self adhesive','Adhésif'); t('etiquette','Adhésif');
  t('label paper','Adhésif'); t('sticker','Adhésif'); t('label','Adhésif');
  t('psa','Adhésif'); t('pressure sensitive','Adhésif');
  // ── Luxe ──
  t('luxury','Luxe'); t('cast coated','Luxe'); t('art paper','Luxe');
  t('papier art','Luxe'); t('chromo','Luxe'); t('high gloss','Luxe');
  // ── Complexe ──
  t('complex','Complexe'); t('laminated','Complexe'); t('lamine','Complexe');
  t('composite','Complexe'); t('multi layer','Complexe'); t('complexe','Complexe');
  // ── Emballage ──
  t('packaging','Emballage'); t('emballage','Emballage'); t('wrapping paper','Emballage');
  t('papier cadeau','Papier cadeau'); t('gift wrap','Papier cadeau'); t('cadeau','Papier cadeau');
  t('poster','Papier affiche'); t('affiche','Papier affiche'); t('display','Papier affiche');
  // ── Liner (ondulé / corrugated) ──
  t('fluting','Liner'); t('cannelure','Liner'); t('ondule','Liner');
  t('corrugated','Liner'); t('medium','Liner'); t('occ','Liner');
  t('vieux papier','Kraft'); t('demi chimique','Liner'); t('mi chimique','Liner');
  t('recycle','Kraft'); t('recycled','Kraft'); t('recyclee','Kraft');
  // ── Autres / aluminium ──
  t('alu','Autres'); t('aluminium','Autres'); t('aluminum','Autres');
  t('foil','Autres'); t('menager','Autres'); t('aluminise','Autres');
  t('plastique','Autres'); t('polyethylene','Autres'); t('pe','Autres');
  t('filet','Autres'); t('nontisse','Autres'); t('non tisse','Autres');
  // ── Industry codes courts ──
  t('nc','Offset'); t('mf','Offset'); t('ufwf','Offset'); t('wfum','Offset');
  t('sc','LWC'); t('glu','LWC'); t('mfc','Couché 2 faces');
  t('ub','Kraft'); t('bkp','Kraft'); t('us','Kraft'); t('mg','Kraft');
  t('machine glaze','Kraft'); t('glassine','Kraft');
  t('gd1','Carton non couché'); t('ws','Carton non couché');
  t('duplex','Carton couché'); t('triplex','Carton couché'); t('bristol','SBS');
  t('carte postale','SBS'); t('postcard','SBS'); t('ivoire board','SBS');
  t('ns','Autocopiant'); t('cb','Autocopiant'); t('cfb','Autocopiant'); t('cf','Autocopiant');
  // ── Couleur splits ──
  t('offset couleur','Offset Couleur'); t('papier couleur','Offset Couleur');
  t('colored paper','Offset Couleur'); t('coloured paper','Offset Couleur');
  t('couleur','Offset Couleur'); t('color paper','Offset Couleur');
  t('dossier couleur','Dossier Couleur'); t('carton couleur','Dossier Couleur');
  t('colored board','Dossier Couleur'); t('coloured board','Dossier Couleur');
  t('colour board','Dossier Couleur'); t('color board','Dossier Couleur');
  // ── Colors EN/FR ──
  c('white','Blanc'); c('blanc','Blanc'); c('blanchi','Blanc'); c('bleached','Blanc');
  c('brown','Brun'); c('brun','Brun'); c('naturel','Brun'); c('nature','Brun');
  c('black','Noir'); c('noir','Noir');
  c('grey','Gris'); c('gray','Gris'); c('gris','Gris'); c('grise','Gris');
  c('ivory','Ivoire'); c('cream','Ivoire'); c('ivoire','Ivoire'); c('creme','Ivoire');
  c('ecru','Ivoire'); c('beige','Ivoire'); c('blanc casse','Ivoire');
  c('green','Vert'); c('vert','Vert');
  c('red','Rouge'); c('rouge','Rouge');
  c('blue','Bleu'); c('bleu','Bleu');
  c('yellow','Jaune'); c('jaune','Jaune');
  c('orange','Orange');
  c('silver','Argent'); c('argent','Argent'); c('argente','Argent');
  c('rose','Rose'); c('pink','Rose');
  c('violet','Violet'); c('purple','Violet');
  c('divers','Divers'); c('multicolor','Divers'); c('various','Divers');
  // ── Formats EN/FR ──
  f('reel','Bobine'); f('roll','Bobine'); f('rolls','Bobine'); f('bobine','Bobine');
  f('bobines','Bobine'); f('en bobine','Bobine'); f('en rouleau','Bobine'); f('rouleau','Bobine');
  f('sheet','Palette'); f('sheets','Palette'); f('pallet','Palette'); f('skid','Palette');
  f('feuille','Palette'); f('feuilles','Palette'); f('palette','Palette');
  f('rame','Palette'); f('rames','Palette'); f('fardeau','Palette');
  f('en feuille','Palette'); f('en palette','Palette');
  f('format','Palette'); f('formats','Palette');

  // ════════ USE-CASE THESAURUS — semantic-ish search ════════
  // ── Sacs / cornets / sachets ──
  t('sac','Kraft'); t('sac kraft','Kraft'); t('sac papier','Kraft'); t('paper bag','Kraft');
  t('sachet','Kraft'); t('sachet papier','Kraft'); t('cornet','Kraft'); t('paper cone','Kraft');
  t('sac boulangerie','Kraft'); t('sac pain','Kraft'); t('bread bag','Kraft');
  t('sac alimentaire','Kraft'); t('sac kraft brun','Kraft'); t('sac course','Kraft');
  t('sac shopping','Kraft'); t('shopping bag','Kraft'); t('sac luxe','Luxe');
  // ── Boîtes / cartons d'emballage ──
  t('boite pizza','Liner'); t('boite a pizza','Liner'); t('pizza box','Liner');
  t('boite carton','Liner'); t('cardboard box','Liner'); t('caisse americaine','Liner');
  t('caisse carton','Liner'); t('carton demenagement','Liner'); t('moving box','Liner');
  t('boite ondulee','Liner'); t('carton ondule','Liner'); t('ondulé','Liner');
  t('cardboard','Carton couché'); t('boite alimentaire','SBS'); t('food box','SBS');
  t('boite gateau','SBS'); t('cake box','SBS'); t('boite patisserie','SBS');
  t('boite oeuf','Carton non couché'); t('egg carton','Carton non couché');
  t('plateau','Carton couché'); t('plateau alimentaire','Carton couché');
  // ── Imprimés commerciaux ──
  t('flyer','Couché 2 faces'); t('flyers','Couché 2 faces'); t('depliant','Couché 2 faces');
  t('depliants','Couché 2 faces'); t('plaquette','Couché 2 faces'); t('brochure','Couché 2 faces');
  t('brochures','Couché 2 faces'); t('catalogue','Couché 2 faces'); t('catalog','LWC');
  t('tract','Offset'); t('newsletter','Offset'); t('prospectus','Couché 2 faces');
  t('publicite','Couché 2 faces'); t('mailing','Offset'); t('publipostage','Offset');
  // ── Édition / livres ──
  t('livre','Bouffant'); t('book','Bouffant'); t('roman','Bouffant');
  t('manuel','Bouffant'); t('textbook','Bouffant'); t('paperback','Bouffant');
  t('couverture livre','Couché 1 face'); t('book cover','Couché 1 face');
  t('jaquette','Couché 1 face'); t('cover','Couché 1 face');
  t('agenda','Bouffant'); t('cahier','Offset'); t('notebook','Offset');
  t('bloc note','Offset'); t('bloc notes','Offset'); t('notepad','Offset');
  // ── Cartes / faire-part ──
  t('carte de visite','SBS'); t('business card','SBS'); t('cdv','SBS');
  t('faire part','SBS'); t('wedding invitation','SBS'); t('invitation','SBS');
  t('menu','SBS'); t('menu carton','SBS'); t('cartoline','SBS'); t('cartolina','SBS');
  t('cardstock','SBS'); t('cover paper','SBS'); t('tag','SBS'); t('index','SBS');
  // ── Calendriers / posters / luxe ──
  t('calendrier','Couché 2 faces'); t('calendar','Couché 2 faces');
  t('poster luxe','Luxe'); t('photo print','Luxe'); t('papier photo','Luxe');
  t('tirage photo','Luxe'); t('high gloss paper','Luxe');
  // ── Bureautique ──
  t('photocopie','Ramette'); t('photocopieuse','Ramette'); t('photocopy','Ramette');
  t('a4','Ramette'); t('a3','Ramette'); t('papier a4','Ramette'); t('papier bureau','Ramette');
  t('papier impression bureau','Ramette'); t('imprimante','Offset'); t('printer paper','Offset');
  t('imprimante laser','Offset'); t('imprimante jet d encre','Offset');
  t('bond paper','Offset'); t('vellum','Offset'); t('verge','Offset'); t('velin','Offset');
  // ── Étiquettes / codes-barres ──
  t('etiquette adhesive','Adhésif'); t('etiquettes adhesives','Adhésif');
  t('etiquette logistique','Adhésif'); t('etiquette prix','Adhésif'); t('price label','Adhésif');
  t('code barre','Adhésif'); t('barcode','Adhésif'); t('rouleau etiquette','Adhésif');
  t('etiquette autocollante','Adhésif'); t('autocollant','Adhésif');
  // ── Tickets / reçus / caisse ──
  t('ticket de caisse','Thermique'); t('ticket caisse','Thermique'); t('receipt','Thermique');
  t('cb roll','Thermique'); t('rouleau caisse','Thermique'); t('terminal paiement','Thermique');
  t('tpe','Thermique'); t('cb','Thermique'); t('atm paper','Thermique'); t('rouleau tpe','Thermique');
  t('reçu','Thermique'); t('recu','Thermique');
  // ── Cuisson / alimentaire ──
  t('papier cuisson','Cuisson'); t('papier sulfurise','Cuisson'); t('parchment','Cuisson');
  t('parchment paper','Cuisson'); t('baking paper','Cuisson'); t('papier patisserie','Cuisson');
  t('greaseproof','Cuisson'); t('papier ingraissable','Cuisson'); t('papier four','Cuisson');
  t('plaque cuisson','Cuisson'); t('caissette','Cuisson'); t('moule papier','Cuisson');
  // ── Hygiène / domestique ──
  t('papier toilette','Ouate'); t('toilet paper','Ouate'); t('pq','Ouate');
  t('papier wc','Ouate'); t('serviette papier','Ouate'); t('paper napkin','Ouate');
  t('nappe papier','Ouate'); t('paper tablecloth','Ouate'); t('lingette','Ouate');
  t('industrial wiper','Ouate'); t('wiper','Ouate'); t('chiffon papier','Ouate');
  t('air laid','Ouate'); t('airlaid','Ouate');
  // ── Cadeaux / décoration ──
  t('emballage cadeau','Papier cadeau'); t('papier emballage cadeau','Papier cadeau');
  t('gift paper','Papier cadeau'); t('gift wrapping','Papier cadeau');
  t('papier de soie','Bouffant'); t('papier soie','Bouffant'); t('tissue silk','Bouffant');
  t('papier crepon','Spécial'); t('crepe paper','Spécial');
  t('papier creatif','Luxe'); t('craft paper','Kraft');
  // ── Affiches / signalétique ──
  t('affichage','Papier affiche'); t('blueback','Papier affiche'); t('blue back','Papier affiche');
  t('white back','Papier affiche'); t('whiteback','Papier affiche');
  t('billboard paper','Papier affiche'); t('signage','Papier affiche');
  t('papier signaletique','Papier affiche'); t('panneau papier','Papier affiche');
  // ── Calque / spécial ──
  t('calque','Bouffant'); t('papier calque','Bouffant'); t('tracing paper','Bouffant');
  t('buvard','Bouffant'); t('blotting paper','Bouffant'); t('papier filtre','Spécial');
  t('filter paper','Spécial'); t('filtre cafe','Spécial'); t('coffee filter','Spécial');
  t('papier cigarette','Spécial'); t('cigarette paper','Spécial'); t('rolling paper','Spécial');
  t('mince','Bouffant'); t('papier mince','Bouffant'); t('papier fin','Bouffant');
  // ── Gobelets / packaging spécifique ──
  t('gobelet','Couché 1 face'); t('gobelet carton','Couché 1 face'); t('paper cup','Couché 1 face');
  t('verre carton','Couché 1 face'); t('cup stock','Couché 1 face');
  t('barquette','Carton couché'); t('barquette alimentaire','Carton couché');
  // ── Caractéristiques / propriétés ──
  t('mat','Couché 1 face'); t('matte','Couché 1 face'); t('matt','Couché 1 face');
  t('demi mat','Couché 2 faces'); t('semi mat','Couché 2 faces'); t('silk','Couché 2 faces');
  t('satin','Couché 2 faces'); t('satine','Couché 2 faces'); t('glossy','Couché 2 faces');
  t('gloss','Couché 2 faces'); t('high gloss','Luxe'); t('cast coated','Luxe');
  t('sulfate','Kraft'); t('sulphate','Kraft'); t('sulfaté','Kraft');
  t('pure pate','Kraft'); t('eco','Kraft'); t('ecologique','Kraft'); t('eco friendly','Kraft');
  t('compostable','Kraft'); t('biodegradable','Kraft'); t('fsc','Kraft'); t('pefc','Kraft');
  t('indechirable','Kraft armé'); t('tear resistant','Kraft armé'); t('renforce','Kraft armé');
  t('etanche','Complexe'); t('waterproof','Complexe'); t('impermeable','Complexe');
  t('barriere','Complexe'); t('barrier paper','Complexe'); t('grease barrier','Complexe');
  // ── Carton / industrie complémentaire ──
  t('greyback','Carton non couché'); t('grey back','Carton non couché');
  t('whiteback duplex','Carton couché'); t('manille','Carton couché'); t('manila','Carton couché');
  t('wlc','Carton couché'); t('white lined chipboard','Carton couché');
  t('coated duplex','Carton couché'); t('triplex','Carton couché');
  // ── Liner / ondulé complémentaire ──
  t('white top kraftliner','Liner'); t('wtkl','Liner'); t('wtl','Liner');
  t('flute','Liner'); t('cannelure simple','Liner'); t('cannelure double','Liner');
  // ── Plastique / aluminium / divers ──
  t('film','Plastique'); t('film alimentaire','Plastique'); t('cling film','Plastique');
  t('papier alu','Plastique'); t('aluminum foil','Plastique'); t('papier paraffine','Cuisson');
  t('paraffine','Cuisson'); t('wax paper','Cuisson');
  // ── Encres / consommables ──
  t('encre','Encre'); t('ink','Encre'); t('cartouche','Encre'); t('toner','Encre');
  // ── Enveloppes ──
  t('enveloppe','Enveloppes'); t('envelopes','Enveloppes'); t('pli','Enveloppes');
  t('enveloppe kraft','Enveloppes'); t('enveloppe a fenetre','Enveloppes');
  t('window envelope','Enveloppes'); t('manila envelope','Enveloppes');
  // ── Industriel / autocopiant ──
  t('bon de livraison','Autocopiant'); t('bon livraison','Autocopiant'); t('bl','Autocopiant');
  t('facture autocopiante','Autocopiant'); t('liasse','Autocopiant');
  t('formulaire','Autocopiant'); t('multi part form','Autocopiant');
  // ── Couleurs spécifiques (tons demandés) ──
  c('marron','Brun'); c('chocolat','Brun'); c('chocolate','Brun');
  c('sable','Ivoire'); c('sand','Ivoire');
  c('turquoise','Bleu'); c('marine','Bleu'); c('navy','Bleu'); c('ciel','Bleu');
  c('emeraude','Vert'); c('olive','Vert'); c('kaki','Vert'); c('khaki','Vert');
  c('bordeaux','Rouge'); c('grenat','Rouge'); c('framboise','Rouge'); c('corail','Orange');
  c('saumon','Rose'); c('fuchsia','Rose'); c('magenta','Rose');
  c('moutarde','Jaune'); c('citron','Jaune'); c('safran','Jaune');
  c('lavande','Violet'); c('lilas','Violet'); c('mauve','Violet'); c('parme','Violet');
  c('anthracite','Noir'); c('charbon','Noir'); c('charcoal','Noir');
  c('argent metallise','Argent'); c('or metallise','Argent'); c('gold','Argent');
  c('cuivre','Brun'); c('copper','Brun');

  return m;
})();

const SEARCH_VOCAB=(()=>{
  const v=[];
  for(const[k,codes]of Object.entries(TYPE_MAP))v.push({display:k,norm:_norm(k),codes,kind:'type'});
  for(const c of['Blanc','Très blanc','Blanc nature','Brun','Crème','Ivoire','Gris','Noir','Transparent','Vert','Rouge','Bleu','Jaune','Orange','Argent','Rose','Or','Violet'])v.push({display:c,norm:_norm(c),kind:'color'});
  for(const f of['Bobine','Palette'])v.push({display:f,norm:f.toLowerCase(),kind:'format'});
  return v;
})();

function fuzzyVocab(tok){
  // 1. Exact alias match
  if(ALIAS_MAP.has(tok))return{match:ALIAS_MAP.get(tok),dist:0};
  // 2. Exact vocab match
  const exact=SEARCH_VOCAB.find(v=>v.norm===tok);
  if(exact)return{match:exact,dist:0};
  // 3. Prefix match in vocab (e.g. "couche" → "Couché 2 faces")
  if(tok.length>=4){
    const pre=SEARCH_VOCAB.find(v=>v.norm.startsWith(tok));
    if(pre)return{match:pre,dist:1};
    // Also check if vocab entry starts with token's first word
    const firstWord=tok.split(' ')[0];
    if(firstWord.length>=4){
      const pre2=SEARCH_VOCAB.find(v=>v.norm.startsWith(firstWord));
      if(pre2)return{match:pre2,dist:1};
    }
  }
  // 4. Fuzzy match against alias keys
  // Tokens ≤2 chars: require exact match (already handled above) — no fuzzy
  if(tok.length<=2)return null;
  const maxDist=tok.length<=4?1:tok.length<=6?1:tok.length<=9?2:3;
  let best=null,bestDist=Infinity,bestIsAlias=false;
  for(const[k,v]of ALIAS_MAP){const d=lev(tok,k);if(d<bestDist){bestDist=d;best=v;bestIsAlias=true;}}
  // 5. Fuzzy match against vocab norms
  for(const v of SEARCH_VOCAB){const d=lev(tok,v.norm);if(d<bestDist){bestDist=d;best=v;bestIsAlias=false;}}
  return bestDist<=maxDist?{match:best,dist:bestDist}:null;
}
// =========================

function typesToQualityCodes(selectedTypes){
  const codes=new Set();
  for(const t of selectedTypes)(TYPE_MAP[t]||[]).forEach(c=>codes.add(c));
  return [...codes];
}
const toast=(m,d=3000)=>{
  // Pas de popups par-dessus la conversation PRODIX : le fil suffit (18/07)
  const _ph=document.getElementById('prodix-hero');
  if(_ph&&_ph.classList.contains('phero-convo')&&_ph.style.display!=='none')return;
  const e=document.getElementById('toast');if(document.body.classList.contains('apple-view'))m=String(m).replace(/^✅\s*/,'✓ ').replace(/^🗑️\s*/,'').replace(/^📦\s*/,'');e.textContent=m;e.classList.add('show');setTimeout(()=>e.classList.remove('show'),d);};
const sp=v=>document.getElementById('spinner').classList.toggle('show',v);

// Map DB row (new schema) -> UI object (expected by existing template)
// Nettoie les couleurs bilingues "BLANC / WHITE" → "Blanc"
// Reverse: display label → liste exacte des valeurs DB
const _COLOR_DB={
  'Blanc':       ['BLANC / WHITE','BLANC'],
  'Très blanc':  ['TRES BLANC / VERY WHITE','TRÈS BLANC / VERY WHITE','TRES BLANC'],
  'Blanc nature':['BLANC NATURE / NATURAL WHITE'],
  'Brun':        ['BRUN / BROWN','BRUN','BRUN FONCE / DARK BROWN'],
  'Crème':       ['CREME / CREAMS'],
  'Ivoire':      ['IVOIRE / IVORY'],
  'Gris':        ['GRIS / GREY'],
  'Noir':        ['NOIR / BLACK'],
  'Transparent': ['TRANSPARENT','TRANSPARENT PET'],
  'Vert':        ['VERT / GREEN','VERT','VERT FONCÉ / DARK GREEN'],
  'Rouge':       ['ROUGE / RED','ROUGE'],
  'Bleu':        ['BLEU / BLUE','BLEU','BLEU FONCÉ / DARK BLUE'],
  'Jaune':       ['JAUNE / YELLOW','JAUNE'],
  'Orange':      ['ORANGE / ORANGE'],
  'Argent':      ['ARGENT / SILVER'],
  'Rose':        ['ROSE / PINK','ROSE','SAUMON / SALMON','SAUMON'],
  'Or':          ['GOLD/DORE'],
  'Violet':      ['VIOLET / PURPLE'],
  'Autres':      ['DIVERS / VARIOUS','CHAMOIS','BULLE/BUBBLE'],
};
// Reverse-map couleur DB → option (construite UNE fois) pour le comptage O(lignes).
const _COLOR_REV=(()=>{const m={};for(const opt in _COLOR_DB)for(const dbc of _COLOR_DB[opt])m[dbc]=opt;return m;})();
const _COLOR_NORM={
  'BLANC / WHITE':'Blanc','BRUN / BROWN':'Brun','IVOIRE / IVORY':'Ivoire',
  'BLANC NATURE / NATURAL WHITE':'Blanc nature',
  'TRES BLANC / VERY WHITE':'Très blanc','TRÈS BLANC / VERY WHITE':'Très blanc',
  'DIVERS / VARIOUS':'Autres','GRIS / GREY':'Gris','TRANSPARENT':'Transparent',
  'JAUNE / YELLOW':'Jaune','ARGENT / SILVER':'Argent','BLEU / BLUE':'Bleu',
  'ROUGE / RED':'Rouge','VERT / GREEN':'Vert','NOIR / BLACK':'Noir',
  'ORANGE / ORANGE':'Orange','ROSE / PINK':'Rose','VIOLET / PURPLE':'Violet',
  'GOLD/DORE':'Or','CREME / CREAMS':'Crème','SAUMON / SALMON':'Saumon',
  'BRUN FONCE / DARK BROWN':'Brun foncé','TRANSPARENT PET':'Transparent','BULLE/BUBBLE':'Bulle',
};
function simplCouleur(raw){
  if(!raw||raw==='-') return '';
  const up=raw.trim().toUpperCase().replace(/\s+/g,' ');
  if(_COLOR_NORM[up]) return _COLOR_NORM[up];
  // Fallback: prend la partie avant "/"
  const fr=raw.split('/')[0].trim();
  return fr.charAt(0).toUpperCase()+fr.slice(1).toLowerCase();
}

function rowToUi(r){
  const quality = r.quality || '';
  const color = simplCouleur(r.color || '');
  const details = r.details || '';
  const gsm = r.gsm ?? null;
  const width = r.width ?? null;
  const length = r.longueur ?? r.length ?? null;
  const weight = r.weight ?? null;
  const price = r.price ?? null;
  const ref = r.ref || '';
  const location = r.emplacement || r.location || '';
  // r.usine comes directly from DB (populated by import script from "REF QUALITÉ" column)
  // Fallback: parse from location string in case of legacy data
  const usine = r.usine || (location.match(/\bUSINE\s*(\d+)/i)||[])[1] || null;
  const image_url = r.image_url || '';

  // UI expects: name,type,grammage,largeur,poids_net,couleur,qualite,product_photos
  // Split on ' · ' or ' - - ' to get first clean segment, then title-case
  const _detMain=(()=>{
    if(!details) return '';
    const seg=details.split(/\s*[·]\s*|\s+-\s+-\s+/)[0].trim();
    if(!seg) return '';
    return seg.charAt(0).toUpperCase()+seg.slice(1).toLowerCase();
  })();
  // Split Couleur (RCOL/SCOL) into Offset vs Dossier per COULEUR_SPLIT.threshold
  const _typeLabel=(()=>{
    if(COULEUR_SPLIT.codes.includes(quality))
      return COULEUR_SPLIT.offsetLabel; // RCOL unifié 17/08 : plus de scission par grammage
    return Object.entries(TYPE_MAP).find(([,v])=>v.includes(quality))?.[0]||'';
  })();
  const name=_detMain||[_typeLabel,simplCouleur(color)].filter(Boolean).join(' — ')||(ref&&!ref.startsWith('Photo_')?ref:'Produit');
  const type = quality || 'Produit';

  return {
    promo:r.promo===true,
    ...r,
    fournisseur: r.fournisseur || '',
    origine: r.origine || '',
    format: r.type_produit || r.format || '',
    noyau: r.noyau || '',
    name,
    details,
    type,
    typeLabel: _typeLabel,
    grammage: gsm,
    largeur: width,
    longueur: length,
    poids_net: weight,
    couleur: color,
    qualite: quality,
    emplacement: location,
    allee: r.zone || '',
    zone: location,
    usine,
    image_url
  };
}

// ===== COMPARE =====
function cardWa(id){
  const p=all.find(x=>x.id===+id);
  if(!p)return;
  const msg=`Bonjour, je suis intéressé par : ${p.name}${p.grammage?' '+p.grammage+'g/m²':''}${p.largeur?' '+mmToCm(p.largeur)+'mm':''}${p.couleur?' '+p.couleur:''} — ${fmt(p.poids_net)} disponibles. Quel est votre prix ?`;
  window.prodiTrack?.('whatsapp_click',{via:'carte',ref:p.ref||null});
  window.open(`https://wa.me/${WA}?text=${encodeURIComponent(msg)}`,'_blank');
}
// ====================

function goHome(){
  window.open(location.pathname,'_self');
}



function showLoadProgress(done, total){
  const wrap=document.getElementById('load-bar-wrap');
  const bar=document.getElementById('load-bar');
  if(!wrap||!bar)return;
  wrap.style.display='block';
  const pct = total===0 ? 100 : Math.round((done/total)*100);
  bar.style.width=pct+'%';
}
function hideLoadProgress(){
  const wrap=document.getElementById('load-bar-wrap');
  const bar=document.getElementById('load-bar');
  if(!wrap||!bar)return;
  bar.style.width='100%';
  setTimeout(()=>{ wrap.style.display='none'; bar.style.width='0%'; },400);
}

async function init(){
  updateFilterVisibility();
  // Hardcoded filter options — Couleur replaced by Offset Couleur + Dossier Couleur
  const couleurVals=['Blanc','Très blanc','Blanc nature','Brun','Crème','Ivoire','Gris','Noir','Transparent','Vert','Rouge','Bleu','Jaune','Orange','Argent','Rose','Or','Violet','Autres'];
  // Format « CODE — Famille » (validé Ethan 21/07, retour à l'original).
  const _typeLabel=v=>`${v} — ${QUALITE_LABELS[v]||v}`; // RCOL unifié 17/08 (plus de scission Offset/Dossier)
  const _typeOrd=v=>{const i=_TYPE_ORDRE_USUEL.indexOf(v);return i===-1?999:i;};
  const _typesTries=[...QUALITE_CODES].sort((a,b)=>(_typeOrd(a)-_typeOrd(b))||String(a).localeCompare(String(b)));
  buildMsdOptions('msd-type',_typesTries,'Tous',_typeLabel);
  buildMsdOptions('sb-msd-type',_typesTries,'Type de papier',_typeLabel,'msd-type');
  buildMsdOptions('msd-couleur',couleurVals,'Couleurs');
  buildMsdOptions('sb-msd-couleur',couleurVals,'Couleurs',undefined,'msd-couleur');

  buildMsdOptions('msd-mandrin',['70','76','150','152'],'Mandrins',v=>v+' mm');
  buildMsdOptions('sb-msd-mandrin',['70','76','150','152'],'Mandrins',v=>v+' mm','msd-mandrin');
  buildMsdOptions('sb-msd-format',FORMAT_OPTIONS,'Dimensions',v=>v===FORMAT_AUTRES?'Autres dimensions':v,'msd-format');
  buildMsdOptions('sb-msd-grammage',GRAMMAGE_OPTIONS,'Grammages',v=>v===GRAMMAGE_AUTRES?'Autres grammages':v,'msd-grammage');
  _buildGrammageSlider('sb-msd-grammage');
  // Accordéon Grammages (17/08) : le bouton déplie/replie le curseur dans la carte.
  // ⚠️ DESKTOP seulement — sur téléphone on garde le menu déroulant d'origine
  // (toggleMsd), sinon le curseur ne s'ouvre plus du tout (bug 18/08).
  (function(){
    const g=document.getElementById('sb-msd-grammage');
    const btn=g&&g.querySelector('.msd-btn');
    if(btn){btn.setAttribute('onclick','');btn.onclick=e=>{
      e.stopPropagation();
      if(window.matchMedia('(max-width: 768px)').matches){toggleMsd('sb-msd-grammage');}
      else{g.classList.toggle('gsl-open');}
    };}
  })();
  buildMsdOptions('sb-msd-laize',LAIZE_OPTIONS,'Laizes',v=>v===LAIZE_AUTRES?'Autres laizes':v,'msd-laize');
  buildMsdOptions('sb-msd-diametre',DIAM_OPTIONS,'Diamètre',v=>v===DIAM_AUTRES?'Autres Ø':v,'msd-diametre');
  buildMsdOptions('sb-msd-poids',POIDS_OPTIONS,'Poids','msd-poids'===''?null:undefined,'msd-poids');

  // Also build mobile msd panels (msd-type-mob, msd-mandrin-mob, msd-couleur-mob)
  buildMsdOptions('msd-type-mob',QUALITE_CODES,'Type de papier',_typeLabel,'msd-type');
  buildMsdOptions('msd-couleur-mob',couleurVals,'Couleurs',null,'msd-couleur');
  buildMsdOptions('msd-mandrin-mob',['70','76','150','152'],'Mandrin',v=>v+' mm','msd-mandrin');
  buildMsdOptions('msd-format-mob',FORMAT_OPTIONS,'Dimensions',v=>v===FORMAT_AUTRES?'Autres dimensions':v,'msd-format');
  buildMsdOptions('msd-grammage-mob',GRAMMAGE_OPTIONS,'Grammages',v=>v===GRAMMAGE_AUTRES?'Autres grammages':v,'msd-grammage');
  _buildGrammageSlider('msd-grammage-mob');
  buildMsdOptions('msd-laize-mob',LAIZE_OPTIONS,'Laizes',v=>v===LAIZE_AUTRES?'Autres laizes':v,'msd-laize');
  buildMsdOptions('msd-diametre-mob',DIAM_OPTIONS,'Diamètre',v=>v===DIAM_AUTRES?'Autres Ø':v,'msd-diametre');
  buildMsdOptions('msd-poids-mob',POIDS_OPTIONS,'Poids',undefined,'msd-poids');
  // Laize/Ø/Poids en DOUBLE CURSEUR (28/08) dans « Filtres avancés » (desktop
  // via _paintAdv) + tiroir mobile.
  _initRangeSliderMenu('msd-laize-mob','laize');
  _initRangeSliderMenu('msd-diametre-mob','diam');
  _initRangeSliderMenu('msd-poids-mob','poids');

  // Pre-fill from URL params (coming from vitrine)
  const _urlParams = new URLSearchParams(window.location.search);
  const _urlQ = _urlParams.get('q');
  if(_urlQ){
    const si = document.getElementById('search-input');
    const sim = document.getElementById('search-input-mob');
    if(si) si.value = _urlQ;
    if(sim) sim.value = _urlQ;
  }
  const _urlType = _urlParams.get('type');
  if(_urlType && Object.prototype.hasOwnProperty.call(TYPE_MAP, _urlType)){
    msdState['msd-type'].add(_urlType);
    document.querySelectorAll('#msd-type .msd-option').forEach(o => {
      if(o.dataset.val === _urlType) o.classList.add('selected');
    });
    updateMsdBtn('msd-type');
  }

  // type tiles disabled
  // Landing PAR DÉFAUT (08/08 Ethan) = GRILLE triée « Arrivage : plus récents »
  // (ref décroissante). ?hero=1 conserve l'ancien hero plein écran.
  if(/[?&]hero=1/.test(location.search)){
    _featuredMode = true;
  }else{
    const _ss=document.getElementById('sort-sel'); if(_ss)_ss.value='ref_desc';
    _sortTouched = true;
    _featuredMode = false;
    // Le toggle hero/grille vit dans filterProducts(), qu'init ne passe pas
    // (il appelle _doFilter direct) → on affiche la grille + footer, on masque le hero.
    const _h=document.getElementById('prodix-hero'); if(_h)_h.style.display='none';
    document.body.classList.remove('phero-lock');
    const _pg=document.getElementById('pgrid'); if(_pg)_pg.style.display='';
    const _ft=document.querySelector('footer'); if(_ft)_ft.style.display='';
  }
  _updateGroupedToggleBtn();
  _refreshAllFacets();
  await _doFilter();
  _updateToggleBtn();
}

function countUp(id, target, fixedVal){
  const el=document.getElementById(id);
  if(!el)return;
  if(fixedVal!==undefined){el.textContent=fixedVal;return;}
  let start=0;
  const step=Math.max(1,Math.ceil(target/40));
  const iv=setInterval(()=>{
    start=Math.min(start+step,target);
    el.textContent=start;
    if(start>=target)clearInterval(iv);
  },30);
}

// ── FILTERS ──
// ── MULTI-SELECT DROPDOWN SYSTEM ──
const msdState = {
  'msd-type': new Set(),
  'msd-mandrin': new Set(),
  'msd-couleur': new Set(),
  'msd-details': new Set(),
  'msd-format': new Set(),
  'msd-grammage': new Set(),
  'msd-laize': new Set(),
  'msd-usine': new Set(),
  'msd-diametre': new Set(),
  'msd-poids': new Set(),
};
const msdLabels = {
  'msd-type': 'Type de papier',
  'msd-mandrin': 'Mandrins',
  'msd-couleur': 'Couleurs',
  'msd-details': 'Détails',
  'msd-format': 'Dimensions',
  'msd-grammage': 'Grammages',
  'msd-laize': 'Laizes',
  'msd-usine': 'Réf usine',
  'msd-diametre': 'Diamètre',
  'msd-poids': 'Poids',
};
// ── FAMILLES DE FORMATS (16/07) : dimensions feuilles regroupées à ±20 mm,
// sens ignoré (520×720 = 720×520). Anchors = les formats du fond de stock.
// ⚠️ 17/08 : revenu de 50 à 20 — à ±50, « 520 × 720 » avalait du 480×765/
// 555×750 (constat Ethan), la famille ne voulait plus rien dire.
const FORMAT_TOL=20;
const FORMAT_FAMILLES=[[700,1000],[650,920],[520,720],[297,420],[210,297],[630,880],[450,640],[580,780],[570,870],[963,1342],[690,800],[600,640]];
const FORMAT_AUTRES='__fmt_autres__';
const _fmtLbl=f=>f[0]+' × '+f[1]+' mm';
// Ordre d'AFFICHAGE : top 5 des familles les plus remplies, puis petit côté
// croissant (l'ordre de MATCHING reste FORMAT_FAMILLES ci-dessus).
const FORMAT_OPTIONS=['700 × 1000 mm','650 × 920 mm','520 × 720 mm','297 × 420 mm','450 × 640 mm','210 × 297 mm','570 × 870 mm','580 × 780 mm','600 × 640 mm','630 × 880 mm','690 × 800 mm','963 × 1342 mm'].concat([FORMAT_AUTRES]);
function _formatFamilleOf(row){
  if(String(row.format||'')==='Bobine')return null;
  const w=+row.width||0,l=+row.longueur||0;
  if(!w||!l)return FORMAT_AUTRES;
  const a=Math.min(w,l),b=Math.max(w,l);
  for(const f of FORMAT_FAMILLES){
    if(Math.abs(a-f[0])<=FORMAT_TOL&&Math.abs(b-f[1])<=FORMAT_TOL)return _fmtLbl(f);
  }
  return FORMAT_AUTRES;
}
// Clause PostgREST d'une famille (les DEUX orientations)
function _fmtPg(f){
  const t=FORMAT_TOL,a=f[0],b=f[1];
  const c1=`and(width.gte.${a-t},width.lte.${a+t},longueur.gte.${b-t},longueur.lte.${b+t})`;
  const c2=`and(width.gte.${b-t},width.lte.${b+t},longueur.gte.${a-t},longueur.lte.${a+t})`;
  return `and(format.neq.Bobine,or(${c1},${c2}))`;
}
// ── FAMILLES DE GRAMMAGES (16/07) : ±5 g/m², ancres = grammages du stock
// (familles ≥30 produits). Sans grammage ou hors familles → Autres.
const GRAMMAGE_TOL=5;
const GRAMMAGE_FAMILLES=[17,32,40,52,60,70,80,90,100,110,120,130,140,150,160,170,180,190,200,220,240,250,275,300,325,350,400,850];

// ── GRAMMAGES en DOUBLE CURSEUR (31/07) : remplace la liste à cases. Pilote
// les champs cachés f-gmin/f-gmax (déjà branchés : requête serveur, prédicat
// client, chip « Gram. : X → Y » avec sa croix). Pas de 5 en 5, bornes 15–850.
function _gslSyncAll(){
  ['sb-msd-grammage','msd-grammage-mob'].forEach(id=>{
    const m=document.getElementById(id);
    if(m&&m._gslSync)m._gslSync();
  });
}
function _buildGrammageSlider(msdId){
  const msd=document.getElementById(msdId);
  const panel=msd?msd.querySelector('.msd-panel'):null;
  if(!panel) return;
  panel.querySelectorAll('.msd-option,.msd-search-wrap').forEach(o=>o.remove());
  panel.classList.add('msd-slider-panel');
  const PAS=5;
  let LO=15,HI=850; // bornes ADAPTÉES au stock filtré (_gslSetBounds via _gslAdapt)
  const wrap=document.createElement('div');
  wrap.className='gsl';
  wrap.innerHTML=
    '<div class="gsl-val">Tous les grammages</div>'+
    '<div class="gsl-track"><div class="gsl-fill"></div>'+
    '<input type="range" min="'+LO+'" max="'+HI+'" value="'+LO+'" step="'+PAS+'" data-role="min" aria-label="Grammage minimum">'+
    '<input type="range" min="'+LO+'" max="'+HI+'" value="'+HI+'" step="'+PAS+'" data-role="max" aria-label="Grammage maximum">'+
    '</div>'+
    '<div class="gsl-bornes"><span>'+LO+' g</span><span>'+HI+' g</span></div>';
  panel.appendChild(wrap);
  const iMin=wrap.querySelector('[data-role=min]'),iMax=wrap.querySelector('[data-role=max]');
  const fill=wrap.querySelector('.gsl-fill'),lbl=wrap.querySelector('.gsl-val');
  const _gbtn=msd.querySelector('.msd-btn');let btnval=_gbtn&&_gbtn.querySelector('.gsl-btnval');if(_gbtn&&!btnval){btnval=document.createElement('span');btnval.className='gsl-btnval';_gbtn.insertBefore(btnval,_gbtn.querySelector('.msd-arrow'));}
  const bornes=wrap.querySelectorAll('.gsl-bornes span');
  const gn=document.getElementById('f-gmin'),gx=document.getElementById('f-gmax');
  function paint(){
    let a=+iMin.value,b=+iMax.value;
    if(a>b){const t=a;a=b;b=t;}
    const pa=(a-LO)/(HI-LO)*100,pb=(b-LO)/(HI-LO)*100;
    fill.style.left=pa+'%';
    fill.style.right=(100-pb)+'%';
    const plein=(a<=LO&&b>=HI);
    if(btnval)btnval.textContent=a+' – '+b+' g';
    lbl.textContent=plein?'Tous les grammages':a+' – '+b+' g/m²';
    return {a,b,plein};
  }
  function apply(){
    const r=paint();
    gn.value=r.plein?'':r.a;
    gx.value=r.plein?'':r.b;
    document.querySelectorAll('#sb-msd-grammage .msd-btn,#msd-grammage-mob .msd-btn')
      .forEach(bt=>bt.classList.toggle('has-sel',!r.plein));
    _gslSyncAll();
    filterProducts();
  }
  // Drag au POINTEUR sur la piste : Safari ignore pointer-events sur le
  // pseudo-élément thumb → avec 2 ranges superposés la poignée gauche était
  // imprenable. On choisit nous-mêmes la poignée la plus proche du doigt.
  const track=wrap.querySelector('.gsl-track');
  const fromX=x=>{
    const r=track.getBoundingClientRect();
    if(!r.width)return LO;
    let v=LO+(x-r.left)/r.width*(HI-LO);
    v=Math.round(v/PAS)*PAS;
    return Math.min(HI,Math.max(LO,v));
  };
  let drag=null;
  track.addEventListener('pointerdown',e=>{
    e.preventDefault();
    const v=fromX(e.clientX);
    const dMin=Math.abs(v-+iMin.value),dMax=Math.abs(v-+iMax.value);
    drag=(dMin<dMax||(dMin===dMax&&v<+iMin.value))?iMin:iMax;
    drag.value=v;paint();
    try{track.setPointerCapture(e.pointerId);}catch(_){}
  });
  track.addEventListener('pointermove',e=>{
    if(!drag)return;
    drag.value=fromX(e.clientX);paint();
  });
  const endDrag=()=>{if(!drag)return;drag=null;apply();};
  track.addEventListener('pointerup',endDrag);
  track.addEventListener('pointercancel',endDrag);
  // clavier : les inputs restent focusables
  iMin.addEventListener('input',paint);
  iMax.addEventListener('input',paint);
  iMin.addEventListener('change',apply);
  iMax.addEventListener('change',apply);
  msd._gslSync=function(){
    const vn=+gn.value||0,vx=+gx.value||0;
    iMin.value=vn?Math.max(LO,Math.round(vn/PAS)*PAS):LO;
    iMax.value=vx?Math.min(HI,Math.round(vx/PAS)*PAS):HI;
    paint();
    document.querySelectorAll('#sb-msd-grammage .msd-btn,#msd-grammage-mob .msd-btn')
      .forEach(bt=>bt.classList.toggle('has-sel',!!(vn||vx)));
  };
  msd._gslSetBounds=function(lo,hi){
    if(lo===LO&&hi===HI)return;
    LO=lo;HI=hi;
    iMin.min=LO;iMax.min=LO;iMin.max=HI;iMax.max=HI;
    if(bornes[0])bornes[0].textContent=LO+' g';
    if(bornes[1])bornes[1].textContent=HI+' g';
    msd._gslSync();
  };
  msd._gslSync();
}
// Bornes du curseur = min/max RÉELS du stock sous les filtres actifs (hors
// plage grammage elle-même) — sinon 15–850 g rend la plage inutilisable dès
// qu'une famille est choisie. Appelé à chaque rafraîchissement des facettes.
function _gslAdapt(){
  if(!_allProductsCache)return;
  const gs=[];
  for(const r of _allProductsCache){
    const g=+r.gsm||0;
    if(!g)continue;
    if(!_matchesActiveFilters(r,'msd-grammage'))continue;
    gs.push(g);
  }
  let lo,hi;
  if(!gs.length){lo=15;hi=850;}
  else{
    // Écrêtage des ABERRANTS isolés (gsm Sage jusqu'à 5000) : on ne coupe le
    // min/max réel que s'il est loin du percentile 0,5/99,5 — une poignée à
    // la borne = aucune contrainte, ces articles restent donc sélectionnables.
    gs.sort((a,b)=>a-b);
    const q=t=>gs[Math.min(gs.length-1,Math.floor(t*gs.length))];
    const p005=q(0.005),p995=q(0.995);
    lo=(gs[0]<p005*0.75)?p005:gs[0];
    hi=(gs[gs.length-1]>p995*1.25)?p995:gs[gs.length-1];
  }
  lo=Math.floor(lo/5)*5;hi=Math.ceil(hi/5)*5;
  if(hi<=lo)hi=lo+5;
  ['sb-msd-grammage','msd-grammage-mob'].forEach(id=>{
    const m=document.getElementById(id);
    if(m&&m._gslSetBounds)m._gslSetBounds(lo,hi);
  });
}
const GRAMMAGE_AUTRES='__gsm_autres__';
const _gsmLbl=g=>g+' g/m²';
const GRAMMAGE_OPTIONS=[80,70,90,60,100].map(_gsmLbl)
  .concat(GRAMMAGE_FAMILLES.filter(g=>![80,70,90,60,100].includes(g)).map(_gsmLbl))
  .concat([GRAMMAGE_AUTRES]);
function _grammageFamilleOf(row){
  const g=+row.gsm||0;
  if(!g)return GRAMMAGE_AUTRES;
  for(const a of GRAMMAGE_FAMILLES){
    if(Math.abs(g-a)<=GRAMMAGE_TOL)return _gsmLbl(a);
  }
  return GRAMMAGE_AUTRES;
}
function _gsmPg(a){
  return `and(gsm.gte.${a-GRAMMAGE_TOL},gsm.lte.${a+GRAMMAGE_TOL})`;
}
// ── LAIZES bobines : TRANCHES façon Poids (19/07, Ethan — fini les 40
// familles fines, même catégorisation que les tranches logistiques).
const LAIZE_TRANCHES=[
 {label:'< 500 mm',min:0,max:500},
 {label:'500 – 800 mm',min:500,max:800},
 {label:'800 – 1000 mm',min:800,max:1000},
 {label:'1000 – 1300 mm',min:1000,max:1300},
 {label:'1300 – 1600 mm',min:1300,max:1600},
 {label:'> 1600 mm',min:1600,max:99999},
];
const LAIZE_AUTRES='__laize_autres__';
const LAIZE_OPTIONS=LAIZE_TRANCHES.map(t=>t.label).concat([LAIZE_AUTRES]);
function _laizeFamilleOf(row){
  if(String(row.format||'')!=='Bobine')return null;
  const w=+row.width||0;
  if(!w)return LAIZE_AUTRES;
  const t=LAIZE_TRANCHES.find(t=>w>=t.min&&w<t.max);
  return t?t.label:LAIZE_AUTRES;
}
function _laizePgT(t){
  return `and(format.eq.Bobine,width.gte.${t.min},width.lt.${t.max})`;
}
// ── DIAMÈTRES bobines : TRANCHES (19/07).
const DIAM_TRANCHES=[
 {label:'< 600 mm',min:0,max:600},
 {label:'600 – 800 mm',min:600,max:800},
 {label:'800 – 1000 mm',min:800,max:1000},
 {label:'1000 – 1200 mm',min:1000,max:1200},
 {label:'> 1200 mm',min:1200,max:99999},
];
const DIAM_AUTRES='__diam_autres__';
const DIAM_OPTIONS=DIAM_TRANCHES.map(t=>t.label).concat([DIAM_AUTRES]);
function _diamFamilleOf(row){
  if(String(row.format||'')!=='Bobine')return null;
  const d=+row.longueur||0;
  if(!d)return DIAM_AUTRES;
  const t=DIAM_TRANCHES.find(t=>d>=t.min&&d<t.max);
  return t?t.label:DIAM_AUTRES;
}
function _diamPgT(t){
  return `and(format.eq.Bobine,longueur.gte.${t.min},longueur.lt.${t.max})`;
}
// ── POIDS : tranches logistiques fixes (manutention / conteneur).
const POIDS_TRANCHES=[
 {label:'< 250 kg',min:0,max:250},
 {label:'250 – 500 kg',min:250,max:500},
 {label:'500 – 750 kg',min:500,max:750},
 {label:'750 – 1000 kg',min:750,max:1000},
 {label:'1 – 1,5 T',min:1000,max:1500},
 {label:'> 1,5 T',min:1500,max:99999},
];
const POIDS_OPTIONS=POIDS_TRANCHES.map(t=>t.label);
function _poidsTrancheOf(row){
  const w=+row.weight||+row.poids_net||0;
  if(!w)return null;
  const t=POIDS_TRANCHES.find(t=>w>=t.min&&w<t.max);
  return t?t.label:null;
}
function _poidsPg(t){
  return `and(weight.gte.${t.min},weight.lt.${t.max})`;
}
// ── LAIZE / DIAMÈTRE / POIDS en DOUBLE CURSEUR (28/08, façon Grammages) ──────
// Remplacent les tranches à cases. Pilotent les champs cachés déjà branchés
// (requête serveur + prédicat client + chips lrange/lgrange/wrange) :
//   laize→f-lmin/f-lmax (width) · diam→f-longmin/f-longmax (longueur, bobines) ·
//   poids→f-wmin/f-wmax (weight). Plage affichée en haut à droite (comme gram.).
const _RS_CFG={
  laize:{minField:'f-lmin',maxField:'f-lmax',unit:'mm',excludeKey:'msd-laize',all:'Toutes les laizes',bobineOnly:true,defLo:0,defHi:2500,step:10,rowVal:r=>+r.width||0},
  diam:{minField:'f-longmin',maxField:'f-longmax',unit:'mm',excludeKey:'msd-diametre',all:'Tous les diamètres',bobineOnly:true,defLo:0,defHi:1600,step:10,rowVal:r=>(String(r.format||'')==='Bobine'?(+r.longueur||0):0)},
  poids:{minField:'f-wmin',maxField:'f-wmax',unit:'kg',excludeKey:'msd-poids',all:'Tous les poids',bobineOnly:false,defLo:0,defHi:5000,step:10,rowVal:r=>+r.weight||+r.poids_net||0},
};
const _RS_MOB={laize:'msd-laize-mob',diam:'msd-diametre-mob',poids:'msd-poids-mob'};
const _RS_DESK={laize:'sb-msd-laize',diam:'sb-msd-diametre',poids:'sb-msd-poids'}; // sections du rail (comme Grammages)
const _rsBounds={laize:null,diam:null,poids:null}; // {lo,hi} adaptées au stock, ou null si aucune donnée
// Texte de plage affiché à droite (comme Grammages) : plage COURANTE = sélection
// si posée, sinon les bornes du stock. Vide seulement si aucune donnée.
function _rsRangeText(key){
  const cfg=_RS_CFG[key];const b=_rsBounds[key];
  const vn=document.getElementById(cfg.minField)?.value||'';
  const vx=document.getElementById(cfg.maxField)?.value||'';
  const lo=vn||(b?b.lo:''),hi=vx||(b?b.hi:'');
  if(lo===''&&hi==='')return '';
  return lo+' – '+hi+' '+cfg.unit;
}
// « Sélection posée » (affichage gras) = un des champs min/max est renseigné.
function _rsHasSel(key){
  const cfg=_RS_CFG[key];
  return !!(document.getElementById(cfg.minField)?.value||document.getElementById(cfg.maxField)?.value);
}
function _rsUpdateHeader(key){
  const txt=_rsRangeText(key),sel=_rsHasSel(key);
  const m=document.getElementById(_RS_MOB[key]);
  if(m){const btn=m.querySelector('.msd-btn');if(btn){let bv=btn.querySelector('.gsl-btnval');if(!bv){bv=document.createElement('span');bv.className='gsl-btnval';btn.insertBefore(bv,btn.querySelector('.msd-arrow'));}bv.textContent=txt;btn.classList.toggle('has-sel',sel);}}
  const rspan=document.getElementById('mgr-range-'+key); // plage dans le header de la section « Filtres avancés »
  if(rspan)rspan.textContent=txt;
}
// Construit un double curseur dans `container` (innerHTML remplacé), branché sur
// les champs cachés de la config `key`.
function _buildRangeSlider(container,key){
  const cfg=_RS_CFG[key];
  const b=_rsBounds[key]||{lo:cfg.defLo,hi:cfg.defHi};
  const LO=b.lo,HI=b.hi,PAS=cfg.step;
  const fMin=document.getElementById(cfg.minField),fMax=document.getElementById(cfg.maxField);
  container.innerHTML=
    '<div class="gsl">'+
    '<div class="gsl-val"></div>'+
    '<div class="gsl-track"><div class="gsl-fill"></div>'+
    '<input type="range" min="'+LO+'" max="'+HI+'" value="'+LO+'" step="'+PAS+'" data-role="min" aria-label="Minimum">'+
    '<input type="range" min="'+LO+'" max="'+HI+'" value="'+HI+'" step="'+PAS+'" data-role="max" aria-label="Maximum"></div>'+
    '<div class="gsl-bornes"><span>'+LO+' '+cfg.unit+'</span><span>'+HI+' '+cfg.unit+'</span></div></div>';
  const wrap=container.querySelector('.gsl');
  const iMin=wrap.querySelector('[data-role=min]'),iMax=wrap.querySelector('[data-role=max]');
  const fill=wrap.querySelector('.gsl-fill'),lbl=wrap.querySelector('.gsl-val'),track=wrap.querySelector('.gsl-track');
  const vn=+fMin?.value||0,vx=+fMax?.value||0;
  iMin.value=vn?Math.min(HI,Math.max(LO,Math.round(vn/PAS)*PAS)):LO;
  iMax.value=vx?Math.min(HI,Math.max(LO,Math.round(vx/PAS)*PAS)):HI;
  function paint(){
    let a=+iMin.value,c=+iMax.value;if(a>c){const t=a;a=c;c=t;}
    fill.style.left=(a-LO)/(HI-LO)*100+'%';fill.style.right=(100-(c-LO)/(HI-LO)*100)+'%';
    const plein=(a<=LO&&c>=HI);
    lbl.textContent=plein?cfg.all:a+' – '+c+' '+cfg.unit;
    return {a,c,plein};
  }
  function apply(){
    const r=paint();
    if(fMin)fMin.value=r.plein?'':r.a;
    if(fMax)fMax.value=r.plein?'':r.c;
    _rsUpdateHeader(key);
    filterProducts();
  }
  const fromX=x=>{const r=track.getBoundingClientRect();if(!r.width)return LO;let v=LO+(x-r.left)/r.width*(HI-LO);v=Math.round(v/PAS)*PAS;return Math.min(HI,Math.max(LO,v));};
  let drag=null;
  track.addEventListener('pointerdown',e=>{e.preventDefault();const v=fromX(e.clientX);const dMin=Math.abs(v-+iMin.value),dMax=Math.abs(v-+iMax.value);drag=(dMin<dMax||(dMin===dMax&&v<+iMin.value))?iMin:iMax;drag.value=v;paint();try{track.setPointerCapture(e.pointerId);}catch(_){}});
  track.addEventListener('pointermove',e=>{if(!drag)return;drag.value=fromX(e.clientX);paint();});
  const endDrag=()=>{if(!drag)return;drag=null;apply();};
  track.addEventListener('pointerup',endDrag);
  track.addEventListener('pointercancel',endDrag);
  iMin.addEventListener('input',paint);iMax.addEventListener('input',paint);
  iMin.addEventListener('change',apply);iMax.addEventListener('change',apply);
  paint();
}
// Injecte le curseur dans le .msd-panel d'un menu (rail desktop sb-msd-* OU
// tiroir mobile msd-*-mob) — même composant que Grammages.
function _initRangeSliderMenu(msdId,key){
  const msd=document.getElementById(msdId);const panel=msd?msd.querySelector('.msd-panel'):null;
  if(!panel)return;
  panel.querySelectorAll('.msd-option,.msd-search-wrap,.msd-group-hdr').forEach(o=>o.remove());
  panel.classList.add('msd-slider-panel');
  _buildRangeSlider(panel,key);
  _rsUpdateHeader(key);
}
// Bornes = min/max RÉELS du stock filtré (hors la plage elle-même) — comme _gslAdapt.
function _rsAdapt(){
  if(!_allProductsCache)return;
  for(const key of Object.keys(_RS_CFG)){
    const cfg=_RS_CFG[key];const vals=[];
    for(const r of _allProductsCache){
      if(!_matchesActiveFilters(r,cfg.excludeKey))continue;
      const v=cfg.rowVal(r);if(v>0)vals.push(v);
    }
    if(!vals.length){_rsBounds[key]=null;continue;}
    vals.sort((a,b)=>a-b);
    const q=t=>vals[Math.min(vals.length-1,Math.floor(t*vals.length))];
    const p005=q(0.005),p995=q(0.995);
    let lo=(vals[0]<p005*0.6)?p005:vals[0];
    let hi=(vals[vals.length-1]>p995*1.4)?p995:vals[vals.length-1];
    lo=Math.floor(lo/cfg.step)*cfg.step;hi=Math.ceil(hi/cfg.step)*cfg.step;
    if(hi<=lo)hi=lo+cfg.step;
    _rsBounds[key]={lo,hi};
  }
  _rsRefreshOpen();
}
function _rsRefreshOpen(){
  Object.keys(_RS_MOB).forEach(key=>{
    const panel=document.querySelector('#'+_RS_MOB[key]+' .msd-panel.msd-slider-panel');
    if(panel)_buildRangeSlider(panel,key);
    _rsUpdateHeader(key);
  });
  if(window._advOpenSec&&['laize','diametre','poids'].includes(window._advOpenSec)&&window._paintAdv)window._paintAdv();
}
// Ordre usuel du stock (volumes réels ~20/07) : le menu Type s'affiche trié
// par volume DÈS la construction, avant même l'arrivée des données de comptage
// (nav privée = pas de cache local → sinon alphabétique à la 1re ouverture).
const _TYPE_ORDRE_USUEL=['ROFF','RLUX','SBOA','RCOL','SLUX','SOFF','RKRABRUN','SCAR','RBOU','RKRA','RCAR','S2SC','RADH','SCOL','SCUT','SADH','RBOA','RLINER','RFLEX'];
const QUALITE_CODES=['R1SC','R2SC','RADH','RAFF','RBOA','RBON','RBOU','RCAR','ROFF','RCOL','RCUI','RDIV','RFLEX','RKDO','RKRA','RKRABRUN','RKRG','RKRR','RLINER','RLUX','RLWC','RNEW','RPAC','RPLA','RSIL','RTHERM','RTIS','S1SC','S2SC','SADH','SAFF','SBOA','SBON','SBOU','SCAR','SCOL','SCUT','SDIV','SENV','SKDO','SKRA','SLUX','SLWC','SNEW','SOFF','SPAC','SPLA','SSBS','SSPE','SINK','UMAC','AUTRES'];
// Real DB quality codes: strip the 'AUTRES' sentinel and expand the
// Offset/Dossier Couleur pseudo-codes back to the actual 'RCOL' DB value.
const QUALITE_KNOWN_DB=[...new Set(QUALITE_CODES.flatMap(c=>c==='AUTRES'?[]:_isCouleurPseudo(c)?['RCOL']:[c]))];
const QUALITE_LABELS={
  'R1SC':'Couché 1 face',
  'R2SC':'Couché 2 faces',
  'RADH':'Adhésif',
  'RAFF':'Papier affiche',
  'RBOA':'Carton couché',
  'RBON':'Carton non couché',
  'RBOU':'Bouffant',
  'RCAR':'Autocopiant',
  'RCOL':'Offset couleur',
  'RCOL':'Offset couleur',
  'RCUI':'Papier cuisson',
  'RDIV':'Divers / Alu',
  'RFLEX':'Complexe / Polyéthylène',
  'RKDO':'Papier cadeau',
  'RKRA':'Kraft',
  'RKRABRUN':'Kraft brun',
  'RKRG':'Kraft gomme',
  'RKRR':'Kraft armé',
  'RLINER':'Liner / Testliner',
  'RLUX':'Papier luxe',
  'RLWC':'LWC',
  'SLWC':'LWC',
  'RNEW':'Papier journal',
  'ROFF':'Offset',
  'RPAC':'Emballage',
  'RPLA':'Plastique',
  'RSIL':'Silicone / Glassine',
  'RTHERM':'Thermique',
  'RTIS':'Ouate / Tissue',
  'S1SC':'Couché 1 face',
  'S2SC':'Couché 2 faces',
  'SADH':'Adhésif',
  'SAFF':'Papier affiche',
  'SBOA':'Carton couché',
  'SBON':'Carton non couché',
  'SBOU':'Bouffant',
  'SCAR':'Autocopiant',
  'SCOL':'Offset couleur',
  'SCUT':'Ramette',
  'SDIV':'Divers',
  'SENV':'Enveloppes',
  'SKDO':'Papier cadeau',
  'SKRA':'Kraft',
  'SLUX':'Papier luxe',
  'SNEW':'Papier journal',
  'SOFF':'Offset',
  'SPAC':'Emballage',
  'SPLA':'Plastique',
  'SSBS':'SBS / Carton blanc',
  'SSPE':'Spécial',
  'SINK':'Encre',
  'UMAC':'Machines',
  'AUTRES':'Autres',
};

// Codes douaniers CN8 — source de vérité unique (TARIC Maroc, validé par
// Prodiconseil sur les BRS papier). Doit rester aligné avec
// `prodi_arrivages/lib/prodi/code-douanier.ts` pour que la facture douane =
// ce que le client voit sur le catalogue web.
//
// Familles sans code (volontaire) : RDIV, SDIV, SSPE, RKDO, RMIN, RPAC, SPAC,
// RPLA, SPLA, RENV, SENV, SINK, SKRM, UMAC, UMAN, RAFF, SAFF → null.
const HS_CODES={
  // Journal
  'RNEW':'48010000','SNEW':'48010000',
  // Offset bobine — affinés par grammage.
  'ROFF':'48025590','RCOL':'48025590','RLUX':'48025590',
  // Offset palette — affinés par grammage.
  'SOFF':'48025700','SCOL':'48025700','SLUX':'48025700',
  // SCUT palette cut (A4/A3) — affiné par détail (sinon null).
  'SCUT':'48025680',
  // Bouffant
  'RBOU':'48026100','SBOU':'48026100','SOFB':'48026100',
  // Kraft (BRUN par défaut, raffiné par couleur + fibres dans le switch)
  'RKRA':'48041190','SKRA':'48041190','RKRABRUN':'48041190',
  // Testliner — affiné par grammage.
  'RLINER':'48052400',
  // Cuisson
  'RCUI':'48061000',
  // Silicone / Glassine
  'RSIL':'48064010','SSIL':'48064010',
  // Carton non couché gros grammage
  'RBON':'48070030','SBON':'48070030',
  // Autocopiant
  'RCAM':'48092000','SCAM':'48092000','RCAR':'48092000','SCAR':'48092000',
  // Couché 1F/2F bobine vs palette
  'R1SC':'48101300','R2SC':'48101300',
  'S1SC':'48101900','S2SC':'48101900',
  // Carton couché SBS (palette)
  'SSBS':'48101900',
  // LWC
  'RLWC':'48102200','SLWC':'48102200',
  // Carton couché duplex/triplex — affiné pour gros grammage.
  'RBOA':'48109290','SBOA':'48109290',
  // Adhésifs / Kraft adhésif
  'RADH':'48114190','SADH':'48114190','RKRG':'48114190',
  // Thermique / Flexible / Kraft renforcé
  'RFLEX':'48119000','SFLEX':'48119000',
  'RKRR':'48119000','SKRR':'48119000','RTHERM':'48119000',
  // Ouate 1 pli — affiné par grammage.
  'RTIS':'48181090','STIS':'48181090',
};

// Compact a slash-separated HS code list into a range when codes share the same 4-digit chapter
// e.g. "4802.55 / 4802.56 / 4802.57 / 4802.58" → "4802.55-58"
//      "4810.32 / 4810.39 / 4810.92 / 4810.99" → "4810.32-99"
function _hsRange(s){
  if(!s)return s;
  const arr=String(s).split(/\s*\/\s*/).map(x=>x.trim()).filter(Boolean);
  if(arr.length<=1)return arr[0]||s;
  const parts=arr.map(c=>c.match(/^(\d{4})\.(\d+)$/));
  if(parts.every(p=>p)&&new Set(parts.map(p=>p[1])).size===1){
    const chap=parts[0][1];
    const nums=parts.map(p=>+p[2]);
    const lo=Math.min(...nums),hi=Math.max(...nums);
    if(lo===hi)return `${chap}.${String(lo).padStart(2,'0')}`;
    return `${chap}.${String(lo).padStart(2,'0')}-${String(hi).padStart(2,'0')}`;
  }
  return arr.join(' / ');
}

// Formats raw 8-char CN8 codes (digits or X wildcards) to display with dots: "XXXXXXXX" → "XXXX.XX.XX".
// "48010000" → "4801.00.00" · "4810XXXX" → "4810.XX.XX" · "À préciser" → "À préciser" (verbatim)
function _toCN8(code){
  if(!code)return code;
  return String(code).split(/\s*\/\s*/).map(seg=>{
    seg=seg.trim();
    const m=seg.match(/^([A-Z0-9]{4})([A-Z0-9]{2})([A-Z0-9]{2})$/i);
    if(m)return `${m[1]}.${m[2]}.${m[3]}`.toUpperCase();
    return seg;
  }).join(' / ');
}

// Affine le code CN8 selon qualité + grammage + couleur + details (texte libre
// contenant fibres / qualite_papier / détail A4-A3).
// Signature : getHsCode(qualite, gsm, format, couleur?, details?).
// Garde un 3e arg `format` pour compatibilité (palette/feuille) même s'il
// n'est plus utilisé dans l'affinement (les seuils sont par grammage uniquement).
function getHsCode(qualite,gsm,format,couleur,details){
  if(!qualite)return null;
  const g=Number(gsm)||0;
  const col=String(couleur||'').toUpperCase();
  const det=String(details||'').toUpperCase();
  const detClean=det.replace(/[-–—\s]+/g,' ');

  // Override universel : INGRAISSABLE (et INGRAISSABLE - REH) → 48062000.
  if(/\bINGRAISSABLE\b/.test(detClean))return '48062000';
  // Override CALQUE : uniquement RLUX/SLUX.
  if((qualite==='RLUX'||qualite==='SLUX')&&/\bCALQUE\b/.test(detClean))return '48063000';

  if(!HS_CODES[qualite])return null;

  switch(qualite){
    case 'ROFF': case 'RCOL': case 'RLUX':
      if(!g)break;
      if(g<60)return '48025515';
      if(g<75)return '48025525';
      if(g<80)return '48025530';
      if(g<=150)return '48025590';
      return '48025810';
    case 'SOFF': case 'SCOL': case 'SLUX':
      if(!g)break;
      if(g<=150)return '48025700';
      return '48025890';
    case 'SCUT':
      if(/\bA4\b/.test(detClean))return '48025620';
      if(/\bA3\b/.test(detClean))return '48025680';
      return null;
    case 'RKRA': case 'SKRA': case 'RKRABRUN': {
      if(/RECYCLE|RECYCLÉ/.test(detClean))return '48051990';
      const isBrun=qualite==='RKRABRUN'||/BRUN|KRAFT/.test(col);
      return isBrun?'48041190':'48042990';
    }
    case 'RLINER':
      if(!g)return '48052400';
      if(g<=150)return '48052400';
      return '48052500';
    case 'RBOA': case 'SBOA':
      if(g>225)return '48109910';
      return '48109290';
    case 'RTIS': case 'STIS':
      if(g&&g<=25)return '48181010';
      return '48181090';
    // Familles à code fixe : RNEW/SNEW, RBOU/SBOU/SOFB, R1SC/R2SC/S1SC/S2SC,
    // SSBS, RLWC/SLWC, RCUI, RSIL/SSIL, RBON/SBON, RCAM/SCAM/RCAR/SCAR,
    // RADH/SADH/RKRG, RFLEX/SFLEX/RKRR/SKRR/RTHERM → renvoient le défaut.
  }
  return HS_CODES[qualite];
}

// Build product title: "BOBINE — PAPIER LUXE" / "FORMAT — KRAFT" / "MACHINE — …"
function formatProductTitle(qualite, fallback){
  if(!qualite)return (fallback||'—').toString().toUpperCase();
  const c=qualite[0];
  const prefix=c==='R'?'BOBINE':c==='S'?'FORMAT':c==='U'?'MACHINE':qualite;
  const label=QUALITE_LABELS[qualite]||qualite;
  return `${prefix} — ${label.toUpperCase()}`;
}

// Safari iOS (20/08) : les .msd-panel sont position:fixed mais DESCENDANTS de
// .filters-panel (overflow-scroll horizontal) + .sidebar-col (stacking context).
// WebKit peint alors le fixed DANS ces calques → SOUS les tuiles, insensible au
// z-index. Fix robuste et uniforme : à l'ouverture on déplace le panneau vers
// <body> (il reste position:fixed, MÊME position à l'écran, mais échappe overflow
// ET stacking → passe au-dessus de tout) ; on le remet à sa place à la fermeture,
// AVANT tout _flushFacetsApresFermeture (qui interroge le panneau via son .msd).
function _msdReparentOpen(panel){
  if(!panel||panel._msdHome) return;
  panel._msdHome={p:panel.parentNode,n:panel.nextSibling};
  const mob = window.matchMedia('(max-width:768px)').matches;
  if(mob){
    // MOBILE (21/08) : menu en BOTTOM-SHEET plein écran + fond noir (même patron que
    // le popup tonnage _qtyModal, qui marche sur iOS). Un panneau plein écran + backdrop
    // ne peut PAS passer derrière les tuiles — fini le bug de compositing Safari.
    let bg=document.getElementById('msd-sheet-bg');
    if(!bg){bg=document.createElement('div');bg.id='msd-sheet-bg';document.body.appendChild(bg);}
    panel.classList.add('msd-sheet');
    panel.style.top=panel.style.left=panel.style.width='';   // efface le positionnement dropdown
    bg.appendChild(panel);
  } else {
    document.body.appendChild(panel);
  }
}
function _msdRestoreAll(){
  document.querySelectorAll('.msd-panel').forEach(p=>{
    if(p._msdHome){ p.classList.remove('msd-sheet'); p.style.top=p.style.left=p.style.width=''; p._msdHome.p.insertBefore(p,p._msdHome.n); p._msdHome=null; }
  });
  const bg=document.getElementById('msd-sheet-bg'); if(bg)bg.remove();
}
function toggleMsd(id) {
  // Panneau OUVERT = reparenté vers <body> par _msdReparentOpen (fix Safari 20/08)
  // → il n'est plus dans #id et le sélecteur direct le rate : re-clic sur le
  // bouton plantait (panel null) et le menu ne se refermait jamais. On le
  // retrouve via son ancre _msdHome.
  let panel = document.querySelector(`#${id} .msd-panel`);
  if(!panel) panel = [...document.querySelectorAll('.msd-panel')].find(p=>p._msdHome&&p._msdHome.p&&p._msdHome.p.closest(`#${id}`))||null;
  const btn = document.querySelector(`#${id} .msd-btn`);
  if(!panel||!btn) return;
  const isOpen = panel.classList.contains('show');
  // Position fixed panel under button — largeur CALÉE sur le bouton (= largeur
  // du rail). Une fois reparenté vers <body> (fix Safari), le panneau perd son
  // ancêtre #sb-msd-* et la règle CSS de largeur ne s'applique plus → il retombe
  // sur `width:auto !important` (Type déborde du rail, Détails trop étroit). On
  // force donc la largeur en INLINE !important pour battre ce CSS et rester
  // contenu dans le rail comme les menus Couleur/Mandrin.
  if(!isOpen){
    const r=btn.getBoundingClientRect(),z=_zf();
    panel.style.top=((r.bottom+4)/z)+'px';
    panel.style.left=(r.left/z)+'px';
    panel.style.setProperty('width',(r.width/z)+'px','important');
  }
  // Close all
  document.querySelectorAll('.msd-panel.show').forEach(p => p.classList.remove('show'));
  document.querySelectorAll('.msd-btn.open').forEach(b => b.classList.remove('open'));
  _msdRestoreAll();
  _flushFacetsApresFermeture();
  if (!isOpen) {
    // Tri À L'OUVERTURE (21/07) : le menu s'affiche déjà compté/trié par volume
    // (recomptage O(n) ≈ 1,4 ms), puis reste FIGÉ tant qu'il est ouvert.
    {
      const facetId=id.replace(/^sb-/,'').replace(/-mob$/,'');
      if(/^msd-/.test(facetId)&&_allProductsCache){
        delete _facetPending[facetId];delete _facetSig[facetId];
        if(facetId==='msd-details'){window._detailsPending=false;_detailsLastSig=null;_rebuildDetailsMsd();}
        else _updateMsdFacetCounts(facetId);
      }
    }
    panel.classList.add('show'); btn.classList.add('open');
    // Ne jamais déborder du bord droit (ex. tri ⇅ en bout de barre) : on
    // recale le panneau vers la gauche si besoin, une fois sa largeur connue.
    {
      const z=_zf(),r2=btn.getBoundingClientRect();
      const pw=panel.offsetWidth*z; // offsetWidth = px layout, rects = px visuels
      if(r2.left+pw>window.innerWidth-8)panel.style.left=(Math.max(8,window.innerWidth-pw-8)/z)+'px';
    }
    // Add scroll hint if panel is scrollable
    let hint=panel.querySelector('.msd-scroll-hint');
    if(!hint){hint=document.createElement('div');hint.className='msd-scroll-hint';panel.appendChild(hint);}
    hint.classList.toggle('hidden',panel.scrollHeight<=panel.clientHeight+10);
    panel.onscroll=()=>{if(hint)hint.classList.toggle('hidden',panel.scrollTop+panel.clientHeight>=panel.scrollHeight-10);};
    _msdReparentOpen(panel); // Safari : sortir le panneau fixed vers <body> (au-dessus des tuiles)
  }
}

function toggleMsdOption(el, id) {
  const val = el.dataset.val;
  const set = msdState[id];
  const willSelect = !set.has(val);
  if (willSelect) set.add(val); else set.delete(val);
  // Sync toutes les options jumelles (panels mobile + desktop partagent le même state)
  const _esc = (typeof CSS!=='undefined'&&CSS.escape)?CSS.escape:(s=>String(s).replace(/[^a-zA-Z0-9_-]/g,'\\$&'));
  document.querySelectorAll(`.msd-option[data-val="${_esc(val)}"]`).forEach(o=>{
    if(!o.closest(`#${id},#${id}-mob,#sb-${id}`))return;
    o.classList.toggle('selected', willSelect);
  });
  // Panneau reparenté vers <body> (fix Safari) : l'option cliquée n'est plus dans
  // #id → le closest ci-dessus la rate. On la coche directement, robuste au reparent.
  el.classList.toggle('selected', willSelect);
  updateMsdBtn(id);
  // Le choix d'un Type de papier débloque les filtres bobine/format (17/07).
  if(id==='msd-type')updateFilterVisibility();
  filterProducts();
}

function updateMsdBtn(id) {
  // Resynchronise le curseur CIE quand la sélection Détails change ailleurs
  // (chip ✕, reset) — le menu ne se reconstruit pas sur ce chemin-là.
  if(id==='msd-details')['sb-msd-details','msd-details-mob'].forEach(cid=>{
    const m=document.getElementById(cid);
    if(m&&m._cieSync)m._cieSync();
  });
  const set = msdState[id];
  const _disp = v => v===DETAILS_NONE ? 'Sans détails' : v===DETAILS_AUTRES ? 'Autres' : v;
  const btns = [
    ...document.querySelectorAll(`#${id} .msd-btn, #${id} .fb-msd-btn`),
    ...document.querySelectorAll(`[data-msd-id="${id}"]`)
  ];
  btns.forEach(btn => {
    const label = btn.querySelector('.msd-btn-label') || btn.querySelector('span:first-child');
    if(!label) return;
    const old = btn.querySelector('.msd-count'); if(old) old.remove();
    // Topbar : libellé FIXE (la sélection vit dans les tags de la 2e ligne),
    // seul un liseré signale qu'un choix est actif — rien ne bouge.
    if(document.body.classList.contains('topbar-view')){
      label.textContent = msdLabels[id];
      btn.classList.toggle('has-sel', set.size>0);
      return;
    }
    if(set.size === 0){
      label.textContent = msdLabels[id];
    } else if(set.size <= 2){
      label.textContent = [...set].map(_disp).join(' · ');
    } else {
      label.textContent = [...set].slice(0,2).map(_disp).join(' · ');
      const badge = document.createElement('span');
      badge.className = 'msd-count'; badge.textContent = '+' + (set.size - 2);
      const arrow = btn.querySelector('.msd-arrow,.fb-msd-arrow');
      if(arrow) btn.insertBefore(badge, arrow);
    }
  });
}

function toggleOriginePill(btn){
  btn.classList.toggle('active');
  filterProducts();
}
// Filtres Stock (Stocklots/Fabrication/Siderun) et Dépôt SUPPRIMÉS le 15/07 :
// le périmètre est verrouillé dans sbQ (dépôt uniquement, sans DU/FAB).
// Filtre RÉSERVÉ (reserve_client posé par l'import Sage) : actif = ne
// montrer QUE les articles réservés.
let _resaFilter=''; // '' | 'with' (réservés) | 'without' (sans réservé)
function toggleResaPill(btn){
  const val=btn.dataset.resa||'with';
  _resaFilter=(_resaFilter===val)?'':val;
  document.querySelectorAll('.fpill-resa').forEach(b=>b.classList.toggle('active',_resaFilter===(b.dataset.resa||'with')));
  filterProducts();
}
let _photoFilter=''; // '' | 'with' | 'without'
function togglePhotoPill(btn){
  const val=btn.dataset.photo;
  const willSelect=(_photoFilter!==val);
  _photoFilter=willSelect?val:'';
  document.querySelectorAll('.fpill-photo').forEach(b=>b.classList.toggle('active',_photoFilter===b.dataset.photo));
  filterProducts();
}
let _formatFilter=''; // '' | 'Bobine' | 'Palette'
function toggleFormatPill(btn){
  const fmt=btn.dataset.format;
  const willSelect=(_formatFilter!==fmt);
  _formatFilter=willSelect?fmt:'';
  document.querySelectorAll('.fpill[data-format]').forEach(b=>b.classList.toggle('active',_formatFilter===b.dataset.format));
  updateFilterVisibility();
  filterProducts();
}
function getMsdValues(id) { return msdState[id]; }

function resetMsd(id) {
  msdState[id].clear();
  document.querySelectorAll(`#${id} .msd-option`).forEach(o => o.classList.remove('selected'));
  if(id==='msd-type')document.querySelectorAll('#sb-msd-type .msd-option').forEach(o=>o.classList.remove('selected'));
  if(id==='msd-couleur')document.querySelectorAll('#sb-msd-couleur .msd-option').forEach(o=>o.classList.remove('selected'));

  updateMsdBtn(id);
  // Retirer le Type via son TAG doit re-cacher les filtres bobine/format
  // (le chemin menu passait par toggleMsdOption, pas celui-ci) — 18/07.
  if(id==='msd-type')updateFilterVisibility();
}

// Close dropdowns when clicking outside
document.addEventListener('click', e => {
  if (!e.target.closest('.msd') && !e.target.closest('.fb-msd') && !e.target.closest('.msd-panel')) {
    document.querySelectorAll('.msd-panel.show').forEach(p => p.classList.remove('show'));
    document.querySelectorAll('.msd-btn.open,.fb-msd-btn.open').forEach(b => b.classList.remove('open'));
    _msdRestoreAll();
    _flushFacetsApresFermeture();
  }
});


function buildMsdOptions(msdId, values, defaultLabel, labelFn, stateId){
  const targetId = stateId || msdId;
  const msd = document.getElementById(msdId);
  if(!msd) return;
  const panel = msd.querySelector('.msd-panel');
  if(!panel) return;

  // reset selection
  panel.querySelectorAll('.msd-option,.msd-search-wrap').forEach(o=>o.remove());
  msd._selected = new Set();
  // reset button label
  const lbl = msd.querySelector('.msd-btn-label');
  if(lbl) lbl.textContent = defaultLabel;

  // Add search bar if many options
  if(values.length > 6){
    const wrap = document.createElement('div');
    wrap.className = 'msd-search-wrap';
    wrap.innerHTML = `<input class="msd-search-inp" type="text" placeholder="Rechercher…" autocomplete="off">`;
    panel.appendChild(wrap);
    wrap.querySelector('.msd-search-inp').addEventListener('input', e=>{
      const q = e.target.value.toLowerCase();
      panel.querySelectorAll('.msd-option').forEach(opt=>{
        const hay = (opt.textContent + ' ' + (opt.dataset.search||'')).toLowerCase();
        opt.style.display = hay.includes(q) ? '' : 'none';
      });
    });
    wrap.addEventListener('click', e=>e.stopPropagation());
  }

  const makeOpt = (val, text) => {
    const opt = document.createElement('div');
    opt.className = 'msd-option';
    opt.setAttribute('data-val', val);
    opt.setAttribute('data-search', val); // le code Sage reste cherchable (libellés sans code, 21/07)
    opt.innerHTML = `<div class="msd-check"><svg width="9" height="7" fill="none" stroke="#fff" stroke-width="2.5"><polyline points="1,4 3.5,6.5 8,1"/></svg></div>${text}`;
    opt.addEventListener('click', ()=>toggleMsdOption(opt, targetId));
    panel.appendChild(opt);
    return opt;
  };

  values.forEach(v=>{
    const opt=makeOpt(v, labelFn ? labelFn(v) : v);
    if(v==='Offset Couleur'||v==='Dossier Couleur') opt&&(opt.dataset.search='roff rcol offset couleur dossier');
    if(v==='SCOL') opt&&(opt.dataset.search='scol offset couleur format');
  });
}

// ── FACETED "Détails" FILTER ──
// Options come from the full DB (_allProductsCache), filtered by all OTHER
// active filters so the dropdown only lists details that exist for the
// current selection (Amazon-style facet). Selected values are always shown
// even when their count hits 0, so the user can always unselect.
let _detailsCacheKick=false, _detailsLastSig=null;
// format NULL en base (≈97 réfs) : tout ce qui n'est pas explicitement
// « Bobine » se traite comme un FORMAT (palette/feuille) — jamais Ø/laize.
function _estFormat(p){const f=String(p&&p.format||'');return f!=='Bobine';}
const DETAILS_NONE='__none__'; // sentinel for "no details" option
const DETAILS_AUTRES='__autres__'; // sentinel « Autres » (détails non reconnus)
const DETAILS_MIN_N=20; // seuil (31/07) : un détail n'est montré qu'à ≥ 20 articles
// ── DÉTAILS CANONIQUES (16/07) : 1 272 libellés bruts → ~53 catégories. ──
// Le champ details recopie souvent la désignation entière (avec doublons,
// espaces, tirets) → le filtre listait des centaines d'entrées à 1 produit.
// re/excl = détection CLIENT (facettes, cache produits) ; pats/notPats = le
// MÊME concept en ilike PostgREST (* = joker) pour le filtre SERVEUR.
const DETAIL_TAGS=[
 {label:'FABRICATION',re:/FABRICATION/i,pats:['*fabrication*']},
 {label:'QUALITÉ A',re:/QUAL(ITE)?\s*\.?\s*A\b/i,pats:['*qual.a*','*qual a*','*qualite a*']},
 {label:'QUALITÉ B',re:/QUAL(ITE)?\s*\.?\s*B\b/i,pats:['*qual.b*','*qual b*','*qualite b*']},
 {label:'QUALITÉ C',re:/QUAL(ITE)?\s*\.?\s*C\b/i,pats:['*qual.c*','*qual c*','*qualite c*']},
 {label:'100% RECYCLÉ',re:/100\s*%?\s*REC|REC\s*\.?\s*100/i,pats:['*100*rec*','*rec*100*']},
 {label:'FIBRES VIERGES',re:/FIBRES?\s+VIERGES?|%\s*FIBRES/i,pats:['*fibre*vierge*','*% fibres*']},
 {label:'100% PP',re:/100\s*%?\s*PP|PP\s*\.?\s*100/i,pats:['*100*pp*','*pp100*','*pp 100*']},
 {label:'KRAFT',re:/KRAFT/i,excl:/KRAFTLINER/i,pats:['*kraft*'],notPats:['*kraftliner*']},
 {label:'KRAFTLINER',re:/KRAFTLINER/i,pats:['*kraftliner*']},
 {label:'TESTLINER',re:/TESTLINER/i,pats:['*testliner*']},
 {label:'FLUTING',re:/FLUTING/i,pats:['*fluting*']},
 {label:'VERGÉ',re:/VERGE/i,pats:['*verge*']},
 {label:'EN RAMES',re:/RAMES|ENRAMME/i,pats:['*rames*','*enramme*']},
 {label:'NON COUCHÉ',re:/NON\s+COUCHE/i,pats:['*non*couche*']},
 {label:'COUCHÉ',re:/COUCHE/i,excl:/NON\s+COUCHE/i,pats:['*couche*'],notPats:['*non*couche*']},
 {label:'SATINÉ',re:/SATINE/i,pats:['*satine*']},
 {label:'DEMI-MAT',re:/DEMI[\s-]*MAT/i,pats:['*demi*mat*']},
 {label:'MAT',re:/\bMAT\b/i,excl:/DEMI[\s-]*MAT/i,pats:['mat','mat *','* mat','* mat *'],notPats:['*demi*mat*']},
 {label:'BRILLANT',re:/BRILLANT/i,pats:['*brillant*']},
 {label:'MARTELÉ',re:/MARTELE/i,pats:['*martele*']},
 {label:'RUGUEUX',re:/RUGUEUX/i,pats:['*rugueux*']},
 {label:'LISSE',re:/\bLISSE\b/i,pats:['lisse','lisse *','* lisse','* lisse *']},
 {label:'MG',re:/\bMG\b/i,pats:['mg','mg *','* mg','* mg *']},
 {label:'MF',re:/\bMF\b/i,pats:['mf','mf *','* mf','* mf *']},
 {label:'OPAQUE',re:/OPAQUE/i,pats:['*opaque*']},
 {label:'CF',re:/\bCF\b/i,pats:['cf','cf *','* cf','* cf *']},
 {label:'CB',re:/\bCB\b/i,pats:['cb','cb *','* cb','* cb *']},
 {label:'CFB',re:/\bCFB\b/i,pats:['cfb','cfb *','* cfb','* cfb *']},
 {label:'GC1',re:/\bGC1\b/i,pats:['*gc1*']},
 {label:'GC2',re:/\bGC2\b/i,pats:['*gc2*']},
 {label:'GD2',re:/\bGD2\b/i,pats:['*gd2*']},
 {label:'GD3',re:/\bGD3\b/i,pats:['*gd3*']},
 {label:'GT',re:/\bGT[1-4]\b/i,pats:['*gt1*','*gt2*','*gt3*','*gt4*']},
 {label:'CKB',re:/\bCKB\b/i,pats:['*ckb*']},
 {label:'SBS',re:/\bSBS\b/i,pats:['*sbs*']},
 {label:'DOS CRÈME',re:/DOS\s+CREME/i,pats:['*dos*creme*']},
 {label:'DOS BLANC',re:/DOS\s+BLANC/i,pats:['*dos*blanc*']},
 {label:'DOS GRIS',re:/DOS\s+GRIS/i,pats:['*dos*gris*']},
 {label:'DOS BRUN',re:/DOS\s+BRUN/i,pats:['*dos*brun*']},
 {label:'LWC',re:/\bLWC\b/i,pats:['*lwc*']},
 {label:'PAPIER SÉCURITÉ',re:/SECURITE|FIBRES?\s+(IN)?VISIBLES?|FILIGRANE/i,pats:['*securite*','*fibre*visible*','*filigrane*']},
 {label:'PAPIER CADEAU',re:/CADEAU/i,pats:['*cadeau*']},
 {label:'PAPIER DÉCOR',re:/DECOR/i,pats:['*decor*']},
 {label:'PAPIER DESSIN',re:/DESSIN/i,pats:['*dessin*']},
 {label:'NOËL',re:/NO[EË]L/i,pats:['*noel*','*noël*']},
 {label:'CALQUE',re:/CALQUE/i,pats:['*calque*']},
 {label:'BOUFFANT',re:/BOUFFANT/i,pats:['*bouffant*']},
 {label:'SILICONE',re:/SILICONE/i,pats:['*silicone*']},
 {label:'SILK',re:/\bSILK\b/i,pats:['silk','silk *','* silk','* silk *']},
 {label:'PLASTIFIÉ / PLASTIQUE',re:/PLASTIFIE|PLASTIQUE/i,pats:['*plastifie*','*plastique*']},
 {label:'COMPLEXE',re:/COMPLEXE/i,pats:['*complexe*']},
 {label:'INGRAISSABLE',re:/INGRAISSABLE/i,pats:['*ingraissable*']},
 {label:'REH',re:/\bREH\b/i,pats:['reh','reh *','* reh','* reh *']},
 {label:'POUR ÉTIQUETTES',re:/ETIQUETTES?/i,pats:['*etiquette*']},
 {label:'REFENTE',re:/REFENTE/i,pats:['*refente*']},
 {label:'ALVÉOLE',re:/ALVEOLE/i,pats:['*alveole*']},
 {label:'TOILE',re:/\bTOILE\b/i,pats:['toile','toile *','* toile','* toile *']},
 {label:'GAUFRÉ',re:/GAUF+RE/i,pats:['*gaufre*','*gauffre*']},
 {label:'LIGNES',re:/\bLIGNES\b/i,pats:['lignes','lignes *','* lignes','* lignes *']},
 {label:'CHROMOLUX',re:/CHROMOLUX/i,pats:['*chromolux*']},
 {label:'CARTE',re:/\bCARTES?\b/i,pats:['*carte*']},
 {label:'ENCRE',re:/\bENCRE\b/i,pats:['*encre*']},
 {label:'EMBALLAGE',re:/EMBALLAGE/i,pats:['*emballage*']},
 {label:'TRANSITION',re:/TRANSITION|\bTR\s+(GRAMMAGE|FORMAT|VERS)\b/i,pats:['*transition*','*tr grammage*','*tr format*','*tr vers*']},
 {label:'TEINTÉ',re:/TEINTE|\bPALE\b|\bFONCEE?\b|\bCLAIRE?\b|FLUO/i,pats:['*teinte*','*pale*','*fonce*','*clair*','*fluo*']},
 {label:'EXTENSIBLE',re:/EXTENSIBLE/i,pats:['*extensible*']},
 {label:'ALUMINIUM',re:/\bALU(MINIUM)?\b/i,pats:['*aluminium*','*alu *','* alu','alu *']},
 {label:'A4',re:/\bA4\b/i,pats:['a4','a4 *','* a4','* a4 *']},
 {label:'A3',re:/\bA3\b/i,pats:['a3','a3 *','* a3','* a3 *']},
 {label:'NATURE',re:/\bNATURE\b/i,pats:['nature','nature *','* nature','* nature *']},
 {label:'GLASSINE',re:/GLASSINE/i,pats:['*glassine*']},
 {label:'LATEX',re:/\bLATEX\b/i,pats:['latex','latex *','* latex','* latex *']},
 {label:'FILET / ARMÉ',re:/FILET|\bARMES?\b/i,pats:['*filet*','arme','arme *','* arme','* arme *']},
];
// CIE : toute valeur est ARRONDIE à la plus proche de nos valeurs rondes
// (« CIE 161 » → CIE 160, « CIE 168 » → CIE 170) — demande Ethan 16/07.
const CIE_CANON=[100,110,120,130,140,150,160,170]; // pas de 10 en 10 (145/165 trop précis)
function _cieNearest(n){
  let best=CIE_CANON[0];
  for(const c of CIE_CANON){
    if(Math.abs(c-n)<Math.abs(best-n)||(Math.abs(c-n)===Math.abs(best-n)&&c>best))best=c;
  }
  return best;
}
// Groupes LOGIQUES du menu Détails — mêmes familles que le wizard BRS
// de Prodi Arrivages (teintes, fibres, finitions, dos, codes, qualités…).
// 3 familles simplifiées (18/07) — ex-7 familles du wizard fusionnées
const DETAIL_GROUPES=[
 {titre:'Teintes & finitions',tags:['CIE 100','CIE 110','CIE 120','CIE 130','CIE 140','CIE 150','CIE 160','CIE 170','TEINTÉ','LISSE','RUGUEUX','MG','MF','VERGÉ','COUCHÉ','NON COUCHÉ','SATINÉ','MAT','DEMI-MAT','BRILLANT','MARTELÉ','TOILE','GAUFRÉ','CHROMOLUX','ALVÉOLE','LIGNES','OPAQUE','DOS BLANC','DOS CRÈME','DOS GRIS','DOS BRUN']},
 {titre:'Matières & fibres',tags:['100% RECYCLÉ','FIBRES VIERGES','SILK','KRAFT','100% PP','BOUFFANT','SILICONE','PLASTIFIÉ / PLASTIQUE','COMPLEXE','ALUMINIUM','LATEX','GLASSINE','NATURE','FILET / ARMÉ','LWC','EMBALLAGE','TR GRAMMAGE']},
 {titre:'Codes & qualités',tags:['A3','A4','GC1','GC2','GD2','GD3','GT','CKB','SBS','CB','CF','CFB','EN RAMES','QUALITÉ A','QUALITÉ B','QUALITÉ C','FABRICATION','INGRAISSABLE','REH','POUR ÉTIQUETTES','REFENTE','CALQUE','PAPIER SÉCURITÉ','TESTLINER','KRAFTLINER','FLUTING','TRANSITION','ENCRE','PAPIER DESSIN','PAPIER CADEAU','PAPIER DÉCOR','NOËL','EXTENSIBLE','CARTE']},
];
const _detailTagCache=new Map();
function _detailTagsOf(raw){
  const s=String(raw||'').trim();
  if(!s)return [];
  let t=_detailTagCache.get(s);
  if(!t){
    const set=new Set(DETAIL_TAGS.filter(d=>d.re.test(s)&&!(d.excl&&d.excl.test(s))).map(d=>d.label));
    const cieRe=/CIE\s*-?\s*(\d{2,3})/gi;
    let m;
    while((m=cieRe.exec(s)))set.add('CIE '+_cieNearest(+m[1]));
    t=[...set];
    _detailTagCache.set(s,t);
  }
  return t;
}
// Clause serveur d'un tag CIE : tous les entiers dont l'arrondi tombe sur lui.
function _ciePg(canon){
  const pats=[];
  for(let n=90;n<=190;n++)if(_cieNearest(n)===canon)pats.push('details.ilike.*cie*'+n+'*');
  return 'or('+pats.join(',')+')';
}
function _detailTagPg(t){ // clause PostgREST d'UN tag
  const or_='or('+t.pats.map(x=>'details.ilike.'+x).join(',')+')';
  const base=t.pats.length>1?or_:'details.ilike.'+t.pats[0];
  if(t.notPats&&t.notPats.length)return 'and('+base+','+t.notPats.map(x=>'details.not.ilike.'+x).join(',')+')';
  return base;
}
function _detailAutresPg(){ // « Autres » = champ rempli mais AUCUN tag reconnu
  const nots=[];
  DETAIL_TAGS.forEach(t=>t.pats.forEach(x=>nots.push('details.not.ilike.'+x)));
  nots.push('details.not.ilike.*cie*');
  return 'and(details.not.is.null,details.neq.,'+nots.join(',')+')';
}
// Perf : les filtres numériques/texte lus dans le DOM (+ le querySelectorAll des
// pilules format) sont capturés UNE fois par passe de facettes, pas par ligne.
// _refreshAllFacets appelle le prédicat ~10× sur ~7 200 lignes = 72 000 lectures
// DOM sinon (mesuré : 210ms → l'essentiel du coût du filtrage). _fafBump()
// invalide le snapshot au début de chaque passe. Complémentaire du comptage O(n).
let _fafEpoch=0,_fafSnap=null,_fafSnapEpoch=-1;
function _fafBump(){ _fafEpoch++; }
function _fafState(){
  if(_fafSnap&&_fafSnapEpoch===_fafEpoch)return _fafSnap;
  const g=id=>document.getElementById(id);
  _fafSnap={
    gn:+g('f-gmin')?.value||0, gx:+g('f-gmax')?.value||0,
    lminCm:+g('f-lmin')?.value||0, lmaxCm:+g('f-lmax')?.value||0,
    longmin:+g('f-longmin')?.value||0, longmax:+g('f-longmax')?.value||0,
    wmin:+g('f-wmin')?.value||0, wmax:+g('f-wmax')?.value||0,
    refCode:(g('f-ref-code')?.value||'').trim().toUpperCase(),
    refMin:+g('f-refmin')?.value||0, refMax:+g('f-refmax')?.value||0,
    usineVal:(g('f-usine')?.value||'').trim(),
    zoneNum:(g('f-zone-num')?.value||'').trim(),
    zoneLet:(g('f-zone-let')?.value||'').trim().toUpperCase(),
    formats:new Set([...document.querySelectorAll('.fpill.active:not(.fpill-orig):not(.fpill-stock):not(.fpill-depot):not(.fpill-photo):not(.fpill-resa)')].map(b=>b.dataset.format)),
  };
  _fafSnapEpoch=_fafEpoch;
  return _fafSnap;
}
function _matchesActiveFilters(row, excludeKey){
  const types=getMsdValues('msd-type');
  if(excludeKey!=='msd-type' && types.size>0){
    const hasAutres=types.has('AUTRES');
    const known=[...types].filter(c=>c!=='AUTRES');
    const sideCodes=known.flatMap(c=>_isCouleurPseudo(c)?['RCOL']:[c]);
    const q=row.quality||'';
    if(hasAutres && !sideCodes.length){
      if(QUALITE_KNOWN_DB.includes(q)) return false;
    } else if(hasAutres){
      if(!sideCodes.includes(q) && QUALITE_KNOWN_DB.includes(q)) return false;
    } else if(!sideCodes.includes(q)) return false;
  }
  // Détails : manquait ici (18/07) → les compteurs des autres menus
  // annonçaient des produits incompatibles avec le détail coché (« 120 » → 0).
  if(excludeKey!=='msd-details'){
    const dets=getMsdValues('msd-details');
    if(dets.size>0){
      const raw=String(row.details||'').trim();
      const tags=raw?_detailTagsOf(raw):[];
      let ok=false;
      for(const v of dets){
        if(v===DETAILS_NONE){ if(!raw){ok=true;break;} }
        else if(v===DETAILS_AUTRES){ if(raw&&!tags.length){ok=true;break;} }
        else if(tags.includes(v)){ok=true;break;}
      }
      if(!ok) return false;
    }
  }
  if(excludeKey!=='msd-couleur'){
    const couleurs=getMsdValues('msd-couleur');
    if(couleurs.size>0){
      const dbColors=[...couleurs].flatMap(c=>_COLOR_DB[c]||[c]);
      if(!dbColors.includes(row.color)) return false;
    }
  }
  if(excludeKey!=='msd-mandrin'){
    const mandrins=getMsdValues('msd-mandrin');
    if(mandrins.size>0 && !mandrins.has(String(row.noyau))) return false;
  }
  if(excludeKey!=='msd-format'){
    const fmts=getMsdValues('msd-format');
    if(fmts.size>0 && !fmts.has(_formatFamilleOf(row)||'')) return false;
  }
  if(excludeKey!=='msd-grammage'){
    const gsms=getMsdValues('msd-grammage');
    if(gsms.size>0 && !gsms.has(_grammageFamilleOf(row)||'')) return false;
  }
  if(excludeKey!=='msd-laize'){
    const lzs=getMsdValues('msd-laize');
    if(lzs.size>0 && !lzs.has(_laizeFamilleOf(row)||'')) return false;
  }
  if(excludeKey!=='msd-usine'){
    const usines=getMsdValues('msd-usine');
    if(usines.size>0 && !usines.has(String(row.usine||'').trim())) return false;
  }
  if(excludeKey!=='msd-diametre'){
    const dms=getMsdValues('msd-diametre');
    if(dms.size>0 && !dms.has(_diamFamilleOf(row)||'')) return false;
  }
  if(excludeKey!=='msd-poids'){
    const pds=getMsdValues('msd-poids');
    if(pds.size>0 && !pds.has(_poidsTrancheOf(row)||'')) return false;
  }
  const S=_fafState();
  // La plage grammage (curseur) appartient au menu Grammages : on l'exclut
  // quand on calcule ses propres bornes/facettes (_gslAdapt).
  if(excludeKey!=='msd-grammage'){
    if(S.gn && +row.gsm<S.gn) return false;
    if(S.gx && +row.gsm>S.gx) return false;
  }
  if(excludeKey!=='msd-laize'){
    if(S.lminCm && +row.width<S.lminCm) return false;
    if(S.lmaxCm && +row.width>S.lmaxCm) return false;
  }
  if(excludeKey!=='msd-diametre'){
    if(S.longmin && +row.longueur<S.longmin) return false;
    if(S.longmax && +row.longueur>S.longmax) return false;
  }
  if(excludeKey!=='msd-poids'){
    if(S.wmin && +row.weight<S.wmin) return false;
    if(S.wmax && +row.weight>S.wmax) return false;
  }
  if(_photoFilter==='with' && !row.image_url) return false;
  if(_photoFilter==='without' && row.image_url) return false;
  if(_resaFilter==='with' && !row.reserve_client) return false;
  if(_resaFilter==='without' && row.reserve_client) return false;
  if(S.refCode && !String(row.quality||'').toUpperCase().startsWith(S.refCode)) return false;
  if(S.refMin||S.refMax){
    const refNum=parseInt(String(row.ref||'').replace(/\D/g,''),10);
    if(!refNum)return false;
    if(S.refMin&&!S.refMax){ if(refNum!==S.refMin)return false; }
    else {
      if(S.refMin&&refNum<S.refMin)return false;
      if(S.refMax&&refNum>S.refMax)return false;
    }
  }
  if(S.usineVal && String(row.usine||'')!==S.usineVal) return false;
  if(S.zoneNum || S.zoneLet){
    const zStr=String(row.zone||'').toUpperCase();
    if(S.zoneNum && S.zoneLet){ if(!zStr.startsWith(S.zoneNum+S.zoneLet)) return false; }
    else if(S.zoneNum){ if(!zStr.startsWith(S.zoneNum)) return false; }
    else if(S.zoneLet){ if(!zStr.includes(S.zoneLet)) return false; }
  }
  if(S.formats.size && !S.formats.has(row.format)) return false;
  return true;
}
// ── Faceting for hardcoded msd (Type / Couleurs / Mandrins) ──
// The option list itself is fixed; we just refresh counts + hide the 0s.
// Comptage des facettes en UNE passe (O(lignes) au lieu de O(lignes×options)).
function _countFacet(baseRows,msdId){
  const counts={};
  if(msdId==='msd-couleur'){
    for(const r of baseRows){const v=_COLOR_REV[r.color]; if(v!==undefined)counts[v]=(counts[v]||0)+1;}
    return counts;
  }
  if(msdId==='msd-mandrin'){
    for(const r of baseRows){const v=String(r.noyau); counts[v]=(counts[v]||0)+1;}
    return counts;
  }
  if(msdId==='msd-usine'){
    for(const r of baseRows){const v=String(r.usine||'').trim(); counts[v]=(counts[v]||0)+1;}
    return counts;
  }
  if(msdId==='msd-type'){
    const off=COULEUR_SPLIT.offsetLabel,dos=COULEUR_SPLIT.dossierLabel,th=COULEUR_SPLIT.threshold;
    for(const r of baseRows){
      const q=r.quality||''; let v;
      if(!QUALITE_KNOWN_DB.includes(q)) v='AUTRES';
      else v=q;
      counts[v]=(counts[v]||0)+1;
    }
    return counts;
  }
  let deriv;
  if(msdId==='msd-format')deriv=_formatFamilleOf;
  else if(msdId==='msd-grammage')deriv=_grammageFamilleOf;
  else if(msdId==='msd-laize')deriv=_laizeFamilleOf;
  else if(msdId==='msd-diametre')deriv=_diamFamilleOf;
  else if(msdId==='msd-poids')deriv=_poidsTrancheOf;
  else return counts;
  for(const r of baseRows){const v=deriv(r); if(v!=null)counts[v]=(counts[v]||0)+1;}
  return counts;
}
function _allMsdContainers(msdId){
  const ids=[msdId,'sb-'+msdId,msdId+'-sidebar',msdId+'-mob','sb-'+msdId+'-mob'];
  return ids.map(id=>document.getElementById(id)).filter(Boolean);
}
const _facetSig={};
// Un menu OUVERT ne doit jamais se réordonner sous le curseur (vécu 21/07 :
// le cache stock arrive pendant que le menu est ouvert → recomptage + tri par
// volume + zéros masqués = « la liste change toute seule »). On diffère la mise
// à jour du menu ouvert et on la rejoue à sa fermeture.
const _facetPending={};
function _flushFacetsApresFermeture(){
  Object.keys(_facetPending).forEach(k=>{delete _facetPending[k];_updateMsdFacetCounts(k);});
  if(window._detailsPending){window._detailsPending=false;_rebuildDetailsMsd();}
}
function _updateMsdFacetCounts(msdId){
  if(!_allProductsCache) return;
  const conts=_allMsdContainers(msdId);
  if(!conts.length) return;
  // Menu ouvert : différé — SAUF s'il n'a encore aucun compteur (premier
  // remplissage, ex. nav privée) : là on applique tout de suite, c'est ce que
  // l'utilisateur attend (trié direct à la première ouverture).
  const _dejaCompte=conts.some(c=>c.querySelector('.msd-count-inline'));
  if(_dejaCompte&&conts.some(c=>c.querySelector('.msd-panel.show'))){_facetPending[msdId]=1;return;}
  const allOpts=conts.flatMap(c=>[...c.querySelectorAll('.msd-option')]);
  if(!allOpts.length) return;
  const values=[...new Set(allOpts.map(o=>o.dataset.val).filter(Boolean))];
  // Skip if neither the active filters NOR our own option set changed
  // (la sélection Détails compte aussi depuis qu'elle pèse sur les facettes, 18/07)
  const sig=_detailsFiltersSig()+'|det:'+[...getMsdValues('msd-details')].sort().join(',')+'|'+values.sort().join(',')+'|'+[...msdState[msdId]].sort().join(',');
  if(_facetSig[msdId]===sig) return;
  _facetSig[msdId]=sig;
  const baseRows=_allProductsCache.filter(r=>_matchesActiveFilters(r,msdId));
  const counts=_countFacet(baseRows,msdId);
  const sel=msdState[msdId];
  conts.forEach(cont=>{
    const searchInp=cont.querySelector('.msd-search-inp');
    const q=(searchInp?.value||'').toLowerCase();
    cont.querySelectorAll('.msd-option').forEach(opt=>{
      const v=opt.dataset.val;
      const n=counts[v]||0;
      let cnt=opt.querySelector('.msd-count-inline');
      if(!cnt){
        cnt=document.createElement('span');
        cnt.className='msd-count-inline';
        opt.appendChild(cnt);
      }
      cnt.textContent=n;
      let visible = !(n===0 && !sel.has(v));
      if(visible && q){
        const hay=(opt.textContent+' '+(opt.dataset.search||'')).toLowerCase();
        if(!hay.includes(q)) visible=false;
      }
      opt.style.display = visible ? '' : 'none';
      opt.style.opacity = (n===0 && sel.has(v)) ? '.45' : '';
    });
    // Tri par count desc (les types les plus disponibles en haut)
    if(msdId==='msd-type'){
      const panel=cont.querySelector('.msd-panel');
      if(panel){
        const opts=[...panel.querySelectorAll('.msd-option')];
        opts.sort((a,b)=>(counts[b.dataset.val]||0)-(counts[a.dataset.val]||0));
        opts.forEach(o=>panel.appendChild(o));
      }
    }
  });
}
// Réf usine : options construites depuis le cache (valeurs du stock du jour),
// triées par nombre de produits — la barre de recherche vient de buildMsdOptions.
let _usineOptionsBuilt=false;
function _buildUsineOptions(){
  if(_usineOptionsBuilt||!_allProductsCache)return;
  const cnt=new Map();
  _allProductsCache.forEach(r=>{
    const u=String(r.usine||'').trim();
    if(u)cnt.set(u,(cnt.get(u)||0)+1);
  });
  const vals=[...cnt.entries()].sort((a,b)=>b[1]-a[1]).map(([u])=>u);
  if(!vals.length)return;
  buildMsdOptions('sb-msd-usine',vals,'Réf usine',undefined,'msd-usine');
  buildMsdOptions('msd-usine-mob',vals,'Réf usine',undefined,'msd-usine');
  _usineOptionsBuilt=true;
}
function _refreshAllFacets(){
  _fafBump();
  _buildUsineOptions();
  _rebuildDetailsMsd();
  _updateMsdFacetCounts('msd-type');
  _updateMsdFacetCounts('msd-couleur');
  _updateMsdFacetCounts('msd-mandrin');
  _updateMsdFacetCounts('msd-format');
  _updateMsdFacetCounts('msd-grammage');
  _updateMsdFacetCounts('msd-laize');
  _updateMsdFacetCounts('msd-usine');
  _updateMsdFacetCounts('msd-diametre');
  _updateMsdFacetCounts('msd-poids');
  _gslAdapt();
  _rsAdapt();
}
function _detailsFiltersSig(){
  // Signature of all filters EXCEPT msd-details — used to skip rebuild
  // when only the details selection itself changed.
  return JSON.stringify({
    t:[...getMsdValues('msd-type')].sort(),
    c:[...getMsdValues('msd-couleur')].sort(),
    m:[...getMsdValues('msd-mandrin')].sort(),
    gn:document.getElementById('f-gmin')?.value||'',
    gx:document.getElementById('f-gmax')?.value||'',
    lmin:document.getElementById('f-lmin')?.value||'',
    lmax:document.getElementById('f-lmax')?.value||'',
    lgmin:document.getElementById('f-longmin')?.value||'',
    lgmax:document.getElementById('f-longmax')?.value||'',
    wmin:document.getElementById('f-wmin')?.value||'',
    wmax:document.getElementById('f-wmax')?.value||'',
    // TOUTES les sélections de menus (19/07 — un grammage coché doit
    // invalider les compteurs de Couleurs, etc.) ; msd-details exclu par
    // design (le panneau Détails s'auto-exclut), réinjecté par les facettes.
    ms:Object.keys(msdState).filter(k=>k!=='msd-details').map(k=>k+':'+[...msdState[k]].sort().join('|')).join(';'),
    ph:_photoFilter, rsv:_resaFilter||0,
    ref:document.getElementById('f-ref-code')?.value||'',
    rmin:document.getElementById('f-refmin')?.value||'',
    rmax:document.getElementById('f-refmax')?.value||'',
    us:document.getElementById('f-usine')?.value||'',
    zn:document.getElementById('f-zone-num')?.value||'',
    zl:document.getElementById('f-zone-let')?.value||'',
    fmt:[...document.querySelectorAll('.fpill.active:not(.fpill-orig):not(.fpill-stock):not(.fpill-depot):not(.fpill-photo):not(.fpill-resa)')].map(b=>b.dataset.format).sort(),
  });
}
let _detGrpOpen=null; // famille de sous-détails ouverte dans le panneau Détails
function _rebuildDetailsMsd(){
  const containers=['sb-msd-details','msd-details-mob'].map(id=>document.getElementById(id)).filter(Boolean);
  if(!containers.length) return;
  // First pass: handle the loading state on every panel
  if(!_allProductsCache){
    if(!_detailsCacheKick){
      _detailsCacheKick=true;
      // Perf 18/07 : chargé en IDLE (3,4 Mo de JSON) — hors chemin critique.
      const _kick=()=>_loadAllProducts().then(()=>{
        _detailsLastSig=null;
        Object.keys(_facetSig).forEach(k=>delete _facetSig[k]);
        _refreshAllFacets();
        // le cache conditionne la déduction bobine/format des menus : la
        // recalculer maintenant (un type a pu être choisi avant l'arrivée)
        updateFilterVisibility();
      }).catch(()=>{});
      if('requestIdleCallback' in window)requestIdleCallback(_kick,{timeout:5000});
      else setTimeout(_kick,2500);
    }
    containers.forEach(msd=>{
      const p=msd.querySelector('.msd-panel');
      if(p) p.innerHTML='<div class="msd-search-wrap"><input class="msd-search-inp" type="text" placeholder="Chargement…" disabled></div>';
    });
    return;
  }
  // Menu Détails OUVERT : on ne reconstruit pas sous le curseur — différé à la
  // fermeture (sauf s'il affiche encore « Chargement… », là on le remplit).
  if(containers.some(c=>{const p=c.querySelector('.msd-panel.show');return p&&!p.querySelector('.msd-search-inp[disabled]');})){window._detailsPending=true;return;}
  // Skip rebuild when only the details selection itself changed (preserves
  // panel scroll, search-bar text and avoids visual flicker while the user
  // is ticking boxes inside the dropdown).
  const sig=_detailsFiltersSig();
  if(sig===_detailsLastSig){ updateMsdBtn('msd-details'); return; }
  _detailsLastSig=sig;
  const rows=_allProductsCache.filter(r=>_matchesActiveFilters(r,'msd-details'));
  const counts=new Map();
  let emptyN=0,autresN=0;
  rows.forEach(r=>{
    const raw=String(r.details||'').trim();
    if(!raw){ emptyN++; return; }
    const tags=_detailTagsOf(raw);
    if(!tags.length){ autresN++; return; }
    tags.forEach(t=>{
      const cur=counts.get(t);
      if(cur){ cur.n++; } else { counts.set(t,{label:t,n:1}); }
    });
  });
  const sel=msdState['msd-details'];
  sel.forEach(v=>{
    if(v===DETAILS_NONE||v===DETAILS_AUTRES)return;
    if(!counts.has(v)) counts.set(v,{label:v,n:0});
  });
  // LISTE PLATE (31/07, Ethan) : plus de sous-familles. Tous les détails triés
  // par volume, avec un SEUIL DE 20 ARTICLES — en dessous le détail n'est pas
  // montré et ses articles rejoignent « Autres / Sans détails » (cocher Autres
  // sélectionne aussi ces petits tags : serveur et client suivent tout seuls).
  const _estCieTag=l=>/^CIE \d+$/.test(l);
  const cieEntries=[...counts.values()].filter(e=>_estCieTag(e.label));
  const plats=[...counts.values()].filter(e=>!_estCieTag(e.label));
  // Seuil ADAPTATIF (07/08, Ethan) : le 20 était calibré sur la GLOBALITÉ du
  // stock. Dans une petite catégorie il masquait tout → on l'abaisse au prorata
  // du nombre de produits courant (élevé sur tout le stock, bas en sous-ensemble).
  const _detMinN=Math.max(2,Math.min(DETAILS_MIN_N,Math.ceil(rows.length/50)));
  const visibles=plats.filter(e=>e.n>=_detMinN||sel.has(e.label)).sort((a,b)=>b.n-a.n);
  window._detRareTags=new Set(plats.filter(e=>e.n<_detMinN&&!sel.has(e.label)).map(e=>e.label));
  // Compteur d'Autres = ce que rend RÉELLEMENT le clic (sans détails + non
  // reconnus + tout article portant au moins un petit tag) — comme les autres
  // facettes, un article à 2 tags compte dans chacun.
  let orphelinsN=0;
  rows.forEach(r=>{
    const raw=String(r.details||'').trim();
    if(!raw)return;
    const tags=_detailTagsOf(raw);
    if(tags.length&&tags.some(t=>window._detRareTags.has(t)))orphelinsN++;
  });
  // Render the same option list into each container (sidebar + mobile drawer)
  containers.forEach(msd=>{
    const panel=msd.querySelector('.msd-panel');
    if(!panel) return;
    panel.innerHTML='';
    const sw=document.createElement('div');
    sw.className='msd-search-wrap';
    sw.innerHTML='<input class="msd-search-inp" type="text" placeholder="Rechercher…" autocomplete="off">';
    panel.appendChild(sw);
    sw.addEventListener('click',e=>e.stopPropagation());
    const mkOpt=(val,label,n,extraCls,grp)=>{
      const opt=document.createElement('div');
      opt.className='msd-option'+(extraCls?' '+extraCls:'');
      opt.setAttribute('data-val',val);
      if(grp)opt.dataset.grp=grp;
      if(sel.has(val)) opt.classList.add('selected');
      const dim=n===0?' style="opacity:.45"':'';
      opt.innerHTML=`<div class="msd-check"><svg width="9" height="7" fill="none" stroke="#fff" stroke-width="2.5"><polyline points="1,4 3.5,6.5 8,1"/></svg></div><span class="msd-label"${dim}>${esc(label)}</span><span class="msd-count-inline">${n}</span>`;
      opt.addEventListener('click',()=>toggleMsdOption(opt,'msd-details'));
      panel.appendChild(opt);
    };
    // Blancheur CIE en DOUBLE CURSEUR (31/07, même délire que Grammages) :
    // les cases « CIE 100…170 » deviennent une plage de 10 en 10 qui coche
    // les mêmes tags msd-details (sémantique de filtre inchangée).
    const _estCie=l=>/^CIE \d+$/.test(l);
    const mkCieSlider=(entries,grp)=>{
      const vals=entries.map(e=>+e.label.slice(4)).sort((a,b)=>a-b);
      const LO=vals[0],HI=vals[vals.length-1],PAS=10,W=HI-LO||1;
      const box=document.createElement('div');
      box.className='gsl gsl-cie';
      if(grp)box.dataset.grp=grp;
      box.innerHTML='<div class="gsl-val"></div>'+
        '<div class="gsl-track"><div class="gsl-fill"></div>'+
        '<input type="range" min="'+LO+'" max="'+HI+'" step="'+PAS+'" value="'+LO+'" data-role="min" aria-label="Blancheur CIE minimum">'+
        '<input type="range" min="'+LO+'" max="'+HI+'" step="'+PAS+'" value="'+HI+'" data-role="max" aria-label="Blancheur CIE maximum">'+
        '</div><div class="gsl-bornes"><span>CIE '+LO+'</span><span>CIE '+HI+'</span></div>';
      panel.appendChild(box);
      const iMin=box.querySelector('[data-role=min]'),iMax=box.querySelector('[data-role=max]');
      const fill=box.querySelector('.gsl-fill'),lbl=box.querySelector('.gsl-val');
      const paintCie=()=>{
        let a=+iMin.value,b=+iMax.value;
        if(a>b){const t=a;a=b;b=t;}
        fill.style.left=((a-LO)/W*100)+'%';
        fill.style.right=(100-(b-LO)/W*100)+'%';
        const plein=(a<=LO&&b>=HI);
        lbl.textContent=plein?'Toutes les blancheurs':'CIE '+a+' – '+b;
        return {a,b,plein};
      };
      const applyCie=()=>{
        const r=paintCie();
        [...sel].forEach(v=>{if(_estCie(v))sel.delete(v);});
        if(!r.plein)vals.forEach(v=>{if(v>=r.a&&v<=r.b)sel.add('CIE '+v);});
        updateMsdBtn('msd-details');
        filterProducts();
      };
      const track=box.querySelector('.gsl-track');
      const fromX=x=>{
        const rc=track.getBoundingClientRect();
        if(!rc.width)return LO;
        let v=LO+(x-rc.left)/rc.width*(HI-LO);
        v=Math.round(v/PAS)*PAS;
        return Math.min(HI,Math.max(LO,v));
      };
      let drag=null;
      track.addEventListener('pointerdown',e=>{
        e.preventDefault();e.stopPropagation();
        const v=fromX(e.clientX);
        const dMin=Math.abs(v-+iMin.value),dMax=Math.abs(v-+iMax.value);
        drag=(dMin<dMax||(dMin===dMax&&v<+iMin.value))?iMin:iMax;
        drag.value=v;paintCie();
        try{track.setPointerCapture(e.pointerId);}catch(_){}
      });
      track.addEventListener('pointermove',e=>{if(!drag)return;drag.value=fromX(e.clientX);paintCie();});
      const endCie=()=>{if(!drag)return;drag=null;applyCie();};
      track.addEventListener('pointerup',endCie);
      track.addEventListener('pointercancel',endCie);
      box.addEventListener('click',e=>e.stopPropagation());
      msd._cieSync=()=>{
        const cur=[...sel].filter(_estCie).map(v=>+v.slice(4)).filter(v=>v>=LO&&v<=HI);
        iMin.value=cur.length?Math.min(...cur):LO;
        iMax.value=cur.length?Math.max(...cur):HI;
        paintCie();
      };
      msd._cieSync();
    };
    // Curseur CIE en tête, puis la LISTE PLATE triée par volume
    if(cieEntries.length>=2)mkCieSlider(cieEntries,null);
    else cieEntries.forEach(en=>mkOpt(en.label,en.label,en.n,null,null));
    visibles.forEach(en=>mkOpt(en.label,en.label,en.n,null,null));
    // « Autres / Sans détails » : coche les deux sentinelles ET les petits
    // tags sous le seuil (leurs articles restent donc trouvables ici).
    if(autresN>0||emptyN>0||orphelinsN>0||sel.has(DETAILS_AUTRES)||sel.has(DETAILS_NONE)){
      const on=sel.has(DETAILS_AUTRES)||sel.has(DETAILS_NONE);
      const opt=document.createElement('div');
      opt.className='msd-option msd-option-none'+(on?' selected':'');
      opt.innerHTML=`<div class="msd-check"><svg width="9" height="7" fill="none" stroke="#fff" stroke-width="2.5"><polyline points="1,4 3.5,6.5 8,1"/></svg></div><span class="msd-label">Autres / Sans détails</span><span class="msd-count-inline">${autresN+emptyN+orphelinsN}</span>`;
      opt.addEventListener('click',()=>{
        const cur=sel.has(DETAILS_AUTRES)||sel.has(DETAILS_NONE);
        if(cur){
          sel.delete(DETAILS_AUTRES);sel.delete(DETAILS_NONE);
          if(window._detRareTags)window._detRareTags.forEach(t=>sel.delete(t));
        }else{
          sel.add(DETAILS_AUTRES);sel.add(DETAILS_NONE);
          if(window._detRareTags)window._detRareTags.forEach(t=>sel.add(t));
        }
        opt.classList.toggle('selected',!cur);
        updateMsdBtn('msd-details');
        filterProducts();
      });
      panel.appendChild(opt);
    }
    const apply=()=>{
      const query=(sw.querySelector('.msd-search-inp').value||'').trim().toLowerCase();
      [...panel.querySelectorAll('.msd-option')].forEach(o=>{o.style.display=!query||o.textContent.toLowerCase().includes(query)?'':'none';});
      [...panel.querySelectorAll('.gsl-cie')].forEach(s=>{s.style.display=!query||/ci|blanc/.test(query)?'':'none';});
    };
    sw.querySelector('.msd-search-inp').addEventListener('input',apply);
    msd._applyL2=apply;
    const btn=msd.querySelector('.msd-btn');
    if(btn&&!btn._l2hook){
      btn._l2hook=true;
      // Chaque ouverture : recherche vidée
      btn.addEventListener('click',()=>{const i=msd.querySelector('.msd-search-inp');if(i)i.value='';msd._applyL2&&msd._applyL2();});
    }
    apply();
  });
  updateMsdBtn('msd-details');
}

// ===== AUTOCOMPLETE =====
let _sugIdx=-1;
function onSearchInput(inp){
  document.getElementById('search-input-mob')&&(document.getElementById('search-input-mob').value=inp.value);
  filterProducts();
  showSuggestions(inp.value,inp);
}
function onSearchKeydown(e){
  const box=document.getElementById('search-suggest');
  const items=[...box.querySelectorAll('.suggest-item')];
  if(!box.classList.contains('show')||!items.length){if(e.key==='Escape')hideSuggestions();return;}
  if(e.key==='ArrowDown'){e.preventDefault();_sugIdx=Math.min(_sugIdx+1,items.length-1);items.forEach((it,i)=>it.classList.toggle('active',i===_sugIdx));}
  else if(e.key==='ArrowUp'){e.preventDefault();_sugIdx=Math.max(_sugIdx-1,0);items.forEach((it,i)=>it.classList.toggle('active',i===_sugIdx));}
  else if(e.key==='Enter'&&_sugIdx>=0){e.preventDefault();items[_sugIdx].click();}
  else if(e.key==='Escape'){hideSuggestions();}
}
function showSuggestions(val,inp){
  const box=document.getElementById('search-suggest');
  const el=inp||document.getElementById('search-input');
  const raw=val.trim();
  if(!raw){hideSuggestions();return;}
  const tokens=_norm(raw).split(/[\s,;/x×*]+/).filter(Boolean);
  const last=tokens[tokens.length-1];
  if(!last||last.length<1){hideSuggestions();return;}

  // Number typed → suggest grammage/laize hint
  const numMatch=last.match(/^(\d+)$/);
  if(numMatch){
    const n=+numMatch[1];
    const hints=[];
    if(n>=20&&n<=800)hints.push({label:`${n} g/m² — Filtrer par grammage`,action:`${raw.replace(/\d+$/,'')}${n}g `});
    if(n>=200&&n<=3500)hints.push({label:`${n} mm — Filtrer par laize`,action:`${raw.replace(/\d+$/,'')}${n}mm `});
    if(hints.length){
      box.innerHTML=hints.map(h=>`<div class="suggest-item suggest-hint" onclick="document.getElementById('search-input').value=${attrJs(h.action.trim())};filterProducts();hideSuggestions()"><span>${esc(h.label)}</span></div>`).join('');
      const rect=el.getBoundingClientRect();
      box.style.cssText=`position:fixed;top:${rect.bottom+5}px;left:${rect.left}px;min-width:${rect.width+60}px;`;
      box.classList.add('show');_sugIdx=-1;return;
    }
  }

  // Filter intent suggestion — if the token looks like a filter category name,
  // offer a direct "→ Use this filter" shortcut before vocabulary matches
  const intentMatch=_matchFilterIntent(last);
  if(intentMatch){
    const idx=FILTER_INTENTS.indexOf(intentMatch);
    box.innerHTML=`<div class="suggest-item suggest-filter-hint" onclick="_applyFilterIntent(FILTER_INTENTS[${numId(idx)}])">
      <span class="suggest-label">Filtrer par <strong>${esc(intentMatch.label)}</strong></span>
      <span class="suggest-check" style="color:var(--red)">→</span>
    </div>`;
    const rect=el.getBoundingClientRect();
    box.style.cssText=`position:fixed;top:${rect.bottom+5}px;left:${rect.left}px;min-width:${Math.max(rect.width,280)}px;`;
    box.classList.add('show');_sugIdx=-1;return;
  }

  // Score: 0=exact alias, 1=prefix alias, 2=prefix vocab, 3+=fuzzy
  const seen=new Set();
  const candidates=[];
  for(const[k,v] of ALIAS_MAP){
    if(seen.has(v.display))continue;
    if(k===last){candidates.push({v,score:0});seen.add(v.display);}
    else if(k.startsWith(last)){candidates.push({v,score:1});seen.add(v.display);}
    else{const d=lev(last,k);if(d<=Math.min(3,Math.floor(last.length/2))){candidates.push({v,score:10+d});seen.add(v.display);}}
  }
  for(const v of SEARCH_VOCAB){
    if(seen.has(v.display))continue;
    if(v.norm===last){candidates.push({v,score:0});seen.add(v.display);}
    else if(v.norm.startsWith(last)){candidates.push({v,score:2});seen.add(v.display);}
    else{const d=lev(last,v.norm);if(d<=Math.min(3,Math.floor(last.length/2))){candidates.push({v,score:10+d});seen.add(v.display);}}
  }
  const scored=candidates.sort((a,b)=>a.score-b.score||a.v.display.localeCompare(b.v.display)).slice(0,7);
  if(!scored.length){hideSuggestions();return;}

  const kindLabel={type:'📄 Type',color:'🎨 Couleur',format:'📦 Format'};
  const kindColor={type:'var(--ink)','color':'var(--red)',format:'#059669'};
  box.innerHTML=scored.map(({v,score})=>`
    <div class="suggest-item" onclick="applySuggestion(${attrJs(v.display)})">
      <span class="suggest-label">${esc(v.display)}</span>
      ${score===0?'<span class="suggest-check">✓</span>':''}
    </div>`).join('');
  _sugIdx=-1;
  const rect=el.getBoundingClientRect();
  box.style.cssText=`position:fixed;top:${rect.bottom+5}px;left:${rect.left}px;min-width:${Math.max(rect.width,280)}px;`;
  box.classList.add('show');
}
function hideSuggestions(){
  const box=document.getElementById('search-suggest');
  box.classList.remove('show');
  _sugIdx=-1;
}
function applySuggestion(display){
  const inp=document.getElementById('search-input');
  // Replace last token with selected suggestion
  const parts=inp.value.trim().split(/\s+/);
  parts[parts.length-1]=display;
  inp.value=parts.join(' ')+' ';
  hideSuggestions();
  inp.focus();
  filterProducts();
}
document.addEventListener('click',e=>{
  if(!e.target.closest('#search-suggest')&&!e.target.closest('#search-input'))hideSuggestions();
});
// =========================

// Detected type display names from last search (for equivalents banner)
let _lastDetectedTypes=[];
let _lastFilterIntents=[];

let _exactMode=false;
function toggleExactMode(on){
  _exactMode=!!on;
  filterProducts();
}

function parseSearchQuery(raw){
  if(!raw){_lastDetectedTypes=[];_lastFilterIntents=[];return{text:[],gsm:null,width:null,formats:[],colors:[],qualityCodes:[],corrections:[],detectedTypes:[],filterIntents:[],exact:false};}
  // Exact mode: toggle button active → no alias, no fuzzy, literal substring match
  if(_exactMode){
    _lastDetectedTypes=[];_lastFilterIntents=[];
    return{text:[raw.trim()],gsm:null,width:null,formats:[],colors:[],qualityCodes:[],corrections:[],detectedTypes:[],filterIntents:[],exact:true};
  }
  const STOP=new Set(['de','du','le','la','les','en','et','un','une','kg','kilo','tonne','tonnes','paper','papier','carton','board','sur','stock','lot','lots','reel','sheet']);
  const CTX_GSM=new Set(['gramme','grammes','grammage','gms','gsm','g/m2','g/m','grm','grms','gr','gm','gm2']);
  const CTX_WIDTH=new Set(['laize','largeur','millimetre','millimetres','mm','larg']);
  const CTX_NOYAU=new Set(['noyau','mandrin','noyaux','mandrins']);
  // Pre-process: expand "700x1000" or "700×1000" dimension notation
  const dimExpanded=raw.replace(/(\d+)\s*[x×*]\s*(\d+)/gi,(m,a,b)=>`${a} ${b}`);
  const normed=_norm(dimExpanded);
  const tokens=normed.split(/[\s,;/]+/).filter(Boolean);
  const res={text:[],gsm:null,width:null,noyau:null,formats:[],colors:[],qualityCodes:[],corrections:[],detectedTypes:[],filterIntents:[]};
  const usedIdx=new Set();

  // ── Pass 1: multi-word phrase matching (3-word, then 2-word) ──
  for(let i=0;i<tokens.length;i++){
    for(const len of[3,2]){
      if(i+len>tokens.length)continue;
      const phrase=tokens.slice(i,i+len).join(' ');
      const a=ALIAS_MAP.get(phrase);
      if(a){
        if(a.kind==='type'){res.qualityCodes.push(...a.codes);res.detectedTypes.push(a.display);}
        else if(a.kind==='format')res.formats.push(a.display);
        else if(a.kind==='color')res.colors.push(a.display);
        for(let k=i;k<i+len;k++)usedIdx.add(k);
        i+=len-1; break;
      }
    }
  }

  // ── Pass 2: single tokens ──
  let nextIs=null;
  let prevWasUnknownText=false; // true after an unrecognized word → next number = text too
  for(let i=0;i<tokens.length;i++){
    if(usedIdx.has(i))continue;
    const tok=tokens[i];
    if(STOP.has(tok))continue;
    if(CTX_GSM.has(tok)){nextIs='gsm';prevWasUnknownText=false;continue;}
    if(CTX_WIDTH.has(tok)){nextIs='width';prevWasUnknownText=false;continue;}
    if(CTX_NOYAU.has(tok)){nextIs='noyau';prevWasUnknownText=false;continue;}
    const nm=tok.match(/^(\d+)(g\/m2|g\/m²|grm|grms|g\/m|gsm|gm2|gm|gramme|grammes|gms|gr|g)?$/);
    if(nm){const n=+nm[1];
      const hasGsmSuffix=!!nm[2];
      if(nextIs==='gsm'||hasGsmSuffix){res.gsm=n;nextIs=null;prevWasUnknownText=false;continue;}
      if(nextIs==='width'){res.width=n;nextIs=null;prevWasUnknownText=false;continue;}
      if(nextIs==='noyau'){res.noyau=n;nextIs=null;prevWasUnknownText=false;continue;}
      // If preceded by an unrecognized word (e.g. "cie 140"), treat as text not GSM
      if(prevWasUnknownText){res.text.push(tok);prevWasUnknownText=false;continue;}
      if(n>=20&&n<=800){res.gsm=n;prevWasUnknownText=false;continue;}
      if(n>800&&n<=3500){res.width=n;prevWasUnknownText=false;continue;}
    }
    const mm=tok.match(/^(\d+)mm$/);
    if(mm){res.width=+mm[1];nextIs=null;prevWasUnknownText=false;continue;}
    nextIs=null;
    const fz=fuzzyVocab(tok);
    if(fz){
      if(fz.dist>0)res.corrections.push({from:tok,to:fz.match.display});
      if(fz.match.kind==='type'){res.qualityCodes.push(...(fz.match.codes||[]));res.detectedTypes.push(fz.match.display);}
      else if(fz.match.kind==='format')res.formats.push(fz.match.display);
      else if(fz.match.kind==='color')res.colors.push(fz.match.display);
      prevWasUnknownText=false;
      continue;
    }
    // Unrecognized word — check if it's a filter category name first
    if(tok.length>=2){
      const _fi=_matchFilterIntent(tok);
      if(_fi){if(!res.filterIntents.includes(_fi))res.filterIntents.push(_fi);}
      else{res.text.push(tok);prevWasUnknownText=true;}
    }
  }
  _lastDetectedTypes=[...new Set(res.detectedTypes)];
  _lastFilterIntents=res.filterIntents;
  return res;
}

document.getElementById('sort-sel')?.addEventListener('change',()=>{_sortTouched=true;});
let _lastQueryP=null; // clauses+tri de la dernière requête catalogue
let _loadingMore=false;
// SCROLL INFINI (topbar, 18/07) : la page suivante s'ajoute toute seule.
async function _loadMore(){
  if(_loadingMore||_sharedMode||_featuredMode||_groupedMode||!_lastQueryP)return;
  if(_viewMode!=='grid')return;
  if(all.length<PAGE)return; // première page incomplète = tout est là
  if(_totalCount&&all.length>=_totalCount)return;
  _loadingMore=true;
  const tok=_reqToken;
  try{
    const off=all.length;
    const r=await sbQ('products?'+_lastQueryP,{headers:{'Range':off+'-'+(off+PAGE-1)}});
    if(tok!==_reqToken)return;
    if(r.data&&r.data.length){
      const fresh=r.data.map(rowToUi);
      const g=document.getElementById('pgrid');
      // Perf 20/07 : au lieu de re-render TOUTES les cartes (le pire reflow +
      // CLS), on APPEND seulement les nouvelles cartes en fin de grille — mais
      // uniquement tant qu'aucun format n'est déjà affiché (les formats arrivent
      // après les bobines dans le flux serveur trié par id, donc le préfixe
      // « bobines d'abord » reste stable). Dès qu'un format est présent, repli
      // sûr sur render(all) pour ne pas casser l'ordre bobine-avant-format.
      if(g&&g._lastList&&!g._lastList.some(_estFormat)&&_viewMode==='grid'&&!_sharedMode){
        all=all.concat(fresh);
        g._lastList=all;
        _rcCartIds=new Set(cart.map(x=>+x.id));
        _rcGrpByGid=new Map(_groupsList.map(gr=>[gr.gid,gr]));
        const html=fresh.filter(pp=>!_estFormat(pp)).map(_renderCatalogueCard).join('')
                 + fresh.filter(_estFormat).map(_renderCatalogueCard).join('');
        g.insertAdjacentHTML('beforeend',html);
        _updatePager();
        if(typeof _updateAddPageBtn==='function')_updateAddPageBtn();
      }else{
        all=all.concat(fresh);
        render(all); // repli sûr : re-render complet quand des formats sont déjà mêlés
      }
    }
    if(!r.data||r.data.length<PAGE)_totalCount=all.length;
  }catch(_){}finally{_loadingMore=false;}
}
// TONNAGE (18/07) : le + bleu demande combien de tonnes au lieu d'ajouter la page.
// Popup QUANTITÉ unifié (21/07) : le MÊME pour le + bleu de la sélection et le
// + des lots ×N. Titre « Quantité ? », tonnage dispo EN GROS à droite,
// 10 t / container 26,5 t / Tout / tonnage libre. onPick(tonnes) — 0 = tout.
// Popup QUANTITÉ unifié (21/07) — un seul design pour le + bleu (sélection) et
// le + des lots ×N : tonnage dispo centré en gros, curseur article par article
// PRÉRÉGLÉ AU MAX, marqueur Container cliquable, Valider, segment FAB/STOCK.
// FAB et STOCK sont DEUX POOLS distincts (dispo propre) : FAB = non-promo
// (arrivages récents d'abord), STOCK = promo/vieux stock (anciens d'abord).
function _qtyModal(dispoT,onPick,cfg){
  const ex=document.getElementById('tonnage-bg');if(ex)ex.remove();
  const d=document.createElement('div');
  d.id='tonnage-bg';
  d.style.cssText='position:fixed;inset:0;background:rgba(0,0,0,.45);z-index:9000;display:flex;align-items:center;justify-content:center;padding:16px;';
  window._qtyPick=(t,k,mode)=>{d.remove();onPick(t,k,mode);};
  let cum=cfg&&cfg.cum;
  let maxT=cum?cum[cum.length-1]/1000:(parseFloat(String(dispoT).replace(',','.'))||0);
  const fmt=v=>Math.round(v).toLocaleString('fr-FR'); // arrondi à la tonne
  const segHtml=cfg&&cfg.seg?`
    <div id="qty-seg" style="display:flex;background:#f5f5f7;border-radius:999px;padding:3px;margin-top:12px;">
      <button data-m="FAB" style="flex:1;padding:9px;border:none;border-radius:999px;background:#fff;box-shadow:0 1px 4px rgba(0,0,0,.12);font-size:13.5px;font-weight:700;color:#1d1d1f;cursor:pointer;font-family:'DM Sans',sans-serif;">FAB</button>
      <button data-m="STOCK" style="flex:1;padding:9px;border:none;border-radius:999px;background:transparent;font-size:13.5px;font-weight:600;color:#6e6e73;cursor:pointer;font-family:'DM Sans',sans-serif;">LOTS</button>
    </div>`:'';
  const sliderHtml=maxT>0?`
    <div style="text-align:center;margin:2px 0 6px;">
      <span id="qty-val" style="font-family:'Bebas Neue',sans-serif;font-size:27px;color:#1d1d1f;">${fmt(maxT)} t</span>
    </div>
    <input id="qty-range" type="range" min="1" max="${cum?cum.length:Math.max(1,Math.round(maxT*2))}" step="1" value="${cum?cum.length:Math.max(1,Math.round(maxT*2))}" style="width:100%;accent-color:#1d1d1f;height:32px;cursor:pointer;">
    <div id="qty-contwrap" style="position:relative;height:20px;margin-top:-4px;display:${maxT>26.5?'':'none'};"><button id="qty-cont" title="Caler sur un container (26,5 t)" style="position:absolute;left:${Math.min(96,Math.max(4,26.5/(maxT||1)*100)).toFixed(2)}%;transform:translateX(-50%);background:none;border:none;cursor:pointer;font-size:11.5px;font-weight:700;color:#1d1d1f;font-family:'DM Sans',sans-serif;padding:0;white-space:nowrap;line-height:1.2;">▲<br>Container</button></div>
    <button id="qty-go" style="width:100%;margin:10px 0 0;padding:14px;border:none;border-radius:999px;background:#111;color:#fff;font-size:16px;font-weight:700;font-family:'DM Sans',sans-serif;cursor:pointer;">Valider</button>`:'';
  d.innerHTML=`<div style="background:#fff;border-radius:22px;padding:32px;max-width:430px;width:100%;box-shadow:0 20px 60px rgba(0,0,0,.2);position:relative;">
    <button onclick="document.getElementById('tonnage-bg').remove()" aria-label="Fermer" style="position:absolute;top:16px;right:16px;width:34px;height:34px;border-radius:999px;background:#e8e8ed;border:none;color:#6e6e73;font-size:15px;cursor:pointer;display:flex;align-items:center;justify-content:center;padding:0;" onmouseover="this.style.background='#dededf'" onmouseout="this.style.background='#e8e8ed'">✕</button>
    <div id="qty-dispo" style="text-align:center;margin-bottom:12px;font-family:'Bebas Neue',sans-serif;font-size:44px;letter-spacing:.5px;color:#000;white-space:nowrap;line-height:1;">${(()=>{const v=parseFloat(String(dispoT).replace(',','.'));return isNaN(v)?'?':Math.round(v).toLocaleString('fr-FR');})()} <span style="font-size:22px;color:#6e6e73;">T</span></div>
    ${sliderHtml}${segHtml}
  </div>`;
  d.addEventListener('click',e=>{if(e.target===d)d.remove();});
  document.body.appendChild(d);
  const rng=d.querySelector('#qty-range');
  if(rng){
    const tOf=v=>cum?cum[v-1]/1000:v/2;
    const kCont=()=>{if(!cum)return Math.round(26.5*2);let v=1,bd=Infinity;cum.forEach((c,i)=>{const dd=Math.abs(c-26500);if(dd<bd){bd=dd;v=i+1;}});return v;};
    // AIMANT container : un clic sur la PISTE saute à la position en ARTICLES
    // (pas en tonnage) → près du marqueur ça donnait 29-34 t au lieu de 26,5
    // (vécu Safari 21/07). Tout atterrissage à ±2 t du container s'y cale.
    const paint=()=>{
      if(maxT>26.5){
        const N=+rng.max,v=+rng.value;
        const kVisu=Math.round(26.5/maxT*N); // position VISUELLE du ▲ sur la piste (clic piste atterrit là)
        if(Math.abs(tOf(v)-26.5)<=1||Math.abs(v-kVisu)<=Math.max(2,Math.round(N*0.05))){
          const kc=kCont();if(v!==kc)rng.value=kc;
        }
      }
      const t=tOf(+rng.value);d.querySelector('#qty-val').textContent=fmt(t)+' t';};
    const updCont=()=>{const w=d.querySelector('#qty-contwrap');if(!w)return;
      if(maxT>26.5){w.style.display='';w.querySelector('#qty-cont').style.left=Math.min(96,Math.max(4,26.5/maxT*100)).toFixed(2)+'%';}
      else w.style.display='none';};
    rng.oninput=paint;paint();
    const seg=d.querySelector('#qty-seg');
    if(seg&&cfg&&cfg.seg){
      seg.querySelectorAll('button').forEach(b=>b.onclick=()=>{
        const res=cfg.seg(b.dataset.m);
        if(!res||!res.cum||!res.cum.length){toast('Rien côté '+b.dataset.m+' dans cette sélection');return;}
        cum=res.cum;maxT=cum[cum.length-1]/1000;
        rng.max=cum.length;rng.value=cum.length;
        d.querySelector('#qty-dispo').innerHTML=fmt(maxT)+' <span style="font-size:22px;color:#6e6e73;">T</span>';
        updCont();paint();
        d._segMode=b.dataset.m;
        seg.querySelectorAll('button').forEach(x=>{const on=x===b;x.style.background=on?'#fff':'transparent';x.style.boxShadow=on?'0 1px 4px rgba(0,0,0,.12)':'none';x.style.fontWeight=on?'700':'600';x.style.color=on?'#1d1d1f':'#6e6e73';});
      });
    }
    const cBtn=d.querySelector('#qty-cont');
    if(cBtn){cBtn.style.padding='6px 14px';cBtn.style.margin='-6px -14px';
      cBtn.onclick=()=>{rng.value=kCont();rng.dispatchEvent(new Event('input'));};}
    d.querySelector('#qty-go').onclick=()=>window._qtyPick(tOf(+rng.value),+rng.value,d._segMode||'FAB');
  }
}
async function _openTonnage(){
  const ex=document.getElementById('tonnage-bg');if(ex){ex.remove();return;}
  // FAB = non-promo (récents d'abord) / STOCK = promo, vieux stock (anciens
  // d'abord) : deux pools SÉPARÉS, chacun sa dispo. Lots gardés ENSEMBLE
  // (équivalents adjacents). ≤ 2000 articles ; au-delà, repli _tonnagePick.
  let pools=null;
  if(_lastQueryP){
    try{
      const wp=new URLSearchParams(_lastQueryP);wp.set('select',SEL_UI);
      const rows=[];let off=0,fini=false;
      while(!fini&&off<2000){
        const r=await sbQ('products?'+wp,{headers:{'Range':off+'-'+(off+999)}});
        if(r.data&&r.data.length){rows.push(...r.data);off+=r.data.length;if(r.data.length<1000)fini=true;}
        else fini=true;
      }
      if(fini&&rows.length){
        const units=rows.map(rowToUi);
        const cumOf=l=>{let t=0;return l.map(u=>(t+=(+u.poids_net||0)));};
        // Sélection tonnage = ORDRE DU TRI AFFICHÉ (demande Ethan 20/08) : on part du
        // 1er article de la liste triée (_lastQueryP porte le tri courant, ex. grammage,
        // arrivage…). On garde les équivalents groupés (lots), mais on ordonne les lots
        // par leur 1re apparition dans l'ordre affiché — au lieu de re-trier par n° réf
        // (l'ancien `flat(units,true)` écrasait le tri).
        const _ordIdx=new Map();units.forEach((u,i)=>{if(!_ordIdx.has(u.id))_ordIdx.set(u.id,i);});
        const _minIdx=g=>Math.min(...g.units.map(u=>_ordIdx.has(u.id)?_ordIdx.get(u.id):1e9));
        const allL=groupProducts(units).sort((a,b)=>_minIdx(a)-_minIdx(b)).flatMap(g=>g.units);
        pools={FAB:{list:allL,cum:cumOf(allL)},STOCK:{list:allL,cum:cumOf(allL)}};
      }
    }catch(_){}
  }
  if(!pools||(!pools.FAB.cum.length&&!pools.STOCK.cum.length)){
    const _dispoT=(document.getElementById('rbar-tons')?.textContent||'').trim();
    _qtyModal(_dispoT,t=>_tonnagePick(t));return;
  }
  const def=pools.FAB.cum.length?'FAB':'STOCK';
  const defCum=pools[def].cum;
  const dispo=(defCum[defCum.length-1]/1000).toFixed(1).replace('.',',');
  _qtyModal(dispo,(t,k,mode)=>{
    const pool=pools[mode&&pools[mode]?mode:def];
    if(k==null||!pool||!pool.list.length){_tonnagePick(t);return;}
    let added=0,sum=0;
    pool.list.slice(0,k).forEach(u=>{
      if(cart.find(x=>x.id===+u.id))return;
      cart.push({id:u.id,name:u.name,ref:u.ref,type:u.type,qualite:u.qualite||null,details:u.details||null,grammage:u.grammage,largeur:u.largeur,format:u.format,poids_net:u.poids_net,price:u.price||null,img:u.image_url||null,couleur:u.couleur||null,usine:u.usine||null,zone:u.zone||null,emplacement:u.emplacement||null,allee:u.allee||null});
      sum+=(+u.poids_net||0);added++;
    });
    localStorage.setItem('prodi_cart',JSON.stringify(cart));
    updateCartBadge();renderDrawer();
    if(typeof _updateAddPageBtn==='function')_updateAddPageBtn();
    const pg=document.getElementById('pgrid');render((pg&&pg._lastList)||all);
    toast(added?('✓ '+added+' articles · '+(sum/1000).toFixed(1)+' t ajoutés'):'Déjà tout en liste');
  },{cum:defCum,seg:m=>{const p2=pools[m];return p2&&p2.cum.length?{cum:p2.cum}:null;}});
}
// + d'un LOT (×N) : même popup, borné au lot — le curseur avance par unités
// réelles du lot, Valider ajoute exactement les k unités choisies.
function _grpRound(gid){
  const grp=_groupsList.find(x=>x.gid===gid);
  if(!grp){toast('Groupe introuvable');return;}
  const someIn=grp.units.some(u=>cart.find(x=>x.id===+u.id));
  if(someIn){_grpAddAll(gid);return;} // état ✓ → comportement retrait existant
  const cum=[];let s=0;grp.units.forEach(u=>{s+=(+u.poids_net||0);cum.push(s);});
  const dispo=(s/1000).toFixed(1).replace('.',',');
  _qtyModal(dispo,(t,k)=>{
    _groupQty[gid]=Math.max(1,Math.min(grp.units.length,k||grp.units.length));
    addGroupToCart(gid);
    const pg=document.getElementById('pgrid');
    render((pg&&pg._lastList)||all);
  },{cum});
}
async function _tonnagePick(tonnes){
  document.getElementById('tonnage-bg')?.remove();
  if(!_lastQueryP){toast('Sélection indisponible — recharge la page');return;}
  toast('⏳ Préparation de la sélection…',8000);
  const target=tonnes>0?tonnes*1000:Infinity;
  let rows=[];
  try{
    let off=0;
    while(off<800){
      const r=await sbQ('products?'+_lastQueryP,{headers:{'Range':off+'-'+(off+199)}});
      if(!r.data||!r.data.length)break;
      rows=rows.concat(r.data);
      off+=r.data.length;
      if(r.data.length<200)break;
      if(target!==Infinity&&rows.reduce((s,x)=>s+(+x.weight||0),0)>=target*1.3)break;
    }
  }catch(_){toast('Erreur réseau');return;}
  let sum=0,added=0;
  for(const rw of rows){
    if(cart.find(x=>x.id===+rw.id))continue;
    const u=rowToUi(rw);
    const w=+u.poids_net||0;
    // Si l'article ferait déborder la cible, on le saute et on tente les
    // suivants (souvent plus légers) pour coller au plus près du tonnage.
    if(target!==Infinity&&added>0&&sum+w>target*1.02)continue;
    cart.push({id:u.id,name:u.name,ref:u.ref,type:u.type,qualite:u.qualite||null,details:u.details||null,grammage:u.grammage,largeur:u.largeur,format:u.format,poids_net:u.poids_net,price:u.price||null,img:u.image_url||null,couleur:u.couleur||null,usine:u.usine||null,zone:u.zone||null,emplacement:u.emplacement||null,allee:u.allee||null});
    sum+=w;added++;
    if(target!==Infinity&&sum>=target)break;
  }
  localStorage.setItem('prodi_cart',JSON.stringify(cart));
  updateCartBadge();renderDrawer();
  if(typeof _updateAddPageBtn==='function')_updateAddPageBtn();
  // Re-render la grille pour que les cartes ajoutées passent le « + » en CORBEILLE
  // (classe .added → CSS .sc-add.added::before) — comme le chemin pool (20/08).
  const _pg=document.getElementById('pgrid');if(_pg&&_pg._lastList)render(_pg._lastList);
  toast(added?('✓ '+added+' articles · '+(sum/1000).toFixed(1)+' t ajoutés — bouton Liste en haut'):'Rien à ajouter (déjà tout en liste ?)',5000);
}
// ── BOUTON OFFRE (22/07) : offres PRÊTES À ENVOYER par qualité de papier.
// Le menu montre directement les sélections préfaites (≈ un container 26,5 t
// par qualité, articles récents d'abord, lots gardés ensemble — calculées
// depuis le cache facettes du jour). Cliquer une offre remplit Ma Liste et
// OUVRE la vue client (?s=) : l'offre est prête à envoyer.
// Menu DYNAMIQUE (13/08) : une offre par QUALITÉ réellement en stock — plus de
// liste figée (l'ancienne OFFRE_PRESETS à 11 familles laissait ~670 t
// invisibles : RLINER, RFLEX, RNEW, RLWC, SCUT…). Libellés = QUALITE_LABELS.
// Seuil : sous OFFRE_MIN_TONS la qualité n'apparaît pas (queues de stock).
const OFFRE_MIN_TONS=5;
// UNE offre par QUALITÉ (code Sage) : segments FAB/STOCK + BOBINE/FORMAT en
// tête du menu, puis liste plate directement cliquable — on ne mélange JAMAIS
// ni les qualités ni bobines et formats dans une même offre (forme = lettre
// du code : R* bobines, S* formats, comme les tuiles de la landing).
let _offresCalc=null; // {FAB:{Bobine:[offre…],Format:[…]},STOCK:{…}}, offre={label,code,forme,units,full,tons}
let _offrePool='FAB';     // segment 1 du menu
let _offreForme='Bobine'; // segment 2 du menu
let _offreUsineOpen=null; // ligne dépliée « par usine » (index dans pool×forme courants)
let _offreCapRefs=null;   // capRefs exposé hors de _offresData (offres par usine)
async function _offresData(){
  if(_offresCalc)return _offresCalc;
  const rows=await _loadAllProducts();
  let units=rows.map(rowToUi);
  const refN=u=>parseInt(String(u.ref||'').replace(/\D/g,''),10)||0;
  // Deux pools SÉPARÉS (même frontière que le popup Quantité) : STOCK = promo OU
  // réf < 981600 (vieux stock, > 1 an) ; FAB = le reste (arrivages récents).
  const isStock=u=>u.promo||(refN(u)>0&&refN(u)<981600);
  // Exclure des offres les RÉSERVÉS récents (réf ≥ 950000) ; les réservés anciens
  // (réf < 950000) restent proposables (demande Ethan 22/07).
  const isReserved=u=>u.reserve_client!=null&&String(u.reserve_client).trim()!=='';
  units=units.filter(u=>!(isReserved(u)&&refN(u)>=950000));
  // Le but d'une offre = MONTRER LE STOCK d'une qualité (plus de plafond container,
  // demande Ethan 22/07). On borne juste le lien ?s= : cart_ids ≤ 5000 chars ≈
  // 380 réfs → au-delà, round-robin par lot pour garder la VARIÉTÉ (pas tronquer).
  const MAX_REFS=350;
  const refNg=g=>Math.max(...g.units.map(refN));
  const capRefs=_offreCapRefs=list=>{
    if(list.length<=MAX_REFS)return list.slice();
    const grps=groupProducts(list).sort((a,b)=>refNg(b)-refNg(a));
    const sel=[];let round=0,added=true;
    while(sel.length<MAX_REFS&&added){added=false;
      for(const g of grps){const u=g.units[round];if(u){sel.push(u);added=true;if(sel.length>=MAX_REFS)break;}}
      round++;}
    return sel;
  };
  // Une offre = TOUT le stock du pool pour une qualité (tonnage calculé sur la
  // liste complète, capRefs seulement pour tenir dans le lien ?s=).
  const buildPool=poolUnits=>{
    const out={Bobine:[],Format:[]};
    [...new Set(poolUnits.map(u=>u.qualite).filter(Boolean))].forEach(code=>{
      const forme=code[0]==='S'?'Format':code[0]==='R'?'Bobine':null;
      if(!forme)return; // UMAC & co : jamais en offre
      // La vue client classe par _estFormat (format NULL/Palette/Feuille =
      // carte Dimensions) : un R* au format NULL polluerait l'offre bobine
      // → on écarte les articles dont la forme réelle ne colle pas au code.
      const list=poolUnits.filter(u=>u.qualite===code&&(_estFormat(u)?'Format':'Bobine')===forme);
      if(!list.length)return;
      const tons=list.reduce((s,u)=>s+(+u.poids_net||0),0)/1000;
      if(tons<OFFRE_MIN_TONS)return;
      out[forme].push({label:QUALITE_LABELS[code]||code,code,forme,units:capRefs(list),full:list,tons});
    });
    // Tri par TONNAGE décroissant dans chaque pool×forme (05/08 Ethan) — fait
    // ICI pour que les index du menu restent alignés avec _offreEnvoyer(i).
    out.Bobine.sort((a,b)=>(b.tons||0)-(a.tons||0));
    out.Format.sort((a,b)=>(b.tons||0)-(a.tons||0));
    return out;
  };
  // FAB et LOTS FUSIONNÉS (demande Ethan 08/08) : un seul pool = TOUT le stock
  // (les deux clés pointent sur le même calcul, le segment FAB|LOTS est retiré).
  const _merged=buildPool(units);
  _offresCalc={FAB:_merged,STOCK:_merged};
  // Replis : pool vide → l'autre pool ; forme vide dans le pool → l'autre forme.
  const _n=(p,f)=>((_offresCalc[p]||{})[f]||[]).length;
  if(!_n(_offrePool,'Bobine')&&!_n(_offrePool,'Format'))_offrePool=_offrePool==='FAB'?'STOCK':'FAB';
  if(!_n(_offrePool,_offreForme))_offreForme=_offreForme==='Bobine'?'Format':'Bobine';
  return _offresCalc;
}
function _offreSegHtml(){
  const c=_offresCalc||{};
  const n=(p,f)=>(((c[p]||{})[f])||[]).length;
  const mkP=(p,lbl)=>{const on=_offrePool===p,dis=!(n(p,'Bobine')+n(p,'Format'));
    return `<button class="offre-seg-btn${on?' on':''}"${dis?' disabled':''} onclick="event.stopPropagation();_offreSetPool('${p}')">${lbl}</button>`;};
  const mkF=(f,lbl)=>{const on=_offreForme===f,dis=!n(_offrePool,f);
    return `<button class="offre-seg-btn${on?' on':''}"${dis?' disabled':''} onclick="event.stopPropagation();_offreSetForme('${f}')">${lbl}</button>`;};
  // Segment FAB|LOTS retiré (pools fusionnés) — on ne garde que BOBINE|FORMAT.
  return `<div class="offre-seg offre-seg-forme">${mkF('Bobine','BOBINE')}${mkF('Format','FORMAT')}</div>`;
}
const _offreUsineNorm=u=>String(u.usine||'').replace(/^REF\s*/i,'').trim()||'—';
function _renderOffreMenu(){
  const m=document.getElementById('offre-menu');if(!m)return;
  const offres=(((_offresCalc||{})[_offrePool]||{})[_offreForme])||[];
  m.innerHTML=_offreSegHtml()
    +(offres.length?offres.map((o,i)=>{
      const open=_offreUsineOpen===i;
      let sub='';
      if(open){
        // Offres PAR USINE (05/08) : ventilation du stock de la qualité par
        // usine, tonnage décroissant — clic = offre qualité × usine seule.
        const us={};
        (o.full||o.units).forEach(u=>{const k=_offreUsineNorm(u);us[k]=(us[k]||0)+(+u.poids_net||0);});
        sub=Object.entries(us).sort((a,b)=>b[1]-a[1]).map(([k,kg])=>
          `<button class="offre-item offre-usine" role="menuitem" onclick="_offreEnvoyerUsine(${i},${attrJs(k)})">
            <span class="offre-lbl">Usine ${esc(k)}</span>
            <small>${Math.max(1,Math.round(kg/1000))} t</small>
          </button>`).join('');
      }
      return `<button class="offre-item offre-offer" role="menuitem" onclick="_offreEnvoyer(${i})">
          <span class="offre-lbl">${esc(o.label)} <small>${esc(o.code)}</small></span>
          <small>${Math.max(1,Math.round(o.tons))} t</small>
          <span class="offre-chev-us${open?' open':''}" role="button" title="Choisir l'usine" onclick="event.stopPropagation();_offreUsines(${i})">›</span>
        </button>`+sub;
    }).join('')
    :'<div class="offre-load">Aucune offre ici.</div>');
}
function _offreUsines(i){_offreUsineOpen=_offreUsineOpen===i?null:i;_renderOffreMenu();}
async function _buildOffreMenu(){
  const m=document.getElementById('offre-menu');if(!m)return;
  if(!_offresCalc)m.innerHTML='<div class="offre-load">Préparation des offres…</div>';
  await _offresData();
  _renderOffreMenu();
}
function _offreSetPool(p){
  const c=_offresCalc&&_offresCalc[p];
  if(!c||!(c.Bobine.length+c.Format.length))return;
  _offrePool=p;_offreUsineOpen=null;
  if(!c[_offreForme].length)_offreForme=_offreForme==='Bobine'?'Format':'Bobine';
  _renderOffreMenu();
}
function _offreSetForme(f){
  const c=_offresCalc&&_offresCalc[_offrePool];
  if(!c||!c[f]||!c[f].length)return;
  _offreForme=f;_offreUsineOpen=null;
  _renderOffreMenu();
}
function toggleOffreMenu(force){
  const m=document.getElementById('offre-menu');
  const b=document.getElementById('offre-btn');
  if(!m)return;
  const on=force!==undefined?force:!m.classList.contains('show');
  m.classList.toggle('show',on);
  if(b)b.classList.toggle('open',on);
  if(on){if(typeof toggleFabMenu==='function')toggleFabMenu(false);_offreUsineOpen=null;_buildOffreMenu();} // rouvre toujours au niveau familles
}
document.addEventListener('click',e=>{
  if(e.target.closest('#offre-wrap'))return;
  const m=document.getElementById('offre-menu');
  if(m&&m.classList.contains('show'))toggleOffreMenu(false);
});
// ── OFFRES FABRICATION (05/08) : bouton à gauche d'Offre — sert les EXCELS
// USINE tels quels (bucket public offres-fab, republiés chaque matin par
// l'import depuis le mail STOCK DÉTAILLÉ). RIEN n'entre au catalogue, aucun
// mélange avec les offres stock : simple accès aux mêmes fichiers que Sage. ──
const FAB_BUCKET='https://bvcgpdoukhcatjibmvnb.supabase.co/storage/v1/object/public/offres-fab/';
const FAB_FAMILLES={ROFF:'Offset',SOFF:'Offset',R2SC:'Couché 2 faces',S2SC:'Couché 2 faces',
  RADH:'Adhésif',SADH:'Adhésif',RTHERM:'Thermique',RCOL:'Offset couleur',SCOL:'Offset couleur',
  SCUT:'Ramette',RBOA:'Carton couché',SBOA:'Carton couché','RKRA brun':'Kraft brun',
  RKRA:'Kraft',RCAR:'Autocopiant',SCAR:'Autocopiant',RLINER:'Liner / Testliner'};
let _fabManifest=null;
let _fabForme='Bobine';
let _fabOpenIdx=null; // ligne dépliée (choix d'usine)
let _fabUsineOuvre=null; // usine dépliée dans la qualité ouverte
function _fabSetForme(f){_fabForme=f;_fabOpenIdx=null;_fabUsineOuvre=null;_buildFabMenu();}
async function _buildFabMenu(){
  const m=document.getElementById('fab-menu');if(!m)return;
  if(!_fabManifest){
    m.innerHTML='<div class="offre-load">Chargement…</div>';
    try{_fabManifest=await fetch(FAB_BUCKET+'manifest.json?t='+Date.now()).then(r=>r.json());}
    catch(_){m.innerHTML='<div class="offre-load">Indisponible pour le moment.</div>';return;}
  }
  // Segment BOBINE|FORMAT en tête (même dessin que le menu Offre, 05/08),
  // puis une ligne par famille de la forme choisie — clic = Excel usine.
  const fs=(_fabManifest.fichiers||[]);
  const n=f=>fs.filter(x=>x.forme===f).length;
  if(!n(_fabForme))_fabForme=_fabForme==='Bobine'?'Format':'Bobine';
  const seg=['Bobine','Format'].map(f=>{
    const on=_fabForme===f,dis=!n(f);
    return `<button class="offre-seg-btn${on?' on':''}"${dis?' disabled':''} onclick="event.stopPropagation();_fabSetForme('${f}')">${f.toUpperCase()}</button>`;
  }).join('');
  m.innerHTML=`<div class="offre-seg offre-seg-forme">${seg}</div>`
    +fs.filter(f=>f.forme===_fabForme)
      .sort((a,b)=>((b.nb||(b.usines||[]).length)-(a.nb||(a.usines||[]).length))||String(FAB_FAMILLES[a.code]||a.code).localeCompare(FAB_FAMILLES[b.code]||b.code))
      .map((f,i)=>{
    const fam=FAB_FAMILLES[f.code]||f.code;
    const us=f.usines||[]; // variantes pré-générées par l'import (lignes des
    // autres usines MASQUÉES dans le même fichier Sage, logos intacts)
    const open=_fabOpenIdx===i;
    let sub='';
    if(open){
      // Dépliage = les OFFRES elles-mêmes (05/08 Ethan, option 2) : une ligne
      // par offre du fichier (g · dimensions · prix départ usine), clic =
      // l'Excel de SON usine (variante) ou le fichier complet à défaut.
      const offres=f.offres||[];
      if(offres.length){
        // groupées PAR USINE — repliées par défaut (05/08) : clic sur
        // l'usine = déplie SES offres, clic sur une offre = son Excel.
        const grp=new Map();
        offres.forEach(o=>{const k=o.usine||'—';if(!grp.has(k))grp.set(k,[]);grp.get(k).push(o);});
        sub=[...grp.entries()].sort((a,b)=>b[1].length-a[1].length).map(([u,list])=>{
          const v=us.find(x=>x.usine===u);
          const fich=v?v.fichier:f.fichier;
          const uOpen=_fabUsineOuvre===u;
          return `<button class="offre-item offre-usine fab-us-hdr" role="menuitem" onclick="event.stopPropagation();_fabToggleUsine(${attrJs(u)})">
              <span class="offre-lbl">Usine ${esc(u)}</span>
              <small>${list.length} offre${list.length>1?'s':''}</small>
              <span class="offre-chev-us${uOpen?' open':''}">›</span>
            </button>`
            +(uOpen?list.map(o=>{
              const dim=f.forme==='Bobine'?[o.laize?'laize '+o.laize:'',o.long?'Ø '+o.long:''].filter(Boolean).join(' · ')
                :(o.long&&o.laize?o.laize+'×'+o.long:(o.laize?'laize '+o.laize:''));
              return `<button class="offre-item offre-usine fab-offre" role="menuitem" onclick="_fabOpenU(${attrJs(fich)},${attrJs(f.code)},${attrJs(u)})">
                <span class="offre-lbl">${o.g?numId(o.g)+' g':'—'}${dim?' · '+esc(dim):''}</span>
                <small>${o.prix?_ccyNum(o.prix)+' '+_ccyUnit(true):''}</small>
              </button>`;}).join(''):'');
        }).join('');
      }else{
        sub=us.map(v=>`<button class="offre-item offre-usine" role="menuitem" onclick="_fabOpenU(${attrJs(v.fichier)},${attrJs(f.code)},${attrJs(v.usine)})">
          <span class="offre-lbl">Usine ${esc(v.usine)}</span>
        </button>`).join('');
      }
    }
    const act=(us.length||(f.offres||[]).length)?`event.stopPropagation();_fabToggle(${i})`:`_fabOpen(${attrJs(f.fichier)},${attrJs(f.code)})`;
    return `<button class="offre-item offre-offer" role="menuitem" onclick="${act}">
      <span class="offre-lbl">${esc(fam)} <small>${esc(f.code)}</small></span>
      <span class="offre-chev-us${open?' open':''}">›</span>
    </button>`+sub;
  }).join('');
}
function _fabToggle(i){_fabOpenIdx=_fabOpenIdx===i?null:i;_fabUsineOuvre=null;_buildFabMenu();}
function _fabToggleUsine(u){_fabUsineOuvre=_fabUsineOuvre===u?null:u;_buildFabMenu();}
function _fabOpen(fichier,code){
  window.prodiTrack?.('fab_excel',{code});
  toggleFabMenu(false);
  window.open(FAB_BUCKET+encodeURIComponent(fichier),'_blank','noopener');
}
function _fabOpenU(fichier,code,usine){
  window.prodiTrack?.('fab_excel',{code,usine});
  toggleFabMenu(false);
  window.open(FAB_BUCKET+encodeURIComponent(fichier),'_blank','noopener');
}
function toggleFabMenu(force){
  const m=document.getElementById('fab-menu');
  const b=document.getElementById('fab-btn');
  if(!m)return;
  const on=force!==undefined?force:!m.classList.contains('show');
  m.classList.toggle('show',on);
  if(b)b.classList.toggle('open',on);
  if(on){toggleOffreMenu(false);_fabOpenIdx=null;_buildFabMenu();}
}
document.addEventListener('click',e=>{
  if(e.target.closest('#fab-wrap'))return;
  const m=document.getElementById('fab-menu');
  if(m&&m.classList.contains('show'))toggleFabMenu(false);
});
async function _offreEnvoyer(i){
  const o=((((_offresCalc||{})[_offrePool]||{})[_offreForme])||[])[i];if(!o)return;
  await _offreGo(o,o.units,null);
}
async function _offreEnvoyerUsine(i,us){
  const o=((((_offresCalc||{})[_offrePool]||{})[_offreForme])||[])[i];if(!o)return;
  const list=(o.full||o.units).filter(u=>_offreUsineNorm(u)===us);
  if(!list.length)return;
  await _offreGo(o,_offreCapRefs?_offreCapRefs(list):list.slice(0,350),us);
}
async function _offreGo(o,units,usine){
  toggleOffreMenu(false);
  cart.length=0; // l'offre REMPLACE la liste courante (liste non persistante par design)
  units.forEach(u=>cart.push({id:u.id,name:u.name,ref:u.ref,type:u.type,qualite:u.qualite||null,details:u.details||null,grammage:u.grammage,largeur:u.largeur,format:u.format,poids_net:u.poids_net,price:u.price||null,img:u.image_url||null,couleur:u.couleur||null,usine:u.usine||null,zone:u.zone||null,emplacement:u.emplacement||null,allee:u.allee||null}));
  try{localStorage.setItem('prodi_cart',JSON.stringify(cart));}catch(_){}
  updateCartBadge();renderDrawer();
  if(typeof _updateAddPageBtn==='function')_updateAddPageBtn();
  const pg=document.getElementById('pgrid');if(pg&&pg._lastList)render(pg._lastList);
  window.prodiTrack?.('offre_preset',{pool:_offrePool,label:o.label,code:o.code,forme:o.forme,usine:usine||null,nb:cart.length});
  toast('✓ Offre '+o.label+(usine?' · usine '+usine:'')+' · '+o.forme.toLowerCase()+' · '+cart.length+' articles');
  await openClientLink(); // crée le lien ?s= et OUVRE la vue client — prête à envoyer
  // L'offre est JETABLE : la liste ne servait qu'à fabriquer le lien — on la
  // vide pour ne pas retrouver 350 articles (badge + poubelle) au retour.
  cart.length=0;
  try{localStorage.setItem('prodi_cart',JSON.stringify(cart));}catch(_){}
  updateCartBadge();renderDrawer();
  if(typeof _updateAddPageBtn==='function')_updateAddPageBtn();
  const pg2=document.getElementById('pgrid');if(pg2&&pg2._lastList)render(pg2._lastList);
}
let _filterTimer=null;
let _sortTouched=false; // l'utilisateur a choisi un tri explicitement
// Aucun filtre actif nulle part ? (mêmes sources que les tags)
function _anyFilterActive(){
  if((document.getElementById('search-input')?.value||'').trim())return true;
  for(const k in msdState){if(msdState[k]&&msdState[k].size)return true;}
  if(_photoFilter||_resaFilter)return true;
  if(document.querySelectorAll('.fpill.active').length)return true;
  const ids=['f-gmin','f-gmax','f-lmin','f-lmax','f-longmin','f-longmax','f-wmin','f-wmax','f-refmin','f-refmax','f-usine','f-zone-num','f-zone-let','f-ref-code','f-pmin','f-pmax'];
  return ids.some(id=>{const e=document.getElementById(id);return e&&String(e.value||'').trim();});
}
function filterProducts(){
  // Tous les filtres enlevés (et tri jamais touché) → retour à la PAGE DE
  // BASE (vitrine des arrivages récents), pas au catalogue trié brut (18/07).
  _featuredMode=!_sortTouched&&!_anyFilterActive()&&!window._SAISIE_BASSE;
  // ?bas=1 : un filtre posé depuis la barre dévoile la grille (tuiles retirées)
  if(window._SAISIE_BASSE&&!window._tuilesDone&&window._tuilesDismiss&&_anyFilterActive())window._tuilesDismiss();
  const _h=document.getElementById('prodix-hero');
  if(_h){
    _h.style.display=(_featuredMode||_h.classList.contains('phero-convo'))?'':'none';
    document.body.classList.toggle('phero-lock',_featuredMode&&_h.classList.contains('phero-convo'));
    // Landing = hero seul : la grille ET le footer n'apparaissent qu'en
    // mode recherche/filtre
    const _tuilesUp=window._SAISIE_BASSE&&!window._tuilesDone;
    const _pg2=document.getElementById('pgrid');
    if(_pg2)_pg2.style.display=(_featuredMode||_tuilesUp)?'none':'';
    const _ft=document.querySelector('footer');
    if(_ft)_ft.style.display=(_featuredMode||_tuilesUp)?'none':'';
  }
  clearTimeout(_filterTimer);
  _filterTimer=setTimeout(_doFilter,200);
}
async function _doFilter(){
  if(_sharedMode&&typeof _sharedAll!=='undefined'){
    // Filter locally within the shared selection
    _filterSharedLocal();
    return;
  }
  currentPage=1;
  _isFirstLoad=false;
  _maxKnownPage=1;
  _refreshAllFacets();
  if(_featuredMode){await _fetchAndRenderFeatured(++_reqToken);return;}
  await _fetchAndRender(++_reqToken);
}
function _filterSharedLocal(){
  const q=(document.getElementById('search-input')?.value||'').trim().toLowerCase();
  const gn=+document.getElementById('f-gmin')?.value||0;
  const gx=+document.getElementById('f-gmax')?.value||0;
  const _lminCm=+document.getElementById('f-lmin')?.value||0;
  const _lmaxCm=+document.getElementById('f-lmax')?.value||0;
  const lmin=_lminCm||0;
  const lmax=_lmaxCm||0;
  const longmin=+document.getElementById('f-longmin')?.value||0;
  const longmax=+document.getElementById('f-longmax')?.value||0;
  const wmin=+document.getElementById('f-wmin')?.value||0;
  const wmax=+document.getElementById('f-wmax')?.value||0;
  const types=getMsdValues('msd-type');
  const couleurs=getMsdValues('msd-couleur');
  const mandrins=getMsdValues('msd-mandrin');
  const formats=new Set([...document.querySelectorAll('.fpill.active:not(.fpill-orig):not(.fpill-stock):not(.fpill-depot):not(.fpill-photo):not(.fpill-resa)')].map(b=>b.dataset.format));
  const typeCodes=types.size>0?[...types].flatMap(c=>TYPE_MAP[c]||[c]):[];

  const _rmin=+((document.getElementById('f-refmin-top')||document.getElementById('f-refmin'))?.value)||0;
  const _rmax=+((document.getElementById('f-refmax-top')||document.getElementById('f-refmax'))?.value)||0;
  let filtered=_sharedAll.filter(p=>{
    if(q){const s=[p.name,p.quality,p.couleur,p.details,p.ref].join(' ').toLowerCase();if(!s.includes(q))return false;}
    if(_rmin||_rmax){
      // Assemblé : une réf tapée doit retrouver son lot même si elle n'est
      // pas celle du proto — on teste TOUTES les unités du groupe.
      const _refs=(p._grpRefs&&p._grpRefs.length)?p._grpRefs:[p.ref];
      const _ok=_refs.some(rf=>{
        const _rn=+String(rf||'').replace(/^Photo_/i,'');
        if(!_rn)return false;
        if(_rmin&&!_rmax)return _rn===_rmin; // Min seul = réf exacte
        if(_rmin&&_rmax)return _rn>=_rmin&&_rn<=_rmax;
        return _rn<=_rmax;
      });
      if(!_ok)return false;
    }
    if(gn&&(p.grammage||0)<gn)return false;
    if(gx&&(p.grammage||0)>gx)return false;
    if(lmin&&(p.largeur||0)<lmin)return false;
    if(lmax&&(p.largeur||0)>lmax)return false;
    if(longmin&&(p.longueur||0)<longmin)return false;
    if(longmax&&(p.longueur||0)>longmax)return false;
    if(wmin&&(p.poids_net||0)<wmin)return false;
    if(wmax&&(p.poids_net||0)>wmax)return false;
    if(typeCodes.length&&!typeCodes.includes(p.qualite))return false;
    if(couleurs.size&&!couleurs.has(p.couleur))return false;
    if(mandrins.size&&!mandrins.has(String(p.noyau||'')))return false;
    if(formats.size&&!formats.has(p.format))return false;
    if(_resaFilter==='with'&&!p.reserve_client)return false;
    if(_resaFilter==='without'&&p.reserve_client)return false;
    const _hasPhoto=p.image_url&&p.image_url.length>0;
    if(_photoFilter==='with'&&!_hasPhoto)return false;
    if(_photoFilter==='without'){
      if(_hasPhoto)return false;
      // Exclure uniquement les FAB purs (Photo_FAB hors dépôt) — ils n'ont jamais de photo par nature.
      const _isFabPure=p.ref&&/^Photo_FAB/i.test(String(p.ref))&&p.emplacement!=='OUR WAREHOUSE';
      if(_isFabPure)return false;
    }
    return true;
  });

  all=filtered;
  _totalCount=filtered.length;
  _maxKnownPage=1;
  currentPage=1;
  const totalKg=filtered.reduce((s,p)=>s+(+p._grpTotalWeight||+p.weight||0),0);
  const rbarRefs=document.getElementById('rbar-refs');
  const rbarTons=document.getElementById('rbar-tons');
  _rbarSharedCounts(filtered);
  if(rbarTons)rbarTons.textContent=(totalKg/1000).toFixed(1);
  updateFilterChips();
  render(filtered);
  _updatePager();
  if(typeof _updateAddPageBtn==='function')_updateAddPageBtn();
}
async function _fetchAndRenderFeatured(token){
  const g=document.getElementById('pgrid');
  if(g){
    g.className='pgrid';
    g.innerHTML=Array(8).fill(0).map(()=>`<div class="skeleton"><div class="skel-img"></div><div class="skel-body"><div class="skel-line short"></div><div class="skel-line med"></div><div class="skel-line"></div></div></div>`).join('');
  }
  try{
    // Pool initial : 800 refs les plus récentes (Photo_NNNNNN 6 chiffres).
    // Le tri lex .desc équivaut au tri numérique car longueur fixe ; les Photo_FAB*,
    // Photo_DU*, Photo_PM*, etc. sont exclus du regex pour éviter qu'ils sortent
    // en tête (lex 'F'/'D'/... > '9').
    // Perf 18/07 : 200 lignes suffisent et seulement les colonnes de rowToUi.
    const p=new URLSearchParams({select:'ref,quality,color,details,gsm,width,longueur,noyau,weight,price,usine,emplacement,zone,format,image_url,reserve_client,promo,id','image_url':'not.is.null',order:'ref.desc'});
    p.append('image_url','neq.');
    p.append('ref','match.^Photo_[0-9]{6}$');
    // Fetch featured products AND real total count + weight in parallel.
    // Perf 20/07 : si le cache facettes (7 200 lignes) est DÉJÀ chargé (visite
    // répétée, hit localStorage), le count total et le tonnage s'en dérivent —
    // on économise le count=exact (plein-scan) + la RPC. Même périmètre sbQ.
    const _cacheHit=_allProductsCache;
    const [imgRes, countRes, wRes]=await Promise.all([
      sbQ('products?'+p,{headers:{'Range':'0-199'}}),
      _cacheHit?Promise.resolve(null):sbQ('products?select=id',{headers:{'Prefer':'count=exact','Range':'0-0'}}),
      _cacheHit?Promise.resolve(null):sbQ('rpc/sum_weight_filtered',{method:'POST',body:{}})
    ]);
    const {data,error}=imgRes;
    if(_reqToken!==token)return;
    if(error||!data?.length){await _fetchAndRender(token);return;}
    const _realCount=_cacheHit?_cacheHit.length:((countRes&&countRes.count!=null&&!isNaN(countRes.count))?countRes.count:0);
    const _realWeightKg=_cacheHit?_cacheHit.reduce((s,r)=>s+(+r.weight||0),0):(wRes?wRes.data||0:0);
    // Filter products with image_url, then verify images actually load
    const candidates=data.filter(r=>r.image_url&&r.image_url.trim().length>10);
    candidates.sort(()=>Math.random()-.5);
    // Perf 18/07 : AUCUNE pré-vérification photo (c'était jusqu'à 24 Mo de
    // téléchargements plein format) — rails et cartes ont un onerror.
    const verified=candidates;
    if(_reqToken!==token)return;
    if(!verified.length){await _fetchAndRender(token);return;}
    // Group by quality, pick 2-3 per group at random, then shuffle all
    const groups=new Map();
    for(const r of verified){
      const q=r.quality||'_';
      if(!groups.has(q))groups.set(q,[]);
      groups.get(q).push(r);
    }
    const picked=[];
    for(const [,items] of groups){
      const shuffled=[...items].sort(()=>Math.random()-.5);
      picked.push(...shuffled.slice(0,3));
    }
    picked.sort(()=>Math.random()-.5);
    const final=picked.slice(0,PAGE);
    if(_reqToken!==token)return;
    all=final.map(rowToUi);
    _totalCount=all.length;
    _maxKnownPage=1;
    // Update count bar with REAL totals (full stock)
    const rbarRefs=document.getElementById('rbar-refs');
    const rbarTons=document.getElementById('rbar-tons');
    if(rbarRefs)rbarRefs.textContent=_realCount.toLocaleString('fr-FR');
    if(rbarTons)rbarTons.textContent=(_realWeightKg/1000).toFixed(1);
    const cn=document.getElementById('correction-note');
    if(cn)cn.innerHTML='';
    const fdCount=document.getElementById('fd-count');
    if(fdCount)fdCount.textContent=_realCount.toLocaleString('fr-FR');
    const rbarReset=document.getElementById('rbar-reset');
    if(rbarReset)rbarReset.style.display='none';
    updateMobFilterBadge();
    updateFilterChips();
    _loadingProducts=false;
    render(all);
    _updatePager();
    window._heroFill&&window._heroFill(all);
  }catch(e){if(_reqToken===token)await _fetchAndRender(token);}
}
async function _fetchAndRender(token){
  const g=document.getElementById('pgrid');
  if(g){
    g.className=_viewMode==='list'?'pgrid plist':'pgrid';
    g.innerHTML=_viewMode==='list'
      ?`<div style="overflow-x:auto"><table class="plist-table"><thead><tr><th class="plist-th-add"></th><th></th><th class="plist-col-ref">Référence</th><th>Qualité</th><th>Détails</th><th>Couleur</th><th>GSM</th><th>Laize</th><th>Diamètre</th><th class="plist-col-mandrin">Mandrin</th><th>Poids (kg)</th><th class="plist-col-usine">Usine</th></tr></thead><tbody>${Array(10).fill(0).map(()=>`<tr><td colspan="12"><div class="skel-line" style="height:14px;margin:6px 0;border-radius:4px;"></div></td></tr>`).join('')}</tbody></table></div>`
      :Array(8).fill(0).map(()=>`<div class="skeleton"><div class="skel-img"></div><div class="skel-body"><div class="skel-line short"></div><div class="skel-line med"></div><div class="skel-line"></div></div></div>`).join('');
  }

  // Build query
  const q=document.getElementById('search-input').value.trim();
  const types=getMsdValues('msd-type');
  const gn=+document.getElementById('f-gmin').value||+document.getElementById('f-gmin-fb')?.value||0;
  const gx=+document.getElementById('f-gmax').value||+document.getElementById('f-gmax-fb')?.value||0;
  const _lminCm=+document.getElementById('f-lmin').value||+document.getElementById('f-lmin-fb')?.value||0;
  const _lmaxCm=+document.getElementById('f-lmax').value||+document.getElementById('f-lmax-fb')?.value||0;
  const lmin=_lminCm||0;
  const lmax=_lmaxCm||0;
  const longmin=+document.getElementById('f-longmin')?.value||0;
  const longmax=+document.getElementById('f-longmax')?.value||0;
  const wmin=+document.getElementById('f-wmin')?.value||0;
  const wmax=+document.getElementById('f-wmax')?.value||0;
  const refCode=(document.getElementById('f-ref-code')?.value||'').trim().toUpperCase();
  const mandrins=getMsdValues('msd-mandrin');
  const couleurs=getMsdValues('msd-couleur');
  const formats=new Set([...document.querySelectorAll('.fpill.active:not(.fpill-orig):not(.fpill-stock):not(.fpill-depot):not(.fpill-photo):not(.fpill-resa)')].map(b=>b.dataset.format));
  const origines=new Set([...document.querySelectorAll('.fpill-orig.active')].map(b=>b.dataset.origine));
  const sortEl=document.getElementById('sort-sel')||document.getElementById('sort-select');
  const s=sortEl?sortEl.value:'gsm_asc';

  const parsed=parseSearchQuery(q);
  _lastCorrections=parsed.corrections;
  // If the entire query resolves to filter intent words (no product text, no dimensions),
  // auto-apply those filters and clear the search input instead of running a text search.
  if(parsed.filterIntents.length&&!parsed.text.length&&!parsed.gsm&&!parsed.width&&!parsed.formats.length&&!parsed.colors.length&&!parsed.qualityCodes.length){
    const inp=document.getElementById('search-input');
    if(inp)inp.value='';
    parsed.filterIntents.forEach(fi=>fi.highlight());
    return;
  }
  // Merge sidebar type codes + search-detected type codes + qualite direct codes
  const _hasAutres=types.has('AUTRES');
  const _knownSelected=[...types].filter(c=>c!=='AUTRES');
  const _sideCodes=types.size>0?_knownSelected.flatMap(c=>_isCouleurPseudo(c)?['RCOL']:[c]):[];
  const _pCodes=parsed.qualityCodes.length&&!types.size?parsed.qualityCodes:[];
  const typeCodes=[..._sideCodes,..._pCodes];

  // GSM constraint from Couleur split filter
  const _couleurGsmMax=0,_couleurGsmMin=0; // RCOL unifié 17/08 : plus de bornes gsm implicites

  // Build RPC params for sum_weight_filtered
  const rpcParams={};
  if(parsed.text.length)rpcParams.q=parsed.text.join(' ').replace(/[%_]/g,'\\$&');
  if(typeCodes.length>0)rpcParams.quality_in=typeCodes;
  if(_couleurGsmMax)rpcParams.gsm_max=_couleurGsmMax;
  if(_couleurGsmMin)rpcParams.gsm_min=_couleurGsmMin;
  const _gsm=parsed.gsm&&!gn&&!gx&&!_couleurGsmMax&&!_couleurGsmMin?parsed.gsm:null;
  const _width=parsed.width&&!lmin&&!lmax?parsed.width:null;
  const _pformats=parsed.formats.length&&!formats.size?parsed.formats:[];
  const _pcolors=parsed.colors.length&&!couleurs.size?parsed.colors:[];
  if(gn)rpcParams.gsm_min=gn; if(gx)rpcParams.gsm_max=gx;
  if(_gsm){const _tol=Math.max(5,Math.round(_gsm*0.1));rpcParams.gsm_min=_gsm-_tol;rpcParams.gsm_max=_gsm+_tol;}
  if(lmin)rpcParams.width_min=lmin; if(lmax)rpcParams.width_max=lmax;
  if(_width){rpcParams.width_min=_width;rpcParams.width_max=_width;}
  const _pNoyau=parsed.noyau&&!mandrins.size?String(parsed.noyau):null;
  if(mandrins.size>0)rpcParams.noyau_in=[...mandrins];
  else if(_pNoyau)rpcParams.noyau_in=[_pNoyau];
  const _allColors=[...couleurs,..._pcolors];
  if(_allColors.length)rpcParams.color_in=[...new Set(_allColors.flatMap(c=>_COLOR_DB[c]||[c]))];
  const _allFormats=[...formats,..._pformats];
  if(_allFormats.length)rpcParams.format_in=_allFormats;
  if(origines.size===1)rpcParams.origine_prefix=[...origines][0];

  // Build URL params (replaces SDK query builder)
  const p=new URLSearchParams();
  p.set('select',SEL_UI);
  parsed.text.forEach(term=>{
    const t=parsed.exact?_norm(term):_stem(_norm(term));
    const escaped=t.replace(/[%_(),]/g,'\\$&');
    p.append('or',`(quality.ilike.%${escaped}%,color.ilike.%${escaped}%,details.ilike.%${escaped}%,ref.ilike.%${escaped}%)`);
  });
  if(_hasAutres&&typeCodes.length>0){
    p.append('or',`(quality.in.(${typeCodes.join(',')}),quality.not.in.(${QUALITE_KNOWN_DB.join(',')}),quality.is.null)`);
  } else if(_hasAutres){
    p.append('quality',`not.in.(${QUALITE_KNOWN_DB.join(',')})`);
  } else if(typeCodes.length>0){
    p.append('quality',`in.(${typeCodes.join(',')})`);
  }
  if(_couleurGsmMax)p.append('gsm',`lte.${_couleurGsmMax}`);
  if(_couleurGsmMin)p.append('gsm',`gte.${_couleurGsmMin}`);
  if(gn)p.append('gsm',`gte.${gn}`);
  if(gx)p.append('gsm',`lte.${gx}`);
  if(_gsm){const _tol=Math.max(5,Math.round(_gsm*0.1));p.append('gsm',`gte.${_gsm-_tol}`);p.append('gsm',`lte.${_gsm+_tol}`);}
  if(lmin)p.append('width',`gte.${lmin}`);
  if(lmax)p.append('width',`lte.${lmax}`);
  if(_width)p.append('width',`eq.${_width}`);
  if(mandrins.size>0)p.append('noyau',`in.(${[...mandrins].join(',')})`);
  else if(_pNoyau)p.append('noyau',`eq.${_pNoyau}`);
  if(_allColors.length){const _dbC=[...new Set(_allColors.flatMap(c=>_COLOR_DB[c]||[c]))];p.append('color',`in.(${_dbC.map(v=>`"${v}"`).join(',')})`);}
  if(_allFormats.length)p.append('format',`in.(${_allFormats.join(',')})`);
  if(origines.size===1)p.append('quality',`like.${[...origines][0]}%`);
  if(longmin)p.append('longueur',`gte.${longmin}`);
  if(longmax)p.append('longueur',`lte.${longmax}`);
  if(wmin)p.append('weight',`gte.${wmin}`);
  if(wmax)p.append('weight',`lte.${wmax}`);
  // Escape PostgREST glob/group meta-chars so free-form inputs can't break the query
  const _pgEsc = s => String(s||'').replace(/[%_(),]/g,'\\$&');
  if(refCode)p.append('quality',`ilike.${_pgEsc(refCode)}%`);
  // Référence bobine (range numérique sur "Photo_NNNNNN")
  const refMinSrv=+document.getElementById('f-refmin')?.value||0;
  const refMaxSrv=+document.getElementById('f-refmax')?.value||0;
  if(refMinSrv||refMaxSrv){
    if(refMinSrv&&!refMaxSrv){
      // Min seul = LA réf exacte (pas « tout ce qui suit »).
      p.append('ref',`eq.Photo_${String(refMinSrv).padStart(6,'0')}`);
    } else {
      if(refMinSrv)p.append('ref',`gte.Photo_${String(refMinSrv).padStart(6,'0')}`);
      if(refMaxSrv)p.append('ref',`lte.Photo_${String(refMaxSrv).padStart(6,'0')}`);
      p.append('ref','match.^Photo_[0-9]{6}$');
    }
  }
  const usineVal=(document.getElementById('f-usine')?.value||'').trim();
  if(usineVal)p.append('usine',`eq.${_pgEsc(usineVal)}`);
  const detailsSel=getMsdValues('msd-details');
  if(detailsSel.size>0){
    // Catégories canoniques (16/07) : chaque tag = clause ilike serveur,
    // « Autres » = aucun motif reconnu, « Sans détails » = champ vide.
    const _terms=[];
    if(detailsSel.has(DETAILS_NONE)){_terms.push('details.is.null','details.eq.');}
    if(detailsSel.has(DETAILS_AUTRES)){_terms.push(_detailAutresPg());}
    [...detailsSel].filter(v=>v!==DETAILS_NONE&&v!==DETAILS_AUTRES).forEach(lbl=>{
      const _cie=/^CIE (\d+)$/.exec(lbl);
      if(_cie){_terms.push(_ciePg(+_cie[1]));return;}
      const t=DETAIL_TAGS.find(x=>x.label===lbl);
      if(t)_terms.push(_detailTagPg(t));
    });
    if(_terms.length)p.append('or',`(${_terms.join(',')})`);
  }
  const fmtSel=getMsdValues('msd-format');
  if(fmtSel.size>0){
    const _fcl=[];
    FORMAT_FAMILLES.forEach(f=>{if(fmtSel.has(_fmtLbl(f)))_fcl.push(_fmtPg(f));});
    if(fmtSel.has(FORMAT_AUTRES)){
      // Autres = pas bobine ET dans aucune famille (dims manquantes incluses)
      const nots=FORMAT_FAMILLES.map(f=>'not.'+_fmtPg(f).replace(/^and\(format\.neq\.Bobine,/,'and(').replace(/\)$/,')')).join(',');
      _fcl.push(`and(format.neq.Bobine,${FORMAT_FAMILLES.map(f=>{const t=FORMAT_TOL,a=f[0],b=f[1];return `not.or(and(width.gte.${a-t},width.lte.${a+t},longueur.gte.${b-t},longueur.lte.${b+t}),and(width.gte.${b-t},width.lte.${b+t},longueur.gte.${a-t},longueur.lte.${a+t}))`;}).join(',')})`);
    }
    if(_fcl.length)p.append('or',`(${_fcl.join(',')})`);
  }
  const gsmSel=getMsdValues('msd-grammage');
  if(gsmSel.size>0){
    const _gcl=[];
    GRAMMAGE_FAMILLES.forEach(a=>{if(gsmSel.has(_gsmLbl(a)))_gcl.push(_gsmPg(a));});
    if(gsmSel.has(GRAMMAGE_AUTRES)){
      const t=GRAMMAGE_TOL;
      _gcl.push(`or(gsm.is.null,and(${GRAMMAGE_FAMILLES.map(a=>`or(gsm.lt.${a-t},gsm.gt.${a+t})`).join(',')}))`);
    }
    if(_gcl.length)p.append('or',`(${_gcl.join(',')})`);
  }
  const lzSel=getMsdValues('msd-laize');
  if(lzSel.size>0){
    const _lcl=[];
    LAIZE_TRANCHES.forEach(t=>{if(lzSel.has(t.label))_lcl.push(_laizePgT(t));});
    if(lzSel.has(LAIZE_AUTRES)){
      _lcl.push('and(format.eq.Bobine,width.is.null)');
    }
    if(_lcl.length)p.append('or',`(${_lcl.join(',')})`);
  }
  const usSel=getMsdValues('msd-usine');
  if(usSel.size>0){
    const _uq=[...usSel].map(v=>'"'+String(v).replace(/"/g,'""')+'"').join(',');
    p.append('usine',`in.(${_uq})`);
  }
  const dmSel=getMsdValues('msd-diametre');
  if(dmSel.size>0){
    const _dcl=[];
    DIAM_TRANCHES.forEach(t=>{if(dmSel.has(t.label))_dcl.push(_diamPgT(t));});
    if(dmSel.has(DIAM_AUTRES)){
      _dcl.push('and(format.eq.Bobine,longueur.is.null)');
    }
    if(_dcl.length)p.append('or',`(${_dcl.join(',')})`);
  }
  const pdSel=getMsdValues('msd-poids');
  if(pdSel.size>0){
    const _pcl=POIDS_TRANCHES.filter(t=>pdSel.has(t.label)).map(_poidsPg);
    if(_pcl.length)p.append('or',`(${_pcl.join(',')})`);
  }
  const zoneNum=(document.getElementById('f-zone-num')?.value||'').trim();
  const zoneLet=(document.getElementById('f-zone-let')?.value||'').trim().toUpperCase();
  if(zoneNum&&zoneLet)p.append('zone',`ilike.${_pgEsc(zoneNum)}${_pgEsc(zoneLet)}%`);
  else if(zoneNum)p.append('zone',`like.${_pgEsc(zoneNum)}%`);
  else if(zoneLet)p.append('zone',`ilike.%${_pgEsc(zoneLet)}%`);
  // Dépôt/stock : périmètre verrouillé dans sbQ (dépôt seul, sans DU/FAB).
  // Filtre Réservé — reserve_client posé par l'import Sage quotidien.
  if(_resaFilter==='with')p.append('reserve_client','not.is.null');
  else if(_resaFilter==='without')p.append('reserve_client','is.null');
  // Photo filter — image_url is NULL pour les produits sans photo réelle (mis à jour par scripts/verify_photos.py)
  if(_photoFilter==='with')p.append('image_url','not.is.null');
  else if(_photoFilter==='without'){
    p.append('image_url','is.null');
    // Exclure uniquement les FAB purs (Photo_FAB hors dépôt) — ils n'ont jamais de photo par nature.
    p.append('or','(ref.not.ilike.Photo_FAB%,ref.is.null,emplacement.eq.OUR WAREHOUSE)');
  }
  // Tri primaire : format (Bobine < Feuille < Palette) — bobines toujours globalement avant les formats.
  // Tri secondaire : sélection user (gsm/price/id).
  if(s==='gsm_asc'||s==='grammage_asc')p.set('order','format.asc.nullslast,gsm.asc.nullslast,id.asc');
  else if(s==='gsm_desc'||s==='grammage_desc')p.set('order','format.asc.nullslast,gsm.desc.nullslast,id.asc');
  else if(s==='price_asc'||s==='prix_asc')p.set('order','format.asc.nullslast,price.asc.nullslast,id.asc');
  else if(s==='price_desc'||s==='prix_desc')p.set('order','format.asc.nullslast,price.desc.nullslast,id.asc');
  else if(s==='ref_asc'||s==='ref_desc'){
    // "Arrivage" = vraies bobines en stock (refs numériques Photo_NNNNNN avec photo
    // réelle). On exclut PM/FAB/DU + on force image_url not null pour atterrir
    // direct sur le stock physique sans noise "photos/fabrication sur demande".
    p.append('ref','not.ilike.Photo_PM%');
    p.append('ref','not.ilike.Photo_FAB%');
    p.append('ref','not.ilike.Photo_DU%');
    if(_photoFilter!=='with')p.append('image_url','not.is.null');
    p.set('order',s==='ref_asc'
      ? 'format.asc.nullslast,ref.asc.nullslast,id.asc'
      : 'format.asc.nullslast,ref.desc.nullslast,id.asc');
  }
  else p.set('order','format.asc.nullslast,id.desc');
  _lastQueryP=new URLSearchParams(p); // requête courante (tonnage + scroll infini)
  const offset=(currentPage-1)*PAGE;

  const ctrl=new AbortController();
  const _to=setTimeout(()=>ctrl.abort(),15000);
  let data,error,_exactCount=null,_totalWeightKg=0;
  try{
    // Perf 20/07 : en mode groupé (défaut) le bloc « MODE REGROUPÉ » plus bas
    // refetche TOUS les rows et écrase `all`, `_totalCount`, `_totalWeightKg` —
    // la requête paginée + count=exact + la RPC tonnage étaient donc calculées
    // pour rien (2 allers-retours + un COUNT(*) plein-scan gaspillés par filtrage).
    // On ne les lance QUE hors mode groupé.
    if(_groupedMode){
      data=[];
    }else{
      const [mainRes,wRes]=await Promise.all([
        sbQ('products?'+p,{headers:{'Prefer':'count=exact','Range':offset+'-'+(offset+PAGE-1)},signal:ctrl.signal}),
        sbQ('rpc/sum_weight_filtered',{method:'POST',body:rpcParams})
      ]);
      ({data,error,count:_exactCount}=mainRes);
      _totalWeightKg=wRes.data||0;
      // Fuzzy fallback: server returned 0 results but user typed something → try client-side fuzzy.
      // Fuzzy returns full product rows (same select=* shape as server), so rowToUi produces
      // identical UI objects. We also recompute tonnage here since the server RPC ran against
      // the 0-result query and would report 0T.
      if(!error&&(!data||data.length===0)&&q.length>0&&currentPage===1&&!parsed.exact){
        const fuzzy=await _fuzzyFallback(q,{
          longmin,longmax,wmin,wmax,
          quality_in:rpcParams.quality_in,color_in:rpcParams.color_in,
          format_in:rpcParams.format_in,noyau_in:rpcParams.noyau_in,
          refCode,usineVal,
        });
        if(fuzzy.length){
          data=fuzzy;
          _exactCount=fuzzy.length;
          _totalWeightKg=fuzzy.reduce((s,r)=>s+(+r.weight||0),0);
        }
      }
    }
  }catch(e){
    clearTimeout(_to);
    if(_reqToken!==token)return;
    const msg=e?.name==='AbortError'?'Délai dépassé — vérifiez votre connexion.':'Impossible de joindre le serveur.';
    if(g)g.innerHTML=`<div class="empty" style="grid-column:1/-1"><div class="empty-lbl">${'ERREUR RÉSEAU'}</div><div class="empty-sub">${msg}</div><button class="btn-empty-reset" onclick="_doFilter()">${'↺ Réessayer'}</button></div>`;
    return;
  }
  clearTimeout(_to);
  if(_reqToken!==token)return;

  if(error){
    console.error(error);
    if(g)g.innerHTML=`<div class="empty" style="grid-column:1/-1"><div class="empty-lbl">${'ERREUR'}</div><div class="empty-sub">${esc(error.message||'Impossible de charger les produits.')}</div><button class="btn-empty-reset" onclick="_doFilter()">${'↺ Réessayer'}</button></div>`;
    return;
  }

  // Recalculate weight using same filters as main query (paginated).
  // Perf 18/07 : seulement si des filtres sont actifs (RPC juste sinon).
  // Perf 20/07 : sauté en mode groupé — le tonnage y est déjà recalculé depuis
  // _allUi (voir bloc MODE REGROUPÉ), donc cette boucle séquentielle complète
  // ne faisait que produire une valeur immédiatement écrasée.
  if(_reqToken===token&&_anyFilterActive()&&!_groupedMode){
    try{
      const _wp=new URLSearchParams(p);
      _wp.set('select','weight');
      _wp.delete('order');
      let _wTotal=0,_wOff=0,_wDone=false;
      while(!_wDone&&_reqToken===token){
        const _wr=await sbQ('products?'+_wp,{headers:{'Range':_wOff+'-'+(_wOff+999)}});
        if(_wr.data){_wTotal+=_wr.data.reduce((s,r)=>s+(+r.weight||0),0);_wOff+=_wr.data.length;if(_wr.data.length<1000)_wDone=true;}
        else _wDone=true;
      }
      if(_reqToken===token)_totalWeightKg=_wTotal;
    }catch(_){}
  }
  all=(data||[]).map(rowToUi);
  // ─── MODE REGROUPÉ ───
  // En mode groupé : on fetche TOUS les rows correspondant aux filtres (par batch de 1000),
  // on les regroupe, puis on pagine les groupes côté client. Chaque produit affiché devient
  // le "proto" du groupe (premier avec photo) augmenté de méta-données _grp*.
  if(_groupedMode&&_reqToken===token){
    try{
      const _ap=new URLSearchParams(p);
      _ap.set('select',SEL_UI);
      _ap.delete('order');
      const _cacheKey=_ap.toString();
      let _allUi;
      if(_allUnitsCache&&_allUnitsCacheKey===_cacheKey){
        _allUi=_allUnitsCache;
      } else {
        const _allRows=[];let _aOff=0,_aDone=false;
        while(!_aDone&&_reqToken===token){
          const _ar=await sbQ('products?'+_ap,{headers:{'Range':_aOff+'-'+(_aOff+999)}});
          if(_ar.data&&_ar.data.length){_allRows.push(..._ar.data);_aOff+=_ar.data.length;if(_ar.data.length<1000)_aDone=true;}
          else _aDone=true;
        }
        if(_reqToken!==token)return;
        _allUi=_allRows.map(rowToUi);
        _allUnitsCache=_allUi;
        _allUnitsCacheKey=_cacheKey;
      }
      _groupsList=groupProducts(_allUi);
      _groupedTotalCount=_groupsList.length;
      // Tri des groupes selon le sort sélectionné (cohérent avec serveur).
      // Primaire : format (Bobine < Feuille < Palette) pour garder bobines globalement avant formats.
      const _sortKey=(()=>{const v=document.getElementById('sort-sel')?.value||'';
        if(v==='gsm_asc'||v==='grammage_asc')return['grammage','asc'];
        if(v==='gsm_desc'||v==='grammage_desc')return['grammage','desc'];
        if(v==='price_asc'||v==='prix_asc')return['price','asc'];
        if(v==='price_desc'||v==='prix_desc')return['price','desc'];
        if(v==='ref_asc')return['ref','asc'];
        if(v==='ref_desc')return['ref','desc'];
        return null;})();
      const _fmtRank=p=>_estFormat(p)?1:0;
      _groupsList.sort((a,b)=>{
        const fa=_fmtRank(a._proto),fb=_fmtRank(b._proto);
        if(fa!==fb)return fa-fb;
        if(_sortKey){
          const[k,d]=_sortKey;
          const av=a._proto[k],bv=b._proto[k];
          if(av==null&&bv==null)return 0;if(av==null)return 1;if(bv==null)return -1;
          if(k==='ref'){const c=String(av).localeCompare(String(bv));return d==='asc'?c:-c;}
          return d==='asc'?av-bv:bv-av;
        }
        return 0;
      });
      // Slice page courante
      const _gOff=(currentPage-1)*PAGE;
      const _pageGroups=_groupsList.slice(_gOff,_gOff+PAGE);
      // Construit `all` à partir des protos enrichis
      all=_pageGroups.map(g=>{
        // Default qty = max disponible (le client veut tout par défaut)
        if(g.count>1&&_groupQty[g.gid]==null)_groupQty[g.gid]=g.count;
        return {
          ...g._proto,
          _grpCount:g.count,
          _grpTotalWeight:g.totalWeight,
          _grpMandrins:Array.from(g.mandrins),
          _grpDepots:Array.from(g.depots),
          _grpUsines:Array.from(g.usines),
          _grpUnitIds:g.units.map(u=>u.id),
          _grpKey:g.gid,
          _grpProtoId:g.proto_id
        };
      });
      _totalCount=_groupedTotalCount;
      _groupedUnitCount=_allUi.length;
      _maxKnownPage=Math.max(1,Math.ceil(_totalCount/PAGE)||1);
      _totalWeightKg=_allUi.reduce((s,r)=>s+(+r.poids_net||0),0);
    }catch(_){
      // En cas d'erreur, on retombe sur le mode paginé classique. `data` étant
      // vide en mode groupé (perf 20/07), on refetche la 1re page en secours
      // pour ne pas afficher un catalogue vide (ce filet existait avant via la
      // requête paginée systématique).
      try{
        const _fb=await sbQ('products?'+p,{headers:{'Prefer':'count=exact','Range':offset+'-'+(offset+PAGE-1)}});
        all=(_fb.data||[]).map(rowToUi);
        _totalCount=(_fb.count!=null&&!isNaN(_fb.count))?_fb.count:all.length+(currentPage-1)*PAGE;
        _maxKnownPage=Math.max(1,Math.ceil(_totalCount/PAGE)||1);
      }catch(__){}
    }
  } else {
    // Mode paginé classique (non groupé)
    if(all.length<PAGE&&currentPage===1){
      _totalCount=all.length;
      _maxKnownPage=1;
    } else {
      _totalCount=(_exactCount!=null&&!isNaN(_exactCount))?_exactCount:all.length+(currentPage-1)*PAGE;
      _maxKnownPage=Math.max(1,Math.ceil(_totalCount/PAGE)||1);
    }
  }
  // Update stats bar with real total. In grouped mode, show the number of
  // individual products (_groupedUnitCount) instead of the number of groups —
  // otherwise the user sees the post-grouping fiche count, which is misleading.
  const _displayCount=_groupedMode?_groupedUnitCount:_totalCount;
  const _st=document.getElementById('s-ton');if(_st&&_displayCount)_st.textContent=_displayCount.toLocaleString('fr-FR')+' produits';
  // Update results bar
  const rbarRefs=document.getElementById('rbar-refs');
  const rbarTons=document.getElementById('rbar-tons');
  if(rbarRefs)rbarRefs.textContent=_displayCount.toLocaleString('fr-FR');
  if(rbarTons)rbarTons.textContent=(_totalWeightKg/1000).toFixed(1);
  // Compteur tonnage dans la barre outils (à côté du +) — sélection filtrée
  const tbTons=document.getElementById('tb-tons');
  if(tbTons){const _t=_totalWeightKg/1000;tbTons.innerHTML=_t>0?`<b>${_t>=100?Math.round(_t).toLocaleString('fr-FR'):_t.toFixed(1).replace('.',',')}</b> t`:'';}
  // 18/08 (Ethan, téléphone) : tonnage de la sélection AUSSI dans le header,
  // entre le logo Prodiconseil et les boutons de droite
  (function(){
    let ht=document.getElementById('head-tons');
    if(!ht){const hi=document.querySelector('.header-inner');const ll=hi&&hi.querySelector('.logo-link');
      if(ll){ht=document.createElement('div');ht.id='head-tons';ll.insertAdjacentElement('afterend',ht);}}
    if(ht){const _t=_totalWeightKg/1000;ht.innerHTML=_t>0?`<b>${_t>=100?Math.round(_t).toLocaleString('fr-FR'):_t.toFixed(1).replace('.',',')}</b> t`:'';}
  })();
  const cn=document.getElementById('correction-note');
  if(cn)cn.innerHTML=_lastCorrections.length?` <span class="correction-note">· correction : ${_lastCorrections.map(c=>`<b>${esc(c.from)}</b> → ${esc(c.to)}`).join(', ')}</span>`:'';
  // Update fd-count for mobile drawer
  const fdCount=document.getElementById('fd-count');
  if(fdCount)fdCount.textContent=_displayCount.toLocaleString('fr-FR');
  // Show/hide reset button
  const rbarReset=document.getElementById('rbar-reset');
  if(rbarReset)rbarReset.style.display=hasActiveFilters()?'':'none';
  // Update mobile filter badge
  updateMobFilterBadge();

  // Update counters
  const counters={'msd-type':'fl-count-type','msd-mandrin':'fl-count-mandrin','msd-couleur':'fl-count-couleur'};
  Object.entries(counters).forEach(([msd,el])=>{const c=document.getElementById(el);if(c){const n=msdState[msd]?.size||0;c.textContent=n;c.style.display=n?'':'none';}});

  updateFilterChips();
  render(all);
  renderEquivBanner();
  updateTilesActiveState();
  _updatePager();
  if(typeof _updateAddPageBtn==='function')_updateAddPageBtn();
}
function renderEquivBanner(){
  let banner=document.getElementById('equiv-banner');
  if(!banner){
    banner=document.createElement('div');
    banner.id='equiv-banner';
    const grid=document.getElementById('pgrid');
    if(grid)grid.parentElement.insertBefore(banner,grid);
  }
  const equivTypes=_lastDetectedTypes.flatMap(t=>getEquivTypes(t));
  const unique=[...new Set(equivTypes)];
  if(!unique.length||!_lastDetectedTypes.length){banner.innerHTML='';return;}
  const equivLabel='Voir aussi :';
  banner.innerHTML=`<div class="equiv-banner"><span class="equiv-label">💡 ${esc(equivLabel)}</span>${unique.map(t=>`<button class="equiv-pill" onclick="applyEquivType(${attrJs(t)})">${esc(t)}</button>`).join('')}</div>`;
}
function applyEquivType(typeName){
  const inp=document.getElementById('search-input');
  inp.value=typeName;
  inp.dispatchEvent(new Event('input'));
  filterProducts();
}

let _maxKnownPage=1;
function _updatePager(){
  try{
    const pager=document.getElementById('pager');
    const pagerTop=document.getElementById('pager-top');
    if(!pager)return;
    if(_sharedMode){pager.style.display='none';if(pagerTop)pagerTop.style.display='none';return;}
    const isLast=all.length<PAGE||(_totalCount>0&&currentPage*PAGE>=_totalCount);
    if(isLast&&currentPage===1){
      // Definitively only one page — ignore any stale _maxKnownPage
      _maxKnownPage=1;
    } else if(!isLast&&currentPage>=_maxKnownPage){
      _maxKnownPage=currentPage+1;
    } else if(isLast){
      // On a later last page — shrink to reality
      _maxKnownPage=currentPage;
    }
    if(all.length===0){pager.innerHTML='';if(pagerTop)pagerTop.innerHTML='';return;}
    if(isLast&&currentPage===1){pager.innerHTML='';/* keep pager-top visible with page 1 */
      if(pagerTop)pagerTop.innerHTML=`<button class="parrow" disabled aria-label="Page précédente">‹</button><button class="pnum active" onclick="_goToPage(1)">1</button><button class="parrow" disabled aria-label="Page suivante">›</button>`;return;}
    const last=_maxKnownPage;
    const pageSet=new Set([1]);
    for(let i=Math.max(1,currentPage-2);i<=Math.min(last,currentPage+2);i++)pageSet.add(i);
    pageSet.add(last);
    const pages=[...pageSet].sort((a,b)=>a-b);
    let pagesHtml='';let prev=0;
    for(const p of pages){
      if(p-prev>1)pagesHtml+=`<span class="pellipsis">…</span>`;
      pagesHtml+=`<button class="pnum${p===currentPage?' active':''}" onclick="_goToPage(${p})">${p}</button>`;
      prev=p;
    }
    const pagerHtml=`<button class="parrow" ${currentPage<=1?'disabled':''} onclick="_goToPage(${currentPage-1})" aria-label="Page précédente">‹</button>${pagesHtml}<button class="parrow" ${isLast?'disabled':''} onclick="_goToPage(${currentPage+1})" aria-label="Page suivante">›</button>`;
    pager.innerHTML=pagerHtml;
    if(pagerTop)pagerTop.innerHTML=pagerHtml;
  }catch(e){console.error('_updatePager:',e);}
}
function _goToPage(p){
  if(p<1||p===currentPage)return;
  currentPage=p;
  if(_sharedMode&&typeof _sharedAll!=='undefined'){
    const start=(currentPage-1)*PAGE;
    const pageItems=_sharedAll.slice(start,start+PAGE);
    all=_sharedAll;
    _totalCount=_sharedAll.length;
    _maxKnownPage=Math.max(1,Math.ceil(_sharedAll.length/PAGE));
    render(pageItems);
    _updatePager();
  } else {
    _fetchAndRender(++_reqToken);
  }
  window.scrollTo({top:0,behavior:'smooth'});
}

let _chipSeen=[]; // ordre d'activation des tags de filtres
function updateFilterChips(){
  const container=document.getElementById('filter-chips');
  const chips=[];
  const q=document.getElementById('search-input').value;
  const gn=document.getElementById('f-gmin').value;
  const gx=document.getElementById('f-gmax').value;
  const lmin2=document.getElementById('f-lmin')?.value||'';
  const lmax2=document.getElementById('f-lmax')?.value||'';
  if(q)chips.push({key:'q',label:'Recherche'+' : "'+q+'"',clear:()=>{document.getElementById('search-input').value='';document.getElementById('search-input-mob').value='';filterProducts();}});
  // Add format pills chip
  // Set : les pilules existent en double (desktop + mobile) — sans dédup la
  // chip affichait « Bobine, Bobine » (04/08).
  const _activeFmts=[...new Set(Array.from(document.querySelectorAll('.fpill.active:not(.fpill-orig):not(.fpill-stock):not(.fpill-depot):not(.fpill-photo):not(.fpill-resa)')).map(b=>b.dataset.format))];
  const _activeOrigs=Array.from(document.querySelectorAll('.fpill-orig.active')).map(b=>b.dataset.origine==='R'?'Stocklot':'Fabrication');
  if(_activeOrigs.length>0)chips.push({key:'orig',label:('Origine')+' : '+_activeOrigs.join(', '),clear:()=>{document.querySelectorAll('.fpill-orig.active').forEach(b=>b.classList.remove('active'));filterProducts();}});
  if(_photoFilter)chips.push({key:'photo',label:_photoFilter==='with'?'Avec photo':'Sans photo',clear:()=>{_photoFilter='';syncFilterPills();filterProducts();}});
  if(_resaFilter)chips.push({key:'resa',label:_resaFilter==='with'?'Réservé':'Dispo',clear:()=>{_resaFilter='';document.querySelectorAll('.fpill-resa').forEach(b=>b.classList.remove('active'));filterProducts();}});
  if(_activeFmts.length>0&&window.innerWidth<=768)chips.push({key:'fmtpill',label:_activeFmts.map(f=>f==='Bobine'?'Bobine':f==='Palette'?'Format':f).join(', '),clear:()=>{_formatFilter='';syncFilterPills();filterProducts();}}); // desktop : le segment Bobine/Format suffit, pas de chip redondant
  ['msd-type','msd-mandrin','msd-couleur','msd-details','msd-format','msd-grammage','msd-laize','msd-usine','msd-diametre','msd-poids'].forEach(id=>{
    const set=msdState[id];
    if(set.size>0){
      const lbl={'msd-type':'Type','msd-mandrin':'Mandrin','msd-couleur':'Couleur','msd-details':'Détails','msd-format':'Dimensions','msd-grammage':'Grammage','msd-laize':'Laize','msd-usine':'Usine','msd-diametre':'Ø','msd-poids':'Poids'}[id];
      // La plage du curseur CIE s'affiche compressée (« CIE 120 → 160 ») ;
      // les petits tags embarqués par « Autres » restent implicites, et les
      // deux sentinelles fusionnent en une seule mention.
      let items=[...set];
      if(id==='msd-details'){
        const cieN=items.filter(v=>/^CIE \d+$/.test(v)).map(v=>+v.slice(4));
        if(cieN.length>1){
          items=items.filter(v=>!/^CIE \d+$/.test(v));
          items.unshift('CIE '+Math.min(...cieN)+' → '+Math.max(...cieN));
        }
        if(set.has(DETAILS_AUTRES)&&window._detRareTags)
          items=items.filter(v=>!window._detRareTags.has(v));
        if(set.has(DETAILS_AUTRES)&&set.has(DETAILS_NONE))
          items=items.filter(v=>v!==DETAILS_NONE).map(v=>v===DETAILS_AUTRES?'Autres / Sans détails':v);
      }
      const vals=items.map(v=>v===DETAILS_NONE?'Sans détails':v===DETAILS_AUTRES?'Autres':v===FORMAT_AUTRES?'Autres formats':v===GRAMMAGE_AUTRES?'Autres grammages':v===LAIZE_AUTRES?'Autres laizes':v===DIAM_AUTRES?'Autres Ø':v).join(', ');
      chips.push({key:id,label:lbl+' : '+vals,clear:()=>{resetMsd(id);filterProducts();}});
    }
  });
  if(gn||gx)chips.push({key:'grange',label:'Gram.'+' : '+(gn||'—')+' → '+(gx||'—')+' g/m²',clear:()=>{document.getElementById('f-gmin').value='';document.getElementById('f-gmax').value='';_gslSyncAll();filterProducts();}});

  if(lmin2||lmax2)chips.push({key:'lrange',label:'Laize'+' : '+(lmin2||'—')+' → '+(lmax2||'—')+' mm',clear:()=>{['f-lmin','f-lmax','f-lmin-fb','f-lmax-fb','f-lmin-mob','f-lmax-mob'].forEach(id=>{const e=document.getElementById(id);if(e)e.value='';});filterProducts();}});
  const longmin2=document.getElementById('f-longmin')?.value||'';
  const longmax2=document.getElementById('f-longmax')?.value||'';
  if(longmin2||longmax2)chips.push({key:'lgrange',label:'Ø : '+(longmin2||'—')+' → '+(longmax2||'—')+' mm',clear:()=>{['f-longmin','f-longmax','f-longmin-mob','f-longmax-mob'].forEach(id=>{const e=document.getElementById(id);if(e)e.value='';});filterProducts();}});
  const wmin2=document.getElementById('f-wmin')?.value||'';
  const wmax2=document.getElementById('f-wmax')?.value||'';
  if(wmin2||wmax2)chips.push({key:'wrange',label:'Poids : '+(wmin2||'—')+' → '+(wmax2||'—')+' kg',clear:()=>{['f-wmin','f-wmax','f-wmin-mob','f-wmax-mob'].forEach(id=>{const e=document.getElementById(id);if(e)e.value='';});filterProducts();}});
  // PRIX_MASQUÉ: filtre prix désactivé
  // const cpn=document.getElementById('f-pmin').value,cpx=document.getElementById('f-pmax').value;
  // if(cpn||cpx)chips.push({label:'Prix'+...});
  const refMinChip=(document.getElementById('f-refmin')?.value||'').trim();
  const refMaxChip=(document.getElementById('f-refmax')?.value||'').trim();
  if(refMinChip||refMaxChip)chips.push({key:'refrange',label:'Réf. article : '+(refMinChip&&!refMaxChip?refMinChip:(refMinChip||'—')+' → '+(refMaxChip||'—')),clear:()=>{['f-refmin','f-refmax','f-refmin-mob','f-refmax-mob'].forEach(id=>{const e=document.getElementById(id);if(e)e.value='';});filterProducts();}});
  const usineChip=(document.getElementById('f-usine')?.value||'').trim();
  if(usineChip)chips.push({key:'usinein',label:'Usine : '+usineChip,clear:()=>{const e=document.getElementById('f-usine');if(e)e.value='';filterProducts();}});
  const zoneNumChip=(document.getElementById('f-zone-num')?.value||'').trim();
  const zoneLetChip=(document.getElementById('f-zone-let')?.value||'').trim();
  if(zoneNumChip)chips.push({key:'zn',label:'Zone : '+zoneNumChip,clear:()=>{['f-zone-num','f-zone-num-mob'].forEach(id=>{const e=document.getElementById(id);if(e)e.value='';});filterProducts();}});
  if(zoneLetChip)chips.push({key:'zl',label:'Allée : '+zoneLetChip,clear:()=>{['f-zone-let','f-zone-let-mob'].forEach(id=>{const e=document.getElementById(id);if(e)e.value='';});filterProducts();}});
  if(!chips.length){container.innerHTML='';const ac2=document.getElementById('active-chips');if(ac2)ac2.innerHTML='';_chipSeen=[];return;}
  // Ordre STABLE (18/07) : chaque nouveau tag s'ajoute à DROITE, les tags
  // déjà posés gardent leur place (ordre d'activation, pas ordre du code).
  {
    const keys=chips.map(c=>c.key);
    _chipSeen=_chipSeen.filter(k=>keys.includes(k));
    keys.forEach(k=>{if(!_chipSeen.includes(k))_chipSeen.push(k);});
    chips.sort((a,b)=>_chipSeen.indexOf(a.key)-_chipSeen.indexOf(b.key));
  }
  const chipsHtml=chips.map((chip,i)=>`<div class="fchip" id="chip-${numId(i)}">${esc(chip.label)}<button onclick="clearChip(${numId(i)})" title="Retirer ce filtre" aria-label="Retirer le filtre ${esc(chip.label)}">✕</button></div>`).join('')
    +(chips.length>1?`<button class="chips-clear" onclick="resetFilters()">Tout effacer</button>`:'');
  container.innerHTML=chipsHtml;
  container._chips=chips;
  // Also update active-chips in filter bar
  const ac=document.getElementById('active-chips');
  if(ac){ac.innerHTML=chipsHtml;ac._chips=chips;}
  const mobBtn=document.getElementById('mob-filter-btn');
  if(mobBtn){
    if(chips.length){mobBtn.classList.add('active');document.getElementById('mob-filter-label').innerHTML='<svg width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24" style="display:inline;vertical-align:-2px;margin-right:6px"><line x1="4" y1="6" x2="20" y2="6"/><line x1="8" y1="12" x2="16" y2="12"/><line x1="11" y1="18" x2="13" y2="18"/></svg>Filtres actifs ('+chips.length+')';}
    else{mobBtn.classList.remove('active');document.getElementById('mob-filter-label').innerHTML='<svg width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24" style="display:inline;vertical-align:-2px;margin-right:6px"><line x1="4" y1="6" x2="20" y2="6"/><line x1="8" y1="12" x2="16" y2="12"/><line x1="11" y1="18" x2="13" y2="18"/></svg>Filtres de recherche';}
  }
}
function clearChip(i){
  const container=document.getElementById('filter-chips');
  const ac=document.getElementById('active-chips');
  const chips=(container&&container._chips)||(ac&&ac._chips);
  if(chips&&chips[i])chips[i].clear();
}

function placeholderSvg(type){
  const initials = (type||'?').slice(0,3).toUpperCase();
  return `<svg width="64" height="64" viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
    <rect x="8" y="16" width="48" height="36" rx="4" stroke="#C8C8C8" stroke-width="2" fill="none"/>
    <path d="M8 26 Q32 20 56 26" stroke="#C8C8C8" stroke-width="1.5" fill="none"/>
    <text x="32" y="50" text-anchor="middle" font-family="'Bebas Neue',sans-serif" font-size="13" fill="#C8C8C8" letter-spacing="1">${initials}</text>
  </svg>`;
}
function qbadge(qualite){
  if(!qualite)return '';
  const q=qualite.toUpperCase();
  const cls=q.startsWith('R')?'recycled':q.startsWith('S')?'standard':'other';
  const lbl=q.startsWith('R')?'♻ '+('Stocklot'):q.startsWith('S')?'★ '+('Fabrication'):qualite;
  return `<div class="pcard-qbadge ${cls}">${lbl}</div>`;
}
// Decode quality codes like RKRA, SSBS, SPAC → {cls, txt}
function decodeQuality(raw){
  if(!raw)return{cls:'qb-other',txt:'?'};
  const isR=raw.charAt(0)==='R';
  const suf=raw.slice(1).toUpperCase();
  const labels={'KRA':'Kraft','KRABRUN':'Kraft Brun','KRG':'Kraft Gris','KRR':'Kraft Armé',
    'SBS':'SBS','LWC':'LWC','OFF':'Offset','1SC':'1 face','2SC':'2 faces',
    'BON':'Non cou.','LINER':'Liner','ADH':'Adhésif','THERM':'Therm.',
    'ENV':'Env.','TIS':'Tissue','LUX':'Luxe','PAC':'Emball.',
    'BOU':'Bouffant','DIV':'Divers','AFF':'Affiche','CAR':'Autocopiant',
    'COL':'Couleur','CUI':'Cuisson','FLEX':'Complexe','KDO':'Cadeau',
    'NEW':'Journal','PLA':'Plastique','SIL':'Silicone','BOA':'Carton',
    'SPE':'Spécial','INK':'Encre','CUT':'Ramette','SC':'SC'};
  const txt=labels[suf]||(suf.length>0?suf:raw);
  let cls;
  if(suf.startsWith('KRA'))cls='qb-kraft';
  else if(suf==='SBS')cls='qb-sbs';
  else if(suf==='LWC'||suf==='LUX'||suf==='OFF')cls='qb-fbb';
  else if(isR)cls='qb-recyc';
  else cls='qb-other';
  return{cls,txt};
}

function formatLabel(p){
  if(!p||!p.format)return null;
  if(_estFormat(p)&&(p.largeur||p.longueur)){
    const dims=[p.largeur,p.longueur].filter(Boolean).map(v=>mmToCm(v)).join('×');
    return `Format ${dims}`;
  }
  return p.format;
}

function _productSummary(p){
  const parts=[];
  if(p.couleur)parts.push(p.couleur);
  if(p.grammage)parts.push(p.grammage+' g/m²');
  const isPalette=_estFormat(p);
  if(isPalette&&(p.largeur||p.longueur)){
    parts.push([mmToCm(p.largeur),p.longueur?mmToCm(p.longueur):null].filter(Boolean).join(' × ')+' mm');
  }else if(p.largeur){
    const dim='Laize '+mmToCm(p.largeur)+' mm'+(p.longueur?' • Long. '+p.longueur+' mm':'');
    parts.push(dim);
  }
  return parts.join(' • ');
}
function getProductDetailText(p){
  // Priority: Excel detail field → auto-generated summary
  // Strip isolated dashes used as empty-cell placeholders (" - ", " - - ", leading/trailing "-")
  let raw=(p.details||'')
    .replace(/(?<=^|\s)-(?=\s|$)/g,'')
    .replace(/\s{2,}/g,' ')
    .trim();
  // 21/07 (Ethan) : la désignation Sage (« BOB.COULEUR », « PAL.DIVERS »…) est
  // redondante avec le titre de la carte → on la retire du DÉTAIL, partout où
  // elle apparaît (l'import la concatène parfois plusieurs fois).
  raw=raw.replace(/\b(?:BOB|PAL|FEU|RAM|MACH?)\.[A-ZÀ-Ü0-9]+\s*/gi,'').trim();
  // …et l'import colle souvent désignation + détail qui répètent la même
  // phrase (« AFFUTAGE JEU DE PATTES … CLI X AFFUTAGE JEU DE PATTES ») : on
  // retire toute séquence de mots déjà vue, même NON adjacente (la plus longue
  // d'abord ; mots isolés aussi s'ils font ≥2 caractères, insensible à la casse).
  {
    const w=raw.split(/\s+/);
    for(let len=Math.floor(w.length/2);len>=1;len--){
      for(let i=0;i+len<=w.length;i++){
        const seq=w.slice(i,i+len).join(' ').toLowerCase();
        if(len===1&&seq.length<2)continue;
        for(let j=i+len;j+len<=w.length;j++){
          if(w.slice(j,j+len).join(' ').toLowerCase()===seq){w.splice(j,len);j--;}
        }
      }
    }
    raw=w.join(' ');
  }
  raw=raw.replace(/\s{2,}/g,' ').trim();
  if(raw)return raw; // garde même les détails courts (« MG », « MAT »…) — le résumé auto ne sert que si vraiment vide
  return _productSummary(p);
}

// Set du panier + Map gid→group, reconstruits une fois par render (finding 8)
// et lus par _renderCatalogueCard (extrait au niveau module, finding 7).
let _rcCartIds=new Set(), _rcGrpByGid=new Map();
function _renderCatalogueCard(p){
    const initials=(p.type||'?').substring(0,2).toUpperCase();
    const _altTxt=[p.name,p.grammage?p.grammage+'g/m²':'',p.couleur].filter(Boolean).join(' — ')||'Produit';
    const _isFab=p.ref&&/^Photo_FAB/i.test(String(p.ref))&&p.emplacement!=='OUR WAREHOUSE';
    const _isSiderun=p.ref&&/^Photo_DU/i.test(String(p.ref));
    const _fallbackImg=_isSiderun?'/img/siderun-sur-demande.png':_isFab?'/img/fabrication-sur-demande.png':'/img/no-photo.png';
    const imgHtml=p.image_url
        ?`<img src="${imgThumb(p.image_url,560)}" alt="${esc(_altTxt)}" loading="lazy" width="300" height="279" onload="_fitCardImg(this)" onerror="if(!this._o){this._o=1;this.src='${safeUrl(p.image_url)}';}else{this.src='${esc(_fallbackImg)}';this.className='pcard-nophoto';}">`
        :`<img src="${esc(_fallbackImg)}" alt="Photo sur demande" class="pcard-nophoto" width="300" height="279">`;
    const {cls:badgeCls,txt:badgeTxt}=decodeQuality(p.type);
    const isPalette=_estFormat(p);
    const dimTag=!isPalette&&p.largeur?`${mmToCm(p.largeur)} mm`:'';
    const fmtLabel=p.format?(isPalette?'Format':'Bobine'):null;
    const paletteDims=isPalette&&(p.largeur||p.longueur)?[p.largeur,p.longueur].filter(Boolean).map(v=>mmToCm(v)).join('×'):null;
    const _isGroup=p._grpCount&&p._grpCount>1;
    const _grpTotal=_isGroup?p._grpTotalWeight:0;
    const poids=_isGroup
      ?`${Math.round(_grpTotal).toLocaleString('fr-FR')}`
      :(p.poids_net?`${p.poids_net.toLocaleString('fr-FR')}`:'—');
    const prixHtml=_priceMode&&p.price?`<div class="pcard-price">${_ccyNum(p.price*1000)} ${_ccyUnit()}</div>`:'';
    const typeOverlay='';
    const _usineClean=p.usine?String(p.usine).replace(/^REF\s*/i,''):null;
    const _usineLbl=_isGroup&&p._grpUsines&&p._grpUsines.length>1
      ?`+${p._grpUsines.length}`
      :_usineClean;
    const usineOverlay=_usineLbl?`<div class="pcard-gsm-overlay"><span class="pcard-gsm-lbl">USINE</span><span class="pcard-gsm-num">${esc(_usineLbl)}</span></div>`:'';
    const _refClean=(p.ref||'').replace(/^Photo_/i,'').trim();
    const refOverlay=_refClean?`<div class="pcard-ref-overlay" title="${esc(_refClean)}"><span class="pcard-ref-txt">${esc(_refClean)}</span></div>`:'';
    // Réservation Sage (CODE_CLI/CODE_PIECE importés chaque matin)
    const resaOverlay=p.reserve_client?`<div class="pcard-resa-overlay" title="Article réservé">RÉSERVÉ</div>`:'';
    const photoRef='';
    // Mini spec rows (label + value, only if value exists)
    // Usine désormais affichée en chip overlay sur la photo
    // Nettoie le détail : retire le préfixe BOB./PAL. + dédoublonne les mots (plus de
    // titre/désignation répété). Détail vide → « — » (pas de résumé qui doublonne les cellules).
    const _detClean=(()=>{const raw=(p.details||'').replace(/(?<=^|\s)-(?=\s|$)/g,'').replace(/\s{2,}/g,' ').trim();return raw?getProductDetailText(p):'';})();
    const _mandrinTxt=_isGroup&&p._grpMandrins&&p._grpMandrins.length
      ?(p._grpMandrins.length>1?p._grpMandrins.join(' / '):`Ø${p._grpMandrins[0]} mm`)
      :(p.noyau?`Ø${p.noyau} mm`:'');
    const specRows=[
      ['Grammage', p.grammage?`${p.grammage} g/m²`:'—'],
      isPalette
        ? ['Dimensions', paletteDims?paletteDims+' mm':'—']
        : ['Laize', dimTag||'—'],
      ['Couleur', p.couleur||'—'],
    ];
    const specsHtml=`<div class="pcard-specs">${specRows.map(([l,v])=>`<div class="pcard-spec" title="${esc(l)}"><span class="pspec-val">${esc(v)}</span></div>`).join('')}</div>`;
    // Pas d'auto-summary (couleur/gsm/laize) dans la card : ces infos sont déjà
    // dans les spec rows juste en dessous. On n'affiche le sous-titre que si
    // un vrai `details` est présent dans la fiche produit.
    const _sub=_detClean.length>2?_detClean:'';
    const subtitleHtml=_sub?`<div class="pcard-subtitle">${esc(_sub)}</div>`:'';
    // Bouton ajouter : groupé → sélecteur qté avec poids live; sinon → bouton classique
    const _q=_groupQty[p._grpKey]||1;
    const _initialW=_isGroup?Math.round((p._grpUnitIds||[]).slice(0,_q).reduce((s,uid)=>{const u=(_rcGrpByGid.get(p._grpKey)?.units||[]).find(x=>x.id===uid);return s+(+(u?.poids_net||0));},0)).toLocaleString('fr-FR')+' kg':'';
    const _totalW=_isGroup?Math.round(p._grpTotalWeight).toLocaleString('fr-FR')+' kg':'';
    const _grpAllIn=_isGroup&&(p._grpUnitIds||[]).slice(0,_q).every(id=>_rcCartIds.has(+id))&&_q>0;
    const _isInCart = _isGroup ? _grpAllIn : _rcCartIds.has(+p.id);
    // Mobile-friendly : en mode groupé in-cart le texte "Retirer N" pousse le bouton [+]
    // hors de la carte (2 cards par ligne sur mobile). Garde juste icône + count.
    const _btnText = _isInCart
      ? (_isGroup ? `${_ICO_TRASH} ${_q}` : `${_ICO_TRASH} Retirer`)
      : (_isGroup ? `+ ${_q}` : '+ Ajouter');
    const _btnAttrs = _isGroup
      ? `onclick="addGroupToCart(${attrJs(p._grpKey)})"`
      : `id="cadd-${numId(p.id)}" aria-label="${'Ajouter à la liste'}" onclick="event.stopPropagation();addToCart(${numId(p.id)})"`;
    const _initialWNum=_isGroup?_initialW.replace(' kg',''):'';
    const addCtrl=_isGroup
      ?`<div class="pcard-grp-add" onclick="event.stopPropagation();" data-gid="${esc(p._grpKey||'')}">
        <div class="pcard-foot-inline">
          <div class="pton"><span class="grp-weight">${esc(_initialWNum)}</span><span class="pton-s"> KGS</span></div>
          <div class="grp-compact">
            <button class="grp-qty-btn grp-qty-btn-minus" onclick="event.stopPropagation();_grpQtyAdj(${attrJs(p._grpKey)},-1)" aria-label="−"${_q<=1?' disabled':''}>−</button>
            <button class="btn-add-cart grp-add-btn pcard-btn-inline${_isInCart?' added':''}" ${_btnAttrs}>${_btnText}</button>
            <button class="grp-qty-btn grp-qty-btn-plus" onclick="event.stopPropagation();_grpQtyAdj(${attrJs(p._grpKey)},1)" aria-label="+"${_q>=p._grpCount?' disabled':''}>+</button>
          </div>
        </div>
      </div>`
      :`<div class="pcard-grp-add">
        <div class="pcard-foot-inline">
          <div class="pton">${esc(poids)}<span class="pton-s"> KGS</span></div>
          <button class="btn-add-cart grp-add-btn pcard-btn-inline${_isInCart?' added':''}" ${_btnAttrs}>${_btnText}</button>
        </div>
      </div>`;
    // Thème Apple : mêmes cartes étiquette que la vue client (+ pied Ajouter)
    if(document.body.classList.contains('apple-view')){
      const cell=(cap,val,span,cls)=>`<div class="sc-cell${cls?' '+cls:''}"${span?' style="grid-column:span '+span+';"':''}><div class="sc-cap">${cap}</div><div class="sc-val">${val}</div></div>`;
      let cells='';
      // Cartes : 2 cases par rangée = filets verticaux ALIGNÉS (31/07).
      // Bobine = Grammage + Laize ; Ø et mandrin restent sur la fiche.
      cells+=cell('GRAMMAGE',p.grammage?esc(p.grammage)+' <small>g/m²</small>':'—',2);
      if(isPalette){
        cells+=cell('DIMENSIONS',p.largeur&&p.longueur?esc(mmToCm(Math.min(p.largeur,p.longueur))+' × '+mmToCm(Math.max(p.largeur,p.longueur)))+' <small>mm</small>':(p.largeur?esc(mmToCm(p.largeur))+' <small>mm</small>':'—'),2);
      }else{
        cells+=cell('LAIZE',p.largeur?esc(mmToCm(p.largeur))+' <small>mm</small>':'—',2);
      }
      cells+=cell('COULEUR',esc(p.couleur||'—'),2);
      const _wv=_isGroup?_grpTotal:p.poids_net;
      cells+=cell(_isGroup?'POIDS TOTAL':'POIDS NET',_wv?esc(Math.round(_wv).toLocaleString('fr-FR'))+' <small>kgs</small>':'—',2);
      // (08/08 Ethan) DÉTAIL juste SOUS LE TITRE (sans le +) ; le + s'incruste sur la ligne PRIX.
      const _addBtn=_sharedMode
        ?(window._sharedEdit?`<button class="sc-add sc-moins added" title="${'Retirer de la liste'}" onclick="event.stopPropagation();_sharedRemove(${numId(p.id)})"></button>`:'')
        :_isGroup
        ?`<button class="sc-add${_isInCart?' added':''}" title="${_isInCart?'Retirer le lot':'Ajouter le lot ('+p._grpCount+')'}" onclick="event.stopPropagation();_grpRound(${attrJs(p._grpKey)})">+</button>`
        :`<button class="sc-add${_isInCart?' added':''}" ${_btnAttrs}>+</button>`;
      const detRow=`<div class="sc-cell sc-wrap sc-det-only" style="grid-column:span 4;"><div class="sc-val">${_detClean?esc(_detClean):'—'}</div></div>`;
      const prixVal=p.price?esc(_ccyNum(p.price*1000))+' <small>'+_ccyUnit()+'</small>':'—';
      const usineCell=`<div class="sc-cell sc-price-usine" style="grid-column:span 2;"><div class="sc-cap">USINE</div><div class="sc-val">${_usineLbl?esc(_usineLbl):'—'}</div></div>`;
      // Vue client (20/08) : PAS de prix sur la carte — cohérent avec la fiche et
      // avec « jamais de prix en vue client » (le _sharedMode a été retiré de la
      // condition : le prix ne s'affiche plus que dans le catalogue interne _priceMode).
      const prixCell=`<div class="sc-cell sc-det-row sc-price-main" style="grid-column:span 2;"><div class="sc-val sc-price-val">${_priceMode?prixVal:''}</div>${_addBtn}</div>`;
      const foot='';
      return`<div class="pcard sc-card" onclick="openDetail(${numId(p.id)})">
        <div class="pcard-img">${imgHtml}${resaOverlay}${p.promo?'<div class="pcard-promo-overlay">PROMO</div>':''}
          ${_refClean?`<span class="pbig-ref">${esc(_refClean.toUpperCase())}</span>`:''}
          ${_usineLbl?`<span class="pbig-usine">USINE ${esc(_usineLbl)}</span>`:''}
          ${_isGroup?`<span class="sc-count">× ${numId(p._grpCount)}</span>`:''}
        </div>
        <div class="sc-body">
          <div class="sc-grid has-prix">
            <div class="sc-cell sc-title" style="grid-column:span 4;">${esc(formatProductTitle(p.qualite,p.type))}</div>
            ${detRow}${cells}${usineCell}${prixCell}
          </div>
          ${foot}
        </div>
      </div>`;
    }
    return`<div class="pcard" onclick="openDetail(${numId(p.id)})">
      <div class="pcard-img">${imgHtml}${typeOverlay}${refOverlay}${usineOverlay}${resaOverlay}${prixHtml}${photoRef}</div>
      <div class="pcard-body">
        <div class="pcard-name">${esc(formatProductTitle(p.qualite,p.type))}</div>
        ${subtitleHtml}
        ${specsHtml}
        ${addCtrl}
      </div>
    </div>`;
}
// Exposé pour l'append en scroll infini (finding 1/2).
renderCards._card=_renderCatalogueCard;
function renderCards(list){
  const g=document.getElementById('pgrid');
  if(!g)return;
  g.className='pgrid';
  // Structures O(1) reconstruites une fois par render (finding 8).
  _rcCartIds=new Set(cart.map(x=>+x.id));
  _rcGrpByGid=new Map(_groupsList.map(gr=>[gr.gid,gr]));
  // Bobines d'abord, Formats après — pas de séparateur en grille
  const _isPalCard=p=>_estFormat(p);
  const _sorted=[...list].sort((a,b)=>(_isPalCard(a)?1:0)-(_isPalCard(b)?1:0));
  g.innerHTML=_sorted.map(_renderCatalogueCard).join('');
  _updatePager();
  if(typeof _updateAddPageBtn==='function')_updateAddPageBtn();
}

let _viewMode='grid';
let _loadingProducts=true;
const _SVG_GRID='<svg width="14" height="14" viewBox="0 0 14 14" fill="currentColor"><rect x="0" y="0" width="6" height="6" rx="1"/><rect x="8" y="0" width="6" height="6" rx="1"/><rect x="0" y="8" width="6" height="6" rx="1"/><rect x="8" y="8" width="6" height="6" rx="1"/></svg>';
const _SVG_LIST='<svg width="14" height="14" viewBox="0 0 14 14" fill="currentColor"><rect x="0" y="0" width="14" height="2.5" rx="1"/><rect x="0" y="5.5" width="14" height="2.5" rx="1"/><rect x="0" y="11" width="14" height="2.5" rx="1"/></svg>';
const _ICO_TRASH='<svg class="ico-trash" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-2 14a2 2 0 0 1-2 2H9a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>';
function _updateToggleBtn(){
  const html=_viewMode==='list'
    ?_SVG_GRID+'<span>Vue fiche</span>'
    :_SVG_LIST+'<span>Vue liste détaillée</span>';
  document.querySelectorAll('.vt-toggle-btn:not(.add-page-btn):not(.grp-toggle-btn)').forEach(btn=>btn.innerHTML=html);
}
function toggleView(){
  setView(_viewMode==='grid'?'list':'grid');
}
function setView(mode){
  _viewMode=mode;
  _updateToggleBtn();
  const g=document.getElementById('pgrid');
  if(g&&g._lastList){render(g._lastList);}
}

function renderList(list){
  const g=document.getElementById('pgrid');
  if(!g)return;
  g.className='pgrid plist';
  const _renderRow=p=>{
    const _isFabL=p.ref&&/^Photo_FAB/i.test(String(p.ref))&&p.emplacement!=='OUR WAREHOUSE';
    const title=formatProductTitle(p.qualite,p.name);
    const _isSiderunL=p.ref&&/^Photo_DU/i.test(String(p.ref));
    const _listFallback=_isSiderunL?'/img/siderun-sur-demande.png':_isFabL?'/img/fabrication-sur-demande.png':'/img/no-photo.png';
    const thumb=p.image_url
        ?`<img src="${safeUrl(p.image_url)}" alt="${esc(title)}" class="plist-thumb" loading="lazy" width="50" height="40" onerror="this.src='${esc(_listFallback)}'">`
        :`<img src="${esc(_listFallback)}" alt="" class="plist-thumb" width="50" height="40">`;
    // PRIX_MASQUÉ: const price=p.price?`<span class="plist-price">${p.price.toLocaleString('fr-FR')} €/T</span>`:`<span class="plist-price-ask">Sur dem.</span>`;
    const price='';
    const inCart=cart.find(x=>x.id===+p.id);
    const _isGroupL=p._grpCount&&p._grpCount>1;
    const _grpCur=_groupQty[p._grpKey]||1;
    const _grpAllInL=_isGroupL&&(p._grpUnitIds||[]).slice(0,_grpCur).every(id=>cart.find(x=>x.id===+id))&&_grpCur>0;
    const addBtn=_isGroupL
      ?`<button class="plist-add plist-grp-pop${_grpAllInL?' added':''}" data-gid="${esc(p._grpKey||'')}" onclick="event.stopPropagation();_openGrpPopover(${attrJs(p._grpKey)},this)" title="${_grpAllInL?('Retirer'):('Configurer')} ${_grpCur}/${numId(p._grpCount)}" aria-label="${_grpAllInL?('Retirer'):('Configurer quantité')}">${_grpAllInL?_ICO_TRASH:'+'}<span class="plist-grp-badge">${_grpCur}/${numId(p._grpCount)}</span></button>`
      :`<button class="plist-add${inCart?' added':''}" id="ladd-${numId(p.id)}" aria-label="${inCart?('Retirer de la liste'):('Ajouter à la liste')}" onclick="event.stopPropagation();addToCart(${numId(p.id)})">${inCart?_ICO_TRASH:'+'}</button>`;
    const isPalette=_estFormat(p);
    // Dimensions: Bobine → Laize | Ø Diamètre | Mandrin / Palette → Dimensions (laize×long)
    const laize=p.largeur?`${mmToCm(p.largeur)} mm`:'—';
    const dim2=isPalette
      ?(p.longueur?`${mmToCm(p.longueur)} mm`:'—')
      :(p.longueur?`Ø ${mmToCm(p.longueur)} mm`:'—');
    const paletteDims2=isPalette&&(p.largeur||p.longueur)?[p.largeur,p.longueur].filter(Boolean).map(v=>mmToCm(v)).join(' × ')+' mm':null;
    const _grpMan=_isGroupL&&p._grpMandrins&&p._grpMandrins.length?p._grpMandrins.join(' / ')+' mm':null;
    const mandrin=isPalette?null:(_grpMan||(p.noyau?`${p.noyau} mm`:'—'));
    const _poidsTxt=_isGroupL?Math.round(p._grpTotalWeight).toLocaleString('fr-FR')+' kg':(p.poids_net?p.poids_net.toLocaleString('fr-FR')+' kg':'—');
    const _depotTxt=_isGroupL&&p._grpDepots&&p._grpDepots.length>1?p._grpDepots.length+' dépôts':(p.zone||'—');
    const _usineTxt=_isGroupL&&p._grpUsines&&p._grpUsines.length>1?'+'+p._grpUsines.length:(p.usine?String(p.usine).replace(/^REF\s*/i,''):'—');
    const _detClean=p.details?p.details.replace(/[-–—\s]+/g,' ').trim():'';
    const detailsTxt=_detClean&&_detClean.length>3?`<span class="plist-details" title="${esc(p.details)}">${esc(_detClean.substring(0,30))}${_detClean.length>30?'…':''}</span>`:'';
    return`<tr onclick="openDetail(${numId(p.id)})" class="${isPalette?'plist-palette':'plist-bobine'}">
      <td class="plist-td plist-td-add">${addBtn}</td>
      <td class="plist-td plist-thumb-wrap">${thumb}</td>
      <td class="plist-td plist-td-ref plist-col-ref">${_sharedMode&&_isGroupL?`<span class="plist-ref-badge">${numId(p._grpCount)} unités</span>`:(p.ref?`<span class="plist-ref-badge">${esc(p.ref.replace(/^Photo_/i,'').toUpperCase())}</span>`:'—')}</td>
      <td class="plist-td plist-td-title"><strong class="plist-qtitle">${esc(title)}</strong></td>
      <td class="plist-td plist-td-details">${detailsTxt||'—'}</td>
      <td class="plist-td">${esc(p.couleur||'—')}</td>
      <td class="plist-td plist-td-num"><span class="plist-gsm">${p.grammage?esc(p.grammage+' g/m²'):'—'}</span></td>
      ${isPalette&&paletteDims2
        ?`<td class="plist-td plist-td-num" colspan="3">${esc(paletteDims2)}</td>`
        :`<td class="plist-td plist-td-num">${esc(laize)}</td><td class="plist-td plist-td-num">${esc(dim2)}</td><td class="plist-td plist-td-num plist-col-mandrin">${esc(mandrin||'—')}</td>`}
      <td class="plist-td plist-td-num">${esc(_poidsTxt)}</td>
      ${_priceMode?`<td class="plist-td plist-td-num plist-price">${p.price?esc(_ccyNum(p.price*1000)+' '+_ccyUnit()):'—'}</td>`:''}
      <td class="plist-td plist-td-usine plist-col-usine">${esc(_usineTxt)}</td>
    </tr>`;
  };
  const _isPalListItem=p=>_estFormat(p);
  const _bobs=list.filter(p=>!_isPalListItem(p));
  const _pals=list.filter(_isPalListItem);
  // Headers : Bobine → Laize | Diamètre | Mandrin / Palette → Dimensions (colspan 3)
  const _bobHead=`<th>Laize</th><th>Diamètre</th><th class="plist-col-mandrin">Mandrin</th>`;
  const _palHead=`<th colspan="3">Dimensions</th>`;
  const _buildTable=(rowsHtml,head)=>`<table class="plist-table">
    <thead><tr>
      <th class="plist-th-add"></th>
      <th></th>
      <th class="plist-col-ref">Référence</th>
      <th>Qualité</th>
      <th>Détails</th>
      <th>Couleur</th>
      <th>GSM</th>
      ${head}
      <th>Poids (kg)</th>
      ${_priceMode?'<th>Prix</th>':''}
      <th class="plist-col-usine">Réf. usine</th>
    </tr></thead>
    <tbody>${rowsHtml}</tbody>
  </table>`;
  let html='<div style="overflow-x:auto">';
  if(_bobs.length&&_pals.length){
    html+=_buildTable(_bobs.map(_renderRow).join(''),_bobHead);
    html+='<div class="plist-section-title">Formats</div>';
    html+=_buildTable(_pals.map(_renderRow).join(''),_palHead);
  } else if(_bobs.length){
    html+=_buildTable(_bobs.map(_renderRow).join(''),_bobHead);
  } else {
    html+=_buildTable(_pals.map(_renderRow).join(''),_palHead);
  }
  if(_sharedMode){
    const _tkg=list.reduce((s,p)=>s+(+p._grpTotalWeight||+p.poids_net||0),0);
    const _tn=list.reduce((s,p)=>s+(p._grpCount||1),0);
    html+=`<div class="plist-total"><span>TOTAL</span><span>${_tn} produit${_tn>1?'s':''}</span><span>${Math.round(_tkg).toLocaleString('fr-FR')} kg · ${(_tkg/1000).toFixed(1)} T</span></div>`;
  }
  html+='</div>';
  g.innerHTML=html;
  _updatePager();
  if(typeof _updateAddPageBtn==='function')_updateAddPageBtn();
}

function render(list){
  const g=document.getElementById('pgrid');
  if(!g)return;
  g._lastList=list;
  if(!list||list.length===0){
    g.className='pgrid';
    if(_loadingProducts){
      // Perf 20/07 : réserve la hauteur d'une rangée pendant le spinner pour que
      // le passage spinner→cartes ne pousse pas le contenu sous la grille (CLS).
      // La classe est effacée dès le 1er render de cartes (renderCards/renderList
      // réassignent g.className='pgrid'), donc aucune réservation résiduelle.
      g.classList.add('pgrid-loading');
      g.innerHTML=`<div class="empty" style="grid-column:1/-1">
        <div class="load-spin"></div>
        <div class="empty-lbl">Chargement du stock…</div>
      </div>`;
      return;
    }
    // If the query matched filter category names, guide the user to those filters
    const _fi=_lastFilterIntents&&_lastFilterIntents.length?_lastFilterIntents:null;
    const filterHints=_fi?_fi.map((fi,i)=>{
      const idx=FILTER_INTENTS.indexOf(fi);
      return `<button class="btn-empty-reset" style="margin:4px 4px 0;background:var(--ink);color:#fff;" onclick="_applyFilterIntent(FILTER_INTENTS[${idx}])">→ Filtre : ${fi.label}</button>`;
    }).join(''):'';
    g.innerHTML=`<div class="empty" style="grid-column:1/-1">
      <div class="empty-svg">
        <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>
      </div>
      <div class="empty-lbl">${_fi?'Vous cherchez par filtre ?':'Aucun résultat'}</div>
      <div class="empty-sub">${_fi?`"${esc(document.getElementById('search-input')?.value||'')}" correspond à un filtre — utilisez le panneau de gauche.`:'Essayez d\'élargir vos filtres.'}</div>
      ${filterHints}
      <button class="btn-empty-reset" style="margin-top:8px" onclick="resetFilters()">${'↺ Réinitialiser'}</button>
    </div>`;
    return;
  }
  if(_viewMode==='list') renderList(list);
  else if(_sharedMode) renderSharedCards(list);
  else renderCards(list);
}

// Vue client, mode fiches : corps de carte structuré comme l'étiquette
// imprimée par prodi_arrivages (désignation + cases légendées), sans Retirer.
function renderSharedCards(list){
  // (18/08) Vue client = EXACTEMENT les cartes du catalogue (_renderCatalogueCard) :
  // mêmes badges photo, DÉTAIL sous le titre, rangée USINE | PRIX. Seule
  // différence : le bouton de la ligne PRIX = − retrait (_sharedRemove).
  const g=document.getElementById('pgrid');
  if(!g)return;
  g.className='pgrid';
  _rcCartIds=new Set(cart.map(x=>+x.id));
  _rcGrpByGid=new Map((_groupsList||[]).map(gr=>[gr.gid,gr]));
  const sorted=[...list].sort((a,b)=>(_estFormat(a)?1:0)-(_estFormat(b)?1:0));
  g.innerHTML=sorted.map(_renderCatalogueCard).join('');
  _updatePager();
}
// ── RETRAIT direct en vue client (04/08, appareils ÉQUIPE seulement — flag
// prodi_team d'analytics, posé par /?team) : bouton − sur chaque carte, le
// retrait met à jour LE MÊME lien ?s= (UPDATE RLS borné sur cart_ids) — on
// renvoie le même lien au client, rien à régénérer. ──
window._sharedRemove=async function(id){
  const p=_sharedAll.find(x=>+x.id===+id);if(!p)return;
  const refs=new Set((p._grpRefs&&p._grpRefs.length?p._grpRefs:[p.ref]).map(String));
  _sharedAll=_sharedAll.filter(x=>x!==p);
  all=_sharedAll;
  cart=cart.filter(c=>!refs.has(String(c.ref)));
  try{localStorage.setItem('prodi_cart',JSON.stringify(cart));}catch(_){}
  _totalCount=_sharedAll.length;
  _rbarSharedCounts(cart);
  const rbarTons=document.getElementById('rbar-tons');
  if(rbarTons)rbarTons.textContent=(cart.reduce((s,c)=>s+(+c.poids_net||0),0)/1000).toFixed(1);
  if(typeof _filterSharedLocal==='function')_filterSharedLocal();else render(_sharedAll);
  const code=new URLSearchParams(location.search).get('s')||'';
  if(!/^[A-Za-z0-9_]{4,16}$/.test(code))return; // vieux lien ?s=refs inline : rien à mettre à jour
  if(!cart.length){toast('Liste vide — lien inchangé');return;}
  const ids=cart.map(x=>x.ref).filter(Boolean).join(',');
  const res=await sbQ('shared_carts?code=eq.'+encodeURIComponent(code),{method:'PATCH',body:{cart_ids:ids},headers:{'Prefer':'return=minimal'}}).catch(()=>({error:true}));
  if(res&&res.error){console.error('maj lien',res.error);toast('Retiré ici — mais lien NON mis à jour');return;}
  window.prodiTrack?.('panier_partage',{code,nb:cart.length,via:'retrait_vue_client'});
  toast('Retiré — le lien est à jour');
};

const _DET_NO_PHOTO=`<img src="/img/photos-sur-demande.png" alt="Photos sur demande" style="width:100%;height:100%;object-fit:contain;background:#fff;">`;
const _DET_FAB_PHOTO=`<img src="/img/fabrication-sur-demande.png" alt="Fabrication sur demande" style="width:100%;height:100%;object-fit:contain;">`;
function detImgErr(img){img.onerror=null;img.parentNode.innerHTML=_DET_NO_PHOTO;}
let _detIdx=-1;
let _detSource='list'; // 'list' = navigation dans la page courante, 'cart' = dans la sélection
function _detKeyHandler(e){
  if(e.key==='ArrowLeft')navDetail(-1);
  else if(e.key==='ArrowRight')navDetail(1);
  else if(e.key==='Escape')closeDetail();
}
function _detList(){return _detSource==='cart'?cart:all;}
function navDetail(dir){
  const list=_detList();
  if(!list||!list.length)return;
  const next=_detIdx+dir;
  if(next<0||next>=list.length)return;
  openDetail(list[next].id);
}
function _updateDetNav(){
  const prev=document.getElementById('dmod-prev');
  const next=document.getElementById('dmod-next');
  const previn=document.getElementById('dmod-prev-inline');
  const nextin=document.getElementById('dmod-next-inline');
  const len=_detList().length;
  const atStart=_detIdx<=0;
  const atEnd=_detIdx>=len-1;
  if(prev)prev.disabled=atStart;
  if(next)next.disabled=atEnd;
  if(previn)previn.disabled=atStart;
  if(nextin)nextin.disabled=atEnd;
}
async function openDetail(id){
  try{const _tp=(_detList().find(x=>x.id===+id)||all.find(x=>x.id===+id));window.prodiTrack?.('fiche_vue',{ref:_tp?.ref});}catch(e){}
  const list=_detList();
  let idx=list.findIndex(x=>x.id===+id);
  // Source list n'a pas le produit (édge: cart change pendant la session) → fallback sur `all`
  let p=idx>=0?list[idx]:null;
  if(!p){
    idx=all.findIndex(x=>x.id===+id);
    p=idx>=0?all[idx]:null;
    if(p)_detSource='list';
  }
  if(!p) return;
  // Pour le mode cart, hydrater `all` avec les données cart si manquantes (modal lit depuis `all`)
  if(_detSource==='cart'&&!all.find(x=>x.id===+id)){
    const ci=cart.find(x=>x.id===+id);
    if(ci)all.push({id:+id,name:ci.name,ref:ci.ref,type:ci.type,qualite:ci.qualite||null,details:ci.details||null,grammage:ci.grammage||null,largeur:ci.largeur||null,longueur:null,noyau:null,format:ci.format||null,poids_net:ci.poids_net||null,price:ci.price||null,image_url:ci.img||null,couleur:ci.couleur||null,usine:ci.usine||null,zone:ci.zone||null,emplacement:ci.emplacement||null,allee:ci.allee||null});
  }
  _detIdx=idx;
  // cur doit pointer sur l'objet de `all` (avec toutes les colonnes BDD) pour les rendus
  cur = all.find(x=>x.id===+id) || p;
  p = cur;

  // Image
  const mi=document.getElementById('det-main');
  const _detAlt=[p.name,p.grammage?p.grammage+'g/m²':'',p.couleur].filter(Boolean).join(' — ')||'Produit';
  const _isFab=p.ref&&/^Photo_FAB/i.test(String(p.ref))&&p.emplacement!=='OUR WAREHOUSE';
  const _isSiderunD=p.ref&&/^Photo_DU/i.test(String(p.ref));
  const _DET_SIDERUN_PHOTO=`<img src="/img/siderun-sur-demande.png" alt="Siderun" style="width:100%;height:100%;object-fit:contain;">`;
  const _detFallback=_isSiderunD?_DET_SIDERUN_PHOTO:_isFab?_DET_FAB_PHOTO:_DET_NO_PHOTO;
  const _etqFiche=_sharedMode||document.body.classList.contains('apple-view');
  mi.innerHTML=p.image_url?`${_etqFiche?`<div class="det-blur" style="background-image:url('${safeUrl(p.image_url)}')"></div>`:''}<img src="${safeUrl(p.image_url)}" loading="lazy" alt="${esc(_detAlt)}" style="cursor:zoom-in;" onclick="event.stopPropagation();openImageLightbox(this.src,this.alt)" onerror="this.onerror=null;this.parentNode.innerHTML=document.getElementById('det-fallback').innerHTML;">`
    :_detFallback;
  // Store fallback for onerror
  let _dfEl=document.getElementById('det-fallback');if(!_dfEl){_dfEl=document.createElement('div');_dfEl.id='det-fallback';_dfEl.style.display='none';document.body.appendChild(_dfEl);}_dfEl.innerHTML=_detFallback;
  // Usine badge (chip)
  const ub=document.getElementById('det-usine-badge');
  if(ub){
    const _uClean=p.usine?String(p.usine).replace(/^REF\s*/i,''):'';
    if(_uClean){
      const un=document.getElementById('det-usine-num');
      if(un)un.textContent=_uClean;
      ub.style.display='inline-flex';
    } else {
      ub.style.display='none';
    }
  }
  // Badge Réservé (réservation Sage : client + bon de préparation)
  let resab=document.getElementById('det-resa-badge');
  if(!resab){
    resab=document.createElement('div');
    resab.id='det-resa-badge';
    resab.style.cssText='display:none;position:absolute;top:12px;left:12px;z-index:10;background:#b45309;color:#fff;border-radius:8px;padding:6px 12px;font-family:\'DM Sans\',sans-serif;font-size:13px;font-weight:800;letter-spacing:.6px;text-transform:uppercase;';
    document.getElementById('det-ref-badge')?.parentNode?.appendChild(resab);
  }
  if(p.reserve_client){
    resab.textContent='Réservé';
    resab.style.display='block';
  } else {
    resab.style.display='none';
  }
  // Ref badge positionné dans dimg-col (hors dmain pour éviter les conflits)
  const rb=document.getElementById('det-ref-badge');
  if(rb){
    const refTxt=p.ref?String(p.ref).replace(/^Photo_/i,''):'';
    if(refTxt){
      rb.textContent=refTxt+' ⎘';
      rb.style.display='block';
      rb.onclick=()=>{navigator.clipboard.writeText(refTxt).then(()=>{rb.textContent=refTxt+' ✓';setTimeout(()=>{rb.textContent=refTxt+' ⎘';},1500);});};
    } else {
      rb.style.display='none';
    }
  }


  // Badge qualité

  // Ref + nom
  const _detRefEl=document.getElementById('det-ref');if(_detRefEl)_detRefEl.textContent=p.ref?String(p.ref).replace(/^Photo_/i,''):'';
  document.getElementById('det-name').textContent=formatProductTitle(p.qualite,p.name||'Produit');
  const _dwEl=document.getElementById('det-weight');if(_dwEl)_dwEl.textContent=p.poids_net?fmt(p.poids_net):'';
  const _sumEl=document.getElementById('det-summary');
  if(_sumEl){const _s=getProductDetailText(p);_sumEl.textContent=_s;_sumEl.style.display=_s?'block':'none';}

  // Specs grid
  const _typeLabel=p.qualite?formatProductTitle(p.qualite,p.qualite):null;
  const specDefs=[
    {lbl: 'Couleur',   val: p.couleur},
    {lbl: 'Grammage',                             val: p.grammage?p.grammage+' g/m²':null},
    {lbl: (_estFormat(p)&&p.largeur&&p.longueur)?'Dimensions':('Laize'),
     val: (_estFormat(p)&&p.largeur&&p.longueur)?mmToCm(p.largeur)+' × '+mmToCm(p.longueur)+' mm':(p.largeur?mmToCm(p.largeur)+' mm':null)},
    {lbl: 'Longueur', val: _estFormat(p)&&p.largeur&&p.longueur?null:(_estFormat(p)&&p.longueur?mmToCm(p.longueur)+' mm':null)},
    // Bobines : la colonne `longueur` stocke le diamètre (mm) — héritage import Sage.
    {lbl: 'Diamètre',  val: !_estFormat(p)&&p.longueur?'Ø '+mmToCm(p.longueur)+' mm':null},
    {lbl: 'Mandrin',   val: p.noyau?p.noyau+' mm':null},
    {lbl: 'Condit.',  val: p.qualite!=='UMAC'&&p.qualite!=='UMAN'&&!_estFormat(p)?formatLabel(p):null},
    {lbl: 'Dépôt',  val: p.zone||p.emplacement},
    {lbl: 'Zone',                                  val: p.allee||'—', always:true},
    {lbl: 'Type',                                 val: p.qualite||null},
    {lbl: 'Code douanier',                        val: _toCN8(getHsCode(p.qualite,p.grammage,p.format,p.couleur,p.details))},
    {lbl: 'Poids',          val: p.poids_net?fmt(p.poids_net):null},
  ].filter(s=>s.val||s.always);
  if(_etqFiche){
    // Vue client + catalogue Apple : fiche calquée sur l'ÉTIQUETTE imprimée
    // (même ordre, mêmes cases) — le reste (zone, type, code douanier) descend
    // dans un bloc secondaire discret.
    const isPal=_estFormat(p);
    const _uR=p.usine?String(p.usine).replace(/^REF\s*/i,''):null;
    const et=[];
    // (08/08 Ethan) Fiche calquée sur la CARTE : même ordre, même mise en forme —
    // DÉTAIL juste sous le titre (sans label), puis specs, puis USINE | PRIX (+).
    et.push({val:esc(getProductDetailText(p)||'—'),sub:true});
    et.push({lbl:'Grammage',val:p.grammage?esc(p.grammage)+' <small>g/m²</small>':'—',span:isPal?2:0});
    if(isPal){
      et.push({lbl:'Dimensions',val:p.largeur&&p.longueur?esc(mmToCm(Math.min(p.largeur,p.longueur))+' × '+mmToCm(Math.max(p.largeur,p.longueur)))+' <small>mm</small>':(p.largeur?esc(mmToCm(p.largeur))+' <small>mm</small>':'—'),span:2});
    }else{
      et.push({lbl:'Laize',val:p.largeur?esc(mmToCm(p.largeur))+' <small>mm</small>':'—'});
      et.push({lbl:'Diamètre',val:p.longueur?esc(mmToCm(p.longueur))+' <small>mm</small>':'—'});
      et.push({lbl:'Mandrin',val:p.noyau?esc(p.noyau)+' <small>mm</small>':'—'});
    }
    et.push({lbl:'Couleur',val:esc(p.couleur||'—'),span:2});
    et.push({lbl:'Poids net',val:p.poids_net?esc(Math.round(p.poids_net).toLocaleString('fr-FR'))+' <small>kgs</small>':'—',span:2});
    const reste=specDefs.filter(s=>['Zone','Code douanier'].includes(s.lbl));
    // Ligne USINE | PRIX (+) en bas comme la carte. Vue client ?s= : la rangée
    // n'apparaît QUE sur un lien prix (?p=1) — cartes et fiche harmonisées 18/08 ;
    // sans prix, USINE reste en ligne grise discrète. Le + reste catalogue seul.
    if(!_sharedMode||_priceMode){
      const _prixV=(_priceMode&&p.price)?esc(_ccyNum(p.price*1000))+' <small>'+_ccyUnit()+'</small>':'—';
      et.push({lbl:'Usine',val:_uR?esc(_uR):'—',span:2});
      et.push({val:_prixV,span:2,prix:true});
    }else if(_uR){
      reste.splice(1,0,{lbl:'Usine',val:esc(_uR)});
    }
    document.getElementById('det-specs').innerHTML=
      `<div class="det-etq"><div class="det-etq-cell det-etq-title" style="grid-column:1/-1;">${esc(formatProductTitle(p.qualite,p.name||'Produit'))}</div>${et.map(s=>{
        if(s.sub)return `<div class="det-etq-cell det-etq-sub" style="grid-column:1/-1;"><div class="det-etq-val">${s.val}</div></div>`;
        if(s.prix)return `<div class="det-etq-cell det-etq-prix" style="grid-column:span 2;"><div class="det-etq-val det-etq-prixval">${s.val}</div></div>`;
        return `<div class="det-etq-cell"${s.span?' style="grid-column:span '+s.span+';"':''}><div class="det-etq-lbl">${esc(s.lbl)}</div><div class="det-etq-val">${s.val}</div></div>`;
      }).join('')}</div>`+
      (reste.length?`<div class="det-reste">${reste.map(s=>`<span class="det-reste-item"><b>${esc(s.lbl)}</b> ${esc(s.val)}</span>`).join('')}</div>`:'');
    // + rond sur la ligne PRIX (comme la carte) — catalogue seul.
    if(!_sharedMode){
      const prixCell=document.querySelector('#det-specs .det-etq-prix');
      if(prixCell){
        const b=document.createElement('button');
        b.className='sc-add'+(cart.find(x=>x.id===+p.id)?' added':'');
        b.textContent='+';
        b.title='Ajouter / retirer de la liste';
        b.onclick=(e)=>{e.stopPropagation();
          // Lot ×N (mode Groupé) : même popup Quantité que le + de la carte —
          // le + sec ne prenait qu'UNE bobine du lot (Ethan 23/08). Retrait
          // idem carte (tout le lot). Fiche fermée : le popup s'ouvre sur la grille.
          const grp=_groupedMode?(_groupsList||[]).find(g=>g.units&&g.units.length>1&&g.units.some(u=>+u.id===+p.id)):null;
          if(grp){closeDetail();_grpRound(grp.gid);return;}
          addToCart(p.id);b.classList.toggle('added',!!cart.find(x=>x.id===+p.id));
        };
        prixCell.appendChild(b);
      }
    }
  }else{
    document.getElementById('det-specs').innerHTML=specDefs.map(s=>
      `<div class="dspec-item"><div class="dspec-lbl">${esc(s.lbl)}</div><div class="dspec-val">${esc(s.val)}</div></div>`
    ).join('');
  }

  // Détails texte masqué (déjà affiché comme sous-titre)
  const dd=document.getElementById('det-details');
  if(dd)dd.style.display='none';

  const _dpRow=document.getElementById('det-price-row');
  const _dpVal=document.getElementById('det-price-val');
  if(_dpRow&&_dpVal){
    if(_priceMode&&p.price){_dpVal.innerHTML=`<span style="font-size:22px;font-weight:800;color:var(--red)">${_ccyNum(p.price*1000)} ${_ccyUnit()}</span>`;_dpRow.style.display='';}
    else{_dpRow.style.display='none';}
  }
  document.getElementById('det-poids-val').textContent=p.poids_net?fmt(p.poids_net):'—';

  // Reset modal add button state
  const mab=document.getElementById('modal-add-btn');
  if(mab){
    const alreadyIn=cart.find(x=>x.id===+p.id);
    mab.classList.toggle('added',!!alreadyIn);
    mab.innerHTML=alreadyIn?`${_ICO_TRASH} ${'Retirer'}`:('+ Ajouter à la liste');
  }
  _updateDetNav();
  document.getElementById('detail-bg').classList.add('show');
  document.body.style.overflow='hidden';
  document.addEventListener('keydown',_detKeyHandler);
}
function closeDetail(){
  document.getElementById('detail-bg').classList.remove('show');
  document.body.style.overflow='';
  document.removeEventListener('keydown',_detKeyHandler);
  _detIdx=-1;
  _detSource='list'; // reset pour la prochaine ouverture
}
function swImg(el,url){document.getElementById('det-main').innerHTML=`<img src="${safeUrl(url)}">`;document.querySelectorAll('.dthumb').forEach(t=>t.classList.remove('active'));el.classList.add('active');}
function openImageLightbox(src,alt){
  if(!src)return;
  let lb=document.getElementById('img-lightbox');
  if(!lb){
    lb=document.createElement('div');
    lb.id='img-lightbox';
    lb.className='img-lightbox';
    lb.innerHTML=`<button class="ilb-close" aria-label="Fermer">✕</button><img id="ilb-img" alt="">`;
    lb.addEventListener('click',e=>{if(e.target===lb||e.target.classList.contains('ilb-close'))closeImageLightbox();});
    document.body.appendChild(lb);
  }
  document.getElementById('ilb-img').src=src;
  document.getElementById('ilb-img').alt=alt||'';
  lb.classList.add('show');
  document.body.style.overflow='hidden';
  document.addEventListener('keydown',_ilbKey);
}
function closeImageLightbox(){
  const lb=document.getElementById('img-lightbox');
  if(!lb)return;
  lb.classList.remove('show');
  // Si la modale détail est ouverte, ne pas réactiver le scroll body
  if(!document.getElementById('detail-bg')?.classList.contains('show'))document.body.style.overflow='';
  document.removeEventListener('keydown',_ilbKey);
}
function _ilbKey(e){if(e.key==='Escape')closeImageLightbox();}
function openProforma(){if(!cur)return;const _proTitle=formatProductTitle(cur.qualite,cur.name||'Produit');document.getElementById('pf-prod-name').textContent=_proTitle+(cur.ref&&!String(cur.ref).startsWith('Photo_')?' — '+cur.ref:'');document.getElementById('proforma-bg').classList.add('show');}
function closeProforma(){document.getElementById('proforma-bg').classList.remove('show');}
const emailRx=/^[^\s@]+@[^\s@]+\.[^\s@]+$/;
function validateField(fgId,valid,errMsg){
  const fg=document.getElementById(fgId);
  if(!fg)return;
  fg.classList.toggle('has-error',!valid);
  const e=fg.querySelector('.form-err');
  if(e&&errMsg)e.textContent=errMsg;
}
async function sendProforma(){
  // Honeypot anti-bot: hidden field should remain empty for real users.
  // On hit, fake the success path (close modal, swap to success state) so
  // the bot can't distinguish accept vs reject by inspecting the DOM.
  if(document.getElementById('pf-hp')?.value){
    const box=document.querySelector('#proforma-bg .pf-box');
    if(box)box.innerHTML=`<div class="pf-success"><div class="pf-success-ico">✅</div><div class="pf-success-t">Demande envoyée</div><div class="pf-success-s">Nous vous recontacterons rapidement.</div><button class="btn-pf-close" onclick="closeProforma();document.querySelector('#proforma-bg .pf-box').innerHTML=''">Fermer</button></div>`;
    toast('✅ Demande envoyée');
    return;
  }
  const nom=document.getElementById('pf-nom').value.trim();
  const tel=document.getElementById('pf-tel').value.trim();
  let ok=true;
  validateField('fg-pf-nom',!!nom,'Champ requis'); if(!nom)ok=false;
  if(!tel){const e=document.getElementById('fg-pf-tel-err');if(e)e.style.display='block';ok=false;}else{const e=document.getElementById('fg-pf-tel-err');if(e)e.style.display='none';}
  if(!ok)return;
  const msg=document.getElementById('pf-msg').value.trim();
  const btn=document.getElementById('pf-btn');btn.disabled=true;btn.textContent='ENVOI...';
  try{
    await sbQ('proforma_requests',{method:'POST',body:{product_id:cur?.id,nom,telephone:tel,message:msg,statut:'nouveau'},headers:{'Prefer':'return=minimal'}}).catch(()=>{});
    window.prodiTrack?.('devis_envoye',{ref:cur?.ref});
    const box=document.querySelector('#proforma-bg .pf-box');
    if(box)box.innerHTML=`<div class="pf-success"><div class="pf-success-ico">✅</div><div class="pf-success-t">Demande envoyée</div><div class="pf-success-s">Nous vous recontacterons rapidement.</div><button class="btn-pf-close" onclick="closeProforma();document.querySelector('#proforma-bg .pf-box').innerHTML=''">Fermer</button></div>`;
    toast('✅ Demande envoyée');
    try{ _ejsReady().then(()=>emailjs.send(EJS_SVC, EJS_TPL, { from_name:nom, message:`Proforma produit\nProduit: ${cur?.name||''}${cur?.ref?' ('+cur.ref+')':''}\nTél: ${tel}\nMsg: ${msg}` })); }catch(_){}
    ['pf-nom','pf-tel','pf-msg'].forEach(id=>{const el=document.getElementById(id);if(el)el.value='';});
  }catch(err){
    btn.disabled=false;btn.textContent='➤';
    toast('❌ Erreur envoi — réessayez');
    console.error('sendProforma error:',err);
  }
}
function contactWA(){
  if(!cur)return;
  window.prodiTrack?.('whatsapp_click',{via:'fiche',ref:cur.ref||null});
  window.open(`https://wa.me/${WA}?text=${encodeURIComponent(`Bonjour, intéressé par : ${cur.name}${cur.ref?' ('+cur.ref+')':''} — ${fmt(cur.poids_net)} disponibles. Quel est votre prix ?`)}`, '_blank');
}
function resetFilters(){
  try{
    // 1. Clear msd state sets
    Object.keys(msdState).forEach(id=>{ msdState[id].clear(); });

    // 2. Remove selected class from all msd options everywhere
    document.querySelectorAll('.msd-option.selected').forEach(o=>o.classList.remove('selected'));

    // 3. Reset all msd button labels
    ['msd-type','msd-mandrin','msd-couleur','msd-details','msd-format','msd-grammage','msd-laize','msd-usine','msd-diametre','msd-poids'].forEach(id=>{
      // fbar button
      const fbBtn=document.querySelector(`#${id} .fb-msd-btn`);
      if(fbBtn){ const lbl=fbBtn.querySelector('span:first-child');if(lbl)lbl.textContent=msdLabels[id]; }
      // sidebar button
      const sbBtn=document.querySelector(`[data-msd-id="${id}"] .msd-btn-label`);
      if(sbBtn) sbBtn.textContent=msdLabels[id];
      // remove count badges
      document.querySelectorAll(`#${id} .msd-count,[data-msd-id="${id}"] .msd-count`).forEach(b=>{b.textContent='';b.style.display='none';});
    });

    // 4. Reset format pills
    document.querySelectorAll('.fpill.active,.fpill-orig.active,.fpill-stock.active,.fpill-depot.active,.fpill-photo.active,.fb-pill.active').forEach(b=>b.classList.remove('active'));
    _photoFilter='';_formatFilter='';_resaFilter='';
    updateFilterVisibility();
    ['fb-bobine','fb-palette','fb-recyc','fb-fab'].forEach(id=>{const el=document.getElementById(id);if(el)el.classList.remove('active');});

    // 5. Clear all inputs
    ['f-pmin','f-pmax','f-pmin-fb','f-pmax-fb','f-lmin','f-lmax','f-lmin-fb','f-lmax-fb','f-gmin','f-gmax',
     'f-lmin-sb','f-lmax-sb','f-longmin-sb','f-longmax-sb','f-longmin','f-longmax',
     'f-wmin','f-wmax','f-wmin-mob','f-wmax-mob',
     'f-zone-num','f-zone-let','f-zone-num-mob','f-zone-let-mob',
     'f-gmin-sb','f-gmax-sb','f-pmin-sb','f-pmax-sb',
     'f-gmin-mob','f-gmax-mob','f-lmin-mob','f-lmax-mob','f-pmin-mob','f-pmax-mob',
     'f-usine','f-refmin','f-refmax','f-refmin-mob','f-refmax-mob','f-refmin-top','f-refmax-top',
     'search-input','search-input-mob'].forEach(id=>{const el=document.getElementById(id);if(el)el.value='';});

    // 6. Clear chips & reset UI
    const fc=document.getElementById('filter-chips');if(fc)fc.innerHTML='';
    const ac=document.getElementById('active-chips');if(ac)ac.innerHTML='';
    const rr=document.getElementById('rbar-reset');if(rr)rr.style.display='none';

    // 7. Reset fl-count badges in sidebar
    document.querySelectorAll('.fl-count').forEach(el=>{el.textContent='0';el.style.display='none';});

    // 8. Reset dual range sliders
    drsResetAll();

    // 9. Reload products
    currentPage=1;
    filterProducts();
  } catch(e){ console.error('resetFilters error:',e); filterProducts(); }
}
function toggleMobFilters(){
  const panel=document.getElementById('filters-panel');
  const arrow=document.getElementById('mob-filter-arrow');
  panel.classList.toggle('open');
  arrow.textContent=panel.classList.contains('open')?'▴':'▾';
}

// ── PANIER (DRAWER) ──
// La liste repart de ZÉRO à chaque chargement (17/07) — plus de restauration
// depuis le cache. Le lien partagé (?s=) la remplit juste après, et les écritures
// localStorage restent (état interne de la session en cours).
let cart=[];
try{localStorage.removeItem('prodi_cart');}catch(_){/* stockage indisponible */}
// Au boot : liste vide → masque le bouton header (voir updateCartBadge).
document.addEventListener('DOMContentLoaded',()=>updateCartBadge());

function updateCartBadge(){
  const badge=document.getElementById('cart-badge');
  if(cart.length>0){badge.textContent=cart.length;badge.classList.add('show');}
  else{badge.classList.remove('show');}
  // Header (21/07) : liste vide = PAS de bouton ; sélection en cours = icône
  // PARTAGER + badge, et le clic OUVRE DIRECTEMENT le lien client (plus de
  // tiroir). En vue client (?s=) le bouton est réutilisé « Télécharger liste »
  // par loadSharedQuote → on n'y touche pas.
  const btn=document.getElementById('cart-btn');
  if(btn&&!(typeof _sharedMode!=='undefined'&&_sharedMode)){
    // 17/08 (Ethan) : « Ma Liste » TOUJOURS visible dans le header, clic = tiroir
    // (le Partager vit dans le tiroir ; l'ancien partage direct est annulé).
    const txt=btn.querySelector('.btn-panier-txt');
    const ico=btn.querySelector('.cart-share-ico');
    if(ico)ico.style.display='none';
    if(txt){txt.style.display='';txt.textContent='Ma Liste';}
    btn.style.removeProperty('display');
    btn.title='Ma Liste';
    btn.onclick=()=>openCartDrawer();
    const clr=document.getElementById('cart-clear-btn');
    if(clr)clr.style.display=cart.length>0?'inline-flex':'none';
  }
}
// Poubelle du header (21/07) : vider la liste en 2 temps (anti-fausse manip).
function _clearList(btn){
  if(btn.dataset.arm==='1'){
    btn.dataset.arm='';btn.innerHTML=btn.dataset.ico;btn.style.color='#6e6e73';btn.style.borderColor='#d2d2d7';
    cart=[];try{localStorage.removeItem('prodi_cart');}catch(_){}
    updateCartBadge();renderDrawer();
    if(typeof _updateAddPageBtn==='function')_updateAddPageBtn();
    const pg=document.getElementById('pgrid');render((pg&&pg._lastList)||all);
    toast('Liste vidée');
    return;
  }
  btn.dataset.ico=btn.innerHTML;
  btn.dataset.arm='1';btn.textContent='Sûr ?';btn.style.color='#e11d48';btn.style.borderColor='#e11d48';
  setTimeout(()=>{if(btn.dataset.arm==='1'){btn.dataset.arm='';btn.innerHTML=btn.dataset.ico;btn.style.color='#6e6e73';btn.style.borderColor='#d2d2d7';}},2600);
}

function toggleSelectAll(btn){
  const currentList=document.getElementById('pgrid')?._lastList||[];
  const allAdded=currentList.every(p=>cart.find(x=>x.id===+p.id));
  if(allAdded){
    // Remove all
    currentList.forEach(p=>{
      cart=cart.filter(x=>x.id!==+p.id);
      const lb=document.getElementById('ladd-'+p.id);
      if(lb){lb.classList.remove('added');lb.textContent='+';}
      const cb=document.getElementById('cadd-'+p.id);
      if(cb){cb.classList.remove('added');cb.innerHTML=`<span class="cart-icon">+</span><span class="cart-check">✓</span> ${'Ajouter'}`;}
    });
    localStorage.setItem('prodi_cart',JSON.stringify(cart));
    updateCartBadge();renderDrawer();
    btn.textContent='+';
    toast('🗑️ Tout retiré');
  } else {
    // Add all not yet in cart
    currentList.forEach(p=>{
      if(!cart.find(x=>x.id===+p.id)){
        cart.push({id:p.id,name:p.name,ref:p.ref,type:p.type,qualite:p.qualite||null,details:p.details||null,grammage:p.grammage,largeur:p.largeur,format:p.format,poids_net:p.poids_net,price:p.price||null,img:p.image_url||null,couleur:p.couleur||null,usine:p.usine||null,zone:p.zone||null,emplacement:p.emplacement||null,allee:p.allee||null,reserve_client:p.reserve_client||null});
        const lb=document.getElementById('ladd-'+p.id);
        if(lb){lb.classList.add('added');lb.innerHTML=_ICO_TRASH;}
        const cb=document.getElementById('cadd-'+p.id);
        if(cb){cb.classList.add('added');cb.innerHTML=`${_ICO_TRASH} Retirer`;}
      }
    });
    localStorage.setItem('prodi_cart',JSON.stringify(cart));
    updateCartBadge();renderDrawer();
    btn.textContent='−';
    toast('✅ Tout ajouté');
  }
}

// ─── Helpers mode regroupé ───
function _grpFindOnPage(gid){
  // gid → produit "proto" sur la page courante (avec _grpUnitIds, _grpCount, etc.)
  return all.find(x=>x._grpKey===gid);
}
function _grpComputeWeight(gid,qty){
  const grp=_groupsList.find(g=>g.gid===gid);
  if(!grp)return 0;
  return grp.units.slice(0,Math.max(1,qty|0)).reduce((s,u)=>s+(+u.poids_net||0),0);
}
function _grpQtySet(gid,v){
  const p=_grpFindOnPage(gid);if(!p)return;
  let n=parseInt(v,10);if(!Number.isFinite(n)||n<1)n=1;
  if(n>p._grpCount)n=p._grpCount;
  _groupQty[gid]=n;
  const sel=`[data-gid="${CSS.escape(gid)}"]`;
  // sync inputs (cards + lignes peuvent coexister si on switch view)
  document.querySelectorAll(`${sel} input.grp-qty-input,${sel} input.plist-grp-val`).forEach(i=>{if(+i.value!==n)i.value=n;});
  document.querySelectorAll(`${sel} .plist-grp-badge`).forEach(el=>{const m=el.textContent.split('/')[1]||'';el.textContent=`${n}/${m}`;});
  // poids live = somme des N premières unités (priorisées photo)
  const w=_grpComputeWeight(gid,n);
  const wTxt=Math.round(w).toLocaleString('fr-FR');
  document.querySelectorAll(`${sel} .grp-weight`).forEach(el=>el.textContent=wTxt);
  // libellé + état "added" en fonction de la nouvelle qty
  const grp=_groupsList.find(g=>g.gid===gid);
  const tIds=grp?grp.units.slice(0,n).map(u=>u.id):[];
  const allIn=tIds.length>0&&tIds.every(id=>cart.find(x=>x.id===+id));
  document.querySelectorAll(`${sel} .grp-add-btn`).forEach(b=>{
    if(b.classList.contains('plist-grp-add'))return;
    b.classList.toggle('added',allIn);
    b.innerHTML=allIn?`${_ICO_TRASH} Retirer ${n}`:`+ Ajouter ${n}`;
  });
  document.querySelectorAll(`${sel} .plist-grp-add`).forEach(b=>{
    b.classList.toggle('added',allIn);
    b.innerHTML=allIn?_ICO_TRASH:'+';
    const lbl=`${allIn?('Retirer'):('Ajouter')} ${n}`;
    b.title=lbl; b.setAttribute('aria-label',lbl);
  });
  document.querySelectorAll(`.plist-grp-pop${sel}`).forEach(b=>{
    b.classList.toggle('added',allIn);
    b.innerHTML=`${allIn?_ICO_TRASH:'+'}<span class="plist-grp-badge">${n}/${p._grpCount}</span>`;
    const lbl=`${allIn?('Retirer'):('Configurer')} ${n}/${p._grpCount}`;
    b.title=lbl;
  });
  // état des boutons − et + (grid + list)
  document.querySelectorAll(`${sel} .grp-qty-btn-minus`).forEach(b=>b.disabled=(n<=1));
  document.querySelectorAll(`${sel} .grp-qty-btn-plus`).forEach(b=>b.disabled=(n>=p._grpCount));
  document.querySelectorAll(`${sel} .plist-grp-stepper .plist-grp-step:first-of-type`).forEach(b=>b.disabled=(n<=1));
  document.querySelectorAll(`${sel} .plist-grp-stepper .plist-grp-step:last-of-type`).forEach(b=>b.disabled=(n>=p._grpCount));
}
function _grpQtyAdj(gid,delta){
  const p=_grpFindOnPage(gid);if(!p)return;
  const cur=_groupQty[gid]||1;
  _grpQtySet(gid,cur+delta);
}
// + de carte groupée : tout le lot d'un coup, sans sélecteur de quantité (18/07)
function _grpAddAll(gid){
  const g=_groupsList.find(x=>x.gid===gid);
  if(g)_groupQty[gid]=g.units.length;
  addGroupToCart(gid);
  const pg=document.getElementById('pgrid');
  render((pg&&pg._lastList)||all); // rafraîchit l'état + / ✓ des cartes
}
function addGroupToCart(gid){
  const p=_grpFindOnPage(gid);
  if(!p){toast('Groupe introuvable');return;}
  const qty=Math.max(1,Math.min(p._grpCount,_groupQty[gid]||1));
  const grp=_groupsList.find(g=>g.gid===gid);
  if(!grp){toast('Groupe introuvable');return;}
  const targetIds=grp.units.slice(0,qty).map(u=>u.id);
  const allIn=targetIds.length>0&&targetIds.every(id=>cart.find(x=>x.id===+id));
  if(allIn){
    // Toggle OFF — retire tous les produits du groupe (qty courante)
    const ids=new Set(targetIds);
    cart=cart.filter(x=>!ids.has(+x.id));
    localStorage.setItem('prodi_cart',JSON.stringify(cart));
    updateCartBadge();renderDrawer();
    _grpRefreshAddedState(gid,false);
    toast(`${targetIds.length} produit${targetIds.length>1?'s':''} retiré${targetIds.length>1?'s':''}`);
    return;
  }
  let added=0;
  targetIds.forEach(id=>{
    if(cart.find(x=>x.id===+id))return;
    const u=grp.units.find(x=>x.id===id);if(!u)return;
    cart.push({id:u.id,name:u.name,ref:u.ref,type:u.type,qualite:u.qualite||null,details:u.details||null,grammage:u.grammage,largeur:u.largeur,format:u.format,poids_net:u.poids_net,price:u.price||null,img:u.image_url||null,couleur:u.couleur||null,usine:u.usine||null,zone:u.zone||null,emplacement:u.emplacement||null,allee:u.allee||null});
    added++;
  });
  localStorage.setItem('prodi_cart',JSON.stringify(cart));
  updateCartBadge();renderDrawer();
  _grpRefreshAddedState(gid,true);
  if(added)toast(`${added} produit${added>1?'s':''} ajouté${added>1?'s':''} à la liste`);
  else toast('Déjà ajoutés');
}
function _grpRefreshAddedState(gid,isAdded){
  const sel=`[data-gid="${CSS.escape(gid)}"]`;
  // Bouton list view legacy (plist-grp-add)
  document.querySelectorAll(`${sel} .plist-grp-add`).forEach(b=>{
    b.classList.toggle('added',isAdded);
    b.innerHTML=isAdded?_ICO_TRASH:'+';
  });
  // Bouton list view compact (popover trigger) — data-gid est sur le bouton lui-même
  document.querySelectorAll(`.plist-grp-pop${sel}`).forEach(b=>{
    b.classList.toggle('added',isAdded);
    const n=_groupQty[gid]||1;
    const grp=_groupsList.find(g=>g.gid===gid);
    const max=grp?grp.units.length:1;
    b.innerHTML=`${isAdded?_ICO_TRASH:'+'}<span class="plist-grp-badge">${n}/${max}</span>`;
  });
  // Bouton grid card view (avec texte "+ Ajouter N")
  document.querySelectorAll(`${sel} .grp-add-btn`).forEach(b=>{
    b.classList.toggle('added',isAdded);
    const n=_groupQty[gid]||1;
    if(b.classList.contains('plist-grp-add'))return;
    b.innerHTML=isAdded?`${_ICO_TRASH} Retirer ${n}`:`+ Ajouter ${n}`;
  });
}

// ── Popover stepper pour produits groupés en vue liste ──
function _closeGrpPopover(){
  const p=document.getElementById('plist-grp-popover');
  if(p)p.remove();
  document.removeEventListener('click',_onGrpPopoverOutside,true);
  document.removeEventListener('keydown',_onGrpPopoverKey,true);
}
function _onGrpPopoverOutside(e){
  const pop=document.getElementById('plist-grp-popover');
  if(pop&&!pop.contains(e.target))_closeGrpPopover();
}
function _onGrpPopoverKey(e){if(e.key==='Escape')_closeGrpPopover();}
function _openGrpPopover(gid,anchor){
  _closeGrpPopover();
  const grp=_groupsList.find(g=>g.gid===gid);
  if(!grp){toast('Groupe introuvable');return;}
  const cur=Math.max(1,Math.min(grp.units.length,_groupQty[gid]||1));
  const max=grp.units.length;
  const targetIds=grp.units.slice(0,cur).map(u=>u.id);
  const allIn=targetIds.length>0&&targetIds.every(id=>cart.find(x=>x.id===+id));
  const w=_grpComputeWeight(gid,cur);
  const wTxt=Math.round(w).toLocaleString('fr-FR');
  const pop=document.createElement('div');
  pop.id='plist-grp-popover';
  pop.className='plist-grp-popover';
  pop.setAttribute('data-gid',gid);
  pop.onclick=e=>e.stopPropagation();
  pop.innerHTML=`
    <div class="plist-grp-popover-hd">Quantité — <span class="plist-grp-popover-w">${wTxt} kg</span></div>
    <div class="plist-grp-popover-row">
      <div class="plist-grp-stepper">
        <button class="plist-grp-step" onclick="_grpQtyAdj(${attrJs(gid)},-1);_refreshGrpPopover(${attrJs(gid)})"${cur<=1?' disabled':''} aria-label="−1">−</button>
        <span class="plist-grp-valwrap">
          <input type="number" class="plist-grp-val" min="1" max="${numId(max)}" value="${cur}" oninput="_grpQtySet(${attrJs(gid)},this.value);_refreshGrpPopover(${attrJs(gid)})" aria-label="${'Quantité'}">
          <span class="plist-grp-max">/${numId(max)}</span>
        </span>
        <button class="plist-grp-step" onclick="_grpQtyAdj(${attrJs(gid)},1);_refreshGrpPopover(${attrJs(gid)})"${cur>=max?' disabled':''} aria-label="+1">+</button>
      </div>
      <button class="plist-grp-popover-add${allIn?' added':''}" onclick="addGroupToCart(${attrJs(gid)});_closeGrpPopover();">${allIn?`${_ICO_TRASH} Retirer`:'+ Ajouter'}</button>
    </div>`;
  document.body.appendChild(pop);
  const _z=_zf();
  const r=anchor.getBoundingClientRect();
  const popW=pop.offsetWidth*_z;
  const popH=pop.offsetHeight*_z;
  let left=r.left;
  if(left+popW>window.innerWidth-8)left=window.innerWidth-popW-8;
  let top=r.bottom+6;
  if(top+popH>window.innerHeight-8)top=r.top-popH-6;
  pop.style.left=(Math.max(8,left)/_z)+'px';
  pop.style.top=(Math.max(8,top)/_z)+'px';
  setTimeout(()=>{
    document.addEventListener('click',_onGrpPopoverOutside,true);
    document.addEventListener('keydown',_onGrpPopoverKey,true);
  },0);
}
function _refreshGrpPopover(gid){
  const pop=document.getElementById('plist-grp-popover');
  if(!pop||pop.getAttribute('data-gid')!==gid)return;
  const grp=_groupsList.find(g=>g.gid===gid);
  if(!grp)return;
  const cur=Math.max(1,Math.min(grp.units.length,_groupQty[gid]||1));
  const max=grp.units.length;
  const targetIds=grp.units.slice(0,cur).map(u=>u.id);
  const allIn=targetIds.length>0&&targetIds.every(id=>cart.find(x=>x.id===+id));
  const w=_grpComputeWeight(gid,cur);
  const wEl=pop.querySelector('.plist-grp-popover-w');
  if(wEl)wEl.textContent=Math.round(w).toLocaleString('fr-FR')+' kg';
  const addBtn=pop.querySelector('.plist-grp-popover-add');
  if(addBtn){
    addBtn.classList.toggle('added',allIn);
    addBtn.innerHTML=allIn?`${_ICO_TRASH} Retirer`:'+ Ajouter';
  }
  pop.querySelectorAll('.plist-grp-step').forEach((b,i)=>{
    b.disabled=(i===0&&cur<=1)||(i===1&&cur>=max);
  });
}

// `productObj` optionnel : produit déjà résolu hors de la vue courante (ex.
// scanner QR → produit trouvé dans le cache complet mais absent de `all`).
// Sans lui, un produit hors vue faisait un return silencieux alors que le
// scanner affichait "Ajouté".
function addToCart(id,productObj){
  const p=productObj||all.find(x=>x.id===+id);if(!p)return;
  const alreadyIn=cart.find(x=>x.id===+id);
  if(!alreadyIn)window.prodiTrack?.('panier_ajout',{ref:p.ref});
  const mab=document.getElementById('modal-add-btn');
  if(alreadyIn){
    // Toggle OFF — remove from cart
    removeFromCart(id);
    const caddBtn=document.getElementById('cadd-'+id);
    if(caddBtn){caddBtn.classList.remove('added');caddBtn.textContent='+ Ajouter';}
    const laddBtn=document.getElementById('ladd-'+id);
    if(laddBtn){laddBtn.classList.remove('added');laddBtn.textContent='+';}
    if(mab){mab.classList.remove('added');mab.innerHTML='+ Ajouter à la liste';}
    toast('🗑️ Retiré de la liste');
    return;
  }
  cart.push({id:p.id,name:p.name,ref:p.ref,type:p.type,qualite:p.qualite||null,details:p.details||null,grammage:p.grammage,largeur:p.largeur,format:p.format,poids_net:p.poids_net,price:p.price||null,img:p.image_url||null,couleur:p.couleur||null,usine:p.usine||null,zone:p.zone||null,emplacement:p.emplacement||null,allee:p.allee||null,reserve_client:p.reserve_client||null});
  localStorage.setItem('prodi_cart',JSON.stringify(cart));
  updateCartBadge();
  const caddBtn=document.getElementById('cadd-'+id);
  if(caddBtn){caddBtn.classList.add('added');caddBtn.innerHTML=`${_ICO_TRASH} Retirer`;}
  const laddBtn=document.getElementById('ladd-'+id);
  if(laddBtn){laddBtn.classList.add('added');laddBtn.innerHTML=_ICO_TRASH;}
  if(mab){mab.classList.add('added');mab.innerHTML=`${_ICO_TRASH} ${'Retirer'}`;}
  toast('✅ Ajouté à la liste !');
  renderDrawer();
}

function addPageToCart(){
  const g=document.getElementById('pgrid');
  const list=g&&g._lastList;
  if(!list||!list.length){toast('Aucun produit sur cette page');return;}
  // Build target unit IDs: for grouped cards use selected qty of units, otherwise the single id
  const targets=[];
  list.forEach(p=>{
    if(p._grpKey){
      const grp=_groupsList.find(g=>g.gid===p._grpKey);
      if(!grp)return;
      const qty=Math.max(1,Math.min(p._grpCount,_groupQty[p._grpKey]||1));
      grp.units.slice(0,qty).forEach(u=>targets.push(u));
    } else {
      targets.push(p);
    }
  });
  if(!targets.length){toast('Aucun produit sur cette page');return;}
  const allIn=targets.every(u=>cart.find(x=>x.id===+u.id));
  if(allIn){
    const ids=new Set(targets.map(u=>+u.id));
    const removed=ids.size;
    cart=cart.filter(x=>!ids.has(+x.id));
    localStorage.setItem('prodi_cart',JSON.stringify(cart));
    updateCartBadge();
    list.forEach(p=>{
      const c=document.getElementById('cadd-'+p.id);
      if(c){c.classList.remove('added');c.textContent='+ Ajouter';}
      const l=document.getElementById('ladd-'+p.id);
      if(l){l.classList.remove('added');l.textContent='+';}
      if(p._grpKey)_grpRefreshAddedState(p._grpKey,false);
    });
    toast(`${removed} produit${removed>1?'s':''} retiré${removed>1?'s':''} de la liste`);
    renderDrawer();_updateAddPageBtn();
    return;
  }
  let added=0;
  targets.forEach(u=>{
    if(cart.find(x=>x.id===+u.id))return;
    cart.push({id:u.id,name:u.name,ref:u.ref,type:u.type,qualite:u.qualite||null,details:u.details||null,grammage:u.grammage,largeur:u.largeur,format:u.format,poids_net:u.poids_net,price:u.price||null,img:u.image_url||null,couleur:u.couleur||null,usine:u.usine||null,zone:u.zone||null,emplacement:u.emplacement||null,allee:u.allee||null});
    added++;
  });
  localStorage.setItem('prodi_cart',JSON.stringify(cart));
  updateCartBadge();
  list.forEach(p=>{
    const c=document.getElementById('cadd-'+p.id);
    if(c){c.classList.add('added');c.innerHTML=`${_ICO_TRASH} Retirer`;}
    const l=document.getElementById('ladd-'+p.id);
    if(l){l.classList.add('added');l.innerHTML=_ICO_TRASH;}
    if(p._grpKey)_grpRefreshAddedState(p._grpKey,true);
  });
  toast(`${added} produit${added>1?'s':''} ajouté${added>1?'s':''} à la liste`);
  renderDrawer();_updateAddPageBtn();
}

function _updateAddPageBtn(){
  const g=document.getElementById('pgrid');
  const list=g&&g._lastList;
  document.querySelectorAll('.add-page-btn').forEach(btn=>{
    const allIn=list&&list.length&&list.every(p=>{
      if(p._grpKey){
        const grp=_groupsList.find(g=>g.gid===p._grpKey);
        if(!grp)return false;
        const qty=Math.max(1,Math.min(p._grpCount,_groupQty[p._grpKey]||1));
        return grp.units.slice(0,qty).every(u=>cart.find(x=>x.id===+u.id));
      }
      return cart.find(x=>x.id===+p.id);
    });
    btn.classList.toggle('all-in',!!allIn);
    btn.title=allIn?'Retirer tous les produits de la page de la liste':'Ajouter tous les produits de la page à la liste';
  });
}

function removeFromCart(id){
  cart=cart.filter(x=>x.id!==+id);
  localStorage.setItem('prodi_cart',JSON.stringify(cart));
  updateCartBadge();renderDrawer();
  // Désélectionner le bouton dans la grille
  const cb=document.getElementById('cadd-'+id);
  if(cb){cb.classList.remove('added');cb.textContent='+ Ajouter';}
  const lb=document.getElementById('ladd-'+id);
  if(lb){lb.classList.remove('added');lb.textContent='+';}
  const mab=document.getElementById('modal-add-btn');
  if(mab&&_detIdx>=0&&all[_detIdx]&&+all[_detIdx].id===+id){
    mab.classList.remove('added');
    mab.innerHTML='+ Ajouter à la liste';
  }
}

// ── SHARE CART ──
function _shortCode(){
  return Array.from(crypto.getRandomValues(new Uint8Array(6)),b=>'0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ'[b%62]).join('');
}
// ─── Import de références depuis un DOCUMENT (BL, préparation de livraison…) ───
// Tout se passe dans le navigateur : extraction du texte (pdf.js / SheetJS /
// JSZip pour docx, lecture brute sinon), détection des réfs (6 chiffres, codes
// DU/FAB), puis le flux existant _doImportRefs() fait le matching catalogue.
const _LAZY_LIBS={
  pdf:{src:'https://cdn.jsdelivr.net/npm/pdfjs-dist@3.11.174/build/pdf.min.js',sri:'sha384-/1qUCSGwTur9vjf/z9lmu/eCUYbpOTgSjmpbMQZ1/CtX2v/WcAIKqRv+U1DUCG6e'},
  xlsx:{src:'https://cdn.jsdelivr.net/npm/xlsx@0.18.5/dist/xlsx.full.min.js',sri:'sha384-vtjasyidUo0kW94K5MXDXntzOJpQgBKXmE7e2Ga4LG0skTTLeBi97eFAXsqewJjw'},
  jszip:{src:'https://cdn.jsdelivr.net/npm/jszip@3.10.1/dist/jszip.min.js',sri:'sha384-+mbV2IY1Zk/X1p/nWllGySJSUN8uMs+gUAN10Or95UBH0fpj6GfKgPmgC5EXieXG'},
};
const _loadedLibs={};
function _loadScript(key){
  if(_loadedLibs[key])return _loadedLibs[key];
  _loadedLibs[key]=new Promise((resolve,reject)=>{
    const s=document.createElement('script');
    s.src=_LAZY_LIBS[key].src;
    s.integrity=_LAZY_LIBS[key].sri;
    s.crossOrigin='anonymous';
    s.onload=resolve;
    s.onerror=()=>reject(new Error('chargement '+key));
    document.head.appendChild(s);
  });
  return _loadedLibs[key];
}

async function _extractTextFromFile(file){
  const name=(file.name||'').toLowerCase();
  if(name.endsWith('.pdf')){
    await _loadScript('pdf');
    const lib=window.pdfjsLib||window['pdfjs-dist/build/pdf'];
    // Worker cross-origin impossible (same-origin policy) → pdf.js bascule
    // tout seul en "fake worker" sur le thread principal. OK pour un BL.
    lib.GlobalWorkerOptions.workerSrc='https://cdn.jsdelivr.net/npm/pdfjs-dist@3.11.174/build/pdf.worker.min.js';
    const doc=await lib.getDocument({data:await file.arrayBuffer()}).promise;
    let text='';
    for(let i=1;i<=doc.numPages;i++){
      const page=await doc.getPage(i);
      const content=await page.getTextContent();
      text+=content.items.map(it=>it.str).join(' ')+'\n';
    }
    return text;
  }
  if(name.endsWith('.xlsx')||name.endsWith('.xls')){
    await _loadScript('xlsx');
    // cellStyles:true charge l'état masqué des lignes ; skipHidden ne lit que
    // ce que l'utilisateur VOIT dans Excel (21/07 : un fichier ZINIAS traînait
    // 307 lignes masquées d'un vieux tableau → 328 réfs fantômes importées).
    const wb=window.XLSX.read(await file.arrayBuffer(),{type:'array',cellStyles:true});
    // FS '\n' = une CELLULE par ligne : un CSV virgule collait la réf au champ
    // suivant (« 993076,548 ») et la garde anti-décimales la rejetait.
    return wb.SheetNames.map(n=>window.XLSX.utils.sheet_to_csv(wb.Sheets[n],{FS:'\n',skipHidden:true})).join('\n');
  }
  if(name.endsWith('.docx')){
    await _loadScript('jszip');
    const zip=await window.JSZip.loadAsync(await file.arrayBuffer());
    const xml=await zip.file('word/document.xml')?.async('string');
    return (xml||'').replace(/<[^>]+>/g,' ');
  }
  return file.text(); // txt, csv, et tout format texte
}

// ── PRODIX v2 : agent CONVERSATIONNEL (17/07) ───────────────────────────────
// Chat multi-tours : PRODIX pose des questions pour affiner (grammage, format,
// tonnage) en s'appuyant sur le stock live, puis {"type":"offre"} → la liste
// se remplit sans fermer la conversation (on peut continuer à affiner).
const PRODIX_API='https://prodi-arrivages.vercel.app/api/prodix-offre';
let _pxHist=[]; // [{role,content}] — mémoire de la conversation en cours
function openProdix(){
  const existing=document.getElementById('prodix-bg');
  if(existing){existing.remove();return;}
  // Panneau latéral plein hauteur (façon ChatGPT) — pas de popup, la page reste visible.
  const d=document.createElement('div');
  d.id='prodix-bg';
  d.style.cssText='position:fixed;top:0;right:0;bottom:0;width:min(460px,100vw);background:#fff;z-index:9000;display:flex;flex-direction:column;box-shadow:-10px 0 34px rgba(0,0,0,.18);transform:translateX(100%);transition:transform .28s cubic-bezier(.4,0,.2,1);';
  d.innerHTML=`
    <div style="padding:8px 12px;display:flex;justify-content:flex-start;flex-shrink:0;">
      <button onclick="document.getElementById('prodix-bg').remove()" style="background:#e8e8ed;border:none;font-size:15px;cursor:pointer;color:#6e6e73;width:34px;height:34px;border-radius:999px;display:flex;align-items:center;justify-content:center;padding:0;">✕</button>
    </div>
    <div id="prodix-chat" style="flex:1;overflow-y:auto;padding:16px 18px;display:flex;flex-direction:column;gap:10px;"></div>
    <div style="padding:12px 14px 14px;border-top:1px solid #eee;display:flex;gap:8px;flex-shrink:0;background:#fff;">
      <input id="prodix-input" type="text" placeholder="Demande-moi une offre…" style="flex:1;padding:13px 18px;border:1.5px solid #d2d2d7;border-radius:999px;font-size:15px;font-family:'DM Sans',sans-serif;outline:none;" onkeydown="if(event.key==='Enter')_pxSend()">
      <button onclick="_pxSend()" id="prodix-btn" style="width:48px;flex-shrink:0;background:#1d1d1f;color:#fff;border:none;border-radius:999px;font-family:'DM Sans',sans-serif;font-size:16px;cursor:pointer;">➤</button>
    </div>`;
  document.body.appendChild(d);
  requestAnimationFrame(()=>{d.style.transform='translateX(0)';});
  if(_pxHist.length){
    _pxHist.forEach(m=>_pxBulle(m.role,m.content));
  }else{
    // Accueil centré façon ChatGPT : gros titre + suggestions empilées.
    const empty=document.createElement('div');
    empty.id='prodix-empty';
    empty.style.cssText='flex:1;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:18px;text-align:center;padding:10px;';
    empty.innerHTML=`
      <img src="/img/prodix.png?v=3" alt="PRODIX" style="width:150px;height:150px;object-fit:contain;">
      <div style="font-size:19px;font-weight:700;color:#1a1a1a;">Bonjour ! Comment puis-je vous aider ?</div>`;
    const sug=document.createElement('div');
    sug.id='prodix-sug';
    sug.style.cssText='display:flex;flex-direction:column;gap:8px;width:100%;flex-shrink:0;padding-top:6px;';
    const lbl=document.createElement('div');
    lbl.textContent='Par exemple :';
    lbl.style.cssText='font-size:12px;color:#6e6e73;padding-left:4px;';
    sug.appendChild(lbl);
    ["Je veux un container d'offset 80 g en bobine","Fais-moi une offre de papier SBS","Il me faut 10 tonnes de kraft brun","Fais-moi un mix de qualités avec des anciennes réfs, 20 tonnes","Je cherche du couché 2 faces en palette, max 600 €/T"].forEach(t=>{
      const b=document.createElement('button');
      b.textContent=t;
      b.style.cssText='padding:11px 15px;border:none;border-radius:14px;background:#f5f5f7;font-size:13.5px;color:#1d1d1f;cursor:pointer;font-family:inherit;text-align:left;transition:background .15s;';
      b.onmouseover=()=>{b.style.background='#e8e8ed';};
      b.onmouseout=()=>{b.style.background='#f5f5f7';};
      b.onclick=()=>{const i=document.getElementById('prodix-input');if(i){i.value=t;_pxSend();}};
      sug.appendChild(b);
    });
    const chat=document.getElementById('prodix-chat');
    chat.appendChild(empty);
    chat.appendChild(sug);
  }
  document.getElementById('prodix-input').focus();
  window.prodiTrack?.('prodix_open',{});
}
function _pxBulle(role,texte,extra){
  const chat=document.getElementById('prodix-chat');
  if(!chat)return null;
  const b=document.createElement('div');
  const isUser=role==='user';
  b.style.cssText='max-width:85%;padding:10px 14px;border-radius:14px;font-size:15px;line-height:1.45;white-space:pre-wrap;'+
    (isUser?'align-self:flex-end;background:#1d1d1f;color:#fff;border-bottom-right-radius:4px;'
           :'align-self:flex-start;background:#f5f5f7;color:#1d1d1f;border-bottom-left-radius:4px;');
  b.textContent=texte;
  if(extra)b.appendChild(extra);
  chat.appendChild(b);
  chat.scrollTop=chat.scrollHeight;
  return b;
}
// ← Revenir (18/07) : annule le dernier échange (ta réponse + la réplique de
// PRODIX), réactive les choix de la question précédente. N'restaure pas la
// liste si l'échange annulé était une offre (re-demander suffit).
function _pxRetour(){
  while(_pxHist.length&&_pxHist[_pxHist.length-1].role==='assistant')_pxHist.pop();
  if(_pxHist.length&&_pxHist[_pxHist.length-1].role==='user')_pxHist.pop();
  const ch=document.getElementById('prodix-chat');
  if(ch){
    let removedUser=false;
    while(ch.lastElementChild&&!removedUser){
      const el=ch.lastElementChild;
      const isUser=el.style.alignSelf==='flex-end';
      el.remove();
      if(isUser)removedUser=true;
    }
    const last=ch.lastElementChild;
    if(last){
      last.querySelectorAll('.px-choix button').forEach(b=>{b.disabled=false;b.style.opacity='';b.style.cursor='pointer';});
      last.querySelectorAll('.px-choix input').forEach(i=>{i.disabled=false;i.style.opacity='';});
    }
    ch.scrollTop=ch.scrollHeight;
  }
  const rb=document.getElementById('px-retour');
  if(rb)rb.style.display=_pxHist.length>=2?'':'none';
  window.prodiTrack?.('prodix_retour',{});
}
async function _pxSend(){
  const inp=document.getElementById('prodix-input');
  const btn=document.getElementById('prodix-btn');
  const msg=(inp?.value||'').trim();
  if(!msg)return;
  inp.value='';
  document.getElementById('prodix-empty')?.remove();
  document.getElementById('prodix-sug')?.remove();
  document.querySelectorAll('.px-choix button').forEach(b=>{b.disabled=true;b.style.opacity='.4';b.style.cursor='default';b.onmouseover=null;b.onmouseout=null;});
  document.querySelectorAll('.px-choix input').forEach(i=>{i.disabled=true;i.style.opacity='.4';});
  _pxHist.push({role:'user',content:msg});
  _pxBulle('user',msg);
  btn.disabled=true;const _btnHTML=btn.innerHTML;btn.textContent='…';
  // Attente ANIMÉE : points qui dansent + textes qui tournent (18/07)
  const pense=_pxBulle('assistant','');
  let _pw=null;
  if(pense){
    const _wmsgs=['PRODIX lit le stock en direct…','Je compare les grammages…','Je regarde les laizes et les formats…','Je compose la meilleure offre…','Encore quelques secondes…'];
    let _wmi=0;
    pense.innerHTML='<span class="px-dots"><i></i><i></i><i></i></span><span class="px-wait">'+_wmsgs[0]+'</span>';
    _pw=setInterval(()=>{_wmi=(_wmi+1)%_wmsgs.length;const w=pense.querySelector('.px-wait');if(w)w.textContent=_wmsgs[_wmi];},1900);
  }
  try{
    let _pvid=null,_psid=null;
    try{_pvid=localStorage.getItem('prodi_vid');_psid=sessionStorage.getItem('prodi_sid');}catch(_){}
    const r=await fetch(PRODIX_API,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({messages:_pxHist,vid:_pvid||undefined,sid:_psid||undefined,liste:_pxListeResume()||undefined})});
    const data=await r.json();
    pense?.remove();
    if(!r.ok)throw new Error(data?.error||('HTTP '+r.status));
    if(data.type==='offre'&&data.refs&&data.refs.length){
      const texte=(data.texte?data.texte+'\n':'')+'✓ '+data.resume;
      _pxHist.push({role:'assistant',content:texte});
      // Bouton « Voir la liste » dans la bulle
      const btnVoir=document.createElement('div');
      btnVoir.style.cssText='display:flex;gap:6px;flex-wrap:wrap;margin-top:8px;';
      const mkBtn=(label,fn,dark,ico)=>{
        const b=document.createElement('button');
        b.innerHTML=(ico||'')+label;
        b.style.cssText='display:inline-flex;align-items:center;padding:14px 24px;border-radius:999px;font-weight:700;font-size:16px;cursor:pointer;font-family:inherit;'+
          (dark?'background:#1d1d1f;color:#fff;border:none;':'background:#fff;color:#1d1d1f;border:none;box-shadow:0 1px 5px rgba(0,0,0,.14);');
        b.onclick=fn;
        return b;
      };
            // 21/07 (Ethan) : un seul CTA « Partager » (icône du header) —
      // ouvre le lien client direct ; l'Excel vit dans la vue client.
      btnVoir.appendChild(mkBtn('Partager',()=>{ouvrirLienClient();},false,'<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#1d1d1f" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" style="flex-shrink:0;margin-right:7px;vertical-align:-3px;"><path d="M12 15V4"/><path d="M8 7l4-4 4 4"/><path d="M5 12v7a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-7"/></svg>'));
      // Feedback 👍/👎 : nourrit la boucle apprenante (prodix_feedback)
      const _fb=document.createElement('span');
      _fb.style.cssText='display:inline-flex;gap:2px;margin-left:auto;align-self:center;';
      [['👍','up'],['👎','down']].forEach(([g,n])=>{
        const fbtn=document.createElement('button');
        fbtn.textContent=g;
        fbtn.style.cssText='background:none;border:none;cursor:pointer;font-size:16px;opacity:.45;padding:4px;transition:opacity .15s,transform .1s;';
        fbtn.onmouseover=()=>{fbtn.style.opacity='1';};
        fbtn.onmouseout=()=>{if(!fbtn._done)fbtn.style.opacity='.45';};
        fbtn.onclick=()=>{
          window.prodiTrack?.('prodix_feedback',{note:n,q:String(msg).slice(0,120)});
          _fb.querySelectorAll('button').forEach(x=>{x.style.opacity='.2';x._done=false;});
          fbtn.style.opacity='1';fbtn._done=true;fbtn.style.transform='scale(1.2)';
          setTimeout(()=>{fbtn.style.transform='';},180);
        };
        _fb.appendChild(fbtn);
      });
      btnVoir.appendChild(_fb);
      // Remplir d'ABORD la liste pour pouvoir la résumer dans la bulle
      cart=[];
      await _pxRemplir(data.refs);
      const _rs=_pxListeResume();
      const _wrap=document.createElement('div');
      if(_rs){
        const det=document.createElement('div');
        det.style.cssText='margin-top:10px;padding:12px 14px;background:#fff;border-radius:14px;box-shadow:0 1px 4px rgba(0,0,0,.08);font-size:13.5px;line-height:1.6;color:#1d1d1f;';
        det.innerHTML='<span style="font-size:11px;font-weight:800;letter-spacing:.5px;color:#6e6e73;">RÉSUMÉ DE L\'OFFRE</span><br>'
          +`<b>${_rs.n}</b> article${_rs.n>1?'s':''} — ${_rs.bobines} bobine${_rs.bobines>1?'s':''} · ${_rs.formats} format${_rs.formats>1?'s':''} — <b>${_rs.tonnes} t</b>`
          +(_rs.gsm?`<br>Grammages ${_rs.gsm[0]} → ${_rs.gsm[1]} g/m²`:'')
          +'<br>'+_rs.qualites.map(x=>`${esc(x.q)} <b>${x.t} t</b>`).join(' · ')
          +'<br><span style="color:#6e6e73;font-size:12.5px;">Dis-moi ce qu\'on ajuste : retirer une qualité, changer un grammage, compléter le tonnage…</span>';
        _wrap.appendChild(det);
      }
      _wrap.appendChild(btnVoir);
      _pxBulle('assistant',texte,_wrap);
      window.prodiTrack?.('prodix_offre',{nb:data.refs.length,q:msg.slice(0,80)});
      // Historique local des offres (reprise depuis l'accueil)
      try{
        // Nom parlant : qualité dominante + tonnage (« Offre kraft brun · 12,4 t »)
        let _nom='Offre';
        if(_rs&&_rs.qualites.length){
          const domQ=_rs.qualites[0].q;
          const it=cart.find(x=>x.qualite===domQ);
          const t=it?String(formatProductTitle(it.qualite,it.type)).split('—').pop().trim():domQ;
          _nom='Offre '+t.toLowerCase()+' · '+_rs.tonnes+' t';
        }
        const h=JSON.parse(localStorage.getItem('prodix_hist')||'[]');
        h.unshift({ts:Date.now(),nom:_nom,resume:data.resume,refs:data.refs.slice(0,400)});
        localStorage.setItem('prodix_hist',JSON.stringify(h.slice(0,5)));
      }catch(_){}
      toast('PRODIX : '+data.resume);
    }else{
      // BLOC de questions (21/07) : 1-3 questions de sujets différents dans la
      // même bulle — chacune ses choix, UN SEUL Valider = un seul tour de plus.
      if(data.type==='questions'&&Array.isArray(data.questions)&&data.questions.length){
        const qs=data.questions;
        _pxHist.push({role:'assistant',content:qs.map(q=>q.texte).join(' ')});
        const bloc=document.createElement('div');
        bloc.className='px-choix';
        bloc.style.cssText='display:flex;flex-direction:column;gap:10px;margin-top:4px;';
        // PAYSAGE (21/07 Ethan) : une COLONNE par question, côte à côte —
        // le bloc reste compact en hauteur. Colonnes fluides (repli en pile
        // sur écran étroit via flex-wrap).
        const rangee=document.createElement('div');
        // GRILLE à colonnes ÉGALES pleine largeur. 04/08 (Ethan « je veux ça
        // en paysage ») : n colonnes FORCÉES sur desktop — l'auto-fit
        // retombait en pile dès que la bulle manquait de place ; la pile ne
        // reste que sur écran étroit (mobile).
        const _mobQ=window.matchMedia('(max-width:640px)').matches;
        rangee.style.cssText='display:grid;grid-template-columns:'+
          (_mobQ?'repeat(auto-fit,minmax(min(200px,100%),1fr))':'repeat('+qs.length+',minmax(0,1fr))')+
          ';gap:12px 16px;align-items:start;width:100%;';
        bloc.appendChild(rangee);
        const reps=qs.map(()=>new Set());
        const _val=document.createElement('button');
        const _maj=()=>{
          const n=reps.reduce((a,s2)=>a+(s2.size?1:0),0)+(_li.value.trim()?1:0);
          _val.style.display=n?'block':'none';
          _val.textContent='Valider ('+n+'/'+qs.length+') →';
          if(n)requestAnimationFrame(()=>{_val.scrollIntoView({block:'nearest',behavior:'smooth'});});
        };
        qs.forEach((q,j)=>{
          const col=document.createElement('div');
          col.style.cssText='min-width:0;display:flex;flex-direction:column;gap:6px;';
          if(qs.length>1){
            const t=document.createElement('div');
            t.textContent=q.texte;
            t.style.cssText='font-size:13px;font-weight:700;color:#1d1d1f;margin:0 0 2px;line-height:1.3;';
            col.appendChild(t);
          }
          // Question POOL : le SEGMENT FAB/STOCK du popup Quantité (préréglé
          // FAB, deux options seulement — 21/07 Ethan).
          const _chx=(q.choix||[]).join(' ');
          if(q.cle==='pool'||(/\bFAB\b/.test(_chx)&&/\bSTOCK\b/.test(_chx))){
            const seg=document.createElement('div');
            seg.style.cssText='display:flex;background:#f5f5f7;border-radius:999px;padding:3px;';
            const mkSeg=(m,on)=>{
              const b=document.createElement('button');
              b.textContent=m==='STOCK'?'LOTS':m; // affichage LOTS, réponse API inchangée
              b.style.cssText='flex:1;padding:9px;border:none;border-radius:999px;font-size:13px;font-weight:'+(on?'700':'600')+';color:'+(on?'#1d1d1f':'#6e6e73')+';cursor:pointer;font-family:inherit;background:'+(on?'#fff':'transparent')+';box-shadow:'+(on?'0 1px 4px rgba(0,0,0,.12)':'none')+';';
              b.onclick=()=>{
                reps[j].clear();reps[j].add(m);
                seg.querySelectorAll('button').forEach(x=>{const o=x===b;x.style.background=o?'#fff':'transparent';x.style.boxShadow=o?'0 1px 4px rgba(0,0,0,.12)':'none';x.style.fontWeight=o?'700':'600';x.style.color=o?'#1d1d1f':'#6e6e73';});
                _maj();
              };
              return b;
            };
            seg.appendChild(mkSeg('FAB',true));
            seg.appendChild(mkSeg('STOCK',false));
            reps[j].add('FAB'); // préréglé FAB, comme le popup
            col.appendChild(seg);
            rangee.appendChild(col);
            return;
          }
          // Question TONNAGE : CURSEUR comme le popup Quantité (préréglé au
          // max, aimant Container) — plus de boutons 10 t/container/max (21/07).
          const _maxT=+q.max_t||0;
          if((q.cle==='tonnes'||_maxT>0)&&_maxT>0){
            const fmtT=v=>Math.round(v).toLocaleString('fr-FR');
            const lbl=document.createElement('div');
            lbl.style.cssText='text-align:center;font-family:\'Bebas Neue\',sans-serif;font-size:23px;color:#1d1d1f;';
            lbl.textContent=fmtT(_maxT)+' t';
            const rng=document.createElement('input');
            rng.type='range';rng.min='0.5';rng.max=String(_maxT);rng.step='0.5';rng.value=String(_maxT);
            rng.style.cssText='width:100%;accent-color:#1d1d1f;height:28px;cursor:pointer;';
            const setRep=v=>{reps[j].clear();reps[j].add((v===26.5?'26,5':fmtT(v))+' t');};
            const paintT=()=>{let v=+rng.value;
              if(_maxT>26.5&&Math.abs(v-26.5)<=Math.max(1,_maxT*0.04)){v=26.5;rng.value='26.5';}
              lbl.textContent=(v===26.5?'26,5':fmtT(v))+' t';setRep(v);_maj();};
            rng.oninput=paintT;
            col.appendChild(lbl);col.appendChild(rng);
            if(_maxT>26.5){
              const mk=document.createElement('div');
              mk.style.cssText='position:relative;height:18px;';
              const cb=document.createElement('button');
              cb.textContent='▲ Container';
              cb.style.cssText='position:absolute;left:'+Math.min(96,Math.max(4,26.5/_maxT*100)).toFixed(1)+'%;transform:translateX(-50%);background:none;border:none;cursor:pointer;font-size:10.5px;font-weight:700;color:#1d1d1f;font-family:\'DM Sans\',sans-serif;padding:2px 10px;white-space:nowrap;';
              cb.onclick=()=>{rng.value='26.5';paintT();};
              mk.appendChild(cb);col.appendChild(mk);
            }
            setRep(_maxT); // préréglé au max = déjà répondu
            rangee.appendChild(col);
            return;
          }
          (q.choix||[]).forEach((c,i)=>{
            const b=document.createElement('button');
            b.style.cssText='display:flex;align-items:center;gap:8px;padding:8px 11px;border:none;border-radius:11px;background:#fff;box-shadow:0 1px 4px rgba(0,0,0,.08);font-size:12.5px;color:#1d1d1f;cursor:pointer;font-family:inherit;text-align:left;line-height:1.25;';
            const num=document.createElement('span');
            num.textContent=String(i+1);
            num.style.cssText='width:18px;height:18px;border-radius:999px;background:#f5f5f7;display:flex;align-items:center;justify-content:center;font-size:10px;font-weight:700;color:#6e6e73;flex-shrink:0;';
            b.appendChild(num);b.appendChild(document.createTextNode(c));
            b.onclick=()=>{
              const sel=reps[j];
              const on=sel.has(c);
              if(!q.multi){sel.clear();rangee.querySelectorAll('[data-q="'+j+'"]').forEach(x=>{x.style.background='#fff';const n2=x.querySelector('span');n2.style.background='#f5f5f7';n2.style.color='#6e6e73';n2.textContent=x.dataset.i;});}
              if(on&&q.multi){sel.delete(c);b.style.background='#fff';num.style.background='#f5f5f7';num.style.color='#6e6e73';num.textContent=String(i+1);}
              else if(!on){sel.add(c);b.style.background='#f0f0f2';num.style.background='#1d1d1f';num.style.color='#fff';num.textContent='✓';}
              _maj();
            };
            b.dataset.q=String(j);b.dataset.i=String(i+1);
            col.appendChild(b);
          });
          rangee.appendChild(col);
        });
        const _libre=document.createElement('div');
        _libre.style.cssText='display:flex;align-items:center;gap:10px;padding:3px 13px;border:1.5px dashed #d2d2d7;border-radius:12px;background:#fff;';
        _libre.innerHTML='<span style="width:20px;height:20px;border-radius:999px;background:#f5f5f7;display:flex;align-items:center;justify-content:center;font-size:11px;flex-shrink:0;">✏️</span>';
        const _li=document.createElement('input');
        _li.type='text';_li.placeholder="Autre — j'écris ma réponse…";
        _li.style.cssText='flex:1;min-width:0;border:none;outline:none;background:transparent;font-family:inherit;font-size:13.5px;color:#1d1d1f;padding:9px 0;';
        _li.oninput=_maj;_li.onclick=(e)=>e.stopPropagation();
        _li.onkeydown=(e)=>{if(e.key==='Enter'){e.preventDefault();_envoyer();}};
        _libre.appendChild(_li);bloc.appendChild(_libre);
        const _envoyer=()=>{
          const parts=[];
          qs.forEach((q,j)=>{if(reps[j].size)parts.push([...reps[j]].join(', '));});
          if(_li.value.trim())parts.push(_li.value.trim());
          if(!parts.length)return;
          const rep=parts.join(' · ');
          window.prodiTrack?.('prodix_choix_click',{c:rep.slice(0,80),n:parts.length,bloc:qs.length});
          const i2=document.getElementById('prodix-input');
          if(i2){i2.value=rep;_pxSend();}
        };
        window.__pxMajVal=_maj;window.__pxEnvoyer=_envoyer;
        _val.style.cssText='display:none;align-self:flex-end;margin-top:8px;padding:9px 18px;border:none;border-radius:999px;background:#111;color:#fff;font-size:13.5px;font-weight:700;cursor:pointer;font-family:inherit;';
        _val.onclick=_envoyer;
        bloc.appendChild(_val);
        // Multi-questions : pas de texte d'intro (les titres de colonnes suffisent)
        const _bq=_pxBulle('assistant',qs.length>1?'':qs[0].texte,bloc);
        if(_bq&&qs.length>1){_bq.style.maxWidth='100%';}
        return;
      }
      const texte=data.texte||'Tu peux préciser ?';
      _pxHist.push({role:'assistant',content:texte});
      let extra=null;
      if(Array.isArray(data.choix)&&data.choix.length){
        extra=document.createElement('div');
        extra.className='px-choix';
        extra.style.cssText='display:flex;flex-direction:column;gap:6px;margin-top:10px;';
        // Choix MULTI-COCHABLES (18/07) : on coche un ou plusieurs, puis Valider.
        const _sel=new Set();
        const _val=document.createElement('button');
        data.choix.forEach((c,i)=>{
          const b=document.createElement('button');
          b.style.cssText='display:flex;align-items:center;gap:10px;padding:9px 13px;border:none;border-radius:12px;background:#fff;box-shadow:0 1px 4px rgba(0,0,0,.08);font-size:13.5px;color:#1d1d1f;cursor:pointer;font-family:inherit;text-align:left;transition:box-shadow .15s,background .15s;';
          const num=document.createElement('span');
          num.textContent=String(i+1);
          num.style.cssText='width:20px;height:20px;border-radius:999px;background:#f5f5f7;display:flex;align-items:center;justify-content:center;font-size:11px;font-weight:700;color:#6e6e73;flex-shrink:0;';
          b.appendChild(num);
          b.appendChild(document.createTextNode(c));
          b.onmouseover=()=>{b.style.boxShadow='0 2px 10px rgba(0,0,0,.16)';};
          b.onmouseout=()=>{b.style.boxShadow='0 1px 4px rgba(0,0,0,.08)';};
          b.onclick=()=>{
            // Choix EXCLUSIF (multi non déclaré par PRODIX) : clic = envoi direct
            if(!data.multi){
              window.prodiTrack?.('prodix_choix_click',{c:String(c).slice(0,80)});
              const i2=document.getElementById('prodix-input');
              if(i2){i2.value=c;_pxSend();}
              return;
            }
            if(_sel.has(c)){_sel.delete(c);b.style.background='#fff';num.style.background='#f5f5f7';num.style.color='#6e6e73';num.textContent=String(i+1);}
            else{_sel.add(c);b.style.background='#f0f0f2';num.style.background='#1d1d1f';num.style.color='#fff';num.textContent='✓';}
            window.__pxMajVal&&window.__pxMajVal();
          };
          extra.appendChild(b);
        });
        // Case « écriture libre » : on écrit DEDANS (18/07), Entrée ou
        // Valider envoie — combinable avec les choix cochés.
        const _libre=document.createElement('div');
        _libre.style.cssText='display:flex;align-items:center;gap:10px;padding:3px 13px;border:1.5px dashed #d2d2d7;border-radius:12px;background:#fff;';
        _libre.innerHTML='<span style="width:20px;height:20px;border-radius:999px;background:#f5f5f7;display:flex;align-items:center;justify-content:center;font-size:11px;flex-shrink:0;">✏️</span>';
        const _li=document.createElement('input');
        _li.type='text';
        _li.placeholder="Autre — j'écris ma réponse…";
        _li.style.cssText='flex:1;min-width:0;border:none;outline:none;background:transparent;font-family:inherit;font-size:13.5px;color:#1d1d1f;padding:9px 0;';
        const _majVal=()=>{
          const n=_sel.size+(_li.value.trim()?1:0);
          _val.style.display=n?'block':'none';
          _val.textContent=n>1?('Valider ('+n+') →'):'Valider →';
          // le bouton apparaît en bas de bulle → suivre pour ne pas le couper
          if(n)requestAnimationFrame(()=>{_val.scrollIntoView({block:'nearest',behavior:'smooth'});});
        };
        const _envoyer=()=>{
          const parts=[..._sel];
          if(_li.value.trim())parts.push(_li.value.trim());
          if(!parts.length)return;
          const rep=parts.join(', ');
          window.prodiTrack?.('prodix_choix_click',{c:rep.slice(0,80),n:parts.length});
          const i2=document.getElementById('prodix-input');
          if(i2){i2.value=rep;_pxSend();}
        };
        _li.onkeydown=(e)=>{if(e.key==='Enter'){e.preventDefault();_envoyer();}};
        _li.oninput=_majVal;
        _li.onclick=(e)=>e.stopPropagation();
        _libre.appendChild(_li);
        extra.appendChild(_libre);
        window.__pxMajVal=_majVal;window.__pxEnvoyer=_envoyer;
        _val.style.cssText='display:none;align-self:flex-end;margin-top:2px;padding:9px 18px;border:none;border-radius:999px;background:#111;color:#fff;font-size:13.5px;font-weight:700;cursor:pointer;font-family:inherit;';
        _val.onclick=()=>{window.__pxEnvoyer&&window.__pxEnvoyer();};
        extra.appendChild(_val);
      }
      _pxBulle('assistant',texte,extra);
    }
  }catch(e){
    pense?.remove();
    _pxBulle('assistant','Oups : '+(e.message||'erreur réseau')+' — réessaie.');
    window.prodiTrack?.('prodix_erreur',{err:String(e.message||e).slice(0,120)});
  }finally{
    if(_pw)clearInterval(_pw);
    btn.disabled=false;btn.innerHTML=_btnHTML; // restaure la flèche (SVG du hero compris)
    const _rb=document.getElementById('px-retour');
    if(_rb)_rb.style.display=_pxHist.length>=2?'':'none';
    inp.focus();
  }
}
// Agrégat de la LISTE COURANTE : envoyé à PRODIX à chaque tour (reprise de
// liste) et affiché en résumé après chaque offre (18/07).
function _pxListeResume(){
  if(!cart.length)return null;
  const parQ={};let tot=0,bob=0,fmt=0,gMin=1e9,gMax=0;
  cart.forEach(c=>{
    const w=+c.poids_net||0;tot+=w;
    (c.format==='Bobine')?bob++:fmt++;
    const q=c.qualite||'?';parQ[q]=(parQ[q]||0)+w;
    if(+c.grammage){gMin=Math.min(gMin,+c.grammage);gMax=Math.max(gMax,+c.grammage);}
  });
  return {n:cart.length,bobines:bob,formats:fmt,tonnes:+(tot/1000).toFixed(1),
    qualites:Object.entries(parQ).sort((a,b)=>b[1]-a[1]).slice(0,6).map(([q,w])=>({q,t:+(w/1000).toFixed(1)})),
    gsm:gMin<=gMax?[gMin,gMax]:null};
}
// Fichier joint DANS la conversation (18/07) : extraction des réfs (BL,
// Excel, liste collée) puis remplissage de la liste — l'ex-« Album photo »
// vit désormais ici. Bulles + boutons directement dans le fil.
async function _pxFichier(file){
  window._heroConvo&&window._heroConvo();
  _pxBulle('user','📎 '+(file.name||'document'));
  const pense=_pxBulle('assistant','');
  if(pense)pense.innerHTML='<span class="px-dots"><i></i><i></i><i></i></span><span class="px-wait">Je lis le document…</span>';
  try{
    const text=await _extractTextFromFile(file);
    let six;
    try{six=text.match(new RegExp('(?<![\\d.,])\\d{6}(?![\\d.,])','g'))||[];}
    catch(_){six=text.match(/\b\d{6}\b/g)||[];}
    const codes=(text.match(/\b(?:DU|FAB)[A-Z0-9-]{2,}\b/gi)||[]).map(c=>c.toUpperCase());
    const refs=[...new Set([...six,...codes])];
    pense?.remove();
    if(!refs.length){
      _pxBulle('assistant','Je n\'ai trouvé aucune référence dans ce document. Colle-moi les numéros directement si tu veux.');
      window.prodiTrack?.('prodix_fichier',{nom:file.name,refs:0});
      return;
    }
    const avant=cart.length;
    await _pxRemplir(refs);
    const ajoutes=cart.length-avant;
    const poids=cart.reduce((s,c)=>s+(+c.poids_net||0),0);
    const extra=document.createElement('div');
    extra.style.cssText='display:flex;gap:6px;flex-wrap:wrap;margin-top:8px;';
    const mkB=(label,fn,dark,ico)=>{const b=document.createElement('button');b.innerHTML=(ico||'')+label;b.style.cssText='display:inline-flex;align-items:center;padding:14px 24px;border-radius:999px;font-weight:700;font-size:16px;cursor:pointer;font-family:inherit;'+(dark?'background:#1d1d1f;color:#fff;border:none;':'background:#fff;color:#1d1d1f;border:none;box-shadow:0 1px 5px rgba(0,0,0,.14);');b.onclick=fn;return b;};
    extra.appendChild(mkB('Partager',()=>{ouvrirLienClient();},false,'<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#1d1d1f" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" style="flex-shrink:0;margin-right:7px;vertical-align:-3px;"><path d="M12 15V4"/><path d="M8 7l4-4 4 4"/><path d="M5 12v7a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-7"/></svg>'));
    _pxBulle('assistant',`J'ai lu ${refs.length} référence${refs.length>1?'s':''} dans « ${file.name} » — ${ajoutes} article${ajoutes>1?'s':''} retrouvé${ajoutes>1?'s':''} au stock (${(poids/1000).toFixed(1)} t), ils sont dans ta liste.`,extra);
    window.prodiTrack?.('prodix_fichier',{nom:file.name,refs:refs.length,trouves:ajoutes});
  }catch(e){
    pense?.remove();
    _pxBulle('assistant','Je n\'arrive pas à lire ce fichier ('+(e.message||'erreur')+'). Essaie en PDF, Excel ou texte.');
    window.prodiTrack?.('prodix_fichier_echec',{nom:file.name,err:String(e.message||e).slice(0,120)});
  }
}
// ALBUM PHOTO (07/08) : import de références depuis un fichier (Excel/PDF/BL/texte)
// SANS ouvrir le chat PRODIX — réutilise l'extraction de _pxFichier + _pxRemplir.
async function _albumImport(file){
  try{
    toast('Lecture du document…');
    const text=await _extractTextFromFile(file);
    let six; try{six=text.match(new RegExp('(?<![\\d.,])\\d{6}(?![\\d.,])','g'))||[];}catch(_){six=text.match(/\b\d{6}\b/g)||[];}
    const codes=(text.match(/\b(?:DU|FAB)[A-Z0-9-]{2,}\b/gi)||[]).map(c=>c.toUpperCase());
    const refs=[...new Set([...six,...codes])];
    if(!refs.length){toast('Aucune référence trouvée dans ce document');return;}
    const avant=cart.length;
    await _pxRemplir(refs);
    const ajoutes=cart.length-avant;
    toast(ajoutes+' article'+(ajoutes>1?'s':'')+' ajouté'+(ajoutes>1?'s':'')+' à la liste');
    window.prodiTrack?.('album_import',{nom:file.name,refs:refs.length,trouves:ajoutes});
  }catch(e){
    toast('Impossible de lire ce fichier (PDF, Excel ou texte)');
    window.prodiTrack?.('album_import_echec',{nom:file.name});
  }
}
// Remplit la liste depuis des réfs SANS ouvrir la modal d'import (fond de tâche).
async function _pxRemplir(refs){
  try{
    // Par PAQUETS de 150 et SANS plafond global (21/07 : un fichier client de
    // 330 réfs se faisait tronquer à 200 par le limit=200 — vécu ZINIAS).
    // Les codes non préfixables (DU*/FAB*) passent tels quels.
    const _tous=[];
    for(let i=0;i<refs.length&&_tous.length<2000;i+=150){
      const chunk=refs.slice(i,i+150).map(x=>/^(DU|FAB)/i.test(String(x))?'Photo_'+String(x).toUpperCase():'Photo_'+x);
      const r=await sbQ('products?ref=in.('+chunk.map(encodeURIComponent).join(',')+')&select=*&limit=150');
      if(r.data)_tous.push(...r.data);
    }
    _tous.forEach(p=>{
      if(!cart.find(c=>c.id===p.id))cart.push(rowToUi(p));
    });
    localStorage.setItem('prodi_cart',JSON.stringify(cart));
    updateCartBadge();renderDrawer();
  }catch(_){/* la liste restera vide, le toast a déjà informé */}
}

function _proformaNumero(){
  const d=new Date();
  const yy=String(d.getFullYear()).slice(2);
  const mm=String(d.getMonth()+1).padStart(2,'0');
  const seq=Math.floor(1000+Math.random()*9000);
  return `DE${yy}${mm}${seq}`;
}

const _shareParam=new URLSearchParams(window.location.search).get('share');
const _shareCode=new URLSearchParams(window.location.search).get('s');
// ?ref=Photo_<référence> — flow QR étiquette : scan de l'app appareil photo
// natif sur une étiquette PDF imprimée par prodi_arrivages. À l'arrivée on
// pré-ouvre la fiche détail du produit correspondant.
const _refParam=new URLSearchParams(window.location.search).get('ref');
// ?edit=<code|_local> — « Modifier » depuis la vue client : rouvre une liste
// partagée dans le CATALOGUE de travail (avec prix), sélection pré-remplie.
// N'active PAS le mode vue client (pas de ?s=) → catalogue normal + panier chargé.
const _editParam=new URLSearchParams(window.location.search).get('edit');
let _sharedMode=!!_shareParam||!!_shareCode;
// Vue client (lien partagé) : pas de panneau filtres — pilotée par .shared-view
function _sharedViewUI(on){document.body.classList.toggle('shared-view',on);}
if(_sharedMode)_sharedViewUI(true);
// Thème APPLE = DÉFAUT de la vue client (validé 18/07). &etiquette=1 rend
// l'ancien style cadre noir ; &amazon=1 / &zara=1 restent des essais.
{
  const _thq=new URLSearchParams(window.location.search);
  if(_thq.get('amazon')!=='1'&&_thq.get('zara')!=='1'&&_thq.get('etiquette')!=='1')document.body.classList.add('apple-view');
  // TOPBAR = LE catalogue (défaut depuis le 18/07 soir — « on oublie tout
  // le reste »). Desktop/tablette uniquement : le mobile garde son parcours
  // dédié (tiroir de filtres). ?haut=1 accepté mais plus nécessaire.
  if(!_sharedMode){ // desktop, tablette ET mobile (refonte responsive 18/07)
    document.body.classList.add('topbar-view');
    const _fp=document.getElementById('filters-panel');
    const _sel=document.getElementById('sort-sel');
    if(_fp&&_sel){
      const _sd=document.createElement('div');
      _sd.className='msd';_sd.id='tb-sort';
      _sd.innerHTML='<button class="msd-btn tb-sort-btn" data-msd-id="tb-sort" onclick="toggleMsd(\'tb-sort\')" title="Trier"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 5h10"/><path d="M11 9h7"/><path d="M11 13h4"/><path d="M3 17l3 3 3-3"/><path d="M6 4v16"/></svg></button><div class="msd-panel"></div>';
      _fp.appendChild(_sd);
      const _pn=_sd.querySelector('.msd-panel');
      window._tbSortPick=v=>{_sortTouched=true;_sel.value=v;filterProducts();document.querySelectorAll('.msd-panel.show').forEach(p=>p.classList.remove('show'));document.querySelectorAll('.msd-btn.open').forEach(b=>b.classList.remove('open'));_msdRestoreAll();_flushFacetsApresFermeture();};
      const _paint=()=>{_pn.innerHTML=[..._sel.options].filter(o=>!o.hidden&&!o.disabled).map(o=>`<div class="msd-option${o.value===_sel.value?' selected':''}" onclick="_tbSortPick('${o.value}')">${o.textContent}</div>`).join('');};
      _paint();
      _sel.addEventListener('change',_paint);
      _sd.querySelector('.msd-btn').addEventListener('click',_paint);
      // 2e LIGNE (18/07) : + page, pager, TAGS supprimables des filtres actifs,
      // tri et reset — n'apparaît que si au moins un filtre est posé
      // (CSS :has(.fchip) sur #topbar-row2).
      const _r2=document.createElement('div');
      _r2.id='topbar-row2';
      _fp.parentNode.insertBefore(_r2,_fp.nextSibling);
      [document.getElementById('add-page-btn'),document.getElementById('pager-top'),
       document.getElementById('filter-chips'),_sd,_fp.querySelector('.fp-head')]
        .forEach(el=>{if(el)_r2.appendChild(el);});
      const _rb=document.getElementById('results-bar');if(_rb)_rb.style.display='none';
      // DESKTOP sidebar (07/08, Ethan) : sort + « + page » vont dans une BARRE
      // en haut de la colonne produits (flow, pas d'absolu → le zoom global ne
      // les décale plus). Mobile (≤768) garde tout dans le rail/topbar.
      if(window.innerWidth>768){
        const _sc=_fp.closest('.sidebar-col');
        const _content=_sc&&_sc.nextElementSibling;
        if(_content){
          let _bar=document.getElementById('desk-toolbar');
          if(!_bar){_bar=document.createElement('div');_bar.id='desk-toolbar';_content.insertBefore(_bar,_content.firstChild);}
          const _ap=document.getElementById('add-page-btn'); if(_ap)_bar.appendChild(_ap);
          // Tonnage de la sélection filtrée (08/08 Ethan) — à côté du +
          if(!document.getElementById('tb-tons')){const _tt=document.createElement('div');_tt.id='tb-tons';_bar.appendChild(_tt);}
          const _fc=document.getElementById('filter-chips'); if(_fc)_bar.appendChild(_fc); // chips ENTRE le + et le tri
          _bar.appendChild(_sd);
        }
        // « Offre » reste dans le HEADER (avec Album photo · Usine · Liste) — demande
        // Ethan 08/08 : c'est une action, pas un filtre. (Avant : déplacé en haut du rail.)
      }
      // FILTRES AVANCÉS (18/07) : regroupe les filtres retirés de la barre
      // (Sans photo, Réservés, Bobine/Format, tranches de Poids).
      const _fa=document.createElement('div');
      _fa.className='msd';_fa.id='tb-adv';
      _fa.innerHTML='<button class="msd-btn" data-msd-id="tb-adv" onclick="toggleMsd(\'tb-adv\')"><span class="msd-btn-label">Filtres avancés</span><span class="msd-arrow"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 12 15 18 9"></polyline></svg></span></button><div class="msd-panel"></div>';
      _fp.appendChild(_fa);
      const _faPn=_fa.querySelector('.msd-panel');
      window._advToggle=(kind,val)=>{
        if(kind==='poids'){const s=msdState['msd-poids'];s.has(val)?s.delete(val):s.add(val);updateMsdBtn('msd-poids');}
        else if(kind==='usine'){const s=msdState['msd-usine'];s.has(val)?s.delete(val):s.add(val);updateMsdBtn('msd-usine');}
        else if(kind==='mandrin'){const s=msdState['msd-mandrin'];s.has(val)?s.delete(val):s.add(val);updateMsdBtn('msd-mandrin');}
        else if(kind==='laize'){const s=msdState['msd-laize'];s.has(val)?s.delete(val):s.add(val);updateMsdBtn('msd-laize');}
        else if(kind==='format'){const s=msdState['msd-format'];s.has(val)?s.delete(val):s.add(val);updateMsdBtn('msd-format');}
        else if(kind==='couleur'){const s=msdState['msd-couleur'];s.has(val)?s.delete(val):s.add(val);updateMsdBtn('msd-couleur');}
        else if(kind==='diametre'){const s=msdState['msd-diametre'];s.has(val)?s.delete(val):s.add(val);updateMsdBtn('msd-diametre');}
        else if(kind==='photo'){_photoFilter=_photoFilter===val?'':val;syncFilterPills();}
        else if(kind==='resa'){_resaFilter=_resaFilter===val?'':val;document.querySelectorAll('.fpill-resa').forEach(b=>b.classList.toggle('active',_resaFilter===(b.dataset.resa||'with')));}
        else if(kind==='prix'){togglePriceMode(!_priceMode);window._paintAdv&&window._paintAdv();return;} // affichage seul, pas un filtre
        filterProducts();window._paintAdv&&window._paintAdv();
      };
      window._advOpenSec=null; // section dépliée (accordéon)
      window._paintAdv=()=>{
        const chk='<div class="msd-check"><svg width="9" height="7" fill="none" stroke="#fff" stroke-width="2.5"><polyline points="1,4 3.5,6.5 8,1"/></svg></div>';
        const row=(kind,val,lbl,on)=>`<div class="msd-option${on?' selected':''}" data-k="${kind}" data-v="${esc(String(val))}">${chk}<span class="msd-label">${esc(lbl)}</span></div>`;
        const usines=[...document.querySelectorAll('#sb-msd-usine .msd-option')].map(o=>o.dataset.val).filter(Boolean);
        const mandrins=[...document.querySelectorAll('#sb-msd-mandrin .msd-option')].map(o=>o.dataset.val).filter(Boolean);
        const laizes=[...document.querySelectorAll('#sb-msd-laize .msd-option')].map(o=>o.dataset.val).filter(Boolean);
        const formats=[...document.querySelectorAll('#sb-msd-format .msd-option')].map(o=>o.dataset.val).filter(Boolean);
        const couleurs=[...document.querySelectorAll('#sb-msd-couleur .msd-option')].filter(o=>o.style.display!=='none'||msdState['msd-couleur'].has(o.dataset.val)).map(o=>o.dataset.val).filter(Boolean);
        const diams=[...document.querySelectorAll('#sb-msd-diametre .msd-option')].map(o=>o.dataset.val).filter(Boolean);
        const secs=[
          ...(window._coulInAdv?[{id:'couleur',t:'Couleurs',n:msdState['msd-couleur'].size,rows:()=>couleurs.length?couleurs.map(v=>row('couleur',v,v,msdState['msd-couleur'].has(v))).join(''):'<div class="msd-option" style="opacity:.5;cursor:default;">Aucune couleur dans la sélection en cours</div>'}]:[]),
          ...(window._dimsInAdv?[{id:'format',t:'Dimensions',n:msdState['msd-format'].size,rows:()=>formats.length?formats.map(v=>row('format',v,v===FORMAT_AUTRES?'Autres dimensions':v,msdState['msd-format'].has(v))).join(''):'<div class="msd-option" style="opacity:.5;cursor:default;">Aucun format dans la sélection en cours</div>'}]:[]),
          {id:'mandrin',t:'Mandrin',n:msdState['msd-mandrin'].size,rows:()=>mandrins.length?mandrins.map(m=>row('mandrin',m,m+' mm',msdState['msd-mandrin'].has(m))).join(''):'<div class="msd-option" style="opacity:.5;cursor:default;">Aucun mandrin dans la sélection en cours</div>'},
          {id:'laize',t:'Laizes',rng:'laize',rows:()=>_rsBounds.laize?'<div class="gsl-host" data-rskey="laize"></div>':'<div class="msd-option" style="opacity:.5;cursor:default;">Choisis d\'abord un type bobine</div>'},
          {id:'diametre',t:'Diamètre',rng:'diam',rows:()=>_rsBounds.diam?'<div class="gsl-host" data-rskey="diam"></div>':'<div class="msd-option" style="opacity:.5;cursor:default;">Choisis d\'abord un type bobine</div>'},
          {id:'poids',t:'Poids',rng:'poids',rows:()=>'<div class="gsl-host" data-rskey="poids"></div>'},
          {id:'photo',t:'Photo',n:_photoFilter?1:0,rows:()=>row('photo','with','Avec photo',_photoFilter==='with')+row('photo','without','Sans photo',_photoFilter==='without')},
          {id:'resa',t:'Réservation',n:_resaFilter?1:0,rows:()=>row('resa','with','Réservés',_resaFilter==='with')+row('resa','without','Dispo',_resaFilter==='without')},
          {id:'usine',t:'Réf usine',n:msdState['msd-usine'].size,rows:()=>`<div class="msd-search-wrap"><input class="msd-search-inp" id="adv-usine-q" type="text" placeholder="Rechercher…" autocomplete="off" value="${esc(window._advUsineQ||'')}"></div>`+usines.map(u=>row('usine',u,'Usine '+u,msdState['msd-usine'].has(u))).join('')},
        ];
        _faPn.innerHTML=secs.map(s=>{
          const open=window._advOpenSec===s.id;
          const right=s.rng
            ? `<span class="mgr-range" id="mgr-range-${s.rng}">${esc(_rsRangeText(s.rng))}</span>`
            : (s.n?`<span class="mgr-nsel">${s.n}</span>`:'');
          return `<div class="msd-group-row${open?' open':''}" data-sec="${s.id}"><span>${s.t}</span><span class="mgr-right">${right}<span class="mgr-arrow">›</span></span></div>`+(open?`<div class="adv-pop">${s.rows()}</div>`:'');
        }).join('');
        // Curseur Laize/Ø/Poids construit dans le popup ouvert (avant le calcul
        // de hauteur pour que scrollHeight le prenne en compte).
        const _rsHost=_faPn.querySelector('.adv-pop .gsl-host');
        if(_rsHost)_buildRangeSlider(_rsHost,_rsHost.dataset.rskey);
        // Dropdown FLOTTANT (comme Type/Détails, 08/08) : le popup des options
        // s'ancre SOUS sa ligne en position absolue (#tb-adv = .msd position:relative),
        // il ne pousse plus le rail (avant : déplié inline = rail interminable).
        if(window._advOpenSec){
          const _row=_faPn.querySelector(`.msd-group-row[data-sec="${window._advOpenSec}"]`);
          const _pop=_faPn.querySelector('.adv-pop');
          if(_row&&_pop){
            const _z=(typeof _zf==='function'?_zf():1)||1;
            const _rb=_row.getBoundingClientRect();
            const _below=window.innerHeight-_rb.bottom-14; // place dispo en bas (px visuels)
            const _above=_rb.top-14;                        // place dispo en haut
            const _natV=_pop.scrollHeight*_z;               // hauteur naturelle (visuel)
            const _up=_natV>_below && _above>_below;         // pas la place en bas + plus en haut → vers le HAUT
            const _availV=Math.max(140,Math.min(340*_z,_up?_above:_below));
            _pop.style.maxHeight=(_availV/_z)+'px';
            const _hL=Math.min(_pop.scrollHeight,_availV/_z); // hauteur rendue (layout)
            _pop.style.top=_up
              ? (_row.offsetTop-_hL-2)+'px'
              : (_row.offsetTop+_row.offsetHeight+2)+'px';
          }
        }
        const _q=(window._advUsineQ||'').trim().toLowerCase();
        if(_q)_faPn.querySelectorAll('.msd-option[data-k="usine"]').forEach(o=>{o.style.display=o.textContent.toLowerCase().includes(_q)?'':'none';});
        // l'accordeon s'elargit apres ouverture d'une section : re-clamper
        // le bord droit (le clamp de toggleMsd ne tourne qu'a l'ouverture)
        if(_faPn.classList.contains('show')){
          const pw=_faPn.offsetWidth,pl=_faPn.getBoundingClientRect().left;
          if(pl+pw*_zf()>window.innerWidth-8)_faPn.style.left=(Math.max(8,window.innerWidth-pw*_zf()-8)/_zf())+'px';
        }
      };
      _faPn.addEventListener('input',e=>{
        if(e.target.id!=='adv-usine-q')return;
        window._advUsineQ=e.target.value;
        const q=e.target.value.trim().toLowerCase();
        _faPn.querySelectorAll('.msd-option[data-k="usine"]').forEach(o=>{o.style.display=!q||o.textContent.toLowerCase().includes(q)?'':'none';});
      });
      _faPn.addEventListener('click',e=>{
        if(e.target.id==='adv-usine-q'){e.stopPropagation();return;}
        const gr=e.target.closest('.msd-group-row');
        if(gr){e.stopPropagation();window._advOpenSec=window._advOpenSec===gr.dataset.sec?null:gr.dataset.sec;window._paintAdv();return;}
        const o=e.target.closest('.msd-option');if(!o)return;
        e.stopPropagation();_advToggle(o.dataset.k,o.dataset.v);
      });
      window._paintAdv();
      _fa.querySelector('.msd-btn').addEventListener('click',window._paintAdv);
      // Fermer le popup avancé au clic DEHORS (les clics DEDANS sont stopPropagation'd)
      document.addEventListener('click',()=>{ if(window._advOpenSec){window._advOpenSec=null;window._paintAdv();} });
      // ── HERO PRODIX (18/07) : page d'arrivée façon Base44 × Apple — on
      // propose direct de parler à PRODIX, cartes produits en décor animé.
      const _contentCol=document.querySelector('.body-wrap>div:last-child');
      if(_contentCol&&!_sharedMode){
        const hero=document.createElement('section');
        hero.id='prodix-hero';
        hero.innerHTML=`
          <div class="phero-tapis" aria-hidden="true">
            <div class="phero-rail phero-rail-h"><div class="phero-piste" id="phero-p1"></div></div>
            <div class="phero-rail phero-rail-b"><div class="phero-piste" id="phero-p2"></div></div>
            <div class="phero-voile"></div>
          </div>
          <div class="phero-inner">
            <div class="phero-logo"><img src="/img/prodix.png?v=3" alt="PRODIX"></div>
            <div class="phero-panel" id="phero-panel" style="display:none">
              <div class="phero-panel-head">
                <img src="/img/prodix.png?v=3" alt="">
              </div>
              <button id="px-retour" onclick="_pxRetour()" style="display:none">← Revenir</button>
              <div id="prodix-chat" class="phero-chat"></div>
            </div>
            <div class="phero-hist" id="phero-hist"></div>
            <div class="phero-box phero-box-row">
              <input type="file" id="phero-file" accept=".pdf,.xlsx,.xls,.csv,.txt,.docx" style="display:none" onchange="if(this.files[0])_pxFichier(this.files[0]);this.value='';">
              <button class="phero-attach" onclick="document.getElementById('phero-file').click()" title="Joindre un document (BL, liste de réfs…)" aria-label="Joindre un fichier"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg></button>
              <textarea id="prodix-input" rows="1" placeholder="Décrivez votre besoin : qualité, grammage, tonnage…" onkeydown="if(event.key==='Enter'&&!event.shiftKey){event.preventDefault();_heroGo();}"></textarea>
              <button class="phero-send" id="prodix-btn" onclick="_heroGo()" aria-label="Envoyer à PRODIX"><svg width="18" height="18" viewBox="0 0 24 24" fill="none"><path d="M12 19V5m0 0l-6 6m6-6l6 6" stroke="#fff" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/></svg></button>
            </div>
          </div>
          <div class="phero-fade" aria-hidden="true"></div>`;
        _contentCol.insertBefore(hero,_contentCol.firstChild);
        // Au chargement (mode vitrine) : hero seul, grille et footer masqués
        const _pgInit=document.getElementById('pgrid');
        if(_pgInit)_pgInit.style.display='none';
        // Footer CONSERVÉ sur le landing (demande Ethan 08/08) — seule la grille est masquée.
        // ── ESSAI ?bas=1 : tuiles qualités en landing (mêmes familles que la
        // vitrine), pilule ancrée en barre basse fixe (#px-dock) ; un clic sur
        // une tuile filtre la famille et dévoile la grille ; le hero ne sert
        // plus que de panneau de convo ──
        if(window._SAISIE_BASSE){
          document.body.classList.add('saisie-basse');
          const dock=document.createElement('div');
          dock.id='px-dock';
          document.body.appendChild(dock);
          dock.appendChild(hero.querySelector('.phero-box'));
          hero.style.display='none';
          const _U='https://images.unsplash.com/',_P='?q=65&auto=format&fit=crop&w=1100';
          const _TU=[
            {codes:['ROFF','SOFF'],title:'Offset',img:_U+'flagged/photo-1562221054-cdc9dc299068'+_P,pos:'center 60%',dark:false},
            {codes:['RKRA','RKRABRUN','SKRA'],title:'Kraft',img:_U+'photo-1777566131325-78f6e12c50b7'+'?q=60&auto=format&fit=crop&w=900',pos:'center 50%',dark:true},
            {codes:['R2SC','S2SC'],title:'Papier couché',img:_U+'photo-1515891396453-6d7e56096a39'+_P,pos:'center 55%',dark:true},
            {codes:['RBOA','SBOA'],title:'Carton couché',img:_U+'photo-1595246135406-803418233494'+_P,pos:'center 55%',dark:true},
          ];
          const tw=document.createElement('div');
          tw.id='px-tuiles';
          // Chaque tuile porte son segment BOBINE/FORMAT à la place de
          // « Voir le stock » (04/08 Ethan), Bobine préchoisi. Le segment ne
          // fait que BASCULER l'état de la tuile (pas de navigation) — c'est
          // le clic sur la tuile qui entre, avec la forme choisie.
          tw.innerHTML=_TU.map((t,i)=>`
            <div class="px-tuile${t.dark?' dark':''}" data-forme="Bobine" onclick="_tuileGo(${i})">
              <img src="${t.img}" alt="${esc(t.title)}"${i>3?' loading="lazy"':''} style="object-position:${t.pos}">
              <div class="px-tuile-in">
                <div class="px-tuile-seg">
                  <button type="button" class="on" onclick="event.stopPropagation();_tuileSeg(this,'Bobine')">BOBINE</button>
                  <button type="button" onclick="event.stopPropagation();_tuileSeg(this,'Palette')">FORMAT</button>
                </div>
                <h2>${esc(t.title)}</h2>
              </div>
            </div>`).join('');
          window._tuileSeg=(btn,forme)=>{
            const tuile=btn.closest('.px-tuile');
            if(!tuile)return;
            tuile.dataset.forme=forme;
            tuile.querySelectorAll('.px-tuile-seg button').forEach(b=>b.classList.toggle('on',b===btn));
          };
          // Bandeau « autres qualités » sous les tuiles — même dessin et même
          // mécanique que la vitrine (boucle infinie 3 copies, points façon
          // apple.com qui se remplissent, avance auto)
          const _BAND=[
            {codes:['RLUX','SLUX'],title:'Papier créations',img:_U+'photo-1586207036106-90aae2456ccb'+_P},
            {codes:['RCAR','SCAR'],title:'Autocopiant',img:_U+'photo-1579808324991-cecc784498cc'+_P},
            {codes:['Offset Couleur','SCOL'],title:'Offset couleur',img:_U+'photo-1716471330459-063b3baf247e'+_P},
            {codes:['RBOU','SBOU'],title:'Bouffant',img:_U+'photo-1457369804613-52c61a468e7d'+_P},
            {codes:['RADH','SADH'],title:'Adhésif',img:_U+'photo-1569725730478-a2f4a1809bb4'+_P},
            {codes:['SCUT'],title:'Ramette',img:_U+'photo-1573978828027-e830975e272c'+_P},
            {codes:['RLINER'],title:'Liner / Testliner',img:_U+'photo-1640193698858-31565d448f90'+_P},
            {codes:['RFLEX'],title:'Complexe / PE',img:_U+'photo-1677586883848-695b3ad692b4'+_P},
          ];
          const bw=document.createElement('div');
          bw.id='px-band-wrap';
          const _bandHtml=_BAND.map((c,j)=>c.more?`
            <div class="px-qcard" onclick="_bandGo(${j})">
              <img src="${c.img}" alt="${esc(c.title)}" loading="lazy">
              <span class="px-qcard-title">${esc(c.title)}</span>
            </div>`:`
            <div class="px-qcard" onclick="_bandGo(${j})">
              <img src="${c.img}" alt="${esc(c.title)}" loading="lazy">
              <span class="px-qcard-title">${esc(c.title)}</span>
              <button class="px-qcard-btn" type="button" onclick="event.stopPropagation();_bandGo(${j})">Voir le stock</button>
            </div>`).join('');
          bw.innerHTML=`<div class="px-band" id="px-band">${_bandHtml+_bandHtml+_bandHtml}</div><div class="px-band-dots" id="px-band-dots"></div>`;
          const landing=document.createElement('div');
          landing.id='px-landing';
          landing.appendChild(tw);
          landing.appendChild(bw);
          _contentCol.insertBefore(landing,hero.nextSibling);
          const _rail=bw.querySelector('#px-band'),_bdots=bw.querySelector('#px-band-dots');
          const _NB=_BAND.length,_PER=5500;
          const _bStep=()=>{const c=_rail.firstElementChild;return c?c.getBoundingClientRect().width+12:512;};
          const _bSetW=()=>_NB*_bStep();
          const _bRecentre=()=>{const w=_bSetW(),x=_rail.scrollLeft;if(!w)return;if(x<w*0.5)_rail.scrollLeft=x+w;else if(x>=w*1.5)_rail.scrollLeft=x-w;};
          _rail.scrollLeft=_bSetW();
          _rail.addEventListener('scroll',_bRecentre,{passive:true});
          window.addEventListener('resize',_bRecentre);
          const _bCur=()=>((Math.round(_rail.scrollLeft/_bStep())%_NB)+_NB)%_NB;
          const _bStill=matchMedia('(prefers-reduced-motion: reduce)').matches;
          let _bTmr=null,_bOn=false,_bLast=-1;
          const _bDotsPaint=()=>{const i=_bCur();_bdots.innerHTML=_BAND.map((c,j)=>`<button class="pxdot${j===i?' on':''}${_bStill?' still':''}" aria-label="${esc(c.title)}" onclick="_bandDot(${j})"></button>`).join('');};
          const _bArm=()=>{
            if(_bStill)return;
            clearTimeout(_bTmr);
            _bTmr=setTimeout(()=>{
              if(!document.body.contains(_rail))return;
              if(_bOn&&document.visibilityState==='visible')_rail.scrollBy({left:_bStep(),behavior:'smooth'});
              else _bArm();
            },_PER);
          };
          window._bandDot=j=>{const d=((j-_bCur())%_NB+_NB)%_NB;_rail.scrollBy({left:(d>_NB/2?d-_NB:d)*_bStep(),behavior:'smooth'});};
          _rail.addEventListener('scroll',()=>{const i=_bCur();if(i!==_bLast){_bLast=i;_bDotsPaint();_bArm();}},{passive:true});
          _rail.addEventListener('pointerdown',()=>clearTimeout(_bTmr));
          _rail.addEventListener('pointerup',_bArm);
          document.addEventListener('visibilitychange',()=>{if(!document.body.contains(_rail))return;if(document.visibilityState==='visible'){_bDotsPaint();_bArm();}else clearTimeout(_bTmr);});
          new IntersectionObserver(es=>{_bOn=es[0].isIntersecting;if(_bOn){_bDotsPaint();_bArm();}else clearTimeout(_bTmr);},{threshold:.3}).observe(_rail);
          _bLast=_bCur();_bDotsPaint();_bArm();
          window._tuilesDismiss=()=>{
            if(window._tuilesDone)return;
            window._tuilesDone=true;
            clearTimeout(_bTmr);
            landing.remove();
            // La pilule PRODIX ne suit pas en page 2 : pas utilisée sur la
            // landing = aucun intérêt ensuite (05/08 Ethan). On la garde
            // seulement si une conversation est en cours.
            const _dk=document.getElementById('px-dock');
            if(_dk&&!(window._pxHist&&window._pxHist.length))_dk.style.display='none';
            const pg=document.getElementById('pgrid');if(pg)pg.style.display='';
            const ft=document.querySelector('footer');if(ft)ft.style.display='';
          };
          const _famSel=(t,forme)=>{
            window.prodiTrack?.('tuile_catalogue',{q:t.codes[0]||'tout',forme:forme||''});
            window._tuilesDismiss();
            // BOBINE → seulement les codes R* de la famille, FORMAT → les S*
            // (04/08 Ethan : pas de pilule « Bobine » en chip, et pas ROFF+SOFF
            // ensemble — un seul des deux selon le segment).
            let codes=t.codes;
            if(forme){
              const f=t.codes.filter(c=>forme==='Bobine'?c[0]==='R':c[0]==='S');
              if(f.length)codes=f;
            }
            const _cs=(typeof CSS!=='undefined'&&CSS.escape)?CSS.escape:(s=>String(s).replace(/[^a-zA-Z0-9_-]/g,'\\$&'));
            codes.forEach(c=>{
              msdState['msd-type'].add(c);
              document.querySelectorAll(`.msd-option[data-val="${_cs(c)}"]`).forEach(o=>{
                if(!o.closest('#msd-type,#msd-type-mob,#sb-msd-type'))return;
                o.classList.add('selected');
              });
            });
            if(codes.length)updateMsdBtn('msd-type');
            updateFilterVisibility();
            window.scrollTo(0,0);
            filterProducts();
          };
          // Tuile : la forme vient de l'état du segment de LA tuile (Bobine
          // par défaut). Bandeau : pas de forme imposée (certaines familles
          // n'existent qu'en formats, ex. Ramette).
          window._tuileGo=(i)=>{
            const t=_TU[i];if(!t)return;
            const el=document.querySelectorAll('#px-tuiles .px-tuile')[i];
            _famSel(t,(el&&el.dataset.forme)||'Bobine');
          };
          window._bandGo=(i)=>{const t=_BAND[i];if(t)_famSel(t,null);};
        }
        // Historique des offres : chips « Reprendre » sous la pilule (18/07)
        window._heroHistPaint=()=>{
          const el=document.getElementById('phero-hist');
          if(!el)return;
          let h=[];try{h=JSON.parse(localStorage.getItem('prodix_hist')||'[]');}catch(_){}
          if(!h.length){el.innerHTML='';return;}
          el.innerHTML='<span class="phist-lbl" title="Historique" aria-label="Historique"><svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 12a9 9 0 1 0 3-6.7L3 8"/><path d="M3 3v5h5"/><path d="M12 7v5l3 3"/></svg></span>'+h.slice(0,3).map((o,i)=>{
            const lbl=(o.nom||(o.resume||'offre').split('·')[0].trim()).slice(0,40);
            return `<button class="phist-chip" onclick="_pxReprendre(${i})">${esc(lbl)}</button>`;
          }).join('');
          // sous la pilule de saisie
          const bx=document.querySelector('.phero-inner .phero-box');
          if(bx&&bx.nextElementSibling!==el)bx.insertAdjacentElement('afterend',el);
        };
        window._pxReprendre=async(i)=>{
          let h=[];try{h=JSON.parse(localStorage.getItem('prodix_hist')||'[]');}catch(_){}
          const o=h[i];if(!o)return;
          cart=[];
          await _pxRemplir(o.refs);
          window._heroConvo();
          const rs=_pxListeResume();
          const txt=rs?`J'ai rechargé ton offre (${rs.n} articles · ${rs.tonnes} t). Dis-moi ce qu'on ajuste — retirer une qualité, changer un grammage, compléter le tonnage…`:'Liste rechargée.';
          _pxHist.push({role:'assistant',content:txt});
          _pxBulle('assistant',txt);
          window.prodiTrack?.('prodix_reprise',{n:o.refs.length});
        };
        window._heroHistPaint();
        // Migration : les offres sauvées AVANT le nommage parlant reçoivent
        // leur nom (qualité dominante + tonnage) retrouvé depuis leurs réfs.
        window._histMigrate=async()=>{
          let h=[];try{h=JSON.parse(localStorage.getItem('prodix_hist')||'[]');}catch(_){return;}
          let changed=false;
          for(const o of h){
            if(o.nom||!o.refs||!o.refs.length)continue;
            try{
              const r=await sbQ('products?ref=in.('+o.refs.slice(0,200).map(x=>'Photo_'+x).map(encodeURIComponent).join(',')+')&select=*&limit=200');
              const rows=(r.data||[]).map(rowToUi);
              if(!rows.length)continue;
              const parQ={};let tot=0;
              rows.forEach(u=>{const w=+u.poids_net||0;tot+=w;const q=u.qualite||'?';parQ[q]=(parQ[q]||0)+w;});
              const domQ=Object.entries(parQ).sort((a,b)=>b[1]-a[1])[0][0];
              const it=rows.find(x=>x.qualite===domQ);
              const t=it?String(formatProductTitle(it.qualite,it.type)).split('—').pop().trim():domQ;
              o.nom='Offre '+t.toLowerCase()+' · '+(tot/1000).toFixed(1)+' t';
              changed=true;
            }catch(_){}
          }
          if(changed){
            try{localStorage.setItem('prodix_hist',JSON.stringify(h));}catch(_){}
            window._heroHistPaint&&window._heroHistPaint();
          }
        };
        window._histMigrate();
        // Placeholder ANIMÉ : les suggestions s'écrivent toutes seules à la
        // chaîne (machine à écrire), en pause si l'utilisateur tape.
        const _sugs=["Je veux un container d'offset 80 g en bobine","Il me faut 10 tonnes de kraft brun pour de l'emballage","Je cherche du SBS en palette avec dos blanc","Fais-moi un mix de qualités avec des anciennes réfs, 20 tonnes","Je cherche du couché 2 faces en palette, max 600 €/T","Il me faudrait de l'autocopiant en laize 1000 mm"];
        const _hq0=document.getElementById('prodix-input');
        if(_hq0&&!window.matchMedia('(prefers-reduced-motion: reduce)').matches){
          let si=0,ci=0,del=false;
          const tick=()=>{
            // En CONVERSATION : plus de suggestions qui s'écrivent toutes
            // seules (21/07 Ethan) — placeholder sobre et fixe.
            if(document.getElementById('prodix-hero')?.classList.contains('phero-convo')){
              _hq0.placeholder='Répondez à PRODIX…';
              setTimeout(tick,1500);return;
            }
            if(_hq0.value){setTimeout(tick,900);return;}
            const s=_sugs[si];
            if(!del){
              ci++;_hq0.placeholder=s.slice(0,ci);
              if(ci>=s.length){del=true;setTimeout(tick,1700);return;}
              setTimeout(tick,42);
            }else{
              ci-=3;
              if(ci<=0){ci=0;del=false;si=(si+1)%_sugs.length;_hq0.placeholder='';setTimeout(tick,350);return;}
              _hq0.placeholder=s.slice(0,ci);
              setTimeout(tick,16);
            }
          };
          setTimeout(tick,900);
        }
        // Bascule accueil → interface conversation (partagée par message,
        // fichier joint et reprise d'historique).
        window._heroConvo=()=>{
          const heroEl=document.getElementById('prodix-hero');
          if(!heroEl||heroEl.classList.contains('phero-convo'))return;
          heroEl.classList.add('phero-convo');
          if(window._SAISIE_BASSE){heroEl.style.display='';window.scrollTo(0,0);}
          document.body.classList.add('phero-lock'); // page FIXE : seul le fil scrolle
          const lg=document.querySelector('.phero-logo');
          const bx=document.querySelector('.phero-box');
          const hist=document.getElementById('phero-hist');
          if(hist)hist.style.display='none';
          if(lg)lg.classList.add('phero-out');
          if(bx)bx.classList.add('phero-out');
          setTimeout(()=>{
            if(lg)lg.style.display='none';
            const panel=document.getElementById('phero-panel');
            panel.style.display='flex';
            panel.classList.add('phero-panel-in');
            if(bx){panel.appendChild(bx);bx.classList.remove('phero-out');}
          },210);
        };
        // La CONVERSATION se fait DANS le hero (18/07) : le chat remplace le
        // panda, le moteur PRODIX (_pxSend/_pxBulle) écrit dans #prodix-chat.
        window._heroGo=(t)=>{
          const i=document.getElementById('prodix-input');
          if(t&&i)i.value=t;
          if(!i||!i.value.trim())return;
          window.prodiTrack?.('prodix_hero_msg',{q:i.value.trim().slice(0,120)});
          window._heroConvo();
          _pxSend();
        };
        window._heroReset=()=>{
          _pxHist=[];
          const ch=document.getElementById('prodix-chat');if(ch)ch.innerHTML='';
          const i=document.getElementById('prodix-input');if(i)i.value='';
          const heroEl=document.getElementById('prodix-hero');
          heroEl.classList.remove('phero-convo');
          document.body.classList.remove('phero-lock');
          const _pnl=document.getElementById('phero-panel');
          _pnl.style.display='none';_pnl.classList.remove('phero-panel-in');
          {
            const _bxBack=document.querySelector('.phero-box');
            if(window._SAISIE_BASSE){
              document.getElementById('px-dock')?.appendChild(_bxBack);
              const _h2=document.getElementById('prodix-hero');
              if(_h2)_h2.style.display='none';
            } else {
              document.querySelector('.phero-inner').appendChild(_bxBack);
            }
          }
          const lg=document.querySelector('.phero-logo');if(lg)lg.style.display='';
          const hist=document.getElementById('phero-hist');if(hist)hist.style.display='';
          window._heroHistPaint&&window._heroHistPaint();
        };
        window._heroFill=(prods)=>{
          const withImg=(prods||[]).filter(p=>p.image_url);
          if(withImg.length<6)return;
          // Le VRAI design des cartes catalogue (grille étiquette), en décor
          const _mob=window.matchMedia('(max-width:820px)').matches;
          const _thumb=u=>'https://images.weserv.nl/?url='+encodeURIComponent(String(u).replace(/^https?:\/\//,''))+'&w='+(_mob?240:420)+'&q=72';
          const mk=p=>{
            const cell=(cap,val,span)=>`<div class="sc-cell"${span?` style="grid-column:span ${span};"`:''}><div class="sc-cap">${cap}</div><div class="sc-val">${val}</div></div>`;
            const isPal=_estFormat(p);
            let cells='';
            cells+=cell('GRAMMAGE',p.grammage?esc(p.grammage)+' <small>g/m²</small>':'—',2);
            if(isPal){
              cells+=cell('DIMENSIONS',p.largeur&&p.longueur?esc(mmToCm(Math.min(p.largeur,p.longueur))+' × '+mmToCm(Math.max(p.largeur,p.longueur)))+' <small>mm</small>':(p.largeur?esc(mmToCm(p.largeur))+' <small>mm</small>':'—'),2);
            }else{
              cells+=cell('LAIZE',p.largeur?esc(mmToCm(p.largeur))+' <small>mm</small>':'—',2);
            }
            cells+=cell('COULEUR',esc(p.couleur||'—'),2);
            cells+=cell('POIDS NET',p.poids_net?esc(Math.round(p.poids_net).toLocaleString('fr-FR'))+' <small>kgs</small>':'—',2);
            return `<div class="pcard sc-card phero-card"><div class="pcard-img"><img src="${_thumb(p.image_url)}" width="272" height="132" decoding="async" onerror="this.onerror=null;this.src='${safeUrl(p.image_url)}'" alt="" loading="lazy"></div><div class="sc-body"><div class="sc-grid"><div class="sc-cell sc-title" style="grid-column:span 4;">${esc(formatProductTitle(p.qualite,p.type))}</div>${cells}</div></div></div>`;
          };
          const CAP=_mob?6:12; // couche animee 2x plus etroite sur mobile = GPU iOS soulage
          const half=Math.min(CAP,Math.ceil(withImg.length/2));
          const a=withImg.slice(0,half);
          const bList=withImg.slice(half,half+CAP);
          const b=bList.length>=4?bList:a;
          // Anti-écart : la boucle translateX(-50%) n'est continue que si UNE
          // copie couvre au moins l'écran — sinon un trou balaie le rail à
          // chaque tour (vu avec 4 cartes = 1142px sur un écran 1440px). On
          // répète les cartes jusqu'à couvrir large, et chaque copie est
          // emballée dans un .phero-set (gap+padding intégrés) pour que -50%
          // tombe PILE sur le raccord (fini la tranche de carte de 9px).
          const _cw=(_mob?196:272)+18;
          const _need=Math.ceil((window.innerWidth+_cw)/_cw);
          const rep=list=>{let r=[...list];while(r.length<_need)r=r.concat(list);return r;};
          const setHtml=list=>'<div class="phero-set">'+rep(list).map(mk).join('')+'</div>';
          const p1=document.getElementById('phero-p1'),p2=document.getElementById('phero-p2');
          if(p1){const s=setHtml(a);p1.innerHTML=s+s;}
          if(p2){const s=setHtml(b);p2.innerHTML=s+s;}
          // SAFARI : les translateX en % des keyframes sont résolus au LANCEMENT
          // de l'animation — or elle démarre sur une piste vide (largeur 0) →
          // rail immobile / à-coups. On relance l'animation une fois remplie.
          [p1,p2].forEach(p=>{if(!p)return;p.style.animation='none';void p.offsetWidth;p.style.animation='';});
        };
      }

      // + bleu = choix du tonnage (plus d'ajout de page), pagination remplacée
      // par le scroll infini (sentinelle sous la grille).
      window.addPageToCart=()=>_openTonnage();
      const _pgEl=document.getElementById('pgrid');
      if(_pgEl){
        const _sent=document.createElement('div');
        _sent.id='scroll-sentinel';_sent.style.cssText='height:1px;';
        _pgEl.insertAdjacentElement('afterend',_sent);
        new IntersectionObserver(es=>{if(es[0].isIntersecting)_loadMore();},{rootMargin:'900px'}).observe(_sent);
      }
    }
  }
}
// Essai titres Bebas épaissis (18/07) : &bebas=1 (cumulable avec &apple=1)
if(_sharedMode&&new URLSearchParams(window.location.search).get('bebas')==='1')document.body.classList.add('bebas-view');
// Essai thème « Zara » (18/07) : &zara=1 sur un lien client
if(_sharedMode&&new URLSearchParams(window.location.search).get('zara')==='1')document.body.classList.add('zara-view');
// Essai thème « Amazon » (18/07) : &amazon=1 sur un lien client
if(_sharedMode&&new URLSearchParams(window.location.search).get('amazon')==='1')document.body.classList.add('amazon-view');
// Intro vue client : un container Prodiconseil arrive, les bobines en sortent.
// Couvre le temps de chargement ; clic = passer ; filet 8 s.
function _ctnSplash(){
  const d=document.createElement('div');
  d.id='ctn-splash';
  const _card=`<div class="ctn-item"><div class="ctn-card-img"></div><div class="ctn-card-bot"><div class="ctn-card-title"></div><div class="ctn-card-cells"><div class="ctn-cc"><b class="ctn-v1"></b></div><div class="ctn-cc"><b class="ctn-v2"></b></div><div class="ctn-cc"><b class="ctn-v3"></b></div></div></div></div>`;
  d.innerHTML=`
    <div class="ctn-scene">
      <div class="ctn-truck">
        <div class="ctn-cab"><i class="ctn-cab-win"></i></div>
        <div class="ctn-trailer"></div>
        <div class="ctn-box"><span class="ctn-logo"><img src="/img/logo.png?v=2" alt="Prodiconseil"></span></div>
        <i class="ctn-wheel" style="left:36px"></i><i class="ctn-wheel" style="left:118px"></i><i class="ctn-wheel" style="left:610px"></i><i class="ctn-wheel" style="left:680px"></i><i class="ctn-wheel" style="left:750px"></i>
      </div>
      ${[0,1,2].map(i=>`<div class="ctn-slide ctn-s${i}" data-card="${i}">${_card}</div>`).join('')}
      ${[0,1,2].map(i=>`<div class="ctn-drop ctn-d${i}" data-card="${i}">${_card}</div>`).join('')}
      <div class="ctn-fk">
        <div class="ctn-fk-mast"></div>
        <div class="ctn-fk-body"></div>
        <div class="ctn-fk-guard"></div>
        <i class="ctn-fk-wheel" style="left:54px"></i><i class="ctn-fk-wheel" style="left:206px"></i>
      </div>
    </div>`;
  document.body.appendChild(d);
  // Les vraies photos de la liste remplacent le kraft dès qu'elles arrivent.
  // Kraft en fallback SOUS l'image (background multiple : image AU-DESSUS du
  // gradient) : si la vignette weserv n'est pas décodée / 404, le kraft reste
  // visible — jamais de carte blanche. La photo n'est posée qu'une fois chargée.
  const _KRAFT='linear-gradient(160deg,#c9ab7f 0%,#b8946a 55%,#a98457 100%)';
  window._ctnFill=prods=>{
    if(!prods||!prods.length)return;
    d.querySelectorAll('[data-card]').forEach(w=>{
      const it=w.querySelector('.ctn-item');
      const p=prods[(+w.dataset.card)%prods.length];
      if(!p||!it)return;
      const box=it.querySelector('.ctn-card-img');
      if(box){
        box.style.background=_KRAFT; // fallback toujours posé d'abord
        // Perf 18/07 : vignette réduite (la carte intro fait ~200px) via imgThumb
        const src=imgThumb(p.image_url,240);
        if(src){
          const pose=()=>{box.style.background="url('"+src+"') center/cover, "+_KRAFT;};
          const im=new Image();
          im.src=src;
          // Anti-clignotement : les vignettes sont préchargées en amont
          // (_introPhotos) → cache. Si l'image est déjà complète, on pose le
          // fond SYNCHRONE (les 6 cartes dans la même frame) au lieu de 6
          // onload décalés qui font "clignoter" les cartes en plein vol.
          if(im.complete&&im.naturalWidth>0)pose();
          else im.onload=pose;
          // onerror : on ne touche pas → le kraft reste visible
        }
      }
      const t=it.querySelector('.ctn-card-title');
      if(t)t.textContent=formatProductTitle(p.qualite,p.type||p.format||'');
      const v=(cls,txt)=>{const e=it.querySelector(cls);if(e)e.textContent=txt;};
      v('.ctn-v1',p.grammage?p.grammage+' g':'');
      v('.ctn-v2',p.largeur?p.largeur+' mm':'');
      v('.ctn-v3',p.poids_net?Math.round(p.poids_net)+' kg':'');
    });
  };
  // Machine faible / reduced-motion : intro écourtée (la choré CSS est de toute
  // façon peu visible et coûteuse sur GPU faible ; on privilégie « voir vite »).
  const _lowPerf=(navigator.hardwareConcurrency||8)<=4
    || window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if(_lowPerf)d.classList.add('ctn-lite');
  const MIN_MS=_lowPerf?900:3200;   // était 6000 (choré finit ~3,3s côté CSS)
  const MAX_MS=_lowPerf?2500:4500;  // filet rapproché (était 8000)
  let minOk=false,dataOk=false;
  // À la fin du splash, les cartes de la liste ENTRENT en cascade (fondu + remontée)
  const reveal=()=>{
    document.querySelectorAll('#pgrid .pcard').forEach((c,i)=>{
      c.style.animationDelay=Math.min(i*70,1400)+'ms';
      c.classList.add('card-in');
    });
  };
  window._ctnReveal=reveal;
  const _rend=()=>{if(window._ctnRender){const f=window._ctnRender;window._ctnRender=null;f();}};
  // out() : on REND puis on arme la cascade DANS LA MÊME FRAME (les cartes
  // naissent à opacité 0 sous le splash — jamais peintes visibles avant la
  // cascade, sinon on voyait la grille puis les cartes ré-apparaissaient).
  // 2 rAF laissent le paint finir avant le fondu → pas de saccade pendant.
  const out=()=>{if(minOk&&dataOk&&d.parentNode){
    _rend();
    reveal();
    requestAnimationFrame(()=>requestAnimationFrame(()=>{
      if(!d.parentNode)return;
      d.classList.add('out');
      setTimeout(()=>d.remove(),450);
    }));
  }};
  setTimeout(()=>{minOk=true;out();},MIN_MS);
  window._ctnDone=()=>{dataOk=true;out();};
  // Skip au clic : rendu + cascade armés avant le paint, puis retrait du splash.
  d.onclick=()=>{_rend();reveal();requestAnimationFrame(()=>{if(d.parentNode)d.remove();});};
  // Filet réseau : même ordre, tout dans la même tâche (un seul paint).
  setTimeout(()=>{if(d.parentNode){_rend();reveal();d.remove();}},MAX_MS);
}
if(_sharedMode)_ctnSplash();
let _sharedAll=[];
// Le prix ne s'active plus via ?p=1 (retiré) — jamais de prix en vue client.
if(_priceMode)togglePriceMode(true);

async function loadSharedQuote(idsOverride){
  const rawIds=idsOverride||_shareParam;
  if(!rawIds)return;
  document.title='Prodiconseil — Liste produit client';
  // Stored values are product `ref` (e.g. "Photo_919465"), stable across daily
  // imports. Legacy rows containing numeric IDs simply won't resolve — they
  // were already broken by the morning DELETE+INSERT anyway.
  const refList=rawIds.split(',').map(s=>s.trim()).filter(Boolean);
  if(!refList.length)return;
  const r=await sbQ('products?ref=in.('+refList.map(encodeURIComponent).join(',')+')&select=*&limit=200&order=gsm.asc');
  if(!r.data||!r.data.length){
    const sqb=document.getElementById('shared-quote-banner');
    if(sqb){
      sqb.innerHTML='<div class="sq-inner sq-slim"><span class="sq-slim-label">⚠️ Ce lien a expiré — merci de contacter votre commercial pour une nouvelle liste.</span></div>';
      sqb.style.display='block';
    }
    _sharedMode=false;_sharedViewUI(false);_loadingProducts=true;window._ctnDone?.();
    _doFilter();
    return;
  }
  const products=r.data;
  _loadingProducts=false;
  // Intro : ne featurer QUE des articles dont la photo CHARGE vraiment.
  // image_url != null ne suffit pas (stock.prodi.net renvoie des 404 → carte
  // blanche/kraft). On précharge les vignettes candidates et on ne garde que
  // celles qui chargent ; bonus : préchargées = posées sans jank par _ctnFill.
  (function _introPhotos(){
    const cands=products.filter(p=>p.image_url).slice(0,12).map(rowToUi);
    if(!cands.length){window._ctnFill?.([]);return;}
    const ok=[]; let left=cands.length, flushed=false;
    const flush=()=>{if(flushed)return;flushed=true;window._ctnFill?.(ok.length?ok:cands.slice(0,3));};
    cands.forEach(p=>{
      const im=new Image();
      const settle=good=>{if(good)ok.push(p);if(ok.length>=6||--left<=0)flush();};
      im.onload=()=>settle(true);
      im.onerror=()=>settle(false);
      im.src=imgThumb(p.image_url,240);
    });
    setTimeout(flush,1500); // filet : ne pas attendre les photos lentes
  })();

  // Vue client ASSEMBLÉE (rebranché 22/07, demande Ethan) : une carte par lot
  // d'équivalents (badge × N, POIDS TOTAL) — la liste, l'Excel et les
  // compteurs gardent chaque unité.
  const units=products.map(rowToUi);
  all=groupProducts(units).map(g=>({
    ...g._proto,
    _grpCount:g.count,
    _grpTotalWeight:g.totalWeight,
    _grpMandrins:Array.from(g.mandrins),
    _grpDepots:Array.from(g.depots),
    _grpUsines:Array.from(g.usines),
    _grpUnitIds:g.units.map(u=>u.id),
    _grpRefs:g.units.map(u=>u.ref),
    _grpKey:g.gid,
    _grpProtoId:g.proto_id
  }));
  _sharedAll=all.slice();
  _totalCount=all.length;
  _maxKnownPage=1; // vue client : tout sur UNE page (listes 40-60 T)
  currentPage=1;
  _viewMode='grid'; // vue fiches uniquement (tableau retiré 18/07)
  // Bouton − de retrait RETIRÉ de la vue client (18/08 Ethan, « la poubelle
  // ne sert à rien ») — annule l'ouverture à tous du 07/08.
  window._sharedEdit=false;

  const totalKg=units.reduce((s,p)=>s+(+p.weight||0),0);
  const rbarRefs=document.getElementById('rbar-refs');
  const rbarTons=document.getElementById('rbar-tons');
  _rbarSharedCounts(units);
  if(rbarTons)rbarTons.textContent=(totalKg/1000).toFixed(1);

  // Show a subtle top label (not a big banner)
  const sqb=document.getElementById('shared-quote-banner');
  if(sqb)sqb.style.display='none';

  window._sharedProducts=products;
  // Auto-populate client's selection with shared products
  cart=units.map(p=>({id:p.id,name:p.name,ref:p.ref,type:p.type,qualite:p.qualite||null,details:p.details||null,grammage:p.grammage,largeur:p.largeur,format:p.format,poids_net:p.poids_net,price:p.price||null,img:p.image_url||null,couleur:p.couleur||null,usine:p.usine||null,zone:p.zone||null,emplacement:p.emplacement||null,allee:p.allee||null,reserve_client:p.reserve_client||null}));
  localStorage.setItem('prodi_cart',JSON.stringify(cart));
  updateCartBadge();
  renderDrawer();
  // Perf intro (19/07) : le rendu des 40-60 cartes + décodage photos saturait
  // le main thread PENDANT la chorégraphie (départs d'animations en retard =
  // saccades). On le diffère à la fin du splash.
  if(document.getElementById('ctn-splash')){window._ctnRender=()=>{render(all);setTimeout(_excelPopup,700);};}
  else{render(all);setTimeout(_excelPopup,400);}
  _updatePager();
  // _buildSharedTabs(); // onglets Bobines/Formats retirés (18/07) — code conservé
  // Header vue client : le bouton Liste devient l'export Excel direct
  const _cb=document.getElementById('cart-btn');
  if(_cb){
    _cb.onclick=function(){exportListExcelTest(this).catch(()=>toast('Erreur export'));};
    _cb.title='Télécharger la liste Excel';
    const _cbSvg=_cb.querySelector('svg,img');
    if(_cbSvg)_cbSvg.outerHTML='<svg width="30" height="30" viewBox="0 0 32 32" style="flex-shrink:0;"><rect x="9" y="2" width="21" height="14" rx="3.5" fill="#8bd47e"/><rect x="20" y="2" width="10" height="14" rx="3.5" fill="#b9e695"/><path d="M9 9h17.5A3.5 3.5 0 0 1 30 12.5V26.5a3.5 3.5 0 0 1-3.5 3.5H12.5A3.5 3.5 0 0 1 9 26.5Z" fill="#2f9e55"/><rect x="2" y="12" width="16" height="16" rx="3.5" fill="#185c37"/><path d="M6.4 16.5h2.7l1.8 3.2 1.8-3.2h2.7l-3.1 4.7 3.2 4.8h-2.8l-1.8-3.3-1.9 3.3H6.2l3.2-4.8z" fill="#fff"/></svg>';
    const _cbTxt=_cb.querySelector('.btn-panier-txt');
    if(_cbTxt){_cbTxt.textContent='Télécharger';_cbTxt.style.whiteSpace='nowrap';} // taille via CSS shared-view (18.5px comme Album photo)
    const _cbSv2=_cb.querySelector('svg');
    if(_cbSv2)_cb.appendChild(_cbSv2); // logo à DROITE du texte
    const _cbBdg=_cb.querySelector('.cart-badge');
    if(_cbBdg)_cbBdg.style.display='none'; // plus de pastille compteur
  }
  // _buildSharedInfo(units); // panneau infos retiré (18/07) — code conservé
  window._ctnDone?.();

  // Lock shared mode — filters & search work only within the selection
}

function confirmClearCart(){
  document.getElementById('confirm-bg').classList.add('show');
}
function doClearCart(){
  cart=[];localStorage.removeItem('prodi_cart');
  document.getElementById('confirm-bg').classList.remove('show');
  updateCartBadge();renderDrawer();
  // Reset all "Ajouté" buttons in current view
  document.querySelectorAll('.btn-add-cart.added').forEach(b=>{
    b.classList.remove('added');
    if(b.classList.contains('grp-add-btn')){
      const gid=b.closest('[data-gid]')?.dataset.gid;
      const n=gid?(_groupQty[gid]||1):1;
      b.textContent=`+ Ajouter ${n}`;
    } else {
      b.textContent='+ Ajouter';
    }
  });
  document.querySelectorAll('.plist-add.added').forEach(b=>{b.classList.remove('added');b.textContent='+';});
  document.querySelectorAll('.plist-grp-add.added').forEach(b=>{b.classList.remove('added');b.textContent='+';});
  toast('🗑️ Liste vidée');
}

function openCartDrawer(){
  renderDrawer();
  document.getElementById('drawer-overlay').classList.add('show');
  document.getElementById('cart-drawer').classList.add('show');
  document.body.classList.add('drawer-open');
}
function closeCartDrawer(){
  document.getElementById('drawer-overlay').classList.remove('show');
  document.getElementById('cart-drawer').classList.remove('show');
  document.body.classList.remove('drawer-open');
}

function renderDrawer(){
  const items=document.getElementById('drawer-items');
  const footer=document.getElementById('drawer-footer');
  const meta=document.getElementById('drawer-meta');
  if(!cart.length){
    items.innerHTML=`<div class="drawer-empty"><div class="drawer-empty-s">${'Ajoutez des produits depuis le catalogue'}</div><button class="btn-drawer-browse" onclick="closeCartDrawer()">${'← Voir le catalogue'}</button></div>`;
    footer.style.display='none';
    meta.textContent='0 '+('produit');
    return;
  }
  const ton=cart.reduce((s,p)=>s+(p.qty_kg??(p.poids_net||0)),0);
  meta.textContent=cart.length+' '+('produit'+(cart.length>1?'s':''));
  document.getElementById('drawer-total').textContent=fmt(ton);
  const _dic=document.getElementById('drawer-items-count');if(_dic)_dic.textContent=cart.length+' '+('produit'+(cart.length>1?'s':''));
  const prRow=document.getElementById('drawer-price-row');
  if(prRow){
    if(_priceMode){
      const _totalEst=cart.reduce((s,p)=>{const _f=all.find(x=>x.id===+p.id)||p;return s+(p.qty_kg??(p.poids_net||0))*(_f.price||0);},0);
      prRow.style.display=_totalEst?'':'none';
      const prVal=document.getElementById('drawer-price-val');
      if(prVal)prVal.textContent=_ccyNum(_totalEst)+' '+_ccySym();
    } else { prRow.style.display='none'; }
  }
  footer.style.display='block';
  items.innerHTML=cart.map(p=>{
    const qkg=p.qty_kg??(p.poids_net||0);
    const step=Math.max(1,Math.round(p.poids_net||100));
    const _pFull=all.find(x=>x.id===+p.id)||p;
    const _resaClient=p.reserve_client||_pFull.reserve_client||null; // cadenas orange si réservé (Sage)
    const _qualite=p.qualite||_pFull.qualite||null;
    const _details=p.details||_pFull.details||null;
    const ciTitle=formatProductTitle(_qualite,p.name);
    const _ciSum=getProductDetailText(_pFull);
    const lot=p.ref?String(p.ref).replace(/^Photo_/i,'').trim()||null:null;
    const imgSrc=p.img||p.image_url||(all.find(x=>x.id===+p.id)?.image_url)||null;
    const _emp=p.emplacement||_pFull.emplacement||null;
    const _zone=p.zone||_pFull.zone||null;
    const _ref=p.ref||_pFull.ref||null;
    const _isSiderunD=_ref&&/^Photo_DU/i.test(String(_ref));
    const _isFabD=_ref&&/^Photo_FAB/i.test(String(_ref))&&_emp!=='OUR WAREHOUSE';
    const _fallback=_isSiderunD?'/img/siderun-sur-demande.png':_isFabD?'/img/fabrication-sur-demande.png':'/img/no-photo.png';
    const imgHtml=imgSrc?`<img src="${imgThumb(imgSrc,160)}" loading="lazy" decoding="async" onerror="if(!this._o){this._o=1;this.src='${safeUrl(imgSrc)}';}else{this.src='${esc(_fallback)}';}">`:`<img src="${esc(_fallback)}" alt="" loading="lazy">`;
    return`<div class="ci" id="ci-${numId(p.id)}" onclick="_ciOpenDetail(${numId(p.id)})" style="cursor:pointer">
      <div class="ci-img">${imgHtml}</div>
      <div class="ci-body">
        ${(()=>{const _fmtQ=_estFormat(_pFull);const _dimv=_fmtQ?(_pFull.largeur&&_pFull.longueur?mmToCm(Math.min(_pFull.largeur,_pFull.longueur))+' × '+mmToCm(Math.max(_pFull.largeur,_pFull.longueur))+' <small>mm</small>':(_pFull.largeur?mmToCm(_pFull.largeur)+' <small>mm</small>':'—')):(_pFull.largeur?mmToCm(_pFull.largeur)+' <small>mm</small>':'—');const _c=(cap,val)=>`<div class="cie-cell"><div class="cie-cap">${cap}</div><div class="cie-val">${val}</div></div>`;const _prix=_priceMode&&_pFull.price?_ccyNum(_pFull.price*1000)+' '+_ccyUnit():null;const _cpSvg='<svg width="10" height="10" viewBox="0 0 16 16" fill="none"><rect x="5" y="5" width="9" height="9" rx="1.5" stroke="currentColor" stroke-width="1.6"/><path d="M3 11H2a1 1 0 01-1-1V2a1 1 0 011-1h8a1 1 0 011 1v1" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/></svg>';const _refCell=`<div class="cie-cell cie-ref"${_prix?'':' style="grid-column:span 2"'}${lot?` onclick="event.stopPropagation();navigator.clipboard.writeText(${attrJs(lot)}).then(()=>toast('📋 Réf. copiée'))"`:''}><div class="cie-cap">${'RÉFÉRENCE'}</div><div class="cie-val">${lot?esc(lot)+_cpSvg:'—'}</div></div>`;const _prixCell=_prix?`<div class="cie-cell cie-prix"><div class="cie-cap">PRIX</div><div class="cie-val">${esc(_prix)}</div></div>`:'';const _lockHtml=_resaClient?`<span class="cie-lock" title="Réservé${typeof _resaClient==='string'?' — '+esc(_resaClient):''}"><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#ea8600" stroke-width="2.3" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg></span>`:'';return `<div class="cie-grid cie-g4"><div class="cie-cell cie-title">${_lockHtml}<span class="cie-title-txt">${esc(ciTitle)}</span><button class="ci-rm cie-rm" onclick="event.stopPropagation();removeFromCart(${numId(p.id)})" aria-label="${'Retirer'}">${_trashSvg}</button></div>${_c('GRAMMAGE',p.grammage?esc(p.grammage)+' <small>g/m²</small>':'—')+_c(_fmtQ?'DIMENSIONS':'LAIZE',_dimv)+_c('COULEUR',esc(_pFull.couleur||p.couleur||'—'))+_c('POIDS',qkg?esc(Math.round(qkg).toLocaleString('fr-FR'))+' <small>kgs</small>':'—')}${_refCell}${_prixCell}</div>`;})()}
      </div>
      <div class="ci-confirm" id="ci-confirm-${numId(p.id)}" onclick="event.stopPropagation()">
        <span>${'Retirer cet article\u00a0?'}</span>
        <button class="ci-confirm-no" onclick="event.stopPropagation();ciCancelRemove(${numId(p.id)})">${'Annuler'}</button>
        <button class="ci-confirm-yes" onclick="event.stopPropagation();removeFromCart(${numId(p.id)})">${'Retirer'}</button>
      </div>
    </div>`;
  }).join('');
}
function _ciOpenDetail(id){
  _detSource='cart'; // les flèches navigueront dans le panier (haut→bas = next/right)
  openDetail(id);
}
const _trashSvg=`<svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M2 4h12M5.333 4V2.667A1.333 1.333 0 016.667 1.333h2.666A1.333 1.333 0 0110.667 2.667V4m2 0-.667 9.333A1.333 1.333 0 0110.667 14.667H5.333A1.333 1.333 0 014 13.333L3.333 4h9.334z" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>`;
function ciQty(id,delta){
  const p=cart.find(x=>x.id===+id);if(!p)return;
  const cur=p.qty_kg??(p.poids_net||100);
  p.qty_kg=Math.max(1,Math.round(cur+delta));
  localStorage.setItem('prodi_cart',JSON.stringify(cart));
  renderDrawer();updateCartBadge();
}
function ciQtySet(id,val){
  const p=cart.find(x=>x.id===+id);if(!p)return;
  const v=Math.max(1,parseFloat(val)||1);
  if((p.qty_kg??p.poids_net)===Math.round(v))return;
  p.qty_kg=Math.round(v);
  localStorage.setItem('prodi_cart',JSON.stringify(cart));
  renderDrawer();updateCartBadge();
}
function ciConfirmRemove(id){
  const el=document.getElementById('ci-confirm-'+id);if(el)el.classList.add('show');
}
function ciCancelRemove(id){
  const el=document.getElementById('ci-confirm-'+id);if(el)el.classList.remove('show');
}

function openCartProforma(){
  document.getElementById('pf-cart-count').textContent=cart.length;
  const subEl=document.getElementById('pf-cart-sub');
  if(subEl)subEl.innerHTML=('Demande groupée — ')+'<span id="pf-cart-count">'+cart.length+'</span> '+('produit(s)');
  document.getElementById('pf-cart-items').innerHTML=cart.map(p=>`<div class="pf-item-line">▪ ${esc(p.name)}${(p.ref&&!p.ref.startsWith('Photo_'))?' ('+esc(p.ref)+')':''} — ${esc(fmt(p.poids_net))}</div>`).join('');
  document.getElementById('proforma-cart-bg').classList.add('show');
}
function closeCartProforma(){document.getElementById('proforma-cart-bg').classList.remove('show');}

async function sendCartProforma(){
  // Honeypot anti-bot: hidden field should remain empty for real users.
  // On hit, fake the success path so the bot can't tell accept vs reject.
  if(document.getElementById('pfc-hp')?.value){
    closeCartProforma();
    toast('✅ Demande envoyée');
    return;
  }
  const nom=document.getElementById('pfc-nom').value.trim();
  const tel=document.getElementById('pfc-tel').value.trim();
  let ok=true;
  validateField('fg-pfc-nom',!!nom,'Champ requis'); if(!nom)ok=false;
  if(!tel){const e=document.getElementById('fg-pfc-tel-err');if(e)e.style.display='block';ok=false;}else{const e=document.getElementById('fg-pfc-tel-err');if(e)e.style.display='none';}
  if(!ok)return;
  const userMsg=document.getElementById('pfc-msg').value.trim();
  const btn=document.getElementById('pfc-btn');btn.disabled=true;btn.textContent='ENVOI...';
  try{
    const msg='Panier : '+cart.map(p=>`${p.name}${p.ref?' ('+p.ref+')':''} — ${fmt(p.poids_net)}`).join(' | ')+(userMsg?' | '+userMsg:'');
    const savedCart=[...cart];
    for(const p of savedCart){
      await sbQ('proforma_requests',{method:'POST',body:{product_id:p.id,nom,telephone:tel,message:msg,statut:'nouveau'},headers:{'Prefer':'return=minimal'}}).catch(()=>{});
      window.prodiTrack?.('devis_envoye',{ref:p.ref});
    }
    btn.disabled=false;btn.textContent='➤';
    closeCartProforma();doClearCart();closeCartDrawer();
    try{ _ejsReady().then(()=>emailjs.send(EJS_SVC, EJS_TPL, { from_name:nom, message:`Tél: ${tel}\n${msg}` })); }catch(_){}
    toast('✅ Demande envoyée pour '+savedCart.length+' produit(s) !',4000);
    ['pfc-nom','pfc-tel','pfc-msg'].forEach(id=>{const el=document.getElementById(id);if(el)el.value='';});
  }catch(err){
    btn.disabled=false;btn.textContent='➤';
    toast('❌ Erreur envoi — réessayez');
    console.error('sendCartProforma error:',err);
  }
}

/// Keyboard: close drawer on Escape
// Reposition open panels on scroll (throttled)
let _scrollTick=false;
document.addEventListener('scroll',()=>{
  if(_scrollTick)return;
  _scrollTick=true;
  requestAnimationFrame(()=>{
    document.querySelectorAll('.msd-panel.show').forEach(panel=>{
      const wrapper=panel.closest('.msd')||panel.closest('.fb-msd');
      if(!wrapper)return;
      const id=wrapper.id;
      const btn=document.querySelector(`#${id} .msd-btn`)||document.querySelector(`#${id} .fb-msd-btn`);
      if(btn){const r=btn.getBoundingClientRect(),z=_zf();panel.style.top=((r.bottom+4)/z)+'px';panel.style.left=(r.left/z)+'px';}
    });
    _scrollTick=false;
  });
},true);
document.addEventListener('keydown',e=>{
  if(e.key==='Escape'){
    closeCartDrawer();closeDetail();closeProforma();closeCartProforma();
    document.getElementById('confirm-bg').classList.remove('show');
  }
});

// ── NEW FILTER BAR FUNCTIONS ──

function scheduleFilter(){
  filterProducts();
}

// Sync sidebar input → hidden filter-bar input (which _fetchAndRender reads)
function syncSbFilter(targetId, val){
  const t=document.getElementById(targetId);
  if(t)t.value=val;
  filterProducts();
}

// Dual range slider config
const NMR_IDS={
  gsm:['f-gmin','f-gmax','f-gmin-fb','f-gmax-fb'],
  lz:['f-lmin','f-lmax','f-lmin-fb','f-lmax-fb'],
  long:['f-longmin','f-longmax'],
  prix:['f-pmin','f-pmax','f-pmin-fb','f-pmax-fb'],
  usine:['f-usine'],
};
function nmReset(id){
  (NMR_IDS[id]||[]).forEach(fid=>{const e=document.getElementById(fid);if(e)e.value='';});
  filterProducts();
}
function drsResetAll(){Object.keys(NMR_IDS).forEach(id=>nmReset(id));}
// Run after catalogue init (which itself runs on DOMContentLoaded)
window.addEventListener('load',async()=>{
  if(_shareCode){
    // Resolve short code → cart_ids, then load inline (no page reload)
    try{
      const r=await sbQ('shared_carts?code=eq.'+encodeURIComponent(_shareCode)+'&select=cart_ids&limit=1');
      if(r.data&&r.data[0]){
        loadSharedQuote(r.data[0].cart_ids);
      } else {
        // Code not found — fallback to normal catalogue
        _sharedMode=false;_sharedViewUI(false);_loadingProducts=true;window._ctnDone?.();
        _doFilter();
      }
    }catch(e){ _sharedMode=false;_sharedViewUI(false);_loadingProducts=true;window._ctnDone?.(); _doFilter(); }
  } else if(_shareParam){
    loadSharedQuote();
  } else if(_editParam){
    // « Modifier » : catalogue normal + panier pré-rempli depuis la liste.
    _loadEditList(_editParam);
  } else if(_refParam){
    // Scan QR étiquette → ouvre direct la fiche produit. Le catalogue charge
    // normalement en arrière-plan pour la navigation post-scan.
    openProductByRef(_refParam);
  }
});

// Ouvre la fiche détail d'un produit identifié par sa `ref` (ex. "Photo_919465").
// Utilisé par le flow QR étiquette (`?ref=`). Le produit peut ne PAS être dans
// `all` (catalogue filtré, ou pas encore chargé) → on fetch direct par ref,
// on injecte dans `all`, puis on openDetail.
async function openProductByRef(ref){
  const r=await sbQ('products?ref=eq.'+encodeURIComponent(ref)+'&select=*&limit=1');
  if(!r.data||!r.data.length){
    // Produit non trouvé : import du matin pas encore passé, ou produit retiré
    // du stock Sage. On laisse l'utilisateur sur le catalogue normal avec
    // une notice.
    const sqb=document.getElementById('shared-quote-banner');
    if(sqb){
      sqb.innerHTML='<div class="sq-inner sq-slim"><span class="sq-slim-label">⚠️ Cette référence n\'est pas (ou plus) disponible dans le catalogue actuel.</span></div>';
      sqb.style.display='block';
    }
    return;
  }
  const ui=rowToUi(r.data[0]);
  if(!all.find(x=>x.id===ui.id))all.push(ui);
  openDetail(ui.id);
}

function updateFilterVisibility(){
  _fafBump();
  const bobine=
    document.getElementById('fb-bobine')?.classList.contains('active')||
    !!document.querySelector('.fpill[data-format="Bobine"].active');
  const palette=
    document.getElementById('fb-palette')?.classList.contains('active')||
    !!document.querySelector('.fpill[data-format="Palette"].active');
  // Only Bobine → hide Longueur, show Mandrin
  // Only Palette → hide Mandrin, show Longueur; rename Laize → Largeur
  // Both or neither → show all
  // Sans pilules Bobine/Format (topbar 18/07), on déduit du STOCK réel du
  // type choisi : un type 100 % formats (ex. SBOA) cache Laizes/Mandrins/Ø,
  // un type 100 % bobines cache Formats.
  let stockBobine=false,stockPalette=false;
  if(typeof _allProductsCache!=='undefined'&&_allProductsCache&&msdState['msd-type']&&msdState['msd-type'].size>0&&!bobine&&!palette){
    for(const r of _allProductsCache){
      if(!_matchesActiveFilters(r,''))continue;
      // format NULL = bruit de données (97 réfs) : ignoré pour la déduction,
      // sinon 3 lignes ROFF sans format font apparaître le menu Formats.
      const _f=(r.format||'').trim();
      if(_f==='Bobine')stockBobine=true;else if(_f)stockPalette=true;
      if(stockBobine&&stockPalette)break;
    }
  }
  const onlyBobine = (bobine && !palette)||(stockBobine&&!stockPalette);
  const onlyPalette = (palette && !bobine)||(stockPalette&&!stockBobine);
  // Les filtres SPÉCIFIQUES bobine/format restent CACHÉS tant qu'on n'a pas
  // choisi Bobine, Format ou un Type de papier (17/07).
  const typeChoisi = !!(msdState['msd-type'] && msdState['msd-type'].size > 0);
  const unlocked = bobine || palette || typeChoisi;
  // 21/07 (Ethan) : sélection 100 % bobine (types R*, pseudos RCOL inclus) →
  // le menu Dimensions QUITTE la barre principale et vit dans Filtres avancés
  // (utile pour les quelques palettes présentes dans une famille bobine).
  const _selTypes=[...(msdState['msd-type']||new Set())];
  const _isR=v=>v==='Offset Couleur'||v==='Dossier Couleur'||(typeof v==='string'&&v[0]==='R');
  const _dimsBefore=!!window._dimsInAdv;
  window._dimsInAdv=_selTypes.length>0&&_selTypes.every(_isR);
  // 21/07 (Ethan) : le menu COULEURS ne reste dans la barre que pour les 3
  // familles couleur (RCOL offset/dossier, SCOL) — sinon il vit dans Filtres
  // avancés (colorer un offset blanc = cas rare, la barre respire).
  // 31/07 (Ethan) : caché aussi À L'ARRIVÉE (aucun type choisi).
  const _isCoul=v=>v==='RCOL'||v==='SCOL'||_isCouleurPseudo(v);
  const _coulBefore=!!window._coulInAdv;
  window._coulInAdv=!_selTypes.some(_isCoul);
  const _coulWrap=document.getElementById('sb-msd-couleur')?.parentElement;
  if(_coulWrap)_coulWrap.style.display=window._coulInAdv?'none':'';
  if(_dimsBefore!==window._dimsInAdv||_coulBefore!==window._coulInAdv)window._paintAdv&&window._paintAdv();
  const showLongueur = unlocked && !onlyBobine;
  const showMandrin  = unlocked && !onlyPalette;
  const laizeLbl = onlyPalette ? 'Largeur' : 'Laize';
  // Filter bar
  const show = (id,v) => { const el=document.getElementById(id); if(el) el.style.display=v?'':'none'; };
  show('fb-sec-longueur', showLongueur);
  show('fb-sep-longueur', showLongueur);
  show('fb-sep-mandrin',  showMandrin);
  const msdMandrin=document.getElementById('msd-mandrin');
  if(msdMandrin) msdMandrin.style.display=showMandrin?'':'none';
  const fbLaizeLbl=document.getElementById('fb-laize-lbl');
  if(fbLaizeLbl) fbLaizeLbl.textContent=laizeLbl;
  // Sidebar
  show('sb-sec-longueur', unlocked && !onlyPalette);
  show('sb-sec-mandrin',  showMandrin);
  show('sb-sec-format',   unlocked && !onlyBobine && !window._dimsInAdv);
  show('sb-sec-laize',    unlocked && !onlyPalette);
  const sbLbl=document.getElementById('sb-laize-lbl');
  if(sbLbl) sbLbl.firstChild.textContent=laizeLbl+' ';
  // Mobile drawer
  // Tiroir mobile (26/08) : les filtres avancés (Mandrin/Laizes/Diamètre) sont
  // TOUJOURS visibles, comme les lignes « Filtres avancés » du rail desktop.
  show('mob-sec-longueur', true);
  show('mob-sec-mandrin',  true);
  show('mob-sec-format',   unlocked && !onlyBobine && !window._dimsInAdv);
  show('mob-sec-laize',    true);
  const mobLbl=document.getElementById('mob-laize-title');
  if(mobLbl) mobLbl.textContent=laizeLbl+' (mm)';
}

function toggleFbPill(btnId,type){
  const mappings={
    'fb-bobine':{oldId:'pill-bobine',type:'bobine'},
    'fb-palette':{oldId:'pill-palette',type:'palette'},
    'fb-recyc':{oldId:'pill-recyc',type:'recyc'},
    'fb-fab':{oldId:'pill-fab',type:'fab'}
  };
  const m=mappings[btnId];
  if(!m)return;
  const oldPill=document.getElementById(m.oldId);
  const fbPill=document.getElementById(btnId);
  if(!fbPill)return;
  const isActive=fbPill.classList.toggle('active');
  if(oldPill){oldPill.classList.toggle('active',isActive);}
  updateFilterVisibility();
  filterProducts();
}

function toggleFbMsd(wrapperId){
  const wrap=document.getElementById(wrapperId);
  if(!wrap)return;
  const btn=wrap.querySelector('.fb-msd-btn');
  const panel=wrap.querySelector('.msd-panel');
  if(!panel||!btn)return;
  const isOpen=panel.classList.contains('show');
  // Close all
  document.querySelectorAll('.fb-msd-btn.open,.msd-btn.open').forEach(b=>b.classList.remove('open'));
  document.querySelectorAll('.msd-panel.show').forEach(p=>p.classList.remove('show'));
  _flushFacetsApresFermeture();
  if(!isOpen){
    btn.classList.add('open');
    const rect=btn.getBoundingClientRect();
    panel.style.top=(rect.bottom+4)+'px';
    panel.style.left=rect.left+'px';
    panel.classList.add('show');
    let hint=panel.querySelector('.msd-scroll-hint');
    if(!hint){hint=document.createElement('div');hint.className='msd-scroll-hint';panel.appendChild(hint);}
    hint.classList.toggle('hidden',panel.scrollHeight<=panel.clientHeight+10);
    panel.onscroll=()=>{if(hint)hint.classList.toggle('hidden',panel.scrollTop+panel.clientHeight>=panel.scrollHeight-10);};
  }
}

function toggleMobSearch(){
  const bar=document.querySelector('.mob-search-bar');
  if(!bar) return;
  const opening=!bar.classList.contains('show');
  bar.classList.toggle('show');
  if(opening){
    const inp=document.getElementById('search-input-mob');
    if(inp) setTimeout(()=>inp.focus(),50);
  }
}
function syncFilterPills(){
  // Aligne TOUTES les pills (header + drawer mobile) sur les états sources de vérité.
  // Les comparaisons `''===dataset.x` sont sûres : aucune pill n'a un data-* vide.
  document.querySelectorAll('.fpill[data-format]').forEach(b=>b.classList.toggle('active',_formatFilter===b.dataset.format));
  document.querySelectorAll('.fpill-photo').forEach(b=>b.classList.toggle('active',_photoFilter===b.dataset.photo));
  updateFilterVisibility(); // resync des sections bobine/format (tags, 18/07)
}
function openFilterDrawer(){
  syncFilterPills(); // Évite que les pills du drawer soient désync avec l'état réel
  document.getElementById('filter-drawer').classList.add('open');
  document.getElementById('filter-drawer-overlay').classList.add('show');
  document.body.style.overflow='hidden';
}
function closeFilterDrawer(){
  document.getElementById('filter-drawer').classList.remove('open');
  document.getElementById('filter-drawer-overlay').classList.remove('show');
  document.body.style.overflow='';
}
function toggleFdSection(headEl){
  headEl.parentElement.classList.toggle('open');
}
function syncMobFilter(destId,srcId){
  const src=document.getElementById(srcId);
  const dest=document.getElementById(destId);
  if(src&&dest){dest.value=src.value;filterProducts();}
}
function updateMobFilterBadge(){
  const n=countActiveFilters();
  const badge=document.getElementById('mob-filter-count');
  if(badge){badge.textContent=n;badge.style.display=n>0?'':'none';}
}
function countActiveFilters(){
  let n=0;
  if(document.getElementById('fb-bobine')?.classList.contains('active'))n++;
  if(document.getElementById('fb-palette')?.classList.contains('active'))n++;
  if(document.getElementById('fb-recyc')?.classList.contains('active'))n++;
  if(document.getElementById('fb-fab')?.classList.contains('active'))n++;
  if(document.getElementById('f-gmin')?.value)n++;
  if(document.getElementById('f-gmax')?.value)n++;
  if(document.getElementById('f-lmin')?.value)n++;
  if(document.getElementById('f-lmax')?.value)n++;
  if(document.getElementById('f-pmin')?.value)n++;
  if(document.getElementById('f-pmax')?.value)n++;
  ['msd-type','msd-mandrin','msd-couleur'].forEach(id=>{
    if(msdState[id]&&msdState[id].size>0)n++;
  });
  return n;
}
function hasActiveFilters(){return countActiveFilters()>0;}


updateCartBadge();
if(cart.length)renderDrawer();
init();


function selectTypeTile(typeName){
  const state = msdState['msd-type'];
  if(state.has(typeName)) state.delete(typeName);
  else state.add(typeName);
  ['msd-type','sb-msd-type','msd-type-mob'].forEach(msdId=>{
    const el=document.getElementById(msdId);
    if(!el) return;
    el.querySelectorAll('.msd-option').forEach(o=>{
      o.classList.toggle('selected', state.has(o.dataset.val));
    });
  });
  updateMsdBtn('msd-type');
  updateTilesActiveState();
  filterProducts();
}

let _typeTilesData=null;
function updateTilesActiveState(){
  if(!_typeTilesData) return;
  const state = msdState['msd-type'];
  document.querySelectorAll('.type-tile').forEach(tile=>{
    const name = tile.querySelector('.tile-name')?.textContent;
    if(name) tile.classList.toggle('active', state.has(name));
  });
}

// Sync results-bar sticky top to actual header height
function syncResultsBarTop(){
  const h=document.querySelector('header');
  const rb=document.getElementById('results-bar');
  if(h&&rb) rb.style.top=h.offsetHeight+'px';
}
syncResultsBarTop();
window.addEventListener('resize',syncResultsBarTop);


// ── SCAN QR ──────────────────────────────────────────────────────────────────
// Caméra → BarcodeDetector (natif) ou jsQR (fallback CDN) → match `ref` dans
// `all[]` (tolère le préfixe Photo_) → addToCart(p.id). Mode rafale : on garde
// la caméra active, debounce 1.2s entre scans pour ne pas re-trigger sur le
// même tag.
let _scanStream=null, _scanRaf=null, _scanLast=0, _scanLastRef='', _scanDetector=null, _scanCanvas=null, _scanAborted=false;

async function openScanModal(){
  const modal=document.getElementById('scan-modal');
  if(!modal)return;
  modal.classList.add('open');
  modal.setAttribute('aria-hidden','false');
  const hist=document.getElementById('scan-history');
  if(hist)hist.innerHTML='';
  _setScanStatus('Demande d\'accès caméra…');
  _scanAborted=false;
  _scanLast=0; _scanLastRef='';
  try{
    _scanStream=await navigator.mediaDevices.getUserMedia({video:{facingMode:{ideal:'environment'}}});
    const v=document.getElementById('scan-video');
    v.srcObject=_scanStream;
    await v.play();
    _setScanStatus('Pointe la caméra vers un QR…');
    _scanLoop();
  }catch(e){
    _setScanStatus('Erreur caméra : '+(e&&(e.message||e.name)||'inconnue'));
  }
}

function closeScanModal(){
  _scanAborted=true;
  if(_scanRaf){cancelAnimationFrame(_scanRaf);_scanRaf=null;}
  if(_scanStream){_scanStream.getTracks().forEach(t=>t.stop());_scanStream=null;}
  const modal=document.getElementById('scan-modal');
  if(modal){modal.classList.remove('open');modal.setAttribute('aria-hidden','true');}
}

async function _ensureScanLib(){
  if('BarcodeDetector' in window){
    if(!_scanDetector){try{_scanDetector=new window.BarcodeDetector({formats:['qr_code']});}catch(_){_scanDetector=null;}}
    if(_scanDetector)return 'native';
  }
  if(window.jsQR)return 'jsqr';
  await new Promise((resolve,reject)=>{
    const s=document.createElement('script');
    s.src='https://cdn.jsdelivr.net/npm/jsqr@1.4.0/dist/jsQR.min.js';
    s.onload=resolve;
    s.onerror=()=>reject(new Error('Impossible de charger jsQR'));
    document.head.appendChild(s);
  });
  return 'jsqr';
}

async function _scanLoop(){
  if(_scanAborted)return;
  const v=document.getElementById('scan-video');
  if(!v||v.readyState<2||!v.videoWidth){_scanRaf=requestAnimationFrame(_scanLoop);return;}
  try{
    const lib=await _ensureScanLib();
    let raw=null;
    if(lib==='native'){
      const codes=await _scanDetector.detect(v);
      if(codes&&codes.length)raw=codes[0].rawValue;
    } else if(window.jsQR){
      if(!_scanCanvas)_scanCanvas=document.createElement('canvas');
      _scanCanvas.width=v.videoWidth; _scanCanvas.height=v.videoHeight;
      const ctx=_scanCanvas.getContext('2d',{willReadFrequently:true});
      ctx.drawImage(v,0,0,_scanCanvas.width,_scanCanvas.height);
      const imd=ctx.getImageData(0,0,_scanCanvas.width,_scanCanvas.height);
      const r=window.jsQR(imd.data,imd.width,imd.height,{inversionAttempts:'dontInvert'});
      if(r)raw=r.data;
    }
    if(raw){
      const now=Date.now();
      // Debounce 1.2s, ET on n'autorise le même ref que toutes les 3s pour
      // éviter de spammer le toast sur le même tag tenu devant la caméra.
      const ref=_extractScanRef(raw);
      const sameAsLast=(ref&&ref===_scanLastRef);
      const minDelay=sameAsLast?3000:1200;
      if(now-_scanLast>minDelay){
        _scanLast=now; _scanLastRef=ref;
        _handleScanResult(raw);
      }
    }
  }catch(_){}
  _scanRaf=requestAnimationFrame(_scanLoop);
}

function _setScanStatus(s){const el=document.getElementById('scan-status');if(el)el.textContent=s;}

function _extractScanRef(text){
  let s=String(text||'').trim();
  // Si URL : d'abord le paramètre ?ref= (format des QR d'étiquettes Prodi
  // Arrivages : https://paper.prodi.com/?ref=Photo_990892 — le path est "/",
  // donc le fallback segment ne suffit pas), sinon le dernier segment de path.
  if(/^https?:\/\//i.test(s)){
    try{
      const u=new URL(s);
      const qref=u.searchParams.get('ref');
      if(qref){
        s=qref;
      }else{
        const parts=u.pathname.split('/').filter(Boolean);
        if(parts.length)s=parts[parts.length-1];
      }
    }catch(_){}
  }
  return decodeURIComponent(s).trim();
}

// Cherche dans la vue courante (rapide) puis dans tout le catalogue (cache).
// Sans le fallback `_loadAllProducts`, scanner un produit qui n'est pas dans
// la page filtrée actuellement renvoyait "introuvable" alors qu'il existe.
async function _findProductByRef(candidate){
  if(!candidate)return null;
  const c=candidate.toLowerCase();
  const cStripped=c.replace(/^photo_/,'');
  const match=(list)=>list.find(p=>{
    const r=String(p.ref||'').toLowerCase();
    if(!r)return false;
    return r===c || r===('photo_'+cStripped) || r.replace(/^photo_/,'')===cStripped;
  })||null;
  const inView=match(all);
  if(inView)return inView;
  try{
    const allProducts=await _loadAllProducts();
    // _loadAllProducts renvoie des rows DB brutes (quality/gsm/width…) —
    // on les passe par rowToUi pour avoir la shape UI (name/grammage/largeur…)
    // attendue par le panier et la modale.
    const raw=match(allProducts);
    return raw?rowToUi(raw):null;
  }catch(_){return null;}
}

async function _handleScanResult(text){
  const ref=_extractScanRef(text);
  if(!ref){_setScanStatus('QR vide / illisible');return;}
  _setScanStatus('Recherche : '+ref+'…');
  const p=await _findProductByRef(ref);
  if(!p){
    _setScanStatus('Référence "'+ref+'" introuvable dans le catalogue');
    _addScanHistory(ref,false);
    return;
  }
  const refDisp=String(p.ref||ref).replace(/^Photo_/i,'');
  const inCart=cart.find(x=>x.id===+p.id);
  // Ajoute au panier si pas déjà présent (addToCart toggle, donc on garde).
  if(!inCart){
    // On passe `p` directement : il peut venir du cache complet (produit hors
    // de la vue courante filtrée, introuvable dans `all`).
    addToCart(p.id,p);
    _addScanHistory(refDisp,true);
  }else{
    _addScanHistory(refDisp,true,'(déjà)');
  }
  _setScanStatus(inCart?('Déjà dans la liste : '+refDisp):('Ajouté : '+refDisp));
  // Comme un clic sur le produit : on ferme le scanner et on ouvre la fiche.
  // openDetail lit depuis `all` → on injecte le produit s'il en est absent
  // (cas d'un scan d'un produit hors vue courante).
  if(!all.find(x=>x.id===+p.id))all.push(p);
  closeScanModal();
  openDetail(p.id);
}

function _addScanHistory(ref,ok,suffix){
  const h=document.getElementById('scan-history');
  if(!h)return;
  const row=document.createElement('div');
  row.className='scan-hist-row '+(ok?'ok':'err');
  row.textContent=(ok?'✓ ':'✗ ')+ref+(suffix?' '+suffix:'');
  h.insertBefore(row,h.firstChild);
  while(h.children.length>8)h.removeChild(h.lastChild);
}

// ── COPY CART LINK ───────────────────────────────────────────────────────────
// Génère un short-code, persiste {code, cart_ids} dans `shared_carts`, copie
// l'URL `?s=CODE` dans le presse-papier. `cart_ids` = refs (Photo_…) pour
// survivre au re-import quotidien (cf CLAUDE.md).
// « Ouvrir le lien » (bulles PRODIX, 18/07) : crée le lien client depuis la
// liste courante et l'ouvre dans un onglet (copie aussi au presse-papier).
async function ouvrirLienClient(){
  if(!cart.length){toast('Liste vide');return;}
  const code=_shortCode();
  const refs=cart.map(x=>x.ref).filter(Boolean).join(',');
  if(!refs){toast('Aucune référence valide');return;}
  const url=window.location.origin+window.location.pathname+'?s='+code;
  try{
    await sbQ('shared_carts',{method:'POST',body:{code,cart_ids:refs},headers:{'Prefer':'return=minimal'}});
    window.prodiTrack?.('panier_partage',{code,nb:cart.length,via:'prodix_ouvrir'});
  }catch(e){toast('Erreur création du lien');return;}
  try{await navigator.clipboard.writeText(url);}catch(_){}
  window.open(url,'_blank');
}
// ── « Modifier » (crayon) de la vue client (?s=) ──────────────────────────
// Rouvre la liste partagée dans le CATALOGUE de travail (avec prix), sélection
// pré-remplie, prête à retravailler. Gardé par le code interne (le même que la
// porte du catalogue — cf catalogue/index.html PWD, vitrine.js,
// invitation/index.html : constantes à garder synchro si on change le code).
const _EDIT_CODE='PRODI2026';
function _editListPrompt(){
  const c=window.prompt('Code d\'accès pour modifier cette liste :');
  if(c==null)return; // annulé
  if(c.trim()!==_EDIT_CODE){toast('Code incorrect');return;}
  try{localStorage.setItem('prodi_cat_ok','1');localStorage.removeItem('prodi_client');}catch(_){} // interne : porte + prix + voit les réservés
  let url;
  if(_shareCode){
    url=window.location.origin+'/catalogue/?edit='+encodeURIComponent(_shareCode);
  }else{
    // Lien legacy ?share= (refs en clair, sans code court) : on passe la
    // sélection courante par sessionStorage (même onglet/origine → conservée
    // à la navigation vers /catalogue/).
    try{sessionStorage.setItem('prodi_edit_refs',cart.map(x=>x.ref).filter(Boolean).join(','));}catch(_){}
    url=window.location.origin+'/catalogue/?edit=_local';
  }
  window.location.href=url;
}
// Boot du catalogue avec ?edit= : résout le code → refs → remplit le panier et
// ouvre le tiroir « Ma Liste ». Le catalogue tourne en mode NORMAL (grille +
// prix), pas en vue client.
async function _loadEditList(code){
  try{
    let refs='';
    if(code==='_local'){
      try{refs=sessionStorage.getItem('prodi_edit_refs')||'';sessionStorage.removeItem('prodi_edit_refs');}catch(_){}
    }else{
      const r=await sbQ('shared_carts?code=eq.'+encodeURIComponent(code)+'&select=cart_ids&limit=1');
      refs=(r.data&&r.data[0])?r.data[0].cart_ids:'';
    }
    const refList=(refs||'').split(',').map(s=>s.trim()).filter(Boolean);
    if(!refList.length){toast('Liste introuvable ou expirée');return;}
    const pr=await sbQ('products?ref=in.('+refList.map(encodeURIComponent).join(',')+')&select=*&limit=400&order=gsm.asc');
    if(!pr.data||!pr.data.length){toast('Liste introuvable ou expirée');return;}
    const units=pr.data.map(rowToUi);
    cart=units.map(p=>({id:p.id,name:p.name,ref:p.ref,type:p.type,qualite:p.qualite||null,details:p.details||null,grammage:p.grammage,largeur:p.largeur,format:p.format,poids_net:p.poids_net,price:p.price||null,img:p.image_url||null,couleur:p.couleur||null,usine:p.usine||null,zone:p.zone||null,emplacement:p.emplacement||null,allee:p.allee||null,reserve_client:p.reserve_client||null}));
    try{localStorage.setItem('prodi_cart',JSON.stringify(cart));}catch(_){}
    updateCartBadge();
    // Reflète l'état « ajouté » (+/−) sur les cartes déjà rendues par l'init.
    const pg=document.getElementById('pgrid');
    if(pg&&pg._lastList&&pg._lastList.length)render(pg._lastList);
    openCartDrawer();
    toast('✏️ Liste rouverte — '+cart.length+' produit'+(cart.length>1?'s':'')+' prêts à retravailler',4200);
  }catch(e){toast('Erreur à l\'ouverture de la liste');}
}
// « Partager » du tiroir : crée le lien client (?s=) et l'OUVRE directement
// dans un nouvel onglet (vue client, intro + thème Apple) — demande Ethan 20/07.
async function openClientLink(btn){
  if(!cart.length){toast('Liste vide — ajoutez des produits d\'abord');return;}
  const code=_shortCode();
  const refs=cart.map(x=>x.ref).filter(Boolean).join(',');
  if(!refs){toast('Aucune référence valide dans la liste');return;}
  const url=window.location.origin+window.location.pathname+'?s='+code; // jamais de &p=1 : le prix ne fuite pas aux clients
  try{
    const res=await sbQ('shared_carts',{method:'POST',body:{code,cart_ids:refs},headers:{'Prefer':'return=minimal'}});
    window.prodiTrack?.('panier_partage',{code,nb:(refs.match(/,/g)||[]).length+1,via:'partager_direct'});
    if(res&&res.status&&res.status>=400){throw new Error('HTTP '+res.status);}
  }catch(e){
    console.error('share',e);
    toast('Erreur création du lien partagé');
    return;
  }
  window.open(url,'_blank','noopener');
}
async function copyCartLink(btn){
  if(!cart.length){toast('Liste vide — ajoutez des produits d\'abord');return;}
  const code=_shortCode();
  const refs=cart.map(x=>x.ref).filter(Boolean).join(',');
  if(!refs){toast('Aucune référence valide dans la liste');return;}
  const url=window.location.origin+window.location.pathname+'?s='+code; // jamais de &p=1 : le prix ne fuite pas aux clients
  const shareText=url;
  try{
    const res=await sbQ('shared_carts',{method:'POST',body:{code,cart_ids:refs},headers:{'Prefer':'return=minimal'}});
    window.prodiTrack?.('panier_partage',{code,nb:(refs.match(/,/g)||[]).length+1});
    if(res&&res.status&&res.status>=400){throw new Error('HTTP '+res.status);}
  }catch(e){
    console.error('share',e);
    toast('Erreur création du lien partagé');
    return;
  }
  let copied=false;
  try{
    await navigator.clipboard.writeText(shareText);
    copied=true;
  }catch(_){
    // Safari iOS / file:// peuvent refuser clipboard sans gesture user → fallback
    try{
      const ta=document.createElement('textarea');
      ta.value=shareText; ta.style.cssText='position:fixed;left:-9999px;';
      document.body.appendChild(ta); ta.select();
      copied=document.execCommand('copy');
      document.body.removeChild(ta);
    }catch(_){}
  }
  if(copied){
    toast('🔗 Lien copié');
    if(btn&&btn.classList){
      btn.classList.add('done');
      const span=btn.querySelector('span');
      const prev=span?span.textContent:null;
      if(span)span.textContent='✓ Lien copié';
      setTimeout(()=>{btn.classList.remove('done');if(span&&prev)span.textContent=prev;},1800);
    }
  } else {
    // Dernier recours : afficher le lien pour copie manuelle
    prompt('Copie ce lien :',url);
  }
}
// ── « Recevoir le prix » (26/08) : le client envoie SA sélection (lien ?s=) à
// Prodi par mail OU WhatsApp pour obtenir le prix. Génère le lien partagé
// (comme copyCartLink) puis ouvre le canal. ──
async function _cartShareUrl(btn){
  if(!cart.length){toast('Liste vide — ajoutez des produits d\'abord');return null;}
  const code=_shortCode();
  const refs=cart.map(x=>x.ref).filter(Boolean).join(',');
  if(!refs){toast('Aucune référence valide dans la liste');return null;}
  const url=window.location.origin+window.location.pathname+'?s='+code; // sans prix
  const span=btn&&btn.querySelector?btn.querySelector('span'):null;
  const prev=span?span.textContent:null; if(span)span.textContent='…';
  try{
    const res=await sbQ('shared_carts',{method:'POST',body:{code,cart_ids:refs},headers:{'Prefer':'return=minimal'}});
    if(res&&res.status&&res.status>=400)throw new Error('HTTP '+res.status);
    window.prodiTrack?.('panier_partage',{code,nb:(refs.match(/,/g)||[]).length+1,via:'prix'});
  }catch(e){ console.error('share',e); toast('Erreur création du lien'); if(span&&prev)span.textContent=prev; return null; }
  if(span&&prev)span.textContent=prev;
  return url;
}
async function cartPrixMail(btn){
  const url=await _cartShareUrl(btn); if(!url)return;
  const sujet=encodeURIComponent('Demande de prix — ma sélection Prodiconseil');
  const corps=encodeURIComponent('Bonjour,\n\nJe souhaite recevoir le prix pour ma sélection :\n'+url+'\n\nMerci.');
  window.prodiTrack?.('prix_mail');
  window.location.href='mailto:ethan@prodi.com?subject='+sujet+'&body='+corps;
}
async function cartPrixWa(btn){
  const url=await _cartShareUrl(btn); if(!url)return;
  const texte=encodeURIComponent('Bonjour, je souhaite recevoir le prix pour ma sélection : '+url);
  window.prodiTrack?.('prix_wa');
  window.open('https://wa.me/'+WA+'?text='+texte,'_blank');
}

// ── EXPORT EXCEL "OFFRE" (TEST) ──────────────────────────────────────────────
// Génère un .xlsx depuis la Liste au GABARIT GSE (offre-bot/processeur.py,
// DA validée par Véronique) : logo gauche + case STOCKLOTS/date droite + bloc
// adresse + titres 36pt + photo entrepôt + tableaux Bobines/Formats bilingues.
// ExcelJS chargé à la demande.
function _ensureExcelJS(){
  if(window.ExcelJS)return Promise.resolve();
  return new Promise((ok,no)=>{
    const s=document.createElement('script');
    s.src='https://cdn.jsdelivr.net/npm/exceljs@4.4.0/dist/exceljs.min.js';
    s.onload=()=>ok(); s.onerror=()=>no(new Error('ExcelJS load failed'));
    document.head.appendChild(s);
  });
}
async function _fetchImgB64(url){
  try{
    // stock.prodi.net ne renvoie pas d'en-tête CORS → fetch des octets refusé.
    // On route les images EXTERNES via un proxy qui ajoute le CORS (et redimensionne).
    // Le logo (même origine) est récupéré en direct.
    let u=url;
    if(url&&/^https?:\/\//.test(url)&&!url.startsWith(location.origin)){
      u='https://images.weserv.nl/?url='+encodeURIComponent(url.replace(/^https?:\/\//,''))+'&w=320&output=jpg';
    }
    const res=await fetch(u,{mode:'cors'});
    if(!res.ok)return null;
    const blob=await res.blob();
    return await new Promise(r=>{const fr=new FileReader();fr.onload=()=>r(fr.result);fr.onerror=()=>r(null);fr.readAsDataURL(blob);});
  }catch(_){return null;}
}
async function exportListExcelTest(btn){
  if(!cart.length){toast('Liste vide — ajoutez des produits d\'abord');return;}
  const span=btn&&btn.querySelector?btn.querySelector('span'):null;
  const prev=span?span.textContent:null;
  if(span)span.textContent='…';
  if(btn)btn.disabled=true;
  try{
    await _ensureExcelJS();
    // Données enrichies depuis `all` si dispo
    // Colonnes calées sur la LISTE DÉTAILLÉE (16/07) : N° / Réf. / Qualité /
    // Détails / Couleur / GSM / Laize·Ø ou Dimensions / PN / Usine / P/T / Montant.
    const rows=cart.map(p=>{
      // Enrichissement : la page courante d'abord, sinon le CACHE COMPLET du
      // stock (par réf) — sans ça, le Ø/usine manquaient pour les articles
      // ajoutés depuis d'autres pages.
      const _cacheHit=(typeof _allProductsCache!=='undefined'&&_allProductsCache)
        ?_allProductsCache.find(x=>String(x.ref||'')===String(p.ref||''))
        :null;
      const _pageHit=all.find(x=>x.id===+p.id);
      const f=_pageHit||(_cacheHit?{
        qualite:_cacheHit.quality,couleur:_cacheHit.color,grammage:_cacheHit.gsm,
        largeur:_cacheHit.width,longueur:_cacheHit.longueur,noyau:_cacheHit.noyau,
        poids_net:_cacheHit.weight,price:_cacheHit.price,details:_cacheHit.details,
        usine:_cacheHit.usine,image_url:_cacheHit.image_url,ref:_cacheHit.ref,
      }:{});
      const qual=p.qualite||f.qualite||'';
      const isBobine=/^R/i.test(qual)||(p.type&&/bobine/i.test(p.type));
      const largeur=p.largeur??f.largeur??'';
      const longueur=f.longueur??p.longueur??'';
      const mandrin=f.noyau??f.mandrin??p.noyau??'';
      const poids=Math.round(p.poids_net??f.poids_net??0)||0;
      const prixKg=(p.price??f.price)||0;
      return {
        isBobine,
        ref:String(p.ref||f.ref||'').replace(/^Photo_/i,''),
        qualite:[qual,String((typeof formatProductTitle==='function')?formatProductTitle(qual,p.name):(p.name||''))
          .replace(/^\s*(BOBINE|FORMAT|PALETTE|MACHINE)\s*[—–-]\s*/i,'').trim()].filter(Boolean).join(' — '),
        detail:(p.details||f.details||''),
        couleur:(p.couleur||f.couleur||'').toString(),
        grammage:p.grammage??f.grammage??'',
        largeur:largeur||'',
        longueur:longueur||'',
        mandrin:mandrin||'',
        poids:poids||'',
        usine:String(p.usine||f.usine||'').replace(/^REF\s*/i,''),
        fmt:p.format||f.format||'',
        prixT:prixKg?Math.round(prixKg*1000):'',
        montant:prixKg&&poids?Math.round(poids*prixKg*100)/100:'',
        prix:prixKg||null,
        img:p.img||p.image_url||f.image_url||null,
      };
    });
    const _byGsm=(a,b)=>(Number(a.grammage)||0)-(Number(b.grammage)||0);
    const bobines=rows.filter(r=>r.isBobine).sort(_byGsm);
    const formats=rows.filter(r=>!r.isBobine).sort(_byGsm);
    // Feuille ASSEMBLÉE : une ligne par LOT — qualité/couleur/détails/GSM/forme
    // + USINE + prix, RIEN en N°/Réf (demande Ethan 04/08), PN = poids total du
    // lot. Pour les BOBINES, la laize (comme le Ø et le poids) ne sépare PAS
    // les lots : elle s'affiche en plage min–max (04/08). Les formats gardent
    // leurs dimensions exactes dans la clé. Mandrins distincts joints par « / ».
    const _lotOf=new Map();
    rows.forEach(d=>{
      const k=[d.isBobine,d.fmt,d.qualite,d.detail,d.couleur,d.grammage,
        d.isBobine?'':d.largeur,d.isBobine?'':d.longueur,d.usine,d.prixT].join('|');
      let l=_lotOf.get(k);
      if(!l){l={...d,ref:''};l._kg=0;l._larges=new Set();l._longs=new Set();l._mands=new Set();_lotOf.set(k,l);}
      l._kg+=+d.poids||0;
      if(d.largeur!=='')l._larges.add(+d.largeur||0);
      if(d.longueur!=='')l._longs.add(+d.longueur||0);
      if(d.mandrin!=='')l._mands.add(String(d.mandrin));
      if(!l.img&&d.img)l.img=d.img;
    });
    const _rngOf=set=>{const v=[...set].filter(Boolean).sort((a,b)=>a-b);
      return v.length?(v.length>1?v[0]+'–'+v[v.length-1]:String(v[0])):'';};
    const _lots=[..._lotOf.values()].map(l=>({...l,
      poids:Math.round(l._kg)||'',
      largeur:_rngOf(l._larges),
      longueur:_rngOf(l._longs),
      mandrin:[...l._mands].join(' / '),
      montant:(l.prix&&l._kg)?Math.round(l._kg*l.prix*100)/100:'',
    }));
    const lotsBob=_lots.filter(x=>x.isBobine).sort(_byGsm);
    const lotsFmt=_lots.filter(x=>!x.isBobine).sort(_byGsm);

    const ExcelJS=window.ExcelJS;
    const wb=new ExcelJS.Workbook();

    // ============ GABARIT « FICHIER MÈRE » (REF 209 Véronique, 25/08) ============
    // DA relevée cellule par cellule sur le vrai fichier d'offre commerciale
    // (« REF 209 - OFFRE DE PAPIER MINCE IVOIRE EN BOBINE ») + mécanique GSE
    // (offre-bot/processeur.py) : Calibri en-têtes / ARIAL GRAS données,
    // en-tête resserré (lignes 31,5, pas d'espaceurs autour des photos),
    // en-têtes tableau sur 2 LIGNES (FR noir 26pt / EN rouge 26pt, h90),
    // données 22pt texte / 28pt chiffres (lignes 55), TRAITS NOIRS partout,
    // pas de zébrure, traduction EN ROUGE omniprésente (couleur bilingue,
    // bloc CFR fusionné par section « + 70 ~ 150 €/T DÉPEND DU PORT
    // D'ARRIVÉE / DEPEND ON PORT OF ARRIVAL »), bande de 3 photos produits
    // h250, colonnes vides retirées, largeurs au contenu, portrait A4.
    const FNT='Calibri', FDATA='Arial';
    const ROUGE='FFFF0000', BANDE='FFB4C6E7', JAUNE='FFFFFF00', VERT='FFC6E0B4',
          BLEU_LIEN='FF0000FF', NOIR='FF000000';
    const T_ENT=22, H_ENT=72, T_TXT=22, T_NUM=28, H_LIGNE=55,
          LARG_CIBLE=271; // somme réelle des largeurs du fichier mère (8 col)
    // DEVISE : si le $ est sélectionné à l'écran, l'Excel sort AUSSI en dollars
    // (converti au taux du jour, arrondi à la dizaine comme l'affichage). Sinon €.
    const _xUsd=(_currency==='USD'&&_usdRate>0);
    const _xUnit=(low)=>{const u=_xUsd?'$/T':'€/T';return low?u.toLowerCase():u;};
    const _xR10=(vEur)=>Math.round((_xUsd?vEur*_usdRate:vEur)/10)*10; // €/T → devise, arrondi dizaine
    const _xSym=()=>_xUsd?'$':'€';
    const PRIX_CFR_FR="+ "+_xR10(70)+" ~ "+_xR10(150)+" "+_xUnit()+" \nDÉPEND DU PORT D'ARRIVÉE \n";
    const PRIX_CFR_EN='DEPEND ON PORT OF ARRIVAL';
    const bN={style:'thin',color:{argb:NOIR}};
    const bordN={top:bN,left:bN,bottom:bN,right:bN};
    const _fillOf=(argb)=>({type:'pattern',pattern:'solid',fgColor:{argb}});

    const _imgId=(dataUrl)=>{try{if(!dataUrl)return null;const ext=/image\/jpe?g/i.test(dataUrl)?'jpeg':'png';return wb.addImage({base64:dataUrl.split(',')[1],extension:ext});}catch(_){return null;}};
    const _imgSize=(b64)=>new Promise(res=>{const im=new Image();im.onload=()=>res({w:im.naturalWidth||4,h:im.naturalHeight||3});im.onerror=()=>res({w:4,h:3});im.src=b64;});

    // Formats : prix « 600 €/t » (fichier mère) sinon SUR DEMANDE ; montant du
    // lot « 4 058,10 € » ; laize en CM à virgule, plages assemblées converties.
    const _sp=(s)=>String(s).replace(/[\u202f\u00a0]/g,' ');
    const _fmtPrix=(t)=>(typeof t==='number'&&isFinite(t))?_sp(_xR10(t).toLocaleString('fr-FR'))+' '+_xUnit(true):'SUR DEMANDE';
    const _fmtMontant=(t,kg)=>{
      if(typeof t!=='number'||!isFinite(t)||!kg)return '';
      let v=t*kg/1000; if(_xUsd)v*=_usdRate;
      return _sp(Math.round(v).toLocaleString('fr-FR'))+' '+_xSym();
    };
    // Laize/largeur en MM bruts, sans unité dans la cellule (harmonisé avec
    // mandrin/Ø, l'unité vit dans l'en-tête — Ethan 26/08, fini le « cm à
    // virgule » du fichier mère) ; gère les plages assemblées « 480–1000 ».
    const _mm=(v)=>{
      if(v===''||v==null)return '';
      const s=String(v);
      if(!s.includes('–')){const n=+s;return isFinite(n)&&n>0?Math.round(n):v;}
      return s.split('–').map(x=>{const n=+x;return isFinite(n)&&n>0?String(Math.round(n)):String(x);}).join('–');
    };
    const _numV=(v)=>(typeof v==='string'&&v!==''&&/^\d+(\.\d+)?$/.test(v))?+v:v;
    // Qualité SANS le code Sage (« RCOL — OFFSET COULEUR » → « OFFSET
    // COULEUR ») : le code n'apporte rien au client (Ethan 25/08)
    const _qualSansCode=(q)=>{const t=String(q||'');const m=t.match(/^[A-Z0-9]{2,8}\s*—\s*(.+)$/);return m?m[1]:t;};
    // Couleur bilingue « IVOIRE / IVORY » (EN affiché en ROUGE, fichier mère).
    const COUL_EN={'BLANC':'WHITE','TRES BLANC':'EXTRA WHITE','TRÈS BLANC':'EXTRA WHITE','BLANC NATUREL':'NATURAL WHITE','IVOIRE':'IVORY','CREME':'CREAM','CRÈME':'CREAM','ROSE':'PINK','VERT':'GREEN','BLEU':'BLUE','JAUNE':'YELLOW','ROUGE':'RED','NOIR':'BLACK','GRIS':'GREY','ORANGE':'ORANGE','MARRON':'BROWN','BRUN':'BROWN','HAVANE':'HAVANA','KRAFT':'KRAFT','CHAMOIS':'BUFF','SAUMON':'SALMON','VIOLET':'PURPLE','PARME':'LILAC','MAUVE':'MAUVE','CIEL':'SKY BLUE','TURQUOISE':'TURQUOISE','FUCHSIA':'FUCHSIA','OR':'GOLD','ARGENT':'SILVER','BORDEAUX':'BURGUNDY','BEIGE':'BEIGE','ECRU':'ECRU','ÉCRU':'ECRU','AZUR':'AZURE','ANIS':'ANISE','PISTACHE':'PISTACHIO','CANARI':'CANARY','BOUTON D OR':'BUTTERCUP','VERT D EAU':'AQUA GREEN','GRIS PERLE':'PEARL GREY','BLEU ROI':'ROYAL BLUE'};
    const _coulBi=(c)=>{
      const fr=String(c||'').trim(); if(!fr)return '';
      const en=COUL_EN[fr.toUpperCase()];
      return en&&en!==fr.toUpperCase()?fr+'\n'+en:fr; // \n = marqueur bilingue, rendu richText au write
    };

    // Poids de largeur par colonne = contenu réel + mot le plus long de
    // l'en-tête, amorti racine carrée (mécanique GSE).
    const _poidsCols=(vals,n,fr,en)=>{
      const poids=[],ents=[];
      for(let k=0;k<n;k++){
        let lmax=3;
        vals.forEach(v=>{const s=v[k];if(s!=null&&s!=='')lmax=Math.max(lmax,String(s).length);});
        let ent=0;
        [fr,en].forEach(src=>{if(src&&src[k])String(src[k]).split(/\s+/).forEach(m=>{ent=Math.max(ent,m.length);});});
        poids.push(Math.sqrt(Math.max(lmax,ent,3)));
        ents.push(ent);
      }
      return {poids,ents};
    };
    const _largeurs=(n,poids,cible,planchers)=>{
      cible=cible||LARG_CIBLE;
      const somme=poids.reduce((a,b)=>a+b,0)||1;
      let l=poids.map(p=>cible*p/somme);
      const pl=l.map((_,j)=>Math.max(j===n-1?30:10,(planchers&&planchers[j])||0));
      for(let it=0;it<l.length;it++){
        const def=l.map((w,i)=>Math.max(0,pl[i]-w));
        if(!def.some(d=>d>0))break;
        const manque=def.reduce((a,b)=>a+b,0);
        const au=l.map((w,i)=>w>pl[i]?i:-1).filter(i=>i>=0);
        const tot=au.reduce((a,i)=>a+l[i]-pl[i],0);
        l=l.map((w,i)=>def[i]>0?pl[i]:(tot>0&&au.includes(i)?w-manque*(w-pl[i])/tot:w));
      }
      return l;
    };

    // Images communes : logo + BANDE DE 3 PHOTOS PRODUITS (fichier mère, h250)
    // — repli photo entrepôt générique si aucune photo produit ne charge.
    const logoB64=await _fetchImgB64(location.origin+'/img/logo.png');
    const _lid=_imgId(logoB64);
    const _lsz=logoB64?await _imgSize(logoB64):{w:4,h:1};
    // Photos d'en-tête : uniquement parmi les ~30 DERNIÈRES références de la
    // liste (les plus récentes = les plus jolies — demande Ethan 26/08),
    // mélangées à l'intérieur de ce pool pour garder de la variété.
    const _bandUrls=rows.filter(x=>x.img)
      .sort((a2,b2)=>(parseInt(b2.ref,10)||0)-(parseInt(a2.ref,10)||0))
      .slice(0,30).map(x=>x.img);
    for(let i=_bandUrls.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[_bandUrls[i],_bandUrls[j]]=[_bandUrls[j],_bandUrls[i]];}
    const bandImgs=(await Promise.all(_bandUrls.slice(0,5).map(async u=>{
      const b64=await _fetchImgB64(u); if(!b64)return null;
      const sz=await _imgSize(b64); const iid=_imgId(b64);
      return iid==null?null:{id:iid,w:sz.w,h:sz.h};
    }))).filter(Boolean);
    let entrepot=null;
    if(!bandImgs.length){
      const pb=await _fetchImgB64(location.origin+'/img/entrepot_offre.png');
      if(pb){const sz=await _imgSize(pb);const iid=_imgId(pb);if(iid!=null)entrepot={id:iid,w:sz.w,h:sz.h};}
    }

    // En-têtes courts façon fichier mère (« g/m² » / « gsm »), 2 lignes FR/EN.
    const COLS_B_FR=['REFERENCE','QUALITE','DETAIL','COULEUR','g/m²','MANDRIN (mm)','LAIZE\n(mm)','DIAMETRE (mm)','POIDS (kg)','USINE','PRIX\nDÉPART USINE','MONTANT\nDU LOT','PRIX\nCFR'];
    const COLS_B_EN=['REFERENCE','QUALITY','DETAIL','COLOR','gsm','CORE (mm)','WIDTH\n(mm)','DIAMETER (mm)','WEIGHT (kg)','MILL','EX WORKS\nPRICE','LOT\nAMOUNT','CFR\nPRICE'];
    const TAIL_B=[T_TXT,T_TXT,T_TXT,T_TXT,T_NUM,T_NUM,T_NUM,T_NUM,T_NUM,T_TXT,T_NUM,T_NUM,T_TXT];
    const COLS_F_FR=['REFERENCE','QUALITE','DETAIL','COULEUR','g/m²','LARGEUR\n(mm)','LONGUEUR (mm)','POIDS (kg)','USINE','PRIX\nDÉPART USINE','MONTANT\nDU LOT','PRIX\nCFR'];
    const COLS_F_EN=['REFERENCE','QUALITY','DETAIL','COLOR','gsm','WIDTH\n(mm)','LENGTH (mm)','WEIGHT (kg)','MILL','EX WORKS\nPRICE','LOT\nAMOUNT','CFR\nPRICE'];
    const TAIL_F=[T_TXT,T_TXT,T_TXT,T_TXT,T_NUM,T_NUM,T_NUM,T_NUM,T_TXT,T_NUM,T_NUM,T_TXT];

    const _buildSheet=async(ws,secBob,secFmt,opts)=>{
      // 1) Matrices de valeurs par section, retrait des colonnes ENTIÈREMENT
      // vides (l'assemblé perd sa REFERENCE tout seul), indices recalés.
      // opts.photos (onglet « Photos ») : colonne PHOTO en tête avec la VRAIE
      // photo de la réf incrustée (fallback SUR DEMANDE), lignes hautes, paysage.
      const AV=!!(opts&&opts.photos);
      const phFr=AV?['PHOTO']:[], phEn=AV?['PICTURE']:[];
      let imgsBob=[],imgsFmt=[];
      if(AV){
        const fetchAll=(sec)=>Promise.all(sec.map(async d=>{
          if(!d.img)return null;
          const b64=await _fetchImgB64(d.img);
          if(!b64)return null;
          const sz=await _imgSize(b64);
          const iid=_imgId(b64);
          // url ORIGINALE (pas la vignette proxy) : clic sur la photo dans
          // Excel = ouvre la photo en grand dans le navigateur
          return iid==null?null:{id:iid,w:sz.w,h:sz.h,url:safeUrl(d.img)};
        }));
        [imgsBob,imgsFmt]=await Promise.all([fetchAll(secBob),fetchAll(secFmt)]);
      }
      const secDefs=[];
      if(secBob.length)secDefs.push({
        titreFr:'BOBINES / ',titreEn:'REELS',
        fr:[...phFr,...COLS_B_FR],en:[...phEn,...COLS_B_EN],tailles:[...(AV?[T_TXT]:[]),...TAIL_B],
        iCoul:3+phFr.length,iDet:2+phFr.length,
        iPrix:10+phFr.length,iMont:11+phFr.length,iCfr:12+phFr.length,imgs:imgsBob,
        vals:secBob.map((d,ix)=>[...(AV?[imgsBob[ix]?'':'SUR DEMANDE']:[]),d.ref,_qualSansCode(d.qualite),d.detail,_coulBi(d.couleur),_numV(d.grammage),_numV(d.mandrin),_mm(d.largeur),_numV(d.longueur),_numV(d.poids),d.usine,_fmtPrix(d.prixT),_fmtMontant(d.prixT,+d.poids||0),PRIX_CFR_FR+PRIX_CFR_EN]),
      });
      if(secFmt.length)secDefs.push({
        titreFr:'FORMATS / PALETTES – ',titreEn:'SHEETS/PALLETS',
        fr:[...phFr,...COLS_F_FR],en:[...phEn,...COLS_F_EN],tailles:[...(AV?[T_TXT]:[]),...TAIL_F],
        iCoul:3+phFr.length,iDet:2+phFr.length,
        iPrix:9+phFr.length,iMont:10+phFr.length,iCfr:11+phFr.length,imgs:imgsFmt,
        vals:secFmt.map((d,ix)=>[...(AV?[imgsFmt[ix]?'':'SUR DEMANDE']:[]),d.ref,_qualSansCode(d.qualite),d.detail,_coulBi(d.couleur),_numV(d.grammage),_mm(d.largeur),_numV(d.longueur),_numV(d.poids),d.usine,_fmtPrix(d.prixT),_fmtMontant(d.prixT,+d.poids||0),PRIX_CFR_FR+PRIX_CFR_EN]),
      });
      secDefs.forEach(s=>{
        // la colonne PHOTO (k=0 en mode photos) n'est JAMAIS retirée (règle GSE)
        // opts.sans : colonnes retirées à la demande (onglet Offre épuré 25/08)
        // MONTANT DU LOT retiré PARTOUT (Ethan 25/08) — plomberie conservée
        const sans=[...((opts&&opts.sans)||[]),'MONTANT'];
        const keep=s.fr.map((_,k)=>k).filter(k=>((AV&&k===0)||s.vals.some(v=>v[k]!=null&&v[k]!==''))&&!(sans&&sans.some(p=>String(s.fr[k]).startsWith(p))));
        s.fr=keep.map(k=>s.fr[k]); s.en=keep.map(k=>s.en[k]); s.tailles=keep.map(k=>s.tailles[k]);
        s.vals=s.vals.map(v=>keep.map(k=>v[k]));
        s.iPrix=keep.indexOf(s.iPrix); s.iMont=keep.indexOf(s.iMont); s.iCfr=keep.indexOf(s.iCfr);
        s.iCoul=keep.indexOf(s.iCoul); s.iDet=keep.indexOf(s.iDet);
        s.nCols=s.fr.length;
        const pc=_poidsCols(s.vals,s.nCols,s.fr,s.en);
        s.poids=pc.poids; s.ents=pc.ents;
        // prix/montant plus larges : « SUR DEMANDE »/« 1 040,98 € » à 28pt
        if(s.iPrix>=0)s.poids[s.iPrix]*=1.5;
        if(s.iMont>=0)s.poids[s.iMont]*=1.5;
      });
      // 2) Largeurs par colonne = le MAX des besoins de CHAQUE section —
      // « la section la plus large gagne » écrasait l'autre quand Bobines et
      // Formats n'ont pas les mêmes colonnes (vécu 25/08 : prix/CFR bobines
      // laminés par les largeurs des formats). Le total dépasse la cible :
      // voulu (« utilise la largeur »), fitToWidth recale à l'impression.
      const nCols=Math.max(2,...secDefs.map(s2=>s2.nCols));
      const widths=new Array(nCols).fill(10);
      secDefs.forEach(s2=>{
        const off=AV?1:0;
        const pls=s2.ents.slice(off).map(e=>Math.min(28,Math.round(e*2.7)));
        const cible=Math.max(LARG_CIBLE,(s2.nCols-off)*26)*(AV?1.15:1);
        const ws_=_largeurs(s2.nCols-off,s2.poids.slice(off),cible,pls);
        ws_.forEach((w,i)=>{widths[i+off]=Math.max(widths[i+off],w);});
      });
      if(AV)widths[0]=44;
      widths.forEach((w,i)=>{ws.getColumn(i+1).width=w;});
      const colPx=widths.map(w=>w*7+5); // approximation Excel largeur → px
      const totPx=colPx.reduce((a,b)=>a+b,0);
      const _ancPx=(px)=>{let ci=0,reste=px;while(ci<colPx.length-1&&reste>=colPx[ci]){reste-=colPx[ci];ci++;}return ci+Math.min(reste/colPx[ci],0.999);};

      // 3) EN-TÊTE RESSERRÉ (fichier mère) : logo à gauche, case REF/date à
      // droite (lignes 31,5), bloc adresse souligné, titres 36pt h50, bande de
      // 3 photos produits h250, PAS d'espaceurs autour — le tableau suit.
      ws.getRow(1).height=31.5; ws.getRow(2).height=31.5;
      if(_lid!=null){const lh=58;ws.addImage(_lid,{tl:{col:0,row:0},ext:{width:Math.round(lh*_lsz.w/_lsz.h),height:lh}});}
      const cId=ws.getRow(1).getCell(nCols);
      cId.value='STOCKLOTS';
      cId.font={name:FNT,size:24,bold:true,color:{argb:ROUGE}};
      cId.fill=_fillOf(BANDE);
      cId.alignment={horizontal:'center',vertical:'middle',wrapText:true};
      cId.border=bordN;
      const cDt=ws.getRow(2).getCell(nCols);
      cDt.value=new Date(); cDt.numFmt='DD/MM/YYYY';
      cDt.font={name:FNT,size:24,color:{argb:ROUGE}};
      cDt.alignment={horizontal:'center',vertical:'middle',wrapText:true};
      cDt.border=bordN;
      // bloc adresse : fusion sur assez de colonnes pour ~95 de large
      let finBloc=1,cum=0;
      for(let j=0;j<nCols;j++){cum+=widths[j];finBloc=j+1;if(cum>=95)break;}
      const bloc=[
        ['PRODICONSEIL SARL',18,true,ROUGE,false],
        ['9 PROMENEE JEANNE HACHETTE',18,true,NOIR,false],
        ['94200 IVRY SUR SEINE - FRANCE',18,true,NOIR,false],
        ['Tel : + 33 1 46 72 03 69  /  Fax : + 33 1 49 59 87 31',18,true,NOIR,true],
        ['Contacts : ',18,true,NOIR,true],
        ['Véronique ELBILIA : Whatsapp :  + 33 6 09 46 77 48 / ve@prodi.com',18,true,NOIR,false],
        ['Julien CARON : Whatsapp :   +33 6 20 25 85 83 / vente@prodi.com',18,true,NOIR,false],
        ['Service client : Whatsapp :  + 33 6 09 99 74 07 / clients@prodi.com',18,true,NOIR,false],
        ['Site : www.prodi.com ',16,false,BLEU_LIEN,true],
      ];
      let r=4;
      bloc.forEach(([txt,taille,gras,coul,sous])=>{
        if(finBloc>1)ws.mergeCells(r,1,r,finBloc);
        const c=ws.getRow(r).getCell(1);
        c.value=txt;
        c.font={name:FNT,size:taille,bold:gras,color:{argb:coul},underline:!!sous};
        c.alignment={horizontal:'left',vertical:'middle'};
        ws.getRow(r).height=23.2; r++;
      });
      ws.getRow(r).height=21; r++; // unique espaceur avant les titres (mère)
      [['OFFRE PAPIER & CARTON EN STOCKLOTS',NOIR],['PAPER & CARDBOARD STOCKLOTS OFFER',ROUGE]].forEach(([txt,coul])=>{
        ws.mergeCells(r,1,r,nCols);
        const c=ws.getRow(r).getCell(1);
        c.value=txt;
        c.font={name:FNT,size:36,bold:true,color:{argb:coul}};
        c.fill=_fillOf(BANDE);
        c.alignment={horizontal:'center',vertical:'middle',wrapText:true};
        c.border=bordN;
        ws.getRow(r).height=Math.max(50,Math.ceil(txt.length/45)*50); r++;
      });
      // bande de photos PRODUITS (h250, fichier mère) — répliquées côte à côte
      // centrées ; repli photo entrepôt générique si aucune. SEULEMENT sur les
      // onglets qui la demandent (opts.bandN) : Offre oui, Détails non (Ethan
      // 26/08), Photos non plus (chaque ligne a déjà la sienne, Ethan 25/08).
      if(!AV&&opts&&opts.bandN){
        ws.mergeCells(r,1,r,nCols);
        ws.getRow(r).height=250;
        // rétrécies si ça déborde
        const _imgsBande=(bandImgs.length?bandImgs:(entrepot?[entrepot]:[])).slice(0,opts.bandN);
        if(_imgsBande.length){
          let ph=300;const gap=24;
          let ws_=_imgsBande.map(im=>Math.round(ph*im.w/im.h));
          let strip=ws_.reduce((a,b)=>a+b,0)+gap*(ws_.length-1);
          if(strip>totPx-8){
            const k=(totPx-8-gap*(ws_.length-1))/ws_.reduce((a,b)=>a+b,0);
            ph=Math.max(80,Math.floor(ph*k));
            ws_=_imgsBande.map(im=>Math.round(ph*im.w/im.h));
            strip=ws_.reduce((a,b)=>a+b,0)+gap*(ws_.length-1);
          }
          let x=Math.max(4,(totPx-strip)/2);
          _imgsBande.forEach((im,i)=>{
            ws.addImage(im.id,{tl:{col:_ancPx(x),row:r-1+0.03},ext:{width:ws_[i],height:ph}});
            x+=ws_[i]+gap;
          });
        }
        r++;
      }

      // 4) SECTIONS : bande titre (FR noir + EN rouge), en-tête 2 LIGNES
      // (FR noir 26 / EN rouge 26, h90), données Arial gras 22/28 lignes 55,
      // traits noirs, sans zébrure ; jaune = prix+montant ; CFR = un bloc
      // vert fusionné PAR PAGE (un seul par section = texte centré une fois,
      // toutes les autres pages montraient une colonne verte vide). On estime
      // la hauteur de page imprimée (A4 − marges, corrigée du zoom fitToWidth)
      // et on pose un saut de page manuel à chaque bloc — honoré par Excel
      // car seule la largeur est contrainte (fitToHeight:0).
      const _land=(ws.pageSetup||{}).orientation==='landscape';
      const _wPt=(widths.reduce((a2,w)=>a2+w,0)*7+5*nCols)*0.75;
      const _scale=Math.min(1,((_land?842:595)-101)/_wPt);
      const _pageHPt=((_land?595:842)-108)/_scale;
      secDefs.forEach(s=>{
        ws.mergeCells(r,1,r,nCols);
        const ct=ws.getRow(r).getCell(1);
        ct.value={richText:[{text:s.titreFr,font:{name:FNT,size:18,bold:true,color:{argb:NOIR}}},
                            {text:s.titreEn,font:{name:FNT,size:18,bold:true,color:{argb:ROUGE}}}]};
        ct.fill=_fillOf(BANDE);
        ct.alignment={vertical:'middle'};
        ct.border=bordN;
        ws.getRow(r).height=26; r++;
        // en-tête 2 lignes : FR noir puis EN rouge (fichier mère)
        [[s.fr,NOIR],[s.en,ROUGE]].forEach(([labels,coul])=>{
          const rh=ws.getRow(r);
          labels.forEach((l,i)=>{
            const c=rh.getCell(i+1);
            c.value=l;
            c.font={name:FNT,size:T_ENT,bold:true,color:{argb:coul}};
            c.fill=_fillOf(BANDE);
            c.alignment={horizontal:'center',vertical:'middle',wrapText:true};
            c.border=bordN;
          });
          // la section s'étire sur TOUTE la largeur du document : la dernière
          // colonne (CFR) absorbe l'écart quand l'autre section est plus large
          if(s.nCols<nCols){
            for(let cc=s.nCols+1;cc<=nCols;cc++){const c2=rh.getCell(cc);c2.fill=_fillOf(BANDE);c2.border=bordN;}
            ws.mergeCells(r,s.nCols,r,nCols);
          }
          rh.height=H_ENT; r++;
        });
        const rDeb=r;
        // pose un bloc CFR fusionné (texte bilingue du fichier mère) sur r1..r2
        const _cfrBloc=(r1,r2)=>{
          if(s.iCfr<0||r2<r1)return;
          for(let rr=r1;rr<=r2;rr++)for(let cc=s.iCfr+1;cc<=nCols;cc++)ws.getRow(rr).getCell(cc).border=bordN;
          ws.mergeCells(r1,s.iCfr+1,r2,nCols);
          const cf=ws.getRow(r1).getCell(s.iCfr+1);
          cf.value={richText:[{text:PRIX_CFR_FR,font:{name:FDATA,size:T_TXT,bold:true,color:{argb:NOIR}}},
                              {text:PRIX_CFR_EN,font:{name:FDATA,size:T_TXT,bold:true,color:{argb:ROUGE}}}]};
          cf.fill=_fillOf(VERT);
          cf.alignment={horizontal:'center',vertical:'middle',wrapText:true};
          cf.border=bordN;
        };
        let _hCum=0;for(let rr=1;rr<rDeb;rr++)_hCum+=ws.getRow(rr).height||15;
        let _cfrDeb=rDeb,_pgFin=(Math.floor(_hCum/_pageHPt)+1)*_pageHPt;
        s.vals.forEach((vals,nb)=>{
          const row=ws.getRow(r);
          vals.forEach((v,i)=>{
            const c=row.getCell(i+1);
            const tail=s.tailles[i]||T_TXT;
            if(i===s.iCfr){c.value='';}
            else if(i===s.iCoul&&typeof v==='string'&&v.includes('\n')){
              const[fr2,en2]=v.split('\n');
              c.value={richText:[{text:fr2+'     ',font:{name:FDATA,size:tail,bold:true,color:{argb:NOIR}}},
                                  {text:en2,font:{name:FDATA,size:tail,bold:true,color:{argb:ROUGE}}}]};
            }else c.value=v;
            c.font={name:FDATA,size:tail,bold:true,color:{argb:NOIR}};
            c.border=bordN;
            c.alignment={horizontal:'center',vertical:'middle',wrapText:true};
            if(i===s.iPrix||i===s.iMont)c.fill=_fillOf(JAUNE);
          });
          // hauteur : 55 (mère) agrandie pour que RIEN ne soit coupé — estime
          // le wrap de CHAQUE cellule texte avec la largeur réelle de sa colonne
          let hMax=AV?178:H_LIGNE;
          vals.forEach((v,i)=>{
            if(i===s.iCfr||v==null||v==='')return;
            const tail=s.tailles[i]||T_TXT;
            const cap=Math.max(3,(widths[i]||10)*9.5/tail);
            const nl=String(v).split('\n').reduce((a,l2)=>a+Math.max(1,Math.ceil(l2.length/cap)),0);
            hMax=Math.max(hMax,nl*(tail*1.4)+8);
          });
          row.height=hMax;
          // photo de la réf incrustée dans la cellule PHOTO, centrée, cliquable
          const im=AV?s.imgs[nb]:null;
          if(im){
            const cellW=widths[0]*7+5, cellH=row.height*4/3;
            let h=cellH-6, w=h*im.w/im.h;
            if(w>cellW-6){w=cellW-6;h=w*im.h/im.w;}
            const _anc={tl:{col:((cellW-w)/2)/cellW,row:r-1+((cellH-h)/2)/cellH},ext:{width:Math.round(w),height:Math.round(h)}};
            if(im.url)_anc.hyperlinks={hyperlink:im.url,tooltip:'Cliquer pour voir la photo en grand'};
            ws.addImage(im.id,_anc);
          }
          // la ligne déborde de la page → elle passe sur la suivante : on clôt
          // le bloc CFR de la page et on force le saut là où on l'a calculé
          _hCum+=row.height;
          if(_hCum>_pgFin){
            if(r>_cfrDeb){
              _cfrBloc(_cfrDeb,r-1);
              ws.getRow(r-1).addPageBreak();
              _cfrDeb=r;_hCum=_pgFin+row.height;
            }
            _pgFin+=_pageHPt;
          }
          r++;
        });
        // dernier bloc CFR de la section (reliquat de la dernière page)
        _cfrBloc(_cfrDeb,r-1);
        r++; // ligne vide entre sections
      });

      // 5) TOTAL en tonnes (jaune, sous POIDS) + conditions de vente.
      const _totKg=[...secBob,...secFmt].reduce((s2,d)=>s2+(+d.poids||0),0);
      const lastSec=secDefs[secDefs.length-1];
      const iPoids=lastSec?lastSec.fr.findIndex(x=>/^POIDS/.test(x)):-1;
      if(iPoids>0){
        ws.mergeCells(r,1,r,iPoids);
        const tl=ws.getRow(r).getCell(1);
        tl.value='TOTAL';
        tl.font={name:FDATA,size:T_TXT,bold:true};
        tl.alignment={horizontal:'right',vertical:'middle'};
        const tk=ws.getRow(r).getCell(iPoids+1);
        tk.value=_sp((Math.round(_totKg/100)/10).toLocaleString('fr-FR'))+' t';
        tk.font={name:FDATA,size:T_TXT,bold:true,color:{argb:ROUGE}};
        tk.fill=_fillOf(JAUNE);
        tk.alignment={horizontal:'center',vertical:'middle'};
        tk.border=bordN;
        ws.getRow(r).height=40; r+=2;
      }
      const _cond=(a,b,en)=>{
        ws.mergeCells(r,1,r,3);
        const c1=ws.getRow(r).getCell(1);
        c1.value=a;
        c1.font={name:FNT,size:16,bold:true,color:{argb:en?ROUGE:NOIR}};
        c1.fill=_fillOf(BANDE);
        c1.alignment={horizontal:'center',vertical:'middle',wrapText:true};
        c1.border=bordN;
        if(nCols>4)ws.mergeCells(r,4,r,nCols);
        const c2=ws.getRow(r).getCell(4);
        c2.value=b;
        c2.font={name:FNT,size:16,bold:true,color:{argb:en?ROUGE:NOIR}};
        c2.alignment={horizontal:'center',vertical:'middle',wrapText:true};
        c2.border=bordN;
        ws.getRow(r).height=30; r++;
      };
      _cond('CONDITIONS DE VENTE','30% VIREMENT AVANT EXPÉDITION ET 70% CONTRE DOCUMENTS',false);
      _cond('TERMS OF SALE','30% TRANSFER BEFORE SHIPMENT AND 70% AGAINST DOCUMENTS',true);
      // Vue « Aperçu des sauts de page » (fichier mère) : Excel trace LUI-MÊME
      // la bordure BLEUE autour de la zone d'impression et grise nativement
      // tout le reste (leur gris foncé + « Page 1 » en filigrane = cette vue,
      // pas un fond de cellule) → plus de gris peint à la main.
      const _colL=(n)=>{let t='';while(n>0){t=String.fromCharCode(65+((n-1)%26))+t;n=Math.floor((n-1)/26);}return t;};
      ws.pageSetup.printArea='A1:'+_colL(nCols)+(r-1);
      return {imgsBob,imgsFmt};
    };

    // Marge d'impression de l'onglet Cartes (pouces) — PARTAGÉE entre le calcul
    // du nombre de rangées/page et le pageSetup de la feuille (doivent coller).
    const CARTES_MARGIN_IN=0.2;
    // Onglet « Cartes » (ESSAI 26/08 « on va voir ce que ça donne ») : réplique
    // les cartes produit du site — photo en haut, titre TYPE — QUALITÉ, réf·
    // détail, puis caractéristiques en grille 2 colonnes (petit label au-dessus,
    // grosse valeur en dessous). 3 cartes par rangée. Réutilise les images déjà
    // chargées pour l'onglet Photos (ids workbook partagés, rien retéléchargé).
    const _buildCartes=async(ws,secBob,secFmt,ph,cOpts)=>{
      const PC=(cOpts&&cOpts.cols)||5,land=!!(cOpts&&cOpts.land),CW=21,SP=2;
      const widths=[SP];for(let i=0;i<PC;i++)widths.push(CW,CW,SP);
      const nColsC=widths.length;
      ws.columns=widths.map(w=>({width:w}));
      const items=[
        ...secBob.map((d,ix)=>({d,im:(ph&&ph.imgsBob&&ph.imgsBob[ix])||null,bob:true})),
        ...secFmt.map((d,ix)=>({d,im:(ph&&ph.imgsFmt&&ph.imgsFmt[ix])||null,bob:false})),
      ];
      const H_PH=200,H_TI=32,H_SO=20,H_CA=40,H_ES=16;
      const _v=(x)=>(x==null||x==='')?'—':String(x);
      const _car=(cell,lab,val)=>{
        cell.value={richText:[{text:lab+'\n',font:{name:FNT,size:11,bold:true,color:{argb:'FF86868B'}}},
                              {text:_v(val),font:{name:FNT,size:17,bold:true,color:{argb:NOIR}}}]};
        cell.alignment={horizontal:'left',vertical:'middle',wrapText:true,indent:1};
        cell.border=bordN;
      };
      const bandH=H_PH+H_TI+H_SO+3*H_CA+H_ES;
      // Combien de RANGÉES de cartes tiennent EXACTEMENT sur une page imprimée,
      // pour poser un saut de page manuel au bord de rangée (jamais au milieu
      // d'une carte). Géométrie réelle : largeur colonnes → px Excel (MDW 7) →
      // échelle fitToWidth → hauteur imprimable dispo. Marges 0,2" (calées sur
      // _shOptsCartes). Comme une page entière de N rangées TIENT dans la
      // hauteur, Excel honore le saut manuel et n'insère PAS de coupe auto qui
      // traverserait une photo.
      const _MG=CARTES_MARGIN_IN, pageW=land?842:595, pageH=land?595:842;
      const printW=pageW-2*_MG*72, printH=pageH-2*_MG*72;
      const colPxTot=widths.reduce((a2,w)=>a2+Math.trunc(((256*w+18)/256)*7),0);
      const scaleC=Math.min(1, printW/(colPxTot*0.75));
      const rowsPerPage=Math.max(1, Math.floor((printH/scaleC)/bandH));
      let r=1,rowIdx=0;
      for(let i0=0;i0<items.length;i0+=PC){
        if(rowIdx>0 && rowIdx%rowsPerPage===0) ws.getRow(r-1).addPageBreak();
        const rP=r,rT=r+1,rS=r+2,rC=r+3;
        // hauteurs AVANT addImage (ExcelJS fige l'ancre à la hauteur connue)
        ws.getRow(rP).height=H_PH;ws.getRow(rT).height=H_TI;ws.getRow(rS).height=H_SO;
        ws.getRow(rC).height=H_CA;ws.getRow(rC+1).height=H_CA;ws.getRow(rC+2).height=H_CA;
        ws.getRow(rC+3).height=H_ES;
        items.slice(i0,i0+PC).forEach((it,j)=>{
          const d=it.d,c0=2+j*3;
          // photo (fusion 2 colonnes), contain centré, clic = photo en grand
          ws.mergeCells(rP,c0,rP,c0+1);
          const cph=ws.getRow(rP).getCell(c0);
          cph.border=bordN;cph.alignment={horizontal:'center',vertical:'middle'};
          if(it.im){
            const colPx=CW*7,boxW=colPx*2,boxH=H_PH*4/3;
            // « contain » : la photo tient ENTIÈREMENT dans le cadre (jamais de
            // débordement), agrandie au max, centrée horizontalement ET
            // verticalement — le facteur d'échelle est le plus contraignant.
            const sc=Math.min((boxW-4)/it.im.w,(boxH-4)/it.im.h);
            const w2=it.im.w*sc,h2=it.im.h*sc;
            const offX=(boxW-w2)/2,offY=(boxH-h2)/2;
            // Offsets NATIFS en EMU (1px=9525) : ExcelJS réinterprète mal une
            // colonne fractionnaire (largeur ≈ 22px au lieu de 147) → la photo
            // se collait à gauche. En EMU natif, Excel place au bon endroit.
            const _emu=(px)=>Math.round(px*9525);
            const anc={tl:{nativeCol:c0-1,nativeColOff:_emu(offX),nativeRow:rP-1,nativeRowOff:_emu(offY)},ext:{width:Math.round(w2),height:Math.round(h2)}};
            if(it.im.url)anc.hyperlinks={hyperlink:it.im.url,tooltip:'Cliquer pour voir la photo en grand'};
            ws.addImage(it.im.id,anc);
          }else{cph.value='SUR DEMANDE';cph.font={name:FNT,size:12,bold:true,color:{argb:NOIR}};}
          // titre carte : TYPE — QUALITÉ, puis réf · détail (rouge)
          ws.mergeCells(rT,c0,rT,c0+1);
          const ct2=ws.getRow(rT).getCell(c0);
          ct2.value=((it.bob?'BOBINE':'FORMAT')+' — '+_qualSansCode(d.qualite)).toUpperCase();
          ct2.font={name:FNT,size:15,bold:true,color:{argb:NOIR}};
          ct2.alignment={horizontal:'left',vertical:'middle',wrapText:true,indent:1};
          ct2.border=bordN;
          ws.mergeCells(rS,c0,rS,c0+1);
          const cs=ws.getRow(rS).getCell(c0);
          cs.value=_v(String(d.ref||'').replace(/^Photo_/i,''))+(d.detail?' · '+d.detail:'');
          cs.font={name:FNT,size:11,bold:true,color:{argb:ROUGE}};
          cs.alignment={horizontal:'left',vertical:'middle',wrapText:true,indent:1};
          cs.border=bordN;
          let laize='';
          if(it.bob){const l2=_mm(d.largeur);laize=l2===''?'':l2+' mm';}
          else{const dims=[_mm(d.largeur),_mm(d.longueur)].filter(x=>x!==''&&x!=null).join('×');laize=dims?dims+' mm':'';}
          const cars=[
            ['GRAMMAGE',d.grammage?d.grammage+' g/m²':''],[it.bob?'LAIZE':'DIMENSIONS',laize],
            ['COULEUR',d.couleur],['POIDS NET',d.poids?Math.round(d.poids)+' kgs':''],
            ['USINE',d.usine],['PRIX',_fmtPrix(d.prixT)],
          ];
          cars.forEach((cv,k)=>_car(ws.getRow(rC+Math.floor(k/2)).getCell(c0+(k%2)),cv[0],cv[1]));
        });
        r=rC+4;rowIdx++;
      }
      const _colLC=(n)=>{let t='';while(n>0){t=String.fromCharCode(65+((n-1)%26))+t;n=Math.floor((n-1)/26);}return t;};
      ws.pageSetup.printArea='A1:'+_colLC(nColsC)+(r-1);
    };
    // Portrait A4 ajusté à la largeur ; les onglets Photos/Cartes passent en
    // paysage. ExcelJS : la vue s'appelle `style` (écrite dans l'attribut XML
    // `view`) — `view:` serait ignoré en silence et le fond gris sauterait.
    // Zoom écran : mother-tabs à 50 %, Cartes à 70 % (essai d'harmoniser la
    // largeur = portrait à 99 % rejeté par Ethan, on garde ces valeurs).
    const _shOpts={views:[{style:'pageBreakPreview',zoomScale:50}],pageSetup:{orientation:'portrait',paperSize:9,fitToPage:true,fitToWidth:1,fitToHeight:0}};
    const _shOptsL={views:[{style:'pageBreakPreview',zoomScale:50}],pageSetup:{orientation:'landscape',paperSize:9,fitToPage:true,fitToWidth:1,fitToHeight:0}};
    // Onglet 1 « Offre » = vue ASSEMBLÉE (une ligne par lot — sa colonne
    // REFERENCE vide disparaît d'elle-même) ; onglet 2 « Détails » = article
    // par article ; onglet 3 « Photos » = DÉTAILLÉ réf par réf, chaque
    // article avec SA photo à gauche (demande Ethan 25/08).
    await _buildSheet(wb.addWorksheet('Offre',_shOpts),lotsBob,lotsFmt,{sans:['MANDRIN','DIAMETRE','MONTANT'],bandN:5});
    await _buildSheet(wb.addWorksheet('Détails',_shOpts),bobines,formats);
    const _photosImgs=await _buildSheet(wb.addWorksheet('Photos',_shOptsL),bobines,formats,{photos:true});
    // ESSAI onglet « Cartes » façon site (photo haut + specs bas) — réutilise
    // les images de l'onglet Photos (pas de re-téléchargement). Paysage + zoom
    // 70, 5 cartes/rangée, vue « Aperçu des sauts de page » (FOND GRIS + CADRE
    // BLEU de la zone d'impression, comme les autres onglets). Les sauts de page
    // sont posés à la main au bord de rangée (voir _buildCartes) → plus de ligne
    // bleue au milieu des photos. Marges 0,2" = CARTES_MARGIN_IN.
    const _shOptsCartes={views:[{style:'pageBreakPreview',zoomScale:70}],pageSetup:{orientation:'landscape',paperSize:9,fitToPage:true,fitToWidth:1,fitToHeight:0,margins:{left:CARTES_MARGIN_IN,right:CARTES_MARGIN_IN,top:CARTES_MARGIN_IN,bottom:CARTES_MARGIN_IN,header:0,footer:0}}};
    await _buildCartes(wb.addWorksheet('Cartes',_shOptsCartes),bobines,formats,_photosImgs,{cols:5,land:true});

    const buf=await wb.xlsx.writeBuffer();
    const blob=new Blob([buf],{type:'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'});
    const a=document.createElement('a');
    a.href=URL.createObjectURL(blob);
    a.download='Offre Prodiconseil '+new Date().toLocaleDateString('fr-FR').replace(/\//g,'-')+'.xlsx';
    document.body.appendChild(a);a.click();a.remove();
    setTimeout(()=>URL.revokeObjectURL(a.href),2000);
    toast('📄 Excel généré');
  }catch(e){
    console.error('excel export',e);
    toast('Erreur génération Excel');
  }finally{
    if(span&&prev)span.textContent=prev;
    if(btn)btn.disabled=false;
  }
}


// Panneau gauche vue client : récap de la sélection, ventilation par qualité,
// contact direct et infos logistiques (remplace le panneau filtres).
// Compteur header vue client : « 12 bobines • 6 formats » au lieu de « 18 articles »
function _rbarSharedCounts(list){
  const b=list.reduce((s,p)=>s+(!_estFormat(p)?(p._grpCount||1):0),0);
  const f=list.reduce((s,p)=>s+(_estFormat(p)?(p._grpCount||1):0),0);
  const parts=[];
  if(b)parts.push(b+(b>1?' bobines':' bobine'));
  if(f)parts.push(f+(f>1?' formats':' format'));
  const el=document.getElementById('rbar-refs');
  const lbl=document.getElementById('rbar-refs-lbl');
  if(el)el.textContent=parts.join(' • ')||'0 article';
  if(lbl)lbl.textContent='';
}
// Onglets segmentés façon Apple : Tous les produits / Bobines / Formats
function _sharedTab(mode,btn){
  document.querySelectorAll('#shared-tabs button').forEach(b=>b.classList.remove('on'));
  btn.classList.add('on');
  const list=mode==='all'?_sharedAll.slice():_sharedAll.filter(p=>mode==='bob'?!_estFormat(p):_estFormat(p));
  render(list);
  window.prodiTrack?.('shared_tab',{mode});
}
function _buildSharedTabs(){
  if(document.getElementById('shared-tabs'))return;
  const bobs=_sharedAll.filter(p=>!_estFormat(p)).length;
  const fmts=_sharedAll.length-bobs;
  if(!bobs||!fmts)return;
  const d=document.createElement('div');
  d.id='shared-tabs';
  d.innerHTML=`<button class="on" onclick="_sharedTab('all',this)">Tous les produits</button><button onclick="_sharedTab('bob',this)">Bobines</button><button onclick="_sharedTab('fmt',this)">Formats</button>`;
  const g=document.getElementById('pgrid');
  if(g)g.parentNode.insertBefore(d,g);
}
// Popup d'accueil vue client (10/08) : le header est réduit au logo, le
// téléchargement Excel est proposé D'ENTRÉE dans ce popup (gabarit recap-card).
function _excelPopup(){
  if(_leadMode)return; // accès lead : pas d'Excel (il contient les prix)
  if(document.getElementById('recap-bg'))return;
  if(!cart||!cart.length)return;
  const d=document.createElement('div');
  d.id='recap-bg';
  d.innerHTML=`<div class="recap-card" style="text-align:center;">
    <button class="recap-x" onclick="document.getElementById('recap-bg').remove()" aria-label="Fermer">✕</button>
    <svg width="54" height="54" viewBox="0 0 32 32" style="margin-bottom:10px;"><rect x="9" y="2" width="21" height="14" rx="3.5" fill="#8bd47e"/><rect x="20" y="2" width="10" height="14" rx="3.5" fill="#b9e695"/><path d="M9 9h17.5A3.5 3.5 0 0 1 30 12.5V26.5a3.5 3.5 0 0 1-3.5 3.5H12.5A3.5 3.5 0 0 1 9 26.5Z" fill="#2f9e55"/><rect x="2" y="12" width="16" height="16" rx="3.5" fill="#185c37"/><path d="M6.4 16.5h2.7l1.8 3.2 1.8-3.2h2.7l-3.1 4.7 3.2 4.8h-2.8l-1.8-3.3-1.9 3.3H6.2l3.2-4.8z" fill="#fff"/></svg>
    <div class="recap-title">Votre liste est prête</div>
    <button class="recap-go" onclick="exportListExcelTest(this).then(()=>document.getElementById('recap-bg')?.remove()).catch(()=>toast('Erreur export'))">Télécharger le Excel</button>
  </div>`;
  d.onclick=e=>{if(e.target===d)d.remove();};
  document.body.appendChild(d);
  window.prodiTrack?.('shared_excel_popup');
}
// Popup récap après l'animation : résumé de l'offre avant de découvrir la liste.
function _sharedRecap(){
  if(document.getElementById('recap-bg'))return;
  const list=cart;
  if(!list||!list.length){window._ctnReveal?.();return;}
  const tot=list.reduce((s,p)=>s+(+p.poids_net||0),0);
  const bobs=list.filter(p=>!_estFormat(p)).length;
  const fmts=list.length-bobs;
  // Synthèse ASSEMBLÉE par qualité : unités, plage de grammages, tonnage
  const qmap={};
  list.forEach(p=>{
    const t=formatProductTitle(p.qualite,p.type)||'Autre';
    const k=(t.split('—')[1]||t).trim();
    const g=qmap[k]=qmap[k]||{kg:0,nBob:0,nFmt:0,gMin:null,gMax:null};
    g.kg+=(+p.poids_net||0);
    if(_estFormat(p))g.nFmt++;else g.nBob++;
    const gr=+p.grammage||0;
    if(gr){g.gMin=g.gMin==null?gr:Math.min(g.gMin,gr);g.gMax=g.gMax==null?gr:Math.max(g.gMax,gr);}
  });
  const qrows=Object.entries(qmap).sort((a,b)=>b[1].kg-a[1].kg);
  const _qSub=g=>{
    const parts=[];
    if(g.nBob)parts.push(g.nBob+(g.nBob>1?' bobines':' bobine'));
    if(g.nFmt)parts.push(g.nFmt+(g.nFmt>1?' formats':' format'));
    let txt=parts.join(' + ');
    if(g.gMin)txt+=' · '+(g.gMin===g.gMax?g.gMin:g.gMin+'–'+g.gMax)+' g/m²';
    return txt;
  };
  const prix=_priceMode?list.reduce((s,p)=>s+(p.poids_net||0)*(p.price||0),0):0;
  const d=document.createElement('div');
  d.id='recap-bg';
  d.innerHTML=`<div class="recap-card">
    <button class="recap-x" onclick="document.getElementById('recap-bg').remove();window._ctnReveal?.()" aria-label="Fermer">✕</button>
    <div class="recap-eyebrow">Votre sélection</div>
    <div class="recap-stats">
      ${bobs?`<div class="recap-stat"><b>${bobs}</b><span>bobine${bobs>1?'s':''}</span></div>`:''}
      ${fmts?`<div class="recap-stat"><b>${fmts}</b><span>format${fmts>1?'s':''}</span></div>`:''}
      <div class="recap-stat"><b>${(tot/1000).toFixed(1)}</b><span>tonnes</span></div>
      ${prix?`<div class="recap-stat recap-prix"><b>${(Math.round(prix/10)*10).toLocaleString('fr-FR')}</b><span>€</span></div>`:''}
    </div>
    <div class="recap-quals">
      ${qrows.slice(0,5).map(([k,g])=>`<div class="recap-q"><span class="recap-q-name">${esc(k)}<small>${esc(_qSub(g))}</small></span><b>${(g.kg/1000).toFixed(1)} T</b></div>`).join('')}
      ${qrows.length>5?`<div class="recap-q" style="color:#999"><span>+ ${qrows.length-5} autres qualités</span><b></b></div>`:''}
    </div>
    <button class="recap-go" onclick="document.getElementById('recap-bg').remove();window._ctnReveal?.()">Voir la liste</button>
  </div>`;
  d.onclick=e=>{if(e.target===d){d.remove();window._ctnReveal?.();}};
  document.body.appendChild(d);
}
function _buildSharedInfo(list){
  document.getElementById('shared-info')?.remove();
  const bw=document.querySelector('.body-wrap');
  if(!bw||!list.length)return;
  const tot=list.reduce((s,p)=>s+(+p.poids_net||0),0);
  const bobs=list.filter(p=>!_estFormat(p)).length;
  const fmts=list.length-bobs;
  const qmap={};
  list.forEach(p=>{
    const t=formatProductTitle(p.qualite,p.type)||'Autre';
    const k=(t.split('—')[1]||t).trim();
    (qmap[k]=qmap[k]||{n:0,kg:0});qmap[k].n++;qmap[k].kg+=(+p.poids_net||0);
  });
  const qrows=Object.entries(qmap).sort((a,b)=>b[1].kg-a[1].kg);
  const prix=_priceMode?list.reduce((s,p)=>s+(p.poids_net||0)*(p.price||0),0):0;
  const d=document.createElement('div');
  d.id='shared-info';
  d.innerHTML=`
    <div class="si-card">
      <div class="si-title">Votre sélection</div>
      <div class="si-big">${list.length} <small>produits</small></div>
      <div class="si-big">${(tot/1000).toFixed(1)} <small>tonnes</small></div>
      ${prix?`<div class="si-big" style="color:var(--red)">${(Math.round(prix/10)*10).toLocaleString('fr-FR')} <small>€</small></div>`:''}
      <div class="si-row"><span>Bobines</span><b>${bobs}</b></div>
      <div class="si-row"><span>Formats</span><b>${fmts}</b></div>
    </div>
    <div class="si-card">
      <div class="si-title">Par qualité</div>
      ${qrows.slice(0,6).map(([k,v])=>`<div class="si-row"><span>${esc(k)}</span><b>${(v.kg/1000).toFixed(1)} T</b></div>`).join('')}
      ${qrows.length>6?`<div class="si-row" style="color:#999"><span>+ ${qrows.length-6} autres qualités</span></div>`:''}
    </div>
    <div class="si-card">
      <div class="si-title">Une question ?</div>
      <a class="si-btn si-wa" href="https://wa.me/33609997407" target="_blank" rel="noopener noreferrer" onclick="window.prodiTrack?.('whatsapp_click',{via:'shared'})">WhatsApp</a>
      <a class="si-btn" href="tel:+33609997407" onclick="window.prodiTrack?.('tel_click',{via:'shared'})">+33 6 09 99 74 07</a>
      <a class="si-btn" href="mailto:ethan@prodi.com" onclick="window.prodiTrack?.('email_click',{via:'shared'})">ethan@prodi.com</a>
      <div class="si-row" style="color:#999"><span>Lun – Ven · 9h – 18h</span></div>
    </div>
    <div class="si-card">
      <div class="si-title">Logistique</div>
      <div class="si-row"><span>Devis</span><b>sous 24 h</b></div>
      <div class="si-row"><span>Chargement Europe</span><b>24 – 48 h</b></div>
      <div class="si-row"><span>EUR1, COO</span><b>sur demande</b></div>
    </div>`;
  bw.insertBefore(d,bw.firstElementChild);
}

// Vue client : aperçu photo flottant au survol de la vignette du tableau —
// la photo compte mais le tableau reste dense. Tap mobile = fiche (openDetail).
(function(){
  let peek=null;
  function ensure(){
    if(peek)return peek;
    peek=document.createElement('div');
    peek.id='photo-peek';
    peek.style.cssText='position:fixed;z-index:9500;pointer-events:none;display:none;background:#fff;border:2px solid var(--ink);border-radius:10px;padding:4px;box-shadow:0 10px 30px rgba(0,0,0,.25);';
    peek.innerHTML='<img style="display:block;max-width:380px;max-height:460px;border-radius:7px;">';
    document.body.appendChild(peek);
    return peek;
  }
  document.addEventListener('mouseover',e=>{
    if(!_sharedMode||!e.target.closest)return;
    const t=e.target.closest('.plist-thumb');
    if(!t||!t.src||/no-photo|sur-demande/.test(t.src))return;
    const pk=ensure();
    pk.querySelector('img').src=t.src;
    pk.style.display='block';
  });
  document.addEventListener('mousemove',e=>{
    if(!peek||peek.style.display==='none')return;
    if(!e.target.closest||!e.target.closest('.plist-thumb')){peek.style.display='none';return;}
    const w=400,h=480;
    let x=e.clientX+18,y=Math.min(Math.max(10,e.clientY-h/2),innerHeight-h-10);
    if(x+w>innerWidth-10)x=e.clientX-w-18;
    peek.style.left=x+'px';peek.style.top=y+'px';
  });
  document.addEventListener('mouseout',e=>{
    if(peek&&e.target.closest&&e.target.closest('.plist-thumb'))peek.style.display='none';
  });
})();
