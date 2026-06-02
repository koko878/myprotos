// Réglages partagés (overrides de prompts des agents IA), éditables côté admin.
//
// Enjeu : les agents de cadrage/challenge tournent sur l'appareil du CLIENT.
// Pour qu'un prompt ajusté par l'admin atteigne réellement les clients, il doit
// être PARTAGÉ. On le stocke donc dans une table Supabase `reglages` (lecture
// pour tous, écriture admin), avec repli AsyncStorage (mode démo/hors-ligne) et,
// au pire, le prompt par défaut passé à l'appel. Jamais d'exception propagée.

import AsyncStorage from '@react-native-async-storage/async-storage';
import { rafraichirSession, sessionToken, supabaseDisponible } from './auth';

const URL = (process.env.EXPO_PUBLIC_SUPABASE_URL || '').replace(/\/$/, '');
const ANON = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || '';
const CLE_LOCALE = 'reglages_v1';

// Cache mémoire + promesse de chargement (pour ne charger qu'une fois).
let cache: Record<string, string> | null = null;
let chargement: Promise<Record<string, string>> | null = null;

function headers(token: string): Record<string, string> {
  return { apikey: ANON, Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' };
}

async function lireLocal(): Promise<Record<string, string>> {
  try {
    const brut = await AsyncStorage.getItem(CLE_LOCALE);
    return brut ? (JSON.parse(brut) as Record<string, string>) : {};
  } catch {
    return {};
  }
}

async function ecrireLocal(map: Record<string, string>): Promise<void> {
  try {
    await AsyncStorage.setItem(CLE_LOCALE, JSON.stringify(map));
  } catch {
    /* ignore */
  }
}

// Récupère tous les réglages distants (cle -> valeur). Repli local si indispo.
async function chargerDepuisSource(): Promise<Record<string, string>> {
  if (!supabaseDisponible()) return lireLocal();
  const faire = async (token: string) => {
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), 8000);
    try {
      return await fetch(`${URL}/rest/v1/reglages?select=cle,valeur`, {
        headers: headers(token),
        signal: ctrl.signal,
      });
    } finally {
      clearTimeout(t);
    }
  };
  try {
    let r = await faire(sessionToken() || ANON);
    if (r.status === 401) {
      const frais = await rafraichirSession();
      if (frais) r = await faire(frais);
    }
    if (!r.ok) return lireLocal();
    const arr = await r.json().catch(() => []);
    const map: Record<string, string> = {};
    if (Array.isArray(arr)) {
      for (const row of arr) {
        if (row?.cle && typeof row.valeur === 'string') map[row.cle] = row.valeur;
      }
    }
    await ecrireLocal(map); // miroir local (repli hors-ligne)
    return map;
  } catch {
    return lireLocal();
  }
}

// Charge (une fois) et met en cache l'ensemble des réglages.
export async function chargerReglages(forcer = false): Promise<Record<string, string>> {
  if (cache && !forcer) return cache;
  if (!chargement || forcer) {
    chargement = chargerDepuisSource().then((m) => {
      cache = m;
      return m;
    });
  }
  return chargement;
}

// Prompt effectif pour une clé : override non vide s'il existe, sinon le défaut.
export async function promptEffectif(cle: string, defaut: string): Promise<string> {
  try {
    const map = await chargerReglages();
    const v = map[cle];
    return typeof v === 'string' && v.trim().length > 0 ? v : defaut;
  } catch {
    return defaut;
  }
}

// Valeur brute d'un override (vide si aucun) — pour pré-remplir l'éditeur admin.
export async function reglageBrut(cle: string): Promise<string> {
  const map = await chargerReglages();
  return map[cle] ?? '';
}

// Définit (ou efface si vide) un réglage. Écriture admin partagée + miroir local.
// Renvoie true si l'enregistrement distant a réussi (ou si mode local).
export async function definirReglage(cle: string, valeur: string): Promise<boolean> {
  const v = valeur.trim();
  // Met à jour le cache + le miroir local immédiatement.
  const map = { ...(cache ?? (await chargerReglages())) };
  if (v) map[cle] = v;
  else delete map[cle];
  cache = map;
  await ecrireLocal(map);

  if (!supabaseDisponible()) return true;

  const token = sessionToken();
  if (!token) return false;
  const faire = async (tk: string) => {
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), 10000);
    try {
      if (v) {
        // Upsert (insert ou update) sur la clé.
        return await fetch(`${URL}/rest/v1/reglages?on_conflict=cle`, {
          method: 'POST',
          headers: { ...headers(tk), Prefer: 'resolution=merge-duplicates,return=minimal' },
          body: JSON.stringify({ cle, valeur: v, maj_le: new Date().toISOString() }),
          signal: ctrl.signal,
        });
      }
      // Valeur vide -> suppression (retour au défaut).
      return await fetch(`${URL}/rest/v1/reglages?cle=eq.${encodeURIComponent(cle)}`, {
        method: 'DELETE',
        headers: headers(tk),
        signal: ctrl.signal,
      });
    } finally {
      clearTimeout(t);
    }
  };
  try {
    let r = await faire(token);
    if (r.status === 401) {
      const frais = await rafraichirSession();
      if (frais) r = await faire(frais);
    }
    return r.ok;
  } catch {
    return false;
  }
}
