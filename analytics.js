// ─────────────────────────────────────────────────────────────────────────────
// Prodi Analytics — compteur maison, données dans NOTRE Supabase (site_events).
// Zéro cookie tiers, zéro service externe : un identifiant aléatoire local
// (localStorage) pour compter les visiteurs uniques, une session par onglet.
//
// Chargé par la vitrine (/) ET le catalogue (/catalogue/). Expose
// window.prodiTrack(event, props) pour les événements métier — toujours
// fire-and-forget : l'analytics ne doit JAMAIS casser ni ralentir le site.
//
// Équipe Prodi : ouvrir une fois prodi.com/?team → l'appareil est marqué
// `interne` à vie, ses visites sont exclues des stats visiteurs.
// ─────────────────────────────────────────────────────────────────────────────
(function () {
  'use strict';
  var SURL = 'https://bvcgpdoukhcatjibmvnb.supabase.co';
  var ANON = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJ2Y2dwZG91a2hjYXRqaWJtdm5iIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzIyNzg5MjgsImV4cCI6MjA4Nzg1NDkyOH0.Ip3ykSUS9sajTH04yXBerOG1haBKMD1kAvMQNjnGL1Q';

  // Robots / rendus headless : on ne compte pas.
  if (navigator.webdriver || /bot|crawl|spider|lighthouse|headless/i.test(navigator.userAgent)) {
    window.prodiTrack = function () {};
    return;
  }

  function rid() { return Math.random().toString(36).slice(2, 10) + Date.now().toString(36); }
  function store(area, key, gen) {
    try {
      var v = area.getItem(key);
      if (!v) { v = gen(); area.setItem(key, v); }
      return v;
    } catch (e) { return gen(); } // navigation privée : ids éphémères, tant pis
  }

  var visitorId = store(localStorage, 'prodi_vid', rid);
  var sessionId = store(sessionStorage, 'prodi_sid', rid);

  // Marquage équipe : ?team (une fois) ou localhost.
  var qs = new URLSearchParams(location.search);
  var interne = false;
  try {
    if (qs.has('team')) localStorage.setItem('prodi_team', '1');
    interne = localStorage.getItem('prodi_team') === '1';
  } catch (e) { /* ignore */ }
  if (/^(localhost|127\.)/.test(location.hostname)) interne = true;

  var page = location.pathname.indexOf('/catalogue') === 0 ? 'catalogue' : 'vitrine';

  // Referrer : hostname externe uniquement (pas de navigation interne, pas d'URL complète).
  var ref = null;
  try {
    if (document.referrer) {
      var rh = new URL(document.referrer).hostname;
      if (rh && rh !== location.hostname) ref = rh;
    }
  } catch (e) { /* ignore */ }

  var utm = null;
  if (qs.get('utm_source')) {
    utm = [qs.get('utm_source'), qs.get('utm_medium'), qs.get('utm_campaign')]
      .filter(Boolean).join('/').slice(0, 200);
  }

  // ── Attribution PERSISTANTE (25/08) : gclid/gbraid/wbraid + premier utm de
  // la session, portés par CHAQUE événement (props.g / props.u). Comble le trou
  // du 24/08 : les clics payés Search (auto-tagging gclid, pas d'utm) étaient
  // invisibles en base — impossible de relier un lead à un clic Ads. ──
  var attr = {};
  try { attr = JSON.parse(sessionStorage.getItem('prodi_attr') || '{}') || {}; } catch (e) {}
  var _g = qs.get('gclid') || qs.get('gbraid') || qs.get('wbraid');
  if (_g) attr.g = String(_g).slice(0, 120);
  if (utm && !attr.u) attr.u = utm;
  try { sessionStorage.setItem('prodi_attr', JSON.stringify(attr)); } catch (e) {}

  // ── Géoloc PAYS (27/08) : le vrai pays du visiteur via son IP (api.country.is,
  // gratuit, sans clé, CORS). La langue du navigateur n'est PAS le pays (fr-FR =
  // français par défaut même au Maghreb). Mis en cache session (prodi_geo) →
  // porté par CHAQUE événement en props.geo (code ISO 2 lettres). Fire-and-forget :
  // seul le CODE PAYS est stocké (pas l'IP), et un échec ne casse jamais rien. ──
  var geo = null;
  try { geo = sessionStorage.getItem('prodi_geo') || null; } catch (e) {}
  if (!geo) {
    try {
      fetch('https://api.country.is/').then(function (r) { return r.json(); }).then(function (d) {
        if (d && d.country) { geo = String(d.country).slice(0, 4); try { sessionStorage.setItem('prodi_geo', geo); } catch (e) {} }
      }).catch(function () {});
    } catch (e) { /* jamais bloquant */ }
  }

  // ── IDENTITÉ DU COMPTE CONNECTÉ (08/10) : uid + e-mail du compte Supabase
  // joints à CHAQUE événement (props.uid / props.em) → on reconstruit le
  // parcours NOMMÉ d'un client (pageviews, filtres, fiches, panier, résa…)
  // au lieu d'un visitor_id anonyme. Relu à chaque envoi (la connexion peut
  // survenir en cours de session). Aucun appel réseau : lecture localStorage.
  function authInfo() {
    try {
      var raw = localStorage.getItem('sb-bvcgpdoukhcatjibmvnb-auth-token');
      if (!raw) return null;
      var s = JSON.parse(raw); var u = s && s.user;
      if (!u || !u.id) return null;
      return { uid: u.id, em: (u.email || '').slice(0, 120) };
    } catch (e) { return null; }
  }

  // Événements métier reflétés vers Google Ads (balise AW du <head>) pour les
  // conversions des campagnes. Jamais pour l'équipe interne.
  // 25/08 : chaque événement pingue en plus SON action de conversion (labels
  // extraits via l'API Ads) — clics WhatsApp/tél/email → « Contact » (signal
  // principal de l'algo), envois de formulaires → « Demande de devis »
  // (action passée en secondaire côté Ads : la page /merci/ reste LA
  // conversion primaire des formulaires, pas de double comptage).
  var ADS_EVENTS = {
    devis_envoye: 'gdBLCJunzuIcENezwsJE',
    contact_envoye: 'gdBLCJunzuIcENezwsJE',
    whatsapp_click: 'rpPjCJ6nzuIcENezwsJE',
    tel_click: 'rpPjCJ6nzuIcENezwsJE',
    email_click: 'rpPjCJ6nzuIcENezwsJE',
  };

  function send(event, props) {
    try {
      if (!interne && ADS_EVENTS[event] && typeof window.gtag === 'function') {
        window.gtag('event', event, { send_to: 'AW-18393110999' });
        window.gtag('event', 'conversion', { send_to: 'AW-18393110999/' + ADS_EVENTS[event] });
      }
    } catch (e) { /* jamais bloquant */ }
    try {
      var body = JSON.stringify({
        visitor_id: visitorId,
        session_id: sessionId,
        page: page,
        event: String(event).slice(0, 40),
        // chemin exact de la page (accueil vs /maroc/ vs /offset/…) sur CHAQUE
        // événement (21/08 : le traqueur ne distinguait que vitrine|catalogue)
        // + attribution session (25/08) : g = gclid Ads, u = premier utm
        props: Object.assign(
          (function () {
            var b = { p: location.pathname.slice(0, 120) };
            if (attr.g) b.g = attr.g;
            if (attr.u) b.u = attr.u;
            if (geo) b.geo = geo;
            var ai = authInfo(); if (ai) { b.uid = ai.uid; if (ai.em) b.em = ai.em; }
            return b;
          })(), props || {}),
        referrer: ref,
        utm: utm,
        lang: (navigator.language || '').slice(0, 20),
        mobile: matchMedia('(max-width: 768px)').matches,
        interne: interne,
      });
      fetch(SURL + '/rest/v1/site_events', {
        method: 'POST',
        keepalive: true, // survit à la fermeture de la page
        headers: { apikey: ANON, Authorization: 'Bearer ' + ANON, 'Content-Type': 'application/json', Prefer: 'return=minimal' },
        body: body,
      }).catch(function () {});
    } catch (e) { /* jamais bloquant */ }
  }

  window.prodiTrack = send;

  // ── Pageview (avec code panier si arrivée via lien partagé) ──────────────
  var cartCode = qs.get('s') || qs.get('panier') || null; // ?s= = lien panier partagé
  send('pageview', cartCode ? { via_panier: String(cartCode).slice(0, 20) } : null);

  // ── Recherche catalogue : écoute découplée sur #search-input ─────────────
  // (debounce 900 ms, min 2 caractères, pas deux fois la même requête de suite)
  if (page === 'catalogue') {
    var lastQ = '';
    var timer = null;
    document.addEventListener('input', function (e) {
      var t = e.target;
      if (!t || t.id !== 'search-input') return;
      clearTimeout(timer);
      timer = setTimeout(function () {
        var q = (t.value || '').trim().toLowerCase().slice(0, 80);
        if (q.length >= 2 && q !== lastQ) {
          lastQ = q;
          send('recherche', { q: q });
        }
      }, 900);
    }, true);
  }

  // ── Profondeur de scroll max (25/08) : jointe au ping de durée ──────────
  var maxDepth = 0;
  addEventListener('scroll', function () {
    var h = document.documentElement.scrollHeight - innerHeight;
    if (h > 50) {
      var d = Math.round((scrollY / h) * 100);
      if (d > maxDepth) maxDepth = d > 100 ? 100 : d;
    }
  }, { passive: true });

  // ── Erreurs JS visiteurs (25/08) : max 3/page, pour repérer une UX cassée
  // sur un navigateur qu'on ne teste pas (vieux Safari, webviews…) ──────────
  var errN = 0;
  addEventListener('error', function (e) {
    if (errN >= 5 || !e.message) return;
    errN++;
    send('js_error', {
      m: String(e.message).slice(0, 120),
      s: String((e.filename || '').split('/').pop()).slice(0, 40),
      l: e.lineno || 0,
    });
  });

  // ════════════════════════════════════════════════════════════════════════
  // TRAQUEURS D'USAGE (15/10) — « où ça va, où ça coince ». Tout est générique,
  // plafonné par page et fire-and-forget. Bilan : ~/Code/prodi_dashboard/bilan_ux.py
  //   ui_clic          chaque clic sur un élément interactif (libellé + élément)
  //   rage_clic        ≥3 clics en 1 s au même endroit (frustration)
  //   clic_mort        clic sur un élément interactif SANS aucun effet en 1,2 s
  //   ui_erreur        message d'erreur rendu visible à l'écran (#…err…, .…err…)
  //   form_invalide    champ refusé par la validation native du navigateur
  //   popup_vu/_ferme  fenêtres modales (ouverture, fermeture + durée + action ?)
  //   perf             vitesse réelle (TTFB, DOM prêt, chargement, LCP, réseau)
  //   recherche        + barre de recherche du header (via:'header')
  //   duree            + nb de clics et DERNIER élément cliqué avant de partir
  // ════════════════════════════════════════════════════════════════════════
  var INTER = 'a,button,[onclick],[role=button],summary,select,label,input[type=checkbox],input[type=radio],input[type=submit],tr[onclick],[data-xli]';
  function lbl(el) {
    try {
      var t = (el.getAttribute('aria-label') || el.innerText || el.value || el.title || '').replace(/\s+/g, ' ').trim();
      return t.slice(0, 40);
    } catch (e) { return ''; }
  }
  function sig(el) {
    try {
      var c = (typeof el.className === 'string' ? el.className : '').trim().split(/\s+/).slice(0, 2).join('.');
      return (el.tagName || '').toLowerCase() + (el.id ? '#' + el.id : '') + (c ? '.' + c : '');
    } catch (e) { return '?'; }
  }
  var nClic = 0, lastClic = null, clicN = 0, mortN = 0, rageSeen = {}, recent = [];
  var mut = 0;
  try { new MutationObserver(function (m) { mut += m.length; }).observe(document.documentElement, { subtree: true, childList: true, attributes: true, characterData: true }); } catch (e) {}
  document.addEventListener('click', function (e) {
    try {
      if (!e.isTrusted) return; /* clics simulés par le code (ex. « Dispo » auto) ≠ visiteur */
      var el = e.target && e.target.closest && e.target.closest(INTER);
      var now = Date.now();
      // rage : 3 clics en 1 s dans un rayon de 40 px (même sur zone non interactive)
      recent.push({ t: now, x: e.clientX, y: e.clientY });
      recent = recent.filter(function (r) { return now - r.t < 1000 && Math.abs(r.x - e.clientX) < 40 && Math.abs(r.y - e.clientY) < 40; });
      if (recent.length >= 3) {
        var tgt = el || e.target, k = sig(tgt);
        if (!rageSeen[k]) { rageSeen[k] = 1; send('rage_clic', { t: lbl(tgt), el: k }); }
        recent = [];
      }
      if (!el) return;
      nClic++; lastClic = (lbl(el) || sig(el)).slice(0, 40);
      if (clicN < 80) { clicN++; send('ui_clic', { t: lbl(el), el: sig(el), y: Math.round(e.clientY / innerHeight * 100) }); }
      // clic mort : aucune mutation DOM, pas de navigation, pas de nouveau focus
      if (mortN < 10 && !/^(select|label|input)$/i.test(el.tagName)) {
        var m0 = mut, u0 = location.href, f0 = document.activeElement;
        setTimeout(function () {
          if (mut === m0 && location.href === u0 && document.activeElement === f0 && !document.hidden) {
            mortN++; send('clic_mort', { t: lbl(el), el: sig(el) });
          }
        }, 1200);
      }
    } catch (err) { /* jamais bloquant */ }
  }, true);

  // erreurs : plafond relevé 3 → 5 + promesses rejetées non gérées
  addEventListener('unhandledrejection', function (e) {
    if (errN >= 5) return; errN++;
    try { send('js_error', { m: ('promesse: ' + String((e.reason && (e.reason.message || e.reason)) || '')).slice(0, 120), s: 'promise', l: 0 }); } catch (x) {}
  });

  // messages d'erreur rendus visibles (login, formulaires, panier…)
  var errSeen = {}, errChk = null, uiErrN = 0;
  function scanErr() {
    errChk = null;
    try {
      document.querySelectorAll('[id*="err"],[class*="-err"],[class*="err-"],[class*="error"],[role=alert]').forEach(function (n) {
        if (uiErrN >= 10 || !n.offsetParent) return;
        var t = (n.innerText || '').replace(/\s+/g, ' ').trim();
        if (t.length < 3 || errSeen[t]) return;
        errSeen[t] = 1; uiErrN++;
        send('ui_erreur', { id: sig(n), m: t.slice(0, 140) });
      });
    } catch (e) {}
  }
  try { new MutationObserver(function () { if (!errChk) errChk = setTimeout(scanErr, 600); }).observe(document.documentElement, { subtree: true, childList: true, attributes: true, attributeFilter: ['style', 'class', 'hidden'], characterData: true }); } catch (e) {}

  // champs refusés par la validation native (required, type=email, minlength…)
  var invSeen = {};
  document.addEventListener('invalid', function (e) {
    try {
      var i = e.target, f = i.form, k = (f ? sig(f) : '') + '|' + (i.name || i.id || i.type);
      if (invSeen[k]) return; invSeen[k] = 1;
      send('form_invalide', { f: f ? sig(f) : null, c: (i.name || i.id || i.type || '').slice(0, 30), m: (i.validationMessage || '').slice(0, 80) });
    } catch (x) {}
  }, true);

  // recherche du header (formulaire présent sur toutes les pages)
  document.addEventListener('submit', function (e) {
    try {
      var f = e.target; if (!f || !f.querySelector) return;
      if (/hsearch|ah-search/.test(f.className || '')) {
        var q = (f.querySelector('input[type=search],input[type=text],input:not([type])') || {}).value || '';
        if (q.trim()) send('recherche', { q: q.trim().toLowerCase().slice(0, 80), via: 'header' });
      }
    } catch (x) {}
  }, true);

  // fenêtres modales : vues, fermées sans action, durée d'exposition
  var POPS = ['axsub-bg', 'ali-exit', 'lgp-bg', 'lead-modal', 'cat-lead-pop', 'px-fiche', 'detail-bg', 'filter-drawer', 'cart-drawer', 'equipe-modal'];
  var popOpen = {};
  function isOpen(n) {
    if (!n) return false;
    var cs = getComputedStyle(n), r = n.getBoundingClientRect();
    /* tiroirs fermés = affichés mais translatés HORS écran → exiger un vrai recouvrement du viewport */
    return cs.display !== 'none' && cs.visibility !== 'hidden' && +cs.opacity > 0.05 && r.height > 40
      && Math.min(r.right, innerWidth) - Math.max(r.left, 0) > innerWidth * 0.3
      && Math.min(r.bottom, innerHeight) - Math.max(r.top, 0) > innerHeight * 0.3;
  }
  function scanPops() {
    POPS.forEach(function (id) {
      var n = document.getElementById(id), o = isOpen(n);
      if (o && !popOpen[id]) { popOpen[id] = { t: Date.now(), c: nClic }; send('popup_vu', { id: id }); }
      else if (!o && popOpen[id]) {
        var d = popOpen[id]; delete popOpen[id];
        send('popup_ferme', { id: id, sec: Math.round((Date.now() - d.t) / 1000), clics: nClic - d.c });
      }
    });
  }
  var popChk = null;
  try { new MutationObserver(function () { if (!popChk) popChk = setTimeout(function () { popChk = null; scanPops(); }, 300); }).observe(document.documentElement, { subtree: true, childList: true, attributes: true, attributeFilter: ['class', 'style', 'hidden', 'open'] }); } catch (e) {}

  // vitesse réelle vécue par le visiteur (1×/page, 4 s après le chargement)
  var lcp = 0;
  try { new PerformanceObserver(function (l) { var es = l.getEntries(); if (es.length) lcp = Math.round(es[es.length - 1].startTime); }).observe({ type: 'largest-contentful-paint', buffered: true }); } catch (e) {}
  addEventListener('load', function () {
    setTimeout(function () {
      try {
        var nv = performance.getEntriesByType('navigation')[0] || {};
        var cj = performance.getEntriesByType('resource').filter(function (r) { return /catalogue\.js/.test(r.name); })[0];
        var cn = navigator.connection || {};
        send('perf', {
          ttfb: Math.round(nv.responseStart || 0), dom: Math.round(nv.domContentLoadedEventEnd || 0),
          load: Math.round(nv.loadEventEnd || performance.now()), lcp: lcp,
          cjs: cj ? Math.round(cj.responseEnd) : null, net: cn.effectiveType || null, dl: cn.downlink || null,
        });
      } catch (e) {}
    }, 4000);
  });

  // ── Durée de visite : un ping à la sortie (sendBeacon-like via keepalive) ─
  // 15/10 : + nombre de clics et dernier élément cliqué (où part-on ?)
  var t0 = Date.now();
  var sent = false;
  addEventListener('pagehide', function () {
    if (sent) return;
    sent = true;
    var sec = Math.round((Date.now() - t0) / 1000);
    try { Object.keys(popOpen).forEach(function (id) { send('popup_ferme', { id: id, sec: Math.round((Date.now() - popOpen[id].t) / 1000), sortie: 1 }); }); } catch (e) {}
    if (sec >= 5) send('duree', { sec: Math.min(sec, 3600), depth: maxDepth, clics: nClic, dernier: lastClic });
  });
})();
