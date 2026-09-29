import { useRef, useState } from 'react';
import { importiere, sicherung } from './api';
import type { ImportErgebnis } from './daten/bestand';
import { alsDatum } from './zeit';

interface Props {
  onImportiert: () => void;
}

export function importMeldung(z: ImportErgebnis): string {
  const uebersprungen = z.vorhanden + z.geloescht + z.ungueltig;
  return (
    `Import: ${z.neu} neu, ${uebersprungen} übersprungen ` +
    `(${z.vorhanden} vorhanden, ${z.geloescht} gelöscht, ${z.ungueltig} ungültig)`
  );
}

// Leise Leiste ganz unten: Datei importieren (Kandidaten oder eine Sicherung) und alle Daten als
// Sicherungsdatei herunterladen.
export default function Datenleiste({ onImportiert }: Props) {
  const datei = useRef<HTMLInputElement>(null);
  const [meldung, setMeldung] = useState<string | null>(null);

  async function einlesen(f: File) {
    try {
      let inhalt: unknown;
      try {
        inhalt = JSON.parse(await f.text());
      } catch {
        throw new Error(`Die Datei „${f.name}“ enthält kein gültiges JSON.`);
      }
      setMeldung(importMeldung(await importiere(inhalt)));
      onImportiert();
    } catch (fehler) {
      setMeldung(fehler instanceof Error ? fehler.message : 'Der Import ist fehlgeschlagen.');
    }
  }

  function sichern() {
    const url = URL.createObjectURL(new Blob([sicherung()], { type: 'application/json' }));
    const a = document.createElement('a');
    a.href = url;
    a.download = `projekte-sicherung-${alsDatum(new Date())}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <footer className="datenleiste">
      <button type="button" className="datenleiste-knopf" onClick={() => datei.current?.click()}>
        Importieren
      </button>
      <span className="datenleiste-trenner" aria-hidden="true">·</span>
      <button type="button" className="datenleiste-knopf" onClick={sichern}>
        Sichern
      </button>
      <input
        ref={datei}
        type="file"
        accept="application/json,.json"
        hidden
        onChange={(e) => {
          const f = e.target.files?.[0];
          e.target.value = '';
          if (f) void einlesen(f);
        }}
      />
      {meldung && <p className="datenleiste-meldung" role="status">{meldung}</p>}
    </footer>
  );
}
