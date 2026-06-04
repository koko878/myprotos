import React, { useEffect, useRef } from 'react';
import { Animated, StyleSheet, Text, View } from 'react-native';
import { colors, font, spacing } from '../theme';
import { StatutUseCase } from '../types';

// Mini-frise de progression du projet (langage schématique, façon « pipeline »).
// 4 jalons : Cadrage → Prototype → Technique → Certification. Le jalon courant
// pulse en rouge, les jalons franchis sont verts (✓), les suivants sont en gris.

const JALONS = [
  { label: 'Cadrage', icone: '🎯' },
  { label: 'Prototype', icone: '🎨' },
  { label: 'Technique', icone: '🏗️' },
  { label: 'Certification', icone: '🛡️' },
];

// Position courante (0..4) selon le statut du cycle de vie.
const ORDRE: Record<StatutUseCase, number> = {
  brouillon: 1,
  soumis: 1,
  prototype_pret_admin: 1,
  prototype_genere: 1,
  revision_demandee: 1,
  prototype_valide: 2,
  cadrage_technique: 2,
  pret_a_packager: 3,
  commande_validee: 3,
  certifie: 4,
};

export default function FriseStatut({ statut }: { statut: StatutUseCase }) {
  const current = ORDRE[statut] ?? 0;
  const pulse = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 1, duration: 1100, useNativeDriver: true }),
        Animated.timing(pulse, { toValue: 0, duration: 0, useNativeDriver: true }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [pulse]);

  const scale = pulse.interpolate({ inputRange: [0, 1], outputRange: [1, 1.9] });
  const opacity = pulse.interpolate({ inputRange: [0, 1], outputRange: [0.45, 0] });
  const fill = Math.min(current, JALONS.length - 1) / (JALONS.length - 1);

  return (
    <View style={styles.wrap}>
      <View style={styles.eyebrowRow}>
        <View style={styles.bar} />
        <Text style={styles.eyebrow}>Avancement du projet</Text>
      </View>
      <View style={styles.row}>
        <View style={styles.trackBg} />
        <View style={[styles.trackFill, { width: `${75 * fill}%` }]} />
        {JALONS.map((j, i) => {
          const done = i < current;
          const actif = i === current && current < JALONS.length;
          return (
            <View key={j.label} style={styles.step}>
              <View style={styles.nodeBox}>
                {actif && (
                  <Animated.View style={[styles.pulseRing, { transform: [{ scale }], opacity }]} />
                )}
                <View
                  style={[
                    styles.node,
                    done && { backgroundColor: colors.accent, borderColor: colors.accent },
                    actif && { backgroundColor: colors.primary, borderColor: colors.primary },
                  ]}
                >
                  <Text style={styles.nodeTxt}>{done ? '✓' : j.icone}</Text>
                </View>
              </View>
              <Text
                style={[
                  styles.label,
                  done && { color: colors.text },
                  actif && { color: colors.primary, fontWeight: '800' },
                ]}
                numberOfLines={1}
              >
                {j.label}
              </Text>
            </View>
          );
        })}
      </View>
    </View>
  );
}

const NODE = 36;

const styles = StyleSheet.create({
  wrap: { marginBottom: spacing.lg },
  eyebrowRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginBottom: spacing.md },
  bar: { width: 22, height: 2, borderRadius: 2, backgroundColor: colors.primary },
  eyebrow: { color: colors.textMuted, fontSize: font.tiny, fontWeight: '800', letterSpacing: 1.2, textTransform: 'uppercase' },
  row: { flexDirection: 'row' },
  trackBg: {
    position: 'absolute',
    top: NODE / 2 - 1,
    left: '12.5%',
    right: '12.5%',
    height: 2,
    backgroundColor: colors.border,
    borderRadius: 2,
  },
  trackFill: {
    position: 'absolute',
    top: NODE / 2 - 1,
    left: '12.5%',
    height: 2,
    backgroundColor: colors.accent,
    borderRadius: 2,
  },
  step: { flex: 1, alignItems: 'center' },
  nodeBox: { width: NODE, height: NODE, alignItems: 'center', justifyContent: 'center' },
  pulseRing: {
    position: 'absolute',
    width: NODE,
    height: NODE,
    borderRadius: NODE / 2,
    backgroundColor: colors.primary,
  },
  node: {
    width: NODE,
    height: NODE,
    borderRadius: NODE / 2,
    backgroundColor: colors.surfaceAlt,
    borderWidth: 1.5,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  nodeTxt: { fontSize: 16, color: colors.text, fontWeight: '800' },
  label: { color: colors.textMuted, fontSize: font.tiny, fontWeight: '600', marginTop: spacing.sm },
});
