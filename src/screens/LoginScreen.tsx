import React, { useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, SafeAreaView, StyleSheet, Text, TextInput, View } from 'react-native';
import { connexion, inscription } from '../auth';
import Logo from '../components/Logo';
import { Bouton, Carte } from '../components/ui';
import { colors, font, radius, spacing } from '../theme';

// Connexion / inscription par email + mot de passe.
export default function LoginScreen() {
  const [mode, setMode] = useState<'connexion' | 'inscription'>('connexion');
  const [email, setEmail] = useState('');
  const [mdp, setMdp] = useState('');
  const [loading, setLoading] = useState(false);
  const [erreur, setErreur] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);

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
    setInfo(null);
    setLoading(true);
    const err =
      mode === 'inscription' ? await inscription(e, mdp) : await connexion(e, mdp);
    setLoading(false);
    if (err) {
      setErreur(err);
    } else if (mode === 'inscription') {
      // Selon la config Supabase, l'inscription peut connecter directement
      // (si confirmation email désactivée) ou demander une confirmation.
      setInfo('Compte créé. Si l’app ne s’ouvre pas, connectez-vous avec vos identifiants.');
      setMode('connexion');
    }
    // En cas de succès de connexion, le contexte d'auth bascule automatiquement.
  }

  return (
    <SafeAreaView style={styles.safe}>
      <KeyboardAvoidingView style={styles.wrap} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <View style={styles.logo}>
          <Logo size="lg" />
        </View>

        <Carte style={{ gap: spacing.md }}>
          <Text style={styles.titre}>{mode === 'connexion' ? 'Connexion' : 'Créer un compte'}</Text>
          <Text style={styles.txt}>
            {mode === 'connexion'
              ? 'Connectez-vous avec votre email et votre mot de passe.'
              : 'Choisissez un email et un mot de passe (6 caractères minimum).'}
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
          {info && <Text style={styles.info}>{info}</Text>}

          <Bouton
            titre={loading ? 'Veuillez patienter…' : mode === 'connexion' ? 'Se connecter' : 'Créer mon compte'}
            onPress={valider}
            loading={loading}
          />

          <Pressable
            onPress={() => { setMode(mode === 'connexion' ? 'inscription' : 'connexion'); setErreur(null); setInfo(null); }}
            hitSlop={8}
            style={styles.lien}
          >
            <Text style={styles.lienTxt}>
              {mode === 'connexion' ? 'Pas encore de compte ? Créer un compte' : 'J’ai déjà un compte — me connecter'}
            </Text>
          </Pressable>
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
  err: { color: colors.danger, fontSize: font.small },
  info: { color: colors.success, fontSize: font.small, lineHeight: 19 },
  lien: { alignItems: 'center', paddingVertical: spacing.sm },
  lienTxt: { color: colors.accent, fontSize: font.small, fontWeight: '700' },
});
