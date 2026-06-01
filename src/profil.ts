// Profil du client (âge, secteur d'activité, entreprise), collecté une fois à
// l'inscription. Stocké localement (AsyncStorage). Quand Supabase est configuré,
// on tente aussi de le pousser dans la table `profiles` (colonnes optionnelles) —
// mais l'app fonctionne entièrement sans cette migration : le profil est de toute
// façon copié (snapshot) dans chaque projet créé, donc visible côté admin.

import AsyncStorage from '@react-native-async-storage/async-storage';
import { sessionToken, supabaseDisponible, utilisateurCourant } from './auth';
import { ProfilClient } from './types';

const CLE = 'profil_client_v1';
const URL = (process.env.EXPO_PUBLIC_SUPABASE_URL || '').replace(/\/$/, '');
const ANON = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || '';

let cache: ProfilClient | null = null;

export async function chargerProfil(): Promise<ProfilClient | null> {
  if (cache) return cache;
  try {
    const brut = await AsyncStorage.getItem(CLE);
    if (brut) {
      cache = JSON.parse(brut) as ProfilClient;
      return cache;
    }
  } catch {
    /* ignore */
  }
  return null;
}

// Le profil est-il renseigné (secteur obligatoire) ?
export async function profilComplet(): Promise<boolean> {
  const p = await chargerProfil();
  return !!p && !!p.secteur && p.secteur.trim().length > 0;
}

export async function enregistrerProfil(p: ProfilClient): Promise<void> {
  // Email : on récupère celui de la session si disponible.
  let email = p.email;
  if (!email) {
    try {
      const u = await utilisateurCourant();
      email = u?.email ?? undefined;
    } catch {
      /* ignore */
    }
  }
  const complet: ProfilClient = { ...p, email, saisiLe: Date.now() };
  cache = complet;
  try {
    await AsyncStorage.setItem(CLE, JSON.stringify(complet));
  } catch {
    /* ignore */
  }
  // Best-effort : pousser dans Supabase (ignore si colonnes absentes / hors-ligne).
  if (supabaseDisponible()) {
    pousserSupabase(complet).catch(() => {});
  }
}

async function pousserSupabase(p: ProfilClient): Promise<void> {
  const token = sessionToken();
  if (!token) return;
  let uid: string | null = null;
  try {
    if (typeof localStorage !== 'undefined') {
      const s = localStorage.getItem('getexp_session_v1');
      if (s) uid = JSON.parse(s)?.user?.id ?? null;
    }
  } catch {
    /* ignore */
  }
  if (!uid) return;
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), 8000);
  try {
    await fetch(`${URL}/rest/v1/profiles?id=eq.${uid}`, {
      method: 'PATCH',
      headers: {
        apikey: ANON,
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
        Prefer: 'return=minimal',
      },
      body: JSON.stringify({
        age: p.age ?? null,
        secteur: p.secteur ?? null,
        entreprise: p.entreprise ?? null,
      }),
      signal: ctrl.signal,
    });
  } finally {
    clearTimeout(t);
  }
}
