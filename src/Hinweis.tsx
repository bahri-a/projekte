import { useEffect, useRef, useState } from 'react';

export interface HinweisDaten {
  // Jede neue Meldung bekommt eine neue Nummer, damit der Zeitgeber neu startet.
  nr: number;
  text: string;
  onRueckgaengig: () => void;
  // Anzeigedauer in Millisekunden, Standard 5 Sekunden.
  dauer?: number;
}

interface Props {
  hinweis: HinweisDaten | null;
  onSchliessen: () => void;
}

const ANZEIGEDAUER = 5000;
const AUSBLENDEN = 160;

// Kleiner Hinweis unten, z. B. „Erledigt · Rückgängig“, für etwa 5 Sekunden.
// Beim Schließen bleibt er kurz stehen und blendet dezent aus.
export default function Hinweis({ hinweis, onSchliessen }: Props) {
  const [sichtbar, setSichtbar] = useState<HinweisDaten | null>(hinweis);
  const letzter = useRef<HinweisDaten | null>(null);

  useEffect(() => {
    if (hinweis) {
      letzter.current = hinweis;
      setSichtbar(hinweis);
      const id = setTimeout(onSchliessen, hinweis.dauer ?? ANZEIGEDAUER);
      return () => clearTimeout(id);
    }
    const id = setTimeout(() => setSichtbar(null), AUSBLENDEN);
    return () => clearTimeout(id);
  }, [hinweis, onSchliessen]);

  const anzeige = hinweis ?? sichtbar;

  return (
    <div className="hinweis-bereich" role="status" aria-live="polite">
      {anzeige && (
        <div key={anzeige.nr} className={`hinweis-box${hinweis ? '' : ' geht'}`}>
          <span>{anzeige.text}</span> <span className="hinweis-trenner">·</span>{' '}
          <button
            type="button"
            className="hinweis-aktion"
            disabled={!hinweis}
            onClick={() => {
              anzeige.onRueckgaengig();
              onSchliessen();
            }}
          >
            Rückgängig
          </button>
        </div>
      )}
    </div>
  );
}
