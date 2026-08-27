#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Soumet toutes les URLs du sitemap à IndexNow (Bing, Yandex, Seznam…).
La clé IndexNow est le fichier <KEY>.txt à la racine du site (servi en HTTP).
À lancer après une mise à jour de contenu, ou à câbler dans le workflow d'import CI.

Usage : python3 scripts/indexnow_ping.py
"""
import os, re, json, glob, urllib.request, urllib.error

HOST = "paper.prodi.com"
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

# La clé = le nom du fichier <hex>.txt à la racine du repo (32 hex chars).
keyfiles = [os.path.basename(p) for p in glob.glob(os.path.join(ROOT, "*.txt"))
            if re.fullmatch(r"[0-9a-f]{32}\.txt", os.path.basename(p))]
if not keyfiles:
    raise SystemExit("Aucun fichier clé IndexNow (<hex32>.txt) trouvé à la racine.")
key = keyfiles[0][:-4]

sitemap = open(os.path.join(ROOT, "sitemap.xml"), encoding="utf-8").read()
urls = re.findall(r"<loc>([^<]+)</loc>", sitemap)

payload = {"host": HOST, "key": key,
           "keyLocation": f"https://{HOST}/{key}.txt", "urlList": urls}
req = urllib.request.Request("https://api.indexnow.org/indexnow",
                             data=json.dumps(payload).encode(),
                             headers={"Content-Type": "application/json; charset=utf-8"})
try:
    r = urllib.request.urlopen(req, timeout=20)
    print(f"IndexNow OK — HTTP {r.status} · {len(urls)} URLs soumises (clé {key[:8]}…)")
except urllib.error.HTTPError as e:
    print(f"IndexNow HTTP {e.code} · {len(urls)} URLs · {e.read().decode()[:200]}")
