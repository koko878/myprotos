import React, { useEffect, useRef, useState } from 'react';
import { Modal, Platform, Pressable, SafeAreaView, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { deverrouillerAdmin, estAdminDeverrouille, verifierPin, verrouillerAdmin } from '../admin';
import { deconnexion } from '../auth';
import { useAuth } from '../authContext';
import Logo from '../components/Logo';
import Parcours from '../components/Parcours';
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

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={[styles.heroHalo, halo]} pointerEvents="none" />

        <Pressable onPress={tapLogo} style={styles.logoRow}>
          <Logo size="lg" tagline />
        </Pressable>

        <Text style={styles.h1}>
          De l’idée à l’application,{'\n'}
          <Text style={{ color: colors.accent }}>clé en main.</Text>
        </Text>
        <Text style={styles.sous}>
          Démocratiser l’accès à la tech : décrivez votre besoin, notre IA le cadre, génère un
          prototype interactif, puis prépare une application déployée, certifiée et garantie.
        </Text>

        <Carte style={{ marginTop: spacing.xl, gap: spacing.md }}>
          <Text style={styles.cardTitre}>Vous êtes client</Text>
          <Text style={styles.cardTexte}>
            Pas besoin d’être technique. Décrivez votre idée, l’IA vous accompagne.
          </Text>
          <Bouton titre="✨ Exprimer une idée" onPress={() => aller({ nom: 'cadrage' })} />
          <Bouton
            titre="Voir mes projets"
            variante="secondaire"
            onPress={() => aller({ nom: 'liste' })}
          />
        </Carte>

        <Parcours />

        {/* Accès admin : par rôle (mode auth) ou par code (mode démo). */}
        {adminOuvert && (
          <View style={styles.adminZone}>
            <Bouton
              titre={nouvelles > 0 ? `🛠️ Espace admin · ${nouvelles} nouvelle${nouvelles > 1 ? 's' : ''} idée${nouvelles > 1 ? 's' : ''}` : '🛠️ Espace admin'}
              variante="secondaire"
              onPress={() => aller({ nom: 'admin' })}
            />
            {nouvelles > 0 && (
              <Text style={styles.notif}>🔔 {nouvelles} idée{nouvelles > 1 ? 's' : ''} soumise{nouvelles > 1 ? 's' : ''} en attente</Text>
            )}
            {!authRequise && (
              <Pressable onPress={quitterAdmin} hitSlop={8} style={styles.adminLien}>
                <Text style={styles.adminTxt}>Quitter le mode admin</Text>
              </Pressable>
            )}
          </View>
        )}

        {/* Compte connecté : déconnexion. */}
        {authRequise && user && (
          <Pressable onPress={deconnexion} hitSlop={8} style={styles.adminLien}>
            <Text style={styles.adminTxt}>{user.email} · Se déconnecter</Text>
          </Pressable>
        )}
      </ScrollView>

      {/* Modal de saisie du code admin */}
      <Modal visible={modalPin} transparent animationType="fade" onRequestClose={() => setModalPin(false)}>
        <View style={styles.modalFond}>
          <Carte style={styles.modalCarte}>
            <Text style={styles.modalTitre}>Code administrateur</Text>
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
            {erreurPin && <Text style={styles.pinErr}>Code incorrect.</Text>}
            <Bouton titre="Déverrouiller" onPress={validerPin} />
            <Pressable onPress={() => setModalPin(false)} hitSlop={8} style={styles.adminLien}>
              <Text style={styles.adminTxt}>Annuler</Text>
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
  logoRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginBottom: spacing.xl },
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
