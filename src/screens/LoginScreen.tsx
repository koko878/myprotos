import React, { useState } from 'react';
import { KeyboardAvoidingView, Platform, SafeAreaView, StyleSheet, Text, TextInput, View } from 'react-native';
import { envoyerLienMagique } from '../auth';
import Logo from '../components/Logo';
import { Bouton, Carte } from '../components/ui';
import { colors, font, radius, spacing } from '../theme';

// Connexion par lien magique : on saisit son email, on reçoit un lien.
export default function LoginScreen() {
  const [email, setEmail] = useState('');
  const [envoye, setEnvoye] = useState(false);
  const [loading, setLoading] = useState(false);
  const [erreur, setErreur] = useState<string | null>(null);

  async function envoyer() {
    const e = email.trim();
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(e)) {
      setErreur('Entrez une adresse email valide.');
      return;
    }
    setErreur(null);
    setLoading(true);
    const err = await envoyerLienMagique(e);
    setLoading(false);
    if (err) setErreur(err);
    else setEnvoye(true);
  }

  return (
    <SafeAreaView style={styles.safe}>
      <KeyboardAvoidingView style={styles.wrap} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <View style={styles.logo}>
          <Logo size="lg" />
        </View>

        {envoye ? (
          <Carte style={{ gap: spacing.md }}>
            <Text style={styles.titre}>📬 Vérifiez votre email</Text>
            <Text style={styles.txt}>
              Un lien de connexion a été envoyé à {email.trim()}. Ouvrez-le sur cet appareil
              pour vous connecter. (Pensez à vérifier les spams.)
            </Text>
            <Bouton titre="Renvoyer le lien" variante="secondaire" onPress={() => { setEnvoye(false); }} />
          </Carte>
        ) : (
          <Carte style={{ gap: spacing.md }}>
            <Text style={styles.titre}>Connexion</Text>
            <Text style={styles.txt}>
              Entrez votre email : vous recevrez un lien de connexion, sans mot de passe.
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
              onSubmitEditing={envoyer}
            />
            {erreur && <Text style={styles.err}>{erreur}</Text>}
            <Bouton titre={loading ? 'Envoi…' : '✉️ Recevoir mon lien'} onPress={envoyer} loading={loading} />
          </Carte>
        )}
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
});
