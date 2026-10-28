#!/usr/bin/env node
// CORE (lead-owned). Turns compact rows into data/catalog/<make>.json, so ids
// and formatting can't drift from team/CATALOG.md.
//   node scripts/catalog-from-rows.mjs "<Make>" data/catalog-rows/<make>.txt
//
// One car per line, | separated (blank fields allowed, # starts a comment):
//   model | generation | variant | start | end | engine | body | naOnRoad | built | aliases(;) | hype(y) | home
// A blank generation means a one-generation model (the id then skips it).
// home is only for cars never sold in North America: "<market>:<onRoad>",
// e.g. "europe:2000000" (markets: src/core/catalog.ts HOME_MARKETS).
// Existing entries for the make are replaced by the rows.

import { readFileSync, writeFileSync } from "node:fs";

const [make, src] = process.argv.slice(2);
if (!make || !src) {
  console.error('usage: node scripts/catalog-from-rows.mjs "<Make>" <rows.txt>');
  process.exit(1);
}

const slug = (...parts) =>
  parts
    .filter(Boolean)
    .join("-")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/&/g, "and")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");

const cars = [];
const seen = new Set();
readFileSync(src, "utf8")
  .split("\n")
  .forEach((raw, i) => {
    const line = raw.replace(/#.*$/, "").trim();
    if (!line) return;
    const f = line.split("|").map((x) => x.trim());
    if (f.length < 8) throw new Error(`${src}:${i + 1}: expected at least 8 fields, got ${f.length}`);
    const [model, genRaw, variant, start, end, engine, body, onRoad, built, aliases, hype, home] = f;
    const generation = genRaw || model;
    const car = { id: slug(make, model, generation === model ? undefined : generation, variant || undefined), model, generation };
    if (variant) car.variant = variant;
    car.years = [Number(start), end ? Number(end) : null];
    car.engine = engine;
    car.body = body;
    car.naOnRoad = Number(String(onRoad).replace(/[,_]/g, ""));
    if (built && /^\d[\d,_]*$/.test(built)) car.built = Number(built.replace(/[,_]/g, ""));
    if (aliases) car.aliases = aliases.split(";").map((a) => a.trim()).filter(Boolean);
    if (hype && /^y/i.test(hype)) car.hype = true;
    if (home) {
      const [market, count] = home.split(":").map((x) => x.trim());
      car.home = { market, onRoad: Number(String(count).replace(/[,_]/g, "")) };
      if (!Number.isFinite(car.home.onRoad)) throw new Error(`${src}:${i + 1}: home needs "<market>:<onRoad>"`);
    }
    for (const [k, v] of Object.entries({ start: car.years[0], naOnRoad: car.naOnRoad })) {
      if (!Number.isFinite(v)) throw new Error(`${src}:${i + 1}: ${k} is not a number`);
    }
    if (seen.has(car.id)) throw new Error(`${src}:${i + 1}: duplicate id ${car.id}`);
    seen.add(car.id);
    cars.push(car);
  });

const file = `data/catalog/${slug(make)}.json`;
const body = cars.map((c) => "    " + JSON.stringify(c)).join(",\n");
writeFileSync(file, `{\n  "make": ${JSON.stringify(make)},\n  "cars": [\n${body}\n  ]\n}\n`);
console.log(`${file}: ${cars.length} cars`);
