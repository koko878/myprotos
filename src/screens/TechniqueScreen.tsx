import React, { useEffect, useRef, useState } from 'react';
import { SafeAreaView, StyleSheet, Text, View } from 'react-native';
import { tourArchitecteIA } from '../cadrageAssistant';
import ChatIA, { ResultatTour, uidMessage } from '../components/ChatIA';
import { Bouton } from '../components/ui';
import { iaDisponible } from '../llm';
import { useNav } from '../navigation';
import { enregistrerCadrageTechnique, trouverUseCase, mettreAJourStatut } from '../storage';
import { colors, font, spacing } from '../theme';
import { CadrageTechnique, CibleDeploiement, Message, UseCase } from '../types';

export default function TechniqueScreen({ useCaseId }: { useCaseId: string }) {
  const { aller, retour } = useNav();
  const [uc, setUc] = useState<UseCase | null>(null);
  const dernierCadrage = useRef<CadrageTechnique | null>(null);
  const derniereCible = useRef<CibleDeploiement | undefined>(undefined);

  useEffect(() => {
    trouverUseCase(useCaseId).then((u) => {
      setUc(u ?? null);
      if (u && u.statut === 'prototype_valide') {
        mettreAJourStatut(useCaseId, 'cadrage_technique');
      }
    });
  }, [useCaseId]);

  if (!uc) {
    return (
      <SafeAreaView style={styles.safe}>
        <Text style={styles.chargement}>Chargement…</Text>
      </SafeAreaView>
    );
  }

  // L'architecte IA nécessite le LLM ; sans clé on l'explique.
  if (!iaDisponible()) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.centre}>
          <Text style={styles.titre}>Cadrage technique</Text>
          <Text style={styles.txt}>
            L’architecte IA n’est pas disponible (aucun fournisseur configuré). Réessayez
            quand l’IA est active.
          </Text>
          <Bouton titre="Retour" variante="secondaire" onPress={retour} />
        </View>
      </SafeAreaView>
    );
  }

  const ouverture: Message[] = [
    {
      id: uidMessage(),
      role: 'assistant',
      texte:
        'Parfait, votre prototype est validé ✅ Je suis l’architecte qui va préparer la livraison « plug-and-play » chez vous. Quelques questions sur votre infrastructure.',
    },
    {
      id: uidMessage(),
      role: 'assistant',
      texte:
        'Pour commencer : où sera hébergée l’application ? Sur un cloud (AWS, Azure, Google…) ou sur vos propres serveurs en interne ?',
      suggestions: ['On est sur AWS', 'Sur nos serveurs internes', 'Je ne sais pas encore'],
    },
  ];

  async function jouerTour(historique: Message[]): Promise<ResultatTour | null> {
    const nbUser = historique.filter((m) => m.role === 'user').length;
    // On laisse l'architecte aller plus loin (collecte exhaustive si on-premise).
    const tour = await tourArchitecteIA(historique, nbUser >= 12);
    if (!tour) return null;
    if (tour.done && tour.cadrage) {
      dernierCadrage.current = tour.cadrage;
      derniereCible.current = tour.cible;
    }
    return { reply: tour.reply, suggestions: tour.suggestions, done: tour.done };
  }

  async function onTermine() {
    const cadrage = dernierCadrage.current;
    if (cadrage) {
      await enregistrerCadrageTechnique(useCaseId, cadrage, derniereCible.current);
    }
    // Une fois le cadrage technique finalisé -> bon de commande.
    aller({ nom: 'commande', useCaseId });
  }

  return (
    <ChatIA
      titre="Cadrage technique"
      ouverture={ouverture}
      jouerTour={jouerTour}
      onTermine={onTermine}
      progression={(h) => h.filter((m) => m.role === 'user').length / 7}
      relanceAuto={(h) => {
        const nbUser = h.filter((m) => m.role === 'user').length;
        const d = h[h.length - 1];
        return nbUser >= 7 && !!d && d.role === 'assistant' && !d.texte.includes('?');
      }}
    />
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  centre: { flex: 1, justifyContent: 'center', padding: spacing.xl, gap: spacing.lg },
  titre: { color: colors.text, fontSize: font.h2, fontWeight: '800' },
  txt: { color: colors.textMuted, fontSize: font.body, lineHeight: 22 },
  chargement: { color: colors.textMuted, textAlign: 'center', marginTop: 100 },
});
