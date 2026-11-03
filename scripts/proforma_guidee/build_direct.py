# Construit proforma/direct.html (TEST LOCAL) depuis proforma/index.html :
# formulaire complet à gauche + feuille éditable à droite + recherche client Sage.
import re, sys, os
SRC, DST = sys.argv[1], sys.argv[2]
s = open(SRC).read()

# ── maj() ne réécrit pas la case de la feuille en cours d'édition ──
s = re.sub(r"document\.getElementById\('(p-[a-z]+)'\)\.textContent=v\('(c-[a-z]+)'\);", r"_T('\1',v('\2'));", s)
s = s.replace("function maj(){\n  const v=id=>document.getElementById(id).value.trim();",
  "function maj(){\n  const v=id=>document.getElementById(id).value.trim();\n  const _T=(id,t)=>{const el=document.getElementById(id);if(!el.contains(document.activeElement))el.textContent=t;};", 1)
s = s.replace("  document.getElementById('p-client').innerHTML=",
  "  if(!document.getElementById('p-client').contains(document.activeElement))document.getElementById('p-client').innerHTML=", 1)
old = "  document.getElementById('p-lignes').innerHTML=lignes.map("
assert old in s
s = s.replace(old, "  if(document.getElementById('p-lignes').contains(document.activeElement)){document.querySelectorAll('#p-lignes tr').forEach((tr,i)=>{const l=lignes[i];if(l)tr.querySelector('.lmt').textContent=l.qte&&l.pu?eurS(l.qte*l.pu):'';});}\n  else document.getElementById('p-lignes').innerHTML=lignes.map(", 1)
old = "<td class=\"lref\">${esc(l.code)}</td><td class=\"desig\">${desHtml(l.des)}</td>\n    <td class=\"lqte\">${l.qte?kg(l.qte):''}</td><td class=\"lpu\">${l.pu?pu3(l.pu):''}</td>"
assert old in s
s = s.replace(old, "<td class=\"lref\" data-i=\"${i}\" data-k=\"code\">${esc(l.code)}</td><td class=\"desig\" data-i=\"${i}\" data-k=\"des\">${desHtml(l.des)}</td>\n    <td class=\"lqte\" data-i=\"${i}\" data-k=\"qte\">${l.qte?kg(l.qte):''}</td><td class=\"lpu\" data-i=\"${i}\" data-k=\"pu\">${l.pu?pu3(l.pu):''}</td>")
s = s.replace("document.getElementById('p-fret').innerHTML=t.fret>0?_vm(t.fret):'';",
  "if(!document.getElementById('p-fret').contains(document.activeElement))document.getElementById('p-fret').innerHTML=t.fret>0?_vm(t.fret):'';")
s = s.replace("<title>", "<title>Nouvelle · ", 1)
s = s.replace("var PWD='PRODI2026';", "var PWD='PRODI2026';\n  if(location.search.indexOf('headless')>=0)document.documentElement.classList.add('cat-unlocked');", 1)

# ── formulaire COMPLET : tous les champs visibles + recherche client Sage ──
a = s.index('    <div class="row2">\n      <div><textarea id="c-nom"')
b = s.index('    <input id="c-douane" type="hidden">') + len('    <input id="c-douane" type="hidden">')
s = s[:a] + '''    <div class="sage-box">
      <label class="lbl">Client Sage</label>
      <div class="sage-row"><input id="sage-q" placeholder="Rechercher : nom ou code client" autocomplete="off"><span id="sage-etat"></span></div>
      <div id="sage-res"></div>
    </div>
    <label class="lbl">Client (nom · adresse · pays sur la dernière ligne)</label>
    <textarea id="c-nom" rows="4" placeholder="CLIENT"></textarea>
    <div class="row2">
      <div><label class="lbl">Identifiant (ICE, NINEA…)</label><input id="c-ident"></div>
      <div><label class="lbl">N° intra / RC (SIRET)</label><input id="c-rc"></div>
    </div>
    <div class="row2">
      <div><label class="lbl">Votre commercial</label><input id="c-comm"></div><div></div>
    </div>
    <div class="row2">
      <div><label class="lbl">Référence</label><input id="c-ref"></div>
      <div><label class="lbl">Réf. interne</label><input id="c-refint" placeholder="code client Sage"></div>
    </div>
    <div class="row2">
      <div><label class="lbl">Port / lieu de destination</label><input id="c-lieu" placeholder="PORT DE DESTINATION"></div>
      <div><label class="lbl">Montant du fret (inclus dans les P.U)</label><input id="c-fret" type="number" min="0" step="100" placeholder="0"></div>
    </div>
    <div class="row2">
      <div><label class="lbl">Pays d'origine</label><input id="c-orig" placeholder="selon le dernier devis du client"></div>
      <div><label class="lbl">Pays de provenance</label><input id="c-prov" placeholder="selon le dernier devis du client"></div>
    </div>
    <div class="row2">
      <div><label class="lbl">Référence usine</label><input id="c-usine"></div>
      <div><label class="lbl">Code douanier</label><input id="c-douane"></div>
    </div>
    <label class="lbl" style="margin-top:14px">Lignes (tonnes · prix à la tonne) — ou directement sur la feuille (kg · prix au kg)</label>'''+ s[b:]
# fret : l'ancien champ du bas disparaît (déplacé plus haut)
s = s.replace('    <div style="margin-top:6px"><input id="c-fret" type="number" min="0" step="100" placeholder="MONTANT DU FRET (€)"></div>\n', '', 1)
assert s.count('id="c-fret"') == 1
s = s.replace('      <button onclick="addModele(\'\')">+ Ajouter une ligne</button>',
  '      <button onclick="addModele(\'\')">+ Ajouter une ligne</button>\n      <button onclick="addModele(\'GROFF\')">Offset</button><button onclick="addModele(\'GRCAR\')">Couché</button><button onclick="addModele(\'GSCOL\')">Carton GC2</button>', 1)
s = s.replace('    <select id="c-paiemode">', '    <label class="lbl" style="margin-top:14px">Conditions de paiement</label>\n    <select id="c-paiemode">', 1)

# ── formulaire INTELLIGENT : Client → Produits → Livraison et paiement → Références ──
a = s.index('    <div class="sage-box">')
b = s.index('      <input id="c-paie" value="" placeholder="Écris la condition de paiement">\n    </div>\n') + len('      <input id="c-paie" value="" placeholder="Écris la condition de paiement">\n    </div>\n')
s = s[:a] + """    <div class="etape">Client</div>
    <div class="sage-box">
      <div class="sage-row"><input id="sage-q" placeholder="Nom ou code client Sage" autocomplete="off"><button type="button" id="btn-pro25" title="Proforma sans client Sage (Réf. interne PRO25)">PRO25</button></div>
      <div><span id="sage-etat"></span></div>
      <div id="sage-res"></div>
    </div>
    <div id="cli-resume" hidden></div>
    <div id="cli-detail">
    <textarea id="c-nom" rows="4" placeholder="CLIENT (nom, adresse, pays sur la dernière ligne)"></textarea>
    <div class="row2" style="margin-top:8px">
      <div><label class="lbl">Identifiant (ICE, NINEA…)</label><input id="c-ident"></div>
      <div><label class="lbl">N° intra / RC (SIRET)</label><input id="c-rc"></div>
    </div>
    <div class="row2">
      <div><label class="lbl">Port / lieu de destination</label><input id="c-lieu" placeholder="PORT DE DESTINATION"></div><div></div>
    </div>
    </div>
    <input id="c-comm" type="hidden"><!-- « Votre commercial » : se remplit directement sur la feuille -->
    <input id="c-tel" type="hidden"><input id="c-mail" type="hidden">

    <div class="etape">Produits</div>
    <div class="prod-box"><input id="prod-q" placeholder="Tape un produit : offset bobine, carton gc2, kraft brun…" autocomplete="off"><div id="prod-res"></div></div>
    <div id="deja"></div>
    <div id="lignes"></div>

    <div class="etape">Livraison et paiement</div>
    <div class="row2">
      <div id="inco-ici"><label class="lbl">Incoterm</label><select id="c-inco"><option>CFR</option><option>CIF</option><option>FOB</option><option>EX WORKS</option><option>DAP</option></select></div>
      <div><label class="lbl">Fret inclus dans les prix</label><input id="c-fret" type="number" min="0" step="100" placeholder="0"></div>
    </div>
    <div class="row2">
      <div><label class="lbl">Pays d'origine</label><input id="c-orig" placeholder="selon le dernier devis du client"></div>
      <div><label class="lbl">Pays de provenance</label><input id="c-prov" placeholder="selon le dernier devis du client"></div>
    </div>
    <label class="lbl">Conditions de paiement</label>
    <select id="c-paiemode">
      <option value="5050">Virement 50 % avant expédition / 50 % avant documents</option>
      <option value="100av">Virement 100 % avant expédition</option>
      <option value="3070" selected>30 % à la commande / 70 % avant documents</option>
      <option value="cad">100 % contre documents à vue (CAD)</option>
      <option value="lc">Lettre de crédit irrévocable à vue (L/C)</option>
      <option value="libre">Autre condition…</option>
    </select>
    <div id="paie-libre-wrap" style="display:none;margin-top:6px">
      <input id="c-paie" value="" placeholder="Écris la condition de paiement">
    </div>
    <div id="bq-wrap" hidden><label class="lbl">Banque du client</label>
    <textarea id="c-banque" rows="2" placeholder="Nom de la banque, agence, adresse, SWIFT…"></textarea></div>
    <button type="button" id="bq-ajout" class="lien-main">+ banque du client</button>

    <div class="etape">Références</div>
    <div class="row2">
      <div><label class="lbl">Référence</label><input id="c-ref"></div>
      <div><label class="lbl">Réf. interne</label><input id="c-refint" placeholder="code client Sage"></div>
    </div>
    <div class="row2">
      <div><label class="lbl">Référence usine</label><input id="c-usine"></div>
      <div><label class="lbl">Code douanier (auto)</label><input id="c-douane"></div>
    </div>
    <div id="inco-park" hidden></div>
""" + s[b:]
for idn in ['c-inco','c-lieu','c-fret','c-douane','c-paiemode','lignes','c-nom']:
    assert s.count('id="%s"' % idn) == 1, idn

# codes douaniers : HS_CODES + getHsCode recopiés de catalogue.js (même source que le catalogue)
cat = open(os.path.join(os.path.dirname(SRC), '..', 'catalogue.js')).read()
h0 = cat.index('const HS_CODES={'); h1 = cat.index('\n};\n', h0) + 4
g0 = cat.index('function getHsCode('); g1 = cat.index('\n  return HS_CODES[qualite];\n}\n', g0) + len('\n  return HS_CODES[qualite];\n}\n')
hs = '<script>\n' + cat[h0:h1] + cat[g0:g1] + '</script>\n'

direct = open(sys.argv[3]).read() + hs + open(sys.argv[4]).read() + ''.join(open(f).read() for f in sys.argv[5:])
s = s.replace('</body>', direct + '</body>', 1)
open(DST, 'w').write(s)
print('ok')
