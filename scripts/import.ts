// Importiert Kandidaten (aus dem Second Brain oder aus Gmail) in die Datendatei.
//
//   npm run import -- <kandidaten.json>
//   DATA_FILE=data/items.test.json npm run import -- data/import-beispiel.test.json
//
// Regeln: Gleiche quelle + quellId wie ein vorhandener Eintrag → überspringen
// (vorhandene Einträge werden nie verändert). Steht "<quelle>:<quellId>" in
// geloeschteQuellen → überspringen. Ungültige Kandidaten → überspringen.
// Ohne DATA_FILE wird in data/items.json geschrieben.
import { randomUUID } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { leseDaten, quellSchluessel, schreibeDaten, type Eintrag } from '../server/daten';
import { istGueltigeUhrzeit, istGueltigesDatum } from '../server/pruefung';

const projekt = resolve(import.meta.dirname, '..');
const dataFile = process.env.DATA_FILE ?? 'data/items.json';

function abbrechen(meldung: string): never {
  console.error(`Fehler: ${meldung}`);
  process.exit(1);
}

type Neu = Omit<Eintrag, 'id' | 'erledigt' | 'erstelltAm' | 'erledigtAm'>;

// Prüft einen Kandidaten. Liefert die bereinigten Felder oder null (ungültig).
function pruefeKandidat(k: unknown): Neu | null {
  if (typeof k !== 'object' || k === null || Array.isArray(k)) return null;
  const c = k as Record<string, unknown>;
  if (typeof c.titel !== 'string' || c.titel.trim() === '') return null;
  if (c.quelle !== 'second-brain' && c.quelle !== 'email') return null;
  if (typeof c.quellId !== 'string' || c.quellId.trim() === '') return null;
  if (c.info !== undefined && c.info !== null && typeof c.info !== 'string') return null;
  if (c.wichtig !== undefined && c.wichtig !== null && typeof c.wichtig !== 'boolean') return null;
  const datum = c.datum ?? null;
  if (datum !== null && (typeof datum !== 'string' || !istGueltigesDatum(datum))) return null;
  const uhrzeit = c.uhrzeit ?? null;
  if (uhrzeit !== null && (typeof uhrzeit !== 'string' || !istGueltigeUhrzeit(uhrzeit))) return null;
  return {
    titel: c.titel.trim(),
    info: typeof c.info === 'string' ? c.info.trim() : '',
    datum,
    // Uhrzeit gibt es nur zusammen mit einem Datum.
    uhrzeit: datum ? uhrzeit : null,
    wichtig: c.wichtig === true,
    quelle: c.quelle,
    quellId: c.quellId.trim(),
  };
}

async function main() {
  const pfad = process.argv[2];
  if (!pfad) {
    abbrechen('Bitte den Pfad zur Kandidatendatei angeben, z. B. „npm run import -- data/import-kandidaten.json“.');
  }

  // Zuerst die Kandidatendatei vollständig prüfen, erst dann die Datendatei anfassen.
  let text: string;
  try {
    text = await readFile(resolve(pfad), 'utf8');
  } catch (fehler) {
    const code = (fehler as NodeJS.ErrnoException).code;
    if (code === 'ENOENT') abbrechen(`Die Datei „${pfad}“ gibt es nicht.`);
    if (code === 'EISDIR') abbrechen(`„${pfad}“ ist ein Ordner, keine Datei.`);
    abbrechen(`Die Datei „${pfad}“ konnte nicht gelesen werden.`);
  }

  let kandidaten: unknown;
  try {
    kandidaten = JSON.parse(text);
  } catch {
    abbrechen(`Die Datei „${pfad}“ enthält kein gültiges JSON.`);
  }
  if (!Array.isArray(kandidaten)) {
    abbrechen(`Die Datei „${pfad}“ enthält keine Liste von Kandidaten (erwartet wird ein JSON-Array).`);
  }

  const zielPfad = resolve(projekt, dataFile);
  let daten;
  try {
    daten = await leseDaten(zielPfad);
  } catch {
    abbrechen(`Die Datendatei „${dataFile}“ konnte nicht gelesen werden.`);
  }

  const vorhanden = new Set(daten.items.map(quellSchluessel).filter((s): s is string => s !== null));
  const geloescht = new Set(daten.geloeschteQuellen);
  const zaehler = { neu: 0, vorhanden: 0, geloescht: 0, ungueltig: 0 };
  const jetzt = new Date().toISOString();

  for (const kandidat of kandidaten) {
    const felder = pruefeKandidat(kandidat);
    if (!felder) {
      zaehler.ungueltig++;
      continue;
    }
    const schluessel = quellSchluessel(felder)!;
    if (geloescht.has(schluessel)) {
      zaehler.geloescht++;
      continue;
    }
    // Vorhanden: schon in der Datendatei oder weiter oben in derselben Datei.
    if (vorhanden.has(schluessel)) {
      zaehler.vorhanden++;
      continue;
    }
    vorhanden.add(schluessel);
    daten.items.push({
      id: randomUUID(),
      titel: felder.titel,
      info: felder.info,
      datum: felder.datum,
      uhrzeit: felder.uhrzeit,
      wichtig: felder.wichtig,
      erledigt: false,
      erstelltAm: jetzt,
      erledigtAm: null,
      quelle: felder.quelle,
      quellId: felder.quellId,
    });
    zaehler.neu++;
  }

  if (zaehler.neu > 0) {
    // Direkt vor dem Schreiben neu lesen und nur die neuen Einträge anhängen,
    // damit zwischenzeitliche Änderungen der App erhalten bleiben.
    const neue = daten.items.slice(daten.items.length - zaehler.neu);
    const aktuell = await leseDaten(zielPfad);
    const jetztVorhanden = new Set(aktuell.items.map(quellSchluessel));
    aktuell.items.push(...neue.filter((e) => !jetztVorhanden.has(quellSchluessel(e))));
    await schreibeDaten(zielPfad, aktuell);
  }

  const uebersprungen = zaehler.vorhanden + zaehler.geloescht + zaehler.ungueltig;
  console.log(
    `Import: ${zaehler.neu} neu, ${uebersprungen} übersprungen ` +
      `(${zaehler.vorhanden} vorhanden, ${zaehler.geloescht} gelöscht, ${zaehler.ungueltig} ungültig)`,
  );
}

main().catch(() => abbrechen('Der Import ist fehlgeschlagen.'));
