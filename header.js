/* HEADER PARTAGÉ (12/09) : logique des widgets header (port CFR + géoloc,
   langue/devise, compte Supabase). Extraits VERBATIM de l'accueil. À charger
   en fin de <body>, APRÈS le markup #ali-addr/#ali-lang/#ali-acct. */

/* ── PORT ── */
/* MAQUETTE MIX : sélecteur PORT de destination + CFR €/T (barème transport 2026, container 25 T) */
(function(){
  var Z=[
    {n:'Europe',t:80,c:[
      ['fr','France',['Le Havre','Marseille-Fos']],
      ['be','Belgique',['Anvers']],
      ['nl','Pays-Bas',['Rotterdam']],
      ['de','Allemagne',['Hambourg']],
      ['pl','Pologne',['Gdansk']],
      ['it','Italie',['Gênes']],
      ['es','Espagne',['Valence','Algésiras']],
      ['pt','Portugal',['Lisbonne']],
      ['ro','Roumanie',['Constanta']],
      ['bg','Bulgarie',['Varna']],
      ['hr','Croatie',['Rijeka']],
      ['si','Slovénie',['Koper']],
      ['gr','Grèce',['Le Pirée']]]},
    {n:'Maghreb',t:110,c:[
      ['ma','Maroc',['Casablanca','Tanger Med','Agadir']],
      ['dz','Algérie',['Alger','Oran']],
      ['tn','Tunisie',['Radès (Tunis)','Sfax']],
      ['ly','Libye',['Tripoli','Misrata','Benghazi']]]},
    {n:"Afrique de l'Ouest proche",t:120,c:[
      ['sn','Sénégal',['Dakar']],
      ['gn','Guinée',['Conakry']],
      ['sl','Sierra Leone',['Freetown']]]},
    {n:"Afrique de l'Ouest",t:120,c:[
      ['ci',"Côte d'Ivoire",['Abidjan']],
      ['gh','Ghana',['Tema']],
      ['tg','Togo',['Lomé']],
      ['bj','Bénin',['Cotonou']],
      ['ng','Nigeria',['Lagos (Apapa)','Onne']],
      ['gq','Guinée Équat.',['Malabo','Bata']],
      ['ga','Gabon',['Libreville']],
      ['cg','Congo',['Pointe-Noire']]]},
    {n:'Afrique centrale',t:140,c:[
      ['cm','Cameroun',['Douala','Kribi']],
      ['cd','RDC',['Matadi']]]},
    {n:'Afrique du Nord-Est',t:100,c:[
      ['eg','Égypte',['Alexandrie','Port-Saïd','Damiette']],
      ['sd','Soudan',['Port-Soudan']],
      ['dj','Djibouti',['Djibouti']]]},
    {n:'Moyen-Orient',t:120,c:[
      ['sa','Arabie Saoudite',['Djeddah','Dammam']],
      ['tr','Turquie',['Istanbul (Ambarli)','Mersin','Izmir']],
      ['ye','Yémen',['Aden']],
      ['jo','Jordanie',['Aqaba']],
      ['iq','Irak',['Umm Qasr']],
      ['lb','Liban',['Beyrouth']]]},
    {n:'Golfe',t:140,c:[
      ['ae','Émirats A.U.',['Jebel Ali (Dubaï)']],
      ['qa','Qatar',['Hamad (Doha)']],
      ['om','Oman',['Sohar']],
      ['kw','Koweït',['Shuwaikh']],
      ['bh','Bahreïn',['Khalifa Bin Salman']]]},
    {n:'Asie du Sud',t:160,c:[
      ['in','Inde',['Nhava Sheva (Mumbai)','Mundra','Chennai']],
      ['pk','Pakistan',['Karachi']],
      ['bd','Bangladesh',['Chittagong']],
      ['lk','Sri Lanka',['Colombo']]]},
    {n:'Chine',t:180,c:[
      ['cn','Chine',['Shanghai','Ningbo','Shenzhen','Qingdao']]]},
    {n:'Asie du Sud-Est',t:200,c:[
      ['th','Thaïlande',['Laem Chabang (Bangkok)']],
      ['vn','Vietnam',['Hô Chi Minh (Cat Lai)','Haïphong']],
      ['my','Malaisie',['Port Klang']],
      ['id','Indonésie',['Jakarta (Tanjung Priok)']],
      ['ph','Philippines',['Manille']],
      ['sg','Singapour',['Singapour']]]},
    {n:'Amérique du Nord',t:100,c:[
      ['us','USA (côte Est)',['New York','Savannah','Miami']],
      ['ca','Canada',['Montréal','Halifax']]]},
    {n:'Amérique du Sud',t:200,c:[
      ['br','Brésil',['Santos']],
      ['ar','Argentine',['Buenos Aires']],
      ['cl','Chili',['San Antonio']],
      ['pe','Pérou',['Callao']],
      ['co','Colombie',['Carthagène']]]},
    {n:'Afrique australe',t:160,c:[
      ['za','Afrique du Sud',['Durban','Le Cap']],
      ['mz','Mozambique',['Maputo']],
      ['na','Namibie',['Walvis Bay']],
      ['ao','Angola',['Luanda']],
      ['mg','Madagascar',['Tamatave']]]},
    {n:'Océanie',t:200,c:[
      ['au','Australie',['Sydney','Melbourne']],
      ['nz','Nouvelle-Zélande',['Auckland']]]}
  ];
  var addr=document.getElementById('ali-addr'); if(!addr) return;
  var M={},F={};   /* F = premier port listé par pays (port principal) */
  Z.forEach(function(z){z.c.forEach(function(c){(c[2]||[]).forEach(function(pt){var id=c[0]+'|'+pt;M[id]={f:c[0],port:pt,pays:c[1],t:z.t};if(!F[c[0]])F[c[0]]=id;});});});
  var cur=null; try{cur=JSON.parse(localStorage.getItem('ali_ship2')||'null');}catch(e){}
  if(!cur||!M[cur.id]) cur=null;   /* pas de port par défaut : « Choisir » */
  function m(){return cur?M[cur.id]:null;}
  function flag(c){return '<img class="ali-flag" src="https://flagcdn.com/w40/'+c+'.png" alt="">';}
  /* CFR €/T → devise active (prodi_ccy + taux prodi_usd, même logique que le panier :
     conversion ×taux puis arrondi à la dizaine, unité $/T). Lu à chaque rendu. */
  function _ccyCfr(t){
    var usd=false,rate=0;
    try{usd=/usd/i.test(localStorage.getItem('prodi_ccy')||'');}catch(e){}
    try{var c=JSON.parse(localStorage.getItem('prodi_usd')||'null');if(c&&+c.r>0)rate=+c.r;}catch(e){}
    return (usd&&rate>0)?{v:Math.round(t*rate/10)*10,u:'$/T'}:{v:t,u:'€/T'};
  }
  function paint(){
    if(!cur){
      document.getElementById('ali-ship-cur').innerHTML='Choisir un port\u2026';
      document.getElementById('ali-ship-cfr').textContent='CFR selon destination';
      return;
    }
    document.getElementById('ali-ship-cur').innerHTML=flag(m().f)+' '+m().port;
    var _c=_ccyCfr(m().t);
    document.getElementById('ali-ship-cfr').textContent='+'+_c.v+' '+_c.u+' CFR';
  }
  var pop=document.createElement('div'); pop.id='ali-ship-pop';
  var POPULAIRES=['ma|Casablanca','dz|Alger','tn|Radès (Tunis)','eg|Alexandrie','sa|Djeddah','ae|Jebel Ali (Dubaï)','sn|Dakar','ci|Abidjan','fr|Le Havre'];
  function row(id){var x=M[id];var c=_ccyCfr(x.t);return '<div class="ship-row" data-id="'+id+'">'+flag(x.f)+'<span>'+x.port+'</span><em>'+x.pays+'</em><i>+'+c.v+' '+c.u+'</i></div>';}
  function rowsHtml(){
    var h='<div class="ship-grp">Ports populaires</div>';
    POPULAIRES.forEach(function(id){h+=row(id);});
    Z.forEach(function(z){
      var _zc=_ccyCfr(z.t);
      h+='<div class="ship-grp">'+z.n+' · '+_zc.v+' '+_zc.u+'</div>';
      z.c.forEach(function(c){(c[2]||[]).forEach(function(pt){h+=row(c[0]+'|'+pt);});});
    });
    return h;
  }
  pop.innerHTML='<div class="lc-title">Sélectionnez le port de destination</div>'
    +'<label class="lc-lab">Port de destination</label>'
    +'<div class="ship-wrap"><div class="ship-field" id="ship-field">'+flag('fr')+'<span id="ship-field-n">Le Havre — France</span>'
    +'<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"><path d="m6 9 6 6 6-6"/></svg></div>'
    +'<div class="ship-list" id="ship-list"><div class="ship-sw"><input id="ship-search" placeholder="Rechercher un port ou un pays…" autocomplete="off"></div><div id="ship-rows">'+rowsHtml()+'</div></div></div>'
    +'<div class="ship-cfr" id="ship-cfr"></div>'
    +'<button id="ship-save">Sauvegarder</button>';
  addr.appendChild(pop);
  var pend=cur?cur.id:'fr|Le Havre';   /* sélection courante DANS le tiroir (défaut interne) */
  var field=pop.querySelector('#ship-field'), listEl=pop.querySelector('#ship-list');
  var sw=pop.querySelector('#ship-search'), rowsBox=pop.querySelector('#ship-rows');
  function norm(t){return String(t).toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'');}
  function filter(){
    var q=norm(sw.value||''), kids=rowsBox.children, lastHdr=null, any=false;
    for(var i=0;i<kids.length;i++){
      var el=kids[i];
      if(el.classList.contains('ship-grp')){
        if(lastHdr) lastHdr.style.display=any?'':'none';
        lastHdr=el; any=false;
      }else{
        var vis=!q||norm(el.textContent).indexOf(q)>=0;
        el.style.display=vis?'':'none'; if(vis) any=true;
      }
    }
    if(lastHdr) lastHdr.style.display=any?'':'none';
  }
  sw.addEventListener('input',filter);
  function fieldPaint(){
    var x=M[pend];
    field.querySelector('img').src='https://flagcdn.com/w40/'+x.f+'.png';
    pop.querySelector('#ship-field-n').textContent=x.port+' — '+x.pays;
    var _fc=_ccyCfr(x.t);
    pop.querySelector('#ship-cfr').textContent='CFR +'+_fc.v+' '+_fc.u+' — prix estimatif, départ Le Havre, France.';
  }
  /* re-rendu quand la devise change (émis par le panier/header sans reload) */
  window.addEventListener('prodi-ccy',function(){try{paint();rowsBox.innerHTML=rowsHtml();fieldPaint();}catch(e){}});
  field.addEventListener('click',function(){
    field.classList.toggle('open');listEl.classList.toggle('open');
    if(listEl.classList.contains('open')){sw.value='';filter();setTimeout(function(){sw.focus();},50);}
  });
  listEl.addEventListener('click',function(e){
    var r=e.target.closest('.ship-row'); if(!r) return;
    pend=r.dataset.id; fieldPaint();
    field.classList.remove('open'); listEl.classList.remove('open');
  });
  pop.addEventListener('click',function(e){e.stopPropagation();});
  var st;
  function sOpen(){clearTimeout(st);
    if(!pop.classList.contains('open')){
      pend=cur?cur.id:'fr|Le Havre';fieldPaint();
      field.classList.remove('open');listEl.classList.remove('open');
      pop.classList.add('open');
    }}
  function sClose(){st=setTimeout(function(){
    if(pop.contains(document.activeElement)) return;   /* recherche en cours : ne pas fermer sous la souris */
    pop.classList.remove('open');},180);}
  addr.addEventListener('mouseenter',sOpen);
  addr.addEventListener('mouseleave',sClose);
  addr.addEventListener('click',function(e){
    if(e.target.closest('#ali-ship-pop')) return;
    sOpen();   /* tactile : le tap ouvre, fermeture au tap dehors */
  });
  document.addEventListener('click',function(e){if(!e.target.closest('#ali-addr'))pop.classList.remove('open');});
  pop.querySelector('#ship-save').addEventListener('click',function(){
    cur={id:pend};
    try{localStorage.setItem('ali_ship2',JSON.stringify(cur));}catch(e){}
    paint(); pop.classList.remove('open');
  });
  /* Port par DÉFAUT deviné (jamais d'état « Choisir un port… » à froid) :
     1) région de la langue navigateur (fr-MA → ma), instantané ;
     2) géoloc IP api.country.is (déjà en CSP connect-src) qui affine derrière.
     Le guess vit en MÉMOIRE seulement (cur.geo=1) — seul « Sauvegarder »
     écrit localStorage, donc un choix explicite n'est jamais écrasé. */
  var NEAR={bf:'ci|Abidjan',ml:'sn|Dakar',ne:'bj|Cotonou',td:'cm|Douala',cf:'cm|Douala',mr:'sn|Dakar',gm:'sn|Dakar',gw:'sn|Dakar',lr:'sl|Freetown',gb:'be|Anvers',ie:'be|Anvers',ch:'it|Gênes',at:'si|Koper'};
  function _guessId(cc){cc=String(cc||'').toLowerCase();return F[cc]||NEAR[cc]||null;}
  function _applyGeo(cc){
    var id=_guessId(cc); if(!id||!M[id]) return;
    cur={id:id,geo:1};
    if(!pop.classList.contains('open')) pend=id;   /* pas sous les pieds si le tiroir est ouvert */
    paint();
  }
  if(!cur){var _rg=(navigator.language||'').split('-')[1];if(_rg&&_rg.length===2)_applyGeo(_rg);}
  fetch('https://api.country.is/').then(function(r){return r.json();}).then(function(d){
    if(cur&&!cur.geo) return;
    _applyGeo(d.country);
  }).catch(function(){});
  paint();
})();

/* ── LANGUE / DEVISE ── */
/* MAQUETTE MIX : panneau langue/devise façon Alibaba (clic sur « Français-EUR ») */
(function(){
  var wrap=document.getElementById('ali-lang'); if(!wrap) return;
  var cur={lang:'fr',ccy:'EUR'};
  try{cur.lang=localStorage.getItem('ali_lang')||'fr';}catch(e){}
  try{var c=localStorage.getItem('prodi_ccy');if(c&&/usd/i.test(c))cur.ccy='USD';}catch(e){}
  function label(){
    document.getElementById('ali-lc-cur').textContent=(cur.lang==='en'?'English':'Français')+'-'+cur.ccy;
  }
  var pop=document.createElement('div'); pop.id='ali-lc-pop';
  pop.innerHTML='<div class="lc-title">Sélectionnez une langue et une devise</div>'
    +'<label class="lc-lab" for="lc-lang">Langue</label>'
    +'<select class="lc-sel" id="lc-lang"><option value="fr">Français</option><option value="en">English</option></select>'
    +'<label class="lc-lab" for="lc-ccy">Devise</label>'
    +'<select class="lc-sel" id="lc-ccy"><option value="EUR">€ · EUR - Euro</option><option value="USD">$ · USD - Dollar US</option></select>'
    +'<button id="lc-save">Sauvegarder</button>';
  wrap.appendChild(pop);
  pop.addEventListener('click',function(e){e.stopPropagation();});
  function lSync(){pop.querySelector('#lc-lang').value=cur.lang;pop.querySelector('#lc-ccy').value=cur.ccy;}
  var lt;
  function lOpen(){clearTimeout(lt);if(!pop.classList.contains('open')){lSync();pop.classList.add('open');}}
  function lClose(){lt=setTimeout(function(){
    if(pop.contains(document.activeElement)) return;   /* select natif déroulé : ne pas fermer sous la souris */
    pop.classList.remove('open');},180);}
  wrap.addEventListener('mouseenter',lOpen);
  wrap.addEventListener('mouseleave',lClose);
  wrap.addEventListener('click',function(e){
    if(e.target.closest('#ali-lc-pop')) return;
    lOpen();   /* tactile : le tap ouvre, fermeture au tap dehors */
  });
  document.addEventListener('click',function(e){if(!e.target.closest('#ali-lang'))pop.classList.remove('open');});
  pop.querySelector('#lc-save').addEventListener('click',function(){
    var l=pop.querySelector('#lc-lang').value, d=pop.querySelector('#lc-ccy').value;
    cur.lang=l; try{localStorage.setItem('ali_lang',l);}catch(e){}
    if(d!==cur.ccy){cur.ccy=d; try{if(typeof toggleCurrency==='function')toggleCurrency(d);}catch(e){}}
    try{if(typeof setLang==='function')setLang(l);}catch(e){}
    label(); pop.classList.remove('open');
  });
  label();
})();

/* ── COMPTE ── */
(function(){
  var w=document.getElementById('ali-acct'),p=document.getElementById('ali-acct-pop'),t;
  if(!w||!p)return;
  function o(){clearTimeout(t);p.classList.add('open');
    /* clamp : centré sous le bouton, mais jamais hors écran à droite
       (cas connecté : « Devenir client » masqué → le compte est le dernier
       élément du header) ; la flèche (--nfix) reste sous le bouton */
    try{
      var zf=(window._zf?_zf():1);
      p.style.marginLeft='';p.style.setProperty('--nfix','0px');
      var r=p.getBoundingClientRect(), over=r.right-(innerWidth-14);
      if(over>0){p.style.marginLeft=(-over/zf)+'px';p.style.setProperty('--nfix',(over/zf)+'px');}
    }catch(e){}}
  function c(){t=setTimeout(function(){p.classList.remove('open');},180);}
  w.addEventListener('mouseenter',o); w.addEventListener('mouseleave',c);
  /* Non connecté : tous les liens du panneau compte ouvrent connexion/inscription
     (/compte/) dans un NOUVEL onglet — « le mec n'a pas de compte ». */
  function _wireGuest(){Array.prototype.forEach.call(p.querySelectorAll('.acct-item'),function(a){a.setAttribute('href','/compte/');a.setAttribute('target','_blank');a.setAttribute('rel','noopener');a.onclick=null;});}
  /* Session Supabase (posée par /compte/) → header connecté */
  try{
    var raw=localStorage.getItem('sb-bvcgpdoukhcatjibmvnb-auth-token');
    if(!raw){_wireGuest();return;}
    var sess=JSON.parse(raw); var email=sess&&sess.user&&sess.user.email;
    if(!email){_wireGuest();return;}
    var meta=(sess.user&&sess.user.user_metadata)||{};
    var lnk=document.getElementById('ali-login-lnk');
    lnk.childNodes[lnk.childNodes.length-1].textContent=' '+(meta.prenom||email.split('@')[0]);
    lnk.title=email;
    var join=document.getElementById('ali-join'); if(join)join.style.display='none';
    var hi=p.querySelector('.acct-hi'); if(hi)hi.textContent='Bienvenue chez Prodiconseil'+(meta.prenom?', '+meta.prenom:'')+' !';
    /* connecté : « Se déconnecter » prend la place de « Devenir client
       Prodiconseil » en bas du panneau (04/10 Ethan) — le lien du haut est masqué */
    var lg=p.querySelector('.acct-login'); if(lg)lg.style.display='none';
    function _logout(){localStorage.removeItem('sb-bvcgpdoukhcatjibmvnb-auth-token');location.reload();return false;}
    /* déjà connecté : plus de « Ou continuer avec » ni de bouton Google */
    var or_=p.querySelector('.acct-or'); if(or_)or_.style.display='none';
    var gg=p.querySelector('.acct-google'); if(gg)gg.style.display='none';
    /* connecté : liens réels du panneau */
    Array.prototype.forEach.call(p.querySelectorAll('.acct-item'),function(a){
      var t=a.textContent.trim();
      if(t==='Mon Prodiconseil'||t==='Mes commandes'){a.setAttribute('href','/mon-prodiconseil/');a.onclick=null;}
      else if(t==='Mon compte'){a.setAttribute('href','/compte/');a.onclick=null;}
      else if(t==="Demande d'échantillons"){a.setAttribute('href','/echantillons/');a.onclick=null;}
      else if(t==='Nous contacter'){a.setAttribute('href','/contact/');a.onclick=null;}
      else if(t==='Devenir client Prodiconseil'){a.textContent='Se déconnecter';a.removeAttribute('href');a.style.cursor='pointer';a.onclick=_logout;}
    });
  }catch(e){}
})();
