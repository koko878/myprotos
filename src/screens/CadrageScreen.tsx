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
import {
  CadrageReponses,
  ETAPES,
  reactionAssistant,
  synthetiserUseCaseIA,
  tourCadrageIA,
} from '../cadrageAssistant';
import { iaDisponible } from '../llm';
import { useNav } from '../navigation';
import { ajouterUseCase } from '../storage';
import { colors, font, radius, spacing } from '../theme';
import { Message } from '../types';

const VIDE: CadrageReponses = {
  idee: '',
  probleme: '',
  objectif: '',
  donnees: '',
  utilisateurs: '',
  contraintes: '',
};

let compteur = 0;
const uid = () => `m_${Date.now()}_${compteur++}`;

// Message d'ouverture (identique dans les deux modes : l'IA prend la main ensuite).
const OUVERTURE: Message[] = [
  {
    id: uid(),
    role: 'assistant',
    texte:
      'Bonjour 👋 Je suis votre assistant de cadrage. On va transformer votre idée en use case clair en quelques questions.',
  },
  {
    id: uid(),
    role: 'assistant',
    texte: ETAPES[0].question,
    suggestions: ETAPES[0].suggestions,
  },
];

export default function CadrageScreen() {
  const { aller, retour } = useNav();
  const modeIA = useRef(iaDisponible()).current;

  const [messages, setMessages] = useState<Message[]>(OUVERTURE);
  const [saisie, setSaisie] = useState('');
  const [termine, setTermine] = useState(false);
  const [loading, setLoading] = useState(false); // attente IA
  // Si l'IA échoue (ex: 503 surcharge), on mémorise le contexte à rejouer pour
  // proposer un bouton « Réessayer » plutôt qu'un cul-de-sac.
  const [echec, setEchec] = useState<{ texte: string; base: Message[] } | null>(null);
  const verrou = useRef(false); // empêche les envois concurrents pendant un tour IA
  const scrollRef = useRef<ScrollView>(null);

  // État du mode scripté (utilisé seulement si pas d'IA).
  const [indexEtape, setIndexEtape] = useState(0);
  const [reponses, setReponses] = useState<CadrageReponses>({ ...VIDE });

  useEffect(() => {
    scrollRef.current?.scrollToEnd({ animated: true });
  }, [messages, loading]);

  function finaliser(uc: import('../types').UseCase) {
    setTermine(true);
    ajouterUseCase(uc).then(() => aller({ nom: 'recap', useCaseId: uc.id }));
  }

  async function envoyerIA(texte: string, base: Message[]) {
    setEchec(null);
    setLoading(true);
    const nbUser = base.filter((m) => m.role === 'user').length;
    const tour = await tourCadrageIA(base, nbUser >= 6);
    setLoading(false);

    if (!tour) {
      // Échec temporaire (souvent surcharge Gemini) : on mémorise le contexte
      // pour proposer « Réessayer », sans perdre la conversation.
      setEchec({ texte, base });
      return;
    }

    if (tour.done && tour.useCase) {
      setMessages([...base, { id: uid(), role: 'assistant', texte: tour.reply }]);
      finaliser(tour.useCase);
      return;
    }

    setMessages([
      ...base,
      { id: uid(), role: 'assistant', texte: tour.reply, suggestions: tour.suggestions },
    ]);
  }

  function reessayer() {
    if (!echec || loading || verrou.current) return;
    const { texte, base } = echec;
    setEchec(null);
    verrou.current = true;
    envoyerIA(texte, base).finally(() => {
      verrou.current = false;
    });
  }

  function envoyerScript(texte: string, base: Message[]) {
    const etape = ETAPES[indexEtape];
    const nouvellesReponses = { ...reponses, [etape.cle]: texte };
    setReponses(nouvellesReponses);

    const apresUser: Message[] = [
      ...base,
      { id: uid(), role: 'assistant', texte: reactionAssistant(etape, texte) },
    ];

    const suivant = indexEtape + 1;
    if (suivant < ETAPES.length) {
      const etapeSuiv = ETAPES[suivant];
      setMessages([
        ...apresUser,
        { id: uid(), role: 'assistant', texte: etapeSuiv.question, suggestions: etapeSuiv.suggestions },
      ]);
      setIndexEtape(suivant);
    } else {
      setMessages([
        ...apresUser,
        { id: uid(), role: 'assistant', texte: '⏳ Je structure votre use case…' },
      ]);
      setTermine(true);
      synthetiserUseCaseIA(nouvellesReponses).then((uc) =>
        ajouterUseCase(uc).then(() => aller({ nom: 'recap', useCaseId: uc.id }))
      );
    }
  }

  function envoyer(texteBrut: string) {
    const texte = texteBrut.trim();
    if (!texte || termine || loading || verrou.current) return;
    setSaisie('');
    const base: Message[] = [...messages, { id: uid(), role: 'user', texte }];
    setMessages(base);
    if (modeIA) {
      verrou.current = true;
      envoyerIA(texte, base).finally(() => {
        verrou.current = false;
      });
    } else {
      envoyerScript(texte, base);
    }
  }

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.header}>
        <Pressable onPress={retour} hitSlop={12}>
          <Text style={styles.retour}>‹ Retour</Text>
        </Pressable>
        <Text style={styles.headerTitre}>Cadrage assisté</Text>
        <Text style={styles.badge}>{modeIA ? '✨ IA' : `${Math.min(indexEtape + 1, ETAPES.length)}/${ETAPES.length}`}</Text>
      </View>
      <View style={styles.progressBarBg}>
        <View
          style={[
            styles.progressBarFill,
            {
              width: modeIA
                ? `${Math.min((messages.filter((m) => m.role === 'user').length / 6) * 100, 100)}%`
                : `${(Math.min(indexEtape, ETAPES.length) / ETAPES.length) * 100}%`,
            },
          ]}
        />
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

        {!termine && (
          <View style={styles.saisieZone}>
            <TextInput
              style={styles.input}
              placeholder={loading ? 'L’assistant réfléchit…' : 'Votre réponse…'}
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
  headerTitre: { color: colors.text, fontSize: font.h3, fontWeight: '800' },
  badge: { color: colors.textMuted, fontSize: font.small, width: 70, textAlign: 'right', fontWeight: '700' },
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
});
