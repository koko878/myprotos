import React, { useEffect, useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, SafeAreaView, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { Bouton, Carte, EnTete, BoutonAccueil } from '../components/ui';
import { useTr } from '../i18n';
import { useNav } from '../navigation';
import { enregistrerBonCommande, trouverUseCase } from '../storage';
import { colors, font, radius, spacing } from '../theme';
import { BonCommande, CibleDeploiement, UseCase } from '../types';

const mad = (n?: number) => (typeof n === 'number' ? n.toLocaleString('fr-FR') + ' MAD' : '—');

function reference(): string {
  return 'GETX-' + Math.random().toString(36).slice(2, 8).toUpperCase();
}

// Bon de commande : le client choisit la cible de déploiement, relit le récap
// (prix détaillé + coût RUN), accepte les conditions, signe (nom) et valide.
// Le paiement est géré hors-app (virement/facture).
export default function CommandeScreen({ useCaseId }: { useCaseId: string }) {
  const tr = useTr();
  const { aller, retour } = useNav();
  const [uc, setUc] = useState<UseCase | null>(null);
  const [cible, setCible] = useState<CibleDeploiement | null>(null);
  const [conditions, setConditions] = useState(false);
  const [signataire, setSignataire] = useState('');
  const [erreur, setErreur] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    trouverUseCase(useCaseId).then((u) => {
      setUc(u ?? null);
      if (u?.cibleDeploiement) setCible(u.cibleDeploiement);
      if (u?.client?.entreprise) setSignataire((s) => s || u.client!.entreprise!);
    });
  }, [useCaseId]);

  if (!uc) {
    return (
      <SafeAreaView style={styles.safe}>
        <Text style={styles.chargement}>{tr('Chargement…', 'Loading…')}</Text>
      </SafeAreaView>
    );
  }

  // Déjà commandé : on affiche le récap du bon de commande.
  if (uc.bonCommande) {
    const b = uc.bonCommande;
    return (
      <SafeAreaView style={styles.safe}>
        <EnTete titre={tr('Bon de commande', 'Purchase order')} onRetour={retour} droite={<BoutonAccueil onPress={() => aller({ nom: 'home' })} />} />
        <ScrollView contentContainerStyle={styles.content}>
          <Carte style={{ gap: spacing.sm, borderColor: colors.success + '66' }}>
            <Text style={styles.confTitre}>{tr('✅ Commande validée', '✅ Order confirmed')}</Text>
            <Ligne label={tr('Référence', 'Reference')} v={b.reference} />
            <Ligne label={tr('Projet', 'Project')} v={uc.titre} />
            <Ligne label={tr('Déploiement', 'Deployment')} v={b.cible === 'getexp' ? tr('Hébergé par iasser', 'Hosted by iasser') : tr('On-premise (chez le client)', 'On-premise (at the client)')} />
            <Ligne label={tr('Prix du projet', 'Project price')} v={mad(b.prixProjetEur)} />
            <Ligne label={tr('Coût de fonctionnement', 'Running cost')} v={b.coutRunMensuelEur ? mad(b.coutRunMensuelEur) + tr(' /mois', ' /month') : '—'} />
            <Ligne label={tr('Validé par', 'Validated by')} v={b.signataire} />
            <Ligne label={tr('Date', 'Date')} v={new Date(b.valideLe).toLocaleString('fr-FR')} />
          </Carte>
          <Text style={styles.note}>
            {tr(
              'Notre équipe vous contacte pour les modalités de paiement et le lancement.',
              'Our team will reach out to you about payment terms and the kickoff.'
            )}
          </Text>
          <Bouton titre={tr('Voir mon projet', 'View my project')} onPress={() => aller({ nom: 'detail', useCaseId })} />
        </ScrollView>
      </SafeAreaView>
    );
  }

  const prix = uc.ventilationPrix?.totalEur;
  const runMensuel =
    cible === 'getexp' ? uc.coutRun?.cloudMensuelEur : uc.coutRun?.onPremiseMensuelEur;

  async function valider() {
    if (!cible) return setErreur(tr('Choisissez où déployer votre application.', 'Choose where to deploy your application.'));
    if (!conditions) return setErreur(tr('Veuillez accepter les conditions pour valider.', 'Please accept the terms to confirm.'));
    if (signataire.trim().length < 2) return setErreur(tr('Indiquez votre nom pour signer.', 'Enter your name to sign.'));
    setErreur(null);
    setLoading(true);
    const bon: BonCommande = {
      reference: reference(),
      cible,
      prixProjetEur: prix,
      coutRunMensuelEur: runMensuel,
      signataire: signataire.trim(),
      emailSignataire: uc?.client?.email,
      conditionsAcceptees: true,
      valideLe: Date.now(),
    };
    await enregistrerBonCommande(useCaseId, bon);
    setLoading(false);
    aller({ nom: 'commande', useCaseId });
  }

  return (
    <SafeAreaView style={styles.safe}>
      <EnTete titre={tr('Bon de commande', 'Purchase order')} onRetour={retour} droite={<BoutonAccueil onPress={() => aller({ nom: 'home' })} />} />
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          <Text style={styles.intro}>
            {tr(
              'Dernière étape : choisissez où déployer votre application, relisez le récapitulatif, puis validez votre commande.',
              'Last step: choose where to deploy your application, review the summary, then confirm your order.'
            )}
          </Text>

          {/* Choix de la cible */}
          <Text style={styles.section}>{tr('Où déployer votre application ?', 'Where to deploy your application?')}</Text>
          <CibleCard
            actif={cible === 'getexp'}
            onPress={() => { setCible('getexp'); setErreur(null); }}
            titre={tr('☁️ Hébergé par iasser (clé en main)', '☁️ Hosted by iasser (turnkey)')}
            desc={tr(
              'Nous hébergeons et exploitons l’application pour vous. Rien à gérer côté technique.',
              'We host and operate the application for you. Nothing to manage on the technical side.'
            )}
            run={uc.coutRun?.cloudMensuelEur}
          />
          <CibleCard
            actif={cible === 'on_premise'}
            onPress={() => { setCible('on_premise'); setErreur(null); }}
            titre={tr('🏢 Sur votre infrastructure (on-premise)', '🏢 On your own infrastructure (on-premise)')}
            desc={tr(
              'Livraison d’un package clé en main à déployer sur vos serveurs / votre cloud.',
              'Delivery of a turnkey package to deploy on your servers / your cloud.'
            )}
            run={uc.coutRun?.onPremiseMensuelEur}
          />

          {/* Récapitulatif financier */}
          <Carte style={{ gap: spacing.sm, marginTop: spacing.md }}>
            <Text style={styles.section}>{tr('Récapitulatif', 'Summary')}</Text>
            <Ligne label={tr('Projet', 'Project')} v={uc.titre} />
            <Ligne label={tr('Prix du projet (one-shot)', 'Project price (one-time)')} v={mad(prix)} />
            <Ligne
              label={tr('Coût de fonctionnement', 'Running cost')}
              v={cible ? (runMensuel ? mad(runMensuel) + tr(' /mois', ' /month') : '—') : tr('Choisissez le déploiement', 'Choose the deployment')}
            />
            {uc.ventilationPrix?.note && <Text style={styles.note}>{uc.ventilationPrix.note}</Text>}
          </Carte>

          {/* Conditions + signature */}
          <Pressable style={styles.check} onPress={() => { setConditions((c) => !c); setErreur(null); }}>
            <View style={[styles.checkbox, conditions && styles.checkboxOn]}>
              {conditions && <Text style={styles.checkMark}>✓</Text>}
            </View>
            <Text style={styles.checkTxt}>
              {tr(
                'J’accepte le périmètre et le prix indiqués ci-dessus. Ce bon de commande vaut engagement ; les modalités de paiement seront convenues avec l’équipe iasser.',
                'I accept the scope and price stated above. This purchase order constitutes a commitment; payment terms will be agreed with the iasser team.'
              )}
            </Text>
          </Pressable>

          <Text style={styles.label}>{tr('Votre nom (signature)', 'Your name (signature)')}</Text>
          <TextInput
            style={styles.input}
            value={signataire}
            onChangeText={(t) => { setSignataire(t); setErreur(null); }}
            placeholder={tr('Prénom Nom', 'First and last name')}
            placeholderTextColor={colors.textMuted}
          />

          {erreur && <Text style={styles.err}>{erreur}</Text>}

          <Bouton
            titre={loading ? tr('Validation…', 'Confirming…') : tr('✅ Valider ma commande', '✅ Confirm my order')}
            onPress={valider}
            loading={loading}
          />
          <Text style={styles.note}>{tr('Aucun paiement en ligne. Notre équipe vous contacte ensuite.', 'No online payment. Our team will then contact you.')}</Text>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function CibleCard({ actif, onPress, titre, desc, run }: {
  actif: boolean; onPress: () => void; titre: string; desc: string; run?: number;
}) {
  const tr = useTr();
  return (
    <Pressable onPress={onPress} style={[styles.cible, actif && styles.cibleActif]}>
      <View style={styles.cibleTop}>
        <Text style={styles.cibleTitre}>{titre}</Text>
        <View style={[styles.radio, actif && styles.radioOn]}>{actif && <View style={styles.radioDot} />}</View>
      </View>
      <Text style={styles.cibleDesc}>{desc}</Text>
      {typeof run === 'number' && <Text style={styles.cibleRun}>≈ {mad(run)}{tr(' /mois de fonctionnement', ' /month of running cost')}</Text>}
    </Pressable>
  );
}

function Ligne({ label, v }: { label: string; v: string }) {
  return (
    <View style={styles.ligne}>
      <Text style={styles.ligneLabel}>{label}</Text>
      <Text style={styles.ligneVal}>{v}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  content: { padding: spacing.lg, paddingBottom: spacing.xxl, gap: spacing.md },
  intro: { color: colors.textMuted, fontSize: font.small, lineHeight: 20 },
  section: { color: colors.text, fontSize: font.h3, fontWeight: '800' },
  cible: {
    backgroundColor: colors.surface, borderWidth: 1.5, borderColor: colors.border,
    borderRadius: radius.md, padding: spacing.md, gap: 6,
  },
  cibleActif: { borderColor: colors.primary, backgroundColor: colors.primarySoft },
  cibleTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing.sm },
  cibleTitre: { color: colors.text, fontSize: font.body, fontWeight: '800', flex: 1 },
  cibleDesc: { color: colors.textMuted, fontSize: font.small, lineHeight: 19 },
  cibleRun: { color: colors.accent, fontSize: font.tiny, fontWeight: '700' },
  radio: { width: 22, height: 22, borderRadius: 11, borderWidth: 2, borderColor: colors.border, alignItems: 'center', justifyContent: 'center' },
  radioOn: { borderColor: colors.primary },
  radioDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: colors.primary },
  ligne: { flexDirection: 'row', justifyContent: 'space-between', gap: spacing.md, borderBottomWidth: 1, borderBottomColor: colors.border, paddingBottom: spacing.sm },
  ligneLabel: { color: colors.textMuted, fontSize: font.small, flexShrink: 0 },
  ligneVal: { color: colors.text, fontSize: font.small, fontWeight: '700', flex: 1, textAlign: 'right' },
  note: { color: colors.textMuted, fontSize: font.tiny, lineHeight: 16, fontStyle: 'italic' },
  check: { flexDirection: 'row', gap: spacing.sm, alignItems: 'flex-start', marginTop: spacing.md },
  checkbox: { width: 24, height: 24, borderRadius: 6, borderWidth: 2, borderColor: colors.border, alignItems: 'center', justifyContent: 'center' },
  checkboxOn: { borderColor: colors.primary, backgroundColor: colors.primary },
  checkMark: { color: '#fff', fontWeight: '900', fontSize: font.small },
  checkTxt: { color: colors.text, fontSize: font.small, lineHeight: 19, flex: 1 },
  label: { color: colors.text, fontSize: font.small, fontWeight: '700', marginTop: spacing.xs },
  input: {
    backgroundColor: colors.surfaceAlt, borderWidth: 1, borderColor: colors.border,
    borderRadius: radius.md, color: colors.text, fontSize: font.body,
    paddingHorizontal: spacing.md, paddingVertical: spacing.md,
  },
  err: { color: colors.danger, fontSize: font.small, lineHeight: 19 },
  confTitre: { color: colors.text, fontSize: font.h2, fontWeight: '800', marginBottom: spacing.xs },
  chargement: { color: colors.textMuted, textAlign: 'center', marginTop: 100 },
});
