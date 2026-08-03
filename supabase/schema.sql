-- Schéma de base de données pour la tournée des calendriers.
-- À exécuter dans Supabase : Dashboard > SQL Editor > New query > coller > Run.
--
-- Ce script repart de zéro (DROP puis CREATE). C'est volontaire et sans
-- danger ici : au moment où cette version a été écrite, vos tables étaient
-- vides (vérifié). Si vous avez depuis saisi de vraies données de tournée,
-- ne lancez pas ce script tel quel — dites-le et on écrira une migration
-- qui préserve les données à la place d'un reset complet.
--
-- Notes de conception :
-- - "tournée" est le concept central : un numéro (~1 à 50), une rue, et
--   les pompiers qui l'effectuent (généralement un binôme, parfois plus
--   pour dépanner) via la table de liaison tournee_agents.
-- - Chaque adresse a 3 emplacements de passage fixes (passage_1/2/3), plus
--   simple qu'une table séparée puisque le nombre de passages est plafonné
--   et connu à l'avance.
-- - agents.est_admin distingue le compte de l'amicale (qui crée les
--   tournées et affecte les pompiers) des comptes pompiers normaux.
-- - RLS : un agent ne voit que les tournées auxquelles il est affecté
--   (via mes_tournee_ids()) ; un admin voit et gère tout (via est_admin()).

drop table if exists dons cascade;
drop table if exists adresses cascade;
drop table if exists tournee_agents cascade;
drop table if exists tournees cascade;
drop table if exists agents cascade;
drop function if exists mes_agent_ids();
drop function if exists mes_tournee_ids();
drop function if exists est_admin();

create extension if not exists pgcrypto;

-- Sapeurs-pompiers (et le compte administrateur de l'amicale).
create table agents (
  id uuid primary key default gen_random_uuid(),
  nom text not null,
  prenom text not null,
  binome_id uuid references agents (id),
  user_id uuid unique references auth.users (id) on delete set null,
  est_admin boolean not null default false,
  created_at timestamptz not null default now()
);

-- Une tournée numérotée = une rue à parcourir, confiée à un ou plusieurs agents.
create table tournees (
  id uuid primary key default gen_random_uuid(),
  numero integer not null unique check (numero > 0),
  nom_commune text not null,
  nom_rue text not null,
  created_at timestamptz not null default now()
);

-- Affectation des agents à une tournée (généralement 2, parfois plus).
create table tournee_agents (
  tournee_id uuid not null references tournees (id) on delete cascade,
  agent_id uuid not null references agents (id) on delete cascade,
  primary key (tournee_id, agent_id)
);

-- Chaque porte à visiter dans une tournée.
create table adresses (
  id uuid primary key default gen_random_uuid(),
  tournee_id uuid not null references tournees (id) on delete cascade,
  numero text not null,
  rue text not null,
  commune text not null,
  nom_famille text,
  latitude double precision,
  longitude double precision,
  passage_1 text not null default 'a_faire' check (passage_1 in ('a_faire', 'passe', 'absent')),
  passage_2 text not null default 'a_faire' check (passage_2 in ('a_faire', 'passe', 'absent')),
  passage_3 text not null default 'a_faire' check (passage_3 in ('a_faire', 'passe', 'absent')),
  notes text,
  created_at timestamptz not null default now()
);

create index adresses_tournee_id_idx on adresses (tournee_id);

-- Un don recueilli à une adresse (ou un refus explicite).
create table dons (
  id uuid primary key default gen_random_uuid(),
  adresse_id uuid not null references adresses (id) on delete cascade,
  agent_id uuid references agents (id),
  refuse boolean not null default false,
  montant numeric(10, 2) not null default 0 check (montant >= 0),
  mode_paiement text check (mode_paiement is null or mode_paiement in ('especes', 'cheque')),
  nom_donateur text,
  email_donateur text,
  date timestamptz not null default now(),
  recu_envoye boolean not null default false,
  created_at timestamptz not null default now()
);

create index dons_adresse_id_idx on dons (adresse_id);

-- Row Level Security -------------------------------------------------------

alter table agents enable row level security;
alter table tournees enable row level security;
alter table tournee_agents enable row level security;
alter table adresses enable row level security;
alter table dons enable row level security;

-- Vrai si l'utilisateur connecté est le compte de l'amicale (admin).
create or replace function est_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce((select est_admin from agents where user_id = auth.uid()), false)
$$;

-- Tournées auxquelles l'utilisateur connecté est affecté.
create or replace function mes_tournee_ids()
returns setof uuid
language sql
stable
security definer
set search_path = public
as $$
  select ta.tournee_id
  from tournee_agents ta
  join agents a on a.id = ta.agent_id
  where a.user_id = auth.uid()
$$;

-- agents : chacun voit sa propre fiche ; l'admin voit tout le monde
-- (nécessaire pour affecter les agents aux tournées).
create policy "lecture_agents" on agents
  for select using (user_id = auth.uid() or est_admin());

-- tournees : visibles si affecté dessus, ou admin. Gestion réservée à l'admin.
create policy "lecture_tournees" on tournees
  for select using (est_admin() or id in (select mes_tournee_ids()));
create policy "ecriture_tournees" on tournees
  for insert with check (est_admin());
create policy "maj_tournees" on tournees
  for update using (est_admin());
create policy "suppr_tournees" on tournees
  for delete using (est_admin());

-- tournee_agents : voir les coéquipiers de ses propres tournées, ou admin.
-- Affectation réservée à l'admin.
create policy "lecture_tournee_agents" on tournee_agents
  for select using (est_admin() or tournee_id in (select mes_tournee_ids()));
create policy "ecriture_tournee_agents" on tournee_agents
  for insert with check (est_admin());
create policy "suppr_tournee_agents" on tournee_agents
  for delete using (est_admin());

-- adresses : accès aux adresses de ses tournées, ou admin. Un agent peut
-- aussi créer une adresse (nouvelle rue, maison oubliée) sur ses propres
-- tournées, pas seulement l'admin.
create policy "acces_adresses" on adresses
  for select using (est_admin() or tournee_id in (select mes_tournee_ids()));
create policy "maj_adresses" on adresses
  for update using (est_admin() or tournee_id in (select mes_tournee_ids()));
create policy "ecriture_adresses" on adresses
  for insert with check (est_admin() or tournee_id in (select mes_tournee_ids()));

-- dons : accès aux dons de ses tournées, ou admin. Saisie par l'agent
-- affecté à la tournée concernée (ou l'admin).
create policy "acces_dons" on dons
  for select using (
    est_admin() or adresse_id in (select id from adresses where tournee_id in (select mes_tournee_ids()))
  );
create policy "ajout_dons" on dons
  for insert with check (
    est_admin()
    or (
      agent_id in (select id from agents where user_id = auth.uid())
      and adresse_id in (select id from adresses where tournee_id in (select mes_tournee_ids()))
    )
  );
