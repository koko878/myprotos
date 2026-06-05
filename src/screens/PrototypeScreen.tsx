import React, { useEffect, useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  SafeAreaView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import HtmlPreview from '../components/HtmlPreview';
import { Bouton, Carte, EnTete } from '../components/ui';
import { useTr } from '../i18n';
import { iaDisponible } from '../llm';
import { useNav } from '../navigation';
import { ouvrirHtmlNouvelOnglet } from '../ouvrir';
import { ajouterRemarque, mettreAJourStatut, trouverUseCase } from '../storage';
import { colors, font, radius, spacing } from '../theme';
import { UseCase } from '../types';

export default function PrototypeScreen({ useCaseId }: { useCaseId: string }) {
  const { aller, retour } = useNav();
  const tr = useTr();
  const [uc, setUc] = useState<UseCase | null>(null);
  const [challenge, setChallenge] = useState(false); // formulaire de remarque ouvert
  const [remarque, setRemarque] = useState('');
  const [envoye, setEnvoye] = useState(false);

  useEffect(() => {
    trouverUseCase(useCaseId).then((u) => setUc(u ?? null));
  }, [useCaseId]);

  async function valider() {
    await mettreAJourStatut(useCaseId, 'prototype_valide');
    aller({ nom: 'technique', useCaseId });
  }

  async function envoyerRemarque() {
    const txt = remarque.trim();
    if (!txt) return;
    await ajouterRemarque(useCaseId, txt);
    setEnvoye(true);
  }

  function pleinEcran() {
    if (uc?.prototypeHtml) ouvrirHtmlNouvelOnglet(uc.prototypeHtml);
  }

  if (!uc) {
    return (
      <SafeAreaView style={styles.safe}>
        <Text style={styles.chargement}>{tr('Chargement…', 'Loading…')}</Text>
      </SafeAreaView>
    );
  }

  const dejaValide = uc.statut === 'prototype_valide' || uc.statut === 'cadrage_technique' || uc.statut === 'pret_a_packager' || uc.statut === 'certifie';

  // Après envoi d'une remarque : écran de confirmation.
  if (envoye) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.centre}>
          <Text style={styles.confTitre}>{tr('📝 Remarques envoyées', '📝 Feedback sent')}</Text>
          <Text style={styles.confTxt}>
            {tr(
              'Merci ! Notre équipe va retravailler le prototype en intégrant vos demandes. Vous serez notifié dès que la nouvelle version est prête.',
              'Thank you! Our team will rework the prototype to incorporate your requests. You’ll be notified as soon as the new version is ready.'
            )}
          </Text>
          <Bouton titre={tr('Voir mon projet', 'View my project')} onPress={() => aller({ nom: 'detail', useCaseId })} />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe}>
      <EnTete titre={`${tr('Prototype', 'Prototype')}${uc.prototypeVersion ? ` v${uc.prototypeVersion}` : ''}`} onRetour={retour} />

      <View style={styles.banniere}>
        <Text style={styles.banniereTxt}>
          {tr(
            '🎨 Voici votre prototype interactif. Explorez-le, puis validez — ou demandez des ajustements.',
            '🎨 Here’s your interactive prototype. Explore it, then approve it — or request adjustments.'
          )}
        </Text>
      </View>

      <View style={styles.previewWrap}>
        {uc.prototypeHtml ? (
          <HtmlPreview html={uc.prototypeHtml} />
        ) : (
          <Text style={styles.chargement}>{tr('Prototype indisponible.', 'Prototype unavailable.')}</Text>
        )}
      </View>

      {Platform.OS === 'web' && !!uc.prototypeHtml && (
        <Pressable onPress={pleinEcran} style={styles.ouvrir}>
          <Text style={styles.ouvrirTxt}>{tr('🔗 Ouvrir dans le navigateur (plein écran)', '🔗 Open in browser (full screen)')}</Text>
        </Pressable>
      )}

      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        {challenge && !dejaValide && (
          <Carte style={styles.challengeBox}>
            <Text style={styles.challengeTitre}>{tr('Qu’aimeriez-vous ajuster ou ajouter ?', 'What would you like to adjust or add?')}</Text>
            <TextInput
              style={styles.input}
              value={remarque}
              onChangeText={setRemarque}
              multiline
              placeholder={tr('Ex. Ajouter un filtre par date, changer les couleurs, manque l’écran de connexion…', 'E.g. Add a date filter, change the colors, the login screen is missing…')}
              placeholderTextColor={colors.textMuted}
            />
            <Bouton titre={tr('📨 Envoyer mes remarques', '📨 Send my feedback')} onPress={envoyerRemarque} />
          </Carte>
        )}

        {!dejaValide ? (
          <View style={styles.footer}>
            <Bouton titre={tr('✅ Valider le prototype', '✅ Approve the prototype')} onPress={valider} />
            {iaDisponible() ? (
              // Assistant IA qui aide à challenger/affiner le prototype.
              <Bouton
                titre={tr('✏️ Challenger / affiner le prototype', '✏️ Challenge / refine the prototype')}
                variante="secondaire"
                onPress={() => aller({ nom: 'challenge', useCaseId })}
              />
            ) : (
              // Repli sans IA : champ libre.
              <Bouton
                titre={challenge ? tr('Annuler', 'Cancel') : tr('✏️ Demander des ajustements', '✏️ Request adjustments')}
                variante="secondaire"
                onPress={() => setChallenge((c) => !c)}
              />
            )}
          </View>
        ) : (
          <View style={styles.footer}>
            <Bouton titre={tr('🏗️ Aller au cadrage technique', '🏗️ Go to technical scoping')} onPress={() => aller({ nom: 'technique', useCaseId })} />
          </View>
        )}
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  banniere: {
    backgroundColor: colors.primarySoft,
    borderColor: colors.primary + '55',
    borderWidth: 1,
    borderRadius: radius.md,
    padding: spacing.md,
    marginHorizontal: spacing.lg,
  },
  banniereTxt: { color: colors.text, fontSize: font.small, lineHeight: 19 },
  previewWrap: {
    flex: 1,
    margin: spacing.lg,
    borderRadius: radius.md,
    overflow: 'hidden',
    backgroundColor: '#fff',
  },
  ouvrir: {
    marginHorizontal: spacing.lg,
    marginBottom: spacing.sm,
    paddingVertical: spacing.sm,
    borderRadius: radius.pill,
    borderWidth: 1.5,
    borderColor: colors.primary,
    alignItems: 'center',
  },
  ouvrirTxt: { color: colors.primary, fontSize: font.small, fontWeight: '700' },
  challengeBox: { marginHorizontal: spacing.lg, marginBottom: spacing.sm, gap: spacing.md },
  challengeTitre: { color: colors.text, fontSize: font.body, fontWeight: '700' },
  input: {
    minHeight: 80,
    color: colors.text,
    fontSize: font.body,
    backgroundColor: colors.surfaceAlt,
    borderRadius: radius.md,
    padding: spacing.md,
    textAlignVertical: 'top',
  },
  footer: {
    padding: spacing.lg,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    backgroundColor: colors.surface,
    gap: spacing.sm,
  },
  lien: { alignItems: 'center', paddingVertical: spacing.sm },
  lienTxt: { color: colors.accent, fontSize: font.small, fontWeight: '700' },
  centre: { flex: 1, justifyContent: 'center', padding: spacing.xl, gap: spacing.lg },
  confTitre: { color: colors.text, fontSize: font.h2, fontWeight: '800' },
  confTxt: { color: colors.textMuted, fontSize: font.body, lineHeight: 22 },
  chargement: { color: colors.textMuted, textAlign: 'center', marginTop: 100 },
});
