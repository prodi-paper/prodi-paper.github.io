#!/usr/bin/env python3
"""
Import du stock Prodiconseil depuis le RELAIS SAGE (schéma `sage` de Supabase,
copié toutes les 5 min depuis le serveur Prodi) — remplaçant prévu de
import_stock_ci.py (mail « STOCK COMPLET AVEC LES RESERVATION » + Excel DOV).

Correspondance DOV → Sage (vérifiée le 06/11/2026) :
  REF          F_ARTICLE.AR_Ref
  CODE_FAM/FAM F_ARTICLE.FA_CodeFamille / F_FAMILLE.FA_Intitule (BOB./PAL.)
  QTSTO        F_ARTSTOCK.AS_QteSto (une ligne par dépôt, on garde la plus grosse)
  NOM_DEPOT    F_DEPOT.DE_Intitule
  DP_CODE      F_DEPOTEMPL.DP_Code via F_ARTSTOCK.DP_NoPrincipal (PAS F_ARTSTOCKEMPL = « DEFAUT »)
  PNET         F_ARTICLE.AR_PoidsNet
  PUNET        F_ARTICLE.AR_PUNet ; AR_PRIXVEN = AR_PrixVen
  CODE_CLI/PIECE  F_DOCLIGNE DO_Type=2 (bon de préparation) CT_Num / DO_Piece
  DATECREA     F_ARTICLE.cbCreation
  le reste     infos libres F_ARTICLE (COULEUR, GRAMMAGE, LARGEUR, LONGUEUR, HDIAM,
               MANDRIN, DETAIL, FIBRE, BACK, FINITION, QUALITE, TEINTE, EMPLACEMENT)

Usage :
  python3 import_stock_relais.py            # COMPARE avec la table products (aucune écriture)
  python3 import_stock_relais.py --json f   # + écrit les produits construits dans f
(Pas encore de mode écriture : la bascule se fera après quelques jours de comparaison.)
"""
import json, os, re, sys, urllib.request
from datetime import datetime

PROJECT = "bvcgpdoukhcatjibmvnb"
SQL_URL = f"https://api.supabase.com/v1/projects/{PROJECT}/database/query"

ALL_KEYS = ['quality','color','details','gsm','width','longueur','noyau','weight','price','ref','usine','emplacement','zone','format','image_url','source','reserve_client','reserve_piece','promo','date_arrivee']
HIDDEN_FAMILIES = {'UMAC', 'UMAN', 'WFRA', 'WFRE', 'ECART'}
_AISLE_RE = re.compile(r'^\s*\d{1,3}[A-Z]{1,3}(?:\s*,\s*\d{1,3}[A-Z]{1,3})*\s*$', re.IGNORECASE)


def log(msg):
    print(f"[{datetime.now().strftime('%H:%M:%S')}] {msg}", flush=True)


def _token():
    t = os.environ.get("SUPABASE_MGMT_TOKEN")
    if t:
        return t
    # Poste d'Ethan : réutilise le jeton de ~/bin/prodi-sql
    m = re.search(r'Bearer (sbp_[A-Za-z0-9]+)', open(os.path.expanduser('~/bin/prodi-sql')).read())
    return m.group(1)


def sql(query):
    req = urllib.request.Request(SQL_URL, data=json.dumps({"query": query}).encode(),
        headers={"Authorization": f"Bearer {_token()}", "Content-Type": "application/json",
                 "User-Agent": "prodi-import-relais"})
    with urllib.request.urlopen(req, timeout=180) as r:
        return json.loads(r.read())


# Une ligne par (réf, dépôt) en stock + les infos de l'article. Les BP sont
# pré-agrégés (le join direct sur F_DOCLIGNE dépasse le timeout de l'API).
QUERY = r'''
with st as (
  select s."AR_Ref" ref, s."DE_No", s."AS_QteSto" q, s."DP_NoPrincipal" dp
  from sage."F_ARTSTOCK" s where s."AS_QteSto" > 0
),
bp as (
  select distinct on (l."AR_Ref") l."AR_Ref" ref, l."CT_Num" cli, l."DO_Piece" piece
  from sage."F_DOCLIGNE" l where l."DO_Type" = 2 and l."AR_Ref" in (select ref from st)
  order by l."AR_Ref", l."DO_Date" desc
)
select st.ref, st.q, d."DE_Intitule" depot, e."DP_Code" dp_code,
  a."FA_CodeFamille" fam, f."FA_Intitule" fam_lib,
  a."AR_Langue1" langue1, a."DETAIL" detail, a."FIBRE" fibre, a."BACK" back,
  a."FINITION" finition, a."QUALITE" qualite, a."TEINTE" teinte, a."COULEUR" couleur,
  a."GRAMMAGE" grs, a."LARGEUR" larg, a."LONGUEUR" long, a."HDIAM" hdiam, a."MANDRIN" mandrin,
  a."AR_PoidsNet" pnet, a."AR_PUNet" punet, a."AR_PrixVen" prixven,
  a."EMPLACEMENT" emplacement, a."cbCreation"::date::text datecrea,
  bp.cli, bp.piece
from st
join sage."F_ARTICLE" a on a."AR_Ref" = st.ref
left join sage."F_FAMILLE" f on f."FA_CodeFamille" = a."FA_CodeFamille"
left join sage."F_DEPOT" d on d."DE_No" = st."DE_No"
left join sage."F_DEPOTEMPL" e on e."DP_No" = st.dp
left join bp on bp.ref = st.ref
'''


def clean(v):
    s = str(v).strip() if v is not None else ''
    return s if s and s != '-' else None


def num(v):
    try:
        f = float(v)
        return f if f > 0 else None
    except (TypeError, ValueError):
        return None


def extract_usine(ref_str):
    """Copie de import_stock_ci.py (garder synchro) : 'USINE 287'/'007'/'REF 102' → '287'/'7'/'102'."""
    if ref_str is None: return None
    s = str(ref_str).strip()
    if not s or 'eur' in s.lower(): return None
    m = re.search(r'\bUSINE\s*[A-Z]*\s*(\d+)', s, re.IGNORECASE)
    if m: return str(int(m.group(1)))
    stripped = re.sub(r'^REF\s*', '', s, flags=re.IGNORECASE).strip()
    if re.fullmatch(r'\d+', stripped): return str(int(stripped))
    return None


def build(rows):
    """Même logique métier que parse_dov() de import_stock_ci.py."""
    by_ref = {}
    aberrants = 0
    for r in rows:
        ref = clean(r['ref'])
        if not ref:
            continue
        qty = num(r['q']) or 0
        if ref in by_ref and by_ref[ref][0] >= qty:
            continue
        fam_code = clean(r['fam'])
        fam_lib = clean(r['fam_lib']) or ''
        visible = fam_code not in HIDDEN_FAMILIES and qty > 0
        dp = clean(r['dp_code'])
        zone = dp.upper() if dp and _AISLE_RE.match(dp) else None
        depot = clean(r['depot'])
        emplacement = 'OUR WAREHOUSE' if depot == 'A-PRODI SAINT-OUEN' else depot
        longueur = num(r['long']) or num(r['hdiam'])
        parts = []
        for k in ('langue1', 'detail', 'fibre', 'back', 'finition', 'qualite', 'teinte'):
            v = clean(r[k])
            if v and v.upper() not in (p.upper() for p in parts):
                parts.append(v)
        image_url = f"https://stock.prodi.net/albums/photo/{ref}.jpg" if ref.isdigit() else None
        promo = ref.isdigit() and int(ref) < 900000
        cands = [num(r['punet']), num(r['prixven'])]
        if (fam_code or '')[:1] in ('R', 'S'):
            if any(c > 3 for c in cands if c):
                aberrants += 1
            cands = [c for c in cands if c and c <= 3]
        prix = max([c for c in cands if c], default=None)
        if promo and prix:
            prix = round(prix * 0.7, 4)
        by_ref[ref] = (qty, {
            'ref': f"Photo_{ref}",
            'quality': fam_code,
            'color': clean(r['couleur']),
            'details': ' '.join(parts) or None,
            'gsm': int(num(r['grs']) or 0) or None,
            'width': int(num(r['larg']) or 0) or None,
            'longueur': int(longueur) if longueur else None,
            'noyau': int(num(r['mandrin']) or 0) or None,
            'weight': num(r['pnet']),
            'price': prix,
            'usine': extract_usine(clean(r['emplacement'])),
            'emplacement': emplacement,
            'zone': zone,
            'format': 'Bobine' if fam_lib.startswith('BOB') else 'Palette' if fam_lib.startswith('PAL') else None,
            'image_url': image_url,
            'source': 'email' if visible else 'inventaire',
            'reserve_client': None if promo else clean(r['cli']),
            'reserve_piece': None if promo else clean(r['piece']),
            'promo': promo,
            'date_arrivee': r['datecrea'],
        })
    products = [p for _, p in by_ref.values()]
    log(f"relais : {len(products)} réfs — {sum(p['source']=='email' for p in products)} visibles catalogue"
        + (f", {aberrants} prix aberrants ignorés" if aberrants else ""))
    return products


def _eq(k, a, b):
    if a in (None, '') and b in (None, ''):
        return True
    if k in ('weight', 'price'):
        try:
            return abs(float(a) - float(b)) <= max(0.011, 0.005 * abs(float(b)))
        except (TypeError, ValueError):
            return False
    if k in ('gsm', 'width', 'longueur', 'noyau'):
        try:
            return int(float(a)) == int(float(b))
        except (TypeError, ValueError):
            return False
    return str(a).strip() == str(b).strip()


def compare(new):
    old = sql("select " + ','.join(f"{k}::text" if k == 'date_arrivee' else k for k in ALL_KEYS)
              + ", created_at::text from products")
    imp = max((o['created_at'] for o in old), default='?')
    old_vis = {o['ref']: o for o in old if o['source'] == 'email'}
    new_vis = {p['ref']: p for p in new if p['source'] == 'email'}
    common = old_vis.keys() & new_vis.keys()
    log(f"catalogue actuel (import mail du {imp[:16]}) : {len(old_vis)} visibles — relais : {len(new_vis)}")
    log(f"  communs {len(common)} | seulement relais {len(new_vis.keys()-old_vis.keys())} | seulement mail {len(old_vis.keys()-new_vis.keys())}")
    t_old = sum(float(o['weight'] or 0) for o in old_vis.values()) / 1000
    t_new = sum(float(p['weight'] or 0) for p in new_vis.values()) / 1000
    log(f"  tonnage visible : mail {t_old:,.0f} t | relais {t_new:,.0f} t")
    diffs = {}
    exemples = {}
    for ref in common:
        for k in ALL_KEYS:
            if not _eq(k, new_vis[ref].get(k), old_vis[ref].get(k)):
                diffs[k] = diffs.get(k, 0) + 1
                exemples.setdefault(k, []).append((ref, old_vis[ref].get(k), new_vis[ref].get(k)))
    log("  champs identiques sur les réfs communes :")
    for k in ALL_KEYS:
        n = diffs.get(k, 0)
        log(f"    {k:15s} {100*(len(common)-n)/max(len(common),1):6.2f} %" + (f"  ({n} écarts)" if n else ""))
    return diffs, exemples


if __name__ == '__main__':
    log("=== Import stock depuis le relais Sage (mode COMPARAISON) ===")
    etat = sql('select dernier_passage::text d from sage._miroir_etat order by 1 desc limit 1')
    log(f"dernier passage du relais : {etat[0]['d'][:16] if etat else '?'} (heure de Paris)")
    rows = sql(QUERY)
    products = build(rows)
    if '--json' in sys.argv:
        path = sys.argv[sys.argv.index('--json') + 1]
        json.dump(products, open(path, 'w'), ensure_ascii=False)
        log(f"produits écrits dans {path}")
    diffs, ex = compare(products)
    if '--exemples' in sys.argv:
        for k, l in ex.items():
            print(k, l[:5])
