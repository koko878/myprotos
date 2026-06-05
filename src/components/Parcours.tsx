import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { colors, font, radius, spacing } from '../theme';
import { useTr } from '../i18n';

// Frise « Comment ça marche » — fallback natif (statique) : pastilles à icônes
// reliées par un fil, rouge/vert marocain en alternance.
const ETAPES = [
  { icone: '🎯', titre: ['Cadrage métier', 'Business scoping'], texte: ['L’IA et nos consultants structurent votre besoin et son ROI.', 'Our AI and consultants structure your need and its ROI.'], couleur: colors.primary },
  { icone: '🎨', titre: ['Prototype', 'Prototype'], texte: ['Un prototype interactif à valider (ou challenger) avec nos experts.', 'An interactive prototype to validate (or challenge) with our experts.'], couleur: colors.accent },
  { icone: '🏗️', titre: ['Cadrage technique', 'Technical scoping'], texte: ['Nos architectes (assistés par l’IA) préparent la livraison plug-and-play.', 'Our architects (AI-assisted) prepare the plug-and-play delivery.'], couleur: colors.primary },
  { icone: '🛡️', titre: ['Certification', 'Certification'], texte: ['Nos experts testent, sécurisent et garantissent que ça marche en conditions réelles.', 'Our experts test, secure and guarantee it works in real-world conditions.'], couleur: colors.accent },
] as const;

export default function Parcours() {
  const tr = useTr();
  return (
    <View style={styles.wrap}>
      <View style={styles.eyebrowRow}>
        <View style={styles.bar} />
        <Text style={styles.eyebrow}>{tr('Comment ça marche', 'How it works')}</Text>
      </View>
      {ETAPES.map((e, i) => (
        <View key={e.titre[0]} style={styles.step}>
          <View style={styles.rail}>
            <View style={[styles.node, { backgroundColor: e.couleur + '22', borderColor: e.couleur }]}>
              <Text style={styles.icone}>{e.icone}</Text>
            </View>
            {i < ETAPES.length - 1 && <View style={styles.line} />}
          </View>
          <View style={styles.body}>
            <Text style={styles.titre}>{tr(e.titre[0], e.titre[1])}</Text>
            <Text style={styles.texte}>{tr(e.texte[0], e.texte[1])}</Text>
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
