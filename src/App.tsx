import { useCallback, useEffect, useRef, useState } from 'react';
import {
  aendere,
  bitteUmDauerhaftenSpeicher,
  ladeEintraege,
  legeAn,
  loesche,
  nimmAn,
  setzeBereich,
  setzeErledigt,
  stelleWiederHer,
  type NeueFelder,
} from './api';
import Aktualisierung from './Aktualisierung';
import Suche from './Suche';
import Datenleiste from './Datenleiste';
import Eingabe from './Eingabe';
import Erledigte from './Erledigte';
import Hinweis, { type HinweisDaten } from './Hinweis';
import { istVorlaeufig, type Bereich, type Eintrag } from './typen';
import { gruppiere, stichtage, type Stichtage } from './zeit';
import Vorschlaege from './Vorschlaege';
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

const REITER_SCHLUESSEL = 'projekte-reiter';

function gespeicherterReiter(): Bereich {
  try {
    return localStorage.getItem(REITER_SCHLUESSEL) === 'automatisch' ? 'automatisch' : 'eigen';
  } catch {
    return 'eigen';
  }
}

export default function App() {
  const [reiter, setReiterState] = useState<Bereich>(gespeicherterReiter);
  const [eintraege, setEintraege] = useState<Eintrag[] | null>(null);
  const [fehler, setFehler] = useState<string | null>(null);
  const [hinweis, setHinweis] = useState<HinweisDaten | null>(null);
  const [bearbeitetId, setBearbeitetId] = useState<string | null>(null);
  const hinweisNr = useRef(0);
  // Laufende Nummer je Eintrag: Nur die Antwort auf die letzte Änderung wird
  // übernommen, damit eine späte Antwort ein „Rückgängig“ nicht überschreibt.
  const aenderungsNr = useRef(new Map<string, number>());
  const t = useStichtage();

  const laden = useCallback(() => {
    ladeEintraege()
      .then(setEintraege)
      .catch(() => setFehler('Die Einträge konnten nicht geladen werden.'));
  }, []);

  useEffect(() => {
    laden();
    bitteUmDauerhaftenSpeicher();
  }, [laden]);

  function setReiter(neu: Bereich) {
    setReiterState(neu);
    setBearbeitetId(null);
    try {
      localStorage.setItem(REITER_SCHLUESSEL, neu);
    } catch {}
  }

  function ersetze(neu: Eintrag) {
    setEintraege((alt) => (alt ?? []).map((e) => (e.id === neu.id ? neu : e)));
  }

  function zeigeHinweis(text: string, onRueckgaengig: () => void, dauer?: number) {
    hinweisNr.current += 1;
    setHinweis({ nr: hinweisNr.current, text, onRueckgaengig, dauer });
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
      bereich: 'eigen',
      vorschlag: false,
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

  // Zeitpunkt, zu dem zuletzt eine Bearbeitung geschlossen wurde. Ein Klick
  // kurz danach gilt noch dem Schließen und öffnet keinen anderen Eintrag.
  const geschlossenUm = useRef(0);

  function bearbeiten(eintrag: Eintrag | null) {
    if (!eintrag) {
      geschlossenUm.current = Date.now();
      setBearbeitetId(null);
      return;
    }
    if (istVorlaeufig(eintrag) || Date.now() - geschlossenUm.current < 500) return;
    setBearbeitetId(eintrag.id);
  }

  // Übernimmt die Änderung sofort und speichert sie; quelle und quellId
  // bleiben unverändert.
  async function speichern(eintrag: Eintrag, felder: NeueFelder) {
    geschlossenUm.current = Date.now();
    setBearbeitetId(null);
    ersetze({ ...eintrag, ...felder });
    try {
      ersetze(await aendere(eintrag.id, felder));
      setFehler(null);
    } catch {
      ersetze(eintrag);
      setFehler('Die Änderung konnte nicht gespeichert werden.');
    }
  }

  // Löscht sofort (auch auf dem Server), damit der Eintrag nach einem
  // Neuladen weg ist. „Rückgängig“ legt ihn unverändert wieder an.
  async function loeschen(eintrag: Eintrag, hinweisText = 'Gelöscht', dauer?: number) {
    geschlossenUm.current = Date.now();
    setBearbeitetId(null);
    setEintraege((alt) => (alt ?? []).filter((e) => e.id !== eintrag.id));
    try {
      const geloescht = await loesche(eintrag.id);
      setFehler(null);
      zeigeHinweis(hinweisText, () => void wiederherstellen(geloescht.eintrag, geloescht.index), dauer);
    } catch {
      setEintraege((alt) => [...(alt ?? []), eintrag]);
      setFehler('Der Eintrag konnte nicht gelöscht werden.');
    }
  }

  async function wiederherstellen(eintrag: Eintrag, index: number) {
    setEintraege((alt) => ((alt ?? []).some((e) => e.id === eintrag.id) ? alt : [...(alt ?? []), eintrag]));
    try {
      await stelleWiederHer({ eintrag, index });
      setFehler(null);
    } catch {
      setEintraege((alt) => (alt ?? []).filter((e) => e.id !== eintrag.id));
      setFehler('Der Eintrag konnte nicht wiederhergestellt werden.');
    }
  }

  // Ablehnen ist Löschen: Der Fund wird gemerkt und nie wieder vorgeschlagen.
  // „Rückgängig“ gibt es 6 Sekunden lang.
  function ablehnen(eintrag: Eintrag) {
    void loeschen(eintrag, 'Abgelehnt', 6000);
  }

  async function annehmen(eintrag: Eintrag) {
    ersetze({ ...eintrag, vorschlag: false });
    try {
      ersetze(await nimmAn(eintrag.id));
      setFehler(null);
    } catch {
      ersetze(eintrag);
      setFehler('Die Änderung konnte nicht gespeichert werden.');
    }
  }

  async function verschiebeInBereich(eintrag: Eintrag, bereich: Bereich) {
    ersetze({ ...eintrag, bereich, vorschlag: false });
    try {
      ersetze(await setzeBereich(eintrag.id, bereich));
      setFehler(null);
    } catch {
      ersetze(eintrag);
      setFehler('Die Änderung konnte nicht gespeichert werden.');
    }
  }

  function verschieben(eintrag: Eintrag) {
    geschlossenUm.current = Date.now();
    setBearbeitetId(null);
    void verschiebeInBereich(eintrag, 'eigen');
    zeigeHinweis('In „Meine Aufgaben“ verschoben', () => void verschiebeInBereich(eintrag, 'automatisch'));
  }

  function abhaken(eintrag: Eintrag) {
    void setzeStatus(eintrag, true);
    zeigeHinweis('Erledigt', () => void setzeStatus(eintrag, false));
  }

  const automatisch = reiter === 'automatisch';
  const vorschlaege = (eintraege ?? []).filter((e) => e.bereich === 'automatisch' && e.vorschlag);
  const sichtbare = (eintraege ?? []).filter((e) =>
    automatisch ? e.bereich === 'automatisch' && !e.vorschlag : e.bereich === 'eigen',
  );
  const gruppen = eintraege ? gruppiere(sichtbare, t) : [];

  return (
    <main className="seite">
      <nav className="reiter" role="tablist" aria-label="Ansicht">
        <button
          type="button"
          role="tab"
          id="reiter-eigen"
          className="reiter-knopf"
          aria-selected={!automatisch}
          onClick={() => setReiter('eigen')}
        >
          Meine Aufgaben
        </button>
        <button
          type="button"
          role="tab"
          id="reiter-automatisch"
          className="reiter-knopf"
          aria-selected={automatisch}
          onClick={() => setReiter('automatisch')}
        >
          Automatisch
          {vorschlaege.length > 0 && (
            <span className="reiter-zahl" title="Neue Vorschläge" aria-label={`${vorschlaege.length} neue Vorschläge`}>
              {vorschlaege.length}
            </span>
          )}
        </button>
      </nav>
      {!automatisch && <Eingabe onHinzufuegen={hinzufuegen} />}
      {fehler && <p className="meldung">{fehler}</p>}
      {automatisch && <Suche onImportiert={laden} />}
      {automatisch && (
        <Vorschlaege eintraege={vorschlaege} stichtage={t} onAnnehmen={(e) => void annehmen(e)} onAblehnen={ablehnen} />
      )}
      {eintraege && gruppen.length === 0 && (automatisch ? vorschlaege.length === 0 : true) && (
        <p className="meldung">
          {automatisch ? 'Keine Vorschläge. Oben auf „Aktualisieren“ tippen, um nach Neuem zu suchen.' : 'Nichts geplant.'}
        </p>
      )}
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
                bearbeitet={bearbeitetId === e.id}
                onBearbeiten={bearbeiten}
                onSpeichern={(e, felder) => void speichern(e, felder)}
                onLoeschen={(e) => void loeschen(e)}
                onVerschieben={automatisch ? verschieben : undefined}
              />
            ))}
          </ul>
        </section>
      ))}
      {eintraege && (
        <Erledigte
          eintraege={sichtbare}
          stichtage={t}
          onWiederOeffnen={(e) => void setzeStatus(e, false)}
          bearbeitetId={bearbeitetId}
          onBearbeiten={bearbeiten}
          onSpeichern={(e, felder) => void speichern(e, felder)}
          onLoeschen={(e) => void loeschen(e)}
          onVerschieben={automatisch ? verschieben : undefined}
        />
      )}
      <Datenleiste onImportiert={laden} />
      <Aktualisierung />
      <Hinweis hinweis={hinweis} onSchliessen={schliesseHinweis} />
    </main>
  );
}
