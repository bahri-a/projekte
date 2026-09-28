import type { Quelle } from './typen';

const TEXTE: Partial<Record<Quelle, string>> = {
  email: 'Aus E-Mail',
  'second-brain': 'Aus Second Brain',
};

// Winziges graues Symbol für importierte Einträge. Manuelle zeigen nichts.
export default function Herkunft({ quelle }: { quelle: Quelle }) {
  const text = TEXTE[quelle];
  if (!text) return null;
  return (
    <span className="herkunft" title={text} aria-label={text} role="img">
      <svg viewBox="0 0 16 16" width="13" height="13" aria-hidden="true">
        {quelle === 'email' ? (
          <>
            <rect x="2" y="3.5" width="12" height="9" rx="1.5" />
            <path d="m2.5 4.5 5.5 4.25 5.5-4.25" />
          </>
        ) : (
          <>
            <path d="M8 4.5c-1.2-1-2.9-1.5-5.5-1.5v9c2.6 0 4.3.5 5.5 1.5 1.2-1 2.9-1.5 5.5-1.5V3c-2.6 0-4.3.5-5.5 1.5Z" />
            <path d="M8 4.5V13" />
          </>
        )}
      </svg>
    </span>
  );
}
