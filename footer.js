/* Footer partagé Prodiconseil (façon vitrine ft2) — remplace le footer de la page.
   Intégration : <script src="/footer.js"></script> en fin de body (après le footer existant). */
(function(){
  if(document.querySelector('footer.ft2')) return;
  var l=document.createElement('link'); l.rel='stylesheet'; l.href='/footer.css'; document.head.appendChild(l);
  var f=document.createElement('footer'); f.className='ft2';
  f.innerHTML=
    '<div class="ft2-grid">'
    +'<div class="ft2-brand">'
      +'<a href="/"><img src="/img/logo.png" alt="Prodiconseil" width="170" height="28"></a>'
      +'<p class="ft2-tag">Négociant international en papier &amp; carton depuis 1991.</p>'
      +'<div class="ft2-social">'
        +'<a href="https://www.youtube.com/channel/UCKYWPjnXzOUMx6zT2KyEJdw" target="_blank" rel="noopener noreferrer" class="fs-yt" aria-label="YouTube" title="YouTube"><svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="5.5" width="20" height="13" rx="3.5"/><path d="M10 9.2l5 2.8-5 2.8z" fill="currentColor" stroke="none"/></svg></a>'
        +'<a href="https://www.tiktok.com/@prodiconseil" target="_blank" rel="noopener noreferrer" class="fs-tk" aria-label="TikTok" title="TikTok"><svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor"><path d="M16.6 2h-3.1v13.4a2.9 2.9 0 1 1-2.9-2.9c.3 0 .6 0 .9.1V9.4a6.2 6.2 0 0 0-.9-.06 6.06 6.06 0 1 0 6.06 6.06V8.9A7.6 7.6 0 0 0 21 10.2V7.1a4.8 4.8 0 0 1-4.4-5.1z"/></svg></a>'
        +'<a href="https://www.facebook.com/profile.php?id=61590755904742" target="_blank" rel="noopener noreferrer" class="fs-fb" aria-label="Facebook" title="Facebook"><svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor"><path d="M13.5 21v-7.4h2.5l.4-2.9h-2.9V8.8c0-.84.23-1.4 1.44-1.4h1.54V4.8c-.27-.04-1.18-.11-2.24-.11-2.22 0-3.74 1.35-3.74 3.84v2.14H8v2.9h2.5V21z"/></svg></a>'
        +'<a href="https://www.instagram.com/prodiconseil.paper" target="_blank" rel="noopener noreferrer" class="fs-ig" aria-label="Instagram" title="Instagram"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="5"/><circle cx="12" cy="12" r="4"/><circle cx="17.2" cy="6.8" r="0.6" fill="currentColor" stroke="none"/></svg></a>'
        +'<a href="https://www.linkedin.com/company/prodiconseil-paper/" target="_blank" rel="noopener noreferrer" class="fs-in" aria-label="LinkedIn" title="LinkedIn"><svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor"><path d="M4.98 3.5a2.1 2.1 0 1 1 0 4.2 2.1 2.1 0 0 1 0-4.2zM3.2 9.2h3.6V21H3.2zM9.1 9.2h3.4v1.6h.05c.47-.9 1.63-1.85 3.36-1.85 3.6 0 4.26 2.37 4.26 5.45V21h-3.6v-5.9c0-1.4-.02-3.2-1.95-3.2-1.96 0-2.26 1.53-2.26 3.1V21H9.1z"/></svg></a>'
      +'</div>'
    +'</div>'
    +'<div class="ft2-col">'
      +'<div class="ft2-h">Navigation</div>'
      +'<a href="/produits/">Produits</a>'
      +'<a href="/histoire/">Histoire</a>'
      +'<a href="/contact/">Contact</a>'
      +'<a href="/faq/">FAQ</a>'
      +'<a href="/logistique/">Logistique</a>'
      +'<a href="/export/">Export</a>'
      +'<a href="/guides/">Guides d\'import</a>'
    +'</div>'
    +'<div class="ft2-col">'
      +'<div class="ft2-h">Nos papiers</div>'
      +'<a href="/offset/">Papier offset</a>'
      +'<a href="/papier-couche/">Papier couché</a>'
      +'<a href="/kraft/">Papier kraft</a>'
      +'<a href="/carton-couche/">Carton couché</a>'
      +'<a href="/papier-journal/">Papier journal</a>'
      +'<a href="/papier-cuisson/">Papier cuisson</a>'
      +'<a href="/papier-thermique/">Papier thermique</a>'
      +'<a href="/thermo-soudable/">Thermo-soudable</a>'
      +'<a href="/papier-creations/">Papier calque</a>'
    +'</div>'
    +'<div class="ft2-col ft2-col-zones">'
      +'<div class="ft2-h">Zones desservies</div>'
      +'<a href="/maroc/">Maghreb</a>'
      +'<a href="/senegal/">Afrique de l\'Ouest</a>'
      +'<a href="/cameroun/">Afrique centrale</a>'
      +'<a href="/kenya/">Afrique de l\'Est</a>'
      +'<a href="/pologne/">Europe de l\'Est</a>'
      +'<a href="/egypte/">Méditerranée &amp; Moyen-Orient</a>'
    +'</div>'
    +'<div class="ft2-col">'
      +'<div class="ft2-h">Catalogue</div>'
      +'<a href="/catalogue/">Catalogue en ligne</a>'
      +'<a href="/contact/">Demander une offre</a>'
    +'</div>'
    +'<div class="ft2-col">'
      +'<div class="ft2-h">Nous joindre</div>'
      +'<a href="https://wa.me/33632096840?text=Welcome%20!" target="_blank" rel="noopener noreferrer">WhatsApp</a>'
      +'<a href="tel:+33632096840">+33 6 32 09 68 40</a>'
      +'<a href="mailto:ethan@prodi.com">ethan@prodi.com</a>'
    +'</div>'
    +'</div>'
    +'<div class="ft2-markets">'
      +'<span class="ft2-mk-h">Nos marchés :</span>'
      +[['algerie','Algérie'],['maroc','Maroc'],['tunisie','Tunisie'],['libye','Libye'],['mauritanie','Mauritanie'],['egypte','Égypte'],['senegal','Sénégal'],['cote-d-ivoire',"Côte d'Ivoire"],['mali','Mali'],['burkina-faso','Burkina Faso'],['guinee','Guinée'],['benin','Bénin'],['togo','Togo'],['cameroun','Cameroun'],['gabon','Gabon'],['congo','Congo'],['rd-congo','RD Congo'],['tchad','Tchad'],['djibouti','Djibouti'],['kenya','Kenya'],['madagascar','Madagascar'],['liban','Liban'],['turquie','Turquie'],['pologne','Pologne'],['hongrie','Hongrie'],['roumanie','Roumanie'],['bulgarie','Bulgarie'],['serbie','Serbie']]
        .map(function(m){return '<a href="/'+m[0]+'/">'+m[1]+'</a>';}).join(' ')
    +'</div>'
    +'<div class="ft2-bottom">© 2026 Prodiconseil · Stock papier &amp; carton · Dépôt Amiens — 14 000 m² · <a href="/confidentialite/">Confidentialité</a></div>';
  var olds=Array.prototype.slice.call(document.querySelectorAll('footer'));
  if(olds.length){
    olds[olds.length-1].parentNode.insertBefore(f,olds[olds.length-1]);
    olds.forEach(function(o){o.remove();});
  }else{
    document.body.appendChild(f);
  }
})();
