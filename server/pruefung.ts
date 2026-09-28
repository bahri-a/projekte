// Prüft Eingaben für neue Einträge. Liefert entweder die bereinigten Felder
// oder eine deutsche Fehlermeldung.

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
