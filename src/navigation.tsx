// Navigation minimaliste par état (sans dépendance externe), suffisante pour
// le prototype. Routes typées + paramètres.

import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { BackHandler, Platform } from 'react-native';

export type Route =
  | { nom: 'home' }
  | { nom: 'cadrage' } // cadrage métier (IA consultant)
  | { nom: 'recap'; useCaseId: string }
  | { nom: 'challengeCadrage'; useCaseId: string } // affiner le cadrage (IA)
  | { nom: 'liste' }
  | { nom: 'detail'; useCaseId: string }
  | { nom: 'prototype'; useCaseId: string } // aperçu du prototype HTML (client)
  | { nom: 'challenge'; useCaseId: string } // IA aide le client à formuler ses retours
  | { nom: 'technique'; useCaseId: string } // cadrage technique (IA architecte)
  | { nom: 'commande'; useCaseId: string } // bon de commande (validation + signature)
  | { nom: 'admin' } // espace admin : génération des prototypes
  | { nom: 'adminDetail'; useCaseId: string }
  | { nom: 'banque' } // banque d'idées : classement + similarités (admin)
  | { nom: 'prompts' }; // réglage des prompts des agents IA (admin)

interface NavContext {
  route: Route;
  aller: (r: Route) => void;
  retour: () => void;
}

const Ctx = createContext<NavContext | null>(null);

export function NavigationProvider({ children }: { children: React.ReactNode }) {
  const [pile, setPile] = useState<Route[]>([{ nom: 'home' }]);
  const profondeur = useRef(1); // profondeur courante de la pile (pour le back natif)
  profondeur.current = pile.length;

  const aller = useCallback((r: Route) => {
    setPile((p) => [...p, r]);
    // Web : empile une entrée d'historique pour que le bouton « précédent » du
    // navigateur recule DANS l'app au lieu d'en sortir.
    if (Platform.OS === 'web' && typeof window !== 'undefined') {
      try { window.history.pushState({ getexp: true }, ''); } catch { /* ignore */ }
    }
  }, []);
  const retour = useCallback(
    () => setPile((p) => (p.length > 1 ? p.slice(0, -1) : p)),
    []
  );

  // Bouton retour matériel Android : revient en arrière dans la pile au lieu de
  // quitter l'app. Ne quitte que si on est déjà à l'accueil (comportement natif).
  useEffect(() => {
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      if (profondeur.current > 1) {
        setPile((p) => (p.length > 1 ? p.slice(0, -1) : p));
        return true; // géré : on ne quitte pas l'app
      }
      return false; // à l'accueil : comportement natif (quitter)
    });
    return () => sub.remove();
  }, []);

  // Web : intercepte le bouton « précédent » du navigateur. Au lieu de quitter
  // l'app (revenir au site précédent), on recule dans la pile interne. On
  // maintient une entrée d'historique « tampon » tant qu'on n'est pas à l'accueil.
  useEffect(() => {
    if (Platform.OS !== 'web' || typeof window === 'undefined') return;
    const onPop = () => {
      if (profondeur.current > 1) {
        setPile((p) => (p.length > 1 ? p.slice(0, -1) : p));
        // Ré-empile un tampon pour rester « capturé » jusqu'à l'accueil.
        try { window.history.pushState({ getexp: true }, ''); } catch { /* ignore */ }
      }
      // À l'accueil : on laisse le navigateur faire (l'utilisateur peut sortir).
    };
    // Entrée tampon initiale.
    try { window.history.pushState({ getexp: true }, ''); } catch { /* ignore */ }
    window.addEventListener('popstate', onPop);
    return () => window.removeEventListener('popstate', onPop);
  }, []);

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
