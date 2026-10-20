import type { APIRoute } from 'astro';
import { cascadas, json, meta, represas } from '../../data/api';
import { porId } from '../../data/represas';

/** GET /api/cascadas.geojson — represas (puntos) y cascadas por río (líneas esquemáticas) en GeoJSON. */
export const GET: APIRoute = () =>
  json({
    type: 'FeatureCollection',
    metadata: meta,
    features: [
      ...represas.map(r => ({
        type: 'Feature',
        id: r.id,
        properties: { id: r.id, nombre: r.nombreComun, rio: r.rio, cuenca: r.cuenca, potenciaMW: r.potenciaMW, anio: r.anio },
        geometry: { type: 'Point', coordinates: [r.lon, r.lat] },
      })),
      ...cascadas.map(c => ({
        type: 'Feature',
        properties: { tipo: 'cascada', rio: c.rio, represas: c.ids },
        geometry: { type: 'LineString', coordinates: c.ids.map(id => { const r = porId(id)!; return [r.lon, r.lat]; }) },
      })),
    ],
  });
