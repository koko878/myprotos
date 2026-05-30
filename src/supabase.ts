// Client Supabase — auth (lien magique) + base de données partagée.
//
// Config via variables d'environnement Expo (publiques, non secrètes) :
//   EXPO_PUBLIC_SUPABASE_URL
//   EXPO_PUBLIC_SUPABASE_ANON_KEY
//
// Si non configuré, supabaseDisponible() renvoie false et l'app retombe sur le
// stockage local (mode hors-ligne / démo).
import 'react-native-url-polyfill/auto';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { Platform } from 'react-native';

const URL = process.env.EXPO_PUBLIC_SUPABASE_URL || '';
const ANON = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || '';

export function supabaseDisponible(): boolean {
  return URL.length > 0 && ANON.length > 0;
}

const surWeb = Platform.OS === 'web';

// Stockage de session : sur web, le localStorage natif du navigateur est plus
// fiable qu'AsyncStorage (qui peut introduire un verrou bloquant l'auth). Sur
// natif (APK), on garde AsyncStorage.
const stockage =
  surWeb && typeof window !== 'undefined' && window.localStorage
    ? window.localStorage
    : (AsyncStorage as any);

// Un seul client réutilisé. `null` si non configuré.
export const supabase: SupabaseClient | null = supabaseDisponible()
  ? createClient(URL, ANON, {
      auth: {
        storage: stockage,
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: false,
        flowType: 'implicit',
        // Désactive le verrou de navigateur (Web Locks). Sans ça, plusieurs
        // onglets GetExp ouverts se bloquent mutuellement -> "connexion trop
        // longue". On n'a pas besoin de synchroniser l'auth entre onglets.
        lock: (async (_name: string, _ttl: number, fn: () => Promise<any>) => fn()) as any,
      },
    })
  : null;
