// Déverrouillage de l'espace admin (réservé au propriétaire).
// L'app étant sans serveur d'auth, l'accès admin est masqué derrière un code
// PIN connu de toi seul. L'état déverrouillé est mémorisé localement.
import AsyncStorage from '@react-native-async-storage/async-storage';

const CLE = 'admin_unlocked_v1';

// Code admin. Surchargé au build via EXPO_PUBLIC_ADMIN_PIN ; défaut sinon.
const PIN = process.env.EXPO_PUBLIC_ADMIN_PIN || '2580';

export function verifierPin(saisie: string): boolean {
  return saisie.trim() === PIN;
}

export async function estAdminDeverrouille(): Promise<boolean> {
  try {
    return (await AsyncStorage.getItem(CLE)) === '1';
  } catch {
    return false;
  }
}

export async function deverrouillerAdmin(): Promise<void> {
  try {
    await AsyncStorage.setItem(CLE, '1');
  } catch {
    /* ignore */
  }
}

export async function verrouillerAdmin(): Promise<void> {
  try {
    await AsyncStorage.removeItem(CLE);
  } catch {
    /* ignore */
  }
}
