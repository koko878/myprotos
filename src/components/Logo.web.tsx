import React from 'react';
import { colors } from '../theme';

// Logo GetExp (web) — reprend l'identité Looka : deux anneaux entrelacés (lien /
// continuité), wordmark « GET » vert + « EXP » rouge, et le tagline SQL
// « SELECT (tech) FROM MOROCCO ». Construit en SVG/DOM pour rester net à toute
// taille (favicon → héros) et propre en monochrome.

export default function Logo({
  size = 'md',
  symboleSeul = false,
  tagline = false,
}: {
  size?: 'sm' | 'md' | 'lg';
  symboleSeul?: boolean;
  tagline?: boolean;
}) {
  const ring = size === 'lg' ? 58 : size === 'sm' ? 26 : 40; // hauteur du symbole
  const mot = size === 'lg' ? 42 : size === 'sm' ? 19 : 30; // taille du wordmark

  // Deux anneaux entrelacés (l'anneau gauche passe devant à droite).
  const symbole = React.createElement(
    'svg',
    {
      width: ring * 1.9,
      height: ring,
      viewBox: '0 0 120 64',
      role: 'img',
      'aria-label': 'GetExp',
      style: { display: 'block' },
    },
    // Anneau droit = vert (derrière)
    React.createElement('circle', {
      cx: 74, cy: 32, r: 23, fill: 'none', stroke: colors.accent, strokeWidth: 6.5,
    }),
    // Anneau gauche = rouge (devant) — rouge+vert du drapeau marocain
    React.createElement('circle', {
      cx: 46, cy: 32, r: 23, fill: 'none', stroke: colors.primary, strokeWidth: 6.5,
    })
  );

  if (symboleSeul) return symbole;

  const wordmark = React.createElement(
    'span',
    {
      style: {
        fontFamily: '"Inter", "Segoe UI", system-ui, -apple-system, sans-serif',
        fontWeight: 900,
        fontSize: mot,
        letterSpacing: '-0.02em',
        lineHeight: 1,
      },
    },
    React.createElement('span', { style: { color: colors.accent } }, 'GET'),
    React.createElement('span', { style: { color: colors.primary } }, 'EXP')
  );

  const slogan =
    tagline &&
    React.createElement(
      'span',
      {
        style: {
          fontFamily: '"SFMono-Regular", "JetBrains Mono", "Fira Mono", ui-monospace, monospace',
          fontSize: mot * 0.3,
          letterSpacing: '0.14em',
          color: colors.textMuted,
          marginTop: mot * 0.28,
          textTransform: 'uppercase',
        },
      },
      'SELECT (tech) FROM MOROCCO'
    );

  return React.createElement(
    'div',
    { style: { display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: ring * 0.18 } },
    symbole,
    wordmark,
    slogan
  );
}
