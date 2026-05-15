-- ============================================================================
-- PRODICONSEIL — DURCISSEMENT SÉCURITÉ SUPABASE (à exécuter dans le SQL Editor)
-- ============================================================================
-- Fichier généré le 2026-05-01.
-- À exécuter APRÈS audit (cf. supabase_security_audit.sql) pour ne pas casser
-- les flux existants.
--
-- Couvre :
--   Faille #2 — RLS sur products / proforma_requests / shared_carts
--   Faille #7 — Limites de longueur sur insert proforma_requests / shared_carts
--   Faille #8 — Expiration + purge auto des shared_carts
--
-- ⚠️  À RELIRE AVANT EXÉCUTION. Ne pas exécuter en bloc sans valider chaque section.
-- ============================================================================

-- ─── 0. Activer RLS sur les 3 tables ────────────────────────────────────────
-- (idempotent — safe à relancer)
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE proforma_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE shared_carts ENABLE ROW LEVEL SECURITY;

-- ─── 1. products — lecture publique uniquement ──────────────────────────────
-- L'admin.html écrira uniquement après auth (Faille #2 Option A) ou bien
-- on retire admin du déploiement (Option B).
DROP POLICY IF EXISTS "products_anon_all"      ON products;
DROP POLICY IF EXISTS "products_anon_select"   ON products;
DROP POLICY IF EXISTS "products_anon_insert"   ON products;
DROP POLICY IF EXISTS "products_anon_update"   ON products;
DROP POLICY IF EXISTS "products_anon_delete"   ON products;
DROP POLICY IF EXISTS "products_auth_write"    ON products;

CREATE POLICY "products_anon_select" ON products
  FOR SELECT TO anon USING (true);

-- Si Option A (auth Supabase) — autoriser INSERT/UPDATE/DELETE aux users authentifiés
CREATE POLICY "products_auth_write" ON products
  FOR ALL TO authenticated
  USING (true) WITH CHECK (true);

-- ─── 2. proforma_requests — INSERT public seulement, avec limites ───────────
DROP POLICY IF EXISTS "proforma_requests_anon_all"    ON proforma_requests;
DROP POLICY IF EXISTS "proforma_requests_anon_insert" ON proforma_requests;
DROP POLICY IF EXISTS "proforma_requests_anon_select" ON proforma_requests;
DROP POLICY IF EXISTS "proforma_requests_auth_read"   ON proforma_requests;

CREATE POLICY "proforma_requests_anon_insert" ON proforma_requests
  FOR INSERT TO anon
  WITH CHECK (
    length(coalesce(nom,''))                  <= 100
    AND length(coalesce(message,''))          <= 2000
    AND length(coalesce(telephone,''))        <= 30
    AND length(coalesce(email,''))            <= 200
    AND length(coalesce(societe,''))          <= 200
    AND length(coalesce(statut,''))           <= 50
    AND length(coalesce(quantite_souhaitee,'')) <= 200
  );

-- Lecture interdite côté anon ; côté authenticated (équipe commerciale) — full read
CREATE POLICY "proforma_requests_auth_read" ON proforma_requests
  FOR SELECT TO authenticated USING (true);

-- ─── 3. shared_carts — lecture publique + INSERT borné ──────────────────────
DROP POLICY IF EXISTS "shared_carts_anon_all"     ON shared_carts;
DROP POLICY IF EXISTS "shared_carts_anon_select"  ON shared_carts;
DROP POLICY IF EXISTS "shared_carts_anon_insert"  ON shared_carts;

CREATE POLICY "shared_carts_anon_select" ON shared_carts
  FOR SELECT TO anon USING (true);

CREATE POLICY "shared_carts_anon_insert" ON shared_carts
  FOR INSERT TO anon
  WITH CHECK (
    length(code)            BETWEEN 4 AND 16
    AND length(cart_ids)    <= 5000
    -- cart_ids is a comma-separated list of product `ref` values (e.g.
    -- "Photo_919465"). Refs are stable across the daily DELETE+INSERT import,
    -- unlike synthetic `id`. Regex also tolerates legacy numeric IDs.
    AND cart_ids ~ '^[A-Za-z0-9_]+(,[A-Za-z0-9_]+)*$'
  );

-- ─── 4. shared_carts — expiration & purge (Faille #8) ───────────────────────
ALTER TABLE shared_carts
  ADD COLUMN IF NOT EXISTS expires_at timestamptz DEFAULT (now() + interval '90 days');

CREATE INDEX IF NOT EXISTS shared_carts_expires_idx
  ON shared_carts (expires_at);

-- Activer pg_cron : Database → Extensions → pg_cron → Enable (one-click).
-- Puis programmer la purge :
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_cron') THEN
    -- Supprime tâche existante si déjà programmée (idempotent)
    IF EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'purge-shared-carts') THEN
      PERFORM cron.unschedule('purge-shared-carts');
    END IF;
    PERFORM cron.schedule(
      'purge-shared-carts',
      '0 3 * * *',
      $cron$ DELETE FROM shared_carts WHERE expires_at < now() $cron$
    );
  ELSE
    RAISE NOTICE 'pg_cron not enabled. Activate it in Database → Extensions, then re-run this block.';
  END IF;
END $$;

-- ─── 5. Vérification finale ─────────────────────────────────────────────────
SELECT schemaname, tablename, policyname, roles, cmd, qual, with_check
FROM pg_policies
WHERE tablename IN ('products', 'proforma_requests', 'shared_carts')
ORDER BY tablename, cmd;

-- Policies attendues :
--   products              | anon          | SELECT
--   products              | authenticated | ALL
--   proforma_requests     | anon          | INSERT (avec WITH CHECK longueurs)
--   proforma_requests     | authenticated | SELECT
--   shared_carts          | anon          | SELECT
--   shared_carts          | anon          | INSERT (avec WITH CHECK longueurs)
