import React, { useEffect, useState } from 'react';
import { SafeAreaView, ScrollView, StyleSheet, Text, View } from 'react-native';
import FriseStatut from '../components/FriseStatut';
import UseCaseView from '../components/UseCaseView';
import { Bouton, Carte, EnTete } from '../components/ui';
import { useTr } from '../i18n';
import { useNav } from '../navigation';
import { trouverUseCase } from '../storage';
import { colors, font, radius, spacing } from '../theme';
import { CadrageTechnique, UseCase } from '../types';

export default function DetailScreen({ useCaseId }: { useCaseId: string }) {
  const { aller, retour } = useNav();
  const tr = useTr();
  const [uc, setUc] = useState<UseCase | null>(null);

  useEffect(() => {
    trouverUseCase(useCaseId).then((u) => setUc(u ?? null));
  }, [useCaseId]);

  if (!uc) {
    return (
      <SafeAreaView style={styles.safe}>
        <Text style={styles.chargement}>{tr('Chargement…', 'Loading…')}</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe}>
      <EnTete titre={tr('Mon projet', 'My project')} onRetour={retour} />

      <ScrollView contentContainerStyle={styles.content}>
        <FriseStatut statut={uc.statut} />

        <EtapeSuivante uc={uc} aller={aller} />

        <UseCaseView uc={uc} />

        {uc.cadrageTechnique && <PackagingBloc c={uc.cadrageTechnique} />}
      </ScrollView>
    </SafeAreaView>
  );
}

// Bandeau d'action contextuel selon l'étape du cycle de vie.
function EtapeSuivante({ uc, aller }: { uc: UseCase; aller: (r: any) => void }) {
  const tr = useTr();
  // 'prototype_pret_admin' = déposé côté admin mais pas encore envoyé : pour le
  // client, c'est toujours "en préparation".
  if (uc.statut === 'soumis' || uc.statut === 'prototype_pret_admin') {
    return (
      <Carte style={[styles.etape, { borderColor: colors.accent + '55' }]}>
        <Text style={styles.etapeTitre}>{tr('⏳ Projet soumis', '⏳ Project submitted')}</Text>
        <Text style={styles.etapeTxt}>
          {tr(
            'Notre équipe prépare votre prototype. Vous serez notifié dès qu’il est prêt à être visualisé.',
            'Our team is preparing your prototype. You’ll be notified as soon as it’s ready to view.'
          )}
        </Text>
      </Carte>
    );
  }
  if (uc.statut === 'prototype_genere') {
    const revise = (uc.prototypeVersion ?? 1) > 1;
    return (
      <Carte style={[styles.etape, { borderColor: colors.warn + '66' }]}>
        <Text style={styles.etapeTitre}>
          🎨 {revise
            ? tr(`Nouvelle version du prototype (v${uc.prototypeVersion})`, `New prototype version (v${uc.prototypeVersion})`)
            : tr('Votre prototype est prêt !', 'Your prototype is ready!')}
        </Text>
        <Text style={styles.etapeTxt}>
          {revise
            ? tr('Nous avons intégré vos remarques. Visualisez la nouvelle version.', 'We’ve incorporated your feedback. Take a look at the new version.')
            : tr('Visualisez-le, puis validez-le ou demandez des ajustements.', 'View it, then approve it or request adjustments.')}
        </Text>
        <Bouton titre={tr('👁️ Voir le prototype', '👁️ View the prototype')} onPress={() => aller({ nom: 'prototype', useCaseId: uc.id })} />
      </Carte>
    );
  }
  if (uc.statut === 'revision_demandee') {
    return (
      <Carte style={[styles.etape, { borderColor: colors.warn + '66' }]}>
        <Text style={styles.etapeTitre}>{tr('📝 Remarques transmises', '📝 Feedback sent')}</Text>
        <Text style={styles.etapeTxt}>
          {tr(
            'Notre équipe retravaille le prototype en intégrant vos demandes. Vous serez notifié dès que la nouvelle version est prête.',
            'Our team is reworking the prototype to incorporate your requests. You’ll be notified as soon as the new version is ready.'
          )}
        </Text>
      </Carte>
    );
  }
  if (uc.statut === 'prototype_valide') {
    return (
      <Carte style={[styles.etape, { borderColor: colors.success + '66' }]}>
        <Text style={styles.etapeTitre}>{tr('✅ Prototype validé', '✅ Prototype approved')}</Text>
        <Text style={styles.etapeTxt}>
          {tr(
            'Passons au cadrage technique : notre architecte IA va préparer la livraison plug-and-play dans votre infrastructure.',
            'Let’s move on to technical scoping: our AI architect will prepare the plug-and-play delivery into your infrastructure.'
          )}
        </Text>
        <Bouton titre={tr('🏗️ Démarrer le cadrage technique', '🏗️ Start technical scoping')} onPress={() => aller({ nom: 'technique', useCaseId: uc.id })} />
        <Bouton titre={tr('Revoir le prototype', 'Review the prototype')} variante="secondaire" onPress={() => aller({ nom: 'prototype', useCaseId: uc.id })} />
      </Carte>
    );
  }
  if (uc.statut === 'cadrage_technique') {
    return (
      <Carte style={[styles.etape, { borderColor: colors.warn + '66' }]}>
        <Text style={styles.etapeTitre}>{tr('🏗️ Cadrage technique en cours', '🏗️ Technical scoping in progress')}</Text>
        <Text style={styles.etapeTxt}>{tr('Reprenez l’entretien avec l’architecte IA.', 'Resume the interview with the AI architect.')}</Text>
        <Bouton titre={tr('Continuer le cadrage technique', 'Continue technical scoping')} onPress={() => aller({ nom: 'technique', useCaseId: uc.id })} />
      </Carte>
    );
  }
  if (uc.statut === 'pret_a_packager') {
    return (
      <Carte style={[styles.etape, { borderColor: colors.success + '66' }]}>
        <Text style={styles.etapeTitre}>{tr('📦 Prêt à commander', '📦 Ready to order')}</Text>
        <Text style={styles.etapeTxt}>
          {tr(
            'Le plan de livraison plug-and-play est défini (voir ci-dessous). Validez votre commande pour lancer la réalisation.',
            'The plug-and-play delivery plan is set (see below). Confirm your order to kick off the build.'
          )}
        </Text>
        <Bouton titre={tr('🧾 Passer au bon de commande', '🧾 Proceed to purchase order')} onPress={() => aller({ nom: 'commande', useCaseId: uc.id })} />
        <Bouton titre={tr('Revoir le prototype', 'Review the prototype')} variante="secondaire" onPress={() => aller({ nom: 'prototype', useCaseId: uc.id })} />
      </Carte>
    );
  }
  if (uc.statut === 'commande_validee') {
    return (
      <Carte style={[styles.etape, { borderColor: colors.success + '66' }]}>
        <Text style={styles.etapeTitre}>{tr('✅ Commande validée', '✅ Order confirmed')}</Text>
        <Text style={styles.etapeTxt}>
          {tr(
            'Merci ! Votre commande est enregistrée. Notre équipe vous contacte pour les modalités de paiement et le lancement de la réalisation.',
            'Thank you! Your order has been recorded. Our team will contact you about payment terms and kicking off the build.'
          )}
        </Text>
        <Bouton titre={tr('Voir le bon de commande', 'View the purchase order')} variante="secondaire" onPress={() => aller({ nom: 'commande', useCaseId: uc.id })} />
      </Carte>
    );
  }
  return null;
}

// Affiche le plan de packaging plug-and-play issu du cadrage technique.
function PackagingBloc({ c }: { c: CadrageTechnique }) {
  const tr = useTr();
  return (
    <Carte style={{ gap: spacing.md, marginTop: spacing.lg, borderColor: colors.primary + '55' }}>
      <Text style={styles.blocTitre}>{tr('📦 Livraison plug-and-play', '📦 Plug-and-play delivery')}</Text>
      <Text style={styles.blocTxt}>{c.resumePackaging}</Text>

      <Ligne label={tr('Format de livraison', 'Delivery format')} valeur={c.formatLivraison} />
      <Ligne label={tr('Hébergement', 'Hosting')} valeur={c.hebergement} />
      <Ligne label={tr('Base de données', 'Database')} valeur={c.baseDeDonnees} />
      <Ligne label={tr('Authentification', 'Authentication')} valeur={c.authentification} />
      <Ligne label={tr('Sécurité', 'Security')} valeur={c.contraintesSecu} />

      <Text style={styles.specLabel}>{tr('Prérequis', 'Prerequisites')}</Text>
      {c.prerequis.map((p) => (
        <View key={p} style={styles.puceRow}>
          <View style={styles.puce} />
          <Text style={styles.puceTxt}>{p}</Text>
        </View>
      ))}

      <Text style={styles.specLabel}>{tr('Étapes de déploiement', 'Deployment steps')}</Text>
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
