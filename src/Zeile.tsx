import { useRef, useState, type MouseEvent } from 'react';
import type { NeueFelder } from './api';
import Bearbeitung from './Bearbeitung';
import { ausblenden } from './bewegung';
import Herkunft from './Herkunft';
import type { Eintrag } from './typen';
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
}

// Vorläufige Einträge (noch ohne Antwort des Servers) haben diese id.
export function istVorlaeufig(e: Eintrag): boolean {
  return e.id.startsWith('neu-');
}

// Das Abhak-Feld, das nach dem Verschwinden dieser Zeile den Fokus bekommt.
function naechstesFeld(feld: HTMLElement): HTMLElement | null {
  const alle = [...document.querySelectorAll<HTMLElement>('.abhaken')];
  const i = alle.indexOf(feld);
  return alle[i + 1] ?? alle[i - 1] ?? null;
}

export default function Zeile({
  eintrag: e,
  stichtage,
  gruppe,
  onUmschalten,
  bearbeitet,
  onBearbeiten,
  onSpeichern,
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

  if (bearbeitet) {
    return (
      <li className="eintrag eintrag-bearbeiten" data-eintrag={e.id}>
        <Bearbeitung eintrag={e} onSpeichern={schliessen} onAbbrechen={() => schliessen()} />
      </li>
    );
  }

  const abgehakt = e.erledigt !== geht;
  const klassen = [
    'eintrag',
    e.wichtig && 'wichtig',
    gruppe === 'ueberfaellig' && 'ueberfaellig',
    e.erledigt && 'erledigt',
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
          {e.titel}
          <Herkunft quelle={e.quelle} />
        </span>
        {e.info && <span className="info">{e.info}</span>}
      </button>
      {e.datum && <div className="datum">{datumsText(e, stichtage, gruppe === 'heute')}</div>}
    </li>
  );
}
