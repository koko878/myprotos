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
    const u = await utilisateurCourant();
    setUser(u);
    setPret(true);
  }

  useEffect(() => {
    if (!supabaseDisponible()) {
      setPret(true);
      return;
    }
    charger();
    const off = surChangementAuth(charger);
    return off;
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
