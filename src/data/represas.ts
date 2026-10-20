import datos from './represas.json';

export type Represa = {
  id: string;
  nombre: string;
  nombreComun: string;
  complejo: string;
  operador: string;
  provincia: string;
  localidad: string | null;
  rio: string;
  cuenca: string;
  regional: string;
  tipo: string | null;
  alturaM: number | null;
  coronamientoM: number | null;
  embalseHm3: number | null;
  finalidades: string[];
  potenciaMW: number | null;
  generacionGWh: number | null;
  anio: number;
  lat: number;
  lon: number;
  imagenes: string[];
  fuente: string;
  /** 'OpenStreetMap' si la ubicación sale del muro dibujado en OSM; 'aproximada' si no se encontró. */
  coordenadas: 'OpenStreetMap' | 'aproximada';
  /** Texto que se lee en voz alta durante el recorrido (también se muestra en la ficha). */
  relato: string;
  /** Fotos con licencia libre de Wikimedia Commons (hay que mostrar autor y licencia). */
  fotosLibres: { src: string; autor: string | null; licencia: string; pagina: string }[];
};

export type Foto = { src: string; credito: string; pagina: string };

/** Todas las fotos de una represa: primero las del ORSEP y después las de Wikimedia Commons. */
export function fotosDe(r: Represa): Foto[] {
  return [
    ...r.imagenes.map(src => ({ src, credito: 'Foto: ORSEP', pagina: r.fuente })),
    ...r.fotosLibres.map(f => ({
      src: f.src,
      credito: `Foto: ${f.autor ?? 'autor en Wikimedia Commons'} · ${f.licencia}`,
      pagina: f.pagina,
    })),
  ];
}

/** Todas las represas ordenadas de norte a sur (latitud mayor primero). */
export const represas: Represa[] = (datos as Represa[]).slice().sort((a, b) => b.lat - a.lat);

export const porId = (id: string) => represas.find(r => r.id === id) ?? null;

/** Cuencas en orden de aparición de norte a sur. */
export const cuencas: string[] = [...new Set(represas.map(r => r.cuenca))];

/**
 * Cascadas: represas encadenadas sobre un mismo curso de agua, en el sentido en que corre el río.
 * El trazo en el mapa es un esquema (línea recta entre presas), no el cauce real.
 */
export const cascadas: { rio: string; ids: string[] }[] = [
  { rio: 'Juramento', ids: ['gral-manuel-belgrano', 'penas-blancas', 'gral-martin-miguel-de-guemes'] },
  { rio: 'Marapa → Dulce', ids: ['escaba', 'batiruana', 'rio-hondo', 'los-quiroga'] },
  { rio: 'Salí → Dulce', ids: ['dr-celestino-gelsi', 'rio-hondo'] },
  { rio: 'Diamante', ids: ['agua-del-toro', 'los-reyunos', 'el-tigre'] },
  { rio: 'Atuel', ids: ['el-nihuil', 'aisol', 'valle-grande'] },
  { rio: 'Neuquén', ids: ['portezuelo-grande', 'loma-de-la-lata', 'mari-menuco', 'planicie-banderita', 'el-chanar'] },
  { rio: 'Limay', ids: ['alicura', 'piedra-del-aguila', 'pichi-picun-leufu', 'el-chocon', 'arroyito'] },
];

/** Represas que están antes y después en la misma cascada. */
export function vecinas(id: string) {
  const arriba: Represa[] = [];
  const abajo: Represa[] = [];
  for (const c of cascadas) {
    const i = c.ids.indexOf(id);
    if (i === -1) continue;
    if (i > 0) arriba.push(porId(c.ids[i - 1])!);
    if (i < c.ids.length - 1) abajo.push(porId(c.ids[i + 1])!);
  }
  const unicas = (l: Represa[]) => [...new Map(l.map(r => [r.id, r])).values()];
  return { arriba: unicas(arriba), abajo: unicas(abajo) };
}

export const generaEnergia = (r: Represa) => (r.potenciaMW ?? 0) > 0;

/** Notas que aclaran datos de la fuente. */
export function notaDe(r: Represa): string | null {
  if (r.complejo === 'Cerros Colorados' && r.embalseHm3 && r.embalseHm3 > 20000) {
    return 'La capacidad corresponde al sistema de embalses de Cerros Colorados (Los Barreales y Mari Menuco), que esta presa comparte con otras del complejo.';
  }
  return null;
}

const nf = new Intl.NumberFormat('es-AR', { maximumFractionDigits: 2 });
export const num = (n: number | null | undefined, unidad = '') =>
  n == null ? 'Sin dato' : `${nf.format(n)}${unidad ? ' ' + unidad : ''}`;

export const totales = {
  represas: represas.length,
  potenciaMW: represas.reduce((s, r) => s + (r.potenciaMW ?? 0), 0),
  generacionGWh: represas.reduce((s, r) => s + (r.generacionGWh ?? 0), 0),
};
