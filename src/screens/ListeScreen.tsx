import React, { useEffect, useState } from 'react';
import { SafeAreaView, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Bouton, Carte, EnTete, Etiquette, couleurComplexite } from '../components/ui';
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
      <EnTete titre="Mes projets" onRetour={retour} />

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
            {prochaineAction(uc.statut) && (
              <Text style={styles.action}>{prochaineAction(uc.statut)}</Text>
            )}
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

// Indique au client ce qu'il peut/doit faire ensuite, selon l'étape.
function prochaineAction(statut: UseCase['statut']): string {
  switch (statut) {
    case 'brouillon':
      return '👉 À soumettre pour lancer le prototype';
    case 'soumis':
      return '⏳ Prototype en préparation';
    case 'prototype_pret_admin':
      return '⏳ Prototype en préparation';
    case 'prototype_genere':
      return '👉 Votre prototype est prêt — à voir et valider';
    case 'revision_demandee':
      return '⏳ Nouvelle version en préparation';
    case 'prototype_valide':
      return '👉 Passez au cadrage technique';
    case 'cadrage_technique':
      return '👉 Reprendre le cadrage technique';
    case 'pret_a_packager':
      return '✅ Prêt à packager';
    default:
      return '';
  }
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  content: { padding: spacing.lg, paddingBottom: spacing.xxl },
  action: { color: colors.accent, fontSize: font.small, fontWeight: '700', marginTop: spacing.xs },
  cardTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  score: { fontSize: font.small, fontWeight: '800' },
  cardTitre: { color: colors.text, fontSize: font.h3, fontWeight: '700', lineHeight: 22 },
  cardTags: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, marginTop: spacing.xs },
  vide: { alignItems: 'center', gap: spacing.md, paddingVertical: spacing.xxl },
  videTitre: { color: colors.text, fontSize: font.h3, fontWeight: '700' },
  videTxt: { color: colors.textMuted, fontSize: font.body, textAlign: 'center', lineHeight: 21 },
});
