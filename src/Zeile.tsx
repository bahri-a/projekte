import { useRef, useState } from 'react';
import { ausblenden } from './bewegung';
import Herkunft from './Herkunft';
import type { Eintrag } from './typen';
import { datumsText, type Stichtage } from './zeit';

interface Props {
  eintrag: Eintrag;
  stichtage: Stichtage;
  ueberfaellig: boolean;
  onAbhaken: (eintrag: Eintrag) => void;
}

export default function Zeile({ eintrag: e, stichtage, ueberfaellig, onAbhaken }: Props) {
  const zeile = useRef<HTMLLIElement>(null);
  const [geht, setGeht] = useState(false);

  async function abhaken() {
    if (geht) return;
    setGeht(true);
    await ausblenden(zeile.current);
    onAbhaken(e);
  }

  const klassen = ['eintrag', e.wichtig && 'wichtig', ueberfaellig && 'ueberfaellig', geht && 'geht']
    .filter(Boolean)
    .join(' ');

  return (
    <li ref={zeile} className={klassen}>
      {e.wichtig && <span className="wichtig-punkt" title="Wichtig" aria-label="Wichtig" role="img" />}
      <button
        type="button"
        className="abhaken"
        role="checkbox"
        aria-checked={geht}
        aria-label={`Erledigt: ${e.titel}`}
        title="Als erledigt markieren"
        onClick={abhaken}
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
