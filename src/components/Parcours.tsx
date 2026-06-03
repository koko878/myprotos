import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { colors, font, radius, spacing } from '../theme';

// Frise « Comment ça marche » — fallback natif (statique) : pastilles à icônes
// reliées par un fil, rouge/vert marocain en alternance.
const ETAPES = [
  { icone: '🎯', titre: 'Cadrage métier', texte: 'L’IA structure votre besoin et son ROI.', couleur: colors.primary },
  { icone: '🎨', titre: 'Prototype', texte: 'Un prototype interactif à valider (ou challenger).', couleur: colors.accent },
  { icone: '🏗️', titre: 'Cadrage technique', texte: 'L’IA architecte prépare la livraison plug-and-play.', couleur: colors.primary },
  { icone: '🛡️', titre: 'Certification', texte: 'Sécurité vérifiée avant déploiement.', couleur: colors.accent },
];

export default function Parcours() {
  return (
    <View style={styles.wrap}>
      <View style={styles.eyebrowRow}>
        <View style={styles.bar} />
        <Text style={styles.eyebrow}>Comment ça marche</Text>
      </View>
      {ETAPES.map((e, i) => (
        <View key={e.titre} style={styles.step}>
          <View style={styles.rail}>
            <View style={[styles.node, { backgroundColor: e.couleur + '22', borderColor: e.couleur }]}>
              <Text style={styles.icone}>{e.icone}</Text>
            </View>
            {i < ETAPES.length - 1 && <View style={styles.line} />}
          </View>
          <View style={styles.body}>
            <Text style={styles.titre}>{e.titre}</Text>
            <Text style={styles.texte}>{e.texte}</Text>
          </View>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { marginTop: spacing.xxl },
  eyebrowRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginBottom: spacing.lg },
  bar: { width: 22, height: 2, borderRadius: 2, backgroundColor: colors.primary },
  eyebrow: { color: colors.textMuted, fontSize: font.tiny, fontWeight: '800', letterSpacing: 1.2, textTransform: 'uppercase' },
  step: { flexDirection: 'row', gap: spacing.lg },
  rail: { alignItems: 'center', width: 48 },
  node: {
    width: 48,
    height: 48,
    borderRadius: 16,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  icone: { fontSize: 22 },
  line: { width: 2, flex: 1, minHeight: 30, marginVertical: 6, borderRadius: 2, backgroundColor: colors.border },
  body: { paddingTop: spacing.xs, paddingBottom: spacing.xl, flex: 1 },
  titre: { color: colors.text, fontSize: font.h3, fontWeight: '800' },
  texte: { color: colors.textMuted, fontSize: font.small, lineHeight: 19, marginTop: 2 },
});
