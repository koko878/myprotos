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
import { iaDisponible } from '../llm';
import { useNav } from '../navigation';
import { ouvrirHtmlNouvelOnglet } from '../ouvrir';
import { ajouterRemarque, mettreAJourStatut, trouverUseCase } from '../storage';
import { colors, font, radius, spacing } from '../theme';
import { UseCase } from '../types';

export default function PrototypeScreen({ useCaseId }: { useCaseId: string }) {
  const { aller, retour } = useNav();
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
        <Text style={styles.chargement}>Chargement…</Text>
      </SafeAreaView>
    );
  }

  const dejaValide = uc.statut === 'prototype_valide' || uc.statut === 'cadrage_technique' || uc.statut === 'pret_a_packager' || uc.statut === 'certifie';

  // Après envoi d'une remarque : écran de confirmation.
  if (envoye) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.centre}>
          <Text style={styles.confTitre}>📝 Remarques envoyées</Text>
          <Text style={styles.confTxt}>
            Merci ! Notre équipe va retravailler le prototype en intégrant vos demandes.
            Vous serez notifié dès que la nouvelle version est prête.
          </Text>
          <Bouton titre="Voir mon projet" onPress={() => aller({ nom: 'detail', useCaseId })} />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe}>
      <EnTete titre={`Prototype${uc.prototypeVersion ? ` v${uc.prototypeVersion}` : ''}`} onRetour={retour} />

      <View style={styles.banniere}>
        <Text style={styles.banniereTxt}>
          🎨 Voici votre prototype interactif. Explorez-le, puis validez — ou demandez des
          ajustements.
        </Text>
      </View>

      <View style={styles.previewWrap}>
        {uc.prototypeHtml ? (
          <HtmlPreview html={uc.prototypeHtml} />
        ) : (
          <Text style={styles.chargement}>Prototype indisponible.</Text>
        )}
      </View>

      {Platform.OS === 'web' && !!uc.prototypeHtml && (
        <Pressable onPress={pleinEcran} style={styles.ouvrir}>
          <Text style={styles.ouvrirTxt}>🔗 Ouvrir dans le navigateur (plein écran)</Text>
        </Pressable>
      )}

      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        {challenge && !dejaValide && (
          <Carte style={styles.challengeBox}>
            <Text style={styles.challengeTitre}>Qu’aimeriez-vous ajuster ou ajouter ?</Text>
            <TextInput
              style={styles.input}
              value={remarque}
              onChangeText={setRemarque}
              multiline
              placeholder="Ex. Ajouter un filtre par date, changer les couleurs, manque l’écran de connexion…"
              placeholderTextColor={colors.textMuted}
            />
            <Bouton titre="📨 Envoyer mes remarques" onPress={envoyerRemarque} />
          </Carte>
        )}

        {!dejaValide ? (
          <View style={styles.footer}>
            <Bouton titre="✅ Valider le prototype" onPress={valider} />
            {iaDisponible() ? (
              // Assistant IA qui aide à challenger/affiner le prototype.
              <Bouton
                titre="✏️ Challenger / affiner le prototype"
                variante="secondaire"
                onPress={() => aller({ nom: 'challenge', useCaseId })}
              />
            ) : (
              // Repli sans IA : champ libre.
              <Bouton
                titre={challenge ? 'Annuler' : '✏️ Demander des ajustements'}
                variante="secondaire"
                onPress={() => setChallenge((c) => !c)}
              />
            )}
          </View>
        ) : (
          <View style={styles.footer}>
            <Bouton titre="🏗️ Aller au cadrage technique" onPress={() => aller({ nom: 'technique', useCaseId })} />
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
