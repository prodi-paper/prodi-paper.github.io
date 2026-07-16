// ─── SECURITY HELPERS ───
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const safeUrl = u => {
  const s = String(u||'').trim();
  if (!/^https?:\/\//i.test(s)) return '';
  return esc(s);
};


// ─── STOCK ACCESS GATE ───
const STOCK_CODE = 'depot2026';
function openStock(){
  window.prodiTrack?.('cta_catalogue');
  try{
    if(sessionStorage.getItem('stock_unlocked')==='1'){ window.location.href='./catalogue/'; return; }
  }catch(_){}
  const g=document.getElementById('stock-gate'); if(!g)return;
  g.style.display='flex';
  document.body.style.overflow='hidden';
  setTimeout(()=>document.getElementById('stock-gate-code')?.focus(),60);
}
function closeStockGate(){
  const g=document.getElementById('stock-gate'); if(!g)return;
  g.style.display='none';
  document.body.style.overflow='';
  const err=document.getElementById('stock-gate-err'); if(err) err.textContent='';
  const inp=document.getElementById('stock-gate-code'); if(inp) inp.value='';
}
function submitStockGate(e){
  e.preventDefault();
  const code=(document.getElementById('stock-gate-code')?.value||'').trim().toLowerCase();
  const err=document.getElementById('stock-gate-err');
  if(code===STOCK_CODE){
    try{ sessionStorage.setItem('stock_unlocked','1'); }catch(_){}
    window.location.href='./catalogue/';
  }else{
    if(err) err.textContent='Code invalide. Contactez-nous pour obtenir le code d\'accès.';
  }
}
document.addEventListener('keydown',e=>{
  if(e.key==='Escape'){
    const g=document.getElementById('stock-gate');
    if(g && g.style.display!=='none') closeStockGate();
  }
});

// ─── PAGE NAVIGATION ───
function showPage(id) {
  if (id === 'about' || id === 'contact') {
    document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
    document.getElementById('page-home').classList.add('active');
    document.querySelectorAll('.hd-nav a').forEach(a => a.classList.remove('active'));
    document.getElementById('nav-'+id)?.classList.add('active');
    const target = id === 'about' ? 'about-section' : 'contact-section';
    setTimeout(() => {
      document.getElementById(target)?.scrollIntoView({behavior:'smooth'});
    }, 50);
    return;
  }
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  document.getElementById('page-'+id)?.classList.add('active');
  document.querySelectorAll('.hd-nav a').forEach(a => a.classList.remove('active'));
  document.getElementById('nav-'+id)?.classList.add('active');
  window.scrollTo({top:0, behavior:'instant'});
}

// ─── MOBILE MENU ───
function toggleMob() {
  const m = document.getElementById('mob-menu');
  m.classList.toggle('open');
  document.getElementById('burger')?.setAttribute('aria-expanded', m.classList.contains('open') ? 'true' : 'false');
}
document.addEventListener('click', e => {
  const m = document.getElementById('mob-menu');
  const b = document.getElementById('burger');
  if (m.classList.contains('open') && !m.contains(e.target) && !b.contains(e.target)) {
    m.classList.remove('open');
  }
});

// ─── CONTACT FORM ───
const SURL = 'https://bvcgpdoukhcatjibmvnb.supabase.co';
const SKEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJ2Y2dwZG91a2hjYXRqaWJtdm5iIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzIyNzg5MjgsImV4cCI6MjA4Nzg1NDkyOH0.Ip3ykSUS9sajTH04yXBerOG1haBKMD1kAvMQNjnGL1Q';

async function submitContact(e) {
  e.preventDefault();
  // Honeypot anti-bot: hidden field should remain empty for real users.
  if (document.getElementById('f-hp')?.value) {
    document.getElementById('contact-form').style.display = 'none';
    document.getElementById('form-ok').style.display = 'block';
    return;
  }
  if (typeof window._contactAllValid === 'function' && !window._contactAllValid()) return;
  const btn = document.getElementById('f-submit');
  btn.disabled = true;
  btn.textContent = '...';
  const nom = document.getElementById('f-nom').value.trim();
  const soc = document.getElementById('f-soc').value.trim();
  const email = document.getElementById('f-email').value.trim();
  // Préfixe indicatif seulement si un numéro est saisi et qu'il n'en a pas
  // déjà (clients export : ne pas forcer +33 ; champ vide : ne rien stocker).
  const _telRaw = document.getElementById('f-tel').value.trim();
  const _telCode=(document.getElementById('f-tel-code')?.value)||'+33';
  const tel = _telRaw ? (/^(\+|00)/.test(_telRaw) ? _telRaw : _telCode+' '+_telRaw) : '';
  const msg = document.getElementById('f-msg').value.trim();
  try {
    const r = await fetch(SURL+'/rest/v1/proforma_requests', {
      method:'POST',
      headers:{'apikey':SKEY,'Authorization':'Bearer '+SKEY,'Content-Type':'application/json','Prefer':'return=minimal'},
      body: JSON.stringify({nom, societe:soc, email, telephone:tel, message:msg, quantite_souhaitee:'Contact vitrine', statut:'vitrine_contact'})
    });
    // Un 4xx (RLS, message trop long…) affichait quand même « envoyé » et le
    // lead était perdu en silence.
    if(!r.ok) throw new Error('HTTP '+r.status);
    window.prodiTrack?.('contact_envoye');
    // Le push vers Bitrix24 se fait CÔTÉ SERVEUR (trigger Postgres pg_net sur
    // proforma_requests, statut vitrine_contact) : le webhook CRM n'apparaît
    // plus jamais dans le code public. Ne JAMAIS remettre d'URL Bitrix ici.
    document.getElementById('contact-form').style.display = 'none';
    document.getElementById('form-ok').style.display = 'block';
  } catch(err) {
    btn.disabled = false;
    btn.textContent = 'Envoyer le message';
    alert('Erreur — veuillez réessayer ou écrire à contact@prodi.com');
  }
}

// ─── VIDÉO DÉPÔT : lecture seulement à l'approche (3,2 Mo → 0 au chargement) ───
(function(){
  const v=document.getElementById('depot-vid');
  if(!v||!('IntersectionObserver' in window))return;
  const obs=new IntersectionObserver(entries=>{
    if(entries[0].isIntersecting){
      v.play().catch(()=>{});
      obs.disconnect();
    }
  },{rootMargin:'400px 0px'});
  obs.observe(v);
})();

// ─── SCROLL REVEAL ───
(function(){
  const els = document.querySelectorAll('[data-reveal],[data-reveal-left],[data-reveal-right]');
  if(!els.length) return;
  const obs = new IntersectionObserver(entries => {
    entries.forEach(e => {
      if(e.isIntersecting){ e.target.classList.add('visible'); obs.unobserve(e.target); }
    });
  },{threshold:.12,rootMargin:'0px 0px -40px 0px'});
  els.forEach(el => obs.observe(el));
})();

// ─── COUNT-UP générique (.depot-count / .habt-count) ───
(function genericCountUp(){
  const items=document.querySelectorAll('.depot-count[data-target],.habt-count[data-target]');
  if(!items.length)return;
  const obs=new IntersectionObserver((entries,o)=>{
    entries.forEach(e=>{
      if(!e.isIntersecting)return;
      const el=e.target;
      const target=parseInt(el.dataset.target,10)||0;
      const noFmt=el.dataset.noformat==='1';
      const dur=1800;
      const start=performance.now();
      function step(now){
        const t=Math.min((now-start)/dur,1);
        const eased=1-Math.pow(1-t,3);
        const cur=Math.round(target*eased);
        el.textContent=noFmt?String(cur):cur.toLocaleString('fr-FR');
        if(t<1)requestAnimationFrame(step);
      }
      requestAnimationFrame(step);
      o.unobserve(el);
    });
  },{threshold:.4});
  items.forEach(el=>obs.observe(el));
})();

// ─── STATS SCROLL REVEAL ───
(function(){
  const statsEl = document.querySelector('.hero-stats');
  if(!statsEl) return;
  const stats = statsEl.querySelectorAll('.h-stat');
  const obs = new IntersectionObserver(entries => {
    if(entries[0].isIntersecting){
      stats.forEach(s => s.classList.add('visible'));
      obs.disconnect();
    }
  },{threshold:.3});
  obs.observe(statsEl);
})();

// ─── FORM VALIDATION ───
(function(){
  const RULES = {
    'f-nom':   {required:true, min:2, errMsg:'Nom requis (min. 2 car.)'},
    'f-soc':   {required:true, min:2, errMsg:'Entreprise requise'},
    'f-email': {required:true, email:true, errMsg:'Email invalide'},
    'f-tel':   {required:false, errMsg:''},
    'f-msg':   {required:true, min:15, errMsg:'Message trop court (min. 15 car.)'},
  };
  function validate(id){
    const input = document.getElementById(id);
    const msgEl = document.getElementById('fg-msg-'+id.replace('f-',''));
    if(!input) return true;
    const rule = RULES[id];
    const val = input.value.trim();
    const fg = input.closest('.fg');
    if(!val && !rule.required){ fg.classList.remove('fv-valid','fv-invalid'); return true; }
    let ok = true;
    if(rule.required && !val) ok = false;
    if(ok && rule.min && val.length < rule.min) ok = false;
    if(ok && rule.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val)) ok = false;
    fg.classList.toggle('fv-valid', ok);
    fg.classList.toggle('fv-invalid', !ok);
    if(msgEl) msgEl.textContent = ok ? '' : (rule.errMsg || '');
    return ok;
  }
  Object.keys(RULES).forEach(id => {
    const input = document.getElementById(id);
    if(!input) return;
    input.addEventListener('blur', () => validate(id));
    input.addEventListener('input', () => { if(input.closest('.fg').classList.contains('fv-invalid')) validate(id); });
  });
  // Validate all on submit
  const form = document.getElementById('contact-form');
  if(form){
    const orig = form.onsubmit;
    form.addEventListener('submit', e => {
      let allOk = true;
      Object.keys(RULES).forEach(id => { if(!validate(id)) allOk = false; });
      if(!allOk) e.preventDefault();
    }, true);
    // Exposé pour submitContact (onsubmit inline, que le listener ci-dessus
    // ne peut pas bloquer) : re-vérification avant envoi.
    window._contactAllValid = () => {
      let ok = true;
      Object.keys(RULES).forEach(id => { if(!validate(id)) ok = false; });
      return ok;
    };
  }
})();


/* ── SHOWCASE CAROUSEL (dynamic from Supabase) ── */
(async function(){
  const SURL='https://bvcgpdoukhcatjibmvnb.supabase.co';
  const SKEY='eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJ2Y2dwZG91a2hjYXRqaWJtdm5iIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzIyNzg5MjgsImV4cCI6MjA4Nzg1NDkyOH0.Ip3ykSUS9sajTH04yXBerOG1haBKMD1kAvMQNjnGL1Q';
  const track=document.getElementById('sc-track');
  const dotsWrap=document.getElementById('sc-dots');
  if(!track)return;

  // Fetch products with image_url — même filtre que catalogue.js:_fetchAndRenderFeatured
  // (refs Photo_NNNNNN 6 chiffres uniquement, tri ref.desc = plus récents). Exclut
  // Photo_FAB*, Photo_DU*, Photo_PM* etc. qui sortaient des machines dans le showcase.
  try{
    // RÈGLE (Ethan, 02/07/2026) : le showcase = un MIX DE QUALITÉS pris dans
    // les 1 000 DERNIÈRES réfs qui ont une VRAIE photo. Les toutes dernières
    // réfs (~350) n'ont pas encore leur photo dans l'album stock.prodi.net
    // (URLs synthétisées par l'import → 404) : on descend la liste par lots —
    // les 404 échouent vite — et on s'arrête dès qu'on a la diversité voulue.
    const r=await fetch(SURL+'/rest/v1/products?select=*&image_url=not.is.null&image_url=neq.&ref=match.%5EPhoto_%5B0-9%5D%7B6%7D%24&source=neq.inventaire&emplacement=eq.OUR%20WAREHOUSE&order=ref.desc',{
      headers:{'apikey':SKEY,'Authorization':'Bearer '+SKEY,'Range':'0-999'}
    });
    const data=await r.json();
    if(!data||!data.length)return;
    const candidates=data.filter(p=>p.image_url&&p.image_url.trim().length>10);

    const TARGET=16;
    async function verifyBatch(list){
      const okArr=new Array(list.length).fill(false);
      await Promise.all(list.map((p,idx)=>new Promise(resolve=>{
        const img=new Image();
        img.onload=()=>{okArr[idx]=true;resolve();};
        img.onerror=()=>resolve();
        img.src=p.image_url;
        setTimeout(resolve,3000);
      })));
      return list.filter((_,i)=>okArr[i]);
    }
    // Descente par lots de 64 sur les 1 000 dernières (ordre desc = fraîcheur),
    // stop dès 16+ photos confirmées couvrant au moins 8 qualités.
    let verified=[];
    for(let i=0;i<candidates.length;i+=64){
      verified=verified.concat(await verifyBatch(candidates.slice(i,i+64)));
      const q=new Set(verified.map(p=>p.quality||'_'));
      // Stop quand on a de quoi remplir AVEC de la variété : 16+ photos et
      // 8 qualités différentes (ou une bonne marge de photos).
      if(verified.length>=TARGET&&(q.size>=8||verified.length>=TARGET+8))break;
    }
    // Filet (ne devrait jamais servir) : compléter avec les réfs anciennes.
    if(verified.length<TARGET){
      try{
        const r2=await fetch(SURL+'/rest/v1/products?select=*&image_url=not.is.null&image_url=neq.&ref=match.%5EPhoto_%5B0-9%5D%7B6%7D%24&source=neq.inventaire&emplacement=eq.OUR%20WAREHOUSE&order=ref.asc',{
          headers:{'apikey':SKEY,'Authorization':'Bearer '+SKEY,'Range':'0-149'}
        });
        const older=(await r2.json())||[];
        const have=new Set(verified.map(p=>p.ref));
        const pool=Array.isArray(older)?older.filter(p=>p.image_url&&!have.has(p.ref)):[];
        for(let i=0;i<pool.length&&verified.length<TARGET;i+=48){
          verified=verified.concat(await verifyBatch(pool.slice(i,i+48)));
        }
      }catch(_){/* best-effort */}
    }
    if(!verified.length)return;

    // MIX DE QUALITÉS : 1 produit par qualité d'abord (les plus récents de
    // chaque), puis on complète (max 3/qualité) jusqu'à 16 cartes.
    const cntQ={};
    const picked=[];
    for(const p of verified){
      const q=p.quality||'_';
      if(cntQ[q])continue;
      cntQ[q]=1;picked.push(p);
      if(picked.length>=TARGET)break;
    }
    if(picked.length<TARGET){
      const used=new Set(picked);
      for(const p of verified){
        if(used.has(p))continue;
        const q=p.quality||'_';
        if((cntQ[q]||0)>=3)continue;
        cntQ[q]=(cntQ[q]||0)+1;picked.push(p);used.add(p);
        if(picked.length>=TARGET)break;
      }
    }

    // Split into 2 slides de 8 → grille 4×2
    const PER_SLIDE=8;
    const slides=[];
    for(let i=0;i<picked.length;i+=PER_SLIDE)slides.push(picked.slice(i,i+PER_SLIDE));
    if(!slides.length)return;

    // Quality labels
    const QL={'R1SC':'Couché 1 face','R2SC':'Couché 2 faces','RADH':'Adhésif','RAFF':'Papier affiche','RBOA':'Carton couché','RBON':'Carton non couché','RBOU':'Bouffant','RCAR':'Autocopiant','RCOL':'Offset couleur','RCUI':'Papier cuisson','RDIV':'Divers / Alu','RFLEX':'Complexe','RKDO':'Papier cadeau','RKRA':'Kraft','RKRABRUN':'Kraft brun','RKRG':'Kraft gomme','RKRR':'Kraft armé','RLINER':'Liner / Testliner','RLUX':'Papier luxe','RLWC':'LWC','RNEW':'Papier journal','ROFF':'Offset','RPAC':'Emballage','RPLA':'Plastique','RSIL':'Silicone / Glassine','RTHERM':'Thermique','RTIS':'Ouate / Tissue','S1SC':'Couché 1 face','S2SC':'Couché 2 faces','SADH':'Adhésif','SAFF':'Papier affiche','SBOA':'Carton couché','SBON':'Carton non couché','SBOU':'Bouffant','SCAR':'Autocopiant','SCOL':'Offset couleur','SCUT':'Ramette','SDIV':'Divers','SENV':'Enveloppes','SKRA':'Kraft','SLUX':'Papier luxe','SNEW':'Papier journal','SOFF':'Offset','SPAC':'Emballage','SPLA':'Plastique','SSBS':'SBS / Carton blanc','SINK':'Encre','UMAC':'Machines','SLWC':'LWC'};

    // Render cards (visuel identique aux cartes du catalogue: .pcard)
    const mmCm=mm=>mm!=null?String(Math.round(+mm)):null; // 16/07 : tout en mm
    function cardHtml(p){
      const q=p.quality||'';
      const c=q[0];
      const prefix=c==='R'?'BOBINE':c==='S'?'FORMAT':c==='U'?'MACHINE':q;
      const lab=QL[q]||q||'';
      const title=q?`${prefix} — ${lab.toUpperCase()}`:'Produit';
      const isPalette=p.format&&/palette|feuille/i.test(p.format);
      const dimTag=!isPalette&&p.width?`${mmCm(p.width)} mm`:'';
      const paletteDims=isPalette&&(p.width||p.longueur)?[p.width,p.longueur].filter(Boolean).map(mmCm).join('×'):null;
      const _refClean=(p.ref||'').replace(/^Photo_/i,'').trim();
      const _usineClean=p.usine?String(p.usine).replace(/^REF\s*/i,''):null;
      const refOverlay=_refClean?`<div class="pcard-ref-overlay" title="${esc(_refClean)}"><span class="pcard-ref-txt">${esc(_refClean)}</span></div>`:'';
      const usineOverlay=_usineClean?`<div class="pcard-gsm-overlay"><span class="pcard-gsm-lbl">USINE</span><span class="pcard-gsm-num">${esc(_usineClean)}</span></div>`:'';
      const _det=(p.details||'').replace(/(?<=^|\s)-(?=\s|$)/g,'').replace(/\s{2,}/g,' ').trim();
      const subtitleHtml=_det.length>2?`<div class="pcard-subtitle">${esc(_det)}</div>`:'';
      const specRows=[
        p.gsm?`${p.gsm} g/m²`:'—',
        isPalette?(paletteDims?paletteDims+' mm':'—'):(dimTag||'—'),
        p.color||'—'
      ];
      const specsHtml=`<div class="pcard-specs">${specRows.map(v=>`<div class="pcard-spec"><span class="pspec-val">${esc(v)}</span></div>`).join('')}</div>`;
      const fb='img/no-photo.png';
      const imgHtml=p.image_url
        ?`<img src="${safeUrl(p.image_url)}" alt="${esc(title)}" loading="lazy" onerror="this.src='${fb}';this.className='pcard-nophoto'">`
        :`<img src="${fb}" alt="Photo sur demande" class="pcard-nophoto">`;
      return`<a class="pcard" href="./catalogue/" onclick="openStock();return false;"><div class="pcard-img">${imgHtml}${refOverlay}${usineOverlay}</div><div class="pcard-body"><div class="pcard-name">${esc(title)}</div>${subtitleHtml}${specsHtml}</div></a>`;
    }

    track.innerHTML=slides.map(slide=>`<div class="sc-slide">${slide.map(cardHtml).join('')}</div>`).join('');

    // Dots
    dotsWrap.innerHTML=slides.map((_,i)=>`<button class="sc-dot${i===0?' active':''}" data-sc="${i}" aria-label="Aller au slide ${i+1}"></button>`).join('');

    // Carousel logic
    const dots=dotsWrap.querySelectorAll('.sc-dot');
    const total=slides.length;
    let cur=0,timer;
    function go(n){cur=(n+total)%total;track.style.transform='translateX(-'+(cur*100)+'%)';dots.forEach((d,i)=>d.classList.toggle('active',i===cur));}
    function startAuto(){timer=setInterval(()=>go(cur+1),5000);}
    function resetAuto(){clearInterval(timer);startAuto();}
    dots.forEach(d=>d.addEventListener('click',()=>{go(+d.dataset.sc);resetAuto();}));
    startAuto();
  }catch(e){console.error('Showcase carousel error:',e);}
})();

// ─── REAL GLOBE (orthographic, silhouette only) ───
async function initGlobe(){
  const land=document.getElementById('globe-land');
  if(!land) return;
  const NS='http://www.w3.org/2000/svg';
  // Globe plein (silhouette continents blancs sur disque bleu)
  const CX=160, CY=160, R=148;
  // Centré sur Atlantique pour cadrer Amériques + Europe + Afrique
  const lon0_deg=-30, lat0_deg=15;
  const lon0=lon0_deg*Math.PI/180, lat0=lat0_deg*Math.PI/180;
  const sinL=Math.sin(lat0), cosL=Math.cos(lat0);

  function proj(lon,lat){
    const λ=lon*Math.PI/180 - lon0;
    const φ=lat*Math.PI/180;
    const cosP=Math.cos(φ), sinP=Math.sin(φ);
    const cosΛ=Math.cos(λ), sinΛ=Math.sin(λ);
    const x=cosP*sinΛ;
    const y=cosL*sinP - sinL*cosP*cosΛ;
    const z=sinL*sinP + cosL*cosP*cosΛ;
    return [CX + R*x, CY - R*y, z];
  }

  // ── Land : silhouette continents en projection orthographique ──
  try{
    const world=await fetch('https://cdn.jsdelivr.net/npm/world-atlas@2/countries-110m.json').then(r=>r.json());
    const features=topojson.feature(world,world.objects.countries).features;
    function ringToD(ring){
      let d='', started=false, firstPt=null;
      for(const pt of ring){
        const [x,y,z]=proj(pt[0],pt[1]);
        if(z>=-0.001){
          if(!started){ d+=`M${x.toFixed(1)},${y.toFixed(1)}`; started=true; firstPt=[x,y]; }
          else d+=`L${x.toFixed(1)},${y.toFixed(1)}`;
        } else { started=false; }
      }
      if(firstPt) d+='Z';
      return d;
    }
    features.forEach(feat=>{
      const g=feat.geometry; if(!g)return;
      const name=(feat.properties&&(feat.properties.name||feat.properties.NAME))||'';
      if(/antarctica|antarctique/i.test(name))return;
      const polys=g.type==='Polygon'?[g.coordinates]:g.type==='MultiPolygon'?g.coordinates:[];
      polys.forEach(poly=>{
        const d=poly.map(ringToD).filter(Boolean).join(' ');
        if(!d)return;
        const p=document.createElementNS(NS,'path');
        p.setAttribute('d',d);
        land.appendChild(p);
      });
    });
  }catch(e){console.warn('globe land failed',e);}
}

const _globeEl=document.getElementById('globe-svg');
if(_globeEl){
  const _gobs=new IntersectionObserver(entries=>{
    if(entries[0].isIntersecting){ initGlobe(); _gobs.disconnect(); }
  },{threshold:.1});
  _gobs.observe(_globeEl);
}


// ─── STATS COUNT-UP : animation au scroll vers les chiffres cibles
(function statsCountUp(){
  const items=document.querySelectorAll('.sc-stat-num[data-target]');
  if(!items.length)return;
  const fmt=(n,noFmt)=>noFmt?String(n):n.toLocaleString('fr-FR');
  const obs=new IntersectionObserver((entries,o)=>{
    entries.forEach(e=>{
      if(!e.isIntersecting)return;
      const el=e.target;
      const target=parseInt(el.dataset.target,10)||0;
      const noFmt=el.dataset.noFormat==='1';
      const dur=1500+Math.min(target,2000)*0.3;
      const start=performance.now();
      function step(now){
        const t=Math.min((now-start)/dur,1);
        const eased=1-Math.pow(1-t,3);
        const cur=Math.round(target*eased);
        el.textContent='+'+fmt(cur,noFmt);
        if(t<1)requestAnimationFrame(step);
      }
      requestAnimationFrame(step);
      o.unobserve(el);
    });
  },{threshold:.4});
  items.forEach(el=>obs.observe(el));
})();

// ─── HERO VIDEO : aspect-ratio dynamique pour s'adapter à n'importe quel format
(function adaptHeroVideo(){
  const v=document.getElementById('hero-vid');
  if(!v)return;
  const apply=()=>{
    if(!v.videoWidth||!v.videoHeight)return;
    const wrap=v.closest('.hero-video-wrap');
    if(wrap) wrap.style.setProperty('--vid-ratio',`${v.videoWidth}/${v.videoHeight}`);
  };
  v.addEventListener('loadedmetadata',apply);
  if(v.readyState>=1) apply();
})();

function toggleSound(){
  const v=document.getElementById('hero-vid');
  const btnTxt=document.getElementById('vid-txt');
  const icoMute=document.getElementById('vid-icon-mute');
  const icoSound=document.getElementById('vid-icon-sound');
  v.muted=!v.muted;
  if(v.muted){
    icoMute.style.display='';icoSound.style.display='none';btnTxt.textContent='SON';
  } else {
    icoMute.style.display='none';icoSound.style.display='';btnTxt.textContent='SON';
  }
}

// Appliquer la langue sauvegardée au chargement
