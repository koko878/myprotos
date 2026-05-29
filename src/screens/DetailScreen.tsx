import React, { useEffect, useState } from 'react';
import { Pressable, SafeAreaView, ScrollView, StyleSheet, Text, View } from 'react-native';
import UseCaseView from '../components/UseCaseView';
import { Bouton, Carte } from '../components/ui';
import { useNav } from '../navigation';
import { accepterProposition, mettreAJourStatut, trouverUseCase } from '../storage';
import { colors, font, radius, spacing } from '../theme';
import { PropositionExpert, StatutUseCase, UseCase } from '../types';

const eur = (n: number) => n.toLocaleString('fr-FR') + ' €';

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

  async function accepter(propositionId: string) {
    const liste = await accepterProposition(useCaseId, propositionId);
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
  const propositions = uc.propositions ?? [];
  const acceptee = propositions.find((p) => p.statut === 'acceptée');

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

        {/* Propositions reçues des experts */}
        {estPublie && (
          <View style={{ marginTop: spacing.xl, gap: spacing.md }}>
            <Text style={styles.sectionTitre}>
              Propositions d’experts ({propositions.length})
            </Text>
            {propositions.length === 0 && (
              <Text style={styles.vide}>En attente de propositions d’experts…</Text>
            )}
            {propositions.map((p) => (
              <PropoCarte
                key={p.id}
                p={p}
                peutAccepter={uc.statut === 'publié'}
                onAccepter={() => accepter(p.id)}
              />
            ))}
          </View>
        )}

        {/* Pilotage du cycle de vie */}
        <View style={{ marginTop: spacing.xl, gap: spacing.sm }}>
          <Text style={styles.sectionTitre}>Faire avancer le projet</Text>
          {uc.statut === 'brouillon' && (
            <Bouton titre="📢 Publier pour les experts" onPress={() => avancer('publié')} />
          )}
          {uc.statut === 'publié' && (
            <Text style={styles.aide}>Acceptez une proposition ci-dessus pour lancer le prototype.</Text>
          )}
          {uc.statut === 'prototype_en_cours' && (
            <>
              {acceptee && (
                <Text style={styles.aide}>
                  {acceptee.expert} réalise votre prototype ({eur(acceptee.prixEur)} ·{' '}
                  {acceptee.delaiJours} j).
                </Text>
              )}
              <Bouton titre="✅ Valider le prototype" onPress={() => avancer('prototype_validé')} />
            </>
          )}
          {uc.statut === 'prototype_validé' && (
            <Bouton titre="🚀 Commander le projet clé en main" onPress={() => avancer('livré')} />
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

function PropoCarte({
  p,
  peutAccepter,
  onAccepter,
}: {
  p: PropositionExpert;
  peutAccepter: boolean;
  onAccepter: () => void;
}) {
  const refusee = p.statut === 'refusée';
  const acceptee = p.statut === 'acceptée';
  return (
    <Carte
      style={{
        gap: spacing.md,
        opacity: refusee ? 0.5 : 1,
        borderColor: acceptee ? colors.success + '66' : colors.border,
      }}
    >
      <View style={styles.propoTop}>
        <View style={styles.avatar}>
          <Text style={styles.avatarTxt}>{p.expert.slice(-2)}</Text>
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.expertNom}>{p.expert}</Text>
          <Text style={styles.expertMeta}>
            {p.specialite} · ⭐ {p.note}
          </Text>
        </View>
        {acceptee && <Text style={styles.badgeOk}>✓ Acceptée</Text>}
        {refusee && <Text style={styles.badgeKo}>Refusée</Text>}
      </View>

      <Text style={styles.propoMsg}>“{p.message}”</Text>

      <View style={styles.propoChiffres}>
        <View style={styles.chiffre}>
          <Text style={styles.chiffreVal}>{eur(p.prixEur)}</Text>
          <Text style={styles.chiffreLabel}>Prototype</Text>
        </View>
        <View style={styles.chiffre}>
          <Text style={styles.chiffreVal}>{p.delaiJours} j</Text>
          <Text style={styles.chiffreLabel}>Délai</Text>
        </View>
      </View>

      {peutAccepter && <Bouton titre="Accepter cette proposition" onPress={onAccepter} />}
    </Carte>
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
  vide: { color: colors.textMuted, fontSize: font.small, fontStyle: 'italic' },
  aide: { color: colors.textMuted, fontSize: font.small, lineHeight: 20 },
  propoTop: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
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
  badgeOk: { color: colors.success, fontWeight: '800', fontSize: font.small },
  badgeKo: { color: colors.textMuted, fontWeight: '700', fontSize: font.small },
  propoMsg: { color: colors.text, fontSize: font.small, lineHeight: 20, fontStyle: 'italic' },
  propoChiffres: { flexDirection: 'row', gap: spacing.md },
  chiffre: {
    flex: 1,
    backgroundColor: colors.surfaceAlt,
    borderRadius: radius.md,
    padding: spacing.md,
  },
  chiffreVal: { color: colors.text, fontSize: font.h3, fontWeight: '800' },
  chiffreLabel: { color: colors.textMuted, fontSize: font.small },
  livreTxt: { color: colors.text, fontSize: font.body, lineHeight: 21 },
  chargement: { color: colors.textMuted, textAlign: 'center', marginTop: 100 },
});
