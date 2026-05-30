import React, { useRef } from 'react';
import { tourCadrageIA } from '../cadrageAssistant';
import ChatIA, { ResultatTour, uidMessage } from '../components/ChatIA';
import { iaDisponible } from '../llm';
import { useNav } from '../navigation';
import { creerEtId } from '../storage';
import { Message, UseCase } from '../types';
import CadrageScripte from './CadrageScripte';

// Ouverture commune : l'IA prend ensuite la main sur tout le dialogue.
const ouverture = (): Message[] => [
  {
    id: uidMessage(),
    role: 'assistant',
    texte:
      'Bonjour 👋 Je suis votre consultant. On va transformer votre idée en projet clair en quelques questions.',
  },
  {
    id: uidMessage(),
    role: 'assistant',
    texte: 'En une phrase, quelle est l’idée ou le besoin que vous aimeriez explorer ?',
    suggestions: [
      'Prédire le risque de churn de mes clients',
      'Automatiser le tri de documents entrants',
      'Un assistant IA pour mon support client',
    ],
  },
];

export default function CadrageScreen() {
  const { aller } = useNav();
  const useCaseFinal = useRef<UseCase | null>(null);

  // Sans IA : on retombe sur le questionnaire scripté local.
  if (!iaDisponible()) return <CadrageScripte />;

  async function jouerTour(historique: Message[]): Promise<ResultatTour | null> {
    const nbUser = historique.filter((m) => m.role === 'user').length;
    const tour = await tourCadrageIA(historique, nbUser >= 6);
    if (!tour) return null;
    if (tour.done && tour.useCase) useCaseFinal.current = tour.useCase;
    return { reply: tour.reply, suggestions: tour.suggestions, done: tour.done };
  }

  async function onTermine() {
    const uc = useCaseFinal.current;
    if (!uc) return;
    const id = await creerEtId(uc);
    aller({ nom: 'recap', useCaseId: id });
  }

  return (
    <ChatIA
      titre="Cadrage métier"
      ouverture={ouverture()}
      jouerTour={jouerTour}
      onTermine={onTermine}
      progression={(h) => h.filter((m) => m.role === 'user').length / 6}
    />
  );
}
