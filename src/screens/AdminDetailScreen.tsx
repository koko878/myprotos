import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Platform, Pressable, SafeAreaView, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { backendDisponible, genererPrototypeHtml } from '../cadrageAssistant';
import HtmlPreview from '../components/HtmlPreview';
import { Bouton, Carte } from '../components/ui';
import { lireFichierTexte, telechargerDossierProjet } from '../fichiers';
import { iaDisponible } from '../llm';
import { useNav } from '../navigation';
import { deposerPrototypeHtml, enregistrerPrototype, trouverUseCase } from '../storage';
import { colors, font, radius, spacing } from '../theme';
import { UseCase } from '../types';

export default function AdminDetailScreen({ useCaseId }: { useCaseId: string }) {
  const { retour } = useNav();
  const [uc, setUc] = useState<UseCase | null>(null);
  const [loading, setLoading] = useState(false);
  const [erreur, setErreur] = useState<string | null>(null);
  // Quel moteur a produit le dernier prototype + diag si Claude a échoué.
  const [moteur, setMoteur] = useState<'claude' | 'gemini' | null>(null);
  const [diag, setDiag] = useState<string | null>(null);
  // Mode manuel : dépôt du HTML généré hors-app.
  const [htmlColle, setHtmlColle] = useState('');
  const [colleVisible, setColleVisible] = useState(false);
  const [autoVisible, setAutoVisible] = useState(false); // génération auto repliée

  useEffect(() => {
    trouverUseCase(useCaseId).then((u) => setUc(u ?? null));
  }, [useCaseId]);

  async function telecharger() {
    if (uc) telechargerDossierProjet(uc);
  }

  async function deposer() {
    const html = htmlColle.trim();
    if (!html) return;
    if (!/<html[\s>]/i.test(html) && !/<!doctype html/i.test(html)) {
      setErreur('Le contenu collé ne ressemble pas à un document HTML (balise <html> manquante).');
      return;
    }
    setErreur(null);
    const liste = await deposerPrototypeHtml(useCaseId, html);
    setUc(liste.find((u) => u.id === useCaseId) ?? null);
    setHtmlColle('');
    setMoteur('claude'); // déposé manuellement = qualité Claude (généré ici)
    setDiag(null);
  }

  async function generer() {
    if (!uc || loading) return;
    setErreur(null);
    setMoteur(null);
    setDiag(null);
    if (!iaDisponible() && !backendDisponible()) {
      setErreur('Aucun moteur de génération configuré (backend ou IA).');
      return;
    }
    setLoading(true);
    const res = await genererPrototypeHtml(uc);
    setLoading(false);
    if (!res) {
      setErreur('La génération a échoué (moteur indisponible ou réponse invalide). Réessayez.');
      return;
    }
    setMoteur(res.moteur);
    if (res.moteur === 'gemini' && res.backendErreur) {
      // Important : on voulait Claude mais le backend a échoué -> on l'affiche.
      setDiag('Backend Claude indisponible (' + res.backendErreur + ') → repli Gemini.');
    }
    const liste = await enregistrerPrototype(useCaseId, res.html);
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

        {/* Pièces jointes fournies par le client */}
        {(uc.piecesJointes?.length ?? 0) > 0 && (
          <Carte style={{ gap: spacing.sm }}>
            <Text style={styles.h}>📎 Pièces jointes ({uc.piecesJointes!.length})</Text>
            {uc.piecesJointes!.map((p) => (
              <Text key={p.id} style={styles.pj}>• {p.nom} <Text style={styles.pjType}>({p.type})</Text></Text>
            ))}
            <Text style={styles.sub}>Incluses dans le ZIP ci-dessous.</Text>
          </Carte>
        )}

        {/* MODE MANUEL (principal) : dossier ZIP -> génération ici -> dépôt HTML */}
        <Carte style={{ gap: spacing.md }}>
          <Text style={styles.h}>Prototype — workflow</Text>
          <Text style={styles.sub}>
            {dejaGenere
              ? `Version actuelle : v${uc.prototypeVersion ?? 1}. ${enRevision ? 'Le client a demandé des changements.' : 'En attente de validation client.'}`
              : 'Téléchargez le dossier, faites générer le prototype, puis collez le HTML ici.'}
          </Text>

          <View style={styles.etapeNum}><Text style={styles.etapeNumTxt}>1</Text><Text style={styles.etapeTxt}>Télécharger le prompt (+ pièces jointes) à passer à l’agent de code</Text></View>
          <Bouton titre="⬇️ Télécharger le prompt + fichiers" variante="secondaire" onPress={telecharger} />

          <View style={styles.etapeNum}><Text style={styles.etapeNumTxt}>2</Text><Text style={styles.etapeTxt}>Générer le prototype, puis déposer le fichier HTML obtenu :</Text></View>
          {erreur && <Text style={styles.erreur}>⚠️ {erreur}</Text>}

          {/* Méthode principale : upload d'un fichier .html */}
          <Bouton titre="📄 Importer un fichier .html" onPress={uploader} />

          {/* Méthode de secours : coller le code */}
          <Pressable onPress={() => setColleVisible((v) => !v)} hitSlop={6} style={styles.toggleColle}>
            <Text style={styles.toggleColleTxt}>{colleVisible ? '▾ ' : '▸ '}ou coller le code HTML</Text>
          </Pressable>
          {colleVisible && (
            <>
              <TextInput
                style={styles.htmlInput}
                value={htmlColle}
                onChangeText={setHtmlColle}
                multiline
                placeholder="<!DOCTYPE html> … </html>"
                placeholderTextColor={colors.textMuted}
              />
              <Bouton titre="✅ Déposer le code collé" variante="secondaire" onPress={deposer} />
            </>
          )}
        </Carte>

        {/* GÉNÉRATION AUTO (option repliée) */}
        <Carte style={{ gap: spacing.md }}>
          <Pressable onPress={() => setAutoVisible((v) => !v)}>
            <Text style={styles.h}>{autoVisible ? '▾' : '▸'} Génération automatique (option)</Text>
          </Pressable>
          {autoVisible && (
            <>
              <Text style={styles.sub}>
                Génère directement via l’IA (backend Claude si dispo, sinon Gemini). Moins fiable
                que le workflow manuel ci-dessus.
              </Text>
              {moteur && (
                <Text style={[styles.moteur, { color: moteur === 'claude' ? colors.success : colors.warn }]}>
                  {moteur === 'claude' ? '✨ Généré par Claude' : '⚡ Généré par Gemini (repli)'}
                </Text>
              )}
              {diag && <Text style={styles.diag}>ℹ️ {diag}</Text>}
              {loading ? (
                <View style={styles.loadingBox}>
                  <ActivityIndicator color={colors.primary} />
                  <Text style={styles.loadingTxt}>Génération en cours… (jusqu’à 2 min)</Text>
                </View>
              ) : (
                <Bouton titre="⚙️ Générer automatiquement" variante="secondaire" onPress={generer} />
              )}
            </>
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
  moteur: { fontSize: font.small, fontWeight: '800' },
  diag: { color: colors.textMuted, fontSize: font.tiny, lineHeight: 16, fontStyle: 'italic' },
  loadingBox: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, paddingVertical: spacing.sm },
  loadingTxt: { color: colors.textMuted, fontSize: font.small },
  preview: { height: 480, borderRadius: radius.md, overflow: 'hidden', backgroundColor: '#fff' },
  chargement: { color: colors.textMuted, textAlign: 'center', marginTop: 100 },
  pj: { color: colors.text, fontSize: font.small, lineHeight: 20 },
  pjType: { color: colors.textMuted, fontSize: font.tiny },
  etapeNum: { flexDirection: 'row', gap: spacing.sm, alignItems: 'flex-start' },
  etapeNumTxt: {
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
  etapeTxt: { color: colors.text, fontSize: font.small, flex: 1, lineHeight: 20 },
  htmlInput: {
    minHeight: 120,
    maxHeight: 220,
    color: colors.text,
    fontSize: font.small,
    backgroundColor: '#0A0E18',
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    textAlignVertical: 'top',
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
  },
  toggleColle: { paddingVertical: spacing.xs },
  toggleColleTxt: { color: colors.textMuted, fontSize: font.small, fontWeight: '600' },
});
