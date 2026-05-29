import React, { useEffect, useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import UseCaseView from '../components/UseCaseView';
import { Bouton, Carte } from '../components/ui';
import { EXPERTS } from '../experts';
import { useNav } from '../navigation';
import { ajouterProposition, trouverUseCase } from '../storage';
import { colors, font, radius, spacing } from '../theme';
import { PropositionExpert, UseCase } from '../types';

// L'expert "connecté" pour la démo (le mieux noté du pool).
const MOI = EXPERTS[2]; // Expert #F88 · LLM / RAG · 5.0

let seq = 0;

export default function ExpertDetailScreen({ useCaseId }: { useCaseId: string }) {
  const { aller, retour } = useNav();
  const [uc, setUc] = useState<UseCase | null>(null);
  const [prix, setPrix] = useState('');
  const [delai, setDelai] = useState('');
  const [message, setMessage] = useState('');
  const [envoye, setEnvoye] = useState(false);

  useEffect(() => {
    trouverUseCase(useCaseId).then((u) => {
      setUc(u ?? null);
      // Pré-remplit avec une estimation indexée sur la complexité.
      if (u) {
        const base = u.complexite === 'Élevée' ? 9000 : u.complexite === 'Moyenne' ? 5500 : 3000;
        setPrix(String(base));
        setDelai(String(u.complexite === 'Élevée' ? 18 : u.complexite === 'Moyenne' ? 12 : 7));
      }
    });
  }, [useCaseId]);

  const dejaPropose = uc?.propositions?.some((p) => p.expert === MOI.pseudo) ?? false;

  async function proposer() {
    if (!uc) return;
    const proposition: PropositionExpert = {
      id: `prop_${Date.now().toString(36)}_${seq++}`,
      expert: MOI.pseudo,
      specialite: MOI.specialite,
      note: MOI.note,
      prixEur: parseInt(prix.replace(/\D/g, ''), 10) || 0,
      delaiJours: parseInt(delai.replace(/\D/g, ''), 10) || 0,
      message: message.trim() || 'Je me positionne sur ce prototype.',
      statut: 'proposée',
      creeLe: Date.now(),
    };
    await ajouterProposition(useCaseId, proposition);
    setEnvoye(true);
  }

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
          <Text style={styles.retour}>‹ Besoins</Text>
        </Pressable>
        <Text style={styles.headerTitre}>Besoin publié</Text>
        <View style={{ width: 70 }} />
      </View>

      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={styles.content}>
          <View style={styles.banniere}>
            <Text style={styles.banniereTxt}>
              👋 Vous consultez en tant que {MOI.pseudo} · {MOI.specialite} · ⭐ {MOI.note}
            </Text>
          </View>

          <UseCaseView uc={uc} />

          <View style={{ marginTop: spacing.xl, gap: spacing.md }}>
            <Text style={styles.sectionTitre}>Proposer un prototype</Text>

            {dejaPropose || envoye ? (
              <Carte style={{ backgroundColor: colors.success + '18', borderColor: colors.success + '44', gap: spacing.sm }}>
                <Text style={styles.okTitre}>✅ Proposition envoyée</Text>
                <Text style={styles.okTxt}>
                  Le demandeur a reçu votre offre. Vous serez notifié s’il l’accepte.
                </Text>
                <Bouton titre="Retour aux besoins" variante="secondaire" onPress={() => aller({ nom: 'expert' })} />
              </Carte>
            ) : (
              <Carte style={{ gap: spacing.md }}>
                <View style={styles.row}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.champLabel}>Prix prototype (€)</Text>
                    <TextInput
                      style={styles.input}
                      value={prix}
                      onChangeText={setPrix}
                      keyboardType="numeric"
                      placeholder="5000"
                      placeholderTextColor={colors.textMuted}
                    />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.champLabel}>Délai (jours)</Text>
                    <TextInput
                      style={styles.input}
                      value={delai}
                      onChangeText={setDelai}
                      keyboardType="numeric"
                      placeholder="10"
                      placeholderTextColor={colors.textMuted}
                    />
                  </View>
                </View>
                <View>
                  <Text style={styles.champLabel}>Message au demandeur</Text>
                  <TextInput
                    style={[styles.input, { height: 88, textAlignVertical: 'top' }]}
                    value={message}
                    onChangeText={setMessage}
                    multiline
                    placeholder="Votre approche, vos références…"
                    placeholderTextColor={colors.textMuted}
                  />
                </View>
                <Bouton titre="📨 Envoyer ma proposition" onPress={proposer} />
              </Carte>
            )}
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
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
  banniere: {
    backgroundColor: colors.primarySoft,
    borderColor: colors.primary + '55',
    borderWidth: 1,
    borderRadius: radius.md,
    padding: spacing.md,
    marginBottom: spacing.lg,
  },
  banniereTxt: { color: colors.text, fontSize: font.small },
  sectionTitre: { color: colors.text, fontSize: font.h3, fontWeight: '800' },
  row: { flexDirection: 'row', gap: spacing.md },
  champLabel: { color: colors.textMuted, fontSize: font.small, marginBottom: spacing.xs, fontWeight: '600' },
  input: {
    backgroundColor: colors.surfaceAlt,
    borderRadius: radius.md,
    color: colors.text,
    fontSize: font.body,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  okTitre: { color: colors.text, fontSize: font.h3, fontWeight: '800' },
  okTxt: { color: colors.textMuted, fontSize: font.small, lineHeight: 20 },
  chargement: { color: colors.textMuted, textAlign: 'center', marginTop: 100 },
});
