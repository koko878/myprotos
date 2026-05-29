import { StatusBar } from 'expo-status-bar';
import React from 'react';
import { NavigationProvider, useNav } from './src/navigation';
import CadrageScreen from './src/screens/CadrageScreen';
import DetailScreen from './src/screens/DetailScreen';
import HomeScreen from './src/screens/HomeScreen';
import ListeScreen from './src/screens/ListeScreen';
import RecapScreen from './src/screens/RecapScreen';

function Routeur() {
  const { route } = useNav();
  switch (route.nom) {
    case 'home':
      return <HomeScreen />;
    case 'cadrage':
      return <CadrageScreen />;
    case 'recap':
      return <RecapScreen useCaseId={route.useCaseId} />;
    case 'liste':
      return <ListeScreen />;
    case 'detail':
      return <DetailScreen useCaseId={route.useCaseId} />;
    default:
      return <HomeScreen />;
  }
}

export default function App() {
  return (
    <NavigationProvider>
      <StatusBar style="light" />
      <Routeur />
    </NavigationProvider>
  );
}
