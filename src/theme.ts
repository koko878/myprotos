// Tokens de design GetExp — direction « sombre premium » (façon Linear/Vercel).
// Identité marocaine : rouge du drapeau + vert, étoile/ascension comme signature,
// accents lumineux et dégradés rouge→vert sur fond sombre profond.

export const colors = {
  bg: '#0A0A0F', // sombre profond
  bgElevated: '#101017',
  surface: '#15151D',
  surfaceAlt: '#1C1C26',
  surfaceGlass: 'rgba(28, 28, 38, 0.6)', // verre dépoli (web)
  border: '#2A2A36',
  borderLumineux: '#3A3A4A',
  primary: '#E0353B', // rouge marocain, plus vif/lumineux
  primaryClair: '#FF5A60',
  primarySoft: '#1F1216', // fond de bloc rougeâtre sombre
  accent: '#22B069', // vert marocain lumineux
  accentClair: '#3DDB87',
  marocVert: '#0E7A45',
  text: '#F6F6F9',
  textMuted: '#9A9AAB',
  textFaint: '#6A6A78',
  success: '#34D399',
  warn: '#FBBF24',
  danger: '#F87171',
  bubbleUser: '#E0353B',
  bubbleAssistant: '#1C1C26',
};

// Dégradés signature (utilisés via CSS sur web).
export const gradients = {
  marque: 'linear-gradient(135deg, #E0353B 0%, #C1272D 45%, #22B069 100%)',
  marqueDoux: 'linear-gradient(135deg, rgba(224,53,59,0.18) 0%, rgba(34,176,105,0.18) 100%)',
  halo: 'radial-gradient(circle at 30% 20%, rgba(224,53,59,0.22), transparent 55%), radial-gradient(circle at 80% 60%, rgba(34,176,105,0.18), transparent 55%)',
  bouton: 'linear-gradient(120deg, #E0353B 0%, #E0353B 55%, #1F9E5A 140%)',
};

export const radius = {
  sm: 10,
  md: 16,
  lg: 24,
  xl: 30,
  pill: 999,
};

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32,
};

export const font = {
  display: 34, // titres héros
  h1: 27,
  h2: 21,
  h3: 16,
  body: 15,
  small: 13,
  tiny: 11,
};

// Ombres premium (web : box-shadow ; natif : ombres RN approchées).
export const ombres = {
  douce: {
    shadowColor: '#000',
    shadowOpacity: 0.35,
    shadowRadius: 24,
    shadowOffset: { width: 0, height: 12 },
    elevation: 8,
  },
  lueurRouge: {
    shadowColor: '#E0353B',
    shadowOpacity: 0.45,
    shadowRadius: 24,
    shadowOffset: { width: 0, height: 8 },
    elevation: 10,
  },
};
