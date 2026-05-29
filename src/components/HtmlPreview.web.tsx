import React from 'react';

// Aperçu d'un prototype HTML auto-porté, isolé dans une iframe (web).
// `srcDoc` rend le HTML sans requête réseau ; sandbox limite les capacités.
export default function HtmlPreview({ html, style }: { html: string; style?: any }) {
  return React.createElement('iframe', {
    srcDoc: html,
    title: 'Prototype',
    sandbox: 'allow-scripts allow-forms allow-popups allow-modals',
    style: {
      width: '100%',
      height: '100%',
      border: 'none',
      borderRadius: 12,
      background: '#fff',
      ...(style || {}),
    },
  });
}
