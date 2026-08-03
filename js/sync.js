// Récupère depuis Supabase les tournées de l'agent connecté (avec les
// agents co-affectés, pour le ruban en haut) et les adresses associées, et
// les copie dans IndexedDB. Synchronisation descendante simple, à sens
// unique, lancée une fois après connexion : elle ne gère pas les conflits
// ni les écritures faites hors-ligne pendant une session précédente (file
// d'attente prévue pour une étape suivante).
import { put } from "./db.js";

export async function synchroniserDonneesAgent(supabase, agent) {
  // PostgREST embarque les lignes liées via les clés étrangères déclarées
  // dans schema.sql (tournee_agents -> agents), en une seule requête.
  const { data: tournees, error } = await supabase
    .from("tournees")
    .select("*, tournee_agents(agents(id, nom, prenom))");

  if (error) throw error;

  for (const t of tournees) {
    await put("tournees", {
      id: t.id,
      numero: t.numero,
      nom_commune: t.nom_commune,
      nom_rue: t.nom_rue,
      agents: (t.tournee_agents || []).map((ta) => ta.agents).filter(Boolean),
    });
  }

  for (const t of tournees) {
    const { data: adresses, error: errAdresses } = await supabase
      .from("adresses")
      .select("*")
      .eq("tournee_id", t.id);

    if (errAdresses) throw errAdresses;

    for (const adresse of adresses) {
      await put("adresses", adresse);
    }
  }

  return tournees;
}
