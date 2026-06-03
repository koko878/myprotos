// Utilitaires fichiers 100% navigateur (web) : sélection de pièces jointes,
// construction d'un ZIP (prompt + pièces) et téléchargement. Aucun backend.
import { Platform } from 'react-native';
import { PieceJointe, UseCase } from './types';
import { construireZip, dataUrlVersBytes } from './zip';

let seq = 0;
const pid = () => `pj_${Date.now().toString(36)}_${seq++}`;

// Ouvre le sélecteur de fichiers et renvoie les pièces lues en data URL.
// Web : input DOM. Natif (APK) : expo-document-picker.
export async function choisirFichiers(accept = '*/*'): Promise<PieceJointe[]> {
  if (Platform.OS !== 'web') return choisirFichiersNatif();
  return new Promise((resolve) => {
    if (typeof document === 'undefined') {
      resolve([]);
      return;
    }
    const input = document.createElement('input');
    input.type = 'file';
    input.multiple = true;
    input.accept = accept;
    input.style.position = 'fixed';
    input.style.opacity = '0';
    input.style.pointerEvents = 'none';
    let resolu = false;
    const nettoyer = () => {
      try { document.body.removeChild(input); } catch { /* déjà retiré */ }
    };
    const terminer = (pieces: PieceJointe[]) => {
      if (resolu) return;
      resolu = true;
      nettoyer();
      resolve(pieces);
    };
    input.onchange = async () => {
      const files = Array.from(input.files || []);
      const pieces: PieceJointe[] = [];
      for (const f of files) {
        const dataUrl = await new Promise<string>((res) => {
          const reader = new FileReader();
          reader.onload = () => res(String(reader.result || ''));
          reader.onerror = () => res('');
          reader.readAsDataURL(f);
        });
        if (dataUrl) {
          pieces.push({
            id: pid(),
            nom: f.name,
            type: f.type || 'application/octet-stream',
            taille: f.size,
            dataUrl,
            creeLe: Date.now(),
          });
        }
      }
      terminer(pieces);
    };
    // Annulation : l'événement 'cancel' (navigateurs modernes) OU un repli au
    // retour de focus garantissent qu'on résout TOUJOURS (promesse jamais
    // suspendue, input jamais laissé dans le DOM).
    input.oncancel = () => terminer([]);
    const surFocus = () => {
      window.removeEventListener('focus', surFocus);
      // Au retour de focus : si AUCUN fichier choisi, c'est une annulation.
      // Si des fichiers sont présents, on laisse onchange finir (lecture async).
      setTimeout(() => {
        if (!input.files || input.files.length === 0) terminer([]);
      }, 300);
    };
    window.addEventListener('focus', surFocus);
    document.body.appendChild(input);
    input.click();
  });
}

// Sélection de pièces jointes en natif (Android/iOS) via DocumentPicker.
async function choisirFichiersNatif(): Promise<PieceJointe[]> {
  try {
    const DocumentPicker = await import('expo-document-picker');
    const FileSystem = await import('expo-file-system');
    const res = await DocumentPicker.getDocumentAsync({ multiple: true, copyToCacheDirectory: true });
    if (res.canceled || !res.assets) return [];
    const pieces: PieceJointe[] = [];
    for (const a of res.assets) {
      const b64 = await FileSystem.readAsStringAsync(a.uri, { encoding: 'base64' as any });
      const mime = a.mimeType || 'application/octet-stream';
      pieces.push({
        id: pid(),
        nom: a.name || 'fichier',
        type: mime,
        taille: a.size || 0,
        dataUrl: `data:${mime};base64,${b64}`,
        creeLe: Date.now(),
      });
    }
    return pieces;
  } catch {
    return [];
  }
}

// Lit UN fichier texte (ex: .html). Web : input DOM. Natif : DocumentPicker.
export async function lireFichierTexte(
  accept = '.html,text/html'
): Promise<{ nom: string; contenu: string } | null> {
  if (Platform.OS !== 'web') return lireFichierTexteNatif();
  return new Promise((resolve) => {
    if (typeof document === 'undefined') {
      resolve(null);
      return;
    }
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = accept;
    // Sur mobile web, l'input doit être DANS le DOM pour que la sélection marche.
    input.style.position = 'fixed';
    input.style.opacity = '0';
    input.style.pointerEvents = 'none';
    let resolu = false;
    const nettoyer = () => {
      try { document.body.removeChild(input); } catch { /* déjà retiré */ }
    };
    const terminer = (val: { nom: string; contenu: string } | null) => {
      if (resolu) return;
      resolu = true;
      nettoyer();
      resolve(val);
    };
    input.onchange = () => {
      const f = (input.files || [])[0];
      if (!f) {
        terminer(null);
        return;
      }
      const reader = new FileReader();
      reader.onload = () => terminer({ nom: f.name, contenu: String(reader.result || '') });
      reader.onerror = () => terminer(null);
      reader.readAsText(f);
    };
    // Annulation : 'cancel' moderne + repli au retour de focus (promesse jamais
    // suspendue, input jamais laissé dans le DOM).
    input.oncancel = () => terminer(null);
    const surFocus = () => {
      window.removeEventListener('focus', surFocus);
      // Au retour de focus : annulation seulement si aucun fichier choisi.
      setTimeout(() => {
        if (!input.files || input.files.length === 0) terminer(null);
      }, 300);
    };
    window.addEventListener('focus', surFocus);
    document.body.appendChild(input);
    input.click();
  });
}

// Lecture d'un fichier texte en natif (Android/iOS).
async function lireFichierTexteNatif(): Promise<{ nom: string; contenu: string } | null> {
  try {
    const DocumentPicker = await import('expo-document-picker');
    const FileSystem = await import('expo-file-system');
    const res = await DocumentPicker.getDocumentAsync({
      type: ['text/html', 'text/plain', '*/*'],
      copyToCacheDirectory: true,
    });
    if (res.canceled || !res.assets?.[0]) return null;
    const a = res.assets[0];
    const contenu = await FileSystem.readAsStringAsync(a.uri, { encoding: 'utf8' as any });
    return { nom: a.name || 'fichier.html', contenu };
  } catch {
    return null;
  }
}

export function tailleLisible(octets: number): string {
  if (octets < 1024) return octets + ' o';
  if (octets < 1024 * 1024) return (octets / 1024).toFixed(0) + ' Ko';
  return (octets / 1024 / 1024).toFixed(1) + ' Mo';
}

// Construit le prompt complet (brief + remarques) à passer à un agent de code.
export function construirePromptComplet(uc: UseCase): string {
  const L: string[] = [];
  L.push('# Brief de prototype — ' + uc.titre);
  L.push('');
  L.push('Tu es un designer-développeur front-end de très haut niveau ET un consultant produit senior.');
  L.push('Construis un PROTOTYPE web de démonstration **bluffant** (un seul index.html auto-porté, CDN');
  L.push('autorisés pour polices/icônes/libs UI, données d\'exemple en dur, interactions réelles). Évite');
  L.push('l\'esthétique IA générique ; vise un rendu niveau studio primé, responsive et soigné.');
  L.push('');
  L.push('POSTURE D\'EXPERT : le client sait rarement exactement ce qu\'il veut, ou n\'en a qu\'une vision');
  L.push('limitée. Ne te limite PAS à sa demande littérale : enrichis-la. Propose des fonctionnalités,');
  L.push('écrans ou indicateurs à forte valeur auxquels il n\'a pas pensé mais qui servent clairement son');
  L.push('objectif métier, anticipe les besoins implicites du secteur, et fais-lui découvrir des');
  L.push('possibilités qu\'il n\'imaginait pas. Reste réaliste : chaque ajout doit avoir un sens métier');
  L.push('évident (pas de gadget).');
  L.push('');
  L.push('## Contexte métier');
  L.push('- Domaine : ' + uc.domaine);
  L.push('- Problème : ' + uc.probleme);
  L.push('- Objectif : ' + uc.objectif);
  L.push('- Utilisateurs cibles : ' + uc.utilisateurs);
  L.push('- Approche : ' + uc.approcheSuggeree);
  if (uc.kpis?.length) L.push('- KPIs à mettre en avant : ' + uc.kpis.join(', '));
  if (uc.processusADigitaliser?.length) {
    L.push('- Processus à digitaliser :');
    uc.processusADigitaliser.forEach((p) => L.push(`  • ${p}`));
  }
  if (uc.parcoursUtilisateur?.length) {
    L.push('- Parcours utilisateur à respecter :');
    uc.parcoursUtilisateur.forEach((e, i) => L.push(`  ${i + 1}. ${e}`));
  }
  if (uc.paysClient) L.push('- Pays du client : ' + uc.paysClient);
  if (uc.paysDeploiement) L.push('- Pays de déploiement (contraintes légales/langue/formats locaux) : ' + uc.paysDeploiement);
  if (uc.langues?.length) L.push('- Langues de l’interface : ' + uc.langues.join(', '));
  if (uc.donnees) L.push('- Données disponibles : ' + uc.donnees);
  if (uc.contraintes) L.push('- Contraintes : ' + uc.contraintes);
  if (uc.ventilationPrix) L.push('- Prix projet estimé : ' + uc.ventilationPrix.totalEur.toLocaleString('fr-FR') + ' MAD');
  if (uc.coutRun) {
    L.push('- Coût de RUN estimé : ' + uc.coutRun.cloudMensuelEur.toLocaleString('fr-FR') + ' MAD/mois (cloud) ou ' + uc.coutRun.onPremiseMensuelEur.toLocaleString('fr-FR') + ' MAD/mois (on-premise)');
  }
  if (uc.spec?.resume) L.push('- Résumé du prototype : ' + uc.spec.resume);
  if (uc.spec?.fonctionnalites?.length) {
    L.push('- Fonctionnalités à démontrer : ' + uc.spec.fonctionnalites.join(' ; '));
  }

  const remarques = (uc.remarques ?? []).map((r) => r.texte);
  if (remarques.length) {
    L.push('');
    L.push('## Remarques du client à intégrer EN PRIORITÉ (nouvelle version)');
    remarques.forEach((r, i) => L.push(`${i + 1}. ${r}`));
  }

  const pj = uc.piecesJointes ?? [];
  if (pj.length) {
    L.push('');
    L.push('## Pièces jointes fournies (dans le dossier /pieces-jointes du ZIP)');
    pj.forEach((p) => L.push(`- ${p.nom} (${p.type})`));
    L.push('');
    L.push('Respecte la charte graphique / le logo fournis (couleurs, typographie, ton).');
  }

  L.push('');
  L.push('## Valeur ajoutée attendue (expertise)');
  L.push('Au-delà du strict périmètre ci-dessus, intègre 2 à 4 éléments à forte valeur que le client');
  L.push('n\'a pas demandés mais qui renforcent son objectif (ex. tableau de bord, suggestions');
  L.push('intelligentes, automatisations, indicateurs clés, parcours simplifié…). Mets-les en évidence');
  L.push('pour qu\'il perçoive immédiatement la valeur supplémentaire.');
  L.push('');
  L.push('## Livrable');
  L.push('Un fichier index.html complet, prêt à ouvrir. Aucune question : décide et produis.');
  return L.join('\n');
}

// Construit le prompt de génération de l'APPLICATION FINALE (full-stack), à passer
// à Claude Code. Contrairement au prototype (1 index.html), ici on demande une vraie
// app conforme au standard GetExp (docs/STACK.md), adaptée à la cible de déploiement.
export function construirePromptAppFinale(uc: UseCase): string {
  const onPrem = uc.cibleDeploiement !== 'getexp'; // défaut : on-premise
  const ct = uc.cadrageTechnique;
  const L: string[] = [];

  L.push('# Brief APPLICATION FINALE — ' + uc.titre);
  L.push('');
  L.push('Tu es un ingénieur logiciel senior. Construis l\'APPLICATION DE PRODUCTION (pas un');
  L.push('prototype) en respectant STRICTEMENT le standard technique GetExp ci-dessous.');
  L.push('');
  L.push('## Standard technique GETEXP (impératif)');
  L.push('- Architecture : monolithe modulaire CONTENEURISÉ (Docker). Le MÊME artefact doit');
  L.push('  tourner on-premise ET sur Azure ; SEULE la config (.env) change, jamais le code.');
  L.push('- Frontend : React + TypeScript (Vite).');
  L.push('- Backend : Node/NestJS (TypeScript) par DÉFAUT ; Python/FastAPI UNIQUEMENT si le');
  L.push('  projet est fortement IA/ML/data/NLP (justifie le choix en tête du README).');
  L.push('- Base de données : PostgreSQL (migrations versionnées + seed de démo).');
  L.push('- Stockage fichiers : API compatible S3 (MinIO en local/on-prem, Azure Blob chez GetExp).');
  L.push('- Auth : JWT/OAuth2/OIDC, mots de passe hashés (argon2/bcrypt), tokens court + refresh.');
  L.push('- Sécurité : HTTPS, secrets via .env (jamais en dur), validation des entrées,');
  L.push('  requêtes paramétrées, en-têtes de sécurité, moindre privilège.');
  L.push('- Observabilité : endpoint /health, logs JSON structurés.');
  L.push('- Livraison : docker-compose tout-en-un (`docker compose up` démarre TOUT).');
  L.push('');
  L.push('## Arborescence attendue');
  L.push('docker-compose.yml, .env.example (100% de la config documentée), README.md (déploiement');
  L.push('client en <10 lignes), Makefile (up/down/seed/logs), frontend/ (Dockerfile+src),');
  L.push('backend/ (Dockerfile+src+migrations), db/init/, deploy/on-premise/, deploy/azure/.');
  L.push('');
  L.push('## Contexte métier');
  L.push('- Domaine : ' + uc.domaine);
  L.push('- Problème : ' + uc.probleme);
  L.push('- Objectif : ' + uc.objectif);
  L.push('- Utilisateurs cibles : ' + uc.utilisateurs);
  L.push('- Approche : ' + uc.approcheSuggeree);
  if (uc.processusADigitaliser?.length) {
    L.push('- Processus à digitaliser :');
    uc.processusADigitaliser.forEach((p) => L.push(`  • ${p}`));
  }
  if (uc.parcoursUtilisateur?.length) {
    L.push('- Parcours utilisateur (à implémenter fidèlement) :');
    uc.parcoursUtilisateur.forEach((e, i) => L.push(`  ${i + 1}. ${e}`));
  }
  if (uc.kpis?.length) L.push('- KPIs à exposer : ' + uc.kpis.join(', '));
  if (uc.langues?.length) L.push('- Langues de l’interface : ' + uc.langues.join(', '));
  if (uc.paysDeploiement) L.push('- Pays de déploiement (contraintes légales/langue/formats locaux) : ' + uc.paysDeploiement);
  if (uc.donnees) L.push('- Données disponibles : ' + uc.donnees);
  if (uc.contraintes) L.push('- Contraintes : ' + uc.contraintes);

  // Cible de déploiement + infra captée par l'IA architecte.
  L.push('');
  L.push('## Cible de déploiement : ' + (onPrem ? 'ON-PREMISE (infra du client)' : 'CHEZ GETEXP (Azure)'));
  if (onPrem) {
    L.push('Livre un package docker-compose AUTONOME qui démarre du premier coup chez le client,');
    L.push('en s\'adaptant à l\'infrastructure captée ci-dessous (BDD existante vs embarquée, SSO/LDAP');
    L.push('si présent, réseau/proxy/ports, stockage). Aucune dépendance cloud externe non validée.');
  } else {
    L.push('Cible Azure : Azure Container Apps (exécution), Azure Database for PostgreSQL (Flexible),');
    L.push('Azure Blob Storage (fichiers), Azure Key Vault (secrets), ACR (images). Fournis dans');
    L.push('deploy/azure/ les instructions/IaC de déploiement. Le code reste identique à l\'on-premise.');
  }
  if (ct) {
    L.push('');
    L.push('## Infrastructure captée par l\'architecte');
    L.push('- Hébergement : ' + ct.hebergement);
    L.push('- OS cible : ' + ct.os);
    L.push('- Conteneurisation : ' + ct.conteneurisation);
    L.push('- Base de données : ' + ct.baseDeDonnees);
    L.push('- Authentification : ' + ct.authentification);
    L.push('- Réseau : ' + ct.reseau);
    L.push('- Sécurité/conformité : ' + ct.contraintesSecu);
    L.push('- Format de livraison recommandé : ' + ct.formatLivraison);
    if (ct.prerequis?.length) L.push('- Prérequis client : ' + ct.prerequis.join(' ; '));
  }

  const remarques = (uc.remarques ?? []).map((r) => r.texte);
  if (remarques.length) {
    L.push('');
    L.push('## Remarques du client à intégrer EN PRIORITÉ');
    remarques.forEach((r, i) => L.push(`${i + 1}. ${r}`));
  }

  const pj = uc.piecesJointes ?? [];
  if (pj.length) {
    L.push('');
    L.push('## Pièces jointes fournies (dossier pieces-jointes/ du ZIP)');
    pj.forEach((p) => L.push(`- ${p.nom} (${p.type})`));
    L.push('Respecte la charte graphique / le logo fournis.');
  }

  L.push('');
  L.push('## Definition of Done');
  L.push('- `docker compose up` démarre l\'app complète sans intervention manuelle.');
  L.push('- .env.example documente 100% de la config. Migrations + seed de démo présents.');
  L.push('- /health OK, logs structurés, parcours principal couvert par des tests, CI verte.');
  L.push('- README : déploiement en <10 lignes. Le même artefact tourne on-premise ET sur Azure.');
  L.push('');
  L.push('Aucune question : décide selon le standard et produis le code complet de l\'application.');
  return L.join('\n');
}

function slugProjet(uc: UseCase): string {
  return (
    uc.titre.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 40) || 'projet'
  );
}

// Déclenche le téléchargement d'un fichier depuis une URL (blob ou data URL).
function declencherTelechargement(url: string, nom: string, revoke: boolean) {
  const a = document.createElement('a');
  a.href = url;
  a.download = nom;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  if (revoke) setTimeout(() => URL.revokeObjectURL(url), 2000);
}

/**
 * Télécharge le dossier projet en UN SEUL fichier ZIP contenant :
 *  - PROMPT.md (brief complet à passer à l'agent de code)
 *  - pieces-jointes/<nom> pour chaque fichier fourni par le client.
 * Renvoie le nombre de fichiers inclus (prompt + pièces jointes).
 */
export function telechargerDossierProjet(uc: UseCase): number {
  return telechargerPackage(uc, 'prototype');
}

// Package de l'APPLICATION FINALE (prompt full-stack conforme au standard) + pièces jointes.
export function telechargerPackageAppFinale(uc: UseCase): number {
  return telechargerPackage(uc, 'app');
}

function telechargerPackage(uc: UseCase, mode: 'prototype' | 'app'): number {
  if (Platform.OS !== 'web' || typeof document === 'undefined') return 0;
  const slug = slugProjet(uc);
  const enc = new TextEncoder();
  const prompt = mode === 'app' ? construirePromptAppFinale(uc) : construirePromptComplet(uc);
  const prefixe = mode === 'app' ? 'GetExp-APP' : 'GetExp';

  const fichiers: { nom: string; data: Uint8Array }[] = [
    { nom: 'PROMPT.md', data: enc.encode(prompt) },
  ];

  // Pièces jointes du client -> dossier pieces-jointes/ dans le ZIP.
  const pj = uc.piecesJointes ?? [];
  const noms = new Set<string>();
  for (const p of pj) {
    // Évite les collisions de noms.
    let nom = p.nom || 'fichier';
    if (noms.has(nom)) nom = `${Date.now().toString(36)}-${nom}`;
    noms.add(nom);
    try {
      fichiers.push({ nom: `pieces-jointes/${nom}`, data: dataUrlVersBytes(p.dataUrl) });
    } catch {
      /* pièce illisible : ignorée */
    }
  }

  const zip = construireZip(fichiers);
  const url = URL.createObjectURL(zip);
  declencherTelechargement(url, `${prefixe}-${slug}.zip`, true);
  return fichiers.length;
}
