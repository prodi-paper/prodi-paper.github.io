# Proforma guidée (`proforma/direct.html`)

Page GÉNÉRÉE : ne pas éditer `proforma/direct.html` à la main.

    cd ~/Code/prodi_mix
    D=scripts/proforma_guidee
    python3 $D/build_direct.py proforma/index.html proforma/direct.html \
      $D/direct_inject.html $D/smart_inject.html $D/extra_inject.html $D/mobile_inject.html

- `build_direct.py` : reprend `proforma/index.html` (feuille + logique) et remplace le formulaire.
- `direct_inject.html` : feuille éditable, client Sage, accès Sage (relais local OU compte Arrivages 1×/appareil).
- `smart_inject.html` : produits (articles G Sage), désignation et code douanier automatiques, déjà acheté.
- `extra_inject.html` : refaire le dernier devis, conteneurs + fret estimé, partage.
- `mobile_inject.html` : iPhone (barre du bas, champs 16 px).
- `sage_proxy.py` : relais LOCAL de test (Mac / Wi-Fi, port 8102) — lit la clé service dans ~/.supabase_prodi.env, jamais en ligne.
