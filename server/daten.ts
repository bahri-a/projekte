// Datenhaltung: liest und schreibt die JSON-Datendatei.
// Die Datei wird bei jedem Zugriff neu gelesen (kein Zwischenspeicher), damit
// Importe ohne Neustart sichtbar werden und nicht durch einen veralteten Stand
// überschrieben werden. Geschrieben wird atomar (temporäre Datei + Umbenennen).
import { randomBytes } from 'node:crypto';
import { mkdir, readFile, rename, rm, writeFile } from 'node:fs/promises';
import { dirname } from 'node:path';

export type Quelle = 'manuell' | 'second-brain' | 'email';

export interface Eintrag {
  id: string;
  titel: string;
  info: string;
  datum: string | null;
  uhrzeit: string | null;
  wichtig: boolean;
  erledigt: boolean;
  erstelltAm: string;
  erledigtAm: string | null;
  quelle: Quelle;
  quellId: string | null;
}

export interface Daten {
  version: 1;
  items: Eintrag[];
  geloeschteQuellen: string[];
}

// Schlüssel, unter dem ein importierter Eintrag in geloeschteQuellen steht.
export function quellSchluessel(e: Pick<Eintrag, 'quelle' | 'quellId'>): string | null {
  return e.quellId && e.quelle !== 'manuell' ? `${e.quelle}:${e.quellId}` : null;
}

function leer(): Daten {
  return { version: 1, items: [], geloeschteQuellen: [] };
}

function istFehlend(fehler: unknown): boolean {
  return (fehler as NodeJS.ErrnoException)?.code === 'ENOENT';
}

export async function schreibeDaten(pfad: string, daten: Daten): Promise<void> {
  await mkdir(dirname(pfad), { recursive: true });
  const temp = `${pfad}.${process.pid}.${randomBytes(4).toString('hex')}.tmp`;
  try {
    await writeFile(temp, JSON.stringify(daten, null, 2) + '\n');
    await rename(temp, pfad);
  } catch (fehler) {
    await rm(temp, { force: true });
    throw fehler;
  }
}

// Legt die Datei leer an, falls sie fehlt. Eine vorhandene Datei bleibt unberührt.
export async function stelleDateiSicher(pfad: string): Promise<boolean> {
  try {
    await readFile(pfad);
    return false;
  } catch (fehler) {
    if (!istFehlend(fehler)) throw fehler;
    await schreibeDaten(pfad, leer());
    return true;
  }
}

export async function leseDaten(pfad: string): Promise<Daten> {
  let text: string;
  try {
    text = await readFile(pfad, 'utf8');
  } catch (fehler) {
    if (!istFehlend(fehler)) throw fehler;
    await schreibeDaten(pfad, leer());
    return leer();
  }
  const daten = JSON.parse(text) as Partial<Daten>;
  if (!daten || !Array.isArray(daten.items)) {
    throw new Error(`Die Datendatei ${pfad} hat kein gültiges Format.`);
  }
  return {
    version: 1,
    items: daten.items,
    geloeschteQuellen: Array.isArray(daten.geloeschteQuellen) ? daten.geloeschteQuellen : [],
  };
}

// Änderungen nacheinander ausführen, damit sich zwei gleichzeitige Anfragen
// nicht gegenseitig überschreiben.
let warteschlange: Promise<unknown> = Promise.resolve();

export function aendereDaten<T>(pfad: string, aenderung: (daten: Daten) => T): Promise<T> {
  const lauf = warteschlange.then(async () => {
    const daten = await leseDaten(pfad);
    const ergebnis = aenderung(daten);
    await schreibeDaten(pfad, daten);
    return ergebnis;
  });
  warteschlange = lauf.catch(() => {});
  return lauf;
}
