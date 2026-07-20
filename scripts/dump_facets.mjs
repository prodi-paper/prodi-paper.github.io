/* Dumpe les compteurs de facettes rendus par le catalogue, pour prouver qu'une
   refonte du comptage ne change AUCUN chiffre.
   Usage : node scripts/dump_facets.mjs [url] > /tmp/facets_X.json
   Charge ?perf=1, force le chargement du stock + un recalcul complet des
   facettes (via window.__perf.benchFacets), puis lit tous les .msd-option et
   leur .msd-count-inline, groupés par menu. Diff « avant/après » = régression. */
import { spawn } from 'node:child_process';

const url = (process.argv[2] || 'http://localhost:8787/catalogue/').replace(/#.*/, '');
const withPerf = url + (url.includes('?') ? '&' : '?') + 'perf=1';
const PORT = 9228;
const CHROME = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';

const chrome = spawn(CHROME,
  ['--headless=new', '--disable-gpu', '--remote-debugging-port=' + PORT,
   '--no-first-run', '--user-data-dir=/tmp/cdp-facets', 'about:blank'],
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
  if (r.result?.exceptionDetails) throw new Error(JSON.stringify(r.result.exceptionDetails));
  return r.result?.result?.value;
};
await new Promise(r => { ws.onopen = r; });
await send('Page.enable', {});
await send('Runtime.enable', {});
await send('Page.navigate', { url: withPerf });
await new Promise(r => setTimeout(r, 8000));

// Force chargement stock + recalcul complet (benchFacets invalide les sig et
// rappelle _refreshAllFacets → les .msd-count-inline sont à jour).
await evalp('window.__perf ? window.__perf.benchFacets() : null');

// Lit tous les compteurs, groupés par menu (l'ancêtre [id] commençant par msd-/sb-msd-)
const dump = await evalp(`(()=>{
  const out={};
  document.querySelectorAll('.msd-option').forEach(opt=>{
    let n=opt; let menu='?';
    while(n){ if(n.id && /^(sb-)?msd-/.test(n.id)){menu=n.id;break;} n=n.parentElement; }
    const val=opt.dataset.val; if(val==null) return;
    const c=opt.querySelector('.msd-count-inline');
    const cnt=c?parseInt(c.textContent,10)||0:null;
    (out[menu]=out[menu]||{})[val]=cnt;
  });
  return out;
})()`);

console.log(JSON.stringify(dump, null, 2));
chrome.kill(); process.exit(0);
