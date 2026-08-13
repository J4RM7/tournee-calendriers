// Aide partagée par les fonctions serverless sous api/admin/*. Préfixée
// "_lib" pour que Vercel ne la déploie pas comme une route à part entière.
//
// Ces routes utilisent la clé service_role (jamais exposée au navigateur)
// pour des opérations que la clé anon + RLS ne permettent pas (créer/
// supprimer un compte Supabase Auth). Avant toute action, on vérifie donc
// nous-mêmes, côté serveur, que l'appelant est bien un admin authentifié —
// ne jamais faire confiance à un flag envoyé par le client.
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

class ErreurApi extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}

// Vérifie le bearer token de la requête et que le compte associé est
// admin. Retourne { uid } si tout est bon, sinon lève une ErreurApi
// (status 401/403/500) à laisser remonter tel quel dans la réponse HTTP.
async function verifierAdmin(req) {
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY || !SUPABASE_SERVICE_ROLE_KEY) {
    throw new ErreurApi(500, "Configuration serveur incomplète (variables Supabase manquantes).");
  }

  const entete = req.headers.authorization || "";
  const token = entete.startsWith("Bearer ") ? entete.slice(7) : null;
  if (!token) {
    throw new ErreurApi(401, "Authentification requise.");
  }

  const reponseUser = await fetch(`${SUPABASE_URL}/auth/v1/user`, {
    headers: { apikey: SUPABASE_ANON_KEY, Authorization: `Bearer ${token}` },
  });
  if (!reponseUser.ok) {
    throw new ErreurApi(401, "Session invalide ou expirée.");
  }
  const user = await reponseUser.json();

  const reponseAgent = await fetch(
    `${SUPABASE_URL}/rest/v1/agents?user_id=eq.${user.id}&select=est_admin`,
    {
      headers: {
        apikey: SUPABASE_SERVICE_ROLE_KEY,
        Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
      },
    }
  );
  if (!reponseAgent.ok) {
    throw new ErreurApi(500, "Impossible de vérifier les droits.");
  }
  const agents = await reponseAgent.json();
  if (!agents[0]?.est_admin) {
    throw new ErreurApi(403, "Réservé à l'amicale (compte admin).");
  }

  return { uid: user.id };
}

function repondreErreur(res, err) {
  const status = err instanceof ErreurApi ? err.status : 500;
  res.status(status).json({ error: err.message || "Erreur serveur." });
}

function clientServiceRole() {
  return {
    url: SUPABASE_URL,
    headers: {
      apikey: SUPABASE_SERVICE_ROLE_KEY,
      Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
      "Content-Type": "application/json",
    },
  };
}

module.exports = { verifierAdmin, repondreErreur, clientServiceRole, ErreurApi };
