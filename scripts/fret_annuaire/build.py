#!/usr/bin/env python3
"""Annuaire fret /fret/ : transitaires (par pays, avec prix par conteneur) + camions (par trajet).

Source : miroir Sage (schéma sage) via ~/bin/prodi-sql. Résultat écrit dans la table
public.fret_annuaire (lignes 'transitaires' et 'camions'), lisible seulement avec le code
le code d'accès (compte proforma-lecture) ou un compte équipe — JAMAIS de fichier de données
dans ce repo (public).

Base des contacts transitaires : ~/.prodi_fret/transitaires_base.json (hors repo).

Usage : python3 scripts/fret_annuaire/build.py [--sec]   (--sec = calcule sans écrire)
"""
import json, re, statistics as st, subprocess, sys, unicodedata
from collections import defaultdict
from datetime import date
from pathlib import Path

SQL = str(Path.home() / "bin/prodi-sql")
BASE = Path.home() / ".prodi_fret/transitaires_base.json"
DEPUIS = "2024-01-01"
RECENT = "2025-07-01"


def sql(q):
    out = subprocess.run([SQL, q], capture_output=True, text=True).stdout
    d = json.loads(out)
    if isinstance(d, dict):
        raise SystemExit(d.get("message", out)[:500])
    return d


def norm(s):
    s = unicodedata.normalize("NFD", s or "").encode("ascii", "ignore").decode()
    return re.sub(r"\s+", " ", s.upper()).strip()


def mois(d):
    return int(d[:4]) * 12 + int(d[5:7]) - 1


def emails_de(*txts):
    out = []
    for t in txts:
        for m in re.findall(r"[\w.+-]+@[\w-]+(?:\.[\w-]+)+", t or ""):
            m = m.lower().strip(".")
            if re.search(r"compta|finance|factur|recouv|invoice|accounting", m):
                continue
            if m not in out:
                out.append(m)
    return out


# ── transitaires : lignes TRT d'achat (1 article = 1 expédition, prix par conteneur) ──
def trt():
    rows = sql(f"""
      with f as (select "AR_Ref", (array_agg("CT_Num" order by "DO_Date" desc))[1] ct, max("DO_Date")::date d,
                 max("DL_PrixUnitaire") pu, max("DL_Qte") q
                 from sage."F_DOCLIGNE" where "DO_Domaine"=1 and "AR_Ref" like 'TRT%' and "DO_Date">='{DEPUIS}' group by 1)
      select f.ct, f.d, f.pu, f.q, a."AR_Design" des, c."CT_Intitule" nom
      from f join sage."F_ARTICLE" a using ("AR_Ref") left join sage."F_COMPTET" c on c."CT_Num"=f.ct""")
    out = []
    for r in rows:
        s = norm(r["des"])
        m = re.match(r"(\d+)\s*X\s*(20|40)", s)
        if not m:
            continue
        n, taille = int(m.group(1)), m.group(2)
        pu, q = float(r["pu"] or 0), float(r["q"] or 1)
        prix = pu if (q == n or n == 1) else pu / n
        if prix < 500:
            continue
        # destination = ce qui suit le dernier « À » / « TO », sans « - POL … » / « - CIE … »
        dest = re.split(r"\s(?:A|TO)\s", s)[-1]
        dest = re.split(r"\s[-/–]\s|\sPOL\b|\sCIE\b|\sVIA\b|\(", dest)[0].strip(" -")
        # origine = avant « À » (sans « 1x40'HC ») + POL éventuel → sert à conseiller qui a déjà fait CE départ
        orig = re.split(r"\s(?:A|TO)\s", s)[0] if re.search(r"\s(?:A|TO)\s", s) else ""
        orig = re.sub(r"^\d+\s*X\s*(20|40)\s*'?\s*(HC|DRY|DV)?\s*(FOB|EXW|FCA)?\s*", "", orig).strip(" -")
        pol = re.search(r"POL\s+([A-Z][A-Z ]+?)(?:\s[-/–]|$)", s)
        out.append(dict(nom=(r["nom"] or r["ct"] or "").strip(), d=r["d"], prix=prix, taille=taille,
                        depot=bool(re.search(r"SAINT.?OUEN|ST.?OUEN|80610", s)), dest=dest,
                        orig=orig[:40], pol=pol.group(1).strip() if pol else ""))
    return out


def transitaires(lignes):
    base = json.loads(BASE.read_text())
    # écart à date égale : même port, même départ (dépôt ou non), même taille, ±1 mois
    groupes = defaultdict(list)
    for r in lignes:
        groupes[(r["dest"], r["depot"], r["taille"])].append(r)
    for g in groupes.values():
        for r in g:
            autres = [x["prix"] for x in g if x is not r and abs(mois(x["d"]) - mois(r["d"])) <= 1]
            r["ecart"] = r["prix"] - st.median(autres) if len(autres) >= 3 else None

    for pays in base.values():
        ports = {norm(p) for t in pays["liste"] for p in t["ports"]}
        dans = [r for r in lignes if r["dest"] in ports or any(r["dest"].startswith(p) for p in ports)]
        # prix du marché par port : 40' depuis le dépôt, 3 derniers mois connus
        marche = {}
        for p in sorted(ports):
            l = sorted((r for r in dans if r["dest"].startswith(p) and r["depot"] and r["taille"] == "40"), key=lambda r: r["d"])
            if l:
                fin = mois(l[-1]["d"])
                rec = [r["prix"] for r in l if mois(r["d"]) >= fin - 2]
                avant = [r["prix"] for r in l if fin - 8 <= mois(r["d"]) < fin - 2]
                tend = round((st.median(rec) / st.median(avant) - 1) * 100) if len(avant) >= 3 else None
                marche[p.title()] = dict(med=round(st.median(rec)), n=len(rec), der=l[-1]["d"][:7], tend=tend)
        pays["marche"] = marche
        for t in pays["liste"]:
            mien = [r for r in dans if norm(r["nom"]) == norm(t["nom"])]
            # classement sur les départs du DÉPÔT seulement (les départs Espagne/Slovénie ne sont pas comparables)
            ec = [r["ecart"] for r in mien if r["ecart"] is not None and r["depot"] and r["d"] >= RECENT]
            t["ecart"] = round(st.mean(ec)) if len(ec) >= 3 else None
            t["n_ecart"] = len(ec)
            prix = {}
            for p in sorted(ports):
                l = sorted((r for r in mien if r["dest"].startswith(p) and r["depot"] and r["taille"] == "40"), key=lambda r: r["d"])
                if l:
                    rec = [r["prix"] for r in l if r["d"] >= RECENT] or [r["prix"] for r in l]
                    prix[p.title()] = dict(med=round(st.median(rec)), dernier=round(l[-1]["prix"]), der=l[-1]["d"][:7], n=len(l))
            t["prix"] = prix
            # départs déjà faits avec ce transitaire vers ce pays (origines + POL), les plus fréquents d'abord
            og = defaultdict(int)
            for r in mien:
                for k in (r["orig"], r["pol"]):
                    if k:
                        og[k.title()] += 1
            t["origines"] = [k for k, _ in sorted(og.items(), key=lambda kv: -kv[1])[:8]]
        # du moins cher au plus cher (écart connu), puis les autres par volume
        pays["liste"].sort(key=lambda t: (t["ecart"] is None, t["ecart"] or 0, -t["n"]))
    return base


# ── camions : lignes d'achat transport routier ──
def camions():
    rows = sql(f"""
      select l."CT_Num" ct, l."DL_Design" des, l."DL_MontantHT"/greatest(l."DL_Qte",1) m, l."DO_Date"::date d
      from sage."F_DOCLIGNE" l join sage."F_COMPTET" c using ("CT_Num")
      where l."DO_Domaine"=1 and l."DO_Date">='{DEPUIS}' and l."DL_MontantHT">50 and c."CT_Qualite"='TRANSPORT'
        and l."DL_Design" ~* '(camion|truck|groupage|complet|FTL|palette)'
        and l."DL_Design" !~* '(40.?HC|20.?DRY|container|conteneur|stock|magasin|manut|attente|immobilis|demi.?tour|annul)'""")
    par = defaultdict(list)
    for r in rows:
        par[r["ct"]].append(r)
    fiches = sql("""
      select c."CT_Num" ct, c."CT_Intitule" nom, c."CT_Ville" ville, c."CT_Pays" pays, c."CT_EMail" email,
             c."CT_Telephone" tel, c."CT_Contact" contact, c."CT_Site" site,
             (select string_agg(coalesce(ct."CT_Nom",'')||' '||coalesce(ct."CT_EMail",''), ' ; ')
                from sage."F_CONTACTT" ct where ct."CT_Num"=c."CT_Num") contacts
      from sage."F_COMPTET" c where c."CT_Qualite"='TRANSPORT'""")
    out = []
    for f in fiches:
        l = par.get(f["ct"])
        if not l:
            continue
        trajets = defaultdict(list)
        for r in l:
            t = norm(r["des"])
            t = re.sub(r"^\d+\s*(X\s*)?(CAMIONS? COMPLETS?|CAMION|COMPLET|FULL TRUCKS?|TRUCKS?|GROUPAGE|DEMI.?CAMION|FTL)\s*:?\s*", "", t)
            t = re.sub(r"\b80610\s*", "", t).replace("SAINT-OUEN", "ST-OUEN").replace("SAINT OUEN", "ST-OUEN").replace("ST OUEN", "ST-OUEN")
            t = re.sub(r"\s+(A|TO)\s+", " → ", t, count=1)
            trajets[t[:70]].append(float(r["m"]))
        top = sorted(trajets.items(), key=lambda kv: -len(kv[1]))[:6]
        mails = emails_de(f["email"], f["site"], f["contacts"])
        out.append(dict(
            nom=f["nom"].strip(), ville=(f["ville"] or "").title(), pays=(f["pays"] or "").title(),
            contact=(f["contact"] or "").strip(), tel=(f["tel"] or "").strip(), emails=mails[:3],
            n=len(l), med=round(st.median(float(r["m"]) for r in l)), der=max(r["d"] for r in l)[:7],
            trajets=[dict(t=t.title(), n=len(v), med=round(st.median(v))) for t, v in top],
        ))
    out.sort(key=lambda c: -c["n"])
    return out


def ecrire(id_, data):
    j = json.dumps(data, ensure_ascii=False)
    assert "$fa$" not in j
    sql(f"insert into public.fret_annuaire(id,data,maj) values ('{id_}', $fa${j}$fa$::jsonb, now()) "
        f"on conflict (id) do update set data=excluded.data, maj=now() returning id")


if __name__ == "__main__":
    tr = transitaires(trt())
    ca = camions()
    print(f"transitaires : {len(tr)} pays, {sum(len(p['liste']) for p in tr.values())} lignes ; camions : {len(ca)} transporteurs")
    if "--sec" in sys.argv:
        json.dump(dict(transitaires=tr, camions=ca), sys.stdout, ensure_ascii=False, indent=1)
        sys.exit()
    meta = dict(le=date.today().isoformat(), depuis=DEPUIS, recent=RECENT)
    ecrire("transitaires", dict(meta=meta, pays=tr))
    ecrire("camions", dict(meta=meta, liste=ca))
    print("écrit dans public.fret_annuaire")
