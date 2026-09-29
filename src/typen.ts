export type Quelle = 'manuell' | 'second-brain' | 'email';

// „eigen“: selbst erstellt. „automatisch“: aus Second Brain oder E-Mail
// vorgeschlagen; solange `vorschlag` true ist, wartet er auf Annehmen/Ablehnen.
export type Bereich = 'eigen' | 'automatisch';

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
  bereich: Bereich;
  vorschlag: boolean;
}

// Vorläufige Einträge (noch ohne Antwort des Servers) haben diese id.
export function istVorlaeufig(e: Eintrag): boolean {
  return e.id.startsWith('neu-');
}
