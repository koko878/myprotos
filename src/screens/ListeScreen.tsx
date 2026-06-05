import React, { useEffect, useState } from 'react';
import { SafeAreaView, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Bouton, Carte, EnTete, Etiquette, couleurComplexite } from '../components/ui';
import { libelleStatut } from '../components/UseCaseView';
import { useTr } from '../i18n';
import { useNav } from '../navigation';
import { chargerUseCases } from '../storage';
import { colors, font, spacing } from '../theme';
import { UseCase } from '../types';

export default function ListeScreen() {
  const tr = useTr();
  const { aller, retour } = useNav();
  const [liste, setListe] = useState<UseCase[] | null>(null);

  // Recharge à chaque affichage (retour depuis recap/detail).
  useEffect(() => {
    chargerUseCases().then(setListe);
  }, []);

  return (
    <SafeAreaView style={styles.safe}>
      <EnTete titre={tr('Mes projets', 'My projects')} onRetour={retour} />

      <ScrollView contentContainerStyle={styles.content}>
        {liste && liste.length === 0 && (
          <View style={styles.vide}>
            <Text style={styles.videTitre}>{tr('Aucun projet pour l’instant', 'No projects yet')}</Text>
            <Text style={styles.videTxt}>
              {tr(
                'Exprimez votre première idée, l’assistant IA vous aide à la cadrer.',
                'Share your first idea and the AI assistant will help you shape it.'
              )}
            </Text>
            <Bouton titre={tr('✨ Exprimer une idée', '✨ Share an idea')} onPress={() => aller({ nom: 'cadrage' })} />
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
            {prochaineAction(uc.statut, tr) && (
              <Text style={styles.action}>{prochaineAction(uc.statut, tr)}</Text>
            )}
          </Carte>
        ))}

        {liste && liste.length > 0 && (
          <Bouton titre={tr('✨ Nouvelle idée', '✨ New idea')} onPress={() => aller({ nom: 'cadrage' })} />
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

function scoreCouleur(s: number) {
  return s >= 75 ? colors.success : s >= 50 ? colors.warn : colors.danger;
}

// Indique au client ce qu'il peut/doit faire ensuite, selon l'étape.
function prochaineAction(statut: UseCase['statut'], tr: (fr: string, en: string) => string): string {
  switch (statut) {
    case 'brouillon':
      return tr('👉 À soumettre pour lancer le prototype', '👉 Submit it to start the prototype');
    case 'soumis':
      return tr('⏳ Prototype en préparation', '⏳ Prototype in progress');
    case 'prototype_pret_admin':
      return tr('⏳ Prototype en préparation', '⏳ Prototype in progress');
    case 'prototype_genere':
      return tr('👉 Votre prototype est prêt — à voir et valider', '👉 Your prototype is ready — review and approve it');
    case 'revision_demandee':
      return tr('⏳ Nouvelle version en préparation', '⏳ New version in progress');
    case 'prototype_valide':
      return tr('👉 Passez au cadrage technique', '👉 Move on to technical scoping');
    case 'cadrage_technique':
      return tr('👉 Reprendre le cadrage technique', '👉 Resume technical scoping');
    case 'pret_a_packager':
      return tr('✅ Prêt à packager', '✅ Ready to package');
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
