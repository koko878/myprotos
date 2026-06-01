// Petits utilitaires de formatage partagés (dates, identité client).
import { ProfilClient } from './types';

// Date + heure lisibles (ex. "12/03/2026 à 14:08").
export function dateHeure(ts?: number): string {
  if (!ts) return '—';
  try {
    const d = new Date(ts);
    const date = d.toLocaleDateString('fr-FR');
    const heure = d.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
    return `${date} à ${heure}`;
  } catch {
    return '—';
  }
}

// Résumé d'identité client pour l'admin (email + entreprise si dispo).
export function identiteClient(c?: ProfilClient | null): string {
  if (!c) return 'Client inconnu';
  const bits: string[] = [];
  if (c.email) bits.push(c.email);
  if (c.entreprise) bits.push(c.entreprise);
  if (bits.length === 0 && c.secteur) bits.push(c.secteur);
  return bits.join(' · ') || 'Client';
}
