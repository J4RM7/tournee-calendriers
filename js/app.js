import {
  seedIfEmpty,
  getTournee,
  getCommunesByTournee,
  getCommune,
  addCommune,
  updateCommuneNom,
  getRuesByCommune,
  getRue,
  addRue,
  updateRueNom,
  getAdressesByRue,
  updateAdressePassage,
  updateAdresseInfos,
  addAdresse,
  addDon,
  toucherAdresse,
  getDonsByAdresse,
  trouverDonPourAnnee,
  statutValidationAdresse,
  DEMO_TOURNEE_ID,
  DEMO_AGENT_ID,
} from "./db.js";
import { getSupabaseClient } from "./supabaseClient.js";
import { exporterPDF, exporterExcel, reinitialiserCampagne } from "./export.js";
import {
  getSession,
  connecterAvecMotDePasse,
  deconnecter,
  ecouterChangementsAuth,
  getAgentPourUtilisateur,
} from "./auth.js";
import { synchroniserDonneesAgent } from "./sync.js";
import { listerTournees, listerAgents, creerTournee, affecterAgent, retirerAgent } from "./admin.js";

const PROCHAIN_ETAT_PASSAGE = { a_faire: "passe", passe: "absent", absent: "a_faire" };
const LABEL_PASSAGE = { a_faire: "à faire", passe: "passé", absent: "absent" };

const vueAccueilEl = document.getElementById("vue-accueil");
const accueilProgressionCompteurEl = document.getElementById("accueil-progression-compteur");
const accueilProgressionFillEl = document.getElementById("accueil-progression-fill");
const totalAnneeCouranteEl = document.getElementById("total-annee-courante");
const totalAnneePrecedenteEl = document.getElementById("total-annee-precedente");
const paveAccueilTourneeBtn = document.getElementById("pave-accueil-tournee");
const paveAccueilTourneeTitreEl = document.getElementById("pave-accueil-tournee-titre");
const paveAccueilCartoBtn = document.getElementById("pave-accueil-carto");
const paveAccueilComptaBtn = document.getElementById("pave-accueil-compta");
const paveAccueilFinCampagneBtn = document.getElementById("pave-accueil-fin-campagne");
const boutonsRetourAccueil = document.querySelectorAll("[data-retour-accueil]");

const vueCartographieEl = document.getElementById("vue-cartographie");
const vueComptaEl = document.getElementById("vue-compta");
const vueFinCampagneAgentEl = document.getElementById("vue-fin-campagne-agent");
const btnExportPdfAgent = document.getElementById("btn-export-pdf-agent");
const btnExportExcelAgent = document.getElementById("btn-export-excel-agent");
const exportAgentMessageEl = document.getElementById("export-agent-message");

const vueListeRuesEl = document.getElementById("vue-liste-rues");
const communesContainerEl = document.getElementById("communes-container");
const btnAjouterCommune = document.getElementById("btn-ajouter-commune");

const vueRueDetailEl = document.getElementById("vue-rue-detail");
const btnRetourRues = document.getElementById("btn-retour-rues");
const rueDetailNomEl = document.getElementById("rue-detail-nom");
const btnModifierRueDetail = document.getElementById("btn-modifier-rue-detail");
const rueDetailCompteurEl = document.getElementById("rue-detail-compteur");
const rueDetailProgressEl = document.getElementById("rue-detail-progress");
const rueDetailListeEl = document.getElementById("rue-detail-liste");
const btnAjouterAdresse = document.getElementById("btn-ajouter-adresse");

const statutConnexionEl = document.getElementById("statut-connexion");
const appEl = document.getElementById("app");
const agentBadgeEl = document.getElementById("agent-badge");
const btnDeconnexion = document.getElementById("btn-deconnexion");
const btnDeconnexionAccueil = document.getElementById("btn-deconnexion-accueil");
const tourneeInfoEl = document.getElementById("tournee-info");

const ecranConnexionEl = document.getElementById("ecran-connexion");
const formConnexion = document.getElementById("form-connexion");
const connexionEmailInput = document.getElementById("connexion-email");
const connexionMotDePasseInput = document.getElementById("connexion-mot-de-passe");
const connexionMessageEl = document.getElementById("connexion-message");
const btnModeDemo = document.getElementById("btn-mode-demo");

const ecranAdminEl = document.getElementById("ecran-admin");
const formNouvelleTournee = document.getElementById("form-nouvelle-tournee");
const adminNumeroInput = document.getElementById("admin-numero");
const adminCommuneInput = document.getElementById("admin-commune");
const adminRueInput = document.getElementById("admin-rue");
const adminMessageEl = document.getElementById("admin-message");
const adminListeTourneesEl = document.getElementById("admin-liste-tournees");
const btnExportPdf = document.getElementById("btn-export-pdf");
const btnExportExcel = document.getElementById("btn-export-excel");
const btnReinitialiser = document.getElementById("btn-reinitialiser");
const exportMessageEl = document.getElementById("export-message");

const dialogDon = document.getElementById("dialog-don");
const formDon = document.getElementById("form-don");
const donAdresseLabel = document.getElementById("don-adresse-label");
const donAnnulerBtn = document.getElementById("don-annuler");
const donChoixDonneBtn = document.getElementById("don-choix-donne");
const donChoixRefuseBtn = document.getElementById("don-choix-refuse");
const donChampsMontantEl = document.getElementById("don-champs-montant");
const pavesMontantEl = document.getElementById("pavés-montant");
const paveMontantAutreBtn = document.getElementById("pave-montant-autre");
const donMontantAutreInput = document.getElementById("don-montant-autre");
const paveEspecesBtn = document.getElementById("pave-especes");
const paveChequeBtn = document.getElementById("pave-cheque");
const paveRecuBtn = document.getElementById("pave-recu");

const dialogAdresse = document.getElementById("dialog-adresse");
const formAdresse = document.getElementById("form-adresse");
const adresseNumeroInput = document.getElementById("adresse-numero");
const adresseNomFamilleInput = document.getElementById("adresse-nom-famille");
const adresseObservationInput = document.getElementById("adresse-observation");
const adresseAnnulerBtn = document.getElementById("adresse-annuler");

const dialogRenommerRue = document.getElementById("dialog-renommer-rue");
const formRenommerRue = document.getElementById("form-renommer-rue");
const renommerRueNomInput = document.getElementById("renommer-rue-nom");
const renommerRueAnnulerBtn = document.getElementById("renommer-rue-annuler");

const dialogNouvelleAdresse = document.getElementById("dialog-nouvelle-adresse");
const formNouvelleAdresse = document.getElementById("form-nouvelle-adresse");
const nouvelleAdresseNumeroInput = document.getElementById("nouvelle-adresse-numero");
const nouvelleAdresseNomFamilleInput = document.getElementById("nouvelle-adresse-nom-famille");
const nouvelleAdresseAnnulerBtn = document.getElementById("nouvelle-adresse-annuler");

const dialogNouvelleCommune = document.getElementById("dialog-nouvelle-commune");
const formNouvelleCommune = document.getElementById("form-nouvelle-commune");
const nouvelleCommuneNomInput = document.getElementById("nouvelle-commune-nom");
const nouvelleCommuneAnnulerBtn = document.getElementById("nouvelle-commune-annuler");

const dialogRenommerCommune = document.getElementById("dialog-renommer-commune");
const formRenommerCommune = document.getElementById("form-renommer-commune");
const renommerCommuneNomInput = document.getElementById("renommer-commune-nom");
const renommerCommuneAnnulerBtn = document.getElementById("renommer-commune-annuler");

const dialogNouvelleRue = document.getElementById("dialog-nouvelle-rue");
const formNouvelleRue = document.getElementById("form-nouvelle-rue");
const nouvelleRueNomInput = document.getElementById("nouvelle-rue-nom");
const nouvelleRueAnnulerBtn = document.getElementById("nouvelle-rue-annuler");

let adresseCourante = null;
let adresseEnEdition = null;
let communeEnEdition = null;
let communePourNouvelleRue = null;
let refuseSelectionne = false;
let recuEnvoyeSelectionne = false;
let montantSelectionne = null;
let modePaiementSelectionne = null;

// Agent actif pour cette session d'écran : soit l'agent réel connecté via
// Supabase Auth, soit l'agent démo (mode hors-ligne sans compte).
let agentActuel = null;
let tourneeActuelleId = null;
let rueActuelleId = null;
let modeDemo = false;
let vueActuelle = "connexion"; // "connexion" | "app" | "admin"
let vueAppInterne = "accueil"; // "accueil" | "liste-rues" | "rue-detail" | "cartographie" | "compta" | "fin-campagne"
let agentsDisponibles = [];

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

// --- Écrans : connexion / app / admin --------------------------------
function afficherEcranConnexion() {
  vueActuelle = "connexion";
  ecranConnexionEl.hidden = false;
  appEl.hidden = true;
  ecranAdminEl.hidden = true;
  agentBadgeEl.hidden = true;
  btnDeconnexion.hidden = true;
  btnDeconnexionAccueil.hidden = true;
  tourneeInfoEl.hidden = true;
}

// Les agents normaux atterrissent sur la page d'accueil (4 pavés) ; le
// compte de l'amicale (est_admin) atterrit directement sur son tableau de
// bord — voir démarrer()/connecterAvecSession().
function afficherApp() {
  vueActuelle = "app";
  ecranConnexionEl.hidden = true;
  ecranAdminEl.hidden = true;
  appEl.hidden = false;

  if (modeDemo) {
    agentBadgeEl.textContent = "Mode démo";
    agentBadgeEl.hidden = false;
    btnDeconnexion.hidden = true;
    btnDeconnexionAccueil.hidden = true;
  } else {
    agentBadgeEl.textContent = `${agentActuel.prenom} ${agentActuel.nom}`;
    agentBadgeEl.hidden = false;
    btnDeconnexion.hidden = false;
    btnDeconnexionAccueil.hidden = false;
  }

  afficherAccueil();
}

async function afficherAdmin() {
  vueActuelle = "admin";
  ecranConnexionEl.hidden = true;
  appEl.hidden = true;
  ecranAdminEl.hidden = false;
  agentBadgeEl.textContent = `${agentActuel.prenom} ${agentActuel.nom}`.trim() || "Amicale";
  agentBadgeEl.hidden = false;
  btnDeconnexion.hidden = false;
  await chargerEtAfficherAdmin();
}

function afficherMessageConnexion(texte, type) {
  connexionMessageEl.textContent = texte;
  connexionMessageEl.className = "connexion-message" + (type ? " " + type : "");
}

// --- Connexion (lien magique) ---------------------------------------------
async function connecterAvecSession(session) {
  const supabase = await getSupabaseClient();
  const agent = await getAgentPourUtilisateur(session.user.id);

  if (!agent) {
    afficherMessageConnexion(
      "Connecté, mais aucune fiche agent n'est encore associée à cet email. Contactez le responsable de la tournée.",
      "erreur"
    );
    afficherEcranConnexion();
    return;
  }

  agentActuel = agent;
  modeDemo = false;

  // Le compte de l'amicale (est_admin) n'a pas de tournée personnelle à
  // synchroniser : il va droit au tableau de bord.
  if (agent.est_admin) {
    afficherAdmin();
    return;
  }

  try {
    const tournees = await synchroniserDonneesAgent(supabase, agent);
    tourneeActuelleId = tournees[0]?.id ?? tourneeActuelleId;
  } catch (err) {
    console.warn("[sync] échec de la synchronisation initiale :", err.message);
  }

  afficherApp();
}

function activerModeDemo() {
  agentActuel = { id: DEMO_AGENT_ID };
  modeDemo = true;
  tourneeActuelleId = DEMO_TOURNEE_ID;
  afficherApp();
}

formConnexion.addEventListener("submit", async (event) => {
  event.preventDefault();
  const email = connexionEmailInput.value.trim();
  const motDePasse = connexionMotDePasseInput.value;
  if (!email || !motDePasse) return;

  afficherMessageConnexion("Connexion en cours…");
  try {
    await connecterAvecMotDePasse(email, motDePasse);
    // La suite (connecterAvecSession) est déclenchée par
    // ecouterChangementsAuth() dans demarrer().
  } catch (err) {
    afficherMessageConnexion("Échec de la connexion : " + err.message, "erreur");
  }
});

btnModeDemo.addEventListener("click", activerModeDemo);

async function handleDeconnexion() {
  await deconnecter();
  agentActuel = null;
  tourneeActuelleId = null;
  modeDemo = false;
  afficherEcranConnexion();
}

btnDeconnexion.addEventListener("click", handleDeconnexion);
btnDeconnexionAccueil.addEventListener("click", handleDeconnexion);

// --- Écran "liste des rues" (regroupées par commune) -----------------
// Seules les maisons validées comptent dans les courbes de progression
// (voir statutValidationAdresse dans db.js pour la définition de "validée").
function estAdresseValidee(adresse) {
  return statutValidationAdresse(adresse) === "validee";
}

// Statut d'une rue entière, pour la couleur du pavé sur l'écran "toutes les
// rues" : vierge (rien tenté), en cours (au moins un passage, pas encore
// tout validé), validée (toutes les maisons validées).
function statutRue(adresses) {
  if (adresses.length === 0) return "vierge";
  if (adresses.every(estAdresseValidee)) return "valide";
  const auMoinsUnPassage = adresses.some((a) =>
    [a.passage_1, a.passage_2, a.passage_3].some((p) => p !== "a_faire")
  );
  return auMoinsUnPassage ? "en-cours" : "vierge";
}

function formaterMontant(montant) {
  return Number(montant).toFixed(2).replace(".", ",") + " €";
}

function formaterCompteur(traitees, total) {
  return `${traitees} / ${total} maison${total > 1 ? "s" : ""}`;
}

function formaterHorodatage(dateIso) {
  return new Date(dateIso).toLocaleString("fr-FR", {
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

// --- Navigation entre les vues internes de #app --------------------------
function masquerToutesLesVuesApp() {
  vueAccueilEl.hidden = true;
  vueListeRuesEl.hidden = true;
  vueRueDetailEl.hidden = true;
  vueCartographieEl.hidden = true;
  vueComptaEl.hidden = true;
  vueFinCampagneAgentEl.hidden = true;
}

async function calculerTotauxTournee(tourneeId) {
  const anneeCourante = new Date().getFullYear();
  let totalCourant = 0;
  let totalPrecedent = 0;

  const communes = await getCommunesByTournee(tourneeId);
  for (const commune of communes) {
    const rues = await getRuesByCommune(commune.id);
    for (const rue of rues) {
      const adresses = await getAdressesByRue(rue.id);
      for (const adresse of adresses) {
        const dons = await getDonsByAdresse(adresse.id);
        const donCourant = trouverDonPourAnnee(dons, anneeCourante);
        const donPrecedent = trouverDonPourAnnee(dons, anneeCourante - 1);
        if (donCourant && !donCourant.refuse) totalCourant += donCourant.montant;
        if (donPrecedent && !donPrecedent.refuse) totalPrecedent += donPrecedent.montant;
      }
    }
  }

  return { totalCourant, totalPrecedent };
}

async function calculerProgressionTournee(tourneeId) {
  let total = 0;
  let traitees = 0;

  const communes = await getCommunesByTournee(tourneeId);
  for (const commune of communes) {
    const rues = await getRuesByCommune(commune.id);
    for (const rue of rues) {
      const adresses = await getAdressesByRue(rue.id);
      total += adresses.length;
      traitees += adresses.filter(estAdresseValidee).length;
    }
  }

  return { total, traitees };
}

// --- Page d'accueil (4 pavés) --------------------------------------------
async function afficherAccueil() {
  vueAppInterne = "accueil";
  masquerToutesLesVuesApp();
  vueAccueilEl.hidden = false;

  const tournee = tourneeActuelleId ? await getTournee(tourneeActuelleId) : null;
  if (tournee) {
    const noms = (tournee.agents || [])
      .map((a) => `${a.prenom} ${a.nom}`.trim())
      .filter(Boolean);
    tourneeInfoEl.textContent = `Tournée n°${tournee.numero}` + (noms.length ? ` — ${noms.join(", ")}` : "");
    tourneeInfoEl.hidden = false;
    paveAccueilTourneeTitreEl.textContent = `Tournée n°${tournee.numero}`;
  } else {
    tourneeInfoEl.hidden = true;
    paveAccueilTourneeTitreEl.textContent = "Tournée";
  }

  const progression = tourneeActuelleId
    ? await calculerProgressionTournee(tourneeActuelleId)
    : { total: 0, traitees: 0 };
  accueilProgressionCompteurEl.textContent = formaterCompteur(progression.traitees, progression.total);
  accueilProgressionFillEl.style.width = progression.total
    ? `${Math.round((progression.traitees / progression.total) * 100)}%`
    : "0%";

  const totaux = tourneeActuelleId
    ? await calculerTotauxTournee(tourneeActuelleId)
    : { totalCourant: 0, totalPrecedent: 0 };
  totalAnneeCouranteEl.textContent = formaterMontant(totaux.totalCourant);
  totalAnneePrecedenteEl.textContent = formaterMontant(totaux.totalPrecedent);
}

paveAccueilTourneeBtn.addEventListener("click", () => afficherListeRues());
paveAccueilCartoBtn.addEventListener("click", () => {
  vueAppInterne = "cartographie";
  masquerToutesLesVuesApp();
  vueCartographieEl.hidden = false;
});
paveAccueilComptaBtn.addEventListener("click", () => {
  vueAppInterne = "compta";
  masquerToutesLesVuesApp();
  vueComptaEl.hidden = false;
});
paveAccueilFinCampagneBtn.addEventListener("click", () => {
  vueAppInterne = "fin-campagne";
  masquerToutesLesVuesApp();
  vueFinCampagneAgentEl.hidden = false;
});
boutonsRetourAccueil.forEach((btn) => btn.addEventListener("click", () => afficherAccueil()));

// Export personnel (agent) : mêmes fonctions que côté admin, mais la RLS
// Supabase limite automatiquement le résultat à la tournée de l'agent.
function afficherMessageExportAgent(texte, type) {
  exportAgentMessageEl.textContent = texte;
  exportAgentMessageEl.className = "connexion-message" + (type ? " " + type : "");
}

btnExportPdfAgent.addEventListener("click", async () => {
  const supabase = await getSupabaseClient();
  if (!supabase) return;
  afficherMessageExportAgent("Génération du PDF…");
  try {
    await exporterPDF(supabase);
    afficherMessageExportAgent("PDF téléchargé.", "succes");
  } catch (err) {
    afficherMessageExportAgent("Erreur : " + err.message, "erreur");
  }
});

btnExportExcelAgent.addEventListener("click", async () => {
  const supabase = await getSupabaseClient();
  if (!supabase) return;
  afficherMessageExportAgent("Génération du fichier Excel…");
  try {
    await exporterExcel(supabase);
    afficherMessageExportAgent("Fichier Excel téléchargé.", "succes");
  } catch (err) {
    afficherMessageExportAgent("Erreur : " + err.message, "erreur");
  }
});

async function afficherListeRues() {
  vueAppInterne = "liste-rues";
  masquerToutesLesVuesApp();
  vueListeRuesEl.hidden = false;

  const tournee = await getTournee(tourneeActuelleId);
  if (tournee) {
    const noms = (tournee.agents || [])
      .map((a) => `${a.prenom} ${a.nom}`.trim())
      .filter(Boolean);
    tourneeInfoEl.textContent = `Tournée n°${tournee.numero}` + (noms.length ? ` — ${noms.join(", ")}` : "");
    tourneeInfoEl.hidden = false;
  } else {
    tourneeInfoEl.hidden = true;
  }

  communesContainerEl.innerHTML = "";

  if (!tourneeActuelleId) {
    communesContainerEl.innerHTML = `<p class="rue-vide">Aucune tournée assignée pour l'instant</p>`;
    btnAjouterCommune.hidden = true;
    return;
  }
  btnAjouterCommune.hidden = false;

  const communes = await getCommunesByTournee(tourneeActuelleId);
  communes.sort((a, b) => a.nom.localeCompare(b.nom, "fr"));

  if (communes.length === 0) {
    communesContainerEl.innerHTML = `<p class="rue-vide">Aucune commune pour l'instant — ajoutez-en une pour commencer.</p>`;
    return;
  }

  for (const commune of communes) {
    communesContainerEl.appendChild(await creerBlocCommune(commune));
  }
}

async function creerBlocCommune(commune) {
  const bloc = document.createElement("div");
  bloc.className = "commune-bloc";

  const titre = document.createElement("div");
  titre.className = "commune-titre";
  titre.innerHTML = `<h3>${commune.nom}</h3><button type="button" class="btn-modifier" title="Renommer la commune">✎</button>`;
  titre.querySelector(".btn-modifier").addEventListener("click", () => ouvrirDialogRenommerCommune(commune));

  const rues = await getRuesByCommune(commune.id);
  rues.sort((a, b) => a.nom.localeCompare(b.nom, "fr"));

  const liste = document.createElement("ul");
  liste.className = "rues-liste";
  for (const rue of rues) {
    const adresses = await getAdressesByRue(rue.id);
    const total = adresses.length;
    const traitees = adresses.filter(estAdresseValidee).length;

    const li = document.createElement("li");
    li.className = `rue-carte statut-${statutRue(adresses)}`;
    li.innerHTML = `
      <span class="rue-carte-nom">${rue.nom}</span>
      <span class="rue-carte-stats">${formaterCompteur(traitees, total)}</span>
    `;
    li.addEventListener("click", () => afficherRueDetail(rue.id));
    liste.appendChild(li);
  }

  const btnAjouterRue = document.createElement("button");
  btnAjouterRue.type = "button";
  btnAjouterRue.className = "secondaire";
  btnAjouterRue.textContent = "+ Ajouter une rue";
  btnAjouterRue.addEventListener("click", () => ouvrirDialogNouvelleRue(commune));

  bloc.append(titre, liste, btnAjouterRue);
  return bloc;
}

btnRetourRues.addEventListener("click", () => afficherListeRues());

// --- Écran "détail d'une rue" (une seule rue affichée à la fois) -----
async function afficherRueDetail(rueId) {
  vueAppInterne = "rue-detail";
  rueActuelleId = rueId;
  masquerToutesLesVuesApp();
  vueRueDetailEl.hidden = false;
  await rendreRueDetail();
}

async function rendreRueDetail() {
  const rue = await getRue(rueActuelleId);
  const commune = rue ? await getCommune(rue.commune_id) : null;
  rueDetailNomEl.textContent = rue ? `${rue.nom}, ${commune?.nom ?? ""}` : "";

  const adresses = await getAdressesByRue(rueActuelleId);
  adresses.sort((a, b) => new Date(a.created_at) - new Date(b.created_at));

  const total = adresses.length;
  const traitees = adresses.filter(estAdresseValidee).length;
  rueDetailCompteurEl.textContent = formaterCompteur(traitees, total);
  rueDetailProgressEl.style.width = total ? `${Math.round((traitees / total) * 100)}%` : "0%";

  rueDetailListeEl.innerHTML = "";
  for (const adresse of adresses) {
    const dons = await getDonsByAdresse(adresse.id);
    rueDetailListeEl.appendChild(creerLigneAdresse(adresse, dons, rue, commune));
  }
}

function creerLigneAdresse(adresse, dons, rue, commune) {
  const li = document.createElement("li");
  li.className = `adresse-item statut-${statutValidationAdresse(adresse)}`;

  const info = document.createElement("div");
  info.className = "adresse-info";
  const prefixeNom = adresse.nom_famille
    ? `<span class="adresse-nom">${adresse.nom_famille}</span> — `
    : "";
  const adresseComplete = `${adresse.numero} ${rue?.nom ?? ""}, ${commune?.nom ?? ""}`;
  info.innerHTML = `
    <div class="adresse-ligne">
      <span>${prefixeNom}${adresseComplete}</span>
      <button type="button" class="btn-modifier" title="Modifier l'adresse">✎</button>
    </div>
    ${adresse.notes ? `<div class="adresse-notes">${adresse.notes}</div>` : ""}
    ${adresse.maj_le ? `<div class="adresse-maj">Modifié le ${formaterHorodatage(adresse.maj_le)}</div>` : ""}
  `;
  info.querySelector(".btn-modifier").addEventListener("click", () => ouvrirDialogAdresse(adresse));

  const passagesEl = document.createElement("div");
  passagesEl.className = "passages";
  for (const n of [1, 2, 3]) {
    const etat = adresse[`passage_${n}`];
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = `passage-cell etat-${etat}`;
    btn.textContent = String(n);
    btn.title = `Passage ${n} : ${LABEL_PASSAGE[etat]} (cliquer pour changer)`;
    btn.addEventListener("click", async () => {
      const nouvelEtat = PROCHAIN_ETAT_PASSAGE[etat];
      const adresseMaj = await updateAdressePassage(adresse.id, n, nouvelEtat);
      pousserVersSupabase("adresses", {
        id: adresse.id,
        rue_id: adresse.rue_id,
        [`passage_${n}`]: nouvelEtat,
        maj_le: adresseMaj.maj_le,
      });
      rendreRueDetail();
    });
    passagesEl.appendChild(btn);
  }

  const anneeCourante = new Date().getFullYear();
  const donActif = trouverDonPourAnnee(dons, anneeCourante);
  const donBtn = document.createElement("button");
  donBtn.type = "button";
  if (donActif?.refuse) {
    donBtn.className = "don-cell don-refuse";
    donBtn.textContent = "Refusé";
  } else if (donActif) {
    donBtn.className = "don-cell don-donne";
    donBtn.textContent = formaterMontant(donActif.montant);
  } else {
    donBtn.className = "don-cell";
    donBtn.textContent = "Don";
  }
  donBtn.addEventListener("click", () => ouvrirDialogDon(adresse));

  const ligneDon = document.createElement("div");
  ligneDon.className = "don-ligne";
  ligneDon.appendChild(donBtn);

  // Beaucoup de donateurs redemandent "j'ai donné combien l'an dernier ?" :
  // ce pavé n'est qu'une info (pas cliquable), affiché sur toutes les lignes
  // — y compris "aucun don" quand il n'y a rien à montrer, pour que
  // l'absence d'info soit aussi visible d'un coup d'œil.
  const donAnneePrecedente = trouverDonPourAnnee(dons, anneeCourante - 1);
  const anneePrecEl = document.createElement("span");
  anneePrecEl.className = "pave-annee-precedente";
  if (donAnneePrecedente) {
    anneePrecEl.textContent = donAnneePrecedente.refuse
      ? `${anneeCourante - 1} : refusé`
      : `${anneeCourante - 1} : ${formaterMontant(donAnneePrecedente.montant)}`;
  } else {
    anneePrecEl.textContent = `${anneeCourante - 1} : aucun don`;
  }
  ligneDon.appendChild(anneePrecEl);

  const droite = document.createElement("div");
  droite.className = "adresse-droite";
  droite.append(passagesEl, ligneDon);

  li.append(info, droite);
  return li;
}

// --- Formulaire de modification d'une adresse -----------------------------
function ouvrirDialogAdresse(adresse) {
  adresseEnEdition = adresse;
  adresseNumeroInput.value = adresse.numero;
  adresseNomFamilleInput.value = adresse.nom_famille || "";
  adresseObservationInput.value = adresse.notes || "";
  dialogAdresse.showModal();
}

adresseAnnulerBtn.addEventListener("click", () => dialogAdresse.close());

formAdresse.addEventListener("submit", async () => {
  if (!adresseEnEdition) return;

  const champs = {
    numero: adresseNumeroInput.value.trim(),
    nom_famille: adresseNomFamilleInput.value.trim() || null,
    notes: adresseObservationInput.value.trim() || null,
  };

  await updateAdresseInfos(adresseEnEdition.id, champs);
  pousserVersSupabase("adresses", {
    id: adresseEnEdition.id,
    rue_id: adresseEnEdition.rue_id,
    ...champs,
  });

  adresseEnEdition = null;
  rendreRueDetail();
});

// --- Ajouter une adresse dans la rue affichée ------------------------
btnAjouterAdresse.addEventListener("click", () => {
  formNouvelleAdresse.reset();
  dialogNouvelleAdresse.showModal();
});

nouvelleAdresseAnnulerBtn.addEventListener("click", () => dialogNouvelleAdresse.close());

formNouvelleAdresse.addEventListener("submit", async () => {
  if (!rueActuelleId) return;

  const champs = {
    rue_id: rueActuelleId,
    numero: nouvelleAdresseNumeroInput.value.trim(),
    nom_famille: nouvelleAdresseNomFamilleInput.value.trim() || null,
  };

  const adresse = await addAdresse(champs);
  pousserVersSupabase("adresses", adresse);

  rendreRueDetail();
});

// --- Renommer la rue affichée ------------------------------------------
function ouvrirDialogRenommerRue() {
  renommerRueNomInput.value = rueDetailNomEl.textContent.split(",")[0] || "";
  dialogRenommerRue.showModal();
}

btnModifierRueDetail.addEventListener("click", ouvrirDialogRenommerRue);
renommerRueAnnulerBtn.addEventListener("click", () => dialogRenommerRue.close());

formRenommerRue.addEventListener("submit", async () => {
  if (!rueActuelleId) return;

  const nouveauNom = renommerRueNomInput.value.trim();
  await updateRueNom(rueActuelleId, nouveauNom);
  pousserVersSupabase("rues", { id: rueActuelleId, nom: nouveauNom });

  rendreRueDetail();
});

// --- Ajouter une commune -------------------------------------------------
btnAjouterCommune.addEventListener("click", () => {
  formNouvelleCommune.reset();
  dialogNouvelleCommune.showModal();
});

nouvelleCommuneAnnulerBtn.addEventListener("click", () => dialogNouvelleCommune.close());

formNouvelleCommune.addEventListener("submit", async () => {
  if (!tourneeActuelleId) return;

  const commune = await addCommune({
    tournee_id: tourneeActuelleId,
    nom: nouvelleCommuneNomInput.value.trim(),
  });
  pousserVersSupabase("communes", commune);

  afficherListeRues();
});

// --- Renommer une commune -------------------------------------------------
function ouvrirDialogRenommerCommune(commune) {
  communeEnEdition = commune;
  renommerCommuneNomInput.value = commune.nom;
  dialogRenommerCommune.showModal();
}

renommerCommuneAnnulerBtn.addEventListener("click", () => dialogRenommerCommune.close());

formRenommerCommune.addEventListener("submit", async () => {
  if (!communeEnEdition) return;

  const nouveauNom = renommerCommuneNomInput.value.trim();
  await updateCommuneNom(communeEnEdition.id, nouveauNom);
  pousserVersSupabase("communes", { id: communeEnEdition.id, nom: nouveauNom });

  communeEnEdition = null;
  afficherListeRues();
});

// --- Ajouter une rue dans une commune ------------------------------------
function ouvrirDialogNouvelleRue(commune) {
  communePourNouvelleRue = commune;
  nouvelleRueNomInput.value = "";
  dialogNouvelleRue.showModal();
}

nouvelleRueAnnulerBtn.addEventListener("click", () => dialogNouvelleRue.close());

formNouvelleRue.addEventListener("submit", async () => {
  if (!communePourNouvelleRue) return;

  const rue = await addRue({
    commune_id: communePourNouvelleRue.id,
    nom: nouvelleRueNomInput.value.trim(),
  });
  pousserVersSupabase("rues", rue);

  communePourNouvelleRue = null;
  // On va directement sur la nouvelle rue : c'est là que l'agent voudra
  // ajouter les premières adresses.
  afficherRueDetail(rue.id);
});

// --- Formulaire don -------------------------------------------------------
function definirChoixDon(refuse) {
  refuseSelectionne = refuse;
  donChoixDonneBtn.classList.toggle("actif", !refuse);
  donChoixRefuseBtn.classList.toggle("actif", refuse);
  donChampsMontantEl.hidden = refuse;
  paveRecuBtn.hidden = refuse;
}

donChoixDonneBtn.addEventListener("click", () => definirChoixDon(false));
donChoixRefuseBtn.addEventListener("click", () => definirChoixDon(true));

// Pavés de montant : soit un montant prédéfini, soit "Autre" qui révèle un
// champ libre. Un seul pavé actif (vert) à la fois.
function reinitialiserMontant() {
  montantSelectionne = null;
  donMontantAutreInput.hidden = true;
  donMontantAutreInput.value = "";
  pavesMontantEl.querySelectorAll(".pave").forEach((btn) => btn.classList.remove("actif"));
}

pavesMontantEl.querySelectorAll(".pave[data-montant]").forEach((btn) => {
  btn.addEventListener("click", () => {
    const valeur = Number(btn.dataset.montant);
    if (montantSelectionne === valeur) {
      reinitialiserMontant();
      return;
    }
    montantSelectionne = valeur;
    donMontantAutreInput.hidden = true;
    pavesMontantEl.querySelectorAll(".pave").forEach((b) => b.classList.remove("actif"));
    btn.classList.add("actif");
  });
});

paveMontantAutreBtn.addEventListener("click", () => {
  if (paveMontantAutreBtn.classList.contains("actif")) {
    reinitialiserMontant();
    return;
  }
  montantSelectionne = null;
  donMontantAutreInput.hidden = false;
  donMontantAutreInput.focus();
  pavesMontantEl.querySelectorAll(".pave").forEach((b) => b.classList.remove("actif"));
  paveMontantAutreBtn.classList.add("actif");
});

// Pavés de mode de paiement : Espèces / Chèque, un seul actif (vert) à la fois.
function reinitialiserModePaiement() {
  modePaiementSelectionne = null;
  paveEspecesBtn.classList.remove("actif");
  paveChequeBtn.classList.remove("actif");
}

function selectionnerModePaiement(mode) {
  modePaiementSelectionne = mode;
  paveEspecesBtn.classList.toggle("actif", mode === "especes");
  paveChequeBtn.classList.toggle("actif", mode === "cheque");
}

paveEspecesBtn.addEventListener("click", () => {
  if (modePaiementSelectionne === "especes") {
    reinitialiserModePaiement();
    return;
  }
  selectionnerModePaiement("especes");
});
paveChequeBtn.addEventListener("click", () => {
  if (modePaiementSelectionne === "cheque") {
    reinitialiserModePaiement();
    return;
  }
  selectionnerModePaiement("cheque");
});

// Pavé "Envoyer le reçu" : pour l'instant, marque juste le don comme
// "reçu envoyé" (colonne dons.recu_envoye), sans envoyer de vrai email.
// L'envoi automatique (PDF Cerfa 11580 + Resend depuis l'adresse de
// l'amicale) arrivera une fois ces deux éléments prêts côté association.
function reinitialiserRecu() {
  recuEnvoyeSelectionne = false;
  paveRecuBtn.classList.remove("actif");
}

paveRecuBtn.addEventListener("click", () => {
  recuEnvoyeSelectionne = !recuEnvoyeSelectionne;
  paveRecuBtn.classList.toggle("actif", recuEnvoyeSelectionne);
});

function ouvrirDialogDon(adresse) {
  adresseCourante = adresse;
  donAdresseLabel.textContent = `Don - n°${adresse.numero}`;
  formDon.reset();
  // Le donateur est par défaut la famille de l'adresse ; reste modifiable
  // (ex. si c'est un voisin ou un proche qui ouvre la porte).
  document.getElementById("don-nom").value = adresse.nom_famille || "";
  definirChoixDon(false);
  reinitialiserMontant();
  reinitialiserModePaiement();
  reinitialiserRecu();
  dialogDon.showModal();
}

donAnnulerBtn.addEventListener("click", () => dialogDon.close());

formDon.addEventListener("submit", async () => {
  if (!adresseCourante) return;

  const montantFinal = refuseSelectionne
    ? 0
    : montantSelectionne !== null
      ? montantSelectionne
      : parseFloat(donMontantAutreInput.value || "0");

  const don = await addDon({
    adresse_id: adresseCourante.id,
    agent_id: agentActuel.id,
    refuse: refuseSelectionne,
    montant: montantFinal,
    mode_paiement: refuseSelectionne ? null : modePaiementSelectionne,
    nom_donateur: document.getElementById("don-nom").value.trim() || null,
    email_donateur: document.getElementById("don-email").value.trim() || null,
    recu_envoye: refuseSelectionne ? false : recuEnvoyeSelectionne,
  });
  pousserVersSupabase("dons", don);

  const adresseMaj = await toucherAdresse(adresseCourante.id);
  pousserVersSupabase("adresses", { id: adresseMaj.id, rue_id: adresseMaj.rue_id, maj_le: adresseMaj.maj_le });

  adresseCourante = null;
  rendreRueDetail();
});

// --- Synchronisation "au mieux" vers Supabase ------------------------------
// Écriture best-effort : si Supabase est configuré, joignable, et qu'on est
// connecté avec un vrai compte (pas le mode démo), on y recopie aussi la
// donnée. En cas d'échec (hors-ligne, pas configuré, mode démo...), on se
// contente de logguer : IndexedDB reste la donnée de référence pour l'écran.
// Une vraie file d'attente de synchronisation (pour rattraper les écritures
// faites hors-ligne) sera ajoutée à une étape suivante.
async function pousserVersSupabase(table, valeurs) {
  if (modeDemo) return;

  const supabase = await getSupabaseClient();
  if (!supabase) return;

  const { error } = await supabase.from(table).upsert(valeurs);
  if (error) {
    console.warn(`[supabase] échec de synchronisation (${table}) :`, error.message);
  }
}

// --- Administration (amicale) -----------------------------------------
async function chargerEtAfficherAdmin() {
  const supabase = await getSupabaseClient();
  if (!supabase) {
    adminListeTourneesEl.innerHTML = "<li>Supabase n'est pas configuré.</li>";
    return;
  }

  try {
    const [tournees, agents] = await Promise.all([listerTournees(supabase), listerAgents(supabase)]);
    agentsDisponibles = agents;
    rendreListeTournees(tournees, supabase);
  } catch (err) {
    adminListeTourneesEl.innerHTML = `<li>Erreur : ${err.message}</li>`;
  }
}

function rendreListeTournees(tournees, supabase) {
  adminListeTourneesEl.innerHTML = "";

  for (const t of tournees) {
    const li = document.createElement("li");
    li.className = "admin-tournee-item";

    const agentsHtml = t.agents
      .map(
        (a) =>
          `<span class="agent-chip">${a.prenom} ${a.nom} <button type="button" data-retirer="${a.id}">×</button></span>`
      )
      .join("");

    const pourcentage = t.nombreAdresses ? Math.round((t.nombreTraitees / t.nombreAdresses) * 100) : 0;

    li.innerHTML = `
      <div class="admin-tournee-titre">Tournée n°${t.numero} — ${t.nom_rue}, ${t.nom_commune}</div>
      <div class="admin-tournee-meta">${t.nombreAdresses} adresse(s)</div>
      <div class="admin-tournee-progression">
        ${t.nombreTraitees} / ${t.nombreAdresses} maisons traitées
        <div class="progress-bar"><div class="progress-fill" style="width: ${pourcentage}%"></div></div>
      </div>
      <div class="admin-tournee-agents">${agentsHtml || "<em>Aucun agent affecté</em>"}</div>
    `;

    const dejaAffectes = new Set(t.agents.map((a) => a.id));
    const optionsDisponibles = agentsDisponibles.filter((a) => !dejaAffectes.has(a.id));

    if (optionsDisponibles.length > 0) {
      const formAssign = document.createElement("div");
      formAssign.className = "admin-assign-form";

      const select = document.createElement("select");
      select.innerHTML = optionsDisponibles
        .map((a) => `<option value="${a.id}">${a.prenom} ${a.nom}</option>`)
        .join("");

      const btnAssign = document.createElement("button");
      btnAssign.type = "button";
      btnAssign.className = "secondaire";
      btnAssign.textContent = "Affecter";
      btnAssign.addEventListener("click", async () => {
        try {
          await affecterAgent(supabase, t.id, select.value);
          chargerEtAfficherAdmin();
        } catch (err) {
          adminMessageEl.textContent = "Erreur : " + err.message;
          adminMessageEl.className = "connexion-message erreur";
        }
      });

      formAssign.append(select, btnAssign);
      li.appendChild(formAssign);
    }

    li.querySelectorAll("[data-retirer]").forEach((btn) => {
      btn.addEventListener("click", async () => {
        try {
          await retirerAgent(supabase, t.id, btn.dataset.retirer);
          chargerEtAfficherAdmin();
        } catch (err) {
          adminMessageEl.textContent = "Erreur : " + err.message;
          adminMessageEl.className = "connexion-message erreur";
        }
      });
    });

    adminListeTourneesEl.appendChild(li);
  }
}

formNouvelleTournee.addEventListener("submit", async (event) => {
  event.preventDefault();
  const supabase = await getSupabaseClient();
  if (!supabase) return;

  try {
    await creerTournee(supabase, {
      numero: parseInt(adminNumeroInput.value, 10),
      nom_commune: adminCommuneInput.value.trim(),
      nom_rue: adminRueInput.value.trim(),
    });
    formNouvelleTournee.reset();
    adminMessageEl.textContent = "Tournée créée.";
    adminMessageEl.className = "connexion-message succes";
    chargerEtAfficherAdmin();
  } catch (err) {
    adminMessageEl.textContent = "Erreur : " + err.message;
    adminMessageEl.className = "connexion-message erreur";
  }
});

// --- Fin de campagne : export + réinitialisation ------------------------
function afficherMessageExport(texte, type) {
  exportMessageEl.textContent = texte;
  exportMessageEl.className = "connexion-message" + (type ? " " + type : "");
}

btnExportPdf.addEventListener("click", async () => {
  const supabase = await getSupabaseClient();
  if (!supabase) return;

  afficherMessageExport("Génération du PDF…");
  try {
    await exporterPDF(supabase);
    afficherMessageExport("PDF téléchargé.", "succes");
  } catch (err) {
    afficherMessageExport("Erreur : " + err.message, "erreur");
  }
});

btnExportExcel.addEventListener("click", async () => {
  const supabase = await getSupabaseClient();
  if (!supabase) return;

  afficherMessageExport("Génération du fichier Excel…");
  try {
    await exporterExcel(supabase);
    afficherMessageExport("Fichier Excel téléchargé.", "succes");
  } catch (err) {
    afficherMessageExport("Erreur : " + err.message, "erreur");
  }
});

btnReinitialiser.addEventListener("click", async () => {
  const confirme = window.confirm(
    "Avez-vous bien exporté les données ?\n\nCette action remet à zéro les cases de passage (1, 2, 3) de TOUTES les adresses, pour toutes les tournées. Les communes, rues, adresses et dons ne sont pas supprimés. Continuer ?"
  );
  if (!confirme) return;

  const supabase = await getSupabaseClient();
  if (!supabase) return;

  try {
    await reinitialiserCampagne(supabase);
    afficherMessageExport("Campagne réinitialisée pour la nouvelle année.", "succes");
  } catch (err) {
    afficherMessageExport("Erreur : " + err.message, "erreur");
  }
});

// --- Démarrage ---------------------------------------------------------
async function demarrer() {
  await seedIfEmpty();

  const session = await getSession();
  if (session) {
    await connecterAvecSession(session);
  } else {
    afficherEcranConnexion();
  }

  ecouterChangementsAuth((session) => {
    if (session) {
      connecterAvecSession(session);
    } else if (!modeDemo) {
      afficherEcranConnexion();
    }
  });
}

demarrer();
