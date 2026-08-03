import {
  seedIfEmpty,
  getSecteur,
  getAdressesBySecteur,
  updateAdresseStatut,
  addDon,
  DEMO_SECTEUR_ID,
  DEMO_AGENT_ID,
} from "./db.js";
import { getSupabaseClient } from "./supabaseClient.js";

const STATUT_LABELS = {
  a_faire: "À faire",
  fait: "Fait",
  absent_repasse: "Absent - repasse",
};

const secteurNomEl = document.getElementById("secteur-nom");
const listeEl = document.getElementById("liste-adresses");
const statutConnexionEl = document.getElementById("statut-connexion");

const dialogDon = document.getElementById("dialog-don");
const formDon = document.getElementById("form-don");
const donAdresseLabel = document.getElementById("don-adresse-label");
const donAnnulerBtn = document.getElementById("don-annuler");

let adresseCourante = null;

// --- Service worker ---------------------------------------------------
if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("/sw.js").catch((err) => {
      console.error("Échec d'enregistrement du service worker :", err);
    });
  });
}

// --- Indicateur en ligne / hors-ligne ----------------------------------
function majStatutConnexion() {
  const enLigne = navigator.onLine;
  statutConnexionEl.textContent = enLigne ? "En ligne" : "Hors ligne";
  statutConnexionEl.className = "badge " + (enLigne ? "online" : "offline");
}
window.addEventListener("online", majStatutConnexion);
window.addEventListener("offline", majStatutConnexion);
majStatutConnexion();

// --- Affichage de la liste ----------------------------------------------
async function afficherAdresses() {
  const secteur = await getSecteur(DEMO_SECTEUR_ID);
  secteurNomEl.textContent = secteur
    ? `${secteur.nom_rue}, ${secteur.nom_commune}`
    : "Secteur inconnu";

  const adresses = await getAdressesBySecteur(DEMO_SECTEUR_ID);
  adresses.sort((a, b) => Number(a.numero) - Number(b.numero));

  listeEl.innerHTML = "";
  for (const adresse of adresses) {
    listeEl.appendChild(creerLigneAdresse(adresse));
  }
}

function creerLigneAdresse(adresse) {
  const li = document.createElement("li");
  li.className = "adresse-item statut-" + adresse.statut;

  const info = document.createElement("div");
  info.className = "adresse-info";
  info.innerHTML = `
    <div class="adresse-ligne">${adresse.numero} ${adresse.rue}</div>
    <span class="statut-pill ${adresse.statut}">${STATUT_LABELS[adresse.statut]}</span>
    ${adresse.notes ? `<div class="adresse-notes">${adresse.notes}</div>` : ""}
  `;

  const actions = document.createElement("div");
  actions.className = "adresse-actions";

  const btnDon = document.createElement("button");
  btnDon.textContent = "Don";
  btnDon.className = "primary";
  btnDon.addEventListener("click", () => ouvrirDialogDon(adresse));

  const btnFait = document.createElement("button");
  btnFait.textContent = adresse.statut === "fait" ? "✓ Fait" : "Marquer fait";
  btnFait.className = "secondaire";
  btnFait.addEventListener("click", async () => {
    const nouveauStatut = adresse.statut === "fait" ? "a_faire" : "fait";
    await updateAdresseStatut(adresse.id, nouveauStatut);
    pousserVersSupabase("adresses", {
      id: adresse.id,
      secteur_id: adresse.secteur_id,
      numero: adresse.numero,
      rue: adresse.rue,
      commune: adresse.commune,
      statut: nouveauStatut,
      notes: adresse.notes,
    });
    afficherAdresses();
  });

  actions.append(btnDon, btnFait);
  li.append(info, actions);
  return li;
}

// --- Formulaire don -------------------------------------------------------
function ouvrirDialogDon(adresse) {
  adresseCourante = adresse;
  donAdresseLabel.textContent = `Don - ${adresse.numero} ${adresse.rue}`;
  formDon.reset();
  dialogDon.showModal();
}

donAnnulerBtn.addEventListener("click", () => dialogDon.close());

formDon.addEventListener("submit", async () => {
  if (!adresseCourante) return;

  const montant = parseFloat(document.getElementById("don-montant").value || "0");
  const mode_paiement = document.getElementById("don-mode").value;
  const nom_donateur = document.getElementById("don-nom").value.trim();
  const email_donateur = document.getElementById("don-email").value.trim();

  const don = await addDon({
    adresse_id: adresseCourante.id,
    agent_id: DEMO_AGENT_ID,
    montant,
    mode_paiement,
    nom_donateur: nom_donateur || null,
    email_donateur: email_donateur || null,
  });
  pousserVersSupabase("dons", don);

  // Un don enregistré signifie que le passage est terminé pour cette adresse.
  await updateAdresseStatut(adresseCourante.id, "fait");

  adresseCourante = null;
  afficherAdresses();
});

// --- Synchronisation "au mieux" vers Supabase ------------------------------
// Écriture best-effort : si Supabase est configuré et joignable, on y
// recopie aussi la donnée. En cas d'échec (hors-ligne, pas configuré...),
// on se contente de logguer : IndexedDB reste la donnée de référence pour
// l'écran. Une vraie file d'attente de synchronisation (pour rattraper les
// écritures faites hors-ligne) sera ajoutée à une étape suivante.
async function pousserVersSupabase(table, valeurs) {
  const supabase = await getSupabaseClient();
  if (!supabase) return;

  const { error } = await supabase.from(table).upsert(valeurs);
  if (error) {
    console.warn(`[supabase] échec de synchronisation (${table}) :`, error.message);
  }
}

// --- Démarrage ---------------------------------------------------------
async function demarrer() {
  await seedIfEmpty();
  await afficherAdresses();
}

demarrer();
