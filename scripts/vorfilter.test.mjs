import { describe, expect, it } from 'vitest';
import { istNewsletter, istTreffer, kennung, mailtextKuerzen, stellenAusNotiz, verweiseAufloesen } from './vorfilter.mjs';

const heute = new Date(2026, 8, 29);

describe('istTreffer', () => {
  it('erkennt offene Aufgaben, Stichwörter und aktuelle Daten', () => {
    expect(istTreffer('- [ ] Steuererklärung', heute)).toBe(true);
    expect(istTreffer('Abgabe der Hausarbeit', heute)).toBe(true);
    expect(istTreffer('Treffen am 2026-10-03', heute)).toBe(true);
    expect(istTreffer('Treffen am 3.10.', heute)).toBe(true);
    expect(istTreffer('Treffen am 3. Oktober', heute)).toBe(true);
  });

  it('übergeht Erledigtes, Wissen und alte Daten', () => {
    expect(istTreffer('- [x] Steuererklärung abgeben', heute)).toBe(false);
    expect(istTreffer('Photosynthese wandelt Licht in Energie.', heute)).toBe(false);
    expect(istTreffer('Gelesen am 2025-03-01', heute)).toBe(false);
    expect(istTreffer('Gelesen am 01.03.2025', heute)).toBe(false);
  });
});

describe('stellenAusNotiz', () => {
  const notiz = ['---', 'date: 2026-09-20', 'status: offen', '---', '# Umzug', 'Wissen über Kisten.', 'Noch mehr Wissen.', 'Und noch mehr.', 'Mehr.', '- [ ] Kaution überweisen', '- [x] Kisten kaufen', 'Ende.'].join('\n');

  it('liefert nur neue Trefferzeilen mit Umfeld und markiert sie', () => {
    const { abschnitte, neu } = stellenAusNotiz('Privat/umzug.md', notiz, new Set(), heute);
    expect(neu).toHaveLength(2);
    const alles = abschnitte.join('\n');
    expect(alles).toContain('» status: offen');
    expect(alles).toContain('» - [ ] Kaution überweisen');
    expect(alles).toContain('  - [x] Kisten kaufen');
    expect(alles).not.toContain('date: 2026-09-20');
    expect(alles).not.toContain('Wissen über Kisten');
  });

  it('liefert nichts, wenn alle Trefferzeilen schon bekannt sind', () => {
    const bekannt = new Set(stellenAusNotiz('Privat/umzug.md', notiz, new Set(), heute).neu);
    expect(stellenAusNotiz('Privat/umzug.md', notiz, bekannt, heute)).toEqual({ abschnitte: [], neu: [] });
  });

  it('meldet nach einer Änderung nur die neue Zeile', () => {
    const bekannt = new Set(stellenAusNotiz('Privat/umzug.md', notiz, new Set(), heute).neu);
    const geaendert = `${notiz}\n- [ ] Nachsendeauftrag stellen`;
    const { abschnitte, neu } = stellenAusNotiz('Privat/umzug.md', geaendert, bekannt, heute);
    expect(neu).toEqual([kennung('Privat/umzug.md', '- [ ] Nachsendeauftrag stellen')]);
    expect(abschnitte.join('\n')).toContain('» - [ ] Nachsendeauftrag stellen');
    expect(abschnitte.join('\n')).not.toContain('» - [ ] Kaution überweisen');
  });

  it('unterscheidet gleiche Zeilen in verschiedenen Notizen', () => {
    expect(kennung('a.md', '- [ ] x')).not.toBe(kennung('b.md', '- [ ] x'));
  });
});

describe('Mails', () => {
  it('entfernt Zitate und alten Verlauf und kürzt', () => {
    const text = 'Hallo,\n\nbitte bis Freitag zahlen.\n> alte Zeile\nAm 1.9. schrieb Max:\nalter Verlauf';
    expect(mailtextKuerzen(text)).toBe('Hallo, bitte bis Freitag zahlen.');
    expect(mailtextKuerzen('a'.repeat(5000)).length).toBeLessThan(1300);
  });

  it('erkennt Newsletter, außer der Betreff nennt eine Frist', () => {
    expect(istNewsletter({ betreff: 'Unsere Herbstangebote', text: 'Hier abmelden' })).toBe(true);
    expect(istNewsletter({ betreff: 'Frist für die Rückmeldung', text: 'Newsletter abbestellen' })).toBe(false);
    expect(istNewsletter({ betreff: 'Rechnung', text: 'Bitte zahlen.' })).toBe(false);
  });
});

describe('verweiseAufloesen', () => {
  const verweise = new Map([['N1', 'Privat/wiki/umzug.md'], ['M2', '<abc@mail.de>']]);

  it('setzt echte Pfade und Message-IDs ein', () => {
    const ergebnis = verweiseAufloesen(
      [{ titel: 'a', quellId: 'N1#kaution', quelle: 'email' }, { titel: 'b', quellId: 'M2' }],
      verweise,
    );
    expect(ergebnis).toEqual([
      { titel: 'a', quellId: 'Privat/wiki/umzug.md#kaution', quelle: 'second-brain' },
      { titel: 'b', quellId: '<abc@mail.de>', quelle: 'email' },
    ]);
  });

  it('verwirft unbekannte Verweise', () => {
    expect(verweiseAufloesen([{ titel: 'c', quellId: 'abc@mail.de' }], verweise)).toEqual([]);
  });
});
