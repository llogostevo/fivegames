/**
 * Generate hub basemap slices from Esri World Ocean Base,
 * framed tightly on each country with that country tinted stronger.
 *
 * Usage: npm run hub-maps
 */

import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import sharp from "sharp";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OUT_DIR = path.join(__dirname, "..", "public", "hub-maps");

const GEOJSON_URL =
  "https://raw.githubusercontent.com/datasets/geo-countries/master/data/countries.geojson";

/**
 * Centres / zooms framed on each country (not a shared Europe overview).
 * `isoA3` is used to darken that country's land vs neighbours.
 */
const SLICES = [
  {
    file: "world",
    lat: 18,
    lng: 5,
    zoom: 1.75,
    width: 960,
    height: 540,
    isoA3: null,
  },
  {
    file: "uk",
    lat: 54.5,
    lng: -2.2,
    zoom: 6.45,
    width: 800,
    height: 500,
    isoA3: "GBR",
  },
  {
    file: "england",
    lat: 52.5,
    lng: -1.4,
    zoom: 6.75,
    width: 800,
    height: 500,
    isoA3: "GBR",
  },
  {
    file: "italy",
    lat: 42.0,
    lng: 12.6,
    zoom: 6.35,
    width: 800,
    height: 500,
    isoA3: "ITA",
  },
  {
    file: "germany",
    lat: 51.2,
    lng: 10.4,
    zoom: 6.4,
    width: 800,
    height: 500,
    isoA3: "DEU",
  },
  {
    file: "france",
    lat: 46.5,
    lng: 2.4,
    zoom: 6.2,
    width: 800,
    height: 500,
    isoA3: "FRA",
  },
  {
    file: "spain",
    lat: 39.9,
    lng: -3.5,
    zoom: 6.25,
    width: 800,
    height: 500,
    isoA3: "ESP",
  },
];

const TILE_SIZE = 256;
const TILE_URL =
  "https://server.arcgisonline.com/ArcGIS/rest/services/Ocean/World_Ocean_Base/MapServer/tile/{z}/{y}/{x}";

function lngLatToWorldPx(lng, lat, zoom) {
  const scale = TILE_SIZE * 2 ** zoom;
  const x = ((lng + 180) / 360) * scale;
  const sin = Math.sin((lat * Math.PI) / 180);
  const y =
    (0.5 - Math.log((1 + sin) / (1 - sin)) / (4 * Math.PI)) * scale;
  return { x, y };
}

async function fetchTile(z, x, y) {
  const n = 2 ** z;
  const wrappedX = ((x % n) + n) % n;
  if (y < 0 || y >= n) {
    return sharp({
      create: {
        width: TILE_SIZE,
        height: TILE_SIZE,
        channels: 3,
        background: { r: 186, g: 214, b: 230 },
      },
    })
      .png()
      .toBuffer();
  }

  const url = TILE_URL.replace("{z}", String(z))
    .replace("{y}", String(y))
    .replace("{x}", String(wrappedX));

  const response = await fetch(url, {
    headers: {
      "User-Agent": "PIN5-hub-maps/1.0 (basemap preview generation)",
      Accept: "image/jpeg,image/png,*/*",
    },
  });
  if (!response.ok) {
    throw new Error(`Tile ${z}/${y}/${wrappedX} failed: ${response.status}`);
  }
  return Buffer.from(await response.arrayBuffer());
}

function featureMatchesIso(feature, isoA3) {
  const props = feature.properties ?? {};
  const candidates = [
    props.ISO_A3,
    props["ISO3166-1-Alpha-3"],
    props.iso_a3,
    props.ADM0_A3,
    props.id,
  ];
  if (
    candidates.some(
      (value) => typeof value === "string" && value.toUpperCase() === isoA3,
    )
  ) {
    return true;
  }
  // Some datasets mark metropolitan France as ISO -99 — match by name.
  const nameFallbacks = {
    FRA: ["France"],
    NOR: ["Norway"],
  };
  const names = nameFallbacks[isoA3];
  if (!names) {
    return false;
  }
  return names.includes(props.name);
}

function ringToPath(ring, project) {
  return ring
    .map(([lng, lat], index) => {
      const { x, y } = project(lng, lat);
      return `${index === 0 ? "M" : "L"}${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(" ");
}

function geometryToSvgPaths(geometry, project) {
  const paths = [];
  if (geometry.type === "Polygon") {
    for (const ring of geometry.coordinates) {
      paths.push(ringToPath(ring, project) + " Z");
    }
  } else if (geometry.type === "MultiPolygon") {
    for (const polygon of geometry.coordinates) {
      for (const ring of polygon) {
        paths.push(ringToPath(ring, project) + " Z");
      }
    }
  }
  return paths;
}

async function loadCountryFeature(isoA3, geojson) {
  const feature = geojson.features.find((entry) =>
    featureMatchesIso(entry, isoA3),
  );
  if (!feature) {
    throw new Error(`No GeoJSON feature for ${isoA3}`);
  }
  return feature;
}

async function countryHighlightOverlay({
  feature,
  outW,
  outH,
  left,
  top,
  zoomInt,
  zoomScale,
}) {
  const project = (lng, lat) => {
    const world = lngLatToWorldPx(lng, lat, zoomInt);
    return {
      x: (world.x - left) / zoomScale,
      y: (world.y - top) / zoomScale,
    };
  };

  const paths = geometryToSvgPaths(feature.geometry, project);
  if (paths.length === 0) {
    return null;
  }

  // Soften neighbours by slightly darkening the target country.
  const svg = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${outW}" height="${outH}" viewBox="0 0 ${outW} ${outH}">
  <path d="${paths.join(" ")}" fill="rgba(28, 42, 58, 0.28)" fill-rule="evenodd"/>
</svg>`;

  return Buffer.from(svg);
}

async function renderSlice(slice, geojson) {
  const zoomInt = Math.max(0, Math.round(slice.zoom));
  const outW = slice.width * 2;
  const outH = slice.height * 2;
  const center = lngLatToWorldPx(slice.lng, slice.lat, zoomInt);

  const zoomScale = 2 ** (zoomInt - slice.zoom);
  const viewW = outW * zoomScale;
  const viewH = outH * zoomScale;

  const worldW = TILE_SIZE * 2 ** zoomInt;
  let left = center.x - viewW / 2;
  if (viewW < worldW) {
    left = Math.max(0, Math.min(left, worldW - viewW));
  } else {
    left = 0;
  }
  const top = center.y - viewH / 2;
  const right = left + Math.min(viewW, worldW);

  const x0 = Math.floor(left / TILE_SIZE);
  const y0 = Math.floor(top / TILE_SIZE);
  const x1 = Math.floor((right - 1) / TILE_SIZE);
  const y1 = Math.floor((top + viewH - 1) / TILE_SIZE);

  const mosaicW = (x1 - x0 + 1) * TILE_SIZE;
  const mosaicH = (y1 - y0 + 1) * TILE_SIZE;

  const composites = [];
  for (let ty = y0; ty <= y1; ty += 1) {
    for (let tx = x0; tx <= x1; tx += 1) {
      const buf = await fetchTile(zoomInt, tx, ty);
      const png = await sharp(buf)
        .resize(TILE_SIZE, TILE_SIZE, { fit: "fill" })
        .png()
        .toBuffer();
      composites.push({
        input: png,
        left: (tx - x0) * TILE_SIZE,
        top: (ty - y0) * TILE_SIZE,
      });
    }
  }

  const mosaic = await sharp({
    create: {
      width: mosaicW,
      height: mosaicH,
      channels: 3,
      background: { r: 186, g: 214, b: 230 },
    },
  })
    .composite(composites)
    .png()
    .toBuffer();

  const cropLeft = Math.max(0, Math.round(left - x0 * TILE_SIZE));
  const cropTop = Math.max(0, Math.round(top - y0 * TILE_SIZE));
  const extractW = Math.min(Math.round(right - left), mosaicW - cropLeft);
  const extractH = Math.min(Math.round(viewH), mosaicH - cropTop);

  let pipeline = sharp(mosaic)
    .extract({
      left: cropLeft,
      top: cropTop,
      width: extractW,
      height: extractH,
    })
    .resize(outW, outH, { fit: "fill" });

  if (slice.isoA3) {
    const feature = await loadCountryFeature(slice.isoA3, geojson);
    const overlay = await countryHighlightOverlay({
      feature,
      outW,
      outH,
      left,
      top,
      zoomInt,
      zoomScale,
    });
    if (overlay) {
      pipeline = sharp(await pipeline.png().toBuffer()).composite([
        { input: overlay, blend: "over" },
      ]);
    }
  }

  const webp = await pipeline
    .modulate({ brightness: 0.97, saturation: 0.88 })
    .linear(1.16, -16)
    .webp({ quality: 85 })
    .toBuffer();

  const outPath = path.join(OUT_DIR, `${slice.file}.webp`);
  await writeFile(outPath, webp);
  console.log(
    `Wrote ${path.relative(process.cwd(), outPath)} z${zoomInt}${
      slice.isoA3 ? ` [${slice.isoA3}]` : ""
    } (${webp.length} bytes)`,
  );
}

async function main() {
  await mkdir(OUT_DIR, { recursive: true });
  console.log("Loading country outlines…");
  const response = await fetch(GEOJSON_URL, {
    headers: { "User-Agent": "PIN5-hub-maps/1.0" },
  });
  if (!response.ok) {
    throw new Error(`GeoJSON fetch failed: ${response.status}`);
  }
  const geojson = await response.json();

  for (const slice of SLICES) {
    await renderSlice(slice, geojson);
  }
  console.log("Done.");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
