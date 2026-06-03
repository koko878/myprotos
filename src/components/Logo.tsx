import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { colors, font } from '../theme';

// Logo GetExp (fallback natif). Wordmark moderne : « Get » clair + « Exp » vert.
export default function Logo({ size = 'md', symboleSeul = false }: { size?: 'sm' | 'md' | 'lg'; symboleSeul?: boolean }) {
  const f = size === 'lg' ? 40 : size === 'sm' ? 22 : 30;
  const etoile = (
    <Text style={[styles.star, { fontSize: f * 1.1 }]}>★</Text>
  );
  if (symboleSeul) return <View style={styles.wrap}>{etoile}</View>;
  return (
    <View style={[styles.wrap, styles.row]}>
      {etoile}
      <Text style={[styles.mot, { fontSize: f * 0.62 }]}>
        Get<Text style={{ color: colors.accent }}>Exp</Text>
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { alignSelf: 'flex-start' },
  row: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  star: { color: colors.primary, fontWeight: '900' },
  mot: { color: colors.text, fontWeight: '900', letterSpacing: -0.5 },
});
