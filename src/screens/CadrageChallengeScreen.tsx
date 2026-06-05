import React, { useEffect, useRef, useState } from 'react';
import { SafeAreaView, StyleSheet, Text } from 'react-native';
import { tourChallengeCadrageIA } from '../cadrageAssistant';
import ChatIA, { ResultatTour, uidMessage } from '../components/ChatIA';
import { useLang, useTr } from '../i18n';
import { iaDisponible } from '../llm';
import { useNav } from '../navigation';
import { appliquerCadrage, trouverUseCase } from '../storage';
import { colors, font } from '../theme';
import { Message, UseCase } from '../types';

// L'IA aide le client à challenger / affiner son cadrage métier ; on applique
// ensuite le use case mis à jour.
export default function CadrageChallengeScreen({ useCaseId }: { useCaseId: string }) {
  const { aller } = useNav();
  const { lang } = useLang();
  const tr = useTr();
  const [uc, setUc] = useState<UseCase | null>(null);
  const majFinale = useRef<UseCase | null>(null);

  useEffect(() => {
    trouverUseCase(useCaseId).then((u) => setUc(u ?? null));
  }, [useCaseId]);

  if (!uc) {
    return (
      <SafeAreaView style={styles.safe}>
        <Text style={styles.chargement}>{tr('Chargement…', 'Loading…')}</Text>
      </SafeAreaView>
    );
  }

  if (!iaDisponible()) {
    aller({ nom: 'recap', useCaseId });
    return null;
  }

  const courant = uc;
  const ouverture: Message[] = lang === 'en'
    ? [
        {
          id: uidMessage(),
          role: 'assistant',
          texte: `Let’s revisit your scoping “${courant.titre}”. What would you like to clarify or correct?`,
          suggestions: [
            'The problem isn’t quite that',
            'Change the objective / KPIs',
            'Clarify the users',
          ],
        },
      ]
    : [
        {
          id: uidMessage(),
          role: 'assistant',
          texte: `On reprend votre cadrage « ${courant.titre} ». Qu’aimeriez-vous préciser ou corriger ?`,
          suggestions: [
            'Le problème n’est pas tout à fait ça',
            'Changer l’objectif / les KPIs',
            'Préciser les utilisateurs',
          ],
        },
      ];

  async function jouerTour(historique: Message[]): Promise<ResultatTour | null> {
    const nbUser = historique.filter((m) => m.role === 'user').length;
    const tour = await tourChallengeCadrageIA(courant, historique, nbUser >= 4, lang);
    if (!tour) return null;
    if (tour.done && tour.useCase) majFinale.current = tour.useCase;
    return { reply: tour.reply, suggestions: tour.suggestions, done: tour.done };
  }

  async function onTermine() {
    const maj = majFinale.current;
    if (maj) {
      await appliquerCadrage(useCaseId, {
        titre: maj.titre,
        domaine: maj.domaine,
        probleme: maj.probleme,
        objectif: maj.objectif,
        kpis: maj.kpis,
        donnees: maj.donnees,
        utilisateurs: maj.utilisateurs,
        contraintes: maj.contraintes,
        approcheSuggeree: maj.approcheSuggeree,
        complexite: maj.complexite,
        scoreCadrage: maj.scoreCadrage,
        budgetEstime: maj.budgetEstime,
        roi: maj.roi,
        spec: maj.spec,
      });
    }
    aller({ nom: 'recap', useCaseId });
  }

  return (
    <ChatIA
      titre={tr('Affiner le cadrage', 'Refine the scoping')}
      ouverture={ouverture}
      jouerTour={jouerTour}
      onTermine={onTermine}
      progression={(h) => h.filter((m) => m.role === 'user').length / 4}
      relanceAuto={(h) => {
        const nbUser = h.filter((m) => m.role === 'user').length;
        const d = h[h.length - 1];
        return nbUser >= 4 && !!d && d.role === 'assistant' && !d.texte.includes('?');
      }}
      partageDocs
    />
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  chargement: { color: colors.textMuted, textAlign: 'center', marginTop: 100 },
});
