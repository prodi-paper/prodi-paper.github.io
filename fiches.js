/* fiches.js — Bouton « Fiches » (header) + panneau Fiches techniques / Certificats.
   INTERNE seulement (jamais en vue client ?s=). Module AUTONOME : n'utilise pas
   le moteur de menus du catalogue. Charge fiches/manifest.json = cerveau curé
   (famille catalogue → fiches, avec dos + plage de grammage réelle + certifs).
   RÈGLE DE MATCH = qualité + grammage. JAMAIS le n° d'usine (le n° imprimé sur
   une fiche = n° de FORMULAIRE Prodi, pas le moulin — cf mémoire). */
(function(){
  'use strict';
  if(/[?&](s|share)=/.test(location.search)) return; // vue client : jamais de bouton

  var MAN=null;

  /* ---------- styles ---------- */
  var st=document.createElement('style');
  st.textContent=[
    '#fiche-bg{position:fixed;inset:0;background:rgba(0,0,0,.42);z-index:3000;display:none;',
      'align-items:flex-start;justify-content:center;padding:40px 16px;overflow-y:auto}',
    '#fiche-bg.show{display:flex}',
    '#fiche-panel{background:#fff;border-radius:20px;box-shadow:0 20px 60px rgba(0,0,0,.25);',
      'width:100%;max-width:720px;overflow:hidden;font-family:"DM Sans",sans-serif}',
    '#fiche-panel .fp-head{display:flex;align-items:center;justify-content:space-between;',
      'padding:18px 20px;border-bottom:1px solid #e8e8e4}',
    '#fiche-panel .fp-title{font-size:18px;font-weight:800;color:#1d1d1f}',
    '#fiche-panel .fp-x{width:34px;height:34px;border:none;background:#f5f5f3;border-radius:999px;',
      'font-size:18px;color:#6e6e73;cursor:pointer;line-height:1}',
    '#fiche-panel .fp-body{padding:14px 20px 22px;max-height:70vh;overflow-y:auto}',
    '#fiche-search{width:100%;height:40px;border:1.5px solid #e8e8e4;border-radius:10px;',
      'padding:0 14px;font:inherit;font-size:15px;outline:none;box-sizing:border-box;margin-bottom:6px}',
    '#fiche-search:focus{border-color:#FE0000}',
    '.fp-auto{background:#ffecec;border:1px solid #ffd0d0;border-radius:12px;padding:12px 14px;margin:8px 0 14px}',
    '.fp-auto-hd{font-size:12.5px;font-weight:700;color:#FE0000;text-transform:uppercase;letter-spacing:.04em;margin-bottom:8px}',
    '.fp-auto-ctx{font-weight:800;color:#1d1d1f}',
    '.fp-grp{margin:14px 0 4px;font-size:11px;font-weight:800;color:#86868b;text-transform:uppercase;letter-spacing:.05em}',
    '.fp-row{display:flex;align-items:center;gap:10px;padding:9px 10px;border-radius:10px;cursor:pointer;',
      'text-decoration:none;color:inherit}',
    '.fp-row:hover{background:#f5f5f3}',
    '.fp-ic{flex:0 0 30px;height:30px;border-radius:7px;background:#FE0000;display:flex;align-items:center;',
      'justify-content:center;color:#fff;font-size:10px;font-weight:800}',
    '.fp-ic.cert{background:#1d1d1f}',
    '.fp-tx{flex:1;min-width:0}',
    '.fp-nm{font-size:14.5px;font-weight:600;color:#1d1d1f;line-height:1.2}',
    '.fp-sub{font-size:12px;color:#86868b;margin-top:2px}',
    '.fp-note{font-size:12px;color:#a06;background:#fff6f6;border-radius:8px;padding:6px 9px;margin:6px 0 2px}',
    '.fp-tag{display:inline-block;font-size:10.5px;font-weight:800;padding:2px 7px;border-radius:999px;margin-left:6px;vertical-align:middle;white-space:nowrap}',
    '.fp-tag.usine{background:#e5f6ea;color:#137a37}',
    '.fp-tag.ref{background:#fff2df;color:#9a5b00}',
    '.fp-stock{font-size:12.5px;color:#1d1d1f;background:#fff;border:1px solid #ffd0d0;border-radius:8px;padding:7px 10px;margin:8px 0 2px;line-height:1.5}',
    '.fp-stock b{color:#137a37}',
    '.fp-tools{display:flex;gap:8px;margin:0 0 10px;flex-wrap:wrap}',
    '.fp-refbox{display:flex;gap:6px;flex:1;min-width:200px}',
    '.fp-refbox input{flex:1;height:38px;border:1.5px solid #e8e8e4;border-radius:10px;padding:0 12px;font:inherit;font-size:14px;outline:none;box-sizing:border-box}',
    '.fp-refbox input:focus{border-color:#FE0000}',
    '.fp-refbox button,.fp-drop{height:38px;border-radius:10px;font:inherit;font-size:13.5px;font-weight:700;cursor:pointer;display:flex;align-items:center;justify-content:center;box-sizing:border-box;white-space:nowrap}',
    '.fp-refbox button{border:none;background:#FE0000;color:#fff;padding:0 16px}',
    '.fp-drop{border:1.5px dashed #d0d0d0;background:#fafafa;color:#1d1d1f;padding:0 14px;gap:6px}',
    '.fp-drop.drag{border-color:#FE0000;background:#fff0f0}',
    '.fp-back{display:inline-block;font-size:13px;font-weight:700;color:#FE0000;text-decoration:none;margin:0 0 8px;cursor:pointer}',
    '.fp-prod{border:1px solid #eee;border-radius:12px;padding:8px 10px;margin:8px 0}',
    '.fp-prod-hd{font-size:13.5px;font-weight:800;color:#1d1d1f;margin:2px 4px 6px}',
    '.fp-busy{color:#86868b;font-size:14px;padding:14px 2px}',
    '.fp-empty{color:#86868b;font-size:14px;padding:10px 2px}',
    '@media(max-width:768px){#fiche-bg{padding:16px 10px}}'
  ].join('');
  document.head.appendChild(st);

  /* ---------- helpers ---------- */
  function esc(s){return String(s==null?'':s).replace(/[&<>"']/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c];});}
  function track(ev,pr){try{window.prodiTrack&&prodiTrack(ev,pr||{});}catch(e){}}
  function openPdf(file,label){window.open('/fiches/'+encodeURIComponent(file),'_blank','noopener');track('fiche_ouverte',{file:file,label:label||''});}

  // qualité(s) actuellement filtrée(s) dans le catalogue (DOM d'abord, msdState en repli)
  function selectedQualities(){
    var set=new Set();
    document.querySelectorAll('#sb-msd-type .msd-option.selected,[id^="msd-type"] .msd-option.selected')
      .forEach(function(o){if(o.dataset&&o.dataset.val)set.add(o.dataset.val);});
    if(!set.size&&typeof msdState!=='undefined'&&msdState['msd-type'])msdState['msd-type'].forEach(function(v){set.add(v);});
    return Array.from(set);
  }
  function grammageFilter(){
    var g=function(id){var e=document.getElementById(id);var v=e&&e.value!==''?+e.value:null;return (v&&v>0)?v:null;};
    return {min:g('f-gmin'),max:g('f-gmax')};
  }
  function labelOf(code){return (typeof QUALITE_LABELS!=='undefined'&&QUALITE_LABELS[code])||code;}
  // une fiche est compatible avec [gmin,gmax] si les plages se chevauchent (ou fiche sans plage)
  function gsmOK(f,gmin,gmax){
    if(f.gsmMin==null&&f.gsmMax==null)return true;
    if(gmin==null&&gmax==null)return true;
    var lo=f.gsmMin!=null?f.gsmMin:0, hi=f.gsmMax!=null?f.gsmMax:99999;
    var a=gmin!=null?gmin:0, b=gmax!=null?gmax:99999;
    return lo<=b && hi>=a;
  }
  function certById(id){ return (MAN&&MAN.certs||[]).filter(Boolean).find(function(c){return c.id===id;})||null; }

  // Usines réellement EN STOCK pour une qualité (source = catalogue Supabase, clé anon publique)
  var SB='https://bvcgpdoukhcatjibmvnb.supabase.co/rest/v1/';
  var SBKEY='eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJ2Y2dwZG91a2hjYXRqaWJtdm5iIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzIyNzg5MjgsImV4cCI6MjA4Nzg1NDkyOH0.Ip3ykSUS9sajTH04yXBerOG1haBKMD1kAvMQNjnGL1Q';
  var _stockCache={};
  function fetchStockUsines(codes,cb){
    var key=codes.slice().sort().join(',');
    if(_stockCache[key])return cb(_stockCache[key]);
    var url=SB+'products?select=usine,gsm&quality=in.('+codes.join(',')+')'
      +'&usine=not.is.null&emplacement=eq.'+encodeURIComponent('OUR WAREHOUSE')+'&source=neq.inventaire&limit=4000';
    fetch(url,{headers:{apikey:SBKEY,authorization:'Bearer '+SBKEY}}).then(function(r){return r.json();}).then(function(rows){
      var m={};
      (rows||[]).forEach(function(r){
        var u=r.usine; if(!u)return;
        if(!m[u])m[u]={n:0,gmin:null,gmax:null};
        m[u].n++;
        if(r.gsm){ if(m[u].gmin==null||r.gsm<m[u].gmin)m[u].gmin=r.gsm; if(m[u].gmax==null||r.gsm>m[u].gmax)m[u].gmax=r.gsm; }
      });
      var arr=Object.keys(m).map(function(u){return {usine:u,n:m[u].n,gmin:m[u].gmin,gmax:m[u].gmax};})
        .sort(function(a,b){return b.n-a.n;});
      _stockCache[key]=arr; cb(arr);
    }).catch(function(){cb(null);});
  }

  function ficheRow(f,fam){
    var bits=[]; if(f.fini)bits.push(f.fini); if(f.dos)bits.push(f.dos);
    var g=(f.gsmMin!=null||f.gsmMax!=null)?((f.gsmMin||'?')+'–'+(f.gsmMax||'?')+' g'+(f.approx?' ~':'')):'';
    if(g)bits.push(g);
    var sub=bits.join(' · ');
    var tag = f.usine ? '<span class="fp-tag usine">usine '+esc(f.usine)+'</span>'
            : f.ref   ? '<span class="fp-tag ref">réf '+esc(f.ref)+' · à confirmer</span>' : '';
    return '<a class="fp-row" href="/fiches/'+encodeURIComponent(f.file)+'" target="_blank" rel="noopener" '
      +'onclick="event.preventDefault();window._ficheOpen('+"'"+f.file.replace(/'/g,"\\'")+"','"+esc(fam).replace(/'/g,"\\'")+"'"+')">'
      +'<span class="fp-ic">PDF</span><span class="fp-tx"><div class="fp-nm">'+esc(fam)+(f.fini?' — '+esc(f.fini):(f.dos?' — '+esc(f.dos):''))+tag+'</div>'
      +(sub?'<div class="fp-sub">'+esc(sub)+'</div>':'')+'</span></a>';
  }
  function browseRow(it){
    return '<a class="fp-row" href="/fiches/'+encodeURIComponent(it.file)+'" target="_blank" rel="noopener" '
      +'onclick="event.preventDefault();window._ficheOpen('+"'"+it.file.replace(/'/g,"\\'")+"','browse'"+')">'
      +'<span class="fp-ic">PDF</span><span class="fp-tx"><div class="fp-nm">'+esc(it.name)+'</div></span></a>';
  }
  function certRow(c){
    return '<a class="fp-row" href="/fiches/'+encodeURIComponent(c.file)+'" target="_blank" rel="noopener" '
      +'onclick="event.preventDefault();window._ficheOpen('+"'"+c.file.replace(/'/g,"\\'")+"','cert'"+')">'
      +'<span class="fp-ic cert">CERT</span><span class="fp-tx"><div class="fp-nm">'+esc(c.label)+'</div>'
      +'<div class="fp-sub">'+esc(c.scope)+'</div></span></a>';
  }
  window._ficheOpen=openPdf;

  /* ---------- RÉFÉRENCE → FICHE + DÉPÔT DE FICHIER ---------- */
  function cleanRef(r){return String(r||'').replace(/^Photo_?/i,'');}
  function detectDos(p){
    var s=((p.details||'')+' '+(p.color||'')).toUpperCase();
    if(/CR[EÈ]ME/.test(s))return 'crème';
    if(/DOS GRIS|\bGRIS\b/.test(s))return 'gris';
    if(/DOS KRAFT|\bKRAFT\b/.test(s))return 'kraft';
    if(/DOS BOIS|\bBOIS\b/.test(s))return 'bois';
    if(/DOS BLANC|\bBLANC\b/.test(s))return 'blanc';
    return '';
  }
  // produit catalogue -> fiches probables (famille + grammage + dos)
  function matchProduct(p){
    var dos=detectDos(p);
    var fams=(MAN.families||[]).filter(function(F){return F.codes.indexOf(p.quality)>=0;});
    var pairs=[], certIds=[];
    fams.forEach(function(F){
      (F.certs||[]).forEach(function(id){if(certIds.indexOf(id)<0)certIds.push(id);});
      F.fiches.forEach(function(f){
        if(p.gsm&&!gsmOK(f,p.gsm,p.gsm))return;
        var score=(dos&&f.dos&&f.dos.toLowerCase().indexOf(dos)>=0)?2:0;
        pairs.push({f:f,fam:F.label,score:score});
      });
    });
    // Fallback PAR DÉTAIL : familles hétérogènes (luxe, emballage) où la fiche
    // dépend du type écrit dans `details` (calque≈glassine, chromolux≈couché 1F…).
    var det=((p.details||'')+' '+(p.color||'')).toUpperCase();
    (MAN.detailRules||[]).forEach(function(rule){
      if(rule.codes.indexOf(p.quality)<0)return;
      if(!rule.kw.some(function(k){return det.indexOf(k)>=0;}))return;
      if(pairs.some(function(o){return o.f.file===rule.file;}))return;
      pairs.push({f:{file:rule.file,dos:rule.label,approx:true},fam:labelOf(p.quality),score:1});
    });
    var hasDos=pairs.some(function(o){return o.score>0;});
    var list=(dos&&hasDos)?pairs.filter(function(o){return o.score>0;}):pairs;
    list.sort(function(a,b){return b.score-a.score;});
    return {label:(fams[0]&&fams[0].label)||labelOf(p.quality),dos:dos,pairs:list,certIds:certIds};
  }

  function bodyEl(){return document.getElementById('fiche-body');}
  function setBusy(msg){var b=bodyEl();if(b)b.innerHTML='<div class="fp-busy">'+esc(msg)+'</div>';}
  function backLink(){return '<a class="fp-back" href="#" onclick="event.preventDefault();window._ficheReset()">← Retour à la liste</a>';}
  window._ficheReset=function(){var s=document.getElementById('fiche-search');if(s)s.value='';render('');};

  function renderResults(products,notFound,title){
    var b=bodyEl();if(!b)return;
    var html=backLink()+'<div class="fp-grp">'+esc(title)+'</div>';
    (products||[]).forEach(function(p){
      var m=matchProduct(p);
      var ctx=[m.label,(p.gsm?p.gsm+' g':''),(p.usine?'usine '+p.usine:''),(m.dos?'dos '+m.dos:''),(p.color||'')].filter(Boolean).join(' · ');
      html+='<div class="fp-prod"><div class="fp-prod-hd">Réf '+esc(cleanRef(p.ref))+' — '+esc(ctx)+'</div>';
      if(m.pairs.length)m.pairs.forEach(function(o){html+=ficheRow(o.f,o.fam);});
      else html+='<div class="fp-empty">Pas de fiche pour la qualité '+esc(m.label)+'.</div>';
      m.certIds.forEach(function(id){var c=certById(id);if(c)html+=certRow(c);});
      html+='</div>';
    });
    (notFound||[]).forEach(function(r){
      html+='<div class="fp-prod"><div class="fp-prod-hd">Réf '+esc(r)+' — <span style="color:#c00">introuvable au catalogue</span></div></div>';
    });
    if(!(products&&products.length)&&!(notFound&&notFound.length))html+='<div class="fp-empty">Aucun résultat.</div>';
    b.innerHTML=html;
  }

  var SEL_PROD='ref,quality,color,gsm,width,longueur,usine,details';
  function lookupRef(v){
    var d=(v||'').replace(/\D/g,'');
    if(d.length<4){setBusy('Entre un n° de référence (≥ 4 chiffres).');return;}
    setBusy('Recherche de la réf '+d+'…');
    fetch(SB+'products?select='+SEL_PROD+'&ref=ilike.*'+encodeURIComponent(d)+'*&limit=25',
      {headers:{apikey:SBKEY,authorization:'Bearer '+SBKEY}})
      .then(function(r){return r.json();}).then(function(rows){
        if(!rows||!rows.length)renderResults([],[d],'Réf '+d);
        else renderResults(rows,[],'Réf '+d+' · '+rows.length+' article'+(rows.length>1?'s':''));
      }).catch(function(){setBusy('Erreur réseau.');});
  }
  function extractRefs(text){
    var m=(text||'').match(/\b\d{6}\b/g)||[];
    return Array.from(new Set(m));
  }
  function batchLookup(refs,cb){
    var chunks=[];for(var i=0;i<refs.length;i+=100)chunks.push(refs.slice(i,i+100));
    if(!chunks.length)return cb([]);
    var all=[],done=0;
    chunks.forEach(function(ch){
      var url=SB+'products?select='+SEL_PROD+'&ref=in.('+ch.map(function(r){return encodeURIComponent('Photo_'+r);}).join(',')+')';
      fetch(url,{headers:{apikey:SBKEY,authorization:'Bearer '+SBKEY}})
        .then(function(r){return r.json();}).then(function(rows){all=all.concat(rows||[]);})
        .catch(function(){}).then(function(){if(++done===chunks.length)cb(all);});
    });
  }
  var OCR_API='https://prodi-arrivages.vercel.app/api/ocr-refs'; // Haiku vision (repo arrivages)
  function msg(t){var b=bodyEl();if(b)b.innerHTML=backLink()+'<div class="fp-empty">'+esc(t)+'</div>';}
  function finishRefs(refs,file){
    if(!refs||!refs.length){msg('Aucune référence à 6 chiffres trouvée.');return;}
    setBusy(refs.length+' références lues, recherche des fiches…');
    batchLookup(refs,function(products){
      var found={};(products||[]).forEach(function(p){found[cleanRef(p.ref)]=true;});
      var notFound=refs.filter(function(r){return !found[r];});
      renderResults(products,notFound,esc(file.name)+' · '+refs.length+' réf'+(refs.length>1?'s':''));
    });
  }
  // OCR d'une image/PDF via l'endpoint Haiku vision
  function ocrFile(file,kind,cb){
    setBusy('Lecture par IA (OCR) de « '+esc(file.name)+' »…');
    var reader=new FileReader();
    reader.onload=function(){
      var b64=String(reader.result||'').split(',')[1]||'';
      if(!b64)return cb(null);
      fetch(OCR_API,{method:'POST',headers:{'Content-Type':'application/json'},
        body:JSON.stringify({kind:kind,base64:b64,mediaType:file.type||'image/jpeg'})})
        .then(function(r){return r.json();}).then(function(j){cb((j&&j.refs)||[]);})
        .catch(function(){cb(null);});
    };
    reader.onerror=function(){cb(null);};
    reader.readAsDataURL(file);
  }
  function handleFile(file){
    if(!file)return;
    setBusy('Lecture de « '+esc(file.name)+' »…');
    var isImg=/^image\//.test(file.type)||/\.(jpe?g|png|heic|heif|webp|gif|tiff?)$/i.test(file.name);
    var isPdf=/\.pdf$/i.test(file.name)||file.type==='application/pdf';
    // Image → OCR direct
    if(isImg){ ocrFile(file,'image',function(refs){ if(refs&&refs.length)finishRefs(refs,file); else msg('Aucune référence lue sur la photo.'); }); return; }
    // Autres → extraction texte d'abord (Excel/PDF-texte/CSV/TXT/Word)
    var p;
    try{ p=(typeof _extractTextFromFile==='function')?_extractTextFromFile(file):file.text(); }
    catch(e){ p=Promise.resolve(''); }
    Promise.resolve(p).then(function(text){
      var refs=extractRefs(text);
      if(refs.length)return finishRefs(refs,file);
      // PDF sans texte (scanné) → OCR document
      if(isPdf){ ocrFile(file,'pdf',function(r){ if(r&&r.length)finishRefs(r,file); else msg('Aucune référence à 6 chiffres — PDF illisible.'); }); return; }
      msg('Aucune référence à 6 chiffres trouvée dans ce fichier.');
    }).catch(function(){
      if(isPdf){ ocrFile(file,'pdf',function(r){ if(r&&r.length)finishRefs(r,file); else msg('Lecture impossible.'); }); }
      else msg('Lecture impossible.');
    });
  }
  window._ficheFile=handleFile;

  /* ---------- rendu ---------- */
  function render(q){
    var body=document.getElementById('fiche-body'); if(!body||!MAN)return;
    q=(q||'').trim().toLowerCase();
    var html='';

    // AUTO-MATCH depuis la sélection catalogue (seulement si pas de recherche active)
    var autoCodes=null;
    if(!q){
      var quals=selectedQualities(), gf=grammageFilter();
      var fams=MAN.families.filter(function(F){return F.codes.some(function(c){return quals.indexOf(c)>=0;});});
      if(fams.length){
        autoCodes=[]; fams.forEach(function(F){F.codes.forEach(function(c){if(autoCodes.indexOf(c)<0)autoCodes.push(c);});});
        var ctxLabels=Array.from(new Set(fams.map(function(F){return F.label;}))).join(', ');
        var gtxt=(gf.min||gf.max)?(' · '+(gf.min||'?')+'–'+(gf.max||'?')+' g'):'';
        html+='<div class="fp-auto"><div class="fp-auto-hd">Pour ta sélection</div>';
        html+='<div class="fp-auto-ctx">'+esc(ctxLabels)+gtxt+'</div>';
        html+='<div class="fp-stock" id="fp-stock">Usines en stock… <span style="color:#86868b">chargement</span></div>';
        var any=false;
        fams.forEach(function(F){
          if(F.note)html+='<div class="fp-note">⚠︎ '+esc(F.note)+'</div>';
          F.fiches.forEach(function(f){ if(gsmOK(f,gf.min,gf.max)){html+=ficheRow(f,F.label);any=true;} });
          (F.certs||[]).forEach(function(id){var c=certById(id);if(c)html+=certRow(c);});
        });
        if(!any)html+='<div class="fp-empty">Aucune fiche pile dans cette plage — voir la liste complète ci-dessous.</div>';
        html+='</div>';
      }
    }

    // NAVIGATION / RECHERCHE = TOUTES les fiches (groupées par famille)
    var shown=0;
    (MAN.browse||[]).forEach(function(G){
      var lab=G.label.toLowerCase();
      var items=G.items.filter(function(it){return !q||lab.indexOf(q)>=0||it.name.toLowerCase().indexOf(q)>=0;});
      if(!items.length)return;
      shown++;
      html+='<div class="fp-grp">'+esc(G.label)+' · '+items.length+'</div>';
      items.forEach(function(it){html+=browseRow(it);});
    });

    // CERTIFICATS (section dédiée, filtrée par la recherche)
    var certs=MAN.certs.filter(Boolean).filter(function(c){return !q||(c.label+' '+c.scope).toLowerCase().indexOf(q)>=0;});
    if(certs.length){html+='<div class="fp-grp">Certificats & annexes</div>';certs.forEach(function(c){html+=certRow(c);});}

    if(!shown&&!certs.length)html+='<div class="fp-empty">Rien pour « '+esc(q)+' ».</div>';
    body.innerHTML=html;

    // Remplir la ligne « usines en stock » en asynchrone
    if(autoCodes&&autoCodes.length){
      fetchStockUsines(autoCodes,function(arr){
        var el=document.getElementById('fp-stock'); if(!el)return;
        if(!arr||!arr.length){el.style.display='none';return;}
        var top=arr.slice(0,10).map(function(u){
          var g=(u.gmin!=null)?(' <span style="color:#86868b">'+u.gmin+(u.gmax&&u.gmax!==u.gmin?'–'+u.gmax:'')+' g</span>'):'';
          return '<b>usine '+esc(u.usine)+'</b>'+g;
        }).join(' · ');
        el.innerHTML='En stock ('+arr.length+' usine'+(arr.length>1?'s':'')+') : '+top;
      });
    }
  }

  function ensurePanel(){
    if(document.getElementById('fiche-bg'))return;
    var bg=document.createElement('div'); bg.id='fiche-bg';
    bg.innerHTML='<div id="fiche-panel" role="dialog" aria-label="Fiches techniques">'
      +'<div class="fp-head"><div class="fp-title">Fiches techniques &amp; certificats</div>'
      +'<button class="fp-x" aria-label="Fermer">✕</button></div>'
      +'<div class="fp-body">'
      +'<div class="fp-tools">'
      +'<div class="fp-refbox"><input id="fiche-ref" type="text" inputmode="numeric" placeholder="N° de réf article (ex 993076)" autocomplete="off"><button id="fiche-ref-go">Fiche</button></div>'
      +'<label class="fp-drop" id="fiche-drop">📎 Déposer une liste'
      +'<input type="file" id="fiche-file" accept=".xlsx,.xls,.csv,.txt,.pdf,.docx,image/*" hidden></label>'
      +'</div>'
      +'<input id="fiche-search" type="text" placeholder="Chercher : qualité, dos, fini, n° usine/réf…" autocomplete="off">'
      +'<div id="fiche-body"></div></div></div>';
    document.body.appendChild(bg);
    bg.addEventListener('click',function(e){if(e.target===bg)closePanel();});
    bg.querySelector('.fp-x').addEventListener('click',closePanel);
    bg.querySelector('#fiche-search').addEventListener('input',function(){render(this.value);});
    // Réf → fiche
    var ref=bg.querySelector('#fiche-ref'), refGo=bg.querySelector('#fiche-ref-go');
    refGo.addEventListener('click',function(){lookupRef(ref.value);});
    ref.addEventListener('keydown',function(e){if(e.key==='Enter')lookupRef(ref.value);});
    // Dépôt fichier (clic + drag&drop)
    var drop=bg.querySelector('#fiche-drop'), fileIn=bg.querySelector('#fiche-file');
    fileIn.addEventListener('change',function(){if(this.files[0])handleFile(this.files[0]);this.value='';});
    ['dragenter','dragover'].forEach(function(ev){drop.addEventListener(ev,function(e){e.preventDefault();drop.classList.add('drag');});});
    ['dragleave','drop'].forEach(function(ev){drop.addEventListener(ev,function(e){e.preventDefault();drop.classList.remove('drag');});});
    drop.addEventListener('drop',function(e){var f=e.dataTransfer&&e.dataTransfer.files&&e.dataTransfer.files[0];if(f)handleFile(f);});
  }
  function closePanel(){var bg=document.getElementById('fiche-bg');if(bg)bg.classList.remove('show');}
  function openPanel(){
    ensurePanel();
    var open=function(){document.getElementById('fiche-search').value='';render('');document.getElementById('fiche-bg').classList.add('show');track('fiches_panel');};
    if(MAN)return open();
    fetch('/fiches/manifest.json?v=3').then(function(r){return r.json();}).then(function(j){MAN=j;open();})
      .catch(function(){MAN={families:[],certs:[],files:[]};open();});
  }

  /* ---------- bouton header ---------- */
  function injectBtn(){
    var hr=document.querySelector('.hright');
    if(!hr||document.getElementById('fiche-wrap'))return true;
    var w=document.createElement('div'); w.className='offre-wrap'; w.id='fiche-wrap';
    w.innerHTML='<button class="btn-head" id="fiche-btn" title="Fiches techniques & certificats (interne)">'
      +'<span class="offre-txt" style="font-size:19px;font-weight:800;">Fiches</span></button>';
    var cart=hr.querySelector('.cart-wrap');
    hr.insertBefore(w,cart||null);
    document.getElementById('fiche-btn').addEventListener('click',openPanel);
    return true;
  }
  function boot(){
    if(injectBtn())return;
    var n=0,iv=setInterval(function(){if(injectBtn()||++n>20)clearInterval(iv);},250);
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot);
  else boot();
})();
