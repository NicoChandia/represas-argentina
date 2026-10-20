import { useEffect, useState } from 'react';

/** Devuelve true mientras la media query coincide. Se actualiza al girar el celular o cambiar el tema. */
export function useMediaQuery(query: string): boolean {
  const [coincide, setCoincide] = useState(() =>
    typeof window === 'undefined' ? false : window.matchMedia(query).matches
  );

  useEffect(() => {
    const mql = window.matchMedia(query);
    const alCambiar = (e: MediaQueryListEvent) => setCoincide(e.matches);
    setCoincide(mql.matches);
    mql.addEventListener('change', alCambiar);
    return () => mql.removeEventListener('change', alCambiar);
  }, [query]);

  return coincide;
}
