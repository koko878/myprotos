import React from 'react';
import { SafeAreaView, ScrollView, StyleSheet, Text, View } from 'react-native';
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

        <Text style={styles.h1}>Donnez vie à vos idées data & IA.</Text>
        <Text style={styles.sous}>
          Exprimez un besoin. Notre assistant IA le transforme en use case clair,
          que des experts data/IA peuvent reprendre — d’abord en prototype, puis
          en projet clé en main.
        </Text>

        <Carte style={{ marginTop: spacing.xl, gap: spacing.md }}>
          <Text style={styles.cardTitre}>Vous êtes demandeur</Text>
          <Text style={styles.cardTexte}>
            Pas besoin d’être technique. Décrivez votre idée, l’IA vous aide à la cadrer.
          </Text>
          <Bouton titre="✨ Exprimer une idée" onPress={() => aller({ nom: 'cadrage' })} />
          <Bouton
            titre="Voir mes use cases"
            variante="secondaire"
            onPress={() => aller({ nom: 'liste' })}
          />
        </Carte>

        <View style={styles.etapes}>
          <Etape n="1" titre="Cadrage IA" texte="L’IA structure votre besoin en use case." />
          <Etape n="2" titre="Publication" texte="Les experts anonymes se positionnent." />
          <Etape n="3" titre="Prototype" texte="Validez avant de vous engager." />
          <Etape n="4" titre="Livraison" texte="Le projet livré clé en main." />
        </View>
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
});
