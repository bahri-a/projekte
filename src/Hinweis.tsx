import { useEffect } from 'react';

export interface HinweisDaten {
  // Jede neue Meldung bekommt eine neue Nummer, damit der Zeitgeber neu startet.
  nr: number;
  text: string;
  onRueckgaengig: () => void;
}

interface Props {
  hinweis: HinweisDaten | null;
  onSchliessen: () => void;
}

const ANZEIGEDAUER = 5000;

// Kleiner Hinweis unten, z. B. „Erledigt · Rückgängig“, für etwa 5 Sekunden.
export default function Hinweis({ hinweis, onSchliessen }: Props) {
  useEffect(() => {
    if (!hinweis) return;
    const id = setTimeout(onSchliessen, ANZEIGEDAUER);
    return () => clearTimeout(id);
  }, [hinweis, onSchliessen]);

  return (
    <div className="hinweis-bereich" role="status" aria-live="polite">
      {hinweis && (
        <div key={hinweis.nr} className="hinweis-box">
          <span>{hinweis.text}</span> <span className="hinweis-trenner">·</span>{' '}
          <button
            type="button"
            className="hinweis-aktion"
            onClick={() => {
              hinweis.onRueckgaengig();
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
