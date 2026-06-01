import React, { useEffect, useMemo, useState } from 'react';
import { Pressable, SafeAreaView, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Carte, Etiquette } from '../components/ui';
import { useNav } from '../navigation';
import { chargerUseCases } from '../storage';
import { grouperParDomaine, pairesSimilaires, trouverSimilaires } from '../similarite';
import { colors, font, radius, spacing } from '../theme';
import { UseCase } from '../types';

// Banque d'idées (admin) : tous les use cases classés par domaine, avec
// détection des idées quasi-similaires (doublons potentiels).
export default function BanqueScreen() {
  const { aller, retour } = useNav();
  const [tous, setTous] = useState<UseCase[] | null>(null);
  const [domaineActif, setDomaineActif] = useState<string | null>(null);
  const [detail, setDetail] = useState<UseCase | null>(null);

  useEffect(() => {
    chargerUseCases().then(setTous);
  }, []);

  const groupes = useMemo(() => (tous ? grouperParDomaine(tous) : []), [tous]);
  const paires = useMemo(() => (tous ? pairesSimilaires(tous, 0.4) : []), [tous]);

  if (!tous) {
    return (
      <SafeAreaView style={styles.safe}>
        <Text style={styles.chargement}>Chargement…</Text>
      </SafeAreaView>
    );
  }

  // Vue détail d'une idée : ses similaires dans toute la banque.
  if (detail) {
    const similaires = trouverSimilaires(detail, tous, 0.18);
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.header}>
          <Pressable onPress={() => setDetail(null)} hitSlop={12}>
            <Text style={styles.retour}>‹ Banque</Text>
          </Pressable>
          <Text style={styles.headerTitre} numberOfLines={1}>Idée</Text>
          <View style={{ width: 70 }} />
        </View>
        <ScrollView contentContainerStyle={styles.content}>
          <Carte style={{ gap: spacing.sm }}>
            <Etiquette texte={detail.domaine} couleur={colors.accent} />
            <Text style={styles.titre}>{detail.titre}</Text>
            <Text style={styles.txt}>{detail.probleme}</Text>
          </Carte>

          <Text style={styles.sectionTitre}>
            {similaires.length > 0
              ? `🔗 ${similaires.length} idée${similaires.length > 1 ? 's' : ''} similaire${similaires.length > 1 ? 's' : ''}`
              : 'Aucune idée similaire détectée'}
          </Text>
          {similaires.map((s) => (
            <Carte key={s.uc.id} style={{ gap: spacing.xs }} onPress={() => setDetail(s.uc)}>
              <View style={styles.simTop}>
                <Etiquette texte={s.uc.domaine} />
                <Text style={styles.simScore}>{Math.round(s.score * 100)}% proche</Text>
              </View>
              <Text style={styles.simTitre}>{s.uc.titre}</Text>
            </Carte>
          ))}
          <Pressable onPress={() => aller({ nom: 'adminDetail', useCaseId: detail.id })} style={styles.lien}>
            <Text style={styles.lienTxt}>Ouvrir le projet complet →</Text>
          </Pressable>
        </ScrollView>
      </SafeAreaView>
    );
  }

  const domainesAffiches = domaineActif
    ? groupes.filter((g) => g.domaine === domaineActif)
    : groupes;

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.header}>
        <Pressable onPress={retour} hitSlop={12}>
          <Text style={styles.retour}>‹ Admin</Text>
        </Pressable>
        <Text style={styles.headerTitre}>Banque d’idées</Text>
        <View style={{ width: 70 }} />
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.intro}>
          {tous.length} idée{tous.length > 1 ? 's' : ''} · {groupes.length} domaine
          {groupes.length > 1 ? 's' : ''}.
        </Text>

        {/* Doublons potentiels */}
        {paires.length > 0 && (
          <Carte style={{ gap: spacing.sm, borderColor: colors.warn + '66' }}>
            <Text style={styles.h}>⚠️ {paires.length} paire{paires.length > 1 ? 's' : ''} d’idées quasi-similaires</Text>
            {paires.slice(0, 6).map((p, i) => (
              <Pressable key={i} onPress={() => setDetail(p.a)} style={styles.paire}>
                <Text style={styles.paireScore}>{Math.round(p.score * 100)}%</Text>
                <Text style={styles.paireTxt} numberOfLines={2}>
                  « {p.a.titre} »  ↔  « {p.b.titre} »
                </Text>
              </Pressable>
            ))}
          </Carte>
        )}

        {/* Filtre par domaine */}
        <View style={styles.filtres}>
          <Pressable
            onPress={() => setDomaineActif(null)}
            style={[styles.filtre, !domaineActif && styles.filtreActif]}
          >
            <Text style={[styles.filtreTxt, !domaineActif && styles.filtreTxtActif]}>Tous</Text>
          </Pressable>
          {groupes.map((g) => {
            const actif = domaineActif === g.domaine;
            return (
              <Pressable
                key={g.domaine}
                onPress={() => setDomaineActif(actif ? null : g.domaine)}
                style={[styles.filtre, actif && styles.filtreActif]}
              >
                <Text style={[styles.filtreTxt, actif && styles.filtreTxtActif]}>
                  {g.domaine} ({g.items.length})
                </Text>
              </Pressable>
            );
          })}
        </View>

        {tous.length === 0 && (
          <Text style={styles.vide}>La banque se remplit au fur et à mesure des cadrages clients.</Text>
        )}

        {/* Groupes par domaine */}
        {domainesAffiches.map((g) => (
          <View key={g.domaine} style={{ gap: spacing.sm, marginTop: spacing.md }}>
            <Text style={styles.domaineTitre}>{g.domaine} · {g.items.length}</Text>
            {g.items.map((uc) => (
              <Carte key={uc.id} style={{ gap: spacing.xs }} onPress={() => setDetail(uc)}>
                <Text style={styles.itemTitre}>{uc.titre}</Text>
                <Text style={styles.itemTxt} numberOfLines={2}>{uc.probleme}</Text>
                <View style={styles.itemTags}>
                  <Etiquette texte={uc.complexite} />
                  {uc.client?.secteur && <Etiquette texte={`client: ${uc.client.secteur}`} />}
                </View>
              </Carte>
            ))}
          </View>
        ))}
      </ScrollView>
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
  headerTitre: { color: colors.text, fontSize: font.h3, fontWeight: '800', flex: 1, textAlign: 'center' },
  content: { padding: spacing.lg, paddingBottom: spacing.xxl, gap: spacing.md },
  intro: { color: colors.textMuted, fontSize: font.small },
  h: { color: colors.text, fontSize: font.body, fontWeight: '800' },
  filtres: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, marginTop: spacing.sm },
  filtre: {
    paddingHorizontal: spacing.md,
    paddingVertical: 7,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surfaceAlt,
  },
  filtreActif: { borderColor: colors.primary, backgroundColor: colors.primary + '22' },
  filtreTxt: { color: colors.textMuted, fontSize: font.tiny, fontWeight: '700' },
  filtreTxtActif: { color: colors.primary },
  domaineTitre: { color: colors.text, fontSize: font.h3, fontWeight: '800', marginTop: spacing.sm },
  itemTitre: { color: colors.text, fontSize: font.body, fontWeight: '700', lineHeight: 21 },
  itemTxt: { color: colors.textMuted, fontSize: font.small, lineHeight: 19 },
  itemTags: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs, marginTop: spacing.xs },
  paire: { flexDirection: 'row', gap: spacing.sm, alignItems: 'center', paddingVertical: 4 },
  paireScore: { color: colors.warn, fontWeight: '800', fontSize: font.small, width: 42 },
  paireTxt: { color: colors.text, fontSize: font.small, flex: 1, lineHeight: 18 },
  vide: { color: colors.textMuted, fontSize: font.body, textAlign: 'center', marginTop: spacing.xxl, lineHeight: 21 },
  // détail
  titre: { color: colors.text, fontSize: font.h2, fontWeight: '800', lineHeight: 28 },
  txt: { color: colors.textMuted, fontSize: font.small, lineHeight: 20 },
  sectionTitre: { color: colors.text, fontSize: font.h3, fontWeight: '800', marginTop: spacing.md },
  simTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  simScore: { color: colors.accent, fontSize: font.tiny, fontWeight: '800' },
  simTitre: { color: colors.text, fontSize: font.body, fontWeight: '600', lineHeight: 20 },
  lien: { alignItems: 'center', paddingVertical: spacing.md },
  lienTxt: { color: colors.accent, fontSize: font.small, fontWeight: '700' },
  chargement: { color: colors.textMuted, textAlign: 'center', marginTop: 100 },
});
