// Accès aux projets via Supabase (DB partagée). Mappe la table `projets`
// (donnees jsonb) vers le type UseCase de l'app.
//
// Toutes les fonctions retombent silencieusement (renvoient [] / undefined) si
// Supabase n'est pas configuré — l'app peut alors utiliser le store local.
import { supabase } from './supabase';
import { UseCase } from './types';

function versUseCase(row: any): UseCase {
  // `donnees` contient l'objet complet ; on force id + statut depuis la ligne.
  return { ...(row.donnees as UseCase), id: row.id, statut: row.statut };
}

// Liste les projets visibles (RLS : client = les siens, admin = tous).
export async function listerProjets(): Promise<UseCase[]> {
  if (!supabase) return [];
  const { data, error } = await supabase
    .from('projets')
    .select('id, donnees, statut, cree_le')
    .order('cree_le', { ascending: false });
  if (error || !data) return [];
  return data.map(versUseCase);
}

export async function trouverProjet(id: string): Promise<UseCase | undefined> {
  if (!supabase) return undefined;
  const { data } = await supabase
    .from('projets')
    .select('id, donnees, statut')
    .eq('id', id)
    .single();
  return data ? versUseCase(data) : undefined;
}

// Crée un projet pour l'utilisateur courant. Renvoie l'id créé, ou null.
export async function creerProjet(uc: UseCase): Promise<string | null> {
  if (!supabase) return null;
  const { data: sess } = await supabase.auth.getSession();
  const uid = sess.session?.user.id;
  if (!uid) return null;
  const { data, error } = await supabase
    .from('projets')
    .insert({ proprietaire: uid, donnees: uc, statut: uc.statut })
    .select('id')
    .single();
  return error || !data ? null : data.id;
}

// Met à jour un projet existant (objet complet + statut).
export async function majProjet(id: string, uc: UseCase): Promise<boolean> {
  if (!supabase) return false;
  const { error } = await supabase
    .from('projets')
    .update({ donnees: uc, statut: uc.statut, maj_le: new Date().toISOString() })
    .eq('id', id);
  return !error;
}

// Applique une transformation à un projet (lecture -> maj).
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
