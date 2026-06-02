import React, { useState } from 'react';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { colors, font, radius, spacing } from '../theme';
import { CoutRun, EstimationROI, MakeOrBuy, StatutUseCase, UseCase, VentilationPrix } from '../types';
import { Carte, Etiquette, ScoreCadrage, couleurComplexite } from './ui';

const eur = (n: number) => n.toLocaleString('fr-FR') + ' €';

export const LIBELLE_STATUT: Record<StatutUseCase, { texte: string; couleur: string }> = {
  brouillon: { texte: 'Cadré · à soumettre', couleur: colors.textMuted },
  soumis: { texte: 'Soumis', couleur: colors.accent },
  prototype_pret_admin: { texte: 'À envoyer au client', couleur: colors.warn },
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
  const [detailPrix, setDetailPrix] = useState(false);
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

      {!!uc.processusADigitaliser?.length && (
        <Carte style={{ gap: spacing.sm }}>
          <Text style={styles.blocTitre}>⚙️ Processus à digitaliser</Text>
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
          <Text style={styles.blocTitre}>🧭 Parcours utilisateur</Text>
          {uc.parcoursUtilisateur.map((etape, i) => (
            <View key={i} style={styles.etapeRow}>
              <Text style={styles.etapeNum}>{i + 1}</Text>
              <Text style={styles.etapeTxt}>{etape}</Text>
            </View>
          ))}
        </Carte>
      )}

      <Bloc titre="🗄️ Données disponibles">{uc.donnees || '—'}</Bloc>
      <Bloc titre="👥 Utilisateurs cibles">{uc.utilisateurs || '—'}</Bloc>
      {(uc.paysClient || uc.paysDeploiement) && (
        <Carte style={{ gap: spacing.sm }}>
          <Text style={styles.blocTitre}>🌍 Localisation</Text>
          {!!uc.paysClient && <Ligne2 label="Pays du client" v={uc.paysClient} />}
          {!!uc.paysDeploiement && <Ligne2 label="Pays de déploiement" v={uc.paysDeploiement} />}
        </Carte>
      )}
      <Bloc titre="⚙️ Contraintes (dont légales locales)">{uc.contraintes || '—'}</Bloc>

      <Carte style={{ borderColor: colors.primary + '66', backgroundColor: colors.primarySoft }}>
        <Text style={styles.blocTitre}>🤖 Approche suggérée par l’IA</Text>
        <Text style={[styles.blocTexte, { marginTop: spacing.sm }]}>{uc.approcheSuggeree}</Text>
        {uc.ventilationPrix ? (
          <Pressable style={styles.budgetRow} onPress={() => setDetailPrix(true)}>
            <View>
              <Text style={styles.budgetLabel}>Prix du projet</Text>
              <Text style={styles.budgetDetailLien}>Voir le détail du calcul ›</Text>
            </View>
            <Text style={styles.budgetVal}>{eur(uc.ventilationPrix.totalEur)}</Text>
          </Pressable>
        ) : (
          <View style={styles.budgetRow}>
            <Text style={styles.budgetLabel}>Budget indicatif</Text>
            <Text style={styles.budgetVal}>{uc.budgetEstime}</Text>
          </View>
        )}
      </Carte>

      {!!uc.solutionsMarche?.length && (
        <Carte style={{ gap: spacing.md, borderColor: colors.warn + '44' }}>
          <Text style={styles.blocTitre}>🔎 Solutions existantes sur le marché</Text>
          {uc.solutionsMarche.map((sol, i) => (
            <View key={i} style={styles.solItem}>
              <View style={styles.solHead}>
                <Text style={styles.solNom}>{sol.nom}</Text>
                {!!sol.prixIndicatif && <Text style={styles.solPrix}>{sol.prixIndicatif}</Text>}
              </View>
              <Text style={styles.solDesc}>{sol.description}</Text>
              {!!sol.limite && <Text style={styles.solLimite}>Limite : {sol.limite}</Text>}
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
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={styles.modalFond} onPress={onClose}>
        <Pressable style={styles.modalCarte} onPress={() => {}}>
          <Text style={styles.modalTitre}>Détail du prix</Text>
          <View style={styles.tEntete}>
            <Text style={[styles.tCol, styles.tPoste]}>Poste</Text>
            <Text style={[styles.tCol, styles.tNum]}>Jours</Text>
            <Text style={[styles.tCol, styles.tNum]}>TJM</Text>
            <Text style={[styles.tCol, styles.tMontant]}>Montant</Text>
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
            <Text style={styles.tTotalLabel}>Total</Text>
            <Text style={styles.tTotalVal}>{eur(v.totalEur)}</Text>
          </View>
          {!!v.note && <Text style={styles.modalNote}>{v.note}</Text>}
          <Pressable style={styles.modalFermer} onPress={onClose}>
            <Text style={styles.modalFermerTxt}>Fermer</Text>
          </Pressable>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

// Recommandation Make (développer) vs Buy (acheter) pour aider à décider.
function MakeBuyBloc({ mb }: { mb: MakeOrBuy }) {
  const lib =
    mb.recommandation === 'make' ? { txt: '🛠️ Développer (Make)', c: colors.primary }
    : mb.recommandation === 'buy' ? { txt: '🛒 Acheter (Buy)', c: colors.warn }
    : { txt: '🔀 Hybride', c: colors.accent };
  return (
    <Carte style={{ gap: spacing.md, borderColor: lib.c + '66' }}>
      <Text style={styles.blocTitre}>⚖️ Make vs Buy — recommandation</Text>
      <View style={[styles.mbBadge, { backgroundColor: lib.c + '22', borderColor: lib.c + '66' }]}>
        <Text style={[styles.mbBadgeTxt, { color: lib.c }]}>{lib.txt}</Text>
      </View>
      <Text style={styles.blocTexte}>{mb.justification}</Text>
      <View style={styles.mbCols}>
        <View style={styles.mbCol}>
          <Text style={styles.mbColTitre}>Pour développer</Text>
          {mb.argumentsMake.map((a, i) => (
            <View key={i} style={styles.kpiRow}><View style={styles.puce} /><Text style={styles.mbArg}>{a}</Text></View>
          ))}
          {mb.argumentsMake.length === 0 && <Text style={styles.mbArg}>—</Text>}
        </View>
        <View style={styles.mbCol}>
          <Text style={styles.mbColTitre}>Pour acheter</Text>
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
  return (
    <Carte style={{ borderColor: colors.accent + '44', gap: spacing.md }}>
      <Text style={styles.blocTitre}>🖥️ Coût de fonctionnement (RUN) estimé</Text>
      <View style={styles.runGrid}>
        <View style={styles.runBox}>
          <Text style={styles.runMode}>☁️ Cloud</Text>
          <Text style={styles.runVal}>{eur(run.cloudMensuelEur)}<Text style={styles.runMois}> /mois</Text></Text>
          <Text style={styles.runHypo}>{run.cloudHypotheses}</Text>
        </View>
        <View style={styles.runBox}>
          <Text style={styles.runMode}>🏢 On-premise</Text>
          <Text style={styles.runVal}>{eur(run.onPremiseMensuelEur)}<Text style={styles.runMois}> /mois</Text></Text>
          <Text style={styles.runHypo}>{run.onPremiseHypotheses}</Text>
        </View>
      </View>
      {!!run.recommandation && <Text style={styles.runReco}>💡 {run.recommandation}</Text>}
    </Carte>
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
