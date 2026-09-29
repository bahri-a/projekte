import { useState } from 'react';
import { importiere } from './api';
import { importMeldung } from './Datenleiste';

// Helfer auf diesem Mac (scripts/helfer.mjs), der neue Einträge aus Second Brain und Outlook holt.
const HELFER = 'http://127.0.0.1:3290/aktualisieren';
const SCHLUESSEL = 'projekte-zuletzt-aktualisiert';

function letzterLauf(): Date | null {
  try {
    const wert = localStorage.getItem(SCHLUESSEL);
    const d = wert ? new Date(wert) : null;
    return d && !Number.isNaN(d.getTime()) ? d : null;
  } catch {
    return null;
  }
}

function stand(d: Date | null): { text: string; veraltet: boolean } {
  if (!d) return { text: 'Noch nie aktualisiert', veraltet: true };
  const jetzt = new Date();
  const uhr = d.toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' });
  if (d.toDateString() === jetzt.toDateString()) return { text: `Zuletzt heute um ${uhr}`, veraltet: false };
  const gestern = new Date(jetzt);
  gestern.setDate(jetzt.getDate() - 1);
  if (d.toDateString() === gestern.toDateString()) return { text: `Zuletzt gestern um ${uhr}`, veraltet: true };
  return { text: `Zuletzt am ${d.toLocaleDateString('de-DE')}`, veraltet: true };
}

// Hauptaktion des Reiters „Automatisch“: nach Neuem suchen, Vorschläge kommen darunter.
export default function Suche({ onImportiert }: { onImportiert: () => void }) {
  const [laeuft, setLaeuft] = useState(false);
  const [meldung, setMeldung] = useState<string | null>(null);
  const [fehler, setFehler] = useState(false);
  const [zuletzt, setZuletzt] = useState<Date | null>(letzterLauf);
  const { text, veraltet } = stand(zuletzt);

  async function aktualisieren() {
    setLaeuft(true);
    setFehler(false);
    setMeldung('Suche läuft … Das kann ein bis drei Minuten dauern.');
    try {
      let antwort: Response;
      try {
        antwort = await fetch(HELFER, { method: 'POST' });
      } catch {
        throw new Error('Der Helfer auf diesem Mac ist nicht erreichbar. Aktualisieren geht nur auf dem MacBook.');
      }
      const daten = await antwort.json().catch(() => null);
      if (!antwort.ok) throw new Error(daten?.fehler ?? 'Die Aktualisierung ist fehlgeschlagen.');
      const ergebnis = await importiere(daten);
      setMeldung(importMeldung(ergebnis));
      const jetzt = new Date();
      setZuletzt(jetzt);
      try {
        localStorage.setItem(SCHLUESSEL, jetzt.toISOString());
      } catch {
        /* ohne Speicher nur ohne Zeitangabe */
      }
      onImportiert();
    } catch (e) {
      setFehler(true);
      setMeldung(e instanceof Error ? e.message : 'Die Aktualisierung ist fehlgeschlagen.');
    } finally {
      setLaeuft(false);
    }
  }

  return (
    <section className={`suche${laeuft ? ' laeuft' : ''}`} aria-label="Nach Neuem suchen">
      <div className="suche-kopf">
        <div className="suche-text">
          <span className="suche-titel">Neue Vorschläge</span>
          <span className={`suche-stand${veraltet && !laeuft ? ' veraltet' : ''}`}>{text}</span>
        </div>
        <button
          type="button"
          className={`suche-knopf${veraltet ? ' faellig' : ''}`}
          disabled={laeuft}
          onClick={() => void aktualisieren()}
        >
          <svg viewBox="0 0 20 20" width="16" height="16" aria-hidden="true" className="suche-symbol">
            <path d="M16 10a6 6 0 1 1-1.8-4.3M16 3.5v3.2h-3.2" />
          </svg>
          {laeuft ? 'Sucht …' : 'Aktualisieren'}
        </button>
      </div>
      {laeuft && <div className="suche-balken" aria-hidden="true" />}
      {meldung && (
        <p className={`suche-meldung${fehler ? ' fehler' : ''}`} role="status">
          {meldung}
        </p>
      )}
    </section>
  );
}
