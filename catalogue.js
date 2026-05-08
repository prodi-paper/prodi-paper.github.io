
// ─── EMAILJS ───
const EJS_PUB = 'e3aqMGO-mZiAECrb5';
const EJS_SVC = 'service_k3060so';
const EJS_TPL = 'template_atcwwc2';
(function(){ try{ emailjs.init({ publicKey: EJS_PUB }); } catch(_){} })();

const SURL='https://bvcgpdoukhcatjibmvnb.supabase.co';
const SKEY='eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJ2Y2dwZG91a2hjYXRqaWJtdm5iIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzIyNzg5MjgsImV4cCI6MjA4Nzg1NDkyOH0.Ip3ykSUS9sajTH04yXBerOG1haBKMD1kAvMQNjnGL1Q';
const SB_H={'apikey':SKEY,'Authorization':'Bearer '+SKEY,'Content-Type':'application/json'};
async function sbQ(path,opts={}){
  const r=await fetch(SURL+'/rest/v1/'+path,{method:opts.method||'GET',headers:{...SB_H,...(opts.headers||{})},body:opts.body!=null?JSON.stringify(opts.body):undefined,signal:opts.signal});
  const txt=await r.text();const d=txt?JSON.parse(txt):null;
  const cr=r.headers.get('Content-Range');
  const _rawCnt=cr&&cr.includes('/')?+cr.split('/')[1]:null;
  return{data:r.ok?d:null,error:r.ok?null:(d||{message:'HTTP '+r.status}),count:(_rawCnt!=null&&!isNaN(_rawCnt))?_rawCnt:null};
}

// ─── SECURITY HELPERS — XSS escape for product fields injected via innerHTML ───
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
// safeUrl: whitelist http(s) and trusted hosts; returns empty string for anything else (data:, javascript:, etc.)
const safeUrl = u => {
  const s = String(u||'').trim();
  if (!/^https?:\/\//i.test(s)) return '';
  return esc(s);
};
// attrJs: produces a valid HTML-attribute-safe JS string literal (use WITHOUT surrounding quotes in onclick)
const attrJs = s => esc(JSON.stringify(String(s ?? '')));
// numId: coerce id to integer for use in onclick handlers (prevents JS injection if id is non-numeric string)
const numId = v => Number.isFinite(+v) ? +v : 0;
const WA='33649754915';
let all=[],cur=null;
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
let _groupedTotalCount=0;       // nb de groupes
let _groupQty={};               // gid → qty sélectionnée dans la card (1 par défaut)
const groupKey = p => [
  p.qualite||'',
  p.couleur||'',
  (p.details||'').trim(),
  p.grammage??'',
  p.largeur??'',
  p.format||''
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
let _priceMode=false;
function togglePriceMode(on){
  _priceMode=on;
  ['lang-fr','lang-fr-m'].forEach(id=>{const e=document.getElementById(id);if(e){e.classList.toggle('on',true);e.style.background=on?'var(--red)':'';e.style.borderColor=on?'var(--red)':'';e.style.color=on?'#fff':'';}});
  const g=document.getElementById('pgrid');
  if(g&&g._lastList)render(g._lastList);
  // Re-render detail modal only if it's actually open
  if(_detIdx>=0&&all[_detIdx]&&document.getElementById('detail-bg')?.classList.contains('show'))
    openDetail(all[_detIdx].id);
}
const ico=t=>({Kraft:'📦',FBB:'🗂️',SBS:'📋',Testliner:'🧱',Fluting:'〰️',Offset:'🧻',Thermique:'🏷️',Duplex:'📄',Triplex:'📑'}[t]||'📦');
const icoType=n=>({'Kraft':'📦','Kraft armé':'🔩','Kraft gomme':'🔖','SBS':'📋','FBB':'🗂️','Liner':'📜','Testliner':'🧱','Fluting':'〰️','Offset':'🧻','Thermique':'🏷️','LWC':'📰','Couché 1 face':'🖨️','Couché 2 faces':'🖨️','Luxe':'✨','Ouate':'🤍','Journal':'📰','Duplex':'📄','Triplex':'📑','Couleur':'🎨','Adhésif':'🔖','Silicone-Glassine':'🫧','Complexe':'🧩','Emballage':'📦','Plastique':'🔲','Carton couché':'🗃️','Carton non couché':'🗃️','Bouffant':'📄','Autocopiant':'📄','Ramette':'📄','Spécial':'⭐','Papier affiche':'🖼️','Papier cadeau':'🎁','Cuisson':'🔥','Encre':'🖊️','Enveloppes':'✉️','Autres':'📦'}[n]||'📦');
const fmt=kg=>!kg?'—':kg>=1000?(kg/1000).toFixed(1)+' t':kg+' KGS';
const mmToCm=mm=>mm!=null?+(mm/10).toFixed(1):null;
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
  'Couleur':           ['RCOL','SCOL'],
  'Offset Couleur':    ['RCOL','SCOL'],
  'Dossier Couleur':   ['RCOL','SCOL'],
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
  {keys:['format','formats','palette','palettes','feuille','feuilles'],label:'Format — Palette',
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
let _allProductsCache=null,_allProductsLoading=null;
async function _loadAllProducts(){
  if(_allProductsCache)return _allProductsCache;
  if(_allProductsLoading)return _allProductsLoading;
  _allProductsLoading=(async()=>{
    const CHUNK=1000;
    // select=* so fuzzy results carry image_url, fournisseur, origine, type_produit, etc.
    // — same shape rowToUi expects from the server path. Missing any of these caused
    // missing photos and 0T tonnage in fuzzy-fallback results.
    let all=[],offset=0;
    for(let i=0;i<20;i++){
      const to=offset+CHUNK-1;
      const r=await sbQ('products?select=*',{headers:{'Range-Unit':'items','Range':offset+'-'+to}});
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
const toast=(m,d=3000)=>{const e=document.getElementById('toast');e.textContent=m;e.classList.add('show');setTimeout(()=>e.classList.remove('show'),d);};
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
  // Split Couleur (RCOL/SCOL) into Offset Couleur (<150g) vs Dossier Couleur (≥150g)
  const _typeLabel=(()=>{
    if((quality==='RCOL'||quality==='SCOL')&&gsm!=null)
      return gsm<150?'Offset Couleur':'Dossier Couleur';
    return Object.entries(TYPE_MAP).find(([,v])=>v.includes(quality))?.[0]||'';
  })();
  const name=_detMain||[_typeLabel,simplCouleur(color)].filter(Boolean).join(' — ')||(ref&&!ref.startsWith('Photo_')?ref:'Produit');
  const type = quality || 'Produit';

  return {
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
const cmpSet = new Set();
function toggleCompare(id){
  id = +id;
  const btn = document.getElementById('cmp-'+id);
  if(cmpSet.has(id)){
    cmpSet.delete(id);
    if(btn){btn.textContent='⊕';btn.classList.remove('cmp-active');}
  } else {
    if(cmpSet.size>=3){toast(LT[lang].t_cmp_max3);return;}
    cmpSet.add(id);
    if(btn){btn.textContent='✓';btn.classList.add('cmp-active');}
  }
  updateCmpBar();
}
function updateCmpBar(){
  const bar=document.getElementById('cmp-bar');
  const items=document.getElementById('cmp-bar-items');
  const cnt=document.getElementById('cmp-bar-count');
  if(!bar)return;
  cnt.textContent=cmpSet.size;
  bar.classList.toggle('show',cmpSet.size>=2);
  const slots=Array.from({length:3},(_,i)=>{
    const id=[...cmpSet][i];
    if(!id)return`<div class="cmp-thumb-empty">+</div>`;
    const p=all.find(x=>x.id===+id);
    return p&&p.image_url?`<img class="cmp-thumb" src="${safeUrl(p.image_url)}" title="${esc(p.name)}">`:`<div class="cmp-thumb-empty" style="color:#aaa;font-size:10px">${esc(p?.name?.substring(0,6)||'?')}</div>`;
  });
  items.innerHTML=slots.join('');
}
function clearCompare(){
  cmpSet.clear();
  document.querySelectorAll('.btn-cmp-card.cmp-active').forEach(b=>{b.textContent='⊕';b.classList.remove('cmp-active');});
  updateCmpBar();
}
function openCmpModal(){
  const products=[...cmpSet].map(id=>all.find(x=>x.id===+id)).filter(Boolean);
  if(products.length<2){toast(LT[lang].t_cmp_min2);return;}
  const specs=[
    {lbl:'Image',key:'img'},
    {lbl:'Référence',key:'ref'},
    {lbl:'Type',key:'_type'},
    {lbl:'Couleur',key:'couleur'},
    {lbl:'Grammage',key:'grammage',unit:'g/m²'},
    {lbl:'Laize',key:'largeur',unit:'cm',transform:v=>+(v/10).toFixed(1)},
    {lbl:'Longueur',key:'longueur',unit:'mm'},
    {lbl:'Mandrin',key:'noyau',unit:'mm'},
    {lbl:'Condit.',key:'_format'},
    {lbl:'Poids',key:'poids_net',unit:'kg'},
    // PRIX_MASQUÉ: {lbl:'Prix',key:'price',unit:'€/T'},
  ];
  // header
  let html=`<thead><tr><th>Spec</th>${products.map(p=>`<th><div style="font-size:13px;font-weight:700;color:var(--ink)">${esc(p.name)}</div><div style="font-size:11px;color:var(--gray);margin-top:2px">${esc(p.ref&&!p.ref.startsWith('Photo_')?p.ref:'')}</div></th>`).join('')}</tr></thead><tbody>`;
  specs.forEach(({lbl,key,unit,transform})=>{
    const vals=products.map(p=>{
      // 'img' key returns pre-built HTML with safeUrl; mark as trusted for downstream esc skip
      if(key==='img')return p.image_url?`<img src="${safeUrl(p.image_url)}" style="max-height:80px;max-width:100px;object-fit:cover;border-radius:4px">`:'—';
      if(key==='_type')return Object.entries(TYPE_MAP).find(([,v])=>v.includes(p.quality))?.[0]||p.quality||'—';
      if(key==='_format')return formatLabel(p)||p.format||'—';
      if(key==='ref')return(p.ref&&!p.ref.startsWith('Photo_'))?p.ref:'—';
      let v=p[key];
      if(v===null||v===undefined||v==='')return'—';
      if(transform)v=transform(v);
      return unit?v+' '+unit:v;
    });
    // highlight differences
    const unique=new Set(vals.filter(v=>v!=='—'));
    const diff=unique.size>1;
    html+=`<tr><td class="cmp-label">${esc(lbl)}</td>${vals.map((v,i)=>`<td class="${diff&&v!=='—'?'cmp-diff':''}">${key==='img'?v:esc(v)}</td>`).join('')}</tr>`;
  });
  // CTA row
  html+=`<tr><td class="cmp-label">Action</td>${products.map(p=>`<td><button class="btn-add-cart" style="width:auto;padding:7px 14px" onclick="addToCart(${numId(p.id)})">+ ${lang==='en'?'Add':'Ajouter'}</button></td>`).join('')}</tr>`;
  html+='</tbody>';
  document.getElementById('cmp-table').innerHTML=html;
  document.getElementById('cmp-modal-bg').classList.add('show');
}
function closeCmpModal(){document.getElementById('cmp-modal-bg').classList.remove('show');}

function cardWa(id){
  const p=all.find(x=>x.id===+id);
  if(!p)return;
  const msg=`Bonjour, je suis intéressé par : ${p.name}${p.grammage?' '+p.grammage+'g/m²':''}${p.largeur?' '+mmToCm(p.largeur)+'cm':''}${p.couleur?' '+p.couleur:''} — ${fmt(p.poids_net)} disponibles. Quel est votre prix ?`;
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
  setLang(lang);
  updateFilterVisibility();
  // Hardcoded filter options — Couleur replaced by Offset Couleur + Dossier Couleur
  const typeVals=Object.keys(TYPE_MAP).filter(k=>k!=='Couleur'&&k!=='Offset Couleur'&&k!=='Dossier Couleur').concat(['Offset Couleur','Dossier Couleur']).sort((a,b)=>a.localeCompare(b));
  const couleurVals=['Blanc','Très blanc','Blanc nature','Brun','Crème','Ivoire','Gris','Noir','Transparent','Vert','Rouge','Bleu','Jaune','Orange','Argent','Rose','Or','Violet','Autres'];
  const _typeLabel=v=>v==='Offset Couleur'?`RCOL — ${QUALITE_LABELS[v]} <span class="msd-hint">&lt;&nbsp;150&nbsp;g/m²</span>`:v==='Dossier Couleur'?`RCOL — ${QUALITE_LABELS[v]} <span class="msd-hint">≥&nbsp;150&nbsp;g/m²</span>`:`${v} — ${QUALITE_LABELS[v]||v}`;
  buildMsdOptions('msd-type',QUALITE_CODES,'Tous',_typeLabel);
  buildMsdOptions('sb-msd-type',QUALITE_CODES,'Type de papier',_typeLabel,'msd-type');
  buildMsdOptions('msd-couleur',couleurVals,'Couleurs');
  buildMsdOptions('sb-msd-couleur',couleurVals,'Couleurs',undefined,'msd-couleur');

  buildMsdOptions('msd-mandrin',['70','76','150','152'],'Mandrins',v=>v+' mm');

  // Also build mobile msd panels (msd-type-mob, msd-mandrin-mob, msd-couleur-mob)
  buildMsdOptions('msd-type-mob',QUALITE_CODES,'Tous',_typeLabel,'msd-type');
  buildMsdOptions('msd-couleur-mob',couleurVals,'Couleurs',null,'msd-couleur');
  buildMsdOptions('msd-mandrin-mob',['70','76','150','152'],'Mandrins',v=>v+' mm','msd-mandrin');

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
  // Single query: first page + total count
  _featuredMode = true;
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
};
const msdLabels = {
  'msd-type': 'Type de papier',
  'msd-mandrin': 'Mandrins',
  'msd-couleur': 'Couleurs',
  'msd-details': 'Détails',
};
const QUALITE_CODES=['R1SC','R2SC','RADH','RAFF','RBOA','RBON','RBOU','RCAR','ROFF','Offset Couleur','Dossier Couleur','RCUI','RDIV','RFLEX','RKDO','RKRA','RKRABRUN','RKRG','RKRR','RLINER','RLUX','RLWC','RNEW','RPAC','RPLA','RSIL','RTHERM','RTIS','S1SC','S2SC','SADH','SAFF','SBOA','SBON','SBOU','SCAR','SCOL','SCUT','SDIV','SENV','SKDO','SKRA','SLUX','SLWC','SNEW','SOFF','SPAC','SPLA','SSBS','SSPE','SINK','UMAC','AUTRES'];
const QUALITE_KNOWN=QUALITE_CODES.filter(c=>c!=='AUTRES');
// Real DB quality codes (pseudo-codes expanded to actual values)
const QUALITE_KNOWN_DB=[...new Set(QUALITE_KNOWN.flatMap(c=>(c==='Offset Couleur'||c==='Dossier Couleur')?['RCOL']:[c]))];
const QUALITE_LABELS={
  'R1SC':'Couché 1 face',
  'R2SC':'Couché 2 faces',
  'RADH':'Adhésif',
  'RAFF':'Papier affiche',
  'RBOA':'Carton couché',
  'RBON':'Carton non couché',
  'RBOU':'Bouffant',
  'RCAR':'Autocopiant',
  'Offset Couleur':'Offset couleur',
  'Dossier Couleur':'Dossier couleur',
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

// CN8 EU TARIC codes per internal code (source: TARIC chapitres 32, 48, 84 — taricsupport.com 2026).
// UN SEUL code 8 chiffres par produit (le catch-all le plus probable). Affinement via getHsCode()
// selon grammage/format pour pointer la sous-position exacte.
const HS_CODES={
  // Couché 1/2 faces — défaut: autre graphique couché kaolin
  'R1SC':'48101900', 'R2SC':'48101900', 'S1SC':'48101900', 'S2SC':'48101900',
  // Adhésif / gommé
  'RADH':'48114190', 'SADH':'48114190', 'RKRG':'48114190',
  // Affiche / couleur — papier vierge >150g par défaut
  'RAFF':'48025890', 'SAFF':'48025890', 'RCOL':'48025890', 'SCOL':'48025890',
  // Carton couché kaolin (SBS/FBB/GC/GD/GT/luxe) — défaut multi-couche >225g
  'RBOA':'48109290', 'SBOA':'48109290',
  'RLUX':'48109290', 'SLUX':'48109290', 'SSBS':'48109290',
  // Carton non couché — défaut autre >225g
  'RBON':'48059380', 'SBON':'48059380',
  // Bouffant — défaut autre mécanique
  'RBOU':'48026900', 'SBOU':'48026900',
  // Autocopiant / carbone
  'RCAM':'48092000', 'SCAM':'48092000', 'RCAR':'48092000', 'SCAR':'48092000',
  // Cuisson — défaut autre glazed transparent
  'RCUI':'48064090',
  // Divers / spécial / cadeau — catch-all "autres articles en papier"
  'RDIV':'48239085', 'SDIV':'48239085', 'SSPE':'48239085', 'RKDO':'48239085',
  // Complexes / kraft armé / thermique — défaut autre couché
  'RFLEX':'48119000', 'SFLEX':'48119000',
  'RKRR':'48119000', 'SKRR':'48119000', 'RTHERM':'48119000',
  // Kraft non couché — défaut kraftliner unbleached other
  'RKRA':'48041190', 'SKRA':'48041190', 'RKRABRUN':'48041190',
  // Liner — défaut testliner ≤150g
  'RLINER':'48052400',
  // LWC
  'RLWC':'48102200', 'SLWC':'48102200',
  // Papier mince <40g
  'RMIN':'48025400',
  // Journal
  'RNEW':'48010000', 'SNEW':'48010000',
  // Offset / ramette / offset avec bois
  'ROFF':'48025590', 'SOFF':'48025590', 'SCUT':'48025680', 'SOFB':'48026900',
  // Emballage — défaut kraft >225g
  'RPAC':'48045990', 'SPAC':'48045990',
  // Plastique — défaut papier plastifié autre
  'RPLA':'48115900', 'SPLA':'48115900',
  // Silicone / glassine
  'RSIL':'48064090', 'SSIL':'48064090',
  // Ouate / tissue — défaut autre
  'RTIS':'48030090', 'STIS':'48030090',
  // Enveloppes
  'RENV':'48171000', 'SENV':'48171000',
  // Encres (chapitre 32) — défaut autres couleurs
  'SINK':'32151900',
  // Kraft pour maculature — testliner >150g
  'SKRM':'48052500',
  // Machines (chapitre 84) — défaut machines de découpe papier
  'UMAC':'84413010', 'UMAN':'84413010',
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

// Refines CN8 code based on grammage / format. UN SEUL code 8 chiffres retourné.
// Codes TARIC réels chapitres 48 (papier) et 32 (encres) — source taricsupport.com 2026.
function getHsCode(qualite,gsm,format){
  if(!qualite||!HS_CODES[qualite])return null;
  const isPalette=format&&/palette|feuille/i.test(format);
  const g=Number(gsm)||0;
  switch(qualite){
    case 'ROFF': case 'SOFF':
      if(!g)break;
      if(g<40)return '48025400';
      if(isPalette)return g<=150?'48025680':'48025890';
      if(g<=60)return '48025515';
      if(g<=75)return '48025525';
      if(g<=80)return '48025530';
      if(g<=150)return '48025590';
      return '48025810';
    case 'SCUT':
      if(!g)break;
      if(g<40)return '48025400';
      if(g<=150)return '48025680';
      return '48025890';
    case 'RBOU': case 'SBOU':
      if(!g)break;
      if(g<40)return '48025400';
      if(isPalette)return '48026200';
      if(g<=72)return '48026115';
      if(g<=150)return '48026180';
      return '48026900';
    case 'SOFB':
      if(g&&g<=72&&!isPalette)return '48026115';
      return isPalette?'48026200':'48026180';
    case 'RBOA': case 'SBOA': case 'RLUX': case 'SLUX': case 'SSBS':
      if(!g)break;
      if(g<=150)return '48101900';
      if(g<=225)return '48103290';
      return '48109290';
    case 'R1SC': case 'S1SC': case 'R2SC': case 'S2SC':
      if(!g)break;
      if(g<=150)return '48101900';
      return isPalette?'48102980':'48102930';
    case 'RBON': case 'SBON':
      if(!g)break;
      if(g<=150)return '48052400';
      if(g<=225)return '48059200';
      return '48059380';
    case 'RKRA': case 'SKRA':
      if(!g)break;
      if(g<60)return '48043180';
      if(g<=115)return '48042190';
      if(g<175)return '48041190';
      if(g<=225)return '48041119';
      return '48045100';
    case 'RKRABRUN':
      if(!g)break;
      if(g<=115)return '48042190';
      if(g<175)return '48041190';
      if(g<=225)return '48041119';
      return '48045100';
    case 'RLINER':
      if(!g)break;
      if(g<=150)return '48052400';
      if(g<175)return '48052500';
      return '48041119';
    case 'RLWC': case 'SLWC': return '48102200';
    case 'RCUI': return '48064090';
    case 'RNEW': case 'SNEW': return '48010000';
    case 'RENV': case 'SENV': return '48171000';
    case 'RMIN':
      if(g&&g<40)return '48025400';
      break;
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

function toggleMsd(id) {
  const panel = document.querySelector(`#${id} .msd-panel`);
  const btn = document.querySelector(`#${id} .msd-btn`);
  const isOpen = panel.classList.contains('show');
  // Position fixed panel under button
  if(!isOpen){
    const r=btn.getBoundingClientRect();
    panel.style.top=(r.bottom+4)+'px';
    panel.style.left=r.left+'px';
    panel.style.width=r.width+'px';
  }
  // Close all
  document.querySelectorAll('.msd-panel.show').forEach(p => p.classList.remove('show'));
  document.querySelectorAll('.msd-btn.open').forEach(b => b.classList.remove('open'));
  if (!isOpen) {
    panel.classList.add('show'); btn.classList.add('open');
    // Add scroll hint if panel is scrollable
    let hint=panel.querySelector('.msd-scroll-hint');
    if(!hint){hint=document.createElement('div');hint.className='msd-scroll-hint';panel.appendChild(hint);}
    hint.classList.toggle('hidden',panel.scrollHeight<=panel.clientHeight+10);
    panel.onscroll=()=>{if(hint)hint.classList.toggle('hidden',panel.scrollTop+panel.clientHeight>=panel.scrollHeight-10);};
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
  updateMsdBtn(id);
  filterProducts();
}

function updateMsdBtn(id) {
  const set = msdState[id];
  const _disp = v => v===DETAILS_NONE ? 'Sans détails' : v;
  const btns = [
    ...document.querySelectorAll(`#${id} .msd-btn, #${id} .fb-msd-btn`),
    ...document.querySelectorAll(`[data-msd-id="${id}"]`)
  ];
  btns.forEach(btn => {
    const label = btn.querySelector('.msd-btn-label') || btn.querySelector('span:first-child');
    if(!label) return;
    const old = btn.querySelector('.msd-count'); if(old) old.remove();
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
let _stockFilter=new Set(); // Set of 'stocklot' | 'fab' | 'siderun' — multichoix (OR)
// Tester l'appartenance d'un produit aux 3 catégories de stock.
function _stockMatch(p){
  if(_stockFilter.size===0)return true;
  const _hasFab=(p.ref&&/FAB/i.test(String(p.ref)))||(p.emplacement&&/FAB|DIRECT USINE/i.test(p.emplacement))||(p.details&&/fabrication/i.test(p.details))||(p.zone&&/FABRICATION/i.test(p.zone));
  const _isFab=_hasFab&&p.emplacement!=='OUR WAREHOUSE';
  const _isSiderun=p.emplacement==='OUR WAREHOUSE'&&((p.ref&&/FAB/i.test(String(p.ref)))||(p.details&&/fabrication/i.test(p.details)));
  const _isStocklot=!_hasFab;
  return (_stockFilter.has('fab')&&_isFab)||(_stockFilter.has('siderun')&&_isSiderun)||(_stockFilter.has('stocklot')&&_isStocklot);
}
function toggleStockPill(btn){
  const val=btn.dataset.stock;
  // Source de vérité = _stockFilter (pas le DOM, qui peut être désync entre les pills jumelles header/drawer)
  const willSelect=!_stockFilter.has(val);
  if(willSelect)_stockFilter.add(val); else _stockFilter.delete(val);
  // Sync visuel sur TOUTES les pills jumelles (header + drawer mobile) sur le même data-stock
  document.querySelectorAll('.fpill-stock[data-stock="'+val+'"]').forEach(b=>b.classList.toggle('active',willSelect));
  filterProducts();
}
let _depotFilter=''; // '' | 'our' | 'ext'
function toggleDepotPill(btn){
  const val=btn.dataset.depot;
  // Source de vérité = _depotFilter (pas le DOM, qui peut désync entre pills jumelles)
  const willSelect=(_depotFilter!==val);
  _depotFilter=willSelect?val:'';
  document.querySelectorAll('.fpill-depot').forEach(b=>b.classList.toggle('active',_depotFilter===b.dataset.depot));
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
}

// Close dropdowns when clicking outside
document.addEventListener('click', e => {
  if (!e.target.closest('.msd') && !e.target.closest('.fb-msd')) {
    document.querySelectorAll('.msd-panel.show').forEach(p => p.classList.remove('show'));
    document.querySelectorAll('.msd-btn.open,.fb-msd-btn.open').forEach(b => b.classList.remove('open'));
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
const DETAILS_NONE='__none__'; // sentinel for "no details" option
function _matchesActiveFilters(row, excludeKey){
  const types=getMsdValues('msd-type');
  if(excludeKey!=='msd-type' && types.size>0){
    const hasAutres=types.has('AUTRES');
    const known=[...types].filter(c=>c!=='AUTRES');
    const sideCodes=known.flatMap(c=>(c==='Offset Couleur'||c==='Dossier Couleur')?['RCOL']:[c]);
    const q=row.quality||'';
    if(hasAutres && !sideCodes.length){
      if(QUALITE_KNOWN_DB.includes(q)) return false;
    } else if(hasAutres){
      if(!sideCodes.includes(q) && QUALITE_KNOWN_DB.includes(q)) return false;
    } else if(!sideCodes.includes(q)) return false;
    if(types.has('Offset Couleur')&&!types.has('Dossier Couleur')&&+row.gsm>149) return false;
    if(types.has('Dossier Couleur')&&!types.has('Offset Couleur')&&+row.gsm<150) return false;
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
  const gn=+document.getElementById('f-gmin')?.value||0;
  const gx=+document.getElementById('f-gmax')?.value||0;
  if(gn && +row.gsm<gn) return false;
  if(gx && +row.gsm>gx) return false;
  const lminCm=+document.getElementById('f-lmin')?.value||0;
  const lmaxCm=+document.getElementById('f-lmax')?.value||0;
  if(lminCm && +row.width<lminCm*10) return false;
  if(lmaxCm && +row.width>lmaxCm*10) return false;
  const longmin=+document.getElementById('f-longmin')?.value||0;
  const longmax=+document.getElementById('f-longmax')?.value||0;
  if(longmin && +row.longueur<longmin) return false;
  if(longmax && +row.longueur>longmax) return false;
  const wmin=+document.getElementById('f-wmin')?.value||0;
  const wmax=+document.getElementById('f-wmax')?.value||0;
  if(wmin && +row.weight<wmin) return false;
  if(wmax && +row.weight>wmax) return false;
  if(_depotFilter==='our' && row.emplacement!=='OUR WAREHOUSE') return false;
  if(_depotFilter==='ext' && row.emplacement==='OUR WAREHOUSE') return false;
  if(_photoFilter==='with' && !row.image_url) return false;
  if(_photoFilter==='without' && row.image_url) return false;
  const refCode=(document.getElementById('f-ref-code')?.value||'').trim().toUpperCase();
  if(refCode && !String(row.quality||'').toUpperCase().startsWith(refCode)) return false;
  const usineVal=(document.getElementById('f-usine')?.value||'').trim();
  if(usineVal && String(row.usine||'')!==usineVal) return false;
  const zoneNum=(document.getElementById('f-zone-num')?.value||'').trim();
  const zoneLet=(document.getElementById('f-zone-let')?.value||'').trim().toUpperCase();
  const zStr=String(row.zone||'').toUpperCase();
  if(zoneNum && zoneLet){ if(!zStr.startsWith(zoneNum+zoneLet)) return false; }
  else if(zoneNum){ if(!zStr.startsWith(zoneNum)) return false; }
  else if(zoneLet){ if(!zStr.includes(zoneLet)) return false; }
  const formats=new Set([...document.querySelectorAll('.fpill.active:not(.fpill-orig):not(.fpill-stock):not(.fpill-depot)')].map(b=>b.dataset.format));
  if(formats.size && !formats.has(row.format)) return false;
  return true;
}
// ── Faceting for hardcoded msd (Type / Couleurs / Mandrins) ──
// The option list itself is fixed; we just refresh counts + hide the 0s.
function _optMatchesValue(row, msdId, val){
  if(msdId==='msd-couleur'){
    const dbColors=_COLOR_DB[val]||[val];
    return dbColors.includes(row.color);
  }
  if(msdId==='msd-mandrin'){
    return String(row.noyau)===String(val);
  }
  if(msdId==='msd-type'){
    const q=row.quality||'';
    if(val==='AUTRES') return !QUALITE_KNOWN_DB.includes(q);
    if(val==='Offset Couleur') return q==='RCOL' && +row.gsm<=149;
    if(val==='Dossier Couleur') return q==='RCOL' && +row.gsm>=150;
    return q===val;
  }
  return false;
}
function _allMsdContainers(msdId){
  const ids=[msdId,'sb-'+msdId,msdId+'-sidebar',msdId+'-mob','sb-'+msdId+'-mob'];
  return ids.map(id=>document.getElementById(id)).filter(Boolean);
}
const _facetSig={};
function _updateMsdFacetCounts(msdId){
  if(!_allProductsCache) return;
  const conts=_allMsdContainers(msdId);
  if(!conts.length) return;
  const allOpts=conts.flatMap(c=>[...c.querySelectorAll('.msd-option')]);
  if(!allOpts.length) return;
  const values=[...new Set(allOpts.map(o=>o.dataset.val).filter(Boolean))];
  // Skip if neither the active filters NOR our own option set changed
  const sig=_detailsFiltersSig()+'|'+values.sort().join(',')+'|'+[...msdState[msdId]].sort().join(',');
  if(_facetSig[msdId]===sig) return;
  _facetSig[msdId]=sig;
  const baseRows=_allProductsCache.filter(r=>_matchesActiveFilters(r,msdId));
  const counts={};
  values.forEach(v=>{
    let n=0;
    for(const r of baseRows) if(_optMatchesValue(r,msdId,v)) n++;
    counts[v]=n;
  });
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
  });
}
function _refreshAllFacets(){
  _rebuildDetailsMsd();
  _updateMsdFacetCounts('msd-type');
  _updateMsdFacetCounts('msd-couleur');
  _updateMsdFacetCounts('msd-mandrin');
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
    dep:_depotFilter, ph:_photoFilter,
    ref:document.getElementById('f-ref-code')?.value||'',
    us:document.getElementById('f-usine')?.value||'',
    zn:document.getElementById('f-zone-num')?.value||'',
    zl:document.getElementById('f-zone-let')?.value||'',
    fmt:[...document.querySelectorAll('.fpill.active:not(.fpill-orig):not(.fpill-stock):not(.fpill-depot)')].map(b=>b.dataset.format).sort(),
  });
}
function _rebuildDetailsMsd(){
  const containers=['sb-msd-details','msd-details-mob'].map(id=>document.getElementById(id)).filter(Boolean);
  if(!containers.length) return;
  // First pass: handle the loading state on every panel
  if(!_allProductsCache){
    if(!_detailsCacheKick){
      _detailsCacheKick=true;
      _loadAllProducts().then(()=>{
        _detailsLastSig=null;
        Object.keys(_facetSig).forEach(k=>delete _facetSig[k]);
        _refreshAllFacets();
      }).catch(()=>{});
    }
    containers.forEach(msd=>{
      const p=msd.querySelector('.msd-panel');
      if(p) p.innerHTML='<div class="msd-search-wrap"><input class="msd-search-inp" type="text" placeholder="Chargement…" disabled></div>';
    });
    return;
  }
  // Skip rebuild when only the details selection itself changed (preserves
  // panel scroll, search-bar text and avoids visual flicker while the user
  // is ticking boxes inside the dropdown).
  const sig=_detailsFiltersSig();
  if(sig===_detailsLastSig){ updateMsdBtn('msd-details'); return; }
  _detailsLastSig=sig;
  const rows=_allProductsCache.filter(r=>_matchesActiveFilters(r,'msd-details'));
  const counts=new Map();
  let emptyN=0;
  rows.forEach(r=>{
    const raw=String(r.details||'').trim();
    if(!raw){ emptyN++; return; }
    const k=raw.toLowerCase();
    const cur=counts.get(k);
    if(cur){ cur.n++; } else { counts.set(k,{label:raw,n:1}); }
  });
  const sel=msdState['msd-details'];
  sel.forEach(v=>{
    const k=String(v).toLowerCase();
    if(!counts.has(k)) counts.set(k,{label:v,n:0});
  });
  const sorted=[...counts.values()].sort((a,b)=>{
    const aS=sel.has(a.label)?0:1, bS=sel.has(b.label)?0:1;
    if(aS!==bS) return aS-bS;
    if(b.n!==a.n) return b.n-a.n;
    return a.label.localeCompare(b.label);
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
    sw.querySelector('.msd-search-inp').addEventListener('input',e=>{
      const q=e.target.value.toLowerCase();
      panel.querySelectorAll('.msd-option').forEach(opt=>{
        opt.style.display=opt.textContent.toLowerCase().includes(q)?'':'none';
      });
    });
    sw.addEventListener('click',e=>e.stopPropagation());
    const mkOpt=(val,label,n,extraCls)=>{
      const opt=document.createElement('div');
      opt.className='msd-option'+(extraCls?' '+extraCls:'');
      opt.setAttribute('data-val',val);
      if(sel.has(val)) opt.classList.add('selected');
      const dim=n===0?' style="opacity:.45"':'';
      opt.innerHTML=`<div class="msd-check"><svg width="9" height="7" fill="none" stroke="#fff" stroke-width="2.5"><polyline points="1,4 3.5,6.5 8,1"/></svg></div><span class="msd-label"${dim}>${esc(label)}</span><span class="msd-count-inline">${n}</span>`;
      opt.addEventListener('click',()=>toggleMsdOption(opt,'msd-details'));
      panel.appendChild(opt);
    };
    if(emptyN>0 || sel.has(DETAILS_NONE)){
      mkOpt(DETAILS_NONE,'Sans détails',emptyN,'msd-option-none');
    }
    sorted.forEach(({label,n})=>mkOpt(label,label,n));
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
    if(n>=20&&n<=350)hints.push({label:`${n} cm — Filtrer par laize`,action:`${raw.replace(/\d+$/,'')}${n}cm `});
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

let _filterTimer=null;
function filterProducts(){
  _featuredMode=false;
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
  const lmin=_lminCm?_lminCm*10:0;
  const lmax=_lmaxCm?_lmaxCm*10:0;
  const longmin=+document.getElementById('f-longmin')?.value||0;
  const longmax=+document.getElementById('f-longmax')?.value||0;
  const wmin=+document.getElementById('f-wmin')?.value||0;
  const wmax=+document.getElementById('f-wmax')?.value||0;
  const types=getMsdValues('msd-type');
  const couleurs=getMsdValues('msd-couleur');
  const mandrins=getMsdValues('msd-mandrin');
  const formats=new Set([...document.querySelectorAll('.fpill.active:not(.fpill-orig):not(.fpill-stock):not(.fpill-depot)')].map(b=>b.dataset.format));
  const typeCodes=types.size>0?[...types].flatMap(c=>TYPE_MAP[c]||[c]):[];

  let filtered=_sharedAll.filter(p=>{
    if(q){const s=[p.name,p.quality,p.couleur,p.details,p.ref].join(' ').toLowerCase();if(!s.includes(q))return false;}
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
    if(_depotFilter==='our'&&p.emplacement!=='OUR WAREHOUSE')return false;
    if(_depotFilter==='ext'&&p.emplacement==='OUR WAREHOUSE')return false;
    if(!_stockMatch(p))return false;
    const _hasPhoto=p.image_url&&p.image_url.length>0;
    if(_photoFilter==='with'&&!_hasPhoto)return false;
    if(_photoFilter==='without'){
      if(_hasPhoto)return false;
      // Exclure uniquement les FAB purs (hors entrepôt) — ils n'ont jamais de photo par nature.
      // Les Siderun (OUR WAREHOUSE + marqueurs FAB) sont gardés car certains ont des photos.
      const _isFabPure=(p.emplacement&&p.emplacement!=='OUR WAREHOUSE'&&((p.ref&&/FAB/i.test(String(p.ref)))||/FAB|DIRECT USINE/i.test(p.emplacement)||(p.details&&/fabrication/i.test(p.details))||(p.zone&&/FABRICATION/i.test(p.zone))));
      if(_isFabPure)return false;
    }
    return true;
  });

  all=filtered;
  _totalCount=filtered.length;
  _maxKnownPage=Math.max(1,Math.ceil(filtered.length/PAGE));
  currentPage=1;
  const totalKg=filtered.reduce((s,p)=>s+(+p.weight||0),0);
  const rbarRefs=document.getElementById('rbar-refs');
  const rbarTons=document.getElementById('rbar-tons');
  if(rbarRefs)rbarRefs.textContent=filtered.length.toLocaleString('fr-FR');
  if(rbarTons)rbarTons.textContent=(totalKg/1000).toFixed(1);
  updateFilterChips();
  render(filtered.slice(0,PAGE));
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
    const p=new URLSearchParams({select:'*','image_url':'not.is.null',order:'id.desc'});
    p.append('image_url','neq.');
    // Fetch featured products AND real total count + weight in parallel
    const [imgRes, countRes, wRes]=await Promise.all([
      sbQ('products?'+p,{headers:{'Range':'0-799'}}),
      sbQ('products?select=id',{headers:{'Prefer':'count=exact','Range':'0-0'}}),
      sbQ('rpc/sum_weight_filtered',{method:'POST',body:{}})
    ]);
    const {data,error}=imgRes;
    if(_reqToken!==token)return;
    if(error||!data?.length){await _fetchAndRender(token);return;}
    const _realCount=(countRes.count!=null&&!isNaN(countRes.count))?countRes.count:0;
    const _realWeightKg=wRes.data||0;
    // Filter products with image_url, then verify images actually load
    const candidates=data.filter(r=>r.image_url&&r.image_url.trim().length>10);
    candidates.sort(()=>Math.random()-.5);
    const toCheck=candidates.slice(0,200);
    const verified=[];
    await Promise.all(toCheck.map(r=>new Promise(resolve=>{
      const img=new Image();
      img.onload=()=>{verified.push(r);resolve();};
      img.onerror=()=>resolve();
      img.src=r.image_url;
      setTimeout(resolve,4000);
    })));
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
    render(all);
    _updatePager();
  }catch(e){if(_reqToken===token)await _fetchAndRender(token);}
}
async function _fetchAndRender(token){
  const g=document.getElementById('pgrid');
  if(g){
    g.className=_viewMode==='list'?'pgrid plist':'pgrid';
    g.innerHTML=_viewMode==='list'
      ?`<div style="overflow-x:auto"><table class="plist-table"><thead><tr><th class="plist-th-add"></th><th></th><th class="plist-col-ref">Référence</th><th>Qualité</th><th>Détails</th><th>Couleur</th><th>GSM</th><th>Laize</th><th>Diamètre</th><th class="plist-col-mandrin">Mandrin</th><th>Poids (kg)</th><th class="plist-col-usine">Usine</th><th class="plist-col-depot">Emplacement</th></tr></thead><tbody>${Array(10).fill(0).map(()=>`<tr><td colspan="13"><div class="skel-line" style="height:14px;margin:6px 0;border-radius:4px;"></div></td></tr>`).join('')}</tbody></table></div>`
      :Array(8).fill(0).map(()=>`<div class="skeleton"><div class="skel-img"></div><div class="skel-body"><div class="skel-line short"></div><div class="skel-line med"></div><div class="skel-line"></div></div></div>`).join('');
  }

  // Build query
  const q=document.getElementById('search-input').value.trim();
  const types=getMsdValues('msd-type');
  const gn=+document.getElementById('f-gmin').value||+document.getElementById('f-gmin-fb')?.value||0;
  const gx=+document.getElementById('f-gmax').value||+document.getElementById('f-gmax-fb')?.value||0;
  const _lminCm=+document.getElementById('f-lmin').value||+document.getElementById('f-lmin-fb')?.value||0;
  const _lmaxCm=+document.getElementById('f-lmax').value||+document.getElementById('f-lmax-fb')?.value||0;
  const lmin=_lminCm?_lminCm*10:0;
  const lmax=_lmaxCm?_lmaxCm*10:0;
  const longmin=+document.getElementById('f-longmin')?.value||0;
  const longmax=+document.getElementById('f-longmax')?.value||0;
  const wmin=+document.getElementById('f-wmin')?.value||0;
  const wmax=+document.getElementById('f-wmax')?.value||0;
  const refCode=(document.getElementById('f-ref-code')?.value||'').trim().toUpperCase();
  const mandrins=getMsdValues('msd-mandrin');
  const couleurs=getMsdValues('msd-couleur');
  const formats=new Set([...document.querySelectorAll('.fpill.active:not(.fpill-orig):not(.fpill-stock):not(.fpill-depot)')].map(b=>b.dataset.format));
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
  const _sideCodes=types.size>0?_knownSelected.flatMap(c=>(c==='Offset Couleur'||c==='Dossier Couleur')?['RCOL']:[c]):[];
  const _pCodes=parsed.qualityCodes.length&&!types.size?parsed.qualityCodes:[];
  const typeCodes=[..._sideCodes,..._pCodes];

  // GSM constraint from Couleur split filter
  const _couleurOffsetSel=types.has('Offset Couleur')&&!types.has('Dossier Couleur');
  const _couleurDossierSel=types.has('Dossier Couleur')&&!types.has('Offset Couleur');
  const _couleurGsmMax=_couleurOffsetSel&&!gn&&!gx?149:0;
  const _couleurGsmMin=_couleurDossierSel&&!gn&&!gx?150:0;

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
  p.set('select','*');
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
  const usineVal=(document.getElementById('f-usine')?.value||'').trim();
  if(usineVal)p.append('usine',`eq.${_pgEsc(usineVal)}`);
  const detailsSel=getMsdValues('msd-details');
  if(detailsSel.size>0){
    const _hasNone=detailsSel.has(DETAILS_NONE);
    const _real=[...detailsSel].filter(v=>v!==DETAILS_NONE);
    if(_hasNone && _real.length===0){
      // "Sans détails" only — match null OR empty string
      p.append('or','(details.is.null,details.eq.)');
    } else if(_hasNone){
      // "Sans détails" + real values
      const _eqs=_real.map(v=>'details.eq.'+'"'+String(v).replace(/"/g,'""')+'"').join(',');
      p.append('or',`(details.is.null,details.eq.,${_eqs})`);
    } else {
      // Real values only
      const _qVals=_real.map(v=>'"'+String(v).replace(/"/g,'""')+'"').join(',');
      p.append('details',`in.(${_qVals})`);
    }
  }
  const zoneNum=(document.getElementById('f-zone-num')?.value||'').trim();
  const zoneLet=(document.getElementById('f-zone-let')?.value||'').trim().toUpperCase();
  if(zoneNum&&zoneLet)p.append('zone',`ilike.${_pgEsc(zoneNum)}${_pgEsc(zoneLet)}%`);
  else if(zoneNum)p.append('zone',`like.${_pgEsc(zoneNum)}%`);
  else if(zoneLet)p.append('zone',`ilike.%${_pgEsc(zoneLet)}%`);
  // Dépôt filter
  if(_depotFilter==='our')p.append('emplacement',`eq.OUR WAREHOUSE`);
  else if(_depotFilter==='ext')p.append('emplacement',`neq.OUR WAREHOUSE`);
  // Stocklot/Fabrication server-side filter — uniquement quand 1 seule pill
  // active. En multichoix (>=2), pas de filtre serveur, _stockMatch côté
  // client gère la logique OR.
  if(_stockFilter.size===1){
    const _sf=[..._stockFilter][0];
    if(_sf==='fab'){
      p.append('emplacement','neq.OUR WAREHOUSE');
      p.append('or','(ref.ilike.%FAB%,emplacement.ilike.%FAB%,emplacement.ilike.%DIRECT USINE%,details.ilike.%fabrication%,zone.ilike.%FABRICATION%)');
    } else if(_sf==='stocklot'){
      p.append('and','(or(ref.not.ilike.%FAB%,ref.is.null),or(details.not.ilike.%fabrication%,details.is.null),or(emplacement.not.ilike.%FAB%,emplacement.is.null),or(emplacement.not.ilike.%DIRECT USINE%,emplacement.is.null),or(zone.not.ilike.%FABRICATION%,zone.is.null))');
    } else if(_sf==='siderun'){
      p.append('emplacement','eq.OUR WAREHOUSE');
      p.append('or','(ref.ilike.%FAB%,details.ilike.%fabrication%)');
    }
  }
  // Photo filter — image_url is NULL pour les produits sans photo réelle (mis à jour par scripts/verify_photos.py)
  if(_photoFilter==='with')p.append('image_url','not.is.null');
  else if(_photoFilter==='without'){
    p.append('image_url','is.null');
    // Exclure uniquement les FAB purs (hors entrepôt) — pas les Siderun (certains ont des photos).
    // Garde le produit si emplacement = OUR WAREHOUSE (siderun/stocklot) OU si pas de marqueur FAB.
    p.append('or','(emplacement.eq.OUR WAREHOUSE,and(or(ref.not.ilike.%FAB%,ref.is.null),or(details.not.ilike.%fabrication%,details.is.null),or(emplacement.not.ilike.%FAB%,emplacement.is.null),or(emplacement.not.ilike.%DIRECT USINE%,emplacement.is.null),or(zone.not.ilike.%FABRICATION%,zone.is.null)))');
  }
  if(s==='gsm_asc'||s==='grammage_asc')p.set('order','gsm.asc.nullslast,id.asc');
  else if(s==='gsm_desc'||s==='grammage_desc')p.set('order','gsm.desc.nullslast,id.asc');
  else if(s==='price_asc'||s==='prix_asc')p.set('order','price.asc.nullslast,id.asc');
  else if(s==='price_desc'||s==='prix_desc')p.set('order','price.desc.nullslast,id.asc');
  else p.set('order','id.desc');
  const offset=(currentPage-1)*PAGE;

  const ctrl=new AbortController();
  const _to=setTimeout(()=>ctrl.abort(),15000);
  let data,error,_exactCount=null,_totalWeightKg=0;
  try{
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
  }catch(e){
    clearTimeout(_to);
    if(_reqToken!==token)return;
    const msg=e?.name==='AbortError'?LT[lang].t_err_timeout:LT[lang].t_err_server;
    if(g)g.innerHTML=`<div class="empty" style="grid-column:1/-1"><div class="empty-lbl">${LT[lang].t_err_net}</div><div class="empty-sub">${msg}</div><button class="btn-empty-reset" onclick="_doFilter()">${LT[lang].t_retry}</button></div>`;
    return;
  }
  clearTimeout(_to);
  if(_reqToken!==token)return;

  if(error){
    console.error(error);
    if(g)g.innerHTML=`<div class="empty" style="grid-column:1/-1"><div class="empty-lbl">${LT[lang].t_err_title}</div><div class="empty-sub">${esc(error.message||LT[lang].t_err_load)}</div><button class="btn-empty-reset" onclick="_doFilter()">${LT[lang].t_retry}</button></div>`;
    return;
  }

  // Recalculate weight using same filters as main query (paginated)
  if(_reqToken===token){
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
      _ap.set('select','*');
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
      // Tri des groupes selon le sort sélectionné (cohérent avec serveur)
      const _sortKey=(()=>{const v=document.getElementById('sort-sel')?.value||'';
        if(v==='gsm_asc'||v==='grammage_asc')return['grammage','asc'];
        if(v==='gsm_desc'||v==='grammage_desc')return['grammage','desc'];
        if(v==='price_asc'||v==='prix_asc')return['price','asc'];
        if(v==='price_desc'||v==='prix_desc')return['price','desc'];
        return null;})();
      if(_sortKey){
        const[k,d]=_sortKey;
        _groupsList.sort((a,b)=>{const av=a._proto[k],bv=b._proto[k];
          if(av==null&&bv==null)return 0;if(av==null)return 1;if(bv==null)return -1;
          return d==='asc'?av-bv:bv-av;});
      }
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
      _maxKnownPage=Math.max(1,Math.ceil(_totalCount/PAGE)||1);
      _totalWeightKg=_allUi.reduce((s,r)=>s+(+r.poids_net||0),0);
    }catch(_){
      // En cas d'erreur, on retombe sur le mode paginé classique
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
  // Update stats bar with real total
  const _st=document.getElementById('s-ton');if(_st&&_totalCount)_st.textContent=_totalCount.toLocaleString('fr-FR')+' produits';
  // Update results bar
  const rbarRefs=document.getElementById('rbar-refs');
  const rbarTons=document.getElementById('rbar-tons');
  if(rbarRefs)rbarRefs.textContent=_totalCount.toLocaleString('fr-FR');
  if(rbarTons)rbarTons.textContent=(_totalWeightKg/1000).toFixed(1);
  const cn=document.getElementById('correction-note');
  if(cn)cn.innerHTML=_lastCorrections.length?` <span class="correction-note">· correction : ${_lastCorrections.map(c=>`<b>${esc(c.from)}</b> → ${esc(c.to)}`).join(', ')}</span>`:'';
  // Update fd-count for mobile drawer
  const fdCount=document.getElementById('fd-count');
  if(fdCount)fdCount.textContent=_totalCount.toLocaleString('fr-FR');
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
  const equivLabel=lang==='en'?'See also:':'Voir aussi :';
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
      if(pagerTop)pagerTop.innerHTML=`<button class="parrow" disabled>‹</button><button class="pnum active" onclick="_goToPage(1)">1</button><button class="parrow" disabled>›</button>`;return;}
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
    const pagerHtml=`<button class="parrow" ${currentPage<=1?'disabled':''} onclick="_goToPage(${currentPage-1})">‹</button>${pagesHtml}<button class="parrow" ${isLast?'disabled':''} onclick="_goToPage(${currentPage+1})">›</button>`;
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

function updateFilterChips(){
  const container=document.getElementById('filter-chips');
  const chips=[];
  const q=document.getElementById('search-input').value;
  const gn=document.getElementById('f-gmin').value;
  const gx=document.getElementById('f-gmax').value;
  const lmin2=document.getElementById('f-lmin')?.value||'';
  const lmax2=document.getElementById('f-lmax')?.value||'';
  if(q)chips.push({label:LT[lang].t_chip_recherche+' : "'+q+'"',clear:()=>{document.getElementById('search-input').value='';document.getElementById('search-input-mob').value='';filterProducts();}});
  // Add format pills chip
  const _activeFmts=Array.from(document.querySelectorAll('.fpill.active:not(.fpill-orig):not(.fpill-stock):not(.fpill-depot)')).map(b=>b.dataset.format);
  const _activeOrigs=Array.from(document.querySelectorAll('.fpill-orig.active')).map(b=>b.dataset.origine==='R'?LT[lang].t_origine_recycl:LT[lang].t_origine_fab);
  if(_activeOrigs.length>0)chips.push({label:(lang==='en'?'Origin':'Origine')+' : '+_activeOrigs.join(', '),clear:()=>{document.querySelectorAll('.fpill-orig.active').forEach(b=>b.classList.remove('active'));filterProducts();}});
  _stockFilter.forEach(_sf=>{
    const _label=_sf==='fab'?'Fabrication':_sf==='siderun'?'Siderun':'Stocklots';
    chips.push({label:_label,clear:()=>{_stockFilter.delete(_sf);syncFilterPills();filterProducts();}});
  });
  if(_depotFilter)chips.push({label:_depotFilter==='our'?'Notre dépôt':'Hors dépôt',clear:()=>{_depotFilter='';syncFilterPills();filterProducts();}});
  if(_photoFilter)chips.push({label:_photoFilter==='with'?'Avec photo':'Sans photo',clear:()=>{_photoFilter='';syncFilterPills();filterProducts();}});
  if(_activeFmts.length>0)chips.push({label:LT[lang].t_fmt+' : '+_activeFmts.map(f=>f==='Bobine'?LT[lang].t_bobine:f==='Palette'?LT[lang].t_palette:f).join(', '),clear:()=>{_formatFilter='';syncFilterPills();filterProducts();}});
  ['msd-type','msd-mandrin','msd-couleur','msd-details'].forEach(id=>{
    const set=msdState[id];
    if(set.size>0){
      const lbl={'msd-type':LT[lang].t_type_lbl,'msd-mandrin':LT[lang].t_mandrin_lbl,'msd-couleur':LT[lang].t_couleur_lbl,'msd-details':'Détails'}[id];
      const vals=[...set].map(v=>v===DETAILS_NONE?'Sans détails':v).join(', ');
      chips.push({label:lbl+' : '+vals,clear:()=>{resetMsd(id);filterProducts();}});
    }
  });
  if(gn||gx)chips.push({label:LT[lang].t_chip_gram+' : '+(gn||'—')+' → '+(gx||'—')+' g/m²',clear:()=>{document.getElementById('f-gmin').value='';document.getElementById('f-gmax').value='';filterProducts();}});

  if(lmin2||lmax2)chips.push({label:LT[lang].t_chip_laize+' : '+(lmin2||'—')+' → '+(lmax2||'—')+' cm',clear:()=>{['f-lmin','f-lmax','f-lmin-fb','f-lmax-fb','f-lmin-mob','f-lmax-mob'].forEach(id=>{const e=document.getElementById(id);if(e)e.value='';});filterProducts();}});
  const longmin2=document.getElementById('f-longmin')?.value||'';
  const longmax2=document.getElementById('f-longmax')?.value||'';
  if(longmin2||longmax2)chips.push({label:LT[lang].t_chip_longueur+' : '+(longmin2||longmax2)+'mm',clear:()=>{['f-longmin','f-longmax','f-longmin-mob','f-longmax-mob'].forEach(id=>{const e=document.getElementById(id);if(e)e.value='';});filterProducts();}});
  const wmin2=document.getElementById('f-wmin')?.value||'';
  const wmax2=document.getElementById('f-wmax')?.value||'';
  if(wmin2||wmax2)chips.push({label:'Poids : '+(wmin2||'—')+' → '+(wmax2||'—')+' kg',clear:()=>{['f-wmin','f-wmax','f-wmin-mob','f-wmax-mob'].forEach(id=>{const e=document.getElementById(id);if(e)e.value='';});filterProducts();}});
  // PRIX_MASQUÉ: filtre prix désactivé
  // const cpn=document.getElementById('f-pmin').value,cpx=document.getElementById('f-pmax').value;
  // if(cpn||cpx)chips.push({label:LT[lang].t_chip_prix+...});
  const usineChip=(document.getElementById('f-usine')?.value||'').trim();
  if(usineChip)chips.push({label:'Usine : '+usineChip,clear:()=>{const e=document.getElementById('f-usine');if(e)e.value='';filterProducts();}});
  const zoneNumChip=(document.getElementById('f-zone-num')?.value||'').trim();
  const zoneLetChip=(document.getElementById('f-zone-let')?.value||'').trim();
  if(zoneNumChip)chips.push({label:'Zone : '+zoneNumChip,clear:()=>{['f-zone-num','f-zone-num-mob'].forEach(id=>{const e=document.getElementById(id);if(e)e.value='';});filterProducts();}});
  if(zoneLetChip)chips.push({label:'Allée : '+zoneLetChip,clear:()=>{['f-zone-let','f-zone-let-mob'].forEach(id=>{const e=document.getElementById(id);if(e)e.value='';});filterProducts();}});
  if(!chips.length){container.innerHTML='';const ac2=document.getElementById('active-chips');if(ac2)ac2.innerHTML='';return;}
  const chipsHtml=chips.map((chip,i)=>`<div class="fchip" id="chip-${numId(i)}">${esc(chip.label)}<button onclick="clearChip(${numId(i)})" title="Retirer ce filtre">✕</button></div>`).join('')
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
  const lbl=q.startsWith('R')?'♻ '+(LT[lang]?.t_origine_recycl||'Recyclé'):q.startsWith('S')?'★ '+(LT[lang]?.t_origine_fab||'Fabrication'):qualite;
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
  if(p.format.toLowerCase().includes('palette')&&(p.largeur||p.longueur)){
    const dims=[p.largeur,p.longueur].filter(Boolean).map(v=>mmToCm(v)).join('×');
    return `Palette ${dims}`;
  }
  return p.format;
}

function _productSummary(p){
  const parts=[];
  if(p.couleur)parts.push(p.couleur);
  if(p.grammage)parts.push(p.grammage+' g/m²');
  const isPalette=p.format&&p.format.toLowerCase().includes('palette');
  if(isPalette&&(p.largeur||p.longueur)){
    parts.push([mmToCm(p.largeur),p.longueur?mmToCm(p.longueur):null].filter(Boolean).join(' × ')+' cm');
  }else if(p.largeur){
    const dim='Laize '+mmToCm(p.largeur)+' cm'+(p.longueur?' • Long. '+p.longueur+' mm':'');
    parts.push(dim);
  }
  return parts.join(' • ');
}
function getProductDetailText(p){
  // Priority: Excel detail field → auto-generated summary
  // Strip isolated dashes used as empty-cell placeholders (" - ", " - - ", leading/trailing "-")
  const raw=(p.details||'')
    .replace(/(?<=^|\s)-(?=\s|$)/g,'')
    .replace(/\s{2,}/g,' ')
    .trim();
  if(raw.length>2)return raw;
  return _productSummary(p);
}

function renderCards(list){
  const g=document.getElementById('pgrid');
  if(!g)return;
  g.className='pgrid';
  g.innerHTML=list.map(p=>{
    const initials=(p.type||'?').substring(0,2).toUpperCase();
    const _altTxt=[p.name,p.grammage?p.grammage+'g/m²':'',p.couleur].filter(Boolean).join(' — ')||'Produit';
    const _isFab=(p.zone==='FABRICATION SUR COMMANDE'||p.emplacement==='FABRICATION SUR COMMANDE'||(p.ref&&/^Photo_FAB/i.test(String(p.ref)))||(p.details&&/^\s*fabrication\b/i.test(p.details))||(p.emplacement&&/FAB|DIRECT USINE/i.test(p.emplacement)));
    const _isSiderun=(p.emplacement==='OUR WAREHOUSE'&&((p.ref&&/FAB/i.test(String(p.ref)))||(p.details&&/fabrication/i.test(p.details))));
    const _fallbackImg=_isSiderun?'img/siderun-sur-demande.png':_isFab?'img/fabrication-sur-demande.png':'img/no-photo.png';
    const imgHtml=p.image_url
        ?`<img src="${safeUrl(p.image_url)}" alt="${esc(_altTxt)}" loading="lazy" onerror="this.src='${esc(_fallbackImg)}';this.className='pcard-nophoto'">`
        :`<img src="${esc(_fallbackImg)}" alt="Photo sur demande" class="pcard-nophoto">`;
    const {cls:badgeCls,txt:badgeTxt}=decodeQuality(p.type);
    const isPalette=p.format&&p.format.toLowerCase().includes('palette');
    const dimTag=!isPalette&&p.largeur?`${mmToCm(p.largeur)} cm`:'';
    const fmtLabel=p.format?(isPalette?'Format':'Bobine'):null;
    const paletteDims=isPalette&&(p.largeur||p.longueur)?[p.largeur,p.longueur].filter(Boolean).map(v=>mmToCm(v)).join('×'):null;
    const _isGroup=p._grpCount&&p._grpCount>1;
    const _grpTotal=_isGroup?p._grpTotalWeight:0;
    const poids=_isGroup
      ?`${Math.round(_grpTotal).toLocaleString('fr-FR')}`
      :(p.poids_net?`${p.poids_net.toLocaleString('fr-FR')}`:'—');
    const prixHtml=_priceMode&&p.price?`<div class="pcard-price">${p.price.toLocaleString('fr-FR')} €/T</div>`:'';
    const typeOverlay='';
    const _usineClean=p.usine?String(p.usine).replace(/^REF\s*/i,''):null;
    const _usineLbl=_isGroup&&p._grpUsines&&p._grpUsines.length>1
      ?`+${p._grpUsines.length}`
      :_usineClean;
    const usineOverlay=_usineLbl?`<div class="pcard-gsm-overlay"><span class="pcard-gsm-lbl">USINE</span><span class="pcard-gsm-num">${esc(_usineLbl)}</span></div>`:'';
    const _refClean=(p.ref||'').replace(/^Photo_/i,'').trim();
    const refOverlay=_refClean?`<div class="pcard-ref-overlay" title="${esc(_refClean)}"><span class="pcard-ref-txt">${esc(_refClean)}</span></div>`:'';
    const photoRef='';
    // Mini spec rows (label + value, only if value exists)
    // Usine désormais affichée en chip overlay sur la photo
    const _detClean=(p.details||'').replace(/(?<=^|\s)-(?=\s|$)/g,'').replace(/\s{2,}/g,' ').trim();
    const _mandrinTxt=_isGroup&&p._grpMandrins&&p._grpMandrins.length
      ?(p._grpMandrins.length>1?p._grpMandrins.join(' / '):`Ø${p._grpMandrins[0]} mm`)
      :(p.noyau?`Ø${p.noyau} mm`:'');
    const specRows=[
      p.couleur?['Couleur',p.couleur]:null,
      dimTag?['Laize',dimTag]:paletteDims?['Dimensions',paletteDims+' cm']:null,
      p.grammage?['Grammage',`${p.grammage} g/m²`]:null,
      _mandrinTxt?['Mandrin',_mandrinTxt]:null,
      ['Zone',p.allee||'—'],
    ].filter(Boolean).slice(0,6);
    const specsHtml=`<div class="pcard-specs">${specRows.map(([l,v])=>`<div class="pcard-spec"><span class="pspec-lbl">${esc(l)}</span><span class="pspec-val">${esc(v)}</span></div>`).join('')}</div>`;
    const _sub=getProductDetailText(p);
    const subtitleHtml=_sub?`<div class="pcard-subtitle">${esc(_sub)}</div>`:'';
    // Bouton ajouter : groupé → sélecteur qté avec poids live; sinon → bouton classique
    const _q=_groupQty[p._grpKey]||1;
    const _initialW=_isGroup?Math.round((p._grpUnitIds||[]).slice(0,_q).reduce((s,uid)=>{const u=(_groupsList.find(g=>g.gid===p._grpKey)?.units||[]).find(x=>x.id===uid);return s+(+(u?.poids_net||0));},0)).toLocaleString('fr-FR')+' kg':'';
    const _totalW=_isGroup?Math.round(p._grpTotalWeight).toLocaleString('fr-FR')+' kg':'';
    const _grpAllIn=_isGroup&&(p._grpUnitIds||[]).slice(0,_q).every(id=>cart.find(x=>x.id===+id))&&_q>0;
    const addCtrl=_isGroup
      ?`<div class="pcard-grp-add" onclick="event.stopPropagation();" data-gid="${esc(p._grpKey||'')}">
          <div class="grp-info"><span class="grp-info-max">Max ${p._grpCount}</span><span class="grp-info-sep">·</span><span class="grp-info-tot">${esc(_totalW)} dispo</span></div>
          <div class="grp-row">
            <div class="grp-qty-wrap">
              <button class="grp-qty-btn grp-qty-btn-minus" onclick="_grpQtyAdj(${attrJs(p._grpKey)},-1)" aria-label="−"${_q<=1?' disabled':''}>−</button>
              <input type="number" class="grp-qty-input" min="1" max="${numId(p._grpCount)}" value="${_q}" onchange="_grpQtySet(${attrJs(p._grpKey)},this.value)" oninput="_grpQtySet(${attrJs(p._grpKey)},this.value)">
              <button class="grp-qty-btn grp-qty-btn-plus" onclick="_grpQtyAdj(${attrJs(p._grpKey)},1)" aria-label="+"${_q>=p._grpCount?' disabled':''}>+</button>
            </div>
            <span class="grp-weight">${esc(_initialW)}</span>
          </div>
          <button class="btn-add-cart grp-add-btn${_grpAllIn?' added':''}" onclick="addGroupToCart(${attrJs(p._grpKey)})">${_grpAllIn?`✓ Ajouté ${_q}`:`+ Ajouter ${_q}`}</button>
        </div>`
      :`<button class="btn-add-cart${cart.find(x=>x.id===+p.id)?' added':''}" id="cadd-${numId(p.id)}" aria-label="${lang==='en'?'Add to selection':'Ajouter à la sélection'}" onclick="event.stopPropagation();addToCart(${numId(p.id)})"><span class="cart-icon">+</span><span class="cart-check">✓</span></button>`;
    return`<div class="pcard" onclick="openDetail(${numId(p.id)})">
      <div class="pcard-img">${imgHtml}${typeOverlay}${refOverlay}${usineOverlay}${photoRef}</div>
      <div class="pcard-body">
        <div class="pcard-name">${esc(formatProductTitle(p.qualite,p.type))}</div>
        ${subtitleHtml}
        ${specsHtml}
        ${_isGroup?`<div class="pcard-foot">
          <div class="pton">${esc(poids)}<span class="pton-s"> KGS</span></div>
          ${prixHtml}
        </div>`:''}
        ${addCtrl}
        ${_isGroup?'':`<div class="pcard-foot">
          <div class="pton">${esc(poids)}<span class="pton-s"> KGS</span></div>
          ${prixHtml}
        </div>`}
      </div>
    </div>`;
  }).join('');
  _updatePager();
  if(typeof _updateAddPageBtn==='function')_updateAddPageBtn();
}

let _viewMode='grid';
const _SVG_GRID='<svg width="14" height="14" viewBox="0 0 14 14" fill="currentColor"><rect x="0" y="0" width="6" height="6" rx="1"/><rect x="8" y="0" width="6" height="6" rx="1"/><rect x="0" y="8" width="6" height="6" rx="1"/><rect x="8" y="8" width="6" height="6" rx="1"/></svg>';
const _SVG_LIST='<svg width="14" height="14" viewBox="0 0 14 14" fill="currentColor"><rect x="0" y="0" width="14" height="2.5" rx="1"/><rect x="0" y="5.5" width="14" height="2.5" rx="1"/><rect x="0" y="11" width="14" height="2.5" rx="1"/></svg>';
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
  const rows=list.map(p=>{
    const _isFabL=(p.zone==='FABRICATION SUR COMMANDE'||p.emplacement==='FABRICATION SUR COMMANDE'||(p.ref&&/^Photo_FAB/i.test(String(p.ref)))||(p.details&&/^\s*fabrication\b/i.test(p.details))||(p.emplacement&&/FAB|DIRECT USINE/i.test(p.emplacement)));
    const title=formatProductTitle(p.qualite,p.name);
    const _isSiderunL=(p.emplacement==='OUR WAREHOUSE'&&((p.ref&&/FAB/i.test(String(p.ref)))||(p.details&&/fabrication/i.test(p.details))));
    const _listFallback=_isSiderunL?'img/siderun-sur-demande.png':_isFabL?'img/fabrication-sur-demande.png':'img/no-photo.png';
    const thumb=p.image_url
        ?`<img src="${safeUrl(p.image_url)}" alt="${esc(title)}" class="plist-thumb" loading="lazy" onerror="this.src='${esc(_listFallback)}'">`
        :`<img src="${esc(_listFallback)}" alt="" class="plist-thumb">`;
    // PRIX_MASQUÉ: const price=p.price?`<span class="plist-price">${p.price.toLocaleString('fr-FR')} €/T</span>`:`<span class="plist-price-ask">Sur dem.</span>`;
    const price='';
    const inCart=cart.find(x=>x.id===+p.id);
    const _isGroupL=p._grpCount&&p._grpCount>1;
    const _grpCur=_groupQty[p._grpKey]||1;
    const _grpAllInL=_isGroupL&&(p._grpUnitIds||[]).slice(0,_grpCur).every(id=>cart.find(x=>x.id===+id))&&_grpCur>0;
    const addBtn=_isGroupL
      ?`<div class="plist-grp-cell" onclick="event.stopPropagation();" data-gid="${esc(p._grpKey||'')}">
          <div class="plist-grp-stepper">
            <button class="plist-grp-step" onclick="_grpQtyAdj(${attrJs(p._grpKey)},-1)"${_grpCur<=1?' disabled':''} aria-label="−1">−</button>
            <span class="plist-grp-valwrap">
              <input type="number" class="plist-grp-val" min="1" max="${numId(p._grpCount)}" value="${_grpCur}" onchange="_grpQtySet(${attrJs(p._grpKey)},this.value)" oninput="_grpQtySet(${attrJs(p._grpKey)},this.value)" aria-label="${lang==='en'?'Quantity':'Quantité'}">
              <span class="plist-grp-max">/${numId(p._grpCount)}</span>
            </span>
            <button class="plist-grp-step" onclick="_grpQtyAdj(${attrJs(p._grpKey)},1)"${_grpCur>=p._grpCount?' disabled':''} aria-label="+1">+</button>
          </div>
          <button class="plist-grp-add${_grpAllInL?' added':''}" onclick="addGroupToCart(${attrJs(p._grpKey)})" title="${lang==='en'?'Add':'Ajouter'} ${_grpCur}" aria-label="${lang==='en'?'Add':'Ajouter'} ${_grpCur}">${_grpAllInL?'✓':'+'}</button>
        </div>`
      :`<button class="plist-add${inCart?' added':''}" id="ladd-${numId(p.id)}" aria-label="${lang==='en'?'Add to selection':'Ajouter à la sélection'}" onclick="event.stopPropagation();addToCart(${numId(p.id)})">${inCart?'✓':'+'}</button>`;
    const isPalette=p.format&&p.format.toLowerCase().includes('palette');
    // Dimensions: Bobine → Laize | Ø Diamètre | Mandrin / Palette → Dimensions (laize×long)
    const laize=p.largeur?`${mmToCm(p.largeur)} cm`:'—';
    const dim2=isPalette
      ?(p.longueur?`${mmToCm(p.longueur)} cm`:'—')
      :(p.longueur?`Ø ${mmToCm(p.longueur)} cm`:'—');
    const paletteDims2=isPalette&&(p.largeur||p.longueur)?[p.largeur,p.longueur].filter(Boolean).map(v=>mmToCm(v)).join(' × ')+' cm':null;
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
      <td class="plist-td plist-td-ref plist-col-ref">${p.ref?`<span class="plist-ref-badge">${esc(p.ref.replace(/^Photo_/i,'').toUpperCase())}</span>`:'—'}</td>
      <td class="plist-td plist-td-title"><strong class="plist-qtitle">${esc(title)}</strong></td>
      <td class="plist-td plist-td-details">${detailsTxt||'—'}</td>
      <td class="plist-td">${esc(p.couleur||'—')}</td>
      <td class="plist-td plist-td-num"><span class="plist-gsm">${p.grammage?esc(p.grammage+' g/m²'):'—'}</span></td>
      ${isPalette&&paletteDims2
        ?`<td class="plist-td plist-td-num" colspan="3">${esc(paletteDims2)}</td>`
        :`<td class="plist-td plist-td-num">${esc(laize)}</td><td class="plist-td plist-td-num">${esc(dim2)}</td><td class="plist-td plist-td-num plist-col-mandrin">${esc(mandrin||'—')}</td>`}
      <td class="plist-td plist-td-num">${esc(_poidsTxt)}</td>
      ${_priceMode?`<td class="plist-td plist-td-num plist-price">${p.price?esc(p.price.toLocaleString('fr-FR')+' €/T'):'—'}</td>`:''}
      <td class="plist-td plist-td-usine plist-col-usine">${esc(_usineTxt)}</td>
      <td class="plist-td plist-td-depot">${esc(_depotTxt)}</td>
      <td class="plist-td plist-td-zone">${esc(p.allee||'—')}</td>
    </tr>`;
  }).join('');
  const _allPalette=list.length>0&&list.every(p=>p.format&&p.format.toLowerCase().includes('palette'));
  g.innerHTML=`<div style="overflow-x:auto"><table class="plist-table">
    <thead><tr>
      <th class="plist-th-add"></th>
      <th></th>
      <th class="plist-col-ref">Référence</th>
      <th>Qualité</th>
      <th>Détails</th>
      <th>Couleur</th>
      <th>GSM</th>
      ${_allPalette?'<th colspan="3">Dimensions</th>':`<th>Laize</th>
      <th>Diamètre</th>
      <th class="plist-col-mandrin">Mandrin</th>`}
      <th>Poids (kg)</th>
      ${_priceMode?'<th>Prix</th>':''}
      <th class="plist-col-usine">Réf. usine</th>
      <th class="plist-col-depot">Emplacement</th>
      <th>Zone</th>
    </tr></thead>
    <tbody>${rows}</tbody>
  </table></div>`;
  _updatePager();
  if(typeof _updateAddPageBtn==='function')_updateAddPageBtn();
}

function render(list){
  const g=document.getElementById('pgrid');
  if(!g)return;
  g._lastList=list;
  if(!list||list.length===0){
    g.className='pgrid';
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
      <div class="empty-lbl">${_fi?'Vous cherchez par filtre ?':LT[lang].t_no_results}</div>
      <div class="empty-sub">${_fi?`"${esc(document.getElementById('search-input')?.value||'')}" correspond à un filtre — utilisez le panneau de gauche.`:LT[lang].t_no_results_sub}</div>
      ${filterHints}
      <button class="btn-empty-reset" style="margin-top:8px" onclick="resetFilters()">${LT[lang].t_reset}</button>
    </div>`;
    return;
  }
  if(_viewMode==='list') renderList(list);
  else renderCards(list);
}


const _DET_NO_PHOTO=`<img src="img/photos-sur-demande.png" alt="Photos sur demande" style="width:100%;height:100%;object-fit:contain;background:#fff;">`;
const _DET_FAB_PHOTO=`<img src="img/fabrication-sur-demande.png" alt="Fabrication sur demande" style="width:100%;height:100%;object-fit:contain;">`;
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
  const len=_detList().length;
  if(prev)prev.disabled=(_detIdx<=0);
  if(next)next.disabled=(_detIdx>=len-1);
}
async function openDetail(id){
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
  const _isFab=(p.zone==='FABRICATION SUR COMMANDE'||p.emplacement==='FABRICATION SUR COMMANDE'||(p.ref&&/^Photo_FAB/i.test(String(p.ref)))||(p.details&&/^\s*fabrication\b/i.test(p.details))||(p.emplacement&&/FAB|DIRECT USINE/i.test(p.emplacement)));
  const _isSiderunD=(p.emplacement==='OUR WAREHOUSE'&&((p.ref&&/FAB/i.test(String(p.ref)))||(p.details&&/fabrication/i.test(p.details))));
  const _DET_SIDERUN_PHOTO=`<img src="img/siderun-sur-demande.png" alt="Siderun" style="width:100%;height:100%;object-fit:contain;">`;
  const _detFallback=_isSiderunD?_DET_SIDERUN_PHOTO:_isFab?_DET_FAB_PHOTO:_DET_NO_PHOTO;
  mi.innerHTML=p.image_url?`<img src="${safeUrl(p.image_url)}" loading="lazy" alt="${esc(_detAlt)}" onerror="this.onerror=null;this.parentNode.innerHTML=document.getElementById('det-fallback').innerHTML;">`
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
    {lbl: LT[lang].t_spec_couleur||'Couleur',   val: p.couleur},
    {lbl: 'Grammage',                             val: p.grammage?p.grammage+' g/m²':null},
    {lbl: (p.format&&p.format.toLowerCase().includes('palette')&&p.largeur&&p.longueur)?'Dimensions':(LT[lang].t_spec_laize||'Laize'),
     val: (p.format&&p.format.toLowerCase().includes('palette')&&p.largeur&&p.longueur)?mmToCm(p.largeur)+' × '+mmToCm(p.longueur)+' cm':(p.largeur?mmToCm(p.largeur)+' cm':null)},
    {lbl: LT[lang].t_spec_longueur||'Longueur', val: p.format&&p.format.toLowerCase().includes('palette')&&p.largeur&&p.longueur?null:(p.format==='Palette'&&p.longueur?mmToCm(p.longueur)+' cm':null)},
    {lbl: LT[lang].t_spec_mandrin||'Mandrin',   val: p.noyau?p.noyau+' mm':null},
    {lbl: LT[lang].t_spec_format||'Dimensions',  val: p.qualite!=='UMAC'&&p.qualite!=='UMAN'&&!(p.format&&p.format.toLowerCase().includes('palette'))?formatLabel(p):null},
    {lbl: LT[lang].t_spec_depot||'Emplacement',  val: p.zone||p.emplacement},
    {lbl: 'Zone',                                  val: p.allee||'—', always:true},
    {lbl: 'Type',                                 val: p.qualite||null},
    {lbl: 'Code douanier',                        val: _toCN8(getHsCode(p.qualite,p.grammage,p.format))},
  ].filter(s=>s.val||s.always);
  document.getElementById('det-specs').innerHTML=specDefs.map(s=>
    `<div class="dspec-item"><div class="dspec-lbl">${esc(s.lbl)}</div><div class="dspec-val">${esc(s.val)}</div></div>`
  ).join('');

  // Détails texte masqué (déjà affiché comme sous-titre)
  const dd=document.getElementById('det-details');
  if(dd)dd.style.display='none';

  const _dpRow=document.getElementById('det-price-row');
  const _dpVal=document.getElementById('det-price-val');
  if(_dpRow&&_dpVal){
    if(_priceMode&&p.price){_dpVal.innerHTML=`<span style="font-size:22px;font-weight:800;color:var(--red)">${p.price.toLocaleString('fr-FR')} €/T</span>`;_dpRow.style.display='';}
    else{_dpRow.style.display='none';}
  }
  document.getElementById('det-poids-val').textContent=p.poids_net?fmt(p.poids_net):'—';

  // Reset modal add button state
  const mab=document.getElementById('modal-add-btn');
  if(mab){
    const alreadyIn=cart.find(x=>x.id===+p.id);
    mab.classList.toggle('added',!!alreadyIn);
    mab.innerHTML=alreadyIn?'✓ '+(lang==='en'?'Added':'Ajouté'):(LT[lang].t_add_modal_btn||'+ Ajouter à la sélection');
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
    const box=document.querySelector('#proforma-bg .pf-box');
    if(box)box.innerHTML=`<div class="pf-success"><div class="pf-success-ico">✅</div><div class="pf-success-t">Demande envoyée</div><div class="pf-success-s">Nous vous recontacterons rapidement.</div><button class="btn-pf-close" onclick="closeProforma();document.querySelector('#proforma-bg .pf-box').innerHTML=''">Fermer</button></div>`;
    toast('✅ Demande envoyée');
    try{ emailjs.send(EJS_SVC, EJS_TPL, { from_name:nom, message:`Proforma produit\nProduit: ${cur?.name||''}${cur?.ref?' ('+cur.ref+')':''}\nTél: ${tel}\nMsg: ${msg}` }); }catch(_){}
    ['pf-nom','pf-tel','pf-msg'].forEach(id=>{const el=document.getElementById(id);if(el)el.value='';});
  }catch(err){
    btn.disabled=false;btn.textContent='ENVOYER';
    toast('❌ Erreur envoi — réessayez');
    console.error('sendProforma error:',err);
  }
}
function contactWA(){
  if(!cur)return;
  window.open(`https://wa.me/${WA}?text=${encodeURIComponent(`Bonjour, intéressé par : ${cur.name}${cur.ref?' ('+cur.ref+')':''} — ${fmt(cur.poids_net)} disponibles. Quel est votre prix ?`)}`, '_blank');
}
function resetFilters(){
  try{
    // 1. Clear msd state sets
    Object.keys(msdState).forEach(id=>{ msdState[id].clear(); });

    // 2. Remove selected class from all msd options everywhere
    document.querySelectorAll('.msd-option.selected').forEach(o=>o.classList.remove('selected'));

    // 3. Reset all msd button labels
    ['msd-type','msd-mandrin','msd-couleur','msd-details'].forEach(id=>{
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
    _stockFilter.clear();_depotFilter='';_photoFilter='';_formatFilter='';
    ['fb-bobine','fb-palette','fb-recyc','fb-fab'].forEach(id=>{const el=document.getElementById(id);if(el)el.classList.remove('active');});

    // 5. Clear all inputs
    ['f-pmin','f-pmax','f-pmin-fb','f-pmax-fb','f-lmin','f-lmax','f-lmin-fb','f-lmax-fb','f-gmin','f-gmax',
     'f-lmin-sb','f-lmax-sb','f-longmin-sb','f-longmax-sb','f-longmin','f-longmax',
     'f-wmin','f-wmax','f-wmin-mob','f-wmax-mob',
     'f-zone-num','f-zone-let','f-zone-num-mob','f-zone-let-mob',
     'f-gmin-sb','f-gmax-sb','f-pmin-sb','f-pmax-sb',
     'f-gmin-mob','f-gmax-mob','f-lmin-mob','f-lmax-mob','f-pmin-mob','f-pmax-mob',
     'f-usine',
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
let cart=(()=>{try{return JSON.parse(localStorage.getItem('prodi_cart'))||[];}catch(_){return[];}})();

function updateCartBadge(){
  const badge=document.getElementById('cart-badge');
  if(cart.length>0){badge.textContent=cart.length;badge.classList.add('show');}
  else{badge.classList.remove('show');}
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
      if(cb){cb.classList.remove('added');cb.innerHTML=`<span class="cart-icon">+</span><span class="cart-check">✓</span> ${lang==='en'?'Add':'Ajouter'}`;}
    });
    localStorage.setItem('prodi_cart',JSON.stringify(cart));
    updateCartBadge();renderDrawer();
    btn.textContent='+';
    toast(LT[lang].t_removed_all);
  } else {
    // Add all not yet in cart
    currentList.forEach(p=>{
      if(!cart.find(x=>x.id===+p.id)){
        cart.push({id:p.id,name:p.name,ref:p.ref,type:p.type,qualite:p.qualite||null,details:p.details||null,grammage:p.grammage,largeur:p.largeur,format:p.format,poids_net:p.poids_net,price:p.price||null,img:p.image_url||null,couleur:p.couleur||null,usine:p.usine||null,zone:p.zone||null,emplacement:p.emplacement||null,allee:p.allee||null});
        const lb=document.getElementById('ladd-'+p.id);
        if(lb){lb.classList.add('added');lb.textContent='✓';}
        const cb=document.getElementById('cadd-'+p.id);
        if(cb){cb.classList.add('added');cb.innerHTML=`<span class="cart-check">✓</span>`;}
      }
    });
    localStorage.setItem('prodi_cart',JSON.stringify(cart));
    updateCartBadge();renderDrawer();
    btn.textContent='−';
    toast(LT[lang].t_added_all);
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
  // poids live = somme des N premières unités (priorisées photo)
  const w=_grpComputeWeight(gid,n);
  const wTxt=Math.round(w).toLocaleString('fr-FR')+' kg';
  document.querySelectorAll(`${sel} .grp-weight`).forEach(el=>el.textContent=wTxt);
  // libellé + état "added" en fonction de la nouvelle qty
  const grp=_groupsList.find(g=>g.gid===gid);
  const tIds=grp?grp.units.slice(0,n).map(u=>u.id):[];
  const allIn=tIds.length>0&&tIds.every(id=>cart.find(x=>x.id===+id));
  document.querySelectorAll(`${sel} .grp-add-btn`).forEach(b=>{
    if(b.classList.contains('plist-grp-add'))return;
    b.classList.toggle('added',allIn);
    b.textContent=allIn?`✓ Ajouté ${n}`:`+ Ajouter ${n}`;
  });
  document.querySelectorAll(`${sel} .plist-grp-add`).forEach(b=>{
    b.classList.toggle('added',allIn);
    b.textContent=allIn?'✓':'+';
    const lbl=`${typeof lang!=='undefined'&&lang==='en'?'Add':'Ajouter'} ${n}`;
    b.title=lbl; b.setAttribute('aria-label',lbl);
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
  if(added)toast(`${added} produit${added>1?'s':''} ajouté${added>1?'s':''} à la sélection`);
  else toast('Déjà ajoutés');
}
function _grpRefreshAddedState(gid,isAdded){
  const sel=`[data-gid="${CSS.escape(gid)}"]`;
  // Bouton list view (compact pill +)
  document.querySelectorAll(`${sel} .plist-grp-add`).forEach(b=>{
    b.classList.toggle('added',isAdded);
    b.textContent=isAdded?'✓':'+';
  });
  // Bouton grid card view (avec texte "+ Ajouter N")
  document.querySelectorAll(`${sel} .grp-add-btn`).forEach(b=>{
    b.classList.toggle('added',isAdded);
    const n=_groupQty[gid]||1;
    if(b.classList.contains('plist-grp-add'))return;
    b.textContent=isAdded?`✓ Ajouté ${n}`:`+ Ajouter ${n}`;
  });
}

function addToCart(id){
  const p=all.find(x=>x.id===+id);if(!p)return;
  const alreadyIn=cart.find(x=>x.id===+id);
  const mab=document.getElementById('modal-add-btn');
  if(alreadyIn){
    // Toggle OFF — remove from cart
    removeFromCart(id);
    const caddBtn=document.getElementById('cadd-'+id);
    if(caddBtn){caddBtn.classList.remove('added');caddBtn.innerHTML=`<span class="cart-icon">+</span><span class="cart-check">✓</span> ${lang==='en'?'Add':'Ajouter'}`;}
    const laddBtn=document.getElementById('ladd-'+id);
    if(laddBtn){laddBtn.classList.remove('added');laddBtn.textContent='+';}
    if(mab){mab.classList.remove('added');mab.innerHTML=LT[lang].t_add_modal_btn||'+ Ajouter à la sélection';}
    toast(LT[lang].t_removed_sel);
    return;
  }
  cart.push({id:p.id,name:p.name,ref:p.ref,type:p.type,qualite:p.qualite||null,details:p.details||null,grammage:p.grammage,largeur:p.largeur,format:p.format,poids_net:p.poids_net,price:p.price||null,img:p.image_url||null,couleur:p.couleur||null,usine:p.usine||null,zone:p.zone||null,emplacement:p.emplacement||null,allee:p.allee||null});
  localStorage.setItem('prodi_cart',JSON.stringify(cart));
  updateCartBadge();
  const caddBtn=document.getElementById('cadd-'+id);
  if(caddBtn){caddBtn.classList.add('added');caddBtn.innerHTML=`<span class="cart-check">✓</span>`;}
  const laddBtn=document.getElementById('ladd-'+id);
  if(laddBtn){laddBtn.classList.add('added');laddBtn.textContent='✓';}
  if(mab){mab.classList.add('added');mab.innerHTML='✓';}
  toast(LT[lang].t_added_sel);
  renderDrawer();
}

function addPageToCart(){
  const g=document.getElementById('pgrid');
  const list=g&&g._lastList;
  if(!list||!list.length){toast('Aucun produit sur cette page');return;}
  const allIn=list.every(p=>cart.find(x=>x.id===+p.id));
  if(allIn){
    const ids=new Set(list.map(p=>+p.id));
    const removed=ids.size;
    cart=cart.filter(x=>!ids.has(+x.id));
    localStorage.setItem('prodi_cart',JSON.stringify(cart));
    updateCartBadge();
    list.forEach(p=>{
      const c=document.getElementById('cadd-'+p.id);
      if(c){c.classList.remove('added');c.innerHTML='<span class="cart-icon">+</span><span class="cart-check">✓</span>';}
      const l=document.getElementById('ladd-'+p.id);
      if(l){l.classList.remove('added');l.textContent='+';}
    });
    toast(`${removed} produit${removed>1?'s':''} retiré${removed>1?'s':''} de la sélection`);
    renderDrawer();_updateAddPageBtn();
    return;
  }
  let added=0;
  list.forEach(p=>{
    if(cart.find(x=>x.id===+p.id))return;
    cart.push({id:p.id,name:p.name,ref:p.ref,type:p.type,qualite:p.qualite||null,details:p.details||null,grammage:p.grammage,largeur:p.largeur,format:p.format,poids_net:p.poids_net,price:p.price||null,img:p.image_url||null,couleur:p.couleur||null,usine:p.usine||null,zone:p.zone||null,emplacement:p.emplacement||null,allee:p.allee||null});
    added++;
  });
  localStorage.setItem('prodi_cart',JSON.stringify(cart));
  updateCartBadge();
  list.forEach(p=>{
    const c=document.getElementById('cadd-'+p.id);
    if(c){c.classList.add('added');c.innerHTML='<span class="cart-check">✓</span>';}
    const l=document.getElementById('ladd-'+p.id);
    if(l){l.classList.add('added');l.textContent='✓';}
  });
  toast(`${added} produit${added>1?'s':''} ajouté${added>1?'s':''} à la sélection`);
  renderDrawer();_updateAddPageBtn();
}

function _updateAddPageBtn(){
  const g=document.getElementById('pgrid');
  const list=g&&g._lastList;
  document.querySelectorAll('.add-page-btn').forEach(btn=>{
    const allIn=list&&list.length&&list.every(p=>cart.find(x=>x.id===+p.id));
    btn.classList.toggle('all-in',!!allIn);
    btn.title=allIn?'Retirer tous les produits de la page de la sélection':'Ajouter tous les produits de la page à la sélection';
  });
}

function removeFromCart(id){
  cart=cart.filter(x=>x.id!==+id);
  localStorage.setItem('prodi_cart',JSON.stringify(cart));
  updateCartBadge();renderDrawer();
  // Désélectionner le bouton dans la grille
  const cb=document.getElementById('cadd-'+id);
  if(cb){cb.classList.remove('added');cb.innerHTML=`<span class="cart-icon">+</span><span class="cart-check">✓</span> ${lang==='en'?'Add':'Ajouter'}`;}
  const lb=document.getElementById('ladd-'+id);
  if(lb){lb.classList.remove('added');lb.textContent='+';}
}

// ── SHARE CART ──
function _shortCode(){
  return Array.from(crypto.getRandomValues(new Uint8Array(6)),b=>'0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ'[b%62]).join('');
}
// shareCart conservé pour compat (peut être appelé depuis du HTML legacy)
async function shareCart(){return printSelection({autoGenerate:false});}
function openImportRefs(){
  const existing=document.getElementById('import-refs-bg');
  if(existing)existing.remove();
  const d=document.createElement('div');
  d.id='import-refs-bg';
  d.style.cssText='position:fixed;inset:0;background:rgba(0,0,0,.45);z-index:9000;display:flex;align-items:center;justify-content:center;padding:16px;';
  d.innerHTML=`<div style="background:#fff;border-radius:12px;padding:28px;max-width:500px;width:100%;box-shadow:0 20px 60px rgba(0,0,0,.2);">
    <div style="font-family:'Bebas Neue',sans-serif;font-size:22px;letter-spacing:1.5px;margin-bottom:4px;">IMPORTER DES RÉFÉRENCES</div>
    <div style="font-size:13px;color:#999;margin-bottom:14px;">Colle tes numéros de ref (un par ligne, ou séparés par des virgules/espaces)</div>
    <textarea id="import-refs-input" style="width:100%;min-height:120px;padding:12px;border:1.5px solid #e0e0e0;border-radius:8px;font-size:14px;font-family:'DM Sans',sans-serif;resize:vertical;box-sizing:border-box;" placeholder="917643&#10;985042&#10;DU5517&#10;774533"></textarea>
    <div id="import-refs-result" style="font-size:13px;margin-top:8px;min-height:20px;"></div>
    <div style="display:flex;gap:8px;margin-top:12px;">
      <button onclick="_doImportRefs()" style="flex:2;padding:12px;background:#FE0000;color:#fff;border:none;border-radius:8px;font-family:'Bebas Neue',sans-serif;font-size:16px;letter-spacing:1px;cursor:pointer;" id="import-refs-btn">AJOUTER À LA SÉLECTION</button>
      <button onclick="document.getElementById('import-refs-bg').remove();" style="padding:12px 16px;background:transparent;border:1.5px solid #e0e0e0;border-radius:8px;font-size:14px;cursor:pointer;">Fermer</button>
    </div>
  </div>`;
  d.addEventListener('click',e=>{if(e.target===d)d.remove();});
  document.body.appendChild(d);
  document.getElementById('import-refs-input').focus();
}

async function _doImportRefs(){
  const input=document.getElementById('import-refs-input').value.trim();
  if(!input){toast('Colle des références !');return;}
  // Parse refs: split by comma, newline, space, semicolon
  const rawRefs=input.split(/[\s,;\n\r]+/).map(s=>s.trim().toUpperCase()).filter(s=>s.length>0);
  const uniqueRefs=[...new Set(rawRefs)];
  if(!uniqueRefs.length){toast('Aucune référence détectée');return;}

  const btn=document.getElementById('import-refs-btn');
  const result=document.getElementById('import-refs-result');
  btn.disabled=true;btn.textContent='RECHERCHE...';
  result.innerHTML='<span style="color:#999">Recherche de '+uniqueRefs.length+' référence(s)…</span>';

  try{
    // Search by ref containing each value (Photo_XXXXX format in DB)
    const found=[];
    const notFound=[];
    // Batch: fetch all products matching any of the refs
    const p=new URLSearchParams({select:'*'});
    p.append('or','('+uniqueRefs.map(r=>'ref.ilike.%'+r+'%').join(',')+')');
    const {data}=await sbQ('products?'+p,{headers:{'Range':'0-999'}});

    // Match each input ref to a product
    for(const ref of uniqueRefs){
      const match=data.find(p=>p.ref&&p.ref.toUpperCase().includes(ref));
      if(match){
        found.push(match);
      } else {
        notFound.push(ref);
      }
    }

    // Add found products to cart (skip duplicates)
    let added=0;
    for(const p of found){
      if(!cart.find(c=>c.id===p.id)){
        const ui=rowToUi(p);
        cart.push(ui);
        added++;
      }
    }
    updateCartBadge();
    renderDrawer();

    // Show result
    let msg=`<span style="color:#1a9e5c;font-weight:600">✓ ${found.length} trouvé(s), ${added} ajouté(s)</span>`;
    if(notFound.length)msg+=`<br><span style="color:#e53e3e">✗ ${notFound.length} introuvable(s) : ${esc(notFound.join(', '))}</span>`;
    result.innerHTML=msg;
    btn.disabled=false;btn.textContent='AJOUTER À LA SÉLECTION';
  }catch(e){
    console.error('Import refs error:',e);
    result.innerHTML='<span style="color:#e53e3e">Erreur lors de la recherche</span>';
    btn.disabled=false;btn.textContent='AJOUTER À LA SÉLECTION';
  }
}

function _proformaNumero(){
  const d=new Date();
  const yy=String(d.getFullYear()).slice(2);
  const mm=String(d.getMonth()+1).padStart(2,'0');
  const seq=Math.floor(1000+Math.random()*9000);
  return `DE${yy}${mm}${seq}`;
}

function _proformaDesignation(it){
  const lines=[];
  if(it.usine)lines.push(`USINE ${it.usine}${it.emplacement&&/FAB|DIRECT/i.test(it.emplacement)?' - FABRICATION':''}`);
  lines.push('');
  const titre=formatProductTitle(it.qualite,it.qualite);
  const couleur=it.couleur?` ${it.couleur.toUpperCase()}`:'';
  lines.push(`${titre}${couleur}`);
  if(it.details){
    const d=String(it.details).replace(/\s*[·]\s*|\s+-\s+-\s+/g,' · ').trim();
    if(d&&d.length>2)lines.push(d.toUpperCase());
  }
  if(it.gsm)lines.push(`GRAMMAGE : ${it.gsm} g/m²`);
  if(it.largeurCm)lines.push(`LAIZE${it.format&&/palette/i.test(it.format)?'':'S SOUHAITÉES SELON LAIZE MÈRE'} ${it.format&&/palette/i.test(it.format)?'':'DE '}${it.largeurCm} cm`);
  return lines.filter((l,i,a)=>!(l===''&&(i===0||a[i-1]===''))).join('\n');
}

function askText({title,sub,placeholder,value,okLabel,cancelLabel,onConfirm}={}){
  return new Promise(resolve=>{
    const bg=document.createElement('div');
    bg.className='askp-bg show';
    bg.innerHTML=`
      <div class="askp-box" role="dialog" aria-modal="true" onclick="event.stopPropagation()">
        ${title?`<div class="askp-title">${esc(title)}</div>`:''}
        ${sub?`<div class="askp-sub">${esc(sub)}</div>`:''}
        <input type="text" class="askp-input" placeholder="${esc(placeholder||'')}" value="${esc(value||'')}">
        <div class="askp-actions">
          <button class="askp-btn askp-btn-cancel">${esc(cancelLabel||'Annuler')}</button>
          <button class="askp-btn askp-btn-ok">${esc(okLabel||'OK')}</button>
        </div>
      </div>`;
    document.body.appendChild(bg);
    const input=bg.querySelector('input');
    const close=(val)=>{bg.remove();document.removeEventListener('keydown',keyHandler);resolve(val);};
    // onConfirm s'exécute SYNC dans le user gesture du clic OK / Enter — utile
    // pour window.open qui sinon serait bloqué par Safari hors-gesture.
    const confirmAndClose=(val)=>{
      // val peut être '' (OK avec input vide) — on déclenche quand même onConfirm.
      // Seul un cancel (null) ne le déclenche pas.
      if(onConfirm){try{onConfirm(val);}catch(_){}}
      close(val);
    };
    const keyHandler=(e)=>{
      if(e.key==='Enter'){e.preventDefault();confirmAndClose((input.value||'').trim());}
      else if(e.key==='Escape'){e.preventDefault();close(null);}
    };
    bg.addEventListener('click',e=>{if(e.target===bg)close(null);});
    bg.querySelector('.askp-btn-cancel').addEventListener('click',()=>close(null));
    bg.querySelector('.askp-btn-ok').addEventListener('click',()=>confirmAndClose((input.value||'').trim()));
    document.addEventListener('keydown',keyHandler);
    setTimeout(()=>input.focus(),50);
  });
}

async function printSelection(opts){
  const autoGenerate=!!(opts&&opts.autoGenerate);
  const headless=autoGenerate;
  // Onglet PDF réservé dans le user gesture du clic OK / Enter.
  let pdfWin=null;
  if(!cart.length){toast('Sélection vide !');return;}
  const clientName=await askText(autoGenerate?{
    title:'Générer la liste',
    sub:'Nom du client (utilisé dans le PDF).',
    placeholder:'Ex : Société Dupont',
    okLabel:'Générer',
    onConfirm:()=>{
      try{
        pdfWin=window.open('about:blank','_blank');
        if(pdfWin){
          pdfWin.document.open();
          pdfWin.document.write('<!doctype html><html lang="fr"><head><meta charset="utf-8"><title>Génération du PDF…</title><style>body{margin:0;font:16px/1.4 system-ui,-apple-system,sans-serif;display:flex;flex-direction:column;align-items:center;justify-content:center;height:100vh;background:#f5f5f3;color:#666;gap:14px}.s{width:36px;height:36px;border:3px solid #ddd;border-top-color:#FE0000;border-radius:50%;animation:r 1s linear infinite}@keyframes r{to{transform:rotate(360deg)}}</style></head><body><div class="s"></div><div>Génération du PDF…</div></body></html>');
          pdfWin.document.close();
        }
      }catch(_){}
    }
  }:{
    title:'Générer la liste',
    sub:'Donne un nom à cette sélection (le nom du client par exemple).',
    placeholder:'Ex : Société Dupont',
    okLabel:'Générer'
  });
  // null = cancel (Annuler / Escape / clic hors-modal). '' = Générer sans nom.
  if(clientName===null){if(pdfWin){try{pdfWin.close();}catch(_){}}return;}
  const items=cart.map(p=>{
    const _f=all.find(x=>x.id===+p.id)||p;
    const qualite=p.qualite||_f.qualite||'';
    const couleur=p.couleur||_f.couleur||'';
    const usine=String(p.usine||_f.usine||'').replace(/^REF\s*/i,'');
    const gsm=p.grammage||_f.grammage||'';
    const largeur=p.largeur||_f.largeur||0;
    const longueur=p.longueur||_f.longueur||0;
    const largeurCm=largeur?mmToCm(largeur):'';
    const format=p.format||_f.format||'';
    const isPalette=format&&format.toLowerCase().includes('palette');
    const dim=isPalette&&largeur&&longueur
      ?`${mmToCm(largeur)} × ${mmToCm(longueur)} cm`
      :largeur&&longueur
        ?`${mmToCm(largeur)} cm · Ø ${mmToCm(longueur)} cm`
        :largeur?`${mmToCm(largeur)} cm`:'—';
    const details=p.details||_f.details||'';
    const _detClean=details.replace(/[-–—\s]+/g,' ').trim();
    const poidsKg=Number(p.poids_net||0);
    const priceT=Number(_f.price||0);
    const priceKg=priceT/1000;
    const montant=poidsKg*priceKg;
    const titre=formatProductTitle(qualite,qualite);
    const photoRef=String(p.ref||_f.ref||'').replace(/^Photo_/i,'').trim();
    const it={qualite,couleur,usine,gsm,largeurCm,details,format,emplacement:p.emplacement||_f.emplacement||''};
    const hs=getHsCode(qualite,gsm,format)||'';
    return{ref:qualite||'—',photoRef,qualite,titre,details:_detClean,couleur,gsm,dim,poidsKg,usine,priceKg,priceT,montant,format,hs,designation:_proformaDesignation(it)};
  });
  const _isPaletteIt=it=>!!(it.format&&/palette|feuille/i.test(it.format));
  const itemsBobine=items.filter(it=>!_isPaletteIt(it));
  const itemsFormat=items.filter(_isPaletteIt);
  const totalPoids=items.reduce((s,i)=>s+i.poidsKg,0);
  const totalMontant=items.reduce((s,i)=>s+i.montant,0);
  // Grouped view (résumé) — by qualite code
  const groupsMap=new Map();
  items.forEach(it=>{
    const k=it.qualite||'—';
    const g=groupsMap.get(k)||{qualite:k,count:0,poidsKg:0,montant:0,hsSet:new Set()};
    g.count+=1;g.poidsKg+=it.poidsKg;g.montant+=it.montant;
    if(it.hs)g.hsSet.add(it.hs);
    groupsMap.set(k,g);
  });
  const groups=[...groupsMap.values()].sort((a,b)=>b.poidsKg-a.poidsKg);
  groups.forEach(g=>{
    const codes6=[...new Set([...(g.hsSet||[])].map(c=>{
      const m=String(c).match(/^([A-Z0-9]{4})([A-Z0-9]{2})/i);
      return m?`${m[1]}.${m[2]}`:c;
    }))];
    g.hs=codes6.length?_hsRange(codes6.join(' / ')):'';
  });
  const eur=v=>(v||0).toLocaleString('fr-FR',{minimumFractionDigits:2,maximumFractionDigits:2});
  const num=v=>(v||0).toLocaleString('fr-FR',{maximumFractionDigits:0});
  const dec=(v,d=2)=>(v||0).toLocaleString('fr-FR',{minimumFractionDigits:d,maximumFractionDigits:d});
  const _detailRow=it=>`<tr><td class="ref">${esc(it.photoRef||'—')}</td><td class="ref">${esc(it.ref)}</td><td>${esc(it.titre||'')}</td><td>${esc(it.details||'—')}</td><td>${esc(it.couleur||'—')}</td><td class="num">${it.gsm?esc(it.gsm+' g/m²'):'—'}</td><td>${esc(it.dim||'—')}</td><td class="num">${esc(num(it.poidsKg)+' kg')}</td><td class="num">${esc(it.usine||'—')}</td><td class="num">${esc(num(it.priceT)+' €/T')}</td><td class="num">${esc(eur(it.montant)+' €')}</td></tr>`;
  const _itemsThead=dimLbl=>`<thead><tr><th>N°</th><th>Réf.</th><th>Qualité</th><th>Détails</th><th>Couleur</th><th style="text-align:right;">GSM</th><th>${dimLbl}</th><th style="text-align:right;">PN (kg)</th><th style="text-align:right;">Usine</th><th style="text-align:right;">P/T (€)</th><th style="text-align:right;">Montant HT (€)</th></tr></thead>`;
  const _itemsColgroup=`<colgroup><col class="c-pref"><col class="c-q"><col class="c-tit"><col class="c-det"><col class="c-col"><col class="c-gsm"><col class="c-dim"><col class="c-pn"><col class="c-us"><col class="c-pt"><col class="c-mt"></colgroup>`;
  // html2pdf utilise html2canvas (screenshot unique) → le <thead> ne se répète pas naturellement sur les pages 2+.
  // Workaround : on splitte le tableau en chunks, chacun avec son propre thead, séparés par page-break-before:always.
  // CHUNK_FIRST plus petit pour laisser la place au header logo/adresse/TVA + au titre Bobines/Formats au-dessus.
  const _chunk=(arr,size)=>{const out=[];for(let i=0;i<arr.length;i+=size)out.push(arr.slice(i,i+size));return out;};
  const _detailTable=(rows,dimLbl)=>{
    const CHUNK_FIRST=10, CHUNK_REST=14;
    if(rows.length<=CHUNK_FIRST){
      return `<table class="items view-detail">${_itemsColgroup}${_itemsThead(dimLbl)}<tbody>${rows.map(_detailRow).join('')}</tbody></table>`;
    }
    const chunks=[rows.slice(0,CHUNK_FIRST), ..._chunk(rows.slice(CHUNK_FIRST),CHUNK_REST)];
    return chunks.map((chunk,idx)=>{
      const _breakStyle=idx>0?' style="page-break-before:always;"':'';
      return `<table class="items view-detail"${_breakStyle}>${_itemsColgroup}${_itemsThead(dimLbl)}<tbody>${chunk.map(_detailRow).join('')}</tbody></table>`;
    }).join('');
  };
  const _detailHTML=(itemsBobine.length&&itemsFormat.length)
    ?`<div class="section-title">Bobines</div>${_detailTable(itemsBobine,'Laize')}<div class="section-title">Formats</div>${_detailTable(itemsFormat,'Dimensions')}`
    :itemsBobine.length
      ?_detailTable(itemsBobine,'Laize')
      :_detailTable(itemsFormat,'Dimensions');
  const today=new Date();
  const dateFR=`${String(today.getDate()).padStart(2,'0')}/${String(today.getMonth()+1).padStart(2,'0')}/${String(today.getFullYear()).slice(2)}`;
  const numero=_proformaNumero();
  const baseUrl=location.origin+location.pathname.replace(/[^/]*$/,'');
  // ── Lien partagé (sélection avec photos) + mailto prefait ──
  const _shareCode=_shortCode();
  const _shareIds=cart.map(x=>x.id).join(',');
  const _shareUrl=window.location.origin+window.location.pathname+'?s='+_shareCode+(_priceMode?'&p=1':'');
  sbQ('shared_carts',{method:'POST',body:{code:_shareCode,cart_ids:_shareIds},headers:{'Prefer':'return=minimal'}}).catch(()=>{});
  const _greeting=clientName?`Bonjour M. ${clientName},`:'Bonjour,';
  const _mailLines=[
    _greeting,'',
    'Veuillez trouver ci-dessous le lien vers les photos de notre sélection :',
    _shareUrl,'',
    'Bien cordialement,','Prodiconseil'
  ].join('\n');
  const _mailSubject=clientName?`Notre sélection — ${clientName}`:'Notre sélection';
  const _mailtoUrl=`mailto:?subject=${encodeURIComponent(_mailSubject).replace(/'/g,'%27')}&body=${encodeURIComponent(_mailLines).replace(/'/g,'%27')}`;
  let w, _shareIframe;
  if(headless){
    // Headless iframe — pas d'onglet visible. La proforma est rendue
    // hors écran juste pour qu'html2pdf (share) ou window.print (print)
    // ait un DOM à manipuler. Le download + mailto sont délégués au parent.
    _shareIframe=document.createElement('iframe');
    _shareIframe.setAttribute('aria-hidden','true');
    _shareIframe.style.cssText='position:fixed;left:0;top:0;width:1200px;height:1600px;border:0;opacity:0;pointer-events:none;z-index:-1;';
    document.body.appendChild(_shareIframe);
    w=_shareIframe.contentWindow;
    const _cleanup=()=>{window.removeEventListener('message',_onMsg);try{_shareIframe&&_shareIframe.parentNode&&_shareIframe.remove();}catch(_){}};
    const _onMsg=(ev)=>{
      const d=ev&&ev.data;
      if(d==='proforma-share-done'){_cleanup();return;}
      if(d&&d.type==='proforma-share-fallback'){
        // Transfert du blob à pdfWin → pdfWin crée son propre object URL
        // (Safari refuse souvent les blob URLs cross-window dans <embed>/<iframe>).
        if(pdfWin&&!pdfWin.closed){
          try{pdfWin.__pdfBlob=d.blob;}catch(_){}
        }
        let url;
        try{url=(pdfWin&&pdfWin.URL?pdfWin.URL:URL).createObjectURL(d.blob);}
        catch(_){url=URL.createObjectURL(d.blob);}
        if(pdfWin&&!pdfWin.closed){
          try{
            const _esc=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'})[c]);
            const _safeTitle=_esc(d.filename||'Liste détaillée');
            const _pdfSrc=_esc(url);
            const _mailHrefJS=JSON.stringify(d.mailHref||'');
            pdfWin.document.open();
            pdfWin.document.write(`<!doctype html><html lang="fr"><head><meta charset="utf-8"><title>${_safeTitle}</title>
<style>
*{margin:0;padding:0;box-sizing:border-box}
html,body{height:100%;font-family:'DM Sans',-apple-system,BlinkMacSystemFont,system-ui,sans-serif;background:#525659}
body{display:flex;flex-direction:column;height:100vh}
.toolbar{display:flex;gap:10px;padding:12px 18px;background:#fff;border-bottom:1px solid #e8e8e4;justify-content:flex-end;align-items:center;flex-shrink:0}
.toolbar .title{margin-right:auto;font-weight:600;color:#222;font-size:14px;letter-spacing:.2px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:60%}
.btn{display:inline-flex;align-items:center;gap:8px;padding:9px 16px;border:1.5px solid #e0e0e0;background:#fff;color:#222;font-family:inherit;font-size:14px;font-weight:600;cursor:pointer;border-radius:8px;transition:all .15s;white-space:nowrap}
.btn:hover{border-color:#222;background:#f5f5f3}
.btn.primary{background:#FE0000;border-color:#FE0000;color:#fff}
.btn.primary:hover{background:#d40000;border-color:#d40000}
.btn svg{width:16px;height:16px;flex-shrink:0}
.viewer{flex:1;width:100%;height:100%;background:#525659;display:block}
@media print{.toolbar{display:none!important}.viewer{position:fixed;inset:0;width:100vw;height:100vh}}
</style></head><body>
<div class="toolbar">
  <div class="title">${_safeTitle.replace(/\\.pdf$/,'')}</div>
  <button class="btn" onclick="window.print()" title="Imprimer">
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 6 2 18 2 18 9"/><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/><rect x="6" y="14" width="12" height="8"/></svg>
    Imprimer
  </button>
  <button class="btn" onclick="window.location.href=document.getElementById('pdf-viewer').src" title="Ouvrir le PDF">
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
    Voir PDF
  </button>
  <button class="btn primary" onclick="window.location.href=${_mailHrefJS}" title="Partager le lien des photos par mail">
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg>
    Partager
  </button>
</div>
<embed class="viewer" id="pdf-viewer" src="${_pdfSrc}" type="application/pdf">
<script>
  // Si le blob a été transmis directement, recrée l'URL dans pdfWin (plus fiable Safari).
  try{
    if(window.__pdfBlob){
      var _localUrl=URL.createObjectURL(window.__pdfBlob);
      var _v=document.getElementById('pdf-viewer');
      if(_v)_v.src=_localUrl;
    }
  }catch(_){}
</script>
</body></html>`);
            pdfWin.document.close();
          }catch(_){
            const dl=document.createElement('a');
            dl.href=url;dl.download=d.filename;dl.style.display='none';
            document.body.appendChild(dl);dl.click();dl.remove();
          }
        }else{
          const dl=document.createElement('a');
          dl.href=url;dl.download=d.filename;dl.style.display='none';
          document.body.appendChild(dl);dl.click();dl.remove();
        }
        setTimeout(()=>URL.revokeObjectURL(url),300000);
      }
      if(d&&d.type==='proforma-share-error'){
        toast('❌ '+(d.message||'erreur PDF'));
        if(pdfWin&&!pdfWin.closed){try{pdfWin.close();}catch(_){}}
      }
    };
    window.addEventListener('message',_onMsg);
    setTimeout(_cleanup,120000);
  }else{
    w=window.open('','_blank');
  }
  const _safeClient=clientName.replace(/[\/\\:*?"<>|]/g,'_');
  const _docTitle=_safeClient?`Liste détaillée — ${_safeClient} — ${numero}`:`Liste détaillée — ${numero}`;
  w.document.write(`<!DOCTYPE html><html lang="fr"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><base href="${baseUrl}"><title>${_docTitle}</title>
<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Bebas+Neue&family=DM+Sans:wght@400;500;600;700&family=Pinyon+Script&family=Playfair+Display:ital,wght@1,400;1,700&display=swap" rel="stylesheet">
<style>
*{margin:0;padding:0;box-sizing:border-box;}
:root{--ink:#1a1a1a;--gray:#6b6b6b;--line:#1a1a1a;--soft:#e5e5e0;--red:#d22;--bg:#fdfcfa;}
html,body{background:#eeeae3;}
body{font-family:'DM Sans','Helvetica Neue',Arial,sans-serif;font-size:9.5px;color:var(--ink);line-height:1.35;padding:24px;min-width:fit-content;}
.page{background:var(--bg);width:210mm;min-height:297mm;padding:14mm 14mm 12mm;box-shadow:0 4px 24px rgba(0,0,0,.08);position:relative;margin:0 auto;}
.page-num{position:absolute;top:10mm;right:14mm;font-weight:600;font-size:11px;}
.head{display:grid;grid-template-columns:1.05fr .95fr;gap:18px;margin-bottom:14px;}
.brand{display:flex;flex-direction:column;align-items:flex-start;gap:8px;}
.brand-logo{width:200px;height:auto;max-height:42px;object-fit:contain;flex-shrink:0;display:block;}
.brand-text{width:100%;}
.brand-text .brand-line{font-size:9px;line-height:1.5;color:var(--ink);}
.brand-text b{font-weight:700;}
.brand-text .red{color:var(--red);font-weight:700;}
.client{padding-top:6px;display:flex;flex-direction:column;align-items:flex-start;gap:8px;}
.client-name{font-family:'DM Sans',sans-serif;font-weight:700;font-size:22px;letter-spacing:.5px;text-transform:uppercase;line-height:1.2;}
.client-date{font-family:'DM Sans',sans-serif;font-size:11px;font-weight:600;letter-spacing:1.5px;text-transform:uppercase;color:var(--gray);margin-top:6px;font-variant-numeric:tabular-nums;}
.client .proforma-title{font-size:30px;line-height:1;}
.client .commercial{font-size:10.5px;}
.client-block{font-size:11px;line-height:1.7;}
.client-block .country{font-weight:700;font-size:13px;letter-spacing:.5px;}
.client-fields{margin-top:10px;font-size:10.5px;line-height:1.7;}
.client-fields .lbl{display:inline-block;min-width:115px;color:#222;}
.editable{border-bottom:1px dashed #bbb;padding:0 4px;display:inline-block;min-width:80px;outline:none;}
.editable:focus{background:#fffbe6;border-bottom-style:solid;}
.title-row{margin:18px 0 10px;display:flex;justify-content:space-between;align-items:flex-end;}
.proforma-title{font-family:'Playfair Display',Georgia,serif;font-style:italic;font-weight:700;font-size:38px;letter-spacing:.3px;color:var(--ink);line-height:1;}
.commercial{font-size:10.5px;}
.commercial .lbl{color:var(--gray);}
.commercial b{font-weight:700;}
.info-row{display:grid;grid-template-columns:1.15fr 1fr;gap:12px;margin-bottom:10px;}
.info-table{width:100%;border-collapse:collapse;border:1.5px solid var(--line);font-size:10px;}
.info-table th,.info-table td{border:1px solid var(--line);padding:5px 8px;text-align:center;}
.info-table th{font-weight:700;text-transform:uppercase;letter-spacing:.5px;font-size:9px;background:#f7f4ee;}
.info-table td{font-weight:700;font-size:11px;height:24px;}
.cond-box{border:1.5px solid var(--line);padding:0;display:flex;flex-direction:column;}
.cond-head{background:#f7f4ee;padding:5px 10px;font-weight:700;border-bottom:1px solid var(--line);font-size:10px;}
.cond-body{padding:5px 10px;font-size:10px;line-height:1.6;flex:1;}
.cond-body .row{display:flex;gap:6px;}
.cond-body .lbl{color:var(--ink);font-weight:500;flex:0 0 auto;}
.cond-body .red{color:var(--red);font-weight:700;}
.items{width:100%;border-collapse:collapse;border:1.5px solid var(--line);font-size:10px;margin-bottom:0;}
.items th{background:var(--ink);color:#fff;padding:7px 8px;text-align:left;font-weight:700;font-size:9.5px;text-transform:uppercase;letter-spacing:.4px;border:1px solid var(--ink);}
.items td{padding:7px 8px;border:1px solid #c8c4bd;vertical-align:top;word-break:normal;overflow-wrap:break-word;hyphens:auto;}
.items td.ref{font-weight:700;font-size:10.5px;letter-spacing:.3px;}
.items td.designation{white-space:pre-line;line-height:1.5;}
.items td.num{text-align:right;font-variant-numeric:tabular-nums;font-weight:600;}
.items col.c-ref{width:13%;}
.items col.c-des{width:auto;}
.items col.c-pn{width:11%;}
.items col.c-pt{width:11%;}
.items col.c-mt{width:14%;}
.items col.c-pref{width:7%;}
.items col.c-q{width:5%;}
.items col.c-tit{width:14%;}
.items col.c-det{width:11%;}
.items col.c-col{width:7%;}
.items col.c-gsm{width:6%;}
.items col.c-dim{width:9%;}
.items col.c-us{width:5%;}
.items.view-detail{font-size:8.5px;}
.items.view-detail th{font-size:8.5px;padding:6px 5px;letter-spacing:.2px;}
.items.view-detail td{padding:5px 5px;}
.section-title{font-family:'DM Sans',sans-serif;font-weight:700;font-size:10px;text-transform:uppercase;letter-spacing:.6px;margin:14px 0 6px;padding:6px 10px;background:var(--ink);color:#fff;border:1.5px solid var(--ink);}
.section-title:first-child{margin-top:0;}
.mode-detail .section-title + .items{margin-top:0;}
.totals-block{padding:10px 14px;border:1.5px solid var(--line);border-top:none;background:#fafaf6;font-size:10.5px;line-height:1.8;font-weight:600;}
.totals-block .row{display:flex;justify-content:space-between;}
.totals-block .row b{color:var(--ink);}
.totals-grid{display:grid;grid-template-columns:1fr 1fr 1fr 1.1fr;border:1.5px solid var(--line);border-top:none;}
.totals-grid > div{padding:7px 10px;border-right:1px solid var(--line);text-align:center;}
.totals-grid > div:last-child{border-right:none;background:#fbf6e8;}
.totals-grid .lbl{font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:.4px;margin-bottom:3px;}
.totals-grid .val{font-size:13px;font-weight:700;font-variant-numeric:tabular-nums;}
.totals-grid .net .lbl{text-decoration:underline;}
.totals-grid .net .val{font-size:18px;color:var(--ink);}
.toolbar{position:fixed;top:14px;right:14px;display:flex;gap:12px;z-index:100;align-items:center;background:rgba(255,255,255,.95);padding:10px;border-radius:8px;box-shadow:0 4px 14px rgba(0,0,0,.12);}
.toolbar button{font-family:'DM Sans',sans-serif;font-size:16px;font-weight:600;padding:14px 26px;border:none;border-radius:6px;cursor:pointer;letter-spacing:.4px;}
.toolbar .modes{display:flex;gap:0;background:#f3f1ec;border-radius:4px;padding:3px;margin-right:4px;}
.toolbar .modes button{background:transparent;color:var(--ink);padding:6px 12px;font-size:11px;border-radius:3px;letter-spacing:.3px;}
.toolbar .modes button.active{background:var(--ink);color:#fff;}
.toolbar .btn-print{background:var(--red);color:#fff;}
.toolbar .btn-save{background:var(--ink);color:#fff;}
.toolbar .btn-mail{background:#0a7d3d;color:#fff;}
.toolbar .btn-close{background:#fff;color:var(--ink);border:1.5px solid var(--ink);}
/* page-break-* hors @media print pour que html2pdf (mode css) les voit */
.items tr,.items thead{page-break-inside:avoid;}
.totals-block,.totals-grid{page-break-inside:avoid;}
.items tbody tr:last-child{page-break-after:avoid;}
@media print{
  html,body{background:#fff;}
  body{padding:0;display:block;}
  .page{box-shadow:none;width:auto;min-height:auto;padding:10mm 12mm;}
  .toolbar{display:none;}
  .editable{border-bottom-color:transparent;}
  @page{size:A4 portrait;margin:0;}
}
</style></head><body>
<div class="toolbar">
  <button class="btn-print" onclick="window.print()">Imprimer</button>
  <button class="btn-save" onclick="savePdf()">Enregistrer</button>
  <button class="btn-mail" onclick="sendByEmail(event)">Envoyer par mail</button>
</div>
<div class="page">
  <div class="page-num">1</div>
  <div class="head">
    <div class="brand">
      <img class="brand-logo" src="img/logo.png" alt="Prodiconseil" onerror="this.style.display='none'">
      <div class="brand-text">
        <div class="brand-line">9 Promenée Jeanne Hachette 94200 Ivry sur Seine - FRANCE</div>
        <div class="brand-line"><b>Contact e-mail :</b> clients@prodi.com</div>
        <div class="brand-line">Tel : 331 4672 0369 - Fax : 331 4959 8731</div>
        <div class="brand-line">SARL au Capital de 516 000 EUR - Siret : 382445922</div>
        <div class="brand-line">NAF 4676Z - TVA FR50 382 445922 RCS CRETEIL</div>
        <div class="brand-line red" style="margin-top:5px;">Marchandise d'origine Union Européenne.</div>
        <div class="brand-line red">En cas de vente à l'exportation, exonération de TVA</div>
        <div class="brand-line red">art 262 TER-I CGI-Conditions Générales applicables.</div>
        <div class="brand-line red">Valable 10 jours sauf vente entre temps</div>
        <div class="brand-line red">La confirmation de commande suivra</div>
      </div>
    </div>
    <div class="client">
      <div class="proforma-title">Liste détaillée</div>
      <div class="client-name" contenteditable="true">${esc(String(clientName).toUpperCase())}</div>
      <div class="client-date">${dateFR}</div>
    </div>
  </div>

  <div id="items-host">
    <div class="mode-detail">${_detailHTML}</div>
    <div class="mode-resume" style="display:none;">
      <table class="items view-resume">
        <colgroup><col style="width:14%"><col><col style="width:14%"><col style="width:10%"><col style="width:12%"><col style="width:16%"></colgroup>
        <thead><tr><th>Code</th><th>Désignation</th><th>Code douanier</th><th style="text-align:right;">Réfs</th><th style="text-align:right;">PN (kg)</th><th style="text-align:right;">Montant HT (€)</th></tr></thead>
        <tbody>
          ${groups.map(g=>`<tr><td class="ref">${esc(g.qualite)}</td><td>${esc(formatProductTitle(g.qualite,g.qualite))}</td><td>${esc(g.hs||'—')}</td><td class="num">${esc(num(g.count))}</td><td class="num">${esc(num(g.poidsKg))}</td><td class="num">${esc(eur(g.montant))}</td></tr>`).join('')}
        </tbody>
      </table>
    </div>
  </div>

  <div class="totals-block">
    <div class="row"><b>MONTANT FOB :</b><span contenteditable="true">${eur(totalMontant)} €</span></div>
    <div class="row"><b>MONTANT DU FRET :</b><span contenteditable="true">${eur(2800)} €</span></div>
    <div class="row"><b>MONTANT COÛT ET FRET :</b><span contenteditable="true">${eur(totalMontant+2800)} €</span></div>
  </div>

  <div class="totals-grid">
    <div><div class="lbl">Total HT</div><div class="val">${eur(totalMontant)} €</div></div>
    <div><div class="lbl">Total TTC</div><div class="val">${eur(totalMontant)} €</div></div>
    <div><div class="lbl">Poids Total</div><div class="val">${dec(totalPoids/1000,3)} T</div></div>
    <div class="net"><div class="lbl">Net à payer</div><div class="val">${eur(totalMontant+2800)} €</div></div>
  </div>

  </div>
<script>
  function _ensureHtml2Pdf(){
    if(window.html2pdf)return Promise.resolve();
    return new Promise((resolve,reject)=>{
      const s=document.createElement('script');
      s.src='https://cdn.jsdelivr.net/npm/html2pdf.js@0.10.1/dist/html2pdf.bundle.min.js';
      s.integrity='sha384-Yv5O+t3uE3hunW8uyrbpPW3iw6/5/Y7HitWJBLgqfMoA36NogMmy+8wWZMpn3HWc';
      s.crossOrigin='anonymous';
      s.onload=()=>resolve();
      s.onerror=()=>reject(new Error('Loader failed'));
      document.head.appendChild(s);
    });
  }
  function _pdfWorker(){
    const el=document.querySelector('.page');
    // Largeur en px du .page (210mm). On capture exactement cette largeur pour éviter qu'html2canvas
    // capte la position relative du .page dans le body (qui peut être décalée si le popup est étroit).
    const _pageW=el.getBoundingClientRect().width;
    return window.html2pdf().set({
      margin:0,
      filename:document.title.replace(/[\\/:*?"<>|]/g,'_')+'.pdf',
      image:{type:'jpeg',quality:0.98},
      html2canvas:{scale:2,useCORS:true,letterRendering:true,backgroundColor:'#ffffff',width:_pageW,windowWidth:_pageW+48,windowHeight:1273,scrollX:0,scrollY:0,x:0,y:0},
      jsPDF:{unit:'mm',format:'a4',orientation:'portrait'},
      pagebreak:{mode:['avoid-all','css','legacy'],avoid:['tr','.totals-block','.totals-grid']}
    }).from(el);
  }
  function _withBtnState(btnSel,fn){
    const btn=document.querySelector(btnSel);
    const orig=btn?btn.textContent:'';
    if(btn){btn.textContent='Génération…';btn.disabled=true;}
    const restore=()=>{if(btn){btn.textContent=orig;btn.disabled=false;}};
    return fn().finally(restore);
  }
  function savePdf(){
    _withBtnState('.btn-save',()=>_ensureHtml2Pdf().then(()=>_pdfWorker().save()))
      .catch(()=>alert('Erreur de génération du PDF'));
  }
  async function sendByEmail(ev){
    if(ev)ev.preventDefault();
    const mailHref=${JSON.stringify(_mailtoUrl)};
    const subject=${JSON.stringify(_mailSubject)};
    const body=${JSON.stringify(_mailLines)};
    const filename=document.title.replace(/[\\/:*?"<>|]/g,'_')+'.pdf';
    function openMail(){
      const a=document.createElement('a');
      a.href=mailHref;a.style.display='none';
      document.body.appendChild(a);a.click();a.remove();
    }
    try{
      await _withBtnState('.btn-mail',async()=>{
        await _ensureHtml2Pdf();
        const blob=await _pdfWorker().outputPdf('blob');
        // Best UX: Web Share API → système share sheet → Mail attache le PDF auto
        if(navigator.canShare){
          const file=new File([blob],filename,{type:'application/pdf'});
          if(navigator.canShare({files:[file]})){
            try{
              await navigator.share({title:subject,text:body,files:[file]});
              return;
            }catch(e){
              if(e&&e.name==='AbortError')return; // user cancelled
              // fall through to fallback
            }
          }
        }
        // En mode iframe (autoGenerate), poste le PDF blob + mailHref au
        // parent qui les affichera dans l'onglet pré-réservé (toolbar +
        // iframe PDF). Évite les restrictions Safari sur les iframes.
        if(${autoGenerate}){
          try{parent.postMessage({type:'proforma-share-fallback',blob,filename,mailHref},'*');return;}catch(_){}
        }
        // Mode popup (legacy : print/save manuel depuis la fenêtre proforma).
        const url=URL.createObjectURL(blob);
        const dl=document.createElement('a');
        dl.href=url;dl.download=filename;dl.style.display='none';
        document.body.appendChild(dl);dl.click();dl.remove();
        setTimeout(()=>URL.revokeObjectURL(url),60000);
        openMail();
      });
    }catch(e){
      // PDF a planté → ouvre quand même le mail + signale au parent
      try{parent.postMessage({type:'proforma-share-error',message:String(e&&e.message||e)},'*');}catch(_){}
      openMail();
    }
  }
  function setMode(m){
    const map={detail:'mode-detail',resume:'mode-resume'};
    document.querySelectorAll('#items-host > div').forEach(el=>el.style.display='none');
    const el=document.querySelector('#items-host .'+map[m]);
    if(el)el.style.display='block';
    document.querySelectorAll('.toolbar .modes button').forEach(b=>b.classList.toggle('active',b.dataset.mode===m));
    try{localStorage.setItem('proforma_mode',m);}catch(_){}
  }
  try{
    const saved=localStorage.getItem('proforma_mode');
    if(saved==='resume')setMode('resume');
    else if(saved&&saved!=='detail')localStorage.removeItem('proforma_mode');
  }catch(_){}
  if(${autoGenerate}){
    (async()=>{
      try{
        // Race: wait for fonts/images mais max 1.2s pour ne pas bloquer si fail
        const _ready=Promise.all([
          (document.fonts&&document.fonts.ready)?document.fonts.ready.catch(()=>{}):Promise.resolve(),
          Promise.all([...document.images].map(i=>i.complete?null:new Promise(r=>{i.onload=i.onerror=r;})))
        ]).catch(()=>{});
        const _maxWait=new Promise(r=>setTimeout(r,1200));
        await Promise.race([_ready,_maxWait]);
        await sendByEmail();
      }catch(_){}
      setTimeout(()=>{try{parent.postMessage('proforma-share-done','*');}catch(_){}},1500);
    })();
  }
</script>
</body></html>`);
  w.document.close();
}
// _showShareModal removed (dead code, no call sites). Used to interpolate
// `${url}` raw into innerHTML — latent XSS if ever revived. If a share modal
// is needed again, build it via DOM APIs (createElement + setAttribute) or
// pass `url` through esc()/safeUrl().

// ── LOAD SHARED QUOTE ──
// Detected synchronously at script load so _doFilter can check it
const _shareParam=new URLSearchParams(window.location.search).get('share');
const _shareCode=new URLSearchParams(window.location.search).get('s');
let _sharedMode=!!_shareParam||!!_shareCode;
let _sharedAll=[];
if(new URLSearchParams(window.location.search).get('p')==='1')togglePriceMode(true);

async function loadSharedQuote(idsOverride){
  const rawIds=idsOverride||_shareParam;
  if(!rawIds)return;
  document.title='Prodiconseil — Sélection produit client';
  const idList=rawIds.split(',').map(Number).filter(Boolean);
  if(!idList.length)return;
  const r=await sbQ('products?id=in.('+idList.join(',')+')'+'&select=*&limit=200&order=gsm.asc');
  if(!r.data||!r.data.length)return;
  const products=r.data;

  // Override the product grid directly — no modal, no banner
  all=products.map(rowToUi);
  _sharedAll=all.slice(); // keep full list for local pagination
  _totalCount=all.length;
  _maxKnownPage=Math.max(1,Math.ceil(all.length/PAGE));
  currentPage=1;

  const totalKg=all.reduce((s,p)=>s+(+p.weight||0),0);
  const rbarRefs=document.getElementById('rbar-refs');
  const rbarTons=document.getElementById('rbar-tons');
  if(rbarRefs)rbarRefs.textContent=all.length.toLocaleString('fr-FR');
  if(rbarTons)rbarTons.textContent=(totalKg/1000).toFixed(1);

  // Show a subtle top label (not a big banner)
  const sqb=document.getElementById('shared-quote-banner');
  if(sqb){
    const _sqTon=(totalKg/1000).toFixed(1);
    const _sqPrix=_priceMode?all.reduce((s,p)=>s+((p.poids_net||0)/1000)*(p.price||0),0):0;
    sqb.innerHTML=`<div class="sq-inner sq-slim"><span class="sq-slim-label">⭐ Sélection exclusive client · ${all.length} produit${all.length>1?'s':''} · ${_sqTon} T${_priceMode&&_sqPrix?' · <strong style="color:var(--red)">'+_sqPrix.toLocaleString('fr-FR',{maximumFractionDigits:0})+' €</strong>':''}</span><div style="display:flex;gap:8px;align-items:center"><button class="sq-btn-devis" onclick="_loadSharedIntoCart()">Demander un devis</button></div></div>`;
    sqb.style.display='block';
  }

  render(all.slice(0,PAGE));
  _updatePager();
  window._sharedProducts=products;
  // Don't auto-load shared products into cart — let client choose
  cart=[];
  localStorage.removeItem('prodi_cart');
  updateCartBadge();
  renderDrawer();

  // Lock shared mode — filters & search work only within the selection
}
function _showSharedQuoteBanner(products){
  const banner=document.getElementById('shared-quote-banner');
  if(!banner)return;
  const totalKg=products.reduce((s,p)=>s+(+p.weight||0),0);
  const totalT=(totalKg/1000).toFixed(1);
  banner.innerHTML=`<div class="sq-inner">
    <div class="sq-left">
      <span class="sq-ico">📋</span>
      <div class="sq-text">
        <strong>Sélection Prodiconseil</strong>
        <span>${products.length} produits · ${totalT} t</span>
      </div>
    </div>
    <div class="sq-actions">
      <button class="sq-btn-view" onclick="_openSharedQuoteModal()">Voir la liste</button>
      <button class="sq-btn-devis" onclick="_loadSharedIntoCart()">${lang==='en'?'Request quote':'Demander un devis'}</button>
    </div>
  </div>`;
  banner.style.display='block';
  window._sharedProducts=products;
}
function _exitSharedMode(){
  // Blocked in shared mode — client cannot access full catalogue
  return;
}
function _loadSharedIntoCart(){
  if(!window._sharedProducts)return;
  cart=window._sharedProducts.map(p=>({...p,poids_net:p.weight}));
  localStorage.setItem('prodi_cart',JSON.stringify(cart));
  updateCartBadge();
  openCartProforma();
}
function _openSharedQuoteModal(){
  const products=window._sharedProducts;if(!products)return;
  const existing=document.getElementById('sq-modal-bg');if(existing)existing.remove();
  const totalKg=products.reduce((s,p)=>s+(+p.weight||0),0);
  const rows=products.map(p=>`<tr style="border-bottom:1px solid #f0f0f0;">
    <td style="padding:8px 4px;font-weight:600;font-size:12px;">${esc(p.quality||p.type||'—')}</td>
    <td style="padding:8px 4px;font-size:12px;color:#555;">${esc(p.color||'—')}</td>
    <td style="padding:8px 4px;font-size:12px;">${p.gsm?esc(p.gsm+' g/m²'):'—'}</td>
    <td style="padding:8px 4px;font-size:12px;">${p.width?esc(mmToCm(p.width)+' cm'):'—'}</td>
    <td style="padding:8px 4px;font-size:12px;font-weight:600;">${p.weight?esc(p.weight+' kg'):'—'}</td>
  </tr>`).join('');
  const d=document.createElement('div');
  d.id='sq-modal-bg';
  d.style.cssText='position:fixed;inset:0;background:rgba(0,0,0,.5);z-index:9000;display:flex;align-items:center;justify-content:center;padding:16px;';
  d.innerHTML=`<div style="background:#fff;border-radius:12px;max-width:700px;width:100%;max-height:85vh;display:flex;flex-direction:column;box-shadow:0 20px 60px rgba(0,0,0,.25);">
    <div style="padding:20px 24px;border-bottom:1px solid #f0f0f0;display:flex;align-items:center;justify-content:space-between;flex-shrink:0;">
      <div>
        <div style="font-family:\'Bebas Neue\',sans-serif;font-size:20px;letter-spacing:2px;">SÉLECTION PRODICONSEIL</div>
        <div style="font-size:11px;color:#999;margin-top:2px;">${products.length} produits · ${(totalKg/1000).toFixed(1)} t</div>
      </div>
      <button onclick="document.getElementById(\'sq-modal-bg\').remove();" style="width:32px;height:32px;border:1.5px solid #e0e0e0;border-radius:50%;background:#fff;cursor:pointer;font-size:14px;">✕</button>
    </div>
    <div style="overflow-y:auto;flex:1;padding:16px 24px;">
      <table style="width:100%;border-collapse:collapse;">
        <thead><tr style="border-bottom:2px solid #222;">
          <th style="text-align:left;padding:6px 4px;font-size:11px;font-weight:700;letter-spacing:.5px;">TYPE</th>
          <th style="text-align:left;padding:6px 4px;font-size:11px;font-weight:700;">COULEUR</th>
          <th style="text-align:left;padding:6px 4px;font-size:11px;font-weight:700;">GSM</th>
          <th style="text-align:left;padding:6px 4px;font-size:11px;font-weight:700;">LAIZE</th>
          <th style="text-align:left;padding:6px 4px;font-size:11px;font-weight:700;">POIDS</th>
          <!-- PRIX_MASQUÉ: <th>PRIX</th> -->
        </tr></thead>
        <tbody>${rows}</tbody>
      </table>
    </div>
    <div style="padding:16px 24px;border-top:1px solid #f0f0f0;display:flex;gap:8px;flex-shrink:0;">
      <button onclick="_loadSharedIntoCart();document.getElementById(\'sq-modal-bg\').remove();" style="flex:1;padding:12px;background:#FE0000;color:#fff;border:none;border-radius:8px;font-family:\'Bebas Neue\',sans-serif;font-size:14px;letter-spacing:1px;cursor:pointer;">📄 DEMANDER UN DEVIS</button>
      <button onclick="document.getElementById(\'sq-modal-bg\').remove();" style="padding:12px 20px;background:transparent;border:1.5px solid #e0e0e0;border-radius:8px;font-size:13px;cursor:pointer;">Fermer</button>
    </div>
  </div>`;
  document.body.appendChild(d);
  d.addEventListener('click',e=>{if(e.target===d)d.remove();});
}

function confirmClearCart(){
  document.getElementById('confirm-bg').classList.add('show');
}
function doClearCart(){
  cart=[];localStorage.removeItem('prodi_cart');
  document.getElementById('confirm-bg').classList.remove('show');
  updateCartBadge();renderDrawer();
  // Reset all "Ajouté" buttons in current view
  document.querySelectorAll('.btn-add-cart.added').forEach(b=>{b.classList.remove('added');});
  document.querySelectorAll('.plist-add.added').forEach(b=>{b.classList.remove('added');b.textContent='+';})
  toast(lang==='en'?'🗑️ Selection cleared':'🗑️ Sélection vidée');
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
    items.innerHTML=`<div class="drawer-empty"><div class="drawer-empty-s">${LT[lang].t_add_from_cat}</div><button class="btn-drawer-browse" onclick="closeCartDrawer()">${LT[lang].t_browse_cat}</button></div>`;
    footer.style.display='none';
    meta.textContent='0 '+(lang==='en'?'product':'produit');
    return;
  }
  const ton=cart.reduce((s,p)=>s+(p.qty_kg??(p.poids_net||0)),0);
  meta.textContent=cart.length+' '+(lang==='en'?'product'+(cart.length>1?'s':''):'produit'+(cart.length>1?'s':''));
  document.getElementById('drawer-total').textContent=fmt(ton);
  const _dic=document.getElementById('drawer-items-count');if(_dic)_dic.textContent=cart.length+' '+(lang==='en'?'product'+(cart.length>1?'s':''):'produit'+(cart.length>1?'s':''));
  const prRow=document.getElementById('drawer-price-row');
  if(prRow){
    if(_priceMode){
      const _totalEst=cart.reduce((s,p)=>{const _f=all.find(x=>x.id===+p.id)||p;return s+((p.qty_kg??(p.poids_net||0))/1000)*(_f.price||0);},0);
      prRow.style.display=_totalEst?'':'none';
      const prVal=document.getElementById('drawer-price-val');
      if(prVal)prVal.textContent=_totalEst.toLocaleString('fr-FR',{maximumFractionDigits:0})+' €';
    } else { prRow.style.display='none'; }
  }
  footer.style.display='block';
  items.innerHTML=cart.map(p=>{
    const qkg=p.qty_kg??(p.poids_net||0);
    const step=Math.max(1,Math.round(p.poids_net||100));
    const _pFull=all.find(x=>x.id===+p.id)||p;
    const _qualite=p.qualite||_pFull.qualite||null;
    const _details=p.details||_pFull.details||null;
    const ciTitle=formatProductTitle(_qualite,p.name);
    const _ciSum=getProductDetailText(_pFull);
    const lot=p.ref?String(p.ref).replace(/^Photo_/i,'').trim()||null:null;
    const imgSrc=p.img||p.image_url||(all.find(x=>x.id===+p.id)?.image_url)||null;
    const _emp=p.emplacement||_pFull.emplacement||null;
    const _zone=p.zone||_pFull.zone||null;
    const _ref=p.ref||_pFull.ref||null;
    const _isSiderunD=(_emp==='OUR WAREHOUSE'&&((_ref&&/FAB/i.test(String(_ref)))||(_details&&/fabrication/i.test(_details))));
    const _isFabD=!_isSiderunD&&((_zone==='FABRICATION SUR COMMANDE'||_emp==='FABRICATION SUR COMMANDE')||(_ref&&/^Photo_FAB/i.test(String(_ref)))||(_details&&/^\s*fabrication\b/i.test(_details))||(_emp&&/FAB|DIRECT USINE/i.test(_emp))||(_zone&&/FABRICATION/i.test(_zone)));
    const _fallback=_isSiderunD?'img/siderun-sur-demande.png':_isFabD?'img/fabrication-sur-demande.png':'img/no-photo.png';
    const imgHtml=imgSrc?`<img src="${safeUrl(imgSrc)}" onerror="this.src='${esc(_fallback)}'">`:`<img src="${esc(_fallback)}" alt="">`;
    return`<div class="ci" id="ci-${numId(p.id)}" onclick="_ciOpenDetail(${numId(p.id)})" style="cursor:pointer">
      <div class="ci-img">${imgHtml}</div>
      <div class="ci-body">
        <div class="ci-row1">
          <span class="ci-laize">${esc(ciTitle)}</span>
          ${p.grammage?`<span class="ci-gsm">${esc(p.grammage+' g/m²')}</span>`:''}
        </div>
        ${_ciSum?`<div class="ci-name">${esc(_ciSum)}</div>`:''}
        <div class="ci-foot">
          <button class="ci-rm" onclick="event.stopPropagation();removeFromCart(${numId(p.id)})" aria-label="${lang==='en'?'Remove':'Retirer'}">${_trashSvg}</button>
          ${lot?`<span class="ci-lot" onclick="event.stopPropagation();navigator.clipboard.writeText(${attrJs(lot)}).then(()=>toast('📋 Réf. copiée'))">${esc(lot)}<svg width="11" height="11" viewBox="0 0 16 16" fill="none"><rect x="5" y="5" width="9" height="9" rx="1.5" stroke="currentColor" stroke-width="1.6"/><path d="M3 11H2a1 1 0 01-1-1V2a1 1 0 011-1h8a1 1 0 011 1v1" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/></svg></span>`:'<span></span>'}
          ${_priceMode&&_pFull.price?`<span class="ci-price" style="color:var(--red);font-weight:700;font-size:13px">${esc(_pFull.price.toLocaleString('fr-FR')+' €/T')}</span>`:''}
          <span class="ci-kgs">${esc(fmt(Math.round(qkg)))}</span>
        </div>
      </div>
      <div class="ci-confirm" id="ci-confirm-${numId(p.id)}" onclick="event.stopPropagation()">
        <span>${lang==='en'?'Remove this item?':'Retirer cet article\u00a0?'}</span>
        <button class="ci-confirm-no" onclick="event.stopPropagation();ciCancelRemove(${numId(p.id)})">${lang==='en'?'Cancel':'Annuler'}</button>
        <button class="ci-confirm-yes" onclick="event.stopPropagation();removeFromCart(${numId(p.id)})">${lang==='en'?'Remove':'Retirer'}</button>
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
  if(subEl)subEl.innerHTML=(lang==='en'?'Group request — ':'Demande groupée — ')+'<span id="pf-cart-count">'+cart.length+'</span> '+(lang==='en'?'product(s)':'produit(s)');
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
    }
    btn.disabled=false;btn.textContent='ENVOYER';
    closeCartProforma();doClearCart();closeCartDrawer();
    try{ emailjs.send(EJS_SVC, EJS_TPL, { from_name:nom, message:`Tél: ${tel}\n${msg}` }); }catch(_){}
    toast('✅ Demande envoyée pour '+savedCart.length+' produit(s) !',4000);
    ['pfc-nom','pfc-tel','pfc-msg'].forEach(id=>{const el=document.getElementById(id);if(el)el.value='';});
  }catch(err){
    btn.disabled=false;btn.textContent='ENVOYER';
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
      if(btn){const r=btn.getBoundingClientRect();panel.style.top=(r.bottom+4)+'px';panel.style.left=r.left+'px';}
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
        _sharedMode=false;
        _doFilter();
      }
    }catch(e){ _sharedMode=false; _doFilter(); }
  } else if(_shareParam){
    loadSharedQuote();
  }
});

function updateFilterVisibility(){
  const bobine=
    document.getElementById('fb-bobine')?.classList.contains('active')||
    !!document.querySelector('.fpill[data-format="Bobine"].active');
  const palette=
    document.getElementById('fb-palette')?.classList.contains('active')||
    !!document.querySelector('.fpill[data-format="Palette"].active');
  // Only Bobine → hide Longueur, show Mandrin
  // Only Palette → hide Mandrin, show Longueur; rename Laize → Largeur
  // Both or neither → show all
  const onlyBobine = bobine && !palette;
  const onlyPalette = palette && !bobine;
  const showLongueur = !onlyBobine;
  const showMandrin  = !onlyPalette;
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
  show('sb-sec-longueur', showLongueur);
  show('sb-sec-mandrin',  showMandrin);
  const sbLbl=document.getElementById('sb-laize-lbl');
  if(sbLbl) sbLbl.firstChild.textContent=laizeLbl+' ';
  // Mobile drawer
  show('mob-sec-longueur', showLongueur);
  show('mob-sec-mandrin',  showMandrin);
  const mobLbl=document.getElementById('mob-laize-title');
  if(mobLbl) mobLbl.textContent=laizeLbl+' (cm)';
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
  document.querySelectorAll('.fpill-stock').forEach(b=>b.classList.toggle('active',_stockFilter.has(b.dataset.stock)));
  document.querySelectorAll('.fpill[data-format]').forEach(b=>b.classList.toggle('active',_formatFilter===b.dataset.format));
  document.querySelectorAll('.fpill-depot').forEach(b=>b.classList.toggle('active',_depotFilter===b.dataset.depot));
  document.querySelectorAll('.fpill-photo').forEach(b=>b.classList.toggle('active',_photoFilter===b.dataset.photo));
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

// ── LANGUAGE TOGGLE ──
let lang=(['fr','en'].includes(localStorage.getItem('prodi_lang'))?localStorage.getItem('prodi_lang'):'fr');
const LT={
  fr:{
    t_live:'Stock en direct',
    t_stock:'Stock Europe', t_update:'Mise à jour quotidienne',
    t_loading:'Chargement 24–48h', t_docs:'Documents sur demande (EUR1, COO…)',
    t_quality:'Recyclé & Fabrication',
    t_refs:'produits',
    t_sort_new:'Plus récents', t_sort_gsm_asc:'Grammage ↑', t_sort_gsm_desc:'Grammage ↓',
    t_container_empty:'SÉLECTION VIDE', t_add_from_cat:'Ajoutez des produits depuis le catalogue',
    t_pf_title:'DEMANDE DE DEVIS', t_cart_pf_title:'DEVIS PANIER',
    t_f_name:'Nom *', t_f_name_err:'Nom requis',
    t_f_company:'Société *', t_f_company_err:'Société requise',
    t_f_email:'Email *', t_f_email_err:'Email invalide',
    t_f_phone:'Téléphone', t_f_qty:'Quantité souhaitée', t_f_msg:'Message',
    t_send:'ENVOYER',
    t_pf_btn:'DEMANDER UN DEVIS', t_clear_cart:'Vider la sélection',
    t_filtres:'FILTRES', t_effacer:'Réinitialiser', t_trier:'Trier :', t_poids_total:'Poids total',
    t_fmt:'Format', t_bobine:'Bobine', t_palette:'Palette',
    t_type_lbl:'Type', t_couleur_lbl:'Couleur', t_couleurs_lbl:'Couleurs', t_mandrin_lbl:'Mandrin', t_gsm_lbl:'Grammage', t_laize_lbl:'Laize', t_longueur_lbl:'Longueur', t_prix_lbl:'Prix',
    t_my_container:'MA SÉLECTION', t_browse_cat:'← Voir le catalogue',
    t_tonnage_total:'TONNAGE TOTAL', t_total_estime:'TOTAL ESTIMÉ', t_depart_usine:'Départ usine HT',
    t_pf_microcopy:'Réponse sous 24h ouvrées · Origine UE · Documents disponibles',
    t_prix_depart:'Prix départ usine', t_poids_lbl:'Poids',
    t_add_ctr:'+ Ajouter', t_added_ctr:'✓ Ajouté', t_demander_devis:'DEMANDER UN DEVIS',
    t_sort_price_asc:'Prix ↑', t_sort_price_desc:'Prix ↓',
    t_no_results:'Aucun résultat', t_no_results_sub:'Essayez d\'élargir vos filtres.',
    t_reset:'↺ Réinitialiser', t_retry:'↺ Réessayer',
    t_err_net:'ERREUR RÉSEAU', t_err_timeout:'Délai dépassé — vérifiez votre connexion.', t_err_server:'Impossible de joindre le serveur.',
    t_err_load:'Impossible de charger les produits.', t_err_title:'ERREUR',
    t_clear_confirm:'Vider la sélection ?', t_clear_confirm_msg:'Cette action est irréversible. Tous les produits sélectionnés seront retirés.',
    t_sur_demande:'Sur demande', t_search_ph:'Kraft 80g, SBS blanc, Testliner...', t_mob_search_ph:'Rechercher un produit...',
    t_produits:'produit(s)', t_sent_ok:'DEMANDE ENVOYÉE', t_sent_sub:'Nous vous répondrons sous 48h',
    t_wa:'WhatsApp', t_mandrins_lbl:'Mandrins',
    t_origine_recycl:'Stocklot', t_origine_fab:'Fabrication',
    t_spec_couleur:'Couleur', t_spec_gsm:'Grammage', t_spec_laize:'Laize', t_spec_longueur:'Longueur', t_spec_mandrin:'Mandrin', t_spec_format:'Condit.', t_spec_depot:'Dépôt',
    t_chip_gram:'Gram.', t_chip_laize:'Laize', t_chip_longueur:'Longueur', t_chip_prix:'Prix', t_chip_recherche:'Recherche',
    t_rechercher:'Rechercher',
    t_add_modal_btn:'+ Ajouter à la sélection', t_added_modal_btn:'✓ Ajouté',
    t_cancel:'Annuler', t_vider:'VIDER',
    t_slow_title:'⏳ Chargement en cours…',
    t_slow_msg:'Le stock met plus de temps à charger que prévu. Vérifiez votre connexion ou contactez-nous directement.',
    t_slow_refresh:'↺ Rafraîchir',
    t_cart_aria:'Produits dans la sélection',
    t_loading_lbl:'Chargement',
    t_pf_qty_ph:'ex: 10 tonnes, 5 bobines…',
    t_pf_msg_ph:'Précisez vos besoins…',
    t_pfc_msg_ph:'Délai, conditionnement…',
    t_cmp_pre:'Comparer', t_cmp_suf:'produits →',
    t_cmp_max3:'Maximum 3 produits à comparer', t_cmp_min2:'Sélectionnez au moins 2 produits',
    t_added_sel:'✅ Ajouté à la sélection !', t_removed_sel:'🗑️ Retiré de la sélection',
    t_added_all:'✅ Tout ajouté', t_removed_all:'🗑️ Tout retiré',
    t_vider_title:'Vider',
    t_browse_type:'Parcourir par type',
    t_ft_tagline:'Négoce papier & carton B2B',
    t_ft_stock:'Stock Europe — Recyclé & Fabrication',
    t_ft_update:'Mise à jour quotidienne du stock',
    t_ft_hours:'Lun – Ven · 9h – 18h',
    t_ft_docs:'EUR1, COO sur demande',
    t_ft_quote:'Devis sous 24h ouvrées',
    t_ft_loading:'Chargement Europe 24–48h',
    t_ft_copy:'© 2026 Prodiconseil · Stock papier & carton B2B',
  },
  en:{
    t_live:'Live stock',
    t_stock:'European stock', t_update:'Daily updates',
    t_loading:'24–48h loading', t_docs:'Docs on request (EUR1, COO…)',
    t_quality:'Virgin & Recycled',
    t_refs:'products',
    t_sort_new:'Most recent', t_sort_gsm_asc:'Grammage ↑', t_sort_gsm_desc:'Grammage ↓',
    t_container_empty:'EMPTY SELECTION', t_add_from_cat:'Add products from the catalogue',
    t_pf_title:'REQUEST A QUOTE', t_cart_pf_title:'CART QUOTE',
    t_f_name:'Name *', t_f_name_err:'Name required',
    t_f_company:'Company *', t_f_company_err:'Company required',
    t_f_email:'Email *', t_f_email_err:'Invalid email',
    t_f_phone:'Phone', t_f_qty:'Desired quantity', t_f_msg:'Message',
    t_send:'SEND',
    t_pf_btn:'REQUEST A QUOTE', t_clear_cart:'Clear selection',
    t_filtres:'FILTERS', t_effacer:'Reset', t_trier:'Sort:', t_poids_total:'Total weight',
    t_fmt:'Format', t_bobine:'Reel', t_palette:'Sheet',
    t_type_lbl:'Type', t_couleur_lbl:'Colour', t_couleurs_lbl:'Colours', t_mandrin_lbl:'Core', t_gsm_lbl:'Grammage', t_laize_lbl:'Width', t_longueur_lbl:'Length', t_prix_lbl:'Price',
    t_my_container:'MA SÉLECTION', t_browse_cat:'← Browse catalogue',
    t_tonnage_total:'TOTAL TONNAGE', t_total_estime:'ESTIMATED TOTAL', t_depart_usine:'Ex-works excl. VAT',
    t_pf_microcopy:'Reply within 24h · EU origin · Documents available',
    t_prix_depart:'Ex-works price', t_poids_lbl:'Weight',
    t_add_ctr:'+ Add', t_added_ctr:'✓ Added', t_demander_devis:'REQUEST A QUOTE',
    t_sort_price_asc:'Price ↑', t_sort_price_desc:'Price ↓',
    t_no_results:'No results', t_no_results_sub:'Try widening your filters.',
    t_reset:'↺ Reset', t_retry:'↺ Retry',
    t_err_net:'NETWORK ERROR', t_err_timeout:'Timeout — check your connection.', t_err_server:'Unable to reach the server.',
    t_err_load:'Unable to load products.', t_err_title:'ERROR',
    t_clear_confirm:'Clear selection?', t_clear_confirm_msg:'This action cannot be undone. All selected products will be removed.',
    t_sur_demande:'On request', t_search_ph:'Kraft 80gsm, White SBS, Testliner...', t_mob_search_ph:'Search a product...',
    t_produits:'product(s)', t_sent_ok:'REQUEST SENT', t_sent_sub:'We will reply within 48h',
    t_wa:'WhatsApp', t_mandrins_lbl:'Cores',
    t_origine_recycl:'Stocklot', t_origine_fab:'Mill',
    t_spec_couleur:'Colour', t_spec_gsm:'Grammage', t_spec_laize:'Width', t_spec_longueur:'Length', t_spec_mandrin:'Core', t_spec_format:'Condit.', t_spec_depot:'Depot',
    t_chip_gram:'GSM', t_chip_laize:'Width', t_chip_longueur:'Length', t_chip_prix:'Price', t_chip_recherche:'Search',
    t_rechercher:'Search',
    t_add_modal_btn:'+ Add to selection', t_added_modal_btn:'✓ Added to selection',
    t_cancel:'Cancel', t_vider:'CLEAR',
    t_slow_title:'⏳ Loading catalogue…',
    t_slow_msg:'The catalogue is taking longer than expected. Check your connection or contact us directly.',
    t_slow_refresh:'↺ Refresh',
    t_cart_aria:'Products in selection',
    t_loading_lbl:'Lead time',
    t_pf_qty_ph:'e.g. 10 tonnes, 5 reels…',
    t_pf_msg_ph:'Describe your needs…',
    t_pfc_msg_ph:'Lead time, packaging…',
    t_cmp_pre:'Compare', t_cmp_suf:'products →',
    t_cmp_max3:'Maximum 3 products to compare', t_cmp_min2:'Select at least 2 products',
    t_added_sel:'✅ Added to selection!', t_removed_sel:'🗑️ Removed from selection',
    t_added_all:'✅ All added', t_removed_all:'🗑️ All removed',
    t_vider_title:'Clear',
    t_ft_tagline:'Paper & board trading B2B',
    t_ft_stock:'European stock — Recycled & Mill',
    t_ft_update:'Daily stock updates',
    t_ft_hours:'Mon – Fri · 9am – 6pm',
    t_ft_docs:'EUR1, COO on request',
    t_ft_quote:'Quote within 24 business hours',
    t_ft_loading:'European loading 24–48h',
    t_ft_copy:'© 2026 Prodiconseil · Paper & board stock B2B',
    t_browse_type:'Browse by type',
  }
};
function setLang(l){
  lang=l;
  localStorage.setItem('prodi_lang',l);
  document.documentElement.lang=l;
  document.documentElement.dataset.lang=l;
  ['fr','en'].forEach(x=>{
    document.getElementById('lang-'+x)?.classList.toggle('on',x===l);
    document.getElementById('lang-'+x+'-m')?.classList.toggle('on',x===l);
  });
  document.querySelectorAll('[data-i18n]').forEach(el=>{
    const k=el.dataset.i18n;
    if(LT[l][k]!==undefined) el.textContent=LT[l][k];
  });
  [document.getElementById('sort-sel'),document.getElementById('sort-select')].forEach(sel=>{
    if(!sel) return;
    sel.querySelectorAll('option[data-i18n-opt]').forEach(opt=>{
      const k=opt.dataset.i18nOpt;
      if(LT[l][k]) opt.textContent=LT[l][k];
    });
  });
  // Update search placeholders
  const sp1=document.getElementById('search-input');
  const sp2=document.getElementById('search-input-mob');
  if(sp1) sp1.placeholder=LT[l].t_search_ph||'';
  if(sp2) sp2.placeholder=LT[l].t_mob_search_ph||'';
  // Update all sort selects (including any additional ones)
  const allSorts=document.querySelectorAll('select[id^="sort"]');
  allSorts.forEach(sel=>{
    sel.querySelectorAll('option[data-i18n-opt]').forEach(opt=>{
      const k=opt.dataset.i18nOpt;
      if(LT[l][k]) opt.textContent=LT[l][k];
    });
  });
  // Update aria-labels on search buttons
  document.querySelectorAll('[aria-label="Rechercher"],[aria-label="Search"]').forEach(el=>{
    el.setAttribute('aria-label',LT[l].t_rechercher||'Rechercher');
  });
  // Generic data-i18n-placeholder
  document.querySelectorAll('[data-i18n-placeholder]').forEach(el=>{
    const k=el.dataset.i18nPlaceholder;
    if(LT[l][k]!==undefined) el.placeholder=LT[l][k];
  });
  // Generic data-i18n-aria
  document.querySelectorAll('[data-i18n-aria]').forEach(el=>{
    const k=el.dataset.i18nAria;
    if(LT[l][k]!==undefined) el.setAttribute('aria-label',LT[l][k]);
  });
  // Generic data-i18n-title
  document.querySelectorAll('[data-i18n-title]').forEach(el=>{
    const k=el.dataset.i18nTitle;
    if(LT[l][k]!==undefined) el.title=LT[l][k];
  });
  // Re-render cards if products already loaded to update dynamic strings
  if(typeof render==='function'&&typeof all!=='undefined'&&all.length)render(all);
  // Re-render drawer to update language-sensitive strings
  if(typeof renderDrawer==='function')renderDrawer();
}

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

