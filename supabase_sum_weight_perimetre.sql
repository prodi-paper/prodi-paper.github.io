CREATE OR REPLACE FUNCTION public.sum_weight_filtered(q text DEFAULT NULL::text, quality_in text[] DEFAULT NULL::text[], gsm_min numeric DEFAULT NULL::numeric, gsm_max numeric DEFAULT NULL::numeric, width_min numeric DEFAULT NULL::numeric, width_max numeric DEFAULT NULL::numeric, noyau_in text[] DEFAULT NULL::text[], format_in text[] DEFAULT NULL::text[], color_in text[] DEFAULT NULL::text[], origine_prefix text DEFAULT NULL::text, price_min numeric DEFAULT NULL::numeric, price_max numeric DEFAULT NULL::numeric)
 RETURNS numeric
 LANGUAGE plpgsql
AS $function$
DECLARE total numeric;
BEGIN
  SELECT COALESCE(SUM(weight),0) INTO total FROM products p
  WHERE
    -- Périmètre catalogue 15/07 : notre dépôt uniquement, sans DU/FAB,
    -- sans le complément inventaire (aligné sur le verrou sbQ du site).
    p.source IS DISTINCT FROM 'inventaire'
    AND p.emplacement = 'OUR WAREHOUSE'
    AND (p.ref IS NULL OR (p.ref NOT ILIKE 'Photo_DU%' AND p.ref NOT ILIKE 'Photo_FAB%'))
    AND (q IS NULL OR (SELECT bool_and(
      COALESCE(p.quality,'') ILIKE '%'||word||'%' OR
      COALESCE(p.color,'') ILIKE '%'||word||'%' OR
      COALESCE(p.details,'') ILIKE '%'||word||'%' OR
      COALESCE(p.ref,'') ILIKE '%'||word||'%')
      FROM unnest(string_to_array(q,' ')) AS word WHERE word<>''))
    AND (quality_in IS NULL OR p.quality = ANY(quality_in))
    AND (gsm_min IS NULL OR p.gsm >= gsm_min)
    AND (gsm_max IS NULL OR p.gsm <= gsm_max)
    AND (width_min IS NULL OR p.width >= width_min)
    AND (width_max IS NULL OR p.width <= width_max)
    AND (noyau_in IS NULL OR p.noyau::text = ANY(noyau_in))
    AND (format_in IS NULL OR p.format = ANY(format_in))
    AND (color_in IS NULL OR EXISTS (SELECT 1 FROM unnest(color_in) AS c WHERE p.color ILIKE '%'||c||'%'))
    AND (origine_prefix IS NULL OR p.quality ILIKE origine_prefix||'%')
    AND (price_min IS NULL OR p.price >= price_min)
    AND (price_max IS NULL OR p.price <= price_max);
  RETURN total;
END;
$function$;
