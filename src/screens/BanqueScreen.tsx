import React, { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, SafeAreaView, ScrollView, StyleSheet, Text, View } from 'react-native';
import { AnalyseBanque, analyserBanque } from '../banqueIA';
import { Bouton, Carte, EnTete, Etiquette } from '../components/ui';
import { iaDisponible } from '../llm';
import { useNav } from '../navigation';
import { chargerUseCases } from '../storage';
import { grouperParDomaine, pairesSimilaires, trouverSimilaires } from '../similarite';
import { colors, font, radius, spacing } from '../theme';
import { UseCase } from '../types';
import { useTr } from '../i18n';

const VERDICT_LIB: Record<string, { fr: string; en: string; couleur: string }> = {
  existe_deja: { fr: 'Existe déjà', en: 'Already exists', couleur: colors.danger },
  partiellement: { fr: 'Partiellement', en: 'Partially', couleur: colors.warn },
  original: { fr: 'Original', en: 'Original', couleur: colors.success },
};

// Banque d'idées (admin) : tous les use cases classés par domaine, avec
// détection des idées quasi-similaires (doublons potentiels) + analyse IA.
export default function BanqueScreen() {
  const tr = useTr();
  const { aller, retour } = useNav();
  const [tous, setTous] = useState<UseCase[] | null>(null);
  const [domaineActif, setDomaineActif] = useState<string | null>(null);
  const [detail, setDetail] = useState<UseCase | null>(null);
  const [analyse, setAnalyse] = useState<AnalyseBanque | null>(null);
  const [analyseEnCours, setAnalyseEnCours] = useState(false);
  const [analyseErreur, setAnalyseErreur] = useState<string | null>(null);

  useEffect(() => {
    chargerUseCases().then(setTous);
  }, []);

  const groupes = useMemo(() => (tous ? grouperParDomaine(tous) : []), [tous]);
  const paires = useMemo(() => (tous ? pairesSimilaires(tous, 0.4) : []), [tous]);

  async function lancerAnalyse() {
    if (!tous || analyseEnCours) return;
    setAnalyseEnCours(true);
    setAnalyseErreur(null);
    try {
      const r = await analyserBanque(tous);
      if (r) setAnalyse(r);
      else setAnalyseErreur(tr('L’analyse IA a échoué (moteurs indisponibles). Réessayez.', 'AI analysis failed (engines unavailable). Please try again.'));
    } catch {
      setAnalyseErreur(tr('L’analyse IA a échoué. Réessayez.', 'AI analysis failed. Please try again.'));
    } finally {
      setAnalyseEnCours(false);
    }
  }

  if (!tous) {
    return (
      <SafeAreaView style={styles.safe}>
        <Text style={styles.chargement}>{tr('Chargement…', 'Loading…')}</Text>
      </SafeAreaView>
    );
  }

  // Vue détail d'une idée : ses similaires dans toute la banque.
  if (detail) {
    const similaires = trouverSimilaires(detail, tous, 0.18);
    return (
      <SafeAreaView style={styles.safe}>
        <EnTete titre={tr('Idée', 'Idea')} onRetour={() => setDetail(null)} />
        <ScrollView contentContainerStyle={styles.content}>
          <Carte style={{ gap: spacing.sm }}>
            <Etiquette texte={detail.domaine} couleur={colors.accent} />
            <Text style={styles.titre}>{detail.titre}</Text>
            <Text style={styles.txt}>{detail.probleme}</Text>
          </Carte>

          <Text style={styles.sectionTitre}>
            {similaires.length > 0
              ? tr(
                  `🔗 ${similaires.length} idée${similaires.length > 1 ? 's' : ''} similaire${similaires.length > 1 ? 's' : ''}`,
                  `🔗 ${similaires.length} similar idea${similaires.length > 1 ? 's' : ''}`
                )
              : tr('Aucune idée similaire détectée', 'No similar ideas detected')}
          </Text>
          {similaires.map((s) => (
            <Carte key={s.uc.id} style={{ gap: spacing.xs }} onPress={() => setDetail(s.uc)}>
              <View style={styles.simTop}>
                <Etiquette texte={s.uc.domaine} />
                <Text style={styles.simScore}>{tr(`${Math.round(s.score * 100)}% proche`, `${Math.round(s.score * 100)}% match`)}</Text>
              </View>
              <Text style={styles.simTitre}>{s.uc.titre}</Text>
            </Carte>
          ))}
          <Pressable onPress={() => aller({ nom: 'adminDetail', useCaseId: detail.id })} style={styles.lien}>
            <Text style={styles.lienTxt}>{tr('Ouvrir le projet complet →', 'Open the full project →')}</Text>
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
      <EnTete titre={tr('Banque d’idées', 'Idea bank')} onRetour={retour} />

      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.intro}>
          {tr(
            `${tous.length} idée${tous.length > 1 ? 's' : ''} · ${groupes.length} domaine${groupes.length > 1 ? 's' : ''}.`,
            `${tous.length} idea${tous.length > 1 ? 's' : ''} · ${groupes.length} domain${groupes.length > 1 ? 's' : ''}.`
          )}
        </Text>

        {/* Analyse IA : idées déjà existantes + potentiel licorne */}
        {iaDisponible() && tous.length > 0 && (
          <Carte style={{ gap: spacing.md, borderColor: colors.primary + '55' }}>
            <Text style={styles.h}>{tr('🤖 Analyse IA de la banque', '🤖 AI analysis of the bank')}</Text>
            <Text style={styles.txt}>
              {tr(
                'Vérifie les idées qui existent déjà ailleurs (avec évidences) et repère les éventuelles pépites à fort potentiel.',
                'Checks which ideas already exist elsewhere (with evidence) and spots any high-potential gems.'
              )}
            </Text>
            {analyseEnCours ? (
              <View style={styles.analyseLoad}>
                <ActivityIndicator color={colors.primary} />
                <Text style={styles.txt}>{tr('Analyse en cours…', 'Analyzing…')}</Text>
              </View>
            ) : (
              <Bouton
                titre={analyse ? tr('↻ Relancer l’analyse', '↻ Rerun analysis') : tr('🔎 Analyser la banque', '🔎 Analyze the bank')}
                variante="secondaire"
                onPress={lancerAnalyse}
              />
            )}
            {analyseErreur && <Text style={styles.erreur}>⚠️ {analyseErreur}</Text>}

            {analyse && (
              <View style={{ gap: spacing.md }}>
                {/* Licornes */}
                <Text style={styles.sousSection}>{tr('🦄 Potentiel licorne', '🦄 Unicorn potential')}</Text>
                {analyse.licornes.length === 0 ? (
                  <Text style={styles.txt}>
                    {analyse.syntheseLicornes || tr('Aucune idée à potentiel licorne identifiée.', 'No unicorn-potential idea identified.')}
                  </Text>
                ) : (
                  <>
                    {analyse.syntheseLicornes ? (
                      <Text style={styles.txt}>{analyse.syntheseLicornes}</Text>
                    ) : null}
                    {analyse.licornes.map((l, i) => (
                      <Pressable
                        key={i}
                        onPress={() => {
                          const uc = tous.find((u) => u.id === l.id);
                          if (uc) setDetail(uc);
                        }}
                        style={styles.licorne}
                      >
                        <View style={styles.simTop}>
                          <Text style={styles.licorneTitre}>🦄 {l.titre}</Text>
                          <Text style={styles.licornePot}>
                            {l.potentiel === 'tres_fort' ? tr('Très fort', 'Very strong') : tr('Fort', 'Strong')}
                          </Text>
                        </View>
                        <Text style={styles.txt}>{l.raison}</Text>
                        {!!l.marche && <Text style={styles.marche}>{tr('Marché : ', 'Market: ')}{l.marche}</Text>}
                      </Pressable>
                    ))}
                  </>
                )}

                {/* Existant */}
                <Text style={styles.sousSection}>{tr('🌍 Déjà sur le marché ?', '🌍 Already on the market?')}</Text>
                {analyse.existantes.length === 0 ? (
                  <Text style={styles.txt}>{tr('Aucune analyse d’existant disponible.', 'No market analysis available.')}</Text>
                ) : (
                  analyse.existantes.map((e, i) => {
                    const v = VERDICT_LIB[e.verdict] ?? VERDICT_LIB.partiellement;
                    return (
                      <Pressable
                        key={i}
                        onPress={() => {
                          const uc = tous.find((u) => u.id === e.id);
                          if (uc) setDetail(uc);
                        }}
                        style={styles.existant}
                      >
                        <View style={styles.simTop}>
                          <Text style={styles.existantTitre} numberOfLines={1}>{e.titre}</Text>
                          <Etiquette texte={tr(v.fr, v.en)} couleur={v.couleur} />
                        </View>
                        {!!e.acteurs.length && (
                          <Text style={styles.acteurs}>{tr('Existe déjà : ', 'Already exists: ')}{e.acteurs.join(', ')}</Text>
                        )}
                        <Text style={styles.txt}>{e.explication}</Text>
                      </Pressable>
                    );
                  })
                )}
              </View>
            )}
          </Carte>
        )}

        {/* Doublons potentiels */}
        {paires.length > 0 && (
          <Carte style={{ gap: spacing.sm, borderColor: colors.warn + '66' }}>
            <Text style={styles.h}>{tr(
              `⚠️ ${paires.length} paire${paires.length > 1 ? 's' : ''} d’idées quasi-similaires`,
              `⚠️ ${paires.length} pair${paires.length > 1 ? 's' : ''} of near-similar ideas`
            )}</Text>
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
            <Text style={[styles.filtreTxt, !domaineActif && styles.filtreTxtActif]}>{tr('Tous', 'All')}</Text>
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
          <Text style={styles.vide}>{tr('La banque se remplit au fur et à mesure des cadrages clients.', 'The bank fills up as client scoping sessions happen.')}</Text>
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
                  {uc.client?.secteur && <Etiquette texte={tr(`client: ${uc.client.secteur}`, `client: ${uc.client.secteur}`)} />}
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
  content: { padding: spacing.lg, paddingBottom: spacing.xxl, gap: spacing.md },
  intro: { color: colors.textMuted, fontSize: font.small },
  h: { color: colors.text, fontSize: font.body, fontWeight: '800' },
  erreur: { color: colors.danger, fontSize: font.small, lineHeight: 19 },
  analyseLoad: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, paddingVertical: spacing.sm },
  sousSection: { color: colors.text, fontSize: font.small, fontWeight: '800', marginTop: spacing.xs },
  licorne: {
    backgroundColor: colors.primarySoft,
    borderColor: colors.primary + '44',
    borderWidth: 1,
    borderRadius: radius.md,
    padding: spacing.md,
    gap: 4,
  },
  licorneTitre: { color: colors.text, fontSize: font.small, fontWeight: '800', flex: 1 },
  licornePot: { color: colors.primary, fontSize: font.tiny, fontWeight: '800' },
  marche: { color: colors.textMuted, fontSize: font.tiny, fontStyle: 'italic', lineHeight: 16 },
  existant: {
    backgroundColor: colors.surfaceAlt,
    borderRadius: radius.md,
    padding: spacing.md,
    gap: 4,
  },
  existantTitre: { color: colors.text, fontSize: font.small, fontWeight: '700', flex: 1 },
  acteurs: { color: colors.warn, fontSize: font.tiny, fontWeight: '700', lineHeight: 16 },
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
