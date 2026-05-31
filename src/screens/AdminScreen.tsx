import React, { useEffect, useState } from 'react';
import { Pressable, SafeAreaView, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Carte, Etiquette } from '../components/ui';
import { libelleStatut } from '../components/UseCaseView';
import { useNav } from '../navigation';
import { chargerUseCases } from '../storage';
import { colors, font, spacing } from '../theme';
import { UseCase } from '../types';

// Espace admin : pilotage des projets soumis (génération des prototypes).
// On masque les brouillons (pas encore soumis par le client).
const VISIBLES: UseCase['statut'][] = [
  'soumis',
  'prototype_pret_admin',
  'prototype_genere',
  'prototype_valide',
  'cadrage_technique',
  'pret_a_packager',
  'certifie',
];

export default function AdminScreen() {
  const { aller, retour } = useNav();
  const [liste, setListe] = useState<UseCase[] | null>(null);

  useEffect(() => {
    chargerUseCases().then((l) => setListe(l.filter((u) => VISIBLES.includes(u.statut))));
  }, []);

  const aTraiter = liste?.filter((u) => u.statut === 'soumis').length ?? 0;

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.header}>
        <Pressable onPress={retour} hitSlop={12}>
          <Text style={styles.retour}>‹ Accueil</Text>
        </Pressable>
        <Text style={styles.headerTitre}>Espace admin</Text>
        <View style={{ width: 70 }} />
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.intro}>
          Projets soumis par les clients. {aTraiter > 0 ? `${aTraiter} en attente de prototype.` : 'Aucun nouveau projet à traiter.'}
        </Text>

        {liste && liste.length === 0 && (
          <View style={styles.vide}>
            <Text style={styles.videTitre}>Aucun projet soumis</Text>
            <Text style={styles.videTxt}>Les projets soumis par les clients apparaîtront ici.</Text>
          </View>
        )}

        {liste?.map((uc) => {
          const st = libelleStatut(uc.statut);
          const aGenerer = uc.statut === 'soumis' || uc.statut === 'revision_demandee';
          const aEnvoyer = uc.statut === 'prototype_pret_admin';
          const aAgir = aGenerer || aEnvoyer;
          return (
            <Carte
              key={uc.id}
              style={{ marginBottom: spacing.md, gap: spacing.sm, borderColor: aAgir ? colors.warn + '66' : colors.border }}
              onPress={() => aller({ nom: 'adminDetail', useCaseId: uc.id })}
            >
              <View style={styles.cardTop}>
                <Etiquette texte={st.texte} couleur={st.couleur} />
                {aGenerer && <Text style={styles.action}>⚙️ À générer</Text>}
                {aEnvoyer && <Text style={styles.action}>📤 À envoyer</Text>}
              </View>
              <Text style={styles.cardTitre}>{uc.titre}</Text>
              <View style={styles.tags}>
                <Etiquette texte={uc.domaine} />
                <Etiquette texte={uc.complexite} />
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
  action: { color: colors.warn, fontSize: font.small, fontWeight: '800' },
  cardTitre: { color: colors.text, fontSize: font.h3, fontWeight: '700', lineHeight: 22 },
  tags: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, marginTop: spacing.xs },
  vide: { alignItems: 'center', gap: spacing.md, paddingVertical: spacing.xxl },
  videTitre: { color: colors.text, fontSize: font.h3, fontWeight: '700' },
  videTxt: { color: colors.textMuted, fontSize: font.body, textAlign: 'center', lineHeight: 21 },
});
