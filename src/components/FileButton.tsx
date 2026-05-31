import React from 'react';
import { Bouton } from './ui';
import { lireFichierTexte } from '../fichiers';

// Version native (Android/iOS) : passe par DocumentPicker via lireFichierTexte.
export default function FileButton({
  titre,
  onTexte,
}: {
  titre: string;
  accept?: string;
  onTexte: (nom: string, contenu: string) => void;
}) {
  async function choisir() {
    const f = await lireFichierTexte();
    if (f) onTexte(f.nom, f.contenu);
  }
  return <Bouton titre={titre} onPress={choisir} />;
}
