#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Génère les guides métier SEO/GEO de prodi.com (dossier /guides/ + /en/guides/)
sur un gabarit unique (charte des pages pays). UN régime douanier = UN guide,
pour couvrir tous les marchés sans pages dupliquées (anti-doorway).

Régénérable : `python3 scripts/gen_guides.py`. Écrit aussi guides/index.html (hub)
et met à jour sitemap.xml (bloc borné par les marqueurs GUIDES).
"""
import os, re

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
CSS_V, ANALYTICS_V, JS_V = "326", "6", "191"
WA = "https://wa.me/33632096840?text=Welcome%20!"

CSP = ("default-src 'self'; script-src 'self' 'unsafe-inline' https://cdn.jsdelivr.net "
"https://www.googletagmanager.com https://googleads.g.doubleclick.net https://www.googleadservices.com "
"https://challenges.cloudflare.com https://translate.google.com https://translate.googleapis.com "
"https://translate-pa.googleapis.com https://www.gstatic.com; style-src 'self' 'unsafe-inline' "
"https://fonts.googleapis.com https://www.gstatic.com; font-src 'self' https://fonts.gstatic.com; "
"img-src 'self' data: blob: https://stock.prodi.net https://prodi.com https://prodi-paper.github.io "
"https://images.unsplash.com https://www.googletagmanager.com https://googleads.g.doubleclick.net "
"https://www.google.com https://www.google.fr https://www.gstatic.com https://translate.googleapis.com "
"https://translate.google.com; connect-src 'self' https://api.country.is https://bvcgpdoukhcatjibmvnb.supabase.co "
"https://api.emailjs.com https://cdn.jsdelivr.net https://www.googletagmanager.com https://googleads.g.doubleclick.net "
"https://www.google.com https://stats.g.doubleclick.net https://www.google-analytics.com "
"https://region1.google-analytics.com https://analytics.google.com https://region1.analytics.google.com "
"https://www.googleadservices.com https://ad.doubleclick.net https://translate.googleapis.com "
"https://translate-pa.googleapis.com https://www.gstatic.com; frame-src https://challenges.cloudflare.com "
"https://translate.google.com; frame-ancestors 'none'; base-uri 'self'; form-action 'self';")

WA_SVG = ('<svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M17.472 '
'14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 '
'0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 '
'4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 '
'7.403h-.004a9.87 9.87 0 0 1-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 0 '
'1-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 0 1 2.893 '
'6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0 0 12.05 0C5.495 0 .16 5.335.157 '
'11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 0 0 5.683 1.448h.005c6.554 0 '
'11.89-5.335 11.893-11.893a11.821 11.821 0 0 0-3.48-8.413z"/></svg>')

GTAG = """<!-- Google tag (gtag.js) -->
<script async src="https://www.googletagmanager.com/gtag/js?id=AW-18393110999"></script>
<script>
window.dataLayer = window.dataLayer || [];
function gtag(){dataLayer.push(arguments);}
gtag('js', new Date());
gtag('config', 'AW-18393110999');
gtag('config', 'G-KYEHH64T17');
</script>"""

STYLE = """<style>
.geopage{padding-top:64px;}
.geopage .sec-inner{padding-top:14px;padding-bottom:56px;}
.gp-card{border:1px solid var(--border,#e8e8e4);border-radius:20px;padding:24px 26px;background:var(--white,#fff);box-shadow:var(--sh-sm,0 1px 2px rgba(0,0,0,.04));}
.gp-card h3{font-family:'DM Sans',sans-serif;font-size:18px;font-weight:700;color:var(--ink,#222);margin:0 0 10px;}
.gp-card p{font-size:14.5px;line-height:1.6;color:var(--g1,#515154);margin:0 0 8px;}
.gp-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(258px,1fr));gap:18px;margin-top:6px;}
.gp-faq{max-width:820px;margin-top:4px;}
.gp-faq details{border-bottom:1px solid var(--hairline,#e0e0e5);}
.gp-faq summary{font-family:'DM Sans',sans-serif;font-size:16px;font-weight:600;color:var(--ink,#222);padding:18px 0;cursor:pointer;list-style:none;display:flex;justify-content:space-between;align-items:center;gap:16px;}
.gp-faq summary::-webkit-details-marker{display:none;}
.gp-faq summary::after{content:'+';font-size:22px;color:var(--g3,#86868b);font-weight:400;line-height:1;}
.gp-faq details[open] summary::after{content:'\\2013';}
.gp-faq details p{font-size:14.5px;line-height:1.65;color:var(--g1,#515154);margin:-2px 0 18px;max-width:760px;}
.gp-cta{text-align:center;padding:52px 24px 8px;}
.gp-cta h2{font-family:'Bebas Neue',sans-serif;font-size:clamp(30px,5vw,46px);color:var(--ink,#222);margin:0 0 10px;letter-spacing:.5px;}
.gp-cta p{font-size:15px;color:var(--g2,#6e6e73);margin:0 auto 22px;max-width:520px;}
.gp-wa{display:inline-flex;align-items:center;gap:8px;background:#25D366;color:#fff;font-family:'DM Sans',sans-serif;font-weight:700;font-size:14.5px;text-decoration:none;padding:12px 22px;border-radius:999px;}
.gp-links{margin-top:34px;font-size:13.5px;color:var(--g2,#6e6e73);}
.gp-links a{color:var(--ink,#222);font-weight:600;text-decoration:none;}
.gp-links a:hover{text-decoration:underline;}
.gd-steps{max-width:820px;counter-reset:gd;}
.gd-step{position:relative;padding:22px 0 22px 64px;border-bottom:1px solid var(--hairline,#e0e0e5);counter-increment:gd;}
.gd-step::before{content:counter(gd);position:absolute;left:0;top:22px;width:42px;height:42px;border-radius:50%;background:var(--ink,#222);color:#fff;font-family:'DM Sans',sans-serif;font-weight:800;font-size:19px;display:flex;align-items:center;justify-content:center;}
.gd-step h3{font-family:'DM Sans',sans-serif;font-size:18.5px;font-weight:700;color:var(--ink,#222);margin:0 0 8px;}
.gd-step p{font-size:14.8px;line-height:1.68;color:var(--g1,#515154);margin:0 0 8px;max-width:720px;}
.gd-step ul{margin:6px 0 8px;padding-left:20px;}
.gd-step li{font-size:14.5px;line-height:1.6;color:var(--g1,#515154);margin-bottom:4px;}
.gd-note{background:var(--off,#f5f5f3);border:1px solid var(--border,#e8e8e4);border-radius:14px;padding:14px 18px;font-size:13.8px;line-height:1.6;color:var(--g1,#515154);margin-top:10px;max-width:720px;}
.gd-note b{color:var(--ink,#222);}
.gh-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(300px,1fr));gap:18px;margin-top:8px;}
.gh-card{display:block;border:1px solid var(--border,#e8e8e4);border-radius:20px;padding:24px 26px;background:var(--white,#fff);box-shadow:var(--sh-sm,0 1px 2px rgba(0,0,0,.04));text-decoration:none;transition:box-shadow .15s,transform .15s;}
.gh-card:hover{box-shadow:var(--sh-md,0 6px 20px rgba(0,0,0,.08));transform:translateY(-2px);}
.gh-tag{font-size:12px;font-weight:700;text-transform:uppercase;letter-spacing:.06em;color:var(--red,#FE0000);}
.gh-card h3{font-family:'DM Sans',sans-serif;font-size:18px;font-weight:700;color:var(--ink,#222);margin:6px 0 8px;}
.gh-card p{font-size:14.3px;line-height:1.55;color:var(--g1,#515154);margin:0;}
</style>"""

def header(lang):
    if lang == "en":
        return """<header class="hd">
  <div class="hd-inner">
    <div class="hd-logo" onclick="location.href='/en/'"><img src="/img/logo.png" alt="Prodiconseil" width="196" height="32"></div>
    <nav class="hd-nav">
      <a href="/catalogue/" id="nav-catalogue" onclick="openCatalogue();return false;">Catalogue</a>
      <a href="/en/">Products</a>
      <a href="/">\U0001F1EB\U0001F1F7 Français</a>
    </nav>
    <div class="hd-divider"></div>
    <a href="mailto:ethan@prodi.com" class="btn-cat">Contact →</a>
  </div>
</header>"""
    return """<header class="hd">
  <div class="hd-inner">
    <div class="hd-logo" onclick="location.href='/'"><img src="/img/logo.png" alt="Prodiconseil" width="196" height="32"></div>
    <nav class="hd-nav">
      <a href="/catalogue/" id="nav-catalogue" onclick="openCatalogue();return false;">Catalogue</a>
      <a href="/produits/">Produits</a>
      <a href="/histoire/">Histoire</a>
    </nav>
    <div class="hd-divider"></div>
    <a href="/contact/" class="btn-cat">Contact →</a>
  </div>
</header>"""

SOCIAL = """      <div class="ft2-social">
        <a href="https://www.youtube.com/channel/UCKYWPjnXzOUMx6zT2KyEJdw" target="_blank" rel="noopener noreferrer" aria-label="YouTube" title="YouTube" onclick="window.prodiTrack?.('social_click',{r:'youtube'})"><svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="5.5" width="20" height="13" rx="3.5"/><path d="M10 9.2l5 2.8-5 2.8z" fill="currentColor" stroke="none"/></svg></a>
        <a href="https://www.tiktok.com/@prodiconseil" target="_blank" rel="noopener noreferrer" aria-label="TikTok" title="TikTok" onclick="window.prodiTrack?.('social_click',{r:'tiktok'})"><svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor"><path d="M16.6 2h-3.1v13.4a2.9 2.9 0 1 1-2.9-2.9c.3 0 .6 0 .9.1V9.4a6.2 6.2 0 0 0-.9-.06 6.06 6.06 0 1 0 6.06 6.06V8.9A7.6 7.6 0 0 0 21 10.2V7.1a4.8 4.8 0 0 1-4.4-5.1z"/></svg></a>
        <a href="https://www.facebook.com/profile.php?id=61590755904742" target="_blank" rel="noopener noreferrer" aria-label="Facebook" title="Facebook" onclick="window.prodiTrack?.('social_click',{r:'facebook'})"><svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor"><path d="M13.5 21v-7.4h2.5l.4-2.9h-2.9V8.8c0-.84.23-1.4 1.44-1.4h1.54V4.8c-.27-.04-1.18-.11-2.24-.11-2.22 0-3.74 1.35-3.74 3.84v2.14H8v2.9h2.5V21z"/></svg></a>
        <a href="https://www.instagram.com/prodiconseil.paper" target="_blank" rel="noopener noreferrer" aria-label="Instagram" title="Instagram" onclick="window.prodiTrack?.('social_click',{r:'instagram'})"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="5"/><circle cx="12" cy="12" r="4"/><circle cx="17.2" cy="6.8" r="0.6" fill="currentColor" stroke="none"/></svg></a>
        <a href="https://www.linkedin.com/company/prodiconseil-paper/" target="_blank" rel="noopener noreferrer" aria-label="LinkedIn" title="LinkedIn" onclick="window.prodiTrack?.('social_click',{r:'linkedin'})"><svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor"><path d="M4.98 3.5a2.1 2.1 0 1 1 0 4.2 2.1 2.1 0 0 1 0-4.2zM3.2 9.2h3.6V21H3.2zM9.1 9.2h3.4v1.6h.05c.47-.9 1.63-1.85 3.36-1.85 3.6 0 4.26 2.37 4.26 5.45V21h-3.6v-5.9c0-1.4-.02-3.2-1.95-3.2-1.96 0-2.26 1.53-2.26 3.1V21H9.1z"/></svg></a>
      </div>"""

def footer(lang):
    if lang == "en":
        return f"""<footer>
  <div class="ft2-grid">
    <div class="ft2-brand">
      <a href="/en/"><img src="/img/logo.png" alt="Prodiconseil" width="170" height="28"></a>
      <p class="ft2-tag">International paper &amp; board merchant since 1991.</p>
{SOCIAL}
    </div>
    <div class="ft2-col">
      <div class="ft2-h">Our papers</div>
      <a href="/en/offset-paper/">Offset paper</a>
      <a href="/en/coated-paper/">Coated paper</a>
      <a href="/en/kraft-paper/">Kraft paper</a>
      <a href="/en/coated-board/">Coated board</a>
    </div>
    <div class="ft2-col ft2-col-zones">
      <div class="ft2-h">Markets</div>
      <a href="/en/nigeria/">Nigeria</a>
      <a href="/en/ghana/">Ghana</a>
      <a href="/en/kenya/">Kenya</a>
      <a href="/maroc/">Maghreb &amp; francophone Africa</a>
    </div>
    <div class="ft2-col">
      <div class="ft2-h">Contact us</div>
      <a href="{WA}" target="_blank" rel="noopener noreferrer">WhatsApp</a>
      <a href="tel:+33632096840">+33 6 32 09 68 40</a>
      <a href="mailto:ethan@prodi.com">ethan@prodi.com</a>
    </div>
  </div>
  <div class="ft2-bottom">© 2026 Prodiconseil · Paper &amp; board stock · Warehouse Amiens, France — 14,000 m² · <a href="/confidentialite/" style="color:inherit">Privacy</a> · <a href="/">Site en français</a></div>
</footer>"""
    markets = " ".join(f'<a href="/{s}/">{n}</a>' for s, n in [
        ("algerie","Algérie"),("maroc","Maroc"),("tunisie","Tunisie"),("libye","Libye"),
        ("mauritanie","Mauritanie"),("egypte","Égypte"),("senegal","Sénégal"),
        ("cote-d-ivoire","Côte d'Ivoire"),("mali","Mali"),("burkina-faso","Burkina Faso"),
        ("guinee","Guinée"),("benin","Bénin"),("togo","Togo"),("cameroun","Cameroun"),
        ("gabon","Gabon"),("congo","Congo"),("rd-congo","RD Congo"),("tchad","Tchad"),
        ("djibouti","Djibouti"),("kenya","Kenya"),("madagascar","Madagascar"),("liban","Liban"),
        ("turquie","Turquie"),("pologne","Pologne"),("hongrie","Hongrie"),("roumanie","Roumanie"),
        ("bulgarie","Bulgarie"),("serbie","Serbie")])
    return f"""<footer>
  <div class="ft2-grid">
    <div class="ft2-brand">
      <a href="/"><img src="/img/logo.png" alt="Prodiconseil" width="170" height="28"></a>
      <p class="ft2-tag">Négociant international en papier &amp; carton depuis 1991.</p>
{SOCIAL}
    </div>
    <div class="ft2-col">
      <div class="ft2-h">Nos papiers</div>
      <a href="/offset/">Papier offset</a>
      <a href="/papier-couche/">Papier couché</a>
      <a href="/kraft/">Papier kraft</a>
      <a href="/carton-couche/">Carton couché</a>
    </div>
    <div class="ft2-col ft2-col-zones">
      <div class="ft2-h">Zones desservies</div>
      <a href="/maroc/">Maghreb</a>
      <a href="/senegal/">Afrique de l'Ouest</a>
      <a href="/cameroun/">Afrique centrale</a>
      <a href="/kenya/">Afrique de l'Est &amp; Océan Indien</a>
      <a href="/pologne/">Europe de l'Est</a>
      <a href="/egypte/">Méditerranée orientale &amp; Moyen-Orient</a>
    </div>
    <div class="ft2-col">
      <div class="ft2-h">Nous joindre</div>
      <a href="{WA}" target="_blank" rel="noopener noreferrer">WhatsApp</a>
      <a href="tel:+33632096840">+33 6 32 09 68 40</a>
      <a href="mailto:ethan@prodi.com">ethan@prodi.com</a>
    </div>
  </div>
  <div class="ft2-markets">
    <span class="ft2-mk-h">Nos marchés :</span>
    {markets}
  </div>
  <div class="ft2-bottom">© 2026 Prodiconseil · Stock papier &amp; carton · Dépôt Amiens — 14 000 m² · <a href="/confidentialite/" style="color:inherit">Confidentialité</a></div>
</footer>"""

def gate(lang):
    t = dict(label="Access au stock" if lang=="en" else "Accès au stock",
             close="Close" if lang=="en" else "Fermer",
             code="Access code" if lang=="en" else "Code d'accès",
             confirm="Confirm" if lang=="en" else "Confirmer",
             notyet="Not a customer yet?" if lang=="en" else "Pas encore client ?",
             dest="'mailto:ethan@prodi.com'" if lang=="en" else "'/contact/'")
    return f"""<div id="stock-gate" class="stock-gate" style="display:none" role="dialog" aria-modal="true" aria-label="{t['label']}">
  <div class="stock-gate-overlay" onclick="closeStockGate()"></div>
  <div class="stock-gate-card">
    <button class="stock-gate-close" onclick="closeStockGate()" aria-label="{t['close']}">&times;</button>
    <div class="stock-gate-ico">
      <svg width="34" height="34" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><rect x="4" y="10.5" width="16" height="10.5" rx="2.6"/><path d="M8 10.5V7a4 4 0 0 1 8 0v3.5"/></svg>
    </div>
    <form onsubmit="submitStockGate(event)">
      <input type="text" id="stock-gate-code" placeholder="{t['code']}" autocomplete="off" spellcheck="false" autocapitalize="off">
      <div id="stock-gate-err" class="stock-gate-err"></div>
      <button type="submit" class="stock-gate-btn">{t['confirm']}</button>
    </form>
    <button type="button" class="stock-gate-contact" onclick="window.prodiTrack?.('gate_contact');closeStockGate();location.href={t['dest']}">{t['notyet']}</button>
  </div>
</div>"""

SCRIPTS = f"""<script src="/analytics.js?v={ANALYTICS_V}"></script>
<script src="/vitrine.js?v={JS_V}"></script>
<a href="{WA}" target="_blank" rel="noopener noreferrer" class="wa-sticky" title="WhatsApp" aria-label="WhatsApp">
  <svg width="26" height="26" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 0 1-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 0 1-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 0 1 2.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0 0 12.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 0 0 5.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 0 0-3.48-8.413z"/></svg>
</a>"""

def esc_json(s):
    return s.replace("\\", "\\\\").replace('"', '\\"')

def render(g):
    url = f"https://prodi.com/{g['slug']}/"
    faq_json = ",\n    ".join(
        '{"@type": "Question", "name": "%s", "acceptedAnswer": {"@type": "Answer", "text": "%s"}}'
        % (esc_json(q), esc_json(a)) for q, a in g["faq"])
    crumbs = "".join(
        '\n    {"@type": "ListItem", "position": %d, "name": "%s", "item": "%s"},' % (i+1, esc_json(n), u)
        for i, (n, u) in enumerate(g["crumbs"]))
    crumbs = crumbs.rstrip(",")
    steps_html = "\n".join(
        f'        <div class="gd-step">\n          <h3>{h}</h3>\n{body}\n        </div>'
        for h, body in g["steps"])
    faq_html = "\n".join(
        f'        <details>\n          <summary>{q}</summary>\n          <p>{a}</p>\n        </details>'
        for q, a in g["faq"])
    T = g["t"]
    return f"""<!DOCTYPE html>
<html lang="{g['lang']}">
<head>
{GTAG}

<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<meta http-equiv="Content-Security-Policy" content="{CSP}">
<meta http-equiv="X-Content-Type-Options" content="nosniff">
<meta name="referrer" content="strict-origin-when-cross-origin">
<link rel="icon" type="image/png" href="/img/panda.png">
<title>{g['title']}</title>
<meta name="description" content="{g['desc']}">
<meta name="robots" content="index, follow">
<link rel="canonical" href="{url}">
<meta property="og:type" content="article">
<meta property="og:site_name" content="Prodiconseil">
<meta property="og:locale" content="{'en_US' if g['lang']=='en' else 'fr_FR'}">
<meta property="og:url" content="{url}">
<meta property="og:title" content="{g['og']}">
<meta property="og:description" content="{g['desc']}">
<meta property="og:image" content="https://prodi.com/img/og-card.jpg">
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:title" content="{g['og']}">
<meta name="twitter:description" content="{g['desc']}">
<meta name="twitter:image" content="https://prodi.com/img/og-card.jpg">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Bebas+Neue&family=Oswald:wght@600;700&family=DM+Sans:wght@300;400;500;600;700;800&family=Space+Grotesk:wght@300;400;500;600;700&display=swap" rel="stylesheet">
<link rel="stylesheet" href="/vitrine.css?v={CSS_V}">
<script type="application/ld+json">
{{
  "@context": "https://schema.org",
  "@type": "BreadcrumbList",
  "itemListElement": [{crumbs}
  ]
}}
</script>
<script type="application/ld+json">
{{
  "@context": "https://schema.org",
  "@type": "Article",
  "headline": "{esc_json(g['og'])}",
  "description": "{esc_json(g['desc'])}",
  "author": {{"@type": "Organization", "name": "Prodiconseil", "url": "https://prodi.com/"}},
  "publisher": {{"@type": "Organization", "name": "Prodiconseil", "logo": {{"@type": "ImageObject", "url": "https://prodi.com/img/logo.png"}}}},
  "image": "https://prodi.com/img/og-card.jpg",
  "mainEntityOfPage": "{url}",
  "inLanguage": "{g['lang']}"
}}
</script>
<script type="application/ld+json">
{{
  "@context": "https://schema.org",
  "@type": "FAQPage",
  "mainEntity": [
    {faq_json}
  ]
}}
</script>
</head>
<body class="souspage">
{'<script>try{sessionStorage.setItem("prodi_trad_seen","1")}catch(e){}</script>' if g['lang']=='en' else ''}
{header(g['lang'])}

{STYLE}

<main class="geopage">
  <div class="page-head">
    <h1 class="page-h1">{g['h1']}</h1>
    <p class="page-sub">{g['sub']}</p>
  </div>

  <section class="habt-sec">
    <div class="sec-inner">
      <h2 class="sec-h">{T['steps_h']}</h2>
      <p class="habt-lead">{g['lead']}</p>
      <div class="gd-steps">
{steps_html}
      </div>
    </div>
  </section>

  <section class="habt-sec">
    <div class="sec-inner">
      <h2 class="sec-h">{g['cost_h']}</h2>
      <p class="habt-lead">{g['cost_lead']}</p>
      <div class="gp-grid">
{g['cost_cards']}
      </div>
      <div class="gd-note" style="margin-top:18px;">{g['cost_note']}</div>
    </div>
  </section>

  <section class="habt-sec">
    <div class="sec-inner">
      <h2 class="sec-h">{T['faq_h']}</h2>
      <div class="gp-faq">
{faq_html}
      </div>
      <p class="gp-links">{g['links']}</p>
    </div>
  </section>

  <section class="gp-cta">
    <h2>{g['cta_h']}</h2>
    <p>{g['cta_p']}</p>
    <div class="gp-cta-btns">
      <a href="{'mailto:ethan@prodi.com' if g['lang']=='en' else '/contact/'}" class="btn-cat">{T['cta_btn']}</a>
      <a class="gp-wa" href="{WA}" target="_blank" rel="noopener noreferrer">{WA_SVG} WhatsApp</a>
    </div>
  </section>
</main>

{footer(g['lang'])}

{gate(g['lang'])}

{SCRIPTS}

</body>
</html>
"""

# ── Textes d'interface par langue ──
TFR = dict(steps_h="LES ÉTAPES D'UN IMPORT RÉUSSI", faq_h="QUESTIONS FRÉQUENTES", cta_btn="Demander une offre →")
TEN = dict(steps_h="THE STEPS TO A SUCCESSFUL IMPORT", faq_h="FREQUENTLY ASKED QUESTIONS", cta_btn="Request an offer →")

# ── Étapes réutilisables (FR) ──
S1 = ("Définissez précisément votre besoin",
"""          <p>Un fournisseur sérieux vous demandera toujours : la <b>qualité</b> (offset, couché, kraft, carton…), le <b>grammage</b> (g/m²), la <b>présentation</b> (bobine ou format, avec laize ou dimensions) et le <b>tonnage</b>. Plus la demande est précise, plus l'offre arrive vite — et plus le prix est juste.</p>
          <div class="gd-note"><b>Conseil :</b> demandez des photos réelles du stock et les références exactes. C'est la meilleure protection contre les mauvaises surprises à l'arrivée.</div>""")
def S2(port):
    return ("Choisissez votre incoterm",
f"""          <p>L'incoterm définit qui paie et qui est responsable de chaque tronçon du transport :</p>
          <ul>
            <li><b>EXW</b> (départ dépôt) : vous maîtrisez tout avec votre transitaire — souvent le meilleur prix marchandise.</li>
            <li><b>FOB</b> (port européen) : le vendeur amène la marchandise au port et la charge ; vous gérez le transport principal.</li>
            <li><b>CIF</b> ({port}) : le vendeur gère aussi le fret et l'assurance jusqu'au point de destination.</li>
          </ul>
          <div class="gd-note"><b>Piège classique :</b> comparer un prix EXW d'un fournisseur avec un prix CIF d'un autre. Ramenez toujours les offres au même incoterm avant de décider.</div>""")
S6 = ("Réception : contrôlez avant de signer",
"""          <p>Au dépotage, vérifiez l'état des bobines et palettes, comptez les unités et rapprochez-les de la liste de colisage. Toute réserve doit être notée immédiatement sur le bon de livraison pour être opposable. Un fournisseur qui vend sur photos réelles et références précises vous évite l'essentiel des litiges.</p>""")

COST_CARDS_FR = lambda port: f"""        <div class="gp-card"><h3>1. La marchandise</h3><p>Prix par tonne selon qualité, grammage et présentation. Les <a href="/catalogue/" onclick="openCatalogue();return false;" style="color:inherit">lots de stock</a> et stocklots offrent les meilleures opportunités — jusqu'à 30 % sous le prix usine.</p></div>
        <div class="gp-card"><h3>2. La logistique</h3><p>Pré-acheminement, fret et assurance jusqu'à {port}. Mutualisés sur un conteneur complet, ils pèsent souvent moins qu'on ne le craint à la tonne.</p></div>
        <div class="gp-card"><h3>3. Douane &amp; taxes</h3><p>Droits de douane (selon le régime, voir plus haut), TVA à l'import, frais de transitaire et de passage portuaire.</p></div>
        <div class="gp-card"><h3>4. Le dernier kilomètre</h3><p>Transport local du point d'entrée à votre atelier ou entrepôt.</p></div>"""

GUIDES = []

# ═══════════════ ALGÉRIE ═══════════════
GUIDES.append(dict(
    slug="guides/importer-papier-algerie", lang="fr", t=TFR,
    title="Comment importer du papier en Algérie — guide (domiciliation, douane, EUR.1) | Prodiconseil",
    desc="Le guide de l'import de papier &amp; carton en Algérie : domiciliation bancaire, régime préférentiel Algérie–UE et EUR.1, DAPS, ports d'Alger et Oran, documents et pièges. Par un négociant français depuis 1991.",
    og="Comment importer du papier en Algérie — guide pratique",
    crumbs=[("Accueil","https://prodi.com/"),("Papier &amp; carton en Algérie","https://prodi.com/algerie/"),("Guide : importer en Algérie","https://prodi.com/guides/importer-papier-algerie/")],
    h1="Comment importer du papier en Algérie",
    sub="Le guide pratique : domiciliation bancaire, régime préférentiel Algérie–UE, ports d'Alger et Oran, documents et pièges à éviter — par un négociant français qui exporte vers l'Algérie depuis 1991.",
    lead="L'Algérie a ses règles propres, plus encadrées que le reste du Maghreb. En les anticipant, l'import se passe sans accroc. Voici la mécanique.",
    steps=[S1, S2("Alger, Oran ou Béjaïa"),
      ("Ouvrez la domiciliation bancaire — avant tout",
"""          <p>C'est <b>la spécificité algérienne</b> : toute importation doit être <b>domiciliée auprès d'une banque algérienne</b> AVANT l'expédition. La banque ouvre un dossier de domiciliation qui accompagne toute l'opération.</p>
          <ul>
            <li>Facture commerciale (proforma puis définitive) et liste de colisage ;</li>
            <li><b>Certificat EUR.1</b> pour le régime préférentiel Algérie–UE ;</li>
            <li>Certificat d'origine et connaissement maritime (bill of lading).</li>
          </ul>
          <div class="gd-note"><b>À anticiper :</b> les règles d'importation algériennes évoluent régulièrement (licences, restrictions selon les produits). Vérifiez toujours le régime en vigueur avec votre banque et votre transitaire avant de commander.</div>"""),
      ("La douane : EUR.1 et droits additionnels",
"""          <p>Grâce à l'accord d'association <b>Algérie–Union européenne</b>, les produits industriels d'origine UE — dont le papier et le carton — bénéficient d'un régime préférentiel : avec un <b>certificat EUR.1</b> en règle, les droits de douane sont réduits, souvent supprimés.</p>
          <p>Restent à prévoir la <b>TVA à l'import</b> et, selon les produits, un <b>droit additionnel provisoire de sauvegarde (DAPS)</b> que l'Algérie applique à de nombreuses marchandises. Votre transitaire confirme le taux applicable à votre référence.</p>
          <div class="gd-note"><b>À vérifier :</b> l'EUR.1 doit être émis par le fournisseur AVANT l'expédition et voyager avec le dossier. Sans lui, vous payez les droits pleins.</div>"""),
      ("Le transport : ports d'Alger, Oran, Béjaïa",
"""          <p>Le papier voyage en conteneur complet. Les rotations depuis les ports européens vers <b>Alger</b>, <b>Oran</b>, <b>Béjaïa</b>, <b>Skikda</b> ou <b>Mostaganem</b> sont fréquentes ; le transit maritime est court. Un 20 pieds charge 24 à 26 tonnes de papier — c'est le poids qui limite.</p>
          <p>Comptez généralement <b>2 à 4 semaines porte à porte</b> pour de la marchandise en stock, dossier de domiciliation en règle.</p>"""),
      S6],
    cost_h="LE VRAI COÛT D'UN PAPIER RENDU ALGÉRIE", cost_lead="Le prix au départ ne dit pas tout. Le coût rendu se compose de :",
    cost_cards=COST_CARDS_FR("Alger ou Oran"),
    cost_note="<b>Notre conseil :</b> ouvrez la domiciliation dès la proforma validée et demandez l'EUR.1 systématiquement — ce sont les deux points qui bloquent le plus souvent les imports vers l'Algérie.",
    faq=[
      ("La domiciliation bancaire est-elle obligatoire pour importer en Algérie ?","Oui. Toute importation doit être domiciliée auprès d'une banque algérienne avant l'expédition : la banque ouvre un dossier de domiciliation qui suit toute l'opération. C'est un préalable incontournable, à lancer dès la facture proforma validée."),
      ("Y a-t-il des droits de douane sur le papier européen en Algérie ?","Grâce à l'accord d'association Algérie–UE, le papier d'origine UE bénéficie d'un régime préférentiel avec un certificat EUR.1 : les droits sont réduits, souvent supprimés. Restent la TVA à l'import et, selon les produits, un droit additionnel de sauvegarde (DAPS)."),
      ("Quels ports desservez-vous en Algérie ?","Principalement Alger, Oran, Béjaïa, Skikda et Mostaganem, avec des rotations fréquentes depuis l'Europe. Nous livrons imprimeurs, transformateurs et distributeurs à Alger, Oran, Constantine, Sétif et dans tout le pays."),
      ("Quel est le délai pour recevoir du papier en Algérie ?","Pour de la marchandise en stock avec un dossier de domiciliation en règle : comptez généralement de deux à quatre semaines porte à porte, transit maritime et dédouanement compris."),
      ("Les règles d'import en Algérie changent-elles souvent ?","Oui, le cadre évolue régulièrement (licences, restrictions selon les produits, taux). C'est pourquoi nous conseillons de confirmer le régime en vigueur avec votre banque et votre transitaire avant chaque commande.")],
    links='\U0001F4D8 Voir aussi : <a href="/algerie/">Papier &amp; carton en Algérie</a> · <a href="/guides/importer-papier-maroc/">Guide Maroc</a> · <a href="/guides/">Tous nos guides</a> · <a href="/logistique/">Notre logistique</a> · <a href="/produits/">Nos produits</a>',
    cta_h="Un projet d'import en Algérie ?", cta_p="Décrivez-nous votre besoin — on vous répond sous 24 h avec une offre et les conseils douaniers adaptés.",
))

# ═══════════════ AFRIQUE DE L'OUEST ═══════════════
GUIDES.append(dict(
    slug="guides/importer-papier-afrique-ouest", lang="fr", t=TFR,
    title="Importer du papier en Afrique de l'Ouest — guide (CEDEAO, TEC, BSC, Dakar, Abidjan) | Prodiconseil",
    desc="Le guide de l'import de papier &amp; carton en Afrique de l'Ouest : tarif extérieur commun CEDEAO, bordereau de suivi (BSC/BESC), hubs de Dakar et Abidjan, pays enclavés, documents et pièges.",
    og="Importer du papier en Afrique de l'Ouest — guide pratique",
    crumbs=[("Accueil","https://prodi.com/"),("Sénégal","https://prodi.com/senegal/"),("Guide : Afrique de l'Ouest","https://prodi.com/guides/importer-papier-afrique-ouest/")],
    h1="Importer du papier en Afrique de l'Ouest",
    sub="Sénégal, Côte d'Ivoire, Mali, Burkina, Bénin, Togo, Guinée : un seul espace douanier (CEDEAO), deux grands hubs portuaires. Le guide pratique par un négociant français qui exporte depuis 1991.",
    lead="Les pays de la CEDEAO partagent un tarif extérieur commun et des règles proches. Maîtriser le bordereau de suivi et le choix du port change tout, surtout pour les pays enclavés.",
    steps=[S1, S2("Dakar, Abidjan ou Lomé"),
      ("Préparez le dossier — dont le bordereau de suivi",
"""          <p>Le jeu documentaire standard, plus une spécificité régionale majeure :</p>
          <ul>
            <li>Facture commerciale et liste de colisage ;</li>
            <li>Certificat d'origine et connaissement maritime (bill of lading) ;</li>
            <li><b>Bordereau électronique de suivi des cargaisons</b> (BSC / BESC selon le pays) — à faire valider AVANT l'embarquement pour la plupart de ces destinations.</li>
          </ul>
          <div class="gd-note"><b>Piège fréquent :</b> le bordereau de suivi non validé avant l'arrivée entraîne des pénalités et des blocages au port. Votre transitaire l'obtient en amont — exigez-le dès l'expédition.</div>"""),
      ("La douane : tarif extérieur commun CEDEAO",
"""          <p>Les États de la CEDEAO appliquent un <b>tarif extérieur commun (TEC)</b> — une grille de droits harmonisée par catégorie de produits. Le papier et le carton relèvent d'une catégorie du TEC ; votre transitaire confirme le taux exact selon la référence.</p>
          <p>S'ajoutent les <b>prélèvements communautaires</b> (prélèvement CEDEAO, redevances UEMOA) et la <b>TVA</b> à l'import selon le pays.</p>
          <div class="gd-note"><b>Bon à savoir :</b> l'accord de partenariat économique UE–Afrique de l'Ouest reste partiel — ne comptez pas sur un droit zéro automatique comme au Maghreb. Chiffrez toujours le coût rendu droits inclus.</div>"""),
      ("Le transport : hubs de Dakar et d'Abidjan",
"""          <p>Deux grandes portes d'entrée : <b>Dakar</b> (Sénégal) et <b>Abidjan</b> (Côte d'Ivoire), complétées par <b>Lomé</b> (Togo), <b>Cotonou</b> (Bénin) et <b>Conakry</b> (Guinée). Les pays enclavés — <b>Mali</b>, <b>Burkina Faso</b> — sont desservis par les corridors routiers Dakar–Bamako et Abidjan–Ouagadougou.</p>
          <p>Pour un pays enclavé, ajoutez le délai et le coût du corridor routier après le port. Nous chiffrons le rendu final selon votre ville.</p>"""),
      S6],
    cost_h="LE VRAI COÛT D'UN PAPIER RENDU AFRIQUE DE L'OUEST", cost_lead="Le prix au départ ne dit pas tout. Le coût rendu se compose de :",
    cost_cards=COST_CARDS_FR("Dakar ou Abidjan"),
    cost_note="<b>Notre conseil :</b> pour un pays enclavé, choisissez le hub (Dakar ou Abidjan) selon votre corridor habituel, et faites valider le bordereau de suivi dès l'expédition.",
    faq=[
      ("Qu'est-ce que le bordereau de suivi des cargaisons (BSC/BESC) ?","C'est un document électronique obligatoire dans la plupart des pays d'Afrique de l'Ouest, à faire valider avant l'embarquement de la marchandise. Sans lui, vous risquez des pénalités et un blocage au port. Votre transitaire l'obtient en amont."),
      ("Y a-t-il des droits de douane sur le papier en Afrique de l'Ouest ?","Les pays de la CEDEAO appliquent un tarif extérieur commun (TEC) par catégorie de produits, auquel s'ajoutent des prélèvements communautaires et la TVA. Contrairement au Maghreb, il n'y a pas de régime préférentiel automatique à droit zéro : chiffrez le coût rendu droits inclus."),
      ("Comment livrer un pays enclavé comme le Mali ou le Burkina Faso ?","Via les grands ports de la région (Dakar, Abidjan, Lomé) puis par corridor routier : Dakar–Bamako pour le Mali, Abidjan–Ouagadougou pour le Burkina. Nous chiffrons le rendu final en tenant compte du transport terrestre après le port."),
      ("Quels ports desservez-vous en Afrique de l'Ouest ?","Principalement Dakar, Abidjan, Lomé, Cotonou et Conakry, avec des rotations régulières depuis l'Europe. Ces hubs desservent aussi les pays enclavés par la route."),
      ("Quel est le délai de livraison en Afrique de l'Ouest ?","Pour un port côtier et de la marchandise en stock : généralement quelques semaines porte à porte. Pour un pays enclavé, ajoutez le délai du corridor routier après le dédouanement au port.")],
    links='\U0001F4D8 Voir aussi : <a href="/senegal/">Sénégal</a> · <a href="/cote-d-ivoire/">Côte d\'Ivoire</a> · <a href="/mali/">Mali</a> · <a href="/guides/">Tous nos guides</a> · <a href="/produits/">Nos produits</a>',
    cta_h="Un projet d'import en Afrique de l'Ouest ?", cta_p="Dites-nous votre pays et votre besoin — offre chiffrée rendue port ou ville sous 24 h.",
))

# ═══════════════ AFRIQUE CENTRALE ═══════════════
GUIDES.append(dict(
    slug="guides/importer-papier-afrique-centrale", lang="fr", t=TFR,
    title="Importer du papier en Afrique centrale — guide (CEMAC, Douala, Pointe-Noire) | Prodiconseil",
    desc="Le guide de l'import de papier &amp; carton en Afrique centrale : tarif CEMAC, ports de Douala et Pointe-Noire, pays enclavés (Tchad), cas de la RDC, bordereau électronique, documents et délais.",
    og="Importer du papier en Afrique centrale — guide pratique",
    crumbs=[("Accueil","https://prodi.com/"),("Cameroun","https://prodi.com/cameroun/"),("Guide : Afrique centrale","https://prodi.com/guides/importer-papier-afrique-centrale/")],
    h1="Importer du papier en Afrique centrale",
    sub="Cameroun, Gabon, Congo, Tchad, RD Congo : la région s'organise autour de quelques grands ports. Le guide pratique par un négociant français qui exporte depuis 1991.",
    lead="En Afrique centrale, le choix du port et l'anticipation du bordereau électronique font gagner des semaines. Voici comment structurer un import propre.",
    steps=[S1, S2("Douala, Pointe-Noire ou Libreville"),
      ("Préparez le dossier — dont le bordereau électronique",
"""          <p>Le jeu documentaire standard, avec la spécificité régionale :</p>
          <ul>
            <li>Facture commerciale et liste de colisage ;</li>
            <li>Certificat d'origine et connaissement maritime (bill of lading) ;</li>
            <li><b>Bordereau électronique de suivi des cargaisons</b> (BESC / BIETC selon le pays) — à valider avant l'embarquement.</li>
          </ul>
          <div class="gd-note"><b>Piège fréquent :</b> le bordereau non validé en amont bloque la marchandise. Faites-le émettre dès l'expédition via votre transitaire.</div>"""),
      ("La douane : tarif CEMAC (et cas de la RDC)",
"""          <p>Les six États de la <b>CEMAC</b> (Cameroun, Gabon, Congo, Tchad, Centrafrique, Guinée équatoriale) appliquent un <b>tarif extérieur commun</b> par catégorie de produits, plus la TVA à l'import. La <b>RD Congo</b>, hors CEMAC, a son propre régime douanier.</p>
          <p>Le papier et le carton relèvent d'une catégorie du tarif ; votre transitaire confirme le taux selon la référence et le pays.</p>
          <div class="gd-note"><b>Bon à savoir :</b> pas de régime préférentiel à droit zéro comme au Maghreb — chiffrez toujours le coût rendu droits inclus.</div>"""),
      ("Le transport : Douala, la porte de la région",
"""          <p><b>Douala</b> (Cameroun) est le grand hub : il dessert le Cameroun mais aussi le <b>Tchad</b> et la Centrafrique, enclavés, par corridor routier. Autres portes d'entrée : <b>Pointe-Noire</b> (Congo), <b>Libreville / Owendo</b> (Gabon) et <b>Matadi</b> (RD Congo).</p>
          <p>Le port de Douala pouvant connaître des délais de dédouanement plus longs, prévoyez une marge sur le planning. Pour le Tchad, ajoutez le corridor routier depuis Douala.</p>"""),
      S6],
    cost_h="LE VRAI COÛT D'UN PAPIER RENDU AFRIQUE CENTRALE", cost_lead="Le prix au départ ne dit pas tout. Le coût rendu se compose de :",
    cost_cards=COST_CARDS_FR("Douala ou Pointe-Noire"),
    cost_note="<b>Notre conseil :</b> anticipez le bordereau électronique et prévoyez une marge de délai sur Douala — ce sont les deux points qui rallongent le plus souvent les imports en Afrique centrale.",
    faq=[
      ("Quels pays couvre la CEMAC pour l'import de papier ?","La CEMAC regroupe le Cameroun, le Gabon, le Congo, le Tchad, la Centrafrique et la Guinée équatoriale, avec un tarif extérieur commun. La RD Congo, elle, est hors CEMAC et applique son propre régime douanier."),
      ("Par quel port passer pour l'Afrique centrale ?","Douala (Cameroun) est le principal hub et dessert aussi le Tchad et la Centrafrique par la route. On utilise aussi Pointe-Noire (Congo), Libreville/Owendo (Gabon) et Matadi (RD Congo) selon la destination."),
      ("Le bordereau électronique est-il obligatoire ?","Oui, la plupart des pays d'Afrique centrale exigent un bordereau électronique de suivi des cargaisons (BESC/BIETC) validé avant l'embarquement. Sans lui, la marchandise est bloquée à l'arrivée."),
      ("Comment livrer le Tchad, pays enclavé ?","Le Tchad est desservi via le port de Douala puis par corridor routier. Nous chiffrons le rendu final en tenant compte de ce transport terrestre après le dédouanement."),
      ("Quels sont les délais en Afrique centrale ?","Comptez le transit maritime jusqu'au port, un dédouanement qui peut être plus long à Douala, puis éventuellement un corridor routier pour un pays enclavé. Nous donnons une estimation réaliste selon votre ville.")],
    links='\U0001F4D8 Voir aussi : <a href="/cameroun/">Cameroun</a> · <a href="/gabon/">Gabon</a> · <a href="/rd-congo/">RD Congo</a> · <a href="/guides/">Tous nos guides</a> · <a href="/produits/">Nos produits</a>',
    cta_h="Un projet d'import en Afrique centrale ?", cta_p="Indiquez-nous votre pays et votre besoin — offre chiffrée rendue port ou ville sous 24 h.",
))

# ═══════════════ EUROPE (INTRA-UE) ═══════════════
GUIDES.append(dict(
    slug="guides/acheter-papier-europe", lang="fr", t=TFR,
    title="Acheter du papier en Europe — livraison UE sans douane (TVA intracommunautaire) | Prodiconseil",
    desc="Le guide de l'achat de papier &amp; carton en Europe : livraison par camion sans douane dans l'UE, TVA intracommunautaire, délais courts, cas des Balkans hors UE. Par un négociant français depuis 1991.",
    og="Acheter du papier en Europe — livraison UE sans douane",
    crumbs=[("Accueil","https://prodi.com/"),("Pologne","https://prodi.com/pologne/"),("Guide : acheter en Europe","https://prodi.com/guides/acheter-papier-europe/")],
    h1="Acheter du papier en Europe",
    sub="Pologne, Roumanie, Bulgarie, Hongrie et toute l'UE : livraison par camion, sans douane, en quelques jours. Le guide pratique par un négociant français qui livre l'Europe depuis 1991.",
    lead="Acheter dans l'Union européenne, c'est le circuit le plus simple : pas de douane, pas de maritime, une livraison routière rapide. Voici comment ça marche.",
    steps=[S1,
      ("Choisissez l'incoterm — souvent en camion complet",
"""          <p>En Europe, la marchandise part généralement par la <b>route</b> en camion complet. Les incoterms usuels :</p>
          <ul>
            <li><b>EXW</b> (départ dépôt) : vous organisez l'enlèvement avec votre transporteur.</li>
            <li><b>FCA / CPT</b> : le vendeur charge et/ou achemine jusqu'à un point convenu.</li>
            <li><b>DAP</b> (rendu chez vous) : le vendeur livre directement à votre atelier — le plus simple pour l'acheteur.</li>
          </ul>
          <div class="gd-note"><b>Astuce :</b> sur un plein camion (24–25 t), le coût de transport à la tonne devient très compétitif — souvent l'option la plus rentable pour l'Europe de l'Est.</div>"""),
      ("Aucune douane : la TVA intracommunautaire",
"""          <p>C'est le grand avantage : à l'intérieur de l'Union européenne, la marchandise circule <b>librement, sans droits de douane ni dédouanement</b>. Il n'y a pas de certificat d'origine à prévoir.</p>
          <p>Sur le plan fiscal, la livraison est traitée en <b>TVA intracommunautaire</b> : avec un <b>numéro de TVA valide</b>, la facture part hors taxe et vous autoliquidez la TVA dans votre pays. C'est tout.</p>
          <div class="gd-note"><b>À prévoir :</b> communiquez votre numéro de TVA intracommunautaire dès la commande. Un numéro invalide ou manquant oblige à facturer la TVA française.</div>"""),
      ("Le transport : par la route, en quelques jours",
"""          <p>Pas de port ni de conteneur : le papier part en <b>camion</b> depuis notre dépôt et arrive directement chez vous. Vers la <b>Pologne</b>, la <b>Roumanie</b>, la <b>Bulgarie</b>, la <b>Hongrie</b> et l'Europe centrale, le délai se compte généralement en <b>quelques jours</b>.</p>
          <div class="gd-note"><b>Balkans hors UE :</b> pour la <b>Serbie</b> (et autres pays hors Union), on repasse en régime d'export avec dédouanement — un <b>certificat EUR.1</b> ouvre alors le régime préférentiel de l'accord d'association. Nous gérons les deux cas.</div>"""),
      ("Réception : contrôlez la livraison",
"""          <p>À la réception du camion, vérifiez l'état des bobines et palettes et comptez les unités face à la lettre de voiture (CMR). Toute réserve se note immédiatement sur le CMR pour être opposable.</p>""")],
    cost_h="LE VRAI COÛT D'UN PAPIER RENDU EN EUROPE", cost_lead="En Europe, le coût rendu est simple — pas de douane à intégrer :",
    cost_cards="""        <div class="gp-card"><h3>1. La marchandise</h3><p>Prix par tonne selon qualité, grammage et présentation. Les <a href="/catalogue/" onclick="openCatalogue();return false;" style="color:inherit">lots de stock</a> et stocklots offrent les meilleures opportunités — jusqu'à 30 % sous le prix usine.</p></div>
        <div class="gp-card"><h3>2. Le transport routier</h3><p>Un plein camion (24–25 t) mutualise le coût à la tonne. Livraison directe à votre atelier possible (incoterm DAP).</p></div>
        <div class="gp-card"><h3>3. La TVA</h3><p>Autoliquidée dans votre pays avec un numéro de TVA intracommunautaire valide. Aucun droit de douane dans l'UE.</p></div>
        <div class="gp-card"><h3>4. Rien d'autre</h3><p>Pas de passage portuaire, pas de transitaire maritime, pas de certificat d'origine : le circuit le plus léger.</p></div>""",
    cost_note="<b>Notre conseil :</b> visez le camion complet et transmettez votre numéro de TVA dès la commande — c'est ce qui rend l'achat en Europe aussi simple et compétitif.",
    faq=[
      ("Y a-t-il des droits de douane pour acheter du papier dans l'UE ?","Non. À l'intérieur de l'Union européenne, la marchandise circule librement, sans droits de douane ni dédouanement. Seule s'applique la TVA, traitée en intracommunautaire."),
      ("Comment fonctionne la TVA sur un achat intra-UE ?","Avec un numéro de TVA intracommunautaire valide, la facture part hors taxe et vous autoliquidez la TVA dans votre pays. Sans numéro valide, la TVA française s'applique."),
      ("Quel est le délai de livraison vers l'Europe de l'Est ?","La marchandise part par la route en camion. Vers la Pologne, la Roumanie, la Bulgarie ou la Hongrie, le délai se compte généralement en quelques jours — bien plus rapide qu'un transport maritime."),
      ("Livrez-vous en Serbie et dans les Balkans hors UE ?","Oui. Pour les pays hors Union (comme la Serbie), on repasse en régime d'export avec dédouanement ; un certificat EUR.1 ouvre le régime préférentiel de l'accord d'association. Nous gérons ce cas comme l'intra-UE."),
      ("Peut-on être livré directement à l'atelier ?","Oui, en incoterm DAP le camion livre directement à votre adresse. Sur un plein chargement, c'est souvent l'option la plus simple et la plus rentable.")],
    links='\U0001F4D8 Voir aussi : <a href="/pologne/">Pologne</a> · <a href="/roumanie/">Roumanie</a> · <a href="/hongrie/">Hongrie</a> · <a href="/guides/">Tous nos guides</a> · <a href="/produits/">Nos produits</a>',
    cta_h="Un besoin de papier en Europe ?", cta_p="Envoyez votre demande — offre rendue chez vous (DAP) sous 24 h, livraison par camion en quelques jours.",
))

# ═══════════════ TURQUIE ═══════════════
GUIDES.append(dict(
    slug="guides/importer-papier-turquie", lang="fr", t=TFR,
    title="Importer du papier en Turquie — guide (union douanière UE, document A.TR) | Prodiconseil",
    desc="Le guide de l'import de papier &amp; carton en Turquie : union douanière UE–Turquie, document A.TR (et non EUR.1), ports d'Istanbul et Mersin, documents et délais. Par un négociant français depuis 1991.",
    og="Importer du papier en Turquie — guide pratique",
    crumbs=[("Accueil","https://prodi.com/"),("Turquie","https://prodi.com/turquie/"),("Guide : importer en Turquie","https://prodi.com/guides/importer-papier-turquie/")],
    h1="Importer du papier en Turquie",
    sub="La Turquie et l'UE forment une union douanière pour les produits industriels : pas de droits sur le papier, avec le bon document. Le guide pratique par un négociant français depuis 1991.",
    lead="La Turquie a un statut particulier : union douanière avec l'UE. Le papier européen y entre sans droits — à condition d'utiliser le bon certificat. Voici l'essentiel.",
    steps=[S1, S2("Istanbul, Mersin ou Izmir"),
      ("Préparez le dossier — avec le document A.TR",
"""          <p>Le point clé turc : ce n'est <b>pas l'EUR.1</b> mais le certificat <b>A.TR</b> qui ouvre le régime de l'union douanière. Le dossier :</p>
          <ul>
            <li>Facture commerciale et liste de colisage ;</li>
            <li><b>Certificat A.TR</b> (certificat de circulation) — atteste que la marchandise est en libre pratique dans l'UE ;</li>
            <li>Connaissement maritime (bill of lading).</li>
          </ul>
          <div class="gd-note"><b>À ne pas confondre :</b> l'EUR.1 sert les accords préférentiels (Maghreb, Égypte…), l'<b>A.TR</b> sert l'union douanière UE–Turquie. Pour la Turquie, c'est l'A.TR — émis par le fournisseur avant l'expédition.</div>"""),
      ("La douane : union douanière UE–Turquie",
"""          <p>Depuis 1995, la Turquie et l'Union européenne forment une <b>union douanière pour les produits industriels</b>. Conséquence directe : le papier et le carton en libre pratique dans l'UE entrent en Turquie <b>sans droits de douane</b>, sous couvert du certificat A.TR.</p>
          <p>Restent à prévoir la <b>TVA turque (KDV)</b> à l'import et les frais de transitaire habituels.</p>
          <div class="gd-note"><b>À vérifier :</b> l'A.TR doit être émis et visé avant l'expédition. Sans lui, la marchandise perd le bénéfice de l'union douanière et se voit taxer.</div>"""),
      ("Le transport : Istanbul, Mersin, Izmir… ou la route",
"""          <p>La Turquie se dessert par mer via <b>Istanbul</b> (Ambarlı), <b>Mersin</b> ou <b>Izmir</b>, avec des rotations fréquentes depuis l'Europe. Pour certaines destinations, le <b>transport routier</b> par les Balkans est aussi une option.</p>
          <p>Un conteneur 20 pieds charge 24 à 26 tonnes de papier. Comptez généralement quelques semaines porte à porte pour de la marchandise en stock.</p>"""),
      S6],
    cost_h="LE VRAI COÛT D'UN PAPIER RENDU TURQUIE", cost_lead="Le prix au départ ne dit pas tout. Le coût rendu se compose de :",
    cost_cards=COST_CARDS_FR("Istanbul ou Mersin"),
    cost_note="<b>Notre conseil :</b> exigez le certificat A.TR dès la commande — c'est lui, et non l'EUR.1, qui supprime les droits de douane à l'entrée en Turquie.",
    faq=[
      ("Faut-il payer des droits de douane sur le papier européen en Turquie ?","Non, grâce à l'union douanière UE–Turquie pour les produits industriels : le papier en libre pratique dans l'UE entre sans droits, sous couvert d'un certificat A.TR. Restent la TVA turque (KDV) et les frais de transitaire."),
      ("A.TR ou EUR.1 : quel document pour la Turquie ?","Pour la Turquie, c'est le certificat A.TR (lié à l'union douanière), pas l'EUR.1 (réservé aux accords préférentiels comme le Maghreb ou l'Égypte). Le fournisseur l'émet avant l'expédition."),
      ("Quels ports desservez-vous en Turquie ?","Principalement Istanbul (Ambarlı), Mersin et Izmir, avec des rotations fréquentes depuis l'Europe. Le transport routier par les Balkans est aussi possible selon la destination."),
      ("Combien de tonnes de papier dans un conteneur pour la Turquie ?","Un conteneur 20 pieds charge en pratique 24 à 26 tonnes de papier — c'est le poids qui limite avant le volume."),
      ("Quel est le délai de livraison en Turquie ?","Pour de la marchandise en stock : comptez généralement quelques semaines porte à porte, transit maritime et dédouanement compris, avec l'A.TR en règle.")],
    links='\U0001F4D8 Voir aussi : <a href="/turquie/">Papier &amp; carton en Turquie</a> · <a href="/guides/acheter-papier-europe/">Guide Europe</a> · <a href="/guides/">Tous nos guides</a> · <a href="/produits/">Nos produits</a>',
    cta_h="Un projet d'import en Turquie ?", cta_p="Décrivez votre besoin — offre chiffrée sous 24 h, avec le document A.TR préparé pour zéro droit de douane.",
))

# ═══════════════ ÉGYPTE ═══════════════
GUIDES.append(dict(
    slug="guides/importer-papier-egypte", lang="fr", t=TFR,
    title="Importer du papier en Égypte — guide (ACID/Nafeza, EUR.1, Alexandrie) | Prodiconseil",
    desc="Le guide de l'import de papier &amp; carton en Égypte : numéro ACID et système Nafeza obligatoires, régime préférentiel UE–Égypte et EUR.1, ports d'Alexandrie et Port-Saïd, documents.",
    og="Importer du papier en Égypte — guide pratique",
    crumbs=[("Accueil","https://prodi.com/"),("Égypte","https://prodi.com/egypte/"),("Guide : importer en Égypte","https://prodi.com/guides/importer-papier-egypte/")],
    h1="Importer du papier en Égypte",
    sub="L'Égypte impose une pré-déclaration électronique (ACID) devenue incontournable. Le guide pratique par un négociant français qui exporte depuis 1991.",
    lead="Importer en Égypte suit les règles classiques, avec une étape spécifique à ne surtout pas rater : le numéro ACID. Voici la marche à suivre.",
    steps=[S1, S2("Alexandrie ou Port-Saïd"),
      ("Obtenez le numéro ACID (système Nafeza)",
"""          <p>C'est <b>la spécificité égyptienne</b> depuis 2021 : chaque envoi doit avoir un <b>numéro ACID</b> (Advance Cargo Information), enregistré sur la plateforme <b>Nafeza</b> AVANT l'expédition. L'importateur égyptien l'obtient et le communique au fournisseur, qui le reporte sur les documents.</p>
          <ul>
            <li>Facture commerciale et liste de colisage portant le numéro ACID ;</li>
            <li><b>Certificat EUR.1</b> pour le régime préférentiel UE–Égypte ;</li>
            <li>Certificat d'origine et connaissement maritime.</li>
          </ul>
          <div class="gd-note"><b>Point critique :</b> sans numéro ACID pré-enregistré, la marchandise est <b>refusée à l'arrivée</b>. C'est l'erreur à ne jamais commettre sur l'Égypte.</div>"""),
      ("La douane : accord UE–Égypte et EUR.1",
"""          <p>Grâce à l'accord d'association <b>UE–Égypte</b>, les produits industriels d'origine UE — dont le papier et le carton — bénéficient d'un régime préférentiel : avec un <b>certificat EUR.1</b>, les droits de douane sont réduits, souvent supprimés.</p>
          <p>Restent la <b>TVA à l'import</b> et les frais de transitaire. Votre transitaire confirme le détail selon la référence.</p>"""),
      ("Le transport : Alexandrie, Port-Saïd, Damiette",
"""          <p>L'Égypte se dessert par les grands ports de <b>Alexandrie</b>, <b>Port-Saïd</b>, <b>Damiette</b> et <b>Sokhna</b>, très bien reliés à la Méditerranée. Le transit maritime est court. Un 20 pieds charge 24 à 26 tonnes de papier.</p>
          <p>Comptez généralement quelques semaines porte à porte pour de la marchandise en stock, numéro ACID et EUR.1 en règle.</p>"""),
      S6],
    cost_h="LE VRAI COÛT D'UN PAPIER RENDU ÉGYPTE", cost_lead="Le prix au départ ne dit pas tout. Le coût rendu se compose de :",
    cost_cards=COST_CARDS_FR("Alexandrie"),
    cost_note="<b>Notre conseil :</b> lancez l'enregistrement ACID dès la commande côté importateur, et demandez l'EUR.1 au fournisseur — ce sont les deux pièces qui conditionnent l'entrée en Égypte.",
    faq=[
      ("Qu'est-ce que le numéro ACID et le système Nafeza ?","Depuis 2021, l'Égypte impose un numéro ACID (Advance Cargo Information) enregistré sur la plateforme Nafeza avant l'expédition. L'importateur l'obtient et le communique au fournisseur ; il doit figurer sur les documents. Sans lui, la marchandise est refusée à l'arrivée."),
      ("Y a-t-il des droits de douane sur le papier européen en Égypte ?","Grâce à l'accord d'association UE–Égypte, le papier d'origine UE bénéficie d'un régime préférentiel avec un certificat EUR.1 : les droits sont réduits, souvent supprimés. Restent la TVA à l'import et les frais de transitaire."),
      ("Quels ports desservez-vous en Égypte ?","Principalement Alexandrie, Port-Saïd, Damiette et Sokhna, très bien reliés à la Méditerranée, avec un transit maritime court depuis l'Europe."),
      ("Qui obtient le numéro ACID, le vendeur ou l'acheteur ?","C'est l'importateur égyptien qui enregistre l'envoi sur Nafeza et obtient le numéro ACID, puis le communique au fournisseur pour qu'il le reporte sur la facture et les documents d'expédition."),
      ("Quel est le délai de livraison en Égypte ?","Pour de la marchandise en stock avec numéro ACID et EUR.1 en règle : comptez généralement quelques semaines porte à porte, transit et dédouanement compris.")],
    links='\U0001F4D8 Voir aussi : <a href="/egypte/">Papier &amp; carton en Égypte</a> · <a href="/liban/">Liban</a> · <a href="/guides/">Tous nos guides</a> · <a href="/produits/">Nos produits</a>',
    cta_h="Un projet d'import en Égypte ?", cta_p="Décrivez votre besoin — offre chiffrée sous 24 h, avec l'EUR.1 préparé et l'accompagnement sur l'ACID.",
))

# ═══════════════ STOCKLOTS (thématique) ═══════════════
GUIDES.append(dict(
    slug="guides/stocklots-papier", lang="fr", t=TFR,
    title="Stocklots de papier : comment ça marche (et pourquoi c'est moins cher) | Prodiconseil",
    desc="Guide des stocklots de papier &amp; carton : ce qu'est un stocklot, pourquoi c'est jusqu'à 30 % moins cher que le prix usine, la qualité réelle, comment recevoir les offres et acheter au bon moment.",
    og="Stocklots de papier : comment ça marche",
    crumbs=[("Accueil","https://prodi.com/"),("Nos produits","https://prodi.com/produits/"),("Guide : les stocklots","https://prodi.com/guides/stocklots-papier/")],
    h1="Stocklots de papier : comment ça marche",
    sub="Les stocklots sont le cœur de notre métier : du papier de grandes papeteries à prix réduit. Voici ce que c'est vraiment, et comment en profiter.",
    lead="« Stocklot » intrigue souvent. En clair : c'est du papier de qualité vendu sous le prix usine, pour de bonnes raisons. Le guide sans langue de bois.",
    steps=[
      ("Qu'est-ce qu'un stocklot, exactement ?",
"""          <p>Un stocklot, c'est un <b>lot de papier issu d'une grande papeterie</b> vendu en dehors de son circuit normal : surproduction, fin de série, léger écart de spécification, changement de programme d'un client, ou simple besoin de déstockage de l'usine.</p>
          <p>Ce n'est <b>pas</b> du papier de rebut : c'est le plus souvent de la <b>première qualité</b>, des mêmes machines que la production standard — juste disponible au mauvais moment ou en quantité qui ne rentrait pas dans une commande.</p>"""),
      ("Pourquoi c'est moins cher",
"""          <p>Pour l'usine, un lot qui dort coûte de l'argent (stockage, trésorerie). Le vendre vite, même sous le prix catalogue, est plus rentable que de l'immobiliser. Résultat : des prix souvent <b>20 à 30 % sous le tarif usine</b>.</p>
          <div class="gd-note"><b>La contrepartie :</b> les quantités sont <b>limitées</b> et le lot se vend <b>tel quel</b> (grammage, laize et tonnage donnés). Pas de « on refait le même le mois prochain » : chaque lot est unique.</div>"""),
      ("La qualité : à quoi s'attendre",
"""          <p>La plupart de nos stocklots sont de qualité courante, avec des références précises. Quand un lot a une particularité (léger écart de grammage, teinte, bordé…), <b>on vous le dit</b> et ça se reflète dans le prix.</p>
          <p>Notre règle : <b>photos réelles et spécifications exactes</b> pour chaque lot. Vous savez ce que vous achetez avant de vous engager.</p>"""),
      ("Comment recevoir les offres",
"""          <p>Les stocklots vont vite. Le plus efficace : nous dire une fois pour toutes les <b>qualités et grammages qui vous intéressent</b>, et on vous prévient dès qu'un lot correspond. Vous pouvez aussi consulter le <a href="/catalogue/" onclick="openCatalogue();return false;">stock en ligne</a> à tout moment.</p>
          <div class="gd-note"><b>Astuce :</b> plus vous êtes flexible sur le grammage ou la laize exacte, plus vous captez d'opportunités — et de belles remises.</div>"""),
      ("Acheter au bon moment",
"""          <p>Un stocklot intéressant part parfois en quelques jours. Deux réflexes gagnants : <b>décider vite</b> quand le lot colle à votre besoin, et <b>grouper</b> vos besoins pour remplir un conteneur ou un camion (le transport à la tonne devient alors imbattable).</p>"""),
      ("Réception : la même rigueur",
"""          <p>Comme pour tout achat, contrôlez le lot à la réception face à la liste de colisage et notez toute réserve sur le bon de livraison. Avec des références et photos précises en amont, les surprises sont rares.</p>""")],
    cost_h="STOCKLOT OU PRIX USINE : LE BON ARBITRAGE", cost_lead="Le stocklot n'est pas toujours la réponse — voici quand il brille :",
    cost_cards="""        <div class="gp-card"><h3>Le stocklot gagne quand…</h3><p>Vous êtes flexible sur le grammage/laize exact, vous pouvez décider vite, et vous cherchez le meilleur prix à la tonne sur une qualité courante.</p></div>
        <div class="gp-card"><h3>La fabrication gagne quand…</h3><p>Vous avez besoin d'une spécification précise, récurrente, dans un délai planifié — là, on passe par une production usine dédiée.</p></div>
        <div class="gp-card"><h3>Souvent, on combine</h3><p>Un socle en fabrication pour vos références récurrentes, complété d'opportunités stocklot dès qu'elles passent.</p></div>
        <div class="gp-card"><h3>Notre rôle</h3><p>On détecte les lots auprès des papeteries, on vérifie la qualité, on stocke en France et on vous les propose photos à l'appui.</p></div>""",
    cost_note="<b>Notre conseil :</b> donnez-nous votre « liste de courses » (qualités + grammages) une bonne fois — on devient vos yeux sur le marché des stocklots.",
    faq=[
      ("Un stocklot, c'est du papier de mauvaise qualité ?","Non. Un stocklot est le plus souvent de la première qualité, issu des mêmes machines que la production standard : surproduction, fin de série ou déstockage d'usine. Quand un lot a une particularité, nous l'indiquons clairement et le prix en tient compte."),
      ("Pourquoi les stocklots sont-ils moins chers ?","Parce qu'un lot qui dort coûte cher à l'usine (stockage, trésorerie) : le vendre rapidement, même sous le tarif catalogue, est plus rentable. Les prix ressortent souvent 20 à 30 % sous le prix usine."),
      ("Peut-on recommander exactement le même stocklot plus tard ?","Rarement : chaque lot est unique et en quantité limitée. Si vous avez besoin d'une spécification récurrente et garantie, mieux vaut passer par une fabrication dédiée. On combine souvent les deux approches."),
      ("Comment être prévenu des bons stocklots ?","Dites-nous les qualités et grammages qui vous intéressent : on vous prévient dès qu'un lot correspond. Vous pouvez aussi consulter notre stock en ligne à tout moment. Plus vous êtes flexible, plus vous captez d'opportunités."),
      ("Y a-t-il une quantité minimum sur un stocklot ?","Ça dépend du lot. Beaucoup se vendent par tonnage complet du lot, mais on peut souvent grouper plusieurs références pour remplir un conteneur ou un camion et optimiser le transport. Parlons de votre volume.")],
    links='\U0001F4D8 Voir aussi : <a href="/produits/">Toutes nos qualités</a> · <a href="/guides/importer-papier-maroc/">Guide import Maroc</a> · <a href="/guides/">Tous nos guides</a> · <a href="/catalogue/" onclick="openCatalogue();return false;">Voir le stock</a>',
    cta_h="À la recherche de stocklots ?", cta_p="Dites-nous les qualités et grammages qui vous intéressent — on vous envoie les lots disponibles, photos et prix à l'appui.",
))

# ═══════════════ NIGERIA (EN) ═══════════════
GUIDES.append(dict(
    slug="en/guides/importing-paper-nigeria", lang="en", t=TEN,
    title="How to import paper into Nigeria — guide (Form M, SONCAP, PAAR, Lagos) | Prodiconseil",
    desc="The guide to importing paper &amp; board into Nigeria: Form M, SONCAP certificate, PAAR, ECOWAS tariff, Lagos ports (Apapa, Tin Can), documents and pitfalls. By a French merchant exporting since 1991.",
    og="How to import paper into Nigeria — practical guide",
    crumbs=[("Home","https://prodi.com/en/"),("Nigeria","https://prodi.com/en/nigeria/"),("Guide: importing into Nigeria","https://prodi.com/en/guides/importing-paper-nigeria/")],
    h1="How to import paper into Nigeria",
    sub="Nigeria has the most structured import process in the region — Form M, SONCAP, PAAR. Get them right and it runs smoothly. A practical guide by a French merchant exporting since 1991.",
    lead="Importing paper into Nigeria follows clear rules, but they must be respected in order. Here is the mechanism, step by step.",
    steps=[
      ("Define exactly what you need",
"""          <p>A serious supplier will always ask for: the <b>grade</b> (offset, coated, kraft, board…), the <b>grammage</b> (gsm), the <b>format</b> (reels or sheets, with width or dimensions) and the <b>tonnage</b>. The more precise your request, the faster the offer — and the sharper the price.</p>
          <div class="gd-note"><b>Tip:</b> ask for real stock photos and exact references. It is the best protection against surprises on arrival.</div>"""),
      ("Choose your incoterm",
"""          <p>The incoterm sets who pays and who is responsible for each leg of the shipment:</p>
          <ul>
            <li><b>EXW</b> (ex-warehouse): you control everything with your forwarder — often the best goods price.</li>
            <li><b>FOB</b> (European port): the seller brings and loads the goods at the port; you handle the sea freight.</li>
            <li><b>CIF</b> (Lagos): the seller also arranges freight and insurance to the Nigerian port.</li>
          </ul>
          <div class="gd-note"><b>Common trap:</b> comparing one supplier's EXW price with another's CIF price. Always bring offers to the same incoterm before deciding.</div>"""),
      ("Open the Form M — before shipment",
"""          <p>This is the <b>Nigerian cornerstone</b>: every import needs a <b>Form M</b>, an electronic declaration filed by your authorised dealer bank and validated <b>before the goods ship</b>. No valid Form M, no import.</p>
          <ul>
            <li><b>SONCAP certificate</b> — conformity certificate from the Standards Organisation of Nigeria for regulated products;</li>
            <li><b>PAAR</b> (Pre-Arrival Assessment Report) issued by Customs against the Form M;</li>
            <li>Commercial invoice, packing list, bill of lading and a Combined Certificate of Value and Origin (CCVO).</li>
          </ul>
          <div class="gd-note"><b>Critical point:</b> the Form M must be opened and validated <b>before shipment</b>. Opening it late is the number-one cause of blocked cargo in Nigeria.</div>"""),
      ("Customs: ECOWAS common external tariff",
"""          <p>Nigeria applies the <b>ECOWAS Common External Tariff (CET)</b> — a harmonised duty grid by product category. Paper and board fall under a CET category; your forwarder confirms the exact rate for your reference.</p>
          <p>Add <b>VAT</b> on import and the usual levies. There is no automatic zero-duty preferential regime as in the Maghreb, so always price the landed cost duties included.</p>"""),
      ("Transport: the Lagos ports",
"""          <p>Nigeria is served mainly through <b>Lagos</b> — <b>Apapa</b> and <b>Tin Can Island</b> — plus <b>Onne</b> and <b>Port Harcourt</b> in the east. A 20-foot container carries 24 to 26 tonnes of paper; weight is the limit, not volume.</p>
          <p>Allow for the sea transit plus clearance time, which can be longer at busy Lagos terminals. We give a realistic estimate for your city.</p>"""),
      ("Delivery: check before you sign",
"""          <p>On stripping the container, check the condition of reels and pallets, count the units and reconcile against the packing list. Note any reservation immediately on the delivery document so it holds. A supplier who sells on real photos and exact references saves you almost all disputes.</p>""")],
    cost_h="THE REAL LANDED COST IN NIGERIA", cost_lead="The departure price doesn't tell the whole story. Landed cost is made of:",
    cost_cards="""        <div class="gp-card"><h3>1. The goods</h3><p>Price per tonne by grade, grammage and format. <a href="/catalogue/" onclick="openCatalogue();return false;" style="color:inherit">Stock lots</a> and stocklots offer the best opportunities — up to 30% below mill price.</p></div>
        <div class="gp-card"><h3>2. Logistics</h3><p>Pre-carriage, sea freight and insurance to Lagos. Spread over a full container, the per-tonne cost is often lower than feared.</p></div>
        <div class="gp-card"><h3>3. Duty &amp; taxes</h3><p>ECOWAS CET duty by category, import VAT, forwarder and port handling fees.</p></div>
        <div class="gp-card"><h3>4. The last mile</h3><p>Local transport from the port to your plant or warehouse.</p></div>""",
    cost_note="<b>Our advice:</b> open the Form M with your bank as soon as the proforma is agreed, and line up the SONCAP certificate early — these are what most often delay Nigerian imports.",
    faq=[
      ("What is Form M and why does it matter?","Form M is a mandatory electronic import declaration filed by your Nigerian authorised dealer bank and validated before the goods ship. Without a valid Form M there is no import — it is the foundation of every Nigerian import."),
      ("What is SONCAP?","SONCAP is the Standards Organisation of Nigeria Conformity Assessment Programme: a conformity certificate required for regulated products. Your forwarder and the certification body confirm whether and how it applies to your goods."),
      ("Are there customs duties on paper in Nigeria?","Nigeria applies the ECOWAS Common External Tariff by product category, plus import VAT. There is no automatic zero-duty preferential regime as in the Maghreb, so price the landed cost duties included."),
      ("Which ports do you serve in Nigeria?","Mainly Lagos — Apapa and Tin Can Island — plus Onne and Port Harcourt in the east, with regular sailings from Europe."),
      ("How long does delivery to Nigeria take?","For stock goods with Form M and documents in order: allow the sea transit plus clearance, which can be longer at busy Lagos terminals. We give a realistic door-to-door estimate for your city.")],
    links='\U0001F4D8 See also: <a href="/en/nigeria/">Paper &amp; board in Nigeria</a> · <a href="/en/ghana/">Ghana</a> · <a href="/en/kenya/">Kenya</a> · <a href="/en/">All products</a>',
    cta_h="Planning to import into Nigeria?", cta_p="Tell us your grade, grammage and tonnage — a priced CIF Lagos or EXW offer within 24 h, with real stock photos.",
))

# ── Hub /guides/ ──
HUB_CARDS = [
    ("Import · Maroc","importer-papier-maroc","Comment importer du papier au Maroc","Étapes, EUR.1, douane, conteneur et pièges — le marché n° 1."),
    ("Import · Algérie","importer-papier-algerie","Comment importer du papier en Algérie","Domiciliation bancaire, régime Algérie–UE, DAPS, ports d'Alger et Oran."),
    ("Import · Afrique de l'Ouest","importer-papier-afrique-ouest","Importer en Afrique de l'Ouest","CEDEAO, tarif commun, bordereau de suivi, hubs de Dakar et Abidjan."),
    ("Import · Afrique centrale","importer-papier-afrique-centrale","Importer en Afrique centrale","CEMAC, ports de Douala et Pointe-Noire, pays enclavés, cas de la RDC."),
    ("Achat · Europe","acheter-papier-europe","Acheter du papier en Europe","Livraison par camion sans douane, TVA intracommunautaire, délais courts."),
    ("Import · Turquie","importer-papier-turquie","Importer du papier en Turquie","Union douanière UE, document A.TR, ports d'Istanbul et Mersin."),
    ("Import · Égypte","importer-papier-egypte","Importer du papier en Égypte","Numéro ACID / Nafeza, EUR.1, ports d'Alexandrie et Port-Saïd."),
    ("Métier · Stocklots","stocklots-papier","Stocklots : comment ça marche","Pourquoi c'est moins cher, la qualité réelle, comment en profiter."),
]

def render_hub():
    cards = "\n".join(
        f'        <a class="gh-card" href="/guides/{slug}/"><span class="gh-tag">{tag}</span><h3>{h3}</h3><p>{p}</p></a>'
        for tag, slug, h3, p in HUB_CARDS)
    itemlist = ",\n    ".join(
        '{"@type": "ListItem", "position": %d, "url": "https://prodi.com/guides/%s/"}' % (i+1, slug)
        for i, (_, slug, _, _) in enumerate(HUB_CARDS))
    url = "https://prodi.com/guides/"
    return f"""<!DOCTYPE html>
<html lang="fr">
<head>
{GTAG}

<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<meta http-equiv="Content-Security-Policy" content="{CSP}">
<meta http-equiv="X-Content-Type-Options" content="nosniff">
<meta name="referrer" content="strict-origin-when-cross-origin">
<link rel="icon" type="image/png" href="/img/panda.png">
<title>Guides d'import papier &amp; carton — douane, incoterms, stocklots | Prodiconseil</title>
<meta name="description" content="Nos guides pratiques pour importer du papier et du carton : Maroc, Algérie, Afrique de l'Ouest et centrale, Europe, Turquie, Égypte, Nigeria, et le fonctionnement des stocklots.">
<meta name="robots" content="index, follow">
<link rel="canonical" href="{url}">
<meta property="og:type" content="website">
<meta property="og:site_name" content="Prodiconseil">
<meta property="og:locale" content="fr_FR">
<meta property="og:url" content="{url}">
<meta property="og:title" content="Guides d'import papier &amp; carton — Prodiconseil">
<meta property="og:description" content="Guides pratiques par région et par sujet pour importer du papier et du carton au meilleur coût.">
<meta property="og:image" content="https://prodi.com/img/og-card.jpg">
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:title" content="Guides d'import papier &amp; carton — Prodiconseil">
<meta name="twitter:description" content="Guides pratiques par région et par sujet.">
<meta name="twitter:image" content="https://prodi.com/img/og-card.jpg">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Bebas+Neue&family=Oswald:wght@600;700&family=DM+Sans:wght@300;400;500;600;700;800&family=Space+Grotesk:wght@300;400;500;600;700&display=swap" rel="stylesheet">
<link rel="stylesheet" href="/vitrine.css?v={CSS_V}">
<script type="application/ld+json">
{{
  "@context": "https://schema.org",
  "@type": "BreadcrumbList",
  "itemListElement": [
    {{"@type": "ListItem", "position": 1, "name": "Accueil", "item": "https://prodi.com/"}},
    {{"@type": "ListItem", "position": 2, "name": "Guides", "item": "{url}"}}
  ]
}}
</script>
<script type="application/ld+json">
{{
  "@context": "https://schema.org",
  "@type": "ItemList",
  "name": "Guides d'import papier &amp; carton",
  "itemListElement": [
    {itemlist}
  ]
}}
</script>
</head>
<body class="souspage">
{header('fr')}

{STYLE}

<main class="geopage">
  <div class="page-head">
    <h1 class="page-h1">Guides d'import papier &amp; carton</h1>
    <p class="page-sub">Des guides pratiques, région par région, pour importer du papier et du carton au meilleur coût — douane, incoterms, documents et pièges à éviter. Écrits par un négociant français qui exporte depuis 1991.</p>
  </div>

  <section class="habt-sec">
    <div class="sec-inner">
      <div class="gh-grid">
{cards}
        <a class="gh-card" href="/en/guides/importing-paper-nigeria/"><span class="gh-tag">Import · Nigeria (EN)</span><h3>How to import paper into Nigeria</h3><p>Form M, SONCAP, PAAR, ECOWAS tariff, Lagos ports — in English.</p></a>
      </div>
      <p class="gp-links">Vous ne trouvez pas votre pays ? Nos <a href="/#international">28 marchés</a> sont couverts — <a href="/contact/">demandez-nous</a> directement. · <a href="/produits/">Nos produits</a> · <a href="/catalogue/" onclick="openCatalogue();return false;">Voir le stock</a></p>
    </div>
  </section>

  <section class="gp-cta">
    <h2>Une question sur votre import ?</h2>
    <p>Décrivez votre projet — pays, qualité, tonnage — on vous répond sous 24 h avec une offre et les conseils douaniers adaptés.</p>
    <div class="gp-cta-btns">
      <a href="/contact/" class="btn-cat">Demander une offre →</a>
      <a class="gp-wa" href="{WA}" target="_blank" rel="noopener noreferrer">{WA_SVG} WhatsApp</a>
    </div>
  </section>
</main>

{footer('fr')}

{gate('fr')}

{SCRIPTS}

</body>
</html>
"""

def write(path, html):
    full = os.path.join(ROOT, path)
    os.makedirs(os.path.dirname(full), exist_ok=True)
    open(full, "w", encoding="utf-8").write(html)
    return "/" + path.replace("index.html", "")

def main():
    urls = []
    for g in GUIDES:
        u = write(f"{g['slug']}/index.html", render(g))
        urls.append("https://prodi.com" + u)
        print("écrit:", u)
    u = write("guides/index.html", render_hub())
    urls.insert(0, "https://prodi.com" + u)
    print("écrit:", u)
    # Le guide Maroc est écrit à la main (hors générateur) mais doit rester au sitemap
    urls.append("https://prodi.com/guides/importer-papier-maroc/")

    # sitemap : bloc borné par marqueurs
    sp = os.path.join(ROOT, "sitemap.xml")
    s = open(sp, encoding="utf-8").read()
    # retire les anciennes entrées guides pour éviter les doublons
    s = re.sub(r'\s*<url>\s*<loc>https://prodi\.com/(?:en/)?guides/[^<]*</loc>.*?</url>', '', s, flags=re.S)
    block = "".join(
        f"""  <url>
    <loc>{u}</loc>
    <lastmod>2026-09-01</lastmod>
    <changefreq>monthly</changefreq>
    <priority>{'0.8' if 'guides/' != u.split('prodi.com/')[1] else '0.7'}</priority>
  </url>
""" for u in urls)
    s = s.replace("</urlset>", block + "</urlset>")
    open(sp, "w", encoding="utf-8").write(s)
    print(f"sitemap: {s.count('<loc>')} URLs (+{len(urls)} guides)")

if __name__ == "__main__":
    main()
