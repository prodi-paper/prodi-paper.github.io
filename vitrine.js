// ─── TRANSLATIONS ───
const T = {
  fr: {
    nav_home:'Accueil', nav_about:'À propos', nav_contact:'Contact', nav_catalogue:'Voir le stock →',
    hero_badge:'Négociant européen depuis 1991',
    hero_title:'VOTRE FOURNISSEUR<br>PAPIER &amp; CARTON<br><em>DEPUIS 1991</em>',
    hero_sub:'Bobines · Palettes feuilles · Kraft · Offset · Couché · SBS · Tous grammages — Expédition mondiale depuis la France 🇫🇷',
    qd_h:'DEMANDEZ UN PROFORMA', qd_sub:'Décrivez votre besoin. Nous vous répondons sous 2H ouvrées avec disponibilités et prix.',
    qd_nom:'Nom / Société', qd_besoin:'Type de papier · Grammage · Quantité', qd_send:'ENVOYER →', qd_ok:'✓ Message envoyé — réponse sous 2H ouvrées.',
    hero_tagline:'LOTS ET FABRICATION', hero_btn1:'NOS PRODUITS', hero_btn2:'NOUS CONTACTER',
    stat1:'Fondés en', stat2:'Références en stock', stat3:'Tonnes disponibles', stat4:'Délai de chargement',
    mq_label:'Présents dans 30+ pays à travers le monde',
    geo_tag:'Export mondial', geo_h:'68 PAYS CLIENTS', geo_sub:'Présents sur 5 continents. Expédition depuis nos entrepôts en France et en Europe vers le monde entier — FCL, LCL, tous incoterms.',
    sc_tag:'Nos produits', sc_h:'APERÇU DE NOS STOCKS', sc_sub:'Plusieurs milliers de références en stock immédiat, issues de papeteries européennes de premier rang.', sc_cta:'Voir tout le stock →',
    sc_search_ph:'Kraft 80g, SBS blanc, Testliner...', sc_search_btn:'Rechercher →', sc_type_default:'Quel type de papier cherchez-vous ?',
    step4_h:'Expédition rapide', step4_p:'Départ depuis nos entrepôts en France sous 24–48H. Livraison FCL ou LCL dans le monde entier.',
    mills_label:'Stocks issus des plus grandes papeteries européennes',
    act_tag:'À propos de nous', act_h:'Négociant international en papier & carton',
    range_label:'Gamme',
    card1_h:'Fondée en 1991', card1_p:'SARL française, siège à Ivry-sur-Seine (Île-de-France). Plus de 30 ans d\'expertise dans le négoce de papier & carton à l\'international.',
    card2_h:'+10 000 tonnes', card2_p:'Stock disponible en permanence. Livraison rapide en quelques jours après paiement. Des dizaines de milliers de tonnes vendues par an.',
    card3_h:'68 pays · 99% export', card3_p:'Présents sur 5 continents : Afrique, Moyen-Orient, Asie, Amérique du Sud et Europe.',
    stat1_l:'Fondée', stat2_l:'En stock', stat3_l:'Pays clients', stat4_l:'À l\'export', stat5_l:'Exclusivement',
    prod_tag:'Catalogue', prod_h:'NOS CATÉGORIES DE PRODUITS',
    prod_sub:'Bobines et formats feuilles disponibles en stock, issus de papeteries européennes de premier rang.',
    p_kraft:'Brun & blanc, bobines', p_sbs:'Carton couché blanc', p_fbb:'Folding box board',
    p_test:'Papier d\'emballage', p_flut:'Papier ondulé', p_coat:'1 & 2 faces', p_off:'Sans bois & newsprint',
    prod_cta1:'Voir le catalogue complet',
    logi_tag:'Logistique', logi_h:'EXPÉDITION DEPUIS L\'EUROPE',
    logi_sub:'Nos stocks sont disponibles en entrepôts européens, prêts à être expédiés dans le monde entier.',
    logi1_h:'Entrepôts européens', logi1_p:'Stocks physiques disponibles en France (Ivry-sur-Seine, Amiens) et dans plusieurs pays européens. Délai de chargement rapide.',
    logi2_h:'Export mondial', logi2_p:'Livraison dans tous les pays. Expérience dans les procédures douanières internationales.',
    logi3_h:'Conteneurs complets', logi3_p:'Livraison en FCL. Lots à partir de quelques tonnes, adaptables selon les besoins de l\'acheteur.',
    cta_h:'INTÉRESSÉ PAR NOS STOCKS ?', cta_sub:'Consultez notre catalogue ou contactez-nous directement.',
    cta_btn1:'Voir le catalogue', cta_btn2:'WhatsApp', cta_btn2b:'Nous contacter',
    about_tag:'À propos', about_h1:'NÉGOCIANT EUROPÉEN<br>EN PAPIER <em>&amp;</em> CARTON',
    about_intro:'Prodiconseil est spécialisé dans la commercialisation de stocklots de papier et carton issus de grandes papeteries européennes.',
    ab_h1:'L\'ENTREPRISE',
    ab_p1:'Prodiconseil est un négociant européen fondé en 1991, spécialisé dans les stocklots de papier et carton. Depuis plus de 30 ans, nous travaillons avec des papeteries de premier rang pour proposer des lots à prix compétitifs.',
    ab_p2:'Notre activité repose sur une connaissance approfondie du marché du papier et sur un réseau de partenaires industriels en Europe.',
    ab_p3:'Nous fournissons des transformateurs, des imprimeurs et des négociants dans de nombreux pays, avec des solutions logistiques adaptées à chaque marché.',
    ab_h2:'NOS PRODUITS',
    ab_p4:'Notre catalogue comprend des bobines et des formats feuilles dans de nombreuses qualités : papier couché, kraft, offset, carton SBS, FBB, testliner, fluting et bien d\'autres.',
    ab_p5:'Chaque lot est documenté avec ses caractéristiques techniques (grammage, laize, poids, mandrin) et une photo du produit.',
    ab_p6:'Les stocks proviennent de surproductions et de commandes annulées, ce qui permet des prix très compétitifs par rapport au marché primaire.',
    num1:'Références disponibles en stock', num2:'Stocks d\'origine européenne',
    num3:'Papeteries européennes de référence', num4:'Délai de chargement typique',
    ab_proc_h:'COMMENT ÇA MARCHE',
    step1_h:'Consultez le catalogue', step1_p:'Parcourez nos 5 800+ références avec filtres par qualité, grammage, laize et format.',
    step2_h:'Demandez un proforma', step2_p:'Sélectionnez vos produits et envoyez une demande de proforma directement depuis le catalogue.',
    step3_h:'Confirmation & livraison', step3_p:'Nous préparons votre commande et organisons l\'expédition vers votre port de destination.',
    ct_tag:'Contact', ct_h:'ENVOYEZ-NOUS UN MESSAGE',
    ct_sub:'Remplissez le formulaire ci-dessous. Nous vous répondrons sous 24h.',
    f_nom:'Nom', f_soc:'Entreprise', f_email:'Email', f_tel:'Téléphone', f_msg:'Message', f_send:'Envoyer le message',
    ok_h:'Message envoyé !', ok_p:'Nous vous répondrons dans les 24 heures.',
    aside_h:'COORDONNÉES', ci_addr:'Adresse', ci_web:'Site catalogue', wa_btn:'Écrire sur WhatsApp', mail_btn:'Envoyer un email',
    err_nom:'Nom requis (min. 2 car.)', err_soc:'Entreprise requise', err_email:'Email invalide', err_msg:'Message trop court (min. 10 car.)',
    err_server:'Erreur — veuillez réessayer ou écrire à eelbilia@gmail.com',
    snd_on:'SON', snd_off:'SON',
    ph_nom:'Jean Dupont', ph_soc:'Entreprise SA', ph_email:'nom@entreprise.com', ph_tel:'+33 6 00 00 00 00',
    aria_sound:'Activer le son',
    gate_tag:'Accès catalogue', gate_title:'ACCÉDEZ AU STOCK',
    gate_sub:'Laissez vos coordonnées pour consulter nos 5\u202f800+ références disponibles.',
    gate_btn:'VOIR LE STOCK →', gate_skip:'Déjà client\u00a0? Continuer →',
    stock_title:'+10\u202f000 TONNES DISPONIBLES', stock_sub:'lots et fabrication',
  },
  en: {
    nav_home:'Home', nav_about:'About', nav_contact:'Contact', nav_catalogue:'View stock →',
    hero_badge:'European paper trader since 1991',
    hero_title:'YOUR PAPER &amp; BOARD<br>SUPPLIER<br><em>SINCE 1991</em>',
    hero_sub:'Reels · Sheet pallets · Kraft · Offset · Coated · SBS · All grammages — Worldwide shipping from France 🇫🇷',
    qd_h:'REQUEST A PROFORMA', qd_sub:'Describe your need. We reply within 2 business hours with availability and pricing.',
    qd_nom:'Name / Company', qd_besoin:'Paper type · Grammage · Quantity', qd_send:'SEND →', qd_ok:'✓ Message sent — reply within 2 business hours.',
    hero_tagline:'STOCKLOTS & SOURCING', hero_btn1:'OUR PRODUCTS', hero_btn2:'CONTACT US',
    stat1:'Founded in', stat2:'References in stock', stat3:'Tonnes available', stat4:'Loading lead time',
    mq_label:'Active in 30+ countries worldwide',
    geo_tag:'Global reach', geo_h:'68 CLIENT COUNTRIES', geo_sub:'Active on 5 continents. Shipping from our warehouses in France and Europe — FCL, LCL, all incoterms.',
    sc_tag:'Our products', sc_h:'STOCK OVERVIEW', sc_sub:'Thousands of references in immediate stock, from major European paper mills.', sc_cta:'View full stock →',
    sc_search_ph:'Kraft 80g, White SBS, Testliner...', sc_search_btn:'Search →', sc_type_default:'What type of paper are you looking for?',
    step4_h:'Fast shipping', step4_p:'Dispatch from our French warehouses within 24–48H. FCL or LCL delivery worldwide.',
    mills_label:'Stocks sourced from Europe\'s leading paper mills',
    act_tag:'About us', act_h:'International paper & board trader',
    range_label:'Range',
    card1_h:'Founded in 1991', card1_p:'French SARL, headquartered in Ivry-sur-Seine, Île-de-France. Over 30 years of expertise in international paper & board trading.',
    card2_h:'+10,000 tonnes', card2_p:'Permanently available stock. Fast delivery within a few days of payment. Tens of thousands of tonnes sold per year.',
    card3_h:'68 countries · 99% export', card3_p:'Active on 5 continents: Africa, Middle East, Asia, South America and Europe.',
    stat1_l:'Founded', stat2_l:'In stock', stat3_l:'Client countries', stat4_l:'Export', stat5_l:'B2B only',
    prod_tag:'Catalogue', prod_h:'OUR PRODUCT CATEGORIES',
    prod_sub:'Reels and sheet formats available in stock, from top-tier European paper mills.',
    p_kraft:'Brown & white, reels', p_sbs:'White coated board', p_fbb:'Folding box board',
    p_test:'Packaging paper', p_flut:'Corrugating medium', p_coat:'1 & 2 sides', p_off:'Woodfree & newsprint',
    prod_cta1:'View full catalogue',
    logi_tag:'Logistics', logi_h:'SHIPPING FROM EUROPE',
    logi_sub:'Our stocks are available in European warehouses, ready to be shipped worldwide.',
    logi1_h:'European warehouses', logi1_p:'Physical stocks available in France (Ivry-sur-Seine, Amiens) and several European countries. Fast loading lead times.',
    logi2_h:'Worldwide export', logi2_p:'Delivery to all countries. Experience with international customs procedures.',
    logi3_h:'Full container loads', logi3_p:'FCL delivery. Lots from a few tonnes, adaptable to the buyer\'s requirements.',
    cta_h:'INTERESTED IN OUR STOCKS?', cta_sub:'Browse our catalogue or contact us directly.',
    cta_btn1:'View catalogue', cta_btn2:'WhatsApp', cta_btn2b:'Contact us',
    about_tag:'About', about_h1:'EUROPEAN TRADER<br>IN PAPER <em>&amp;</em> BOARD',
    about_intro:'Prodiconseil specialises in the sale of paper and board stocklots from major European paper mills.',
    ab_h1:'THE COMPANY',
    ab_p1:'Prodiconseil is a European trader founded in 1991, specialising in paper and board stocklots. For over 30 years, we have worked with top-tier paper mills to offer competitive lots.',
    ab_p2:'Our business is built on deep knowledge of the paper market and an industrial partner network across Europe.',
    ab_p3:'We supply converters, printers and traders in many countries, with logistics solutions tailored to each market.',
    ab_h2:'OUR PRODUCTS',
    ab_p4:'Our catalogue includes reels and sheet formats in many grades: coated paper, kraft, offset, SBS board, FBB, testliner, fluting and more.',
    ab_p5:'Each lot is documented with its technical specifications (grammage, width, weight, core) and a product photo.',
    ab_p6:'Stocks come from overproductions and cancelled orders, enabling very competitive prices vs. the primary market.',
    num1:'References available in stock', num2:'European-origin stocks',
    num3:'Reference European paper mills', num4:'Typical loading lead time',
    ab_proc_h:'HOW IT WORKS',
    step1_h:'Browse the catalogue', step1_p:'Search our 5,800+ references with filters by grade, grammage, width and format.',
    step2_h:'Request a proforma', step2_p:'Select your products and send a proforma request directly from the catalogue.',
    step3_h:'Confirmation & delivery', step3_p:'We prepare your order and arrange shipment to your destination port.',
    ct_tag:'Contact', ct_h:'SEND US A MESSAGE',
    ct_sub:'Fill in the form below. We will reply within 24 hours.',
    f_nom:'Name', f_soc:'Company', f_email:'Email', f_tel:'Phone', f_msg:'Message', f_send:'Send message',
    ok_h:'Message sent!', ok_p:'We will reply within 24 hours.',
    aside_h:'CONTACT INFO', ci_addr:'Address', ci_web:'Catalogue site', wa_btn:'Chat on WhatsApp', mail_btn:'Send an email',
    err_nom:'Name required (min. 2 chars.)', err_soc:'Company required', err_email:'Invalid email', err_msg:'Message too short (min. 10 chars.)',
    err_server:'Error — please retry or email eelbilia@gmail.com',
    snd_on:'SOUND', snd_off:'SOUND',
    ph_nom:'John Smith', ph_soc:'Company Ltd', ph_email:'name@company.com', ph_tel:'+1 555 000 0000',
    aria_sound:'Toggle sound',
    gate_tag:'Catalogue access', gate_title:'ACCESS OUR STOCK',
    gate_sub:'Enter your details to browse our 5,800+ available references.',
    gate_btn:'VIEW STOCK →', gate_skip:'Already a client? Continue →',
    stock_title:'+10,000 TONNES AVAILABLE', stock_sub:'lots & manufacturing',
  }
};

let lang = 'fr';

function setLang(l) {
  lang = l;
  document.documentElement.lang = l;
  document.documentElement.dataset.lang = l;
  ['fr','en'].forEach(x => {
    document.getElementById('lang-'+x)?.classList.toggle('on', x===l);
    document.getElementById('mob-lang-'+x)?.classList.toggle('on', x===l);
  });
  document.querySelectorAll('[data-i18n]').forEach(el => {
    const k = el.dataset.i18n;
    if (T[l][k] !== undefined) el.textContent = T[l][k];
  });
  document.querySelectorAll('[data-i18n-h]').forEach(el => {
    const k = el.dataset.i18nH;
    if (T[l][k] !== undefined) el.innerHTML = T[l][k];
  });
  document.querySelectorAll('[data-i18n-placeholder]').forEach(el => {
    const k = el.dataset.i18nPlaceholder;
    if (T[l][k] !== undefined) el.placeholder = T[l][k];
  });
  document.querySelectorAll('[data-i18n-aria]').forEach(el => {
    const k = el.dataset.i18nAria;
    if (T[l][k] !== undefined) el.setAttribute('aria-label', T[l][k]);
  });
}

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
  const btn = document.getElementById('f-submit');
  btn.disabled = true;
  btn.textContent = '...';
  const nom = document.getElementById('f-nom').value.trim();
  const soc = document.getElementById('f-soc').value.trim();
  const email = document.getElementById('f-email').value.trim();
  const tel = document.getElementById('f-tel').value.trim();
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
    btn.textContent = T[lang].f_send;
    alert(T[lang].err_server);
  }
}

// ─── QUICK DEVIS ───
async function submitQuickDevis(e){
  e.preventDefault();
  const btn=e.target.querySelector('button[type=submit]');
  const nom=document.getElementById('qd-nom').value.trim();
  const email=document.getElementById('qd-email').value.trim();
  const besoin=document.getElementById('qd-besoin').value.trim();
  btn.disabled=true;
  try{
    await fetch(SURL+'/rest/v1/proforma_requests',{
      method:'POST',
      headers:{'apikey':SKEY,'Authorization':'Bearer '+SKEY,'Content-Type':'application/json','Prefer':'return=minimal'},
      body:JSON.stringify({nom,email,message:besoin,quantite_souhaitee:'Quick devis vitrine',statut:'quick_devis'})
    });
  }catch(_){}
  document.getElementById('qd-form').style.display='none';
  document.getElementById('qd-ok').style.display='block';
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
    'f-nom':   {required:true, min:2, errKey:'err_nom'},
    'f-soc':   {required:true, min:2, errKey:'err_soc'},
    'f-email': {required:true, email:true, errKey:'err_email'},
    'f-tel':   {required:false, errKey:''},
    'f-msg':   {required:true, min:10, errKey:'err_msg'},
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
    if(msgEl) msgEl.textContent = ok ? '' : (T[lang][rule.errKey] || '');
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


// ─── GATE ───
const GATE_KEY = 'prodi_access';

// EmailJS config — remplacer avec vos identifiants emailjs.com
const EJS_PUB  = 'e3aqMGO-mZiAECrb5';
const EJS_SVC  = 'service_k3060so';
const EJS_TPL  = 'template_atcwwc2';

(function(){ try{ emailjs.init({ publicKey: EJS_PUB }); } catch(_){} })();

/* ── SHOWCASE CAROUSEL ── */
(function(){
  const track = document.querySelector('.sc-track');
  const dots  = document.querySelectorAll('.sc-dot');
  const total = document.querySelectorAll('.sc-slide').length;
  let cur = 0, timer;

  function go(n){
    cur = (n + total) % total;
    track.style.transform = 'translateX(-' + (cur * 100) + '%)';
    dots.forEach((d,i) => d.classList.toggle('active', i === cur));
  }

  function startAuto(){ timer = setInterval(() => go(cur + 1), 5000); }
  function resetAuto(){ clearInterval(timer); startAuto(); }

  document.querySelector('.sc-prev').addEventListener('click', () => { go(cur - 1); resetAuto(); });
  document.querySelector('.sc-next').addEventListener('click', () => { go(cur + 1); resetAuto(); });
  dots.forEach(d => d.addEventListener('click', () => { go(+d.dataset.sc); resetAuto(); }));
  startAuto();
})();

function goSearch(e) {
  e.preventDefault();
  const q = document.getElementById('sc-search-input').value.trim();
  window.location.href = './index.html' + (q ? '?q=' + encodeURIComponent(q) : '');
}

function openGate(e) {
  if (e) e.preventDefault();
  if (localStorage.getItem(GATE_KEY)) { window.location.href = './index.html'; return; }
  document.getElementById('gate-overlay').classList.add('open');
  document.body.style.overflow = 'hidden';
  setTimeout(() => document.getElementById('g-nom').focus(), 280);
}

function skipGate() {
  localStorage.setItem(GATE_KEY, '1');
  window.location.href = './index.html';
}

function closeGate() {
  document.getElementById('gate-overlay').classList.remove('open');
  document.body.style.overflow = '';
}

async function submitGate(e) {
  e.preventDefault();
  const btn = document.getElementById('gate-btn');
  btn.disabled = true; btn.textContent = '...';
  const nom   = document.getElementById('g-nom').value.trim();
  const soc   = document.getElementById('g-soc').value.trim();
  const email = document.getElementById('g-email').value.trim();
  const tel   = document.getElementById('g-tel').value.trim();

  // Save to Supabase
  try {
    await fetch(SURL + '/rest/v1/proforma_requests', {
      method: 'POST',
      headers: { 'apikey': SKEY, 'Authorization': 'Bearer ' + SKEY, 'Content-Type': 'application/json', 'Prefer': 'return=minimal' },
      body: JSON.stringify({ nom, societe: soc, email, telephone: tel, message: 'Accès catalogue', quantite_souhaitee: 'gate_catalogue', statut: 'gate_access' })
    });
  } catch(_) {}

  // Send email via EmailJS
  try {
    await emailjs.send(EJS_SVC, EJS_TPL, { from_name: nom, company: soc, reply_to: email,
      message: `Nouveau lead catalogue\nNom: ${nom}\nSociété: ${soc}\nEmail: ${email}\nTél: ${tel}` });
  } catch(_) {}

  localStorage.setItem(GATE_KEY, '1');
  window.location.href = './index.html';
}

// Gate désactivé — accès direct au catalogue

// Fermer sur clic overlay
document.getElementById('gate-overlay')?.addEventListener('click', function(e) {
  if (e.target === this) {
    this.classList.remove('open');
    document.body.style.overflow = '';
  }
});

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
    icoMute.style.display='';icoSound.style.display='none';btnTxt.textContent=T[lang].snd_on;
  } else {
    icoMute.style.display='none';icoSound.style.display='';btnTxt.textContent=T[lang].snd_off;
  }
}
