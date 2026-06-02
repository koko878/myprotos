import React, { useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, SafeAreaView, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import Logo from '../components/Logo';
import { Bouton, Carte } from '../components/ui';
import { enregistrerProfil } from '../profil';
import { colors, font, radius, spacing } from '../theme';

// Secteurs proposés (le client peut aussi saisir le sien librement).
const SECTEURS = [
  'Santé', 'Finance / Banque', 'Assurance', 'Commerce / Retail', 'Industrie',
  'Logistique / Transport', 'Éducation', 'Immobilier', 'Tourisme / Hôtellerie',
  'Agriculture', 'Énergie', 'Télécoms', 'Administration / Public', 'Juridique',
  'Marketing / Média', 'BTP / Construction', 'Tech / Logiciel', 'Autre',
];

// Collecte du profil client après inscription : âge, secteur, entreprise.
// `onTermine` est appelé une fois le profil enregistré (l'app continue).
export default function ProfilScreen({ onTermine }: { onTermine: () => void }) {
  const [age, setAge] = useState('');
  const [secteur, setSecteur] = useState('');
  const [secteurLibre, setSecteurLibre] = useState('');
  const [entreprise, setEntreprise] = useState('');
  const [pays, setPays] = useState('');
  const [erreur, setErreur] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const secteurChoisi = secteur === 'Autre' ? secteurLibre.trim() : secteur;

  async function valider() {
    if (!secteurChoisi) {
      setErreur('Indiquez votre secteur d’activité.');
      return;
    }
    if (!pays.trim()) {
      setErreur('Indiquez votre pays.');
      return;
    }
    const ageNum = age.trim() ? parseInt(age.trim(), 10) : undefined;
    if (age.trim() && (isNaN(ageNum!) || ageNum! < 10 || ageNum! > 120)) {
      setErreur('Entrez un âge valide (ou laissez vide).');
      return;
    }
    setErreur(null);
    setLoading(true);
    await enregistrerProfil({
      age: ageNum,
      secteur: secteurChoisi,
      entreprise: entreprise.trim() || undefined,
      pays: pays.trim(),
    });
    setLoading(false);
    onTermine();
  }

  return (
    <SafeAreaView style={styles.safe}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={styles.content}>
          <View style={styles.logo}>
            <Logo size="md" />
          </View>

          <Text style={styles.titre}>Bienvenue 👋</Text>
          <Text style={styles.sous}>
            Quelques infos pour personnaliser votre accompagnement. Une seule fois.
          </Text>

          <Carte style={{ gap: spacing.lg }}>
            <View style={{ gap: spacing.sm }}>
              <Text style={styles.label}>Votre secteur d’activité *</Text>
              <View style={styles.chips}>
                {SECTEURS.map((s) => {
                  const actif = secteur === s;
                  return (
                    <Pressable
                      key={s}
                      onPress={() => { setSecteur(s); setErreur(null); }}
                      style={[styles.chip, actif && styles.chipActif]}
                    >
                      <Text style={[styles.chipTxt, actif && styles.chipTxtActif]}>{s}</Text>
                    </Pressable>
                  );
                })}
              </View>
              {secteur === 'Autre' && (
                <TextInput
                  style={styles.input}
                  value={secteurLibre}
                  onChangeText={(t) => { setSecteurLibre(t); setErreur(null); }}
                  placeholder="Précisez votre secteur"
                  placeholderTextColor={colors.textMuted}
                />
              )}
            </View>

            <View style={{ gap: spacing.sm }}>
              <Text style={styles.label}>Votre pays *</Text>
              <TextInput
                style={styles.input}
                value={pays}
                onChangeText={(t) => { setPays(t); setErreur(null); }}
                placeholder="Ex. Maroc, France…"
                placeholderTextColor={colors.textMuted}
              />
            </View>

            <View style={{ gap: spacing.sm }}>
              <Text style={styles.label}>Votre entreprise (optionnel)</Text>
              <TextInput
                style={styles.input}
                value={entreprise}
                onChangeText={setEntreprise}
                placeholder="Nom de votre entreprise"
                placeholderTextColor={colors.textMuted}
              />
            </View>

            <View style={{ gap: spacing.sm }}>
              <Text style={styles.label}>Votre âge (optionnel)</Text>
              <TextInput
                style={styles.input}
                value={age}
                onChangeText={(t) => { setAge(t.replace(/[^0-9]/g, '')); setErreur(null); }}
                placeholder="Ex. 34"
                placeholderTextColor={colors.textMuted}
                keyboardType="number-pad"
                maxLength={3}
              />
            </View>

            {erreur && <Text style={styles.err}>{erreur}</Text>}

            <Bouton titre={loading ? 'Enregistrement…' : 'Continuer'} onPress={valider} loading={loading} />
          </Carte>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  content: { padding: spacing.xl, gap: spacing.lg, paddingBottom: spacing.xxl },
  logo: { alignItems: 'center', marginBottom: spacing.md },
  titre: { color: colors.text, fontSize: font.h1, fontWeight: '800' },
  sous: { color: colors.textMuted, fontSize: font.body, lineHeight: 21 },
  label: { color: colors.text, fontSize: font.small, fontWeight: '700' },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  chip: {
    paddingHorizontal: spacing.md,
    paddingVertical: 8,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surfaceAlt,
  },
  chipActif: { borderColor: colors.primary, backgroundColor: colors.primary + '22' },
  chipTxt: { color: colors.textMuted, fontSize: font.small, fontWeight: '600' },
  chipTxtActif: { color: colors.primary },
  input: {
    backgroundColor: colors.surfaceAlt,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    color: colors.text,
    fontSize: font.body,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
  },
  err: { color: colors.danger, fontSize: font.small, lineHeight: 19 },
});
