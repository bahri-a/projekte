import { useEffect, useState } from 'react';
import { ladeEintraege } from './api';
import type { Eintrag } from './typen';
import { gruppiere, stichtage } from './zeit';

export default function App() {
  const [eintraege, setEintraege] = useState<Eintrag[] | null>(null);
  const [fehler, setFehler] = useState<string | null>(null);

  useEffect(() => {
    ladeEintraege()
      .then(setEintraege)
      .catch(() => setFehler('Die Einträge konnten nicht geladen werden.'));
  }, []);

  const gruppen = eintraege ? gruppiere(eintraege, stichtage()) : [];

  return (
    <main className="seite">
      {fehler && <p className="hinweis">{fehler}</p>}
      {eintraege && gruppen.length === 0 && <p className="hinweis">Nichts geplant.</p>}
      {gruppen.map((g) => (
        <section key={g.id} className="gruppe" aria-labelledby={`gruppe-${g.id}`}>
          <h2 id={`gruppe-${g.id}`} className="gruppe-titel">{g.titel}</h2>
          <ul className="liste">
            {g.eintraege.map((e) => (
              <li key={e.id} className="eintrag">
                <span className="titel">{e.titel}</span>
              </li>
            ))}
          </ul>
        </section>
      ))}
    </main>
  );
}
