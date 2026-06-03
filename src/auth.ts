// Authentification email + mot de passe — APPELS REST DIRECTS à Supabase.
//
// Pourquoi pas le SDK ? Sur web, supabase-js synchronise la session via des
// verrous (Web Locks) et un getSession() qui peuvent rester BLOQUÉS (surtout
// avec plusieurs onglets), d'où "connexion trop longue". On contourne tout ça :
// on appelle directement l'API GoTrue par fetch (timeout court garanti) et on
// stocke nous-mêmes la session. Le client supabase (pour la DB) lit ce token.

const URL = (process.env.EXPO_PUBLIC_SUPABASE_URL || '').replace(/\/$/, '');
const ANON = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || '';
const CLE_SESSION = 'getexp_session_v1';

export function supabaseDisponible(): boolean {
  return URL.length > 0 && ANON.length > 0;
}

export type Role = 'client' | 'admin';

export interface Utilisateur {
  id: string;
  email: string | null;
  role: Role;
}

interface Session {
  access_token: string;
  refresh_token: string;
  user: { id: string; email?: string | null };
}

// --- Stockage local de la session (web localStorage, fallback mémoire) -------
let sessionMemoire: Session | null = null;

function lireSession(): Session | null {
  try {
    if (typeof localStorage !== 'undefined') {
      const s = localStorage.getItem(CLE_SESSION);
      return s ? (JSON.parse(s) as Session) : null;
    }
  } catch {
    /* ignore */
  }
  return sessionMemoire;
}

function ecrireSession(s: Session | null) {
  sessionMemoire = s;
  try {
    if (typeof localStorage !== 'undefined') {
      if (s) localStorage.setItem(CLE_SESSION, JSON.stringify(s));
      else localStorage.removeItem(CLE_SESSION);
    }
  } catch {
    /* ignore */
  }
}

export function sessionToken(): string | null {
  return lireSession()?.access_token ?? null;
}

// Rafraîchit le token via le refresh_token (les access_token expirent ~1h).
// Renvoie le nouveau token, ou null si échec. Met à jour la session stockée.
export async function rafraichirSession(): Promise<string | null> {
  const s = lireSession();
  if (!s?.refresh_token || !supabaseDisponible()) return null;
  try {
    const r = await poste('/auth/v1/token?grant_type=refresh_token', {
      refresh_token: s.refresh_token,
    });
    if (r.ok && r.data?.access_token) {
      ecrireSession(r.data);
      return r.data.access_token as string;
    }
  } catch {
    /* ignore */
  }
  return null;
}

// --- fetch avec timeout (jamais de blocage infini) ---------------------------
async function poste(path: string, body: object, ms = 12000): Promise<{ ok: boolean; status: number; data: any }> {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), ms);
  try {
    const r = await fetch(`${URL}${path}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', apikey: ANON, Authorization: `Bearer ${ANON}` },
      body: JSON.stringify(body),
      signal: ctrl.signal,
    });
    let data: any = null;
    try { data = await r.json(); } catch { /* pas de corps */ }
    return { ok: r.ok, status: r.status, data };
  } finally {
    clearTimeout(t);
  }
}

const abonnes = new Set<() => void>();
function notifier() { abonnes.forEach((cb) => { try { cb(); } catch { /* ignore */ } }); }

// --- Connexion (compte EXISTANT uniquement) ----------------------------------
export async function connexion(email: string, motDePasse: string): Promise<string | null> {
  if (!supabaseDisponible()) return 'Authentification non configurée.';
  const e = email.trim();
  try {
    const res = await poste('/auth/v1/token?grant_type=password', { email: e, password: motDePasse });
    if (res.ok && res.data?.access_token) {
      ecrireSession(res.data);
      notifier();
      return null;
    }
    const msg = String(res.data?.error_description || res.data?.msg || res.data?.error || '').toLowerCase();
    if (msg.includes('email not confirmed')) {
      return 'Email non confirmé. Vérifiez votre boîte mail.';
    }
    if (msg.includes('invalid') || res.status === 400) {
      return 'Email ou mot de passe incorrect. Pas encore de compte ? Inscrivez-vous.';
    }
    return traduireErreur(msg || 'Échec de la connexion.');
  } catch (err: any) {
    if (err?.name === 'AbortError') return 'Connexion trop longue. Vérifiez votre réseau et réessayez.';
    return 'Erreur de connexion. Réessayez.';
  }
}

// --- Inscription (création d'un NOUVEAU compte) -------------------------------
// Renvoie { erreur } si échec, ou { besoinConfirmation } si l'email doit être
// confirmé (compte créé mais pas de session tant que non confirmé).
export async function inscription(
  email: string,
  motDePasse: string
): Promise<{ erreur?: string; besoinConfirmation?: boolean }> {
  if (!supabaseDisponible()) return { erreur: 'Authentification non configurée.' };
  const e = email.trim();
  try {
    const signup = await poste('/auth/v1/signup', { email: e, password: motDePasse });
    // Compte créé ET session ouverte (confirmation email désactivée).
    if (signup.ok && signup.data?.access_token) {
      ecrireSession(signup.data);
      notifier();
      return {};
    }
    const m = String(signup.data?.error_description || signup.data?.msg || signup.data?.error || '').toLowerCase();
    if (m.includes('already') || m.includes('registered')) {
      return { erreur: 'Un compte existe déjà avec cet email. Connectez-vous.' };
    }
    // Compte créé sans session = confirmation par email requise.
    if (signup.ok) {
      return { besoinConfirmation: true };
    }
    return { erreur: traduireErreur(m || 'Échec de l’inscription.') };
  } catch (err: any) {
    if (err?.name === 'AbortError') return { erreur: 'Connexion trop longue. Réessayez.' };
    return { erreur: 'Erreur lors de l’inscription. Réessayez.' };
  }
}

// --- Réinitialisation du mot de passe (envoi d'un email de reset) -------------
export async function reinitialiserMotDePasse(email: string): Promise<string | null> {
  if (!supabaseDisponible()) return 'Authentification non configurée.';
  const e = email.trim();
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(e)) return 'Entrez une adresse email valide.';
  try {
    // GoTrue /recover : envoie le mail de réinitialisation. Réponse 200 même si
    // l'email n'existe pas (anti-énumération) — on affiche donc un message neutre.
    await poste('/auth/v1/recover', { email: e });
    return null;
  } catch {
    return 'Impossible d’envoyer l’email pour le moment. Réessayez.';
  }
}

// --- Compat : connexion OU inscription en une action (ancien comportement) ----
export async function connexionOuInscription(email: string, motDePasse: string): Promise<string | null> {
  const errConn = await connexion(email, motDePasse);
  if (!errConn) return null;
  // Si la connexion échoue pour identifiants invalides, on tente l'inscription.
  const res = await inscription(email, motDePasse);
  if (res.besoinConfirmation) {
    return 'Compte créé : vérifiez votre email pour confirmer votre inscription.';
  }
  return res.erreur ?? null;
}

function traduireErreur(msg: string): string {
  const m = msg.toLowerCase();
  if (m.includes('invalid')) return 'Email ou mot de passe incorrect.';
  if (m.includes('already') || m.includes('registered')) return 'Un compte existe déjà — connectez-vous.';
  if (m.includes('password') && m.includes('6')) return 'Le mot de passe doit faire au moins 6 caractères.';
  if (m.includes('email not confirmed')) return 'Email non confirmé. Désactivez « Confirm email » dans Supabase.';
  return msg || 'Erreur.';
}

// --- Utilisateur courant (lecture locale instantanée + rôle via REST) --------
export async function utilisateurCourant(): Promise<Utilisateur | null> {
  const s = lireSession();
  if (!s?.user?.id) return null;

  let role: Role = 'client';
  try {
    const lire = async (token: string) => {
      const ctrl = new AbortController();
      const t = setTimeout(() => ctrl.abort(), 5000);
      try {
        return await fetch(`${URL}/rest/v1/profiles?id=eq.${s.user.id}&select=role`, {
          headers: { apikey: ANON, Authorization: `Bearer ${token}` },
          signal: ctrl.signal,
        });
      } finally {
        clearTimeout(t);
      }
    };
    let r = await lire(s.access_token);
    if (r.status === 401) {
      const frais = await rafraichirSession();
      if (frais) r = await lire(frais);
    }
    const arr = await r.json().catch(() => []);
    if (Array.isArray(arr) && arr[0]?.role === 'admin') role = 'admin';
  } catch {
    /* rôle par défaut: client */
  }

  return { id: s.user.id, email: s.user.email ?? null, role };
}

export async function deconnexion(): Promise<void> {
  ecrireSession(null);
  notifier();
}

export function surChangementAuth(cb: () => void): () => void {
  abonnes.add(cb);
  return () => abonnes.delete(cb);
}
