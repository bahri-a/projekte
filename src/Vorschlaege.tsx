import { useRef, useState } from 'react';
import { ausblenden } from './bewegung';
import Herkunft from './Herkunft';
import type { Eintrag } from './typen';
import { datumsText, type Stichtage } from './zeit';

interface Props {
  eintraege: Eintrag[];
  stichtage: Stichtage;
  onAnnehmen: (eintrag: Eintrag) => void;
  onAblehnen: (eintrag: Eintrag) => void;
}

function VorschlagZeile({
  eintrag: e,
  stichtage,
  onAnnehmen,
  onAblehnen,
}: { eintrag: Eintrag; stichtage: Stichtage } & Pick<Props, 'onAnnehmen' | 'onAblehnen'>) {
  const zeile = useRef<HTMLLIElement>(null);
  const [geht, setGeht] = useState(false);

  async function entscheide(aktion: (eintrag: Eintrag) => void) {
    if (geht) return;
    setGeht(true);
    await ausblenden(zeile.current);
    aktion(e);
  }

  return (
    <li ref={zeile} className={`vorschlag${geht ? ' geht' : ''}`} data-vorschlag={e.id}>
      <div className="vorschlag-text">
        <span className="titel">
          {e.titel}
          <Herkunft quelle={e.quelle} />
        </span>
        {e.info && <span className="info" style={{ display: 'block' }}>{e.info}</span>}
      </div>
      {e.datum && <div className="datum">{datumsText(e, stichtage, false)}</div>}
      <div className="vorschlag-aktionen">
        <button
          type="button"
          className="knopf knopf-haupt"
          aria-label={`Annehmen: ${e.titel}`}
          onClick={(ereignis) => ereignis.detail <= 1 && void entscheide(onAnnehmen)}
        >
          Annehmen
        </button>
        <button
          type="button"
          className="knopf"
          aria-label={`Ablehnen: ${e.titel}`}
          onClick={(ereignis) => ereignis.detail <= 1 && void entscheide(onAblehnen)}
        >
          Ablehnen
        </button>
      </div>
    </li>
  );
}

// Neue Vorschläge aus Second Brain und E-Mail, nach Datum sortiert (ohne Datum
// zuletzt). Sie erscheinen erst in der Liste darunter, wenn man sie annimmt.
export default function Vorschlaege({ eintraege, stichtage, onAnnehmen, onAblehnen }: Props) {
  if (eintraege.length === 0) return null;
  const sortiert = [...eintraege].sort((a, b) => {
    if (a.datum !== b.datum) return a.datum === null ? 1 : b.datum === null ? -1 : a.datum < b.datum ? -1 : 1;
    return a.erstelltAm < b.erstelltAm ? 1 : -1;
  });
  return (
    <section className="vorschlaege" aria-labelledby="vorschlaege-titel">
      <h2 id="vorschlaege-titel" className="gruppe-titel">Neue Vorschläge</h2>
      <ul className="liste">
        {sortiert.map((e) => (
          <VorschlagZeile key={e.id} eintrag={e} stichtage={stichtage} onAnnehmen={onAnnehmen} onAblehnen={onAblehnen} />
        ))}
      </ul>
    </section>
  );
}
