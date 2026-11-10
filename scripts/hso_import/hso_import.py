#!/usr/bin/env python3
"""Lots HORS ST-OUEN (10/11/2026 Ethan) : offres usine de la Dropbox + offres
envoyées par mail (Véronique / vente@) → table Supabase lots_hso → catalogue
prodi.com, case « Stock hors St-Ouen », affichés PAR LOT (1 offre = 1 lot).

Sources :
  1. Dropbox  /0_AAA  HORS  SAINT  OUEN … (id fixe, le dossier change de nom),
     hors sous-dossiers « anciennes offres ».
  2. Gmail eelbilia (Ethan en copie des listes) : de ve@ / vente@prodi.com,
     objet « OFFRE … » (après Fwd:/[liste]), Excel joint.

Lecture : l'IA ne fait QUE repérer la feuille, la ligne d'en-tête et les
colonnes (+ titre/usine/date) ; les valeurs sont lues par Python dans les
cellules → aucun chiffre inventé. Résultat mis en cache par hash du fichier.
Un lot (usine × famille × forme) n'est montré qu'en DERNIÈRE version, et
seulement si reçue depuis le 01/09/2026 et datée de juin 2026 ou après.

Usage : python hso_import.py [--dry] [--limit N] [--only mail|dropbox]
Env   : ~/.hso_import.env (ANTHROPIC_API_KEY, SUPABASE_URL, SUPABASE_SERVICE_ROLE,
        GMAIL_USER, GMAIL_PASS) ; jeton Dropbox via ~/bin/dbx-token.
"""
import argparse, datetime as dt, email, hashlib, imaplib, io, json, os, re, subprocess, sys, urllib.request, urllib.error
from email.header import decode_header
import openpyxl
from openpyxl.utils import get_column_letter, column_index_from_string

DBX_DIR = 'id:sPT49Yi5p4gAAAAAAAApoQ'
DEPUIS = '2026-09-01'      # fichier reçu / modifié depuis
PLANCHER = '2026-06-01'    # … et offre datée d'au moins cette date (une offre de juillet renvoyée en septembre compte)
MODEL = 'claude-sonnet-5-5'
CACHE = os.path.expanduser('~/.cache/hso_import')
DEPOT_RE = re.compile(r'OUR WAREHOUSE|SAINT[- ]?OUEN|\bST[- ]?OUEN', re.I)
FAMILLES = ['OFFSET', 'COUCHE_1F', 'COUCHE_2F', 'LWC', 'PAPIER_MINCE', 'BRISTOL', 'BOUFFANT', 'JOURNAL',
            'AUTOCOPIANT', 'ADHESIF', 'KRAFT_BRUN', 'KRAFT_BLANC', 'KRAFT_INGRAISSABLE', 'CRISTAL',
            'CARTON_SBS', 'CARTON_GC', 'CARTON_GD', 'CARTON_GT', 'CARTON_GRIS', 'CARTON_GOBELET',
            'LINER_FLUTING', 'PAPIER_LUXE', 'PAPIER_CADEAU', 'PAPIER_COULEUR', 'AUTRE']

ENV = dict(re.findall(r'^([A-Z_]+)=(.*)$', open(os.path.expanduser('~/.hso_import.env')).read(), re.M))
os.makedirs(CACHE, exist_ok=True)


def http(url, data=None, headers=None, method=None):
    req = urllib.request.Request(url, data=data, headers=headers or {}, method=method)
    try:
        with urllib.request.urlopen(req, timeout=180) as r:
            return r.read()
    except urllib.error.HTTPError as e:
        raise RuntimeError(f'{e.code} {url[:80]} {e.read()[:300]!r}')


# ── Sources ────────────────────────────────────────────────────────────────
def dropbox_files():
    tok = subprocess.check_output([os.path.expanduser('~/bin/dbx-token')], text=True).strip()
    H = {'Authorization': 'Bearer ' + tok, 'Content-Type': 'application/json'}
    api = lambda ep, d: json.loads(http('https://api.dropboxapi.com/2/files/' + ep, json.dumps(d).encode(), H))
    r = api('list_folder', {'path': DBX_DIR, 'recursive': True, 'limit': 2000})
    ents = r['entries']
    while r['has_more']:
        r = api('list_folder/continue', {'cursor': r['cursor']}); ents += r['entries']
    for e in ents:
        if e['.tag'] != 'file' or not re.search(r'\.xlsx$', e['name'], re.I) or e['name'].startswith('~$'):
            continue
        if 'ancienne' in e['path_lower'] or 'modele' in e['path_lower'] or 'modèle' in e['path_lower']:
            continue
        if max(e['client_modified'], e['server_modified']) < DEPUIS:
            continue
        def get(e=e):
            return http('https://content.dropboxapi.com/2/files/download', headers={
                'Authorization': 'Bearer ' + tok, 'Dropbox-API-Arg': json.dumps({'path': e['id']}).encode('ascii', 'backslashreplace').decode()})
        yield {'source': 'dropbox', 'source_ref': e['path_display'], 'fichier': e['name'],
               'recu_le': e['client_modified'], 'hash': e['content_hash'], 'get': get, 'contexte': e['path_display']}


def dh(x):
    return ''.join((t.decode(c or 'utf8', 'replace') if isinstance(t, bytes) else t) for t, c in decode_header(x or ''))


def mail_files():
    m = imaplib.IMAP4_SSL('imap.gmail.com', 993)
    m.login(ENV['GMAIL_USER'], ENV['GMAIL_PASS'])
    m.select('"[Gmail]/Tous les messages"', readonly=True)
    q = f'(from:ve@prodi.com OR from:vente@prodi.com) filename:xlsx after:{DEPUIS.replace("-", "/")}'
    ids = m.search(None, 'X-GM-RAW', '"' + q + '"')[1][0].split()
    for i in ids:
        msg = email.message_from_bytes(m.fetch(i, '(BODY.PEEK[])')[1][0][1])
        subj = re.sub(r'\s+', ' ', dh(msg['Subject']))
        core = re.sub(r'^\s*((fwd?|tr|re)\s*:\s*|\[[^\]]*\]\s*|\]\s*)+', '', subj, flags=re.I)
        if not re.match(r'offre\b', core, re.I):
            continue  # mails internes (« merci de préparer… », « Filtrer… »)
        date = email.utils.parsedate_to_datetime(msg['Date']).isoformat()
        for p in msg.walk():
            fn = dh(p.get_filename() or '').replace('\n', ' ').replace('\r', '')
            if not re.search(r'\.xlsx$', fn, re.I):
                continue
            raw = p.get_payload(decode=True)
            yield {'source': 'mail', 'source_ref': (msg['Message-ID'] or '').strip(), 'fichier': fn,
                   'recu_le': date, 'hash': hashlib.sha256(raw).hexdigest(), 'get': (lambda raw=raw: raw),
                   'contexte': 'Mail : ' + core}
    m.logout()


# ── Lecture du classeur ────────────────────────────────────────────────────
def cell_txt(v):
    if v is None:
        return ''
    if isinstance(v, (dt.datetime, dt.date)):
        return v.strftime('%Y-%m-%d')
    return re.sub(r'\s+', ' ', str(v)).strip()


def dump_wb(wb, max_rows=45):
    out = []
    for ws in wb.worksheets[:4]:
        if ws.sheet_state != 'visible':
            continue
        out.append(f'### FEUILLE « {ws.title} » ({ws.max_row} lignes)')
        n = 0
        for r in ws.iter_rows(min_row=1, max_row=min(ws.max_row, 400)):
            cells = [f'{c.column_letter}={cell_txt(c.value)[:40]}' for c in r if cell_txt(c.value)]
            if cells:
                out.append(f'L{r[0].row}: ' + ' | '.join(cells)); n += 1
            if n >= max_rows:
                break
    return '\n'.join(out)[:24000]


PROMPT = """Tu analyses une offre de papier/carton d'un négociant (Prodiconseil / Woluwe Paper).
Contexte : {ctx}
Fichier : {fn}

Cellules (L=ligne, lettre=colonne) :
{dump}

Réponds UNIQUEMENT par un JSON :
{{
 "est_offre": true si c'est une offre de lots avec une ligne par lot/palette/bobine (poids par ligne) ; false si lexique, modèle vide, calculette, archive interne, offre globale multi-produits, ou stock du dépôt de Saint-Ouen,
 "raison": "courte si false",
 "feuille": "nom de la feuille des lots",
 "ligne_entete": n, "premiere_ligne": n (1re ligne de données),
 "cols": {{"emplacement":"lettre|null","couleur":"…","detail":"…","finition":"…","gsm":"…","laize":"…","longueur":"…","diametre":"…","mandrin":"…","nb":"…(nb bobines/palettes)","poids":"…(poids)","prix":"…(prix départ usine)"}},
 "unites": {{"laize":"mm|cm","longueur":"mm|cm","poids":"kg|t"}},
 "titre": "titre FR court, ex. Papier couché 1 face en format",
 "titre_en": "English title",
 "famille": une de {familles},
 "forme": "Bobine|Format|Mixte",
 "usine": "n° usine/REF sans le mot (ex 158), null si absent",
 "date_offre": "AAAA-MM-JJ (date dans le fichier, sinon dans le nom de fichier, sinon null)",
 "lieu": "lieu de stockage/port si indiqué (ex Anvers), sinon null",
 "prix_txt": "prix départ usine tel qu'écrit si unique (ex 890 €/t), sinon null"
}}"""


def ask_llm(fn, ctx, dump):
    body = {'model': MODEL, 'max_tokens': 1500,
            'messages': [{'role': 'user', 'content': PROMPT.format(ctx=ctx, fn=fn, dump=dump, familles=FAMILLES)}]}
    r = json.loads(http('https://api.anthropic.com/v1/messages', json.dumps(body).encode(), {
        'x-api-key': ENV['ANTHROPIC_API_KEY'], 'anthropic-version': '2023-06-01', 'content-type': 'application/json'}))
    txt = ''.join(b.get('text', '') for b in r['content'])
    return json.loads(re.search(r'\{.*\}', txt, re.S).group(0))


def dedoublon(t):
    """Cellules bilingues FR/EN identiques : « FLUTING FLUTING » → « FLUTING »."""
    w = t.split()
    if len(w) >= 2 and len(w) % 2 == 0 and w[:len(w) // 2] == w[len(w) // 2:]:
        return ' '.join(w[:len(w) // 2])
    return t


def num(v):
    if v is None or isinstance(v, bool):
        return None
    if isinstance(v, (int, float)):
        return float(v)
    s = str(v).replace(' ', '').replace('\xa0', '').replace(' ', '')
    m = re.search(r'-?\d+(?:[.,]\d+)?', s)
    return float(m.group(0).replace(',', '.')) if m else None


def extract(wb, meta):
    ws = wb[meta['feuille']] if meta.get('feuille') in wb.sheetnames else wb.worksheets[0]
    cols = {k: v for k, v in (meta.get('cols') or {}).items() if v and re.fullmatch(r'[A-Z]{1,2}', str(v))}
    un = meta.get('unites') or {}
    lignes = []
    for r in range(int(meta.get('premiere_ligne') or 1), ws.max_row + 1):
        g = lambda k: ws[f'{cols[k]}{r}'].value if k in cols else None
        poids = num(g('poids'))
        if not poids or poids <= 0:
            continue
        if un.get('poids') == 't' or poids < 5 and (un.get('poids') != 'kg'):
            poids = poids * 1000 if poids < 50 else poids
        gsm, laize, lon = num(g('gsm')), num(g('laize')), num(g('longueur'))
        if not (gsm or laize) or poids > 100000:
            continue
        empl = cell_txt(g('emplacement'))
        if DEPOT_RE.search(empl) or re.fullmatch(r'D[ÉE]P[ÔO]T', empl, re.I):
            continue  # stock du dépôt St-Ouen : déjà au catalogue
        if laize and un.get('laize') == 'cm': laize *= 10
        if lon and un.get('longueur') == 'cm': lon *= 10
        L = {'emplacement': cell_txt(g('emplacement')) or None, 'couleur': cell_txt(g('couleur')) or None,
             'detail': dedoublon(cell_txt(g('detail'))) or None, 'finition': cell_txt(g('finition')) or None,
             'gsm': gsm, 'laize': round(laize) if laize else None, 'longueur': round(lon) if lon else None,
             'diametre': num(g('diametre')), 'mandrin': num(g('mandrin')), 'nb': num(g('nb')),
             'poids': round(poids), 'prix': num(g('prix')), 'prix_txt': cell_txt(g('prix')) or None}
        lignes.append({k: v for k, v in L.items() if v not in (None, '')})
    head = int(meta.get('ligne_entete') or 0)
    photos = []
    for im in getattr(ws, '_images', []):
        try:
            row = im.anchor._from.row + 1
        except Exception:
            row = 0
        if row <= 6:
            continue  # bloc société / logos
        try:
            data = im._data()
        except Exception:
            continue
        if len(data) > 30000:  # logos ≈ 8-14 Ko, photos produit > 30 Ko
            photos.append(data)
    return lignes, photos


# ── Supabase ───────────────────────────────────────────────────────────────
def sb(path, body=None, method='GET', extra=None):
    H = {'apikey': ENV['SUPABASE_SERVICE_ROLE'], 'Authorization': 'Bearer ' + ENV['SUPABASE_SERVICE_ROLE'],
         'Content-Type': 'application/json'}
    H.update(extra or {})
    out = http(ENV['SUPABASE_URL'] + '/rest/v1/' + path, json.dumps(body).encode() if body is not None else None, H, method)
    return json.loads(out) if out else None


def upload_photo(lot_id, i, data):
    # chemin = empreinte du CONTENU : une même image (photo du modèle d'offre Woluwe)
    # garde la même URL d'un lot à l'autre → le catalogue l'écarte si elle se répète.
    ext = 'png' if data[:4] == b'\x89PNG' else 'jpg'
    path = f'img/{hashlib.sha1(data).hexdigest()[:20]}.{ext}'
    http(f"{ENV['SUPABASE_URL']}/storage/v1/object/lots-hso/{path}", data, {
        'Authorization': 'Bearer ' + ENV['SUPABASE_SERVICE_ROLE'], 'Content-Type': 'image/' + ('png' if ext == 'png' else 'jpeg'),
        'x-upsert': 'true'}, 'POST')
    return f"{ENV['SUPABASE_URL']}/storage/v1/object/public/lots-hso/{path}"


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--dry', action='store_true')
    ap.add_argument('--limit', type=int)
    ap.add_argument('--only')
    a = ap.parse_args()
    known = {r['id'] for r in sb('lots_hso?select=id')}
    srcs = []
    if a.only != 'mail': srcs += list(dropbox_files())
    if a.only != 'dropbox': srcs += list(mail_files())
    vus = set()
    n = 0
    for f in srcs:
        lot_id = hashlib.sha1(f['hash'].encode()).hexdigest()
        if lot_id in known or lot_id in vus:
            continue
        vus.add(lot_id)
        if a.limit and n >= a.limit: break
        n += 1
        raw = f['get']()
        try:
            wb = openpyxl.load_workbook(io.BytesIO(raw), data_only=True)
        except Exception as e:
            print('  ✗ illisible', f['fichier'], e); continue
        cpath = os.path.join(CACHE, lot_id + '.json')
        if os.path.exists(cpath):
            meta = json.load(open(cpath))
        else:
            meta = ask_llm(f['fichier'], f['contexte'], dump_wb(wb)); json.dump(meta, open(cpath, 'w'))
        lignes, photos = extract(wb, meta) if meta.get('est_offre') else ([], [])
        motif = None
        if re.search(r'\bDEPOT\b', f['fichier'], re.I) and not re.search(r'MIXTE', f['fichier'], re.I):
            lignes, motif = [], 'stock dépôt St-Ouen'
        elif DEPOT_RE.search(str(meta.get('lieu') or '')) or re.fullmatch(r'D[ÉE]P[ÔO]T', str(meta.get('lieu') or '').strip(), re.I):
            lignes, motif = [], 'stock dépôt St-Ouen'
        elif not meta.get('est_offre'): motif = 'pas une offre : ' + str(meta.get('raison'))
        elif not lignes: motif = 'aucune ligne lue'
        date_offre = meta.get('date_offre') or f['recu_le'][:10]
        if not re.fullmatch(r'\d{4}-\d{2}-\d{2}', str(date_offre)): date_offre = f['recu_le'][:10]
        usine = re.sub(r'^0+(?=\d)', '', str(meta.get('usine') or '').strip()) or None
        prix = [l['prix'] for l in lignes if l.get('prix') and l['prix'] > 50]
        row = {'id': lot_id, 'source': f['source'], 'source_ref': f['source_ref'], 'fichier': f['fichier'],
               'recu_le': f['recu_le'], 'date_offre': date_offre, 'usine': usine,
               'famille': meta.get('famille'), 'forme': meta.get('forme'), 'titre': meta.get('titre'),
               'titre_en': meta.get('titre_en'), 'lieu': meta.get('lieu'), 'prix_txt': meta.get('prix_txt'),
               'prix_min': min(prix) if prix else None, 'tonnage': round(sum(l['poids'] for l in lignes) / 1000, 1),
               'nb_lignes': len(lignes), 'lignes': lignes, 'photos': [], 'motif': motif,
               'cle': f"{usine or '?'}|{meta.get('famille')}|{meta.get('forme')}",
               'empreinte': hashlib.sha1(json.dumps(sorted(str((l.get('gsm'), l.get('laize'), l.get('longueur'), l['poids'])) for l in lignes)).encode()).hexdigest() if lignes else None}
        print(f"  {'✓' if not motif else '·'} {f['source']:7} {date_offre} {row['cle']:28} {len(lignes):4} l. {row['tonnage']:7} t  {f['fichier'][:60]}" + (f'  [{motif}]' if motif else ''))
        if a.dry: continue
        if lignes:
            row['photos'] = [upload_photo(lot_id, i, d) for i, d in enumerate(photos[:12])]
        sb('lots_hso', row, 'POST', {'Prefer': 'resolution=merge-duplicates'})
    if not a.dry:
        actualiser()


def actualiser():
    """Actif = dernière version de chaque lot (usine×famille×forme), offre ≥ DEPUIS, avec lignes."""
    rows = sb('lots_hso?select=id,cle,empreinte,date_offre,recu_le,nb_lignes,motif,actif')
    ok = [r for r in rows if not r['motif'] and r['nb_lignes'] and (r['date_offre'] or '') >= PLANCHER]
    ok.sort(key=lambda r: (r['date_offre'], r['recu_le'] or ''), reverse=True)  # le plus récent d'abord
    on, cles, emps = set(), set(), set()
    for r in ok:  # même liste sous deux noms (FR/DZ, luxe/cadeau) ou ancienne version du même lot → écartée
        if r['cle'] in cles or r['empreinte'] in emps:
            continue
        on.add(r['id']); cles.add(r['cle']); emps.add(r['empreinte'])
    for r in rows:
        if bool(r['actif']) != (r['id'] in on):
            sb(f"lots_hso?id=eq.{r['id']}", {'actif': r['id'] in on, 'updated_at': dt.datetime.now(dt.UTC).isoformat()}, 'PATCH')
    print(f'{len(on)} lots actifs')


if __name__ == '__main__':
    main()
