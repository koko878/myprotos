// Petits composants UI réutilisables.

import React from 'react';
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  View,
  StyleProp,
  ViewStyle,
} from 'react-native';
import { colors, font, radius, spacing } from '../theme';
import { Complexite } from '../types';

export function Bouton({
  titre,
  onPress,
  variante = 'primaire',
  disabled,
  loading,
}: {
  titre: string;
  onPress: () => void;
  variante?: 'primaire' | 'secondaire';
  disabled?: boolean;
  loading?: boolean;
}) {
  const estPrim = variante === 'primaire';
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled || loading}
      style={({ pressed }) => [
        styles.bouton,
        estPrim ? styles.boutonPrim : styles.boutonSec,
        (disabled || loading) && { opacity: 0.5 },
        pressed && { transform: [{ scale: 0.98 }] },
      ]}
    >
      {loading ? (
        <ActivityIndicator color={estPrim ? '#fff' : colors.primary} />
      ) : (
        <Text style={[styles.boutonTexte, !estPrim && { color: colors.primary }]}>
          {titre}
        </Text>
      )}
    </Pressable>
  );
}

export function Carte({
  children,
  style,
  onPress,
}: {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  onPress?: () => void;
}) {
  const contenu = <View style={[styles.carte, style]}>{children}</View>;
  if (onPress) {
    return (
      <Pressable onPress={onPress} style={({ pressed }) => pressed && { opacity: 0.85 }}>
        {contenu}
      </Pressable>
    );
  }
  return contenu;
}

export function Etiquette({ texte, couleur }: { texte: string; couleur?: string }) {
  return (
    <View style={[styles.etiquette, couleur ? { backgroundColor: couleur + '22', borderColor: couleur + '55' } : null]}>
      <Text style={[styles.etiquetteTexte, couleur ? { color: couleur } : null]}>{texte}</Text>
    </View>
  );
}

export function couleurComplexite(c: Complexite): string {
  if (c === 'Faible') return colors.success;
  if (c === 'Moyenne') return colors.warn;
  return colors.danger;
}

// Jauge de score de cadrage (0-100).
export function ScoreCadrage({ score }: { score: number }) {
  const couleur = score >= 75 ? colors.success : score >= 50 ? colors.warn : colors.danger;
  return (
    <View style={styles.scoreWrap}>
      <View style={styles.scoreHeader}>
        <Text style={styles.scoreLabel}>Maturité du cadrage</Text>
        <Text style={[styles.scoreVal, { color: couleur }]}>{score}/100</Text>
      </View>
      <View style={styles.scoreBarBg}>
        <View style={[styles.scoreBarFill, { width: `${score}%`, backgroundColor: couleur }]} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  bouton: {
    borderRadius: radius.pill,
    paddingVertical: 14,
    paddingHorizontal: spacing.xl,
    alignItems: 'center',
    justifyContent: 'center',
  },
  boutonPrim: { backgroundColor: colors.primary },
  boutonSec: { backgroundColor: 'transparent', borderWidth: 1.5, borderColor: colors.primary },
  boutonTexte: { color: '#fff', fontSize: font.body, fontWeight: '700' },
  carte: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.lg,
  },
  etiquette: {
    backgroundColor: colors.surfaceAlt,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: radius.pill,
    paddingHorizontal: spacing.md,
    paddingVertical: 5,
    alignSelf: 'flex-start',
  },
  etiquetteTexte: { color: colors.textMuted, fontSize: font.tiny, fontWeight: '700' },
  scoreWrap: { gap: spacing.sm },
  scoreHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  scoreLabel: { color: colors.textMuted, fontSize: font.small, fontWeight: '600' },
  scoreVal: { fontSize: font.h3, fontWeight: '800' },
  scoreBarBg: {
    height: 8,
    borderRadius: radius.pill,
    backgroundColor: colors.surfaceAlt,
    overflow: 'hidden',
  },
  scoreBarFill: { height: '100%', borderRadius: radius.pill },
});
