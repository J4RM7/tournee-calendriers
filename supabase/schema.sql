-- Schéma de base de données pour la tournée des calendriers.
-- À exécuter dans Supabase : Dashboard > SQL Editor > New query > coller > Run.
--
-- Notes de conception :
-- - Chaque table a un "id uuid" généré automatiquement (gen_random_uuid) et
--   un "created_at" pour savoir quand la ligne a été créée (pratique standard,
--   pas demandé explicitement mais quasi gratuit et utile pour déboguer).
-- - Les valeurs de statut/mode de paiement sont stockées en minuscules sans
--   accent ni espace ("a_faire", "especes"...) et contraintes par CHECK :
--   plus sûr qu'un texte libre accentué, l'accent/l'espace ne posent aucun
--   problème pour l'affichage (fait dans le JS), seulement pour le stockage.
-- - RLS (Row Level Security) est activée avec une politique simple qui
--   autorise tout utilisateur authentifié à tout faire. C'est volontairement
--   permissif pour ce MVP ; à durcir dans une prochaine étape (ex: un agent
--   ne devrait modifier que les adresses de son propre secteur).

create extension if not exists pgcrypto;

-- Sapeurs-pompiers qui participent à la tournée.
create table if not exists agents (
  id uuid primary key default gen_random_uuid(),
  nom text not null,
  prenom text not null,
  binome_id uuid references agents (id),
  created_at timestamptz not null default now()
);

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

create policy "authentifie_tout_agents" on agents
  for all using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');

create policy "authentifie_tout_secteurs" on secteurs
  for all using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');

create policy "authentifie_tout_adresses" on adresses
  for all using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');

create policy "authentifie_tout_dons" on dons
  for all using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');
