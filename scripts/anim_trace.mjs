/* Observe l'animation d'ouverture de liste client (intro camion/container, ?s=).
   Usage : node scripts/anim_trace.mjs [code] [throttle] [width] [height]
   Défaut : perftst02  4  1366  768  (≈ écran + CPU de PC de bureau faible)
   Mesure FPS/jank pendant l'anim, le temps avant grille visible, et capture des
   screenshots (/tmp/anim_*.png) pour juger fluidité, complétude et visibilité. */
import { spawn } from 'node:child_process';
import { writeFileSync } from 'node:fs';

const CODE = process.argv[2] || 'perftst02';
const THROTTLE = +(process.argv[3] || 4);
const W = +(process.argv[4] || 1366), H = +(process.argv[5] || 768);
const URL = `http://localhost:8787/catalogue/?s=${CODE}`;
const PORT = 9240;
const CHROME = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';

const chrome = spawn(CHROME, ['--headless=new','--disable-gpu','--remote-debugging-port='+PORT,'--no-first-run','--user-data-dir=/tmp/cdp-anim','about:blank'], { stdio:'ignore' });
await new Promise(r=>setTimeout(r,1300));
const tabs = await (await fetch('http://localhost:'+PORT+'/json')).json();
const ws = new WebSocket(tabs.find(t=>t.type==='page').webSocketDebuggerUrl);
let id=0; const pending=new Map();
ws.onmessage=e=>{const m=JSON.parse(e.data);if(m.id&&pending.has(m.id)){pending.get(m.id)(m);pending.delete(m.id);}};
const send=(method,params)=>new Promise(res=>{const i=++id;pending.set(i,res);ws.send(JSON.stringify({id:i,method,params}));});
const ev=async x=>{const r=await send('Runtime.evaluate',{expression:x,returnByValue:true});return r.result?.result?.value;};
const shot=async name=>{const r=await send('Page.captureScreenshot',{format:'png'});if(r.result?.data){writeFileSync('/tmp/anim_'+name+'.png',Buffer.from(r.result.data,'base64'));return '/tmp/anim_'+name+'.png';}};
await new Promise(r=>{ws.onopen=r;});
await send('Page.enable',{});await send('Runtime.enable',{});
await send('Emulation.setDeviceMetricsOverride',{width:W,height:H,deviceScaleFactor:1,mobile:false});
if(THROTTLE>1)await send('Emulation.setCPUThrottlingRate',{rate:THROTTLE});
// installe le mètre FPS + longtask AVANT le chargement
await send('Page.addScriptToEvaluateOnNewDocument',{source:`
  window.__f={frames:0,fpsSamples:[],last:0,long:0,longN:0,splashGone:null,t0:performance.now()};
  (function raf(now){ const F=window.__f; F.frames++;
    if(!F.last)F.last=now;
    if(now-F.last>=250){F.fpsSamples.push(Math.round(F.frames*1000/(now-F.last)));F.frames=0;F.last=now;}
    if(F.splashGone===null && !document.getElementById('ctn-splash') && performance.now()-F.t0>500){F.splashGone=Math.round(performance.now()-F.t0);}
    requestAnimationFrame(raf);
  })(performance.now());
  try{new PerformanceObserver(l=>{for(const e of l.getEntries()){window.__f.long+=Math.max(0,e.duration-50);window.__f.longN++;}}).observe({type:'longtask',buffered:true});}catch(e){}
`});
const t0=Date.now();
await send('Page.navigate',{url:URL});
// screenshots aux étapes clés de l'anim
const frames=[];
async function at(ms,name){const wait=ms-(Date.now()-t0);if(wait>0)await new Promise(r=>setTimeout(r,wait));frames.push([name,await shot(name)]);}
await at(1500,'1_debut');   // camion qui entre
await at(3500,'2_milieu');  // chariot + cartes
await at(6500,'3_fin');     // fin choreo
await at(9000,'4_grille');  // grille révélée
const f=await ev('JSON.stringify(window.__f)');
const F=JSON.parse(f||'{}');
const fps=F.fpsSamples||[];
const avg=fps.length?Math.round(fps.reduce((a,b)=>a+b,0)/fps.length):0;
const mn=fps.length?Math.min(...fps):0;
// combien de cartes dans la grille finale + splash parti ?
const grid=await ev(`document.querySelectorAll('#pgrid .pcard').length`);
const splash=await ev(`!!document.getElementById('ctn-splash')`);
console.log('\n=== ANIM liste client', URL, `(${W}x${H}, CPU ${THROTTLE}x) ===`);
console.log('FPS pendant anim : moy', avg, '| min', mn, '| échantillons', fps.length);
console.log('long tasks :', F.longN, '| temps bloqué (TBT) :', Math.round(F.long)+'ms');
console.log('splash retiré à :', F.splashGone!=null?F.splashGone+'ms':'(encore présent à 9s: '+splash+')');
console.log('grille finale :', grid, 'cartes');
console.log('screenshots :', frames.map(x=>x[1]).join(' '));
chrome.kill(); process.exit(0);
