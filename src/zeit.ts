// Zeitgruppen und Sortierung. Alle Datumsangaben sind lokale Kalendertage
// im Format YYYY-MM-DD und lassen sich deshalb als Text vergleichen.
import type { Eintrag } from './typen';

export type Gruppe = 'ueberfaellig' | 'heute' | 'morgen' | 'woche' | 'spaeter' | 'ohne';

export const GRUPPEN: { id: Gruppe; titel: string }[] = [
  { id: 'ueberfaellig', titel: 'Überfällig' },
  { id: 'heute', titel: 'Heute' },
  { id: 'morgen', titel: 'Morgen' },
  { id: 'woche', titel: 'Diese Woche' },
  { id: 'spaeter', titel: 'Später' },
  { id: 'ohne', titel: 'Ohne Datum' },
];

export function alsDatum(d: Date): string {
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${d.getFullYear()}-${mm}-${dd}`;
}

export function plusTage(basis: Date, tage: number): Date {
  const d = new Date(basis.getFullYear(), basis.getMonth(), basis.getDate());
  d.setDate(d.getDate() + tage);
  return d;
}

export interface Stichtage {
  gestern: string;
  heute: string;
  morgen: string;
  sonntag: string;
}

export function stichtage(jetzt: Date = new Date()): Stichtage {
  // Woche beginnt am Montag: Tage bis Sonntag (Sonntag selbst = 0).
  const bisSonntag = (7 - jetzt.getDay()) % 7;
  return {
    gestern: alsDatum(plusTage(jetzt, -1)),
    heute: alsDatum(jetzt),
    morgen: alsDatum(plusTage(jetzt, 1)),
    sonntag: alsDatum(plusTage(jetzt, bisSonntag)),
  };
}

export function gruppeVon(datum: string | null, t: Stichtage): Gruppe {
  if (!datum) return 'ohne';
  if (datum < t.heute) return 'ueberfaellig';
  if (datum === t.heute) return 'heute';
  if (datum === t.morgen) return 'morgen';
  if (datum <= t.sonntag) return 'woche';
  return 'spaeter';
}

// Nach Datum; bei gleichem Datum erst ohne Uhrzeit, dann nach Uhrzeit.
function nachDatum(a: Eintrag, b: Eintrag): number {
  if (a.datum !== b.datum) return (a.datum ?? '') < (b.datum ?? '') ? -1 : 1;
  if (a.uhrzeit !== b.uhrzeit) {
    if (a.uhrzeit === null) return -1;
    if (b.uhrzeit === null) return 1;
    return a.uhrzeit < b.uhrzeit ? -1 : 1;
  }
  return nachErstellt(a, b);
}

// Neueste zuerst; bei Gleichstand stabil nach id.
function nachErstellt(a: Eintrag, b: Eintrag): number {
  if (a.erstelltAm !== b.erstelltAm) return a.erstelltAm > b.erstelltAm ? -1 : 1;
  return a.id < b.id ? -1 : a.id > b.id ? 1 : 0;
}

export function gruppiere(eintraege: Eintrag[], t: Stichtage) {
  const offen = eintraege.filter((e) => !e.erledigt);
  return GRUPPEN.map((g) => ({
    ...g,
    eintraege: offen
      .filter((e) => gruppeVon(e.datum, t) === g.id)
      .sort(g.id === 'ohne' ? nachErstellt : nachDatum),
  })).filter((g) => g.eintraege.length > 0);
}

const WOCHENTAGE = ['So', 'Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa'];
const MONATE = ['Jan.', 'Feb.', 'März', 'Apr.', 'Mai', 'Juni', 'Juli', 'Aug.', 'Sept.', 'Okt.', 'Nov.', 'Dez.'];

// „gestern“, „heute“, „morgen“, sonst „Fr, 3. Okt.“ (mit Jahr, wenn es nicht
// das laufende ist). Mit Uhrzeit angehängt: „morgen, 10:00“. Unter „Heute“
// steht nur die Uhrzeit.
export function datumsText(e: Pick<Eintrag, 'datum' | 'uhrzeit'>, t: Stichtage): string {
  if (!e.datum) return '';
  if (e.datum === t.heute && e.uhrzeit) return e.uhrzeit;
  let text: string;
  if (e.datum === t.gestern) text = 'gestern';
  else if (e.datum === t.heute) text = 'heute';
  else if (e.datum === t.morgen) text = 'morgen';
  else {
    const [jahr, monat, tag] = e.datum.split('-').map(Number);
    const wochentag = WOCHENTAGE[new Date(jahr, monat - 1, tag).getDay()];
    text = `${wochentag}, ${tag}. ${MONATE[monat - 1]}`;
    if (e.datum.slice(0, 4) !== t.heute.slice(0, 4)) text += ` ${jahr}`;
  }
  return e.uhrzeit ? `${text}, ${e.uhrzeit}` : text;
}
