-- Ajoute la table "laisses_boite" : quand les 3 passages d'une adresse sont
-- des absences, l'agent peut enregistrer ce qu'il a laissé dans la boîte
-- aux lettres (calendrier, avis de passage, enveloppe T).
-- À exécuter dans Supabase : Dashboard > SQL Editor > New query > coller > Run.
-- Non destructif : n'affecte aucune donnée existante.

create table if not exists laisses_boite (
  id uuid primary key default gen_random_uuid(),
  adresse_id uuid not null references adresses (id) on delete cascade,
  agent_id uuid references agents (id),
  calendrier boolean not null default true,
  avis_passage boolean not null default true,
  enveloppe_t boolean not null default true,
  date timestamptz not null default now(),
  created_at timestamptz not null default now()
);

create index if not exists laisses_boite_adresse_id_idx on laisses_boite (adresse_id);

alter table laisses_boite enable row level security;

-- Même scoping que dons (adresse_id -> rue_id -> mes_rue_ids()).
create policy "acces_laisses_boite" on laisses_boite
  for select using (
    est_admin() or adresse_id in (select id from adresses where rue_id in (select mes_rue_ids()))
  );
create policy "ecriture_laisses_boite" on laisses_boite
  for insert with check (
    est_admin() or adresse_id in (select id from adresses where rue_id in (select mes_rue_ids()))
  );
