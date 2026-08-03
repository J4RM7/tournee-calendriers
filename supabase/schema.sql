-- Schéma de base de données pour la tournée des calendriers.
-- À exécuter dans Supabase : Dashboard > SQL Editor > New query > coller > Run.
-- Ce script est écrit pour être ré-exécutable sans erreur (IF NOT EXISTS,
-- DROP POLICY IF EXISTS...) si vous l'aviez déjà lancé une première fois.
--
-- Notes de conception :
-- - Chaque table a un "id uuid" généré automatiquement (gen_random_uuid) et
--   un "created_at" pour savoir quand la ligne a été créée (pratique standard,
--   pas demandé explicitement mais quasi gratuit et utile pour déboguer).
-- - Les valeurs de statut/mode de paiement sont stockées en minuscules sans
--   accent ni espace ("a_faire", "especes"...) et contraintes par CHECK :
--   plus sûr qu'un texte libre accentué, l'accent/l'espace ne posent aucun
--   problème pour l'affichage (fait dans le JS), seulement pour le stockage.
-- - agents.user_id relie un agent à son compte de connexion Supabase Auth
--   (email + lien magique, voir js/auth.js). Un agent sans user_id n'a
--   simplement pas encore de compte associé.
-- - RLS (Row Level Security) est scopée par agent : un agent ne voit et ne
--   modifie que les secteurs/adresses/dons qui le concernent (lui ou son
--   binôme), via la fonction mes_agent_ids(). La table "agents" elle-même
--   n'est modifiable que depuis le dashboard Supabase (pas de politique
--   insert/update/delete côté client) : le roster des ~100 agents est géré
--   à la main pour ce MVP.

create extension if not exists pgcrypto;

-- Sapeurs-pompiers qui participent à la tournée.
create table if not exists agents (
  id uuid primary key default gen_random_uuid(),
  nom text not null,
  prenom text not null,
  binome_id uuid references agents (id),
  user_id uuid unique references auth.users (id) on delete set null,
  created_at timestamptz not null default now()
);

alter table agents add column if not exists user_id uuid unique references auth.users (id) on delete set null;

-- Un secteur = une zone géographique confiée à un agent (ou binôme).
create table if not exists secteurs (
  id uuid primary key default gen_random_uuid(),
  nom_commune text not null,
  nom_rue text not null,
  agent_id uuid references agents (id),
  created_at timestamptz not null default now()
);

-- Chaque porte à visiter dans un secteur.
create table if not exists adresses (
  id uuid primary key default gen_random_uuid(),
  secteur_id uuid not null references secteurs (id) on delete cascade,
  numero text not null,
  rue text not null,
  commune text not null,
  latitude double precision,
  longitude double precision,
  statut text not null default 'a_faire'
    check (statut in ('a_faire', 'fait', 'absent_repasse')),
  notes text,
  created_at timestamptz not null default now()
);

create index if not exists adresses_secteur_id_idx on adresses (secteur_id);

-- Un don recueilli à une adresse.
create table if not exists dons (
  id uuid primary key default gen_random_uuid(),
  adresse_id uuid not null references adresses (id) on delete cascade,
  agent_id uuid references agents (id),
  montant numeric(10, 2) not null check (montant >= 0),
  mode_paiement text not null check (mode_paiement in ('especes', 'cheque')),
  nom_donateur text,
  email_donateur text,
  date timestamptz not null default now(),
  recu_envoye boolean not null default false,
  created_at timestamptz not null default now()
);

create index if not exists dons_adresse_id_idx on dons (adresse_id);

-- Row Level Security -------------------------------------------------------

alter table agents enable row level security;
alter table secteurs enable row level security;
alter table adresses enable row level security;
alter table dons enable row level security;

-- Renvoie les id d'agent auxquels l'utilisateur connecté a droit d'accès :
-- son propre agent, et celui de son binôme (dans les deux sens).
create or replace function mes_agent_ids()
returns setof uuid
language sql
stable
security definer
set search_path = public
as $$
  select id from agents where user_id = auth.uid()
  union
  select binome_id from agents where user_id = auth.uid() and binome_id is not null
  union
  select id from agents where binome_id in (select id from agents where user_id = auth.uid())
$$;

drop policy if exists "authentifie_tout_agents" on agents;
drop policy if exists "select_soi_meme_agents" on agents;
create policy "select_soi_meme_agents" on agents
  for select using (id in (select mes_agent_ids()));

drop policy if exists "authentifie_tout_secteurs" on secteurs;
drop policy if exists "select_mes_secteurs" on secteurs;
create policy "select_mes_secteurs" on secteurs
  for select using (agent_id in (select mes_agent_ids()));

drop policy if exists "authentifie_tout_adresses" on adresses;
drop policy if exists "acces_mes_adresses" on adresses;
create policy "acces_mes_adresses" on adresses
  for select using (
    secteur_id in (select id from secteurs where agent_id in (select mes_agent_ids()))
  );
drop policy if exists "maj_mes_adresses" on adresses;
create policy "maj_mes_adresses" on adresses
  for update using (
    secteur_id in (select id from secteurs where agent_id in (select mes_agent_ids()))
  );

drop policy if exists "authentifie_tout_dons" on dons;
drop policy if exists "acces_mes_dons" on dons;
create policy "acces_mes_dons" on dons
  for select using (
    adresse_id in (
      select a.id from adresses a
      join secteurs s on s.id = a.secteur_id
      where s.agent_id in (select mes_agent_ids())
    )
  );
drop policy if exists "ajout_mes_dons" on dons;
create policy "ajout_mes_dons" on dons
  for insert with check (
    agent_id in (select mes_agent_ids())
    and adresse_id in (
      select a.id from adresses a
      join secteurs s on s.id = a.secteur_id
      where s.agent_id in (select mes_agent_ids())
    )
  );
