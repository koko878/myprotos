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

// Sur le web, le lien magique revient avec le jeton dans l'URL : supabase-js
// doit le détecter automatiquement. Sur natif (APK), on gère le deep link.
const surWeb = Platform.OS === 'web';

// Un seul client réutilisé. `null` si non configuré.
export const supabase: SupabaseClient | null = supabaseDisponible()
  ? createClient(URL, ANON, {
      auth: {
        storage: AsyncStorage as any,
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: surWeb,
      },
    })
  : null;
