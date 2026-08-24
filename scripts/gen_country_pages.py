#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Génère le réseau de pages pays SEO (6 régions, ~24 pays). Contenu unique :
villes, ports et ZONES INDUSTRIELLES réelles par pays. Idempotent."""
import os, html, json, urllib.parse

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
CSS_V = "318"; JS_V = "174"

WA = "33649754915"
WA_SVG = ('<svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">'
 '<path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 0 1-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 0 1-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 0 1 2.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0 0 12.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 0 0 5.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 0 0-3.48-8.413z"/></svg>')
WA_SVG_BIG = WA_SVG.replace('width="18" height="18"', 'width="26" height="26"')

STYLE = """.geopage{padding-top:64px;}
.geopage .sec-inner{padding-top:14px;padding-bottom:56px;}
.gp-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(258px,1fr));gap:18px;margin-top:6px;}
.gp-card{border:1px solid var(--border,#e8e8e4);border-radius:20px;padding:24px 26px;background:var(--white,#fff);box-shadow:var(--sh-sm,0 1px 2px rgba(0,0,0,.04));}
.gp-card h3{font-family:'DM Sans',sans-serif;font-size:18px;font-weight:700;color:var(--ink,#222);margin:0 0 10px;}
.gp-card p{font-size:14.5px;line-height:1.6;color:var(--g1,#515154);margin:0 0 8px;}
.gp-chips{display:flex;flex-wrap:wrap;gap:8px;margin-top:10px;}
.gp-chip{font-size:13px;font-weight:600;color:var(--ink,#222);background:var(--off,#f5f5f3);border:1px solid var(--border,#e8e8e4);border-radius:999px;padding:6px 13px;}
.gp-faq{max-width:820px;margin-top:4px;}
.gp-faq details{border-bottom:1px solid var(--hairline,#e0e0e5);}
.gp-faq summary{font-family:'DM Sans',sans-serif;font-size:16px;font-weight:600;color:var(--ink,#222);padding:18px 0;cursor:pointer;list-style:none;display:flex;justify-content:space-between;align-items:center;gap:16px;}
.gp-faq summary::-webkit-details-marker{display:none;}
.gp-faq summary::after{content:'+';font-size:22px;color:var(--g3,#86868b);font-weight:400;line-height:1;}
.gp-faq details[open] summary::after{content:'–';}
.gp-faq details p{font-size:14.5px;line-height:1.65;color:var(--g1,#515154);margin:-2px 0 18px;max-width:760px;}
.gp-cta{text-align:center;padding:52px 24px 8px;}
.gp-cta h2{font-family:'Bebas Neue',sans-serif;font-size:clamp(30px,5vw,46px);color:var(--ink,#222);margin:0 0 10px;letter-spacing:.5px;}
.gp-cta p{font-size:15px;color:var(--g2,#6e6e73);margin:0 auto 22px;max-width:520px;}
.gp-wa{display:inline-flex;align-items:center;gap:8px;background:#25D366;color:#fff;font-family:'DM Sans',sans-serif;font-weight:700;font-size:14.5px;text-decoration:none;padding:12px 22px;border-radius:999px;}
.gp-links{margin-top:34px;font-size:13.5px;color:var(--g2,#6e6e73);}
.gp-links a{color:var(--ink,#222);font-weight:600;text-decoration:none;}
.gp-links a:hover{text-decoration:underline;}"""

# region key -> libellé
REGIONS = {
 "maghreb": "Maghreb",
 "afrique-ouest": "Afrique de l'Ouest",
 "afrique-centrale": "Afrique centrale",
 "afrique-est": "Afrique de l'Est & Océan Indien",
 "europe": "Europe de l'Est",
 "moyen-orient": "Méditerranée orientale & Moyen-Orient",
}

# slug -> données pays
C = {
 # ---------- MAGHREB ----------
 "maroc": dict(region="maghreb", nom="Maroc", au="au Maroc", adj="marocain",
   cities=["Casablanca","Rabat","Tanger","Marrakech","Fès","Agadir"],
   ports=["Casablanca","Tanger Med","Agadir"],
   zones=["Aïn Sebaâ / Sidi Bernoussi (Casablanca)","Tanger Free Zone","Atlantic Free Zone (Kénitra)"],
   ctx="Le Maroc est l'un de nos marchés export majeurs : imprimeries de Casablanca, transformateurs d'emballage de Tanger et de Kénitra, distributeurs de Rabat et de Marrakech.",
   imp="Grâce à l'accord Maroc–UE, l'origine préférentielle (certificat EUR.1) réduit les droits de douane à l'import. Nous fournissons EUR.1, facture, packing list et certificat d'origine."),
 "algerie": dict(region="maghreb", nom="Algérie", au="en Algérie", adj="algérien",
   cities=["Alger","Oran","Constantine","Sétif","Blida","Béjaïa","Annaba"],
   ports=["Alger","Oran","Béjaïa","Skikda","Annaba"],
   zones=["Rouiba – Réghaïa (Alger)","Es Sénia (Oran)","Arzew","Zone industrielle de Sétif"],
   ctx="L'Algérie est un marché historique de Prodiconseil. Imprimeurs et transformateurs d'Alger, d'Oran et de Sétif comptent sur nos stocks pour éviter les délais de fabrication.",
   imp="L'import passe par l'autorisation d'importer (PPI), la facture proforma et la domiciliation bancaire, puis le dédouanement. Notre force : un stock prêt à partir dès que votre PPI est validée — pas d'attente d'usine.",
   ppi=True),
 "tunisie": dict(region="maghreb", nom="Tunisie", au="en Tunisie", adj="tunisien",
   cities=["Tunis","Sfax","Sousse","Bizerte","Gabès"],
   ports=["Radès (Tunis)","Sfax","Bizerte","Sousse"],
   zones=["Ben Arous / Mégrine (Tunis)","Zone franche de Bizerte","Zone franche de Zarzis","Sidi Salem (Sfax)"],
   ctx="La Tunisie concentre une forte activité d'impression et d'emballage autour de Tunis, Sfax et Sousse, avec de nombreux transformateurs tournés vers l'export.",
   imp="Selon votre statut (résident, totalement exportateur, zone franche), le régime d'import diffère. Nous fournissons le dossier export complet et conseillons l'incoterm adapté."),
 "libye": dict(region="maghreb", nom="Libye", au="en Libye", adj="libyen",
   cities=["Tripoli","Benghazi","Misrata"],
   ports=["Tripoli","Benghazi","Misrata","Al Khoms"],
   zones=["Zone franche de Misrata"],
   ctx="La Libye importe l'essentiel de son papier et de son carton. Nous approvisionnons les négociants et imprimeurs de Tripoli, Benghazi et Misrata.",
   imp="Nous expédions vers les ports libyens avec le dossier documentaire complet. Contactez-nous pour les modalités et l'incoterm adaptés à votre acheminement."),
 "mauritanie": dict(region="maghreb", nom="Mauritanie", au="en Mauritanie", adj="mauritanien",
   cities=["Nouakchott","Nouadhibou"],
   ports=["Nouakchott (Port de l'Amitié)","Nouadhibou"],
   zones=["Zone franche de Nouadhibou"],
   ctx="La Mauritanie s'approvisionne par Nouakchott et Nouadhibou. Nous servons imprimeurs et distributeurs en papier d'édition, kraft et carton d'emballage.",
   imp="Expédition par conteneur vers Nouakchott ou Nouadhibou, dossier export fourni. La zone franche de Nouadhibou offre un cadre avantageux à certains importateurs."),
 # ---------- AFRIQUE DE L'OUEST ----------
 "senegal": dict(region="afrique-ouest", nom="Sénégal", au="au Sénégal", adj="sénégalais",
   cities=["Dakar","Thiès","Touba","Saint-Louis","Rufisque"],
   ports=["Dakar"],
   zones=["Diamniadio (DISEZ)","Zone industrielle de Rufisque","Sébikotane"],
   ctx="Dakar est un hub logistique de l'Afrique de l'Ouest. Nous y livrons imprimeurs et transformateurs, et réexpédions vers les pays enclavés voisins.",
   imp="Le port de Dakar dessert le Sénégal et sert de porte d'entrée vers le Mali. Nous fournissons facture, packing list et certificat d'origine pour le dédouanement."),
 "cote-d-ivoire": dict(region="afrique-ouest", nom="Côte d'Ivoire", au="en Côte d'Ivoire", adj="ivoirien",
   cities=["Abidjan","Bouaké","San-Pédro","Yamoussoukro"],
   ports=["Abidjan","San-Pédro"],
   zones=["Yopougon (Abidjan)","Vridi (Abidjan)","Koumassi (Abidjan)"],
   ctx="Abidjan est la première place d'impression et d'emballage d'Afrique de l'Ouest francophone. Ses zones industrielles de Yopougon et Vridi concentrent transformateurs et imprimeurs.",
   imp="Le port d'Abidjan dessert la Côte d'Ivoire et les pays de l'hinterland (Mali, Burkina). Dossier export complet fourni, incoterms EXW/FOB/CIF au choix."),
 "mali": dict(region="afrique-ouest", nom="Mali", au="au Mali", adj="malien",
   cities=["Bamako","Sikasso","Ségou"],
   ports=["via Abidjan","via Dakar","via Lomé"],
   zones=["Zone industrielle de Bamako (Sotuba)"],
   ctx="Pays enclavé, le Mali s'approvisionne via les ports d'Abidjan, Dakar ou Lomé. Nous organisons l'acheminement jusqu'à Bamako pour imprimeurs et transformateurs.",
   imp="L'acheminement se fait par conteneur jusqu'au port de transit puis par route vers Bamako. Nous fournissons le dossier documentaire et conseillons le corridor le plus fluide.", enclave=True),
 "burkina-faso": dict(region="afrique-ouest", nom="Burkina Faso", au="au Burkina Faso", adj="burkinabè",
   cities=["Ouagadougou","Bobo-Dioulasso"],
   ports=["via Abidjan","via Lomé","via Tema"],
   zones=["Kossodo (Ouagadougou)","Zone industrielle de Bobo-Dioulasso"],
   ctx="Le Burkina Faso, enclavé, importe son papier via Abidjan, Lomé ou Tema. Ouagadougou et Bobo-Dioulasso concentrent l'impression et l'emballage.",
   imp="Transit par conteneur jusqu'au port côtier puis route vers Ouagadougou. Dossier export fourni ; nous conseillons le corridor selon la période.", enclave=True),
 "guinee": dict(region="afrique-ouest", nom="Guinée", au="en Guinée", adj="guinéen",
   cities=["Conakry","Kankan","Nzérékoré"],
   ports=["Conakry"],
   zones=["Zone industrielle de Matoto (Conakry)","Kaloum (Conakry)"],
   ctx="La Guinée importe par le port de Conakry. Nous y approvisionnons imprimeurs et distributeurs en papier d'édition, kraft et carton.",
   imp="Expédition par conteneur vers Conakry, dossier export complet. Incoterms EXW/FOB/CIF selon votre logistique."),
 "benin": dict(region="afrique-ouest", nom="Bénin", au="au Bénin", adj="béninois",
   cities=["Cotonou","Porto-Novo","Parakou"],
   ports=["Cotonou"],
   zones=["GDIZ (Glo-Djigbé)","Zone industrielle d'Akpakpa (Cotonou)"],
   ctx="Le port de Cotonou dessert le Bénin et une partie de l'hinterland (Niger). La zone industrielle de Glo-Djigbé développe la transformation locale.",
   imp="Dossier export fourni pour le dédouanement à Cotonou. Le port sert aussi de porte d'entrée vers le Niger."),
 "togo": dict(region="afrique-ouest", nom="Togo", au="au Togo", adj="togolais",
   cities=["Lomé","Sokodé","Kara"],
   ports=["Lomé"],
   zones=["Zone franche de Lomé (SAZOF)","Plateforme portuaire de Lomé"],
   ctx="Le port de Lomé, en eau profonde, est un hub de transbordement régional. Sa zone franche attire transformateurs et négociants.",
   imp="Lomé dessert le Togo et sert de hub vers le Burkina, le Niger et le Mali. Dossier export complet fourni ; cadre avantageux en zone franche."),
 # ---------- AFRIQUE CENTRALE ----------
 "cameroun": dict(region="afrique-centrale", nom="Cameroun", au="au Cameroun", adj="camerounais",
   cities=["Douala","Yaoundé","Bafoussam"],
   ports=["Douala","Kribi"],
   zones=["Bassa (Douala)","Bonabéri (Douala)","Zone industrielle de Kribi"],
   ctx="Douala est le premier port d'Afrique centrale et dessert aussi le Tchad et la Centrafrique. Ses zones de Bassa et Bonabéri concentrent l'industrie.",
   imp="Le port de Douala (et Kribi en eau profonde) dessert le Cameroun et l'hinterland. Dossier export complet fourni."),
 "gabon": dict(region="afrique-centrale", nom="Gabon", au="au Gabon", adj="gabonais",
   cities=["Libreville","Port-Gentil","Franceville"],
   ports=["Libreville (Owendo)","Port-Gentil"],
   zones=["Zone économique spéciale de Nkok (GSEZ)"],
   ctx="Le Gabon importe par Libreville et Port-Gentil. La zone spéciale de Nkok développe la transformation ; nous servons imprimeurs et négociants.",
   imp="Expédition par conteneur vers Owendo, dossier export fourni. La ZES de Nkok offre un cadre douanier avantageux."),
 "congo": dict(region="afrique-centrale", nom="Congo", au="au Congo", adj="congolais",
   cities=["Brazzaville","Pointe-Noire","Dolisie"],
   ports=["Pointe-Noire"],
   zones=["Zone industrielle de Pointe-Noire","Zone de Maloukou (Brazzaville)"],
   ctx="Le port de Pointe-Noire est la porte d'entrée du Congo et dessert Brazzaville par le rail et la route. Nous y livrons imprimeurs et distributeurs.",
   imp="Dossier export complet fourni pour le dédouanement à Pointe-Noire. Acheminement vers Brazzaville par corridor intérieur."),
 "rd-congo": dict(region="afrique-centrale", nom="RD Congo", au="en RD Congo", adj="congolais",
   cities=["Kinshasa","Lubumbashi","Matadi","Goma"],
   ports=["Matadi","Boma"],
   zones=["Zone économique de Maluku (Kinshasa)","Port de Matadi"],
   ctx="La RD Congo importe par Matadi pour desservir Kinshasa, et par les corridors est pour Lubumbashi. Vaste marché pour le papier d'édition et l'emballage.",
   imp="Le port de Matadi dessert Kinshasa. Dossier export complet fourni ; nous conseillons le corridor selon la destination finale."),
 "tchad": dict(region="afrique-centrale", nom="Tchad", au="au Tchad", adj="tchadien",
   cities=["N'Djamena","Moundou","Sarh"],
   ports=["via Douala"],
   zones=["Zone industrielle de N'Djamena"],
   ctx="Pays enclavé, le Tchad s'approvisionne via le port de Douala puis la route jusqu'à N'Djamena. Nous organisons l'acheminement pour imprimeurs et distributeurs.",
   imp="Transit par Douala puis corridor routier vers N'Djamena. Dossier documentaire complet fourni.", enclave=True),
 # ---------- AFRIQUE DE L'EST ----------
 "kenya": dict(region="afrique-est", nom="Kenya", au="au Kenya", adj="kényan",
   cities=["Nairobi","Mombasa","Nakuru"],
   ports=["Mombasa"],
   zones=["Nairobi Industrial Area","EPZ d'Athi River","Zone portuaire de Mombasa"],
   ctx="Le port de Mombasa dessert le Kenya et l'Afrique de l'Est (Ouganda, Rwanda). Nairobi concentre l'impression et l'emballage de la région.",
   imp="Expédition par conteneur vers Mombasa, dossier export fourni. Le port sert de hub vers l'hinterland est-africain."),
 "madagascar": dict(region="afrique-est", nom="Madagascar", au="à Madagascar", adj="malgache",
   cities=["Antananarivo","Toamasina","Antsirabe","Mahajanga"],
   ports=["Toamasina (Tamatave)","Mahajanga"],
   zones=["Zone franche d'Antananarivo","Zone industrielle d'Antsirabe"],
   ctx="Madagascar importe par Toamasina pour desservir Antananarivo. Les zones franches concentrent une industrie d'impression et d'emballage tournée vers l'export.",
   imp="Expédition vers Toamasina, dossier export complet. Les entreprises en zone franche bénéficient d'un régime douanier spécifique."),
 "djibouti": dict(region="afrique-est", nom="Djibouti", au="à Djibouti", adj="djiboutien",
   cities=["Djibouti"],
   ports=["Djibouti"],
   zones=["Djibouti International Free Trade Zone (DIFTZ)"],
   ctx="Le port de Djibouti est un hub majeur qui dessert Djibouti et surtout l'Éthiopie. Sa zone franche internationale attire négociants et transformateurs.",
   imp="Djibouti sert de porte d'entrée vers l'Éthiopie. Dossier export complet fourni ; cadre avantageux en zone franche (DIFTZ)."),
 # ---------- EUROPE DE L'EST ----------
 "pologne": dict(region="europe", eu=True, nom="Pologne", au="en Pologne", adj="polonais",
   cities=["Varsovie","Cracovie","Gdańsk","Łódź","Poznań","Wrocław"],
   ports=["Gdańsk","Gdynia"],
   zones=["Zones économiques spéciales (SSE)","Zone portuaire de Gdańsk","Łódź"],
   ctx="La Pologne est l'un des plus gros marchés d'impression et d'emballage d'Europe de l'Est, avec de nombreuses zones économiques spéciales dédiées à la transformation.",
   imp="Livraison intra-UE sans droits de douane : facture et transport routier depuis Amiens, en quelques jours."),
 "roumanie": dict(region="europe", eu=True, nom="Roumanie", au="en Roumanie", adj="roumain",
   cities=["Bucarest","Cluj-Napoca","Timișoara","Constanța","Brașov"],
   ports=["Constanța"],
   zones=["Parcs industriels de Bucarest","Zone industrielle de Timișoara","Port de Constanța"],
   ctx="La Roumanie a une industrie d'impression et d'emballage en forte croissance autour de Bucarest, Cluj et Timișoara, avec le grand port de Constanța sur la mer Noire.",
   imp="Livraison intra-UE sans formalités douanières : facture et transport routier depuis Amiens."),
 "bulgarie": dict(region="europe", eu=True, nom="Bulgarie", au="en Bulgarie", adj="bulgare",
   cities=["Sofia","Plovdiv","Varna","Bourgas"],
   ports=["Varna","Bourgas"],
   zones=["Zones industrielles de Sofia et Plovdiv","Ports de Varna et Bourgas"],
   ctx="La Bulgarie concentre son industrie d'impression et d'emballage autour de Sofia et Plovdiv, avec les ports de Varna et Bourgas sur la mer Noire.",
   imp="Livraison intra-UE sans droits de douane : facture et transport routier depuis Amiens."),
 "hongrie": dict(region="europe", eu=True, nom="Hongrie", au="en Hongrie", adj="hongrois",
   cities=["Budapest","Debrecen","Szeged","Győr"],
   ports=["route directe","via Constanța","via Koper"],
   zones=["Zones industrielles de Budapest","Parc industriel de Győr","Debrecen"],
   ctx="La Hongrie, au cœur de l'Europe centrale, abrite une industrie d'emballage dynamique autour de Budapest et Győr. Sans façade maritime, elle se livre efficacement par la route.",
   imp="Livraison intra-UE sans formalités douanières : facture et transport routier direct depuis Amiens.", enclave=True),
 "serbie": dict(region="europe", eu=False, nom="Serbie", au="en Serbie", adj="serbe",
   cities=["Belgrade","Novi Sad","Niš"],
   ports=["Danube (Belgrade)","via ports voisins"],
   zones=["Zones franches de Belgrade et Novi Sad","Parc industriel de Niš"],
   ctx="La Serbie, plaque tournante des Balkans, développe ses zones franches autour de Belgrade et Novi Sad. Nous y livrons imprimeurs et transformateurs par la route.",
   imp="La Serbie n'étant pas membre de l'UE, l'import passe par le dédouanement : nous fournissons le dossier export complet (facture, packing list, certificat d'origine).", enclave=True),
 # ---------- MÉDITERRANÉE ORIENTALE & MOYEN-ORIENT ----------
 "egypte": dict(region="moyen-orient", nom="Égypte", au="en Égypte", adj="égyptien",
   cities=["Le Caire","Alexandrie","Gizeh","Port-Saïd"],
   ports=["Alexandrie","Port-Saïd","Damiette"],
   zones=["6 Octobre & 10 Ramadan (Le Caire)","Zone industrielle d'Alexandrie","Zone du Canal de Suez (SCZone)"],
   ctx="L'Égypte est l'un des plus gros marchés d'impression et d'emballage d'Afrique du Nord, concentré autour du Caire (6 Octobre, 10 Ramadan) et d'Alexandrie.",
   imp="Grâce à l'accord d'association UE-Égypte, le certificat d'origine EUR.1 réduit les droits de douane. Nous expédions vers Alexandrie ou Port-Saïd avec le dossier export complet."),
 "turquie": dict(region="moyen-orient", nom="Turquie", au="en Turquie", adj="turc",
   cities=["Istanbul","Ankara","Izmir","Bursa","Adana"],
   ports=["Istanbul (Ambarlı)","Izmir","Mersin"],
   zones=["Zones industrielles organisées (OSB) d'Istanbul, Bursa et Izmir"],
   ctx="La Turquie possède une puissante industrie d'impression et d'emballage, concentrée autour d'Istanbul, Bursa et Izmir dans ses zones industrielles organisées (OSB).",
   imp="Grâce à l'union douanière UE-Turquie, les produits industriels circulent avec le document A.TR (droits réduits). Nous expédions vers Istanbul, Izmir ou Mersin, dossier complet fourni."),
 "liban": dict(region="moyen-orient", nom="Liban", au="au Liban", adj="libanais",
   cities=["Beyrouth","Tripoli","Saïda"],
   ports=["Beyrouth","Tripoli"],
   zones=["Zone industrielle de Beyrouth","Port de Tripoli"],
   ctx="Le Liban conserve une industrie d'impression et d'édition active. Nous approvisionnons imprimeurs et transformateurs par les ports de Beyrouth et Tripoli.",
   imp="Expédition par conteneur vers Beyrouth ou Tripoli, dossier export complet fourni. Incoterms EXW/FOB/CIF au choix."),
}

ORDER = list(C.keys())

def chips(items):
    return "".join('\n            <span class="gp-chip">'+html.escape(x)+'</span>' for x in items)

TEMPLATE = open(os.path.join(ROOT,'scripts','_country_template.html'),encoding='utf-8').read() if os.path.exists(os.path.join(ROOT,'scripts','_country_template.html')) else None

def build(slug, d):
    nom = d["nom"]; au = d["au"]; region = d["region"]; reglabel = REGIONS[region]
    url = "https://paper.prodi.com/"+slug+"/"
    ports_villes = d["ports"] + [c for c in d["cities"] if c not in d["ports"]]
    wa_txt = "Bonjour Ethan,\nJe voudrais recevoir une offre pour du papier / carton.\nMerci"
    wa_url = "https://wa.me/"+WA+"?text="+urllib.parse.quote(wa_txt)
    # cartes
    cards = ""
    cards += ('\n        <div class="gp-card">\n          <h3>Ports &amp; villes desservis</h3>\n          <p>Nous expédions vers les principaux ports et livrons dans tout le pays.</p>\n          <div class="gp-chips">'+chips(ports_villes)+'\n          </div>\n        </div>')
    cards += ('\n        <div class="gp-card">\n          <h3>Zones industrielles desservies</h3>\n          <p>Nous approvisionnons imprimeurs et transformateurs des principaux pôles industriels.</p>\n          <div class="gp-chips">'+chips(d["zones"])+'\n          </div>\n        </div>')
    cards += ('\n        <div class="gp-card">\n          <h3>Papiers &amp; cartons demandés</h3>\n          <p>Une gamme complète, en bobines et en formats, pour l\'impression, la presse et l\'emballage.</p>\n          <div class="gp-chips">'+chips(["Offset","Papier journal","Couché 1-2 faces","Kraft","Carton couché","Autocopiant"])+'\n          </div>\n        </div>')
    cards += ('\n        <div class="gp-card">\n          <h3>Logistique &amp; formalités</h3>\n          <p>'+html.escape(d["imp"])+'</p>\n        </div>')
    # FAQ
    faq = []
    faq.append(("Quels sont les délais de livraison de papier "+au+" ?",
      "La plupart de nos papiers sont en stock : l'expédition part sous quelques jours dès l'offre validée. S'ajoute le transit "+("routier" if region=="europe" else "maritime")+" vers "+d["ports"][0]+", généralement de quelques jours à deux semaines selon la rotation."))
    faq.append(("Quels ports et villes desservez-vous "+au+" ?",
      "Principalement "+", ".join(d["ports"])+". Nous livrons imprimeurs, transformateurs et distributeurs à "+", ".join(d["cities"][:4])+" et dans tout le pays."))
    if d.get("ppi"):
        faq.append(("Comment importer du papier "+au+" avec la PPI ?",
          "L'import suppose l'autorisation d'importer (PPI), la facture proforma, la domiciliation bancaire puis le dédouanement. Nous fournissons le dossier export (facture, packing list, certificat d'origine) et surtout nous expédions depuis un stock déjà disponible — vous n'attendez pas plusieurs semaines de fabrication."))
    else:
        faq.append(("Comment se passent les formalités d'import "+au+" ?",
          d["imp"]))
    faq.append(("Quels incoterms proposez-vous "+au+" ?",
      "En intra-UE, la livraison se fait sans droits de douane : simple facture et transport, généralement EXW ou livraison rendue selon votre préférence." if d.get("eu") else "Selon votre logistique : EXW (départ dépôt), FOB port français ou CIF port de destination. Nous vous conseillons l'incoterm le plus adapté."))
    faq.append(("Quels papiers et cartons sont disponibles pour "+("le marché "+d["adj"]) +" ?",
      "Offset, papier journal, couché une et deux faces, kraft, cartons et autocopiant — en bobines et en formats, avec plus de 10 000 tonnes en stock permanent."))
    faq_json = ",\n    ".join('{"@type": "Question", "name": '+json.dumps(q,ensure_ascii=False)+', "acceptedAnswer": {"@type": "Answer", "text": '+json.dumps(a,ensure_ascii=False)+'}}' for q,a in faq)
    faq_html = "\n".join('        <details>\n          <summary>'+html.escape(q)+'</summary>\n          <p>'+html.escape(a)+'</p>\n        </details>' for q,a in faq)
    # cross-links même région
    sib = [(s,C[s]["nom"]) for s in ORDER if C[s]["region"]==region and s!=slug]
    sib_links = " · ".join('<a href="/'+s+'/">'+html.escape(nm)+'</a>' for s,nm in sib)
    # footer zones : régions (une tête de pont par région)
    flag = {"maghreb":"maroc","afrique-ouest":"senegal","afrique-centrale":"cameroun","afrique-est":"kenya","europe":"pologne","moyen-orient":"egypte"}
    foot_zones = "\n".join('      <a href="/'+flag[rk]+'/">'+html.escape(lbl)+'</a>' for rk,lbl in REGIONS.items())
    lead = d["ctx"]+" Avec un stock permanent de plus de 10 000 tonnes en France, nous répondons rapidement — bobines et formats disponibles immédiatement."
    para = "Nous proposons une large gamme de papier offset et de papier journal pour l'édition, de couché pour le packaging, de kraft pour l'emballage et de cartons pour la boîte pliante. Notre équipe connaît les contraintes documentaires de l'import "+au+" et accompagne chaque expédition."
    return TEMPL.replace("@@TITLE@@", html.escape("Fournisseur de papier & carton "+au+" — Import export | Prodiconseil")) \
      .replace("@@DESC@@", html.escape("Fournisseur et grossiste de papier & carton pour "+("le "+nom if region in ('europe',) or nom in ('Maroc','Sénégal','Cameroun','Gabon','Congo','Togo','Bénin','Mali','Tchad','Kenya','Liban','Portugal') else nom)+" : offset, couché, kraft, cartons en bobines et formats. Expédition vers "+", ".join(d["cities"][:3])+". Devis 24 h.")) \
      .replace("@@URL@@", url).replace("@@REGION@@", html.escape(reglabel)) \
      .replace("@@OGT@@", html.escape("Fournisseur de papier & carton "+au+" — Prodiconseil")) \
      .replace("@@BREAD@@", html.escape("Papier & carton "+au)) \
      .replace("@@H1@@", html.escape("Fournisseur de papier & carton "+au)) \
      .replace("@@SUB@@", html.escape("Négociant français depuis 1991 — nous approvisionnons imprimeurs, transformateurs et distributeurs "+("de "+nom if False else au.replace('en ','de ').replace('au ','du ').replace('aux ','des ').replace('à ','de '))+" en bobines et formats, expédiés vers "+", ".join(d["cities"][:3])+".")) \
      .replace("@@LEAD@@", html.escape(lead)).replace("@@PARA@@", html.escape(para)) \
      .replace("@@SECH@@", html.escape(("GROSSISTE ET IMPORT DE PAPIER "+au).upper())) \
      .replace("@@CARDS@@", cards).replace("@@FAQJSON@@", faq_json).replace("@@FAQHTML@@", faq_html) \
      .replace("@@SIBLABEL@@", html.escape(reglabel)).replace("@@SIBLINKS@@", sib_links) \
      .replace("@@FOOTZONES@@", foot_zones) \
      .replace("@@WAURL@@", wa_url).replace("@@CTAH@@", html.escape("Un besoin de papier ou carton "+au+" ?")) \
      .replace("@@AREASERVED@@", json.dumps(nom, ensure_ascii=False)) \
      .replace("@@CSSV@@", CSS_V).replace("@@JSV@@", JS_V) \
      .replace("@@WASVG@@", WA_SVG).replace("@@WASVGBIG@@", WA_SVG_BIG).replace("@@STYLE@@", STYLE)

TEMPL = '''<!DOCTYPE html>
<html lang="fr">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<meta http-equiv="Content-Security-Policy" content="default-src 'self'; script-src 'self' 'unsafe-inline' https://cdn.jsdelivr.net; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com; img-src 'self' data: blob: https://stock.prodi.net https://paper.prodi.com https://prodi-paper.github.io https://images.unsplash.com; connect-src 'self' https://bvcgpdoukhcatjibmvnb.supabase.co https://api.emailjs.com https://cdn.jsdelivr.net; frame-ancestors 'none'; base-uri 'self'; form-action 'self';">
<meta http-equiv="X-Content-Type-Options" content="nosniff">
<meta name="referrer" content="strict-origin-when-cross-origin">
<link rel="icon" type="image/png" href="/img/panda.png">
<title>@@TITLE@@</title>
<meta name="description" content="@@DESC@@">
<meta name="robots" content="index, follow">
<link rel="canonical" href="@@URL@@">
<meta property="og:type" content="website">
<meta property="og:site_name" content="Prodiconseil">
<meta property="og:locale" content="fr_FR">
<meta property="og:url" content="@@URL@@">
<meta property="og:title" content="@@OGT@@">
<meta property="og:description" content="@@DESC@@">
<meta property="og:image" content="https://paper.prodi.com/img/og-card.jpg">
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:title" content="@@OGT@@">
<meta name="twitter:description" content="@@DESC@@">
<meta name="twitter:image" content="https://paper.prodi.com/img/og-card.jpg">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Bebas+Neue&family=Oswald:wght@600;700&family=DM+Sans:wght@300;400;500;600;700;800&family=Space+Grotesk:wght@300;400;500;600;700&display=swap" rel="stylesheet">
<link rel="stylesheet" href="/vitrine.css?v=@@CSSV@@">
<script type="application/ld+json">
{
  "@context": "https://schema.org",
  "@type": "BreadcrumbList",
  "itemListElement": [
    {"@type": "ListItem", "position": 1, "name": "Accueil", "item": "https://paper.prodi.com/"},
    {"@type": "ListItem", "position": 2, "name": "@@BREAD@@", "item": "@@URL@@"}
  ]
}
</script>
<script type="application/ld+json">
{
  "@context": "https://schema.org",
  "@type": "Service",
  "serviceType": "Fourniture et export de papier et carton",
  "provider": {"@type": "Organization", "name": "Prodiconseil", "url": "https://paper.prodi.com/"},
  "areaServed": {"@type": "Country", "name": @@AREASERVED@@},
  "url": "@@URL@@",
  "inLanguage": "fr"
}
</script>
<script type="application/ld+json">
{
  "@context": "https://schema.org",
  "@type": "FAQPage",
  "mainEntity": [
    @@FAQJSON@@
  ]
}
</script>
</head>
<body class="souspage">

<header class="hd">
  <div class="hd-inner">
    <div class="hd-logo" onclick="location.href='/'"><img src="/img/logo.png" alt="Prodiconseil" width="196" height="32"></div>
    <nav class="hd-nav">
      <a href="/produits/">Produits</a>
      <a href="/histoire/">Histoire</a>
    </nav>
    <div class="hd-divider"></div>
    <a href="/contact/" class="btn-cat">Contact →</a>
  </div>
</header>

<style>
@@STYLE@@
</style>

<main class="geopage">
  <div class="page-head">
    <h1 class="page-h1">@@H1@@</h1>
    <p class="page-sub">@@SUB@@</p>
  </div>

  <section class="habt-sec">
    <div class="sec-inner">
      <h2 class="sec-h">@@SECH@@</h2>
      <p class="habt-lead">@@LEAD@@</p>
      <p class="habt-p">@@PARA@@</p>

      <div class="gp-grid">@@CARDS@@
      </div>
    </div>
  </section>

  <section class="habt-sec">
    <div class="sec-inner">
      <h2 class="sec-h">QUESTIONS FRÉQUENTES</h2>
      <div class="gp-faq">
@@FAQHTML@@
      </div>

      <p class="gp-links">@@SIBLABEL@@ : @@SIBLINKS@@ · <a href="/#international">Toutes nos zones</a> · <a href="/produits/">Nos produits</a></p>
    </div>
  </section>

  <section class="gp-cta">
    <h2>@@CTAH@@</h2>
    <p>Laissez-nous votre demande, on vous rappelle sous 24 h avec une offre adaptée à votre marché.</p>
    <div class="gp-cta-btns">
      <a href="/contact/" class="btn-cat">Demander une offre →</a>
      <a class="gp-wa" href="@@WAURL@@" target="_blank" rel="noopener noreferrer">
        @@WASVG@@
        WhatsApp
      </a>
    </div>
  </section>
</main>

<footer>
  <div class="ft2-grid">
    <div class="ft2-brand">
      <a href="/"><img src="/img/logo.png" alt="Prodiconseil" width="170" height="28"></a>
      <p class="ft2-tag">Négociant international en papier &amp; carton depuis 1991.</p>
    </div>
    <div class="ft2-col">
      <div class="ft2-h">Nos papiers</div>
      <a href="/offset/">Papier offset</a>
      <a href="/papier-couche/">Papier couché</a>
      <a href="/kraft/">Papier kraft</a>
      <a href="/carton-couche/">Carton couché</a>
    </div>
    <div class="ft2-col ft2-col-zones">
      <div class="ft2-h">Zones desservies</div>
@@FOOTZONES@@
    </div>
    <div class="ft2-col">
      <div class="ft2-h">Nous joindre</div>
      <a href="@@WAURL@@" target="_blank" rel="noopener noreferrer">WhatsApp</a>
      <a href="tel:+33609997407">+33 6 09 99 74 07</a>
      <a href="mailto:contact@prodi.com">contact@prodi.com</a>
    </div>
  </div>
  <div class="ft2-bottom">© 2026 Prodiconseil · Stock papier &amp; carton · Dépôt Amiens — 14 000 m²</div>
</footer>

<div id="stock-gate" class="stock-gate" style="display:none" role="dialog" aria-modal="true" aria-label="Accès au stock">
  <div class="stock-gate-overlay" onclick="closeStockGate()"></div>
  <div class="stock-gate-card">
    <button class="stock-gate-close" onclick="closeStockGate()" aria-label="Fermer">&times;</button>
    <div class="stock-gate-ico">
      <svg width="34" height="34" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><rect x="4" y="10.5" width="16" height="10.5" rx="2.6"/><path d="M8 10.5V7a4 4 0 0 1 8 0v3.5"/></svg>
    </div>
    <form onsubmit="submitStockGate(event)">
      <input type="text" id="stock-gate-code" placeholder="Code d'accès" autocomplete="off" spellcheck="false" autocapitalize="off">
      <div id="stock-gate-err" class="stock-gate-err"></div>
      <button type="submit" class="stock-gate-btn">Confirmer</button>
    </form>
    <button type="button" class="stock-gate-contact" onclick="window.prodiTrack?.('gate_contact');closeStockGate();location.href='/contact/'">Pas encore client ?</button>
  </div>
</div>

<script src="/analytics.js?v=3"></script>
<script src="/vitrine.js?v=@@JSV@@"></script>
<a href="@@WAURL@@" target="_blank" rel="noopener noreferrer" class="wa-sticky" title="WhatsApp" aria-label="Nous contacter sur WhatsApp">
  @@WASVGBIG@@
</a>

</body>
</html>
'''

for slug in ORDER:
    dd = os.path.join(ROOT, slug); os.makedirs(dd, exist_ok=True)
    open(os.path.join(dd,"index.html"),"w",encoding="utf-8").write(build(slug, C[slug]))
print("OK", len(ORDER), "pages pays :", ", ".join(ORDER))
