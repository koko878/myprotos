import React, { useEffect, useState } from 'react';
import { Pressable, SafeAreaView, ScrollView, StyleSheet, Text, View } from 'react-native';
import UseCaseView from '../components/UseCaseView';
import { Bouton, Carte } from '../components/ui';
import { choisirFichiers, tailleLisible } from '../fichiers';
import { useNav } from '../navigation';
import { ajouterPiecesJointes, mettreAJourStatut, supprimerPieceJointe, trouverUseCase } from '../storage';
import { colors, font, radius, spacing } from '../theme';
import { UseCase } from '../types';

export default function RecapScreen({ useCaseId }: { useCaseId: string }) {
  const { aller, retour } = useNav();
  const [uc, setUc] = useState<UseCase | null>(null);

  useEffect(() => {
    trouverUseCase(useCaseId).then((u) => setUc(u ?? null));
  }, [useCaseId]);

  // Le client soumet son projet : notre équipe génère ensuite le prototype.
  async function soumettre() {
    if (!uc) return;
    await mettreAJourStatut(useCaseId, 'soumis');
    aller({ nom: 'detail', useCaseId });
  }

  async function joindre() {
    const pieces = await choisirFichiers();
    if (pieces.length) {
      const liste = await ajouterPiecesJointes(useCaseId, pieces);
      setUc(liste.find((u) => u.id === useCaseId) ?? null);
    }
  }

  async function retirer(pieceId: string) {
    const liste = await supprimerPieceJointe(useCaseId, pieceId);
    setUc(liste.find((u) => u.id === useCaseId) ?? null);
  }

  if (!uc) {
    return (
      <SafeAreaView style={styles.safe}>
        <Text style={styles.chargement}>Chargement…</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.header}>
        <Pressable onPress={retour} hitSlop={12}>
          <Text style={styles.retour}>‹ Retour</Text>
        </Pressable>
        <Text style={styles.headerTitre}>Récapitulatif</Text>
        <View style={{ width: 70 }} />
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.banniere}>
          <Text style={styles.banniereTxt}>
            ✅ Voici votre idée transformée en use case structuré par l’IA.
            Relisez-le, puis soumettez-le : nous préparons votre prototype.
          </Text>
        </View>
        <UseCaseView uc={uc} />

        {/* Pièces jointes : logo, charte graphique, documents… */}
        <Carte style={{ marginTop: spacing.lg, gap: spacing.md }}>
          <Text style={styles.pjTitre}>📎 Logo, charte, documents (optionnel)</Text>
          <Text style={styles.pjSous}>
            Ajoutez votre logo, votre charte graphique ou tout document utile : nous nous en
            servirons pour que le prototype respecte votre identité.
          </Text>
          {(uc.piecesJointes ?? []).map((p) => (
            <View key={p.id} style={styles.pjLigne}>
              <Text style={styles.pjNom} numberOfLines={1}>
                {p.nom} <Text style={styles.pjMeta}>· {tailleLisible(p.taille)}</Text>
              </Text>
              <Pressable onPress={() => retirer(p.id)} hitSlop={8}>
                <Text style={styles.pjX}>✕</Text>
              </Pressable>
            </View>
          ))}
          <Bouton titre="+ Ajouter un fichier" variante="secondaire" onPress={joindre} />
        </Carte>
      </ScrollView>

      <View style={styles.footer}>
        {uc.statut === 'brouillon' ? (
          <Bouton titre="📤 Soumettre mon projet" onPress={soumettre} />
        ) : (
          <Bouton
            titre="Voir mes projets"
            variante="secondaire"
            onPress={() => aller({ nom: 'liste' })}
          />
        )}
      </View>
    </SafeAreaView>
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
  content: { padding: spacing.lg, paddingBottom: spacing.xxl },
  banniere: {
    backgroundColor: colors.success + '18',
    borderColor: colors.success + '44',
    borderWidth: 1,
    borderRadius: 14,
    padding: spacing.md,
    marginBottom: spacing.lg,
  },
  banniereTxt: { color: colors.text, fontSize: font.small, lineHeight: 20 },
  pjTitre: { color: colors.text, fontSize: font.h3, fontWeight: '800' },
  pjSous: { color: colors.textMuted, fontSize: font.small, lineHeight: 19 },
  pjLigne: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
    backgroundColor: colors.surfaceAlt,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  pjNom: { color: colors.text, fontSize: font.small, flex: 1 },
  pjMeta: { color: colors.textMuted, fontSize: font.tiny },
  pjX: { color: colors.danger, fontSize: font.body, fontWeight: '800' },
  footer: {
    padding: spacing.lg,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    backgroundColor: colors.surface,
  },
  chargement: { color: colors.textMuted, textAlign: 'center', marginTop: 100 },
});
