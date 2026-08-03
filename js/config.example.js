// Copiez ce fichier en "config.js" (même dossier) pour le développement
// local, puis remplissez vos vraies valeurs Supabase.
// "config.js" est ignoré par git (voir .gitignore) : vos clés ne partent
// jamais dans le dépôt. En production (Vercel), ce fichier n'est pas
// utilisé : les clés viennent des variables d'environnement Vercel via
// /api/config.js (voir js/supabaseClient.js).
export const SUPABASE_CONFIG = {
  url: "https://VOTRE-PROJET.supabase.co",
  anonKey: "VOTRE_CLE_ANON_PUBLIQUE",
};
