import { randomUUID } from 'node:crypto';
import { resolve } from 'node:path';
import express, { type ErrorRequestHandler } from 'express';
import { aendereDaten, leseDaten, stelleDateiSicher, type Eintrag } from './daten';
import { pruefeAenderung, pruefeNeuenEintrag } from './pruefung';

const port = Number(process.env.PORT ?? 3280);
// Relativ zum Projektordner, unabhängig davon, von wo der Server gestartet wird.
const dataFile = process.env.DATA_FILE ?? 'data/items.json';
const dataPath = resolve(import.meta.dirname, '..', dataFile);

const app = express();
app.use(express.json());

app.get('/api/health', (_req, res) => {
  res.json({ ok: true, dataFile });
});

app.get('/api/items', async (_req, res) => {
  const daten = await leseDaten(dataPath);
  res.json(daten.items);
});

app.post('/api/items', async (req, res) => {
  const pruefung = pruefeNeuenEintrag(req.body);
  if (!pruefung.ok) {
    res.status(400).json({ fehler: pruefung.fehler });
    return;
  }
  const eintrag: Eintrag = {
    id: randomUUID(),
    ...pruefung.felder,
    erledigt: false,
    erstelltAm: new Date().toISOString(),
    erledigtAm: null,
    quelle: 'manuell',
    quellId: null,
  };
  await aendereDaten(dataPath, (daten) => {
    daten.items.push(eintrag);
  });
  res.status(201).json(eintrag);
});

app.patch('/api/items/:id', async (req, res) => {
  const pruefung = pruefeAenderung(req.body);
  if (!pruefung.ok) {
    res.status(400).json({ fehler: pruefung.fehler });
    return;
  }
  const { erledigt, ...felder } = pruefung.aenderung;
  const eintrag = await aendereDaten(dataPath, (daten) => {
    const e = daten.items.find((x) => x.id === req.params.id);
    if (!e) return null;
    Object.assign(e, felder);
    // Uhrzeit gibt es nur zusammen mit einem Datum.
    if (!e.datum) e.uhrzeit = null;
    if (erledigt !== undefined && erledigt !== e.erledigt) {
      e.erledigt = erledigt;
      e.erledigtAm = erledigt ? new Date().toISOString() : null;
    }
    return e;
  });
  if (!eintrag) {
    res.status(404).json({ fehler: 'Diesen Eintrag gibt es nicht.' });
    return;
  }
  res.json(eintrag);
});

app.use('/api', (_req, res) => {
  res.status(404).json({ fehler: 'Unbekannte Adresse.' });
});

const fehlerBehandlung: ErrorRequestHandler = (fehler, _req, res, _next) => {
  if (fehler?.type === 'entity.parse.failed') {
    res.status(400).json({ fehler: 'Die Anfrage enthält kein gültiges JSON.' });
    return;
  }
  console.error(fehler);
  res.status(500).json({ fehler: 'Die Daten konnten nicht gelesen oder gespeichert werden.' });
};
app.use(fehlerBehandlung);

if (await stelleDateiSicher(dataPath)) {
  console.log(`Datendatei angelegt: ${dataFile}`);
}

app.listen(port, () => {
  console.log(`API läuft auf http://localhost:${port} (Daten: ${dataFile})`);
});
