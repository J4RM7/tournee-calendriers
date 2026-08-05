// Stockage local avec IndexedDB.
// C'est la source de vérité de l'écran : l'app lit et écrit toujours ici
// d'abord, ce qui fait qu'elle fonctionne même sans réseau et même sans
// Supabase configuré. La synchronisation avec Supabase (quand elle est
// disponible) est gérée en plus, dans app.js/sync.js, pas ici.
//
// Hiérarchie : tournée -> communes -> rues -> adresses -> dons.

const DB_NAME = "tournee-calendriers";
const DB_VERSION = 5;

// Identifiants "démo" utilisés tant qu'on n'est pas connecté à un vrai
// compte (mode démo hors-ligne, sans backend).
export const DEMO_AGENT_ID = "demo-agent-1";
export const DEMO_AGENT_2_ID = "demo-agent-2";
export const DEMO_TOURNEE_ID = "demo-tournee-1";
export const DEMO_COMMUNE_ID = "demo-commune-1";
export const DEMO_RUE_ID = "demo-rue-1";
export const DEMO_RUE_2_ID = "demo-rue-2";
export const DEMO_RUE_3_ID = "demo-rue-3";

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
      // v4 ajoute adresses.created_at (tri par ordre de saisie). Le cache
      // local n'est qu'une copie : les vraies données seront re-synchronisées
      // depuis Supabase à la prochaine connexion, donc on repart à vide ici
      // aussi plutôt que de migrer les enregistrements existants.
      if (event.oldVersion < 4) {
        for (const nom of ["tournees", "communes", "rues", "adresses", "dons"]) {
          if (db.objectStoreNames.contains(nom)) db.deleteObjectStore(nom);
        }
      }
      // v5 ajoute adresses.ordre (rang modifiable manuellement, façon
      // playlist). Même logique qu'en v4 : cache local repartant à vide.
      if (event.oldVersion < 5) {
        for (const nom of ["tournees", "communes", "rues", "adresses", "dons"]) {
          if (db.objectStoreNames.contains(nom)) db.deleteObjectStore(nom);
        }
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
// sans backend connecté. Reprend le scénario réel : tournée n°18, commune
// de Veyras, 3 rues.
export async function seedIfEmpty() {
  const tournees = await getAll("tournees");
  if (tournees.length > 0) return;

  await put("tournees", {
    id: DEMO_TOURNEE_ID,
    numero: 18,
    nom_commune: "Veyras",
    nom_rue: "Montée de la Planète",
    // Les infos des agents affectés sont mises en cache directement sur la
    // tournée (pas de jointure côté IndexedDB) : c'est ce que sync.js fait
    // aussi avec les vraies données Supabase.
    agents: [
      { id: DEMO_AGENT_ID, nom: "", prenom: "Jérémy" },
      { id: DEMO_AGENT_2_ID, nom: "Dupuis", prenom: "Alexandre" },
    ],
  });

  await put("communes", {
    id: DEMO_COMMUNE_ID,
    tournee_id: DEMO_TOURNEE_ID,
    nom: "Veyras",
  });

  await put("rues", { id: DEMO_RUE_ID, commune_id: DEMO_COMMUNE_ID, nom: "Montée de la Planète" });
  await put("rues", { id: DEMO_RUE_2_ID, commune_id: DEMO_COMMUNE_ID, nom: "Avenue du Ruissol" });
  await put("rues", { id: DEMO_RUE_3_ID, commune_id: DEMO_COMMUNE_ID, nom: "Chemin de Many" });

  const maintenant = new Date().toISOString();
  // Décalages en minutes avant l'instant présent : détermine l'ordre de
  // saisie simulé. Volontairement différent de l'ordre des numéros pour
  // Montée de la Planète (Martin a été saisi avant Dupont sur le terrain,
  // même si son numéro est plus grand), afin que la démo illustre bien le
  // tri "par ordre de saisie" plutôt que par numéro.
  const creeLe = (minutesAvant) => new Date(Date.now() - minutesAvant * 60000).toISOString();

  const adressesDemo = [
    { id: "demo-adresse-1", rue_id: DEMO_RUE_ID, numero: "2", nom_famille: "Dupont", passage_1: "passe", passage_2: "a_faire", passage_3: "a_faire", maj_le: maintenant, created_at: creeLe(3), ordre: 1 },
    { id: "demo-adresse-2", rue_id: DEMO_RUE_ID, numero: "4", nom_famille: "Martin", passage_1: "absent", passage_2: "a_faire", passage_3: "a_faire", maj_le: maintenant, created_at: creeLe(4), ordre: 0 },
    { id: "demo-adresse-3", rue_id: DEMO_RUE_ID, numero: "6", nom_famille: "Bernard", passage_1: "passe", passage_2: "a_faire", passage_3: "a_faire", maj_le: maintenant, created_at: creeLe(1), ordre: 3 },
    { id: "demo-adresse-4", rue_id: DEMO_RUE_ID, numero: "8", nom_famille: "Petit", passage_1: "absent", passage_2: "absent", passage_3: "a_faire", maj_le: maintenant, created_at: creeLe(2), ordre: 2 },
    { id: "demo-adresse-5", rue_id: DEMO_RUE_2_ID, numero: "1", nom_famille: "Roux", passage_1: "a_faire", passage_2: "a_faire", passage_3: "a_faire", maj_le: null, created_at: creeLe(6), ordre: 1 },
    { id: "demo-adresse-6", rue_id: DEMO_RUE_2_ID, numero: "3", nom_famille: "Fournier", passage_1: "a_faire", passage_2: "a_faire", passage_3: "a_faire", maj_le: null, created_at: creeLe(5), ordre: 2 },
    { id: "demo-adresse-7", rue_id: DEMO_RUE_2_ID, numero: "5", nom_famille: null, passage_1: "a_faire", passage_2: "a_faire", passage_3: "a_faire", maj_le: null, created_at: creeLe(7), ordre: 0 },
    { id: "demo-adresse-8", rue_id: DEMO_RUE_3_ID, numero: "10", nom_famille: "Girard", passage_1: "a_faire", passage_2: "a_faire", passage_3: "a_faire", maj_le: null, created_at: creeLe(9), ordre: 0 },
    { id: "demo-adresse-9", rue_id: DEMO_RUE_3_ID, numero: "12", nom_famille: "Blanc", passage_1: "a_faire", passage_2: "a_faire", passage_3: "a_faire", maj_le: null, created_at: creeLe(8), ordre: 1 },
  ];

  for (const a of adressesDemo) {
    await put("adresses", {
      id: a.id,
      rue_id: a.rue_id,
      numero: a.numero,
      nom_famille: a.nom_famille,
      latitude: null,
      longitude: null,
      passage_1: a.passage_1,
      passage_2: a.passage_2,
      passage_3: a.passage_3,
      notes: "",
      maj_le: a.maj_le,
      created_at: a.created_at,
      ordre: a.ordre,
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
    date: maintenant,
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

// Rang à donner à une nouvelle adresse pour qu'elle arrive en dernier dans
// sa rue (ordre de saisie par défaut, modifiable ensuite au glisser-déposer).
export async function prochainOrdre(rueId) {
  const adresses = await getAdressesByRue(rueId);
  if (adresses.length === 0) return 0;
  return Math.max(...adresses.map((a) => a.ordre ?? 0)) + 1;
}

// Applique un nouvel ordre (glisser-déposer façon playlist) : `idsOrdonnes`
// est la liste des identifiants d'adresses de la rue, dans leur nouvel ordre.
export async function reordonnerAdresses(idsOrdonnes) {
  const adressesMaj = [];
  for (let i = 0; i < idsOrdonnes.length; i++) {
    const adresse = await get("adresses", idsOrdonnes[i]);
    if (!adresse || adresse.ordre === i) continue;
    adresse.ordre = i;
    await put("adresses", adresse);
    adressesMaj.push(adresse);
  }
  return adressesMaj;
}

export async function updateAdressePassage(id, numeroPassage, nouvelEtat) {
  const adresse = await get("adresses", id);
  if (!adresse) return;
  adresse[`passage_${numeroPassage}`] = nouvelEtat;
  adresse.maj_le = new Date().toISOString();
  await put("adresses", adresse);
  return adresse;
}

// Marque une adresse comme mise à jour à l'instant (utilisé après
// l'enregistrement d'un don, qui est aussi une "mise à jour de la maison").
export async function toucherAdresse(id) {
  const adresse = await get("adresses", id);
  if (!adresse) return;
  adresse.maj_le = new Date().toISOString();
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
    maj_le: null,
    created_at: new Date().toISOString(),
    ordre: champs.rue_id ? await prochainOrdre(champs.rue_id) : 0,
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

// État d'une maison au vu de ses 3 passages :
// - "validee" : au moins un passage réussi, OU les 3 passages sont des
//   absences (on a fait le tour, personne n'a jamais répondu).
// - "attente" : 1 ou 2 absences enregistrées, mais pas encore de passage
//   réussi ni les 3 passages épuisés.
// - "neutre" : aucun passage encore tenté.
export function statutValidationAdresse(adresse) {
  const passages = [adresse.passage_1, adresse.passage_2, adresse.passage_3];
  const nbPasse = passages.filter((p) => p === "passe").length;
  const nbAbsent = passages.filter((p) => p === "absent").length;
  if (nbPasse >= 1 || nbAbsent === 3) return "validee";
  if (nbAbsent >= 1) return "attente";
  return "neutre";
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
