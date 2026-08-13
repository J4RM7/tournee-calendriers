// Supprime une tournée ET son compte de connexion partagé. La suppression
// de la tournée cascade côté Postgres sur communes/rues/adresses/dons
// (voir supabase/schema.sql) : irréversible, la confirmation stricte se
// fait côté écran admin (saisie du numéro) avant d'appeler cette route.
const { verifierAdmin, repondreErreur, clientServiceRole, ErreurApi } = require("../_lib/adminAuth");

module.exports = async (req, res) => {
  if (req.method !== "POST") {
    res.status(405).json({ error: "Méthode non autorisée." });
    return;
  }

  try {
    await verifierAdmin(req);

    const { tourneeId } = req.body || {};
    if (!tourneeId) {
      throw new ErreurApi(400, "tourneeId requis.");
    }

    const { url, headers } = clientServiceRole();

    const reponseLecture = await fetch(`${url}/rest/v1/tournees?id=eq.${tourneeId}&select=user_id`, { headers });
    const tournees = await reponseLecture.json();
    if (!reponseLecture.ok) {
      throw new ErreurApi(400, tournees.message || "Tournée introuvable.");
    }

    const userId = tournees[0]?.user_id;
    if (userId) {
      await fetch(`${url}/auth/v1/admin/users/${userId}`, { method: "DELETE", headers });
    }

    const reponseSuppr = await fetch(`${url}/rest/v1/tournees?id=eq.${tourneeId}`, { method: "DELETE", headers });
    if (!reponseSuppr.ok) {
      const erreur = await reponseSuppr.json();
      throw new ErreurApi(400, erreur.message || "Échec de suppression de la tournée.");
    }

    res.status(200).json({ ok: true });
  } catch (err) {
    repondreErreur(res, err);
  }
};
