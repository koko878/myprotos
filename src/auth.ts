// Authentification par lien magique (Supabase) + rôle utilisateur.
import { Platform } from 'react-native';
import { supabase, supabaseDisponible } from './supabase';

export type Role = 'client' | 'admin';

export interface Utilisateur {
  id: string;
  email: string | null;
  role: Role;
}

// URL de redirection après clic sur le lien magique.
// Web : on revient sur la page. Natif (APK) : deep link via le scheme de l'app.
function redirectTo(): string {
  if (Platform.OS === 'web' && typeof window !== 'undefined') {
    return window.location.origin + window.location.pathname;
  }
  return 'getexp://auth-callback';
}

// Envoie le lien magique à l'email. Renvoie null si OK, sinon un message.
export async function envoyerLienMagique(email: string): Promise<string | null> {
  if (!supabase) return 'Authentification non configurée.';
  const { error } = await supabase.auth.signInWithOtp({
    email: email.trim(),
    options: { emailRedirectTo: redirectTo() },
  });
  return error ? error.message : null;
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
