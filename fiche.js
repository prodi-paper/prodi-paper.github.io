/* Fiche produit « étiquette » — SOURCE UNIQUE partagée par le catalogue
   (modale openDetail + album de lot) et la page panier. Avant, chaque page
   avait sa copie du markup → divergences visibles (04/10). Ici une seule
   génération du HTML ; chaque page fournit ses helpers via l'objet H. */
(function(){
  if(window.ProdiFiche)return;
  function esc(s){return String(s==null?'':s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#39;');}
  function safeUrl(u){return /^https?:\/\//.test(String(u||''))?String(u):'';}

  /* Grille caractéristiques (det-etq) + ligne ZONE/Code douanier (det-reste).
     H = { estFormat(p), detail(p), title(p), hs(p)|null, mm(v),
           showPriceRow(bool), priceVal(p)->html|'—', usineInReste(bool) } */
  function specsHTML(p, H){
    H=H||{};
    var mm=H.mm||function(v){return v;};
    var isPal=H.estFormat?H.estFormat(p):(p.format!=='Bobine');
    var uR=p.usine?String(p.usine).replace(/^REF\s*/i,''):null;
    var detail=H.detail?H.detail(p):(p.details||'');
    var title=H.title?H.title(p):(p.titre||p.name||'Produit');
    var et=[];
    et.push({val:esc(detail||'—'),sub:true});
    et.push({lbl:'Grammage',val:p.grammage?esc(p.grammage)+' <small>g/m²</small>':'—',span:isPal?2:0});
    if(isPal){
      et.push({lbl:'Dimensions',val:(p.largeur&&p.longueur)?esc(mm(Math.min(p.largeur,p.longueur))+' × '+mm(Math.max(p.largeur,p.longueur)))+' <small>mm</small>':(p.largeur?esc(mm(p.largeur))+' <small>mm</small>':'—'),span:2});
    }else{
      et.push({lbl:'Laize',val:p.largeur?esc(mm(p.largeur))+' <small>mm</small>':'—'});
      et.push({lbl:'Diamètre',val:p.longueur?esc(mm(p.longueur))+' <small>mm</small>':'—'});
      et.push({lbl:'Mandrin',val:p.noyau?esc(p.noyau)+' <small>mm</small>':'—'});
    }
    et.push({lbl:'Couleur',val:esc(p.couleur||'—'),span:2});
    et.push({lbl:'Poids net',val:p.poids_net?esc(Math.round(p.poids_net).toLocaleString('fr-FR'))+' <small>kgs</small>':'—',span:2});
    var reste=[{lbl:'Zone',val:p.allee||p.zone||'—'}];
    var hs=H.hs?H.hs(p):'';
    if(hs)reste.push({lbl:'Code douanier',val:hs});
    var showPrice=H.showPriceRow;
    if(showPrice){
      var prixV=H.priceVal?H.priceVal(p):'—';
      et.push({lbl:'Usine',val:uR?esc(uR):'—',span:2});
      et.push({val:prixV,span:2,prix:true});
    }else if(uR&&H.usineInReste){
      reste.splice(1,0,{lbl:'Usine',val:esc(uR)});
    }
    return '<div class="det-etq"><div class="det-etq-cell det-etq-title" style="grid-column:1/-1;">'+esc(title)+'</div>'+et.map(function(s){
        if(s.sub)return '<div class="det-etq-cell det-etq-sub" style="grid-column:1/-1;"><div class="det-etq-val">'+s.val+'</div></div>';
        if(s.prix)return '<div class="det-etq-cell det-etq-prix" style="grid-column:span 2;"><div class="det-etq-val det-etq-prixval">'+s.val+'</div></div>';
        return '<div class="det-etq-cell"'+(s.span?' style="grid-column:span '+s.span+';"':'')+'><div class="det-etq-lbl">'+esc(s.lbl)+'</div><div class="det-etq-val">'+s.val+'</div></div>';
      }).join('')+'</div>'+
      (reste.length?'<div class="det-reste">'+reste.map(function(s){return '<span class="det-reste-item"><b>'+esc(s.lbl)+'</b> '+esc(s.val)+'</span>';}).join('')+'</div>':'');
  }

  /* Colonne photo (fond flouté + photo + pastilles réf ⎘ / usine).
     opts = { onclick?:string (JS pour la zone photo), imgThumb?:fn } */
  function photoColHTML(p, opts){
    opts=opts||{};
    var url=safeUrl(p.image_url||p.img||'');
    var thumb=opts.imgThumb?opts.imgThumb(url):url;
    var alt=[p.name||p.titre,p.grammage?p.grammage+'g/m²':'',p.couleur].filter(Boolean).join(' — ')||'Produit';
    var photo=url
      ?'<div class="det-blur" style="background-image:url(\''+esc(url)+'\')"></div><img src="'+esc(thumb)+'" loading="lazy" alt="'+esc(alt)+'" onerror="this.onerror=null;this.src=\'/img/no-photo.png\'">'
      :'<img src="/img/no-photo.png" alt="">';
    var refTxt=String(p.ref||'').replace(/^Photo_/i,'').toUpperCase();
    var usine=p.usine?String(p.usine).replace(/^REF\s*/i,''):'';
    return '<div class="dimg-col">'
      +'<div class="dmain"'+(opts.onclick?' onclick="'+opts.onclick+'" title="Ouvrir la fiche" style="cursor:zoom-in"':'')+'>'+photo+'</div>'
      +(refTxt?'<div class="xla-refb" title="Copier la référence">'+esc(refTxt)+' ⎘</div>':'')
      +(usine?'<div class="xla-usineb"><span>Usine</span><b>'+esc(usine)+'</b></div>':'')
    +'</div>';
  }

  window.ProdiFiche={ specsHTML:specsHTML, photoColHTML:photoColHTML, esc:esc, safeUrl:safeUrl };
})();
