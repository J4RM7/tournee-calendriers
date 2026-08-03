// Client Supabase, chargé depuis un CDN en module ES (pas besoin de npm/Node
// pour ce MVP). La clé "anon" de Supabase n'est pas un secret absolu (elle
// est protégée par les règles RLS côté base de données) mais on évite quand
// même de la coder en dur, pour pouvoir changer de projet Supabase (dev/prod)
// sans toucher au code :
//
// - En local : les valeurs viennent de js/config.js (non versionné, copié
//   depuis js/config.example.js).
// - Sur Vercel : les valeurs viennent des variables d'environnement du
//   projet Vercel, exposées via la fonction serverless /api/config.js.
//
// Si aucune config n'est trouvée, l'app continue de fonctionner : elle
// reste simplement en mode "local uniquement" (voir db.js).
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

let clientPromise = null;

async function loadConfig() {
  try {
    const mod = await import("./config.js");
    return mod.SUPABASE_CONFIG;
  } catch (_) {
    // Pas de config.js locale (cas normal en dev tant qu'on ne l'a pas créée)
  }

  try {
    const res = await fetch("/api/config");
    if (res.ok) return await res.json();
  } catch (_) {
    // /api/config indisponible (normal en local sans Vercel)
  }

  return null;
}

// Retourne un client Supabase, ou null si aucune configuration n'est
// disponible (l'app doit alors se rabattre sur le stockage local).
export function getSupabaseClient() {
  if (!clientPromise) {
    clientPromise = loadConfig().then((config) => {
      if (!config || !config.url || !config.anonKey) {
        console.info("[supabase] non configuré, mode local uniquement.");
        return null;
      }
      return createClient(config.url, config.anonKey);
    });
  }
  return clientPromise;
}
