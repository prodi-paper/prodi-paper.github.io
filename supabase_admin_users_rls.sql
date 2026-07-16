-- ============================================================================
-- PRODICONSEIL — DURCISSEMENT admin_users (à exécuter dans le SQL Editor)
-- ============================================================================
-- Généré le 2026-07-05 suite à l'audit sécurité de prodi_arrivages.
--
-- Constat : la table admin_users (email + password_hash + role) a RLS DÉSACTIVÉ
-- et 0 policy. Test live : anon ❌, authenticated ❌, service_role ✅ — donc
-- aujourd'hui seule la clé service_role peut la lire (ex. le brief IA de l'app
-- arrivages, qui tourne en service_role). Aucun code (site, crm, arrivages) ne
-- lit cette table via anon/authenticated → activer RLS est SANS régression.
--
-- Objectif : defense-in-depth. RLS OFF est un risque latent (si un GRANT large
-- est ajouté un jour, ou via une fonction SECURITY DEFINER). RLS ON sans policy
-- = deny-all pour anon/authenticated (déjà le cas via l'absence de GRANT), et
-- service_role continue de bypasser (donc une éventuelle auth admin en
-- service_role reste fonctionnelle).
--
-- ⚠️ Si un jour un panneau admin authentifie contre cette table SANS service_role,
--    NE PAS activer sans lui ajouter d'abord une policy adaptée.
-- ============================================================================

alter table public.admin_users enable row level security;

-- Aucune policy = deny-all pour anon/authenticated (lecture des hashs impossible
-- même si un GRANT SELECT était ajouté par erreur). service_role bypasse RLS.

-- Vérification :
select relname, relrowsecurity as rls_on,
       (select count(*) from pg_policy p where p.polrelid = c.oid) as policies
from pg_class c
where c.relname = 'admin_users';
-- Attendu : rls_on = true, policies = 0
