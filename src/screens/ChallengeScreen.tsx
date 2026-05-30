import React, { useEffect, useRef, useState } from 'react';
import { SafeAreaView, ScrollView, StyleSheet, Text, View } from 'react-native';
import { tourChallengeIA } from '../cadrageAssistant';
import ChatIA, { ResultatTour, uidMessage } from '../components/ChatIA';
import { Bouton, Carte } from '../components/ui';
import { iaDisponible } from '../llm';
import { useNav } from '../navigation';
import { ajouterRemarques, trouverUseCase } from '../storage';
import { colors, font, radius, spacing } from '../theme';
import { Message, UseCase } from '../types';

// L'IA aide le client à transformer un retour vague sur le prototype en
// demandes d'amélioration claires et actionnables, puis on les envoie en révision.
export default function ChallengeScreen({ useCaseId }: { useCaseId: string }) {
  const { aller, retour } = useNav();
  const [uc, setUc] = useState<UseCase | null>(null);
  const [remarques, setRemarques] = useState<string[] | null>(null); // récap final
  const [envoye, setEnvoye] = useState(false);
  const dernieres = useRef<string[]>([]);

  useEffect(() => {
    trouverUseCase(useCaseId).then((u) => setUc(u ?? null));
  }, [useCaseId]);

  if (!uc) {
    return (
      <SafeAreaView style={styles.safe}>
        <Text style={styles.chargement}>Chargement…</Text>
      </SafeAreaView>
    );
  }

  // Sans IA : repli simple (champ libre via l'écran prototype).
  if (!iaDisponible()) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.centre}>
          <Text style={styles.titre}>Améliorer le prototype</Text>
          <Text style={styles.txt}>
            L’assistant n’est pas disponible pour le moment. Vous pouvez quand même laisser
            une remarque libre depuis l’écran du prototype.
          </Text>
          <Bouton titre="Retour au prototype" variante="secondaire" onPress={retour} />
        </View>
      </SafeAreaView>
    );
  }

  // Confirmation d'envoi.
  if (envoye) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.centre}>
          <Text style={styles.titre}>📝 Demandes envoyées</Text>
          <Text style={styles.txt}>
            Merci ! Notre équipe va retravailler le prototype en intégrant vos demandes. Vous
            serez notifié dès que la nouvelle version est prête.
          </Text>
          <Bouton titre="Voir mon projet" onPress={() => aller({ nom: 'detail', useCaseId })} />
        </View>
      </SafeAreaView>
    );
  }

  // Récapitulatif des remarques structurées avant envoi.
  if (remarques) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.header}>
          <Text style={styles.headerTitre}>Vos demandes d’amélioration</Text>
        </View>
        <ScrollView contentContainerStyle={styles.content}>
          <Text style={styles.intro}>
            Voici ce que j’ai retenu. Vous pouvez l’envoyer tel quel à notre équipe.
          </Text>
          <Carte style={{ gap: spacing.md }}>
            {remarques.map((r, i) => (
              <View key={i} style={styles.ligne}>
                <Text style={styles.num}>{i + 1}</Text>
                <Text style={styles.ligneTxt}>{r}</Text>
              </View>
            ))}
          </Carte>
        </ScrollView>
        <View style={styles.footer}>
          <Bouton
            titre="📨 Envoyer à l’équipe"
            onPress={async () => {
              await ajouterRemarques(useCaseId, remarques);
              setEnvoye(true);
            }}
          />
          <Bouton titre="Continuer à préciser" variante="secondaire" onPress={() => setRemarques(null)} />
        </View>
      </SafeAreaView>
    );
  }

  const contexte = `${uc.titre} — ${uc.probleme}. Objectif : ${uc.objectif}. Utilisateurs : ${uc.utilisateurs}.`;

  const ouverture: Message[] = [
    {
      id: uidMessage(),
      role: 'assistant',
      texte:
        'Vous voulez faire évoluer le prototype 👍 Dites-moi ce qui vous gêne ou ce qu’il manque — même vaguement, je vous aide à préciser.',
      suggestions: [
        'Le design ne correspond pas à mon image de marque',
        'Il manque une fonctionnalité',
        'Un écran n’est pas clair',
      ],
    },
  ];

  async function jouerTour(historique: Message[]): Promise<ResultatTour | null> {
    const nbUser = historique.filter((m) => m.role === 'user').length;
    const tour = await tourChallengeIA(contexte, historique, nbUser >= 4);
    if (!tour) return null;
    if (tour.done && tour.remarques?.length) dernieres.current = tour.remarques;
    return { reply: tour.reply, suggestions: tour.suggestions, done: tour.done };
  }

  function onTermine() {
    if (dernieres.current.length) setRemarques(dernieres.current);
    else aller({ nom: 'detail', useCaseId });
  }

  return (
    <ChatIA
      titre="Améliorer le prototype"
      ouverture={ouverture}
      jouerTour={jouerTour}
      onTermine={onTermine}
      progression={(h) => h.filter((m) => m.role === 'user').length / 4}
      relanceAuto={(h) => {
        const nbUser = h.filter((m) => m.role === 'user').length;
        const d = h[h.length - 1];
        return nbUser >= 4 && !!d && d.role === 'assistant' && !d.texte.includes('?');
      }}
    />
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  header: { paddingHorizontal: spacing.lg, paddingVertical: spacing.md },
  headerTitre: { color: colors.text, fontSize: font.h3, fontWeight: '800', textAlign: 'center' },
  content: { padding: spacing.lg, gap: spacing.md },
  intro: { color: colors.textMuted, fontSize: font.small, lineHeight: 20 },
  ligne: { flexDirection: 'row', gap: spacing.sm, alignItems: 'flex-start' },
  num: {
    color: '#fff',
    backgroundColor: colors.primary,
    width: 22,
    height: 22,
    borderRadius: 11,
    textAlign: 'center',
    lineHeight: 22,
    fontSize: font.small,
    fontWeight: '800',
    overflow: 'hidden',
  },
  ligneTxt: { color: colors.text, fontSize: font.body, lineHeight: 21, flex: 1 },
  footer: {
    padding: spacing.lg,
    gap: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    backgroundColor: colors.surface,
  },
  centre: { flex: 1, justifyContent: 'center', padding: spacing.xl, gap: spacing.lg },
  titre: { color: colors.text, fontSize: font.h2, fontWeight: '800' },
  txt: { color: colors.textMuted, fontSize: font.body, lineHeight: 22 },
  chargement: { color: colors.textMuted, textAlign: 'center', marginTop: 100 },
});
