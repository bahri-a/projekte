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
