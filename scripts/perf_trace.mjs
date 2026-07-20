/* Mesure de perf headless du catalogue via CDP (Chrome DevTools Protocol).
   Usage : node scripts/perf_trace.mjs [url] [throttle]
   Défaut : http://localhost:8787/catalogue/  throttle=1 (desktop)
   Le catalogue s'utilise sur ORDI et TÉLÉPHONE (pas iPad — ça c'est l'app
   arrivages). Profils utiles :
     throttle=1  → desktop / ordi
     throttle=2  → téléphone récent (iPhone milieu/haut de gamme)
     throttle=4  → téléphone d'entrée de gamme / Android lent
   Charge la page avec ?perf=1 (active perf-hud.js), lance benchFacets +
   benchScroll et lit les métriques de chargement. Nombres comparables
   avant/après. S'appuie sur le HUD in-page (window.__perf), zéro dépendance. */
import { spawn } from 'node:child_process';

const url = (process.argv[2] || 'http://localhost:8787/catalogue/').replace(/#.*/, '');
const THROTTLE = +(process.argv[3] || 1);
const withPerf = url + (url.includes('?') ? '&' : '?') + 'perf=1';
const PORT = 9227;
const CHROME = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';

const chrome = spawn(CHROME,
  ['--headless=new', '--disable-gpu', '--remote-debugging-port=' + PORT,
   '--no-first-run', '--user-data-dir=/tmp/cdp-perf', 'about:blank'],
  { stdio: 'ignore' });

await new Promise(r => setTimeout(r, 1300));
const tabs = await (await fetch('http://localhost:' + PORT + '/json')).json();
const page = tabs.find(t => t.type === 'page');
const ws = new WebSocket(page.webSocketDebuggerUrl);
let id = 0; const pending = new Map();
ws.onmessage = e => { const m = JSON.parse(e.data); if (m.id && pending.has(m.id)) { pending.get(m.id)(m); pending.delete(m.id); } };
const send = (method, params) => new Promise(res => { const i = ++id; pending.set(i, res); ws.send(JSON.stringify({ id: i, method, params })); });
const evalp = async expr => {
  const r = await send('Runtime.evaluate', { expression: expr, awaitPromise: true, returnByValue: true });
  if (r.result?.exceptionDetails) throw new Error(r.result.exceptionDetails.text);
  return r.result?.result?.value;
};
await new Promise(r => { ws.onopen = r; });

await send('Page.enable', {});
await send('Runtime.enable', {});
if (THROTTLE >= 2) await send('Emulation.setDeviceMetricsOverride', { width: 390, height: 844, deviceScaleFactor: 3, mobile: true }); // téléphone
else await send('Emulation.setDeviceMetricsOverride', { width: 1440, height: 900, deviceScaleFactor: 1, mobile: false }); // desktop
if (THROTTLE > 1) await send('Emulation.setCPUThrottlingRate', { rate: THROTTLE });

await send('Page.navigate', { url: withPerf });
// Laisse charger + le HUD s'installer + le cache stock (chargé en idle)
await new Promise(r => setTimeout(r, 9000));

// Force le chargement du stock puis lance les bancs
const facets = await evalp('window.__perf ? window.__perf.benchFacets() : null');
const scroll = await evalp('window.__perf ? window.__perf.benchScroll() : null');
const report = await evalp('window.__perf ? window.__perf.report() : null');

const profil = THROTTLE <= 1 ? 'desktop/ordi' : THROTTLE === 2 ? 'téléphone récent' : 'téléphone entrée de gamme';
console.log('\n=== PERF', withPerf, '— ' + profil + ' (throttle ' + THROTTLE + '×) ===');
if (facets) console.log('FILTRES  _refreshAllFacets :', 'médiane', facets.median + 'ms', '| min', facets.min + 'ms', '| max', facets.max + 'ms', '| sur', facets.refs, 'réfs');
else console.log('FILTRES  : HUD/__perf indisponible (stock non chargé ?)');
if (scroll) console.log('SCROLL   FPS min :', scroll.minFps, '| DOM', scroll.dom, 'nœuds');
if (report) console.log('CHARGE   LCP', report.lcp + 'ms', '| CLS', report.cls, '| long tasks', report.longCount, '| TBT', report.tbt + 'ms', '| INP', report.inp + 'ms', '| DOM', report.dom);
console.log('');

chrome.kill(); process.exit(0);
