// ─── SECURITY HELPERS ───
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const safeUrl = u => {
  const s = String(u||'').trim();
  if (!/^https?:\/\//i.test(s)) return '';
  return esc(s);
};


// ─── STOCK ACCESS GATE ───
const STOCK_CODE = 'prodi2026';
function openStock(){
  window.prodiTrack?.('cta_catalogue');
  try{
    if(sessionStorage.getItem('stock_unlocked')==='1'){ window.location.href='/catalogue/'; return; }
  }catch(_){}
  const g=document.getElementById('stock-gate'); if(!g)return;
  window.prodiTrack?.('gate_vue');
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
    window.prodiTrack?.('gate_code_ok');
    try{ sessionStorage.setItem('stock_unlocked','1'); }catch(_){}
    try{ localStorage.setItem('prodi_cat_ok','1'); }catch(_){}
    window.location.href='/catalogue/';
  }else{
    window.prodiTrack?.('gate_code_ko',{essai:code.slice(0,20)});
    if(err) err.textContent='Code invalide. Contactez-nous pour obtenir le code d\'accès.';
  }
}
document.addEventListener('keydown',e=>{
  if(e.key==='Escape'){
    const g=document.getElementById('stock-gate');
    if(g && g.style.display!=='none') closeStockGate();
  }
});

// ─── TRACKING CONTACTS : un listener délégué couvre TOUS les liens WhatsApp/
// tél/mailto (sticky, section contact, footer, futurs). Capture = l'événement
// part avant l'ouverture du lien.
document.addEventListener('click',e=>{
  const a=e.target.closest&&e.target.closest('a[href]');if(!a)return;
  const h=a.getAttribute('href')||'';
  let ev=null;
  if(h.indexOf('wa.me')>-1)ev='whatsapp_click';
  else if(h.indexOf('tel:')===0)ev='tel_click';
  else if(h.indexOf('mailto:')===0)ev='email_click';
  if(!ev)return;
  const via=a.classList.contains('wa-sticky')?'sticky'
    :a.closest('#contact-section')?'contact'
    :a.closest('footer')?'footer':'page';
  window.prodiTrack?.(ev,{via:via});
},true);

// ─── PAGE NAVIGATION ───
function showPage(id) {
  // Sous-pages SEO (/produits/, /histoire/, /contact/) : pas de moteur de
  // pages → navigation réelle vers l'URL correspondante
  if (!document.getElementById('page-home')) {
    location.href = id==='contact' ? '/contact/' : id==='about' ? '/histoire/' : '/';
    return;
  }
  if (id === 'contact') window.prodiTrack?.('contact_vue');
  if (id === 'about' || id === 'contact') {
    document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
    document.getElementById('page-home').classList.add('active');
    document.querySelectorAll('.hd-nav a').forEach(a => a.classList.remove('active'));
    document.getElementById('nav-'+id)?.classList.add('active');
    const target = id === 'about' ? 'about-section' : 'contact-section';
    // section absente de l'accueil (ex. Histoire retirée) → vraie page
    if (!document.getElementById(target)) {
      location.href = id === 'about' ? '/histoire/' : '/contact/';
      return;
    }
    setTimeout(() => {
      const el = document.getElementById(target);
      el?.scrollIntoView({behavior:'smooth'});
      // Safari : les images lazy chargées PENDANT le défilement décalent la
      // cible → re-calage discret une fois le scroll terminé
      setTimeout(() => {
        const r = el?.getBoundingClientRect();
        if (r && Math.abs(r.top) > 40) el.scrollIntoView();
      }, 1200);
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
  // Champs Entreprise/Email retirés du formulaire (29/07) — colonnes Supabase
  // conservées, envoyées vides
  const soc = document.getElementById('f-soc')?.value.trim() || '';
  const email = document.getElementById('f-email')?.value.trim() || '';
  // Préfixe indicatif seulement si un numéro est saisi et qu'il n'en a pas
  // déjà (clients export : ne pas forcer +33 ; champ vide : ne rien stocker).
  const _telRaw = document.getElementById('f-tel').value.trim();
  const _telCode=(document.getElementById('f-tel')?.dataset.cc)||'+33';
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
    btn.textContent = 'On vous rappelle';
    alert('Erreur — veuillez réessayer ou écrire à contact@prodi.com');
  }
}

// Confirmation maison « Bien reçu. » (coche animée, partagée popup/bandeau)
const OK_HTML='<div class="ok-box"><svg class="ok-check" viewBox="0 0 52 52" aria-hidden="true"><circle cx="26" cy="26" r="25"/><path d="M14 27l8 8 16-16"/></svg><div class="ok-t">Bien re\u00e7u.</div><div class="ok-s">On vous rappelle tr\u00e8s vite.</div></div>';

// ─── SÉLECTEUR D'INDICATIF PAYS (champs Téléphone) : bouton drapeau+code,
// panneau avec RECHERCHE (taper « fran » → France). Le code choisi est posé
// sur input.dataset.cc, consommé au submit pour préfixer les numéros nus. ───
const CC_PAYS=[["France","fr","+33"],["Maroc","ma","+212"],["Algérie","dz","+213"],["Tunisie","tn","+216"],
["Libye","ly","+218"],["Mauritanie","mr","+222"],["Sénégal","sn","+221"],["Côte d'Ivoire","ci","+225"],
["Ghana","gh","+233"],["Nigeria","ng","+234"],["Cameroun","cm","+237"],["Égypte","eg","+20"],
["Kenya","ke","+254"],["Afrique du Sud","za","+27"],["Mali","ml","+223"],["Niger","ne","+227"],
["Tchad","td","+235"],["Togo","tg","+228"],["Bénin","bj","+229"],["Guinée","gn","+224"],
["RD Congo","cd","+243"],["Congo","cg","+242"],["Gabon","ga","+241"],["Madagascar","mg","+261"],
["Burkina Faso","bf","+226"],["Djibouti","dj","+253"],["Belgique","be","+32"],["Espagne","es","+34"],
["Italie","it","+39"],["Allemagne","de","+49"],["Portugal","pt","+351"],["Royaume-Uni","gb","+44"],
["Suisse","ch","+41"],["Pays-Bas","nl","+31"],["Pologne","pl","+48"],["Roumanie","ro","+40"],
["Grèce","gr","+30"],["Turquie","tr","+90"],["Émirats arabes unis","ae","+971"],["Arabie saoudite","sa","+966"],
["Qatar","qa","+974"],["Israël","il","+972"],["Liban","lb","+961"],["Jordanie","jo","+962"],
["Canada","ca","+1"],["États-Unis","us","+1"],["Mexique","mx","+52"],["Brésil","br","+55"],
["Colombie","co","+57"],["Argentine","ar","+54"],["Chili","cl","+56"],["Pérou","pe","+51"],
["Chine","cn","+86"],["Inde","in","+91"]];
function ccFlag(iso){return iso.toUpperCase().replace(/./g,c=>String.fromCodePoint(127397+c.charCodeAt(0)));}
function ccInit(inputId){
  const inp=document.getElementById(inputId);
  if(!inp||inp.closest('.tel-wrap')) return;
  inp.dataset.cc='+33';
  const wrap=document.createElement('div');wrap.className='tel-wrap';
  inp.parentNode.insertBefore(wrap,inp);
  const btn=document.createElement('button');btn.type='button';btn.className='tel-cc';
  btn.innerHTML='<span>'+ccFlag('fr')+'</span> +33';
  wrap.appendChild(btn);wrap.appendChild(inp);
  const pan=document.createElement('div');pan.className='tel-cc-pan';
  pan.innerHTML='<input type="text" class="tel-cc-search" placeholder="Pays ou indicatif (+245)…" aria-label="Rechercher un pays ou saisir un indicatif">'
    +'<button type="button" class="tel-cc-custom" style="display:none"></button>'
    +'<div class="tel-cc-list">'+CC_PAYS.map((c,i)=>
      '<button type="button" data-i="'+i+'"><span>'+ccFlag(c[1])+'</span>'+c[0]+' <em>'+c[2]+'</em></button>').join('')+'</div>';
  wrap.appendChild(pan);
  const search=pan.querySelector('.tel-cc-search');
  const custom=pan.querySelector('.tel-cc-custom');
  function setCC(code,iso){
    inp.dataset.cc=code;
    btn.innerHTML='<span>'+(iso?ccFlag(iso):'🌐')+'</span> '+code;
    pan.classList.remove('open');
    inp.focus();
  }
  function asDial(q){
    const d=(q||'').replace(/[^\d+]/g,'');
    if(/^\+\d{1,4}$/.test(d)) return d;
    if(/^00\d{1,4}$/.test(d)) return '+'+d.slice(2);
    if(/^\d{1,4}$/.test(d)) return '+'+d;
    return null;
  }
  btn.addEventListener('click',()=>{
    pan.classList.toggle('open');
    if(pan.classList.contains('open')){search.value='';filtre('');setTimeout(()=>search.focus(),40);}
  });
  const norm=t=>t.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'');
  function filtre(q){
    const nq=norm(q);
    pan.querySelectorAll('.tel-cc-list button').forEach(b=>{
      const c=CC_PAYS[+b.dataset.i];
      b.style.display=(!nq||norm(c[0]).includes(nq)||c[2].includes(nq))?'':'none';
    });
    const dial=asDial(q);
    if(dial && !CC_PAYS.some(c=>c[2]===dial)){
      custom.textContent='Utiliser « '+dial+' »';
      custom.dataset.code=dial;
      custom.style.display='';
    } else custom.style.display='none';
  }
  search.addEventListener('input',()=>filtre(search.value));
  search.addEventListener('keydown',e=>{
    if(e.key!=='Enter') return;
    e.preventDefault();
    const dial=asDial(search.value);
    if(dial && !CC_PAYS.some(c=>c[2]===dial)){ setCC(dial,null); return; }
    const vis=[...pan.querySelectorAll('.tel-cc-list button')].filter(b=>b.style.display!=='none');
    if(vis.length) vis[0].click();
  });
  custom.addEventListener('click',()=>setCC(custom.dataset.code,null));
  pan.querySelectorAll('.tel-cc-list button').forEach(b=>b.addEventListener('click',()=>{
    const c=CC_PAYS[+b.dataset.i];
    setCC(c[2],c[1]);
  }));
  document.addEventListener('click',e=>{
    if(!wrap.contains(e.target)) pan.classList.remove('open');
  });
}
ccInit('f-tel');ccInit('l-tel');ccInit('r-tel');

// ─── POPUP LEAD : une fois par session. Accueil = quand on a DÉPASSÉ la
// section produits (#apercu sortie par le haut) ; page /produits/ = après 8 s ───
(function(){
  const modal=document.getElementById('lead-modal');
  if(!modal) return;
  // ?popup=1 : forcer l'affichage (test) malgré le verrou de session
  const force=location.search.indexOf('popup=1')>-1;
  try{ if(!force&&sessionStorage.getItem('lead_popup')==='1') return; }catch(_){}
  let done=false;
  const ouvrir=()=>{
    if(done) return; done=true;
    modal.classList.add('open'); document.body.style.overflow='hidden';
    window.prodiTrack?.('lead_popup_vue');
    try{sessionStorage.setItem('lead_popup','1');}catch(_){}
  };
  if(force){ setTimeout(ouvrir,800); return; }
  const hero=document.querySelector('.hero');
  if(document.getElementById('page-home')&&hero){
    // accueil : 5 s après avoir DÉPASSÉ le hero
    const obs=new IntersectionObserver(es=>{
      if(!es[0].isIntersecting){
        obs.disconnect(); setTimeout(ouvrir,5000);
      }
    },{threshold:0});
    obs.observe(hero);
  } else if(document.getElementById('apercu')){
    // page /produits/ : après 5 s
    setTimeout(ouvrir,5000);
  }
  document.addEventListener('keydown',e=>{if(e.key==='Escape')leadClose();});
})();
function leadClose(){
  document.getElementById('lead-modal')?.classList.remove('open');
  document.body.style.overflow='';
}
async function submitLead(e){
  e.preventDefault();
  if(document.getElementById('l-hp')?.value) return;
  const nom=document.getElementById('l-nom').value.trim();
  const _lt=document.getElementById('l-tel');
  let tel=_lt.value.trim();
  if(!nom||tel.length<6) return;
  if(!/^(\+|00)/.test(tel)) tel=(_lt.dataset.cc||'+33')+' '+tel;
  const btn=document.getElementById('l-submit');
  btn.disabled=true; btn.textContent='…';
  try{
    const r=await fetch(SURL+'/rest/v1/proforma_requests',{method:'POST',
      headers:{'apikey':SKEY,'Authorization':'Bearer '+SKEY,'Content-Type':'application/json','Prefer':'return=minimal'},
      body:JSON.stringify({nom,societe:'',email:'',telephone:tel,
        message:'Demande de rappel (popup)',
        quantite_souhaitee:'Contact vitrine',statut:'vitrine_contact'})});
    if(!r.ok) throw new Error('HTTP '+r.status);
    window.prodiTrack?.('contact_envoye',{via:'popup'});
    document.getElementById('lead-form').outerHTML=OK_HTML;
    setTimeout(leadClose,2200);
  }catch(err){
    btn.disabled=false; btn.textContent='On vous rappelle';
    alert('Erreur — veuillez réessayer ou écrire à contact@prodi.com');
  }
}

// ─── BANDEAU RAPPEL (mini contact) : même table Supabase que le formulaire ───
async function submitRappel(e){
  e.preventDefault();
  if(document.getElementById('r-hp')?.value) return;
  const nom=document.getElementById('r-nom').value.trim();
  const _rt=document.getElementById('r-tel');
  let tel=_rt.value.trim();
  if(!nom||tel.length<6) return;
  if(!/^(\+|00)/.test(tel)) tel=(_rt.dataset.cc||'+33')+' '+tel;
  const btn=document.getElementById('r-submit');
  btn.disabled=true; btn.textContent='…';
  try{
    const r=await fetch(SURL+'/rest/v1/proforma_requests',{method:'POST',
      headers:{'apikey':SKEY,'Authorization':'Bearer '+SKEY,'Content-Type':'application/json','Prefer':'return=minimal'},
      body:JSON.stringify({nom,societe:'',email:'',telephone:tel,
        message:'Demande de rappel (bandeau)',quantite_souhaitee:'Contact vitrine',statut:'vitrine_contact'})});
    if(!r.ok) throw new Error('HTTP '+r.status);
    window.prodiTrack?.('contact_envoye',{via:'bandeau'});
    document.getElementById('rappel-form').innerHTML=OK_HTML;
  }catch(err){
    btn.disabled=false; btn.textContent='On vous rappelle';
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
    'f-tel':   {required:true, min:6, errMsg:'Téléphone requis'},
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


/* ── 6 CATÉGORIES en mosaïque façon apple.com : photo studio PLEIN CADRE
      (Unsplash — pas de photos du dépôt), titre + sous-titre + 2 petits CTA
      capsule par-dessus, voile dégradé en haut pour la lisibilité. ── */
(function(){
  const wrap=document.getElementById('qtiles');
  if(!wrap)return;
  const U='https://images.unsplash.com/', P='?q=65&auto=format&fit=crop&w=1100';
  // Alternance damier clair/sombre (2 colonnes)
  // verso = texte rédigé par tuile, à partir des détails réellement en stock
  // (top du champ details du catalogue par famille, bobines + formats confondus)
  const TILES=[
    {code:'ROFF',    slug:'offset',    title:'Offset',        sub:'Le blanc de référence, du livre à la notice.',            img:U+'flagged/photo-1562221054-cdc9dc299068'+P, pos:'center 60%', dark:false,
     verso:['Du blanc courant aux blancs les plus lumineux','Blancheurs CIE de 120 à 170','Notice, bristol, satiné ou rugueux','En bobines comme en formats']},
    {code:'RKRABRUN',slug:'kraft',title:'Kraft',         sub:'Le naturel résistant du sac et de l\'emballage.',          img:U+'photo-1777566131325-78f6e12c50b7'+'?q=60&auto=format&fit=crop&w=900', pos:'center 50%', dark:true,
     verso:['Du 100 % recyclé à la pure pâte','Finition frictionnée MG ou machine MF','Krafts spéciaux pour enveloppe','Le brun de l\'emballage sous toutes ses formes']},
    {code:'R2SC',    slug:'papier-couche',    title:'Papier couché', sub:'Le papier des magazines, catalogues et brochures.',       img:U+'photo-1515891396453-6d7e56096a39'+P, pos:'center 55%', dark:false,
     verso:['Brillant, demi-mat ou mat','Séries recyclées','Magazines, catalogues et brochures','En bobines comme en formats']},
    {code:'RBOA',    slug:'carton-couche',    title:'Carton couché', sub:'Le carton du packaging et de la belle boîte.',            img:U+'photo-1595246135406-803418233494'+P, pos:'center 55%', dark:true,
     verso:['GC1 dos blanc · GC2 dos crème','GD2 dos gris · GT4 & CKB dos kraft','Face aluminium pour l\'emballage alimentaire','Le carton du packaging et de la belle boîte']},
    {code:'RLUX',    slug:'papier-creations',    title:'Papier créations', sub:'Papiers de caractère : teintes, textures, finitions.', img:U+'photo-1586207036106-90aae2456ccb'+P, pos:'center 50%', dark:true,
     verso:['Calque','Vergé blanc ou ivoire','Martelé','Chromolux une face','Papiers sécurité : fibres invisibles ou filigranés']},
    {code:'RCAR',    slug:'autocopiant',    title:'Autocopiant',   sub:'Liasses sans carbone, prêtes à imprimer.',                img:U+'photo-1579808324991-cecc784498cc'+P, pos:'center 55%', dark:true,
     verso:['Trois feuillets : CB, CFB et CF','Rames prêtes à assembler en liasses','Séries spéciales impression digitale']},
  ];
  wrap.innerHTML=TILES.map((t,i)=>`
    <div class="qtile${t.dark?' dark':''}" id="qtile-${i}">
      <div class="qtile-flip">
        <div class="qtile-inner qtile-front">
          <h3 class="qtile-title">${esc(t.title)}</h3>
          <div class="qtile-btns">
            <a href="./catalogue/" class="qtile-btn qtile-btn-white" onclick="window.prodiTrack?.('qualite_plus',{q:'${esc(t.code)}'});qtileFlip(${i},1);return false;">En savoir +</a>
          </div>
        </div>
        <div class="qtile-inner qtile-backface">
          <h3 class="qtile-title qtile-title-sm">${esc(t.title)}</h3>
          <ul class="qtile-list">${t.verso.map(v=>`<li>${esc(v)}</li>`).join('')}</ul>
          <div class="qtile-btns">
            <a href="#contact" class="qtile-btn qtile-btn-red" onclick="qtileDevis('${esc(t.code)}','${esc(t.title)}');return false;">Demander un devis →</a>
            <a href="/${t.slug}/" class="qtile-btn qtile-btn-out qtile-more" onclick="window.prodiTrack?.('qualite_page',{q:'${esc(t.code)}'})"><span class="qm-full">Encore plus de précisions →</span><span class="qm-dots">···</span></a>
            <button type="button" class="qtile-btn qtile-btn-out" onclick="qtileFlip(${i},0)">Retour</button>
          </div>
        </div>
      </div>
      <div class="qtile-imgzone"><img class="qtile-bg" src="${t.img}" alt="${esc(t.title)}" loading="lazy" style="object-position:${t.pos}"></div>
    </div>`).join('');

  // Autres familles à +100 réfs au catalogue (bobines + formats confondus),
  // triées par nombre de références — cartes défilantes façon apple.com
  const CARDS=[
    {code:'COL',  slug:'offset-couleur', title:'Offset couleur',    img:U+'photo-1716471330459-063b3baf247e'+P},
    {code:'BOU',  slug:'bouffant', title:'Bouffant',          img:U+'photo-1457369804613-52c61a468e7d'+P},
    {code:'ADH',  slug:'papier-adhesif', title:'Adhésif',           img:U+'photo-1569725730478-a2f4a1809bb4'+P},
    {code:'CUT',  slug:'ramette', title:'Ramette',           img:U+'photo-1573978828027-e830975e272c'+P},
    {code:'LINER',slug:'liner-testliner', title:'Liner / Testliner', img:U+'photo-1640193698858-31565d448f90'+P},
    {code:'FLEX', slug:'complexe-pe', title:'Complexe / PE',     img:U+'photo-1677586883848-695b3ad692b4'+P},
    {code:'MORE', title:'Voir tout le stock', img:U+'photo-1719529216596-d7c76431ee0d'+P, more:true},
  ];
  const cwrap=document.getElementById('qcards');
  if(cwrap){
    const html=CARDS.map(c=>c.more?`
    <div class="qcard" onclick="window.prodiTrack?.('qualite_plus',{q:'${esc(c.code)}'});openStock();">
      <img src="${c.img}" alt="${esc(c.title)}" loading="lazy">
      <button class="qcard-btn" type="button" onclick="event.stopPropagation();window.prodiTrack?.('qualite_stock',{q:'${esc(c.code)}'});openStock();">Voir tout le stock →</button>
    </div>`:`
    <div class="qcard" onclick="window.prodiTrack?.('qualite_plus',{q:'${esc(c.code)}'});openStock();">
      <img src="${c.img}" alt="${esc(c.title)}" loading="lazy">
      <span class="qcard-title">${esc(c.title)}</span>
      <a class="qcard-btn" href="/${c.slug}/" onclick="event.stopPropagation();window.prodiTrack?.('qualite_page',{q:'${esc(c.code)}'})">En savoir +</a>
    </div>`).join('');
    // Boucle infinie : 3 copies des cartes, le scroll reste dans la copie
    // centrale — jamais de bout de piste, donc jamais de vide
    cwrap.innerHTML=html+html+html;
    const setW=()=>{const c=cwrap.firstElementChild;return c?CARDS.length*(c.getBoundingClientRect().width+12):0;};
    const recentre=()=>{
      const w=setW(), x=cwrap.scrollLeft;
      if(!w) return;
      if(x<w*0.5) cwrap.scrollLeft=x+w;
      else if(x>=w*1.5) cwrap.scrollLeft=x-w;
    };
    cwrap.scrollLeft=setW();
    cwrap.addEventListener('scroll',recentre,{passive:true});
    window.addEventListener('resize',recentre);

    // Points de pagination façon apple.com : la pilule active se remplit
    // pendant PERIOD ms puis le bandeau avance d'une carte (durée = celle
    // de l'animation CSS qdotfill, à garder synchro)
    const dots=document.getElementById('qcards-dots');
    const PERIOD=4400, N=CARDS.length;
    const step=()=>{const c=cwrap.firstElementChild;return c?c.getBoundingClientRect().width+12:512;};
    const curIdx=()=>((Math.round(cwrap.scrollLeft/step())%N)+N)%N;
    const still=matchMedia('(prefers-reduced-motion: reduce)').matches;
    let tmr=null, onScreen=false, lastIdx=-1;
    function paintDots(){
      if(!dots) return;
      const i=curIdx();
      dots.innerHTML=CARDS.map((c,j)=>
        `<button class="qdot${j===i?' on':''}${still?' still':''}" aria-label="${esc(c.title)}" onclick="qcardsGoto(${j})"></button>`).join('');
    }
    function arm(){
      if(still||!dots) return;
      clearTimeout(tmr);
      tmr=setTimeout(()=>{
        if(onScreen&&document.visibilityState==='visible') cwrap.scrollBy({left:step(),behavior:'smooth'});
        else arm();
      },PERIOD);
    }
    window.qcardsGoto=j=>{
      const d=((j-curIdx())%N+N)%N;
      cwrap.scrollBy({left:(d>N/2?d-N:d)*step(),behavior:'smooth'});
    };
    cwrap.addEventListener('scroll',()=>{
      const i=curIdx();
      if(i!==lastIdx){lastIdx=i;paintDots();arm();}
    },{passive:true});
    cwrap.addEventListener('pointerdown',()=>clearTimeout(tmr));
    cwrap.addEventListener('pointerup',arm);
    document.addEventListener('visibilitychange',()=>{
      if(document.visibilityState==='visible'){paintDots();arm();} else clearTimeout(tmr);
    });
    new IntersectionObserver(es=>{
      onScreen=es[0].isIntersecting;
      if(onScreen){paintDots();arm();} else clearTimeout(tmr);
    },{threshold:.3}).observe(cwrap);
    lastIdx=curIdx();paintDots();arm();
  }
})();

// ─── BANDEAU TÉMOIGNAGES : même mécanique que le bandeau qualités
// (boucle infinie 3 copies, tirets à remplissage, avance page par page) ───
(function(){
  const rail=document.getElementById('temoin-rail');
  const dots=document.getElementById('temoin-dots');
  if(!rail) return;
  const N=rail.children.length, GAP=20, PERIOD=5500; // 2000 → 5500 (05/08) : à 2 s le bandeau « part n'importe comment » sur grand écran (téléport de boucle en pleine anim)
  rail.innerHTML=rail.innerHTML+rail.innerHTML+rail.innerHTML;
  const step=()=>{const c=rail.firstElementChild;return c?c.getBoundingClientRect().width+GAP:400;};
  const setW=()=>N*step();
  const recentre=()=>{
    const w=setW(), x=rail.scrollLeft;
    if(!w) return;
    if(x<w*0.5) rail.scrollLeft=x+w;
    else if(x>=w*1.5) rail.scrollLeft=x-w;
  };
  rail.scrollLeft=setW();
  rail.addEventListener('scroll',recentre,{passive:true});
  window.addEventListener('resize',recentre);
  const curIdx=()=>((Math.round(rail.scrollLeft/step())%N)+N)%N;
  const still=matchMedia('(prefers-reduced-motion: reduce)').matches;
  let tmr=null,onScreen=false,lastIdx=-1;
  function paintDots(){
    if(!dots) return;
    const i=curIdx();
    dots.innerHTML=Array.from({length:N},(_,j)=>
      `<button class="qdot${j===i?' on':''}${still?' still':''}" aria-label="Témoignage ${j+1}" onclick="temoinGoto(${j})"></button>`).join('');
  }
  function arm(){
    if(still) return;
    clearTimeout(tmr);
    tmr=setTimeout(()=>{
      if(onScreen&&document.visibilityState==='visible') rail.scrollBy({left:step(),behavior:'smooth'});
      else arm();
    },PERIOD);
  }
  window.temoinGoto=j=>{
    const d=((j-curIdx())%N+N)%N;
    rail.scrollBy({left:(d>N/2?d-N:d)*step(),behavior:'smooth'});
  };
  rail.addEventListener('scroll',()=>{
    const i=curIdx();
    if(i!==lastIdx){lastIdx=i;paintDots();arm();}
  },{passive:true});
  rail.addEventListener('pointerdown',()=>clearTimeout(tmr));
  rail.addEventListener('pointerup',arm);
  document.addEventListener('visibilitychange',()=>{
    if(document.visibilityState==='visible'){paintDots();arm();} else clearTimeout(tmr);
  });
  new IntersectionObserver(es=>{
    onScreen=es[0].isIntersecting;
    if(onScreen){paintDots();arm();} else clearTimeout(tmr);
  },{threshold:.3}).observe(rail);
  lastIdx=curIdx();paintDots();arm();
})();

// Retourne le bloc texte d'une tuile qualité (recto = accroche, verso = détails)
function qtileFlip(i,on){
  const t=document.getElementById('qtile-'+i);
  if(t) t.classList.toggle('flipped',!!on);
}

// « En savoir + » des cartes du bandeau → formulaire de contact prérempli
function qtileDevis(code,titre){
  window.prodiTrack?.('qualite_devis',{q:code});
  showPage('contact');
  const m=document.getElementById('f-msg');
  if(m&&!m.value.trim()) m.value='Bonjour, je souhaite un devis pour vos produits '+titre+'.';
}
function qcardForm(code,titre){
  window.prodiTrack?.('qualite_form',{q:code});
  showPage('contact');
  const m=document.getElementById('f-msg');
  if(m&&!m.value.trim()) m.value='Bonjour, je souhaite en savoir plus sur vos produits '+titre+'.';
}

// « En savoir + » du bloc presse internationale → retourne la carte (verso pays)
function geoFlip(on){
  if(on) window.prodiTrack?.('inter_plus');
  document.getElementById('geo-card')?.classList.toggle('flipped',!!on);
}
function geoContact(){
  window.prodiTrack?.('inter_form');
  showPage('contact');
  const m=document.getElementById('f-msg');
  if(m&&!m.value.trim()) m.value='Bonjour, je souhaite être livré à l\'international. Pouvez-vous me recontacter ?';
}

// Flip d'ENTRÉE du bloc presse : la carte arrive en se retournant du verso
// vers le recto (on a vu le dos une fois → on sait qu'elle se retourne)
(function(){
  const card=document.getElementById('geo-card');
  if(!card) return;
  // coin corné oblige : toute la photo retourne au clic
  card.querySelector('.geo-front')?.addEventListener('click',()=>geoFlip(1));
  // et côté verso, un clic n'importe où (hors boutons/liens) re-retourne
  card.querySelector('.geo-backface')?.addEventListener('click',e=>{
    if(e.target.closest('a,button')) return;
    geoFlip(0);
  });
  if(matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  card.classList.add('gintro');
  new IntersectionObserver((es,obs)=>{
    if(es[0].isIntersecting){
      setTimeout(()=>card.classList.remove('gintro'),350);
      obs.disconnect();
    }
  },{threshold:.45}).observe(card);
})();

// « Voir l'équipe » (carte Leadership) → popup organigramme
function equipeOpen(){
  window.prodiTrack?.('equipe_view');
  document.getElementById('equipe-modal')?.classList.add('open');
  document.body.style.overflow='hidden';
}
function equipeClose(){
  document.getElementById('equipe-modal')?.classList.remove('open');
  document.body.style.overflow='';
}

// Cartes Logistique/Stock : clic n'importe où = flip (recto ET verso, hors boutons)
(function(){
  ['log','stock'].forEach(id=>{
    const card=document.getElementById('pcard-'+id);
    if(!card) return;
    card.querySelector('.pcard-front')?.addEventListener('click',e=>{
      if(e.target.closest('button')) return;
      pcardFlip(id,1);
    });
    card.querySelector('.pcard-back')?.addEventListener('click',e=>{
      if(e.target.closest('button')) return;
      pcardFlip(id,0);
    });
  });
})();

// « En savoir + » des cartes Logistique/Stock → recto/verso
function pcardFlip(id,on){
  if(on) window.prodiTrack?.('pcard_plus',{q:id});
  document.getElementById('pcard-'+id)?.classList.toggle('flipped',!!on);
}

// ─── REAL GLOBE (orthographic, silhouette only) — EN ROTATION ───
async function initGlobe(){
  const land=document.getElementById('globe-land');
  if(!land||land._spinning) return;
  const NS='http://www.w3.org/2000/svg';
  // Globe plein (silhouette continents blancs sur disque bleu)
  const CX=160, CY=160, R=148;
  const lat0_deg=15;                 // légère inclinaison, cadre l'hémisphère nord
  const lat0=lat0_deg*Math.PI/180;
  const sinL=Math.sin(lat0), cosL=Math.cos(lat0);
  const LON0_START=-30;              // départ centré Atlantique (Amériques/Europe/Afrique)
  const SPEED=8;                     // deg/s ; lon0 DÉCROÎT = rotation vers l'est (naturelle)

  // Projection orthographique paramétrée par la longitude centrale (rotation).
  function proj(lon,lat,lon0){
    const λ=lon*Math.PI/180 - lon0;
    const φ=lat*Math.PI/180;
    const cosP=Math.cos(φ), sinP=Math.sin(φ);
    const cosΛ=Math.cos(λ), sinΛ=Math.sin(λ);
    const x=cosP*sinΛ;
    const y=cosL*sinP - sinL*cosP*cosΛ;
    const z=sinL*sinP + cosL*cosP*cosΛ;
    return [CX + R*x, CY - R*y, z];
  }
  // Un anneau → path. Les points de la face cachée (z<0) sont PLAQUÉS sur le
  // limbe (projetés sur le cercle) au lieu de couper le tracé : plus de cordes
  // droites qui « cassent » le globe pendant la rotation. Anneau entièrement
  // caché = sauté.
  function ringToD(ring,lon0){
    let d='', any=false;
    for(const pt of ring){
      let [x,y,z]=proj(pt[0],pt[1],lon0);
      if(z<0){
        const dx=x-CX, dy=y-CY, len=Math.hypot(dx,dy)||1;
        x=CX+dx/len*R; y=CY+dy/len*R;   // clamp sur le cercle
      } else any=true;
      d+=(d?'L':'M')+x.toFixed(1)+','+y.toFixed(1);
    }
    if(!any) return '';                  // tout caché : rien à dessiner
    return d+'Z';
  }

  // ── Land : on aplatit tous les continents en une liste d'anneaux (une fois),
  //    puis on redessine UN seul path par frame en tournant lon0. ──
  const rings=[];
  try{
    const world=await fetch('https://cdn.jsdelivr.net/npm/world-atlas@2/countries-110m.json').then(r=>r.json());
    const features=topojson.feature(world,world.objects.countries).features;
    features.forEach(feat=>{
      const g=feat.geometry; if(!g)return;
      const name=(feat.properties&&(feat.properties.name||feat.properties.NAME))||'';
      if(/antarctica|antarctique/i.test(name))return;
      const polys=g.type==='Polygon'?[g.coordinates]:g.type==='MultiPolygon'?g.coordinates:[];
      polys.forEach(poly=>poly.forEach(ring=>rings.push(ring)));
    });
  }catch(e){console.warn('globe land failed',e);return;}
  if(!rings.length)return;

  const path=document.createElementNS(NS,'path');
  land.appendChild(path);
  land._spinning=true;

  const reduce=window.matchMedia&&window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const draw=lon0deg=>{
    const lon0=lon0deg*Math.PI/180, parts=[];
    for(const ring of rings){ const d=ringToD(ring,lon0); if(d)parts.push(d); }
    path.setAttribute('d',parts.join(''));
  };

  if(reduce){ draw(LON0_START); return; }   // pas d'animation si mouvement réduit
  let running=true, last=-1;
  function frame(now){
    if(!running)return;
    if(now-last>=33){ last=now; draw(LON0_START-(now/1000)*SPEED); } // ~30 fps
    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);
  // Pause quand le globe sort de l'écran (économie CPU).
  const svg=document.getElementById('globe-svg');
  if(svg&&'IntersectionObserver' in window){
    new IntersectionObserver(es=>{
      const vis=es[0].isIntersecting;
      if(vis&&!running){ running=true; requestAnimationFrame(frame); }
      else if(!vis) running=false;
    },{threshold:0}).observe(svg);
  }
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

// ─── HERO : UN SEUL bonjour à la fois — 8 langues les plus parlées au monde,
// apparition en gris discret à une position aléatoire (fondu 1s), jamais sur
// le bloc texte ni la vidéo. Pas de fond rempli de mots.
(function(){
  var hero=document.querySelector('.hero');if(!hero)return;
  // Ordre FIXE demandé : Hello → arabe → espagnol → chinois → russe, puis la suite.
  var words=['Hello','مرحبا','Hola','你好','Привет','Bonjour','नमस्ते','Olá'];
  var wrap=document.createElement('div');wrap.className='hero-hellos';wrap.setAttribute('aria-hidden','true');
  var s=document.createElement('span');s.className='hero-hello';wrap.appendChild(s);
  hero.insertBefore(wrap,hero.firstChild);
  var zones=[];
  function mesure(){
    zones=[];var hr=hero.getBoundingClientRect();
    ['.hero-text','.hero-video-wrap'].forEach(function(sel){
      var el=hero.querySelector(sel);
      if(el&&hr.width&&hr.height){var b=el.getBoundingClientRect();
        zones.push({x1:(b.left-hr.left)/hr.width*100-5,x2:(b.right-hr.left)/hr.width*100+5,
                    y1:(b.top-hr.top)/hr.height*100-7,y2:(b.bottom-hr.top)/hr.height*100+7});}
    });
  }
  mesure();window.addEventListener('resize',mesure);
  function libre(x,y){for(var z=0;z<zones.length;z++){var v=zones[z];
    if(x>v.x1&&x<v.x2&&y>v.y1&&y<v.y2)return false;}return true;}
  var last=-1;
  function place(){
    last=(last+1)%words.length;var w=last;
    var x,y,tries=0;
    do{x=8+Math.random()*84;y=16+Math.random()*74;tries++;}while(!libre(x,y)&&tries<40);
    if(tries>=40)return;
    s.textContent=words[w];
    s.style.left=x+'%';s.style.top=y+'%';
    s.style.fontSize=(26+Math.random()*10)+'px';
    s.classList.add('on');
  }
  if(window.matchMedia&&window.matchMedia('(prefers-reduced-motion: reduce)').matches)return;
  var timer=null;
  function cycle(){s.classList.remove('on');setTimeout(place,1000);}
  function start(){if(!timer){place();timer=setInterval(cycle,3400);}}
  function stop(){if(timer){clearInterval(timer);timer=null;s.classList.remove('on');}}
  if('IntersectionObserver' in window){
    new IntersectionObserver(function(es){es[0].isIntersecting?start():stop();},{threshold:.1}).observe(hero);
  }else start();
})();

// ─── POP TRADUCTION : visiteur non francophone → petit pop dans SA langue,
// bouton = ouvre le site traduit par Google (proxy translate.goog). Refus
// mémorisé (localStorage), tracké trad_prompt / trad_click / trad_non.
(function(){
  var MSG={
    en:['This site is in French — view it in English?','Translate','No thanks'],
    es:['Este sitio está en francés — ¿verlo en español?','Traducir','No, gracias'],
    ar:['هذا الموقع بالفرنسية — هل تريد ترجمته إلى العربية؟','ترجمة','لا شكراً'],
    ru:['Сайт на французском — перевести на русский?','Перевести','Нет, спасибо'],
    ro:['Site-ul este în franceză — îl vezi în română?','Tradu','Nu, mulțumesc'],
    el:['Ο ιστότοπος είναι στα γαλλικά — μετάφραση στα ελληνικά;','Μετάφραση','Όχι, ευχαριστώ'],
    tr:['Bu site Fransızca — Türkçe görüntülemek ister misiniz?','Çevir','Hayır'],
    de:['Diese Seite ist auf Französisch — auf Deutsch ansehen?','Übersetzen','Nein, danke'],
    it:['Questo sito è in francese — vederlo in italiano?','Traduci','No, grazie'],
    pt:['Este site está em francês — vê-lo em português?','Traduzir','Não, obrigado'],
    uk:['Сайт французькою — перекласти українською?','Перекласти','Ні, дякую'],
    pl:['Ta strona jest po francusku — zobaczyć po polsku?','Przetłumacz','Nie, dziękuję'],
    nl:['Deze site is in het Frans — in het Nederlands bekijken?','Vertalen','Nee, bedankt'],
    zh:['本网站为法语 — 要翻译成中文吗？','翻译','不用了']
  };
  var l=(navigator.language||'').slice(0,2).toLowerCase();
  if(!l||l==='fr')return;                       // francophone : rien
  try{if(localStorage.getItem('prodi_trad_non')==='1')return;}catch(e){}
  var m=MSG[l]||MSG.en;
  var url='https://paper-prodi-com.translate.goog/?_x_tr_sl=fr&_x_tr_tl='+l+'&_x_tr_hl='+l;
  setTimeout(function(){
    var d=document.createElement('div');
    d.className='trad-pop';
    if(l==='ar')d.setAttribute('dir','rtl');
    d.innerHTML='<span class="trad-txt">'+m[0]+'</span>'
      +'<div class="trad-btns"><a class="trad-go" href="'+url+'" rel="noopener">'+m[1]+'</a>'
      +'<button type="button" class="trad-no">'+m[2]+'</button></div>';
    document.body.appendChild(d);
    window.prodiTrack?.('trad_prompt',{l:l});
    d.querySelector('.trad-go').addEventListener('click',function(){
      window.prodiTrack?.('trad_click',{l:l});
    });
    d.querySelector('.trad-no').addEventListener('click',function(){
      window.prodiTrack?.('trad_non',{l:l});
      try{localStorage.setItem('prodi_trad_non','1');}catch(e){}
      d.remove();
    });
  },1500);
})();

// ─── CONTACT : placeholder machine-à-écrire du champ Message (vraies
// demandes papier) — coupé si reduced-motion, champ actif ou déjà rempli ───
(function(){
  const ta=document.getElementById('f-msg');
  if(!ta||matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  const PH=[
    "Je cherche 20 tonnes de kraft brun 90 g…",
    "Avez-vous du couché 135 g en 64×90 ?",
    "Un conteneur d'offset 80 g pour Casablanca…",
    "Quelles laizes disponibles en bobine 70 g ?",
    "Envoyez-moi votre offre déstockage du moment…"
  ];
  let i=0,pos=0,del=false;
  (function tick(){
    if(document.activeElement===ta||ta.value){ta.placeholder='Message';setTimeout(tick,1200);return;}
    const cur=PH[i];
    pos+=del?-1:1;
    ta.placeholder=cur.slice(0,pos)||'Message';
    if(!del&&pos===cur.length){del=true;setTimeout(tick,1800);return;}
    if(del&&pos===0){del=false;i=(i+1)%PH.length;}
    setTimeout(tick,del?18:45);
  })();
})();

// ─── ADAPTATION GRANDS ÉCRANS (05/08) : la vitrine est DESSINÉE pour ~1440px.
// Au-delà, on zoome TOUT proportionnellement (un seul facteur, design intact)
// au lieu d'étirer les blocs un par un. ≤1440 : aucun effet.
(function(){
  function fit(){
    // borné par la LARGEUR ET LA HAUTEUR (écran large mais peu haut = zoom
    // réduit, sinon le hero déborde verticalement), plafond 1.6
    var z=Math.max(1,Math.min(window.innerWidth/1440,window.innerHeight/860,1.6));
    document.body.style.zoom=z>1.01?z:'';
  }
  fit();
  window.addEventListener('resize',fit);
})();
