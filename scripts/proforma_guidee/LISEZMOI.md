# Proforma (`proforma/index.html`) — page GÉNÉRÉE

Depuis le 04/11/2026, /proforma/ EST la version guidée (une seule page). Ne pas éditer `proforma/index.html`
à la main : on modifie `base_index.html` (feuille A4 Prodi/Woluwe + logique : numérotation, archive, PDF,
partage, préremplissage `#d=` du MCP) et/ou les injects, puis on régénère :

    cd ~/Code/prodi_mix
    D=scripts/proforma_guidee
    python3 $D/build_direct.py $D/base_index.html proforma/index.html \
      $D/direct_inject.html $D/smart_inject.html $D/extra_inject.html $D/mobile_inject.html $D/mise_inject.html

- `build_direct.py` : prend `base_index.html` et remplace son formulaire par le formulaire guidé.
- `direct_inject.html` : feuille éditable, client Sage, accès Sage (relais local OU compte Arrivages 1×/appareil).
- `smart_inject.html` : produits (articles G Sage), désignation et code douanier automatiques, déjà acheté.
- `extra_inject.html` : refaire le dernier devis, conteneurs + fret estimé, partage.
- `mobile_inject.html` : iPhone (barre du bas, champs 16 px).
- `mise_inject.html` : fret inclus/en plus (ligne fret + récap) + bouton ✨ Mise en page pleine page (API prodi-arrivages) / ↩ Retour.
- `sage_proxy.py` : relais LOCAL de test (Mac / Wi-Fi, port 8102), clé service lue dans ~/.supabase_prodi.env, jamais en ligne.

Le MCP (prodi-mcp : generer_proforma / pdf_proforma) ouvre `/proforma/#d=…`, appelle `generer()` / `maj()`
et imprime : à revérifier après chaque changement (origine FRANCE par défaut sur un lien sans origine).
`proforma/direct.html` = simple redirection vers /proforma/.
