// Speichert alle Daten im Browser (localStorage). Die Funktionen sind
// asynchron geblieben, damit die Oberfläche unverändert bleibt.
import * as bestand from './daten/bestand';
import type { Daten, ImportErgebnis } from './daten/bestand';
import type { Eintrag } from './typen';

const SCHLUESSEL = 'projekte-daten';

function lies(): Daten {
  const text = localStorage.getItem(SCHLUESSEL);
  if (text === null) return bestand.leer();
  const daten = bestand.ausText(text);
  if (!daten) throw new Error('Die gespeicherten Daten haben kein gültiges Format.');
  return daten;
}

// Liest den aktuellen Stand, ändert ihn und speichert ihn. Da jedes Mal neu
// gelesen wird, überschreibt ein zweiter offener Tab keine neueren Daten.
async function aendereDaten<T>(aenderung: (daten: Daten) => T): Promise<T> {
  const daten = lies();
  const ergebnis = aenderung(daten);
  localStorage.setItem(SCHLUESSEL, JSON.stringify(daten));
  return ergebnis;
}

// Bittet Chrome, die Daten nicht bei Speicherknappheit zu löschen.
export function bitteUmDauerhaftenSpeicher(): void {
  navigator.storage?.persist?.().catch(() => {});
}

export async function ladeEintraege(): Promise<Eintrag[]> {
  return lies().items;
}

export interface NeueFelder {
  titel: string;
  info: string;
  datum: string | null;
  uhrzeit: string | null;
  wichtig: boolean;
}

export function legeAn(felder: NeueFelder): Promise<Eintrag> {
  return aendereDaten((d) => bestand.legeAn(d, felder));
}

export function setzeErledigt(id: string, erledigt: boolean): Promise<Eintrag> {
  return aendereDaten((d) => bestand.aendere(d, id, { erledigt }));
}

export function aendere(id: string, felder: Partial<NeueFelder>): Promise<Eintrag> {
  return aendereDaten((d) => bestand.aendere(d, id, felder));
}

export interface Geloescht {
  eintrag: Eintrag;
  index: number;
}

export function loesche(id: string): Promise<Geloescht> {
  return aendereDaten((d) => bestand.loesche(d, id));
}

export function stelleWiederHer(geloescht: Geloescht): Promise<Eintrag> {
  return aendereDaten((d) => bestand.stelleWiederHer(d, geloescht));
}

export function importiere(inhalt: unknown): Promise<ImportErgebnis> {
  return aendereDaten((d) => bestand.importiere(d, inhalt));
}

// Alle Daten als Text für die Sicherungsdatei.
export function sicherung(): string {
  return JSON.stringify(lies(), null, 2) + '\n';
}
