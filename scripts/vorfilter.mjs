// Vorfilter für den Helfer: sucht ohne KI die Stellen heraus, die überhaupt
// eine Aufgabe, einen Termin oder eine Frist sein können, und merkt sich,
// was schon einmal an Claude ging. So bekommt Claude nur Neues und nur die
// passenden Zeilen statt ganzer Notizen und Mails.
import { createHash } from 'node:crypto';

const OFFENE_AUFGABE = /^\s*(?:[-*+]|\d+\.)\s+\[ \]/;
const ERLEDIGT = /^\s*(?:[-*+]|\d+\.)\s+\[[xX]\]/;
const STICHWORT =
  /\b(?:TODO|muss noch|müssen noch|erledigen|Abgabe|abgeben|Deadline|Frist|fällig|bis zum|bis spätestens|spätestens|Termin|Prüfung|Klausur|Anmeldung|anmelden|kündigen|Kündigung|bezahlen|überweisen|einreichen|beantragen|verlängern|Vorhaben|in Arbeit|in Planung|geplant|status:\s*(?:offen|aktiv|laufend))/i;
const MONATE = 'Januar|Februar|März|April|Mai|Juni|Juli|August|September|Oktober|November|Dezember';
const MONATSDATUM = new RegExp(`\\b\\d{1,2}\\.\\s*(?:${MONATE})\\b`, 'i');
const ISO = /\b(\d{4})-(\d{2})-(\d{2})\b/g;
const DEUTSCH = /\b(\d{1,2})\.(\d{1,2})\.(\d{2}|\d{4})?(?!\d)/g;

// Wie weit ein Datum zurückliegen darf, damit die Zeile noch zählt.
const RUECKBLICK_TAGE = 14;
// Zeilen vor und nach einem Treffer, damit Claude den Zusammenhang sieht.
const UMFELD = 2;
const MAX_ZEILE = 300;
const MAX_MAILTEXT = 1200;

export function kennung(...teile) {
  return createHash('sha256').update(teile.join('\n')).digest('hex').slice(0, 16);
}

// true, wenn die Zeile ein Datum enthält, das nicht länger als
// RUECKBLICK_TAGE zurückliegt. Tag und Monat ohne Jahr zählen immer.
function hatAktuellesDatum(zeile, heute) {
  const grenze = new Date(heute);
  grenze.setDate(grenze.getDate() - RUECKBLICK_TAGE);
  if (MONATSDATUM.test(zeile)) return true;
  for (const [, j, m, t] of zeile.matchAll(ISO)) {
    if (new Date(Number(j), Number(m) - 1, Number(t)) >= grenze) return true;
  }
  for (const [, t, m, j] of zeile.matchAll(DEUTSCH)) {
    if (Number(m) < 1 || Number(m) > 12 || Number(t) < 1 || Number(t) > 31) continue;
    if (j === undefined) return true;
    const jahr = j.length === 2 ? 2000 + Number(j) : Number(j);
    if (new Date(jahr, Number(m) - 1, Number(t)) >= grenze) return true;
  }
  return false;
}

export function istTreffer(zeile, heute = new Date()) {
  if (ERLEDIGT.test(zeile)) return false;
  return OFFENE_AUFGABE.test(zeile) || STICHWORT.test(zeile) || hatAktuellesDatum(zeile, heute);
}

function kuerze(text, max) {
  return text.length > max ? `${text.slice(0, max)} …` : text;
}

// Liefert die Abschnitte einer Notiz, die mindestens eine neue Trefferzeile
// enthalten. Neue Trefferzeilen sind mit „» “ markiert, alles andere ist nur
// Umfeld. `bekannt` enthält die Kennungen schon gesehener Zeilen; die
// Kennungen der neuen Zeilen kommen in `neu` zurück.
export function stellenAusNotiz(pfad, text, bekannt, heute = new Date()) {
  const zeilen = text.split(/\r?\n/);
  // Im Vorspann (--- … ---) zählt nur eine „status:“-Zeile.
  let start = 0;
  if (zeilen[0]?.trim() === '---') {
    const ende = zeilen.indexOf('---', 1);
    if (ende > 0) start = ende + 1;
  }
  const neueZeilen = new Set();
  const neu = [];
  for (let i = 0; i < zeilen.length; i++) {
    const zeile = zeilen[i];
    if (!zeile.trim()) continue;
    if (i < start && !/^status:/i.test(zeile.trim())) continue;
    if (!istTreffer(zeile, heute)) continue;
    const k = kennung(pfad, zeile.trim());
    if (bekannt.has(k)) continue;
    neueZeilen.add(i);
    neu.push(k);
  }
  if (neueZeilen.size === 0) return { abschnitte: [], neu };

  // Umfeld dazunehmen und überlappende Bereiche zusammenlegen.
  const bereiche = [];
  for (const i of [...neueZeilen].sort((a, b) => a - b)) {
    // Der Vorspann ist kein Umfeld: dort nur die Zeile selbst.
    const von = i < start ? i : Math.max(start, i - UMFELD);
    const bis = i < start ? i : Math.min(zeilen.length - 1, i + UMFELD);
    const letzter = bereiche.at(-1);
    if (letzter && von <= letzter.bis + 1) letzter.bis = Math.max(letzter.bis, bis);
    else bereiche.push({ von, bis });
  }
  const abschnitte = bereiche.map(({ von, bis }) =>
    zeilen
      .slice(von, bis + 1)
      .map((z, j) => (neueZeilen.has(von + j) ? '» ' : '  ') + kuerze(z.trimEnd(), MAX_ZEILE))
      .filter((z) => z.trim())
      .join('\n'),
  );
  return { abschnitte, neu };
}

// Mailtext ohne Zitate, ohne weitergeleiteten Verlauf, ohne Leerraum, gekürzt.
export function mailtextKuerzen(text) {
  const zeilen = [];
  for (const zeile of String(text ?? '').split(/\r?\n/)) {
    const t = zeile.trim();
    if (/^(?:-{2,}\s*(?:Original|Ursprüngliche)|Am .+ schrieb .+:$|On .+ wrote:$|Von:\s|From:\s)/i.test(t)) break;
    if (t.startsWith('>')) continue;
    zeilen.push(t);
  }
  return kuerze(zeilen.join(' ').replace(/\s+/g, ' ').trim(), MAX_MAILTEXT);
}

// Offensichtliche Newsletter: Abmeldelink im Text und im Betreff kein
// Hinweis auf Termin oder Frist.
export function istNewsletter(mail) {
  const text = `${mail.text ?? ''}`;
  const abmelden = /unsubscribe|abmelden|abbestellen|newsletter/i.test(text);
  return abmelden && !istTreffer(`${mail.betreff ?? ''}`);
}

// Setzt für „N3#stichwort“ bzw. „M2“ den echten Pfad bzw. die Message-ID ein.
// Kandidaten mit unbekanntem Verweis fallen weg.
export function verweiseAufloesen(kandidaten, verweise) {
  const ergebnis = [];
  for (const k of kandidaten) {
    const [v, ...rest] = String(k.quellId ?? '').split('#');
    const echt = verweise.get(v.trim());
    if (echt === undefined) continue;
    const mail = v.trim().startsWith('M');
    ergebnis.push({
      ...k,
      quelle: mail ? 'email' : 'second-brain',
      quellId: mail || rest.length === 0 ? echt : `${echt}#${rest.join('#')}`,
    });
  }
  return ergebnis;
}

// Für Tagesplan („Vorschläge“): höchstens so viele Titel pro Aufruf, jeder gekürzt.
export const MAX_KURZTITEL = 40;
const MAX_TITELLAENGE = 200;

// Prüft die Anfrage { titel: [...] }: nur Texte, ohne Doppelte, begrenzt.
// Liefert null, wenn die Anfrage nicht passt.
export function kurztitelAnfrage(daten) {
  if (!daten || !Array.isArray(daten.titel)) return null;
  const titel = [...new Set(daten.titel.filter((t) => typeof t === 'string' && t.trim()))];
  return titel.slice(0, MAX_KURZTITEL);
}

// Eingabe für Claude: eine nummerierte Zeile pro Titel, lange Titel gekürzt.
export function kurztitelEingabe(titel) {
  return titel.map((t, i) => `${i + 1}. ${kuerze(t.replace(/\s+/g, ' ').trim(), MAX_TITELLAENGE)}`).join('\n');
}

// Liest Claudes Antwort (JSON-Array mit Kurztiteln in derselben Reihenfolge)
// und ordnet sie den Titeln zu. Nur 1 bis 4 Wörter, höchstens 40 Zeichen.
export function kurztitelAuswerten(titel, antwort) {
  const text = String(antwort ?? '');
  let liste;
  try {
    liste = JSON.parse(text.slice(text.indexOf('['), text.lastIndexOf(']') + 1));
  } catch {
    return {};
  }
  const ergebnis = {};
  if (!Array.isArray(liste)) return ergebnis;
  titel.forEach((t, i) => {
    const kurz = typeof liste[i] === 'string' ? liste[i].trim() : '';
    const woerter = kurz.split(/\s+/).filter(Boolean).length;
    if (woerter >= 1 && woerter <= 4 && kurz.length <= 40) ergebnis[t] = kurz;
  });
  return ergebnis;
}
