import React, { useEffect, useState } from 'react';
import { Pressable, SafeAreaView, ScrollView, StyleSheet, Text, View } from 'react-native';
import UseCaseView from '../components/UseCaseView';
import { Bouton, Carte } from '../components/ui';
import { useNav } from '../navigation';
import { trouverUseCase } from '../storage';
import { colors, font, radius, spacing } from '../theme';
import { CadrageTechnique, UseCase } from '../types';

export default function DetailScreen({ useCaseId }: { useCaseId: string }) {
  const { aller, retour } = useNav();
  const [uc, setUc] = useState<UseCase | null>(null);

  useEffect(() => {
    trouverUseCase(useCaseId).then((u) => setUc(u ?? null));
  }, [useCaseId]);

  if (!uc) {
    return (
      <SafeAreaView style={styles.safe}>
        <Text style={styles.chargement}>Chargement…</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.header}>
        <Pressable onPress={retour} hitSlop={12}>
          <Text style={styles.retour}>‹ Retour</Text>
        </Pressable>
        <Text style={styles.headerTitre}>Mon projet</Text>
        <View style={{ width: 70 }} />
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        <EtapeSuivante uc={uc} aller={aller} />

        <UseCaseView uc={uc} />

        {uc.cadrageTechnique && <PackagingBloc c={uc.cadrageTechnique} />}
      </ScrollView>
    </SafeAreaView>
  );
}

// Bandeau d'action contextuel selon l'étape du cycle de vie.
function EtapeSuivante({ uc, aller }: { uc: UseCase; aller: (r: any) => void }) {
  if (uc.statut === 'soumis') {
    return (
      <Carte style={[styles.etape, { borderColor: colors.accent + '55' }]}>
        <Text style={styles.etapeTitre}>⏳ Projet soumis</Text>
        <Text style={styles.etapeTxt}>
          Notre équipe prépare votre prototype. Vous serez notifié dès qu’il est prêt à
          être visualisé.
        </Text>
      </Carte>
    );
  }
  if (uc.statut === 'prototype_genere') {
    const revise = (uc.prototypeVersion ?? 1) > 1;
    return (
      <Carte style={[styles.etape, { borderColor: colors.warn + '66' }]}>
        <Text style={styles.etapeTitre}>
          🎨 {revise ? `Nouvelle version du prototype (v${uc.prototypeVersion})` : 'Votre prototype est prêt !'}
        </Text>
        <Text style={styles.etapeTxt}>
          {revise
            ? 'Nous avons intégré vos remarques. Visualisez la nouvelle version.'
            : 'Visualisez-le, puis validez-le ou demandez des ajustements.'}
        </Text>
        <Bouton titre="👁️ Voir le prototype" onPress={() => aller({ nom: 'prototype', useCaseId: uc.id })} />
      </Carte>
    );
  }
  if (uc.statut === 'revision_demandee') {
    return (
      <Carte style={[styles.etape, { borderColor: colors.warn + '66' }]}>
        <Text style={styles.etapeTitre}>📝 Remarques transmises</Text>
        <Text style={styles.etapeTxt}>
          Notre équipe retravaille le prototype en intégrant vos demandes. Vous serez
          notifié dès que la nouvelle version est prête.
        </Text>
      </Carte>
    );
  }
  if (uc.statut === 'prototype_valide') {
    return (
      <Carte style={[styles.etape, { borderColor: colors.success + '66' }]}>
        <Text style={styles.etapeTitre}>✅ Prototype validé</Text>
        <Text style={styles.etapeTxt}>
          Passons au cadrage technique : notre architecte IA va préparer la livraison
          plug-and-play dans votre infrastructure.
        </Text>
        <Bouton titre="🏗️ Démarrer le cadrage technique" onPress={() => aller({ nom: 'technique', useCaseId: uc.id })} />
        <Bouton titre="Revoir le prototype" variante="secondaire" onPress={() => aller({ nom: 'prototype', useCaseId: uc.id })} />
      </Carte>
    );
  }
  if (uc.statut === 'cadrage_technique') {
    return (
      <Carte style={[styles.etape, { borderColor: colors.warn + '66' }]}>
        <Text style={styles.etapeTitre}>🏗️ Cadrage technique en cours</Text>
        <Text style={styles.etapeTxt}>Reprenez l’entretien avec l’architecte IA.</Text>
        <Bouton titre="Continuer le cadrage technique" onPress={() => aller({ nom: 'technique', useCaseId: uc.id })} />
      </Carte>
    );
  }
  if (uc.statut === 'pret_a_packager') {
    return (
      <Carte style={[styles.etape, { borderColor: colors.success + '66' }]}>
        <Text style={styles.etapeTitre}>📦 Prêt à packager</Text>
        <Text style={styles.etapeTxt}>
          Le plan de livraison plug-and-play est défini (voir ci-dessous). Prochaine étape :
          la certification sécurité.
        </Text>
        <Bouton titre="Revoir le prototype" variante="secondaire" onPress={() => aller({ nom: 'prototype', useCaseId: uc.id })} />
      </Carte>
    );
  }
  return null;
}

// Affiche le plan de packaging plug-and-play issu du cadrage technique.
function PackagingBloc({ c }: { c: CadrageTechnique }) {
  return (
    <Carte style={{ gap: spacing.md, marginTop: spacing.lg, borderColor: colors.primary + '55' }}>
      <Text style={styles.blocTitre}>📦 Livraison plug-and-play</Text>
      <Text style={styles.blocTxt}>{c.resumePackaging}</Text>

      <Ligne label="Format de livraison" valeur={c.formatLivraison} />
      <Ligne label="Hébergement" valeur={c.hebergement} />
      <Ligne label="Base de données" valeur={c.baseDeDonnees} />
      <Ligne label="Authentification" valeur={c.authentification} />
      <Ligne label="Sécurité" valeur={c.contraintesSecu} />

      <Text style={styles.specLabel}>Prérequis</Text>
      {c.prerequis.map((p) => (
        <View key={p} style={styles.puceRow}>
          <View style={styles.puce} />
          <Text style={styles.puceTxt}>{p}</Text>
        </View>
      ))}

      <Text style={styles.specLabel}>Étapes de déploiement</Text>
      {c.etapesDeploiement.map((e, i) => (
        <View key={e} style={styles.puceRow}>
          <Text style={styles.num}>{i + 1}</Text>
          <Text style={styles.puceTxt}>{e}</Text>
        </View>
      ))}
    </Carte>
  );
}

function Ligne({ label, valeur }: { label: string; valeur: string }) {
  return (
    <View style={styles.ligne}>
      <Text style={styles.ligneLabel}>{label}</Text>
      <Text style={styles.ligneVal}>{valeur}</Text>
    </View>
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
  etape: { gap: spacing.md, marginBottom: spacing.lg },
  etapeTitre: { color: colors.text, fontSize: font.h3, fontWeight: '800' },
  etapeTxt: { color: colors.textMuted, fontSize: font.small, lineHeight: 20 },
  blocTitre: { color: colors.text, fontSize: font.h3, fontWeight: '700' },
  blocTxt: { color: colors.textMuted, fontSize: font.body, lineHeight: 22 },
  specLabel: { color: colors.text, fontSize: font.small, fontWeight: '800', marginTop: spacing.xs },
  ligne: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    paddingBottom: spacing.sm,
  },
  ligneLabel: { color: colors.textMuted, fontSize: font.small, flexShrink: 0 },
  ligneVal: { color: colors.text, fontSize: font.small, fontWeight: '600', flex: 1, textAlign: 'right' },
  puceRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  puce: { width: 6, height: 6, borderRadius: 3, backgroundColor: colors.accent },
  num: {
    color: colors.accent,
    fontWeight: '800',
    width: 18,
    fontSize: font.small,
  },
  puceTxt: { color: colors.text, fontSize: font.small, flex: 1, lineHeight: 19 },
  chargement: { color: colors.textMuted, textAlign: 'center', marginTop: 100 },
});
