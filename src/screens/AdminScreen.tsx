import React, { useEffect, useState } from 'react';
import { Alert, Platform, Pressable, SafeAreaView, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Carte, Etiquette } from '../components/ui';
import { dateHeure, identiteClient } from '../format';
import { useNav } from '../navigation';
import { marquerIdeesVues } from '../notifications';
import { chargerUseCases, definirAvorte } from '../storage';
import { colors, font, radius, spacing } from '../theme';
import { StatutUseCase, UseCase } from '../types';

// Colonnes du Kanban admin. Chaque colonne regroupe un ou plusieurs statuts.
interface Colonne {
  titre: string;
  statuts: StatutUseCase[];
  couleur: string;
  action?: string; // libellé d'action attendue (badge)
}

const COLONNES: Colonne[] = [
  { titre: '📥 Soumis', statuts: ['soumis'], couleur: colors.accent, action: '⚙️ À générer' },
  { titre: '📤 Proto envoyé', statuts: ['prototype_pret_admin', 'prototype_genere'], couleur: colors.warn },
  { titre: '🔔 Révision demandée', statuts: ['revision_demandee'], couleur: colors.warn, action: 'À revoir' },
  { titre: '✅ Proto validé', statuts: ['prototype_valide', 'cadrage_technique', 'pret_a_packager'], couleur: colors.success },
  { titre: '🧾 Commande passée', statuts: ['commande_validee', 'certifie'], couleur: colors.success },
];

export default function AdminScreen() {
  const { aller, retour } = useNav();
  const [liste, setListe] = useState<UseCase[] | null>(null);
  const [avortesVisibles, setAvortesVisibles] = useState(false);

  async function recharger() {
    const l = await chargerUseCases();
    setListe(l);
  }

  useEffect(() => {
    recharger();
    // L'admin consulte la liste : on marque les idées soumises comme vues.
    marquerIdeesVues();
  }, []);

  // Confirme puis tague/détague un projet comme avorté (multiplateforme).
  function confirmer(titre: string, message: string, onOui: () => void) {
    if (Platform.OS === 'web') {
      // eslint-disable-next-line no-alert
      if (typeof confirm === 'undefined' || confirm(`${titre}\n\n${message}`)) onOui();
    } else {
      Alert.alert(titre, message, [
        { text: 'Annuler', style: 'cancel' },
        { text: 'Confirmer', style: 'destructive', onPress: onOui },
      ]);
    }
  }

  async function avorter(uc: UseCase) {
    confirmer(
      'Marquer comme avorté ?',
      `« ${uc.titre} » disparaîtra de l’espace admin. Il reste conservé en base et dans la banque d’idées.`,
      async () => { await definirAvorte(uc.id, true); recharger(); }
    );
  }

  async function reactiver(uc: UseCase) {
    await definirAvorte(uc.id, false);
    recharger();
  }

  const actifs = (liste ?? []).filter((u) => !u.avorte);
  const avortes = (liste ?? []).filter((u) => u.avorte);
  const aTraiter = actifs.filter((u) => u.statut === 'soumis').length;

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.header}>
        <Pressable onPress={retour} hitSlop={12}>
          <Text style={styles.retour}>‹ Accueil</Text>
        </Pressable>
        <Text style={styles.headerTitre}>Espace admin</Text>
        <View style={{ width: 70 }} />
      </View>

      <ScrollView contentContainerStyle={styles.topContent}>
        <Text style={styles.intro}>
          {aTraiter > 0 ? `${aTraiter} projet${aTraiter > 1 ? 's' : ''} en attente de prototype.` : 'Aucun nouveau projet à traiter.'}
        </Text>
        <View style={styles.liensRow}>
          <Pressable onPress={() => aller({ nom: 'banque' })} style={styles.lienBtn}>
            <Text style={styles.lienTxt}>📚 Banque d’idées</Text>
          </Pressable>
          <Pressable onPress={() => aller({ nom: 'prompts' })} style={styles.lienBtn}>
            <Text style={styles.lienTxt}>⚙️ Prompts IA</Text>
          </Pressable>
        </View>
      </ScrollView>

      {/* Kanban : défilement horizontal, une colonne par étape. */}
      <ScrollView horizontal showsHorizontalScrollIndicator contentContainerStyle={styles.board}>
        {COLONNES.map((col) => {
          const items = actifs.filter((u) => col.statuts.includes(u.statut));
          return (
            <View key={col.titre} style={styles.colonne}>
              <View style={styles.colHead}>
                <Text style={styles.colTitre}>{col.titre}</Text>
                <View style={[styles.compteur, { backgroundColor: col.couleur + '33' }]}>
                  <Text style={[styles.compteurTxt, { color: col.couleur }]}>{items.length}</Text>
                </View>
              </View>
              <ScrollView contentContainerStyle={styles.colBody}>
                {items.length === 0 && <Text style={styles.colVide}>—</Text>}
                {items.map((uc) => (
                  <View key={uc.id} style={[styles.carte, { borderColor: col.couleur + '55' }]}>
                    <Pressable onPress={() => aller({ nom: 'adminDetail', useCaseId: uc.id })}>
                      <Text style={styles.cardTitre} numberOfLines={2}>{uc.titre}</Text>
                      <View style={styles.tags}>
                        <Etiquette texte={uc.domaine} />
                      </View>
                      {(uc.soumisLe || uc.client) && (
                        <Text style={styles.meta} numberOfLines={2}>
                          {uc.soumisLe ? `🕓 ${dateHeure(uc.soumisLe)}` : ''}
                          {uc.client ? `\n👤 ${identiteClient(uc.client)}` : ''}
                        </Text>
                      )}
                      {col.action && <Text style={[styles.action, { color: col.couleur }]}>{col.action}</Text>}
                    </Pressable>
                    <Pressable onPress={() => avorter(uc)} hitSlop={8} style={styles.avorterBtn}>
                      <Text style={styles.avorterTxt}>✕ Avorter</Text>
                    </Pressable>
                  </View>
                ))}
              </ScrollView>
            </View>
          );
        })}
      </ScrollView>

      {/* Projets avortés : repliés par défaut, réactivables. */}
      {avortes.length > 0 && (
        <View style={styles.avortesZone}>
          <Pressable onPress={() => setAvortesVisibles((v) => !v)} style={styles.avortesHead}>
            <Text style={styles.avortesTitre}>
              {avortesVisibles ? '▾' : '▸'} 🗑️ Projets avortés ({avortes.length})
            </Text>
          </Pressable>
          {avortesVisibles && (
            <ScrollView horizontal contentContainerStyle={styles.avortesRow}>
              {avortes.map((uc) => (
                <View key={uc.id} style={styles.avorteCarte}>
                  <Text style={styles.avorteTitre} numberOfLines={2}>{uc.titre}</Text>
                  <Pressable onPress={() => reactiver(uc)} hitSlop={8} style={styles.reactiverBtn}>
                    <Text style={styles.reactiverTxt}>↩︎ Réactiver</Text>
                  </Pressable>
                </View>
              ))}
            </ScrollView>
          )}
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: spacing.lg, paddingVertical: spacing.md,
  },
  retour: { color: colors.accent, fontSize: font.body, fontWeight: '600', width: 70 },
  headerTitre: { color: colors.text, fontSize: font.h3, fontWeight: '800' },
  topContent: { paddingHorizontal: spacing.lg, gap: spacing.sm, flexGrow: 0 },
  intro: { color: colors.textMuted, fontSize: font.small, lineHeight: 20 },
  liensRow: { flexDirection: 'row', gap: spacing.sm, marginBottom: spacing.sm },
  lienBtn: {
    backgroundColor: colors.primarySoft, borderColor: colors.primary + '55', borderWidth: 1,
    borderRadius: radius.pill, paddingHorizontal: spacing.md, paddingVertical: 8,
  },
  lienTxt: { color: colors.accent, fontSize: font.small, fontWeight: '800' },
  // Kanban
  board: { paddingHorizontal: spacing.lg, paddingVertical: spacing.sm, gap: spacing.md },
  colonne: {
    width: 270, backgroundColor: colors.surface, borderRadius: radius.lg,
    borderWidth: 1, borderColor: colors.border, padding: spacing.sm, maxHeight: '100%',
  },
  colHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: spacing.xs, paddingVertical: spacing.sm },
  colTitre: { color: colors.text, fontSize: font.small, fontWeight: '800', flex: 1 },
  compteur: { borderRadius: radius.pill, paddingHorizontal: 8, paddingVertical: 2, minWidth: 24, alignItems: 'center' },
  compteurTxt: { fontSize: font.tiny, fontWeight: '800' },
  colBody: { gap: spacing.sm, paddingBottom: spacing.md },
  colVide: { color: colors.textMuted, fontSize: font.small, textAlign: 'center', paddingVertical: spacing.lg },
  carte: {
    backgroundColor: colors.surfaceAlt, borderRadius: radius.md, borderWidth: 1,
    padding: spacing.md, gap: spacing.xs,
  },
  cardTitre: { color: colors.text, fontSize: font.body, fontWeight: '700', lineHeight: 21 },
  tags: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs, marginTop: spacing.xs },
  meta: { color: colors.textMuted, fontSize: font.tiny, marginTop: spacing.xs, lineHeight: 15 },
  action: { fontSize: font.tiny, fontWeight: '800', marginTop: spacing.xs },
  avorterBtn: { marginTop: spacing.sm, alignSelf: 'flex-start' },
  avorterTxt: { color: colors.danger, fontSize: font.tiny, fontWeight: '700' },
  // Avortés
  avortesZone: { borderTopWidth: 1, borderTopColor: colors.border, backgroundColor: colors.surface, padding: spacing.md },
  avortesHead: { paddingVertical: spacing.xs },
  avortesTitre: { color: colors.textMuted, fontSize: font.small, fontWeight: '700' },
  avortesRow: { gap: spacing.sm, paddingTop: spacing.sm },
  avorteCarte: {
    width: 200, backgroundColor: colors.surfaceAlt, borderRadius: radius.md,
    borderWidth: 1, borderColor: colors.border, padding: spacing.md, gap: spacing.sm, opacity: 0.8,
  },
  avorteTitre: { color: colors.textMuted, fontSize: font.small, fontWeight: '600', lineHeight: 18 },
  reactiverBtn: { alignSelf: 'flex-start' },
  reactiverTxt: { color: colors.accent, fontSize: font.tiny, fontWeight: '800' },
});
