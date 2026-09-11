#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Pages STOCK statiques SANS PRIX (/stock/<famille>/ + hub /stock/) pour le SEO —
le catalogue JS étant invisible de Google (robots + noindex + rendu client).

Choix assumés (validés Ethan 01/09/2026) :
- AUCUN prix, AUCUNE réf individuelle, ni usine ni zone : on agrège par
  famille × grammage (laizes/dimensions en plage) → SEO riche, exposition
  concurrentielle minimale, pages robustes au churn quotidien.
- Réservés exclus (reserve_client non nul), périmètre = celui du catalogue
  (OUR WAREHOUSE, hors DU/FAB/BU, source ≠ inventaire).
- Régénéré chaque matin par le workflow import-stock (git commit si diff).

Usage : python3 scripts/gen_stock_pages.py
"""
import os, re, json, urllib.request, datetime
from collections import defaultdict

import sys
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from gen_guides import (CSP, STYLE, GTAG, WA, WA_SVG, header, footer, gate,
                        SCRIPTS, CSS_V)

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
TODAY = datetime.date.today().isoformat()

SUPABASE_URL = os.environ.get("SUPABASE_URL", "https://bvcgpdoukhcatjibmvnb.supabase.co")
ANON = os.environ.get("SUPABASE_ANON_KEY",
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJ2Y2dwZG91a2hjYXRqaWJtdm5iIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzIyNzg5MjgsImV4cCI6MjA4Nzg1NDkyOH0.Ip3ykSUS9sajTH04yXBerOG1haBKMD1kAvMQNjnGL1Q")

QUALITE_LABELS = {
 'R1SC':'Couché 1 face','R2SC':'Couché 2 faces','RADH':'Adhésif','RAFF':'Papier affiche',
 'RBOA':'Carton couché','RBON':'Carton non couché','RBOU':'Bouffant','RCAR':'Autocopiant',
 'RCOL':'Offset couleur','RCUI':'Papier cuisson','RDIV':'Divers','RFLEX':'Complexe / Polyéthylène',
 'RKDO':'Papier cadeau','RKRA':'Kraft','RKRABRUN':'Kraft brun','RKRG':'Kraft gommé','RKRR':'Kraft armé',
 'RLINER':'Liner / Testliner','RLUX':'Papier luxe','RLWC':'LWC','RNEW':'Papier journal','ROFF':'Offset',
 'RPAC':'Emballage','RPLA':'Plastique','RSIL':'Silicone / Glassine','RTHERM':'Thermique','RTIS':'Ouate / Tissue',
}
def famille(code):
    if not code: return None
    c = code.upper()
    if c in QUALITE_LABELS: return QUALITE_LABELS[c]
    if c.startswith('S') and 'R'+c[1:] in QUALITE_LABELS: return QUALITE_LABELS['R'+c[1:]]
    return None

# famille → (slug /stock/, page produit correspondante ou None)
FAM_PAGES = {
 'Offset':          ('offset', '/offset/'),
 'Offset couleur':  ('offset-couleur', '/offset-couleur/'),
 'Couché 1 face':   ('couche-1-face', '/papier-couche/'),
 'Couché 2 faces':  ('couche-2-faces', '/papier-couche/'),
 'LWC':             ('lwc', '/papier-couche/'),
 'Carton couché':   ('carton-couche', '/carton-couche/'),
 'Carton non couché':('carton-non-couche', '/carton-couche/'),
 'Kraft':           ('kraft', '/kraft/'),
 'Kraft brun':      ('kraft-brun', '/kraft/'),
 'Kraft gommé':     ('kraft-gomme', '/kraft/'),
 'Kraft armé':      ('kraft-arme', '/kraft/'),
 'Autocopiant':     ('autocopiant', '/autocopiant/'),
 'Adhésif':         ('adhesif', '/papier-adhesif/'),
 'Bouffant':        ('bouffant', '/bouffant/'),
 'Liner / Testliner':('liner-testliner', '/liner-testliner/'),
 'Complexe / Polyéthylène':('complexe-pe', '/complexe-pe/'),
 'Papier journal':  ('papier-journal', '/papier-journal/'),
 'Papier cuisson':  ('papier-cuisson', '/papier-cuisson/'),
 'Thermique':       ('papier-thermique', '/papier-thermique/'),
 'Papier luxe':     ('papier-luxe', '/papier-creations/'),
 'Papier affiche':  ('papier-affiche', None),
 'Silicone / Glassine':('glassine', None),
 'Bouffant ':       ('bouffant', '/bouffant/'),
 'Emballage':       ('emballage', None),
 'Ouate / Tissue':  ('ouate-tissue', None),
}
MIN_TONNES = 3.0  # en dessous, pas de page (contenu trop mince)

def fetch_products():
    rows, start = [], 0
    sel = "quality,gsm,width,longueur,weight,format,reserve_client,ref,source,emplacement"
    while True:
        req = urllib.request.Request(
            f"{SUPABASE_URL}/rest/v1/products?select={sel}"
            "&source=neq.inventaire&emplacement=eq.OUR%20WAREHOUSE"
            "&order=id.asc",
            headers={"apikey": ANON, "Authorization": f"Bearer {ANON}",
                     "Range": f"{start}-{start+999}"})
        batch = json.load(urllib.request.urlopen(req, timeout=45))
        rows += batch
        if len(batch) < 1000: break
        start += 1000
    out = []
    for p in rows:
        r = str(p.get("ref") or "")
        if r.startswith(("Photo_DU", "Photo_FAB", "Photo_BU")): continue
        if p.get("reserve_client"): continue  # réservés : jamais affichés
        out.append(p)
    return out

def bande(vals):
    vals = sorted(v for v in vals if v)
    if not vals: return ""
    if len(vals) == 1 or vals[0] == vals[-1]: return f"{vals[0]:.0f}"
    return f"{vals[0]:.0f}–{vals[-1]:.0f}"

def build_fam_data(products):
    fams = defaultdict(list)
    for p in products:
        f = famille(p.get("quality"))
        if f and f in FAM_PAGES: fams[f].append(p)
    data = {}
    for f, items in fams.items():
        tons = sum((p.get("weight") or 0) for p in items) / 1000.0
        if tons < MIN_TONNES: continue
        bob = [p for p in items if (p.get("format") or "") == "Bobine"]
        fmt = [p for p in items if (p.get("format") or "") != "Bobine"]
        def group(rows, is_bob):
            g = defaultdict(lambda: {"n": 0, "kg": 0.0, "dims": set()})
            for p in rows:
                gsm = p.get("gsm")
                key = int(round(gsm)) if gsm else 0
                e = g[key]; e["n"] += 1; e["kg"] += (p.get("weight") or 0)
                if is_bob:
                    if p.get("width"): e["dims"].add(int(round(p["width"])))
                else:
                    w, l = p.get("width"), p.get("longueur")
                    if w and l: e["dims"].add(f"{int(round(min(w,l)))}×{int(round(max(w,l)))}")
            return g
        data[f] = dict(items=len(items), tons=tons,
                       bob=group(bob, True), nbob=len(bob),
                       fmt=group(fmt, False), nfmt=len(fmt),
                       gsms=[p["gsm"] for p in items if p.get("gsm")])
    return data

def rows_html(g, is_bob):
    out = []
    for gsm in sorted(k for k in g if k):
        e = g[gsm]
        if is_bob:
            dims = sorted(e["dims"])
            if len(dims) > 8:
                dtxt = f"{dims[0]}–{dims[-1]} mm ({len(dims)} laizes)"
            else:
                dtxt = " / ".join(str(d) for d in dims) + " mm" if dims else "—"
        else:
            dims = sorted(e["dims"])
            dtxt = (", ".join(dims[:6]) + (f" … (+{len(dims)-6})" if len(dims) > 6 else "") + " mm") if dims else "—"
        out.append(f"        <tr><td>{gsm} g/m²</td><td>{dtxt}</td><td>{e['n']}</td><td>{e['kg']/1000:.1f} t</td></tr>")
    return "\n".join(out)

PAGE_STYLE = """<style>
.stk-table{width:100%;max-width:860px;border-collapse:collapse;margin-top:10px;}
.stk-table th{font-family:'DM Sans',sans-serif;font-size:12.5px;font-weight:700;text-transform:uppercase;letter-spacing:.05em;color:var(--g3,#86868b);text-align:left;padding:10px 12px;border-bottom:2px solid var(--hairline,#e0e0e5);}
.stk-table td{font-size:14.5px;color:var(--g1,#515154);padding:10px 12px;border-bottom:1px solid var(--hairline,#e0e0e5);}
.stk-table td:first-child{font-weight:700;color:var(--ink,#222);white-space:nowrap;}
.stk-stats{display:flex;gap:14px;flex-wrap:wrap;margin:10px 0 6px;}
.stk-stat{background:var(--off,#f5f5f3);border:1px solid var(--border,#e8e8e4);border-radius:14px;padding:12px 20px;}
.stk-stat b{display:block;font-family:'DM Sans',sans-serif;font-size:22px;color:var(--ink,#222);}
.stk-stat span{font-size:12.5px;color:var(--g2,#6e6e73);}
.stk-maj{font-size:12.5px;color:var(--g3,#86868b);margin-top:8px;}
</style>"""

def page_html(f, d, hub=False):
    slug, prod_page = FAM_PAGES[f]
    url = f"https://prodi.com/stock/{slug}/"
    gsm_range = bande(d["gsms"])
    title = f"Stock {f} disponible — {d['tons']:.0f} t en bobines &amp; formats | Prodiconseil"
    desc = (f"Stock réel de {f.lower()} chez Prodiconseil : {d['items']} références, {d['tons']:.0f} tonnes "
            f"({gsm_range} g/m²), en bobines et formats, départ dépôt France. Photos et prix sur demande — mis à jour quotidiennement.")
    bob_html = ""
    if d["nbob"]:
        bob_html = f"""      <h3 style="font-family:'DM Sans',sans-serif;margin:26px 0 2px;">Bobines ({d['nbob']} unités)</h3>
      <table class="stk-table"><thead><tr><th>Grammage</th><th>Laizes</th><th>Bobines</th><th>Tonnage</th></tr></thead><tbody>
{rows_html(d['bob'], True)}
      </tbody></table>"""
    fmt_html = ""
    if d["nfmt"]:
        fmt_html = f"""      <h3 style="font-family:'DM Sans',sans-serif;margin:26px 0 2px;">Formats / palettes ({d['nfmt']} unités)</h3>
      <table class="stk-table"><thead><tr><th>Grammage</th><th>Dimensions</th><th>Palettes</th><th>Tonnage</th></tr></thead><tbody>
{rows_html(d['fmt'], False)}
      </tbody></table>"""
    prod_link = f' · <a href="{prod_page}">La qualité {f} en détail</a>' if prod_page else ""
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
<title>{title}</title>
<meta name="description" content="{desc}">
<meta name="robots" content="index, follow">
<link rel="canonical" href="{url}">
<meta property="og:type" content="website">
<meta property="og:site_name" content="Prodiconseil">
<meta property="og:locale" content="fr_FR">
<meta property="og:url" content="{url}">
<meta property="og:title" content="Stock {f} disponible — Prodiconseil">
<meta property="og:description" content="{desc}">
<meta property="og:image" content="https://prodi.com/img/og-card.jpg">
<meta name="twitter:card" content="summary_large_image">
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
    {{"@type": "ListItem", "position": 2, "name": "Stock disponible", "item": "https://prodi.com/stock/"}},
    {{"@type": "ListItem", "position": 3, "name": "Stock {f}", "item": "{url}"}}
  ]
}}
</script>
</head>
<body class="souspage">

{header('fr')}

{STYLE}
{PAGE_STYLE}

<main class="geopage">
  <div class="page-head">
    <h1 class="page-h1">Stock {f} disponible</h1>
    <p class="page-sub">Notre stock réel de {f.lower()}, en bobines et formats, départ dépôt France — mis à jour chaque jour ouvré. Photos et prix sur demande.</p>
  </div>

  <section class="habt-sec">
    <div class="sec-inner">
      <div class="stk-stats">
        <div class="stk-stat"><b>{d['items']}</b><span>références</span></div>
        <div class="stk-stat"><b>{d['tons']:.0f} t</b><span>disponibles</span></div>
        <div class="stk-stat"><b>{gsm_range} g/m²</b><span>grammages</span></div>
      </div>
      <p class="stk-maj">Dernière mise à jour : {TODAY} · Références non réservées uniquement.</p>
{bob_html}
{fmt_html}
      <p class="gp-links" style="margin-top:26px;">💬 <b>Prix, photos et références :</b> <a href="{WA}" target="_blank" rel="noopener noreferrer">sur WhatsApp</a> ou via le <a href="/catalogue/" onclick="openStock();return false;">catalogue en ligne</a>{prod_link} · <a href="/stock/">Tout le stock</a> · <a href="/guides/stocklots-papier/">Comprendre les stocklots</a></p>
    </div>
  </section>

  <section class="gp-cta">
    <h2>Intéressé par notre {f.lower()} ?</h2>
    <p>Dites-nous les grammages et quantités qui vous intéressent — offre chiffrée avec photos sous 24 h.</p>
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

def hub_html(data):
    total_t = sum(d["tons"] for d in data.values())
    total_r = sum(d["items"] for d in data.values())
    cards = "\n".join(
        f'        <a class="gh-card" href="/stock/{FAM_PAGES[f][0]}/"><span class="gh-tag">{d["tons"]:.0f} t · {d["items"]} réfs</span><h3>{f}</h3><p>{bande(d["gsms"])} g/m² — {d["nbob"]} bobines, {d["nfmt"]} formats.</p></a>'
        for f, d in sorted(data.items(), key=lambda x: -x[1]["tons"]))
    url = "https://prodi.com/stock/"
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
<title>Stock papier &amp; carton disponible — {total_t:.0f} tonnes, mise à jour quotidienne | Prodiconseil</title>
<meta name="description" content="Le stock réel de Prodiconseil : {total_r} références et {total_t:.0f} tonnes de papier et carton disponibles — offset, couché, kraft, cartons, spécialités. Bobines et formats, départ France. Prix sur demande.">
<meta name="robots" content="index, follow">
<link rel="canonical" href="{url}">
<meta property="og:type" content="website">
<meta property="og:site_name" content="Prodiconseil">
<meta property="og:locale" content="fr_FR">
<meta property="og:url" content="{url}">
<meta property="og:title" content="Stock papier &amp; carton disponible — Prodiconseil">
<meta property="og:description" content="{total_r} références, {total_t:.0f} tonnes disponibles, mise à jour quotidienne. Prix sur demande.">
<meta property="og:image" content="https://prodi.com/img/og-card.jpg">
<meta name="twitter:card" content="summary_large_image">
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
    {{"@type": "ListItem", "position": 2, "name": "Stock disponible", "item": "{url}"}}
  ]
}}
</script>
</head>
<body class="souspage">

{header('fr')}

{STYLE}
{PAGE_STYLE}

<main class="geopage">
  <div class="page-head">
    <h1 class="page-h1">Notre stock, en toute transparence</h1>
    <p class="page-sub">{total_r} références · {total_t:.0f} tonnes de papier et carton disponibles en France, mises à jour chaque jour ouvré. Les prix et photos s'obtiennent en un message.</p>
  </div>

  <section class="habt-sec">
    <div class="sec-inner">
      <div class="gh-grid">
{cards}
      </div>
      <p class="stk-maj">Dernière mise à jour : {TODAY} · Références non réservées uniquement · <a href="/guides/stocklots-papier/">C'est quoi un stocklot ?</a></p>
    </div>
  </section>

  <section class="gp-cta">
    <h2>Un besoin précis ?</h2>
    <p>Dites-nous la qualité, le grammage et le tonnage — offre chiffrée avec photos réelles sous 24 h.</p>
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

def main():
    products = fetch_products()
    print(f"{len(products)} produits dans le périmètre public (non réservés)")
    data = build_fam_data(products)
    print(f"{len(data)} familles ≥ {MIN_TONNES} t")

    # purge les anciennes pages famille (une famille peut disparaître)
    import shutil
    stock_dir = os.path.join(ROOT, "stock")
    if os.path.isdir(stock_dir): shutil.rmtree(stock_dir)

    urls = ["https://prodi.com/stock/"]
    os.makedirs(stock_dir, exist_ok=True)
    open(os.path.join(stock_dir, "index.html"), "w", encoding="utf-8").write(hub_html(data))
    for f, d in data.items():
        slug = FAM_PAGES[f][0]
        p = os.path.join(stock_dir, slug)
        os.makedirs(p, exist_ok=True)
        open(os.path.join(p, "index.html"), "w", encoding="utf-8").write(page_html(f, d))
        urls.append(f"https://prodi.com/stock/{slug}/")
    print(f"{len(urls)} pages écrites (hub + familles)")

    # sitemap : bloc /stock/ borné
    sp = os.path.join(ROOT, "sitemap.xml")
    s = open(sp, encoding="utf-8").read()
    s = re.sub(r'\s*<url>\s*<loc>https://prodi\.com/stock/[^<]*</loc>.*?</url>', '', s, flags=re.S)
    block = "".join(f"""  <url>
    <loc>{u}</loc>
    <lastmod>{TODAY}</lastmod>
    <changefreq>daily</changefreq>
    <priority>0.7</priority>
  </url>
""" for u in urls)
    s = s.replace("</urlset>", block + "</urlset>")
    open(sp, "w", encoding="utf-8").write(s)
    print(f"sitemap : {s.count('<loc>')} URLs")

if __name__ == "__main__":
    main()
