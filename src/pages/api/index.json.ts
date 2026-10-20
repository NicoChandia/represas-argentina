import type { APIRoute } from 'astro';
import { json, meta, totales } from '../../data/api';

/** GET /api/index.json — índice de la API. */
export const GET: APIRoute = ({ site }) => {
  const u = (p: string) => new URL(p, site).toString();
  return json({
    meta,
    totales,
    endpoints: {
      represas: u('/api/represas.json'),
      represa: u('/api/represas/{id}.json'),
      cuencas: u('/api/cuencas.json'),
      geojson: u('/api/cascadas.geojson'),
    },
    documentacion: u('/api/'),
  });
};
