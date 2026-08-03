// Stockage local avec IndexedDB.
// C'est la source de vérité de l'écran : l'app lit et écrit toujours ici
// d'abord, ce qui fait qu'elle fonctionne même sans réseau et même sans
// Supabase configuré. La synchronisation avec Supabase (quand elle est
// disponible) est gérée en plus, dans app.js, pas ici.

const DB_NAME = "tournee-calendriers";
const DB_VERSION = 1;

// Identifiants "démo" utilisés tant qu'il n'y a pas d'authentification.
// Une vraie sélection d'agent/secteur arrivera à une étape suivante.
export const DEMO_AGENT_ID = "demo-agent-1";
export const DEMO_SECTEUR_ID = "demo-secteur-1";

let dbPromise = null;

function openDB() {
  if (dbPromise) return dbPromise;

  dbPromise = new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = () => {
      const db = request.result;

      if (!db.objectStoreNames.contains("secteurs")) {
        db.createObjectStore("secteurs", { keyPath: "id" });
      }
      if (!db.objectStoreNames.contains("adresses")) {
        const store = db.createObjectStore("adresses", { keyPath: "id" });
        store.createIndex("secteur_id", "secteur_id");
      }
      if (!db.objectStoreNames.contains("dons")) {
        const store = db.createObjectStore("dons", { keyPath: "id" });
        store.createIndex("adresse_id", "adresse_id");
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });

  return dbPromise;
}

function tx(storeName, mode) {
  return openDB().then((db) => db.transaction(storeName, mode).objectStore(storeName));
}

function requestToPromise(request) {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

export async function getAll(storeName) {
  const store = await tx(storeName, "readonly");
  return requestToPromise(store.getAll());
}

export async function getAllByIndex(storeName, indexName, value) {
  const store = await tx(storeName, "readonly");
  return requestToPromise(store.index(indexName).getAll(value));
}

export async function put(storeName, value) {
  const store = await tx(storeName, "readwrite");
  return requestToPromise(store.put(value));
}

export async function get(storeName, id) {
  const store = await tx(storeName, "readonly");
  return requestToPromise(store.get(id));
}

// Jeu de données de démonstration, inséré une seule fois si la base est
// vide, pour que l'écran affiche tout de suite quelque chose de concret
// sans backend connecté.
export async function seedIfEmpty() {
  const secteurs = await getAll("secteurs");
  if (secteurs.length > 0) return;

  await put("secteurs", {
    id: DEMO_SECTEUR_ID,
    nom_commune: "Sainte-Adresse",
    nom_rue: "Rue de la Mairie",
    agent_id: DEMO_AGENT_ID,
  });

  const adressesDemo = [
    { numero: "2", rue: "Rue de la Mairie", statut: "a_faire", nom_famille: "Dupont" },
    { numero: "4", rue: "Rue de la Mairie", statut: "a_faire", nom_famille: "Martin" },
    { numero: "6", rue: "Rue de la Mairie", statut: "fait", nom_famille: "Bernard" },
    { numero: "8", rue: "Rue de la Mairie", statut: "absent_repasse", nom_famille: "Petit" },
    { numero: "10", rue: "Rue de la Mairie", statut: "a_faire", nom_famille: null },
  ];

  for (const [i, a] of adressesDemo.entries()) {
    await put("adresses", {
      id: `demo-adresse-${i + 1}`,
      secteur_id: DEMO_SECTEUR_ID,
      numero: a.numero,
      rue: a.rue,
      commune: "Sainte-Adresse",
      nom_famille: a.nom_famille,
      latitude: null,
      longitude: null,
      statut: a.statut,
      notes: "",
    });
  }
}

export async function getSecteur(id) {
  return get("secteurs", id);
}

export async function getAdressesBySecteur(secteurId) {
  return getAllByIndex("adresses", "secteur_id", secteurId);
}

export async function updateAdresseStatut(id, statut, notes) {
  const adresse = await get("adresses", id);
  if (!adresse) return;
  adresse.statut = statut;
  if (notes !== undefined) adresse.notes = notes;
  await put("adresses", adresse);
  return adresse;
}

export async function addDon(don) {
  const record = {
    id: crypto.randomUUID(),
    date: new Date().toISOString(),
    recu_envoye: false,
    ...don,
  };
  await put("dons", record);
  return record;
}

export async function getDonsByAdresse(adresseId) {
  return getAllByIndex("dons", "adresse_id", adresseId);
}
