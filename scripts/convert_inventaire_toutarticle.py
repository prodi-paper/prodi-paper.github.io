#!/usr/bin/env python3
"""Convertit l'export DOV complet (INV_toutarticle.xlsx) en complément catalogue
pour l'inventaire → scripts/inventaire_complement.json (committé).

Pourquoi : le stock email quotidien est incomplet (~5 900 réfs) ; l'export DOV
contient TOUT l'ERP (~9 200 réfs). Pendant l'inventaire physique, les réfs hors
stock email finissaient « à vérifier ». L'import quotidien réinsère ce complément
(source='inventaire') après le remplacement de la table — voir import_stock_ci.py.

Le JSON est un instantané : quand un export DOV plus frais arrive, relancer :
    python3 scripts/convert_inventaire_toutarticle.py <chemin_export.xlsx>

Mapping colonnes DOV → products (vérifié colonne par colonne, 2026-07-02) :
    REF        → ref (brut, sans préfixe Photo_ — le scan et le trigger
                 d'automatch de l'app inventaire gèrent les deux formes)
    CODE_FAM   → quality (50/55 codes déjà dans le lexique de l'app)
    FAM        → format (BOB.* → Bobine, PAL.* → Palette, sinon null)
    COULEUR    → color
    AR_Langue1 + DETAIL/FIBRE/BACK/FINITION/QUALITE/TEINTE → details
                 (concaténés : le parseur de chips de l'app inventaire matche
                 ce vocabulaire — DOS CREME, 100% RECYCLE, CIE 160, MG - VERGE…)
    GRS/LARG/LONG/MANDRIN/PNET → gsm/width/longueur/noyau/weight
    PUNET      → price
    DP_CODE    → zone (si format allée, ex 6KD / 11CG — ~70 % des lignes)
    EMPLACEMENT→ usine (code extrait de « USINE 421 »)
    NOM_DEPOT  → emplacement (A-PRODI SAINT-OUEN → OUR WAREHOUSE, cohérent
                 avec le filtre NOTRE DÉPÔT de l'import email)
    image_url  → null (pas de photo dans le DOV ; comblable au scan)
    source     → 'inventaire' (filtré du catalogue B2B public)

Doublons de REF (~37) : on garde la ligne avec la plus grosse QTSTO.
"""
import json
import os
import re
import sys

import openpyxl

HERE = os.path.dirname(os.path.abspath(__file__))
OUT_PATH = os.path.join(HERE, 'inventaire_complement.json')
DEFAULT_SRC = os.path.expanduser('~/Desktop/INV_toutarticle.xlsx')

# Mêmes règles que import_stock_ci.py (garder synchro).
_AISLE_RE = re.compile(r'^\s*\d{1,3}[A-Z]{1,3}(?:\s*,\s*\d{1,3}[A-Z]{1,3})*\s*$', re.IGNORECASE)
_USINE_RE = re.compile(r'\bUSINE\s*[A-Z]*\s*(\d+)', re.IGNORECASE)


def clean(v):
    if v is None:
        return None
    s = str(v).strip()
    return s if s and s != '-' else None


def num(v):
    try:
        f = float(v)
        return f if f > 0 else None
    except (TypeError, ValueError):
        return None


def main():
    src = sys.argv[1] if len(sys.argv) > 1 else DEFAULT_SRC
    wb = openpyxl.load_workbook(src, read_only=True, data_only=True)
    ws = wb.active
    rows = ws.iter_rows(values_only=True)
    header = [str(h).strip().strip('"') if h else '' for h in next(rows)]
    idx = {h: i for i, h in enumerate(header)}

    def g(row, col):
        i = idx.get(col)
        return row[i] if i is not None and i < len(row) else None

    by_ref = {}
    total = 0
    for row in rows:
        ref = clean(g(row, 'REF'))
        if not ref:
            continue
        total += 1
        qty = num(g(row, 'QTSTO')) or 0
        if ref in by_ref and by_ref[ref][0] >= qty:
            continue

        fam = clean(g(row, 'FAM')) or ''
        fmt = 'Bobine' if fam.startswith('BOB') else 'Palette' if fam.startswith('PAL') else None

        dp = clean(g(row, 'DP_CODE'))
        zone = dp.upper() if dp and _AISLE_RE.match(dp) else None

        empl_raw = clean(g(row, 'EMPLACEMENT'))
        m = _USINE_RE.search(empl_raw or '')
        usine = str(int(m.group(1))) if m else None

        depot = clean(g(row, 'NOM_DEPOT'))
        emplacement = 'OUR WAREHOUSE' if depot == 'A-PRODI SAINT-OUEN' else depot

        # details = désignation + champs structurés, dédupliqués : le parseur de
        # chips de l'app scanne ce texte (vocabulaire identique à listes.ts).
        parts = []
        for col in ('AR_Langue1', 'DETAIL', 'FIBRE', 'BACK', 'FINITION', 'QUALITE', 'TEINTE'):
            v = clean(g(row, col))
            if v and v.upper() not in (p.upper() for p in parts):
                parts.append(v)
        details = ' '.join(parts) or None

        gsm = num(g(row, 'GRS'))
        by_ref[ref] = (qty, {
            'ref': ref,
            'quality': clean(g(row, 'CODE_FAM')),
            'color': clean(g(row, 'COULEUR')),
            'details': details,
            'gsm': int(gsm) if gsm else None,
            'width': int(num(g(row, 'LARG')) or 0) or None,
            'longueur': int(num(g(row, 'LONG')) or 0) or None,
            'noyau': int(num(g(row, 'MANDRIN')) or 0) or None,
            'weight': num(g(row, 'PNET')),
            'price': num(g(row, 'PUNET')),
            'usine': usine,
            'emplacement': emplacement,
            'zone': zone,
            'format': fmt,
            'image_url': None,
            'source': 'inventaire',
        })
    wb.close()

    products = [p for _, p in by_ref.values()]
    with open(OUT_PATH, 'w') as f:
        json.dump(products, f, ensure_ascii=False, indent=None, separators=(',', ':'))

    zones = sum(1 for p in products if p['zone'])
    print(f"{total} lignes lues → {len(products)} réfs uniques ({zones} avec allée) → {OUT_PATH}")


if __name__ == '__main__':
    main()
