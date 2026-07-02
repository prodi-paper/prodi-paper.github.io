#!/usr/bin/env python3
"""
TEST LOCAL — import du stock depuis le NOUVEAU fichier export Sage (INV_toutarticle.xlsx).
NE TOUCHE À RIEN : pas de Gmail, pas de Supabase. Sort un preview_products.json +
un rapport « où ça bloque ». But : reproduire au mieux le catalogue actuel avec la
nouvelle source, et repérer les problèmes AVANT de toucher au site live.

Usage:
  python3 scripts/import_stock_local_test.py /chemin/INV_toutarticle.xlsx
"""
import sys, re, json
from collections import Counter, defaultdict
import openpyxl

SRC = sys.argv[1] if len(sys.argv) > 1 else "/Users/tantan/Desktop/INV_toutarticle.xlsx"

ALL_KEYS = ['quality','color','details','gsm','width','longueur','noyau','weight',
            'price','ref','usine','emplacement','zone','format','image_url']

# Familles à exclure (machines, frais, écarts) — demande client.
EXCL_FAM = {'UMAC','UMAN','WFRA','WFRE','ECART'}

# Couleur FR -> bilingue (reconstruit depuis le catalogue actuel). Fallback = FR seul.
COLOR_MAP = {
 'ARGENT':'ARGENT / SILVER','BLANC':'BLANC / WHITE','BLANC NATURE':'BLANC NATURE / NATURAL WHITE',
 'BLEU':'BLEU / BLUE','BLEU FONCÉ':'BLEU FONCÉ / DARK BLUE','BRUN':'BRUN / BROWN',
 'BRUN FONCE':'BRUN FONCE / DARK BROWN','BULLE':'BULLE/BUBBLE','CREME':'CREME / CREAMS',
 'DIVERS':'DIVERS / VARIOUS','DORE':'GOLD/DORE','GRIS':'GRIS / GREY','IVOIRE':'IVOIRE / IVORY',
 'JAUNE':'JAUNE / YELLOW','NOIR':'NOIR / BLACK','ORANGE':'ORANGE / ORANGE','ROSE':'ROSE / PINK',
 'ROUGE':'ROUGE / RED','SAUMON':'SAUMON / SALMON','TRES BLANC':'TRES BLANC / VERY WHITE',
 'TRÈS BLANC':'TRÈS BLANC / VERY WHITE','VERT':'VERT / GREEN','VIOLET':'VIOLET / PURPLE',
 'ALU/ ARGENT':'ALU/ ARGENT','CHAMOIS':'CHAMOIS','TRANSPARENT':'TRANSPARENT',
}

def num(x):
    try: return float(str(x).replace(',', '.'))
    except: return 0.0

def iznum(x):
    v = num(x)
    return int(v) if v and v == int(v) else (int(v) if v else None)

def extract_usine(s):
    if not s: return None
    m = re.search(r'\bUSINE\s*[A-Z]*\s*(\d+)', str(s), re.IGNORECASE)
    return str(int(m.group(1))) if m else None

_AISLE = re.compile(r'^\s*\d{1,3}[A-Z]{1,3}(?:\s*,\s*\d{1,3}[A-Z]{1,3})*\s*$', re.IGNORECASE)
def is_aisle(v):
    return bool(v) and bool(_AISLE.match(str(v).strip()))

def clean(v):
    s = "" if v is None else str(v).strip()
    return "" if s in ("", "-", "0") else s

def main():
    wb = openpyxl.load_workbook(SRC, read_only=True, data_only=True)
    ws = wb["DOV_export"]
    it = ws.iter_rows(min_row=1, values_only=True)
    hdr = [(str(h).strip().strip('"') if h is not None else "") for h in next(it)]
    H = {h: i for i, h in enumerate(hdr)}
    def g(row, name):
        i = H.get(name)
        return row[i] if i is not None and i < len(row) else None

    report = Counter()
    unknown_colors = Counter()
    products = []

    for row in it:
        report['total'] += 1
        ref = str(g(row, 'REF') or "").strip()
        code_fam = str(g(row, 'CODE_FAM') or "").strip().upper()
        # ── FILTRES ──
        if num(g(row, 'QTSTO')) <= 0:        report['skip_stock0'] += 1; continue
        if code_fam in EXCL_FAM:             report['skip_famille'] += 1; continue
        if ref.upper().startswith('DU'):     report['skip_siderun_DU'] += 1; continue
        if not ref:                          report['skip_sans_ref'] += 1; continue
        if not code_fam:                     report['skip_sans_qualite'] += 1; continue

        is_fab = ref.upper().startswith('FAB')
        is_bobine = code_fam.startswith('R')

        # ── COULEUR (bilingue) ──
        coul_fr = str(g(row, 'COULEUR') or "").strip().upper()
        if coul_fr and coul_fr not in COLOR_MAP and coul_fr != '-':
            unknown_colors[coul_fr] += 1
        color = COLOR_MAP.get(coul_fr, coul_fr) if coul_fr and coul_fr != '-' else None

        # ── DÉTAILS (composite propre, sans le texte "fabrication") ──
        qual_grade = clean(g(row, 'QUALITE'))
        if 'FABRICATION' in qual_grade.upper():
            qual_grade = ""  # pas de texte FAB dans le détail (c'est la photo qui le dit)
        parts = [clean(g(row, 'DETAIL')), clean(g(row, 'BACK')), qual_grade,
                 clean(g(row, 'FINITION')), clean(g(row, 'FIBRE'))]
        details = " ".join(p for p in parts if p) or None

        # ── EMPLACEMENT / ZONE ──
        dp = str(g(row, 'DP_CODE') or "").strip()
        if is_fab:
            emplacement, zone = "FAB DEPART ST OUEN", None
        elif is_aisle(dp):
            emplacement, zone = "OUR WAREHOUSE", dp.upper()
        else:
            emplacement, zone = (str(g(row, 'NOM_DEPOT') or "").strip() or None), None

        # ── PRIX (AR_PRIXVEN en €/kg → ×1000) ──
        pv = num(g(row, 'AR_PRIXVEN'))
        price = round(pv * 1000, 2) if pv > 0 else None

        p = {
            'ref': 'Photo_' + ref,
            'quality': code_fam,
            'color': color,
            'details': details,
            'gsm': iznum(g(row, 'GRS')),
            'width': iznum(g(row, 'LARG')),
            'longueur': iznum(g(row, 'HDIAM')) if is_bobine else iznum(g(row, 'LONG')),
            'noyau': iznum(g(row, 'MANDRIN')),
            'weight': (num(g(row, 'PNET')) or None),
            'price': price,
            'usine': extract_usine(g(row, 'EMPLACEMENT')),
            'emplacement': emplacement,
            'zone': zone,
            'format': 'Bobine' if is_bobine else 'Palette',
            'image_url': f"https://stock.prodi.net/albums/photo/{ref}.jpg",
        }
        products.append(p)

    # ── Dédup par ref + exclusions héritées ──
    seen = {}
    for p in products:
        seen[p['ref']] = p
    products = list(seen.values())
    products = [p for p in products if p['quality'] not in ('GRIS / GREY',)]
    products = [p for p in products if not (p['color'] and str(p['color']).replace('.', '').isdigit())]

    # normalisation ALL_KEYS
    for p in products:
        for k in list(p):
            if k not in ALL_KEYS: del p[k]
        for k in ALL_KEYS:
            p.setdefault(k, None)

    # ── RAPPORT ──
    miss = lambda k: sum(1 for p in products if p[k] in (None, ""))
    print("=" * 60)
    print(f"SOURCE : {SRC}")
    print(f"Lignes lues : {report['total']}")
    for k in ['skip_stock0','skip_famille','skip_siderun_DU','skip_sans_ref','skip_sans_qualite']:
        if report[k]: print(f"  écartées {k:18}: {report[k]}")
    print(f"\n>>> PRODUITS RETENUS : {len(products)}")
    print(f"\nChamps VIDES (sur {len(products)}) :")
    for k in ALL_KEYS:
        n = miss(k)
        if n: print(f"   {k:12}: {n} vides ({100*n//len(products)}%)")
    fab = sum(1 for p in products if p['ref'].startswith('Photo_FAB'))
    print(f"\nFAB (réf FAB)            : {fab}")
    print(f"En allée (zone)          : {sum(1 for p in products if p['zone'])}")
    print(f"OUR WAREHOUSE            : {sum(1 for p in products if p['emplacement']=='OUR WAREHOUSE')}")
    print(f"Prix renseigné           : {sum(1 for p in products if p['price'])}")
    if unknown_colors:
        print(f"\n⚠️  COULEURS NON TRADUITES ({len(unknown_colors)}) — fallback FR seul :")
        for col, n in unknown_colors.most_common(15):
            print(f"   {col!r:25} x{n}")
    print("\nÉCHANTILLON (5) :")
    for p in products[:5]:
        print(f"   {p['ref']:14} {p['quality']:7} {str(p['gsm']):>4}g {str(p['width']):>5}x{str(p['longueur']):<5} "
              f"{str(p['color'])[:22]:22} z={p['zone']} | {str(p['details'])[:40]}")

    out = "scripts/preview_products.json"
    json.dump(products, open(out, 'w'), ensure_ascii=False, indent=1)
    print(f"\n💾 {len(products)} produits → {out}  (AUCUNE écriture Supabase)")

if __name__ == '__main__':
    main()
