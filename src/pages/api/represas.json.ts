import type { APIRoute } from 'astro';
import { json, meta, represaApi, represas } from '../../data/api';

/** GET /api/represas.json — todas las represas, de norte a sur. */
export const GET: APIRoute = ({ site }) =>
  json({ meta, total: represas.length, represas: represas.map(r => represaApi(r, site)) });
