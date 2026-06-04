import React from 'react';
import { colors } from '../theme';

// Logo « iasser » (web) — IA qui facilite la tech, depuis le Maroc.
// Wordmark « iasser » : le « i » en vert, son point remplacé par l'étoile
// marocaine à 5 branches en rouge. Slogan SQL inchangé (police marqueur).

// Étoile marocaine à 5 branches (pointe en haut), viewBox 0 0 100 100.
const ETOILE =
  'M50 2 L61.76 33.82 L95.66 35.17 L69.02 56.18 L78.21 88.83 ' +
  'L50 70 L21.79 88.83 L30.98 56.18 L4.34 35.17 L38.24 33.82 Z';

function Star({ taille, couleur }: { taille: number | string; couleur: string }) {
  return React.createElement(
    'svg',
    { width: taille, height: taille, viewBox: '0 0 100 100', style: { display: 'block' } },
    React.createElement('path', { d: ETOILE, fill: couleur })
  );
}

export default function Logo({
  size = 'md',
  symboleSeul = false,
  tagline = false,
}: {
  size?: 'sm' | 'md' | 'lg';
  symboleSeul?: boolean;
  tagline?: boolean;
}) {
  const mot = size === 'lg' ? 52 : size === 'sm' ? 24 : 36; // taille du wordmark

  // Charge la police « marqueur » du slogan (proche du rendu Looka), une fois.
  React.useEffect(() => {
    if (typeof document === 'undefined' || document.getElementById('gx-font-marker')) return;
    const l = document.createElement('link');
    l.id = 'gx-font-marker';
    l.rel = 'stylesheet';
    l.href = 'https://fonts.googleapis.com/css2?family=Permanent+Marker&display=swap';
    document.head.appendChild(l);
  }, []);

  // Symbole seul = monogramme « i » : tige verte (pilule) + étoile rouge.
  if (symboleSeul) {
    return React.createElement(
      'svg',
      { width: mot * 1.1, height: mot * 1.4, viewBox: '0 0 100 100', role: 'img', 'aria-label': 'iasser', style: { display: 'block' } },
      React.createElement('rect', { x: 42, y: 50, width: 16, height: 42, rx: 8, fill: colors.accent }),
      React.createElement(
        'g',
        { transform: 'translate(28 4) scale(0.44)' },
        React.createElement('path', { d: ETOILE, fill: colors.primary })
      )
    );
  }

  // Wordmark « iasser » : « i » vert avec étoile rouge en guise de point.
  const wordmark = React.createElement(
    'span',
    {
      style: {
        fontFamily: '"Inter", "Segoe UI", system-ui, -apple-system, sans-serif',
        fontWeight: 800,
        fontSize: mot,
        letterSpacing: '-0.02em',
        lineHeight: 1,
        display: 'inline-flex',
        alignItems: 'baseline',
      },
    },
    React.createElement(
      'span',
      { style: { position: 'relative', display: 'inline-block', color: colors.accent } },
      'ı', // « ı » sans point : l'étoile rouge EST le point (pas de point vert résiduel)
      // Étoile rouge posée sur le point du « i ».
      React.createElement(
        'span',
        { style: { position: 'absolute', left: '50%', top: '-0.06em', transform: 'translateX(-50%)' } },
        React.createElement(Star, { taille: '0.4em', couleur: colors.primary })
      )
    ),
    React.createElement('span', { style: { color: colors.text } }, 'asser')
  );

  const slogan =
    tagline &&
    React.createElement(
      'span',
      {
        style: {
          fontFamily: '"Permanent Marker", "Comic Sans MS", cursive',
          fontSize: mot * 0.28,
          letterSpacing: '0.03em',
          color: colors.text,
          marginTop: mot * 0.2,
        },
      },
      'SELECT (tech) FROM MOROCCO'
    );

  return React.createElement(
    'div',
    { style: { display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: 2 } },
    wordmark,
    slogan
  );
}
