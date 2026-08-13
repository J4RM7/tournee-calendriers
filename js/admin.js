// Fonctions réservées à l'administrateur (compte de l'amicale) : gérer les
// amicalistes (fiches nom/prénom, sans compte propre — voir schema.sql),
// créer/affecter/supprimer des tournées, et gérer leur carte PDF.
// Contrairement au reste de l'app, ces écrans nécessitent d'être en ligne —
// pas de cache hors-ligne ici, ce n'est pas ce dont un admin a besoin sur
// le terrain. Exception : obtenirUrlCartePdf est aussi utilisée côté agent
// (écran Cartographie), pour la même raison — pas de mise en cache PDF
// hors-ligne prévue pour l'instant.

import { estAdresseValidee } from "./db.js";

export async function listerTournees(supabase) {
  const { data, error } = await supabase
    .from("tournees")
    .select(
      "*, tournee_agents(agents(id, nom, prenom)), communes(rues(adresses(id, passage_1, passage_2, passage_3, dons(montant, refuse, date))))"
    )
    .order("numero");

  if (error) throw error;

  return data.map((t) => {
    const adresses = (t.communes || []).flatMap((c) => (c.rues || []).flatMap((r) => r.adresses || []));
    const traitees = adresses.filter((a) => estAdresseValidee(a, a.dons || [])).length;
    return {
      id: t.id,
      numero: t.numero,
      nom_commune: t.nom_commune,
      nom_rue: t.nom_rue,
      agents: (t.tournee_agents || []).map((ta) => ta.agents).filter(Boolean),
      nombreAdresses: adresses.length,
      nombreTraitees: traitees,
    };
  });
}

// Inclut le statut actif et les tournées affectées (pour l'affichage
// "(Tournée n°X)" / "Non affecté" / badge "Retiré" dans l'écran Amicalistes).
export async function listerAgents(supabase) {
  const { data, error } = await supabase
    .from("agents")
    .select("id, nom, prenom, est_admin, actif, tournee_agents(tournees(numero))")
    .order("nom");

  if (error) throw error;

  return data.map((a) => ({
    id: a.id,
    nom: a.nom,
    prenom: a.prenom,
    est_admin: a.est_admin,
    actif: a.actif,
    tourneeNumeros: (a.tournee_agents || []).map((ta) => ta.tournees?.numero).filter((n) => n != null),
  }));
}

// Un amicaliste n'a pas de compte : juste une fiche nom/prénom, affectée
// ensuite à une tournée via affecterAgent.
export async function creerAgent(supabase, { nom, prenom }) {
  const { data, error } = await supabase.from("agents").insert({ nom, prenom }).select().single();
  if (error) throw error;
  return data;
}

// "Supprimer" un amicaliste ne le retire jamais de la base (dons.agent_id
// doit rester valide pour l'historique) : on le désaffecte de ses
// tournées en cours et on le marque inactif (affiché avec un badge
// "Retiré", non sélectionnable pour une nouvelle affectation).
export async function desactiverAgent(supabase, agentId) {
  const { error: erreurRetrait } = await supabase.from("tournee_agents").delete().eq("agent_id", agentId);
  if (erreurRetrait) throw erreurRetrait;

  const { error } = await supabase.from("agents").update({ actif: false }).eq("id", agentId);
  if (error) throw error;
}

async function appelerFonctionAdmin(supabase, chemin, corps) {
  const {
    data: { session },
  } = await supabase.auth.getSession();
  if (!session) throw new Error("Session expirée, reconnectez-vous.");

  const reponse = await fetch(chemin, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${session.access_token}` },
    body: JSON.stringify(corps),
  });
  const resultat = await reponse.json();
  if (!reponse.ok) throw new Error(resultat.error || "Erreur serveur.");
  return resultat;
}

// Crée la tournée ET son compte de connexion partagé (nécessite la clé
// service_role, donc passe par une fonction serverless — voir api/admin/).
export async function creerTourneeDistante(supabase, { numero, email, motDePasse }) {
  const { tournee } = await appelerFonctionAdmin(supabase, "/api/admin/creer-tournee", {
    numero,
    email,
    motDePasse,
  });
  return tournee;
}

// Supprime la tournée ET son compte (irréversible — cascade sur
// communes/rues/adresses/dons, confirmé par saisie du numéro côté écran).
export async function supprimerTourneeDistante(supabase, tourneeId) {
  await appelerFonctionAdmin(supabase, "/api/admin/supprimer-tournee", { tourneeId });
}

export async function affecterAgent(supabase, tourneeId, agentId) {
  const { error } = await supabase
    .from("tournee_agents")
    .insert({ tournee_id: tourneeId, agent_id: agentId });

  if (error) throw error;
}

export async function retirerAgent(supabase, tourneeId, agentId) {
  const { error } = await supabase
    .from("tournee_agents")
    .delete()
    .eq("tournee_id", tourneeId)
    .eq("agent_id", agentId);

  if (error) throw error;
}

// --- Carte PDF d'une tournée --------------------------------------------
// Un seul objet par tournée, nommé "<tournee_id>.pdf" (voir les policies
// storage.objects dans schema.sql/migration_admin.sql).
const BUCKET_CARTES = "cartes-tournees";

export async function uploaderCartePdf(supabase, tourneeId, fichier) {
  const { error } = await supabase.storage
    .from(BUCKET_CARTES)
    .upload(`${tourneeId}.pdf`, fichier, { upsert: true, contentType: "application/pdf" });
  if (error) throw error;
}

// Retourne une URL signée temporaire, ou null si aucune carte n'a encore
// été importée pour cette tournée.
export async function obtenirUrlCartePdf(supabase, tourneeId) {
  const { data, error } = await supabase.storage
    .from(BUCKET_CARTES)
    .createSignedUrl(`${tourneeId}.pdf`, 60);
  if (error) return null;
  return data.signedUrl;
}

export async function supprimerCartePdf(supabase, tourneeId) {
  const { error } = await supabase.storage.from(BUCKET_CARTES).remove([`${tourneeId}.pdf`]);
  if (error) throw error;
}
