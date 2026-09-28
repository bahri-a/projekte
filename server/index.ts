import express from 'express';

const port = Number(process.env.PORT ?? 3280);
const dataFile = process.env.DATA_FILE ?? 'data/items.json';

const app = express();
app.use(express.json());

app.get('/api/health', (_req, res) => {
  res.json({ ok: true, dataFile });
});

app.listen(port, () => {
  console.log(`API läuft auf http://localhost:${port} (Daten: ${dataFile})`);
});
