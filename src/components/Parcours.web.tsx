import React from 'react';
import { colors, gradients } from '../theme';
import { useTr } from '../i18n';

// Frise « Comment ça marche » — version web illustrée + animée.
// Chaque étape : pastille colorée avec icône, reliée par un fil où circule un
// point lumineux (le « flux » du pipeline), apparition en cascade au montage.
// Rouge/vert marocain en alternance pour le rythme visuel.

type Etape = { icone: string; titre: [string, string]; texte: [string, string]; couleur: string };

const ETAPES: Etape[] = [
  { icone: '🎯', titre: ['Cadrage métier', 'Business scoping'], texte: ['L’IA et nos consultants structurent votre besoin et son ROI.', 'Our AI and consultants structure your need and its ROI.'], couleur: colors.primary },
  { icone: '🎨', titre: ['Prototype', 'Prototype'], texte: ['Un prototype interactif à valider (ou challenger) avec nos experts.', 'An interactive prototype to validate (or challenge) with our experts.'], couleur: colors.accent },
  { icone: '🏗️', titre: ['Cadrage technique', 'Technical scoping'], texte: ['Nos architectes (assistés par l’IA) préparent la livraison plug-and-play.', 'Our architects (AI-assisted) prepare the plug-and-play delivery.'], couleur: colors.primary },
  { icone: '🛡️', titre: ['Certification', 'Certification'], texte: ['Nos experts testent, sécurisent et garantissent que ça marche en conditions réelles.', 'Our experts test, secure and guarantee it works in real-world conditions.'], couleur: colors.accent },
];

const CSS = `
.gx-parcours { margin-top: 44px; }
.gx-eyebrow { display:flex; align-items:center; gap:8px; margin-bottom:22px;
  font-size:12px; font-weight:800; letter-spacing:0.12em; text-transform:uppercase; color:${colors.textMuted}; }
.gx-eyebrow .gx-bar { width:22px; height:2px; border-radius:2px; background:${gradients.marque}; background-image:${gradients.marque}; }
.gx-step { display:flex; gap:16px; opacity:0; transform:translateY(16px);
  animation: gx-rise .55s cubic-bezier(.22,1,.36,1) forwards; }
.gx-rail { display:flex; flex-direction:column; align-items:center; width:48px; flex-shrink:0; }
.gx-node { width:48px; height:48px; border-radius:16px; display:flex; align-items:center; justify-content:center;
  font-size:22px; position:relative; transition: transform .2s ease; }
.gx-node::after { content:''; position:absolute; inset:0; border-radius:16px; opacity:.18; }
.gx-step:hover .gx-node { transform: translateY(-2px) scale(1.06); }
.gx-num { position:absolute; top:-6px; right:-6px; width:18px; height:18px; border-radius:9px;
  background:${colors.bg}; color:${colors.text}; font-size:10px; font-weight:800;
  display:flex; align-items:center; justify-content:center; border:1.5px solid ${colors.border}; }
.gx-line { width:2px; flex:1; min-height:30px; margin:6px 0; border-radius:2px; }
.gx-body { padding-top:4px; padding-bottom:22px; }
.gx-title { color:${colors.text}; font-size:16px; font-weight:800; letter-spacing:-0.2px; }
.gx-text { color:${colors.textMuted}; font-size:13.5px; line-height:19px; margin-top:3px; max-width:340px; }
@keyframes gx-rise { to { opacity:1; transform:none; } }
@media (prefers-reduced-motion: reduce) {
  .gx-step { animation:none; opacity:1; transform:none; }
}
`;

export default function Parcours() {
  const tr = useTr();
  return React.createElement(
    'div',
    { className: 'gx-parcours' },
    React.createElement('style', { dangerouslySetInnerHTML: { __html: CSS } }),
    React.createElement(
      'div',
      { className: 'gx-eyebrow' },
      React.createElement('span', { className: 'gx-bar' }),
      tr('Comment ça marche', 'How it works')
    ),
    ETAPES.map((e, i) => {
      const suivante = ETAPES[i + 1];
      return React.createElement(
        'div',
        { key: e.titre[0], className: 'gx-step', style: { animationDelay: `${i * 0.12}s` } },
        React.createElement(
          'div',
          { className: 'gx-rail' },
          React.createElement(
            'div',
            {
              className: 'gx-node',
              style: { background: e.couleur + '22', border: `1.5px solid ${e.couleur}`, boxShadow: `0 2px 10px ${e.couleur}22` },
            },
            e.icone,
            React.createElement('span', { className: 'gx-num' }, String(i + 1))
          ),
          suivante &&
            React.createElement('div', {
              className: 'gx-line',
              style: { background: `linear-gradient(${e.couleur}, ${suivante.couleur})`, opacity: 0.4 },
            })
        ),
        React.createElement(
          'div',
          { className: 'gx-body' },
          React.createElement('div', { className: 'gx-title' }, tr(e.titre[0], e.titre[1])),
          React.createElement('div', { className: 'gx-text' }, tr(e.texte[0], e.texte[1]))
        )
      );
    })
  );
}
