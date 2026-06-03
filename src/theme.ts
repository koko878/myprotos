// Tokens de design GetExp — direction épurée façon Notion (clarté, espace,
// sobriété) croisée avec Spotify (fond sombre profond, accent vibrant, type bold,
// cartes arrondies). Identité marocaine : rouge + vert du drapeau, étoile + carte.

export const colors = {
  bg: '#0F0F12', // sombre Spotify, plat
  bgElevated: '#16161A',
  surface: '#17171B',
  surfaceAlt: '#202026',
  surfaceGlass: '#17171B',
  border: '#26262D',
  borderLumineux: '#33333D',
  primary: '#E0353B', // rouge marocain
  primaryClair: '#FF5A60',
  primarySoft: '#241317',
  accent: '#1FD968', // vert vibrant (énergie Spotify + vert marocain)
  accentClair: '#3DEB82',
  marocVert: '#0E7A45',
  text: '#F4F4F6',
  textMuted: '#A0A0AC',
  textFaint: '#6A6A76',
  success: '#1FD968',
  warn: '#FBBF24',
  danger: '#F87171',
  bubbleUser: '#E0353B',
  bubbleAssistant: '#202026',
};

// Dégradés signature — réservés au logo et à de rares accents (sobriété Notion).
export const gradients = {
  marque: 'linear-gradient(135deg, #E0353B 0%, #CC2A30 50%, #1FD968 100%)',
  marqueDoux: 'linear-gradient(135deg, rgba(224,53,59,0.12) 0%, rgba(31,217,104,0.12) 100%)',
  halo: 'radial-gradient(60% 50% at 25% 12%, rgba(224,53,59,0.12), transparent 70%), radial-gradient(55% 45% at 88% 20%, rgba(31,217,104,0.10), transparent 70%)',
  bouton: 'linear-gradient(120deg, #E0353B 0%, #E0353B 60%, #C7282E 100%)',
};

export const radius = {
  sm: 10,
  md: 14,
  lg: 20,
  xl: 28,
  pill: 999,
};

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 18,
  xl: 26,
  xxl: 40,
};

export const font = {
  display: 36, // titres héros (bold Spotify)
  h1: 27,
  h2: 21,
  h3: 16,
  body: 15,
  small: 13,
  tiny: 11,
};

// Ombres discrètes (Notion : ombres légères, pas de néon).
export const ombres = {
  douce: {
    shadowColor: '#000',
    shadowOpacity: 0.25,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 8 },
    elevation: 6,
  },
  lueurRouge: {
    shadowColor: '#000',
    shadowOpacity: 0.3,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 6 },
    elevation: 8,
  },
};

