// Notifications in-app des nouvelles idées soumises (côté admin).
// On mémorise localement la date de dernière consultation de l'espace admin ;
// les projets soumis (statut 'soumis') après cette date sont « nouveaux ».
import AsyncStorage from '@react-native-async-storage/async-storage';
import { UseCase } from './types';

const CLE_VU = 'admin_idees_vues_le_v1';

export async function dernierVuLe(): Promise<number> {
  try {
    const v = await AsyncStorage.getItem(CLE_VU);
    return v ? parseInt(v, 10) || 0 : 0;
  } catch {
    return 0;
  }
}

// Marque toutes les idées soumises comme vues (à appeler à l'ouverture de l'admin).
export async function marquerIdeesVues(): Promise<void> {
  try {
    await AsyncStorage.setItem(CLE_VU, String(Date.now()));
  } catch {
    /* ignore */
  }
}

// Nombre d'idées soumises non encore vues.
export function compterNouvelles(liste: UseCase[], vuLe: number): number {
  return liste.filter((u) => u.statut === 'soumis' && (u.soumisLe ?? 0) > vuLe).length;
}
