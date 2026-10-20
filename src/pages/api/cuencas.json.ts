import type { APIRoute } from 'astro';
import { cuencas, json, meta, represas } from '../../data/api';

/** GET /api/cuencas.json — cuencas con sus represas y totales. */
export const GET: APIRoute = () =>
  json({
    meta,
    cuencas: cuencas.map(c => {
      const lista = represas.filter(r => r.cuenca === c);
      return {
        nombre: c,
        represas: lista.map(r => r.id),
        potenciaMW: lista.reduce((s, r) => s + (r.potenciaMW ?? 0), 0),
        generacionGWh: lista.reduce((s, r) => s + (r.generacionGWh ?? 0), 0),
      };
    }),
  });
