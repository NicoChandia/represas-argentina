"""Genera public/mapa-represas-argentina.png: mapa fijo con las 28 represas y sus nombres.
Uso: python3 scripts/mapa_png.py <carpeta_natural_earth> src/data/represas.json mapa.png

Necesita matplotlib y la fuente Inter. En <carpeta_natural_earth> van estos archivos de
https://github.com/nvkelso/natural-earth-vector/tree/master/geojson (dominio público):
  ne_10m_admin_0_countries.geojson -> adm0.geojson
  ne_10m_admin_1_states_provinces.geojson -> adm1.geojson
  ne_10m_rivers_lake_centerlines.geojson -> rivers.geojson
  ne_10m_lakes.geojson -> lakes.geojson
Después se copia a public/mapa-represas-argentina.png (y una versión de 1000 px en .webp).
"""
import json, math, sys
import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt
from matplotlib import font_manager
from matplotlib.patches import Polygon
from matplotlib.collections import PatchCollection, LineCollection

ne, datos, salida = sys.argv[1:4]

for f in font_manager.findSystemFonts():
    if "Inter" in f:
        font_manager.fontManager.addfont(f)
plt.rcParams["font.family"] = "Inter"

BG = "#f2f5f4"; MAR = "#dcedf1"; VECINO = "#e8eeec"; ARG = "#ffffff"; LINEA = "#c5d0cf"
INK = "#122126"; MUTED = "#536469"; AGUA = "#0a6c88"; ENERGIA = "#c97f00"; SIN = "#5d7f8a"

LON0, LON1, LAT0, LAT1 = -76.5, -29.0, -56.0, -20.5
K = 1 / math.cos(math.radians(38))  # corrección de aspecto para la latitud media


def P(lon, lat):
    return lon, lat * K


def anillos(geom):
    if geom["type"] == "Polygon":
        yield from geom["coordinates"][:1]
    elif geom["type"] == "MultiPolygon":
        for p in geom["coordinates"]:
            yield p[0]


def lineas(geom):
    if geom["type"] == "LineString":
        yield geom["coordinates"]
    elif geom["type"] == "MultiLineString":
        yield from geom["coordinates"]


def en_vista(coords):
    return any(LON0 - 2 < x < -50 and LAT0 - 2 < y < LAT1 + 2 for x, y in coords[:: max(1, len(coords) // 50)] + [coords[0]])


def poligonos(features, color, borde, ancho, z):
    parches = []
    for f in features:
        for r in anillos(f["geometry"]):
            if en_vista(r):
                parches.append(Polygon([P(x, y) for x, y in r], closed=True))
    ax.add_collection(PatchCollection(parches, facecolor=color, edgecolor=borde, linewidth=ancho, zorder=z))


carga = lambda n: json.load(open(f"{ne}/{n}.geojson"))
adm0, adm1 = carga("adm0"), carga("adm1")
rios, lagos = carga("rivers"), carga("lakes")
represas = sorted(json.load(open(datos)), key=lambda r: -r["lat"])

W, H = 2000, 2300
fig = plt.figure(figsize=(W / 200, H / 200), dpi=200, facecolor=BG)
ax = fig.add_axes([0.03, 0.065, 0.94, 0.775])
ax.set_facecolor(MAR)
ax.set_xlim(LON0, LON1); ax.set_ylim(LAT0 * K, LAT1 * K)
ax.set_aspect("equal"); ax.axis("off")
ax.add_patch(plt.Rectangle((LON0, LAT0 * K), LON1 - LON0, (LAT1 - LAT0) * K, color=MAR, zorder=0))

vecinos = [f for f in adm0["features"] if f["properties"]["ADMIN"] in ("Chile", "Bolivia", "Paraguay", "Brazil", "Uruguay", "Peru")]
poligonos(vecinos, VECINO, LINEA, 0.6, 1)
# Argentina por provincias; las Malvinas, con el mismo color.
provincias = [f for f in adm1["features"] if f["properties"].get("admin") == "Argentina"]
poligonos(provincias, ARG, LINEA, 0.5, 2)
poligonos([f for f in adm0["features"] if f["properties"]["ADMIN"] in ("Argentina", "Falkland Islands")], "none", "#9fb0b0", 0.9, 3)
poligonos([f for f in adm0["features"] if f["properties"]["ADMIN"] == "Falkland Islands"], ARG, "#9fb0b0", 0.9, 2)

segs = [[P(x, y) for x, y in c] for f in rios["features"] for c in lineas(f["geometry"]) if en_vista(c)]
ax.add_collection(LineCollection(segs, colors=AGUA, linewidths=0.7, alpha=0.55, zorder=3))
poligonos(lagos["features"], MAR, AGUA, 0.3, 3)

for f in provincias:
    nombre = f["properties"]["name"]
    if nombre and f["properties"].get("latitude"):
        x, y = f["properties"]["longitude"], f["properties"]["latitude"]
        if nombre.startswith("Ciudad") or nombre == "Tierra del Fuego":
            continue
        ax.text(*P(x, y), nombre.upper(), fontsize=4.6, color="#9aa8aa", ha="center", va="center",
                fontweight="medium", zorder=4, alpha=0.75)
ax.text(*P(-59.3, -51.75), "Islas Malvinas", fontsize=5.5, color=MUTED, ha="center", va="top", zorder=4, style="italic")
ax.text(*P(-67.5, -54.9), "Tierra del Fuego", fontsize=5, color="#9aa8aa", ha="center", zorder=4)
ax.text(*P(-60, -47), "Océano\nAtlántico", fontsize=9, color="#7fa7b3", ha="center", style="italic", zorder=1)

# Panel de etiquetas a la derecha: tapa Uruguay y Brasil para que la lista se lea limpia.
PANEL = -54.2
ax.add_patch(plt.Rectangle((PANEL, LAT0 * K), LON1 - PANEL, (LAT1 - LAT0) * K, color=BG, zorder=4.5))
ax.plot([PANEL, PANEL], [LAT0 * K, LAT1 * K], color=LINEA, lw=0.8, zorder=4.6)
# Etiquetas en una columna, en el mismo orden norte → sur que los puntos.
LAB_X = -51.6
top, bot = -22.0, -52.5
paso = (top - bot) / (len(represas) - 1)
for i, r in enumerate(represas):
    color = ENERGIA if (r.get("potenciaMW") or 0) > 0 else SIN
    px, py = P(r["lon"], r["lat"])
    ly = (top - i * paso) * K
    codo = -54.2
    ax.plot([px, codo, LAB_X - 0.3], [py, ly, ly], color="#8a9a9d", lw=0.45, zorder=5, solid_capstyle="round")
    ax.scatter([px], [py], s=26, color=color, edgecolor="white", linewidth=0.8, zorder=7)
    ax.text(LAB_X, ly, f"{i + 1:>2}  {r['nombreComun']}", fontsize=7.4, color=INK, va="center", fontweight="semibold", zorder=6)
    ax.text(LAB_X + 15.6, ly, f"río {r['rio']} · {r['provincia']}", fontsize=6.0, color=MUTED, va="center", ha="right", zorder=6)
    ax.scatter([LAB_X - 0.75], [ly], s=10, color=color, zorder=6)

# Título, leyenda y créditos.
fig.text(0.05, 0.962, "Represas de Argentina", fontsize=24, fontweight="bold", color=INK, va="top")
fig.text(0.05, 0.922, "Las 28 presas que fiscaliza el ORSEP, de norte a sur", fontsize=11, color=MUTED, va="top")
fig.text(0.05, 0.888, "●", fontsize=11, color=ENERGIA, va="top")
fig.text(0.07, 0.887, "Genera electricidad", fontsize=9, color=INK, va="top")
fig.text(0.25, 0.888, "●", fontsize=11, color=SIN, va="top")
fig.text(0.27, 0.887, "Riego, agua o regulación", fontsize=9, color=INK, va="top")
fig.text(0.05, 0.034, "Mapa interactivo y ficha de cada represa: represas-argentina.vercel.app", fontsize=9.5,
         color=AGUA, fontweight="semibold")
fig.text(0.05, 0.016, "Datos: ORSEP (CC BY 4.0). Ubicaciones: © colaboradores de OpenStreetMap (ODbL). "
         "Límites y ríos: Natural Earth. © 2026 Nicolás Chandía.", fontsize=6.5, color=MUTED)

fig.savefig(salida, dpi=200, facecolor=BG)
print("ok", salida)
