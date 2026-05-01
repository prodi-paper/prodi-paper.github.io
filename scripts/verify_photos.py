#!/usr/bin/env python3
"""
Vérifie les URLs image_url de tous les produits.
Si l'URL retourne 404 (ou autre code != 200), met image_url=NULL pour ce produit.
Après run, le filtre "Avec photo / Sans photo" sur image_url IS NOT NULL devient fiable.

Usage: python3 scripts/verify_photos.py [--dry-run]
"""
import os, sys, json, time
from concurrent.futures import ThreadPoolExecutor, as_completed
import urllib.request, urllib.error, urllib.parse

SUPABASE_URL = "https://bvcgpdoukhcatjibmvnb.supabase.co"
ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJ2Y2dwZG91a2hjYXRqaWJtdm5iIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzIyNzg5MjgsImV4cCI6MjA4Nzg1NDkyOH0.Ip3ykSUS9sajTH04yXBerOG1haBKMD1kAvMQNjnGL1Q"
MGMT_TOKEN = os.environ["SUPABASE_MGMT_TOKEN"]
PROJECT_REF = "bvcgpdoukhcatjibmvnb"

DRY_RUN = "--dry-run" in sys.argv

def fetch_all_with_url():
    """Get all products that have image_url, paginated."""
    out = []
    page_size = 1000
    offset = 0
    while True:
        url = f"{SUPABASE_URL}/rest/v1/products?select=id,ref,image_url&image_url=not.is.null&order=id.asc&limit={page_size}&offset={offset}"
        req = urllib.request.Request(url, headers={
            "apikey": ANON_KEY,
            "Authorization": f"Bearer {ANON_KEY}",
        })
        with urllib.request.urlopen(req, timeout=30) as r:
            data = json.loads(r.read())
        if not data:
            break
        out.extend(data)
        if len(data) < page_size:
            break
        offset += page_size
        print(f"  fetched {len(out)}...")
    return out

def head_check(p, retries=2):
    """Returns (id, ok). ok=True if photo loads, False if 404, None if network error.
    Retries on network errors / 5xx to avoid false positives from rate limiting."""
    url = p["image_url"]
    for attempt in range(retries + 1):
        try:
            req = urllib.request.Request(url, method="HEAD")
            with urllib.request.urlopen(req, timeout=10) as r:
                return p["id"], r.status == 200
        except urllib.error.HTTPError as e:
            # 4xx = real "not found", 5xx = retry
            if e.code == 404:
                return p["id"], False
            if e.code >= 500 and attempt < retries:
                time.sleep(0.5 * (attempt + 1))
                continue
            return p["id"], None
        except Exception:
            if attempt < retries:
                time.sleep(0.5 * (attempt + 1))
                continue
            return p["id"], None
    return p["id"], None

def update_dead_urls(ids):
    """Set image_url=NULL for products whose photo 404s."""
    if not ids:
        return 0
    url = f"https://api.supabase.com/v1/projects/{PROJECT_REF}/database/query"
    sql = f"UPDATE products SET image_url=NULL WHERE id IN ({','.join(str(i) for i in ids)});"
    req = urllib.request.Request(url,
        data=json.dumps({"query": sql}).encode(),
        method="POST",
        headers={
            "Authorization": f"Bearer {MGMT_TOKEN}",
            "Content-Type": "application/json",
            "User-Agent": "curl/8.0",
        })
    with urllib.request.urlopen(req, timeout=60) as r:
        return r.read()

def main():
    print("=== Verify Photos ===")
    if DRY_RUN:
        print("(dry-run — no DB updates)")
    print("Fetching products with image_url...")
    products = fetch_all_with_url()
    print(f"Total to check: {len(products)}")

    dead = []
    alive = 0
    errors = 0
    start = time.time()
    with ThreadPoolExecutor(max_workers=40) as ex:
        futs = [ex.submit(head_check, p) for p in products]
        for i, f in enumerate(as_completed(futs)):
            pid, ok = f.result()
            if ok is True:
                alive += 1
            elif ok is False:
                dead.append(pid)
            else:
                errors += 1
            if (i+1) % 200 == 0:
                pct = (i+1) * 100 // len(products)
                eta = (time.time()-start) / (i+1) * (len(products)-i-1)
                print(f"  {i+1}/{len(products)} ({pct}%) — alive={alive} dead={len(dead)} err={errors} eta={int(eta)}s")
    elapsed = int(time.time() - start)
    print(f"\nDone in {elapsed}s — alive={alive} dead={len(dead)} errors={errors}")

    # Always save dead IDs to JSON for client-side filtering
    out_path = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "dead_photo_ids.json")
    with open(out_path, "w") as f:
        json.dump({"dead_ids": sorted(dead), "checked_at": int(time.time())}, f)
    print(f"\nSaved {len(dead)} dead IDs to {out_path}")

    if dead and not DRY_RUN:
        print(f"\nAttempting DB update of {len(dead)} URLs to NULL...")
        try:
            for i in range(0, len(dead), 500):
                batch = dead[i:i+500]
                update_dead_urls(batch)
                print(f"  updated {min(i+500, len(dead))}/{len(dead)}")
            print("DB update done.")
        except Exception as e:
            print(f"DB update failed ({e}) — JSON file saved for client-side fallback.")

if __name__ == "__main__":
    main()
