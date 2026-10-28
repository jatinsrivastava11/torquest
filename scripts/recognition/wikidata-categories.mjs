#!/usr/bin/env node
// CORE (lead-owned). Sets each catalog entry's `commons` category from
// Wikidata (CC0), accepting only exact name matches: Wikidata's car items
// are curated, our guesses aren't.
//   node scripts/recognition/wikidata-categories.mjs [--write]

import { readdirSync, readFileSync, writeFileSync } from "node:fs";
import { UA, generationTokens } from "./commons.mjs";

const write = process.argv.includes("--write");

async function sparql(query) {
  const r = await fetch(`https://query.wikidata.org/sparql?format=json&query=${encodeURIComponent(query)}`, {
    headers: { "User-Agent": UA, Accept: "application/sparql-results+json" },
  });
  if (!r.ok) throw new Error(`Wikidata ${r.status}`);
  return (await r.json()).results.bindings;
}

/** label (lowercase) -> Commons category, for every item the make built. */
async function categoriesFor(make) {
  const rows = await sparql(`
    SELECT DISTINCT ?label ?alias ?cat WHERE {
      ?maker rdfs:label "${make}"@en; wdt:P31/wdt:P279* wd:Q786820.
      ?item wdt:P176|wdt:P1716 ?maker; wdt:P373 ?cat; rdfs:label ?label.
      FILTER(LANG(?label) = "en")
      OPTIONAL { ?item skos:altLabel ?alias. FILTER(LANG(?alias) = "en") }
    }`);
  const map = new Map();
  for (const r of rows) {
    for (const name of [r.label?.value, r.alias?.value]) if (name) map.set(name.toLowerCase(), r.cat.value);
    map.set(r.cat.value.toLowerCase(), r.cat.value); // the category name itself
  }
  return map;
}

function candidates(make, car) {
  const v = car.variant ? ` ${car.variant}` : "";
  const m = `${make} ${car.model}`;
  if (car.generation === car.model) return [`${m}${v}`];
  const out = [];
  for (const g of [car.generation, ...generationTokens(car.generation)]) {
    out.push(`${m}${v} (${g})`, `${make} ${g}${v}`, `${m} ${g}${v}`);
  }
  return out.map((s) => s.toLowerCase());
}

const files = readdirSync("data/catalog").filter((f) => f.endsWith(".json"));
let hit = 0, miss = 0;
for (const f of files) {
  const path = `data/catalog/${f}`;
  const d = JSON.parse(readFileSync(path, "utf8"));
  const map = await categoriesFor(d.make);
  for (const car of d.cars) {
    const found = candidates(d.make, car).map((c) => map.get(c)).find(Boolean);
    if (found) {
      car.commons = found;
      hit++;
      console.log(`ok   ${car.id.padEnd(42)} ${found}`);
    } else {
      miss++;
      console.log(`--   ${car.id}`);
    }
  }
  if (write) {
    const body = d.cars.map((c) => "    " + JSON.stringify(c)).join(",\n");
    writeFileSync(path, `{\n  "make": ${JSON.stringify(d.make)},\n  "cars": [\n${body}\n  ]\n}\n`);
  }
}
console.log(`\n${hit} matched exactly, ${miss} left out`);
