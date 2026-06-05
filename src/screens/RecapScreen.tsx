import React, { useEffect, useState } from 'react';
import { Pressable, SafeAreaView, ScrollView, StyleSheet, Text, View } from 'react-native';
import UseCaseView from '../components/UseCaseView';
import { Bouton, Carte, EnTete } from '../components/ui';
import { choisirFichiers, tailleLisible } from '../fichiers';
import { useTr } from '../i18n';
import { iaDisponible } from '../llm';
import { useNav } from '../navigation';
import { ajouterPiecesJointes, definirLangues, soumettreProjet, supprimerPieceJointe, trouverUseCase } from '../storage';
import { chargerProfil } from '../profil';
import { colors, font, radius, spacing } from '../theme';
import { UseCase } from '../types';

const LANGUES = ['Français', 'Arabe', 'Anglais', 'Espagnol', 'Amazigh'];
const LANGUES_EN: Record<string, string> = {
  Français: 'French',
  Arabe: 'Arabic',
  Anglais: 'English',
  Espagnol: 'Spanish',
  Amazigh: 'Amazigh',
};

export default function RecapScreen({ useCaseId }: { useCaseId: string }) {
  const { aller, retour } = useNav();
  const tr = useTr();
  const [uc, setUc] = useState<UseCase | null>(null);

  const [introuvable, setIntrouvable] = useState(false);

  useEffect(() => {
    let actif = true;
    // Le projet vient peut-être d'être créé en base : on réessaie quelques fois
    // (latence d'écriture/lecture) avant d'abandonner — jamais de blocage infini.
    async function charger() {
      for (let i = 0; i < 6 && actif; i++) {
        const u = await trouverUseCase(useCaseId);
        if (!actif) return;
        if (u) {
          setUc(u);
          return;
        }
        await new Promise((r) => setTimeout(r, 600));
      }
      if (actif) setIntrouvable(true);
    }
    charger();
    return () => {
      actif = false;
    };
  }, [useCaseId]);

  // Bascule une langue (coché/décoché) et persiste.
  // Mise à jour OPTIMISTE : on met à jour l'écran immédiatement, puis on persiste
  // en arrière-plan. On ne remet JAMAIS `uc` à null (sinon écran "Chargement…").
  async function basculerLangue(langue: string) {
    if (!uc) return;
    const actuelles = uc.langues ?? [];
    const maj = actuelles.includes(langue)
      ? actuelles.filter((l) => l !== langue)
      : [...actuelles, langue];
    setUc({ ...uc, langues: maj });
    definirLangues(useCaseId, maj).catch(() => {});
  }

  // Le client soumet son projet : notre équipe génère ensuite le prototype.
  // On fige le profil client (qui soumet) + l'horodatage de soumission.
  async function soumettre() {
    if (!uc) return;
    const profil = await chargerProfil();
    await soumettreProjet(useCaseId, profil);
    aller({ nom: 'detail', useCaseId });
  }

  async function joindre() {
    if (!uc) return;
    const pieces = await choisirFichiers();
    if (pieces.length) {
      setUc({ ...uc, piecesJointes: [...(uc.piecesJointes ?? []), ...pieces] });
      ajouterPiecesJointes(useCaseId, pieces).catch(() => {});
    }
  }

  async function retirer(pieceId: string) {
    if (!uc) return;
    setUc({ ...uc, piecesJointes: (uc.piecesJointes ?? []).filter((p) => p.id !== pieceId) });
    supprimerPieceJointe(useCaseId, pieceId).catch(() => {});
  }

  if (!uc) {
    return (
      <SafeAreaView style={styles.safe}>
        {introuvable ? (
          <View style={{ flex: 1, justifyContent: 'center', padding: spacing.xl, gap: spacing.lg }}>
            <Text style={styles.chargement}>{tr('Projet introuvable pour le moment.', 'Project not found at the moment.')}</Text>
            <Bouton titre={tr('Voir mes projets', 'View my projects')} onPress={() => aller({ nom: 'liste' })} />
          </View>
        ) : (
          <Text style={styles.chargement}>{tr('Chargement…', 'Loading…')}</Text>
        )}
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe}>
      <EnTete titre={tr('Récapitulatif', 'Summary')} onRetour={retour} />

      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.banniere}>
          <Text style={styles.banniereTxt}>
            {tr(
              '✅ Voici votre idée transformée en use case structuré par l’IA. Relisez-le, puis soumettez-le : nous préparons votre prototype.',
              '✅ Here’s your idea turned into a structured use case by the AI. Review it, then submit it: we’ll prepare your prototype.'
            )}
          </Text>
        </View>
        {/* Challenger / affiner le cadrage avant de soumettre */}
        {uc.statut === 'brouillon' && iaDisponible() && (
          <Bouton
            titre={tr('✏️ Challenger / affiner le cadrage', '✏️ Challenge / refine the scoping')}
            variante="secondaire"
            onPress={() => aller({ nom: 'challengeCadrage', useCaseId })}
          />
        )}

        <View style={{ height: spacing.lg }} />
        <UseCaseView uc={uc} />

        {/* Langues de l'application */}
        <Carte style={{ marginTop: spacing.lg, gap: spacing.md }}>
          <Text style={styles.pjTitre}>{tr('🌐 Langues de l’application', '🌐 App languages')}</Text>
          <Text style={styles.pjSous}>
            {tr(
              'Dans quelle(s) langue(s) votre application doit-elle être disponible ?',
              'In which language(s) should your application be available?'
            )}
          </Text>
          <View style={styles.langues}>
            {LANGUES.map((l) => {
              const actif = (uc.langues ?? []).includes(l);
              return (
                <Pressable
                  key={l}
                  onPress={() => basculerLangue(l)}
                  style={[styles.langue, actif && styles.langueActif]}
                >
                  <Text style={[styles.langueTxt, actif && styles.langueTxtActif]}>
                    {actif ? '✓ ' : ''}{tr(l, LANGUES_EN[l] ?? l)}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </Carte>

        {/* Pièces jointes : logo, charte graphique, documents… */}
        <Carte style={{ marginTop: spacing.lg, gap: spacing.md }}>
          <Text style={styles.pjTitre}>{tr('📎 Logo, charte, documents (optionnel)', '📎 Logo, brand guidelines, documents (optional)')}</Text>
          <Text style={styles.pjSous}>
            {tr(
              'Ajoutez votre logo, votre charte graphique ou tout document utile : nous nous en servirons pour que le prototype respecte votre identité.',
              'Add your logo, brand guidelines or any useful document: we’ll use them so the prototype matches your identity.'
            )}
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
          <Bouton titre={tr('+ Ajouter un fichier', '+ Add a file')} variante="secondaire" onPress={joindre} />
        </Carte>
      </ScrollView>

      <View style={styles.footer}>
        {uc.statut === 'brouillon' ? (
          <Bouton titre={tr('📤 Soumettre mon projet', '📤 Submit my project')} onPress={soumettre} />
        ) : (
          <Bouton
            titre={tr('Voir mes projets', 'View my projects')}
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
  langues: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  langue: {
    paddingHorizontal: spacing.md,
    paddingVertical: 8,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surfaceAlt,
  },
  langueActif: { borderColor: colors.primary, backgroundColor: colors.primary + '22' },
  langueTxt: { color: colors.textMuted, fontSize: font.small, fontWeight: '600' },
  langueTxtActif: { color: colors.primary },
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
