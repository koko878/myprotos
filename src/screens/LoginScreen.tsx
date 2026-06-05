import React, { useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, SafeAreaView, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { connexion, inscription, reinitialiserMotDePasse } from '../auth';
import Logo from '../components/Logo';
import { Bouton, Carte } from '../components/ui';
import { useTr } from '../i18n';
import { colors, font, radius, spacing } from '../theme';

type Mode = 'connexion' | 'inscription' | 'reset';

const emailValide = (e: string) => /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(e);

// Authentification email + mot de passe : onglets Connexion / Inscription
// séparés (UX claire, pas de création de compte par erreur) + mot de passe oublié.
export default function LoginScreen() {
  const tr = useTr();
  const [mode, setMode] = useState<Mode>('connexion');
  const [email, setEmail] = useState('');
  const [mdp, setMdp] = useState('');
  const [loading, setLoading] = useState(false);
  const [erreur, setErreur] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);

  function changerMode(m: Mode) {
    setMode(m);
    setErreur(null);
    setInfo(null);
  }

  async function seConnecter() {
    const e = email.trim();
    if (!emailValide(e)) return setErreur(tr('Entrez une adresse email valide.', 'Enter a valid email address.'));
    if (mdp.length < 6) return setErreur(tr('Le mot de passe doit faire au moins 6 caractères.', 'Your password must be at least 6 characters.'));
    setErreur(null);
    setLoading(true);
    const err = await connexion(e, mdp);
    setLoading(false);
    if (err) setErreur(err);
    // Succès : le contexte d'auth bascule automatiquement vers l'app.
  }

  async function sInscrire() {
    const e = email.trim();
    if (!emailValide(e)) return setErreur(tr('Entrez une adresse email valide.', 'Enter a valid email address.'));
    if (mdp.length < 6) return setErreur(tr('Le mot de passe doit faire au moins 6 caractères.', 'Your password must be at least 6 characters.'));
    setErreur(null);
    setLoading(true);
    const res = await inscription(e, mdp);
    setLoading(false);
    if (res.erreur) {
      setErreur(res.erreur);
    } else if (res.besoinConfirmation) {
      setInfo(tr('Compte créé ! Vérifiez votre boîte mail pour confirmer votre inscription, puis connectez-vous.', 'Account created! Check your inbox to confirm your sign-up, then log in.'));
      setMode('connexion');
    }
    // Sinon : session ouverte, l'app bascule automatiquement.
  }

  async function envoyerReset() {
    const e = email.trim();
    if (!emailValide(e)) return setErreur(tr('Entrez votre adresse email.', 'Enter your email address.'));
    setErreur(null);
    setLoading(true);
    const err = await reinitialiserMotDePasse(e);
    setLoading(false);
    if (err) {
      setErreur(err);
    } else {
      setInfo(tr('Si un compte existe pour cet email, un lien de réinitialisation vient d’être envoyé.', 'If an account exists for this email, a reset link has just been sent.'));
      setMode('connexion');
    }
  }

  return (
    <SafeAreaView style={styles.safe}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={styles.wrap} keyboardShouldPersistTaps="handled">
          <View style={styles.logo}>
            <Logo size="lg" />
          </View>

          {mode !== 'reset' && (
            <View style={styles.onglets}>
              <Onglet actif={mode === 'connexion'} titre={tr('Connexion', 'Sign in')} onPress={() => changerMode('connexion')} />
              <Onglet actif={mode === 'inscription'} titre={tr('Inscription', 'Sign up')} onPress={() => changerMode('inscription')} />
            </View>
          )}

          <Carte style={{ gap: spacing.md }}>
            {mode === 'reset' ? (
              <>
                <Text style={styles.titre}>{tr('Mot de passe oublié', 'Forgot password')}</Text>
                <Text style={styles.txt}>
                  {tr(
                    'Entrez votre email : nous vous enverrons un lien pour réinitialiser votre mot de passe.',
                    'Enter your email and we’ll send you a link to reset your password.'
                  )}
                </Text>
                <TextInput
                  style={styles.input}
                  value={email}
                  onChangeText={(t) => { setEmail(t); setErreur(null); }}
                  placeholder={tr('vous@exemple.com', 'you@example.com')}
                  placeholderTextColor={colors.textMuted}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoComplete="email"
                  onSubmitEditing={envoyerReset}
                />
                {erreur && <Text style={styles.err}>{erreur}</Text>}
                <Bouton titre={loading ? tr('Envoi…', 'Sending…') : tr('Envoyer le lien', 'Send the link')} onPress={envoyerReset} loading={loading} />
                <Pressable onPress={() => changerMode('connexion')} hitSlop={8} style={styles.lien}>
                  <Text style={styles.lienTxt}>{tr('‹ Retour à la connexion', '‹ Back to sign in')}</Text>
                </Pressable>
              </>
            ) : (
              <>
                <Text style={styles.titre}>{mode === 'connexion' ? tr('Se connecter', 'Sign in') : tr('Créer un compte', 'Create an account')}</Text>
                <Text style={styles.txt}>
                  {mode === 'connexion'
                    ? tr('Entrez votre email et votre mot de passe.', 'Enter your email and password.')
                    : tr('Choisissez un email et un mot de passe (6 caractères minimum).', 'Choose an email and a password (at least 6 characters).')}
                </Text>

                {info && <Text style={styles.info}>{info}</Text>}

                <TextInput
                  style={styles.input}
                  value={email}
                  onChangeText={(t) => { setEmail(t); setErreur(null); }}
                  placeholder={tr('vous@exemple.com', 'you@example.com')}
                  placeholderTextColor={colors.textMuted}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoComplete="email"
                />
                <TextInput
                  style={styles.input}
                  value={mdp}
                  onChangeText={(t) => { setMdp(t); setErreur(null); }}
                  placeholder={tr('Mot de passe', 'Password')}
                  placeholderTextColor={colors.textMuted}
                  secureTextEntry
                  autoComplete={mode === 'connexion' ? 'current-password' : 'new-password'}
                  onSubmitEditing={mode === 'connexion' ? seConnecter : sInscrire}
                />

                {erreur && <Text style={styles.err}>{erreur}</Text>}

                <Bouton
                  titre={loading ? tr('Veuillez patienter…', 'Please wait…') : mode === 'connexion' ? tr('Se connecter', 'Sign in') : tr('Créer mon compte', 'Create my account')}
                  onPress={mode === 'connexion' ? seConnecter : sInscrire}
                  loading={loading}
                />

                {mode === 'connexion' && (
                  <Pressable onPress={() => changerMode('reset')} hitSlop={8} style={styles.lien}>
                    <Text style={styles.lienTxt}>{tr('Mot de passe oublié ?', 'Forgot password?')}</Text>
                  </Pressable>
                )}
              </>
            )}
          </Carte>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function Onglet({ actif, titre, onPress }: { actif: boolean; titre: string; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} style={[styles.onglet, actif && styles.ongletActif]}>
      <Text style={[styles.ongletTxt, actif && styles.ongletTxtActif]}>{titre}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  wrap: { flexGrow: 1, justifyContent: 'center', padding: spacing.xl, gap: spacing.xl },
  logo: { alignItems: 'center' },
  onglets: { flexDirection: 'row', backgroundColor: colors.surfaceAlt, borderRadius: radius.pill, padding: 4 },
  onglet: { flex: 1, paddingVertical: 10, borderRadius: radius.pill, alignItems: 'center' },
  ongletActif: { backgroundColor: colors.primary },
  ongletTxt: { color: colors.textMuted, fontSize: font.small, fontWeight: '700' },
  ongletTxtActif: { color: '#fff' },
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
  info: { color: colors.success, fontSize: font.small, lineHeight: 19 },
  lien: { alignItems: 'center', paddingVertical: spacing.sm },
  lienTxt: { color: colors.accent, fontSize: font.small, fontWeight: '700' },
});
