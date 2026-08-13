-- Schéma de base de données pour la tournée des calendriers.
-- À exécuter dans Supabase : Dashboard > SQL Editor > New query > coller > Run.
--
-- Ce script repart de zéro (DROP puis CREATE). Comme pour les versions
-- précédentes, ne le relancez que si vous êtes d'accord pour perdre les
-- données déjà saisies sur ce projet Supabase.
--
-- Notes de conception :
-- - Hiérarchie à trois niveaux, en tables séparées (pas des champs texte
--   libres) : une tournée contient des communes, une commune contient des
--   rues, une rue contient des adresses. Ça permet de gérer/renommer
--   chaque niveau indépendamment et d'afficher une rue à la fois dans
--   l'app plutôt qu'une grande liste plate.
-- - Chaque adresse a 3 emplacements de passage fixes (passage_1/2/3).
-- - agents.est_admin distingue le compte de l'amicale des comptes de
--   tournée. Un amicaliste (pompier) n'a PAS de compte propre : c'est une
--   fiche nom/prénom affectée à une tournée via tournee_agents. Le
--   compte de connexion est partagé par tournée (tournees.user_id) —
--   quiconque se connecte avec les identifiants de la tournée n°X choisit
--   ensuite son nom dans le roster ("qui es-tu ?", géré côté app).
-- - RLS en cascade : mes_tournee_ids() -> mes_rue_ids() -> adresses/dons.

drop table if exists dons cascade;
drop table if exists adresses cascade;
drop table if exists rues cascade;
drop table if exists communes cascade;
drop table if exists tournee_agents cascade;
drop table if exists tournees cascade;
drop table if exists agents cascade;
drop function if exists mes_agent_ids();
drop function if exists mes_tournee_ids();
drop function if exists mes_rue_ids();
drop function if exists est_admin();

create extension if not exists pgcrypto;

-- Sapeurs-pompiers (et le compte administrateur de l'amicale).
-- Un amicaliste n'a pas de compte de connexion propre (voir tournees.user_id
-- ci-dessous) : c'est juste une fiche nom/prénom, affectée à une ou
-- plusieurs tournées via tournee_agents. Exception : le compte de
-- l'amicale (est_admin), qui garde son propre user_id.
create table agents (
  id uuid primary key default gen_random_uuid(),
  nom text not null,
  prenom text not null,
  binome_id uuid references agents (id),
  user_id uuid unique references auth.users (id) on delete set null,
  est_admin boolean not null default false,
  actif boolean not null default true,
  created_at timestamptz not null default now()
);

-- Une tournée numérotée, confiée à un ou plusieurs agents. Son user_id est
-- le compte de connexion PARTAGÉ par tous les amicalistes qui y sont
-- affectés (un seul identifiant par tournée, pas un par personne).
-- nom_commune et nom_rue ne servent qu'à l'étiquette dans l'écran admin,
-- et ne sont pas renseignés à la création : c'est l'agent qui les crée
-- lui-même la première fois via son écran normal (le vrai contenu vit
-- dans les tables communes/rues/adresses ci-dessous).
create table tournees (
  id uuid primary key default gen_random_uuid(),
  numero integer not null unique check (numero > 0),
  nom_commune text,
  nom_rue text,
  user_id uuid unique references auth.users (id) on delete set null,
  created_at timestamptz not null default now()
);

-- Affectation des agents à une tournée (généralement 2, parfois plus).
create table tournee_agents (
  tournee_id uuid not null references tournees (id) on delete cascade,
  agent_id uuid not null references agents (id) on delete cascade,
  primary key (tournee_id, agent_id)
);

-- Une commune travaillée dans le cadre d'une tournée.
create table communes (
  id uuid primary key default gen_random_uuid(),
  tournee_id uuid not null references tournees (id) on delete cascade,
  nom text not null,
  created_at timestamptz not null default now(),
  ordre integer not null default 0
);

create index communes_tournee_id_idx on communes (tournee_id);

-- Une rue à l'intérieur d'une commune.
create table rues (
  id uuid primary key default gen_random_uuid(),
  commune_id uuid not null references communes (id) on delete cascade,
  nom text not null,
  created_at timestamptz not null default now(),
  ordre integer not null default 0
);

create index rues_commune_id_idx on rues (commune_id);

-- Chaque porte à visiter dans une rue.
create table adresses (
  id uuid primary key default gen_random_uuid(),
  rue_id uuid not null references rues (id) on delete cascade,
  numero text not null,
  nom_famille text,
  latitude double precision,
  longitude double precision,
  passage_1 text not null default 'a_faire' check (passage_1 in ('a_faire', 'passe', 'absent')),
  passage_2 text not null default 'a_faire' check (passage_2 in ('a_faire', 'passe', 'absent')),
  passage_3 text not null default 'a_faire' check (passage_3 in ('a_faire', 'passe', 'absent')),
  notes text,
  maj_le timestamptz,
  created_at timestamptz not null default now(),
  ordre integer not null default 0
);

create index adresses_rue_id_idx on adresses (rue_id);

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
alter table communes enable row level security;
alter table rues enable row level security;
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

-- Tournées dont le compte de connexion partagé est l'utilisateur connecté
-- (voir tournees.user_id : un identifiant par tournée, pas par agent).
create or replace function mes_tournee_ids()
returns setof uuid
language sql
stable
security definer
set search_path = public
as $$
  select id from tournees where user_id = auth.uid()
$$;

-- Rues accessibles à l'utilisateur connecté (via ses tournées).
create or replace function mes_rue_ids()
returns setof uuid
language sql
stable
security definer
set search_path = public
as $$
  select r.id
  from rues r
  join communes c on c.id = r.commune_id
  where c.tournee_id in (select mes_tournee_ids())
$$;

-- agents : chacun voit sa propre fiche (le compte admin) ; les comptes de
-- tournée voient tout le monde (nécessaire pour l'écran "qui es-tu ?" et
-- pour composer le roster affiché) ; l'admin voit tout le monde. Gestion
-- (créer/désactiver) réservée à l'admin.
create policy "lecture_agents" on agents
  for select using (user_id = auth.uid() or id in (select agent_id from tournee_agents where tournee_id in (select mes_tournee_ids())) or est_admin());
create policy "ecriture_agents" on agents
  for insert with check (est_admin());
create policy "maj_agents" on agents
  for update using (est_admin());

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

-- communes : un agent peut créer/voir/renommer les communes de ses
-- propres tournées (pas besoin d'être admin pour ça, contrairement aux
-- tournées elles-mêmes).
create policy "acces_communes" on communes
  for select using (est_admin() or tournee_id in (select mes_tournee_ids()));
create policy "ecriture_communes" on communes
  for insert with check (est_admin() or tournee_id in (select mes_tournee_ids()));
create policy "maj_communes" on communes
  for update using (est_admin() or tournee_id in (select mes_tournee_ids()));

-- rues : idem, à l'échelle d'une commune accessible.
create policy "acces_rues" on rues
  for select using (
    est_admin() or commune_id in (select id from communes where tournee_id in (select mes_tournee_ids()))
  );
create policy "ecriture_rues" on rues
  for insert with check (
    est_admin() or commune_id in (select id from communes where tournee_id in (select mes_tournee_ids()))
  );
create policy "maj_rues" on rues
  for update using (
    est_admin() or commune_id in (select id from communes where tournee_id in (select mes_tournee_ids()))
  );

-- adresses : accès aux adresses des rues accessibles, ou admin.
create policy "acces_adresses" on adresses
  for select using (est_admin() or rue_id in (select mes_rue_ids()));
create policy "maj_adresses" on adresses
  for update using (est_admin() or rue_id in (select mes_rue_ids()));
create policy "ecriture_adresses" on adresses
  for insert with check (est_admin() or rue_id in (select mes_rue_ids()));

-- dons : accès aux dons des adresses accessibles, ou admin. Saisie
-- possible pour n'importe quel amicaliste du roster de la tournée
-- connectée (pas de compte individuel, voir mes_tournee_ids()), ou admin.
create policy "acces_dons" on dons
  for select using (
    est_admin() or adresse_id in (select id from adresses where rue_id in (select mes_rue_ids()))
  );
create policy "ajout_dons" on dons
  for insert with check (
    est_admin()
    or (
      agent_id in (select ta.agent_id from tournee_agents ta where ta.tournee_id in (select mes_tournee_ids()))
      and adresse_id in (select id from adresses where rue_id in (select mes_rue_ids()))
    )
  );

-- Storage : cartes PDF des tournées (bucket "cartes-tournees", à créer à
-- la main dans le Dashboard Supabase — Storage > New bucket, "Public
-- bucket" DÉCOCHÉ). Un seul objet par tournée, nommé "<tournee_id>.pdf".
create policy "lecture_cartes" on storage.objects
  for select using (
    bucket_id = 'cartes-tournees'
    and (est_admin() or split_part(name, '.', 1)::uuid in (select mes_tournee_ids()))
  );
create policy "ecriture_cartes" on storage.objects
  for insert with check (bucket_id = 'cartes-tournees' and est_admin());
create policy "maj_cartes" on storage.objects
  for update using (bucket_id = 'cartes-tournees' and est_admin());
create policy "suppr_cartes" on storage.objects
  for delete using (bucket_id = 'cartes-tournees' and est_admin());
