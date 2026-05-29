import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { colors, font, radius, spacing } from '../theme';
import { EstimationROI, StatutUseCase, UseCase } from '../types';
import { Carte, Etiquette, ScoreCadrage, couleurComplexite } from './ui';

const eur = (n: number) => n.toLocaleString('fr-FR') + ' €';

export const LIBELLE_STATUT: Record<StatutUseCase, { texte: string; couleur: string }> = {
  brouillon: { texte: 'Cadré · à soumettre', couleur: colors.textMuted },
  soumis: { texte: 'Soumis', couleur: colors.accent },
  prototype_genere: { texte: 'Prototype prêt', couleur: colors.warn },
  revision_demandee: { texte: 'Révision demandée', couleur: colors.warn },
  prototype_valide: { texte: 'Prototype validé', couleur: colors.success },
  cadrage_technique: { texte: 'Cadrage technique', couleur: colors.warn },
  pret_a_packager: { texte: 'Prêt à packager', couleur: colors.success },
  certifie: { texte: 'Certifié', couleur: colors.success },
};

// Accès sûr au libellé : tolère d'anciens statuts (projets créés par d'anciennes
// versions) sans planter — renvoie une étiquette neutre par défaut.
export function libelleStatut(statut: string): { texte: string; couleur: string } {
  return (
    (LIBELLE_STATUT as Record<string, { texte: string; couleur: string }>)[statut] ?? {
      texte: statut || 'Projet',
      couleur: colors.textMuted,
    }
  );
}

export default function UseCaseView({ uc }: { uc: UseCase }) {
  const statut = libelleStatut(uc.statut);
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
});
