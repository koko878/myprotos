// Générateur de ZIP minimal, 100% JS, SANS dépendance ni compression (méthode
// "stored"). Suffisant pour empaqueter prompt + pièces jointes en un seul fichier
// téléchargeable. JSZip n'est pas utilisable sur web (manque setImmediate), d'où
// cette implémentation autonome conforme au format PKZIP (stored, no encryption).

interface Entree {
  nom: string;
  data: Uint8Array;
}

// CRC32 (table précalculée).
const TABLE_CRC = (() => {
  const t = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    t[n] = c >>> 0;
  }
  return t;
})();

function crc32(buf: Uint8Array): number {
  let c = 0xffffffff;
  for (let i = 0; i < buf.length; i++) c = TABLE_CRC[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

const enc = new TextEncoder();

function ecrireU16(arr: number[], v: number) {
  arr.push(v & 0xff, (v >>> 8) & 0xff);
}
function ecrireU32(arr: number[], v: number) {
  arr.push(v & 0xff, (v >>> 8) & 0xff, (v >>> 16) & 0xff, (v >>> 24) & 0xff);
}

/**
 * Construit un Blob ZIP à partir d'une liste de fichiers (nom + contenu binaire).
 * Méthode "stored" (compression 0) — aucune dépendance.
 */
export function construireZip(fichiers: { nom: string; data: Uint8Array }[]): Blob {
  const entrees: Entree[] = fichiers.map((f) => ({ nom: f.nom, data: f.data }));
  const morceaux: Uint8Array[] = [];
  const central: number[] = [];
  let offset = 0;

  for (const e of entrees) {
    const nomBytes = enc.encode(e.nom);
    const crc = crc32(e.data);
    const taille = e.data.length;

    // En-tête local
    const local: number[] = [];
    ecrireU32(local, 0x04034b50); // signature
    ecrireU16(local, 20); // version needed
    ecrireU16(local, 0); // flags
    ecrireU16(local, 0); // méthode = stored
    ecrireU16(local, 0); // heure
    ecrireU16(local, 0); // date
    ecrireU32(local, crc);
    ecrireU32(local, taille); // taille compressée
    ecrireU32(local, taille); // taille non compressée
    ecrireU16(local, nomBytes.length);
    ecrireU16(local, 0); // extra
    const localHeader = new Uint8Array(local);

    morceaux.push(localHeader, nomBytes, e.data);
    const tailleLocale = localHeader.length + nomBytes.length + taille;

    // Entrée du répertoire central
    ecrireU32(central, 0x02014b50);
    ecrireU16(central, 20); // version made by
    ecrireU16(central, 20); // version needed
    ecrireU16(central, 0); // flags
    ecrireU16(central, 0); // méthode
    ecrireU16(central, 0); // heure
    ecrireU16(central, 0); // date
    ecrireU32(central, crc);
    ecrireU32(central, taille);
    ecrireU32(central, taille);
    ecrireU16(central, nomBytes.length);
    ecrireU16(central, 0); // extra
    ecrireU16(central, 0); // commentaire
    ecrireU16(central, 0); // disque
    ecrireU16(central, 0); // attrs internes
    ecrireU32(central, 0); // attrs externes
    ecrireU32(central, offset); // offset de l'en-tête local
    for (let i = 0; i < nomBytes.length; i++) central.push(nomBytes[i]);

    offset += tailleLocale;
  }

  const centralBytes = new Uint8Array(central);
  const tailleCentral = centralBytes.length;

  // Fin du répertoire central (EOCD)
  const fin: number[] = [];
  ecrireU32(fin, 0x06054b50);
  ecrireU16(fin, 0); // disque
  ecrireU16(fin, 0); // disque début central
  ecrireU16(fin, entrees.length);
  ecrireU16(fin, entrees.length);
  ecrireU32(fin, tailleCentral);
  ecrireU32(fin, offset);
  ecrireU16(fin, 0); // commentaire
  const finBytes = new Uint8Array(fin);

  const parts = [...morceaux, centralBytes, finBytes] as unknown as BlobPart[];
  return new Blob(parts, { type: 'application/zip' });
}

// Convertit une data URL (base64) en Uint8Array.
export function dataUrlVersBytes(dataUrl: string): Uint8Array {
  const virgule = dataUrl.indexOf(',');
  const base64 = virgule >= 0 ? dataUrl.slice(virgule + 1) : dataUrl;
  const bin = atob(base64);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}
