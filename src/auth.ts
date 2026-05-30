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

  let role: Role = 'client';
  const { data: profil } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', session.user.id)
    .single();
  if (profil?.role === 'admin') role = 'admin';

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
