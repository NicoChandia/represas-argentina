import { useEffect, useRef, useState } from 'react';
import { fotosDe, notaDe, num, vecinas, type Foto, type Represa } from '../data/represas';

type FichaProps = {
  represa: Represa;
  /** true mientras el narrador lee el relato: lo resalta como subtítulo. */
  hablando?: boolean;
  /** Foto que se muestra en la galería (en el recorrido, pasa sola a la segunda). */
  fotoIdx?: number;
  onElegir: (id: string) => void;
  onCerrar: () => void;
};

export function Ficha({ represa: r, hablando = false, fotoIdx = 0, onElegir, onCerrar }: FichaProps) {
  const { arriba, abajo } = vecinas(r.id);
  const nota = notaDe(r);

  return (
    <article className="ficha" key={r.id}>
      <Galeria fotos={fotosDe(r)} nombre={r.nombreComun} indice={fotoIdx} />

      <header className="ficha-cabecera">
        <h2>{r.nombreComun}</h2>
        {r.nombre !== r.nombreComun && <p className="oficial">Nombre oficial: {r.nombre}</p>}
        <p className="ubicacion">
          Río {r.rio} · {r.provincia}
          {r.localidad ? ` · cerca de ${r.localidad}` : ''}
        </p>
      </header>

      <p className="relato" data-hablando={hablando} aria-live={hablando ? 'polite' : 'off'}>{r.relato}</p>

      <dl className="datos">
        <div><dt>Potencia</dt><dd className="num">{num(r.potenciaMW, 'MW')}</dd></div>
        <div><dt>Altura</dt><dd className="num">{num(r.alturaM, 'm')}</dd></div>
        <div><dt>Embalse</dt><dd className="num">{num(r.embalseHm3, 'hm³')}</dd></div>
        <div><dt>Habilitada</dt><dd className="num">{r.anio}</dd></div>
      </dl>

      <ul className="finalidades" aria-label="Finalidades">
        {r.finalidades.map(f => <li key={f} className="chip">{f}</li>)}
      </ul>

      {nota && <p className="nota">{nota}</p>}

      {(arriba.length > 0 || abajo.length > 0) && (
        <nav className="vecinas" aria-label="Represas en el mismo río">
          {arriba.map(v => (
            <button key={v.id} type="button" onClick={() => onElegir(v.id)}>
              <small>Aguas arriba</small>{v.nombreComun}
            </button>
          ))}
          {abajo.map(v => (
            <button key={v.id} type="button" onClick={() => onElegir(v.id)}>
              <small>Aguas abajo</small>{v.nombreComun}
            </button>
          ))}
        </nav>
      )}

      <div className="acciones">
        <a className="boton" href={`/represas/${r.id}/`}>Ficha completa</a>
        <button type="button" className="boton sec" onClick={onCerrar}>Ver todas</button>
      </div>
      <p className="fuente">
        Datos y fotos: <a href={r.fuente} target="_blank" rel="noopener">ORSEP</a> · Operador: {r.operador}
      </p>
    </article>
  );
}

function Galeria({ fotos, nombre, indice = 0 }: { fotos: Foto[]; nombre: string; indice?: number }) {
  const [fallidas, setFallidas] = useState<string[]>([]);
  const ref = useRef<HTMLDivElement>(null);
  const validas = fotos.filter(f => !fallidas.includes(f.src));

  // Desliza la galería hasta la foto indicada (sin mover la página).
  useEffect(() => {
    const g = ref.current;
    if (!g || validas.length === 0) return;
    const i = indice % validas.length;
    const foto = g.children[i] as HTMLElement | undefined;
    if (foto) g.scrollTo({ left: i * (foto.offsetWidth + 8), behavior: 'smooth' }); // 8 = gap entre fotos
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [indice]);

  if (validas.length === 0) return null;

  return (
    <div className="galeria" ref={ref} tabIndex={0} aria-label={`Fotos de ${nombre}`}>
      {validas.map((f, i) => (
        <figure key={f.src}>
          <img
            src={f.src}
            alt={`${nombre}, foto ${i + 1}`}
            loading={i === 0 ? 'eager' : 'lazy'}
            decoding="async"
            referrerPolicy="no-referrer"
            onError={() => setFallidas(l => [...l, f.src])}
          />
          <figcaption>
            <a href={f.pagina} target="_blank" rel="noopener">{f.credito}</a>
          </figcaption>
        </figure>
      ))}
    </div>
  );
}
