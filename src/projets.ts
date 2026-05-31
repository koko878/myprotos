// Accès aux projets via Supabase (DB partagée) — APPELS REST DIRECTS.
// Cohérent avec auth.ts (session gérée par nous) : on utilise le token courant.
import { rafraichirSession, sessionToken, supabaseDisponible } from './auth';
import { UseCase } from './types';

const URL = (process.env.EXPO_PUBLIC_SUPABASE_URL || '').replace(/\/$/, '');
const ANON = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || '';

function headers(token: string, extra: Record<string, string> = {}): Record<string, string> {
  return { apikey: ANON, Authorization: `Bearer ${token}`, 'Content-Type': 'application/json', ...extra };
}

// fetch avec timeout + retry auto sur 401 (token expiré -> on rafraîchit).
async function req(
  path: string,
  init: RequestInit,
  extraHeaders: Record<string, string> = {},
  ms = 12000
): Promise<Response | null> {
  async function once(token: string): Promise<Response | null> {
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), ms);
    try {
      return await fetch(`${URL}${path}`, { ...init, headers: headers(token, extraHeaders), signal: ctrl.signal });
    } catch {
      return null;
    } finally {
      clearTimeout(t);
    }
  }
  let r = await once(sessionToken() || ANON);
  if (r && r.status === 401) {
    const frais = await rafraichirSession();
    if (frais) r = await once(frais);
  }
  return r;
}

function versUseCase(row: any): UseCase {
  return { ...(row.donnees as UseCase), id: row.id, statut: row.statut };
}

// uid de l'utilisateur courant (depuis la session locale).
function uidCourant(): string | null {
  try {
    if (typeof localStorage !== 'undefined') {
      const s = localStorage.getItem('getexp_session_v1');
      if (s) return JSON.parse(s)?.user?.id ?? null;
    }
  } catch {
    /* ignore */
  }
  return null;
}

export async function listerProjets(): Promise<UseCase[]> {
  if (!supabaseDisponible()) return [];
  const r = await req('/rest/v1/projets?select=id,donnees,statut,cree_le&order=cree_le.desc', { method: 'GET' });
  if (!r || !r.ok) return [];
  const data = await r.json().catch(() => []);
  return Array.isArray(data) ? data.map(versUseCase) : [];
}

export async function trouverProjet(id: string): Promise<UseCase | undefined> {
  if (!supabaseDisponible()) return undefined;
  const r = await req(`/rest/v1/projets?id=eq.${id}&select=id,donnees,statut`, { method: 'GET' });
  if (!r || !r.ok) return undefined;
  const data = await r.json().catch(() => []);
  return Array.isArray(data) && data[0] ? versUseCase(data[0]) : undefined;
}

export async function creerProjet(uc: UseCase): Promise<string | null> {
  if (!supabaseDisponible()) return null;
  const uid = uidCourant();
  if (!uid) return null;
  const r = await req(
    '/rest/v1/projets',
    { method: 'POST', body: JSON.stringify({ proprietaire: uid, donnees: uc, statut: uc.statut }) },
    { Prefer: 'return=representation' }
  );
  if (!r || !r.ok) return null;
  const data = await r.json().catch(() => []);
  return Array.isArray(data) && data[0]?.id ? data[0].id : null;
}

export async function majProjet(id: string, uc: UseCase): Promise<boolean> {
  if (!supabaseDisponible()) return false;
  const r = await req(`/rest/v1/projets?id=eq.${id}`, {
    method: 'PATCH',
    body: JSON.stringify({ donnees: uc, statut: uc.statut, maj_le: new Date().toISOString() }),
  });
  return !!r && r.ok;
}

export async function modifierProjet(
  id: string,
  fn: (uc: UseCase) => UseCase
): Promise<UseCase | undefined> {
  const actuel = await trouverProjet(id);
  if (!actuel) return undefined;
  const maj = fn(actuel);
  await majProjet(id, maj);
  return maj;
}
