import React, { useEffect, useState } from 'react';
import { Pressable, SafeAreaView, ScrollView, StyleSheet, Text, View } from 'react-native';
import UseCaseView from '../components/UseCaseView';
import { Bouton, Carte } from '../components/ui';
import { useNav } from '../navigation';
import { mettreAJourStatut, trouverUseCase } from '../storage';
import { colors, font, radius, spacing } from '../theme';
import { StatutUseCase, UseCase } from '../types';

// Experts anonymisés (simulation de la dynamique côté offre).
const EXPERTS_FICTIFS = [
  { pseudo: 'Expert #A37', note: 4.9, specialite: 'ML / NLP', missions: 23 },
  { pseudo: 'Expert #C12', note: 4.7, specialite: 'Data Eng.', missions: 15 },
  { pseudo: 'Expert #F88', note: 5.0, specialite: 'LLM / RAG', missions: 31 },
];

export default function DetailScreen({ useCaseId }: { useCaseId: string }) {
  const { aller, retour } = useNav();
  const [uc, setUc] = useState<UseCase | null>(null);

  useEffect(() => {
    trouverUseCase(useCaseId).then((u) => setUc(u ?? null));
  }, [useCaseId]);

  async function avancer(statut: StatutUseCase) {
    const liste = await mettreAJourStatut(useCaseId, statut);
    setUc(liste.find((u) => u.id === useCaseId) ?? null);
  }

  if (!uc) {
    return (
      <SafeAreaView style={styles.safe}>
        <Text style={styles.chargement}>Chargement…</Text>
      </SafeAreaView>
    );
  }

  const estPublie = uc.statut !== 'brouillon';

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.header}>
        <Pressable onPress={retour} hitSlop={12}>
          <Text style={styles.retour}>‹ Retour</Text>
        </Pressable>
        <Text style={styles.headerTitre}>Use case</Text>
        <View style={{ width: 70 }} />
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        <UseCaseView uc={uc} />

        {/* Activité côté experts (anonymes) */}
        {estPublie && (
          <View style={{ marginTop: spacing.xl, gap: spacing.md }}>
            <Text style={styles.sectionTitre}>Experts positionnés ({EXPERTS_FICTIFS.length})</Text>
            {EXPERTS_FICTIFS.map((e) => (
              <Carte key={e.pseudo} style={styles.expertCard}>
                <View style={styles.avatar}>
                  <Text style={styles.avatarTxt}>{e.pseudo.slice(-2)}</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.expertNom}>{e.pseudo}</Text>
                  <Text style={styles.expertMeta}>
                    {e.specialite} · ⭐ {e.note} · {e.missions} missions
                  </Text>
                </View>
                <View style={styles.proto}>
                  <Text style={styles.protoTxt}>Prototype</Text>
                </View>
              </Carte>
            ))}
          </View>
        )}

        {/* Pilotage du cycle de vie (démo de la mécanique produit) */}
        <View style={{ marginTop: spacing.xl, gap: spacing.sm }}>
          <Text style={styles.sectionTitre}>Faire avancer le projet</Text>
          {uc.statut === 'brouillon' && (
            <Bouton titre="📢 Publier pour les experts" onPress={() => avancer('publié')} />
          )}
          {uc.statut === 'publié' && (
            <Bouton
              titre="Accepter un prototype (Expert #F88)"
              onPress={() => avancer('prototype_en_cours')}
            />
          )}
          {uc.statut === 'prototype_en_cours' && (
            <Bouton titre="✅ Valider le prototype" onPress={() => avancer('prototype_validé')} />
          )}
          {uc.statut === 'prototype_validé' && (
            <Bouton
              titre="🚀 Commander le projet clé en main"
              onPress={() => avancer('livré')}
            />
          )}
          {uc.statut === 'livré' && (
            <Carte style={{ backgroundColor: colors.success + '18', borderColor: colors.success + '44' }}>
              <Text style={styles.livreTxt}>
                🎉 Projet livré clé en main. Commission plateforme prélevée via l’escrow sécurisé.
              </Text>
            </Carte>
          )}
        </View>
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
  sectionTitre: { color: colors.text, fontSize: font.h3, fontWeight: '800' },
  expertCard: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  avatar: {
    width: 42,
    height: 42,
    borderRadius: radius.pill,
    backgroundColor: colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarTxt: { color: colors.accent, fontWeight: '800' },
  expertNom: { color: colors.text, fontSize: font.body, fontWeight: '700' },
  expertMeta: { color: colors.textMuted, fontSize: font.small },
  proto: {
    backgroundColor: colors.primary,
    borderRadius: radius.pill,
    paddingHorizontal: spacing.md,
    paddingVertical: 6,
  },
  protoTxt: { color: '#fff', fontSize: font.small, fontWeight: '700' },
  livreTxt: { color: colors.text, fontSize: font.body, lineHeight: 21 },
  chargement: { color: colors.textMuted, textAlign: 'center', marginTop: 100 },
});
