// Änderungen am Datenbestand, ohne Speicherort. Die Regeln entsprechen dem
// früheren Server: Eingaben werden geprüft, gelöschte Import-Einträge landen
// in geloeschteQuellen und werden nie wieder importiert.
import type { Eintrag } from '../typen';
import {
  istGueltigeUhrzeit,
  istGueltigesDatum,
  pruefeAenderung,
  pruefeNeuenEintrag,
  pruefeWiederherstellung,
} from './pruefung';

export interface Daten {
  version: 1;
  items: Eintrag[];
  geloeschteQuellen: string[];
}

export function leer(): Daten {
  return { version: 1, items: [], geloeschteQuellen: [] };
}

// Schlüssel, unter dem ein importierter Eintrag in geloeschteQuellen steht.
export function quellSchluessel(e: Pick<Eintrag, 'quelle' | 'quellId'>): string | null {
  return e.quellId && e.quelle !== 'manuell' ? `${e.quelle}:${e.quellId}` : null;
}

// Ältere Daten kennen die Reiter noch nicht: Importierte Einträge gelten dort
// als angenommen und wandern nach „automatisch“, alles andere bleibt „eigen“.
function ergaenzeBereich(e: Eintrag): Eintrag {
  if (e.bereich === 'eigen' || e.bereich === 'automatisch') {
    return typeof e.vorschlag === 'boolean' ? e : { ...e, vorschlag: false };
  }
  return { ...e, bereich: e.quelle === 'manuell' ? 'eigen' : 'automatisch', vorschlag: false };
}

// Liest gespeicherte Daten. Liefert null, wenn das Format nicht stimmt.
export function ausText(text: string): Daten | null {
  let roh: unknown;
  try {
    roh = JSON.parse(text);
  } catch {
    return null;
  }
  const d = roh as Partial<Daten> | null;
  if (!d || typeof d !== 'object' || !Array.isArray(d.items)) return null;
  return {
    version: 1,
    items: d.items.map(ergaenzeBereich),
    geloeschteQuellen: Array.isArray(d.geloeschteQuellen) ? d.geloeschteQuellen : [],
  };
}

export function legeAn(daten: Daten, felder: unknown): Eintrag {
  const pruefung = pruefeNeuenEintrag(felder);
  if (!pruefung.ok) throw new Error(pruefung.fehler);
  const eintrag: Eintrag = {
    id: crypto.randomUUID(),
    ...pruefung.felder,
    erledigt: false,
    erstelltAm: new Date().toISOString(),
    erledigtAm: null,
    quelle: 'manuell',
    quellId: null,
    bereich: 'eigen',
    vorschlag: false,
  };
  daten.items.push(eintrag);
  return eintrag;
}

export function aendere(daten: Daten, id: string, felder: unknown): Eintrag {
  const pruefung = pruefeAenderung(felder);
  if (!pruefung.ok) throw new Error(pruefung.fehler);
  const e = daten.items.find((x) => x.id === id);
  if (!e) throw new Error('Diesen Eintrag gibt es nicht.');
  const { erledigt, ...rest } = pruefung.aenderung;
  if (rest.bereich === 'eigen') rest.vorschlag = false;
  Object.assign(e, rest);
  // Uhrzeit gibt es nur zusammen mit einem Datum.
  if (!e.datum) e.uhrzeit = null;
  if (erledigt !== undefined && erledigt !== e.erledigt) {
    e.erledigt = erledigt;
    e.erledigtAm = erledigt ? new Date().toISOString() : null;
  }
  return { ...e };
}

// Endgültiges Löschen. Liefert den Eintrag und seine Position für ein
// späteres „Rückgängig“.
export function loesche(daten: Daten, id: string): { eintrag: Eintrag; index: number } {
  const index = daten.items.findIndex((x) => x.id === id);
  if (index < 0) throw new Error('Diesen Eintrag gibt es nicht.');
  const [eintrag] = daten.items.splice(index, 1);
  const schluessel = quellSchluessel(eintrag);
  if (schluessel && !daten.geloeschteQuellen.includes(schluessel)) {
    daten.geloeschteQuellen.push(schluessel);
  }
  return { eintrag, index };
}

// „Rückgängig“ nach dem Löschen: legt den Eintrag unverändert an seiner alten
// Position wieder an und nimmt ihn aus geloeschteQuellen.
export function stelleWiederHer(daten: Daten, geloescht: unknown): Eintrag {
  const pruefung = pruefeWiederherstellung(geloescht);
  if (!pruefung.ok) throw new Error(pruefung.fehler);
  const { eintrag, index } = pruefung;
  if (daten.items.some((x) => x.id === eintrag.id)) throw new Error('Diesen Eintrag gibt es bereits.');
  daten.items.splice(Math.min(index, daten.items.length), 0, eintrag);
  const schluessel = quellSchluessel(eintrag);
  if (schluessel) daten.geloeschteQuellen = daten.geloeschteQuellen.filter((q) => q !== schluessel);
  return eintrag;
}

type Neu = Omit<Eintrag, 'id' | 'erledigt' | 'erstelltAm' | 'erledigtAm' | 'bereich' | 'vorschlag'>;

// Prüft einen Import-Kandidaten. Liefert die bereinigten Felder oder null.
function pruefeKandidat(k: unknown): Neu | null {
  if (typeof k !== 'object' || k === null || Array.isArray(k)) return null;
  const c = k as Record<string, unknown>;
  if (typeof c.titel !== 'string' || c.titel.trim() === '') return null;
  if (c.quelle !== 'second-brain' && c.quelle !== 'email') return null;
  if (typeof c.quellId !== 'string' || c.quellId.trim() === '') return null;
  if (c.info !== undefined && c.info !== null && typeof c.info !== 'string') return null;
  if (c.wichtig !== undefined && c.wichtig !== null && typeof c.wichtig !== 'boolean') return null;
  const datum = c.datum ?? null;
  if (datum !== null && (typeof datum !== 'string' || !istGueltigesDatum(datum))) return null;
  const uhrzeit = c.uhrzeit ?? null;
  if (uhrzeit !== null && (typeof uhrzeit !== 'string' || !istGueltigeUhrzeit(uhrzeit))) return null;
  return {
    titel: c.titel.trim(),
    info: typeof c.info === 'string' ? c.info.trim() : '',
    datum,
    uhrzeit: datum ? uhrzeit : null,
    wichtig: c.wichtig === true,
    quelle: c.quelle,
    quellId: c.quellId.trim(),
  };
}

export interface ImportErgebnis {
  neu: number;
  vorhanden: number;
  geloescht: number;
  ungueltig: number;
}

// Importiert eine Datei. Zwei Formate:
// - Liste von Kandidaten (aus /projekte-import): gleiche quelle + quellId →
//   überspringen, Einträge aus geloeschteQuellen → überspringen.
// - Sicherung { version, items, geloeschteQuellen }: Einträge mit neuer id
//   kommen dazu, vorhandene bleiben unverändert.
export function importiere(daten: Daten, inhalt: unknown): ImportErgebnis {
  const z: ImportErgebnis = { neu: 0, vorhanden: 0, geloescht: 0, ungueltig: 0 };

  if (Array.isArray(inhalt)) {
    const vorhanden = new Set(daten.items.map(quellSchluessel).filter((s): s is string => s !== null));
    const geloescht = new Set(daten.geloeschteQuellen);
    const jetzt = new Date().toISOString();
    for (const kandidat of inhalt) {
      const felder = pruefeKandidat(kandidat);
      if (!felder) {
        z.ungueltig++;
        continue;
      }
      const schluessel = quellSchluessel(felder)!;
      if (geloescht.has(schluessel)) {
        z.geloescht++;
        continue;
      }
      if (vorhanden.has(schluessel)) {
        z.vorhanden++;
        continue;
      }
      vorhanden.add(schluessel);
      daten.items.push({
        id: crypto.randomUUID(),
        ...felder,
        erledigt: false,
        erstelltAm: jetzt,
        erledigtAm: null,
        // Neue Funde warten im Reiter „Automatisch“ auf Annehmen oder Ablehnen.
        bereich: 'automatisch',
        vorschlag: true,
      });
      z.neu++;
    }
    return z;
  }

  const sicherung = ausText(JSON.stringify(inhalt ?? null));
  if (!sicherung) throw new Error('Die Datei hat kein bekanntes Format.');
  const ids = new Set(daten.items.map((e) => e.id));
  for (const e of sicherung.items) {
    const pruefung = pruefeWiederherstellung({ eintrag: e });
    if (!pruefung.ok) {
      z.ungueltig++;
    } else if (ids.has(pruefung.eintrag.id)) {
      z.vorhanden++;
    } else {
      ids.add(pruefung.eintrag.id);
      daten.items.push(pruefung.eintrag);
      z.neu++;
    }
  }
  for (const q of sicherung.geloeschteQuellen) {
    if (typeof q === 'string' && !daten.geloeschteQuellen.includes(q)) daten.geloeschteQuellen.push(q);
  }
  return z;
}
