// ─────────────────────────────────────────────────────────────────────────────
// Prodi Analytics — compteur maison, données dans NOTRE Supabase (site_events).
// Zéro cookie tiers, zéro service externe : un identifiant aléatoire local
// (localStorage) pour compter les visiteurs uniques, une session par onglet.
//
// Chargé par la vitrine (/) ET le catalogue (/catalogue/). Expose
// window.prodiTrack(event, props) pour les événements métier — toujours
// fire-and-forget : l'analytics ne doit JAMAIS casser ni ralentir le site.
//
// Équipe Prodi : ouvrir une fois paper.prodi.com/?team → l'appareil est marqué
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
    if (errN >= 3 || !e.message) return;
    errN++;
    send('js_error', {
      m: String(e.message).slice(0, 120),
      s: String((e.filename || '').split('/').pop()).slice(0, 40),
      l: e.lineno || 0,
    });
  });

  // ── Durée de visite : un ping à la sortie (sendBeacon-like via keepalive) ─
  var t0 = Date.now();
  var sent = false;
  addEventListener('pagehide', function () {
    if (sent) return;
    sent = true;
    var sec = Math.round((Date.now() - t0) / 1000);
    if (sec >= 5) send('duree', { sec: Math.min(sec, 3600), depth: maxDepth });
  });
})();
