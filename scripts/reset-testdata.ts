// Setzt data/items.test.json auf den Ausgangszustand zurück.
// Die Daten werden relativ zum heutigen Datum erzeugt, damit jede Zeitgruppe
// (Überfällig, Heute, Morgen, Diese Woche, Später, Ohne Datum) immer befüllt ist.
// Aufruf: npm run testdata:reset   (mit --if-missing: nur anlegen, wenn die Datei fehlt)
import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { dirname } from 'node:path';

const ZIEL = 'data/items.test.json';

if (process.argv.includes('--if-missing') && existsSync(ZIEL)) {
  process.exit(0);
}

const heute = new Date();
heute.setHours(0, 0, 0, 0);

function tag(offset: number): string {
  const d = new Date(heute);
  d.setDate(d.getDate() + offset);
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${d.getFullYear()}-${mm}-${dd}`;
}

// Tage bis Sonntag dieser Woche (Montag = Wochenbeginn). Mindestens 2, damit
// „Diese Woche“ nicht mit „Morgen“ zusammenfällt; am Samstag/Sonntag fällt der
// Eintrag dann bewusst in „Später“.
const bisSonntag = (7 - heute.getDay()) % 7;
const dieseWoche = Math.max(2, Math.min(bisSonntag, 4));

const erstellt = `${tag(-10)}T09:00:00.000Z`;

type Quelle = 'manuell' | 'second-brain' | 'email';
interface TestItem {
  id: string;
  titel: string;
  info: string;
  datum: string | null;
  uhrzeit: string | null;
  wichtig: boolean;
  erledigt: boolean;
  erstelltAm: string;
  erledigtAm: string | null;
  bearbeitetAm: string | null;
  quelle: Quelle;
  quellId: string | null;
}

function item(
  n: number,
  titel: string,
  opts: Partial<Omit<TestItem, 'id' | 'titel'>> = {},
): TestItem {
  return {
    id: `test-${String(n).padStart(2, '0')}`,
    titel,
    info: '',
    datum: null,
    uhrzeit: null,
    wichtig: false,
    erledigt: false,
    erstelltAm: erstellt,
    erledigtAm: null,
    bearbeitetAm: null,
    quelle: 'manuell',
    quellId: null,
    ...opts,
  };
}

const items: TestItem[] = [
  // Überfällig
  item(1, 'Hausarbeit Statistik abgeben', {
    info: 'Abgabe über Moodle, PDF mit Deckblatt',
    datum: tag(-2), wichtig: true, quelle: 'second-brain',
    quellId: 'Studium-und-Beruf/wiki/statistik.md',
  }),
  item(2, 'Rückmeldung an Vermieter wegen Heizung', { datum: tag(-1) }),
  // Heute
  item(3, 'Zahnarzttermin', {
    info: 'Praxis Dr. Albers, Versichertenkarte mitnehmen',
    datum: tag(0), uhrzeit: '14:30', wichtig: true,
  }),
  item(4, 'Wäsche abholen', { datum: tag(0) }),
  item(5, 'Antwort an Prof. Keller zum Themenvorschlag', {
    info: 'Von: Prof. Keller · Betreff: Themenvorschlag Seminararbeit',
    datum: tag(0), uhrzeit: '18:00', quelle: 'email', quellId: 'msg-19a3f2c7e1',
  }),
  // Morgen
  item(6, 'Lerngruppe Makroökonomie', {
    info: 'Bibliothek, Raum 2.14',
    datum: tag(1), uhrzeit: '10:00',
  }),
  item(7, 'Rundfunkbeitrag prüfen', {
    info: 'Von: Beitragsservice · Betreff: Ihre Zahlungsaufforderung',
    datum: tag(1), wichtig: true, quelle: 'email', quellId: 'msg-19a40b88d2',
  }),
  // Diese Woche
  item(8, 'Bewerbung Werkstudentenstelle fertigstellen', {
    info: 'Anschreiben und Lebenslauf aktualisieren',
    datum: tag(dieseWoche), wichtig: true, quelle: 'second-brain',
    quellId: 'Studium-und-Beruf/wiki/bewerbungen.md',
  }),
  item(9, 'Geburtstagsgeschenk für Mama besorgen', { datum: tag(dieseWoche) }),
  // Später
  item(10, 'Klausur Makroökonomie', {
    info: 'Hörsaal A, Taschenrechner erlaubt',
    datum: tag(12), uhrzeit: '09:00', wichtig: true,
  }),
  item(11, 'Steuererklärung vorbereiten', {
    info: 'Belege aus dem Ordner „Steuer 2025“ sammeln',
    datum: tag(25), quelle: 'second-brain', quellId: 'Privat/wiki/finanzen.md',
  }),
  item(12, 'Handyvertrag kündigen', { datum: tag(40) }),
  // Ohne Datum
  item(13, 'Umzugskartons besorgen'),
  item(14, 'Buch „Atomic Habits“ zu Ende lesen', { info: 'Ab Kapitel 9' }),
  item(15, 'Portfolio-Website überarbeiten', {
    info: 'Projekte aus dem Sommersemester ergänzen',
    quelle: 'second-brain', quellId: 'Studium-und-Beruf/wiki/portfolio.md',
  }),
  item(16, 'Fahrrad reparieren lassen'),
  // Erledigt
  item(17, 'Semesterbeitrag überweisen', {
    datum: tag(-3), erledigt: true, erledigtAm: `${tag(-4)}T16:12:00.000Z`,
  }),
  item(18, 'Bibliotheksbücher zurückgeben', {
    erledigt: true, erledigtAm: `${tag(-1)}T11:40:00.000Z`,
  }),
  item(19, 'Anmeldung zur Klausur Makroökonomie', {
    info: 'Von: Prüfungsamt · Betreff: Anmeldefrist Wintersemester',
    datum: tag(-5), wichtig: true, erledigt: true,
    erledigtAm: `${tag(-6)}T08:05:00.000Z`, quelle: 'email', quellId: 'msg-19a2e1d4b0',
  }),
];

const daten = {
  version: 1,
  items,
  // quelle:quellId gelöschter Import-Einträge; werden nie wieder importiert
  geloeschteQuellen: ['email:msg-19a1c0ffee'],
};

mkdirSync(dirname(ZIEL), { recursive: true });
writeFileSync(ZIEL, JSON.stringify(daten, null, 2) + '\n');
console.log(`Testdaten zurückgesetzt: ${ZIEL} (${items.length} Einträge)`);
