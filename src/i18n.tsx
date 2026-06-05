import React, { createContext, useContext, useState } from 'react';
import { Pressable, StyleSheet, Text } from 'react-native';
import { colors, radius } from './theme';

// i18n léger pour iasser : deux langues (fr/en), bascule au clic sur le drapeau.
// Pattern d'usage dans un composant : `const tr = useTr();` puis
// `tr('Bonjour', 'Hello')`. Pas de dictionnaire central : chaque écran porte
// ses traductions inline (simple, sans clés à maintenir).

export type Langue = 'fr' | 'en';
const CLE = 'iasser_lang';

function detecter(): Langue {
  try {
    if (typeof localStorage !== 'undefined') {
      const s = localStorage.getItem(CLE);
      if (s === 'fr' || s === 'en') return s;
    }
    const nav = typeof navigator !== 'undefined' ? navigator.language || '' : '';
    return nav.toLowerCase().startsWith('en') ? 'en' : 'fr';
  } catch {
    return 'fr';
  }
}

type Ctx = { lang: Langue; setLang: (l: Langue) => void; toggle: () => void };
const LangContext = createContext<Ctx>({ lang: 'fr', setLang: () => {}, toggle: () => {} });

export function LangProvider({ children }: { children: React.ReactNode }) {
  const [lang, setLangState] = useState<Langue>(detecter);
  const setLang = (l: Langue) => {
    setLangState(l);
    try {
      localStorage.setItem(CLE, l);
    } catch {
      /* ignore */
    }
  };
  const toggle = () => setLang(lang === 'fr' ? 'en' : 'fr');
  return <LangContext.Provider value={{ lang, setLang, toggle }}>{children}</LangContext.Provider>;
}

export function useLang() {
  return useContext(LangContext);
}

/** Retourne une fonction tr(fr, en) qui choisit selon la langue courante. */
export function useTr() {
  const { lang } = useContext(LangContext);
  return (fr: string, en: string) => (lang === 'en' ? en : fr);
}

/** Sélecteur de langue : pastille avec le drapeau courant, bascule au clic. */
export function SelecteurLangue({ style }: { style?: any }) {
  const { lang, toggle } = useLang();
  return (
    <Pressable
      onPress={toggle}
      hitSlop={10}
      accessibilityLabel={lang === 'fr' ? 'Switch to English' : 'Passer en français'}
      style={({ pressed }) => [styles.btn, pressed && { opacity: 0.7 }, style]}
    >
      <Text style={styles.flag}>{lang === 'fr' ? '🇫🇷' : '🇬🇧'}</Text>
      <Text style={styles.code}>{lang === 'fr' ? 'FR' : 'EN'}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  btn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: colors.surfaceAlt,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.pill,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  flag: { fontSize: 15 },
  code: { color: colors.text, fontSize: 12, fontWeight: '800', letterSpacing: 0.5 },
});
