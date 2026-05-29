import React, { useState } from 'react';
import { Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { copier } from '../clipboard';
import { colors, font, radius, spacing } from '../theme';
import { EstimationROI, SpecPrototype, StatutUseCase, UseCase } from '../types';
import { Carte, Etiquette, ScoreCadrage, couleurComplexite } from './ui';

const eur = (n: number) => n.toLocaleString('fr-FR') + ' €';

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

      {uc.roi && <RoiBloc roi={uc.roi} />}
      {uc.spec && <SpecBloc spec={uc.spec} />}
    </View>
  );
}

// Bloc ROI : indicateurs chiffrés pour juger la rentabilité avant d'investir.
function RoiBloc({ roi }: { roi: EstimationROI }) {
  const positif = roi.roiAn1Pct >= 0;
  return (
    <Carte style={{ borderColor: colors.success + '55', gap: spacing.md }}>
      <Text style={styles.blocTitre}>💸 Retour sur investissement estimé</Text>
      <View style={styles.roiGrid}>
        <Kpi label="Gain / an" valeur={eur(roi.gainAnnuelEur)} couleur={colors.success} />
        <Kpi label="Investissement" valeur={eur(roi.investissementEur)} />
        <Kpi
          label="ROI an 1"
          valeur={(positif ? '+' : '') + roi.roiAn1Pct + ' %'}
          couleur={positif ? colors.success : colors.danger}
        />
        <Kpi label="Retour en" valeur={roi.retourMois + ' mois'} couleur={colors.accent} />
      </View>
      <Text style={styles.roiDetail}>{roi.detail}</Text>
      <Text style={styles.roiHypo}>Hypothèses : {roi.hypotheses}</Text>
    </Carte>
  );
}

function Kpi({ label, valeur, couleur }: { label: string; valeur: string; couleur?: string }) {
  return (
    <View style={styles.kpiBox}>
      <Text style={[styles.kpiVal, couleur ? { color: couleur } : null]}>{valeur}</Text>
      <Text style={styles.kpiLabel}>{label}</Text>
    </View>
  );
}

// Bloc spécification + prompt prêt à coller dans Claude Code.
function SpecBloc({ spec }: { spec: SpecPrototype }) {
  const [copie, setCopie] = useState(false);
  async function copierPrompt() {
    const ok = await copier(spec.promptClaudeCode);
    if (ok) {
      setCopie(true);
      setTimeout(() => setCopie(false), 2000);
    }
  }
  return (
    <Carte style={{ gap: spacing.md }}>
      <Text style={styles.blocTitre}>🛠️ Spécification du prototype</Text>
      <Text style={styles.blocTexte}>{spec.resume}</Text>

      <Text style={styles.specLabel}>Stack recommandée</Text>
      <View style={styles.tagRow}>
        {spec.stack.map((s) => (
          <Etiquette key={s} texte={s} couleur={colors.accent} />
        ))}
      </View>

      <Text style={styles.specLabel}>Fonctionnalités</Text>
      {spec.fonctionnalites.map((f) => (
        <View key={f} style={styles.kpiRow}>
          <View style={styles.puce} />
          <Text style={styles.kpiTxt}>{f}</Text>
        </View>
      ))}

      <Text style={styles.specLabel}>Données d’entrée</Text>
      <Text style={styles.blocTexte}>{spec.donneesEntree}</Text>
      <Text style={styles.specLabel}>Sortie attendue</Text>
      <Text style={styles.blocTexte}>{spec.sortieAttendue}</Text>

      <Text style={styles.specLabel}>Critères d’acceptation</Text>
      {spec.criteresAcceptation.map((c) => (
        <View key={c} style={styles.kpiRow}>
          <Text style={styles.check}>✓</Text>
          <Text style={styles.kpiTxt}>{c}</Text>
        </View>
      ))}

      <View style={styles.promptHeader}>
        <Text style={styles.specLabel}>⚡ Prompt prêt pour Claude Code</Text>
        <Pressable onPress={copierPrompt} style={[styles.copyBtn, copie && { backgroundColor: colors.success }]}>
          <Text style={styles.copyTxt}>{copie ? '✓ Copié' : '📋 Copier'}</Text>
        </Pressable>
      </View>
      <View style={styles.promptBox}>
        <Text style={styles.promptTxt}>{spec.promptClaudeCode}</Text>
      </View>
      <Text style={styles.promptHint}>
        Collez ce prompt dans Claude Code : il produit le prototype sans poser de question.
      </Text>
    </Carte>
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
  // ROI
  roiGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  kpiBox: {
    flexGrow: 1,
    flexBasis: '45%',
    backgroundColor: colors.surfaceAlt,
    borderRadius: radius.md,
    padding: spacing.md,
  },
  kpiVal: { color: colors.text, fontSize: font.h2, fontWeight: '800' },
  kpiLabel: { color: colors.textMuted, fontSize: font.small, marginTop: 2 },
  roiDetail: { color: colors.text, fontSize: font.small, lineHeight: 20 },
  roiHypo: { color: colors.textMuted, fontSize: font.tiny, lineHeight: 17, fontStyle: 'italic' },
  // Spec
  specLabel: { color: colors.text, fontSize: font.small, fontWeight: '800', marginTop: spacing.xs },
  check: { color: colors.success, fontWeight: '800', width: 14 },
  promptHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: spacing.xs },
  copyBtn: {
    backgroundColor: colors.primary,
    borderRadius: radius.pill,
    paddingHorizontal: spacing.md,
    paddingVertical: 6,
  },
  copyTxt: { color: '#fff', fontSize: font.small, fontWeight: '700' },
  promptBox: {
    backgroundColor: '#0A0E18',
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
  },
  promptTxt: {
    color: '#C9D4F0',
    fontSize: font.small,
    lineHeight: 19,
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
  },
  promptHint: { color: colors.textMuted, fontSize: font.tiny, fontStyle: 'italic' },
});
