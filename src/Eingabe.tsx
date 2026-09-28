import { useRef, useState, type KeyboardEvent } from 'react';
import type { NeueFelder } from './api';

interface Props {
  onHinzufuegen: (felder: NeueFelder) => Promise<boolean>;
}

// Eingabefeld oben auf der Seite. Enter legt den Eintrag an; „Mehr“ klappt
// Infotext, Datum, Uhrzeit und „wichtig“ auf.
export default function Eingabe({ onHinzufuegen }: Props) {
  const [titel, setTitel] = useState('');
  const [info, setInfo] = useState('');
  const [datum, setDatum] = useState('');
  const [uhrzeit, setUhrzeit] = useState('');
  const [wichtig, setWichtig] = useState(false);
  const [offen, setOffen] = useState(false);
  const titelFeld = useRef<HTMLInputElement>(null);
  // Sperre gegen doppeltes Absenden (z. B. zweimal schnell Enter).
  const sendet = useRef(false);

  async function absenden() {
    const text = titel.trim();
    if (!text || sendet.current) return;
    sendet.current = true;
    const felder: NeueFelder = {
      titel: text,
      info: info.trim(),
      datum: datum || null,
      uhrzeit: datum && uhrzeit ? uhrzeit : null,
      wichtig,
    };
    setTitel('');
    setInfo('');
    setDatum('');
    setUhrzeit('');
    setWichtig(false);
    titelFeld.current?.focus();
    const ok = await onHinzufuegen(felder);
    if (!ok) {
      // Eingaben zurückgeben, damit nichts verloren geht.
      setTitel(felder.titel);
      setInfo(felder.info);
      setDatum(felder.datum ?? '');
      setUhrzeit(felder.uhrzeit ?? '');
      setWichtig(felder.wichtig);
    }
    sendet.current = false;
  }

  // Enter in jedem Feld legt den Eintrag an. Ein Formular mit mehreren Feldern
  // und ohne Absende-Knopf wird vom Browser nicht selbst abgeschickt.
  function taste(ereignis: KeyboardEvent<HTMLFormElement>) {
    if (ereignis.key !== 'Enter' || ereignis.nativeEvent.isComposing) return;
    if (!(ereignis.target instanceof HTMLInputElement)) return;
    ereignis.preventDefault();
    void absenden();
  }

  return (
    <form
      className="eingabe"
      onKeyDown={taste}
      onSubmit={(ereignis) => {
        ereignis.preventDefault();
        void absenden();
      }}
    >
      <div className="eingabe-zeile">
        <input
          ref={titelFeld}
          className="eingabe-titel"
          type="text"
          value={titel}
          onChange={(e) => setTitel(e.target.value)}
          placeholder="Was steht an?"
          aria-label="Neuer Eintrag"
          autoFocus
          autoComplete="off"
        />
        <button
          type="button"
          className="mehr"
          aria-expanded={offen}
          aria-controls="zusatzfelder"
          onClick={() => setOffen((o) => !o)}
        >
          {offen ? 'Weniger' : 'Mehr'}
        </button>
      </div>
      {offen && (
        <div id="zusatzfelder" className="zusatzfelder">
          <input
            className="feld feld-info"
            type="text"
            value={info}
            onChange={(e) => setInfo(e.target.value)}
            placeholder="Infotext"
            aria-label="Infotext"
            autoComplete="off"
          />
          <div className="feld-reihe">
            <label className="feld-beschriftung">
              <span>Datum</span>
              <input
                className="feld"
                type="date"
                aria-label="Datum"
                value={datum}
                onChange={(e) => {
                  setDatum(e.target.value);
                  if (!e.target.value) setUhrzeit('');
                }}
              />
            </label>
            <label className="feld-beschriftung">
              <span>Uhrzeit</span>
              <input
                className="feld"
                type="time"
                aria-label="Uhrzeit"
                value={uhrzeit}
                disabled={!datum}
                title={datum ? undefined : 'Erst ein Datum wählen'}
                onChange={(e) => setUhrzeit(e.target.value)}
              />
            </label>
            <label className="wichtig-schalter">
              <input type="checkbox" aria-label="Wichtig" checked={wichtig} onChange={(e) => setWichtig(e.target.checked)} />
              <span>Wichtig</span>
            </label>
          </div>
        </div>
      )}
    </form>
  );
}
