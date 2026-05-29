import { StatusBar } from 'expo-status-bar';
import React from 'react';
import { NavigationProvider, useNav } from './src/navigation';
import AdminDetailScreen from './src/screens/AdminDetailScreen';
import AdminScreen from './src/screens/AdminScreen';
import CadrageScreen from './src/screens/CadrageScreen';
import DetailScreen from './src/screens/DetailScreen';
import HomeScreen from './src/screens/HomeScreen';
import ListeScreen from './src/screens/ListeScreen';
import PrototypeScreen from './src/screens/PrototypeScreen';
import RecapScreen from './src/screens/RecapScreen';
import TechniqueScreen from './src/screens/TechniqueScreen';

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
    case 'prototype':
      return <PrototypeScreen useCaseId={route.useCaseId} />;
    case 'technique':
      return <TechniqueScreen useCaseId={route.useCaseId} />;
    case 'admin':
      return <AdminScreen />;
    case 'adminDetail':
      return <AdminDetailScreen useCaseId={route.useCaseId} />;
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
