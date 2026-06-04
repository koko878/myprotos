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

  // Charge la police « marqueur » du slogan (proche du rendu Looka), une fois.
  React.useEffect(() => {
    if (typeof document === 'undefined' || document.getElementById('gx-font-marker')) return;
    const l = document.createElement('link');
    l.id = 'gx-font-marker';
    l.rel = 'stylesheet';
    l.href = 'https://fonts.googleapis.com/css2?family=Permanent+Marker&display=swap';
    document.head.appendChild(l);
  }, []);

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
          fontFamily: '"Permanent Marker", "Comic Sans MS", cursive',
          fontSize: mot * 0.34,
          letterSpacing: '0.03em',
          color: colors.text,
          marginTop: mot * 0.22,
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
