# Cambios

Registro de las versiones del sitio. La versión 1.0 está inscripta en la DNDA como
"Obra publicada – Software". La copia depositada (con sus huellas SHA-256) está en
`Documents\DNDA\represas-argentina` y no se modifica nunca.

Cuando los cambios acumulados sean grandes, se registra una versión nueva con otro trámite.

## 1.1 (en curso)

- Commit `fb04416` (29/10/2026): además de los títulos, sube a git LICENSE, README, og.jpg
  y el ajuste de Base.astro, que ya formaban parte de la versión 1.0 depositada.
- Títulos pensados para Google: la portada pasa a "Mapa de las represas de Argentina" y
  cada ficha a "Presa <nombre> – río <río>, <provincia>".
- Mapa fijo descargable (`/mapa-represas-argentina.png`) con las 28 represas numeradas de norte
  a sur, mostrado en el listado. Se genera con `scripts/mapa_png.py`.
- Mapa base: CARTO reemplazado por OpenFreeMap (gratis, sin clave). Créditos actualizados en Fuentes.

## 1.0 — 20/10/2026 · registrada en la DNDA

- Mapa de 28 represas fiscalizadas por el ORSEP, de norte a sur, con ficha por represa.
- Recorrido narrado con voz, cámara en movimiento y vista satelital.
- Fotos del ORSEP y de Wikimedia Commons con créditos.
- API estática en JSON y GeoJSON.
- En git, el tag `v1.0-dnda` marca el commit `d92e160`, el último anterior al registro.
  La copia exacta de lo depositado son los zips de `Documents\DNDA\represas-argentina`
  (incluyen LICENSE, README, og.jpg y Base.astro, que en git entraron recién en `fb04416`).
- Huellas del depósito:
  - ejecutable: 094d03a78d0f95092d42aa6489ff244ec9282cce880de3f7122bb64f94bd2ced
  - código fuente: cc56fe4cf97ba2803eda7240d49455d8f6bac3d1cec4d23c65d1285cced4307e
