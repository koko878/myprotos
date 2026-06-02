import React, { useEffect, useRef, useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { lireFichierTexte } from '../fichiers';
import { useNav } from '../navigation';
import { colors, font, radius, spacing } from '../theme';
import { Message } from '../types';
import { demarrerDictee, dicteeDisponible, SessionDictee } from '../voix';

let compteur = 0;
export const uidMessage = () => `m_${Date.now()}_${compteur++}`;

// Résultat d'un tour : soit l'IA continue (messages mis à jour), soit elle a
// terminé (done). `null` => échec transitoire (bouton Réessayer).
export interface ResultatTour {
  reply: string;
  suggestions: string[];
  done: boolean;
}

export interface ChatIAProps {
  titre: string;
  ouverture: Message[]; // bulles initiales de l'assistant
  // Joue un tour : reçoit l'historique complet, renvoie le résultat ou null.
  jouerTour: (historique: Message[]) => Promise<ResultatTour | null>;
  // Appelé quand l'IA conclut (done=true) ; reçoit l'historique final.
  onTermine: (historique: Message[]) => void;
  // Progression affichée (0..1), calculée par le parent depuis le nb de tours.
  progression?: (historique: Message[]) => number;
  // Si vrai pour l'historique courant, ChatIA relance automatiquement un tour
  // (sans attendre l'utilisateur) — utile quand l'IA annonce la conclusion mais
  // n'a pas encore produit le résultat structuré.
  relanceAuto?: (historique: Message[]) => boolean;
  // Active le partage de documents (texte) avec l'IA pendant l'échange.
  partageDocs?: boolean;
}

/**
 * Conteneur de conversation IA réutilisable (cadrage métier, cadrage technique).
 * Gère l'UI chat, l'état d'attente, le verrou anti-double-envoi et le repli
 * « Réessayer » en cas d'échec transitoire.
 */
export default function ChatIA({ titre, ouverture, jouerTour, onTermine, progression, relanceAuto, partageDocs }: ChatIAProps) {
  const { retour, aller } = useNav();
  const [messages, setMessages] = useState<Message[]>(ouverture);
  const [saisie, setSaisie] = useState('');
  const [termine, setTermine] = useState(false);
  const [loading, setLoading] = useState(false);
  const [echec, setEchec] = useState<{ base: Message[] } | null>(null);
  const [dictee, setDictee] = useState(false); // micro actif
  const verrou = useRef(false);
  const relances = useRef(0); // garde-fou anti-boucle de relance auto
  const scrollRef = useRef<ScrollView>(null);
  const sessionDictee = useRef<SessionDictee | null>(null);
  const baseSaisie = useRef(''); // texte déjà saisi avant la dictée en cours

  useEffect(() => {
    scrollRef.current?.scrollToEnd({ animated: true });
  }, [messages, loading]);

  // Arrête proprement la dictée au démontage.
  useEffect(() => () => sessionDictee.current?.stop(), []);

  // Démarre/arrête la dictée vocale (web). Le texte reconnu s'ajoute à la saisie.
  function basculerDictee() {
    if (dictee) {
      sessionDictee.current?.stop();
      return;
    }
    // Texte déjà saisi AVANT la dictée : la transcription (toujours complète,
    // cf. voix.ts) lui est simplement ajoutée. On REMPLACE la saisie à chaque
    // résultat (jamais d'accumulation) -> plus de mots en double/triple.
    baseSaisie.current = saisie ? saisie + ' ' : '';
    const session = demarrerDictee(
      (texte) => {
        setSaisie((baseSaisie.current + texte).trimStart());
      },
      () => {
        setDictee(false);
        sessionDictee.current = null;
      }
    );
    if (session) {
      sessionDictee.current = session;
      setDictee(true);
    }
  }

  async function tour(base: Message[]) {
    setEchec(null);
    setLoading(true);
    let res: ResultatTour | null = null;
    try {
      res = await jouerTour(base);
    } catch {
      // Toute erreur inattendue = échec récupérable. On ne laisse JAMAIS le
      // spinner bloqué : setLoading(false) est garanti par le finally.
      res = null;
    } finally {
      setLoading(false);
    }

    if (!res) {
      setEchec({ base });
      return;
    }
    if (res.done) {
      const final = [...base, { id: uidMessage(), role: 'assistant' as const, texte: res.reply }];
      setMessages(final);
      setTermine(true);
      onTermine(final);
      return;
    }
    const suite = [
      ...base,
      { id: uidMessage(), role: 'assistant' as const, texte: res.reply, suggestions: res.suggestions },
    ];
    setMessages(suite);
    // L'IA a répondu sans conclure : si elle est en train de conclure (ex.
    // "je résume votre cas…"), on relance automatiquement un tour pour obtenir
    // le résultat structuré, sans bloquer en attente de l'utilisateur.
    if (relanceAuto && relances.current < 2 && relanceAuto(suite)) {
      relances.current += 1;
      verrou.current = true;
      tour(suite).finally(() => {
        verrou.current = false;
      });
    }
  }

  function lancer(base: Message[]) {
    verrou.current = true;
    tour(base).finally(() => {
      verrou.current = false;
    });
  }

  function envoyer(texteBrut: string) {
    const texte = texteBrut.trim();
    if (!texte || termine || loading || verrou.current) return;
    sessionDictee.current?.stop(); // coupe le micro à l'envoi
    relances.current = 0; // nouvelle entrée utilisateur -> réautorise la relance auto
    setSaisie('');
    const base: Message[] = [...messages, { id: uidMessage(), role: 'user', texte }];
    setMessages(base);
    lancer(base);
  }

  // Partage d'un document texte (.txt/.md/.csv/.json…) : son contenu est ajouté
  // comme message utilisateur (préfixé) pour que l'IA s'appuie dessus.
  async function joindreDoc() {
    if (termine || loading || verrou.current) return;
    const f = await lireFichierTexte('.txt,.md,.csv,.json,.html,text/*');
    if (!f) return;
    // On borne la taille pour ne pas saturer le contexte du modèle.
    const MAX = 20000;
    const contenu = f.contenu.length > MAX
      ? f.contenu.slice(0, MAX) + '\n…[document tronqué]'
      : f.contenu;
    const texte = `[Document partagé « ${f.nom} »]\n${contenu}`;
    relances.current = 0;
    const base: Message[] = [
      ...messages,
      { id: uidMessage(), role: 'user', texte },
    ];
    setMessages(base);
    lancer(base);
  }

  function reessayer() {
    if (!echec || loading || verrou.current) return;
    const { base } = echec;
    setEchec(null);
    lancer(base);
  }

  const prog = progression ? progression(messages) : 0;

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.header}>
        <Pressable onPress={retour} hitSlop={12}>
          <Text style={styles.retour}>‹ Retour</Text>
        </Pressable>
        <Text style={styles.headerTitre} numberOfLines={1}>{titre}</Text>
        <Pressable onPress={() => aller({ nom: 'home' })} hitSlop={12}>
          <Text style={styles.accueil}>🏠 Accueil</Text>
        </Pressable>
      </View>
      <View style={styles.progressBarBg}>
        <View style={[styles.progressBarFill, { width: `${Math.min(prog * 100, 100)}%` }]} />
      </View>

      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView ref={scrollRef} contentContainerStyle={styles.chat}>
          {messages.map((m) => (
            <Bulle key={m.id} message={m} onSuggestion={envoyer} actif={!termine && !loading} />
          ))}
          {loading && <Typing />}
          {echec && !loading && (
            <View style={styles.echecBox}>
              <Text style={styles.echecTxt}>
                ⚠️ L’IA est momentanément surchargée. Votre conversation est intacte.
              </Text>
              <Pressable style={styles.reessayer} onPress={reessayer}>
                <Text style={styles.reessayerTxt}>↻ Réessayer</Text>
              </Pressable>
            </View>
          )}
        </ScrollView>

        {!termine && partageDocs && (
          <Pressable onPress={joindreDoc} disabled={loading} style={styles.joindreDoc}>
            <Text style={styles.joindreDocTxt}>📎 Partager un document pour affiner mon besoin</Text>
          </Pressable>
        )}
        {!termine && (
          <View style={styles.saisieZone}>
            {dicteeDisponible() && (
              <Pressable
                style={[styles.micro, dictee && styles.microActif]}
                onPress={basculerDictee}
                disabled={loading}
              >
                <Text style={styles.microTxt}>{dictee ? '⏺' : '🎤'}</Text>
              </Pressable>
            )}
            <TextInput
              style={styles.input}
              placeholder={
                dictee ? 'Parlez…' : loading ? 'L’assistant réfléchit…' : 'Votre réponse…'
              }
              placeholderTextColor={colors.textMuted}
              value={saisie}
              onChangeText={setSaisie}
              multiline
              editable={!loading}
              onSubmitEditing={() => envoyer(saisie)}
            />
            <Pressable
              style={[styles.envoyer, (!saisie.trim() || loading) && { opacity: 0.4 }]}
              onPress={() => envoyer(saisie)}
              disabled={!saisie.trim() || loading}
            >
              <Text style={styles.envoyerTxt}>↑</Text>
            </Pressable>
          </View>
        )}
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function Typing() {
  return (
    <View style={[styles.bulle, styles.bulleAssistant, { flexDirection: 'row', gap: 6, alignItems: 'center' }]}>
      <Text style={styles.bulleTexte}>✨ l’IA rédige</Text>
      <Text style={[styles.bulleTexte, { color: colors.accent }]}>…</Text>
    </View>
  );
}

function Bulle({
  message,
  onSuggestion,
  actif,
}: {
  message: Message;
  onSuggestion: (t: string) => void;
  actif: boolean;
}) {
  const estUser = message.role === 'user';
  return (
    <View style={{ marginBottom: spacing.md }}>
      <View style={[styles.bulle, estUser ? styles.bulleUser : styles.bulleAssistant]}>
        <Text style={[styles.bulleTexte, estUser && { color: '#fff' }]}>{message.texte}</Text>
      </View>
      {!estUser && actif && !!message.suggestions?.length && (
        <View style={styles.suggestions}>
          {message.suggestions.map((s) => (
            <Pressable key={s} style={styles.chip} onPress={() => onSuggestion(s)}>
              <Text style={styles.chipTxt}>{s}</Text>
            </Pressable>
          ))}
        </View>
      )}
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
  accueil: { color: colors.accent, fontSize: font.small, fontWeight: '700', width: 80, textAlign: 'right' },
  joindreDoc: {
    marginHorizontal: spacing.md,
    marginBottom: spacing.xs,
    paddingVertical: spacing.sm,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.primary + '55',
    backgroundColor: colors.primarySoft,
    alignItems: 'center',
  },
  joindreDocTxt: { color: colors.accent, fontSize: font.small, fontWeight: '700' },
  progressBarBg: { height: 3, backgroundColor: colors.surfaceAlt },
  progressBarFill: { height: 3, backgroundColor: colors.primary },
  chat: { padding: spacing.lg, paddingBottom: spacing.xl },
  bulle: { maxWidth: '85%', padding: spacing.md, borderRadius: radius.md },
  bulleAssistant: {
    backgroundColor: colors.bubbleAssistant,
    alignSelf: 'flex-start',
    borderTopLeftRadius: 4,
    borderWidth: 1,
    borderColor: colors.border,
  },
  bulleUser: { backgroundColor: colors.bubbleUser, alignSelf: 'flex-end', borderTopRightRadius: 4 },
  bulleTexte: { color: colors.text, fontSize: font.body, lineHeight: 21 },
  suggestions: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, marginTop: spacing.sm },
  chip: {
    backgroundColor: colors.surfaceAlt,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.pill,
    paddingHorizontal: spacing.md,
    paddingVertical: 8,
  },
  chipTxt: { color: colors.accent, fontSize: font.small },
  echecBox: {
    backgroundColor: colors.warn + '18',
    borderColor: colors.warn + '55',
    borderWidth: 1,
    borderRadius: radius.md,
    padding: spacing.md,
    gap: spacing.sm,
    alignItems: 'flex-start',
  },
  echecTxt: { color: colors.text, fontSize: font.small, lineHeight: 19 },
  reessayer: {
    backgroundColor: colors.primary,
    borderRadius: radius.pill,
    paddingHorizontal: spacing.lg,
    paddingVertical: 10,
  },
  reessayerTxt: { color: '#fff', fontWeight: '800', fontSize: font.small },
  saisieZone: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: spacing.sm,
    padding: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    backgroundColor: colors.surface,
  },
  input: {
    flex: 1,
    color: colors.text,
    fontSize: font.body,
    maxHeight: 120,
    backgroundColor: colors.surfaceAlt,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  envoyer: {
    width: 44,
    height: 44,
    borderRadius: radius.pill,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  envoyerTxt: { color: '#fff', fontSize: 22, fontWeight: '800' },
  micro: {
    width: 44,
    height: 44,
    borderRadius: radius.pill,
    backgroundColor: colors.surfaceAlt,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  microActif: { backgroundColor: colors.danger, borderColor: colors.danger },
  microTxt: { fontSize: 18 },
});
