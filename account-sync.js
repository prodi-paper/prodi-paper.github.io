/* ───────────────────────────────────────────────────────────────────────────
   account-sync.js — persistance liée au COMPTE (Supabase) : panier + commandes.
   Chargé sur l'accueil/catalogue, le panier et mon-prodiconseil.

   - Panier : wrap localStorage.setItem('prodi_cart') → upsert table user_carts
     (debounced). À la connexion, FUSION panier local + panier compte.
   - Commandes réservées : prodiPushOrder() → insert user_orders ; prodiPullOrders().

   Invité (non connecté) : tout reste en localStorage, aucun appel réseau.
   RLS : apikey = anon, Authorization = JWT utilisateur (role authenticated,
   auth.uid() = user_id). Token non rafraîchi ici → valable ~1 h après login
   (suffisant pour la maquette ; compte/ recharge le token via supabase-js).
──────────────────────────────────────────────────────────────────────────── */
(function(){
  var SB='https://bvcgpdoukhcatjibmvnb.supabase.co';
  var ANON='eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJ2Y2dwZG91a2hjYXRqaWJtdm5iIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzIyNzg5MjgsImV4cCI6MjA4Nzg1NDkyOH0.Ip3ykSUS9sajTH04yXBerOG1haBKMD1kAvMQNjnGL1Q';
  var AUTH_KEY='sb-bvcgpdoukhcatjibmvnb-auth-token';
  /* Mode partagé / lien client / édition (?s= ?share= ?edit=) : le « panier » n'est
     PAS celui de l'utilisateur mais une sélection client → account-sync TOTALEMENT
     inerte (ne jamais fusionner ni pousser), pour garder /catalogue/?s=… intact. */
  var _SHARED=/[?&](s|share|edit)=/.test(location.search);

  function _auth(){try{return JSON.parse(localStorage.getItem(AUTH_KEY)||'null');}catch(e){return null;}}
  function _tok(){var s=_auth();return s&&s.access_token;}
  function _uid(){var s=_auth();return s&&s.user&&s.user.id;}
  function _hdr(extra){
    var h={'apikey':ANON,'Authorization':'Bearer '+(_tok()||ANON),'Content-Type':'application/json'};
    if(extra)for(var k in extra)h[k]=extra[k];
    return h;
  }
  function _lireCart(){try{return JSON.parse(localStorage.getItem('prodi_cart')||'[]')||[];}catch(e){return [];}}
  function _refKey(it){return String(it&&it.ref||'').replace(/^Photo_/i,'').toUpperCase();}

  /* ── PANIER : push debounced vers user_carts (upsert) ── */
  var _pt, _pushing=false;
  window.prodiPushCart=function(items){
    if(!_uid()||_SHARED)return;
    var data=items||_lireCart();
    clearTimeout(_pt);
    _pt=setTimeout(function(){
      _pushing=true;
      fetch(SB+'/rest/v1/user_carts?on_conflict=user_id',{
        method:'POST',
        headers:_hdr({'Prefer':'resolution=merge-duplicates,return=minimal'}),
        body:JSON.stringify({user_id:_uid(),items:data,updated_at:new Date().toISOString()})
      }).catch(function(){}).then(function(){_pushing=false;});
    },600);
  };

  /* ── À la connexion : FUSION panier local + panier compte (union par réf) ── */
  window.prodiSyncCartOnLogin=function(cb){
    if(!_uid()||_SHARED){cb&&cb(null);return;}
    fetch(SB+'/rest/v1/user_carts?select=items&user_id=eq.'+_uid(),{headers:_hdr()})
      .then(function(r){return r.ok?r.json():[];})
      .then(function(rows){
        var remote=(rows&&rows[0]&&rows[0].items)||[];
        var local=_lireCart();
        var map={};
        remote.forEach(function(it){if(it)map[_refKey(it)]=it;});
        local.forEach(function(it){if(it)map[_refKey(it)]=it;}); // le local prime (données fraîches)
        var merged=Object.keys(map).filter(function(k){return k;}).map(function(k){return map[k];});
        var changed=JSON.stringify(merged)!==JSON.stringify(local);
        try{localStorage.setItem('prodi_cart',JSON.stringify(merged));}catch(e){} // (déclenche le push via le wrap)
        // rafraîchir l'UID catalogue si présent
        try{ if(typeof cart!=='undefined'){ cart.length=0; merged.forEach(function(x){cart.push(x);}); } }catch(e){}
        try{ if(window.updateCartBadge) window.updateCartBadge(); }catch(e){}
        try{ if(window.renderDrawer) window.renderDrawer(); }catch(e){}
        try{ window.dispatchEvent(new CustomEvent('prodi-cart-synced',{detail:{items:merged,changed:changed}})); }catch(e){}
        try{ window.prodiTrack&&window.prodiTrack('panier_sync',{n:merged.length,changed:changed}); }catch(e){}
        if(!changed) window.prodiPushCart(merged); // s'assurer que le compte a au moins le panier
        cb&&cb(merged);
      }).catch(function(){cb&&cb(null);});
  };

  /* ── COMMANDES : push / pull user_orders ── */
  window.prodiPushOrder=function(order){
    if(!_uid()||!order)return Promise.resolve(false);
    var o={
      id:order.id, user_id:_uid(),
      created_at:new Date(order.created_at||Date.now()).toISOString(),
      expires_at:order.expires_at?new Date(order.expires_at).toISOString():null,
      status:order.status||'reserved', items:order.items||[],
      n:order.n, bobines:order.bobines, formats:order.formats, tonnage:order.tonnage,
      dest_port:order.dest_port||null, dest_rate:order.dest_rate||0,
      marchandise_eur:order.marchandise_eur||0, transport_eur:order.transport_eur||0, total_cfr_eur:order.total_cfr_eur||0
    };
    return fetch(SB+'/rest/v1/user_orders',{method:'POST',headers:_hdr({'Prefer':'return=minimal'}),body:JSON.stringify(o)})
      .then(function(r){return r.ok;}).catch(function(){return false;});
  };
  window.prodiPullOrders=function(){
    if(!_uid())return Promise.resolve(null);
    return fetch(SB+'/rest/v1/user_orders?select=*&user_id=eq.'+_uid()+'&order=created_at.desc',{headers:_hdr()})
      .then(function(r){return r.ok?r.json():null;}).catch(function(){return null;});
  };

  window.prodiAccountLogged=function(){return !!_uid();};

  /* ── WRAP localStorage.setItem : toute écriture du panier → push compte ── */
  try{
    var _origSet=localStorage.setItem.bind(localStorage);
    localStorage.setItem=function(k,v){
      _origSet(k,v);
      if(k==='prodi_cart' && !_pushing && !_SHARED){ try{ window.prodiPushCart(JSON.parse(v||'[]')); }catch(e){} }
    };
  }catch(e){}

  /* ── Au chargement : si connecté, fusionner le panier ── */
  if(document.readyState==='loading'){
    document.addEventListener('DOMContentLoaded',function(){ if(_uid()&&!_SHARED) window.prodiSyncCartOnLogin(); });
  } else { if(_uid()&&!_SHARED) window.prodiSyncCartOnLogin(); }
})();
