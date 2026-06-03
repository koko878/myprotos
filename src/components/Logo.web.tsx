import React from 'react';
import { colors } from '../theme';

// Logo GetExp — « démocratiser l'accès à la tech, faire émerger le prochain
// Steve Jobs à 25 ans, depuis le Maroc, terreau tech mondial ».
// Symbole : l'étoile à 5 branches marocaine dont la branche supérieure s'élance
// vers le haut (flèche/ascension) — l'accès qui élève. Dégradé rouge → vert.
export default function Logo({ size = 'md', symboleSeul = false }: { size?: 'sm' | 'md' | 'lg'; symboleSeul?: boolean }) {
  const h = size === 'lg' ? 64 : size === 'sm' ? 30 : 44;
  const idG = 'gx-grad-' + size + (symboleSeul ? '-s' : '');

  const symbole = React.createElement(
    'svg',
    { width: h, height: h, viewBox: '0 0 100 100', role: 'img', 'aria-label': 'GetExp', style: { display: 'block' } },
    React.createElement(
      'defs',
      null,
      React.createElement(
        'linearGradient',
        { id: idG, x1: '0', y1: '1', x2: '1', y2: '0' },
        React.createElement('stop', { offset: '0', stopColor: colors.primary }),
        React.createElement('stop', { offset: '0.55', stopColor: '#C1272D' }),
        React.createElement('stop', { offset: '1', stopColor: colors.accent })
      )
    ),
    // Halo doux derrière le symbole
    React.createElement('circle', { cx: 50, cy: 52, r: 46, fill: `url(#${idG})`, opacity: 0.1 }),
    // Étoile dont la pointe haute est étirée en flèche d'ascension
    React.createElement('path', {
      d: etoileAscension(50, 54, 34),
      fill: `url(#${idG})`,
      stroke: 'none',
    }),
    // Petit éclat blanc (énergie/jeunesse)
    React.createElement('circle', { cx: 50, cy: 40, r: 3.2, fill: '#FFFFFF', opacity: 0.9 })
  );

  if (symboleSeul) return symbole;

  // Wordmark : symbole + « GetExp » en sans-serif géométrique.
  return React.createElement(
    'div',
    { style: { display: 'flex', alignItems: 'center', gap: h * 0.28 } },
    symbole,
    React.createElement(
      'span',
      {
        style: {
          fontFamily: '"Inter", "Segoe UI", system-ui, -apple-system, sans-serif',
          fontWeight: 800,
          fontSize: h * 0.62,
          letterSpacing: '-0.02em',
          color: colors.text,
          lineHeight: 1,
        },
      },
      'Get',
      React.createElement(
        'span',
        {
          style: {
            background: `linear-gradient(120deg, ${colors.primary}, ${colors.accent})`,
            WebkitBackgroundClip: 'text',
            backgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            color: 'transparent',
          },
        },
        'Exp'
      )
    )
  );
}

// Génère le tracé d'une étoile 5 branches dont la pointe HAUTE est allongée
// (flèche vers le haut = ascension/accès). cx,cy = centre, r = rayon externe.
function etoileAscension(cx: number, cy: number, r: number): string {
  const rInt = r * 0.42; // rayon interne (creux)
  const pts: Array<[number, number]> = [];
  for (let i = 0; i < 5; i++) {
    const aExt = -Math.PI / 2 + (i * 2 * Math.PI) / 5; // sommets externes
    // La pointe du haut (i=0) est étirée 1.5x pour l'effet « flèche/ascension ».
    const allonge = i === 0 ? 1.5 : 1;
    pts.push([cx + r * allonge * Math.cos(aExt), cy + r * allonge * Math.sin(aExt)]);
    const aInt = aExt + Math.PI / 5; // creux entre deux pointes
    pts.push([cx + rInt * Math.cos(aInt), cy + rInt * Math.sin(aInt)]);
  }
  return 'M' + pts.map(([x, y]) => `${x.toFixed(1)} ${y.toFixed(1)}`).join(' L') + ' Z';
}
