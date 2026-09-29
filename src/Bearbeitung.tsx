import { useRef, useState, type KeyboardEvent } from 'react';
import type { NeueFelder } from './api';
import type { Eintrag } from './typen';

interface Props {
  eintrag: Eintrag;
  onSpeichern: (felder: NeueFelder) => void;
  onAbbrechen: () => void;
  onLoeschen: () => void;
}

// Bearbeitung eines Eintrags an seiner Stelle in der Liste.
export default function Bearbeitung({ eintrag, onSpeichern, onAbbrechen, onLoeschen }: Props) {
  const [titel, setTitel] = useState(eintrag.titel);
  const [info, setInfo] = useState(eintrag.info);
  const [datum, setDatum] = useState(eintrag.datum ?? '');
  const [uhrzeit, setUhrzeit] = useState(eintrag.uhrzeit ?? '');
  const [wichtig, setWichtig] = useState(eintrag.wichtig);
  const [titelFehlt, setTitelFehlt] = useState(false);
  const titelFeld = useRef<HTMLInputElement>(null);

  function speichern() {
    const text = titel.trim();
    if (!text) {
      setTitelFehlt(true);
      titelFeld.current?.focus();
      return;
    }
    onSpeichern({
      titel: text,
      info: info.trim(),
      datum: datum || null,
      uhrzeit: datum && uhrzeit ? uhrzeit : null,
      wichtig,
    });
  }

  function taste(ereignis: KeyboardEvent<HTMLFormElement>) {
    if (ereignis.key === 'Escape') {
      ereignis.preventDefault();
      ereignis.stopPropagation();
      onAbbrechen();
      return;
    }
    if (ereignis.key !== 'Enter' || ereignis.nativeEvent.isComposing) return;
    const ziel = ereignis.target;
    if (!(ziel instanceof HTMLInputElement) || ziel.type === 'checkbox') return;
    ereignis.preventDefault();
    speichern();
  }

  return (
    <form
      className="bearbeitung"
      aria-label="Eintrag bearbeiten"
      onKeyDown={taste}
      onSubmit={(ereignis) => {
        ereignis.preventDefault();
        speichern();
      }}
    >
      <input
        ref={titelFeld}
        className="feld feld-titel"
        type="text"
        value={titel}
        onChange={(e) => {
          setTitel(e.target.value);
          if (e.target.value.trim()) setTitelFehlt(false);
        }}
        aria-label="Titel"
        aria-invalid={titelFehlt || undefined}
        aria-describedby={titelFehlt ? `titel-fehlt-${eintrag.id}` : undefined}
        autoFocus
        autoComplete="off"
      />
      {titelFehlt && (
        <p id={`titel-fehlt-${eintrag.id}`} className="feld-hinweis" role="alert">
          Bitte einen Titel eingeben.
        </p>
      )}
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
      <div className="knopf-reihe">
        <button type="submit" className="knopf knopf-haupt">
          Speichern
        </button>
        <button type="button" className="knopf" onClick={onAbbrechen}>
          Abbrechen
        </button>
        <button
          type="button"
          className="knopf-leise"
          onClick={(ereignis) => {
            if (ereignis.detail > 1) return;
            onLoeschen();
          }}
        >
          Löschen
        </button>
      </div>
    </form>
  );
}
