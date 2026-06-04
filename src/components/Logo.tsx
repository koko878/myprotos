import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { colors } from '../theme';

// Logo GetExp (fallback natif) : deux anneaux entrelacés (approximés sans SVG),
// wordmark « GET » vert + « EXP » rouge, tagline SQL optionnel.
export default function Logo({
  size = 'md',
  symboleSeul = false,
  tagline = false,
}: {
  size?: 'sm' | 'md' | 'lg';
  symboleSeul?: boolean;
  tagline?: boolean;
}) {
  const d = size === 'lg' ? 44 : size === 'sm' ? 22 : 32; // diamètre anneau
  const mot = size === 'lg' ? 40 : size === 'sm' ? 19 : 29;
  const sw = Math.max(3, d * 0.14);

  const anneaux = (
    <View style={{ flexDirection: 'row' }}>
      <View style={[styles.ring, { width: d, height: d, borderRadius: d / 2, borderWidth: sw, borderColor: colors.primary, marginRight: -d * 0.35, zIndex: 1 }]} />
      <View style={[styles.ring, { width: d, height: d, borderRadius: d / 2, borderWidth: sw, borderColor: colors.accent }]} />
    </View>
  );

  if (symboleSeul) return <View style={styles.wrap}>{anneaux}</View>;

  return (
    <View style={styles.wrap}>
      {anneaux}
      <Text style={[styles.mot, { fontSize: mot }]}>
        <Text style={{ color: colors.accent }}>GET</Text>
        <Text style={{ color: colors.primary }}>EXP</Text>
      </Text>
      {tagline && <Text style={[styles.tagline, { fontSize: mot * 0.3 }]}>SELECT (TECH) FROM MOROCCO</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { alignSelf: 'flex-start', alignItems: 'flex-start', gap: 8 },
  ring: { borderColor: colors.text, backgroundColor: 'transparent' },
  mot: { fontWeight: '900', letterSpacing: -0.5 },
  tagline: { color: colors.textMuted, letterSpacing: 2, fontWeight: '600' },
});
