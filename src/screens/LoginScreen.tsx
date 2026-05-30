import React, { useState } from 'react';
import { KeyboardAvoidingView, Platform, SafeAreaView, StyleSheet, Text, TextInput, View } from 'react-native';
import { connexionOuInscription } from '../auth';
import Logo from '../components/Logo';
import { Bouton, Carte } from '../components/ui';
import { colors, font, radius, spacing } from '../theme';

// Connexion / inscription unifiée par email + mot de passe.
// Un seul bouton : connecte si le compte existe, sinon le crée.
export default function LoginScreen() {
  const [email, setEmail] = useState('');
  const [mdp, setMdp] = useState('');
  const [loading, setLoading] = useState(false);
  const [erreur, setErreur] = useState<string | null>(null);

  async function valider() {
    const e = email.trim();
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(e)) {
      setErreur('Entrez une adresse email valide.');
      return;
    }
    if (mdp.length < 6) {
      setErreur('Le mot de passe doit faire au moins 6 caractères.');
      return;
    }
    setErreur(null);
    setLoading(true);
    const err = await connexionOuInscription(e, mdp);
    setLoading(false);
    if (err) setErreur(err);
    // En cas de succès, le contexte d'auth bascule automatiquement vers l'app.
  }

  return (
    <SafeAreaView style={styles.safe}>
      <KeyboardAvoidingView style={styles.wrap} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <View style={styles.logo}>
          <Logo size="lg" />
        </View>

        <Carte style={{ gap: spacing.md }}>
          <Text style={styles.titre}>Connexion</Text>
          <Text style={styles.txt}>
            Entrez votre email et un mot de passe (6 caractères min). Si vous n’avez pas
            encore de compte, il sera créé automatiquement.
          </Text>

          <TextInput
            style={styles.input}
            value={email}
            onChangeText={(t) => { setEmail(t); setErreur(null); }}
            placeholder="vous@exemple.com"
            placeholderTextColor={colors.textMuted}
            keyboardType="email-address"
            autoCapitalize="none"
            autoComplete="email"
          />
          <TextInput
            style={styles.input}
            value={mdp}
            onChangeText={(t) => { setMdp(t); setErreur(null); }}
            placeholder="Mot de passe"
            placeholderTextColor={colors.textMuted}
            secureTextEntry
            onSubmitEditing={valider}
          />

          {erreur && <Text style={styles.err}>{erreur}</Text>}

          <Bouton
            titre={loading ? 'Veuillez patienter…' : 'Continuer'}
            onPress={valider}
            loading={loading}
          />
        </Carte>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  wrap: { flex: 1, justifyContent: 'center', padding: spacing.xl, gap: spacing.xl },
  logo: { alignItems: 'center' },
  titre: { color: colors.text, fontSize: font.h2, fontWeight: '800' },
  txt: { color: colors.textMuted, fontSize: font.body, lineHeight: 21 },
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
