import React, { useEffect, useRef, useState } from 'react';
import { Modal, Platform, Pressable, SafeAreaView, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { deverrouillerAdmin, estAdminDeverrouille, verifierPin, verrouillerAdmin } from '../admin';
import { deconnexion } from '../auth';
import { useAuth } from '../authContext';
import Logo from '../components/Logo';
import Parcours from '../components/Parcours';
import { SelecteurLangue, useTr } from '../i18n';
import { Bouton, Carte } from '../components/ui';
import { useNav } from '../navigation';
import { compterNouvelles, dernierVuLe } from '../notifications';
import { chargerUseCases } from '../storage';
import { colors, font, gradients, radius, spacing } from '../theme';

export default function HomeScreen() {
  const { aller } = useNav();
  const { authRequise, estAdmin, user } = useAuth();
  // En mode auth (Supabase) : l'accès admin dépend du rôle DB.
  // En mode local/démo : déverrouillage par code PIN (5 taps sur le logo).
  const [adminLocal, setAdminLocal] = useState(false);
  const [modalPin, setModalPin] = useState(false);
  const [pin, setPin] = useState('');
  const [erreurPin, setErreurPin] = useState(false);
  const taps = useRef(0);
  const dernierTap = useRef(0);

  const adminOuvert = authRequise ? estAdmin : adminLocal;
  const [nouvelles, setNouvelles] = useState(0);

  useEffect(() => {
    if (!authRequise) estAdminDeverrouille().then(setAdminLocal);
  }, [authRequise]);

  // Compte les idées soumises non encore vues (notification in-app admin).
  useEffect(() => {
    if (!adminOuvert) return;
    let actif = true;
    (async () => {
      const [liste, vuLe] = await Promise.all([chargerUseCases(), dernierVuLe()]);
      if (actif) setNouvelles(compterNouvelles(liste, vuLe));
    })().catch(() => {});
    return () => {
      actif = false;
    };
  }, [adminOuvert]);

  // 5 appuis rapides sur le logo ouvrent la saisie du code admin (mode démo).
  function tapLogo() {
    if (authRequise || adminLocal) return;
    const now = Date.now();
    taps.current = now - dernierTap.current < 800 ? taps.current + 1 : 1;
    dernierTap.current = now;
    if (taps.current >= 5) {
      taps.current = 0;
      setPin('');
      setErreurPin(false);
      setModalPin(true);
    }
  }

  async function validerPin() {
    if (verifierPin(pin)) {
      await deverrouillerAdmin();
      setAdminLocal(true);
      setModalPin(false);
    } else {
      setErreurPin(true);
    }
  }

  async function quitterAdmin() {
    await verrouillerAdmin();
    setAdminLocal(false);
  }

  const web = Platform.OS === 'web';
  const halo = web ? ({ backgroundImage: gradients.halo } as any) : null;
  const tr = useTr();
  const idees = (n: number) => tr(`${n} idée${n > 1 ? 's' : ''}`, `${n} idea${n > 1 ? 's' : ''}`);

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={[styles.heroHalo, halo]} pointerEvents="none" />

        <View style={styles.topRow}>
          <Pressable onPress={tapLogo} style={styles.logoRow}>
            <Logo size="lg" tagline />
          </Pressable>
          <SelecteurLangue />
        </View>

        <Text style={styles.h1}>
          {tr('De l’idée à l’application,', 'From idea to a live app,')}{'\n'}
          <Text style={{ color: colors.accent }}>{tr('clé en main.', 'turnkey.')}</Text>
        </Text>
        <Text style={styles.sous}>
          {tr('Démocratiser l’accès à la tech : décrivez votre besoin. Notre IA accélère le cadrage et le prototype, puis ',
              'Democratizing access to tech: describe your need. Our AI speeds up scoping and the prototype, then ')}
          <Text style={{ color: colors.text, fontWeight: '700' }}>
            {tr('nos experts construisent, testent et livrent', 'our experts build, test and ship')}
          </Text>
          {tr(' une application fiable — qui marche dans la vraie vie.', ' a reliable app — one that works in real life.')}
        </Text>

        <Carte style={{ marginTop: spacing.xl, gap: spacing.md }}>
          <Text style={styles.cardTitre}>{tr('Vous êtes client', 'You’re a client')}</Text>
          <Text style={styles.cardTexte}>
            {tr('Pas besoin d’être technique. Décrivez votre idée : l’IA et notre équipe d’experts vous accompagnent.',
                'No tech skills needed. Describe your idea: our AI and expert team guide you.')}
          </Text>
          <Bouton titre={tr('✨ Exprimer une idée', '✨ Share an idea')} onPress={() => aller({ nom: 'cadrage' })} />
          <Bouton
            titre={tr('Voir mes projets', 'View my projects')}
            variante="secondaire"
            onPress={() => aller({ nom: 'liste' })}
          />
        </Carte>

        <Parcours />

        {/* Accès admin : par rôle (mode auth) ou par code (mode démo). */}
        {adminOuvert && (
          <View style={styles.adminZone}>
            <Bouton
              titre={nouvelles > 0 ? tr(`🛠️ Espace admin · ${idees(nouvelles)}`, `🛠️ Admin space · ${idees(nouvelles)}`) : tr('🛠️ Espace admin', '🛠️ Admin space')}
              variante="secondaire"
              onPress={() => aller({ nom: 'admin' })}
            />
            {nouvelles > 0 && (
              <Text style={styles.notif}>{tr(`🔔 ${idees(nouvelles)} soumise${nouvelles > 1 ? 's' : ''} en attente`, `🔔 ${idees(nouvelles)} awaiting review`)}</Text>
            )}
            {!authRequise && (
              <Pressable onPress={quitterAdmin} hitSlop={8} style={styles.adminLien}>
                <Text style={styles.adminTxt}>{tr('Quitter le mode admin', 'Exit admin mode')}</Text>
              </Pressable>
            )}
          </View>
        )}

        {/* Compte connecté : déconnexion. */}
        {authRequise && user && (
          <Pressable onPress={deconnexion} hitSlop={8} style={styles.adminLien}>
            <Text style={styles.adminTxt}>{user.email} · {tr('Se déconnecter', 'Sign out')}</Text>
          </Pressable>
        )}
      </ScrollView>

      {/* Modal de saisie du code admin */}
      <Modal visible={modalPin} transparent animationType="fade" onRequestClose={() => setModalPin(false)}>
        <View style={styles.modalFond}>
          <Carte style={styles.modalCarte}>
            <Text style={styles.modalTitre}>{tr('Code administrateur', 'Admin code')}</Text>
            <TextInput
              style={[styles.pinInput, erreurPin && { borderColor: colors.danger }]}
              value={pin}
              onChangeText={(t) => { setPin(t); setErreurPin(false); }}
              placeholder="••••"
              placeholderTextColor={colors.textMuted}
              secureTextEntry
              keyboardType="number-pad"
              autoFocus
              onSubmitEditing={validerPin}
            />
            {erreurPin && <Text style={styles.pinErr}>{tr('Code incorrect.', 'Wrong code.')}</Text>}
            <Bouton titre={tr('Déverrouiller', 'Unlock')} onPress={validerPin} />
            <Pressable onPress={() => setModalPin(false)} hitSlop={8} style={styles.adminLien}>
              <Text style={styles.adminTxt}>{tr('Annuler', 'Cancel')}</Text>
            </Pressable>
          </Carte>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  content: { padding: spacing.xl, paddingTop: spacing.xxl },
  heroHalo: { position: 'absolute', top: 0, left: 0, right: 0, height: 460 },
  topRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: spacing.xl },
  logoRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  logoDot: { width: 14, height: 14, borderRadius: 7, backgroundColor: colors.primary },
  marque: { color: colors.text, fontSize: font.h2, fontWeight: '800', letterSpacing: 0.5 },
  h1: { color: colors.text, fontSize: font.display, fontWeight: '900', lineHeight: 42, letterSpacing: -0.8, marginTop: spacing.xl },
  sous: { color: colors.textMuted, fontSize: font.body, lineHeight: 23, marginTop: spacing.lg, maxWidth: 560 },
  cardTitre: { color: colors.text, fontSize: font.h3, fontWeight: '800' },
  cardTexte: { color: colors.textMuted, fontSize: font.small, lineHeight: 20 },
  adminZone: { marginTop: spacing.xxl, gap: spacing.xs },
  notif: { color: colors.warn, fontSize: font.small, fontWeight: '700', textAlign: 'center', marginTop: spacing.xs },
  adminLien: { alignItems: 'center', paddingVertical: spacing.sm },
  adminTxt: { color: colors.textMuted, fontSize: font.small, fontWeight: '600' },
  modalFond: {
    flex: 1,
    backgroundColor: '#000000AA',
    justifyContent: 'center',
    padding: spacing.xl,
  },
  modalCarte: { gap: spacing.md },
  modalTitre: { color: colors.text, fontSize: font.h3, fontWeight: '800' },
  pinInput: {
    backgroundColor: colors.surfaceAlt,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    color: colors.text,
    fontSize: font.h2,
    letterSpacing: 8,
    textAlign: 'center',
    paddingVertical: spacing.md,
  },
  pinErr: { color: colors.danger, fontSize: font.small, textAlign: 'center' },
});
