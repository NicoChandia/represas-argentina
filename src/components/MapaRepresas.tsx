import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Map, { AttributionControl, Layer, Marker, NavigationControl, Source, type MapRef } from 'react-map-gl/maplibre';
import { setWorkerUrl, type StyleSpecification } from 'maplibre-gl';
// MapLibre 6 carga su "worker" desde un archivo aparte: Vite lo copia y nos da la URL final.
import workerUrl from 'maplibre-gl/dist/maplibre-gl-worker.mjs?url';
import type { FeatureCollection, LineString } from 'geojson';
import 'maplibre-gl/dist/maplibre-gl.css';
import './mapa.css';

import { cascadas, cuencas, fotosDe, generaEnergia, num, porId, represas, totales, type Represa } from '../data/represas';
import { useMediaQuery } from './useMediaQuery';
import { duracionLectura, useNarrador } from './useNarrador';
import datosOriginales from '../data/represas.json';

/** Solo en `npm run dev`: permite arrastrar marcadores para corregir coordenadas. */
const MODO_DEV = import.meta.env.DEV;
const redondear = (n: number) => Math.round(n * 100000) / 100000;
import { Ficha } from './Ficha';

setWorkerUrl(workerUrl);

// ---------- Configuración del mapa ----------

/** Argentina continental: el mapa arranca acá y no deja alejarse mucho más. */
const ARGENTINA: [[number, number], [number, number]] = [[-73.6, -55.1], [-53.6, -21.8]];
// Margen amplio: en pantallas anchas un límite justo obliga a acercar el mapa y corta el norte.
const LIMITES: [number, number, number, number] = [-110, -70, -15, 5];

/** Espacio libre al abrir, para que el panel no tape el país. */
function margenInicial() {
  if (typeof window === 'undefined') return 24;
  return window.innerWidth >= 900
    ? { top: 32, bottom: 32, left: 432, right: 32 }
    : { top: 64, bottom: 150, left: 16, right: 16 };
}

const ESTILO_CLARO = 'https://basemaps.cartocdn.com/gl/positron-gl-style/style.json';
const ESTILO_OSCURO = 'https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json';
const ESTILO_SATELITE: StyleSpecification = {
  version: 8,
  sources: {
    satelite: {
      type: 'raster',
      tiles: ['https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}'],
      tileSize: 256,
      maxzoom: 18,
      attribution: 'Imágenes © Esri, Maxar, Earthstar Geographics',
    },
  },
  layers: [{ id: 'satelite', type: 'raster', source: 'satelite' }],
};

const ZOOM_REPRESA = 10.5;
/** Duración del vuelo entre represas durante el recorrido. */
const VUELO_MS = 3200;

/** Tamaño del círculo según potencia instalada (raíz cuadrada para que 1.400 MW no tape todo). */
const diametro = (r: Represa) => (r.potenciaMW ? Math.round(12 + Math.sqrt(r.potenciaMW) * 0.75) : 12);

/** Cascadas como líneas GeoJSON (esquema: une presas en línea recta en el sentido del río). */
const lineasCascadas: FeatureCollection<LineString> = {
  type: 'FeatureCollection',
  features: cascadas.map(c => ({
    type: 'Feature',
    properties: { rio: c.rio },
    geometry: { type: 'LineString', coordinates: c.ids.map(id => { const r = porId(id)!; return [r.lon, r.lat]; }) },
  })),
};

function leerParametro(): string | null {
  const id = new URLSearchParams(window.location.search).get('r');
  return id && porId(id) ? id : null;
}

// ---------- Componente ----------

export default function MapaRepresas() {
  const mapRef = useRef<MapRef>(null);
  const panelRef = useRef<HTMLElement>(null);

  const esCelular = useMediaQuery('(max-width: 899px)');
  const temaOscuro = useMediaQuery('(prefers-color-scheme: dark)');
  const sinAnimaciones = useMediaQuery('(prefers-reduced-motion: reduce)');

  const [selId, setSelId] = useState<string | null>(() => leerParametro());
  const [filtro, setFiltro] = useState<string | null>(null);
  const [vista, setVista] = useState<'mapa' | 'satelite'>('mapa');
  const [hojaAbierta, setHojaAbierta] = useState(() => leerParametro() !== null);
  const [reproduciendo, setReproduciendo] = useState(false);
  const [zoom, setZoom] = useState(4);
  const [editando, setEditando] = useState(false);
  const narrador = useNarrador();
  useEffect(() => { if (MODO_DEV && narrador.voz) console.info('[narrador] voz elegida:', narrador.voz); }, [narrador.voz]);
  const [conVoz, setConVoz] = useState(() => {
    try { return localStorage.getItem('represas:voz') !== 'no'; } catch { return true; }
  });
  const [hablando, setHablando] = useState(false);
  const [fotoIdx, setFotoIdx] = useState(0);
  const [fotosRotas, setFotosRotas] = useState<string[]>([]);
  const [ajustes, setAjustes] = useState<Record<string, { lat: number; lon: number }>>({});

  /** Arma el represas.json con las coordenadas corregidas y lo descarga. */
  function descargarJson() {
    const nuevo = (datosOriginales as Represa[]).map(r => (ajustes[r.id] ? { ...r, ...ajustes[r.id] } : r));
    const blob = new Blob([JSON.stringify(nuevo, null, 2) + '\n'], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'represas.json';
    a.click();
    URL.revokeObjectURL(a.href);
  }

  const visibles = useMemo(() => (filtro ? represas.filter(r => r.cuenca === filtro) : represas), [filtro]);
  const seleccionada = selId ? porId(selId) : null;
  const indice = seleccionada ? visibles.findIndex(r => r.id === seleccionada.id) : -1;

  /** Espacio que tapa el panel, para que la represa quede a la vista y no debajo. */
  const margenes = useCallback(() => {
    const alto = panelRef.current?.offsetHeight ?? 0;
    return esCelular
      ? { top: 70, bottom: Math.min(alto, window.innerHeight * 0.75) + 24, left: 24, right: 24 }
      : { top: 48, bottom: 48, left: 420, right: 48 };
  }, [esCelular]);

  /** true mientras corre el recorrido automático (se lee dentro de callbacks sin re-crearlos). */
  const enRecorrido = useRef(false);

  const volarA = useCallback(
    (r: Represa) => {
      // Espera un cuadro para medir el panel ya abierto
      requestAnimationFrame(() => {
        const cine = enRecorrido.current && !sinAnimaciones;
        mapRef.current?.flyTo({
          center: [r.lon, r.lat],
          // En el recorrido llega un poco más lejos e inclinada, para después acercarse despacio.
          zoom: cine ? ZOOM_REPRESA - 0.8 : ZOOM_REPRESA,
          pitch: cine ? 50 : 0,
          bearing: cine ? -12 : 0,
          padding: margenes(),
          duration: sinAnimaciones ? 0 : cine ? VUELO_MS : 2200,
          curve: 1.6,
          essential: true,
        });
      });
    },
    [margenes, sinAnimaciones]
  );

  const encuadrar = useCallback(
    (lista: Represa[]) => {
      if (!mapRef.current || lista.length === 0) return;
      const lons = lista.map(r => r.lon);
      const lats = lista.map(r => r.lat);
      mapRef.current.fitBounds(
        [[Math.min(...lons), Math.min(...lats)], [Math.max(...lons), Math.max(...lats)]],
        { padding: margenes(), maxZoom: 8.5, duration: sinAnimaciones ? 0 : 1400 }
      );
    },
    [margenes, sinAnimaciones]
  );

  const seleccionar = useCallback(
    (id: string | null) => {
      setSelId(id);
      const url = new URL(window.location.href);
      if (id) url.searchParams.set('r', id);
      else url.searchParams.delete('r');
      window.history.replaceState(null, '', url);
      if (id) {
        setHojaAbierta(true);
        volarA(porId(id)!);
      }
    },
    [volarA]
  );

  const mover = useCallback(
    (paso: 1 | -1) => {
      if (visibles.length === 0) return;
      const base = indice === -1 ? (paso === 1 ? -1 : 0) : indice;
      const siguiente = (base + paso + visibles.length) % visibles.length;
      seleccionar(visibles[siguiente].id);
    },
    [indice, visibles, seleccionar]
  );

  function elegirCuenca(c: string | null) {
    setFiltro(c);
    setReproduciendo(false);
    const lista = c ? represas.filter(r => r.cuenca === c) : represas;
    if (seleccionada && c && seleccionada.cuenca !== c) seleccionar(null);
    if (!seleccionada || (c && seleccionada.cuenca !== c)) encuadrar(lista);
  }

  // Recorrido automático: vuela a la represa, la narra y, cuando termina, pasa a la siguiente.
  useEffect(() => {
    if (!reproduciendo) return;
    if (!seleccionada || indice === -1) { seleccionar(visibles[0].id); return; }

    let cancelado = false;
    const timers: number[] = [];
    const siguiente = () => {
      if (cancelado) return;
      setHablando(false);
      // Pausa corta: el vuelo a la próxima represa arranca casi enseguida, sin silencio largo.
      timers.push(window.setTimeout(() => {
        if (cancelado) return;
        if (indice >= visibles.length - 1) setReproduciendo(false); // terminó el recorrido
        else mover(1);
      }, 500));
    };
    // La voz empieza mientras la cámara todavía está llegando, para que no quede un hueco.
    timers.push(window.setTimeout(() => {
      if (cancelado) return;
      setHablando(true);
      if (conVoz && narrador.disponible) narrador.hablar(seleccionada.relato, siguiente);
      else timers.push(window.setTimeout(siguiente, duracionLectura(seleccionada.relato)));
    }, sinAnimaciones ? 300 : 1600));
    // Mientras habla, la cámara se acerca y gira despacio alrededor de la presa.
    if (!sinAnimaciones) {
      timers.push(window.setTimeout(() => {
        if (cancelado) return;
        mapRef.current?.easeTo({
          center: [seleccionada.lon, seleccionada.lat],
          padding: margenes(),
          zoom: ZOOM_REPRESA + 0.9,
          bearing: 18,
          pitch: 58,
          duration: duracionLectura(seleccionada.relato) + 1500,
          easing: t => t, // movimiento parejo, sin frenadas
          essential: true,
        });
      }, VUELO_MS + 100));
    }

    return () => {
      cancelado = true;
      timers.forEach(t => window.clearTimeout(t));
      narrador.cancelar();
      setHablando(false);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [reproduciendo, selId, conVoz, visibles]);

  // Fotos durante el relato: se reparten a lo largo del texto (mínimo 5 s cada una), sin repetir.
  const fotosRecorrido = seleccionada ? fotosDe(seleccionada).filter(f => !fotosRotas.includes(f.src)) : [];
  // En la computadora la galería de la ficha ya muestra la primera foto, así que la superpuesta arranca en la segunda.
  const desfase = !esCelular && fotosRecorrido.length > 1 ? 1 : 0;
  useEffect(() => {
    setFotoIdx(0);
    if (!reproduciendo || !hablando || !seleccionada || fotosRecorrido.length < 2) return;
    const total = duracionLectura(seleccionada.relato);
    const cantidad = Math.min(fotosRecorrido.length, Math.max(1, Math.floor(total / 5000)));
    const intervalo = total / cantidad;
    const t = window.setInterval(() => setFotoIdx(i => i + 1), intervalo);
    return () => window.clearInterval(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [reproduciendo, hablando, selId, fotosRecorrido.length]);
  const fotoActual = fotosRecorrido.length ? fotosRecorrido[(fotoIdx + desfase) % fotosRecorrido.length] : null;

  // Al empezar el recorrido: vista satelital y cámara de cine. Al terminar: todo vuelve como estaba.
  const vistaPrevia = useRef<'mapa' | 'satelite'>('mapa');
  useEffect(() => {
    enRecorrido.current = reproduciendo;
    if (reproduciendo) {
      vistaPrevia.current = vista;
      setVista('satelite');
    } else {
      setVista(vistaPrevia.current);
      const m = mapRef.current;
      if (m && (m.getPitch() > 0 || m.getBearing() !== 0)) m.easeTo({ pitch: 0, bearing: 0, duration: 900 });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [reproduciendo]);

  function alternarVoz() {
    const activar = !conVoz;
    try { localStorage.setItem('represas:voz', activar ? 'si' : 'no'); } catch { /* sin almacenamiento */ }
    // Dentro del click: así el navegador habilita la voz.
    if (activar) narrador.desbloquear('Narración activada.');
    else narrador.cancelar();
    setConVoz(activar);
  }

  // Flechas del teclado: anterior / siguiente. Escape: cerrar la ficha.
  useEffect(() => {
    function alPresionar(e: KeyboardEvent) {
      const t = e.target as HTMLElement;
      if (t.closest('input, textarea, select')) return;
      if (e.key === 'ArrowRight') { e.preventDefault(); mover(1); }
      if (e.key === 'ArrowLeft') { e.preventDefault(); mover(-1); }
      if (e.key === 'Escape' && selId) seleccionar(null);
    }
    window.addEventListener('keydown', alPresionar);
    return () => window.removeEventListener('keydown', alPresionar);
  }, [mover, seleccionar, selId]);

  // Botón "atrás" o enlace con ?r=
  useEffect(() => {
    const alVolver = () => setSelId(leerParametro());
    window.addEventListener('popstate', alVolver);
    return () => window.removeEventListener('popstate', alVolver);
  }, []);

  const estilo = vista === 'satelite' ? ESTILO_SATELITE : temaOscuro ? ESTILO_OSCURO : ESTILO_CLARO;
  const colorLinea = vista === 'satelite' ? '#ffffff' : temaOscuro ? '#5bc4de' : '#0a6c88';
  const mostrarNombres = zoom >= 6.5;

  return (
    <div className="mapa-app">
      <div className="mapa">
        <Map
          ref={mapRef}
          initialViewState={{ bounds: ARGENTINA, fitBoundsOptions: { padding: margenInicial() } }}
          maxBounds={LIMITES}
          minZoom={3}
          maxZoom={16}
          mapStyle={estilo}
          attributionControl={false}
          dragRotate={false}
          touchPitch={false}
          onLoad={() => {
            const inicial = leerParametro();
            if (inicial) volarA(porId(inicial)!);
          }}
          onMove={e => setZoom(Math.round(e.viewState.zoom * 2) / 2)}
          onDragStart={() => setReproduciendo(false)}
          style={{ position: 'absolute', inset: 0 }}
        >
          <AttributionControl position={esCelular ? 'top-right' : 'bottom-right'} compact />
          {!esCelular && <NavigationControl position="bottom-right" showCompass={false} />}

          <Source id="cascadas" type="geojson" data={lineasCascadas}>
            <Layer
              id="cascadas-linea"
              type="line"
              layout={{ 'line-cap': 'round', 'line-join': 'round' }}
              paint={{
                'line-color': colorLinea,
                'line-width': ['interpolate', ['linear'], ['zoom'], 4, 1.5, 9, 3],
                'line-opacity': 0.75,
                'line-dasharray': [1.5, 1.5],
              }}
            />
          </Source>

          {visibles.map(r => {
            const activa = r.id === selId;
            return (
              <Marker
                key={r.id}
                longitude={ajustes[r.id]?.lon ?? r.lon}
                latitude={ajustes[r.id]?.lat ?? r.lat}
                anchor="center"
                style={{ zIndex: activa ? 3 : 1 }}
                draggable={MODO_DEV && editando}
                onDragEnd={e => setAjustes(a => ({ ...a, [r.id]: { lat: redondear(e.lngLat.lat), lon: redondear(e.lngLat.lng) } }))}
              >
                <button
                  type="button"
                  className="marcador"
                  data-energia={generaEnergia(r)}
                  data-activa={activa}
                  aria-label={`${r.nombreComun}, río ${r.rio}${r.potenciaMW ? `, ${num(r.potenciaMW, 'MW')}` : ''}`}
                  aria-pressed={activa}
                  onClick={e => { e.stopPropagation(); setReproduciendo(false); seleccionar(r.id); }}
                >
                  <span className="punto" style={{ width: diametro(r), height: diametro(r) }} />
                  {(mostrarNombres || activa) && <span className="etiqueta">{r.nombreComun}</span>}
                </button>
              </Marker>
            );
          })}
        </Map>
      </div>

      {/* Foto de la represa mientras se narra (con un zoom lento, estilo documental) */}
      {reproduciendo && !esCelular && seleccionada && fotoActual && (
        <figure className="foto-recorrido" key={seleccionada.id} aria-hidden={!hablando}>
          <div className="foto-marco">
            <img
              key={fotoActual.src}
              src={fotoActual.src}
              alt={`${seleccionada.nombreComun}, foto`}
              referrerPolicy="no-referrer"
              style={{ animationDuration: '9s' }}
              onError={() => setFotosRotas(f => [...f, fotoActual.src])}
            />
          </div>
          <figcaption>
            <strong>{seleccionada.nombreComun}</strong> · {fotoActual.credito}
          </figcaption>
        </figure>
      )}

      {/* Selector de capa base */}
      <div className="capas" role="group" aria-label="Tipo de mapa">
        <button type="button" aria-pressed={vista === 'mapa'} onClick={() => setVista('mapa')}>Mapa</button>
        <button type="button" aria-pressed={vista === 'satelite'} onClick={() => setVista('satelite')}>Satélite</button>
      </div>

      {MODO_DEV && !reproduciendo && (
        <div className="editor-dev">
          <label>
            <input type="checkbox" checked={editando} onChange={e => { setEditando(e.target.checked); if (e.target.checked) setVista('satelite'); }} />
            Corregir ubicaciones (solo en desarrollo)
          </label>
          {editando && (
            <>
              <p>Arrastrá cada círculo hasta la presa real. Movidas: <strong>{Object.keys(ajustes).length}</strong></p>
              <button type="button" disabled={Object.keys(ajustes).length === 0} onClick={descargarJson}>
                Descargar represas.json
              </button>
              <small>Reemplazá src/data/represas.json con el archivo descargado.</small>
            </>
          )}
        </div>
      )}

      {/* Panel: hoja inferior en el celular, columna izquierda en pantallas grandes */}
      <aside ref={panelRef} className="panel" data-abierta={hojaAbierta} aria-label="Recorrido y ficha de represas">
        <button
          type="button"
          className="asa"
          aria-expanded={hojaAbierta}
          aria-controls="panel-cuerpo"
          onClick={() => setHojaAbierta(a => !a)}
        >
          <span aria-hidden="true" />
          <span className="visually-hidden">{hojaAbierta ? 'Achicar panel' : 'Agrandar panel'}</span>
        </button>

        <div className="recorrido">
          <button type="button" className="redondo" onClick={() => { setReproduciendo(false); mover(-1); }} aria-label="Represa anterior (más al norte)">
            <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M15 5l-7 7 7 7" /></svg>
          </button>
          <div className="recorrido-texto">
            <span className="eyebrow">Norte → Sur{filtro ? ` · ${filtro}` : ''}</span>
            <strong>
              {seleccionada ? seleccionada.nombreComun : 'Recorré las represas'}
            </strong>
            <span className="num contador">{indice === -1 ? '–' : indice + 1} / {visibles.length}</span>
          </div>
          <button type="button" className="redondo" onClick={() => { setReproduciendo(false); mover(1); }} aria-label="Represa siguiente (más al sur)">
            <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M9 5l7 7-7 7" /></svg>
          </button>
          <button
            type="button"
            className="redondo play"
            aria-pressed={reproduciendo}
            onClick={() => {
              if (reproduciendo) narrador.cancelar();
              else if (conVoz) narrador.desbloquear(indice === -1 ? 'Comenzamos el recorrido.' : 'Seguimos.');
              setReproduciendo(p => !p);
            }}
            aria-label={reproduciendo ? 'Pausar recorrido' : 'Recorrer automáticamente'}
          >
            {reproduciendo ? (
              <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M8 5v14M16 5v14" /></svg>
            ) : (
              <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7 4.5v15l12-7.5z" className="relleno" /></svg>
            )}
          </button>
        </div>

        <div className="narracion">
          {narrador.disponible ? (
            <button type="button" className="narracion-boton" aria-pressed={conVoz} onClick={alternarVoz}>
              {conVoz ? (
                <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 9.5h3.5L12 5.5v13l-4.5-4H4z" className="relleno" /><path d="M15.5 9a4 4 0 0 1 0 6M18 6.5a7.5 7.5 0 0 1 0 11" /></svg>
              ) : (
                <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 9.5h3.5L12 5.5v13l-4.5-4H4z" className="relleno" /><path d="M16 9.5l5 5M21 9.5l-5 5" /></svg>
              )}
              <span>Narración: <strong>{conVoz ? 'activada' : 'desactivada'}</strong></span>
            </button>
          ) : (
            <span className="narracion-aviso">Este navegador no tiene voz: el recorrido muestra el texto.</span>
          )}
          {narrador.problema && conVoz && <span className="narracion-aviso" role="status">{narrador.problema}</span>}
        </div>

        <div id="panel-cuerpo" className="panel-cuerpo">
          <div className="filtros" role="group" aria-label="Filtrar por cuenca">
            <button type="button" aria-pressed={filtro === null} onClick={() => elegirCuenca(null)}>
              Todas <span className="num">{represas.length}</span>
            </button>
            {cuencas.map(c => (
              <button key={c} type="button" aria-pressed={filtro === c} onClick={() => elegirCuenca(c)}>
                {c} <span className="num">{represas.filter(r => r.cuenca === c).length}</span>
              </button>
            ))}
          </div>

          {seleccionada ? (
            <Ficha represa={seleccionada} hablando={hablando} fotoIdx={reproduciendo ? fotoIdx : 0} onElegir={id => { setReproduciendo(false); seleccionar(id); }} onCerrar={() => { seleccionar(null); encuadrar(visibles); }} />
          ) : (
            <div className="inicio">
              <p className="intro">
                <span className="num">{totales.represas}</span> presas fiscalizadas por el ORSEP, ordenadas de norte a sur. Las que generan electricidad suman{' '}
                <span className="num">{num(totales.potenciaMW, 'MW')}</span> instalados. Tocá una en el mapa o en la lista.
              </p>
              <ol className="lista">
                {visibles.map(r => (
                  <li key={r.id}>
                    <button type="button" onClick={() => seleccionar(r.id)}>
                      <span className="dot" data-energia={generaEnergia(r)} aria-hidden="true" />
                      <span className="lista-nombre">
                        <strong>{r.nombreComun}</strong>
                        <small>Río {r.rio} · {r.provincia}</small>
                      </span>
                      <span className="num lista-mw">{r.potenciaMW ? `${num(r.potenciaMW)} MW` : '—'}</span>
                    </button>
                  </li>
                ))}
              </ol>
              <div className="leyenda" aria-label="Referencias">
                <span><i className="dot" data-energia="true" /> Genera electricidad</span>
                <span><i className="dot" data-energia="false" /> Riego, crecidas o compensación</span>
                <span><i className="linea" /> Represas encadenadas en un río (esquema)</span>
                <span>El tamaño del círculo indica la potencia instalada.</span>
              </div>
            </div>
          )}
        </div>
      </aside>
    </div>
  );
}
