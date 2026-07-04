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

  function send(event, props) {
    try {
      var body = JSON.stringify({
        visitor_id: visitorId,
        session_id: sessionId,
        page: page,
        event: String(event).slice(0, 40),
        props: props || null,
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

  // ── Durée de visite : un ping à la sortie (sendBeacon-like via keepalive) ─
  var t0 = Date.now();
  var sent = false;
  addEventListener('pagehide', function () {
    if (sent) return;
    sent = true;
    var sec = Math.round((Date.now() - t0) / 1000);
    if (sec >= 5) send('duree', { sec: Math.min(sec, 3600) });
  });
})();
