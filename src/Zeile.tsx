import { useRef, useState } from 'react';
import { ausblenden } from './bewegung';
import Herkunft from './Herkunft';
import type { Eintrag } from './typen';
import { datumsText, type Stichtage } from './zeit';

interface Props {
  eintrag: Eintrag;
  stichtage: Stichtage;
  ueberfaellig?: boolean;
  // Abhaken (offener Eintrag) oder wieder öffnen (erledigter Eintrag).
  onUmschalten: (eintrag: Eintrag) => void;
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

export default function Zeile({ eintrag: e, stichtage, ueberfaellig = false, onUmschalten }: Props) {
  const zeile = useRef<HTMLLIElement>(null);
  const [geht, setGeht] = useState(false);
  const vorlaeufig = istVorlaeufig(e);

  async function umschalten(ereignis: React.MouseEvent<HTMLButtonElement>) {
    if (geht || vorlaeufig) return;
    const feld = ereignis.currentTarget;
    const fokusWeiter = document.activeElement === feld ? naechstesFeld(feld) : null;
    setGeht(true);
    await ausblenden(zeile.current);
    onUmschalten(e);
    if (fokusWeiter) requestAnimationFrame(() => fokusWeiter.focus());
  }

  const abgehakt = e.erledigt !== geht;
  const klassen = [
    'eintrag',
    e.wichtig && 'wichtig',
    ueberfaellig && 'ueberfaellig',
    e.erledigt && 'erledigt',
    geht && 'geht',
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <li ref={zeile} className={klassen}>
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
        <span className="kreis" aria-hidden="true" />
      </button>
      <div className="inhalt">
        <div className="titel">
          {e.titel}
          <Herkunft quelle={e.quelle} />
        </div>
        {e.info && <div className="info">{e.info}</div>}
      </div>
      {e.datum && <div className="datum">{datumsText(e, stichtage)}</div>}
    </li>
  );
}
