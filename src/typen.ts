export type Quelle = 'manuell' | 'second-brain' | 'email';

export interface Eintrag {
  id: string;
  titel: string;
  info: string;
  datum: string | null;
  uhrzeit: string | null;
  wichtig: boolean;
  erledigt: boolean;
  erstelltAm: string;
  erledigtAm: string | null;
  quelle: Quelle;
  quellId: string | null;
}
