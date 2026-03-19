
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
  return{data:r.ok?d:null,error:r.ok?null:(d||{message:'HTTP '+r.status}),count:cr&&cr.includes('/')?+cr.split('/')[1]:null};
}
const WA='33649754915';
let all=[],cur=null;
const PAGE=52; let currentPage=1,_totalCount=0,_reqToken=0,_lastCorrections=[],_isFirstLoad=true;
const ico=t=>({Kraft:'📦',FBB:'🗂️',SBS:'📋',Testliner:'🧱',Fluting:'〰️',Offset:'🧻',Thermique:'🏷️',Duplex:'📄',Triplex:'📑'}[t]||'📦');
const fmt=kg=>!kg?'—':kg>=1000?(kg/1000).toFixed(1)+' t':kg+' kg';
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
  'Cuisson':           ['RCUI'],
  'Autres':            ['RDIV','SDIV'],
  'Emballage':         ['RPAC','SPAC'],
  'Encre':             ['SINK'],
  'Enveloppes':        ['RENV','SENV'],
  'Journal':           ['RNEW','SNEW'],
  'Kraft':             ['RKRA','RKRABRUN','SKRA'],
  'Kraft armé':        ['RKRR'],
  'Kraft gomme':       ['RKRG'],
  'Liner':             ['RLINER'],
  'Luxe':              ['RLUX','SLUX'],
  'LWC':               ['RLWC','SLWC'],
  'Offset':            ['ROFF','SOFF'],
  'Ouate':             ['RTIS'],
  'Papier affiche':    ['RAFF','SAFF'],
  'Papier cadeau':     ['RKDO'],
  'Plastique':         ['RPLA','SPLA'],
  'Ramette':           ['SCUT'],
  'SBS':               ['SSBS'],
  'Silicone-Glassine': ['RSIL'],
  'Spécial':           ['SSPE'],
  'Thermique':         ['RTHERM'],
};
// ===== FUZZY SEARCH =====
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
const SEARCH_VOCAB=(()=>{
  const v=[];
  for(const[k,codes]of Object.entries(TYPE_MAP))v.push({display:k,norm:_norm(k),codes,kind:'type'});
  for(const c of['Blanc','Brun','Noir','Gris','Ivoire','Vert','Rouge','Bleu','Jaune','Orange','Argent','Couleur','Autres'])v.push({display:c,norm:c.toLowerCase(),kind:'color'});
  for(const f of['Bobine','Palette'])v.push({display:f,norm:f.toLowerCase(),kind:'format'});
  return v;
})();
function fuzzyVocab(tok){
  const exact=SEARCH_VOCAB.find(v=>v.norm===tok);
  if(exact)return{match:exact,dist:0};
  const maxDist=tok.length<=4?1:tok.length<=7?2:3;
  let best=null,bestDist=Infinity;
  for(const v of SEARCH_VOCAB){const d=lev(tok,v.norm);if(d<bestDist){bestDist=d;best=v;}}
  return bestDist<=maxDist?{match:best,dist:bestDist}:null;
}
// =========================

function typesToQualityCodes(selectedTypes){
  const codes=new Set();
  for(const t of selectedTypes)(TYPE_MAP[t]||[]).forEach(c=>codes.add(c));
  return [...codes];
}
const qlabel=q=>q;
const toast=(m,d=3000)=>{const e=document.getElementById('toast');e.textContent=m;e.classList.add('show');setTimeout(()=>e.classList.remove('show'),d);};
const sp=v=>document.getElementById('spinner').classList.toggle('show',v);

// Map DB row (new schema) -> UI object (expected by existing template)
// Nettoie les couleurs bilingues "BLANC / WHITE" → "Blanc"
function simplCouleur(raw){
  if(!raw) return '';
  // Prend uniquement la partie avant le "/"
  const fr = raw.split('/')[0].trim();
  // Capitalise proprement
  return fr.charAt(0).toUpperCase() + fr.slice(1).toLowerCase();
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
  const location = r.location || '';
  const image_url = r.image_url || '';

  // UI expects: name,type,grammage,largeur,poids_net,couleur,qualite,product_photos
  // Split on ' · ' or ' - - ' to get first clean segment, then title-case
  const _detMain=(()=>{
    if(!details) return '';
    const seg=details.split(/\s*[·]\s*|\s+-\s+-\s+/)[0].trim();
    if(!seg) return '';
    return seg.charAt(0).toUpperCase()+seg.slice(1).toLowerCase();
  })();
  const _typeLabel=Object.entries(TYPE_MAP).find(([,v])=>v.includes(quality))?.[0]||'';
  const name=_detMain||[_typeLabel,simplCouleur(color)].filter(Boolean).join(' — ')||(ref&&!ref.startsWith('Photo_')?ref:'Produit');
  const type = quality || 'Produit';

  return {
    ...r,
    fournisseur: r.fournisseur || '',
    origine: r.origine || '',
    format: r.type_produit || r.format || '',
    noyau: r.noyau || '',
    name,
    type,
    grammage: gsm,
    largeur: width,
    longueur: length,
    poids_net: weight,
    couleur: color,
    qualite: quality,
    zone: location,
    // keep a direct image_url for the UI
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
    if(cmpSet.size>=3){toast(lang==='en'?'Maximum 3 products to compare':'Maximum 3 produits à comparer');return;}
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
    const p=all.find(x=>x.id==id);
    return p&&p.image_url?`<img class="cmp-thumb" src="${p.image_url}" title="${p.name}">`:`<div class="cmp-thumb-empty" style="color:#aaa;font-size:10px">${p?.name?.substring(0,6)||'?'}</div>`;
  });
  items.innerHTML=slots.join('');
}
function clearCompare(){
  cmpSet.clear();
  document.querySelectorAll('.btn-cmp-card.cmp-active').forEach(b=>{b.textContent='⊕';b.classList.remove('cmp-active');});
  updateCmpBar();
}
function openCmpModal(){
  const products=[...cmpSet].map(id=>all.find(x=>x.id==id)).filter(Boolean);
  if(products.length<2){toast(lang==='en'?'Select at least 2 products':'Sélectionnez au moins 2 produits');return;}
  const specs=[
    {lbl:'Image',key:'img'},
    {lbl:'Référence',key:'ref'},
    {lbl:'Type',key:'_type'},
    {lbl:'Couleur',key:'couleur'},
    {lbl:'Grammage',key:'grammage',unit:'g/m²'},
    {lbl:'Laize',key:'largeur',unit:'mm'},
    {lbl:'Longueur',key:'longueur',unit:'mm'},
    {lbl:'Mandrin',key:'noyau',unit:'mm'},
    {lbl:'Format',key:'_format'},
    {lbl:'Poids',key:'poids_net',unit:'kg'},
    {lbl:'Prix',key:'price',unit:'€/T'},
  ];
  // header
  let html=`<thead><tr><th>Spec</th>${products.map(p=>`<th><div style="font-size:13px;font-weight:700;color:var(--ink)">${p.name}</div><div style="font-size:11px;color:var(--gray);margin-top:2px">${p.ref&&!p.ref.startsWith('Photo_')?p.ref:''}</div></th>`).join('')}</tr></thead><tbody>`;
  specs.forEach(({lbl,key,unit})=>{
    const vals=products.map(p=>{
      if(key==='img')return p.image_url?`<img src="${p.image_url}" style="max-height:80px;max-width:100px;object-fit:cover;border-radius:4px">`:'—';
      if(key==='_type')return Object.entries(TYPE_MAP).find(([,v])=>v.includes(p.quality))?.[0]||p.quality||'—';
      if(key==='_format')return formatLabel(p)||p.format||'—';
      if(key==='ref')return(p.ref&&!p.ref.startsWith('Photo_'))?p.ref:'—';
      const v=p[key];
      if(v===null||v===undefined||v==='')return'—';
      return unit?v+' '+unit:v;
    });
    // highlight differences
    const unique=new Set(vals.filter(v=>v!=='—'));
    const diff=unique.size>1;
    html+=`<tr><td class="cmp-label">${lbl}</td>${vals.map(v=>`<td class="${diff&&v!=='—'?'cmp-diff':''}">${v}</td>`).join('')}</tr>`;
  });
  // CTA row
  html+=`<tr><td class="cmp-label">Action</td>${products.map(p=>`<td><button class="btn-add-cart" style="width:auto;padding:7px 14px" onclick="addToCart(${p.id})">+ ${lang==='en'?'Add':'Ajouter'}</button></td>`).join('')}</tr>`;
  html+='</tbody>';
  document.getElementById('cmp-table').innerHTML=html;
  document.getElementById('cmp-modal-bg').classList.add('show');
}
function closeCmpModal(){document.getElementById('cmp-modal-bg').classList.remove('show');}

function cardWa(id){
  const p=all.find(x=>x.id==id);
  if(!p)return;
  const msg=`Bonjour, je suis intéressé par : ${p.name}${p.grammage?' '+p.grammage+'g/m²':''}${p.largeur?' '+p.largeur+'mm':''}${p.couleur?' '+p.couleur:''} — ${fmt(p.poids_net)} disponibles. Quel est votre prix ?`;
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
  // Hardcoded filter options — no DB query needed for these
  const typeVals=Object.keys(TYPE_MAP).sort((a,b)=>a.localeCompare(b));
  const couleurVals=['Blanc','Brun','Ivoire','Gris','Noir','Vert','Rouge','Bleu','Jaune','Orange','Argent','Couleur','Autres'];
  buildMsdOptions('msd-type',typeVals,'Tous');
  buildMsdOptions('sb-msd-type',typeVals,'Type',undefined,'msd-type');
  buildMsdOptions('msd-couleur',couleurVals,'Couleurs');
  buildMsdOptions('sb-msd-couleur',couleurVals,'Couleurs',undefined,'msd-couleur');

  buildMsdOptions('msd-mandrin',['70','76','150','152'],'Mandrins',v=>v+' mm');

  // Also build mobile msd panels (msd-type-mob, msd-mandrin-mob, msd-couleur-mob)
  buildMsdOptions('msd-type-mob',typeVals,'Tous');
  buildMsdOptions('msd-couleur-mob',
    ['Blanc','Brun','Ivoire','Gris','Noir','Vert','Rouge','Bleu','Jaune','Orange','Argent','Couleur','Autres'],
    'Couleurs');
  buildMsdOptions('msd-mandrin-mob',['70','76','150','152'],'Mandrins',v=>v+' mm');

  // Set default view based on screen width
  if(window.innerWidth>=768){
    setView('cards');
  }else{
    setView('cards');
  }

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

  // Single query: first page + total count
  await _doFilter();
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
};
const msdLabels = {
  'msd-type': 'Type',
  'msd-mandrin': 'Mandrins',
  'msd-couleur': 'Couleurs',
};

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
  if (!isOpen) { panel.classList.add('show'); btn.classList.add('open'); }
}

function toggleMsdOption(el, id) {
  const val = el.dataset.val;
  const set = msdState[id];
  if (set.has(val)) { set.delete(val); el.classList.remove('selected'); }
  else { set.add(val); el.classList.add('selected'); }
  updateMsdBtn(id);
  filterProducts();
}

function updateMsdBtn(id) {
  const set = msdState[id];
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
      label.textContent = [...set].join(' · ');
    } else {
      label.textContent = [...set].slice(0,2).join(' · ');
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
function toggleFormatPill(btn){
  btn.classList.toggle('active');
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
  panel.querySelectorAll('.msd-option').forEach(o=>o.remove());
  msd._selected = new Set();
  // reset button label
  const lbl = msd.querySelector('.msd-btn-label');
  if(lbl) lbl.textContent = defaultLabel;

  const makeOpt = (val, text) => {
    const opt = document.createElement('div');
    opt.className = 'msd-option';
    opt.setAttribute('data-val', val);
    opt.innerHTML = `<div class="msd-check"><svg width="9" height="7" fill="none" stroke="#fff" stroke-width="2.5"><polyline points="1,4 3.5,6.5 8,1"/></svg></div>${text}`;
    opt.addEventListener('click', ()=>toggleMsdOption(opt, targetId));
    panel.appendChild(opt);
  };

  values.forEach(v=>makeOpt(v, labelFn ? labelFn(v) : v));
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
  // Last token being typed
  const tokens=_norm(raw).split(/[\s,;/]+/).filter(Boolean);
  const last=tokens[tokens.length-1];
  if(!last||last.length<2){hideSuggestions();return;}
  // Top 6 fuzzy matches
  const scored=SEARCH_VOCAB.map(v=>({v,d:lev(last,v.norm)}))
    .filter(x=>x.d<=3)
    .sort((a,b)=>a.d-b.d||a.v.display.localeCompare(b.v.display))
    .slice(0,6);
  if(!scored.length){hideSuggestions();return;}
  const kindLabel={type:'Type',color:'Couleur',format:'Format'};
  box.innerHTML=scored.map(({v,d},i)=>`
    <div class="suggest-item" data-val="${v.display}" data-norm="${v.norm}" onclick="applySuggestion('${v.display}')">
      <span>${v.display}</span>
      <span class="suggest-kind">${kindLabel[v.kind]}</span>
      ${d===0?'<span style="color:var(--gray);font-size:11px;margin-left:auto">✓</span>':''}
    </div>`).join('');
  _sugIdx=-1;
  // Position fixed under input
  const rect=el.getBoundingClientRect();
  box.style.cssText=`position:fixed;top:${rect.bottom+5}px;left:${rect.left}px;min-width:${rect.width+60}px;`;
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

function parseSearchQuery(raw){
  if(!raw)return{text:[],gsm:null,width:null,formats:[],colors:[],qualityCodes:[],corrections:[]};
  const STOP=new Set(['de','du','le','la','les','en','et','un','une','kg','kilo','tonne','tonnes']);
  const CTX_GSM=new Set(['gramme','grammes','grammage','gms','gsm']);
  const CTX_WIDTH=new Set(['laize','largeur','millimetre','millimetres','mm','larg']);
  const CTX_NOYAU=new Set(['noyau','mandrin','noyaux','mandrins']);
  const tokens=_norm(raw).split(/[\s,;/]+/).filter(Boolean);
  const res={text:[],gsm:null,width:null,noyau:null,formats:[],colors:[],qualityCodes:[],corrections:[]};
  let nextIs=null; // context hint for next number: 'gsm'|'width'|'noyau'
  for(const tok of tokens){
    if(STOP.has(tok))continue;
    if(CTX_GSM.has(tok)){nextIs='gsm';continue;}
    if(CTX_WIDTH.has(tok)){nextIs='width';continue;}
    if(CTX_NOYAU.has(tok)){nextIs='noyau';continue;}
    const nm=tok.match(/^(\d+)(g|gsm|gm2|gm|gramme|grammes|gms)?$/);
    if(nm){const n=+nm[1];
      const hasGsmSuffix=!!nm[2];
      if(nextIs==='gsm'||hasGsmSuffix){res.gsm=n;nextIs=null;continue;}
      if(nextIs==='width'){res.width=n;nextIs=null;continue;}
      if(nextIs==='noyau'){res.noyau=n;nextIs=null;continue;}
      // no context → infer from range
      if(n>=20&&n<=800){res.gsm=n;continue;}
      if(n>800&&n<=3500){res.width=n;continue;}
    }
    const mm=tok.match(/^(\d+)mm$/);
    if(mm){res.width=+mm[1];nextIs=null;continue;}
    nextIs=null;
    // Match against vocab (exact first, then fuzzy)
    const fz=fuzzyVocab(tok);
    if(fz){
      if(fz.dist>0)res.corrections.push({from:tok,to:fz.match.display});
      if(fz.match.kind==='type')res.qualityCodes.push(...fz.match.codes);
      else if(fz.match.kind==='format')res.formats.push(fz.match.display);
      else if(fz.match.kind==='color')res.colors.push(fz.match.display);
      continue;
    }
    if(tok.length>=2)res.text.push(tok);
  }
  return res;
}

let _filterTimer=null;
function filterProducts(){
  clearTimeout(_filterTimer);
  _filterTimer=setTimeout(_doFilter,200);
}
async function _doFilter(){
  if(_isFirstLoad){currentPage=1+Math.floor(Math.random()*20);_isFirstLoad=false;}
  else{currentPage=1;}
  _maxKnownPage=1;
  await _fetchAndRender(++_reqToken);
}
async function _fetchAndRender(token){
  const g=document.getElementById('pgrid');
  if(g){
    g.className=viewMode==='rows'?'':'pgrid';
    g.innerHTML=`<div class="skel-row-wrap">${Array(8).fill(0).map((_,i)=>`
  <div class="skel-row">
    <div class="skel-block" style="width:50px;height:20px;border-radius:3px;"></div>
    <div class="skel-block" style="width:70px;height:14px;"></div>
    <div class="skel-block" style="flex:1;height:14px;"></div>
    <div class="skel-block" style="width:40px;height:14px;"></div>
    <div class="skel-block" style="width:40px;height:14px;"></div>
    <div class="skel-block" style="width:60px;height:14px;"></div>
    <div class="skel-block" style="width:30px;height:14px;"></div>
    <div class="skel-block" style="width:80px;height:24px;border-radius:var(--r);"></div>
  </div>`).join('')}</div>`;
  }

  // Build query
  const q=document.getElementById('search-input').value.trim();
  const types=getMsdValues('msd-type');
  const gn=+document.getElementById('f-gmin').value||0;
  const gx=+document.getElementById('f-gmax').value||0;
  const la=0;
  const pn=+document.getElementById('f-pmin').value||0;
  const px=+document.getElementById('f-pmax').value||0;
  const lmin=+document.getElementById('f-lmin').value||0;
  const lmax=+document.getElementById('f-lmax').value||0;
  const longmin=+document.getElementById('f-longmin')?.value||0;
  const longmax=+document.getElementById('f-longmax')?.value||0;
  const longexact=0;
  const refCode=(document.getElementById('f-ref-code')?.value||'').trim().toUpperCase();
  const mandrins=getMsdValues('msd-mandrin');
  const couleurs=getMsdValues('msd-couleur');
  const formats=new Set([...document.querySelectorAll('.fpill.active:not(.fpill-orig)')].map(b=>b.dataset.format));
  const origines=new Set([...document.querySelectorAll('.fpill-orig.active')].map(b=>b.dataset.origine));
  const sortEl=document.getElementById('sort-sel')||document.getElementById('sort-select');
  const s=sortEl?sortEl.value:'date_desc';

  const parsed=parseSearchQuery(q);
  _lastCorrections=parsed.corrections;
  // Merge sidebar type codes + search-detected type codes
  const _sideCodes=types.size>0?typesToQualityCodes(types):[];
  const _pCodes=parsed.qualityCodes.length&&!_sideCodes.length?parsed.qualityCodes:[];
  const typeCodes=[..._sideCodes,..._pCodes];

  // Build RPC params for sum_weight_filtered
  const rpcParams={};
  if(parsed.text.length)rpcParams.q=parsed.text.join(' ').replace(/[%_]/g,'\\$&');
  if(typeCodes.length>0)rpcParams.quality_in=typeCodes;
  const _gsm=parsed.gsm&&!gn&&!gx?parsed.gsm:null;
  const _width=parsed.width&&!la&&!lmin&&!lmax?parsed.width:null;
  const _pformats=parsed.formats.length&&!formats.size?parsed.formats:[];
  const _pcolors=parsed.colors.length&&!couleurs.size?parsed.colors:[];
  if(gn)rpcParams.gsm_min=gn; if(gx)rpcParams.gsm_max=gx;
  if(_gsm){rpcParams.gsm_min=_gsm;rpcParams.gsm_max=_gsm;}
  if(lmin)rpcParams.width_min=lmin; if(lmax)rpcParams.width_max=lmax;
  if(_width){rpcParams.width_min=_width;rpcParams.width_max=_width;}
  const _pNoyau=parsed.noyau&&!mandrins.size?String(parsed.noyau):null;
  if(mandrins.size>0)rpcParams.noyau_in=[...mandrins];
  else if(_pNoyau)rpcParams.noyau_in=[_pNoyau];
  const _allColors=[...couleurs,..._pcolors];
  if(_allColors.length)rpcParams.color_in=_allColors;
  const _allFormats=[...formats,..._pformats];
  if(_allFormats.length)rpcParams.format_in=_allFormats;
  if(origines.size===1)rpcParams.origine_prefix=[...origines][0];
  if(pn)rpcParams.price_min=pn;
  if(px)rpcParams.price_max=px;

  // Build URL params (replaces SDK query builder)
  const p=new URLSearchParams();
  p.set('select','id,ref,quality,color,gsm,width,noyau,format,origine,details,weight_kg,price,photo_url,created_at');
  parsed.text.forEach(term=>{const s=term.replace(/[%_]/g,'\\$&');p.append('or',`(quality.ilike.%${s}%,color.ilike.%${s}%,details.ilike.%${s}%,ref.ilike.%${s}%)`);});
  if(typeCodes.length>0)p.append('quality',`in.(${typeCodes.join(',')})`);
  if(gn)p.append('gsm',`gte.${gn}`);
  if(gx)p.append('gsm',`lte.${gx}`);
  if(_gsm)p.append('gsm',`eq.${_gsm}`);
  if(lmin)p.append('width',`gte.${lmin}`);
  if(lmax)p.append('width',`lte.${lmax}`);
  if(la&&!lmin&&!lmax)p.append('width',`eq.${la}`);
  if(_width)p.append('width',`eq.${_width}`);
  if(mandrins.size>0)p.append('noyau',`in.(${[...mandrins].join(',')})`);
  else if(_pNoyau)p.append('noyau',`eq.${_pNoyau}`);
  if(_allColors.length)p.append('or',`(${_allColors.map(c=>`color.ilike.%${c}%`).join(',')})`);
  if(_allFormats.length)p.append('format',`in.(${_allFormats.join(',')})`);
  if(origines.size===1)p.append('quality',`like.${[...origines][0]}%`);
  if(longmin)p.append('longueur',`gte.${longmin}`);
  if(longmax)p.append('longueur',`lte.${longmax}`);
  if(longexact&&!longmin&&!longmax)p.append('longueur',`eq.${longexact}`);
  if(refCode)p.append('quality',`ilike.${refCode}%`);
  if(pn)p.append('price',`gte.${pn}`);
  if(px)p.append('price',`lte.${px}`);
  if(s==='gsm_asc'||s==='grammage_asc')p.set('order','gsm.asc.nullslast');
  else if(s==='gsm_desc'||s==='grammage_desc')p.set('order','gsm.desc.nullslast');
  else if(s==='price_asc'||s==='prix_asc')p.set('order','price.asc.nullslast');
  else if(s==='price_desc'||s==='prix_desc')p.set('order','price.desc.nullslast');
  else p.set('order','id.desc');
  const offset=(currentPage-1)*PAGE;

  const ctrl=new AbortController();
  const _to=setTimeout(()=>ctrl.abort(),15000);
  let data,error,_exactCount=null,_totalWeightKg=0;
  try{
    const [mainRes,wRes]=await Promise.all([
      sbQ('products?'+p,{headers:{'Prefer':'count=estimated','Range':offset+'-'+(offset+PAGE-1)},signal:ctrl.signal}),
      sbQ('rpc/sum_weight_filtered',{method:'POST',body:rpcParams})
    ]);
    ({data,error,count:_exactCount}=mainRes);
    _totalWeightKg=wRes.data||0;
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
    if(g)g.innerHTML=`<div class="empty" style="grid-column:1/-1"><div class="empty-lbl">${LT[lang].t_err_title}</div><div class="empty-sub">${error.message||LT[lang].t_err_load}</div><button class="btn-empty-reset" onclick="_doFilter()">${LT[lang].t_retry}</button></div>`;
    return;
  }

  all=(data||[]).map(rowToUi);
  // Shuffle on default sort (landing page) to show variety
  if(s==='date_desc'||s==='date'){for(let i=all.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[all[i],all[j]]=[all[j],all[i]];}}
  _totalCount=(_exactCount!=null)?_exactCount:all.length+(currentPage-1)*PAGE;
  _maxKnownPage=Math.ceil(_totalCount/PAGE)||1;
  // Update stats bar with real total
  const _st=document.getElementById('s-ton');if(_st&&_totalCount)_st.textContent=_totalCount.toLocaleString('fr-FR')+' réf.';
  // Update results bar
  const rbarRefs=document.getElementById('rbar-refs');
  const rbarTons=document.getElementById('rbar-tons');
  if(rbarRefs)rbarRefs.textContent=_totalCount.toLocaleString('fr-FR');
  if(rbarTons)rbarTons.textContent=(_totalWeightKg/1000).toFixed(1);
  const cn=document.getElementById('correction-note');
  if(cn)cn.innerHTML=_lastCorrections.length?` <span class="correction-note">· correction : ${_lastCorrections.map(c=>`<b>${c.from}</b> → ${c.to}`).join(', ')}</span>`:'';
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
  _updatePager();
}
let _maxKnownPage=1;
function _updatePager(){
  const isLast=all.length<PAGE;
  if(!isLast&&currentPage>=_maxKnownPage)_maxKnownPage=currentPage+1;
  else if(isLast)_maxKnownPage=Math.max(_maxKnownPage,currentPage);
  let pager=document.getElementById('pager');
  if(!pager){
    pager=document.createElement('div');
    pager.id='pager';pager.className='pager';
    const grid=document.getElementById('pgrid');
    if(grid)grid.parentElement.appendChild(pager);
  }
  if(currentPage===1&&isLast){pager.innerHTML='';return;}
  const last=_maxKnownPage;
  // Build page number list with ellipsis
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
  pager.innerHTML=`
    <button class="parrow" ${currentPage<=1?'disabled':''} onclick="_goToPage(${currentPage-1})">‹</button>
    ${pagesHtml}
    <button class="parrow" ${isLast?'disabled':''} onclick="_goToPage(${currentPage+1})">›</button>`;
}
function _goToPage(p){
  if(p<1||p===currentPage)return;
  currentPage=p;
  _fetchAndRender(_reqToken);
  window.scrollTo({top:0,behavior:'smooth'});
}

function updateFilterChips(){
  const container=document.getElementById('filter-chips');
  const chips=[];
  const q=document.getElementById('search-input').value;
  const gn=document.getElementById('f-gmin').value;
  const gx=document.getElementById('f-gmax').value;
  const la='';
  const lmin2=document.getElementById('f-lmin')?.value||'';
  const lmax2=document.getElementById('f-lmax')?.value||'';
  if(q)chips.push({label:LT[lang].t_chip_recherche+' : "'+q+'"',clear:()=>{document.getElementById('search-input').value='';document.getElementById('search-input-mob').value='';filterProducts();}});
  // Add format pills chip
  const _activeFmts=Array.from(document.querySelectorAll('.fpill.active:not(.fpill-orig)')).map(b=>b.dataset.format);
  const _activeOrigs=Array.from(document.querySelectorAll('.fpill-orig.active')).map(b=>b.dataset.origine==='R'?LT[lang].t_origine_recycl:LT[lang].t_origine_fab);
  if(_activeOrigs.length>0)chips.push({label:(lang==='en'?'Origin':'Origine')+' : '+_activeOrigs.join(', '),clear:()=>{document.querySelectorAll('.fpill-orig.active').forEach(b=>b.classList.remove('active'));filterProducts();}});
  if(_activeFmts.length>0)chips.push({label:LT[lang].t_fmt+' : '+_activeFmts.map(f=>f==='Bobine'?LT[lang].t_bobine:f==='Palette'?LT[lang].t_palette:f).join(', '),clear:()=>{document.querySelectorAll('.fpill.active').forEach(b=>b.classList.remove('active'));filterProducts();}});
  ['msd-type','msd-mandrin','msd-couleur'].forEach(id=>{
    const set=msdState[id];
    if(set.size>0){
      const lbl={'msd-type':LT[lang].t_type_lbl,'msd-mandrin':LT[lang].t_mandrin_lbl,'msd-couleur':LT[lang].t_couleur_lbl}[id];
      chips.push({label:lbl+' : '+[...set].join(', '),clear:()=>{resetMsd(id);filterProducts();}});
    }
  });
  if(gn||gx)chips.push({label:LT[lang].t_chip_gram+' : '+(gn||'—')+' → '+(gx||'—')+' g/m²',clear:()=>{document.getElementById('f-gmin').value='';document.getElementById('f-gmax').value='';filterProducts();}});
  if(la)chips.push({label:LT[lang].t_chip_laize+' : '+la+'mm',clear:()=>{const el=document.getElementById('f-largeur');if(el)el.value='';filterProducts();}});
  if(lmin2||lmax2)chips.push({label:LT[lang].t_chip_laize+' : '+(lmin2||'—')+' → '+(lmax2||'—')+' mm',clear:()=>{['f-lmin','f-lmax','f-lmin-mob','f-lmax-mob'].forEach(id=>{const e=document.getElementById(id);if(e)e.value='';});filterProducts();}});
  const longmin2=document.getElementById('f-longmin')?.value||'';
  const longmax2=document.getElementById('f-longmax')?.value||'';
  if(longmin2||longmax2)chips.push({label:LT[lang].t_chip_longueur+' : '+(longmin2||longmax2)+'mm',clear:()=>{['f-longmin','f-longmax','f-longmin-mob','f-longmax-mob'].forEach(id=>{const e=document.getElementById(id);if(e)e.value='';});filterProducts();}});
  const cpn=document.getElementById('f-pmin').value,cpx=document.getElementById('f-pmax').value;
  if(cpn||cpx)chips.push({label:LT[lang].t_chip_prix+' : '+(cpn||'—')+' → '+(cpx||'—')+' €/T',clear:()=>{document.getElementById('f-pmin').value='';document.getElementById('f-pmax').value='';filterProducts();}});
  if(!chips.length){container.innerHTML='';const ac2=document.getElementById('active-chips');if(ac2)ac2.innerHTML='';return;}
  const chipsHtml=chips.map((chip,i)=>`<div class="fchip" id="chip-${i}">${chip.label}<button onclick="clearChip(${i})" title="Retirer ce filtre">✕</button></div>`).join('')
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
let viewMode='cards'; // 'rows' or 'cards'

function setView(mode){
  viewMode=mode;
  document.getElementById('view-rows-btn').classList.toggle('active',mode==='rows');
  document.getElementById('view-cards-btn').classList.toggle('active',mode==='cards');
  if(all.length)render(all);
}

// Decode quality codes like RKRA, SSBS, SPAC → {cls, txt}
function decodeQuality(raw){
  if(!raw)return{cls:'qb-other',txt:'?'};
  const isR=raw.charAt(0)==='R';
  const suf=raw.slice(1).toUpperCase();
  const labels={'KRA':'Kraft','KRABRUN':'Kraft Brun','KRG':'Kraft Gris','KRR':'Kraft Rec.',
    'SBS':'SBS','LWC':'LWC','OFF':'Offset','1SC':'1C','2SC':'2C',
    'BON':'Premium','LINER':'Liner','ADH':'Adhésif','THERM':'Therm.',
    'ENV':'Env.','TIS':'Tissue','LUX':'Luxe','PAC':'Packaging',
    'BOU':'Boucher.','DIV':'Divers','AFF':'Affiche','CAR':'Carton',
    'COL':'Collé','CUI':'Couché','FLEX':'Flex','KDO':'Kraft Dbl',
    'NEW':'Nouveauté','PLA':'Plastique','SIL':'Siliconé','BOA':'Bobine',
    'SPE':'Spécial','INK':'Inkjet','CUT':'Coupé','SC':'SC'};
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
    const dims=[p.largeur,p.longueur].filter(Boolean).join('×');
    return `Palette ${dims}`;
  }
  return p.format;
}

function renderRows(list){
  const g=document.getElementById('pgrid');
  if(!g)return;
  function qbadgeClass(type){return decodeQuality(type).cls;}
  const rows=list.map(p=>{
    const bclass=qbadgeClass(p.type);
    const prixHtml=p.price
      ?`<div class="prow-prix">${p.price.toLocaleString('fr-FR')} €/T</div>`
      :`<div class="prow-ask">${LT[lang].t_sur_demande}</div>`;
    const poids=p.poids_net?`${(p.poids_net/1000).toFixed(1)} T`:'—';
    const gsm=p.grammage?`${p.grammage}`:'—';
    const larg=p.largeur?`${p.largeur}`:'—';
    const mand=p.noyau?`Ø${p.noyau}`:'—';
    const fmt2=formatLabel(p)||'—';
    const {txt:btext}=decodeQuality(p.type);
    return`<tr class="prow" onclick="openDetail(${p.id})">
      <td><span class="prow-badge ${bclass}">${btext}</span></td>
      <td><span class="prow-ref">${p.ref||'—'}</span></td>
      <td><div class="prow-name">${p.name||p.type||'—'}</div>${p.couleur?`<div class="prow-sub">${p.couleur}</div>`:''}</td>
      <td class="prow-num">${gsm}</td>
      <td class="prow-num">${larg}</td>
      <td class="prow-num">${mand}</td>
      <td><span class="prow-zone">${fmt2}</span></td>
      <td class="prow-num">${poids}</td>
      <td>${prixHtml}</td>
      <td><button class="prow-add" id="radd-${p.id}" onclick="event.stopPropagation();addToCart(${p.id})" title="Ajouter">+</button></td>
    </tr>`;
  }).join('');
  g.innerHTML=`<table class="ptable">
    <thead class="ptable-head">
      <tr>
        <th>Référence</th>
        <th class="col-ref">Réf.</th>
        <th>Nom / Détails</th>
        <th class="col-gsm">Gsm</th>
        <th class="col-larg">Larg.</th>
        <th class="col-mand">Mandrin</th>
        <th class="col-fmt">Format</th>
        <th class="col-poids">Poids</th>
        <th class="col-prix">Prix</th>
        <th class="col-cta"></th>
      </tr>
    </thead>
    <tbody>${rows}</tbody>
  </table>`;
}

function renderCards(list){
  const g=document.getElementById('pgrid');
  if(!g)return;
  g.className='pgrid';
  g.innerHTML=list.map(p=>{
    const initials=(p.type||'?').substring(0,2).toUpperCase();
    const imgHtml=p.image_url
      ?`<img src="${p.image_url}" alt="${p.name||''}" loading="lazy" onerror="this.parentElement.innerHTML='<div class=\\'pcard-placeholder\\'><svg width=\\'40\\' height=\\'40\\' viewBox=\\'0 0 24 24\\' fill=\\'none\\' stroke=\\'%23ccc\\' stroke-width=\\'1.5\\'><rect x=\\'3\\' y=\\'3\\' width=\\'18\\' height=\\'18\\' rx=\\'2\\'/><circle cx=\\'8.5\\' cy=\\'8.5\\' r=\\'1.5\\'/><polyline points=\\'21,15 16,10 5,21\\'/></svg><span class=\\'pcard-initials\\'>${initials}</span></div>'">`
      :`<div class="pcard-placeholder"><svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#ccc" stroke-width="1.5"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21,15 16,10 5,21"/></svg><span class="pcard-initials">${initials}</span></div>`;
    const {cls:badgeCls,txt:badgeTxt}=decodeQuality(p.type);
    const originTxt=(p.type||'').charAt(0)==='R'?LT[lang].t_origine_recycl:LT[lang].t_origine_fab;
    const originCls=(p.type||'').charAt(0)==='R'?'qb-recyc':'qb-other';
    const isPalette=p.format&&p.format.toLowerCase().includes('palette');
    const dimTag=!isPalette&&p.largeur?`${p.largeur} mm`:'';
    const tags=[
      p.grammage?`<span class="tag tag-gsm">${p.grammage} g/m²</span>`:'',
      dimTag?`<span class="tag">${dimTag}</span>`:'',
      p.noyau?`<span class="tag">Ø${p.noyau} mm</span>`:'',
      formatLabel(p)?`<span class="tag">${formatLabel(p)}</span>`:'',
      p.couleur?`<span class="tag">${p.couleur}</span>`:'',
    ].join('');
    const poids=p.poids_net?`${(p.poids_net/1000).toFixed(2)}`:'—';
    const prixHtml=p.price
      ?`<div class="pcard-price">${p.price.toLocaleString('fr-FR')} €/T</div>`
      :`<div class="pcard-price-ask">${LT[lang].t_sur_demande}</div>`;
    return`<div class="pcard" onclick="openDetail(${p.id})">
      <div class="pcard-img">${imgHtml}</div>
      <div class="pcard-stripe"></div>
      <div class="pcard-body">
        <div class="pcard-ref">${p.ref||'—'}</div>
        <div class="pcard-name">${p.name||p.type||'—'}</div>
        <div class="tags">${tags}</div>
        <div class="pcard-bottom">
          <button class="btn-add-cart" id="cadd-${p.id}" onclick="event.stopPropagation();addToCart(${p.id})"><span class="cart-icon">+</span><span class="cart-check">✓</span> ${lang==='en'?'Add':'Ajouter'}</button>
          <div class="pcard-foot">
            <div><div class="pton">${poids}<span class="pton-s"> T</span></div></div>
            ${prixHtml}
          </div>
        </div>
      </div>
    </div>`;
  }).join('');
}

function render(list){
  const g=document.getElementById('pgrid');
  if(!g)return;
  if(!list||list.length===0){
    g.className='pgrid';
    g.innerHTML=`<div class="empty" style="grid-column:1/-1">
      <div class="empty-svg">
        <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>
      </div>
      <div class="empty-lbl">${LT[lang].t_no_results}</div>
      <div class="empty-sub">${LT[lang].t_no_results_sub}</div>
      <button class="btn-empty-reset" onclick="resetFilters()">${LT[lang].t_reset}</button>
    </div>`;
    return;
  }
  if(viewMode==='rows'){g.className='';renderRows(list);}
  else{renderCards(list);}
}

// Legacy render_old kept for reference (not called anymore)
function _render_legacy(list){
  const g=document.getElementById('pgrid');
  // Count display uses _totalCount from server (or list.length for empty state)
  const displayCount=_totalCount||list.length;
  const _pc=document.getElementById('prod-count');if(_pc)_pc.textContent=displayCount.toLocaleString('fr-FR')+' PRODUIT'+(displayCount!==1?'S':'');
  const _tc=document.getElementById('pcount-tons');if(_tc)_tc.textContent='';
  if(!list.length){g.innerHTML=`<div class="empty">
    <svg class="empty-svg" width="72" height="72" viewBox="0 0 72 72" fill="none" xmlns="http://www.w3.org/2000/svg">
      <circle cx="30" cy="30" r="20" stroke="#C8C8C8" stroke-width="3" fill="none"/>
      <line x1="45" y1="45" x2="62" y2="62" stroke="#C8C8C8" stroke-width="3" stroke-linecap="round"/>
      <line x1="22" y1="30" x2="38" y2="30" stroke="#C8C8C8" stroke-width="2" stroke-linecap="round"/>
      <line x1="30" y1="22" x2="30" y2="38" stroke="#C8C8C8" stroke-width="2" stroke-linecap="round"/>
    </svg>
    <div class="empty-lbl">AUCUN RÉSULTAT</div>
    <div class="empty-sub">Aucun produit ne correspond à vos critères de recherche.</div>
    <button class="btn-empty-reset" onclick="resetFilters()">↺ Réinitialiser les filtres</button>
  </div>`;return;}
  g.innerHTML=list.map(p=>{
    const imgHtml = p.image_url
      ? `<img src="${p.image_url}" alt="${p.name}" loading="lazy">`
      : placeholderSvg(p.type);
    return`<div class="pcard" onclick="openDetail('${p.id}')">
      <div class="pcard-img">${imgHtml}</div>
      <div class="pcard-stripe"></div>
      <div class="pcard-body">
        <div class="pcard-ref">${p.ref&&!p.ref.startsWith('Photo_')?p.ref:''}</div>
        <div class="pcard-name">${p.name}</div>
        <div class="tags">
          ${p.grammage?`<span class="tag tag-gsm">${p.grammage} g/m²</span>`:''}
          ${(!p.format?.toLowerCase().includes('palette')&&p.largeur)?`<span class="tag">${p.largeur} mm</span>`:''}
          ${formatLabel(p)?`<span class="tag">${formatLabel(p)}</span>`:''}
          ${p.couleur?`<span class="tag">${p.couleur}</span>`:''}
        </div>
        <div class="pcard-bottom">
          <button class="btn-add-cart" onclick="event.stopPropagation();addToCart('${p.id}')"><span class="cart-icon">+</span><span class="cart-check">✓</span> ${lang==='en'?'Add':'Ajouter'}</button>
          <div class="pcard-foot">
            <div><div class="pton">${fmt(p.poids_net)}</div></div>
            ${p.price?`<div class="pcard-price">${p.price} €/T</div>`:`<div class="pcard-price-ask">${LT[lang].t_sur_demande}</div>`}
          </div>
        </div>
      </div>
    </div>`;
  }).join('');
}

async function openDetail(id){
  // eslint-disable-next-line eqeqeq
  const p = all.find(x=>x.id==id); if(!p) return;
  cur = p;

  // Image
  const mi=document.getElementById('det-main');
  mi.innerHTML=p.image_url
    ?`<img src="${p.image_url}" loading="lazy" alt="${p.name}">`
    :`<div style="display:flex;flex-direction:column;align-items:center;gap:12px;opacity:.3">${placeholderSvg(p.type)}</div>`;

  // Badge qualité

  // Ref + nom
  document.getElementById('det-ref').textContent=(p.ref&&!String(p.ref).startsWith('Photo_'))?p.ref:'';
  document.getElementById('det-name').textContent=p.name||p.qualite||'Produit';

  // Specs grid
  const specDefs=[
    {lbl: LT[lang].t_spec_couleur||'Couleur',   val: p.couleur},
    {lbl: LT[lang].t_spec_gsm||'Grammage',      val: p.grammage?p.grammage+' g/m²':null},
    {lbl: LT[lang].t_spec_laize||'Laize',       val: p.largeur?p.largeur+' mm':null},
    {lbl: LT[lang].t_spec_longueur||'Longueur', val: p.format==='Palette'&&p.longueur?p.longueur+' mm':null},
    {lbl: LT[lang].t_spec_mandrin||'Mandrin',   val: p.noyau?p.noyau+' mm':null},
    {lbl: LT[lang].t_spec_format||'Format',     val: formatLabel(p)},
    {lbl: LT[lang].t_spec_depot||'Dépôt',       val: p.zone||p.emplacement},
  ].filter(s=>s.val);
  document.getElementById('det-specs').innerHTML=specDefs.map(s=>
    `<div class="dspec-item"><div class="dspec-lbl">${s.lbl}</div><div class="dspec-val">${s.val}</div></div>`
  ).join('');

  // Détails texte
  const dd=document.getElementById('det-details');
  if(p.details&&p.details.trim()){dd.textContent=p.details;dd.style.display='block';}
  else{dd.style.display='none';}

  // Prix + Poids
  document.getElementById('det-price-val').innerHTML=p.price
    ?`<span style="font-family:'Bebas Neue',sans-serif;font-size:26px;color:var(--red)">${p.price} €/T</span>`
    :`<span style="font-size:12px;color:#aaa;font-style:italic;">${LT[lang].t_sur_demande}</span>`;
  document.getElementById('det-poids-val').textContent=p.poids_net?fmt(p.poids_net):'—';

  document.getElementById('detail-bg').classList.add('show');
  document.body.style.overflow='hidden';
}
function closeDetail(){document.getElementById('detail-bg').classList.remove('show');document.body.style.overflow='';}
function swImg(el,url){document.getElementById('det-main').innerHTML=`<img src="${url}">`;document.querySelectorAll('.dthumb').forEach(t=>t.classList.remove('active'));el.classList.add('active');}
function openProforma(){if(!cur)return;document.getElementById('pf-prod-name').textContent=cur.name+(cur.ref?' — '+cur.ref:'');document.getElementById('proforma-bg').classList.add('show');}
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
  const nom=document.getElementById('pf-nom').value.trim();
  const soc=document.getElementById('pf-societe').value.trim();
  const email=document.getElementById('pf-email').value.trim();
  let ok=true;
  validateField('fg-pf-nom',!!nom,'Nom requis'); if(!nom)ok=false;
  validateField('fg-pf-societe',!!soc,'Société requise'); if(!soc)ok=false;
  validateField('fg-pf-email',emailRx.test(email),'Email invalide'); if(!emailRx.test(email))ok=false;
  if(!ok)return;
  const btn=document.getElementById('pf-btn');btn.disabled=true;btn.textContent=lang==='en'?'SENDING...':'ENVOI...';
  try{
    await sbQ('proforma_requests',{method:'POST',body:{product_id:cur?.id,nom,societe:soc,email,telephone:document.getElementById('pf-tel').value,quantite_souhaitee:document.getElementById('pf-qty').value,message:document.getElementById('pf-msg').value,statut:'nouveau'},headers:{'Prefer':'return=minimal'}}).catch(()=>{});
    // Show success screen inside the pf-box
    const box=document.querySelector('#proforma-bg .pf-box');
    if(box)box.innerHTML=`<div class="pf-success"><div class="pf-success-ico">✅</div><div class="pf-success-t">${LT[lang].t_sent_ok}</div><div class="pf-success-s">${lang==='en'?'We will reply within 48h at':'Nous vous répondrons sous 48h à'} <strong>${email}</strong></div><button class="btn-pf-close" onclick="closeProforma();document.querySelector('#proforma-bg .pf-box').innerHTML=''">${lang==='en'?'Close':'Fermer'}</button></div>`;
    toast(lang==='en'?'✅ Request sent — reply within 48h':'✅ Demande envoyée — réponse sous 48h');
    try{ emailjs.send(EJS_SVC, EJS_TPL, { from_name:nom, company:soc, reply_to:email, message:`Proforma produit\nProduit: ${cur?.name||''}${cur?.ref?' ('+cur.ref+')':''}\nQté: ${document.getElementById('pf-qty').value}\nTél: ${document.getElementById('pf-tel').value}\nMsg: ${document.getElementById('pf-msg').value}` }); }catch(_){}
    ['pf-nom','pf-societe','pf-email','pf-tel','pf-qty','pf-msg'].forEach(id=>{const el=document.getElementById(id);if(el)el.value='';});
  }catch(err){
    btn.disabled=false;btn.textContent=LT[lang].t_send||'ENVOYER';
    toast(lang==='en'?'❌ Send error — please retry':'❌ Erreur envoi — réessayez dans un instant');
    console.error('sendProforma error:',err);
  }
}
function contactWA(){
  if(!cur)return;
  window.open(`https://wa.me/${WA}?text=${encodeURIComponent(`Bonjour, intéressé par : ${cur.name}${cur.ref?' ('+cur.ref+')':''} — ${fmt(cur.poids_net)} disponibles. Quel est votre prix ?`)}`, '_blank');
}
function resetFilters(){
  document.querySelectorAll('.msd-option.selected').forEach(o=>o.classList.remove('selected'));
  ['msd-type','msd-mandrin','msd-couleur'].forEach(id=>resetMsd(id));
  document.querySelectorAll('.fpill.active').forEach(b=>b.classList.remove('active'));
  document.querySelectorAll('.fpill-orig.active').forEach(b=>b.classList.remove('active'));
  ['fb-bobine','fb-palette','fb-recyc','fb-fab'].forEach(id=>{const el=document.getElementById(id);if(el)el.classList.remove('active');});
  ['f-pmin','f-pmax','f-lmin','f-lmax'].forEach(id=>{const el=document.getElementById(id);if(el)el.value='';});
  ['f-gmin','f-gmax','f-lmin-sb','f-lmax-sb','f-longmin-sb','f-longmax-sb','f-longmin','f-longmax','f-ref-code'].forEach(id=>{const el=document.getElementById(id);if(el)el.value='';});
  ['f-gmin-sb','f-gmax-sb','f-pmin-sb','f-pmax-sb'].forEach(id=>{const el=document.getElementById(id);if(el)el.value='';});
  ['search-input','search-input-mob'].forEach(id=>{const el=document.getElementById(id);if(el)el.value='';});
  // Reset mobile drawer inputs too
  ['f-gmin-mob','f-gmax-mob','f-lmin-mob','f-lmax-mob','f-pmin-mob','f-pmax-mob'].forEach(id=>{const el=document.getElementById(id);if(el)el.value='';});
  updateFilterChips();
  const ac=document.getElementById('active-chips');if(ac)ac.innerHTML='';
  const rr=document.getElementById('rbar-reset');if(rr)rr.style.display='none';
  currentPage=1;_doFilter();
}
function toggleMobFilters(){
  const panel=document.getElementById('filters-panel');
  const arrow=document.getElementById('mob-filter-arrow');
  panel.classList.toggle('open');
  arrow.textContent=panel.classList.contains('open')?'▴':'▾';
}

// ── PANIER (DRAWER) ──
let cart=JSON.parse(localStorage.getItem('prodi_cart')||'[]');

function updateCartBadge(){
  const badge=document.getElementById('cart-badge');
  if(cart.length>0){badge.textContent=cart.length;badge.classList.add('show');}
  else{badge.classList.remove('show');}
}

function addToCart(id){
  // eslint-disable-next-line eqeqeq
  const p=all.find(x=>x.id==id);if(!p)return;
  // eslint-disable-next-line eqeqeq
  if(cart.find(x=>x.id==id)){toast(lang==='en'?'⚠️ Already in the container':'⚠️ Déjà dans le container');return;}
  cart.push({id:p.id,name:p.name,ref:p.ref,type:p.type,grammage:p.grammage,largeur:p.largeur,format:p.format,poids_net:p.poids_net,price:p.price||null,img:p.image_url||null});
  localStorage.setItem('prodi_cart',JSON.stringify(cart));
  updateCartBadge();
  // Update legacy cards
  document.querySelectorAll('.btn-add-cart').forEach(btn=>{
    if(btn.getAttribute('onclick')?.includes(id)){
      btn.classList.add('added');
      const t=btn.querySelector('.cart-txt');
      if(t){t.textContent=lang==='en'?'Added !':'Ajouté !';}
      setTimeout(()=>{btn.classList.remove('added');if(t)t.textContent=lang==='en'?'+ Add':'+ Ajouter';},1800);
    }
  });
  // Update row view button
  const raddBtn=document.getElementById('radd-'+id);
  if(raddBtn){raddBtn.classList.add('added');raddBtn.textContent='✓';setTimeout(()=>{raddBtn.classList.remove('added');raddBtn.textContent='+';},1800);}
  // Update card v2 button
  const caddBtn=document.getElementById('cadd-'+id);
  if(caddBtn){caddBtn.classList.add('added');caddBtn.textContent=lang==='en'?'✓ Added':'✓ Ajouté';setTimeout(()=>{caddBtn.classList.remove('added');caddBtn.innerHTML=`<span class="cart-icon">+</span><span class="cart-check">✓</span> ${lang==='en'?'Add':'Ajouter'}`;},1800);}
  toast(lang==='en'?'✅ Added to container !':'✅ Ajouté au container !');
  renderDrawer();
}

function removeFromCart(id){
  cart=cart.filter(x=>x.id!=+id);
  localStorage.setItem('prodi_cart',JSON.stringify(cart));
  updateCartBadge();renderDrawer();
}

function confirmClearCart(){
  document.getElementById('confirm-bg').classList.add('show');
}
function doClearCart(){
  cart=[];localStorage.removeItem('prodi_cart');
  document.getElementById('confirm-bg').classList.remove('show');
  updateCartBadge();renderDrawer();
  toast(lang==='en'?'🗑️ Container emptied':'🗑️ Container vidé');
}

function openCartDrawer(){
  renderDrawer();
  document.getElementById('drawer-overlay').classList.add('show');
  document.getElementById('cart-drawer').classList.add('show');
  document.body.style.overflow='hidden';
}
function closeCartDrawer(){
  document.getElementById('drawer-overlay').classList.remove('show');
  document.getElementById('cart-drawer').classList.remove('show');
  document.body.style.overflow='';
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
  const ton=cart.reduce((s,p)=>s+(p.poids_net||0),0);
  meta.textContent=cart.length+' '+(lang==='en'?'product'+(cart.length>1?'s':''):'produit'+(cart.length>1?'s':''))+' · '+fmt(ton);
  document.getElementById('drawer-total').textContent=fmt(ton);
  document.getElementById('drawer-items-count').textContent=cart.length+' '+(lang==='en'?'product'+(cart.length>1?'s':''):'produit'+(cart.length>1?'s':''));
  // Prix total estimé
  const enriched=cart.map(p=>({...p,price:p.price??all.find(x=>x.id==p.id)?.price??null}));
  const priceTotal=enriched.reduce((s,p)=>s+(p.price&&p.poids_net?p.price*p.poids_net/1000:0),0);
  const noPriceCount=enriched.filter(p=>!p.price).length;
  const prRow=document.getElementById('drawer-price-row');
  if(priceTotal>0){
    prRow.style.display='flex';
    document.getElementById('drawer-price-val').textContent=Math.round(priceTotal).toLocaleString('fr-FR')+' €';
    document.getElementById('drawer-price-sub').textContent=noPriceCount>0?`${LT[lang].t_depart_usine} (${noPriceCount} hors tarif)`:LT[lang].t_depart_usine;
  }else{
    prRow.style.display='none';
  }
  footer.style.display='block';
  items.innerHTML=cart.map(p=>`
    <div class="cart-item">
      <div class="cart-item-img">${(p.img||(all.find(x=>x.id==p.id)?.image_url))?`<img src="${p.img||all.find(x=>x.id==p.id)?.image_url}">`:`${ico(p.type)}`}</div>
      <div class="cart-item-info">
        <div class="cart-item-ref">${p.ref&&!p.ref.startsWith('Photo_')?p.ref:''}</div>
        <div class="cart-item-name">${p.name}</div>
        <div class="tags" style="margin-bottom:0">${p.grammage?`<span class="tag">${p.grammage}g/m²</span>`:''}${p.largeur?`<span class="tag">${p.largeur}mm</span>`:''}</div>
        <div class="cart-item-sub">${fmt(p.poids_net)}</div>
      </div>
      <button class="cart-item-rm" onclick="removeFromCart(${p.id})" title="${lang==='en'?'Remove':'Retirer'}">✕</button>
    </div>
  `).join('');
}

function openCartProforma(){
  document.getElementById('pf-cart-count').textContent=cart.length;
  const subEl=document.getElementById('pf-cart-sub');
  if(subEl)subEl.innerHTML=(lang==='en'?'Group request — ':'Demande groupée — ')+'<span id="pf-cart-count">'+cart.length+'</span> '+(lang==='en'?'product(s)':'produit(s)');
  document.getElementById('pf-cart-items').innerHTML=cart.map(p=>`<div class="pf-item-line">▪ ${p.name}${(p.ref&&!p.ref.startsWith('Photo_'))?' ('+p.ref+')':''} — ${fmt(p.poids_net)}</div>`).join('');
  document.getElementById('proforma-cart-bg').classList.add('show');
}
function closeCartProforma(){document.getElementById('proforma-cart-bg').classList.remove('show');}

async function sendCartProforma(){
  const nom=document.getElementById('pfc-nom').value.trim();
  const soc=document.getElementById('pfc-societe').value.trim();
  const email=document.getElementById('pfc-email').value.trim();
  let ok=true;
  validateField('fg-pfc-nom',!!nom,'Nom requis'); if(!nom)ok=false;
  validateField('fg-pfc-societe',!!soc,'Société requise'); if(!soc)ok=false;
  validateField('fg-pfc-email',emailRx.test(email),'Email invalide'); if(!emailRx.test(email))ok=false;
  if(!ok)return;
  const btn=document.getElementById('pfc-btn');btn.disabled=true;btn.textContent=lang==='en'?'SENDING...':'ENVOI...';
  try{
    const msg='Panier : '+cart.map(p=>`${p.name}${p.ref?' ('+p.ref+')':''} — ${fmt(p.poids_net)}`).join(' | ')+(document.getElementById('pfc-msg').value?' | '+document.getElementById('pfc-msg').value:'');
    const savedCart=[...cart];
    for(const p of savedCart){
      await sbQ('proforma_requests',{method:'POST',body:{product_id:p.id,nom,societe:soc,email,telephone:document.getElementById('pfc-tel').value,quantite_souhaitee:'Demande groupée panier',message:msg,statut:'nouveau'},headers:{'Prefer':'return=minimal'}}).catch(()=>{});
    }
    btn.disabled=false;btn.textContent=LT[lang].t_send||'ENVOYER';
    closeCartProforma();doClearCart();closeCartDrawer();
    try{ emailjs.send(EJS_SVC, EJS_TPL, { from_name:nom, company:soc, reply_to:email, message:msg }); }catch(_){}
    toast(lang==='en'?'✅ Request sent for '+savedCart.length+' product(s)!':'✅ Demande envoyée pour '+savedCart.length+' produit(s) !',4000);
    ['pfc-nom','pfc-societe','pfc-email','pfc-tel','pfc-msg'].forEach(id=>document.getElementById(id).value='');
  }catch(err){
    btn.disabled=false;btn.textContent=LT[lang].t_send||'ENVOYER';
    toast(lang==='en'?'❌ Send error — please retry':'❌ Erreur envoi — réessayez dans un instant');
    console.error('sendCartProforma error:',err);
  }
}

// Keyboard: close drawer on Escape
// Reposition open panels on scroll
document.addEventListener('scroll',()=>{
  document.querySelectorAll('.msd-panel.show').forEach(panel=>{
    const wrapper=panel.closest('.msd')||panel.closest('.fb-msd');
    if(!wrapper)return;
    const id=wrapper.id;
    const btn=document.querySelector(`#${id} .msd-btn`)||document.querySelector(`#${id} .fb-msd-btn`);
    if(btn){const r=btn.getBoundingClientRect();panel.style.top=(r.bottom+4)+'px';panel.style.left=r.left+'px';}
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
  if(!isOpen){
    btn.classList.add('open');
    const rect=btn.getBoundingClientRect();
    panel.style.top=(rect.bottom+4)+'px';
    panel.style.left=rect.left+'px';
    panel.classList.add('show');
  }
}

function openFilterDrawer(){
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
init();

// ── LANGUAGE TOGGLE ──
let lang=localStorage.getItem('prodi_lang')||'fr';
const LT={
  fr:{
    t_live:'Stock en direct',
    t_stock:'Stock Europe', t_update:'Mise à jour quotidienne',
    t_loading:'Chargement 24–48h', t_docs:'Documents sur demande (EUR1, COO…)',
    t_quality:'Recyclé & Fabrication',
    t_refs:'références',
    t_sort_new:'Plus récents', t_sort_gsm_asc:'Grammage ↑', t_sort_gsm_desc:'Grammage ↓',
    t_container_empty:'CONTAINER VIDE', t_add_from_cat:'Ajoutez des produits depuis le catalogue',
    t_pf_title:'DEMANDE DE DEVIS', t_cart_pf_title:'DEVIS PANIER',
    t_f_name:'Nom *', t_f_name_err:'Nom requis',
    t_f_company:'Société *', t_f_company_err:'Société requise',
    t_f_email:'Email *', t_f_email_err:'Email invalide',
    t_f_phone:'Téléphone', t_f_qty:'Quantité souhaitée', t_f_msg:'Message',
    t_send:'ENVOYER',
    t_pf_btn:'📄 DEMANDER UN DEVIS', t_clear_cart:'Vider le container',
    t_filtres:'FILTRES', t_effacer:'Effacer', t_trier:'Trier :', t_poids_total:'Poids total',
    t_fmt:'Format', t_bobine:'Bobine', t_palette:'Palette',
    t_type_lbl:'Type', t_couleur_lbl:'Couleur', t_couleurs_lbl:'Couleurs', t_mandrin_lbl:'Mandrin', t_gsm_lbl:'Grammage', t_laize_lbl:'Laize', t_longueur_lbl:'Longueur', t_prix_lbl:'Prix',
    t_my_container:'MON CONTAINER', t_browse_cat:'← Voir le catalogue',
    t_tonnage_total:'TONNAGE TOTAL', t_total_estime:'TOTAL ESTIMÉ', t_depart_usine:'Départ usine HT',
    t_pf_microcopy:'Réponse sous 24h ouvrées · Origine UE · Documents disponibles',
    t_prix_depart:'Prix départ usine', t_poids_lbl:'Poids',
    t_add_ctr:'+ Ajouter', t_added_ctr:'✓ Ajouté', t_demander_devis:'DEMANDER UN DEVIS',
    t_sort_price_asc:'Prix ↑', t_sort_price_desc:'Prix ↓',
    t_no_results:'Aucun résultat', t_no_results_sub:'Essayez d\'élargir vos filtres.',
    t_reset:'↺ Réinitialiser', t_retry:'↺ Réessayer',
    t_err_net:'ERREUR RÉSEAU', t_err_timeout:'Délai dépassé — vérifiez votre connexion.', t_err_server:'Impossible de joindre le serveur.',
    t_err_load:'Impossible de charger les produits.', t_err_title:'ERREUR',
    t_clear_confirm:'Vider le container ?', t_clear_confirm_msg:'Cette action est irréversible. Tous les produits sélectionnés seront retirés.',
    t_sur_demande:'Sur demande', t_search_ph:'Kraft 80g, SBS blanc, Testliner...', t_mob_search_ph:'Rechercher un produit...',
    t_produits:'produit(s)', t_sent_ok:'DEMANDE ENVOYÉE', t_sent_sub:'Nous vous répondrons sous 48h',
    t_wa:'WhatsApp', t_mandrins_lbl:'Mandrins',
    t_origine_recycl:'Recyclé', t_origine_fab:'Fabrication',
    t_spec_couleur:'Couleur', t_spec_gsm:'Grammage', t_spec_laize:'Laize', t_spec_longueur:'Longueur', t_spec_mandrin:'Mandrin', t_spec_format:'Format', t_spec_depot:'Dépôt',
    t_chip_gram:'Gram.', t_chip_laize:'Laize', t_chip_longueur:'Longueur', t_chip_prix:'Prix', t_chip_recherche:'Recherche',
    t_rechercher:'Rechercher',
    t_add_modal_btn:'+ Ajouter au container', t_added_modal_btn:'✓ Ajouté',
    t_cancel:'Annuler', t_vider:'VIDER',
  },
  en:{
    t_live:'Live stock',
    t_stock:'European stock', t_update:'Daily updates',
    t_loading:'24–48h loading', t_docs:'Docs on request (EUR1, COO…)',
    t_quality:'Virgin & Recycled',
    t_refs:'references',
    t_sort_new:'Most recent', t_sort_gsm_asc:'Grammage ↑', t_sort_gsm_desc:'Grammage ↓',
    t_container_empty:'EMPTY CONTAINER', t_add_from_cat:'Add products from the catalogue',
    t_pf_title:'REQUEST A QUOTE', t_cart_pf_title:'CART QUOTE',
    t_f_name:'Name *', t_f_name_err:'Name required',
    t_f_company:'Company *', t_f_company_err:'Company required',
    t_f_email:'Email *', t_f_email_err:'Invalid email',
    t_f_phone:'Phone', t_f_qty:'Desired quantity', t_f_msg:'Message',
    t_send:'SEND',
    t_pf_btn:'📄 REQUEST A QUOTE', t_clear_cart:'Clear container',
    t_filtres:'FILTERS', t_effacer:'Clear', t_trier:'Sort:', t_poids_total:'Total weight',
    t_fmt:'Format', t_bobine:'Reel', t_palette:'Sheet',
    t_type_lbl:'Type', t_couleur_lbl:'Colour', t_couleurs_lbl:'Colours', t_mandrin_lbl:'Core', t_gsm_lbl:'Grammage', t_laize_lbl:'Width', t_longueur_lbl:'Length', t_prix_lbl:'Price',
    t_my_container:'MY CONTAINER', t_browse_cat:'← Browse catalogue',
    t_tonnage_total:'TOTAL TONNAGE', t_total_estime:'ESTIMATED TOTAL', t_depart_usine:'Ex-works excl. VAT',
    t_pf_microcopy:'Reply within 24h · EU origin · Documents available',
    t_prix_depart:'Ex-works price', t_poids_lbl:'Weight',
    t_add_ctr:'+ Add', t_added_ctr:'✓ Added', t_demander_devis:'REQUEST A QUOTE',
    t_sort_price_asc:'Price ↑', t_sort_price_desc:'Price ↓',
    t_no_results:'No results', t_no_results_sub:'Try widening your filters.',
    t_reset:'↺ Reset', t_retry:'↺ Retry',
    t_err_net:'NETWORK ERROR', t_err_timeout:'Timeout — check your connection.', t_err_server:'Unable to reach the server.',
    t_err_load:'Unable to load products.', t_err_title:'ERROR',
    t_clear_confirm:'Clear container?', t_clear_confirm_msg:'This action cannot be undone. All selected products will be removed.',
    t_sur_demande:'On request', t_search_ph:'Kraft 80gsm, White SBS, Testliner...', t_mob_search_ph:'Search a product...',
    t_produits:'product(s)', t_sent_ok:'REQUEST SENT', t_sent_sub:'We will reply within 48h',
    t_wa:'WhatsApp', t_mandrins_lbl:'Cores',
    t_origine_recycl:'Recycled', t_origine_fab:'Virgin',
    t_spec_couleur:'Colour', t_spec_gsm:'Grammage', t_spec_laize:'Width', t_spec_longueur:'Length', t_spec_mandrin:'Core', t_spec_format:'Format', t_spec_depot:'Depot',
    t_chip_gram:'GSM', t_chip_laize:'Width', t_chip_longueur:'Length', t_chip_prix:'Price', t_chip_recherche:'Search',
    t_rechercher:'Search',
    t_add_modal_btn:'+ Add to container', t_added_modal_btn:'✓ Added to container',
    t_cancel:'Cancel', t_vider:'CLEAR',
  }
};
function setLang(l){
  lang=l;
  localStorage.setItem('prodi_lang',l);
  document.documentElement.lang=l;
  document.documentElement.dataset.lang=l;
  ['fr','en'].forEach(x=>{
    document.getElementById('lang-'+x)?.classList.toggle('on',x===l);
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
  // Re-render cards if products already loaded to update dynamic strings
  if(typeof render==='function'&&typeof all!=='undefined'&&all.length)render(all);
  // Re-render drawer to update language-sensitive strings
  if(typeof renderDrawer==='function')renderDrawer();
}
