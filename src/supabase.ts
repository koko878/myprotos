// Disponibilité de Supabase (config via variables d'environnement publiques).
// L'app n'utilise plus le SDK supabase-js : auth + DB passent par des appels
// REST directs (voir auth.ts et projets.ts) pour éviter les blocages de session
// du SDK sur web. Ce module ne garde que la détection de configuration.

const URL = process.env.EXPO_PUBLIC_SUPABASE_URL || '';
const ANON = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || '';

export function supabaseDisponible(): boolean {
  return URL.length > 0 && ANON.length > 0;
}
