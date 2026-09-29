// Prüft Eingaben für neue, geänderte und wiederhergestellte Einträge. Liefert
// entweder die bereinigten Werte oder eine deutsche Fehlermeldung.
import type { Eintrag } from '../typen';

export interface NeueFelder {
  titel: string;
  info: string;
  datum: string | null;
  uhrzeit: string | null;
  wichtig: boolean;
}

export type Pruefergebnis = { ok: true; felder: NeueFelder } | { ok: false; fehler: string };

export function istGueltigesDatum(wert: string): boolean {
  const treffer = /^(\d{4})-(\d{2})-(\d{2})$/.exec(wert);
  if (!treffer) return false;
  const [jahr, monat, tag] = treffer.slice(1).map(Number);
  const d = new Date(Date.UTC(jahr, monat - 1, tag));
  return d.getUTCFullYear() === jahr && d.getUTCMonth() === monat - 1 && d.getUTCDate() === tag;
}

export function istGueltigeUhrzeit(wert: string): boolean {
  return /^([01]\d|2[0-3]):[0-5]\d$/.test(wert);
}

// Fehlend, null und leerer Text bedeuten „kein Wert“.
function leerWert(wert: unknown): boolean {
  return wert === undefined || wert === null || wert === '';
}

export function pruefeNeuenEintrag(body: unknown): Pruefergebnis {
  if (typeof body !== 'object' || body === null || Array.isArray(body)) {
    return { ok: false, fehler: 'Erwartet wird ein JSON-Objekt.' };
  }
  const b = body as Record<string, unknown>;

  if (typeof b.titel !== 'string' || b.titel.trim() === '') {
    return { ok: false, fehler: 'Der Titel darf nicht leer sein.' };
  }

  if (b.info !== undefined && b.info !== null && typeof b.info !== 'string') {
    return { ok: false, fehler: 'Der Infotext muss ein Text sein.' };
  }

  let datum: string | null = null;
  if (!leerWert(b.datum)) {
    if (typeof b.datum !== 'string' || !istGueltigesDatum(b.datum)) {
      return { ok: false, fehler: 'Das Datum muss im Format JJJJ-MM-TT angegeben werden.' };
    }
    datum = b.datum;
  }

  let uhrzeit: string | null = null;
  if (!leerWert(b.uhrzeit)) {
    if (typeof b.uhrzeit !== 'string' || !istGueltigeUhrzeit(b.uhrzeit)) {
      return { ok: false, fehler: 'Die Uhrzeit muss im Format HH:MM angegeben werden.' };
    }
    uhrzeit = b.uhrzeit;
  }

  if (b.wichtig !== undefined && typeof b.wichtig !== 'boolean') {
    return { ok: false, fehler: '„wichtig“ muss true oder false sein.' };
  }

  return {
    ok: true,
    felder: {
      titel: b.titel.trim(),
      info: typeof b.info === 'string' ? b.info.trim() : '',
      datum,
      // Uhrzeit gibt es nur zusammen mit einem Datum.
      uhrzeit: datum ? uhrzeit : null,
      wichtig: b.wichtig === true,
    },
  };
}

export interface Aenderung {
  titel?: string;
  info?: string;
  datum?: string | null;
  uhrzeit?: string | null;
  wichtig?: boolean;
  erledigt?: boolean;
  bereich?: Eintrag['bereich'];
  vorschlag?: boolean;
}
export type Aenderungsergebnis = { ok: true; aenderung: Aenderung } | { ok: false; fehler: string };

// Prüft eine Teiländerung. Nur mitgeschickte Felder werden geändert;
// id, erstelltAm, quelle und quellId lassen sich nicht ändern.
export function pruefeAenderung(body: unknown): Aenderungsergebnis {
  if (typeof body !== 'object' || body === null || Array.isArray(body)) {
    return { ok: false, fehler: 'Erwartet wird ein JSON-Objekt.' };
  }
  const b = body as Record<string, unknown>;
  const aenderung: Aenderung = {};

  if (b.titel !== undefined) {
    if (typeof b.titel !== 'string' || b.titel.trim() === '') {
      return { ok: false, fehler: 'Der Titel darf nicht leer sein.' };
    }
    aenderung.titel = b.titel.trim();
  }

  if (b.info !== undefined) {
    if (b.info !== null && typeof b.info !== 'string') {
      return { ok: false, fehler: 'Der Infotext muss ein Text sein.' };
    }
    aenderung.info = typeof b.info === 'string' ? b.info.trim() : '';
  }

  if (b.datum !== undefined) {
    if (leerWert(b.datum)) aenderung.datum = null;
    else if (typeof b.datum !== 'string' || !istGueltigesDatum(b.datum)) {
      return { ok: false, fehler: 'Das Datum muss im Format JJJJ-MM-TT angegeben werden.' };
    } else aenderung.datum = b.datum;
  }

  if (b.uhrzeit !== undefined) {
    if (leerWert(b.uhrzeit)) aenderung.uhrzeit = null;
    else if (typeof b.uhrzeit !== 'string' || !istGueltigeUhrzeit(b.uhrzeit)) {
      return { ok: false, fehler: 'Die Uhrzeit muss im Format HH:MM angegeben werden.' };
    } else aenderung.uhrzeit = b.uhrzeit;
  }

  if (b.bereich !== undefined) {
    if (b.bereich !== 'eigen' && b.bereich !== 'automatisch') {
      return { ok: false, fehler: '„bereich“ muss „eigen“ oder „automatisch“ sein.' };
    }
    aenderung.bereich = b.bereich;
  }

  for (const feld of ['wichtig', 'erledigt', 'vorschlag'] as const) {
    if (b[feld] !== undefined) {
      if (typeof b[feld] !== 'boolean') {
        return { ok: false, fehler: `„${feld}“ muss true oder false sein.` };
      }
      aenderung[feld] = b[feld];
    }
  }

  return { ok: true, aenderung };
}

const QUELLEN = ['manuell', 'second-brain', 'email'];

function istZeitpunkt(wert: unknown): wert is string {
  return typeof wert === 'string' && !Number.isNaN(Date.parse(wert));
}

export type Wiederherstellung = { ok: true; eintrag: Eintrag; index: number } | { ok: false; fehler: string };

// Prüft einen gelöschten Eintrag, der unverändert zurückkommen soll
// (Rückgängig nach dem Löschen): { eintrag: {...}, index }.
export function pruefeWiederherstellung(body: unknown): Wiederherstellung {
  const b = (typeof body === 'object' && body !== null ? body : {}) as Record<string, unknown>;
  const e = b.eintrag as Record<string, unknown> | undefined;
  const falsch = { ok: false as const, fehler: 'Der Eintrag kann nicht wiederhergestellt werden.' };
  if (typeof e !== 'object' || e === null) return falsch;
  const datumOk = e.datum === null || (typeof e.datum === 'string' && istGueltigesDatum(e.datum));
  const uhrzeitOk =
    e.uhrzeit === null || (typeof e.uhrzeit === 'string' && istGueltigeUhrzeit(e.uhrzeit) && e.datum !== null);
  if (
    typeof e.id !== 'string' || e.id === '' ||
    typeof e.titel !== 'string' || e.titel.trim() === '' ||
    typeof e.info !== 'string' ||
    !datumOk || !uhrzeitOk ||
    typeof e.wichtig !== 'boolean' ||
    typeof e.erledigt !== 'boolean' ||
    !istZeitpunkt(e.erstelltAm) ||
    !(e.erledigtAm === null || istZeitpunkt(e.erledigtAm)) ||
    typeof e.quelle !== 'string' || !QUELLEN.includes(e.quelle) ||
    !(e.quellId === null || typeof e.quellId === 'string') ||
    !(e.bereich === undefined || e.bereich === 'eigen' || e.bereich === 'automatisch') ||
    !(e.vorschlag === undefined || typeof e.vorschlag === 'boolean')
  ) {
    return falsch;
  }
  // Sicherungen aus der Zeit vor den Reitern haben diese Felder noch nicht.
  const bereich: Eintrag['bereich'] = e.bereich ?? (e.quelle === 'manuell' ? 'eigen' : 'automatisch');
  const index = typeof b.index === 'number' && Number.isInteger(b.index) && b.index >= 0 ? b.index : Infinity;
  return {
    ok: true,
    index,
    eintrag: {
      id: e.id,
      titel: e.titel,
      info: e.info,
      datum: e.datum as string | null,
      uhrzeit: e.uhrzeit as string | null,
      wichtig: e.wichtig,
      erledigt: e.erledigt,
      erstelltAm: e.erstelltAm,
      erledigtAm: e.erledigtAm as string | null,
      quelle: e.quelle as Eintrag['quelle'],
      quellId: e.quellId as string | null,
      bereich,
      vorschlag: e.vorschlag === true && bereich === 'automatisch',
    },
  };
}
