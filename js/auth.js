// Authentification par email + mot de passe via Supabase Auth. Les comptes
// (un par agent, plus le compte de l'amicale) sont créés à la main dans le
// Dashboard Supabase (Authentication > Users > Add user, "Auto Confirm
// User" coché) puis reliés à une fiche "agents" via agents.user_id.
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
