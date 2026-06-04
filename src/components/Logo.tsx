import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { colors } from '../theme';

// Logo « iasser » (fallback natif) : « i » vert + « asser » blanc, étoile rouge
// approchée par le caractère ★ en guise de point du i. Slogan optionnel.
export default function Logo({
  size = 'md',
  symboleSeul = false,
  tagline = false,
}: {
  size?: 'sm' | 'md' | 'lg';
  symboleSeul?: boolean;
  tagline?: boolean;
}) {
  const mot = size === 'lg' ? 46 : size === 'sm' ? 22 : 34;

  const iEtoile = (
    <View>
      <Text style={[styles.etoile, { fontSize: mot * 0.42 }]}>★</Text>
      <Text style={[styles.mot, { fontSize: mot, color: colors.accent }]}>i</Text>
    </View>
  );

  if (symboleSeul) return <View style={styles.wrap}>{iEtoile}</View>;

  return (
    <View style={styles.wrap}>
      <View style={styles.row}>
        {iEtoile}
        <Text style={[styles.mot, { fontSize: mot, color: colors.text }]}>asser</Text>
      </View>
      {tagline && <Text style={[styles.tagline, { fontSize: mot * 0.28 }]}>SELECT (tech) FROM MOROCCO</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { alignSelf: 'flex-start', alignItems: 'flex-start', gap: 4 },
  row: { flexDirection: 'row', alignItems: 'flex-end' },
  mot: { fontWeight: '900', letterSpacing: -0.5 },
  etoile: { color: colors.primary, position: 'absolute', alignSelf: 'center', top: -6, zIndex: 1 },
  tagline: { color: colors.textMuted, fontWeight: '600', letterSpacing: 1 },
});
