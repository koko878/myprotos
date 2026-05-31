import { StatusBar } from 'expo-status-bar';
import React from 'react';
import { ActivityIndicator, SafeAreaView, StyleSheet, View } from 'react-native';
import { AuthProvider, useAuth } from './src/authContext';
import { NavigationProvider, useNav } from './src/navigation';
import { colors } from './src/theme';
import AdminDetailScreen from './src/screens/AdminDetailScreen';
import AdminScreen from './src/screens/AdminScreen';
import CadrageScreen from './src/screens/CadrageScreen';
import CadrageChallengeScreen from './src/screens/CadrageChallengeScreen';
import ChallengeScreen from './src/screens/ChallengeScreen';
import DetailScreen from './src/screens/DetailScreen';
import HomeScreen from './src/screens/HomeScreen';
import ListeScreen from './src/screens/ListeScreen';
import LoginScreen from './src/screens/LoginScreen';
import PrototypeScreen from './src/screens/PrototypeScreen';
import RecapScreen from './src/screens/RecapScreen';
import TechniqueScreen from './src/screens/TechniqueScreen';

function Routeur() {
  const { route } = useNav();
  const { estAdmin } = useAuth();
  switch (route.nom) {
    case 'home':
      return <HomeScreen />;
    case 'cadrage':
      return <CadrageScreen />;
    case 'recap':
      return <RecapScreen useCaseId={route.useCaseId} />;
    case 'challengeCadrage':
      return <CadrageChallengeScreen useCaseId={route.useCaseId} />;
    case 'liste':
      return <ListeScreen />;
    case 'detail':
      return <DetailScreen useCaseId={route.useCaseId} />;
    case 'prototype':
      return <PrototypeScreen useCaseId={route.useCaseId} />;
    case 'challenge':
      return <ChallengeScreen useCaseId={route.useCaseId} />;
    case 'technique':
      return <TechniqueScreen useCaseId={route.useCaseId} />;
    // Routes admin protégées : accessibles seulement si rôle admin.
    case 'admin':
      return estAdmin ? <AdminScreen /> : <HomeScreen />;
    case 'adminDetail':
      return estAdmin ? <AdminDetailScreen useCaseId={route.useCaseId} /> : <HomeScreen />;
    default:
      return <HomeScreen />;
  }
}

// Décide : écran de chargement, login (si auth requise et non connecté), ou app.
function Porte() {
  const { pret, user, authRequise } = useAuth();
  if (!pret) {
    return (
      <SafeAreaView style={styles.centre}>
        <ActivityIndicator color={colors.primary} />
      </SafeAreaView>
    );
  }
  if (authRequise && !user) return <LoginScreen />;
  return (
    <NavigationProvider>
      <Routeur />
    </NavigationProvider>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <StatusBar style="light" />
      <Porte />
    </AuthProvider>
  );
}

const styles = StyleSheet.create({
  centre: { flex: 1, backgroundColor: colors.bg, alignItems: 'center', justifyContent: 'center' },
});
