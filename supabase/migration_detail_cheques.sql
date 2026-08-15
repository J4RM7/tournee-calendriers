-- Ajoute le détail des chèques (un montant + une quantité par ligne, comme
-- detail_especes) pour que le reçu de dépôt puisse lister les chèques
-- individuellement plutôt qu'un simple total.
-- À exécuter dans Supabase : Dashboard > SQL Editor > New query > coller > Run.
-- Non destructif : n'affecte aucune donnée existante.

alter table depots add column if not exists detail_cheques jsonb;
