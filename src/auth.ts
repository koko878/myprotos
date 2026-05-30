// Authentification par email + mot de passe (Supabase) + rôle utilisateur.
import { supabase, supabaseDisponible } from './supabase';

export type Role = 'client' | 'admin';

export interface Utilisateur {
  id: string;
  email: string | null;
  role: Role;
}

// Inscription par email + mot de passe. Renvoie null si OK, sinon un message.
export async function inscription(email: string, motDePasse: string): Promise<string | null> {
  if (!supabase) return 'Authentification non configurée.';
  const { error } = await supabase.auth.signUp({
    email: email.trim(),
    password: motDePasse,
  });
  return error ? traduireErreur(error.message) : null;
}

// Connexion par email + mot de passe. Renvoie null si OK, sinon un message.
export async function connexion(email: string, motDePasse: string): Promise<string | null> {
  if (!supabase) return 'Authentification non configurée.';
  const { error } = await supabase.auth.signInWithPassword({
    email: email.trim(),
    password: motDePasse,
  });
  return error ? traduireErreur(error.message) : null;
}

// Connexion OU inscription en une seule action (robuste pour les tests) :
// on tente de se connecter ; si le compte n'existe pas, on le crée et on
// réessaie. Renvoie null si OK, sinon un message d'erreur clair.
export async function connexionOuInscription(
  email: string,
  motDePasse: string
): Promise<string | null> {
  if (!supabase) return 'Authentification non configurée.';
  const e = email.trim();

  // 1) Tentative de connexion directe.
  const { error: errLogin } = await supabase.auth.signInWithPassword({
    email: e,
    password: motDePasse,
  });
  if (!errLogin) return null; // connecté

  const msg = errLogin.message.toLowerCase();

  // 2) Identifiants invalides -> peut-être que le compte n'existe pas : on tente
  //    une inscription, puis une reconnexion.
  if (msg.includes('invalid login')) {
    const { error: errSignup } = await supabase.auth.signUp({ email: e, password: motDePasse });
    if (errSignup) {
      const m2 = errSignup.message.toLowerCase();
      // Le compte existe déjà -> c'était donc un vrai mauvais mot de passe.
      if (m2.includes('already')) return 'Mot de passe incorrect pour cet email.';
      return traduireErreur(errSignup.message);
    }
    // Inscription OK : si une session est créée, c'est bon ; sinon on reconnecte.
    const { data } = await supabase.auth.getSession();
    if (data.session) return null;
    const { error: errLogin2 } = await supabase.auth.signInWithPassword({ email: e, password: motDePasse });
    if (!errLogin2) return null;
    // Pas de session après inscription => confirmation email probablement activée.
    return 'Compte créé, mais la confirmation par email est activée. Désactivez-la dans Supabase (Authentication → Email → Confirm email) pour vous connecter sans email.';
  }

  return traduireErreur(errLogin.message);
}

// Traduit les messages d'erreur Supabase courants en français.
function traduireErreur(msg: string): string {
  const m = msg.toLowerCase();
  if (m.includes('invalid login')) return 'Email ou mot de passe incorrect.';
  if (m.includes('already registered') || m.includes('already been registered'))
    return 'Un compte existe déjà avec cet email — connectez-vous.';
  if (m.includes('password') && m.includes('6')) return 'Le mot de passe doit faire au moins 6 caractères.';
  if (m.includes('email not confirmed')) return 'Email non confirmé. Vérifiez votre boîte mail.';
  return msg;
}

// Récupère l'utilisateur courant (avec son rôle), ou null si non connecté.
export async function utilisateurCourant(): Promise<Utilisateur | null> {
  if (!supabase) return null;
  const { data } = await supabase.auth.getSession();
  const session = data.session;
  if (!session?.user) return null;

  // Le rôle est secondaire : on ne bloque jamais la connexion dessus. Requête
  // protégée par un délai max pour éviter tout gel de l'UI.
  let role: Role = 'client';
  try {
    const requete = supabase
      .from('profiles')
      .select('role')
      .eq('id', session.user.id)
      .single();
    const delai = new Promise<{ data: null }>((r) => setTimeout(() => r({ data: null }), 4000));
    const { data: profil } = (await Promise.race([requete, delai])) as { data: { role?: string } | null };
    if (profil?.role === 'admin') role = 'admin';
  } catch {
    /* rôle par défaut: client */
  }

  return { id: session.user.id, email: session.user.email ?? null, role };
}

export async function deconnexion(): Promise<void> {
  if (supabase) await supabase.auth.signOut();
}

// Permet à l'app de réagir aux changements de session (connexion/déconnexion).
export function surChangementAuth(cb: () => void): () => void {
  if (!supabase) return () => {};
  const { data } = supabase.auth.onAuthStateChange(() => cb());
  return () => data.subscription.unsubscribe();
}

export { supabaseDisponible };
