// Navigation minimaliste par état (sans dépendance externe), suffisante pour
// le prototype. Routes typées + paramètres.

import React, { createContext, useCallback, useContext, useMemo, useState } from 'react';

export type Route =
  | { nom: 'home' }
  | { nom: 'cadrage' }
  | { nom: 'recap'; useCaseId: string }
  | { nom: 'liste' }
  | { nom: 'detail'; useCaseId: string }
  | { nom: 'expert' } // espace expert : besoins publiés
  | { nom: 'expertDetail'; useCaseId: string }; // un expert consulte un besoin

interface NavContext {
  route: Route;
  aller: (r: Route) => void;
  retour: () => void;
}

const Ctx = createContext<NavContext | null>(null);

export function NavigationProvider({ children }: { children: React.ReactNode }) {
  const [pile, setPile] = useState<Route[]>([{ nom: 'home' }]);

  const aller = useCallback((r: Route) => setPile((p) => [...p, r]), []);
  const retour = useCallback(
    () => setPile((p) => (p.length > 1 ? p.slice(0, -1) : p)),
    []
  );

  const valeur = useMemo<NavContext>(
    () => ({ route: pile[pile.length - 1], aller, retour }),
    [pile, aller, retour]
  );

  return <Ctx.Provider value={valeur}>{children}</Ctx.Provider>;
}

export function useNav(): NavContext {
  const c = useContext(Ctx);
  if (!c) throw new Error('useNav doit être utilisé dans NavigationProvider');
  return c;
}
