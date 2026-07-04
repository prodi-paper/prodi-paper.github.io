-- Analytics maison du site (vitrine + catalogue) — créée le 2026-07-05.
-- Alimentée par analytics.js (clé anon, INSERT borné par RLS). Lecture :
-- authenticated uniquement (l'assistant IA de l'app arrivages via query_sql).
-- Équipe marquée interne=true (visite unique de /?team par appareil).
create table if not exists public.site_events (
  id bigint generated always as identity primary key,
  created_at timestamptz not null default now(),
  visitor_id text not null,   -- id aléatoire persistant (visiteurs uniques)
  session_id text not null,   -- id par onglet/session
  page text not null,         -- 'vitrine' | 'catalogue'
  event text not null,        -- pageview | recherche | fiche_vue | panier_ajout |
                              -- panier_partage | devis_envoye | contact_envoye |
                              -- cta_catalogue | duree
  props jsonb,
  referrer text,              -- hostname externe uniquement
  utm text,                   -- source/medium/campaign
  lang text,
  mobile boolean,
  interne boolean not null default false
);
create index if not exists idx_site_events_date on public.site_events (created_at desc);
create index if not exists idx_site_events_event on public.site_events (event, created_at desc);
alter table public.site_events enable row level security;
create policy se_insert on public.site_events for insert to anon
  with check (
    char_length(visitor_id) <= 40 and char_length(session_id) <= 40
    and char_length(page) <= 30 and char_length(event) <= 40
    and (referrer is null or char_length(referrer) <= 200)
    and (utm is null or char_length(utm) <= 200)
    and (lang is null or char_length(lang) <= 20)
    and (props is null or pg_column_size(props) <= 2000)
  );
create policy se_read on public.site_events for select to authenticated using (true);
grant insert on public.site_events to anon;
grant select on public.site_events to authenticated;
