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
/* ── 4 cases : PAYS/PORT départ + PAYS/PORT destination, texte libre partout.
   Choisir un port remplit aussi la case pays si elle est vide. ── */
const LIBRE = '<div class="pp-item mut">Texte libre — partira tel quel</div>';
function majEnvoiActif() {
  $('f-send').disabled = !($('f-pays').value.trim() || $('f-pays-port').value.trim());
}

/* destination : pays */
function filterPays() {
  /* GROUPÉ PAR PAYS (14/09, comme le DÉPART — sans ligne dépôt) :
     pays en tête (cliquable), ses ports dessous ; un port choisi ici
     remplit PAYS + PORT d'un coup. */
  /* valeur issue d'un choix du menu → focus = liste complète (pas un filtre) */
  const raw = $('f-pays').value.trim();
  const q = (window._destPicked && raw === window._destPicked) ? '' : raw.toLowerCase();
  if (q) window._destPicked = null;
  const exact = PAYS.find(p => p.nom.toLowerCase() === q);
  if (q) selPays = exact ? exact.code : null;
  if (q) $('pp-flag').textContent = exact ? exact.flag : '🌍';
  let html = '';
  PAYS.forEach(c => {
    const ports = DEST_PORTS.filter(p => p.code === c.code);
    const cMatch = !q || c.nom.toLowerCase().includes(q);
    const pHits = q ? ports.filter(p => p.nom.toLowerCase().includes(q)) : ports;
    if (!cMatch && !pHits.length) return;
    html += `<button class="pp-item pp-grp" onmousedown="pickDest('${c.code}')"><span class="f">${c.flag}</span> ${c.nom}<span class="z">${ZONES[c.zone]}</span></button>`;
    (cMatch ? ports : pHits).forEach(p => {
      html += `<button class="pp-item pp-port" onmousedown="pickDestBoth('${p.id}')">${p.nom}</button>`;
    });
  });
  $('pp-list').innerHTML = html || LIBRE;
  $('pp-list').classList.add('open');
  majEnvoiActif();
  regenMail();
}
/* clic port depuis le menu PAYS : remplit les deux champs */
function pickDestBoth(id) {
  const s = DEST_PORTS.find(x => x.id === id);
  const c = paysByCode(s.code);
  /* case unique : « Port, Pays » ; le champ port caché reste vide (le mail
     construit destTxt à partir de la case visible) */
  $('f-pays').value = s.nom + ', ' + c.nom;
  $('f-pays-port').value = '';
  window._destPicked = $('f-pays').value;
  selPays = c.code;
  $('pp-flag').textContent = c.flag;
  $('pp-list').classList.remove('open');
  majEnvoiActif();
  regenMail();
}
function pickDest(code) {
  const p = paysByCode(code);
  $('f-pays').value = p.nom;
  $('f-pays-port').value = '';
  window._destPicked = p.nom;
  selPays = code;
  $('pp-flag').textContent = p.flag;
  $('pp-list').classList.remove('open');
  majEnvoiActif();
  regenMail();
}
/* destination : port */
function filterPaysPort() {
  const q = $('f-pays-port').value.trim().toLowerCase();
  // pays déjà choisi → ne proposer QUE ses ports ; sinon tous
  const base = selPays ? DEST_PORTS.filter(p => p.code === selPays) : DEST_PORTS;
  const hits = base.filter(p => p.nom.toLowerCase().includes(q)).slice(0, 12);
  $('ppp-list').innerHTML = hits.map(p =>
    `<button class="pp-item" onmousedown="pickDestPort('${p.id}')">
       <span class="f">${p.flag}</span> ${p.nom}
       <span class="z">${p.pays}</span>
     </button>`).join('') || LIBRE;
  $('ppp-list').classList.add('open');
  majEnvoiActif();
  regenMail();
}
function pickDestPort(id) {
  const s = DEST_PORTS.find(x => x.id === id);
  $('f-pays-port').value = s.nom;
  if (!$('f-pays').value.trim()) {
    $('f-pays').value = s.pays;
    selPays = s.code;
    $('pp-flag').textContent = s.flag;
  }
  $('ppp-list').classList.remove('open');
  majEnvoiActif();
  regenMail();
}
function filterPaysH() { buildPaysList($('h-pays'), $('hp-list'), 'pickPaysH'); }

/* départ : bouton Dépôt (adresse fixe) OU case libre pays/ville/port */
const DEPOT_ADRESSE = '80610 SAINT-OUEN (FRANCE)';
const provTexte = p => p.pays ? `${p.nom}, ${p.pays}` : p.nom;
function depotChange() {
  if ($('f-depot').checked) {
    $('f-prov').value = '';
    $('pv-flag').textContent = '🌍';
  }
  regenMail();
}
function provInput() {
  if ($('f-prov').value.trim()) $('f-depot').checked = false;   // taper = quitter le dépôt
  filterProv();
}
function filterProv() {
  /* GROUPÉ PAR PAYS : le pays en tête de groupe (cliquable), ses ports
     dessous — les plus gros ports d'abord (ordre de PORTS_PROV). */
  /* dépôt actif : le champ contient son libellé → liste COMPLÈTE au focus */
  const q = $('f-depot').checked ? '' : $('f-prov').value.trim().toLowerCase();
  const exact = PROV_SUGG.find(p => p.nom.toLowerCase() === q || provTexte(p).toLowerCase() === q);
  $('pv-flag').textContent = $('f-depot').checked ? '🏭' : (exact ? exact.flag : '🌍');
  let html = '';
  /* 1re ligne : le DÉPÔT (14/09 Ethan) — clic = coche le segment Dépôt */
  if (!q || 'dépôt depot saint-ouen amiens'.includes(q))
    html += `<button class="pp-item pp-grp" onmousedown="pickProvDepot()"><span class="f">🏭</span> Dépôt<span class="z">${DEPOT_ADRESSE}</span></button>`;
  PAYS_PROV.forEach(c => {
    const ports = PORTS_PROV.filter(p => p.pays === c.nom);
    const cMatch = !q || c.nom.toLowerCase().includes(q);
    const pHits = q ? ports.filter(p => provTexte(p).toLowerCase().includes(q)) : ports;
    if (!cMatch && !pHits.length) return;
    html += `<button class="pp-item pp-grp" onmousedown="pickProv('${c.code}')"><span class="f">${c.flag}</span> ${c.nom}</button>`;
    (cMatch ? ports : pHits).forEach(p => {
      html += `<button class="pp-item pp-port" onmousedown="pickProv('${p.code}')">${p.nom}</button>`;
    });
  });
  $('pv-list').innerHTML = html || LIBRE;
  $('pv-list').classList.add('open');
  regenMail();
}

function pickProvDepot() {
  $('f-depot').checked = true;
  $('f-prov').value = 'Dépôt — Saint-Ouen (80)';
  $('pv-flag').textContent = '🏭';
  $('pv-list').classList.remove('open');
  regenMail();
}
/* pas de départ par défaut (14/09) : champ vide, Dépôt reste la 1re ligne du menu */
function pickProv(code) {
  const p = PROV_SUGG.find(x => x.code === code);
  $('f-prov').value = provTexte(p);
  $('pv-flag').textContent = p.flag;
  $('f-depot').checked = false;
  $('pv-list').classList.remove('open');
  regenMail();
}
document.addEventListener('click', e => {
  if (!e.target.closest('.cl-pick')) $('cl-list').classList.remove('open');
  if (!e.target.closest('.num-pick')) $('num-list').classList.remove('open');
  if (!e.target.closest('.pays-pick')) document.querySelectorAll('.pp-list').forEach(l => l.classList.remove('open'));
});


/* ── destinataires : Zouhir fixe + extras À + copies, tous cochables ── */
let ccActifs = new Set(CC_INTERNE);
const TO_EXTRA = [];
let toActifs = new Set();
let ajoutCible = 'cc';   // le popup ajoute en À ou en Cc

function renderDest() {
  $('f-to-chips').innerHTML =
    `<span class="chip to">${DEST_FRET}</span>` +
    TO_EXTRA.map(c =>
      `<button type="button" class="chip cc${toActifs.has(c) ? '' : ' off'}" onclick="toggleTo('${c}')">${c}</button>`).join('') +
    `<button type="button" class="chip add" onclick="ajouterEmail('to')">+ Ajouter un email</button>`;
  $('f-cc-chips').innerHTML =
    CC_INTERNE.map(c =>
      `<button type="button" class="chip cc${ccActifs.has(c) ? '' : ' off'}" onclick="toggleCc('${c}')">${c}</button>`).join('') +
    `<button type="button" class="chip add" onclick="ajouterEmail('cc')">+ Ajouter un email</button>`;
}
function ajouterEmail(cible) {
  ajoutCible = cible;
  $('cc-titre').textContent = cible === 'to' ? 'Ajouter un destinataire' : 'Ajouter un email en copie';
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
/* Gabarit UNIQUE (base : modèle maison Prodi), pensé pour être transféré
   tel quel par Zouhir aux transporteurs. Les lignes vides disparaissent. */
function genMail() {
  // « Port, Pays » si les deux cases sont remplies, sinon ce qu'il y a
  const destTxt = [$('f-pays-port').value.trim(), $('f-pays').value.trim()].filter(Boolean).join(', ');
  if (!destTxt) return null;
  const prov = $('f-depot').checked ? DEPOT_ADRESSE : $('f-prov').value.trim();
  const client = $('f-client').value.trim();
  const num = $('f-num').value.trim();
  const nb = Math.max(1, +$('f-nb-cont').value || 1);
  const taille = tailleVal();
  const march = marchandiseVal().toLowerCase().replace(' + ', ' et ');
  const inco = incotermVal();
  // Réf de l'objet = le n° de proforma s'il est saisi, sinon FR-xxxx auto
  const ref = num || 'FR-' + nextRef;

  const objet = `Cotation fret — ${destTxt} — Réf ${ref}`;

  const lignes = [];
  if (prov) lignes.push(`– Lieu de chargement : ${prov}`);
  lignes.push(`– Lieu de livraison : ${destTxt}`);
  lignes.push(`– Containers : ${nb} x ${taille === '20' ? "20' Dry" : "40' HC"}`);
  if (PLAN && PLAN.poids) lignes.push(`– Poids brut : ${(PLAN.poids / 1000).toLocaleString('fr-FR', { maximumFractionDigits: 1 })} t`);
  if (PLAN && PLAN.pol && PLAN.depTxt && !$('f-depot').checked) lignes.push(`– Port de chargement : ${PLAN.pol}`);
  if (PLAN && conditionsPlan(PLAN).length) lignes.push(`– Conditions : ${conditionsPlan(PLAN).join(', ').toLowerCase()}`);
  lignes.push(`– Marchandise : papier en ${march} (sous famille HS 48)`);
  lignes.push(`– Incoterm : ${inco}`);
  if (client) lignes.push(`– Client : ${client}`);
  lignes.push(`– Motif de la demande : commande ferme`);

  const texte =
`Bonjour,

Pourriez-vous, s'il vous plaît, nous faire parvenir votre cotation pour le transport suivant :

${lignes.join('\n')}

Merci par avance.

Cordialement,`;
  return { ref, objet, texte };
}

/* ── popup mail : aperçu + édition (façon /invitation/) ── */
let mailCustom = null;   // corps modifié à la main, gardé jusqu'à envoi / reformulation
const mailOuvert = () => $('mail-fond').classList.contains('ouvert');

/* ── annuaire transitaires + camions (historique Sage, table fret_annuaire) ──
   Données PRIVÉES : lues avec le code d'accès (compte lecture seule proforma-lecture,
   même jeton que /proforma/ : localStorage prof_sb). Générées par scripts/fret_annuaire/build.py. */
const SURL = 'https://bvcgpdoukhcatjibmvnb.supabase.co';
const ANON = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJ2Y2dwZG91a2hjYXRqaWJtdm5iIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzIyNzg5MjgsImV4cCI6MjA4Nzg1NDkyOH0.Ip3ykSUS9sajTH04yXBerOG1haBKMD1kAvMQNjnGL1Q';
const CLE_SB = 'prof_sb';
let TRANSITAIRES = {}, CAMIONS = [], annuaireEtat = 'vide';   // vide | charge | ok | login
const lireSb = () => { try { return JSON.parse(localStorage.getItem(CLE_SB) || 'null'); } catch (e) { return null; } };
const ecrireSb = j => { try { localStorage.setItem(CLE_SB, JSON.stringify({ a: j.access_token, r: j.refresh_token, x: Date.now() + (j.expires_in - 60) * 1000, m: j.user && j.user.email })); } catch (e) {} };
async function authSb(body, grant) {
  const r = await fetch(SURL + '/auth/v1/token?grant_type=' + grant, { method: 'POST', headers: { apikey: ANON, 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
  const j = await r.json();
  if (!r.ok || !j.access_token) throw new Error(j.error_description || j.msg || 'Connexion refusée');
  ecrireSb(j);
  return j.access_token;
}
async function jetonSb() {
  const t = lireSb();
  if (!t) return null;
  if (Date.now() < t.x) return t.a;
  try { return await authSb({ refresh_token: t.r }, 'refresh_token'); }
  catch (e) { try { localStorage.removeItem(CLE_SB); } catch (_) {} return null; }
}
async function chargerAnnuaire() {
  annuaireEtat = 'charge';
  const tk = await jetonSb();
  if (!tk) { annuaireEtat = 'login'; renderTransitaires(); return; }
  try {
    const r = await fetch(SURL + '/rest/v1/fret_annuaire?select=id,data', { headers: { apikey: ANON, Authorization: 'Bearer ' + tk } });
    const rows = r.ok ? await r.json() : [];
    if (!rows.length) { try { localStorage.removeItem(CLE_SB); } catch (_) {} annuaireEtat = 'login'; renderTransitaires(); return; }
    rows.forEach(x => {
      if (x.id === 'transitaires') TRANSITAIRES = x.data.pays || {};
      if (x.id === 'camions') CAMIONS = x.data.liste || [];
    });
    annuaireEtat = 'ok';
  } catch (e) { annuaireEtat = 'login'; }
  renderTransitaires();
}
async function loginAnnuaire(ev) {
  ev.preventDefault();
  const champ = $('annu-code'), etat = $('annu-etat');
  etat.textContent = 'connexion…';
  try {
    await authSb({ email: 'proforma-lecture@prodi.com', password: champ.value.trim() }, 'password');
    chargerAnnuaire();
    if ($('f-client').value.trim()) clientInput();
  } catch (err) { etat.textContent = err.message === 'Invalid login credentials' ? 'code incorrect' : err.message; }
}

const normTr = v => (v || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toUpperCase().trim();
const escTr = v => String(v).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
const eur = n => Math.round(n).toLocaleString('fr-FR') + ' €';
const moisFr = d => d ? d.split('-').reverse().join('/') : '';
const ALIAS_TR = { 'ETATS-UNIS': 'ETATS UNIS', 'USA': 'ETATS UNIS', 'EMIRATS': 'EMIRATS ARABES UNIS', 'RD CONGO': 'REPUBLIQUE DEMOCRATIQUE DU CONGO' };
function paysTransit(val) {
  const parts = val.split(',').map(normTr).filter(Boolean);
  for (const p of parts.slice().reverse()) {
    const k = ALIAS_TR[p] || p;
    if (TRANSITAIRES[k]) return TRANSITAIRES[k];
  }
  // port seul : pays où ce port revient le plus souvent dans l'historique
  let best = null, score = 0;
  Object.values(TRANSITAIRES).forEach(e => {
    const n = e.liste.filter(t => t.ports.some(q => parts.includes(normTr(q)))).reduce((s, t) => s + t.n, 0);
    if (n > score) { score = n; best = e; }
  });
  return best;
}
function mailsHtml(t) {
  return t.emails.length
    ? t.emails.map(m => `<a href="mailto:${escTr(m)}">${escTr(m)}</a>`).join(' ')
    : `<span class="transit-sans">Pas d'e-mail dans Sage${t.tel ? ' · ' + escTr(t.tel) : ''}</span>`;
}
function ecartHtml(t) {
  if (t.ecart == null) return '';
  const cls = t.ecart <= -30 ? 'bon' : t.ecart >= 30 ? 'cher' : 'moy';
  return `<span class="transit-ecart ${cls}" title="Écart moyen par conteneur, à date égale, depuis 07/2025 (${t.n_ecart} envois)">${t.ecart > 0 ? '+' : ''}${t.ecart} €</span>`;
}
function renderTransitaires() {
  const box = $('f-transit'), boxC = $('f-camions');
  const val = $('f-pays').value.trim();
  const dep = $('f-depot').checked ? '' : $('f-prov').value.trim();
  if (!val && !dep) { box.hidden = true; box.innerHTML = ''; boxC.hidden = true; boxC.innerHTML = ''; return; }
  if (annuaireEtat === 'vide') { chargerAnnuaire(); return; }
  if (annuaireEtat === 'charge') return;
  if (annuaireEtat === 'login') { boxC.hidden = true; demanderCode(); return; }
  renderTransitairesPays(box, val);
  renderCamions(boxC, dep, val);
}
function renderTransitairesPays(box, val) {
  if (!val) { box.hidden = true; box.innerHTML = ''; return; }
  const e = paysTransit(val);
  box.hidden = false;
  if (!e) {
    box.innerHTML = `<div class="transit-head"><b>Transitaires</b><span>Aucun envoi pour cette destination dans Sage</span></div>`;
    return;
  }
  const marche = Object.entries(e.marche || {}).map(([p, m]) => `${escTr(p)} ${eur(m.med)}`).join(' · ');
  const lignes = e.liste.map(t => {
    const prix = Object.entries(t.prix || {}).map(([p, x]) =>
      `${escTr(p)} <b>${eur(x.dernier)}</b> (${moisFr(x.der)}${x.n > 1 ? ', ' + x.n + ' envois' : ''})`).join(' · ');
    const ports = t.ports.length ? ' · ' + t.ports.map(escTr).join(', ') : '';
    return `<div class="transit-ligne">
      <div class="transit-nom">${escTr(t.nom)} ${ecartHtml(t)}${t.contact ? `<small>${escTr(t.contact)}${t.tel ? ' · ' + escTr(t.tel) : ''}</small>` : ''}</div>
      <div class="transit-mail">${mailsHtml(t)}</div>
      <div class="transit-info">${t.n} envoi${t.n > 1 ? 's' : ''} · dernier ${moisFr(t.der)}${ports}</div>
      ${prix ? `<div class="transit-info transit-prix">40' depuis le dépôt, dernier prix : ${prix}</div>` : ''}
    </div>`;
  }).join('');
  box.innerHTML = `<div class="transit-head"><b>Transitaires ${escTr(e.nom)} (${e.liste.length}) <small>du moins cher au plus cher</small></b>
      <button type="button" class="transit-copie" onclick="copierTransit(this,'f-transit')">Copier les e-mails</button></div>
    ${marche ? `<div class="transit-marche">Marché actuel (40' depuis le dépôt) : ${marche}</div>` : ''}
    <div class="transit-liste">${lignes}</div>`;
  box.dataset.mails = [...new Set(e.liste.flatMap(t => t.emails))].join('; ');
}
/* camions : transporteurs dont un trajet passé contient un mot du départ / de la destination */
function renderCamions(box, dep, val) {
  const mots = [...new Set(normTr(dep + ' ' + val).split(/[\s,()\-–/]+/).filter(m => m.length >= 4 && !/^(FRANCE|SAINT|PORT|DEPOT)$/.test(m)))];
  const score = c => mots.length ? c.trajets.reduce((s, t) => s + (mots.some(m => normTr(t.t).includes(m)) ? t.n : 0), 0) : 0;
  let liste = CAMIONS.map(c => ({ c, s: score(c) }));
  const trouves = liste.filter(x => x.s > 0);
  liste = (trouves.length ? trouves : liste).sort((a, b) => b.s - a.s || b.c.n - a.c.n).map(x => x.c);
  if (!liste.length) { box.hidden = true; box.innerHTML = ''; return; }
  const lignes = liste.map(c => {
    const traj = c.trajets.slice(0, 4).map(t =>
      `${escTr(t.t)} <b>${eur(t.med)}</b>${t.n > 1 ? ` (${t.n}×)` : ''}`).join('<br>');
    return `<div class="transit-ligne">
      <div class="transit-nom">${escTr(c.nom)}<small>${escTr([c.contact, c.tel, c.ville].filter(Boolean).join(' · '))}</small></div>
      <div class="transit-mail">${mailsHtml(c)}</div>
      <div class="transit-info">${c.n} camion${c.n > 1 ? 's' : ''} depuis 2024 · médian ${eur(c.med)} · dernier ${moisFr(c.der)}</div>
      <div class="transit-info transit-prix">${traj}</div>
    </div>`;
  }).join('');
  box.hidden = false;
  box.innerHTML = `<div class="transit-head"><b>Camions (${liste.length}) <small>${trouves.length ? 'déjà fait ce trajet' : 'tous les transporteurs'}</small></b>
      <button type="button" class="transit-copie" onclick="copierTransit(this,'f-camions')">Copier les e-mails</button></div>
    <div class="transit-liste">${lignes}</div>`;
  box.dataset.mails = [...new Set(liste.flatMap(c => c.emails))].join('; ');
}
function copierTransit(btn, id) {
  navigator.clipboard.writeText($(id).dataset.mails || '').then(() => {
    btn.textContent = 'Copié';
    setTimeout(() => { btn.textContent = 'Copier les e-mails'; }, 1500);
  });
}

/* ── CLIENT / N° PROFORMA reliés à Sage (relais Sage → Supabase, même code d'accès) ──
   Taper un client = suggestions Sage ; le choisir (ou saisir un n° de pièce DE/BP/FA)
   remplit la DESTINATION avec le port de son dernier envoi (lignes transport T9/TRT),
   sinon le pays de sa fiche Sage. */
async function sbGet(path) {
  const tk = await jetonSb();
  if (!tk) { demanderCode(); throw new Error('login'); }
  const r = await fetch(SURL + '/rest/v1/' + path, { headers: { apikey: ANON, Authorization: 'Bearer ' + tk } });
  if (r.status === 401) { try { localStorage.removeItem(CLE_SB); } catch (_) {} demanderCode(); throw new Error('login'); }
  return r.json();
}
function demanderCode() {
  annuaireEtat = 'login';
  const box = $('f-transit');
  box.hidden = false;
  box.innerHTML = `<div class="transit-head"><b>Sage, transitaires & camions</b><span id="annu-etat">code d'accès (une seule fois sur cet appareil)</span></div>
    <form class="annu-login" onsubmit="loginAnnuaire(event)"><input id="annu-code" type="password" placeholder="Code" autocomplete="current-password"><button type="submit">OK</button></form>`;
}
let clTempo = null, clRes = [];
function clientInput() {
  if (PLAN && $('f-client').value.trim() !== (PLAN.client || '')) PLAN = null;
  regenMail();
  clearTimeout(clTempo);
  const q = $('f-client').value.trim();
  if (q.length < 2) { $('cl-list').classList.remove('open'); return; }
  clTempo = setTimeout(async () => {
    try {
      const r = await sbGet('rpc/sage_recherche_clients?q=' + encodeURIComponent(q));
      clRes = Array.isArray(r) ? r.slice(0, 12) : [];
    } catch (e) { clRes = []; }
    if (q !== $('f-client').value.trim()) return;
    $('cl-list').innerHTML = clRes.map((c, i) =>
      `<button class="pp-item cl-item" onmousedown="pickClient(${i})"><b>${escTr(c.nom || '')}</b><span class="z">${escTr([c.code, c.ville, c.pays].filter(Boolean).join(' · '))}</span></button>`).join('')
      || '<div class="pp-item mut">Aucun client Sage — partira tel quel</div>';
    $('cl-list').classList.add('open');
  }, 220);
}
async function pickClient(i) {
  const c = clRes[i];
  $('f-client').value = c.nom;
  clientCode = c.code;
  $('cl-list').classList.remove('open');
  regenMail();
  try {
    if (annuaireEtat !== 'ok') await chargerAnnuaire();
    const pc = await dernierePieceFret(c.code);
    if (pc && await planDepuisPiece(pc)) return;
  } catch (e) {}
  destDepuisSage(c.code, c.pays);
}
/* n° de pièce Sage (DE/BP/BL/FA…) → client + destination de CETTE pièce d'abord */
let numTempo = null;
function numInput() {
  regenMail();
  numSuggest();
  clearTimeout(numTempo);
  const n = $('f-num').value.trim().toUpperCase();
  if (!/^[A-Z]{2}\d{5,6}$/.test(n)) return;
  numTempo = setTimeout(async () => {
    try {
      if (await planDepuisPiece(n)) return;
      const v = await sbGet(`sage_ventes?piece=eq.${encodeURIComponent(n)}&select=client_code,client&limit=1`);
      if (!v.length) return;
      if (!$('f-client').value.trim()) { $('f-client').value = v[0].client; regenMail(); }
      destDepuisSage(v[0].client_code, null, n);
    } catch (e) {}
  }, 300);
}
/* port reconnu dans un libellé transport Sage (« 1x40'HC SAINT-OUEN À BEJAIA - CIE MSC ») :
   ports de la page (DEST_PORTS) + ports déjà desservis dans Sage (annuaire transitaires) */
function portsConnus() {
  const out = DEST_PORTS.map(p => ({ nom: p.nom, pays: p.pays, flag: p.flag }));
  Object.values(TRANSITAIRES).forEach(e => {
    const c = PAYS.find(x => normTr(x.nom) === normTr(e.nom));
    new Set(e.liste.flatMap(t => t.ports)).forEach(port => {
      if (!out.some(o => normTr(o.nom) === normTr(port))) out.push({ nom: port, pays: e.nom, flag: c ? c.flag : '🌍' });
    });
  });
  return out;
}
function portDuLibelle(des, ports) {
  const d = normTr(des);
  const apres = d.split(/\s(?:A|TO)\s/).pop();
  let best = null;
  ports.forEach(p => {
    const n = normTr(p.nom);
    if (n.length >= 3 && new RegExp('\\b' + n.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '\\b').test(apres) && (!best || n.length > normTr(best.nom).length)) best = p;
  });
  return best;
}
function poserDest(p) {
  $('f-pays').value = p.nom + ', ' + p.pays;
  $('f-pays-port').value = '';
  window._destPicked = $('f-pays').value;
  const c = PAYS.find(x => normTr(x.nom) === normTr(p.pays));
  selPays = c ? c.code : null;
  $('pp-flag').textContent = p.flag;
  majEnvoiActif();
  regenMail();
}
async function destDepuisSage(code, paysFiche, piece) {
  if (!code) return;
  if (annuaireEtat !== 'ok') await chargerAnnuaire();   // ports desservis = annuaire
  try {
    const ventes = await sbGet(`sage_ventes?client_code=eq.${encodeURIComponent(code)}&select=piece,date_piece&order=date_piece.desc&limit=60`);
    const ordre = ventes.map(v => v.piece);
    if (piece) { ordre.splice(ordre.indexOf(piece) >>> 0, 1); ordre.unshift(piece); }
    if (ordre.length) {
      const lignes = await sbGet(`sage_vente_lignes?piece=in.(${ordre.map(encodeURIComponent).join(',')})&article=like.T*&select=piece,designation`);
      const ports = portsConnus();
      for (const pc of ordre) {
        const l = lignes.find(x => x.piece === pc && portDuLibelle(x.designation || '', ports));
        if (l) {
          const p = portDuLibelle(l.designation, ports);
          poserDest(p);
          const v = ventes.find(x => x.piece === pc);
          toast(p.flag, `Destination reprise de Sage : <b>${escTr(p.nom)}</b> (${escTr(pc)}${v && v.date_piece ? ', ' + v.date_piece.slice(0, 10).split('-').reverse().join('/') : ''})`);
          return;
        }
      }
    }
    // pas d'envoi connu : pays de la fiche client
    const pays = PAYS.find(p => normTr(p.nom) === normTr(paysFiche || ''));
    if (pays && !$('f-pays').value.trim()) { pickDest(pays.code); toast(pays.flag, `Pays repris de la fiche Sage : <b>${escTr(pays.nom)}</b>`); }
  } catch (e) {}
}

/* ── PLAN DE TRANSPORT : lit la pièce Sage (devis/BP/facture) comme un transitaire le ferait ──
   containers + taille (ligne fret T9/TRT, sinon tonnage ÷ 25,5 t), poids, bobines/formats,
   incoterm, départ (dépôt / usine / POL), contraintes écrites dans la pièce (transbordement…),
   fret prévu au devis vs marché, transitaires à consulter + un mail INDIVIDUEL chacun. */
let PLAN = null;
const T_PAR_40 = 25.5;   // tonnes de papier par 40' HC (pratique dépôt)
async function analyserPiece(piece) {
  const [v] = await sbGet(`sage_ventes?piece=eq.${encodeURIComponent(piece)}&select=piece,date_piece,client,client_code,incoterm,port_depart,port_transbordement&limit=1`);
  if (!v) return null;
  const L = await sbGet(`sage_vente_lignes?piece=eq.${encodeURIComponent(piece)}&select=ligne,article,famille,designation,quantite,poids_net_kg,poids_brut_kg,prix_unitaire&order=ligne`);
  const plan = { piece, date: (v.date_piece || '').slice(0, 10), client: v.client, code: v.client_code,
    incoterm: (v.incoterm || '').toUpperCase(), pol: (v.port_depart || '').trim(), transb: (v.port_transbordement || '').trim(),
    nb: 0, taille: '40', fretCt: 0, poids: 0, bob: false, fmt: false, dest: null, orig: '', usine: '', contraintes: [] };
  const ports = portsConnus();
  L.forEach(l => {
    const a = l.article || '', d = l.designation || '', D = normTr(d);
    const fret = /^(T9|TRT)/.test(a) && !/APPRO/.test(D);
    const m = D.match(/(\d+)\s*X\s*(20|40)/);
    if (fret && m) {
      plan.nb += +m[1]; plan.taille = m[2];
      if (+l.prix_unitaire > 0) plan.fretCt = +l.prix_unitaire;
      const p = portDuLibelle(d, ports); if (p) plan.dest = p;
      const o = D.split(/\s(?:A|TO)\s/); if (o.length > 1) plan.orig = o[0].replace(/^\d+\s*X\s*(20|40)\S*\s*(HC|DRY)?\s*(FOB|EXW|FCA)?\s*/, '').trim();
      return;
    }
    if (a && l.famille && !/^W/.test(l.famille) && !/^T\d/.test(a)) {
      plan.poids += (+l.poids_brut_kg || +l.poids_net_kg || 0);
      if (/^R/.test(l.famille)) plan.bob = true;
      if (/^S/.test(l.famille)) plan.fmt = true;
      return;
    }
    if (!a && /^USINE\s+\d+/.test(D)) plan.usine = D.match(/^USINE\s+\d+/)[0];
    if (!a && /PORT DE DECHARGEMENT\s*:/.test(D) && !plan.dest) { const p = portDuLibelle(D.split(':').pop(), ports); if (p) plan.dest = p; }
    if (!a && /TRANSBORD|SANS TRANSIT|DIRECT|NO TRANSHIP|SANS ESCALE|CONSOLID/.test(D) && !/MONTANT/.test(D))
      plan.contraintes.push(d.trim().replace(/\s+/g, ' ').toLowerCase().replace(/^./, c => c.toUpperCase()));
  });
  const t = plan.poids / 1000;
  if (!plan.nb) plan.nb = Math.max(1, Math.ceil(t / T_PAR_40));
  plan.depot = /SAINT.?OUEN|ST.?OUEN|80610/.test(plan.orig) || (!plan.orig && !plan.usine && /HAVRE|ROUEN/.test(normTr(plan.pol)));
  return plan;
}
/* client sans pièce : sa dernière pièce qui contient une ligne de fret = son envoi type */
async function dernierePieceFret(code) {
  const ventes = await sbGet(`sage_ventes?client_code=eq.${encodeURIComponent(code)}&select=piece&order=date_piece.desc&limit=60`);
  if (!ventes.length) return null;
  const pcs = ventes.map(v => v.piece);
  const L = await sbGet(`sage_vente_lignes?piece=in.(${pcs.map(encodeURIComponent).join(',')})&or=(article.like.T9*,article.like.TRT*)&select=piece,designation`);
  return pcs.find(pc => L.some(l => l.piece === pc && /\d+\s*x\s*(20|40)/i.test(l.designation || '') && !/APPRO/i.test(l.designation || ''))) || null;
}
/* transbordement (champ Sage) + lignes de conditions, sans doublon */
function conditionsPlan(p) {
  const c = [...p.contraintes];
  if (p.transb && !/^AUCUN/i.test(p.transb) && !c.some(x => /transbord/i.test(x))) c.unshift('Transbordement ' + p.transb.toLowerCase());
  return c;
}
function appliquerPlan(plan) {
  PLAN = plan;
  if (plan.dest) poserDest(plan.dest);
  if (plan.depot) { $('f-depot').checked = true; $('f-prov').value = 'Dépôt — Saint-Ouen (80)'; $('pv-flag').textContent = '🏭'; }
  else {
    const dep = [plan.orig && plan.orig.replace(/\b\w+/g, w => w[0] + w.slice(1).toLowerCase()), plan.usine && plan.usine.replace('USINE', 'Usine')].filter(Boolean)[0] || '';
    $('f-depot').checked = false;
    plan.depTxt = dep;
    $('f-prov').value = dep || (plan.pol ? 'Port de ' + plan.pol[0] + plan.pol.slice(1).toLowerCase() : '');
  }
  $('f-nb-cont').value = plan.nb; majContSuffixe();
  $('f-t-20').checked = plan.taille === '20'; $('f-t-40').checked = plan.taille !== '20';
  if (plan.bob || plan.fmt) { $('f-m-bobines').checked = plan.bob; $('f-m-formats').checked = plan.fmt; }
  const fob = /FOB|FCA/.test(plan.incoterm);
  $('f-i-fob').checked = fob; $('f-i-cfr').checked = !fob;
  majEnvoiActif();
  regenMail();
}
/* transitaires à consulter : déjà fait CE départ > a déjà livré CE port > moins cher à date égale > volume */
function conseilles(plan, e) {
  if (!e) return [];
  const portN = plan.dest ? normTr(plan.dest.nom) : '';
  const motsDep = normTr([plan.orig, plan.pol, plan.usine, plan.depot ? 'SAINT-OUEN' : ''].join(' ')).split(/[\s,()\-–/]+/).filter(m => m.length >= 4 && m !== 'USINE');
  const ilYa12 = new Date(); ilYa12.setMonth(ilYa12.getMonth() - 12);
  const lim = ilYa12.toISOString().slice(0, 7);
  return e.liste.filter(t => t.emails.length).map(t => {
    const dep = !plan.depot && motsDep.some(m => (t.origines || []).some(o => normTr(o).includes(m)));
    const port = !portN || t.ports.some(p => normTr(p) === portN);
    const prixPort = Object.entries(t.prix || {}).find(([p]) => normTr(p) === portN);
    return { t, dep, port, recent: t.der >= lim, prixPort: prixPort && prixPort[1],
      s: (dep ? 4 : 0) + (port ? 2 : 0) + (t.der >= lim ? 1 : 0) };
  }).sort((a, b) => b.s - a.s || (a.t.ecart ?? 999) - (b.t.ecart ?? 999) || b.t.n - a.t.n).slice(0, 4);
}
function mailIndividuel(i) {
  const c = window._conseilles && window._conseilles[i];
  const m = genMail();
  if (!c || !m) return;
  const corps = (mailCustom ?? m.texte);
  location.href = `mailto:${c.t.emails[0]}?subject=${encodeURIComponent(m.objet)}&body=${encodeURIComponent(corps)}`;
}
function renderPlan() {
  const box = $('f-plan');
  if (!PLAN) { box.hidden = true; box.innerHTML = ''; return; }
  const p = PLAN, t = p.poids / 1000;
  const e = paysTransit($('f-pays').value.trim());
  const mk = e && p.dest ? Object.entries(e.marche || {}).find(([k]) => normTr(k) === normTr(p.dest.nom)) : null;
  const marche = mk && mk[1];
  const lignes = [];
  const cont = `${p.nb} × ${p.taille === '20' ? "20' Dry" : "40' HC"}`;
  const charge = t ? ` · ${t.toLocaleString('fr-FR', { maximumFractionDigits: 1 })} t (${(t / p.nb).toLocaleString('fr-FR', { maximumFractionDigits: 1 })} t/ct)` : '';
  lignes.push(`<div class="plan-l"><b>${cont}</b>${charge} · ${[p.bob && 'bobines', p.fmt && 'formats'].filter(Boolean).join(' + ') || 'papier'} · ${escTr(p.incoterm || '—')}${p.pol ? ' · POL ' + escTr(p.pol) : ''}${p.dest ? ' → ' + escTr(p.dest.nom) : ''}</div>`);
  if (t && p.taille !== '20' && t / p.nb > 26.5) lignes.push(`<div class="plan-l alerte">⚠️ ${(t / p.nb).toFixed(1)} t par conteneur : au-delà de ~26,5 t, prévoir ${Math.ceil(t / 26.5)} conteneurs</div>`);
  if (p.incoterm === 'EXW') lignes.push(`<div class="plan-l alerte">EXW : le client enlève lui-même, pas de fret maritime à coter (camion seulement si on l'organise).</div>`);
  if (conditionsPlan(p).length) lignes.push(`<div class="plan-l">Contraintes de la pièce : ${conditionsPlan(p).map(escTr).join(' · ')}</div>`);
  if (marche) {
    const tend = marche.tend != null ? ` · ${marche.tend > 0 ? '↑ +' : marche.tend < 0 ? '↓ ' : ''}${marche.tend} % sur 3 mois` : '';
    let devis = '';
    if (p.fretCt) {
      const dlt = p.fretCt - marche.med;
      devis = ` · devis : <b>${eur(p.fretCt)}</b>/ct ${dlt < -50 ? `<span class="plan-ko">⚠️ ${eur(dlt)} sous le marché</span>` : dlt > 50 ? `<span class="plan-ok">+${eur(dlt)} de marge</span>` : '<span class="plan-ok">aligné</span>'}`;
    }
    lignes.push(`<div class="plan-l">${p.depot ? 'Prix attendu' : 'Repère (départs du dépôt, autre départ ici)'} : <b>~${eur(marche.med)}</b>/ct (marché ${escTr(p.dest.nom)} ${moisFr(marche.der)}, ${marche.n} envoi${marche.n > 1 ? 's' : ''}${tend}) · total ~${eur(marche.med * p.nb)}${devis}</div>`);
  } else if (p.fretCt) {
    lignes.push(`<div class="plan-l">Fret prévu au devis : <b>${eur(p.fretCt)}</b>/ct${p.depot ? '' : ' (pas de référence marché depuis ce départ)'}</div>`);
  }
  const cs = conseilles(p, e);
  window._conseilles = cs;
  if (cs.length) {
    lignes.push(`<div class="plan-l plan-tr">À consulter, un mail chacun :${cs.map((c, i) => {
      const why = [c.dep && 'a déjà fait ce départ', c.t.ecart != null && (c.t.ecart > 0 ? '+' : '') + c.t.ecart + ' €/ct', c.prixPort && 'dernier ' + eur(c.prixPort.dernier) + ' (' + moisFr(c.prixPort.der) + ')'].filter(Boolean).join(' · ');
      return `<button type="button" class="plan-btn" onclick="mailIndividuel(${i})" title="${escTr(c.t.emails[0])}">✉️ ${escTr(c.t.nom)}<small>${escTr(why || c.t.n + ' envois')}</small></button>`;
    }).join('')}</div>`);
  }
  box.hidden = false;
  box.innerHTML = `<div class="transit-head"><b>Plan de transport <small>d'après ${escTr(p.piece)}${p.date ? ' du ' + p.date.split('-').reverse().join('/') : ''}</small></b>
    <button type="button" class="transit-copie" onclick="PLAN=null;renderPlan();regenMail()">Ignorer</button></div>${lignes.join('')}`;
}
async function planDepuisPiece(piece) {
  try {
    if (annuaireEtat !== 'ok') await chargerAnnuaire();
    const plan = await analyserPiece(piece);
    if (!plan) return false;
    if (!$('f-client').value.trim()) $('f-client').value = plan.client || '';
    appliquerPlan(plan);
    return true;
  } catch (e) { return false; }
}

/* ── REPRENDRE UN DEVIS : la case N° propose les pièces Sage (devis d'abord) ──
   vide = derniers devis du client choisi (ou de tout le monde) ; « DE431 » = par numéro ;
   « mahgoun » = par client. Chaque ligne montre le fret de la pièce (1x40'HC BEJAIA…). */
const TYPE_PIECE = { 0: 'Devis', 1: 'Commande', 2: 'Prépa', 3: 'BL', 6: 'Facture', 7: 'Facture' };
let numRes = [], numSugTempo = null, clientCode = null;
function numSuggest() {
  clearTimeout(numSugTempo);
  numSugTempo = setTimeout(async () => {
    const q = $('f-num').value.trim();
    let filtre = 'do_type=in.(0,1,2,6,7)';
    if (/^[A-Za-z]{0,2}\d{2,}$/.test(q)) filtre += `&piece=ilike.*${encodeURIComponent(q.toUpperCase())}*`;
    else if (q.length >= 2) filtre += `&client=ilike.*${encodeURIComponent(q.replace(/[*,()%]/g, ' '))}*`;
    else if (clientCode) filtre += `&client_code=eq.${encodeURIComponent(clientCode)}`;
    try {
      const v = await sbGet(`sage_ventes?${filtre}&select=piece,date_piece,client,client_code,do_type&order=date_piece.desc,piece.desc&limit=14`);
      const pcs = v.map(x => x.piece);
      const L = pcs.length ? await sbGet(`sage_vente_lignes?piece=in.(${pcs.map(encodeURIComponent).join(',')})&or=(article.like.T9*,article.like.TRT*)&select=piece,designation`) : [];
      numRes = v.map(x => ({ ...x, fret: (L.find(l => l.piece === x.piece && /\d+\s*x\s*(20|40)/i.test(l.designation || '') && !/APPRO/i.test(l.designation || '')) || {}).designation || '' }));
      // devis d'abord, puis ceux qui ont une ligne de fret
      numRes.sort((a, b) => (a.do_type !== 0) - (b.do_type !== 0) || (!a.fret) - (!b.fret));
    } catch (e) { numRes = []; }
    if (q !== $('f-num').value.trim()) return;
    $('num-list').innerHTML = numRes.map((x, i) =>
      `<button class="pp-item cl-item num-item" onmousedown="pickPiece(${i})"><span><b>${escTr(x.piece)}</b> <span class="num-type">${TYPE_PIECE[x.do_type] || ''}</span> ${escTr(x.client || '')}<small>${escTr(x.fret || 'pas de ligne de fret')}</small></span><span class="z">${(x.date_piece || '').slice(0, 10).split('-').reverse().join('/')}</span></button>`).join('')
      || '<div class="pp-item mut">Aucune pièce Sage — le n° partira tel quel</div>';
    $('num-list').classList.add('open');
  }, 200);
}
async function pickPiece(i) {
  const x = numRes[i];
  $('f-num').value = x.piece;
  $('f-client').value = x.client || '';
  clientCode = x.client_code;
  $('num-list').classList.remove('open');
  PLAN = null;
  regenMail();
  if (!(await planDepuisPiece(x.piece))) destDepuisSage(x.client_code, null, x.piece);
}

function regenMail() {
  renderTransitaires();
  if (typeof renderPlan === 'function' && $('f-plan')) renderPlan();
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
  $('mail-zone').value = mailCustom ?? m.texte;
}
function ouvrirMail() {
  if ($('f-send').disabled) return;
  renderMail();
  $('mail-fond').classList.add('ouvert');
  $('mail-zone').scrollTop = 0;
}
function fermerMail() { $('mail-fond').classList.remove('ouvert'); }
function resetMail() { mailCustom = null; renderMail(); }

/* ── envoi RÉEL via prodi-arrivages (canal ethan@ de /api/notify) ──
   Depuis localhost, le serveur redirige tout sur ethan@ sans cc (mode test). */
const API_FRET = 'https://prodi-arrivages.vercel.app/api/fret-envoi';
let envoiEnCours = false;
async function confirmerEnvoi() {
  if (envoiEnCours) return;
  const m = genMail();
  if (!m) return;
  const p = paysByCode(selPays) || { flag: '🌍' };
  const corps = $('mail-zone').value.trim();   // ce qui est à l'écran part tel quel
  if (!corps) return;
  const btn = $('mp-envoyer');
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
    const ref = m.ref;
    if (!$('f-num').value.trim()) nextRef++;   // la réf auto n'avance que si pas de proforma
    demandes.push({
      ref, pays: selPays,
      destination: [$('f-pays-port').value.trim(), $('f-pays').value.trim()].filter(Boolean).join(', '),
      client: $('f-client').value.trim(),
      numero: $('f-num').value.trim(),
      provenance: $('f-depot').checked ? DEPOT_ADRESSE : $('f-prov').value.trim(),
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
        <p>${d.client ? 'Client : ' + d.client + (d.numero ? ' — ' + d.numero : '') + ' · ' : ''}${d.marchandise} · ${d.nbCont} × ${d.taille}' · ${d.incoterm} · ${d.provenance ? d.provenance + ' → ' : ''}${d.destination || p.nom} · envoyée ${relTime(d.date)}</p>
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
