// Authentification par email + mot de passe via Supabase Auth. Deux types
// de comptes : celui de l'amicale (admin, lié à agents.user_id), et un
// compte PARTAGÉ par tournée (lié à tournees.user_id, créé depuis l'écran
// admin — voir js/admin.js : creerTourneeDistante). Les amicalistes
// eux-mêmes n'ont pas de compte propre : après connexion sur le compte
// d'une tournée, l'app demande "qui es-tu ?" parmi le roster affecté.
import { getSupabaseClient } from "./supabaseClient.js";

// Session en cours, ou null si non connecté / Supabase non configuré.
export async function getSession() {
  const supabase = await getSupabaseClient();
  if (!supabase) return null;
  const { data } = await supabase.auth.getSession();
  return data.session;
}

export async function connecterAvecMotDePasse(email, motDePasse) {
  const supabase = await getSupabaseClient();
  if (!supabase) throw new Error("Supabase n'est pas configuré.");

  const { error } = await supabase.auth.signInWithPassword({ email, password: motDePasse });
  if (error) throw error;
}

export async function deconnecter() {
  const supabase = await getSupabaseClient();
  if (!supabase) return;
  await supabase.auth.signOut();
}

// Appelle callback(session) à chaque changement d'état de connexion
// (connexion, déconnexion, arrivée du lien magique...).
export async function ecouterChangementsAuth(callback) {
  const supabase = await getSupabaseClient();
  if (!supabase) return;
  supabase.auth.onAuthStateChange((_event, session) => callback(session));
}

// Récupère la fiche "agent" liée au compte connecté (nom, prénom, binôme...).
// Retourne null si l'utilisateur connecté n'a pas encore de fiche agent
// associée côté base (à faire créer par le chef de centre).
export async function getAgentPourUtilisateur(userId) {
  const supabase = await getSupabaseClient();
  if (!supabase) return null;

  const { data, error } = await supabase
    .from("agents")
    .select("*")
    .eq("user_id", userId)
    .maybeSingle();

  if (error) {
    console.warn("[auth] impossible de récupérer la fiche agent :", error.message);
    return null;
  }
  return data;
}

// Récupère la tournée dont le compte de connexion partagé est celui
// connecté, avec son roster d'amicalistes (pour l'écran "qui es-tu ?").
// Retourne null si l'utilisateur connecté n'est lié à aucune tournée.
export async function getTourneePourUtilisateur(userId) {
  const supabase = await getSupabaseClient();
  if (!supabase) return null;

  const { data, error } = await supabase
    .from("tournees")
    .select("*, tournee_agents(agents(id, nom, prenom, actif))")
    .eq("user_id", userId)
    .maybeSingle();

  if (error) {
    console.warn("[auth] impossible de récupérer la tournée :", error.message);
    return null;
  }
  if (!data) return null;

  return {
    ...data,
    agents: (data.tournee_agents || []).map((ta) => ta.agents).filter((a) => a && a.actif),
  };
}
