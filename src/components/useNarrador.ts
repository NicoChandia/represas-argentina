import { useCallback, useEffect, useRef, useState } from 'react';

/**
 * Narrador con la voz del navegador (Web Speech API). Gratis y sin servidor.
 * La calidad depende del dispositivo: Chrome y Edge traen voces en español bastante naturales.
 */
export function useNarrador() {
  const disponible = typeof window !== 'undefined' && 'speechSynthesis' in window;
  const [voz, setVoz] = useState<SpeechSynthesisVoice | null>(null);
  const seguridad = useRef<number | undefined>(undefined);
  /** null = todo bien; texto = por qué no se pudo hablar (se muestra en pantalla). */
  const [problema, setProblema] = useState<string | null>(null);

  // Las voces se cargan de forma asíncrona en algunos navegadores.
  useEffect(() => {
    if (!disponible) return;
    const elegir = () => {
      const voces = window.speechSynthesis.getVoices().filter(v => v.lang.toLowerCase().startsWith('es'));
      const prioridad = (v: SpeechSynthesisVoice) => {
        const l = v.lang.toLowerCase();
        let p = l === 'es-ar' ? 0 : l === 'es-419' || l === 'es-us' || l === 'es-mx' ? 1 : 2;
        if (/natural|online|neural|google/i.test(v.name)) p -= 0.5; // voces más naturales primero
        return p;
      };
      setVoz(voces.sort((a, b) => prioridad(a) - prioridad(b))[0] ?? null);
    };
    elegir();
    window.speechSynthesis.addEventListener('voiceschanged', elegir);
    return () => window.speechSynthesis.removeEventListener('voiceschanged', elegir);
  }, [disponible]);

  const cancelar = useCallback(() => {
    window.clearTimeout(seguridad.current);
    if (disponible) window.speechSynthesis.cancel();
  }, [disponible]);

  /** Lee el texto oración por oración (Chrome corta las frases largas) y avisa al terminar. */
  const hablar = useCallback(
    (texto: string, alTerminar: () => void) => {
      cancelar();
      let terminado = false;
      const fin = () => {
        if (terminado) return;
        terminado = true;
        window.clearTimeout(seguridad.current);
        alTerminar();
      };
      // Red de seguridad por si el navegador nunca avisa que terminó. No corta mientras siga hablando:
      // si al vencer todavía está hablando, espera un poco más y vuelve a revisar.
      const vigilar = (ms: number) => {
        window.clearTimeout(seguridad.current);
        seguridad.current = window.setTimeout(() => {
          if (disponible && (window.speechSynthesis.speaking || window.speechSynthesis.pending)) vigilar(1500);
          else fin();
        }, ms);
      };
      vigilar(duracionLectura(texto) + 6000);

      if (!disponible) return;
      // Para la voz: "1.200" se dice "mil doscientos" (sin el punto de miles, que algunas voces leen
      // como "uno punto doscientos"). Y se corta en oraciones solo cuando el punto va seguido de un espacio.
      const hablado = texto.replace(/(\d)\.(?=\d{3}(?!\d))/g, '$1');
      const oraciones = hablado.split(/(?<=[.!?])\s+/).filter(Boolean);
      oraciones.forEach((o, i) => {
        const u = new SpeechSynthesisUtterance(o.trim());
        u.lang = voz?.lang ?? 'es-AR';
        if (voz) u.voice = voz;
        u.rate = 1;
        if (i === oraciones.length - 1) u.onend = fin;
        // Si la voz falla (por ejemplo, el equipo no tiene voces), se deja el tiempo de lectura del subtítulo.
        u.onerror = e => {
          if (e.error === 'interrupted' || e.error === 'canceled' || terminado) return;
          setProblema(
            e.error === 'not-allowed'
              ? 'El navegador bloqueó la voz. Tocá el botón de narración para activarla.'
              : 'Este navegador no pudo leer en voz alta. El recorrido sigue con el texto en pantalla.'
          );
          window.speechSynthesis.cancel();
          window.clearTimeout(seguridad.current);
          seguridad.current = window.setTimeout(fin, duracionLectura(texto));
        };
        u.onstart = () => {
          if (i === 0) setProblema(null);
          vigilar(duracionLectura(o) + 6000); // cada oración renueva el plazo
        };
        window.speechSynthesis.speak(u);
      });
    },
    [cancelar, disponible, voz]
  );

  /**
   * Los navegadores solo dejan hablar después de un toque del usuario.
   * Se llama dentro del click (botón ▶ o de narración) con una frase corta, y eso habilita las siguientes.
   */
  const desbloquear = useCallback(
    (frase: string) => {
      if (!disponible) return;
      window.speechSynthesis.cancel();
      window.speechSynthesis.resume(); // Chrome a veces queda en pausa
      const u = new SpeechSynthesisUtterance(frase);
      u.lang = voz?.lang ?? 'es-AR';
      if (voz) u.voice = voz;
      u.onstart = () => setProblema(null);
      u.onerror = e => {
        if (e.error === 'not-allowed') setProblema('El navegador bloqueó la voz. Tocá el botón de narración para activarla.');
        else if (e.error !== 'interrupted' && e.error !== 'canceled') setProblema('Este navegador no pudo leer en voz alta. El recorrido sigue con el texto en pantalla.');
      };
      window.speechSynthesis.speak(u);
    },
    [disponible, voz]
  );

  useEffect(() => cancelar, [cancelar]);

  return { disponible, hablar, cancelar, desbloquear, problema, voz: voz ? `${voz.name} (${voz.lang})` : null };
}

/** Tiempo aproximado que lleva leer o decir el texto (unas 2,4 palabras por segundo, como la voz del navegador). */
export const duracionLectura = (texto: string) => Math.max(5000, texto.split(/\s+/).length * 420);
