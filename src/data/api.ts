import { cascadas, cuencas, represas, totales, vecinas, type Represa } from './represas';

/** Datos comunes que acompañan cada respuesta de la API. */
export const meta = {
  oficial: false,
  aviso: 'Proyecto independiente, no oficial.',
  coordenadas: {
    fuente: 'OpenStreetMap (© colaboradores de OpenStreetMap, ODbL)',
    url: 'https://www.openstreetmap.org/copyright',
    nota: "Ver el campo 'coordenadas' de cada represa: 'OpenStreetMap' o 'aproximada'.",
  },
  fuente: {
    nombre: 'Registro de presas fiscalizadas del ORSEP',
    url: 'https://www.argentina.gob.ar/orsep/registro-de-presas-fiscalizadas',
    licencia: 'CC BY 4.0',
  },
  generado: new Date().toISOString(),
};

/** Versión de una represa para la API: agrega la URL de su página y las vecinas del río. */
export function represaApi(r: Represa, site: URL | undefined) {
  const { arriba, abajo } = vecinas(r.id);
  return {
    ...r,
    pagina: new URL(`/represas/${r.id}/`, site).toString(),
    api: new URL(`/api/represas/${r.id}.json`, site).toString(),
    aguasArriba: arriba.map(v => v.id),
    aguasAbajo: abajo.map(v => v.id),
  };
}

export const json = (data: unknown) =>
  new Response(JSON.stringify(data, null, 2), {
    headers: { 'Content-Type': 'application/json; charset=utf-8' },
  });

export { cascadas, cuencas, represas, totales };
