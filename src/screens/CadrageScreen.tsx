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
  synthetiserUseCase,
} from '../cadrageAssistant';
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

export default function CadrageScreen() {
  const { aller, retour } = useNav();
  const [messages, setMessages] = useState<Message[]>([]);
  const [saisie, setSaisie] = useState('');
  const [indexEtape, setIndexEtape] = useState(0);
  const [reponses, setReponses] = useState<CadrageReponses>({ ...VIDE });
  const [termine, setTermine] = useState(false);
  const scrollRef = useRef<ScrollView>(null);

  // Premier message de l'assistant.
  useEffect(() => {
    poserQuestion(0, [
      {
        id: uid(),
        role: 'assistant',
        texte:
          'Bonjour 👋 Je suis votre assistant de cadrage. On va transformer votre idée en use case clair en quelques questions.',
      },
    ]);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function poserQuestion(idx: number, base: Message[]) {
    const etape = ETAPES[idx];
    setMessages([
      ...base,
      { id: uid(), role: 'assistant', texte: etape.question, suggestions: etape.suggestions },
    ]);
  }

  useEffect(() => {
    scrollRef.current?.scrollToEnd({ animated: true });
  }, [messages]);

  function envoyer(texteBrut: string) {
    const texte = texteBrut.trim();
    if (!texte || termine) return;

    const etape = ETAPES[indexEtape];
    const nouvellesReponses = { ...reponses, [etape.cle]: texte };
    setReponses(nouvellesReponses);
    setSaisie('');

    const apresUser: Message[] = [
      ...messages,
      { id: uid(), role: 'user', texte },
      { id: uid(), role: 'assistant', texte: reactionAssistant(etape, texte) },
    ];

    const suivant = indexEtape + 1;
    if (suivant < ETAPES.length) {
      const etapeSuiv = ETAPES[suivant];
      setMessages([
        ...apresUser,
        {
          id: uid(),
          role: 'assistant',
          texte: etapeSuiv.question,
          suggestions: etapeSuiv.suggestions,
        },
      ]);
      setIndexEtape(suivant);
    } else {
      // Fin du parcours : on synthétise et on propose un récap.
      setMessages([
        ...apresUser,
        {
          id: uid(),
          role: 'assistant',
          texte:
            'Votre use case est prêt ✅ J’ai estimé le domaine, les KPIs, la complexité et un budget indicatif. Voyons le récapitulatif.',
        },
      ]);
      setTermine(true);
      const uc = synthetiserUseCase(nouvellesReponses);
      ajouterUseCase(uc).then(() => {
        setTimeout(() => aller({ nom: 'recap', useCaseId: uc.id }), 600);
      });
    }
  }

  const etapeCourante = ETAPES[Math.min(indexEtape, ETAPES.length - 1)];

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.header}>
        <Pressable onPress={retour} hitSlop={12}>
          <Text style={styles.retour}>‹ Retour</Text>
        </Pressable>
        <Text style={styles.headerTitre}>Cadrage assisté</Text>
        <Text style={styles.progres}>
          {Math.min(indexEtape + 1, ETAPES.length)}/{ETAPES.length}
        </Text>
      </View>
      <View style={styles.progressBarBg}>
        <View
          style={[
            styles.progressBarFill,
            { width: `${(Math.min(indexEtape, ETAPES.length) / ETAPES.length) * 100}%` },
          ]}
        />
      </View>

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView ref={scrollRef} contentContainerStyle={styles.chat}>
          {messages.map((m) => (
            <Bulle key={m.id} message={m} onSuggestion={envoyer} actif={!termine} />
          ))}
        </ScrollView>

        {!termine && (
          <View style={styles.saisieZone}>
            <TextInput
              style={styles.input}
              placeholder={etapeCourante?.question.includes('phrase') ? 'Votre idée…' : 'Votre réponse…'}
              placeholderTextColor={colors.textMuted}
              value={saisie}
              onChangeText={setSaisie}
              multiline
              onSubmitEditing={() => envoyer(saisie)}
            />
            <Pressable
              style={[styles.envoyer, !saisie.trim() && { opacity: 0.4 }]}
              onPress={() => envoyer(saisie)}
              disabled={!saisie.trim()}
            >
              <Text style={styles.envoyerTxt}>↑</Text>
            </Pressable>
          </View>
        )}
      </KeyboardAvoidingView>
    </SafeAreaView>
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
      <View
        style={[
          styles.bulle,
          estUser ? styles.bulleUser : styles.bulleAssistant,
        ]}
      >
        <Text style={[styles.bulleTexte, estUser && { color: '#fff' }]}>{message.texte}</Text>
      </View>
      {!estUser && actif && message.suggestions && (
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
  progres: { color: colors.textMuted, fontSize: font.small, width: 70, textAlign: 'right' },
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
  bulleUser: {
    backgroundColor: colors.bubbleUser,
    alignSelf: 'flex-end',
    borderTopRightRadius: 4,
  },
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
