import React, { useEffect, useState } from 'react';
import { Pressable, SafeAreaView, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Carte, Etiquette } from '../components/ui';
import { libelleStatut } from '../components/UseCaseView';
import { dateHeure, identiteClient } from '../format';
import { useNav } from '../navigation';
import { chargerUseCases } from '../storage';
import { colors, font, spacing } from '../theme';
import { UseCase } from '../types';

// Espace admin : pilotage des projets soumis (génération des prototypes).
// On masque les brouillons (pas encore soumis par le client).
const VISIBLES: UseCase['statut'][] = [
  'soumis',
  'prototype_pret_admin',
  'prototype_genere',
  'revision_demandee',
  'prototype_valide',
  'cadrage_technique',
  'pret_a_packager',
  'certifie',
];

// Statuts qui demandent une action de l'admin -> remontés en haut de liste.
const PRIORITAIRES: UseCase['statut'][] = ['soumis', 'revision_demandee', 'prototype_pret_admin'];

export default function AdminScreen() {
  const { aller, retour } = useNav();
  const [liste, setListe] = useState<UseCase[] | null>(null);

  useEffect(() => {
    chargerUseCases().then((l) => {
      const visibles = l.filter((u) => VISIBLES.includes(u.statut));
      // Les projets nécessitant une action passent en tête.
      visibles.sort((a, b) => {
        const pa = PRIORITAIRES.includes(a.statut) ? 0 : 1;
        const pb = PRIORITAIRES.includes(b.statut) ? 0 : 1;
        return pa - pb;
      });
      setListe(visibles);
    });
  }, []);

  const aTraiter = liste?.filter((u) => u.statut === 'soumis').length ?? 0;
  const aRevoir = liste?.filter((u) => u.statut === 'revision_demandee').length ?? 0;

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.header}>
        <Pressable onPress={retour} hitSlop={12}>
          <Text style={styles.retour}>‹ Accueil</Text>
        </Pressable>
        <Text style={styles.headerTitre}>Espace admin</Text>
        <View style={{ width: 70 }} />
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.intro}>
          Projets soumis par les clients. {aTraiter > 0 ? `${aTraiter} en attente de prototype.` : 'Aucun nouveau projet à traiter.'}
        </Text>

        {aRevoir > 0 && (
          <View style={styles.alerteRevision}>
            <Text style={styles.alerteRevisionTxt}>
              🔔 {aRevoir} prototype{aRevoir > 1 ? 's' : ''} challengé{aRevoir > 1 ? 's' : ''} par le client —
              à retravailler. Ouvrez le projet pour voir les remarques et récupérer le prompt.
            </Text>
          </View>
        )}

        <Pressable onPress={() => aller({ nom: 'banque' })} style={styles.banqueBtn}>
          <Text style={styles.banqueTxt}>📚 Banque d’idées — classement & similarités</Text>
        </Pressable>
        <Pressable onPress={() => aller({ nom: 'prompts' })} style={styles.banqueBtn}>
          <Text style={styles.banqueTxt}>⚙️ Prompts des agents IA</Text>
        </Pressable>

        {liste && liste.length === 0 && (
          <View style={styles.vide}>
            <Text style={styles.videTitre}>Aucun projet soumis</Text>
            <Text style={styles.videTxt}>Les projets soumis par les clients apparaîtront ici.</Text>
          </View>
        )}

        {liste?.map((uc) => {
          const st = libelleStatut(uc.statut);
          const aGenerer = uc.statut === 'soumis' || uc.statut === 'revision_demandee';
          const aEnvoyer = uc.statut === 'prototype_pret_admin';
          const aAgir = aGenerer || aEnvoyer;
          return (
            <Carte
              key={uc.id}
              style={{ marginBottom: spacing.md, gap: spacing.sm, borderColor: aAgir ? colors.warn + '66' : colors.border }}
              onPress={() => aller({ nom: 'adminDetail', useCaseId: uc.id })}
            >
              <View style={styles.cardTop}>
                <Etiquette texte={st.texte} couleur={st.couleur} />
                {uc.statut === 'revision_demandee' ? (
                  <Text style={styles.action}>🔔 Challengé — à revoir</Text>
                ) : aGenerer ? (
                  <Text style={styles.action}>⚙️ À générer</Text>
                ) : (
                  aEnvoyer && <Text style={styles.action}>📤 À envoyer</Text>
                )}
              </View>
              <Text style={styles.cardTitre}>{uc.titre}</Text>
              <View style={styles.tags}>
                <Etiquette texte={uc.domaine} />
                <Etiquette texte={uc.complexite} />
              </View>
              {(uc.soumisLe || uc.client) && (
                <Text style={styles.meta}>
                  {uc.soumisLe ? `🕓 ${dateHeure(uc.soumisLe)}` : ''}
                  {uc.soumisLe && uc.client ? '  ·  ' : ''}
                  {uc.client ? `👤 ${identiteClient(uc.client)}` : ''}
                </Text>
              )}
            </Carte>
          );
        })}
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
  headerTitre: { color: colors.text, fontSize: font.h3, fontWeight: '800' },
  content: { padding: spacing.lg, paddingBottom: spacing.xxl },
  intro: { color: colors.textMuted, fontSize: font.small, lineHeight: 20, marginBottom: spacing.lg },
  alerteRevision: {
    backgroundColor: colors.warn + '1A',
    borderColor: colors.warn + '66',
    borderWidth: 1,
    borderRadius: 12,
    padding: spacing.md,
    marginBottom: spacing.lg,
  },
  alerteRevisionTxt: { color: colors.text, fontSize: font.small, lineHeight: 19, fontWeight: '600' },
  banqueBtn: {
    backgroundColor: colors.primarySoft,
    borderColor: colors.primary + '55',
    borderWidth: 1,
    borderRadius: 12,
    padding: spacing.md,
    marginBottom: spacing.lg,
    alignItems: 'center',
  },
  banqueTxt: { color: colors.accent, fontSize: font.small, fontWeight: '800' },
  cardTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  action: { color: colors.warn, fontSize: font.small, fontWeight: '800' },
  cardTitre: { color: colors.text, fontSize: font.h3, fontWeight: '700', lineHeight: 22 },
  tags: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, marginTop: spacing.xs },
  meta: { color: colors.textMuted, fontSize: font.tiny, marginTop: spacing.xs },
  vide: { alignItems: 'center', gap: spacing.md, paddingVertical: spacing.xxl },
  videTitre: { color: colors.text, fontSize: font.h3, fontWeight: '700' },
  videTxt: { color: colors.textMuted, fontSize: font.body, textAlign: 'center', lineHeight: 21 },
});
