// Crée une tournée ET son compte de connexion partagé (un identifiant
// pour toute la tournée, pas un par amicaliste — voir supabase/schema.sql).
// Nécessite la clé service_role, donc ne peut pas se faire depuis le
// navigateur : réservé à cette fonction serverless, appelée depuis
// l'écran admin (js/admin.js : creerTourneeDistante).
const { verifierAdmin, repondreErreur, clientServiceRole, ErreurApi } = require("../_lib/adminAuth");

module.exports = async (req, res) => {
  if (req.method !== "POST") {
    res.status(405).json({ error: "Méthode non autorisée." });
    return;
  }

  try {
    await verifierAdmin(req);

    const { numero, nomCommune, nomRue, email, motDePasse } = req.body || {};
    if (!numero || !nomCommune || !nomRue || !email || !motDePasse) {
      throw new ErreurApi(400, "Numéro, commune, rue, email et mot de passe sont tous requis.");
    }

    const { url, headers } = clientServiceRole();

    const reponseUser = await fetch(`${url}/auth/v1/admin/users`, {
      method: "POST",
      headers,
      body: JSON.stringify({ email, password: motDePasse, email_confirm: true }),
    });
    const nouvelUtilisateur = await reponseUser.json();
    if (!reponseUser.ok) {
      throw new ErreurApi(400, nouvelUtilisateur.msg || nouvelUtilisateur.error_description || "Échec de création du compte.");
    }

    const reponseTournee = await fetch(`${url}/rest/v1/tournees`, {
      method: "POST",
      headers: { ...headers, Prefer: "return=representation" },
      body: JSON.stringify({
        numero,
        nom_commune: nomCommune,
        nom_rue: nomRue,
        user_id: nouvelUtilisateur.id,
      }),
    });
    const tournees = await reponseTournee.json();
    if (!reponseTournee.ok) {
      // Compte créé mais fiche tournée impossible (ex : numéro déjà pris) :
      // on annule le compte pour ne pas laisser un identifiant orphelin.
      await fetch(`${url}/auth/v1/admin/users/${nouvelUtilisateur.id}`, { method: "DELETE", headers });
      throw new ErreurApi(400, tournees.message || "Échec de création de la tournée.");
    }

    res.status(201).json({ tournee: tournees[0] });
  } catch (err) {
    repondreErreur(res, err);
  }
};
