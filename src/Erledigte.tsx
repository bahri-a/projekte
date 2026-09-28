import { useState } from 'react';
import type { Eintrag } from './typen';
import type { Stichtage } from './zeit';
import Zeile from './Zeile';

interface Props {
  eintraege: Eintrag[];
  stichtage: Stichtage;
  onWiederOeffnen: (eintrag: Eintrag) => void;
}

// Schalter unten auf der Seite und der aufklappbare Bereich mit den erledigten
// Einträgen, zuletzt erledigte oben.
export default function Erledigte({ eintraege, stichtage, onWiederOeffnen }: Props) {
  const [sichtbar, setSichtbar] = useState(false);
  const erledigte = eintraege
    .filter((e) => e.erledigt)
    .sort((a, b) => ((a.erledigtAm ?? '') < (b.erledigtAm ?? '') ? 1 : -1));
  if (erledigte.length === 0) return null;

  return (
    <div className="erledigte">
      <button
        type="button"
        className="erledigte-schalter"
        aria-expanded={sichtbar}
        aria-controls="erledigte-liste"
        onClick={() => setSichtbar((s) => !s)}
      >
        {sichtbar ? 'Erledigte ausblenden' : 'Erledigte anzeigen'} ({erledigte.length})
      </button>
      {sichtbar && (
        <section id="erledigte-liste" className="erledigte-bereich" aria-label="Erledigt">
          <ul className="liste">
            {erledigte.map((e) => (
              <Zeile key={e.id} eintrag={e} stichtage={stichtage} onUmschalten={onWiederOeffnen} />
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
