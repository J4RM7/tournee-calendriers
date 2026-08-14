-- Migration : dépôts (comptage physique espèces/chèques + suivi des
-- remises en banque/coffre). À lancer dans Supabase : Dashboard > SQL
-- Editor > New query > coller > Run. Comme migration_admin.sql, ce script
-- ne supprime rien : il complète le schéma existant.

create table if not exists depots (
  id uuid primary key default gen_random_uuid(),
  tournee_id uuid not null references tournees (id) on delete cascade,
  agent_id uuid references agents (id),
  montant_especes numeric(10, 2) not null default 0 check (montant_especes >= 0),
  montant_cheques numeric(10, 2) not null default 0 check (montant_cheques >= 0),
  nb_cheques integer not null default 0 check (nb_cheques >= 0),
  detail_especes jsonb,
  date timestamptz not null default now(),
  created_at timestamptz not null default now()
);

create index if not exists depots_tournee_id_idx on depots (tournee_id);

alter table depots enable row level security;

-- tournee_id est une FK directe (pas besoin de passer par mes_rue_ids()
-- comme pour adresses/dons). Append-only : pas de policy update/delete,
-- un dépôt ne se corrige pas, c'est un ticket de caisse.
create policy "acces_depots" on depots
  for select using (est_admin() or tournee_id in (select mes_tournee_ids()));
create policy "ecriture_depots" on depots
  for insert with check (est_admin() or tournee_id in (select mes_tournee_ids()));
