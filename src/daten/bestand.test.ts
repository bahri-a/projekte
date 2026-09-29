import { describe, expect, it } from 'vitest';
import { aendere, ausText, importiere, leer, legeAn, loesche, stelleWiederHer } from './bestand';

const neu = { titel: 'Zahnarzt', info: '', datum: '2026-10-05', uhrzeit: '09:30', wichtig: false };
const mail = (quellId: string, titel = 'Antworten') => ({ titel, quelle: 'email', quellId });

describe('Einträge', () => {
  it('legt einen Eintrag an und prüft die Eingaben', () => {
    const d = leer();
    const e = legeAn(d, { ...neu, titel: '  Zahnarzt  ' });
    expect(e.titel).toBe('Zahnarzt');
    expect(e.quelle).toBe('manuell');
    expect(d.items).toHaveLength(1);
    expect(() => legeAn(d, { ...neu, titel: '   ' })).toThrow('Der Titel darf nicht leer sein.');
    expect(() => legeAn(d, { ...neu, datum: 'morgen' })).toThrow('JJJJ-MM-TT');
    expect(d.items).toHaveLength(1);
  });

  it('setzt erledigtAm beim Abhaken und entfernt die Uhrzeit ohne Datum', () => {
    const d = leer();
    const { id } = legeAn(d, neu);
    expect(aendere(d, id, { erledigt: true }).erledigtAm).not.toBeNull();
    expect(aendere(d, id, { erledigt: false }).erledigtAm).toBeNull();
    expect(aendere(d, id, { datum: null }).uhrzeit).toBeNull();
    expect(() => aendere(d, 'gibt-es-nicht', { titel: 'x' })).toThrow('Diesen Eintrag gibt es nicht.');
  });

  it('stellt einen gelöschten Eintrag an alter Stelle wieder her', () => {
    const d = leer();
    importiere(d, [mail('a', 'Erster'), mail('b', 'Zweiter')]);
    const geloescht = loesche(d, d.items[0].id);
    expect(d.geloeschteQuellen).toEqual(['email:a']);
    stelleWiederHer(d, geloescht);
    expect(d.items[0].titel).toBe('Erster');
    expect(d.geloeschteQuellen).toEqual([]);
  });
});

describe('Import von Kandidaten', () => {
  it('überspringt Vorhandene, Gelöschte, Doppelte und Ungültige', () => {
    const d = leer();
    importiere(d, [mail('vorhanden'), mail('weg')]);
    loesche(d, d.items[1].id);
    const kandidaten = [
      mail('vorhanden', 'Neuer Titel'),
      mail('weg'),
      mail('frisch'),
      mail('frisch'),
      { titel: '  ', quelle: 'email', quellId: 'x' },
      { titel: 'Pflanzen', quelle: 'manuell', quellId: 'y' },
      { titel: 'Paket', quelle: 'email' },
      { titel: 'Seminar', quelle: 'second-brain', quellId: 'z', datum: 'nächsten Freitag' },
    ];
    expect(importiere(d, kandidaten)).toEqual({ neu: 1, vorhanden: 2, geloescht: 1, ungueltig: 4 });
    expect(d.items.map((e) => e.titel)).toEqual(['Antworten', 'Antworten']);
    expect(importiere(d, kandidaten)).toEqual({ neu: 0, vorhanden: 3, geloescht: 1, ungueltig: 4 });
  });

  it('verändert vorhandene, bearbeitete Einträge nicht', () => {
    const d = leer();
    importiere(d, [mail('m1')]);
    aendere(d, d.items[0].id, { titel: 'Selbst bearbeitet' });
    importiere(d, [mail('m1', 'Anderer Titel')]);
    expect(d.items).toHaveLength(1);
    expect(d.items[0].titel).toBe('Selbst bearbeitet');
  });
});

describe('Import einer Sicherung', () => {
  it('übernimmt neue Einträge und gelöschte Quellen, vorhandene bleiben', () => {
    const quelle = leer();
    legeAn(quelle, neu);
    importiere(quelle, [mail('m1')]);
    quelle.geloeschteQuellen.push('email:alt');
    const sicherung = JSON.parse(JSON.stringify(quelle));

    const ziel = leer();
    expect(importiere(ziel, sicherung)).toEqual({ neu: 2, vorhanden: 0, geloescht: 0, ungueltig: 0 });
    expect(ziel.geloeschteQuellen).toEqual(['email:alt']);
    expect(importiere(ziel, sicherung).vorhanden).toBe(2);
    expect(ziel.items).toHaveLength(2);
  });

  it('lehnt unbekannte Formate ab', () => {
    expect(() => importiere(leer(), { etwas: 1 })).toThrow('Die Datei hat kein bekanntes Format.');
  });
});

describe('Reiter „Meine Aufgaben“ und „Automatisch“', () => {
  it('legt eigene Einträge in „eigen“ an, neue Funde als Vorschlag in „automatisch“', () => {
    const d = leer();
    expect(legeAn(d, neu)).toMatchObject({ bereich: 'eigen', vorschlag: false });
    importiere(d, [mail('a')]);
    expect(d.items[1]).toMatchObject({ bereich: 'automatisch', vorschlag: true });
  });

  it('Annehmen lässt den Eintrag in „automatisch“, Verschieben macht ihn eigen', () => {
    const d = leer();
    importiere(d, [mail('a')]);
    const { id } = d.items[0];
    expect(aendere(d, id, { vorschlag: false })).toMatchObject({ bereich: 'automatisch', vorschlag: false });
    const e = aendere(d, id, { bereich: 'eigen' });
    expect(e).toMatchObject({ bereich: 'eigen', vorschlag: false, quelle: 'email', quellId: 'a' });
    // Derselbe Fund wird nicht noch einmal vorgeschlagen.
    expect(importiere(d, [mail('a')])).toMatchObject({ neu: 0, vorhanden: 1 });
    expect(() => aendere(d, id, { bereich: 'irgendwo' })).toThrow('bereich');
  });

  it('Ablehnen (Löschen) merkt den Fund und Rückgängig holt den Vorschlag zurück', () => {
    const d = leer();
    importiere(d, [mail('a')]);
    const geloescht = loesche(d, d.items[0].id);
    expect(importiere(d, [mail('a')])).toMatchObject({ neu: 0, geloescht: 1 });
    stelleWiederHer(d, geloescht);
    expect(d.items[0]).toMatchObject({ bereich: 'automatisch', vorschlag: true });
  });

  it('ordnet ältere Daten ohne Reiter zu: Importierte gelten als angenommen', () => {
    const alt = (quelle: string) => ({
      id: quelle, titel: 'x', info: '', datum: null, uhrzeit: null, wichtig: false, erledigt: false,
      erstelltAm: '2026-09-01T00:00:00.000Z', erledigtAm: null, quelle, quellId: quelle === 'manuell' ? null : 'q',
    });
    const d = ausText(JSON.stringify({ version: 1, items: [alt('manuell'), alt('email')], geloeschteQuellen: [] }))!;
    expect(d.items[0]).toMatchObject({ bereich: 'eigen', vorschlag: false });
    expect(d.items[1]).toMatchObject({ bereich: 'automatisch', vorschlag: false });
  });

  it('übernimmt Sicherungen ohne Reiter-Felder', () => {
    const d = leer();
    const alt = {
      id: 'z', titel: 'x', info: '', datum: null, uhrzeit: null, wichtig: false, erledigt: false,
      erstelltAm: '2026-09-01T00:00:00.000Z', erledigtAm: null, quelle: 'second-brain', quellId: 'q',
    };
    importiere(d, { version: 1, items: [alt], geloeschteQuellen: [] });
    expect(d.items[0]).toMatchObject({ bereich: 'automatisch', vorschlag: false });
  });
});
