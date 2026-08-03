// Stockage local avec IndexedDB.
// C'est la source de vérité de l'écran : l'app lit et écrit toujours ici
// d'abord, ce qui fait qu'elle fonctionne même sans réseau et même sans
// Supabase configuré. La synchronisation avec Supabase (quand elle est
// disponible) est gérée en plus, dans app.js/sync.js, pas ici.

const DB_NAME = "tournee-calendriers";
const DB_VERSION = 2;

// Identifiants "démo" utilisés tant qu'on n'est pas connecté à un vrai
// compte (mode démo hors-ligne, sans backend).
export const DEMO_AGENT_ID = "demo-agent-1";
export const DEMO_AGENT_2_ID = "demo-agent-2";
export const DEMO_TOURNEE_ID = "demo-tournee-1";

let dbPromise = null;

function openDB() {
  if (dbPromise) return dbPromise;

  dbPromise = new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = (event) => {
      const db = request.result;

      // v1 utilisait un store "secteurs" ; le modèle "tournées" (v2) le
      // remplace. On repart d'un store propre plutôt que de migrer des
      // données de démo qui n'ont pas besoin d'être préservées.
      if (event.oldVersion < 2 && db.objectStoreNames.contains("secteurs")) {
        db.deleteObjectStore("secteurs");
      }
      if (!db.objectStoreNames.contains("tournees")) {
        db.createObjectStore("tournees", { keyPath: "id" });
      }
      if (!db.objectStoreNames.contains("adresses")) {
        const store = db.createObjectStore("adresses", { keyPath: "id" });
        store.createIndex("tournee_id", "tournee_id");
      } else {
        const store = request.transaction.objectStore("adresses");
        if (!store.indexNames.contains("tournee_id")) {
          store.createIndex("tournee_id", "tournee_id");
        }
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
      tournee_id: DEMO_TOURNEE_ID,
      numero: a.numero,
      rue: "Rue de la Mairie",
      commune: "Sainte-Adresse",
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
}

export async function getTournee(id) {
  return get("tournees", id);
}

export async function getAdressesByTournee(tourneeId) {
  return getAllByIndex("adresses", "tournee_id", tourneeId);
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
