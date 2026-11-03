# Génère la feuille A4 de /proforma/ à partir des coordonnées relevées dans
# la proforma Sage DE43006 (pdftotext -bbox + tracés SVG, en mm, page Letter).
# Conversion Letter → A4 : échelle K, décalage OX/OY. Injecté entre les
# marqueurs SHEET-* de proforma/index.html.
import re, json, sys

K = 0.98
OX, OY = 1.02, 3.1
DY = json.load(open(sys.argv[2])) if len(sys.argv) > 2 else {}   # corrections verticales mesurées

def X(x): return f"{OX + x*K:.2f}mm"
def A(v): return f"{v*K:.2f}mm"
def F(pt): return f"{pt*K:.2f}pt"

# zone bas : origine = bas du tableau des lignes (Sage y=183.7)
YB = 183.7
def YH(y, key=None):  # zone haute, depuis le haut de la feuille
    return f"{OY + (y + DY.get(key, 0))*K:.2f}mm"
def YL(y, key=None):  # zone basse, depuis le bas du tableau
    return f"{(y - YB + DY.get(key, 0))*K:.2f}mm"

H = "Helvetica,Arial,sans-serif"
LW = f"{0.26:.2f}mm"   # trait Sage 0.72 pt
B = f"{LW} solid #000"

def at(sel, x, y, pt=9, w=400, extra="", zone="h", key=None):
    yy = YH(y, key or sel) if zone == "h" else YL(y, key or sel)
    return f"  .sheet {sel}{{position:absolute;left:{X(x)};top:{yy};font-size:{F(pt)};font-weight:{w};{extra}}}\n"

def box(sel, x0, y0, x1, y1, zone="h", extra=""):
    yy = YH(y0, '_') if zone == "h" else YL(y0, '_')
    return (f"  .sheet {sel}{{position:absolute;left:{X(x0)};top:{yy};width:{A(x1-x0)};height:{A(y1-y0)};"
            f"border:{B};box-sizing:border-box;{extra}}}\n")

css = f"""/*SHEET-CSS-START*/
  /* ══ Feuille A4 = CALQUE de la proforma Sage DE43006 (18/09/26) ══
     Généré par gen_sheet.py : chaque texte/cadre est posé aux coordonnées
     relevées dans le PDF Sage (Letter), ramenées en A4 (échelle {K}).
     Polices Sage : Helvetica (corps), Calibri (banques → Carlito), High Tower
     Text (titre → Goudy Bookletter 1911, la plus proche en Google Fonts). */
  .sheetbox{{flex:none;display:flex;justify-content:center;}}
  .sheet{{width:210mm;height:297mm;background:#fff;box-shadow:0 4px 22px rgba(0,0,0,.13);font-family:{H};font-size:{F(9)};line-height:1.15;color:#000;position:relative;overflow:hidden;}}
  .sheet *{{line-height:1.15;}}
  .sheet .zh{{position:relative;height:{YH(85.0,'_')};}}
  .sheet .zb{{position:relative;height:{A(275.8-YB)};}}
  .sheet .nw{{white-space:nowrap;}}
  .sheet{{-webkit-print-color-adjust:exact;print-color-adjust:exact;}}
"""
# ── zone haute ──
css += at(".pagenum", 174.8, 3.2, 9, 700)
css += f"  .sheet .logo{{position:absolute;left:{X(4.5)};top:{YH(4.2,'_')};width:{A(61.0)};height:auto;}}\n"
for i,(x,y,pt,w) in enumerate([(6.1,12.8,9.05,400),(6.2,17.2,9.0,700),(6.0,20.4,9.1,400),(6.0,24.9,9.0,400),(6.2,29.0,9.0,400)]):
    css += at(f".adr{i}", x, y, pt, w, "white-space:nowrap;", key='adr')
for i,y in enumerate([32.3,36.2,40.5]):
    css += at(f".exo{i}", 6.2 if i<2 else 6.0, y, 10.0, 400, "white-space:nowrap;", key='exo')
for i,y in enumerate([46.3,50.1]):
    css += at(f".rge{i}", 5.8, y, 9.0, 700, "white-space:nowrap;color:#ff0000;", key='rouge')
css += at("#p-titre", 3.9, 53.3, 25.9, 400, "font-family:'Goudy Bookletter 1911',Georgia,serif;white-space:nowrap;line-height:1;")
css += at(".commercial", 2.2, 60.6, 9.1, 400, "white-space:nowrap;")
# NUMERO / DATE / REFERENCE
css += box(".ndr", 1.3, 65.5, 111.5, 82.3)
css += (f"  .sheet .ndr>div{{position:absolute;top:0;bottom:0;border-left:{B};}}\n"
        f"  .sheet .ndr .c1{{left:{A(17.8-1.3)};}} .sheet .ndr .c2{{left:{A(38.1-1.3)};}}\n"
        f"  .sheet .ndr .r{{left:0;right:0;bottom:auto;top:{A(73.7-65.5)};border-left:none;border-top:{B};}}\n")
for cid,(x0,x1) in {"n":(1.3,17.8),"d":(17.8,38.1),"f":(38.1,111.5)}.items():
    css += (f"  .sheet .ndr .v{cid}{{position:absolute;left:{A(x0-1.3)};width:{A(x1-x0)};text-align:center;"
            f"font-weight:700;font-size:{F(9.0)};border:none;white-space:nowrap;}}\n")
for cls,x in ((".hn",1.9),(".hd2",22.0),(".hf",62.7)):
    css += f"  .sheet .ndr {cls}{{position:absolute;left:{A(x-1.3)};font-weight:700;font-size:{F(8.96)};border:none;white-space:nowrap;}}\n"
css += f"  .sheet .ndr .hn,.sheet .ndr .hd2,.sheet .ndr .hf{{top:{A(69.3-65.5+DY.get('ndrh',0))};bottom:auto;}}\n"
css += f"  .sheet .ndr .hf{{top:{A(68.8-65.5+DY.get('ndrh',0))};}}\n"
css += f"  .sheet .ndr .vn,.sheet .ndr .vd,.sheet .ndr .vf{{top:{A(76.3-65.5+DY.get('ndrv',0))};bottom:auto;}}\n"
css += f"  .sheet .ndr .vf{{top:{A(76.7-65.5+DY.get('ndrv',0))};}}\n"
# client
css += f"  .sheet #p-client{{position:absolute;left:{X(114.8)};top:{YH(8.2,'cnom')};width:{A(95)};}}\n"
css += f"  .sheet #p-client .cnom{{position:absolute;left:0;top:0;font-weight:700;font-size:{F(12.9)};white-space:nowrap;text-transform:uppercase;}}\n"
css += (f"  .sheet #p-client .cadr{{position:absolute;left:{A(0.3)};top:{A(19.1-8.2+DY.get('cadr',0)-DY.get('cnom',0))};font-size:{F(9.07)};"
        f"line-height:{A(5.1)};white-space:pre;}}\n")
css += (f"  .sheet #p-client .cpays{{position:absolute;left:{A(0.3)};top:{A(34.7-8.2+DY.get('cpays',0)-DY.get('cnom',0))};font-weight:700;"
        f"font-size:{F(12.0)};white-space:nowrap;text-transform:uppercase;}}\n")
css += at(".refint", 114.8, 39.4, 9.1, 400, "white-space:nowrap;")
css += at(".rc", 115.6, 48.9, 9.1, 400, "white-space:nowrap;")
css += box(".box-livr", 115.0, 53.9, 208.1, 83.0)
css += (f"  .sheet .box-livr .t{{position:absolute;left:0;right:0;top:0;height:{A(59.3-53.9)};border-bottom:{B};"
        f"font-weight:700;font-size:{F(9.03)};padding:{A(55.2-53.9+DY.get('livrt',0))} 0 0 {A(145.0-115.0)};box-sizing:border-box;}}\n")
for sel,y in (("#p-inco",59.7),("#p-lieu",63.9)):
    css += f"  .sheet .box-livr {sel}{{position:absolute;left:{A(116.0-115.0)};top:{A(y-53.9+DY.get('livr',0))};font-size:{F(9.07)};white-space:nowrap;}}\n"
for sel,y in ((".po",72.6),(".pp",77.9)):
    css += f"  .sheet .box-livr {sel}{{position:absolute;left:{A(116.6-115.0)};top:{A(y-53.9+DY.get('livr',0))};font-size:{F(9.06)};white-space:nowrap;}}\n"
css += f"  .sheet .box-livr .pv{{color:#ff0000;margin-left:{A(3.8)};}}\n"
# ── tableau des lignes (flux : il grandit si beaucoup de lignes) ──
css += f"""  .sheet table.corps{{border-collapse:collapse;margin-left:{X(1.0)};width:{A(209.0)};table-layout:fixed;}}
  .sheet table.corps th{{border:{B};height:{A(92.1-85.0)};padding:0 {A(1.0)} {A(.5)};font-size:{F(9.0)};font-weight:700;text-align:left;vertical-align:bottom;white-space:nowrap;}}
  .sheet table.corps th small{{font-weight:400;font-size:{F(9.0)};}}
  .sheet table.corps col.cref{{width:{A(19.0-1.0)};}} .sheet table.corps col.cpn{{width:{A(173.6-154.0)};}}
  .sheet table.corps col.cpu{{width:{A(187.0-173.6)};}} .sheet table.corps col.cmt{{width:{A(210.0-187.0)};}}
  .sheet table.corps th.lqte{{text-align:right;padding-right:{A(173.6-170.6)};}}
  .sheet table.corps th.ldes{{padding-left:{A(61.5-19.0)};}}
  .sheet table.corps th.lpu{{text-align:left;padding-left:{A(175.3-173.6)};}}
  .sheet table.corps th.lmt{{text-align:right;padding-right:{A(.5)};}}
  .sheet table.corps td{{border-left:{B};border-right:{B};padding:0 {A(1.0)} {A(4.25)};vertical-align:top;font-size:{F(9.02)};line-height:{A(4.25)};}}
  .sheet table.corps tr.l1 td{{padding-top:{A(92.3-92.1+DY.get('tbody',0))};}}
  .sheet table.corps td.lref{{padding-left:{A(2.1-1.0)};}}
  .sheet table.corps td.desig{{white-space:pre-wrap;}}
  .sheet table.corps td.desig .desred{{color:#e00000;font-weight:700;}}
  .sheet table.corps td.lqte{{text-align:right;padding-right:{A(173.6-168.9)};}}
  .sheet table.corps td.lpu,.sheet table.corps td.lmt{{text-align:right;padding-right:{A(.85)};white-space:nowrap;}}
  .sheet table.corps tr.fill td{{height:{A(183.7-92.1)};padding:0;border-bottom:{B};}}
"""
# ── zone basse (origine : bas du tableau) ──
for sel,x,y,key in ((".su",20.4,184.5,'sous'),(".s1",20.7,188.3,'sous'),(".s2",20.5,191.9,'sous'),(".s3",20.4,195.4,'sous'),
                    (".cd",99.9,184.3,'sous'),(".tol",100.2,189.2,'sous')):
    css += at(sel, x, y, 8.06, 400, "white-space:nowrap;", zone="b", key=key)
css += f"  .sheet .zb .mt{{margin-left:{A(1.2)};}}\n"
css += f"  .sheet .cachet{{position:absolute;left:{X(2.0)};top:{YL(199.8,'_')};width:{A(42.6)};height:auto;}}\n"
css += box(".tot", 78.0, 202.1, 209.6, 218.7, zone="b")
css += (f"  .sheet .tot>i{{position:absolute;top:0;bottom:0;border-left:{B};}}\n"
        f"  .sheet .tot .k1{{left:{A(102.2-78.0)};}} .sheet .tot .k2{{left:{A(127.6-78.0)};}} .sheet .tot .k3{{left:{A(157.4-78.0)};}}\n"
        f"  .sheet .tot .kr{{left:0;right:{A(209.6-157.4)};top:{A(208.4-202.1)};bottom:auto;border-left:none;border-top:{B};}}\n")
for sel,xh,xv in ((".t1",82.2,83.7),(".t2",105.1,105.1),(".t3",132.1,136.4)):
    css += (f"  .sheet .tot {sel}h{{position:absolute;left:{A(xh-78.0)};white-space:nowrap;}}\n"
            f"  .sheet .tot {sel}v{{position:absolute;left:{A(xv-78.0)};white-space:nowrap;}}\n")
css += f"  .sheet .tot .t1h,.sheet .tot .t2h,.sheet .tot .t3h{{top:{A(204.3-202.1+DY.get('toth',0))};font-weight:700;font-size:{F(9.19)};}}\n"
css += f"  .sheet .tot .t3h small{{font-weight:400;}}\n"
css += f"  .sheet .tot .t1v,.sheet .tot .t2v,.sheet .tot .t3v{{top:{A(211.8-202.1+DY.get('totv',0))};font-size:{F(9.0)};}}\n"
css += (f"  .sheet .tot .netl{{position:absolute;left:{A(171.3-78.0)};top:{A(203.1-202.1+DY.get('netl',0))};"
        f"font-weight:700;font-size:{F(12.33)};text-decoration:underline;text-underline-offset:{A(.6)};white-space:nowrap;}}\n")
css += (f"  .sheet .tot #p-net{{position:absolute;left:{A(157.4-78.0)};right:0;top:{A(210.4-202.1+DY.get('netv',0))};text-align:center;"
        f"font-weight:700;font-size:{F(14.95)};white-space:nowrap;}}\n  .sheet .tot #p-net .sym{{font-weight:400;}}\n")
css += box(".paiebox", 1.9, 220.3, 210.6, 243.1, zone="b")
css += (f"  .sheet .paiebox .pl{{position:absolute;left:{A(4.8-1.9)};top:{A(222.5-220.3+DY.get('paie',0))};font-weight:700;font-size:{F(10.04)};white-space:nowrap;}}\n"
        f"  .sheet .paiebox #p-paie-lignes{{position:absolute;left:{A(61.3-1.9)};top:{A(222.1-220.3+DY.get('paie',0))};font-weight:700;font-size:{F(10.04)};white-space:nowrap;line-height:{A(5.9)};}}\n"
        f"  .sheet .paiebox #p-paie-lignes .m{{display:inline-block;min-width:{A(80.4-61.3)};}}\n"
        f"  .sheet .paiebox .banqcli{{position:absolute;left:{A(6.9-1.9)};top:{A(233.6-220.3+DY.get('banqcli',0))};font-weight:700;font-size:{F(9.03)};white-space:nowrap;}}\n")
# banques + engagement (un seul cadre, comme Sage)
css += box(".bq", 2.5, 244.4, 211.1, 275.6, zone="b")
cols = [90.8, 101.7, 113.8, 133.4, 138.9]
css += f"  .sheet .bq>i{{position:absolute;top:0;bottom:0;border-left:{B};}}\n"
for i,x in enumerate(cols):
    css += f"  .sheet .bq .v{i}{{left:{A(x-2.5)};}}\n"
for i,y in enumerate([248.3,256.7,266.0]):
    css += f"  .sheet .bq .h{i}{{left:0;width:{A(138.9-2.5)};top:{A(y-244.4)};bottom:auto;border-left:none;border-top:{B};}}\n"
css += f"  .sheet .bq b,.sheet .bq span{{position:absolute;font-family:Calibri,Carlito,Arial,sans-serif;font-size:{F(8.1)};white-space:nowrap;line-height:1.15;}}\n"
css += f"  .sheet .bq b{{top:{A(245.4-244.4+DY.get('bankh',0))};font-weight:700;}}\n"
for i,x in enumerate([27.4,92.2,102.5,117.1,133.6]):
    css += f"  .sheet .bq .bh{i}{{left:{A(x-2.5)};}}\n"
css += f"  .sheet .bq span{{font-weight:400;}}\n"
css += (f"  .sheet .bq .eng{{position:absolute;font-family:{H};font-size:{F(9.07)};white-space:nowrap;}}\n")
# EN : textes plus longs → lignes centrées dans le cadre (le décalage « Sage » ne tient plus)
css += f"  .sheet.en .bq .eng{{left:{A(138.9-2.5)}!important;width:{A(211.1-138.9)};text-align:center;font-size:{F(8.4)}!important;}}\n"
css += "/*SHEET-CSS-END*/"

# ── HTML ──
def ytop_bank(y): return A(y-244.4+DY.get('bankv',0))
banks = [
 ("BNP PARIBAS - ILE DE FRANCE EST ENTREPRISES (02511)","IBAN : FR 76 3000 4008 3400 0100 1743 986 - SWIFT:BNPAFRPPIFE","30004","00834","00010017439","86",250.6,252.3),
 ("BANQUE POPULAIRE - BP RIVES CA TOLBIAC (00118)","IBAN : FR 76 1020 7000 1304 0130 5290 161-SWIFT:CCBPFRPPMTG","10207","00013","04013052901","61",259.1,261.7),
 ("SOCIETE GENERALE - SG IVRY SUR SEINE (04240)","IBAN : FR 76 3000 3042 4000 0209 3161 041 - SWIFT:SOGEFRPP","30003","04240","00020931610","41",268.6,270.5),
]
bank_html = ""
for l1,l2,code,gui,cpt,rib,y,yc in banks:
    bank_html += (f'        <span style="left:{A(3.6-2.5)};top:{ytop_bank(y)}">{l1}</span>'
                  f'<span style="left:{A(3.6-2.5)};top:{ytop_bank(y+3.5)}">{l2}</span>\n'
                  f'        <span style="left:{A(91.9-2.5)};top:{ytop_bank(yc)}">{code}</span>'
                  # Sage décale guichet/compte/clé d'un cran (le compte chevauche le trait) : recopié tel quel
                  f'<span style="left:{A(102.9-2.5)};top:{ytop_bank(yc)}">{gui}</span>'
                  f'<span style="left:{A(113.3-2.5)};top:{ytop_bank(yc)}">{cpt}</span>'
                  f'<span style="left:{A(130.0-2.5)};top:{ytop_bank(yc)}">{rib}</span>\n')
eng = [(143.9,245.1,"eng0","Je confirme mon accord sur cette proforma"),(142.5,248.5,"eng1","et les conditions de vente :"),
       (138.3,252.0,"eng2","Je m'engage à payer tous les frais et taxes"),(152.4,255.5,"eng3","s'il y avait un retard, une annulation"),
       (145.0,262.5,"eng4","hors du pays de départ des marchandises.")]
eng_html = "".join(f'<div class="eng" style="left:{A(x-2.5)};top:{A(y-244.4+DY.get("engage",0))}" data-t="{k}">{txt}</div>' for x,y,k,txt in eng)
eng_html += f'<div class="eng" style="left:{A(150.2-2.5)};top:{A(270.7-244.4+DY.get("engage",0))};font-size:{F(8.98)}" data-t="rsc">RENVOYER SIGNÉ ET CACHETÉ</div>'

html = f"""<!--SHEET-START-->
  <!-- ═══ FEUILLE A4 — calque de la proforma Sage DE43006 (généré par gen_sheet.py) ═══ -->
  <div class="sheetbox"><div class="sheet" id="sheet">
    <div class="zh">
      <div class="pagenum">1</div>
      <img class="logo" src="/img/logo.png" alt="Prodiconseil">
      <div class="adr0">9 Promenée Jeanne Hachette 94200 Ivry sur Seine- FRANCE</div>
      <div class="adr1">Contact e-mail : clients@prodi.com</div>
      <div class="adr2">Tel : 331 4672 0369 - Fax : 331 4959 8731</div>
      <div class="adr3">SARL au Capital de 516 000 EUR - Siret : 382445922</div>
      <div class="adr4">NAF 4676Z - TVA FR50 382 445922 RCS CRETEIL</div>
      <div class="exo0" data-t="exo0">Exonération de TVA :</div><div class="exo1" data-t="exo1">Export hors UE: Article 262, I du CGI</div><div class="exo2" data-t="exo2">Livraison intracommunautaire: Article 262 ter, I du CGI</div>
      <div class="rge0" data-t="rge0">Valable 10 jours sauf vente entre temps</div><div class="rge1" data-t="rge1">La confirmation de commande suivra</div>
      <div id="p-titre">Facture Proforma (Euros)</div>
      <div class="commercial"><span data-t="comm">Votre commercial :</span> <span id="p-comm"></span></div>
      <div class="ndr"><div class="c1"></div><div class="c2"></div><div class="r"></div>
        <span class="hn" data-t="numero">NUMERO</span><span class="hd2 hd" data-t="date">DATE</span><span class="hf" data-t="reference">REFERENCE</span>
        <span class="vn" id="p-num">—</span><span class="vd" id="p-date"></span><span class="vf" id="p-ref"></span>
      </div>
      <div id="p-client"></div>
      <div class="refint"><span data-t="refint">Ref. Interne :</span>&nbsp; <span id="p-refint"></span></div>
      <div class="rc"><span data-t="rc">N° intra./RC :</span> <span id="p-rc"></span></div>
      <div class="box-livr">
        <div class="t" data-t="livr">Conditions de livraison</div>
        <div id="p-inco"></div><div id="p-lieu"></div>
        <div class="po"><span data-t="orig">Pays d'origine :</span><span class="pv" id="p-orig"></span></div>
        <div class="pp"><span data-t="prov">Pays de provenance :</span><span class="pv" id="p-prov"></span></div>
      </div>
    </div>

    <table class="corps">
      <colgroup><col class="cref"><col><col class="cpn"><col class="cpu"><col class="cmt"></colgroup>
      <tr><th class="lref" data-t="c_ref">Référence</th><th class="ldes" data-t="c_des">Désignation</th><th class="lqte" id="th-pn">PN <small>(kg)</small></th><th class="lpu" id="th-pu">P.U <small>(€)</small></th><th class="lmt" id="th-mt">Montant HT <small>(€)</small></th></tr>
      <tbody id="p-lignes"></tbody>
      <tr class="fill"><td></td><td></td><td></td><td></td><td></td></tr>
    </table>

    <div class="zb">
      <div class="su"><span data-t="usine">REFERENCE USINE :</span> <span id="p-usine"></span></div>
      <div class="s1"><span data-t="fob">MONTANT FOB :</span><span class="mt" id="p-fob"></span></div>
      <div class="s2"><span data-t="fret">MONTANT DU FRET :</span><span class="mt" id="p-fret"></span></div>
      <div class="s3"><span data-t="cf">MONTANT COÛT ET FRET :</span><span class="mt" id="p-cf"></span></div>
      <div class="cd"><span data-t="douane">CODE DOUANIER :</span> <span id="p-douane"></span></div>
      <div class="tol" data-t="tol">TOLÉRANCE +/- 10%</div>
      <img class="cachet" src="cachet.webp" alt="Cachet Prodiconseil">
      <div class="tot"><i class="k1"></i><i class="k2"></i><i class="k3"></i><i class="kr"></i>
        <span class="t1h" data-t="ht">Total HT</span><span class="t2h" data-t="ttc">Total TTC</span><span class="t3h" id="th-poids">Poids Total <small>(kg)</small></span>
        <span class="netl" data-t="net">NET A PAYER</span>
        <span class="t1v" id="p-ht"></span><span class="t2v" id="p-ttc"></span><span class="t3v" id="p-poids"></span><span id="p-net"></span>
      </div>
      <div class="paiebox">
        <div class="pl" data-t="paie">CONDITIONS DE PAIEMENT :</div><div id="p-paie-lignes"></div>
        <div class="banqcli" data-t="banqcli">Banque du client :</div>
      </div>
      <div class="bq">{''.join(f'<i class="v{i}"></i>' for i in range(5))}{''.join(f'<i class="h{i}"></i>' for i in range(3))}
        <b class="bh0" data-t="bank">BANQUE PRODICONSEIL</b><b class="bh1" data-t="bcode">CODE</b><b class="bh2" data-t="bguichet">GUICHET</b><b class="bh3" data-t="bcompte">COMPTE</b><b class="bh4" data-t="brib">RIB</b>
{bank_html}        {eng_html}
      </div>
    </div>
  </div></div>
<!--SHEET-END-->"""

p = sys.argv[1]
t = open(p).read()
t = re.sub(r'/\*SHEET-CSS-START\*/.*?/\*SHEET-CSS-END\*/', lambda m: css, t, flags=re.S)
t = re.sub(r'<!--SHEET-START-->.*?<!--SHEET-END-->', lambda m: html, t, flags=re.S)
open(p, 'w').write(t)
print("ok", len(css), len(html))
