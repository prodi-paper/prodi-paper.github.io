/* ────────────────────────────────────────────────────────────────────────
   PERF HUD — traqueur de fluidité, à la demande.

   Activation : ajouter ?perf=1 à l'URL (mémorisé en localStorage → reste actif
   sur l'appareil, ordi ou téléphone, tant qu'on ne le coupe pas).
   Couper : ?perf=0 (ou __perf.off()).
   AUCUN effet pour un visiteur normal : sans le flag, ce script sort tout de
   suite (return) et ne crée rien.

   Ce qu'il mesure en continu :
     • FPS (courant + minimum glissant)          → saccades perçues
     • Long tasks + TBT (Total Blocking Time)    → main thread bloqué
     • dernier long task + INP (pire interaction)→ réactivité au clic/scroll
     • LCP, CLS, nombre de nœuds DOM             → chargement + stabilité
   Deux bancs d'essai (boutons) :
     • « test filtres » : chronomètre _refreshAllFacets() (le recalcul des
       compteurs de filtres sur tout le stock) — c'est LE chemin chaud.
     • « test scroll » : scrolle la grille et relève le FPS minimum.
   Console : window.__perf.report() / .benchFacets() / .benchScroll()
   ──────────────────────────────────────────────────────────────────────── */
(function(){
  var qs=new URLSearchParams(location.search);
  try{
    if(qs.get('perf')==='0'){ localStorage.removeItem('prodi_perf'); return; }
    if(qs.has('perf')) localStorage.setItem('prodi_perf','1');
  }catch(e){}
  var on=false;
  try{ on=qs.has('perf')||localStorage.getItem('prodi_perf')==='1'; }catch(e){ on=qs.has('perf'); }
  if(!on) return;

  var S={fps:0,fpsMin:999,longCount:0,tbt:0,lastLong:0,inp:0,lcp:0,cls:0,long:[],out:''};
  var fpsWin=[];

  // ── FPS (boucle rAF) ──
  var frames=0,last=performance.now();
  function tick(now){
    frames++;
    if(now-last>=500){
      var fps=Math.round(frames*1000/(now-last));
      S.fps=fps; fpsWin.push(fps); if(fpsWin.length>8)fpsWin.shift();
      S.fpsMin=Math.min.apply(null,fpsWin); frames=0; last=now; paint();
    }
    requestAnimationFrame(tick);
  }
  requestAnimationFrame(tick);

  // ── Observers (chacun protégé : dégrade si non supporté, ex. vieux Safari) ──
  function obs(type,cb,extra){
    try{ var o=new PerformanceObserver(function(l){cb(l.getEntries());}); o.observe(Object.assign({type:type,buffered:true},extra||{})); }catch(e){}
  }
  obs('longtask',function(es){
    es.forEach(function(e){
      S.longCount++; S.tbt+=Math.max(0,e.duration-50); S.lastLong=Math.round(e.duration);
      S.long.unshift(Math.round(e.duration)); if(S.long.length>8)S.long.pop();
    });
  });
  obs('event',function(es){ es.forEach(function(e){ if(e.duration>S.inp)S.inp=Math.round(e.duration); }); },{durationThreshold:16});
  obs('largest-contentful-paint',function(es){ if(es.length)S.lcp=Math.round(es[es.length-1].startTime); });
  obs('layout-shift',function(es){ es.forEach(function(e){ if(!e.hadRecentInput)S.cls+=e.value; }); });

  // ── Overlay ──
  var box=document.createElement('div');
  box.id='perf-hud';
  box.style.cssText='position:fixed;left:8px;bottom:8px;z-index:2147483647;font:11px/1.45 ui-monospace,Menlo,monospace;background:rgba(15,15,18,.92);color:#eee;padding:8px 10px;border-radius:9px;max-width:270px;box-shadow:0 6px 24px rgba(0,0,0,.45);-webkit-backdrop-filter:blur(6px);backdrop-filter:blur(6px)';
  function mount(){ if(document.body&&!box.parentNode)document.body.appendChild(box); }
  if(document.body)mount(); else document.addEventListener('DOMContentLoaded',mount);

  var BTN='background:#2a2a31;color:#ddd;border:1px solid #454550;border-radius:5px;padding:3px 6px;font:10px ui-monospace,monospace;cursor:pointer';
  function col(f){ return f>=55?'#3ddc84':f>=30?'#ffcc33':'#ff5555'; }
  function paint(){
    if(!box)return;
    box.innerHTML=
      '<div style="font-weight:700;margin-bottom:4px">⚡ PERF<span style="float:right;cursor:pointer;opacity:.6" onclick="__perf.hide()">✕</span></div>'+
      '<div>FPS <b style="color:'+col(S.fps)+'">'+S.fps+'</b> <span style="opacity:.55">min '+(S.fpsMin===999?'–':S.fpsMin)+'</span></div>'+
      '<div>long tasks <b>'+S.longCount+'</b> · TBT <b>'+Math.round(S.tbt)+'</b>ms</div>'+
      '<div>dernier <b>'+S.lastLong+'</b>ms · INP <b>'+S.inp+'</b>ms</div>'+
      '<div>LCP <b>'+S.lcp+'</b>ms · CLS <b>'+S.cls.toFixed(3)+'</b> · DOM <b>'+document.getElementsByTagName('*').length+'</b></div>'+
      (S.long.length?'<div style="opacity:.55;margin-top:2px">pires: '+S.long.map(function(d){return d+'ms';}).join(' ')+'</div>':'')+
      '<div style="margin-top:6px;display:flex;gap:4px;flex-wrap:wrap">'+
        '<button style="'+BTN+'" onclick="__perf.benchFacets()">test filtres</button>'+
        '<button style="'+BTN+'" onclick="__perf.benchScroll()">test scroll</button>'+
        '<button style="'+BTN+'" onclick="__perf.reset()">reset</button>'+
      '</div>'+
      (S.out?'<div style="margin-top:5px;color:#8fdcff">'+S.out+'</div>':'');
  }

  function sleep(ms){ return new Promise(function(r){ setTimeout(r,ms); }); }

  // ── Banc : recalcul des facettes (chemin chaud du filtrage) ──
  async function ensureCache(){
    if(typeof _allProductsCache!=='undefined'&&_allProductsCache&&_allProductsCache.length) return true;
    if(typeof _loadAllProducts==='function'){ S.out='chargement du stock…'; paint(); try{ await _loadAllProducts(); }catch(e){} }
    return typeof _allProductsCache!=='undefined'&&!!_allProductsCache&&!!_allProductsCache.length;
  }
  async function benchFacets(){
    if(typeof _refreshAllFacets!=='function'){ S.out='_refreshAllFacets introuvable'; paint(); return null; }
    if(!(await ensureCache())){ S.out='stock non chargé'; paint(); return null; }
    var runs=[];
    for(var i=0;i<9;i++){
      // Invalide les caches de signature, sinon _refreshAllFacets skippe tout
      // (il ne recalcule que si un filtre a changé) → on mesurerait le no-op.
      try{ if(typeof _facetSig!=='undefined'&&_facetSig)Object.keys(_facetSig).forEach(function(k){delete _facetSig[k];}); }catch(e){}
      try{ _detailsLastSig=null; }catch(e){}
      var t=performance.now(); _refreshAllFacets(); runs.push(performance.now()-t); await sleep(25);
    }
    runs.sort(function(a,b){return a-b;});
    var med=runs[Math.floor(runs.length/2)];
    var res={median:+med.toFixed(2),min:+runs[0].toFixed(2),max:+runs[runs.length-1].toFixed(2),refs:_allProductsCache.length,n:runs.length};
    S.out='facettes ('+res.refs+' réfs) : médiane <b>'+res.median+'ms</b> ['+res.min+'–'+res.max+']';
    paint(); console.log('[perf] _refreshAllFacets ms:',runs,res);
    return res;
  }

  // ── Banc : FPS pendant un scroll programmé de la grille ──
  async function benchScroll(){
    S.out='scroll en cours…'; paint();
    var top0=window.scrollY;
    var H=Math.max(document.body.scrollHeight,window.innerHeight*4);
    return await new Promise(function(resolve){
      var minf=999,fr=0,l=performance.now(),step=0,STEPS=48;
      function loop(now){
        fr++;
        if(now-l>=200){ var f=Math.round(fr*1000/(now-l)); if(f<minf)minf=f; fr=0; l=now; }
        if(step<STEPS){ step++; window.scrollTo(0,(step/STEPS)*H); requestAnimationFrame(loop); }
        else { window.scrollTo(0,top0); var res={minFps:minf===999?null:minf,dom:document.getElementsByTagName('*').length};
          S.out='scroll : FPS min <b>'+res.minFps+'</b> · DOM '+res.dom; paint();
          console.log('[perf] scroll',res); resolve(res); }
      }
      requestAnimationFrame(loop);
    });
  }

  window.__perf={
    state:S, benchFacets:benchFacets, benchScroll:benchScroll,
    reset:function(){ S.longCount=0;S.tbt=0;S.lastLong=0;S.inp=0;S.cls=0;S.long=[];S.fpsMin=999;fpsWin=[];S.out=''; paint(); },
    hide:function(){ box.style.display='none'; },
    show:function(){ box.style.display=''; },
    off:function(){ try{localStorage.removeItem('prodi_perf');}catch(e){} box.remove(); },
    report:function(){ return {fps:S.fps,fpsMin:S.fpsMin,longCount:S.longCount,tbt:Math.round(S.tbt),lastLong:S.lastLong,inp:S.inp,lcp:S.lcp,cls:+S.cls.toFixed(3),dom:document.getElementsByTagName('*').length}; }
  };
  paint();
})();
