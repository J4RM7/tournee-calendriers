// Récupère depuis Supabase les données propres à l'agent connecté et les
// copie dans IndexedDB. C'est une synchronisation "descendante" simple,
// à sens unique, lancée une fois après connexion : elle ne gère pas les
// conflits ni les écritures faites hors-ligne pendant une session précédente
// (file d'attente prévue pour une étape suivante).
import { put } from "./db.js";

export async function synchroniserDonneesAgent(supabase, agent) {
  const { data: secteurs, error: errSecteurs } = await supabase
    .from("secteurs")
    .select("*")
    .in("agent_id", idsAccessibles(agent));

  if (errSecteurs) throw errSecteurs;

  for (const secteur of secteurs) {
    await put("secteurs", secteur);
  }

  for (const secteur of secteurs) {
    const { data: adresses, error: errAdresses } = await supabase
      .from("adresses")
      .select("*")
      .eq("secteur_id", secteur.id);

    if (errAdresses) throw errAdresses;

    for (const adresse of adresses) {
      await put("adresses", adresse);
    }
  }

  return secteurs;
}

function idsAccessibles(agent) {
  return [agent.id, agent.binome_id].filter(Boolean);
}
