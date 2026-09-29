import type { Eintrag } from './typen';

async function anfrage<T>(pfad: string, init?: RequestInit): Promise<T> {
  const antwort = await fetch(pfad, {
    ...init,
    headers: init?.body ? { 'Content-Type': 'application/json' } : undefined,
  });
  if (!antwort.ok) {
    const daten = await antwort.json().catch(() => null);
    throw new Error(daten?.fehler ?? `Anfrage fehlgeschlagen (${antwort.status}).`);
  }
  return antwort.json() as Promise<T>;
}

export function ladeEintraege(): Promise<Eintrag[]> {
  return anfrage<Eintrag[]>('/api/items');
}

export interface NeueFelder {
  titel: string;
  info: string;
  datum: string | null;
  uhrzeit: string | null;
  wichtig: boolean;
}

export function legeAn(felder: NeueFelder): Promise<Eintrag> {
  return anfrage<Eintrag>('/api/items', { method: 'POST', body: JSON.stringify(felder) });
}

export function setzeErledigt(id: string, erledigt: boolean): Promise<Eintrag> {
  return anfrage<Eintrag>(`/api/items/${encodeURIComponent(id)}`, {
    method: 'PATCH',
    body: JSON.stringify({ erledigt }),
  });
}

export function aendere(id: string, felder: Partial<NeueFelder>): Promise<Eintrag> {
  return anfrage<Eintrag>(`/api/items/${encodeURIComponent(id)}`, {
    method: 'PATCH',
    body: JSON.stringify(felder),
  });
}

export interface Geloescht {
  eintrag: Eintrag;
  index: number;
}

export function loesche(id: string): Promise<Geloescht> {
  return anfrage<Geloescht>(`/api/items/${encodeURIComponent(id)}`, { method: 'DELETE' });
}

export function stelleWiederHer(geloescht: Geloescht): Promise<Eintrag> {
  return anfrage<Eintrag>('/api/items/wiederherstellen', {
    method: 'POST',
    body: JSON.stringify(geloescht),
  });
}
