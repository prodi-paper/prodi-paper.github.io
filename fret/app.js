/* ═══ Prodi Cotations Fret — prototype (aucun envoi réel) ═══ */

let demandes = DEMANDES.map(d => ({ ...d }));
let reponses = REPONSES.map(r => ({ ...r }));
let selPays = null;        // code pays du formulaire
let selPaysH = null;       // code pays de l'historique
let nextRef = 2605;
let detailRef = null;

const $ = id => document.getElementById(id);
const paysByCode = c => PAYS.find(p => p.code === c);
const carrById = id => TRANSPORTEURS.find(t => t.id === id);
const fmtEUR = v => v == null ? '—' : v.toLocaleString('fr-FR') + ' €';

function demandePays(ref) {
  const d = demandes.find(x => x.ref === ref);
  if (d) return d.pays;
  if (DEMANDES_ARCHIVE[ref]) return DEMANDES_ARCHIVE[ref].pays;
  return null;
}

function relTime(iso) {
  const ms = Date.now() - new Date(iso).getTime();
  const min = Math.round(ms / 60000);
  if (min < 1) return "à l'instant";
  if (min < 60) return `il y a ${min} min`;
  const h = Math.round(min / 60);
  if (h < 24) return `il y a ${h} h`;
  const j = Math.round(h / 24);
  if (j < 31) return `il y a ${j} j`;
  return new Date(iso).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' });
}
const dateFmt = iso => new Date(iso).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: undefined });

/* ── navigation ── */
function go(view) {
  document.querySelectorAll('.view').forEach(v => v.classList.remove('on'));
  $('view-' + view).classList.add('on');
  document.querySelectorAll('.tab').forEach(t =>
    t.classList.toggle('on', t.dataset.view === (view === 'detail' ? 'demandes' : view)));
  if (view === 'demandes') renderDemandes();
  window.scrollTo({ top: 0 });
}

/* ── picker pays ── */
function ciblesFor(code) {
  const p = paysByCode(code);
  if (!p) return [];
  return TRANSPORTEURS.filter(t => t.zones.includes(p.zone) || t.zones.includes('monde'));
}

function buildPaysList(input, listEl, onPick) {
  const q = input.value.trim().toLowerCase();
  const hits = PAYS.filter(p => p.nom.toLowerCase().includes(q));
  listEl.innerHTML = hits.map(p =>
    `<button class="pp-item" onmousedown="${onPick}('${p.code}')">
       <span class="f">${p.flag}</span> ${p.nom}
       <span class="z">${ZONES[p.zone]} · ${p.port}</span>
     </button>`).join('') || '<div class="pp-item mut">Aucun pays</div>';
  listEl.classList.add('open');
}
function filterPays()  { buildPaysList($('f-pays'), $('pp-list'), 'pickPays'); }
function filterPaysH() { buildPaysList($('h-pays'), $('hp-list'), 'pickPaysH'); }
document.addEventListener('click', e => {
  if (!e.target.closest('.pays-pick')) document.querySelectorAll('.pp-list').forEach(l => l.classList.remove('open'));
});

function pickPays(code) {
  selPays = code;
  const p = paysByCode(code);
  $('f-pays').value = p.nom;
  $('pp-flag').textContent = p.flag;
  $('pp-list').classList.remove('open');
  const cibles = ciblesFor(code);
  $('f-cibles').innerHTML = cibles.map(t =>
    `<span class="chip"><span class="dot" style="background:${t.couleur}"></span>${t.nom}</span>`).join('');
  $('f-nb').textContent = `— ${cibles.length} mails individuels`;
  $('f-send').disabled = false;
  $('f-send-n').textContent = `(${cibles.length})`;
  regenMail(true);
}

/* ── génération du mail (variantes aléatoires — en prod : API Claude) ── */
const pick = arr => arr[Math.floor(Math.random() * arr.length)];
function genMail() {
  if (!selPays) return null;
  const p = paysByCode(selPays);
  const tonnage = $('f-tonnage').value || '—';
  const inco = $('f-incoterm').value;
  const detail = $('f-detail').value || 'papier en bobines';
  const ref = 'FR-' + nextRef;

  const objet = pick([
    `Demande de cotation — ${p.nom} — Réf ${ref}`,
    `Cotation transport ${p.nom} — Réf ${ref}`,
    `Prix fret vers ${p.port} — Réf ${ref}`,
  ]);
  const salut = pick(['Bonjour {prenom},', 'Bonjour,', 'Bonjour {prenom},']);
  const intro = pick([
    `Pourriez-vous nous coter un transport vers ${p.port} (${p.nom}) ?`,
    `Nous avons une expédition à prévoir sur ${p.nom} et j'aimerais votre meilleur prix.`,
    `Merci de nous faire une offre pour un envoi à destination de ${p.port}.`,
  ]);
  const corps = pick([
    `Il s'agit de ${detail.toLowerCase()}, environ ${tonnage} tonnes, en ${inco}.`,
    `Marchandise : ${detail.toLowerCase()} — ${tonnage} t environ. Incoterm souhaité : ${inco}.`,
    `${detail} pour un total d'environ ${tonnage} tonnes ; cotation ${inco} si possible.`,
  ]);
  const fin = pick([
    `Merci de préciser le transit time et la validité de l'offre.`,
    `Pouvez-vous m'indiquer également le délai de transit ?`,
    `Dans l'idéal avec le prochain départ possible et le transit time.`,
  ]);
  const bye = pick(['Bien cordialement,', 'Cordialement,', 'Merci d\'avance,']);
  return { ref, objet, texte: `${salut}\n\n${intro}\n${corps}\n${fin}\n\n${bye}\nEthan Elbilia\nProdiconseil` };
}

function regenMail(force) {
  const m = genMail();
  if (!m) return;
  const cibles = ciblesFor(selPays);
  const ex = cibles[0];
  $('mail-meta').innerHTML =
    `<div><b>De</b> ethan@prodi.com</div>
     <div><b>À</b> ${ex ? ex.email : ''} <span class="mut">(× ${cibles.length}, un mail chacun)</span></div>
     <div><b>Cc</b> ${CC_INTERNE.join(', ')}</div>
     <div><b>Objet</b> ${m.objet}</div>`;
  $('mail-body').textContent = m.texte.replace('{prenom}', ex ? ex.contact : '');
  $('f-cc').innerHTML = CC_INTERNE.map(c => `<span class="chip cc">${c}</span>`).join('');
}

/* ── envoi (simulation) ── */
function envoyer() {
  if (!selPays) return;
  const p = paysByCode(selPays);
  const cibles = ciblesFor(selPays);
  const ref = 'FR-' + nextRef++;
  const d = {
    ref, pays: selPays, tonnage: +$('f-tonnage').value || 22,
    detail: $('f-detail').value, incoterm: $('f-incoterm').value,
    date: new Date().toISOString(), cibles: cibles.map(t => t.id),
  };
  demandes.push(d);
  toast(p.flag, `Demande ${ref} envoyée à <b>${cibles.length}</b> transporteurs`);
  simulerReponses(d);
  openDetail(ref);
}

/* réponses fictives qui « arrivent » en direct */
const BIAIS = { translog: -.035, atlas: .02, seafret: -.005, capouest: -.025, bernardi: -.015, eurocargo: .015, mtl: .075, globalwave: .045 };
function simulerReponses(d) {
  const p = paysByCode(d.pays);
  const base = PRIX_BASE[d.pays] || 1000;
  const muet = pick(d.cibles);                       // un qui ne répond pas
  let delai = 3500;
  d.cibles.forEach(id => {
    if (id === muet) return;
    delai += 2500 + Math.random() * 5000;
    const t = carrById(id);
    const prix = Math.round((base * (1 + (BIAIS[id] || 0) + (Math.random() - .5) * .06)) / 5) * 5;
    const transit = (p.zone === 'europe' ? 3 : p.zone === 'maghreb' ? 4 : 9) + Math.floor(Math.random() * 3);
    setTimeout(() => {
      reponses.push({
        demande: d.ref, transporteur: id, prix, unite: '20', incoterm: d.incoterm,
        transit: `${transit} j`, recu: new Date().toISOString(),
        texte: `Bonjour Ethan,\n\nPour ${p.port} nous sommes à ${prix.toLocaleString('fr-FR')} € le container 20' ${d.incoterm}, transit ${transit} jours.\nValidité 15 jours.\n\nCordialement,\n${t.contact}`,
      });
      toast(p.flag, `${t.nom} a répondu : <b>${fmtEUR(prix)}</b>`);
      if (detailRef === d.ref) renderDetail(d.ref);
      if ($('view-demandes').classList.contains('on')) renderDemandes();
    }, delai);
  });
}

/* ── liste des demandes ── */
function renderDemandes() {
  const list = [...demandes].sort((a, b) => b.date.localeCompare(a.date));
  $('dem-list').innerHTML = list.map(d => {
    const p = paysByCode(d.pays);
    const reps = reponses.filter(r => r.demande === d.ref);
    const prix = reps.filter(r => r.prix != null).map(r => r.prix);
    const best = prix.length ? Math.min(...prix) : null;
    const complete = reps.length >= d.cibles.length - 1 && reps.length > 0;
    return `<button class="dem-item" onclick="openDetail('${d.ref}')">
      <span class="flag">${p.flag}</span>
      <span>
        <span class="t1">${p.nom} <span class="ref">· ${d.ref}</span></span><br>
        <span class="t2">${d.detail} · ${d.tonnage} t · ${d.incoterm} · ${relTime(d.date)}</span>
      </span>
      <span class="dem-right">
        ${best ? `<span class="best-mini">${fmtEUR(best)}</span>` : ''}
        <span class="badge ${complete ? 'ok' : 'wait'}">${reps.length}/${d.cibles.length} réponses</span>
      </span>
    </button>`;
  }).join('') || '<div class="card empty">Aucune demande pour le moment.</div>';
}

/* ── détail / comparatif ── */
function openDetail(ref) { detailRef = ref; renderDetail(ref); go('detail'); }

function renderDetail(ref) {
  const d = demandes.find(x => x.ref === ref);
  if (!d) return;
  const p = paysByCode(d.pays);
  const reps = reponses.filter(r => r.demande === ref);
  const avecPrix = reps.filter(r => r.prix != null).sort((a, b) => a.prix - b.prix);
  const best = avecPrix[0];
  const repondu = new Set(reps.map(r => r.transporteur));
  const enAttente = d.cibles.filter(id => !repondu.has(id));

  const rows = avecPrix.map((r, i) => {
    const t = carrById(r.transporteur);
    return `<tr class="${i === 0 ? 'best' : ''} clickable" onclick="toggleRaw('${ref}-${r.transporteur}')">
      <td><span class="t-carrier"><span class="dot" style="background:${t.couleur}"></span>${t.nom}
        ${i === 0 ? '<span class="tag-best">Meilleur prix</span>' : ''}</span></td>
      <td class="t-price">${fmtEUR(r.prix)}<div class="t-sub">/ container 20'</div></td>
      <td>${r.incoterm}</td>
      <td>${r.transit}</td>
      <td class="t-sub">${relTime(r.recu)}</td>
    </tr>
    <tr><td colspan="5" style="padding:0 12px"><div class="mail-raw" id="raw-${ref}-${r.transporteur}">${r.texte}</div></td></tr>`;
  }).join('');

  const flaggedRows = reps.filter(r => r.prix == null).map(r => {
    const t = carrById(r.transporteur);
    return `<tr class="clickable" onclick="toggleRaw('${ref}-${r.transporteur}')">
      <td><span class="t-carrier"><span class="dot" style="background:${t.couleur}"></span>${t.nom}</span></td>
      <td colspan="3"><span class="tag-flag">⚠ Réponse à vérifier — prix non extrait</span></td>
      <td class="t-sub">${relTime(r.recu)}</td>
    </tr>
    <tr><td colspan="5" style="padding:0 12px"><div class="mail-raw" id="raw-${ref}-${r.transporteur}">${r.texte}</div></td></tr>`;
  }).join('');

  const pendingRows = enAttente.map(id => {
    const t = carrById(id);
    return `<tr class="pending">
      <td><span class="t-carrier"><span class="dot" style="background:${t.couleur};opacity:.35"></span>${t.nom}</span></td>
      <td colspan="4"><span class="pulse"></span>En attente de réponse…</td>
    </tr>`;
  }).join('');

  const ecart = avecPrix.length > 1 ? avecPrix[avecPrix.length - 1].prix - best.prix : null;

  $('detail-body').innerHTML = `
    <div class="page-head">
      <div>
        <h1>${p.flag} ${p.nom} <span class="ref mono" style="font-size:15px;color:var(--mut2)">${d.ref}</span></h1>
        <p>${d.detail} · ${d.tonnage} t · ${d.incoterm} · port : ${p.port} · envoyée ${relTime(d.date)}</p>
      </div>
    </div>
    <div class="stat-row">
      <div class="stat"><div class="v">${best ? fmtEUR(best.prix) : '—'}</div>
        <div class="l">Meilleur prix ${best ? '· ' + carrById(best.transporteur).nom : ''}</div></div>
      <div class="stat"><div class="v">${ecart != null ? '+' + fmtEUR(ecart) : '—'}</div>
        <div class="l">Écart le plus cher / moins cher</div></div>
      <div class="stat"><div class="v">${reps.length}<small> / ${d.cibles.length}</small></div>
        <div class="l">Réponses reçues</div></div>
    </div>
    <div class="card">
      <div class="table-scroll">
      <table>
        <thead><tr><th>Transporteur</th><th>Prix</th><th>Incoterm</th><th>Transit</th><th>Reçu</th></tr></thead>
        <tbody>${rows}${flaggedRows}${pendingRows}</tbody>
      </table>
      </div>
      <p class="t-sub" style="margin:12px 4px 0">Clique sur une ligne pour voir le mail d'origine.</p>
    </div>`;
}

function toggleRaw(key) { $('raw-' + key)?.classList.toggle('open'); }

/* ── historique pays ── */
function pickPaysH(code) {
  selPaysH = code;
  const p = paysByCode(code);
  $('h-pays').value = p.nom;
  $('hp-flag').textContent = p.flag;
  $('hp-list').classList.remove('open');
  renderHisto(code);
}

function quotesForPays(code) {
  return reponses
    .filter(r => r.prix != null && (r.pays || demandePays(r.demande)) === code)
    .sort((a, b) => a.recu.localeCompare(b.recu));
}

function renderHisto(code) {
  const p = paysByCode(code);
  const qs = quotesForPays(code);
  if (!qs.length) {
    $('histo-body').innerHTML = `<div class="card empty">Aucune cotation encore pour ${p.flag} ${p.nom}. Envoie une première demande !</div>`;
    return;
  }
  const derniere = qs[qs.length - 1];
  const bestNow = Math.min(...qs.slice(-6).map(q => q.prix));
  /* tendance : moyenne 45 derniers jours vs 45 précédents */
  const now = Date.now(), J45 = 45 * 864e5;
  const rec = qs.filter(q => now - new Date(q.recu) < J45).map(q => q.prix);
  const old = qs.filter(q => { const a = now - new Date(q.recu); return a >= J45 && a < 2 * J45; }).map(q => q.prix);
  const avg = a => a.length ? a.reduce((x, y) => x + y) / a.length : null;
  let tendance = '—', tCol = 'var(--mut)';
  if (avg(rec) && avg(old)) {
    const pct = (avg(rec) - avg(old)) / avg(old) * 100;
    tendance = (pct > 0 ? '+' : '') + pct.toFixed(1) + ' %';
    tCol = pct > 1 ? 'var(--accent)' : pct < -1 ? 'var(--ok)' : 'var(--mut)';
  }
  /* champion : le + souvent moins cher par demande */
  const parDem = {};
  qs.forEach(q => { (parDem[q.demande] ??= []).push(q); });
  const wins = {};
  Object.values(parDem).forEach(list => {
    const w = list.reduce((a, b) => a.prix <= b.prix ? a : b).transporteur;
    wins[w] = (wins[w] || 0) + 1;
  });
  const champ = Object.entries(wins).sort((a, b) => b[1] - a[1])[0];

  const carriers = [...new Set(qs.map(q => q.transporteur))].map(carrById);

  $('histo-body').innerHTML = `
    <div class="stat-row">
      <div class="stat"><div class="v">${fmtEUR(bestNow)}</div><div class="l">Meilleur prix récent / 20'</div></div>
      <div class="stat"><div class="v" style="color:${tCol}">${tendance}</div><div class="l">Tendance 45 jours</div></div>
      <div class="stat"><div class="v">${champ ? carrById(champ[0]).nom : '—'}</div>
        <div class="l">Le + souvent moins cher (${champ ? champ[1] + '×' : ''})</div></div>
      <div class="stat"><div class="v">${relTime(derniere.recu).replace('il y a ', '')}</div><div class="l">Dernière cotation</div></div>
    </div>
    <div class="card chart-card">
      <div class="chart-head">
        <h3 style="font-size:15px">Évolution du prix — container 20' ${p.flag} ${p.nom}</h3>
        <div class="legend">${carriers.map(t =>
          `<span><span class="dot" style="background:${t.couleur}"></span>${t.nom}</span>`).join('')}</div>
      </div>
      ${chartSVG(qs)}
    </div>
    <div class="card">
      <div class="table-scroll">
      <table>
        <thead><tr><th>Date</th><th>Transporteur</th><th>Prix</th><th>Incoterm</th><th>Transit</th><th>Réf</th></tr></thead>
        <tbody>${[...qs].reverse().map(q => {
          const t = carrById(q.transporteur);
          return `<tr>
            <td>${dateFmt(q.recu)}</td>
            <td><span class="t-carrier"><span class="dot" style="background:${t.couleur}"></span>${t.nom}</span></td>
            <td class="t-price">${fmtEUR(q.prix)}</td>
            <td>${q.incoterm}</td><td>${q.transit || '—'}</td>
            <td class="t-sub mono">${q.demande}</td>
          </tr>`;
        }).join('')}</tbody>
      </table>
      </div>
    </div>`;
}

/* petit graphe SVG maison — points + lignes par transporteur */
function chartSVG(qs) {
  const W = 720, H = 250, PL = 52, PR = 14, PT = 14, PB = 30;
  const ts = qs.map(q => new Date(q.recu).getTime());
  const ps = qs.map(q => q.prix);
  let t0 = Math.min(...ts), t1 = Math.max(...ts);
  if (t1 - t0 < 864e5) { t0 -= 864e5 * 15; t1 += 864e5 * 15; }
  const pad = (Math.max(...ps) - Math.min(...ps)) * .18 || 50;
  const p0 = Math.min(...ps) - pad, p1 = Math.max(...ps) + pad;
  const X = t => PL + (t - t0) / (t1 - t0) * (W - PL - PR);
  const Y = p => PT + (1 - (p - p0) / (p1 - p0)) * (H - PT - PB);

  let grid = '';
  for (let i = 0; i <= 3; i++) {
    const v = p0 + (p1 - p0) * i / 3, y = Y(v);
    grid += `<line x1="${PL}" y1="${y}" x2="${W - PR}" y2="${y}" stroke="#e7e8ec"/>
             <text x="${PL - 8}" y="${y + 4}" text-anchor="end" font-size="11" fill="#9aa0a8">${Math.round(v / 10) * 10}</text>`;
  }
  /* repères mois */
  const mois = ['janv.', 'févr.', 'mars', 'avr.', 'mai', 'juin', 'juil.', 'août', 'sept.', 'oct.', 'nov.', 'déc.'];
  const d = new Date(t0); d.setDate(1);
  let ticks = '';
  while (d.getTime() < t1) {
    if (d.getTime() > t0) ticks += `<text x="${X(d.getTime())}" y="${H - 8}" font-size="11" fill="#9aa0a8">${mois[d.getMonth()]}</text>`;
    d.setMonth(d.getMonth() + 1);
  }
  /* lignes + points par transporteur */
  const byCarr = {};
  qs.forEach(q => { (byCarr[q.transporteur] ??= []).push(q); });
  let series = '';
  Object.entries(byCarr).forEach(([id, list]) => {
    const t = carrById(id);
    if (list.length > 1) {
      const pts = list.map(q => `${X(new Date(q.recu).getTime()).toFixed(1)},${Y(q.prix).toFixed(1)}`).join(' ');
      series += `<polyline points="${pts}" fill="none" stroke="${t.couleur}" stroke-width="2" stroke-opacity=".45" stroke-linejoin="round"/>`;
    }
    list.forEach(q => {
      series += `<circle cx="${X(new Date(q.recu).getTime()).toFixed(1)}" cy="${Y(q.prix).toFixed(1)}" r="4.6"
        fill="${t.couleur}" stroke="#fff" stroke-width="1.6"><title>${t.nom} — ${fmtEUR(q.prix)} (${dateFmt(q.recu)})</title></circle>`;
    });
  });
  return `<svg id="chart" viewBox="0 0 ${W} ${H}">${grid}${ticks}${series}</svg>`;
}

/* ── toasts ── */
function toast(flag, html) {
  const el = document.createElement('div');
  el.className = 'toast';
  el.innerHTML = `<span class="f">${flag}</span><span>${html}</span>`;
  $('toasts').appendChild(el);
  setTimeout(() => { el.classList.add('out'); setTimeout(() => el.remove(), 350); }, 4200);
}

/* ── init ── */
$('f-cc').innerHTML = CC_INTERNE.map(c => `<span class="chip cc">${c}</span>`).join('');
renderDemandes();
