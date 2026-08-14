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
  reordonnerRues,
  addDepot,
  getDepotsByTournee,
  getLcByAdresse,
  enregistrerLc,
  trouverLcPourAnnee,
  DEMO_TOURNEE_ID,
  DEMO_AGENT_ID,
} from "./db.js";
import { getSupabaseClient } from "./supabaseClient.js";
import { exporterPDF, exporterExcel, genererRapportDepot } from "./export.js";
import {
  getSession,
  connecterAvecMotDePasse,
  deconnecter,
  ecouterChangementsAuth,
  getAgentPourUtilisateur,
  getTourneePourUtilisateur,
} from "./auth.js";
import { synchroniserDonneesAgent } from "./sync.js";
import {
  listerTournees,
  listerAgents,
  creerAgent,
  desactiverAgent,
  creerTourneeDistante,
  supprimerTourneeDistante,
  affecterAgent,
  retirerAgent,
  uploaderCartePdf,
  obtenirUrlCartePdf,
  supprimerCartePdf,
  listerDepotsTournee,
} from "./admin.js";

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
const cartoMessageEl = document.getElementById("carto-message");
const cartoLienPdfEl = document.getElementById("carto-lien-pdf");
const vueComptaEl = document.getElementById("vue-compta");
const comptaDenominationsEl = document.getElementById("compta-denominations");
const comptaTotalEspecesCompteEl = document.getElementById("compta-total-especes-compte");
const comptaStepperChequesEl = document.getElementById("compta-stepper-cheques");
const comptaMontantChequesInput = document.getElementById("compta-montant-cheques");
const comptaTotalCompteEl = document.getElementById("compta-total-compte");
const comptaTotalAttenduEl = document.getElementById("compta-total-attendu");
const comptaEcartEl = document.getElementById("compta-ecart");
const btnConfirmerDepot = document.getElementById("btn-confirmer-depot");
const comptaMessageEl = document.getElementById("compta-message");
const comptaHistoriqueDepotsEl = document.getElementById("compta-historique-depots");
const comptaHistoriqueVideEl = document.getElementById("compta-historique-vide");
const vueFinCampagneAgentEl = document.getElementById("vue-fin-campagne-agent");
const btnExportPdfAgent = document.getElementById("btn-export-pdf-agent");
const btnExportExcelAgent = document.getElementById("btn-export-excel-agent");
const exportAgentMessageEl = document.getElementById("export-agent-message");

const vueStatistiquesEl = document.getElementById("vue-statistiques");
const statVariationEl = document.getElementById("stat-variation");
const statProgressionPourcentageEl = document.getElementById("stat-progression-pourcentage");
const statAnneauAvantEl = document.getElementById("stat-anneau-avant");
const statMaisonsRestantesEl = document.getElementById("stat-maisons-restantes");
const statBarresAnneesEl = document.getElementById("stat-barres-annees");
const statNbDonateursEl = document.getElementById("stat-nb-donateurs");
const statNbRefusEl = document.getElementById("stat-nb-refus");
const statNbAbsentsEl = document.getElementById("stat-nb-absents");
const statNbLcEl = document.getElementById("stat-nb-lc");
const statTauxAcceptationEl = document.getElementById("stat-taux-acceptation");
const statRepartitionDonsEl = document.getElementById("stat-repartition-dons");
const statRepartitionRefusEl = document.getElementById("stat-repartition-refus");

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
const ongletCompteurToutesEl = document.getElementById("onglet-compteur-toutes");
const ongletCompteurRepassesEl = document.getElementById("onglet-compteur-repasses");
const ongletCompteurAFaireEl = document.getElementById("onglet-compteur-a-faire");
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

const vueAdminAccueilEl = document.getElementById("vue-admin-accueil");
const paveAdminAgentsBtn = document.getElementById("pave-admin-agents");
const paveAdminTourneesBtn = document.getElementById("pave-admin-tournees");
const paveAdminComptaBtn = document.getElementById("pave-admin-compta");
const boutonsRetourAdminAccueil = document.querySelectorAll("[data-retour-admin-accueil]");

const vueAdminAgentsEl = document.getElementById("vue-admin-agents");
const btnAjouterAgent = document.getElementById("btn-ajouter-agent");
const adminListeAgentsEl = document.getElementById("admin-liste-agents");

const vueAdminTourneesEl = document.getElementById("vue-admin-tournees");
const btnAjouterTournee = document.getElementById("btn-ajouter-tournee");
const adminListeTourneesEl = document.getElementById("admin-liste-tournees");

const vueAdminTourneeDetailEl = document.getElementById("vue-admin-tournee-detail");
const btnRetourAdminTournees = document.getElementById("btn-retour-admin-tournees");
const adminTourneeDetailTitreEl = document.getElementById("admin-tournee-detail-titre");
const adminTourneeDetailCompteurEl = document.getElementById("admin-tournee-detail-compteur");
const adminTourneeDetailProgressEl = document.getElementById("admin-tournee-detail-progress");
const adminTourneeDetailAgentsEl = document.getElementById("admin-tournee-detail-agents");
const adminTourneeDetailAssignEl = document.getElementById("admin-tournee-detail-assign");
const adminTourneeDetailDepotsEl = document.getElementById("admin-tournee-detail-depots");
const adminTourneeDetailDepotsVideEl = document.getElementById("admin-tournee-detail-depots-vide");
const adminCarteStatutEl = document.getElementById("admin-carte-statut");
const btnImporterCarte = document.getElementById("btn-importer-carte");
const adminCarteLienEl = document.getElementById("admin-carte-lien");
const btnSupprimerCarte = document.getElementById("btn-supprimer-carte");
const adminCarteFichierInput = document.getElementById("admin-carte-fichier");
const btnSupprimerTournee = document.getElementById("btn-supprimer-tournee");

const vueAdminComptaEl = document.getElementById("vue-admin-compta");

const dialogNouvelAgent = document.getElementById("dialog-nouvel-agent");
const formNouvelAgent = document.getElementById("form-nouvel-agent");
const agentPrenomInput = document.getElementById("agent-prenom");
const agentNomInput = document.getElementById("agent-nom");
const agentMessageEl = document.getElementById("agent-message");
const agentAnnulerBtn = document.getElementById("agent-annuler");

const dialogNouvelleTourneeAdmin = document.getElementById("dialog-nouvelle-tournee-admin");
const formNouvelleTourneeAdmin = document.getElementById("form-nouvelle-tournee-admin");
const tourneeNumeroInput = document.getElementById("tournee-numero");
const tourneeEmailInput = document.getElementById("tournee-email");
const tourneeMotDePasseInput = document.getElementById("tournee-mot-de-passe");
const tourneeGenererMdpBtn = document.getElementById("tournee-generer-mdp");
const tourneeMessageEl = document.getElementById("tournee-message");
const tourneeAnnulerBtn = document.getElementById("tournee-annuler");

const dialogConfirmerSuppressionTournee = document.getElementById("dialog-confirmer-suppression-tournee");
const formConfirmerSuppressionTournee = document.getElementById("form-confirmer-suppression-tournee");
const supprTourneeNumeroCibleEl = document.getElementById("suppr-tournee-numero-cible");
const supprTourneeNumeroSaisiInput = document.getElementById("suppr-tournee-numero-saisi");
const supprTourneeMessageEl = document.getElementById("suppr-tournee-message");
const supprTourneeAnnulerBtn = document.getElementById("suppr-tournee-annuler");

const ecranQuiEsTuEl = document.getElementById("ecran-qui-es-tu");
const quiEsTuListeEl = document.getElementById("qui-es-tu-liste");

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

const dialogLc = document.getElementById("dialog-lc");
const formLc = document.getElementById("form-lc");
const pavesLcEl = document.getElementById("pavés-lc");
const lcAnnulerBtn = document.getElementById("lc-annuler");

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
let communeReorgId = null; // id de la commune dont les rues sont en cours de réorganisation, ou null

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

// --- Écrans : connexion / qui-es-tu / app / admin ----------------------
function afficherEcranConnexion() {
  vueActuelle = "connexion";
  ecranConnexionEl.hidden = false;
  appEl.hidden = true;
  ecranAdminEl.hidden = true;
  ecranQuiEsTuEl.hidden = true;
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
  ecranQuiEsTuEl.hidden = true;
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
  ecranQuiEsTuEl.hidden = true;
  ecranAdminEl.hidden = false;
  agentBadgeEl.textContent = `${agentActuel.prenom} ${agentActuel.nom}`.trim() || "Amicale";
  agentBadgeEl.hidden = false;
  btnDeconnexion.hidden = false;
  afficherAdminAccueil();
}

// Écran "qui es-tu ?" : affiché après connexion sur le compte partagé
// d'une tournée, tant qu'aucun amicaliste n'a été choisi sur cet appareil
// pour cette tournée (voir connecterAvecSession). Le choix est mémorisé
// dans localStorage pour ne pas le redemander à chaque connexion.
function afficherEcranQuiEsTu(tournee) {
  vueActuelle = "qui-es-tu";
  ecranConnexionEl.hidden = true;
  appEl.hidden = true;
  ecranAdminEl.hidden = true;
  ecranQuiEsTuEl.hidden = false;
  agentBadgeEl.hidden = true;
  btnDeconnexion.hidden = false;
  btnDeconnexionAccueil.hidden = true;

  quiEsTuListeEl.innerHTML = "";
  if ((tournee.agents || []).length === 0) {
    quiEsTuListeEl.innerHTML =
      '<p class="rue-vide">Aucun amicaliste n\'est encore affecté à cette tournée. Contactez l\'amicale.</p>';
    return;
  }
  for (const agent of tournee.agents) {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "secondaire pave-pleine-largeur";
    btn.textContent = `${agent.prenom} ${agent.nom}`;
    btn.addEventListener("click", () => {
      agentActuel = agent;
      localStorage.setItem(`agent-choisi-${tournee.id}`, agent.id);
      afficherApp();
    });
    quiEsTuListeEl.appendChild(btn);
  }
}

function afficherMessageConnexion(texte, type) {
  connexionMessageEl.textContent = texte;
  connexionMessageEl.className = "connexion-message" + (type ? " " + type : "");
}

// --- Connexion ------------------------------------------------------------
async function connecterAvecSession(session) {
  const supabase = await getSupabaseClient();
  modeDemo = false;

  // Le compte de l'amicale (est_admin) a sa propre fiche "agents", liée
  // directement à son user_id — pas de tournée personnelle à synchroniser.
  const agentAdmin = await getAgentPourUtilisateur(session.user.id);
  if (agentAdmin?.est_admin) {
    agentActuel = agentAdmin;
    afficherAdmin();
    return;
  }

  // Sinon, c'est peut-être le compte partagé d'une tournée : les
  // amicalistes n'ont pas de compte propre, voir schema.sql.
  const tournee = await getTourneePourUtilisateur(session.user.id);
  if (!tournee) {
    afficherMessageConnexion(
      "Connecté, mais aucune tournée n'est encore associée à cet email. Contactez le responsable.",
      "erreur"
    );
    afficherEcranConnexion();
    return;
  }

  tourneeActuelleId = tournee.id;

  try {
    await synchroniserDonneesAgent(supabase, tournee);
  } catch (err) {
    console.warn("[sync] échec de la synchronisation initiale :", err.message);
  }

  const choixMemorise = localStorage.getItem(`agent-choisi-${tournee.id}`);
  const agentMemorise = tournee.agents.find((a) => a.id === choixMemorise);
  if (agentMemorise) {
    agentActuel = agentMemorise;
    afficherApp();
  } else {
    afficherEcranQuiEsTu(tournee);
  }
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

// Permet de changer d'amicaliste sans se déconnecter (le compte reste
// celui, partagé, de la tournée) : retape l'écran "qui es-tu ?".
agentBadgeEl.addEventListener("click", async () => {
  if (modeDemo || vueActuelle !== "app") return;
  const tournee = await getTournee(tourneeActuelleId);
  if (!tournee) return;
  afficherEcranQuiEsTu({ id: tourneeActuelleId, agents: tournee.agents || [] });
});

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

// La commune/rue ne sont plus saisies par l'admin à la création : tant
// que l'agent n'a pas créé sa première commune/rue depuis sa session, ces
// champs restent vides côté tournees (voir schema.sql).
function libelleTournee(tournee) {
  const lieu = [tournee.nom_rue, tournee.nom_commune].filter(Boolean).join(", ");
  return `Tournée n°${tournee.numero}` + (lieu ? ` — ${lieu}` : "");
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
  let nbAbsents = 0;
  let nbLc = 0;
  let maisonsValidees = 0;
  const totauxParAnnee = new Map();

  for (const { adresse } of items) {
    const dons = await getDonsByAdresse(adresse.id);
    if (estAdresseValidee(adresse, dons)) maisonsValidees++;
    // "Absents" en temps réel : au moins un passage sans réponse, mais pas
    // encore de passage réussi (une maison n'est pas "absente" une fois
    // qu'on a réussi à parler à quelqu'un, même si les 3 passages y sont
    // passés).
    if (statutValidationAdresse(adresse) === "attente") nbAbsents++;

    // "LC" : les 3 passages sont des absences et un enregistrement existe
    // pour l'année en cours (calendrier/avis de passage/enveloppe T laissés).
    if (statutValidationAdresse(adresse) === "validee" && !auMoinsUnPassageReussi(adresse)) {
      const lcs = await getLcByAdresse(adresse.id);
      if (trouverLcPourAnnee(lcs, anneeCourante)) nbLc++;
    }

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

    for (const don of dons) {
      if (don.refuse) continue;
      const annee = new Date(don.date).getFullYear();
      totauxParAnnee.set(annee, (totauxParAnnee.get(annee) ?? 0) + don.montant);
    }
  }

  // Les 5 dernières années (année courante comprise), même celles sans don
  // (total à 0), pour un diagramme en barres à largeur constante.
  const historique = [];
  for (let i = 4; i >= 0; i--) {
    const annee = anneeCourante - i;
    historique.push({ annee, total: totauxParAnnee.get(annee) ?? 0 });
  }

  return {
    totalCourant,
    totalPrecedent,
    nbDonateurs,
    nbRefus,
    nbAbsents,
    nbLc,
    totalMaisons: items.length,
    maisonsValidees,
    historique,
  };
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
paveAccueilCartoBtn.addEventListener("click", async () => {
  vueAppInterne = "cartographie";
  masquerToutesLesVuesApp();
  vueCartographieEl.hidden = false;

  cartoLienPdfEl.hidden = true;
  cartoMessageEl.hidden = false;
  cartoMessageEl.textContent = "Chargement…";

  if (modeDemo || !tourneeActuelleId) {
    cartoMessageEl.textContent = "Aucune carte disponible en mode démo.";
    return;
  }

  const supabase = await getSupabaseClient();
  const url = supabase ? await obtenirUrlCartePdf(supabase, tourneeActuelleId) : null;
  if (url) {
    cartoLienPdfEl.href = url;
    cartoLienPdfEl.hidden = false;
    cartoMessageEl.hidden = true;
  } else {
    cartoMessageEl.textContent = "Aucune carte n'a encore été importée pour cette tournée.";
  }
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
const STAT_ANNEAU_CIRCONFERENCE = 2 * Math.PI * 52;

async function afficherStatistiques() {
  vueAppInterne = "statistiques";
  masquerToutesLesVuesApp();
  vueStatistiquesEl.hidden = false;

  const stats = tourneeActuelleId
    ? await calculerStatistiquesTournee(tourneeActuelleId)
    : {
        totalCourant: 0,
        totalPrecedent: 0,
        nbDonateurs: 0,
        nbRefus: 0,
        nbAbsents: 0,
        nbLc: 0,
        totalMaisons: 0,
        maisonsValidees: 0,
        historique: [],
      };

  // Anneau de progression de la tournée.
  const pourcentage = stats.totalMaisons ? Math.round((stats.maisonsValidees / stats.totalMaisons) * 100) : 0;
  statProgressionPourcentageEl.textContent = `${pourcentage} %`;
  statAnneauAvantEl.style.strokeDashoffset = String(
    STAT_ANNEAU_CIRCONFERENCE * (1 - pourcentage / 100)
  );
  const restantes = stats.totalMaisons - stats.maisonsValidees;
  statMaisonsRestantesEl.textContent =
    restantes > 0
      ? `${restantes} maison${restantes > 1 ? "s" : ""} restante${restantes > 1 ? "s" : ""} à valider`
      : stats.totalMaisons > 0
        ? "Toutes les maisons sont validées"
        : "Aucune maison pour l'instant";

  // Diagramme en barres : dons collectés sur les 5 dernières années.
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

  const anneeCourante = new Date().getFullYear();
  const maxHistorique = Math.max(1, ...stats.historique.map((h) => h.total));
  statBarresAnneesEl.innerHTML = "";
  for (const { annee, total } of stats.historique) {
    const colonne = document.createElement("div");
    colonne.className = "stat-barre-colonne" + (annee === anneeCourante ? " stat-barre-courante" : "");

    const montant = document.createElement("span");
    montant.className = "stat-barre-montant";
    montant.textContent = total > 0 ? formaterMontant(total) : "";

    const barre = document.createElement("div");
    barre.className = "stat-barre";
    barre.style.height = `${Math.round((total / maxHistorique) * 100)}%`;

    const label = document.createElement("span");
    label.className = "stat-barre-annee";
    label.textContent = `’${String(annee).slice(-2)}`;

    colonne.append(montant, barre, label);
    statBarresAnneesEl.appendChild(colonne);
  }

  // Donateurs / refus, avec une barre de répartition visuelle.
  statNbDonateursEl.textContent = String(stats.nbDonateurs);
  statNbRefusEl.textContent = String(stats.nbRefus);
  statNbAbsentsEl.textContent = String(stats.nbAbsents);
  statNbLcEl.textContent = String(stats.nbLc);

  const totalReponses = stats.nbDonateurs + stats.nbRefus;
  const partDons = totalReponses ? Math.round((stats.nbDonateurs / totalReponses) * 100) : 0;
  statRepartitionDonsEl.style.width = `${partDons}%`;
  statRepartitionRefusEl.style.width = `${totalReponses ? 100 - partDons : 0}%`;
  statTauxAcceptationEl.textContent = totalReponses ? `${partDons} %` : "—";
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

// Dénominations officielles en euros (pièces puis billets). Les couleurs des
// billets reprennent les teintes officielles (5€ gris, 10€ rouge, 20€ bleu,
// 50€ orange, 100€ vert) pour que l'icône stylisée reste reconnaissable sans
// utiliser de vraie photo.
const DENOMINATIONS = [
  { valeur: 0.01, label: "1 c", type: "piece", couleur: "#c68a4e" },
  { valeur: 0.02, label: "2 c", type: "piece", couleur: "#c68a4e" },
  { valeur: 0.05, label: "5 c", type: "piece", couleur: "#c68a4e" },
  { valeur: 0.1, label: "10 c", type: "piece", couleur: "#d9b34a" },
  { valeur: 0.2, label: "20 c", type: "piece", couleur: "#d9b34a" },
  { valeur: 0.5, label: "50 c", type: "piece", couleur: "#d9b34a" },
  { valeur: 1, label: "1 €", type: "piece", couleur: "#b0b0b0" },
  { valeur: 2, label: "2 €", type: "piece", couleur: "#8d8d8d" },
  { valeur: 5, label: "5 €", type: "billet", couleur: "#8c8c7a" },
  { valeur: 10, label: "10 €", type: "billet", couleur: "#c0392b" },
  { valeur: 20, label: "20 €", type: "billet", couleur: "#2980b9" },
  { valeur: 50, label: "50 €", type: "billet", couleur: "#e67e22" },
  { valeur: 100, label: "100 €", type: "billet", couleur: "#27ae60" },
];

function svgIcone(denom) {
  return denom.type === "piece"
    ? `<svg viewBox="0 0 32 32" width="32" height="32" aria-hidden="true"><circle cx="16" cy="16" r="14" fill="${denom.couleur}" stroke="rgba(0,0,0,0.15)" /></svg>`
    : `<svg viewBox="0 0 32 32" width="32" height="32" aria-hidden="true"><rect x="2" y="8" width="28" height="16" rx="6" fill="${denom.couleur}" stroke="rgba(0,0,0,0.15)" /></svg>`;
}

// Composant -/valeur/+ générique, réutilisé pour chaque ligne de dénomination
// et pour le compteur de chèques. reset() passe par définir() plutôt que de
// remettre le texte à la main, pour que onChange (et donc l'état tally +
// le recalcul des totaux) reste toujours synchronisé avec l'affichage.
function brancherStepper(el, { onChange }) {
  let valeur = 0;
  const valeurEl = el.querySelector(".stepper-valeur");
  const definir = (nouvelleValeur) => {
    valeur = Math.max(0, nouvelleValeur);
    valeurEl.textContent = String(valeur);
    onChange(valeur);
  };
  el.querySelector(".stepper-moins").addEventListener("click", () => definir(valeur - 1));
  el.querySelector(".stepper-plus").addEventListener("click", () => definir(valeur + 1));
  return { get: () => valeur, reset: () => definir(0) };
}

let tallyEspeces = new Map(DENOMINATIONS.map((d) => [d.valeur, 0]));
let comptaTotalAttenduActuel = 0;
let denominationsControleurs = [];

// Construites une seule fois (les <li> sont des noeuds DOM stables) : chaque
// nouvelle visite de l'écran Compta se contente de réinitialiser leur valeur
// via reinitialiserComptage(), voir afficherCompta().
function rendreDenominations() {
  if (denominationsControleurs.length > 0) return;

  comptaDenominationsEl.innerHTML = "";
  denominationsControleurs = DENOMINATIONS.map((denom) => {
    const li = document.createElement("li");
    li.className = "compta-denomination-row";
    li.dataset.valeur = String(denom.valeur);
    li.innerHTML = `
      <span class="compta-denomination-icone">${svgIcone(denom)}</span>
      <span class="compta-denomination-label">${denom.label}</span>
      <div class="stepper">
        <button type="button" class="stepper-moins">−</button>
        <span class="stepper-valeur">0</span>
        <button type="button" class="stepper-plus">+</button>
      </div>
      <span class="compta-denomination-sous-total">0,00 €</span>
    `;
    const sousTotalEl = li.querySelector(".compta-denomination-sous-total");
    const controleur = brancherStepper(li.querySelector(".stepper"), {
      onChange: (quantite) => {
        tallyEspeces.set(denom.valeur, quantite);
        sousTotalEl.textContent = formaterMontant(quantite * denom.valeur);
        recalculerTotaux();
      },
    });
    comptaDenominationsEl.appendChild(li);
    return controleur;
  });
}

const stepperCheques = brancherStepper(comptaStepperChequesEl, {
  onChange: () => recalculerTotaux(),
});
comptaMontantChequesInput.addEventListener("input", () => recalculerTotaux());

function reinitialiserComptage() {
  denominationsControleurs.forEach((c) => c.reset());
  stepperCheques.reset();
  comptaMontantChequesInput.value = "0";
  recalculerTotaux();
}

function recalculerTotaux() {
  let totalEspeces = 0;
  for (const [valeur, quantite] of tallyEspeces) totalEspeces += valeur * quantite;
  comptaTotalEspecesCompteEl.textContent = formaterMontant(totalEspeces);

  const montantCheques = Number(comptaMontantChequesInput.value) || 0;
  const totalCompte = totalEspeces + montantCheques;
  comptaTotalCompteEl.textContent = formaterMontant(totalCompte);
  comptaTotalAttenduEl.textContent = formaterMontant(comptaTotalAttenduActuel);

  const ecart = totalCompte - comptaTotalAttenduActuel;
  comptaEcartEl.className = "compta-ecart " + (Math.abs(ecart) < 0.01 ? "ok" : ecart > 0 ? "sur" : "sous");
  comptaEcartEl.textContent =
    Math.abs(ecart) < 0.01
      ? "Le comptage correspond au montant attendu."
      : `Écart : ${ecart > 0 ? "+" : ""}${formaterMontant(ecart)} par rapport à l'attendu`;

  return { totalEspeces, montantCheques, totalCompte };
}

function formaterDateDepot(iso) {
  return new Date(iso).toLocaleString("fr-FR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

async function rafraichirHistoriqueDepots() {
  const depots = tourneeActuelleId ? await getDepotsByTournee(tourneeActuelleId) : [];
  depots.sort((a, b) => new Date(b.date) - new Date(a.date));

  comptaHistoriqueDepotsEl.innerHTML = "";
  comptaHistoriqueVideEl.hidden = depots.length > 0;

  for (const depot of depots) {
    const li = document.createElement("li");
    const total = depot.montant_especes + depot.montant_cheques;
    li.innerHTML = `<span>${formaterDateDepot(depot.date)}</span><span>${formaterMontant(total)}</span>`;
    comptaHistoriqueDepotsEl.appendChild(li);
  }
}

async function afficherCompta() {
  vueAppInterne = "compta";
  masquerToutesLesVuesApp();
  vueComptaEl.hidden = false;

  rendreDenominations();
  reinitialiserComptage();

  comptaMessageEl.textContent = "";
  comptaMessageEl.className = "connexion-message";

  const compta = tourneeActuelleId
    ? await calculerComptaTournee(tourneeActuelleId)
    : { nbEspeces: 0, totalEspeces: 0, nbCheques: 0, totalCheques: 0 };
  comptaTotalAttenduActuel = compta.totalEspeces + compta.totalCheques;
  recalculerTotaux();

  await rafraichirHistoriqueDepots();
}

btnConfirmerDepot.addEventListener("click", async () => {
  if (!tourneeActuelleId) return;

  const { totalEspeces, montantCheques } = recalculerTotaux();
  if (totalEspeces <= 0 && montantCheques <= 0) {
    comptaMessageEl.textContent = "Rien à déposer : comptez au moins une pièce, un billet ou un chèque.";
    comptaMessageEl.className = "connexion-message erreur";
    return;
  }

  const confirme = window.confirm(
    `Confirmer le dépôt de ${formaterMontant(totalEspeces + montantCheques)} ` +
      `(${formaterMontant(totalEspeces)} en espèces + ${formaterMontant(montantCheques)} en chèques) ? ` +
      `Le comptage sera remis à zéro.`
  );
  if (!confirme) return;

  const detailEspeces = [...tallyEspeces.entries()]
    .filter(([, quantite]) => quantite > 0)
    .map(([valeur, quantite]) => ({ valeur, quantite }));

  const depot = await addDepot({
    tournee_id: tourneeActuelleId,
    agent_id: agentActuel?.id ?? null,
    montant_especes: totalEspeces,
    montant_cheques: montantCheques,
    nb_cheques: stepperCheques.get(),
    detail_especes: detailEspeces,
  });

  await pousserVersSupabase("depots", depot);

  comptaMessageEl.textContent = "Dépôt enregistré.";
  comptaMessageEl.className = "connexion-message succes";

  try {
    const tournee = await getTournee(tourneeActuelleId);
    await genererRapportDepot(depot, tournee);
  } catch (err) {
    console.error("Erreur lors de la génération du reçu de dépôt :", err);
  }

  reinitialiserComptage();
  await rafraichirHistoriqueDepots();
});

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
    const lcs = await getLcByAdresse(adresse.id);
    const li = creerLigneAdresse(adresse, dons, rue, commune, lcs);
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
  await rafraichirCompteursOnglets();
}

// Une maison peut compter à la fois dans "Repasses" et "A faire" (passage
// réussi mais don pas encore saisi) : voir les prédicats de
// rendreOngletActuel, repris ici à l'identique pour que les compteurs
// correspondent exactement au contenu de chaque onglet.
async function rafraichirCompteursOnglets() {
  if (!tourneeActuelleId) {
    ongletCompteurToutesEl.textContent = "0";
    ongletCompteurRepassesEl.textContent = "0";
    ongletCompteurAFaireEl.textContent = "0";
    return;
  }

  const items = await obtenirAdressesTournee(tourneeActuelleId);
  let repasses = 0;
  let aFaire = 0;
  for (const { adresse } of items) {
    const dons = await getDonsByAdresse(adresse.id);
    if (statutValidationAdresse(adresse) === "attente" || donManquantMalgrePassage(adresse, dons)) repasses++;
    if (statutValidationAdresse(adresse) === "neutre" || donManquantMalgrePassage(adresse, dons)) aFaire++;
  }

  ongletCompteurToutesEl.textContent = String(items.length);
  ongletCompteurRepassesEl.textContent = String(repasses);
  ongletCompteurAFaireEl.textContent = String(aFaire);
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
    avecDons.push({
      ...item,
      dons: await getDonsByAdresse(item.adresse.id),
      lcs: await getLcByAdresse(item.adresse.id),
    });
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

  for (const { adresse, rue, commune, dons, lcs } of filtres) {
    container.appendChild(creerLigneAdresse(adresse, dons, rue, commune, lcs));
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

  const enReorg = communeReorgId === commune.id;

  const liste = document.createElement("ul");
  liste.className = "rues-liste";
  if (enReorg) {
    for (const rue of rues) {
      liste.appendChild(creerLigneRueReorganisation(rue));
    }
  } else {
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
  }

  const actions = document.createElement("div");
  actions.className = "form-inline";

  const btnReorganiserRues = document.createElement("button");
  btnReorganiserRues.type = "button";
  btnReorganiserRues.className = "secondaire";
  btnReorganiserRues.textContent = enReorg ? "✓ Terminer" : "⠿ Réorganiser";
  btnReorganiserRues.hidden = rues.length < 2;
  btnReorganiserRues.addEventListener("click", () => {
    communeReorgId = enReorg ? null : commune.id;
    rendreOngletActuel();
  });
  actions.appendChild(btnReorganiserRues);

  if (!enReorg) {
    const btnAjouterRue = document.createElement("button");
    btnAjouterRue.type = "button";
    btnAjouterRue.className = "secondaire";
    btnAjouterRue.textContent = "+ Ajouter une rue";
    btnAjouterRue.addEventListener("click", () => ouvrirDialogNouvelleRue(commune));
    actions.appendChild(btnAjouterRue);
  }

  bloc.append(titre, liste, actions);
  return bloc;
}

function creerLigneRueReorganisation(rue) {
  const li = document.createElement("li");
  li.className = "rue-carte rue-reorg";
  li.dataset.id = rue.id;

  const label = document.createElement("span");
  label.className = "rue-carte-nom";
  label.textContent = rue.nom;

  const poignee = document.createElement("span");
  poignee.className = "drag-handle";
  poignee.textContent = "⠿";

  li.append(label, poignee);
  activerGlisserDeposer(li, poignee, "rue-reorg", async (idsOrdonnes) => {
    const ruesMaj = await reordonnerRues(idsOrdonnes);
    for (const r of ruesMaj) {
      pousserVersSupabase("rues", { id: r.id, commune_id: r.commune_id, ordre: r.ordre });
    }
  });
  return li;
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
  const lcsParAdresse = new Map();
  for (const adresse of adresses) {
    donsParAdresse.set(adresse.id, await getDonsByAdresse(adresse.id));
    lcsParAdresse.set(adresse.id, await getLcByAdresse(adresse.id));
  }

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
    rueDetailListeEl.appendChild(
      creerLigneAdresse(adresse, donsParAdresse.get(adresse.id), rue, commune, lcsParAdresse.get(adresse.id))
    );
  }
}

function creerLigneAdresse(adresse, dons, rue, commune, lcs = []) {
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
  // Les 3 passages sont des absences : plus rien à espérer côté don cette
  // année, la case "Don" devient "LC" (ce qui a été laissé dans la boîte
  // aux lettres) — mêmes règles d'attention (orange clignotant tant que rien
  // n'est saisi, vert une fois enregistré) que la case Don.
  const troisAbsences = statutBase === "validee" && !auMoinsUnPasse;
  const lcActif = troisAbsences ? trouverLcPourAnnee(lcs, anneeCourante) : null;

  const donBtn = document.createElement("button");
  donBtn.type = "button";
  if (troisAbsences) {
    donBtn.className = lcActif ? "don-cell don-donne" : "don-cell a-remplir";
    donBtn.textContent = "LC";
    donBtn.addEventListener("click", () => ouvrirDialogLc(adresse, lcActif));
  } else if (donActif?.refuse) {
    donBtn.className = "don-cell don-refuse";
    donBtn.textContent = "Refusé";
    donBtn.addEventListener("click", () => ouvrirDialogDon(adresse, dons));
  } else if (donActif) {
    donBtn.className = "don-cell don-donne";
    donBtn.textContent = formaterMontant(donActif.montant);
    donBtn.addEventListener("click", () => ouvrirDialogDon(adresse, dons));
  } else if (auMoinsUnPasse) {
    // Contact réussi mais rien de saisi encore : on le met en évidence tout
    // de suite pour que l'agent pense à remplir le don pendant qu'il est
    // encore sur le pas de la porte.
    donBtn.className = "don-cell a-remplir";
    donBtn.textContent = "Don";
    donBtn.addEventListener("click", () => ouvrirDialogDon(adresse, dons));
  } else {
    donBtn.className = "don-cell";
    donBtn.textContent = "Don";
    donBtn.addEventListener("click", () => {
      window.alert("Marque d'abord un passage réussi (case verte) avant de saisir un don.");
    });
  }

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
  activerGlisserDeposer(li, poignee, "adresse-reorg", async (idsOrdonnes) => {
    const adressesMaj = await reordonnerAdresses(idsOrdonnes);
    for (const a of adressesMaj) {
      pousserVersSupabase("adresses", { id: a.id, rue_id: a.rue_id, ordre: a.ordre });
    }
  });
  return li;
}

// Glisser-déposer tactile/souris via l'API Pointer Events : la ligne ne
// bouge pas dans le DOM pendant le glissement (elle flotte au-dessus grâce à
// `transform`), le vrai déplacement n'a lieu qu'au relâchement — ça évite les
// sauts visuels qu'un réordonnancement en continu provoquerait. Générique :
// `classeItem` sélectionne les lignes triables de la liste courante,
// `onReordonner` persiste le nouvel ordre (adresses dans une rue, ou rues
// dans une commune).
function activerGlisserDeposer(item, poignee, classeItem, onReordonner) {
  poignee.addEventListener("pointerdown", (event) => {
    event.preventDefault();
    const liste = item.parentElement;
    const items = () => [...liste.querySelectorAll(`.${classeItem}`)];
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
      await onReordonner(idsOrdonnes);
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

// --- Dialogue "Laissés dans la boîte à lettre" (case LC) -------------------
// Les 3 pavés sont cochés (verts) par défaut à l'ouverture — ou reprennent
// l'enregistrement existant si on rouvre une case LC déjà validée.
function ouvrirDialogLc(adresse, lcExistant) {
  adresseCourante = adresse;
  pavesLcEl.querySelectorAll(".pave").forEach((btn) => {
    const valeur = lcExistant ? lcExistant[btn.dataset.lc] !== false : true;
    btn.classList.toggle("actif", valeur);
  });
  dialogLc.showModal();
}

pavesLcEl.querySelectorAll(".pave").forEach((btn) => {
  btn.addEventListener("click", () => btn.classList.toggle("actif"));
});

lcAnnulerBtn.addEventListener("click", () => dialogLc.close());

formLc.addEventListener("submit", async () => {
  if (!adresseCourante) return;

  const champs = { adresse_id: adresseCourante.id, agent_id: agentActuel?.id ?? null };
  pavesLcEl.querySelectorAll(".pave").forEach((btn) => {
    champs[btn.dataset.lc] = btn.classList.contains("actif");
  });

  const lc = await enregistrerLc(champs);
  pousserVersSupabase("laisses_boite", lc);

  adresseCourante = null;
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

// --- Écran admin : navigation entre les 3 pavés (Amicalistes / Tournées /
// Compta) ------------------------------------------------------------------
let tourneeDetailCourante = null; // id de la tournée affichée dans vue-admin-tournee-detail

function masquerToutesLesVuesAdmin() {
  vueAdminAccueilEl.hidden = true;
  vueAdminAgentsEl.hidden = true;
  vueAdminTourneesEl.hidden = true;
  vueAdminTourneeDetailEl.hidden = true;
  vueAdminComptaEl.hidden = true;
}

function afficherAdminAccueil() {
  masquerToutesLesVuesAdmin();
  vueAdminAccueilEl.hidden = false;
}

// --- Écran admin : Amicalistes --------------------------------------------
async function afficherAdminAgents() {
  masquerToutesLesVuesAdmin();
  vueAdminAgentsEl.hidden = false;
  await rafraichirListeAgents();
}

async function rafraichirListeAgents() {
  const supabase = await getSupabaseClient();
  if (!supabase) return;
  adminListeAgentsEl.innerHTML = "<li>Chargement…</li>";
  try {
    const agents = await listerAgents(supabase);
    rendreListeAgents(agents, supabase);
  } catch (err) {
    adminListeAgentsEl.innerHTML = `<li>Erreur : ${err.message}</li>`;
  }
}

function rendreListeAgents(agents, supabase) {
  adminListeAgentsEl.innerHTML = "";
  for (const agent of agents) {
    const li = document.createElement("li");
    li.className = "admin-tournee-item";
    const affectation = agent.tourneeNumeros.length
      ? `Tournée n°${agent.tourneeNumeros.join(", n°")}`
      : "Non affecté";
    const badgeRetire = agent.actif ? "" : ' <span class="badge-retire">Retiré</span>';
    li.innerHTML = `
      <div class="admin-tournee-titre">${agent.prenom} ${agent.nom}${badgeRetire}</div>
      <div class="admin-tournee-meta">${affectation}</div>
    `;
    if (agent.actif) {
      const btnRetirer = document.createElement("button");
      btnRetirer.type = "button";
      btnRetirer.className = "bouton-danger";
      btnRetirer.textContent = "Retirer";
      btnRetirer.addEventListener("click", async () => {
        if (
          !window.confirm(
            `Retirer ${agent.prenom} ${agent.nom} ? Il ne sera plus sélectionnable pour une tournée, mais son historique de dons est conservé.`
          )
        )
          return;
        try {
          await desactiverAgent(supabase, agent.id);
          rafraichirListeAgents();
        } catch (err) {
          window.alert("Erreur : " + err.message);
        }
      });
      li.appendChild(btnRetirer);
    }
    adminListeAgentsEl.appendChild(li);
  }
}

btnAjouterAgent.addEventListener("click", () => {
  formNouvelAgent.reset();
  agentMessageEl.textContent = "";
  agentMessageEl.className = "connexion-message";
  dialogNouvelAgent.showModal();
});
agentAnnulerBtn.addEventListener("click", () => dialogNouvelAgent.close());
formNouvelAgent.addEventListener("submit", async (event) => {
  event.preventDefault();
  const supabase = await getSupabaseClient();
  if (!supabase) return;
  try {
    await creerAgent(supabase, { nom: agentNomInput.value.trim(), prenom: agentPrenomInput.value.trim() });
    dialogNouvelAgent.close();
    rafraichirListeAgents();
  } catch (err) {
    agentMessageEl.textContent = "Erreur : " + err.message;
    agentMessageEl.className = "connexion-message erreur";
  }
});

// --- Écran admin : Tournées ------------------------------------------------
async function afficherAdminTournees() {
  masquerToutesLesVuesAdmin();
  vueAdminTourneesEl.hidden = false;
  await rafraichirListeTournees();
}

async function rafraichirListeTournees() {
  const supabase = await getSupabaseClient();
  if (!supabase) return;
  adminListeTourneesEl.innerHTML = "<li>Chargement…</li>";
  try {
    const tournees = await listerTournees(supabase);
    rendreListeTourneesAdmin(tournees);
  } catch (err) {
    adminListeTourneesEl.innerHTML = `<li>Erreur : ${err.message}</li>`;
  }
}

function rendreListeTourneesAdmin(tournees) {
  adminListeTourneesEl.innerHTML = "";
  for (const t of tournees) {
    const li = document.createElement("li");
    li.className = "admin-tournee-item";
    const pourcentage = t.nombreAdresses ? Math.round((t.nombreTraitees / t.nombreAdresses) * 100) : 0;
    const agentsHtml = t.agents.map((a) => `<span class="agent-chip">${a.prenom} ${a.nom}</span>`).join("");
    li.innerHTML = `
      <div class="admin-tournee-titre">${libelleTournee(t)}</div>
      <div class="admin-tournee-progression">
        ${t.nombreTraitees} / ${t.nombreAdresses} maisons traitées
        <div class="progress-bar"><div class="progress-fill" style="width: ${pourcentage}%"></div></div>
      </div>
      <div class="admin-tournee-agents">${agentsHtml || "<em>Aucun agent affecté</em>"}</div>
    `;
    li.addEventListener("click", () => afficherAdminTourneeDetail(t.id));
    adminListeTourneesEl.appendChild(li);
  }
}

btnAjouterTournee.addEventListener("click", () => {
  formNouvelleTourneeAdmin.reset();
  tourneeMessageEl.textContent = "";
  tourneeMessageEl.className = "connexion-message";
  dialogNouvelleTourneeAdmin.showModal();
});
tourneeAnnulerBtn.addEventListener("click", () => dialogNouvelleTourneeAdmin.close());
tourneeGenererMdpBtn.addEventListener("click", () => {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789";
  let mdp = "";
  for (let i = 0; i < 10; i++) mdp += alphabet[Math.floor(Math.random() * alphabet.length)];
  tourneeMotDePasseInput.value = mdp;
});
formNouvelleTourneeAdmin.addEventListener("submit", async (event) => {
  event.preventDefault();
  const supabase = await getSupabaseClient();
  if (!supabase) return;
  tourneeMessageEl.textContent = "Création en cours…";
  tourneeMessageEl.className = "connexion-message";
  try {
    await creerTourneeDistante(supabase, {
      numero: parseInt(tourneeNumeroInput.value, 10),
      email: tourneeEmailInput.value.trim(),
      motDePasse: tourneeMotDePasseInput.value,
    });
    dialogNouvelleTourneeAdmin.close();
    rafraichirListeTournees();
  } catch (err) {
    tourneeMessageEl.textContent = "Erreur : " + err.message;
    tourneeMessageEl.className = "connexion-message erreur";
  }
});

// --- Écran admin : détail d'une tournée ------------------------------------
async function afficherAdminTourneeDetail(tourneeId) {
  tourneeDetailCourante = tourneeId;
  masquerToutesLesVuesAdmin();
  vueAdminTourneeDetailEl.hidden = false;
  await rafraichirAdminTourneeDetail();
}

async function rafraichirAdminTourneeDetail() {
  const supabase = await getSupabaseClient();
  if (!supabase || !tourneeDetailCourante) return;

  const [tournees, agents] = await Promise.all([listerTournees(supabase), listerAgents(supabase)]);
  const tournee = tournees.find((t) => t.id === tourneeDetailCourante);
  if (!tournee) {
    afficherAdminTournees();
    return;
  }

  adminTourneeDetailTitreEl.textContent = libelleTournee(tournee);
  adminTourneeDetailCompteurEl.textContent = formaterCompteur(tournee.nombreTraitees, tournee.nombreAdresses);
  const pourcentage = tournee.nombreAdresses ? Math.round((tournee.nombreTraitees / tournee.nombreAdresses) * 100) : 0;
  adminTourneeDetailProgressEl.style.width = `${pourcentage}%`;

  // Amicalistes affectés (avec retrait) + formulaire d'affectation (seuls
  // les actifs pas déjà affectés apparaissent dans le menu déroulant).
  adminTourneeDetailAgentsEl.innerHTML = tournee.agents.length
    ? tournee.agents
        .map(
          (a) =>
            `<span class="agent-chip">${a.prenom} ${a.nom} <button type="button" data-retirer="${a.id}">×</button></span>`
        )
        .join("")
    : "<em>Aucun agent affecté</em>";
  adminTourneeDetailAgentsEl.querySelectorAll("[data-retirer]").forEach((btn) => {
    btn.addEventListener("click", async () => {
      try {
        await retirerAgent(supabase, tourneeDetailCourante, btn.dataset.retirer);
        rafraichirAdminTourneeDetail();
      } catch (err) {
        window.alert("Erreur : " + err.message);
      }
    });
  });

  const dejaAffectes = new Set(tournee.agents.map((a) => a.id));
  const optionsDisponibles = agents.filter((a) => a.actif && !dejaAffectes.has(a.id));
  adminTourneeDetailAssignEl.innerHTML = "";
  if (optionsDisponibles.length > 0) {
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
        await affecterAgent(supabase, tourneeDetailCourante, select.value);
        rafraichirAdminTourneeDetail();
      } catch (err) {
        window.alert("Erreur : " + err.message);
      }
    });
    adminTourneeDetailAssignEl.append(select, btnAssign);
  }

  await rafraichirDepotsTourneeAdmin(supabase);
  await rafraichirCartePdf(supabase);
}

async function rafraichirDepotsTourneeAdmin(supabase) {
  const depots = await listerDepotsTournee(supabase, tourneeDetailCourante);

  adminTourneeDetailDepotsEl.innerHTML = "";
  adminTourneeDetailDepotsVideEl.hidden = depots.length > 0;

  for (const depot of depots) {
    const li = document.createElement("li");
    const total = depot.montant_especes + depot.montant_cheques;
    li.innerHTML = `<span>${formaterDateDepot(depot.date)}</span><span>${formaterMontant(total)}</span>`;
    adminTourneeDetailDepotsEl.appendChild(li);
  }
}

async function rafraichirCartePdf(supabase) {
  adminCarteLienEl.hidden = true;
  btnSupprimerCarte.hidden = true;
  adminCarteStatutEl.textContent = "Vérification…";

  const url = await obtenirUrlCartePdf(supabase, tourneeDetailCourante);
  if (url) {
    adminCarteStatutEl.textContent = "Une carte a été importée pour cette tournée.";
    adminCarteLienEl.href = url;
    adminCarteLienEl.hidden = false;
    btnSupprimerCarte.hidden = false;
  } else {
    adminCarteStatutEl.textContent = "Aucune carte importée pour l'instant.";
  }
}

btnRetourAdminTournees.addEventListener("click", () => afficherAdminTournees());

btnImporterCarte.addEventListener("click", () => adminCarteFichierInput.click());
adminCarteFichierInput.addEventListener("change", async () => {
  const fichier = adminCarteFichierInput.files[0];
  adminCarteFichierInput.value = "";
  if (!fichier || !tourneeDetailCourante) return;

  const supabase = await getSupabaseClient();
  if (!supabase) return;
  adminCarteStatutEl.textContent = "Import en cours…";
  try {
    await uploaderCartePdf(supabase, tourneeDetailCourante, fichier);
  } catch (err) {
    window.alert("Erreur : " + err.message);
  }
  await rafraichirCartePdf(supabase);
});

btnSupprimerCarte.addEventListener("click", async () => {
  if (!window.confirm("Supprimer la carte PDF de cette tournée ?")) return;
  const supabase = await getSupabaseClient();
  if (!supabase || !tourneeDetailCourante) return;
  try {
    await supprimerCartePdf(supabase, tourneeDetailCourante);
  } catch (err) {
    window.alert("Erreur : " + err.message);
  }
  await rafraichirCartePdf(supabase);
});

btnSupprimerTournee.addEventListener("click", async () => {
  const supabase = await getSupabaseClient();
  if (!supabase || !tourneeDetailCourante) return;
  const tournees = await listerTournees(supabase);
  const tournee = tournees.find((t) => t.id === tourneeDetailCourante);
  if (!tournee) return;

  supprTourneeNumeroCibleEl.textContent = tournee.numero;
  supprTourneeNumeroSaisiInput.value = "";
  supprTourneeMessageEl.textContent = "";
  supprTourneeMessageEl.className = "connexion-message";
  dialogConfirmerSuppressionTournee.showModal();
});

supprTourneeAnnulerBtn.addEventListener("click", () => dialogConfirmerSuppressionTournee.close());

formConfirmerSuppressionTournee.addEventListener("submit", async (event) => {
  event.preventDefault();
  const supabase = await getSupabaseClient();
  if (!supabase || !tourneeDetailCourante) return;

  if (supprTourneeNumeroSaisiInput.value.trim() !== supprTourneeNumeroCibleEl.textContent.trim()) {
    supprTourneeMessageEl.textContent = "Le numéro saisi ne correspond pas.";
    supprTourneeMessageEl.className = "connexion-message erreur";
    return;
  }

  supprTourneeMessageEl.textContent = "Suppression en cours…";
  supprTourneeMessageEl.className = "connexion-message";
  try {
    await supprimerTourneeDistante(supabase, tourneeDetailCourante);
    dialogConfirmerSuppressionTournee.close();
    tourneeDetailCourante = null;
    afficherAdminTournees();
  } catch (err) {
    supprTourneeMessageEl.textContent = "Erreur : " + err.message;
    supprTourneeMessageEl.className = "connexion-message erreur";
  }
});

// --- Écran admin : Compta (à venir) -----------------------------------
function afficherAdminCompta() {
  masquerToutesLesVuesAdmin();
  vueAdminComptaEl.hidden = false;
}

paveAdminAgentsBtn.addEventListener("click", () => afficherAdminAgents());
paveAdminTourneesBtn.addEventListener("click", () => afficherAdminTournees());
paveAdminComptaBtn.addEventListener("click", () => afficherAdminCompta());
boutonsRetourAdminAccueil.forEach((btn) => btn.addEventListener("click", () => afficherAdminAccueil()));

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
