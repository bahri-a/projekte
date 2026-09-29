import { useRef, useState } from 'react';
import { importiere, sicherung } from './api';
import type { ImportErgebnis } from './daten/bestand';
import { alsDatum } from './zeit';

interface Props {
  onImportiert: () => void;
  // „Aktualisieren“ gehört zum Reiter „Automatisch“ und steht nur dort.
  mitAktualisieren: boolean;
}

// Helfer auf diesem Mac (scripts/helfer.mjs), der /aufgaben-import ausführt.
const HELFER = 'http://127.0.0.1:3290/aktualisieren';

function importMeldung(z: ImportErgebnis): string {
  const uebersprungen = z.vorhanden + z.geloescht + z.ungueltig;
  return (
    `Import: ${z.neu} neu, ${uebersprungen} übersprungen ` +
    `(${z.vorhanden} vorhanden, ${z.geloescht} gelöscht, ${z.ungueltig} ungültig)`
  );
}

// Leise Leiste ganz unten: neue Einträge aus Second Brain und Outlook holen,
// Datei importieren (Kandidaten oder eine Sicherung) und alle Daten als
// Sicherungsdatei herunterladen.
export default function Datenleiste({ onImportiert, mitAktualisieren }: Props) {
  const datei = useRef<HTMLInputElement>(null);
  const [meldung, setMeldung] = useState<string | null>(null);
  const [aktualisiert, setAktualisiert] = useState(false);

  async function aktualisieren() {
    setAktualisiert(true);
    setMeldung('Wird aktualisiert … Das kann ein bis drei Minuten dauern.');
    try {
      let antwort: Response;
      try {
        antwort = await fetch(HELFER, { method: 'POST' });
      } catch {
        throw new Error('Der Helfer auf diesem Mac ist nicht erreichbar. Aktualisieren geht nur auf dem MacBook.');
      }
      const daten = await antwort.json().catch(() => null);
      if (!antwort.ok) throw new Error(daten?.fehler ?? 'Die Aktualisierung ist fehlgeschlagen.');
      setMeldung(importMeldung(await importiere(daten)));
      onImportiert();
    } catch (fehler) {
      setMeldung(fehler instanceof Error ? fehler.message : 'Die Aktualisierung ist fehlgeschlagen.');
    } finally {
      setAktualisiert(false);
    }
  }

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
      {mitAktualisieren && (
        <>
          <button type="button" className="datenleiste-knopf" disabled={aktualisiert} onClick={() => void aktualisieren()}>
            Aktualisieren
          </button>
          <span className="datenleiste-trenner" aria-hidden="true">·</span>
        </>
      )}
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
