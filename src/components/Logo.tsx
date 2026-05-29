import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { colors, font } from '../theme';

// Wordmark GetExp inspiré du croquis : « GET » avec le E en rouge (qui amorce
// « EXP »), et « EXP » en rouge sous le mot. Rouge = couleur de marque.
export default function Logo({ size = 'md' }: { size?: 'sm' | 'md' | 'lg' }) {
  const f = size === 'lg' ? 44 : size === 'sm' ? 22 : 30;
  return (
    <View style={styles.wrap}>
      <View style={styles.row}>
        <Texte taille={f} couleur={colors.text}>
          G
        </Texte>
        <Texte taille={f} couleur={colors.primary}>
          E
        </Texte>
        <Texte taille={f} couleur={colors.text}>
          T
        </Texte>
      </View>
      <Text style={[styles.exp, { fontSize: f * 0.34, color: colors.primary, letterSpacing: f * 0.18 }]}>
        EXP
      </Text>
    </View>
  );
}

function Texte({ taille, couleur, children }: { taille: number; couleur: string; children: string }) {
  return (
    <Text style={[styles.lettre, { fontSize: taille, color: couleur }]}>{children}</Text>
  );
}

const styles = StyleSheet.create({
  wrap: { alignSelf: 'flex-start' },
  row: { flexDirection: 'row' },
  lettre: { fontWeight: '900', letterSpacing: 1 },
  exp: {
    fontWeight: '900',
    marginTop: -2,
    // Aligne « EXP » sous la fin du mot (côté droit), comme sur le croquis.
    alignSelf: 'flex-end',
  },
});
