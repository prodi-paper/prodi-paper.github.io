/* Menu burger mobile PARTAGÉ — source unique, chargé sur le catalogue ET
   les pages coquille (05/10). Guard anti double-insertion. */
/* ════ MENU BURGER MOBILE PARTAGÉ (05/10 Ethan) — navigation viable sur
   téléphone/tablette. Présent sur TOUTES les pages (catalogue + coquilles).
   Masqué en desktop par la CSS (header.css). Vue client ?s= : ignoré. ════ */
(function(){
  if(/[?&](s|share)=/.test(location.search))return;
  if(document.getElementById('mnav-btn'))return;
  var connected=false;
  try{var s=JSON.parse(localStorage.getItem('sb-bvcgpdoukhcatjibmvnb-auth-token')||'null');connected=!!(s&&s.user);}catch(e){}
  // bouton burger — inséré au DÉBUT de la barre header (catalogue .header-inner ou coquille .h-in)
  var bar=document.querySelector('.header-inner')||document.querySelector('.h-in');
  if(!bar)return;
  var btn=document.createElement('button');
  btn.id='mnav-btn';btn.setAttribute('aria-label','Menu');
  btn.innerHTML='<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#1d1d1f" stroke-width="2.2" stroke-linecap="round"><path d="M4 6h16M4 12h16M4 18h16"/></svg>';
  bar.insertBefore(btn,bar.firstChild);
  // liens de nav
  var LINKS=[
    ['Explorer le stock','/catalogue/'],
    ['Fabrication sur demande','/fabrication/'],
    ['Demande d’échantillons','/echantillons/'],
    ['Déstockage','/catalogue/?destock=250'],
    ['Panier','/panier/'],
    ['—SEP—',''],
    ['À propos de Prodiconseil','/about/'],
    ['Livraison & export','/export/'],
    ['Service achat','/service-achat/'],
    ['Nous contacter','/contact/'],
    ['—SEP—',''],
    ['Mon Prodiconseil','/mon-prodiconseil/']
  ];
  var bg=document.createElement('div');bg.id='mnav-bg';
  var rows=LINKS.map(function(l){
    if(l[0]==='—SEP—')return '<div class="mnav-sep"></div>';
    var on=(location.pathname===l[1]||(l[1]!=='/'&&location.pathname.indexOf(l[1])===0&&l[1].length>1&&!l[1].includes('?')))?' mnav-on':'';
    return '<a class="mnav-link'+on+'" href="'+l[1]+'">'+l[0]+'</a>';
  }).join('');
  var cta=connected
    ? '<a class="mnav-cta mnav-cta-out" href="#" id="mnav-logout">Se déconnecter</a>'
    : '<a class="mnav-cta" href="/compte/">Se connecter / Devenir client</a>';
  bg.innerHTML='<div class="mnav-panel">'
    +'<div class="mnav-head"><img src="/img/logo.png?v=2" alt="Prodiconseil" class="mnav-logo"><button class="mnav-x" aria-label="Fermer">✕</button></div>'
    +'<div class="mnav-links">'+rows+'</div>'
    +'<div class="mnav-foot">'+cta+'</div>'
  +'</div>';
  document.body.appendChild(bg);
  function open(){bg.classList.add('open');document.body.style.overflow='hidden';}
  function close(){bg.classList.remove('open');document.body.style.overflow='';}
  btn.addEventListener('click',open);
  bg.addEventListener('click',function(e){if(e.target===bg)close();});
  bg.querySelector('.mnav-x').addEventListener('click',close);
  document.addEventListener('keydown',function(e){if(e.key==='Escape')close();});
  var lo=document.getElementById('mnav-logout');
  if(lo)lo.addEventListener('click',function(e){e.preventDefault();try{localStorage.removeItem('sb-bvcgpdoukhcatjibmvnb-auth-token');}catch(_){}location.reload();});
})();
