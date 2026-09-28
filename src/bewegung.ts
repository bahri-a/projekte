// Dezente Animationen, die bei „reduzierter Bewegung“ entfallen.
export const DAUER = 200;

export function bewegungReduziert(): boolean {
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

// Lässt ein Element ausblenden und zusammenfallen. Das Versprechen erfüllt
// sich, wenn die Animation vorbei ist (bei reduzierter Bewegung sofort).
export function ausblenden(el: HTMLElement | null): Promise<void> {
  if (!el || bewegungReduziert() || !el.animate) return Promise.resolve();
  const stil = getComputedStyle(el);
  const animation = el.animate(
    [
      { opacity: 1, height: `${el.offsetHeight}px`, paddingTop: stil.paddingTop, paddingBottom: stil.paddingBottom },
      { opacity: 0, height: '0px', paddingTop: '0px', paddingBottom: '0px' },
    ],
    { duration: DAUER, easing: 'ease-out', fill: 'forwards' },
  );
  // Spätestens nach der Dauer weitermachen, auch wenn der Browser die
  // Animation anhält (z. B. in einem Hintergrund-Tab).
  const spaetestens = new Promise<void>((fertig) => setTimeout(fertig, DAUER + 50));
  const ende = animation.finished.then(
    () => undefined,
    () => undefined,
  );
  return Promise.race([ende, spaetestens]);
}
