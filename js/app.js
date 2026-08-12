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
  deleteAdresse,
  supprimerDon,
  addAdresse,
  enregistrerDon,
  toucherAdresse,
  getDonsByAdresse,
  trouverDonPourAnnee,
  statutValidationAdresse,
  auMoinsUnPassageReussi,
  donManquantMalgrePassage,
  estAdresseValidee,
  reordonnerAdresses,
  DEMO_TOURNEE_ID,
  DEMO_AGENT_ID,
} from "./db.js";
import { getSupabaseClient } from "./supabaseClient.js";
import { exporterPDF, exporterExcel } from "./export.js";
import {
  getSession,
  connecterAvecMotDePasse,
  deconnecter,
  ecouterChangementsAuth,
  getAgentPourUtilisateur,
} from "./auth.js";
import { synchroniserDonneesAgent } from "./sync.js";

const PROCHAIN_ETAT_PASSAGE = { a_faire: "passe", passe: "absent", absent: "a_faire" };
const LABEL_PASSAGE = { a_faire: "à faire", passe: "passé", absent: "absent" };

const vueAccueilEl = document.getElementById("vue-accueil");
const paveAccueilTourneeBtn = document.getElementById("pave-accueil-tournee");
const paveAccueilTourneeTitreEl = document.getElementById("pave-accueil-tournee-titre");
const paveAccueilStatsBtn = document.getElementById("pave-accueil-stats");
const paveAccueilRechercheBtn = document.getElementById("pave-accueil-recherche");
const paveAccueilCartoBtn = document.getElementById("pave-accueil-carto");
const paveAccueilComptaBtn = document.getElementById("pave-accueil-compta");
const paveAccueilFinCampagneBtn = document.getElementById("pave-accueil-fin-campagne");
const boutonsRetourAccueil = document.querySelectorAll("[data-retour-accueil]");

const vueCartographieEl = document.getElementById("vue-cartographie");
const vueComptaEl = document.getElementById("vue-compta");
const comptaNbEspecesEl = document.getElementById("compta-nb-especes");
const comptaTotalEspecesEl = document.getElementById("compta-total-especes");
const comptaNbChequesEl = document.getElementById("compta-nb-cheques");
const comptaTotalChequesEl = document.getElementById("compta-total-cheques");
const vueFinCampagneAgentEl = document.getElementById("vue-fin-campagne-agent");
const btnExportPdfAgent = document.getElementById("btn-export-pdf-agent");
const btnExportExcelAgent = document.getElementById("btn-export-excel-agent");
const exportAgentMessageEl = document.getElementById("export-agent-message");

const vueStatistiquesEl = document.getElementById("vue-statistiques");
const statTotalCourantEl = document.getElementById("stat-total-courant");
const statTotalPrecedentEl = document.getElementById("stat-total-precedent");
const statVariationEl = document.getElementById("stat-variation");
const statProgressionPourcentageEl = document.getElementById("stat-progression-pourcentage");
const statProgressionFillEl = document.getElementById("stat-progression-fill");
const statMaisonsRestantesEl = document.getElementById("stat-maisons-restantes");
const statNbDonateursEl = document.getElementById("stat-nb-donateurs");
const statNbRefusEl = document.getElementById("stat-nb-refus");

const vueRechercheEl = document.getElementById("vue-recherche");
const rechercheInputEl = document.getElementById("recherche-input");
const rechercheResultatsEl = document.getElementById("recherche-resultats");
const rechercheVideEl = document.getElementById("recherche-vide");

const vueListeRuesEl = document.getElementById("vue-liste-rues");
const ongletsTourneeEl = document.getElementById("onglets-tournee");
const ongletToutesEl = document.getElementById("onglet-toutes");
const ongletRepassesEl = document.getElementById("onglet-repasses");
const ongletAFaireEl = document.getElementById("onglet-a-faire");
const ongletVideEl = document.getElementById("onglet-vide");
const communesContainerEl = document.getElementById("communes-container");
const btnAjouterCommune = document.getElementById("btn-ajouter-commune");

const vueRueDetailEl = document.getElementById("vue-rue-detail");
const btnRetourRues = document.getElementById("btn-retour-rues");
const rueDetailNomEl = document.getElementById("rue-detail-nom");
const btnModifierRueDetail = document.getElementById("btn-modifier-rue-detail");
const rueDetailCompteurEl = document.getElementById("rue-detail-compteur");
const rueDetailProgressEl = document.getElementById("rue-detail-progress");
const btnReorganiser = document.getElementById("btn-reorganiser");
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

const dialogDon = document.getElementById("dialog-don");
const formDon = document.getElementById("form-don");
const donAdresseLabel = document.getElementById("don-adresse-label");
const donMessageEl = document.getElementById("don-message");
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
const donReinitialiserBtn = document.getElementById("don-reinitialiser");

const dialogAdresse = document.getElementById("dialog-adresse");
const formAdresse = document.getElementById("form-adresse");
const adresseNumeroInput = document.getElementById("adresse-numero");
const adresseNomFamilleInput = document.getElementById("adresse-nom-famille");
const adresseObservationInput = document.getElementById("adresse-observation");
const adresseAnnulerBtn = document.getElementById("adresse-annuler");
const adresseSupprimerBtn = document.getElementById("adresse-supprimer");

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
let refuseSelectionne = null; // null = pas encore choisi, false = a donné, true = a refusé
let donExistantCourant = null; // le don de l'année en cours pour l'adresse ouverte, s'il existe
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
let vueAppInterne = "accueil"; // "accueil" | "liste-rues" | "rue-detail" | "statistiques" | "recherche" | "cartographie" | "compta" | "fin-campagne"
let ongletTourneeActuel = "toutes"; // "toutes" | "repasses" | "a-faire"
let modeReorganisation = false;

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

function afficherAdmin() {
  vueActuelle = "admin";
  ecranConnexionEl.hidden = true;
  appEl.hidden = true;
  ecranAdminEl.hidden = false;
  agentBadgeEl.textContent = `${agentActuel.prenom} ${agentActuel.nom}`.trim() || "Amicale";
  agentBadgeEl.hidden = false;
  btnDeconnexion.hidden = false;
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
// Statut d'une rue entière, pour la couleur du pavé sur l'écran "toutes les
// rues" : vierge (rien tenté), en cours (au moins un passage, pas encore
// tout validé), validée (toutes les maisons validées, don compris — voir
// estAdresseValidee dans db.js). donsParAdresse : Map(adresse.id -> dons[]).
function statutRue(adresses, donsParAdresse) {
  if (adresses.length === 0) return "vierge";
  if (adresses.every((a) => estAdresseValidee(a, donsParAdresse.get(a.id) || []))) return "valide";
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
  vueStatistiquesEl.hidden = true;
  vueRechercheEl.hidden = true;
  vueCartographieEl.hidden = true;
  vueComptaEl.hidden = true;
  vueFinCampagneAgentEl.hidden = true;
}

// Rafraîchit la vue actuellement affichée après une action (passage, don,
// modification d'adresse) — appelé depuis n'importe quel écran qui affiche
// des lignes d'adresse (détail de rue, onglets Repasses/A faire, recherche),
// pour ne pas avoir à coder le rafraîchissement séparément à chaque endroit.
async function rafraichirVueApp() {
  if (vueAppInterne === "rue-detail") {
    await rendreRueDetail();
  } else if (vueAppInterne === "liste-rues") {
    await rendreOngletActuel();
  } else if (vueAppInterne === "recherche") {
    await rechercherAdresses(rechercheInputEl.value);
  }
}

// Toutes les adresses d'une tournée, avec leur rue et leur commune —
// utilisé par les statistiques, la recherche et les onglets Repasses/A faire.
async function obtenirAdressesTournee(tourneeId) {
  const resultat = [];
  const communes = await getCommunesByTournee(tourneeId);
  for (const commune of communes) {
    const rues = await getRuesByCommune(commune.id);
    for (const rue of rues) {
      const adresses = await getAdressesByRue(rue.id);
      for (const adresse of adresses) {
        resultat.push({ adresse, rue, commune });
      }
    }
  }
  return resultat;
}

// Un seul passage sur toutes les adresses de la tournée pour calculer tous
// les indicateurs de l'écran Statistiques (évite de boucler 3 fois sur les
// mêmes communes/rues/adresses).
async function calculerStatistiquesTournee(tourneeId) {
  const anneeCourante = new Date().getFullYear();
  const items = tourneeId ? await obtenirAdressesTournee(tourneeId) : [];

  let totalCourant = 0;
  let totalPrecedent = 0;
  let nbDonateurs = 0;
  let nbRefus = 0;
  let maisonsValidees = 0;

  for (const { adresse } of items) {
    const dons = await getDonsByAdresse(adresse.id);
    if (estAdresseValidee(adresse, dons)) maisonsValidees++;

    const donCourant = trouverDonPourAnnee(dons, anneeCourante);
    const donPrecedent = trouverDonPourAnnee(dons, anneeCourante - 1);

    if (donCourant) {
      if (donCourant.refuse) nbRefus++;
      else {
        totalCourant += donCourant.montant;
        nbDonateurs++;
      }
    }
    if (donPrecedent && !donPrecedent.refuse) totalPrecedent += donPrecedent.montant;
  }

  return { totalCourant, totalPrecedent, nbDonateurs, nbRefus, totalMaisons: items.length, maisonsValidees };
}

// --- Page d'accueil (pavés) -----------------------------------------------
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
}

paveAccueilTourneeBtn.addEventListener("click", () => afficherListeRues("toutes"));
paveAccueilCartoBtn.addEventListener("click", () => {
  vueAppInterne = "cartographie";
  masquerToutesLesVuesApp();
  vueCartographieEl.hidden = false;
});
paveAccueilComptaBtn.addEventListener("click", () => afficherCompta());
paveAccueilFinCampagneBtn.addEventListener("click", () => {
  vueAppInterne = "fin-campagne";
  masquerToutesLesVuesApp();
  vueFinCampagneAgentEl.hidden = false;
});
paveAccueilStatsBtn.addEventListener("click", () => afficherStatistiques());
paveAccueilRechercheBtn.addEventListener("click", () => afficherRecherche());
boutonsRetourAccueil.forEach((btn) => btn.addEventListener("click", () => afficherAccueil()));

// --- Écran Statistiques ---------------------------------------------------
async function afficherStatistiques() {
  vueAppInterne = "statistiques";
  masquerToutesLesVuesApp();
  vueStatistiquesEl.hidden = false;

  const stats = tourneeActuelleId
    ? await calculerStatistiquesTournee(tourneeActuelleId)
    : { totalCourant: 0, totalPrecedent: 0, nbDonateurs: 0, nbRefus: 0, totalMaisons: 0, maisonsValidees: 0 };

  statTotalCourantEl.textContent = formaterMontant(stats.totalCourant);
  statTotalPrecedentEl.textContent = formaterMontant(stats.totalPrecedent);

  if (stats.totalPrecedent > 0) {
    const variation = ((stats.totalCourant - stats.totalPrecedent) / stats.totalPrecedent) * 100;
    const signe = variation >= 0 ? "+" : "";
    statVariationEl.textContent = `${signe}${Math.round(variation)} % vs l'an dernier`;
    statVariationEl.className = "stat-variation " + (variation >= 0 ? "positif" : "negatif");
  } else if (stats.totalCourant > 0) {
    statVariationEl.textContent = "Aucun don l'an dernier";
    statVariationEl.className = "stat-variation";
  } else {
    statVariationEl.textContent = "";
    statVariationEl.className = "stat-variation";
  }

  const pourcentage = stats.totalMaisons ? Math.round((stats.maisonsValidees / stats.totalMaisons) * 100) : 0;
  statProgressionPourcentageEl.textContent = `${pourcentage} %`;
  statProgressionFillEl.style.width = `${pourcentage}%`;
  const restantes = stats.totalMaisons - stats.maisonsValidees;
  statMaisonsRestantesEl.textContent =
    restantes > 0
      ? `${restantes} maison${restantes > 1 ? "s" : ""} restante${restantes > 1 ? "s" : ""} à valider`
      : stats.totalMaisons > 0
        ? "Toutes les maisons sont validées"
        : "Aucune maison pour l'instant";

  statNbDonateursEl.textContent = String(stats.nbDonateurs);
  statNbRefusEl.textContent = String(stats.nbRefus);
}

// --- Écran Compta (comptage espèces / chèques) ----------------------------
async function calculerComptaTournee(tourneeId) {
  const anneeCourante = new Date().getFullYear();
  const items = tourneeId ? await obtenirAdressesTournee(tourneeId) : [];

  let nbEspeces = 0;
  let totalEspeces = 0;
  let nbCheques = 0;
  let totalCheques = 0;

  for (const { adresse } of items) {
    const dons = await getDonsByAdresse(adresse.id);
    const don = trouverDonPourAnnee(dons, anneeCourante);
    if (!don || don.refuse) continue;

    if (don.mode_paiement === "especes") {
      nbEspeces++;
      totalEspeces += don.montant;
    } else if (don.mode_paiement === "cheque") {
      nbCheques++;
      totalCheques += don.montant;
    }
  }

  return { nbEspeces, totalEspeces, nbCheques, totalCheques };
}

async function afficherCompta() {
  vueAppInterne = "compta";
  masquerToutesLesVuesApp();
  vueComptaEl.hidden = false;

  const compta = tourneeActuelleId
    ? await calculerComptaTournee(tourneeActuelleId)
    : { nbEspeces: 0, totalEspeces: 0, nbCheques: 0, totalCheques: 0 };

  comptaNbEspecesEl.textContent = String(compta.nbEspeces);
  comptaTotalEspecesEl.textContent = formaterMontant(compta.totalEspeces);
  comptaNbChequesEl.textContent = String(compta.nbCheques);
  comptaTotalChequesEl.textContent = formaterMontant(compta.totalCheques);
}

// --- Écran Recherche -------------------------------------------------------
function normaliserTexte(texte) {
  return (texte || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}

async function rechercherAdresses(terme) {
  rechercheResultatsEl.innerHTML = "";
  const termeNormalise = normaliserTexte(terme.trim());
  if (!termeNormalise) {
    rechercheVideEl.hidden = true;
    return;
  }

  const items = tourneeActuelleId ? await obtenirAdressesTournee(tourneeActuelleId) : [];
  const resultats = items.filter(({ adresse }) => normaliserTexte(adresse.nom_famille).includes(termeNormalise));

  rechercheVideEl.hidden = resultats.length > 0;
  for (const { adresse, rue, commune } of resultats) {
    const dons = await getDonsByAdresse(adresse.id);
    const li = creerLigneAdresse(adresse, dons, rue, commune);
    // On peut traiter la maison directement depuis le résultat (cases de
    // passage, don) — mais cliquer ailleurs sur la ligne amène sur sa rue,
    // pour voir les maisons voisines ou la renommer si besoin.
    li.classList.add("adresse-cliquable");
    li.addEventListener("click", (event) => {
      if (event.target.closest("button")) return;
      allerVersAdresse(rue.id, adresse.id);
    });
    rechercheResultatsEl.appendChild(li);
  }
}

async function afficherRecherche() {
  vueAppInterne = "recherche";
  masquerToutesLesVuesApp();
  vueRechercheEl.hidden = false;
  rechercheInputEl.value = "";
  rechercheResultatsEl.innerHTML = "";
  rechercheVideEl.hidden = true;
  rechercheInputEl.focus();
}

let rechercheDebounce = null;
rechercheInputEl.addEventListener("input", () => {
  clearTimeout(rechercheDebounce);
  rechercheDebounce = setTimeout(() => rechercherAdresses(rechercheInputEl.value), 150);
});

// Va directement sur la maison recherchée : on affiche sa rue, puis on fait
// défiler jusqu'à sa ligne et on la met en surbrillance un instant.
async function allerVersAdresse(rueId, adresseId) {
  await afficherRueDetail(rueId);
  const ligne = rueDetailListeEl.querySelector(`[data-id="${adresseId}"]`);
  if (!ligne) return;
  ligne.scrollIntoView({ behavior: "smooth", block: "center" });
  ligne.classList.add("adresse-surlignee");
  setTimeout(() => ligne.classList.remove("adresse-surlignee"), 2000);
}

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

async function afficherListeRues(onglet) {
  vueAppInterne = "liste-rues";
  ongletTourneeActuel = onglet || ongletTourneeActuel || "toutes";
  masquerToutesLesVuesApp();
  vueListeRuesEl.hidden = false;

  const tournee = tourneeActuelleId ? await getTournee(tourneeActuelleId) : null;
  if (tournee) {
    const noms = (tournee.agents || [])
      .map((a) => `${a.prenom} ${a.nom}`.trim())
      .filter(Boolean);
    tourneeInfoEl.textContent = `Tournée n°${tournee.numero}` + (noms.length ? ` — ${noms.join(", ")}` : "");
    tourneeInfoEl.hidden = false;
  } else {
    tourneeInfoEl.hidden = true;
  }

  ongletsTourneeEl.querySelectorAll(".onglet").forEach((btn) => {
    btn.classList.toggle("actif", btn.dataset.onglet === ongletTourneeActuel);
  });
  ongletToutesEl.hidden = ongletTourneeActuel !== "toutes";
  ongletRepassesEl.hidden = ongletTourneeActuel !== "repasses";
  ongletAFaireEl.hidden = ongletTourneeActuel !== "a-faire";
  ongletVideEl.hidden = true;

  await rendreOngletActuel();
}

ongletsTourneeEl.querySelectorAll(".onglet").forEach((btn) => {
  btn.addEventListener("click", () => afficherListeRues(btn.dataset.onglet));
});

async function rendreOngletActuel() {
  if (ongletTourneeActuel === "repasses") {
    // Une maison reste dans "Repasses" tant qu'elle n'est pas validée
    // (passage en attente) ou que le passage est bon mais le don pas encore
    // saisi. Une maison déjà validée (passage + don) n'a plus rien à faire
    // ici, même si l'agent n'a pas encore répondu "terminée" au moment de
    // l'enregistrement du don.
    await rendreOngletFiltre(
      ongletRepassesEl,
      (a, dons) => statutValidationAdresse(a) === "attente" || donManquantMalgrePassage(a, dons)
    );
  } else if (ongletTourneeActuel === "a-faire") {
    // Une maison reste dans "A faire" tant que le don n'est pas rempli,
    // même après avoir coché un passage : sinon la ligne disparaît de cet
    // onglet avant d'avoir eu le temps de saisir le don.
    await rendreOngletFiltre(
      ongletAFaireEl,
      (a, dons) => statutValidationAdresse(a) === "neutre" || donManquantMalgrePassage(a, dons)
    );
  } else {
    await rendreOngletToutes();
  }
}

async function rendreOngletToutes() {
  communesContainerEl.innerHTML = "";

  if (!tourneeActuelleId) {
    communesContainerEl.innerHTML = `<p class="rue-vide">Aucune tournée assignée pour l'instant</p>`;
    btnAjouterCommune.hidden = true;
    return;
  }
  btnAjouterCommune.hidden = false;

  const communes = await getCommunesByTournee(tourneeActuelleId);
  communes.sort((a, b) => (a.ordre ?? 0) - (b.ordre ?? 0));

  if (communes.length === 0) {
    communesContainerEl.innerHTML = `<p class="rue-vide">Aucune commune pour l'instant — ajoutez-en une pour commencer.</p>`;
    return;
  }

  for (const commune of communes) {
    communesContainerEl.appendChild(await creerBlocCommune(commune));
  }
}

// Listing plat (toutes rues confondues) pour les onglets "Repasses" et
// "A faire" : trié par commune puis rue (ordre de saisie), et à l'intérieur
// d'une même rue, par ordre de saisie/rang manuel — comme dans le détail
// d'une rue.
async function rendreOngletFiltre(container, predicate) {
  container.innerHTML = "";
  ongletVideEl.hidden = true;
  if (!tourneeActuelleId) return;

  const items = await obtenirAdressesTournee(tourneeActuelleId);
  const avecDons = [];
  for (const item of items) {
    avecDons.push({ ...item, dons: await getDonsByAdresse(item.adresse.id) });
  }

  const filtres = avecDons.filter(({ adresse, dons }) => predicate(adresse, dons));
  filtres.sort((a, b) => {
    const communeCmp = (a.commune.ordre ?? 0) - (b.commune.ordre ?? 0);
    if (communeCmp !== 0) return communeCmp;
    const rueCmp = (a.rue.ordre ?? 0) - (b.rue.ordre ?? 0);
    if (rueCmp !== 0) return rueCmp;
    return (a.adresse.ordre ?? 0) - (b.adresse.ordre ?? 0);
  });

  if (filtres.length === 0) {
    ongletVideEl.textContent = "Rien ici pour l'instant.";
    ongletVideEl.hidden = false;
    return;
  }

  for (const { adresse, rue, commune, dons } of filtres) {
    container.appendChild(creerLigneAdresse(adresse, dons, rue, commune));
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
  rues.sort((a, b) => (a.ordre ?? 0) - (b.ordre ?? 0));

  const liste = document.createElement("ul");
  liste.className = "rues-liste";
  for (const rue of rues) {
    const adresses = await getAdressesByRue(rue.id);
    const total = adresses.length;
    const donsParAdresse = new Map();
    for (const adresse of adresses) donsParAdresse.set(adresse.id, await getDonsByAdresse(adresse.id));
    const traitees = adresses.filter((a) => estAdresseValidee(a, donsParAdresse.get(a.id))).length;

    const li = document.createElement("li");
    li.className = `rue-carte statut-${statutRue(adresses, donsParAdresse)}`;
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
  modeReorganisation = false;
  btnReorganiser.textContent = "⠿ Réorganiser";
  btnReorganiser.classList.remove("actif");
  masquerToutesLesVuesApp();
  vueRueDetailEl.hidden = false;
  await rendreRueDetail();
}

btnReorganiser.addEventListener("click", () => {
  modeReorganisation = !modeReorganisation;
  btnReorganiser.classList.toggle("actif", modeReorganisation);
  btnReorganiser.textContent = modeReorganisation ? "✓ Terminer" : "⠿ Réorganiser";
  btnAjouterAdresse.hidden = modeReorganisation;
  rendreRueDetail();
});

async function rendreRueDetail() {
  const rue = await getRue(rueActuelleId);
  const commune = rue ? await getCommune(rue.commune_id) : null;
  rueDetailNomEl.textContent = rue ? `${rue.nom}, ${commune?.nom ?? ""}` : "";

  const adresses = await getAdressesByRue(rueActuelleId);
  adresses.sort((a, b) => (a.ordre ?? 0) - (b.ordre ?? 0));

  const donsParAdresse = new Map();
  for (const adresse of adresses) donsParAdresse.set(adresse.id, await getDonsByAdresse(adresse.id));

  const total = adresses.length;
  const traitees = adresses.filter((a) => estAdresseValidee(a, donsParAdresse.get(a.id))).length;
  rueDetailCompteurEl.textContent = formaterCompteur(traitees, total);
  rueDetailProgressEl.style.width = total ? `${Math.round((traitees / total) * 100)}%` : "0%";
  btnReorganiser.hidden = total < 2;

  rueDetailListeEl.innerHTML = "";
  if (modeReorganisation) {
    for (const adresse of adresses) {
      rueDetailListeEl.appendChild(creerLigneReorganisation(adresse, rue));
    }
    return;
  }
  for (const adresse of adresses) {
    rueDetailListeEl.appendChild(creerLigneAdresse(adresse, donsParAdresse.get(adresse.id), rue, commune));
  }
}

function creerLigneAdresse(adresse, dons, rue, commune) {
  const li = document.createElement("li");
  // Le fond de la carte affine le statut passage-only : une maison "validée"
  // dont le don n'est pas encore saisi garde une couleur à part (orange),
  // pour ne pas avoir l'air terminée alors qu'il reste à repasser.
  const statutBase = statutValidationAdresse(adresse);
  const statutAffiche =
    statutBase === "validee" && donManquantMalgrePassage(adresse, dons) ? "don-manquant" : statutBase;
  li.className = `adresse-item statut-${statutAffiche}`;
  li.dataset.id = adresse.id;

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
      rafraichirVueApp();
    });
    passagesEl.appendChild(btn);
  }

  const anneeCourante = new Date().getFullYear();
  const donActif = trouverDonPourAnnee(dons, anneeCourante);
  // Contact établi (au moins un passage vert) : sans ça, rien à enregistrer
  // côté don. Un don déjà existant reste toujours modifiable/réinitialisable,
  // même si les passages ont depuis été remis à "à faire".
  const auMoinsUnPasse = auMoinsUnPassageReussi(adresse);
  const donBtn = document.createElement("button");
  donBtn.type = "button";
  if (donActif?.refuse) {
    donBtn.className = "don-cell don-refuse";
    donBtn.textContent = "Refusé";
  } else if (donActif) {
    donBtn.className = "don-cell don-donne";
    donBtn.textContent = formaterMontant(donActif.montant);
  } else if (auMoinsUnPasse) {
    // Contact réussi mais rien de saisi encore : on le met en évidence tout
    // de suite pour que l'agent pense à remplir le don pendant qu'il est
    // encore sur le pas de la porte.
    donBtn.className = "don-cell a-remplir";
    donBtn.textContent = "Don";
  } else {
    donBtn.className = "don-cell";
    donBtn.textContent = "Don";
  }
  donBtn.addEventListener("click", () => {
    if (!donActif && !auMoinsUnPasse) {
      window.alert("Marque d'abord un passage réussi (case verte) avant de saisir un don.");
      return;
    }
    ouvrirDialogDon(adresse, dons);
  });

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

// --- Réorganisation des maisons (glisser-déposer façon playlist) ---------
// Ligne simplifiée affichée uniquement en mode réorganisation : juste le nom
// et une poignée à glisser, pour ne pas interférer avec les cases de
// passage/don pendant le glissement.
function creerLigneReorganisation(adresse, rue) {
  const li = document.createElement("li");
  li.className = "adresse-item adresse-reorg";
  li.dataset.id = adresse.id;

  const prefixeNom = adresse.nom_famille ? `${adresse.nom_famille} — ` : "";
  const label = document.createElement("span");
  label.className = "adresse-reorg-label";
  label.textContent = `${prefixeNom}${adresse.numero} ${rue?.nom ?? ""}`;

  const poignee = document.createElement("span");
  poignee.className = "drag-handle";
  poignee.textContent = "⠿";

  li.append(label, poignee);
  activerGlisserDeposer(li, poignee);
  return li;
}

// Glisser-déposer tactile/souris via l'API Pointer Events : la ligne ne
// bouge pas dans le DOM pendant le glissement (elle flotte au-dessus grâce à
// `transform`), le vrai déplacement n'a lieu qu'au relâchement — ça évite les
// sauts visuels qu'un réordonnancement en continu provoquerait.
function activerGlisserDeposer(item, poignee) {
  poignee.addEventListener("pointerdown", (event) => {
    event.preventDefault();
    const liste = item.parentElement;
    const items = () => [...liste.querySelectorAll(".adresse-reorg")];
    const autres = items()
      .filter((el) => el !== item)
      .map((el) => ({ el, rect: el.getBoundingClientRect() }));

    poignee.setPointerCapture(event.pointerId);
    const startY = event.clientY;
    const startRect = item.getBoundingClientRect();
    item.classList.add("en-glisse");

    function onMove(e) {
      const deltaY = e.clientY - startY;
      item.style.transform = `translateY(${deltaY}px)`;
    }

    async function onUp(e) {
      poignee.releasePointerCapture(event.pointerId);
      poignee.removeEventListener("pointermove", onMove);
      poignee.removeEventListener("pointerup", onUp);
      item.classList.remove("en-glisse");
      item.style.transform = "";

      const deltaY = e.clientY - startY;
      const itemMid = startRect.top + startRect.height / 2 + deltaY;
      const cible = autres.find(({ rect }) => itemMid < rect.top + rect.height / 2);
      if (cible) liste.insertBefore(item, cible.el);
      else liste.appendChild(item);

      const idsOrdonnes = items().map((el) => el.dataset.id);
      const adressesMaj = await reordonnerAdresses(idsOrdonnes);
      for (const a of adressesMaj) {
        pousserVersSupabase("adresses", { id: a.id, rue_id: a.rue_id, ordre: a.ordre });
      }
    }

    poignee.addEventListener("pointermove", onMove);
    poignee.addEventListener("pointerup", onUp);
  });
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
  rafraichirVueApp();
});

adresseSupprimerBtn.addEventListener("click", async () => {
  if (!adresseEnEdition) return;

  const confirme = window.confirm(
    `Supprimer définitivement l'adresse "${adresseEnEdition.numero}" et l'historique de ses dons ? Cette action est irréversible.`
  );
  if (!confirme) return;

  const id = adresseEnEdition.id;
  await deleteAdresse(id);
  supprimerDeSupabase("adresses", id);

  adresseEnEdition = null;
  dialogAdresse.close();
  rafraichirVueApp();
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
// refuse : null (rien choisi), false (a donné) ou true (a refusé). Les deux
// pavés sont désélectionnables — un second clic sur le pavé actif revient à
// "rien choisi", pour ne pas présélectionner "A donné" par défaut.
function definirChoixDon(refuse) {
  refuseSelectionne = refuse;
  donChoixDonneBtn.classList.toggle("actif", refuse === false);
  donChoixRefuseBtn.classList.toggle("actif", refuse === true);
  donChampsMontantEl.hidden = refuse !== false;
  paveRecuBtn.hidden = refuse !== false;
}

donChoixDonneBtn.addEventListener("click", () => {
  definirChoixDon(refuseSelectionne === false ? null : false);
});
donChoixRefuseBtn.addEventListener("click", () => {
  definirChoixDon(refuseSelectionne === true ? null : true);
});

// Pavés de montant : soit un montant prédéfini, soit "Autre" qui révèle un
// champ libre. Un seul pavé actif (vert) à la fois.
function reinitialiserMontant() {
  montantSelectionne = null;
  donMontantAutreInput.hidden = true;
  donMontantAutreInput.value = "";
  pavesMontantEl.querySelectorAll(".pave").forEach((btn) => btn.classList.remove("actif"));
}

function selectionnerMontant(valeur) {
  montantSelectionne = valeur;
  donMontantAutreInput.hidden = true;
  pavesMontantEl.querySelectorAll(".pave").forEach((b) => b.classList.remove("actif"));
  const btn = pavesMontantEl.querySelector(`[data-montant="${valeur}"]`);
  btn?.classList.add("actif");
}

// Un montant qui ne correspond à aucun pavé prédéfini (ex. relu depuis un
// don déjà enregistré) : on affiche le champ libre pré-rempli.
function selectionnerMontantLibre(valeur) {
  montantSelectionne = null;
  donMontantAutreInput.hidden = false;
  donMontantAutreInput.value = valeur;
  pavesMontantEl.querySelectorAll(".pave").forEach((b) => b.classList.remove("actif"));
  paveMontantAutreBtn.classList.add("actif");
}

pavesMontantEl.querySelectorAll(".pave[data-montant]").forEach((btn) => {
  btn.addEventListener("click", () => {
    const valeur = Number(btn.dataset.montant);
    if (montantSelectionne === valeur) {
      reinitialiserMontant();
      return;
    }
    selectionnerMontant(valeur);
  });
});

paveMontantAutreBtn.addEventListener("click", () => {
  if (paveMontantAutreBtn.classList.contains("actif")) {
    reinitialiserMontant();
    return;
  }
  montantSelectionne = null;
  donMontantAutreInput.hidden = false;
  donMontantAutreInput.value = "";
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
paveRecuBtn.addEventListener("click", () => {
  recuEnvoyeSelectionne = !recuEnvoyeSelectionne;
  paveRecuBtn.classList.toggle("actif", recuEnvoyeSelectionne);
});

const MONTANTS_PREDEFINIS = [2, 5, 10, 15, 20];

// L'adresse email d'un donateur ne change pas d'une année sur l'autre : on
// reprend la plus récente connue (tous dons confondus) pour ne pas avoir à
// la retaper chaque année, même si aucun don n'est encore enregistré pour
// l'année en cours.
function dernierEmailConnu(dons) {
  const avecEmail = [...dons]
    .filter((d) => d.email_donateur)
    .sort((a, b) => new Date(b.date) - new Date(a.date));
  return avecEmail[0]?.email_donateur || null;
}

function ouvrirDialogDon(adresse, dons = []) {
  adresseCourante = adresse;
  donAdresseLabel.textContent = `Don - n°${adresse.numero}`;
  formDon.reset();
  donMessageEl.textContent = "";
  donMessageEl.className = "connexion-message";

  // Si un don existe déjà pour cette année (on rouvre le pavé pour le
  // vérifier ou le corriger), on réaffiche exactement ce qui a été
  // enregistré plutôt que de tout remettre à zéro.
  const donExistant = trouverDonPourAnnee(dons, new Date().getFullYear());
  donExistantCourant = donExistant;
  donReinitialiserBtn.hidden = !donExistant;

  definirChoixDon(donExistant ? donExistant.refuse : null);

  if (donExistant && !donExistant.refuse) {
    if (MONTANTS_PREDEFINIS.includes(donExistant.montant)) {
      selectionnerMontant(donExistant.montant);
    } else if (donExistant.montant > 0) {
      selectionnerMontantLibre(donExistant.montant);
    } else {
      reinitialiserMontant();
    }
    selectionnerModePaiement(donExistant.mode_paiement);
  } else {
    reinitialiserMontant();
    reinitialiserModePaiement();
  }

  // Le donateur est par défaut la famille de l'adresse ; reste modifiable
  // (ex. si c'est un voisin ou un proche qui ouvre la porte).
  document.getElementById("don-nom").value = donExistant?.nom_donateur || adresse.nom_famille || "";
  document.getElementById("don-email").value = donExistant?.email_donateur || dernierEmailConnu(dons) || "";

  recuEnvoyeSelectionne = donExistant?.recu_envoye ?? false;
  paveRecuBtn.classList.toggle("actif", recuEnvoyeSelectionne);

  dialogDon.showModal();
}

donAnnulerBtn.addEventListener("click", () => dialogDon.close());

donReinitialiserBtn.addEventListener("click", async () => {
  if (!donExistantCourant) return;

  const confirme = window.confirm(
    "Réinitialiser ce don ? Le pavé redeviendra vide pour cette maison, cette année. Cette action est irréversible."
  );
  if (!confirme) return;

  const id = donExistantCourant.id;
  await supprimerDon(id);
  supprimerDeSupabase("dons", id);

  adresseCourante = null;
  donExistantCourant = null;
  dialogDon.close();
  rafraichirVueApp();
});

formDon.addEventListener("submit", async (event) => {
  // Le formulaire est en method="dialog" : sans preventDefault, la fenêtre
  // se fermerait automatiquement même si la validation ci-dessous échoue.
  event.preventDefault();
  if (!adresseCourante) return;

  if (refuseSelectionne === null) {
    donMessageEl.textContent = "Précise si la personne a donné ou refusé avant d'enregistrer.";
    donMessageEl.className = "connexion-message erreur";
    return;
  }

  const montantFinal = refuseSelectionne
    ? 0
    : montantSelectionne !== null
      ? montantSelectionne
      : parseFloat(donMontantAutreInput.value || "0");

  if (!refuseSelectionne) {
    if (!montantFinal || montantFinal <= 0) {
      donMessageEl.textContent = "Choisis un montant avant d'enregistrer.";
      donMessageEl.className = "connexion-message erreur";
      return;
    }
    if (!modePaiementSelectionne) {
      donMessageEl.textContent = "Choisis un mode de paiement (espèces ou chèque) avant d'enregistrer.";
      donMessageEl.className = "connexion-message erreur";
      return;
    }
  }
  donMessageEl.textContent = "";
  donMessageEl.className = "connexion-message";

  const don = await enregistrerDon({
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
  dialogDon.close();

  rafraichirVueApp();
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

// Les dons liés sont supprimés automatiquement côté Supabase (on delete
// cascade sur dons.adresse_id), comme dans le cache local.
async function supprimerDeSupabase(table, id) {
  if (modeDemo) return;

  const supabase = await getSupabaseClient();
  if (!supabase) return;

  const { error } = await supabase.from(table).delete().eq("id", id);
  if (error) {
    console.warn(`[supabase] échec de suppression (${table}) :`, error.message);
  }
}

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
