#!/usr/bin/env python3
"""
Import automatique du stock Prodiconseil depuis le mail quotidien.
- Se connecte à Gmail via IMAP
- Récupère le dernier mail de info@prodi.com (sujet "STOCK DÉTAILLÉ")
- Parse tous les fichiers Excel attachés
- Met à jour la table products dans Supabase

Usage:
  python3 import_stock_auto.py          # import depuis le dernier mail
  python3 import_stock_auto.py --dry    # dry run (affiche sans modifier la base)
"""

import imaplib, email, os, sys, json, re, tempfile, subprocess
from datetime import datetime
from collections import defaultdict

# ── CONFIG ──
IMAP_HOST = "imap.gmail.com"
IMAP_USER = "eelbilia@gmail.com"
IMAP_PASS = "wbhy hljt xflf zibm"
SENDER = "info@prodi.com"

SUPABASE_URL = "https://bvcgpdoukhcatjibmvnb.supabase.co"
ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJ2Y2dwZG91a2hjYXRqaWJtdm5iIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzIyNzg5MjgsImV4cCI6MjA4Nzg1NDkyOH0.Ip3ykSUS9sajTH04yXBerOG1haBKMD1kAvMQNjnGL1Q"
MGMT_TOKEN = "sbp_8bbc7fb2723ae1f9fd33b8b3eed4fff4e7656a28"

ALL_KEYS = ['quality','color','details','gsm','width','longueur','noyau','weight','price','ref','usine','emplacement','format','image_url']

DRY_RUN = '--dry' in sys.argv

# ── HELPERS ──
def log(msg):
    print(f"[{datetime.now().strftime('%H:%M:%S')}] {msg}")

def parse_price(val):
    if val is None: return None
    if isinstance(val, (int, float)): return float(val)
    s = str(val).strip()
    m = re.match(r'(\d+(?:\.\d+)?)', s.replace(',', '.'))
    return float(m.group(1)) if m else None

def extract_usine(ref_str):
    if ref_str is None: return None
    s = str(ref_str).strip()
    if not s or 'eur' in s.lower(): return None
    m = re.search(r'USINE\s*(\d+)', s, re.IGNORECASE)
    return m.group(1) if m else (s if s else None)

# ── STEP 1: FETCH EMAIL ──
def fetch_latest_stock_email():
    log("Connexion IMAP...")
    mail = imaplib.IMAP4_SSL(IMAP_HOST, 993)
    mail.login(IMAP_USER, IMAP_PASS)
    mail.select('INBOX')

    status, msgs = mail.search(None, f'(FROM "{SENDER}")')
    msg_ids = msgs[0].split()
    if not msg_ids:
        log("Aucun mail de stock trouvé")
        mail.logout()
        return None, None

    latest_id = msg_ids[-1]
    status, data = mail.fetch(latest_id, '(RFC822)')
    msg = email.message_from_bytes(data[0][1])

    date_str = msg.get('Date', '')
    log(f"Dernier mail: {msg.get('Subject', '?')} — {date_str}")

    # Extract attachments to temp dir
    tmpdir = tempfile.mkdtemp(prefix='prodi_stock_')
    attachments = []
    for part in msg.walk():
        if part.get_content_disposition() == 'attachment':
            fname = part.get_filename()
            if fname and fname.endswith('.xlsx'):
                fpath = os.path.join(tmpdir, fname)
                with open(fpath, 'wb') as f:
                    f.write(part.get_payload(decode=True))
                attachments.append(fpath)

    log(f"Pièces jointes Excel: {len(attachments)}")
    mail.logout()
    return tmpdir, attachments

# ── STEP 2: PARSE EXCEL FILES ──
def parse_all_files(files):
    import openpyxl

    all_products = []

    for fp in files:
        try:
            wb = openpyxl.load_workbook(fp, read_only=False, data_only=True)
        except:
            continue
        ws = wb.active
        rows_raw = list(ws.iter_rows(values_only=True))
        if not rows_raw:
            wb.close()
            continue

        first_vals = [str(v).strip() if v else '' for v in rows_raw[0]]

        if 'Référence' in first_vals:
            for row in rows_raw[1:]:
                if row[0] is None and row[1] is None: continue
                quality = str(row[1]).strip() if row[1] else None
                if not quality: continue
                ref_val = str(row[0]).strip() if row[0] else None
                all_products.append({
                    'ref': f"Photo_{ref_val}" if ref_val else None,
                    'quality': quality,
                    'color': str(row[2]).strip() if row[2] else None,
                    'details': str(row[3]).strip() if row[3] else None,
                    'gsm': int(row[5]) if row[5] and row[5] != 0 else None,
                    'width': int(row[6]) if row[6] else None,
                    'longueur': int(row[7]) if row[7] and row[7] != 0 else None,
                    'noyau': int(row[9]) if row[9] and row[9] != 0 else None,
                    'weight': float(row[10]) if row[10] else None,
                    'price': parse_price(row[11]),
                    'usine': extract_usine(str(row[13]).strip() if row[13] else None),
                    'emplacement': str(row[14]).strip() if row[14] else None,
                    'format': 'Palette' if quality.startswith('S') else 'Bobine',
                })
        else:
            header_idx = header_row = None
            for i, row in enumerate(rows_raw):
                vals = [str(v).strip().lower() if v else '' for v in row]
                if 'qualité' in vals:
                    header_idx, header_row = i, row
                    break
            if header_idx is None:
                wb.close()
                continue

            col_map = {}
            for ci, cv in enumerate(header_row):
                if cv is None: continue
                s = str(cv).strip().lower()
                if 'qualit' in s and 'ref' not in s: col_map['quality'] = ci
                elif 'couleur' in s: col_map['color'] = ci
                elif 'detail' in s: col_map['details'] = ci
                elif s.startswith('gr') and len(s) <= 3: col_map['gsm'] = ci
                elif 'laize' in s: col_map['width'] = ci
                elif 'longueur' in s: col_map['longueur'] = ci
                elif 'mandrin' in s: col_map['noyau'] = ci
                elif 'poids' in s: col_map['weight'] = ci
                elif 'depart' in s or 'exwork' in s: col_map['price'] = ci
                elif 'ref' in s and 'qualit' in s: col_map['usine'] = ci
                elif 'emplacement' in s: col_map['emplacement'] = ci

            def g(row, key):
                idx = col_map.get(key)
                if idx is None or idx >= len(row): return None
                return row[idx]

            for row in rows_raw[header_idx+2:]:
                if len(row) < 5: continue
                quality = g(row, 'quality')
                if quality: quality = str(quality).strip()
                if not quality: continue
                ref_photo = str(row[0]).strip() if row[0] else None
                gsm_val = g(row,'gsm'); width_val = g(row,'width'); long_val = g(row,'longueur')
                noyau_val = g(row,'noyau'); weight_val = g(row,'weight')
                all_products.append({
                    'ref': ref_photo,
                    'quality': quality,
                    'color': str(g(row,'color')).strip() if g(row,'color') else None,
                    'details': str(g(row,'details')).strip() if g(row,'details') else None,
                    'gsm': int(gsm_val) if gsm_val and isinstance(gsm_val,(int,float)) else None,
                    'width': int(width_val) if width_val and isinstance(width_val,(int,float)) else None,
                    'longueur': int(long_val) if long_val and isinstance(long_val,(int,float)) and long_val != 0 else None,
                    'noyau': int(noyau_val) if noyau_val and isinstance(noyau_val,(int,float)) and noyau_val != 0 else None,
                    'weight': float(weight_val) if weight_val and isinstance(weight_val,(int,float)) else None,
                    'price': parse_price(g(row,'price')),
                    'usine': extract_usine(str(g(row,'usine')).strip() if g(row,'usine') else None),
                    'emplacement': str(g(row,'emplacement')).strip() if g(row,'emplacement') else None,
                    'format': 'Bobine' if quality.startswith('R') else 'Palette',
                })
        wb.close()

    # Fix refs
    for p in all_products:
        if p['ref']:
            while 'Photo_Photo_' in p['ref']: p['ref'] = p['ref'].replace('Photo_Photo_','Photo_')
            if not p['ref'].startswith('Photo_'): p['ref'] = 'Photo_' + p['ref']

    all_products = [p for p in all_products if p['quality'] not in ('GRIS / GREY',)]
    all_products = [p for p in all_products if not (p['color'] and p['color'].replace('.','').isdigit())]

    # Dedup by ref
    by_ref = defaultdict(list)
    for p in all_products: by_ref[p['ref']].append(p)
    deduped = [max(variants, key=lambda p: sum(1 for v in p.values() if v is not None)) for variants in by_ref.values()]

    # Extract image URLs from hyperlinks
    log("Extraction des URLs photos...")
    ref_to_url = {}
    for fp in files:
        try:
            import openpyxl as oxl
            wb2 = oxl.load_workbook(fp, read_only=False, data_only=False)
        except: continue
        ws2 = wb2.active
        for row in ws2.iter_rows(min_row=1):
            cell = row[0]
            if cell.hyperlink and cell.hyperlink.target and 'stock.prodi.net' in str(cell.hyperlink.target):
                ref_val = str(cell.value).strip() if cell.value else None
                if ref_val and ref_val != 'To view picture click here':
                    key = f"Photo_{ref_val}"
                    while 'Photo_Photo_' in key: key = key.replace('Photo_Photo_','Photo_')
                    ref_to_url[key] = cell.hyperlink.target
        wb2.close()

    img_count = 0
    for p in deduped:
        if p['ref'] in ref_to_url:
            p['image_url'] = ref_to_url[p['ref']]; img_count += 1
        else:
            p['image_url'] = None

    # Uniform keys
    for p in deduped:
        for k in ALL_KEYS:
            if k not in p: p[k] = None
        for k in list(p.keys()):
            if k not in ALL_KEYS: del p[k]

    w = sum(1 for p in deduped if p['weight'] is not None)
    log(f"Produits: {len(deduped)}, avec poids: {w}, avec photo: {img_count}")
    return deduped

# ── STEP 3: UPDATE SUPABASE ──
def update_supabase(products):
    if DRY_RUN:
        log("DRY RUN — aucune modification en base")
        return

    log("Suppression des anciens produits...")
    subprocess.run(['curl','-s','-o','/dev/null','-X','DELETE',
        f'{SUPABASE_URL}/rest/v1/products?id=gt.0',
        '-H',f'apikey: {ANON_KEY}','-H',f'Authorization: Bearer {ANON_KEY}',
        '-H','Prefer: return=minimal'], capture_output=True)

    BATCH = 500
    total = len(products)
    success = errors = 0
    for i in range(0, total, BATCH):
        batch = products[i:i+BATCH]
        tmpfile = '/tmp/prodi_batch.json'
        with open(tmpfile,'w') as f: json.dump(batch, f, ensure_ascii=False)
        result = subprocess.run(['curl','-s','-w','%{http_code}','-X','POST',
            f'{SUPABASE_URL}/rest/v1/products',
            '-H',f'apikey: {ANON_KEY}','-H',f'Authorization: Bearer {ANON_KEY}',
            '-H','Content-Type: application/json','-H','Prefer: return=minimal',
            '-d','@/tmp/prodi_batch.json'], capture_output=True, text=True)
        code = result.stdout[-3:]
        if code == '201':
            success += len(batch)
        else:
            errors += len(batch)
            log(f"  ERREUR batch {i//BATCH+1}: {result.stdout[:-3][:200]}")

    log(f"Insertion: {success} OK, {errors} erreurs")

    # Re-apply zones from correction_zone.xlsx if it exists
    zone_file = "/Users/tantan/Desktop/dossier sans titre 2/correction_zone.xlsx"
    if os.path.exists(zone_file):
        log("Application des zones/allées...")
        import openpyxl
        wb = openpyxl.load_workbook(zone_file, read_only=True, data_only=True)
        ws = wb.active
        ref_zone = {}
        for row in ws.iter_rows(min_row=2, values_only=True):
            ref, famille, zone, corr_zone, c_zone, coul = row
            if not ref: continue
            ref_str = str(ref).strip()
            if c_zone == 'OK' and corr_zone:
                ref_zone[ref_str] = str(corr_zone).strip()
            elif zone:
                ref_zone[ref_str] = str(zone).strip()
        wb.close()

        SQL_URL = "https://api.supabase.com/v1/projects/bvcgpdoukhcatjibmvnb/database/query"
        refs_list = list(ref_zone.items())
        for i in range(0, len(refs_list), 500):
            batch = refs_list[i:i+500]
            cases = []
            where_refs = []
            for ref, zone in batch:
                zone_escaped = zone.replace("'", "''")
                photo_ref = f"Photo_{ref}"
                cases.append(f"WHEN ref = '{photo_ref}' THEN '{zone_escaped}'")
                where_refs.append(f"'{photo_ref}'")
            sql = f"UPDATE products SET zone = CASE {' '.join(cases)} ELSE zone END WHERE ref IN ({','.join(where_refs)});"
            subprocess.run(['curl','-s','-X','POST', SQL_URL,
                '-H',f'Authorization: Bearer {MGMT_TOKEN}',
                '-H','Content-Type: application/json',
                '-d', json.dumps({"query": sql})], capture_output=True)
        log(f"Zones appliquées: {len(ref_zone)} refs")

# ── MAIN ──
if __name__ == '__main__':
    log("=== Import stock Prodiconseil ===")
    tmpdir, files = fetch_latest_stock_email()
    if not files:
        log("Aucun fichier à traiter")
        sys.exit(0)

    products = parse_all_files(files)
    update_supabase(products)

    # Cleanup
    import shutil
    shutil.rmtree(tmpdir, ignore_errors=True)

    log(f"=== Terminé ! {len(products)} produits importés ===")
