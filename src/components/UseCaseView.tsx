import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { colors, font, radius, spacing } from '../theme';
import { StatutUseCase, UseCase } from '../types';
import { Carte, Etiquette, ScoreCadrage, couleurComplexite } from './ui';

const LIBELLE_STATUT: Record<StatutUseCase, { texte: string; couleur: string }> = {
  brouillon: { texte: 'Brouillon', couleur: colors.textMuted },
  publié: { texte: 'Publié · ouvert aux experts', couleur: colors.accent },
  prototype_en_cours: { texte: 'Prototype en cours', couleur: colors.warn },
  prototype_validé: { texte: 'Prototype validé', couleur: colors.success },
  livré: { texte: 'Livré', couleur: colors.success },
};

export default function UseCaseView({ uc }: { uc: UseCase }) {
  const statut = LIBELLE_STATUT[uc.statut];
  return (
    <View style={{ gap: spacing.lg }}>
      <View style={{ gap: spacing.sm }}>
        <View style={styles.tagRow}>
          <Etiquette texte={uc.domaine} />
          <Etiquette texte={uc.complexite} couleur={couleurComplexite(uc.complexite)} />
          <Etiquette texte={statut.texte} couleur={statut.couleur} />
        </View>
        <Text style={styles.titre}>{uc.titre}</Text>
      </View>

      <Carte>
        <ScoreCadrage score={uc.scoreCadrage} />
      </Carte>

      <Bloc titre="🎯 Objectif business">{uc.objectif || '—'}</Bloc>
      <Bloc titre="🧩 Problème à résoudre">{uc.probleme || '—'}</Bloc>

      <Carte style={{ gap: spacing.sm }}>
        <Text style={styles.blocTitre}>📊 KPIs de succès</Text>
        {uc.kpis.map((k) => (
          <View key={k} style={styles.kpiRow}>
            <View style={styles.puce} />
            <Text style={styles.kpiTxt}>{k}</Text>
          </View>
        ))}
      </Carte>

      <Bloc titre="🗄️ Données disponibles">{uc.donnees || '—'}</Bloc>
      <Bloc titre="👥 Utilisateurs cibles">{uc.utilisateurs || '—'}</Bloc>
      <Bloc titre="⚙️ Contraintes">{uc.contraintes || '—'}</Bloc>

      <Carte style={{ borderColor: colors.primary + '66', backgroundColor: colors.primarySoft }}>
        <Text style={styles.blocTitre}>🤖 Approche suggérée par l’IA</Text>
        <Text style={[styles.blocTexte, { marginTop: spacing.sm }]}>{uc.approcheSuggeree}</Text>
        <View style={styles.budgetRow}>
          <Text style={styles.budgetLabel}>Budget indicatif</Text>
          <Text style={styles.budgetVal}>{uc.budgetEstime}</Text>
        </View>
      </Carte>
    </View>
  );
}

function Bloc({ titre, children }: { titre: string; children: React.ReactNode }) {
  return (
    <Carte>
      <Text style={styles.blocTitre}>{titre}</Text>
      <Text style={[styles.blocTexte, { marginTop: spacing.sm }]}>{children}</Text>
    </Carte>
  );
}

const styles = StyleSheet.create({
  tagRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  titre: { color: colors.text, fontSize: font.h1, fontWeight: '800', lineHeight: 32 },
  blocTitre: { color: colors.text, fontSize: font.h3, fontWeight: '700' },
  blocTexte: { color: colors.textMuted, fontSize: font.body, lineHeight: 22 },
  kpiRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  puce: { width: 6, height: 6, borderRadius: 3, backgroundColor: colors.accent },
  kpiTxt: { color: colors.text, fontSize: font.body, flex: 1 },
  budgetRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: spacing.lg,
    paddingTop: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  budgetLabel: { color: colors.textMuted, fontSize: font.small },
  budgetVal: { color: colors.accent, fontSize: font.h3, fontWeight: '800' },
});
