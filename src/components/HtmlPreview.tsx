import React from 'react';
import { StyleSheet, View } from 'react-native';
import { WebView } from 'react-native-webview';

// Aperçu natif (iOS/Android) du prototype HTML auto-porté, via WebView.
export default function HtmlPreview({ html, style }: { html: string; style?: any }) {
  return (
    <View style={[styles.box, style]}>
      <WebView
        originWhitelist={['*']}
        source={{ html }}
        style={styles.web}
        // Le prototype est auto-porté ; on autorise JS et le contenu mixte.
        javaScriptEnabled
        domStorageEnabled
        setSupportMultipleWindows={false}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  box: { flex: 1, backgroundColor: '#fff', overflow: 'hidden' },
  web: { flex: 1, backgroundColor: '#fff' },
});
