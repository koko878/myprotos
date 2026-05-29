import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, SafeAreaView, ScrollView, StyleSheet, Text, View } from 'react-native';
import { genererPrototypeHtml } from '../cadrageAssistant';
import HtmlPreview from '../components/HtmlPreview';
import { Bouton, Carte } from '../components/ui';
import { iaDisponible } from '../llm';
import { useNav } from '../navigation';
import { enregistrerPrototype, trouverUseCase } from '../storage';
import { colors, font, radius, spacing } from '../theme';
import { UseCase } from '../types';

export default function AdminDetailScreen({ useCaseId }: { useCaseId: string }) {
  const { retour } = useNav();
  const [uc, setUc] = useState<UseCase | null>(null);
  const [loading, setLoading] = useState(false);
  const [erreur, setErreur] = useState<string | null>(null);

  useEffect(() => {
    trouverUseCase(useCaseId).then((u) => setUc(u ?? null));
  }, [useCaseId]);

  async function generer() {
    if (!uc || loading) return;
    setErreur(null);
    if (!iaDisponible()) {
      setErreur('Aucun fournisseur IA configuré : impossible de générer le prototype.');
      return;
    }
    setLoading(true);
    const html = await genererPrototypeHtml(uc);
    setLoading(false);
    if (!html) {
      setErreur('La génération a échoué (IA surchargée ou réponse invalide). Réessayez.');
      return;
    }
    const liste = await enregistrerPrototype(useCaseId, html);
    setUc(liste.find((u) => u.id === useCaseId) ?? null);
  }

  if (!uc) {
    return (
      <SafeAreaView style={styles.safe}>
        <Text style={styles.chargement}>Chargement…</Text>
      </SafeAreaView>
    );
  }

  const remarques = uc.remarques ?? [];
  const enRevision = uc.statut === 'revision_demandee';
  const aGenerer = uc.statut === 'soumis' || enRevision;
  const dejaGenere = !!uc.prototypeHtml;

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.header}>
        <Pressable onPress={retour} hitSlop={12}>
          <Text style={styles.retour}>‹ Admin</Text>
        </Pressable>
        <Text style={styles.headerTitre} numberOfLines={1}>{uc.titre}</Text>
        <View style={{ width: 70 }} />
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        {/* Brief métier condensé pour l'admin */}
        <Carte style={{ gap: spacing.sm }}>
          <Text style={styles.h}>Brief</Text>
          <Ligne label="Domaine" v={uc.domaine} />
          <Ligne label="Problème" v={uc.probleme} />
          <Ligne label="Objectif" v={uc.objectif} />
          <Ligne label="Approche" v={uc.approcheSuggeree} />
          {uc.spec && <Ligne label="Prototype" v={uc.spec.resume} />}
        </Carte>

        {/* Remarques du client (révisions) */}
        {remarques.length > 0 && (
          <Carte style={{ gap: spacing.sm, borderColor: colors.warn + '66' }}>
            <Text style={styles.h}>📝 Remarques du client ({remarques.length})</Text>
            {remarques.map((r) => (
              <View key={r.id} style={styles.remarque}>
                <Text style={styles.remarqueTxt}>“{r.texte}”</Text>
                <Text style={styles.remarqueMeta}>sur version {r.versionPrototype}</Text>
              </View>
            ))}
          </Carte>
        )}

        {/* Génération */}
        <Carte style={{ gap: spacing.md }}>
          <Text style={styles.h}>Génération du prototype HTML</Text>
          <Text style={styles.sub}>
            {dejaGenere
              ? `Version actuelle : v${uc.prototypeVersion ?? 1}. ${enRevision ? 'Le client a demandé des changements.' : 'En attente de validation client.'}`
              : 'Le client a soumis ce projet. Générez le prototype à lui présenter.'}
          </Text>

          {erreur && <Text style={styles.erreur}>⚠️ {erreur}</Text>}

          {loading ? (
            <View style={styles.loadingBox}>
              <ActivityIndicator color={colors.primary} />
              <Text style={styles.loadingTxt}>L’IA génère le prototype… (10-30 s)</Text>
            </View>
          ) : (
            <Bouton
              titre={
                aGenerer
                  ? dejaGenere
                    ? '♻️ Régénérer en intégrant les remarques'
                    : '⚙️ Générer le prototype HTML'
                  : '♻️ Régénérer le prototype'
              }
              onPress={generer}
            />
          )}
        </Carte>

        {/* Aperçu admin du prototype généré */}
        {dejaGenere && (
          <Carte style={{ gap: spacing.sm }}>
            <Text style={styles.h}>Aperçu (v{uc.prototypeVersion ?? 1})</Text>
            <View style={styles.preview}>
              <HtmlPreview html={uc.prototypeHtml!} />
            </View>
          </Carte>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

function Ligne({ label, v }: { label: string; v: string }) {
  return (
    <View>
      <Text style={styles.ligneLabel}>{label}</Text>
      <Text style={styles.ligneVal}>{v || '—'}</Text>
    </View>
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
  content: { padding: spacing.lg, paddingBottom: spacing.xxl, gap: spacing.lg },
  h: { color: colors.text, fontSize: font.h3, fontWeight: '800' },
  sub: { color: colors.textMuted, fontSize: font.small, lineHeight: 20 },
  ligneLabel: { color: colors.textMuted, fontSize: font.tiny, fontWeight: '700', textTransform: 'uppercase' },
  ligneVal: { color: colors.text, fontSize: font.small, lineHeight: 20 },
  remarque: { backgroundColor: colors.surfaceAlt, borderRadius: radius.md, padding: spacing.md },
  remarqueTxt: { color: colors.text, fontSize: font.small, fontStyle: 'italic', lineHeight: 20 },
  remarqueMeta: { color: colors.textMuted, fontSize: font.tiny, marginTop: 4 },
  erreur: { color: colors.danger, fontSize: font.small, lineHeight: 19 },
  loadingBox: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, paddingVertical: spacing.sm },
  loadingTxt: { color: colors.textMuted, fontSize: font.small },
  preview: { height: 480, borderRadius: radius.md, overflow: 'hidden', backgroundColor: '#fff' },
  chargement: { color: colors.textMuted, textAlign: 'center', marginTop: 100 },
});
