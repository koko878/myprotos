import React, { useEffect, useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, SafeAreaView, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { Bouton, Carte, EnTete, BoutonAccueil } from '../components/ui';
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
        <Text style={styles.chargement}>Chargement…</Text>
      </SafeAreaView>
    );
  }

  // Déjà commandé : on affiche le récap du bon de commande.
  if (uc.bonCommande) {
    const b = uc.bonCommande;
    return (
      <SafeAreaView style={styles.safe}>
        <EnTete titre="Bon de commande" onRetour={retour} droite={<BoutonAccueil onPress={() => aller({ nom: 'home' })} />} />
        <ScrollView contentContainerStyle={styles.content}>
          <Carte style={{ gap: spacing.sm, borderColor: colors.success + '66' }}>
            <Text style={styles.confTitre}>✅ Commande validée</Text>
            <Ligne label="Référence" v={b.reference} />
            <Ligne label="Projet" v={uc.titre} />
            <Ligne label="Déploiement" v={b.cible === 'getexp' ? 'Hébergé par GetExp' : 'On-premise (chez le client)'} />
            <Ligne label="Prix du projet" v={mad(b.prixProjetEur)} />
            <Ligne label="Coût de fonctionnement" v={b.coutRunMensuelEur ? mad(b.coutRunMensuelEur) + ' /mois' : '—'} />
            <Ligne label="Validé par" v={b.signataire} />
            <Ligne label="Date" v={new Date(b.valideLe).toLocaleString('fr-FR')} />
          </Carte>
          <Text style={styles.note}>
            Notre équipe vous contacte pour les modalités de paiement et le lancement.
          </Text>
          <Bouton titre="Voir mon projet" onPress={() => aller({ nom: 'detail', useCaseId })} />
        </ScrollView>
      </SafeAreaView>
    );
  }

  const prix = uc.ventilationPrix?.totalEur;
  const runMensuel =
    cible === 'getexp' ? uc.coutRun?.cloudMensuelEur : uc.coutRun?.onPremiseMensuelEur;

  async function valider() {
    if (!cible) return setErreur('Choisissez où déployer votre application.');
    if (!conditions) return setErreur('Veuillez accepter les conditions pour valider.');
    if (signataire.trim().length < 2) return setErreur('Indiquez votre nom pour signer.');
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
      <EnTete titre="Bon de commande" onRetour={retour} droite={<BoutonAccueil onPress={() => aller({ nom: 'home' })} />} />
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          <Text style={styles.intro}>
            Dernière étape : choisissez où déployer votre application, relisez le récapitulatif,
            puis validez votre commande.
          </Text>

          {/* Choix de la cible */}
          <Text style={styles.section}>Où déployer votre application ?</Text>
          <CibleCard
            actif={cible === 'getexp'}
            onPress={() => { setCible('getexp'); setErreur(null); }}
            titre="☁️ Hébergé par GetExp (clé en main)"
            desc="Nous hébergeons et exploitons l’application pour vous. Rien à gérer côté technique."
            run={uc.coutRun?.cloudMensuelEur}
          />
          <CibleCard
            actif={cible === 'on_premise'}
            onPress={() => { setCible('on_premise'); setErreur(null); }}
            titre="🏢 Sur votre infrastructure (on-premise)"
            desc="Livraison d’un package clé en main à déployer sur vos serveurs / votre cloud."
            run={uc.coutRun?.onPremiseMensuelEur}
          />

          {/* Récapitulatif financier */}
          <Carte style={{ gap: spacing.sm, marginTop: spacing.md }}>
            <Text style={styles.section}>Récapitulatif</Text>
            <Ligne label="Projet" v={uc.titre} />
            <Ligne label="Prix du projet (one-shot)" v={mad(prix)} />
            <Ligne
              label="Coût de fonctionnement"
              v={cible ? (runMensuel ? mad(runMensuel) + ' /mois' : '—') : 'Choisissez le déploiement'}
            />
            {uc.ventilationPrix?.note && <Text style={styles.note}>{uc.ventilationPrix.note}</Text>}
          </Carte>

          {/* Conditions + signature */}
          <Pressable style={styles.check} onPress={() => { setConditions((c) => !c); setErreur(null); }}>
            <View style={[styles.checkbox, conditions && styles.checkboxOn]}>
              {conditions && <Text style={styles.checkMark}>✓</Text>}
            </View>
            <Text style={styles.checkTxt}>
              J’accepte le périmètre et le prix indiqués ci-dessus. Ce bon de commande vaut
              engagement ; les modalités de paiement seront convenues avec l’équipe GetExp.
            </Text>
          </Pressable>

          <Text style={styles.label}>Votre nom (signature)</Text>
          <TextInput
            style={styles.input}
            value={signataire}
            onChangeText={(t) => { setSignataire(t); setErreur(null); }}
            placeholder="Prénom Nom"
            placeholderTextColor={colors.textMuted}
          />

          {erreur && <Text style={styles.err}>{erreur}</Text>}

          <Bouton
            titre={loading ? 'Validation…' : '✅ Valider ma commande'}
            onPress={valider}
            loading={loading}
          />
          <Text style={styles.note}>Aucun paiement en ligne. Notre équipe vous contacte ensuite.</Text>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function CibleCard({ actif, onPress, titre, desc, run }: {
  actif: boolean; onPress: () => void; titre: string; desc: string; run?: number;
}) {
  return (
    <Pressable onPress={onPress} style={[styles.cible, actif && styles.cibleActif]}>
      <View style={styles.cibleTop}>
        <Text style={styles.cibleTitre}>{titre}</Text>
        <View style={[styles.radio, actif && styles.radioOn]}>{actif && <View style={styles.radioDot} />}</View>
      </View>
      <Text style={styles.cibleDesc}>{desc}</Text>
      {typeof run === 'number' && <Text style={styles.cibleRun}>≈ {mad(run)} /mois de fonctionnement</Text>}
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
