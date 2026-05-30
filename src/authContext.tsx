import React, { createContext, useContext, useEffect, useState } from 'react';
import { surChangementAuth, Utilisateur, utilisateurCourant } from './auth';
import { supabaseDisponible } from './supabase';

interface AuthCtx {
  pret: boolean; // session vérifiée au moins une fois
  user: Utilisateur | null;
  estAdmin: boolean;
  authRequise: boolean; // Supabase configuré -> login obligatoire
  rafraichir: () => void;
}

const Ctx = createContext<AuthCtx | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [pret, setPret] = useState(false);
  const [user, setUser] = useState<Utilisateur | null>(null);

  async function charger() {
    try {
      const u = await utilisateurCourant();
      setUser(u);
    } catch {
      setUser(null);
    } finally {
      setPret(true); // ne jamais rester bloqué sur l'écran de chargement
    }
  }

  useEffect(() => {
    if (!supabaseDisponible()) {
      setPret(true);
      return;
    }
    charger();
    const off = surChangementAuth(charger);
    // Garde-fou : si la vérification de session traîne (réseau lent), on
    // débloque l'UI au bout de 6 s (l'utilisateur verra l'écran de connexion).
    const secours = setTimeout(() => setPret(true), 6000);
    return () => {
      clearTimeout(secours);
      off();
    };
  }, []);

  return (
    <Ctx.Provider
      value={{
        pret,
        user,
        estAdmin: user?.role === 'admin',
        authRequise: supabaseDisponible(),
        rafraichir: charger,
      }}
    >
      {children}
    </Ctx.Provider>
  );
}

export function useAuth(): AuthCtx {
  const c = useContext(Ctx);
  if (!c) throw new Error('useAuth doit être utilisé dans AuthProvider');
  return c;
}
