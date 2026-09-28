// Setzt die Testdaten auf den Ausgangszustand zurück.
// Schreibt data/items.test.json (Testeinträge) und data/import-beispiel.test.json
// (Beispiel-Kandidaten für den Import-Befehl). Die Datumsangaben werden relativ
// zum heutigen Datum erzeugt, damit jede Zeitgruppe (Überfällig, Heute, Morgen,
// Diese Woche, Später, Ohne Datum) befüllt ist.
//
//   npm run testdata:reset                   20 Testeinträge (Standard)
//   npm run testdata:reset -- --leer         leere Datendatei (Leerzustand prüfen)
//   npm run testdata:reset -- --ohne-datei   Datendatei löschen (automatisches Anlegen prüfen)
//
// Mit der Umgebungsvariable HEUTE=YYYY-MM-DD lässt sich ein anderes „heute“ simulieren.
import { mkdirSync, rmSync, writeFileSync } from 'node:fs';

const ZIEL = 'data/items.test.json';
const BEISPIEL = 'data/import-beispiel.test.json';

const heute = process.env.HEUTE ? new Date(`${process.env.HEUTE}T00:00:00`) : new Date();
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
  quelle: Quelle;
  quellId: string | null;
}

function item(
  n: number,
  titel: string,
  opts: Partial<Omit<TestItem, 'id' | 'titel'>> = {},
): TestItem {
  // Eindeutige Erstellzeit pro Eintrag (vor 10 Tagen, n Minuten nach 9 Uhr),
  // damit die Sortierung „Ohne Datum: neueste zuerst“ eindeutig ist.
  const erstelltAm = `${tag(-10)}T09:${String(n).padStart(2, '0')}:00.000Z`;
  return {
    id: `test-${String(n).padStart(2, '0')}`,
    titel,
    info: '',
    datum: null,
    uhrzeit: null,
    wichtig: false,
    erledigt: false,
    erstelltAm,
    erledigtAm: null,
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
  // Diese Woche (am Samstag/Sonntag: Später)
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
  item(20,
    'Unterlagen für den Antrag auf Verlängerung des Aufenthaltstitels zusammenstellen, beglaubigen lassen und rechtzeitig vor dem Termin bei der Ausländerbehörde vollständig einreichen',
    { info: 'Langer Titel zum Prüfen des Zeilenumbruchs', datum: tag(18) },
  ),
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

// Beispiel-Kandidaten für Feature 12. Erwartetes Ergebnis gegen frische Testdaten:
// „Import: 3 neu, 9 übersprungen (4 vorhanden, 1 gelöscht, 4 ungültig)“
const kandidaten = [
  // neu
  { titel: 'Mietvertrag unterschreiben', info: 'Von: Hausverwaltung Berger · Betreff: Ihr neuer Mietvertrag',
    datum: tag(1), uhrzeit: '16:00', wichtig: true, quelle: 'email', quellId: 'msg-20b1a0c001' },
  { titel: 'Praktikumsbericht gliedern', info: 'Gliederung mit Betreuerin abstimmen',
    datum: null, uhrzeit: null, wichtig: false, quelle: 'second-brain', quellId: 'Studium-und-Beruf/wiki/praktikum.md' },
  { titel: 'Reisepass verlängern', info: 'Termin im Bürgeramt buchen',
    datum: tag(30), uhrzeit: null, wichtig: false, quelle: 'second-brain', quellId: 'Privat/wiki/reisen.md#reisepass' },
  // vorhanden (gleiche quelle + quellId, abweichender Titel/Datum)
  { titel: 'Prof. Keller antworten (neu)', info: 'Von: Prof. Keller · Betreff: Re: Themenvorschlag',
    datum: tag(3), uhrzeit: null, wichtig: true, quelle: 'email', quellId: 'msg-19a3f2c7e1' },
  // vorhanden, aber bereits erledigt
  { titel: 'Zur Klausur anmelden', info: 'Von: Prüfungsamt · Betreff: Erinnerung Anmeldefrist',
    datum: tag(2), uhrzeit: null, wichtig: true, quelle: 'email', quellId: 'msg-19a2e1d4b0' },
  // vorhanden (wird nach Löschen in der App zu „gelöscht“)
  { titel: 'Rundfunkbeitrag prüfen', info: 'Von: Beitragsservice · Betreff: Ihre Zahlungsaufforderung',
    datum: tag(1), uhrzeit: null, wichtig: true, quelle: 'email', quellId: 'msg-19a40b88d2' },
  // doppelt in derselben Kandidatendatei
  { titel: 'Reisepass verlängern', info: 'Duplikat innerhalb der Datei',
    datum: tag(30), uhrzeit: null, wichtig: false, quelle: 'second-brain', quellId: 'Privat/wiki/reisen.md#reisepass' },
  // gelöscht (steht in geloeschteQuellen)
  { titel: 'Gutschein einlösen', info: 'Von: Buchhandlung · Betreff: Ihr Gutschein',
    datum: tag(5), uhrzeit: null, wichtig: false, quelle: 'email', quellId: 'msg-19a1c0ffee' },
  // ungültig: leerer Titel
  { titel: '   ', info: '', datum: null, uhrzeit: null, wichtig: false, quelle: 'email', quellId: 'msg-20b1a0c002' },
  // ungültig: quelle nicht erlaubt
  { titel: 'Pflanzen gießen', info: '', datum: null, uhrzeit: null, wichtig: false, quelle: 'manuell', quellId: 'x-1' },
  // ungültig: quellId fehlt
  { titel: 'Paket abholen', info: 'Von: DHL', datum: tag(1), uhrzeit: null, wichtig: false, quelle: 'email' },
  // ungültig: Datum nicht im Format YYYY-MM-DD
  { titel: 'Seminar vorbereiten', info: '', datum: 'nächsten Freitag', uhrzeit: null, wichtig: false,
    quelle: 'second-brain', quellId: 'Studium-und-Beruf/wiki/seminar.md' },
];

const variante = process.argv.includes('--ohne-datei') ? 'ohne-datei'
  : process.argv.includes('--leer') ? 'leer' : 'standard';

mkdirSync('data', { recursive: true });
writeFileSync(BEISPIEL, JSON.stringify(kandidaten, null, 2) + '\n');

if (variante === 'ohne-datei') {
  rmSync(ZIEL, { force: true });
  console.log(`Testdaten entfernt: ${ZIEL} existiert nicht mehr`);
} else {
  const daten = variante === 'leer'
    ? { version: 1, items: [], geloeschteQuellen: [] }
    : {
        version: 1,
        items,
        // quelle:quellId gelöschter Import-Einträge; werden nie wieder importiert
        geloeschteQuellen: ['email:msg-19a1c0ffee'],
      };
  writeFileSync(ZIEL, JSON.stringify(daten, null, 2) + '\n');
  console.log(`Testdaten zurückgesetzt: ${ZIEL} (${daten.items.length} Einträge), ${BEISPIEL} (${kandidaten.length} Kandidaten)`);
}
