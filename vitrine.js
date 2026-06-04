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
  const btn = document.getElementById('f-submit');
  btn.disabled = true;
  btn.textContent = '...';
  const nom = document.getElementById('f-nom').value.trim();
  const soc = document.getElementById('f-soc').value.trim();
  const email = document.getElementById('f-email').value.trim();
  const _telCode=(document.getElementById('f-tel-code')?.value)||'+33';
  const tel = _telCode+' '+document.getElementById('f-tel').value.trim();
  const msg = document.getElementById('f-msg').value.trim();
  try {
    const r = await fetch(SURL+'/rest/v1/proforma_requests', {
      method:'POST',
      headers:{'apikey':SKEY,'Authorization':'Bearer '+SKEY,'Content-Type':'application/json','Prefer':'return=minimal'},
      body: JSON.stringify({nom, societe:soc, email, telephone:tel, message:msg, quantite_souhaitee:'Contact vitrine', statut:'vitrine_contact'})
    });
    document.getElementById('contact-form').style.display = 'none';
    document.getElementById('form-ok').style.display = 'block';
  } catch(err) {
    btn.disabled = false;
    btn.textContent = 'Envoyer le message';
    alert('Erreur — veuillez réessayer ou écrire à contact@prodi.com');
  }
}

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
    const r=await fetch(SURL+'/rest/v1/products?select=*&image_url=not.is.null&image_url=neq.&ref=match.%5EPhoto_%5B0-9%5D%7B6%7D%24&order=ref.desc',{
      headers:{'apikey':SKEY,'Authorization':'Bearer '+SKEY,'Range':'0-499'}
    });
    const data=await r.json();
    if(!data||!data.length)return;

    // Filter products with real image_url — garde l'ordre ref.desc (= plus récents d'abord)
    const candidates=data.filter(p=>p.image_url&&p.image_url.trim().length>10);

    // Verify images load — check les 120 plus récents, garde l'ordre original
    const toCheck=candidates.slice(0,120);
    const ok=new Array(toCheck.length).fill(false);
    await Promise.all(toCheck.map((p,idx)=>new Promise(resolve=>{
      const img=new Image();
      img.onload=()=>{ok[idx]=true;resolve();};
      img.onerror=()=>resolve();
      img.src=p.image_url;
      setTimeout(resolve,3000);
    })));
    const verified=toCheck.filter((_,i)=>ok[i]);
    if(!verified.length)return;

    // Cible 16 produits, 2 passes :
    //  1) 1 par qualité (max diversité)
    //  2) si <16, on autorise une 2e carte d'une qualité déjà prise, mais
    //     seulement si signature (grammage|format|largeur|couleur) différente
    //     → jamais 2 cartes visuellement identiques.
    const sigOf=p=>[p.gsm||'',p.format||'',p.width||'',p.color||''].join('|');
    const cntQ={};
    const seenSig=new Set();
    const picked=[];
    for(const p of verified){
      const q=p.quality||'_';
      if(cntQ[q])continue;
      const s=q+'|'+sigOf(p);
      if(seenSig.has(s))continue;
      cntQ[q]=1;seenSig.add(s);picked.push(p);
      if(picked.length>=16)break;
    }
    if(picked.length<16){
      for(const p of verified){
        if(picked.length>=16)break;
        if(picked.includes(p))continue;
        const q=p.quality||'_';
        if((cntQ[q]||0)>=2)continue;
        const s=q+'|'+sigOf(p);
        if(seenSig.has(s))continue;
        cntQ[q]=(cntQ[q]||0)+1;seenSig.add(s);picked.push(p);
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
    const mmCm=mm=>mm!=null?(+(mm/10).toFixed(1)).toString().replace(/\.0$/,''):null;
    function cardHtml(p){
      const q=p.quality||'';
      const c=q[0];
      const prefix=c==='R'?'BOBINE':c==='S'?'FORMAT':c==='U'?'MACHINE':q;
      const lab=QL[q]||q||'';
      const title=q?`${prefix} — ${lab.toUpperCase()}`:'Produit';
      const isPalette=p.format&&/palette|feuille/i.test(p.format);
      const dimTag=!isPalette&&p.width?`${mmCm(p.width)} cm`:'';
      const paletteDims=isPalette&&(p.width||p.longueur)?[p.width,p.longueur].filter(Boolean).map(mmCm).join('×'):null;
      const _refClean=(p.ref||'').replace(/^Photo_/i,'').trim();
      const _usineClean=p.usine?String(p.usine).replace(/^REF\s*/i,''):null;
      const refOverlay=_refClean?`<div class="pcard-ref-overlay" title="${esc(_refClean)}"><span class="pcard-ref-txt">${esc(_refClean)}</span></div>`:'';
      const usineOverlay=_usineClean?`<div class="pcard-gsm-overlay"><span class="pcard-gsm-lbl">USINE</span><span class="pcard-gsm-num">${esc(_usineClean)}</span></div>`:'';
      const _det=(p.details||'').replace(/(?<=^|\s)-(?=\s|$)/g,'').replace(/\s{2,}/g,' ').trim();
      const subtitleHtml=_det.length>2?`<div class="pcard-subtitle">${esc(_det)}</div>`:'';
      const specRows=[
        p.gsm?`${p.gsm} g/m²`:'—',
        isPalette?(paletteDims?paletteDims+' cm':'—'):(dimTag||'—'),
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
    dotsWrap.innerHTML=slides.map((_,i)=>`<button class="sc-dot${i===0?' active':''}" data-sc="${i}"></button>`).join('');

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

function goSearch(e) {
  e.preventDefault();
  const q = document.getElementById('sc-search-input').value.trim();
  window.location.href = './catalogue/' + (q ? '?q=' + encodeURIComponent(q) : '');
}

// ─── GEO MAP ───
function geoProj(lon,lat){
  return [(lon+180)/360*1000, (90-lat)/180*360];
}
// France origin
const GEO_FR=[2.35,48.85]; // lon,lat
const [GEO_FX,GEO_FY]=geoProj(...GEO_FR); // ≈ 507, 82

const GEO_PTS=[
  // Europe
  {f:'🇩🇪',lon:10,   lat:51   },{f:'🇪🇸',lon:-4,  lat:40   },{f:'🇬🇧',lon:-2,  lat:54   },
  {f:'🇵🇱',lon:20,   lat:52   },{f:'🇵🇹',lon:-8,  lat:39.5 },{f:'🇧🇪',lon:4.5, lat:50.5 },
  {f:'🇳🇱',lon:5.3,  lat:52.1 },{f:'🇮🇹',lon:12.5,lat:42   },{f:'🇷🇴',lon:25,  lat:46   },
  {f:'🇬🇷',lon:22,   lat:39   },{f:'🇹🇷',lon:35,  lat:39   },{f:'🇸🇪',lon:18,  lat:60   },
  {f:'🇨🇭',lon:8.3,  lat:47   },{f:'🇩🇰',lon:10,  lat:56   },{f:'🇳🇴',lon:10,  lat:62   },
  {f:'🇫🇮',lon:26,   lat:62   },{f:'🇨🇿',lon:15.5,lat:49.8 },{f:'🇭🇺',lon:19,  lat:47   },
  {f:'🇺🇦',lon:32,   lat:49   },{f:'🇦🇹',lon:14.6,lat:47.5 },
  // Africa
  {f:'🇲🇦',lon:-5.8, lat:31.8 },{f:'🇩🇿',lon:3,   lat:28   },{f:'🇹🇳',lon:9,   lat:34   },
  {f:'🇱🇾',lon:17,   lat:27   },{f:'🇲🇷',lon:-11, lat:20   },{f:'🇲🇱',lon:-2,  lat:17   },
  {f:'🇳🇪',lon:8,    lat:17   },{f:'🇹🇩',lon:18,  lat:15   },
  {f:'🇸🇳',lon:-14.5,lat:14   },{f:'🇨🇮',lon:-5.5,lat:7.5  },{f:'🇬🇭',lon:-1,  lat:8    },
  {f:'🇨🇲',lon:12,   lat:4    },{f:'🇳🇬',lon:8,   lat:10   },
  {f:'🇪🇬',lon:30,   lat:27   },{f:'🇰🇪',lon:37.5,lat:0    },{f:'🇿🇦',lon:25,  lat:-29  },
  // Middle East
  {f:'🇦🇪',lon:54,   lat:24   },{f:'🇸🇦',lon:45,  lat:24   },{f:'🇮🇱',lon:34.8,lat:31.5 },
  // Asia
  {f:'🇵🇰',lon:70,   lat:30   },{f:'🇮🇳',lon:80,  lat:22   },{f:'🇹🇭',lon:101, lat:15   },
  {f:'🇮🇩',lon:118,  lat:-5   },{f:'🇨🇳',lon:105, lat:35   },{f:'🇰🇷',lon:127.5,lat:37  },
  {f:'🇯🇵',lon:138,  lat:36   },{f:'🇦🇺',lon:134, lat:-25  },
  // Americas
  {f:'🇺🇸',lon:-98,  lat:38   },{f:'🇨🇦',lon:-95, lat:55   },{f:'🇲🇽',lon:-102,lat:23.6 },
  {f:'🇨🇴',lon:-74,  lat:4    },{f:'🇧🇷',lon:-52, lat:-10  },{f:'🇦🇷',lon:-64, lat:-34  },
  {f:'🇵🇪',lon:-76,  lat:-10  },{f:'🇨🇱',lon:-71, lat:-35  },
  {f:'🇻🇪',lon:-66,  lat:8    },{f:'🇪🇨',lon:-78, lat:-2   },{f:'🇧🇴',lon:-65, lat:-17  },
  {f:'🇵🇾',lon:-58,  lat:-23  },{f:'🇺🇾',lon:-56, lat:-33  },{f:'🇬🇾',lon:-59, lat:5    },
  {f:'🇨🇺',lon:-80,  lat:22   },{f:'🇩🇴',lon:-70, lat:19   },{f:'🇵🇦',lon:-80, lat:9    },
  {f:'🇬🇹',lon:-90,  lat:15   },{f:'🇭🇳',lon:-87, lat:15   },{f:'🇨🇷',lon:-84, lat:10   },
];

async function initGeoMap(){
  const svg=document.getElementById('geo-svg');
  const countriesG=document.getElementById('geo-countries');
  const arcsG=document.getElementById('geo-arcs');
  const shipsG=document.getElementById('geo-ships');
  const mrkG=document.getElementById('geo-markers');
  if(!svg||!countriesG||!arcsG||!mrkG) return;
  const NS='http://www.w3.org/2000/svg';

  // Theme "Earth at Night" : navy ultra profond + lumières dorées
  const bgRect=svg.querySelector('rect');
  if(bgRect) bgRect.setAttribute('fill','#040A18');
  // France origin : étoile dorée blanc-chaud (style ville-capitale sur photo nocturne NASA)
  svg.querySelectorAll('circle[cx="507"][cy="82"]').forEach(c=>{
    const r=c.getAttribute('r');
    if(r==='16') c.setAttribute('fill','#FFC833'),c.setAttribute('opacity','0.35');
    if(r==='5')  c.setAttribute('fill','#FFE066');
    if(r==='2.5')c.setAttribute('fill','#FFF8D0');
  });

  // 1. Render world map via topojson — palette dark
  try{
    const world=await fetch('https://cdn.jsdelivr.net/npm/world-atlas@2/countries-110m.json').then(r=>r.json());
    const features=topojson.feature(world,world.objects.countries).features;
    function ringToD(ring){
      return ring.map((pt,i)=>{
        const [x,y]=geoProj(pt[0],pt[1]);
        return `${i===0?'M':'L'}${x.toFixed(1)},${y.toFixed(1)}`;
      }).join('')+'Z';
    }
    // Skip Antarctica + polygones qui traversent l'antiméridien (provoquent
    // des traits horizontaux fantômes en travers de la carte).
    const isAntarctica=feat=>{
      const n=(feat.properties&&(feat.properties.name||feat.properties.NAME))||'';
      return /antarctica|antarctique/i.test(n);
    };
    const ringWraps=ring=>{
      for(let i=1;i<ring.length;i++){
        if(Math.abs(ring[i][0]-ring[i-1][0])>180)return true;
      }
      return false;
    };
    features.forEach(feat=>{
      const g=feat.geometry;
      if(!g||isAntarctica(feat)) return;
      const polys=g.type==='Polygon'?[g.coordinates]:g.type==='MultiPolygon'?g.coordinates:[];
      polys.forEach(poly=>{
        if(poly.some(ringWraps))return;
        const d=poly.map(ringToD).join(' ');
        const p=document.createElementNS(NS,'path');
        p.setAttribute('d',d);
        p.setAttribute('fill','#0B1426');
        p.setAttribute('stroke','none');
        countriesG.appendChild(p);
      });
    });
  }catch(e){console.warn('world-atlas load failed',e);}

  // Plus de bateaux ni d'arcs permanents
  if(shipsG) shipsG.innerHTML='';

  // 2. Chaque port = halo ambré + dot doré (lumières de ville vue de l'espace)
  const ports=GEO_PTS.map((c,i)=>{
    const [cx,cy]=geoProj(c.lon,c.lat);
    const halo=document.createElementNS(NS,'circle');
    halo.setAttribute('cx',cx.toFixed(1));halo.setAttribute('cy',cy.toFixed(1));
    halo.setAttribute('r','4');halo.setAttribute('fill','#FFB42E');halo.setAttribute('opacity','0');
    halo.style.transition='opacity .6s';
    mrkG.appendChild(halo);
    const dot=document.createElementNS(NS,'circle');
    dot.setAttribute('cx',cx.toFixed(1));dot.setAttribute('cy',cy.toFixed(1));
    dot.setAttribute('r','1.4');dot.setAttribute('fill','#FFE066');dot.setAttribute('opacity','0');
    dot.style.transition='opacity .6s';
    mrkG.appendChild(dot);
    setTimeout(()=>{halo.style.opacity='.22';dot.style.opacity='.95';}, 300+i*18);
    return {cx,cy,halo,dot};
  });

  // 3. Ping aléatoire : pulse expansif sur un port + flash du dot
  function pingPort(idx){
    const p=ports[idx];if(!p)return;
    const {cx,cy,halo,dot}=p;
    // Flash du dot/halo
    halo.style.transition='opacity .15s';
    dot.style.transition='opacity .15s';
    halo.style.opacity='.65';dot.style.opacity='1';
    setTimeout(()=>{
      halo.style.transition='opacity .9s';
      dot.style.transition='opacity .9s';
      halo.style.opacity='.22';dot.style.opacity='.95';
    },180);
    // Onde concentrique dorée
    const ring=document.createElementNS(NS,'circle');
    ring.setAttribute('cx',cx.toFixed(1));ring.setAttribute('cy',cy.toFixed(1));
    ring.setAttribute('r','2');ring.setAttribute('fill','none');
    ring.setAttribute('stroke','#FFD24D');ring.setAttribute('stroke-width','1.4');
    ring.setAttribute('opacity','.9');
    mrkG.appendChild(ring);
    const anim=ring.animate([
      {r:'2',opacity:.9,strokeWidth:'1.4'},
      {r:'16',opacity:0,strokeWidth:'.3'}
    ],{duration:1400,easing:'cubic-bezier(.2,.6,.4,1)',fill:'forwards'});
    anim.onfinish=()=>ring.remove();
  }

  // Émission continue : tirage aléatoire pondéré (shuffle queue)
  const queue=[];
  function refillQueue(){
    const idxs=ports.map((_,i)=>i);
    for(let i=idxs.length-1;i>0;i--){
      const j=Math.floor(Math.random()*(i+1));
      [idxs[i],idxs[j]]=[idxs[j],idxs[i]];
    }
    queue.push(...idxs);
  }
  function tick(){
    if(!queue.length) refillQueue();
    pingPort(queue.shift());
  }
  // Burst de démarrage (3 pings rapides)
  for(let i=0;i<3;i++) setTimeout(tick, 600+i*220);
  // Cadence continue : ~3 pings/s pour un effet "live" sans saturation
  setInterval(tick, 340);
}

// IntersectionObserver → start animation when visible
const _geoObs=new IntersectionObserver(entries=>{
  if(entries[0].isIntersecting){initGeoMap();_geoObs.disconnect();}
},{threshold:.15});
const _geoEl=document.getElementById('geo-svg');
if(_geoEl) _geoObs.observe(_geoEl);

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
