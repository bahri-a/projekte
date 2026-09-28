import { useCallback, useEffect, useRef, useState } from 'react';
import { ladeEintraege, legeAn, setzeErledigt, type NeueFelder } from './api';
import Eingabe from './Eingabe';
import Erledigte from './Erledigte';
import Hinweis, { type HinweisDaten } from './Hinweis';
import type { Eintrag } from './typen';
import { gruppiere, stichtage, type Stichtage } from './zeit';
import Zeile from './Zeile';

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
  const [hinweis, setHinweis] = useState<HinweisDaten | null>(null);
  const hinweisNr = useRef(0);
  // Laufende Nummer je Eintrag: Nur die Antwort auf die letzte Änderung wird
  // übernommen, damit eine späte Antwort ein „Rückgängig“ nicht überschreibt.
  const aenderungsNr = useRef(new Map<string, number>());
  const t = useStichtage();

  useEffect(() => {
    ladeEintraege()
      .then(setEintraege)
      .catch(() => setFehler('Die Einträge konnten nicht geladen werden.'));
  }, []);

  function ersetze(neu: Eintrag) {
    setEintraege((alt) => (alt ?? []).map((e) => (e.id === neu.id ? neu : e)));
  }

  function zeigeHinweis(text: string, onRueckgaengig: () => void) {
    hinweisNr.current += 1;
    setHinweis({ nr: hinweisNr.current, text, onRueckgaengig });
  }

  const schliesseHinweis = useCallback(() => setHinweis(null), []);

  // Der Eintrag erscheint sofort und wird nach der Antwort des Servers ersetzt.
  async function hinzufuegen(felder: NeueFelder): Promise<boolean> {
    const vorlaeufig: Eintrag = {
      id: `neu-${crypto.randomUUID()}`,
      ...felder,
      erledigt: false,
      erstelltAm: new Date().toISOString(),
      erledigtAm: null,
      quelle: 'manuell',
      quellId: null,
    };
    setEintraege((alt) => [...(alt ?? []), vorlaeufig]);
    try {
      const gespeichert = await legeAn(felder);
      setEintraege((alt) => (alt ?? []).map((e) => (e.id === vorlaeufig.id ? gespeichert : e)));
      setFehler(null);
      return true;
    } catch {
      setEintraege((alt) => (alt ?? []).filter((e) => e.id !== vorlaeufig.id));
      setFehler('Der Eintrag konnte nicht gespeichert werden.');
      return false;
    }
  }

  // Setzt „erledigt“ sofort in der Liste und speichert es; bei einem Fehler
  // wird der alte Stand wiederhergestellt.
  async function setzeStatus(eintrag: Eintrag, erledigt: boolean) {
    const nr = (aenderungsNr.current.get(eintrag.id) ?? 0) + 1;
    aenderungsNr.current.set(eintrag.id, nr);
    const aktuell = () => aenderungsNr.current.get(eintrag.id) === nr;
    ersetze({ ...eintrag, erledigt, erledigtAm: erledigt ? new Date().toISOString() : null });
    try {
      const gespeichert = await setzeErledigt(eintrag.id, erledigt);
      if (aktuell()) ersetze(gespeichert);
      setFehler(null);
    } catch {
      if (aktuell()) ersetze({ ...eintrag, erledigt: !erledigt, erledigtAm: erledigt ? null : eintrag.erledigtAm });
      setFehler('Die Änderung konnte nicht gespeichert werden.');
    }
  }

  function abhaken(eintrag: Eintrag) {
    void setzeStatus(eintrag, true);
    zeigeHinweis('Erledigt', () => void setzeStatus(eintrag, false));
  }

  const gruppen = eintraege ? gruppiere(eintraege, t) : [];

  return (
    <main className="seite">
      <Eingabe onHinzufuegen={hinzufuegen} />
      {fehler && <p className="meldung">{fehler}</p>}
      {eintraege && gruppen.length === 0 && <p className="meldung">Nichts geplant.</p>}
      {gruppen.map((g) => (
        <section key={g.id} className="gruppe" aria-labelledby={`gruppe-${g.id}`}>
          <h2 id={`gruppe-${g.id}`} className="gruppe-titel">{g.titel}</h2>
          <ul className="liste">
            {g.eintraege.map((e) => (
              <Zeile
                key={e.id}
                eintrag={e}
                stichtage={t}
                gruppe={g.id}
                onUmschalten={abhaken}
              />
            ))}
          </ul>
        </section>
      ))}
      {eintraege && (
        <Erledigte eintraege={eintraege} stichtage={t} onWiederOeffnen={(e) => void setzeStatus(e, false)} />
      )}
      <Hinweis hinweis={hinweis} onSchliessen={schliesseHinweis} />
    </main>
  );
}
