/**
 * Generate boundary SQL for KUSQA districts from pe-atlas TopoJSON.
 * Maps ~33 KUSQA district names to pe-atlas district names and
 * outputs SQL UPDATE statements for the boundary column.
 */
const fs = require("fs");
const topojson = require("topojson-client");

const topology = JSON.parse(fs.readFileSync("node_modules/pe-atlas/districts-100k.json", "utf-8"));

// The 33 KUSQA districts (display_name from districts table seed)
const KUSQA_DISTRICTS = [
  "Miraflores",
  "Barranco",
  "San Isidro",
  "Magdalena",
  "San Miguel",
  "Pueblo Libre",
  "Jesús María",
  "Lince",
  "San Borja",
  "Santiago de Surco",
  "La Molina",
  "San Juan de Lurigancho",
  "San Martín de Porres",
  "Comas",
  "Villa María del Triunfo",
  "Rímac",
  "Villa El Salvador",
  "Trujillo",
  "Huanchaco",
  "Cusco",
  "Chinchero",
  "Urubamba",
  "Ollantaytambo",
  "Pisac",
  "Puno",
  "Arequipa Centro",
  "Caucaya",
  "Iquitos",
  "Punchana",
  "Belén",
  "San Juan Bautista",
];

// Try to match each KUSQA district to a pe-atlas district by name
function normalize(name) {
  return name
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, "")
    .trim();
}

const atlasDistricts = topojson.feature(topology, topology.objects.districts);
const matches = [];

for (const kusqa of KUSQA_DISTRICTS) {
  const kusqaNorm = normalize(kusqa);
  let best = null;
  let bestScore = 0;

  for (const ad of atlasDistricts.features) {
    const adName = ad.properties.name || "";
    const adNorm = normalize(adName);

    // Exact match
    if (adNorm === kusqaNorm) {
      best = ad;
      bestScore = 100;
      break;
    }

    // One name contains the other
    if (adNorm.includes(kusqaNorm) || kusqaNorm.includes(adNorm)) {
      const score = Math.max(
        adNorm.includes(kusqaNorm) ? kusqaNorm.length / adNorm.length : 0,
        kusqaNorm.includes(adNorm) ? adNorm.length / kusqaNorm.length : 0,
      );
      if (score > bestScore) {
        bestScore = score;
        best = ad;
      }
    }
  }

  if (best && bestScore >= 0.5) {
    // Map pe-atlas names to KUSQA canonical slug
    const slugMap = {
      Miraflores: "miraflores",
      Barranco: "barranco",
      "San Isidro": "san-isidro",
      Magdalena: "magdalena",
      "San Miguel": "san-miguel",
      "Pueblo Libre": "pueblo-libre",
      "Jesús María": "jesus-maria",
      Lince: "lince",
      "San Borja": "san-borja",
      "Santiago de Surco": "surco",
      "La Molina": "la-molina",
      "San Juan de Lurigancho": "san-juan-de-lurigancho",
      "San Martín de Porres": "san-martin-de-porres",
      Comas: "comas",
      "Villa María del Triunfo": "villa-maria-del-triunfo",
      Rímac: "rimac",
      "Villa El Salvador": "villa-el-salvador",
      Trujillo: "trujillo",
      Huanchaco: "huanchaco",
      Cusco: "cusco-centro",
      Chinchero: "chinchero",
      Urubamba: "urubamba",
      Ollantaytambo: "ollantaytambo",
      Pisac: "pisac",
      Puno: "puno-ciudad",
      "Arequipa Centro": "arequipa-centro",
      Iquitos: "iquitos",
      Punchana: "punchana",
      Belén: "belen-iquitos",
      "San Juan Bautista": "san-juan-bautista-iquitos",
    };
    const slug =
      slugMap[kusqa] ||
      kusqa
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-|-$/g, "");
    matches.push({ kusqa, peAtlas: best.properties.name, slug, geometry: best.geometry });
    console.log(
      `  ✓ "${kusqa}" → "${best.properties.name}" (score:${(bestScore * 100).toFixed(0)}%)`,
    );
  } else {
    console.log(`  ✗ "${kusqa}" — NO MATCH`);
  }
}

// Generate simplified polygon (reduce coordinate precision to ~4 decimals)
function simplifyCoords(coords, precision) {
  const factor = Math.pow(10, precision);
  if (typeof coords === "number") return Math.round(coords * factor) / factor;
  if (Array.isArray(coords)) return coords.map((c) => simplifyCoords(c, precision));
  return coords;
}

// Generate SQL
let sql = `-- Auto-generated boundary data for KUSQA districts from pe-atlas
-- Generated: ${new Date().toISOString()}
-- Source: pe-atlas (MIT license)

`;

for (const m of matches) {
  if (!m.geometry) continue;
  const geom = {
    type: "Feature",
    properties: {},
    geometry: {
      type: m.geometry.type,
      coordinates: simplifyCoords(m.geometry.coordinates, 4),
    },
  };
  const geoJson = JSON.stringify(geom);
  const escaped = geoJson.replace(/'/g, "''");
  sql += `update public.districts set boundary = '${escaped}'::jsonb where slug = '${m.slug}';\n`;
}

const outPath = "supabase/migrations/seed_boundary_data.sql";
fs.writeFileSync(outPath, sql);
console.log(`\nWrote ${matches.length} boundary updates to ${outPath}`);
console.log(
  `${KUSQA_DISTRICTS.length - matches.length} districts without matches will keep coarse bounding boxes.`,
);
