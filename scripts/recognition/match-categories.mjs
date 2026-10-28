#!/usr/bin/env node
// CORE (lead-owned). Finds the precise Commons category for each catalog
// entry by walking its model's category tree.
//   node scripts/recognition/match-categories.mjs [--write]
// Prints ok / UNSURE per entry; --write saves confident matches as `commons`.

import { readdirSync, readFileSync, writeFileSync } from "node:fs";
import { commons, generationTokens } from "./commons.mjs";
import { crawl } from "./tree.mjs";

const write = process.argv.includes("--write");
const lower = (s) => s.toLowerCase().replace(/^category:/, "");

function tokensFor(car) {
  const t = car.generation === car.model ? [] : generationTokens(car.generation).map((x) => x.toLowerCase());
  for (const y of [car.years[0] - 1, car.years[0], car.years[0] + 1]) t.push(`(${y})`, ` ${y} `);
  return t;
}

function score(title, make, car, otherVariants) {
  const t = ` ${lower(title)} `;
  if (!t.includes(car.model.toLowerCase()) && !t.includes(` ${car.generation.toLowerCase()}`)) return -1;
  let s = 0;
  const gen = tokensFor(car);
  const single = car.generation === car.model;
  if (gen.some((g) => t.includes(g))) s += 4;
  else if (!single) return -1; // multi-generation model: must name the generation
  if (car.variant) {
    if (!t.includes(car.variant.toLowerCase())) return -1;
    s += 3;
  } else if (otherVariants.some((v) => t.includes(` ${v.toLowerCase()}`))) return -1;
  if (/\b(by |cabriolet|convertible|coupe|sedan|hatchback|wagon|targa|speedster|cab |crew cab|regular cab)\b/.test(t)) s -= 1;
  return s - t.length / 200; // prefer the most general match
}

const groups = new Map();
const files = readdirSync("data/catalog").filter((f) => f.endsWith(".json") && !f.startsWith("_"));
const data = files.map((f) => ({ path: `data/catalog/${f}`, d: JSON.parse(readFileSync(`data/catalog/${f}`, "utf8")) }));
for (const { d } of data) for (const c of d.cars) {
  const key = `${d.make} ${c.model}`;
  if (!groups.has(key)) groups.set(key, []);
  groups.get(key).push(c);
}

let ok = 0;
const unsure = [];
for (const [key, cars] of groups) {
  const root = `Category:${key}`;
  const exists = (await commons({ action: "query", prop: "categoryinfo", titles: root })).query.pages[0];
  const tree = exists.missing ? {} : await crawl(root, 3);
  const titles = [root, ...new Set(Object.values(tree).flat())];
  const variants = [...new Set(cars.map((c) => c.variant).filter(Boolean))];
  for (const car of cars) {
    if (car.commons) continue;
    const ranked = titles
      .map((t) => [t, score(t, key.split(" ")[0], car, variants.filter((v) => v !== car.variant))])
      .filter(([, s]) => s > 0)
      .sort((a, b) => b[1] - a[1]);
    const best = ranked[0];
    if (best && best[1] >= 3) {
      car.commons = best[0].replace(/^Category:/, "");
      ok++;
      console.log(`ok     ${car.id.padEnd(42)} ${car.commons}`);
    } else {
      unsure.push(car.id);
      console.log(`UNSURE ${car.id.padEnd(42)} ${ranked.slice(0, 2).map(([t]) => t.replace("Category:", "")).join(" | ") || "(no candidates)"}`);
    }
  }
}
if (write) {
  for (const { path, d } of data) {
    const body = d.cars.map((c) => "    " + JSON.stringify(c)).join(",\n");
    writeFileSync(path, `{\n  "make": ${JSON.stringify(d.make)},\n  "cars": [\n${body}\n  ]\n}\n`);
  }
}
console.log(`\n${ok} matched, ${unsure.length} unsure`);
