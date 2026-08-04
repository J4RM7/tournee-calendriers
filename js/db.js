// Stockage local avec IndexedDB.
// C'est la source de vérité de l'écran : l'app lit et écrit toujours ici
// d'abord, ce qui fait qu'elle fonctionne même sans réseau et même sans
// Supabase configuré. La synchronisation avec Supabase (quand elle est
// disponible) est gérée en plus, dans app.js/sync.js, pas ici.
//
// Hiérarchie : tournée -> communes -> rues -> adresses -> dons.

const DB_NAME = "tournee-calendriers";
const DB_VERSION = 3;

// Identifiants "démo" utilisés tant qu'on n'est pas connecté à un vrai
// compte (mode démo hors-ligne, sans backend).
export const DEMO_AGENT_ID = "demo-agent-1";
export const DEMO_AGENT_2_ID = "demo-agent-2";
export const DEMO_TOURNEE_ID = "demo-tournee-1";
export const DEMO_COMMUNE_ID = "demo-commune-1";
export const DEMO_RUE_ID = "demo-rue-1";

let dbPromise = null;

function openDB() {
  if (dbPromise) return dbPromise;

  dbPromise = new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = (event) => {
      const db = request.result;

      // v3 remplace les champs libres adresses.rue/commune par de vraies
      // tables communes/rues. On repart de stores propres plutôt que de
      // migrer des données de démo qui n'ont pas besoin d'être préservées.
      if (event.oldVersion < 3 && db.objectStoreNames.contains("adresses")) {
        db.deleteObjectStore("adresses");
      }
      if (!db.objectStoreNames.contains("tournees")) {
        db.createObjectStore("tournees", { keyPath: "id" });
      }
      if (!db.objectStoreNames.contains("communes")) {
        const store = db.createObjectStore("communes", { keyPath: "id" });
        store.createIndex("tournee_id", "tournee_id");
      }
      if (!db.objectStoreNames.contains("rues")) {
        const store = db.createObjectStore("rues", { keyPath: "id" });
        store.createIndex("commune_id", "commune_id");
      }
      if (!db.objectStoreNames.contains("adresses")) {
        const store = db.createObjectStore("adresses", { keyPath: "id" });
        store.createIndex("rue_id", "rue_id");
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
// sans backend connecté. Deux rues, pour illustrer la navigation "une rue
// par page".
export async function seedIfEmpty() {
  const tournees = await getAll("tournees");
  if (tournees.length > 0) return;

  await put("tournees", {
    id: DEMO_TOURNEE_ID,
    numero: 18,
    nom_commune: "Sainte-Adresse",
    nom_rue: "Rue de la Mairie",
    // Les infos des agents affectés sont mises en cache directement sur la
    // tournée (pas de jointure côté IndexedDB) : c'est ce que sync.js fait
    // aussi avec les vraies données Supabase.
    agents: [
      { id: DEMO_AGENT_ID, nom: "Vous", prenom: "" },
      { id: DEMO_AGENT_2_ID, nom: "Dupuis", prenom: "Alexandre" },
    ],
  });

  await put("communes", {
    id: DEMO_COMMUNE_ID,
    tournee_id: DEMO_TOURNEE_ID,
    nom: "Sainte-Adresse",
  });

  await put("rues", {
    id: DEMO_RUE_ID,
    commune_id: DEMO_COMMUNE_ID,
    nom: "Rue de la Mairie",
  });

  const adressesDemo = [
    { numero: "2", nom_famille: "Dupont", passage_1: "passe", passage_2: "a_faire", passage_3: "a_faire" },
    { numero: "4", nom_famille: "Martin", passage_1: "absent", passage_2: "a_faire", passage_3: "a_faire" },
    { numero: "6", nom_famille: "Bernard", passage_1: "passe", passage_2: "a_faire", passage_3: "a_faire" },
    { numero: "8", nom_famille: "Petit", passage_1: "absent", passage_2: "absent", passage_3: "a_faire" },
    { numero: "10", nom_famille: null, passage_1: "a_faire", passage_2: "a_faire", passage_3: "a_faire" },
  ];

  for (const [i, a] of adressesDemo.entries()) {
    await put("adresses", {
      id: `demo-adresse-${i + 1}`,
      rue_id: DEMO_RUE_ID,
      numero: a.numero,
      nom_famille: a.nom_famille,
      latitude: null,
      longitude: null,
      passage_1: a.passage_1,
      passage_2: a.passage_2,
      passage_3: a.passage_3,
      notes: "",
    });
  }

  // Une démo de don déjà enregistré, pour illustrer la case "don" verte.
  await put("dons", {
    id: "demo-don-1",
    adresse_id: "demo-adresse-1",
    agent_id: DEMO_AGENT_ID,
    refuse: false,
    montant: 15,
    mode_paiement: "especes",
    nom_donateur: null,
    email_donateur: null,
    date: new Date().toISOString(),
    recu_envoye: false,
  });

  // Un don de l'an dernier, pour illustrer le pavé "année précédente".
  const dateAnPassee = new Date();
  dateAnPassee.setFullYear(dateAnPassee.getFullYear() - 1);
  await put("dons", {
    id: "demo-don-2",
    adresse_id: "demo-adresse-2",
    agent_id: DEMO_AGENT_ID,
    refuse: false,
    montant: 10,
    mode_paiement: "cheque",
    nom_donateur: null,
    email_donateur: null,
    date: dateAnPassee.toISOString(),
    recu_envoye: false,
  });
}

export async function getTournee(id) {
  return get("tournees", id);
}

export async function getCommunesByTournee(tourneeId) {
  return getAllByIndex("communes", "tournee_id", tourneeId);
}

export async function getCommune(id) {
  return get("communes", id);
}

export async function addCommune(champs) {
  const record = { id: crypto.randomUUID(), ...champs };
  await put("communes", record);
  return record;
}

export async function updateCommuneNom(id, nom) {
  const commune = await get("communes", id);
  if (!commune) return;
  commune.nom = nom;
  await put("communes", commune);
  return commune;
}

export async function getRuesByCommune(communeId) {
  return getAllByIndex("rues", "commune_id", communeId);
}

export async function getRue(id) {
  return get("rues", id);
}

export async function addRue(champs) {
  const record = { id: crypto.randomUUID(), ...champs };
  await put("rues", record);
  return record;
}

export async function updateRueNom(id, nom) {
  const rue = await get("rues", id);
  if (!rue) return;
  rue.nom = nom;
  await put("rues", rue);
  return rue;
}

export async function getAdressesByRue(rueId) {
  return getAllByIndex("adresses", "rue_id", rueId);
}

export async function updateAdressePassage(id, numeroPassage, nouvelEtat) {
  const adresse = await get("adresses", id);
  if (!adresse) return;
  adresse[`passage_${numeroPassage}`] = nouvelEtat;
  await put("adresses", adresse);
  return adresse;
}

export async function updateAdresseInfos(id, champs) {
  const adresse = await get("adresses", id);
  if (!adresse) return;
  Object.assign(adresse, champs);
  await put("adresses", adresse);
  return adresse;
}

export async function addAdresse(champs) {
  const record = {
    id: crypto.randomUUID(),
    latitude: null,
    longitude: null,
    passage_1: "a_faire",
    passage_2: "a_faire",
    passage_3: "a_faire",
    notes: null,
    nom_famille: null,
    ...champs,
  };
  await put("adresses", record);
  return record;
}

export async function addDon(don) {
  const record = {
    id: crypto.randomUUID(),
    date: new Date().toISOString(),
    recu_envoye: false,
    refuse: false,
    montant: 0,
    ...don,
  };
  await put("dons", record);
  return record;
}

export async function getDonsByAdresse(adresseId) {
  return getAllByIndex("dons", "adresse_id", adresseId);
}

// Les dons ne sont jamais supprimés : chaque don garde sa date, donc
// l'année à laquelle il appartient se déduit toujours de `date`. Ça permet
// d'afficher "le don de cette année" (qui redevient vide après une
// réinitialisation de campagne, sans rien effacer) et "le don de l'année
// dernière" à partir des mêmes données.
export function trouverDonPourAnnee(dons, annee) {
  const donsAnnee = dons.filter((d) => new Date(d.date).getFullYear() === annee);
  return donsAnnee.find((d) => d.refuse) || donsAnnee.find((d) => d.montant > 0) || null;
}
