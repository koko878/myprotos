import React, { useEffect, useState } from 'react';
import { Pressable, SafeAreaView, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { Bouton, Carte } from '../components/ui';
import { useNav } from '../navigation';
import { AgentPrompt, listeAgents } from '../promptsAgents';
import { chargerReglages, definirReglage, reglageBrut } from '../reglages';
import { colors, font, radius, spacing } from '../theme';

// Réglage des prompts des agents IA (admin). Chaque agent a un prompt par défaut
// (dans le code) que l'admin peut SURCHARGER. Les overrides sont partagés (DB)
// pour atteindre aussi les clients. Vide = retour au prompt par défaut.
export default function PromptsScreen() {
  const { retour } = useNav();
  const agents = listeAgents();
  const [ouvert, setOuvert] = useState<string | null>(null);
  const [pret, setPret] = useState(false);

  useEffect(() => {
    chargerReglages(true).finally(() => setPret(true));
  }, []);

  if (!pret) {
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
          <Text style={styles.retour}>‹ Admin</Text>
        </Pressable>
        <Text style={styles.headerTitre}>Prompts des agents</Text>
        <View style={{ width: 70 }} />
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.intro}>
          Ajustez le comportement des agents IA. Laissez vide pour revenir au prompt par
          défaut. Les changements s’appliquent à tous (clients inclus).
        </Text>
        {agents.map((a) => (
          <AgentCarte
            key={a.cle}
            agent={a}
            ouvert={ouvert === a.cle}
            onToggle={() => setOuvert((o) => (o === a.cle ? null : a.cle))}
          />
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}

function AgentCarte({
  agent,
  ouvert,
  onToggle,
}: {
  agent: AgentPrompt;
  ouvert: boolean;
  onToggle: () => void;
}) {
  const [valeur, setValeur] = useState<string | null>(null); // null = pas encore chargé
  const [surcharge, setSurcharge] = useState(false);
  const [etat, setEtat] = useState<'idle' | 'saving' | 'ok' | 'err'>('idle');

  useEffect(() => {
    if (ouvert && valeur === null) {
      reglageBrut(agent.cle).then((v) => {
        setSurcharge(v.trim().length > 0);
        setValeur(v.trim().length > 0 ? v : agent.defaut);
      });
    }
  }, [ouvert]);

  async function enregistrer() {
    if (valeur === null) return;
    setEtat('saving');
    // Si le contenu == défaut, on efface l'override (revient au défaut).
    const aEnvoyer = valeur.trim() === agent.defaut.trim() ? '' : valeur;
    const ok = await definirReglage(agent.cle, aEnvoyer);
    setSurcharge(aEnvoyer.trim().length > 0);
    setEtat(ok ? 'ok' : 'err');
    setTimeout(() => setEtat('idle'), 2500);
  }

  async function reinitialiser() {
    setEtat('saving');
    const ok = await definirReglage(agent.cle, '');
    setValeur(agent.defaut);
    setSurcharge(false);
    setEtat(ok ? 'ok' : 'err');
    setTimeout(() => setEtat('idle'), 2500);
  }

  return (
    <Carte style={{ gap: spacing.sm, borderColor: surcharge ? colors.primary + '66' : colors.border }}>
      <Pressable onPress={onToggle} style={styles.cardTop}>
        <View style={{ flex: 1 }}>
          <Text style={styles.titre}>{agent.titre}</Text>
          <Text style={styles.desc}>{agent.description}</Text>
        </View>
        <Text style={styles.chevron}>{ouvert ? '▾' : '▸'}</Text>
      </Pressable>

      {surcharge && !ouvert && <Text style={styles.badge}>● Prompt personnalisé actif</Text>}

      {ouvert && (
        <>
          <TextInput
            style={styles.editeur}
            value={valeur ?? ''}
            onChangeText={setValeur}
            multiline
            placeholder="Prompt système de l’agent…"
            placeholderTextColor={colors.textMuted}
            textAlignVertical="top"
          />
          <View style={styles.actions}>
            <View style={{ flex: 1 }}>
              <Bouton
                titre={etat === 'saving' ? 'Enregistrement…' : '💾 Enregistrer'}
                onPress={enregistrer}
                loading={etat === 'saving'}
              />
            </View>
            <Pressable onPress={reinitialiser} hitSlop={8} style={styles.reset}>
              <Text style={styles.resetTxt}>↺ Défaut</Text>
            </Pressable>
          </View>
          {etat === 'ok' && <Text style={styles.ok}>✅ Enregistré (appliqué à tous).</Text>}
          {etat === 'err' && (
            <Text style={styles.err}>
              ⚠️ Échec de l’enregistrement partagé. Vérifiez que la table « reglages » existe
              dans Supabase (voir schema.sql).
            </Text>
          )}
        </>
      )}
    </Carte>
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
  content: { padding: spacing.lg, paddingBottom: spacing.xxl, gap: spacing.md },
  intro: { color: colors.textMuted, fontSize: font.small, lineHeight: 20 },
  cardTop: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  titre: { color: colors.text, fontSize: font.body, fontWeight: '800' },
  desc: { color: colors.textMuted, fontSize: font.tiny, lineHeight: 17, marginTop: 2 },
  chevron: { color: colors.textMuted, fontSize: font.h3, fontWeight: '800' },
  badge: { color: colors.primary, fontSize: font.tiny, fontWeight: '700' },
  editeur: {
    minHeight: 220,
    maxHeight: 420,
    color: colors.text,
    fontSize: font.tiny,
    lineHeight: 18,
    backgroundColor: '#0A0E18',
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    fontFamily: 'monospace',
  },
  actions: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  reset: { paddingHorizontal: spacing.md, paddingVertical: spacing.sm },
  resetTxt: { color: colors.textMuted, fontSize: font.small, fontWeight: '700' },
  ok: { color: colors.success, fontSize: font.small },
  err: { color: colors.danger, fontSize: font.small, lineHeight: 18 },
  chargement: { color: colors.textMuted, textAlign: 'center', marginTop: 100 },
});
