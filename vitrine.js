// ─── SECURITY HELPERS ───
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const safeUrl = u => {
  const s = String(u||'').trim();
  if (!/^https?:\/\//i.test(s)) return '';
  return esc(s);
};


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
    alert('Erreur — veuillez réessayer ou écrire à eelbilia@gmail.com');
  }
}

// ─── SCROLL REVEAL ───
(function(){
  const els = document.querySelectorAll('[data-reveal]');
  if(!els.length) return;
  const obs = new IntersectionObserver(entries => {
    entries.forEach(e => {
      if(e.isIntersecting){ e.target.classList.add('visible'); obs.unobserve(e.target); }
    });
  },{threshold:.12,rootMargin:'0px 0px -40px 0px'});
  els.forEach(el => obs.observe(el));
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
    'f-msg':   {required:true, min:10, errMsg:'Message trop court (min. 10 car.)'},
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

    // Pick 1 par qualité dans l'ordre récent, max 20 → 20 papiers différents
    const seen=new Set();
    const picked=[];
    for(const p of verified){
      const q=p.quality||'_';
      if(seen.has(q))continue;
      seen.add(q);
      picked.push(p);
      if(picked.length>=20)break;
    }

    // Split into slides of 10
    const PER_SLIDE=10;
    const slides=[];
    for(let i=0;i<picked.length;i+=PER_SLIDE)slides.push(picked.slice(i,i+PER_SLIDE));
    if(!slides.length)return;

    // Quality labels
    const QL={'R1SC':'Couché 1 face','R2SC':'Couché 2 faces','RADH':'Adhésif','RAFF':'Papier affiche','RBOA':'Carton couché','RBON':'Carton non couché','RBOU':'Bouffant','RCAR':'Autocopiant','RCOL':'Offset couleur','RCUI':'Papier cuisson','RDIV':'Divers / Alu','RFLEX':'Complexe','RKDO':'Papier cadeau','RKRA':'Kraft','RKRABRUN':'Kraft brun','RKRG':'Kraft gomme','RKRR':'Kraft armé','RLINER':'Liner / Testliner','RLUX':'Papier luxe','RLWC':'LWC','RNEW':'Papier journal','ROFF':'Offset','RPAC':'Emballage','RPLA':'Plastique','RSIL':'Silicone / Glassine','RTHERM':'Thermique','RTIS':'Ouate / Tissue','S1SC':'Couché 1 face','S2SC':'Couché 2 faces','SADH':'Adhésif','SAFF':'Papier affiche','SBOA':'Carton couché','SBON':'Carton non couché','SBOU':'Bouffant','SCAR':'Autocopiant','SCOL':'Offset couleur','SCUT':'Ramette','SDIV':'Divers','SENV':'Enveloppes','SKRA':'Kraft','SLUX':'Papier luxe','SNEW':'Papier journal','SOFF':'Offset','SPAC':'Emballage','SPLA':'Plastique','SSBS':'SBS / Carton blanc','SINK':'Encre','UMAC':'Machines','SLWC':'LWC'};

    // Render cards
    function cardHtml(p){
      const q=p.quality||'';
      const title=QL[q]||q||'Produit';
      const det=(p.details||'').replace(/[-–—\s]+/g,' ').trim();
      const fmt=p.format||(p.noyau?'Bobine':'Palette');
      const weight=p.weight?Math.round(p.weight).toLocaleString('fr-FR')+' kg':'—';
      return`<a class="sp-card" href="./index.html"><div class="sp-photo"><img src="${safeUrl(p.image_url)}" alt="${esc(title)}" loading="lazy" onerror="this.parentElement.innerHTML='<div style=\\'display:flex;align-items:center;justify-content:center;height:100%;color:#ccc\\'>Photo sur demande</div>'"></div><div class="sp-body"><div class="sp-name">${esc(title)}</div>${det?`<div class="sp-type">${esc(det.substring(0,35))}${det.length>35?'…':''}</div>`:''}<div class="sp-specs"><span class="sp-spec">${p.gsm?esc(p.gsm+' g/m²'):'—'}</span><span class="sp-spec">${esc(fmt)}</span></div><div class="sp-footer"><span class="sp-weight">${esc(weight)}</span></div></div></a>`;
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
  window.location.href = './index.html' + (q ? '?q=' + encodeURIComponent(q) : '');
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

// Container route indices — recalculated after Africa additions (+7 countries)
// Europe:0-19, Africa:20-35(MA=20,CN_asia=43), ME:36-38, Asia:39-46, Americas:47-54
// US=47, CN=43, BR=51, MA=20
const GEO_SHIP_IDX=[47,43,51,20];

async function initGeoMap(){
  const svg=document.getElementById('geo-svg');
  const countriesG=document.getElementById('geo-countries');
  const arcsG=document.getElementById('geo-arcs');
  const shipsG=document.getElementById('geo-ships');
  const mrkG=document.getElementById('geo-markers');
  if(!svg||!countriesG||!arcsG||!mrkG) return;

  // 1. Render world map via topojson
  try{
    const world=await fetch('https://cdn.jsdelivr.net/npm/world-atlas@2/countries-110m.json').then(r=>r.json());
    const features=topojson.feature(world,world.objects.countries).features;
    function ringToD(ring){
      return ring.map((pt,i)=>{
        const [x,y]=geoProj(pt[0],pt[1]);
        return `${i===0?'M':'L'}${x.toFixed(1)},${y.toFixed(1)}`;
      }).join('')+'Z';
    }
    features.forEach(feat=>{
      const g=feat.geometry;
      if(!g) return;
      const polys=g.type==='Polygon'?[g.coordinates]:g.type==='MultiPolygon'?g.coordinates:[];
      polys.forEach(poly=>{
        const d=poly.map(ringToD).join(' ');
        const p=document.createElementNS('http://www.w3.org/2000/svg','path');
        p.setAttribute('d',d);
        p.setAttribute('fill','#C8C9D1');
        p.setAttribute('stroke','#E2E3EA');
        p.setAttribute('stroke-width','0.4');
        countriesG.appendChild(p);
      });
    });
  }catch(e){console.warn('world-atlas load failed',e);}

  // 2. Draw arcs + markers
  GEO_PTS.forEach((c,i)=>{
    const [cx,cy]=geoProj(c.lon,c.lat);
    const delay=(0.15+i*0.07).toFixed(2);
    const mx=(GEO_FX+cx)/2, my=(GEO_FY+cy)/2;
    const dist=Math.hypot(cx-GEO_FX,cy-GEO_FY);
    const cpY=Math.max(my-dist*0.45,4);
    const d=`M${GEO_FX.toFixed(1)},${GEO_FY.toFixed(1)} Q${mx.toFixed(1)},${cpY.toFixed(1)} ${cx.toFixed(1)},${cy.toFixed(1)}`;
    const arcId=`geo-arc-${i}`;

    // Glow
    const pg=document.createElementNS('http://www.w3.org/2000/svg','path');
    pg.setAttribute('d',d);pg.setAttribute('stroke','#FE0000');pg.setAttribute('stroke-width','4');
    pg.setAttribute('fill','none');pg.setAttribute('stroke-linecap','round');pg.setAttribute('opacity','0');
    arcsG.appendChild(pg);
    const plg=pg.getTotalLength();
    pg.setAttribute('stroke-dasharray',plg);pg.setAttribute('stroke-dashoffset',plg);
    pg.style.setProperty('--pl',plg);pg.style.animation=`arcGlow 1.1s ease-out ${delay}s forwards`;

    // Main arc (named for mpath)
    const p=document.createElementNS('http://www.w3.org/2000/svg','path');
    p.setAttribute('id',arcId);p.setAttribute('d',d);p.setAttribute('stroke','#FE0000');
    p.setAttribute('stroke-width','1.4');p.setAttribute('fill','none');
    p.setAttribute('stroke-linecap','round');p.setAttribute('opacity','0');
    arcsG.appendChild(p);
    const pl=p.getTotalLength();
    p.setAttribute('stroke-dasharray',pl);p.setAttribute('stroke-dashoffset',pl);
    p.style.setProperty('--pl',pl);p.style.animation=`arcDraw 1.1s ease-out ${delay}s forwards`;

    // Dot
    const dot=document.createElementNS('http://www.w3.org/2000/svg','circle');
    dot.setAttribute('cx',cx.toFixed(1));dot.setAttribute('cy',cy.toFixed(1));dot.setAttribute('r','3.5');
    dot.setAttribute('fill','#FE0000');dot.setAttribute('opacity','0');
    dot.style.animation=`dotPop .25s ease-out ${(parseFloat(delay)+1.05).toFixed(2)}s forwards`;
    dot.style.transformOrigin=`${cx.toFixed(1)}px ${cy.toFixed(1)}px`;dot.style.transform='scale(0)';
    mrkG.appendChild(dot);

  });

  // 3. Container icon animations on key routes (SVG symbol #geo-ctr)
  GEO_SHIP_IDX.forEach((ptIdx,si)=>{
    const arcId=`geo-arc-${ptIdx}`;
    if(!document.getElementById(arcId)) return;
    const dur=[18,22,20,14][si];
    const startDelay=(parseFloat((0.15+ptIdx*0.07).toFixed(2))+1.5+si*2).toFixed(1);
    const g=document.createElementNS('http://www.w3.org/2000/svg','g');
    const u=document.createElementNS('http://www.w3.org/2000/svg','use');
    u.setAttribute('href','#geo-ctr');
    u.setAttribute('width','32');u.setAttribute('height','24');
    u.setAttribute('x','-16');u.setAttribute('y','-12');
    g.appendChild(u);
    const am=document.createElementNS('http://www.w3.org/2000/svg','animateMotion');
    am.setAttribute('dur',`${dur}s`);am.setAttribute('begin',`${startDelay}s`);
    am.setAttribute('repeatCount','indefinite');am.setAttribute('rotate','0');
    const mp=document.createElementNS('http://www.w3.org/2000/svg','mpath');
    mp.setAttribute('href',`#${arcId}`);
    am.appendChild(mp);g.appendChild(am);shipsG.appendChild(g);
  });
}

// IntersectionObserver → start animation when visible
const _geoObs=new IntersectionObserver(entries=>{
  if(entries[0].isIntersecting){initGeoMap();_geoObs.disconnect();}
},{threshold:.15});
const _geoEl=document.getElementById('geo-svg');
if(_geoEl) _geoObs.observe(_geoEl);


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
