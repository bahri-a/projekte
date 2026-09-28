import { useEffect, useState } from 'react';
import { ladeEintraege } from './api';
import Herkunft from './Herkunft';
import type { Eintrag } from './typen';
import { datumsText, gruppiere, stichtage, type Stichtage } from './zeit';

// Liefert die Stichtage und aktualisiert sie, sobald ein neuer Tag beginnt,
// damit die Gruppen auch bei offen gelassener Seite stimmen.
function useStichtage(): Stichtage {
  const [t, setT] = useState(stichtage);
  useEffect(() => {
    const id = setInterval(() => {
      setT((alt) => {
        const neu = stichtage();
        return neu.heute === alt.heute ? alt : neu;
      });
    }, 60_000);
    return () => clearInterval(id);
  }, []);
  return t;
}

export default function App() {
  const [eintraege, setEintraege] = useState<Eintrag[] | null>(null);
  const [fehler, setFehler] = useState<string | null>(null);
  const t = useStichtage();

  useEffect(() => {
    ladeEintraege()
      .then(setEintraege)
      .catch(() => setFehler('Die Einträge konnten nicht geladen werden.'));
  }, []);

  const gruppen = eintraege ? gruppiere(eintraege, t) : [];

  return (
    <main className="seite">
      {fehler && <p className="hinweis">{fehler}</p>}
      {eintraege && gruppen.length === 0 && <p className="hinweis">Nichts geplant.</p>}
      {gruppen.map((g) => (
        <section key={g.id} className="gruppe" aria-labelledby={`gruppe-${g.id}`}>
          <h2 id={`gruppe-${g.id}`} className="gruppe-titel">{g.titel}</h2>
          <ul className="liste">
            {g.eintraege.map((e) => (
              <li
                key={e.id}
                className={['eintrag', e.wichtig && 'wichtig', g.id === 'ueberfaellig' && 'ueberfaellig']
                  .filter(Boolean)
                  .join(' ')}
              >
                {e.wichtig && <span className="wichtig-punkt" title="Wichtig" aria-label="Wichtig" role="img" />}
                <div className="inhalt">
                  <div className="titel">
                    {e.titel}
                    <Herkunft quelle={e.quelle} />
                  </div>
                  {e.info && <div className="info">{e.info}</div>}
                </div>
                {e.datum && <div className="datum">{datumsText(e, t)}</div>}
              </li>
            ))}
          </ul>
        </section>
      ))}
    </main>
  );
}
