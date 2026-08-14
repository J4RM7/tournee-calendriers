// Récupère depuis Supabase les tournées de l'agent connecté (avec les
// agents co-affectés, pour le ruban en haut) et toute la hiérarchie
// communes -> rues -> adresses, et les copie dans IndexedDB.
// Synchronisation descendante simple, à sens unique, lancée une fois après
// connexion : elle ne gère pas les conflits ni les écritures faites
// hors-ligne pendant une session précédente (file d'attente prévue pour
// une étape suivante).
import { put } from "./db.js";

export async function synchroniserDonneesAgent(supabase, agent) {
  // PostgREST embarque toute la hiérarchie en une seule requête, via les
  // clés étrangères déclarées dans schema.sql.
  const { data: tournees, error } = await supabase
    .from("tournees")
    .select(
      "*, tournee_agents(agents(id, nom, prenom)), communes(*, rues(*, adresses(*, laisses_boite(*)))), depots(*)"
    );

  if (error) throw error;

  for (const t of tournees) {
    await put("tournees", {
      id: t.id,
      numero: t.numero,
      nom_commune: t.nom_commune,
      nom_rue: t.nom_rue,
      agents: (t.tournee_agents || []).map((ta) => ta.agents).filter(Boolean),
    });

    for (const commune of t.communes || []) {
      const { rues, ...communeSansRues } = commune;
      await put("communes", communeSansRues);

      for (const rue of rues || []) {
        const { adresses, ...rueSansAdresses } = rue;
        await put("rues", rueSansAdresses);

        for (const adresse of adresses || []) {
          const { laisses_boite, ...adresseSansLc } = adresse;
          await put("adresses", adresseSansLc);
          for (const lc of laisses_boite || []) {
            await put("laisses_boite", lc);
          }
        }
      }
    }

    for (const depot of t.depots || []) {
      await put("depots", depot);
    }
  }

  return tournees;
}
