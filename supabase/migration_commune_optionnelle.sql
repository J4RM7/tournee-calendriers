-- À lancer après migration_admin.sql. L'admin ne saisit plus la commune
-- et la rue à la création d'une tournée : c'est l'agent qui les crée
-- lui-même la première fois, via son écran normal (+ Ajouter une
-- commune / + Ajouter une rue). Ces deux colonnes ne sont donc plus
-- toujours renseignées dès la création.
alter table tournees alter column nom_commune drop not null;
alter table tournees alter column nom_rue drop not null;
