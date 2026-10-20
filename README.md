# Represas de Argentina

Mapa interactivo de las represas de Argentina, de norte a sur, con ficha técnica y fotos de cada una. Datos oficiales del ORSEP.

Hecho con **Astro** (páginas estáticas, una por represa, buenas para Google) y una **isla de React** con **MapLibre** para el mapa. Diseñado mobile-first.

## Cómo correrlo

```bash
npm install
npm run dev          # http://localhost:4321
npm run dev:celu     # igual, pero accesible desde el celular en la misma red Wi-Fi
npm run build        # genera el sitio estático en dist/
npm run preview      # sirve dist/ para probar el build
```

Requiere Node 20 o superior.

## Qué hay

| Ruta | Qué muestra |
|---|---|
| `/` | Mapa a pantalla completa. Recorrido norte → sur (flechas, teclado ← → o reproducción automática), filtro por cuenca, vista satelital, ficha al tocar una represa. `/?r=el-chocon` abre directo en una represa. |
| `/represas/` | Listado por cuenca en tablas. |
| `/represas/<id>/` | Ficha completa de cada represa: fotos, datos técnicos, represas aguas arriba y aguas abajo, enlace a la fuente. |
| `/acerca/` | Fuentes, qué incluye y qué falta. |
| `/api/` | Documentación de la API. |

## API (JSON estático)

Se genera en cada `npm run build` desde `represas.json`. Sin servidor, sin clave, con CORS abierto (`vercel.json`).

| Endpoint | Devuelve |
|---|---|
| `/api/index.json` | Totales y lista de endpoints |
| `/api/represas.json` | Todas las represas, de norte a sur |
| `/api/represas/{id}.json` | Una represa, con `aguasArriba` y `aguasAbajo` |
| `/api/cuencas.json` | Cuencas con sus represas y totales |
| `/api/cascadas.geojson` | Puntos y líneas en GeoJSON |

Cada respuesta incluye `meta` con la fuente (ORSEP, CC BY 4.0), el aviso de que no es oficial y la fecha de generación. El código está en `src/pages/api/` y `src/data/api.ts`.

En el celular el panel es una hoja inferior que se agranda con el asa; desde 900 px pasa a ser un panel a la izquierda.

## Estructura

```
src/
├── data/
│   ├── represas.json        los datos (editá acá)
│   └── represas.ts          tipos, orden norte → sur, cascadas por río, utilidades
├── components/
│   ├── MapaRepresas.tsx     isla de React: mapa, recorrido, filtros, panel
│   ├── Ficha.tsx            ficha dentro del panel
│   ├── useMediaQuery.ts     hook para celular / tema oscuro
│   └── mapa.css             estilos del mapa (mobile-first)
├── layouts/Base.astro       head, SEO, encabezado y pie
├── pages/                   index, represas/index, represas/[id], acerca
└── styles/global.css        variables de color y tipografía, tema claro y oscuro
```

## Datos

- Fuente: [Registro de presas fiscalizadas del ORSEP](https://www.argentina.gob.ar/orsep/registro-de-presas-fiscalizadas). Cada represa guarda el enlace a su ficha en el campo `fuente`.
- **Coordenadas**: el ORSEP no las publica. 24 salen del muro de cada presa en OpenStreetMap (campo `coordenadas: "OpenStreetMap"`, licencia ODbL, hay que citarlo). Las 4 restantes (Pueblo Viejo – Los Reales, Pueblo Viejo – La Horqueta, Batiruana y Aisol) son aproximadas (`"aproximada"`): corregilas con el editor.
- Faltan: Tierras Blancas (no se pudo leer la ficha), Derivador Punta Negra (su página muestra datos del complejo Ullum) y las presas que el ORSEP no fiscaliza (Yacyretá, Salto Grande, provinciales).
- Las fotos se cargan directo desde argentina.gob.ar. Si alguna falla, se oculta sola.
- Las líneas punteadas del mapa (`cascadas` en `represas.ts`) unen presas del mismo río en el sentido del agua. Son un esquema, no el cauce real.

### Corregir coordenadas

Con `npm run dev` aparece arriba a la derecha del mapa el cuadro **Corregir ubicaciones** (no existe en el sitio publicado):

1. Tildalo: el mapa pasa a satélite.
2. Arrastrá cada círculo hasta la presa real.
3. Tocá **Descargar represas.json** y reemplazá `src/data/represas.json` con ese archivo.

### Agregar una represa

1. Sumá un objeto a `src/data/represas.json` con los mismos campos que las demás (los que no tengas, en `null`).
2. Si está en una cadena sobre un río, agregá su `id` en el lugar correcto de `cascadas` en `src/data/represas.ts`.
3. `npm run build`: se genera su página sola.

## Publicar en Vercel

1. Subí el repo a GitHub.
2. En Vercel: *Add New Project* → elegí el repo. Detecta Astro solo (build `npm run build`, salida `dist`).
3. Cambiá `site` en `astro.config.mjs` y la línea `Sitemap` de `public/robots.txt` por la URL final.
4. En Google Search Console, enviá `/sitemap-index.xml`.

## Notas técnicas

- MapLibre 6 carga su *worker* desde un archivo aparte. En `MapaRepresas.tsx` se importa con `?url` y se pasa a `setWorkerUrl`; sin eso el mapa no dibuja nada después del build.
- El mapa es `client:only="react"` porque MapLibre necesita `window`. Mientras carga, la página muestra la lista de represas como respaldo.
- Mapas base gratuitos y sin clave: CARTO (claro y oscuro según el tema del sistema) y Esri World Imagery para el satélite.
