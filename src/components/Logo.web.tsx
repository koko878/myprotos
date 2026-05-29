import React from 'react';
import { colors } from '../theme';

// Logo GetExp — identité marocaine.
// « GET » : le E est un glyphe rouge dont le flanc gauche évoque la silhouette
// du Maroc (côte irrégulière), avec l'étoile verte à cinq branches du drapeau
// en accent. « EXP » en vert sous le mot.
export default function Logo({ size = 'md' }: { size?: 'sm' | 'md' | 'lg' }) {
  const h = size === 'lg' ? 60 : size === 'sm' ? 30 : 42;
  // Ratio largeur/hauteur du wordmark.
  const w = h * 2.6;

  return React.createElement(
    'svg',
    {
      width: w,
      height: h * 1.25,
      viewBox: '0 0 260 150',
      role: 'img',
      'aria-label': 'GetExp',
      style: { display: 'block' },
    },
    // --- G ---
    React.createElement('text', {
      x: 0, y: 78, fontFamily: 'Georgia, serif', fontSize: 96, fontWeight: 900,
      fill: colors.text, letterSpacing: -2,
    }, 'G'),

    // --- E "Maroc" : barres horizontales + spine gauche à la côte dentelée ---
    React.createElement('g', { transform: 'translate(96, 12)' },
      // Spine gauche stylisée (silhouette/côte du Maroc)
      React.createElement('path', {
        d: 'M2 4 L34 4 L30 16 L18 22 L26 34 L16 46 L24 58 L14 70 L2 78 Z',
        fill: colors.primary,
      }),
      // Barre haute
      React.createElement('rect', { x: 2, y: 4, width: 52, height: 15, fill: colors.primary }),
      // Barre milieu
      React.createElement('rect', { x: 2, y: 33, width: 40, height: 14, fill: colors.primary }),
      // Barre basse
      React.createElement('rect', { x: 2, y: 63, width: 52, height: 15, fill: colors.primary }),
      // Étoile verte du drapeau, posée en accent
      etoile(44, 40, 11, colors.accent)
    ),

    // --- T ---
    React.createElement('text', {
      x: 170, y: 78, fontFamily: 'Georgia, serif', fontSize: 96, fontWeight: 900,
      fill: colors.text, letterSpacing: -2,
    }, 'T'),

    // --- EXP ---
    React.createElement('text', {
      x: 258, y: 116, textAnchor: 'end', fontFamily: 'Georgia, serif',
      fontSize: 34, fontWeight: 900, fill: colors.accent, letterSpacing: 8,
    }, 'EXP')
  );
}

// Étoile à 5 branches (pentagramme creux façon drapeau marocain).
function etoile(cx: number, cy: number, r: number, fill: string) {
  const pts: string[] = [];
  for (let i = 0; i < 5; i++) {
    const a = -Math.PI / 2 + (i * 4 * Math.PI) / 5; // sommets reliés en pentagramme
    pts.push(`${(cx + r * Math.cos(a)).toFixed(1)},${(cy + r * Math.sin(a)).toFixed(1)}`);
  }
  return React.createElement('polygon', {
    points: pts.join(' '),
    fill: 'none',
    stroke: fill,
    strokeWidth: 2.4,
    strokeLinejoin: 'round',
  });
}
