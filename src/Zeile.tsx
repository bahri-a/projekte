import { useRef, useState, type MouseEvent } from 'react';
import type { NeueFelder } from './api';
import Bearbeitung from './Bearbeitung';
import { ausblenden } from './bewegung';
import Herkunft from './Herkunft';
import { istVorlaeufig, type Eintrag } from './typen';
import { datumsText, type Gruppe, type Stichtage } from './zeit';

interface Props {
  eintrag: Eintrag;
  stichtage: Stichtage;
  // Die Zeitgruppe, unter der die Zeile steht (im Erledigt-Bereich keine).
  gruppe?: Gruppe;
  // Abhaken (offener Eintrag) oder wieder öffnen (erledigter Eintrag).
  onUmschalten: (eintrag: Eintrag) => void;
  bearbeitet: boolean;
  onBearbeiten: (eintrag: Eintrag | null) => void;
  onSpeichern: (eintrag: Eintrag, felder: NeueFelder) => void;
  onLoeschen: (eintrag: Eintrag) => void;
  // Nur im Reiter „Automatisch“: Eintrag in „Meine Aufgaben“ verschieben.
  // Dort gibt es außerdem ein kleines X zum Löschen.
  onVerschieben?: (eintrag: Eintrag) => void;
}

// Das Herkunftssymbol bleibt mit dem letzten Wort des Titels zusammen,
// damit es beim Umbruch nicht allein in eine neue Zeile rutscht.
function TitelMitHerkunft({ eintrag: e }: { eintrag: Eintrag }) {
  const trenner = e.titel.lastIndexOf(' ') + 1;
  // Sehr lange Wörter dürfen weiter umbrechen.
  if (e.quelle === 'manuell' || e.titel.length - trenner > 24) {
    return (
      <>
        {e.titel}
        <Herkunft quelle={e.quelle} />
      </>
    );
  }
  return (
    <>
      {e.titel.slice(0, trenner)}
      <span className="zusammen">
        {e.titel.slice(trenner)}
        <Herkunft quelle={e.quelle} />
      </span>
    </>
  );
}

// Das Abhak-Feld, das nach dem Verschwinden einer Zeile den Fokus bekommt:
// das der nächsten Zeile, sonst das der vorigen.
function naechstesFeld(ab: HTMLElement | null): HTMLElement | null {
  if (!ab) return null;
  const alle = [...document.querySelectorAll<HTMLElement>('.abhaken')];
  const danach = alle.find((f) => ab.compareDocumentPosition(f) & Node.DOCUMENT_POSITION_FOLLOWING && !ab.contains(f));
  const davor = alle.filter((f) => ab.compareDocumentPosition(f) & Node.DOCUMENT_POSITION_PRECEDING).pop();
  return danach ?? davor ?? null;
}

export default function Zeile({
  eintrag: e,
  stichtage,
  gruppe,
  onUmschalten,
  bearbeitet,
  onBearbeiten,
  onSpeichern,
  onLoeschen,
  onVerschieben,
}: Props) {
  const zeile = useRef<HTMLLIElement>(null);
  const [geht, setGeht] = useState(false);
  const vorlaeufig = istVorlaeufig(e);

  async function umschalten(ereignis: MouseEvent<HTMLButtonElement>) {
    // Der zweite Klick eines Doppelklicks zählt nicht, auch wenn er nach dem
    // Nachrücken der Liste ein anderes Abhak-Feld trifft.
    if (geht || vorlaeufig || ereignis.detail > 1) return;
    const feld = ereignis.currentTarget;
    const fokusWeiter = document.activeElement === feld ? naechstesFeld(feld) : null;
    setGeht(true);
    await ausblenden(zeile.current);
    onUmschalten(e);
    if (fokusWeiter) setTimeout(() => fokusWeiter.focus());
  }

  // Nach dem Schließen der Bearbeitung den Fokus zurück auf den Eintrag.
  function schliessen(felder?: NeueFelder) {
    if (felder) onSpeichern(e, felder);
    else onBearbeiten(null);
    // Die Zeile kann dabei in eine andere Gruppe gewandert sein.
    setTimeout(() =>
      document.querySelector<HTMLElement>(`[data-eintrag="${CSS.escape(e.id)}"] .inhalt`)?.focus(),
    );
  }

  async function loeschen() {
    if (geht) return;
    const fokusWeiter = naechstesFeld(zeile.current);
    setGeht(true);
    await ausblenden(zeile.current);
    onLoeschen(e);
    if (fokusWeiter) setTimeout(() => fokusWeiter.focus());
  }

  async function verschieben() {
    if (geht || !onVerschieben) return;
    const fokusWeiter = naechstesFeld(zeile.current);
    setGeht(true);
    await ausblenden(zeile.current);
    onVerschieben(e);
    if (fokusWeiter) setTimeout(() => fokusWeiter.focus());
  }

  if (bearbeitet) {
    return (
      <li ref={zeile} className={`eintrag eintrag-bearbeiten${geht ? ' geht' : ''}`} data-eintrag={e.id}>
        <Bearbeitung
          eintrag={e}
          onSpeichern={schliessen}
          onAbbrechen={() => schliessen()}
          onLoeschen={loeschen}
          onVerschieben={onVerschieben && verschieben}
        />
      </li>
    );
  }

  const abgehakt = e.erledigt !== geht;
  const klassen = [
    'eintrag',
    e.wichtig && 'wichtig',
    gruppe === 'ueberfaellig' && 'ueberfaellig',
    e.erledigt && 'erledigt',
    onVerschieben && 'mit-x',
    geht && 'geht',
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <li ref={zeile} className={klassen} data-eintrag={e.id}>
      {e.wichtig && <span className="wichtig-punkt" title="Wichtig" aria-label="Wichtig" role="img" />}
      <button
        type="button"
        className="abhaken"
        role="checkbox"
        aria-checked={abgehakt}
        aria-disabled={vorlaeufig || undefined}
        aria-label={`Erledigt: ${e.titel}`}
        title={e.erledigt ? 'Wieder öffnen' : 'Als erledigt markieren'}
        onClick={umschalten}
      >
        <span className="kreis" aria-hidden="true">
          <svg viewBox="0 0 12 12" width="10" height="10">
            <path d="m2.5 6.2 2.3 2.3 4.7-5" />
          </svg>
        </span>
      </button>
      <button
        type="button"
        className="inhalt"
        title="Bearbeiten"
        aria-label={`Bearbeiten: ${e.titel}`}
        onClick={(ereignis) => {
          // Der zweite Klick eines Doppelklicks (z. B. auf „Speichern“, nach
          // dem die Liste nachrückt) öffnet nichts.
          if (ereignis.detail > 1) return;
          onBearbeiten(e);
        }}
      >
        <span className="titel">
          <TitelMitHerkunft eintrag={e} />
        </span>
        {e.info && <span className="info">{e.info}</span>}
      </button>
      {e.datum && <div className="datum">{datumsText(e, stichtage, gruppe === 'heute')}</div>}
      {onVerschieben && (
        <button
          type="button"
          className="entfernen"
          title="Löschen"
          aria-label={`Löschen: ${e.titel}`}
          disabled={vorlaeufig}
          onClick={(ereignis) => {
            if (ereignis.detail > 1) return;
            void loeschen();
          }}
        >
          <svg viewBox="0 0 12 12" width="10" height="10" aria-hidden="true">
            <path d="m3 3 6 6M9 3 3 9" />
          </svg>
        </button>
      )}
    </li>
  );
}
