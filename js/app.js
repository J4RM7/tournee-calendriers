import {
  seedIfEmpty,
  getTournee,
  getAdressesByTournee,
  updateAdressePassage,
  addDon,
  getDonsByAdresse,
  DEMO_TOURNEE_ID,
  DEMO_AGENT_ID,
} from "./db.js";
import { getSupabaseClient } from "./supabaseClient.js";
import {
  getSession,
  envoyerLienConnexion,
  deconnecter,
  ecouterChangementsAuth,
  getAgentPourUtilisateur,
} from "./auth.js";
import { synchroniserDonneesAgent } from "./sync.js";
import { listerTournees, listerAgents, creerTournee, affecterAgent, retirerAgent } from "./admin.js";

const PROCHAIN_ETAT_PASSAGE = { a_faire: "passe", passe: "absent", absent: "a_faire" };
const LABEL_PASSAGE = { a_faire: "à faire", passe: "passé", absent: "absent" };

const secteurNomEl = document.getElementById("rue-nom");
const rueCompteurEl = document.getElementById("rue-compteur");
const progressFillEl = document.getElementById("progress-fill");
const listeEl = document.getElementById("liste-adresses");
const statutConnexionEl = document.getElementById("statut-connexion");
const appEl = document.getElementById("app");
const agentBadgeEl = document.getElementById("agent-badge");
const btnDeconnexion = document.getElementById("btn-deconnexion");
const tourneeInfoEl = document.getElementById("tournee-info");
const btnAdmin = document.getElementById("btn-admin");

const ecranConnexionEl = document.getElementById("ecran-connexion");
const formConnexion = document.getElementById("form-connexion");
const connexionEmailInput = document.getElementById("connexion-email");
const connexionMessageEl = document.getElementById("connexion-message");
const btnModeDemo = document.getElementById("btn-mode-demo");

const ecranAdminEl = document.getElementById("ecran-admin");
const formNouvelleTournee = document.getElementById("form-nouvelle-tournee");
const adminNumeroInput = document.getElementById("admin-numero");
const adminCommuneInput = document.getElementById("admin-commune");
const adminRueInput = document.getElementById("admin-rue");
const adminMessageEl = document.getElementById("admin-message");
const adminListeTourneesEl = document.getElementById("admin-liste-tournees");

const dialogDon = document.getElementById("dialog-don");
const formDon = document.getElementById("form-don");
const donAdresseLabel = document.getElementById("don-adresse-label");
const donAnnulerBtn = document.getElementById("don-annuler");
const donChoixDonneBtn = document.getElementById("don-choix-donne");
const donChoixRefuseBtn = document.getElementById("don-choix-refuse");
const donChampsMontantEl = document.getElementById("don-champs-montant");

let adresseCourante = null;
let refuseSelectionne = false;

// Agent actif pour cette session d'écran : soit l'agent réel connecté via
// Supabase Auth, soit l'agent démo (mode hors-ligne sans compte).
let agentActuel = null;
let tourneeActuelleId = null;
let modeDemo = false;
let vueActuelle = "connexion"; // "connexion" | "app" | "admin"
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
  btnAdmin.hidden = true;
  tourneeInfoEl.hidden = true;
}

function afficherApp() {
  vueActuelle = "app";
  ecranConnexionEl.hidden = true;
  ecranAdminEl.hidden = true;
  appEl.hidden = false;

  if (modeDemo) {
    agentBadgeEl.textContent = "Mode démo";
    agentBadgeEl.hidden = false;
    btnDeconnexion.hidden = true;
    btnAdmin.hidden = true;
  } else {
    agentBadgeEl.textContent = `${agentActuel.prenom} ${agentActuel.nom}`;
    agentBadgeEl.hidden = false;
    btnDeconnexion.hidden = false;
    btnAdmin.hidden = !agentActuel.est_admin;
    btnAdmin.textContent = "Administration";
  }

  afficherAdresses();
}

async function afficherAdmin() {
  vueActuelle = "admin";
  ecranConnexionEl.hidden = true;
  appEl.hidden = true;
  ecranAdminEl.hidden = false;
  btnAdmin.textContent = "Retour à ma tournée";
  await chargerEtAfficherAdmin();
}

btnAdmin.addEventListener("click", () => {
  if (vueActuelle === "admin") {
    afficherApp();
  } else {
    afficherAdmin();
  }
});

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
  if (!email) return;

  afficherMessageConnexion("Envoi du lien en cours…");
  try {
    await envoyerLienConnexion(email);
    afficherMessageConnexion("Lien envoyé ! Vérifiez votre boîte mail.", "succes");
  } catch (err) {
    afficherMessageConnexion("Échec de l'envoi : " + err.message, "erreur");
  }
});

btnModeDemo.addEventListener("click", activerModeDemo);

btnDeconnexion.addEventListener("click", async () => {
  await deconnecter();
  agentActuel = null;
  tourneeActuelleId = null;
  modeDemo = false;
  afficherEcranConnexion();
});

// --- Affichage de la tournée / rue / liste ---------------------------
function estAdresseTraitee(adresse) {
  return [adresse.passage_1, adresse.passage_2, adresse.passage_3].some((p) => p !== "a_faire");
}

function formaterMontant(montant) {
  return Number(montant).toFixed(2).replace(".", ",") + " €";
}

async function afficherAdresses() {
  const tournee = await getTournee(tourneeActuelleId);

  if (tournee) {
    secteurNomEl.textContent = tournee.nom_rue;
    const noms = (tournee.agents || [])
      .map((a) => `${a.prenom} ${a.nom}`.trim())
      .filter(Boolean);
    tourneeInfoEl.textContent = `Tournée n°${tournee.numero}` + (noms.length ? ` — ${noms.join(", ")}` : "");
    tourneeInfoEl.hidden = false;
  } else {
    secteurNomEl.textContent = "Aucune tournée assignée pour l'instant";
    tourneeInfoEl.hidden = true;
  }

  const adresses = tourneeActuelleId ? await getAdressesByTournee(tourneeActuelleId) : [];
  adresses.sort((a, b) => Number(a.numero) - Number(b.numero));

  const total = adresses.length;
  const traitees = adresses.filter(estAdresseTraitee).length;
  rueCompteurEl.textContent = `${traitees} / ${total} maison${total > 1 ? "s" : ""}`;
  progressFillEl.style.width = total ? `${Math.round((traitees / total) * 100)}%` : "0%";

  listeEl.innerHTML = "";
  for (const adresse of adresses) {
    const dons = await getDonsByAdresse(adresse.id);
    listeEl.appendChild(creerLigneAdresse(adresse, dons));
  }
}

function creerLigneAdresse(adresse, dons) {
  const li = document.createElement("li");
  li.className = "adresse-item";

  const info = document.createElement("div");
  info.className = "adresse-info";
  const prefixeNom = adresse.nom_famille
    ? `<span class="adresse-nom">${adresse.nom_famille}</span> — `
    : "";
  info.innerHTML = `
    <div class="adresse-ligne">${prefixeNom}${adresse.numero} ${adresse.rue}</div>
    ${adresse.notes ? `<div class="adresse-notes">${adresse.notes}</div>` : ""}
  `;

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
      await updateAdressePassage(adresse.id, n, nouvelEtat);
      pousserVersSupabase("adresses", {
        id: adresse.id,
        tournee_id: adresse.tournee_id,
        numero: adresse.numero,
        rue: adresse.rue,
        commune: adresse.commune,
        nom_famille: adresse.nom_famille,
        notes: adresse.notes,
        [`passage_${n}`]: nouvelEtat,
      });
      afficherAdresses();
    });
    passagesEl.appendChild(btn);
  }

  const donActif = dons.find((d) => d.refuse) || dons.find((d) => d.montant > 0);
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

  li.append(info, passagesEl, donBtn);
  return li;
}

// --- Formulaire don -------------------------------------------------------
function definirChoixDon(refuse) {
  refuseSelectionne = refuse;
  donChoixDonneBtn.classList.toggle("actif", !refuse);
  donChoixRefuseBtn.classList.toggle("actif", refuse);
  donChampsMontantEl.hidden = refuse;
}

donChoixDonneBtn.addEventListener("click", () => definirChoixDon(false));
donChoixRefuseBtn.addEventListener("click", () => definirChoixDon(true));

function ouvrirDialogDon(adresse) {
  adresseCourante = adresse;
  donAdresseLabel.textContent = `Don - ${adresse.numero} ${adresse.rue}`;
  formDon.reset();
  definirChoixDon(false);
  dialogDon.showModal();
}

donAnnulerBtn.addEventListener("click", () => dialogDon.close());

formDon.addEventListener("submit", async () => {
  if (!adresseCourante) return;

  const don = await addDon({
    adresse_id: adresseCourante.id,
    agent_id: agentActuel.id,
    refuse: refuseSelectionne,
    montant: refuseSelectionne ? 0 : parseFloat(document.getElementById("don-montant").value || "0"),
    mode_paiement: refuseSelectionne ? null : document.getElementById("don-mode").value,
    nom_donateur: document.getElementById("don-nom").value.trim() || null,
    email_donateur: document.getElementById("don-email").value.trim() || null,
  });
  pousserVersSupabase("dons", don);

  adresseCourante = null;
  afficherAdresses();
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

    li.innerHTML = `
      <div class="admin-tournee-titre">Tournée n°${t.numero} — ${t.nom_rue}, ${t.nom_commune}</div>
      <div class="admin-tournee-meta">${t.nombreAdresses} adresse(s)</div>
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
