import React from 'react';
import { ScrollView, StyleSheet, Text } from 'react-native';
import { colors, font, spacing } from '../theme';

// Repli natif (iOS/Android) : sans WebView dans ce prototype, on affiche un
// message. La cible déployée est le web (voir HtmlPreview.web.tsx).
export default function HtmlPreview({ html }: { html: string; style?: any }) {
  return (
    <ScrollView style={styles.box} contentContainerStyle={{ padding: spacing.lg }}>
      <Text style={styles.txt}>
        L’aperçu interactif du prototype est disponible dans la version web de
        l’application.
      </Text>
      <Text style={styles.meta}>{html.length} caractères de HTML généré.</Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  box: { flex: 1, backgroundColor: colors.surface, borderRadius: 12 },
  txt: { color: colors.text, fontSize: font.body, lineHeight: 22 },
  meta: { color: colors.textMuted, fontSize: font.small, marginTop: spacing.md },
});
