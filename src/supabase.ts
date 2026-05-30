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

const URL = process.env.EXPO_PUBLIC_SUPABASE_URL || '';
const ANON = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || '';

export function supabaseDisponible(): boolean {
  return URL.length > 0 && ANON.length > 0;
}

// Un seul client réutilisé. `null` si non configuré.
export const supabase: SupabaseClient | null = supabaseDisponible()
  ? createClient(URL, ANON, {
      auth: {
        storage: AsyncStorage as any,
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: false, // on gère le lien magique nous-mêmes (mobile)
      },
    })
  : null;
