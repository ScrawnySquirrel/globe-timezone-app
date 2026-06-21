import * as fs from "fs";
import * as path from "path";
import * as https from "https";
import * as zlib from "zlib";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OUTPUT_DIR = path.resolve(__dirname, "../public/data");
const OUTPUT_FILE = path.join(OUTPUT_DIR, "timezones.json");
const SIMPLIFICATION_TOLERANCE = 0.1;
const GEOJSON_ZIP_URL = "https://github.com/evansiroky/timezone-boundary-builder/releases/download/2026b/timezones-now.geojson.zip";

function fetchBuffer(url: string): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const get = (currentUrl: string) => {
      https.get(currentUrl, { headers: { "User-Agent": "tz-build" } }, (res) => {
        if (res.statusCode && res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) { get(res.headers.location); return; }
        if (res.statusCode !== 200) { reject(new Error(`HTTP ${res.statusCode} ${currentUrl}`)); return; }
        const chunks: Buffer[] = [];
        res.on("data", (c: Buffer) => chunks.push(c));
        res.on("end", () => resolve(Buffer.concat(chunks)));
        res.on("error", reject);
      }).on("error", reject);
    };
    get(url);
  });
}

function extractFirstGeojsonFromZip(buf: Buffer): string {
  let offset = 0;
  while (offset < buf.length - 4) {
    const sig = buf.readUInt32LE(offset);
    if (sig !== 0x04034b50) { offset++; continue; }
    const compression = buf.readUInt16LE(offset + 8);
    const compressedSize = buf.readUInt32LE(offset + 18);
    const filenameLen = buf.readUInt16LE(offset + 26);
    const extraLen = buf.readUInt16LE(offset + 28);
    const filename = buf.toString("utf8", offset + 30, offset + 30 + filenameLen);
    const dataStart = offset + 30 + filenameLen + extraLen;
    const dataEnd = dataStart + compressedSize;
    if (filename.endsWith(".geojson") || filename.endsWith(".json")) {
      const compressed = buf.subarray(dataStart, dataEnd);
      if (compression === 0) return compressed.toString("utf8");
      if (compression === 8) return zlib.inflateRawSync(compressed).toString("utf8");
    }
    offset = dataEnd;
  }
  throw new Error("No .geojson file found in ZIP");
}

function perpDist(p: number[], a: number[], b: number[]): number {
  const dx = b[0]! - a[0]!, dy = b[1]! - a[1]!;
  if (dx === 0 && dy === 0) return Math.hypot(p[0]! - a[0]!, p[1]! - a[1]!);
  const t = ((p[0]! - a[0]!) * dx + (p[1]! - a[1]!) * dy) / (dx * dx + dy * dy);
  return Math.hypot(p[0]! - (a[0]! + t * dx), p[1]! - (a[1]! + t * dy));
}

function dp(pts: number[][], tol: number): number[][] {
  if (pts.length <= 2) return pts;
  let maxD = 0, maxI = 0;
  for (let i = 1; i < pts.length - 1; i++) { const d = perpDist(pts[i]!, pts[0]!, pts[pts.length - 1]!); if (d > maxD) { maxD = d; maxI = i; } }
  if (maxD > tol) { const l = dp(pts.slice(0, maxI + 1), tol); const r = dp(pts.slice(maxI), tol); return [...l.slice(0, -1), ...r]; }
  return [pts[0]!, pts[pts.length - 1]!];
}

function simplifyRing(ring: number[][], tol: number): number[][] {
  if (ring.length < 4) return ring;
  const simplified = dp(ring.slice(0, -1), tol);
  if (simplified.length < 3) return ring;
  return [...simplified, simplified[0]!];
}

interface Feature { type: "Feature"; properties: { tzid: string }; geometry: { type: string; coordinates: unknown }; }
interface FeatureCollection { type: "FeatureCollection"; features: Feature[]; }

function simplifyFeature(f: Feature, tol: number): Feature {
  const g = f.geometry;
  if (g.type === "Polygon") return { ...f, geometry: { ...g, coordinates: (g.coordinates as number[][][]).map(r => simplifyRing(r, tol)) } };
  if (g.type === "MultiPolygon") return { ...f, geometry: { ...g, coordinates: (g.coordinates as number[][][][]).map(p => p.map(r => simplifyRing(r, tol))) } };
  return f;
}

async function main(): Promise<void> {
  console.log("Downloading timezone GeoJSON zip...");
  const zipBuf = await fetchBuffer(GEOJSON_ZIP_URL);
  console.log(`Downloaded ${(zipBuf.length / 1024 / 1024).toFixed(1)} MB`);
  console.log("Extracting GeoJSON from zip...");
  const geojsonStr = extractFirstGeojsonFromZip(zipBuf);
  const raw = JSON.parse(geojsonStr) as FeatureCollection;
  console.log(`Loaded ${raw.features.length} timezone features`);
  console.log(`Simplifying (tolerance=${SIMPLIFICATION_TOLERANCE})...`);
  const simplified: FeatureCollection = { type: "FeatureCollection", features: raw.features.map(f => simplifyFeature(f, SIMPLIFICATION_TOLERANCE)) };
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });
  fs.writeFileSync(OUTPUT_FILE, JSON.stringify(simplified), "utf8");
  console.log(`Done -> ${OUTPUT_FILE} (${(fs.statSync(OUTPUT_FILE).size / 1024 / 1024).toFixed(2)} MB)`);
}

void main().catch(err => { console.error(err); process.exit(1); });
