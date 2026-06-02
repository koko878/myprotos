import { StatusBar } from 'expo-status-bar';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, SafeAreaView, StyleSheet, View } from 'react-native';
import { AuthProvider, useAuth } from './src/authContext';
import { NavigationProvider, useNav } from './src/navigation';
import { profilComplet } from './src/profil';
import ProfilScreen from './src/screens/ProfilScreen';
import { colors } from './src/theme';
import AdminDetailScreen from './src/screens/AdminDetailScreen';
import AdminScreen from './src/screens/AdminScreen';
import BanqueScreen from './src/screens/BanqueScreen';
import PromptsScreen from './src/screens/PromptsScreen';
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
    case 'banque':
      return estAdmin ? <BanqueScreen /> : <HomeScreen />;
    case 'prompts':
      return estAdmin ? <PromptsScreen /> : <HomeScreen />;
    default:
      return <HomeScreen />;
  }
}

// Décide : écran de chargement, login (si auth requise et non connecté),
// collecte du profil client (une fois), ou app.
function Porte() {
  const { pret, user, authRequise, estAdmin } = useAuth();
  // null = on ne sait pas encore ; true/false = profil complet ou non.
  const [profilOk, setProfilOk] = useState<boolean | null>(null);

  // Identité de session : recharge l'état du profil quand on (dé)connecte.
  const cleSession = authRequise ? user?.id ?? 'anon' : 'local';

  useEffect(() => {
    let actif = true;
    profilComplet()
      .then((ok) => actif && setProfilOk(ok))
      .catch(() => actif && setProfilOk(true)); // en cas d'erreur, ne pas bloquer
    return () => {
      actif = false;
    };
  }, [cleSession]);

  if (!pret) {
    return (
      <SafeAreaView style={styles.centre}>
        <ActivityIndicator color={colors.primary} />
      </SafeAreaView>
    );
  }
  if (authRequise && !user) return <LoginScreen />;

  // Collecte du profil (clients uniquement ; l'admin n'en a pas besoin).
  if (!estAdmin) {
    if (profilOk === null) {
      return (
        <SafeAreaView style={styles.centre}>
          <ActivityIndicator color={colors.primary} />
        </SafeAreaView>
      );
    }
    if (!profilOk) return <ProfilScreen onTermine={() => setProfilOk(true)} />;
  }

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
