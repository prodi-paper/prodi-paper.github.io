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
  const hits = PAYS.filter(p => p.nom.toLowerCase().includes(q) || p.port.toLowerCase().includes(q));
  listEl.innerHTML = hits.map(p =>
    `<button class="pp-item" onmousedown="${onPick}('${p.code}')">
       <span class="f">${p.flag}</span> ${p.nom}
       <span class="z">${ZONES[p.zone]} · ${p.port}</span>
     </button>`).join('') || '<div class="pp-item mut">Aucun pays</div>';
  listEl.classList.add('open');
}
/* Destination LIBRE : pays ou port, le mail reprend le texte tel quel.
   Suggestions = tous les pays + tous les ports (DEST_SUGG) ; un port choisi
   insère le PORT, un pays choisi insère le PAYS. Hors liste : 🌍 + texte brut. */
const destTexte = s => s.id.startsWith('c_') ? s.nom : `${s.nom}, ${s.sub}`;   // port → « Port, Pays »
function filterPays() {
  const q = $('f-pays').value.trim().toLowerCase();
  const hits = DEST_SUGG.filter(s => destTexte(s).toLowerCase().includes(q)).slice(0, 12);
  $('pp-list').innerHTML = hits.map(s =>
    `<button class="pp-item" onmousedown="pickDest('${s.id}')">
       <span class="f">${s.flag}</span> ${s.nom}
       <span class="z">${s.sub}</span>
     </button>`).join('') || '<div class="pp-item mut">Aucune suggestion — le texte partira tel quel</div>';
  $('pp-list').classList.add('open');
  const exact = DEST_SUGG.find(s => s.nom.toLowerCase() === q || destTexte(s).toLowerCase() === q);
  selPays = exact ? exact.code : null;
  $('pp-flag').textContent = exact ? exact.flag : '🌍';
  $('f-send').disabled = !q;
  regenMail();
}
function pickDest(id) {
  const s = DEST_SUGG.find(x => x.id === id);
  $('f-pays').value = destTexte(s);
  selPays = s.code;
  $('pp-flag').textContent = s.flag;
  $('pp-list').classList.remove('open');
  $('f-send').disabled = false;
  regenMail();
}
function filterPaysH() { buildPaysList($('h-pays'), $('hp-list'), 'pickPaysH'); }

/* picker départ : pays OU port (inséré « Port, Pays »), texte libre sinon */
const provTexte = p => p.pays ? `${p.nom}, ${p.pays}` : p.nom;
function filterProv() {
  const q = $('f-prov').value.trim().toLowerCase();
  const hits = PROV_SUGG.filter(p => provTexte(p).toLowerCase().includes(q));
  const exact = PROV_SUGG.find(p => p.nom.toLowerCase() === q || provTexte(p).toLowerCase() === q);
  $('pv-flag').textContent = exact ? exact.flag : '🌍';
  $('pv-list').innerHTML = hits.map(p =>
    `<button class="pp-item" onmousedown="pickProv('${p.code}')"><span class="f">${p.flag}</span> ${provTexte(p)}</button>`
  ).join('') || '<div class="pp-item mut">Aucune suggestion — le texte partira tel quel</div>';
  $('pv-list').classList.add('open');
  regenMail();
}
function pickProv(code) {
  const p = PROV_SUGG.find(x => x.code === code);
  $('f-prov').value = provTexte(p);
  $('pv-flag').textContent = p.flag;
  $('pv-list').classList.remove('open');
  regenMail();
}
document.addEventListener('click', e => {
  if (!e.target.closest('.pays-pick')) document.querySelectorAll('.pp-list').forEach(l => l.classList.remove('open'));
});


/* ── destinataires : Zouhir fixe + extras À + copies, tous cochables ── */
let ccActifs = new Set(CC_INTERNE);
const TO_EXTRA = [];
let toActifs = new Set();
let ajoutCible = 'cc';   // le popup ajoute en À ou en Cc

function renderDest() {
  $('f-to-chips').innerHTML =
    `<span class="chip to">✓ ${DEST_FRET}</span>` +
    TO_EXTRA.map(c =>
      `<button type="button" class="chip cc${toActifs.has(c) ? '' : ' off'}" onclick="toggleTo('${c}')">${toActifs.has(c) ? '✓ ' : ''}${c}</button>`).join('') +
    `<button type="button" class="chip add" onclick="ajouterEmail('to')">+ Ajouter un email</button>`;
  $('f-cc-chips').innerHTML =
    CC_INTERNE.map(c =>
      `<button type="button" class="chip cc${ccActifs.has(c) ? '' : ' off'}" onclick="toggleCc('${c}')">${ccActifs.has(c) ? '✓ ' : ''}${c}</button>`).join('') +
    `<button type="button" class="chip add" onclick="ajouterEmail('cc')">+ Ajouter un email</button>`;
}
function ajouterEmail(cible) {
  ajoutCible = cible;
  $('cc-err').classList.remove('on');
  $('cc-input').value = '';
  $('cc-fond').classList.add('ouvert');
  $('cc-input').focus();
}
function fermerAjoutCc() { $('cc-fond').classList.remove('ouvert'); }
function validerAjoutCc() {
  const em = $('cc-input').value.trim().toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(em)) { $('cc-err').classList.add('on'); return; }
  if (ajoutCible === 'to') {
    if (!TO_EXTRA.includes(em)) TO_EXTRA.push(em);
    toActifs.add(em);
  } else {
    if (!CC_INTERNE.includes(em)) CC_INTERNE.push(em);
    ccActifs.add(em);
  }
  renderDest();
  if (mailOuvert()) renderMail();
  fermerAjoutCc();
}
function toggleCc(c) {
  ccActifs.has(c) ? ccActifs.delete(c) : ccActifs.add(c);
  renderDest();
  if (mailOuvert()) renderMail();   // ne touche pas au corps modifié : seul le Cc change
}
function toggleTo(c) {
  toActifs.has(c) ? toActifs.delete(c) : toActifs.add(c);
  renderDest();
  if (mailOuvert()) renderMail();
}
const ccList = () => CC_INTERNE.filter(c => ccActifs.has(c));
const toList = () => TO_EXTRA.filter(c => toActifs.has(c));

/* ── nb de containers : boutons − / + , mot « container(s) » dans la case ── */
function majContSuffixe() {
  const n = Math.max(1, +$('f-nb-cont').value || 1);
  $('st-suffix').textContent = n > 1 ? 'containers' : 'container';
}
function stepCont(d) {
  const el = $('f-nb-cont');
  el.value = Math.max(1, (+el.value || 1) + d);
  majContSuffixe();
  regenMail();
}

/* ── marchandise : cases Bobines / Formats, au moins une cochée ── */
function marchandiseVal() {
  const b = $('f-m-bobines').checked, f = $('f-m-formats').checked;
  return b && f ? 'Bobines + Formats' : f ? 'Formats' : 'Bobines';
}
function marchChange(cb) {
  if (!$('f-m-bobines').checked && !$('f-m-formats').checked) cb.checked = true;
  regenMail();
}

/* ── taille : cases 20' / 40', exclusives (défaut 40') ── */
function tailleVal() { return $('f-t-20').checked ? '20' : '40'; }
function tailleChange(cb) {
  const autre = cb.id === 'f-t-20' ? $('f-t-40') : $('f-t-20');
  if (cb.checked) autre.checked = false;
  else cb.checked = true;
  regenMail();
}

/* ── incoterm : cases CFR / FOB, exclusives (toujours exactement une) ── */
function incotermVal() { return $('f-i-fob').checked ? 'FOB' : 'CFR'; }
function incoChange(cb) {
  const autre = cb.id === 'f-i-cfr' ? $('f-i-fob') : $('f-i-cfr');
  if (cb.checked) autre.checked = false;
  else cb.checked = true;
  regenMail();
}

/* ── génération du mail (variantes aléatoires — en prod : API Claude) ── */
const pick = arr => arr[Math.floor(Math.random() * arr.length)];
function genMail() {
  const destTxt = $('f-pays').value.trim();
  if (!destTxt) return null;
  const client = $('f-client').value.trim();
  const prov = $('f-prov').value.trim() || 'France';
  const nb = Math.max(1, +$('f-nb-cont').value || 1);
  const taille = tailleVal();
  const march = marchandiseVal().toLowerCase().replace(' + ', ' et ');
  const inco = incotermVal();
  const ref = 'FR-' + nextRef;
  const cargo = `${nb} container${nb > 1 ? 's' : ''} ${taille}' de ${march}`;

  const objet = pick([
    `Demande de cotation — ${destTxt} — Réf ${ref}`,
    `Cotation transport ${destTxt} — Réf ${ref}`,
    `Prix fret vers ${destTxt} — Réf ${ref}`,
  ]);
  const intro = pick([
    `Merci de nous transmettre le coût d'un transport ${prov} → ${destTxt}.`,
    `Pourriez-vous nous transmettre le coût d'un transport ${prov} → ${destTxt} ?`,
    `Nous souhaiterions connaître le coût d'un transport ${prov} → ${destTxt}.`,
  ]);
  const corps = pick([
    `Il s'agit de ${cargo}, en ${inco}.`,
    `Marchandise : ${cargo}. Incoterm souhaité : ${inco}.`,
    `${cargo.charAt(0).toUpperCase() + cargo.slice(1)} ; cotation ${inco} si possible.`,
  ]);
  const cli = client ? `Client : ${client}.\n` : '';
  const fin = pick([
    `Merci de préciser le transit time et la validité de l'offre.`,
    `Pouvez-vous nous indiquer également le délai de transit ?`,
    `Dans l'idéal avec le prochain départ possible et le transit time.`,
  ]);
  const bye = pick(['Bien cordialement,', 'Cordialement,', 'Merci d\'avance,']);
  // Mail pensé pour être transféré tel quel par Zouhir aux transporteurs :
  // pas de « Zouhir » dans le salut, pas de signature nominative.
  return { ref, objet, texte: `Bonjour,\n\n${intro}\n${cli}${corps}\n${fin}\n\n${bye}` };
}

/* ── popup mail : aperçu + édition (façon /invitation/) ── */
let mailCustom = null;   // corps modifié à la main, gardé jusqu'à envoi / reformulation
const mailOuvert = () => $('mail-fond').classList.contains('ouvert');

function regenMail() {
  mailCustom = null;
  if (mailOuvert()) renderMail();
}
function renderMail() {
  const m = genMail();
  if (!m) return;
  $('mail-meta').innerHTML =
    `<div><b>De</b> ethan@prodi.com</div>
     <div><b>À</b> ${[DEST_FRET, ...toList()].join(', ')}</div>
     <div><b>Cc</b> ${ccList().join(', ') || '—'}</div>
     <div><b>Objet</b> ${m.objet}</div>`;
  $('mail-body').textContent = mailCustom ?? m.texte;
  $('mail-zone').value = mailCustom ?? m.texte;
}
function ouvrirMail(edition) {
  if (!$('f-pays').value.trim()) return;
  renderMail();
  $('mail-fond').classList.add('ouvert');
  setModeEdit(!!edition);
}
function fermerMail() { $('mail-fond').classList.remove('ouvert'); }
function setModeEdit(on) {
  $('mail-body').style.display = on ? 'none' : '';
  $('mail-zone').style.display = on ? 'block' : 'none';
  $('mp-act-aper').style.display = on ? 'none' : '';
  $('mp-act-edit').style.display = on ? '' : 'none';
  if (on) {
    const z = $('mail-zone');
    z.focus();
    z.setSelectionRange(0, 0);
    z.scrollTop = 0;      // le focus peut scroller la zone : on repart du début
  }
}
function modifMail() { setModeEdit(true); }
function reformuler() { mailCustom = null; $('mail-zone').value = genMail().texte; }
function sauverMail() { mailCustom = $('mail-zone').value; renderMail(); setModeEdit(false); }

/* ── envoi RÉEL via prodi-arrivages (canal ethan@ de /api/notify) ──
   Depuis localhost, le serveur redirige tout sur ethan@ sans cc (mode test). */
const API_FRET = 'https://prodi-arrivages.vercel.app/api/fret-envoi';
let envoiEnCours = false;
async function confirmerEnvoi() {
  if (envoiEnCours) return;
  const m = genMail();
  if (!m) return;
  const p = paysByCode(selPays) || { flag: '🌍' };
  const corps = mailCustom ?? m.texte;
  const btn = document.querySelector('#mp-act-aper .btn-envoi');
  envoiEnCours = true;
  btn.disabled = true;
  btn.textContent = 'Envoi…';
  try {
    const r = await fetch(API_FRET, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ objet: m.objet, corps, cc: ccList(), to_extra: toList() }),
    });
    const j = await r.json().catch(() => ({}));
    if (!r.ok || !j.ok) throw new Error(j.error || 'HTTP ' + r.status);
    const ref = 'FR-' + nextRef++;
    demandes.push({
      ref, pays: selPays,
      destination: $('f-pays').value.trim(),
      client: $('f-client').value.trim(),
      provenance: $('f-prov').value.trim() || 'France',
      nbCont: Math.max(1, +$('f-nb-cont').value || 1),
      taille: tailleVal(),
      marchandise: marchandiseVal(),
      incoterm: incotermVal(),
      date: new Date().toISOString(), cibles: ciblesFor(selPays).map(t => t.id),
    });
    mailCustom = null;
    fermerMail();
    toast(p.flag, j.test
      ? `Demande ${ref} envoyée en <b>TEST</b> sur ethan@ (appel local)`
      : `Demande ${ref} envoyée à <b>Zouhir</b>`);
    openDetail(ref);
  } catch (e) {
    toast('⚠️', `Envoi raté : ${e.message || e}`);
  } finally {
    envoiEnCours = false;
    btn.disabled = false;
    btn.textContent = 'Envoyer';
  }
}

/* réponses fictives qui « arrivent » en direct */
const BIAIS = { translog: -.035, atlas: .02, seafret: -.005, capouest: -.025, bernardi: -.015, eurocargo: .015, mtl: .075, globalwave: .045 };
function simulerReponses(d) {
  const p = paysByCode(d.pays);
  const mult = d.taille === '40' ? 1.45 : 1;
  const base = (PRIX_BASE[d.pays] || 1000) * mult;
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
        demande: d.ref, transporteur: id, prix, unite: d.taille, incoterm: d.incoterm,
        transit: `${transit} j`, recu: new Date().toISOString(),
        texte: `Bonjour,\n\nPour ${p.port} nous sommes à ${prix.toLocaleString('fr-FR')} € le container ${d.taille}' ${d.incoterm}, transit ${transit} jours.\nValidité 15 jours.\n\nCordialement,\n${t.contact}`,
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
    const p = paysByCode(d.pays) || { flag: '🌍', nom: d.destination || '—' };
    const reps = reponses.filter(r => r.demande === d.ref);
    const prix = reps.filter(r => r.prix != null).map(r => r.prix);
    const best = prix.length ? Math.min(...prix) : null;
    const complete = reps.length >= d.cibles.length - 1 && reps.length > 0;
    return `<button class="dem-item" onclick="openDetail('${d.ref}')">
      <span class="flag">${p.flag}</span>
      <span>
        <span class="t1">${p.nom} <span class="ref">· ${d.ref}</span></span><br>
        <span class="t2">${d.client ? d.client + ' · ' : ''}${d.marchandise} · ${d.nbCont} × ${d.taille}' · ${d.incoterm} · ${relTime(d.date)}</span>
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
  const p = paysByCode(d.pays) || { flag: '🌍', nom: d.destination || '—', zone: '' };
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
      <td class="t-price">${fmtEUR(r.prix)}<div class="t-sub">/ container ${r.unite || '20'}'</div></td>
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
        <p>${d.client ? 'Client : ' + d.client + ' · ' : ''}${d.marchandise} · ${d.nbCont} × ${d.taille}' · ${d.incoterm} · ${d.provenance || 'France'} → ${d.destination || p.nom} · envoyée ${relTime(d.date)}</p>
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
      <div class="stat"><div class="v">${fmtEUR(bestNow)}</div><div class="l">Meilleur prix récent / container</div></div>
      <div class="stat"><div class="v" style="color:${tCol}">${tendance}</div><div class="l">Tendance 45 jours</div></div>
      <div class="stat"><div class="v">${champ ? carrById(champ[0]).nom : '—'}</div>
        <div class="l">Le + souvent moins cher (${champ ? champ[1] + '×' : ''})</div></div>
      <div class="stat"><div class="v">${relTime(derniere.recu).replace('il y a ', '')}</div><div class="l">Dernière cotation</div></div>
    </div>
    <div class="card chart-card">
      <div class="chart-head">
        <h3 style="font-size:15px">Évolution du prix / container — ${p.flag} ${p.nom}</h3>
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
renderDest();
renderDemandes();
$('cc-input').addEventListener('keydown', e => { if (e.key === 'Enter') validerAjoutCc(); });
$('cc-fond').addEventListener('click', e => { if (e.target.id === 'cc-fond') fermerAjoutCc(); });
