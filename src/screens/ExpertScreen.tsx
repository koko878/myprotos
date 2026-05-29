import React, { useEffect, useState } from 'react';
import { Pressable, SafeAreaView, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Carte, Etiquette, couleurComplexite } from '../components/ui';
import { useNav } from '../navigation';
import { chargerUseCases } from '../storage';
import { colors, font, spacing } from '../theme';
import { UseCase } from '../types';

// Espace expert : on ne montre que les use cases ouverts à l'offre
// (publiés ou déjà en cours), jamais les brouillons du demandeur.
const STATUTS_VISIBLES = ['publié', 'prototype_en_cours', 'prototype_validé', 'livré'];

export default function ExpertScreen() {
  const { aller, retour } = useNav();
  const [liste, setListe] = useState<UseCase[] | null>(null);

  useEffect(() => {
    chargerUseCases().then((l) => setListe(l.filter((u) => STATUTS_VISIBLES.includes(u.statut))));
  }, []);

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.header}>
        <Pressable onPress={retour} hitSlop={12}>
          <Text style={styles.retour}>‹ Accueil</Text>
        </Pressable>
        <Text style={styles.headerTitre}>Espace expert</Text>
        <View style={{ width: 70 }} />
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.intro}>
          Parcourez les besoins cadrés par l’IA. Chacun est livré avec ROI estimé et spec
          prête à coder — positionnez-vous en quelques secondes.
        </Text>

        {liste && liste.length === 0 && (
          <View style={styles.vide}>
            <Text style={styles.videTitre}>Aucun besoin publié pour l’instant</Text>
            <Text style={styles.videTxt}>
              Les use cases publiés par les demandeurs apparaîtront ici.
            </Text>
          </View>
        )}

        {liste?.map((uc) => {
          const nbProp = uc.propositions?.length ?? 0;
          return (
            <Carte
              key={uc.id}
              style={{ marginBottom: spacing.md, gap: spacing.sm }}
              onPress={() => aller({ nom: 'expertDetail', useCaseId: uc.id })}
            >
              <View style={styles.cardTop}>
                <Etiquette texte={uc.domaine} couleur={colors.accent} />
                {uc.roi && (
                  <Text style={styles.roiTag}>ROI {uc.roi.roiAn1Pct >= 0 ? '+' : ''}{uc.roi.roiAn1Pct}%</Text>
                )}
              </View>
              <Text style={styles.cardTitre}>{uc.titre}</Text>
              <Text style={styles.cardSous} numberOfLines={2}>
                {uc.probleme || uc.objectif}
              </Text>
              <View style={styles.cardTags}>
                <Etiquette texte={uc.complexite} couleur={couleurComplexite(uc.complexite)} />
                <Etiquette texte={uc.budgetEstime} />
                {nbProp > 0 && <Etiquette texte={`${nbProp} proposition${nbProp > 1 ? 's' : ''}`} couleur={colors.warn} />}
              </View>
            </Carte>
          );
        })}
      </ScrollView>
    </SafeAreaView>
  );
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
  intro: { color: colors.textMuted, fontSize: font.small, lineHeight: 20, marginBottom: spacing.lg },
  cardTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  roiTag: { color: colors.success, fontSize: font.small, fontWeight: '800' },
  cardTitre: { color: colors.text, fontSize: font.h3, fontWeight: '700', lineHeight: 22 },
  cardSous: { color: colors.textMuted, fontSize: font.small, lineHeight: 19 },
  cardTags: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, marginTop: spacing.xs },
  vide: { alignItems: 'center', gap: spacing.md, paddingVertical: spacing.xxl },
  videTitre: { color: colors.text, fontSize: font.h3, fontWeight: '700' },
  videTxt: { color: colors.textMuted, fontSize: font.body, textAlign: 'center', lineHeight: 21 },
});
