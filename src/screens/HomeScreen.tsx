import React from 'react';
import { Pressable, SafeAreaView, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Bouton, Carte } from '../components/ui';
import { useNav } from '../navigation';
import { colors, font, radius, spacing } from '../theme';

export default function HomeScreen() {
  const { aller } = useNav();
  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.logoRow}>
          <View style={styles.logoDot} />
          <Text style={styles.marque}>GetExp</Text>
        </View>

        <Text style={styles.h1}>De l’idée à l’application, clé en main.</Text>
        <Text style={styles.sous}>
          Décrivez votre besoin. Notre IA le cadre, génère un prototype interactif,
          puis prépare une application packagée plug-and-play pour votre infrastructure.
        </Text>

        <Carte style={{ marginTop: spacing.xl, gap: spacing.md }}>
          <Text style={styles.cardTitre}>Vous êtes client</Text>
          <Text style={styles.cardTexte}>
            Pas besoin d’être technique. Décrivez votre idée, l’IA vous accompagne.
          </Text>
          <Bouton titre="✨ Exprimer une idée" onPress={() => aller({ nom: 'cadrage' })} />
          <Bouton
            titre="Voir mes projets"
            variante="secondaire"
            onPress={() => aller({ nom: 'liste' })}
          />
        </Carte>

        <View style={styles.etapes}>
          <Etape n="1" titre="Cadrage métier" texte="L’IA structure votre besoin et son ROI." />
          <Etape n="2" titre="Prototype" texte="Un prototype interactif à valider (ou challenger)." />
          <Etape n="3" titre="Cadrage technique" texte="L’IA architecte prépare la livraison plug-and-play." />
          <Etape n="4" titre="Certification" texte="Sécurité vérifiée avant déploiement." />
        </View>

        <Pressable onPress={() => aller({ nom: 'admin' })} style={styles.adminLien} hitSlop={8}>
          <Text style={styles.adminTxt}>· Espace admin ·</Text>
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}

function Etape({ n, titre, texte }: { n: string; titre: string; texte: string }) {
  return (
    <View style={styles.etapeRow}>
      <View style={styles.etapeNum}>
        <Text style={styles.etapeNumTxt}>{n}</Text>
      </View>
      <View style={{ flex: 1 }}>
        <Text style={styles.etapeTitre}>{titre}</Text>
        <Text style={styles.etapeTexte}>{texte}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  content: { padding: spacing.xl, paddingTop: spacing.xxl },
  logoRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginBottom: spacing.xxl },
  logoDot: { width: 14, height: 14, borderRadius: 7, backgroundColor: colors.primary },
  marque: { color: colors.text, fontSize: font.h2, fontWeight: '800', letterSpacing: 0.5 },
  h1: { color: colors.text, fontSize: font.h1, fontWeight: '800', lineHeight: 34 },
  sous: { color: colors.textMuted, fontSize: font.body, lineHeight: 22, marginTop: spacing.md },
  cardTitre: { color: colors.text, fontSize: font.h3, fontWeight: '800' },
  cardTexte: { color: colors.textMuted, fontSize: font.small, lineHeight: 20 },
  etapes: { marginTop: spacing.xxl, gap: spacing.lg },
  etapeRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  etapeNum: {
    width: 34,
    height: 34,
    borderRadius: radius.pill,
    backgroundColor: colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  etapeNumTxt: { color: colors.accent, fontWeight: '800' },
  etapeTitre: { color: colors.text, fontSize: font.body, fontWeight: '700' },
  etapeTexte: { color: colors.textMuted, fontSize: font.small },
  adminLien: { alignItems: 'center', marginTop: spacing.xxl, paddingVertical: spacing.sm },
  adminTxt: { color: colors.textMuted, fontSize: font.small, fontWeight: '600' },
});
