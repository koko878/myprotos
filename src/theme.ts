// Tokens de design iasser — direction épurée façon Notion (clarté, espace,
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
  primary: '#EA2B50', // rouge framboise (logo Looka)
  primaryClair: '#FF5A78',
  primarySoft: '#26131A',
  accent: '#3DBE4A', // vert (logo Looka)
  accentClair: '#5BD968',
  marocVert: '#2E9E3A',
  text: '#F4F4F6',
  textMuted: '#A0A0AC',
  textFaint: '#6A6A76',
  success: '#3DBE4A',
  warn: '#FBBF24',
  danger: '#F87171',
  bubbleUser: '#EA2B50',
  bubbleAssistant: '#202026',
};

// Dégradés signature — réservés au logo et à de rares accents (sobriété Notion).
export const gradients = {
  marque: 'linear-gradient(135deg, #EA2B50 0%, #D62649 50%, #3DBE4A 100%)',
  marqueDoux: 'linear-gradient(135deg, rgba(234,43,80,0.12) 0%, rgba(61,190,74,0.12) 100%)',
  halo: 'radial-gradient(60% 50% at 25% 12%, rgba(234,43,80,0.12), transparent 70%), radial-gradient(55% 45% at 88% 20%, rgba(61,190,74,0.10), transparent 70%)',
  bouton: 'linear-gradient(120deg, #EA2B50 0%, #EA2B50 60%, #D62649 100%)',
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

