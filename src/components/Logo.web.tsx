import React from 'react';
import { colors } from '../theme';

// Logo GetExp — direction épurée (façon Notion/Spotify) : une seule forme forte,
// couleur maîtrisée, espace négatif. Symbole : l'étoile marocaine à 5 branches
// (pointe haute étirée = ascension / « faire émerger le prochain Steve Jobs »)
// avec la CARTE DU MAROC évidée en son cœur (espace négatif). Dégradé rouge→vert
// du drapeau. Le wordmark reste monochrome pour la sobriété.

// Étoile : centre (50,52), rayon ext. 34, pointe haute allongée ×1.2 (ascension).
const STAR =
  'M50.00 11.20 L61.59 36.05 L82.34 41.49 L68.75 58.09 L69.98 79.51 ' +
  'L50.00 71.72 L30.02 79.51 L31.25 58.09 L17.66 41.49 L38.41 36.05 Z';

// Carte du Maroc (Sahara inclus), tracée depuis des coordonnées géographiques
// réelles projetées, puis mise à l'échelle pour tenir dans le cœur de l'étoile.
// Évidée via fill-rule "evenodd" → la carte apparaît en creux dans l'étoile.
const MAROC =
  'M54.99 40.45 L55.92 40.81 L58.11 41.42 L59.67 41.33 L61.06 41.69 ' +
  'L61.54 42.39 L62.31 46.98 L59.67 49.79 L58.25 54.20 L50.68 54.79 ' +
  'L45.47 58.62 L42.37 63.55 L37.69 66.55 L39.40 61.79 L41.59 57.55 ' +
  'L43.60 55.79 L44.08 54.38 L46.56 53.50 L49.22 49.98 L48.91 48.04 ' +
  'L49.85 46.62 L52.34 44.33 L53.59 43.63 L54.67 41.86 Z';

export default function Logo({ size = 'md', symboleSeul = false }: { size?: 'sm' | 'md' | 'lg'; symboleSeul?: boolean }) {
  const h = size === 'lg' ? 60 : size === 'sm' ? 28 : 42;
  const idG = 'gx-grad-' + size + (symboleSeul ? '-s' : '');

  const symbole = React.createElement(
    'svg',
    { width: h, height: h, viewBox: '0 0 100 90', role: 'img', 'aria-label': 'GetExp Maroc', style: { display: 'block', overflow: 'visible' } },
    React.createElement(
      'defs',
      null,
      React.createElement(
        'linearGradient',
        { id: idG, x1: '0', y1: '1', x2: '1', y2: '0' },
        React.createElement('stop', { offset: '0', stopColor: colors.primary }),
        React.createElement('stop', { offset: '0.5', stopColor: '#CC2A30' }),
        React.createElement('stop', { offset: '1', stopColor: colors.accent })
      )
    ),
    // Étoile pleine + carte du Maroc évidée (espace négatif).
    React.createElement('path', {
      d: STAR + ' ' + MAROC,
      fill: `url(#${idG})`,
      fillRule: 'evenodd',
    })
  );

  if (symboleSeul) return symbole;

  return React.createElement(
    'div',
    { style: { display: 'flex', alignItems: 'center', gap: h * 0.3 } },
    symbole,
    React.createElement(
      'span',
      {
        style: {
          fontFamily: '"Inter", "Segoe UI", system-ui, -apple-system, sans-serif',
          fontWeight: 800,
          fontSize: h * 0.6,
          letterSpacing: '-0.03em',
          color: colors.text,
          lineHeight: 1,
        },
      },
      'GetExp'
    )
  );
}
