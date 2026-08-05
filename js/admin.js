// Fonctions réservées à l'administrateur (compte de l'amicale) : créer les
// tournées et y affecter des agents. Contrairement au reste de l'app, ces
// écrans nécessitent d'être en ligne — pas de cache hors-ligne ici, ce
// n'est pas ce dont un admin a besoin sur le terrain.

import { statutValidationAdresse } from "./db.js";

function estAdresseValidee(adresse) {
  return statutValidationAdresse(adresse) === "validee";
}

export async function listerTournees(supabase) {
  const { data, error } = await supabase
    .from("tournees")
    .select(
      "*, tournee_agents(agents(id, nom, prenom)), communes(rues(adresses(id, passage_1, passage_2, passage_3)))"
    )
    .order("numero");

  if (error) throw error;

  return data.map((t) => {
    const adresses = (t.communes || []).flatMap((c) => (c.rues || []).flatMap((r) => r.adresses || []));
    const traitees = adresses.filter(estAdresseValidee).length;
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

export async function listerAgents(supabase) {
  const { data, error } = await supabase
    .from("agents")
    .select("id, nom, prenom, est_admin")
    .order("nom");

  if (error) throw error;
  return data;
}

export async function creerTournee(supabase, { numero, nom_commune, nom_rue }) {
  const { data, error } = await supabase
    .from("tournees")
    .insert({ numero, nom_commune, nom_rue })
    .select()
    .single();

  if (error) throw error;
  return data;
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
