import React, { useEffect, useRef } from 'react';
import { tourCadrageIA } from '../cadrageAssistant';
import ChatIA, { ResultatTour, uidMessage } from '../components/ChatIA';
import { useLang } from '../i18n';
import { iaDisponible } from '../llm';
import { useNav } from '../navigation';
import { chargerProfil } from '../profil';
import { creerEtId } from '../storage';
import { Message, UseCase } from '../types';
import CadrageScripte from './CadrageScripte';

// Ouverture commune : l'IA prend ensuite la main sur tout le dialogue.
const ouverture = (lang: 'fr' | 'en'): Message[] =>
  lang === 'en'
    ? [
        {
          id: uidMessage(),
          role: 'assistant',
          texte: 'Hi 👋 I’m your consultant. We’ll turn your idea into a clear project in a few questions.',
        },
        {
          id: uidMessage(),
          role: 'assistant',
          texte: 'In one sentence, what’s the idea or need you’d like to explore?',
          suggestions: [
            'Predict customer churn risk',
            'Automate sorting of incoming documents',
            'An AI assistant for my customer support',
          ],
        },
      ]
    : [
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
  const { lang } = useLang();
  const useCaseFinal = useRef<UseCase | null>(null);
  const profil = useRef<{ paysClient?: string; secteur?: string }>({});

  // Charge le profil client (pays/secteur) pour le passer en contexte à l'IA.
  useEffect(() => {
    chargerProfil().then((p) => {
      if (p) profil.current = { paysClient: p.pays, secteur: p.secteur };
    });
  }, []);

  // Sans IA : on retombe sur le questionnaire scripté local.
  if (!iaDisponible()) return <CadrageScripte />;

  async function jouerTour(historique: Message[]): Promise<ResultatTour | null> {
    const nbUser = historique.filter((m) => m.role === 'user').length;
    const tour = await tourCadrageIA(historique, nbUser >= 9, profil.current, lang);
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

  // Si l'IA a assez d'infos (≥9 réponses) mais a répondu sans poser de question
  // (dernier message = conclusion type "je résume votre cas"), on relance pour
  // obtenir le use case structuré sans attendre l'utilisateur.
  function relanceAuto(historique: Message[]): boolean {
    const nbUser = historique.filter((m) => m.role === 'user').length;
    if (nbUser < 9) return false;
    const dernier = historique[historique.length - 1];
    if (!dernier || dernier.role !== 'assistant') return false;
    // Pas de question en attente -> on peut conclure automatiquement.
    return !dernier.texte.includes('?');
  }

  return (
    <ChatIA
      titre={lang === 'en' ? 'Business scoping' : 'Cadrage métier'}
      ouverture={ouverture(lang)}
      jouerTour={jouerTour}
      onTermine={onTermine}
      progression={(h) => h.filter((m) => m.role === 'user').length / 9}
      relanceAuto={relanceAuto}
      partageDocs
    />
  );
}
