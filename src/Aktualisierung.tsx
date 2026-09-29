import { useRegisterSW } from 'virtual:pwa-register/react';

// Gibt es eine neue Version der App, erscheint oben ein Hinweis. Neu geladen
// wird erst, wenn man auf „Neu laden“ klickt, nie automatisch.
export default function Aktualisierung() {
  const {
    needRefresh: [neuVerfuegbar],
    updateServiceWorker,
  } = useRegisterSW({
    onRegisteredSW(_url, registrierung) {
      // Stündlich nach einer neuen Version sehen, falls die App lange offen ist.
      if (registrierung) setInterval(() => void registrierung.update(), 60 * 60 * 1000);
    },
  });

  if (!neuVerfuegbar) return null;

  return (
    <div className="aktualisierung-bereich" role="status" aria-live="polite">
      <div className="hinweis-box">
        <span>Neue Version verfügbar</span> <span className="hinweis-trenner">·</span>{' '}
        <button type="button" className="hinweis-aktion" onClick={() => void updateServiceWorker(true)}>
          Neu laden
        </button>
      </div>
    </div>
  );
}
