#!/usr/bin/env node
// CORE (lead-owned). Suggests a Wikimedia Commons category for each catalog
// entry without one, and writes confident matches into data/catalog.
//   node scripts/recognition/find-categories.mjs [--write]

import { readdirSync, readFileSync, writeFileSync } from "node:fs";
import { commons, generationTokens, likelyCategories } from "./commons.mjs";

const write = process.argv.includes("--write");
const VARIANT_WORDS = /\b(gt2|gt3|gt4|rs|turbo|type r|raptor|shelby|gt500|gt350|lightning|svo|cobra|boss|dark horse|st|sho|scuderia|speciale|competizione|tdf|challenge stradale|cr|dakar|sport classic|coup[eé]|sport turismo)\b/i;

function score(title, make, car) {
  const t = title.toLowerCase().replace(/^category:/, "");
  const model = car.model.toLowerCase();
  if (!t.includes(make.toLowerCase()) && !t.includes(model)) return -1;
  if (!t.includes(model)) return -1;
  let s = 1;
  const tokens = car.generation === car.model ? [] : generationTokens(car.generation);
  if (tokens.some((g) => t.includes(g))) s += 3;
  else if (tokens.length) s -= 1;
  if (car.variant) s += t.includes(car.variant.toLowerCase()) ? 3 : -3;
  else if (VARIANT_WORDS.test(t.replace(model, ""))) s -= 2;
  if (/\b(interior|engine|wheels|badge|logo|details|by colour|by year|in )\b/.test(t)) s -= 3;
  if (t.includes(String(car.years[0]))) s += 1;
  if (car.generation === car.model && t === `${make} ${car.model}${car.variant ? " " + car.variant : ""}`.toLowerCase()) s += 3;
  return s;
}

const files = readdirSync("data/catalog").filter((f) => f.endsWith(".json"));
let found = 0;
const unsure = [];
for (const f of files) {
  const path = `data/catalog/${f}`;
  const data = JSON.parse(readFileSync(path, "utf8"));
  for (const car of data.cars) {
    if (car.commons) continue;
    // 1. Predictable names, checked in one request.
    let best = null;
    const guesses = likelyCategories(data.make, car).map((t) => `Category:${t}`);
    const info = await commons({ action: "query", prop: "categoryinfo", titles: guesses.join("|") });
    for (const title of guesses) {
      const page = info.query.pages.find((p) => p.title === title);
      const ci = page?.categoryinfo;
      if (!page || page.missing || !ci) continue;
      if (ci.files + ci.subcats * 5 >= 8) {
        best = { title, s: 5, n: ci.files };
        break;
      }
    }
    // 2. Fall back to search.
    let ranked = [];
    if (!best) {
      const queries = [
        [data.make, car.model, car.variant, ...(car.generation === car.model ? [] : generationTokens(car.generation).slice(0, 1))].filter(Boolean).join(" "),
      ];
      const titles = new Set();
      for (const q of queries) {
        const j = await commons({ action: "query", list: "search", srnamespace: "14", srsearch: q, srlimit: "10" });
        j.query.search.forEach((r) => titles.add(r.title));
      }
      ranked = [...titles].map((t) => [t, score(t, data.make, car)]).filter(([, s]) => s > 0).sort((a, b) => b[1] - a[1]);
      for (const [title, s] of ranked.slice(0, 3)) {
        const ci = (await commons({ action: "query", prop: "categoryinfo", titles: title })).query.pages[0].categoryinfo;
        if (ci && ci.files + ci.subcats * 5 >= 8) {
          best = { title, s, n: ci.files };
          break;
        }
      }
    }
    if (best && best.s >= 3) {
      car.commons = best.title.replace(/^Category:/, "");
      found++;
      console.log(`ok     ${car.id.padEnd(40)} ${car.commons} (${best.n} files)`);
    } else {
      unsure.push(car.id);
      console.log(`UNSURE ${car.id.padEnd(40)} ${ranked.slice(0, 3).map(([t, s]) => `${t.replace("Category:", "")} [${s}]`).join(" | ")}`);
    }
  }
  if (write) {
    const body = data.cars.map((c) => "    " + JSON.stringify(c)).join(",\n");
    writeFileSync(path, `{\n  "make": ${JSON.stringify(data.make)},\n  "cars": [\n${body}\n  ]\n}\n`);
  }
}
console.log(`\n${found} matched, ${unsure.length} unsure`);
