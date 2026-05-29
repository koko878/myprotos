import React, { useEffect, useState } from 'react';
import { Pressable, SafeAreaView, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Bouton, Carte, Etiquette, couleurComplexite } from '../components/ui';
import { libelleStatut } from '../components/UseCaseView';
import { useNav } from '../navigation';
import { chargerUseCases } from '../storage';
import { colors, font, spacing } from '../theme';
import { UseCase } from '../types';

export default function ListeScreen() {
  const { aller, retour } = useNav();
  const [liste, setListe] = useState<UseCase[] | null>(null);

  // Recharge à chaque affichage (retour depuis recap/detail).
  useEffect(() => {
    chargerUseCases().then(setListe);
  }, []);

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.header}>
        <Pressable onPress={retour} hitSlop={12}>
          <Text style={styles.retour}>‹ Accueil</Text>
        </Pressable>
        <Text style={styles.headerTitre}>Mes projets</Text>
        <View style={{ width: 70 }} />
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        {liste && liste.length === 0 && (
          <View style={styles.vide}>
            <Text style={styles.videTitre}>Aucun projet pour l’instant</Text>
            <Text style={styles.videTxt}>
              Exprimez votre première idée, l’assistant IA vous aide à la cadrer.
            </Text>
            <Bouton titre="✨ Exprimer une idée" onPress={() => aller({ nom: 'cadrage' })} />
          </View>
        )}

        {liste?.map((uc) => (
          <Carte
            key={uc.id}
            style={{ marginBottom: spacing.md, gap: spacing.sm }}
            onPress={() => aller({ nom: 'detail', useCaseId: uc.id })}
          >
            <View style={styles.cardTop}>
              <Etiquette texte={libelleStatut(uc.statut).texte} couleur={libelleStatut(uc.statut).couleur} />
              <Text style={[styles.score, { color: scoreCouleur(uc.scoreCadrage) }]}>
                {uc.scoreCadrage}/100
              </Text>
            </View>
            <Text style={styles.cardTitre}>{uc.titre}</Text>
            <View style={styles.cardTags}>
              <Etiquette texte={uc.domaine} />
              <Etiquette texte={uc.complexite} couleur={couleurComplexite(uc.complexite)} />
              <Etiquette texte={uc.budgetEstime} />
            </View>
          </Carte>
        ))}

        {liste && liste.length > 0 && (
          <Bouton titre="✨ Nouvelle idée" onPress={() => aller({ nom: 'cadrage' })} />
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

function scoreCouleur(s: number) {
  return s >= 75 ? colors.success : s >= 50 ? colors.warn : colors.danger;
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  retour: { color: colors.accent, fontSize: font.body, fontWeight: '600', width: 70 },
  headerTitre: { color: colors.text, fontSize: font.h3, fontWeight: '800' },
  content: { padding: spacing.lg, paddingBottom: spacing.xxl },
  cardTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  score: { fontSize: font.small, fontWeight: '800' },
  cardTitre: { color: colors.text, fontSize: font.h3, fontWeight: '700', lineHeight: 22 },
  cardTags: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, marginTop: spacing.xs },
  vide: { alignItems: 'center', gap: spacing.md, paddingVertical: spacing.xxl },
  videTitre: { color: colors.text, fontSize: font.h3, fontWeight: '700' },
  videTxt: { color: colors.textMuted, fontSize: font.body, textAlign: 'center', lineHeight: 21 },
});
