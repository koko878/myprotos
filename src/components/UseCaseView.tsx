import React, { useState } from 'react';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { colors, font, radius, spacing } from '../theme';
import { Complexite, CoutRun, EstimationROI, MakeOrBuy, PertinenceDigitale, StatutUseCase, UseCase, VentilationPrix } from '../types';
import { useTr } from '../i18n';
import { Carte, Etiquette, ScoreCadrage, couleurComplexite } from './ui';

// Affichage des montants en MAD (dirhams marocains), devise par défaut.
const eur = (n: number) => n.toLocaleString('fr-FR') + ' MAD';

export const LIBELLE_STATUT: Record<StatutUseCase, { texte: string; texteEn: string; couleur: string }> = {
  brouillon: { texte: 'Cadré · à soumettre', texteEn: 'Scoped · to submit', couleur: colors.textMuted },
  soumis: { texte: 'Soumis', texteEn: 'Submitted', couleur: colors.accent },
  prototype_pret_admin: { texte: 'À envoyer au client', texteEn: 'To send to the client', couleur: colors.warn },
  prototype_genere: { texte: 'Prototype prêt', texteEn: 'Prototype ready', couleur: colors.warn },
  revision_demandee: { texte: 'Révision demandée', texteEn: 'Revision requested', couleur: colors.warn },
  prototype_valide: { texte: 'Prototype validé', texteEn: 'Prototype approved', couleur: colors.success },
  cadrage_technique: { texte: 'Cadrage technique', texteEn: 'Technical scoping', couleur: colors.warn },
  pret_a_packager: { texte: 'Prêt à packager', texteEn: 'Ready to package', couleur: colors.success },
  commande_validee: { texte: 'Commande validée', texteEn: 'Order confirmed', couleur: colors.success },
  certifie: { texte: 'Certifié', texteEn: 'Certified', couleur: colors.success },
};

// Accès sûr au libellé : tolère d'anciens statuts (projets créés par d'anciennes
// versions) sans planter — renvoie une étiquette neutre par défaut.
export function libelleStatut(statut: string): { texte: string; texteEn: string; couleur: string } {
  return (
    (LIBELLE_STATUT as Record<string, { texte: string; texteEn: string; couleur: string }>)[statut] ?? {
      texte: statut || 'Projet',
      texteEn: statut || 'Project',
      couleur: colors.textMuted,
    }
  );
}

// Libellé traduit du niveau de complexité (valeur d'enum FR -> texte affiché).
function trComplexite(tr: (fr: string, en: string) => string, c: Complexite): string {
  if (c === 'Faible') return tr('Faible', 'Low');
  if (c === 'Moyenne') return tr('Moyenne', 'Medium');
  return tr('Élevée', 'High');
}

export default function UseCaseView({ uc }: { uc: UseCase }) {
  const tr = useTr();
  const statut = libelleStatut(uc.statut);
  const statutTexte = tr(statut.texte, statut.texteEn);
  const [detailPrix, setDetailPrix] = useState(false);
  return (
    <View style={{ gap: spacing.lg }}>
      <View style={{ gap: spacing.sm }}>
        <View style={styles.tagRow}>
          <Etiquette texte={uc.domaine} />
          <Etiquette texte={trComplexite(tr, uc.complexite)} couleur={couleurComplexite(uc.complexite)} />
          <Etiquette texte={statutTexte} couleur={statut.couleur} />
        </View>
        <Text style={styles.titre}>{uc.titre}</Text>
      </View>

      <Carte>
        <ScoreCadrage score={uc.scoreCadrage} />
      </Carte>

      {uc.pertinenceDigitale && <PertinenceBloc p={uc.pertinenceDigitale} />}

      <Bloc titre={tr('🎯 Objectif business', '🎯 Business objective')}>{uc.objectif || '—'}</Bloc>
      <Bloc titre={tr('🧩 Problème à résoudre', '🧩 Problem to solve')}>{uc.probleme || '—'}</Bloc>

      <Carte style={{ gap: spacing.sm }}>
        <Text style={styles.blocTitre}>{tr('📊 KPIs de succès', '📊 Success KPIs')}</Text>
        {uc.kpis.map((k) => (
          <View key={k} style={styles.kpiRow}>
            <View style={styles.puce} />
            <Text style={styles.kpiTxt}>{k}</Text>
          </View>
        ))}
      </Carte>

      {!!uc.processusADigitaliser?.length && (
        <Carte style={{ gap: spacing.sm }}>
          <Text style={styles.blocTitre}>{tr('⚙️ Processus à digitaliser', '⚙️ Processes to digitize')}</Text>
          {uc.processusADigitaliser.map((p, i) => (
            <View key={i} style={styles.kpiRow}>
              <View style={styles.puce} />
              <Text style={styles.kpiTxt}>{p}</Text>
            </View>
          ))}
        </Carte>
      )}

      {!!uc.parcoursUtilisateur?.length && (
        <Carte style={{ gap: spacing.sm }}>
          <Text style={styles.blocTitre}>{tr('🧭 Parcours utilisateur', '🧭 User journey')}</Text>
          {uc.parcoursUtilisateur.map((etape, i) => (
            <View key={i} style={styles.etapeRow}>
              <Text style={styles.etapeNum}>{i + 1}</Text>
              <Text style={styles.etapeTxt}>{etape}</Text>
            </View>
          ))}
        </Carte>
      )}

      <Bloc titre={tr('🗄️ Données disponibles', '🗄️ Available data')}>{uc.donnees || '—'}</Bloc>
      <Bloc titre={tr('👥 Utilisateurs cibles', '👥 Target users')}>{uc.utilisateurs || '—'}</Bloc>
      {(uc.paysClient || uc.paysDeploiement) && (
        <Carte style={{ gap: spacing.sm }}>
          <Text style={styles.blocTitre}>{tr('🌍 Localisation', '🌍 Location')}</Text>
          {!!uc.paysClient && <Ligne2 label={tr('Pays du client', 'Client country')} v={uc.paysClient} />}
          {!!uc.paysDeploiement && <Ligne2 label={tr('Pays de déploiement', 'Deployment country')} v={uc.paysDeploiement} />}
        </Carte>
      )}
      <Bloc titre={tr('⚙️ Contraintes (dont légales locales)', '⚙️ Constraints (including local legal ones)')}>{uc.contraintes || '—'}</Bloc>

      <Carte style={{ borderColor: colors.primary + '66', backgroundColor: colors.primarySoft }}>
        <Text style={styles.blocTitre}>{tr('🤖 Approche suggérée par l’IA', '🤖 AI-suggested approach')}</Text>
        <Text style={[styles.blocTexte, { marginTop: spacing.sm }]}>{uc.approcheSuggeree}</Text>
        {uc.ventilationPrix ? (
          <Pressable style={styles.budgetRow} onPress={() => setDetailPrix(true)}>
            <View>
              <Text style={styles.budgetLabel}>{tr('Prix du projet', 'Project price')}</Text>
              <Text style={styles.budgetDetailLien}>{tr('Voir le détail du calcul ›', 'See the calculation breakdown ›')}</Text>
            </View>
            <Text style={styles.budgetVal}>{eur(uc.ventilationPrix.totalEur)}</Text>
          </Pressable>
        ) : (
          <View style={styles.budgetRow}>
            <Text style={styles.budgetLabel}>{tr('Budget indicatif', 'Indicative budget')}</Text>
            <Text style={styles.budgetVal}>{uc.budgetEstime}</Text>
          </View>
        )}
      </Carte>

      {!!uc.solutionsMarche?.length && (
        <Carte style={{ gap: spacing.md, borderColor: colors.warn + '44' }}>
          <Text style={styles.blocTitre}>{tr('🔎 Solutions existantes sur le marché', '🔎 Existing solutions on the market')}</Text>
          {uc.solutionsMarche.map((sol, i) => (
            <View key={i} style={styles.solItem}>
              <View style={styles.solHead}>
                <Text style={styles.solNom}>{sol.nom}</Text>
                {!!sol.prixIndicatif && <Text style={styles.solPrix}>{sol.prixIndicatif}</Text>}
              </View>
              <Text style={styles.solDesc}>{sol.description}</Text>
              {!!sol.limite && <Text style={styles.solLimite}>{tr('Limite : ', 'Limitation: ')}{sol.limite}</Text>}
            </View>
          ))}
        </Carte>
      )}

      {uc.makeOrBuy && <MakeBuyBloc mb={uc.makeOrBuy} />}

      {uc.coutRun && <RunBloc run={uc.coutRun} />}

      {uc.roi && <RoiBloc roi={uc.roi} />}

      {uc.ventilationPrix && (
        <ModalPrix
          visible={detailPrix}
          onClose={() => setDetailPrix(false)}
          v={uc.ventilationPrix}
        />
      )}
    </View>
  );
}

// Détail factuel du prix : un poste par ligne (jours × TJM = montant).
function ModalPrix({ visible, onClose, v }: { visible: boolean; onClose: () => void; v: VentilationPrix }) {
  const tr = useTr();
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={styles.modalFond} onPress={onClose}>
        <Pressable style={styles.modalCarte} onPress={() => {}}>
          <Text style={styles.modalTitre}>{tr('Détail du prix', 'Price breakdown')}</Text>
          <View style={styles.tEntete}>
            <Text style={[styles.tCol, styles.tPoste]}>{tr('Poste', 'Item')}</Text>
            <Text style={[styles.tCol, styles.tNum]}>{tr('Jours', 'Days')}</Text>
            <Text style={[styles.tCol, styles.tNum]}>{tr('TJM', 'Daily rate')}</Text>
            <Text style={[styles.tCol, styles.tMontant]}>{tr('Montant', 'Amount')}</Text>
          </View>
          {v.postes.map((p, i) => (
            <View key={i} style={styles.tLigne}>
              <Text style={[styles.tCol, styles.tPoste, styles.tTxt]}>{p.poste}</Text>
              <Text style={[styles.tCol, styles.tNum, styles.tTxt]}>{p.jours}</Text>
              <Text style={[styles.tCol, styles.tNum, styles.tTxt]}>{eur(p.tjmEur)}</Text>
              <Text style={[styles.tCol, styles.tMontant, styles.tTxtFort]}>{eur(p.montantEur)}</Text>
            </View>
          ))}
          <View style={styles.tTotal}>
            <Text style={styles.tTotalLabel}>{tr('Total', 'Total')}</Text>
            <Text style={styles.tTotalVal}>{eur(v.totalEur)}</Text>
          </View>
          {!!v.note && <Text style={styles.modalNote}>{v.note}</Text>}
          <Pressable style={styles.modalFermer} onPress={onClose}>
            <Text style={styles.modalFermerTxt}>{tr('Fermer', 'Close')}</Text>
          </Pressable>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

// Verdict : une solution digitale est-elle vraiment la bonne réponse ?
function PertinenceBloc({ p }: { p: PertinenceDigitale }) {
  const tr = useTr();
  const lib =
    p.verdict === 'digital_pertinent' ? { txt: tr('✅ Une solution digitale est pertinente', '✅ A digital solution is relevant'), c: colors.success }
    : p.verdict === 'pas_digital' ? { txt: tr('⚠️ Le problème n’est pas (d’abord) digital', '⚠️ The problem is not (primarily) digital'), c: colors.danger }
    : { txt: tr('➗ Partiellement digital', '➗ Partially digital'), c: colors.warn };
  return (
    <Carte style={{ borderColor: lib.c + '66', backgroundColor: lib.c + '12', gap: spacing.sm }}>
      <Text style={[styles.blocTitre, { color: lib.c }]}>{lib.txt}</Text>
      <Text style={styles.blocTexte}>{p.explication}</Text>
    </Carte>
  );
}

// Recommandation Make (développer) vs Buy (acheter) pour aider à décider.
function MakeBuyBloc({ mb }: { mb: MakeOrBuy }) {
  const tr = useTr();
  const lib =
    mb.recommandation === 'make' ? { txt: tr('🛠️ Développer (Make)', '🛠️ Build (Make)'), c: colors.primary }
    : mb.recommandation === 'buy' ? { txt: tr('🛒 Acheter (Buy)', '🛒 Buy'), c: colors.warn }
    : { txt: tr('🔀 Hybride', '🔀 Hybrid'), c: colors.accent };
  return (
    <Carte style={{ gap: spacing.md, borderColor: lib.c + '66' }}>
      <Text style={styles.blocTitre}>{tr('⚖️ Make vs Buy — recommandation', '⚖️ Make vs Buy — recommendation')}</Text>
      <View style={[styles.mbBadge, { backgroundColor: lib.c + '22', borderColor: lib.c + '66' }]}>
        <Text style={[styles.mbBadgeTxt, { color: lib.c }]}>{lib.txt}</Text>
      </View>
      <Text style={styles.blocTexte}>{mb.justification}</Text>
      <View style={styles.mbCols}>
        <View style={styles.mbCol}>
          <Text style={styles.mbColTitre}>{tr('Pour développer', 'For building')}</Text>
          {mb.argumentsMake.map((a, i) => (
            <View key={i} style={styles.kpiRow}><View style={styles.puce} /><Text style={styles.mbArg}>{a}</Text></View>
          ))}
          {mb.argumentsMake.length === 0 && <Text style={styles.mbArg}>—</Text>}
        </View>
        <View style={styles.mbCol}>
          <Text style={styles.mbColTitre}>{tr('Pour acheter', 'For buying')}</Text>
          {mb.argumentsBuy.map((a, i) => (
            <View key={i} style={styles.kpiRow}><View style={styles.puce} /><Text style={styles.mbArg}>{a}</Text></View>
          ))}
          {mb.argumentsBuy.length === 0 && <Text style={styles.mbArg}>—</Text>}
        </View>
      </View>
    </Carte>
  );
}

// Coût de fonctionnement (RUN) mensuel : cloud vs on-premise.
function RunBloc({ run }: { run: CoutRun }) {
  const tr = useTr();
  return (
    <Carte style={{ borderColor: colors.accent + '44', gap: spacing.md }}>
      <Text style={styles.blocTitre}>{tr('🖥️ Coût de fonctionnement (RUN) estimé', '🖥️ Estimated running cost (RUN)')}</Text>
      <View style={styles.runGrid}>
        <View style={styles.runBox}>
          <Text style={styles.runMode}>☁️ Cloud</Text>
          <Text style={styles.runVal}>{eur(run.cloudMensuelEur)}<Text style={styles.runMois}>{tr(' /mois', ' /month')}</Text></Text>
          <Text style={styles.runHypo}>{run.cloudHypotheses}</Text>
        </View>
        <View style={styles.runBox}>
          <Text style={styles.runMode}>🏢 On-premise</Text>
          <Text style={styles.runVal}>{eur(run.onPremiseMensuelEur)}<Text style={styles.runMois}>{tr(' /mois', ' /month')}</Text></Text>
          <Text style={styles.runHypo}>{run.onPremiseHypotheses}</Text>
        </View>
      </View>
      {!!run.recommandation && <Text style={styles.runReco}>💡 {run.recommandation}</Text>}
    </Carte>
  );
}

// Bloc ROI : indicateurs chiffrés pour juger la rentabilité avant d'investir.
function RoiBloc({ roi }: { roi: EstimationROI }) {
  const tr = useTr();
  const positif = roi.roiAn1Pct >= 0;
  return (
    <Carte style={{ borderColor: colors.success + '55', gap: spacing.md }}>
      <Text style={styles.blocTitre}>{tr('💸 Retour sur investissement estimé', '💸 Estimated return on investment')}</Text>
      <View style={styles.roiGrid}>
        <Kpi label={tr('Gain / an', 'Gain / year')} valeur={eur(roi.gainAnnuelEur)} couleur={colors.success} />
        <Kpi label={tr('Investissement', 'Investment')} valeur={eur(roi.investissementEur)} />
        <Kpi
          label={tr('ROI an 1', 'Year 1 ROI')}
          valeur={(positif ? '+' : '') + roi.roiAn1Pct + ' %'}
          couleur={positif ? colors.success : colors.danger}
        />
        <Kpi label={tr('Retour en', 'Payback in')} valeur={roi.retourMois + tr(' mois', ' months')} couleur={colors.accent} />
      </View>
      <Text style={styles.roiDetail}>{roi.detail}</Text>
      <Text style={styles.roiHypo}>{tr('Hypothèses : ', 'Assumptions: ')}{roi.hypotheses}</Text>
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

function Ligne2({ label, v }: { label: string; v: string }) {
  return (
    <View style={styles.ligne2}>
      <Text style={styles.ligne2Label}>{label}</Text>
      <Text style={styles.ligne2Val}>{v}</Text>
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
  solItem: { gap: 2, borderTopWidth: 1, borderTopColor: colors.border, paddingTop: spacing.sm },
  solHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: spacing.sm },
  solNom: { color: colors.text, fontSize: font.body, fontWeight: '800', flex: 1 },
  solPrix: { color: colors.warn, fontSize: font.tiny, fontWeight: '700' },
  solDesc: { color: colors.textMuted, fontSize: font.small, lineHeight: 19 },
  solLimite: { color: colors.text, fontSize: font.tiny, fontStyle: 'italic', lineHeight: 16 },
  mbBadge: { alignSelf: 'flex-start', borderWidth: 1, borderRadius: radius.pill, paddingHorizontal: spacing.md, paddingVertical: 6 },
  mbBadgeTxt: { fontSize: font.small, fontWeight: '800' },
  mbCols: { flexDirection: 'row', gap: spacing.md },
  mbCol: { flex: 1, gap: 4 },
  mbColTitre: { color: colors.text, fontSize: font.small, fontWeight: '800' },
  mbArg: { color: colors.textMuted, fontSize: font.tiny, lineHeight: 16, flex: 1 },
  etapeRow: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.sm },
  etapeNum: {
    color: '#fff',
    backgroundColor: colors.primary,
    width: 20,
    height: 20,
    borderRadius: 10,
    textAlign: 'center',
    lineHeight: 20,
    fontSize: font.tiny,
    fontWeight: '800',
    overflow: 'hidden',
  },
  etapeTxt: { color: colors.textMuted, fontSize: font.small, flex: 1, lineHeight: 20 },
  ligne2: { flexDirection: 'row', justifyContent: 'space-between', gap: spacing.md },
  ligne2Label: { color: colors.textMuted, fontSize: font.small },
  ligne2Val: { color: colors.text, fontSize: font.small, fontWeight: '600', flex: 1, textAlign: 'right' },
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
  budgetDetailLien: { color: colors.accent, fontSize: font.tiny, fontWeight: '700', marginTop: 2 },
  budgetVal: { color: colors.accent, fontSize: font.h3, fontWeight: '800' },
  // Coût de RUN
  runGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  runBox: {
    flexGrow: 1,
    flexBasis: '45%',
    backgroundColor: colors.surfaceAlt,
    borderRadius: radius.md,
    padding: spacing.md,
    gap: 4,
  },
  runMode: { color: colors.text, fontSize: font.small, fontWeight: '800' },
  runVal: { color: colors.accent, fontSize: font.h3, fontWeight: '800' },
  runMois: { color: colors.textMuted, fontSize: font.tiny, fontWeight: '600' },
  runHypo: { color: colors.textMuted, fontSize: font.tiny, lineHeight: 16 },
  runReco: { color: colors.text, fontSize: font.small, lineHeight: 19 },
  // Modal détail prix
  modalFond: { flex: 1, backgroundColor: '#000000AA', justifyContent: 'center', padding: spacing.lg },
  modalCarte: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.lg,
    gap: spacing.sm,
  },
  modalTitre: { color: colors.text, fontSize: font.h3, fontWeight: '800', marginBottom: spacing.sm },
  tEntete: { flexDirection: 'row', paddingBottom: spacing.xs, borderBottomWidth: 1, borderBottomColor: colors.border },
  tLigne: { flexDirection: 'row', paddingVertical: 6 },
  tCol: { fontSize: font.tiny },
  tPoste: { flex: 1, paddingRight: spacing.xs },
  tNum: { width: 52, textAlign: 'right' },
  tMontant: { width: 80, textAlign: 'right' },
  tTxt: { color: colors.textMuted },
  tTxtFort: { color: colors.text, fontWeight: '700' },
  tTotal: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: spacing.sm,
    paddingTop: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  tTotalLabel: { color: colors.text, fontSize: font.body, fontWeight: '800' },
  tTotalVal: { color: colors.accent, fontSize: font.h3, fontWeight: '800' },
  modalNote: { color: colors.textMuted, fontSize: font.tiny, lineHeight: 16, fontStyle: 'italic', marginTop: spacing.xs },
  modalFermer: {
    marginTop: spacing.md,
    backgroundColor: colors.primary,
    borderRadius: radius.pill,
    paddingVertical: 12,
    alignItems: 'center',
  },
  modalFermerTxt: { color: '#fff', fontWeight: '800', fontSize: font.body },
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
