// Kleiner Helfer für den Knopf „Aktualisieren“ in der App.
// Läuft nur auf diesem Mac (127.0.0.1) und kann genau eine Sache: Claude im
// Hintergrund /projekte-import ausführen lassen und die gefundenen
// Kandidaten an die App zurückgeben. Gmail und Second Brain nur lesend.
//
//   node scripts/helfer.mjs
//
// Umgebungsvariablen: SECOND_BRAIN (Pfad, Pflicht), CLAUDE_BIN (Standard
// „claude“), HELFER_PORT (Standard 3290).
import { spawn } from 'node:child_process';
import { readFile, rm } from 'node:fs/promises';
import { createServer } from 'node:http';
import { resolve } from 'node:path';

const PORT = Number(process.env.HELFER_PORT ?? 3290);
const CLAUDE = process.env.CLAUDE_BIN ?? 'claude';
const SECOND_BRAIN = process.env.SECOND_BRAIN;
const PROJEKT = resolve(import.meta.dirname, '..');
const DATEI = resolve(PROJEKT, 'data/import-kandidaten.json');
const HOECHSTDAUER = 10 * 60 * 1000;
// Reicht für „lesen, einordnen, Titel formulieren“ und ist günstiger als
// das Standardmodell der Sitzung.
const MODELL = process.env.HELFER_MODELL ?? 'claude-haiku-4-5-20251001';
// Verhindert, dass ein Doppelklick oder ein zweiter Aufruf kurz nach dem
// letzten Lauf Second Brain, Outlook und Gmail noch einmal komplett neu
// lesen und dabei Tokens verdoppeln lässt.
const SPERRFRIST = 10 * 60 * 1000;
let letzterLauf = 0;

// Nur die App selbst darf den Helfer ansprechen.
const ERLAUBT = new Set(['https://bahri-a.github.io', 'http://localhost:5280', 'http://localhost:5281']);

// Claude darf nur lesen und nur die Kandidatendatei schreiben.
const WERKZEUGE = [
  'Read',
  'Glob',
  'Grep',
  // „//“ am Anfang heißt: absoluter Pfad. Write-Rechte laufen über Edit-Regeln.
  `Edit(/${DATEI})`,
  'mcp__claude_ai_Gmail__search_threads',
  'mcp__claude_ai_Gmail__get_thread',
  'mcp__claude_ai_Gmail__get_message',
  'mcp__claude_ai_Gmail__list_labels',
];

// Aus dem Outlook-Ordner nur emails.json, nie die Zugangsdaten-Datei.
const GESPERRT = [`Read(/${SECOND_BRAIN}/Privat/emails/oauth.json)`];

let laeuft = false;

function fuehreImportAus() {
  return new Promise((ok, fehler) => {
    const kind = spawn(
      CLAUDE,
      ['-p', '/projekte-import', '--model', MODELL, '--allowedTools', ...WERKZEUGE, '--disallowedTools', ...GESPERRT, '--add-dir', SECOND_BRAIN, '--output-format', 'json'],
      { cwd: PROJEKT, stdio: ['ignore', 'pipe', 'pipe'] },
    );
    let ausgabe = '';
    kind.stdout.on('data', (d) => (ausgabe += d));
    kind.stderr.on('data', (d) => process.stderr.write(d));
    const uhr = setTimeout(() => kind.kill(), HOECHSTDAUER);
    kind.on('error', () => fehler(new Error('Claude konnte nicht gestartet werden.')));
    kind.on('close', (code) => {
      clearTimeout(uhr);
      let ergebnis = null;
      try {
        ergebnis = JSON.parse(ausgabe);
      } catch {}
      if (code !== 0 || !ergebnis || ergebnis.is_error) {
        fehler(new Error('Die Suche im Second Brain und in Gmail ist fehlgeschlagen.'));
      } else {
        ok(ergebnis);
      }
    });
  });
}

function antworte(res, status, daten) {
  res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8' });
  res.end(JSON.stringify(daten));
}

const server = createServer(async (req, res) => {
  const herkunft = req.headers.origin;
  if (!herkunft || !ERLAUBT.has(herkunft)) {
    antworte(res, 403, { fehler: 'Nicht erlaubt.' });
    return;
  }
  res.setHeader('Access-Control-Allow-Origin', herkunft);
  res.setHeader('Vary', 'Origin');

  if (req.method === 'OPTIONS') {
    res.writeHead(204, {
      'Access-Control-Allow-Methods': 'POST',
      'Access-Control-Allow-Private-Network': 'true',
    });
    res.end();
    return;
  }
  if (req.method !== 'POST' || req.url !== '/aktualisieren') {
    antworte(res, 404, { fehler: 'Unbekannte Adresse.' });
    return;
  }
  if (laeuft) {
    antworte(res, 409, { fehler: 'Die Aktualisierung läuft bereits.' });
    return;
  }
  const seitLetztem = Date.now() - letzterLauf;
  if (seitLetztem < SPERRFRIST) {
    const minuten = Math.ceil((SPERRFRIST - seitLetztem) / 60000);
    antworte(res, 429, {
      fehler: `Gerade erst aktualisiert. Bitte in etwa ${minuten} Minute${minuten === 1 ? '' : 'n'} erneut versuchen.`,
    });
    return;
  }

  laeuft = true;
  console.log(`${new Date().toLocaleString('de-DE')} Aktualisierung gestartet`);
  try {
    await rm(DATEI, { force: true });
    await fuehreImportAus();
    const kandidaten = JSON.parse(await readFile(DATEI, 'utf8'));
    if (!Array.isArray(kandidaten)) throw new Error('Claude hat keine gültige Kandidatenliste geschrieben.');
    console.log(`${kandidaten.length} Kandidaten gefunden`);
    letzterLauf = Date.now();
    antworte(res, 200, kandidaten);
  } catch (fehler) {
    const meldung = fehler?.code === 'ENOENT'
      ? 'Claude hat keine Kandidatendatei geschrieben.'
      : fehler instanceof SyntaxError
        ? 'Claude hat keine gültige Kandidatenliste geschrieben.'
        : fehler.message;
    console.error(meldung);
    antworte(res, 500, { fehler: meldung });
  } finally {
    laeuft = false;
  }
});

if (!SECOND_BRAIN) {
  console.error('Bitte SECOND_BRAIN auf den Pfad zum Second Brain setzen.');
  process.exit(1);
}

server.listen(PORT, '127.0.0.1', () => {
  console.log(`Helfer läuft auf http://127.0.0.1:${PORT}`);
});
