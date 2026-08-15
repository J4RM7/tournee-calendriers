// Export de fin de campagne (PDF / Excel) et réinitialisation, réservés à
// l'administrateur. Contrairement au reste de l'app, ça lit directement
// Supabase (pas le cache IndexedDB) pour avoir la vue complète et à jour
// de toutes les tournées, pas seulement celles de l'agent connecté.
import { trouverDonPourAnnee } from "./db.js";

const ENTETES = [
  "Tournée",
  "Commune",
  "Rue",
  "Numéro",
  "Nom de famille",
  "Passage 1",
  "Passage 2",
  "Passage 3",
  "Don (€)",
  "Mode de paiement",
  "Nom donateur",
  "Email donateur",
];

async function recupererDonneesCompletes(supabase) {
  const { data, error } = await supabase
    .from("tournees")
    .select(
      "numero, communes(nom, rues(nom, adresses(numero, nom_famille, passage_1, passage_2, passage_3, dons(montant, mode_paiement, refuse, nom_donateur, email_donateur, date))))"
    )
    .order("numero");

  if (error) throw error;

  const anneeCourante = new Date().getFullYear();
  const lignes = [];

  for (const tournee of data) {
    for (const commune of tournee.communes || []) {
      for (const rue of commune.rues || []) {
        for (const adresse of rue.adresses || []) {
          const don = trouverDonPourAnnee(adresse.dons || [], anneeCourante);
          lignes.push([
            tournee.numero,
            commune.nom,
            rue.nom,
            adresse.numero,
            adresse.nom_famille || "",
            adresse.passage_1,
            adresse.passage_2,
            adresse.passage_3,
            don ? (don.refuse ? "Refusé" : don.montant) : "",
            don && !don.refuse ? don.mode_paiement || "" : "",
            don?.nom_donateur || "",
            don?.email_donateur || "",
          ]);
        }
      }
    }
  }

  return lignes;
}

async function recupererDepotsComplets(supabase) {
  const { data, error } = await supabase
    .from("depots")
    .select("date, montant_especes, montant_cheques, nb_cheques, tournees(numero)")
    .order("date");

  if (error) throw error;

  return data.map((d) => [
    d.tournees?.numero ?? "",
    new Date(d.date).toLocaleDateString("fr-FR"),
    d.montant_especes,
    d.montant_cheques,
    d.montant_especes + d.montant_cheques,
  ]);
}

function telechargerBlob(blob, nomFichier) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = nomFichier;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

// "Excel" = un fichier CSV : s'ouvre nativement dans Excel/Numbers/Sheets,
// sans dépendre d'une librairie de génération .xlsx.
export async function exporterExcel(supabase) {
  const lignes = await recupererDonneesCompletes(supabase);
  const echapper = (v) => `"${String(v ?? "").replace(/"/g, '""')}"`;
  const csv = [ENTETES, ...lignes].map((ligne) => ligne.map(echapper).join(";")).join("\r\n");
  // BOM en tête pour qu'Excel reconnaisse les accents en UTF-8.
  const blob = new Blob(["﻿" + csv], { type: "text/csv;charset=utf-8;" });
  telechargerBlob(blob, `tournee-calendriers-${new Date().getFullYear()}.csv`);
}

export async function exporterPDF(supabase) {
  const { PDFDocument, StandardFonts } = await import("https://esm.sh/pdf-lib@1.17.1");
  const lignes = await recupererDonneesCompletes(supabase);
  const depots = await recupererDepotsComplets(supabase);

  const doc = await PDFDocument.create();
  const police = await doc.embedFont(StandardFonts.Helvetica);
  const policeGrasse = await doc.embedFont(StandardFonts.HelveticaBold);

  const largeurPage = 841.89; // A4 paysage, pour laisser de la place à toutes les colonnes
  const hauteurPage = 595.28;
  const marge = 30;
  const tailleTexte = 8;
  const hauteurLigne = 14;

  const colonnesDons = [
    { titre: "Tournée", largeur: 45 },
    { titre: "Commune", largeur: 85 },
    { titre: "Rue", largeur: 125 },
    { titre: "N°", largeur: 30 },
    { titre: "Nom", largeur: 85 },
    { titre: "P1", largeur: 35 },
    { titre: "P2", largeur: 35 },
    { titre: "P3", largeur: 35 },
    { titre: "Don (€)", largeur: 50 },
    { titre: "Paiement", largeur: 60 },
    { titre: "Donateur", largeur: 85 },
    { titre: "Email", largeur: 120 },
  ];

  const colonnesDepots = [
    { titre: "Tournée", largeur: 60 },
    { titre: "Date", largeur: 90 },
    { titre: "Espèces (€)", largeur: 90 },
    { titre: "Chèques (€)", largeur: 90 },
    { titre: "Total (€)", largeur: 90 },
  ];

  let page;
  let y;

  // colonnesActives est passé en paramètre (plutôt que fermé sur une seule
  // variable "colonnes") pour pouvoir dessiner deux tableaux différents
  // (dons puis dépôts) dans le même document, sans dupliquer toute la
  // mécanique de pagination.
  function dessinerEntetes(colonnesActives) {
    let x = marge;
    for (const col of colonnesActives) {
      page.drawText(col.titre, { x, y, size: tailleTexte, font: policeGrasse });
      x += col.largeur;
    }
    y -= hauteurLigne;
  }

  function nouvellePage(colonnesActives, titre) {
    page = doc.addPage([largeurPage, hauteurPage]);
    y = hauteurPage - marge;
    if (titre) {
      page.drawText(titre, { x: marge, y, size: 12, font: policeGrasse });
      y -= hauteurLigne * 1.5;
    }
    dessinerEntetes(colonnesActives);
  }

  nouvellePage(colonnesDons);

  for (const ligne of lignes) {
    if (y < marge + hauteurLigne) nouvellePage(colonnesDons);
    let x = marge;
    for (const [i, valeur] of ligne.entries()) {
      const texte = String(valeur ?? "").slice(0, 28);
      page.drawText(texte, { x, y, size: tailleTexte, font: police });
      x += colonnesDons[i].largeur;
    }
    y -= hauteurLigne;
  }

  // Section Dépôts : mêmes doc/polices, mais son propre tableau, sur une
  // nouvelle page pour ne pas mélanger les deux jeux de colonnes.
  nouvellePage(colonnesDepots, "Dépôts");

  for (const ligne of depots) {
    if (y < marge + hauteurLigne) nouvellePage(colonnesDepots);
    let x = marge;
    for (const [i, valeur] of ligne.entries()) {
      const texte = String(valeur ?? "").slice(0, 28);
      page.drawText(texte, { x, y, size: tailleTexte, font: police });
      x += colonnesDepots[i].largeur;
    }
    y -= hauteurLigne;
  }

  // useObjectStreams:false : la compression par flux d'objets de pdf-lib
  // (activée par défaut) produit ici un fichier corrompu (erreur zlib à la
  // lecture) avec ce nombre d'objets/police standard — désactivée pour un
  // PDF non compressé mais fiable, seul le contenu des pages reste compressé.
  const octets = await doc.save({ useObjectStreams: false });
  const blob = new Blob([octets], { type: "application/pdf" });
  telechargerBlob(blob, `tournee-calendriers-${new Date().getFullYear()}.pdf`);
}

// Couleurs officielles des billets (reprises de DENOMINATIONS dans app.js) et
// une teinte cuivrée générique pour les pièces — de simples formes dessinées
// (cercle/rectangle) plutôt que des emoji : les polices standard de pdf-lib
// (encodage WinAnsi) ne savent pas dessiner de vrais caractères emoji.
const COULEURS_BILLET_HEX = { 5: "#8c8c7a", 10: "#c0392b", 20: "#2980b9", 50: "#e67e22", 100: "#27ae60" };
const COULEUR_PIECE_HEX = "#c68a4e";

function hexVersRgbLib(hex, rgb) {
  const n = parseInt(hex.replace("#", ""), 16);
  return rgb(((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255);
}

// Reçu PDF d'un seul dépôt (téléchargé juste après confirmation côté agent) :
// une seule page, pas de pagination — inutilement lourd pour un simple
// ticket à joindre au dépôt physique au coffre.
export async function genererRapportDepot(depot, tournee, numero) {
  const { PDFDocument, StandardFonts, rgb } = await import("https://esm.sh/pdf-lib@1.17.1");

  const doc = await PDFDocument.create();
  const police = await doc.embedFont(StandardFonts.Helvetica);
  const policeGrasse = await doc.embedFont(StandardFonts.HelveticaBold);

  const largeurPage = 420;
  const hauteurPage = 780; // page plus haute + interlignage plus large : rendu "aéré"
  const marge = 40;
  const page = doc.addPage([largeurPage, hauteurPage]);
  let y = hauteurPage - marge;

  const couleurGrise = rgb(0.85, 0.85, 0.85);
  const couleurBordure = rgb(0.6, 0.6, 0.6);
  const couleurPiece = hexVersRgbLib(COULEUR_PIECE_HEX, rgb);
  const couleursBillet = Object.fromEntries(
    Object.entries(COULEURS_BILLET_HEX).map(([valeur, hex]) => [valeur, hexVersRgbLib(hex, rgb)])
  );

  const formater = (montant) => `${Number(montant).toFixed(2).replace(".", ",")} €`;

  const ecrire = (texte, { taille = 11, font = police, saut = 20 } = {}) => {
    page.drawText(texte, { x: marge, y, size: taille, font });
    y -= saut;
  };

  const ligneSeparation = (saut = 14) => {
    page.drawLine({
      start: { x: marge, y },
      end: { x: largeurPage - marge, y },
      thickness: 0.75,
      color: couleurGrise,
    });
    y -= saut;
  };

  // Icône (cercle plein pour une pièce, rectangle plein pour un billet,
  // rectangle vide pour un chèque) suivie du texte sur la même ligne.
  const ligneAvecIcone = (dessinerIcone, texte, { taille = 10, saut = 16 } = {}) => {
    dessinerIcone(marge + 6, y + taille * 0.32);
    page.drawText(texte, { x: marge + 20, y, size: taille, font: police });
    y -= saut;
  };
  const icPiece = (cx, cy) => page.drawEllipse({ x: cx, y: cy, xScale: 5, yScale: 5, color: couleurPiece });
  const icBillet = (couleur) => (cx, cy) =>
    page.drawRectangle({ x: cx - 7, y: cy - 4.5, width: 14, height: 9, color: couleur });
  const icCheque = (cx, cy) =>
    page.drawRectangle({ x: cx - 7, y: cy - 5, width: 14, height: 10, borderColor: couleurBordure, borderWidth: 1 });

  // --- En-tête ---------------------------------------------------------
  // Logo en haut à droite, en filigrane du texte d'en-tête (colonne de
  // gauche) : échec silencieux si l'image n'est pas joignable, ce n'est pas
  // bloquant pour la génération du reçu.
  try {
    const logoLargeur = 55;
    const logoHauteur = (logoLargeur * 160) / 138;
    const logoBytes = await (await fetch("/icons/logo-amicale-web.png")).arrayBuffer();
    const logo = await doc.embedPng(logoBytes);
    page.drawImage(logo, {
      x: largeurPage - marge - logoLargeur,
      y: hauteurPage - marge - logoHauteur + 8,
      width: logoLargeur,
      height: logoHauteur,
    });
  } catch (err) {
    console.warn("Logo introuvable pour le reçu :", err);
  }

  ecrire(`Reçu de dépôt n°${numero}`, { taille: 18, font: policeGrasse, saut: 30 });
  // Le n° de tournée est l'info la plus utile pour trier les reçus a
  // posteriori : mis en évidence, plus gros que le titre lui-même.
  ecrire(`Tournée n°${tournee?.numero ?? "—"}`, { taille: 22, font: policeGrasse, saut: 28 });
  const nomsAgents = (tournee?.agents || []).map((a) => `${a.prenom} ${a.nom}`.trim()).filter(Boolean);
  ecrire(`Agents : ${nomsAgents.length ? nomsAgents.join(", ") : "—"}`, { taille: 10, saut: 16 });
  // "Édité le" et non "Date du dépôt" : c'est le moment de génération du
  // reçu, pas celui où l'argent est physiquement remis au coffre — voir la
  // case "Dépôt réel au coffre" plus bas, remplie à la main.
  ecrire(`Édité le : ${new Date(depot.date).toLocaleString("fr-FR")}`, { taille: 10, saut: 20 });
  ligneSeparation();

  // --- Espèces, détaillées en pièces puis billets -----------------------
  ecrire("Espèces", { taille: 13, font: policeGrasse, saut: 20 });
  const detail = [...(depot.detail_especes || [])].sort((a, b) => b.valeur - a.valeur);
  const pieces = detail.filter((d) => d.valeur < 5);
  const billets = detail.filter((d) => d.valeur >= 5);

  ecrire("Pièces", { taille: 11, font: policeGrasse, saut: 18 });
  if (pieces.length === 0) {
    ecrire("Aucune pièce comptée.", { taille: 10, saut: 16 });
  } else {
    for (const { valeur, quantite } of pieces) {
      const label = valeur >= 1 ? `${valeur} €` : `${Math.round(valeur * 100)} c`;
      ligneAvecIcone(icPiece, `${label}  ×${quantite}  =  ${formater(valeur * quantite)}`);
    }
  }
  y -= 6;

  ecrire("Billets", { taille: 11, font: policeGrasse, saut: 18 });
  if (billets.length === 0) {
    ecrire("Aucun billet compté.", { taille: 10, saut: 16 });
  } else {
    for (const { valeur, quantite } of billets) {
      ligneAvecIcone(
        icBillet(couleursBillet[valeur] || couleurPiece),
        `${valeur} €  ×${quantite}  =  ${formater(valeur * quantite)}`
      );
    }
  }
  y -= 4;
  ecrire(`Total espèces : ${formater(depot.montant_especes)}`, { taille: 12, font: policeGrasse, saut: 22 });
  ligneSeparation();

  // --- Chèques, détaillés comme les billets --------------------------------
  ecrire("Chèques", { taille: 13, font: policeGrasse, saut: 20 });
  const detailCheques = [...(depot.detail_cheques || [])].sort((a, b) => b.valeur - a.valeur);
  if (detailCheques.length === 0) {
    // Anciens dépôts enregistrés avant l'ajout du détail : on retombe sur
    // le seul total déjà connu plutôt que de ne rien afficher.
    ligneAvecIcone(icCheque, `Nombre de chèques : ${depot.nb_cheques}`);
  } else {
    for (const { valeur, quantite } of detailCheques) {
      ligneAvecIcone(icCheque, `${formater(valeur)}  ×${quantite}  =  ${formater(valeur * quantite)}`);
    }
  }
  y -= 4;
  ecrire(`Total chèques : ${formater(depot.montant_cheques)}`, { taille: 12, font: policeGrasse, saut: 22 });
  ligneSeparation();

  // --- Total ---------------------------------------------------------------
  ecrire(`TOTAL DÉPOSÉ : ${formater(depot.montant_especes + depot.montant_cheques)}`, {
    taille: 15,
    font: policeGrasse,
    saut: 40,
  });

  ecrire("Signature :", { taille: 10, saut: 6 });
  page.drawLine({ start: { x: marge, y: y - 4 }, end: { x: marge + 200, y: y - 4 }, thickness: 0.5 });
  y -= 40;

  // --- Case à remplir à la main : date/heure du dépôt réel au coffre -------
  page.drawRectangle({
    x: marge - 8,
    y: y - 60,
    width: largeurPage - 2 * (marge - 8),
    height: 78,
    borderColor: couleurBordure,
    borderWidth: 1,
  });
  y -= 14;
  ecrire("Dépôt réel au coffre (à remplir à la main)", { taille: 10, font: policeGrasse, saut: 22 });
  page.drawText("Date :", { x: marge, y, size: 10, font: police });
  page.drawLine({ start: { x: marge + 40, y: y - 2 }, end: { x: marge + 180, y: y - 2 }, thickness: 0.5 });
  page.drawText("Heure :", { x: marge + 195, y, size: 10, font: police });
  page.drawLine({ start: { x: marge + 240, y: y - 2 }, end: { x: largeurPage - marge, y: y - 2 }, thickness: 0.5 });

  // useObjectStreams:false : la compression par flux d'objets de pdf-lib
  // (activée par défaut) produit ici un fichier corrompu (erreur zlib à la
  // lecture) avec ce nombre d'objets/police standard — désactivée pour un
  // PDF non compressé mais fiable, seul le contenu des pages reste compressé.
  const octets = await doc.save({ useObjectStreams: false });
  const blob = new Blob([octets], { type: "application/pdf" });
  const dateFichier = new Date(depot.date).toISOString().slice(0, 10);
  telechargerBlob(blob, `depot-tournee-${tournee?.numero ?? "x"}-n${numero}-${dateFichier}.pdf`);
}

// Remet à "à faire" les 3 passages de TOUTES les adresses, pour repartir
// sur une nouvelle campagne. Les adresses, noms et dons ne sont jamais
// touchés : les dons restent en base avec leur date (voir
// trouverDonPourAnnee dans db.js), donc l'historique reste consultable.
export async function reinitialiserCampagne(supabase) {
  const { error } = await supabase
    .from("adresses")
    .update({ passage_1: "a_faire", passage_2: "a_faire", passage_3: "a_faire" })
    .not("id", "is", null);

  if (error) throw error;
}
