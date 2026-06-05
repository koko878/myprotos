import React, { useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, SafeAreaView, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import Logo from '../components/Logo';
import { Bouton, Carte } from '../components/ui';
import { useTr } from '../i18n';
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
  const tr = useTr();
  const labelSecteur = (s: string): string => {
    switch (s) {
      case 'Santé': return tr('Santé', 'Healthcare');
      case 'Finance / Banque': return tr('Finance / Banque', 'Finance / Banking');
      case 'Assurance': return tr('Assurance', 'Insurance');
      case 'Commerce / Retail': return tr('Commerce / Retail', 'Commerce / Retail');
      case 'Industrie': return tr('Industrie', 'Manufacturing');
      case 'Logistique / Transport': return tr('Logistique / Transport', 'Logistics / Transport');
      case 'Éducation': return tr('Éducation', 'Education');
      case 'Immobilier': return tr('Immobilier', 'Real estate');
      case 'Tourisme / Hôtellerie': return tr('Tourisme / Hôtellerie', 'Tourism / Hospitality');
      case 'Agriculture': return tr('Agriculture', 'Agriculture');
      case 'Énergie': return tr('Énergie', 'Energy');
      case 'Télécoms': return tr('Télécoms', 'Telecoms');
      case 'Administration / Public': return tr('Administration / Public', 'Government / Public sector');
      case 'Juridique': return tr('Juridique', 'Legal');
      case 'Marketing / Média': return tr('Marketing / Média', 'Marketing / Media');
      case 'BTP / Construction': return tr('BTP / Construction', 'Construction');
      case 'Tech / Logiciel': return tr('Tech / Logiciel', 'Tech / Software');
      case 'Autre': return tr('Autre', 'Other');
      default: return s;
    }
  };
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
      setErreur(tr('Indiquez votre secteur d’activité.', 'Please specify your industry.'));
      return;
    }
    if (!pays.trim()) {
      setErreur(tr('Indiquez votre pays.', 'Please specify your country.'));
      return;
    }
    const ageNum = age.trim() ? parseInt(age.trim(), 10) : undefined;
    if (age.trim() && (isNaN(ageNum!) || ageNum! < 10 || ageNum! > 120)) {
      setErreur(tr('Entrez un âge valide (ou laissez vide).', 'Enter a valid age (or leave it blank).'));
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

          <Text style={styles.titre}>{tr('Bienvenue 👋', 'Welcome 👋')}</Text>
          <Text style={styles.sous}>
            {tr(
              'Quelques infos pour personnaliser votre accompagnement. Une seule fois.',
              'A few details to tailor your experience. Just once.'
            )}
          </Text>

          <Carte style={{ gap: spacing.lg }}>
            <View style={{ gap: spacing.sm }}>
              <Text style={styles.label}>{tr('Votre secteur d’activité *', 'Your industry *')}</Text>
              <View style={styles.chips}>
                {SECTEURS.map((s) => {
                  const actif = secteur === s;
                  return (
                    <Pressable
                      key={s}
                      onPress={() => { setSecteur(s); setErreur(null); }}
                      style={[styles.chip, actif && styles.chipActif]}
                    >
                      <Text style={[styles.chipTxt, actif && styles.chipTxtActif]}>{labelSecteur(s)}</Text>
                    </Pressable>
                  );
                })}
              </View>
              {secteur === 'Autre' && (
                <TextInput
                  style={styles.input}
                  value={secteurLibre}
                  onChangeText={(t) => { setSecteurLibre(t); setErreur(null); }}
                  placeholder={tr('Précisez votre secteur', 'Specify your industry')}
                  placeholderTextColor={colors.textMuted}
                />
              )}
            </View>

            <View style={{ gap: spacing.sm }}>
              <Text style={styles.label}>{tr('Votre pays *', 'Your country *')}</Text>
              <TextInput
                style={styles.input}
                value={pays}
                onChangeText={(t) => { setPays(t); setErreur(null); }}
                placeholder={tr('Ex. Maroc, France…', 'e.g. Morocco, France…')}
                placeholderTextColor={colors.textMuted}
              />
            </View>

            <View style={{ gap: spacing.sm }}>
              <Text style={styles.label}>{tr('Votre entreprise (optionnel)', 'Your company (optional)')}</Text>
              <TextInput
                style={styles.input}
                value={entreprise}
                onChangeText={setEntreprise}
                placeholder={tr('Nom de votre entreprise', 'Your company name')}
                placeholderTextColor={colors.textMuted}
              />
            </View>

            <View style={{ gap: spacing.sm }}>
              <Text style={styles.label}>{tr('Votre âge (optionnel)', 'Your age (optional)')}</Text>
              <TextInput
                style={styles.input}
                value={age}
                onChangeText={(t) => { setAge(t.replace(/[^0-9]/g, '')); setErreur(null); }}
                placeholder={tr('Ex. 34', 'e.g. 34')}
                placeholderTextColor={colors.textMuted}
                keyboardType="number-pad"
                maxLength={3}
              />
            </View>

            {erreur && <Text style={styles.err}>{erreur}</Text>}

            <Bouton titre={loading ? tr('Enregistrement…', 'Saving…') : tr('Continuer', 'Continue')} onPress={valider} loading={loading} />
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
