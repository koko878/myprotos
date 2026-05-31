import React from 'react';
import { colors, font, radius, spacing } from '../theme';

// Bouton d'import de fichier qui rend un VRAI <input type=file> (web).
// Indispensable sur mobile : un clic programmatique sur un input après un await
// est bloqué par le navigateur. Ici, l'utilisateur tape directement l'input.
export default function FileButton({
  titre,
  accept = '.html,text/html',
  onTexte,
}: {
  titre: string;
  accept?: string;
  onTexte: (nom: string, contenu: string) => void;
}) {
  function onChange(e: any) {
    const f = e?.target?.files?.[0];
    if (!f) return;
    const reader = new FileReader();
    reader.onload = () => onTexte(f.name, String(reader.result || ''));
    reader.readAsText(f);
    // réinitialise pour permettre de re-choisir le même fichier
    e.target.value = '';
  }

  return React.createElement(
    'label',
    {
      style: {
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: colors.primary,
        color: '#fff',
        fontWeight: 700,
        fontSize: font.body,
        borderRadius: radius.pill,
        paddingTop: 14,
        paddingBottom: 14,
        paddingLeft: spacing.xl,
        paddingRight: spacing.xl,
        cursor: 'pointer',
        textAlign: 'center',
      },
    },
    titre,
    React.createElement('input', {
      type: 'file',
      accept,
      onChange,
      style: { display: 'none' },
    })
  );
}
