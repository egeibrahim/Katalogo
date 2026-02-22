#!/usr/bin/env node
/**
 * GeoNames'dan ülke ve şehir verilerini indirir, parse eder ve
 * src/lib/fulfillmentLocations.ts dosyasını üretir.
 *
 * Kullanım: node scripts/load-geonames.mjs
 *
 * Gereksinim: npm install adm-zip (devDependency)
 */

import https from "node:https";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const BASE_URL = "https://download.geonames.org/export/dump";

// countryInfo: ISO (0), Country name (4)
// geoname (cities): name (1), country code (8), feature class (6), feature code (7)
// Sadece şehirler (il merkezleri): PPLA = first-order admin capital, PPLC = capital
// İlçeler (PPLA2, PPL) hariç tutulur.
function fetchUrl(url) {
  return new Promise((resolve, reject) => {
    https
      .get(url, (res) => {
        if (res.statusCode === 301 || res.statusCode === 302) {
          fetchUrl(res.headers.location).then(resolve).catch(reject);
          return;
        }
        const chunks = [];
        res.on("data", (c) => chunks.push(c));
        res.on("end", () => resolve(Buffer.concat(chunks)));
        res.on("error", reject);
      })
      .on("error", reject);
  });
}

function parseCountryInfo(buffer) {
  const text = buffer.toString("utf8");
  const lines = text.split(/\r?\n/);
  const map = new Map(); // ISO -> country name
  for (const line of lines) {
    if (!line.trim() || line.startsWith("#")) continue;
    const cols = line.split("\t");
    const iso = cols[0]?.trim();
    const name = cols[4]?.trim();
    if (iso && name) map.set(iso, name);
  }
  return map;
}

const CITY_FEATURE_CODES = new Set(["PPLA", "PPLC"]);

function parseCitiesTxt(buffer, countryCodeToName) {
  const text = buffer.toString("utf8");
  const lines = text.split(/\r?\n/);
  const byCountry = new Map(); // country name -> Set(city names)
  for (const line of lines) {
    if (!line.trim()) continue;
    const cols = line.split("\t");
    const name = cols[1]?.trim();
    const featureClass = cols[6]?.trim();
    const featureCode = cols[7]?.trim();
    const countryCode = cols[8]?.trim();
    if (!name || !countryCode) continue;
    if (featureClass !== "P") continue;
    if (!CITY_FEATURE_CODES.has(featureCode)) continue; // sadece PPLA (il merkezi), PPLC (başkent)
    const countryName = countryCodeToName.get(countryCode);
    if (!countryName) continue;
    if (!byCountry.has(countryName)) byCountry.set(countryName, new Set());
    byCountry.get(countryName).add(name);
  }
  return byCountry;
}

function escapeJsString(s) {
  return s.replace(/\\/g, "\\\\").replace(/"/g, '\\"');
}

function generateTs(countries, citiesByCountry) {
  const countryList = [...countries].sort((a, b) => a.localeCompare(b));
  const lines = [
    "/**",
    " * Fulfillment From: country and city options.",
    " * Country selection first, then city selection based on country.",
    " * Generated from GeoNames (https://www.geonames.org/). Run: node scripts/load-geonames.mjs",
    " */",
    "",
    "export const FULFILLMENT_COUNTRIES = [",
    ...countryList.map((c) => `  \"${escapeJsString(c)}\",`),
    "] as const;",
    "",
    "export type FulfillmentCountry = (typeof FULFILLMENT_COUNTRIES)[number];",
    "",
    "export const FULFILLMENT_CITIES_BY_COUNTRY: Record<string, string[]> = {",
  ];

  for (const country of countryList) {
    const cities = citiesByCountry.get(country);
    const cityList = cities ? [...cities].sort((a, b) => a.localeCompare(b)) : [];
    if (cityList.length > 0) {
      cityList.push("Other");
    } else {
      cityList.push("Other");
    }
    lines.push(`  \"${escapeJsString(country)}\": [`);
    for (const city of cityList) {
      lines.push(`    \"${escapeJsString(city)}\",`);
    }
    lines.push("  ],");
  }

  lines.push("};", "");
  lines.push("export function getCitiesForCountry(country: string | null): string[] {");
  lines.push("  if (!country?.trim()) return [];");
  lines.push("  return FULFILLMENT_CITIES_BY_COUNTRY[country.trim()] ?? [\"Other\"];");
  lines.push("}");
  return lines.join("\n");
}

async function main() {
  let AdmZip;
  try {
    const mod = await import("adm-zip");
    AdmZip = mod.default;
  } catch {
    console.error("adm-zip gerekli. Çalıştırın: npm install adm-zip --save-dev");
    process.exit(1);
  }

  console.log("1. countryInfo.txt indiriliyor...");
  const countryBuf = await fetchUrl(`${BASE_URL}/countryInfo.txt`);
  const countryCodeToName = parseCountryInfo(countryBuf);
  const countryNames = new Set(countryCodeToName.values());
  countryNames.add("Other");
  console.log(`   ${countryCodeToName.size} ülke, toplam ${countryNames.size} (Other dahil).`);

  // cities15000: nüfusu 15000+ veya başkentler (~25k şehir) – makul boyut
  const citiesZipUrl = `${BASE_URL}/cities15000.zip`;
  console.log("2. cities15000.zip indiriliyor (bu biraz sürebilir)...");
  const zipBuf = await fetchUrl(citiesZipUrl);
  const zip = new AdmZip(zipBuf);
  const entries = zip.getEntries();
  const txtEntry = entries.find((e) => e.entryName.endsWith(".txt"));
  if (!txtEntry) {
    console.error("Zip içinde .txt bulunamadı.");
    process.exit(1);
  }
  const citiesTxt = zip.readAsText(txtEntry);
  const citiesByCountry = parseCitiesTxt(Buffer.from(citiesTxt, "utf8"), countryCodeToName);
  const totalCities = [...citiesByCountry.values()].reduce((s, set) => s + set.size, 0);
  console.log(`   ${totalCities} şehir, ${citiesByCountry.size} ülkeye dağıldı.`);

  // Ülkeler listesinde olup hiç şehri olmayanlar için boş liste ekle
  for (const name of countryNames) {
    if (!citiesByCountry.has(name)) citiesByCountry.set(name, new Set(["Other"]));
  }

  const outPath = path.join(ROOT, "src/lib/fulfillmentLocations.ts");
  const ts = generateTs(countryNames, citiesByCountry);
  fs.writeFileSync(outPath, ts, "utf8");
  console.log(`3. Yazıldı: ${outPath}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
