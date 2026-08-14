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

  const octets = await doc.save();
  const blob = new Blob([octets], { type: "application/pdf" });
  telechargerBlob(blob, `tournee-calendriers-${new Date().getFullYear()}.pdf`);
}

// Reçu PDF d'un seul dépôt (téléchargé juste après confirmation côté agent) :
// une seule page, pas de pagination — inutilement lourd pour un simple
// ticket à joindre au dépôt physique au coffre.
export async function genererRapportDepot(depot, tournee) {
  const { PDFDocument, StandardFonts } = await import("https://esm.sh/pdf-lib@1.17.1");

  const doc = await PDFDocument.create();
  const police = await doc.embedFont(StandardFonts.Helvetica);
  const policeGrasse = await doc.embedFont(StandardFonts.HelveticaBold);

  const hauteurPage = 595.28;
  const marge = 40;
  const page = doc.addPage([420, hauteurPage]);
  let y = hauteurPage - marge;

  const formater = (montant) => `${Number(montant).toFixed(2).replace(".", ",")} €`;
  const ecrire = (texte, { taille = 11, font = police, saut = 18 } = {}) => {
    page.drawText(texte, { x: marge, y, size: taille, font });
    y -= saut;
  };

  ecrire("Reçu de dépôt", { taille: 18, font: policeGrasse, saut: 28 });
  ecrire(`Tournée n°${tournee?.numero ?? "—"}`, { taille: 12, font: policeGrasse });
  ecrire(`Date du dépôt : ${new Date(depot.date).toLocaleString("fr-FR")}`);
  y -= 8;

  ecrire("Détail des espèces", { taille: 12, font: policeGrasse });
  const detail = [...(depot.detail_especes || [])].sort((a, b) => b.valeur - a.valeur);
  if (detail.length === 0) {
    ecrire("Aucune pièce ou billet compté.", { taille: 10 });
  } else {
    for (const { valeur, quantite } of detail) {
      const label = valeur >= 1 ? `${valeur} €` : `${Math.round(valeur * 100)} c`;
      ecrire(`${label}  x${quantite}  =  ${formater(valeur * quantite)}`, { taille: 10, saut: 15 });
    }
  }
  y -= 4;
  ecrire(`Total espèces : ${formater(depot.montant_especes)}`, { taille: 11, font: policeGrasse });
  y -= 8;

  ecrire("Chèques", { taille: 12, font: policeGrasse });
  ecrire(`Nombre de chèques : ${depot.nb_cheques}`);
  ecrire(`Montant total des chèques : ${formater(depot.montant_cheques)}`);
  y -= 10;

  ecrire(`TOTAL DÉPOSÉ : ${formater(depot.montant_especes + depot.montant_cheques)}`, {
    taille: 14,
    font: policeGrasse,
    saut: 40,
  });

  ecrire("Signature :", { taille: 10, saut: 4 });
  page.drawLine({ start: { x: marge, y: y - 6 }, end: { x: marge + 200, y: y - 6 }, thickness: 0.5 });

  const octets = await doc.save();
  const blob = new Blob([octets], { type: "application/pdf" });
  const dateFichier = new Date(depot.date).toISOString().slice(0, 10);
  telechargerBlob(blob, `depot-tournee-${tournee?.numero ?? "x"}-${dateFichier}.pdf`);
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
