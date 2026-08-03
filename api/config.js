// Fonction serverless Vercel (déployée automatiquement pour tout fichier
// dans /api). Elle expose au front-end les variables d'environnement
// définies dans les réglages du projet Vercel, sans jamais les écrire en
// dur dans le code. Appelée par js/supabaseClient.js via fetch("/api/config").
//
// Ce fichier tourne uniquement sur les serveurs de Vercel (Node.js) : vous
// n'avez pas besoin de Node en local pour l'écrire ou le committer, il ne
// sert qu'au moment du déploiement.
module.exports = (req, res) => {
  res.setHeader("Cache-Control", "no-store");
  res.status(200).json({
    url: process.env.SUPABASE_URL || null,
    anonKey: process.env.SUPABASE_ANON_KEY || null,
  });
};
