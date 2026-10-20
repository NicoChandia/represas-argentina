import type { APIRoute, GetStaticPaths } from 'astro';
import { json, meta, represaApi, represas } from '../../../data/api';
import type { Represa } from '../../../data/represas';

export const getStaticPaths: GetStaticPaths = () =>
  represas.map(r => ({ params: { id: r.id }, props: { represa: r } }));

/** GET /api/represas/{id}.json — una represa. */
export const GET: APIRoute = ({ props, site }) =>
  json({ meta, represa: represaApi((props as { represa: Represa }).represa, site) });
