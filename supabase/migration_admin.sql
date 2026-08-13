-- Migration : connexion partagée par tournée + écran admin (Amicalistes /
-- Tournées / Compta). À lancer dans Supabase : Dashboard > SQL Editor >
-- New query > coller > Run. Contrairement à schema.sql, ce script ne
-- supprime rien : il complète le schéma existant.
--
-- Avant de lancer ceci, créer manuellement dans le Dashboard Supabase un
-- bucket Storage nommé exactement "cartes-tournees" (Storage > New bucket),
-- avec "Public bucket" DÉCOCHÉ (privé — sinon les policies ci-dessous ne
-- protègent rien, un bucket public sert les fichiers sans vérification).

-- Une tournée a désormais son propre compte de connexion partagé (au lieu
-- d'un compte par agent).
alter table tournees add column if not exists user_id uuid unique references auth.users (id) on delete set null;

-- Un amicaliste "retiré" garde sa fiche (pour ne jamais casser
-- dons.agent_id, qui n'a pas de ON DELETE) mais n'a plus de compte ni
-- d'affectation active.
alter table agents add column if not exists actif boolean not null default true;

-- mes_tournee_ids() passe désormais par tournees.user_id directement, au
-- lieu de agents.user_id : les amicalistes n'ont plus de compte propre.
-- Toutes les policies qui dépendent de cette fonction (communes, rues,
-- adresses, tournee_agents, lecture des dons) n'ont rien à changer.
create or replace function mes_tournee_ids()
returns setof uuid
language sql
stable
security definer
set search_path = public
as $$
  select id from tournees where user_id = auth.uid()
$$;

-- ajout_dons : l'ancienne condition ("agent_id appartient au compte
-- connecté") ne marche plus puisque les amicalistes n'ont plus de compte.
-- On vérifie à la place que l'agent_id fait partie du roster de la
-- tournée sur laquelle on est connecté.
drop policy if exists "ajout_dons" on dons;
create policy "ajout_dons" on dons
  for insert with check (
    est_admin()
    or (
      agent_id in (select ta.agent_id from tournee_agents ta where ta.tournee_id in (select mes_tournee_ids()))
      and adresse_id in (select id from adresses where rue_id in (select mes_rue_ids()))
    )
  );

-- agents : gestion (créer/désactiver) réservée à l'admin.
create policy "ecriture_agents" on agents
  for insert with check (est_admin());
create policy "maj_agents" on agents
  for update using (est_admin());

-- lecture_agents doit être élargie : les amicalistes n'ayant plus de
-- compte propre, un compte de connexion "tournée" doit pouvoir lire le
-- roster des agents affectés à SA tournée (nécessaire pour l'écran
-- "qui es-tu ?" et pour la synchronisation initiale).
drop policy if exists "lecture_agents" on agents;
create policy "lecture_agents" on agents
  for select using (
    user_id = auth.uid()
    or id in (select agent_id from tournee_agents where tournee_id in (select mes_tournee_ids()))
    or est_admin()
  );

-- Storage : cartes PDF des tournées. Un seul objet par tournée, nommé
-- "<tournee_id>.pdf". Lecture réservée à l'admin ou aux comptes connectés
-- sur la tournée concernée ; écriture réservée à l'admin.
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
